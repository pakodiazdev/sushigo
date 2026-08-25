// Pricing domain types — effective-dated Price Lists resolved by Branch or Operating Unit
// context (#435 backend, #436 this management UI). See
// doc/architecture/pricing/pricing-architecture.en.md. Distinct from `ItemVariant.sale_price`
// (never read by this domain) and from Product/Variant catalog-identity types in
// `@/types/inventory` — no price field lives on either of those.

// A named, prioritized container. Not itself tied to any branch — the same list can be
// assigned to many contexts via PriceListAssignment below.
export interface PriceList {
  /** ULID public identifier. */
  id: string
  code: string
  name: string
  description: string | null
  /** Tiebreaker when multiple active lists resolve for the same context — higher wins. */
  priority: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

// Attaches a PriceList to exactly one context: a Branch (always required) or, more
// specifically, one OperatingUnit within that branch (nullable override).
export interface PriceListAssignment {
  /** ULID public identifier. */
  id: string
  price_list_id: string
  branch_id: number
  operating_unit_id: number | null
  effective_from: string
  effective_to: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

// The actual price for one ItemVariant within one PriceList, with its own effective window —
// independent of any PriceListAssignment (see doc §1: PriceList ──< PriceListAssignment, and
// PriceList ──< VariantPrice, both direct children of PriceList, not nested under each other).
export interface VariantPrice {
  /** ULID public identifier. */
  id: string
  item_variant_id: string
  price_list_id: string
  /** Exact decimal(15,4) string, e.g. "129.5000" — never a float. */
  price: string
  effective_from: string
  effective_to: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

/** Minimal PriceList reference embedded in a resolve result. */
export interface PriceResolutionPriceListRef {
  id: string
  code: string
  name: string
}

// GET /pricing/resolve's result — `resolved: false` with a null price is a valid, explicit
// outcome ("no configured price for this context"), never an error. See doc §3.
export interface PriceResolutionResult {
  item_variant_id: string
  branch_id: number
  operating_unit_id: number | null
  as_of: string
  resolved: boolean
  price: string | null
  price_list: PriceResolutionPriceListRef | null
}
