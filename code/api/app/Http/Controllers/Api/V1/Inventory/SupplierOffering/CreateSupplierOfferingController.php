<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\SupplierOffering;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\SupplierOffering\StoreSupplierOfferingRequest;
use App\Http\Resources\Inventory\SupplierOffering\SupplierOfferingResource;
use App\Models\Supplier;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Validation\ValidationException;

/**
 * @OA\Post(
 *   path="/api/v1/inventory/suppliers/{supplier}/offerings",
 *   operationId="createSupplierOffering",
 *   summary="Create a Supplier reference quotation",
 *   description="The quotation is mutable reference data and does not post an acquisition cost.",
 *   tags={"Supplier Offerings"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="supplier", in="path", required=true, @OA\Schema(type="string"), description="Supplier public_id (ULID)"),
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/StoreSupplierOfferingRequest")),
 *
 *   @OA\Response(response=201, description="Supplier Offering created successfully", @OA\JsonContent(allOf={@OA\Schema(ref="#/components/schemas/ResponseEntity"), @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/SupplierOfferingResponse"))})),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires suppliers.manage permission"),
 *   @OA\Response(response=404, description="Supplier not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class CreateSupplierOfferingController extends Controller
{
    public function __invoke(StoreSupplierOfferingRequest $request, Supplier $supplier): SupplierOfferingResource
    {
        try {
            $offering = $supplier->offerings()->create($request->offeringData());
        } catch (UniqueConstraintViolationException) {
            // The FormRequest's exists() pre-check is a TOCTOU race: a concurrent request can
            // pass it before either insert commits. The partial unique index on
            // (supplier_id, variant_purchase_presentation_id) is the actual guarantee — surface
            // it as the same friendly validation error instead of an uncaught 500.
            throw ValidationException::withMessages([
                'variant_purchase_presentation_id' => StoreSupplierOfferingRequest::DUPLICATE_PRESENTATION_MESSAGE,
            ]);
        }

        return (new SupplierOfferingResource($offering->load([
            'supplier',
            'presentation.template',
            'presentation.itemVariant.item',
        ])))->setStatusCode(201);
    }
}
