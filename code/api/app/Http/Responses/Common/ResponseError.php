<?php

namespace App\Http\Responses\Common;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Schema(
 *   schema="ResponseError",
 *   @OA\Property(property="status", type="integer", example=400),
 *   @OA\Property(property="message", type="string", example="Error message"),
 *   @OA\Property(property="errors", type="object", nullable=true)
 * )
 */
class ResponseError implements Responsable
{
    public function __construct(
        protected string $message,
        protected int $status = 400,
        protected array $errors = []
    ) {}

    public function toResponse($request): JsonResponse
    {
        $response = [
            'status'  => $this->status,
            'message' => $this->message,
        ];

        if (!empty($this->errors)) {
            $response['errors'] = (object) $this->errors;
        }

        return response()->json($response, $this->status);
    }
}
