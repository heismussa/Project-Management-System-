<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterProjectRequest;
use App\Models\Project;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function store(RegisterProjectRequest $request)
    {
        $data = $request->validated();

        // Business Logic: Auto Status Determination
        $data['status'] = !empty($data['planned_start_date']) ? 'ongoing' : 'not_started';
        $data['phase'] = 'initiation';
        $data['reviewer_id'] = $request->user()->id;

        $project = Project::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Project registered successfully under Process 1.',
            'data' => $project->load(['reviewer', 'planner'])
        ], 201);
    }

    public function index(Request $request)
    {
        if (!$request->user()->hasPermissionTo('projects.view_all')) {
            return response()->json(['message' => 'Unauthorized action.'], 403);
        }

        $projects = Project::with(['reviewer', 'planner'])
            ->when($request->category, fn($q) => $q->where('category', $request->category))
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $projects
        ]);
    }
}