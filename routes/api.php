<?php

use App\Http\Controllers\HealthCheckController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
| Lightweight endpoints for Service Worker and connectivity checks.
*/

// Health check — no auth needed
Route::get('/health', HealthCheckController::class);
