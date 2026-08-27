<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Supplier;

use App\Http\Controllers\Controller;
use App\Support\SupplierCodeGenerator;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Get(
 *   path="/api/v1/inventory/suppliers/next-code",
 *   operationId="suggestSupplierCode",
 *   summary="Suggest the next available Supplier code",
 *   description="Returns the next unused PROV-NNN code based on the configured prefix/padding and every existing Supplier code, including soft-deleted ones. The suggestion is a convenience only; the database unique index remains the authority.",
 *   tags={"Suppliers"},
 *   security={{"passport": {}}},
 *
 *   @OA\Response(
 *       response=200,
 *       description="Next available code",
 *
 *       @OA\JsonContent(
 *
 *           @OA\Property(property="code", type="string", example="PROV-014"),
 *           @OA\Property(property="prefix", type="string", example="PROV-")
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires suppliers.manage permission")
 * )
 */
class SuggestSupplierCodeController extends Controller
{
    public function __invoke(SupplierCodeGenerator $generator): JsonResponse
    {
        return response()->json([
            'code' => $generator->next(),
            'prefix' => $generator->prefix(),
        ]);
    }
}
