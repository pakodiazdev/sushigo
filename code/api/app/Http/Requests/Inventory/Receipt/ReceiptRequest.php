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
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

abstract class ReceiptRequest extends FormRequest
{
    use ScopesDestinationLocationToAccessibleUnits;
    use SharesReceiptValidationMessages;

    public function authorize(): bool
    {
        return true;
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
            'lines.*.ordered_packages' => ['nullable', 'numeric', 'min:0'],
            'lines.*.received_packages' => ['required', 'numeric', 'gt:0'],
            'lines.*.bonus_packages' => ['nullable', 'numeric', 'min:0'],
            'lines.*.gross_amount' => ['nullable', 'numeric', 'min:0'],
            'lines.*.discounts' => ['nullable', 'numeric', 'min:0'],
            'lines.*.allocated_expenses' => ['nullable', 'numeric', 'min:0'],
            'lines.*.non_recoverable_taxes' => ['nullable', 'numeric', 'min:0'],
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

    /** @param  array<string, mixed>  $line */
    private function validateNetAcquisitionAmount(Validator $validator, int|string $index, array $line): void
    {
        $netAcquisitionAmount = (float) ($line['gross_amount'] ?? 0)
            - (float) ($line['discounts'] ?? 0)
            + (float) ($line['allocated_expenses'] ?? 0)
            + (float) ($line['non_recoverable_taxes'] ?? 0);

        if ($netAcquisitionAmount < 0) {
            $validator->errors()->add(
                "lines.{$index}.discounts",
                'Los descuentos no pueden exceder el monto bruto más los gastos asignados y los impuestos no recuperables.'
            );
        }
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
                grossAmount: (float) ($line['gross_amount'] ?? 0),
                discounts: (float) ($line['discounts'] ?? 0),
                allocatedExpenses: (float) ($line['allocated_expenses'] ?? 0),
                nonRecoverableTaxes: (float) ($line['non_recoverable_taxes'] ?? 0),
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
