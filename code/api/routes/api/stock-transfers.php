<?php

use App\Http\Controllers\Api\V1\Inventory\StockTransfer\CreateStockTransferController;
use App\Http\Controllers\Api\V1\Inventory\StockTransfer\DeleteStockTransferController;
use App\Http\Controllers\Api\V1\Inventory\StockTransfer\ListStockTransfersController;
use App\Http\Controllers\Api\V1\Inventory\StockTransfer\PostStockTransferController;
use App\Http\Controllers\Api\V1\Inventory\StockTransfer\ReverseStockTransferController;
use App\Http\Controllers\Api\V1\Inventory\StockTransfer\ShowStockTransferController;
use App\Http\Controllers\Api\V1\Inventory\StockTransfer\UpdateStockTransferController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:api')
    ->prefix('inventory/transfers')
    ->scopeBindings()
    ->group(function () {
        Route::get('/', ListStockTransfersController::class)->name('stock-transfers.list')->middleware('permission:stock.view');
        Route::post('/', CreateStockTransferController::class)->name('stock-transfers.create')->middleware('permission:stock.manage');

        Route::prefix('{transfer}')->group(function () {
            Route::get('/', ShowStockTransferController::class)->name('stock-transfers.show')->middleware('permission:stock.view');
            Route::put('/', UpdateStockTransferController::class)->name('stock-transfers.update')->middleware('permission:stock.manage');
            Route::delete('/', DeleteStockTransferController::class)->name('stock-transfers.delete')->middleware('permission:stock.manage');
            Route::post('post', PostStockTransferController::class)->name('stock-transfers.post')->middleware('permission:stock.manage');
            Route::post('reverse', ReverseStockTransferController::class)->name('stock-transfers.reverse')->middleware('permission:stock.manage');
        });
    });
