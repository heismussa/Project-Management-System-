<?php

namespace App\Models;

use App\Support\InitiationDocuments;
use App\Support\Roles;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'annual_plan_reference',
        'category',
        'review_track',
        'project_type',
        'activity_name',
        'name',
        'description',
        'budget',
        'team_type',
        'initiation_document_id',
        'planner_id',
        'reviewer_id',
        'coordinator_id',
        'approver_id',
        'status',
        'phase',
        'lifecycle_stage',
        'plan_review_status',
        'plan_review_comment',
        'plan_reviewed_at',
        'plan_pending_reapproval',
        'plan_status',
        'plan_submitted_at',
        'plan_return_comment',
        'recommended_at',
        'execution_started_at',
        'execution_approved_at',
        'forwarded_role',
        'forwarded_to_user_id',
        'matrix_return_comment',
        'matrix_returned_at',
        'planned_start_date',
        'planned_end_date',
        'actual_start_date',
        'actual_end_date',
        'overall_implementation_score',
        'closed_at',
        'closed_by',
        'closure_comment',
        'closure_requested_at',
        'closure_requested_by',
        'closure_request_comment',
        'closure_return_comment',
    ];

    protected $casts = [
        'plan_reviewed_at' => 'datetime',
        'plan_pending_reapproval' => 'boolean',
        'plan_submitted_at' => 'datetime',
        'recommended_at' => 'datetime',
        'execution_started_at' => 'datetime',
        'execution_approved_at' => 'datetime',
        'matrix_returned_at' => 'datetime',
        'closed_at' => 'datetime',
        'closure_requested_at' => 'datetime',
        'budget' => 'float',
        'planned_start_date' => 'date',
        'planned_end_date' => 'date',
        'actual_start_date' => 'date',
        'actual_end_date' => 'date',
    ];

    public function requirements(): HasMany
    {
        return $this->hasMany(Requirement::class);
    }

    public function implementationActivities(): HasMany
    {
        return $this->hasMany(ImplementationActivity::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    public function planner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'planner_id');
    }

    public function coordinator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'coordinator_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approver_id');
    }

    public function forwardedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'forwarded_to_user_id');
    }

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    /**
     * Prefer planner-scope plan_status, then Person 3 plan_review_status.
     */
    public function currentPlanStatus(): string
    {
        $status = $this->plan_status ?: 'draft';
        $review = $this->plan_review_status ?: 'draft';

        return $status !== 'draft' ? $status : $review;
    }

    public function canSubmitPlan(): bool
    {
        return in_array($this->currentPlanStatus(), ['draft', 'changes_requested'], true);
    }

    public function isPlanLocked(): bool
    {
        return $this->currentPlanStatus() === 'pending_review';
    }

    public function canBeManagedBy(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        if ($user->hasRole(Roles::ADMINISTRATOR_ROLE)) {
            return true;
        }

        return (int) $this->planner_id === (int) $user->id;
    }

    public function applyPlanStatus(string $status, array $extra = []): void
    {
        $this->update(array_merge([
            'plan_status' => $status,
            'plan_review_status' => $status,
        ], $extra));
    }

    public function reopenPlanIfApproved(): void
    {
        if ($this->currentPlanStatus() === 'approved') {
            $this->applyPlanStatus('changes_requested', [
                'phase' => 'Planning',
                'status' => 'Plan Returned',
            ]);
        }
    }

    /**
     * Contract for Person 1 dashboard KPIs.
     */
    public static function getReviewerMetrics(): array
    {
        $open = static::query()->whereNull('closed_at');

        return [
            'new_registrations' => (clone $open)->where('phase', 'Registration')->count(),
            'plans_pending_review' => (clone $open)->where('plan_review_status', 'pending_review')->count(),
            'awaiting_recommendation' => (clone $open)
                ->where('plan_review_status', 'approved')
                ->whereNull('recommended_at')
                ->whereNull('execution_started_at')
                ->count(),
            'awaiting_execution_sign_off' => (clone $open)
                ->where('plan_review_status', 'approved')
                ->whereNull('execution_started_at')
                ->count(),
            'in_execution' => (clone $open)->where('phase', 'Execution')->count(),
            'closed' => static::query()->whereNotNull('closed_at')->count(),
        ];
    }

    /**
     * Person 3 contract consumed by Person 1 dashboard.
     */
    public function scopeAssignedToPlanner($query, ?int $plannerId = null)
    {
        $query->whereNotNull('planner_id')->whereNull('closed_at');

        if ($plannerId) {
            $query->where('planner_id', $plannerId);
        }

        return $query;
    }

    public static function getPlannerMetrics(?int $plannerId = null): array
    {
        $projects = static::query()->assignedToPlanner($plannerId);
        $projectIds = (clone $projects)->pluck('id');

        return [
            'assigned_projects' => (clone $projects)->count(),
            'active_activities' => ImplementationActivity::query()->whereIn('project_id', $projectIds)->count(),
            'pending_matrix_items' => Requirement::query()
                ->whereIn('project_id', $projectIds)
                ->incomplete()
                ->count(),
            'plans_returned' => (clone $projects)->where('plan_review_status', 'changes_requested')->count(),
            'overdue_activities' => ImplementationActivity::query()
                ->whereIn('project_id', $projectIds)
                ->whereNull('actual_end_date')
                ->whereDate('planned_end_date', '<', now())
                ->count(),
            'closure_requests_pending' => (clone $projects)->whereNotNull('closure_requested_at')->count(),
        ];
    }

    /**
     * Person 4 contract consumed by Person 1 dashboard.
     */
    public static function getImplementorMetrics(): array
    {
        return [
            'in_execution' => static::query()->where('phase', 'Execution')->whereNull('closed_at')->count(),
            'overdue_activities' => ImplementationActivity::query()
                ->whereNull('actual_start_date')
                ->whereDate('planned_start_date', '<', now())
                ->count(),
            'completion_docs' => Document::query()->whereNotNull('activity_id')->count(),
        ];
    }

    /**
     * Person 3 contract — Person 2 closure engine calls this.
     */
    public function hasCompletedAllActivities(): bool
    {
        if ($this->implementationActivities()->doesntExist()) {
            return false;
        }

        return $this->implementationActivities()
            ->whereNull('actual_end_date')
            ->where(function ($query) {
                $query->whereNull('status')
                    ->orWhereRaw('LOWER(status) <> ?', ['completed']);
            })
            ->doesntExist();
    }

    /**
     * Person 3 contract — every matrix item is Completed with Pass/Fail.
     */
    public function hasPassedAllUAT(): bool
    {
        if ($this->requirements()->doesntExist()) {
            return false;
        }

        if ($this->requirements()->incomplete()->exists()) {
            return false;
        }

        return $this->requirements()
            ->where(function ($query) {
                $query->whereNull('test_result')
                    ->orWhereNotIn('test_result', ['Pass', 'Fail']);
            })
            ->doesntExist();
    }

    public function markEditedAfterReturn(): void
    {
        if ($this->plan_review_status === 'changes_requested' && ! $this->plan_pending_reapproval) {
            $this->update(['plan_pending_reapproval' => true]);
        }
    }

    /**
     * Person 4 contract — current closure/initiation documents must be reviewed.
     */
    public function hasAllClosureDocsReviewed(): bool
    {
        // Initiation package is accepted at registration; closure gates apply to
        // planning/execution deliverables only.
        $documents = $this->documents
            ->where('is_current', true)
            ->filter(fn (Document $document) => strtolower((string) $document->phase) !== 'initiation');

        if ($documents->isEmpty()) {
            return false;
        }

        return $documents->every(function (Document $document) {
            return strtolower((string) $document->review_status) === 'approved';
        });
    }

    public function closureChecks(): array
    {
        $this->loadMissing(['implementationActivities', 'requirements', 'documents']);

        return [
            [
                'key' => 'plan_approved',
                'label' => 'Implementation plan is approved',
                'passed' => $this->plan_review_status === 'approved',
            ],
            [
                'key' => 'activities',
                'label' => 'All activities are completed',
                'passed' => $this->hasCompletedAllActivities(),
            ],
            [
                'key' => 'uat',
                'label' => 'All matrix items are completed with Pass/Fail',
                'passed' => $this->hasPassedAllUAT(),
            ],
            [
                'key' => 'documents',
                'label' => 'All current documents are reviewed and approved',
                'passed' => $this->hasAllClosureDocsReviewed(),
            ],
        ];
    }

    public function isReadyToClose(): bool
    {
        return collect($this->closureChecks())->every(fn (array $check) => $check['passed']);
    }

    /**
     * Initiation -> Planning gate. Checked both for the frontend checklist
     * and, authoritatively, by advance-to-planning before flipping
     * lifecycle_stage — a disabled button is not security.
     */
    public function initiationReadiness(): array
    {
        $current = $this->documents()
            ->where('is_current', true)
            ->whereIn('document_type', InitiationDocuments::keys())
            ->get()
            ->keyBy('document_type');

        $blockers = [];
        $documents = [];

        foreach (InitiationDocuments::TYPES as $key => $meta) {
            $document = $current->get($key);

            $documents[] = [
                'key' => $key,
                'label' => $meta['label'],
                'required' => $meta['required'],
                'uploaded' => (bool) $document,
                'document' => $document,
            ];

            if ($meta['required'] && ! $document) {
                $blockers[] = "Missing required document: {$meta['label']}.";
            }
        }

        return [
            'ready' => $blockers === [],
            'blockers' => $blockers,
            'documents' => $documents,
        ];
    }

    public function isReadyForPlanning(): bool
    {
        return $this->initiationReadiness()['ready'];
    }

    /**
     * The single gate currently holding this project back, in priority
     * order, for the Administrator dashboard's "transition blockers" table.
     * Null once closed or when nothing is blocking it.
     */
    public function transitionBlocker(): ?array
    {
        if ($this->closed_at) {
            return null;
        }

        if ($this->lifecycle_stage === 'initiation') {
            if (! $this->initiationReadiness()['ready']) {
                return ['reason' => 'Initiation documents missing', 'since' => $this->created_at];
            }

            return null;
        }

        if ($this->plan_review_status === 'pending_review') {
            return ['reason' => 'Plan not reviewed', 'since' => $this->plan_submitted_at ?? $this->updated_at];
        }

        $returnedDocument = $this->documents()
            ->where('is_current', true)
            ->where('review_status', 'returned')
            ->oldest('reviewed_at')
            ->first();
        if ($returnedDocument) {
            return [
                'reason' => 'Returned documents unresolved',
                'since' => $returnedDocument->reviewed_at ?? $returnedDocument->updated_at,
            ];
        }

        if ($this->execution_started_at && ! $this->hasPassedAllUAT()) {
            return ['reason' => 'UAT scores missing', 'since' => $this->execution_started_at];
        }

        return null;
    }

    /**
     * Aggregates for the Administrator dashboard at "/". Kept on the model,
     * alongside getReviewerMetrics()/getPlannerMetrics()/getImplementorMetrics(),
     * so it's queried the same way the rest of the dashboard contracts are.
     */
    public static function administratorDashboard(): array
    {
        $statusCounts = [
            'total' => static::count(),
            'ongoing' => static::whereNotNull('actual_start_date')->whereNull('actual_end_date')->count(),
            'completed' => static::whereNotNull('actual_end_date')->count(),
            'not_started' => static::whereNull('actual_start_date')->count(),
        ];

        $phaseCounts = collect(['initiation', 'planning', 'execution', 'closure'])
            ->mapWithKeys(fn (string $stage) => [$stage => static::where('lifecycle_stage', $stage)->count()])
            ->all();

        $averageScore = static::whereNotNull('overall_implementation_score')->avg('overall_implementation_score');
        $requirementTotal = Requirement::count();
        $passCount = Requirement::where('test_result', 'Pass')->count();

        $blockers = static::whereNull('closed_at')
            ->get()
            ->map(function (Project $project) {
                $blocker = $project->transitionBlocker();
                if (! $blocker) {
                    return null;
                }

                return [
                    'project_id' => $project->id,
                    'project_name' => $project->name,
                    'reason' => $blocker['reason'],
                    'days_stuck' => $blocker['since'] ? self::daysSince($blocker['since']) : 0,
                ];
            })
            ->filter()
            ->sortByDesc('days_stuck')
            ->values()
            ->all();

        $overdueDays = ImplementationActivity::query()
            ->whereNull('actual_start_date')
            ->whereNotNull('planned_start_date')
            ->whereDate('planned_start_date', '<', now()->toDateString())
            ->get(['planned_start_date'])
            ->map(fn (ImplementationActivity $activity) => self::daysSince($activity->planned_start_date));

        return [
            'status_counts' => $statusCounts,
            'phase_counts' => $phaseCounts,
            'implementation_score_average' => $averageScore !== null ? round((float) $averageScore, 1) : null,
            'uat_pass_rate' => $requirementTotal > 0 ? round(($passCount / $requirementTotal) * 100, 1) : 0.0,
            'total_budget' => (float) static::sum('budget'),
            'requirement_total' => $requirementTotal,
            'transition_blockers' => $blockers,
            'overdue_activities' => [
                'total' => $overdueDays->count(),
                '1_day' => $overdueDays->filter(fn ($days) => $days === 1)->count(),
                '3_days' => $overdueDays->filter(fn ($days) => $days === 3)->count(),
                'over_3_days' => $overdueDays->filter(fn ($days) => $days > 3)->count(),
            ],
            'awaiting_action' => [
                'new_registrations' => static::where('phase', 'Registration')->count(),
                'plans_pending_review' => static::where('plan_review_status', 'pending_review')->count(),
                'matrices_pending_approval' => Requirement::whereNull('review_decision')->distinct('project_id')->count('project_id'),
                'documents_pending_review' => Document::where('review_status', 'pending')->count(),
                'closure_signoffs' => static::whereNull('closed_at')->get()->filter(fn (Project $project) => $project->isReadyToClose())->count(),
            ],
        ];
    }

    /**
     * Aggregates for the Reviewer dashboard at "/". The six queue counts,
     * the monthly review-load line chart, and turnaround metrics — all
     * sourced from the reviews table, keyed on reviewed_at.
     */
    public static function reviewerDashboard(): array
    {
        $newRegistrations = static::where('lifecycle_stage', 'initiation')
            ->get()
            ->filter(fn (Project $project) => ! $project->initiationReadiness()['ready'])
            ->count();

        $plansPending = static::where('plan_status', 'pending_review')->count();

        $matricesPending = Requirement::whereNull('review_decision')->distinct('project_id')->count('project_id');

        $documentsPending = Document::where('review_status', 'pending')->count();

        // "no newer version submitted" — replacing a document flips the old
        // row's is_current off, so a still-current returned row means the
        // return has gone unaddressed.
        $returnedUnresolved = Document::where('review_status', 'returned')->where('is_current', true)->count();

        $closureSignoffs = static::whereNull('closed_at')
            ->get()
            ->filter(fn (Project $project) => $project->isReadyToClose())
            ->count();

        $reviews = Review::whereYear('reviewed_at', now()->year)->get(['project_id', 'entity_type', 'decision', 'reviewed_at']);

        $reviewLoad = collect(range(1, 12))->map(function (int $month) use ($reviews) {
            $inMonth = $reviews->filter(fn (Review $review) => $review->reviewed_at->month === $month);

            return [
                'month' => Carbon::create(2000, $month, 1)->format('M'),
                'received' => $inMonth->where('decision', 'submitted')->count(),
                'completed' => $inMonth->where('decision', '!=', 'submitted')->count(),
            ];
        })->values()->all();

        $completedReviews = Review::where('decision', '!=', 'submitted')->get(['project_id', 'entity_type', 'decision', 'reviewed_at']);
        $submittedByKey = Review::where('decision', 'submitted')
            ->get(['project_id', 'entity_type', 'reviewed_at'])
            ->groupBy(fn (Review $review) => $review->project_id.'-'.$review->entity_type);

        $turnaroundDays = $completedReviews
            ->map(function (Review $completed) use ($submittedByKey) {
                $key = $completed->project_id.'-'.$completed->entity_type;
                $submission = ($submittedByKey->get($key) ?? collect())
                    ->filter(fn (Review $submitted) => $submitted->reviewed_at <= $completed->reviewed_at)
                    ->sortByDesc('reviewed_at')
                    ->first();

                return $submission ? self::daysSince($submission->reviewed_at, $completed->reviewed_at) : null;
            })
            ->filter(fn ($days) => $days !== null);

        $reviewedThisMonth = Review::where('decision', '!=', 'submitted')
            ->whereYear('reviewed_at', now()->year)
            ->whereMonth('reviewed_at', now()->month)
            ->count();

        $totalDecisions = $completedReviews->count();
        $returnedDecisions = $completedReviews->whereIn('decision', ['rejected', 'needs_revision'])->count();

        return [
            'queue' => [
                'new_registrations' => $newRegistrations,
                'plans_pending' => $plansPending,
                'matrices_pending' => $matricesPending,
                'documents_pending' => $documentsPending,
                'returned_unresolved' => $returnedUnresolved,
                'closure_signoffs' => $closureSignoffs,
            ],
            'review_load' => $reviewLoad,
            'turnaround' => [
                'avg_review_days' => $turnaroundDays->isNotEmpty() ? round($turnaroundDays->avg(), 1) : 0,
                'reviewed_this_month' => $reviewedThisMonth,
                'backlog' => $newRegistrations + $plansPending + $matricesPending + $documentsPending + $returnedUnresolved + $closureSignoffs,
                'return_rate' => $totalDecisions > 0 ? round(($returnedDecisions / $totalDecisions) * 100, 1) : 0,
            ],
        ];
    }

    /**
     * Aggregates for the read-only ViewOnly dashboard at "/". Reuses
     * administratorDashboard() for the portfolio-wide numbers it needs
     * (status/phase counts, score, budget) and adds the requirement status
     * breakdown and flat project list unique to this view.
     */
    public static function viewOnlyDashboard(): array
    {
        $admin = static::administratorDashboard();

        $pendingRequirements = Requirement::where(function ($query) {
            $query->where('implementation_status', 'Pending')->orWhereNull('implementation_status');
        })->count();
        $ongoingRequirements = Requirement::where('implementation_status', 'Ongoing')->count();
        $completedRequirements = Requirement::where('implementation_status', 'Completed')->count();

        $projects = static::orderBy('name')
            ->get(['id', 'name', 'category', 'phase', 'overall_implementation_score'])
            ->map(fn (Project $project) => [
                'id' => $project->id,
                'name' => $project->name,
                'category' => $project->category,
                'phase' => $project->phase,
                'overall_implementation_score' => $project->overall_implementation_score,
            ])
            ->values()
            ->all();

        return [
            'status_counts' => $admin['status_counts'],
            'phase_counts' => $admin['phase_counts'],
            'implementation_score_average' => $admin['implementation_score_average'],
            'uat_pass_rate' => $admin['uat_pass_rate'],
            'total_budget' => $admin['total_budget'],
            'requirement_status_counts' => [
                'pending' => $pendingRequirements,
                'ongoing' => $ongoingRequirements,
                'completed' => $completedRequirements,
            ],
            'projects' => $projects,
        ];
    }

    /**
     * Whole days between $since and $until (defaults to now), always
     * non-negative. Carbon 3 flipped diffInDays() to return a signed value
     * by default, which for a past $since gives a negative number —
     * computed via raw timestamps here so the result doesn't depend on
     * that default.
     */
    private static function daysSince($since, $until = null): int
    {
        $untilTimestamp = $until?->timestamp ?? now()->timestamp;

        return max(0, (int) floor(($untilTimestamp - $since->timestamp) / 86400));
    }
}
