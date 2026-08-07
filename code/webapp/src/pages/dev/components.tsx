import { createFileRoute } from '@tanstack/react-router'
import { requireDev } from '@/lib/route-guards'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { catalogSections, type CatalogEntry } from './-catalog-registry'

export const Route = createFileRoute('/dev/components')({
  beforeLoad: requireDev(),
  component: ComponentsCatalogPage,
})

function ComponentsCatalogPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Componentes"
        description="Catálogo de los componentes reutilizables (src/components/ui/ y otros paquetes de componentes compartidos, como src/components/media/). Solo visible en desarrollo (npm run dev)."
      />

      <p className="text-sm text-muted-foreground">
        Para documentar un componente nuevo, agrega una entrada en{' '}
        <code className="rounded bg-muted px-1.5 py-0.5">src/pages/dev/-catalog-registry.tsx</code>{' '}
        (a la sección que corresponda, o una nueva) — no hace falta tocar ningún otro archivo.
      </p>

      {catalogSections.map((section) => (
        <section key={section.id} className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {section.entries.map((entry) => (
              <ComponentCatalogCard key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </PageContainer>
  )
}

function ComponentCatalogCard({ entry }: Readonly<{ entry: CatalogEntry }>) {
  const { name, description, importPath, code, Demo, note } = entry

  return (
    <Card>
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <code className="block w-fit rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {importPath}
        </code>
      </CardHeader>
      <CardContent className="space-y-4">
        {Demo ? (
          <div className="rounded-md border border-dashed border-border p-4">
            <Demo />
          </div>
        ) : (
          <p className="text-sm italic text-muted-foreground">{note}</p>
        )}
        <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs text-foreground">
          <code>{code}</code>
        </pre>
      </CardContent>
    </Card>
  )
}
