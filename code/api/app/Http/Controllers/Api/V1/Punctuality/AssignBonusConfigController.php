<?php

namespace App\Http\Controllers\Api\V1\Punctuality;

use App\Http\Controllers\Controller;
use App\Http\Requests\Punctuality\AssignBonusConfigRequest;
use App\Http\Resources\Punctuality\EmployeeBonusConfigResource;
use App\Models\Employee;
use App\Models\PunctualityBonusGroup;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AssignBonusConfigController extends Controller
{
    public function __invoke(AssignBonusConfigRequest $request, Employee $employee): EmployeeBonusConfigResource
    {
        $group = PunctualityBonusGroup::where('public_id', $request->bonus_group_id)->firstOrFail();
        $effectiveFrom = Carbon::parse($request->effective_from)->startOfDay();

        $config = DB::transaction(function () use ($employee, $group, $effectiveFrom) {
            // Delete future open configs (effective_from >= new date) — superseded by this assignment
            $employee->bonusConfigs()
                ->whereNull('effective_to')
                ->where('effective_from', '>=', $effectiveFrom->toDateString())
                ->delete();

            // Close the open config that started before the new effective date
            $employee->bonusConfigs()
                ->whereNull('effective_to')
                ->where('effective_from', '<', $effectiveFrom->toDateString())
                ->update(['effective_to' => $effectiveFrom->copy()->subDay()->toDateString()]);

            return $employee->bonusConfigs()->create([
                'punctuality_bonus_group_id' => $group->id,
                'effective_from' => $effectiveFrom->toDateString(),
                'effective_to' => null,
            ]);
        });

        $config->load('bonusGroup');

        return (new EmployeeBonusConfigResource($config))->setStatusCode(201);
    }
}
