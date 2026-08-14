# SYSTEM_MAP — ERP-LEGACY-001-AUD-001 (estratificação por tier)

```
AUDIT_ID:     ERP-LEGACY-001-AUD-001
AUDIT_COMMIT: c1311a6f76b512fef893f7e60d934179cae3409f
ESTÁGIO:      01-inventory
BASE:         docs/coretriad/projects/ERP-LEGACY-001/discovery/SYSTEM_MAP.md,
              CURRENT_ARCHITECTURE.md, MODULE_CATALOG.md, DOMAIN_MAP.md,
              INTEGRATION_INVENTORY.md — REFERENCIADOS, não reescritos.
              Este documento acrescenta (a) os deltas até o AUDIT_COMMIT e
              (b) a estratificação por tier exigida pelo AUDIT_SCOPE.md §4.
FONTE DOS TIERS: AUDIT_SCOPE.md §4 (decisão humana APR-2026-020 Decisão A,
              apoiada em PRODUCTION_STATUS_MAP.md / APR-2026-016).
              Este agente NÃO altera tier — apenas resolve a enumeração do
              escopo módulo a módulo e fecha a aritmética.
```

---

## 1. Mapa estrutural — referência + deltas

O mapa arquitetural continua sendo o do discovery (`discovery/SYSTEM_MAP.md`,
`discovery/CURRENT_ARCHITECTURE.md`). Revalidado nesta run e **válido no
AUDIT_COMMIT**, com estas ressalvas de leitura:

| Camada | Fato revalidado (contagem própria — ver `SYSTEM_INVENTORY.md` §2) |
|---|---|
| Entrada HTTP | `server/app.ts` (raiz de `server/`, **não** `server/src/`), 65 `app.use(` |
| Rotas | 53 arquivos → **681 endpoints** |
| Controllers | 106 |
| Use cases | 666 arquivos em `application/**` |
| Domínio | 170 arquivos em `domain/**` |
| Infra por módulo | 151 arquivos |
| **Fora da árvore modular** | **186 models** (`server/src/models/`) + **16 serviços** (`server/src/services/`) + 6 middlewares |
| Banco declarado | dump congelado (200 tabelas / 459 FKs) + 9 migrations pós-congelamento (7 tabelas / 19 FKs) = **207 / 478** |

**Traço estrutural que o plano precisa herdar:** o sistema tem **duas espinhas
dorsais paralelas** — a Clean Architecture por módulo e o par
`models/` + `services/` legado, que é onde vivem as âncoras dos achados mais
graves (`inventoryService.ts`, `bomService.ts`, `saleStockService.ts`,
`InventoryMovement.ts`). Auditar só a árvore modular deixa fora o código que
efetivamente grava estoque e financeiro.

**Deltas do mapa desde o discovery:** apenas D1-D3 (suíte de caracterização,
branch novo do runner, script npm) — ver `SYSTEM_INVENTORY.md` §3. Nenhum
módulo, rota, migration ou model entrou ou saiu.

**Alerta de baseline (OBS-INV-01):** o mapa do discovery é válido para
`c1311a6f`, **mas não para a tag `legacy-baseline-001` (`c9359be`)** — o commit
`3dee99f` introduziu `itemProductMirrorService.ts` e
`fixedAssetReceiptService.ts` e alterou 6 arquivos de `items`/`products`/
`purchases` entre a tag e o AUDIT_COMMIT. Qualquer trilha que use a tag como
referência está lendo um sistema que não é o auditado.

---

## 2. Estratificação por tier — 48 módulos, todos alocados

### 2.1 TIER 1 — PRODUÇÃO REAL (6 módulos, 39 endpoints)

Regime **read-only reforçado permanente** (`AUDIT_SCOPE.md` §5, APR-2026-016):
leitura de código/schema/config/doc versionada; **nenhuma execução que abra
conexão com `erp_evok_audio`**, em nenhuma trilha, de nenhum tier.

| Módulo | Endpoints | Por que é tier 1 |
|---|---|---|
| `items` | 12 | 327 insumos reais da fábrica |
| `categories` | 5 | referenciada pelos itens reais |
| `departments` | 5 | 17 registros = organograma real (seed oficial) |
| `users` | 7 | **parcial**: só a conta admin é dado real; as 20 contas `@teste.evokaudio` são NÃO-PRODUÇÃO. O **código** do módulo é auditado integralmente |
| `auth` | 8 | protege o dado real |
| `auditLogs` | 2 | carga real não auditada — FIND-ERP-002 (HIGH) |

Objeto adicional de tier 1, **de leitura declarada apenas**: o banco por trás
de `docker-compose.yml` (não existe banco de produção separado).

**Interseção crítica com OBS-INV-01:** `items` é tier 1 **e** foi alterado por
`3dee99f`. A trilha de `items` audita código sem cobertura de auditoria
anterior, sobre dado real. É o ponto de maior atenção do plano.

### 2.2 TIER 2 — alto risco financeiro / fiscal / estoque / autorização (20 módulos, 381 endpoints)

| Bloco | Módulos | Endpoints | Vínculo com finding aberto |
|---|---|---|---|
| Estoque / idempotência | `inventory` (27 = 18+9), `mobileInventory` (3), `traceability` (3) | 33 | FIND-ERP-001 CRITICAL (`POST /api/inventory/movements`); superfícies irmãs `products/movements`, `mobile-inventory/scan|batch` levantadas em `TRIAGE.md` §6.2 |
| Financeiro | `financial` (30 = 15+8+7), `treasury` (11), `accounting` (11), `budget` (6) | 58 | FIND-ERP-001 CRITICAL (`PayPayableUseCase`/`ReceivePaymentUseCase`) |
| Fiscal | `fiscal` (2) | 2 | tributos congelados no passo 30 (ICMS por UF divergente da doc; IPI sempre 0%) |
| Autorização / segregação | `accessProfiles` (6), `juridico` (75) | 81 | FIND-ERP-005 CRITICAL; FIND-ERP-006 HIGH (LGPD/DPO); FIND-ERP-009 HIGH (segregação sistêmica) |
| Compras / vendas / MRP | `purchases` (10), `purchaseRequisitions` (5), `rfq` (7), `suppliers` (6), `sales` (13), `mrp` (4), `production` (23 = 11+3+9), `masterProduction` (7) | 75 | FIND-ERP-009 HIGH (compras × demais pontos de aprovação) |
| Compliance / pessoas | `rh` (57), `sst` (75) | 132 | FIND-ERP-007 MEDIUM (`rh`); FIND-ERP-008 HIGH (`sst`) |

**Superfícies transversais de tier 2 que NÃO são módulos** e precisam de dono
explícito no `AUDIT_PLAN.md` (senão caem no vão entre trilhas):

- middlewares `auth.ts`, `authorizeAnyModule.ts`, `authorizeSelfOrModule.ts`
  (`server/src/middlewares/`, 6 arquivos);
- `server/src/services/` — 16 serviços, incluindo `inventoryService.ts`,
  `saleStockService.ts`, `materialReceiptService.ts`, `bomService.ts`,
  `quarantineBalanceService.ts`, `saleReceivableService.ts`,
  `costingService.ts`, `warehouseStockService.ts` e os 2 de `3dee99f`;
- `server/src/models/` — 186 models, onde vive a ausência de UNIQUE em
  `InventoryMovement.ts`;
- o schema declarado (`00_baseline_frozen.sql` + 9 migrations).

### 2.3 TIER 3 — restante (22 módulos, 261 endpoints)

| Módulo | Endpoints | | Módulo | Endpoints |
|---|---|---|---|---|
| `facilities` | 64 | | `assets` | 7 |
| `ti` | 47 | | `clients` | 5 |
| `marketing` | 30 | | `employees` | 5 |
| `directorate` | 14 | | `maintenance` | 5 |
| `bom` | 12 | | `serviceOrders` | 5 |
| `engineering` | 11 | | `nonConformities` | 5 |
| `products` | 9 | | `spreadsheetImport` | 5 |
| `comex` | 8 | | `intelligentAuditor` | 4 |
| `reports` | 8 | | `quality` | 3 |
| `workCenters` | 6 | | `laboratory` | 3 |
| | | | `dashboard` | 3 |
| | | | `webhooks` | 2 |

Também tier 3: `client/` (167 páginas), `mobile/`, `tv/`, CI (1 workflow) e
infra declarada.

### 2.4 Fechamento aritmético (verificação de completude)

| Tier | Módulos | Endpoints |
|---|---|---|
| 1 | 6 | 39 |
| 2 | 20 | 381 |
| 3 | 22 | 261 |
| **Total** | **48** | **681** |

**Nenhum módulo sem tier; nenhum endpoint sem tier.** A soma fecha exatamente
com as duas contagens independentes do `SYSTEM_INVENTORY.md` (48 módulos, 681
endpoints) — é a prova de que a enumeração do `AUDIT_SCOPE.md` §4 cobre o
sistema inteiro, sem lacuna e sem duplicidade.

---

## 3. Notas de alocação para o `AUDIT_PLAN.md` (insumo, não decisão)

Este estágio **não aloca auditores nem define trilhas** — é atribuição do plano.
Registra o que o inventário obriga a considerar:

1. **`products` está em tier 3 mas foi alterado por `3dee99f`**, junto com
   `items` (tier 1) e `purchases` (tier 2). O espelhamento item↔produto
   atravessa os três tiers em um único fluxo. Auditar `items` sem
   `itemProductMirrorService.ts` e sem `products` deixa o fluxo pela metade.
2. **`directorate` está em tier 3** pela enumeração do escopo, mas concentra
   alçada/aprovação — matéria de FIND-ERP-009 (segregação). O plano deve
   registrar explicitamente como trata isso; alterar o tier exige o
   `vericore-audit-scope-agent`, não o planejamento.
3. **`bom` está em tier 3** e é âncora de BR-PP-016/017 (divergência entre
   dois motores de explosão, congelada no passo 30). Mesma observação do item 2.
4. **Restrição de conflito de interesse** (`AUDIT_SCOPE.md` §8 item 3): o autor
   de um finding preliminar não reexamina sozinho o próprio achado — vincula a
   alocação em `inventory`, `financial`, `auditLogs`, `juridico`, `rh`, `sst`,
   `accessProfiles`.
5. **Limitação L1** (`SYSTEM_INVENTORY.md` §0.2): a prova por `git diff --stat`
   de que a árvore em HEAD é idêntica à do AUDIT_COMMIT **ainda não existe**.
   O plano não deve prometer reprodutibilidade plena antes de anexá-la.
6. **Evidência dinâmica** só pelo `vericore-audit-verification-runner` contra
   `erp_evok_audio_test`. Cobertura que exija runtime (OBS-INV-03, OBS-INV-06)
   não pode ser prometida a trilhas puramente estáticas.
