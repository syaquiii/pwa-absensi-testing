<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\AttendanceSession;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StudentDashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $activeSession = AttendanceSession::active()->today()->first();

        $recentAttendances = Attendance::where('user_id', $user->id)
            ->with('attendanceSession:id,title,session_date')
            ->latest('submitted_at')
            ->take(10)
            ->get(['id', 'attendance_session_id', 'status', 'submitted_at', 'synced_at']);

        return Inertia::render('Student/Dashboard', [
            'cluster' => $user->cluster?->only('id', 'name', 'is_active'),
            'activeSession' => $activeSession?->only('id', 'title', 'session_date', 'start_time', 'end_time'),
            'recentAttendances' => $recentAttendances,
        ]);
    }
}
