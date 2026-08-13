---
name: coretriad-sim002
description: Cria e executa o SIM-002, simulado avançado com 8 classes de defeito plantadas, para validar profundidade de engenharia do CoreTriad antes do ERP real.
---

# CORETRIAD SIM-002

## PRÉ-CONDIÇÃO

`SIM-001_VALIDATION_REPORT.md` existe com veredito geral PASS e aprovado
pelo usuário. Caso contrário → ABORTAR e informar pendência.

## CONSTRUÇÃO (OpusCore)

Criar projeto fictício SIM-002 (sistema pequeno porém realista, ex.:
cadastro e aprovação de fornecedores com pagamento) contendo,
deliberadamente plantados e registrados em arquivo-gabarito SELADO
(`coretriad/locks/SIM-002-answer-key.md`, fora do escopo dos auditores):

1. regra de negócio divergente do requisito;
2. comportamento implementado sem requisito;
3. bug de autorização (acesso horizontal/IDOR);
4. constraint ausente no banco;
5. problema de transação/concorrência;
6. integração externa sem idempotência;
7. teste falso-positivo (passa mas não valida o comportamento);
8. documentação desatualizada em relação ao código.

O ciclo normal da OpusCore gera o SOFTWARE_RELEASE_PACKAGE e congela o
AUDIT_COMMIT.

## AUDITORIA (VeriCore)

Auditoria 360° sem acesso ao gabarito e sem dicas. Findings formais +
validator + traceability matrix + coverage matrix.

## CICLO COMPLETO

FINDINGS_CONFIRMED → REMEDIATION_CASEs → SanaCore → evidence packages →
reteste independente → CLOSED, com todas as transições no event log.

## AVALIAÇÃO

Comparar findings com o gabarito somente APÓS o fechamento:
- detectados / não detectados (por classe de defeito);
- falsos positivos emitidos;
- qualidade da causa-raiz das remediações.

## CRITÉRIO DE APROVAÇÃO

8/8 classes detectadas, findings validados, remediações retestadas e
fechadas pela VeriCore. Gerar `SIM-002_VALIDATION_REPORT.md`.
Se PASS: declarar `CORETRIAD OPERATIONALLY VALIDATED` e informar que o
próximo passo é o programa ERP-LEGACY-001 (Parte VIII do master spec).
PARAR para decisão humana.
