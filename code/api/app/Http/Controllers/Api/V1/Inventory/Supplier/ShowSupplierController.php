<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Supplier;

use App\Http\Controllers\Controller;
use App\Http\Resources\Inventory\Supplier\SupplierResource;
use App\Models\Supplier;

/**
 * @OA\Get(
 *   path="/api/v1/inventory/suppliers/{supplier}",
 *   operationId="showSupplier",
 *   summary="Get a Supplier by ID",
 *   tags={"Suppliers"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="supplier", in="path", required=true, @OA\Schema(type="string"), description="Supplier public_id (ULID)"),
 *
 *   @OA\Response(response=200, description="Supplier retrieved successfully", @OA\JsonContent(allOf={@OA\Schema(ref="#/components/schemas/ResponseEntity"), @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/SupplierResponse"))})),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires suppliers.view permission"),
 *   @OA\Response(response=404, description="Supplier not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ShowSupplierController extends Controller
{
    public function __invoke(Supplier $supplier): SupplierResource
    {
        return new SupplierResource($supplier->loadCount('offerings'));
    }
}
