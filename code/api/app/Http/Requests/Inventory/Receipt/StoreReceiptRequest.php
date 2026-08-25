<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\Receipt;

/**
 * @OA\Schema(
 *   schema="StoreReceiptRequest",
 *   required={"supplier_id", "destination_location_id", "receipt_date", "lines"},
 *
 *   @OA\Property(property="supplier_id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="Supplier public_id (ULID)"),
 *   @OA\Property(property="destination_location_id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="Destination Inventory Location public_id (ULID)"),
 *   @OA\Property(property="reference", type="string", maxLength=255, nullable=true, example="FAC-2026-0001"),
 *   @OA\Property(property="receipt_date", type="string", format="date", example="2026-08-25"),
 *   @OA\Property(property="notes", type="string", nullable=true),
 *   @OA\Property(
 *     property="lines", type="array",
 *
 *     @OA\Items(
 *       required={"variant_purchase_presentation_id", "received_packages"},
 *
 *       @OA\Property(property="variant_purchase_presentation_id", type="string", example="01JKXYZ1234567890ABCDEFGH"),
 *       @OA\Property(property="supplier_offering_id", type="string", nullable=true, example="01JKXYZ1234567890ABCDEFGH"),
 *       @OA\Property(property="ordered_packages", type="number", format="float", minimum=0, example=10),
 *       @OA\Property(property="received_packages", type="number", format="float", minimum=0.0001, example=10),
 *       @OA\Property(property="bonus_packages", type="number", format="float", minimum=0, example=1),
 *       @OA\Property(property="gross_amount", type="number", format="float", minimum=0, example=4800),
 *       @OA\Property(property="discounts", type="number", format="float", minimum=0, example=0),
 *       @OA\Property(property="allocated_expenses", type="number", format="float", minimum=0, example=150),
 *       @OA\Property(property="non_recoverable_taxes", type="number", format="float", minimum=0, example=0)
 *     )
 *   )
 * )
 */
class StoreReceiptRequest extends ReceiptRequest
{
    public function rules(): array
    {
        return $this->receiptRules();
    }
}
