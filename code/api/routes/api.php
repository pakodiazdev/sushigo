<?php

use App\Contracts\PasswordResetTokenRecorder;
use App\Http\Controllers\Api\V1\Dev\DevLoginController;
use App\Http\Controllers\Api\V1\Dev\ListDevUsersController;
use App\Http\Controllers\Api\V1\Devtools\GetClockController;
use App\Http\Controllers\Api\V1\Devtools\ResetClockController;
use App\Http\Controllers\Api\V1\Devtools\SeedPayrollController;
use App\Http\Controllers\Api\V1\Devtools\SetClockController;
use App\Http\Controllers\Api\V1\Devtools\ShiftClockController;
use Illuminate\Support\Facades\Route;

// ── Test-only routes (never exposed in production) ───────────────────────
if (app()->environment('testing', 'local', 'dev', 'devtest')) {
    Route::prefix('v1/test')->name('test.')->group(function () {
        Route::get('reset-link/{email}', function (string $email) {
            $recorder = app(PasswordResetTokenRecorder::class);
            $link = $recorder->retrieve($email);

            if (! $link) {
                return response()->json(['link' => null], 404);
            }

            return response()->json(['link' => $link]);
        })->name('reset-link');
    });

    // ── Dev debug login routes ────────────────────────────────────────────
    Route::prefix('v1/dev')->name('dev.')->group(function () {
        Route::get('users', ListDevUsersController::class)->name('users');
        Route::post('login', DevLoginController::class)->name('login');
    });

    // ── Devtools clock simulation routes ──────────────────────────────────
    // Protected by ClockSimulationGuard (env check + feature flag)
    Route::prefix('v1/devtools/clock')->name('devtools.clock.')->group(function () {
        Route::get('/', GetClockController::class)->name('get');
        Route::post('set', SetClockController::class)->name('set');
        Route::post('shift', ShiftClockController::class)->name('shift');
        Route::post('reset', ResetClockController::class)->name('reset');
    });

    // ── Devtools payroll seed route ────────────────────────────────────────
    // Protected by PayrollSeedGuard (env check + feature flag)
    Route::prefix('v1/devtools/payroll')->name('devtools.payroll.')->middleware('auth:api')->group(function () {
        Route::post('seed', SeedPayrollController::class)->name('seed');
    });
}

// V1 API Routes — split by entity into routes/api/*.php to keep this group
// small (php:S138); each file registers its own routes under this prefix.
Route::prefix('v1')->group(function () {
    require __DIR__.'/api/health.php';
    require __DIR__.'/api/auth.php';
    require __DIR__.'/api/units-of-measure.php';
    require __DIR__.'/api/items.php';
    require __DIR__.'/api/media.php';
    require __DIR__.'/api/inventory.php';
    require __DIR__.'/api/employees.php';
    require __DIR__.'/api/attendance.php';
    require __DIR__.'/api/vacation-holidays.php';
    require __DIR__.'/api/cash-adjustments.php';
    require __DIR__.'/api/dishes.php';
});
