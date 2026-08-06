# Referências Visuais — Redesign do ERP EVOK ÁUDIO

Pasta de inspiração para o agente `webdesiner`. As imagens abaixo foram baixadas de
templates shadcn/ui open-source (mesma stack do nosso `client/`: React + Tailwind 4 +
shadcn + Recharts) — ou seja, **tudo que aparece nelas é reproduzível 1:1 no nosso projeto**.

> Regra de adaptação: onde os templates usam preto/laranja/azul como cor de destaque,
> nós usamos o **verde EVOK** (`--brand`, chart-1). A estrutura/layout é o que se copia,
> não a paleta deles.

## Imagens locais (nesta pasta)

### 1. `shadcn-admin-dashboard.png` — Shadcn Admin (satnaing)
O template shadcn mais popular do GitHub. O que copiar:
- **Sidebar agrupada por seções** (General / Pages / Other) com ícones — igual ao nosso
  agrupamento por departamento.
- **Linha de KPI cards** no topo (Total Revenue, Subscriptions, Sales, Active Now):
  valor grande + delta percentual pequeno + sparkline/ícone à direita.
- **Card "Recent Sales"** com avatar + nome + e-mail + valor alinhado à direita — padrão
  perfeito para "últimos pedidos" / "últimas OPs".
- Busca global **Ctrl+K** (temos o componente `Command` instalado).
- Demo ao vivo: https://shadcn-admin.netlify.app

### 2. `shadcnstore-dashboard-dark.png` / `shadcnstore-dashboard-light.png` — ShadcnStore
Mesma tela nos dois temas (referência de dark mode bem executado). O que copiar:
- **KPI cards com contexto narrativo**: além do número e do delta, uma linha de
  interpretação ("Acquisition needs attention") — ótimo para o nosso Auditor Inteligente.
- **Gráfico de área com seletor de período** (Last 3 months / 30 days / 7 days) em
  button-group no canto do card — padrão para vendas/fluxo de caixa.
- **Tabs sobre a tabela** (Outline / Past Performance / Key Personnel) com badge de
  contagem — igual ao que precisamos em OP (planejadas/liberadas/em produção).
- Tabela com colunas de status usando badge com ícone (In Process / Done).
- Demo: https://shadcn-dashboard-landing-template.vercel.app

### 3. `arhamkhnz-dashboard.png` — Studio Admin
Vários presets de layout. O que copiar:
- **Customizador de layout** (sidebar inset/collapsible/icon, conteúdo centered/full) —
  ideia de dar preferências de densidade ao usuário do ERP.
- Cards de funil comercial (New Leads / Proposals Sent / Projects Won) com mini-gráficos —
  padrão para o pipeline de vendas/RFQ.
- Repo: https://github.com/arhamkhnz/next-shadcn-admin-dashboard

### 4. `kiranism-dashboard.png` — Next Shadcn Dashboard Starter
- **Tela de listagem de Produtos** com thumbnail + nome + categoria + preço + descrição
  (server-side table) — referência direta para nosso Item Mestre / catálogo.
- **Bar chart interativo** ocupando largura total com totalizadores clicáveis
  (Desktop 24.828 / Mobile 25.010) — padrão para apontamentos por turno/linha.
- Saudação "Hi, Welcome back 👋" no topo do dashboard — humaniza sem poluir.
- Demo: https://next-shadcn-dashboard-starter.vercel.app

## Padrões extraídos (checklist para o webdesiner)

1. **KPI row**: 4 cards, valor `text-3xl font-semibold tabular-nums`, delta como badge
   discreto (`+12.5% ↗`), descrição `text-muted-foreground text-sm`. Verde EVOK só no
   que é positivo/ativo.
2. **Um gráfico "herói"** por dashboard (área ou barras, Recharts + `ChartContainer`),
   com seletor de período. Nunca 6 gráficos pequenos disputando atenção.
3. **Tabelas**: cabeçalho `text-muted-foreground` sem fundo pesado, linhas com hover
   sutil, status sempre como `Badge` com ícone, números `text-right tabular-nums`.
4. **Sidebar**: grupos com título em caps pequeno (`text-xs uppercase tracking-wider
   text-muted-foreground`), item ativo com fundo `bg-accent` + borda/indicador verde.
5. **Densidade**: espaçamento generoso nos dashboards, denso nas tabelas operacionais
   (PCP, estoque). Duas densidades, um só sistema.
6. **Dark mode**: nunca preto puro chapado — usar as camadas `--background` → `--card`
   → `--popover` para criar profundidade (ver shadcnstore-dashboard-dark.png).

## Para navegar por mais inspiração (manual, no navegador)

- Dribbble: https://dribbble.com/search/erp-dashboard (buscar "Manufacturing ERP", "MES")
- Behance: https://www.behance.net/search/projects/erp%20software%20dashboard
- Dark dashboards 2026: https://wrappixel.com/blog/best-dark-mode-dashboard-designs-and-templates
- Galeria shadcn: https://www.shadcn.io/template/satnaing-shadcn-admin

Prints do usuário (fotos de inspiração que o Gilwagno trouxer) devem ser salvos nesta
mesma pasta com prefixo `user-`.
