<?php

namespace App\Http\Responses\Common;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * @OA\Schema(
 *   schema="ResponsePaginated",
 *   @OA\Property(property="status", type="integer", example=200),
 *   @OA\Property(property="data", type="array", @OA\Items(type="object")),
 *   @OA\Property(property="meta", type="object",
 *     @OA\Property(property="current_page", type="integer", example=1),
 *     @OA\Property(property="last_page", type="integer", example=10),
 *     @OA\Property(property="per_page", type="integer", example=15),
 *     @OA\Property(property="total", type="integer", example=150)
 *   )
 * )
 */
class ResponsePaginated implements Responsable
{
    public function __construct(
        protected LengthAwarePaginator $paginator,
        protected int $status = 200
    ) {}

    public function toResponse($request): JsonResponse
    {
        return response()->json([
            'status' => $this->status,
            'data'   => $this->paginator->items(),
            'meta'   => [
                'current_page' => $this->paginator->currentPage(),
                'last_page'    => $this->paginator->lastPage(),
                'per_page'     => $this->paginator->perPage(),
                'total'        => $this->paginator->total(),
            ],
        ], $this->status);
    }
}
