<?php

declare(strict_types=1);

namespace Database\Seeders\Development;

use App\Models\Brand;
use Database\Seeders\Base\RepeatableSeeder;
use Database\Seeders\Traits\RestoresTrashedOnUpsert;

/**
 * Real-world resale brand catalog for the restaurant's small retail shelf.
 * Brand names configured in config/seeders.php under development_brands.
 */
class BrandSeeder extends RepeatableSeeder
{
    use RestoresTrashedOnUpsert;

    public function run(): void
    {
        $brands = config('seeders.development_brands', []);

        foreach ($brands as $name) {
            $this->upsertRestoringTrashed(
                Brand::class,
                ['name' => $name],
                ['is_active' => true],
            );
        }

        $this->command->info('✓ Brands seeded: '.count($brands));
    }
}
