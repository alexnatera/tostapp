import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Coffee, Package } from "lucide-react";
import { api, type InventorySummary } from "../lib/api";
import AppLayout from "../components/AppLayout";
import ProductCatalogSection from "../components/ProductCatalogSection";

// ── helpers ───────────────────────────────────────────────────────────────────

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
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
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
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">kg total</p>
        </div>
      </div>

      {summary.by_origin.length > 0 && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Por origen</h3>
          </div>
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            <div className="grid grid-cols-3 text-xs font-medium text-stone-500 dark:text-stone-400 px-4 py-2">
              <span>Origen</span>
              <span className="text-right">Verde (kg)</span>
              <span className="text-right">Tostado (kg)</span>
            </div>
            {summary.by_origin.map((row) => (
              <div key={row.origin} className="grid grid-cols-3 text-sm px-4 py-3">
                <span className="text-stone-900 dark:text-stone-100 truncate pr-2" title={row.origin}>{row.origin}</span>
                <span className="text-right text-emerald-700 dark:text-emerald-400 font-medium num">{row.verde_kg.toFixed(2)}</span>
                <span className="text-right text-amber-700 dark:text-amber-400 font-medium num">{row.tostado_kg.toFixed(2)}</span>
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
                className="flex items-center justify-between px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-inset"
              >
                <div>
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{r.bean_origin}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{r.roast_date} · {levelLabel[r.roast_level] ?? r.roast_level}</p>
                </div>
                <div className="text-right flex items-center gap-1">
                  {r.roasted_weight_g && (
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 num">
                      {(r.roasted_weight_g / 1000).toFixed(2)} kg
                    </p>
                  )}
                  <ArrowRight className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400 group-hover:text-amber-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
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

        <div role="tablist" aria-label="Sección de inventario" className="flex bg-stone-100 dark:bg-stone-800 rounded-xl p-1 mb-5">
          {([
            { id: "cafe" as StockTab, label: "Café", Icon: Coffee },
            { id: "productos" as StockTab, label: "Productos", Icon: Package },
          ]).map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 min-h-11 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 ${
                tab === t.id
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              }`}
            >
              <t.Icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "cafe" ? <CoffeeStockSection /> : <ProductCatalogSection />}
      </div>
    </AppLayout>
  );
}
