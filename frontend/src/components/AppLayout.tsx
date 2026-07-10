import { Link, useNavigate } from "react-router-dom";
import {
  Coffee,
  ShoppingCart,
  DollarSign,
  Package,
  Receipt,
  Users,
  BarChart3,
  Factory,
  Sun,
  Moon,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";

type Tab = "tuestes" | "compras" | "ventas" | "crm" | "finanzas" | "documentos" | "inventario";

const NAV: { id: Tab; label: string; icon: LucideIcon; href: string }[] = [
  { id: "tuestes", label: "Tuestes", icon: Coffee, href: "/" },
  { id: "compras", label: "Compras", icon: ShoppingCart, href: "/purchases" },
  { id: "ventas", label: "Ventas", icon: DollarSign, href: "/sales" },
  { id: "inventario", label: "Stock", icon: Package, href: "/inventory" },
  { id: "documentos", label: "Docs", icon: Receipt, href: "/documents" },
  { id: "crm", label: "CRM", icon: Users, href: "/crm" },
  { id: "finanzas", label: "Finanzas", icon: BarChart3, href: "/finance" },
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
            src={isDark ? "/logo-dark.svg" : "/logo.svg"}
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
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  isActive
                    ? "bg-amber-50 dark:bg-amber-900/25 text-amber-900 dark:text-amber-300"
                    : "text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-200"
                }`}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
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
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <Factory className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
            Perfil del negocio
          </Link>
          <button
            onClick={toggle}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {isDark ? (
              <Sun className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
            ) : (
              <Moon className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
            )}
            {isDark ? "Modo claro" : "Modo oscuro"}
          </button>
          {isAdmin && !impersonating && (
            <button
              onClick={() => nav("/admin")}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <Settings className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
              Administración
            </button>
          )}
          <button
            onClick={() => { logout(); nav("/login"); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-stone-500 dark:text-stone-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
            Salir
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={`lg:ml-60 min-h-screen ${impersonating ? "pt-8" : ""}`}>
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex z-40 safe-pb">
        {NAV.map((item) => {
          const isActive = active === item.id;
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              to={item.href}
              className={`flex-1 min-h-11 flex flex-col items-center justify-center py-3 gap-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-inset ${
                isActive
                  ? "text-amber-800 dark:text-amber-400"
                  : "text-stone-500 dark:text-stone-400"
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-transform duration-150 ${isActive ? "scale-110" : ""}`}
                strokeWidth={2}
              />
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
