<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Activity;
use App\Models\Notification;
use Carbon\Carbon;

class CheckProjectDeadlines extends Command
{
    protected $signature = 'deadlines:check';
    protected $description = 'Scan project activities and generate deadline alerts.';

    public function handle()
    {
        $today = Carbon::today();
        $activities = Activity::all();

        foreach ($activities as $activity) {
            $startDate = Carbon::parse($activity->start_date);
            $diffInDays = $today->diffInDays($startDate, false);

            if ($diffInDays === 7 || $diffInDays === 1) {
                Notification::create([
                    'user_id' => $activity->assigned_user_id,
                    'type' => 'Upcoming',
                    'message' => "Activity '{$activity->name}' starts in {$diffInDays} day(s).",
                ]);
            }

            if (($diffInDays === -1 || $diffInDays === -3) && $activity->status !== 'Completed') {
                Notification::create([
                    'user_id' => $activity->assigned_user_id,
                    'type' => 'Overdue',
                    'message' => "Activity '{$activity->name}' is overdue by " . abs($diffInDays) . " day(s).",
                ]);
            }
        }

        $this->info('Deadline scan completed successfully.');
    }
}