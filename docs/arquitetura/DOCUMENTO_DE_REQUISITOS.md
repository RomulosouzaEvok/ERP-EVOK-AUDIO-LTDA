# Documento de Requisitos — ERP EVOK ÁUDIO

**Status:** 🟢 Ativo (criado em 2026-08-06, **revisado em 2026-08-12** pela
auditoria documental — 11 alegações falsas corrigidas, ver rodapé). **Este
documento NÃO substitui os casos de uso** (`docs/projeto/04-USE_CASES.md` —
UC-01 a UC-73, foco em fluxo de negócio; `docs/business/01-USE_CASES.md` —
UC-30 a UC-43, **consolidado** em `04-USE_CASES.md`, mantido só como
histórico). Ele é o **índice executivo**: uma lista rastreável
de Requisitos Funcionais (RF) por módulo, cada um com link para o UC e/ou
rota/endpoint real que o implementa, e uma seção de sumário de Requisitos Não
Funcionais que aponta para o documento dedicado
(`docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md`) em vez de duplicá-lo.

**Método:** cada RF abaixo foi extraído da leitura real de
`server/app.ts` (mapeamento de rotas), `server/src/routes/` /
`server/src/modules/*/presentation/routes/`, `client/src/App.tsx` (rotas do
frontend) e dos UCs formais já escritos. **Não há requisito inventado**: onde
um UC descreve algo que o código não implementa (ex.: UC-19 Importação/COMEX),
o RF correspondente está marcado `[PENDENTE]` e a divergência é anotada
explicitamente.

Convenção de tags (igual ao restante da documentação do projeto, ver
`CLAUDE.md`):
- `[IMPLEMENTADO]` — código existe, rota real responde, tela cabeada (quando
  aplicável).
- `[PENDENTE]` — descrito em UC/CLAUDE.md, mas sem código correspondente ou
  com lacuna relevante.
- `[PARCIAL]` — parte do requisito está implementada, parte não (detalhado na
  própria linha).

---

## 1. Autenticação, Usuários e Acesso (RF-AUT)

| RF | Descrição | Status | Referência |
|---|---|---|---|
| RF-AUT-01 | Login com email/senha, JWT, rate-limit 10/15min | `[IMPLEMENTADO]` | UC-01, `POST /api/auth/login` |
| RF-AUT-02 | Renovação de sessão sem novo login (refresh deslizante) | `[IMPLEMENTADO]` | `POST /api/auth/refresh`, `docs/arquitetura/API.md` §1 |
| RF-AUT-03 | Recuperação de senha por email | `[IMPLEMENTADO]` | `client/src/pages/ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx` |
| RF-AUT-04 | CRUD de usuários, ativação/inativação | `[IMPLEMENTADO]` | UC-10, `/api/users` |
| RF-AUT-05 | Perfis de acesso configuráveis por módulo (`operate`/`approve`), atribuição a usuário | `[IMPLEMENTADO]` | UC-30 a UC-33, UC-36, `/api/access-profiles` |
| RF-AUT-06 | Menu do frontend resolvido dinamicamente conforme perfil (módulo oculto = sem acesso) | `[IMPLEMENTADO]` | UC-34, `GET /api/auth/me/permissions` |
| RF-AUT-07 | Bloqueio de tela/API para módulo fora do perfil (403 consistente) | `[IMPLEMENTADO]` | UC-35, UC-35-Exceção |
| RF-AUT-08 | Distinção de ação de gestor (`approve`) vs. operador (`operate`) dentro da mesma área | `[IMPLEMENTADO]` | UC-37 |
| RF-AUT-09 | Registro de auditoria de ações sensíveis (quem/quando/o quê) | `[PARCIAL]` | O mecanismo existe e funciona (modelo `AuditLog`, `/api/audit-logs`, tela `/audit-logs`), mas a **cobertura não é universal**: **35 dos 98 controllers não chamam `logAction`** (63 chamam) — entre eles o do item mestre. **14 módulos** estão em *débito congelado* na guarda `server/tests/unit/audit-coverage-guard.test.ts` (`accessProfiles`, `assets`, `categories`, `clients`, `departments`, `employees`, `items`, `maintenance`, `mobileInventory`, `nonConformities`, `serviceOrders`, `suppliers`, `users`, `webhooks`) — a lista é catraca, só pode encolher. Fonte medida: `docs/governance/RESIDUAIS_ABERTOS_2026-08-10.md` §3 |

---

## 2. Vendas / Comercial (RF-VEN)

| RF | Descrição | Status | Referência |
|---|---|---|---|
| RF-VEN-01 | Cadastro de clientes (CPF/CNPJ único, dados fiscais) | `[IMPLEMENTADO]` | UC-02, `/api/clients`, tela `/sales/clients` |
| RF-VEN-02 | Registro de venda (itens, descontos, parcelas), bloqueio se estoque insuficiente | `[IMPLEMENTADO]` | UC-04, `POST /api/sales`, tela `/sales`. **Atenção (G9, commit `ed47e10`, 2026-08-10): a baixa física de estoque NÃO ocorre mais na confirmação do pedido** — confirmar apenas **reserva**; a baixa acontece na **autorização da NF-e** (`POST /api/sales/:id/nfe`). Desde D-L, lote em quarentena/bloqueado/vencido **recusa o faturamento** (422) antes de queimar número de NF-e |
| RF-VEN-03 | Transições de status (`quote → confirmed → partially_invoiced → invoiced → shipped`/`canceled`) | `[IMPLEMENTADO]` | UC-04, UC-41, `PUT /api/sales/:id/status` |
| RF-VEN-04 | Alteração de itens de venda `quote`/`confirmed` com reajuste de reserva de estoque | `[IMPLEMENTADO]` | `PUT /api/sales/:id/items`, CLAUDE.md §4 (2026-08-06) |
| RF-VEN-05 | Emissão de NF-e restrita a perfil `approve` do módulo Vendas | `[IMPLEMENTADO]` | UC-41, `POST /api/sales/:id/nfe` |
| RF-VEN-06 | Faturamento parcial de NF-e por pedido (`invoiced_quantity` acumulado por item) | `[IMPLEMENTADO]` | CLAUDE.md §4 (2026-08-06); risco residual: sem histórico multi-NF-e (`docs/arquitetura/API.md` §5) |
| RF-VEN-07 | Tabela de preços negociados por cliente×produto (sugestão editável ao montar pedido) | `[IMPLEMENTADO]` | `customer_price_lists`, `/api/sales/customers/:id/prices` |
| RF-VEN-08 | Expedição de venda faturada (status terminal `shipped`) | `[IMPLEMENTADO]` | UC-27, tela `/logistics/expedicao` |
| RF-VEN-09 | Handoff visual (semáforo) entre Vendas e Expedição/Qualidade | `[IMPLEMENTADO]` | UC-40, `GET /api/dashboard` (handoffs) |

---

## 3. Compras / Suprimentos (RF-COM)

| RF | Descrição | Status | Referência |
|---|---|---|---|
| RF-COM-01 | Requisição de compra como origem obrigatória da cadeia de suprimentos | `[IMPLEMENTADO]` | UC-23, `/api/purchase-requisitions`, tela `/purchases/requisitions` |
| RF-COM-02 | Workflow de aprovação de requisição restrito a perfil `approve`, com `approved_by` vindo do JWT (anti-spoofing) **e segregação de função: quem solicita não aprova** | `[IMPLEMENTADO]` | UC-23, remediação 3.1 `AUDITORIA_PRE_PRODUCAO_2026-08-02.md`. **D-K (2026-08-10, commit `bc13006`): `admin` NÃO é exceção** — a regra é sobre identidade, não sobre privilégio, e vale nos 4 pontos de aprovação (`server/src/shared/domain/segregationOfDuties.ts`, erros `D-K-PEDIDO`/`D-K-ALCADA`/`D-K-REQUISICAO`) |
| RF-COM-03 | Conversão de requisição aprovada em pedido(s) de compra (1 por fornecedor resolvido) | `[IMPLEMENTADO]` | UC-25, `POST /api/purchase-requisitions/:id/convert` (ver `docs/arquitetura/API.md`) |
| RF-COM-04 | Cotação/RFQ multi-fornecedor: convite, registro de cotações, mapa comparativo, adjudicação por item (com split) | `[IMPLEMENTADO]` | `/api/rfqs`, tela `/purchases/rfqs`, `docs/arquitetura/API.md` §11.1 |
| RF-COM-05 | Pedido de compra: fluxo `pending → approved → sent → partial → received`, com **alçada de aprovação por origem** | `[IMPLEMENTADO]` | UC-15, `/api/purchases`. **Alçada G11** (`server/src/modules/purchases/domain/constants.ts`): pedido **nacional acima de R$ 500.000** e **toda importação, em qualquer valor**, exigem o papel `diretor`. A origem é *escalation-only* — declarar `origin='national'` para fornecedor estrangeiro não escapa da diretoria, porque `suppliers.is_foreign` prevalece. **Desde 2026-08-12** a coerência é conferida já na **criação**: fornecedor estrangeiro força `origin='import'` gravado, e declarar `import` para fornecedor nacional é recusado com 422 `G11-ORIGIN-SUPPLIER-MISMATCH`. Vale também a segregação D-K (ver RF-COM-02) |
| RF-COM-06 | Recebimento parcial/total de pedido, entrada física no estoque | `[IMPLEMENTADO]` | UC-16, `POST /api/purchases/:id/receive` |
| RF-COM-07 | Lote recebido nasce em quarentena (`quarantine`), bloqueado para consumo até liberação de qualidade | `[IMPLEMENTADO]` | UC-17B, `server/src/models/LotControl.ts` |
| RF-COM-08 | Geração automática de conta a pagar **após** recebimento (nunca na aprovação) | `[IMPLEMENTADO]` | decisão arquitetural, CLAUDE.md §7 |
| RF-COM-09 | Catálogo item×fornecedor (N:N), com preço/prazo e fornecedor preferencial | `[IMPLEMENTADO]` | UC-22 |
| RF-COM-10 | Avaliação de fornecedor (`rating` manual) + `quality_score` automático via NCs vinculadas | `[IMPLEMENTADO]` | tela `/purchases/suppliers` |
| RF-COM-11 | Cockpit de compras (visão consolidada de pedidos/requisições em aberto) | `[IMPLEMENTADO]` | UC-28, `GET /api/purchases/cockpit` |
| RF-COM-12 | Importação (COMEX): registro de processo, cálculo de tributos de importação, nacionalização de custo | `[IMPLEMENTADO]` (backend 2026-08-06; **tela web entregue em 2026-08-10**) | UC-19, `server/src/modules/comex/`, `/api/comex/import-processes`, **tela `/purchases/comex`** (`client/src/pages/purchases/ComexPage.tsx`, commit `612e116`), `docs/arquitetura/API.md` §32. Gate da diretoria na saída de `draft` (G11-COMEX/D-G, `import_process_approvals`, commit `4b60a81`). Limitações conhecidas: fórmula fiscal simplificada e alíquotas manuais (sem integração Siscomex/NCM), **sem AP automática de tributos** (escopo do G13, depende de decisão sobre moeda estrangeira — ver `docs/governance/HANDOFF_CODEX.md`) |

---

## 4. Estoque / Almoxarifado / Logística (RF-EST)

| RF | Descrição | Status | Referência |
|---|---|---|---|
| RF-EST-01 | Entrada/saída/ajuste de estoque com motivo obrigatório, histórico completo | `[IMPLEMENTADO]` | UC-08, UC-14, `/api/inventory/movements` |
| RF-EST-02 | Alerta de estoque mínimo/baixo | `[IMPLEMENTADO]` | `GET /api/inventory/low-stock` |
| RF-EST-03 | Múltiplos depósitos/armazéns com transferência (workflow de aprovação) | `[IMPLEMENTADO]` | UC-42, `/api/inventory/warehouses`, `/transfers` |
| RF-EST-04 | Rastreabilidade por lote/série, QR Code para etiqueta física | `[IMPLEMENTADO]` | `/api/inventory/lots`, `/lots/:id/qrcode`, tela `/traceability` |
| RF-EST-05 | Liberação/bloqueio de lote (ação exclusiva da Qualidade sobre dado criado pelo Recebimento) | `[IMPLEMENTADO]` | UC-17B, UC-37, `POST /api/inventory/lots/:id/release` \| `/block` |
| RF-EST-06 | Inventário cíclico por pool (qualquer operador assume) ou atribuído a pessoa específica | `[IMPLEMENTADO]` | `/api/inventory-counts`, tela `/products/inventory-counts` |
| RF-EST-07 | Execução de contagem cíclica e scan de estoque via app mobile (QR Code) | `[IMPLEMENTADO]` (validado só por typecheck/bundle, sem hardware real) | `mobile/`, `/api/mobile-inventory` |
| RF-EST-08 | Curva ABC e valuação financeira de estoque | `[PENDENTE]` | **Estava marcado `[IMPLEMENTADO]` indevidamente; a auditoria de 2026-08-11 não encontrou implementação.** O Auditor Inteligente (`SequelizeIntelligentAuditorRepository.auditStock`) só devolve estoque negativo, itens sem movimentação e 3 contadores — não há classificação ABC nem valuação (custo médio/PEPS/preço de reposição) em nenhuma rota. Rastreado em `docs/governance/RESIDUAIS_ABERTOS_2026-08-10.md` |

---

## 5. Produção / PCP (RF-PRD)

| RF | Descrição | Status | Referência |
|---|---|---|---|
| RF-PRD-01 | Cadastro de OP com verificação de disponibilidade de material contra estoque real (não congelado) | `[IMPLEMENTADO]` | UC-12, CLAUDE.md §7, `/api/production-orders` |
| RF-PRD-02 | Apontamento de produção (quantidade boa/refugada) reconciliado com a OP na conclusão | `[IMPLEMENTADO]` | UC-13, remediação 1.3 `AUDITORIA_PRE_PRODUCAO_2026-08-02.md` |
| RF-PRD-03 | BOM multi-nível (componentes, perdas %, validação de ciclos) | `[IMPLEMENTADO]` | UC-20, `/api/engineering/bom`, tela `/production/bom` |
| RF-PRD-04 | MRP contra estoque real; conversão manual ou automática (opt-in por item) de ordens planejadas em requisição | `[IMPLEMENTADO]` | UC-24, UC-24b, `/api/mrp`, tela `/production/mrp` |
| RF-PRD-05 | Registro de paradas de máquina por motivo categorizado, com bloqueio de 2ª parada aberta simultânea por centro | `[IMPLEMENTADO]` | `/api/production/downtimes`, CLAUDE.md §4 (2026-08-06) |
| RF-PRD-06 | Cálculo de OEE (Disponibilidade × Performance × Qualidade) por centro de trabalho, descontando downtime real | `[IMPLEMENTADO]` | `GET /api/reports/oee` |
| RF-PRD-07 | Centros de trabalho: capacidade, turnos, custo/hora | `[IMPLEMENTADO]` | `/api/work-centers`, tela `/production/work-centers` |
| RF-PRD-08 | Custeio real de mão-de-obra e overhead na OP | `[IMPLEMENTADO]` (a partir de 2026-08-04; sem backfill retroativo — risco residual registrado) | UC-21, `costingService.ts`, `ProductionCostSettings`, `ProductCostLedger` |
| RF-PRD-09 | Relatório de variação de custo (padrão vs. realizado) | `[IMPLEMENTADO]` | UC-26, `GET /api/reports/cost-variance` |
| RF-PRD-10 | Capacidade finita por centro de trabalho (sequenciamento respeitando limite de capacidade) | `[PENDENTE]` | CLAUDE.md §5, Fase 3 (P2) |

---

## 6. Qualidade / Laboratório / Engenharia (RF-QUA)

| RF | Descrição | Status | Referência |
|---|---|---|---|
| RF-QUA-01 | Registro de não-conformidade (NC): origem, severidade, tipo de defeito, ação imediata | `[IMPLEMENTADO]` | UC-17, `/api/quality/non-conformities`, tela `/quality` (aba NCs) |
| RF-QUA-02 | Análise de causa raiz + ação corretiva + verificação de eficácia, ciclo de status (`open → analysis → corrective_action → effectiveness_check → closed`) | `[IMPLEMENTADO]` | modelo `NonConformity`, UC-17 |
| RF-QUA-03 | Inspeção de recebimento: liberar (`available`) ou bloquear (`blocked`) lote em quarentena, com opção de abrir NC no mesmo ato do bloqueio | `[IMPLEMENTADO]` | UC-17B, tela `/quality` (aba Inspeção — `InspectionTab.tsx`) |
| RF-QUA-04 | Registro de teste de laboratório (parâmetros acústicos/Thiele-Small), com opção de teste destrutivo (debita depósito de laboratório) | `[IMPLEMENTADO]` | UC-LAB-01, `/api/laboratory`, tela `/laboratory` |
| RF-QUA-05 | Consulta de histórico de testes de laboratório por item/lote | `[IMPLEMENTADO]` | UC-LAB-02, tela `/laboratory` (aba histórico) |
| RF-QUA-06 | Requisições da área de Qualidade (insumos/amostras para inspeção) | `[IMPLEMENTADO]` | tela `/quality/requisitions` (`QualityRequisitionsPage.tsx`) |
| RF-QUA-07 | Projeto de engenharia (P&D): cadastro, acompanhamento | `[IMPLEMENTADO]` | UC-ENG-01, tela `/engineering` (aba Projetos) |
| RF-QUA-08 | Desenho técnico (CAD) vinculado a item/projeto | `[IMPLEMENTADO]` | UC-ENG-02, tela `/engineering` (aba Desenhos) |
| RF-QUA-09 | Ficha técnica Thiele-Small do item (13 parâmetros JSONB) | `[IMPLEMENTADO]` | UC-ENG-03, `ItemEspecificacaoTecnica` |
| RF-QUA-10 | Requisição de amostra da Engenharia (insumos para protótipo) | `[IMPLEMENTADO]` (backend) | UC-39, tela `/engineering` (aba Amostras) |
| RF-QUA-11 | Certificações de produto/processo | `[PENDENTE]` | citado em `docs/projeto/01-PLANO.md` Módulo 13 histórico, sem modelo/rota dedicada hoje |

---

## 7. Financeiro / Contabilidade (RF-FIN)

| RF | Descrição | Status | Referência |
|---|---|---|---|
| RF-FIN-01 | Contas a receber originadas de vendas, baixa manual | `[IMPLEMENTADO]` | UC-06, `/api/finance/receivable`. **G13 (commit `2648686`, 2026-08-10): o AR nasce na emissão da NF-e** (fato gerador da receita — CPC 00 R2 4.56/4.58 e CPC 47), **não na confirmação do pedido**; e **nenhuma parcela nasce paga**. Simetricamente, o AP nasce no **recebimento** da compra (RF-COM-08/RF-FIN-02). Provado contra PostgreSQL real em `server/tests/integration/g13-payable-receivable.test.ts` |
| RF-FIN-02 | Contas a pagar manuais + automáticas (pós-recebimento de compra) | `[IMPLEMENTADO]` | UC-05, `/api/finance/payable` |
| RF-FIN-03 | Centros de custo: CRUD, relatório agrupado, atribuição opcional em AP/AR | `[IMPLEMENTADO]` | `/api/finance/cost-centers`, CLAUDE.md §4 (2026-08-06) |
| RF-FIN-04 | Projeção de fluxo de caixa 30/60/90 dias (semanal) | `[IMPLEMENTADO]` | UC-29, `GET /api/finance/cash-flow-projection` |
| RF-FIN-05 | Projeção diária de fluxo de caixa com saldo acumulado dia a dia | `[IMPLEMENTADO]` | `GET /api/finance/cashflow/projection` (2026-08-06) |
| RF-FIN-06 | Conciliação bancária: importação de extrato OFX (dedup por FITID), sugestão automática de match, baixa em lote | `[IMPLEMENTADO]` | `/api/finance/reconciliation/*`, CLAUDE.md §4 (2026-08-06) |
| RF-FIN-07 | Conciliação bancária via CNAB (boleto/remessa/retorno) | `[PENDENTE]` | `docs/governance/TODO.md`; só OFX foi implementado |
| RF-FIN-08 | Configuração fiscal da empresa (dados para NF-e) | `[IMPLEMENTADO]` | `/api/fiscal`, tela `/settings/fiscal` |
| RF-FIN-09 | Mapeamento departamento→centro de custo na geração automática de AP | `[PENDENTE]` | CLAUDE.md §5, item residual da Fase 2 |

---

## 8. Patrimônio / Manutenção (RF-PAT)

| RF | Descrição | Status | Referência |
|---|---|---|---|
| RF-PAT-01 | Cadastro de ativo (tag única, tipo, depreciação, responsável/depto) | `[IMPLEMENTADO]` | `/api/assets`, tela `/patrimonio` |
| RF-PAT-02 | QR Code do ativo para inventário mobile | `[IMPLEMENTADO]` | modelo `Asset`, serviço de QR |
| RF-PAT-03 | Ordem de manutenção (preventiva/corretiva/preditiva/emergencial/overhaul), fluxo `open → scheduled → in_progress → waiting_parts → completed/canceled` | `[IMPLEMENTADO]` | UC-18, `/api/maintenance`, tela `/maintenance` (aba Ordens) |
| RF-PAT-04 | Custo de peças + mão de obra + horas de parada por ordem de manutenção | `[IMPLEMENTADO]` | modelo `MaintenanceOrder` (`parts_cost`, `labor_cost`, `downtime_hours`) |
| RF-PAT-05 | Atualização automática do status do ativo (`active`↔`in_maintenance`) ao abrir/fechar ordem de manutenção | `[IMPLEMENTADO]` (2026-08-06) | `UpdateMaintenanceOrderUseCase` (transição para `in_progress` → `Asset.status='in_maintenance'`) e `CancelMaintenanceOrderUseCase`/conclusão `completed` (→ `Asset.status='active'`, só se não houver outra OM aberta para o ativo e o ativo ainda estiver `in_maintenance`); ver `docs/patrimonio/03-MANUTENCAO.md` §6 |
| RF-PAT-06 | Ordens de serviço externas (assistência técnica, garantia) | `[IMPLEMENTADO]` | `/api/service-orders`, tela `/service-orders` |
| RF-PAT-07 | Requisições da área de Manutenção (peças/insumos) | `[IMPLEMENTADO]` | tela `/maintenance/requisitions` |

---

## 9. RH (RF-RH)

| RF | Descrição | Status | Referência |
|---|---|---|---|
| RF-RH-01 | Cadastro de funcionário (CTPS, PIS, dados bancários) | `[IMPLEMENTADO]` | UC-11, `/api/employees`, tela `/hr` |
| RF-RH-02 | Departamentos com hierarquia e gestor | `[IMPLEMENTADO]` | `/api/departments` |
| RF-RH-03 | Controle de turnos e regime de trabalho | `[IMPLEMENTADO]` | modelo `Employee` |
| RF-RH-04 | Folha de pagamento (Payroll) | `[PENDENTE]` | `docs/projeto/01-PLANO.md` histórico — sem modelo/rota |
| RF-RH-05 | Benefícios (Benefit) | `[PENDENTE]` | idem |

---

## 10. Relatórios / Dashboard / Rastreabilidade (RF-REL)

| RF | Descrição | Status | Referência |
|---|---|---|---|
| RF-REL-01 | Dashboard com KPIs (vendas hoje/mês/ano) | `[IMPLEMENTADO]` | UC-07, `/api/dashboard`, tela `/` |
| RF-REL-02 | Semáforo de handoff entre departamentos (recebimento, requisições, expedição, qualidade) | `[IMPLEMENTADO]` | UC-40, `GetDashboardHandoffsUseCase` |
| RF-REL-03 | Relatórios de vendas, estoque, clientes, fluxo de caixa, produção, compras | `[IMPLEMENTADO]` | `docs/arquitetura/API.md` §7 |
| RF-REL-04 | Auditor Inteligente de estoque: **itens com saldo negativo**, **itens com saldo positivo e nenhuma movimentação**, e **3 contadores de resumo** (`total_negative`, `total_no_movement`, `products_audited`) | `[IMPLEMENTADO]` | `/api/auditor`, tela `/reports/auditor`, `SequelizeIntelligentAuditorRepository.auditStock`. O auditor cobre ainda vendas (`auditSales`), compras paradas há 30+ dias (`auditPurchases`) e financeiro vencido (`auditFinancial`) |
| RF-REL-04b | Auditor: estoque **zerado**, **baixo**, **excessivo**, **sugestão de reposição** e **curva ABC** | `[PENDENTE]` | Estava descrito como parte do RF-REL-04 e marcado `[IMPLEMENTADO]`; a auditoria de 2026-08-11 leu o código e **nada disso existe**. "Estoque baixo" tem rota própria e separada (`GET /api/inventory/low-stock`, RF-EST-02) — não vem do auditor. Curva ABC/valuação: ver RF-EST-08 |
| RF-REL-05 | Consulta de rastreabilidade por lote/série de produto | `[IMPLEMENTADO]` | `/api/traceability`, tela `/traceability` |
| RF-REL-06 | Painel de demandas por departamento em Android TV (auto-refresh 60s) | `[IMPLEMENTADO]` (validado só por typecheck/bundle, sem hardware real) | `tv/`, `/api/dashboard` |
| RF-REL-07 | Log de auditoria de ações sensíveis, consulta por tela dedicada | `[IMPLEMENTADO]` | `/api/audit-logs`, tela `/audit-logs` |

---

## 11. Integração (RF-INT)

| RF | Descrição | Status | Referência |
|---|---|---|---|
| RF-INT-01 | Webhooks de saída (integração backend-to-backend, sem UI) | `[IMPLEMENTADO]` (mecanismo) | `/api/webhooks`, `docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md` §6 |
| RF-INT-02 | Alertas via Slack/Discord/Teams (webhook de saída configurável) | `[IMPLEMENTADO]` (mecanismo) / não verificado em uso real em produção | idem |

---

## 12. Requisitos Não Funcionais

Este documento **não duplica** os RNFs. A relação completa (desempenho,
segurança, disponibilidade, escalabilidade, compatibilidade,
observabilidade), com status implementado/pendente item a item, está em:

**[`docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md`](REQUISITOS_NAO_FUNCIONAIS.md)**

Destaques que afetam requisitos funcionais acima (não repetidos em detalhe):
anti-spoofing de identidade (RF-AUT/RF-COM), RBAC 100% das rotas (todos os
módulos), transações Sequelize em operações críticas (RF-VEN-02, RF-COM-06,
RF-PRD-02, RF-FIN-06).

---

## Divergências UC × Código identificadas nesta consolidação

| UC | Divergência | Ação recomendada |
|---|---|---|
| UC-19 (Importação/COMEX) | **[RESOLVIDO — backend 2026-08-06, tela 2026-08-10]** Estava descrito em `docs/projeto/04-USE_CASES.md` sem nenhuma rota/modelo/tela correspondente. Decisão de negócio: implementar (não descontinuar) — backend completo (`server/src/modules/comex/`) e **tela `/purchases/comex`** (commit `612e116`) entregues | Nenhuma — `[IMPLEMENTADO]` (RF-COM-12 acima). Resta a AP automática dos tributos de importação (escopo G13, decisão de moeda estrangeira pendente) |
| Módulo 13 "Qualidade — Certificações" (`docs/projeto/01-PLANO.md` histórico) | Certificações de produto/processo nunca ganharam modelo/rota dedicada | Mesma decisão pendente: formalizar como UC futuro ou remover da lista de escopo |
| RF-PAT-05 | **[RESOLVIDO 2026-08-06]** `Asset.status` tem valor `in_maintenance`; decisão de negócio tomada: sincronização automática (não manual), implementada em `UpdateMaintenanceOrderUseCase`/`CancelMaintenanceOrderUseCase` | Nenhuma — `[IMPLEMENTADO]` (RF-PAT-05 acima e `docs/patrimonio/03-MANUTENCAO.md` §6) |

---

## Referências

- `docs/projeto/04-USE_CASES.md` — **UC-01 a UC-73** (fluxo de negócio) — SSOT dos casos de uso.
- `docs/business/01-USE_CASES.md` — UC-30 a UC-43 (RBAC/perfis de acesso), **consolidado** em `04-USE_CASES.md`; mantido apenas como histórico, não editar.
- `docs/governance/RESIDUAIS_ABERTOS_2026-08-10.md` — fonte **medida** das pendências abertas (prevalece sobre `TODO.md`, que é diário histórico).
- `docs/business/BUSINESS_RULES.md` — regras de negócio transversais.
- `docs/arquitetura/API.md` — contrato de cada endpoint (payload, resposta, erros).
- `docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md` — RNFs completos.
- `docs/arquitetura/DIAGRAMA_CASOS_DE_USO_BPMN.md` — visão visual dos
  processos Order-to-Cash, Purchase-to-Pay, Qualidade e Manutenção.
- `server/app.ts`, `client/src/App.tsx` — fonte primária de verdade de rotas
  reais (usada para extrair este documento).
- `CLAUDE.md` — SSOT geral do projeto.

---

## Revisão de 2026-08-12 (auditoria documental)

A auditoria de 2026-08-11 leu o código por trás de cada RF marcado
`[IMPLEMENTADO]` e encontrou **7 alegações falsas neste arquivo**. Todas foram
corrigidas nesta revisão, sem apagar o requisito (a demanda de negócio
continua válida — o que mudou foi o *status*):

| RF | Era | Passou a ser | Motivo medido |
|---|---|---|---|
| RF-AUT-09 | `[IMPLEMENTADO]` | `[PARCIAL]` | 35/98 controllers sem `logAction`; 14 módulos em débito congelado |
| RF-EST-08 | `[IMPLEMENTADO]` | `[PENDENTE]` | Curva ABC e valuação não existem em nenhuma rota |
| RF-REL-04 | descrição inflada | descrição do que existe + novo `RF-REL-04b` `[PENDENTE]` | Auditor só faz negativo/sem movimentação/3 contadores |
| RF-COM-12 | "sem tela web ainda" | tela existe | `/purchases/comex`, commit `612e116` |
| RF-COM-02 / RF-COM-05 | sem D-K nem alçada G11 | regras citadas | `admin` não é exceção; alçada por origem |
| RF-VEN-02 / RF-FIN-01 | baixa/AR na confirmação | baixa e AR na **NF-e** | G9 (`ed47e10`) e G13 (`2648686`) |
| Cabeçalho | "UC-01 a UC-41" | "UC-01 a UC-73" | contagem real do arquivo de casos de uso |

**Lição de governança:** marcar `[IMPLEMENTADO]` por existir uma rota com nome
parecido é o mesmo defeito de verificação descrito em
`docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`. O
aceite honesto é ler o corpo do use case, não o nome do endpoint.
