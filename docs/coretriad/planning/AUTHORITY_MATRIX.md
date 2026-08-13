# AUTHORITY_MATRIX.md — Etapa 5

**Status:** Modelo de autoridade proposto. Nenhuma permissão foi implementada a partir
deste documento — implementação é `PERMISSION_MODEL.md` + fase posterior.

Colunas: **READ** (pode ler o artefato/objeto) · **WRITE** (pode escrever) ·
**RECOMMEND** (pode sugerir sem poder de veto) · **APPROVE** (pode aprovar formalmente) ·
**BLOCK** (pode impedir avanço) · **ESCALATE** (pode/deve escalar a humano) ·
**CLOSE** (pode encerrar o item — finding, PR, release).

## 1. Por organização, sobre o quê

| Organização | Objeto | READ | WRITE | RECOMMEND | APPROVE | BLOCK | ESCALATE | CLOSE |
|---|---|---|---|---|---|---|---|---|
| **OpusCore** | Código-fonte (`server/`, `client/`, `mobile/`, `tv/`) | ✅ | ✅ | ✅ | ✅ (PR interno, nunca release em prod) | ✅ (code review) | ✅ | ❌ (release fecha só com gate humano) |
| **OpusCore** | Relatório/finding de auditoria (`audit/runs/**`) | ✅ | ❌ | ✅ (contestar achado com evidência) | ❌ | ❌ | ✅ | ❌ |
| **OpusCore** | `remediation/**` (enquanto atua como SanaCore, §8.4) | ✅ | ✅ (só dentro de worktree próprio) | ✅ | ❌ | ❌ | ✅ | ❌ |
| **VeriCore** | Código-fonte do objeto auditado | ✅ | ❌ (read-only por desenho) | ✅ | ❌ | ✅ (recomendação de bloqueio de release) | ✅ | ❌ |
| **VeriCore** | `audit/runs/<AUDIT_ID>/**` | ✅ | ✅ (só os agentes de governança listados no Master Spec §11) | ✅ | ✅ (finding-validator confirma/refuta) | ✅ | ✅ (CRITICAL, fraude, vazamento — imediato) | ✅ (só via RETEST_PASSED, nunca por outro motivo) |
| **VeriCore** | `remediation/**` | ✅ (para reteste) | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **SanaCore*** | Remediation Backlog aprovado | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **SanaCore*** | Código-fonte do item em correção | ✅ | ✅ (só dentro do worktree `sana/<PROJECT>/<FINDING>`) | ✅ | ❌ | ❌ | ✅ | ❌ (nunca fecha o próprio finding — Regra 3 do CLAUDE.md) |
| **SanaCore*** | `audit/runs/**` | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

`*` SanaCore ainda sem agentes próprios — linhas acima são o desenho-alvo, exercitado
hoje por OpusCore no papel (ver `GAP_ANALYSIS.md`).

## 2. Autoridade sobre a Constituição e o processo

| Quem | Sobre o quê | Autoridade |
|---|---|---|
| Qualquer agente | `CORETRIAD_MASTER_SPEC.md` (princípios) | Só **RECOMMEND** uma Emenda — nunca **WRITE** direto no documento sem aprovação humana registrada (§14 da Constituição) |
| `software-audit-director` | Escopo/plano de uma auditoria específica | **APPROVE** internamente antes do gate humano; **ESCALATE** sempre que houver CRITICAL |
| Orquestrador (sessão principal/humano) | Todos os gates explícitos do fluxo (§2.2 do Master Spec) | **APPROVE** final em todo gate humano; único que pode atribuir `RISK_ACCEPTED` |

## 3. Regra dura (não é matriz, é veto absoluto)

Nenhuma célula acima pode ser lida como "e se a mesma pessoa acumular dois papéis": as
colunas valem POR ORGANIZAÇÃO, e a regra de segregação (`CORETRIAD_MASTER_SPEC.md` §2.1)
proíbe que o mesmo agente ocupe células de mais de uma organização no MESMO ciclo
Constrói→Audita→Remedia→Retesta de um item. Isso não é enforcement técnico ainda — ver
`PERMISSION_MODEL.md` para o que falta implementar (hooks) para tornar isso automático em
vez de apenas documental.
