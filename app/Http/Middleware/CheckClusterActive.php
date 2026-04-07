<?php

namespace App\Http\Middleware;

use App\Models\Cluster;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckClusterActive
{
    /**
     * Check if the authenticated user's cluster is currently active.
     * Uses cached active cluster IDs for fast lookups (no DB query per request).
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // Admin users bypass cluster check
        if ($user->isAdmin()) {
            return $next($request);
        }

        // User without a cluster cannot submit
        if (!$user->cluster_id) {
            return response()->json([
                'message' => 'Anda belum terdaftar di cluster manapun.',
                'code' => 'NO_CLUSTER',
            ], 403);
        }

        // Check against cached active cluster IDs
        $activeIds = Cluster::getActiveIds();

        if (!in_array($user->cluster_id, $activeIds)) {
            return response()->json([
                'message' => 'Cluster Anda belum diaktifkan untuk absensi.',
                'code' => 'CLUSTER_INACTIVE',
            ], 403);
        }

        return $next($request);
    }
}
