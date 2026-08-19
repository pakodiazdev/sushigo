<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Brand;

use App\Http\Controllers\Controller;
use App\Http\Resources\Inventory\Brand\BrandResource;
use App\Models\Brand;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @OA\Get(
 *   path="/api/v1/brands",
 *   summary="List Brands",
 *   tags={"Brands"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="is_active", in="query", @OA\Schema(type="boolean")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Brands retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/BrandResponse")))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires brands.view permission")
 * )
 */
class ListBrandsController extends Controller
{
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        $query = Brand::query()->orderBy('name');

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        return BrandResource::collection($query->get());
    }
}
