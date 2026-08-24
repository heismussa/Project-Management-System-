<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\ImplementationActivity;
use App\Models\Project;
use App\Models\Requirement;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $role = $request->query('role') ?: data_get($user->toAuthArray(), 'role');

        $pendingActions = [];
        $metrics = Project::getReviewerMetrics();

        if (in_array($role, ['Project Planner', 'Project Administrator'], true)) {
            $plannerId = $role === 'Project Planner' ? $user->id : null;
            $metrics = array_merge($metrics, Project::getPlannerMetrics($plannerId));
            $pendingActions[] = [
                'label' => 'Open implementation plan',
                'path' => '/implementation-plan',
            ];
        }

        if (in_array($role, ['Project Reviewer', 'Project Coordinator', 'Project Approver', 'Project Administrator'], true)) {
            $pendingActions[] = [
                'label' => 'Open reviews queue',
                'path' => '/reviews',
            ];
        }

        if (in_array($role, ['Project Implementor', 'Project Administrator'], true)) {
            $metrics = array_merge($metrics, Project::getImplementorMetrics());
            $pendingActions[] = [
                'label' => 'Update activity progress',
                'path' => '/implementation-plan',
            ];
        }

        if (in_array($role, ['ICT Support', 'Project Administrator'], true)) {
            $pendingActions[] = [
                'label' => 'Manage users and roles',
                'path' => '/user-management',
            ];
        }

        $payload = [
            'role' => $role,
            'counts' => $metrics,
            'pending_actions' => $pendingActions,
            'activity_total' => ImplementationActivity::count(),
            'requirement_total' => Requirement::count(),
            'document_total' => Document::count(),
        ];

        if ($role === 'Project Administrator') {
            $payload['admin'] = Project::administratorDashboard();
        }

        if ($role === 'Project Reviewer') {
            $payload['reviewer'] = Project::reviewerDashboard();
        }

        if ($role === 'Project ViewOnly') {
            $payload['view_only'] = Project::viewOnlyDashboard();
        }

        if ($role === 'ICT Support') {
            $payload['ict_support'] = User::ictSupportDashboard();
        }

        return response()->json(['data' => $payload]);
    }
}
