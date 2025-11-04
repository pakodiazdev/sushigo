import { Menu, Moon, Sun, Bell, Search, User } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import logoImage from '@/assets/sushigo-logo.png';

export default function Header() {
    const { theme, toggleTheme } = useTheme();
    const { toggleMobileSidebar, toggleSidebar } = useSidebar();

    return (
        <header className="sticky top-0 z-40 border-b shadow-sm bg-sushigo-navy lg:bg-background">
            <div className="flex items-center justify-between h-16 px-4 lg:px-6">
                {/* Left Section */}
                <div className="flex items-center gap-3">
                    {/* Mobile/Tablet Menu Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleMobileSidebar}
                        className="lg:hidden text-sushigo-cream hover:bg-sushigo-cream/10"
                    >
                        <Menu className="h-6 w-6" />
                    </Button>

                    {/* Logo completo en móvil y tablet sin círculo */}
                    <div className="lg:hidden flex items-center h-10">
                        <img
                            src={logoImage}
                            alt="SushiGo"
                            className="h-full w-auto object-contain"
                        />
                    </div>

                    {/* Desktop Sidebar Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSidebar}
                        className="hidden lg:flex"
                    >
                        <Menu className="h-5 w-5" />
                    </Button>

                    {/* Search Bar - Visible desde tablet */}
                    <div className="hidden md:block relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sushigo-cream lg:text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Buscar..."
                            className="pl-9 w-64 bg-sushigo-cream/10 border-sushigo-cream/20 text-sushigo-cream placeholder:text-sushigo-cream/60 lg:bg-card lg:border-input lg:text-foreground lg:placeholder:text-muted-foreground"
                        />
                    </div>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-2">
                    {/* Search Button (Mobile only) */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden text-sushigo-cream hover:bg-sushigo-cream/10"
                    >
                        <Search className="h-5 w-5" />
                    </Button>

                    {/* Notifications */}
                    <Button variant="ghost" size="icon" className="relative text-sushigo-cream lg:text-foreground hover:bg-sushigo-cream/10 lg:hover:bg-accent">
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-sushigo-coral" />
                    </Button>

                    {/* Theme Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleTheme}
                        className="text-sushigo-cream lg:text-foreground hover:bg-sushigo-cream/10 lg:hover:bg-accent"
                    >
                        {theme === 'light' ? (
                            <Moon className="h-5 w-5" />
                        ) : (
                            <Sun className="h-5 w-5" />
                        )}
                    </Button>

                    {/* User profile - Desktop only */}
                    <Button variant="ghost" className="gap-2 hidden lg:flex">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sushigo-navy to-sushigo-navy/80 flex items-center justify-center text-sushigo-cream shadow-sm">
                            <User className="h-4 w-4" />
                        </div>
                        <span className="font-medium">Admin</span>
                    </Button>
                </div>
            </div>
        </header>
    );
}
