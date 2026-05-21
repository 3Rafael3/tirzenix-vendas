# Tirzenix — Sistema de Controle de Vendas

Sistema SaaS profissional para gestão de vendas, reservas, clientes, estoque e financeiro da Tirzenix.

![preto · dourado · prata](https://img.shields.io/badge/theme-preto%20%C2%B7%20dourado%20%C2%B7%20prata-d4a574?style=flat-square)
![React 18](https://img.shields.io/badge/React-18-61dafb?style=flat-square)
![Vite 6](https://img.shields.io/badge/Vite-6-646cff?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square)

## ✨ Funcionalidades

- **Dashboard** em tempo real — receita bruta/líquida, lucro, custo, ticket médio, a receber, meta mensal, Top 5 clientes, gráfico 6 meses
- **Vendas** com sinal, parcelamento, taxa de cartão (até 4 casas decimais), taxa por parcela, outras taxas e cálculo automático do líquido + lucro líquido + margem
- **Reservas** com sinal/método + previsão de entrega + alertas (≤3 dias / atrasada) e conversão direta em venda
- **Clientes** com cadastro independente (nome + telefone com máscara `(00) 00000-0000`), autocomplete em vendas/reservas
- **Estoque (Central de Custo)** com produtos, variantes, movimentações (entrada/saída/ajuste), alertas de estoque baixo, decremento automático ao vender
- **Relatórios** consolidados
- **Configurações** com upload de logomarca personalizada (PNG/JPG/SVG/WEBP), slider de tamanho global, taxas padrão, backup JSON
- **⌘K / Ctrl+K** Command Palette
- **Atalhos**: nova venda, nova reserva, novo produto, exportar backup
- **CSV** export em todas as listagens
- **Tema dark** premium (preto + dourado champagne + prata)

## 🎨 Design

- Tipografia **Geist** (sans moderna estilo Anthropic) + **Geist Mono** para valores monetários
- Paleta: `ink` (preto profundo), `gold` (champagne), `silver` (prata)
- Animações com **Framer Motion** (page transitions, stagger, spring, count-up, layoutId)
- Glassmorphism + gradientes radiais douradas
- Sidebar fixa com indicador animado deslizante

## 🚀 Como rodar localmente

```bash
npm install
npm run dev
```

Abre em http://localhost:5173

## 🏗️ Build de produção

```bash
npm run build
npm run preview
```

## 🌐 Deploy no GitHub Pages

O projeto tem um workflow do GitHub Actions pronto em `.github/workflows/deploy.yml` que faz build e deploy automático em cada push na `main`.

### 1. Criar o repositório no GitHub

```bash
# Inicialize git localmente
git init
git add .
git commit -m "feat: sistema Tirzenix completo"
git branch -M main

# Crie o repo no GitHub (substitua SEU-USUARIO)
# Vá em https://github.com/new e crie "tirzenix-vendas" (público ou privado)

# Conecte ao remoto e envie
git remote add origin https://github.com/SEU-USUARIO/tirzenix-vendas.git
git push -u origin main
```

### 2. Habilitar GitHub Pages

1. No repositório, vá em **Settings → Pages**
2. Em **Source**, selecione **GitHub Actions**
3. O workflow `deploy.yml` cuidará do resto a cada push

A primeira execução leva ~2 min. O site fica em:

```
https://SEU-USUARIO.github.io/tirzenix-vendas/
```

### 3. Se o nome do repositório for diferente

Edite `vite.config.ts` e troque `REPO_NAME = "tirzenix-vendas"` pelo nome real.

## 💾 Persistência

Todos os dados ficam no `localStorage` do navegador (chave `tirzenix-vendas`, v4). Use **Configurações → Exportar backup** para JSON com tudo (vendas, reservas, produtos, movimentações, clientes, configurações).

## 🛠️ Stack

- **React 18** + **TypeScript** (strict)
- **Vite 6** com code-splitting manual (`react`, `motion`, `charts`)
- **Tailwind CSS 3** com paleta custom
- **Framer Motion 12**
- **Zustand 5** com persistência em localStorage
- **Recharts 2** para gráficos
- **Lucide React** para ícones
- **React Router 6**

## 📜 Licença

Uso interno Tirzenix.

---

**Sua melhor versão, nossa missão.** ✦
