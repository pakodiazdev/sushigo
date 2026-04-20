<?php

namespace App\Http\Controllers\Api\V1\NegotiatedExtraDays;

use App\Actions\NegotiatedExtraDay\RegisterNegotiatedExtraDayAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\NegotiatedExtraDay\StoreNegotiatedExtraDayRequest;
use App\Http\Resources\NegotiatedExtraDay\NegotiatedExtraDayResource;

/**
 * @OA\Post(
 *   path="/api/v1/negotiated-extra-days",
 *   summary="Register Negotiated Extra Day",
 *   description="Registers a negotiated extra day for an employee whose scheduled day is a rest day. Creates the agreement record and marks the attendance as EXTRA day status.",
 *   tags={"NegotiatedExtraDays"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(
 *       required=true,
 *
 *       @OA\JsonContent(ref="#/components/schemas/StoreNegotiatedExtraDayRequest")
 *   ),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Negotiated extra day registered successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *               @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *               @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/NegotiatedExtraDayResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires attendances.manage permission"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class RegisterNegotiatedExtraDayController extends Controller
{
    public function __invoke(
        StoreNegotiatedExtraDayRequest $request,
        RegisterNegotiatedExtraDayAction $action
    ): NegotiatedExtraDayResource {
        $extraDay = $action($request->validated());

        return (new NegotiatedExtraDayResource($extraDay))->setStatusCode(201);
    }
}
