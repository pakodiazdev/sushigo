<?php

namespace Database\Seeders\Development;

use App\Models\User;
use Database\Seeders\Base\OnceSeeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends OnceSeeder
{
    public function run(): void
    {
        $users = config('seeders.development_users', []);

        foreach ($users as $userData) {
            User::updateOrCreate(
                ['email' => $userData['email']],
                [
                    'name' => $userData['name'],
                    'password' => Hash::make($userData['password']),
                    'email_verified_at' => now(),
                ]
            );

            $this->command->info("✓ User created: {$userData['email']}");
        }

        $factoryCount = config('seeders.factory_counts.users', 10);
        User::factory($factoryCount)->create();
        $this->command->info("✓ Created {$factoryCount} random users");

        $this->command->info('✓ Development users seeded successfully');
    }
}
