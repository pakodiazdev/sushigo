<?php

namespace App\Http\Requests\Media;

use App\Http\Requests\Concerns\ReadsRawStringInput;
use App\Http\Requests\Concerns\ResolvesPublicIdReferences;
use App\Models\MediaGallery;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="UploadMediaRequest",
 *   required={"file"},
 *
 *   @OA\Property(property="file", type="string", format="binary", description="File to upload"),
 *   @OA\Property(property="media_gallery_id", type="string", example="01JKABC0987654321ZYXWVUTS", nullable=true, description="Existing gallery's public_id (ULID) to add this file to — omit to start a new gallery"),
 *   @OA\Property(property="owner_token", type="string", example="c9c9f9b0-...", nullable=true, description="Client-generated opaque token. Required when starting a new gallery (no media_gallery_id) — required again on every later request against that same gallery until it's attached to an entity, proving the caller is the one who started it"),
 *   @OA\Property(property="context", type="string", example="avatar", description="config(media.contexts) key declaring what this gallery is for (item/dish/avatar) — required when starting a new gallery, fixes the gallery's allowed file types for every later upload into it. Ignored (the gallery's own stored value is used instead) when media_gallery_id is given"),
 * )
 */
class UploadMediaRequest extends FormRequest
{
    use ReadsRawStringInput, ResolvesPublicIdReferences;

    /**
     * The route carries no `permission:media.upload` middleware (see
     * routes/api/media.php) — that check now lives here, gated per context,
     * because #420 requires self-service avatar uploads to be open to any
     * authenticated user while item/dish uploads stay permission-gated.
     * Uploading only ever creates/extends an *unattached* gallery; the real
     * security boundary is still the entity-specific attach step (e.g.
     * UpdateMyAvatarRequest, UpdateEmployeeRequest), so opening this step up
     * for avatar context grants no elevated capability by itself.
     */
    public function authorize(): bool
    {
        // Raw input, not validated('media_gallery_id'): authorize() runs
        // before the validator, so validated() isn't available yet here —
        // rawStringInput() guards against non-string input (e.g. an array)
        // reaching the query below.
        $publicId = $this->rawStringInput('media_gallery_id');

        return $publicId
            ? $this->authorizesExistingGallery($publicId)
            : $this->authorizesNewGallery();
    }

    private function authorizesNewGallery(): bool
    {
        $context = $this->rawStringInput('context');

        // A missing/unrecognized context can never actually create anything —
        // rules() rejects it with a clean 422 regardless of this outcome — so
        // deferring to validation here is safe, and avoids masking that 422
        // behind an unrelated 403 for a caller who also lacks media.upload.
        if ($context === null || ! in_array($context, array_keys(config('media.contexts')), true)) {
            return true;
        }

        return $context === 'avatar' || $this->user()->can('media.upload');
    }

    private function authorizesExistingGallery(string $publicId): bool
    {
        $gallery = MediaGallery::where('public_id', $publicId)->first();

        if (! $gallery) {
            return true; // let the `exists` rule produce a clean 422
        }

        if (! $gallery->isManageableBy($this->user(), $this->rawStringInput('owner_token'))) {
            return false;
        }

        // The gallery's own stored context governs here, not this request's
        // (possibly absent/spoofed) `context` input — same reasoning as
        // allowedExtensionsForFile() below. isOwnAvatarOf(), not
        // isManageableBy() alone, gates the bypass — see
        // UpdateMediaAssetRequest::authorize() for why the users.update admin
        // override must not also skip media.upload on someone else's avatar.
        if ($gallery->context === 'avatar' && $gallery->isOwnAvatarOf($this->user())) {
            return true;
        }

        return $this->user()->can('media.upload');
    }

    public function rules(): array
    {
        // 8000 KB is a literal, not config-driven: SonarCloud php:S5693 flags file upload
        // caps above 8000 KB (its own compliant example uses exactly this value) as a DoS
        // risk and can't resolve a config()-sourced value at analysis time, so this ceiling
        // must stay a literal to pass the scan.
        $fileRules = ['required', 'file', 'max:8000'];

        // An empty $extensions list — an unknown context on a new gallery, or a legacy gallery
        // with no stored context — must reject the file outright, not skip the mimes: rule.
        // Omitting the rule here previously let *any* file type through (svg/html/exe included)
        // for a legacy unattached gallery, which is exactly the stored-XSS vector this system's
        // file-type allowlist exists to close (see doc/architecture/media/media-architecture.en.md
        // §4) — the empty-list case must fail closed, matching MediaGallery::allowedExtensions()'s
        // own docblock.
        $extensions = $this->allowedExtensionsForFile();
        $fileRules[] = $extensions !== []
            ? 'mimes:'.implode(',', $extensions)
            // Laravel calls a closure-based validation rule positionally as ($attribute, $value,
            // $fail) — $attribute/$value are required by that framework signature even though
            // this rule always fails and never inspects either.
            : function (string $attribute, mixed $value, Closure $fail) { // NOSONAR
                $fail('This gallery has no recognized upload context, so no file type can be accepted.');
            };

        $rules = [
            'file' => $fileRules,
            'media_gallery_id' => ['nullable', 'string', 'exists:media_galleries,public_id'],
            'owner_token' => ['required_without:media_gallery_id', 'string', 'max:100'],
        ];

        if (! $this->rawStringInput('media_gallery_id')) {
            $rules['context'] = ['required', 'string', Rule::in(array_keys(config('media.contexts')))];
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'context.required' => 'A context is required when starting a new gallery.',
            'context.in' => 'Unknown media context.',
        ];
    }

    /**
     * The allowed extensions for whichever gallery this file is destined for
     * — the *stored* context of an existing gallery (never the request's own
     * `context` input, which is only meaningful for a brand-new gallery and
     * is otherwise ignored) or, for a new gallery, the declared context's
     * config list. Empty when nothing can be resolved (invalid/missing
     * context on a new gallery, or a legacy gallery with no stored context).
     */
    private function allowedExtensionsForFile(): array
    {
        $galleryPublicId = $this->rawStringInput('media_gallery_id');

        if ($galleryPublicId) {
            $gallery = MediaGallery::where('public_id', $galleryPublicId)->first();

            return $gallery?->allowedExtensions() ?? [];
        }

        $context = $this->rawStringInput('context');

        // Plain array lookup, not config("media.contexts.{$context}"): $context is raw,
        // unvalidated request input (Rule::in below hasn't run yet — rules() is still being
        // built), and config()'s dot-path resolution would treat a value like "item.0" as a
        // path into the contexts array, returning a single extension string instead of the []
        // default — a TypeError against this method's array return type (500, not a clean
        // 422). Array access on the resolved contexts array can't do that: a bogus key just
        // misses and falls through to [].
        return $context ? (config('media.contexts')[$context] ?? []) : [];
    }

    /**
     * Context to persist on a freshly created gallery — null when reusing
     * an existing one (UploadMediaService ignores it there).
     */
    public function context(): ?string
    {
        return $this->input('media_gallery_id') ? null : $this->input('context');
    }

    /**
     * Resolved numeric FK for the target gallery — null starts a new one.
     */
    public function mediaGalleryId(): ?int
    {
        return $this->resolvePublicId(MediaGallery::class, 'media_gallery_id');
    }

    /**
     * Client-generated token — stored on a freshly created gallery, or
     * checked against the stored one when reusing an unattached gallery
     * (see MediaGallery::isManageableBy()).
     */
    public function ownerToken(): ?string
    {
        return $this->input('owner_token');
    }
}
