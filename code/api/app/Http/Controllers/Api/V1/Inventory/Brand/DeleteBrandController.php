<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Brand;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use Illuminate\Http\Response;

/**
 * @OA\Delete(
 *   path="/api/v1/brands/{brand}",
 *   summary="Delete Brand",
 *   description="Soft-deletes a brand. Products that reference it keep their historical assignment; only new assignments are blocked (see Item::brand_id nullOnDelete + CreateProductRequest's active-brand check).",
 *   tags={"Brands"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="brand", in="path", required=true, @OA\Schema(type="string"), description="Brand public_id (ULID)"),
 *
 *   @OA\Response(response=204, description="Brand deleted"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires brands.delete permission"),
 *   @OA\Response(response=404, description="Brand not found")
 * )
 */
class DeleteBrandController extends Controller
{
    public function __invoke(Brand $brand): Response
    {
        $brand->delete();

        return response()->noContent();
    }
}
