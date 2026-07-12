<?php

namespace App\Http\Controllers\Api\V1\AuditLogs;

use App\Http\Controllers\Controller;
use App\Http\Requests\AuditLogs\ListAuditLogsRequest;
use App\Http\Resources\AuditLogs\AuditLogResource;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\Attendance;
use App\Models\AttendanceAuditLog;
use App\Models\Employee;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * @OA\Get(
 *   path="/api/v1/audit-logs",
 *   summary="List Audit Logs",
 *   tags={"AuditLogs"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="auditable_type", in="query", @OA\Schema(type="string", enum={"App\\Models\\Attendance", "App\\Models\\Employee"})),
 *   @OA\Parameter(name="auditable_id", in="query", @OA\Schema(type="string"), description="Public ID (ULID) of the audited record"),
 *   @OA\Parameter(name="employee_id", in="query", @OA\Schema(type="string"), description="Employee public_id (ULID)"),
 *   @OA\Parameter(name="date_from", in="query", @OA\Schema(type="string", format="date")),
 *   @OA\Parameter(name="date_to", in="query", @OA\Schema(type="string", format="date")),
 *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", default=15)),
 *   @OA\Parameter(name="page", in="query", @OA\Schema(type="integer", default=1)),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Audit logs retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponsePaginated"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/AuditLogResponse")))
 *           }
 *       )
 *   )
 * )
 */
class ListAuditLogsController extends Controller
{
    public function __invoke(ListAuditLogsRequest $request): ResponsePaginated
    {
        // auditable's withTrashed() keeps a terminated employee's own audit entries
        // resolvable (Employee is soft-deleted) — safe no-op for Attendance, which isn't.
        $query = AttendanceAuditLog::query()
            ->with(['user', 'auditable' => fn (MorphTo $morphTo) => $morphTo->withTrashed()])
            ->latest('created_at');

        if ($record = $request->auditableRecord()) {
            $query->where('auditable_type', $record::class)->where('auditable_id', $record->id);
        }

        if ($employee = $request->employee()) {
            $query->where(function ($q) use ($employee) {
                $q->where(function ($q2) use ($employee) {
                    $q2->where('auditable_type', Employee::class)->where('auditable_id', $employee->id);
                })->orWhere(function ($q2) use ($employee) {
                    $q2->where('auditable_type', Attendance::class)->whereIn(
                        'auditable_id',
                        Attendance::query()->select('id')->where('employee_id', $employee->id)
                    );
                });
            });
        }

        if ($dateFrom = $request->validated('date_from')) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }

        if ($dateTo = $request->validated('date_to')) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        $perPage = (int) ($request->validated('per_page') ?? 15);
        $logs = $query->paginate($perPage);

        $logs->getCollection()->transform(
            fn (AttendanceAuditLog $log) => (new AuditLogResource($log))->resolve()
        );

        return new ResponsePaginated($logs);
    }
}
