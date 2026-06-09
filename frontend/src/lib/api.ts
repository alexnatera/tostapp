const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function getToken(): string | null {
  try {
    const raw = localStorage.getItem("tostapp-auth");
    return raw ? (JSON.parse(raw)?.state?.token ?? null) : null;
  } catch {
    return null;
  }
}

function handleUnauthorized() {
  localStorage.removeItem("tostapp-auth");
  if (!window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/r/")) {
    window.location.href = "/login";
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
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("Sesión expirada. Por favor inicia sesión nuevamente.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = Array.isArray(err.detail)
      ? err.detail.map((e: { msg?: string }) => e.msg ?? "Error").join(", ")
      : (err.detail ?? "Request failed");
    throw new Error(detail);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  purchases: {
    list: (limit = 50, offset = 0) => req<PurchaseList>(`/purchases?limit=${limit}&offset=${offset}`),
    create: (data: PurchaseCreate) => req<Purchase_>("/purchases", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<PurchaseCreate>) => req<Purchase_>(`/purchases/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => req<void>(`/purchases/${id}`, { method: "DELETE" }),
  },
  sales: {
    list: (limit = 50, offset = 0) => req<SaleList>(`/sales?limit=${limit}&offset=${offset}`),
    create: (data: SaleCreate) => req<Sale_>("/sales", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<SaleCreate>) => req<Sale_>(`/sales/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => req<void>(`/sales/${id}`, { method: "DELETE" }),
  },
  finance: {
    dashboard: (days = 30) => req<FinanceDashboard>(`/finance/dashboard?days=${days}`),
  },
  customers: {
    list: (limit = 200, offset = 0) => req<CustomerList>(`/customers?limit=${limit}&offset=${offset}`),
    create: (data: CustomerCreate) => req<Customer>("/customers", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<CustomerCreate>) => req<Customer>(`/customers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => req<void>(`/customers/${id}`, { method: "DELETE" }),
  },
  suppliers: {
    list: (limit = 50, offset = 0) => req<SupplierList>(`/suppliers?limit=${limit}&offset=${offset}`),
    create: (data: SupplierCreate) => req<Supplier>("/suppliers", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<SupplierCreate>) => req<Supplier>(`/suppliers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => req<void>(`/suppliers/${id}`, { method: "DELETE" }),
  },
  inventory: {
    summary: () => req<InventorySummary>("/inventory/summary"),
  },
  artisan: {
    import: (file: File): Promise<Roast> => {
      const token = getToken();
      const form = new FormData();
      form.append("file", file);
      return fetch(`${BASE}/roasts/import-artisan`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      }).then((res) => {
        if (!res.ok) return res.json().then((e) => { throw new Error(e.detail ?? "Error"); });
        return res.json() as Promise<Roast>;
      });
    },
  },
  auth: {
    register: (data: { email: string; password: string; roastery_name: string }) =>
      req<{ id: string; email: string; roastery_name: string; email_verified: boolean }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    login: (data: { email: string; password: string }) =>
      req<{ access_token: string; token_type: string; roastery_name: string; is_admin: boolean }>("/auth/login", {
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
    list: (limit = 50, offset = 0) => req<RoastList>(`/roasts?limit=${limit}&offset=${offset}`),
    get: (id: string) => req<Roast>(`/roasts/${id}`),
    create: (data: RoastCreate) =>
      req<Roast>("/roasts", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) => req<void>(`/roasts/${id}`, { method: "DELETE" }),
    exportUrl: () => `${BASE}/roasts/export`,
  },
  admin: {
    stats: () => req<{ total_users: number; total_roasts: number; verified_users: number; beta_users: number }>("/admin/stats"),
    users: () => req<AdminUser[]>("/admin/users"),
    impersonate: (userId: string) =>
      req<{ access_token: string; roastery_name: string; is_admin: boolean }>(`/admin/impersonate/${userId}`, { method: "POST" }),
  },
  public: {
    roast: (slug: string) => req<RoastPublic>(`/r/${slug}`),
    qrUrl: (slug: string) => `${BASE}/r/${slug}/qr.png`,
  },
  products: {
    list: (search?: string) => req<ProductList>(`/products${search ? `?search=${encodeURIComponent(search)}&limit=100` : "?limit=100"}`),
    get: (id: string) => req<Product>(`/products/${id}`),
    create: (data: ProductCreate) => req<Product>("/products", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<ProductCreate>) =>
      req<Product>(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => req<void>(`/products/${id}`, { method: "DELETE" }),
  },
  profile: {
    getBusiness: () => req<BusinessProfile>("/profile/business"),
    updateBusiness: (data: Partial<BusinessProfile>) =>
      req<BusinessProfile>("/profile/business", { method: "PUT", body: JSON.stringify(data) }),
  },
  documents: {
    list: (params?: { doc_type?: string; status?: string; limit?: number; offset?: number }) => {
      const q = new URLSearchParams();
      if (params?.doc_type) q.set("doc_type", params.doc_type);
      if (params?.status) q.set("status", params.status);
      if (params?.limit !== undefined) q.set("limit", String(params.limit));
      if (params?.offset !== undefined) q.set("offset", String(params.offset));
      return req<DocumentList>(`/documents?${q}`);
    },
    get: (id: string) => req<Document_>(`/documents/${id}`),
    create: (data: DocumentCreate) =>
      req<Document_>("/documents", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<DocumentCreate>) =>
      req<Document_>(`/documents/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => req<void>(`/documents/${id}`, { method: "DELETE" }),
    nextNumber: (doc_type: string) => req<{ doc_number: string }>(`/documents/next-number/${doc_type}`),
  },
};

export interface AdminUser {
  id: string;
  email: string;
  roastery_name: string;
  is_beta: boolean;
  is_admin: boolean;
  email_verified: boolean;
  roast_count: number;
  created_at: string;
}

export interface RoastList {
  items: Roast[];
  total: number;
}

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
  profile_data?: Record<string, unknown>;
}

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  website?: string;
  address?: string;
  city?: string;
  tax_id?: string;
  type: "B2B" | "D2C";
  notes?: string;
  created_at: string;
}
export type CustomerCreate = Omit<Customer, "id" | "user_id" | "created_at">;
export interface CustomerList { items: Customer[]; total: number; }

export interface Supplier {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  address?: string;
  city?: string;
  contact_person?: string;
  notes?: string;
  created_at: string;
}
export type SupplierCreate = Omit<Supplier, "id" | "user_id" | "created_at">;
export interface SupplierList { items: Supplier[]; total: number; }

export interface InventorySummary {
  stock_verde_kg: number;
  stock_tostado_kg: number;
  stock_vendido_kg: number;
  by_origin: { origin: string; verde_kg: number; tostado_kg: number }[];
  recent_roasts: { id: string; bean_origin: string; roast_date: string; roasted_weight_g: number; roast_level: string }[];
  low_stock_alert: boolean;
}

export type RoastCreate = Omit<Roast, "id" | "slug" | "user_id" | "batch_number" | "created_at">;

export interface Purchase_ {
  id: string;
  user_id: string;
  supplier?: string;
  bean_origin?: string;
  kg_purchased: number;
  price_per_kg: number;
  purchase_date: string;
  notes?: string;
  created_at: string;
}

export type PurchaseCreate = Omit<Purchase_, "id" | "user_id" | "created_at">;

export interface PurchaseList {
  items: Purchase_[];
  total: number;
}

export interface Sale_ {
  id: string;
  user_id: string;
  customer?: string;
  kg_sold: number;
  price_per_kg: number;
  sale_date: string;
  notes?: string;
  created_at: string;
}

export type SaleCreate = Omit<Sale_, "id" | "user_id" | "created_at">;

export interface SaleList {
  items: Sale_[];
  total: number;
}

export interface WeekSummary {
  week_start: string;
  purchased_cost: number;
  revenue: number;
  roasted_kg: number;
  sold_kg: number;
}

export interface FinanceDashboard {
  period_days: number;
  total_purchased_kg: number;
  total_purchased_cost: number;
  avg_cost_per_kg_verde: number;
  total_roasted_kg: number;
  avg_yield_pct: number;
  cost_per_kg_roasted: number;
  total_sold_kg: number;
  total_revenue: number;
  gross_margin: number;
  gross_margin_pct: number;
  stock_verde_kg: number;
  stock_roasted_kg: number;
  weekly_summary: WeekSummary[];
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  sku?: string;
  unit: string;
  price: number;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
}
export type ProductCreate = Omit<Product, "id" | "user_id" | "created_at" | "updated_at">;
export interface ProductList { items: Product[]; total: number; }

export interface BusinessProfile {
  roastery_name: string;
  business_address?: string;
  business_phone?: string;
  business_email?: string;
  business_tax_id?: string;
  business_logo?: string;
  business_website?: string;
  business_city?: string;
  business_country?: string;
}

export interface DocumentItem {
  description: string;
  qty: number;
  unit_price: number;
  total: number;
}

export interface Document_ {
  id: string;
  user_id: string;
  doc_type: "presupuesto" | "boleta" | "factura";
  doc_number: string;
  status: "borrador" | "enviado" | "pagado" | "cancelado";
  client_name?: string;
  client_email?: string;
  client_address?: string;
  client_tax_id?: string;
  issue_date: string;
  due_date?: string;
  items: DocumentItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  currency: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type DocumentCreate = Omit<Document_, "id" | "user_id" | "created_at" | "updated_at">;
export interface DocumentList { items: Document_[]; total: number; }

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
