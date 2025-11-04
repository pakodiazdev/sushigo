<?php

namespace App\Http\Controllers;

/**
 * @OA\Info(
 *     title="SushiGo API",
 *     version="1.0.0",
 *     description="API documentation for SushiGo application. Use 'Authorize' button to login with your credentials.",
 *     @OA\Contact(
 *         email="support@sushigo.com"
 *     )
 * )
 *
 * @OA\Server(
 *     url=L5_SWAGGER_CONST_HOST,
 *     description="API Server"
 * )
 *
 * @OA\SecurityScheme(
 *     securityScheme="passport",
 *     type="oauth2",
 *     description="OAuth2 Password Grant - Use your email and password to authenticate",
 *     @OA\Flow(
 *         flow="password",
 *         tokenUrl="/oauth/token",
 *         refreshUrl="/oauth/token",
 *         scopes={}
 *     )
 * )
 *
 * @OA\SecurityScheme(
 *     securityScheme="bearer",
 *     type="http",
 *     scheme="bearer",
 *     bearerFormat="JWT",
 *     description="Enter your bearer token manually (alternative to OAuth2)"
 * )
 *
 * @OA\Tag(
 *     name="Authentication",
 *     description="Authentication endpoints"
 * )
 */
abstract class Controller
{
    //
}
