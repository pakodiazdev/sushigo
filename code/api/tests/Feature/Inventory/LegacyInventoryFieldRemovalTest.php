<?php

namespace Tests\Feature\Inventory;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\Test;

/**
 * #442 (Milestone C) — the superseded per-Variant cost/price columns are gone
 * and no live read/write path references them any more. `items.sku` is
 * deliberately retained: it is still the authoritative SKU for INSUMO/ACTIVO
 * Items (#500), only deprecated for type = PRODUCTO.
 */
class LegacyInventoryFieldRemovalTest extends InventoryTestCase
{
    use RefreshDatabase;

    #[Test]
    public function the_legacy_cost_and_price_columns_are_dropped_from_item_variants(): void
    {
        $this->assertFalse(Schema::hasColumn('item_variants', 'sale_price'));
        $this->assertFalse(Schema::hasColumn('item_variants', 'last_unit_cost'));
        $this->assertFalse(Schema::hasColumn('item_variants', 'avg_unit_cost'));
        // Already dropped by #439, asserted here so the whole legacy set stays gone.
        $this->assertFalse(Schema::hasColumn('item_variants', 'min_stock'));
        $this->assertFalse(Schema::hasColumn('item_variants', 'max_stock'));
    }

    #[Test]
    public function items_sku_is_retained_for_non_product_items(): void
    {
        $this->assertTrue(Schema::hasColumn('items', 'sku'));

        $item = $this->createItem(['sku' => 'RETAINED-001', 'type' => 'INSUMO']);

        $this->assertSame('RETAINED-001', $item->fresh()->sku);
    }

    #[Test]
    public function the_item_variant_response_no_longer_exposes_legacy_cost_or_price(): void
    {
        $item = $this->createItem();

        $response = $this->postJson('/api/v1/item-variants', [
            'item_id' => $item->id,
            'code' => 'NO-LEGACY-1',
            'name' => 'No Legacy Fields',
            'uom_id' => $this->uomKg->id,
        ]);

        $response->assertStatus(201)
            ->assertJsonMissingPath('data.sale_price')
            ->assertJsonMissingPath('data.last_unit_cost')
            ->assertJsonMissingPath('data.avg_unit_cost');
    }

    #[Test]
    public function creating_a_variant_ignores_legacy_cost_and_price_input(): void
    {
        $item = $this->createItem();

        $response = $this->postJson('/api/v1/item-variants', [
            'item_id' => $item->id,
            'code' => 'IGNORES-LEGACY-1',
            'name' => 'Ignores Legacy Input',
            'uom_id' => $this->uomKg->id,
            'sale_price' => 123.45,
            'avg_unit_cost' => 67.89,
            'last_unit_cost' => 10.11,
        ]);

        $response->assertStatus(201)
            ->assertJsonMissingPath('data.sale_price')
            ->assertJsonMissingPath('data.avg_unit_cost')
            ->assertJsonMissingPath('data.last_unit_cost');

        $this->assertDatabaseHas('item_variants', ['code' => 'IGNORES-LEGACY-1']);
    }

    #[Test]
    public function updating_a_variant_ignores_legacy_price_input(): void
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item, ['code' => 'UPD-LEGACY-1']);

        $response = $this->putJson("/api/v1/item-variants/{$variant->public_id}", [
            'name' => 'Updated Name',
            'sale_price' => 999.99,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'Updated Name')
            ->assertJsonMissingPath('data.sale_price');
    }

    #[Test]
    public function the_drop_migration_archives_exact_legacy_values_and_a_rollback_restores_them(): void
    {
        // RefreshDatabase already ran the drop; re-create the exact pre-up() shape
        // (columns back, archive table gone) and drive the migration object
        // directly (same approach as LegacyThresholdMigrationTest).
        Schema::dropIfExists('item_variant_legacy_cost_archive');
        Schema::table('item_variants', function (Blueprint $table) {
            $table->decimal('last_unit_cost', 15, 4)->default(0);
            $table->decimal('avg_unit_cost', 15, 4)->default(0);
            $table->decimal('sale_price', 15, 4)->nullable();
        });

        $withValues = $this->createItemVariant($this->createItem(), ['code' => 'MIG-WITH-VALUES']);
        DB::table('item_variants')->where('id', $withValues->id)->update([
            'sale_price' => '35.5000',
            'last_unit_cost' => '12.3400',
            'avg_unit_cost' => '11.1100',
            'meta' => json_encode(['keep_me' => true]),
        ]);

        $allDefaults = $this->createItemVariant($this->createItem(), ['code' => 'MIG-DEFAULTS']);

        $migration = require base_path('database/migrations/2026_08_27_210000_drop_legacy_cost_and_price_columns_from_item_variants.php');

        $migration->up();

        // Columns gone; exact values live in a dedicated internal table, never in meta.
        $this->assertFalse(Schema::hasColumn('item_variants', 'sale_price'));
        $this->assertTrue(Schema::hasTable('item_variant_legacy_cost_archive'));

        $archived = DB::table('item_variant_legacy_cost_archive')->where('item_variant_id', $withValues->id)->first();
        $this->assertSame('35.5000', (string) $archived->sale_price);
        $this->assertSame('12.3400', (string) $archived->last_unit_cost);
        $this->assertSame('11.1100', (string) $archived->avg_unit_cost);

        // Nothing was written into meta, and a defaults-only row is not archived.
        $this->assertSame(['keep_me' => true], json_decode(DB::table('item_variants')->where('id', $withValues->id)->value('meta'), true));
        $this->assertNull(DB::table('item_variant_legacy_cost_archive')->where('item_variant_id', $allDefaults->id)->first());

        $migration->down();

        // Exact restore; the archive table is dropped and meta is untouched.
        $restored = DB::table('item_variants')->where('id', $withValues->id)->first();
        $this->assertSame('35.5000', (string) $restored->sale_price);
        $this->assertSame('12.3400', (string) $restored->last_unit_cost);
        $this->assertSame('11.1100', (string) $restored->avg_unit_cost);
        $this->assertSame(['keep_me' => true], json_decode($restored->meta, true));
        $this->assertFalse(Schema::hasTable('item_variant_legacy_cost_archive'));
    }

    #[Test]
    public function the_legacy_cost_archive_is_not_exposed_through_the_variant_api(): void
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item, ['code' => 'ARCHIVE-HIDDEN-1']);

        // Simulate a row the drop migration archived.
        DB::table('item_variant_legacy_cost_archive')->insert([
            'item_variant_id' => $variant->id,
            'sale_price' => '99.9900',
            'last_unit_cost' => '77.7700',
            'avg_unit_cost' => '88.8800',
            'archived_at' => now(),
        ]);

        $list = $this->getJson('/api/v1/item-variants');
        $list->assertStatus(200);
        $this->assertStringNotContainsString('99.99', $list->getContent());
        $this->assertStringNotContainsString('legacy_cost_archive', $list->getContent());

        $show = $this->getJson("/api/v1/item-variants/{$variant->public_id}");
        $show->assertStatus(200);
        $this->assertStringNotContainsString('99.99', $show->getContent());
    }
}
