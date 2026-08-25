export const priceListQueryKeys = {
  all: ['price-lists'] as const,
  list: (status: string) => [...priceListQueryKeys.all, 'list', status] as const,
  variantPrices: (priceListId: string | null) =>
    [...priceListQueryKeys.all, priceListId, 'variant-prices'] as const,
  variantDetails: (priceListId: string | null, variantIds: string[]) =>
    [...priceListQueryKeys.variantPrices(priceListId), 'variant-details', variantIds] as const,
  assignments: () => ['price-list-assignments'] as const,
  allAssignments: () => [...priceListQueryKeys.assignments(), 'all'] as const,
  variantSearch: (search: string) => ['pricing', 'variant-search', search] as const,
}
