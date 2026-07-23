<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

// Health check endpoint
Route::get('health', function () {
    $dbStatus = 'ok';
    $dbMessage = 'Database connection successful';

    try {
        DB::connection()->getPdo();
        DB::connection()->getDatabaseName();
    } catch (Exception $e) {
        $dbStatus = 'error';
        $dbMessage = 'Database connection failed: '.$e->getMessage();
    }

    return response()->json([
        'status' => $dbStatus === 'ok' ? 'ok' : 'error',
        'timestamp' => now()->toIso8601String(),
        'database' => [
            'status' => $dbStatus,
            'message' => $dbMessage,
        ],
    ], $dbStatus === 'ok' ? 200 : 503);
})->name('health');
