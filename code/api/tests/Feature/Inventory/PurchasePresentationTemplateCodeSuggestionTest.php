<?php

namespace Tests\Feature\Inventory;

use App\Models\PurchasePresentationTemplate;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;

class PurchasePresentationTemplateCodeSuggestionTest extends InventoryTestCase
{
    private const URL = '/api/v1/inventory/purchase-presentation-templates/suggest-code';

    public static function packageTypes(): array
    {
        return [
            ['UNIT', 1, 'UNIT_1'],
            ['PACK', 6, 'PACK_6'],
            ['BOX', 24, 'BOX_24'],
            ['TRAY', 12, 'TRAY_12'],
        ];
    }

    #[Test]
    #[DataProvider('packageTypes')]
    public function it_suggests_a_semantic_code_for_every_package_type(string $type, int $quantity, string $expected): void
    {
        $this->getJson(self::URL.'?'.http_build_query([
            'package_type' => $type,
            'base_unit_quantity' => $quantity,
            'compatible_dimension_uom_id' => $this->uomKg->public_id,
        ]))->assertOk()->assertJsonPath('code', $expected);
    }

    #[Test]
    public function it_normalizes_equivalent_integer_and_decimal_quantities(): void
    {
        foreach (['24', '24.0', '24.0000'] as $quantity) {
            $this->getJson(self::URL.'?'.http_build_query([
                'package_type' => 'BOX',
                'base_unit_quantity' => $quantity,
                'compatible_dimension_uom_id' => $this->uomKg->public_id,
            ]))->assertOk()->assertJsonPath('code', 'BOX_24');
        }

        $this->getJson(self::URL.'?'.http_build_query([
            'package_type' => 'PACK',
            'base_unit_quantity' => '2.5000',
            'compatible_dimension_uom_id' => $this->uomKg->public_id,
        ]))->assertOk()->assertJsonPath('code', 'PACK_2.5');
    }

    #[Test]
    public function it_rejects_quantities_the_template_column_cannot_store(): void
    {
        foreach (['100000000000', '1.00001'] as $quantity) {
            $this->getJson(self::URL.'?'.http_build_query([
                'package_type' => 'BOX',
                'base_unit_quantity' => $quantity,
                'compatible_dimension_uom_id' => $this->uomKg->public_id,
            ]))->assertUnprocessable()->assertJsonValidationErrors(['base_unit_quantity']);
        }
    }

    #[Test]
    public function it_uses_uom_then_a_numeric_suffix_to_resolve_collisions(): void
    {
        $this->createPurchasePresentationTemplate(['code' => 'BOX_24']);

        $this->getJson(self::URL.'?'.http_build_query([
            'package_type' => 'BOX', 'base_unit_quantity' => 24,
            'compatible_dimension_uom_id' => $this->uomKg->public_id,
        ]))->assertOk()->assertJsonPath('code', 'BOX_24_KG');

        $this->createPurchasePresentationTemplate(['code' => 'BOX_24_KG']);
        $this->getJson(self::URL.'?'.http_build_query([
            'package_type' => 'BOX', 'base_unit_quantity' => 24,
            'compatible_dimension_uom_id' => $this->uomKg->public_id,
        ]))->assertOk()->assertJsonPath('code', 'BOX_24_KG_2');
    }

    #[Test]
    public function it_uses_a_numeric_suffix_when_the_uom_code_has_no_tokenizable_characters(): void
    {
        $this->uomKg->update(['code' => '---']);
        $this->createPurchasePresentationTemplate(['code' => 'BOX_24']);

        $this->getJson(self::URL.'?'.http_build_query([
            'package_type' => 'BOX', 'base_unit_quantity' => 24,
            'compatible_dimension_uom_id' => $this->uomKg->public_id,
        ]))->assertOk()->assertJsonPath('code', 'BOX_24_2');
    }

    #[Test]
    public function it_treats_soft_deleted_codes_as_occupied_for_suggestions(): void
    {
        $deleted = $this->createPurchasePresentationTemplate(['code' => 'TRAY_12']);
        $deleted->delete();

        $this->getJson(self::URL.'?'.http_build_query([
            'package_type' => 'TRAY', 'base_unit_quantity' => 12,
            'compatible_dimension_uom_id' => $this->uomKg->public_id,
        ]))->assertOk()->assertJsonPath('code', 'TRAY_12_KG');
    }

    #[Test]
    public function every_disambiguated_candidate_stays_within_fifty_characters(): void
    {
        $this->uomKg->update(['code' => str_repeat('LONG', 5)]);
        $this->createPurchasePresentationTemplate(['code' => 'BOX_24']);

        $query = http_build_query([
            'package_type' => 'BOX', 'base_unit_quantity' => 24,
            'compatible_dimension_uom_id' => $this->uomKg->public_id,
        ]);
        $qualified = $this->getJson(self::URL.'?'.$query)->assertOk()->json('code');
        $this->assertLessThanOrEqual(50, strlen($qualified));

        $this->createPurchasePresentationTemplate(['code' => $qualified]);
        $suffixed = $this->getJson(self::URL.'?'.$query)->assertOk()->json('code');
        $this->assertLessThanOrEqual(50, strlen($suffixed));
        $this->assertStringEndsWith('_2', $suffixed);
    }

    #[Test]
    public function it_requires_manage_permission_and_authentication(): void
    {
        $query = '?package_type=BOX&base_unit_quantity=24&compatible_dimension_uom_id='.$this->uomKg->public_id;
        $this->user->removeRole('inventory-manager');
        $this->user->givePermissionTo('purchase_presentation_templates.view');
        $this->getJson(self::URL.$query)->assertForbidden();

        Passport::actingAs($this->user);
        auth()->forgetGuards();
        $this->getJson(self::URL.$query)->assertUnauthorized();
    }

    #[Test]
    public function it_returns_a_fresh_candidate_when_creation_loses_a_unique_code_race(): void
    {
        Config::set('database.connections.race', Config::get('database.connections.'.Config::get('database.default')));
        $race = DB::connection('race');
        $raced = false;
        $raceUomPublicId = (string) Str::ulid();
        $raceUomId = $race->table('units_of_measure')->insertGetId([
            'public_id' => $raceUomPublicId,
            'code' => 'RACE499',
            'name' => 'Race UOM',
            'symbol' => 'r499',
            'precision' => 4,
            'is_decimal' => true,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Event::listen('eloquent.saving: '.PurchasePresentationTemplate::class, function (PurchasePresentationTemplate $template) use (&$raced, $race, $raceUomId): void {
            if ($raced || $template->name !== 'Perdedora') {
                return;
            }
            $raced = true;
            $race->table('purchase_presentation_templates')->insert([
                'public_id' => (string) Str::ulid(),
                'code' => 'BOX_24',
                'name' => 'Concurrente',
                'package_type' => 'BOX',
                'base_unit_quantity' => 24,
                'compatible_dimension_uom_id' => $raceUomId,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        try {
            $this->postJson('/api/v1/inventory/purchase-presentation-templates', [
                'code' => 'BOX_24',
                'name' => 'Perdedora',
                'package_type' => 'BOX',
                'base_unit_quantity' => 24,
                'compatible_dimension_uom_id' => $raceUomPublicId,
            ])->assertUnprocessable()
                ->assertJsonValidationErrors(['code'])
                ->assertJsonPath('rejected_code', 'BOX_24')
                ->assertJsonPath('suggested_code', 'BOX_24_RACE499')
                ->assertJsonPath('message', 'El código ya está en uso. Revisa la nueva sugerencia y vuelve a enviar el formulario.');
        } finally {
            $race->table('purchase_presentation_templates')->where('name', 'Concurrente')->delete();
            $race->table('units_of_measure')->where('id', $raceUomId)->delete();
            $race->disconnect();
        }
    }
}
