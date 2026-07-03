<?php

namespace App\Services\EmployeeRequests;

use App\Enums\EmployeeRequestStatus;
use App\Enums\EmployeeRequestType;
use App\Models\Employee;
use App\Models\EmployeeRequest;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EmployeeRequestService
{
    public function __construct(
        private readonly ExtraDayRequestHandler $extraDayRequestHandler,
        private readonly LeaveRequestHandler $leaveRequestHandler,
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
            throw new AuthorizationException('No tienes permiso para auto-aprobar solicitudes.');
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
     * @param  array<string, mixed>|null  $overrides  Optional payload overrides and notes from the approver.
     *
     * @throws ValidationException
     * @throws AuthorizationException
     */
    public function approve(EmployeeRequest $employeeRequest, User $approver, ?array $overrides = null): EmployeeRequest
    {
        $this->assertManagerCanApproveRequest($employeeRequest, $approver);

        return DB::transaction(function () use ($employeeRequest, $approver, $overrides): EmployeeRequest {
            $employeeRequest = EmployeeRequest::query()->lockForUpdate()->findOrFail($employeeRequest->id);

            if ($employeeRequest->status !== EmployeeRequestStatus::PENDING) {
                throw ValidationException::withMessages([
                    'status' => 'Solo se pueden aprobar solicitudes en estado PENDING.',
                ]);
            }

            $payloadKeys = ['salary_pct', 'salary_day', 'prima_pct', 'prima', 'seventh_day', 'total'];
            $payloadOverrides = array_intersect_key($overrides ?? [], array_flip($payloadKeys));

            $updatedFields = [
                'status' => EmployeeRequestStatus::APPROVED,
                'approved_by' => $approver->id,
                'approved_at' => now(),
            ];

            if (! empty($payloadOverrides)) {
                $updatedFields['payload'] = array_merge($employeeRequest->payload ?? [], $payloadOverrides);
            }

            if (isset($overrides['notes'])) {
                $updatedFields['notes'] = $overrides['notes'];
            }

            $employeeRequest->update($updatedFields);

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

            $isRequester = $employeeRequest->requested_by === $requester->id;
            $canCancel = $requester->hasPermissionTo('employee-requests.cancel')
                || $requester->hasPermissionTo('employee-requests.approve');

            if (! $isRequester && ! $canCancel) {
                throw new AuthorizationException('Solo el solicitante, un manager o un admin puede cancelar esta solicitud.');
            }

            if (! in_array($employeeRequest->status, [EmployeeRequestStatus::PENDING, EmployeeRequestStatus::APPROVED], true)) {
                throw ValidationException::withMessages([
                    'status' => 'Solo se pueden cancelar solicitudes en estado PENDING o APPROVED.',
                ]);
            }

            if ($employeeRequest->status === EmployeeRequestStatus::APPROVED) {
                // Use withTrashed in case the day was already soft-deleted from the extra-day side
                $requestable = $employeeRequest->requestable()->withTrashed()->first();
                $requestable?->forceDelete();
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
     * Managers (not admin/super-admin) may only approve requests from their own branch.
     * If the approver has no linked Employee or active EmploymentPeriod, no restriction applies.
     *
     * @throws AuthorizationException
     */
    private function assertManagerCanApproveRequest(EmployeeRequest $employeeRequest, User $approver): void
    {
        if (! $approver->hasRole(Employee::ROLE_MANAGER)
            || $approver->hasAnyRole([Employee::ROLE_ADMIN, Employee::ROLE_SUPER_ADMIN])
        ) {
            return;
        }

        $approverEmployee = Employee::query()->where('user_id', $approver->id)->first();
        $approverPeriod = $approverEmployee?->employmentPeriods()->active()->first();

        if ($approverPeriod === null) {
            return;
        }

        $requestPeriod = $employeeRequest->employee->employmentPeriods()->active()->first();

        if ($requestPeriod === null || $requestPeriod->branch_id !== $approverPeriod->branch_id) {
            throw new AuthorizationException('No puedes aprobar solicitudes de otra sucursal.');
        }
    }

    /**
     * @throws ValidationException
     */
    private function resolveHandler(EmployeeRequest $employeeRequest): RequestHandler
    {
        return match ($employeeRequest->type) {
            EmployeeRequestType::EXTRA_DAY => $this->extraDayRequestHandler,
            EmployeeRequestType::LEAVE => $this->leaveRequestHandler,
            default => throw ValidationException::withMessages([
                'type' => 'No hay handler implementado para este tipo de solicitud.',
            ]),
        };
    }
}
