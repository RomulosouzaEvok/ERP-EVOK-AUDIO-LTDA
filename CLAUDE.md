# CLAUDE.md — ERP Evok Áudio LTDA
**Single Source of Truth (SSOT) para o projeto ERP**

**Status:** 🟡 Pré-Go-Live G6 — bloqueadores P0 remediados (commit `d1d3aff`, 2026-08-02); Fase 2/P1 entregue (2026-08-04/07); **cadeia do produto: os 17 gaps fechados em 2026-08-09/10** (o G6 fechou por último, com aprovação do dono) e o **banco voltou a ser reproduzível** (2026-08-10) | **Data:** 10 de agosto de 2026
**Próximo passo:** teste ponta a ponta com escrita real (insumo → produto acabado expedido) → UAT completo → aprovação formal G6 → aquisição do servidor de produção → Go-Live

> ⚠️ **Critério de aceite corrigido em 2026-08-10.** Typecheck + suíte unitária
> verdes **não** provam que um módulo funciona: os 1807 testes unitários usam
> repositório dublê e nenhum toca o PostgreSQL. Quatro rodadas de defeito
> silencioso vieram daí. O aceite honesto é **uma escrita real bem-sucedida no
> fluxo principal**. Leitura obrigatória antes de declarar qualquer coisa
> pronta: `docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`
> e `docs/governance/auditorias/VARREDURA_ESCRITA_REAL_2026-08-10.md`.

---

## 1. Overview

**ERP EVOK ÁUDIO LTDA** é um sistema completo de gestão empresarial para manufatura de auto-falantes profissionais em larga escala (~100-150 colaboradores, 17 departamentos + 6 subáreas funcionais — todos com módulo funcional real desde 2026-08-07, ver `docs/00-ESTRUTURA_ORGANIZACIONAL.md`).

### Cobertura
- **RH & Departamentos:** Estrutura organizacional, funcionários, turnos
- **Vendas & Comercial:** Pedidos, cotações, projeção financeira
- **Marketing:** Campanhas, funil de leads, materiais de divulgação (NOVO 2026-08-07)
- **Compras & Suprimentos:** Requisição, pedidos, recebimento, avaliação de fornecedores, RFQ, importação/COMEX
- **Estoque & Almoxarifado:** Entrada/saída, inventário mobile (QR Code), reservas, curva ABC
- **Produção & PCP:** Ordens de Produção (OP), apontamento, BOM (estrutura de produtos), rotas de manufatura
- **Qualidade:** Inspeção, não-conformidades (NC), testes acústicos
- **Financeiro:** Contas a pagar/receber, fluxo de caixa, projeção 30 dias, conciliação bancária/CNAB
- **Contabilidade:** Plano de contas, lançamentos por partida dobrada, balancete (NOVO 2026-08-07)
- **Tesouraria:** Contas bancárias, operações financeiras (empréstimos/aplicações), posição de caixa (NOVO 2026-08-07)
- **Controladoria:** Orçamento por centro de custo, relatório orçado × realizado (NOVO 2026-08-07)
- **Patrimônio & Manutenção:** Ativos, QR Code, depreciação, manutenção
- **Facilities:** Frota de veículos, abastecimento, limpeza, áreas físicas (NOVO 2026-08-07)
- **Jurídico:** Contratos (+ aditivos/lembretes de prazo), propriedade intelectual (NOVO 2026-08-07)
- **SST & TI:** Segurança e Saúde do Trabalho (EPI, ASO, CIPA, PGR) e helpdesk/patrimônio de TI/acessos (2026-08-06/07)
- **Relatórios & Dashboard:** KPIs, análise de estoque, eficiência de produção, auditor inteligente

### Status Atual
- ✅ Backend: Node.js + Express + Sequelize (30+ módulos, Clean Architecture — use-cases desacoplados do Sequelize direto em 22+ módulos desde 2026-08-05)
- ✅ Database: PostgreSQL 16 — **160 migrations versionadas e aplicadas**, **200 tabelas**, **459 foreign keys** (medido no banco em 2026-08-10, não estimado). Os dois bancos (`erp_evok_audio` e `erp_evok_audio_test`) são **idênticos**, e o baseline passou a ser **DDL estático congelado** (`server/database/postgresql/00_baseline_frozen.sql`) em vez de gerado a partir dos models — banco novo nasce igual ao atual. Ver `docs/database/DATABASE.md`, seção *"Baseline congelado"*
- ✅ Frontend web: React 19 + Vite em `client/` (porta 5173) — praticamente todos os módulos de backend hoje têm tela. **A tela de Importação/COMEX existe** (`/purchases/comex`, `client/src/pages/purchases/ComexPage.tsx`, commit `612e116`) e já conhece o gate de aprovação da diretoria; a **tela de roteiro de fabricação** entrou em `b52470d`. A **tela do Plano Mestre de Produção (MPS)** entrou em 2026-08-10 (`/production/master-plans`), fechando o último módulo de backend sem interface. As exceções restantes são por desenho, não por atraso: inventário mobile (QR, propositalmente mobile-only) e endpoints de webhook (integração backend-to-backend, sem UI)
- ✅ **App mobile novo** (`mobile/`, Expo/React Native): login JWT, scan de estoque QR, histórico de movimentações, execução de contagens cíclicas (pool/atribuídas) — entregue em 2026-08-06, validado só por typecheck/bundle, **sem teste em dispositivo real ainda**
- ✅ **App Android TV novo** (`tv/`, react-native-tvos): painel de demandas por departamento (recebimento, requisições, expedição, qualidade), auto-refresh 60s — entregue em 2026-08-06, mesma ressalva de validação (sem hardware real testado)
- ✅ **4 bloqueadores P0 + 2 P1 remediados em 2026-08-02** (commit `d1d3aff`) — Veja [AUDITORIA_PRE_PRODUCAO_2026-08-02.md](docs/governance/auditorias/AUDITORIA_PRE_PRODUCAO_2026-08-02.md)
- ✅ **Auditoria multi-agente de 7 frentes concluída em 2026-08-06** (geral, segurança, DBA, infra, frontend, mobile/TV, documentação) com remediação imediata de 4 frentes no mesmo dia — veja `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md`, entrada 2026-08-06, e pendências residuais em `docs/governance/TODO.md`
- ✅ **Terceira rodada de entregas em 2026-08-06** (auth refresh deslizante + logging estruturado Winston, paginação/renovação de sessão em `mobile/`/`tv/`, telas web de reatribuição de contagem e fornecedor padrão do item, e 3 gaps de negócio fechados — tabela de preços por cliente, alteração de pedido confirmado, faturamento parcial de NF-e em Vendas; paradas de máquina com OEE preciso em Produção; conciliação bancária OFX em Financeiro) — veja `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md`, entrada "terceira rodada", e `docs/governance/HANDOFF_CODEX.md`
- ✅ **Quarta rodada de entregas em 2026-08-06** (`Asset.status` passou a sincronizar automaticamente com o ciclo de vida da ordem de manutenção — RF-PAT-05 `[IMPLEMENTADO]`, `docs/patrimonio/03-MANUTENCAO.md` §6; e o módulo **Importação/COMEX** (UC-19, RF-COM-12) foi implementado do zero — backend completo em `server/src/modules/comex/`, `/api/comex/import-processes`) — veja `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md` e `docs/governance/HANDOFF_CODEX.md`
- ✅ **Cadeia do produto — 16 dos 17 gaps fechados em 2026-08-09/10.** SSOT do estado: `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` (§3 ondas, §4 decisões D-A a D-K do dono, §5 critério de pronto, §6 registro de execução commit a commit). O que mudou no comportamento do sistema:
  - **Engenharia (G1, `067472a`):** as duas BOMs paralelas viraram **fonte única** (`bill_of_materials`); escrita paralela em `item_estruturas` encerrada com 422; MRP lê por projeção em tempo de leitura, sem réplica
  - **Produção (G5 `c21f81b` + G4 `b954fa5`):** roteiro de fabricação ganhou API e tela, e **concluir OP sem apontamento passa a falhar** — obrigação do SPED Bloco K (Ajuste SINIEF 2/09 cl. 3ª §7º III), documentada em `docs/tributario/04-BLOCO_K.md`
  - **PCP (G17, `3e3827e`):** **Plano Mestre de Produção (MPS)** entre a carteira e a ordem. Venda **não** gera OP automática (decisão D-F: existe PCP formal). Limitação conhecida: `sales` não tem data de entrega prometida, então não há baldes de tempo
  - **Qualidade (G7, `9e061ea`; D-L/D-M, 2026-08-10):** inspeção virou entidade (`quality_inspections`) no formato da ISO 9001:2015 §8.6; liberar lote exige inspeção aprovada; a **quarentena deixou de ser decorativa** (MRP e disponibilidade de OP descontam o saldo retido). **A saída também fechou:** lote em quarentena, bloqueado ou vencido **recusa o faturamento** (422 `D-L`, antes de queimar número de NF-e), a expedição grava rastro por lote em `sale_lot_shipments` e o cancelamento devolve **ao mesmo lote** sem liberar o que a Qualidade bloqueou — provado contra PostgreSQL real em `tests/integration/sale-lot-quality-gate.test.ts`
  - **Vendas (G9, `ed47e10`):** a **baixa de estoque saiu da confirmação do pedido e passou para a autorização da NF-e**; confirmar passou a reservar
  - **Financeiro (G13, `2648686`):** **conta a pagar nasce no recebimento**, **conta a receber na NF-e** (CPC 00 R2 4.56/4.58 e CPC 47); nenhuma parcela nasce paga
  - **Compras (G11 `ec1b499`, G11-COMEX `4b60a81`, D-K `bc13006`):** alçada por **origem** (nacional acima de R$ 500 mil e **toda** importação exigem diretoria), gate da diretoria na saída de `draft` do COMEX, e **segregação de função: quem solicita não aprova** — nos 4 pontos de aprovação, **sem exceção para `admin`**
  - 🟡 **Ação operacional antes de produção (parcialmente resolvida):** a segregação de função (D-K) é sobre identidade, não privilégio. O impasse original — **1 único usuário capaz de aprovar**, autor de 18/18 pedidos e 13/13 requisições — foi desfeito **para teste** em 2026-08-10 por `scripts/seed-usuarios-departamentos.cjs`, que criou 20 usuários departamentais, entre eles **Diretor** (perfil `Diretoria`, com `diretor:approve`) e **Gerente de Compras** (perfil `Compras (gerente)`) — ambos distintos do `admin` autor dos documentos, portanto aptos a aprovar. **O que ainda falta para produção:** esses usuários são deliberadamente de teste (domínio `@teste.evokaudio`, senha aleatória em `CREDENCIAIS_TESTE.local.txt`, e o próprio script recusa rodar com `NODE_ENV=production`). O Go-Live exige **pelo menos um aprovador real no domínio `@evokaudio.com.br`**, que é decisão de pessoa, não de código. Ver `PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4, D-K item 2
  - ✅ **G6 (2026-08-10, último a fechar):** iniciar a produção deixou de "só gravar a data". A OP só entra em `in_progress` se houver **etapa contra a qual apontar** (`G6-START-NO-ROUTE`) e **nenhum centro de trabalho inativo** (`G6-START-WC-INACTIVE`), e a partida registra quem assumiu a ordem. O gap ficou três rodadas aberto por falta de apoio no schema; o que destravou foi o par G5 (roteiro tem API) + G4 (apontamento obrigatório): a pré-condição real passou a existir **sem coluna nova**. O ganho de processo é mover a recusa da conclusão para a partida — antes, produto sem roteiro era liberado, o lote era montado e só então recusado, com material já consumido
- ✅ **Rede de segurança armada (2026-08-10).** Os 34 arquivos de teste de integração **pulavam em silêncio** e reportavam verde, porque `npm run test:integration` não definia `RUN_INTEGRATION`. O script passou a apontar para o runner que sobe a API e usa o banco de teste isolado (`node scripts/run-api-suite.cjs integration`). Três guardas novas contra a classe de defeito que passava por typecheck **e** por 1800 testes: `schema-model-drift-guard`, `column-name-drift-guard` e `enum-literal-guard` (`server/tests/integration/`) — **as três verdes**. **Quarta guarda, 2026-08-10:** `cross-database-drift-guard` — as três anteriores rodam **todas** contra `erp_evok_audio_test`, e por isso nenhuma viu a migration do G18 aplicada só ali, com a coluna faltando no banco real; a guarda nova executa `scripts/comparar-bancos.cjs` e reprova quando os dois bancos divergem

---

## 2. Stack Técnico

| Camada | Tecnologia | Versão | Notas |
|--------|------------|--------|-------|
| **Runtime** | Node.js + TypeScript (`tsx`) | 18+ | Watch mode com nodemon |
| **Web Framework** | Express.js | 4.18 | MVC + Clean Architecture |
| **ORM** | Sequelize | 6.37 | Migrations versionadas, seeds idempotentes |
| **Banco** | PostgreSQL | 16 | Single source of truth, sem alternativas |
| **Autenticação** | JWT + bcrypt | - | 7 dias TTL (configurável), rate-limit 10/15min login |
| **Upload & QR** | Multer + qrcode | 2.2 / 1.5 | Assets armazenados no disco local |
| **Validação** | express-validator | 7.0 | XSS protection, sanitização |
| **Segurança** | Helmet + rate-limit | - | Headers, CORS configurável |
| **Testes** | Jest + Supertest | - | Unit, integration, edge cases |
| **Frontend** | React + TypeScript + Vite | 19 / 8 | React Router v7.18.2, TanStack Query, Tailwind 4/shadcn, Vitest |

### Variáveis de Ambiente Críticas
```bash
DB_HOST              # localhost (Docker) ou IP externo
DB_PASSWORD          # Obrigatória — sem default seguro
JWT_SECRET           # String longa + aleatória
ADMIN_SEED_PASSWORD  # Obrigatória em produção (NODE_ENV=production)
NODE_ENV             # development | production
```

---

## 3. Estrutura de Pastas Crítica

```
erp-evok-audio/
├── server/
│   ├── src/
│   │   ├── models/                  # 18 modelos Sequelize (Item, Fornecedor, OP, etc)
│   │   ├── modules/                 # Módulos por domínio
│   │   │   ├── auth/                  # Login, JWT, perfis (admin, operator, financial)
│   │   │   ├── products/              # Produtos/Items (HANDOFF em Fase 4)
│   │   │   ├── manufacturing/         # Ordens de Produção, apontamento
│   │   │   ├── procurement/           # Requisição (NOVO), compras, fornecedores
│   │   │   ├── warehouse/             # Estoque, inventário, movimentações
│   │   │   ├── sales/                 # Vendas, clientes, contas a receber
│   │   │   ├── financial/             # Financeiro, fluxo de caixa
│   │   │   └── ...
│   │   ├── controllers/             # Camada HTTP
│   │   ├── middlewares/             # Auth, errorHandler
│   │   ├── routes/                  # 19 arquivos de rotas
│   │   ├── services/                # Dashboard, relatórios, QR, upload
│   │   ├── scripts/backfill/        # Migrations Product→Item (Fase 4)
│   │   └── config/
│   ├── database/
│   │   └── postgresql/
│   │       ├── 01_schema.sql        # Schema base (37 tabelas)
│   │       ├── 02a_extend_item_estruturas.sql  # BOM estendido
│   │       ├── 02b_item_categorias.sql        # Categorias novo modelo
│   │       ├── 04a_inventory_movements_expand.sql  # Dual-read Phase 4.1
│   │       └── ...
│   └── __tests__/                   # Unit, integration, edge tests
├── client/                          # Frontend web React 19 + Vite (páginas, rotas, api client)
├── mobile/                          # App mobile Expo/React Native (login, scan QR, contagens cíclicas) — NOVO 2026-08-06
├── tv/                              # App Android TV react-native-tvos (painel de demandas por departamento) — NOVO 2026-08-06
├── docs/
│   ├── projeto/                     # Plano, arquitetura, use-cases (numeração 00-04)
│   │   ├── 00-README.md
│   │   ├── 01-PLANO.md
│   │   ├── 02-PLANO_INDUSTRIAL.md
│   │   └── 04-USE_CASES.md
│   ├── arquitetura/                 # Requisitos + diagramas (sequência, infra, BPMN) — NOVO 2026-08-06
│   ├── database/                    # Modelo de dados estruturado (00-INDICE.md a 07-DISASTER_RECOVERY.md) — NOVO 2026-08-06
│   ├── business/                    # Casos de uso em draft (UC-30+) + regras de negócio — a consolidar em projeto/04-USE_CASES.md conforme implementado
│   ├── governance/                  # TODO.md (SSOT de pendências dia a dia) + reorganização de departamentos
│   ├── manual/                      # Manual do usuário final — NOVO 2026-08-06
│   ├── infra/                       # Deploy Ubuntu/produção, Docker/Postgres, backup/restore
│   ├── governance/
│   │   ├── auditorias/                # AUDITORIA_PRE_PRODUCAO_*, CONFORMIDADE_CHECK_*, LEVANTAMENTO_ERP_* — achados
│   │   ├── go-live/                   # GO_LIVE_G6_CHECKLIST, DIARIO_BORDO_GO_LIVE_G6 (append-only), PLANO_IMPLEMENTACAO_*
│   │   ├── HANDOFF_CODEX.md           # Product/Item migration (Phase 1–4.1) + handoffs de bloco
│   │   └── TODO.md                    # SSOT de pendências dia a dia
│   ├── producao/, administrativo/, comercial/, financeiro/, juridico/,
│   │   logistica/, patrimonio/, qualidade/, rh/, seguranca_trabalho/,
│   │   suprimentos/, tributario/    # docs departamentais (00-README.md + NN-TEMA.md cada)
│   └── ...
├── package.json
└── CLAUDE.md                        # Este arquivo
```

---

## 4. Módulos Principais

### Autenticação & Autorização
- **Login JWT:** rate-limited, 10 tentativas/15min, 7 dias TTL
- **Perfis:** admin (acesso total), operator (leitura/escrita operacional), financial (leitura financeira)
- **Proteção:** RBAC em 100% das rotas; anti-spoofing de identidade (requester/approved_by/operator vêm do JWT ou são validados por FK) — remediação 3.1 de 2026-08-02

### Produtos & Engenharia (Handoff em Execução)
- **Núcleo (Item):** Código, descrição, tipo, estoque, custo padrão — **NUNCA MUDA** (MRP hot path)
- **Extensões:** 
  - `ItemDetalheComercial` (1:1 obrigatória): preço, NCM/CEST, peso, localização, desenho
  - `ItemEspecificacaoTecnica` (1:1 opcional): Thiele-Small (13 parâmetros JSONB), família técnica
  - `ItemCategoria` (1:n): categorias refatoradas em novo modelo
- **BOM (ItemEstrutura):** Hierarquia multi-nível, componentes, perdas %, custo total, validação de ciclos
- **Status:** Fase 1–2 (schema + backfill scripts) ✅ | Fase 4 (dual-read, inventory_movements) ✅ | Fase 5 (módulos app) 🔧

### Planejamento & Produção
- **OP (Ordem de Produção):** Status (planned → released → in_progress → completed), vínculo com venda
- **Apontamento:** Quantidade produzida, refugo, parada de máquina, downtime (CRÍTICO: reconciliação com OP)
- **Paradas de Máquina / Downtime (NOVO, 2026-08-06):** `/api/production/downtimes` — motivo categorizado (setup, manutenção corretiva/preventiva, falta de material/operador, qualidade, outros), bloqueio de 2ª parada aberta simultânea por centro (use case + índice único parcial); alimenta o cálculo de OEE
- **OEE (NOVO, 2026-08-06):** `GET /api/reports/oee` — Disponibilidade × Performance × Qualidade por centro de trabalho e agregado geral, com desconto de downtime real das horas disponíveis
- **Rotas de Manufatura:** Operações sequenciais, setup, cycle time, labor time
- **MRP:** Roda contra estoque REAL (não congelado), requisita materiais via **Requisição de Compra** (NOVO P0)

### Compras & Suprimentos
- **Requisição de Compra (NOVO):** Origem da cadeia de suprimentos, rastreabilidade 100% (bloqueador P0)
- **Cotação / RFQ multi-fornecedor (NOVO, 2026-08-06):** `/api/rfqs`, tela `/purchases/rfqs` — cria cotação avulsa ou a partir de requisição, convida fornecedores, registra cotações (mapa comparativo com melhor preço/prazo destacados), adjudica por item (podendo dividir entre fornecedores), gera pedido(s) de compra por fornecedor vencedor e realimenta o catálogo `item_suppliers`
- **Pedido de Compra:** Origem em Requisição, status (pending → approved → sent → partial → received)
- **Fornecedores:** Avaliação, prazos, termos de pagamento
- **Recebimento:** Entrada no estoque, geração de Contas a Pagar (pós-recebimento, não em aprovação)
- **Importação / COMEX (NOVO, 2026-08-06):** `/api/comex/import-processes` (UC-19) — processo de importação (fornecedor, itens, FOB, câmbio, frete/seguro), cálculo automático de tributos (II/IPI/PIS/COFINS/ICMS, alíquotas informadas manualmente por item — sem integração Siscomex/NCM), acompanhamento sequencial (`shipped → arrived → customs_cleared`), recebimento com entrada em estoque e custo nacionalizado. **Tela em `/purchases/comex`** (`612e116`). Desde 2026-08-10 a **diretoria aprova na saída de `draft`** (gate G11-COMEX/D-G, `import_process_approvals`, `4b60a81`) e a entrada de material passou pelo padrão do G14 (lote + quarentena). **Ainda sem AP automática dos tributos** — é escopo do G13 e depende de decisão do dono sobre moeda estrangeira (ver `docs/arquitetura/API.md` §32, `docs/governance/HANDOFF_CODEX.md`)

### Estoque & Logística
- **Inventário:** Entrada/saída/ajuste com rastreamento completo
- **Movimentações:** Cada evento registra tipo (in/out/adj), motivo, quantidade, custo
- **Reservas:** Global por item (CRÍTICO: vincular por OP em P1 para evitar canibalização)
- **Mobile QR:** Leitura em lote para inventário rápido
- **Curva ABC:** Análise de rotatividade e valor

### Vendas & Financeiro
- **Pedidos:** Itens, descontos, transições de status (quote → confirmed → partially_invoiced → invoiced)
- **Alteração de pedido (NOVO, 2026-08-06):** `PUT /api/sales/:id/items` substitui os itens de uma venda `quote`/`confirmed` (ajusta reserva de estoque na mesma transação; bloqueado a partir de faturamento parcial/total)
- **Faturamento parcial (NOVO, 2026-08-06):** `POST /api/sales/:id/nfe` aceita quantidade por item; `sale_items.invoiced_quantity` acumula entre emissões; risco residual: sem histórico multi-NF-e por pedido (`Sale.nfe_*` só guarda a mais recente)
- **Tabela de preços por cliente (NOVO, 2026-08-06):** `customer_price_lists`, preço negociado por par cliente×produto com vigência opcional, sugerido (editável) ao montar o pedido
- **Contas a Receber:** Origem em vendas, controle de inadimplência
- **Contas a Pagar:** Manual + automática de compras (no recebimento); `cost_center_id` opcional (NOVO, 2026-08-06)
- **Centros de Custo (NOVO, 2026-08-06):** CRUD + relatório agrupado (`GET /api/finance/cost-centers/report`), atribuição em contas a pagar/receber existentes
- **Fluxo de Caixa:** Projeção semanal 30/60/90 dias + **projeção diária (NOVO, 2026-08-06)** com saldo acumulado dia a dia (`GET /api/finance/cashflow/projection`)
- **Conciliação Bancária (NOVO, 2026-08-06):** `/api/finance/reconciliation/*` — importação de extrato OFX (dedup global por FITID), sugestões automáticas de match, baixa de conta a pagar/receber; **CNAB ainda pendente** (ver `docs/governance/TODO.md`)
- **Relatórios:** Dashboard KPI (vendas hoje/mês/ano), análise cliente

### Qualidade & Compliance
- **Inspeção:** Entrada, in-process, final, auditoria
- **Não-Conformidades:** Registro de defeitos, ações corretivas
- **Testes Acústicos:** Parâmetros Thiele-Small (fs, Qms, Vas, etc)
- **Rastreabilidade:** Lote/série para cada produto acabado

---

## 5. Go-Live Readiness (Crítico)

### ✅ Bloqueadores remediados em 2026-08-02 (commit `d1d3aff`)
Veja [AUDITORIA_PRE_PRODUCAO_2026-08-02.md](docs/governance/auditorias/AUDITORIA_PRE_PRODUCAO_2026-08-02.md) e [LEVANTAMENTO_ERP_2026-08-02.md](docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md).

| ID | Bloqueador | Status |
|----|-----------|--------|
| 1.1 | Requisição de Compra | ✅ RESOLVIDO — módulo `/api/purchase-requisitions` testado end-to-end |
| 1.2 | MRP congelado | ✅ RESOLVIDO — MRP contra estoque real (dual-read), validado |
| 2.1 | Foreign keys ausentes | ✅ RESOLVIDO — 133 FKs via migration versionada |
| 3.1 | IDOR / spoofing de identidade | ✅ RESOLVIDO — RBAC 100% + identidade do JWT |
| 3.2 | react-router CVE-2025-68470 / `GHSA-qwww-vcr4-c8h2` | ✅ RESOLVIDO — upgrade para v8.3.0 (2026-08-04), `npm audit` 0 vulnerabilidades |
| 1.3 | Apontamento × OP desconectados | ✅ RESOLVIDO — reconciliação na conclusão da OP |

### Roadmap
1. **Fase 1 (P0):** ✅ Concluída em 2026-08-02 → **próximo: UAT → Go-Live G6**
2. **Fase 2 (P1):** ✅ Majoritariamente entregue entre 2026-08-04 e 2026-08-06 — catálogo item×fornecedor (N:N), **Cotação/RFQ multi-fornecedor**, conversão requisição→pedido, MRP fecha ciclo (plano→OP e plano→requisição), telas de MRP/requisição/qualidade, custeio real de mão-de-obra/overhead, rastreabilidade por lote/QR, perfis de acesso configuráveis (RBAC completo), múltiplos depósitos, **centros de custo + projeção diária de fluxo de caixa**, **OEE completo com downtime real (NOVO)**, apps mobile e Android TV com **renovação de sessão via `POST /api/auth/refresh` (NOVO)**, **conciliação bancária OFX (NOVO)**, em Vendas **alteração de pedido, faturamento parcial e tabela de preços por cliente (NOVO)**, sincronização automática de `Asset.status` com o ciclo de vida da ordem de manutenção (RF-PAT-05, NOVO) e o módulo **Importação/COMEX (NOVO)** — UC-19 fechado, backend completo. **O que realmente falta desta fase:**
   - Validação em hardware real dos apps `mobile/`/`tv/` (checklist em `mobile/README.md` §5 e `tv/README.md` §5)
   - Teste de integração de concorrência real do claim de contagem cíclica (2 clients simultâneos contra Postgres)
   - Backfill retroativo de custo de mão-de-obra/overhead em OPs concluídas antes de 2026-08-04 (decisão consciente de não fazer, registrada como risco residual)
   - Mapeamento departamento→centro de custo na AP automática, CNAB (boleto/remessa/retorno — só OFX foi implementado)
   - Histórico multi-NF-e por pedido (`sale_invoices`) e reconciliação de status assíncrono de provedores reais de NF-e com faturamento parcial
   - Teste de integração real (Postgres) das 3 features de maior risco da terceira rodada de 2026-08-06: conciliação bancária, índice único parcial de downtime, faturamento parcial (ver `docs/governance/TODO.md`, seção 2026-08-06 terceira rodada)
   - ~~Tela web do módulo Importação/COMEX~~ ✅ **entregue em 2026-08-10** (`612e116`, `/purchases/comex`). Continua pendente o teste de integração real (Postgres) do fluxo create→tracking→receive de COMEX e da sincronização `Asset.status`↔ordem de manutenção
   - ~~Tela do **Plano Mestre de Produção (MPS)**~~ ✅ **entregue em 2026-08-10** (`/production/master-plans`) — a tela mostra sugerido × planejado lado a lado (a divergência é o que a auditoria de PCP procura) e avisa, na própria interface, que a demanda é consolidada sem baldes de tempo
3. **Fase 3 (P2):** Capacidade finita/centros de trabalho, TypeScript strict
4. **Fase 4 (P3):** Refugo detalhado por etapa, CI/CD, unificação schema legado/novo (decisão futura de `DROP TABLE` das 12 tabelas órfãs do schema-fantasma em português, marcadas `DEPRECATED` em 2026-08-06 — ver `docs/database/DATABASE.md`)
5. **Infra de produção (bloqueia deploy, independente das fases acima):** servidor de produção (VPS/on-premise) ainda não adquirido; reverse proxy/TLS, `docker-compose.prod.yml` exercitado de fato e cron de backup aguardando essa compra — ver `docs/infra/DEPLOY_UBUNTU.md` e `docs/governance/go-live/GO_LIVE_G6_CHECKLIST.md`. **O banco deixou de ser bloqueador** desde 2026-08-10: o baseline congelado faz um banco novo nascer idêntico ao atual (provado com banco descartável provisionado só por migrations). Falta a troca da credencial de runtime para a role de privilégio mínimo `evok_app` — ver `docs/database/05-ACESSOS_E_ISOLAMENTO.md`

---

## 6. Runbook Operacional

### Setup Local
```bash
# 1. Variáveis de ambiente
cp .env.example .env
# Preencha: DB_PASSWORD, JWT_SECRET, ADMIN_SEED_PASSWORD

# 2. Instale dependências
npm run install-all

# 3. Suba PostgreSQL (Docker)
docker compose up -d

# 4. Rode backend em watch mode
npm run server
# Seed automático na primeira execução (admin, departamentos, categorias)

# 5. Teste
npm test                    # Suíte completa
npm run test:unit          # Apenas unitários
npm run test:integration   # Apenas integração
```

### Migrations
```bash
cd server

npm run migration:status    # Lista migrations
npm run migration:up        # Aplica próxima
npm run migration:down      # Desfaz última
npm run migration:up --name 01_schema.sql  # Aplica específica
```

### Deploy (CI/CD)
- **Branch:** `main` (produção)
- **Env:** Docker Compose (PostgreSQL 16 gerenciado)
- **Secrets:** `.env` gerado via secrets manager (não versionado)
- **Entrypoint:** `npm start` (Node.js em produção)
- **Rollback:** Revert Git commit + re-deploy + `npm run migration:down` se necessário

### Monitoramento Pós-Go-Live
- **Logs:** Winston estruturado (NOVO, 2026-08-06) — JSON em produção, colorido em dev; integrado em request-logger, errorHandler e boot; `LOG_FILE` opcional (sem rotação de arquivo — configurar logrotate externo se usado em produção)
- **Alertas:** Estoque zerado/negativo, OP atrasadas, contas vencidas
- **Health Check:** `GET /health/live` (processo) e `GET /health/ready` (processo + PostgreSQL) — implementados
- **Backup:** PostgreSQL dump diário via cron

---

## 7. Decisões Arquiteturais & Trade-offs

### Item Core Intocado + Extensões por Domínio
**Decisão:** `Item` mantém 12 colunas críticas para MRP (nunca muda); extensões em tabelas separadas.

**Por quê:** 
- MRP não acessa campos comerciais/técnicos → sem N+1, sem bloqueios
- Novos tipos de produto (CABOS, AMPLIFICADORES) → sem ALTER TABLE
- Facilita versionamento de especificações técnicas

**Tradeoff:** Mais JOINs em queries comerciais, mas ganho em flexibilidade e performance.

### Requisição de Compra como Origem
**Decisão:** Toda cadeia de suprimentos começa em Requisição (não em OP/previsão).

**Por quê:** 
- Rastreabilidade 100% (origem → requisição → compra → recebimento → estoque)
- Auditoria fiscal simples
- Requisição pode vir de: MRP, OP, estoque baixo, ou planejador

**Tradeoff:** Passo extra no fluxo, mas requisito P0 de auditoria.

### MRP Contra Estoque Real, Não Congelado
**Decisão:** MRP roda cada vez que venda/OP é criada, contra estoque atualizado (não snapshot).

**Por quê:** Não há necessidade de congelar; base de dados é transacional
- Requisição gerada com dados atuais
- Incorpora compras recentes e ajustes

**Tradeoff:** Menos previsível (não há "MRP run" com hora específica), mas mais preciso.

### Foreign Keys Obrigatórias
**Decisão:** Integridade referencial obrigatória — **459 FKs** no banco (contadas em `pg_constraint` em 2026-08-10; base de 133 em 2026-08-02), aplicadas via migrations versionadas, com `ON DELETE RESTRICT` (padrão) ou `CASCADE`/`SET NULL` (quando apropriado). A guarda `schema-model-drift-guard` reprova FK `ON DELETE SET NULL` sobre coluna `NOT NULL` — contradição que já escondeu 12 colunas indevidamente obrigatórias.

**Por quê:** Integridade referencial, sem órfãos, auditoria
**Tradeoff:** Mais rígido (ex: não pode deletar fornecedor com compras abertas), mas banco garante consistência

### Sem Soft Delete Padrão (Apenas Category)
**Decisão:** Apenas `Category` tem soft delete (`active` flag); outras tabelas usam `status` enum ou `deleted_at`.

**Por quê:** Auditoria fiscal exige histórico imutável (ex: OP, NF-e não podem "desaparecer")
**Tradeoff:** Cuidado com queries (sempre filtra `active = true` ou `status != 'deleted'`)

---

## 8. Links Críticos

### Documentação Técnica
- **[docs/projeto/01-PLANO.md](docs/projeto/01-PLANO.md)** — Arquitetura, 18 modelos, stack, roadmap técnico
- **[docs/projeto/02-PLANO_INDUSTRIAL.md](docs/projeto/02-PLANO_INDUSTRIAL.md)** — 21 departamentos, BOM de auto-falante, processos produção
- **[docs/projeto/04-USE_CASES.md](docs/projeto/04-USE_CASES.md)** — Casos de uso (UC-01 a UC-XX)
- **[docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md](docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md)** — Índice executivo de Requisitos Funcionais por módulo (link para UC/rota real cada um), + RNFs por referência
- **[docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md](docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md)** — Requisitos não funcionais (desempenho, segurança, disponibilidade, escalabilidade)
- **[docs/arquitetura/DIAGRAMA_CASOS_DE_USO_BPMN.md](docs/arquitetura/DIAGRAMA_CASOS_DE_USO_BPMN.md)** — Diagrama de casos de uso + BPMN simplificado (Order-to-Cash, Purchase-to-Pay, Qualidade, Manutenção)
- **[docs/manual/00-MANUAL_DO_USUARIO.md](docs/manual/00-MANUAL_DO_USUARIO.md)** — Manual do usuário (conteúdo prático completo em Vendas, Compras, Estoque/Inventário e Produção; demais módulos ainda esqueleto)
- **[docs/governance/HANDOFF_CODEX.md](docs/governance/HANDOFF_CODEX.md)** — Migração Product → Item (Fase 1–4.1, backfill scripts)
- **[docs/database/DATABASE.md](docs/database/DATABASE.md)** — Changelog histórico narrativo de modelagem/migrations
- **[docs/database/00-INDICE.md](docs/database/00-INDICE.md)** — Documentação de dados de referência sempre-atual (Modelo Conceitual/MER, Modelo Lógico/DER, Modelo Físico/DDL, Dicionário de Dados das 78 tabelas, Acessos e Isolamento, Estruturas Programáveis, Disaster Recovery) — NOVO, 2026-08-06

### Crítico — Go-Live
- **[docs/governance/auditorias/AUDITORIA_PRE_PRODUCAO_2026-08-02.md](docs/governance/auditorias/AUDITORIA_PRE_PRODUCAO_2026-08-02.md)** — 4 bloqueadores P0, 15 altos P1, plano 30h
- **[docs/governance/go-live/GO_LIVE_G6_CHECKLIST.md](docs/governance/go-live/GO_LIVE_G6_CHECKLIST.md)** — Plano operacional/checklist de Go-Live, gate atual (UAT + servidor de produção pendente)
- **[docs/governance/TODO.md](docs/governance/TODO.md)** — Rastreamento dia a dia de tarefas/bugs/achados de auditoria (SSOT de pendências)
- **[docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md](docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md)** — Diário de bordo append-only da execução do Go-Live G6
- **[docs/arquitetura/API.md](docs/arquitetura/API.md)** — Endpoints, payloads, erros

### Operacional
- **[README.md](README.md)** — Setup rápido, scripts npm
- **[docs/infra/DOCKER_POSTGRES_SETUP.md](docs/infra/DOCKER_POSTGRES_SETUP.md)** — Docker Compose, troubleshooting DB
- **[docs/infra/DEPLOY.md](docs/infra/DEPLOY.md)** — CI/CD, produção

### Funcional por Área
- **[docs/producao/06-BOM.md](docs/producao/06-BOM.md)** — Estrutura de produtos (detalhado)
- **[docs/00-ESTRUTURA_ORGANIZACIONAL.md](docs/00-ESTRUTURA_ORGANIZACIONAL.md)** — 17 departamentos reais (seed) + 6 subáreas funcionais, índice por módulo
- **[docs/administrativo/04-PERFIS_ACESSO.md](docs/administrativo/04-PERFIS_ACESSO.md)** — RBAC + Perfis de Acesso configuráveis (`/api/access-profiles`), 29 módulos atribuíveis
- **[docs/administrativo/05-ORGANOGRAMA_EXECUTIVO.md](docs/administrativo/05-ORGANOGRAMA_EXECUTIVO.md)** — Organograma executivo consolidado (CEO → 3 diretorias → 17 departamentos)
- Mais em `docs/comercial/`, `docs/financeiro/`, `docs/qualidade/`, etc.

### Arquitetura, Diagramas e Manual do Usuário (NOVO, 2026-08-06)
- **[docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md](docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md)** — desempenho, segurança, disponibilidade, escalabilidade, observabilidade (extraído do código real, sem números inventados)
- **[docs/arquitetura/DIAGRAMA_ARQUITETURA_INFRAESTRUTURA.md](docs/arquitetura/DIAGRAMA_ARQUITETURA_INFRAESTRUTURA.md)** — diagrama Mermaid do ambiente de dev real e do plano de produção (servidor ainda não adquirido)
- **[docs/arquitetura/DIAGRAMAS_SEQUENCIA.md](docs/arquitetura/DIAGRAMAS_SEQUENCIA.md)** — sequência dos 3 fluxos mais críticos (venda→estoque→NF-e, requisição→RFQ→compra→recebimento, OP→apontamento→OEE)
- **[docs/arquitetura/DIAGRAMA_CASOS_DE_USO_BPMN.md](docs/arquitetura/DIAGRAMA_CASOS_DE_USO_BPMN.md)** — diagrama de casos de uso (atores × módulos) e BPMN simplificado (Order-to-Cash, Purchase-to-Pay)
- **[docs/arquitetura/DIAGRAMA_CLASSES.md](docs/arquitetura/DIAGRAMA_CLASSES.md)** / **[docs/arquitetura/DIAGRAMA_CLASSES_CAMADAS.md](docs/arquitetura/DIAGRAMA_CLASSES_CAMADAS.md)** — diagrama de classes do backend e das camadas Clean Architecture
- **[docs/manual/00-MANUAL_DO_USUARIO.md](docs/manual/00-MANUAL_DO_USUARIO.md)** — manual do usuário por módulo (esqueleto inicial, caminhos de menu reais)
- Modelo conceitual/lógico/físico, matriz de privilégios, procedures/triggers e plano de disaster recovery ficam em `docs/database/DATABASE.md` (escopo do agente `AdmDBA`, tratado separadamente para não duplicar/conflitar)

---

## 9. Perguntas Frequentes

**P: Por que Go-Live está bloqueado?**  
R: Não está mais bloqueado pelos 4 críticos — todos remediados em 2026-08-02 (commit d1d3aff). O gate remanescente é UAT + aprovação formal G6.

**P: Como codar um novo módulo?**  
R: Siga `modules/{modulo}/{use-cases,repositories,controllers}/` padrão Clean Architecture. Modelos em `src/models/`, rotas em `src/routes/`.

**P: Quem aprova o Go-Live?**  
R: CTO/Tech Lead (plano 30h), CFO (riscos), Gerente Produção (rastreabilidade), Compliance (LGPD/ISO).

**P: Frontend está pronto?**  
R: Web (`client/`, React 19 + Vite, porta 5173) cobre praticamente todos os módulos do backend — login, dashboard, produtos, vendas, compras, requisição de compra, MRP, produção/BOM, **roteiro de fabricação** (`b52470d`), qualidade, financeiro, patrimônio, manutenção, RH, relatórios, configuração fiscal, auditor inteligente, usuários/perfis de acesso, rastreabilidade e **Importação/COMEX** (`/purchases/comex`, `612e116`). e **Plano Mestre de Produção** (`/production/master-plans`, 2026-08-10). As exceções por desenho (não por atraso) são o inventário mobile via QR (propositalmente mobile-only) e os endpoints de webhook (integração backend-to-backend, sem UI) — **não há mais módulo de backend sem tela**. Além disso, dois apps: `mobile/` (Expo, inventário QR + contagens cíclicas) e `tv/` (Android TV, painel de demandas por departamento) — ambos entregues em 2026-08-06, validados só por typecheck/bundle, **ainda sem teste em hardware real**.

**P: Posso rodar em MySQL/SQLite?**  
R: Não. Apenas PostgreSQL 16 é suportado (veja README.md seção "Diretriz de arquitetura").

---

## 10. Contato & Escalação

- **CTO / Tech Lead:** Plano técnico 30h, aprovação P0
- **CFO:** Risco contábil (custeio, payable), aprovação fiscal
- **Gerente Produção:** Validação rastreabilidade, OP + apontamento
- **Compliance:** LGPD conformidade, ateste ISO (se aplicável)
- **Claude Code Agents:** `claude --agent evok-production-remediation` ou `@evok-production-remediation` em sessão; `claude --agent PromadorFonteEnd` ou `@PromadorFonteEnd` para tarefas de frontend; `claude --agent webdesiner` ou `@webdesiner` para estilização/UI-UX (propõe plano e para para aprovação antes de editar); `claude --agent AdmDBA` ou `@AdmDBA` para modelagem/schema/PostgreSQL (MER/DER, dicionário de dados, acessos/isolamento, disaster recovery); `claude --agent AnalistaNegocios` ou `@AnalistaNegocios` para engenharia de requisitos/BPMN/casos de uso; `claude --agent ArquitetoSoftwareAPI` ou `@ArquitetoSoftwareAPI` para diagramas de classe/sequência e contratos de API; `claude --agent AuditorIntegrador` ou `@AuditorIntegrador` para auditoria cruzada Requisito↔Banco↔API; `claude --agent iterative-review` ou `@iterative-review` para revisões multi-agente; `claude --agent cleanliness-review` ou `@cleanliness-review` para limpeza e polimento de código

---

**Versão:** 1.4 SSOT
**Última atualização:** 10 de agosto de 2026 (cadeia do produto: 16/17 gaps fechados · baseline do schema congelado, banco reproduzível · rede de segurança de integração armada)
**Próxima revisão:** Pós-Go-Live (semana 1 de setembro)

Remova referências a análises antigas. Este documento é o guia único de verdade.
