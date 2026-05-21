import { useEffect } from "react";
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
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  footer,
}: ModalProps) {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className={cn(
              "relative w-full max-h-[calc(100vh-1.5rem)] bg-ink-900/95 backdrop-blur-xl rounded-2xl shadow-ring border border-gold-800/30 overflow-hidden",
              sizes[size]
            )}
          >
            {/* gold accent bar */}
            <div className="absolute top-0 inset-x-0 h-px bg-gold-gradient" />

            {(title || description) && (
              <div className="flex items-start justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5 border-b border-ink-700/60">
                <div className="min-w-0">
                  {title && (
                    <h2 className="font-display text-xl font-semibold text-silver-50 tracking-wide">
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
            <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">{children}</div>
            {footer && (
              <div className="flex flex-col-reverse gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6 bg-ink-950/60 border-t border-ink-700/60 [&>*]:w-full sm:[&>*]:w-auto">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
