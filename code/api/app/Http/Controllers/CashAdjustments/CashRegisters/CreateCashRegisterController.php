<?php

namespace App\Http\Controllers\CashAdjustments\CashRegisters;

use App\Http\Controllers\Controller;
use App\Http\Requests\CashAdjustments\CashRegisters\StoreCashRegisterRequest;
use App\Models\CashRegister;
use App\Support\CashRegisterCodeGenerator;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * @OA\Post(
 *   path="/api/v1/cash-registers",
 *   summary="Create Cash Register",
 *   tags={"Cash Registers"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\RequestBody(
 *     required=true,
 *
 *     @OA\JsonContent(ref="#/components/schemas/StoreCashRegisterRequest")
 *   ),
 *
 *   @OA\Response(response=201, description="Cash register created successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(
 *     response=422,
 *     description="Validation error. On a create-time unique-code race the body also carries `rejected_code` (the code that was taken) and `suggested_code` (a freshly calculated replacement) alongside the standard `errors.code` field error.",
 *
 *     @OA\JsonContent(
 *       allOf={
 *
 *         @OA\Schema(ref="#/components/schemas/ResponseError"),
 *         @OA\Schema(
 *
 *           @OA\Property(property="rejected_code", type="string", nullable=true, example="REG-014"),
 *           @OA\Property(property="suggested_code", type="string", nullable=true, example="REG-015")
 *         )
 *       }
 *     )
 *   )
 * )
 */
class CreateCashRegisterController extends Controller
{
    public function __invoke(StoreCashRegisterRequest $request, CashRegisterCodeGenerator $generator): JsonResponse
    {
        $validated = $request->validated();

        try {
            // Wrapped so a lost unique-code race rolls back cleanly (savepoint
            // under an outer transaction) and the connection stays usable for
            // the fresh suggestion below.
            $register = DB::transaction(fn () => CashRegister::create($validated));
        } catch (UniqueConstraintViolationException) {
            // The `unique` pre-check in StoreCashRegisterRequest is a TOCTOU
            // race: a concurrent request can pass it before either insert
            // commits. The database unique index on (code) is the real
            // guarantee — surface it as a stable field-error contract that also
            // hands the client a fresh, still-available suggestion.
            return response()->json([
                'message' => StoreCashRegisterRequest::DUPLICATE_CODE_MESSAGE,
                'errors' => ['code' => [StoreCashRegisterRequest::DUPLICATE_CODE_MESSAGE]],
                'rejected_code' => $validated['code'],
                'suggested_code' => $generator->next(),
            ], 422);
        }

        return response()->json([
            'message' => 'Cash register created successfully',
            'data' => $register->load(['branch', 'operatingUnit']),
        ], 201);
    }
}
