<?php

namespace App\Support;

class ProgressDateRules
{
    /**
     * actual_start >= planned_start (when known), actual dates cannot be in
     * the future, and neither can fall after the project's own planned end
     * date (when the project has one) — activity/requirement progress is
     * expected to happen within the project's planned window.
     */
    public static function actual(?string $plannedStart = null, ?string $existingActualStart = null, ?string $projectPlannedEnd = null): array
    {
        $start = ['nullable', 'date', 'before_or_equal:today'];
        if ($plannedStart) {
            $start[] = 'after_or_equal:'.$plannedStart;
        }
        if ($projectPlannedEnd) {
            $start[] = 'before_or_equal:'.$projectPlannedEnd;
        }

        $end = ['nullable', 'date', 'before_or_equal:today'];
        if ($existingActualStart) {
            $end[] = 'after_or_equal:'.$existingActualStart;
        } else {
            $end[] = 'after_or_equal:actual_start_date';
        }
        if ($projectPlannedEnd) {
            $end[] = 'before_or_equal:'.$projectPlannedEnd;
        }

        return [
            'actual_start_date' => $start,
            'actual_end_date' => $end,
        ];
    }
}
