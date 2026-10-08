<?php

namespace Database\Seeders\Demo;

use App\Models\OperatingUnit;
use App\Models\OperatingUnitUser;
use App\Models\User;
use Database\Seeders\Base\OnceSeeder;
use Illuminate\Support\Facades\Hash;

/**
 * The public Demo account (#635), configured in config/demo.php. It holds
 * only the read-only `demo-viewer` role and an AUDITOR assignment on every
 * operating unit, so visitors can browse the whole branch without being able
 * to change anything.
 */
class DemoUserSeeder extends OnceSeeder
{
    public function run(): void
    {
        $account = config('demo.account');

        $user = User::updateOrCreate(
            ['email' => $account['email']],
            [
                'first_name' => $account['first_name'],
                'last_name' => $account['last_name'],
                'password' => Hash::make($account['password']),
                'email_verified_at' => now(),
            ]
        );

        $user->syncRoles([$account['role']]);

        $units = OperatingUnit::orderBy('id')->pluck('id');
        $user->operatingUnits()->syncWithoutDetaching(
            $units->mapWithKeys(fn (int $id) => [$id => ['assignment_role' => OperatingUnitUser::ROLE_AUDITOR]])->all()
        );

        $this->command->info("✓ Demo account seeded: {$account['email']}");
    }
}
