<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\Receipt;

use App\DataTransferObjects\Inventory\ReceiptLineData;
use App\DataTransferObjects\Inventory\SaveReceiptData;
use App\Http\Requests\Inventory\Receipt\Concerns\ScopesDestinationLocationToAccessibleUnits;
use App\Http\Requests\Inventory\Receipt\Concerns\SharesReceiptValidationMessages;
use App\Models\InventoryLocation;
use App\Models\Supplier;
use App\Models\SupplierOffering;
use App\Models\VariantPurchasePresentation;
use App\Support\Money\Money;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

abstract class ReceiptRequest extends FormRequest
{
    use ScopesDestinationLocationToAccessibleUnits;
    use SharesReceiptValidationMessages;

    /**
     * The largest amount `receipt_lines`' `decimal(15,4)` money columns can hold, expressed
     * with `Money::SCALE` (2) fractional digits — the practical ceiling once `decimal:0,2`
     * (below) has already ruled out a 3rd/4th digit. Kept as a decimal string, never a float,
     * so bounding a component or the derived net amount never introduces its own float
     * comparison boundary alongside the ones #415 already removed.
     */
    private const MAX_COLUMN_AMOUNT = '99999999999.99';

    public function authorize(): bool
    {
        // Defense in depth (#572): the `receipts.manage` route middleware already
        // guards create/update, but authorizing here too means the constraint
        // holds even if the FormRequest is resolved on a path that skipped route
        // middleware. `receipts.manage` is the one permission that governs every
        // draft mutation (see doc/architecture/purchasing/purchase-receipts.en.md).
        return $this->user()?->can('receipts.manage') ?? false;
    }

    /** @return array<string, array<int, mixed>> */
    protected function receiptRules(): array
    {
        return [
            'supplier_id' => ['required', 'string', Rule::exists('suppliers', 'public_id')->withoutTrashed()],
            // Scoped to the caller's accessible Operating Units — `assertReceiptInScope`
            // only guards the Receipt's *current* destination, so without this a
            // scoped caller could create a Receipt into, or transfer an accessible
            // draft to, a unit they can't act in. Bypass roles are unconstrained.
            'destination_location_id' => ['required', 'string', $this->accessibleDestinationLocationRule()],
            'reference' => ['nullable', 'string', 'max:255'],
            'receipt_date' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.variant_purchase_presentation_id' => ['required', 'string', Rule::exists('variant_purchase_presentations', 'public_id')->withoutTrashed()],
            'lines.*.supplier_offering_id' => ['nullable', 'string', Rule::exists('supplier_offerings', 'public_id')->withoutTrashed()],
            // `decimal:0,4` matches the quantity precision already enforced on
            // PurchasePresentationTemplate::base_unit_quantity (both columns are
            // decimal(15,4)) — without it, `received_packages` could carry more precision
            // than `base_units_received = received_packages * presentation_factor` can
            // ever expose, and a sub-scale-4 value could make that product round to an
            // effectively-zero divisor (see `createLine()`'s own defensive guard for the
            // case this still doesn't rule out: a presentation factor at its own 0.0001
            // floor multiplied by a `received_packages` also at its floor is exactly
            // representable, but this bounds the *request* input to the same precision).
            'lines.*.ordered_packages' => ['nullable', 'numeric', 'min:0', 'decimal:0,4'],
            'lines.*.received_packages' => ['required', 'numeric', 'min:0.0001', 'decimal:0,4'],
            'lines.*.bonus_packages' => ['nullable', 'numeric', 'min:0', 'decimal:0,4'],
            // `decimal:0,2` enforces TD-05's Money scale (#415) at the boundary: a client
            // cannot submit more than 2 fractional digits, so `Money::fromDecimalString()`
            // downstream never sees an amount it would have to reject. `max` bounds each
            // component to what `receipt_lines`' decimal(15,4) columns can actually hold —
            // without it, an individually-storable component could still combine into a net
            // total that overflows the column and fails at insert instead of returning 422
            // (see `validateNetAcquisitionAmount()` for the net-total half of this check).
            'lines.*.gross_amount' => ['nullable', 'numeric', 'min:0', 'max:'.self::MAX_COLUMN_AMOUNT, 'decimal:0,2'],
            'lines.*.discounts' => ['nullable', 'numeric', 'min:0', 'max:'.self::MAX_COLUMN_AMOUNT, 'decimal:0,2'],
            'lines.*.allocated_expenses' => ['nullable', 'numeric', 'min:0', 'max:'.self::MAX_COLUMN_AMOUNT, 'decimal:0,2'],
            'lines.*.non_recoverable_taxes' => ['nullable', 'numeric', 'min:0', 'max:'.self::MAX_COLUMN_AMOUNT, 'decimal:0,2'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return $this->receiptMessages(array_keys(self::MESSAGES));
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $this->validateDestinationIsReceivingCapable($validator);

            $supplierId = $validator->errors()->has('supplier_id')
                ? null
                : Supplier::where('public_id', $this->input('supplier_id'))->value('id');

            foreach ((array) $this->input('lines', []) as $index => $line) {
                $line = (array) $line;

                $this->validateBonusPackages($validator, $index, $line);
                $this->validateNetAcquisitionAmount($validator, $index, $line);
                $this->validateSupplierOffering($validator, $index, $line, $supplierId);
            }
        });
    }

    /**
     * A Receipt destination must be a real, accessible *receiving* Location
     * (#572): the `exists` rule + `ScopesDestinationLocationToAccessibleUnits`
     * already reject soft-deleted, unknown, and out-of-scope ULIDs; this adds
     * the two business constraints from #568 — the Location must be active and
     * flagged `can_receive_purchases`. Skipped if the field already failed a
     * prior rule so the caller sees one reason at a time.
     */
    private function validateDestinationIsReceivingCapable(Validator $validator): void
    {
        if ($validator->errors()->has('destination_location_id')) {
            return;
        }

        $publicId = $this->input('destination_location_id');

        if (! is_string($publicId) || $publicId === '') {
            return;
        }

        $location = InventoryLocation::where('public_id', $publicId)->first();

        if ($location === null) {
            return;
        }

        if (! $location->is_active || ! $location->can_receive_purchases) {
            $validator->errors()->add(
                'destination_location_id',
                'La ubicación de destino no puede recibir compras o está inactiva.'
            );
        }
    }

    /** @param  array<string, mixed>  $line */
    private function validateBonusPackages(Validator $validator, int|string $index, array $line): void
    {
        $received = (float) ($line['received_packages'] ?? 0);
        $bonus = (float) ($line['bonus_packages'] ?? 0);

        if ($bonus > $received) {
            $validator->errors()->add(
                "lines.{$index}.bonus_packages",
                'Las piezas de bonificación no pueden exceder las piezas recibidas.'
            );
        }
    }

    /**
     * @param  array<string, mixed>  $line
     */
    private function validateNetAcquisitionAmount(Validator $validator, int|string $index, array $line): void
    {
        $moneyFields = ['gross_amount', 'discounts', 'allocated_expenses', 'non_recoverable_taxes'];

        foreach ($moneyFields as $field) {
            // The 'numeric'/'decimal:0,2' rules already reported this field — skip the
            // derived check rather than risk Money::fromDecimalString() rejecting input
            // the primary rule has already flagged.
            if ($validator->errors()->has("lines.{$index}.{$field}")) {
                return;
            }
        }

        $netAcquisitionAmount = $this->lineMoney($line, 'gross_amount')
            ->subtract($this->lineMoney($line, 'discounts'))
            ->add($this->lineMoney($line, 'allocated_expenses'))
            ->add($this->lineMoney($line, 'non_recoverable_taxes'));

        if ($netAcquisitionAmount->isNegative()) {
            $validator->errors()->add(
                "lines.{$index}.discounts",
                'Los descuentos no pueden exceder el monto bruto más los gastos asignados y los impuestos no recuperables.'
            );

            return;
        }

        // Each component already fits `receipt_lines`' decimal(15,4) columns individually
        // (the `max` rule above), but their sum can still overflow the same column on
        // `net_acquisition_amount` — e.g. gross_amount at the column max plus any positive
        // allocated_expenses. Catch that here so it's a 422, not a failed INSERT.
        if ($netAcquisitionAmount->compareTo(Money::fromDecimalString(self::MAX_COLUMN_AMOUNT)) > 0) {
            $validator->errors()->add(
                "lines.{$index}.gross_amount",
                'El monto bruto más los gastos asignados y los impuestos no recuperables, menos los descuentos, excede el máximo permitido.'
            );
        }
    }

    /** @param  array<string, mixed>  $line */
    private function lineMoney(array $line, string $field): Money
    {
        return Money::fromDecimalString((string) ($line[$field] ?? 0));
    }

    /** @param  array<string, mixed>  $line */
    private function validateSupplierOffering(Validator $validator, int|string $index, array $line, ?int $supplierId): void
    {
        if (
            empty($line['supplier_offering_id'])
            || $supplierId === null
            || $validator->errors()->has("lines.{$index}.supplier_offering_id")
            || $validator->errors()->has("lines.{$index}.variant_purchase_presentation_id")
        ) {
            return;
        }

        $presentationId = VariantPurchasePresentation::where('public_id', $line['variant_purchase_presentation_id'] ?? null)->value('id');
        $offering = SupplierOffering::where('public_id', $line['supplier_offering_id'])->first();

        if (! $offering || ($offering->supplier_id === $supplierId && $offering->variant_purchase_presentation_id === $presentationId)) {
            return;
        }

        $validator->errors()->add(
            "lines.{$index}.supplier_offering_id",
            'La oferta seleccionada no corresponde al proveedor o a la presentación de esta línea.'
        );
    }

    public function receiptData(): SaveReceiptData
    {
        $data = $this->validated();

        $supplierId = Supplier::where('public_id', $data['supplier_id'])->value('id');
        $locationId = InventoryLocation::where('public_id', $data['destination_location_id'])->value('id');

        $lines = array_map(function (array $line): ReceiptLineData {
            $presentationId = VariantPurchasePresentation::where('public_id', $line['variant_purchase_presentation_id'])->value('id');
            $offeringId = isset($line['supplier_offering_id'])
                ? SupplierOffering::where('public_id', $line['supplier_offering_id'])->value('id')
                : null;

            return new ReceiptLineData(
                variantPurchasePresentationId: $presentationId,
                supplierOfferingId: $offeringId,
                orderedPackages: (float) ($line['ordered_packages'] ?? 0),
                receivedPackages: (float) $line['received_packages'],
                bonusPackages: (float) ($line['bonus_packages'] ?? 0),
                grossAmount: $this->lineMoney($line, 'gross_amount'),
                discounts: $this->lineMoney($line, 'discounts'),
                allocatedExpenses: $this->lineMoney($line, 'allocated_expenses'),
                nonRecoverableTaxes: $this->lineMoney($line, 'non_recoverable_taxes'),
            );
        }, $data['lines']);

        return new SaveReceiptData(
            supplierId: $supplierId,
            destinationLocationId: $locationId,
            reference: $data['reference'] ?? null,
            receiptDate: $data['receipt_date'],
            notes: $data['notes'] ?? null,
            actingUserId: $this->user()->id,
            lines: $lines,
        );
    }
}
