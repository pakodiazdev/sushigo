<?php

namespace Database\Seeders\Production;

use Database\Seeders\Base\LockedSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PassportClientSeeder extends LockedSeeder
{
    public function run(): void
    {
        $personalClientId = Str::uuid()->toString();
        $passwordClientId = Str::uuid()->toString();

        $personalClientExists = DB::table('oauth_clients')
            ->where('name', 'SushiGo Personal Access Client')
            ->exists();

        if (!$personalClientExists) {
            DB::table('oauth_clients')->insert([
                'id' => $personalClientId,
                'owner_type' => null,
                'owner_id' => null,
                'name' => 'SushiGo Personal Access Client',
                'secret' => hash('sha256', Str::random(40)),
                'provider' => null,
                'redirect_uris' => json_encode([config('app.url')]),
                'grant_types' => json_encode(['personal_access']),
                'revoked' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $this->command->info("✓ Passport Personal Access Client created (ID: {$personalClientId})");
        } else {
            $this->command->info('ℹ Personal Access Client already exists');
        }

        $passwordClientExists = DB::table('oauth_clients')
            ->where('name', 'SushiGo Password Grant Client')
            ->exists();

        if (!$passwordClientExists) {
            DB::table('oauth_clients')->insert([
                'id' => $passwordClientId,
                'owner_type' => null,
                'owner_id' => null,
                'name' => 'SushiGo Password Grant Client',
                'secret' => hash('sha256', Str::random(40)),
                'provider' => 'users',
                'redirect_uris' => json_encode([config('app.url')]),
                'grant_types' => json_encode(['password', 'refresh_token']),
                'revoked' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $this->command->info("✓ Passport Password Grant Client created (ID: {$passwordClientId})");
        } else {
            $this->command->info('ℹ Password Grant Client already exists');
        }

        $this->command->info('✓ Passport clients configured successfully');
    }
}

