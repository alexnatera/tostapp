import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type Roast } from "../lib/api";
import { useAuth } from "../lib/auth";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const levelEmoji: Record<string, string> = { light: "🌕", medium: "🟠", dark: "⚫" };

export default function DashboardPage() {
  const [roasts, setRoasts] = useState<Roast[]>([]);
  const [loading, setLoading] = useState(true);
  const { roasteryName, logout } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    api.roasts.list().then(setRoasts).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-amber-900">☕ Tostapp</h1>
          {roasteryName && <p className="text-xs text-amber-600">{roasteryName}</p>}
        </div>
        <button onClick={() => { logout(); nav("/login"); }} className="text-xs text-amber-500 hover:text-amber-800">
          Salir
        </button>
      </header>

      <Link
        to="/roasts/new"
        className="block w-full text-center bg-amber-800 text-white rounded-xl py-4 font-semibold text-lg hover:bg-amber-900 transition mb-6"
      >
        + Nuevo tueste
      </Link>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-4 animate-pulse">
              <div className="h-4 bg-amber-100 rounded w-2/3 mb-2" />
              <div className="h-3 bg-amber-50 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : roasts.length === 0 ? (
        <div className="text-center text-amber-400 py-12">
          <p className="text-4xl mb-3">☕</p>
          <p>Aún no tienes tuestes registrados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {roasts.map((r) => (
            <Link
              key={r.id}
              to={`/roasts/${r.id}`}
              className="block bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-amber-900">{r.bean_origin}</p>
                  <p className="text-xs text-amber-500 mt-0.5">
                    {format(new Date(r.roast_date), "d MMM yyyy", { locale: es })} · Lote #{r.batch_number}
                  </p>
                  {r.tasting_notes && (
                    <p className="text-xs text-amber-600 mt-1 italic truncate max-w-xs">{r.tasting_notes}</p>
                  )}
                </div>
                <span className="text-2xl ml-2">{levelEmoji[r.roast_level] ?? "🔵"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
