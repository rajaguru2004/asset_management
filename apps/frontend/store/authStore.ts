import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LoginCredentials, User } from '@/types/auth';
import authService from '@/services/authService';
import { getErrorMessage } from '@/lib/apiError';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        try {
          set({ isLoading: true, error: null });

          const response = await authService.login(credentials);
          // Backend: { success, data: { user, accessToken } }
          const { user, accessToken } = response.data;

          // No refresh token in this backend — reuse the access token.
          authService.saveTokens(accessToken, accessToken);
          authService.saveUser(user);

          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ error: getErrorMessage(error, 'Login failed'), isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authService.logout();
          set({ user: null, isAuthenticated: false, error: null });
        } catch (error) {
          console.error('Logout error:', error);
        }
      },

      loadUser: async () => {
        try {
          if (!authService.isAuthenticated()) {
            set({ isAuthenticated: false, user: null });
            return;
          }

          set({ isLoading: true });

          const cachedUser = authService.getUser();
          if (cachedUser) {
            set({ user: cachedUser, isAuthenticated: true, isLoading: false });
          }

          const response = await authService.getMe();
          authService.saveUser(response.data);

          set({ user: response.data, isAuthenticated: true, isLoading: false });
        } catch {
          await authService.logout();
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
