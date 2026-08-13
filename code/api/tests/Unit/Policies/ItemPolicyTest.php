<?php

namespace Tests\Unit\Policies;

use App\Models\Item;
use App\Models\User;
use App\Policies\ItemPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ItemPolicyTest extends TestCase
{
    use RefreshDatabase;

    private ItemPolicy $policy;

    protected function setUp(): void
    {
        parent::setUp();

        $this->policy = new ItemPolicy;

        foreach (['items.view', 'items.create', 'items.update', 'items.delete'] as $name) {
            Permission::create(['name' => $name, 'guard_name' => 'api']);
        }
    }

    private function userWith(string ...$permissions): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo($permissions);
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        return $user;
    }

    #[Test]
    public function guest_cannot_view_any(): void
    {
        $this->assertFalse($this->policy->viewAny(null));
    }

    #[Test]
    public function user_without_items_view_cannot_view_any(): void
    {
        $this->assertFalse($this->policy->viewAny($this->userWith()));
    }

    #[Test]
    public function user_with_items_view_can_view_any(): void
    {
        $this->assertTrue($this->policy->viewAny($this->userWith('items.view')));
    }

    #[Test]
    public function guest_cannot_view(): void
    {
        $this->assertFalse($this->policy->view(null, Item::factory()->create()));
    }

    #[Test]
    public function user_without_items_view_cannot_view(): void
    {
        $this->assertFalse($this->policy->view($this->userWith(), Item::factory()->create()));
    }

    #[Test]
    public function user_with_items_view_can_view(): void
    {
        $this->assertTrue($this->policy->view($this->userWith('items.view'), Item::factory()->create()));
    }

    #[Test]
    public function guest_cannot_create(): void
    {
        $this->assertFalse($this->policy->create(null));
    }

    #[Test]
    public function user_without_items_create_cannot_create(): void
    {
        $this->assertFalse($this->policy->create($this->userWith()));
    }

    #[Test]
    public function user_with_neighboring_permission_cannot_create(): void
    {
        $this->assertFalse($this->policy->create($this->userWith('items.view')));
    }

    #[Test]
    public function user_with_items_create_can_create(): void
    {
        $this->assertTrue($this->policy->create($this->userWith('items.create')));
    }

    #[Test]
    public function guest_cannot_update(): void
    {
        $this->assertFalse($this->policy->update(null, Item::factory()->create()));
    }

    #[Test]
    public function user_without_items_update_cannot_update(): void
    {
        $this->assertFalse($this->policy->update($this->userWith(), Item::factory()->create()));
    }

    #[Test]
    public function user_with_neighboring_permission_cannot_update(): void
    {
        $this->assertFalse($this->policy->update($this->userWith('items.view'), Item::factory()->create()));
    }

    #[Test]
    public function user_with_items_update_can_update(): void
    {
        $this->assertTrue($this->policy->update($this->userWith('items.update'), Item::factory()->create()));
    }

    #[Test]
    public function guest_cannot_delete(): void
    {
        $this->assertFalse($this->policy->delete(null, Item::factory()->create()));
    }

    #[Test]
    public function user_without_items_delete_cannot_delete(): void
    {
        $this->assertFalse($this->policy->delete($this->userWith(), Item::factory()->create()));
    }

    #[Test]
    public function user_with_neighboring_permission_cannot_delete(): void
    {
        $this->assertFalse($this->policy->delete($this->userWith('items.update'), Item::factory()->create()));
    }

    #[Test]
    public function user_with_items_delete_can_delete(): void
    {
        $this->assertTrue($this->policy->delete($this->userWith('items.delete'), Item::factory()->create()));
    }

    #[Test]
    public function guest_cannot_restore(): void
    {
        $this->assertFalse($this->policy->restore(null, Item::factory()->create()));
    }

    #[Test]
    public function user_without_items_delete_cannot_restore(): void
    {
        $this->assertFalse($this->policy->restore($this->userWith(), Item::factory()->create()));
    }

    #[Test]
    public function user_with_items_delete_can_restore(): void
    {
        $this->assertTrue($this->policy->restore($this->userWith('items.delete'), Item::factory()->create()));
    }

    #[Test]
    public function guest_cannot_force_delete(): void
    {
        $this->assertFalse($this->policy->forceDelete(null, Item::factory()->create()));
    }

    #[Test]
    public function user_without_items_delete_cannot_force_delete(): void
    {
        $this->assertFalse($this->policy->forceDelete($this->userWith(), Item::factory()->create()));
    }

    #[Test]
    public function user_with_items_delete_can_force_delete(): void
    {
        $this->assertTrue($this->policy->forceDelete($this->userWith('items.delete'), Item::factory()->create()));
    }
}
