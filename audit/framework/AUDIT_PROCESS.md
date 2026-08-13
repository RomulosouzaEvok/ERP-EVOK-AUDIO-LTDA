# VeriCore — Processo de Auditoria e Assurance de Software

## 1. Princípio fundamental

A auditoria verifica simultaneamente:

- o que o negócio determinou;
- o que foi documentado;
- o que deveria ter sido desenvolvido;
- o que efetivamente foi desenvolvido;
- o que foi testado;
- o que está protegido;
- o que está operando;
- o que possui evidência e rastreabilidade;
- o que está divergente entre essas fontes.

Cadeia fundamental de rastreabilidade:

```
OBJETIVO DE NEGÓCIO → PROCESSO → REGRA DE NEGÓCIO → REQUISITO → CASO DE USO
→ CRITÉRIO DE ACEITE → NFR → ARQUITETURA → IMPLEMENTAÇÃO → BANCO/API/INTEGRAÇÕES
→ TESTE → SEGURANÇA → AUDIT LOG → OPERAÇÃO → EVIDÊNCIA
```

Qualquer elo inexistente, inconsistente, incorreto ou sem rastreabilidade pode gerar um finding.

## 2. Regra de ouro

Todo agente auditor trabalha em modo:

```
READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT
```

Nunca em modo `READ → FIND → MODIFY`. Durante uma auditoria, agentes auditores:

- não corrigem código;
- não refatoram;
- não alteram requisitos, banco ou documentação auditada;
- não fazem deploy;
- não escondem problemas encontrados.

Correção pertence a uma fase posterior: **REMEDIATION**. Depois da correção existe: **RETEST**.

## 3. Segregação organizacional

```
AI SOFTWARE ENGINEERING ORGANIZATION
├── DEVELOPMENT ORGANIZATION      (.claude/agents/*.md — não tocado por este pacote)
├── AUDIT & ASSURANCE ORGANIZATION (.claude/agents/audit/*.md — este pacote)
└── REMEDIATION ORGANIZATION       (agentes de desenvolvimento, acionados só após o relatório)
```

Fluxo:

```
IMPLEMENTADOR → AUDITOR → VALIDADOR DO FINDING → RESPONSÁVEL HUMANO → REMEDIAÇÃO → RETESTE
```

Regra dura: **um agente que implementou uma funcionalidade não pode ser o único agente que audita e aprova essa mesma funcionalidade.**

## 4. Ciclo de vida de uma auditoria

1. **Scope** (`audit-scope-agent`) — registra AUDIT_ID, repositório, commit, exclusões, ambiente, auditores. Gate: nenhum trabalho técnico começa sem escopo registrado.
2. **Inventory** — inventário automático de linguagens, frameworks, módulos, controllers, services, repositories, banco, APIs, testes, CI/CD, infraestrutura, dependências → `SYSTEM_INVENTORY.md` e `SYSTEM_MAP.md`.
3. **Plan** (`audit-planning-agent` + `software-audit-director`) — distribui domínios entre os agentes especialistas, com profundidade proporcional ao risco → `AUDIT_PLAN.md`. Gate: aprovação humana do plano/escopo antes do fieldwork.
4. **Fieldwork** — trilhas paralelas (produto/negócio, documentação, arquitetura, engenharia, dados, segurança, qualidade, plataforma/operação, integrações, IA quando aplicável) produzindo findings com evidência.
5. **Cross-audit / segunda opinião** (opcional, ver `CLAUDE_CODEX_CROSS_REVIEW.md`) — segunda engine audita de forma independente antes de saber a conclusão da primeira.
6. **Validation** (`finding-validator`) — tenta refutar cada finding CRITICAL/HIGH antes de aceitá-lo.
7. **Consolidation** (`audit-consolidator`) — deduplica, agrupa, prioriza.
8. **Reporting** (`audit-reporting-agent`) — produz Relatório Executivo, Relatório Técnico e Remediation Backlog. Gate: aprovação humana antes da entrega ao cliente/stakeholder.
9. **Remediation** — equipe de desenvolvimento corrige (fora da Audit Organization).
10. **Retest** — reteste independente de cada finding corrigido antes de fechar. Gate: só um humano autorizado pode marcar `RISK_ACCEPTED`.

## 5. Acesso dos auditores

Por padrão: **read-only** (`Read, Grep, Glob`). Um pequeno número de agentes de governança (director, planning, scope, evidence-controller, consolidator, finding-validator, reporting-agent, traceability-auditor, documentation-audit-lead) recebe `Write` — mas apenas para produzir artefatos de auditoria dentro de `audit/runs/<AUDIT-ID>/`, nunca para alterar o objeto auditado.

Se for necessário executar testes/comandos diagnósticos não destrutivos durante a auditoria, isso deve passar por um agente dedicado e com permissão controlada (`audit-verification-runner` — não incluído por padrão neste pacote; crie-o explicitamente se precisar, seguindo o mesmo princípio de least privilege).

## 6. Snapshot de auditoria (reprodutibilidade)

Toda auditoria deve registrar, em `audit/runs/<AUDIT-ID>/00-scope/`:

```
AUDIT_ID / REPOSITORY / BRANCH / COMMIT_HASH / VERSION / DATE / SCOPE / EXCLUSIONS / ENVIRONMENT / AUDITORS
```

## 7. Aviso importante

Este framework (conteúdo, papéis, gates) é independente de ferramenta. A codificação exata em subagentes do Claude Code (frontmatter `name`/`description`/`tools`/`model`) segue o formato conhecido no treinamento — **confirme a sintaxe atual em `docs.claude.com/en/docs/claude-code` antes de depender disso**, especialmente valores aceitos em `tools`/`model` e onde os subagentes devem residir.
