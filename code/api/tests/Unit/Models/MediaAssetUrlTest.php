<?php

declare(strict_types=1);

namespace Tests\Unit\Models;

use App\Models\MediaAsset;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MediaAssetUrlTest extends TestCase
{
    // ── getUrlAttribute ──────────────────────────────────────────────────────

    #[Test]
    public function it_signs_the_url_for_the_default_local_serve_disk(): void
    {
        Config::set('filesystems.default', 'local');

        $asset = new MediaAsset(['path' => 'media/photo.jpg']);

        $url = $asset->url;

        $this->assertStringContainsString('/storage/media/photo.jpg', $url);
        $this->assertStringContainsString('signature=', $url);
        $this->assertStringContainsString('expires=', $url);
    }

    #[Test]
    public function it_does_not_sign_and_does_not_throw_for_an_s3_disk_with_no_configured_url(): void
    {
        // AWS_URL is optional for S3 — the driver builds a fully-qualified
        // URL from bucket/region on its own when it's unset. A prior version
        // of getUrlAttribute() used the presence of the 'url' config key as
        // the signal for "needs a signed local route", so a null AWS_URL
        // sent every request down the signed-route branch and threw
        // RouteNotFoundException (no 'storage.s3' route is ever registered —
        // that route only exists for local-driver disks with 'serve' =>
        // true), turning every response embedding a photo into a 500.
        //
        // Storage::url() is mocked rather than exercised for real: this repo
        // doesn't depend on league/flysystem-aws-s3-v3 (s3 is config
        // scaffolding for a future cloud swap, not wired up yet), so
        // resolving a real 's3' disk isn't possible here. The mock isolates
        // exactly what this test is about — which branch getUrlAttribute()
        // takes — without needing that package installed.
        Config::set('filesystems.default', 's3');
        Config::set('filesystems.disks.s3.url', null);

        Storage::shouldReceive('url')
            ->once()
            ->with('media/photo.jpg')
            ->andReturn('https://sushigo-media.s3.amazonaws.com/media/photo.jpg');

        $asset = new MediaAsset(['path' => 'media/photo.jpg']);

        $this->assertSame('https://sushigo-media.s3.amazonaws.com/media/photo.jpg', $asset->url);
    }

    #[Test]
    public function it_does_not_sign_a_local_disk_marked_public(): void
    {
        Config::set('filesystems.default', 'local');
        Config::set('filesystems.disks.local.visibility', 'public');

        $asset = new MediaAsset(['path' => 'media/photo.jpg']);

        $url = $asset->url;

        $this->assertStringContainsString('/storage/media/photo.jpg', $url);
        $this->assertStringNotContainsString('signature=', $url);
    }
}
