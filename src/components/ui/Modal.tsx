import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: React.ReactNode;
}

const sizes = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

/** Detecta se a viewport está em "modo mobile" (< 640px). */
function useIsMobile() {
  const [m, setM] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const handler = (e: MediaQueryListEvent) => setM(e.matches);
    setM(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return m;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  footer,
}: ModalProps) {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className={cn(
            "fixed inset-0 z-50 flex",
            isMobile ? "items-end justify-center" : "items-center justify-center p-4"
          )}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />

          {isMobile ? (
            // ─── BOTTOM SHEET (mobile) ────────────────────────────
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 38 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 120 || info.velocity.y > 600) onClose();
              }}
              className="relative w-full bg-ink-900/95 backdrop-blur-xl rounded-t-3xl shadow-ring border-t border-gold-800/30 overflow-hidden max-h-[92vh] flex flex-col pb-safe"
            >
              {/* Handle drag */}
              <div className="pt-2.5 pb-1 grid place-items-center cursor-grab active:cursor-grabbing touch-none">
                <span className="block h-1 w-10 rounded-full bg-gold-700/50" />
              </div>
              <div className="absolute top-0 inset-x-0 h-px bg-gold-gradient" />

              {(title || description) && (
                <div className="flex items-start justify-between gap-4 px-4 pt-2 pb-4 border-b border-ink-700/50">
                  <div className="min-w-0">
                    {title && (
                      <h2 className="font-display text-lg font-semibold text-silver-50">
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p className="text-sm text-silver-400 mt-0.5">{description}</p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="shrink-0 rounded-lg p-1.5 text-silver-400 hover:bg-ink-800 hover:text-gold-300 transition"
                    aria-label="Fechar"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
              <div className="p-4 overflow-y-auto flex-1">{children}</div>
              {footer && (
                <div className="flex flex-col-reverse gap-2 px-4 py-3 bg-ink-950/60 border-t border-ink-700/60 [&>*]:w-full">
                  {footer}
                </div>
              )}
            </motion.div>
          ) : (
            // ─── CENTRADO (desktop) ───────────────────────────────
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              className={cn(
                "relative w-full max-h-[calc(100vh-2rem)] bg-ink-900/95 backdrop-blur-xl rounded-2xl shadow-ring border border-gold-800/30 overflow-hidden flex flex-col",
                sizes[size]
              )}
            >
              <div className="absolute top-0 inset-x-0 h-px bg-gold-gradient" />

              {(title || description) && (
                <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-ink-700/60 shrink-0">
                  <div className="min-w-0">
                    {title && (
                      <h2 className="font-display text-xl font-semibold text-silver-50">
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p className="text-sm text-silver-400 mt-1">{description}</p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="shrink-0 rounded-lg p-1.5 text-silver-400 hover:bg-ink-800 hover:text-gold-300 transition"
                    aria-label="Fechar"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
              <div className="p-6 overflow-y-auto flex-1">{children}</div>
              {footer && (
                <div className="flex items-center justify-end gap-2 px-6 py-4 bg-ink-950/60 border-t border-ink-700/60 shrink-0">
                  {footer}
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
