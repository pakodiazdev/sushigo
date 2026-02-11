import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
    Users,
    ShoppingCart,
    DollarSign,
    ArrowUp,
    ArrowDown,
    Package,
    Plus,
    Calendar,
    Building2,
    Eye,
    type LucideIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { OpenSessionDialog, CreateAdjustmentDialog } from '@/components/cash';
import { useCashSessions } from '@/services/cash-hooks';
import { SessionStatusBadge, formatDate } from '@/components/cash/cash-utils';
import { formatCurrency } from '@/services/cash-balance-service';
import { useAuthStore } from '@/stores/auth.store';
import { SessionStatus, CashSession } from '@/types/cash';
import { cn } from '@/lib/utils';

// Route export moved to index.tsx

interface Stat {
    title: string;
    value: string;
    change: string;
    trending: 'up' | 'down';
    icon: LucideIcon;
    iconBg: string;
    iconColor: string;
}

interface Order {
    id: string;
    customer: string;
    items: number;
    total: string;
    status: 'completado' | 'pendiente' | 'en proceso';
}

interface DashboardData {
    stats: Stat[];
    recentOrders: Order[];
}

// Mock data - reemplazar con API real
const fetchDashboardData = async (): Promise<DashboardData> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
        stats: [
            {
                title: 'Ventas Totales',
                value: '$45,231',
                change: '+12.5%',
                trending: 'up' as const,
                icon: DollarSign,
                iconBg: 'bg-sushigo-coral/10',
                iconColor: 'text-sushigo-coral'
            },
            {
                title: 'Órdenes',
                value: '2,345',
                change: '+8.2%',
                trending: 'up' as const,
                icon: ShoppingCart,
                iconBg: 'bg-sushigo-navy/10',
                iconColor: 'text-sushigo-navy dark:text-sushigo-cream'
            },
            {
                title: 'Clientes',
                value: '1,234',
                change: '-2.4%',
                trending: 'down' as const,
                icon: Users,
                iconBg: 'bg-sushigo-wasabi/10',
                iconColor: 'text-sushigo-wasabi'
            },
            {
                title: 'Productos',
                value: '89',
                change: '+5.0%',
                trending: 'up' as const,
                icon: Package,
                iconBg: 'bg-sushigo-ginger/10',
                iconColor: 'text-sushigo-ginger'
            },
        ],
        recentOrders: [
            { id: '001', customer: 'Juan Pérez', items: 3, total: '$125.50', status: 'completado' as const },
            { id: '002', customer: 'María García', items: 5, total: '$234.00', status: 'pendiente' as const },
            { id: '003', customer: 'Carlos López', items: 2, total: '$89.99', status: 'completado' as const },
            { id: '004', customer: 'Ana Martínez', items: 4, total: '$156.75', status: 'en proceso' as const },
            { id: '005', customer: 'Luis Rodríguez', items: 1, total: '$45.00', status: 'completado' as const },
        ]
    };
};

function StatCard({ stat }: { stat: Stat }) {
    const Icon = stat.icon;
    const isPositive = stat.trending === 'up';

    return (
        <Card className="hover:shadow-xl hover:scale-105 transition-all duration-300 border-sushigo-cream/50 bg-gradient-to-br from-card to-sushigo-cream/20">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className={cn("p-3 rounded-xl shadow-sm", stat.iconBg)}>
                        <Icon className={cn("h-6 w-6", stat.iconColor)} />
                    </div>
                    <div className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm",
                        isPositive
                            ? "bg-sushigo-wasabi/10 text-sushigo-wasabi"
                            : "bg-sushigo-coral/10 text-sushigo-coral"
                    )}>
                        {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        {stat.change}
                    </div>
                </div>
                <h3 className="text-sm font-medium text-sushigo-gray dark:text-muted-foreground mb-1">
                    {stat.title}
                </h3>
                <p className="text-2xl font-bold text-sushigo-navy dark:text-sushigo-cream">
                    {stat.value}
                </p>
            </CardContent>
        </Card>
    );
}

function SessionCard({ session, onRegisterAdjustment }: { session: CashSession; onRegisterAdjustment: (id: number) => void }) {
    // Usar el current_balance que viene directamente de la sesión (calculado en el backend)
    const currentBalance = session.current_balance || session.opening_balance || '0.00';

    return (
        <div className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/50 transition-colors">
            <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold">
                        {session.cash_register?.name || `Caja #${session.cash_register_id}`}
                    </h3>
                    <SessionStatusBadge status={session.status} />
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(session.operating_date)}
                    </span>
                    {session.cash_register?.branch && (
                        <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {session.cash_register.branch.name}
                        </span>
                    )}
                    <span className="text-xs">
                        Fondo: {formatCurrency(session.opening_balance || '0')}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="text-right">
                    <p className="text-muted-foreground text-xs">Saldo Actual</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(currentBalance)}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { }/* TODO: Navigate to session detail */}
                    >
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalles
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => onRegisterAdjustment(session.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Registrar Ajuste
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const navigate = useNavigate();
    const { currentBranch } = useAuthStore();
    const [isOpenSessionDialogOpen, setIsOpenSessionDialogOpen] = useState(false);
    const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
    const [selectedSessionId, setSelectedSessionId] = useState<number | undefined>(undefined);

    const { data, isLoading, error } = useQuery({
        queryKey: ['dashboard'],
        queryFn: fetchDashboardData,
    });

    // Fetch open cash sessions (DRAFT status)
    const { data: sessionsData, isLoading: loadingSessions } = useCashSessions({
        status: SessionStatus.DRAFT
    });

    const handleOpenSession = () => {
        setIsOpenSessionDialogOpen(true);
    };

    const handleSessionSuccess = (sessionId: number) => {
        console.log('Sesión creada:', sessionId);
        alert('¡Sesión de caja abierta exitosamente!');
    };

    const handleCreateAdjustment = (sessionId?: number) => {
        setSelectedSessionId(sessionId);
        setIsAdjustmentDialogOpen(true);
    };

    const handleAdjustmentSuccess = () => {
        console.log('Ajuste creado exitosamente');
    };

    const handleCloseAdjustment = () => {
        setIsAdjustmentDialogOpen(false);
        setSelectedSessionId(undefined);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Cargando...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <Card className="border-destructive">
                    <CardContent className="p-6">
                        <p className="text-destructive">Error al cargar los datos</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const getStatusStyles = (status: Order['status']): string => {
        switch (status) {
            case 'completado':
                return 'bg-sushigo-wasabi/10 text-sushigo-wasabi border border-sushigo-wasabi/20';
            case 'pendiente':
                return 'bg-sushigo-ginger/10 text-sushigo-ginger border border-sushigo-ginger/20';
            case 'en proceso':
                return 'bg-sushigo-coral/10 text-sushigo-coral border border-sushigo-coral/20';
            default:
                return 'bg-sushigo-gray/10 text-sushigo-gray border border-sushigo-gray/20';
        }
    };

    if (!data) return null;

    return (
        <PageContainer>
            <PageHeader
                title="Dashboard"
                description="Bienvenido de nuevo! Aquí está tu resumen de hoy."
            />

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {data.stats.map((stat, index) => (
                    <StatCard key={index} stat={stat} />
                ))}
            </div>

            {/* Quick Actions */}
            <Card className="border-sushigo-cream/50 bg-gradient-to-br from-card to-green-50 dark:to-green-950/20">
                <CardHeader className="bg-gradient-to-r from-green-500/5 to-transparent">
                    <CardTitle className="text-sushigo-navy dark:text-sushigo-cream flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        Acciones Rápidas
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                    <Button
                        onClick={handleOpenSession}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Abrir Sesión de Caja
                    </Button>
                    <Button
                        onClick={() => handleCreateAdjustment()}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={!sessionsData?.data || sessionsData.data.length === 0}
                    >
                        <DollarSign className="mr-2 h-4 w-4" />
                        Registrar Ajuste
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => navigate({ to: '/cash/registers' })}
                    >
                        Ver Cajas Registradoras
                    </Button>
                </CardContent>
            </Card>

            {/* Open Cash Sessions */}
            <Card className="border-sushigo-cream/50 bg-gradient-to-br from-card to-sushigo-cream/10">
                <CardHeader className="bg-gradient-to-r from-sushigo-navy/5 to-transparent">
                    <CardTitle className="text-sushigo-navy dark:text-sushigo-cream flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Sesiones de Caja Abiertas
                        </span>
                        {sessionsData?.data && (
                            <span className="text-sm font-normal text-muted-foreground">
                                {sessionsData.data.length} {sessionsData.data.length === 1 ? 'sesión' : 'sesiones'}
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingSessions ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="text-center">
                                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">Cargando sesiones...</p>
                            </div>
                        </div>
                    ) : sessionsData?.data && sessionsData.data.length > 0 ? (
                        <div className="space-y-3">
                            {sessionsData.data.map((session) => (
                                <SessionCard
                                    key={session.id}
                                    session={session}
                                    onRegisterAdjustment={handleCreateAdjustment}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <DollarSign className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                            <p className="text-sm text-muted-foreground mb-1">
                                No hay sesiones de caja abiertas
                            </p>
                            <p className="text-xs text-muted-foreground mb-4">
                                Abre una nueva sesión para comenzar las operaciones del día
                            </p>
                            <Button
                                onClick={handleOpenSession}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Abrir Sesión
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Recent Orders */}
            <Card className="border-sushigo-cream/50 bg-gradient-to-br from-card to-sushigo-cream/10">
                <CardHeader className="bg-gradient-to-r from-sushigo-navy/5 to-transparent">
                    <CardTitle className="text-sushigo-navy dark:text-sushigo-cream">Órdenes Recientes</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                                        ID
                                    </th>
                                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                                        Cliente
                                    </th>
                                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                                        Items
                                    </th>
                                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                                        Total
                                    </th>
                                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                                        Estado
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.recentOrders.map((order) => (
                                    <tr
                                        key={order.id}
                                        className="border-b hover:bg-muted/50 transition-colors"
                                    >
                                        <td className="p-3 text-sm font-medium">
                                            #{order.id}
                                        </td>
                                        <td className="p-3 text-sm">
                                            {order.customer}
                                        </td>
                                        <td className="p-3 text-sm text-muted-foreground">
                                            {order.items}
                                        </td>
                                        <td className="p-3 text-sm font-medium">
                                            {order.total}
                                        </td>
                                        <td className="p-3">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-full text-xs font-medium",
                                                getStatusStyles(order.status)
                                            )}>
                                                {order.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Open Session Dialog */}
            <OpenSessionDialog
                isOpen={isOpenSessionDialogOpen}
                onClose={() => setIsOpenSessionDialogOpen(false)}
                onSuccess={handleSessionSuccess}
                branchId={currentBranch?.id}
            />

            {/* Create Adjustment Dialog */}
            <CreateAdjustmentDialog
                isOpen={isAdjustmentDialogOpen}
                onClose={handleCloseAdjustment}
                onSuccess={handleAdjustmentSuccess}
                cashSessionId={selectedSessionId}
            />
        </PageContainer>
    );
}
