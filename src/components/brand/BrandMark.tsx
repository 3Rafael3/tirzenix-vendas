import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";

interface Props {
  size?: number;
  className?: string;
  animate?: boolean;
  glow?: boolean;
  /** Força usar o SVG padrão mesmo que haja logo personalizada */
  forceDefault?: boolean;
  /** Ignora o multiplicador global do usuário (útil para previews fixos) */
  ignoreScale?: boolean;
}

/**
 * Marca oficial Tirzenix.
 * - Renderiza a logo personalizada se houver (settings.brand.logo)
 * - Aplica o multiplicador global settings.brand.logoScale em todos os pontos
 * - Cai no SVG monograma dourado padrão se não houver logo personalizada
 */
export function BrandMark({
  size = 44,
  className,
  animate = true,
  glow = true,
  forceDefault = false,
  ignoreScale = false,
}: Props) {
  const customLogo = useStore((s) => s.settings.brand.logo);
  const userScale = useStore((s) => s.settings.brand.logoScale ?? 1);
  const scale = ignoreScale ? 1 : clamp(userScale, 0.5, 2);
  const finalSize = Math.round(size * scale);

  const useCustom = !forceDefault && !!customLogo;

  const content = useCustom ? (
    <img
      src={customLogo}
      alt="Tirzenix"
      width={finalSize}
      height={finalSize}
      className="relative z-10 size-full rounded-full object-cover select-none"
      draggable={false}
    />
  ) : (
    <DefaultSvg size={finalSize} />
  );

  return (
    <div
      className={cn(
        "relative grid place-items-center rounded-full bg-ink-950 ring-1 ring-gold-900/30 overflow-hidden shrink-0",
        className
      )}
      style={{ width: finalSize, height: finalSize }}
    >
      {glow && (
        <>
          <div className="absolute inset-0 rounded-full bg-gold-500/15 blur-xl" aria-hidden />
          <motion.div
            className="absolute -top-1/4 -right-1/4 size-1/2 rounded-full bg-gold-100/30 blur-md pointer-events-none"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
        </>
      )}
      {animate ? (
        <motion.div
          initial={{ rotate: -10, scale: 0.85, opacity: 0 }}
          animate={{
            rotate: [0, 0.6, 0, -0.6, 0],
            scale: 1,
            opacity: 1,
          }}
          transition={{
            opacity: { duration: 0.5 },
            scale: { type: "spring", stiffness: 180, damping: 16 },
            rotate: { duration: 18, repeat: Infinity, ease: "easeInOut" },
          }}
          className="grid place-items-center size-full"
        >
          {content}
        </motion.div>
      ) : (
        content
      )}
    </div>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function DefaultSvg({ size }: { size: number }) {
  const uid = `bm-${size}`;
  return (
    <svg viewBox="0 0 256 256" width={size} height={size} className="relative z-10">
      <defs>
        <linearGradient id={`${uid}-ring`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b3f1f" />
          <stop offset="0.22" stopColor="#a07b4b" />
          <stop offset="0.42" stopColor="#e8c896" />
          <stop offset="0.55" stopColor="#fff4d6" />
          <stop offset="0.7" stopColor="#d4a574" />
          <stop offset="1" stopColor="#3a2912" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="0.78" cy="0.16" r="0.34">
          <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="0.5" stopColor="#fff4d6" stopOpacity="0.4" />
          <stop offset="1" stopColor="#fff4d6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-face`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbe6b6" />
          <stop offset="0.35" stopColor="#e8c896" />
          <stop offset="0.6" stopColor="#d4a574" />
          <stop offset="1" stopColor="#7a5530" />
        </linearGradient>
        <linearGradient id={`${uid}-edge`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d4a574" />
          <stop offset="1" stopColor="#5b3f1f" />
        </linearGradient>
        <linearGradient id={`${uid}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff4d6" />
          <stop offset="1" stopColor="#d4a574" />
        </linearGradient>
      </defs>
      <circle cx="128" cy="128" r="106" stroke={`url(#${uid}-ring)`} strokeWidth="3.2" fill="none" />
      <circle cx="128" cy="128" r="106" stroke={`url(#${uid}-glow)`} strokeWidth="4" fill="none" opacity="0.95" />
      <path d="M 74 70 L 124 70 L 124 96 L 92 96 Z" fill={`url(#${uid}-face)`} />
      <path d="M 74 70 L 124 70 L 124 74 L 78 78 Z" fill={`url(#${uid}-shine)`} opacity="0.85" />
      <path d="M 132 70 L 182 70 L 164 96 L 132 96 Z" fill={`url(#${uid}-face)`} />
      <path d="M 132 70 L 182 70 L 178 74 L 132 74 Z" fill={`url(#${uid}-shine)`} opacity="0.85" />
      <path d="M 92 96 L 164 96 L 152 108 L 104 108 Z" fill={`url(#${uid}-edge)`} />
      <path d="M 114 108 L 142 108 L 142 158 L 114 158 Z" fill={`url(#${uid}-face)`} />
      <path d="M 114 108 L 118 108 L 118 158 L 114 158 Z" fill={`url(#${uid}-shine)`} opacity="0.7" />
      <path d="M 96 158 L 170 158 L 158 174 L 96 174 Z" fill={`url(#${uid}-face)`} />
      <path d="M 96 158 L 170 158 L 168 162 L 96 162 Z" fill={`url(#${uid}-shine)`} opacity="0.6" />
      <path d="M 158 174 L 170 174 L 124 200 L 112 192 Z" fill={`url(#${uid}-edge)`} />
      <path d="M 112 192 L 124 200 L 116 200 L 110 196 Z" fill="#7a5530" />
      <path d="M 160 24 Q 206 36 230 78" stroke="#fff4d6" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.7" />
    </svg>
  );
}

export function BrandWordmark({
  size = "text-xl",
  className,
}: {
  size?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-display font-bold tracking-tight-display gold-text",
        size,
        className
      )}
    >
      Tirzenix
    </span>
  );
}
