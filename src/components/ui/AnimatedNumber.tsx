import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

interface Props {
  value: number;
  format?: (v: number) => string;
  duration?: number;
  className?: string;
}

export function AnimatedNumber({
  value,
  format = (v) => String(Math.round(v)),
  duration = 0.9,
  className,
}: Props) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, duration]);

  return <span className={className}>{format(display)}</span>;
}
