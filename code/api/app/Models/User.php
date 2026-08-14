<?php

namespace App\Models;

use App\Contracts\AuthorizesMediaOwnership;
use App\Models\Concerns\Auditable;
use App\Models\Concerns\HasMediaGallery;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Passport\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements AuthorizesMediaOwnership
{
    use Auditable, HasApiTokens, HasFactory, HasMediaGallery, HasRoles, Notifiable;

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'phone',
        'phone_country',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Keep `name` present in serialized output even though it's a computed
     * accessor now, not a stored column — preserves the API contract for any
     * path that serializes a User directly instead of reading ->name explicitly.
     */
    protected $appends = ['name'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * The guard used by Spatie Permission to resolve roles/permissions for this model.
     */
    public function guardName(): string
    {
        return 'api';
    }

    /**
     * Get the identifier used for password reset tokens.
     * Falls back to phone when email is not available.
     */
    public function getEmailForPasswordReset(): string
    {
        return $this->email ?? $this->phone;
    }

    /**
     * Get the operating units assigned to this user.
     */
    public function operatingUnits()
    {
        return $this->belongsToMany(OperatingUnit::class, 'operating_unit_users');
    }

    /**
     * Get the full phone number with country code.
     * Returns null if no phone is set.
     */
    public function getFullPhoneAttribute(): ?string
    {
        if (! $this->phone) {
            return null;
        }

        return ($this->phone_country ?? '').$this->phone;
    }

    /**
     * Get the full display name, computed from first_name + last_name.
     * Kept as a computed attribute (not a stored column) so name is always
     * consistent with its two source fields — no sync required.
     */
    public function getNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    /**
     * Keep password hashes and remember tokens out of the audit trail.
     */
    protected function auditExcluded(): array
    {
        return ['password', 'remember_token'];
    }

    /**
     * Gate avatar-gallery changes (attach/reorder/delete) on either being
     * the account's own owner, or holding `users.update` — the same
     * permission that already gates admin edits to another user's identity
     * fields via the employee update flow. Deliberately not pure ownership
     * alone (see doc/conventions/backend/media-uploads.md §5, which
     * predates this and sketches ownership-only): #401 explicitly requires
     * an administrator to be able to attach/replace another employee's
     * avatar from the employee form, not just their own.
     */
    public function userCanManageMedia(User $user): bool
    {
        return $user->id === $this->id || $user->can('users.update');
    }

    /**
     * Single point of truth for reading the primary avatar photo, used by
     * EmployeeResource, MeController, and AuthTokenResponse. Filters with
     * firstWhere('is_primary', true) rather than first() so this is correct
     * whether mediaAttachments/mediaGallery.mediaAssets were eager-loaded
     * pre-constrained to is_primary (every list/show endpoint, via
     * LoadsEmployeeUserAvatarRelations) or left entirely unloaded (the
     * create-employee response, which reads a freshly-created $employee
     * without that eager load) — an unconstrained first() picks the
     * position-0 asset instead of the chosen primary one when a gallery
     * holds more than one photo.
     */
    public function avatarUrl(): ?string
    {
        return $this->mediaAttachments->firstWhere('is_primary', true)
            ?->mediaGallery?->mediaAssets->firstWhere('is_primary', true)
            ?->url;
    }
}
