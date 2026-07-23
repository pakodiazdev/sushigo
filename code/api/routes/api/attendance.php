<?php

use App\Http\Controllers\Api\V1\Attendances\BulkOvertimeDecisionController;
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
use App\Http\Controllers\Api\V1\NegotiatedExtraDays\CancelNegotiatedExtraDayController;
use App\Http\Controllers\Api\V1\NegotiatedExtraDays\RegisterNegotiatedExtraDayController;
use App\Http\Controllers\Api\V1\Overtime\ListOvertimeLftTiersController;
use App\Http\Controllers\Api\V1\Overtime\UpdateOvertimeLftTiersController;
use App\Http\Controllers\Api\V1\PayPeriods\ConfirmCloseController;
use App\Http\Controllers\Api\V1\PayPeriods\ExportPayPeriodController;
use App\Http\Controllers\Api\V1\PayPeriods\ListPayPeriodsController;
use App\Http\Controllers\Api\V1\PayPeriods\PreviewPayPeriodController;
use App\Http\Controllers\Api\V1\PayPeriods\ReclosePayPeriodController;
use App\Http\Controllers\Api\V1\PayPeriods\ReopenPayPeriodController;
use App\Http\Controllers\Api\V1\PayPeriods\ShowPayPeriodController;
use App\Http\Controllers\Api\V1\Punctuality\CreatePunctualityBonusGroupController;
use App\Http\Controllers\Api\V1\Punctuality\ListPunctualityBonusGroupsController;
use App\Http\Controllers\Api\V1\Punctuality\ListPunctualityRangesController;
use App\Http\Controllers\Api\V1\Punctuality\UpdatePunctualityRangesController;
use App\Http\Controllers\Api\V1\Reports\TodayReportController;
use App\Http\Controllers\Api\V1\Reports\WeeklySummaryController;
use App\Support\RouteParams;
use Illuminate\Support\Facades\Route;

// Attendances Module (All Protected)
Route::middleware('auth:api')->prefix('attendances')->name('attendances.')->group(function () {
    // Static routes first (must precede {id}/... wildcard routes)
    Route::get('today', TodayAttendanceController::class)->name('today');
    Route::post('check-in', RegisterCheckInController::class)->name('check-in');
    Route::post('day-status', MarkDayStatusController::class)->name('day-status');
    Route::post('close-day', CloseDayController::class)->name('close-day');
    Route::post('overtime-decisions/bulk', BulkOvertimeDecisionController::class)->name('overtime-decisions.bulk');
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
    Route::delete(RouteParams::ID, CancelNegotiatedExtraDayController::class)->name('negotiated-extra-days.destroy');
});

// Pay Periods Module
Route::middleware('auth:api')->prefix('pay-periods')->name('pay-periods.')->group(function () {
    Route::get('/preview', PreviewPayPeriodController::class)->name('preview');
    Route::get('/', ListPayPeriodsController::class)->name('index');
    Route::post('/', ConfirmCloseController::class)->name('close');
    Route::get('/{payPeriod}', ShowPayPeriodController::class)->name('show');
    Route::get('/{payPeriod}/export', ExportPayPeriodController::class)->name('export');
    Route::patch('/{payPeriod}/reopen', ReopenPayPeriodController::class)->name('reopen');
    Route::patch('/{payPeriod}/reclose', ReclosePayPeriodController::class)->name('reclose');
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
