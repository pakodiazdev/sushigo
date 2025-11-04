<?php

namespace Database\Seeders\Development;

use Database\Seeders\Base\RepeatableSeeder;

class DemoRepeatableSeeder extends RepeatableSeeder
{
    public function run(): void
    {
        $this->command->info('✓ Repeatable seeder executed at: ' . now()->toDateTimeString());
    }
}
