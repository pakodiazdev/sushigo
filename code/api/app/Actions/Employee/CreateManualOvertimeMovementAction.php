<?php

namespace App\Actions\Employee;

use App\Enums\OvertimeMovementType;
use App\Enums\OvertimeOrigin;
use App\Models\Employee;
use App\Models\OvertimeBankMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateManualOvertimeMovementAction
{
    /**
     * @param  array{date: string, movement_type: OvertimeMovementType, minutes: int, reason: string}  $data
     *
     * @throws ValidationException
     */
    public function __invoke(Employee $employee, array $data, User $authorizedBy): OvertimeBankMovement
    {
        return DB::transaction(function () use ($employee, $data, $authorizedBy) {
            $movements = OvertimeBankMovement::where('employee_id', $employee->id)
                ->lockForUpdate()
                ->get();

            $currentBalance = $movements->sum(fn (OvertimeBankMovement $movement) => $movement->balanceImpact());

            if ($data['movement_type'] === OvertimeMovementType::USED && $data['minutes'] > $currentBalance) {
                throw ValidationException::withMessages([
                    'minutes' => 'El empleado no tiene saldo de horas extra suficiente para este movimiento.',
                ]);
            }

            $movement = OvertimeBankMovement::create([
                'employee_id' => $employee->id,
                'date' => $data['date'],
                'movement_type' => $data['movement_type'],
                'origin' => OvertimeOrigin::MANUAL,
                'minutes' => $data['minutes'],
                'authorized_by' => $authorizedBy->id,
                'authorized_at' => now(),
                'reason' => $data['reason'],
            ]);

            $movement->setRelation('authorizedBy', $authorizedBy);

            return $movement;
        });
    }
}
