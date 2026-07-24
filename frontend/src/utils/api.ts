export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? 'https://envision-2026.onrender.com' : 'http://127.0.0.1:8000')
).replace(/\/$/, '');
export const RAZORPAY_ME_URL = "https://razorpay.me/@ritambera8705";
export const RAZORPAY_UPI_ID = "https://razorpay.me/@ritambera8705";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  fest_id: string;
  role: string;
  is_approved: boolean;
  profile_picture?: string | null;
  department?: string | null;
  full_name?: string | null;
  gender?: string | null;
  college?: string | null;
  phone?: string | null;
  created_at?: string;
}

export function getAuthToken(): string | null {
  return localStorage.getItem('access_token');
}

export function setAuthSession(accessToken: string, user: UserProfile) {
  if (accessToken) {
    localStorage.setItem('access_token', accessToken);
  }
  localStorage.setItem('user_role', user.role);
  localStorage.setItem('fest_id', user.fest_id);
  localStorage.setItem('user_name', user.name);
  localStorage.setItem('user_email', user.email);
  if (user.phone) {
    localStorage.setItem('user_phone', user.phone);
  }
  localStorage.setItem('envision_user_signedup', 'true');
}

export function clearAuthSession() {
  // Fire server-side logout to clear HttpOnly cookie
  fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});

  localStorage.removeItem('access_token');
  localStorage.removeItem('user_role');
  localStorage.removeItem('fest_id');
  localStorage.removeItem('user_name');
  localStorage.removeItem('user_email');
  localStorage.removeItem('envision_user_signedup');

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth-change'));
  }
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('envision_user_signedup') || !!getAuthToken();
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include', // Automatically send and receive HttpOnly cookies
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthSession();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.detail || `Request failed with status ${response.status}`);
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
}

export interface BackendEvent {
  id: string;
  name: string;
  category: string;
  price: string;
  price_amount: number;
  requires_team?: boolean;
  max_team_size?: number;
  has_food?: boolean;
  notes?: string;
  image?: string;
  benefits?: string;
  date?: string;
  venue?: string;
  time?: string;
}

export interface EventRegistration {
  id: string;
  user_id: string;
  event_id: string;
  user_email: string;
  user_name: string;
  user_phone?: string;
  team_name?: string;
  team_members?: string;
  college?: string;
  transaction_id?: string;
  status: string;
  created_at?: string;
  event?: BackendEvent;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(endpoint: string, body: any) => request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
