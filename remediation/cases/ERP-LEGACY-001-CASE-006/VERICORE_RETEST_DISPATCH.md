# Despacho para reteste VeriCore - `ERP-LEGACY-001-CASE-006`

```
CASE_ID:      ERP-LEGACY-001-CASE-006
FINDING_ID:   AUD-INTEG-03 / T32-SUP-F03
BRANCH:       sana/ERP-LEGACY-001/CASE-006
AUTORIDADE:   VeriCore
DATA:         2026-08-17
ESTADO:       PRONTO PARA RETESTE APOS COMMIT
```

## Artefatos para ler

- `remediation/cases/ERP-LEGACY-001-CASE-006/REMEDIATION_EVIDENCE_PACKAGE.md`
- `remediation/cases/ERP-LEGACY-001-CASE-006/CLAUDE_SECOND_OPINION.md`
- Diff do commit de remediacao na branch `sana/ERP-LEGACY-001/CASE-006`

## Reteste recomendado

1. Confirmar que `POST /api/products` rejeita `quantity: 327`.
2. Confirmar que `POST /api/items` rejeita `estoque_atual: 327`.
3. Confirmar que `POST /api/mobile-inventory/scan` sem `warehouse_code` rejeita antes de gravar movimento.
4. Confirmar que `POST /api/mobile-inventory/scan` com `type='out'`, `warehouse_code` e saldo `quarantine`/`blocked` rejeita sem alterar `products.quantity`, `product_warehouse_stock` ou `inventory_movements`.
5. Confirmar que `POST /api/mobile-inventory/scan` com `type='in'` e `warehouse_code` grava `warehouse_id` e credita o deposito.
6. Confirmar que `POST /api/mobile-inventory/batch` aceita `warehouse_code` por item e tambem no payload raiz.
7. Confirmar que `POST /api/products/movements` exige `warehouse_code` e preserva a concorrencia sem saldo negativo.
8. Avaliar explicitamente o risco residual declarado: entrada lot-blind sem `LotControl`.
9. Avaliar o blast radius declarado para SST/EPI e Facilities.

## Comandos locais ja executados pela SanaCore/Codex

```powershell
npm run typecheck
```

Diretorio: `server`

```powershell
npm test -- tests/unit/case006-stock-write-contract.test.ts tests/unit/case006-mobile-batch-contract.test.ts tests/unit/mobileInventory-use-cases.test.ts tests/characterization/qualidade-estoque--scan-mobile-fura-quarentena.test.ts
```

Diretorio: `server`

```powershell
npm test -- tests/integration/product-movement-concurrency.test.ts
```

Diretorio: `server`; resultado skipado por falta de prerequisitos de integracao.

```powershell
npm run build
```

Diretorio: `client`

```powershell
npx tsc --noEmit
```

Diretorio: `mobile`

## Limites

Este despacho nao declara `RETEST_PASSED`, `RETEST_FAILED` nem `FINDING CLOSED`.
Essa autoridade e exclusiva da VeriCore.
