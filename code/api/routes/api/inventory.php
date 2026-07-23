<?php

use App\Http\Controllers\Api\V1\Inventory\RegisterOpeningBalanceController;
use App\Http\Controllers\Api\V1\Inventory\RegisterStockOutController;
use App\Http\Controllers\Api\V1\InventoryLocation\CreateInventoryLocationController;
use App\Http\Controllers\Api\V1\InventoryLocation\DeleteInventoryLocationController;
use App\Http\Controllers\Api\V1\InventoryLocation\ListInventoryLocationsController;
use App\Http\Controllers\Api\V1\InventoryLocation\ShowInventoryLocationController;
use App\Http\Controllers\Api\V1\InventoryLocation\UpdateInventoryLocationController;
use App\Http\Controllers\Api\V1\OperatingUnit\CreateOperatingUnitController;
use App\Http\Controllers\Api\V1\OperatingUnit\DeleteOperatingUnitController;
use App\Http\Controllers\Api\V1\OperatingUnit\ListOperatingUnitsController;
use App\Http\Controllers\Api\V1\OperatingUnit\ShowOperatingUnitController;
use App\Http\Controllers\Api\V1\OperatingUnit\UpdateOperatingUnitController;
use App\Http\Controllers\Api\V1\OperatingUnitUser\AddUserToOperatingUnitController;
use App\Http\Controllers\Api\V1\OperatingUnitUser\ListOperatingUnitUsersController;
use App\Http\Controllers\Api\V1\OperatingUnitUser\RemoveUserFromOperatingUnitController;
use App\Http\Controllers\Api\V1\Stock\ListStockController;
use App\Http\Controllers\Api\V1\Stock\StockByLocationController;
use App\Http\Controllers\Api\V1\Stock\StockByVariantController;
use App\Support\RouteParams;
use Illuminate\Support\Facades\Route;

// Inventory Locations (Protected read + write)
Route::middleware('auth:api')->prefix('inventory-locations')->group(function () {
    Route::get('/', ListInventoryLocationsController::class)->name('inventory-locations.list')->middleware('permission:inventory_locations.view');
    Route::get(RouteParams::ID, ShowInventoryLocationController::class)->name('inventory-locations.show')->middleware('permission:inventory_locations.view');
    Route::post('/', CreateInventoryLocationController::class)->name('inventory-locations.create')->middleware('permission:inventory_locations.manage');
    Route::put(RouteParams::ID, UpdateInventoryLocationController::class)->name('inventory-locations.update')->middleware('permission:inventory_locations.manage');
    Route::delete(RouteParams::ID, DeleteInventoryLocationController::class)->name('inventory-locations.delete')->middleware('permission:inventory_locations.manage');
});

// Operating Units (Public read, protected write)
Route::prefix('operating-units')->group(function () {
    Route::get('/', ListOperatingUnitsController::class)->name('operating-units.list');
    Route::get(RouteParams::ID, ShowOperatingUnitController::class)->name('operating-units.show');

    Route::middleware('auth:api')->group(function () {
        Route::post('/', CreateOperatingUnitController::class)->name('operating-units.create');
        Route::put(RouteParams::ID, UpdateOperatingUnitController::class)->name('operating-units.update');
        Route::delete(RouteParams::ID, DeleteOperatingUnitController::class)->name('operating-units.delete');
    });
});

// Operating Unit Users (Public read, protected write)
Route::prefix('operating-units/{id}/users')->group(function () {
    Route::get('/', ListOperatingUnitUsersController::class)->name('operating-unit-users.list');

    Route::middleware('auth:api')->group(function () {
        Route::post('/', AddUserToOperatingUnitController::class)->name('operating-unit-users.add');
        Route::delete('/{userId}', RemoveUserFromOperatingUnitController::class)->name('operating-unit-users.remove');
    });
});

// Stock Query Endpoints (Protected read — requires stock.view)
Route::middleware('auth:api')->prefix('stock')->group(function () {
    Route::get('/', ListStockController::class)->name('stock.list')->middleware('permission:stock.view');
    Route::get('/by-location/{id}', StockByLocationController::class)->name('stock.by-location')->middleware('permission:stock.view');
    Route::get('/by-variant/{id}', StockByVariantController::class)->name('stock.by-variant')->middleware('permission:stock.view');
});

// Inventory Operations (Protected write — requires stock.manage)
Route::middleware('auth:api')->prefix('inventory')->group(function () {
    Route::post('opening-balance', RegisterOpeningBalanceController::class)->name('inventory.opening-balance')->middleware('permission:stock.manage');
    Route::post('stock-out', RegisterStockOutController::class)->name('inventory.stock-out')->middleware('permission:stock.manage');
});
