import axiosInstance from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
  AuthResponse,
  LoginCredentials,
  RegisterData,
  User,
} from '@/types/auth';

const ACCESS_TOKEN_KEY = 'accessToken';
const USER_KEY = 'user';

class AuthService {
  login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
    return axiosInstance.post('/auth/login', credentials);
  }

  register(data: RegisterData): Promise<ApiResponse<AuthResponse>> {
    return axiosInstance.post('/auth/register', data);
  }

  getMe(): Promise<ApiResponse<User>> {
    return axiosInstance.get('/auth/me');
  }

  changePassword(currentPassword: string, newPassword: string) {
    return axiosInstance.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  }

  async logout(): Promise<void> {
    try {
      await axiosInstance.post('/auth/logout');
    } catch {
      // stateless logout — ignore network errors, still clear locally
    }
    this.clear();
  }

  // ── local session helpers ─────────────────────────────────────────────
  saveToken(token: string) {
    if (typeof window !== 'undefined') localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }
  saveUser(user: User) {
    if (typeof window !== 'undefined') localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  getUser(): User | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  }
  getToken(): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;
  }
  isAuthenticated(): boolean {
    return !!this.getToken();
  }
  clear() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

export default new AuthService();
