<?php

namespace App\Http\Requests\Employees;

use App\Http\Requests\Concerns\AuthorizesMediaGalleryOwnership;
use App\Http\Requests\Concerns\ReadsRawStringInput;
use App\Http\Requests\Concerns\ResolvesPublicIdReferences;
use App\Models\Employee;
use App\Models\MediaGallery;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="StoreEmployeeRequest",
 *   required={"code", "first_name", "last_name", "roles"},
 *
 *   @OA\Property(property="code", type="string", maxLength=20, example="EMP-001", description="Unique employee code"),
 *   @OA\Property(property="first_name", type="string", maxLength=100, example="Juan", description="Employee first name"),
 *   @OA\Property(property="last_name", type="string", maxLength=100, example="Perez", description="Employee last name"),
 *   @OA\Property(property="roles", type="array", @OA\Items(type="string", enum={"manager", "cook", "kitchen-assistant", "delivery-driver", "acting-manager", "admin", "super-admin"}), example={"cook"}, description="Position roles (super-admin only visible to super-admins)"),
 *   @OA\Property(property="email", type="string", format="email", example="juan.perez@sushigo.com", description="Email for the system user (required if phone not provided). A welcome email with password setup link will be sent."),
 *   @OA\Property(property="phone", type="string", example="5512345678", description="National phone number without country code (required if email not provided). Country code (+52 for Mexico) is added automatically. A WhatsApp message with password setup link will be sent."),
 *   @OA\Property(property="branch_id", type="integer", example=1, description="Branch ID for the initial employment period"),
 *   @OA\Property(property="start_date", type="string", format="date", example="2026-01-15", description="Start date for the initial employment period"),
 *   @OA\Property(property="attendance_exempt", type="boolean", example=false, description="True for roles (e.g. admin, super-admin) that do not check in/out — excluded from the attendance list. Defaults to false."),
 *   @OA\Property(property="meta", type="object", nullable=true, description="Additional metadata"),
 *   @OA\Property(property="media_gallery_id", type="string", example="01JKABC0987654321ZYXWVUTS", nullable=true, description="Gallery public_id (ULID) uploaded via POST /media/upload to attach as the linked user's avatar"),
 *   @OA\Property(property="owner_token", type="string", example="c9c9f9b0-...", nullable=true, description="Only checked when media_gallery_id points at a gallery still unattached to anything — the token from the POST /media/upload call that created it"),
 * )
 */
class StoreEmployeeRequest extends FormRequest
{
    use AuthorizesMediaGalleryOwnership, ReadsRawStringInput, ResolvesPublicIdReferences;

    /**
     * Route-level `permission:employees.create` middleware already gates this
     * endpoint — the only extra check here is the same gallery-ownership rule
     * every media-adopting entity's create request runs (see
     * doc/conventions/backend/media-uploads.md §3.2). The employee's own linked
     * User doesn't exist yet at this point (created by CreateEmployeeAction),
     * so for a normal upload — a brand-new gallery from this session — this
     * only ever hits the unattached-owner_token branch. It's still possible to
     * reach `User::userCanManageMedia()` here, though: a caller could supply a
     * `media_gallery_id` already attached to some *other*, pre-existing user's
     * avatar, in which case `isManageableBy()` falls through to that other
     * user's own ownership rule — correctly rejecting the claim unless the
     * caller is that user or holds `users.update`.
     */
    public function authorize(): bool
    {
        return $this->authorizesMediaGalleryOwnership();
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:20', Rule::unique('employees', 'code')->whereNull('deleted_at')],
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['string', Rule::in(Employee::getAssignableRolesFor($this->user()))],
            'email' => ['required_without:phone', 'nullable', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required_without:email', 'nullable', 'string', 'regex:/^[0-9]{10}$/', 'unique:users,phone'],
            'meta' => ['nullable', 'array'],
            'branch_id' => ['required', 'integer', Rule::exists('branches', 'id')->whereNull('deleted_at')],
            'start_date' => ['required', 'date'],
            'attendance_exempt' => ['sometimes', 'boolean'],
            'media_gallery_id' => ['nullable', 'string', Rule::exists('media_galleries', 'public_id')->whereNull('deleted_at')],
            'owner_token' => ['sometimes', 'string'],
        ];
    }

    /**
     * Resolved numeric FK for the avatar gallery to attach to the linked
     * User once it's created — null when omitted.
     */
    public function mediaGalleryId(): ?int
    {
        return $this->resolvePublicId(MediaGallery::class, 'media_gallery_id');
    }

    public function prepareForValidation(): void
    {
        if ($this->has('code')) {
            $this->merge(['code' => strtoupper($this->code)]);
        }
        // Strip any non-digit characters from phone (user might paste with spaces, dashes, etc.)
        if ($this->has('phone') && $this->phone) {
            $this->merge(['phone' => preg_replace('/\D/', '', $this->phone)]);
        }
    }

    public function messages(): array
    {
        return [
            'email.required_without' => 'Email is required when phone is not provided.',
            'phone.required_without' => 'Phone is required when email is not provided.',
            'phone.regex' => 'Phone must be a 10-digit national number without country code.',
            'roles.required' => 'At least one position role is required.',
            'roles.min' => 'At least one position role is required.',
        ];
    }
}
