import { motion } from "framer-motion";
import { Inbox } from "lucide-react";

interface EmptyProps {
  title?: string;
  description?: string;
  icon?: React.ComponentType<any>;
  action?: React.ReactNode;
}

export function Empty({
  title = "Nenhum registro",
  description = "Não há dados para exibir aqui ainda.",
  icon: Icon = Inbox,
  action,
}: EmptyProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center text-center py-14 px-6"
    >
      <div className="relative">
        <div className="absolute inset-0 bg-gold-500/15 blur-2xl rounded-full" />
        <span className="relative size-16 rounded-2xl bg-gradient-to-br from-ink-800 to-ink-900 text-gold-400 grid place-items-center ring-1 ring-gold-700/40 shadow-glow-sm">
          <Icon size={24} />
        </span>
      </div>
      <h3 className="font-display mt-4 text-lg font-semibold text-silver-50">
        {title}
      </h3>
      <p className="mt-1 text-sm text-silver-400 max-w-sm">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
