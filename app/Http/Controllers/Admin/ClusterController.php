<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Cluster;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ClusterController extends Controller
{
    /**
     * Display all clusters with toggle controls.
     */
    public function index()
    {
        $clusters = Cluster::ordered()
            ->withCount([
                'users' => fn ($q) => $q->where('is_active', true),
            ])
            ->get();

        // Get today's attendance count per cluster
        $todaySession = AttendanceSession::active()->today()->first();
        $attendanceCounts = [];

        if ($todaySession) {
            $attendanceCounts = Attendance::where('attendance_session_id', $todaySession->id)
                ->join('users', 'attendances.user_id', '=', 'users.id')
                ->selectRaw('users.cluster_id, COUNT(*) as count')
                ->groupBy('users.cluster_id')
                ->pluck('count', 'cluster_id')
                ->toArray();
        }

        return Inertia::render('Admin/Clusters', [
            'clusters' => $clusters,
            'attendanceCounts' => $attendanceCounts,
            'activeSession' => $todaySession?->only('id', 'title', 'status'),
        ]);
    }

    /**
     * Toggle a single cluster's active status.
     */
    public function toggle(Request $request, Cluster $cluster)
    {
        $cluster->update([
            'is_active' => !$cluster->is_active,
        ]);

        Cluster::flushActiveCache();

        return back()->with('success', "Cluster {$cluster->name} " . ($cluster->is_active ? 'diaktifkan' : 'dinonaktifkan'));
    }

    /**
     * Batch toggle multiple clusters.
     */
    public function batchToggle(Request $request)
    {
        $request->validate([
            'cluster_ids' => ['required', 'array'],
            'cluster_ids.*' => ['integer', 'exists:clusters,id'],
            'is_active' => ['required', 'boolean'],
        ]);

        Cluster::whereIn('id', $request->input('cluster_ids'))
            ->update(['is_active' => $request->boolean('is_active')]);

        Cluster::flushActiveCache();

        $action = $request->boolean('is_active') ? 'diaktifkan' : 'dinonaktifkan';
        $count = count($request->input('cluster_ids'));

        return back()->with('success', "{$count} cluster berhasil {$action}");
    }
}
