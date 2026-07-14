<?php

namespace App\Http\Controllers\Api\V1\VacationPolicy;

use App\Http\Controllers\Controller;
use App\Http\Resources\VacationPolicy\VacationPolicyTierResource;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\VacationPolicySetting;
use App\Models\VacationPolicyTier;
use App\Services\VacationEntitlementResolver;

/**
 * @OA\Get(
 *   path="/api/v1/vacation-policy",
 *   summary="Get Vacation Policy Settings",
 *   description="Returns the active tenant-level vacation entitlement rule and its custom tiers (if any).",
 *   tags={"Vacation Policy"},
 *   security={{"passport": {}}},
 *
 *   @OA\Response(response=200, description="Settings retrieved successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden")
 * )
 */
class ListVacationPolicyController extends Controller
{
    public function __invoke(VacationEntitlementResolver $resolver): ResponseEntity
    {
        $settings = VacationPolicySetting::current();

        $tiers = VacationPolicyTier::orderBy('years_from')->get();

        return new ResponseEntity(data: [
            'active_rule_key' => $settings->active_rule_key,
            'active_rule_label' => $resolver->resolveTenantDefault()->label(),
            'tiers' => VacationPolicyTierResource::collection($tiers)->toArray(request()),
        ]);
    }
}
