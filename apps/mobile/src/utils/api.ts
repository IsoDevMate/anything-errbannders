/**
 * Typed client for the Express backend (EXPO_PUBLIC_API_URL).
 * Uses the Bearer token stored in SecureStore by the auth flow.
 */
import * as SecureStore from 'expo-secure-store';
import { authKey, secureStoreOptions } from '@/utils/auth/store';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

async function getToken(): Promise<string | null> {
  try {
    const raw = await SecureStore.getItemAsync(authKey, secureStoreOptions);
    if (!raw) return null;
    return (JSON.parse(raw) as { jwt: string }).jwt ?? null;
  } catch {
    return null;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data as T;
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface Errand {
  id: string;
  title: string;
  description: string | null;
  category: string;
  budget: string;
  fee: string;
  sender_id: string;
  agent_id: string | null;
  pickup_location: string | null;
  delivery_location: string | null;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'confirmed' | 'disputed';
  proof_image_url: string | null;
  created_at: string;
  sender_name: string | null;
  agent_name: string | null;
}

export interface Wallet {
  user_id: string;
  balance: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  amount: string;
  type: string;
  errand_id: string | null;
  created_at: string;
}

export interface WalletData {
  wallet: Wallet | null;
  transactions: Transaction[];
}

// ── API calls ──────────────────────────────────────────────────────────────

export const api = {
  errands: {
    list: () => request<Errand[]>('/api/errands'),

    create: (body: {
      title: string;
      description?: string;
      budget: string;
      fee: string;
      sender_id: string;
      pickup_location?: string;
      delivery_location?: string;
      category?: string;
    }) => request<Errand>('/api/errands', { method: 'POST', body: JSON.stringify(body) }),

    update: (body: {
      errandId: string;
      status: string;
      agentId?: string;
      proofImageUrl?: string;
    }) =>
      request<Errand>('/api/errands/update', { method: 'POST', body: JSON.stringify(body) }),
  },

  wallet: {
    get: (userId: string) => request<WalletData>(`/api/wallet?userId=${encodeURIComponent(userId)}`),

    topup: (userId: string, phone: string, amount: number) =>
      request<{ checkoutRequestId: string }>('/api/wallet/topup', {
        method: 'POST',
        body: JSON.stringify({ userId, phone, amount }),
      }),

    deposit: (userId: string, amount: number) =>
      request<{ success: boolean }>('/api/wallet', {
        method: 'POST',
        body: JSON.stringify({ userId, amount, type: 'deposit' }),
      }),

    withdraw: (userId: string, amount: number) =>
      request<{ success: boolean }>('/api/wallet', {
        method: 'POST',
        body: JSON.stringify({ userId, amount, type: 'withdrawal' }),
      }),
  },

  session: {
    get: () => request<{ user: { id: string; name: string; email: string }; session: object }>('/api/session'),
  },

  agent: {
    apply: (body: { userId: string; idImageUrl: string; selfieImageUrl: string; mpesaNumber: string }) =>
      request<{ id: string; status: string }>('/api/agent/apply', { method: 'POST', body: JSON.stringify(body) }),

    status: (userId: string) =>
      request<{ status: 'none' | 'pending' | 'approved' | 'rejected' }>(`/api/agent/status?userId=${encodeURIComponent(userId)}`),
  },
};
