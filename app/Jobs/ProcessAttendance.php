<?php

namespace App\Jobs;

use App\Models\Attendance;
use App\Models\IdempotencyKey;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\RateLimited;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProcessAttendance implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public array $backoff = [5, 15, 60];

    /**
     * Apply job-level rate limiting so DB writes are capped at 50 per 5 seconds.
     * dontRelease() ensures throttled jobs don't consume retry attempts.
     */
    public function middleware(): array
    {
        return [
            (new RateLimited('attendance-processing'))->dontRelease(),
        ];
    }

    public function __construct(
        private readonly int $userId,
        private readonly int $sessionId,
        private readonly string $idempotencyKey,
        private readonly string $status,
        private readonly ?string $submittedAt,
        private readonly ?string $deviceInfo,
    ) {}

    public function handle(): void
    {
        DB::transaction(function () {
            // Skip if already processed
            if (IdempotencyKey::where('key', $this->idempotencyKey)->exists()) {
                Log::info('Attendance already processed, skipping', [
                    'key' => $this->idempotencyKey,
                ]);
                return;
            }

            $attendance = Attendance::updateOrCreate(
                [
                    'user_id' => $this->userId,
                    'attendance_session_id' => $this->sessionId,
                ],
                [
                    'idempotency_key' => $this->idempotencyKey,
                    'status' => $this->status,
                    'submitted_at' => $this->submittedAt,
                    'synced_at' => now(),
                    'device_info' => $this->deviceInfo,
                ]
            );

            IdempotencyKey::create([
                'key' => $this->idempotencyKey,
                'response_code' => 201,
                'response_body' => ['attendance_id' => $attendance->id],
                'expires_at' => now()->addHours(48),
                'created_at' => now(),
            ]);
        });
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('ProcessAttendance job failed permanently', [
            'user_id' => $this->userId,
            'session_id' => $this->sessionId,
            'key' => $this->idempotencyKey,
            'error' => $exception->getMessage(),
        ]);
    }
}
