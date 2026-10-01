<?php

namespace Tests\Feature\Demo;

use App\Models\User;
use Database\Seeders\Demo\DemoRoleSeeder;
use Database\Seeders\Development\PermissionSeeder;
use Database\Seeders\Development\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DemoViewerRoleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([RoleSeeder::class, PermissionSeeder::class, DemoRoleSeeder::class]);
    }

    private function demoViewer(): User
    {
        $user = User::factory()->create();
        $user->assignRole('demo-viewer');

        return $user;
    }

    #[Test]
    public function demo_viewer_role_only_holds_read_permissions(): void
    {
        $permissions = Role::findByName('demo-viewer', 'api')->permissions->pluck('name');

        $this->assertNotEmpty($permissions);
        foreach ($permissions as $name) {
            $this->assertMatchesRegularExpression(
                '/\.(view|index|show|lookup|today|weekly-summary|preview)$/',
                $name,
                "demo-viewer must not hold write permission {$name}"
            );
        }
        $this->assertContains('items.view', $permissions);
        $this->assertContains('stock.view', $permissions);
        $this->assertContains('employees.view', $permissions);
    }

    #[Test]
    public function demo_viewer_can_browse_the_catalog(): void
    {
        Passport::actingAs($this->demoViewer());

        $this->getJson('/api/v1/items')->assertOk();
    }

    #[Test]
    public function demo_viewer_cannot_create_catalog_items(): void
    {
        Passport::actingAs($this->demoViewer());

        $this->postJson('/api/v1/items', ['name' => 'Visitor item'])->assertForbidden();
    }

    #[Test]
    public function demo_viewer_cannot_manage_users(): void
    {
        Passport::actingAs($this->demoViewer());

        $this->assertFalse($this->demoViewer()->can('users.store'));
        $this->assertFalse($this->demoViewer()->can('roles.update'));
    }
}
