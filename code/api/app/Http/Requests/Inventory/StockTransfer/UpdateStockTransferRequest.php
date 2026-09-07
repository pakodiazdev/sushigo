<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\StockTransfer;

/**
 * @OA\Schema(
 *   schema="UpdateStockTransferRequest",
 *   required={"source_location_id", "destination_location_id", "transfer_date", "lines"},
 *
 *   @OA\Property(property="source_location_id", type="string", example="01JKXYZ1234567890ABCDEFGH"),
 *   @OA\Property(property="destination_location_id", type="string", example="01JKXYZ1234567890ABCDEFGH"),
 *   @OA\Property(property="reference", type="string", maxLength=255, nullable=true),
 *   @OA\Property(property="transfer_date", type="string", format="date"),
 *   @OA\Property(property="notes", type="string", nullable=true),
 *   @OA\Property(property="lines", type="array", @OA\Items(
 *     required={"item_variant_id", "entry_uom_id", "entry_quantity"},
 *     @OA\Property(property="item_variant_id", type="string"),
 *     @OA\Property(property="entry_uom_id", type="string"),
 *     @OA\Property(property="entry_quantity", type="number", format="float", minimum=0.0001)
 *   ))
 * )
 */
class UpdateStockTransferRequest extends StockTransferRequest
{
    public function rules(): array
    {
        return $this->transferRules();
    }
}
