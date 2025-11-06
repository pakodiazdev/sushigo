<?php

use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\Auth\MeController;
use App\Http\Controllers\Api\V1\Auth\RegisterController;
use App\Http\Controllers\Api\V1\Items\CreateItemController;
use App\Http\Controllers\Api\V1\Items\CreateItemVariantController;
use App\Http\Controllers\Api\V1\Items\DeleteItemController;
use App\Http\Controllers\Api\V1\Items\DeleteItemVariantController;
use App\Http\Controllers\Api\V1\Items\ListItemsController;
use App\Http\Controllers\Api\V1\Items\ListItemVariantsController;
use App\Http\Controllers\Api\V1\Items\ShowItemController;
use App\Http\Controllers\Api\V1\Items\ShowItemVariantController;
use App\Http\Controllers\Api\V1\Items\UpdateItemController;
use App\Http\Controllers\Api\V1\Items\UpdateItemVariantController;
use App\Http\Controllers\Api\V1\Inventory\RegisterOpeningBalanceController;
use App\Http\Controllers\Api\V1\Inventory\RegisterStockOutController;
use App\Http\Controllers\Api\V1\InventoryLocation\CreateInventoryLocationController;
use App\Http\Controllers\Api\V1\InventoryLocation\DeleteInventoryLocationController;
use App\Http\Controllers\Api\V1\InventoryLocation\ListInventoryLocationsController;
use App\Http\Controllers\Api\V1\InventoryLocation\ShowInventoryLocationController;
use App\Http\Controllers\Api\V1\InventoryLocation\UpdateInventoryLocationController;
use App\Http\Controllers\Api\V1\OperatingUnitUser\AddUserToOperatingUnitController;
use App\Http\Controllers\Api\V1\OperatingUnitUser\ListOperatingUnitUsersController;
use App\Http\Controllers\Api\V1\OperatingUnitUser\RemoveUserFromOperatingUnitController;
use App\Http\Controllers\Api\V1\Stock\ListStockController;
use App\Http\Controllers\Api\V1\Stock\StockByLocationController;
use App\Http\Controllers\Api\V1\Stock\StockByVariantController;
use App\Http\Controllers\Api\V1\UnitsOfMeasure\CreateUnitOfMeasureController;
use App\Http\Controllers\Api\V1\UnitsOfMeasure\CreateUomConversionController;
use App\Http\Controllers\Api\V1\UnitsOfMeasure\DeleteUnitOfMeasureController;
use App\Http\Controllers\Api\V1\UnitsOfMeasure\DeleteUomConversionController;
use App\Http\Controllers\Api\V1\UnitsOfMeasure\ListUnitsOfMeasureController;
use App\Http\Controllers\Api\V1\UnitsOfMeasure\ListUomConversionsController;
use App\Http\Controllers\Api\V1\UnitsOfMeasure\ShowUnitOfMeasureController;
use App\Http\Controllers\Api\V1\UnitsOfMeasure\UpdateUnitOfMeasureController;
use Illuminate\Support\Facades\Route;

// V1 API Routes
Route::prefix('v1')->group(function () {
    // Public auth routes
    Route::prefix('auth')->group(function () {
        Route::post('register', RegisterController::class)->name('auth.register');
        Route::post('login', LoginController::class)->name('auth.login');
    });

    // Protected auth routes
    Route::middleware('auth:api')->prefix('auth')->group(function () {
        Route::post('logout', LogoutController::class)->name('auth.logout');
        Route::get('me', MeController::class)->name('auth.me');
    });

    // Units of Measure (Public read, protected write)
    Route::prefix('units-of-measure')->group(function () {
        Route::get('/', ListUnitsOfMeasureController::class)->name('units-of-measure.list');
        Route::get('/{id}', ShowUnitOfMeasureController::class)->name('units-of-measure.show');

        Route::middleware('auth:api')->group(function () {
            Route::post('/', CreateUnitOfMeasureController::class)->name('units-of-measure.create');
            Route::put('/{id}', UpdateUnitOfMeasureController::class)->name('units-of-measure.update');
            Route::delete('/{id}', DeleteUnitOfMeasureController::class)->name('units-of-measure.delete');
        });
    });

    // UOM Conversions (Public read, protected write)
    Route::prefix('uom-conversions')->group(function () {
        Route::get('/', ListUomConversionsController::class)->name('uom-conversions.list');

        Route::middleware('auth:api')->group(function () {
            Route::post('/', CreateUomConversionController::class)->name('uom-conversions.create');
            Route::delete('/{id}', DeleteUomConversionController::class)->name('uom-conversions.delete');
        });
    });

    // Items (Public read, protected write)
    Route::prefix('items')->group(function () {
        Route::get('/', ListItemsController::class)->name('items.list');
        Route::get('/{id}', ShowItemController::class)->name('items.show');

        Route::middleware('auth:api')->group(function () {
            Route::post('/', CreateItemController::class)->name('items.create');
            Route::put('/{id}', UpdateItemController::class)->name('items.update');
            Route::delete('/{id}', DeleteItemController::class)->name('items.delete');
        });
    });

    // Item Variants (Public read, protected write)
    Route::prefix('item-variants')->group(function () {
        Route::get('/', ListItemVariantsController::class)->name('item-variants.list');
        Route::get('/{id}', ShowItemVariantController::class)->name('item-variants.show');

        Route::middleware('auth:api')->group(function () {
            Route::post('/', CreateItemVariantController::class)->name('item-variants.create');
            Route::put('/{id}', UpdateItemVariantController::class)->name('item-variants.update');
            Route::delete('/{id}', DeleteItemVariantController::class)->name('item-variants.delete');
        });
    });

    // Inventory Locations (Public read, protected write)
    Route::prefix('inventory-locations')->group(function () {
        Route::get('/', ListInventoryLocationsController::class)->name('inventory-locations.list');
        Route::get('/{id}', ShowInventoryLocationController::class)->name('inventory-locations.show');

        Route::middleware('auth:api')->group(function () {
            Route::post('/', CreateInventoryLocationController::class)->name('inventory-locations.create');
            Route::put('/{id}', UpdateInventoryLocationController::class)->name('inventory-locations.update');
            Route::delete('/{id}', DeleteInventoryLocationController::class)->name('inventory-locations.delete');
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

    // Stock Query Endpoints (Public read)
    Route::prefix('stock')->group(function () {
        Route::get('/', ListStockController::class)->name('stock.list');
        Route::get('/by-location/{id}', StockByLocationController::class)->name('stock.by-location');
        Route::get('/by-variant/{id}', StockByVariantController::class)->name('stock.by-variant');
    });

    // Inventory Operations (Protected)
    Route::middleware('auth:api')->prefix('inventory')->group(function () {
        Route::post('opening-balance', RegisterOpeningBalanceController::class)->name('inventory.opening-balance');
        Route::post('stock-out', RegisterStockOutController::class)->name('inventory.stock-out');
    });
});
