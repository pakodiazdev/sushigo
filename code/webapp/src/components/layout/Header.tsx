import { Menu, Moon, Sun, Bell, Search, User, LogOut, Settings, UserCircle, ChevronDown } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from '@tanstack/react-router';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import logoImage from '@/assets/sushigo-logo.png';
import { useState, useRef, useEffect } from 'react';

export default function Header() {
    const { theme, toggleTheme } = useTheme();
    const { toggleMobileSidebar } = useSidebar();
    const { user } = useAuthStore();
    const router = useRouter();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const desktopMenuRef = useRef<HTMLDivElement>(null);

    const handleLogout = () => {
        setIsUserMenuOpen(false);
        router.navigate({ to: '/logout' });
    };

    // Cerrar menú al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const clickedOutsideMobile = mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node);
            const clickedOutsideDesktop = desktopMenuRef.current && !desktopMenuRef.current.contains(event.target as Node);

            if (clickedOutsideMobile && clickedOutsideDesktop) {
                setIsUserMenuOpen(false);
            }
        };

        if (isUserMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isUserMenuOpen]);

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

                    {/* User profile - Mobile/Tablet */}
                    <div className="lg:hidden" ref={mobileMenuRef}>
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                className="flex items-center gap-2 px-2 py-1.5 md:px-3 md:py-2 rounded-lg hover:bg-sushigo-cream/10 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sushigo-cream to-sushigo-cream/80 flex items-center justify-center text-sushigo-navy shadow-sm">
                                    <User className="h-4 w-4" />
                                </div>
                                {/* Mostrar nombre en tablet (md) y ocultar en móvil pequeño */}
                                <span className="hidden md:inline-block font-medium text-sushigo-cream">{user?.name || 'Usuario'}</span>
                                <ChevronDown className="hidden md:block h-4 w-4 text-sushigo-cream/80" />
                            </DropdownMenuTrigger>

                            <DropdownMenuContent open={isUserMenuOpen} align="right">
                                <div className="px-3 py-2 border-b">
                                    <p className="font-medium text-sm">{user?.name || 'Usuario'}</p>
                                    <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
                                </div>

                                <DropdownMenuItem
                                    icon={<UserCircle className="h-4 w-4" />}
                                    onClick={() => {
                                        setIsUserMenuOpen(false);
                                        router.navigate({ to: '/Configuracion' });
                                    }}
                                >
                                    Mi Perfil
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                    icon={<Settings className="h-4 w-4" />}
                                    onClick={() => {
                                        setIsUserMenuOpen(false);
                                        router.navigate({ to: '/Configuracion' });
                                    }}
                                >
                                    Configuración
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                    icon={<LogOut className="h-4 w-4" />}
                                    onClick={handleLogout}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    Cerrar Sesión
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* User profile - Desktop only */}
                    <div className="hidden lg:flex items-center gap-2" ref={desktopMenuRef}>
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors"
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sushigo-navy to-sushigo-navy/80 flex items-center justify-center text-sushigo-cream shadow-sm">
                                    <User className="h-4 w-4" />
                                </div>
                                <span className="font-medium">{user?.name || 'Usuario'}</span>
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            </DropdownMenuTrigger>

                            <DropdownMenuContent open={isUserMenuOpen} align="right">
                                <DropdownMenuItem
                                    icon={<UserCircle className="h-4 w-4" />}
                                    onClick={() => {
                                        setIsUserMenuOpen(false);
                                        router.navigate({ to: '/Configuracion' });
                                    }}
                                >
                                    Mi Perfil
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                    icon={<Settings className="h-4 w-4" />}
                                    onClick={() => {
                                        setIsUserMenuOpen(false);
                                        router.navigate({ to: '/Configuracion' });
                                    }}
                                >
                                    Configuración
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                    icon={<LogOut className="h-4 w-4" />}
                                    onClick={handleLogout}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    Cerrar Sesión
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Botón de logout separado - visible en pantallas grandes */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleLogout}
                            title="Cerrar sesión"
                            className="text-foreground hover:bg-accent"
                        >
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
}
