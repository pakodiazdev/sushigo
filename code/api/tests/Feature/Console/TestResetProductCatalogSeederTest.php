<?php

namespace Tests\Feature\Console;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class TestResetProductCatalogSeederTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function list_option_shows_products_and_fakes_products_groups(): void
    {
        // "fakes-products" must be asserted before the shorter "products" substring —
        // expectsOutputToContain expectations are unbounded, so a shorter substring
        // registered first will also swallow later lines that merely contain it
        // (e.g. "products" matching the "fakes-products" line) and starve the later one.
        $this->artisan('test:reset', ['--list' => true])
            ->expectsOutputToContain('fakes-products')
            ->expectsOutputToContain('products')
            ->expectsOutputToContain('ProductCatalogTestSeeder')
            ->expectsOutputToContain('FakeProductCatalogSeeder')
            ->assertExitCode(0);
    }

    #[Test]
    public function products_group_seeds_deterministic_brands_and_categories(): void
    {
        $this->artisan('test:reset', ['--seeders' => 'products'])
            ->expectsOutputToContain('ProductCatalogTestSeeder')
            ->assertExitCode(0);

        $this->assertDatabaseHas('brands', ['name' => 'Coca-Cola']);
        $this->assertDatabaseHas('brands', ['name' => 'Buldak']);
        $this->assertDatabaseHas('inventory_categories', ['name' => 'Bebidas']);
        $this->assertDatabaseHas('inventory_categories', ['name' => 'Ramen Instantáneo']);

        foreach (['units_of_measure', 'items', 'item_variants'] as $table) {
            $this->assertSame(0, DB::table($table)->whereNull('public_id')->count());
        }
    }

    #[Test]
    public function products_group_seeds_a_multi_variant_product(): void
    {
        $this->artisan('test:reset', ['--seeders' => 'products'])->assertExitCode(0);

        $this->assertDatabaseHas('items', ['name' => 'Coca-Cola']);

        $itemId = DB::table('items')->where('name', 'Coca-Cola')->value('id');
        $this->assertSame(2, DB::table('item_variants')->where('item_id', $itemId)->count());
    }

    #[Test]
    public function products_group_seeds_a_single_variant_product(): void
    {
        $this->artisan('test:reset', ['--seeders' => 'products'])->assertExitCode(0);

        $this->assertDatabaseHas('items', ['name' => 'Coca-Cola Sin Azúcar']);

        $itemId = DB::table('items')->where('name', 'Coca-Cola Sin Azúcar')->value('id');
        $this->assertSame(1, DB::table('item_variants')->where('item_id', $itemId)->count());
    }

    #[Test]
    public function products_group_seeds_a_product_with_an_inactive_variant(): void
    {
        $this->artisan('test:reset', ['--seeders' => 'products'])->assertExitCode(0);

        $this->assertDatabaseHas('item_variants', ['code' => 'BULDAK-CARBONARA-140', 'is_active' => false]);
    }

    #[Test]
    public function fakes_products_group_creates_volume_data_for_pagination_testing(): void
    {
        $this->artisan('test:reset', ['--seeders' => 'fakes-products'])
            ->expectsOutputToContain('FakeProductCatalogSeeder')
            ->assertExitCode(0);

        $productCount = config('seeders.factory_counts.fake_products', 20);

        // fakes-products runs ProductCatalogTestSeeder first (3 deterministic products)
        // then FakeProductCatalogSeeder adds $productCount more via factories.
        $this->assertSame(3 + $productCount, DB::table('items')->where('type', 'PRODUCTO')->count());
    }
}
