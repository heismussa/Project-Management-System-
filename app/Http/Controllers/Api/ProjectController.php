<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterProjectRequest;
use App\Models\Project;
use App\Models\Review;
use App\Services\ProjectWorkflowService;
use App\Support\Roles;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ProjectController extends Controller
{
    public function store(RegisterProjectRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $validated['reviewer_id'] = $request->user()->id;
        $validated['status'] = 'Initiated';
        $validated['phase'] = 'Registration';
        $validated['lifecycle_stage'] = 'initiation';
        $validated['plan_review_status'] = 'draft';
        $validated['plan_status'] = 'draft';

        $project = Project::create($validated)->load(['reviewer', 'planner', 'coordinator', 'approver']);

        return response()->json([
            'message' => 'Project successfully registered in Process 1.',
            'data' => $project,
            'workflow' => ProjectWorkflowService::workflowPayload($project),
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $query = Project::with(['reviewer', 'planner', 'coordinator', 'approver', 'forwardedTo'])
            ->latest();

        $plannerId = $request->integer('planner_id') ?: null;
        $role = $request->query('role');

        // Project Planners only see projects assigned to them.
        if ($role === Roles::PLANNER_ROLE && $request->user()) {
            $query->where('planner_id', $request->user()->id);
        } elseif ($plannerId) {
            $query->where('planner_id', $plannerId);
        }

        $projects = $query
            ->get()
            ->map(function (Project $project) {
                $payload = $project->toArray();
                $payload['workflow'] = ProjectWorkflowService::workflowListPayload($project);

                return $payload;
            });

        return response()->json([
            'data' => $projects,
        ], 200);
    }

    public function show(Project $project): JsonResponse
    {
        $project->load([
            'reviewer:id,name,email',
            'planner:id,name,email',
            'coordinator:id,name,email',
            'approver:id,name,email',
            'forwardedTo:id,name,email',
            'implementationActivities',
            'documents',
            'requirements',
        ]);

        return response()->json([
            'data' => $project,
            'workflow' => ProjectWorkflowService::workflowPayload($project),
        ]);
    }

    public function initiationReadiness(Project $project): JsonResponse
    {
        return response()->json([
            'data' => $project->initiationReadiness(),
        ]);
    }

    public function advanceToPlanning(Request $request, Project $project): JsonResponse
    {
        if (! $this->allows($request, ['projects.register'])) {
            return response()->json(['message' => 'Unauthorized access.'], 403);
        }

        $this->guardOpen($project);

        $readiness = $project->initiationReadiness();
        if (! $readiness['ready']) {
            throw ValidationException::withMessages([
                'blockers' => $readiness['blockers'],
            ]);
        }

        $project->update([
            'lifecycle_stage' => 'planning',
            'phase' => 'Planning',
            'status' => 'Planning',
        ]);

        return response()->json([
            'message' => 'Project advanced to Planning.',
            'data' => $project->fresh(),
        ]);
    }

    public function reassign(Request $request, Project $project): JsonResponse
    {
        if (! $this->allows($request, ['projects.assign_planner', 'projects.reassign_planner'])) {
            return response()->json(['message' => 'Unauthorized access.'], 403);
        }

        $validated = $request->validate([
            'planner_id' => ['required', 'exists:users,id'],
        ]);

        $project->update(['planner_id' => $validated['planner_id']]);

        return response()->json([
            'message' => 'Project planner reassigned.',
            'data' => $project->fresh(['reviewer', 'planner', 'coordinator', 'approver']),
        ], 200);
    }

    public function workflow(Project $project): JsonResponse
    {
        return response()->json([
            'data' => ProjectWorkflowService::workflowPayload($project),
        ]);
    }

    public function submitPlan(Request $request, Project $project): JsonResponse
    {
        $this->guardOpen($project);

        if (! $project->canBeManagedBy($request->user())) {
            return response()->json(['message' => 'You can only submit a plan for a project assigned to you.'], 403);
        }

        if (! $project->canSubmitPlan()) {
            throw ValidationException::withMessages([
                'plan' => ['This plan is already in review or approved. Wait for a return before submitting again.'],
            ]);
        }

        if ($project->implementationActivities()->count() === 0) {
            throw ValidationException::withMessages([
                'plan' => ['Add at least one activity before submitting the plan for review.'],
            ]);
        }

        $project->applyPlanStatus('pending_review', [
            'phase' => 'Plan Review',
            'status' => 'Plan Submitted',
            'plan_review_comment' => null,
            'plan_return_comment' => null,
            'plan_pending_reapproval' => false,
            'plan_submitted_at' => now(),
        ]);

        Review::create([
            'project_id' => $project->id,
            'entity_type' => 'plan',
            'entity_id' => $project->id,
            'reviewer_id' => $request->user()->id,
            'decision' => 'submitted',
            'comment' => $request->input('comment'),
            'reviewed_at' => now(),
        ]);

        $fresh = $project->fresh();

        return response()->json([
            'message' => 'Implementation plan submitted for reviewer approval.',
            'data' => $fresh,
            'workflow' => ProjectWorkflowService::workflowPayload($fresh),
        ]);
    }

    public function reviewPlan(Request $request, Project $project): JsonResponse
    {
        if (! $this->allows($request, ['projects.review'])) {
            return response()->json(['message' => 'Unauthorized access.'], 403);
        }

        $this->guardOpen($project);

        $validated = $request->validate([
            'decision' => ['required', 'in:approved,returned'],
            'comment' => ['required_if:decision,returned', 'nullable', 'string'],
        ]);

        if ($project->currentPlanStatus() !== 'pending_review') {
            throw ValidationException::withMessages([
                'plan' => ['Only plans in pending review can be approved or returned.'],
            ]);
        }

        if ($validated['decision'] === 'approved') {
            $project->applyPlanStatus('approved', [
                'plan_review_comment' => $validated['comment'] ?? null,
                'plan_reviewed_at' => now(),
                'phase' => 'Plan Approved',
                'status' => 'Plan Approved',
            ]);
            $message = 'Implementation plan approved.';
        } else {
            $project->applyPlanStatus('changes_requested', [
                'plan_review_comment' => $validated['comment'],
                'plan_return_comment' => $validated['comment'],
                'plan_reviewed_at' => now(),
                'plan_pending_reapproval' => false,
                'phase' => 'Planning',
                'status' => 'Plan Returned',
            ]);
            $message = 'Implementation plan returned. Changes do not stick until re-approved.';
        }

        Review::create([
            'project_id' => $project->id,
            'entity_type' => 'plan',
            'entity_id' => $project->id,
            'reviewer_id' => $request->user()->id,
            'role_snapshot' => 'Project Reviewer',
            'decision' => $validated['decision'],
            'comment' => $validated['comment'] ?? null,
            'reviewed_at' => now(),
        ]);

        $fresh = $project->fresh();

        return response()->json([
            'message' => $message,
            'data' => $fresh,
            'workflow' => ProjectWorkflowService::workflowPayload($fresh),
        ]);
    }

    public function recommend(Request $request, Project $project): JsonResponse
    {
        if (! $this->allows($request, ['projects.recommend'])) {
            return response()->json(['message' => 'Unauthorized access.'], 403);
        }

        $this->guardOpen($project);

        $updated = ProjectWorkflowService::recommendAndMoveToExecution($project);

        Review::create([
            'project_id' => $updated->id,
            'entity_type' => 'recommendation',
            'entity_id' => $updated->id,
            'reviewer_id' => $request->user()->id,
            'role_snapshot' => 'Project Coordinator',
            'decision' => 'recommended',
            'comment' => $request->input('comment'),
            'reviewed_at' => now(),
        ]);

        $destination = $updated->forwarded_role ?? 'next role';

        return response()->json([
            'message' => "Project recommended (SDMM/IDMM) and moved to execution. Forwarded to {$destination}.",
            'data' => $updated,
            'workflow' => ProjectWorkflowService::workflowPayload($updated),
        ], 200);
    }

    public function approveExecution(Request $request, Project $project): JsonResponse
    {
        if (! $this->allows($request, ['projects.approve'])) {
            return response()->json(['message' => 'Unauthorized access.'], 403);
        }

        $this->guardOpen($project);

        $updated = ProjectWorkflowService::approveExecution($project);

        Review::create([
            'project_id' => $updated->id,
            'entity_type' => 'execution',
            'entity_id' => $updated->id,
            'reviewer_id' => $request->user()->id,
            'role_snapshot' => 'Project Approver',
            'decision' => 'approved',
            'comment' => $request->input('comment'),
            'reviewed_at' => now(),
        ]);

        return response()->json([
            'message' => 'DICT execution sign-off recorded. Project moved to execution.',
            'data' => $updated,
            'workflow' => ProjectWorkflowService::workflowPayload($updated),
        ]);
    }

    public function reviews(Project $project): JsonResponse
    {
        $reviews = $project->reviews()
            ->with('reviewer:id,name,email')
            ->latest('reviewed_at')
            ->get();

        return response()->json(['data' => $reviews]);
    }

    public function closureReadiness(Project $project): JsonResponse
    {
        $checks = $project->closureChecks();

        return response()->json([
            'data' => [
                'ready' => collect($checks)->every(fn (array $check) => $check['passed']),
                'checks' => $checks,
                'status' => $project->status,
                'closed_at' => $project->closed_at,
                'closure_requested_at' => $project->closure_requested_at,
                'closure_request_comment' => $project->closure_request_comment,
                'closure_return_comment' => $project->closure_return_comment,
                'helpers' => [
                    'hasCompletedAllActivities' => $project->hasCompletedAllActivities(),
                    'hasPassedAllUAT' => $project->hasPassedAllUAT(),
                    'hasAllClosureDocsReviewed' => $project->hasAllClosureDocsReviewed(),
                ],
            ],
        ]);
    }

    public function requestClosure(Request $request, Project $project): JsonResponse
    {
        $this->guardOpen($project);

        if (! $project->canBeManagedBy($request->user())) {
            return response()->json(['message' => 'You can only request closure for a project assigned to you.'], 403);
        }

        $request->validate([
            'comment' => ['nullable', 'string'],
        ]);

        if (! $project->isReadyToClose()) {
            $failed = collect($project->closureChecks())->where('passed', false)->pluck('label')->values()->all();
            throw ValidationException::withMessages([
                'close' => $failed,
            ]);
        }

        $project->update([
            'lifecycle_stage' => 'closure',
            'closure_requested_at' => now(),
            'closure_requested_by' => $request->user()->id,
            'closure_request_comment' => $request->input('comment'),
            'closure_return_comment' => null,
        ]);

        Review::create([
            'project_id' => $project->id,
            'entity_type' => 'closure',
            'entity_id' => $project->id,
            'reviewer_id' => $request->user()->id,
            'role_snapshot' => 'Project Planner',
            'decision' => 'requested',
            'comment' => $request->input('comment'),
            'reviewed_at' => now(),
        ]);

        $fresh = $project->fresh(['planner', 'reviewer']);

        return response()->json([
            'message' => 'Closure requested. The reviewer will verify documents and sign off.',
            'data' => $fresh,
            'workflow' => ProjectWorkflowService::workflowPayload($fresh),
        ]);
    }

    public function returnClosure(Request $request, Project $project): JsonResponse
    {
        if (! $this->allows($request, ['projects.close', 'projects.review'])) {
            return response()->json(['message' => 'Unauthorized access.'], 403);
        }

        $this->guardOpen($project);

        $validated = $request->validate([
            'comment' => ['required', 'string'],
        ]);

        $project->update([
            'closure_requested_at' => null,
            'closure_requested_by' => null,
            'closure_request_comment' => null,
            'closure_return_comment' => $validated['comment'],
        ]);

        Review::create([
            'project_id' => $project->id,
            'entity_type' => 'closure',
            'entity_id' => $project->id,
            'reviewer_id' => $request->user()->id,
            'role_snapshot' => 'Project Reviewer',
            'decision' => 'returned',
            'comment' => $validated['comment'],
            'reviewed_at' => now(),
        ]);

        $fresh = $project->fresh(['planner', 'reviewer']);

        return response()->json([
            'message' => 'Closure request returned to the planner.',
            'data' => $fresh,
            'workflow' => ProjectWorkflowService::workflowPayload($fresh),
        ]);
    }

    public function close(Request $request, Project $project): JsonResponse
    {
        if (! $this->allows($request, ['projects.close', 'projects.review'])) {
            return response()->json(['message' => 'Unauthorized access.'], 403);
        }

        $this->guardOpen($project);

        $request->validate([
            'comment' => ['nullable', 'string'],
        ]);

        $checks = $project->closureChecks();
        $failed = collect($checks)->where('passed', false)->pluck('label')->values()->all();
        if ($failed !== []) {
            throw ValidationException::withMessages([
                'close' => $failed,
            ]);
        }

        if (! $project->closure_requested_at) {
            throw ValidationException::withMessages([
                'close' => ['The planner must request closure before the reviewer can sign off.'],
            ]);
        }

        $project->update([
            'status' => 'Closed',
            'phase' => 'Closed',
            'lifecycle_stage' => 'closure',
            'closed_at' => now(),
            'closed_by' => $request->user()->id,
            'closure_comment' => $request->input('comment'),
        ]);

        Review::create([
            'project_id' => $project->id,
            'entity_type' => 'closure',
            'entity_id' => $project->id,
            'reviewer_id' => $request->user()->id,
            'role_snapshot' => 'Project Reviewer',
            'decision' => 'closed',
            'comment' => $request->input('comment'),
            'reviewed_at' => now(),
        ]);

        $fresh = $project->fresh(['closedBy', 'planner', 'reviewer']);

        return response()->json([
            'message' => 'Project closed.',
            'data' => $fresh,
            'workflow' => ProjectWorkflowService::workflowPayload($fresh),
        ]);
    }

    private function allows(Request $request, array $permissions): bool
    {
        $user = $request->user();
        if (! $user) {
            return false;
        }

        foreach ($permissions as $permission) {
            if ($user->hasPermission($permission)) {
                return true;
            }
        }

        return false;
    }

    private function guardOpen(Project $project): void
    {
        if ($project->closed_at) {
            throw ValidationException::withMessages([
                'project' => ['This project is closed.'],
            ]);
        }
    }
}
