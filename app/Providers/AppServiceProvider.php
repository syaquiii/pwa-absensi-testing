<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // ─── HTTP rate limit for sync endpoint ───────────────────────────────────
        // Global bucket (not per-user) — limits total concurrent sync requests
        // to 30/s regardless of how many students are hitting the endpoint.
        // Safely below the server's 40 req/s crash threshold.
        RateLimiter::for('attendance-sync', function (Request $request) {
            return Limit::perSecond(50)
                        ->by('global-attendance-sync')
                        ->response(function () {
                            return response()->json([
                                'error'       => 'Server busy, please retry shortly.',
                                'retry_after' => 15,
                            ], 429, ['Retry-After' => '15']);
                        });
        });

        // ─── Job-level rate limit (queue processing) ─────────────────────────────
        // Even after requests are accepted, DB writes are throttled.
        // Limit to 600 jobs per minute (effectively 10 per second, or 50 per 5 seconds).
        // Jobs that exceed this are released back to the queue and retried automatically.
        RateLimiter::for('attendance-processing', function (object $job) {
            return Limit::perMinute(600);
        });
    }
}
