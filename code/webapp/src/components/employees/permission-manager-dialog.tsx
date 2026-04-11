import { useState, useContext } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronRight, Loader2, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SlidePanelOverlayContext } from '@/components/ui/slide-panel'
import type { PermissionGroup, PermissionSource } from '@/types/user-permissions'

interface PermissionManagerDialogProps {
  isOpen: boolean
  onClose: () => void
  employeeName: string
  groups: PermissionGroup[]
  isLoading: boolean
  isSaving: boolean
  hasChanges: boolean
  isChecked: (name: string, source: PermissionSource) => boolean
  togglePermission: (name: string, source: PermissionSource) => void
  onSave: () => void
}

export function PermissionManagerDialog({
  isOpen,
  onClose,
  employeeName,
  groups,
  isLoading,
  isSaving,
  hasChanges,
  isChecked,
  togglePermission,
  onSave,
}: PermissionManagerDialogProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const slidePanelOverlay = useContext(SlidePanelOverlayContext)

  if (!isOpen) return null

  function toggleGroup(group: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return next
    })
  }

  function isGroupExpanded(group: string) {
    return expandedGroups.has(group)
  }

  const portalTarget = slidePanelOverlay?.current ?? document.body
  const positionClass = slidePanelOverlay?.current ? 'absolute' : 'fixed'

  const content = (
    <div className={`${positionClass} inset-0 z-[60] flex items-center justify-center`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => !isSaving && onClose()}
      />

      {/* Dialog */}
      <div
        className="relative z-10 flex w-full max-w-lg flex-col rounded-lg border border-border bg-background shadow-xl"
        style={{ maxHeight: '85vh' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="perm-dialog-title"
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-border px-6 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
            <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 id="perm-dialog-title" className="text-sm font-semibold text-foreground">
              Permisos directos — {employeeName}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Los permisos en gris son heredados del rol y no se pueden editar aquí.
              Puedes otorgar permisos adicionales de forma individual.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-1">
              {groups.map((group) => (
                <div key={group.group} className="rounded-md border border-border">
                  {/* Group header */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.group)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/50"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.group}
                    </span>
                    {isGroupExpanded(group.group) ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>

                  {/* Permissions list */}
                  {isGroupExpanded(group.group) && (
                    <div className="divide-y divide-border border-t border-border">
                      {group.permissions.map((permission) => {
                        const checked = isChecked(permission.name, permission.source)

                        return (
                          <label
                            key={permission.name}
                            className={`flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/30 ${
                              permission.source === 'role' ? 'cursor-default' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={permission.source === 'role'}
                              onChange={() => togglePermission(permission.name, permission.source)}
                              className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                            />
                            <span
                              className={`flex-1 text-sm ${
                                permission.source === 'role'
                                  ? 'text-muted-foreground'
                                  : 'text-foreground'
                              }`}
                            >
                              {permission.label}
                            </span>
                            {permission.source === 'role' && (
                              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                {permission.via_roles[0] ?? 'Rol'}
                              </span>
                            )}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <Button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={isSaving || !hasChanges}
            className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar cambios
          </Button>
        </div>
      </div>
    </div>
  )

  return createPortal(content, portalTarget)
}
