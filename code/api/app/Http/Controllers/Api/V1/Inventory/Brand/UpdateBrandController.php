<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Brand;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\Brand\UpdateBrandRequest;
use App\Http\Resources\Inventory\Brand\BrandResource;
use App\Models\Brand;

/**
 * @OA\Put(
 *   path="/api/v1/brands/{brand}",
 *   summary="Update Brand",
 *   tags={"Brands"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="brand", in="path", required=true, @OA\Schema(type="string"), description="Brand public_id (ULID)"),
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdateBrandRequest")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Brand updated successfully",
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
 *   @OA\Response(response=403, description="Forbidden — requires brands.update permission"),
 *   @OA\Response(response=404, description="Brand not found"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdateBrandController extends Controller
{
    public function __invoke(UpdateBrandRequest $request, Brand $brand): BrandResource
    {
        $brand->update($request->brandData());

        return new BrandResource($brand);
    }
}
