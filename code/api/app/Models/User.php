<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Passport\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasRoles, Notifiable;

    protected $guard_name = 'api';

    protected $fillable = [
        'name',
        'email',
        'phone',
        'phone_country',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
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
}
