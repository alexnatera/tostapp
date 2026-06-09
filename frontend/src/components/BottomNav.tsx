import { Link } from "react-router-dom";

type Tab = "tuestes" | "compras" | "ventas" | "crm" | "finanzas";

interface NavItem {
  id: Tab;
  label: string;
  icon: string;
  href: string;
}

const ITEMS: NavItem[] = [
  { id: "tuestes", label: "Tuestes", icon: "☕", href: "/" },
  { id: "compras", label: "Compras", icon: "📦", href: "/purchases" },
  { id: "ventas", label: "Ventas", icon: "💰", href: "/sales" },
  { id: "crm", label: "CRM", icon: "👥", href: "/crm" },
  { id: "finanzas", label: "Finanzas", icon: "📊", href: "/finance" },
];

export default function BottomNav({ active }: { active: Tab }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-amber-100 flex z-50">
      {ITEMS.map((item) => (
        <Link
          key={item.id}
          to={item.href}
          className={`flex-1 flex flex-col items-center py-2.5 text-xs font-medium transition ${
            active === item.id
              ? "text-amber-800"
              : "text-amber-400 hover:text-amber-700"
          }`}
        >
          <span className="text-xl mb-0.5">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
