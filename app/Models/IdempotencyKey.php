<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IdempotencyKey extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'key',
        'response_code',
        'response_body',
        'expires_at',
        'created_at',
    ];

    protected $casts = [
        'response_body' => 'array',
        'expires_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    /* ── Scopes ── */

    public function scopeExpired($query)
    {
        return $query->where('expires_at', '<', now());
    }

    /**
     * Check if a key has already been used (and not expired).
     */
    public static function exists(string $key): bool
    {
        return static::where('key', $key)
            ->where('expires_at', '>', now())
            ->exists();
    }
}
