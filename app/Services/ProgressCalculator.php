<?php

namespace App\Services;

use App\Models\Requirement;

class ProgressCalculator
{
    /**
     * Calculates the overall implementation score based on itemized SRS requirements.
     */
    public static function calculateProjectProgress($projectId): float
    {
        $requirements = Requirement::where('project_id', $projectId)->get();

        if ($requirements->isEmpty()) {
            return 0.0;
        }

        $totalScore = 0;
        foreach ($requirements as $requirement) {
            $totalScore += Requirement::scoreFor($requirement->implementation_status);
        }

        return round($totalScore / $requirements->count(), 2);
    }
}
