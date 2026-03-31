import { useEffect, useState } from 'react'

export function animCls(animating: 'enter' | 'exit' | null, enterVal: string, exitVal: string): string {
  if (animating === 'enter') return enterVal
  if (animating === 'exit') return exitVal
  return ''
}

export function useDialogAnimation(isOpen: boolean, close: () => void) {
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState<'enter' | 'exit' | null>(null)

  useEffect(() => {
    if (isOpen) {
      setVisible(true)
      document.body.style.overflow = 'hidden'
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimating('enter')))
    } else if (visible) {
      setAnimating('exit')
      document.body.style.overflow = ''
      const timer = setTimeout(() => { setVisible(false); setAnimating(null) }, 200)
      return () => clearTimeout(timer)
    }
  }, [isOpen, visible])

  useEffect(() => { return () => { document.body.style.overflow = '' } }, [])

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) close() }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [isOpen, close])

  const backdropCls = animCls(animating, 'animate-dialog-backdrop-in', 'animate-dialog-backdrop-out')
  const panelCls    = animCls(animating, 'animate-dialog-in', 'animate-dialog-out')

  return { visible, backdropCls, panelCls }
}
