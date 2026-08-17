# Segunda opiniao Claude Code - `ERP-LEGACY-001-CASE-006`

```
CASE_ID:       ERP-LEGACY-001-CASE-006
FINDING_ID:    AUD-INTEG-03 / T32-SUP-F03
EXECUTOR:      Claude Code CLI
DATA:          2026-08-17
VEREDITO:      SEGUNDA_OPINIAO_CONCORDA_COM_RESSALVA
```

## Resultado

Claude Code concordou que a causa-raiz principal e a direcao da correcao batem
com AUD-INTEG-03/T32-SUP-F03, mas registrou ressalvas relevantes antes do commit.

## Pontos provados pela segunda opiniao

- Cadastro `Product.quantity` foi fechado por schema e por defesa em profundidade no use case.
- Cadastro `Item.estoque_atual` foi fechado por schema e por defesa em profundidade no use case.
- Espelhamento `ItemProductMirrorService` deixa de propagar saldo fisico inicial.
- `POST /api/products/movements` passa a exigir deposito e delega para ajuste controlado.
- `POST /api/mobile-inventory/scan` passa a exigir deposito e grava `warehouse_id`.
- Os testes de contrato/caracterizacao teriam falhado na baseline.

## Ressalvas levantadas

- O controller de batch nao repassava `warehouse_code` de raiz ao use case, embora o pacote documentasse esse contrato.
- O teste `server/tests/integration/product-movement-concurrency.test.ts` ainda refletia o contrato antigo: criava produto com saldo inicial e chamava `/api/products/movements` sem `warehouse_code`.
- A guarda adicionada em `CreateInventoryMovementUseCase` tambem afeta consumidores como SST/EPI e Facilities; isso precisa estar documentado no blast radius.
- A entrada lot-blind (`scan in`) ainda cria saldo sem `LotControl`; isso deve ser tratado como risco residual/escopo para VeriCore, nao como fechamento silencioso de toda a dimensao de lote.
- `mobile/package-lock.json` foi atualizado por `npm install` porque o lock estava fora de sincronia; Claude recomendou commit separado, mas aceitou que o delta e aditivo e de sincronizacao.

## Acoes tomadas apos a segunda opiniao

- `mobileInventoryController.batchScan` passou a repassar `warehouse_code` raiz para `BatchScanUseCase`.
- `product-movement-concurrency.test.ts` foi atualizado para semear estoque via `/api/inventory/movements` com `warehouse_code` e chamar o endpoint legado com `warehouse_code`.
- `case006-mobile-batch-contract.test.ts` foi adicionado para cobrir `warehouse_code` raiz no batch.
- `REMEDIATION_EVIDENCE_PACKAGE.md` foi atualizado com:
  - evidencias conclusivas de typecheck/build/test usando `node_modules` locais;
  - observacao sobre `mobile/package-lock.json`;
  - risco residual de entrada lot-blind;
  - blast radius de SST/Facilities.

## Veredito literal

`SEGUNDA_OPINIAO_CONCORDA_COM_RESSALVA`
