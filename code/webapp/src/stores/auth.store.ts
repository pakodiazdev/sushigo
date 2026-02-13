import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authService, LoginCredentials } from "@/services/auth.service";
import type { User, Branch } from "@/types/auth";

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
  can: (permission: string) => boolean;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  switchBranch: (branchId: number) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  setHasHydrated: (state: boolean) => void;
  initializeAfterReset: (user: User, token: string) => void;
}

// Helper to extract branches from user's operating units
function extractBranchesFromUser(user: User | null): Branch[] {
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

// Helper to check if user is admin
function checkIsAdmin(user: User | null): boolean {
  return (
    user?.roles?.some(
      (role) => role.name === "admin" || role.name === "super-admin",
    ) ?? false
  );
}

// Helper to check permission
function checkPermission(user: User | null, permission: string): boolean {
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
          const branches = extractBranchesFromUser(userData);
          const isUserAdmin = checkIsAdmin(userData);

          // Auto-select branch for non-admin users with single branch
          let selectedBranch: Branch | null = null;
          if (!isUserAdmin && branches.length === 1) {
            selectedBranch = branches[0] ?? null;
          }

          set({
            user: userData,
            token: response.data.token,
            availableBranches: branches,
            currentBranch: selectedBranch,
            isAuthenticated: true,
            isAdmin: isUserAdmin,
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
          // Silently handle logout errors - we'll clear state anyway
        } finally {
          set({
            user: null,
            token: null,
            currentBranch: null,
            availableBranches: [],
            isAuthenticated: false,
            isAdmin: false,
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
          set({ isLoading: false, isAuthenticated: false, isAdmin: false, user: null });
          return;
        }

        try {
          const response = await authService.getMe();
          const userData = response.data as User;
          const branches = extractBranchesFromUser(userData);

          // Restore saved branch if valid
          const savedBranchId = get().currentBranch?.id;
          let restoredBranch: Branch | null = null;

          if (savedBranchId) {
            restoredBranch =
              branches.find((b) => b.id === savedBranchId) ?? null;
          }

          // Auto-select for non-admin with single branch
          if (
            !restoredBranch &&
            !checkIsAdmin(userData) &&
            branches.length === 1
          ) {
            restoredBranch = branches[0] ?? null;
          }

          set({
            user: userData,
            availableBranches: branches,
            currentBranch: restoredBranch,
            isAuthenticated: true,
            isAdmin: checkIsAdmin(userData),
            isLoading: false,
            error: null,
          });
        } catch (err) {
          set({
            user: null,
            token: null,
            currentBranch: null,
            availableBranches: [],
            isAuthenticated: false,
            isAdmin: false,
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
        try {
          const response = await authService.getMe();
          const userData = response.data as User;
          const branches = extractBranchesFromUser(userData);

          // Keep current branch if still valid
          const { currentBranch } = get();
          const validatedBranch = currentBranch
            ? (branches.find((b) => b.id === currentBranch.id) ?? null)
            : null;

          set({
            user: userData,
            isAdmin: checkIsAdmin(userData),
            availableBranches: branches,
            currentBranch: validatedBranch,
          });
        } catch (err) {
          throw err;
        }
      },

      clearError: () => set({ error: null }),

      initializeAfterReset: (user: User, token: string) => {
        const branches = extractBranchesFromUser(user);
        const isUserAdmin = checkIsAdmin(user);

        let selectedBranch: Branch | null = null;
        if (!isUserAdmin && branches.length === 1) {
          selectedBranch = branches[0] ?? null;
        }

        set({
          user,
          token,
          availableBranches: branches,
          currentBranch: selectedBranch,
          isAuthenticated: true,
          isAdmin: isUserAdmin,
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
        return (__state, error) => {
          if (error) {
            console.error("Error rehydrating auth storage:", error);
          }
          // Mark hydration as complete using queueMicrotask to ensure store exists
          queueMicrotask(() => {
            useAuthStore.setState({ _hasHydrated: true });
          });
        };
      },
    },
  ),
);
