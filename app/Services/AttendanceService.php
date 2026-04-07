<?php

namespace App\Services;

use App\Jobs\ProcessAttendance;
use App\Models\IdempotencyKey;
use Illuminate\Support\Facades\Log;

class AttendanceService
{
    /**
     * Accept a batch of attendance submissions and dispatch each to the queue.
     *
     * Returns immediately with 'queued' or 'duplicate' per item — the actual
     * DB write happens asynchronously via ProcessAttendance job.
     */
    public function syncBatch(array $items, int $userId): array
    {
        $results = [];

        foreach ($items as $item) {
            $key = $item['idempotency_key'] ?? null;

            if (!$key) {
                $results[] = ['key' => 'unknown', 'result' => 'error', 'message' => 'Missing idempotency key'];
                continue;
            }

            // Lightweight duplicate check before dispatching — avoids double-queuing
            if (IdempotencyKey::where('key', $key)->where('expires_at', '>', now())->exists()) {
                $results[] = ['key' => $key, 'result' => 'duplicate'];
                continue;
            }

            try {
                // Dispatch to dedicated 'attendance' queue — does not block HTTP thread
                ProcessAttendance::dispatch(
                    userId:         $userId,
                    sessionId:      (int) $item['session_id'],
                    idempotencyKey: $key,
                    status:         $item['status'] ?? 'present',
                    submittedAt:    $item['submitted_at'] ?? null,
                    deviceInfo:     $item['device_info'] ?? null,
                )->onQueue('attendance');

                $results[] = ['key' => $key, 'result' => 'queued'];
            } catch (\Throwable $e) {
                Log::error('Failed to dispatch attendance job', [
                    'user_id' => $userId,
                    'key'     => $key,
                    'error'   => $e->getMessage(),
                ]);
                $results[] = ['key' => $key, 'result' => 'error', 'message' => 'Dispatch failed'];
            }
        }

        return $results;
    }
}
