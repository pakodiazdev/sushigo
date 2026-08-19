<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Brand;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\Brand\StoreBrandRequest;
use App\Http\Resources\Inventory\Brand\BrandResource;
use App\Models\Brand;

/**
 * @OA\Post(
 *   path="/api/v1/brands",
 *   summary="Create Brand",
 *   tags={"Brands"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/StoreBrandRequest")),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Brand created successfully",
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
 *   @OA\Response(response=403, description="Forbidden — requires brands.create permission"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class CreateBrandController extends Controller
{
    public function __invoke(StoreBrandRequest $request): BrandResource
    {
        $brand = Brand::create($request->brandData());

        return (new BrandResource($brand))->setStatusCode(201);
    }
}
