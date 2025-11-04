import { Outlet } from '@tanstack/react-router';
import Header from './Header';
import Sidebar from './Sidebar';

export default function Layout() {
    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />

                <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-gradient-to-br from-sushigo-cream/30 via-background to-sushigo-navy/5">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
