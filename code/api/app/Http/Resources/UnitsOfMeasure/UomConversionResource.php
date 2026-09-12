<?php

declare(strict_types=1);

namespace App\Http\Resources\UnitsOfMeasure;

use App\Http\Resources\BaseResource;
use App\Models\UomConversion;

/**
 * UomConversion itself has no public_id — it was never migrated to a ULID
 * identity (#399 only covered the Inventory domain proper) — so its own
 * `id` stays the internal numeric primary key. Its `from_uom_id`/`to_uom_id`
 * foreign keys reference UnitOfMeasure, which IS ULID-based, so those (and
 * the nested from_uom/to_uom objects) must serialize as public_id (#581).
 *
 * @mixin UomConversion
 *
 * @OA\Schema(
 *     schema="UomConversionResponse",
 *     title="UOM Conversion Response",
 *     description="Unit of measure conversion entity representation",
 *
 *     @OA\Property(property="id", type="integer", example=1, description="Conversion ID — UomConversion has no public ULID identifier"),
 *     @OA\Property(property="from_uom_id", type="string", example="01JKUOM1234567890ABCDEFGH", description="Source Unit of Measure public_id (ULID)"),
 *     @OA\Property(property="to_uom_id", type="string", example="01JKUOM0987654321ZYXWVUTS", description="Target Unit of Measure public_id (ULID)"),
 *     @OA\Property(property="factor", type="number", format="float", example=1000.0, description="Conversion factor"),
 *     @OA\Property(property="tolerance", type="number", format="float", example=0.5, description="Tolerance percentage"),
 *     @OA\Property(property="is_active", type="boolean", example=true, description="Active status"),
 *     @OA\Property(property="from_uom", type="object",
 *         @OA\Property(property="id", type="string", example="01JKUOM1234567890ABCDEFGH", description="Unit of Measure public_id (ULID)"),
 *         @OA\Property(property="code", type="string"),
 *         @OA\Property(property="name", type="string"),
 *         @OA\Property(property="symbol", type="string")
 *     ),
 *     @OA\Property(property="to_uom", type="object",
 *         @OA\Property(property="id", type="string", example="01JKUOM0987654321ZYXWVUTS", description="Unit of Measure public_id (ULID)"),
 *         @OA\Property(property="code", type="string"),
 *         @OA\Property(property="name", type="string"),
 *         @OA\Property(property="symbol", type="string")
 *     ),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 */
class UomConversionResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'from_uom_id' => $this->fromUom?->public_id,
            'to_uom_id' => $this->toUom?->public_id,
            'factor' => (float) $this->factor,
            'tolerance' => (float) $this->tolerance,
            'is_active' => $this->is_active,
            'from_uom' => $this->whenLoaded('fromUom', fn () => $this->fromUom ? [
                'id' => $this->fromUom->public_id,
                'code' => $this->fromUom->code,
                'name' => $this->fromUom->name,
                'symbol' => $this->fromUom->symbol,
            ] : null),
            'to_uom' => $this->whenLoaded('toUom', fn () => $this->toUom ? [
                'id' => $this->toUom->public_id,
                'code' => $this->toUom->code,
                'name' => $this->toUom->name,
                'symbol' => $this->toUom->symbol,
            ] : null),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
