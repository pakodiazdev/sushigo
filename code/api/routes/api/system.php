<?php

use App\Http\Controllers\Api\V1\System\ShowAppInfoController;
use Illuminate\Support\Facades\Route;

// Public runtime info (#635) — tells the webapp when it runs on the public Demo.
Route::get('app-info', ShowAppInfoController::class)->name('app-info');
