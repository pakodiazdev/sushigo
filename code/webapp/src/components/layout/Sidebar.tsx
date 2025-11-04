import {
    LayoutDashboard,
    Package,
    Users,
    ShoppingCart,
    BarChart3,
    Settings,
    ChevronLeft,
    ChevronRight,
    X,
    type LucideIcon
} from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import { Link, useRouterState } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';

interface MenuItem {
    icon: LucideIcon;
    label: string;
    path: string;
}

const menuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Package, label: 'Productos', path: '/productos' },
    { icon: ShoppingCart, label: 'Órdenes', path: '/ordenes' },
    { icon: Users, label: 'Clientes', path: '/clientes' },
    { icon: BarChart3, label: 'Reportes', path: '/reportes' },
    { icon: Settings, label: 'Configuración', path: '/configuracion' },
];

export default function Sidebar() {
    const { isCollapsed, isMobileOpen, toggleSidebar, closeMobileSidebar } = useSidebar();
    const router = useRouterState();
    const currentPath = router.location.pathname;

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={closeMobileSidebar}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed lg:sticky top-0 left-0 h-screen z-50 lg:z-30",
                    "bg-background border-r shadow-lg",
                    "transition-all duration-300 ease-in-out",
                    "w-64",
                    isCollapsed ? "lg:w-20" : "lg:w-64",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Logo Section - Sin separador */}
                    <div className="relative mb-4">
                        <Logo collapsed={isCollapsed} />

                        {/* Close button (mobile) - Posición absoluta */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={closeMobileSidebar}
                            className="lg:hidden absolute top-4 right-4"
                        >
                            <X className="h-5 w-5" />
                        </Button>

                        {/* Collapse button (desktop) - Solo cuando NO está colapsado */}
                        {!isCollapsed && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleSidebar}
                                className="hidden lg:flex absolute top-4 right-4"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                        )}
                    </div>

                    {/* Expand button when collapsed */}
                    {isCollapsed && (
                        <div className="flex justify-center mb-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleSidebar}
                                className="text-sushigo-navy dark:text-sushigo-cream"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </Button>
                        </div>
                    )}

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto px-3">
                        <ul className="space-y-1">
                            {menuItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = currentPath === item.path;

                                return (
                                    <li key={item.path}>
                                        <Link
                                            to={item.path}
                                            onClick={closeMobileSidebar}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2.5 rounded-lg",
                                                "transition-colors duration-200 font-medium",
                                                isCollapsed && "justify-center",
                                                isActive
                                                    ? "bg-primary text-primary-foreground"
                                                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                                            )}
                                        >
                                            <Icon className="h-5 w-5 shrink-0" />
                                            {!isCollapsed && <span>{item.label}</span>}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t">
                        {!isCollapsed ? (
                            <div className="text-xs text-muted-foreground">
                                <p>© 2025 SushiGo</p>
                                <p>v1.0.0</p>
                            </div>
                        ) : (
                            <div className="text-xs text-center text-muted-foreground">
                                <p>v1.0</p>
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
}
