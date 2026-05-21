import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number;
  onChange: (n: number) => void;
}

const fmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Input de moeda brasileira.
 * - Mostra "R$ 0,00" como placeholder quando vazio (não aparece como valor digitado)
 * - Auto-formata conforme digita: 620 → R$ 6,20 → R$ 62,00 → R$ 620,00 (estilo banco)
 * - Trabalha com `value: number` (em reais decimais) e devolve number em onChange
 */
export const CurrencyInput = forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, className, placeholder, ...rest }, ref) => {
    const display = value > 0 ? fmt.format(value) : "";

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
      if (!digits) {
        onChange(0);
        return;
      }
      onChange(Number(digits) / 100);
    }

    function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
      // posiciona cursor no fim — UX padrão de money input
      const el = e.target;
      setTimeout(() => el.setSelectionRange(el.value.length, el.value.length), 0);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      // ESC limpa o valor
      if (e.key === "Escape") {
        e.preventDefault();
        onChange(0);
      }
    }

    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "R$ 0,00"}
        className={cn("input font-mono tabular-nums", className)}
        {...rest}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

interface PercentProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number;
  onChange: (n: number) => void;
  max?: number;
}

/**
 * Input numérico com seleção automática no foco — para quantidades, % e similares.
 * Quando o campo é focado, o conteúdo é selecionado para que digitar substitua direto.
 */
export const NumberInput = forwardRef<HTMLInputElement, PercentProps>(
  ({ value, onChange, className, max, ...rest }, ref) => {
    return (
      <input
        ref={ref}
        type="number"
        value={value === 0 ? "" : value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "") {
            onChange(0);
            return;
          }
          const n = Number(v);
          if (Number.isNaN(n)) return;
          onChange(max !== undefined ? Math.min(n, max) : n);
        }}
        onFocus={(e) => e.target.select()}
        className={cn("input font-mono tabular-nums", className)}
        placeholder="0"
        {...rest}
      />
    );
  }
);

NumberInput.displayName = "NumberInput";
