<?php

use App\Http\Controllers\Api\V1\Media\DeleteMediaAssetController;
use App\Http\Controllers\Api\V1\Media\UpdateMediaAssetController;
use App\Http\Controllers\Api\V1\Media\UploadMediaController;
use Illuminate\Support\Facades\Route;

// Media (Protected — requires media.upload / media.update / media.delete)
// assets/{mediaAsset} binds via MediaAsset::getRouteKeyName() = 'public_id' (see #377),
// matching the ULID route-binding convention used by CashAdjustments (#293).
//
// `upload` has no `permission:media.upload` middleware, unlike update/delete below:
// the avatar context must be open to any authenticated user (#420 self-service avatars),
// so the permission check moved into UploadMediaRequest::authorize(), which grants avatar
// uploads unconditionally and still requires media.upload for every other context.
Route::middleware('auth:api')->prefix('media')->group(function () {
    Route::post('upload', UploadMediaController::class)->name('media.upload');
    Route::patch('assets/{mediaAsset}', UpdateMediaAssetController::class)->name('media.assets.update')->middleware('permission:media.update');
    Route::delete('assets/{mediaAsset}', DeleteMediaAssetController::class)->name('media.assets.delete')->middleware('permission:media.delete');
});
