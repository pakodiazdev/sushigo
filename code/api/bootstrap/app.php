<?php

use App\Http\Middleware\DemoSandboxMiddleware;
use App\Http\Middleware\SetTestTimeMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api',
        commands: __DIR__.'/../routes/console.php',
        health: 'api/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // DemoSandboxMiddleware (#635, no-op unless APP_ENV=demo) is prepended so a
        // blocked route is refused before route-model binding runs — the 403 never
        // depends on (or reveals) whether the bound record exists.
        $middleware->api(prepend: [
            SetTestTimeMiddleware::class,
            \Illuminate\Http\Middleware\HandleCors::class,
            DemoSandboxMiddleware::class,
        ]);

        // Trust all proxies (nginx reverse proxy)
        $middleware->trustProxies(
            at: '*',
            headers: Illuminate\Http\Request::HEADER_X_FORWARDED_FOR |
                Illuminate\Http\Request::HEADER_X_FORWARDED_HOST |
                Illuminate\Http\Request::HEADER_X_FORWARDED_PORT |
                Illuminate\Http\Request::HEADER_X_FORWARDED_PROTO
        );

        $middleware->alias([
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
