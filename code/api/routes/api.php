<?php

use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\Auth\MeController;
use App\Http\Controllers\Api\V1\Auth\RegisterController;
use App\Http\Controllers\Api\V1\Employees\CreateEmployeeController;
use App\Http\Controllers\Api\V1\Employees\ListEmployeesController;
use App\Http\Controllers\Api\V1\Employees\ShowEmployeeController;
use App\Http\Controllers\Api\V1\Employees\UpdateEmployeeController;
use App\Http\Controllers\Api\V1\Employees\ToggleEmployeeActiveController;
use App\Http\Controllers\Api\V1\Items\CreateItemController;
use App\Http\Controllers\Api\V1\Items\CreateItemVariantController;
use App\Http\Controllers\Api\V1\Items\DeleteItemController;
use App\Http\Controllers\Api\V1\Items\DeleteItemVariantController;
use App\Http\Controllers\Api\V1\Items\ListItemsController;
use App\Http\Controllers\Api\V1\Items\ListItemVariantsController;
use App\Http\Controllers\Api\V1\Items\ShowItemController;
use App\Http\Controllers\Api\V1\Items\ShowItemVariantController;
use App\Http\Controllers\Api\V1\Items\UpdateItemController;
use App\Http\Controllers\Api\V1\Items\UpdateItemVariantController;
use App\Http\Controllers\Api\V1\Inventory\RegisterOpeningBalanceController;
use App\Http\Controllers\Api\V1\Inventory\RegisterStockOutController;
use App\Http\Controllers\Api\V1\InventoryLocation\CreateInventoryLocationController;
use App\Http\Controllers\Api\V1\InventoryLocation\DeleteInventoryLocationController;
use App\Http\Controllers\Api\V1\InventoryLocation\ListInventoryLocationsController;
use App\Http\Controllers\Api\V1\InventoryLocation\ShowInventoryLocationController;
use App\Http\Controllers\Api\V1\InventoryLocation\UpdateInventoryLocationController;
use App\Http\Controllers\Api\V1\OperatingUnit\CreateOperatingUnitController;
use App\Http\Controllers\Api\V1\OperatingUnit\DeleteOperatingUnitController;
use App\Http\Controllers\Api\V1\OperatingUnit\ListOperatingUnitsController;
use App\Http\Controllers\Api\V1\OperatingUnit\ShowOperatingUnitController;
use App\Http\Controllers\Api\V1\OperatingUnit\UpdateOperatingUnitController;
use App\Http\Controllers\Api\V1\OperatingUnitUser\AddUserToOperatingUnitController;
use App\Http\Controllers\Api\V1\OperatingUnitUser\ListOperatingUnitUsersController;
use App\Http\Controllers\Api\V1\OperatingUnitUser\RemoveUserFromOperatingUnitController;
use App\Http\Controllers\Api\V1\Stock\ListStockController;
use App\Http\Controllers\Api\V1\Stock\StockByLocationController;
use App\Http\Controllers\Api\V1\Stock\StockByVariantController;
use App\Http\Controllers\Api\V1\UnitsOfMeasure\CreateUnitOfMeasureController;
use App\Http\Controllers\Api\V1\UnitsOfMeasure\CreateUomConversionController;
use App\Http\Controllers\Api\V1\UnitsOfMeasure\DeleteUnitOfMeasureController;
use App\Http\Controllers\Api\V1\UnitsOfMeasure\DeleteUomConversionController;
use App\Http\Controllers\Api\V1\UnitsOfMeasure\ListUnitsOfMeasureController;
use App\Http\Controllers\Api\V1\UnitsOfMeasure\ListUomConversionsController;
use App\Http\Controllers\Api\V1\UnitsOfMeasure\ShowUnitOfMeasureController;
use App\Http\Controllers\Api\V1\UnitsOfMeasure\UpdateUnitOfMeasureController;
use Illuminate\Support\Facades\Route;

// V1 API Routes
Route::prefix('v1')->group(function () {
    // Health check endpoint
    Route::get('health', function () {
        $dbStatus = 'ok';
        $dbMessage = 'Database connection successful';

        try {
            \DB::connection()->getPdo();
            \DB::connection()->getDatabaseName();
        } catch (\Exception $e) {
            $dbStatus = 'error';
            $dbMessage = 'Database connection failed: ' . $e->getMessage();
        }

        return response()->json([
            'status' => $dbStatus === 'ok' ? 'ok' : 'error',
            'timestamp' => now()->toIso8601String(),
            'database' => [
                'status' => $dbStatus,
                'message' => $dbMessage
            ]
        ], $dbStatus === 'ok' ? 200 : 503);
    })->name('health');

    // Public auth routes
    Route::prefix('auth')->group(function () {
        Route::post('register', RegisterController::class)->name('auth.register');
        Route::post('login', LoginController::class)->name('auth.login');
    });

    // Protected auth routes
    Route::middleware('auth:api')->prefix('auth')->group(function () {
        Route::post('logout', LogoutController::class)->name('auth.logout');
        Route::get('me', MeController::class)->name('auth.me');
    });

    // Units of Measure (Public read, protected write)
    Route::prefix('units-of-measure')->group(function () {
        Route::get('/', ListUnitsOfMeasureController::class)->name('units-of-measure.list');
        Route::get('/{id}', ShowUnitOfMeasureController::class)->name('units-of-measure.show');

        Route::middleware('auth:api')->group(function () {
            Route::post('/', CreateUnitOfMeasureController::class)->name('units-of-measure.create');
            Route::put('/{id}', UpdateUnitOfMeasureController::class)->name('units-of-measure.update');
            Route::delete('/{id}', DeleteUnitOfMeasureController::class)->name('units-of-measure.delete');
        });
    });

    // UOM Conversions (Public read, protected write)
    Route::prefix('uom-conversions')->group(function () {
        Route::get('/', ListUomConversionsController::class)->name('uom-conversions.list');

        Route::middleware('auth:api')->group(function () {
            Route::post('/', CreateUomConversionController::class)->name('uom-conversions.create');
            Route::delete('/{id}', DeleteUomConversionController::class)->name('uom-conversions.delete');
        });
    });

    // Items (Public read, protected write)
    Route::prefix('items')->group(function () {
        Route::get('/', ListItemsController::class)->name('items.list');
        Route::get('/{id}', ShowItemController::class)->name('items.show');

        Route::middleware('auth:api')->group(function () {
            Route::post('/', CreateItemController::class)->name('items.create');
            Route::put('/{id}', UpdateItemController::class)->name('items.update');
            Route::delete('/{id}', DeleteItemController::class)->name('items.delete');
        });
    });

    // Item Variants (Public read, protected write)
    Route::prefix('item-variants')->group(function () {
        Route::get('/', ListItemVariantsController::class)->name('item-variants.list');
        Route::get('/{id}', ShowItemVariantController::class)->name('item-variants.show');

        Route::middleware('auth:api')->group(function () {
            Route::post('/', CreateItemVariantController::class)->name('item-variants.create');
            Route::put('/{id}', UpdateItemVariantController::class)->name('item-variants.update');
            Route::delete('/{id}', DeleteItemVariantController::class)->name('item-variants.delete');
        });
    });

    // Inventory Locations (Public read, protected write)
    Route::prefix('inventory-locations')->group(function () {
        Route::get('/', ListInventoryLocationsController::class)->name('inventory-locations.list');
        Route::get('/{id}', ShowInventoryLocationController::class)->name('inventory-locations.show');

        Route::middleware('auth:api')->group(function () {
            Route::post('/', CreateInventoryLocationController::class)->name('inventory-locations.create');
            Route::put('/{id}', UpdateInventoryLocationController::class)->name('inventory-locations.update');
            Route::delete('/{id}', DeleteInventoryLocationController::class)->name('inventory-locations.delete');
        });
    });

    // Operating Units (Public read, protected write)
    Route::prefix('operating-units')->group(function () {
        Route::get('/', ListOperatingUnitsController::class)->name('operating-units.list');
        Route::get('/{id}', ShowOperatingUnitController::class)->name('operating-units.show');

        Route::middleware('auth:api')->group(function () {
            Route::post('/', CreateOperatingUnitController::class)->name('operating-units.create');
            Route::put('/{id}', UpdateOperatingUnitController::class)->name('operating-units.update');
            Route::delete('/{id}', DeleteOperatingUnitController::class)->name('operating-units.delete');
        });
    });

    // Operating Unit Users (Public read, protected write)
    Route::prefix('operating-units/{id}/users')->group(function () {
        Route::get('/', ListOperatingUnitUsersController::class)->name('operating-unit-users.list');

        Route::middleware('auth:api')->group(function () {
            Route::post('/', AddUserToOperatingUnitController::class)->name('operating-unit-users.add');
            Route::delete('/{userId}', RemoveUserFromOperatingUnitController::class)->name('operating-unit-users.remove');
        });
    });

    // Stock Query Endpoints (Public read)
    Route::prefix('stock')->group(function () {
        Route::get('/', ListStockController::class)->name('stock.list');
        Route::get('/by-location/{id}', StockByLocationController::class)->name('stock.by-location');
        Route::get('/by-variant/{id}', StockByVariantController::class)->name('stock.by-variant');
    });

    // Inventory Operations (Protected)
    Route::middleware('auth:api')->prefix('inventory')->group(function () {
        Route::post('opening-balance', RegisterOpeningBalanceController::class)->name('inventory.opening-balance');
        Route::post('stock-out', RegisterStockOutController::class)->name('inventory.stock-out');
    });

    // Employees (All Protected)
    Route::middleware('auth:api')->prefix('employees')->group(function () {
        Route::get('/', ListEmployeesController::class)->name('employees.list')->middleware('permission:employees.view');
        Route::post('/', CreateEmployeeController::class)->name('employees.create')->middleware('permission:employees.create');
        Route::get('/{employee}', ShowEmployeeController::class)->name('employees.show')->middleware('permission:employees.view');
        Route::put('/{employee}', UpdateEmployeeController::class)->name('employees.update')->middleware('permission:employees.update');
        Route::patch('/{employee}/toggle-active', ToggleEmployeeActiveController::class)->name('employees.toggle-active')->middleware('permission:employees.update');
    });

    // Cash Adjustments Module (All Protected)
    Route::middleware('auth:api')->group(function () {
        // Cash Registers
        Route::prefix('cash-registers')->group(function () {
            Route::get('/', \App\Http\Controllers\CashAdjustments\CashRegisters\ListCashRegistersController::class)
                ->name('cash-registers.list');
            Route::post('/', \App\Http\Controllers\CashAdjustments\CashRegisters\CreateCashRegisterController::class)
                ->name('cash-registers.create');
            Route::get('/{id}', \App\Http\Controllers\CashAdjustments\CashRegisters\ShowCashRegisterController::class)
                ->name('cash-registers.show');
            Route::put('/{id}', \App\Http\Controllers\CashAdjustments\CashRegisters\UpdateCashRegisterController::class)
                ->name('cash-registers.update');
            Route::delete('/{id}', \App\Http\Controllers\CashAdjustments\CashRegisters\DeleteCashRegisterController::class)
                ->name('cash-registers.delete');
        });

        // Cash Terminals
        Route::prefix('cash-terminals')->group(function () {
            Route::get('/', \App\Http\Controllers\CashAdjustments\CashTerminals\ListCashTerminalsController::class)
                ->name('cash-terminals.list');
            Route::post('/', \App\Http\Controllers\CashAdjustments\CashTerminals\CreateCashTerminalController::class)
                ->name('cash-terminals.create');
            Route::get('/{id}', \App\Http\Controllers\CashAdjustments\CashTerminals\ShowCashTerminalController::class)
                ->name('cash-terminals.show');
            Route::put('/{id}', \App\Http\Controllers\CashAdjustments\CashTerminals\UpdateCashTerminalController::class)
                ->name('cash-terminals.update');
            Route::delete('/{id}', \App\Http\Controllers\CashAdjustments\CashTerminals\DeleteCashTerminalController::class)
                ->name('cash-terminals.delete');
        });

        // Bank Accounts
        Route::prefix('bank-accounts')->group(function () {
            Route::get('/', \App\Http\Controllers\CashAdjustments\BankAccounts\ListBankAccountsController::class)
                ->name('bank-accounts.list');
            Route::post('/', \App\Http\Controllers\CashAdjustments\BankAccounts\CreateBankAccountController::class)
                ->name('bank-accounts.create');
            Route::get('/{id}', \App\Http\Controllers\CashAdjustments\BankAccounts\ShowBankAccountController::class)
                ->name('bank-accounts.show');
            Route::put('/{id}', \App\Http\Controllers\CashAdjustments\BankAccounts\UpdateBankAccountController::class)
                ->name('bank-accounts.update');
            Route::delete('/{id}', \App\Http\Controllers\CashAdjustments\BankAccounts\DeleteBankAccountController::class)
                ->name('bank-accounts.delete');
        });

        // Cash Sessions
        Route::prefix('cash-sessions')->group(function () {
            Route::get('/', \App\Http\Controllers\CashAdjustments\CashSessions\ListCashSessionsController::class)
                ->name('cash-sessions.list');
            Route::post('/', \App\Http\Controllers\CashAdjustments\CashSessions\CreateCashSessionController::class)
                ->name('cash-sessions.create');
            Route::get('/{id}', \App\Http\Controllers\CashAdjustments\CashSessions\ShowCashSessionController::class)
                ->name('cash-sessions.show');
            Route::put('/{id}', \App\Http\Controllers\CashAdjustments\CashSessions\UpdateCashSessionController::class)
                ->name('cash-sessions.update');
            Route::post('/{id}/post', \App\Http\Controllers\CashAdjustments\CashSessions\PostCashSessionController::class)
                ->name('cash-sessions.post');
            Route::get('/{id}/summary', \App\Http\Controllers\CashAdjustments\CashSessions\GetSessionSummaryController::class)
                ->name('cash-sessions.summary');
        });

        // Cash Adjustments
        Route::prefix('cash-adjustments')->group(function () {
            Route::get('/', \App\Http\Controllers\CashAdjustments\CashAdjustments\ListCashAdjustmentsController::class)
                ->name('cash-adjustments.list');
            Route::post('/', \App\Http\Controllers\CashAdjustments\CashAdjustments\CreateCashAdjustmentController::class)
                ->name('cash-adjustments.create');
            Route::get('/{id}', \App\Http\Controllers\CashAdjustments\CashAdjustments\ShowCashAdjustmentController::class)
                ->name('cash-adjustments.show');
            Route::delete('/{id}', \App\Http\Controllers\CashAdjustments\CashAdjustments\DeleteCashAdjustmentController::class)
                ->name('cash-adjustments.delete');
            Route::post('/{id}/post', \App\Http\Controllers\CashAdjustments\CashAdjustments\PostCashAdjustmentController::class)
                ->name('cash-adjustments.post');
        });

        // Cash Expenses
        Route::prefix('cash-expenses')->group(function () {
            Route::get('/', \App\Http\Controllers\CashAdjustments\CashExpenses\ListCashExpensesController::class)
                ->name('cash-expenses.list');
            Route::post('/', \App\Http\Controllers\CashAdjustments\CashExpenses\CreateCashExpenseController::class)
                ->name('cash-expenses.create');
            Route::get('/{id}', \App\Http\Controllers\CashAdjustments\CashExpenses\ShowCashExpenseController::class)
                ->name('cash-expenses.show');
            Route::put('/{id}', \App\Http\Controllers\CashAdjustments\CashExpenses\UpdateCashExpenseController::class)
                ->name('cash-expenses.update');
            Route::delete('/{id}', \App\Http\Controllers\CashAdjustments\CashExpenses\DeleteCashExpenseController::class)
                ->name('cash-expenses.delete');
            Route::post('/{id}/post', \App\Http\Controllers\CashAdjustments\CashExpenses\PostCashExpenseController::class)
                ->name('cash-expenses.post');
        });
    });
});
