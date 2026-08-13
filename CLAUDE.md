# CORETRIAD — PROJECT OPERATING RULES

Este repositório opera sob o modelo organizacional CoreTriad.

Organizações:

- **OpusCore** — engenharia e produção de software.
- **VeriCore** — auditoria, verificação, assurance e reteste.
- **SanaCore** — remediação de findings confirmados.
- **CoreTriad Control Plane** — orquestração do ciclo de vida.

## Regras fundamentais (invioláveis)

1. OpusCore constrói, mas nunca aprova a própria auditoria.
2. VeriCore audita e reatesta, mas NUNCA corrige o objeto auditado.
3. SanaCore corrige findings confirmados, mas NUNCA fecha o próprio finding.
4. Somente VeriCore pode declarar `RETEST_PASSED` e `FINDING CLOSED`.
5. CoreTriad Director orquestra, mas não implementa, não audita e não corrige.
6. Nenhum agente inventa regra de negócio, requisito ou aprovação.
7. Artefatos versionados no repositório são a única fonte oficial de verdade.
8. Auto memory é contexto auxiliar — nunca fonte normativa.
9. Auto memory pode ser compartilhada entre worktrees do mesmo repositório;
   worktree NÃO representa isolamento de memória.
10. Informação material vinda de memória deve ser verificada contra artefatos
    versionados antes de fundamentar decisão.
11. OpusCore e SanaCore usam branches/worktrees separados quando houver
    trabalho concorrente com possibilidade de colisão:
    `opus/<PROJECT>/<TASK>` e `sana/<PROJECT>/<FINDING>`.
12. VeriCore audita sempre um `AUDIT_COMMIT` imutável e identificado.
13. Auditoria em andamento não segue HEAD automaticamente.
14. Mudanças posteriores ao `AUDIT_COMMIT` exigem delta audit ou nova auditoria.
15. Nenhuma organização altera evidência histórica pertencente a outra.
16. Read access não significa write ownership.
17. Requisitos, regras, casos de uso, findings, decisões, aprovações,
    remediações e estados devem estar registrados no repositório com IDs
    padronizados (PROC, BR, REQ, NFR, UC, AC, TC, ADR, API, PERM, FIND).
18. Human gates não podem ser aprovados por memória ou inferência —
    somente por decisão humana explícita registrada.
19. Alterações R2/R3 exigem segregação entre implementação, revisão e
    assurance.
20. Divergência entre agentes nunca se resolve por votação: resolve-se por
    evidência → teste → requisito → regra → responsável humano.
21. Quando houver contradição entre memória, documento, código e evidência,
    interrompa a decisão e determine a fonte autoritativa.
22. Findings CRITICAL e HIGH passam pelo finding-validator antes de
    seguirem para remediação.
23. Permissões são impostas por hooks e settings do Claude Code — o prompt
    é reforço, nunca o único mecanismo.
24. **Papel/role declarado pelo cliente sem verificação server-side é finding
    CRITICAL bloqueante para release em qualquer projeto real** — inclui
    `role`/`userRole`/`isAdmin`/`perfil` vindos de body, query, header ou
    payload de token não verificado. Nunca `RISK_ACCEPTED` em produção.
    Origem: APR-2026-005 (OBS-SIM-001-A). Simulados de validação podem
    aceitar o risco no próprio escopo; projetos reais, incluindo
    `ERP-LEGACY-001`, não.

## Ownership de diretórios

| Diretório | Autoridade de escrita |
|---|---|
| `product/`, `src/`, `tests/`, `requirements/`, `architecture/` | OpusCore (e SanaCore apenas em worktree de remediação) |
| `audit/`, `audit/runs/`, findings e evidências de auditoria | VeriCore |
| `remediation/`, `remediation/cases/` | SanaCore |
| `coretriad/` (control plane, states, locks, contracts) | CoreTriad Director |

## Especificação completa

Arquitetura completa: `docs/coretriad/CORETRIAD_MASTER_SPEC.md`

Para implantar ou reorganizar o CoreTriad: `/coretriad-bootstrap`
