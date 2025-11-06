<?php

namespace App\Http\Responses\Entities;

/**
 * @OA\Schema(
 *     schema="UomConversionResponse",
 *     title="UOM Conversion Response",
 *     description="Unit of measure conversion entity representation",
 *     @OA\Property(property="id", type="integer", example=1, description="Conversion ID"),
 *     @OA\Property(property="from_uom_id", type="integer", example=1, description="Source UOM ID"),
 *     @OA\Property(property="to_uom_id", type="integer", example=2, description="Target UOM ID"),
 *     @OA\Property(property="factor", type="number", format="float", example=1000.0, description="Conversion factor"),
 *     @OA\Property(property="tolerance", type="number", format="float", example=0.5, description="Tolerance percentage"),
 *     @OA\Property(property="is_active", type="boolean", example=true, description="Active status"),
 *     @OA\Property(property="from_uom", ref="#/components/schemas/UnitOfMeasureResponse", description="Source UOM details"),
 *     @OA\Property(property="to_uom", ref="#/components/schemas/UnitOfMeasureResponse", description="Target UOM details"),
 *     @OA\Property(property="created_at", type="string", format="date-time", example="2024-01-01T00:00:00.000000Z"),
 *     @OA\Property(property="updated_at", type="string", format="date-time", example="2024-01-15T10:30:00.000000Z")
 * )
 */
class UomConversionResponse
{
    // This class is used only for OpenAPI documentation
}
