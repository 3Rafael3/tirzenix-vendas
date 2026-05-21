import { create } from "zustand";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "info" | "warn" | "error";
interface ToastItem {
  id: string;
  kind: ToastKind;
  msg: string;
}

interface ToastStore {
  items: ToastItem[];
  push: (kind: ToastKind, msg: string) => void;
  dismiss: (id: string) => void;
}

export const useToast = create<ToastStore>((set) => ({
  items: [],
  push: (kind, msg) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ items: [...s.items, { id, kind, msg }] }));
    setTimeout(() => {
      set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
    }, 3500);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));

export const toast = {
  success: (m: string) => useToast.getState().push("success", m),
  info: (m: string) => useToast.getState().push("info", m),
  warn: (m: string) => useToast.getState().push("warn", m),
  error: (m: string) => useToast.getState().push("error", m),
};

const accentBar: Record<ToastKind, string> = {
  success: "bg-emerald-500",
  info: "bg-sky-500",
  warn: "bg-gold-500",
  error: "bg-rose-500",
};

const Icons: Record<ToastKind, React.ComponentType<any>> = {
  success: CheckCircle2,
  info: Info,
  warn: AlertTriangle,
  error: AlertTriangle,
};

const iconColor: Record<ToastKind, string> = {
  success: "text-emerald-400",
  info: "text-sky-400",
  warn: "text-gold-400",
  error: "text-rose-400",
};

export function Toaster() {
  const { items, dismiss } = useToast();
  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 w-80 pointer-events-none">
      <AnimatePresence>
        {items.map((t) => {
          const I = Icons[t.kind];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              className={cn(
                "pointer-events-auto relative flex items-start gap-3 rounded-xl border border-gold-900/40 px-4 py-3 shadow-ring overflow-hidden",
                "bg-ink-900/95 backdrop-blur-xl text-silver-100"
              )}
            >
              <span className={cn("absolute left-0 top-0 bottom-0 w-1", accentBar[t.kind])} />
              <I size={18} className={cn("mt-0.5 shrink-0", iconColor[t.kind])} />
              <p className="text-sm font-medium leading-snug flex-1">{t.msg}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="text-silver-500 hover:text-gold-300 transition"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
