<?php

use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Admin\ClusterController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\SessionController;
use App\Http\Controllers\Admin\AttendanceDetailController;
use App\Http\Controllers\StudentDashboardController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Guest Routes
|--------------------------------------------------------------------------
*/
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);
});

// Serve Service Worker and Manifest from root to bypass scope restrictions
Route::get('/service-worker.js', function () {
    return response()->file(public_path('build/service-worker.js'), [
        'Content-Type' => 'application/javascript',
        'Service-Worker-Allowed' => '/'
    ]);
})->name('service-worker');

Route::get('/manifest.webmanifest', function () {
    return response()->file(public_path('build/manifest.webmanifest'), [
        'Content-Type' => 'application/manifest+json'
    ]);
})->name('manifest');

Route::post('/logout', [AuthController::class, 'logout'])
    ->middleware('auth')
    ->name('logout');

/*
|--------------------------------------------------------------------------
| Redirect root based on role
|--------------------------------------------------------------------------
*/
Route::get('/', function () {
    if (auth()->check()) {
        return auth()->user()->isAdmin()
            ? redirect('/admin/dashboard')
            : redirect('/student/dashboard');
    }
    return redirect('/login');
});

/*
|--------------------------------------------------------------------------
| Student Routes
|--------------------------------------------------------------------------
*/
Route::middleware('auth')->prefix('student')->group(function () {
    Route::get('/dashboard', [StudentDashboardController::class, 'index'])->name('student.dashboard');
    Route::get('/attendance', [AttendanceController::class, 'index'])->name('student.attendance');
    Route::post('/attendance/sync', [AttendanceController::class, 'sync'])->name('student.attendance.sync')->middleware('throttle:attendance-sync');
});

/*
|--------------------------------------------------------------------------
| Admin Routes
|--------------------------------------------------------------------------
*/
Route::middleware('auth')->prefix('admin')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('admin.dashboard');

    // Cluster management
    Route::get('/clusters', [ClusterController::class, 'index'])->name('admin.clusters');
    Route::post('/clusters/{cluster}/toggle', [ClusterController::class, 'toggle'])->name('admin.clusters.toggle');
    Route::post('/clusters/batch-toggle', [ClusterController::class, 'batchToggle'])->name('admin.clusters.batch-toggle');

    // Session management
    Route::get('/sessions', [SessionController::class, 'index'])->name('admin.sessions');
    Route::post('/sessions', [SessionController::class, 'store'])->name('admin.sessions.store');
    Route::put('/sessions/{session}', [SessionController::class, 'update'])->name('admin.sessions.update');
    Route::delete('/sessions/{session}', [SessionController::class, 'destroy'])->name('admin.sessions.destroy');

    // Attendance detail per session
    Route::get('/sessions/{session}/attendances', [AttendanceDetailController::class, 'show'])->name('admin.sessions.attendances');
});
