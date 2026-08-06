import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type AdminUser } from "../lib/api";
import { useAuth } from "../lib/auth";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Stats {
  total_users: number;
  total_roasts: number;
  verified_users: number;
  beta_users: number;
}

const PLAN_LABELS: Record<string, string> = { beta: "Beta", pro: "Pro", enterprise: "Enterprise" };
const PLAN_COLORS: Record<string, string> = {
  beta: "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400",
  pro: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400",
  enterprise: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400",
};

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [settingPlan, setSettingPlan] = useState<string | null>(null);
  const { logout } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    Promise.all([api.admin.stats(), api.admin.users()])
      .then(([s, u]) => { setStats(s); setUsers(u); })
      .finally(() => setLoading(false));
  }, []);

  const handleImpersonate = async (user: AdminUser) => {
    setImpersonating(user.id);
    try {
      const res = await api.admin.impersonate(user.id);
      window.open(res.action_link, "_blank", "noopener,noreferrer");
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setImpersonating(null);
    }
  };

  const handleToggle = async (user: AdminUser) => {
    const action = user.is_active ? "suspender" : "activar";
    if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} la cuenta de ${user.roastery_name}?`)) return;
    setToggling(user.id);
    try {
      const updated = await api.admin.toggle(user.id);
      setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setToggling(null);
    }
  };

  const handlePlanChange = async (user: AdminUser, newPlan: string) => {
    setSettingPlan(user.id);
    try {
      const updated = await api.admin.setPlan(user.id, newPlan);
      setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSettingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Administración</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Panel de control SaaS</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => nav("/")}
              className="text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
            >
              ← Mi dashboard
            </button>
            <button
              onClick={() => { logout(); nav("/login"); }}
              className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
            >
              Salir
            </button>
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 animate-pulse h-20" />
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <StatCard label="Usuarios" value={stats.total_users} />
            <StatCard label="Tuestes" value={stats.total_roasts} />
            <StatCard label="Verificados" value={stats.verified_users} />
            <StatCard label="Beta" value={stats.beta_users} />
          </div>
        )}

        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            Cuentas registradas
          </h2>
          <span className="text-xs text-stone-400 dark:text-stone-500">{users.length}</span>
        </div>

        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className={`bg-white dark:bg-stone-900 rounded-2xl border p-4 ${
                u.is_active
                  ? "border-stone-200 dark:border-stone-800"
                  : "border-red-200 dark:border-red-900/50 opacity-75"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="font-medium text-stone-900 dark:text-stone-100 truncate">{u.roastery_name}</p>
                    {u.is_admin && (
                      <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium">
                        admin
                      </span>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${PLAN_COLORS[u.plan_tier] ?? PLAN_COLORS.beta}`}>
                      {PLAN_LABELS[u.plan_tier] ?? u.plan_tier}
                    </span>
                    {!u.is_active && (
                      <span className="text-xs bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full font-medium">
                        suspendido
                      </span>
                    )}
                    {!u.email_verified && (
                      <span className="text-xs bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 px-1.5 py-0.5 rounded-full">
                        sin verificar
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{u.email}</p>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                    {u.roast_count} tueste{u.roast_count !== 1 ? "s" : ""} · desde{" "}
                    {format(new Date(u.created_at), "d MMM yyyy", { locale: es })}
                    {u.last_active_at && (
                      <> · activo {format(new Date(u.last_active_at), "d MMM", { locale: es })}</>
                    )}
                  </p>
                </div>

                {!u.is_admin && (
                  <div className="flex flex-col gap-2 shrink-0 items-end">
                    <button
                      onClick={() => handleImpersonate(u)}
                      disabled={impersonating === u.id || !u.is_active}
                      className="text-xs bg-amber-800 dark:bg-amber-600 text-white px-3 py-1.5 rounded-xl hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors disabled:opacity-40 font-medium"
                    >
                      {impersonating === u.id ? "..." : "Ver como"}
                    </button>
                    <button
                      onClick={() => handleToggle(u)}
                      disabled={toggling === u.id}
                      className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors disabled:opacity-40 ${
                        u.is_active
                          ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60"
                          : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/60"
                      }`}
                    >
                      {toggling === u.id ? "..." : u.is_active ? "Suspender" : "Activar"}
                    </button>
                  </div>
                )}
              </div>

              {!u.is_admin && (
                <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center gap-3">
                  <span className="text-xs text-stone-400 dark:text-stone-500">Plan:</span>
                  <select
                    value={u.plan_tier}
                    disabled={settingPlan === u.id}
                    onChange={(e) => handlePlanChange(u, e.target.value)}
                    className="text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1 text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:opacity-50"
                  >
                    <option value="beta">Beta</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                  {settingPlan === u.id && (
                    <span className="text-xs text-stone-400 dark:text-stone-500">Guardando...</span>
                  )}
                  {u.subscription_expires_at && (
                    <span className="text-xs text-stone-400 dark:text-stone-500">
                      vence {format(new Date(u.subscription_expires_at), "d MMM yyyy", { locale: es })}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 text-center">
      <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{value}</p>
      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{label}</p>
    </div>
  );
}
