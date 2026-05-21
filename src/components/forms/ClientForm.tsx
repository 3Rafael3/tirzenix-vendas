import { useEffect, useState } from "react";
import type { Client } from "@/lib/types";
import { formatPhone, isPhoneComplete } from "@/lib/utils";

interface Props {
  initial?: Client;
  onSubmit: (data: Omit<Client, "id" | "createdAt">) => void;
  onCancel: () => void;
}

export function ClientForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [notes, setNotes] = useState(initial?.notes || "");

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setPhone(initial.phone);
      setNotes(initial.notes || "");
    }
  }, [initial]);

  const valid = name.trim().length >= 2;
  const phoneOk = phone === "" || isPhoneComplete(phone);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSubmit({ name: name.trim(), phone, notes: notes.trim() || undefined });
      }}
      className="space-y-4"
    >
      <label className="block">
        <span className="label">Nome do cliente</span>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome completo"
          autoFocus
          required
        />
      </label>

      <label className="block">
        <span className="label">Telefone</span>
        <input
          className="input font-mono tabular-nums"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          placeholder="(00) 00000-0000"
          inputMode="tel"
          maxLength={16}
        />
        {!phoneOk && (
          <p className="text-[11px] text-rose-300 mt-1">
            Telefone incompleto (precisa de 10 ou 11 dígitos)
          </p>
        )}
      </label>

      <label className="block">
        <span className="label">Observações (opcional)</span>
        <textarea
          className="input min-h-[64px]"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Aniversário, endereço, preferências…"
        />
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={!valid || !phoneOk}>
          {initial ? "Salvar alterações" : "Cadastrar cliente"}
        </button>
      </div>
    </form>
  );
}
