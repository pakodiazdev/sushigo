<?php

namespace Database\Seeders\Demo;

use Database\Seeders\Base\LockedSeeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * `demo-viewer`: the least-privilege role behind the public Demo account
 * (#635). Read-only by construction — it is granted every permission whose
 * name ends in a read verb and nothing else, so a new module's `.view`
 * permission is picked up automatically while any write permission is not.
 */
class DemoRoleSeeder extends LockedSeeder
{
    public const ROLE = 'demo-viewer';

    private const READ_SUFFIXES = ['.view', '.index', '.show', '.lookup'];

    /** Read-only permissions whose names don't follow the suffix convention. */
    private const READ_EXTRAS = ['reports.today', 'reports.weekly-summary', 'payroll.preview'];

    public function run(): void
    {
        $role = Role::updateOrCreate(['name' => self::ROLE, 'guard_name' => 'api']);

        $role->syncPermissions(
            Permission::where('guard_name', 'api')
                ->get()
                ->filter(fn (Permission $permission) => $this->isReadOnly($permission->name))
        );

        $this->command->info('✓ demo-viewer role seeded ('.$role->permissions()->count().' read-only permissions)');
    }

    private function isReadOnly(string $name): bool
    {
        return in_array($name, self::READ_EXTRAS, true)
            || collect(self::READ_SUFFIXES)->contains(fn (string $suffix) => str_ends_with($name, $suffix));
    }
}
