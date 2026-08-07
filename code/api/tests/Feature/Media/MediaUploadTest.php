<?php

namespace Tests\Feature\Media;

use App\Models\MediaAsset;
use App\Models\MediaGallery;
use App\Models\User;
use App\Services\Media\UploadMediaService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Passport\Passport;
use Mockery;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class MediaUploadTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Storage::fake('local');

        Permission::create(['name' => 'media.upload', 'guard_name' => 'api']);
        $admin = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $admin->givePermissionTo('media.upload');
    }

    private function adminUser(): User
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        return $user;
    }

    #[Test]
    public function it_creates_a_new_gallery_and_asset_when_no_gallery_id_given(): void
    {
        Passport::actingAs($this->adminUser());

        $response = $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image('photo.jpg'),
            'owner_token' => 'token-1',
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['status', 'data' => ['gallery_id', 'asset_id', 'url', 'filename', 'mime_type', 'size', 'position', 'is_primary']]);

        $this->assertSame(1, MediaGallery::count());
        $this->assertTrue($response->json('data.is_primary'));

        // The 'local' disk has no 'url' config, so Storage::url() alone
        // returns a host-relative path via Laravel's serve route — the API
        // and webapp are different origins, so a relative URL would resolve
        // against the wrong one. MediaAsset::getUrlAttribute() must return
        // an absolute URL.
        $this->assertStringStartsWith(config('app.url'), $response->json('data.url'));

        Storage::disk('local')->assertExists(
            MediaAsset::first()->path
        );
    }

    #[Test]
    public function it_returns_a_signed_url_that_is_actually_fetchable(): void
    {
        Passport::actingAs($this->adminUser());

        $response = $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image('photo.jpg'),
            'owner_token' => 'token-1',
        ]);

        $relativeUrl = substr($response->json('data.url'), strlen(config('app.url')));

        // Regression guard: the 'local' disk's Laravel-registered serve route
        // (config/filesystems.php's 'serve' => true) 403s any request
        // without a valid *relative* signature, since the disk isn't
        // 'visibility' => 'public' (Illuminate\Filesystem\ServeFile). A plain
        // Storage::url() path carries no signature at all, so a fully
        // authenticated, permitted admin used to get a 403 fetching a URL
        // this very endpoint just handed back — assertJsonStructure alone
        // (above) can't catch that, since it never fetches the URL.
        $this->get($relativeUrl)->assertOk();
    }

    #[Test]
    public function it_reuses_the_existing_gallery_when_gallery_id_given(): void
    {
        Passport::actingAs($this->adminUser());

        $first = $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image('first.jpg'),
            'owner_token' => 'token-1',
        ])->json('data');

        $second = $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image('second.jpg'),
            'media_gallery_id' => $first['gallery_id'],
            'owner_token' => 'token-1',
        ]);

        $second->assertCreated();

        $this->assertSame(1, MediaGallery::count());
        $this->assertSame($first['gallery_id'], $second->json('data.gallery_id'));
        $this->assertFalse($second->json('data.is_primary'));
        $this->assertSame(1, $second->json('data.position'));
    }

    #[Test]
    public function it_rejects_reusing_an_unattached_gallery_with_the_wrong_owner_token(): void
    {
        Passport::actingAs($this->adminUser());

        $first = $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image('first.jpg'),
            'owner_token' => 'token-1',
        ])->json('data');

        $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image('second.jpg'),
            'media_gallery_id' => $first['gallery_id'],
            'owner_token' => 'wrong-token',
        ])->assertForbidden();
    }

    #[Test]
    public function it_rejects_reusing_an_unattached_gallery_with_no_owner_token(): void
    {
        Passport::actingAs($this->adminUser());

        $first = $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image('first.jpg'),
            'owner_token' => 'token-1',
        ])->json('data');

        $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image('second.jpg'),
            'media_gallery_id' => $first['gallery_id'],
        ])->assertForbidden();
    }

    #[Test]
    public function it_avoids_position_collisions_after_a_deletion(): void
    {
        Passport::actingAs($this->adminUser());

        $first = $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image('first.jpg'),
            'owner_token' => 'token-1',
        ])->json('data');
        $galleryId = $first['gallery_id'];

        $second = $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image('second.jpg'),
            'media_gallery_id' => $galleryId,
            'owner_token' => 'token-1',
        ])->json('data');

        $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image('third.jpg'),
            'media_gallery_id' => $galleryId,
            'owner_token' => 'token-1',
        ]);

        // Positions are now [0, 1, 2]. Deleting the middle one (bypassing
        // the DELETE endpoint — permissions aren't the point here) leaves a
        // gap: [0, 2]. count() would recompute 2 and collide with the
        // asset still at position 2; max(position)+1 correctly gives 3.
        MediaAsset::where('public_id', $second['asset_id'])->first()->forceDelete();

        $fourth = $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image('fourth.jpg'),
            'media_gallery_id' => $galleryId,
            'owner_token' => 'token-1',
        ]);

        $fourth->assertCreated();
        $this->assertSame(3, $fourth->json('data.position'));
    }

    #[Test]
    public function it_truncates_an_oversized_original_filename(): void
    {
        Passport::actingAs($this->adminUser());

        $longName = str_repeat('a', 300).'.jpg';
        $response = $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image($longName),
            'owner_token' => 'token-1',
        ]);

        $response->assertCreated();
        $this->assertSame(255, strlen($response->json('data.filename')));
    }

    #[Test]
    public function it_rejects_an_array_media_gallery_id_with_a_clean_422(): void
    {
        Passport::actingAs($this->adminUser());

        // authorize() runs before validation and reads media_gallery_id
        // raw — an array here must not reach the MediaGallery::where()
        // query unguarded. (Eloquent's flattenValue() actually reduces an
        // array where() value to its first scalar rather than crashing, so
        // this specific field wasn't exploitable to a 500 — rawStringInput()
        // still guards it for defense in depth, and this asserts the
        // request rejects cleanly either way.)
        $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image('photo.jpg'),
            'media_gallery_id' => ['not-a-string'],
            'owner_token' => 'token-1',
        ])->assertUnprocessable()->assertJsonValidationErrors('media_gallery_id');
    }

    #[Test]
    public function it_rejects_an_array_owner_token_with_a_clean_422(): void
    {
        Passport::actingAs($this->adminUser());

        $gallery = $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image('first.jpg'),
            'owner_token' => 'token-1',
        ])->json('data.gallery_id');

        // authorize() reads owner_token raw and passes it into
        // MediaGallery::isManageableBy(?string $providedToken) — this only
        // runs when media_gallery_id resolves to an existing gallery, so an
        // array owner_token must be paired with one to reach that typed
        // parameter unguarded (would raise a TypeError / 500 otherwise).
        // rawStringInput() treats the array as absent, so it's compared
        // against the real stored token as null — a clean 403, not a crash.
        $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image('second.jpg'),
            'media_gallery_id' => $gallery,
            'owner_token' => ['not-a-string'],
        ])->assertForbidden();
    }

    #[Test]
    public function it_rejects_a_missing_file(): void
    {
        Passport::actingAs($this->adminUser());

        $this->postJson('/api/v1/media/upload', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('file');
    }

    #[Test]
    public function it_rejects_a_disallowed_mime_type(): void
    {
        Passport::actingAs($this->adminUser());

        $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->create('doc.exe', 10, 'application/x-msdownload'),
            'owner_token' => 'token-1',
        ])->assertUnprocessable()->assertJsonValidationErrors('file');
    }

    #[Test]
    public function it_requires_an_owner_token_when_starting_a_new_gallery(): void
    {
        Passport::actingAs($this->adminUser());

        $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image('photo.jpg'),
        ])->assertUnprocessable()->assertJsonValidationErrors('owner_token');
    }

    #[Test]
    public function it_rejects_an_unknown_gallery_id(): void
    {
        Passport::actingAs($this->adminUser());

        $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image('photo.jpg'),
            'media_gallery_id' => '01ARZ3NDEKTSV4RRFFQ69G5FAV',
        ])->assertUnprocessable()->assertJsonValidationErrors('media_gallery_id');
    }

    #[Test]
    public function it_deletes_the_stored_file_when_the_transaction_fails(): void
    {
        // Bypasses UploadMediaRequest's exists: validation to force the failure
        // path inside UploadMediaService itself.
        $file = UploadedFile::fake()->image('photo.jpg');

        $this->expectException(ModelNotFoundException::class);

        try {
            app(UploadMediaService::class)($file, 999999);
        } finally {
            Storage::disk('local')->assertDirectoryEmpty('media');
        }
    }

    #[Test]
    public function it_throws_instead_of_creating_an_asset_when_the_storage_write_fails(): void
    {
        // config/filesystems.php sets 'throw' => false, so a real storage
        // failure returns false rather than throwing — simulated here by
        // swapping the local disk for one whose write always fails.
        $failingDisk = Mockery::mock(FilesystemAdapter::class);
        $failingDisk->shouldReceive('putFileAs')->andReturn(false);
        Storage::shouldReceive('disk')->with('local')->andReturn($failingDisk);

        $this->expectException(RuntimeException::class);

        // expectException() unwinds the stack the moment upload() throws, so
        // an assertion placed after the call would be dead code — it must
        // run in finally to actually execute.
        try {
            app(UploadMediaService::class)(UploadedFile::fake()->image('photo.jpg'), null);
        } finally {
            $this->assertSame(0, MediaAsset::count());
        }
    }

    #[Test]
    public function unauthenticated_cannot_upload(): void
    {
        $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image('photo.jpg'),
        ])->assertUnauthorized();
    }

    #[Test]
    public function user_without_permission_cannot_upload(): void
    {
        Passport::actingAs(User::factory()->create());

        $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image('photo.jpg'),
        ])->assertForbidden();
    }
}
