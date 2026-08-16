<?php

namespace App\Http\Requests\Media;

use App\Http\Requests\Concerns\AuthorizesMediaGalleryContextAccess;
use App\Http\Requests\Concerns\ReadsRawStringInput;
use App\Models\MediaAsset;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="DeleteMediaAssetRequest",
 *
 *   @OA\Property(property="owner_token", type="string", example="c9c9f9b0-...", nullable=true, description="Only checked while the asset's gallery is still unattached to an entity — the token from the POST /media/upload call that created it. Send in the JSON request body, not a query parameter — a query string is commonly recorded in web-server/proxy/CDN access logs and APM traces, which would leak this bearer-style credential."),
 * )
 */
class DeleteMediaAssetRequest extends FormRequest
{
    use AuthorizesMediaGalleryContextAccess, ReadsRawStringInput;

    /**
     * The route carries no `permission:media.delete` middleware (see
     * routes/api/media.php) — see AuthorizesMediaGalleryContextAccess for
     * why: avatar assets are open to their owner once ownership is
     * established, every other context still requires media.delete.
     */
    public function authorize(): bool
    {
        $asset = $this->route('mediaAsset');

        if (! $asset instanceof MediaAsset) {
            return true;
        }

        return $this->authorizeMediaGalleryContextAccess($asset->mediaGallery, 'media.delete');
    }

    public function rules(): array
    {
        return [
            'owner_token' => ['sometimes', 'string'],
        ];
    }
}
