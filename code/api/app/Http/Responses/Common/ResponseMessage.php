<?php

namespace App\Http\Responses\Common;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Schema(
 *   schema="ResponseMessage",
 *   @OA\Property(property="status", type="integer", example=200),
 *   @OA\Property(property="message", type="string", example="Operation completed successfully"),
 *   @OA\Property(property="meta", type="object", nullable=true)
 * )
 */
class ResponseMessage implements Responsable
{
    public function __construct(
        protected string $message,
        protected int $status = 200,
        protected array $meta = []
    ) {}

    public function toResponse($request): JsonResponse
    {
        return response()->json([
            'status'  => $this->status,
            'message' => $this->message,
            'meta'    => empty($this->meta) ? null : (object) $this->meta,
        ], $this->status);
    }
}
