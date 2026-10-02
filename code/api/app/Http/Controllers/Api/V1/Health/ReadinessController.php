<?php

namespace App\Http\Controllers\Api\V1\Health;

use App\Http\Controllers\Controller;
use App\Services\Health\ReadinessChecker;
use Illuminate\Http\JsonResponse;

/**
 * GET /api/v1/health/ready
 *
 * Candidate-revision readiness gate (#636): Production's deploy pipeline requires this to return
 * 200 on the new, zero-traffic revision before shifting any traffic to it. /api/v1/health stays
 * the lightweight DB-only liveness probe the compose/E2E healthchecks use.
 *
 * @OA\Get(
 *     path="/api/v1/health/ready",
 *     summary="Readiness check (database, APP_KEY, APP_URL, OAuth keys)",
 *     tags={"Health"},
 *
 *     @OA\Response(
 *         response=200,
 *         description="Every readiness check passed",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="status", type="string", example="ok"),
 *             @OA\Property(
 *                 property="checks",
 *                 type="object",
 *                 @OA\Property(property="database", type="string", enum={"ok", "error"}),
 *                 @OA\Property(property="app_key", type="string", enum={"ok", "error"}),
 *                 @OA\Property(property="app_url", type="string", enum={"ok", "error"}),
 *                 @OA\Property(property="oauth_keys", type="string", enum={"ok", "error"})
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(response=503, description="At least one readiness check failed")
 * )
 */
class ReadinessController extends Controller
{
    public function __invoke(ReadinessChecker $checker): JsonResponse
    {
        $checks = $checker->checks();
        $ready = $checker->allPassed($checks);

        return response()->json([
            'status' => $ready ? ReadinessChecker::OK : ReadinessChecker::ERROR,
            'checks' => $checks,
        ], $ready ? 200 : 503);
    }
}
