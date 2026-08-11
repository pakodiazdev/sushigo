import { createFileRoute } from '@tanstack/react-router';
import { FolderKanban, ImageOff, Plus } from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { DataGrid, type Column } from '@/components/ui/data-grid';
import { SlidePanel } from '@/components/ui/slide-panel';
import { SearchInput } from '@/components/ui/search-input';
import { FilterSelect } from '@/components/ui/filter-select';
import { DishForm, DishDetails, DishCategoryManager } from '@/components/dishes';
import type { Dish } from '@/types/dishes';
import { useDishesList } from './use-dishes-list';

export const Route = createFileRoute('/productos')({
    component: ProductosPage,
});

export function ProductosPage() {
    const {
        searchQuery,
        setSearchQuery,
        categoryFilter,
        setCategoryFilter,
        statusFilter,
        setStatusFilter,
        categories,
        groups,
        isLoading,
        selectedDish,
        isDetailsPanelOpen,
        isFormPanelOpen,
        isCategoryManagerOpen,
        setIsCategoryManagerOpen,
        handleRowClick,
        handleNewDish,
        handleEdit,
        handleDelete,
        handleFormSuccess,
        closeDetailsPanel,
        closeFormPanel,
    } = useDishesList();

    const selectedCategoryName = categories.find(
        (category) => category.id === selectedDish?.dish_category_id
    )?.name;

    const columns: Column<Dish>[] = [
        {
            key: 'photo_url',
            header: '',
            width: '64px',
            render: (dish) =>
                dish.photo_url ? (
                    <img src={dish.photo_url} alt={dish.name} className="h-10 w-10 rounded-md object-cover" />
                ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                        <ImageOff className="h-4 w-4 text-muted-foreground" />
                    </div>
                ),
        },
        {
            key: 'name',
            header: 'Name',
            render: (dish) => (
                <div>
                    <div className="font-medium">{dish.name}</div>
                    {dish.description && (
                        <div className="max-w-md truncate text-sm text-muted-foreground">
                            {dish.description}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'base_price',
            header: 'Base Price',
            render: (dish) => <span className="font-mono">${dish.base_price.toFixed(2)}</span>,
        },
        {
            key: 'is_active',
            header: 'Status',
            render: (dish) => (
                <span
                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${dish.is_active
                        ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-950/50 dark:text-green-300 dark:ring-green-800/50'
                        : 'bg-muted text-muted-foreground ring-border'
                        }`}
                >
                    {dish.is_active ? 'Active' : 'Inactive'}
                </span>
            ),
        },
    ];

    return (
        <PageContainer>
            <PageHeader
                title="Platillos"
                description="Gestiona tu catálogo de platillos"
            >
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => setIsCategoryManagerOpen(true)}>
                        <FolderKanban className="h-4 w-4" />
                        Categorías
                    </Button>
                    <Button className="gap-2" onClick={handleNewDish}>
                        <Plus className="h-4 w-4" />
                        Nuevo Platillo
                    </Button>
                </div>
            </PageHeader>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
                <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Buscar platillos..."
                    className="flex-1"
                />

                <FilterSelect
                    label="Categoría"
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                    options={categories.map((category) => ({ value: category.id, label: category.name }))}
                />

                <FilterSelect
                    label="Estado"
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={[
                        { value: 'active', label: 'Activos' },
                        { value: 'inactive', label: 'Inactivos' },
                    ]}
                />
            </div>

            {!isLoading && groups.length === 0 ? (
                <div className="mt-6 flex h-64 items-center justify-center text-muted-foreground">
                    No hay platillos que coincidan con los filtros
                </div>
            ) : (
                <div className="mt-6 space-y-8">
                    {isLoading && (
                        <DataGrid data={[]} columns={columns} loading getRowId={(dish) => dish.id} />
                    )}
                    {!isLoading &&
                        groups.map(({ category, dishes }) => (
                            <section key={category.id}>
                                <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-foreground">
                                    {category.name}
                                    <span className="text-sm font-normal text-muted-foreground">
                                        ({dishes.length})
                                    </span>
                                </h2>
                                <DataGrid
                                    data={dishes}
                                    columns={columns}
                                    onRowClick={handleRowClick}
                                    getRowId={(dish) => dish.id}
                                />
                            </section>
                        ))}
                </div>
            )}

            {/* Details Panel */}
            <SlidePanel isOpen={isDetailsPanelOpen} onClose={closeDetailsPanel} title="Detalle de Platillo">
                {selectedDish && (
                    <DishDetails
                        dish={selectedDish}
                        categoryName={selectedCategoryName}
                        onEdit={() => handleEdit(selectedDish)}
                        onDelete={() => handleDelete(selectedDish.id)}
                    />
                )}
            </SlidePanel>

            {/* Form Panel */}
            <SlidePanel
                isOpen={isFormPanelOpen}
                onClose={closeFormPanel}
                title={selectedDish ? 'Editar Platillo' : 'Nuevo Platillo'}
            >
                <DishForm dish={selectedDish} onSuccess={handleFormSuccess} onCancel={closeFormPanel} />
            </SlidePanel>

            {/* Category Manager */}
            <DishCategoryManager
                isOpen={isCategoryManagerOpen}
                onClose={() => setIsCategoryManagerOpen(false)}
            />
        </PageContainer>
    );
}
