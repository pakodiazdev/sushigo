import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { SidebarContext } from '@/contexts/sidebar-context';

interface SidebarProviderProps {
    children: ReactNode;
}

export function SidebarProvider({ children }: Readonly<SidebarProviderProps>) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const toggleSidebar = useCallback(() => setIsCollapsed(prev => !prev), []);
    const toggleMobileSidebar = useCallback(() => setIsMobileOpen(prev => !prev), []);
    const closeMobileSidebar = useCallback(() => setIsMobileOpen(false), []);

    const value = useMemo(
        () => ({
            isCollapsed,
            isMobileOpen,
            toggleSidebar,
            toggleMobileSidebar,
            closeMobileSidebar
        }),
        [isCollapsed, isMobileOpen, toggleSidebar, toggleMobileSidebar, closeMobileSidebar]
    );

    return (
        <SidebarContext.Provider value={value}>
            {children}
        </SidebarContext.Provider>
    );
}
