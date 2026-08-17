# REMEDIATION_EVIDENCE_PACKAGE

## CASE_ID
ERP-LEGACY-001-CASE-006

## FINDING_ID
AUD-INTEG-03 / T32-SUP-F03

## ROOT_CAUSE
O estoque fisico podia ser escrito por caminhos que nao preservavam a invariante entre `products.quantity`, `inventory_movements` e `product_warehouse_stock`.

Evidencias auditadas:

- Mobile (`ScanItemUseCase` e `BatchScanUseCase`) chamava `InventoryService.adjust` sem `warehouseId`/`itemId`, gerando `InventoryMovement.warehouse_id = null` e sem debitar/creditar `ProductWarehouseStock`.
- Endpoint legado `POST /api/products/movements` (`RegisterProductMovementUseCase`) tambem chamava `InventoryService.adjust` diretamente, sem deposito.
- Cadastro web de `Product` aceitava `quantity`; cadastro de `Item` aceitava `estoque_atual`; o espelhamento `ItemProductMirrorService` propagava esses valores para o cadastro gemeo, criando saldo fisico sem movimento, deposito ou ledger.
- Caminhos de saida sem lote validavam apenas `products.quantity` bruto; se existisse saldo em `lot_controls` com status `quarantine`/`blocked`, a baixa ainda era aceita por fluxo lot-blind.

## LOCAL_FIX
Implementado fechamento fail-closed dos caminhos de escrita de estoque:

- Novo `manualStockAdjustmentService.adjustWithWarehouse` exige `warehouse_code`, resolve deposito ativo, bloqueia saida sem lote quando ha saldo em quarentena/bloqueado e faz dual-write com `WarehouseStockService`.
- `ScanItemUseCase`, `BatchScanUseCase` e `RegisterProductMovementUseCase` agora usam o servico controlado em vez de chamar `InventoryService.adjust` diretamente.
- `CreateInventoryMovementUseCase` tambem bloqueia saida sem lote quando ha saldo retido, fechando o endpoint novo contra o mesmo bypass de qualidade.
- `createProductSchema` e `createItemSchema` rejeitam saldo inicial nao-zero.
- `CreateProductUseCase`, `CreateItemUseCase` e `ItemProductMirrorService` normalizam saldo fisico inicial para zero, inclusive se chamados internamente.
- UI web removeu campos de saldo inicial das telas auditadas; app mobile passou a exigir `warehouse_code`.

## SYSTEMIC_FIX_REQUIRED
Nao para esta remediacao. O fix fecha os caminhos identificados pela auditoria no escopo atual.

Observacao operacional: a regra de saida lot-blind foi propositalmente conservadora. Enquanto o mobile/manual nao informar lote liberado, qualquer saldo retido do produto bloqueia saida por esses caminhos. Um fluxo futuro lot-aware pode permitir consumo de lotes aprovados especificos sem relaxar a protecao.

## BLAST_RADIUS
- Backend: estoque/inventario, mobile inventory, products movement legado, cadastro de product/item e espelhamento item/product.
- Frontend web: formularios de cadastro de produto/item.
- Mobile: contrato `ScanItemRequest` e formulario de movimentacao.
- Banco: nenhuma migration; nenhuma conexao a banco foi usada.

## CORRECTION_STRATEGY
Estrategia fail-closed:

1. Proibir origem de saldo fantasma no cadastro: produto/item nasce com saldo fisico zero.
2. Centralizar ajuste manual/mobile em servico que exige deposito e preserva dual-write.
3. Bloquear saida sem lote quando existe saldo `quarantine`/`blocked`, porque esses contratos nao carregam lote aprovado.
4. Atualizar UI/contratos para parar de oferecer campos ou payloads que o servidor agora rejeita.
5. Adicionar regressao que falharia na baseline e passa com a correcao.

## FILES_CHANGED
- `server/src/services/manualStockAdjustmentService.ts`
- `server/src/modules/mobileInventory/application/use-cases/ScanItemUseCase.ts`
- `server/src/modules/mobileInventory/application/use-cases/BatchScanUseCase.ts`
- `server/src/modules/mobileInventory/presentation/controllers/mobileInventoryController.ts`
- `server/src/modules/products/application/use-cases/RegisterProductMovementUseCase.ts`
- `server/src/modules/products/presentation/controllers/productController.ts`
- `server/src/modules/products/presentation/validators/productValidators.ts`
- `server/src/modules/inventory/application/use-cases/CreateInventoryMovementUseCase.ts`
- `server/src/modules/products/application/use-cases/CreateProductUseCase.ts`
- `server/src/modules/items/application/use-cases/CreateItemUseCase.ts`
- `server/src/modules/items/presentation/validators/itemValidators.ts`
- `server/src/services/itemProductMirrorService.ts`
- `client/src/pages/products/ProductsPage.tsx`
- `client/src/pages/products/ItemMasterPage.tsx`
- `client/src/pages/products/UsageItemsTab.tsx`
- `client/src/api/products.ts`
- `client/src/api/items.ts`
- `mobile/app/(app)/home.tsx`
- `mobile/package-lock.json`
- `mobile/src/api/types.ts`
- `mobile/src/api/mobileInventory.ts`
- `server/tests/characterization/qualidade-estoque--scan-mobile-fura-quarentena.test.ts`
- `server/tests/unit/mobileInventory-use-cases.test.ts`
- `server/tests/unit/case006-stock-write-contract.test.ts`
- `server/tests/unit/case006-mobile-batch-contract.test.ts`
- `server/tests/integration/product-movement-concurrency.test.ts`
- `remediation/cases/ERP-LEGACY-001-CASE-006/CLAUDE_SECOND_OPINION_DISPATCH.md`
- `remediation/cases/ERP-LEGACY-001-CASE-006/CLAUDE_SECOND_OPINION.md`
- `remediation/cases/ERP-LEGACY-001-CASE-006/VERICORE_RETEST_DISPATCH.md`

## TESTS_ADDED
- `server/tests/unit/case006-stock-write-contract.test.ts`
- `server/tests/unit/case006-mobile-batch-contract.test.ts`

Cobertura:

- Rejeita `POST /api/products` com `quantity` inicial nao-zero.
- Aceita cadastro de produto sem saldo inicial.
- Rejeita `POST /api/items` com `estoque_atual` nao-zero.
- Exige `warehouse_code` no endpoint legado de movimentacao de produto.
- Aceita `warehouse_code` no payload raiz do batch mobile e repassa ao ajuste controlado.

## TESTS_CHANGED
- `server/tests/characterization/qualidade-estoque--scan-mobile-fura-quarentena.test.ts`
  - Antes caracterizava o bug aceitando saida mobile sem deposito/quarentena.
  - Agora valida a remediacao: sem `warehouse_code` rejeita antes de buscar produto; saida com saldo retido rejeita sem gravar movimento; entrada com deposito grava `warehouse_id` e credita deposito.
- `server/tests/unit/mobileInventory-use-cases.test.ts`
  - Ajustado para o novo contrato obrigatorio `warehouse_code`.
- `server/tests/integration/product-movement-concurrency.test.ts`
  - Ajustado para o novo contrato seguro: produto nasce sem saldo inicial, estoque e semeado via `/api/inventory/movements` com `warehouse_code`, e o endpoint legado e exercitado com `warehouse_code`.

## TEST_RESULTS
PASS:

```powershell
npm test -- tests/unit/case006-stock-write-contract.test.ts tests/unit/case006-mobile-batch-contract.test.ts tests/unit/mobileInventory-use-cases.test.ts tests/characterization/qualidade-estoque--scan-mobile-fura-quarentena.test.ts
```

Resultado:

- Test Suites: 4 passed, 4 total
- Tests: 12 passed, 12 total
- Snapshots: 0 total

PASS:

```powershell
npm run typecheck
```

Diretorio: `server`

Resultado: `tsc -p tsconfig.json --noEmit` passou com `node_modules` local da worktree.

PASS:

```powershell
npm run build
```

Diretorio: `client`

Resultado: `tsc -b && vite build` passou com `node_modules` local da worktree. Vite emitiu apenas warnings de tamanho de chunk/plugin timings.

PASS:

```powershell
npx tsc --noEmit
```

Diretorio: `mobile`

Resultado: typecheck passou com `node_modules` local da worktree.

SKIPPED POR AMBIENTE:

```powershell
npm test -- tests/integration/product-movement-concurrency.test.ts
```

Diretorio: `server`

Resultado: Test Suites 1 skipped, Tests 1 skipped. O teste foi atualizado para o novo contrato, mas os prerequisitos de integracao nao estavam disponiveis nesta sessao.

PASS:

```powershell
git diff --check
```

Resultado: sem whitespace errors.

OBSERVACAO DE INSTALACAO:

- `server`: `npm ci` passou. NPM reportou 1 vulnerabilidade high preexistente na arvore instalada.
- `client`: `npm ci` passou, 0 vulnerabilidades reportadas.
- `mobile`: `npm ci` nao foi possivel porque `package.json` e `package-lock.json` estavam fora de sincronia. Foi executado `npm install`, que instalou dependencias locais, permitiu o typecheck e atualizou `mobile/package-lock.json`. NPM reportou 22 vulnerabilidades na arvore instalada (7 moderate, 15 high). Nao foi executado `npm audit fix`.

## SECOND_OPINION
Claude Code foi executado em modo somente leitura (`claude -p`) e retornou `SEGUNDA_OPINIAO_CONCORDA_COM_RESSALVA`.

Acoes tomadas apos a segunda opiniao:

- `mobileInventoryController.batchScan` passou a repassar `warehouse_code` raiz.
- `product-movement-concurrency.test.ts` foi atualizado para o novo contrato seguro.
- Este pacote passou a declarar explicitamente o blast radius de SST/Facilities e o risco residual de entrada lot-blind.

Artefatos:

- `remediation/cases/ERP-LEGACY-001-CASE-006/CLAUDE_SECOND_OPINION_DISPATCH.md`
- `remediation/cases/ERP-LEGACY-001-CASE-006/CLAUDE_SECOND_OPINION.md`
- `remediation/cases/ERP-LEGACY-001-CASE-006/VERICORE_RETEST_DISPATCH.md`

## REGRESSION_ANALYSIS
Os testes novos/alterados comprovam que os defeitos da baseline nao persistem:

- Baseline aceitava scan mobile sem deposito; agora rejeita antes de consultar produto.
- Baseline gerava movement com `warehouse_id = null`; agora entrada mobile grava `warehouse_id` resolvido.
- Baseline aceitava saida contra saldo em quarentena; agora saida lot-blind e bloqueada quando existe saldo retido.
- Baseline aceitava 327 unidades reais no cadastro; agora produto/item recusam saldo inicial nao-zero e use cases/mirror persistem zero.

## ARCHITECTURE_IMPACT
Baixo/moderado. Foi adicionado um servico pequeno para consolidar a regra manual/mobile e evitar duplicacao de dual-write. Nao altera dominio principal de `InventoryService`; ele continua responsavel por lock de produto e movimento.

## DATABASE_IMPACT
Sem migrations. Sem acesso a banco. Nenhuma credencial usada.

## API_IMPACT
Breaking/intentional para caminhos inseguros:

- `POST /api/mobile-inventory/scan` passa a exigir `warehouse_code`.
- `POST /api/mobile-inventory/batch` passa a exigir `warehouse_code` por item ou no payload raiz.
- `POST /api/products/movements` passa a exigir `warehouse_code`.
- `POST /api/products` rejeita `quantity` inicial nao-zero.
- `POST /api/items` rejeita `estoque_atual` inicial nao-zero.

## SECURITY_CHECKS
- Nao houve acesso ao banco de producao `erp_evok_audio`.
- Nenhuma credencial de banco foi usada.
- Nao houve alteracao em `audit/`, `coretriad/governance/`, `coretriad/states/` ou `.claude/`.
- Nao foi feito commit.

## DOCUMENTATION_UPDATED
- Este pacote de evidencia foi criado em `remediation/cases/ERP-LEGACY-001-CASE-006/REMEDIATION_EVIDENCE_PACKAGE.md`.

## COMMIT_HASH
Base HEAD antes de commit: `3a0d0c26acdfe406f23f4b28aff625b88fea34ae`

## BRANCH
`sana/ERP-LEGACY-001/CASE-006`

## RESIDUAL_RISK
- O bloqueio de saida lot-blind e conservador: se um produto tiver parte do saldo retida e parte aprovada, o fluxo mobile/manual sem lote fica bloqueado ate existir contrato lot-aware.
- Entrada lot-blind (`scan in` / ajuste manual in) ainda cria saldo sem `LotControl`; esta remediacao fecha os caminhos de saldo fantasma e bloqueia saida contra saldo retido, mas nao implementa contrato lot-aware de entrada. VeriCore deve avaliar se isso impede fechamento total de AUD-INTEG-03 ou gera follow-up.
- A guarda em `CreateInventoryMovementUseCase` tambem afeta consumidores de estoque como SST/EPI e Facilities; o comportamento e fail-closed por qualidade, mas o raio deve ser retestado nesses fluxos.
- `mobile/package-lock.json` precisou ser atualizado porque o lockfile existente estava fora de sincronia com `mobile/package.json`; revisar esse delta junto com a remediacao.
- `npm ci/install` reportou vulnerabilidades nas dependencias instaladas de `server` e `mobile`; nao fazem parte da causa-raiz deste caso e nao foram corrigidas automaticamente.

## RETEST_INSTRUCTIONS
1. Validar que `POST /api/products` com `quantity: 327` retorna erro de validacao.
2. Validar que `POST /api/items` com `estoque_atual: 327` retorna erro de validacao.
3. Validar que `POST /api/mobile-inventory/scan` sem `warehouse_code` retorna erro de validacao e nao cria `inventory_movements`.
4. Validar que scan mobile `out` com `warehouse_code` e saldo retido em `lot_controls.status IN ('quarantine','blocked')` retorna 422 e nao altera `products.quantity`, `product_warehouse_stock` nem `inventory_movements`.
5. Validar que scan mobile `in` com `warehouse_code` cria movimento com `warehouse_id` e soma no deposito correto.
6. Rodar a suite alvo listada em `TEST_RESULTS`.
