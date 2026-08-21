<?php

namespace Tests\Feature\Inventory;

use App\Services\Inventory\VariantPurchasePresentationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\Test;

/**
 * Locking behavior for VariantPurchasePresentationService — the "one active
 * default per Variant" invariant (§3.3) relies on this service serializing
 * concurrent requests, not just the DB partial unique index as a backstop.
 */
class VariantPurchasePresentationServiceTest extends InventoryTestCase
{
    protected VariantPurchasePresentationService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(VariantPurchasePresentationService::class);
    }

    #[Test]
    public function it_locks_the_parent_variant_row_when_creating_the_first_presentation(): void
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);
        $template = $this->createPurchasePresentationTemplate(['compatible_dimension_uom_id' => $this->uomKg->id]);

        $queries = [];
        DB::listen(function ($query) use (&$queries) {
            $queries[] = $query->sql;
        });

        DB::transaction(function () use ($variant, $template) {
            $this->service->create($variant->id, [
                'template_id' => $template->id,
                'is_default' => false,
                'is_active' => true,
                'meta' => [],
            ]);
        });

        $variantLockQueries = array_filter(
            $queries,
            fn ($sql) => str_contains(strtolower($sql), 'for update') && str_contains(strtolower($sql), 'item_variants')
        );

        $this->assertNotEmpty(
            $variantLockQueries,
            'Expected create() to lock the parent item_variants row even when the Variant has zero existing presentations'
        );
    }

    /**
     * StoreVariantPurchasePresentationRequest::validateTemplateAssignable()
     * already blocks a duplicate assignment before this service is ever
     * called, so calling create() twice directly is what exercises the
     * service's own post-lock recheck — the code path a real request never
     * takes except in the race the recheck exists to close.
     */
    #[Test]
    public function it_rejects_a_duplicate_assignment_that_slips_past_the_lock(): void
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);
        $template = $this->createPurchasePresentationTemplate(['compatible_dimension_uom_id' => $this->uomKg->id]);

        $this->service->create($variant->id, [
            'template_id' => $template->id,
            'is_default' => false,
            'is_active' => true,
            'meta' => [],
        ]);

        $this->expectException(ValidationException::class);

        $this->service->create($variant->id, [
            'template_id' => $template->id,
            'is_default' => false,
            'is_active' => true,
            'meta' => [],
        ]);
    }
}
