<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attendance extends Model
{
    protected $fillable = [
        'user_id',
        'attendance_session_id',
        'idempotency_key',
        'status',
        'submitted_at',
        'synced_at',
        'was_offline',
        'device_info',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'synced_at' => 'datetime',
        'was_offline' => 'boolean',
    ];

    /* ── Relationships ── */

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function attendanceSession(): BelongsTo
    {
        return $this->belongsTo(AttendanceSession::class);
    }
}
