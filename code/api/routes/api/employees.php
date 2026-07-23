<?php

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
use App\Http\Controllers\Api\V1\Employees\UpdateEmployeeVacationPolicyController;
use App\Http\Controllers\Api\V1\Leaves\ListLeaveTypesController;
use App\Http\Controllers\Api\V1\Leaves\RegisterDirectLeaveController;
use App\Http\Controllers\Api\V1\NegotiatedExtraDays\ListNegotiatedExtraDaysController;
use App\Http\Controllers\Api\V1\Punctuality\AssignBonusConfigController;
use App\Http\Controllers\Api\V1\Punctuality\GetEmployeeBonusConfigController;
use App\Http\Controllers\Api\V1\Schedules\CreateScheduleController;
use App\Http\Controllers\Api\V1\Schedules\CreateScheduleDayOverrideController;
use App\Http\Controllers\Api\V1\Schedules\CurrentScheduleController;
use App\Http\Controllers\Api\V1\Schedules\ListSchedulesController;
use App\Http\Controllers\Api\V1\Schedules\UpdateScheduleController;
use App\Http\Controllers\Api\V1\VacationRequests\ApproveVacationRequestController;
use App\Http\Controllers\Api\V1\VacationRequests\RegisterVacationRequestController;
use App\Http\Controllers\Api\V1\VacationRequests\RejectVacationRequestController;
use Illuminate\Support\Facades\Route;

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
    // Per-employee vacation policy override (contractual entitlement beyond the tenant default)
    Route::put('/{employee}/vacation-policy-override', UpdateEmployeeVacationPolicyController::class)->name('employees.vacation-policy-override.update')->middleware('permission:employees.update');
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
