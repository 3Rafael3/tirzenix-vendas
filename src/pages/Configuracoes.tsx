import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Download, Upload, RotateCcw, Eraser, Percent } from "lucide-react";
import { useStore } from "@/store/useStore";
import { defaultSettings } from "@/lib/seed";
import { PageHeader } from "@/components/layout/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { formatBRL } from "@/lib/utils";
import { defaultVariantsForProduct } from "@/lib/productVariants";
import { LogoUploader } from "@/components/brand/LogoUploader";
import { CurrencyInput, NumberInput } from "@/components/forms/CurrencyInput";
import { GistSyncCard } from "@/components/sync/GistSyncCard";

export default function Configuracoes() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const exportJSON = useStore((s) => s.exportJSON);
  const importJSON = useStore((s) => s.importJSON);
  const resetAll = useStore((s) => s.resetAll);
  const wipeData = useStore((s) => s.wipeData);

  const [goal, setGoal] = useState(settings.monthlyGoal);
  const [brandName, setBrandName] = useState(settings.brand.name);
  const [brandTagline, setBrandTagline] = useState(settings.brand.tagline);
  const [cardFee, setCardFee] = useState(settings.feeDefaults?.cardFeePct ?? 3.5);
  const [instFee, setInstFee] = useState(settings.feeDefaults?.installmentFeePct ?? 1.0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    raw: string;
    source: string;
    summary: Array<[string, number | string]>;
  } | null>(null);

  function saveMeta() {
    updateSettings({
      monthlyGoal: Math.max(0, goal || 0),
      brand: {
        ...settings.brand,
        name: brandName.trim() || "Tirzenix",
        tagline: brandTagline.trim(),
      },
    });
    toast.success("Configurações salvas");
  }

  function saveFees() {
    updateSettings({
      feeDefaults: {
        cardFeePct: Math.max(0, cardFee || 0),
        installmentFeePct: Math.max(0, instFee || 0),
      },
    });
    toast.success("Taxas padrão salvas");
  }

  function downloadJSON() {
    const json = exportJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tirzenix-backup-completo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup completo baixado");
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      reviewImport(String(reader.result || ""), file.name);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function dataFromBackup(raw: string) {
    const parsed = JSON.parse(raw);
    return parsed?.data && typeof parsed.data === "object"
      ? parsed.data
      : parsed?.backup && typeof parsed.backup === "object"
      ? parsed.backup
      : parsed?.state?.data && typeof parsed.state.data === "object"
      ? parsed.state.data
      : parsed?.state?.backup && typeof parsed.state.backup === "object"
      ? parsed.state.backup
      : parsed?.state && typeof parsed.state === "object"
      ? parsed.state
      : parsed;
  }

  function reviewImport(raw: string, source: string) {
    try {
      const data = dataFromBackup(raw);
      if (!data || typeof data !== "object") throw new Error("JSON inválido");
      setPendingImport({
        raw,
        source,
        summary: [
          ["Vendas", Array.isArray(data.sales) ? data.sales.length : 0],
          ["Reservas", Array.isArray(data.reservations) ? data.reservations.length : 0],
          ["Produtos", Array.isArray(data.products) ? data.products.length : 0],
          ["Movimentações", Array.isArray(data.movements) ? data.movements.length : 0],
          ["Clientes", Array.isArray(data.clients) ? data.clients.length : 0],
          ["Configurações", data.settings ? "incluídas" : "não encontradas"],
        ],
      });
    } catch (e: any) {
      toast.error(e?.message || "Backup inválido");
    }
  }

  function restorePendingImport() {
    if (!pendingImport) return;
    const res = importJSON(pendingImport.raw);
    if (res.ok) {
      toast.success("Backup restaurado");
      setPendingImport(null);
      window.setTimeout(() => window.location.reload(), 700);
    } else {
      toast.error(res.error || "Falha na importação");
    }
  }

  function importFromLocalhost() {
    const port = window.location.port ? `:${window.location.port}` : ":5173";
    const targetOrigin = `${window.location.protocol}//localhost${port}`;
    const targetUrl = `${targetOrigin}/?tirzenix-transfer=export`;
    let finished = false;
    let timeout: number | undefined;

    const finish = () => {
      finished = true;
      window.removeEventListener("message", onMessage);
      if (timeout) window.clearTimeout(timeout);
    };

    const importRaw = (raw: string | null) => {
      if (!raw) {
        toast.error("Nenhum dado encontrado no localhost");
        return;
      }

      reviewImport(raw, "localhost");
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== targetOrigin) return;
      if (event.data?.source !== "tirzenix-vendas-transfer") return;
      finish();
      importRaw(event.data.raw || null);
    };

    window.addEventListener("message", onMessage);
    const popup = window.open(
      targetUrl,
      "tirzenix-localhost-transfer",
      "width=520,height=360"
    );

    if (!popup) {
      finish();
      toast.error("Permita pop-ups para importar do localhost");
      return;
    }

    timeout = window.setTimeout(() => {
      if (finished) return;
      finish();
      toast.error("Não consegui receber os dados do localhost");
    }, 9000);
  }

  const cardVariant = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <>
      <PageHeader title="Configurações" subtitle="Listas, marca, meta e backup dos dados" />

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        <motion.div variants={cardVariant} className="lg:col-span-3">
          <GistSyncCard />
        </motion.div>
        <motion.div variants={cardVariant} className="lg:col-span-3">
          <LogoUploader />
        </motion.div>
        <motion.div variants={cardVariant} className="card p-6 lg:col-span-2 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 size-48 rounded-full bg-gold-700/15 blur-3xl" />
          <div className="relative">
            <h3 className="font-display text-xl font-semibold text-silver-50">Marca & Meta</h3>
            <p className="text-sm text-silver-400 mt-1">
              Identidade visual e meta mensal exibida no dashboard.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              <label className="block">
                <span className="label">Nome da marca</span>
                <input className="input" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
              </label>
              <label className="block">
                <span className="label">Tagline</span>
                <input className="input" value={brandTagline} onChange={(e) => setBrandTagline(e.target.value)} />
              </label>
              <label className="block md:col-span-2">
                <span className="label">Meta de receita mensal</span>
                <CurrencyInput
                  value={goal}
                  onChange={(n) => setGoal(n)}
                />
                <p className="text-xs text-silver-500 mt-1.5">
                  Atual: <strong className="text-gold-300">{formatBRL(goal || 0)}</strong>
                </p>
              </label>
            </div>

            <div className="flex justify-end mt-5">
              <button className="btn-primary" onClick={saveMeta}>Salvar alterações</button>
            </div>
          </div>
        </motion.div>

        <motion.div variants={cardVariant} className="card p-6">
          <h3 className="font-display text-xl font-semibold text-silver-50">Backup completo</h3>
          <p className="text-sm text-silver-400 mt-1">
            Exporte todos os dados do sistema e restaure tudo quando precisar.
          </p>

          <div className="space-y-2 mt-5">
            <button className="btn-secondary w-full" onClick={downloadJSON}>
              <Download size={16} /> Exportar backup completo
            </button>
            <button className="btn-secondary w-full" onClick={() => fileRef.current?.click()}>
              <Upload size={16} /> Importar / restaurar backup
            </button>
            <button className="btn-secondary w-full" onClick={importFromLocalhost}>
              <Upload size={16} /> Importar dados do localhost
            </button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onPickFile} />
            <div className="gold-divider my-3" />
            <button
              className="btn-ghost w-full text-gold-300 hover:bg-gold-500/10"
              onClick={() => setConfirmWipe(true)}
            >
              <Eraser size={16} /> Zerar dados (manter config)
            </button>
            <button
              className="btn-ghost w-full text-rose-400 hover:bg-rose-500/10"
              onClick={() => setConfirmReset(true)}
            >
              <RotateCcw size={16} /> Restaurar padrão
            </button>
          </div>
        </motion.div>

        {/* Taxas padrão (aplicadas a novas vendas) */}
        <motion.div variants={cardVariant} className="card p-6 lg:col-span-3 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 size-40 rounded-full bg-gold-700/15 blur-3xl pointer-events-none" />
          <div className="relative">
            <h3 className="font-display text-xl font-semibold text-silver-50 flex items-center gap-2">
              <Percent size={18} className="text-gold-400" />
              Taxas padrão
            </h3>
            <p className="text-sm text-silver-400 mt-1">
              Aplicadas automaticamente em novas vendas com cartão. Você pode editar venda a venda no formulário.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
              <label className="block">
                <span className="label">Taxa do cartão (%)</span>
                <NumberInput
                  min={0}
                  max={100}
                  step="0.0001"
                  value={cardFee}
                  onChange={(n) => setCardFee(n)}
                />
                <p className="text-[11px] text-silver-500 mt-1">à vista (1×)</p>
              </label>
              <label className="block">
                <span className="label">Taxa por parcela extra (%)</span>
                <NumberInput
                  min={0}
                  max={100}
                  step="0.0001"
                  value={instFee}
                  onChange={(n) => setInstFee(n)}
                />
                <p className="text-[11px] text-silver-500 mt-1">somada por parcela acima da 1ª</p>
              </label>
              <div className="rounded-xl bg-ink-950/60 border border-gold-900/25 px-4 py-3 flex flex-col justify-center">
                <p className="text-[10px] uppercase tracking-[0.16em] text-gold-400 font-semibold">Exemplo 3×</p>
                <p className="text-sm font-mono text-silver-100 mt-1 tabular-nums">
                  {(cardFee + instFee * 2).toFixed(4)}% efetivo
                </p>
                <p className="text-[11px] text-silver-500 mt-0.5">({cardFee}% + 2 × {instFee}%)</p>
              </div>
            </div>

            <div className="flex justify-end mt-5">
              <button className="btn-primary" onClick={saveFees}>Salvar taxas</button>
            </div>

            {/* Toggle de precisão de % */}
            <div className="mt-5 pt-5 border-t border-gold-900/25 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-silver-50">
                  Mostrar precisão total nos percentuais
                </p>
                <p className="text-xs text-silver-400 mt-1">
                  Quando <strong>desligado</strong>, todos os percentuais (margem, taxa) aparecem com{" "}
                  <strong className="text-gold-300">2 casas decimais</strong> — ex: <span className="font-mono">32,61%</span>.
                  Quando <strong>ligado</strong>, mostra até <strong className="text-gold-300">4 casas</strong> — ex:{" "}
                  <span className="font-mono">32,6094%</span>.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!!settings.showFullPrecisionPct}
                onClick={() =>
                  updateSettings({
                    showFullPrecisionPct: !settings.showFullPrecisionPct,
                  })
                }
                className={`relative shrink-0 h-7 w-12 rounded-full transition ring-1 ${
                  settings.showFullPrecisionPct
                    ? "bg-gold-gradient ring-gold-300/60 shadow-glow-sm"
                    : "bg-ink-800 ring-ink-600"
                }`}
                title={settings.showFullPrecisionPct ? "Desligar" : "Ligar"}
              >
                <motion.span
                  layout
                  transition={{ type: "spring", stiffness: 360, damping: 28 }}
                  className={`absolute top-0.5 size-6 rounded-full grid place-items-center ${
                    settings.showFullPrecisionPct
                      ? "right-0.5 bg-ink-950 text-gold-300"
                      : "left-0.5 bg-ink-950 text-silver-400"
                  }`}
                >
                  <span className="text-[9px] font-bold font-mono tabular-nums">
                    {settings.showFullPrecisionPct ? "4" : "2"}
                  </span>
                </motion.span>
              </button>
            </div>
          </div>
        </motion.div>

        <ListCard title="Formas de pagamento" items={settings.paymentMethods} onChange={(arr) => updateSettings({ paymentMethods: arr })} variant={cardVariant} />
        <ListCard title="Status de venda" items={settings.saleStatuses} onChange={(arr) => updateSettings({ saleStatuses: arr })} variant={cardVariant} />
        <ListCard title="Status de reserva" items={settings.reservationStatuses} onChange={(arr) => updateSettings({ reservationStatuses: arr })} variant={cardVariant} />
        <ListCard title="Dosagens" items={settings.dosages} onChange={(arr) => updateSettings({ dosages: arr })} variant={cardVariant} />
        <ListCard
          title="Produtos (lista rápida)"
          items={settings.products}
          onChange={(arr) => {
            const productVariants = { ...(settings.productVariants || {}) };
            arr.forEach((product) => {
              productVariants[product] ||= defaultVariantsForProduct(product);
            });
            Object.keys(productVariants).forEach((product) => {
              if (!arr.includes(product)) delete productVariants[product];
            });
            updateSettings({ products: arr, productVariants });
          }}
          variant={cardVariant}
          showSubitems
        />
      </motion.div>

      <Modal
        open={confirmWipe}
        onClose={() => setConfirmWipe(false)}
        title="Zerar dados"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirmWipe(false)}>Cancelar</button>
            <button
              className="btn-danger"
              onClick={() => {
                wipeData();
                toast.success("Dados zerados");
                setConfirmWipe(false);
              }}
            >
              Zerar
            </button>
          </>
        }
      >
        <p className="text-sm text-silver-300">
          Todas as <strong className="text-gold-300">vendas, reservas, produtos e movimentações</strong> serão removidas. Configurações e listas são mantidas. Esta ação não pode ser desfeita.
        </p>
      </Modal>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Restaurar padrão"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirmReset(false)}>Cancelar</button>
            <button
              className="btn-danger"
              onClick={() => {
                resetAll();
                setGoal(defaultSettings.monthlyGoal);
                setBrandName(defaultSettings.brand.name);
                setBrandTagline(defaultSettings.brand.tagline);
                toast.success("Tudo restaurado ao padrão");
                setConfirmReset(false);
              }}
            >
              Restaurar
            </button>
          </>
        }
      >
        <p className="text-sm text-silver-300">
          Restaura listas, marca, meta e remove todos os dados. Não é possível desfazer.
        </p>
      </Modal>

      <Modal
        open={!!pendingImport}
        onClose={() => setPendingImport(null)}
        title="Revisar importação"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setPendingImport(null)}>Cancelar</button>
            <button className="btn-danger" onClick={restorePendingImport}>
              Restaurar backup
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-silver-300">
            O backup <strong className="text-gold-300">{pendingImport?.source}</strong> substituirá os dados atuais do sistema.
          </p>
          <div className="rounded-xl bg-ink-950/60 border border-gold-900/30 overflow-hidden">
            {pendingImport?.summary.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between px-4 py-2.5 border-b border-gold-900/15 last:border-b-0">
                <span className="text-sm text-silver-400">{label}</span>
                <span className="text-sm font-semibold text-silver-100 tabular-nums">{value}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-rose-300">
            Esta ação sobrescreve vendas, reservas, produtos, movimentações, clientes e configurações atuais.
          </p>
        </div>
      </Modal>
    </>
  );
}

function ListCard({
  title,
  items,
  onChange,
  variant,
  showSubitems,
}: {
  title: string;
  items: string[];
  onChange: (arr: string[]) => void;
  variant: any;
  showSubitems?: boolean;
}) {
  const [val, setVal] = useState("");

  function add() {
    const v = val.trim();
    if (!v || items.includes(v)) return;
    onChange([...items, v]);
    setVal("");
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }

  return (
    <motion.div variants={variant} className="card p-6">
      <h3 className="font-display text-base font-semibold text-silver-50">{title}</h3>
      <div className="flex gap-2 mt-3">
        <input
          className="input"
          placeholder="Adicionar…"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
        />
        <button className="btn-secondary shrink-0" onClick={add}>
          <Plus size={16} />
        </button>
      </div>
      <ul className="mt-3 space-y-1.5">
        {items.length === 0 && (
          <li className="text-xs text-silver-500 italic">Nenhum item cadastrado.</li>
        )}
        {items.map((it, i) => (
          <motion.li
            key={it}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between bg-ink-950/50 rounded-lg px-3 py-2 text-sm text-silver-200 ring-1 ring-gold-900/20"
          >
            <span>
              <span className="block">{it}</span>
                  {showSubitems && (
                    <span className="mt-1 block text-[11px] text-silver-500">
                  {defaultVariantsForProduct(it).map((variant) => variant.label).join(" · ")}
                </span>
              )}
            </span>
            <button
              onClick={() => remove(i)}
              className="text-silver-500 hover:text-rose-400 transition"
            >
              <Trash2 size={14} />
            </button>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
