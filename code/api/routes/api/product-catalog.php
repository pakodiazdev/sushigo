<?php

use App\Http\Controllers\Api\V1\Inventory\Brand\CreateBrandController;
use App\Http\Controllers\Api\V1\Inventory\Brand\DeleteBrandController;
use App\Http\Controllers\Api\V1\Inventory\Brand\ListBrandsController;
use App\Http\Controllers\Api\V1\Inventory\Brand\ShowBrandController;
use App\Http\Controllers\Api\V1\Inventory\Brand\UpdateBrandController;
use App\Http\Controllers\Api\V1\Inventory\InventoryCategory\CreateInventoryCategoryController;
use App\Http\Controllers\Api\V1\Inventory\InventoryCategory\DeleteInventoryCategoryController;
use App\Http\Controllers\Api\V1\Inventory\InventoryCategory\ListInventoryCategoriesController;
use App\Http\Controllers\Api\V1\Inventory\InventoryCategory\ShowInventoryCategoryController;
use App\Http\Controllers\Api\V1\Inventory\InventoryCategory\UpdateInventoryCategoryController;
use App\Http\Controllers\Api\V1\Inventory\Product\CreateProductController;
use App\Http\Controllers\Api\V1\Inventory\Product\DeleteProductController;
use App\Http\Controllers\Api\V1\Inventory\Product\ListProductsController;
use App\Http\Controllers\Api\V1\Inventory\Product\ShowProductController;
use App\Http\Controllers\Api\V1\Inventory\Product\UpdateProductController;
use App\Support\RouteParams;
use Illuminate\Support\Facades\Route;

// Brands (Protected read + write — requires brands.view / brands.create / brands.update / brands.delete)
Route::middleware('auth:api')->prefix('brands')->group(function () {
    $brandParam = '/{brand}';

    Route::get('/', ListBrandsController::class)->name('brands.list')->middleware('permission:brands.view');
    Route::get($brandParam, ShowBrandController::class)->name('brands.show')->middleware('permission:brands.view');
    Route::post('/', CreateBrandController::class)->name('brands.create')->middleware('permission:brands.create');
    Route::put($brandParam, UpdateBrandController::class)->name('brands.update')->middleware('permission:brands.update');
    Route::delete($brandParam, DeleteBrandController::class)->name('brands.delete')->middleware('permission:brands.delete');
});

// Inventory Categories (Protected read + write — requires inventory_categories.view / .create / .update / .delete)
Route::middleware('auth:api')->prefix('inventory-categories')->group(function () {
    $inventoryCategoryParam = '/{inventoryCategory}';

    Route::get('/', ListInventoryCategoriesController::class)->name('inventory-categories.list')->middleware('permission:inventory_categories.view');
    Route::get($inventoryCategoryParam, ShowInventoryCategoryController::class)->name('inventory-categories.show')->middleware('permission:inventory_categories.view');
    Route::post('/', CreateInventoryCategoryController::class)->name('inventory-categories.create')->middleware('permission:inventory_categories.create');
    Route::put($inventoryCategoryParam, UpdateInventoryCategoryController::class)->name('inventory-categories.update')->middleware('permission:inventory_categories.update');
    Route::delete($inventoryCategoryParam, DeleteInventoryCategoryController::class)->name('inventory-categories.delete')->middleware('permission:inventory_categories.delete');
});

// Products — Item scoped to type=PRODUCTO (Protected read + write — reuses items.* permissions,
// see doc/architecture/product-catalog/product-catalog-architecture.en.md §6). Keeps the numeric
// {id} route param (not public_id) matching Item's current convention — see this issue's PR
// Assumptions note (#399, public_id rollout for Inventory, hasn't landed yet).
Route::middleware('auth:api')->prefix('inventory/products')->group(function () {
    Route::get('/', ListProductsController::class)->name('products.list')->middleware('permission:items.view');
    Route::get(RouteParams::ID, ShowProductController::class)->name('products.show')->middleware('permission:items.view');
    Route::post('/', CreateProductController::class)->name('products.create')->middleware('permission:items.create');
    Route::put(RouteParams::ID, UpdateProductController::class)->name('products.update')->middleware('permission:items.update');
    Route::delete(RouteParams::ID, DeleteProductController::class)->name('products.delete')->middleware('permission:items.delete');
});
