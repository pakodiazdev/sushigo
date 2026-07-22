<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Passport\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use Auditable, HasApiTokens, HasFactory, HasRoles, Notifiable;

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
}
