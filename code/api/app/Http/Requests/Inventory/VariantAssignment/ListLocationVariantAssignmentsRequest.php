<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\VariantAssignment;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Query contract for the per-Inventory-Location Variant-assignment listing
 * (#569). The endpoint feeds a Variant picker, so it supports a text search and
 * pagination and can project either the managed assortment (`assigned`, the
 * default), the assignable remainder (`unassigned`), or every candidate
 * annotated with its state (`all`).
 *
 * @OA\Schema(
 *   schema="ListLocationVariantAssignmentsRequest",
 *
 *   @OA\Property(property="state", type="string", enum={"assigned", "unassigned", "all"}, default="assigned", description="Which slice of the catalog to return"),
 *   @OA\Property(property="search", type="string", nullable=true, maxLength=255, description="Case-insensitive match on Variant code, name or barcode"),
 *   @OA\Property(property="per_page", type="integer", minimum=1, maximum=100, default=25)
 * )
 */
class ListLocationVariantAssignmentsRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route middleware (permission:stock.view) is the gate; the request
        // just needs to resolve.
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'state' => ['nullable', 'string', 'in:assigned,unassigned,all'],
            'search' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }

    public function state(): string
    {
        return $this->input('state') ?: 'assigned';
    }

    public function searchTerm(): ?string
    {
        $term = trim((string) $this->input('search', ''));

        return $term === '' ? null : $term;
    }

    public function perPage(): int
    {
        return (int) ($this->input('per_page') ?: 25);
    }
}
