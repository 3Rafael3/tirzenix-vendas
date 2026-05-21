import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  Trash2,
  Image as ImageIcon,
  RotateCw,
  Maximize2,
  Minimize2,
  RotateCcw,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { BrandMark } from "@/components/brand/BrandMark";
import { toast } from "@/components/ui/Toast";

const MAX_SIZE = 2.5 * 1024 * 1024; // 2.5 MB
const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];

export function LogoUploader() {
  const brand = useStore((s) => s.settings.brand);
  const updateSettings = useStore((s) => s.updateSettings);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const customLogo = brand.logo;
  const scale = brand.logoScale ?? 1;
  const scalePct = Math.round(scale * 100);

  function handleFile(file: File) {
    if (!ALLOWED.includes(file.type)) {
      toast.error("Formato inválido. Use PNG, JPG, SVG ou WEBP.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Arquivo muito grande (máx. 2,5 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      updateSettings({ brand: { ...brand, logo: dataUrl } });
      toast.success("Logomarca atualizada");
    };
    reader.onerror = () => toast.error("Falha ao ler o arquivo");
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    updateSettings({ brand: { ...brand, logo: undefined } });
    toast.success("Logomarca padrão restaurada");
  }

  function setScale(v: number) {
    const clamped = Math.min(2, Math.max(0.5, v));
    updateSettings({ brand: { ...brand, logoScale: clamped } });
  }

  return (
    <div className="card p-6 relative overflow-hidden">
      <div className="absolute -top-24 -left-20 size-56 rounded-full bg-gold-700/15 blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="font-display text-xl font-semibold text-silver-50 flex items-center gap-2 tracking-tight-display">
              <ImageIcon size={20} className="text-gold-400" />
              Logomarca
            </h3>
            <p className="text-sm text-silver-400 mt-1">
              Faça upload da sua arte e ajuste o tamanho — as alterações se propagam para sidebar, dashboard e guia automaticamente.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-start">
          {/* Preview com escala ativa */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="p-6 rounded-2xl bg-ink-950 ring-1 ring-gold-900/30 min-w-[200px] min-h-[200px] grid place-items-center">
              <motion.div
                key={`${customLogo || "default"}-${scale}`}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
              >
                <BrandMark size={120} animate={false} />
              </motion.div>
            </div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-silver-500 font-semibold">
              <span>{customLogo ? "Personalizada" : "Padrão"}</span>
              <span className="text-gold-500">·</span>
              <span className="text-gold-300 tabular-nums">{scalePct}%</span>
            </div>
          </motion.div>

          <div className="space-y-5">
            {/* Upload */}
            <div>
              <label
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFile(file);
                }}
                className={`group relative block rounded-2xl border-2 border-dashed transition cursor-pointer p-6 text-center ${
                  dragOver
                    ? "border-gold-500 bg-gold-500/10"
                    : "border-gold-900/40 hover:border-gold-700 bg-ink-950/40 hover:bg-ink-900/60"
                }`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept={ALLOWED.join(",")}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    e.target.value = "";
                  }}
                />
                <motion.div
                  animate={dragOver ? { y: -4 } : { y: 0 }}
                  className="flex flex-col items-center gap-2"
                >
                  <span className="size-11 rounded-xl bg-gold-500/15 text-gold-300 grid place-items-center ring-1 ring-gold-700/40 group-hover:shadow-glow-sm transition">
                    <Upload size={18} />
                  </span>
                  <p className="text-sm font-medium text-silver-100">
                    Clique ou arraste sua arte aqui
                  </p>
                  <p className="text-xs text-silver-500">
                    PNG, JPG, SVG ou WEBP · até 2,5 MB
                  </p>
                </motion.div>
              </label>

              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload size={16} />
                  {customLogo ? "Substituir logo" : "Enviar logo"}
                </button>
                {customLogo && (
                  <button
                    type="button"
                    className="btn-ghost text-rose-300 hover:bg-rose-500/10"
                    onClick={removeLogo}
                  >
                    <Trash2 size={16} /> Remover personalizada
                  </button>
                )}
              </div>
            </div>

            {/* Slider de tamanho */}
            <div className="rounded-2xl border border-gold-900/25 bg-ink-950/50 px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Maximize2 size={14} className="text-gold-400" />
                  <span className="text-[10px] font-semibold text-gold-400/90 uppercase tracking-[0.16em]">
                    Tamanho global
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setScale(1)}
                    className="text-[10px] uppercase tracking-wider text-silver-400 hover:text-gold-300 inline-flex items-center gap-1 transition"
                    title="Restaurar para 100%"
                  >
                    <RotateCcw size={11} /> Reset
                  </button>
                  <span className="font-mono text-sm font-semibold text-gold-300 tabular-nums min-w-[3rem] text-right">
                    {scalePct}%
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Minimize2 size={12} className="text-silver-500 shrink-0" />
                <input
                  type="range"
                  min={50}
                  max={200}
                  step={5}
                  value={scalePct}
                  onChange={(e) => setScale(Number(e.target.value) / 100)}
                  className="range-gold flex-1"
                  style={
                    {
                      // posição preenchida do track (50→200 = 0→100%)
                      "--val": `${((scalePct - 50) / 150) * 100}%`,
                    } as React.CSSProperties
                  }
                  aria-label="Tamanho da logo"
                />
                <Maximize2 size={14} className="text-gold-400 shrink-0" />
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {[75, 100, 125, 150, 175].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setScale(p / 100)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition tabular-nums ${
                      scalePct === p
                        ? "bg-gold-500/20 text-gold-200 ring-1 ring-gold-500/40"
                        : "bg-ink-800/60 text-silver-400 hover:text-silver-100 hover:bg-ink-700/60"
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-silver-500 leading-relaxed mt-3">
                Afeta sidebar, hero do Guia, modais e qualquer lugar onde a logo aparece — em tempo real.
              </p>
            </div>

            <div className="rounded-xl bg-ink-950/40 border border-gold-900/20 px-3.5 py-2.5 flex items-start gap-2.5">
              <RotateCw size={13} className="text-gold-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-silver-400 leading-relaxed">
                Para melhor resultado, envie uma imagem <strong className="text-gold-300">quadrada com fundo transparente</strong> ou já no estilo circular dourado. A logo é salva localmente em base64.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
