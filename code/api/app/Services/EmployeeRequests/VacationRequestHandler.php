<?php

namespace App\Services\EmployeeRequests;

use App\Actions\VacationRequests\Concerns\VacationRequestGuards;
use App\Enums\EmployeeRequestType;
use App\Models\EmployeeRequest;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

/**
 * Materializes an approved VACATION employee request into a VacationRequest record.
 *
 * Runs the same guards as the direct/admin registration flow, evaluated at
 * approval time (not request time), since the employee's balance or schedule
 * may have changed since the request was submitted.
 */
class VacationRequestHandler implements RequestHandler
{
    use VacationRequestGuards;

    /**
     * @throws ValidationException
     */
    public function handle(EmployeeRequest $employeeRequest): Model
    {
        if ($employeeRequest->type !== EmployeeRequestType::VACATION) {
            throw ValidationException::withMessages([
                'type' => 'Tipo de solicitud no soportado por VacationRequestHandler.',
            ]);
        }

        $approvedBy = $employeeRequest->approved_by;
        if ($approvedBy === null) {
            throw ValidationException::withMessages([
                'approved_by' => 'La solicitud debe estar aprobada antes de crear la entidad concreta.',
            ]);
        }

        $dates = $this->normalizeDates($employeeRequest->payload['dates']);

        return $this->createApprovedVacationRequest(
            $employeeRequest->employee,
            $dates,
            $employeeRequest->requested_by,
            $approvedBy,
            $employeeRequest->notes,
            $employeeRequest->approved_at
        );
    }
}
