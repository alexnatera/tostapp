import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";

type Tab = "tuestes" | "compras" | "ventas" | "crm" | "finanzas" | "documentos" | "inventario";

const NAV = [
  { id: "tuestes" as Tab, label: "Tuestes", icon: "☕", href: "/" },
  { id: "compras" as Tab, label: "Compras", icon: "🛒", href: "/purchases" },
  { id: "ventas" as Tab, label: "Ventas", icon: "💰", href: "/sales" },
  { id: "inventario" as Tab, label: "Stock", icon: "📦", href: "/inventory" },
  { id: "documentos" as Tab, label: "Docs", icon: "🧾", href: "/documents" },
  { id: "crm" as Tab, label: "CRM", icon: "👥", href: "/crm" },
  { id: "finanzas" as Tab, label: "Finanzas", icon: "📊", href: "/finance" },
];

interface Props {
  active: Tab;
  children: React.ReactNode;
}

export default function AppLayout({ active, children }: Props) {
  const { roasteryName, isAdmin, impersonating, logout, stopImpersonation } = useAuth();
  const { isDark, toggle } = useTheme();
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      {/* Impersonation banner */}
      {impersonating && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white text-xs px-4 py-2 flex items-center justify-between">
          <span>Viendo como: <strong>{impersonating.targetName}</strong></span>
          <button onClick={stopImpersonation} className="underline ml-4 font-medium">
            Volver a admin
          </button>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed inset-y-0 left-0 w-60 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 z-40 ${impersonating ? "top-8" : "top-0"}`}
      >
        {/* Logo */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800">
          <img
            src={isDark ? `${import.meta.env.BASE_URL}logo-dark.svg` : `${import.meta.env.BASE_URL}logo.svg`}
            alt="Tostapp"
            className="h-9 w-auto"
          />
          {roasteryName && (
            <p className="text-xs text-stone-500 dark:text-stone-400 truncate mt-1.5 pl-0.5">{roasteryName}</p>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const isActive = active === item.id;
            return (
              <Link
                key={item.id}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-amber-50 dark:bg-amber-900/25 text-amber-900 dark:text-amber-300"
                    : "text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-200"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-700 dark:bg-amber-400 shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="px-3 py-3 border-t border-stone-200 dark:border-stone-800 space-y-0.5">
          <Link
            to="/profile"
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition-all"
          >
            <span className="text-base leading-none">🏭</span>
            Perfil del negocio
          </Link>
          <button
            onClick={toggle}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition-all"
          >
            <span className="text-base leading-none">{isDark ? "☀️" : "🌙"}</span>
            {isDark ? "Modo claro" : "Modo oscuro"}
          </button>
          {isAdmin && !impersonating && (
            <button
              onClick={() => nav("/admin")}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition-all"
            >
              <span className="text-base leading-none">⚙️</span>
              Administración
            </button>
          )}
          <button
            onClick={() => { logout(); nav("/login"); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-stone-500 dark:text-stone-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-all"
          >
            <span className="text-base leading-none">→</span>
            Salir
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={`lg:ml-60 min-h-screen ${impersonating ? "pt-8" : ""}`}>
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex z-40">
        {NAV.map((item) => {
          const isActive = active === item.id;
          return (
            <Link
              key={item.id}
              to={item.href}
              className={`flex-1 flex flex-col items-center py-3 gap-0.5 text-xs font-medium transition-colors ${
                isActive
                  ? "text-amber-800 dark:text-amber-400"
                  : "text-stone-400 dark:text-stone-500"
              }`}
            >
              <span
                className={`text-xl leading-none transition-transform duration-150 ${isActive ? "scale-110" : ""}`}
              >
                {item.icon}
              </span>
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
