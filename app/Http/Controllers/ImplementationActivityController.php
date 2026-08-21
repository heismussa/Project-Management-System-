<?php

namespace App\Http\Controllers;

use App\Models\ImplementationActivity;
use App\Models\ProgressUpdate;
use App\Services\ProjectWorkflowService;
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
            ->with(['responsiblePerson:id,name,email', 'documents'])
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

        $validated['status'] = 'not_started';
        $activity = ImplementationActivity::create($validated)->load('responsiblePerson:id,name,email');

        return response()->json([
            'message' => 'Activity created',
            'data' => $activity,
        ], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $activity = ImplementationActivity::with('project')->findOrFail($id);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'phase' => ['sometimes', 'nullable', 'string', 'max:100'],
            'expected_deliverable' => ['sometimes', 'required', 'string'],
            'planned_start_date' => ['sometimes', 'required', 'date'],
            'planned_end_date' => ['sometimes', 'required', 'date', 'after_or_equal:planned_start_date'],
            'responsible_person_id' => ['sometimes', 'required', 'exists:users,id'],
            'actual_start_date' => ['sometimes', 'nullable', 'date'],
            'actual_end_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:actual_start_date'],
            'status' => ['sometimes', 'nullable', 'string', 'max:50'],
            'remark' => ['sometimes', 'nullable', 'string'],
        ]);

        $planning = array_intersect_key($validated, array_flip(self::PLANNING_FIELDS));
        $progress = array_intersect_key($validated, array_flip(['actual_start_date', 'actual_end_date', 'status']));
        $remark = $validated['remark'] ?? null;
        unset($validated['remark']);

        if ($planning !== [] && ProjectWorkflowService::planningLocked($activity->project)) {
            $activity->update([
                'pending_changes' => array_merge($activity->pending_changes ?? [], $planning, [
                    'submitted_at' => now()->toIso8601String(),
                    'submitted_by' => $request->user()->id,
                ]),
                'plan_change_status' => 'pending',
            ]);
        } elseif ($planning !== []) {
            $activity->update($planning);
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
        $message = ($planning !== [] && ProjectWorkflowService::planningLocked($activity->project))
            ? 'Plan change submitted for reviewer approval. It will not apply until approved.'
            : 'Activity updated';

        return response()->json([
            'message' => $message,
            'data' => $fresh,
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $activity = ImplementationActivity::findOrFail($id);
        $activity->delete();

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
        if (! $activity->pending_changes) {
            throw ValidationException::withMessages([
                'pending_changes' => ['There are no pending plan changes to approve.'],
            ]);
        }

        $changes = collect($activity->pending_changes)
            ->only(self::PLANNING_FIELDS)
            ->all();

        $activity->update(array_merge($changes, [
            'pending_changes' => null,
            'plan_change_status' => 'approved',
        ]));

        return response()->json([
            'message' => 'Plan change approved and applied.',
            'data' => $activity->fresh()->load('responsiblePerson:id,name,email'),
        ]);
    }

    public function rejectPlanChange(Request $request, $id): JsonResponse
    {
        $activity = ImplementationActivity::findOrFail($id);
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
}
