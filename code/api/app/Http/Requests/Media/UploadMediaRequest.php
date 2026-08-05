<?php

namespace App\Http\Requests\Media;

use App\Http\Requests\Concerns\ReadsRawStringInput;
use App\Http\Requests\Concerns\ResolvesPublicIdReferences;
use App\Models\MediaGallery;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="UploadMediaRequest",
 *   required={"file"},
 *
 *   @OA\Property(property="file", type="string", format="binary", description="File to upload"),
 *   @OA\Property(property="media_gallery_id", type="string", example="01JKABC0987654321ZYXWVUTS", nullable=true, description="Existing gallery's public_id (ULID) to add this file to — omit to start a new gallery"),
 *   @OA\Property(property="owner_token", type="string", example="c9c9f9b0-...", nullable=true, description="Client-generated opaque token. Required when starting a new gallery (no media_gallery_id) — required again on every later request against that same gallery until it's attached to an entity, proving the caller is the one who started it"),
 * )
 */
class UploadMediaRequest extends FormRequest
{
    use ReadsRawStringInput, ResolvesPublicIdReferences;

    public function authorize(): bool
    {
        // Raw input, not validated('media_gallery_id'): authorize() runs
        // before the validator, so validated() isn't available yet here —
        // rawStringInput() guards against non-string input (e.g. an array)
        // reaching the query below.
        $publicId = $this->rawStringInput('media_gallery_id');

        if (! $publicId) {
            return true;
        }

        $gallery = MediaGallery::where('public_id', $publicId)->first();

        if (! $gallery) {
            return true;
        }

        return $gallery->isManageableBy($this->user(), $this->rawStringInput('owner_token'));
    }

    public function rules(): array
    {
        return [
            // 8000 KB is a literal, not config-driven: SonarCloud php:S5693 flags file upload
            // caps above 8000 KB (its own compliant example uses exactly this value) as a DoS
            // risk and can't resolve a config()-sourced value at analysis time, so this ceiling
            // must stay a literal to pass the scan.
            'file' => [
                'required',
                'file',
                'mimes:'.implode(',', config('media.allowed_mimes')),
                'max:8000',
            ],
            'media_gallery_id' => ['nullable', 'string', 'exists:media_galleries,public_id'],
            'owner_token' => ['required_without:media_gallery_id', 'string', 'max:100'],
        ];
    }

    /**
     * Resolved numeric FK for the target gallery — null starts a new one.
     */
    public function mediaGalleryId(): ?int
    {
        return $this->resolvePublicId(MediaGallery::class, 'media_gallery_id');
    }

    /**
     * Client-generated token — stored on a freshly created gallery, or
     * checked against the stored one when reusing an unattached gallery
     * (see MediaGallery::isManageableBy()).
     */
    public function ownerToken(): ?string
    {
        return $this->input('owner_token');
    }
}
