import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { ToastProvider } from '@/components/ui/toast-provider';
import { BranchSelectionDialog } from '@/components/auth';
import { RoutePendingFallback, RouteErrorFallback } from '@/components/routing/route-fallbacks';
import { routeTree } from './routeTree.gen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  // Router-wide loading/failure boundary for lazily-loaded route chunks (#577) —
  // one shared pair instead of each `.lazy.tsx` route declaring its own.
  defaultPendingComponent: RoutePendingFallback,
  defaultErrorComponent: RouteErrorFallback,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SidebarProvider>
          <ToastProvider>
            <RouterProvider router={router} />
            <BranchSelectionDialog />
            <ReactQueryDevtools initialIsOpen={false} buttonPosition="top-left" />
          </ToastProvider>
        </SidebarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
