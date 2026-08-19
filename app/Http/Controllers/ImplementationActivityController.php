<?php

namespace App\Http\Controllers;

use App\Models\ImplementationActivity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ImplementationActivityController extends Controller
{
    public function index($projectId): JsonResponse
    {
        $activities = ImplementationActivity::where('project_id', $projectId)
            ->with('responsiblePerson:id,name,email')
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
        $activity = ImplementationActivity::findOrFail($id);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'expected_deliverable' => ['sometimes', 'required', 'string'],
            'planned_start_date' => ['sometimes', 'required', 'date'],
            'planned_end_date' => ['sometimes', 'required', 'date', 'after_or_equal:planned_start_date'],
            'responsible_person_id' => ['sometimes', 'required', 'exists:users,id'],
            'actual_start_date' => ['sometimes', 'nullable', 'date'],
            'actual_end_date' => ['sometimes', 'nullable', 'date'],
            'status' => ['sometimes', 'nullable', 'string', 'max:50'],
        ]);

        $activity->update($validated);

        return response()->json([
            'message' => 'Activity updated',
            'data' => $activity->fresh()->load('responsiblePerson:id,name,email'),
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $activity = ImplementationActivity::findOrFail($id);
        $activity->delete();

        return response()->json(['message' => 'Activity deleted']);
    }
}
