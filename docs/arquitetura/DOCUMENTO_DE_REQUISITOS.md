# Documento de Requisitos — ERP EVOK ÁUDIO

**Status:** 🟢 Novo (2026-08-06). **Este documento NÃO substitui os casos de
uso** (`docs/projeto/04-USE_CASES.md` — UC-01 a UC-41, foco em fluxo de
negócio; `docs/business/01-USE_CASES.md` — UC-30 a UC-43, foco em RBAC/perfis
de acesso configuráveis). Ele é o **índice executivo**: uma lista rastreável
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
| RF-AUT-02 | Renovação de sessão sem novo login (refresh deslizante) | `[IMPLEMENTADO]` | `POST /api/auth/refresh`, `docs/API.md` §1 |
| RF-AUT-03 | Recuperação de senha por email | `[IMPLEMENTADO]` | `client/src/pages/ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx` |
| RF-AUT-04 | CRUD de usuários, ativação/inativação | `[IMPLEMENTADO]` | UC-10, `/api/users` |
| RF-AUT-05 | Perfis de acesso configuráveis por módulo (`operate`/`approve`), atribuição a usuário | `[IMPLEMENTADO]` | UC-30 a UC-33, UC-36, `/api/access-profiles` |
| RF-AUT-06 | Menu do frontend resolvido dinamicamente conforme perfil (módulo oculto = sem acesso) | `[IMPLEMENTADO]` | UC-34, `GET /api/auth/me/permissions` |
| RF-AUT-07 | Bloqueio de tela/API para módulo fora do perfil (403 consistente) | `[IMPLEMENTADO]` | UC-35, UC-35-Exceção |
| RF-AUT-08 | Distinção de ação de gestor (`approve`) vs. operador (`operate`) dentro da mesma área | `[IMPLEMENTADO]` | UC-37 |
| RF-AUT-09 | Registro de auditoria de ações sensíveis (quem/quando/o quê) | `[IMPLEMENTADO]` | modelo `AuditLog`, `/api/audit-logs`, tela `/audit-logs` |

---

## 2. Vendas / Comercial (RF-VEN)

| RF | Descrição | Status | Referência |
|---|---|---|---|
| RF-VEN-01 | Cadastro de clientes (CPF/CNPJ único, dados fiscais) | `[IMPLEMENTADO]` | UC-02, `/api/clients`, tela `/sales/clients` |
| RF-VEN-02 | Registro de venda (itens, descontos, parcelas), bloqueio se estoque insuficiente | `[IMPLEMENTADO]` | UC-04, `POST /api/sales`, tela `/sales` |
| RF-VEN-03 | Transições de status (`quote → confirmed → partially_invoiced → invoiced → shipped`/`canceled`) | `[IMPLEMENTADO]` | UC-04, UC-41, `PUT /api/sales/:id/status` |
| RF-VEN-04 | Alteração de itens de venda `quote`/`confirmed` com reajuste de reserva de estoque | `[IMPLEMENTADO]` | `PUT /api/sales/:id/items`, CLAUDE.md §4 (2026-08-06) |
| RF-VEN-05 | Emissão de NF-e restrita a perfil `approve` do módulo Vendas | `[IMPLEMENTADO]` | UC-41, `POST /api/sales/:id/nfe` |
| RF-VEN-06 | Faturamento parcial de NF-e por pedido (`invoiced_quantity` acumulado por item) | `[IMPLEMENTADO]` | CLAUDE.md §4 (2026-08-06); risco residual: sem histórico multi-NF-e (`docs/API.md` §5) |
| RF-VEN-07 | Tabela de preços negociados por cliente×produto (sugestão editável ao montar pedido) | `[IMPLEMENTADO]` | `customer_price_lists`, `/api/sales/customers/:id/prices` |
| RF-VEN-08 | Expedição de venda faturada (status terminal `shipped`) | `[IMPLEMENTADO]` | UC-27, tela `/logistics/expedicao` |
| RF-VEN-09 | Handoff visual (semáforo) entre Vendas e Expedição/Qualidade | `[IMPLEMENTADO]` | UC-40, `GET /api/dashboard` (handoffs) |

---

## 3. Compras / Suprimentos (RF-COM)

| RF | Descrição | Status | Referência |
|---|---|---|---|
| RF-COM-01 | Requisição de compra como origem obrigatória da cadeia de suprimentos | `[IMPLEMENTADO]` | UC-23, `/api/purchase-requisitions`, tela `/purchases/requisitions` |
| RF-COM-02 | Workflow de aprovação de requisição restrito a `admin`/perfil `approve`, com `approved_by` vindo do JWT (anti-spoofing) | `[IMPLEMENTADO]` | UC-23, remediação 3.1 `AUDITORIA_PRE_PRODUCAO_2026-08-02.md` |
| RF-COM-03 | Conversão de requisição aprovada em pedido(s) de compra (1 por fornecedor resolvido) | `[IMPLEMENTADO]` | UC-25, `POST /api/purchase-requisitions/:id/convert` (ver `docs/API.md`) |
| RF-COM-04 | Cotação/RFQ multi-fornecedor: convite, registro de cotações, mapa comparativo, adjudicação por item (com split) | `[IMPLEMENTADO]` | `/api/rfqs`, tela `/purchases/rfqs`, `docs/API.md` §11.1 |
| RF-COM-05 | Pedido de compra: fluxo `pending → approved → sent → partial → received` | `[IMPLEMENTADO]` | UC-15, `/api/purchases` |
| RF-COM-06 | Recebimento parcial/total de pedido, entrada física no estoque | `[IMPLEMENTADO]` | UC-16, `POST /api/purchases/:id/receive` |
| RF-COM-07 | Lote recebido nasce em quarentena (`quarantine`), bloqueado para consumo até liberação de qualidade | `[IMPLEMENTADO]` | UC-17B, `server/src/models/LotControl.ts` |
| RF-COM-08 | Geração automática de conta a pagar **após** recebimento (nunca na aprovação) | `[IMPLEMENTADO]` | decisão arquitetural, CLAUDE.md §7 |
| RF-COM-09 | Catálogo item×fornecedor (N:N), com preço/prazo e fornecedor preferencial | `[IMPLEMENTADO]` | UC-22 |
| RF-COM-10 | Avaliação de fornecedor (`rating` manual) + `quality_score` automático via NCs vinculadas | `[IMPLEMENTADO]` | tela `/purchases/suppliers` |
| RF-COM-11 | Cockpit de compras (visão consolidada de pedidos/requisições em aberto) | `[IMPLEMENTADO]` | UC-28, `GET /api/purchases/cockpit` |
| RF-COM-12 | Importação (COMEX): registro de processo, cálculo de tributos de importação, nacionalização de custo | `[PENDENTE]` | UC-19 descreve o fluxo, **sem rota/módulo correspondente no backend** — divergência UC×código a decidir (implementar ou descontinuar UC-19) |

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
| RF-EST-08 | Curva ABC e valuação financeira de estoque | `[IMPLEMENTADO]` | Auditor Inteligente, `/api/auditor` |

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
| RF-FIN-01 | Contas a receber originadas de vendas, baixa manual | `[IMPLEMENTADO]` | UC-06, `/api/finance/receivable` |
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
| RF-PAT-05 | Atualização automática do status do ativo (`active`↔`in_maintenance`) ao abrir/fechar ordem de manutenção | `[PENDENTE]` | vínculo hoje é só `asset_id` (associação); `UpdateMaintenanceOrderUseCase` não altera `Asset.status` — atualização é manual |
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
| RF-REL-03 | Relatórios de vendas, estoque, clientes, fluxo de caixa, produção, compras | `[IMPLEMENTADO]` | `docs/API.md` §7 |
| RF-REL-04 | Auditor Inteligente (estoque negativo/zerado/baixo/excessivo, sugestão de reposição, curva ABC) | `[IMPLEMENTADO]` | `/api/auditor`, tela `/reports/auditor` |
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
| UC-19 (Importação/COMEX) | Descrito em `docs/projeto/04-USE_CASES.md`, sem nenhuma rota/modelo/tela correspondente | Decisão de negócio: implementar (Fase futura) ou marcar UC-19 `[DESCONTINUADO]` em `docs/projeto/04-USE_CASES.md` — registrado em `docs/governance/TODO.md` |
| Módulo 13 "Qualidade — Certificações" (`docs/projeto/01-PLANO.md` histórico) | Certificações de produto/processo nunca ganharam modelo/rota dedicada | Mesma decisão: formalizar como UC futuro ou remover da lista de escopo |
| RF-PAT-05 | `Asset.status` tem valor `in_maintenance`, mas nenhum use case do módulo `maintenance` o define automaticamente ao abrir/concluir uma ordem | Avaliar se é gap real (então `[PENDENTE]`, como registrado) ou decisão consciente de atualização manual — levar para `docs/governance/TODO.md` se for gap |

---

## Referências

- `docs/projeto/04-USE_CASES.md` — UC-01 a UC-41 (fluxo de negócio).
- `docs/business/01-USE_CASES.md` — UC-30 a UC-43 (RBAC/perfis de acesso).
- `docs/business/BUSINESS_RULES.md` — regras de negócio transversais.
- `docs/API.md` — contrato de cada endpoint (payload, resposta, erros).
- `docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md` — RNFs completos.
- `docs/arquitetura/DIAGRAMA_CASOS_DE_USO_BPMN.md` — visão visual dos
  processos Order-to-Cash, Purchase-to-Pay, Qualidade e Manutenção.
- `server/app.ts`, `client/src/App.tsx` — fonte primária de verdade de rotas
  reais (usada para extrair este documento).
- `CLAUDE.md` — SSOT geral do projeto.
