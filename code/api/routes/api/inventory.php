<?php

use App\Http\Controllers\Api\V1\Inventory\RegisterOpeningBalanceController;
use App\Http\Controllers\Api\V1\Inventory\RegisterStockOutController;
use App\Http\Controllers\Api\V1\Inventory\ReplenishmentPolicy\DeleteVariantReplenishmentPolicyController;
use App\Http\Controllers\Api\V1\Inventory\ReplenishmentPolicy\ListLocationReplenishmentPoliciesController;
use App\Http\Controllers\Api\V1\Inventory\ReplenishmentPolicy\ShowVariantReplenishmentPolicyController;
use App\Http\Controllers\Api\V1\Inventory\ReplenishmentPolicy\UpsertVariantReplenishmentPolicyController;
use App\Http\Controllers\Api\V1\Inventory\StockMovement\ListStockMovementsController;
use App\Http\Controllers\Api\V1\Inventory\StockMovement\ShowStockMovementController;
use App\Http\Controllers\Api\V1\Inventory\VariantAssignment\AssignVariantToLocationController;
use App\Http\Controllers\Api\V1\Inventory\VariantAssignment\ListLocationVariantAssignmentsController;
use App\Http\Controllers\Api\V1\Inventory\VariantAssignment\UnassignVariantFromLocationController;
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
// List also accepts receipts.manage (#433) — the Purchase Receipt form needs to populate its
// destination-location selector for a user authorized to create Receipts but not the Location
// catalog itself; show/create/update/delete stay inventory_locations.*-only since the Receipt
// form never calls them.
Route::middleware('auth:api')->prefix('inventory-locations')->group(function () {
    Route::get('/', ListInventoryLocationsController::class)->name('inventory-locations.list')->middleware('permission:inventory_locations.view|receipts.manage');
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

// Per-(Inventory Location, Variant) replenishment policies (#439) — read with
// stock.view, write with stock.manage, same as the stock endpoints below;
// replenishment thresholds are stock governance, not catalog identity.
Route::middleware('auth:api')->prefix('inventory-locations/{id}/replenishment-policies')->group(function () {
    Route::get('/', ListLocationReplenishmentPoliciesController::class)->name('replenishment-policies.list')->middleware('permission:stock.view');
    Route::get(RouteParams::VARIANT_ID, ShowVariantReplenishmentPolicyController::class)->name('replenishment-policies.show')->middleware('permission:stock.view');
    Route::put(RouteParams::VARIANT_ID, UpsertVariantReplenishmentPolicyController::class)->name('replenishment-policies.upsert')->middleware('permission:stock.manage');
    Route::delete(RouteParams::VARIANT_ID, DeleteVariantReplenishmentPolicyController::class)->name('replenishment-policies.delete')->middleware('permission:stock.manage');
});

// Per-(Inventory Location, Variant) managed-assortment assignments (#569) —
// "this Variant is managed here", independent of physical stock and of
// replenishment thresholds. Read with stock.view, write with stock.manage,
// same governance seam as the stock endpoints below.
Route::middleware('auth:api')->prefix('inventory-locations/{id}/variant-assignments')->group(function () {
    Route::get('/', ListLocationVariantAssignmentsController::class)->name('variant-assignments.list')->middleware('permission:stock.view');
    Route::put(RouteParams::VARIANT_ID, AssignVariantToLocationController::class)->name('variant-assignments.assign')->middleware('permission:stock.manage');
    Route::delete(RouteParams::VARIANT_ID, UnassignVariantFromLocationController::class)->name('variant-assignments.unassign')->middleware('permission:stock.manage');
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

// Immutable Stock Movement ledger (#574) — read-only. Reuses stock.view: the
// ledger only exposes evidence the stock query endpoints already imply, and no
// dedicated movement-read permission exists in the catalog. Operating Unit
// scoping is applied in the controller/resource layer, not the route.
Route::middleware('auth:api')->prefix('inventory/movements')->group(function () {
    Route::get('/', ListStockMovementsController::class)->name('inventory.movements.list')->middleware('permission:stock.view');
    Route::get('/{movement}', ShowStockMovementController::class)->name('inventory.movements.show')->middleware('permission:stock.view');
});
