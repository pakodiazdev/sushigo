<?php

/*
|--------------------------------------------------------------------------
| Public Demo environment (#635)
|--------------------------------------------------------------------------
|
| Only read when APP_ENV=demo — see App\Support\Demo\DemoSandbox and
| doc/conventions/ci/deployment.md → "Demo". Every other environment
| ignores this file entirely.
|
*/

return [

    /*
    | The public, least-privilege account visitors sign in with. Its email is
    | advertised by GET /api/v1/app-info; its password never is. The password
    | is intentionally shareable (it is published alongside the demo link), so
    | a fallback is acceptable here — unlike the operator accounts in
    | config/seeders.php, which DemoSeeder refuses to create with fallbacks.
    */
    'account' => [
        'email' => env('DEMO_ACCOUNT_EMAIL', 'demo@sushigo.com'),
        'first_name' => 'Demo',
        'last_name' => 'Visitor',
        'password' => env('SEEDER_DEMO_PASSWORD', 'demo123456'),
        'role' => 'demo-viewer',
    ],

    /*
    | Per-IP request budgets applied by App\Http\Middleware\DemoSandboxMiddleware.
    | `auth_per_minute` covers POST /auth/login only; `api_per_minute` covers
    | every other API request except the health probes the deploy relies on.
    */
    'rate_limits' => [
        'api_per_minute' => (int) env('DEMO_API_RATE_LIMIT', 120),
        'auth_per_minute' => (int) env('DEMO_AUTH_RATE_LIMIT', 10),
    ],

];
