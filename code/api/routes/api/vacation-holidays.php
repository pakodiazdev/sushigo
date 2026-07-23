<?php

use App\Http\Controllers\Api\V1\Holidays\CreateHolidayController;
use App\Http\Controllers\Api\V1\Holidays\CreateHolidayDefinitionController;
use App\Http\Controllers\Api\V1\Holidays\DeleteHolidayController;
use App\Http\Controllers\Api\V1\Holidays\DeleteHolidayDefinitionController;
use App\Http\Controllers\Api\V1\Holidays\ListHolidayDefinitionsController;
use App\Http\Controllers\Api\V1\Holidays\ListHolidaysController;
use App\Http\Controllers\Api\V1\Holidays\UpdateHolidayController;
use App\Http\Controllers\Api\V1\Holidays\UpdateHolidayDefinitionController;
use App\Http\Controllers\Api\V1\VacationPolicy\ListVacationPolicyController;
use App\Http\Controllers\Api\V1\VacationPolicy\UpdateVacationPolicyController;
use App\Support\RouteParams;
use Illuminate\Support\Facades\Route;

// Vacation Policy Settings (tenant-level — All Protected)
Route::middleware('auth:api')->prefix('vacation-policy')->name('vacation-policy.')->group(function () {
    Route::get('/', ListVacationPolicyController::class)->name('index')->middleware('permission:vacation-policy.manage');
    Route::put('/', UpdateVacationPolicyController::class)->name('update')->middleware('permission:vacation-policy.manage');
});

// Holidays Module (All Protected — requires holidays.manage)
Route::middleware(['auth:api', 'permission:holidays.manage'])->group(function () {
    Route::prefix('holidays')->name('holidays.')->group(function () {
        Route::get('/', ListHolidaysController::class)->name('index');
        Route::post('/', CreateHolidayController::class)->name('store');
        Route::put(RouteParams::ID, UpdateHolidayController::class)->name('update');
        Route::delete(RouteParams::ID, DeleteHolidayController::class)->name('destroy');
    });

    Route::prefix('holiday-definitions')->name('holiday-definitions.')->group(function () {
        Route::get('/', ListHolidayDefinitionsController::class)->name('index');
        Route::post('/', CreateHolidayDefinitionController::class)->name('store');
        Route::put('/{holidayDefinition}', UpdateHolidayDefinitionController::class)->name('update');
        Route::delete('/{holidayDefinition}', DeleteHolidayDefinitionController::class)->name('destroy');
    });
});
