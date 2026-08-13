# HANDOFF_CONTRACTS.md — Etapa 7

**Status:** Formalização dos artefatos que atravessam fronteira de organização. Nenhum
destes é gerado automaticamente ainda — os campos abaixo são o contrato-alvo para
quando `docs/control-plane/tasks/` passar a carregá-los estruturadamente.

## 1. IDEA_PACKET

**De:** humano → CoreTriad (orquestrador) → OpusCore/product-manager
**Quando:** início do ciclo (`STATE_MACHINE.md` estado 1)

| Campo | Obrigatório | Descrição |
|---|---|---|
| `titulo` | sim | Nome curto da ideia |
| `problema` | sim | Que problema de negócio resolve |
| `proponente` | sim | Quem pediu (humano) |
| `restricoes_conhecidas` | não | Prazo, orçamento, dependência já sabida |

## 2. PRODUCT_DEFINITION_PACKAGE

**De:** product-manager/business-analyst/product-designer → tech-lead
**Quando:** fim de `ARCHITECTURE`, início de `IN_DEVELOPMENT`

| Campo | Obrigatório | Descrição |
|---|---|---|
| `prd_ref` | sim | Caminho do PRD em `docs/project-memory/product/` |
| `requisitos` | sim | Lista de REQ-ID |
| `regras_de_negocio` | sim | Lista de BR-ID |
| `casos_de_uso` | sim | Lista de UC-ID |
| `adr_ref` | sim | ADR(s) de arquitetura aprovados |
| `aprovacao_gate1` | sim | Registro do gate humano (data + aprovador) |

## 3. SOFTWARE_RELEASE_PACKAGE

**De:** OpusCore (tech-lead consolida) → VeriCore
**Quando:** fim de `IN_DEVELOPMENT`, início de `READY_FOR_AUDIT`

| Campo | Obrigatório | Descrição |
|---|---|---|
| `commit_hash` | sim | Vira o `AUDIT_COMMIT` (imutável, Regra 11/12) |
| `branch` | sim | |
| `prs_incluidos` | sim | Lista de PRs mergeados neste release |
| `escopo_funcional` | sim | O que mudou, em linguagem de negócio |
| `testes_executados` | sim | Resultado real (não alegado) de unit+integration |
| `riscos_conhecidos` | não | Qualquer limitação já sabida pelo time que construiu |

## 4. AUDIT_INTAKE_PACKAGE

**De:** VeriCore (audit-scope-agent) → uso interno de VeriCore
**Quando:** início de `IN_AUDIT`

Já implementado na prática — é exatamente o formato de
`audit/runs/<AUDIT_ID>/00-scope/SCOPE.md` (`AUDIT_ID`, `REPOSITORY`, `BRANCH`,
`COMMIT_HASH`, `VERSION`, `DATE`, `SCOPE`, `EXCLUSIONS`, `ENVIRONMENT`, `AUDITORS`).

## 5. FINDING

**De:** qualquer agente especialista de VeriCore → finding-validator/audit-consolidator
**Quando:** durante `IN_AUDIT`

Já implementado — `audit/templates/FINDING_TEMPLATE.md` (`FINDING_ID`, `TITLE`, `DOMAIN`,
`SEVERITY`, `CONFIDENCE`, `STATUS`, `DESCRIPTION`, `EXPECTED_BEHAVIOR`,
`ACTUAL_BEHAVIOR`, `EVIDENCE`, `RELATED_*`, `*_IMPACT`, `REPRODUCTION`,
`RECOMMENDATION`, `SUGGESTED_OWNER`, `RETEST_REQUIRED`).

## 6. REMEDIATION_CASE

**De:** audit-reporting-agent (dentro do Remediation Backlog) → SanaCore
**Quando:** transição `FINDINGS_CONFIRMED` → `IN_REMEDIATION`, depois do gate humano

| Campo | Obrigatório | Descrição |
|---|---|---|
| `finding_ids` | sim | Um ou mais FINDING_ID relacionados (mesma causa raiz) |
| `prioridade` | sim | Do Backlog, não inventada por SanaCore |
| `worktree` | sim | `sana/<PROJECT>/<FINDING>` (ver `WORKTREE_MODEL.md`) |
| `criterio_de_retest` | sim | O que precisa ser verdade para o reteste passar |
| `aprovacao_backlog` | sim | Registro do gate humano que liberou este item |

## 7. REMEDIATION_EVIDENCE_PACKAGE

**De:** SanaCore → VeriCore (via `docs/control-plane/tasks/`)
**Quando:** fim de `IN_REMEDIATION`, início de `READY_FOR_RETEST`

| Campo | Obrigatório | Descrição |
|---|---|---|
| `finding_ids` | sim | Quais findings este pacote alega corrigir |
| `commit_hash` | sim | Commit da correção (branch/worktree de SanaCore) |
| `mudanca_resumo` | sim | O que mudou, escopo mínimo |
| `self_test_resultado` | sim | Resultado da suíte rodada por SanaCore (não substitui o reteste) |
| `blast_radius` | sim | O que mais pode ter sido afetado pela correção |

## 8. RETEST_REPORT

**De:** VeriCore (agente de reteste, diferente do finding original e de SanaCore) → humano
**Quando:** fim de `IN_RETEST`

| Campo | Obrigatório | Descrição |
|---|---|---|
| `finding_ids` | sim | |
| `reproduziu_o_problema_original` | sim | VeriCore reproduz de novo, não confia só no self-test de SanaCore |
| `veredito` | sim | `RETEST_PASSED` ou reabertura, com motivo |
| `evidencia` | sim | Comando/saída, não alegação |

## 9. RELEASE_ASSURANCE_PACKAGE

**De:** release-agent (OpusCore) → humano
**Quando:** fim de `READY_FOR_RELEASE`, antes do gate humano final

| Campo | Obrigatório | Descrição |
|---|---|---|
| `release_notes` | sim | |
| `checklist_readiness` | sim | |
| `findings_status` | sim | Todos CLOSED ou RISK_ACCEPTED — nenhum aberto sem justificativa |
| `plano_rollback` | sim | |
