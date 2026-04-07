<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Cache;

class Cluster extends Model
{
    protected $fillable = [
        'name',
        'code',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    /* ── Relationships ── */

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /* ── Scopes ── */

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }

    /* ── Cache helpers ── */

    /**
     * Get cached array of active cluster IDs.
     * Invalidated every time a cluster is toggled.
     */
    public static function getActiveIds(): array
    {
        return Cache::remember('active_cluster_ids', 30, function () {
            return static::active()->pluck('id')->toArray();
        });
    }

    /**
     * Flush the active cluster cache (call after toggle).
     */
    public static function flushActiveCache(): void
    {
        Cache::forget('active_cluster_ids');
    }
}
