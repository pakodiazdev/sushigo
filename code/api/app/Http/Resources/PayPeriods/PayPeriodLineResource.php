<?php

namespace App\Http\Resources\PayPeriods;

use App\Http\Resources\BaseResource;
use App\Models\PayPeriodLine;

/**
 * @mixin PayPeriodLine
 *
 * @OA\Schema(
 *     schema="PayPeriodLineResponse",
 *     title="Pay Period Line Response",
 *
 *     @OA\Property(property="date", type="string", format="date", nullable=true, example="2026-06-23"),
 *     @OA\Property(property="concept", type="string", example="BASE_PAY"),
 *     @OA\Property(property="description", type="string"),
 *     @OA\Property(property="amount", type="number", format="float", example=350.00),
 *     @OA\Property(property="minutes", type="integer", nullable=true)
 * )
 */
class PayPeriodLineResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'date' => $this->date?->toDateString(),
            'concept' => $this->concept,
            'description' => $this->description,
            'amount' => (float) $this->amount,
            'minutes' => $this->minutes,
        ];
    }
}
