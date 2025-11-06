<?php

namespace App\Http\Responses\Entities;

/**
 * @OA\Schema(
 *     schema="ItemVariantResponse",
 *     title="Item Variant Response",
 *     description="Item variant entity representation",
 *     @OA\Property(property="id", type="integer", example=1, description="Variant ID"),
 *     @OA\Property(property="item_id", type="integer", example=1, description="Parent item ID"),
 *     @OA\Property(property="uom_id", type="integer", example=1, description="Base unit of measure ID"),
 *     @OA\Property(property="code", type="string", example="ARR-KG", description="Unique variant code"),
 *     @OA\Property(property="name", type="string", example="Arroz Premium 1kg", description="Variant name"),
 *     @OA\Property(property="description", type="string", example="Presentación de 1 kilogramo", description="Variant description"),
 *     @OA\Property(property="track_lot", type="boolean", example=false, description="Whether to track lot numbers"),
 *     @OA\Property(property="track_serial", type="boolean", example=false, description="Whether to track serial numbers"),
 *     @OA\Property(property="last_unit_cost", type="number", format="float", example=25.50, description="Last acquisition cost"),
 *     @OA\Property(property="avg_unit_cost", type="number", format="float", example=24.80, description="Weighted average cost"),
 *     @OA\Property(property="sale_price", type="number", format="float", example=35.00, description="Default sale price"),
 *     @OA\Property(property="min_stock", type="number", format="float", example=10.00, description="Minimum stock alert level"),
 *     @OA\Property(property="max_stock", type="number", format="float", example=100.00, description="Maximum stock level"),
 *     @OA\Property(property="is_active", type="boolean", example=true, description="Active status"),
 *     @OA\Property(property="uom", ref="#/components/schemas/UnitOfMeasureResponse", description="Base UOM details"),
 *     @OA\Property(property="item", ref="#/components/schemas/ItemResponse", description="Parent item details"),
 *     @OA\Property(property="created_at", type="string", format="date-time", example="2024-01-01T00:00:00.000000Z"),
 *     @OA\Property(property="updated_at", type="string", format="date-time", example="2024-01-15T10:30:00.000000Z")
 * )
 */
class ItemVariantResponse
{
    // This class is used only for OpenAPI documentation
}
