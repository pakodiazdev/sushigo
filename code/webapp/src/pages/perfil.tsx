import { createFileRoute } from '@tanstack/react-router'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
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
    isUploaderBusy,
    setIsUploaderBusy,
    onAvatarChange,
    onAssetsChange,
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
              onChange={onAvatarChange}
              onBusyChange={setIsUploaderBusy}
              onAssetsChange={onAssetsChange}
            />
            {(isSaving || isUploaderBusy) && (
              <p className="mt-2 text-sm text-muted-foreground">Guardando...</p>
            )}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
