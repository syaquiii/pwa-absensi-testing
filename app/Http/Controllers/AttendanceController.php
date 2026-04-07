<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Services\AttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AttendanceController extends Controller
{
    public function __construct(
        private readonly AttendanceService $attendanceService,
    ) {}

    /**
     * Show the student attendance page with active sessions.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $sessions = AttendanceSession::active()
            ->today()
            ->select('id', 'title', 'session_date', 'start_time', 'end_time', 'status', 'allowed_clusters', 'attendance_code')
            ->get()
            ->filter(fn ($session) => $session->isClusterAllowed($user->cluster_id))
            ->map(function ($session) {
                // Return generic object with cryptographically hashed code for safe offline validation
                return [
                    'id' => $session->id,
                    'title' => $session->title,
                    'session_date' => $session->session_date,
                    'start_time' => $session->start_time,
                    'end_time' => $session->end_time,
                    'status' => $session->status,
                    'hashed_code' => hash('sha256', strtoupper($session->attendance_code)),
                ];
            })
            ->values();

        // Get user's existing attendances for today's sessions
        $existingAttendances = Attendance::where('user_id', $user->id)
            ->whereIn('attendance_session_id', $sessions->pluck('id'))
            ->select('attendance_session_id', 'status', 'synced_at', 'idempotency_key')
            ->get()
            ->keyBy('attendance_session_id');

        return Inertia::render('Student/Attendance', [
            'sessions' => $sessions,
            'existingAttendances' => $existingAttendances,
            'cluster' => $user->cluster?->only('id', 'name', 'is_active'),
        ]);
    }

    /**
     * Sync batch attendance submissions from client (via Background Sync or manual).
     */
    public function sync(Request $request): JsonResponse
    {
        $request->validate([
            'items' => ['required', 'array', 'max:50'],
            'items.*.idempotency_key' => ['required', 'string', 'size:36'],
            'items.*.session_id' => ['required', 'integer', 'exists:attendance_sessions,id'],
            'items.*.attendance_code' => ['required', 'string', 'max:6'],
            'items.*.status' => ['required', 'in:present,late,absent'],
            'items.*.submitted_at' => ['nullable', 'string'],
            'items.*.device_info' => ['nullable', 'string', 'max:500'],
        ]);

        $results = $this->attendanceService->syncBatch(
            $request->input('items'),
            $request->user()->id
        );

        return response()->json([
            'success'   => true,
            'results'   => $results,
            'synced_at' => now()->toISOString(),
        ], 202); // 202 Accepted — items dispatched to queue, not yet written to DB
    }
}
