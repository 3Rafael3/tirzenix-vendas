import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { Toaster } from "@/components/ui/Toast";
import { CommandPalette } from "@/components/CommandPalette";
import { ScrollProgress } from "@/components/effects/ScrollProgress";
import { FloatingMoneyHost } from "@/components/effects/FloatingMoney";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";

export function AppLayout() {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tirzenix-transfer") !== "export") return;

    const raw = localStorage.getItem("tirzenix-vendas");
    window.opener?.postMessage(
      {
        source: "tirzenix-vendas-transfer",
        type: "local-storage-export",
        raw,
        origin: window.location.origin,
      },
      "*"
    );

    document.body.innerHTML = `
      <div style="min-height:100vh;display:grid;place-items:center;background:#07070a;color:#fbe6b6;font-family:Arial,sans-serif">
        <div style="text-align:center">
          <div style="font-size:20px;font-weight:700;margin-bottom:8px">Transferindo dados Tirzenix...</div>
          <div style="color:#a8a29e;font-size:13px">Esta janela pode fechar automaticamente.</div>
        </div>
      </div>
    `;
    window.setTimeout(() => window.close(), 700);
  }, []);

  return (
    <div className="relative flex min-h-screen overflow-x-hidden">
      {/* fundo decorativo global — preto rico com manchas douradas */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_-10%,rgba(212,165,116,0.10)_0%,transparent_45%),radial-gradient(circle_at_85%_10%,rgba(155,107,70,0.08)_0%,transparent_45%),radial-gradient(circle_at_50%_120%,rgba(122,85,48,0.10)_0%,transparent_55%)]" />
        <div className="absolute inset-0 bg-noise opacity-[0.04] mix-blend-overlay" />
      </div>

      <ScrollProgress />
      <Sidebar />
      <main className="flex-1 min-w-0 lg:pl-72 pt-safe pb-[calc(env(safe-area-inset-bottom)+6rem)] lg:pb-0">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-10 py-4 sm:py-6 lg:py-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] as const }}
            >
              <ErrorBoundary key={location.pathname}>
                <Outlet />
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <MobileNav />
      <Toaster />
      <FloatingMoneyHost />
      <CommandPalette />
    </div>
  );
}
