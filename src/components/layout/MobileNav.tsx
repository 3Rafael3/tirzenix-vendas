import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  CalendarClock,
  Users,
  Boxes,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Início", icon: LayoutDashboard, end: true },
  { to: "/vendas", label: "Vendas", icon: ShoppingCart },
  { to: "/reservas", label: "Reservas", icon: CalendarClock },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/estoque", label: "Estoque", icon: Boxes },
  { to: "/configuracoes", label: "Config", icon: Settings },
];

export function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-ink-950/85 backdrop-blur-xl border-t border-gold-900/30 flex justify-around py-1.5 pb-[env(safe-area-inset-bottom)]">
      {nav.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg text-[9px] min-[380px]:text-[10px] font-medium transition flex-1 min-w-0",
              isActive ? "text-gold-300" : "text-silver-400"
            )
          }
        >
          <Icon size={18} />
          <span className="tracking-wide truncate max-w-full">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
