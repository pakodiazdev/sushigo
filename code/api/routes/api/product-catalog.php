<?php

use App\Http\Controllers\Api\V1\Inventory\Brand\CreateBrandController;
use App\Http\Controllers\Api\V1\Inventory\Brand\DeleteBrandController;
use App\Http\Controllers\Api\V1\Inventory\Brand\ListBrandsController;
use App\Http\Controllers\Api\V1\Inventory\Brand\ShowBrandController;
use App\Http\Controllers\Api\V1\Inventory\Brand\UpdateBrandController;
use App\Http\Controllers\Api\V1\Inventory\InventoryCategory\CreateInventoryCategoryController;
use App\Http\Controllers\Api\V1\Inventory\InventoryCategory\DeleteInventoryCategoryController;
use App\Http\Controllers\Api\V1\Inventory\InventoryCategory\ListInventoryCategoriesController;
use App\Http\Controllers\Api\V1\Inventory\InventoryCategory\ShowInventoryCategoryController;
use App\Http\Controllers\Api\V1\Inventory\InventoryCategory\UpdateInventoryCategoryController;
use App\Http\Controllers\Api\V1\Inventory\Product\CreateProductController;
use App\Http\Controllers\Api\V1\Inventory\Product\DeleteProductController;
use App\Http\Controllers\Api\V1\Inventory\Product\ListProductsController;
use App\Http\Controllers\Api\V1\Inventory\Product\ShowProductController;
use App\Http\Controllers\Api\V1\Inventory\Product\UpdateProductController;
use App\Http\Controllers\Api\V1\Inventory\PurchasePresentationTemplate\CreatePurchasePresentationTemplateController;
use App\Http\Controllers\Api\V1\Inventory\PurchasePresentationTemplate\DeletePurchasePresentationTemplateController;
use App\Http\Controllers\Api\V1\Inventory\PurchasePresentationTemplate\ListPurchasePresentationTemplatesController;
use App\Http\Controllers\Api\V1\Inventory\PurchasePresentationTemplate\ShowPurchasePresentationTemplateController;
use App\Http\Controllers\Api\V1\Inventory\PurchasePresentationTemplate\UpdatePurchasePresentationTemplateController;
use App\Http\Controllers\Api\V1\Inventory\Variant\CreateVariantController;
use App\Http\Controllers\Api\V1\Inventory\Variant\DeleteVariantController;
use App\Http\Controllers\Api\V1\Inventory\Variant\ListVariantsController;
use App\Http\Controllers\Api\V1\Inventory\Variant\ShowVariantController;
use App\Http\Controllers\Api\V1\Inventory\Variant\UpdateVariantController;
use App\Http\Controllers\Api\V1\Inventory\VariantPurchasePresentation\CreateVariantPurchasePresentationController;
use App\Http\Controllers\Api\V1\Inventory\VariantPurchasePresentation\DeleteVariantPurchasePresentationController;
use App\Http\Controllers\Api\V1\Inventory\VariantPurchasePresentation\ListVariantPurchasePresentationsController;
use App\Http\Controllers\Api\V1\Inventory\VariantPurchasePresentation\ShowVariantPurchasePresentationController;
use App\Http\Controllers\Api\V1\Inventory\VariantPurchasePresentation\UpdateVariantPurchasePresentationController;
use App\Support\RouteParams;
use Illuminate\Support\Facades\Route;

// Brands (Protected read + write — requires brands.view / brands.create / brands.update / brands.delete)
Route::middleware('auth:api')->prefix('brands')->group(function () {
    $brandParam = '/{brand}';

    Route::get('/', ListBrandsController::class)->name('brands.list')->middleware('permission:brands.view');
    Route::get($brandParam, ShowBrandController::class)->name('brands.show')->middleware('permission:brands.view');
    Route::post('/', CreateBrandController::class)->name('brands.create')->middleware('permission:brands.create');
    Route::put($brandParam, UpdateBrandController::class)->name('brands.update')->middleware('permission:brands.update');
    Route::delete($brandParam, DeleteBrandController::class)->name('brands.delete')->middleware('permission:brands.delete');
});

// Inventory Categories (Protected read + write — requires inventory_categories.view / .create / .update / .delete)
Route::middleware('auth:api')->prefix('inventory-categories')->group(function () {
    $inventoryCategoryParam = '/{inventoryCategory}';

    Route::get('/', ListInventoryCategoriesController::class)->name('inventory-categories.list')->middleware('permission:inventory_categories.view');
    Route::get($inventoryCategoryParam, ShowInventoryCategoryController::class)->name('inventory-categories.show')->middleware('permission:inventory_categories.view');
    Route::post('/', CreateInventoryCategoryController::class)->name('inventory-categories.create')->middleware('permission:inventory_categories.create');
    Route::put($inventoryCategoryParam, UpdateInventoryCategoryController::class)->name('inventory-categories.update')->middleware('permission:inventory_categories.update');
    Route::delete($inventoryCategoryParam, DeleteInventoryCategoryController::class)->name('inventory-categories.delete')->middleware('permission:inventory_categories.delete');
});

// Products — Item scoped to type=PRODUCTO (Protected read + write — reuses items.* permissions,
// see doc/architecture/product-catalog/product-catalog-architecture.en.md §6). Keeps the numeric
// {id} route-param name is retained for compatibility; model binding resolves the public ULID
// delivered by #399.
// List also accepts suppliers.manage (#505) — the Suppliers offering-create cascade needs to
// populate this selector for a user authorized to manage supplier offerings but not the general
// catalog; show/create/update/delete stay items.*-only since the cascade never calls them.
Route::middleware('auth:api')->prefix('inventory/products')->group(function () {
    Route::get('/', ListProductsController::class)->name('products.list')->middleware('permission:items.view|suppliers.manage');
    Route::get(RouteParams::ID, ShowProductController::class)->name('products.show')->middleware('permission:items.view');
    Route::post('/', CreateProductController::class)->name('products.create')->middleware('permission:items.create');
    Route::put(RouteParams::ID, UpdateProductController::class)->name('products.update')->middleware('permission:items.update');
    Route::delete(RouteParams::ID, DeleteProductController::class)->name('products.delete')->middleware('permission:items.delete');
});

// Product Variants — ItemVariant scoped to a Product-type Item (Protected read + write — reuses
// items.* permissions, see doc/architecture/product-catalog/product-catalog-architecture.en.md §6).
// Catalog identity only — never accepts acquisition cost, sale price, or stock thresholds/balances
// (see CreateVariantRequest/UpdateVariantRequest). Keeps the numeric {id}/{variantId} route params
// while model binding resolves the public ULIDs delivered by #399.
// List also accepts suppliers.manage (#505) — see the Products list note above; same reasoning.
Route::middleware('auth:api')->prefix('inventory/products/{id}/variants')->group(function () {
    Route::get('/', ListVariantsController::class)->name('products.variants.list')->middleware('permission:items.view|suppliers.manage');
    Route::get(RouteParams::VARIANT_ID, ShowVariantController::class)->name('products.variants.show')->middleware('permission:items.view');
    Route::post('/', CreateVariantController::class)->name('products.variants.create')->middleware('permission:items.create');
    Route::put(RouteParams::VARIANT_ID, UpdateVariantController::class)->name('products.variants.update')->middleware('permission:items.update');
    Route::delete(RouteParams::VARIANT_ID, DeleteVariantController::class)->name('products.variants.delete')->middleware('permission:items.delete');
});

// Purchase Presentation Templates — global, reusable commercial packaging
// definitions (Unit/Pack/Box/Tray), not Product/Variant-scoped (Protected
// read + write — requires purchase_presentation_templates.view / .manage,
// see doc/architecture/product-catalog/product-catalog-architecture.en.md
// §6). A coarser single `.manage` permission covers create/update/delete —
// this is low-frequency catalog governance, not daily product editing.
Route::middleware('auth:api')->prefix('inventory/purchase-presentation-templates')->group(function () {
    $templateParam = '/{template}';

    Route::get('/', ListPurchasePresentationTemplatesController::class)->name('purchase-presentation-templates.list')->middleware('permission:purchase_presentation_templates.view');
    Route::get($templateParam, ShowPurchasePresentationTemplateController::class)->name('purchase-presentation-templates.show')->middleware('permission:purchase_presentation_templates.view');
    Route::post('/', CreatePurchasePresentationTemplateController::class)->name('purchase-presentation-templates.create')->middleware('permission:purchase_presentation_templates.manage');
    Route::put($templateParam, UpdatePurchasePresentationTemplateController::class)->name('purchase-presentation-templates.update')->middleware('permission:purchase_presentation_templates.manage');
    Route::delete($templateParam, DeletePurchasePresentationTemplateController::class)->name('purchase-presentation-templates.delete')->middleware('permission:purchase_presentation_templates.manage');
});

// Variant Purchase Presentations — assignment of a reusable template to a
// specific Product Variant (Protected read + write — reuses items.*
// permissions, same reasoning as Product Variants above: assignment is
// scoped to a Variant the user can already edit, no new permission needed).
// List also accepts suppliers.manage (#505) — see the Products list note above; same reasoning.
Route::middleware('auth:api')->prefix('inventory/products/{id}/variants/{variantId}/purchase-presentations')->group(function () {
    Route::get('/', ListVariantPurchasePresentationsController::class)->name('products.variants.purchase-presentations.list')->middleware('permission:items.view|suppliers.manage');
    Route::get(RouteParams::PRESENTATION_ID, ShowVariantPurchasePresentationController::class)->name('products.variants.purchase-presentations.show')->middleware('permission:items.view');
    Route::post('/', CreateVariantPurchasePresentationController::class)->name('products.variants.purchase-presentations.create')->middleware('permission:items.update');
    Route::put(RouteParams::PRESENTATION_ID, UpdateVariantPurchasePresentationController::class)->name('products.variants.purchase-presentations.update')->middleware('permission:items.update');
    Route::delete(RouteParams::PRESENTATION_ID, DeleteVariantPurchasePresentationController::class)->name('products.variants.purchase-presentations.delete')->middleware('permission:items.update');
});
