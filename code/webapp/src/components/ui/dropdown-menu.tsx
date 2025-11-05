import * as React from "react"
import { cn } from "@/lib/utils"

export interface DropdownMenuProps {
  children: React.ReactNode
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  return <div className="relative inline-block">{children}</div>
}

export interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

export function DropdownMenuTrigger({ children, className, ...props }: DropdownMenuTriggerProps) {
  return (
    <button
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      {children}
    </button>
  )
}

export interface DropdownMenuContentProps {
  children: React.ReactNode
  align?: 'left' | 'right'
  open?: boolean
}

export function DropdownMenuContent({ children, align = 'right', open }: DropdownMenuContentProps) {
  if (!open) return null

  return (
    <div
      className={cn(
        "absolute top-full mt-2 w-56 rounded-lg border bg-popover shadow-lg z-50",
        align === 'right' ? 'right-0' : 'left-0'
      )}
    >
      <div className="p-1">{children}</div>
    </div>
  )
}

export interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  icon?: React.ReactNode
}

export function DropdownMenuItem({ children, icon, className, ...props }: DropdownMenuItemProps) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm",
        "hover:bg-accent hover:text-accent-foreground",
        "transition-colors cursor-pointer",
        className
      )}
      {...props}
    >
      {icon && <span className="h-4 w-4">{icon}</span>}
      <span>{children}</span>
    </button>
  )
}

export function DropdownMenuSeparator() {
  return <div className="my-1 h-px bg-border" />
}
