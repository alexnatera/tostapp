const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function getToken(): string | null {
  try {
    const raw = localStorage.getItem("tostapp-auth");
    return raw ? (JSON.parse(raw)?.state?.token ?? null) : null;
  } catch {
    return null;
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  auth: {
    register: (data: { email: string; password: string; roastery_name: string }) =>
      req<{ id: string; email: string; roastery_name: string; email_verified: boolean }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    login: (data: { email: string; password: string }) =>
      req<{ access_token: string; token_type: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    verifyEmail: (code: string) =>
      req<{ message: string }>("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ code }),
      }),
    forgotPassword: (email: string) =>
      req<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    resetPassword: (token: string, new_password: string) =>
      req<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password }),
      }),
  },
  roasts: {
    list: () => req<Roast[]>("/roasts"),
    get: (id: string) => req<Roast>(`/roasts/${id}`),
    create: (data: RoastCreate) =>
      req<Roast>("/roasts", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) => req<void>(`/roasts/${id}`, { method: "DELETE" }),
    exportUrl: () => `${BASE}/roasts/export`,
  },
  public: {
    roast: (slug: string) => req<RoastPublic>(`/r/${slug}`),
    qrUrl: (slug: string) => `${BASE}/r/${slug}/qr.png`,
  },
};

export interface Roast {
  id: string;
  slug: string;
  user_id: string;
  bean_origin: string;
  farm?: string;
  variety?: string;
  process?: string;
  roast_date: string;
  roast_level: "light" | "medium" | "dark";
  roast_time_minutes?: number;
  charge_temp?: number;
  drop_temp?: number;
  green_weight_g?: number;
  roasted_weight_g?: number;
  tasting_notes?: string;
  roaster_notes?: string;
  batch_number: number;
  created_at: string;
}

export type RoastCreate = Omit<Roast, "id" | "slug" | "user_id" | "batch_number" | "created_at">;

export interface RoastPublic {
  slug: string;
  roastery_name: string;
  bean_origin: string;
  farm?: string;
  variety?: string;
  process?: string;
  roast_date: string;
  roast_level: string;
  tasting_notes?: string;
  roaster_notes?: string;
  batch_number: number;
}
