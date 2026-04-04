<?php

namespace App\Http\Middleware;

use Carbon\Carbon;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware that allows setting Carbon's test time via X-Test-Time header.
 *
 * Only active in devtest, testing, or local environments.
 * This enables E2E tests to control server time for consistent test scenarios.
 *
 * Usage: Send header "X-Test-Time: 2026-04-02T14:30:00-06:00"
 */
class SetTestTimeMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $testTime = $request->header('X-Test-Time');

        if ($testTime && $this->isTestingEnvironment()) {
            // Parse and convert to UTC to avoid timezone pollution in Eloquent datetime casts.
            // When Carbon::setTestNow() receives a non-UTC Carbon instance, Eloquent will
            // hydrate datetime columns using that timezone, breaking our UTC-everywhere rule.
            $utcTestTime = Carbon::parse($testTime)->utc();
            Carbon::setTestNow($utcTestTime);
            Log::debug('[SetTestTime] Set Carbon test time to: '.$utcTestTime->toIso8601String());
        }

        return $next($request);
    }

    /**
     * Determine if the current environment allows test time manipulation.
     */
    protected function isTestingEnvironment(): bool
    {
        return in_array(app()->environment(), ['devtest', 'testing', 'local'], true);
    }
}
