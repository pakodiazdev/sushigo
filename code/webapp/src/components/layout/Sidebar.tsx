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
    Warehouse,
    ChevronDown,
    ChevronUp,
    type LucideIcon
} from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import { Link, useRouterState } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface SubMenuItem {
    label: string;
    path: string;
}

interface MenuItem {
    icon: LucideIcon;
    label: string;
    path?: string;
    subItems?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Package, label: 'Productos', path: '/productos' },
    { icon: ShoppingCart, label: 'Órdenes', path: '/ordenes' },
    { icon: Users, label: 'Clientes', path: '/clientes' },
    { 
        icon: Warehouse, 
        label: 'Inventario',
        subItems: [
            { label: 'Ubicaciones', path: '/inventory/locations' },
            { label: 'Items', path: '/inventory/items' },
            { label: 'Variantes', path: '/inventory/item-variants' },
        ]
    },
    { icon: BarChart3, label: 'Reportes', path: '/reportes' },
    { icon: Settings, label: 'Configuración', path: '/configuracion' },
];

export default function Sidebar() {
    const { isCollapsed, isMobileOpen, toggleSidebar, closeMobileSidebar } = useSidebar();
    const router = useRouterState();
    const currentPath = router.location.pathname;
    const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

    const toggleSubmenu = (label: string) => {
        setExpandedMenus(prev => 
            prev.includes(label) 
                ? prev.filter(item => item !== label)
                : [...prev, label]
        );
    };

    const isSubmenuExpanded = (label: string) => expandedMenus.includes(label);
    
    const isMenuItemActive = (item: MenuItem) => {
        if (item.path) {
            return currentPath === item.path;
        }
        if (item.subItems) {
            return item.subItems.some(subItem => currentPath === subItem.path);
        }
        return false;
    };

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
                                const hasSubItems = item.subItems && item.subItems.length > 0;
                                const isExpanded = isSubmenuExpanded(item.label);
                                const isActive = isMenuItemActive(item);

                                return (
                                    <li key={item.label}>
                                        {/* Main menu item */}
                                        {item.path ? (
                                            // Regular link
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
                                        ) : (
                                            // Menu with submenu
                                            <>
                                                <button
                                                    onClick={() => !isCollapsed && toggleSubmenu(item.label)}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg",
                                                        "transition-colors duration-200 font-medium",
                                                        isCollapsed && "justify-center",
                                                        isActive
                                                            ? "bg-primary/10 text-primary"
                                                            : "text-foreground hover:bg-accent hover:text-accent-foreground"
                                                    )}
                                                >
                                                    <Icon className="h-5 w-5 shrink-0" />
                                                    {!isCollapsed && (
                                                        <>
                                                            <span className="flex-1 text-left">{item.label}</span>
                                                            {hasSubItems && (
                                                                isExpanded ? (
                                                                    <ChevronUp className="h-4 w-4" />
                                                                ) : (
                                                                    <ChevronDown className="h-4 w-4" />
                                                                )
                                                            )}
                                                        </>
                                                    )}
                                                </button>

                                                {/* Submenu items */}
                                                {hasSubItems && !isCollapsed && isExpanded && (
                                                    <ul className="mt-1 ml-8 space-y-1">
                                                        {item.subItems!.map((subItem) => {
                                                            const isSubActive = currentPath === subItem.path;
                                                            return (
                                                                <li key={subItem.path}>
                                                                    <Link
                                                                        to={subItem.path}
                                                                        onClick={closeMobileSidebar}
                                                                        className={cn(
                                                                            "block px-3 py-2 rounded-lg text-sm",
                                                                            "transition-colors duration-200",
                                                                            isSubActive
                                                                                ? "bg-primary text-primary-foreground font-medium"
                                                                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                                                        )}
                                                                    >
                                                                        {subItem.label}
                                                                    </Link>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                )}
                                            </>
                                        )}
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
