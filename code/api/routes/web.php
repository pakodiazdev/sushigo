<?php

use Illuminate\Support\Facades\Route;
use League\Flysystem\Config;

Route::get('/', function () {
    return view('welcome');
});
