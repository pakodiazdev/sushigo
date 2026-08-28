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
use App\Http\Controllers\CashAdjustments\CashRegisters\SuggestCashRegisterCodeController;
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
use App\Support\CashAdjustmentRouteParams;
use Illuminate\Support\Facades\Route;

// Cash Adjustments Module (All Protected)
// Route segments below use ULID public_id binding — see #293. Each segment
// name matches its controller's Eloquent-typed parameter (e.g. {cashRegister}
// -> CashRegister $cashRegister) so Laravel's implicit model binding resolves
// correctly via CashRegister::getRouteKeyName() = 'public_id'.
Route::middleware('auth:api')->group(function () {
    // Cash Registers
    Route::prefix('cash-registers')->group(function () {
        Route::get('/', ListCashRegistersController::class)
            ->name('cash-registers.list');
        // Declared before the {cashRegister} routes below so "next-code" is not
        // captured as a public_id binding.
        Route::get('/next-code', SuggestCashRegisterCodeController::class)
            ->name('cash-registers.next-code')
            ->middleware('permission:cash_registers.create');
        Route::post('/', CreateCashRegisterController::class)
            ->name('cash-registers.create');
        Route::get(CashAdjustmentRouteParams::CASH_REGISTER, ShowCashRegisterController::class)
            ->name('cash-registers.show');
        Route::put(CashAdjustmentRouteParams::CASH_REGISTER, UpdateCashRegisterController::class)
            ->name('cash-registers.update');
        Route::delete(CashAdjustmentRouteParams::CASH_REGISTER, DeleteCashRegisterController::class)
            ->name('cash-registers.delete');
    });

    // Cash Terminals
    Route::prefix('cash-terminals')->group(function () {
        Route::get('/', ListCashTerminalsController::class)
            ->name('cash-terminals.list');
        Route::post('/', CreateCashTerminalController::class)
            ->name('cash-terminals.create');
        Route::get(CashAdjustmentRouteParams::CASH_TERMINAL, ShowCashTerminalController::class)
            ->name('cash-terminals.show');
        Route::put(CashAdjustmentRouteParams::CASH_TERMINAL, UpdateCashTerminalController::class)
            ->name('cash-terminals.update');
        Route::delete(CashAdjustmentRouteParams::CASH_TERMINAL, DeleteCashTerminalController::class)
            ->name('cash-terminals.delete');
    });

    // Bank Accounts
    Route::prefix('bank-accounts')->group(function () {
        Route::get('/', ListBankAccountsController::class)
            ->name('bank-accounts.list');
        Route::post('/', CreateBankAccountController::class)
            ->name('bank-accounts.create');
        Route::get(CashAdjustmentRouteParams::BANK_ACCOUNT, ShowBankAccountController::class)
            ->name('bank-accounts.show');
        Route::put(CashAdjustmentRouteParams::BANK_ACCOUNT, UpdateBankAccountController::class)
            ->name('bank-accounts.update');
        Route::delete(CashAdjustmentRouteParams::BANK_ACCOUNT, DeleteBankAccountController::class)
            ->name('bank-accounts.delete');
    });

    // Cash Sessions
    Route::prefix('cash-sessions')->group(function () {
        Route::get('/', ListCashSessionsController::class)
            ->name('cash-sessions.list');
        Route::post('/', CreateCashSessionController::class)
            ->name('cash-sessions.create');
        Route::get(CashAdjustmentRouteParams::CASH_SESSION, ShowCashSessionController::class)
            ->name('cash-sessions.show');
        Route::put(CashAdjustmentRouteParams::CASH_SESSION, UpdateCashSessionController::class)
            ->name('cash-sessions.update');
        Route::post(CashAdjustmentRouteParams::CASH_SESSION.CashAdjustmentRouteParams::POST_ACTION, PostCashSessionController::class)
            ->name('cash-sessions.post');
        Route::get(CashAdjustmentRouteParams::CASH_SESSION.'/summary', GetSessionSummaryController::class)
            ->name('cash-sessions.summary');
    });

    // Cash Adjustments
    Route::prefix('cash-adjustments')->group(function () {
        Route::get('/', ListCashAdjustmentsController::class)
            ->name('cash-adjustments.list');
        Route::post('/', CreateCashAdjustmentController::class)
            ->name('cash-adjustments.create');
        Route::get(CashAdjustmentRouteParams::CASH_ADJUSTMENT, ShowCashAdjustmentController::class)
            ->name('cash-adjustments.show');
        Route::delete(CashAdjustmentRouteParams::CASH_ADJUSTMENT, DeleteCashAdjustmentController::class)
            ->name('cash-adjustments.delete');
        Route::post(CashAdjustmentRouteParams::CASH_ADJUSTMENT.CashAdjustmentRouteParams::POST_ACTION, PostCashAdjustmentController::class)
            ->name('cash-adjustments.post');
    });

    // Cash Expenses
    Route::prefix('cash-expenses')->group(function () {
        Route::get('/', ListCashExpensesController::class)
            ->name('cash-expenses.list');
        Route::post('/', CreateCashExpenseController::class)
            ->name('cash-expenses.create');
        Route::get(CashAdjustmentRouteParams::CASH_EXPENSE, ShowCashExpenseController::class)
            ->name('cash-expenses.show');
        Route::put(CashAdjustmentRouteParams::CASH_EXPENSE, UpdateCashExpenseController::class)
            ->name('cash-expenses.update');
        Route::delete(CashAdjustmentRouteParams::CASH_EXPENSE, DeleteCashExpenseController::class)
            ->name('cash-expenses.delete');
        Route::post(CashAdjustmentRouteParams::CASH_EXPENSE.CashAdjustmentRouteParams::POST_ACTION, PostCashExpenseController::class)
            ->name('cash-expenses.post');
    });
});
