<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Supplier;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\Supplier\StoreSupplierRequest;
use App\Http\Resources\Inventory\Supplier\SupplierResource;
use App\Models\Supplier;
use App\Support\SupplierCodeGenerator;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * @OA\Post(
 *   path="/api/v1/inventory/suppliers",
 *   operationId="createSupplier",
 *   summary="Create a Supplier",
 *   tags={"Suppliers"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/StoreSupplierRequest")),
 *
 *   @OA\Response(response=201, description="Supplier created successfully", @OA\JsonContent(allOf={@OA\Schema(ref="#/components/schemas/ResponseEntity"), @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/SupplierResponse"))})),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires suppliers.manage permission"),
 *   @OA\Response(
 *       response=422,
 *       description="Validation Error. On a create-time unique-code race the body also carries `rejected_code` (the code that was taken) and `suggested_code` (a freshly calculated replacement) alongside the standard `errors.code` field error.",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *               @OA\Schema(ref="#/components/schemas/ResponseError"),
 *               @OA\Schema(
 *
 *                   @OA\Property(property="rejected_code", type="string", nullable=true, example="PROV-014"),
 *                   @OA\Property(property="suggested_code", type="string", nullable=true, example="PROV-015")
 *               )
 *           }
 *       )
 *   )
 * )
 */
class CreateSupplierController extends Controller
{
    public function __invoke(StoreSupplierRequest $request, SupplierCodeGenerator $generator): SupplierResource|JsonResponse
    {
        try {
            // Wrapped so a lost unique-code race rolls back cleanly (savepoint under an outer
            // transaction) and the connection stays usable for the fresh suggestion below.
            $supplier = DB::transaction(fn () => Supplier::create($request->supplierData()));
        } catch (UniqueConstraintViolationException) {
            // The Rule::unique pre-check in StoreSupplierRequest is a TOCTOU race: a concurrent
            // request can pass it before either insert commits. The partial unique index on
            // (code) where deleted_at is null is the actual guarantee — surface it as a stable
            // field-error contract that also hands the client a fresh, still-available suggestion.
            $rejectedCode = $request->supplierData()['code'];
            $suggestedCode = $generator->next();

            return response()->json([
                'message' => StoreSupplierRequest::DUPLICATE_CODE_MESSAGE,
                'errors' => ['code' => [StoreSupplierRequest::DUPLICATE_CODE_MESSAGE]],
                'rejected_code' => $rejectedCode,
                'suggested_code' => $suggestedCode,
            ], 422);
        }

        return (new SupplierResource($supplier->loadCount('offerings')))->setStatusCode(201);
    }
}
