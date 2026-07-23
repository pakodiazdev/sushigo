<?php

use App\Http\Controllers\Api\V1\Auth\ForgotPasswordController;
use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\Auth\MeController;
use App\Http\Controllers\Api\V1\Auth\RegisterController;
use App\Http\Controllers\Api\V1\Auth\ResetPasswordController;
use App\Http\Controllers\Api\V1\Auth\VerifyResetTokenController;
use Illuminate\Support\Facades\Route;

// Public auth routes
Route::prefix('auth')->group(function () {
    Route::post('register', RegisterController::class)->name('auth.register');
    Route::post('login', LoginController::class)->name('auth.login');
    Route::post('forgot-password', ForgotPasswordController::class)->name('auth.forgot-password');
    Route::post('verify-reset-token', VerifyResetTokenController::class)->name('auth.verify-reset-token');
    Route::post('reset-password', ResetPasswordController::class)->name('auth.reset-password');
});

// Protected auth routes
Route::middleware('auth:api')->prefix('auth')->group(function () {
    Route::post('logout', LogoutController::class)->name('auth.logout');
    Route::get('me', MeController::class)->name('auth.me');
});
