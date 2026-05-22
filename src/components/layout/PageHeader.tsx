import { motion } from "framer-motion";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const EASE = [0.16, 1, 0.3, 1] as const;

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div>
        <motion.h1
          initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.55, ease: EASE }}
          className="font-display text-3xl lg:text-[2.5rem] leading-[1.05] font-bold tracking-tight-display text-silver-50"
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.08 }}
            className="text-[15px] text-silver-400 mt-2 max-w-xl tracking-tight"
          >
            {subtitle}
          </motion.p>
        )}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 64, opacity: 1 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.18 }}
          className="mt-3 h-px bg-gold-gradient rounded-full"
        />
      </div>
      {actions && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.12 }}
          className="flex flex-wrap items-center gap-2"
        >
          {actions}
        </motion.div>
      )}
    </div>
  );
}
