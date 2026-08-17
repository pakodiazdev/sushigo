import { Loader2, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import Cropper from 'react-easy-crop'
import { Button } from '@/components/ui/button'
import { DialogFrame } from '@/components/ui/dialog-frame'
import { useDialogShell } from '@/components/ui/use-dialog-shell'
import { useAvatarCropDialog } from './use-avatar-crop-dialog'

export interface AvatarCropDialogProps {
  isOpen: boolean
  file: File | null
  onClose: () => void
}

// No extra close-time side effect is needed here (unlike form dialogs that reset
// react-hook-form state): useAvatarCropDialog's own effect already re-derives
// crop/zoom/croppedAreaPixels from `file` on every open, so nothing to clean up
// beyond what that effect's own cleanup already does.
const NO_OP = () => {}

export function AvatarCropDialog({ isOpen, file, onClose }: Readonly<AvatarCropDialogProps>) {
  const { imageSrc, crop, zoom, setCrop, setZoom, onCropComplete, isSaving, canSave, handleSave } =
    useAvatarCropDialog(file, onClose)

  const { visible, backdropCls, panelCls, close } = useDialogShell(isOpen, isSaving, NO_OP, onClose)

  if (!visible) return null

  const content = (
    <DialogFrame
      backdropCls={backdropCls}
      panelCls={panelCls}
      dialogId="avatar-crop-dialog-title"
      onBackdropClick={close}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-6 py-4">
        <h3 id="avatar-crop-dialog-title" className="text-base font-semibold text-foreground">
          Ajustar foto de perfil
        </h3>
        <button
          type="button"
          onClick={close}
          disabled={isSaving}
          className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-6 py-5">
        {imageSrc && (
          <div
            data-testid="avatar-crop-dialog"
            className="relative h-72 w-full overflow-hidden rounded-md bg-muted"
          >
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            disabled={isSaving}
            className="w-full"
            aria-label="Zoom"
          />
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <Button type="button" variant="neutral" onClick={close} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !canSave}
            data-testid="avatar-crop-save"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </div>
      </div>
    </DialogFrame>
  )

  return createPortal(content, document.body)
}
