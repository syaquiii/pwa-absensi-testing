<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AttendanceSession extends Model
{
    protected $fillable = [
        'title',
        'attendance_code',
        'session_date',
        'start_time',
        'end_time',
        'status',
        'allowed_clusters',
    ];

    protected $casts = [
        'session_date' => 'date',
        'allowed_clusters' => 'array',
    ];

    /* ── Relationships ── */

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    /* ── Scopes ── */

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeToday($query)
    {
        return $query->where('session_date', today());
    }

    /* ── Helpers ── */

    /**
     * Check if a given cluster is allowed for this session.
     */
    public function isClusterAllowed(int $clusterId): bool
    {
        // null = all clusters allowed
        if (is_null($this->allowed_clusters)) {
            return true;
        }

        return in_array($clusterId, $this->allowed_clusters);
    }
}
