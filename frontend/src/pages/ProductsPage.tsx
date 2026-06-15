import { useEffect, useState } from "react";
import { api, type Product } from "../lib/api";
import AppLayout from "../components/AppLayout";

const UNITS = ["unidad", "kg", "g", "lb", "bolsa", "caja", "paquete", "servicio"];

const inputCls =
  "w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 focus:border-transparent transition-all";

function stockColor(qty: number) {
  if (qty <= 0) return "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400";
  if (qty < 5) return "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400";
  return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400";
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState("unidad");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [saving, setSaving] = useState(false);

  // Stock adjust
  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [adjustDelta, setAdjustDelta] = useState("");

  useEffect(() => {
    api.products.list().then((r) => setProducts(r.items)).finally(() => setLoading(false));
  }, []);

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
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
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
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este producto?")) return;
    await api.products.delete(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleAdjust(id: string) {
    const delta = Number(adjustDelta);
    if (isNaN(delta) || delta === 0) return;
    const updated = await api.products.adjustStock(id, delta);
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setAdjustId(null);
    setAdjustDelta("");
  }

  const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;

  return (
    <AppLayout active="documentos">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-8 lg:py-8">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Productos</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
              Catálogo de productos y stock disponible
            </p>
          </div>
          <button
            onClick={openNew}
            className="bg-amber-800 dark:bg-amber-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors shadow-sm"
          >
            + Nuevo
          </button>
        </header>

        {/* Form (inline) */}
        {showForm && (
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-amber-300 dark:border-amber-600 p-5 mb-5 shadow-sm">
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-4">
              {editing ? "Editar producto" : "Nuevo producto"}
            </h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Nombre *</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Café Ethiopia 250g" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Precio</label>
                  <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Stock</label>
                  <input type="number" min="0" step="0.001" value={stock} onChange={(e) => setStock(e.target.value)} className={inputCls} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Unidad</label>
                  <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls}>
                    {UNITS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">SKU</label>
                  <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className={inputCls} placeholder="ETH-250" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Descripción</label>
                  <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} placeholder="Opcional" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-xl py-2.5 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-amber-800 dark:bg-amber-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors disabled:opacity-50">
                  {saving ? "Guardando..." : editing ? "Guardar" : "Crear producto"}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 animate-pulse h-20" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-stone-600 dark:text-stone-400 font-medium mb-1">Sin productos</p>
            <p className="text-stone-400 dark:text-stone-500 text-sm">Agrega tu primer producto al catálogo.</p>
            <button onClick={openNew}
              className="inline-block mt-4 bg-amber-800 dark:bg-amber-600 text-white rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors">
              + Nuevo producto
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((p) => (
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

                {/* Stock adjust inline */}
                {adjustId === p.id ? (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-stone-500 dark:text-stone-400">Ajuste:</span>
                    <input
                      type="number"
                      step="0.001"
                      value={adjustDelta}
                      onChange={(e) => setAdjustDelta(e.target.value)}
                      placeholder="+5 ó -3"
                      className="w-24 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
                      autoFocus
                    />
                    <button onClick={() => handleAdjust(p.id)}
                      className="text-xs font-medium bg-amber-800 text-white rounded-lg px-3 py-1.5 hover:bg-amber-900 transition-colors">
                      Aplicar
                    </button>
                    <button onClick={() => { setAdjustId(null); setAdjustDelta(""); }}
                      className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => { setAdjustId(p.id); setAdjustDelta(""); }}
                      className="flex-1 text-center text-xs font-medium text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg py-1.5 transition-colors">
                      Ajustar stock
                    </button>
                    <button onClick={() => openEdit(p)}
                      className="flex-1 text-center text-xs font-medium text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg py-1.5 transition-colors">
                      Editar
                    </button>
                    <button onClick={() => handleDelete(p.id)}
                      className="px-3 text-xs font-medium text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/60 rounded-lg py-1.5 transition-colors">
                      ×
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
