<?php

namespace App\DataTransferObjects\Inventory;

use App\Support\Money\Money;

/**
 * `$grossAmount`, `$discounts`, `$allocatedExpenses`, and `$nonRecoverableTaxes` are `Money`
 * (#415, per TD-05) rather than `float` — this is the concrete cross-boundary finding the
 * Issue cites: these four amounts used to cross a PHP `float` boundary even though the
 * database stores them as exact `DECIMAL`. Package quantities stay `float` for now; migrating
 * them to `Decimal` belongs to the broader Stock quantity system (#575/#579), out of this
 * bounded phase's scope.
 */
final readonly class ReceiptLineData
{
    public function __construct(
        public int $variantPurchasePresentationId,
        public ?int $supplierOfferingId,
        public float $orderedPackages,
        public float $receivedPackages,
        public float $bonusPackages,
        public Money $grossAmount,
        public Money $discounts,
        public Money $allocatedExpenses,
        public Money $nonRecoverableTaxes,
    ) {}
}
