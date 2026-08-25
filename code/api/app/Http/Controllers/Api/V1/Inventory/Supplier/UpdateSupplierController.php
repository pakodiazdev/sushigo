<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Supplier;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\Supplier\StoreSupplierRequest;
use App\Http\Requests\Inventory\Supplier\UpdateSupplierRequest;
use App\Http\Resources\Inventory\Supplier\SupplierResource;
use App\Models\Supplier;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Validation\ValidationException;

/**
 * @OA\Put(
 *   path="/api/v1/inventory/suppliers/{supplier}",
 *   operationId="updateSupplier",
 *   summary="Update or deactivate a Supplier",
 *   tags={"Suppliers"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="supplier", in="path", required=true, @OA\Schema(type="string"), description="Supplier public_id (ULID)"),
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdateSupplierRequest")),
 *
 *   @OA\Response(response=200, description="Supplier updated successfully", @OA\JsonContent(allOf={@OA\Schema(ref="#/components/schemas/ResponseEntity"), @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/SupplierResponse"))})),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires suppliers.manage permission"),
 *   @OA\Response(response=404, description="Supplier not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdateSupplierController extends Controller
{
    public function __invoke(UpdateSupplierRequest $request, Supplier $supplier): SupplierResource
    {
        try {
            $supplier->update($request->supplierData());
        } catch (UniqueConstraintViolationException) {
            // The Rule::unique pre-check in UpdateSupplierRequest is a TOCTOU race: a concurrent
            // request can pass it before either write commits. The partial unique index on
            // (code) where deleted_at is null is the actual guarantee — surface it as the same
            // friendly validation error instead of an uncaught 500.
            throw ValidationException::withMessages([
                'code' => StoreSupplierRequest::DUPLICATE_CODE_MESSAGE,
            ]);
        }

        return new SupplierResource($supplier->loadCount('offerings'));
    }
}
