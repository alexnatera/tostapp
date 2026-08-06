import { supabase } from "./supabase";
import { parseAlogFile } from "./alogParser";

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Sesión expirada. Por favor inicia sesión nuevamente.");
  }
  return data.user.id;
}

function raise(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

interface ListResult<T> {
  items: T[];
  total: number;
}

async function listOwned<T>(
  table: string,
  limit: number,
  offset: number,
  order: [string, boolean][],
  extra?: (q: ReturnType<typeof supabase.from>) => ReturnType<typeof supabase.from>
): Promise<ListResult<T>> {
  const uid = await currentUserId();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase.from(table).select("*", { count: "exact" }).eq("user_id", uid);
  if (extra) q = extra(q);
  for (const [col, ascending] of order) q = q.order(col, { ascending });
  const { data, error, count } = await q.range(offset, Math.max(offset, offset + limit - 1));
  raise(error);
  return { items: (data ?? []) as T[], total: count ?? 0 };
}

async function createOwned<T>(table: string, payload: Record<string, unknown>): Promise<T> {
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from(table)
    .insert({ ...payload, user_id: uid })
    .select()
    .single();
  raise(error);
  return data as T;
}

async function updateOwned<T>(table: string, id: string, payload: Record<string, unknown>): Promise<T> {
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from(table)
    .update(payload)
    .eq("id", id)
    .eq("user_id", uid)
    .select()
    .single();
  raise(error);
  return data as T;
}

async function deleteOwned(table: string, id: string): Promise<void> {
  const uid = await currentUserId();
  const { error } = await supabase.from(table).delete().eq("id", id).eq("user_id", uid);
  raise(error);
}

async function getOwned<T>(table: string, id: string): Promise<T> {
  const uid = await currentUserId();
  const { data, error } = await supabase.from(table).select("*").eq("id", id).eq("user_id", uid).single();
  raise(error);
  return data as T;
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  purchases: {
    list: (limit = 50, offset = 0) =>
      listOwned<Purchase_>("purchases", limit, offset, [
        ["purchase_date", false],
        ["created_at", false],
      ]),
    create: (data: PurchaseCreate) => createOwned<Purchase_>("purchases", data),
    update: (id: string, data: Partial<PurchaseCreate>) => updateOwned<Purchase_>("purchases", id, data),
    delete: (id: string) => deleteOwned("purchases", id),
  },
  sales: {
    list: (limit = 50, offset = 0) =>
      listOwned<Sale_>("sales", limit, offset, [
        ["sale_date", false],
        ["created_at", false],
      ]),
    create: (data: SaleCreate) => createOwned<Sale_>("sales", data),
    update: (id: string, data: Partial<SaleCreate>) => updateOwned<Sale_>("sales", id, data),
    delete: (id: string) => deleteOwned("sales", id),
  },
  finance: {
    dashboard: (days = 30) => computeFinanceDashboard(days),
  },
  customers: {
    list: (limit = 200, offset = 0) => listOwned<Customer>("customers", limit, offset, [["created_at", false]]),
    create: (data: CustomerCreate) => createOwned<Customer>("customers", data),
    update: (id: string, data: Partial<CustomerCreate>) => updateOwned<Customer>("customers", id, data),
    delete: (id: string) => deleteOwned("customers", id),
  },
  suppliers: {
    list: (limit = 50, offset = 0) => listOwned<Supplier>("suppliers", limit, offset, [["created_at", false]]),
    create: (data: SupplierCreate) => createOwned<Supplier>("suppliers", data),
    update: (id: string, data: Partial<SupplierCreate>) => updateOwned<Supplier>("suppliers", id, data),
    delete: (id: string) => deleteOwned("suppliers", id),
  },
  inventory: {
    summary: () => computeInventorySummary(),
  },
  artisan: {
    import: async (file: File): Promise<Roast> => {
      const parsed = await parseAlogFile(file);
      return api.roasts.create(parsed as unknown as RoastCreate);
    },
  },
  auth: {
    register: async (data: { email: string; password: string; roastery_name: string }) => {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { data: { roastery_name: data.roastery_name } },
      });
      raise(error);
      const user = signUpData.user;
      return {
        id: user?.id ?? "",
        email: user?.email ?? data.email,
        roastery_name: data.roastery_name,
        email_verified: !!user?.email_confirmed_at,
      };
    },
    login: async (data: { email: string; password: string }) => {
      const { data: signInData, error } = await supabase.auth.signInWithPassword(data);
      raise(error);
      const session = signInData.session!;
      const { data: profile } = await supabase
        .from("profiles")
        .select("roastery_name, is_admin")
        .eq("id", session.user.id)
        .single();
      return {
        access_token: session.access_token,
        token_type: "bearer",
        roastery_name: profile?.roastery_name ?? "",
        is_admin: profile?.is_admin ?? false,
      };
    },
    verifyEmail: async (_code: string) => {
      return { message: "La verificación de email ahora se hace desde el link que envía Supabase." };
    },
    forgotPassword: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}reset-password`,
      });
      raise(error);
      return { message: "Si el email existe, recibirás un link para restablecer tu contraseña." };
    },
    resetPassword: async (_token: string, new_password: string) => {
      const { error } = await supabase.auth.updateUser({ password: new_password });
      raise(error);
      return { message: "Contraseña actualizada ✓" };
    },
  },
  roasts: {
    list: (limit = 50, offset = 0) =>
      listOwned<Roast>("roasts", limit, offset, [
        ["roast_date", false],
        ["created_at", false],
      ]),
    get: (id: string) => getOwned<Roast>("roasts", id),
    create: (data: RoastCreate) => createOwned<Roast>("roasts", data),
    delete: (id: string) => deleteOwned("roasts", id),
    exportUrl: () => "",
    downloadCsv: async () => {
      const uid = await currentUserId();
      const { data, error } = await supabase
        .from("roasts")
        .select(
          "slug,bean_origin,farm,variety,process,roast_date,roast_level,roast_time_minutes,charge_temp,drop_temp,green_weight_g,roasted_weight_g,batch_number,tasting_notes,roaster_notes,created_at"
        )
        .eq("user_id", uid)
        .order("roast_date", { ascending: false });
      raise(error);
      const fields = [
        "slug", "bean_origin", "farm", "variety", "process",
        "roast_date", "roast_level", "roast_time_minutes",
        "charge_temp", "drop_temp", "green_weight_g", "roasted_weight_g",
        "batch_number", "tasting_notes", "roaster_notes", "created_at",
      ];
      const rows = (data ?? []) as Record<string, unknown>[];
      const csvEscape = (v: unknown) => {
        const s = v === null || v === undefined ? "" : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const lines = [fields.join(",")];
      for (const row of rows) lines.push(fields.map((f) => csvEscape(row[f])).join(","));
      downloadBlob("﻿" + lines.join("\n"), "tostapp-tuestes.csv", "text/csv;charset=utf-8");
    },
  },
  admin: {
    stats: async () => {
      const { data, error } = await supabase.rpc("admin_stats");
      raise(error);
      return data as { total_users: number; total_roasts: number; verified_users: number; beta_users: number };
    },
    users: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");
      raise(error);
      return (data ?? []) as AdminUser[];
    },
    impersonate: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-impersonate", {
        body: { user_id: userId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error as string);
      return data as { action_link: string; target_email: string };
    },
    toggle: async (userId: string) => {
      const { data, error } = await supabase.rpc("admin_toggle_user", { p_user_id: userId });
      raise(error);
      return data as AdminUser;
    },
    setPlan: async (userId: string, plan_tier: string, subscription_expires_at?: string) => {
      const { data, error } = await supabase.rpc("admin_set_plan", {
        p_user_id: userId,
        p_plan_tier: plan_tier,
        p_expires: subscription_expires_at ?? null,
      });
      raise(error);
      return data as AdminUser;
    },
  },
  public: {
    roast: async (slug: string) => {
      const { data, error } = await supabase.rpc("get_roast_by_slug", { p_slug: slug });
      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        throw new Error("No encontrado");
      }
      return (Array.isArray(data) ? data[0] : data) as RoastPublic;
    },
    qrUrl: (_slug: string) => "",
    shop: async (slug: string) => {
      const { data, error } = await supabase.rpc("get_shop_by_slug", { p_slug: slug });
      if (error || !data) throw new Error("Tostería no encontrada");
      return data as ShopPublic;
    },
  },
  products: {
    list: async (search?: string) => {
      const uid = await currentUserId();
      let q = supabase.from("products").select("*", { count: "exact" }).eq("user_id", uid);
      if (search) q = q.ilike("name", `%${search}%`);
      const { data, error, count } = await q.order("name").range(0, 99);
      raise(error);
      return { items: (data ?? []) as Product[], total: count ?? 0 };
    },
    get: (id: string) => getOwned<Product>("products", id),
    create: (data: ProductCreate) => createOwned<Product>("products", data),
    update: (id: string, data: Partial<ProductCreate>) => updateOwned<Product>("products", id, data),
    adjustStock: async (id: string, delta: number) => {
      const current = await getOwned<Product>("products", id);
      return updateOwned<Product>("products", id, { stock_quantity: Number(current.stock_quantity) + delta });
    },
    delete: (id: string) => deleteOwned("products", id),
  },
  profile: {
    getBusiness: async () => {
      const uid = await currentUserId();
      const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).single();
      raise(error);
      return data as BusinessProfile;
    },
    updateBusiness: async (data: Partial<BusinessProfile>) => {
      const uid = await currentUserId();
      const { data: updated, error } = await supabase
        .from("profiles")
        .update(data)
        .eq("id", uid)
        .select()
        .single();
      raise(error);
      return updated as BusinessProfile;
    },
  },
  documents: {
    list: async (params?: { doc_type?: string; status?: string; limit?: number; offset?: number }) => {
      const uid = await currentUserId();
      const limit = params?.limit ?? 50;
      const offset = params?.offset ?? 0;
      let q = supabase.from("documents").select("*", { count: "exact" }).eq("user_id", uid);
      if (params?.doc_type) q = q.eq("doc_type", params.doc_type);
      if (params?.status) q = q.eq("status", params.status);
      const { data, error, count } = await q.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
      raise(error);
      return { items: (data ?? []) as Document_[], total: count ?? 0 };
    },
    get: (id: string) => getOwned<Document_>("documents", id),
    create: (data: DocumentCreate) => createOwned<Document_>("documents", data),
    update: (id: string, data: Partial<DocumentCreate>) => updateOwned<Document_>("documents", id, { ...data, updated_at: new Date().toISOString() }),
    delete: (id: string) => deleteOwned("documents", id),
    nextNumber: async (doc_type: string) => {
      const { data, error } = await supabase.rpc("next_document_number", {
        p_doc_type: doc_type,
        p_year: new Date().getFullYear(),
      });
      raise(error);
      return { doc_number: data as string };
    },
  },
};

async function computeFinanceDashboard(days: number): Promise<FinanceDashboard> {
  const uid = await currentUserId();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const [purchasesRes, salesRes, roastsRes, allPurchasesRes, allRoastsRes, allSalesRes] = await Promise.all([
    supabase.from("purchases").select("kg_purchased,price_per_kg,purchase_date").eq("user_id", uid).gte("purchase_date", sinceStr),
    supabase.from("sales").select("kg_sold,price_per_kg,sale_date").eq("user_id", uid).gte("sale_date", sinceStr),
    supabase.from("roasts").select("green_weight_g,roasted_weight_g,roast_date").eq("user_id", uid).gte("roast_date", sinceStr),
    supabase.from("purchases").select("kg_purchased").eq("user_id", uid),
    supabase.from("roasts").select("green_weight_g,roasted_weight_g").eq("user_id", uid),
    supabase.from("sales").select("kg_sold").eq("user_id", uid),
  ]);
  [purchasesRes, salesRes, roastsRes, allPurchasesRes, allRoastsRes, allSalesRes].forEach((r) => raise(r.error));

  const purchases = (purchasesRes.data ?? []) as { kg_purchased: number; price_per_kg: number; purchase_date: string }[];
  const sales = (salesRes.data ?? []) as { kg_sold: number; price_per_kg: number; sale_date: string }[];
  const roasts = (roastsRes.data ?? []) as { green_weight_g: number | null; roasted_weight_g: number | null; roast_date: string }[];

  const totalPurchasedKg = purchases.reduce((s, p) => s + Number(p.kg_purchased), 0);
  const totalPurchasedCost = purchases.reduce((s, p) => s + Number(p.kg_purchased) * Number(p.price_per_kg), 0);
  const avgCostPerKgVerde = totalPurchasedKg > 0 ? totalPurchasedCost / totalPurchasedKg : 0;

  const yieldRoasts = roasts.filter((r) => r.green_weight_g && r.roasted_weight_g && r.green_weight_g > 0);
  const avgYieldPct = yieldRoasts.length
    ? yieldRoasts.reduce((s, r) => s + (r.roasted_weight_g as number) / (r.green_weight_g as number), 0) / yieldRoasts.length
    : 0;
  const totalRoastedKg = roasts.reduce((s, r) => s + (r.roasted_weight_g ?? 0) / 1000, 0);
  const costPerKgRoasted = avgYieldPct > 0 ? avgCostPerKgVerde / avgYieldPct : 0;

  const totalSoldKg = sales.reduce((s, sl) => s + Number(sl.kg_sold), 0);
  const totalRevenue = sales.reduce((s, sl) => s + Number(sl.kg_sold) * Number(sl.price_per_kg), 0);

  const proportionalVerdeCost = totalPurchasedKg > 0 ? (totalSoldKg / totalPurchasedKg) * totalPurchasedCost : 0;
  const grossMargin = totalRevenue - proportionalVerdeCost;
  const grossMarginPct = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;

  const allPurchasedKg = ((allPurchasesRes.data ?? []) as { kg_purchased: number }[]).reduce((s, p) => s + Number(p.kg_purchased), 0);
  const allRoastsRows = (allRoastsRes.data ?? []) as { green_weight_g: number | null; roasted_weight_g: number | null }[];
  const allGreenUsedKg = allRoastsRows.reduce((s, r) => s + (r.green_weight_g ?? 0), 0) / 1000;
  const allRoastedKg = allRoastsRows.reduce((s, r) => s + (r.roasted_weight_g ?? 0), 0) / 1000;
  const allSoldKg = ((allSalesRes.data ?? []) as { kg_sold: number }[]).reduce((s, sl) => s + Number(sl.kg_sold), 0);

  const stockVerdeKg = Math.max(0, allPurchasedKg - allGreenUsedKg);
  const stockRoastedKg = Math.max(0, allRoastedKg - allSoldKg);

  const weeklySummary: WeekSummary[] = [];
  const today = new Date();
  const dayOfWeek = (today.getDay() + 6) % 7;
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - dayOfWeek);

  for (let i = 0; i < 8; i++) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const inRange = (d: string) => {
      const dt = new Date(d + "T00:00:00");
      return dt >= weekStart && dt <= weekEnd;
    };
    weeklySummary.push({
      week_start: weekStart.toISOString().slice(0, 10),
      purchased_cost: purchases.filter((p) => inRange(p.purchase_date)).reduce((s, p) => s + Number(p.kg_purchased) * Number(p.price_per_kg), 0),
      revenue: sales.filter((s) => inRange(s.sale_date)).reduce((s, sl) => s + Number(sl.kg_sold) * Number(sl.price_per_kg), 0),
      roasted_kg: roasts.filter((r) => inRange(r.roast_date)).reduce((s, r) => s + (r.roasted_weight_g ?? 0) / 1000, 0),
      sold_kg: sales.filter((s) => inRange(s.sale_date)).reduce((s, sl) => s + Number(sl.kg_sold), 0),
    });
  }
  weeklySummary.reverse();

  return {
    period_days: days,
    total_purchased_kg: totalPurchasedKg,
    total_purchased_cost: totalPurchasedCost,
    avg_cost_per_kg_verde: avgCostPerKgVerde,
    total_roasted_kg: totalRoastedKg,
    avg_yield_pct: avgYieldPct,
    cost_per_kg_roasted: costPerKgRoasted,
    total_sold_kg: totalSoldKg,
    total_revenue: totalRevenue,
    gross_margin: grossMargin,
    gross_margin_pct: grossMarginPct,
    stock_verde_kg: stockVerdeKg,
    stock_roasted_kg: stockRoastedKg,
    weekly_summary: weeklySummary,
  };
}

async function computeInventorySummary(): Promise<InventorySummary> {
  const uid = await currentUserId();
  const [purchasesRes, roastsRes, salesRes] = await Promise.all([
    supabase.from("purchases").select("bean_origin,kg_purchased").eq("user_id", uid),
    supabase.from("roasts").select("id,bean_origin,roast_date,roasted_weight_g,green_weight_g,roast_level,created_at").eq("user_id", uid),
    supabase.from("sales").select("kg_sold").eq("user_id", uid),
  ]);
  [purchasesRes, roastsRes, salesRes].forEach((r) => raise(r.error));

  const purchases = (purchasesRes.data ?? []) as { bean_origin: string | null; kg_purchased: number }[];
  const roasts = (roastsRes.data ?? []) as {
    id: string; bean_origin: string; roast_date: string; roasted_weight_g: number | null;
    green_weight_g: number | null; roast_level: string; created_at: string;
  }[];
  const sales = (salesRes.data ?? []) as { kg_sold: number }[];

  const totalPurchased = purchases.reduce((s, p) => s + Number(p.kg_purchased), 0);
  const totalGreenUsedKg = roasts.reduce((s, r) => s + (r.green_weight_g ?? 0), 0) / 1000;
  const totalRoastedKg = roasts.reduce((s, r) => s + (r.roasted_weight_g ?? 0), 0) / 1000;
  const totalSold = sales.reduce((s, sl) => s + Number(sl.kg_sold), 0);

  const stockVerdeKg = totalPurchased - totalGreenUsedKg;
  const stockTostadoKg = totalRoastedKg - totalSold;

  const byOriginMap = new Map<string, number>();
  for (const p of purchases) {
    const origin = p.bean_origin ?? "Sin origen";
    byOriginMap.set(origin, (byOriginMap.get(origin) ?? 0) + Number(p.kg_purchased));
  }
  const roastedByOrigin = new Map<string, number>();
  for (const r of roasts) {
    roastedByOrigin.set(r.bean_origin, (roastedByOrigin.get(r.bean_origin) ?? 0) + (r.roasted_weight_g ?? 0) / 1000);
  }
  const byOrigin = Array.from(byOriginMap.entries()).map(([origin, verdeKg]) => ({
    origin,
    verde_kg: Math.round(verdeKg * 1000) / 1000,
    tostado_kg: Math.round((roastedByOrigin.get(origin) ?? 0) * 1000) / 1000,
  }));

  const recentRoasts = [...roasts]
    .sort((a, b) => (a.roast_date < b.roast_date ? 1 : a.roast_date > b.roast_date ? -1 : (a.created_at < b.created_at ? 1 : -1)))
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      bean_origin: r.bean_origin,
      roast_date: r.roast_date,
      roasted_weight_g: r.roasted_weight_g,
      roast_level: r.roast_level,
    }));

  return {
    stock_verde_kg: Math.round(stockVerdeKg * 1000) / 1000,
    stock_tostado_kg: Math.round(stockTostadoKg * 1000) / 1000,
    stock_vendido_kg: Math.round(totalSold * 1000) / 1000,
    by_origin: byOrigin,
    recent_roasts: recentRoasts,
    low_stock_alert: stockTostadoKg < 5.0,
  };
}

export interface AdminUser {
  id: string;
  email: string;
  roastery_name: string;
  is_beta: boolean;
  is_admin: boolean;
  is_active: boolean;
  plan_tier: "beta" | "pro" | "enterprise";
  email_verified: boolean;
  roast_count: number;
  created_at: string;
  last_active_at: string | null;
  subscription_expires_at: string | null;
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
  recent_roasts: { id: string; bean_origin: string; roast_date: string; roasted_weight_g: number | null; roast_level: string }[];
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
  roastery_slug?: string;
  whatsapp_number?: string;
  shop_theme?: ShopTheme;
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
  roastery_slug?: string;
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

export interface ShopTheme {
  primary_color: string;
  accent_color: string;
  bg_color: string;
  text_color: string;
  font_family: "sans" | "serif" | "mono";
  layout: "list" | "grid";
  about_text?: string;
  banner_image?: string;
  instagram_url?: string;
  facebook_url?: string;
}

export interface ShopProduct {
  id: string;
  name: string;
  description?: string;
  unit: string;
  price: number;
  stock_quantity: number;
}

export interface ShopPublic {
  roastery_name: string;
  roastery_slug: string;
  business_city?: string;
  business_country?: string;
  business_logo?: string;
  business_website?: string;
  whatsapp_number?: string;
  theme: ShopTheme;
  products: ShopProduct[];
}
