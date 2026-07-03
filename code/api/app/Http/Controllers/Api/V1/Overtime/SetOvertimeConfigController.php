<?php

namespace App\Http\Controllers\Api\V1\Overtime;

use App\Http\Controllers\Controller;
use App\Http\Requests\Overtime\SetOvertimeConfigRequest;
use App\Http\Resources\Overtime\OvertimePayConfigResource;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SetOvertimeConfigController extends Controller
{
    public function __invoke(SetOvertimeConfigRequest $request, Employee $employee): OvertimePayConfigResource
    {
        $effectiveFrom = Carbon::parse($request->effective_from)->startOfDay();

        $config = DB::transaction(function () use ($request, $employee, $effectiveFrom) {
            // Delete all configs starting on or after the new date (open or already closed by a later assignment)
            $employee->overtimePayConfigs()
                ->where('effective_from', '>=', $effectiveFrom->toDateString())
                ->delete();

            // Lock and close the single open config that started before the new effective date
            $employee->overtimePayConfigs()
                ->whereNull('effective_to')
                ->where('effective_from', '<', $effectiveFrom->toDateString())
                ->lockForUpdate()
                ->update(['effective_to' => $effectiveFrom->copy()->subDay()->toDateString()]);

            return $employee->overtimePayConfigs()->create([
                'valuation_method' => $request->valuation_method,
                'lft_factor' => $request->lft_factor,
                'hourly_rate' => $request->hourly_rate,
                'effective_from' => $effectiveFrom->toDateString(),
                'effective_to' => null,
            ]);
        });

        return (new OvertimePayConfigResource($config))->setStatusCode(201);
    }
}
