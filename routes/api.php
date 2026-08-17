<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\RequirementController;
use App\Http\Controllers\ImplementationActivityController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');


// SRS Traceability Matrix Routes
Route::get('/projects/{projectId}/requirements', [RequirementController::class, 'index']);
Route::post('/requirements', [RequirementController::class, 'store']);
Route::patch('/requirements/{id}/status', [RequirementController::class, 'updateStatus']);
Route::get('/projects/{project}/progress', [RequirementController::class, 'getProjectProgress']);


// Public Authentication Route
Route::post('/login', [AuthController::class, 'login']);

// Protected API Routes (Requires Sanctum Token)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Process 1: Project Initiation Routes
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::get('/projects', [ProjectController::class, 'index']);
});
