import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Camera } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/toast-context'
import { AvatarCropDialog } from '@/components/media/avatar-crop-dialog'
import { MEDIA_CONTEXT_EXTENSIONS, mediaContextAccept, validateFile } from '@/lib/media-validation'
import { usePerfilPage } from './use-perfil'

// No beforeLoad guard: Layout already redirects unauthenticated users to
// /login, and every authenticated user — regardless of role — may set their
// own avatar (#420).
export const Route = createFileRoute('/perfil')({
  component: PerfilPage,
})

export function PerfilPage() {
  const { displayName, email, avatarUrl, isLoadingEmployee } = usePerfilPage()
  const { showError } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }
    const validationError = validateFile(file, MEDIA_CONTEXT_EXTENSIONS.avatar)
    if (validationError) {
      showError(validationError, 'Error')
      return
    }
    setSelectedFile(file)
  }

  return (
    <PageContainer>
      <PageHeader title="Mi perfil" description="Actualiza tu foto de perfil" />

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <button
              type="button"
              data-testid="avatar-edit-trigger"
              aria-label="Cambiar foto de perfil"
              className="group relative shrink-0 rounded-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoadingEmployee}
            >
              <Avatar name={displayName} imageUrl={avatarUrl} size="lg" />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground">
                <Camera className="h-2.5 w-2.5" />
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={mediaContextAccept('avatar')}
              className="hidden"
              data-testid="avatar-file-input"
              onChange={handleFileSelected}
            />
            <div className="flex-1 space-y-1">
              <p className="font-medium text-foreground">{displayName}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AvatarCropDialog isOpen={selectedFile !== null} file={selectedFile} onClose={() => setSelectedFile(null)} />
    </PageContainer>
  )
}
