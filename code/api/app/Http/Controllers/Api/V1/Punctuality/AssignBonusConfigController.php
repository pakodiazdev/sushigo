<?php

namespace App\Http\Controllers\Api\V1\Punctuality;

use App\Http\Controllers\Controller;
use App\Http\Requests\Punctuality\AssignBonusConfigRequest;
use App\Http\Resources\Punctuality\EmployeeBonusConfigResource;
use App\Models\Employee;
use App\Models\PunctualityBonusGroup;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class AssignBonusConfigController extends Controller
{
    public function __invoke(AssignBonusConfigRequest $request, Employee $employee): JsonResponse
    {
        $group = PunctualityBonusGroup::where('public_id', $request->bonus_group_id)->firstOrFail();
        $effectiveFrom = Carbon::parse($request->effective_from)->startOfDay();

        // Close the current open config the day before
        $employee->bonusConfigs()
            ->whereNull('effective_to')
            ->where('effective_from', '<', $effectiveFrom->toDateString())
            ->update(['effective_to' => $effectiveFrom->copy()->subDay()->toDateString()]);

        $config = $employee->bonusConfigs()->create([
            'punctuality_bonus_group_id' => $group->id,
            'effective_from' => $effectiveFrom->toDateString(),
            'effective_to' => null,
        ]);

        $config->load('bonusGroup');

        return (new EmployeeBonusConfigResource($config))
            ->response()
            ->setStatusCode(201);
    }
}
