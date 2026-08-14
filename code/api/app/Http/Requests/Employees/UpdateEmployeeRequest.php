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
 *   schema="UpdateEmployeeRequest",
 *
 *   @OA\Property(property="first_name", type="string", maxLength=100, example="Juan"),
 *   @OA\Property(property="last_name", type="string", maxLength=100, example="Perez"),
 *   @OA\Property(property="roles", type="array", @OA\Items(type="string", enum={"manager", "cook", "kitchen-assistant", "delivery-driver", "acting-manager", "admin", "super-admin"}), example={"cook"}, description="Position roles (super-admin only visible to super-admins)"),
 *   @OA\Property(property="email", type="string", format="email", example="juan.perez@sushigo.com", description="User email (admin only)"),
 *   @OA\Property(property="phone", type="string", example="5512345678", description="National phone number (admin only)"),
 *   @OA\Property(property="attendance_exempt", type="boolean", example=false, description="True for roles (e.g. admin, super-admin) that do not check in/out — excluded from the attendance list."),
 *   @OA\Property(property="meta", type="object", nullable=true),
 *   @OA\Property(property="media_gallery_id", type="string", example="01JKABC0987654321ZYXWVUTS", nullable=true, description="Gallery public_id (ULID) uploaded via POST /media/upload to attach/replace as the linked user's avatar"),
 *   @OA\Property(property="owner_token", type="string", example="c9c9f9b0-...", nullable=true, description="Only checked when media_gallery_id points at a gallery still unattached to anything — the token from the POST /media/upload call that created it"),
 * )
 */
class UpdateEmployeeRequest extends FormRequest
{
    use AuthorizesMediaGalleryOwnership, ReadsRawStringInput, ResolvesPublicIdReferences;

    /**
     * Route-level `permission:employees.update` middleware already gates this
     * endpoint, but that alone is not enough for the avatar fields: #401
     * requires only the avatar's owner or a `users.update` holder be able to
     * attach/replace it — a plain manager holding employees.update (e.g. to
     * edit roles/attendance_exempt) must not incidentally gain avatar
     * control too. Two independent checks therefore both have to pass:
     *  - authorizesMediaGalleryOwnership(): the generic gallery-hijack guard
     *    every media-adopting entity's request runs (see
     *    doc/conventions/backend/media-uploads.md §3.2) — protects whichever
     *    gallery is being *attached* (an in-progress upload keyed by
     *    owner_token, or one already attached elsewhere).
     *  - authorizesAvatarReplacement(): protects the *target* employee's
     *    linked User — MediaAttachmentService detaches its current avatar as
     *    a side effect of attaching a new one, bypassing the generic PATCH
     *    /media/assets/{id} ownership check entirely, so that side effect
     *    needs its own explicit gate here.
     */
    public function authorize(): bool
    {
        if (! $this->authorizesMediaGalleryOwnership()) {
            return false;
        }

        return $this->authorizesAvatarReplacement();
    }

    private function authorizesAvatarReplacement(): bool
    {
        if (! $this->rawStringInput('media_gallery_id')) {
            return true;
        }

        /** @var Employee $employee */
        $employee = $this->route('employee');

        if (! $employee->user) {
            return true; // no existing user avatar to protect
        }

        return $employee->user->userCanManageMedia($this->user());
    }

    public function rules(): array
    {
        $rules = [
            'first_name' => ['sometimes', 'string', 'max:100'],
            'last_name' => ['sometimes', 'string', 'max:100'],
            'roles' => ['sometimes', 'array', 'min:1'],
            'roles.*' => ['string', Rule::in(Employee::getAssignableRolesFor($this->user()))],
            'attendance_exempt' => ['sometimes', 'boolean'],
            'meta' => ['nullable', 'array'],
            'media_gallery_id' => ['sometimes', 'nullable', 'string', Rule::exists('media_galleries', 'public_id')->whereNull('deleted_at')],
            'owner_token' => ['sometimes', 'string'],
        ];

        /** @var Employee $routeEmployee */
        $routeEmployee = $this->route('employee');

        // Otherwise MediaAttachmentService's target ($employee->user) is null,
        // UpdateEmployeeController silently skips the attach, and the caller sees
        // a 200 believing the photo was attached when nothing happened.
        if (! $routeEmployee->user_id && $this->has('media_gallery_id')) {
            $rules['media_gallery_id'] = ['prohibited'];
        }

        if ($this->user()->hasRole(['admin', 'super-admin'])) {
            /** @var Employee $employee */
            $employee = $this->route('employee');

            if ($employee->user_id) {
                $userId = $employee->user_id;

                // Validation interplay:
                // - `sometimes`: field skipped entirely if absent from request (partial update)
                // - `nullable`: allows explicit null/empty values through
                // - `required_without`: prevents clearing the ONLY contact method
                // Net result: admin can update one field without sending the other,
                // but cannot clear both email and phone simultaneously.
                $rules['email'] = [
                    'sometimes',
                    'nullable',
                    'string',
                    'email',
                    'max:255',
                    'required_without:phone',
                    Rule::unique('users', 'email')->ignore($userId),
                ];
                $rules['phone'] = [
                    'sometimes',
                    'nullable',
                    'string',
                    'regex:/^[0-9]{10}$/',
                    'required_without:email',
                    Rule::unique('users', 'phone')->ignore($userId),
                ];
            } elseif ($this->has('email') || $this->has('phone')) {
                $rules['email'] = ['prohibited'];
                $rules['phone'] = ['prohibited'];
            }
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'email.required_without' => 'Email is required when phone is being cleared.',
            'phone.required_without' => 'Phone is required when email is being cleared.',
            'phone.regex' => 'Phone must be a 10-digit national number without country code.',
            'email.prohibited' => 'Cannot set email on an employee without a linked user account.',
            'phone.prohibited' => 'Cannot set phone on an employee without a linked user account.',
            'media_gallery_id.prohibited' => 'Cannot set an avatar on an employee without a linked user account.',
        ];
    }

    public function prepareForValidation(): void
    {
        if ($this->has('phone') && $this->phone) {
            $this->merge(['phone' => preg_replace('/\D/', '', $this->phone)]);
        }
    }

    /**
     * Fields to persist on the Employee record — everything validated except
     * the ones that belong to the linked User (first_name/last_name/email/phone),
     * roles (synced separately), user_id (never user-settable), and
     * media_gallery_id/owner_token (drive MediaAttachmentService/
     * isManageableBy() separately — neither is a column on Employee or User).
     */
    public function employeeFields(): array
    {
        $exclude = ['first_name', 'last_name', 'email', 'phone', 'roles', 'user_id', 'media_gallery_id', 'owner_token'];

        return array_diff_key($this->validated(), array_flip($exclude));
    }

    /**
     * Resolved numeric FK for the avatar gallery to attach to the linked
     * User — null when omitted.
     */
    public function mediaGalleryId(): ?int
    {
        return $this->resolvePublicId(MediaGallery::class, 'media_gallery_id');
    }

    /**
     * Fields to persist on the linked User record, with phone_country derived
     * from phone when phone changes.
     */
    public function userFields(): array
    {
        $userFields = array_intersect_key($this->validated(), array_flip(['first_name', 'last_name', 'email', 'phone']));

        if (array_key_exists('phone', $userFields)) {
            $userFields['phone_country'] = $userFields['phone'] ? config('employees.default_phone_country') : null;
        }

        return $userFields;
    }

    /**
     * Position roles to sync, or null when roles were not part of this request.
     */
    public function roles(): ?array
    {
        return $this->validated()['roles'] ?? null;
    }
}
