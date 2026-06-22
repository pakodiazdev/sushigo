<?php

namespace Database\Seeders;

use App\Services\HolidayGeneratorService;
use Database\Seeders\Base\RepeatableSeeder;

class HolidaySeeder extends RepeatableSeeder
{
    public function run(): void
    {
        $generator = new HolidayGeneratorService;
        $year = now()->year;

        $result = $generator->generateForYear($year);

        $this->command->info(
            "✓ Holidays generated for {$year}: {$result->generated} generated, {$result->skipped} skipped"
            .(count($result->warnings) > 0 ? ', '.count($result->warnings).' warnings' : '')
        );
    }
}
