import { useState, type ReactNode } from 'react';
import { SidebarContext } from '@/contexts/sidebar-context';

interface SidebarProviderProps {
    children: ReactNode;
}

export function SidebarProvider({ children }: SidebarProviderProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const toggleSidebar = () => setIsCollapsed(prev => !prev);
    const toggleMobileSidebar = () => setIsMobileOpen(prev => !prev);
    const closeMobileSidebar = () => setIsMobileOpen(false);

    return (
        <SidebarContext.Provider
            value={{
                isCollapsed,
                isMobileOpen,
                toggleSidebar,
                toggleMobileSidebar,
                closeMobileSidebar
            }}
        >
            {children}
        </SidebarContext.Provider>
    );
}
