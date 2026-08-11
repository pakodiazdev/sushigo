<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Dishes\Dish\Concerns;

/**
 * The eager-load set every Dish endpoint that returns a DishResource needs —
 * shared here instead of duplicated across List/Show/Create/Update so the
 * media chain (mediaAttachments.mediaGallery.mediaAssets, each constrained
 * to the primary row) stays in exactly one place. DishResource::photo_url
 * reads this chain directly rather than calling
 * primaryMediaGallery()/primaryMedia() (each of those issues its own fresh
 * query per call, which turns a list response into an N+1 — see
 * DishCrudTest's dedicated query-count regression test).
 */
trait LoadsDishRelations
{
    /**
     * Plain relation-name entries ('category', 'extraGroups.dish') sit at integer keys;
     * only the constrained entries below them are keyed by relation name, so the key type
     * is genuinely mixed, not string-only.
     *
     * Closure is referenced unqualified with no `use` statement on purpose — it's a PHP
     * built-in in the global namespace, which CLAUDE.md's "PHP Class Names" convention
     * explicitly exempts (same as its own BackedEnum example) from both the import and the
     * backslash-prefix rule that applies to every other class reference in this codebase.
     *
     * @return array<array-key, Closure|string>
     */
    private function dishEagerLoadRelations(): array
    {
        return [
            'category',
            'extraGroups.dish',
            // Nested payloads only show active options — matches totalPriceFor()'s
            // notion of "available extras". Direct option management still goes
            // through the dedicated dish-extra-options endpoints.
            'extraGroups.options' => fn ($query) => $query->where('is_active', true)->with('extraGroup'),
            'mediaAttachments' => fn ($query) => $query->where('is_primary', true)->with([
                'mediaGallery.mediaAssets' => fn ($assets) => $assets->where('is_primary', true),
            ]),
        ];
    }
}
