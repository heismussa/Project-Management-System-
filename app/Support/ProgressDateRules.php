<?php

namespace App\Support;

class ProgressDateRules
{
    /**
     * actual_start >= planned_start (when known) and actual dates cannot be in the future.
     */
    public static function actual(?string $plannedStart = null, ?string $existingActualStart = null): array
    {
        $start = ['nullable', 'date', 'before_or_equal:today'];
        if ($plannedStart) {
            $start[] = 'after_or_equal:'.$plannedStart;
        }

        $end = ['nullable', 'date', 'before_or_equal:today'];
        if ($existingActualStart) {
            $end[] = 'after_or_equal:'.$existingActualStart;
        } else {
            $end[] = 'after_or_equal:actual_start_date';
        }

        return [
            'actual_start_date' => $start,
            'actual_end_date' => $end,
        ];
    }
}
