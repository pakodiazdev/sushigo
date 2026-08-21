<?php

declare(strict_types=1);

namespace Database\Seeders\Development;

use App\Models\PurchasePresentationTemplate;
use App\Models\UnitOfMeasure;
use Database\Seeders\Base\RepeatableSeeder;
use Database\Seeders\Traits\RestoresTrashedOnUpsert;

/**
 * Reusable purchase presentation templates (Unit/Pack/Box/Tray) demonstrated
 * across the Development product catalog. Template data configured in
 * config/seeders.php under development_purchase_presentation_templates.
 *
 * Every template's compatible_dimension_uom_id resolves to 'UN' (Unidad) —
 * every seeded Variant is counted in that same base unit of measure.
 *
 * Depends on UnitOfMeasureSeeder having already run.
 */
class PurchasePresentationTemplateSeeder extends RepeatableSeeder
{
    use RestoresTrashedOnUpsert;

    public function run(): void
    {
        $unitUomId = UnitOfMeasure::where('code', 'UN')->value('id');

        if (! $unitUomId) {
            $this->command->warn("⚠️  UnitOfMeasure 'UN' not found. Skipping purchase presentation templates.");

            return;
        }

        $templates = config('seeders.development_purchase_presentation_templates', []);

        foreach ($templates as $template) {
            $this->upsertRestoringTrashed(
                PurchasePresentationTemplate::class,
                ['code' => $template['code']],
                [
                    'name' => $template['name'],
                    'package_type' => $template['package_type'],
                    'base_unit_quantity' => $template['base_unit_quantity'],
                    'compatible_dimension_uom_id' => $unitUomId,
                    'is_active' => $template['is_active'],
                ],
            );
        }

        $this->command->info('✓ PurchasePresentationTemplates seeded: '.count($templates));
    }
}
