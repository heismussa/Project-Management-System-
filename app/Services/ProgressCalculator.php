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
            if ($requirement->implementation_status === 'Completed') {
                $totalScore += 100;
            } elseif ($requirement->implementation_status === 'Ongoing') {
                $totalScore += 50;
            } // 'Pending' counts as 0
        }

        return round($totalScore / $requirements->count(), 2);
    }
}
