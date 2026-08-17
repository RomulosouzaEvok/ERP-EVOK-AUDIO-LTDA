# REMEDIATION_EVIDENCE_PACKAGE - ERP-LEGACY-001-CASE-010

```
CASE_ID:      ERP-LEGACY-001-CASE-010
FINDING_ID:   FIND-ERP-006
BRANCH:       sana/ERP-LEGACY-001/CASE-010
WORKTREE:     C:\Sistema EvokAudio\ERP-Evok-sana-CASE-010
STATUS:       REMEDIATION_COMPLETE
```

## 1. Causa-raiz tratada

- `CreateDataSubjectRequestUseCase` e `CreateIncidentUseCase` nao podiam mais
  usar fallback silencioso para `req.user.id` / `createdBy` quando o payload
  nao trazia DPO.
- `CreateProcessingActivityUseCase` mantinha retenção como texto livre sem
  vínculo estruturado por categoria/política.
- `ResolveDataSubjectRequestUseCase` encerrava `deletion` / `anonymization`
  sem tarefa manual verificável.
- `jur_lgpd_incidents` nao tinha prazo operacional de 72h visível na camada
  de aplicação.
- Nao havia guarda estática versionada no `server/` para sinalizar a
  prontidão de promoção do bloco LGPD.

## 2. Decisões aplicadas

- D1: designação formal de DPO/Encarregado passa a ser resolvida por
  cadastro ativo, sem fallback para o usuário que abriu o fluxo.
- D2: retenção passa a ser estruturada por `retention_policy_id`, com
  validação de política ativa.
- D3: `deletion` / `anonymization` passam a gerar tarefa manual para
  revisão do DPO.
- D4: incidente passa a receber `assessment_due_at = detected_at + 72h`.
- D5: guarda estática versionada foi adicionada em
  `server/src/modules/juridico/domain/lgpdOperationalControlGuard.ts`.

## 3. Arquivos alterados

- `server/src/modules/juridico/application/use-cases/lgpd/CreateDataSubjectRequestUseCase.ts`
- `server/src/modules/juridico/application/use-cases/lgpd/CreateIncidentUseCase.ts`
- `server/src/modules/juridico/application/use-cases/lgpd/CreateProcessingActivityUseCase.ts`
- `server/src/modules/juridico/application/use-cases/lgpd/ResolveDataSubjectRequestUseCase.ts`
- `server/src/modules/juridico/application/use-cases/lgpd/UpdateProcessingActivityUseCase.ts`
- `server/src/modules/juridico/application/use-cases/lgpd/PendingCriticalIncidentsUseCase.ts`
- `server/src/modules/juridico/domain/entities/LgpdTypes.ts`
- `server/src/modules/juridico/domain/repositories/LgpdIncidentRepository.ts`
- `server/src/modules/juridico/infrastructure/sequelize/SequelizeLgpdIncidentRepository.ts`
- `server/src/modules/juridico/presentation/controllers/lgpdController.ts`
- `server/src/modules/juridico/presentation/routes/juridico.ts`
- `server/src/modules/juridico/domain/lgpdOperationalControlGuard.ts`
- `server/src/models/JurLgpdDpoDesignation.ts`
- `server/src/models/JurLgpdManualTask.ts`
- `server/src/models/JurLgpdRetentionPolicy.ts`
- `server/src/models/JurLgpdDataSubjectRequest.ts`
- `server/src/models/JurLgpdIncident.ts`
- `server/src/models/JurLgpdProcessingActivity.ts`
- `server/src/models/index.ts`
- `server/migrations/20260814-000050-lgpd-operational-controls-case-010.cjs`

## 4. Testes adicionados / atualizados

- `server/tests/unit/juridico-lgpd-alert-use-cases.test.ts`
- `server/tests/unit/juridico-lgpd-operational-control-guard.test.ts`

## 5. Evidencia de validacao

- `npm run typecheck` - passou.
- `npm run build` - passou.
- `npx jest --runInBand tests/unit/juridico-lgpd-alert-use-cases.test.ts tests/unit/juridico-lgpd-operational-control-guard.test.ts` - passou (27/27).
- `npm run test:unit:strict` - nao concluiu por um bloqueio preexistente fora do CASE-010:
  `tests/unit/docs-path-reference-guard.test.ts` ainda reprova por referencias
  documentais antigas em `docs/coretriad/...`.

## 6. Risco residual conhecido

- O `CASE-010` ficou operacionalmente ligado, mas a suite unitária global ainda
  tem um bloqueio externo ao escopo deste caso, em documentação viva.
- A validação global completa depende desse débito documental ser resolvido em
  outra frente.
- A retenção estruturada depende de configuração/política ativa. Sem isso, o
  fluxo falha por desenho.

## 7. Resultado

O escopo do `CASE-010` foi implementado, testado no recorte do módulo LGPD e
documentado com guarda estática versionada.

REMEDIATION_COMPLETE

