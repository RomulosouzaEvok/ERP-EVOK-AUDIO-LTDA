# CASE_STATUS — ERP-LEGACY-001-CASE-002 (FIND-ERP-005)

CASE_ID: ERP-LEGACY-001-CASE-002
FINDING_ID: FIND-ERP-005
PROJECT_ID: ERP-LEGACY-001

## Linha do tempo do caso

| Estado | Quando | Por quem |
|---|---|---|
| `REMEDIATION_CASE` recebido | 2026-08-14 | `coretriad-director` → SanaCore (`APR-2026-020` Decisão B) |
| Triagem concluída (causa-raiz, blast radius, plano, 3 perguntas ao dono) | 2026-08-14 | `sanacore-remediation-triage` |
| Implementação (código + testes de regressão + doc) | 2026-08-14 | `sanacore-remediation-engineer` (commits `67b49fb`..`54572b7`) |
| Empacotamento de evidência (este documento) | 2026-08-14 | `sanacore-remediation-evidence` |

## Estado atual

**`REMEDIATION_COMPLETE`** — código, migration, testes e documentação
entregues no worktree/branch `sana/ERP-LEGACY-001/FIND-ERP-005`, commit
`54572b7c90a21faaba58ab198c30da26b96da581`.

**`READY_FOR_RETEST` — COM LACUNAS DECLARADAS, não "limpo".** Duas lacunas
têm peso suficiente para que a VeriCore possa razoavelmente decidir não
iniciar o reteste sem resolvê-las primeiro:

1. A suíte de integração HTTP do próprio caso (24 testes, a única prova
   dinâmica desenhada para R1(b)(c)/R2/R3/R4) falha 14/14 por um defeito de
   fixture de teste (campo `signatory_type` deveria ser `party_type`) — não
   é falha do código de produção corrigido.
2. `APR-2026-021`, citada pervasivamente como a autorização das decisões que
   desbloquearam as Falhas 1 e 3, **não está registrada** em
   `coretriad/governance/APPROVALS.md`.

Detalhe completo, com evidência de comando/arquivo/linha para cada item:
`REMEDIATION_EVIDENCE_PACKAGE.md` (§4 e §5.4) e `REMEDIATION_RESPONSE.md`
neste mesmo diretório.

## O que NÃO foi declarado (proibido à SanaCore)

- `RETEST_PASSED` — não declarado.
- `FINDING CLOSED` — não declarado.
- `RISK_ACCEPTED` — não declarado (e não seria papel da SanaCore decidir).
- Nenhuma edição foi feita em
  `docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-005.md` nem em
  `remediation/cases/ERP-LEGACY-001-CASE-002/TRIAGE.md` por este agente.

## Próximo passo

Devolução ao `coretriad-director`, que decide o roteamento — incluindo se a
lacuna de `APR-2026-021` e o defeito de fixture voltam primeiro para a
SanaCore antes de acionar a VeriCore, ou se seguem para a VeriCore com as
lacunas explicitamente declaradas para reteste independente resolver.
