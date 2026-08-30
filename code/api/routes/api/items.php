<?php

use App\Http\Controllers\Api\V1\Items\CreateItemController;
use App\Http\Controllers\Api\V1\Items\CreateItemVariantController;
use App\Http\Controllers\Api\V1\Items\DeleteItemController;
use App\Http\Controllers\Api\V1\Items\DeleteItemVariantController;
use App\Http\Controllers\Api\V1\Items\ListItemsController;
use App\Http\Controllers\Api\V1\Items\ListItemVariantsController;
use App\Http\Controllers\Api\V1\Items\ShowItemController;
use App\Http\Controllers\Api\V1\Items\ShowItemVariantController;
use App\Http\Controllers\Api\V1\Items\SuggestItemSkuController;
use App\Http\Controllers\Api\V1\Items\SuggestItemVariantSkuController;
use App\Http\Controllers\Api\V1\Items\UpdateItemController;
use App\Http\Controllers\Api\V1\Items\UpdateItemVariantController;
use App\Support\RouteParams;
use Illuminate\Support\Facades\Route;

// Items (Protected read + write — requires items.view / items.create / items.update / items.delete)
Route::middleware('auth:api')->prefix('items')->group(function () {
    Route::get('/', ListItemsController::class)->name('items.list')->middleware('permission:items.view');
    // Declared before the {id} route so "next-sku" is never captured as an Item identifier.
    Route::get('/next-sku', SuggestItemSkuController::class)->name('items.next-sku')->middleware('permission:items.create');
    Route::get(RouteParams::ID, ShowItemController::class)->name('items.show')->middleware('permission:items.view');
    Route::post('/', CreateItemController::class)->name('items.create')->middleware('permission:items.create');
    Route::put(RouteParams::ID, UpdateItemController::class)->name('items.update')->middleware('permission:items.update');
    Route::delete(RouteParams::ID, DeleteItemController::class)->name('items.delete')->middleware('permission:items.delete');
});

// Item Variants (Protected read + write — inherits items.* permissions)
Route::middleware('auth:api')->prefix('item-variants')->group(function () {
    Route::get('/', ListItemVariantsController::class)->name('item-variants.list')->middleware('permission:items.view');
    Route::get('/suggest-code', SuggestItemVariantSkuController::class)->name('item-variants.suggest-code')->middleware('permission:items.create');
    Route::get(RouteParams::ID, ShowItemVariantController::class)->name('item-variants.show')->middleware('permission:items.view');
    Route::post('/', CreateItemVariantController::class)->name('item-variants.create')->middleware('permission:items.create');
    Route::put(RouteParams::ID, UpdateItemVariantController::class)->name('item-variants.update')->middleware('permission:items.update');
    Route::delete(RouteParams::ID, DeleteItemVariantController::class)->name('item-variants.delete')->middleware('permission:items.delete');
});
