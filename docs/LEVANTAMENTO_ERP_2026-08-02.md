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
| mrp | Plano por demanda contra estoque real, explosão BOM com perda % | **Não fecha o ciclo**: plano não vira OP nem requisição automaticamente; sem MPS/pegging/capacidade |
| purchaseRequisitions | Criar, listar, aprovar (novo, remediação P0) | Rejeitar/cancelar, editar itens, **conversão requisição→pedido de compra** |
| purchases | Pedido, recebimento parcial com NF e lote, dedup | Cotação/RFQ multi-fornecedor, devolução, histórico de preços exposto |
| suppliers | CRUD + trava de desativação | Homologação, qualificação por item, catálogo de preços, rating calculado |
| sales | Orçamento→confirmação, NF-e | Alteração de pedido, faturamento parcial, tabela de preços por cliente |
| financial | AP/AR com baixa parcial | Conciliação bancária, fluxo projetado, centros de custo, CNAB |
| fiscal | NF-e de venda (emissão/cancelamento), impostos testados | NF-e de entrada por XML/chave, SPED, livros |
| maintenance / nonConformities | CRUD | Preventiva por calendário, 8D, **RNC não bloqueia lote nem realimenta rating do fornecedor** |
| reports / dashboard | sales, inventory, customers, cash-flow | **Zero relatórios de produção, compras e fornecedores**; sem OEE/refugo/WIP |

### Frontend (client/, React 19 + Vite, porta 5173)
- **9 módulos com UI completa:** login/senha, usuários, produtos (foto/QR/movimentação), contagem cíclica, vendas + NF-e, clientes, compras, fornecedores, OP + BOM, patrimônio, financeiro AP/AR, rastreabilidade, audit logs.
- Qualidade alta e consistente: loading skeleton, tratamento de erro, paginação, react-hook-form + zod em 12/14 formulários, RBAC na UI.
- **12 módulos do backend SEM NENHUMA TELA:** items (item mestre!), **MRP**, **requisição de compra**, qualidade/RNC, manutenção, ordens de serviço, RH (funcionários/departamentos), relatórios, fiscal (monitor NF-e), mobileInventory, intelligentAuditor, categorias (gestão).

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
| 3 | **Fechar o ciclo MRP** — plano → requisição/OP automático | Planejamento manual não escala | 3-4d |
| 4 | **Conversão requisição → pedido de compra** | Elo quebrado na cadeia de suprimentos | 1-2d |
| 5 | **Centros de trabalho + capacidade + calendário de turnos** (hoje work_center é texto livre) | Sem carga-máquina não há promessa de prazo confiável | 5d+ |
| 6 | **Tela de apontamento de chão de fábrica** (operação/tempo/refugo por operador) + rastreabilidade por código de lote/QR (hoje só por ID numérico) | Chão de fábrica sem tela de execução | 3-4d |
| 7 | **Custo real vs padrão** (variância de preço/quantidade/refugo) + mão-de-obra no custeio | Sem gestão de margem em volume | 3-4d |
| 8 | **Qualidade fecha o loop**: inspeção de recebimento (quarentena), RNC bloqueia lote, realimenta rating | Recebimento entra direto como `available` | 2-3d |
| 9 | **Relatórios de manufatura** (OEE, refugo por etapa, WIP, aderência ao plano, compras por fornecedor) | Gestão sem indicadores | 3d |
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
