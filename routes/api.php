<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\UserManagementController;
use App\Http\Controllers\RequirementController;
use App\Http\Controllers\ImplementationActivityController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
    ->middleware(['signed'])
    ->name('verification.verify');

Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/email/verification-notification', [AuthController::class, 'resendVerification'])
        ->middleware(['throttle:6,1'])
        ->name('verification.send');
});

Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/users', [AuthController::class, 'users']);

    Route::middleware('manage.users')->prefix('admin')->group(function () {
        Route::get('/users', [UserManagementController::class, 'index']);
        Route::post('/users', [UserManagementController::class, 'store']);
        Route::put('/users/{user}/roles', [UserManagementController::class, 'syncRoles']);
        Route::get('/roles', [UserManagementController::class, 'roles']);
    });

    Route::post('/projects', [ProjectController::class, 'store']);
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::get('/projects/{id}', [ProjectController::class, 'show'])->whereNumber('id');
    Route::put('/projects/{id}/reassign', [ProjectController::class, 'reassign'])->whereNumber('id');

    Route::get('/projects/{projectId}/activities', [ImplementationActivityController::class, 'index']);
    Route::post('/activities', [ImplementationActivityController::class, 'store']);
    Route::put('/activities/{id}', [ImplementationActivityController::class, 'update']);
    Route::delete('/activities/{id}', [ImplementationActivityController::class, 'destroy']);

    Route::get('/projects/{projectId}/requirements', [RequirementController::class, 'index']);
    Route::post('/requirements', [RequirementController::class, 'store']);
    Route::patch('/requirements/{id}/status', [RequirementController::class, 'updateStatus']);
    Route::get('/projects/{project}/progress', [RequirementController::class, 'getProjectProgress']);
});
