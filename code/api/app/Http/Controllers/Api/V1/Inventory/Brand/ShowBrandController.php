<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Brand;

use App\Http\Controllers\Controller;
use App\Http\Resources\Inventory\Brand\BrandResource;
use App\Models\Brand;

/**
 * @OA\Get(
 *   path="/api/v1/brands/{brand}",
 *   summary="Get Brand by ID",
 *   tags={"Brands"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="brand", in="path", required=true, @OA\Schema(type="string"), description="Brand public_id (ULID)"),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Brand retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/BrandResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires brands.view permission"),
 *   @OA\Response(response=404, description="Brand not found")
 * )
 */
class ShowBrandController extends Controller
{
    public function __invoke(Brand $brand): BrandResource
    {
        return new BrandResource($brand);
    }
}
