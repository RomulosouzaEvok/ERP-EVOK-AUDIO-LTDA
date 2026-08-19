# REMEDIATION EVIDENCE CONTINUATION - ERP-LEGACY-001-CASE-013

```text
CASE_ID: ERP-LEGACY-001-CASE-013
FINDING: FIND-ERP-009
BRANCH:  sana/ERP-LEGACY-001/CASE-013
STATUS:  PARTIAL - FASE 2A CONCLUIDA
```

## Escopo

Subentrega parcial do item 2 do despacho do CASE-013: aplicar segregacao
"quem pediu nao aprova" nos pontos #6 e #7 da triagem:

- `POST /api/ti/access-requests/:id/approve`
- `POST /api/ti/access-requests/:id/reject`

Esses dois pontos ja tinham `requested_by` gravado pelo fluxo de criacao, entao
nao exigiram migration nem mudanca de contrato.

## Causa-Raiz

- `server/src/modules/ti/application/use-cases/accessRequest/ApproveAccessRequestUseCase.ts`: validava elegibilidade (`ti:approve` ou gestor), mas nao comparava `request.requested_by` com `approverUserId`.
- `server/src/modules/ti/application/use-cases/accessRequest/RejectAccessRequestUseCase.ts`: repetia a mesma lacuna no caminho de rejeicao.
- `approverEligibilityService.ts` continua podendo considerar `admin` elegivel, mas a segregacao compara identidade e nao isenta `admin`, conforme P17/P19 e o padrao D-K preservado.

## Correcao

- `server/src/shared/domain/segregationOfDuties.ts`: adicionadas as regras `CASE-013-TI-ACCESS-APPROVE` e `CASE-013-TI-ACCESS-REJECT`.
- `ApproveAccessRequestUseCase.ts`: chama `assertApproverIsNotRequester` antes de qualquer `repository.update`.
- `RejectAccessRequestUseCase.ts`: chama `assertApproverIsNotRequester` antes de qualquer `repository.update`.
- `server/tests/unit/ti-access-request-use-cases.test.ts`: adicionada cobertura para aprovador/rejeitador distinto e para bloqueio de autoaprovacao/autorejeicao mesmo com usuario elegivel/admin.

## Prova Verde

```text
> erp-evok-audio-server@1.0.0 test
> jest --runInBand --runInBand tests/unit/ti-access-request-use-cases.test.ts

Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total
Snapshots:   0 total
Time:        2.624 s
Ran all test suites matching tests/unit/ti-access-request-use-cases.test.ts.
```

```text
> erp-evok-audio-server@1.0.0 typecheck
> tsc -p tsconfig.json --noEmit
```

## Limites

- Esta subentrega nao conclui a fase 2 completa; os demais pontos do CASE-013 continuam em aberto.
- Nenhuma conexao com `erp_evok_audio` foi aberta.
- Nenhum `FINDING CLOSED`, `RETEST_PASSED` ou `REMEDIATION_COMPLETE` e declarado aqui.

---

## Fase 2D - Production routes activate/inactivate

### Escopo

Subentrega parcial do item 2 do despacho do CASE-013: aplicar segregacao no
ponto #16 da triagem e no ato simetrico NP-8:

- `PATCH /api/production/routes/:id/activate`
- `PATCH /api/production/routes/:id/inactivate`

### Causa-Raiz

- `ActivateProductionRouteUseCase.ts`: gravava `approved_by` a partir do JWT, mas nao comparava o aprovador com `production_routes.created_by`.
- `InactivateProductionRouteUseCase.ts`: nao recebia a identidade do usuario autenticado e inativava o roteiro ativo sem segregacao.

### Correcao

- `server/src/shared/domain/segregationOfDuties.ts`: adicionadas as regras `CASE-013-PRODUCTION-ROUTE-ACTIVATE` e `CASE-013-PRODUCTION-ROUTE-INACTIVATE`.
- `ActivateProductionRouteUseCase.ts`: chama `assertApproverIsNotRequester` contra `route.created_by` antes de validar etapas, rebaixar roteiro ativo anterior ou ativar o rascunho.
- `InactivateProductionRouteUseCase.ts`: recebe `approved_by` opcional vindo do controller e chama `assertApproverIsNotRequester` contra `route.created_by` antes de atualizar status para `inactive`.
- `productionRouteController.ts`: passa `currentUserId(req)` para o use case de inativacao.
- `server/tests/unit/production-routes.test.ts`: adicionada cobertura para autoativacao sem validar etapas/alterar status e autoinativacao sem alterar status.

### Prova Verde

```text
> erp-evok-audio-server@1.0.0 test
> jest --runInBand --runInBand tests/unit/production-routes.test.ts

Test Suites: 1 passed, 1 total
Tests:       45 passed, 45 total
Snapshots:   0 total
Time:        0.306 s
Ran all test suites matching tests/unit/production-routes.test.ts.
```

```text
> erp-evok-audio-server@1.0.0 typecheck
> tsc -p tsconfig.json --noEmit
```

### Limites

- Engenharia/desenhos foi verificada e nao alterada nesta rodada: o despacho trata `drawing.created_by` como existente, mas o model `ProductDrawing` ainda nao possui esse campo. Esse ponto precisa de etapa RC-2 para gravar identidade antes da segregacao.
- Esta subentrega nao conclui a fase 2 completa; os demais pontos do CASE-013 continuam em aberto.
- Nenhuma conexao com `erp_evok_audio` foi aberta.
- Nenhum `FINDING CLOSED`, `RETEST_PASSED` ou `REMEDIATION_COMPLETE` e declarado aqui.

---

## Fase 2C - Inventory warehouse transfers

### Escopo

Subentrega parcial do item 2 do despacho do CASE-013: aplicar segregacao no
ponto #12 da triagem e no ato simetrico de rejeicao:

- `PUT /api/inventory/transfers/:id/approve`
- `PUT /api/inventory/transfers/:id/reject`

### Causa-Raiz

- `ApproveWarehouseTransferUseCase.ts`: `approverId` era usado nos movimentos e em `approved_by`, mas nao era comparado com `warehouse_transfers.user_id`.
- `RejectWarehouseTransferUseCase.ts`: tambem gravava `approved_by` sem comparar o rejeitador com o solicitante.

### Correcao

- `server/src/shared/domain/segregationOfDuties.ts`: adicionadas as regras `CASE-013-WAREHOUSE-TRANSFER-APPROVE` e `CASE-013-WAREHOUSE-TRANSFER-REJECT`.
- `ApproveWarehouseTransferUseCase.ts`: chama `assertApproverIsNotRequester` usando `transfer.user_id` antes de debitar origem, creditar destino, criar `InventoryMovement` ou atualizar status.
- `RejectWarehouseTransferUseCase.ts`: chama `assertApproverIsNotRequester` usando `transfer.user_id` antes de marcar a transferencia como `rejected`.
- `server/tests/unit/warehouse-stock.test.ts`: adicionada cobertura para autoaprovacao sem alteracao de saldos/movimentos/status e autorejeicao sem alteracao de status.

### Prova Verde

```text
> erp-evok-audio-server@1.0.0 test
> jest --runInBand --runInBand tests/unit/warehouse-stock.test.ts

Test Suites: 1 passed, 1 total
Tests:       37 passed, 37 total
Snapshots:   0 total
Time:        10.272 s
Ran all test suites matching tests/unit/warehouse-stock.test.ts.
```

```text
> erp-evok-audio-server@1.0.0 typecheck
> tsc -p tsconfig.json --noEmit
```

### Limites

- Esta subentrega nao conclui a fase 2 completa; os demais pontos do CASE-013 continuam em aberto.
- Nenhuma conexao com `erp_evok_audio` foi aberta.
- Nenhum `FINDING CLOSED`, `RETEST_PASSED` ou `REMEDIATION_COMPLETE` e declarado aqui.

---

## Fase 2B - Accounting post/reverse

### Escopo

Subentrega parcial do item 2 do despacho do CASE-013: aplicar segregacao nos
pontos #9 e #10 da triagem:

- `PATCH /api/accounting/entries/:id/post`
- `PATCH /api/accounting/entries/:id/reverse`

### Causa-Raiz

- `PostEntryUseCase.ts`: gravava `approved_by = userId`, mas nao comparava o aprovador com `entry.created_by`.
- `ReverseEntryUseCase.ts`: criava o estorno ja `posted`, com `created_by = userId` e `approved_by = userId`, sem comparar o usuario atual com `original.created_by` nem com `original.approved_by`.

### Correcao

- `server/src/shared/domain/segregationOfDuties.ts`: adicionadas as regras `CASE-013-ACCOUNTING-ENTRY-POST`, `CASE-013-ACCOUNTING-ENTRY-REVERSE-CREATOR` e `CASE-013-ACCOUNTING-ENTRY-REVERSE-POSTER`.
- `PostEntryUseCase.ts`: chama `assertApproverIsNotRequester` contra `entry.created_by` antes de buscar itens ou atualizar o lancamento.
- `ReverseEntryUseCase.ts`: chama `assertApproverIsNotRequester` contra `original.created_by` e `original.approved_by` antes de criar o lancamento de estorno ou marcar o original como `reversed`.
- `server/tests/unit/accounting-use-cases.test.ts`: adicionada cobertura para bloqueio de postagem pelo criador, estorno pelo criador do original e estorno pelo aprovador/postador do original.

### Prova Verde

```text
> erp-evok-audio-server@1.0.0 test
> jest --runInBand --runInBand tests/unit/accounting-use-cases.test.ts

Test Suites: 1 passed, 1 total
Tests:       24 passed, 24 total
Snapshots:   0 total
Time:        0.31 s
Ran all test suites matching tests/unit/accounting-use-cases.test.ts.
```

```text
> erp-evok-audio-server@1.0.0 typecheck
> tsc -p tsconfig.json --noEmit
```

### Limites

- Esta subentrega nao conclui a fase 2 completa; os demais pontos do CASE-013 continuam em aberto.
- Nenhuma conexao com `erp_evok_audio` foi aberta.
- Nenhum `FINDING CLOSED`, `RETEST_PASSED` ou `REMEDIATION_COMPLETE` e declarado aqui.
