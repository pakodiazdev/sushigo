<?php

namespace App\Http\Responses\Reports;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;

class WeeklySummaryResponse implements Responsable
{
    /** @param array<string, mixed> $data */
    public function __construct(protected array $data) {}

    public function toResponse($request): JsonResponse
    {
        return response()->json([
            'status' => 200,
            'data' => $this->data,
        ], 200);
    }
}
