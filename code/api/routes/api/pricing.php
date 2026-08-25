<?php

use App\Http\Controllers\Api\V1\Pricing\PriceListAssignments\CreatePriceListAssignmentController;
use App\Http\Controllers\Api\V1\Pricing\PriceListAssignments\DeletePriceListAssignmentController;
use App\Http\Controllers\Api\V1\Pricing\PriceListAssignments\ListPriceListAssignmentsController;
use App\Http\Controllers\Api\V1\Pricing\PriceListAssignments\ShowPriceListAssignmentController;
use App\Http\Controllers\Api\V1\Pricing\PriceListAssignments\UpdatePriceListAssignmentController;
use App\Http\Controllers\Api\V1\Pricing\PriceLists\CreatePriceListController;
use App\Http\Controllers\Api\V1\Pricing\PriceLists\DeletePriceListController;
use App\Http\Controllers\Api\V1\Pricing\PriceLists\ListPriceListsController;
use App\Http\Controllers\Api\V1\Pricing\PriceLists\ShowPriceListController;
use App\Http\Controllers\Api\V1\Pricing\PriceLists\UpdatePriceListController;
use App\Http\Controllers\Api\V1\Pricing\ResolveVariantPriceController;
use App\Http\Controllers\Api\V1\Pricing\VariantPrices\CreateVariantPriceController;
use App\Http\Controllers\Api\V1\Pricing\VariantPrices\DeleteVariantPriceController;
use App\Http\Controllers\Api\V1\Pricing\VariantPrices\ListVariantPricesController;
use App\Http\Controllers\Api\V1\Pricing\VariantPrices\UpdateVariantPriceController;
use App\Support\RouteParams;
use Illuminate\Support\Facades\Route;

// Pricing domain (#435) — effective-dated Price Lists resolved by Branch or
// Operating Unit context. Authorization here is Gate::authorize()/FormRequest
// Policy calls (not `permission:` route middleware) throughout, unlike
// brands/inventory-categories in product-catalog.php — PriceListAssignment
// needs the branch-scoped ChecksBranchAccess check that route middleware
// alone can't express, and every endpoint in this domain authorizes the same
// way for consistency. See doc/architecture/pricing/pricing-architecture.en.md.
Route::middleware('auth:api')->prefix('pricing')->group(function () {
    Route::prefix('price-lists')->group(function () {
        Route::get('/', ListPriceListsController::class)->name('price-lists.list');
        Route::post('/', CreatePriceListController::class)->name('price-lists.create');
        Route::get(RouteParams::PRICE_LIST_ID, ShowPriceListController::class)->name('price-lists.show');
        Route::put(RouteParams::PRICE_LIST_ID, UpdatePriceListController::class)->name('price-lists.update');
        Route::delete(RouteParams::PRICE_LIST_ID, DeletePriceListController::class)->name('price-lists.delete');

        Route::prefix(RouteParams::PRICE_LIST_ID.'/variant-prices')->group(function () {
            Route::get('/', ListVariantPricesController::class)->name('price-lists.variant-prices.list');
            Route::post('/', CreateVariantPriceController::class)->name('price-lists.variant-prices.create');
            Route::put('/{variantPrice}', UpdateVariantPriceController::class)->name('price-lists.variant-prices.update');
            Route::delete('/{variantPrice}', DeleteVariantPriceController::class)->name('price-lists.variant-prices.delete');
        });
    });

    Route::prefix('price-list-assignments')->group(function () {
        Route::get('/', ListPriceListAssignmentsController::class)->name('price-list-assignments.list');
        Route::post('/', CreatePriceListAssignmentController::class)->name('price-list-assignments.create');
        Route::get(RouteParams::PRICE_LIST_ASSIGNMENT_ID, ShowPriceListAssignmentController::class)->name('price-list-assignments.show');
        Route::put(RouteParams::PRICE_LIST_ASSIGNMENT_ID, UpdatePriceListAssignmentController::class)->name('price-list-assignments.update');
        Route::delete(RouteParams::PRICE_LIST_ASSIGNMENT_ID, DeletePriceListAssignmentController::class)->name('price-list-assignments.delete');
    });

    Route::get('resolve', ResolveVariantPriceController::class)->name('pricing.resolve');
});
