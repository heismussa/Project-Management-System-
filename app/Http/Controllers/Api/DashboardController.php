<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Repositories\PlannerRepository;
use App\Repositories\ImplementorRepository;

class DashboardController extends Controller
{
    protected $plannerRepo;
    protected $implementorRepo;

    public function __construct(PlannerRepository $plannerRepo, ImplementorRepository $implementorRepo)
    {
        $this->plannerRepo = $plannerRepo;
        $this->implementorRepo = $implementorRepo;
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $role = $user->active_role;

        $metrics = [];

        switch ($role) {
            case 'Planner':
                $metrics = $this->plannerRepo->getPlannerMetrics();
                break;
            case 'Implementor':
                $metrics = $this->implementorRepo->getImplementorMetrics();
                break;
            case 'ICT Support':
            default:
                $metrics = [
                    'planner' => $this->plannerRepo->getPlannerMetrics(),
                    'implementor' => $this->implementorRepo->getImplementorMetrics(),
                ];
                break;
        }

        return response()->json([
            'role' => $role,
            'metrics' => $metrics
        ]);
    }
}