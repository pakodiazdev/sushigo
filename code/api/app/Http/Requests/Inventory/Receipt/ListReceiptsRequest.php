<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\Receipt;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="ListReceiptsRequest",
 *
 *   @OA\Property(property="status", type="string", enum={"DRAFT", "POSTED", "REVERSED"}),
 *   @OA\Property(property="supplier_id", type="string", description="Supplier public_id (ULID)")
 * )
 */
class ListReceiptsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['nullable', 'string', 'in:DRAFT,POSTED,REVERSED'],
            'supplier_id' => ['nullable', 'string', Rule::exists('suppliers', 'public_id')->withoutTrashed()],
        ];
    }
}
