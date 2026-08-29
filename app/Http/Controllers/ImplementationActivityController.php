<?php

namespace App\Http\Controllers;

use App\Models\ImplementationActivity;
use App\Models\ProgressUpdate;
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

    public function index($projectId): JsonResponse
    {
        $activities = ImplementationActivity::where('project_id', $projectId)
            ->with(['responsiblePerson:id,name,email', 'responsiblePerson.activeRoles', 'documents'])
            ->orderBy('planned_start_date')
            ->orderBy('id')
            ->get();

        return response()->json(['data' => $activities]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
            'name' => ['required', 'string', 'max:255'],
            'phase' => ['nullable', 'string', 'max:100'],
            'expected_deliverable' => ['required', 'string'],
            'planned_start_date' => ['required', 'date'],
            'planned_end_date' => ['required', 'date', 'after_or_equal:planned_start_date'],
            'responsible_person_id' => ['required', 'exists:users,id'],
        ]);

        $project = \App\Models\Project::findOrFail($validated['project_id']);
        if (! $project->canBeManagedBy($request->user())) {
            return response()->json(['message' => 'You can only manage activities on projects assigned to you.'], 403);
        }
        if ($project->isPlanLocked()) {
            return response()->json(['message' => 'Plan activities cannot be added while the plan is pending review.'], 403);
        }

        $validated['status'] = 'not_started';
        // New activities start out awaiting reviewer sign-off, same as a
        // post-approval edit — the pending_changes snapshot just mirrors the
        // activity's own starting values, so approving it is a no-op update
        // and rejecting it leaves those values in place but flagged.
        $validated['plan_change_status'] = 'pending';
        $validated['pending_changes'] = array_intersect_key($validated, array_flip(self::PLANNING_FIELDS));

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

        $existingStart = optional($activity->actual_start_date)->toDateString();
        $dateRules = ProgressDateRules::actual(
            optional($activity->planned_start_date)->toDateString(),
            $request->filled('actual_start_date') ? $request->input('actual_start_date') : $existingStart
        );
        $dateRules['actual_start_date'] = array_merge(['sometimes'], $dateRules['actual_start_date']);
        $dateRules['actual_end_date'] = array_merge(['sometimes'], $dateRules['actual_end_date']);

        $validated = $request->validate(array_merge([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'phase' => ['sometimes', 'nullable', 'string', 'max:100'],
            'expected_deliverable' => ['sometimes', 'required', 'string'],
            'planned_start_date' => ['sometimes', 'required', 'date'],
            'planned_end_date' => ['sometimes', 'required', 'date', 'after_or_equal:planned_start_date'],
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
            $activity->update($planning);
            // Keep the reviewer's pending snapshot in sync with what's actually
            // on the activity now — otherwise a later Approve would silently
            // revert this edit back to whatever was there when it was first
            // flagged pending (its creation, or an earlier edit).
            $activity->update([
                'plan_change_status' => 'pending',
                'pending_changes' => array_intersect_key($activity->fresh()->toArray(), array_flip(self::PLANNING_FIELDS)),
            ]);
            $project->reopenPlanIfApproved();
            $project->markEditedAfterReturn();
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
        if (in_array($activity->plan_change_status, ['approved', 'rejected'], true)) {
            throw ValidationException::withMessages([
                'plan_change_status' => ['This activity has already been reviewed.'],
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
        ]));

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
        $activity = ImplementationActivity::findOrFail($id);
        if (in_array($activity->plan_change_status, ['approved', 'rejected'], true)) {
            throw ValidationException::withMessages([
                'plan_change_status' => ['This activity has already been reviewed.'],
            ]);
        }
        $request->validate(['comment' => ['nullable', 'string']]);

        $activity->update([
            'pending_changes' => null,
            'plan_change_status' => 'rejected',
        ]);

        if ($request->filled('comment')) {
            ProgressUpdate::create([
                'entity_type' => 'activity',
                'entity_id' => $activity->id,
                'remark' => 'Plan change rejected: '.$request->string('comment'),
                'status' => $activity->status,
                'updated_by' => $request->user()->id,
            ]);
        }

        return response()->json([
            'message' => 'Plan change rejected. Original plan kept.',
            'data' => $activity->fresh()->load('responsiblePerson:id,name,email'),
        ]);
    }

    public function submitProgressReview($id): JsonResponse
    {
        $activity = ImplementationActivity::findOrFail($id);

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
        $activity = ImplementationActivity::findOrFail($id);

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
        $activity = ImplementationActivity::findOrFail($id);
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
