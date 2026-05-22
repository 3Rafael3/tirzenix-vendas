import { motion, type Variants } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

export const entranceContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.06,
    },
  },
};

export const entranceItem: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: EASE },
  },
};

/**
 * Wrapper que aplica a coreografia de entrada da página.
 * Use envolvendo seções importantes para um reveal cascateado luxuoso.
 */
export function PageEntrance({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={entranceContainer}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function EntranceItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={entranceItem} className={className}>
      {children}
    </motion.div>
  );
}
