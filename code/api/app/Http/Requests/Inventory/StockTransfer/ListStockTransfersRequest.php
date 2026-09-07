<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\StockTransfer;

use App\Http\Requests\Concerns\ResolvesPublicIdReferences;
use App\Http\Requests\Inventory\StockTransfer\Concerns\ScopesLocationToAccessibleUnits;
use App\Models\InventoryLocation;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="ListStockTransfersRequest",
 *
 *   @OA\Property(property="status", type="string", enum={"DRAFT", "POSTED", "REVERSED"}),
 *   @OA\Property(property="source_location_id", type="string", description="Source InventoryLocation public_id (ULID)"),
 *   @OA\Property(property="destination_location_id", type="string", description="Destination InventoryLocation public_id (ULID)"),
 *   @OA\Property(property="date_from", type="string", format="date"),
 *   @OA\Property(property="date_to", type="string", format="date"),
 *   @OA\Property(property="search", type="string", description="Case-insensitive match on reference"),
 *   @OA\Property(property="per_page", type="integer", minimum=1, maximum=100, example=15),
 *   @OA\Property(property="page", type="integer", minimum=1, example=1)
 * )
 */
class ListStockTransfersRequest extends FormRequest
{
    use ResolvesPublicIdReferences;
    use ScopesLocationToAccessibleUnits;

    public const MAX_PER_PAGE = 100;

    public const DEFAULT_PER_PAGE = 15;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $dateToRules = ['nullable', 'date'];
        if ($this->filled('date_from')) {
            $dateToRules[] = 'after_or_equal:date_from';
        }

        return [
            'status' => ['nullable', 'string', 'in:DRAFT,POSTED,REVERSED'],
            'source_location_id' => ['nullable', 'string', $this->accessibleLocationRule()],
            'destination_location_id' => ['nullable', 'string', $this->accessibleLocationRule()],
            'date_from' => ['nullable', 'date'],
            'date_to' => $dateToRules,
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_PER_PAGE],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    public function sourceLocationId(): ?int
    {
        return $this->resolvePublicId(InventoryLocation::class, 'source_location_id');
    }

    public function destinationLocationId(): ?int
    {
        return $this->resolvePublicId(InventoryLocation::class, 'destination_location_id');
    }

    public function perPage(): int
    {
        $perPage = (int) $this->input('per_page', self::DEFAULT_PER_PAGE);

        return max(1, min($perPage, self::MAX_PER_PAGE));
    }
}
