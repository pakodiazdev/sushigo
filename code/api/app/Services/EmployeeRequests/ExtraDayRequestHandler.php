<?php

namespace App\Services\EmployeeRequests;

use App\Enums\DayStatus;
use App\Enums\EmployeeRequestType;
use App\Models\Attendance;
use App\Models\EmployeeRequest;
use App\Models\NegotiatedExtraDay;
use App\Support\Traits\ResolvesActiveEmploymentPeriod;
use App\Support\Traits\ValidatesRestDay;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

class ExtraDayRequestHandler implements RequestHandler
{
    use ResolvesActiveEmploymentPeriod, ValidatesRestDay;

    /**
     * @throws ValidationException
     */
    public function handle(EmployeeRequest $employeeRequest): Model
    {
        if ($employeeRequest->type !== EmployeeRequestType::EXTRA_DAY) {
            throw ValidationException::withMessages([
                'type' => 'Tipo de solicitud no soportado por ExtraDayRequestHandler.',
            ]);
        }

        $payload = $employeeRequest->payload;
        $date = (string) ($payload['date'] ?? '');

        $this->guardNoDuplicate($employeeRequest->employee_id, $date);

        $approvedBy = $employeeRequest->approved_by;
        if ($approvedBy === null) {
            throw ValidationException::withMessages([
                'approved_by' => 'La solicitud debe estar aprobada antes de crear la entidad concreta.',
            ]);
        }

        $branchId = $payload['branch_id'] ?? null;
        $period = $this->resolveActiveEmploymentPeriod($employeeRequest->employee_id, $date);

        $this->guardIsRestDay($period, $date);

        if ($branchId === null) {
            $branchId = $period->branch_id;
        }

        $extraDay = NegotiatedExtraDay::create([
            'employee_id' => $employeeRequest->employee_id,
            'request_id' => $employeeRequest->id,
            'branch_id' => $branchId,
            'date' => $date,
            'agreed_daily_wage' => (float) $payload['salary_day'],
            'prima_percent' => (float) $payload['prima_pct'],
            'prima_amount' => (float) $payload['salary_day'] * (float) $payload['prima_pct'] / 100,
            'approved_by' => $approvedBy,
            'status' => NegotiatedExtraDay::STATUS_APPROVED,
            'notes' => $employeeRequest->notes,
        ]);

        Attendance::firstOrCreate(
            ['employee_id' => $employeeRequest->employee_id, 'date' => $date],
            ['day_status' => DayStatus::EXTRA]
        );

        return $extraDay;
    }

    /**
     * @throws ValidationException
     */
    private function guardNoDuplicate(int $employeeId, string $date): void
    {
        $exists = NegotiatedExtraDay::query()
            ->where('employee_id', $employeeId)
            ->whereDate('date', $date)
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'payload.date' => 'Ya existe un día extra aprobado para esta fecha.',
            ]);
        }
    }
}
