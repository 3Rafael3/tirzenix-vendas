import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, UserPlus, User, Check, X } from "lucide-react";
import { useStore } from "@/store/useStore";
import { formatPhone, phoneDigits } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Props {
  /** Nome atual */
  name: string;
  /** Telefone atual (já formatado) */
  phone: string;
  onChange: (name: string, phone: string) => void;
  required?: boolean;
}

/**
 * Combobox de cliente: digite ou selecione um já cadastrado.
 * - Lista filtra conforme digitação no nome
 * - Selecionar um cliente preenche nome + telefone automaticamente
 * - Telefone tem máscara (00) 00000-0000
 * - Botão "Cadastrar novo" permite criar inline a partir do que está digitado
 */
export function ClientCombobox({ name, phone, onChange, required }: Props) {
  const clients = useStore((s) => s.clients);
  const addClient = useStore((s) => s.addClient);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [justRegistered, setJustRegistered] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = name.trim().toLowerCase();
    const sorted = [...clients].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR")
    );
    if (!q) return sorted.slice(0, 30);
    return sorted
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) || phoneDigits(c.phone).includes(q)
      )
      .slice(0, 30);
  }, [clients, name]);

  const exactMatch = useMemo(() => {
    const n = name.trim().toLowerCase();
    return n ? clients.find((c) => c.name.toLowerCase() === n) : undefined;
  }, [clients, name]);

  const canCreate =
    name.trim().length >= 2 &&
    phoneDigits(phone).length >= 10 &&
    !exactMatch;

  function pick(c: { name: string; phone: string }) {
    onChange(c.name, c.phone);
    setOpen(false);
    setJustRegistered(false);
  }

  function createNew() {
    if (!canCreate) return;
    addClient({ name: name.trim(), phone });
    setJustRegistered(true);
    setOpen(false);
    setTimeout(() => setJustRegistered(false), 2400);
  }

  function clearAll() {
    onChange("", "");
    nameInputRef.current?.focus();
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* NOME (com autocomplete) */}
      <div className="block relative" ref={wrapperRef}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="label !mb-0">Cliente</span>
          {clients.length > 0 && (
            <span className="text-[10px] text-silver-500 uppercase tracking-wider">
              {clients.length} cadastrado{clients.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <div className="relative">
          <User
            size={14}
            className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition",
              exactMatch ? "text-emerald-400" : "text-silver-500"
            )}
          />
          <input
            ref={nameInputRef}
            className="input pl-9 pr-9"
            value={name}
            onChange={(e) => {
              onChange(e.target.value, phone);
              setOpen(true);
              setActive(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setOpen(true);
                setActive((a) => Math.min(filtered.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === "Enter" && open && filtered[active]) {
                e.preventDefault();
                pick(filtered[active]);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder="Digite ou selecione…"
            autoComplete="off"
            required={required}
          />
          {name && (
            <button
              type="button"
              onClick={clearAll}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-silver-500 hover:text-rose-300 hover:bg-rose-500/10 transition"
              aria-label="Limpar"
              tabIndex={-1}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Mensagem inline */}
        <AnimatePresence>
          {justRegistered && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[11px] text-emerald-300 mt-1.5 flex items-center gap-1"
            >
              <Check size={11} /> Novo cliente cadastrado
            </motion.p>
          )}
          {!justRegistered && exactMatch && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[11px] text-emerald-300/90 mt-1.5 flex items-center gap-1"
            >
              <Check size={11} /> Cliente cadastrado · dados preenchidos
            </motion.p>
          )}
        </AnimatePresence>

        {/* Dropdown */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 left-0 right-0 mt-1.5 rounded-xl border border-gold-800/40 bg-ink-900/95 backdrop-blur-xl shadow-ring overflow-hidden max-h-72"
              style={{ width: "calc(200% + 1rem)" }}
            >
              <div className="px-3 py-2 border-b border-ink-700/60 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-silver-500">
                <Search size={11} /> Clientes cadastrados
              </div>
              <ul className="max-h-56 overflow-y-auto py-1">
                {filtered.length === 0 ? (
                  <li className="px-3 py-3 text-xs text-silver-500 text-center">
                    Nenhum cliente cadastrado ainda.
                  </li>
                ) : (
                  filtered.map((c, i) => {
                    const isActive = i === active;
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onMouseEnter={() => setActive(i)}
                          onClick={() => pick(c)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 text-left transition",
                            isActive
                              ? "bg-gold-500/15 text-gold-100"
                              : "hover:bg-ink-800/60 text-silver-100"
                          )}
                        >
                          <span
                            className={cn(
                              "size-7 rounded-full grid place-items-center text-[10px] font-bold ring-1 shrink-0",
                              isActive
                                ? "bg-gold-gradient text-ink-950 ring-gold-300/60 shadow-glow-sm"
                                : "bg-ink-800 text-silver-300 ring-ink-600"
                            )}
                          >
                            {initials(c.name)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{c.name}</div>
                            <div className="text-[11px] text-silver-500 font-mono">
                              {c.phone || "sem telefone"}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
              {canCreate && (
                <button
                  type="button"
                  onClick={createNew}
                  className="w-full flex items-center gap-2 px-3 py-2.5 border-t border-gold-800/40 bg-gold-500/[0.06] hover:bg-gold-500/[0.12] text-gold-200 text-sm transition"
                >
                  <UserPlus size={14} />
                  <span className="flex-1 text-left">
                    Cadastrar <strong>{name.trim()}</strong>
                  </span>
                  <kbd className="text-[9px] text-silver-500 bg-ink-800 px-1.5 py-0.5 rounded">
                    +
                  </kbd>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* TELEFONE (máscara) */}
      <label className="block">
        <span className="label">Telefone</span>
        <input
          className="input font-mono tabular-nums"
          value={phone}
          onChange={(e) => onChange(name, formatPhone(e.target.value))}
          placeholder="(00) 00000-0000"
          inputMode="tel"
          maxLength={16}
        />
      </label>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}
