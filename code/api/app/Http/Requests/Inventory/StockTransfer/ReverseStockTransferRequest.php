<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\StockTransfer;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="ReverseStockTransferRequest",
 *
 *   @OA\Property(property="reason", type="string", maxLength=255, nullable=true, example="Traslado registrado por error")
 * )
 */
class ReverseStockTransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'reason' => ['nullable', 'string', 'max:255'],
        ];
    }
}
