<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('attendance_code', 6)->comment('Unique code per session, alphanumeric, max 6 chars');
            $table->date('session_date');
            $table->time('start_time');
            $table->time('end_time');
            $table->enum('status', ['scheduled', 'active', 'closed'])->default('scheduled');
            $table->json('allowed_clusters')->nullable()->comment('Array of cluster IDs, null = all clusters');
            $table->timestamps();

            $table->unique(['attendance_code', 'session_date'], 'idx_code_date_unique');
            $table->index(['session_date', 'status']);
        });

        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('attendance_session_id')->constrained('attendance_sessions')->cascadeOnDelete();
            $table->char('idempotency_key', 36)->unique();
            $table->enum('status', ['present', 'late', 'absent'])->default('present');
            $table->timestamp('submitted_at')->nullable()->comment('Client device timestamp');
            $table->timestamp('synced_at')->nullable()->comment('Server received timestamp');
            $table->boolean('was_offline')->default(false)->comment('Was submitted while offline');
            $table->string('device_info')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'attendance_session_id'], 'idx_user_session_unique');
            $table->index(['attendance_session_id', 'status']);
        });

        Schema::create('idempotency_keys', function (Blueprint $table) {
            $table->id();
            $table->char('key', 36)->unique();
            $table->smallInteger('response_code');
            $table->json('response_body')->nullable();
            $table->timestamp('expires_at');
            $table->timestamp('created_at')->useCurrent();

            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('idempotency_keys');
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('attendance_sessions');
    }
};
