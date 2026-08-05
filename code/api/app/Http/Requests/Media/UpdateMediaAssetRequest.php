<?php

namespace App\Http\Requests\Media;

use App\Http\Requests\Concerns\ReadsRawStringInput;
use App\Models\MediaAsset;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * @OA\Schema(
 *   schema="UpdateMediaAssetRequest",
 *
 *   @OA\Property(property="position", type="integer", example=2, nullable=true, description="Display order within the gallery"),
 *   @OA\Property(property="is_primary", type="boolean", example=true, nullable=true, description="Mark this asset as the gallery's primary image"),
 *   @OA\Property(property="owner_token", type="string", example="c9c9f9b0-...", nullable=true, description="Only checked while the asset's gallery is still unattached to an entity — the token from the POST /media/upload call that created it"),
 * )
 */
class UpdateMediaAssetRequest extends FormRequest
{
    use ReadsRawStringInput;

    public function authorize(): bool
    {
        $asset = $this->route('mediaAsset');

        if (! $asset instanceof MediaAsset) {
            return true;
        }

        return $asset->mediaGallery->isManageableBy($this->user(), $this->rawStringInput('owner_token'));
    }

    public function rules(): array
    {
        return [
            'position' => ['sometimes', 'integer', 'min:0'],
            'is_primary' => ['sometimes', 'boolean'],
            'owner_token' => ['sometimes', 'string'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if (! $this->has('position') && ! $this->has('is_primary')) {
                $validator->errors()->add('position', 'At least one of position or is_primary is required.');
            }
        });
    }

    /**
     * Validated fields UpdateMediaAssetService actually applies — keeps the
     * field selection out of the controller. is_primary is normalized to a
     * real bool here: only() returns the raw input, and the boolean rule
     * accepts 0/1/'0'/'1' alongside true/false, but UpdateMediaAssetService
     * compares it with a strict === true — passing 1 or '1' through
     * unnormalized would silently skip demoting the sibling primary.
     */
    public function assetData(): array
    {
        $data = $this->only(['position', 'is_primary']);

        if (array_key_exists('is_primary', $data)) {
            $data['is_primary'] = $this->boolean('is_primary');
        }

        return $data;
    }
}
