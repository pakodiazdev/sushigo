<?php

namespace Database\Seeders;

use App\Models\UnitOfMeasure;
use App\Models\UomConversion;
use Illuminate\Database\Seeder;

class UomConversionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get units
        $kg = UnitOfMeasure::where('code', 'KG')->first();
        $gr = UnitOfMeasure::where('code', 'GR')->first();
        $l = UnitOfMeasure::where('code', 'L')->first();
        $ml = UnitOfMeasure::where('code', 'ML')->first();

        if (!$kg || !$gr || !$l || !$ml) {
            $this->command->warn('Required units of measure not found. Please run UnitOfMeasureSeeder first.');
            return;
        }

        $conversions = [
            // Weight conversions
            [
                'from_uom_id' => $kg->id,
                'to_uom_id' => $gr->id,
                'factor' => 1000.0,
                'tolerance' => 0.5, // 0.5% tolerance
            ],
            [
                'from_uom_id' => $gr->id,
                'to_uom_id' => $kg->id,
                'factor' => 0.001,
                'tolerance' => 0.5,
            ],
            // Volume conversions
            [
                'from_uom_id' => $l->id,
                'to_uom_id' => $ml->id,
                'factor' => 1000.0,
                'tolerance' => 0.5,
            ],
            [
                'from_uom_id' => $ml->id,
                'to_uom_id' => $l->id,
                'factor' => 0.001,
                'tolerance' => 0.5,
            ],
        ];

        foreach ($conversions as $conversion) {
            UomConversion::updateOrCreate(
                [
                    'from_uom_id' => $conversion['from_uom_id'],
                    'to_uom_id' => $conversion['to_uom_id'],
                ],
                array_merge($conversion, [
                    'is_active' => true,
                    'meta' => [],
                ])
            );
        }

        $this->command->info('✅ UOM conversions seeded successfully');
    }
}
