<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\OperatingUnit;
use Illuminate\Database\Seeder;

class OperatingUnitSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $mainBranch = Branch::where('code', 'MAIN')->first();

        if (! $mainBranch) {
            $this->command->warn('Main branch not found. Please run BranchSeeder first.');

            return;
        }

        // Create main operating unit for the branch
        OperatingUnit::updateOrCreate(
            [
                'branch_id' => $mainBranch->id,
                'type' => OperatingUnit::TYPE_BRANCH_MAIN,
            ],
            [
                'name' => 'Inventario Principal',
                'is_active' => true,
                'meta' => [
                    'description' => 'Main inventory for SushiGo Principal branch',
                ],
            ]
        );

        // Create buffer/staging area
        OperatingUnit::updateOrCreate(
            [
                'branch_id' => $mainBranch->id,
                'type' => OperatingUnit::TYPE_BRANCH_BUFFER,
            ],
            [
                'name' => 'Área de Recepción',
                'is_active' => true,
                'meta' => [
                    'description' => 'Receiving and staging area for incoming inventory',
                ],
            ]
        );

        // Create returns area
        OperatingUnit::updateOrCreate(
            [
                'branch_id' => $mainBranch->id,
                'type' => OperatingUnit::TYPE_BRANCH_RETURN,
            ],
            [
                'name' => 'Devoluciones',
                'is_active' => true,
                'meta' => [
                    'description' => 'Returns and damaged goods area',
                ],
            ]
        );

        // Create event operating units (temporal events)
        $events = [
            [
                'name' => 'Bazar Tequila',
                'meta' => [
                    'description' => 'Evento especial Bazar Tequila',
                    'event_date' => '2026-03-15',
                ],
            ],
            [
                'name' => 'Fiesta Romita 2026',
                'meta' => [
                    'description' => 'Fiesta anual en Romita',
                    'event_date' => '2026-06-20',
                ],
            ],
            [
                'name' => 'Feria del Agave',
                'meta' => [
                    'description' => 'Feria gastronómica del Agave',
                    'event_date' => '2026-09-10',
                ],
            ],
            [
                'name' => 'Bazar Día de Muertos',
                'meta' => [
                    'description' => 'Bazar temático de Día de Muertos',
                    'event_date' => '2026-10-31',
                ],
            ],
        ];

        foreach ($events as $event) {
            OperatingUnit::updateOrCreate(
                [
                    'branch_id' => $mainBranch->id,
                    'type' => OperatingUnit::TYPE_EVENT_TEMP,
                    'name' => $event['name'],
                ],
                [
                    'is_active' => true,
                    'meta' => $event['meta'],
                ]
            );
        }

        $this->command->info('✅ Operating units seeded successfully');
    }
}
