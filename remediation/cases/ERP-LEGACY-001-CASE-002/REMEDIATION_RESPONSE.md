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
REMEDIATION_COMMIT: `54572b7c90a21faaba58ab198c30da26b96da581`
BRANCH: `sana/ERP-LEGACY-001/FIND-ERP-005`
EVIDÊNCIA COMPLETA: `remediation/cases/ERP-LEGACY-001-CASE-002/
REMEDIATION_EVIDENCE_PACKAGE.md`

## O que a SanaCore fez

Implementou correção para as 4 falhas do finding (thresholds hard-coded,
aprovação por presença de módulo, aditivo elevando valor sem reabrir alçada,
`admin` autoaprovando os dois lados), incluindo o agravante estrutural
(fail-open no gate de alçada). Escreveu 46 testes unitários determinísticos
e uma suíte de integração HTTP de 24 casos referenciando `FIND-ERP-005` e
`RF-JUR-003`. Atualizou `docs/business/BLOCO_3_JUR_API.md` para eliminar a
contradição §214×§233 e descrever o mecanismo real. Detalhe completo com
citação de arquivo:linha no `REMEDIATION_EVIDENCE_PACKAGE.md`.

## O que a SanaCore NÃO fez e não pode fazer

- **Não declara `RETEST_PASSED` nem `FINDING CLOSED`** — autoridade exclusiva
  VeriCore (Regra 4).
- **Não decidiu** se a alçada vem de tabela configurável ou de constante, se
  o aditivo exige `approve`, ou se a segregação D-K se estende ao criador do
  contrato — essas 3 decisões (TRIAGE §8) foram **implementadas como se
  tivessem sido tomadas** (Ramo A1 / B1 / C1), mas a autorização citada
  (`APR-2026-021`) **não está registrada** em `coretriad/governance/
  APPROVALS.md` no momento deste pacote. Ver §4 do `REMEDIATION_EVIDENCE_
  PACKAGE.md` — é o item que mais precisa de atenção do `coretriad-director`
  antes de qualquer reteste ser levado a sério.
- **Não corrigiu** o defeito de fixture que impede a suíte de integração
  HTTP de rodar de verdade (`signatory_type` → deveria ser `party_type` em
  `jur-contract-authority-find-erp-005.test.ts:103`) — está fora do escopo
  de escrita deste agente (empacotador de evidência, não engenheiro).
- **Não aplicou** a migration no banco de desenvolvimento/produção
  (`erp_evok_audio`) — só em `erp_evok_audio_test`, por restrição de
  segurança (`APR-2026-016`).
- **Não confirmou** quantos perfis reais de produção têm `diretor`/
  `financeiro:'operate'` (pedido explícito da TRIAGE §3.3) — só consultou o
  banco de teste (0 perfis lá, o que não responde pela produção).

## Pedido explícito à VeriCore / coretriad-director

1. Resolver a lacuna de `APR-2026-021` antes de aceitar a evidência das
   Falhas 1 e 3 como coberta por decisão humana válida.
2. Reproduzir R1-R6 de forma independente (não confiar nos 46 testes
   unitários da SanaCore para R2/R3/R4 — o próprio finding diz que essas
   falhas são invisíveis a teste sem HTTP real).
3. Decidir se o defeito de fixture volta para a SanaCore corrigir antes do
   reteste, ou se a VeriCore prefere escrever sua própria prova dinâmica.

## Status do caso (não é o status do finding)

`REMEDIATION_COMPLETE` no sentido de "código, testes e documentação
entregues, worktree pronta para inspeção" — **com as ressalvas acima**, que
tornam este pacote `READY_FOR_RETEST COM LACUNAS DECLARADAS`, não um "PASS"
antecipado. Ver `CASE_STATUS.md` neste mesmo diretório para o registro
formal de estado.
