<?php

declare(strict_types=1);

namespace Tests\Unit\Support;

use App\Support\InventoryCatalogLookup;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class InventoryCatalogLookupTest extends TestCase
{
    #[Test]
    public function it_builds_the_spatie_or_pipe_middleware_string(): void
    {
        $this->assertSame(
            'permission:items.view|suppliers.manage|receipts.manage|inventory_catalog.lookup',
            InventoryCatalogLookup::middleware(InventoryCatalogLookup::PRODUCTS)
        );
        $this->assertSame(
            'permission:inventory_locations.view|receipts.manage|inventory_catalog.lookup',
            InventoryCatalogLookup::middleware(InventoryCatalogLookup::LOCATIONS)
        );
        $this->assertSame(
            'permission:suppliers.view|receipts.manage|inventory_catalog.lookup',
            InventoryCatalogLookup::middleware(InventoryCatalogLookup::SUPPLIERS)
        );
    }

    #[Test]
    public function every_domain_list_includes_the_generic_lookup_permission(): void
    {
        // The whole point of the contract: a new workflow only ever needs to be granted
        // this one permission — it must already be present in every domain's OR list.
        foreach ([InventoryCatalogLookup::PRODUCTS, InventoryCatalogLookup::LOCATIONS, InventoryCatalogLookup::SUPPLIERS] as $domain) {
            $this->assertContains(InventoryCatalogLookup::LOOKUP, $domain);
        }
    }
}
