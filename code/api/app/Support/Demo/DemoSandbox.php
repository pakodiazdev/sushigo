<?php

namespace App\Support\Demo;

use Illuminate\Support\Facades\Http;

/**
 * Side-effect sandbox for the public Demo environment (#635).
 *
 * Demo is the most exposed surface (TD-07): anyone on the internet can sign in
 * with the published demo account. Nothing done there may reach a real person
 * or system, so outbound channels are neutralized in code rather than relying
 * on each deploy remembering the right MAIL_* / webhook configuration.
 */
final class DemoSandbox
{
    public const ENVIRONMENT = 'demo';

    public const BLOCKED_MESSAGE = 'This action is disabled in the SushiGo public demo.';

    /**
     * Route names visitors must never reach in Demo: they create accounts or
     * change credentials, which would let one visitor lock others out of the
     * shared demo account or turn Demo into a free account host.
     */
    public const BLOCKED_ROUTES = [
        'auth.register',
        'auth.forgot-password',
        'auth.verify-reset-token',
        'auth.reset-password',
        'auth.me.avatar',
    ];

    /**
     * Route names exempt from the Demo rate limit — the deploy pipeline's
     * candidate-revision probes must never be throttled into a false failure.
     */
    public const UNTHROTTLED_ROUTES = [
        'health',
        'health.ready',
    ];

    public static function isActive(): bool
    {
        return app()->environment(self::ENVIRONMENT);
    }

    /**
     * Mail is forced to the log driver (email is the only channel that can
     * reach a real person today — WhatsAppService already only logs), and every
     * outbound HTTP call through the Http client throws instead of leaving the
     * container, covering any future webhook/integration by default.
     */
    public static function apply(): void
    {
        config(['mail.default' => 'log']);
        Http::preventStrayRequests();
    }
}
