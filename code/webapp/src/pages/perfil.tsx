import { createFileRoute } from '@tanstack/react-router'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { MediaGalleryUploader } from '@/components/media/media-gallery-uploader'
import { usePerfilPage } from './use-perfil'

// No beforeLoad guard: Layout already redirects unauthenticated users to
// /login, and every authenticated user — regardless of role — may set their
// own avatar (#420).
export const Route = createFileRoute('/perfil')({
  component: PerfilPage,
})

export function PerfilPage() {
  const {
    displayName,
    email,
    avatarUrl,
    initialGalleryId,
    initialAssets,
    isUploaderBusy,
    setIsUploaderBusy,
    onAvatarChange,
    onAssetsChange,
    attachFailed,
    retryAttach,
    isSaving,
  } = usePerfilPage()

  return (
    <PageContainer>
      <PageHeader title="Mi perfil" description="Actualiza tu foto de perfil" />

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar name={displayName} imageUrl={avatarUrl} size="lg" />
            <div className="flex-1 space-y-1">
              <p className="font-medium text-foreground">{displayName}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
          </div>

          <div className="mt-6">
            <MediaGalleryUploader
              context="avatar"
              label="Foto de perfil"
              disabled={isSaving}
              initialGalleryId={initialGalleryId}
              initialAssets={initialAssets}
              onChange={onAvatarChange}
              onBusyChange={setIsUploaderBusy}
              onAssetsChange={onAssetsChange}
            />
            {(isSaving || isUploaderBusy) && (
              <p className="mt-2 text-sm text-muted-foreground">Guardando...</p>
            )}
            {attachFailed && (
              <div className="mt-2 flex items-center justify-between rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
                <span>No se pudo guardar tu nueva foto de perfil.</span>
                <Button type="button" variant="outline" size="sm" onClick={retryAttach} disabled={isSaving}>
                  Reintentar
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
