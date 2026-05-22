import { useEffect } from "react";
import confetti from "canvas-confetti";

interface Props {
  /** Quando true, dispara o confete uma vez */
  trigger: boolean;
  /** Callback após disparar (pra resetar trigger) */
  onDone?: () => void;
}

/**
 * Chuva de confetes dourados — celebra meta atingida, primeira venda, etc.
 * Usa canvas-confetti (~5kb gz). Tons gold/silver para combinar com a marca.
 */
export function GoldConfetti({ trigger, onDone }: Props) {
  useEffect(() => {
    if (!trigger) return;

    const colors = ["#d4a574", "#fff4d6", "#e8c896", "#a07b4b", "#cbd0db"];
    const end = Date.now() + 2200;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.85 },
        colors,
        scalar: 0.9,
        shapes: ["square", "circle"],
        gravity: 0.85,
        ticks: 220,
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.85 },
        colors,
        scalar: 0.9,
        shapes: ["square", "circle"],
        gravity: 0.85,
        ticks: 220,
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      } else {
        // Burst final central
        confetti({
          particleCount: 80,
          spread: 130,
          startVelocity: 35,
          origin: { x: 0.5, y: 0.55 },
          colors,
          scalar: 1.1,
          ticks: 260,
        });
        onDone?.();
      }
    };
    frame();
  }, [trigger, onDone]);

  return null;
}
