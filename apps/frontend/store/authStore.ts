import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LoginCredentials, RegisterData, User } from '@/types/auth';
import authService from '@/services/authService';
import { getErrorMessage } from '@/lib/apiError';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** True until the first session check resolves (prevents auth flicker). */
  hydrated: boolean;
  error: string | null;

  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  verifySession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      hydrated: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authService.login(credentials);
          authService.saveToken(data.accessToken);
          authService.saveUser(data.user);
          set({ user: data.user, isAuthenticated: true, isLoading: false, hydrated: true });
        } catch (error) {
          set({ error: getErrorMessage(error, 'Login failed'), isLoading: false });
          throw error;
        }
      },

      register: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authService.register(payload);
          authService.saveToken(data.accessToken);
          authService.saveUser(data.user);
          set({ user: data.user, isAuthenticated: true, isLoading: false, hydrated: true });
        } catch (error) {
          set({ error: getErrorMessage(error, 'Sign up failed'), isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        await authService.logout();
        set({ user: null, isAuthenticated: false, error: null });
      },

      verifySession: async () => {
        if (!authService.isAuthenticated()) {
          set({ user: null, isAuthenticated: false, hydrated: true });
          return;
        }
        // Optimistically show the cached user, then confirm with the server.
        const cached = authService.getUser();
        if (cached) set({ user: cached, isAuthenticated: true });
        try {
          const { data } = await authService.getMe();
          authService.saveUser(data);
          set({ user: data, isAuthenticated: true, hydrated: true });
        } catch {
          authService.clear();
          set({ user: null, isAuthenticated: false, hydrated: true });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'assetflow-auth',
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    },
  ),
);
