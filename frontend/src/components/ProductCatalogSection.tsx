import { useEffect, useState } from "react";
import { Package, X } from "lucide-react";
import { api, type Product, type ProductCreate } from "../lib/api";
import IconButton from "./ui/IconButton";
import Field from "./ui/Field";
import { toast } from "../lib/toast";
import { confirmDestructive } from "../lib/confirm";

const UNITS = ["unidad", "kg", "g", "lb", "bolsa", "caja", "paquete", "servicio"];

const inputCls =
  "w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2.5 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 focus:border-transparent transition-all";

function stockColor(qty: number) {
  if (qty <= 0) return "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400";
  if (qty < 5) return "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400";
  return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400";
}

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;

/**
 * Product catalog list + create/edit form + stock adjustment, shared between
 * ProductsPage (rendered as the whole page) and InventoryPage (rendered inside
 * the Café/Productos tab switcher). `variant="page"` renders a page-level
 * header (h1 + subtitle, matching the former standalone ProductsPage), while
 * the default `variant="section"` renders a compact section header (h2,
 * matching the former InventoryPage tab content).
 */
export default function ProductCatalogSection({
  variant = "section",
  title,
  subtitle,
}: {
  variant?: "page" | "section";
  title?: string;
  subtitle?: string;
}) {
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
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirmDestructive("¿Eliminar este producto? Esta acción no se puede deshacer.", "Eliminar producto");
    if (!ok) return;
    try {
      await api.products.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar");
    }
  }

  async function handleAdjust(p: Product) {
    const delta = Number(adjustDelta);
    if (isNaN(delta) || delta === 0) return;
    setAdjusting(true);
    try {
      const updated = await api.products.adjustStock(p.id, delta);
      setProducts((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setAdjustId(null);
      setAdjustDelta("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al ajustar stock");
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

  const headerTitle = title ?? "Catálogo de productos";
  const newButtonCls =
    variant === "page"
      ? "bg-amber-800 dark:bg-amber-600 text-white rounded-xl px-5 py-2.5 min-h-11 text-base font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
      : "bg-amber-800 dark:bg-amber-600 text-white rounded-xl px-4 py-2 min-h-11 text-sm font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1";

  return (
    <div>
      {variant === "page" ? (
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">{headerTitle}</h1>
            {subtitle && <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={openNew} className={newButtonCls}>+ Nuevo</button>
        </header>
      ) : (
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">{headerTitle}</h2>
          <button onClick={openNew} className={newButtonCls}>+ Nuevo</button>
        </div>
      )}

      {/* Search */}
      {products.length > 3 && (
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o SKU..."
          className={`${inputCls} mb-3`}
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
                <Field label="Nombre" required>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Café Ethiopia 250g" />
                </Field>
              </div>
              <Field label="Precio">
                <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} placeholder="0" />
              </Field>
              <Field label="Stock">
                <input type="number" min="0" step="0.001" value={stock} onChange={(e) => setStock(e.target.value)} className={inputCls} placeholder="0" />
              </Field>
              <Field label="Unidad">
                <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls}>
                  {UNITS.map((u) => <option key={u}>{u}</option>)}
                </select>
              </Field>
              <Field label="SKU">
                <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className={inputCls} placeholder="ETH-250" />
              </Field>
              <div className="col-span-2">
                <Field label="Descripción">
                  <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} placeholder="Opcional" />
                </Field>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-xl py-2.5 min-h-11 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 bg-amber-800 dark:bg-amber-600 text-white rounded-xl py-2.5 min-h-11 text-sm font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1">
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
          <Package className="w-10 h-10 mx-auto mb-3 text-stone-500 dark:text-stone-400" />
          <p className="text-stone-500 dark:text-stone-400 text-sm font-medium">
            {search ? "Sin resultados" : "Sin productos aún"}
          </p>
          {!search && (
            <button onClick={openNew}
              className="mt-4 bg-amber-800 dark:bg-amber-600 text-white rounded-xl px-5 py-2 min-h-11 text-sm font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1">
              + Nuevo producto
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-stone-50 dark:bg-stone-800 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-stone-500 dark:text-stone-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-stone-900 dark:text-stone-100 text-sm">{p.name}</p>
                    {p.sku && <span className="text-xs text-stone-500 dark:text-stone-400 font-mono">{p.sku}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      <span className="num">{fmt(p.price)}</span> / {p.unit}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium num ${stockColor(p.stock_quantity)}`}>
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
                    className="w-28 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-3 py-1.5 min-h-11 text-base text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") handleAdjust(p); if (e.key === "Escape") { setAdjustId(null); setAdjustDelta(""); } }}
                  />
                  <button
                    onClick={() => handleAdjust(p)}
                    disabled={adjusting}
                    className="text-xs font-medium bg-amber-800 text-white rounded-lg px-3 min-h-11 hover:bg-amber-900 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
                  >
                    {adjusting ? "..." : "Aplicar"}
                  </button>
                  <button
                    onClick={() => { setAdjustId(null); setAdjustDelta(""); }}
                    className="text-xs text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 min-h-11 px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 rounded-lg"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => { setShowForm(false); setAdjustId(p.id); setAdjustDelta(""); }}
                    className="flex-1 text-center text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg min-h-11 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
                  >
                    ± Ajustar stock
                  </button>
                  <button
                    onClick={() => openEdit(p)}
                    className="flex-1 text-center text-xs font-medium text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg min-h-11 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
                  >
                    Editar
                  </button>
                  <IconButton aria-label="Eliminar producto" variant="danger" onClick={() => handleDelete(p.id)}>
                    <X className="w-4 h-4" />
                  </IconButton>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
