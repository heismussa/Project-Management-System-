<?php

namespace App\Http\Middleware;

use App\Support\Roles;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks Project ViewOnly from mutating API resources.
 * GET requests still work so they can read Plan, Matrix, and Documents.
 */
class EnsureCanMutate
{
    public function handle(Request $request, Closure $next): Response
    {
        if (in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true)) {
            return $next($request);
        }

        $user = $request->user();
        if ($user && $user->hasRole('Project ViewOnly') && ! $user->hasRole(Roles::ADMINISTRATOR_ROLE)) {
            return response()->json([
                'message' => 'ViewOnly accounts cannot create, update, or delete records.',
            ], 403);
        }

        return $next($request);
    }
}
