<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\SupplierOffering;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\SupplierOffering\ListSupplierOfferingsRequest;
use App\Http\Resources\Inventory\SupplierOffering\SupplierOfferingResource;
use App\Models\Supplier;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @OA\Get(
 *   path="/api/v1/inventory/suppliers/{supplier}/offerings",
 *   operationId="listSupplierOfferings",
 *   summary="List a Supplier's purchase offerings",
 *   tags={"Supplier Offerings"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="supplier", in="path", required=true, @OA\Schema(type="string"), description="Supplier public_id (ULID)"),
 *   @OA\Parameter(name="is_active", in="query", @OA\Schema(type="boolean")),
 *   @OA\Parameter(name="currency", in="query", @OA\Schema(type="string", minLength=3, maxLength=3)),
 *   @OA\Parameter(name="variant_purchase_presentation_id", in="query", @OA\Schema(type="string"), description="Purchase Presentation public_id (ULID)"),
 *   @OA\Parameter(name="valid_on", in="query", @OA\Schema(type="string", format="date")),
 *
 *   @OA\Response(response=200, description="Supplier Offerings retrieved successfully", @OA\JsonContent(allOf={@OA\Schema(ref="#/components/schemas/ResponseEntity"), @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/SupplierOfferingResponse")))})),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires suppliers.view permission"),
 *   @OA\Response(response=404, description="Supplier not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ListSupplierOfferingsController extends Controller
{
    public function __invoke(ListSupplierOfferingsRequest $request, Supplier $supplier): AnonymousResourceCollection
    {
        $query = $supplier->offerings()
            ->with(['supplier', 'presentation.template', 'presentation.itemVariant.item'])
            ->latest();

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('currency')) {
            $query->where('currency', $request->input('currency'));
        }

        if ($request->filled('variant_purchase_presentation_id')) {
            $query->whereHas('presentation', fn ($builder) => $builder
                ->where('public_id', $request->input('variant_purchase_presentation_id')));
        }

        if ($request->filled('valid_on')) {
            $date = $request->date('valid_on')->toDateString();
            $query->where(fn ($builder) => $builder->whereNull('valid_from')->orWhere('valid_from', '<=', $date))
                ->where(fn ($builder) => $builder->whereNull('valid_until')->orWhere('valid_until', '>=', $date));
        }

        return SupplierOfferingResource::collection($query->get());
    }
}
