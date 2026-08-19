<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProjectController;
use Illuminate\Support\Facades\Route;

// Public Authentication Routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Signed Email Verification Link (clicked from the email)
Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
    ->middleware(['signed'])
    ->name('verification.verify');

// Authenticated Routes (Requires Sanctum Token)
Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    // Resend Email Verification Notification
    Route::post('/email/verification-notification', [AuthController::class, 'resendVerification'])
        ->middleware(['throttle:6,1'])
        ->name('verification.send');
});

// Fully Protected Routes (Requires Sanctum Token AND Email Verification)
Route::middleware(['auth:sanctum', 'verified'])->group(function () {
    Route::get('/me', [AuthController::class, 'me']);

    // Process 1: Project Initiation Routes
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::get('/projects/{id}', [ProjectController::class, 'show']);
    Route::put('/projects/{id}/reassign', [ProjectController::class, 'reassign']);
});