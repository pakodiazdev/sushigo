<?php

use App\Http\Controllers\Api\V1\Inventory\Supplier\CreateSupplierController;
use App\Http\Controllers\Api\V1\Inventory\Supplier\DeleteSupplierController;
use App\Http\Controllers\Api\V1\Inventory\Supplier\ListSuppliersController;
use App\Http\Controllers\Api\V1\Inventory\Supplier\ShowSupplierController;
use App\Http\Controllers\Api\V1\Inventory\Supplier\SuggestSupplierCodeController;
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
        // List also accepts receipts.manage (#433) — the Purchase Receipt form needs to populate
        // its Supplier selector for a user authorized to create Receipts but not the Supplier
        // catalog itself; show/create/update/delete stay suppliers.*-only since the Receipt form
        // never calls them.
        Route::get('/', ListSuppliersController::class)->name('suppliers.list')->middleware('permission:suppliers.view|receipts.manage');
        // Declared before the {supplier} routes below so "next-code" is not captured as a binding.
        Route::get('/next-code', SuggestSupplierCodeController::class)->name('suppliers.next-code')->middleware('permission:suppliers.manage');
        Route::post('/', CreateSupplierController::class)->name('suppliers.create')->middleware('permission:suppliers.manage');

        Route::prefix('{supplier}/offerings')->group(function () {
            // Same reasoning as the Suppliers list above — the Receipt form's per-line Supplier
            // Offering selector needs this.
            Route::get('/', ListSupplierOfferingsController::class)->name('suppliers.offerings.list')->middleware('permission:suppliers.view|receipts.manage');
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
