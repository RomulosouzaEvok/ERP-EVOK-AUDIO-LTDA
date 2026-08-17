# TRIAGE — ERP-LEGACY-001-CASE-010

| Campo | Valor |
|---|---|
| `CASE_ID` | `ERP-LEGACY-001-CASE-010` |
| `FINDING_ID` | `FIND-ERP-006` |
| Titulo | LGPD — DPO sem cadastro formal, retenção sem enforcement, prazo ANPD inexistente |
| Severidade | HIGH, CONFIDENCE CONFIRMED — herdado do finding, nao reavaliado aqui |
| Estado | `TRIAGED — BLOQUEADO POR DECISAO HUMANA` |
| Agente | Codex / sanacore-remediation-triage |
| Data | 2026-08-17 |

## 1. Cumprimento de seguranca

- Nenhuma conexao de banco foi aberta.
- Nenhum comando contra `erp_evok_audio` foi executado.
- Nenhum arquivo em `audit/`, `coretriad/`, `.claude/` ou `docs/` foi alterado.
- Leitura estatica feita sobre finding e codigo versionado.
- Nada foi implementado.
- Nenhum `FINDING CLOSED`, `RETEST_PASSED` ou `REMEDIATION_COMPLETE` declarado.

## 2. Evidencia lida

Finding lido integralmente:

- `docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-006.md`

Arquivos de codigo lidos para confirmar a causa-raiz:

- `server/src/modules/juridico/presentation/controllers/lgpdController.ts`
- `server/src/modules/juridico/presentation/routes/juridico.ts`
- `server/src/modules/juridico/application/use-cases/lgpd/CreateDataSubjectRequestUseCase.ts`
- `server/src/modules/juridico/application/use-cases/lgpd/CreateIncidentUseCase.ts`
- `server/src/modules/juridico/application/use-cases/lgpd/ResolveDataSubjectRequestUseCase.ts`
- `server/src/modules/juridico/application/use-cases/lgpd/DecideIncidentUseCase.ts`
- `server/src/modules/juridico/application/use-cases/lgpd/CreateProcessingActivityUseCase.ts`
- `server/src/modules/juridico/application/use-cases/lgpd/UpdateProcessingActivityUseCase.ts`
- `server/src/modules/juridico/application/use-cases/lgpd/PendingCriticalDataSubjectRequestsUseCase.ts`
- `server/src/models/JurLgpdIncident.ts`
- `server/src/models/JurLgpdDataSubjectRequest.ts`
- `server/src/models/JurLgpdProcessingActivity.ts`

## 3. Causa-raiz confirmada

O bloco LGPD foi implementado como CRUD de registro documental, nao como materializacao operacional das obrigacoes legais.

Confirmacoes por leitura:

- `lgpdController.ts` preenche `dpoUserId` de solicitacao de titular com `req.body?.dpo_user_id ?? req.user.id`.
- `CreateIncidentUseCase.ts` preenche `dpo_user_id` com `input.dpoUserId ?? input.createdBy`.
- `CreateProcessingActivityUseCase.ts` nao exige `retention_period`; o campo e gravado como texto livre opcional.
- `UpdateProcessingActivityUseCase.ts` apenas repassa `retention_period`, sem parser, data-limite ou consumidor.
- `ResolveDataSubjectRequestUseCase.ts` resolve qualquer `request_type`, inclusive `deletion` e `anonymization`, gravando `status: 'answered'` + notas, sem efeito verificavel de exclusao/anonimizacao.
- `JurLgpdIncident.ts` nao tem campo de prazo derivado de `detected_at`.
- `PendingCriticalDataSubjectRequestsUseCase.ts` mostra que ja existe padrao de cobranca temporal para solicitacao de titular, mas nao para incidente.

## 4. Por que este caso nao e LIMPO

O caso depende de decisoes reais de negocio/juridicas. Implementar sem essas decisoes violaria Regra 6: agente nao inventa regra de negocio nem interpreta prazo legal em nome da empresa.

Decisoes obrigatorias:

| ID | Decisao pendente | Por que bloqueia codigo |
|---|---|---|
| `D1` | Quem e o Encarregado/DPO formal da Evok Audio, ou qual mecanismo de designacao a empresa quer materializar? | O sistema nao pode escolher automaticamente um usuario, perfil ou departamento e chamar isso de Encarregado legal. |
| `D2` | Qual politica de retencao por categoria de dado LGPD? | Sem prazo/categoria/base de descarte, qualquer `retention_period` estruturado seria chute juridico. |
| `D3` | Como atender pedidos `deletion`/`anonymization`: apagar, anonimizar, sinalizar tarefa manual, ou outro fluxo aprovado? | A correcao altera dado pessoal e o valor probatorio do atendimento ao titular. |
| `D4` | Qual prazo interno para comunicacao de incidente a ANPD/titulares a partir de `detected_at`? | A LGPD fala em prazo razoavel; o numero operacional precisa ser decisao da empresa, nao hard-code de agente. |
| `D5` | O modulo `juridico/LGPD`, hoje DEV/HOMOLOGACAO, deve ficar bloqueado para promocao ate essas regras existirem? | O finding ancora a severidade no risco de promocao; isso afeta release/go-live. |

## 5. Estrategia tecnica quando destravado

Depois de D1-D5, a remediacao deve ser separada em lote(s) com escopo rastreavel:

- Materializar designacao formal do DPO/Encarregado e remover fallback silencioso para `req.user.id`/`createdBy`.
- Tornar retencao estruturada e obrigatoria conforme politica aprovada.
- Criar consumidor verificavel para retencao: alerta, fila manual, job, anonimização ou expurgo, conforme decisao D2/D3.
- Fazer resolucao de `deletion`/`anonymization` produzir efeito verificavel, ou recusar sem politica.
- Adicionar prazo de incidente derivado de `detected_at` e consulta de pendencias criticas, seguindo o padrao de `PendingCriticalDataSubjectRequestsUseCase`.
- Adicionar testes de regressao que falhem no estado atual e passem na remediacao.

## 6. Veredito da triagem

`CASE-010` nao e limpo.

Estado: `TRIAGED — BLOQUEADO POR DECISAO HUMANA`.

Pelo fluxo continuo definido pelo dono, a fila deve parar aqui ate D1-D5 serem respondidas. Nao preparar despacho de implementacao ainda e nao avancar para o proximo finding enquanto este bloqueio estiver aberto.

