import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type InventorySummary, type Product, type ProductCreate } from "../lib/api";
import AppLayout from "../components/AppLayout";

// ── helpers ───────────────────────────────────────────────────────────────────

const UNITS = ["unidad", "kg", "g", "lb", "bolsa", "caja", "paquete", "servicio"];

const inp =
  "w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 focus:border-transparent transition-all";

function stockColor(qty: number) {
  if (qty <= 0) return "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400";
  if (qty < 5) return "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400";
  return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400";
}

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;
const levelLabel: Record<string, string> = { light: "Claro", medium: "Medio", dark: "Oscuro" };

// ── Coffee stock summary ───────────────────────────────────────────────────────

function CoffeeStockSection() {
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.inventory.summary()
      .then(setSummary)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error al cargar"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="animate-pulse space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800" />)}
      </div>
    </div>
  );

  if (error || !summary) return (
    <p className="text-sm text-red-600 dark:text-red-400">{error ?? "Error desconocido"}</p>
  );

  return (
    <div className="space-y-3">
      <div className="relative rounded-2xl overflow-hidden h-28">
        <img
          src="/images/coffee-beans.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-amber-950/75 to-amber-900/40 flex items-center px-5">
          <div>
            <p className="text-white font-bold text-lg leading-tight">Stock de Café</p>
            <p className="text-white/70 text-xs mt-0.5">Verde · Tostado · Vendido</p>
          </div>
        </div>
      </div>

      {summary.low_stock_alert && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-xl shrink-0">⚠️</span>
          <p className="text-sm text-red-700 dark:text-red-400 font-medium">
            Stock bajo — menos de 5 kg tostado disponible
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 text-center">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Verde</p>
          <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">{summary.stock_verde_kg.toFixed(1)}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">kg disp.</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-center">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Tostado</p>
          <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">{summary.stock_tostado_kg.toFixed(1)}</p>
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">kg disp.</p>
        </div>
        <div className="bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-4 text-center">
          <p className="text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Vendido</p>
          <p className="text-2xl font-bold text-stone-700 dark:text-stone-200">{summary.stock_vendido_kg.toFixed(1)}</p>
          <p className="text-xs text-stone-500 dark:text-stone-500 mt-0.5">kg total</p>
        </div>
      </div>

      {summary.by_origin.length > 0 && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Por origen</h3>
          </div>
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            <div className="grid grid-cols-3 text-xs font-medium text-stone-400 dark:text-stone-500 px-4 py-2">
              <span>Origen</span>
              <span className="text-right">Verde (kg)</span>
              <span className="text-right">Tostado (kg)</span>
            </div>
            {summary.by_origin.map((row) => (
              <div key={row.origin} className="grid grid-cols-3 text-sm px-4 py-3">
                <span className="text-stone-900 dark:text-stone-100 truncate pr-2">{row.origin}</span>
                <span className="text-right text-emerald-700 dark:text-emerald-400 font-medium">{row.verde_kg.toFixed(2)}</span>
                <span className="text-right text-amber-700 dark:text-amber-400 font-medium">{row.tostado_kg.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.recent_roasts.length > 0 && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Últimos tuestes</h3>
          </div>
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {summary.recent_roasts.map((r) => (
              <Link
                key={r.id}
                to={`/roasts/${r.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors group"
              >
                <div>
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{r.bean_origin}</p>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{r.roast_date} · {levelLabel[r.roast_level] ?? r.roast_level}</p>
                </div>
                <div className="text-right">
                  {r.roasted_weight_g && (
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                      {(r.roasted_weight_g / 1000).toFixed(2)} kg
                    </p>
                  )}
                  <span className="text-xs text-stone-300 dark:text-stone-600 group-hover:text-amber-500 transition-colors">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Product catalog ────────────────────────────────────────────────────────────

function ProductCatalogSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState("unidad");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [saving, setSaving] = useState(false);

  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  function load(q?: string) {
    setLoading(true);
    api.products.list(q).then((r) => setProducts(r.items)).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setName(""); setDescription(""); setSku(""); setUnit("unidad"); setPrice(""); setStock("");
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setName(p.name);
    setDescription(p.description ?? "");
    setSku(p.sku ?? "");
    setUnit(p.unit);
    setPrice(String(p.price));
    setStock(String(p.stock_quantity));
    setShowForm(true);
    setAdjustId(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: ProductCreate = {
      name,
      description: description || undefined,
      sku: sku || undefined,
      unit,
      price: Number(price) || 0,
      stock_quantity: Number(stock) || 0,
    };
    try {
      if (editing) {
        const updated = await api.products.update(editing.id, payload);
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const created = await api.products.create(payload);
        setProducts((prev) => [...prev, created]);
      }
      setShowForm(false);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este producto?")) return;
    try {
      await api.products.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error al eliminar");
    }
  }

  async function handleAdjust(p: Product) {
    const delta = Number(adjustDelta);
    if (isNaN(delta) || delta === 0) return;
    setAdjusting(true);
    try {
      const updated = await api.products.update(p.id, {
        stock_quantity: Number(p.stock_quantity) + delta,
      });
      setProducts((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setAdjustId(null);
      setAdjustDelta("");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error al ajustar");
    } finally {
      setAdjusting(false);
    }
  }

  const filtered = search
    ? products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : products;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Catálogo de productos</h2>
        <button
          onClick={openNew}
          className="bg-amber-800 dark:bg-amber-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors"
        >
          + Nuevo
        </button>
      </div>

      {/* Search */}
      {products.length > 3 && (
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o SKU..."
          className={`${inp} mb-3`}
        />
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-amber-300 dark:border-amber-600 p-5 mb-4 shadow-sm">
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-4">
            {editing ? "Editar producto" : "Nuevo producto"}
          </h3>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Nombre *</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inp} placeholder="Café Ethiopia 250g" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Precio</label>
                <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={inp} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Stock</label>
                <input type="number" min="0" step="0.001" value={stock} onChange={(e) => setStock(e.target.value)} className={inp} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Unidad</label>
                <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inp}>
                  {UNITS.map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">SKU</label>
                <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className={inp} placeholder="ETH-250" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Descripción</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className={inp} placeholder="Opcional" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-xl py-2.5 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 bg-amber-800 dark:bg-amber-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors disabled:opacity-50">
                {saving ? "Guardando..." : editing ? "Guardar" : "Crear"}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10">
          <div className="text-4xl mb-3">📦</div>
          <p className="text-stone-500 dark:text-stone-400 text-sm font-medium">
            {search ? "Sin resultados" : "Sin productos aún"}
          </p>
          {!search && (
            <button onClick={openNew}
              className="mt-4 bg-amber-800 dark:bg-amber-600 text-white rounded-xl px-5 py-2 text-sm font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors">
              + Nuevo producto
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-stone-50 dark:bg-stone-800 flex items-center justify-center text-lg shrink-0">📦</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-stone-900 dark:text-stone-100 text-sm">{p.name}</p>
                    {p.sku && <span className="text-xs text-stone-400 dark:text-stone-500 font-mono">{p.sku}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-stone-500 dark:text-stone-400">{fmt(p.price)} / {p.unit}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stockColor(p.stock_quantity)}`}>
                      {p.stock_quantity <= 0 ? "Sin stock" : `${p.stock_quantity} ${p.unit}`}
                    </span>
                  </div>
                </div>
              </div>

              {adjustId === p.id ? (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-stone-500 dark:text-stone-400">Ajuste (+ agregar / − quitar):</span>
                  <input
                    type="number"
                    step="0.001"
                    value={adjustDelta}
                    onChange={(e) => setAdjustDelta(e.target.value)}
                    placeholder="+5 ó -3"
                    className="w-28 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") handleAdjust(p); if (e.key === "Escape") { setAdjustId(null); setAdjustDelta(""); } }}
                  />
                  <button
                    onClick={() => handleAdjust(p)}
                    disabled={adjusting}
                    className="text-xs font-medium bg-amber-800 text-white rounded-lg px-3 py-1.5 hover:bg-amber-900 transition-colors disabled:opacity-50"
                  >
                    {adjusting ? "..." : "Aplicar"}
                  </button>
                  <button
                    onClick={() => { setAdjustId(null); setAdjustDelta(""); }}
                    className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => { setShowForm(false); setAdjustId(p.id); setAdjustDelta(""); }}
                    className="flex-1 text-center text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg py-1.5 transition-colors"
                  >
                    ± Ajustar stock
                  </button>
                  <button
                    onClick={() => openEdit(p)}
                    className="flex-1 text-center text-xs font-medium text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg py-1.5 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="px-3 text-xs font-medium text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/60 rounded-lg py-1.5 transition-colors"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

type StockTab = "cafe" | "productos";

export default function InventoryPage() {
  const [tab, setTab] = useState<StockTab>("cafe");

  return (
    <AppLayout active="inventario">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-8 lg:py-8">
        <header className="mb-5">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Inventario</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Stock de café y catálogo de productos</p>
        </header>

        <div className="flex bg-stone-100 dark:bg-stone-800 rounded-xl p-1 mb-5">
          {([
            { id: "cafe" as StockTab, label: "☕ Café" },
            { id: "productos" as StockTab, label: "📦 Productos" },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "cafe" ? <CoffeeStockSection /> : <ProductCatalogSection />}
      </div>
    </AppLayout>
  );
}
