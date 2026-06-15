<?php

namespace App\Http\Responses\Reports;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Schema(
 *     schema="TodayReportResponse",
 *     title="Today Operational Report",
 *
 *     @OA\Property(property="status", type="integer", example=200),
 *     @OA\Property(
 *         property="data",
 *         type="object",
 *         @OA\Property(
 *             property="summary",
 *             type="object",
 *             @OA\Property(property="total_employees", type="integer", example=5),
 *             @OA\Property(property="arrived", type="integer", example=3),
 *             @OA\Property(property="not_arrived", type="integer", example=2),
 *             @OA\Property(property="late_count", type="integer", example=1)
 *         ),
 *         @OA\Property(
 *             property="employees",
 *             type="array",
 *
 *             @OA\Items(
 *
 *                 @OA\Property(property="employee_id", type="string", example="01JKXYZ1234567890ABCDEFGH"),
 *                 @OA\Property(property="name", type="string", example="Carlos Mendoza"),
 *                 @OA\Property(property="code", type="string", example="EMP-001"),
 *                 @OA\Property(property="role", type="string", nullable=true, example="cook"),
 *                 @OA\Property(property="status", type="string", enum={"arrived","late","not_arrived","on_leave","day_off","rest_day"}, example="arrived"),
 *                 @OA\Property(property="check_in_time", type="string", nullable=true, example="2026-06-14T09:00:00+00:00"),
 *                 @OA\Property(property="late_minutes", type="integer", nullable=true, example=15),
 *                 @OA\Property(property="has_overtime", type="boolean", example=false),
 *                 @OA\Property(property="overtime_authorized", type="boolean", example=false)
 *             )
 *         )
 *     )
 * )
 */
class TodayReportResponse implements Responsable
{
    /**
     * @param  array<string, int>  $summary
     * @param  array<int, array<string, mixed>>  $employees
     */
    public function __construct(
        protected array $summary,
        protected array $employees,
    ) {}

    public function toResponse($request): JsonResponse
    {
        return response()->json([
            'status' => 200,
            'data' => [
                'summary' => $this->summary,
                'employees' => $this->employees,
            ],
        ], 200);
    }
}
