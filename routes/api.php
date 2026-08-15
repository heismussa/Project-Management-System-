<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

use App\Http\Controllers\RequirementController;
use App\Http\Controllers\ImplementationActivityController;

// SRS Traceability Matrix Routes
Route::get('/projects/{projectId}/requirements', [RequirementController::class, 'index']);
Route::post('/requirements', [RequirementController::class, 'store']);
Route::patch('/requirements/{id}/status', [RequirementController::class, 'updateStatus']);
