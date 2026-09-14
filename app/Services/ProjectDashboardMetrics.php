<?php

namespace App\Services;

use App\Models\Document;
use App\Models\ImplementationActivity;
use App\Models\Project;
use App\Models\Requirement;
use App\Models\Review;
use App\Support\InitiationDocuments;
use Carbon\Carbon;

/**
 * Dashboard-aggregation queries for Project, extracted out of the model so
 * app/Models/Project.php stays focused on relations and per-instance
 * business logic. Split boundary: only called from DashboardController, so
 * moving it here doesn't touch any other caller.
 */
class ProjectDashboardMetrics
{
    /**
     * Contract for Person 1 dashboard KPIs.
     */
    public static function getReviewerMetrics(): array
    {
        $open = Project::query()->whereNull('closed_at');

        return [
            'new_registrations' => (clone $open)->where('phase', 'Registration')->count(),
            'plans_pending_review' => (clone $open)->where('plan_review_status', 'pending_review')->count(),
            'awaiting_recommendation' => (clone $open)
                ->where('plan_review_status', 'approved')
                ->whereNull('recommended_at')
                ->whereNull('execution_started_at')
                ->count(),
            'awaiting_execution_sign_off' => (clone $open)
                ->where('plan_review_status', 'approved')
                ->whereNull('execution_started_at')
                ->count(),
            'in_execution' => (clone $open)->where('phase', 'Execution')->count(),
            'closed' => Project::query()->whereNotNull('closed_at')->count(),
        ];
    }

    public static function getPlannerMetrics(?int $plannerId = null): array
    {
        $projects = Project::query()->assignedToPlanner($plannerId);
        $projectIds = (clone $projects)->pluck('id');

        return [
            'assigned_projects' => (clone $projects)->count(),
            'active_activities' => ImplementationActivity::query()->whereIn('project_id', $projectIds)->count(),
            'pending_matrix_items' => Requirement::query()
                ->whereIn('project_id', $projectIds)
                ->incomplete()
                ->count(),
            'plans_returned' => (clone $projects)->where('plan_review_status', 'changes_requested')->count(),
            'overdue_activities' => ImplementationActivity::query()
                ->whereIn('project_id', $projectIds)
                ->whereNull('actual_end_date')
                ->whereDate('planned_end_date', '<', now())
                ->count(),
            'closure_requests_pending' => (clone $projects)->whereNotNull('closure_requested_at')->count(),
        ];
    }

    /**
     * transitionBlocker() and isReadyToClose() (and the methods they call
     * into — initiationReadiness(), hasPassedAllUAT(), hasCompletedAllActivities(),
     * hasAllClosureDocsReviewed()) each run their own fresh query via
     * $this->documents()/$this->requirements()/$this->implementationActivities(),
     * which is the right, safe default for a single-model call but calling
     * either one per project in a loop over every open project (what this
     * dashboard used to do, for both the blockers list and the
     * closure_signoffs count) was firing 500+ tiny queries and was nearly all
     * of this dashboard's load time — individually sub-millisecond, but that
     * many round trips adds up. This computes both from the same handful of
     * bulk/grouped queries instead. Kept separate from those methods rather
     * than changing their internals, since they're used elsewhere as
     * one-off checks where a fresh query on a single model is exactly right.
     */
    private static function openProjectGatesBulk(): array
    {
        $projects = Project::whereNull('closed_at')
            ->get(['id', 'name', 'lifecycle_stage', 'plan_review_status', 'plan_submitted_at', 'updated_at', 'execution_started_at', 'created_at']);
        $ids = $projects->pluck('id');

        $oldestReturnedDocument = Document::whereIn('project_id', $ids)
            ->where('is_current', true)
            ->where('review_status', 'returned')
            ->orderBy('reviewed_at')
            ->get(['project_id', 'reviewed_at', 'updated_at'])
            ->groupBy('project_id')
            ->map(fn ($docs) => $docs->first());

        $initiationIds = $projects->where('lifecycle_stage', 'initiation')->pluck('id');
        $initiationDocTypes = Document::whereIn('project_id', $initiationIds)
            ->where('is_current', true)
            ->whereIn('document_type', InitiationDocuments::keys())
            ->get(['project_id', 'document_type'])
            ->groupBy('project_id')
            ->map(fn ($docs) => $docs->pluck('document_type')->all());

        // Used both by the UAT blocker check (only for projects already in
        // execution) and by the closure "uat" gate (any open project) — one
        // set of aggregates over every open project covers both.
        $reqTotals = Requirement::whereIn('project_id', $ids)
            ->selectRaw('project_id, count(*) as c')->groupBy('project_id')->pluck('c', 'project_id');
        $reqIncomplete = Requirement::whereIn('project_id', $ids)
            ->incomplete()
            ->selectRaw('project_id, count(*) as c')->groupBy('project_id')->pluck('c', 'project_id');
        $reqBadTest = Requirement::whereIn('project_id', $ids)
            ->where(fn ($q) => $q->whereNull('test_result')->orWhereNotIn('test_result', ['Pass', 'Fail']))
            ->selectRaw('project_id, count(*) as c')->groupBy('project_id')->pluck('c', 'project_id');
        $passedAllUat = fn (int $projectId) => $reqTotals->get($projectId, 0) > 0
            && $reqIncomplete->get($projectId, 0) === 0
            && $reqBadTest->get($projectId, 0) === 0;

        // hasCompletedAllActivities(): at least one activity, and none still
        // open (no actual_end_date, and status not "completed").
        $activityTotals = ImplementationActivity::whereIn('project_id', $ids)
            ->selectRaw('project_id, count(*) as c')->groupBy('project_id')->pluck('c', 'project_id');
        $activitiesOpen = ImplementationActivity::whereIn('project_id', $ids)
            ->whereNull('actual_end_date')
            ->where(fn ($q) => $q->whereNull('status')->orWhereRaw('LOWER(status) <> ?', ['completed']))
            ->selectRaw('project_id, count(*) as c')->groupBy('project_id')->pluck('c', 'project_id');
        $completedAllActivities = fn (int $projectId) => $activityTotals->get($projectId, 0) > 0
            && $activitiesOpen->get($projectId, 0) === 0;

        // hasAllClosureDocsReviewed(): current, non-initiation documents
        // exist and are all approved.
        $closureDocs = Document::whereIn('project_id', $ids)
            ->where('is_current', true)
            ->get(['project_id', 'phase', 'review_status'])
            ->groupBy('project_id')
            ->map(fn ($docs) => $docs->filter(fn (Document $d) => strtolower((string) $d->phase) !== 'initiation'));
        $allClosureDocsReviewed = fn (int $projectId) => ($docs = $closureDocs->get($projectId))
            && $docs->isNotEmpty()
            && $docs->every(fn (Document $d) => strtolower((string) $d->review_status) === 'approved');

        $blockers = [];
        $closureReadyIds = [];
        $initiationNotReadyIds = [];

        foreach ($projects as $project) {
            $blocker = null;

            if ($project->lifecycle_stage === 'initiation') {
                $present = $initiationDocTypes->get($project->id, []);
                $missingRequired = collect(InitiationDocuments::TYPES)
                    ->filter(fn ($meta, $key) => ($meta['required'] ?? true) && ! in_array($key, $present, true))
                    ->isNotEmpty();
                if ($missingRequired) {
                    $blocker = ['reason' => 'Initiation documents missing', 'since' => $project->created_at];
                    $initiationNotReadyIds[] = $project->id;
                }
            } elseif ($project->plan_review_status === 'pending_review') {
                $blocker = ['reason' => 'Plan not reviewed', 'since' => $project->plan_submitted_at ?? $project->updated_at];
            } elseif ($returned = $oldestReturnedDocument->get($project->id)) {
                $blocker = [
                    'reason' => 'Returned documents unresolved',
                    'since' => $returned->reviewed_at ?? $returned->updated_at,
                ];
            } elseif ($project->execution_started_at && ! $passedAllUat($project->id)) {
                $blocker = ['reason' => 'UAT scores missing', 'since' => $project->execution_started_at];
            }

            if ($blocker) {
                $blockers[] = [
                    'project_id' => $project->id,
                    'project_name' => $project->name,
                    'reason' => $blocker['reason'],
                    'days_stuck' => $blocker['since'] ? self::daysSince($blocker['since']) : 0,
                ];
            }

            // isReadyToClose(): all four closureChecks() gates pass.
            $readyToClose = $project->plan_review_status === 'approved'
                && $completedAllActivities($project->id)
                && $passedAllUat($project->id)
                && $allClosureDocsReviewed($project->id);
            if ($readyToClose) {
                $closureReadyIds[] = $project->id;
            }
        }

        return [
            'blockers' => collect($blockers)->sortByDesc('days_stuck')->values()->all(),
            'closure_signoffs' => count($closureReadyIds),
            'closure_ready_ids' => $closureReadyIds,
            'initiation_not_ready_ids' => $initiationNotReadyIds,
        ];
    }

    /**
     * Aggregates for the Administrator dashboard at "/".
     */
    public static function administratorDashboard(): array
    {
        $statusCounts = [
            'total' => Project::count(),
            'ongoing' => Project::whereNotNull('actual_start_date')->whereNull('actual_end_date')->count(),
            'completed' => Project::whereNotNull('actual_end_date')->count(),
            'not_started' => Project::whereNull('actual_start_date')->count(),
        ];

        // lifecycle_stage never actually reaches a distinct "closed" value —
        // a closed project still reads lifecycle_stage='closure', so 'closure'
        // here means "in closure but not yet closed" and 'closed' is its own
        // bucket, specifically so the two stay mutually exclusive and a
        // portfolio breakdown built from all five adds up to the real total.
        $phaseCounts = collect(['initiation', 'planning', 'execution'])
            ->mapWithKeys(fn (string $stage) => [$stage => Project::where('lifecycle_stage', $stage)->count()])
            ->all();
        $phaseCounts['closure'] = Project::where('lifecycle_stage', 'closure')->whereNull('closed_at')->count();
        $phaseCounts['closed'] = Project::whereNotNull('closed_at')->count();

        $averageScore = Project::whereNotNull('overall_implementation_score')->avg('overall_implementation_score');
        $requirementTotal = Requirement::count();
        $passCount = Requirement::where('test_result', 'Pass')->count();

        $gates = self::openProjectGatesBulk();

        $overdueDays = ImplementationActivity::query()
            ->whereNull('actual_start_date')
            ->whereNotNull('planned_start_date')
            ->whereDate('planned_start_date', '<', now()->toDateString())
            ->get(['planned_start_date'])
            ->map(fn (ImplementationActivity $activity) => self::daysSince($activity->planned_start_date));

        return [
            'status_counts' => $statusCounts,
            'phase_counts' => $phaseCounts,
            'implementation_score_average' => $averageScore !== null ? round((float) $averageScore, 1) : null,
            'uat_pass_rate' => $requirementTotal > 0 ? round(($passCount / $requirementTotal) * 100, 1) : 0.0,
            'total_budget' => (float) Project::sum('budget'),
            'requirement_total' => $requirementTotal,
            'transition_blockers' => $gates['blockers'],
            'overdue_activities' => [
                'total' => $overdueDays->count(),
                '1_day' => $overdueDays->filter(fn ($days) => $days === 1)->count(),
                '3_days' => $overdueDays->filter(fn ($days) => $days === 3)->count(),
                'over_3_days' => $overdueDays->filter(fn ($days) => $days > 3)->count(),
            ],
            'awaiting_action' => [
                'new_registrations' => Project::where('phase', 'Registration')->count(),
                'plans_pending_review' => Project::where('plan_review_status', 'pending_review')->count(),
                'matrices_pending_approval' => Requirement::whereNull('review_decision')->distinct('project_id')->count('project_id'),
                'documents_pending_review' => Document::where('review_status', 'pending')->count(),
                'closure_signoffs' => $gates['closure_signoffs'],
            ],
        ];
    }

    /**
     * Aggregates for the Reviewer dashboard at "/": the six queue counts,
     * the unified pending/returned queue behind the "awaiting review" table
     * and the urgent/upcoming panels, the monthly review-load line chart,
     * and turnaround metrics — all sourced from the reviews table, keyed on
     * reviewed_at.
     */
    public static function reviewerDashboard(): array
    {
        $today = now()->startOfDay();
        $slaDays = 3;
        // No stored due-date column for review items — a due date is derived
        // as submission + this SLA, consistently for overdue/upcoming and for
        // the awaiting-review table.
        $dueAt = fn ($submittedAt) => $submittedAt ? Carbon::parse($submittedAt)->addDays($slaDays)->startOfDay() : null;

        // initiationReadiness()/isReadyToClose() called per-project here used
        // to fire their own query for every open project (same cost as the
        // Administrator dashboard's transition_blockers/closure_signoffs
        // before that was fixed) — reusing the same bulk computation instead.
        $gates = self::openProjectGatesBulk();

        $newRegistrationProjects = Project::whereIn('id', $gates['initiation_not_ready_ids'])->get();

        $plansPendingProjects = Project::where('plan_status', 'pending_review')->get();

        $matricesPendingProjectIds = Requirement::whereNull('review_decision')->distinct()->pluck('project_id');
        $matricesPendingProjects = Project::whereIn('id', $matricesPendingProjectIds)->get();

        $documentsPendingList = Document::where('review_status', 'pending')
            ->where('is_current', true)
            ->with('project:id,name')
            ->get();

        $returnedDocuments = Document::where('review_status', 'returned')
            ->where('is_current', true)
            ->with('project:id,name')
            ->get();

        $returnedPlanProjects = Project::where('plan_status', 'changes_requested')->get();

        // Same "no newer submission" logic as documents: a requirement whose
        // decision is still needs_revision/rejected hasn't been fixed yet —
        // bulk-checked (one grouped query) instead of one exists() query per
        // candidate project.
        $unresolvedMatrixProjectIds = Requirement::whereIn('project_id', Project::whereNotNull('matrix_returned_at')->pluck('id'))
            ->whereIn('review_decision', ['needs_revision', 'rejected'])
            ->distinct()
            ->pluck('project_id');
        $returnedMatrixProjects = Project::whereIn('id', $unresolvedMatrixProjectIds)->get();

        $closureSignoffProjects = Project::whereIn('id', $gates['closure_ready_ids'])->get();

        $pending = collect();

        foreach ($newRegistrationProjects as $project) {
            $submittedAt = $project->created_at;
            $pending->push([
                'project' => $project->name,
                'project_id' => $project->id,
                'type' => 'Registration',
                'submitted_at' => $submittedAt,
                'due_at' => $dueAt($submittedAt),
                'status' => 'Pending',
            ]);
        }

        foreach ($plansPendingProjects as $project) {
            $submittedAt = $project->plan_submitted_at ?? $project->updated_at;
            $pending->push([
                'project' => $project->name,
                'project_id' => $project->id,
                'type' => 'Plan',
                'submitted_at' => $submittedAt,
                'due_at' => $dueAt($submittedAt),
                'status' => $project->plan_pending_reapproval ? 'In review' : 'Pending',
            ]);
        }

        $matricesPendingRequirements = Requirement::whereIn('project_id', $matricesPendingProjects->pluck('id'))
            ->get(['project_id', 'review_decision', 'updated_at'])
            ->groupBy('project_id');

        foreach ($matricesPendingProjects as $project) {
            $requirements = $matricesPendingRequirements->get($project->id, collect());
            $submittedAt = $requirements->whereNull('review_decision')->min('updated_at');
            $pending->push([
                'project' => $project->name,
                'project_id' => $project->id,
                'type' => 'Matrix',
                'submitted_at' => $submittedAt,
                'due_at' => $dueAt($submittedAt),
                'status' => $requirements->whereNotNull('review_decision')->isNotEmpty() ? 'In review' : 'Pending',
            ]);
        }

        foreach ($documentsPendingList as $document) {
            $pending->push([
                'project' => $document->project?->name ?? '—',
                'project_id' => $document->project_id,
                'type' => 'Document',
                'submitted_at' => $document->uploaded_at,
                'due_at' => $dueAt($document->uploaded_at),
                'status' => 'Pending',
            ]);
        }

        $returned = collect();

        foreach ($returnedDocuments as $document) {
            $returned->push([
                'project' => $document->project?->name ?? '—',
                'project_id' => $document->project_id,
                'type' => 'Document',
                'submitted_at' => $document->reviewed_at,
                'status' => 'Returned',
            ]);
        }

        foreach ($returnedPlanProjects as $project) {
            $returned->push([
                'project' => $project->name,
                'project_id' => $project->id,
                'type' => 'Plan',
                'submitted_at' => $project->plan_reviewed_at,
                'status' => 'Returned',
            ]);
        }

        foreach ($returnedMatrixProjects as $project) {
            $returned->push([
                'project' => $project->name,
                'project_id' => $project->id,
                'type' => 'Matrix',
                'submitted_at' => $project->matrix_returned_at,
                'status' => 'Returned',
            ]);
        }

        // Oldest still-pending item per type — awaiting_review below is
        // capped at 8 and sorted most-recent-first for a "what just came
        // in" feed, so it isn't reliable for "what's been sitting longest";
        // this is computed from the full, uncapped $pending set instead.
        $oldestWaitingDays = $pending
            ->filter(fn (array $item) => $item['submitted_at'] !== null)
            ->groupBy('type')
            ->map(fn ($items) => $items->max(fn (array $item) => self::daysSince($item['submitted_at'])))
            ->all();

        $awaitingReview = $pending->concat($returned)
            ->filter(fn (array $item) => $item['submitted_at'] !== null)
            ->sortByDesc(fn (array $item) => Carbon::parse($item['submitted_at'])->timestamp)
            ->take(8)
            ->map(fn (array $item) => [
                'project' => $item['project'],
                'project_id' => $item['project_id'],
                'type' => $item['type'],
                'submitted_at' => Carbon::parse($item['submitted_at'])->toISOString(),
                'status' => $item['status'],
            ])
            ->values()
            ->all();

        $overdueReviews = $pending->filter(fn (array $item) => $item['due_at'] && $item['due_at']->lt($today))->count();

        $returnedOverFiveDays = $returned->filter(
            fn (array $item) => $item['submitted_at'] && Carbon::parse($item['submitted_at'])->lt($today->copy()->subDays(5))
        )->count();

        $plansDueToday = $pending->filter(
            fn (array $item) => $item['type'] === 'Plan' && $item['due_at'] && $item['due_at']->isSameDay($today)
        )->count();

        $dueTodayCount = $pending->filter(fn (array $item) => $item['due_at'] && $item['due_at']->isSameDay($today))->count();
        $dueNext3Days = $pending->filter(
            fn (array $item) => $item['due_at'] && $item['due_at']->gt($today) && $item['due_at']->lte($today->copy()->addDays(3))
        )->count();
        $dueNext7Days = $pending->filter(
            fn (array $item) => $item['due_at'] && $item['due_at']->gt($today->copy()->addDays(3)) && $item['due_at']->lte($today->copy()->addDays(7))
        )->count();

        // Per-requirement decisions land on entity_type "requirement"; a
        // bulk matrix return lands on "matrix" — both are the reviewer's own
        // decisions, so both count toward review load and turnaround.
        $reviewerEntityTypes = ['plan', 'document', 'requirement', 'matrix', 'closure'];

        $yearReviews = Review::whereIn('entity_type', $reviewerEntityTypes)
            ->whereYear('reviewed_at', now()->year)
            ->get(['project_id', 'entity_type', 'decision', 'reviewed_at']);

        // Grouping once and reading back per month is the same result as
        // filtering the full $yearReviews collection 24 times (8 months x 3
        // decision buckets) — each filter() re-scans every row and reads a
        // Carbon ->month property off it, which at a year's worth of reviews
        // was the single largest cost in this whole dashboard.
        $reviewsByMonth = $yearReviews->groupBy(fn (Review $review) => $review->reviewed_at->month);
        $reviewLoad = collect(range(1, 8))->map(function (int $month) use ($reviewsByMonth) {
            $inMonth = $reviewsByMonth->get($month, collect());

            return [
                'month' => Carbon::create(2000, $month, 1)->format('M'),
                'received' => $inMonth->where('decision', 'submitted')->count(),
                'completed' => $inMonth->where('decision', 'approved')->count(),
                'returned' => $inMonth->whereIn('decision', ['returned', 'rejected', 'needs_revision'])->count(),
            ];
        })->values()->all();

        $allReviews = Review::whereIn('entity_type', $reviewerEntityTypes)->get(['project_id', 'entity_type', 'decision', 'reviewed_at']);
        $completedReviews = $allReviews->where('decision', '!=', 'submitted');
        $submittedByKey = $allReviews->where('decision', 'submitted')
            ->groupBy(fn (Review $review) => $review->project_id.'-'.$review->entity_type);

        $turnaroundDays = $completedReviews
            ->map(function (Review $completed) use ($submittedByKey) {
                $key = $completed->project_id.'-'.$completed->entity_type;
                $submission = ($submittedByKey->get($key) ?? collect())
                    ->filter(fn (Review $submitted) => $submitted->reviewed_at <= $completed->reviewed_at)
                    ->sortByDesc('reviewed_at')
                    ->first();

                return $submission ? self::daysSince($submission->reviewed_at, $completed->reviewed_at) : null;
            })
            ->filter(fn ($days) => $days !== null);

        // Same result as ->isSameMonth(now())->isSameYear(now()) per row, but
        // isSameMonth/isSameYear each construct and compare a Carbon instance
        // — at 1000+ completed reviews, two plain property reads instead of
        // two Carbon comparisons per row was noticeably cheaper.
        $thisMonth = now()->month;
        $thisYear = now()->year;
        $reviewedThisMonth = $completedReviews
            ->filter(fn (Review $review) => $review->reviewed_at->month === $thisMonth && $review->reviewed_at->year === $thisYear)
            ->count();

        $totalDecisions = $completedReviews->count();
        // 'returned' is plan/document vocabulary for a different flow — the
        // return rate only counts requirement/matrix rejections.
        $returnedDecisions = $completedReviews->whereIn('decision', ['rejected', 'needs_revision'])->count();

        $newRegistrations = $newRegistrationProjects->count();
        $plansPending = $plansPendingProjects->count();
        $matricesPending = $matricesPendingProjectIds->count();
        $documentsPending = $documentsPendingList->count();
        $returnedUnresolved = $returnedDocuments->count() + $returnedPlanProjects->count() + $returnedMatrixProjects->count();
        $closureSignoffs = $closureSignoffProjects->count();

        // Same $pending set as oldestWaitingDays above, but the full list
        // (not just the max per type) — oldest first, for a "what's been
        // sitting longest" queue table rather than a "what just came in" feed.
        $queueByAge = $pending
            ->filter(fn (array $item) => $item['submitted_at'] !== null)
            ->sortBy(fn (array $item) => Carbon::parse($item['submitted_at'])->timestamp)
            ->take(20)
            ->map(fn (array $item) => [
                'project' => $item['project'],
                'project_id' => $item['project_id'],
                'type' => $item['type'],
                'submitted_at' => Carbon::parse($item['submitted_at'])->toISOString(),
                'days_waiting' => self::daysSince($item['submitted_at']),
            ])
            ->values()
            ->all();

        return [
            'queue' => [
                'new_registrations' => $newRegistrations,
                'plans_pending' => $plansPending,
                'matrices_pending' => $matricesPending,
                'documents_pending' => $documentsPending,
                'returned_unresolved' => $returnedUnresolved,
                'closure_signoffs' => $closureSignoffs,
            ],
            'oldest_waiting_days' => $oldestWaitingDays,
            'queue_by_age' => $queueByAge,
            'awaiting_review' => $awaitingReview,
            'urgent' => [
                'overdue_reviews' => $overdueReviews,
                'returned_over_5_days' => $returnedOverFiveDays,
                'plans_due_today' => $plansDueToday,
            ],
            'upcoming' => [
                'due_today' => $dueTodayCount,
                'next_3_days' => $dueNext3Days,
                'next_7_days' => $dueNext7Days,
            ],
            'review_load' => $reviewLoad,
            'turnaround' => [
                'avg_review_days' => $turnaroundDays->isNotEmpty() ? round($turnaroundDays->avg(), 1) : 0,
                'reviewed_this_month' => $reviewedThisMonth,
                'returned' => $returnedDecisions,
                'backlog' => $newRegistrations + $plansPending + $matricesPending + $documentsPending + $returnedUnresolved + $closureSignoffs,
                'return_rate' => $totalDecisions > 0 ? round(($returnedDecisions / $totalDecisions) * 100, 1) : 0,
            ],
        ];
    }

    /**
     * Aggregates for the read-only ViewOnly dashboard at "/". Reuses
     * administratorDashboard() for the portfolio-wide numbers it needs
     * (status/phase counts, score, budget) and adds the requirement status
     * breakdown and flat project list unique to this view.
     */
    public static function viewOnlyDashboard(): array
    {
        $admin = self::administratorDashboard();

        $pendingRequirements = Requirement::where(function ($query) {
            $query->where('implementation_status', 'Pending')->orWhereNull('implementation_status');
        })->count();
        $ongoingRequirements = Requirement::where('implementation_status', 'Ongoing')->count();
        $completedRequirements = Requirement::where('implementation_status', 'Completed')->count();

        $projects = Project::orderBy('name')
            ->get(['id', 'name', 'category', 'phase', 'overall_implementation_score'])
            ->map(fn (Project $project) => [
                'id' => $project->id,
                'name' => $project->name,
                'category' => $project->category,
                'phase' => $project->phase,
                'overall_implementation_score' => $project->overall_implementation_score,
            ])
            ->values()
            ->all();

        return [
            'status_counts' => $admin['status_counts'],
            'phase_counts' => $admin['phase_counts'],
            'implementation_score_average' => $admin['implementation_score_average'],
            'uat_pass_rate' => $admin['uat_pass_rate'],
            'total_budget' => $admin['total_budget'],
            'requirement_status_counts' => [
                'pending' => $pendingRequirements,
                'ongoing' => $ongoingRequirements,
                'completed' => $completedRequirements,
            ],
            'projects' => $projects,
        ];
    }

    /**
     * Whole days between $since and $until (defaults to now), always
     * non-negative. Carbon 3 flipped diffInDays() to return a signed value
     * by default, which for a past $since gives a negative number —
     * computed via raw timestamps here so the result doesn't depend on
     * that default.
     */
    private static function daysSince($since, $until = null): int
    {
        $untilTimestamp = $until?->timestamp ?? now()->timestamp;

        return max(0, (int) floor(($untilTimestamp - $since->timestamp) / 86400));
    }
}
