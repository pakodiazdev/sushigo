<?php

namespace Tests\Feature\AttendancePayroll;

use App\Enums\EmployeeRole;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class EmployeeModelTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function it_can_create_an_employee(): void
    {
        $employee = Employee::factory()->create([
            'code' => 'EMP-001',
            'first_name' => 'Juan',
            'last_name' => 'Pérez',
            'role' => EmployeeRole::COOK,
        ]);

        $this->assertDatabaseHas('employees', [
            'id' => $employee->id,
            'code' => 'EMP-001',
            'first_name' => 'Juan',
            'last_name' => 'Pérez',
            'role' => 'COOK',
            'is_active' => true,
        ]);

        $this->assertInstanceOf(Employee::class, $employee);
        $this->assertEquals(EmployeeRole::COOK, $employee->role);
        $this->assertTrue($employee->is_active);
    }

    #[Test]
    public function it_can_soft_delete_an_employee(): void
    {
        $employee = Employee::factory()->create();

        $employee->delete();

        $this->assertSoftDeleted('employees', ['id' => $employee->id]);
        $this->assertNull(Employee::find($employee->id));
        $this->assertNotNull(Employee::withTrashed()->find($employee->id));
    }

    #[Test]
    public function it_enforces_unique_code_constraint(): void
    {
        Employee::factory()->create(['code' => 'EMP-001']);

        $this->expectException(\Illuminate\Database\QueryException::class);

        Employee::factory()->create(['code' => 'EMP-001']);
    }

    #[Test]
    public function it_can_associate_with_a_user(): void
    {
        $user = User::factory()->create();
        $employee = Employee::factory()->withUser($user)->create();

        $this->assertEquals($user->id, $employee->user_id);
        $this->assertInstanceOf(User::class, $employee->user);
        $this->assertEquals($user->id, $employee->user->id);
    }

    #[Test]
    public function it_allows_null_user(): void
    {
        $employee = Employee::factory()->create(['user_id' => null]);

        $this->assertNull($employee->user_id);
        $this->assertNull($employee->user);
    }

    #[Test]
    public function it_casts_role_to_enum(): void
    {
        $employee = Employee::factory()->create(['role' => EmployeeRole::MANAGER]);

        $fresh = Employee::find($employee->id);

        $this->assertInstanceOf(EmployeeRole::class, $fresh->role);
        $this->assertEquals(EmployeeRole::MANAGER, $fresh->role);
    }

    #[Test]
    public function it_casts_meta_to_array(): void
    {
        $meta = ['phone' => '555-1234', 'address' => 'Calle 1'];
        $employee = Employee::factory()->create(['meta' => $meta]);

        $fresh = Employee::find($employee->id);

        $this->assertIsArray($fresh->meta);
        $this->assertEquals('555-1234', $fresh->meta['phone']);
    }

    #[Test]
    public function it_filters_active_employees_with_scope(): void
    {
        Employee::factory()->count(3)->create(['is_active' => true]);
        Employee::factory()->count(2)->inactive()->create();

        $active = Employee::active()->get();

        $this->assertCount(3, $active);
    }

    #[Test]
    public function it_filters_by_role_with_scope(): void
    {
        Employee::factory()->cook()->count(2)->create();
        Employee::factory()->manager()->create();
        Employee::factory()->deliveryDriver()->create();

        $cooks = Employee::byRole(EmployeeRole::COOK)->get();

        $this->assertCount(2, $cooks);
    }

    #[Test]
    public function it_restricts_to_valid_roles_via_enum(): void
    {
        $validRoles = array_map(fn(EmployeeRole $r) => $r->value, EmployeeRole::cases());

        $this->assertContains('MANAGER', $validRoles);
        $this->assertContains('COOK', $validRoles);
        $this->assertContains('KITCHEN_ASSISTANT', $validRoles);
        $this->assertContains('DELIVERY_DRIVER', $validRoles);
        $this->assertCount(4, $validRoles);
    }

    #[Test]
    public function factory_generates_valid_data(): void
    {
        $employee = Employee::factory()->create();

        $this->assertNotEmpty($employee->code);
        $this->assertNotEmpty($employee->first_name);
        $this->assertNotEmpty($employee->last_name);
        $this->assertInstanceOf(EmployeeRole::class, $employee->role);
        $this->assertTrue($employee->is_active);
    }
}
