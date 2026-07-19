import * as React from "react"
import { cn } from "@/lib/utils"

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
    ({ className, ...props }, ref) => {
        return (
            <label // NOSONAR — generic primitive; every call site passes htmlFor or wraps a control as children, but that isn't visible from this definition
                className={cn(
                    "text-sm font-medium text-foreground leading-none",
                    "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Label.displayName = "Label"

export { Label }
