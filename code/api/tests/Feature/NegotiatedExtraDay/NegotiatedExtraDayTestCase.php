<?php

namespace Tests\Feature\NegotiatedExtraDay;

use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Base class for NegotiatedExtraDay feature tests.
 *
 * Sets up the role rows that the Employee factory requires, so every
 * subclass gets a clean slate without repeating the same boilerplate.
 */
abstract class NegotiatedExtraDayTestCase extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'employee', 'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'employee-manager', 'guard_name' => 'api']);

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }
    }
}
