<?php

declare(strict_types=1);

namespace Database\Seeders\Development;

use App\Models\Branch;
use App\Models\ItemVariant;
use App\Models\OperatingUnit;
use App\Models\PriceList;
use App\Models\PriceListAssignment;
use App\Models\VariantPrice;
use App\Support\Clock\ApplicationClock;
use Carbon\Carbon;
use Database\Seeders\Base\RepeatableSeeder;
use Database\Seeders\Traits\RestoresTrashedOnUpsert;

/**
 * Demonstrates the pricing domain from #435: a Branch-wide Standard price,
 * an event-Operating-Unit price override for the same Variant (the
 * "branch-price difference" Acceptance Criterion), and a short, higher-
 * priority time-boxed Promotion (the "promotion" Acceptance Criterion) —
 * see doc/architecture/pricing/pricing-architecture.en.md §3 and §7.
 * Price list/assignment/price data configured in config/seeders.php under
 * development_price_lists / development_price_list_assignments /
 * development_variant_prices.
 *
 * Every effective window is computed relative to
 * App\Support\Clock\ApplicationClock::todayInBusinessTz() rather than a
 * fixed calendar date, so re-seeding stays time-stable no matter when it
 * runs (#437's "time-stable" Acceptance Criterion).
 *
 * Depends on BranchSeeder, OperatingUnitSeeder (for the 'Bazar Tequila'
 * event unit) and Development/ProductCatalogSeeder having already run.
 */
class PricingSeeder extends RepeatableSeeder
{
    use RestoresTrashedOnUpsert;

    public function run(): void
    {
        $branch = Branch::where('code', 'MAIN')->first();

        if (! $branch) {
            $this->command->warn('⚠️  Main branch not found. Skipping pricing.');

            return;
        }

        $today = Carbon::parse(app(ApplicationClock::class)->todayInBusinessTz());

        $priceListIds = $this->seedPriceLists();
        $assignmentCount = $this->seedAssignments($branch, $priceListIds, $today);
        $priceCount = $this->seedVariantPrices($priceListIds, $today);

        $this->command->info('✓ Pricing seeded: '.count($priceListIds)." price lists, {$assignmentCount} assignments, {$priceCount} variant prices");
    }

    /**
     * @return array<string, int> price list code => id
     */
    private function seedPriceLists(): array
    {
        $priceListIds = [];

        foreach (config('seeders.development_price_lists', []) as $tuple) {
            $priceList = $this->upsertRestoringTrashed(
                PriceList::class,
                ['code' => $tuple['code']],
                [
                    'name' => $tuple['name'],
                    'description' => $tuple['description'],
                    'priority' => $tuple['priority'],
                    'is_active' => $tuple['is_active'],
                ],
            );

            $priceListIds[$tuple['code']] = $priceList->id;
        }

        return $priceListIds;
    }

    /**
     * @param  array<string, int>  $priceListIds
     */
    private function seedAssignments(Branch $branch, array $priceListIds, Carbon $today): int
    {
        $count = 0;

        foreach (config('seeders.development_price_list_assignments', []) as $tuple) {
            $priceListId = $priceListIds[$tuple['price_list']] ?? null;

            if (! $priceListId) {
                $this->command->warn("⚠️  PriceList '{$tuple['price_list']}' not found. Skipping assignment.");

                continue;
            }

            $operatingUnitId = null;

            if (! empty($tuple['operating_unit_event'])) {
                $operatingUnitId = OperatingUnit::where('branch_id', $branch->id)
                    ->where('type', OperatingUnit::TYPE_EVENT_TEMP)
                    ->where('name', $tuple['operating_unit_event'])
                    ->value('id');

                if (! $operatingUnitId) {
                    $this->command->warn("⚠️  Event OperatingUnit '{$tuple['operating_unit_event']}' not found. Skipping assignment.");

                    continue;
                }
            }

            PriceListAssignment::updateOrCreate(
                ['price_list_id' => $priceListId, 'branch_id' => $branch->id, 'operating_unit_id' => $operatingUnitId],
                [
                    'effective_from' => $today->copy()->addDays($tuple['from_days_offset'])->toDateString(),
                    'effective_to' => $tuple['to_days_offset'] !== null ? $today->copy()->addDays($tuple['to_days_offset'])->toDateString() : null,
                    'is_active' => true,
                ],
            );

            $count++;
        }

        return $count;
    }

    /**
     * @param  array<string, int>  $priceListIds
     */
    private function seedVariantPrices(array $priceListIds, Carbon $today): int
    {
        $count = 0;

        foreach (config('seeders.development_variant_prices', []) as $tuple) {
            $priceListId = $priceListIds[$tuple['price_list']] ?? null;
            $variantId = ItemVariant::where('code', $tuple['variant'])->value('id');

            if (! $priceListId || ! $variantId) {
                $this->command->warn("⚠️  PriceList '{$tuple['price_list']}' or Variant '{$tuple['variant']}' not found. Skipping variant price.");

                continue;
            }

            $this->upsertRestoringTrashed(
                VariantPrice::class,
                ['item_variant_id' => $variantId, 'price_list_id' => $priceListId],
                [
                    'price' => $tuple['price'],
                    'effective_from' => $today->copy()->addDays($tuple['from_days_offset'])->toDateString(),
                    'effective_to' => $tuple['to_days_offset'] !== null ? $today->copy()->addDays($tuple['to_days_offset'])->toDateString() : null,
                    'is_active' => true,
                ],
            );

            $count++;
        }

        return $count;
    }
}
