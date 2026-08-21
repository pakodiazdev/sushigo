<?php

namespace Tests\Feature\Inventory;

use App\Models\PurchasePresentationTemplate;
use Database\Seeders\Development\PurchasePresentationTemplateSeeder;
use Database\Seeders\UnitOfMeasureSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PurchasePresentationTemplateSeederTest extends TestCase
{
    use RefreshDatabase;

    private const EXPECTED_CODES = ['UNIT_1', 'PACK_5', 'PACK_6', 'BOX_24', 'TRAY_12'];

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(UnitOfMeasureSeeder::class);
    }

    #[Test]
    public function seeds_every_expected_template(): void
    {
        $this->seed(PurchasePresentationTemplateSeeder::class);

        foreach (self::EXPECTED_CODES as $code) {
            $this->assertDatabaseHas('purchase_presentation_templates', ['code' => $code]);
        }

        $this->assertSame(count(self::EXPECTED_CODES), DB::table('purchase_presentation_templates')->count());
    }

    #[Test]
    public function demonstrates_every_package_type(): void
    {
        $this->seed(PurchasePresentationTemplateSeeder::class);

        $packageTypes = DB::table('purchase_presentation_templates')->pluck('package_type')->unique()->sort()->values()->toArray();

        $this->assertSame(['BOX', 'PACK', 'TRAY', 'UNIT'], $packageTypes);
    }

    #[Test]
    public function includes_at_least_one_inactive_template(): void
    {
        $this->seed(PurchasePresentationTemplateSeeder::class);

        $this->assertDatabaseHas('purchase_presentation_templates', ['code' => 'TRAY_12', 'is_active' => false]);
    }

    #[Test]
    public function is_idempotent_when_run_more_than_once(): void
    {
        $this->seed(PurchasePresentationTemplateSeeder::class);
        $this->seed(PurchasePresentationTemplateSeeder::class);

        $this->assertSame(count(self::EXPECTED_CODES), DB::table('purchase_presentation_templates')->count());
    }

    #[Test]
    public function does_not_create_a_duplicate_when_a_template_was_soft_deleted(): void
    {
        $this->seed(PurchasePresentationTemplateSeeder::class);

        PurchasePresentationTemplate::where('code', 'BOX_24')->first()->delete();

        $this->seed(PurchasePresentationTemplateSeeder::class);

        $this->assertSame(
            count(self::EXPECTED_CODES),
            PurchasePresentationTemplate::withTrashed()->count(),
            'Re-seeding after a soft delete must update the trashed row, not insert a duplicate',
        );
    }

    #[Test]
    public function skips_seeding_when_the_unit_uom_is_missing(): void
    {
        DB::table('units_of_measure')->where('code', 'UN')->delete();

        $this->seed(PurchasePresentationTemplateSeeder::class);

        $this->assertSame(0, DB::table('purchase_presentation_templates')->count());
    }

    #[Test]
    public function restores_a_soft_deleted_template_on_re_seed(): void
    {
        $this->seed(PurchasePresentationTemplateSeeder::class);

        PurchasePresentationTemplate::where('code', 'BOX_24')->first()->delete();
        $this->assertSoftDeleted('purchase_presentation_templates', ['code' => 'BOX_24']);

        $this->seed(PurchasePresentationTemplateSeeder::class);

        $this->assertDatabaseHas('purchase_presentation_templates', [
            'code' => 'BOX_24',
            'deleted_at' => null,
        ]);
    }
}
