export const replenishmentQueryKeys = {
  all: ['replenishment-policies'] as const,
  forLocation: (locationId: string) =>
    [...replenishmentQueryKeys.all, 'location', locationId] as const,
}
