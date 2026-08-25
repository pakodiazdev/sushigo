<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Supplier;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\Response;

/**
 * @OA\Delete(
 *   path="/api/v1/inventory/suppliers/{supplier}",
 *   operationId="deleteSupplier",
 *   summary="Soft-delete a Supplier",
 *   tags={"Suppliers"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="supplier", in="path", required=true, @OA\Schema(type="string"), description="Supplier public_id (ULID)"),
 *
 *   @OA\Response(response=204, description="Supplier deleted"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires suppliers.manage permission"),
 *   @OA\Response(response=404, description="Supplier not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class DeleteSupplierController extends Controller
{
    public function __invoke(Supplier $supplier): Response
    {
        $supplier->delete();

        return response()->noContent();
    }
}
