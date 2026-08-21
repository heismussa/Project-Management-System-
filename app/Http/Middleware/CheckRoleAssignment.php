<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckRoleAssignment
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if ($user && $user->roles()->count() === 0) {
            if (!$request->is('unassigned') && !$request->is('logout')) {
                return redirect()->route('unassigned');
            }
        }

        return $next($request);
    }
}