<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\DocumentController;
use Illuminate\Support\Facades\Route;

// Public Authentication Routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Signed Email Verification Link
Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
    ->middleware(['signed'])
    ->name('verification.verify');

// Authenticated Routes
Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::post('/email/verification-notification', [AuthController::class, 'resendVerification'])
        ->middleware(['throttle:6,1'])
        ->name('verification.send');
});

// Fully Protected Routes
Route::middleware(['auth:sanctum', 'verified'])->group(function () {
    Route::get('/me', [AuthController::class, 'me']);

    // Project Initiation Routes
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::get('/projects/{id}', [ProjectController::class, 'show']);
    Route::put('/projects/{id}/reassign', [ProjectController::class, 'reassign']);

    // Document Management Routes
    Route::get('/documents', [DocumentController::class, 'index']);
    Route::post('/documents', [DocumentController::class, 'store']);
    Route::get('/documents/{document}', [DocumentController::class, 'show']);
    Route::get('/documents/{document}/stream', [DocumentController::class, 'stream']);
    Route::put('/documents/{document}', [DocumentController::class, 'update']);
    Route::patch('/documents/{document}', [DocumentController::class, 'update']);
    Route::delete('/documents/{document}', [DocumentController::class, 'destroy']);
});