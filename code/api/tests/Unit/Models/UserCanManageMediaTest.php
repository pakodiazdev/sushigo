<?php

namespace Tests\Unit\Models;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class UserCanManageMediaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::firstOrCreate(['name' => 'users.update', 'guard_name' => 'api']);
    }

    #[Test]
    public function the_owner_can_manage_their_own_media_without_any_permission(): void
    {
        $user = User::factory()->create();

        $this->assertTrue($user->userCanManageMedia($user));
    }

    #[Test]
    public function a_user_with_users_update_can_manage_another_users_media(): void
    {
        $owner = User::factory()->create();
        $admin = User::factory()->create();
        $admin->givePermissionTo('users.update');

        $this->assertTrue($owner->userCanManageMedia($admin));
    }

    #[Test]
    public function a_user_without_users_update_cannot_manage_another_users_media(): void
    {
        $owner = User::factory()->create();
        $stranger = User::factory()->create();

        $this->assertFalse($owner->userCanManageMedia($stranger));
    }
}
