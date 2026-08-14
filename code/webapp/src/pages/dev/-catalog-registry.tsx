import { useState, type ComponentType } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LabeledBadge } from '@/components/ui/labeled-badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormField, Select, Textarea, Checkbox } from '@/components/ui/form-fields'
import { ToggleSwitch } from '@/components/ui/toggle-switch'
import { SearchInput } from '@/components/ui/search-input'
import { FilterSelect } from '@/components/ui/filter-select'
import { CalendarPicker } from '@/components/ui/calendar-picker'
import { MultiDateCalendar } from '@/components/ui/multi-date-calendar'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { useToast } from '@/components/ui/toast-context'
import { Tabs, TabPanel } from '@/components/ui/tabs'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { LogoIcon, LogoFull } from '@/components/ui/logo'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { SlidePanel } from '@/components/ui/slide-panel'
import { DataGrid, type Column } from '@/components/ui/data-grid'

interface CatalogEntryBase {
  id: string
  name: string
  description: string
  importPath: string
  code: string
}

/**
 * Either a live `Demo` or a `note` explaining why there isn't one (e.g.
 * RestDayPicker, which needs a real API-backed employeeId) — never both,
 * never neither. Enforced at the type level so a new entry can't silently
 * omit both and render "undefined" in the catalog page.
 */
export type CatalogEntry =
  | (CatalogEntryBase & { Demo: ComponentType; note?: undefined })
  | (CatalogEntryBase & { Demo?: undefined; note: string })

export interface CatalogSection {
  id: string
  title: string
  entries: CatalogEntry[]
}

// ── Layout ────────────────────────────────────────────────────────────────────

function PageContainerDemo() {
  return (
    <div className="rounded-md border border-dashed border-border">
      <PageContainer>
        <p className="text-sm text-muted-foreground">
          Envuelve el contenido de una página con márgenes y ancho máximo consistentes.
        </p>
      </PageContainer>
    </div>
  )
}

function PageHeaderDemo() {
  return (
    <PageHeader
      title="Título de página"
      description="Descripción breve de lo que hace esta página"
      action={<Button size="sm">Nueva acción</Button>}
    />
  )
}

function CardDemo() {
  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Título de la tarjeta</CardTitle>
        <CardDescription>Descripción breve del contenido.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Contenido de ejemplo dentro de la tarjeta.</p>
      </CardContent>
      <CardFooter>
        <Button size="sm">Acción</Button>
      </CardFooter>
    </Card>
  )
}

// ── Forms & Inputs ───────────────────────────────────────────────────────────

function ButtonDemo() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button>Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="ghost">Ghost</Button>
      <Button size="sm">Small</Button>
      <Button size="icon" aria-label="Agregar"><Plus className="h-4 w-4" /></Button>
      <Button disabled>Disabled</Button>
    </div>
  )
}

function InputDemo() {
  const [value, setValue] = useState('')
  return (
    <div className="max-w-sm space-y-2">
      <Input placeholder="Escribe algo…" value={value} onChange={(e) => setValue(e.target.value)} />
      <Input placeholder="Con error" error />
    </div>
  )
}

function LabelDemo() {
  return (
    <div className="max-w-sm space-y-1">
      <Label htmlFor="catalog-label-demo">Nombre</Label>
      <Input id="catalog-label-demo" placeholder="Valor" />
    </div>
  )
}

function FormFieldDemo() {
  return (
    <div className="max-w-sm space-y-4">
      <FormField label="Correo" required hint="Usaremos este correo para notificaciones">
        <Input placeholder="correo@sushigo.com" />
      </FormField>
      <FormField label="Nombre" error="Este campo es requerido">
        <Input error />
      </FormField>
    </div>
  )
}

function SelectDemo() {
  return (
    <Select className="max-w-sm" defaultValue="">
      <option value="" disabled>Selecciona una opción</option>
      <option value="a">Opción A</option>
      <option value="b">Opción B</option>
    </Select>
  )
}

function TextareaDemo() {
  return <Textarea className="max-w-sm" placeholder="Escribe una nota…" />
}

function CheckboxDemo() {
  const [checked, setChecked] = useState(true)
  return (
    <Checkbox
      id="catalog-checkbox-demo"
      label="Acepto los términos"
      checked={checked}
      onChange={(e) => setChecked(e.target.checked)}
    />
  )
}

function ToggleSwitchDemo() {
  const [checked, setChecked] = useState(false)
  return <ToggleSwitch label="Notificaciones activas" checked={checked} onChange={setChecked} />
}

function SearchInputDemo() {
  const [value, setValue] = useState('')
  return <SearchInput className="max-w-sm" value={value} onChange={setValue} placeholder="Buscar empleados…" />
}

function FilterSelectDemo() {
  const [value, setValue] = useState('')
  return (
    <FilterSelect
      label="Estado"
      value={value}
      onChange={setValue}
      options={[
        { value: 'active', label: 'Activo' },
        { value: 'inactive', label: 'Inactivo' },
      ]}
    />
  )
}

function CalendarPickerDemo() {
  const [value, setValue] = useState('')
  return <CalendarPicker className="max-w-xs" value={value} onChange={setValue} />
}

function MultiDateCalendarDemo() {
  const [value, setValue] = useState<string[]>([])
  return <MultiDateCalendar className="max-w-xs" value={value} onChange={setValue} />
}

// ── Feedback & Status ────────────────────────────────────────────────────────

function BadgeDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge>Default</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="error">Error</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="info">Info</Badge>
    </div>
  )
}

function LabeledBadgeDemo() {
  return <LabeledBadge label="Semana actual" variant="info">20 jul – 26 jul 2026</LabeledBadge>
}

function InfoTooltipDemo() {
  return (
    <span className="inline-flex items-center text-sm text-foreground">
      Horas extra
      <InfoTooltip text="Horas trabajadas más allá del horario ordinario." />
    </span>
  )
}

function ToastDemo() {
  const { showSuccess, showError, showWarning, showInfo } = useToast()
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="success" onClick={() => showSuccess('Guardado correctamente')}>Success</Button>
      <Button size="sm" variant="destructive" onClick={() => showError('Ocurrió un error')}>Error</Button>
      <Button size="sm" variant="warning" onClick={() => showWarning('Revisa este campo')}>Warning</Button>
      <Button size="sm" variant="info" onClick={() => showInfo('Nuevo dato disponible')}>Info</Button>
    </div>
  )
}

// ── Navigation ────────────────────────────────────────────────────────────────

function TabsDemo() {
  const [activeTab, setActiveTab] = useState('resumen')
  return (
    <div className="rounded-lg border border-border">
      <Tabs
        tabs={[
          { id: 'resumen', label: 'Resumen' },
          { id: 'detalle', label: 'Detalle' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <div className="p-4">
        <TabPanel id="resumen" activeTab={activeTab}>
          <p className="text-sm text-muted-foreground">Contenido de Resumen.</p>
        </TabPanel>
        <TabPanel id="detalle" activeTab={activeTab}>
          <p className="text-sm text-muted-foreground">Contenido de Detalle.</p>
        </TabPanel>
      </div>
    </div>
  )
}

function BreadcrumbsDemo() {
  return (
    <Breadcrumbs
      items={[
        { label: 'Inventario', path: '/inventory' },
        { label: 'Items', path: '/inventory/items' },
      ]}
    />
  )
}

function DropdownMenuDemo() {
  const [open, setOpen] = useState(false)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent"
      >
        Acciones
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent open={open}>
        <DropdownMenuItem onClick={() => setOpen(false)}>Editar</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setOpen(false)}>Duplicar</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setOpen(false)}>Eliminar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function LogoDemo() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <LogoIcon />
      <LogoFull height={32} />
    </div>
  )
}

// ── Overlays ──────────────────────────────────────────────────────────────────

function ConfirmDialogDemo() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Eliminar registro
      </Button>
      <ConfirmDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
        title="¿Eliminar este registro?"
        description="Esta acción no se puede deshacer."
        variant="danger"
        container="viewport"
      />
    </>
  )
}

function SlidePanelDemo() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>Abrir panel</Button>
      <SlidePanel
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Detalle"
        description="Ejemplo de contenido en un panel lateral"
        size="sm"
      >
        <p className="text-sm text-muted-foreground">Contenido de ejemplo dentro del SlidePanel.</p>
      </SlidePanel>
    </>
  )
}

// ── Data Display ──────────────────────────────────────────────────────────────

interface DataGridDemoRow {
  id: number
  name: string
  status: 'active' | 'inactive'
}

const DATA_GRID_DEMO_ROWS: DataGridDemoRow[] = [
  { id: 1, name: 'Sucursal Centro', status: 'active' },
  { id: 2, name: 'Sucursal Norte', status: 'inactive' },
  { id: 3, name: 'Sucursal Sur', status: 'active' },
]

const DATA_GRID_DEMO_COLUMNS: Column<DataGridDemoRow>[] = [
  { key: 'name', header: 'Nombre', sortKey: 'name' },
  {
    key: 'status',
    header: 'Estado',
    render: (row) => (
      <Badge variant={row.status === 'active' ? 'success' : 'default'}>
        {row.status === 'active' ? 'Activo' : 'Inactivo'}
      </Badge>
    ),
  },
]

function DataGridDemo() {
  return <DataGrid<DataGridDemoRow> data={DATA_GRID_DEMO_ROWS} columns={DATA_GRID_DEMO_COLUMNS} />
}

// ── Registry ──────────────────────────────────────────────────────────────────
//
// To document a new component, add one entry to the matching section below
// (or a new section) — name, description, importPath, a short usage snippet
// as `code`, and a `Demo` component with representative props. No other file
// needs to change.

export const catalogSections: CatalogSection[] = [
  {
    id: 'layout',
    title: 'Layout',
    entries: [
      {
        id: 'page-container',
        name: 'PageContainer',
        description: 'Envoltorio de página con padding y ancho máximo consistentes.',
        importPath: '@/components/ui/page-container',
        code: `<PageContainer>\n  {/* contenido de la página */}\n</PageContainer>`,
        Demo: PageContainerDemo,
      },
      {
        id: 'page-header',
        name: 'PageHeader',
        description: 'Encabezado de página con título, descripción y una acción opcional.',
        importPath: '@/components/ui/page-header',
        code: `<PageHeader\n  title="Título"\n  description="Descripción"\n  action={<Button>Nueva acción</Button>}\n/>`,
        Demo: PageHeaderDemo,
      },
      {
        id: 'card',
        name: 'Card',
        description: 'Contenedor con borde y sombra, compuesto por Header/Title/Description/Content/Footer.',
        importPath: '@/components/ui/card',
        code: `<Card>\n  <CardHeader>\n    <CardTitle>Título</CardTitle>\n    <CardDescription>Descripción</CardDescription>\n  </CardHeader>\n  <CardContent>Contenido</CardContent>\n  <CardFooter><Button>Acción</Button></CardFooter>\n</Card>`,
        Demo: CardDemo,
      },
    ],
  },
  {
    id: 'forms',
    title: 'Forms & Inputs',
    entries: [
      {
        id: 'button',
        name: 'Button',
        description: 'Botón con variantes de color y tamaños. Úsalo con react-hook-form para envíos de formularios.',
        importPath: '@/components/ui/button',
        code: `<Button variant="destructive" size="sm">Eliminar</Button>`,
        Demo: ButtonDemo,
      },
      {
        id: 'input',
        name: 'Input',
        description: 'Campo de texto estándar, con estado de error opcional.',
        importPath: '@/components/ui/input',
        code: `<Input placeholder="Escribe algo…" {...register('name')} />`,
        Demo: InputDemo,
      },
      {
        id: 'label',
        name: 'Label',
        description: 'Etiqueta accesible para un control de formulario.',
        importPath: '@/components/ui/label',
        code: `<Label htmlFor="name">Nombre</Label>\n<Input id="name" />`,
        Demo: LabelDemo,
      },
      {
        id: 'form-field',
        name: 'FormField',
        description: 'Envuelve un control con label, hint y mensaje de error inline.',
        importPath: '@/components/ui/form-fields',
        code: `<FormField label="Correo" required error={errors.email?.message}>\n  <Input {...register('email')} />\n</FormField>`,
        Demo: FormFieldDemo,
      },
      {
        id: 'select',
        name: 'Select',
        description: 'Select nativo estilizado, con estado de error opcional.',
        importPath: '@/components/ui/form-fields',
        code: `<Select {...register('status')}>\n  <option value="a">Opción A</option>\n</Select>`,
        Demo: SelectDemo,
      },
      {
        id: 'textarea',
        name: 'Textarea',
        description: 'Área de texto multilínea estilizada.',
        importPath: '@/components/ui/form-fields',
        code: `<Textarea placeholder="Escribe una nota…" {...register('note')} />`,
        Demo: TextareaDemo,
      },
      {
        id: 'checkbox',
        name: 'Checkbox',
        description: 'Casilla de verificación, con label opcional alineado.',
        importPath: '@/components/ui/form-fields',
        code: `<Checkbox id="accept" label="Acepto los términos" {...register('accept')} />`,
        Demo: CheckboxDemo,
      },
      {
        id: 'toggle-switch',
        name: 'ToggleSwitch',
        description: 'Interruptor booleano con label, accesible vía role="switch".',
        importPath: '@/components/ui/toggle-switch',
        code: `<ToggleSwitch label="Notificaciones activas" checked={enabled} onChange={setEnabled} />`,
        Demo: ToggleSwitchDemo,
      },
      {
        id: 'search-input',
        name: 'SearchInput',
        description: 'Input de búsqueda con icono, botón de limpiar y debounce integrado.',
        importPath: '@/components/ui/search-input',
        code: `<SearchInput value={search} onChange={setSearch} placeholder="Buscar…" />`,
        Demo: SearchInputDemo,
      },
      {
        id: 'filter-select',
        name: 'FilterSelect',
        description: 'Select con label e icono de filtro, para barras de filtros de listados.',
        importPath: '@/components/ui/filter-select',
        code: `<FilterSelect label="Estado" value={status} onChange={setStatus} options={statusOptions} />`,
        Demo: FilterSelectDemo,
      },
      {
        id: 'calendar-picker',
        name: 'CalendarPicker',
        description: 'Selector de fecha única con popover; soporta deshabilitar días de la semana.',
        importPath: '@/components/ui/calendar-picker',
        code: `<CalendarPicker value={date} onChange={setDate} disabledDaysOfWeek={[1, 2, 3, 4, 5]} />`,
        Demo: CalendarPickerDemo,
      },
      {
        id: 'multi-date-calendar',
        name: 'MultiDateCalendar',
        description: 'Calendario inline con selección de múltiples fechas no contiguas (chips removibles).',
        importPath: '@/components/ui/multi-date-calendar',
        code: `<MultiDateCalendar value={dates} onChange={setDates} />`,
        Demo: MultiDateCalendarDemo,
      },
      {
        id: 'rest-day-picker',
        name: 'RestDayPicker',
        description: 'CalendarPicker que obtiene el horario del empleado por API y deshabilita sus días laborales.',
        importPath: '@/components/ui/rest-day-picker',
        code: `<RestDayPicker employeeId={employee.id} value={date} onChange={setDate} />`,
        note: 'Requiere un employeeId real y hace fetch a la API — no se renderiza en vivo aquí para mantener este catálogo sin efectos secundarios. Ver CalendarPicker arriba para la interacción de calendario equivalente.',
      },
    ],
  },
  {
    id: 'feedback',
    title: 'Feedback & Status',
    entries: [
      {
        id: 'badge',
        name: 'Badge',
        description: 'Etiqueta de estado con variantes de color.',
        importPath: '@/components/ui/badge',
        code: `<Badge variant="success">Activo</Badge>`,
        Demo: BadgeDemo,
      },
      {
        id: 'labeled-badge',
        name: 'LabeledBadge',
        description: 'Label + Badge para mostrar un valor calculado o fijo, de solo lectura.',
        importPath: '@/components/ui/labeled-badge',
        code: `<LabeledBadge label="Semana actual" variant="info">20 jul – 26 jul 2026</LabeledBadge>`,
        Demo: LabeledBadgeDemo,
      },
      {
        id: 'info-tooltip',
        name: 'InfoTooltip',
        description: 'Icono de información con tooltip flotante al pasar el cursor.',
        importPath: '@/components/ui/info-tooltip',
        code: `<InfoTooltip text="Horas trabajadas más allá del horario ordinario." />`,
        Demo: InfoTooltipDemo,
      },
      {
        id: 'toast',
        name: 'Toast',
        description: 'Notificación flotante disparada vía useToast() (requiere ToastProvider, ya montado en App.tsx).',
        importPath: '@/components/ui/toast-context',
        code: `const { showSuccess } = useToast()\nshowSuccess('Guardado correctamente')`,
        Demo: ToastDemo,
      },
    ],
  },
  {
    id: 'navigation',
    title: 'Navigation',
    entries: [
      {
        id: 'tabs',
        name: 'Tabs',
        description: 'Navegación por pestañas con panel de contenido asociado (TabPanel).',
        importPath: '@/components/ui/tabs',
        code: `<Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />\n<TabPanel id="resumen" activeTab={activeTab}>…</TabPanel>`,
        Demo: TabsDemo,
      },
      {
        id: 'breadcrumbs',
        name: 'Breadcrumbs',
        description: 'Ruta de navegación; se auto-genera desde la URL actual o acepta items explícitos.',
        importPath: '@/components/ui/breadcrumbs',
        code: `<Breadcrumbs items={[{ label: 'Inventario', path: '/inventory' }]} />`,
        Demo: BreadcrumbsDemo,
      },
      {
        id: 'dropdown-menu',
        name: 'DropdownMenu',
        description: 'Menú desplegable compuesto (Trigger/Content/Item/Separator).',
        importPath: '@/components/ui/dropdown-menu',
        code: `<DropdownMenu>\n  <DropdownMenuTrigger onClick={() => setOpen(!open)}>Acciones</DropdownMenuTrigger>\n  <DropdownMenuContent open={open}>\n    <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>\n  </DropdownMenuContent>\n</DropdownMenu>`,
        Demo: DropdownMenuDemo,
      },
      {
        id: 'logo',
        name: 'Logo',
        description: 'Marca de SushiGo en tres formatos: circular grande (Logo), circular pequeño (LogoIcon) y horizontal (LogoFull).',
        importPath: '@/components/ui/logo',
        code: `<LogoIcon />\n<LogoFull height={32} />`,
        Demo: LogoDemo,
      },
    ],
  },
  {
    id: 'overlays',
    title: 'Overlays',
    entries: [
      {
        id: 'confirm-dialog',
        name: 'ConfirmDialog',
        description: 'Diálogo de confirmación modal con variantes danger/warning/info.',
        importPath: '@/components/ui/confirm-dialog',
        code: `<ConfirmDialog\n  isOpen={open}\n  onClose={() => setOpen(false)}\n  onConfirm={handleDelete}\n  title="¿Eliminar este registro?"\n  variant="danger"\n/>`,
        Demo: ConfirmDialogDemo,
      },
      {
        id: 'slide-panel',
        name: 'SlidePanel',
        description: 'Panel lateral deslizante para formularios o detalle, con Header/Body/Footer.',
        importPath: '@/components/ui/slide-panel',
        code: `<SlidePanel isOpen={open} onClose={() => setOpen(false)} title="Detalle" size="sm">\n  {/* contenido */}\n</SlidePanel>`,
        Demo: SlidePanelDemo,
      },
    ],
  },
  {
    id: 'data-display',
    title: 'Data Display',
    entries: [
      {
        id: 'data-grid',
        name: 'DataGrid',
        description: 'Tabla con columnas configurables, ordenamiento, paginación y skeletons de carga.',
        importPath: '@/components/ui/data-grid',
        code: `<DataGrid data={rows} columns={columns} pagination={{ currentPage, totalPages, onPageChange }} />`,
        Demo: DataGridDemo,
      },
    ],
  },
  {
    id: 'media',
    title: 'Media',
    entries: [
      {
        id: 'media-gallery-uploader',
        name: 'MediaGalleryUploader',
        description: 'Subida de fotos/video con drag-and-drop, miniaturas, reordenar, marcar principal y eliminar — envuelve el flujo upload-first/attach-on-save del sistema de media (#377). Item es el primer adoptante (#378); Employee/Dish le siguen con la misma forma.',
        importPath: '@/components/media',
        code: `<MediaGalleryUploader\n  context="item"\n  disabled={isSubmitting}\n  onChange={(galleryId, ownerToken) => {\n    setValue('media_gallery_id', galleryId)\n    setValue('owner_token', ownerToken)\n  }}\n  onBusyChange={setIsUploaderBusy}\n/>`,
        note: 'No se renderiza en vivo aquí: a diferencia de los demás demos de esta página, cada subida hace un POST real a /media/upload contra el backend (igual que RestDayPicker arriba) — mostrarlo en vivo rompería la premisa de este catálogo de no tener efectos secundarios. Pruébalo end-to-end en Inventario → Items → Item Rápido (solo al crear un ítem nuevo, no al editar uno existente — ver el Known Limitation en doc/architecture/media/media-architecture.en.md §9).',
      },
    ],
  },
]
