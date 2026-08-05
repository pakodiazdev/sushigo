<?php

namespace App\Http\Requests\Items;

use App\Http\Requests\Concerns\ReadsRawStringInput;
use App\Http\Requests\Concerns\ResolvesPublicIdReferences;
use App\Models\Item;
use App\Models\MediaGallery;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="UpdateItemRequest",
 *
 *   @OA\Property(property="name", type="string", maxLength=255, example="Arroz Sushi Premium", description="Item name"),
 *   @OA\Property(property="description", type="string", example="Arroz japonés premium para sushi", description="Item description"),
 *   @OA\Property(property="is_stocked", type="boolean", example=true, description="Track in inventory"),
 *   @OA\Property(property="is_perishable", type="boolean", example=false, description="Has expiration date"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status"),
 *   @OA\Property(property="media_gallery_id", type="string", example="01JKABC0987654321ZYXWVUTS", nullable=true, description="Gallery public_id (ULID) uploaded via POST /media/upload to attach as this item's images"),
 *   @OA\Property(property="owner_token", type="string", example="c9c9f9b0-...", nullable=true, description="Only checked when media_gallery_id points at a gallery still unattached to anything — the token from the POST /media/upload call that created it"),
 * )
 */
class UpdateItemRequest extends FormRequest
{
    use ReadsRawStringInput, ResolvesPublicIdReferences;

    public function authorize(): bool
    {
        $item = Item::findOrFail($this->route('id'));

        if (! $this->user()->can('update', $item)) {
            return false;
        }

        // Raw input, not validated('media_gallery_id'): authorize() runs
        // before the validator, so validated() isn't available yet here.
        $publicId = $this->rawStringInput('media_gallery_id');

        if (! $publicId) {
            return true;
        }

        $gallery = MediaGallery::where('public_id', $publicId)->first();

        if (! $gallery) {
            return true; // let the `exists` rule produce a clean 422
        }

        // Without this, attaching an unattached gallery to this item never
        // checked owner_token — a caller who merely learns another user's
        // in-progress gallery public_id could claim its photos on their own
        // item, since MediaAttachmentService attaches unconditionally.
        return $gallery->isManageableBy($this->user(), $this->rawStringInput('owner_token'));
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'is_stocked' => ['sometimes', 'boolean'],
            'is_perishable' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'media_gallery_id' => ['sometimes', 'nullable', 'string', 'exists:media_galleries,public_id'],
            'owner_token' => ['sometimes', 'string'],
        ];
    }

    /**
     * Validated fields that are actual Item columns — media_gallery_id and
     * owner_token are not fillable on Item (they drive
     * MediaAttachmentService/isManageableBy() separately), so neither must
     * ever reach $item->update().
     */
    public function itemData(): array
    {
        return collect($this->validated())->except(['media_gallery_id', 'owner_token'])->all();
    }

    /**
     * Resolved numeric FK for the gallery to attach — null when omitted.
     */
    public function mediaGalleryId(): ?int
    {
        return $this->resolvePublicId(MediaGallery::class, 'media_gallery_id');
    }
}
