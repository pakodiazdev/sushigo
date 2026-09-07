<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\StockTransfer;

/**
 * @OA\Schema(
 *   schema="StoreStockTransferRequest",
 *   required={"source_location_id", "destination_location_id", "transfer_date", "lines"},
 *
 *   @OA\Property(property="source_location_id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="Source Inventory Location public_id (ULID)"),
 *   @OA\Property(property="destination_location_id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="Destination Inventory Location public_id (ULID) — must differ from the source"),
 *   @OA\Property(property="reference", type="string", maxLength=255, nullable=true, example="TR-2026-0001"),
 *   @OA\Property(property="transfer_date", type="string", format="date", example="2026-09-05"),
 *   @OA\Property(property="notes", type="string", nullable=true),
 *   @OA\Property(
 *     property="lines", type="array",
 *
 *     @OA\Items(
 *       required={"item_variant_id", "entry_uom_id", "entry_quantity"},
 *
 *       @OA\Property(property="item_variant_id", type="string", example="01JKXYZ1234567890ABCDEFGH"),
 *       @OA\Property(property="entry_uom_id", type="string", example="01JKXYZ1234567890ABCDEFGH"),
 *       @OA\Property(property="entry_quantity", type="number", format="float", minimum=0.0001, example=12)
 *     )
 *   )
 * )
 */
class StoreStockTransferRequest extends StockTransferRequest
{
    public function rules(): array
    {
        return $this->transferRules();
    }
}
