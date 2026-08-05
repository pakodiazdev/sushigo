<?php

use App\Http\Controllers\Api\V1\Dishes\Dish\CreateDishController;
use App\Http\Controllers\Api\V1\Dishes\Dish\DeleteDishController;
use App\Http\Controllers\Api\V1\Dishes\Dish\ListDishesController;
use App\Http\Controllers\Api\V1\Dishes\Dish\ShowDishController;
use App\Http\Controllers\Api\V1\Dishes\Dish\UpdateDishController;
use App\Http\Controllers\Api\V1\Dishes\DishCategory\CreateDishCategoryController;
use App\Http\Controllers\Api\V1\Dishes\DishCategory\DeleteDishCategoryController;
use App\Http\Controllers\Api\V1\Dishes\DishCategory\ListDishCategoriesController;
use App\Http\Controllers\Api\V1\Dishes\DishCategory\ShowDishCategoryController;
use App\Http\Controllers\Api\V1\Dishes\DishCategory\UpdateDishCategoryController;
use App\Http\Controllers\Api\V1\Dishes\DishExtra\CreateDishExtraGroupController;
use App\Http\Controllers\Api\V1\Dishes\DishExtra\CreateDishExtraOptionController;
use App\Http\Controllers\Api\V1\Dishes\DishExtra\DeleteDishExtraGroupController;
use App\Http\Controllers\Api\V1\Dishes\DishExtra\DeleteDishExtraOptionController;
use App\Http\Controllers\Api\V1\Dishes\DishExtra\ListDishExtraGroupsController;
use App\Http\Controllers\Api\V1\Dishes\DishExtra\ListDishExtraOptionsController;
use App\Http\Controllers\Api\V1\Dishes\DishExtra\ShowDishExtraGroupController;
use App\Http\Controllers\Api\V1\Dishes\DishExtra\ShowDishExtraOptionController;
use App\Http\Controllers\Api\V1\Dishes\DishExtra\UpdateDishExtraGroupController;
use App\Http\Controllers\Api\V1\Dishes\DishExtra\UpdateDishExtraOptionController;
use Illuminate\Support\Facades\Route;

// Platillos (menu catalog) — Protected read + write, gated by its own dishes.*
// permission set, independent of items.* (resale inventory). Route parameter
// names match the controllers' implicit-bound model argument names.
$dishCategoryParam = '/{dishCategory}';
$dishParam = '/{dish}';
$dishExtraGroupParam = '/{dishExtraGroup}';
$dishExtraOptionParam = '/{dishExtraOption}';

Route::middleware('auth:api')->prefix('dish-categories')->name('dish-categories.')->group(function () use ($dishCategoryParam) {
    Route::get('/', ListDishCategoriesController::class)->name('index')->middleware('permission:dishes.view');
    Route::get($dishCategoryParam, ShowDishCategoryController::class)->name('show')->middleware('permission:dishes.view');
    Route::post('/', CreateDishCategoryController::class)->name('store')->middleware('permission:dishes.create');
    Route::put($dishCategoryParam, UpdateDishCategoryController::class)->name('update')->middleware('permission:dishes.update');
    Route::delete($dishCategoryParam, DeleteDishCategoryController::class)->name('destroy')->middleware('permission:dishes.delete');
});

Route::middleware('auth:api')->prefix('dishes')->name('dishes.')->group(function () use ($dishParam) {
    Route::get('/', ListDishesController::class)->name('index')->middleware('permission:dishes.view');
    Route::get($dishParam, ShowDishController::class)->name('show')->middleware('permission:dishes.view');
    Route::post('/', CreateDishController::class)->name('store')->middleware('permission:dishes.create');
    Route::put($dishParam, UpdateDishController::class)->name('update')->middleware('permission:dishes.update');
    Route::delete($dishParam, DeleteDishController::class)->name('destroy')->middleware('permission:dishes.delete');
});

Route::middleware('auth:api')->prefix('dish-extra-groups')->name('dish-extra-groups.')->group(function () use ($dishExtraGroupParam) {
    Route::get('/', ListDishExtraGroupsController::class)->name('index')->middleware('permission:dishes.view');
    Route::get($dishExtraGroupParam, ShowDishExtraGroupController::class)->name('show')->middleware('permission:dishes.view');
    Route::post('/', CreateDishExtraGroupController::class)->name('store')->middleware('permission:dishes.create');
    Route::put($dishExtraGroupParam, UpdateDishExtraGroupController::class)->name('update')->middleware('permission:dishes.update');
    Route::delete($dishExtraGroupParam, DeleteDishExtraGroupController::class)->name('destroy')->middleware('permission:dishes.delete');
});

Route::middleware('auth:api')->prefix('dish-extra-options')->name('dish-extra-options.')->group(function () use ($dishExtraOptionParam) {
    Route::get('/', ListDishExtraOptionsController::class)->name('index')->middleware('permission:dishes.view');
    Route::get($dishExtraOptionParam, ShowDishExtraOptionController::class)->name('show')->middleware('permission:dishes.view');
    Route::post('/', CreateDishExtraOptionController::class)->name('store')->middleware('permission:dishes.create');
    Route::put($dishExtraOptionParam, UpdateDishExtraOptionController::class)->name('update')->middleware('permission:dishes.update');
    Route::delete($dishExtraOptionParam, DeleteDishExtraOptionController::class)->name('destroy')->middleware('permission:dishes.delete');
});
