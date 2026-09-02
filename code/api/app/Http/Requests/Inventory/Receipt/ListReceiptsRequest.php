<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\Receipt;

use App\Http\Requests\Concerns\ResolvesPublicIdReferences;
use App\Http\Requests\Inventory\Receipt\Concerns\ScopesDestinationLocationToAccessibleUnits;
use App\Models\InventoryLocation;
use App\Models\Supplier;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="ListReceiptsRequest",
 *
 *   @OA\Property(property="status", type="string", enum={"DRAFT", "POSTED", "REVERSED"}),
 *   @OA\Property(property="supplier_id", type="string", description="Supplier public_id (ULID)"),
 *   @OA\Property(property="destination_location_id", type="string", description="Receiving InventoryLocation public_id (ULID)"),
 *   @OA\Property(property="date_from", type="string", format="date", description="Inclusive lower bound on receipt_date"),
 *   @OA\Property(property="date_to", type="string", format="date", description="Inclusive upper bound on receipt_date"),
 *   @OA\Property(property="search", type="string", description="Case-insensitive match on reference"),
 *   @OA\Property(property="per_page", type="integer", minimum=1, maximum=100, example=15),
 *   @OA\Property(property="page", type="integer", minimum=1, example=1)
 * )
 */
class ListReceiptsRequest extends FormRequest
{
    use ResolvesPublicIdReferences;
    use ScopesDestinationLocationToAccessibleUnits;

    /**
     * The list is a bounded summary read model (#586). Total Receipt history
     * grows without limit, so a caller cannot ask for an unbounded page.
     */
    public const MAX_PER_PAGE = 100;

    public const DEFAULT_PER_PAGE = 15;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // Both bounds are independently optional and the controller applies each
        // on its own, so only enforce the ordering rule when date_from is present
        // — otherwise `after_or_equal:date_from` 422s a lone `?date_to=...`
        // because its comparison field is absent.
        $dateToRules = ['nullable', 'date'];
        if ($this->filled('date_from')) {
            $dateToRules[] = 'after_or_equal:date_from';
        }

        return [
            'status' => ['nullable', 'string', 'in:DRAFT,POSTED,REVERSED'],
            'supplier_id' => ['nullable', 'string', Rule::exists('suppliers', 'public_id')->withoutTrashed()],
            'destination_location_id' => ['nullable', 'string', $this->accessibleDestinationLocationRule()],
            'date_from' => ['nullable', 'date'],
            'date_to' => $dateToRules,
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_PER_PAGE],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    /**
     * Resolve the supplier_id filter's public_id (ULID) input to Supplier's
     * numeric FK. Returns null when the filter wasn't supplied.
     */
    public function supplierId(): ?int
    {
        return $this->resolvePublicId(Supplier::class, 'supplier_id');
    }

    /**
     * Resolve the destination_location_id filter's public_id (ULID) input to
     * InventoryLocation's numeric FK. Returns null when the filter wasn't
     * supplied.
     */
    public function destinationLocationId(): ?int
    {
        return $this->resolvePublicId(InventoryLocation::class, 'destination_location_id');
    }

    /**
     * Bounded page size — the request-validated value, clamped to the hard
     * maximum, or the conservative default when the caller omits it.
     */
    public function perPage(): int
    {
        $perPage = (int) $this->input('per_page', self::DEFAULT_PER_PAGE);

        return max(1, min($perPage, self::MAX_PER_PAGE));
    }
}
