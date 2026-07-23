<?php

use App\Http\Controllers\Api\V1\UnitsOfMeasure\CreateUnitOfMeasureController;
use App\Http\Controllers\Api\V1\UnitsOfMeasure\CreateUomConversionController;
use App\Http\Controllers\Api\V1\UnitsOfMeasure\DeleteUnitOfMeasureController;
use App\Http\Controllers\Api\V1\UnitsOfMeasure\DeleteUomConversionController;
use App\Http\Controllers\Api\V1\UnitsOfMeasure\ListUnitsOfMeasureController;
use App\Http\Controllers\Api\V1\UnitsOfMeasure\ListUomConversionsController;
use App\Http\Controllers\Api\V1\UnitsOfMeasure\ShowUnitOfMeasureController;
use App\Http\Controllers\Api\V1\UnitsOfMeasure\UpdateUnitOfMeasureController;
use App\Support\RouteParams;
use Illuminate\Support\Facades\Route;

// Units of Measure (Public read, protected write)
Route::prefix('units-of-measure')->group(function () {
    Route::get('/', ListUnitsOfMeasureController::class)->name('units-of-measure.list');
    Route::get(RouteParams::ID, ShowUnitOfMeasureController::class)->name('units-of-measure.show');

    Route::middleware('auth:api')->group(function () {
        Route::post('/', CreateUnitOfMeasureController::class)->name('units-of-measure.create');
        Route::put(RouteParams::ID, UpdateUnitOfMeasureController::class)->name('units-of-measure.update');
        Route::delete(RouteParams::ID, DeleteUnitOfMeasureController::class)->name('units-of-measure.delete');
    });
});

// UOM Conversions (Public read, protected write)
Route::prefix('uom-conversions')->group(function () {
    Route::get('/', ListUomConversionsController::class)->name('uom-conversions.list');

    Route::middleware('auth:api')->group(function () {
        Route::post('/', CreateUomConversionController::class)->name('uom-conversions.create');
        Route::delete(RouteParams::ID, DeleteUomConversionController::class)->name('uom-conversions.delete');
    });
});
