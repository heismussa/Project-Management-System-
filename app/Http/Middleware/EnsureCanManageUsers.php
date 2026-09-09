<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCanManageUsers
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || !$user->hasPermissionTo('admin.manage_users')) {
            return response()->json([
                'message' => 'You are not authorized to manage users. Role assignment is limited to ICT Support.',
            ], 403);
        }

        return $next($request);
    }
}
