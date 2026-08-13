# SYSTEM_MAP.md — AUD-2026-08-ERP-EVOK-FULL

Base: 48 módulos-pasta confirmados em `server/src/modules/` (ver `SYSTEM_INVENTORY.md`
para o comando/evidência de cada contagem). Endpoints por módulo obtidos por
`Grep -c "router\.(get|post|put|patch|delete)\("` nos arquivos de rota reais de
cada módulo (contagem real desta sessão, não estimada). "Testes" nesta tabela
é presença/ausência confirmada por nome de arquivo em `server/tests/{unit,integration}/`
que contém o nome do módulo — é uma correspondência textual aproximada, não uma
prova de cobertura real; deve ser confirmada pelo agente que auditar cada módulo.

Risco: **Alto** = módulo com impacto financeiro/fiscal/regulatório direto ou já
identificado no `CLAUDE.md` como tendo gaps críticos fechados recentemente (maior
chance de regressão). **Médio** = módulo operacional com regra de negócio relevante
mas sem histórico de gap crítico. **Baixo** = módulo administrativo/cadastral ou
recém-entregue sem integração financeira direta — auditável por amostragem.

| Módulo | Responsabilidade | Dependências (evidência) | Endpoints (grep real) | Testes (arquivo com nome do módulo, unit/integration) | Risco | Motivo do risco |
|---|---|---|---|---|---|---|
| financial | Contas a pagar/receber, fluxo de caixa, CNAB, conciliação OFX | sales (AR na NF-e), purchases (AP no recebimento), cost centers | 15+8+7=30 (finance.ts 15, cnab.ts 8, reconciliation.ts 7) | sim (unit: cost-centers-and-cashflow-projection, reconciliation-*, sale-invoice-accumulator; integration: g13-payable-receivable, bank-reconciliation-ofx-import) | Alto | G13 (AP no recebimento/AR na NF-e) é remediação recente (2026-08-12); dinheiro real |
| sales | Pedidos, faturamento parcial, NF-e, baixa de estoque | items/estoque, fiscal (NF-e), quality (gate de lote) | 13 | sim (integration: sale-nfe-issuance, sale-cancel-concurrency, sale-lot-quality-gate, sale-quote-confirm, sale-invoice-history) | Alto | G9 (baixa move p/ NF-e) e gate de qualidade na saída são remediação recente |
| purchases | Pedido de compra, aprovação por alçada/origem | suppliers, comex (origem import), purchaseRequisitions | 10 | sim (integration: purchase-origin-foreign-supplier, purchase-receive-concurrency, purchase-receipt-duplicate-invoice) | Alto | G11 (alçada por origem) e brecha de gate fechada em 2026-08-12 — área historicamente frágil |
| comex | Importação, tributos, gate de diretoria | purchases, fiscal | 8 | não identificado arquivo de teste com "comex" no nome (verificar cobertura real) | Alto | Gate de aprovação de diretoria é controle anti-fraude; teste de integração real do fluxo completo é citado no CLAUDE.md como pendente |
| mrp | Planejamento de necessidades, plano→requisição | bom, items, purchaseRequisitions, production | 4 | sim (unit: mrp-engine, mrp-persistence; integration: mrp, mrp-multi-demand-netting, mrp-rerun-idempotency, mrp-quarantine-discount) | Alto | 2 defeitos críticos corrigidos em 2026-08-12 (netting entre demandas, idempotência de rerun) — histórico recente de bug real |
| production | Ordens de produção, apontamento, roteiro, downtime | bom, workCenters, mrp, quality (Bloco K) | 11+3+9=23 | sim (integration: production-order-status-concurrency, production-start-gate-g6, production-order-scrap, production-start-manual-tracking-bypass) | Alto | G4/G5/G6 fechados recentemente; obrigação legal SPED Bloco K depende de apontamento obrigatório |
| quality | Inspeção, liberação de lote, quarentena | production, sales (gate de saída), traceability | 3 | sim (integration: quality-releases-receiving-lot, quality-release-after-block) | Alto | G7/D-L — quarentena deixou de ser decorativa; é controle de qualidade regulatório (ISO 9001) |
| bom | Estrutura de produto (fonte única de engenharia) | engineering, items, mrp | 12 | sim (unit: bom-recursive, bom-cost-staleness, bom-tree-cycle; integration: bom-cycle-multilevel, bom-two-level-reparo, bom-tipo-nao-produtivo, bom-component-type-regression) | Alto | G1 unificou duas BOMs paralelas — risco de regressão para dupla escrita |
| accessProfiles | RBAC / perfis de acesso | auth, todos os módulos (autorização) | 6 | sim (unit: access-profiles) | Alto | Base de todo o controle de autorização do sistema — falha aqui é sistêmica |
| auth | Login, JWT, refresh, reset de senha | users | 8 | sim (unit: auth-refresh, change-password-session-invalidation; integration: password-recovery-and-session-revocation, auth-me-permissions) | Alto | Porta de entrada de todo o sistema |
| purchaseRequisitions | Origem da cadeia de suprimentos | mrp, engineering, purchases | 5 | sim (unit: purchase-requisition-status; integration: purchase-requisitions, material-requisition-flow) | Médio | Rastreabilidade fiscal, mas sem gap crítico recente aberto |
| items / products | Núcleo de item (MRP hot path) + extensões comerciais/técnicas | categorias, fornecedores, estoque | 12 (items) + 9 (products) | sim (unit: items-models, items-use-cases, item-suppliers, item-repository-update-conversao-automatica) | Médio | Núcleo estável, mudanças raras; mas é hot path do MRP |
| inventory | Estoque, movimentações, contagens, transferências, múltiplos depósitos | items, warehouse | 18 (inventory) + 9 (inventoryCounts) | sim (unit: warehouse-crud, inventory-movements-dual-read, inventory-count-assignment; integration: stock-concurrency, inventory-count-claim-concurrency, product-movement-concurrency) | Médio | Concorrência é risco conhecido (múltiplos testes de concorrência já existem) |
| traceability | Rastreabilidade por lote/série | production, quality, sales | 3 | sim (integration: traceability, traceability-and-audit-log-regression) | Médio | Suporta rastreabilidade fiscal/qualidade, mas é módulo de leitura/consulta |
| suppliers | Cadastro e avaliação de fornecedores | items, purchases | 6 | não identificado arquivo dedicado (verificar) | Médio | Base de dados usada por gate de origem (G11) — se cadastro errado, gate falha silenciosamente |
| rfq | Cotação multi-fornecedor | purchaseRequisitions, suppliers, purchases | 7 | não identificado arquivo dedicado (verificar) | Médio | Gera pedido de compra automaticamente — superfície de risco financeiro |
| engineering | Projetos, desenhos técnicos, especificação | bom, items | 11 | sim (unit: engineering-module) | Médio | Alimenta BOM (G1) |
| workCenters | Centros de trabalho, capacidade, custo/hora | production | 6 | sim (unit: work-centers) | Médio | G6 depende de centro de trabalho ativo para liberar OP |
| clients | Cadastro de clientes | sales | 5 | não identificado arquivo dedicado (verificar) | Baixo | Cadastro simples |
| categories / departments | Cadastros organizacionais | vários (referência) | 5 + 5 | sim (unit: categories-use-cases, departments-use-cases) | Baixo | Cadastro, guarda de seed já existe (departments.seeds.test.ts fora desta amostra) |
| dashboard / reports / intelligentAuditor | KPIs, exportação, auditor inteligente embutido | leitura de todos os módulos | 3 + 8 + 4 | sim (unit: dashboard-*, reports-export, intelligentAuditor-use-cases, intelligent-auditor-repository) | Médio | Agrega dados financeiros/operacionais — erro aqui pode mascarar problema real em outro módulo |
| assets / maintenance / serviceOrders | Patrimônio, manutenção, ordens de serviço | vários | 7+5+5 | sim (unit: assets-use-cases, serviceOrders-use-cases; integration: maintenance-order-lifecycle) | Médio | Sincroniza `Asset.status` com ciclo de manutenção (RF-PAT-05) |
| nonConformities | Não-conformidades, devolução a fornecedor | quality, suppliers | 5 | sim (unit: non-conformity-supplier-return) | Médio | Compliance de qualidade |
| laboratory | Testes acústicos (Thiele-Small) | products, quality | 3 | não identificado arquivo dedicado (verificar) | Baixo | Domínio técnico específico, baixo volume |
| masterProduction | Plano Mestre de Produção (MPS) | sales, production | 7 | sim (integration: master-production-plan-cycle) | Médio | G17, entregue recentemente (2026-08-10), sem baldes de tempo (limitação conhecida) |
| directorate | Governança — planejamento estratégico, atas, riscos, aprovação de alçada | purchases, comex | 14 | sim (integration: directorate-governance-cycle; unit RBAC: rbac-directorate-access-denied) | Alto | Ponto único de aprovação de alçada (D-K) — segregação de função crítica |
| accounting / treasury / budget | Contabilidade, tesouraria, orçamento | financial | 11+11+6 | sim (unit: accounting-use-cases, treasury-use-cases, budget-use-cases) | Médio | Módulos novos (2026-08-07), ainda sem tanto histórico de bug fechado quanto financial/sales |
| fiscal | Configuração fiscal, cálculo de tributos, provedores de NF-e | sales, comex | 2 | sim (unit: tax-calculation-service, nfe-access-key-validator) | Alto | Cálculo de tributo e emissão fiscal — erro tem consequência legal direta |
| webhooks | Integração backend-to-backend (n8n) | externo | 2 | sim (unit: webhooks-use-cases; integration: n8n-webhook) | Médio | Superfície de entrada externa — validar autenticação/autorização do endpoint |
| mobileInventory | Inventário via QR (app mobile) | inventory | 3 | sim (unit: mobileInventory-use-cases) | Médio | Sem teste em hardware real (limitação já conhecida e documentada) |
| spreadsheetImport | Importação de catálogo via planilha | items | 5 | sim (integration: catalog-spreadsheet-import) | Médio | Usado na carga inicial de 327 insumos — ponto de entrada de dados em massa |
| sst | Segurança e Saúde do Trabalho (EPI, ASO, CIPA, PGR, eSocial) | employees | 75 | sim (10 arquivos unit: sst-epi, sst-accident, sst-esocial, sst-aso, sst-rbac, sst-cipa, sst-pgr, sst-training, sst-safety-routine, sst-corrective-action) | Médio | Módulo grande (75 endpoints) e regulatório (eSocial), mas entregue com boa cobertura de teste aparente |
| ti | TI — chamados, licenças, backup, acesso | employees, assets | 47 | sim (7 arquivos unit: ti-authorize-self-or-module, ti-ticket/term/license/access-request/backup-use-cases, ti-routes-smoke) | Médio | Boa cobertura aparente de teste |
| juridico | Contratos, LGPD, prazos, atos societários | vários (referencia contratos/ativos) | 75 | sim (unit: juridico-legal-case, juridico-deadline, juridico-proxy-ip, juridico-lgpd-alert) | Alto | LGPD é regulatório (dados pessoais); módulo grande (75 endpoints) |
| facilities | Frota, abastecimento, limpeza, visitantes | assets, financial (multas/manutenção) | 64 | sim (7 arquivos unit: facilities-area/cleaning-schedule/vehicle/fuel-record/trip/driver/fine-use-cases) | Médio | Módulo grande, mas sem gap crítico de negócio identificado no CLAUDE.md |
| marketing | Campanhas, leads, funil | clients (conversão de lead) | 30 | sim (6 arquivos unit: marketing-lead/campaign/material/convert-lead/handoff-lead/funnel-report) | Baixo | Sem integração financeira direta crítica |
| rh | RH — admissão, contrato, afastamento, férias, documentos | employees | 57 | sim (integration: rh-block6-extension, rh-time-import-attendance) | Médio | Dados sensíveis de funcionário (já houve remediação de vazamento LGPD BR-RH-020 em commit histórico — ver git log) |
| employees | Cadastro de funcionários (núcleo, distinto de rh/) | departments | não medido separadamente (incluído em contagem de employees.ts, 5) | sim (unit: employees-use-cases) | Baixo | Cadastro |
| users | Usuários do sistema | accessProfiles | 7 | não identificado arquivo dedicado direto (verificar) | Alto | Gestão de identidade — base de todo RBAC/autenticação |
| auditLogs | Log de auditoria interno do sistema | todos (escrita) | 2 | sim (unit: auditLogs-use-cases, audit-log-failure-alerting) | Alto | É o próprio mecanismo de rastreabilidade que esta auditoria depende para confiar no sistema — falha aqui compromete evidência de todos os outros módulos |

## Módulos citados no `CLAUDE.md`/`SCOPE.md` não confirmados nesta etapa como pasta própria

- **warehouse**: não existe `server/src/modules/warehouse/`; a funcionalidade de múltiplos
  depósitos vive em `inventory` (models `Warehouse`, `WarehouseTransfer`). Não é uma
  lacuna — apenas uma diferença de nomenclatura entre a intuição do pedido original e a
  estrutura real de pastas.

## Cobertura desta etapa (Inventory) vs. limitação de execução

Esta matriz foi construída **inteiramente por leitura estática** (Glob/Grep/Read).
Nenhuma linha desta tabela foi confirmada rodando a suíte de teste de fato, consultando
o PostgreSQL ao vivo, ou executando a aplicação. O `audit-planning-agent` deve tratar
a coluna "Testes" como **presença de arquivo com nome correspondente**, não como
"módulo comprovadamente coberto" — confirmar isso é trabalho da próxima fase (fieldwork),
com um agente que tenha ferramenta de execução de comando disponível.
