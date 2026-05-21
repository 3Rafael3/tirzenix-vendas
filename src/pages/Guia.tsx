import { motion, type Variants } from "framer-motion";
import {
  BookOpen,
  ShoppingCart,
  ListChecks,
  Search,
  BarChart3,
  Target,
  Wallet,
  CalendarClock,
  Bell,
  CreditCard,
  Users,
  Compass,
  Palette,
  Database,
  Command,
  Boxes,
  PackagePlus,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { BrandMark, BrandWordmark } from "@/components/brand/BrandMark";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const sections = [
  {
    icon: Boxes,
    title: "Comece pelo Estoque",
    body: "Vá em Estoque → Novo produto. Defina nome, dosagem, preço de compra, preço de venda e estoque inicial. O sistema calcula automaticamente o lucro unitário, margem e valor imobilizado.",
  },
  {
    icon: PackagePlus,
    title: "Registrar entradas e saídas",
    body: "Use Entrada quando comprar do fornecedor (atualiza preço de compra e adiciona ao estoque). Saída para perdas/doações. Ajuste para correções de inventário. Vendas vinculadas decrementam o estoque sozinhas.",
  },
  {
    icon: ShoppingCart,
    title: "Lançar uma venda",
    body: "Em Vendas → Nova venda, escolha o produto no campo Vincular ao estoque (preços vêm prontos) ou registre manualmente. Total, lucro e margem são calculados automaticamente.",
  },
  {
    icon: CalendarClock,
    title: "Pipeline de reservas",
    body: "Registre pedidos com sinal pago e previsão de entrega. Quando entregar, clique no ícone verde para converter em venda — a reserva fica Entregue e o estoque é debitado automaticamente.",
  },
  {
    icon: Bell,
    title: "Alertas inteligentes",
    body: "Entregas próximas (≤3 dias) ficam douradas e atrasadas ficam vermelhas. Produtos abaixo do estoque mínimo aparecem em alerta no Dashboard e na Central de Custo.",
  },
  {
    icon: BarChart3,
    title: "Dashboard em tempo real",
    body: "Receita, lucro, custo, ticket médio, margem, a receber, gráfico dos últimos 6 meses, meta mensal, Top 5 clientes, valor em estoque e potencial de lucro — tudo recalculado ao vivo.",
  },
  {
    icon: Target,
    title: "Meta mensal",
    body: "Edite em Configurações → Marca & Meta. A barra preenche em dourado e fica verde ao atingir 100%, com efeito shimmer.",
  },
  {
    icon: TrendingUp,
    title: "Central de custo",
    body: "Acompanhe valor em estoque, receita potencial (se vender tudo), lucro potencial e margem média por SKU. Identifique produtos esgotados ou com estoque baixo.",
  },
  {
    icon: Wallet,
    title: "Recebimentos pendentes",
    body: "O card A Receber soma vendas com status Pendente ou Parcelado. Você sabe quanto ainda precisa entrar.",
  },
  {
    icon: CreditCard,
    title: "Formas de pagamento",
    body: "Por padrão Pix, Dinheiro e Cartão Crédito. Personalize em Configurações.",
  },
  {
    icon: Users,
    title: "Clientes consolidados",
    body: "Cada cliente que aparece em uma venda é agregado automaticamente com compras, unidades, receita, lucro, margem e última compra.",
  },
  {
    icon: Search,
    title: "Filtros e busca",
    body: "A busca no topo de cada tabela filtra em tempo real. Filtros de status complementam para encontrar exatamente o que procura.",
  },
  {
    icon: Command,
    title: "Atalho ⌘K / Ctrl+K",
    body: "Abra o painel de comandos a qualquer momento: navegação rápida, nova venda, nova reserva, novo produto, exportar backup.",
  },
  {
    icon: Compass,
    title: "Navegação",
    body: "A barra lateral à esquerda dá acesso direto ao sistema todo. No celular vira menu inferior fixo.",
  },
  {
    icon: Palette,
    title: "Identidade visual",
    body: "Paleta exclusiva Tirzenix: preto profundo, dourado champagne e prata. Tipografia display Cormorant Garamond + corpo Inter.",
  },
  {
    icon: ListChecks,
    title: "Listas suspensas",
    body: "Pagamento, status e dosagens têm dropdown. Personalize as opções em Configurações — os formulários atualizam na hora.",
  },
  {
    icon: Database,
    title: "Backup",
    body: "Dados ficam no navegador. Em Configurações você baixa um JSON com tudo e importa quando quiser. Recomendado: backup mensal.",
  },
];

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};

export default function Guia() {
  return (
    <>
      <PageHeader title="Guia de uso" subtitle="Manual rápido do sistema Tirzenix" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card p-7 mb-6 relative overflow-hidden bg-gradient-to-br from-ink-900 via-ink-850 to-gold-950/40"
      >
        <div className="absolute -top-24 -right-24 size-72 rounded-full bg-gold-500/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-10 size-56 rounded-full bg-gold-700/15 blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <BrandMark size={88} />
          <div className="min-w-0">
            <BrandWordmark size="text-3xl" />
            <p className="text-silver-300 text-sm mt-2 max-w-2xl leading-relaxed font-display italic">
              "Sua melhor versão, nossa missão."
            </p>
            <p className="text-silver-400 text-sm mt-3 max-w-2xl leading-relaxed">
              Sistema completo para organização e controle das suas vendas, reservas, clientes e estoque. Tudo calculado em tempo real — sem fórmulas, sem planilha, sem dor de cabeça.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Chip>Tempo real</Chip>
              <Chip>Controle de estoque</Chip>
              <Chip>Margem & custo</Chip>
              <Chip>Atalho ⌘K</Chip>
              <Chip>Exporta CSV/JSON</Chip>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.title}
              variants={item}
              whileHover={{ y: -3 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="card p-5"
            >
              <div className="flex items-start gap-3">
                <span className="size-10 rounded-xl bg-gold-500/15 text-gold-300 grid place-items-center shrink-0 ring-1 ring-gold-700/40">
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-silver-50">{s.title}</h3>
                  <p className="text-sm text-silver-400 mt-1 leading-relaxed">{s.body}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="card p-5 mt-6 bg-gold-500/[0.06] border-gold-700/40 flex gap-3 items-start"
      >
        <BookOpen size={18} className="text-gold-400 shrink-0 mt-0.5" />
        <p className="text-sm text-silver-200">
          <strong className="text-gold-300">Dica:</strong> use a busca no topo de cada tabela para filtrar rapidamente. Os botões de exportar geram CSV/JSON compatíveis com Excel.
        </p>
      </motion.div>
    </>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gold-500/10 backdrop-blur text-[11px] font-medium ring-1 ring-gold-700/40 text-gold-200">
      {children}
    </span>
  );
}
