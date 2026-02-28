<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Base API resource that maintains the standard response envelope.
 *
 * Produces: { "data": {...}, "status": 200, "meta": null }
 * Compatible with the existing ResponseEntity format.
 */
abstract class BaseResource extends JsonResource
{
    protected int $statusCode = 200;

    /**
     * Additional data included in the response envelope.
     *
     * @return array<string, mixed>
     */
    public function with($request): array
    {
        return [
            'status' => $this->statusCode,
            'meta' => null,
        ];
    }

    /**
     * Set the HTTP status code on the outgoing response.
     */
    public function withResponse($request, $response): void
    {
        $response->setStatusCode($this->statusCode);
    }

    /**
     * Fluent setter for a custom HTTP status code.
     */
    public function setStatusCode(int $code): static
    {
        $this->statusCode = $code;

        return $this;
    }
}
