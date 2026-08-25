<?php

use App\Http\Controllers\Api\V1\Inventory\Receipt\CreateReceiptController;
use App\Http\Controllers\Api\V1\Inventory\Receipt\DeleteReceiptController;
use App\Http\Controllers\Api\V1\Inventory\Receipt\ListReceiptsController;
use App\Http\Controllers\Api\V1\Inventory\Receipt\PostReceiptController;
use App\Http\Controllers\Api\V1\Inventory\Receipt\ReverseReceiptController;
use App\Http\Controllers\Api\V1\Inventory\Receipt\ShowReceiptController;
use App\Http\Controllers\Api\V1\Inventory\Receipt\UpdateReceiptController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:api')
    ->prefix('inventory/receipts')
    ->scopeBindings()
    ->group(function () {
        Route::get('/', ListReceiptsController::class)->name('receipts.list')->middleware('permission:receipts.view');
        Route::post('/', CreateReceiptController::class)->name('receipts.create')->middleware('permission:receipts.manage');

        Route::prefix('{receipt}')->group(function () {
            Route::get('/', ShowReceiptController::class)->name('receipts.show')->middleware('permission:receipts.view');
            Route::put('/', UpdateReceiptController::class)->name('receipts.update')->middleware('permission:receipts.manage');
            Route::delete('/', DeleteReceiptController::class)->name('receipts.delete')->middleware('permission:receipts.manage');
            Route::post('post', PostReceiptController::class)->name('receipts.post')->middleware('permission:receipts.manage');
            Route::post('reverse', ReverseReceiptController::class)->name('receipts.reverse')->middleware('permission:receipts.manage');
        });
    });
