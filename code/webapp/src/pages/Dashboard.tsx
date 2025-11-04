import { useQuery } from '@tanstack/react-query';
import {
    Users,
    ShoppingCart,
    DollarSign,
    ArrowUp,
    ArrowDown,
    Package,
    type LucideIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
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

export default function Dashboard() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['dashboard'],
        queryFn: fetchDashboardData,
    });

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
        </PageContainer>
    );
}
