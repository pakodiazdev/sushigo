<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Reference-data lookup access contract (#580).
 *
 * Every route below exposes read-only reference data (Products, Variants, Variant Purchase
 * Presentations, Inventory Locations, Suppliers, Supplier Offerings) that more than one workflow
 * needs to browse without necessarily holding that domain's own catalog-management permission.
 * Before this contract, each new consumer workflow added its own `.manage` permission to every
 * affected route's `permission:a|b|c` middleware string (see #505, #433) — a pattern that grows
 * without bound as more workflows need lookup access, and is easy to get inconsistent across the
 * six routes that need it.
 *
 * `LOOKUP` is the one permission a *new* workflow should be granted when it only needs read-only
 * reference-data access it doesn't otherwise manage — it is already included in every domain list
 * below, so adding a new consumer means seeding this one permission for that workflow's role, never
 * touching a route or this class. `suppliers.manage` and `receipts.manage` are named exceptions kept
 * for backward compatibility with the two consumers that predate this contract (the Supplier
 * Offering create form, #505, and the Purchase Receipt form's Product→Variant→Presentation cascade
 * plus its Supplier/Location pickers, #433) — do not add a third named workflow permission here;
 * grant `LOOKUP` to that workflow's role/permission holder instead.
 *
 * Lookup access never implies write access: only the `*.list` (and, for Suppliers/Locations, other
 * read) routes use these constants — create/update/delete routes keep their own domain-specific
 * permission untouched.
 */
final class InventoryCatalogLookup
{
    /**
     * Grant this permission to a workflow's role (or directly to a user) that needs read-only
     * reference-data lookup across Products/Variants/Presentations/Locations/Suppliers without a
     * domain-management permission of its own.
     */
    public const LOOKUP = 'inventory_catalog.lookup';

    /** Product / Variant / Variant Purchase Presentation lookup routes. */
    public const PRODUCTS = ['items.view', 'suppliers.manage', 'receipts.manage', self::LOOKUP];

    /** Inventory Location lookup routes. */
    public const LOCATIONS = ['inventory_locations.view', 'receipts.manage', self::LOOKUP];

    /** Supplier / Supplier Offering lookup routes. */
    public const SUPPLIERS = ['suppliers.view', 'receipts.manage', self::LOOKUP];

    /**
     * Builds the Spatie `permission:a|b|c` middleware string for one of the domain constants
     * above, so route files never hand-write the OR-pipe syntax themselves.
     *
     * @param  array<int, string>  $permissions  one of this class's domain constants
     */
    public static function middleware(array $permissions): string
    {
        return 'permission:'.implode('|', $permissions);
    }
}
