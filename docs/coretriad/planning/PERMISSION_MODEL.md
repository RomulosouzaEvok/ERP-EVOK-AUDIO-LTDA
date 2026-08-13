# PERMISSION_MODEL.md — Etapa 10

**Status:** Desenho de permissões. Nada abaixo foi implementado ainda (nenhum hook,
nenhuma mudança em `.claude/settings.local.json` a partir deste documento) — é a
etapa 10 do bootstrap, que só projeta; implementação é fase posterior do
`IMPLEMENTATION_PLAN.md`, deliberadamente em "modo conservador" (passo 16 do plano de
implantação do usuário).

## O problema real que este modelo resolve (achado de hoje, não hipotético)

1. `tools:` no frontmatter de cada agente restringe por **nome de ferramenta**
   (Read/Write/Edit/Bash/Grep/Glob) — isso funciona e já é real: os 62 agentes de
   VeriCore sem `Write` genuinamente não conseguem editar nada.
2. `.claude/settings.local.json` (`allow`/`deny`) vale para a **sessão inteira**, não
   por organização — já causou um incidente real hoje (uma regra de `deny` pensada só
   para VeriCore quase bloqueou OpusCore de escrever código).
3. **Nenhum dos dois mecanismos restringe por CAMINHO por organização.** Um agente de
   OpusCore com `Write` pode, tecnicamente, escrever dentro de `audit/runs/**` ou
   `remediation/**` sem nenhum bloqueio automático — só o "Não pode" escrito no arquivo
   do agente impede isso, e isso é documentação de intenção, não controle técnico.

## Modelo em 3 camadas

### Camada 1 — Tools por agente (já implementada, manter)

Continuar usando `tools:` no frontmatter como primeira linha de defesa: VeriCore
permanece sem Write/Edit por padrão (só os 9 agentes de governança + traceability têm
Write, e só dentro de `audit/runs/`).

### Camada 2 — `.claude/settings.local.json` (já implementada, usar com cuidado)

Regras `deny` genéricas e SEGURAS para toda a sessão (não específicas de uma
organização): `Bash(*rm -rf*)`, `Bash(*drop table*)`, `Bash(*drop database*)`,
`Read(./.env)`, etc. — coisas que NENHUMA organização deveria fazer, nunca regras que
dependam de "só bloquear X para o agente Y", porque isso não é o que esse arquivo faz.

### Camada 3 — Hooks (NÃO implementada ainda — é o que falta de verdade)

Único mecanismo real capaz de aplicar restrição **por caminho E por identidade de
agente** simultaneamente. Desenho proposto (a implementar na fase de guardrails do
`IMPLEMENTATION_PLAN.md`):

```
PreToolUse hook (Write, Edit) verifica:
  - Se o agente ativo pertence a VeriCore → BLOQUEIA qualquer Write/Edit
    (redundante com a Camada 1, mas defesa em profundidade)
  - Se o agente ativo pertence a SanaCore → permite Write/Edit SOMENTE dentro de
    remediation/** ou do worktree sana/<PROJECT>/<FINDING> declarado ativo
  - Se o agente ativo pertence a OpusCore → permite Write/Edit em server/**, client/**,
    mobile/**, tv/**, mas BLOQUEIA audit/runs/** e remediation/** (exceto quando
    atuando explicitamente no papel de SanaCore, §8.4 do Master Spec — registrar essa
    exceção de forma auditável, não silenciosa)
```

Isso é exatamente o que os Testes B e C do plano de implantação do usuário (passo 17)
vão expor se rodados HOJE: sem esta Camada 3, "SanaCore marca finding como CLOSED" e
"OpusCore altera relatório de auditoria" não são tecnicamente bloqueados — só
documentalmente desencorajados.

## Diretórios de leitura e escrita (alvo)

| Organização | READ | WRITE |
|---|---|---|
| OpusCore | Tudo | `server/**`, `client/**`, `mobile/**`, `tv/**`, `docs/project-memory/**` (parte que produz) |
| VeriCore | Tudo | `audit/runs/<AUDIT_ID>/**` apenas (9 agentes de governança); os outros 60, nada |
| SanaCore | Tudo | `remediation/**` + worktree `sana/<PROJECT>/<FINDING>` apenas |

## Comandos bloqueados (candidatos, camada 2)

Já em vigor: `rm -rf`, `drop table`, `drop database`, `terraform apply`,
`deploy*prod*`, `kubectl*--context=prod*`. Candidatos a adicionar quando SanaCore
existir: qualquer comando de `git push --force` para `main`/branches protegidas
executado por agente (não por humano).

## Operações que exigem humano (já em vigor, listar aqui para consolidar)

- Aprovação de escopo/plano de auditoria (`/audit-new`)
- Confirmação de findings CRITICAL/HIGH (`finding-validator` decide tecnicamente, mas
  discordância/exceção é sempre humana)
- Entrega de relatório final a qualquer stakeholder
- `RISK_ACCEPTED`
- Deploy em produção (gate humano final do fluxo OpusCore)
- Qualquer Emenda à Constituição (`CORETRIAD_MASTER_SPEC.md` §14)
