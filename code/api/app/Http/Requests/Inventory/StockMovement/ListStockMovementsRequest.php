<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\StockMovement;

use App\Http\Requests\Concerns\ResolvesPublicIdReferences;
use App\Http\Requests\Inventory\Concerns\ScopesLocationFilterToAccessibleUnits;
use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Models\StockMovement;
use App\Support\Inventory\StockMovementSourceType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="ListStockMovementsRequest",
 *
 *   @OA\Property(property="location_id", type="string", description="InventoryLocation public_id (ULID) — matches the movement's source OR destination"),
 *   @OA\Property(property="item_variant_id", type="string", description="ItemVariant public_id (ULID)"),
 *   @OA\Property(property="reason", type="string", enum={"TRANSFER","RETURN","SALE","ADJUSTMENT","CONSUMPTION","OPENING_BALANCE","COUNT_VARIANCE","PURCHASE_RECEIPT","PURCHASE_RECEIPT_REVERSAL"}),
 *   @OA\Property(property="status", type="string", enum={"DRAFT","POSTED","REVERSED"}),
 *   @OA\Property(property="date_from", type="string", format="date", description="Inclusive lower bound on posted_at"),
 *   @OA\Property(property="date_to", type="string", format="date", description="Inclusive upper bound on posted_at"),
 *   @OA\Property(property="search", type="string", description="Case-insensitive match on reference"),
 *   @OA\Property(property="source_type", type="string", enum={"receipt"}, description="Originating source document type"),
 *   @OA\Property(property="per_page", type="integer", minimum=1, maximum=100, example=15),
 *   @OA\Property(property="page", type="integer", minimum=1, example=1)
 * )
 */
class ListStockMovementsRequest extends FormRequest
{
    use ResolvesPublicIdReferences;
    use ScopesLocationFilterToAccessibleUnits;

    /**
     * The ledger is an unbounded, ever-growing immutable history (#574), so a
     * caller can never ask for an unbounded page.
     */
    public const MAX_PER_PAGE = 100;

    public const DEFAULT_PER_PAGE = 15;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // date_to only compares against date_from when date_from is present —
        // otherwise a lone `?date_to=...` would 422 against an absent field.
        $dateToRules = ['nullable', 'date'];
        if ($this->filled('date_from')) {
            $dateToRules[] = 'after_or_equal:date_from';
        }

        return [
            'location_id' => ['nullable', 'string', $this->accessibleLocationFilterRule()],
            'item_variant_id' => ['nullable', 'string', Rule::exists('item_variants', 'public_id')->withoutTrashed()],
            'reason' => ['nullable', 'string', Rule::in(self::reasons())],
            'status' => ['nullable', 'string', Rule::in(self::statuses())],
            'date_from' => ['nullable', 'date'],
            'date_to' => $dateToRules,
            'search' => ['nullable', 'string', 'max:100'],
            'source_type' => ['nullable', 'string', Rule::in(StockMovementSourceType::tokens())],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_PER_PAGE],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    /**
     * Resolve the location_id filter's ULID to InventoryLocation's numeric FK.
     */
    public function locationId(): ?int
    {
        return $this->resolvePublicId(InventoryLocation::class, 'location_id');
    }

    /**
     * Resolve the item_variant_id filter's ULID to ItemVariant's numeric FK.
     */
    public function itemVariantId(): ?int
    {
        return $this->resolvePublicId(ItemVariant::class, 'item_variant_id');
    }

    /**
     * The `related_type` FQCN the `source_type` token maps to, or null when the
     * filter was not supplied.
     */
    public function sourceTypeClass(): ?string
    {
        $token = $this->validated('source_type');

        return $token ? StockMovementSourceType::classFor($token) : null;
    }

    /**
     * Bounded page size — validated value clamped to the hard maximum, or the
     * conservative default when omitted.
     */
    public function perPage(): int
    {
        $perPage = (int) $this->input('per_page', self::DEFAULT_PER_PAGE);

        return max(1, min($perPage, self::MAX_PER_PAGE));
    }

    /**
     * @return list<string>
     */
    private static function reasons(): array
    {
        return [
            StockMovement::REASON_TRANSFER,
            StockMovement::REASON_RETURN,
            StockMovement::REASON_SALE,
            StockMovement::REASON_ADJUSTMENT,
            StockMovement::REASON_CONSUMPTION,
            StockMovement::REASON_OPENING_BALANCE,
            StockMovement::REASON_COUNT_VARIANCE,
            StockMovement::REASON_PURCHASE_RECEIPT,
            StockMovement::REASON_PURCHASE_RECEIPT_REVERSAL,
        ];
    }

    /**
     * @return list<string>
     */
    private static function statuses(): array
    {
        return [
            StockMovement::STATUS_DRAFT,
            StockMovement::STATUS_POSTED,
            StockMovement::STATUS_REVERSED,
        ];
    }
}
