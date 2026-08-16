<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\UpdateMyAvatarRequest;
use App\Services\Media\MediaAttachmentService;

/**
 * @OA\Patch(
 *   path="/api/v1/auth/me/avatar",
 *   summary="Attach or replace the authenticated user's own avatar",
 *   tags={"Authentication"},
 *   security={{"passport": {}}, {"bearer": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdateMyAvatarRequest")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Avatar attached successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/UserResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=403, description="Gallery belongs to another user", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdateMyAvatarController extends Controller
{
    public function __invoke(
        UpdateMyAvatarRequest $request,
        MediaAttachmentService $mediaAttachmentService,
        MeController $meController
    ) {
        $mediaAttachmentService($request->user(), $request->mediaGalleryId());

        // MeController already builds the id/name/email/avatar_url/roles/permissions
        // shape from the same eager-loaded avatar chain — reuse it instead of a third
        // copy of that response (MeController and AuthTokenResponse are the other two).
        return $meController($request);
    }
}
