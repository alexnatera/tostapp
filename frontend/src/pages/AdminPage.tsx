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

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const { startImpersonation, logout } = useAuth();
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
      startImpersonation(res.access_token, user.roastery_name);
      nav("/");
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setImpersonating(null);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Administración</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Panel de control</p>
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
            Usuarios registrados
          </h2>
          <span className="text-xs text-stone-400 dark:text-stone-500">{users.length}</span>
        </div>

        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className="font-medium text-stone-900 dark:text-stone-100 truncate">{u.roastery_name}</p>
                  {u.is_admin && (
                    <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium">
                      admin
                    </span>
                  )}
                  {!u.email_verified && (
                    <span className="text-xs bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 px-1.5 py-0.5 rounded-full">
                      sin verificar
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{u.email}</p>
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                  {u.roast_count} tueste{u.roast_count !== 1 ? "s" : ""} · registrado{" "}
                  {format(new Date(u.created_at), "d MMM yyyy", { locale: es })}
                </p>
              </div>
              {!u.is_admin && (
                <button
                  onClick={() => handleImpersonate(u)}
                  disabled={impersonating === u.id}
                  className="shrink-0 text-xs bg-amber-800 dark:bg-amber-600 text-white px-3 py-2 rounded-xl hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors disabled:opacity-50 font-medium"
                >
                  {impersonating === u.id ? "..." : "Ver como"}
                </button>
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
