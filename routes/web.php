<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// This app is an API-only backend with no HTML login page. Laravel's auth
// middleware falls back to route('login') for requests that don't ask for
// JSON, which throws a RouteNotFoundException (-> 500) if that named route
// is missing. Defining it avoids the crash for non-AJAX hits to protected
// endpoints (bots, health checks, browsers) and just returns a 401.
Route::get('/login', function () {
    return response()->json(['message' => 'Unauthenticated.'], 401);
})->name('login');
