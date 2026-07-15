import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?:
        | "default"
        | "destructive"
        | "outline"
        | "outline-danger"
        | "outline-warning"
        | "secondary"
        | "neutral"
        | "neutral-dark"
        | "info"
        | "warning"
        | "success"
        | "ghost"
        | "ghost-danger"
        | "link"
    size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", ...props }, ref) => {
        const variants = {
            default: "bg-primary text-primary-foreground hover:bg-primary/90",
            destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            outline:
                "border border-muted-foreground/40 bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:border-muted-foreground/50 dark:hover:bg-muted/60",
            "outline-danger":
                "border border-red-300 bg-background text-red-700 hover:bg-red-50 hover:text-red-700 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300",
            "outline-warning":
                "border border-yellow-300 bg-background text-yellow-700 hover:bg-yellow-50 hover:text-yellow-700 dark:border-yellow-700 dark:text-yellow-400 dark:hover:bg-yellow-950/30 dark:hover:text-yellow-300",
            secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            neutral:
                "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600",
            "neutral-dark": "bg-gray-600 text-white hover:bg-gray-700",
            info: "bg-blue-600 text-white hover:bg-blue-700",
            warning: "bg-amber-600 text-white hover:bg-amber-700",
            success: "bg-green-600 text-white hover:bg-green-700",
            ghost: "hover:bg-accent hover:text-accent-foreground",
            "ghost-danger":
                "text-red-400 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300",
            link: "text-primary underline-offset-4 hover:underline",
        }

        const sizes = {
            default: "h-10 px-4 py-2",
            sm: "h-9 rounded-md px-3",
            lg: "h-11 rounded-md px-8",
            icon: "h-10 w-10",
        }

        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                    variants[variant],
                    sizes[size],
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
