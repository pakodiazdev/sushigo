<?php

namespace App\Support;

/**
 * Shared route-parameter segments referenced from routes/api.php.
 *
 * routes/api.php is `require`d fresh on every application boot (Laravel's
 * loadRoutesFrom does not use require_once), so top-level constants defined
 * directly in that file fatal with "already defined" once a second boot
 * happens in the same PHP process (e.g. across tests). Autoloaded class
 * constants don't have this problem since the class is only loaded once.
 */
final class RouteParams
{
    public const ID = '/{id}';

    public const ID_POST = '/{id}/post';
}
