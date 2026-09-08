<?php

namespace App\Http\Middleware;

use App\Models\AuditLog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Every 403 an authenticated user hits — wrong role, wrong permission, not
 * their own project — gets recorded, regardless of which check inside the
 * route actually rejected it. Sits outermost on the auth:sanctum group so
 * it sees the final response after any nested middleware (can.mutate,
 * manage.users) or an in-controller check has already run.
 */
class LogFailedAuthorization
{
    /**
     * Longest/most specific prefix first — a plain area name reads far
     * better on the audit log than the raw route ("User management" instead
     * of "GET /api/admin/audit-logs"), which is meant for a business
     * audience, not a developer console.
     */
    private const AREA_LABELS = [
        'api/admin/audit-logs' => 'Audit log',
        'api/admin' => 'User management',
        'api/documents' => 'Documents',
        'api/activities' => 'Activities',
        'api/requirements' => 'Requirements',
        'api/projects' => 'Project data',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($response->getStatusCode() === 403 && $request->user()) {
            $body = json_decode($response->getContent() ?: '', true);
            $reason = is_array($body) ? ($body['message'] ?? null) : null;
            $area = $this->areaFor($request->path());

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'access_denied',
                'description' => trim($area.($reason ? " — {$reason}" : '')),
                'ip_address' => $request->ip(),
            ]);
        }

        return $response;
    }

    private function areaFor(string $path): string
    {
        $path = trim($path, '/');

        foreach (self::AREA_LABELS as $prefix => $label) {
            if (str_starts_with($path, $prefix)) {
                return $label;
            }
        }

        return 'Restricted area';
    }
}
