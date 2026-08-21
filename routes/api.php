<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\UserManagementController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\RequirementController;
use App\Http\Controllers\ImplementationActivityController;
use App\Http\Controllers\DocumentController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/login', [AuthController::class, 'login']);

Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/users', [AuthController::class, 'users']);
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/notifications', [NotificationController::class, 'index']);

    Route::middleware('manage.users')->prefix('admin')->group(function () {
        Route::get('/users', [UserManagementController::class, 'index']);
        Route::post('/users', [UserManagementController::class, 'store']);
        Route::put('/users/{user}/roles', [UserManagementController::class, 'syncRoles']);
        Route::get('/roles', [UserManagementController::class, 'roles']);
        Route::post('/users/{user}/password', [UserManagementController::class, 'updatePassword']);
        Route::post('/users/{user}/toggle-status', [UserManagementController::class, 'toggleStatus']);
    });

    Route::post('/projects', [ProjectController::class, 'store']);
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::get('/projects/{project}', [ProjectController::class, 'show']);
    Route::put('/projects/{project}/reassign', [ProjectController::class, 'reassign']);
    Route::get('/projects/{project}/workflow', [ProjectController::class, 'workflow']);
    Route::get('/projects/{project}/reviews', [ProjectController::class, 'reviews']);
    Route::post('/projects/{project}/plan/submit', [ProjectController::class, 'submitPlan']);
    Route::post('/projects/{project}/plan/review', [ProjectController::class, 'reviewPlan']);
    Route::post('/projects/{project}/recommend', [ProjectController::class, 'recommend']);
    Route::post('/projects/{project}/approve-execution', [ProjectController::class, 'approveExecution']);
    Route::get('/projects/{project}/closure-readiness', [ProjectController::class, 'closureReadiness']);
    Route::post('/projects/{project}/close', [ProjectController::class, 'close']);

    Route::get('/projects/{projectId}/activities', [ImplementationActivityController::class, 'index']);
    Route::post('/activities', [ImplementationActivityController::class, 'store']);
    Route::put('/activities/{id}', [ImplementationActivityController::class, 'update']);
    Route::delete('/activities/{id}', [ImplementationActivityController::class, 'destroy']);
    Route::get('/activities/{id}/progress', [ImplementationActivityController::class, 'progressHistory']);
    Route::post('/activities/{id}/plan-changes/approve', [ImplementationActivityController::class, 'approvePlanChange']);
    Route::post('/activities/{id}/plan-changes/reject', [ImplementationActivityController::class, 'rejectPlanChange']);

    Route::get('/projects/{projectId}/requirements', [RequirementController::class, 'index']);
    Route::post('/requirements', [RequirementController::class, 'store']);
    Route::patch('/requirements/{id}/status', [RequirementController::class, 'updateStatus']);
    Route::patch('/requirements/{id}/review', [RequirementController::class, 'review']);
    Route::post('/projects/{projectId}/matrix/return', [RequirementController::class, 'returnMatrix']);
    Route::get('/projects/{project}/progress', [RequirementController::class, 'getProjectProgress']);

    Route::get('/projects/{projectId}/documents', [DocumentController::class, 'index']);
    Route::post('/documents', [DocumentController::class, 'store']);
    Route::get('/documents/{document}/file', [DocumentController::class, 'file']);
    Route::post('/documents/{document}/review', [DocumentController::class, 'review']);
    Route::delete('/documents/{document}', [DocumentController::class, 'destroy']);
});
