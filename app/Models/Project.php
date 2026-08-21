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
        'recommended_at' => 'datetime',
        'execution_started_at' => 'datetime',
        'execution_approved_at' => 'datetime',
        'matrix_returned_at' => 'datetime',
        'closed_at' => 'datetime',
        'budget' => 'float',
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
    public static function getPlannerMetrics(): array
    {
        return [
            'assigned_projects' => static::query()->whereNotNull('planner_id')->whereNull('closed_at')->count(),
            'active_activities' => ImplementationActivity::query()->count(),
            'pending_matrix_items' => Requirement::query()
                ->where(function ($query) {
                    $query->whereIn('implementation_status', ['Pending', 'Ongoing'])
                        ->orWhereNull('implementation_status');
                })
                ->count(),
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
        $activities = $this->implementationActivities;
        if ($activities->isEmpty()) {
            return false;
        }

        return $activities->every(function (ImplementationActivity $activity) {
            if ($activity->actual_end_date) {
                return true;
            }

            return in_array(strtolower((string) $activity->status), ['completed'], true);
        });
    }

    /**
     * Person 3 contract — every matrix item has UAT Pass/Fail and none are open.
     */
    public function hasPassedAllUAT(): bool
    {
        $requirements = $this->requirements;
        if ($requirements->isEmpty()) {
            return false;
        }

        return $requirements->every(function (Requirement $requirement) {
            $status = $requirement->implementation_status ?: 'Pending';
            $result = $requirement->test_result;

            return $status === 'Completed' && in_array($result, ['Pass', 'Fail'], true);
        });
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
