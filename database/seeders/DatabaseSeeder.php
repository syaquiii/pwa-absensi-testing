<?php

namespace Database\Seeders;

use App\Models\AttendanceSession;
use App\Models\Cluster;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the database with demo data for prototyping.
     */
    public function run(): void
    {
        // Create 33 clusters
        $clusters = [];
        for ($i = 1; $i <= 33; $i++) {
            $clusters[] = Cluster::create([
                'name' => "Cluster $i",
                'code' => sprintf('CLR-%02d', $i),
                'is_active' => false,
                'sort_order' => $i,
            ]);
        }

        // Create admin user
        User::create([
            'name' => 'Admin',
            'email' => 'admin@absensi.test',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'cluster_id' => null,
            'is_active' => true,
        ]);

        // Create demo students (5 per cluster = 165 for quick testing)
        foreach ($clusters as $cluster) {
            for ($j = 1; $j <= 5; $j++) {
                User::create([
                    'name' => "Siswa {$cluster->code}-{$j}",
                    'email' => "siswa{$cluster->id}_{$j}@absensi.test",
                    'password' => Hash::make('password'),
                    'role' => 'student',
                    'cluster_id' => $cluster->id,
                    'is_active' => true,
                ]);
            }
        }

        // Create a demo session for today
        AttendanceSession::create([
            'title' => 'Pertemuan 1',
            'attendance_code' => 'ABC123',
            'session_date' => now()->toDateString(),
            'start_time' => '08:00',
            'end_time' => '17:00',
            'status' => 'active',
            'allowed_clusters' => null, // All clusters
        ]);
    }
}
