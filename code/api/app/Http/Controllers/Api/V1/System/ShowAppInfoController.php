<?php

namespace App\Http\Controllers\Api\V1\System;

use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseEntity;
use App\Support\Demo\DemoSandbox;

/**
 * @OA\Get(
 *   path="/api/v1/app-info",
 *   summary="Public runtime information about this deployment",
 *   description="Lets the webapp tell visitors when they are on the public, resettable Demo environment (#635). Never returns credentials.",
 *   tags={"System"},
 *
 *   @OA\Response(
 *       response=200,
 *       description="Runtime information",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(
 *
 *                  @OA\Property(
 *                      property="data",
 *                      type="object",
 *                      @OA\Property(property="environment", type="string", example="demo"),
 *                      @OA\Property(property="is_demo", type="boolean", example=true),
 *                      @OA\Property(property="data_resets", type="boolean", example=true),
 *                      @OA\Property(
 *                          property="demo_account",
 *                          type="object",
 *                          nullable=true,
 *                          @OA\Property(property="email", type="string", example="demo@sushigo.com")
 *                      )
 *                  )
 *              )
 *           }
 *       )
 *   )
 * )
 */
class ShowAppInfoController extends Controller
{
    public function __invoke(): ResponseEntity
    {
        $isDemo = DemoSandbox::isActive();

        return new ResponseEntity(data: [
            'environment' => app()->environment(),
            'is_demo' => $isDemo,
            'data_resets' => $isDemo,
            'demo_account' => $isDemo ? ['email' => config('demo.account.email')] : null,
        ]);
    }
}
