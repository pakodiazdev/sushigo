<?php

declare(strict_types=1);

namespace Database\Seeders\Development;

use App\Models\HolidayDefinition;
use Database\Seeders\Base\RepeatableSeeder;

class HolidayDefinitionSeeder extends RepeatableSeeder
{
    public function run(): void
    {
        $obligatorios = $this->obligatoryDefinitions();
        $asuetos = $this->asuetoDefinitions();
        $opcionales = $this->optionalDefinitions();

        foreach ([...$obligatorios, ...$asuetos, ...$opcionales] as $def) {
            HolidayDefinition::updateOrCreate(['name' => $def['name']], $def);
        }

        $this->command->info(
            '✓ HolidayDefinitions seeded: '.count($obligatorios).' obligatorios, '
            .count($asuetos).' asuetos, '.count($opcionales).' opcionales'
        );
    }

    // ── Data groups ───────────────────────────────────────────────────────────

    private function obligatoryDefinitions(): array
    {
        return [
            self::fixed('Año Nuevo', 'Primer día del año, festivo obligatorio conforme al Art. 74 de la LFT.', 'obligatorio', 3.0, 1, 1),
            self::nthWeekday('Día de la Constitución', 'Conmemora la promulgación de la Constitución de 1917; se observa el primer lunes de febrero.', 'obligatorio', 3.0, 2, 1),
            self::nthWeekday('Natalicio de Benito Juárez', 'Celebra el nacimiento del Benemérito de las Américas; se observa el tercer lunes de marzo.', 'obligatorio', 3.0, 3, 3),
            self::fixed('Día del Trabajo', 'Día Internacional del Trabajo, festivo obligatorio conforme al Art. 74 de la LFT.', 'obligatorio', 3.0, 5, 1),
            self::fixed('Día de la Independencia', 'Conmemora el inicio de la Guerra de Independencia de México el 16 de septiembre de 1810.', 'obligatorio', 3.0, 9, 16),
            self::nthWeekday('Revolución Mexicana', 'Conmemora el inicio de la Revolución Mexicana de 1910; se observa el tercer lunes de noviembre.', 'obligatorio', 3.0, 11, 3),
            self::fixed('Navidad', 'Festivo de Navidad, obligatorio conforme al Art. 74 de la LFT.', 'obligatorio', 3.0, 12, 25),
        ];
    }

    private function asuetoDefinitions(): array
    {
        return [
            self::easterOffset('Jueves Santo', 'Jueves de Semana Santa; calculado automáticamente como Pascua − 3 días.', 'asueto', 1.0, -3),
            self::easterOffset('Viernes Santo', 'Viernes de Semana Santa; calculado automáticamente como Pascua − 2 días.', 'asueto', 1.0, -2),
            self::fixed('Día de los Muertos', 'Tradición mexicana que honra a los difuntos, celebrada el 2 de noviembre.', 'asueto', 1.0, 11, 2),
            self::fixed('Día de la Virgen de Guadalupe', 'Festividad religiosa en honor a la Virgen de Guadalupe, patrona de México.', 'asueto', 1.0, 12, 12),
        ];
    }

    private function optionalDefinitions(): array
    {
        return [
            self::fixed('Día de Reyes', 'Conmemora la llegada de los Reyes Magos; tradición cultural mexicana celebrada el 6 de enero.', 'opcional', 1.0, 1, 6),
            self::fixed('Día de las Madres', 'Festejo a las madres mexicanas; en México se celebra siempre el 10 de mayo.', 'opcional', 1.0, 5, 10),
            self::easterOffset('Sábado Santo', 'Sábado de Semana Santa; calculado automáticamente como Pascua − 1 día.', 'opcional', 1.0, -1),
            self::fixed('Día de Todos los Santos', 'Festividad religiosa que honra a todos los santos; antecede al Día de los Muertos.', 'opcional', 1.0, 11, 1),
            self::fixed('Nochebuena', 'Víspera de Navidad celebrada el 24 de diciembre; asueto cultural de amplia adopción.', 'opcional', 1.0, 12, 24),
            self::fixed('Víspera de Año Nuevo', 'Último día del año (31 de diciembre); pago al 50% por convenio — el beneficio es el descanso.', 'opcional', 0.5, 12, 31),
        ];
    }

    // ── Factory helpers ───────────────────────────────────────────────────────

    private static function fixed(string $name, string $description, string $type, float $payMultiplier, int $month, int $day): array
    {
        return [
            'name' => $name,
            'description' => $description,
            'type' => $type,
            'pay_multiplier' => $payMultiplier,
            'is_annual' => true,
            'recurrence_type' => 'fixed',
            'recurrence_config' => ['month' => $month, 'day' => $day],
        ];
    }

    private static function nthWeekday(string $name, string $description, string $type, float $payMultiplier, int $month, int $week): array
    {
        return [
            'name' => $name,
            'description' => $description,
            'type' => $type,
            'pay_multiplier' => $payMultiplier,
            'is_annual' => true,
            'recurrence_type' => 'nth_weekday',
            'recurrence_config' => ['month' => $month, 'week' => $week, 'weekday' => 1],
        ];
    }

    private static function floating(string $name, string $description, string $type, float $payMultiplier): array
    {
        return [
            'name' => $name,
            'description' => $description,
            'type' => $type,
            'pay_multiplier' => $payMultiplier,
            'is_annual' => true,
            'recurrence_type' => 'floating',
            'recurrence_config' => [],
        ];
    }

    private static function easterOffset(string $name, string $description, string $type, float $payMultiplier, int $offset): array
    {
        return [
            'name' => $name,
            'description' => $description,
            'type' => $type,
            'pay_multiplier' => $payMultiplier,
            'is_annual' => true,
            'recurrence_type' => 'easter_offset',
            'recurrence_config' => ['offset' => $offset],
        ];
    }
}
