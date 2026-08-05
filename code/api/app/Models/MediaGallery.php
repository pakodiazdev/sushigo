<?php

namespace App\Models;

use App\Contracts\AuthorizesMediaOwnership;
use App\Support\Traits\HasPublicId;
use App\Support\Traits\SerializesPublicIdAsId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class MediaGallery extends Model
{
    use HasFactory, HasPublicId, SerializesPublicIdAsId, SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'cover_media_id',
        'is_shared',
        'owner_token',
        'meta',
    ];

    /**
     * Bearer-style token, never meant to reach a client response body other
     * than the one that generated it (echoed back nowhere today — it's
     * write-only, checked but never serialized).
     */
    protected $hidden = [
        'owner_token',
    ];

    protected $casts = [
        'is_shared' => 'boolean',
        'meta' => 'array',
    ];

    /**
     * Get all media assets in this gallery
     */
    public function mediaAssets(): HasMany
    {
        return $this->hasMany(MediaAsset::class)->orderBy('position');
    }

    /**
     * Get the cover media asset
     */
    public function coverMedia(): BelongsTo
    {
        return $this->belongsTo(MediaAsset::class, 'cover_media_id');
    }

    /**
     * Get the primary media asset
     */
    public function primaryMedia()
    {
        return $this->mediaAssets()->where('is_primary', true)->first();
    }

    /**
     * Get all attachments (where this gallery is used)
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(MediaAttachment::class);
    }

    /**
     * Scope to filter shared galleries
     */
    public function scopeShared($query)
    {
        return $query->where('is_shared', true);
    }

    /**
     * Scope to filter private galleries
     */
    public function scopePrivate($query)
    {
        return $query->where('is_shared', false);
    }

    /**
     * Whether $user may add/reorder/delete media in this gallery.
     *
     * Unattached (mid-form, no owning entity yet): the only signal is the
     * client-generated owner_token captured at creation — a gallery created
     * before this check existed (no stored token) falls back to allowing
     * anyone with the route's base media.* permission, same as before.
     *
     * Attached: delegates to each attached entity's own
     * AuthorizesMediaOwnership::userCanManageMedia() — an entity that
     * hasn't adopted the contract yet is treated as "no additional rule",
     * same fallback as the unattached case, so adopting entities one at a
     * time never breaks the ones that haven't yet. The attachable is loaded
     * withTrashed() because Item/ItemVariant/Dish all soft-delete — without
     * it, a soft-deleted owner's attachable resolves to null (excluded by
     * its own default scope) and would be misread as "hasn't adopted the
     * contract", silently falling back to the base media.* permission
     * instead of running the entity's actual rule. A null attachable that
     * survives withTrashed() (attachable_type/id points at nothing at all,
     * e.g. a hard-deleted or genuinely dangling row) is denied outright
     * rather than treated as either case above.
     */
    public function isManageableBy(User $user, ?string $providedToken = null): bool
    {
        $attachments = $this->attachments()
            ->with(['attachable' => fn ($morphTo) => $morphTo->withTrashed()])
            ->get();

        if ($attachments->isEmpty()) {
            if (! $this->owner_token) {
                return true;
            }

            return $providedToken !== null && hash_equals($this->owner_token, $providedToken);
        }

        return $attachments->every(function (MediaAttachment $attachment) use ($user) {
            $attachable = $attachment->attachable;

            if ($attachable === null) {
                return false;
            }

            if (! $attachable instanceof AuthorizesMediaOwnership) {
                return true;
            }

            return $attachable->userCanManageMedia($user);
        });
    }
}
