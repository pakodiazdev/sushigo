<?php

namespace Tests\Feature\Inventory;

use App\Models\Item;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;

class ItemSkuSuggestionTest extends InventoryTestCase
{
    private const NEXT_SKU_URL = '/api/v1/items/next-sku';

    #[Test]
    public function it_derives_a_contextual_prefix_from_the_item_name(): void
    {
        $this->getJson(self::NEXT_SKU_URL.'?name=Salmón fresco')
            ->assertOk()
            ->assertJsonPath('sku', 'SAL-001')
            ->assertJsonPath('prefix', 'SAL-');
    }

    #[Test]
    public function it_folds_unicode_accents_before_deriving_the_prefix(): void
    {
        $this->getJson(self::NEXT_SKU_URL.'?name='.urlencode('Ámbar líquido'))
            ->assertOk()
            ->assertJsonPath('sku', 'AMB-001')
            ->assertJsonPath('prefix', 'AMB-');
    }

    #[Test]
    public function it_strips_punctuation_and_whitespace_from_the_prefix(): void
    {
        $this->getJson(self::NEXT_SKU_URL.'?name='.urlencode('  a.b-c d '))
            ->assertOk()
            ->assertJsonPath('sku', 'ABC-001')
            ->assertJsonPath('prefix', 'ABC-');
    }

    #[Test]
    public function it_uppercases_a_lowercase_name(): void
    {
        $this->getJson(self::NEXT_SKU_URL.'?name=refrigerador')
            ->assertOk()
            ->assertJsonPath('sku', 'REF-001');
    }

    #[Test]
    public function it_falls_back_to_the_generic_prefix_when_the_name_is_too_short(): void
    {
        $this->getJson(self::NEXT_SKU_URL.'?name='.urlencode('Té'))
            ->assertOk()
            ->assertJsonPath('sku', 'ITEM-001')
            ->assertJsonPath('prefix', 'ITEM-');
    }

    #[Test]
    public function it_falls_back_to_the_generic_prefix_when_the_name_has_no_alphanumeric_characters(): void
    {
        $this->getJson(self::NEXT_SKU_URL.'?name='.urlencode('!!! --- ...'))
            ->assertOk()
            ->assertJsonPath('sku', 'ITEM-001');
    }

    #[Test]
    public function it_falls_back_to_the_generic_prefix_when_no_name_is_provided(): void
    {
        $this->getJson(self::NEXT_SKU_URL)
            ->assertOk()
            ->assertJsonPath('sku', 'ITEM-001')
            ->assertJsonPath('prefix', 'ITEM-');
    }

    #[Test]
    public function it_sequences_within_the_same_contextual_prefix(): void
    {
        $this->createItem(['sku' => 'SAL-001', 'name' => 'Salmón fresco']);
        $this->createItem(['sku' => 'SAL-002', 'name' => 'Salsa de soya']);

        $this->getJson(self::NEXT_SKU_URL.'?name=Salsa picante')
            ->assertOk()
            ->assertJsonPath('sku', 'SAL-003');
    }

    #[Test]
    public function it_does_not_backfill_gaps_in_the_sequence(): void
    {
        $this->createItem(['sku' => 'SAL-001', 'name' => 'Salmón']);
        $this->createItem(['sku' => 'SAL-005', 'name' => 'Salsa']);

        $this->getJson(self::NEXT_SKU_URL.'?name=Salmón ahumado')
            ->assertOk()
            ->assertJsonPath('sku', 'SAL-006');
    }

    #[Test]
    public function it_ignores_codes_that_do_not_match_the_contextual_prefix_pattern(): void
    {
        $this->createItem(['sku' => 'MANUAL', 'name' => 'Manual']);
        $this->createItem(['sku' => 'SAL-ABC', 'name' => 'Non numeric suffix']);
        $this->createItem(['sku' => 'SALT-009', 'name' => 'Longer prefix']);
        $this->createItem(['sku' => 'SAL-007', 'name' => 'Seven']);

        $this->getJson(self::NEXT_SKU_URL.'?name=Salmón')
            ->assertOk()
            ->assertJsonPath('sku', 'SAL-008');
    }

    #[Test]
    public function it_handles_numeric_suffixes_larger_than_the_padding_width(): void
    {
        $this->createItem(['sku' => 'SAL-1200', 'name' => 'Big batch']);

        $this->getJson(self::NEXT_SKU_URL.'?name=Salmón')
            ->assertOk()
            ->assertJsonPath('sku', 'SAL-1201');
    }

    #[Test]
    public function it_ignores_a_numeric_suffix_too_large_to_be_a_real_sequence_entry(): void
    {
        $this->createItem(['sku' => 'SAL-12345678901234567', 'name' => 'Absurd']);
        $this->createItem(['sku' => 'SAL-003', 'name' => 'Three']);

        $this->getJson(self::NEXT_SKU_URL.'?name=Salmón')
            ->assertOk()
            ->assertJsonPath('sku', 'SAL-004');
    }

    #[Test]
    public function it_treats_soft_deleted_item_skus_as_permanently_occupied(): void
    {
        $this->createItem(['sku' => 'SAL-001', 'name' => 'One']);
        $deleted = $this->createItem(['sku' => 'SAL-002', 'name' => 'Two']);
        $deleted->delete();

        $this->getJson(self::NEXT_SKU_URL.'?name=Salmón')
            ->assertOk()
            ->assertJsonPath('sku', 'SAL-003');
    }

    #[Test]
    public function it_accepts_an_optional_type_hint(): void
    {
        $this->getJson(self::NEXT_SKU_URL.'?name=Refrigerador&type=ACTIVO')
            ->assertOk()
            ->assertJsonPath('sku', 'REF-001');
    }

    #[Test]
    public function it_rejects_a_type_outside_the_in_scope_values(): void
    {
        $this->getJson(self::NEXT_SKU_URL.'?name=Refrigerador&type=PRODUCTO')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['type']);
    }

    #[Test]
    public function it_requires_the_items_create_permission(): void
    {
        $this->user->removeRole('inventory-manager');
        $this->user->givePermissionTo('items.view');

        $this->getJson(self::NEXT_SKU_URL.'?name=Salmón')->assertForbidden();
    }

    #[Test]
    public function it_requires_authentication_for_the_suggestion_endpoint(): void
    {
        Passport::actingAs($this->user);
        auth()->forgetGuards();

        $this->getJson(self::NEXT_SKU_URL.'?name=Salmón')->assertUnauthorized();
    }

    #[Test]
    public function it_returns_a_regenerated_sku_when_the_sku_races_on_create(): void
    {
        $this->createItem(['sku' => 'SAL-001', 'name' => 'One']);

        // A truly independent connection (its own PDO, autocommit) so the row it writes
        // is really committed and survives the request's own savepoint rollback — exactly
        // what a concurrent HTTP request would do.
        Config::set('database.connections.race', Config::get('database.connections.'.Config::get('database.default')));
        $race = DB::connection('race');

        $raced = false;
        Event::listen('eloquent.saving: '.Item::class, function (Item $item) use (&$raced, $race): void {
            if ($raced || $item->name !== 'Salmón fresco perdedor') {
                return;
            }
            $raced = true;
            $race->table('items')->insert([
                'public_id' => (string) Str::ulid(),
                'sku' => 'SAL-002',
                'name' => 'Raced In',
                'type' => 'INSUMO',
                'is_stocked' => true,
                'is_perishable' => false,
                'is_active' => true,
                'meta' => json_encode([]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        try {
            $this->postJson('/api/v1/items', [
                'sku' => 'SAL-002',
                'name' => 'Salmón fresco perdedor',
                'type' => 'INSUMO',
            ])
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['sku'])
                ->assertJsonPath('rejected_sku', 'SAL-002')
                ->assertJsonPath('suggested_sku', 'SAL-003');

            $this->assertDatabaseMissing('items', ['name' => 'Salmón fresco perdedor']);
        } finally {
            $race->table('items')->where('sku', 'SAL-002')->delete();
            $race->disconnect();
        }
    }

    #[Test]
    public function it_still_rejects_a_plain_duplicate_sku_without_a_regenerated_suggestion(): void
    {
        $this->createItem(['sku' => 'SAL-001', 'name' => 'One']);

        $this->postJson('/api/v1/items', [
            'sku' => 'SAL-001',
            'name' => 'Duplicate',
            'type' => 'INSUMO',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['sku']);
    }

    #[Test]
    public function the_suggested_sku_can_be_used_verbatim_to_create_an_item(): void
    {
        $suggested = $this->getJson(self::NEXT_SKU_URL.'?name=Salmón fresco')->json('sku');

        $this->postJson('/api/v1/items', [
            'sku' => Str::lower($suggested),
            'name' => 'Salmón fresco',
            'type' => 'INSUMO',
        ])->assertCreated();

        $this->assertDatabaseHas('items', ['sku' => 'SAL-001', 'name' => 'Salmón fresco']);
    }
}
