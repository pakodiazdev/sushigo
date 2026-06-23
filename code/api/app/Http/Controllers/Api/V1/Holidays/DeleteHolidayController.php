<?php

namespace App\Http\Controllers\Api\V1\Holidays;

use App\Http\Controllers\Controller;
use App\Models\Holiday;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Delete(
 *   path="/api/v1/holidays/{id}",
 *   summary="Delete Holiday",
 *   description="Removes a holiday from the catalog.",
 *   tags={"Holidays"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer"), description="Holiday ID"),
 *
 *   @OA\Response(response=204, description="Holiday deleted successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires holidays.manage permission"),
 *   @OA\Response(response=404, description="Holiday not found")
 * )
 */
class DeleteHolidayController extends Controller
{
    public function __invoke(int $id): JsonResponse
    {
        $holiday = Holiday::find($id);

        if (! $holiday) {
            throw new ModelNotFoundException("Holiday [{$id}] not found.");
        }

        // Load the definition before deleting the instance so we can cascade below.
        $definition = $holiday->holidayDefinition;

        $holiday->delete();

        // Cascade to the definition to prevent the lazy generator from recreating
        // this holiday on the next list request. The FK ON DELETE SET NULL will
        // preserve any other historical instances linked to the same definition.
        if ($definition !== null) {
            $definition->delete();
        }

        return response()->json(null, 204);
    }
}
