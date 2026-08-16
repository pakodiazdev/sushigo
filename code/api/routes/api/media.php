<?php

use App\Http\Controllers\Api\V1\Media\DeleteMediaAssetController;
use App\Http\Controllers\Api\V1\Media\UpdateMediaAssetController;
use App\Http\Controllers\Api\V1\Media\UploadMediaController;
use Illuminate\Support\Facades\Route;

// Media (Protected — requires media.upload / media.update / media.delete, except
// for avatar-context galleries the caller owns — see #420 self-service avatars)
// assets/{mediaAsset} binds via MediaAsset::getRouteKeyName() = 'public_id' (see #377),
// matching the ULID route-binding convention used by CashAdjustments (#293).
//
// None of the three routes below carry a `permission:media.*` middleware: each
// permission check moved into its FormRequest::authorize(), which grants avatar-context
// operations to the gallery's own owner unconditionally (so a self-service user can
// upload, replace, reorder, and set-primary their own avatar assets end to end — the
// uploader exposes all four) and still requires the matching permission for every
// other context.
Route::middleware('auth:api')->prefix('media')->group(function () {
    Route::post('upload', UploadMediaController::class)->name('media.upload');
    Route::patch('assets/{mediaAsset}', UpdateMediaAssetController::class)->name('media.assets.update');
    Route::delete('assets/{mediaAsset}', DeleteMediaAssetController::class)->name('media.assets.delete');
});
