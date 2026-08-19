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
