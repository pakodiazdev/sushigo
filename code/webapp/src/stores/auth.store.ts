import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authService, LoginCredentials } from "@/services/auth.service";
import { apiClient } from "@/lib/api-client";
import type { User, Branch, OperatingUnit } from "@/types/auth";

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  currentBranch: Branch | null;
  availableBranches: Branch[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  _hasInitialized: boolean;
  _hasHydrated: boolean;

  // Computed getters
  isAdmin: boolean;
  isSuperAdmin: boolean;
  can: (permission: string) => boolean;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  switchBranch: (branchId: number) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  setHasHydrated: (state: boolean) => void;
  initializeAfterReset: (user: User, token: string) => Promise<void>;
}

// Helper to extract branches from user's operating units
export function extractBranchesFromUser(user: User | null): Branch[] {
  if (!user?.operating_units) return [];

  const branches = new Map<number, Branch>();
  user.operating_units.forEach((assignment) => {
    if (assignment.operating_unit?.branch && assignment.is_active) {
      const branch = assignment.operating_unit.branch;
      if (!branches.has(branch.id)) {
        branches.set(branch.id, branch);
      }
    }
  });

  return Array.from(branches.values());
}

// Fetch branches from operating-units API (fallback for admins without assignments)
async function fetchBranchesFromApi(): Promise<Branch[]> {
  try {
    const response = await apiClient.get('/operating-units', {
      params: { per_page: 100, is_active: true },
    });
    const branches = new Map<number, Branch>();
    (response.data?.data || []).forEach((ou: OperatingUnit) => {
      if (ou.branch && !branches.has(ou.branch.id)) {
        branches.set(ou.branch.id, ou.branch);
      }
    });
    return Array.from(branches.values());
  } catch (error) {
    console.error('[auth.store] Failed to fetch branches from API:', error);
    return [];
  }
}

// Helper to check if user is admin
export function checkIsAdmin(user: User | null): boolean {
  return (
    user?.roles?.some(
      (role) => role.name === "admin" || role.name === "super-admin",
    ) ?? false
  );
}

// Helper to check if user is super-admin
export function checkIsSuperAdmin(user: User | null): boolean {
  return (
    user?.roles?.some((role) => role.name === "super-admin") ?? false
  );
}

// Helper to check permission
export function checkPermission(user: User | null, permission: string): boolean {
  if (!user) return false;
  if (checkIsAdmin(user)) return true;
  return user.permissions?.some((p) => p.name === permission) ?? false;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      currentBranch: null,
      availableBranches: [],
      isAuthenticated: false,
      isLoading: true, // Start as loading until hydration completes
      error: null,
      _hasInitialized: false,
      _hasHydrated: false,

      // Derived state - recalculated on every set() that changes user
      isAdmin: false,
      isSuperAdmin: false,

      can: (permission: string) => {
        const state = get();
        return state ? checkPermission(state.user, permission) : false;
      },

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login(credentials);
          const userData = response.data.user as User;
          let branches = extractBranchesFromUser(userData);
          const isUserAdmin = checkIsAdmin(userData);

          // Login response omits operating_units — fall back to API for all roles
          if (branches.length === 0) {
            branches = await fetchBranchesFromApi();
          }

          // Auto-select when there's only one branch
          const selectedBranch = branches.length === 1 ? branches[0] ?? null : null;

          set({
            user: userData,
            token: response.data.token,
            availableBranches: branches,
            currentBranch: selectedBranch,
            isAuthenticated: true,
            isAdmin: isUserAdmin,
            isSuperAdmin: checkIsSuperAdmin(userData),
            isLoading: false,
            error: null,
            _hasInitialized: true,
          });
        } catch (err: unknown) {
          const errorMessage =
            (err as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || "Error al iniciar sesión";
          set({
            user: null,
            token: null,
            currentBranch: null,
            availableBranches: [],
            isAuthenticated: false,
            isAdmin: false,
            isSuperAdmin: false,
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
          console.error('[auth.store] Failed to notify backend of logout:', err);
        } finally {
          set({
            user: null,
            token: null,
            currentBranch: null,
            availableBranches: [],
            isAuthenticated: false,
            isAdmin: false,
            isSuperAdmin: false,
            isLoading: false,
            error: null,
            _hasInitialized: false,
          });
        }
      },

      initializeAuth: async () => {
        const state = get();

        // Wait for hydration if not yet hydrated
        if (!state._hasHydrated) {
          return;
        }

        if (state._hasInitialized) {
          return;
        }

        set({ _hasInitialized: true, isLoading: true });

        const { token } = get(); // Get fresh state after hydration

        if (!token) {
          set({ isLoading: false, isAuthenticated: false, isAdmin: false, isSuperAdmin: false, user: null });
          return;
        }

        try {
          const response = await authService.getMe();
          const userData = response.data as User;
          let branches = extractBranchesFromUser(userData);

          // Login/me response omits operating_units — fall back to API for all roles
          if (branches.length === 0) {
            branches = await fetchBranchesFromApi();
          }

          // Restore saved branch if valid
          const savedBranchId = get().currentBranch?.id;
          let restoredBranch: Branch | null = null;

          if (savedBranchId) {
            restoredBranch =
              branches.find((b) => b.id === savedBranchId) ?? null;
          }

          // Auto-select when there's only one branch
          if (!restoredBranch && branches.length === 1) {
            restoredBranch = branches[0] ?? null;
          }

          set({
            user: userData,
            availableBranches: branches,
            currentBranch: restoredBranch,
            isAuthenticated: true,
            isAdmin: checkIsAdmin(userData),
            isSuperAdmin: checkIsSuperAdmin(userData),
            isLoading: false,
            error: null,
          });
        } catch (err) {
          console.error('[auth.store] Failed to restore session in initializeAuth:', err);
          set({
            user: null,
            token: null,
            currentBranch: null,
            availableBranches: [],
            isAuthenticated: false,
            isAdmin: false,
            isSuperAdmin: false,
            isLoading: false,
            error: null,
          });
        }
      },

      switchBranch: async (branchId: number) => {
        const { availableBranches } = get();
        const branch = availableBranches.find((b) => b.id === branchId);

        if (!branch) {
          throw new Error("Branch not available for this user");
        }

        set({ currentBranch: branch });
      },

      refreshUser: async () => {
        const response = await authService.getMe();
        const userData = response.data as User;
        let branches = extractBranchesFromUser(userData);

        // me response omits operating_units — fall back to API for all roles
        if (branches.length === 0) {
          branches = await fetchBranchesFromApi();
        }

        const { currentBranch, availableBranches: previousBranches } = get();

        // fetchBranchesFromApi() swallows its own request failures into an empty
        // array — an empty result here can mean either "this user genuinely has no
        // branches" or "the fallback request itself failed" (network hiccup,
        // transient 5xx), and refreshUser() (unlike login()) runs after routine
        // actions on top of an already-populated session, e.g. saving an avatar.
        // Since those two cases aren't distinguishable from here, treat a *newly*
        // empty result as the latter when branches were already populated —
        // preserve them instead of silently discarding the user's active branch
        // out from under them.
        if (branches.length === 0 && previousBranches.length > 0) {
          set({
            user: userData,
            isAdmin: checkIsAdmin(userData),
            isSuperAdmin: checkIsSuperAdmin(userData),
          });
          return;
        }

        // Keep current branch if still valid, otherwise auto-select single branch
        let validatedBranch = currentBranch
          ? (branches.find((b) => b.id === currentBranch.id) ?? null)
          : null;

        if (!validatedBranch && branches.length === 1) {
          validatedBranch = branches[0]!;
        }

        set({
          user: userData,
          isAdmin: checkIsAdmin(userData),
          isSuperAdmin: checkIsSuperAdmin(userData),
          availableBranches: branches,
          currentBranch: validatedBranch,
        });
      },

      clearError: () => set({ error: null }),

      initializeAfterReset: async (user: User, token: string) => {
        let branches = extractBranchesFromUser(user);
        const isUserAdmin = checkIsAdmin(user);

        // Login response omits operating_units — fall back to API for all roles
        if (branches.length === 0) {
          branches = await fetchBranchesFromApi();
        }

        // Auto-select when there's only one branch
        const selectedBranch = branches.length === 1 ? branches[0]! : null;

        set({
          user,
          token,
          availableBranches: branches,
          currentBranch: selectedBranch,
          isAuthenticated: true,
          isAdmin: isUserAdmin,
          isSuperAdmin: checkIsSuperAdmin(user),
          isLoading: false,
          error: null,
          _hasInitialized: true,
          _hasHydrated: true,
        });
      },
    }),
    {
      name: "auth-storage",
      version: 2,
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        currentBranch: state.currentBranch,
      }),
      onRehydrateStorage: (_state) => {
        // This runs BEFORE hydration - we can return a callback for AFTER
        return (state, error) => {
          if (error) {
            console.error("Error rehydrating auth storage:", error);
          }
          // Recompute isAdmin from persisted user so it's available immediately
          // after hydration, avoiding a brief flash of unauthorized content.
          const rehydratedIsAdmin = state ? checkIsAdmin(state.user) : false;
          const rehydratedIsSuperAdmin = state ? checkIsSuperAdmin(state.user) : false;
          // Mark hydration as complete using queueMicrotask to ensure store exists
          queueMicrotask(() => {
            useAuthStore.setState({
              _hasHydrated: true,
              isAdmin: rehydratedIsAdmin,
              isSuperAdmin: rehydratedIsSuperAdmin,
            });
          });
        };
      },
    },
  ),
);
