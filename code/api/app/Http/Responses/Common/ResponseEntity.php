<?php

namespace App\Http\Responses\Common;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Schema(
 *   schema="ResponseEntity",
 *   @OA\Property(property="status", type="integer", example=200),
 *   @OA\Property(property="data", type="object"),
 *   @OA\Property(property="meta", type="object", nullable=true)
 * )
 */
class ResponseEntity implements Responsable
{
    public function __construct(
        protected array $data,
        protected int $status = 200,
        protected array $meta = []
    ) {}

    public function toResponse($request): JsonResponse
    {
        return response()->json([
            'status' => $this->status,
            'data'   => (object) $this->data,
            'meta'   => empty($this->meta) ? null : (object) $this->meta,
        ], $this->status);
    }
}
