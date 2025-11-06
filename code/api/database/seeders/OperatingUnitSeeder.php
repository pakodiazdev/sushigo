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

        if (!$mainBranch) {
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

        $this->command->info('✅ Operating units seeded successfully');
    }
}
