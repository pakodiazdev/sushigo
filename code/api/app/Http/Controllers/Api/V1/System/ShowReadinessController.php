<?php

namespace App\Http\Controllers\Api\V1\System;

use App\Http\Controllers\Controller;
use App\Services\System\ReadinessChecker;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Get(
 *   path="/api/v1/health/ready",
 *   summary="Candidate-revision readiness check",
 *   description="Extends /api/v1/health with APP_KEY, APP_URL and OAuth key checks. Used by automated deploys (#635) before any traffic shift. Never returns configured values.",
 *   tags={"System"},
 *
 *   @OA\Response(
 *       response=200,
 *       description="Every check passed",
 *
 *       @OA\JsonContent(
 *
 *           @OA\Property(property="status", type="string", example="ok"),
 *           @OA\Property(property="timestamp", type="string", format="date-time"),
 *           @OA\Property(property="checks", type="object", example={"database": {"status": "ok", "message": "Database connection successful"}})
 *       )
 *   ),
 *
 *   @OA\Response(response=503, description="At least one check failed")
 * )
 */
class ShowReadinessController extends Controller
{
    public function __invoke(ReadinessChecker $checker): JsonResponse
    {
        $checks = $checker->run();
        $passes = $checker->passes($checks);

        return response()->json([
            'status' => $passes ? 'ok' : 'error',
            'timestamp' => now()->toIso8601String(),
            'checks' => $checks,
        ], $passes ? 200 : 503);
    }
}
