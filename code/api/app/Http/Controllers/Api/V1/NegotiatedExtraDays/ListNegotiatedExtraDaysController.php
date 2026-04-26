<?php

namespace App\Http\Controllers\Api\V1\NegotiatedExtraDays;

use App\Http\Controllers\Controller;
use App\Http\Resources\NegotiatedExtraDay\NegotiatedExtraDayResource;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\Employee;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *   path="/api/v1/employees/{employee}/negotiated-extra-days",
 *   summary="List Negotiated Extra Days",
 *   description="Returns a paginated list of negotiated extra days for a specific employee. Supports filtering by date range.",
 *   tags={"NegotiatedExtraDays"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="employee", in="path", required=true, @OA\Schema(type="string"), description="Employee public_id (ULID)"),
 *   @OA\Parameter(name="date_from", in="query", @OA\Schema(type="string", format="date"), description="Filter records with date >= this date"),
 *   @OA\Parameter(name="date_to", in="query", @OA\Schema(type="string", format="date"), description="Filter records with date <= this date"),
 *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", default=15), description="Items per page (1-100)"),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Negotiated extra days retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponsePaginated"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/NegotiatedExtraDayResponse")))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires employees.view permission"),
 *   @OA\Response(response=404, description="Employee not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ListNegotiatedExtraDaysController extends Controller
{
    public function __invoke(Request $request, Employee $employee): ResponsePaginated
    {
        $validated = $request->validate([
            'date_from' => ['sometimes', 'date'],
            'date_to' => ['sometimes', 'date', 'after_or_equal:date_from'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = $employee->negotiatedExtraDays()
            ->with(['employee', 'approvedBy'])
            ->orderBy('date', 'desc');

        if (array_key_exists('date_from', $validated)) {
            $query->where('date', '>=', $validated['date_from']);
        }

        if (array_key_exists('date_to', $validated)) {
            $query->where('date', '<=', $validated['date_to']);
        }

        $perPage = (int) ($validated['per_page'] ?? 15);

        $extraDays = $query->paginate($perPage);

        $extraDays->getCollection()->transform(
            fn ($extraDay) => (new NegotiatedExtraDayResource($extraDay))->resolve()
        );

        return new ResponsePaginated(paginator: $extraDays);
    }
}
