<?php

use Illuminate\Support\Facades\Route;
use League\Flysystem\Config;

Route::get('/', function () {
    dd(config('app.env'));
    return view('welcome');
});
