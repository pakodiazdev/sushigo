<?php

namespace Tests\Feature\Inventory;

use App\Models\Item;
use Database\Seeders\Development\BrandSeeder;
use Database\Seeders\Development\InventoryCategorySeeder;
use Database\Seeders\Development\ProductCatalogSeeder;
use Database\Seeders\Development\PurchasePresentationTemplateSeeder;
use Database\Seeders\UnitOfMeasureSeeder;
use PHPUnit\Framework\Attributes\Test;

/**
 * Confirms the believable Development catalog seeded by #428 actually
 * renders through the real Product API contract (Acceptance Criteria
 * "Representative Products render through the new API contracts"), not
 * just through direct Eloquent assertions (see ProductCatalogSeederTest).
 */
class ProductCatalogApiIntegrationTest extends InventoryTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(UnitOfMeasureSeeder::class);
        $this->seed(BrandSeeder::class);
        $this->seed(InventoryCategorySeeder::class);
        $this->seed(PurchasePresentationTemplateSeeder::class);
        $this->seed(ProductCatalogSeeder::class);
    }

    #[Test]
    public function seeded_products_render_through_the_list_endpoint(): void
    {
        $response = $this->getJson('/api/v1/inventory/products?per_page=50');

        $response->assertStatus(200);

        $names = collect($response->json('data'))->pluck('name');
        $this->assertContains('Coca-Cola', $names);
        $this->assertContains('Buldak Ramen', $names);

        $cocaCola = collect($response->json('data'))->firstWhere('name', 'Coca-Cola');
        $this->assertSame('Coca-Cola', $cocaCola['brand']['name']);
        $this->assertSame('Bebidas', $cocaCola['inventory_category']['name']);
        $this->assertSame(3, $cocaCola['variants_count']);
    }

    #[Test]
    public function a_seeded_multi_variant_product_renders_through_the_show_endpoint(): void
    {
        $item = Item::where('name', 'Coca-Cola')->firstOrFail();

        $response = $this->getJson("/api/v1/inventory/products/{$item->public_id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'Coca-Cola')
            ->assertJsonPath('data.brand.name', 'Coca-Cola')
            ->assertJsonPath('data.inventory_category.name', 'Bebidas');
    }

    #[Test]
    public function a_seeded_products_variants_render_through_the_variants_endpoint(): void
    {
        $item = Item::where('name', 'Coca-Cola')->firstOrFail();

        $response = $this->getJson("/api/v1/inventory/products/{$item->public_id}/variants");

        $response->assertStatus(200);

        $codes = collect($response->json('data'))->pluck('code');
        $this->assertContains('COKE-ORIG-CAN355', $codes);
        $this->assertContains('COKE-ORIG-BOT600', $codes);
        $this->assertContains('COKE-ORIG-BOT2000', $codes);
    }

    #[Test]
    public function a_seeded_inactive_product_is_excluded_from_the_active_filter(): void
    {
        $response = $this->getJson('/api/v1/inventory/products?is_active=1&per_page=50');

        $response->assertStatus(200);

        $names = collect($response->json('data'))->pluck('name');
        $this->assertNotContains('Coca-Cola Vainilla', $names);
    }
}
