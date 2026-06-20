<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Holidays;

use App\Http\Controllers\Controller;
use App\Models\HolidayDefinition;
use Illuminate\Http\Response;

/**
 * @OA\Delete(
 *   path="/api/v1/holiday-definitions/{holidayDefinition}",
 *   summary="Delete Holiday Definition",
 *   description="Deletes a holiday definition. Historical holiday instances linked to this definition are preserved with definition_id set to null.",
 *   tags={"Holidays"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="holidayDefinition", in="path", required=true, @OA\Schema(type="integer")),
 *
 *   @OA\Response(response=204, description="Holiday definition deleted"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires holidays.manage permission"),
 *   @OA\Response(response=404, description="Holiday definition not found")
 * )
 */
class DeleteHolidayDefinitionController extends Controller
{
    public function __invoke(HolidayDefinition $holidayDefinition): Response
    {
        // ON DELETE SET NULL is handled by the FK constraint in the migration.
        // Deleting the definition sets definition_id = null on all linked holidays,
        // preserving historical records.
        $holidayDefinition->delete();

        return response()->noContent();
    }
}
