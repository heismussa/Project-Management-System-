<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * Paginated, most-recent-first — this table grows on every login and
     * every document view, so unlike the rest of the app's list endpoints it
     * can't just return everything in one response. `per_page` is allowed up
     * to 5000 so the "export" button on the page can pull every row matching
     * the current filters in one call instead of paging through them.
     */
    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::with('user:id,name,email')->latest('created_at');

        if ($request->filled('action')) {
            $query->where('action', $request->string('action'));
        }

        if ($request->filled('search')) {
            $term = '%'.$request->string('search').'%';
            $query->where(function ($inner) use ($term) {
                $inner->where('description', 'like', $term)
                    ->orWhere('ip_address', 'like', $term)
                    ->orWhereHas('user', function ($userQuery) use ($term) {
                        $userQuery->where('name', 'like', $term)->orWhere('email', 'like', $term);
                    });
            });
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date('date_to'));
        }

        $perPage = min($request->integer('per_page', 25), 5000);
        $paginated = $query->paginate($perPage);

        $flaggedIds = $this->flaggedLoginFailureIds();
        $paginated->getCollection()->each(function (AuditLog $log) use ($flaggedIds) {
            $log->flagged = in_array($log->id, $flaggedIds, true);
        });

        return response()->json($paginated);
    }

    /**
     * "Flagged" = the 3rd or later failed login for the same account within
     * a 15-minute window — the actual signal someone's guessing a password,
     * as opposed to one person mistyping it once. Small table (only
     * login_failed rows), so one pass in PHP rather than a per-row subquery.
     */
    private function flaggedLoginFailureIds(): array
    {
        $failures = AuditLog::where('action', 'login_failed')
            ->whereNotNull('user_id')
            ->orderBy('user_id')
            ->orderBy('created_at')
            ->get(['id', 'user_id', 'created_at']);

        $flagged = [];

        foreach ($failures->groupBy('user_id') as $entries) {
            $window = [];
            foreach ($entries as $entry) {
                $window[] = $entry;
                $window = array_values(array_filter(
                    $window,
                    fn ($w) => abs($entry->created_at->diffInSeconds($w->created_at)) <= 900,
                ));
                if (count($window) >= 3) {
                    $flagged[] = $entry->id;
                }
            }
        }

        return $flagged;
    }
}
