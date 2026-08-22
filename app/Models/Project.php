<?php

namespace App\Models;

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

        if ($user->hasRole(\App\Support\Roles::ADMINISTRATOR_ROLE)) {
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
        $documents = $this->documents->where('is_current', true);
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
}
