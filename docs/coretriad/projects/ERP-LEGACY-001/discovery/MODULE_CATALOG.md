# MODULE_CATALOG.md — ERP-LEGACY-001, Passo 23 (Snapshot técnico)

Legenda de Status de produção: valores exatamente como classificados em
`coretriad/states/ERP-LEGACY-001/PRODUCTION_STATUS_MAP.md` (resolução
`APR-2026-016`). Camadas: presença confirmada por amostragem de `Glob` por
camada (não 100% exaustiva módulo a módulo — ver ressalva no final). Rotas:
contagem real de `router.<método>(` por `Grep -c` (não estimativa).

| Módulo | Responsabilidade (inferida do código/rotas) | Camadas confirmadas | Rotas (endpoints, grep) | Status de produção (`PRODUCTION_STATUS_MAP.md`) |
|---|---|---|---|---|
| `items` | Cadastro central de item/insumo, hot path do MRP | domain/application/infrastructure/presentation | 12 | PRODUÇÃO REAL (APR-2026-016) |
| `categories` | Categorias de item | 4 camadas | 5 | PRODUÇÃO REAL (APR-2026-016) |
| `departments` | Organograma/departamentos | 4 camadas | 5 | PRODUÇÃO REAL (APR-2026-016) |
| `users` | Usuários do sistema | 4 camadas | 7 | PRODUÇÃO REAL parcial — só a conta admin; 20 contas `@teste.evokaudio` são NÃO-PRODUÇÃO |
| `auth` | Login, JWT, refresh, reset de senha | 4 camadas | 8 | PRODUÇÃO REAL (APR-2026-016) |
| `auditLogs` | Log de auditoria interno | 4 camadas | 2 | PRODUÇÃO REAL (APR-2026-016) |
| `suppliers` | Cadastro/avaliação de fornecedores | 4 camadas | 6 | NÃO-PRODUÇÃO (0 registros) |
| `clients` | Cadastro de clientes | 4 camadas | 5 | NÃO-PRODUÇÃO (0 registros) |
| `employees` | Cadastro núcleo de funcionários | 4 camadas | 5 | NÃO-PRODUÇÃO (0 registros) |
| `products` | Produto acabado / extensões técnicas | 4 camadas | 9 | NÃO-PRODUÇÃO (0 registros) |
| `bom` | Estrutura de produto (BOM) | 4 camadas | 12 | NÃO-PRODUÇÃO (0 registros) |
| `production` | Ordens de produção, apontamento, downtime, roteiro (3 arquivos de rota) | 4 camadas | 23 (11+3+9) | NÃO-PRODUÇÃO (roteiro=0, gate G6-START-NO-ROUTE) |
| `workCenters` | Centros de trabalho/capacidade | 4 camadas | 6 | NÃO-PRODUÇÃO (1 registro mínimo) |
| `mrp` | Planejamento de necessidades (MRP) | 4 camadas | 4 | NÃO-PRODUÇÃO (depende de BOM/roteiro=0) |
| `purchases` | Pedido de compra, aprovação por alçada | 4 camadas | 10 | NÃO-PRODUÇÃO (depende de suppliers=0) |
| `purchaseRequisitions` | Requisição de compra (origem da cadeia) | 4 camadas | 5 | NÃO-PRODUÇÃO |
| `sales` | Pedido/faturamento/NF-e/baixa de estoque | 4 camadas | 13 | NÃO-PRODUÇÃO (clients=0, products=0) |
| `maintenance` | Ordens de manutenção | 4 camadas | 5 | NÃO-PRODUÇÃO |
| `serviceOrders` | Ordens de serviço | 4 camadas | 5 | NÃO-PRODUÇÃO |
| `quality` | Inspeção, liberação de lote, quarentena | 4 camadas | 3 | NÃO-PRODUÇÃO |
| `nonConformities` | Não-conformidades, devolução a fornecedor | 4 camadas | 5 | NÃO-PRODUÇÃO |
| `traceability` | Rastreabilidade por lote/série | 4 camadas | 3 | NÃO-PRODUÇÃO |
| `mobileInventory` | Inventário via QR (app mobile) | 4 camadas | 3 | NÃO-PRODUÇÃO |
| `inventory` | Estoque, contagens, transferências, múltiplos depósitos (2 arquivos de rota) | 4 camadas | 27 (18+9) | NÃO-PRODUÇÃO (sem inventário físico de abertura) |
| `assets` | Patrimônio/ativos | 4 camadas | 7 | NÃO-PRODUÇÃO |
| `rfq` | Cotação multi-fornecedor | 4 camadas | 7 | NÃO-PRODUÇÃO |
| `comex` | Importação/processos de comércio exterior | 4 camadas | 8 | NÃO-PRODUÇÃO |
| `financial` | AP/AR, CNAB, conciliação OFX (3 arquivos de rota) | 4 camadas | 30 (15+8+7) | NÃO-PRODUÇÃO |
| `accounting` | Contabilidade | 4 camadas | 11 | NÃO-PRODUÇÃO |
| `budget` | Orçamento | 4 camadas | 6 | NÃO-PRODUÇÃO |
| `treasury` | Tesouraria | 4 camadas | 11 | NÃO-PRODUÇÃO |
| `facilities` | Frota, abastecimento, limpeza, visitantes | 4 camadas | 64 | NÃO-PRODUÇÃO |
| `marketing` | Campanhas, leads, funil | 4 camadas | 30 | NÃO-PRODUÇÃO |
| `juridico` | Contratos, LGPD, prazos, atos societários | 4 camadas | 75 | NÃO-PRODUÇÃO |
| `ti` | Chamados, licenças, backup, acesso | 4 camadas | 47 | NÃO-PRODUÇÃO |
| `rh` | Admissão, contrato, afastamento, férias | 4 camadas | 57 | NÃO-PRODUÇÃO (depende de employees=0) |
| `sst` | Segurança e Saúde do Trabalho (EPI, ASO, CIPA, PGR, eSocial) | 4 camadas | 75 | NÃO-PRODUÇÃO (depende de employees=0) |
| `engineering` | Projetos, desenhos técnicos, especificação | 4 camadas | 11 | NÃO-PRODUÇÃO |
| `laboratory` | Testes acústicos (Thiele-Small) | 4 camadas | 3 | NÃO-PRODUÇÃO |
| `directorate` | Governança — planejamento, atas, riscos, alçada | 4 camadas | 14 | NÃO-PRODUÇÃO |
| `masterProduction` | Plano Mestre de Produção | 4 camadas | 7 | NÃO-PRODUÇÃO |
| `spreadsheetImport` | Importação de catálogo via planilha | 4 camadas | 5 | NÃO-PRODUÇÃO (a carga real dos 327 itens não passou por este módulo, foi via API direta) |
| `reports` | Relatórios/exportação | 4 camadas | 8 | NÃO-PRODUÇÃO |
| `dashboard` | KPIs / painel | 4 camadas | 3 | NÃO-PRODUÇÃO |
| `accessProfiles` | RBAC / perfis de acesso | 4 camadas | 6 | NÃO-PRODUÇÃO |
| `webhooks` | Integração backend-to-backend (n8n) | 4 camadas | 2 | NÃO-PRODUÇÃO |
| `fiscal` | Config fiscal, cálculo de tributo, provedores NF-e | 4 camadas | 2 | NÃO-PRODUÇÃO |
| `intelligentAuditor` | Auditor interno automatizado (financeiro/compras/vendas/estoque) | 4 camadas | 4 | NÃO-PRODUÇÃO |

**Total de rotas somadas pela tabela:** 681 endpoints — bate exatamente com
o total agregado por `Grep -c` (`Found 681 total occurrences across 53
files`).

**Ressalva de método:** a coluna "Camadas confirmadas" foi verificada por
amostragem estrutural via `Glob` recursivo por camada (todas as 4 camadas
aparecem nos resultados agregados para praticamente todos os 48 módulos),
não por inspeção individual módulo-a-módulo de cada um dos 48 diretórios —
herdado do método já usado em `dc52081` e reconfirmado agregadamente, não
módulo a módulo.

**Responsabilidade de negócio:** todas marcadas como inferidas do nome de
pasta/rotas/controllers, não confirmadas contra requisito formal (Regra 2 da
skill — não presumir SSOT do próprio ERP como fonte de verdade).

## Resumo

- **Módulos backend:** 48 (idêntico a `dc52081`, reverificado via 4 vetores
  independentes: rotas, domain, application, infrastructure — todos
  batendo).
- **Endpoints:** 681 (recontado, idêntico).
- **Nenhuma mudança estrutural detectada** entre o inventário de `dc52081`
  e o disco atual desta sessão — todos os números centrais (módulos,
  camadas, rotas, migrations, testes) bateram exatamente.

---

*Produzido pelo agente `vericore-architecture-auditor` em modo read-only
reforçado; conteúdo persistido neste caminho pelo orquestrador a partir da
resposta do agente, sem edição de conteúdo.*
