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
        if (!$request->user()->hasPermission('projects.view_all')) {
            return response()->json(['message' => 'Unauthorized access.'], 403);
        }

        $projects = Project::with(['reviewer', 'planner', 'coordinator'])->latest()->get();

        return response()->json([
            'data' => $projects,
        ], 200);
    }
}