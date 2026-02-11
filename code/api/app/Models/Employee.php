<?php

namespace App\Models;

use App\Enums\EmployeeRole;
use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use HasFactory, HasPublicId, SoftDeletes;

    protected $fillable = [
        'user_id',
        'code',
        'first_name',
        'last_name',
        'role',
        'is_active',
        'meta',
    ];

    protected $casts = [
        'role' => EmployeeRole::class,
        'is_active' => 'boolean',
        'meta' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByRole($query, EmployeeRole $role)
    {
        return $query->where('role', $role->value);
    }
}
