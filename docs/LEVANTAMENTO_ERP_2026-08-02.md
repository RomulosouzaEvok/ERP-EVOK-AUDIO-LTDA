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
| production | OP com ciclo de vida completo, reserva de material no release, apontamento por etapa, consumo FEFO por lote, série, custo médio real, **reconciliação apontamento×OP (novo)** | Capacidade finita, centro de trabalho real (hoje é texto livre), custo de mão-de-obra/overhead, sequenciamento |
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
- **Compras — Cockpit (2026-08-03):** 4 tiles no topo de `/purchases` (`GET /api/purchases/cockpit`): requisições pendentes (→ `/purchases/requisitions`), pedidos em aberto (filtra a tabela local), chegando em 7 dias, atrasados (→ `/logistics/recebimento`).
- **Financeiro — Fluxo de caixa projetado (2026-08-03):** seção em `/financial` (`GET /api/finance/cash-flow-projection`) com seletor de horizonte 30/60/90 dias, tiles de entradas/saídas/saldo/vencendo em 7d/atraso e tabela semanal com saldo acumulado.
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
| 3 | **Fechar o ciclo MRP** — plano → requisição/OP automático | 🔧 **UI pronta (2026-08-03)**: conversão manual de ordens planejadas (RASCUNHO/APROVADA) em requisição via seleção múltipla + dialog em `/production/mrp`, aguardando endpoint `POST /api/mrp/planned-orders/convert` no backend. Falta trigger automático (sem intervenção do planejador) | 3-4d |
| 4 | ~~**Conversão requisição → pedido de compra**~~ | ✅ **RESOLVIDO em 2026-08-03 (commit 33b0243)**: POST /:id/convert agrupa por fornecedor, preço do catálogo, requisition_id no pedido; botão "Gerar Pedido" na tela. Cadeia MRP→requisição→aprovação→pedido 100% conectada | feito |
| 5 | ~~**Centros de trabalho + capacidade + calendário de turnos**~~ | ✅ **UI pronta (2026-08-03)**: `/production/work-centers` — CRUD de centro de trabalho (máquinas, capacidade h/dia, fator de eficiência), dialog de turnos por dia da semana (substituição completa, 422 de sobreposição tratado) e carga-máquina por horizonte (7/14/30 dias, `GET /api/work-centers/load`) com barra de utilização colorida (verde/âmbar/vermelho) | feito |
| 6 | ~~**Tela de apontamento de chão de fábrica**~~ | ✅ **UI pronta (2026-08-03)**: `/production/shop-floor` — lista de OPs liberadas/em produção, painel de etapas por sequência, iniciar (seleção de operador), concluir (quantidade boa/refugo/observações) e adicionar etapa manual. Falta: rastreabilidade por código de lote/QR (hoje só por ID numérico) | feito (parcial) |
| 7 | ~~**Custo real vs padrão**~~ (variância de preço/quantidade/refugo) | ✅ **UI pronta (2026-08-03)**: aba "Custos" em `/reports` — `GET /api/reports/cost-variance`, tabelas de custo real×padrão por produto (tile de contagem >5% e variância média ponderada) e preço pago×catálogo por fornecedor. Mão-de-obra/overhead no custeio segue pendente | feito (parcial) |
| 8 | ~~**Qualidade fecha o loop**: inspeção de recebimento (quarentena), RNC bloqueia lote~~ | ✅ **RESOLVIDO em 2026-08-03**: recebimento de compra cria lotes em `quarantine` (não mais `available`); `GET/POST /api/inventory/lots` (listar por status, liberar, bloquear); RNC bloqueia lote referenciado na mesma transação da criação. FEFO da produção já filtra `status='available'`, ficando automaticamente imune a lotes em quarentena/bloqueados. Pendente: realimentação de rating de fornecedor (não coberta nesta entrega) | feito (parcial) |
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
| Testes | ✅ backend 190 passed · frontend 13 passed |

---

**Documentos atualizados nesta data:** CLAUDE.md, README.md, AUDITORIA_PRE_PRODUCAO_2026-08-02.md, DATABASE.md (PostgreSQL 16), CRONOGRAMA_FRONTEND_2026-07-31.md (marcado como histórico), projeto/00-README.md (links quebrados removidos).
