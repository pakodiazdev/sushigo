import { cn } from '@/lib/utils';
import logoImage from '@/assets/sushigo-logo.png';

interface LogoProps {
    className?: string;
    collapsed?: boolean;
    showText?: boolean;
}

export function Logo({ className, collapsed = false }: LogoProps) {
    if (collapsed) {
        return (
            <div className={cn(
                "w-full h-20 flex items-center justify-center",
                "transition-all", // Sin fondo morado, usa el fondo común
                className
            )}>
                <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center p-1.5 shadow-md bg-sushigo-navy">
                    <img
                        src={logoImage}
                        alt="SushiGo Logo"
                        className="w-full h-full object-contain"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className={cn("flex items-center justify-center py-6", className)}>
            {/* Logo Image - Circular con fondo morado más grande y centrado */}
            <div className={cn(
                "w-24 h-24 rounded-full overflow-hidden flex-shrink-0",
                "flex items-center justify-center p-2",
                "shadow-lg hover:shadow-xl transition-all hover:scale-105",
                "bg-sushigo-navy" // Fondo morado (#474687) del logo original
            )}>
                <img
                    src={logoImage}
                    alt="SushiGo Logo"
                    className="w-full h-full object-contain"
                />
            </div>
        </div>
    );
}

interface LogoIconProps {
    className?: string;
}

export function LogoIcon({ className }: LogoIconProps) {
    return (
        <div className={cn(
            "w-10 h-10 rounded-full overflow-hidden",
            "flex items-center justify-center p-1",
            "shadow-md hover:shadow-lg transition-all hover:scale-105",
            "bg-sushigo-navy",
            className
        )}>
            <img
                src={logoImage}
                alt="SushiGo"
                className="w-full h-full object-contain"
            />
        </div>
    );
}

interface LogoFullProps {
    className?: string;
    height?: number;
}

// Versión horizontal del logo (imagen completa sin círculo)
export function LogoFull({ className, height = 40 }: LogoFullProps) {
    return (
        <div className={cn("flex items-center", className)}>
            <img
                src={logoImage}
                alt="SushiGo"
                style={{ height: `${height}px`, width: 'auto' }}
                className="object-contain"
            />
        </div>
    );
}
