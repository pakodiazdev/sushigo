<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\SupplierOffering;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\SupplierOffering\UpdateSupplierOfferingRequest;
use App\Http\Resources\Inventory\SupplierOffering\SupplierOfferingResource;
use App\Models\Supplier;
use App\Models\SupplierOffering;

/**
 * @OA\Put(
 *   path="/api/v1/inventory/suppliers/{supplier}/offerings/{offering}",
 *   operationId="updateSupplierOffering",
 *   summary="Update or deactivate a Supplier Offering",
 *   tags={"Supplier Offerings"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="supplier", in="path", required=true, @OA\Schema(type="string"), description="Supplier public_id (ULID)"),
 *   @OA\Parameter(name="offering", in="path", required=true, @OA\Schema(type="string"), description="Supplier Offering public_id (ULID)"),
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdateSupplierOfferingRequest")),
 *
 *   @OA\Response(response=200, description="Supplier Offering updated successfully", @OA\JsonContent(allOf={@OA\Schema(ref="#/components/schemas/ResponseEntity"), @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/SupplierOfferingResponse"))})),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires suppliers.manage permission"),
 *   @OA\Response(response=404, description="Supplier or Offering not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdateSupplierOfferingController extends Controller
{
    public function __invoke(
        UpdateSupplierOfferingRequest $request,
        Supplier $supplier,
        SupplierOffering $offering
    ): SupplierOfferingResource {
        $offering->update($request->offeringData());

        return new SupplierOfferingResource($offering->load([
            'supplier',
            'presentation.template',
            'presentation.itemVariant.item',
        ]));
    }
}
