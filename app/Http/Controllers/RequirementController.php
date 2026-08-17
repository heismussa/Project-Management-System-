<?php

namespace App\Http\Controllers;

use App\Models\Requirement;
use App\Services\ProgressCalculator;
use Illuminate\Http\Request;

class RequirementController extends Controller
{
    // Fetch all requirements for a specific project
    public function index($projectId)
    {
        $requirements = Requirement::where('project_id', $projectId)->get();
        return response()->json($requirements);
    }

    // Add new SRS requirement item
    public function store(Request $request)
    {
        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'requirement_code' => 'required|string',
            'description' => 'required|string',
        ]);

        // Default status rule per SRS requirement
        $validated['implementation_status'] = 'Pending';

        $requirement = Requirement::create($validated);

        return response()->json([
            'message' => 'Requirement added to matrix',
            'data' => $requirement
        ], 201);
    }

    // Get overall progress for a specific project
    public function getProjectProgress($project)
    {
        $requirements = Requirement::where('project_id', $project)->get();

        $total = $requirements->count();
        $completed = $requirements->where('implementation_status', 'Completed')->count();
        $ongoing = $requirements->where('implementation_status', 'Ongoing')->count();
        $pending = $requirements->where('implementation_status', 'Pending')->count();

        $overallProgress = ProgressCalculator::calculateProjectProgress($project);

        return response()->json([
            'project_id' => (int) $project,
            'overall_progress' => $overallProgress . '%',
            'metrics' => [
                'total_requirements' => $total,
                'completed' => $completed,
                'ongoing' => $ongoing,
                'pending' => $pending,
            ]
        ]);
    }

    // Update status and test results, then return calculated project progress
    public function updateStatus(Request $request, $id)
    {
        $requirement = Requirement::findOrFail($id);

        $validated = $request->validate([
            'implementation_status' => 'required|in:Pending,Ongoing,Completed',
            'test_result' => 'nullable|in:Pass,Fail',
            'remarks' => 'nullable|string'
        ]);

        $requirement->update($validated);

        // Calculate live progress percentage
        $overallProgress = ProgressCalculator::calculateProjectProgress($requirement->project_id);

        return response()->json([
            'message' => 'Requirement status updated successfully',
            'overall_implementation_score' => $overallProgress . '%',
            'data' => $requirement
        ]);
    }
}
