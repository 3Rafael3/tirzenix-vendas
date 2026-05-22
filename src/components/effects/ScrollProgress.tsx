import { motion, useScroll, useSpring } from "framer-motion";

/**
 * Barra dourada no topo da tela mostrando o progresso de scroll vertical.
 * Spring damping suave (não-mecânico).
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    mass: 0.25,
  });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed top-0 inset-x-0 z-[100] h-[2px] bg-gold-gradient origin-left shadow-[0_0_8px_rgba(212,165,116,0.45)]"
    />
  );
}
