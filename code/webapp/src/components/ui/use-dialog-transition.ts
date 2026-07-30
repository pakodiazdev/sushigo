import { useEffect, useState } from 'react'

export type DialogAnimationPhase = 'enter' | 'exit' | null

export function animCls(animating: DialogAnimationPhase, enterVal: string, exitVal: string): string {
  if (animating === 'enter') return enterVal
  if (animating === 'exit') return exitVal
  return ''
}

export interface UseDialogTransitionOptions {
  /** Called when Escape is pressed while the dialog is open. Omit to disable Escape handling. */
  onEscape?: () => void
  /** Called once the exit animation finishes and the dialog has fully unmounted. */
  onExitComplete?: () => void
  /** Lock body scroll while the dialog is open (default false — only needed for full-viewport dialogs). */
  lockScroll?: boolean
  /** Exit animation duration in ms, must match the CSS keyframe duration. */
  exitDurationMs?: number
  /**
   * Register the Escape listener on the capture phase and call
   * `stopImmediatePropagation()` while this dialog is visible, so a parent
   * dialog's own Escape handler does not also fire when this one is nested
   * inside it (e.g. OverrideScopeDialog inside ScheduleDialog).
   * Default false.
   */
  stopEscapePropagation?: boolean
}

/**
 * Shared enter/exit transition state machine for centered/portal dialogs
 * (fade + scale via `animate-dialog-*` classes in index.css).
 */
export function useDialogTransition(isOpen: boolean, options: UseDialogTransitionOptions = {}) {
  const { onEscape, onExitComplete, lockScroll = false, exitDurationMs = 200, stopEscapePropagation = false } = options
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState<DialogAnimationPhase>(null)

  useEffect(() => {
    if (isOpen) {
      setVisible(true)
      if (lockScroll) document.body.style.overflow = 'hidden'
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimating('enter')))
    } else if (visible) {
      setAnimating('exit')
      if (lockScroll) document.body.style.overflow = 'unset'
      const timer = setTimeout(() => {
        setVisible(false)
        setAnimating(null)
        onExitComplete?.()
      }, exitDurationMs)
      return () => clearTimeout(timer)
    }
  }, [isOpen, visible, lockScroll, exitDurationMs, onExitComplete])

  useEffect(() => {
    if (!lockScroll) return
    return () => { document.body.style.overflow = 'unset' }
  }, [lockScroll])

  useEffect(() => {
    if (!onEscape) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (stopEscapePropagation && visible) e.stopImmediatePropagation()
      if (isOpen) onEscape()
    }
    document.addEventListener('keydown', handleEscape, stopEscapePropagation)
    return () => document.removeEventListener('keydown', handleEscape, stopEscapePropagation)
  }, [isOpen, visible, onEscape, stopEscapePropagation])

  const backdropCls = animCls(animating, 'animate-dialog-backdrop-in', 'animate-dialog-backdrop-out')
  const panelCls = animCls(animating, 'animate-dialog-in', 'animate-dialog-out')

  return { visible, backdropCls, panelCls }
}
