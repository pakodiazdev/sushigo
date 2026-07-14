<?php

use App\Contracts\PasswordResetTokenRecorder;
use App\Http\Controllers\Api\V1\Attendances\CloseDayController;
use App\Http\Controllers\Api\V1\Attendances\MarkDayStatusController;
use App\Http\Controllers\Api\V1\Attendances\OvertimeDecisionController;
use App\Http\Controllers\Api\V1\Attendances\PreviewOvertimeValuationController;
use App\Http\Controllers\Api\V1\Attendances\RegisterCheckInController;
use App\Http\Controllers\Api\V1\Attendances\RegisterCheckOutController;
use App\Http\Controllers\Api\V1\Attendances\RegisterLunchReturnController;
use App\Http\Controllers\Api\V1\Attendances\RegisterLunchStartController;
use App\Http\Controllers\Api\V1\Attendances\TodayAttendanceController;
use App\Http\Controllers\Api\V1\AuditLogs\ListAuditLogsController;
use App\Http\Controllers\Api\V1\Auth\ForgotPasswordController;
use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\Auth\MeController;
use App\Http\Controllers\Api\V1\Auth\RegisterController;
use App\Http\Controllers\Api\V1\Auth\ResetPasswordController;
use App\Http\Controllers\Api\V1\Auth\VerifyResetTokenController;
use App\Http\Controllers\Api\V1\Dev\DevLoginController;
use App\Http\Controllers\Api\V1\Dev\ListDevUsersController;
use App\Http\Controllers\Api\V1\Devtools\GetClockController;
use App\Http\Controllers\Api\V1\Devtools\ResetClockController;
use App\Http\Controllers\Api\V1\Devtools\SeedPayrollController;
use App\Http\Controllers\Api\V1\Devtools\SetClockController;
use App\Http\Controllers\Api\V1\Devtools\ShiftClockController;
use App\Http\Controllers\Api\V1\EmployeeRequests\ApproveEmployeeRequestController;
use App\Http\Controllers\Api\V1\EmployeeRequests\CancelEmployeeRequestController;
use App\Http\Controllers\Api\V1\EmployeeRequests\CreateEmployeeRequestController;
use App\Http\Controllers\Api\V1\EmployeeRequests\ListEmployeeRequestsController;
use App\Http\Controllers\Api\V1\EmployeeRequests\RejectEmployeeRequestController;
use App\Http\Controllers\Api\V1\Employees\AssignableRolesController;
use App\Http\Controllers\Api\V1\Employees\CreateEmployeeController;
use App\Http\Controllers\Api\V1\Employees\CreateManualOvertimeMovementController;
use App\Http\Controllers\Api\V1\Employees\CreateWageController;
use App\Http\Controllers\Api\V1\Employees\DeactivateEmployeeController;
use App\Http\Controllers\Api\V1\Employees\GetMyEmployeeController;
use App\Http\Controllers\Api\V1\Employees\GetUserPermissionsController;
use App\Http\Controllers\Api\V1\Employees\ListEmployeeLeavesController;
use App\Http\Controllers\Api\V1\Employees\ListEmployeesController;
use App\Http\Controllers\Api\V1\Employees\ListEmployeeVacationRequestsController;
use App\Http\Controllers\Api\V1\Employees\ListVacationEntitlementsController;
use App\Http\Controllers\Api\V1\Employees\ListWagesController;
use App\Http\Controllers\Api\V1\Employees\RehireEmployeeController;
use App\Http\Controllers\Api\V1\Employees\ShowEmployeeController;
use App\Http\Controllers\Api\V1\Employees\ShowOvertimeBankController;
use App\Http\Controllers\Api\V1\Employees\SuggestEmployeeCodeController;
use App\Http\Controllers\Api\V1\Employees\SyncUserDirectPermissionsController;
use App\Http\Controllers\Api\V1\Employees\ToggleEmployeeActiveController;
use App\Http\Controllers\Api\V1\Employees\UpdateEmployeeController;
use App\Http\Controllers\Api\V1\Holidays\CreateHolidayController;
use App\Http\Controllers\Api\V1\Holidays\CreateHolidayDefinitionController;
use App\Http\Controllers\Api\V1\Holidays\DeleteHolidayController;
use App\Http\Controllers\Api\V1\Holidays\DeleteHolidayDefinitionController;
use App\Http\Controllers\Api\V1\Holidays\ListHolidayDefinitionsController;
use App\Http\Controllers\Api\V1\Holidays\ListHolidaysController;
use App\Http\Controllers\Api\V1\Holidays\UpdateHolidayController;
use App\Http\Controllers\Api\V1\Holidays\UpdateHolidayDefinitionController;
use App\Http\Controllers\Api\V1\Inventory\RegisterOpeningBalanceController;
use App\Http\Controllers\Api\V1\Inventory\RegisterStockOutController;
use App\Http\Controllers\Api\V1\InventoryLocation\CreateInventoryLocationController;
use App\Http\Controllers\Api\V1\InventoryLocation\DeleteInventoryLocationController;
use App\Http\Controllers\Api\V1\InventoryLocation\ListInventoryLocationsController;
use App\Http\Controllers\Api\V1\InventoryLocation\ShowInventoryLocationController;
use App\Http\Controllers\Api\V1\InventoryLocation\UpdateInventoryLocationController;
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
use App\Http\Controllers\Api\V1\Leaves\ListLeaveTypesController;
use App\Http\Controllers\Api\V1\Leaves\RegisterDirectLeaveController;
use App\Http\Controllers\Api\V1\NegotiatedExtraDays\CancelNegotiatedExtraDayController;
use App\Http\Controllers\Api\V1\NegotiatedExtraDays\ListNegotiatedExtraDaysController;
use App\Http\Controllers\Api\V1\NegotiatedExtraDays\RegisterNegotiatedExtraDayController;
use App\Http\Controllers\Api\V1\OperatingUnit\CreateOperatingUnitController;
use App\Http\Controllers\Api\V1\OperatingUnit\DeleteOperatingUnitController;
use App\Http\Controllers\Api\V1\OperatingUnit\ListOperatingUnitsController;
use App\Http\Controllers\Api\V1\OperatingUnit\ShowOperatingUnitController;
use App\Http\Controllers\Api\V1\OperatingUnit\UpdateOperatingUnitController;
use App\Http\Controllers\Api\V1\OperatingUnitUser\AddUserToOperatingUnitController;
use App\Http\Controllers\Api\V1\OperatingUnitUser\ListOperatingUnitUsersController;
use App\Http\Controllers\Api\V1\OperatingUnitUser\RemoveUserFromOperatingUnitController;
use App\Http\Controllers\Api\V1\Overtime\ListOvertimeLftTiersController;
use App\Http\Controllers\Api\V1\Overtime\UpdateOvertimeLftTiersController;
use App\Http\Controllers\Api\V1\PayPeriods\ConfirmCloseController;
use App\Http\Controllers\Api\V1\PayPeriods\PreviewPayPeriodController;
use App\Http\Controllers\Api\V1\Punctuality\AssignBonusConfigController;
use App\Http\Controllers\Api\V1\Punctuality\CreatePunctualityBonusGroupController;
use App\Http\Controllers\Api\V1\Punctuality\GetEmployeeBonusConfigController;
use App\Http\Controllers\Api\V1\Punctuality\ListPunctualityBonusGroupsController;
use App\Http\Controllers\Api\V1\Punctuality\ListPunctualityRangesController;
use App\Http\Controllers\Api\V1\Punctuality\UpdatePunctualityRangesController;
use App\Http\Controllers\Api\V1\Reports\TodayReportController;
use App\Http\Controllers\Api\V1\Reports\WeeklySummaryController;
use App\Http\Controllers\Api\V1\Schedules\CreateScheduleController;
use App\Http\Controllers\Api\V1\Schedules\CreateScheduleDayOverrideController;
use App\Http\Controllers\Api\V1\Schedules\CurrentScheduleController;
use App\Http\Controllers\Api\V1\Schedules\ListSchedulesController;
use App\Http\Controllers\Api\V1\Schedules\UpdateScheduleController;
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
use App\Http\Controllers\Api\V1\VacationRequests\ApproveVacationRequestController;
use App\Http\Controllers\Api\V1\VacationRequests\RegisterVacationRequestController;
use App\Http\Controllers\Api\V1\VacationRequests\RejectVacationRequestController;
use Illuminate\Support\Facades\Route;

// ── Test-only routes (never exposed in production) ───────────────────────
if (app()->environment('testing', 'local', 'dev', 'devtest')) {
    Route::prefix('v1/test')->name('test.')->group(function () {
        Route::get('reset-link/{email}', function (string $email) {
            $recorder = app(PasswordResetTokenRecorder::class);
            $link = $recorder->retrieve($email);

            if (! $link) {
                return response()->json(['link' => null], 404);
            }

            return response()->json(['link' => $link]);
        })->name('reset-link');
    });

    // ── Dev debug login routes ────────────────────────────────────────────
    Route::prefix('v1/dev')->name('dev.')->group(function () {
        Route::get('users', ListDevUsersController::class)->name('users');
        Route::post('login', DevLoginController::class)->name('login');
    });

    // ── Devtools clock simulation routes ──────────────────────────────────
    // Protected by ClockSimulationGuard (env check + feature flag)
    Route::prefix('v1/devtools/clock')->name('devtools.clock.')->group(function () {
        Route::get('/', GetClockController::class)->name('get');
        Route::post('set', SetClockController::class)->name('set');
        Route::post('shift', ShiftClockController::class)->name('shift');
        Route::post('reset', ResetClockController::class)->name('reset');
    });

    // ── Devtools payroll seed route ────────────────────────────────────────
    // Protected by PayrollSeedGuard (env check + feature flag)
    Route::prefix('v1/devtools/payroll')->name('devtools.payroll.')->middleware('auth:api')->group(function () {
        Route::post('seed', SeedPayrollController::class)->name('seed');
    });
}

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
            $dbMessage = 'Database connection failed: '.$e->getMessage();
        }

        return response()->json([
            'status' => $dbStatus === 'ok' ? 'ok' : 'error',
            'timestamp' => now()->toIso8601String(),
            'database' => [
                'status' => $dbStatus,
                'message' => $dbMessage,
            ],
        ], $dbStatus === 'ok' ? 200 : 503);
    })->name('health');

    // Public auth routes
    Route::prefix('auth')->group(function () {
        Route::post('register', RegisterController::class)->name('auth.register');
        Route::post('login', LoginController::class)->name('auth.login');
        Route::post('forgot-password', ForgotPasswordController::class)->name('auth.forgot-password');
        Route::post('verify-reset-token', VerifyResetTokenController::class)->name('auth.verify-reset-token');
        Route::post('reset-password', ResetPasswordController::class)->name('auth.reset-password');
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

    // Items (Protected read + write — requires items.view / items.create / items.update / items.delete)
    Route::middleware('auth:api')->prefix('items')->group(function () {
        Route::get('/', ListItemsController::class)->name('items.list')->middleware('permission:items.view');
        Route::get('/{id}', ShowItemController::class)->name('items.show')->middleware('permission:items.view');
        Route::post('/', CreateItemController::class)->name('items.create')->middleware('permission:items.create');
        Route::put('/{id}', UpdateItemController::class)->name('items.update')->middleware('permission:items.update');
        Route::delete('/{id}', DeleteItemController::class)->name('items.delete')->middleware('permission:items.delete');
    });

    // Item Variants (Protected read + write — inherits items.* permissions)
    Route::middleware('auth:api')->prefix('item-variants')->group(function () {
        Route::get('/', ListItemVariantsController::class)->name('item-variants.list')->middleware('permission:items.view');
        Route::get('/{id}', ShowItemVariantController::class)->name('item-variants.show')->middleware('permission:items.view');
        Route::post('/', CreateItemVariantController::class)->name('item-variants.create')->middleware('permission:items.create');
        Route::put('/{id}', UpdateItemVariantController::class)->name('item-variants.update')->middleware('permission:items.update');
        Route::delete('/{id}', DeleteItemVariantController::class)->name('item-variants.delete')->middleware('permission:items.delete');
    });

    // Inventory Locations (Protected read + write)
    Route::middleware('auth:api')->prefix('inventory-locations')->group(function () {
        Route::get('/', ListInventoryLocationsController::class)->name('inventory-locations.list')->middleware('permission:inventory_locations.view');
        Route::get('/{id}', ShowInventoryLocationController::class)->name('inventory-locations.show')->middleware('permission:inventory_locations.view');
        Route::post('/', CreateInventoryLocationController::class)->name('inventory-locations.create')->middleware('permission:inventory_locations.manage');
        Route::put('/{id}', UpdateInventoryLocationController::class)->name('inventory-locations.update')->middleware('permission:inventory_locations.manage');
        Route::delete('/{id}', DeleteInventoryLocationController::class)->name('inventory-locations.delete')->middleware('permission:inventory_locations.manage');
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

    // Stock Query Endpoints (Protected read — requires stock.view)
    Route::middleware('auth:api')->prefix('stock')->group(function () {
        Route::get('/', ListStockController::class)->name('stock.list')->middleware('permission:stock.view');
        Route::get('/by-location/{id}', StockByLocationController::class)->name('stock.by-location')->middleware('permission:stock.view');
        Route::get('/by-variant/{id}', StockByVariantController::class)->name('stock.by-variant')->middleware('permission:stock.view');
    });

    // Inventory Operations (Protected write — requires stock.manage)
    Route::middleware('auth:api')->prefix('inventory')->group(function () {
        Route::post('opening-balance', RegisterOpeningBalanceController::class)->name('inventory.opening-balance')->middleware('permission:stock.manage');
        Route::post('stock-out', RegisterStockOutController::class)->name('inventory.stock-out')->middleware('permission:stock.manage');
    });

    // Employees (All Protected)
    Route::middleware('auth:api')->prefix('employees')->group(function () {
        Route::get('/', ListEmployeesController::class)->name('employees.list')->middleware('permission:employees.view');
        Route::get('/next-code', SuggestEmployeeCodeController::class)->name('employees.next-code')->middleware('permission:employees.create');
        Route::get('/assignable-roles', AssignableRolesController::class)->name('employees.assignable-roles')->middleware('permission:employees.view');
        Route::get('/me', GetMyEmployeeController::class)->name('employees.me');
        Route::post('/', CreateEmployeeController::class)->name('employees.create')->middleware('permission:employees.create');
        Route::get('/{employee}', ShowEmployeeController::class)->name('employees.show')->middleware('permission:employees.view');
        Route::put('/{employee}', UpdateEmployeeController::class)->name('employees.update')->middleware('permission:employees.update');
        Route::patch('/{employee}/toggle-active', ToggleEmployeeActiveController::class)->name('employees.toggle-active')->middleware('permission:employees.update');
        Route::patch('/{employee}/deactivate', DeactivateEmployeeController::class)->name('employees.deactivate')->middleware('permission:employees.update');
        Route::patch('/{employee}/rehire', RehireEmployeeController::class)->name('employees.rehire')->middleware('permission:employees.update');
        // Wage history endpoints
        Route::get('/{employee}/wages', ListWagesController::class)->name('employees.wages.list')->middleware('permission:employees.view');
        Route::post('/{employee}/wages', CreateWageController::class)->name('employees.wages.create')->middleware('permission:employees.update');
        // Schedule endpoints
        Route::get('/{employee}/current-schedule', CurrentScheduleController::class)->name('employees.schedule.current');
        // Leave history endpoints
        Route::get('/{employee}/leaves', ListEmployeeLeavesController::class)->name('employees.leaves.list')->middleware('permission:employees.view');
        // Negotiated extra days history endpoints
        Route::get('/{employee}/negotiated-extra-days', ListNegotiatedExtraDaysController::class)->name('employees.negotiated-extra-days.list')->middleware('permission:employees.view');
        // Vacation entitlement endpoints (auto-generated on read, no manual registration)
        // employees.view sees any employee; employee-requests.create (held by every
        // self-service role) only unlocks the route so an employee can see their own
        // balance while filling the self-service form — the controller itself
        // restricts those callers to their own linked employee.
        Route::get('/{employee}/vacation-entitlements', ListVacationEntitlementsController::class)->name('employees.vacation-entitlements.list')->middleware('permission:employees.view|employee-requests.create');
        // Vacation request history endpoints (same self-service scoping as above)
        Route::get('/{employee}/vacation-requests', ListEmployeeVacationRequestsController::class)->name('employees.vacation-requests.list')->middleware('permission:employees.view|employee-requests.create');
        // Overtime bank balance + movement history (same self-service scoping as above)
        Route::get('/{employee}/overtime-bank', ShowOvertimeBankController::class)->name('employees.overtime-bank.show')->middleware('permission:employees.view|employee-requests.create');
        Route::post('/{employee}/overtime-bank/movements', CreateManualOvertimeMovementController::class)->name('employees.overtime-bank.movements.create')->middleware('permission:employees.update');
        // Direct permission management
        Route::get('/{employee}/permissions', GetUserPermissionsController::class)->name('employees.permissions.get')->middleware('permission:users.show');
        Route::put('/{employee}/permissions', SyncUserDirectPermissionsController::class)->name('employees.permissions.sync')->middleware('permission:users.update');
        // Bonus config
        Route::get('/{employee}/bonus-config', GetEmployeeBonusConfigController::class)->name('employees.bonus-config.get')->middleware('permission:employees.view');
        Route::post('/{employee}/bonus-config', AssignBonusConfigController::class)->name('employees.bonus-config.assign')->middleware('permission:employees.update');
    });

    // Employment Periods — Schedules (All Protected)
    Route::middleware('auth:api')->prefix('employment-periods')->name('employment-periods.')->group(function () {
        Route::get('/{employmentPeriod}/schedules', ListSchedulesController::class)
            ->name('schedules.index')
            ->middleware('permission:employees.view');
        Route::post('/{employmentPeriod}/schedules', CreateScheduleController::class)
            ->name('schedules.create')
            ->middleware('permission:employees.update');
        Route::post('/{employmentPeriod}/schedule-day-overrides', CreateScheduleDayOverrideController::class)
            ->name('schedule-day-overrides.create')
            ->middleware('permission:employees.update');
    });

    // Schedules — direct access by schedule id (All Protected)
    Route::middleware('auth:api')->prefix('schedules')->name('schedules.')->group(function () {
        Route::put('/{schedule}', UpdateScheduleController::class)
            ->name('update')
            ->middleware('permission:employees.update');
    });

    // Leave Types Module (All Protected)
    Route::middleware('auth:api')->prefix('leave-types')->name('leave-types.')->group(function () {
        Route::get('/', ListLeaveTypesController::class)->name('index');
    });

    // Leaves Module (All Protected)
    // Only direct/express registration lives here — anticipated (PENDING → approved)
    // leave requests go through the generic Employee Requests module (type=LEAVE).
    Route::middleware('auth:api')->prefix('leaves')->name('leaves.')->group(function () {
        Route::post('/', RegisterDirectLeaveController::class)->name('register-direct')->middleware('permission:leaves.register-direct');
    });

    // Vacation Requests Module (All Protected)
    Route::middleware('auth:api')->prefix('vacation-requests')->name('vacation-requests.')->group(function () {
        Route::post('/', RegisterVacationRequestController::class)->name('register')->middleware('permission:vacation-requests.schedule');
        Route::patch('/{id}/approve', ApproveVacationRequestController::class)->name('approve')->middleware('permission:vacation-requests.approve');
        Route::patch('/{id}/reject', RejectVacationRequestController::class)->name('reject')->middleware('permission:vacation-requests.reject');
    });

    // Employee Requests Module (All Protected)
    Route::middleware('auth:api')->prefix('employee-requests')->name('employee-requests.')->group(function () {
        Route::get('/', ListEmployeeRequestsController::class)->name('index')->middleware('permission:employee-requests.view');
        Route::post('/', CreateEmployeeRequestController::class)->name('store')->middleware('permission:employee-requests.create');
        Route::patch('/{id}/approve', ApproveEmployeeRequestController::class)->name('approve')->middleware('permission:employee-requests.approve');
        Route::patch('/{id}/reject', RejectEmployeeRequestController::class)->name('reject')->middleware('permission:employee-requests.approve');
        Route::patch('/{id}/cancel', CancelEmployeeRequestController::class)->name('cancel')->middleware('permission:employee-requests.cancel|employee-requests.approve');
    });

    // Attendances Module (All Protected)
    Route::middleware('auth:api')->prefix('attendances')->name('attendances.')->group(function () {
        // Static routes first (must precede {id}/... wildcard routes)
        Route::get('today', TodayAttendanceController::class)->name('today');
        Route::post('check-in', RegisterCheckInController::class)->name('check-in');
        Route::post('day-status', MarkDayStatusController::class)->name('day-status');
        Route::post('close-day', CloseDayController::class)->name('close-day');
        // Per-attendance actions (identified by public_id)
        Route::patch('{id}/lunch-start', RegisterLunchStartController::class)->name('lunch-start');
        Route::patch('{id}/lunch-return', RegisterLunchReturnController::class)->name('lunch-return');
        Route::patch('{id}/check-out', RegisterCheckOutController::class)->name('check-out');
        Route::patch('{id}/overtime-decision', OvertimeDecisionController::class)->name('overtime-decision');
        Route::get('{id}/overtime-preview', PreviewOvertimeValuationController::class)->name('overtime-preview');
    });

    // Reports Module
    Route::middleware('auth:api')->prefix('reports')->name('reports.')->group(function () {
        Route::get('today', TodayReportController::class)->name('today');
        Route::get('weekly-summary', WeeklySummaryController::class)->name('weekly-summary');
    });

    // Audit Logs Module (All Protected)
    Route::middleware('auth:api')->prefix('audit-logs')->name('audit-logs.')->group(function () {
        Route::get('/', ListAuditLogsController::class)->name('index')->middleware('permission:audit-logs.view');
    });

    // Negotiated Extra Days Module (All Protected)
    Route::middleware(['auth:api', 'permission:attendances.create'])->prefix('negotiated-extra-days')->name('negotiated-extra-days.')->group(function () {
        Route::post('/', RegisterNegotiatedExtraDayController::class)->name('store');
    });

    Route::middleware('auth:api')->prefix('negotiated-extra-days')->group(function () {
        Route::delete('/{id}', CancelNegotiatedExtraDayController::class)->name('negotiated-extra-days.destroy');
    });

    // Pay Periods Module
    Route::middleware('auth:api')->prefix('pay-periods')->name('pay-periods.')->group(function () {
        Route::get('/preview', PreviewPayPeriodController::class)->name('preview');
        Route::post('/', ConfirmCloseController::class)->name('close');
    });

    // Punctuality config
    Route::middleware('auth:api')->prefix('punctuality')->name('punctuality.')->group(function () {
        Route::get('/ranges', ListPunctualityRangesController::class)->name('ranges.index')->middleware('permission:punctuality.manage');
        Route::put('/ranges', UpdatePunctualityRangesController::class)->name('ranges.update')->middleware('permission:punctuality.manage');
        Route::get('/bonus-groups', ListPunctualityBonusGroupsController::class)->name('bonus-groups.index')->middleware('permission:punctuality.manage|employees.update');
        Route::post('/bonus-groups', CreatePunctualityBonusGroupController::class)->name('bonus-groups.store')->middleware('permission:punctuality.manage');
    });

    // Overtime Module (All Protected)
    Route::middleware('auth:api')->prefix('overtime')->name('overtime.')->group(function () {
        Route::get('/lft-tiers', ListOvertimeLftTiersController::class)->name('lft-tiers.index')->middleware('permission:overtime.manage');
        Route::put('/lft-tiers', UpdateOvertimeLftTiersController::class)->name('lft-tiers.update')->middleware('permission:overtime.manage');
    });

    // Holidays Module (All Protected — requires holidays.manage)
    Route::middleware(['auth:api', 'permission:holidays.manage'])->group(function () {
        Route::prefix('holidays')->name('holidays.')->group(function () {
            Route::get('/', ListHolidaysController::class)->name('index');
            Route::post('/', CreateHolidayController::class)->name('store');
            Route::put('/{id}', UpdateHolidayController::class)->name('update');
            Route::delete('/{id}', DeleteHolidayController::class)->name('destroy');
        });

        Route::prefix('holiday-definitions')->name('holiday-definitions.')->group(function () {
            Route::get('/', ListHolidayDefinitionsController::class)->name('index');
            Route::post('/', CreateHolidayDefinitionController::class)->name('store');
            Route::put('/{holidayDefinition}', UpdateHolidayDefinitionController::class)->name('update');
            Route::delete('/{holidayDefinition}', DeleteHolidayDefinitionController::class)->name('destroy');
        });
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
