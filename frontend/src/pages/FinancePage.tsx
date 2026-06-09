import { useEffect, useState } from "react";
import { api, type FinanceDashboard, type WeekSummary } from "../lib/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import AppLayout from "../components/AppLayout";

const PERIODS = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${
      accent
        ? "bg-amber-800 dark:bg-amber-700 border-amber-700 dark:border-amber-600 text-white"
        : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800"
    }`}>
      <p className={`text-xs font-medium mb-1 ${accent ? "text-amber-200" : "text-stone-500 dark:text-stone-400"}`}>
        {label}
      </p>
      <p className={`text-xl font-bold ${accent ? "text-white" : "text-stone-900 dark:text-stone-100"}`}>
        {value}
      </p>
      {sub && (
        <p className={`text-xs mt-0.5 ${accent ? "text-amber-200/80" : "text-stone-400 dark:text-stone-500"}`}>
          {sub}
        </p>
      )}
    </div>
  );
}

function WeekBar({ week, maxRevenue }: { week: WeekSummary; maxRevenue: number }) {
  const revPct = maxRevenue > 0 ? (week.revenue / maxRevenue) * 100 : 0;
  const costPct = maxRevenue > 0 ? (week.purchased_cost / maxRevenue) * 100 : 0;
  const label = format(new Date(week.week_start + "T12:00:00"), "d MMM", { locale: es });

  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <div className="w-full flex gap-0.5 items-end h-14">
        <div
          className="flex-1 bg-stone-200 dark:bg-stone-700 rounded-t transition-all"
          style={{ height: `${Math.max(costPct, 4)}%` }}
          title={`Costo: $${week.purchased_cost.toFixed(0)}`}
        />
        <div
          className="flex-1 bg-amber-600 dark:bg-amber-500 rounded-t transition-all"
          style={{ height: `${Math.max(revPct, 4)}%` }}
          title={`Ventas: $${week.revenue.toFixed(0)}`}
        />
      </div>
      <p className="text-xs text-stone-400 dark:text-stone-500 whitespace-nowrap truncate w-full text-center">{label}</p>
    </div>
  );
}

export default function FinancePage() {
  const [data, setData] = useState<FinanceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    api.finance.dashboard(days).then(setData).finally(() => setLoading(false));
  }, [days]);

  return (
    <AppLayout active="finanzas">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-8 lg:py-8">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Finanzas</h1>
          <div className="flex gap-1 bg-stone-100 dark:bg-stone-800 rounded-xl p-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setDays(p.value)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                  days === p.value
                    ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm"
                    : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </header>

        {loading || !data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 animate-pulse">
                  <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-2/3 mb-2" />
                  <div className="h-6 bg-stone-100 dark:bg-stone-800 rounded w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {data.cost_per_kg_roasted > 0 && (
              <StatCard
                label="Costo de producción por kilo"
                value={`$${data.cost_per_kg_roasted.toFixed(2)}`}
                sub={`Rendimiento promedio: ${(data.avg_yield_pct * 100).toFixed(1)}%`}
                accent
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Costo/kg tostado"
                value={data.cost_per_kg_roasted > 0 ? `$${data.cost_per_kg_roasted.toFixed(2)}` : "—"}
                sub={`Verde: $${data.avg_cost_per_kg_verde.toFixed(2)}/kg`}
              />
              <StatCard
                label="Margen bruto"
                value={data.total_revenue > 0 ? `${data.gross_margin_pct.toFixed(1)}%` : "—"}
                sub={data.gross_margin > 0 ? `$${data.gross_margin.toFixed(2)}` : "Sin ventas aún"}
              />
              <StatCard
                label="Stock verde"
                value={`${data.stock_verde_kg.toFixed(1)} kg`}
                sub="Comprado − usado"
              />
              <StatCard
                label="Stock tostado"
                value={`${data.stock_roasted_kg.toFixed(1)} kg`}
                sub="Tostado − vendido"
              />
            </div>

            {/* Bar chart */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-4">Últimas 8 semanas</h2>
              <div className="flex gap-1 items-end h-20 mb-3">
                {(() => {
                  const maxRev = Math.max(...data.weekly_summary.map((w) => Math.max(w.revenue, w.purchased_cost)));
                  return data.weekly_summary.map((week) => (
                    <WeekBar key={week.week_start} week={week} maxRevenue={maxRev} />
                  ));
                })()}
              </div>
              <div className="flex gap-4 text-xs text-stone-500 dark:text-stone-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-stone-300 dark:bg-stone-600 rounded-sm inline-block" />
                  Costo compras
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-amber-600 dark:bg-amber-500 rounded-sm inline-block" />
                  Ingresos
                </span>
              </div>
            </div>

            {/* Summary table */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-3">Resumen del período</h2>
              <div className="space-y-2.5 text-sm">
                {[
                  { label: "Café verde comprado", value: `${data.total_purchased_kg.toFixed(1)} kg` },
                  { label: "Costo total compras", value: `$${data.total_purchased_cost.toFixed(2)}` },
                  { label: "Café tostado", value: `${data.total_roasted_kg.toFixed(1)} kg` },
                  { label: "Café vendido", value: `${data.total_sold_kg.toFixed(1)} kg` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-stone-500 dark:text-stone-400">{label}</span>
                    <span className="font-medium text-stone-900 dark:text-stone-100">{value}</span>
                  </div>
                ))}
                <div className="border-t border-stone-100 dark:border-stone-800 pt-2.5 flex justify-between">
                  <span className="text-stone-500 dark:text-stone-400">Ingresos totales</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">${data.total_revenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 dark:text-stone-400">Margen bruto</span>
                  <span className={`font-bold ${data.gross_margin >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    ${data.gross_margin.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Weekly detail table */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800">
                <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Detalle semanal</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-stone-50 dark:bg-stone-800/50 text-stone-500 dark:text-stone-400">
                      <th className="text-left px-4 py-2.5 font-medium">Semana</th>
                      <th className="text-right px-3 py-2.5 font-medium">Costo</th>
                      <th className="text-right px-3 py-2.5 font-medium">Ingresos</th>
                      <th className="text-right px-4 py-2.5 font-medium">Kg tostado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {data.weekly_summary.map((week) => (
                      <tr key={week.week_start}>
                        <td className="px-4 py-2.5 text-stone-700 dark:text-stone-300">
                          {format(new Date(week.week_start + "T12:00:00"), "d MMM", { locale: es })}
                        </td>
                        <td className="px-3 py-2.5 text-right text-stone-500 dark:text-stone-400">
                          {week.purchased_cost > 0 ? `$${week.purchased_cost.toFixed(0)}` : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-stone-900 dark:text-stone-100">
                          {week.revenue > 0 ? `$${week.revenue.toFixed(0)}` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-stone-500 dark:text-stone-400">
                          {week.roasted_kg > 0 ? week.roasted_kg.toFixed(1) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
