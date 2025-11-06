<?php

namespace Database\Seeders;

use App\Models\UnitOfMeasure;
use Illuminate\Database\Seeder;

class UnitOfMeasureSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $units = [
            // Weight units
            [
                'code' => 'KG',
                'name' => 'Kilogramo',
                'symbol' => 'kg',
                'precision' => 3,
                'is_decimal' => true,
            ],
            [
                'code' => 'GR',
                'name' => 'Gramo',
                'symbol' => 'g',
                'precision' => 2,
                'is_decimal' => true,
            ],
            // Volume units
            [
                'code' => 'L',
                'name' => 'Litro',
                'symbol' => 'L',
                'precision' => 3,
                'is_decimal' => true,
            ],
            [
                'code' => 'ML',
                'name' => 'Mililitro',
                'symbol' => 'ml',
                'precision' => 2,
                'is_decimal' => true,
            ],
            // Count units
            [
                'code' => 'UN',
                'name' => 'Unidad',
                'symbol' => 'un',
                'precision' => 0,
                'is_decimal' => false,
            ],
            [
                'code' => 'PZ',
                'name' => 'Pieza',
                'symbol' => 'pz',
                'precision' => 0,
                'is_decimal' => false,
            ],
            [
                'code' => 'PAQ',
                'name' => 'Paquete',
                'symbol' => 'paq',
                'precision' => 0,
                'is_decimal' => false,
            ],
            [
                'code' => 'CAJ',
                'name' => 'Caja',
                'symbol' => 'caj',
                'precision' => 0,
                'is_decimal' => false,
            ],
        ];

        foreach ($units as $unit) {
            UnitOfMeasure::updateOrCreate(
                ['code' => $unit['code']],
                array_merge($unit, [
                    'is_active' => true,
                    'meta' => [],
                ])
            );
        }

        $this->command->info('✅ Units of measure seeded successfully');
    }
}
