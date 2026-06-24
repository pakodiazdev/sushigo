<?php

namespace App\Http\Controllers\Api\V1\Devtools;

use App\Http\Controllers\Controller;
use App\Http\Requests\Devtools\SeedPayrollRequest;
use App\Services\PayrollSeedService;
use App\Support\PayrollSeed\PayrollSeedGuard;
use Illuminate\Http\JsonResponse;

class SeedPayrollController extends Controller
{
    public function __construct(private PayrollSeedService $seedService) {}

    public function __invoke(SeedPayrollRequest $request): JsonResponse
    {
        PayrollSeedGuard::validate();

        $result = $this->seedService->seed(
            $request->branchId(),
            $request->periodStart(),
            $request->periodEnd(),
            $request->scenario(),
        );

        return response()->json([
            'status' => 'ok',
            'data' => $result,
        ]);
    }
}
