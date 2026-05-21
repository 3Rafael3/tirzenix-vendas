import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  ShoppingCart,
  CalendarClock,
  Users,
  Boxes,
  FileBarChart,
  Settings,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { BrandMark } from "@/components/brand/BrandMark";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/vendas", label: "Vendas", icon: ShoppingCart },
  { to: "/reservas", label: "Reservas", icon: CalendarClock },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/estoque", label: "Estoque", icon: Boxes },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
  { to: "/guia", label: "Guia", icon: BookOpen },
];

export function Sidebar() {
  const brand = useStore((s) => s.settings.brand);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const updateProgress = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const maxScroll =
          document.documentElement.scrollHeight - window.innerHeight;
        setScrollProgress(
          maxScroll > 0 ? Math.min(window.scrollY / maxScroll, 1) : 1
        );
      });
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 shrink-0 flex-col overflow-x-hidden overflow-y-auto overscroll-contain bg-ink-950/70 backdrop-blur-2xl border-r border-gold-900/20 lg:flex">
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-20 w-px bg-gold-900/30">
        <motion.div
          className="absolute left-0 top-0 w-px bg-gold-gradient shadow-glow-sm"
          style={{ height: `${scrollProgress * 100}%` }}
          transition={{ type: "spring", stiffness: 260, damping: 34 }}
        />
        <motion.div
          className="absolute -left-[3px] size-[7px] rounded-full bg-gold-300 shadow-glow-sm ring-1 ring-gold-100/40"
          style={{ top: `calc(${scrollProgress * 100}% - 3px)` }}
          transition={{ type: "spring", stiffness: 260, damping: 34 }}
        />
      </div>
      {/* glow ornamento */}
      <div className="pointer-events-none absolute -top-32 -left-20 h-72 w-72 rounded-full bg-gold-700/15 blur-[80px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-56 w-56 rounded-full bg-gold-900/15 blur-[80px]" />

      <Link
        to="/"
        className="px-6 pt-8 pb-6 flex items-center gap-3.5 relative group focus:outline-none"
        title="Voltar para o Dashboard"
      >
        <motion.div
          whileHover={{ scale: 1.04, rotate: -3 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 350, damping: 18 }}
        >
          <BrandMark size={44} />
        </motion.div>
        <div className="min-w-0">
          <div className="font-display font-bold text-lg leading-none tracking-tight-display gold-text group-hover:opacity-90 transition">
            {brand.name}
          </div>
          <div className="text-[10px] text-silver-500 tracking-[0.2em] uppercase mt-1.5 group-hover:text-gold-400/80 transition">
            Controle de vendas
          </div>
        </div>
      </Link>

      <div className="mx-6 gold-divider" />

      <nav className="flex-1 px-3 py-5 space-y-0.5">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors",
                isActive ? "text-gold-100" : "text-silver-300 hover:text-silver-50"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-active-bg"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-gold-800/40 via-gold-700/20 to-transparent ring-1 ring-gold-700/40 shadow-glow-sm"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {!isActive && (
                  <span className="absolute inset-0 rounded-xl bg-ink-800/40 opacity-0 group-hover:opacity-100 transition" />
                )}
                {isActive && (
                  <motion.span
                    layoutId="nav-active-dot"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-gold-gradient shadow-glow-sm"
                  />
                )}
                <Icon
                  size={17}
                  className={cn(
                    "relative shrink-0 transition",
                    isActive ? "text-gold-300" : "text-silver-400 group-hover:text-gold-300"
                  )}
                />
                <span className="relative tracking-wide">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mx-4 mb-4 mt-2 p-4 rounded-2xl bg-gradient-to-br from-ink-900 via-ink-850 to-gold-950/40 relative overflow-hidden ring-1 ring-gold-800/30">
        <div className="absolute -top-10 -right-10 size-24 rounded-full bg-gold-600/15 blur-2xl" />
        <div className="flex items-center gap-2 text-gold-400 text-[10px] font-bold uppercase tracking-[0.18em]">
          <Sparkles size={11} />
          <span>{brand.name}</span>
        </div>
        <p className="text-[11px] text-silver-300 leading-snug mt-1.5 font-display italic">
          “{brand.tagline}”
        </p>
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-silver-500">
          <kbd className="px-1.5 py-0.5 rounded bg-ink-800 border border-ink-600 font-sans">⌘K</kbd>
          <span>para comandos</span>
        </div>
      </div>
    </aside>
  );
}
