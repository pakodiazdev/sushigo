<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Controller;
use App\Http\Resources\Employees\OvertimeBankMovementResource;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Employee;

/**
 * @OA\Get(
 *   path="/api/v1/employees/{employee}/overtime-bank",
 *   summary="View an employee's overtime bank balance and movement history",
 *   tags={"Employees"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="employee", in="path", required=true, @OA\Schema(type="string"), description="Employee public_id (ULID)"),
 *
 *   @OA\Response(response=200, description="Overtime bank balance and movements"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden")
 * )
 */
class ShowOvertimeBankController extends Controller
{
    public function __invoke(Employee $employee): ResponseEntity
    {
        $user = auth()->user();
        abort_unless($user->can('employees.view') || $employee->user_id === $user->id, 403);

        $movements = $employee->overtimeBankMovements()->with('authorizedBy')->get();

        $balanceMinutes = $movements->sum(fn ($movement) => $movement->balanceImpact());

        return new ResponseEntity(
            data: OvertimeBankMovementResource::collection($movements)->toArray(request()),
            meta: [
                'balance_minutes' => $balanceMinutes,
                'balance_formatted' => $this->formatMinutes($balanceMinutes),
            ],
        );
    }

    private function formatMinutes(int $minutes): string
    {
        $sign = $minutes < 0 ? '-' : '';
        $absMinutes = abs($minutes);
        $hours = intdiv($absMinutes, 60);
        $remainder = $absMinutes % 60;

        return sprintf('%s%d:%02d', $sign, $hours, $remainder);
    }
}
