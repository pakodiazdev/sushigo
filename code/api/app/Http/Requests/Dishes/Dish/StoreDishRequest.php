<?php

declare(strict_types=1);

namespace App\Http\Requests\Dishes\Dish;

use App\Http\Requests\Concerns\AuthorizesMediaGalleryOwnership;
use App\Http\Requests\Concerns\ReadsRawStringInput;
use App\Http\Requests\Dishes\Dish\Concerns\NormalizesDishData;
use App\Models\MediaGallery;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="StoreDishRequest",
 *   required={"dish_category_id", "name", "base_price"},
 *
 *   @OA\Property(property="dish_category_id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="Dish category public_id (ULID)"),
 *   @OA\Property(property="name", type="string", maxLength=255, example="California Roll"),
 *   @OA\Property(property="description", type="string", nullable=true, example="Kanikama, aguacate, pepino"),
 *   @OA\Property(property="base_price", type="number", format="float", example=120.00),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status (default: true)"),
 *   @OA\Property(property="position", type="integer", example=0, description="Display order within category (default: 0)"),
 *   @OA\Property(property="media_gallery_id", type="string", example="01JKABC0987654321ZYXWVUTS", nullable=true, description="Gallery public_id (ULID) uploaded via POST /media/upload to attach as this dish's photo"),
 *   @OA\Property(property="owner_token", type="string", example="c9c9f9b0-...", nullable=true, description="Only checked when media_gallery_id points at a gallery still unattached to anything — the token from the POST /media/upload call that created it")
 * )
 */
class StoreDishRequest extends FormRequest
{
    use AuthorizesMediaGalleryOwnership, NormalizesDishData, ReadsRawStringInput;

    public function authorize(): bool
    {
        return $this->authorizesMediaGalleryOwnership();
    }

    public function rules(): array
    {
        return [
            'dish_category_id' => ['required', 'string', Rule::exists('dish_categories', 'public_id')->whereNull('deleted_at')],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'base_price' => ['required', 'numeric', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
            'position' => ['nullable', 'integer', 'min:0'],
            'media_gallery_id' => ['nullable', 'string', 'exists:media_galleries,public_id'],
            'owner_token' => ['sometimes', 'string'],
        ];
    }

    /**
     * Resolved numeric FK for the gallery to attach — null when omitted.
     */
    public function mediaGalleryId(): ?int
    {
        return $this->resolvePublicId(MediaGallery::class, 'media_gallery_id');
    }

    /**
     * @return array<string, mixed>
     */
    public function dishData(): array
    {
        $data = $this->normalizedDishData(applyCreateDefaults: true);

        return collect($data)->except(['media_gallery_id', 'owner_token'])->all();
    }
}
