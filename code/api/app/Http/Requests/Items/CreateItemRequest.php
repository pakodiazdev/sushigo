<?php

namespace App\Http\Requests\Items;

use App\Http\Requests\Concerns\AuthorizesMediaGalleryOwnership;
use App\Http\Requests\Concerns\ReadsRawStringInput;
use App\Http\Requests\Concerns\ResolvesPublicIdReferences;
use App\Models\Item;
use App\Models\MediaGallery;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="CreateItemRequest",
 *   required={"sku", "name", "type"},
 *
 *   @OA\Property(property="sku", type="string", maxLength=100, example="INS-001", description="Unique SKU code"),
 *   @OA\Property(property="name", type="string", maxLength=255, example="Arroz Sushi Premium", description="Item name"),
 *   @OA\Property(property="description", type="string", example="Arroz japonés premium para sushi", description="Item description"),
 *   @OA\Property(property="type", type="string", enum={"INSUMO", "ACTIVO"}, example="INSUMO", description="Item type — PRODUCTO is created exclusively via POST /inventory/products"),
 *   @OA\Property(property="is_stocked", type="boolean", example=true, description="Track in inventory (default: true)"),
 *   @OA\Property(property="is_perishable", type="boolean", example=false, description="Has expiration date (default: false)"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status (default: true)"),
 *   @OA\Property(property="media_gallery_id", type="string", example="01JKABC0987654321ZYXWVUTS", nullable=true, description="Gallery public_id (ULID) uploaded via POST /media/upload to attach as this item's images"),
 *   @OA\Property(property="owner_token", type="string", example="c9c9f9b0-...", nullable=true, description="Only checked when media_gallery_id points at a gallery still unattached to anything — the token from the POST /media/upload call that created it"),
 * )
 */
class CreateItemRequest extends FormRequest
{
    use AuthorizesMediaGalleryOwnership, ReadsRawStringInput, ResolvesPublicIdReferences;

    public function authorize(): bool
    {
        if (! $this->user()->can('create', Item::class)) {
            return false;
        }

        return $this->authorizesMediaGalleryOwnership();
    }

    public function rules(): array
    {
        return [
            'sku' => ['required', 'string', 'max:100', 'unique:items,sku'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            // PRODUCTO is deliberately excluded here — Products are created exclusively via
            // POST /inventory/products (#423) since this legacy wizard-only path was retired (#429).
            'type' => ['required', 'string', Rule::in([Item::TYPE_INSUMO, Item::TYPE_ACTIVO])],
            'is_stocked' => ['nullable', 'boolean'],
            'is_perishable' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'media_gallery_id' => ['nullable', 'string', 'exists:media_galleries,public_id'],
            'owner_token' => ['sometimes', 'string'],
        ];
    }

    public function prepareForValidation(): void
    {
        $this->merge([
            'sku' => strtoupper($this->sku ?? ''),
            'type' => strtoupper($this->type ?? ''),
        ]);
    }

    /**
     * Resolved numeric FK for the gallery to attach — null when omitted.
     */
    public function mediaGalleryId(): ?int
    {
        return $this->resolvePublicId(MediaGallery::class, 'media_gallery_id');
    }

    /**
     * Validated fields ready for Item::create() — applies the documented
     * is_stocked/is_perishable/is_active defaults, adds the empty meta
     * column, and excludes media_gallery_id/owner_token (neither is
     * fillable on Item; they drive MediaAttachmentService/isManageableBy()
     * separately).
     */
    public function itemData(): array
    {
        $data = collect($this->validated())->except(['media_gallery_id', 'owner_token'])->all();

        $data['is_stocked'] ??= true;
        $data['is_perishable'] ??= false;
        $data['is_active'] ??= true;
        $data['meta'] = [];

        return $data;
    }
}
