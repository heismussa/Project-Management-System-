<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProjectRequest;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function store(StoreProjectRequest $request): JsonResponse
    {
        // Validation and Authorization are automatically handled by StoreProjectRequest
        $validated = $request->validated();
        $validated['reviewer_id'] = $request->user()->id;
        $validated['status'] = 'Initiated';
        $validated['phase'] = 'Registration';

        $project = Project::create($validated);

        return response()->json([
            'message' => 'Project successfully registered in Process 1.',
            'data'    => $project,
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $projects = Project::with(['reviewer', 'planner', 'coordinator'])->latest()->get();

        return response()->json([
            'data' => $projects,
        ], 200);
    }

    public function show($id): JsonResponse
    {
        $project = Project::with(['reviewer', 'planner', 'coordinator'])->findOrFail($id);

        return response()->json([
            'data' => $project,
        ], 200);
    }

    public function reassign(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasPermission('projects.assign_planner') && ! $user->hasPermission('projects.reassign_planner')) {
            return response()->json(['message' => 'Unauthorized access.'], 403);
        }

        $validated = $request->validate([
            'planner_id' => ['required', 'exists:users,id'],
        ]);

        $project = Project::findOrFail($id);
        $project->update(['planner_id' => $validated['planner_id']]);

        return response()->json([
            'message' => 'Project planner reassigned.',
            'data' => $project->fresh(['reviewer', 'planner', 'coordinator']),
        ], 200);
    }
}