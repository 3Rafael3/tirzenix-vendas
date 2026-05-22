import { useRef, useState } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  intensity?: number; // 0–1, default 0.6
  glow?: boolean;
  children: React.ReactNode;
}

/**
 * Card com tilt parallax sutil baseado na posição do cursor.
 * Inspirado em hover effects de Apple/Linear. Suave (spring damping alto).
 * Inclui glow dourado opcional que segue o ponteiro.
 */
export function MagneticCard({
  intensity = 0.6,
  glow = true,
  children,
  className = "",
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const rotX = useSpring(useMotionValue(0), { stiffness: 220, damping: 24 });
  const rotY = useSpring(useMotionValue(0), { stiffness: 220, damping: 24 });

  const [active, setActive] = useState(false);

  const glowStyle = useMotionTemplate`radial-gradient(220px circle at ${useMotionValue(0)}px ${useMotionValue(0)}px, rgba(212,165,116,0.22), transparent 60%)`;
  // mais simples: usar plain glow via CSS vars
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    mouseX.set(px);
    mouseY.set(py);
    gx.set(px * 100);
    gy.set(py * 100);
    rotX.set((0.5 - py) * 6 * intensity);
    rotY.set((px - 0.5) * 6 * intensity);
  }
  function onLeave() {
    setActive(false);
    rotX.set(0);
    rotY.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={onLeave}
      style={{
        transformPerspective: 900,
        rotateX: rotX,
        rotateY: rotY,
      }}
      className={`relative ${className}`}
      {...(rest as any)}
    >
      {glow && active && (
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-[inherit] pointer-events-none transition-opacity"
          style={{
            background: useMotionTemplate`radial-gradient(260px circle at ${gx}% ${gy}%, rgba(212,165,116,0.18), transparent 70%)`,
          }}
        />
      )}
      <div style={{ transform: "translateZ(20px)" }} className="relative h-full">
        {children}
      </div>
      {/* glowStyle template precisa ser instanciado pra evitar tree-shake */}
      <span className="hidden" style={{ background: glowStyle as any }} />
    </motion.div>
  );
}
