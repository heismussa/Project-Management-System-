<?php

namespace App\Services;

use App\Models\Document;
use App\Models\Project;
use App\Models\Review;
use App\Models\Role;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class ProjectWorkflowService
{
    public const REQUIRED_DOCUMENT_TYPES = [
        'Implementation Plan',
    ];

    /**
     * The Implementation Plan and SRS documents don't get their own manual
     * review step — approving the plan (activities) or the RTM is the
     * reviewer's sign-off on those documents too, so mark them approved
     * automatically instead of asking for a second, redundant click.
     */
    public static function autoApproveDocumentType(int $projectId, string $documentType, int $reviewerId): void
    {
        $documents = Document::where('project_id', $projectId)
            ->whereNull('activity_id')
            ->where('is_current', true)
            ->where('review_status', '!=', 'approved')
            ->get()
            ->filter(fn (Document $document) => strcasecmp((string) $document->document_type, $documentType) === 0);

        foreach ($documents as $document) {
            $document->update([
                'review_status' => 'approved',
                'review_comment' => null,
                'reviewed_by' => $reviewerId,
                'reviewed_at' => now(),
            ]);

            Review::create([
                'project_id' => $projectId,
                'entity_type' => 'document',
                'entity_id' => $document->id,
                'reviewer_id' => $reviewerId,
                'decision' => 'approved',
                'comment' => "Auto-approved with {$documentType}'s parent review.",
                'reviewed_at' => now(),
            ]);
        }
    }

    /**
     * SDMM / IDMM → Coordinator recommendation. DICT → Approver execution sign-off.
     */
    public static function reviewTrack(Project $project): string
    {
        $raw = strtoupper(trim((string) ($project->review_track ?: $project->category)));

        if (str_contains($raw, 'DICT')) {
            return 'DICT';
        }
        if (str_contains($raw, 'IDMM')) {
            return 'IDMM';
        }

        return 'SDMM';
    }

    public static function destinationForProject(Project $project): array
    {
        if (self::reviewTrack($project) === 'DICT') {
            return [
                'role_name' => 'Project Approver',
                'key' => 'approver',
                'track' => 'DICT',
            ];
        }

        return [
            'role_name' => 'Project Coordinator',
            'key' => 'coordinator',
            'track' => self::reviewTrack($project),
        ];
    }

    /**
     * @deprecated Use destinationForProject(). Kept so category-only callers still resolve.
     */
    public static function destinationForCategory(?string $category): array
    {
        $project = new Project(['category' => $category, 'review_track' => $category]);

        return self::destinationForProject($project);
    }

    public static function executionBlockers(Project $project): array
    {
        $project->loadMissing(['implementationActivities.documents', 'documents', 'requirements']);

        $blockers = [];

        if ($project->plan_review_status !== 'approved') {
            $blockers[] = 'Implementation plan has not been reviewed and approved.';
        }

        $currentDocs = $project->documents->where('is_current', true);

        foreach (self::REQUIRED_DOCUMENT_TYPES as $type) {
            $hasType = $currentDocs->contains(function ($document) use ($type) {
                return strcasecmp((string) $document->document_type, $type) === 0;
            });
            if (! $hasType) {
                $blockers[] = "Required document missing: {$type}.";
            }
        }

        $returned = $currentDocs->where('review_status', 'returned');
        if ($returned->isNotEmpty()) {
            $blockers[] = 'Returned documents still have unresolved reviewer comments.';
        }

        $activitiesWithoutDocs = $project->implementationActivities->filter(function ($activity) {
            return $activity->documents->where('is_current', true)->isEmpty();
        });
        if ($activitiesWithoutDocs->isNotEmpty()) {
            $names = $activitiesWithoutDocs->pluck('name')->take(5)->implode(', ');
            $blockers[] = "Activities missing documents: {$names}.";
        }

        return $blockers;
    }

    public static function assertCanEnterExecution(Project $project): void
    {
        $blockers = self::executionBlockers($project);
        if ($blockers !== []) {
            throw ValidationException::withMessages([
                'execution' => $blockers,
            ]);
        }
    }

    public static function resolveForwardUser(Project $project, string $key, string $roleName): ?User
    {
        if ($key === 'approver' && $project->approver_id) {
            return User::find($project->approver_id);
        }
        if ($key === 'coordinator' && $project->coordinator_id) {
            return User::find($project->coordinator_id);
        }

        $role = Role::where('name', $roleName)->first();
        if (! $role) {
            return null;
        }

        return User::whereHas('roles', fn ($query) => $query->where('roles.id', $role->id))->first();
    }

    public static function recommendAndMoveToExecution(Project $project): Project
    {
        if (self::reviewTrack($project) === 'DICT') {
            throw ValidationException::withMessages([
                'recommend' => ['DICT projects require Approver execution sign-off, not Coordinator recommendation.'],
            ]);
        }

        if ($project->plan_review_status !== 'approved') {
            throw ValidationException::withMessages([
                'recommend' => ['The implementation plan must be approved before a Coordinator can recommend execution.'],
            ]);
        }

        self::assertCanEnterExecution($project);

        return self::moveToExecution($project, 'coordinator');
    }

    public static function approveExecution(Project $project): Project
    {
        if ($project->plan_review_status !== 'approved') {
            throw ValidationException::withMessages([
                'execution' => ['The implementation plan must be approved before execution sign-off.'],
            ]);
        }

        if (self::reviewTrack($project) !== 'DICT' && ! $project->recommended_at) {
            throw ValidationException::withMessages([
                'execution' => ['SDMM/IDMM projects must be recommended by a Coordinator before Approver sign-off.'],
            ]);
        }

        self::assertCanEnterExecution($project);

        $updated = self::moveToExecution($project, 'approver');
        $updated->update(['execution_approved_at' => now()]);

        return $updated->fresh([
            'reviewer',
            'planner',
            'coordinator',
            'approver',
            'forwardedTo',
        ]);
    }

    public static function moveToExecution(Project $project, string $actorKey): Project
    {
        $destination = self::destinationForProject($project);
        $forwardUser = self::resolveForwardUser($project, $destination['key'], $destination['role_name']);

        $updates = [
            'execution_started_at' => now(),
            'phase' => 'Execution',
            'status' => 'In Execution',
            'forwarded_role' => $destination['role_name'],
            'forwarded_to_user_id' => $forwardUser?->id,
        ];

        if ($actorKey === 'coordinator') {
            $updates['recommended_at'] = now();
        }

        if ($destination['key'] === 'approver' && $forwardUser) {
            $updates['approver_id'] = $forwardUser->id;
        }
        if ($destination['key'] === 'coordinator' && $forwardUser) {
            $updates['coordinator_id'] = $forwardUser->id;
        }

        $project->update($updates);

        return $project->fresh([
            'reviewer',
            'planner',
            'coordinator',
            'approver',
            'forwardedTo',
        ]);
    }

    public static function planningLocked(Project $project): bool
    {
        return in_array($project->currentPlanStatus(), ['pending_review'], true);
    }

    public static function workflowPayload(Project $project): array
    {
        $blockers = self::executionBlockers($project);
        $destination = self::destinationForProject($project);
        $track = self::reviewTrack($project);
        $inExecution = (bool) $project->execution_started_at;
        $closed = (bool) $project->closed_at;

        return [
            'plan_review_status' => $project->plan_review_status,
            'plan_review_comment' => $project->plan_review_comment,
            'plan_pending_reapproval' => (bool) $project->plan_pending_reapproval,
            'phase' => $project->phase,
            'status' => $project->status,
            'category' => $project->category,
            'review_track' => $track,
            'queue' => self::queueName($project, $track, $inExecution, $closed),
            'forward_target' => $destination,
            'forwarded_role' => $project->forwarded_role,
            'forwarded_to_user_id' => $project->forwarded_to_user_id,
            'recommended_at' => $project->recommended_at,
            'execution_started_at' => $project->execution_started_at,
            'execution_approved_at' => $project->execution_approved_at,
            'closed_at' => $project->closed_at,
            'closure_requested_at' => $project->closure_requested_at,
            'closure_request_comment' => $project->closure_request_comment,
            'closure_return_comment' => $project->closure_return_comment,
            'can_request_closure' => $project->isReadyToClose() && ! $project->closure_requested_at && ! $closed,
            'can_approve_closure' => $project->isReadyToClose() && (bool) $project->closure_requested_at && ! $closed,
            'matrix_return_comment' => $project->matrix_return_comment,
            'matrix_returned_at' => $project->matrix_returned_at,
            'can_submit_plan' => $project->canSubmitPlan()
                && $project->implementationActivities()->count() > 0
                && ! $closed,
            'can_review_plan' => $project->plan_review_status === 'pending_review' && ! $closed,
            'can_recommend' => $project->plan_review_status === 'approved' && $track !== 'DICT' && ! $inExecution && ! $closed,
            'can_sign_off_execution' => $project->plan_review_status === 'approved' && ! $inExecution && ! $closed
                && ($track === 'DICT' || (bool) $project->recommended_at),
            'can_enter_execution' => $blockers === [],
            'execution_blockers' => $blockers,
            'required_document_types' => self::REQUIRED_DOCUMENT_TYPES,
            'closure' => [
                'ready' => $project->isReadyToClose(),
                'checks' => $project->closureChecks(),
            ],
        ];
    }

    /**
     * Lightweight summary for project list endpoints — avoids closure/execution
     * gate scans that were making GET /projects slow for every row.
     */
    public static function workflowListPayload(Project $project): array
    {
        $track = self::reviewTrack($project);
        $inExecution = (bool) $project->execution_started_at;
        $closed = (bool) $project->closed_at;

        return [
            'plan_review_status' => $project->plan_review_status,
            'phase' => $project->phase,
            'status' => $project->status,
            'review_track' => $track,
            'queue' => self::queueName($project, $track, $inExecution, $closed),
            'closure_requested_at' => $project->closure_requested_at,
            'closure_return_comment' => $project->closure_return_comment,
            'closed_at' => $project->closed_at,
        ];
    }

    private static function queueName(Project $project, string $track, bool $inExecution, bool $closed): string
    {
        if ($closed) {
            return 'closed';
        }
        if ($project->closure_requested_at) {
            return 'closure_sign_off';
        }
        if ($inExecution) {
            return 'in_execution';
        }
        if ($project->plan_review_status === 'pending_review') {
            return 'plan_review';
        }
        if ($project->plan_review_status === 'approved' && $track === 'DICT') {
            return 'execution_sign_off';
        }
        if ($project->plan_review_status === 'approved' && ! $project->recommended_at) {
            return 'recommendation';
        }
        if ($project->plan_review_status === 'approved') {
            return 'execution_sign_off';
        }

        return 'planning';
    }
}
