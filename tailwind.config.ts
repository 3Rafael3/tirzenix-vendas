import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Geist",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        display: [
          "Geist",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "'Geist Mono'",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      letterSpacing: {
        "tightest": "-0.04em",
        "tight-display": "-0.025em",
      },
      colors: {
        // ─── Paleta de marca Tirzenix ────────────────
        ink: {
          950: "#070708",
          900: "#0c0c0f",
          850: "#111116",
          800: "#16161d",
          750: "#1c1c25",
          700: "#23232e",
          600: "#2f2f3b",
          500: "#3d3d4a",
          400: "#52525f",
          300: "#7a7a87",
        },
        gold: {
          50: "#fdf6e6",
          100: "#faebc7",
          200: "#f3d99e",
          300: "#e8c272",
          400: "#dbab53",
          500: "#d4a574",
          600: "#b8865a",
          700: "#9a6c46",
          800: "#7a5530",
          900: "#5b3f1f",
          950: "#3a2912",
        },
        silver: {
          50: "#f7f8fa",
          100: "#e8eaef",
          200: "#d4d8e1",
          300: "#b8bdc9",
          400: "#9aa0b0",
          500: "#7d8394",
          600: "#646a7a",
          700: "#4f5462",
          800: "#3e424d",
          900: "#2d3038",
        },
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(0 0 0 / 0.5), 0 4px 14px -4px rgb(0 0 0 / 0.4)",
        ring: "0 0 0 1px rgb(212 165 116 / 0.12), 0 12px 40px -12px rgb(0 0 0 / 0.6)",
        glow: "0 0 0 1px rgb(212 165 116 / 0.25), 0 0 30px -6px rgb(212 165 116 / 0.35)",
        "glow-sm": "0 0 18px -4px rgb(212 165 116 / 0.45)",
        gold: "0 8px 24px -10px rgb(212 165 116 / 0.55)",
      },
      backgroundImage: {
        "gold-gradient":
          "linear-gradient(135deg, #fbe6b6 0%, #d4a574 35%, #a07b4b 65%, #5b3f1f 100%)",
        "gold-shine":
          "linear-gradient(120deg, transparent 25%, rgba(255,244,214,0.7) 50%, transparent 75%)",
        "silver-gradient":
          "linear-gradient(135deg, #f7f8fa 0%, #d4d8e1 40%, #9aa0b0 70%, #4f5462 100%)",
        "noise":
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.25'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "gold-shine": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "gold-pan": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "gold-thread": {
          "0%": { transform: "translateX(-110%)" },
          "55%, 100%": { transform: "translateX(110%)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(212,165,116,0.45)" },
          "50%": { boxShadow: "0 0 24px 4px rgba(212,165,116,0.15)" },
        },
        "shimmer-text": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        "gold-shine": "gold-shine 3s linear infinite",
        "gold-pan": "gold-pan 6s ease-in-out infinite",
        "gold-thread": "gold-thread 4.2s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2.4s ease-in-out infinite",
        "shimmer-text": "shimmer-text 5s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
