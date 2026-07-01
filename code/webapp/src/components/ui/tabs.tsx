import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Tab {
    id: string
    label: string
}

interface TabsProps {
    tabs: Tab[]
    activeTab: string
    onTabChange: (id: string) => void
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
    return (
        <div className="border-b border-border">
            <nav className="-mb-px flex gap-0" aria-label="Tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onTabChange(tab.id)}
                        className={cn(
                            'px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                            activeTab === tab.id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                        )}
                        aria-current={activeTab === tab.id ? 'page' : undefined}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>
        </div>
    )
}

interface TabPanelProps {
    id: string
    activeTab: string
    children: ReactNode
}

export function TabPanel({ id, activeTab, children }: TabPanelProps) {
    if (id !== activeTab) return null
    return <div role="tabpanel">{children}</div>
}
