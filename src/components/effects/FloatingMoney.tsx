import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { create } from "zustand";
import { formatBRL } from "@/lib/utils";

interface FloatItem {
  id: string;
  value: number;
  x: number; // 0..1
  y: number; // 0..1 (viewport-relative)
  tone: "emerald" | "rose" | "gold";
}

interface Store {
  items: FloatItem[];
  push: (v: number, opts?: { x?: number; y?: number; tone?: FloatItem["tone"] }) => void;
}

const useFloatingMoney = create<Store>((set) => ({
  items: [],
  push: (value, opts = {}) => {
    const id = Math.random().toString(36).slice(2);
    const tone: FloatItem["tone"] = opts.tone ?? (value < 0 ? "rose" : "emerald");
    const item: FloatItem = {
      id,
      value,
      x: opts.x ?? 0.5 + (Math.random() - 0.5) * 0.2,
      y: opts.y ?? 0.5,
      tone,
    };
    set((s) => ({ items: [...s.items, item] }));
    setTimeout(() => {
      set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
    }, 1700);
  },
}));

/** Dispara um "+R$ X" volante. Use após criar vendas, etc. */
export function floatMoney(value: number, opts?: { tone?: FloatItem["tone"] }) {
  useFloatingMoney.getState().push(value, opts);
}

/** Renderiza os itens flutuantes na viewport. Adicionar uma vez no AppLayout. */
export function FloatingMoneyHost() {
  const items = useFloatingMoney((s) => s.items);

  return (
    <div className="fixed inset-0 z-[55] pointer-events-none">
      <AnimatePresence>
        {items.map((it) => (
          <motion.div
            key={it.id}
            initial={{ opacity: 0, y: 0, scale: 0.6 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: -140,
              scale: [0.6, 1.15, 1, 0.95],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
            className="absolute font-display font-bold text-2xl sm:text-3xl tabular-nums font-mono select-none"
            style={{
              left: `${it.x * 100}%`,
              top: `${it.y * 100}%`,
              transform: "translate(-50%, -50%)",
              color:
                it.tone === "rose"
                  ? "#fda4af"
                  : it.tone === "gold"
                  ? "#e8c272"
                  : "#6ee7b7",
              textShadow:
                it.tone === "rose"
                  ? "0 0 24px rgba(244,63,94,0.45), 0 2px 4px rgba(0,0,0,0.6)"
                  : it.tone === "gold"
                  ? "0 0 24px rgba(212,165,116,0.55), 0 2px 4px rgba(0,0,0,0.6)"
                  : "0 0 24px rgba(16,185,129,0.45), 0 2px 4px rgba(0,0,0,0.6)",
            }}
          >
            {it.value >= 0 ? "+" : ""}
            {formatBRL(it.value)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
