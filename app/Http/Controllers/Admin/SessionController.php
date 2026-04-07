<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AttendanceSession;
use App\Models\Cluster;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SessionController extends Controller
{
    public function index()
    {
        $sessions = AttendanceSession::latest('session_date')
            ->withCount('attendances')
            ->paginate(20);

        return Inertia::render('Admin/Sessions', [
            'sessions' => $sessions,
        ]);
    }

    public function store(Request $request)
    {
        $request->merge([
            'attendance_code' => strtoupper($request->attendance_code)
        ]);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'attendance_code' => [
                'required', 
                'string', 
                'max:6', 
                'alpha_num',
                Rule::unique('attendance_sessions')->where(function ($query) use ($request) {
                    return $query->where('session_date', $request->session_date);
                })
            ],
            'session_date' => ['required', 'date'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'status' => ['required', 'in:scheduled,active,closed'],
        ]);

        AttendanceSession::create($validated);

        return back()->with('success', 'Session berhasil dibuat');
    }

    public function update(Request $request, AttendanceSession $session)
    {
        if ($request->has('attendance_code')) {
            $request->merge([
                'attendance_code' => strtoupper($request->attendance_code)
            ]);
        }

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'attendance_code' => [
                'sometimes', 
                'string', 
                'max:6', 
                'alpha_num',
                Rule::unique('attendance_sessions')->where(function ($query) use ($request) {
                    return $query->where('session_date', $request->session_date ?? AttendanceSession::find($request->route('session'))->session_date);
                })->ignore($session->id)
            ],
            'session_date' => ['sometimes', 'date'],
            'start_time' => ['sometimes', 'date_format:H:i'],
            'end_time' => ['sometimes', 'date_format:H:i'],
            'status' => ['sometimes', 'in:scheduled,active,closed'],
        ]);

        $session->update($validated);

        return back()->with('success', 'Session berhasil diupdate');
    }

    public function destroy(AttendanceSession $session)
    {
        $session->delete();

        return back()->with('success', 'Session berhasil dihapus');
    }
}
