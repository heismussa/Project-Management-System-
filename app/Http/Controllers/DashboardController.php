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

        // Role-specific dashboards build their own payload — skip the shared
        // portfolio COUNTs / pending_actions that those UIs never render.
        if ($role === 'Project Reviewer') {
            return response()->json([
                'data' => [
                    'role' => $role,
                    'reviewer' => Project::reviewerDashboard(),
                ],
            ]);
        }

        if ($role === 'Project Administrator') {
            return response()->json([
                'data' => [
                    'role' => $role,
                    'admin' => Project::administratorDashboard(),
                ],
            ]);
        }

        if ($role === 'ICT Support') {
            return response()->json([
                'data' => [
                    'role' => $role,
                    'ict_support' => User::ictSupportDashboard(),
                ],
            ]);
        }

        if ($role === 'Project ViewOnly') {
            return response()->json([
                'data' => [
                    'role' => $role,
                    'view_only' => Project::viewOnlyDashboard(),
                ],
            ]);
        }

        if ($role === 'Project Planner') {
            return response()->json([
                'data' => [
                    'role' => $role,
                    'counts' => Project::getPlannerMetrics($user->id),
                    'pending_actions' => [
                        ['label' => 'Open assigned projects', 'path' => '/projects'],
                    ],
                ],
            ]);
        }

        $pendingActions = [];
        $metrics = Project::getReviewerMetrics();

        if (in_array($role, ['Project Coordinator', 'Project Approver'], true)) {
            $pendingActions[] = [
                'label' => 'Open reviews queue',
                'path' => $role === 'Project Coordinator' ? '/recommendations' : '/reviews',
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

        return response()->json(['data' => $payload]);
    }
}
