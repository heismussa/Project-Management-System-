<?php

namespace App\Http\Controllers;

use App\Models\ImplementationActivity;
use App\Models\ProgressUpdate;
use App\Services\ProjectWorkflowService;
use App\Support\ProgressDateRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ImplementationActivityController extends Controller
{
    private const PLANNING_FIELDS = [
        'name',
        'phase',
        'expected_deliverable',
        'planned_start_date',
        'planned_end_date',
        'responsible_person_id',
    ];

    public function index($projectId, Request $request): JsonResponse
    {
        $query = ImplementationActivity::where('project_id', $projectId)
            ->orderBy('planned_start_date')
            ->orderBy('id');

        // Report / export callers only need names, dates, and responsible person.
        if ($request->boolean('lite')) {
            $activities = $query
                ->with(['responsiblePerson:id,name'])
                ->get([
                    'id',
                    'project_id',
                    'name',
                    'expected_deliverable',
                    'planned_start_date',
                    'planned_end_date',
                    'actual_start_date',
                    'actual_end_date',
                    'responsible_person_id',
                    'status',
                ]);
        } else {
            $activities = $query
                ->with(['responsiblePerson:id,name,email', 'responsiblePerson.activeRoles', 'documents'])
                ->get();
        }

        return response()->json(['data' => $activities]);
    }

    public function store(Request $request): JsonResponse
    {
        // Read early (unvalidated) just to bound the planned dates below —
        // the 'exists:projects,id' rule still catches a genuinely bad id.
        $earlyProject = \App\Models\Project::find($request->input('project_id'));
        // Checked here, before validation, so a closed project always
        // reports "this project is closed" rather than an incidental date
        // error that happens to fire first.
        if ($earlyProject) {
            ProjectWorkflowService::assertProjectOpen($earlyProject);
        }

        $plannedStartRule = ['required', 'date'];
        $plannedEndRule = ['required', 'date', 'after_or_equal:planned_start_date'];
        if ($earlyProject?->planned_start_date) {
            $plannedStartRule[] = 'after_or_equal:'.$earlyProject->planned_start_date->toDateString();
            $plannedEndRule[] = 'after_or_equal:'.$earlyProject->planned_start_date->toDateString();
        }
        if ($earlyProject?->planned_end_date) {
            $plannedStartRule[] = 'before_or_equal:'.$earlyProject->planned_end_date->toDateString();
            $plannedEndRule[] = 'before_or_equal:'.$earlyProject->planned_end_date->toDateString();
        }

        $validated = $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
            'name' => ['required', 'string', 'max:255'],
            'phase' => ['nullable', 'string', 'max:100'],
            'expected_deliverable' => ['required', 'string'],
            'planned_start_date' => $plannedStartRule,
            'planned_end_date' => $plannedEndRule,
            'responsible_person_id' => ['required', 'exists:users,id'],
        ]);

        // Already fetched above to bound the date rules, and validation just
        // confirmed this id exists — reuse it instead of querying it twice.
        $project = $earlyProject ?? \App\Models\Project::findOrFail($validated['project_id']);
        if (! $project->canBeManagedBy($request->user())) {
            return response()->json(['message' => 'You can only manage activities on projects assigned to you.'], 403);
        }
        ProjectWorkflowService::assertProjectOpen($project);
        if ($project->isPlanLocked()) {
            return response()->json(['message' => 'Plan activities cannot be added while the plan is pending review.'], 403);
        }

        $validated['status'] = 'not_started';
        // During draft / changes_requested the whole plan is reviewed on submit.
        // Per-activity pending review only applies to edits made while the plan
        // is still approved (before reopenPlanIfApproved moves it back).
        if ($project->currentPlanStatus() === 'approved') {
            $validated['plan_change_status'] = 'pending';
            $validated['pending_changes'] = array_intersect_key($validated, array_flip(self::PLANNING_FIELDS));
        } else {
            $validated['plan_change_status'] = null;
            $validated['pending_changes'] = null;
        }

        $activity = ImplementationActivity::create($validated)->load('responsiblePerson:id,name,email');
        $project->reopenPlanIfApproved();
        $project->markEditedAfterReturn();

        return response()->json([
            'message' => 'Activity created',
            'data' => $activity,
        ], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $activity = ImplementationActivity::with('project')->findOrFail($id);
        $project = $activity->project;

        if (! $project->canBeManagedBy($request->user())) {
            return response()->json(['message' => 'You can only manage activities on projects assigned to you.'], 403);
        }
        ProjectWorkflowService::assertProjectOpen($project);

        $existingStart = optional($activity->actual_start_date)->toDateString();
        $dateRules = ProgressDateRules::actual(
            optional($activity->planned_start_date)->toDateString(),
            $request->filled('actual_start_date') ? $request->input('actual_start_date') : $existingStart,
            optional($project->planned_end_date)->toDateString()
        );
        $dateRules['actual_start_date'] = array_merge(['sometimes'], $dateRules['actual_start_date']);
        $dateRules['actual_end_date'] = array_merge(['sometimes'], $dateRules['actual_end_date']);

        // An activity's own planned dates must stay inside the project's
        // planned window too — when the project registered one.
        $plannedStartRule = ['sometimes', 'required', 'date'];
        $plannedEndRule = ['sometimes', 'required', 'date', 'after_or_equal:planned_start_date'];
        if ($project->planned_start_date) {
            $plannedStartRule[] = 'after_or_equal:'.$project->planned_start_date->toDateString();
            $plannedEndRule[] = 'after_or_equal:'.$project->planned_start_date->toDateString();
        }
        if ($project->planned_end_date) {
            $plannedStartRule[] = 'before_or_equal:'.$project->planned_end_date->toDateString();
            $plannedEndRule[] = 'before_or_equal:'.$project->planned_end_date->toDateString();
        }

        $validated = $request->validate(array_merge([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'phase' => ['sometimes', 'nullable', 'string', 'max:100'],
            'expected_deliverable' => ['sometimes', 'required', 'string'],
            'planned_start_date' => $plannedStartRule,
            'planned_end_date' => $plannedEndRule,
            'responsible_person_id' => ['sometimes', 'required', 'exists:users,id'],
            'status' => ['sometimes', 'nullable', 'string', 'max:50'],
            'remark' => ['sometimes', 'nullable', 'string'],
        ], $dateRules));

        $planning = array_intersect_key($validated, array_flip(self::PLANNING_FIELDS));
        $progress = array_intersect_key($validated, array_flip(['actual_start_date', 'actual_end_date', 'status']));
        $remark = $validated['remark'] ?? null;
        unset($validated['remark']);

        if ($planning !== [] && $project->isPlanLocked()) {
            return response()->json(['message' => 'Plan fields cannot be edited while the plan is pending review.'], 403);
        }

        if ($planning !== []) {
            // The edit form always resubmits every planning field, even when
            // the user only opened it to attach a document or just clicked
            // Save without changing anything — so only treat this as a real
            // plan change (and send it back through review) when a value
            // actually differs from what's already stored. Otherwise every
            // re-save of an already-approved activity was needlessly kicking
            // it back to "pending" and forcing a second review of nothing.
            $changed = false;
            foreach ($planning as $field => $value) {
                $current = $activity->{$field};
                if ($current instanceof \Illuminate\Support\Carbon) {
                    $current = $current->toDateString();
                }
                if ((string) $current !== (string) $value) {
                    $changed = true;
                    break;
                }
            }

            $activity->update($planning);

            if ($changed) {
                $wasApproved = $project->currentPlanStatus() === 'approved';
                if ($wasApproved) {
                    $activity->update([
                        'plan_change_status' => 'pending',
                        'pending_changes' => array_intersect_key($activity->fresh()->toArray(), array_flip(self::PLANNING_FIELDS)),
                        'plan_change_comment' => null,
                    ]);
                } else {
                    $activity->update([
                        'plan_change_status' => null,
                        'pending_changes' => null,
                        'plan_change_comment' => null,
                    ]);
                }
                $project->reopenPlanIfApproved();
                $project->markEditedAfterReturn();
            }
        }

        if ($progress !== []) {
            $activity->update($progress);
        }

        if ($remark) {
            ProgressUpdate::create([
                'entity_type' => 'activity',
                'entity_id' => $activity->id,
                'actual_start_date' => $progress['actual_start_date'] ?? $activity->actual_start_date,
                'actual_end_date' => $progress['actual_end_date'] ?? $activity->actual_end_date,
                'remark' => $remark,
                'status' => $progress['status'] ?? $activity->status,
                'updated_by' => $request->user()->id,
            ]);
        }

        $fresh = $activity->fresh()->load(['responsiblePerson:id,name,email', 'documents']);

        return response()->json([
            'message' => 'Activity updated',
            'data' => $fresh,
        ]);
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $activity = ImplementationActivity::with('project')->findOrFail($id);
        $project = $activity->project;

        if (! $project->canBeManagedBy($request->user())) {
            return response()->json(['message' => 'You can only manage activities on projects assigned to you.'], 403);
        }
        ProjectWorkflowService::assertProjectOpen($project);
        if ($project->isPlanLocked()) {
            return response()->json(['message' => 'Plan activities cannot be deleted while the plan is pending review.'], 403);
        }

        $activity->delete();
        $project->reopenPlanIfApproved();
        $project->markEditedAfterReturn();

        return response()->json(['message' => 'Activity deleted']);
    }

    public function progressHistory($id): JsonResponse
    {
        $activity = ImplementationActivity::findOrFail($id);
        $updates = ProgressUpdate::where('entity_type', 'activity')
            ->where('entity_id', $activity->id)
            ->with('updater:id,name')
            ->latest()
            ->get();

        return response()->json(['data' => $updates]);
    }

    public function approvePlanChange(Request $request, $id): JsonResponse
    {
        $activity = ImplementationActivity::with('project')->findOrFail($id);
        ProjectWorkflowService::assertProjectOpen($activity->project);
        if ($activity->plan_change_status !== 'pending') {
            throw ValidationException::withMessages([
                'plan_change_status' => ['This activity has no pending plan change to approve.'],
            ]);
        }
        $request->validate(['comment' => ['nullable', 'string']]);

        // Activities created before pending-review tracking existed have no
        // pending_changes snapshot — there's nothing to apply, just record
        // the sign-off. Newer activities always have one (even a no-op
        // snapshot of their own starting values), so this path still
        // applies whatever was actually pending.
        $changes = $activity->pending_changes
            ? collect($activity->pending_changes)->only(self::PLANNING_FIELDS)->all()
            : [];

        $activity->update(array_merge($changes, [
            'pending_changes' => null,
            'plan_change_status' => 'approved',
            'plan_change_comment' => null,
        ]));

        ProjectWorkflowService::autoApproveActivityDocuments($activity->id, $request->user()->id);

        // If the project is already executing, this activity's own real work
        // starts now, the moment it's approved — no separate manual click.
        // (For the initial, pre-execution batch, this happens instead when
        // the project itself first enters Execution.)
        if ($activity->project?->execution_started_at) {
            ProjectWorkflowService::autoStartApprovedActivities($activity->project);
        }

        if ($request->filled('comment')) {
            ProgressUpdate::create([
                'entity_type' => 'activity',
                'entity_id' => $activity->id,
                'remark' => $request->string('comment')->toString(),
                'status' => $activity->status,
                'updated_by' => $request->user()->id,
            ]);
        }

        return response()->json([
            'message' => 'Plan change approved and applied.',
            'data' => $activity->fresh()->load('responsiblePerson:id,name,email'),
        ]);
    }

    public function rejectPlanChange(Request $request, $id): JsonResponse
    {
        $activity = ImplementationActivity::with('project')->findOrFail($id);
        ProjectWorkflowService::assertProjectOpen($activity->project);
        if ($activity->plan_change_status !== 'pending') {
            throw ValidationException::withMessages([
                'plan_change_status' => ['This activity has no pending plan change to return.'],
            ]);
        }
        $validated = $request->validate(['comment' => ['required', 'string']]);

        // Kept as 'rejected' (not cleared to null) so the planner sees it was
        // reviewed and rejected, not just never submitted — the reason lives
        // on the activity itself, not just buried in the audit log.
        $activity->update([
            'pending_changes' => null,
            'plan_change_status' => 'rejected',
            'plan_change_comment' => $validated['comment'],
        ]);

        ProgressUpdate::create([
            'entity_type' => 'activity',
            'entity_id' => $activity->id,
            'remark' => 'Plan change rejected: '.$validated['comment'],
            'status' => $activity->status,
            'updated_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Plan change rejected. Original plan kept.',
            'data' => $activity->fresh()->load('responsiblePerson:id,name,email'),
        ]);
    }

    public function submitProgressReview($id): JsonResponse
    {
        $activity = ImplementationActivity::with('project')->findOrFail($id);
        ProjectWorkflowService::assertProjectOpen($activity->project);

        $activity->update([
            'progress_review_status' => 'pending',
            'progress_review_comment' => null,
            'progress_reviewed_at' => null,
        ]);

        return response()->json([
            'message' => 'Progress submitted for review',
            'data' => $activity->fresh()->load(['responsiblePerson:id,name,email', 'documents']),
        ]);
    }

    public function approveProgressReview(Request $request, $id): JsonResponse
    {
        $activity = ImplementationActivity::with('project')->findOrFail($id);
        ProjectWorkflowService::assertProjectOpen($activity->project);

        if ($activity->progress_review_status !== 'pending') {
            throw ValidationException::withMessages([
                'progress_review_status' => ['There is no progress update pending review.'],
            ]);
        }
        $request->validate(['comment' => ['nullable', 'string']]);

        $activity->update([
            'progress_review_status' => 'approved',
            'progress_review_comment' => null,
            'progress_reviewed_at' => now(),
        ]);

        if ($request->filled('comment')) {
            ProgressUpdate::create([
                'entity_type' => 'activity',
                'entity_id' => $activity->id,
                'remark' => $request->string('comment')->toString(),
                'status' => $activity->status,
                'updated_by' => $request->user()->id,
            ]);
        }

        return response()->json([
            'message' => 'Progress update approved',
            'data' => $activity->fresh()->load(['responsiblePerson:id,name,email', 'documents']),
        ]);
    }

    public function rejectProgressReview(Request $request, $id): JsonResponse
    {
        $activity = ImplementationActivity::with('project')->findOrFail($id);
        ProjectWorkflowService::assertProjectOpen($activity->project);
        $request->validate(['comment' => ['nullable', 'string']]);

        if ($activity->progress_review_status !== 'pending') {
            throw ValidationException::withMessages([
                'progress_review_status' => ['There is no progress update pending review.'],
            ]);
        }

        $activity->update([
            'progress_review_status' => 'rejected',
            'progress_review_comment' => $request->filled('comment') ? $request->string('comment')->toString() : null,
            'progress_reviewed_at' => now(),
        ]);

        return response()->json([
            'message' => 'Progress update rejected',
            'data' => $activity->fresh()->load(['responsiblePerson:id,name,email', 'documents']),
        ]);
    }
}
