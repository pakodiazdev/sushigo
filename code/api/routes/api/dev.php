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

// This file is only require()'d from api.php inside the environment() check —
// see api.php's own file_exists() guard. prod-cloudrun's Docker build removes
// this file entirely (TD-07), so the guard, not this file, is what keeps
// Production's route:cache from fataling on a missing require.

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
