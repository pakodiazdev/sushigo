<?php

namespace Tests\Feature\Pricing;

use App\Models\Branch;
use App\Models\ItemVariant;
use App\Models\OperatingUnit;
use App\Models\PriceList;
use App\Models\PriceListAssignment;
use App\Models\VariantPrice;
use App\Services\Pricing\PriceResolutionService;
use Database\Seeders\BranchSeeder;
use Database\Seeders\Development\BrandSeeder;
use Database\Seeders\Development\InventoryCategorySeeder;
use Database\Seeders\Development\PricingSeeder;
use Database\Seeders\Development\ProductCatalogSeeder;
use Database\Seeders\Development\PurchasePresentationTemplateSeeder;
use Database\Seeders\OperatingUnitSeeder;
use Database\Seeders\UnitOfMeasureSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PricingSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(BranchSeeder::class);
        $this->seed(OperatingUnitSeeder::class);
        $this->seed(UnitOfMeasureSeeder::class);
        $this->seed(BrandSeeder::class);
        $this->seed(InventoryCategorySeeder::class);
        $this->seed(PurchasePresentationTemplateSeeder::class);
        $this->seed(ProductCatalogSeeder::class);
    }

    #[Test]
    public function the_event_operating_unit_resolves_a_different_price_than_the_branch_wide_standard_list(): void
    {
        $this->seed(PricingSeeder::class);

        $branch = Branch::where('code', 'MAIN')->firstOrFail();
        $eventUnit = OperatingUnit::where('branch_id', $branch->id)->where('name', 'Bazar Tequila')->firstOrFail();
        $variant = ItemVariant::where('code', 'COKE-ORIG-CAN355')->firstOrFail();

        $resolver = app(PriceResolutionService::class);

        $branchWide = $resolver->resolve($variant, $branch->id, null);
        $eventScoped = $resolver->resolve($variant, $branch->id, $eventUnit->id);

        $this->assertTrue($branchWide->resolved);
        $this->assertTrue($eventScoped->resolved);
        $this->assertNotEquals($branchWide->price, $eventScoped->price, 'Event Operating Unit must resolve a different price than the Branch-wide Standard list');
        $this->assertSame('22.0000', $branchWide->price);
        $this->assertSame('30.0000', $eventScoped->price);
    }

    #[Test]
    public function the_promotion_temporarily_overrides_the_standard_price_within_its_window(): void
    {
        $this->seed(PricingSeeder::class);

        $branch = Branch::where('code', 'MAIN')->firstOrFail();
        $variant = ItemVariant::where('code', 'BULDAK-ORIGINAL-140')->firstOrFail();

        $resolver = app(PriceResolutionService::class);

        $duringPromotion = $resolver->resolve($variant, $branch->id, null, Carbon::now());
        $afterPromotion = $resolver->resolve($variant, $branch->id, null, Carbon::now()->addDays(10));

        $this->assertTrue($duringPromotion->resolved);
        $this->assertSame('28.0000', $duringPromotion->price, 'Within the promotion window the higher-priority list must win');

        $this->assertTrue($afterPromotion->resolved);
        $this->assertSame('35.0000', $afterPromotion->price, 'Outside the promotion window resolution must fall back to the Standard list');
    }

    #[Test]
    public function is_idempotent_when_run_more_than_once(): void
    {
        $this->seed(PricingSeeder::class);
        $listsAfterFirstRun = PriceList::count();
        $assignmentsAfterFirstRun = PriceListAssignment::count();
        $pricesAfterFirstRun = VariantPrice::count();

        $this->seed(PricingSeeder::class);

        $this->assertSame($listsAfterFirstRun, PriceList::count());
        $this->assertSame($assignmentsAfterFirstRun, PriceListAssignment::count());
        $this->assertSame($pricesAfterFirstRun, VariantPrice::count());
    }
}
