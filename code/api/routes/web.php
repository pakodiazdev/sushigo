<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/robots.txt', function () {
    return response("User-agent: *\nDisallow: /\n", 200)
        ->header('Content-Type', 'text/plain')
        ->header('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
});
