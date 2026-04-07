<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\Cluster;
use App\Models\User;
use Inertia\Inertia;

class AttendanceDetailController extends Controller
{
    public function show(AttendanceSession $session)
    {
        // Get all attendances for this session with user + cluster info
        $attendances = Attendance::where('attendance_session_id', $session->id)
            ->with(['user:id,name,email,cluster_id', 'user.cluster:id,name,code'])
            ->orderBy('synced_at', 'desc')
            ->get()
            ->map(function ($att) {
                $submittedAt = $att->submitted_at;
                $syncedAt = $att->synced_at;

                return [
                    'id' => $att->id,
                    'user_name' => $att->user->name,
                    'user_email' => $att->user->email,
                    'cluster_name' => $att->user->cluster?->name ?? '-',
                    'cluster_code' => $att->user->cluster?->code ?? '-',
                    'status' => $att->status,
                    'submitted_at' => $att->submitted_at?->toISOString(),
                    'synced_at' => $att->synced_at?->toISOString(),
                    'sync_mode' => $att->was_offline ? 'offline' : 'online',
                    'sync_delay' => $submittedAt && $syncedAt
                        ? $syncedAt->diffInSeconds($submittedAt)
                        : 0,
                ];
            });

        // Calculate stats per cluster
        $clusters = Cluster::ordered()->withCount([
            'users' => fn ($q) => $q->where('is_active', true)->where('role', 'student'),
        ])->get();

        $clusterStats = $clusters->map(function ($cluster) use ($attendances) {
            $clusterAttendances = $attendances->where('cluster_code', $cluster->code);
            $attendedCount = $clusterAttendances->count();
            $totalStudents = $cluster->users_count;
            $percentage = $totalStudents > 0 ? round(($attendedCount / $totalStudents) * 100, 1) : 0;
            $offlineCount = $clusterAttendances->where('sync_mode', 'offline')->count();
            $onlineCount = $clusterAttendances->where('sync_mode', 'online')->count();

            return [
                'cluster_name' => $cluster->name,
                'cluster_code' => $cluster->code,
                'total_students' => $totalStudents,
                'attended' => $attendedCount,
                'percentage' => $percentage,
                'online_count' => $onlineCount,
                'offline_count' => $offlineCount,
            ];
        });

        // Overall stats
        $totalStudents = User::where('role', 'student')->where('is_active', true)->count();
        $totalAttended = $attendances->count();
        $overallPercentage = $totalStudents > 0 ? round(($totalAttended / $totalStudents) * 100, 1) : 0;
        $totalOffline = $attendances->where('sync_mode', 'offline')->count();
        $totalOnline = $attendances->where('sync_mode', 'online')->count();

        return Inertia::render('Admin/AttendanceDetail', [
            'session' => $session->only('id', 'title', 'attendance_code', 'session_date', 'start_time', 'end_time', 'status'),
            'attendances' => $attendances->values(),
            'clusterStats' => $clusterStats->values(),
            'overallStats' => [
                'totalStudents' => $totalStudents,
                'totalAttended' => $totalAttended,
                'percentage' => $overallPercentage,
                'onlineCount' => $totalOnline,
                'offlineCount' => $totalOffline,
            ],
        ]);
    }
}
