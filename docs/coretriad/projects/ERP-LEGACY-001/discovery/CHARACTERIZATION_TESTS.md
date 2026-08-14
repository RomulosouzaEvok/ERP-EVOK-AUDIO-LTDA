# CHARACTERIZATION_TESTS.md — passo 30 (ERP-LEGACY-001)

```
PROJECT_ID:  ERP-LEGACY-001
PASSO:       30 — Testes de caracterização (congelar o comportamento vigente)
DATA:        2026-08-14
NATUREZA:    Código de teste produzido por agentes OpusCore (3 trilhas, uma por
             cluster priorizado) + 1 trilha de infraestrutura de suíte, sob
             orquestração. Este artefato é a consolidação persistida pelo
             orquestrador a partir dos relatórios das trilhas, sem juízo de
             auditoria novo. Nenhum agente VeriCore escreveu código.
HEAD:        8cc650a (verificado por `git rev-parse` nesta sessão, não por
             contexto injetado)
BANCO:       erp_evok_audio_test (efêmero, via server/.env.test) — trava dura
             de APR-2026-016 respeitada; ver §6
EXECUÇÃO:    9 suítes / 66 testes / 66 verdes em 2026-08-14 (§3)
```

## 1. O que este artefato é — e o que ele NÃO é

Testes de caracterização **congelam o comportamento atual** do ERP, inclusive
comportamento sabidamente defeituoso ou já coberto por finding formal. Cada
teste responde "hoje o sistema realmente se comporta assim?" — **não** "o
sistema está certo?". Todo arquivo carrega no cabeçalho a frase normativa:

> Este teste NÃO valida que o comportamento está correto; ele registra o
> comportamento vigente na baseline. Alterá-lo exige decisão de negócio
> registrada.

Consequência prática: quando a remediação futura (passo 36+) corrigir um
comportamento congelado aqui, o teste de caracterização correspondente **deve
falhar** — e essa falha é o sinal de que uma mudança de comportamento
aconteceu e precisa estar amparada por decisão registrada. Nenhum teste deste
passo valida correção; nenhum código de `server/src/**` foi alterado.

## 2. Infraestrutura criada

| Item | Detalhe |
|---|---|
| Suíte nova | `server/tests/characterization/` (9 arquivos), descoberta pelo `jest.config.cjs` existente sem alteração |
| Runner | `server/scripts/run-api-suite.cjs` — branch novo `characterization`, **fora do default `api`** (CI existente inalterado) |
| Script | `npm run test:characterization` em `server/package.json` |
| Guards herdados | Recusa `DB_NAME` sem sufixo `_test`/`_ci`; recusa `NODE_ENV=production`; migrations no banco de teste; fixtures + tokens (`TEST_AUTH_TOKEN`/`TEST_APPROVER_TOKEN`); `assert-jest-no-skips.cjs` |
| Convenção de gating | Testes que precisam de API/DB usam `hasIntegrationPrerequisites()` → `describe.skip` fora do runner; unit-style rodam sem banco em `npm test` |

## 3. Execução (evidência dinâmica)

- **Primeira execução central (2026-08-14):** 65/66 verdes, **1 falha** — a
  falha refutou empiricamente uma premissa de leitura estática (§5.3). O
  ajuste foi feito **no teste** (congelar o comportamento real), nunca em
  `src/`. É exatamente o mecanismo que o passo 30 existe para exercitar.
- **Execução final (2026-08-14):** `npm run test:characterization` →
  **9 suítes, 66 testes, 66 verdes, 0 skips**, contra
  `localhost:5432/erp_evok_audio_test` (JSON de resultado gravado pelo runner
  em `server/tmp/`, arquivo `jest-characterization.json` — saída local, fora
  do Git).
- Transparência: 2 falhas **pré-existentes** em `tests/unit/` (fora desta
  suíte: `docs-path-reference-guard.test.ts` e asserção relativa a data em
  `onda3-shipping-cockpit-cashflow.test.ts`) reproduzem sem as mudanças deste
  passo e **não foram tocadas** — registradas para o passo 31.

## 4. Inventário — 9 arquivos, comportamentos congelados

### 4.1 comercial-financeiro (4 arquivos, 14 testes)

| Arquivo | Testes | Comportamento congelado | Âncoras |
|---|---|---|---|
| `--pagamento-parcial-repetido` | 3 | Pagamento repetido sobre título `partial` é aceito e soma (`amount_paid` 400→800 em título de R$ 1.000); só o **teto de saldo** rejeita a 3ª tentativa — não há detecção de duplicidade | FIND-ERP-001 grupo B; `PayPayableUseCase.ts:39-74`; `ReceivePaymentUseCase.ts:39-74` |
| `--desconto-nao-chega-nfe-ar` | 1 | Venda R$ 1.000 com desconto R$ 200: `Sale.total_amount=800`, NF-e emitida por **1.000**, AR criado por **1.000** — 3 valores para o mesmo negócio | BR-COM-010 (CRITICAL/CONFIRMED); `CreateSaleUseCase.ts:143-160`; `IssueSaleNfeUseCase.ts:202,213-214`; `saleReceivableService.ts:200,215` |
| `--tributos-vigentes` | 8 | ICMS interno vigente: SP=18% (bate com doc), RJ=20%, BA=19%, RS=17% (divergem da doc, que fixa 18%); fallback silencioso `?? 18` para UF não mapeada; **IPI sempre 0%/CST 53** para qualquer NCM — o código nunca lê `item.ncm` para IPI | BR-FIS-001/003 (CRITICAL/CONFIRMED); `TaxCalculationService.ts:55-59,101-124` |
| `--maquina-estados-venda-shipped` | 2 | Cancelar NF-e autorizada **reverte** a venda `invoiced → confirmed` (correção D-M); tentativa de embarque subsequente cai na guarda **genérica** de transições (`confirmed → shipped` inválida), não na guarda dedicada de `nfe_status`; `shipped` é terminal | BR-COM-003/004; `CancelSaleNfeUseCase.ts:203,221-223`; `ChangeSaleStatusUseCase.ts:12-30,143-157` — ver §5.3 |

### 4.2 qualidade-estoque (2 arquivos, 5 testes)

| Arquivo | Testes | Comportamento congelado | Âncoras |
|---|---|---|---|
| `--duplicacao-lancamento-estoque` | 1 | Dois `POST /api/inventory/movements` idênticos → ambos `201`, dois movimentos, saldo aplicado **duas vezes** (0→20 para duas entradas de 10); nenhuma proteção de idempotência | FIND-ERP-001 grupo B; `inventoryController.ts:113-152`; `CreateInventoryMovementUseCase.ts:71-123`; `InventoryMovement.ts:57-69` (índice não-único) |
| `--scan-mobile-fura-quarentena` | 4 | Scan `out` com 100% do saldo retido em quarentena **não é rejeitado** (50→30); `LotControl` nunca consultado; movimento gravado com `warehouse_id: null`; após a baixa, saldo retido (50) > saldo físico (30) — drift silencioso | BR-QE-011 (CRITICAL/CONFIRMED, candidato L-1/F-5); `ScanItemUseCase.ts:63-74`; `quarantineBalanceService.ts:73,132-138` |

### 4.3 planejamento-producao (3 arquivos, 47 testes)

| Arquivo | Testes | Comportamento congelado | Âncoras |
|---|---|---|---|
| `--production-order-status-transitions` | 39 | Matriz **6×6 completa** da OP: 9 transições válidas, 21 inválidas, 6 self-transitions com mensagem própria checada antes da lista; `completed`/`canceled` terminais; `paused → in_progress` é a única reabertura; efeitos colaterais por transição (datas, quantidades) | BR-PP-001; `ProductionOrderEntity.ts:60-67,157-213` |
| `--bom-explosion-divergence-mrp-vs-op` | 5 | Motores de explosão divergem: `mrpEngine.explodeBomRequirements` ignora `is_phantom` e não tem `maxDepth` (cadeia de 50 níveis passa); `BomService.explodeBOM` para em subconjunto estocável e, com `is_phantom=true`, **remove o subconjunto** da saída. Comparação direta é inviável por construção (tabelas `item_estruturas` UUID × `bill_of_materials` INT, sem ponte) — cada motor congelado isoladamente | BR-PP-016/016b/017; `mrpEngine.ts:154-210`; `bomService.ts:423-570`; `bomStructureProjection.ts:9-18` |
| `--mrp-lote-minimo-estoque-seguranca-mesma-coluna` | 3 | Com produto casado por código, `estoque_seguranca` e `lote_minimo` saem **idênticos** de `min_quantity`; efeito duplo no plano: reduz `availableStock` em 500 **e** arredonda `plannedQuantity` para múltiplo de 500 | BR-PP-013; `SequelizeItemRepository.ts:109-110`; `mrpEngine.ts:246-254` |

## 5. Divergências reveladas pelo passo 30 (documento × código × runtime)

Nenhuma promovida a finding — Regra 22 e precedente de `APR-2026-018` (sem
promoção por analogia). Todas seguem ao passo 31 como observação.

1. **`reference_type`/`reference_id` descartados silenciosamente** na rota
   manual de movimentos: o payload aceita os campos, mas
   `CreateInventoryMovementUseCase.ts:107-116` não os repassa e
   `inventoryService.ts:356-368` hardcoda `reference_type='adjustment'`,
   `reference_id=null`. FIND-ERP-001 assumia implicitamente que os campos
   chegavam à gravação.
2. **Sub-relato de cobertura confirmado de novo** (mesma classe do §5 da
   consolidação do passo 29): os cenários unit de `shipped` já estavam
   cobertos por `tests/unit/onda3-shipping-cockpit-cashflow.test.ts` — arquivo
   cujo nome não cita BR/UC, invisível ao levantamento dos passos 26/28. O que
   faltava (e foi criado) era o nível de **integração** com o
   `CancelSaleNfeUseCase` real.
3. **A premissa "cancelar NF-e não reverte a venda" é falsa em runtime** — a
   1ª execução refutou a leitura estática. Desde a correção D-M (2026-08-10),
   `CancelSaleNfeUseCase.ts:203,221-223` reverte `invoiced → confirmed`
   (ou `partially_invoiced`). Três lugares herdam a premissa velha: o JSDoc de
   produção em `ChangeSaleStatusUseCase.ts:89-101` (justifica uma guarda
   dedicada de `nfe_status` que o caminho público **nunca alcança**), o
   BR-COM-003/L-3 do BRC do cluster, e as linhas 35-36 da matriz do cluster. O
   teste unit existente nunca pegou o drift porque constrói o estado
   `{invoiced, cancelled}` à mão em vez de produzi-lo pelo use case real.
   **Candidato natural a exame no passo 31: guarda dedicada como código morto
   no caminho público + docs de produção defasadas.**

## 6. Regime de segurança de dado real (APR-2026-016) — conformidade

- Toda execução ocorreu contra `erp_evok_audio_test` via `server/.env.test`,
  sob o guard do runner que **recusa** `DB_NAME` sem sufixo de teste. O banco
  real (docker-compose, PRODUÇÃO REAL) não recebeu nenhuma conexão de teste.
- Testes unit-style rodam sem banco algum (dublês em memória).
- Nenhum arquivo de `server/src/**`, migrations, seeds ou testes existentes
  foi alterado. Mudanças de código restritas a: 9 arquivos novos em
  `tests/characterization/`, 1 branch novo no runner, 1 script novo no
  `package.json`.

## 7. O que deliberadamente NÃO foi caracterizado (e por quê)

- **Prova dinâmica de corrida real** (duas conexões simultâneas sob carga)
  para FIND-ERP-001 — mandato do `vericore-audit-verification-runner`
  (RETEST_SPECIFICATION item (c) do finding), não de teste de caracterização.
- **Candidatos fora da prioridade A-D de cada trilha**, registrados como
  próxima rodada natural se o dono priorizar: BR-QE-004/006/007/008/009
  (qualidade-estoque), BR-PP-015 (3 caminhos de criação de OP) e BR-PP-025
  (CRP fantasma), BR-COM-008/009 (tabela de preço/desconto sem teto),
  BR-FIS-002/004/005/006 (interestadual/DIFAL/ST/CFOP — interestadual SP→RJ/BA
  já coberto pela suíte unit existente).
- **Domínios 100% fantasma** (accounting/budget/treasury/CNAB) — sem UC/REQ a
  montante; caracterizá-los antes da decisão do dono sobre o backlog de
  recuperação seria congelar comportamento que talvez seja removido.
- **Módulos já bem cobertos** — gates G3/G4/G6, FEFO, custeio, roteiro, MPS,
  RBAC de NF-e (`sales-nfe-rbac`), concorrência de OP/venda/estoque: a suíte
  existente já congela; duplicar seria ruído (correção metodológica do §5 do
  passo 29 aplicada).

## 8. Estado do passo 30 e PARE

- **Passo 30 CONCLUÍDO** — último passo da skill `coretriad-legacy-discovery`.
- **PARE INCONDICIONAL em vigor**: o passo 31 (auditoria 360°) NÃO é convocado
  por esta skill, nem por inferência. Exige novo gate humano explícito e
  registrado em `coretriad/governance/APPROVALS.md`.
- Pendências que permanecem com o dono (não antecipadas): (a) encaminhamento
  dos 7 findings formais à SanaCore; (b) esquema de BR-ID canônico + OWNER
  (causa-raiz nº 1 da matriz do passo 29); (c) decisões abertas listadas nos
  artefatos dos passos 26-29.
- *Adendo (2026-08-14, mesmo dia, após o fechamento deste artefato):* a
  pendência (b) foi parcialmente resolvida por `APR-2026-019` — esquema de
  BR-ID canônico adotado (IDs do passo 26 promovidos sem renumeração,
  catálogo em `docs/coretriad/projects/ERP-LEGACY-001/BR_CATALOG.md`); a
  atribuição de OWNER por área segue pendente, por decisão explícita do dono.
