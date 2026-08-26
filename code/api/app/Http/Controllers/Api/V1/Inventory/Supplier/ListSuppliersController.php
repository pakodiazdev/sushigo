<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Supplier;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\Supplier\ListSuppliersRequest;
use App\Http\Resources\Inventory\Supplier\SupplierResource;
use App\Models\Supplier;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @OA\Get(
 *   path="/api/v1/inventory/suppliers",
 *   operationId="listSuppliers",
 *   summary="List and filter Suppliers",
 *   tags={"Suppliers"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="search", in="query", @OA\Schema(type="string", maxLength=100), description="Search by supplier name or code"),
 *   @OA\Parameter(name="is_active", in="query", @OA\Schema(type="boolean")),
 *
 *   @OA\Response(response=200, description="Suppliers retrieved successfully", @OA\JsonContent(allOf={@OA\Schema(ref="#/components/schemas/ResponseEntity"), @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/SupplierResponse")))})),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires suppliers.view or receipts.manage permission"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ListSuppliersController extends Controller
{
    public function __invoke(ListSuppliersRequest $request): AnonymousResourceCollection
    {
        $query = Supplier::query()->withCount('offerings')->orderBy('name');

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('search')) {
            $search = '%'.str_replace(['%', '_'], ['\\%', '\\_'], trim((string) $request->input('search'))).'%';
            $query->where(fn ($builder) => $builder
                ->where('name', 'ilike', $search)
                ->orWhere('code', 'ilike', $search));
        }

        return SupplierResource::collection($query->get());
    }
}
