<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\Receipt;

/**
 * @OA\Schema(
 *   schema="UpdateReceiptRequest",
 *   required={"supplier_id", "destination_location_id", "receipt_date", "lines"},
 *
 *   @OA\Property(property="supplier_id", type="string", example="01JKXYZ1234567890ABCDEFGH"),
 *   @OA\Property(property="destination_location_id", type="string", example="01JKXYZ1234567890ABCDEFGH"),
 *   @OA\Property(property="reference", type="string", maxLength=255, nullable=true),
 *   @OA\Property(property="receipt_date", type="string", format="date"),
 *   @OA\Property(property="notes", type="string", nullable=true),
 *   @OA\Property(property="lines", type="array", @OA\Items(ref="#/components/schemas/StoreReceiptRequest/properties/lines/items"))
 * )
 */
class UpdateReceiptRequest extends ReceiptRequest
{
    public function rules(): array
    {
        return $this->receiptRules();
    }
}
