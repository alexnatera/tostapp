import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Roast, type FinanceDashboard } from "../lib/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import AppLayout from "../components/AppLayout";

const levelDot: Record<string, string> = {
  light: "bg-yellow-400",
  medium: "bg-orange-500",
  dark: "bg-stone-700 dark:bg-stone-400",
};
const levelLabel: Record<string, string> = { light: "Claro", medium: "Medio", dark: "Oscuro" };

function fmt(n: number, decimals = 1) {
  return n.toLocaleString("es", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 px-4 py-3 flex-1 min-w-0">
      <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-stone-900 dark:text-stone-100 truncate">{value}</p>
      {sub && <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [roasts, setRoasts] = useState<Roast[]>([]);
  const [finance, setFinance] = useState<FinanceDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.roasts.list().then((res) => setRoasts(res.items)),
      api.finance.dashboard(30).then(setFinance).catch(() => null),
    ]).finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout active="tuestes">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-8 lg:py-8">
        <header className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Tuestes</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
              {roasts.length > 0 ? `${roasts.length} registros` : "Sin registros aún"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={api.roasts.exportUrl()}
              download
              className="text-xs font-medium text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl px-3 py-2 transition-colors"
              title="Exportar CSV"
            >
              ⬇ CSV
            </a>
            <Link
              to="/roasts/new"
              className="bg-amber-800 dark:bg-amber-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors shadow-sm"
            >
              + Nuevo
            </Link>
          </div>
        </header>

        {/* KPI summary — last 30 days */}
        {finance && (
          <div className="flex gap-2.5 mb-5 overflow-x-auto pb-0.5">
            <KpiCard
              label="Stock tostado"
              value={`${fmt(finance.stock_roasted_kg)} kg`}
              sub={`${fmt(finance.stock_verde_kg)} kg verde`}
            />
            <KpiCard
              label="Ingresos 30d"
              value={`$${fmt(finance.total_revenue)}`}
              sub={`${fmt(finance.total_sold_kg)} kg vendidos`}
            />
            <KpiCard
              label="Tostado 30d"
              value={`${fmt(finance.total_roasted_kg)} kg`}
              sub={finance.avg_yield_pct > 0 ? `${fmt(finance.avg_yield_pct)}% yield` : undefined}
            />
          </div>
        )}
        {!finance && !loading && null}

        <div className="mb-5">
          <Link
            to="/roasts/import-artisan"
            className="inline-flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 hover:text-amber-800 dark:hover:text-amber-400 transition-colors bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5"
          >
            <span>📂</span>
            Importar .alog desde Artisan
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-stone-200 dark:bg-stone-700 rounded-xl" />
                  <div className="flex-1">
                    <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded-lg w-2/3 mb-2" />
                    <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : roasts.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-6xl mb-5">☕</div>
            <p className="text-stone-600 dark:text-stone-400 font-medium mb-1">Sin tuestes aún</p>
            <p className="text-stone-400 dark:text-stone-500 text-sm">Registra tu primer tueste o importa un archivo de Artisan.</p>
            <Link
              to="/roasts/new"
              className="inline-block mt-4 bg-amber-800 dark:bg-amber-600 text-white rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors"
            >
              + Nuevo tueste
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {roasts.map((r) => (
              <Link
                key={r.id}
                to={`/roasts/${r.id}`}
                className="flex items-center gap-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 hover:border-amber-300 dark:hover:border-stone-700 hover:shadow-sm transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-stone-800 flex items-center justify-center shrink-0">
                  <span className={`w-3 h-3 rounded-full ${levelDot[r.roast_level] ?? "bg-stone-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-900 dark:text-stone-100 truncate">{r.bean_origin}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    {format(new Date(r.roast_date), "d MMM yyyy", { locale: es })}
                    {" · "}Lote #{r.batch_number}
                    {" · "}{levelLabel[r.roast_level]}
                  </p>
                  {r.tasting_notes && (
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-1 italic truncate">{r.tasting_notes}</p>
                  )}
                </div>
                <span className="text-stone-300 dark:text-stone-600 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors text-sm shrink-0">
                  →
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
