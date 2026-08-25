<?php

use App\Http\Controllers\Api\V1\Inventory\Supplier\CreateSupplierController;
use App\Http\Controllers\Api\V1\Inventory\Supplier\DeleteSupplierController;
use App\Http\Controllers\Api\V1\Inventory\Supplier\ListSuppliersController;
use App\Http\Controllers\Api\V1\Inventory\Supplier\ShowSupplierController;
use App\Http\Controllers\Api\V1\Inventory\Supplier\UpdateSupplierController;
use App\Http\Controllers\Api\V1\Inventory\SupplierOffering\CreateSupplierOfferingController;
use App\Http\Controllers\Api\V1\Inventory\SupplierOffering\DeleteSupplierOfferingController;
use App\Http\Controllers\Api\V1\Inventory\SupplierOffering\ListSupplierOfferingsController;
use App\Http\Controllers\Api\V1\Inventory\SupplierOffering\ShowSupplierOfferingController;
use App\Http\Controllers\Api\V1\Inventory\SupplierOffering\UpdateSupplierOfferingController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:api')
    ->prefix('inventory/suppliers')
    ->scopeBindings()
    ->group(function () {
        Route::get('/', ListSuppliersController::class)->name('suppliers.list')->middleware('permission:suppliers.view');
        Route::post('/', CreateSupplierController::class)->name('suppliers.create')->middleware('permission:suppliers.manage');

        Route::prefix('{supplier}/offerings')->group(function () {
            Route::get('/', ListSupplierOfferingsController::class)->name('suppliers.offerings.list')->middleware('permission:suppliers.view');
            Route::post('/', CreateSupplierOfferingController::class)->name('suppliers.offerings.create')->middleware('permission:suppliers.manage');

            Route::prefix('{offering}')->group(function () {
                Route::get('/', ShowSupplierOfferingController::class)->name('suppliers.offerings.show')->middleware('permission:suppliers.view');
                Route::put('/', UpdateSupplierOfferingController::class)->name('suppliers.offerings.update')->middleware('permission:suppliers.manage');
                Route::delete('/', DeleteSupplierOfferingController::class)->name('suppliers.offerings.delete')->middleware('permission:suppliers.manage');
            });
        });

        Route::prefix('{supplier}')->group(function () {
            Route::get('/', ShowSupplierController::class)->name('suppliers.show')->middleware('permission:suppliers.view');
            Route::put('/', UpdateSupplierController::class)->name('suppliers.update')->middleware('permission:suppliers.manage');
            Route::delete('/', DeleteSupplierController::class)->name('suppliers.delete')->middleware('permission:suppliers.manage');
        });
    });
