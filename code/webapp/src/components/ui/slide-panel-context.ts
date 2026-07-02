import { createContext } from 'react'

/**
 * Context that provides a portal target for overlay components (e.g. ConfirmDialog)
 * rendered inside a SlidePanel.  This lets them escape the content area's
 * `overflow-y-auto` clipping while staying visually contained to the panel.
 */
export const SlidePanelOverlayContext = createContext<React.RefObject<HTMLDivElement | null> | null>(null)
