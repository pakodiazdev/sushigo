<?php

namespace App\Http\Controllers\Api\V1\VacationPolicy;

use App\Http\Controllers\Controller;
use App\Http\Requests\VacationPolicy\UpdateVacationPolicyRequest;
use App\Http\Resources\VacationPolicy\VacationPolicyTierResource;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\VacationPolicyTier;
use App\Services\VacationEntitlementResolver;
use App\Services\VacationPolicySettingService;

/**
 * @OA\Put(
 *   path="/api/v1/vacation-policy",
 *   summary="Update Vacation Policy Settings",
 *   description="Sets the active tenant-level vacation rule. When switching to CustomCompanyPolicy, atomically replaces the custom tiers with the provided list. Switching back to VacationsLFTMX preserves any existing custom tiers so they are available if re-enabled later.",
 *   tags={"Vacation Policy"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdateVacationPolicyRequest")),
 *
 *   @OA\Response(response=200, description="Settings updated successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdateVacationPolicyController extends Controller
{
    public function __invoke(
        UpdateVacationPolicyRequest $request,
        VacationEntitlementResolver $resolver,
        VacationPolicySettingService $policyService,
    ): ResponseEntity {
        $data = $request->policyData();

        $policyService->update($data['active_rule_key'], $data['tiers']);

        $tiers = VacationPolicyTier::orderBy('years_from')->get();

        return new ResponseEntity(data: [
            'active_rule_key' => $data['active_rule_key'],
            'active_rule_label' => $resolver->resolveTenantDefault()->label(),
            'tiers' => VacationPolicyTierResource::collection($tiers)->toArray(request()),
        ]);
    }
}
