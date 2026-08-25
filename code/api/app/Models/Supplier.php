<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Supplier extends Model
{
    use HasFactory, HasPublicId, SoftDeletes;

    protected $fillable = [
        'code',
        'name',
        'contact_name',
        'email',
        'phone',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function offerings(): HasMany
    {
        return $this->hasMany(SupplierOffering::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
