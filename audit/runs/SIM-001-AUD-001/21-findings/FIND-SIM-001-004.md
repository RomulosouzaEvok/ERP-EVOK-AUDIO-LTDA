# FINDING

FINDING_ID: FIND-SIM-001-004
AUDIT_ID: SIM-001-AUD-001
PROJECT_ID: SIM-001
AUDIT_COMMIT: b736a1e733f802735b1b79348e3c6cc084bd466e
TITLE: listBookings sem política de autorização documentada e sem escopo de dados — expõe userId e price de terceiros
DOMAIN: security / product-definition
SUBDOMAIN: data exposure / missing authorization policy
SEVERITY: MEDIUM
CONFIDENCE: CONFIRMED
STATUS: PROPOSED
DETECTED_BY: authorization auditor (dedup pelo evidence-controller)

DESCRIPTION:
`listBookings` (`product/SIM-001/src/bookingService.js` L110-118) retorna os
objetos de reserva completos (incluindo `userId` e `price` de reservas de
terceiros) para qualquer chamador, sem qualquer política de autorização
documentada e sem escopo/minimização de dados. REQ-SIM-004
(`product/SIM-001/requirements/REQUIREMENTS.md` L44-52) não define política de
acesso, e a AUTHORIZATION_MATRIX do release (`product/SIM-001/SOFTWARE_RELEASE_PACKAGE.md`)
cobre apenas o cancelamento. Este comportamento alimenta a exploração do
FIND-SIM-001-001: a listagem entrega os `bookingId` e `userId` alheios que
tornam trivial o cancelamento não autorizado.

NOTA: requer decisão de produto — candidato a backlog, não a remediação
imediata neste ciclo. A política de autorização/escopo de dados de listagem
deve ser documentada (REQ/PERM) antes de qualquer remediação de código.

EXPECTED_BEHAVIOR: Política explícita definindo quem pode listar e quais campos são retornados (minimização de dados) — hoje inexistente.
ACTUAL_BEHAVIOR: Qualquer chamador obtém objetos completos de reservas ativas da sala, incluindo dados de terceiros.

EVIDENCE:
FILE: product/SIM-001/src/bookingService.js
LINES: 110-118 (retorno dos objetos completos sem filtro de campos nem verificação de chamador)
FILE: product/SIM-001/requirements/REQUIREMENTS.md
LINES: 44-52 (REQ-SIM-004 sem política de acesso)

RELATED_PROCESS: consulta de reservas
RELATED_BUSINESS_RULE: — (lacuna: nenhuma BR de acesso a dados de listagem)
RELATED_REQUIREMENT: REQ-SIM-004
RELATED_USE_CASE: —
RELATED_ACCEPTANCE_CRITERIA: AC-SIM-004 (não trata autorização/escopo)
RELATED_TEST: TC-SIM-004 (não cobre autorização/escopo)

BUSINESS_IMPACT: Exposição de dados de reservas (quem reservou, por quanto) a qualquer usuário.
TECHNICAL_IMPACT: Ausência de definição impede teste de conformidade — não há oráculo.
SECURITY_IMPACT: Vazamento de dados de terceiros; facilita a exploração do FIND-SIM-001-001 (enumeração de bookingId/userId).

REPRODUCTION: `listBookings('room-a')` retorna array com objetos contendo `userId` e `price` de todas as reservas ativas da sala, independentemente do chamador.
ROOT_CAUSE_HYPOTHESIS: Requisito escrito apenas em termos funcionais; dimensão de autorização/privacidade nunca especificada.
REFERENCE: REQUIREMENTS.md REQ-SIM-004; SOFTWARE_RELEASE_PACKAGE.md (AUTHORIZATION_MATRIX cobre só cancelamento).
RECOMMENDATION: OpusCore/produto define e registra a política (quem lista, quais campos); depois, se necessário, remediação de código pela SanaCore em ciclo próprio.
SUGGESTED_REMEDIATION_OWNER: OpusCore (definição de produto) → SanaCore (se houver mudança de código decorrente)

RETEST_SPECIFICATION:
(a) Existe política documentada e versionada (REQ/PERM) para listagem: chamadores autorizados e campos expostos.
(b) Implementação e teste conformes à política registrada.
(c) Se a decisão for backlog, registro formal da decisão de produto com ID versionado é suficiente para fechar este ciclo.

---

## Decisão de escopo (APR-2026-006)

REGISTRADO_POR: vericore-software-audit-director (registro de decisão humana; nenhuma
decisão de auditoria foi tomada neste ato)
FONTE AUTORITATIVA: `coretriad/governance/APPROVALS.md` — APR-2026-006
DECISOR HUMANO: Gilwagno
DATA DA DECISÃO: 2026-08-13

**STATUS INALTERADO:** este finding permanece `PROPOSED`. A decisão humana registrada
aqui **não** altera severidade, confiança nem status — apenas delimita escopo e
sequenciamento.

**Decisão:** FIND-SIM-001-004 **não bloqueia** o `SIM-001_VALIDATION_REPORT.md` nem o
início do SIM-002.

**Ação pendente (não vence prazo, mas não pode ser esquecida):** rodar o
`vericore-finding-validator` sobre este finding **antes** do arquivamento definitivo do
SIM-001; alternativamente, descartá-lo junto com o ambiente do simulado caso se conclua
que não tem valor de aprendizado para o processo.

**Efeito sobre o run:** enquanto essa ação não ocorrer, SIM-001 está **fechado como ciclo
de validação, porém não arquivado**. Nenhum `AUDIT_PASSED` é declarado por este registro.
