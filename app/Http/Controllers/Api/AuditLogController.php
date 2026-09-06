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
     * can't just return everything in one response.
     */
    public function index(Request $request): JsonResponse
    {
        $logs = AuditLog::with('user:id,name,email')
            ->latest('created_at')
            ->paginate(min($request->integer('per_page', 25), 100));

        return response()->json($logs);
    }
}
