<?php

namespace Tests\Feature\Inventory;

use App\Models\Item;
use App\Models\MediaAsset;
use App\Models\MediaGallery;
use App\Services\Media\MediaAttachmentService;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class ProductCrudTest extends InventoryTestCase
{
    #[Test]
    public function it_lists_only_products_never_insumos_or_activos()
    {
        $this->createProduct(['name' => 'Coca-Cola 600ml']);
        $this->createItem(['name' => 'Salmon', 'type' => Item::TYPE_INSUMO]);
        $this->createItem(['name' => 'Freezer', 'type' => Item::TYPE_ACTIVO]);

        $response = $this->getJson('/api/v1/inventory/products');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $this->assertSame('Coca-Cola 600ml', $response->json('data.0.name'));
    }

    #[Test]
    public function it_filters_products_by_brand()
    {
        $brand = $this->createBrand();
        $this->createProduct(['brand_id' => $brand->id]);
        $this->createProduct();

        $response = $this->getJson("/api/v1/inventory/products?brand_id={$brand->public_id}");

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    #[Test]
    public function it_filters_products_by_inventory_category()
    {
        $category = $this->createInventoryCategory();
        $this->createProduct(['inventory_category_id' => $category->id]);
        $this->createProduct();

        $response = $this->getJson("/api/v1/inventory/products?inventory_category_id={$category->public_id}");

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    #[Test]
    public function it_rejects_filtering_by_a_soft_deleted_brand()
    {
        $brand = $this->createBrand();
        $brand->delete();

        $response = $this->getJson("/api/v1/inventory/products?brand_id={$brand->public_id}");

        $response->assertStatus(422)->assertJsonValidationErrors(['brand_id']);
    }

    #[Test]
    public function it_rejects_filtering_by_a_soft_deleted_inventory_category()
    {
        $category = $this->createInventoryCategory();
        $category->delete();

        $response = $this->getJson("/api/v1/inventory/products?inventory_category_id={$category->public_id}");

        $response->assertStatus(422)->assertJsonValidationErrors(['inventory_category_id']);
    }

    #[Test]
    public function it_filters_products_by_active_status()
    {
        $this->createProduct(['is_active' => true]);
        $this->createProduct(['is_active' => false]);

        $response = $this->getJson('/api/v1/inventory/products?is_active=1');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    #[Test]
    public function it_searches_products_by_name()
    {
        $this->createProduct(['name' => 'Coca-Cola Original']);
        $this->createProduct(['name' => 'Buldak Ramen']);

        $response = $this->getJson('/api/v1/inventory/products?search=coca');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    #[Test]
    public function it_can_create_a_product_with_only_name_and_category()
    {
        $category = $this->createInventoryCategory();

        $response = $this->postJson('/api/v1/inventory/products', [
            'name' => 'Coca-Cola 600ml',
            'inventory_category_id' => $category->public_id,
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Coca-Cola 600ml', 'is_active' => true]);

        $this->assertDatabaseHas('items', [
            'name' => 'Coca-Cola 600ml',
            'type' => Item::TYPE_PRODUCTO,
            'inventory_category_id' => $category->id,
            'sku' => null,
        ]);
    }

    #[Test]
    public function it_can_create_a_product_with_a_brand()
    {
        $category = $this->createInventoryCategory();
        $brand = $this->createBrand();

        $response = $this->postJson('/api/v1/inventory/products', [
            'name' => 'Coca-Cola 600ml',
            'inventory_category_id' => $category->public_id,
            'brand_id' => $brand->public_id,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('items', ['name' => 'Coca-Cola 600ml', 'brand_id' => $brand->id]);
    }

    #[Test]
    public function it_requires_inventory_category_on_create()
    {
        $response = $this->postJson('/api/v1/inventory/products', ['name' => 'Coca-Cola 600ml']);

        $response->assertStatus(422)->assertJsonValidationErrors(['inventory_category_id']);
    }

    #[Test]
    public function it_requires_name_on_create()
    {
        $category = $this->createInventoryCategory();

        $response = $this->postJson('/api/v1/inventory/products', [
            'inventory_category_id' => $category->public_id,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['name']);
    }

    #[Test]
    public function it_rejects_an_inactive_brand_on_create()
    {
        $category = $this->createInventoryCategory();
        $brand = $this->createBrand(['is_active' => false]);

        $response = $this->postJson('/api/v1/inventory/products', [
            'name' => 'Coca-Cola 600ml',
            'inventory_category_id' => $category->public_id,
            'brand_id' => $brand->public_id,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['brand_id']);
    }

    #[Test]
    public function it_rejects_a_soft_deleted_inventory_category_on_create()
    {
        $category = $this->createInventoryCategory();
        $category->delete();

        $response = $this->postJson('/api/v1/inventory/products', [
            'name' => 'Coca-Cola 600ml',
            'inventory_category_id' => $category->public_id,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['inventory_category_id']);
    }

    #[Test]
    public function it_rejects_a_soft_deleted_brand_on_create()
    {
        $category = $this->createInventoryCategory();
        $brand = $this->createBrand();
        $brand->delete();

        $response = $this->postJson('/api/v1/inventory/products', [
            'name' => 'Coca-Cola 600ml',
            'inventory_category_id' => $category->public_id,
            'brand_id' => $brand->public_id,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['brand_id']);
    }

    #[Test]
    public function it_rejects_cost_price_stock_and_uom_fields_on_create()
    {
        $category = $this->createInventoryCategory();

        $response = $this->postJson('/api/v1/inventory/products', [
            'name' => 'Coca-Cola 600ml',
            'inventory_category_id' => $category->public_id,
            'sale_price' => 25.50,
            'min_stock' => 10,
            'max_stock' => 100,
            'uom_id' => 1,
            'sku' => 'SHOULD-BE-IGNORED',
        ]);

        $response->assertStatus(201);
        $item = Item::where('name', 'Coca-Cola 600ml')->firstOrFail();
        $this->assertNull($item->sku);
        // sale_price/min_stock/max_stock/uom_id are ItemVariant columns, not Item —
        // asserting the create request never even reaches them is implicit: Item has
        // no such columns, so this would fatal at the DB layer if they were written.
        $this->assertSame('Coca-Cola 600ml', $item->name);
    }

    #[Test]
    public function it_can_show_a_product_with_brand_category_and_variant_count()
    {
        $category = $this->createInventoryCategory(['name' => 'Beverages']);
        $brand = $this->createBrand(['name' => 'Coca-Cola']);
        $product = $this->createProduct(['inventory_category_id' => $category->id, 'brand_id' => $brand->id]);
        $this->createItemVariant($product);
        $this->createItemVariant($product);

        $response = $this->getJson("/api/v1/inventory/products/{$product->public_id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['variants_count' => 2])
            ->assertJsonPath('data.brand.name', 'Coca-Cola')
            ->assertJsonPath('data.inventory_category.name', 'Beverages');
    }

    #[Test]
    public function it_allows_creating_a_product_under_an_inactive_category_with_a_warning()
    {
        $category = $this->createInventoryCategory(['name' => 'Discontinued', 'is_active' => false]);

        $response = $this->postJson('/api/v1/inventory/products', [
            'name' => 'Coca-Cola 600ml',
            'inventory_category_id' => $category->public_id,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.warnings.0', 'The assigned category "Discontinued" is inactive; this product will not appear as active until it is reactivated.');
    }

    #[Test]
    public function it_reports_no_warnings_for_a_product_under_an_active_category()
    {
        $category = $this->createInventoryCategory(['is_active' => true]);

        $response = $this->postJson('/api/v1/inventory/products', [
            'name' => 'Coca-Cola 600ml',
            'inventory_category_id' => $category->public_id,
        ]);

        $response->assertStatus(201)->assertJsonPath('data.warnings', []);
    }

    #[Test]
    public function it_allows_reassigning_a_product_to_an_inactive_category_with_a_warning()
    {
        $oldCategory = $this->createInventoryCategory();
        $newCategory = $this->createInventoryCategory(['name' => 'Discontinued', 'is_active' => false]);
        $product = $this->createProduct(['inventory_category_id' => $oldCategory->id]);

        $response = $this->putJson("/api/v1/inventory/products/{$product->public_id}", [
            'inventory_category_id' => $newCategory->public_id,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.warnings.0', 'The assigned category "Discontinued" is inactive; this product will not appear as active until it is reactivated.');
    }

    #[Test]
    public function it_excludes_a_product_with_an_inactive_category_from_the_active_filter()
    {
        $activeCategory = $this->createInventoryCategory(['is_active' => true]);
        $inactiveCategory = $this->createInventoryCategory(['is_active' => false]);
        $this->createProduct(['inventory_category_id' => $activeCategory->id, 'is_active' => true, 'name' => 'Truly Active']);
        $this->createProduct(['inventory_category_id' => $inactiveCategory->id, 'is_active' => true, 'name' => 'Own Flag Active But Category Off']);

        $response = $this->getJson('/api/v1/inventory/products?is_active=1');

        $response->assertStatus(200);
        $names = collect($response->json('data'))->pluck('name');
        $this->assertTrue($names->contains('Truly Active'));
        $this->assertFalse($names->contains('Own Flag Active But Category Off'));
    }

    #[Test]
    public function it_includes_a_product_with_an_inactive_category_in_the_inactive_filter()
    {
        $activeCategory = $this->createInventoryCategory(['is_active' => true]);
        $inactiveCategory = $this->createInventoryCategory(['is_active' => false]);
        $this->createProduct(['inventory_category_id' => $activeCategory->id, 'is_active' => true, 'name' => 'Truly Active']);
        $this->createProduct(['inventory_category_id' => $inactiveCategory->id, 'is_active' => true, 'name' => 'Own Flag Active But Category Off']);

        $response = $this->getJson('/api/v1/inventory/products?is_active=0');

        $response->assertStatus(200);
        $names = collect($response->json('data'))->pluck('name');
        $this->assertTrue($names->contains('Own Flag Active But Category Off'));
        $this->assertFalse($names->contains('Truly Active'));
    }

    #[Test]
    public function it_excludes_a_product_with_no_category_from_the_active_filter_and_warns()
    {
        // Only reachable via the legacy /items endpoint today. Item::create()
        // directly, not createProduct() — that helper's `??=` default treats an
        // explicit null the same as "omitted" and would assign a real category.
        Item::create([
            'name' => 'No Category',
            'type' => Item::TYPE_PRODUCTO,
            'inventory_category_id' => null,
            'is_stocked' => true,
            'is_perishable' => false,
            'is_active' => true,
        ]);

        $activeResponse = $this->getJson('/api/v1/inventory/products?is_active=1');
        $this->assertFalse(collect($activeResponse->json('data'))->pluck('name')->contains('No Category'));

        $inactiveResponse = $this->getJson('/api/v1/inventory/products?is_active=0');
        $row = collect($inactiveResponse->json('data'))->firstWhere('name', 'No Category');
        $this->assertNotNull($row);
        $this->assertSame(
            'This product has no inventory category assigned; it will not appear as active until one is assigned.',
            $row['warnings'][0]
        );
    }

    #[Test]
    public function it_excludes_a_product_with_a_soft_deleted_category_from_the_active_filter_and_warns()
    {
        $category = $this->createInventoryCategory(['name' => 'Discontinued']);
        $this->createProduct(['inventory_category_id' => $category->id, 'is_active' => true, 'name' => 'Deleted Category Product']);
        $category->delete();

        $activeResponse = $this->getJson('/api/v1/inventory/products?is_active=1');
        $this->assertFalse(collect($activeResponse->json('data'))->pluck('name')->contains('Deleted Category Product'));

        $inactiveResponse = $this->getJson('/api/v1/inventory/products?is_active=0');
        $row = collect($inactiveResponse->json('data'))->firstWhere('name', 'Deleted Category Product');
        $this->assertNotNull($row);
        $this->assertSame(
            'The assigned category "Discontinued" has been deleted; this product will not appear as active until it is reassigned to an active category.',
            $row['warnings'][0]
        );
    }

    #[Test]
    public function it_rejects_a_non_string_inventory_category_id_on_update_without_a_server_error()
    {
        $product = $this->createProduct();

        $response = $this->putJson("/api/v1/inventory/products/{$product->public_id}", [
            'inventory_category_id' => ['not', 'a', 'string'],
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['inventory_category_id']);
    }

    #[Test]
    public function it_rejects_a_non_string_brand_id_on_update_without_a_server_error()
    {
        $product = $this->createProduct();

        $response = $this->putJson("/api/v1/inventory/products/{$product->public_id}", [
            'brand_id' => ['not', 'a', 'string'],
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['brand_id']);
    }

    #[Test]
    public function it_still_shows_a_deleted_brands_name_on_the_product_it_was_assigned_to()
    {
        $category = $this->createInventoryCategory();
        $brand = $this->createBrand(['name' => 'Coca-Cola']);
        $product = $this->createProduct(['inventory_category_id' => $category->id, 'brand_id' => $brand->id]);

        $this->deleteJson("/api/v1/brands/{$brand->public_id}")->assertStatus(204);

        $response = $this->getJson("/api/v1/inventory/products/{$product->public_id}");

        $response->assertStatus(200)->assertJsonPath('data.brand.name', 'Coca-Cola');
    }

    #[Test]
    public function it_still_shows_a_deleted_categorys_name_on_the_product_it_was_assigned_to()
    {
        $category = $this->createInventoryCategory(['name' => 'Beverages']);
        $product = $this->createProduct(['inventory_category_id' => $category->id]);

        // Soft-delete directly on the model: the HTTP delete endpoint blocks
        // deletion while an active Product still references the category
        // (see InventoryCategoryCrudTest), so this reproduces the
        // already-trashed state that historical Products must still render.
        $category->delete();

        $response = $this->getJson("/api/v1/inventory/products/{$product->public_id}");

        $response->assertStatus(200)->assertJsonPath('data.inventory_category.name', 'Beverages');
    }

    #[Test]
    public function it_reflects_photo_url_from_whichever_media_asset_is_currently_primary()
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
        Storage::fake('local');
        foreach (['media.upload', 'media.update', 'media.delete'] as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'api']);
        }
        $this->user->givePermissionTo(['media.upload', 'media.update', 'media.delete']);

        $product = $this->createProduct();
        $gallery = MediaGallery::create(['name' => 'Product gallery']);
        $assetA = MediaAsset::create([
            'media_gallery_id' => $gallery->id,
            'path' => 'media/a.jpg',
            'mime_type' => 'image/jpeg',
            'filename' => 'a.jpg',
            'size' => 1024,
            'position' => 0,
            'is_primary' => true,
        ]);
        $assetB = MediaAsset::create([
            'media_gallery_id' => $gallery->id,
            'path' => 'media/b.jpg',
            'mime_type' => 'image/jpeg',
            'filename' => 'b.jpg',
            'size' => 1024,
            'position' => 1,
            'is_primary' => false,
        ]);
        app(MediaAttachmentService::class)($product, $gallery->id);

        $before = $this->getJson("/api/v1/inventory/products/{$product->public_id}");
        $before->assertOk()->assertJsonPath('data.photo_url', $assetA->url);

        $this->patchJson("/api/v1/media/assets/{$assetB->public_id}", ['is_primary' => true])->assertOk();

        $after = $this->getJson("/api/v1/inventory/products/{$product->public_id}");
        $after->assertOk()->assertJsonPath('data.photo_url', $assetB->url);
    }

    #[Test]
    public function it_can_update_a_product()
    {
        $product = $this->createProduct(['name' => 'Old Name']);

        $response = $this->putJson("/api/v1/inventory/products/{$product->public_id}", [
            'name' => 'New Name',
        ]);

        $response->assertStatus(200)->assertJsonFragment(['name' => 'New Name']);
        $this->assertDatabaseHas('items', ['id' => $product->id, 'name' => 'New Name']);
    }

    #[Test]
    public function it_rejects_a_soft_deleted_inventory_category_on_update()
    {
        $product = $this->createProduct();
        $category = $this->createInventoryCategory();
        $category->delete();

        $response = $this->putJson("/api/v1/inventory/products/{$product->public_id}", [
            'inventory_category_id' => $category->public_id,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['inventory_category_id']);
    }

    #[Test]
    public function it_allows_re_saving_a_product_whose_assigned_brand_has_since_gone_inactive()
    {
        $brand = $this->createBrand(['is_active' => true]);
        $product = $this->createProduct(['brand_id' => $brand->id]);
        $brand->update(['is_active' => false]);

        $response = $this->putJson("/api/v1/inventory/products/{$product->public_id}", [
            'name' => 'Updated Name',
            'brand_id' => $brand->public_id,
        ]);

        $response->assertStatus(200)->assertJsonFragment(['name' => 'Updated Name']);
    }

    #[Test]
    public function it_rejects_reassigning_a_product_to_a_different_inactive_brand()
    {
        $oldBrand = $this->createBrand(['is_active' => true]);
        $newBrand = $this->createBrand(['is_active' => false]);
        $product = $this->createProduct(['brand_id' => $oldBrand->id]);

        $response = $this->putJson("/api/v1/inventory/products/{$product->public_id}", [
            'brand_id' => $newBrand->public_id,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['brand_id']);
    }

    #[Test]
    public function it_allows_re_saving_a_product_whose_assigned_brand_has_since_been_soft_deleted()
    {
        $brand = $this->createBrand();
        $product = $this->createProduct(['brand_id' => $brand->id]);
        $brand->delete();

        $response = $this->putJson("/api/v1/inventory/products/{$product->public_id}", [
            'name' => 'Updated Name',
            'brand_id' => $brand->public_id,
        ]);

        $response->assertStatus(200)->assertJsonFragment(['name' => 'Updated Name']);
        $this->assertDatabaseHas('items', ['id' => $product->id, 'brand_id' => $brand->id]);
    }

    #[Test]
    public function it_allows_re_saving_a_product_whose_assigned_category_has_since_been_soft_deleted()
    {
        $category = $this->createInventoryCategory();
        $product = $this->createProduct(['inventory_category_id' => $category->id]);
        $category->delete();

        $response = $this->putJson("/api/v1/inventory/products/{$product->public_id}", [
            'name' => 'Updated Name',
            'inventory_category_id' => $category->public_id,
        ]);

        $response->assertStatus(200)->assertJsonFragment(['name' => 'Updated Name']);
        $this->assertDatabaseHas('items', ['id' => $product->id, 'inventory_category_id' => $category->id]);
    }

    #[Test]
    public function it_rejects_reassigning_a_product_to_a_different_soft_deleted_category()
    {
        $oldCategory = $this->createInventoryCategory();
        $newCategory = $this->createInventoryCategory();
        $newCategory->delete();
        $product = $this->createProduct(['inventory_category_id' => $oldCategory->id]);

        $response = $this->putJson("/api/v1/inventory/products/{$product->public_id}", [
            'inventory_category_id' => $newCategory->public_id,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['inventory_category_id']);
    }

    #[Test]
    public function it_can_delete_a_product_without_variants()
    {
        $product = $this->createProduct();

        $response = $this->deleteJson("/api/v1/inventory/products/{$product->public_id}");

        $response->assertStatus(200);
        $this->assertSoftDeleted('items', ['id' => $product->id]);
    }

    #[Test]
    public function it_rejects_requests_without_items_view_permission()
    {
        $this->user->removeRole('inventory-manager');

        $response = $this->getJson('/api/v1/inventory/products');

        $response->assertStatus(403);
    }

    #[Test]
    public function it_allows_listing_with_suppliers_manage_permission_but_not_items_view()
    {
        $this->createProduct(['name' => 'Coca-Cola 600ml']);
        $this->user->removeRole('inventory-manager');
        $this->user->givePermissionTo('suppliers.manage');

        $response = $this->getJson('/api/v1/inventory/products');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    #[Test]
    public function it_rejects_show_without_items_view_permission()
    {
        $product = $this->createProduct();
        $this->user->removeRole('inventory-manager');

        $response = $this->getJson("/api/v1/inventory/products/{$product->public_id}");

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_create_without_items_create_permission()
    {
        $this->user->removeRole('inventory-manager');
        $category = $this->createInventoryCategory();

        $response = $this->postJson('/api/v1/inventory/products', [
            'name' => 'Coca-Cola 600ml',
            'inventory_category_id' => $category->public_id,
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_update_without_items_update_permission()
    {
        $product = $this->createProduct();
        $this->user->removeRole('inventory-manager');

        $response = $this->putJson("/api/v1/inventory/products/{$product->public_id}", ['name' => 'Nuevo']);

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_delete_without_items_delete_permission()
    {
        $product = $this->createProduct();
        $this->user->removeRole('inventory-manager');

        $response = $this->deleteJson("/api/v1/inventory/products/{$product->public_id}");

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_unauthenticated_list_request()
    {
        auth()->forgetGuards();

        $response = $this->getJson('/api/v1/inventory/products');

        $response->assertStatus(401);
    }

    #[Test]
    public function it_rejects_unauthenticated_show_request()
    {
        $product = $this->createProduct();
        auth()->forgetGuards();

        $response = $this->getJson("/api/v1/inventory/products/{$product->public_id}");

        $response->assertStatus(401);
    }

    #[Test]
    public function it_rejects_unauthenticated_create_request()
    {
        $category = $this->createInventoryCategory();
        auth()->forgetGuards();

        $response = $this->postJson('/api/v1/inventory/products', [
            'name' => 'Coca-Cola 600ml',
            'inventory_category_id' => $category->public_id,
        ]);

        $response->assertStatus(401);
    }

    #[Test]
    public function it_rejects_unauthenticated_update_request()
    {
        $product = $this->createProduct();
        auth()->forgetGuards();

        $response = $this->putJson("/api/v1/inventory/products/{$product->public_id}", ['name' => 'Nuevo']);

        $response->assertStatus(401);
    }

    #[Test]
    public function it_rejects_unauthenticated_delete_request()
    {
        $product = $this->createProduct();
        auth()->forgetGuards();

        $response = $this->deleteJson("/api/v1/inventory/products/{$product->public_id}");

        $response->assertStatus(401);
    }
}
