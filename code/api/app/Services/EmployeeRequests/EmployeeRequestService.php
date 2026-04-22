<?php

namespace App\Services\EmployeeRequests;

use App\Enums\EmployeeRequestStatus;
use App\Enums\EmployeeRequestType;
use App\Models\Employee;
use App\Models\EmployeeRequest;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EmployeeRequestService
{
    public function __construct(
        private readonly ExtraDayRequestHandler $extraDayRequestHandler,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, bool $autoApprove): EmployeeRequest
    {
        $requestedBy = Auth::user();
        if (! $requestedBy instanceof User) {
            throw ValidationException::withMessages([
                'auth' => 'No se pudo resolver el usuario autenticado.',
            ]);
        }

        if ($autoApprove && ! $requestedBy->can('employee-requests.approve')) {
            abort(403, 'No tienes permiso para auto-aprobar solicitudes.');
        }

        return DB::transaction(function () use ($data, $autoApprove, $requestedBy): EmployeeRequest {
            $employee = Employee::query()->where('public_id', $data['employee_id'])->firstOrFail();

            $employeeRequest = EmployeeRequest::create([
                'employee_id' => $employee->id,
                'type' => EmployeeRequestType::from($data['type']),
                'status' => EmployeeRequestStatus::PENDING,
                'payload' => $data['payload'],
                'requested_by' => $requestedBy->id,
                'notes' => $data['notes'] ?? null,
            ]);

            if (! $autoApprove) {
                return $employeeRequest->load(['employee', 'requestable', 'requestedBy', 'approvedBy']);
            }

            return $this->approve($employeeRequest, $requestedBy);
        });
    }

    /**
     * @throws ValidationException
     */
    public function approve(EmployeeRequest $employeeRequest, User $approver): EmployeeRequest
    {
        return DB::transaction(function () use ($employeeRequest, $approver): EmployeeRequest {
            $employeeRequest = EmployeeRequest::query()->lockForUpdate()->findOrFail($employeeRequest->id);

            if ($employeeRequest->status !== EmployeeRequestStatus::PENDING) {
                throw ValidationException::withMessages([
                    'status' => 'Solo se pueden aprobar solicitudes en estado PENDING.',
                ]);
            }

            $employeeRequest->update([
                'status' => EmployeeRequestStatus::APPROVED,
                'approved_by' => $approver->id,
                'approved_at' => now(),
            ]);

            $requestable = $this->resolveHandler($employeeRequest)->handle($employeeRequest);

            $employeeRequest->update([
                'requestable_type' => $requestable::class,
                'requestable_id' => $requestable->getKey(),
            ]);

            return $employeeRequest->load(['employee', 'requestable', 'requestedBy', 'approvedBy']);
        });
    }

    public function reject(EmployeeRequest $employeeRequest, User $approver, ?string $reason): EmployeeRequest
    {
        return DB::transaction(function () use ($employeeRequest, $approver, $reason): EmployeeRequest {
            $employeeRequest = EmployeeRequest::query()->lockForUpdate()->findOrFail($employeeRequest->id);

            if ($employeeRequest->status !== EmployeeRequestStatus::PENDING) {
                throw ValidationException::withMessages([
                    'status' => 'Solo se pueden rechazar solicitudes en estado PENDING.',
                ]);
            }

            $employeeRequest->update([
                'status' => EmployeeRequestStatus::REJECTED,
                'approved_by' => $approver->id,
                'approved_at' => now(),
                'rejection_reason' => $reason,
            ]);

            return $employeeRequest->load(['employee', 'requestable', 'requestedBy', 'approvedBy']);
        });
    }

    /**
     * @throws ValidationException
     */
    public function cancel(EmployeeRequest $employeeRequest, User $requester): EmployeeRequest
    {
        return DB::transaction(function () use ($employeeRequest, $requester): EmployeeRequest {
            $employeeRequest = EmployeeRequest::query()->lockForUpdate()->findOrFail($employeeRequest->id);

            if ($employeeRequest->requested_by !== $requester->id) {
                abort(403, 'Solo el solicitante puede cancelar esta solicitud.');
            }

            if (! in_array($employeeRequest->status, [EmployeeRequestStatus::PENDING, EmployeeRequestStatus::APPROVED], true)) {
                throw ValidationException::withMessages([
                    'status' => 'Solo se pueden cancelar solicitudes en estado PENDING o APPROVED.',
                ]);
            }

            if ($employeeRequest->status === EmployeeRequestStatus::APPROVED && $employeeRequest->requestable !== null) {
                $employeeRequest->requestable->forceDelete();
            }

            $employeeRequest->update([
                'status' => EmployeeRequestStatus::CANCELLED,
                'requestable_type' => null,
                'requestable_id' => null,
            ]);

            return $employeeRequest->load(['employee', 'requestable', 'requestedBy', 'approvedBy']);
        });
    }

    /**
     * @throws ValidationException
     */
    private function resolveHandler(EmployeeRequest $employeeRequest): RequestHandler
    {
        return match ($employeeRequest->type) {
            EmployeeRequestType::EXTRA_DAY => $this->extraDayRequestHandler,
            default => throw ValidationException::withMessages([
                'type' => 'No hay handler implementado para este tipo de solicitud.',
            ]),
        };
    }
}
