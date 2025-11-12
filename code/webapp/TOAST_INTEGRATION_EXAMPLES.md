# Toast Notifications Integration Example

This file shows how to integrate the Toast system into existing inventory components.

## Example 1: Opening Balance Form with Toast

```typescript
// src/components/inventory/opening-balance-form.tsx
import { useToast } from "@/components/ui/toast-provider";

export function OpeningBalanceForm({
    onSuccess,
    onCancel,
}: OpeningBalanceFormProps) {
    const { showSuccess, showError } = useToast();

    const mutation = useMutation({
        mutationFn: (data: typeof formData) =>
            stockMovementApi.openingBalance(data),
        onSuccess: (response) => {
            showSuccess(
                `Opening balance registered successfully!`,
                "Stock Updated",
            );
            onSuccess();
        },
        onError: (error: any) => {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
                showError(
                    "Please fix the validation errors and try again.",
                    "Validation Failed",
                );
            } else {
                showError(
                    error.response?.data?.message ||
                        "Failed to register opening balance",
                    "Error",
                );
            }
        },
    });

    // ... rest of component
}
```

## Example 2: Stock Out Form with Toast

```typescript
// src/components/inventory/stock-out-form.tsx
import { useToast } from "@/components/ui/toast-provider";

export function StockOutForm({ onSuccess, onCancel }: StockOutFormProps) {
    const { showSuccess, showError, showWarning } = useToast();

    const mutation = useMutation({
        mutationFn: (data: typeof formData) => stockMovementApi.stockOut(data),
        onSuccess: (response) => {
            const profitInfo = response.data.data.lines[0];

            if (formData.reason === "SALE" && profitInfo) {
                showSuccess(
                    `Stock removed. Profit: $${profitInfo.profit_total?.toFixed(2) || "0.00"} (${profitInfo.profit_margin?.toFixed(1)}%)`,
                    "Sale Registered",
                );
            } else {
                showSuccess(
                    `${formData.qty} units removed from inventory`,
                    "Stock Updated",
                );
            }

            onSuccess();
        },
        onError: (error: any) => {
            if (error.response?.status === 422) {
                showError(
                    "Insufficient stock available for this operation",
                    "Stock Out Failed",
                );
            } else {
                showError(
                    error.response?.data?.message ||
                        "Failed to register stock out",
                    "Error",
                );
            }
        },
    });

    // Warn about low stock
    useEffect(() => {
        if (
            currentStock &&
            currentStock.available < selectedVariant?.min_stock
        ) {
            showWarning(
                `Stock level is below minimum threshold (${selectedVariant.min_stock})`,
                "Low Stock Warning",
            );
        }
    }, [currentStock, selectedVariant]);

    // ... rest of component
}
```

## Example 3: Item Variants Page with Toast

```typescript
// src/pages/inventory/item-variants.tsx
import { useToast } from "@/components/ui/toast-provider";

export default function ItemVariantsPage() {
    const { showSuccess, showError, showInfo } = useToast();
    const queryClient = useQueryClient();

    const handleDelete = async (id: number, variantName: string) => {
        if (confirm(`Are you sure you want to delete "${variantName}"?`)) {
            try {
                await itemVariantApi.delete(id);
                showSuccess(
                    `"${variantName}" has been deleted`,
                    "Variant Deleted",
                );
                queryClient.invalidateQueries({ queryKey: ["item-variants"] });
                setShowDetails(false);
            } catch (error: any) {
                if (error.response?.status === 409) {
                    showError(
                        "Cannot delete variant with existing stock. Remove stock first.",
                        "Delete Failed",
                    );
                } else {
                    showError(
                        error.response?.data?.message ||
                            "Failed to delete variant",
                        "Error",
                    );
                }
            }
        }
    };

    const handleFormSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ["item-variants"] });
        setShowForm(false);
        showSuccess(
            editingVariant
                ? "Variant updated successfully"
                : "New variant created",
            "Success",
        );
    };

    // ... rest of component
}
```

## Example 4: Bulk Operations with Toast

```typescript
import { useToast } from "@/components/ui/toast-provider";

function BulkOperationsExample() {
    const { showSuccess, showError, showInfo } = useToast();

    const handleBulkDelete = async (selectedIds: number[]) => {
        showInfo(`Deleting ${selectedIds.length} items...`, "Bulk Delete");

        try {
            const results = await Promise.allSettled(
                selectedIds.map((id) => itemApi.delete(id)),
            );

            const successful = results.filter(
                (r) => r.status === "fulfilled",
            ).length;
            const failed = results.filter(
                (r) => r.status === "rejected",
            ).length;

            if (failed === 0) {
                showSuccess(
                    `Successfully deleted ${successful} items`,
                    "Bulk Delete Complete",
                );
            } else {
                showWarning(
                    `Deleted ${successful} items, ${failed} failed`,
                    "Bulk Delete Partial",
                );
            }
        } catch (error) {
            showError("Bulk delete operation failed", "Error");
        }
    };
}
```

## Best Practices

1. **Use appropriate variant**:
    - `showSuccess`: Successful operations (create, update, delete)
    - `showError`: Failed operations, validation errors
    - `showWarning`: Low stock, approaching limits, partial failures
    - `showInfo`: Background operations, processing states

2. **Provide context**:
    - Always include a descriptive title
    - Message should explain what happened
    - For errors, suggest next steps

3. **Don't overuse**:
    - Not every API call needs a toast
    - Avoid showing toast for expected failures (like validation)
    - Use inline errors for form validation

4. **Custom durations**:

    ```typescript
    showToast({
        message: "This will stay for 10 seconds",
        variant: "info",
        duration: 10000,
    });
    ```

5. **Manual control**:

    ```typescript
    const toastId = showToast({
        message: "Processing...",
        variant: "info",
        duration: 0, // Won't auto-dismiss
    });

    // Later, manually remove it
    removeToast(toastId);
    ```
