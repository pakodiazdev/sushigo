import { createContext, useContext, useState, type ReactNode } from 'react';

interface SidebarContextType {
    isCollapsed: boolean;
    isMobileOpen: boolean;
    toggleSidebar: () => void;
    toggleMobileSidebar: () => void;
    closeMobileSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

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

export function useSidebar(): SidebarContextType {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within SidebarProvider');
    }
    return context;
}
