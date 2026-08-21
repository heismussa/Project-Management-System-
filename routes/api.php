<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\UserManagementController;
use App\Http\Controllers\RequirementController;
use App\Http\Controllers\ImplementationActivityController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\NotificationController;

// Public login route strictly allowed
Route::post('/login', [AuthController::class, 'login']);

// Current Authenticated User Info
Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Authenticated Routes
Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/users', [AuthController::class, 'users']);

    // Central Dashboard & Notifications
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/notifications', [NotificationController::class, 'index']);

    // User Administration (Person 1 Focus)
    Route::middleware('manage.users')->prefix('admin')->group(function () {
        Route::get('/users', [UserManagementController::class, 'index']);
        Route::post('/users', [UserManagementController::class, 'store']);
        Route::put('/users/{user}/roles', [UserManagementController::class, 'assignRole']);
        Route::get('/roles', [UserManagementController::class, 'roles']);
        
        // Password updates & toggle account status
        Route::post('/users/{id}/password', [UserManagementController::class, 'updatePassword']);
        Route::post('/users/{id}/toggle-status', [UserManagementController::class, 'toggleStatus']);
    });

    // Project Endpoints
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::get('/projects/{id}', [ProjectController::class, 'show']);
    Route::put('/projects/{id}/reassign', [ProjectController::class, 'reassign']);

    // Implementation & Activity Endpoints
    Route::get('/projects/{projectId}/activities', [ImplementationActivityController::class, 'index']);
    Route::post('/activities', [ImplementationActivityController::class, 'store']);
    Route::put('/activities/{id}', [ImplementationActivityController::class, 'update']);
    Route::delete('/activities/{id}', [ImplementationActivityController::class, 'destroy']);

    // Requirement Endpoints
    Route::get('/projects/{projectId}/requirements', [RequirementController::class, 'index']);
    Route::post('/requirements', [RequirementController::class, 'store']);
    Route::patch('/requirements/{id}/status', [RequirementController::class, 'updateStatus']);
    Route::get('/projects/{projectId}/progress', [RequirementController::class, 'getProgress']);
});