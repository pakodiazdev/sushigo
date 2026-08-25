<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\Receipt;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="ReverseReceiptRequest",
 *
 *   @OA\Property(property="reason", type="string", maxLength=255, nullable=true, example="Mercancía dañada, devuelta al proveedor")
 * )
 */
class ReverseReceiptRequest extends FormRequest
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
