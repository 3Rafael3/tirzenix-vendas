import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] as const }}
    >
      {children}
    </motion.div>
  );
}
