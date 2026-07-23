<?php

use App\Http\Controllers\CashAdjustments\BankAccounts\CreateBankAccountController;
use App\Http\Controllers\CashAdjustments\BankAccounts\DeleteBankAccountController;
use App\Http\Controllers\CashAdjustments\BankAccounts\ListBankAccountsController;
use App\Http\Controllers\CashAdjustments\BankAccounts\ShowBankAccountController;
use App\Http\Controllers\CashAdjustments\BankAccounts\UpdateBankAccountController;
use App\Http\Controllers\CashAdjustments\CashAdjustments\CreateCashAdjustmentController;
use App\Http\Controllers\CashAdjustments\CashAdjustments\DeleteCashAdjustmentController;
use App\Http\Controllers\CashAdjustments\CashAdjustments\ListCashAdjustmentsController;
use App\Http\Controllers\CashAdjustments\CashAdjustments\PostCashAdjustmentController;
use App\Http\Controllers\CashAdjustments\CashAdjustments\ShowCashAdjustmentController;
use App\Http\Controllers\CashAdjustments\CashExpenses\CreateCashExpenseController;
use App\Http\Controllers\CashAdjustments\CashExpenses\DeleteCashExpenseController;
use App\Http\Controllers\CashAdjustments\CashExpenses\ListCashExpensesController;
use App\Http\Controllers\CashAdjustments\CashExpenses\PostCashExpenseController;
use App\Http\Controllers\CashAdjustments\CashExpenses\ShowCashExpenseController;
use App\Http\Controllers\CashAdjustments\CashExpenses\UpdateCashExpenseController;
use App\Http\Controllers\CashAdjustments\CashRegisters\CreateCashRegisterController;
use App\Http\Controllers\CashAdjustments\CashRegisters\DeleteCashRegisterController;
use App\Http\Controllers\CashAdjustments\CashRegisters\ListCashRegistersController;
use App\Http\Controllers\CashAdjustments\CashRegisters\ShowCashRegisterController;
use App\Http\Controllers\CashAdjustments\CashRegisters\UpdateCashRegisterController;
use App\Http\Controllers\CashAdjustments\CashSessions\CreateCashSessionController;
use App\Http\Controllers\CashAdjustments\CashSessions\GetSessionSummaryController;
use App\Http\Controllers\CashAdjustments\CashSessions\ListCashSessionsController;
use App\Http\Controllers\CashAdjustments\CashSessions\PostCashSessionController;
use App\Http\Controllers\CashAdjustments\CashSessions\ShowCashSessionController;
use App\Http\Controllers\CashAdjustments\CashSessions\UpdateCashSessionController;
use App\Http\Controllers\CashAdjustments\CashTerminals\CreateCashTerminalController;
use App\Http\Controllers\CashAdjustments\CashTerminals\DeleteCashTerminalController;
use App\Http\Controllers\CashAdjustments\CashTerminals\ListCashTerminalsController;
use App\Http\Controllers\CashAdjustments\CashTerminals\ShowCashTerminalController;
use App\Http\Controllers\CashAdjustments\CashTerminals\UpdateCashTerminalController;
use App\Support\RouteParams;
use Illuminate\Support\Facades\Route;

// Cash Adjustments Module (All Protected)
Route::middleware('auth:api')->group(function () {
    // Cash Registers
    Route::prefix('cash-registers')->group(function () {
        Route::get('/', ListCashRegistersController::class)
            ->name('cash-registers.list');
        Route::post('/', CreateCashRegisterController::class)
            ->name('cash-registers.create');
        Route::get(RouteParams::ID, ShowCashRegisterController::class)
            ->name('cash-registers.show');
        Route::put(RouteParams::ID, UpdateCashRegisterController::class)
            ->name('cash-registers.update');
        Route::delete(RouteParams::ID, DeleteCashRegisterController::class)
            ->name('cash-registers.delete');
    });

    // Cash Terminals
    Route::prefix('cash-terminals')->group(function () {
        Route::get('/', ListCashTerminalsController::class)
            ->name('cash-terminals.list');
        Route::post('/', CreateCashTerminalController::class)
            ->name('cash-terminals.create');
        Route::get(RouteParams::ID, ShowCashTerminalController::class)
            ->name('cash-terminals.show');
        Route::put(RouteParams::ID, UpdateCashTerminalController::class)
            ->name('cash-terminals.update');
        Route::delete(RouteParams::ID, DeleteCashTerminalController::class)
            ->name('cash-terminals.delete');
    });

    // Bank Accounts
    Route::prefix('bank-accounts')->group(function () {
        Route::get('/', ListBankAccountsController::class)
            ->name('bank-accounts.list');
        Route::post('/', CreateBankAccountController::class)
            ->name('bank-accounts.create');
        Route::get(RouteParams::ID, ShowBankAccountController::class)
            ->name('bank-accounts.show');
        Route::put(RouteParams::ID, UpdateBankAccountController::class)
            ->name('bank-accounts.update');
        Route::delete(RouteParams::ID, DeleteBankAccountController::class)
            ->name('bank-accounts.delete');
    });

    // Cash Sessions
    Route::prefix('cash-sessions')->group(function () {
        Route::get('/', ListCashSessionsController::class)
            ->name('cash-sessions.list');
        Route::post('/', CreateCashSessionController::class)
            ->name('cash-sessions.create');
        Route::get(RouteParams::ID, ShowCashSessionController::class)
            ->name('cash-sessions.show');
        Route::put(RouteParams::ID, UpdateCashSessionController::class)
            ->name('cash-sessions.update');
        Route::post(RouteParams::ID_POST, PostCashSessionController::class)
            ->name('cash-sessions.post');
        Route::get('/{id}/summary', GetSessionSummaryController::class)
            ->name('cash-sessions.summary');
    });

    // Cash Adjustments
    Route::prefix('cash-adjustments')->group(function () {
        Route::get('/', ListCashAdjustmentsController::class)
            ->name('cash-adjustments.list');
        Route::post('/', CreateCashAdjustmentController::class)
            ->name('cash-adjustments.create');
        Route::get(RouteParams::ID, ShowCashAdjustmentController::class)
            ->name('cash-adjustments.show');
        Route::delete(RouteParams::ID, DeleteCashAdjustmentController::class)
            ->name('cash-adjustments.delete');
        Route::post(RouteParams::ID_POST, PostCashAdjustmentController::class)
            ->name('cash-adjustments.post');
    });

    // Cash Expenses
    Route::prefix('cash-expenses')->group(function () {
        Route::get('/', ListCashExpensesController::class)
            ->name('cash-expenses.list');
        Route::post('/', CreateCashExpenseController::class)
            ->name('cash-expenses.create');
        Route::get(RouteParams::ID, ShowCashExpenseController::class)
            ->name('cash-expenses.show');
        Route::put(RouteParams::ID, UpdateCashExpenseController::class)
            ->name('cash-expenses.update');
        Route::delete(RouteParams::ID, DeleteCashExpenseController::class)
            ->name('cash-expenses.delete');
        Route::post(RouteParams::ID_POST, PostCashExpenseController::class)
            ->name('cash-expenses.post');
    });
});
