# remediation-response — ERP-LEGACY-001-CASE-002 / FIND-ERP-005

> Este documento **não altera** `docs/coretriad/projects/ERP-LEGACY-001/
> discovery/FIND-ERP-005.md`. O finding permanece como está, `STATUS: OPEN`,
> e só a VeriCore pode mudar isso (Regras 3 e 4 do `CLAUDE.md`). Este
> documento é a resposta formal da SanaCore, vinculada ao finding por
> referência, para handoff ao `coretriad-director` e daí à VeriCore.

CASE_ID: ERP-LEGACY-001-CASE-002
FINDING_ID: FIND-ERP-005
PROJECT_ID: ERP-LEGACY-001
RESPONDIDO_POR: SanaCore (`sanacore-remediation-triage` →
`sanacore-remediation-engineer` → `sanacore-remediation-evidence`)
AUTORIZAÇÃO DAS DECISÕES: `APR-2026-021` Parte B itens **3, 4 e 5**,
reafirmados por `APR-2026-022` (que também fixa o vínculo dos itens 3/4/5 a
este caso)
BRANCH: `sana/ERP-LEGACY-001/FIND-ERP-005` (não enviada — sem `push`)
EVIDÊNCIA COMPLETA: `remediation/cases/ERP-LEGACY-001-CASE-002/REMEDIATION_EVIDENCE_PACKAGE.md`

## O que a SanaCore fez

Corrigiu as 4 falhas do finding e o agravante estrutural (fail-open no gate
de alçada), seguindo item a item as decisões do dono:

| Decisão registrada | Ramo | Entrega |
|---|---|---|
| `APR-2026-021` B.3 — alçada = tabela configurável | A1 | `jur_approval_thresholds` + histórico + `approvalPolicy.ts` + 2 endpoints; literais removidos do domínio e do client |
| `APR-2026-021` B.4 — aditivo que eleva valor exige `approve` | B1 | `CreateContractAddendumUseCase.ts:131`, alimentado por `hasApprove(req)` server-side; `new_value` só com `change_type='value'`; reabertura de alçada com invalidação de aprovações |
| `APR-2026-021` B.5 — D-K vale para contrato jurídico | C1 | `D-K-JURIDICO` em `shared/domain/segregationOfDuties.ts`; `admin` não isenta; criador não aprova |

Evidência executada, não afirmada: **95/95** testes unitários no alvo,
**1996/1998** na suíte unitária completa (2 pré-existentes não
relacionadas), **20/20** na suíte de integração HTTP do caso contra
`erp_evok_audio_test`, e typecheck limpo em client e server.

## Correção de rota desta revisão (transparência)

A **v1** deste pacote declarou duas lacunas materiais. Uma era falsa:

- **`APR-2026-021` "não registrada" — ALARME FALSO, retratado.** Eu havia
  lido `coretriad/governance/APPROVALS.md` **do worktree**, que está
  congelado no corte da branch. No repositório principal as aprovações 021,
  022 e 023 existem. Registrei a armadilha metodológica no §0.1 do pacote de
  evidência: **o `coretriad/` de um worktree SanaCore não é fonte de verdade
  sobre aprovações** — consultar sempre o repositório principal.
- **Suíte de integração inoperante — REAL, e agora corrigida.** Eram 3
  defeitos de *fixture* (`signatory_type` em vez de `party_type`;
  `document_url`/`is_signed` em vez de `file_url`/`is_signed_version`;
  `activate` sem `responsible_user_id`, que por desenho não é persistido na
  criação). Nenhuma linha de código de produto foi alterada para fazer teste
  passar. Resultado: de 14 falhas para **20/20 passando**, e R1(b)(c),
  R2(a)-(d), R3(a)(b)(c)(e) e R4(a)-(d) ganham a prova dinâmica HTTP que o
  finding exigia.

## O que a SanaCore NÃO fez e não pode fazer

- **Não declara `RETEST_PASSED` nem `FINDING CLOSED`** — autoridade
  exclusiva VeriCore (Regra 4). Também não declara `RISK_ACCEPTED`.
- **Não aplicou a migration `20260814-000048` em `erp_evok_audio`** — é DDL
  em banco classificado PRODUÇÃO REAL (`APR-2026-016`, reafirmado em
  `APR-2026-021` Parte D). Por isso `cross-database-drift-guard` continua
  falhando, **corretamente**. **Depende de decisão humana:** quando aplicar
  — antes do merge, junto com ele, ou só no deploy.
- **Não levantou a contagem de perfis `diretor`/`financeiro:'operate'` em
  produção** (TRIAGE §3.3). No banco de teste é 0; a consulta em
  `erp_evok_audio` cabe ao dono.
- **Não ampliou escopo** para `purchases`/`comex`, que têm o mesmo padrão de
  truthiness da Falha 2 e são **módulos de PRODUÇÃO** — registrado para
  virar finding próprio, não silenciado.
- **Não corrigiu** as 7 falhas de integração alheias ao caso
  (`bom-tipo-nao-produtivo`, `traceability-and-audit-log-regression`) nem as
  2 unitárias pré-existentes: nenhum desses arquivos, nem o código de
  produto que eles exercitam, foi tocado por esta branch.

## Pedido ao coretriad-director / VeriCore

1. Decidir **quando** a migration entra em `erp_evok_audio` (único item
   deste caso que depende de ação humana para o guard voltar a verde).
2. Pedir ao dono a contagem de perfis `operate` em produção antes de
   promover o módulo.
3. Reteste independente de R1-R6 pela VeriCore contra o REMEDIATION_COMMIT,
   sem confiar apenas nas suítes da SanaCore — que existem, são versionadas
   e passam.
4. Avaliar abertura de finding próprio para `purchases`/`comex`.

## Status do caso (não é o status do finding)

`REMEDIATION_COMPLETE` e `READY_FOR_RETEST`. As lacunas remanescentes são de
**ação humana** (migration em banco real, contagem em produção), não de
implementação nem de evidência. Ver `CASE_STATUS.md`.
