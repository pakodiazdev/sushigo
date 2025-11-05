import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService, User, LoginCredentials } from '@/services/auth.service';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  _hasInitialized: boolean; // Internal flag to prevent multiple initializations

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      _hasInitialized: false,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login(credentials);
          console.log('[Auth Store] Login successful:', {
            hasUser: !!response.data.user,
            hasToken: !!response.data.token,
            tokenPreview: response.data.token?.substring(0, 20) + '...'
          });

          const newState = {
            user: response.data.user,
            token: response.data.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            _hasInitialized: true, // Mark as initialized after successful login
          };

          console.log('[Auth Store] Setting new state:', newState);
          set(newState);

          // Verify state was set
          setTimeout(() => {
            const currentState = get();
            console.log('[Auth Store] State after login:', {
              hasUser: !!currentState.user,
              hasToken: !!currentState.token,
              isAuthenticated: currentState.isAuthenticated
            });
          }, 100);
        } catch (err: any) {
          console.error('[Auth Store] Login failed:', err);
          const errorMessage = err.response?.data?.message || 'Error al iniciar sesión';
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
          throw err;
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch (err) {
          console.error('Error during logout:', err);
        } finally {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            _hasInitialized: false,
          });
        }
      },

      initializeAuth: async () => {
        const state = get();
        if (state._hasInitialized) {
          console.log('[Auth Store] Already initialized, skipping');
          return;
        }

        console.log('[Auth Store] initializeAuth called', {
          isAuthenticated: state.isAuthenticated,
          hasUser: !!state.user,
          hasToken: !!state.token,
        });

        set({ _hasInitialized: true, isLoading: true });

        const { token } = state;

        if (!token) {
          console.log('[Auth Store] No token found, setting unauthenticated state');
          set({ isLoading: false, isAuthenticated: false, user: null });
          return;
        }

        console.log('[Auth Store] Token found, validating with API...', token.substring(0, 20) + '...');

        try {
          const response = await authService.getMe();
          console.log('[Auth Store] User validated successfully:', response.data);
          set({
            user: response.data,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (err: any) {
          console.error('[Auth Store] Auth initialization failed:', {
            error: err,
            status: err.response?.status,
            data: err.response?.data,
            message: err.message
          });
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
