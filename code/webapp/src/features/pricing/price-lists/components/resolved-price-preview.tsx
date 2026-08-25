import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-fields'
import { Input } from '@/components/ui/input'
import { VariantPicker } from './variant-picker'
import { BranchContextPicker } from './branch-context-picker'
import { useResolvedPricePreview } from '../hooks/use-resolved-price-preview'

/**
 * Preview the resolved price for a Variant + context/date, calling the same
 * GET /pricing/resolve endpoint the backend's own resolution algorithm exposes — Acceptance
 * Criterion: "Resolved-price preview matches the backend".
 */
export function ResolvedPricePreview() {
  const {
    itemVariantId,
    setItemVariantId,
    branchId,
    setBranchId,
    operatingUnitId,
    setOperatingUnitId,
    asOf,
    setAsOf,
    canPreview,
    handlePreview,
    isPending,
    result,
  } = useResolvedPricePreview()

  return (
    <Card className="p-4" data-testid="resolved-price-preview">
      <div className="mb-3 flex items-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-muted-foreground">Resolved Price Preview</p>
          <p className="text-xs text-muted-foreground">See what a context/date resolves to right now</p>
        </div>
      </div>

      <div className="space-y-4">
        <VariantPicker value={itemVariantId} onChange={setItemVariantId} />

        <BranchContextPicker
          branchId={branchId}
          onBranchChange={setBranchId}
          operatingUnitId={operatingUnitId}
          onOperatingUnitChange={setOperatingUnitId}
        />

        <FormField label="As Of" hint="Optional — defaults to today">
          <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </FormField>

        <Button type="button" onClick={handlePreview} disabled={!canPreview || isPending} className="w-full gap-2">
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Preview Resolved Price
        </Button>

        {result && (
          <div
            data-testid="resolved-price-preview-result"
            className={`rounded-md border px-3 py-3 text-sm ${result.resolved
              ? 'border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/50 dark:text-green-300'
              : 'border-border bg-muted text-muted-foreground'
              }`}
          >
            {result.resolved ? (
              <>
                <p className="font-semibold">{result.price}</p>
                <p className="mt-1 text-xs">
                  from {result.price_list?.name} ({result.price_list?.code}) as of {result.as_of}
                </p>
              </>
            ) : (
              <p>No configured price for this context as of {result.as_of}.</p>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
