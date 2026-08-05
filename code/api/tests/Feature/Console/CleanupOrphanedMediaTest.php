<?php

namespace Tests\Feature\Console;

use App\Models\Item;
use App\Models\MediaAsset;
use App\Models\MediaAttachment;
use App\Models\MediaGallery;
use App\Services\Media\DeleteMediaAssetService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class CleanupOrphanedMediaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
    }

    private function createGallery(int $ageInDays, bool $attached): MediaGallery
    {
        $gallery = MediaGallery::create(['name' => 'Gallery']);
        $gallery->forceFill(['created_at' => now()->subDays($ageInDays)])->save();

        $path = 'media/'.uniqid().'.jpg';
        Storage::disk('local')->put($path, 'fake-content');

        MediaAsset::create([
            'media_gallery_id' => $gallery->id,
            'path' => $path,
            'mime_type' => 'image/jpeg',
            'filename' => 'photo.jpg',
            'size' => 12,
            'position' => 0,
            'is_primary' => true,
        ]);

        if ($attached) {
            $item = Item::create([
                'sku' => 'SKU-'.uniqid(),
                'name' => 'Attached Item',
                'type' => 'PRODUCTO',
                'is_stocked' => true,
                'is_perishable' => false,
                'is_active' => true,
            ]);

            MediaAttachment::create([
                'media_gallery_id' => $gallery->id,
                'attachable_type' => $item->getMorphClass(),
                'attachable_id' => $item->id,
                'is_primary' => true,
            ]);
        }

        return $gallery;
    }

    #[Test]
    public function it_deletes_orphaned_galleries_older_than_the_grace_period(): void
    {
        config(['media.orphan_grace_period_days' => 7]);
        $old = $this->createGallery(ageInDays: 10, attached: false);
        $asset = $old->mediaAssets()->first();

        $this->artisan('media:cleanup-orphans')->assertExitCode(0);

        $this->assertDatabaseMissing('media_galleries', ['id' => $old->id]);
        $this->assertDatabaseMissing('media_assets', ['id' => $asset->id]);
        Storage::disk('local')->assertMissing($asset->path);
    }

    #[Test]
    public function it_does_not_delete_recently_created_orphaned_galleries(): void
    {
        config(['media.orphan_grace_period_days' => 7]);
        $recent = $this->createGallery(ageInDays: 1, attached: false);

        $this->artisan('media:cleanup-orphans')->assertExitCode(0);

        $this->assertDatabaseHas('media_galleries', ['id' => $recent->id]);
    }

    #[Test]
    public function it_does_not_delete_galleries_with_attachments(): void
    {
        config(['media.orphan_grace_period_days' => 7]);
        $attached = $this->createGallery(ageInDays: 30, attached: true);

        $this->artisan('media:cleanup-orphans')->assertExitCode(0);

        $this->assertDatabaseHas('media_galleries', ['id' => $attached->id]);
    }

    #[Test]
    public function it_continues_the_sweep_when_one_gallery_fails_to_delete(): void
    {
        config(['media.orphan_grace_period_days' => 7]);
        $failing = $this->createGallery(ageInDays: 10, attached: false);
        $failingAssetId = $failing->mediaAssets()->first()->id;
        $healthy = $this->createGallery(ageInDays: 10, attached: false);
        $healthyAssetId = $healthy->mediaAssets()->first()->id;

        // Simulates any unexpected per-gallery failure (a race, a transient
        // DB error) — TD-02 relies on one gallery's failure not aborting the
        // rest of the backlog in the same run.
        $this->app->bind(DeleteMediaAssetService::class, fn () => new class($failingAssetId) extends DeleteMediaAssetService
        {
            public function __construct(private int $failingAssetId) {}

            public function __invoke(MediaAsset $asset): void
            {
                if ($asset->id === $this->failingAssetId) {
                    throw new RuntimeException('simulated concurrent deletion');
                }

                parent::__invoke($asset);
            }
        });

        $this->artisan('media:cleanup-orphans')->assertExitCode(0);

        // The failing gallery is left untouched (its delete attempt threw)...
        $this->assertDatabaseHas('media_galleries', ['id' => $failing->id]);
        $this->assertDatabaseHas('media_assets', ['id' => $failingAssetId]);
        // ...but the healthy gallery in the same run was still cleaned up.
        $this->assertDatabaseMissing('media_galleries', ['id' => $healthy->id]);
        $this->assertDatabaseMissing('media_assets', ['id' => $healthyAssetId]);
    }
}
