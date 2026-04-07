<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\Cluster;
use App\Models\User;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $totalStudents = User::where('role', 'student')->where('is_active', true)->count();
        $totalClusters = Cluster::count();
        $activeClusters = Cluster::where('is_active', true)->count();

        $todaySession = AttendanceSession::active()->today()->first();
        $todayAttendanceCount = 0;

        if ($todaySession) {
            $todayAttendanceCount = Attendance::where('attendance_session_id', $todaySession->id)->count();
        }

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'totalStudents' => $totalStudents,
                'totalClusters' => $totalClusters,
                'activeClusters' => $activeClusters,
                'todayAttendanceCount' => $todayAttendanceCount,
                'todaySession' => $todaySession?->only('id', 'title', 'status', 'session_date'),
            ],
        ]);
    }
}
