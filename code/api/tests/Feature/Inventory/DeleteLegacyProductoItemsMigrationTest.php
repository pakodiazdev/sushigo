<?php

namespace Tests\Feature\Inventory;

use App\Models\Item;
use App\Models\MediaAttachment;
use App\Models\MediaGallery;
use PHPUnit\Framework\Attributes\Test;

/**
 * By the time RefreshDatabase runs the real migration during test setUp(),
 * the database is empty, so it never finds anything to clean up — these
 * tests re-run the migration's up() directly against manually-seeded "old"
 * rows to actually exercise its cleanup logic.
 */
class DeleteLegacyProductoItemsMigrationTest extends InventoryTestCase
{
    private function runMigration(): void
    {
        (require database_path('migrations/2026_08_19_000000_delete_legacy_producto_items_without_inventory_category.php'))->up();
    }

    /**
     * Not createProduct() — that helper's `??=` default treats an explicit
     * null inventory_category_id the same as "omitted" and assigns a real
     * category, which defeats the point of these tests.
     */
    private function createOrphanProduct(array $attributes = []): Item
    {
        return Item::create(array_merge([
            'name' => 'Legacy Product',
            'type' => Item::TYPE_PRODUCTO,
            'inventory_category_id' => null,
            'is_stocked' => true,
            'is_perishable' => false,
            'is_active' => true,
        ], $attributes));
    }

    #[Test]
    public function it_deletes_an_orphan_producto_item_and_its_media_attachment()
    {
        $item = $this->createOrphanProduct(['name' => 'Legacy Product']);
        $gallery = MediaGallery::create(['name' => 'Legacy Product Gallery']);
        $attachment = MediaAttachment::create([
            'media_gallery_id' => $gallery->id,
            'attachable_type' => Item::class,
            'attachable_id' => $item->id,
            'is_primary' => true,
        ]);

        $this->runMigration();

        $this->assertDatabaseMissing('items', ['id' => $item->id]);
        $this->assertDatabaseMissing('media_attachments', ['id' => $attachment->id]);
        // The gallery itself is left for media:cleanup-orphans to sweep once
        // its grace period elapses — this migration only removes the
        // attachment link, not the gallery/assets/files.
        $this->assertDatabaseHas('media_galleries', ['id' => $gallery->id]);
    }

    #[Test]
    public function it_leaves_an_orphan_producto_item_with_variants_and_its_media_alone()
    {
        $item = $this->createOrphanProduct(['name' => 'Legacy Product With Variants']);
        $this->createItemVariant($item);

        $gallery = MediaGallery::create(['name' => 'Real Product Gallery']);
        $attachment = MediaAttachment::create([
            'media_gallery_id' => $gallery->id,
            'attachable_type' => Item::class,
            'attachable_id' => $item->id,
            'is_primary' => true,
        ]);

        $this->runMigration();

        $this->assertDatabaseHas('items', ['id' => $item->id]);
        $this->assertDatabaseHas('media_attachments', ['id' => $attachment->id]);
    }
}
