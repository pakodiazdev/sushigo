<?php

namespace App\Support;

/**
 * Route-parameter segments for the CashAdjustments domain routes — see
 * routes/api/cash-adjustments.php.
 *
 * Each segment name matches its controller's Eloquent-typed parameter (e.g.
 * {cashRegister} -> CashRegister $cashRegister) so Laravel's implicit model
 * binding resolves via the model's public_id (see #293), instead of the
 * generic RouteParams::ID used elsewhere in the app.
 *
 * Defined as class constants — not top-level `const` in the route file
 * itself — for the same reason documented on RouteParams: routes/api.php is
 * `require`d fresh on every application boot (Laravel's loadRoutesFrom does
 * not use require_once), so top-level constants would fatal with "already
 * defined" on a second boot in the same PHP process (e.g. across tests).
 */
final class CashAdjustmentRouteParams
{
    public const CASH_REGISTER = '/{cashRegister}';

    public const CASH_TERMINAL = '/{cashTerminal}';

    public const BANK_ACCOUNT = '/{bankAccount}';

    public const CASH_SESSION = '/{cashSession}';

    public const CASH_ADJUSTMENT = '/{cashAdjustment}';

    public const CASH_EXPENSE = '/{cashExpense}';

    public const POST_ACTION = '/post';
}
