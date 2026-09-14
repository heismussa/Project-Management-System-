<?php

namespace App\Models;

use App\Support\InitiationDocuments;
use App\Support\Roles;
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
        // Once execution has actually started, there's no more "whole plan"
        // submit/review cycle left to redo — a post-sign-off edit to one
        // activity's planning fields is settled entirely through that
        // activity's own plan_change_status (see approvePlanChange), not by
        // dragging the whole project back into "Planning" / "Plan Returned".
        // Without this, editing a single approved activity after execution
        // sign-off silently relabelled the whole project as returned-to-planning.
        if ($this->execution_started_at) {
            return;
        }

        if ($this->currentPlanStatus() === 'approved') {
            $this->applyPlanStatus('changes_requested', [
                'phase' => 'Planning',
                'status' => 'Plan Returned',
            ]);
        }
    }

    /**
     * Person 3 contract consumed by Person 1 dashboard. Query-building logic
     * for the dashboards themselves lives in ProjectDashboardMetrics; this
     * scope stays on the model since Eloquent resolves scopeX() methods
     * directly off the model class.
     */
    public function scopeAssignedToPlanner($query, ?int $plannerId = null)
    {
        $query->whereNotNull('planner_id')->whereNull('closed_at');

        if ($plannerId) {
            $query->where('planner_id', $plannerId);
        }

        return $query;
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
}
