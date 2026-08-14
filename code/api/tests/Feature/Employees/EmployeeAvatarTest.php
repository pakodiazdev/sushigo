<?php

namespace Tests\Feature\Employees;

use App\Models\Branch;
use App\Models\Employee;
use App\Models\MediaAttachment;
use App\Models\MediaGallery;
use App\Models\User;
use App\Services\Media\MediaAttachmentService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * #401 — avatar upload/replace through the employee create/update flow.
 * Follows the same upload-first/attach-on-save pattern as
 * ItemMediaAttachmentTest, but the gallery attaches to the employee's linked
 * User, not the Employee itself.
 */
class EmployeeAvatarTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Storage::fake('local');

        foreach (['employees.view', 'employees.create', 'employees.update', 'media.upload', 'media.update', 'users.update'] as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'api']);
        }

        $adminRole = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $adminRole->givePermissionTo(['employees.view', 'employees.create', 'employees.update', 'media.upload', 'media.update', 'users.update']);

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->branch = Branch::factory()->create();

        Passport::actingAs($this->admin);
    }

    /**
     * @return array{gallery_id: string, owner_token: string}
     */
    private function uploadGallery(): array
    {
        $ownerToken = uniqid('token-', true);

        $galleryId = $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image('avatar.jpg'),
            'owner_token' => $ownerToken,
            'context' => 'avatar',
        ])->json('data.gallery_id');

        return ['gallery_id' => $galleryId, 'owner_token' => $ownerToken];
    }

    private function galleryNumericId(string $publicId): int
    {
        return MediaGallery::where('public_id', $publicId)->value('id');
    }

    #[Test]
    public function it_attaches_an_avatar_gallery_to_the_linked_user_when_creating_an_employee(): void
    {
        $gallery = $this->uploadGallery();

        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-AVA-1',
            'first_name' => 'Juan',
            'last_name' => 'Perez',
            'roles' => ['cook'],
            'email' => 'juan.avatar@sushigo.com',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
            'media_gallery_id' => $gallery['gallery_id'],
            'owner_token' => $gallery['owner_token'],
        ]);

        $response->assertCreated();

        $userId = User::where('email', 'juan.avatar@sushigo.com')->value('id');

        $this->assertDatabaseHas('media_attachments', [
            'media_gallery_id' => $this->galleryNumericId($gallery['gallery_id']),
            'attachable_type' => User::class,
            'attachable_id' => $userId,
            'is_primary' => true,
        ]);

        $this->assertNotNull($response->json('data.user.avatar_url'));
        // The response is built from a single `->load(['user.roles', ...])` inside
        // CreateEmployeeAction — a separate later `$employee->load($avatarRelations)` call
        // would silently re-fetch 'user' without 'roles', discarding it (roles ends up []).
        $this->assertSame(['cook'], $response->json('data.roles'));
    }

    #[Test]
    public function creating_an_employee_returns_the_primary_photo_when_the_gallery_has_several(): void
    {
        $ownerToken = uniqid('token-', true);

        $firstAsset = $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image('first.jpg'),
            'owner_token' => $ownerToken,
            'context' => 'avatar',
        ])->json('data');

        $secondAsset = $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image('second.jpg'),
            'media_gallery_id' => $firstAsset['gallery_id'],
            'owner_token' => $ownerToken,
        ])->json('data');

        // The gallery's first-uploaded asset (position 0) is primary by default —
        // promote the second one instead, so a create-response bug reading an
        // unconstrained/position-ordered chain would surface the wrong URL.
        $this->patchJson("/api/v1/media/assets/{$secondAsset['asset_id']}", [
            'is_primary' => true,
            'owner_token' => $ownerToken,
        ])->assertOk();

        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-MULTI-1',
            'first_name' => 'Multi',
            'last_name' => 'Photo',
            'roles' => ['cook'],
            'email' => 'multi.photo@sushigo.com',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
            'media_gallery_id' => $firstAsset['gallery_id'],
            'owner_token' => $ownerToken,
        ]);

        $response->assertCreated();
        // Compare the stable path, not the full signed URL: MediaAsset::getUrlAttribute()
        // embeds a fresh now()->addHours(24) expiry/signature on every read, so the same
        // file's URL legitimately differs byte-for-byte between the upload response and
        // this create response — asserting on the full string would be flaky, not a real
        // regression check.
        $avatarPath = strtok((string) $response->json('data.user.avatar_url'), '?');
        $this->assertSame(strtok((string) $secondAsset['url'], '?'), $avatarPath);
        $this->assertNotSame(strtok((string) $firstAsset['url'], '?'), $avatarPath);
    }

    #[Test]
    public function it_rolls_back_the_whole_employee_creation_when_attaching_the_avatar_fails(): void
    {
        $this->app->bind(MediaAttachmentService::class, fn () => new class extends MediaAttachmentService
        {
            public function __invoke(Model $attachable, int $mediaGalleryId, bool $isPrimary = true): MediaAttachment
            {
                throw new RuntimeException('simulated media attachment failure');
            }
        });

        $gallery = $this->uploadGallery();

        $this->postJson('/api/v1/employees', [
            'code' => 'EMP-ROLLBACK-1',
            'first_name' => 'Rollback',
            'last_name' => 'Cypress',
            'roles' => ['cook'],
            'email' => 'rollback.avatar@sushigo.com',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
            'media_gallery_id' => $gallery['gallery_id'],
            'owner_token' => $gallery['owner_token'],
        ])->assertStatus(500);

        // The avatar attach runs inside CreateEmployeeAction's own transaction (not after it),
        // so a failure there must roll back the employee/user it just created too — otherwise the
        // employee would exist with a silently orphaned upload, contradicting the issue's
        // requirement to attach inside the create transaction.
        $this->assertDatabaseMissing('employees', ['code' => 'EMP-ROLLBACK-1']);
        $this->assertDatabaseMissing('users', ['email' => 'rollback.avatar@sushigo.com']);
    }

    #[Test]
    public function it_does_not_attach_anything_when_creating_an_employee_without_an_avatar(): void
    {
        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-NOAVA-1',
            'first_name' => 'Maria',
            'last_name' => 'Lopez',
            'roles' => ['cook'],
            'email' => 'maria.noavatar@sushigo.com',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        $response->assertCreated();

        $this->assertSame(0, MediaAttachment::count());
        $this->assertNull($response->json('data.user.avatar_url'));
    }

    #[Test]
    public function it_rejects_claiming_another_users_unattached_gallery_on_employee_create(): void
    {
        $gallery = $this->uploadGallery();

        $this->postJson('/api/v1/employees', [
            'code' => 'EMP-HIJACK-1',
            'first_name' => 'Hacker',
            'last_name' => 'Roll',
            'roles' => ['cook'],
            'email' => 'hijack@sushigo.com',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
            'media_gallery_id' => $gallery['gallery_id'],
            // owner_token omitted — simulates a caller who merely learned the public_id.
        ])->assertForbidden();

        $this->assertSame(0, MediaAttachment::count());
    }

    #[Test]
    public function admin_can_attach_an_avatar_when_updating_an_employee(): void
    {
        $user = User::factory()->create();
        $employee = Employee::factory()->create(['user_id' => $user->id]);
        $gallery = $this->uploadGallery();

        $response = $this->putJson("/api/v1/employees/{$employee->public_id}", [
            'media_gallery_id' => $gallery['gallery_id'],
            'owner_token' => $gallery['owner_token'],
        ]);

        $response->assertOk();

        $this->assertDatabaseHas('media_attachments', [
            'media_gallery_id' => $this->galleryNumericId($gallery['gallery_id']),
            'attachable_type' => User::class,
            'attachable_id' => $user->id,
            'is_primary' => true,
        ]);
        $this->assertNotNull($response->json('data.user.avatar_url'));
    }

    #[Test]
    public function admin_can_replace_an_employees_existing_avatar(): void
    {
        $user = User::factory()->create();
        $employee = Employee::factory()->create(['user_id' => $user->id]);

        $firstGallery = $this->uploadGallery();
        $this->putJson("/api/v1/employees/{$employee->public_id}", [
            'media_gallery_id' => $firstGallery['gallery_id'],
            'owner_token' => $firstGallery['owner_token'],
        ])->assertOk();

        $secondGallery = $this->uploadGallery();
        $this->putJson("/api/v1/employees/{$employee->public_id}", [
            'media_gallery_id' => $secondGallery['gallery_id'],
            'owner_token' => $secondGallery['owner_token'],
        ])->assertOk();

        // Demoting (not removing) the old attachment would leave it permanently
        // unreachable by media:cleanup-orphans, which only sweeps galleries with
        // zero attachments — same invariant as ItemMediaAttachmentTest.
        $this->assertDatabaseMissing('media_attachments', [
            'media_gallery_id' => $this->galleryNumericId($firstGallery['gallery_id']),
            'attachable_id' => $user->id,
        ]);
        $this->assertDatabaseHas('media_attachments', [
            'media_gallery_id' => $this->galleryNumericId($secondGallery['gallery_id']),
            'attachable_id' => $user->id,
            'is_primary' => true,
        ]);
    }

    #[Test]
    public function it_rejects_claiming_another_users_unattached_gallery_on_employee_update(): void
    {
        $user = User::factory()->create();
        $employee = Employee::factory()->create(['user_id' => $user->id]);
        $gallery = $this->uploadGallery();

        $this->putJson("/api/v1/employees/{$employee->public_id}", [
            'media_gallery_id' => $gallery['gallery_id'],
        ])->assertForbidden();

        $this->assertSame(0, MediaAttachment::count());
    }

    #[Test]
    public function a_user_without_users_update_cannot_replace_another_employees_already_attached_avatar(): void
    {
        $employeeUser = User::factory()->create();
        $employee = Employee::factory()->create(['user_id' => $employeeUser->id]);

        $firstGallery = $this->uploadGallery();
        $this->putJson("/api/v1/employees/{$employee->public_id}", [
            'media_gallery_id' => $firstGallery['gallery_id'],
            'owner_token' => $firstGallery['owner_token'],
        ])->assertOk();

        // A manager holds employees.update + media.upload (route-level gates
        // for updating the employee and uploading a fresh gallery) but not
        // users.update — must still be rejected by the avatar-replacement
        // check, since the avatar is already attached to another user.
        $manager = User::factory()->create();
        Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'api'])
            ->givePermissionTo(['employees.view', 'employees.update', 'media.upload']);
        $manager->assignRole('manager');
        Passport::actingAs($manager);

        $secondGallery = $this->uploadGallery();
        $this->assertNotNull($secondGallery['gallery_id']);

        $this->putJson("/api/v1/employees/{$employee->public_id}", [
            'media_gallery_id' => $secondGallery['gallery_id'],
            'owner_token' => $secondGallery['owner_token'],
        ])->assertForbidden();

        $this->assertDatabaseHas('media_attachments', [
            'media_gallery_id' => $this->galleryNumericId($firstGallery['gallery_id']),
            'attachable_id' => $employeeUser->id,
        ]);
    }

    #[Test]
    public function it_rejects_an_avatar_attach_on_an_employee_without_a_linked_user(): void
    {
        $employee = Employee::factory()->create();
        // EmployeeFactory::configure() auto-attaches a User to every created
        // Employee (roles need one to sync to) — force the user-less state
        // this test targets by detaching it afterwards.
        $employee->forceFill(['user_id' => null])->save();
        $gallery = $this->uploadGallery();

        $response = $this->putJson("/api/v1/employees/{$employee->public_id}", [
            'media_gallery_id' => $gallery['gallery_id'],
            'owner_token' => $gallery['owner_token'],
        ]);

        // Previously a silent 200 no-op (MediaAttachmentService's target,
        // $employee->user, was null so the attach was skipped) — must be a
        // clean validation error instead, not a false-success response.
        $response->assertStatus(422);
        $response->assertJsonValidationErrors('media_gallery_id');
        $this->assertSame(0, MediaAttachment::count());
    }

    #[Test]
    public function attaching_a_gallery_to_a_second_employee_does_not_detach_it_from_the_first(): void
    {
        $firstUser = User::factory()->create();
        $firstEmployee = Employee::factory()->create(['user_id' => $firstUser->id]);
        $secondUser = User::factory()->create();
        $secondEmployee = Employee::factory()->create(['user_id' => $secondUser->id]);

        $gallery = $this->uploadGallery();

        $this->putJson("/api/v1/employees/{$firstEmployee->public_id}", [
            'media_gallery_id' => $gallery['gallery_id'],
            'owner_token' => $gallery['owner_token'],
        ])->assertOk();

        // Admin (users.update) can manage both users' media, so isManageableBy()
        // alone doesn't stop the same gallery from being claimed a second time —
        // and MediaAttachmentService must not silently strip it from the first
        // employee to compensate: doc/architecture/media/media-architecture.en.md
        // §9 documents "a gallery can end up attached to more than one entity" as
        // accepted debt shared by every adopter (Item, Dish, User), not something
        // this service should unilaterally prevent for one adopter only.
        $this->putJson("/api/v1/employees/{$secondEmployee->public_id}", [
            'media_gallery_id' => $gallery['gallery_id'],
        ])->assertOk();

        $galleryId = $this->galleryNumericId($gallery['gallery_id']);

        $this->assertDatabaseHas('media_attachments', [
            'media_gallery_id' => $galleryId,
            'attachable_type' => User::class,
            'attachable_id' => $firstUser->id,
            'is_primary' => true,
        ]);
        $this->assertDatabaseHas('media_attachments', [
            'media_gallery_id' => $galleryId,
            'attachable_type' => User::class,
            'attachable_id' => $secondUser->id,
            'is_primary' => true,
        ]);
        $this->assertSame(2, MediaAttachment::count());
    }

    #[Test]
    public function it_rejects_attaching_a_soft_deleted_gallery(): void
    {
        $gallery = $this->uploadGallery();
        MediaGallery::where('public_id', $gallery['gallery_id'])->first()->delete();

        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-SOFTDEL-1',
            'first_name' => 'Soft',
            'last_name' => 'Deleted',
            'roles' => ['cook'],
            'email' => 'soft.deleted@sushigo.com',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
            'media_gallery_id' => $gallery['gallery_id'],
            'owner_token' => $gallery['owner_token'],
        ]);

        // Previously a silent 201 (the bare `exists:` rule ignores the
        // soft-delete scope, but resolvePublicId()'s Eloquent lookup respects
        // it and returns null, so the attach was skipped without any error).
        $response->assertStatus(422);
        $response->assertJsonValidationErrors('media_gallery_id');
        $this->assertSame(0, MediaAttachment::count());
    }

    #[Test]
    public function employee_list_exposes_avatar_url(): void
    {
        $user = User::factory()->create();
        Employee::factory()->create(['user_id' => $user->id]);
        $gallery = $this->uploadGallery();
        $employee = Employee::where('user_id', $user->id)->first();

        $this->putJson("/api/v1/employees/{$employee->public_id}", [
            'media_gallery_id' => $gallery['gallery_id'],
            'owner_token' => $gallery['owner_token'],
        ])->assertOk();

        $response = $this->getJson('/api/v1/employees');

        $response->assertOk();
        $row = collect($response->json('data'))->firstWhere('id', $employee->public_id);
        $this->assertNotNull($row['user']['avatar_url']);
    }
}
