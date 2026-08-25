<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\SupplierOffering;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Models\SupplierOffering;
use Illuminate\Http\Response;

/**
 * @OA\Delete(
 *   path="/api/v1/inventory/suppliers/{supplier}/offerings/{offering}",
 *   operationId="deleteSupplierOffering",
 *   summary="Soft-delete a Supplier Offering",
 *   tags={"Supplier Offerings"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="supplier", in="path", required=true, @OA\Schema(type="string"), description="Supplier public_id (ULID)"),
 *   @OA\Parameter(name="offering", in="path", required=true, @OA\Schema(type="string"), description="Supplier Offering public_id (ULID)"),
 *
 *   @OA\Response(response=204, description="Supplier Offering deleted"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires suppliers.manage permission"),
 *   @OA\Response(response=404, description="Supplier or Offering not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class DeleteSupplierOfferingController extends Controller
{
    public function __invoke(Supplier $supplier, SupplierOffering $offering): Response
    {
        $offering->delete();

        return response()->noContent();
    }
}
