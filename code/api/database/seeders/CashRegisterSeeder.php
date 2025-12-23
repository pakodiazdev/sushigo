<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\OperatingUnit;
use Illuminate\Database\Seeder;

class CashRegisterSeeder extends Seeder
{
    public function run(): void
    {
        $mainBranch = Branch::where('code', 'MAIN')->first();

        if (!$mainBranch) {
            $this->command->warn('Main branch not found. Please run BranchSeeder first.');
            return;
        }

        // Create ON_PREMISE register (REG-01)
        CashRegister::updateOrCreate(
            [
                'code' => 'REG-01',
            ],
            [
                'branch_id' => $mainBranch->id,
                'name' => 'Caja Principal',
                'type' => CashRegister::TYPE_ON_PREMISE,
                'is_active' => true,
                'meta' => [
                    'description' => 'Caja principal del local',
                ],
            ]
        );

        // Create DELIVERY registers (DOM-01, DOM-02)
        CashRegister::updateOrCreate(
            [
                'code' => 'DOM-01',
            ],
            [
                'branch_id' => $mainBranch->id,
                'name' => 'Delivery 1',
                'type' => CashRegister::TYPE_DELIVERY,
                'is_active' => true,
                'meta' => [
                    'description' => 'Primera caja de domicilio',
                ],
            ]
        );

        CashRegister::updateOrCreate(
            [
                'code' => 'DOM-02',
            ],
            [
                'branch_id' => $mainBranch->id,
                'name' => 'Delivery 2',
                'type' => CashRegister::TYPE_DELIVERY,
                'is_active' => true,
                'meta' => [
                    'description' => 'Segunda caja de domicilio',
                ],
            ]
        );

        // Create EVENT registers - one for each event
        $events = OperatingUnit::where('type', OperatingUnit::TYPE_EVENT_TEMP)
            ->where('branch_id', $mainBranch->id)
            ->orderBy('id')
            ->get();

        foreach ($events as $index => $event) {
            $eventNumber = $index + 1;
            CashRegister::updateOrCreate(
                [
                    'code' => "EVENT-{$eventNumber}",
                ],
                [
                    'branch_id' => $mainBranch->id,
                    'operating_unit_id' => $event->id,
                    'name' => "Caja {$event->name}",
                    'type' => CashRegister::TYPE_EVENT,
                    'is_active' => true,
                    'meta' => [
                        'description' => "Caja para evento: {$event->name}",
                        'event_name' => $event->name,
                    ],
                ]
            );
        }

        $this->command->info('✅ Cash registers seeded successfully');
    }
}
