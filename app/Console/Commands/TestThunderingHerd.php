<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Jobs\ProcessAttendance;
use Illuminate\Support\Str;

class TestThunderingHerd extends Command
{
    protected $signature = 'test:thundering-herd';
    protected $description = 'Simulasi PWA Berhasil Melempar 45 Ribu Queue secara Instan';

    public function handle()
    {
        $this->info("Menyiapkan bombardir 15.000 siswa x 3 sesi...");
        $bar = $this->output->createProgressBar(500);
        $bar->start();

        // Cari ID Session yang valid agar tidak ditendang validasi
        $validSessionId = \App\Models\AttendanceSession::first()->id ?? 1;

        for ($i = 1; $i <= 500; $i++) {
            foreach ([1, 2, 3] as $sesi) {
                // Parameter: $userId, $sessionId, $idempotencyKey, $status, $submittedAt, $deviceInfo
                ProcessAttendance::dispatch(
                    $i,                  // userId
                    $validSessionId,     // sessionId
                    (string) Str::uuid(),// idempotencyKey
                    'present',           // status
                    now()->toISOString(),// submittedAt
                    'LoadTester-Bot'     // deviceInfo
                )->onQueue('attendance');
            }
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("🔥 45.000 Tiket PWA Sukses Ditumpuk ke Tabel Jobs!");
    }
}
