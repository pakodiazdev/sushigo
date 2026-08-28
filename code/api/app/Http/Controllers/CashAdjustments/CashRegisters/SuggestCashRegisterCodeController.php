<?php

declare(strict_types=1);

namespace App\Http\Controllers\CashAdjustments\CashRegisters;

use App\Http\Controllers\Controller;
use App\Support\CashRegisterCodeGenerator;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Get(
 *   path="/api/v1/cash-registers/next-code",
 *   operationId="suggestCashRegisterCode",
 *   summary="Suggest the next available Cash Register code",
 *   description="Returns the next unused REG-NNN code based on the configured prefix/padding and every existing Cash Register code across all branches, operating units and register types. The suggestion is a convenience only; the database unique index remains the authority.",
 *   tags={"Cash Registers"},
 *   security={{"passport": {}}},
 *
 *   @OA\Response(
 *       response=200,
 *       description="Next available code",
 *
 *       @OA\JsonContent(
 *
 *           @OA\Property(property="code", type="string", example="REG-004"),
 *           @OA\Property(property="prefix", type="string", example="REG-")
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires cash_registers.create permission")
 * )
 */
class SuggestCashRegisterCodeController extends Controller
{
    public function __invoke(CashRegisterCodeGenerator $generator): JsonResponse
    {
        return response()->json([
            'code' => $generator->next(),
            'prefix' => $generator->prefix(),
        ]);
    }
}
