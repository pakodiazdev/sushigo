<?php

namespace Tests\Unit\DataTransferObjects;

use App\DataTransferObjects\Inventory\InventoryEntryPostingData;
use App\Models\StockMovement;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

/**
 * #567 — the normalized inbound posting command's source-identity invariant.
 */
class InventoryEntryPostingDataTest extends TestCase
{
    private function make(array $overrides = []): InventoryEntryPostingData
    {
        return new InventoryEntryPostingData(...array_merge([
            'inventoryLocationId' => 1,
            'itemVariantId' => 2,
            'baseQuantity' => 10.0,
            'reason' => StockMovement::REASON_PURCHASE_RECEIPT,
        ], $overrides));
    }

    #[Test]
    public function it_accepts_a_fully_null_source_identity(): void
    {
        $data = $this->make();

        $this->assertNull($data->sourceType);
        $this->assertNull($data->sourceId);
        $this->assertNull($data->sourceLineId);
    }

    #[Test]
    public function it_accepts_a_fully_populated_source_identity(): void
    {
        $data = $this->make([
            'sourceType' => 'App\\Models\\Receipt',
            'sourceId' => 7,
            'sourceLineId' => 3,
        ]);

        $this->assertSame(3, $data->sourceLineId);
    }

    #[Test]
    public function it_rejects_a_source_line_without_its_parent_document(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->make(['sourceLineId' => 3]); // sourceType / sourceId still null
    }

    #[Test]
    public function it_rejects_a_parent_document_without_a_source_line(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->make(['sourceType' => 'App\\Models\\Receipt', 'sourceId' => 7]); // sourceLineId still null
    }

    #[Test]
    public function it_rejects_a_source_type_and_line_with_a_null_source_id(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->make(['sourceType' => 'App\\Models\\Receipt', 'sourceLineId' => 3]); // sourceId still null
    }
}
