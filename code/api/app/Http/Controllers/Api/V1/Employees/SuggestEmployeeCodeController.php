<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Get(
 *   path="/api/v1/employees/next-code",
 *   summary="Suggest next employee code",
 *   description="Returns the next available employee code based on the configured prefix and existing codes.",
 *   tags={"Employees"},
 *   security={{"passport": {}}},
 *   @OA\Response(
 *       response=200,
 *       description="Next available code",
 *       @OA\JsonContent(
 *           @OA\Property(property="code", type="string", example="EMP-006"),
 *           @OA\Property(property="prefix", type="string", example="EMP-")
 *       )
 *   )
 * )
 */
class SuggestEmployeeCodeController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $prefix = config('employees.code_prefix');
        $padding = config('employees.code_padding');

        $nextNumber = $this->findNextAvailableNumber($prefix);
        $code = $prefix . str_pad((string) $nextNumber, $padding, '0', STR_PAD_LEFT);

        return response()->json([
            'code' => $code,
            'prefix' => $prefix,
        ]);
    }

    private function findNextAvailableNumber(string $prefix): int
    {
        $prefixLength = strlen($prefix);

        // Compute maximum numeric suffix in SQL to avoid loading all rows into memory.
        // Consider only codes where the substring after the prefix is numeric.
        $maxNumber = Employee::withTrashed()
            ->where('code', 'LIKE', $prefix . '%')
            ->whereRaw("SUBSTRING(code, ?) ~ '^[0-9]+$'", [$prefixLength + 1])
            ->selectRaw('MAX(CAST(SUBSTRING(code, ?) AS INTEGER)) AS max_number', [$prefixLength + 1])
            ->value('max_number');

        $candidate = ((int) ($maxNumber ?? 0)) + 1;

        while ($this->codeExists($prefix, $candidate)) {
            $candidate++;
        }

        return $candidate;
    }

    private function codeExists(string $prefix, int $number): bool
    {
        $padding = config('employees.code_padding');
        $code = $prefix . str_pad((string) $number, $padding, '0', STR_PAD_LEFT);

        return Employee::withTrashed()->where('code', $code)->exists();
    }
}
