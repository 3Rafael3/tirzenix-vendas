import { motion } from "framer-motion";
import { useMemo } from "react";

interface Particle {
  id: number;
  left: string;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
}

/**
 * Partículas douradas flutuando lentamente para cima dentro do container.
 * Use absolute/relative pra posicionar. 100% decorativo, pointer-events: none.
 */
export function Sparkles({
  count = 8,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        size: 1 + Math.random() * 2,
        delay: Math.random() * 6,
        duration: 6 + Math.random() * 6,
        opacity: 0.3 + Math.random() * 0.5,
      })),
    [count]
  );

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ opacity: 0, y: 40 }}
          animate={{
            y: -160,
            opacity: [0, p.opacity, p.opacity * 0.8, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute bottom-0 rounded-full"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            background:
              "radial-gradient(circle, #fff4d6 0%, #d4a574 40%, transparent 70%)",
            boxShadow: "0 0 6px rgba(255,244,214,0.6)",
          }}
        />
      ))}
    </div>
  );
}
