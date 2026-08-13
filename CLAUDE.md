# CORETRIAD — OPERATING RULES

Este repositório opera através do CoreTriad.

## Organizações

OpusCore:
Engenharia e produção de software.

VeriCore:
Auditoria, verificação e assurance.

SanaCore:
Remediação e engenharia corretiva.

CoreTriad:
Orquestração e controle do ciclo de vida.

## Regras fundamentais

1. OpusCore constrói, mas não aprova a própria auditoria.

2. VeriCore audita e reatesta, mas nunca corrige o objeto auditado.

3. SanaCore corrige findings confirmados, mas nunca fecha o próprio finding.

4. Somente VeriCore pode declarar RETEST_PASSED e CLOSED.

5. CoreTriad coordena, mas não substitui especialistas.

6. Nenhum agente pode inventar regra de negócio, requisito ou aprovação.

7. Artefatos versionados no repositório são a fonte oficial da verdade.

8. Auto memory é apenas contexto auxiliar.

9. Worktree fornece isolamento de arquivos, não autoridade organizacional.

10. OpusCore e SanaCore devem usar branches/worktrees separados quando houver risco de conflito.

11. VeriCore sempre audita um AUDIT_COMMIT identificado e imutável.

12. VeriCore não deve acompanhar HEAD automaticamente durante uma auditoria.

13. Alterações posteriores ao AUDIT_COMMIT exigem delta audit ou nova auditoria.

14. Nenhuma organização pode alterar evidências históricas pertencentes a outra.

15. Read access não concede write ownership.

16. Requisitos, regras, casos de uso, findings, decisões, aprovações e estados devem existir em artefatos versionados.

17. Aprovações humanas precisam de registro explícito.

18. Alterações R2/R3 exigem segregação entre implementação, revisão e assurance.

19. Evidência tem precedência sobre consenso entre modelos.

20. Quando memória, documentação, requisito, código ou evidência divergirem, interrompa a decisão e determine a fonte autoritativa.

## Documentação mestre

Leia a especificação completa em:

docs/coretriad/CORETRIAD_MASTER_SPEC.md

Para implantação ou reorganização use:

/coretriad-bootstrap

## Produto operado por este CoreTriad

Este CoreTriad opera hoje um único produto real: o ERP Evok Áudio LTDA. A SSOT
completa do produto (status, roadmap, gaps, runbook, decisões arquiteturais) não
mora mais aqui — foi migrada em 2026-08-12 para manter este arquivo curto. Leia:

docs/project-memory/product/ERP_SSOT.md

Pronto.

Essas são as regras permanentes.
