import { type ReactNode } from 'react';

interface PageContainerProps {
    children: ReactNode;
}

export function PageContainer({ children }: PageContainerProps) {
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {children}
        </div>
    );
}
