import { type ReactNode } from 'react';

interface PageHeaderProps {
    title: string;
    description: string;
    action?: ReactNode;
    children?: ReactNode;
}

export function PageHeader({ title, description, action, children }: PageHeaderProps) {
    return (
        <div className="space-y-1 p-6 rounded-xl bg-gradient-to-r from-sushigo-navy/5 via-sushigo-coral/5 to-sushigo-cream/50 border border-sushigo-cream/50">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-sushigo-navy dark:text-sushigo-cream">
                        {title}
                    </h1>
                    <p className="text-sushigo-gray dark:text-muted-foreground mt-1">
                        {description}
                    </p>
                </div>
                {action || children}
            </div>
        </div>
    );
}
