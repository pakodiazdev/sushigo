<?php

declare(strict_types=1);

namespace Tests\Feature\Inventory;

use App\Exceptions\VariantSkuExhaustedException;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Support\VariantSkuGenerator;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;

class VariantSkuSuggestionTest extends InventoryTestCase
{
    #[Test]
    public function it_suggests_a_contextual_product_variant_sku(): void
    {
        $product = $this->createProduct(['name' => 'Arroz Premium']);

        $this->getJson("/api/v1/inventory/products/{$product->public_id}/variants/suggest-code?name=1%20kg&uom_id={$this->uomKg->public_id}")
            ->assertOk()
            ->assertJsonPath('code', 'ARR-KG')
            ->assertJsonPath('prefix', 'ARR-');
    }

    #[Test]
    public function it_requires_variant_name_and_uom_context(): void
    {
        $product = $this->createProduct(['name' => 'Arroz Premium']);

        $this->getJson("/api/v1/inventory/products/{$product->public_id}/variants/suggest-code")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'uom_id']);
    }

    #[Test]
    public function it_checks_the_global_namespace_and_advances_from_two(): void
    {
        $product = $this->createProduct(['name' => 'Arroz Premium']);
        $other = $this->createProduct(['name' => 'Otro']);
        $this->createItemVariant($other, ['code' => 'ARR-KG']);
        $this->createItemVariant($other, ['code' => 'ARR-KG-002']);

        $this->getJson("/api/v1/inventory/products/{$product->public_id}/variants/suggest-code?name=1%20kg&uom_id={$this->uomKg->public_id}")
            ->assertOk()
            ->assertJsonPath('code', 'ARR-KG-003');
    }

    #[Test]
    public function it_uses_a_bounded_query_count_and_hash_fallback_after_many_collisions(): void
    {
        $product = $this->createProduct(['name' => 'Arroz Premium']);
        $stem = 'ARR-KG';
        $codes = [$stem];
        foreach (range(2, 101) as $suffix) {
            $codes[] = VariantSkuGenerator::withSuffix($stem, $suffix);
        }

        $this->occupyCodes($product, $codes);

        DB::flushQueryLog();
        DB::enableQueryLog();
        $suggestion = app(VariantSkuGenerator::class)->suggest('Arroz Premium', '1 kg', 'KG');
        $queryCount = count(DB::getQueryLog());
        DB::disableQueryLog();

        $this->assertMatchesRegularExpression('/^ARR-KG-[A-F0-9]{10}$/', $suggestion);
        $this->assertNotContains($suggestion, $codes);
        $this->assertLessThanOrEqual(3, $queryCount);
    }

    #[Test]
    public function it_throws_a_domain_exception_when_all_bounded_candidates_are_occupied(): void
    {
        $product = $this->createProduct(['name' => 'Arroz Premium']);
        $stem = 'ARR-KG';
        $codes = [$stem];
        foreach (range(2, 101) as $suffix) {
            $codes[] = VariantSkuGenerator::withSuffix($stem, $suffix);
        }
        foreach (range(1, 10) as $attempt) {
            $codes[] = $stem.'-'.strtoupper(substr(hash('sha256', $stem.'|'.$attempt), 0, 10));
        }
        $this->occupyCodes($product, $codes);

        $this->expectException(VariantSkuExhaustedException::class);

        app(VariantSkuGenerator::class)->suggest('Arroz Premium', '1 kg', 'KG');
    }

    #[Test]
    public function it_treats_soft_deleted_variant_skus_as_historically_occupied(): void
    {
        $product = $this->createProduct(['name' => 'Arroz Premium']);
        $deleted = $this->createItemVariant($product, ['code' => 'ARR-500GR']);
        $deleted->delete();

        $this->getJson("/api/v1/inventory/products/{$product->public_id}/variants/suggest-code?name=500%20gr&uom_id={$this->uomGr->public_id}")
            ->assertOk()
            ->assertJsonPath('code', 'ARR-500GR-002');
    }

    #[Test]
    public function it_exposes_the_same_contract_to_the_reachable_legacy_variant_form(): void
    {
        $item = $this->createItem(['name' => 'Harina de trigo', 'type' => Item::TYPE_INSUMO]);

        $this->getJson("/api/v1/item-variants/suggest-code?item_id={$item->public_id}&name=1%20kg&uom_id={$this->uomKg->public_id}")
            ->assertOk()
            ->assertJsonPath('code', 'HAR-KG');
    }

    #[Test]
    public function it_returns_a_fresh_suggestion_when_the_code_was_claimed_before_validation(): void
    {
        $product = $this->createProduct(['name' => 'Arroz Premium']);
        $this->createItemVariant($product, ['code' => 'ARR-KG']);

        $this->postJson("/api/v1/inventory/products/{$product->public_id}/variants", [
            'name' => '1 kg',
            'code' => 'ARR-KG',
            'uom_id' => $this->uomKg->public_id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['code'])
            ->assertJsonPath('rejected_code', 'ARR-KG')
            ->assertJsonPath('suggested_code', 'ARR-KG-002');
    }

    #[Test]
    public function it_accepts_public_ids_and_recovers_collisions_on_the_legacy_create_path(): void
    {
        $item = $this->createItem(['name' => 'Harina de trigo', 'type' => Item::TYPE_INSUMO]);
        $this->createItemVariant($item, ['code' => 'HAR-KG']);

        $this->postJson('/api/v1/item-variants', [
            'item_id' => $item->public_id,
            'name' => '1 kg',
            'code' => 'HAR-KG',
            'uom_id' => $this->uomKg->public_id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['code'])
            ->assertJsonPath('rejected_code', 'HAR-KG')
            ->assertJsonPath('suggested_code', 'HAR-KG-002');
    }

    #[Test]
    public function it_requires_items_create_permission(): void
    {
        $product = $this->createProduct(['name' => 'Arroz Premium']);
        $this->user->removeRole('inventory-manager');
        $this->user->givePermissionTo('items.view');

        $this->getJson("/api/v1/inventory/products/{$product->public_id}/variants/suggest-code?name=1%20kg&uom_id={$this->uomKg->public_id}")
            ->assertForbidden();
    }

    #[Test]
    public function it_returns_a_fresh_contextual_suggestion_when_create_loses_a_code_race(): void
    {
        $product = $this->createProduct(['name' => 'Arroz Premium']);
        Config::set('database.connections.race', Config::get('database.connections.'.Config::get('database.default')));
        $race = DB::connection('race');
        $raced = false;
        $raceItemId = 999501;
        $raceUomId = 999501;
        $race->table('items')->insert([
            'id' => $raceItemId,
            'public_id' => (string) Str::ulid(),
            'sku' => 'RACE-501',
            'name' => 'Race Product',
            'type' => Item::TYPE_PRODUCTO,
            'is_stocked' => true,
            'is_perishable' => false,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $race->table('units_of_measure')->insert([
            'id' => $raceUomId,
            'public_id' => (string) Str::ulid(),
            'code' => 'R501',
            'name' => 'Race unit',
            'symbol' => 'r501',
            'precision' => 2,
            'is_decimal' => true,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Event::listen('eloquent.saving: '.ItemVariant::class, function (ItemVariant $variant) use (&$raced, $race, $raceItemId, $raceUomId): void {
            if ($raced || $variant->name !== '1 kg') {
                return;
            }
            $raced = true;
            $race->table('item_variants')->insert([
                'public_id' => (string) Str::ulid(),
                'item_id' => $raceItemId,
                'uom_id' => $raceUomId,
                'code' => 'ARR-KG',
                'name' => 'Concurrente',
                'track_lot' => false,
                'track_serial' => false,
                'is_active' => true,
                'meta' => json_encode([]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        try {
            $this->postJson("/api/v1/inventory/products/{$product->public_id}/variants", [
                'name' => '1 kg',
                'code' => 'ARR-KG',
                'uom_id' => $this->uomKg->public_id,
            ])->assertUnprocessable()
                ->assertJsonValidationErrors(['code'])
                ->assertJsonPath('rejected_code', 'ARR-KG')
                ->assertJsonPath('suggested_code', 'ARR-KG-002')
                ->assertJsonPath('message', 'El SKU ya está en uso. Revisa la nueva sugerencia y vuelve a enviar el formulario.');
        } finally {
            $race->table('item_variants')->where('name', 'Concurrente')->delete();
            $race->table('units_of_measure')->where('id', $raceUomId)->delete();
            $race->table('items')->where('id', $raceItemId)->delete();
            $race->disconnect();
        }
    }

    #[Test]
    public function it_requires_authentication(): void
    {
        $product = $this->createProduct(['name' => 'Arroz Premium']);
        Passport::actingAs($this->user);
        auth()->forgetGuards();

        $this->getJson("/api/v1/inventory/products/{$product->public_id}/variants/suggest-code?name=1%20kg&uom_id={$this->uomKg->public_id}")
            ->assertUnauthorized();
    }

    /** @param list<string> $codes */
    private function occupyCodes(Item $product, array $codes): void
    {
        $now = now();
        ItemVariant::insert(array_map(fn (string $code): array => [
            'public_id' => (string) Str::ulid(),
            'item_id' => $product->id,
            'uom_id' => $this->uomKg->id,
            'code' => $code,
            'name' => $code,
            'track_lot' => false,
            'track_serial' => false,
            'is_active' => true,
            'meta' => json_encode([]),
            'created_at' => $now,
            'updated_at' => $now,
        ], $codes));
    }
}
