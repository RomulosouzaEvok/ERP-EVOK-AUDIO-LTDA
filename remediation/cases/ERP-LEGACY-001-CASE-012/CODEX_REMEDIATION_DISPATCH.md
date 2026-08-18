# Despacho de remediação — `ERP-LEGACY-001-CASE-012`

```
CASE_ID:      ERP-LEGACY-001-CASE-012
FINDING_ID:   FIND-ERP-007
ESCOPO:       Implementação nova a partir da triagem completa (TRIAGE.md) —
              caso estava BLOQUEADO POR DECISÃO HUMANA; decisão saiu em
              APR-2026-057 (P11-P15). Nenhuma worktree existe ainda.
WORKTREE:     C:\Sistema EvokAudio\ERP-Evok-sana-CASE-012  (criar nova)
BRANCH:       sana/ERP-LEGACY-001/CASE-012 (Regra 11), a partir de main
DECISOES:     APR-2026-057 (`coretriad/governance/APPROVALS.md:3455-3468` e
              `coretriad/governance/APPROVALS_APPEND.md:110-151`) — P11=SIM,
              P12=texto livre, P13=obrigatório e simétrico, P14=fato jurídico
              confirmado (art. 481 CLT, cláusula assecuratória ⇒ aviso prévio
              normal, trabalhado ou indenizado), P15=RH escolhe manualmente
DESTINO:      sanacore-remediation-engineer / Codex
```

## 1. Contexto — por que a implementação pode prosseguir agora

A triagem (`remediation/cases/ERP-LEGACY-001-CASE-012/TRIAGE.md`) concluiu
`CASO BLOQUEADO POR DECISÃO HUMANA` porque os itens 1 e 2 do finding
dependiam de perguntas de negócio (Q1a-c, Q2a-b) que a SanaCore não pode
responder (Regra 6). Essas perguntas foram todas respondidas pelo dono em
`APR-2026-057`:

- **Q1a→P11:** SIM, persistir o motivo no processo de demissão.
- **Q1b→P12:** texto livre (não enum) — o `<textarea>` já existente na tela
  permanece; o que muda é que o valor passa a ter destino real.
- **Q1c→P13:** obrigatório, e **sem assimetria** entre `PATCH
  /employee-contracts/:id/decision` (decisão de contrato) e `POST
  /termination-processes` (criação direta) — os dois precisam aceitar/exigir
  o mesmo campo.
- **Q2a→P14:** fato jurídico confirmado — contrato de experiência da Evok
  tem cláusula assecuratória (art. 481 CLT); a rescisão antecipada segue
  regra normal de aviso prévio (trabalhado ou indenizado), não a indenização
  do art. 479. Logo `notice_modality: 'trabalhado'` fixo em
  `DecideEmployeeContractUseCase.ts:104` não tem mais nem base técnica nem
  base jurídica — precisa ser **escolha do RH**, igual ao outro fluxo.
- **Q2b→P15:** RH escolhe manualmente na tela, igual ao que já existe em
  `TerminationTab.tsx:301`/`terminationValidators.ts:22`.

**Item 3 do finding (409 vs 422) permanece fora do escopo.** Foi devolvido
pelo `vericore-finding-validator` como `NEEDS_MORE_EVIDENCE` (Regra 22) e o
próprio `TRIAGE.md` (§5.2, §10.1, VEREDITO item 3) o trata como bloqueado
duas vezes — por falta de evidência de nível de rota **e** por decisão
humana pendente (Q3a, ainda sem resposta em `APPROVALS.md`). Nada aqui pede
para tocar `CreateTerminationProcessUseCase.ts:62-65` quanto ao status HTTP,
nem os textos §5.2/§6.1 de `BLOCO_6_RH_API.md`.

Não há mais nenhuma pergunta bloqueante pendente para os itens 1 e 2. A
implementação pode seguir estritamente pelo plano já mapeado em
`TRIAGE.md` §4.3, §5.3 (Estágios 1 e 2) e §7 (testes TR-01 a TR-04, TR-06,
TR-08 a TR-10).

## 2. As correções exigidas, com arquivo:linha real da causa-raiz

### 2a. Persistir o motivo da rescisão (texto livre, obrigatório) — P11/P12/P13

Causa-raiz (`TRIAGE.md` §3.1, §1.1): o campo `termination_reason` é
prometido em 4 camadas (doc `BLOCO_6_RH_API.md:526`, Zod
`employeeContractValidators.ts:27` dentro do `.strict()`, controller
`employeeContractController.ts:94` que repassa via spread, interface local
`DecideEmployeeContractUseCase.ts:28`) e descartado na 5ª: `execute()`
(`DecideEmployeeContractUseCase.ts:60-108`) nunca lê `input.termination_reason`;
o objeto fixo montado em `:100-107` não o inclui; `HrTerminationProcess.ts:16-47`
não tem atributo para ele; a migration `20260808-000016` e o DDL congelado
(`00_baseline_frozen.sql:6296-6319`) não têm coluna para ele. O valor só
sobrevive em `audit_logs.new_values` (`employeeContractController.ts:95-98`),
fire-and-forget.

Correções obrigatórias:

1. **Migration nova** (aditiva, `ALTER TABLE hr_termination_processes ADD
   COLUMN termination_reason TEXT`), timestamp posterior a
   `20260812-000047-hr-absences-open-unique.cjs`. **NÃO editar**
   `00_baseline_frozen.sql`.
2. **`server/src/models/HrTerminationProcess.ts`**: adicionar atributo
   `termination_reason: DataTypes.TEXT`, `allowNull: false` (P13 =
   obrigatório).
3. **`DecideEmployeeContractUseCase.ts:100-107`**: repassar
   `input.termination_reason` no objeto passado a
   `createTerminationProcessUseCase.execute({...})`, quando
   `decision === 'rescindir'`.
4. **`CreateTerminationProcessUseCase.ts` (interface local `:22` e corpo
   `:67-75`)**: aceitar e repassar `termination_reason` ao
   `repository.create(...)`. O repositório
   (`SequelizeTerminationProcessRepository.create`) é pass-through genérico
   e **não precisa mudar** (`TRIAGE.md` §4.1, D-01).
5. **Tornar obrigatório e simétrico nos dois caminhos (P13):**
   - `employeeContractValidators.ts:27-28`: mudar `termination_reason` de
     `.optional()` para obrigatório **quando `decision === 'rescindir'`**
     (usar `.refine`/`superRefine` no schema, no mesmo padrão já usado para
     `period_2_end_date`, sem quebrar o `.strict()`).
   - `terminationValidators.ts` (schema de `POST /termination-processes`,
     hoje `.strict()` sem o campo, `:18-24` do `TRIAGE.md` §4.2): adicionar
     `termination_reason` como campo obrigatório também neste caminho, para
     eliminar a assimetria confirmada em `TRIAGE.md` §1.2/§4.2 ("Simetria com
     o outro endpoint").
   - `CreateTerminationProcessUseCase.ts` e seu controller
     (`terminationController.ts:86`): garantir que o repasse funciona nos
     dois pontos de entrada (via `DecideEmployeeContractUseCase` e via
     criação direta).
6. **Tela `EmployeeContractsTab.tsx:290,309,355-363`**: a UI já coleta o
   texto (`terminationReason` state, `<textarea>` "Motivo (opcional)"); só
   ajustar o rótulo para refletir obrigatoriedade (remover "(opcional)") e
   garantir validação client-side impedindo submissão sem o texto quando
   `decision === 'rescindir'`. Isso **não muda o contrato de doc** de forma
   alheia à SanaCore — atualizar `docs/business/BLOCO_6_RH_API.md` §5.2 é
   ownership de OpusCore; se o engineer tiver mandato para tocar esse
   arquivo específico neste caso, documentar a obrigatoriedade nova ali
   também (campo já documentado em `:526`, só falta marcar obrigatório e
   remover a lacuna em `POST /termination-processes` §6.1).

### 2b. Simetria entre os dois caminhos de abertura de demissão — P13

Já coberto pelo item 2a-5 acima (mesmo campo, mesma obrigatoriedade, nos
dois schemas Zod e nos dois use cases). Reforço: nenhum dos dois caminhos
pode aceitar `decision === 'rescindir'` / criação direta de
`TerminationProcess` sem `termination_reason` preenchido.

### 2c. Modalidade de aviso prévio escolhida manualmente pelo RH — P14/P15

Causa-raiz (`TRIAGE.md` §3.2, §1.2): `notice_modality` é `allowNull: false`
sem `DEFAULT` (`HrTerminationProcess.ts:24`, `00_baseline_frozen.sql:6301`);
`CreateTerminationProcessUseCase.ts:58-60` rejeita valor ausente/inválido
com 400; o caminho de decisão de contrato não tem de onde tirar o valor (a
UI de `EmployeeContractsTab.tsx:336-371` só pergunta `decision` e
`period_2_end_date`); por isso
`DecideEmployeeContractUseCase.ts:104` grava `notice_modality: 'trabalhado'`
como literal sem fonte. O outro caminho (`POST /termination-processes`) já
pergunta a modalidade (`terminationValidators.ts:22`,
`TerminationTab.tsx:301`) — o defeito é assimetria, não ausência de conceito
no sistema.

Correção obrigatória:

1. **`employeeContractValidators.ts`** (schema `decideContractSchema`):
   adicionar `notice_modality` como campo aceito/obrigatório quando
   `decision === 'rescindir'`, com o mesmo enum de dois valores já usado em
   `terminationValidators.ts:22` (`'trabalhado' | 'indenizado'`).
2. **`EmployeeContractsTab.tsx`**: adicionar a mesma pergunta de modalidade
   já existente em `TerminationTab.tsx` (mesmo componente/padrão de UI, se
   viável reutilizar), exibida quando `decision === 'rescindir'`.
3. **`DecideEmployeeContractUseCase.ts:100-107`**: remover o literal
   `notice_modality: 'trabalhado'` e repassar `input.notice_modality`
   (recebido do request) no objeto passado a
   `createTerminationProcessUseCase.execute({...})`.
4. **Citar a base jurídica no código**, conforme `TRIAGE.md` §5.3 Estágio 2
   ("nunca uma literal anônima"): comentário no ponto de repasse citando
   `APR-2026-057` / P14 (art. 481 CLT, cláusula assecuratória de rescisão
   antecipada ⇒ aviso prévio normal, escolhido pelo RH — não indenização do
   art. 479).
5. **Teste existente `rh-contract-use-cases.test.ts:107-109`** hoje congela
   `notice_modality: 'trabalhado'` como valor fixo esperado da chamada sob
   teste `execute({ id: 42, decision: 'rescindir', createdBy: 9 })`
   (`:105`). Esse teste **precisa ser reescrito**: a chamada sob teste passa
   a incluir `notice_modality` e `termination_reason` no input, e a
   asserção passa a verificar o **repasse do valor recebido**, não mais um
   literal fixo.

## 3. Testes exigidos (mapeados em `TRIAGE.md` §7, adaptados para execução)

| ID | Teste |
|---|---|
| TR-01 | `DecideEmployeeContractUseCase.execute({ decision:'rescindir', termination_reason:'X', notice_modality:'indenizado' })` → `createTerminationProcessUseCase.execute` recebe `termination_reason:'X'` **e** `notice_modality:'indenizado'`. Usar `toHaveBeenCalledWith` exato ou `objectContaining` **contendo as chaves** — não repetir o defeito atual (`objectContaining` sem a chave passaria mesmo com o campo descartado). |
| TR-02 | `PATCH /employee-contracts/:id/decision` com `decision:'rescindir'` e **sem** `termination_reason` → 400/erro de validação (campo agora obrigatório). Idem sem `notice_modality`. |
| TR-03 | `POST /termination-processes` sem `termination_reason` → 400/erro de validação (simetria com o caminho de decisão de contrato). |
| TR-04 | `CreateTerminationProcessUseCase` repassa `termination_reason` e `notice_modality` recebidos ao `repository.create` (prova no use case; o `create` do repositório é pass-through, não precisa de teste próprio de novo). |
| TR-05 | Valor de `termination_reason` recuperável em `GET /termination-processes/:id` (automático pelo `findByPk` sem `attributes` restritos — ainda assim escrever teste de integração contra `erp_evok_audio_test`). |
| TR-06 | Modalidade parametrizável: `indenizado` produz `indenizado`; `trabalhado` produz `trabalhado`; nenhum valor aceito fora do enum de dois valores. Teste antigo `:107-109` atualizado para citar a fonte (P14/APR-2026-057) em vez de literal anônima. |
| TR-07 | Guardas estruturais verdes: `export-assignment-guard` (armadilha real — `DecideEmployeeContractUseCase.ts` usa `export =` em `:111` e a interface de input é **deliberadamente local**, `:19-23`; **não exportar** a interface ao adicionar os campos novos, sob pena de `ReferenceError` em runtime no boot, mesmo incidente de 2026-08-09), `model-association-attribute-guard`, `rh-validators.test.ts`. |
| TR-08 | Drift model × banco da(s) coluna(s) nova(s) — `tests/integration/schema-model-drift-guard.test.ts`, **só** com `RUN_INTEGRATION=1` e **só** contra `erp_evok_audio_test`. |
| TR-09 | `payment_deadline` inalterado (é `GENERATED ALWAYS AS ((termination_date + 10)) STORED`, não depende de nada deste caso) e fluxo de `conclude`/ASO/checklist inalterado. |
| TR-10 | Nenhuma asserção de F1-tipo (guardas já existentes do módulo `rh`) regride. |

## 4. Prompt literal para colar no Codex

```text
Você está atuando como sanacore-remediation-engineer dentro da estrutura CoreTriad deste repositório.

Este é o despacho de implementação de ERP-LEGACY-001-CASE-012 (FIND-ERP-007, rescisão de contrato de experiência — RH). A triagem completa está em remediation/cases/ERP-LEGACY-001-CASE-012/TRIAGE.md — LEIA-A INTEGRALMENTE antes de editar qualquer arquivo, especialmente §1 (âncoras), §3 (causa-raiz), §4 (blast radius, inclusive as armadilhas nomeadas), §5.3 (estágios) e §7 (testes). Todas as decisões de negócio que bloqueavam este caso já foram tomadas pelo dono e estão registradas em coretriad/governance/APPROVALS.md (APR-2026-057) e coretriad/governance/APPROVALS_APPEND.md:110-151 — LEIA TAMBÉM antes de implementar.

Decisões já tomadas (não reabra, não questione, não invente alternativa):
- P11: motivo da rescisão DEVE ser persistido no processo de demissão (não só em audit_logs).
- P12: texto livre (TEXT), não enum/lista fixa.
- P13: obrigatório, e nos DOIS caminhos de abertura de processo de demissão (PATCH /employee-contracts/:id/decision E POST /termination-processes), sem assimetria entre eles.
- P14: contratos de experiência da Evok têm cláusula assecuratória de rescisão antecipada (art. 481 CLT) — a modalidade de aviso prévio segue a regra normal (trabalhado ou indenizado), não a indenização do art. 479. Cite essa base no comentário do código no ponto de repasse do valor.
- P15: RH escolhe a modalidade manualmente na tela, igual ao fluxo que já existe em TerminationTab.tsx/terminationValidators.ts para o outro caminho de criação de processo.

Crie a worktree/branch nova a partir de main (Regra 11):
  worktree: C:\Sistema EvokAudio\ERP-Evok-sana-CASE-012
  branch:   sana/ERP-LEGACY-001/CASE-012

Regras absolutas:
- NÃO conecte em erp_evok_audio (produção), nem para contar linhas, nem para "só confirmar comportamento".
- Testes de integração HTTP e qualquer coisa que abra conexão de banco somente contra erp_evok_audio_test.
- Não toque em audit/, coretriad/, .claude/. Se precisar atualizar docs/business/BLOCO_6_RH_API.md (para refletir obrigatoriedade nova e simetria entre os dois endpoints), limite-se a esse arquivo e registre a mudança explicitamente no pacote de evidência — não altere nenhum outro arquivo de docs/.
- NÃO toque server/database/postgresql/00_baseline_frozen.sql — a migration nova deve ser aditiva e rodar tanto em banco novo quanto existente (mecanismo em 20260731-000001-baseline-schema.cjs).
- NÃO implemente nada relativo ao item 3 do finding original (status HTTP 409 vs 422 de "processo já aberto"). Está fora do escopo deste despacho — permanece NEEDS_MORE_EVIDENCE e bloqueado por decisão humana pendente (Q3a), conforme TRIAGE.md §5.2, §10.1 e VEREDITO item 3. Não toque em CreateTerminationProcessUseCase.ts:62-65 quanto a isso.
- Não declare FINDING CLOSED nem RETEST_PASSED. Essa autoridade é exclusiva da VeriCore.
- Capture e registre no pacote de evidência o OUTPUT REAL dos comandos executados (testes, typecheck, build) — não apenas a alegação em texto. Isso foi ressalva explícita em CASE-010 deste mesmo fluxo e não deve se repetir.
- Cuidado com a armadilha nomeada em TRIAGE.md §4.2: DecideEmployeeContractUseCase.ts usa `export =` (:111) e a interface de input é deliberadamente local (:19-23). Se você exportar essa interface para tipar os campos novos, o teste export-assignment-guard.test.ts reprova E, pior, causa ReferenceError em runtime no boot do servidor (mesmo incidente de 2026-08-09 descrito naquele arquivo de guarda). Adicione os campos novos na interface local, sem exportá-la. Vale o mesmo cuidado para CreateTerminationProcessUseCase.ts:24-28,95.

Implemente, nesta ordem:

1. Migration nova (timestamp posterior a 20260812-000047-hr-absences-open-unique.cjs) adicionando a coluna termination_reason (TEXT, NOT NULL) em hr_termination_processes.
2. server/src/models/HrTerminationProcess.ts: adicionar atributo termination_reason (DataTypes.TEXT, allowNull: false).
3. server/src/modules/rh/presentation/validators/employeeContractValidators.ts: tornar termination_reason obrigatório (não mais .optional()) quando decision === 'rescindir', mantendo .strict(); adicionar notice_modality como campo aceito/obrigatório no mesmo caso, usando o mesmo enum de dois valores já usado em terminationValidators.ts:22 ('trabalhado' | 'indenizado').
4. server/src/modules/rh/presentation/validators/terminationValidators.ts (schema de POST /termination-processes): adicionar termination_reason como campo obrigatório, eliminando a assimetria hoje existente (esse schema já exige notice_modality).
5. server/src/modules/rh/application/use-cases/contract/DecideEmployeeContractUseCase.ts:100-107: remover o literal notice_modality: 'trabalhado'; repassar input.termination_reason e input.notice_modality (ambos recebidos do request) ao createTerminationProcessUseCase.execute({...}). Adicionar comentário citando APR-2026-057/P14 (art. 481 CLT) no ponto de repasse de notice_modality. NÃO exportar a interface local de input (ver armadilha acima).
6. server/src/modules/rh/application/use-cases/termination/CreateTerminationProcessUseCase.ts: interface local e corpo (:22, :67-75) já aceitam notice_modality; adicionar termination_reason à interface local e repassar ao repository.create(...). O repositório (SequelizeTerminationProcessRepository.create) é pass-through genérico e não deve precisar de mudança — confirme lendo o código, não assuma.
7. client/src/pages/hr/EmployeeContractsTab.tsx (:290,309,355-363): remover "(opcional)" do rótulo do motivo, adicionar validação client-side impedindo submit sem o texto quando decision === 'rescindir'; adicionar campo de escolha de modalidade de aviso prévio (reaproveitando o padrão já usado em TerminationTab.tsx:301), enviado como notice_modality no payload.
8. client/src/api/hr.ts: ajustar tipos TS relevantes (termination_reason deixa de ser comentado como opcional; notice_modality passa a existir no payload de decisão de contrato).
9. docs/business/BLOCO_6_RH_API.md: atualizar §5.2 (endpoint de decisão de contrato) para documentar termination_reason obrigatório e notice_modality como campo de entrada; verificar §6.1 (POST /termination-processes) quanto à consistência de termination_reason agora obrigatório também ali. NÃO toque em nenhuma outra seção do documento, nem em outros arquivos de docs/.

Reescreva o teste server/tests/unit/rh-contract-use-cases.test.ts:107-109 (hoje ele congela notice_modality: 'trabalhado' como literal fixo esperado, sem termination_reason no input) para: (a) incluir termination_reason e notice_modality no input da chamada sob teste; (b) afirmar que ambos são repassados ao createTerminationProcessUseCase.execute com toHaveBeenCalledWith exato ou objectContaining contendo as chaves — nunca objectContaining sem a chave, que passaria mesmo com o campo descartado (esse foi o vício do teste atual). Adicione testes novos cobrindo:
- Rejeição (400) quando termination_reason ou notice_modality ausentes em decision === 'rescindir'.
- Rejeição (400) quando termination_reason ausente em POST /termination-processes (simetria).
- Valor de termination_reason recuperável em GET /termination-processes/:id (integração, erp_evok_audio_test).
- Guardas estruturais continuam verdes: export-assignment-guard, model-association-attribute-guard, rh-validators.test.ts.
- Drift model × banco da coluna nova, com RUN_INTEGRATION=1 contra erp_evok_audio_test (tests/integration/schema-model-drift-guard.test.ts).
- payment_deadline e fluxo de conclude/ASO/checklist inalterados.
- Nenhuma asserção pré-existente das Falhas/guardas já aprovadas em outros casos deste módulo regride.

Documente em um REMEDIATION_EVIDENCE_PACKAGE.md novo dentro da worktree:
- causa-raiz de cada correção com arquivo:linha (antes e depois);
- as decisões aplicadas (APR-2026-057, P11-P15) citadas explicitamente;
- output REAL (não descrição) de: testes novos/atualizados do módulo rh, typecheck/build do server, e da migration rodando contra erp_evok_audio_test (nunca produção);
- registro explícito de que o item 3 do finding (409 vs 422) está fora do escopo, permanece NEEDS_MORE_EVIDENCE + decisão pendente (Q3a).

Ao terminar:
- Crie/atualize CASE_STATUS.md do caso na worktree, com STATUS: REMEDIATION_COMPLETE apenas se tudo estiver de fato corrigido e comprovado com output real.
- Commit na branch sana/ERP-LEGACY-001/CASE-012, não em main.
- Nunca escreva FINDING CLOSED nem RETEST_PASSED.
- Pare aguardando revisão/segunda opinião/reteste da VeriCore.
```

## 5. Registro

Este despacho **não declara** `RETEST_PASSED` nem `FINDING CLOSED` — essa
autoridade é exclusiva da VeriCore (Regras 3, 4). O item 3 do finding
original (status HTTP 409 vs 422 para "processo já aberto") está **fora do
escopo** deste despacho: o `vericore-finding-validator` o devolveu como
`NEEDS_MORE_EVIDENCE` e ele permanece bloqueado por decisão humana pendente
(Q3a, `TRIAGE.md` §6, ainda sem registro correspondente em
`coretriad/governance/APPROVALS.md`). Nenhuma alteração deste despacho toca
`CreateTerminationProcessUseCase.ts:62-65` quanto a esse status, nem os
textos §5.2/§6.1 de `BLOCO_6_RH_API.md` relativos a ele.

*Produzido por `sanacore-remediation-triage`. Nenhum arquivo fora de*
*`remediation/cases/ERP-LEGACY-001-CASE-012/` foi criado ou alterado. Nenhuma*
*conexão de banco foi aberta. Nada aqui declara `FINDING CLOSED`,*
*`RETEST_PASSED` ou `RISK_ACCEPTED`.*
