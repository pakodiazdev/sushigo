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
     * authorizesMediaGalleryOwnership() alone is not enough here: for an already
     * *attached* gallery, MediaGallery::isManageableBy() delegates to
     * User::userCanManageMedia(), which also passes for anyone holding
     * users.update via its admin override (added in #401 so an admin can manage
     * an *employee's* avatar through the employee form) — not just the gallery's
     * actual owner. Left unchecked, a caller with users.update could PATCH this
     * strictly self-service endpoint with another employee's already-attached
     * avatar gallery id and silently claim it as their own. isOwnAvatarOf() is
     * the narrower "true owner, no admin override" check — same reasoning as
     * AuthorizesMediaGalleryContextAccess, except this endpoint has no
     * permission-based fallback at all: an admin must use the employee form to
     * manage someone else's avatar, never this one.
     */
    public function authorize(): bool
    {
        if (! $this->authorizesMediaGalleryOwnership()) {
            return false;
        }

        $gallery = MediaGallery::where('public_id', $this->rawStringInput('media_gallery_id'))->first();

        return ! $gallery || $gallery->isOwnAvatarOf($this->user());
    }

    public function rules(): array
    {
        return [
            // ->where('context', 'avatar'): without it, a caller who can manage an
            // item/dish gallery (item/dish contexts allow MP4/MOV) could attach it as
            // their avatar — User::avatarUrl() would then return a video URL that
            // every avatar surface renders through a plain <img>, breaking silently.
            'media_gallery_id' => [
                'required',
                'string',
                Rule::exists('media_galleries', 'public_id')
                    ->whereNull('deleted_at')
                    ->where('context', 'avatar'),
            ],
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
