export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? 'https://envision2026-production.up.railway.app' : 'http://127.0.0.1:8000')
).replace(/\/$/, '');
export const FEST_UPI_ID = (import.meta.env as any).VITE_FEST_UPI_ID || "8336048128@oksbi";
export const RAZORPAY_UPI_ID = FEST_UPI_ID;

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

  const requestHeaders = { ...headers };
  const { credentials, ...restOptions } = options;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...restOptions,
      credentials: credentials || 'include',
      headers: requestHeaders,
    });
  } catch (err: any) {
    // Fallback retry with credentials: 'omit' for mobile browsers (Safari/Chrome Mobile ITP & CORS restrictions)
    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...restOptions,
        credentials: 'omit',
        headers: requestHeaders,
      });
    } catch (retryErr: any) {
      console.error(`[API Network Error] Could not reach backend at ${API_BASE_URL}${endpoint}:`, retryErr);
      throw new Error(`Unable to connect to backend server. Please check your network or try again.`);
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthSession();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    const errorData = await response.json().catch(() => ({}));
    let msg = errorData.detail || `Request failed with status ${response.status}`;
    if (response.status === 429) {
      msg = "Rate limit exceeded (Too Many Requests). Please wait a few seconds before trying again.";
    }
    const error = new Error(msg);
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
  prize?: string;
}

export interface EventRegistration {
  id: string;
  user_id: string;
  event_id: string;
  food_preference?: string;
  payment_status?: string;
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
