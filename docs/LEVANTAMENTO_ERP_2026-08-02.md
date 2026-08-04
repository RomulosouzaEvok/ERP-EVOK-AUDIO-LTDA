# 📊 Levantamento do ERP EVOK ÁUDIO — 2026-08-02

**Contexto:** ERP direcionado a **produção de auto-falantes em larga escala** (~100-150 colaboradores, 21 departamentos).
**Momento:** pós-remediação dos bloqueadores da auditoria (commit `d1d3aff`) — banco com 133 FKs, 24 migrations, suítes backend (190 testes) e frontend (13 testes) verdes.
**Fontes:** varredura completa dos 30 módulos do backend, das 17 rotas do frontend e de toda a documentação.

---

## 1. O que temos PRONTO

### Backend — módulos COMPLETOS (CRUD + regras + testes)
| Área | Módulos |
|---|---|
| Base | auth (JWT + invalidação de sessão), users (RBAC), categories, clients, employees, departments |
| Materiais | products (custo médio + concorrência testada), inventory (movimentos, contagem cíclica, lotes), mobileInventory (scan/batch) |
| Engenharia | **bom** (versionamento, aprovação, explosão multinível, custo, ciclo detectado) |
| Produção | **traceability** (rastreio bidirecional item/lote/OP — um dos pontos mais fortes) |
| Suporte | assets (foto + QR), serviceOrders, auditLogs, intelligentAuditor |

### Backend — módulos PARCIAIS (funcionam, com lacunas)
| Módulo | O que funciona | O que falta |
|---|---|---|
| production | OP com ciclo de vida completo, reserva de material no release, apontamento por etapa, consumo FEFO por lote, série, custo médio real (material + **mão-de-obra + overhead, novo em 2026-08-04**), **reconciliação apontamento×OP**, **rastreabilidade por código de lote/QR na conclusão (novo em 2026-08-04)** | Capacidade finita, centro de trabalho real (hoje é texto livre), sequenciamento, OEE completo (disponibilidade/qualidade) |
| mrp | Plano por demanda contra estoque real, explosão BOM com perda %. UI já tem conversão manual de ordem planejada→requisição (`POST /api/mrp/planned-orders/convert`, endpoint em desenvolvimento no backend) | **Não fecha o ciclo automaticamente**: conversão ainda é manual (seleção na tela), sem trigger automático plano→requisição/OP; sem MPS/pegging/capacidade |
| purchaseRequisitions | Criar, listar, aprovar (novo, remediação P0) | Rejeitar/cancelar, editar itens, **conversão requisição→pedido de compra** |
| purchases | Pedido, recebimento parcial com NF e lote, dedup | Cotação/RFQ multi-fornecedor, devolução, histórico de preços exposto |
| suppliers | CRUD + trava de desativação | Homologação, qualificação por item, catálogo de preços, rating calculado |
| sales | Orçamento→confirmação, NF-e | Alteração de pedido, faturamento parcial, tabela de preços por cliente |
| financial | AP/AR com baixa parcial | Conciliação bancária, fluxo projetado, centros de custo, CNAB |
| fiscal | NF-e de venda (emissão/cancelamento), impostos testados | NF-e de entrada por XML/chave, SPED, livros |
| maintenance / nonConformities | CRUD | Preventiva por calendário, 8D, **RNC não bloqueia lote nem realimenta rating do fornecedor** |
| reports / dashboard | sales, inventory, customers, cash-flow | **Zero relatórios de produção, compras e fornecedores**; sem OEE/refugo/WIP |

### Frontend (client/, React 19 + Vite, porta 5173)
- **13 módulos com UI completa:** login/senha, usuários, produtos (cadastro/foto/QR/fornecedores — sem mais movimentação, ver Logística), contagem cíclica, vendas + NF-e, clientes, compras, fornecedores, OP + BOM, patrimônio, financeiro AP/AR, rastreabilidade, audit logs, **qualidade** (`/quality`: inspeção de recebimento de lotes + RNC), **logística** (`/logistics/estoque` e `/logistics/recebimento`), **laboratório** (`/laboratory`: testes acústicos + histórico) e **engenharia** (`/engineering`: projetos P&D + desenhos técnicos + ficha técnica T-S).
- Qualidade alta e consistente: loading skeleton, tratamento de erro, paginação, react-hook-form + zod em 12/14 formulários, RBAC na UI.
- **Logística — Onda 1 (2026-08-03):** `/logistics/estoque` (4 abas: Saldos com tiles de abaixo-do-mínimo/quarentena/bloqueados/valor + tabela de produtos com ação "Movimentar"; Extrato de movimentações; Lotes somente leitura por situação; atalho para Contagens) e `/logistics/recebimento` (fila de pedidos `sent`/`partial`, dialog de conferência com lote/validade opcionais e NF obrigatória, aviso de quarentena pós-recebimento). Separa operação de estoque (Logística) de cadastro de produto (Produtos/Engenharia).
- **Laboratório (`/laboratory`) e Engenharia (`/engineering`) (2026-08-03):** `/laboratory` com abas Registrar teste (`POST /api/laboratory/tests`, 9 tipos de teste acústico/T-S, veredito aprovado/reprovado destacado com link para RNC) e Histórico (`GET /api/laboratory/tests` + tiles de resumo `GET /api/laboratory/tests/summary`); `/engineering` com abas Projetos P&D (`/api/engineering/projects`, badges de fase do PDP e prioridade), Desenhos Técnicos (`/api/engineering/drawings` + liberar/tornar obsoleto restritos a admin) e Ficha Técnica Thiele-Small por item (`/api/engineering/items/:itemId/technical-spec`, 13 parâmetros via `ItemSearchSelect`).
- **Logística — Onda 3, Expedição (2026-08-03):** `/logistics/expedicao` (`src/pages/logistics/ShippingPage.tsx`) — fila de vendas `confirmed`/`invoiced` prontas para embarque, dialog de picking list (`GET /api/sales/:id`), ação "Marcar como embarcada" (`PUT /api/sales/:id/status` com o novo status `shipped`) restrita a vendas faturadas com NF-e autorizada, aviso com link para `/sales` quando falta emitir a NF-e, filtro para consultar embarcadas.
- **Contagem cíclica — atualização (2026-08-04):** `/products/inventory-counts` (`client/src/pages/products/InventoryCountsPage.tsx`) ganhou seletor de depósito obrigatório na criação da contagem (Múltiplos Depósitos, UC-42) e o padrão visual de marca EVOK. Detalhe em `docs/CRONOGRAMA_FRONTEND_2026-07-31.md`, seção "FE1 - Estoque e Produtos".
- **Compras — Cockpit (2026-08-03):** 4 tiles no topo de `/purchases` (`GET /api/purchases/cockpit`): requisições pendentes (→ `/purchases/requisitions`), pedidos em aberto (filtra a tabela local), chegando em 7 dias, atrasados (→ `/logistics/recebimento`).
- **Financeiro — Fluxo de caixa projetado (2026-08-03):** seção em `/financial` (`GET /api/finance/cash-flow-projection`) com seletor de horizonte 30/60/90 dias, tiles de entradas/saídas/saldo/vencendo em 7d/atraso e tabela semanal com saldo acumulado.
- **Identidade visual EVOK ÁUDIO (2026-08-04):** `LoginPage.tsx`, `AppLayout.tsx` (sidebar/header) e `DashboardPage.tsx` restilizados com os tokens de marca (`--brand`/`--brand-vivid`); estendido nas 4 telas de Logística (`/logistics/estoque`, `/logistics/recebimento`, `/logistics/expedicao`, `/logistics/warehouses`) — cabeçalho em faixa de marca com selo de ícone, abas com estado ativo/hover em verde. Estendido também a `/financial`, `/reports` e `/patrimonio/assets` (banner com gradiente de marca + selo de ícone, cards com `border-l-4 border-l-brand/40`, abas de relatório com hover em verde da marca, colunas monetárias/numéricas em tabelas alinhadas à direita com `tabular-nums`). Puramente visual, sem mudança de lógica/API.
- **Relatórios (`/reports`) com 3 abas:** Produção (WIP/aderência/refugo/lead time), Compras (por fornecedor) e **Custos** (variância custo real×padrão e preço pago×catálogo, `GET /api/reports/cost-variance`).
- **Centros de Trabalho (`/production/work-centers`):** CRUD de centro + turnos por dia da semana + carga-máquina por horizonte configurável com barra de utilização.
- **9 módulos do backend SEM NENHUMA TELA:** items (item mestre!), **MRP**, **requisição de compra** (ambos já entregues — ver seção 3), manutenção, ordens de serviço, RH (funcionários/departamentos), fiscal (monitor NF-e), mobileInventory, intelligentAuditor, categorias (gestão).

---

## 2. 🔴 LACUNA ESTRUTURAL Nº 1: item × fornecedor

**Achado que motivou este levantamento (confirmado):** o produto não tem informação de quem o vendeu, e um insumo pode ter vários fornecedores — o sistema não modela isso.

O que existe hoje:
- `items.fornecedor_padrao_id` — **um único** fornecedor padrão por item (e só no schema novo; a tabela `products`, usada pelas telas, não tem fornecedor nenhum).
- `purchase_orders.supplier_id` — fornecedor no **cabeçalho** do pedido (não por item).
- `lot_controls.supplier_id` — gravado no recebimento (único registro item×fornecedor×data que existe).
- `purchase_requisition_items.suggested_supplier_id` — sugestão manual, não validada e não propagada.

O que NÃO existe (e uma fábrica em escala precisa):
- ❌ Tabela N:N `item_fornecedores` (preço acordado, lead time por par, MOQ, part number do fornecedor, prioridade preferencial/alternativo)
- ❌ Endpoint "quais fornecedores já me venderam o item X, a que preço e prazo" (o dado é derivável por SQL do histórico de compras, mas nada expõe)
- ❌ Cotação/RFQ e mapa comparativo
- ❌ Rating de fornecedor calculado (OTD, RNCs) — hoje é um inteiro digitado à mão
- ❌ Lead time real por item (recebimento parcial não vincula item à data da NF)

**Proposta de implementação (P1, ~2-3 dias):**
1. Migration: tabela `item_suppliers` (item_id, supplier_id, preço_acordado, moeda, lead_time_dias, moq, codigo_no_fornecedor, preferencial bool, ativo, vigência) + backfill a partir do histórico `purchase_order_items → purchase_orders`.
2. Endpoints: `GET/POST /api/items/:id/suppliers`, `GET /api/suppliers/:id/items`, e `GET /api/items/:id/purchase-history` (histórico real de preço/prazo).
3. UI: aba "Fornecedores" no cadastro de produto/item + coluna "último fornecedor / último preço".
4. Integração: MRP sugere fornecedor preferencial na requisição; requisição→pedido carrega o vínculo.

---

## 3. Top 10 prioridades para produção em larga escala

| # | Lacuna | Impacto em escala | Esforço |
|---|---|---|---|
| 1 | ~~**Catálogo item×fornecedor N:N**~~ | ✅ **RESOLVIDO em 2026-08-03 (commit 490d512)**: tabela `item_suppliers` + endpoints + dialog Fornecedores no produto + histórico de compras + workflow de aprovação da requisição | feito |
| 2 | ~~**Telas de MRP e Requisição de Compra**~~ | ✅ **RESOLVIDO em 2026-08-03 (commit 490d512)**: /purchases/requisitions e /production/mrp no ar | feito |
| 3 | ~~**Fechar o ciclo MRP** — plano → requisição/OP (conversão manual e automática opt-in)~~ | ✅ **RESOLVIDO em 2026-08-04 (conversão manual)** — endpoint `POST /api/mrp/planned-orders/convert` implementado (`server/src/modules/mrp/application/use-cases/ConvertPlannedOrdersToRequisitionUseCase.ts`, rota com `authorizeModule('mrp','operate')`), fechando o ciclo com a UI de `/production/mrp` já existente (seleção múltipla RASCUNHO/APROVADA → 1 requisição, fornecedor preferencial sugerido, ordens marcadas `EM_EXECUCAO`). Testado em `server/tests/unit/mrp-convert-to-requisition.test.ts` (4 casos). ✅ **RESOLVIDO em 2026-08-04 (trigger automático, mesma rodada de 5 frentes paralelas)** — implementado como **opt-in por item**, nunca 100% automático por decisão de design (risco de compra sem revisão humana): novo campo `items.conversao_automatica` (migration `server/migrations/20260804-000010-add-mrp-auto-convert-to-items.cjs`), documentado como `UC-24b` em `docs/projeto/04-USE_CASES.md`. `GenerateMrpPlanUseCase` fecha automaticamente, na mesma transação do plano, as ordens planejadas de itens com a flag `true`; itens sem a flag continuam exigindo a conversão manual acima. Testado em `server/tests/unit/mrp-auto-convert.test.ts` (4/4). **Pendência residual pequena:** não existe endpoint/UI para ligar a flag por item — só via UPDATE direto no banco; fica como próxima tarefa pequena (toggle na tela de cadastro de item) | feito |
| 4 | ~~**Conversão requisição → pedido de compra**~~ | ✅ **RESOLVIDO em 2026-08-03 (commit 33b0243)**: POST /:id/convert agrupa por fornecedor, preço do catálogo, requisition_id no pedido; botão "Gerar Pedido" na tela. Cadeia MRP→requisição→aprovação→pedido 100% conectada | feito |
| 5 | ~~**Centros de trabalho + capacidade + calendário de turnos**~~ | ✅ **UI pronta (2026-08-03)**: `/production/work-centers` — CRUD de centro de trabalho (máquinas, capacidade h/dia, fator de eficiência), dialog de turnos por dia da semana (substituição completa, 422 de sobreposição tratado) e carga-máquina por horizonte (7/14/30 dias, `GET /api/work-centers/load`) com barra de utilização colorida (verde/âmbar/vermelho) | feito |
| 6 | ~~**Tela de apontamento de chão de fábrica**~~ | ✅ **UI pronta (2026-08-03)**: `/production/shop-floor` — lista de OPs liberadas/em produção, painel de etapas por sequência, iniciar (seleção de operador), concluir (quantidade boa/refugo/observações) e adicionar etapa manual. ✅ **RESOLVIDO em 2026-08-04 (rastreabilidade por lote/QR)**: reaproveitou 100% a infraestrutura de QR já existente (`qrCodeService.ts`, `GenerateEntityQrCodeUseCase.ts`, hoje usada em Ativos) e o model `ProductionLotConsumption` já existente. Dois endpoints novos — `GET /api/inventory/lots/by-code/:lot_number` (lookup por código, `GetLotByCodeUseCase.ts`) e `GET /api/inventory/lots/:id/qrcode` (gera QR para etiqueta) — testados em `server/tests/unit/lot-traceability-qrcode.test.ts` (9 casos). Frontend: `client/src/pages/production/CompleteOrderWithLotScanDialog.tsx` (conclusão de OP com leitura/digitação de código de lote consumido, resolvido via lookup, e lote produzido via `finished_lot_number`), integrado em `ShopFloorPage.tsx` (botão "Concluir OP (ler lote)", abre QR da etiqueta pós-conclusão via `QrCodeDialog` reaproveitado de Ativos), e botão de reimpressão de QR em `client/src/pages/logistics/LotsTab.tsx`. **Decisão consciente, não gap:** leitura por câmera (`getUserMedia`) não foi implementada — leitor físico/teclado (padrão em chão de fábrica) já preenche o campo de texto como se fosse digitação | feito |
| 7 | ~~**Custo real vs padrão** (variância de preço/quantidade/refugo)~~ | ✅ **UI pronta (2026-08-03)**: aba "Custos" em `/reports` — `GET /api/reports/cost-variance`, tabelas de custo real×padrão por produto (tile de contagem >5% e variância média ponderada) e preço pago×catálogo por fornecedor. **Schema entregue em 2026-08-04 (rodada de 5 frentes paralelas)** — `work_centers.cost_per_hour` + tabela `production_cost_settings` (migrations `20260804-000007/-000008/-000009`). ✅ **Cálculo real de mão-de-obra/overhead RESOLVIDO em 2026-08-04 (mesma data, segunda rodada)**: `costingService.ts` ganhou `registerAdditionalProductionCost()`; `ChangeProductionOrderStatusUseCase.completeOrder()` agora calcula mão-de-obra (horas apontadas × `work_centers.cost_per_hour`, fallback `production_cost_settings.default_labor_rate_per_hour`) e overhead (`overhead_rate_percent` sobre a base configurada em `overhead_calculation_basis`), lançando em `ProductCostLedger` com `source_type: 'production_labor'`/`'production_overhead'`, na mesma transação da conclusão da OP. Contrato completo documentado em `docs/DATABASE.md`. Testado em `server/tests/unit/production-labor-overhead-cost.test.ts` (6 casos, `costingService` real não mockado). **Bug real corrigido no caminho:** `SequelizeReportsRepository.findCostVarianceByProduct` triplicava `quantity` quando existiam lançamentos-irmãos (material+mão-de-obra+overhead) da mesma OP compartilhando `source_id` — corrigido com uma CTE que colapsa as linhas-irmãs antes de agregar (afeta diretamente o relatório de variância em `/reports`). **Risco residual real:** sem backfill retroativo — OPs concluídas antes desta entrega não ganham custo de mão-de-obra/overhead. OEE completo (disponibilidade + qualidade) ainda não implementado — esta entrega cobre apenas o eixo de custo | feito |
| 8 | ~~**Qualidade fecha o loop**: inspeção de recebimento (quarentena), RNC bloqueia lote, realimentação de rating de fornecedor~~ | ✅ **RESOLVIDO em 2026-08-03**: recebimento de compra cria lotes em `quarantine` (não mais `available`); `GET/POST /api/inventory/lots` (listar por status, liberar, bloquear); RNC bloqueia lote referenciado na mesma transação da criação. FEFO da produção já filtra `status='available'`, ficando automaticamente imune a lotes em quarentena/bloqueados. ✅ **RESOLVIDO em 2026-08-04 (realimentação de rating de fornecedor, rodada de 5 frentes paralelas)**: novo campo `suppliers.quality_score` (migration `server/migrations/20260804-000011-add-supplier-quality-score.cjs`), **calculado, nunca editável via API** (schema Zod `.strict()` de `POST/PUT /api/suppliers` sem o campo). Recalculado de forma síncrona, na mesma transação, em `CreateNonConformityUseCase.recalculateSupplierQualityScore` sempre que uma RNC referencia um lote com fornecedor. Fórmula: `MAX(0, 100 - (rncs_count / receipts_count * 100))`. Documentado por completo em `docs/DATABASE.md` (tabela `suppliers`). Testado em `server/tests/unit/quality-lot-lifecycle.test.ts` (20/20). **Risco residual importante:** sem backfill retroativo — RNCs fechadas antes desta entrega não contam no cálculo inicial (campo nasce no default neutro 100.00 para todo fornecedor) | feito |
| 9 | ~~**Relatórios de manufatura**~~ | ✅ **RESOLVIDO em 2026-08-03 (commit 8cf7938)**: /api/reports/production (WIP, aderência, refugo por etapa, lead time) + /api/reports/purchasing (fornecedor: valor, lead time, pontualidade, RNCs) + aba "Custos" (variância) + página /reports. OEE completo aguarda mão-de-obra/overhead no custeio | feito |
| 10 | **Unificar schema legado/novo** (`products`×`items`, `suppliers`×`fornecedores`) — concluir fase "contract" | Causa-raiz de bugs (2 corrigidos hoje eram disso); risco de divergência de saldo/custo | contínuo |

**Bombas latentes conhecidas** (mesmo padrão do bug corrigido hoje na BOM): colunas UUID referenciando usuário INTEGER em `requisicoes_compra.aprovado_por`, `ordens_producao.criado_por`, `movimentos_estoque.usuario_id`, `auditoria_eventos.usuario_id`.

---

## 4. Estado das camadas (ambiente local de teste)

| Camada | Status |
|---|---|
| PostgreSQL 16 (Docker `evok-postgres`) | ✅ healthy — 57 tabelas, 133 FKs, 24 migrations |
| API (Docker `evok-api`, porta 5000) | ✅ healthy — login, requisições, MRP, OP, itens testados |
| Frontend (Vite, porta 5173) | ✅ no ar — login admin@evokaudio.com.br |
| Testes | ✅ backend 190 passed · frontend 13 passed (na data original; em 2026-08-04, confirmado ao vivo: 446 unit + 65 integration backend, 24 client) |

---

**Documentos atualizados nesta data:** CLAUDE.md, README.md, AUDITORIA_PRE_PRODUCAO_2026-08-02.md, DATABASE.md (PostgreSQL 16), CRONOGRAMA_FRONTEND_2026-07-31.md (marcado como histórico), projeto/00-README.md (links quebrados removidos).

**Atualização 2026-08-04 (custeio real + rastreabilidade por lote/QR):** itens 6 e 7 da tabela da seção 3 fechados (`feito`) — ver linhas correspondentes acima. Detalhamento completo, riscos residuais e comandos de validação em `docs/governance/TODO.md`, `docs/DIARIO_BORDO_GO_LIVE_G6.md` (entrada 2026-08-04) e `docs/HANDOFF_CODEX.md`.
