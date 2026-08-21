<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;

// Public Access Lockdown: Restrict public routing strictly to /login
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);
});

// Authenticated Routes
Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    
    // Fallback view for accounts without roles to prevent infinite loops
    Route::get('/unassigned', function () {
        return view('errors.unassigned');
    })->name('unassigned');
});