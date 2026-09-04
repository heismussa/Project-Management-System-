<?php

namespace App\Console\Commands;

use App\Models\ImplementationActivity;
use App\Models\Notification;
use Illuminate\Console\Command;

class CheckProjectDeadlines extends Command
{
    protected $signature = 'deadlines:check';

    protected $description = 'Scan activity planned start dates and generate upcoming/overdue alerts.';

    public function handle(): int
    {
        $today = now()->startOfDay();
        $created = 0;

        ImplementationActivity::query()
            ->whereNotNull('planned_start_date')
            ->with('responsiblePerson')
            ->each(function (ImplementationActivity $activity) use ($today, &$created) {
                $userId = $activity->responsible_person_id;
                if (! $userId) {
                    return;
                }

                $start = $activity->planned_start_date->startOfDay();
                $diff = (int) $today->diffInDays($start, false);
                $started = filled($activity->actual_start_date);
                $completed = filled($activity->actual_end_date)
                    || strtolower((string) $activity->status) === 'completed';

                if ($diff === 7 || $diff === 1) {
                    $created += $this->storeOnce($userId, 'Upcoming', "Activity '{$activity->name}' starts in {$diff} day(s).");
                }

                if (! $started && ! $completed && ($diff === -1 || $diff === -3)) {
                    $created += $this->storeOnce(
                        $userId,
                        'Overdue',
                        "Activity '{$activity->name}' is overdue by ".abs($diff).' day(s).'
                    );
                }
            });

        $this->info("Deadline scan completed. {$created} notification(s) created.");

        return self::SUCCESS;
    }

    private function storeOnce(int $userId, string $type, string $message): int
    {
        $exists = Notification::query()
            ->where('user_id', $userId)
            ->where('type', $type)
            ->where('message', $message)
            ->whereDate('created_at', now()->toDateString())
            ->exists();

        if ($exists) {
            return 0;
        }

        Notification::create([
            'user_id' => $userId,
            'type' => $type,
            'message' => $message,
        ]);

        return 1;
    }
}
