<?php

namespace App\Http\Responses\Entities;

/**
 * @OA\Schema(
 *     schema="ItemResponse",
 *     title="Item Response",
 *     description="Item entity representation",
 *     @OA\Property(property="id", type="integer", example=1, description="Item ID"),
 *     @OA\Property(property="sku", type="string", example="INS-001", description="Unique SKU code"),
 *     @OA\Property(property="name", type="string", example="Arroz Sushi Premium", description="Item name"),
 *     @OA\Property(property="description", type="string", example="Arroz japonés para sushi", description="Item description"),
 *     @OA\Property(property="type", type="string", enum={"INSUMO", "PRODUCTO", "ACTIVO"}, example="INSUMO", description="Item type"),
 *     @OA\Property(property="is_stocked", type="boolean", example=true, description="Whether item is tracked in inventory"),
 *     @OA\Property(property="is_perishable", type="boolean", example=false, description="Whether item has expiration"),
 *     @OA\Property(property="is_active", type="boolean", example=true, description="Active status"),
 *     @OA\Property(property="created_at", type="string", format="date-time", example="2024-01-01T00:00:00.000000Z"),
 *     @OA\Property(property="updated_at", type="string", format="date-time", example="2024-01-15T10:30:00.000000Z")
 * )
 */
class ItemResponse
{
    // This class is used only for OpenAPI documentation
}
