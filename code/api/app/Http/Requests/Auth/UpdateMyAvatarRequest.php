<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\Concerns\AuthorizesMediaGalleryOwnership;
use App\Http\Requests\Concerns\ReadsRawStringInput;
use App\Http\Requests\Concerns\ResolvesPublicIdReferences;
use App\Models\MediaGallery;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="UpdateMyAvatarRequest",
 *
 *   @OA\Property(property="media_gallery_id", type="string", example="01JKABC0987654321ZYXWVUTS", description="Gallery public_id (ULID) uploaded via POST /media/upload to attach/replace as the caller's own avatar"),
 *   @OA\Property(property="owner_token", type="string", example="c9c9f9b0-...", nullable=true, description="Only checked when media_gallery_id points at a gallery still unattached to anything — the token from the POST /media/upload call that created it"),
 * )
 */
class UpdateMyAvatarRequest extends FormRequest
{
    use AuthorizesMediaGalleryOwnership, ReadsRawStringInput, ResolvesPublicIdReferences;

    /**
     * Unlike UpdateEmployeeRequest, no separate "who owns the target" check is
     * needed here: the target is always $this->user() itself, so
     * User::userCanManageMedia() is trivially satisfied by identity alone —
     * the generic gallery-hijack guard is the only rule this endpoint needs.
     */
    public function authorize(): bool
    {
        return $this->authorizesMediaGalleryOwnership();
    }

    public function rules(): array
    {
        return [
            'media_gallery_id' => ['required', 'string', Rule::exists('media_galleries', 'public_id')->whereNull('deleted_at')],
            'owner_token' => ['sometimes', 'string'],
        ];
    }

    /**
     * Resolved numeric FK for the avatar gallery to attach — never null,
     * media_gallery_id is a required field.
     */
    public function mediaGalleryId(): int
    {
        return (int) $this->resolvePublicId(MediaGallery::class, 'media_gallery_id');
    }
}
