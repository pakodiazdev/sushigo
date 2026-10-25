<?php

use Illuminate\Support\Facades\Route;

// ── Test-only / dev-debug routes (never exposed in production) ───────────
// Extracted to routes/api/dev.php (#633, per TD-07) so prod-cloudrun's Docker
// build can physically remove that file. Unlike every other route group's
// unconditional require below, this one must stay conditional on both the
// environment() check AND file_exists() — prod-cloudrun's build removes
// routes/api/dev.php entirely, and an unconditional require would fatal
// `php artisan route:cache` at container boot.
if (app()->environment('testing', 'local', 'dev', 'devtest') && file_exists(__DIR__.'/api/dev.php')) {
    require __DIR__.'/api/dev.php';
}

// V1 API Routes — split by entity into routes/api/*.php to keep this group
// small (php:S138); each file registers its own routes under this prefix.
Route::prefix('v1')->group(function () {
    require __DIR__.'/api/health.php';
    require __DIR__.'/api/system.php';
    require __DIR__.'/api/auth.php';
    require __DIR__.'/api/units-of-measure.php';
    require __DIR__.'/api/items.php';
    require __DIR__.'/api/media.php';
    require __DIR__.'/api/inventory.php';
    require __DIR__.'/api/product-catalog.php';
    require __DIR__.'/api/suppliers.php';
    require __DIR__.'/api/receipts.php';
    require __DIR__.'/api/stock-transfers.php';
    require __DIR__.'/api/employees.php';
    require __DIR__.'/api/attendance.php';
    require __DIR__.'/api/vacation-holidays.php';
    require __DIR__.'/api/cash-adjustments.php';
    require __DIR__.'/api/dishes.php';
    require __DIR__.'/api/pricing.php';
});
