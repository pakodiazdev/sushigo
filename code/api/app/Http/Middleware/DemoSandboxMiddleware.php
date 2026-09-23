<?php

namespace App\Http\Middleware;

use App\Support\Demo\DemoSandbox;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

/**
 * Low-cost public-abuse controls for the Demo environment (#635): blocks the
 * account-mutation routes listed in DemoSandbox::BLOCKED_ROUTES and applies a
 * per-IP request budget (stricter for login). A no-op in every other
 * environment, so it is safe to register globally on the api group.
 */
class DemoSandboxMiddleware
{
    private const DECAY_SECONDS = 60;

    public function handle(Request $request, Closure $next): Response
    {
        if (! DemoSandbox::isActive()) {
            return $next($request);
        }

        $routeName = $request->route()?->getName();

        if (in_array($routeName, DemoSandbox::BLOCKED_ROUTES, true)) {
            return response()->json(['message' => DemoSandbox::BLOCKED_MESSAGE], Response::HTTP_FORBIDDEN);
        }

        if (in_array($routeName, DemoSandbox::UNTHROTTLED_ROUTES, true)) {
            return $next($request);
        }

        [$bucket, $limit] = $routeName === 'auth.login'
            ? ['demo-auth', (int) config('demo.rate_limits.auth_per_minute')]
            : ['demo-api', (int) config('demo.rate_limits.api_per_minute')];

        $key = $bucket.'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($key, $limit)) {
            return response()->json(
                ['message' => 'Too many requests to the SushiGo public demo. Please slow down.'],
                Response::HTTP_TOO_MANY_REQUESTS,
                ['Retry-After' => (string) RateLimiter::availableIn($key)]
            );
        }

        RateLimiter::hit($key, self::DECAY_SECONDS);

        return $next($request);
    }
}
