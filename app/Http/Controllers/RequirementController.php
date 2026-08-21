<?php

namespace App\Http\Controllers;

use App\Models\ProgressUpdate;
use App\Models\Project;
use App\Models\Requirement;
use App\Models\Review;
use App\Services\ProgressCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RequirementController extends Controller
{
    public function index($projectId): JsonResponse
    {
        $requirements = Requirement::where('project_id', $projectId)
            ->with(['progressUpdates' => fn ($query) => $query->latest()->with('updater:id,name')])
            ->orderBy('requirement_code')
            ->get();

        return response()->json(['data' => $requirements]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'requirement_code' => 'required|string',
            'description' => 'required|string',
        ]);

        $validated['implementation_status'] = 'Pending';

        $requirement = Requirement::create($validated);

        return response()->json([
            'message' => 'Requirement added to matrix',
            'data' => $requirement,
        ], 201);
    }

    public function getProgress($project): JsonResponse
    {
        return $this->getProjectProgress($project);
    }

    public function getProjectProgress($project): JsonResponse
    {
        $requirements = Requirement::where('project_id', $project)->get();

        $total = $requirements->count();
        $completed = $requirements->where('implementation_status', 'Completed')->count();
        $ongoing = $requirements->where('implementation_status', 'Ongoing')->count();
        $pending = $requirements->where('implementation_status', 'Pending')->count();

        $overallProgress = ProgressCalculator::calculateProjectProgress($project);

        return response()->json([
            'project_id' => (int) $project,
            'overall_progress' => $overallProgress.'%',
            'metrics' => [
                'total_requirements' => $total,
                'completed' => $completed,
                'ongoing' => $ongoing,
                'pending' => $pending,
            ],
        ]);
    }

    public function updateStatus(Request $request, $id): JsonResponse
    {
        $requirement = Requirement::findOrFail($id);

        $validated = $request->validate([
            'implementation_status' => 'nullable|in:Pending,Ongoing,Completed',
            'test_result' => 'nullable|in:Pass,Fail',
            'remarks' => 'nullable|string',
            'actual_start_date' => 'nullable|date',
            'actual_end_date' => 'nullable|date|after_or_equal:actual_start_date',
        ]);

        if (! empty($validated['actual_end_date'])) {
            $validated['implementation_status'] = 'Completed';
        } elseif (! empty($validated['actual_start_date'])) {
            $validated['implementation_status'] = 'Ongoing';
        } elseif (! isset($validated['implementation_status'])) {
            $validated['implementation_status'] = $requirement->implementation_status ?: 'Pending';
        }

        $requirement->update($validated);

        if (! empty($validated['remarks']) || isset($validated['actual_start_date']) || isset($validated['actual_end_date'])) {
            ProgressUpdate::create([
                'entity_type' => 'requirement',
                'entity_id' => $requirement->id,
                'actual_start_date' => $validated['actual_start_date'] ?? $requirement->actual_start_date,
                'actual_end_date' => $validated['actual_end_date'] ?? $requirement->actual_end_date,
                'remark' => $validated['remarks'] ?? null,
                'test_result' => $validated['test_result'] ?? $requirement->test_result,
                'status' => $requirement->implementation_status,
                'updated_by' => $request->user()->id,
            ]);
        }

        $overallProgress = ProgressCalculator::calculateProjectProgress($requirement->project_id);

        return response()->json([
            'message' => 'Requirement status updated successfully',
            'overall_implementation_score' => $overallProgress.'%',
            'data' => $requirement->fresh()->load(['progressUpdates' => fn ($q) => $q->latest()]),
        ]);
    }

    public function review(Request $request, $id): JsonResponse
    {
        $requirement = Requirement::findOrFail($id);

        $validated = $request->validate([
            'review_decision' => 'required|in:approved,rejected,needs_revision',
            'comment' => 'nullable|string',
        ]);

        $requirement->update(['review_decision' => $validated['review_decision']]);

        Review::create([
            'project_id' => $requirement->project_id,
            'entity_type' => 'requirement',
            'entity_id' => $requirement->id,
            'reviewer_id' => $request->user()->id,
            'decision' => $validated['review_decision'],
            'comment' => $validated['comment'] ?? null,
            'reviewed_at' => now(),
        ]);

        if (! empty($validated['comment'])) {
            ProgressUpdate::create([
                'entity_type' => 'requirement',
                'entity_id' => $requirement->id,
                'remark' => $validated['comment'],
                'status' => $requirement->implementation_status,
                'updated_by' => $request->user()->id,
            ]);
        }

        return response()->json([
            'message' => 'Requirement review saved',
            'data' => $requirement->fresh(),
        ]);
    }

    public function returnMatrix(Request $request, $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $validated = $request->validate([
            'comment' => ['required', 'string'],
        ]);

        Requirement::where('project_id', $project->id)->update([
            'review_decision' => 'needs_revision',
        ]);

        $project->update([
            'matrix_return_comment' => $validated['comment'],
            'matrix_returned_at' => now(),
        ]);

        Review::create([
            'project_id' => $project->id,
            'entity_type' => 'matrix',
            'entity_id' => $project->id,
            'reviewer_id' => $request->user()->id,
            'decision' => 'needs_revision',
            'comment' => $validated['comment'],
            'reviewed_at' => now(),
        ]);

        return response()->json([
            'message' => 'Matrix returned to planner with comments.',
            'data' => [
                'comment' => $validated['comment'],
                'returned_at' => $project->fresh()->matrix_returned_at,
                'requirements' => Requirement::where('project_id', $project->id)->get(),
            ],
        ]);
    }
}
