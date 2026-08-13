# FINDING

FINDING_ID: FIND-SIM-001-005
AUDIT_ID: SIM-001-AUD-001
PROJECT_ID: SIM-001
AUDIT_COMMIT: b736a1e733f802735b1b79348e3c6cc084bd466e
TITLE: Comportamentos implementados sem requisito (UNDOCUMENTED BEHAVIOR) — rejeição de reserva não ativa, "Booking not found" e objeto cancellation
DOMAIN: traceability
SUBDOMAIN: undocumented behavior
SEVERITY: MEDIUM
CONFIDENCE: CONFIRMED
STATUS: PROPOSED
DETECTED_BY: traceability auditor (dedup pelo evidence-controller)

DESCRIPTION:
Três comportamentos existem no código sem REQ/AC correspondente em
`product/SIM-001/requirements/REQUIREMENTS.md`:
1. Rejeição de cancelamento de reserva não ativa
   (`product/SIM-001/src/bookingService.js` L83-85) — testada por TC-SIM-002c
   (`product/SIM-001/tests/booking.test.js` L134-162), mas o teste não rastreia
   para nenhum requisito (teste órfão).
2. Erro `Booking "<id>" not found` (bookingService.js L80-82) — sem REQ e sem
   teste.
3. Objeto `cancellation` gravado na reserva (bookingService.js L96-102:
   cancelledBy, cancelledByRole, cancelledAt, lateCancellation, fee) — sem REQ
   funcional que o descreva.
Classificação: UNDOCUMENTED BEHAVIOR. Pela Regra 6 do CLAUDE.md, nenhum agente
inventa requisito — a formalização cabe à OpusCore.

NOTA: requer decisão de produto — candidato a backlog, não a remediação
imediata neste ciclo. A ação esperada é formalização de REQ/AC (e TC quando
aplicável), não mudança de código.

EXPECTED_BEHAVIOR: Todo comportamento observável do sistema possui REQ/AC versionado e, quando aplicável, TC rastreável (Regra 17 do CLAUDE.md).
ACTUAL_BEHAVIOR: Três comportamentos sem requisito; um deles com teste órfão (TC-SIM-002c), um sem teste algum.

EVIDENCE:
FILE: product/SIM-001/src/bookingService.js
LINES: 83-85 (rejeição de não ativa); 80-82 ("not found"); 96-102 (objeto cancellation)
FILE: product/SIM-001/tests/booking.test.js
LINES: 134-162 (TC-SIM-002c sem REQ correspondente)
FILE: product/SIM-001/requirements/REQUIREMENTS.md
LINES: 1-53 (ausência de REQ/AC para os três comportamentos)

RELATED_PROCESS: cancelamento de reserva
RELATED_BUSINESS_RULE: —
RELATED_REQUIREMENT: — (lacuna; adjacente a REQ-SIM-002)
RELATED_USE_CASE: —
RELATED_ACCEPTANCE_CRITERIA: —
RELATED_TEST: TC-SIM-002c (órfão)

BUSINESS_IMPACT: Comportamentos sem dono formal podem mudar sem controle; auditorias futuras não têm oráculo.
TECHNICAL_IMPACT: Rastreabilidade REQ↔código↔teste incompleta; teste órfão não protege requisito nenhum.
SECURITY_IMPACT: — (o conteúdo do objeto cancellation intersecta o FIND-SIM-001-001 quanto a userRole autodeclarado, tratado lá)

REPRODUCTION: Inspeção comparativa entre bookingService.js e REQUIREMENTS.md.
ROOT_CAUSE_HYPOTHESIS: Implementação evoluiu além do escopo documentado sem ciclo de atualização de requisitos.
REFERENCE: CLAUDE.md Regras 6 e 17.
RECOMMENDATION: OpusCore formaliza REQ/AC para os três comportamentos (ou decide removê-los formalmente); TC-SIM-002c passa a referenciar o novo REQ; criar teste para "not found" se o comportamento for formalizado.
SUGGESTED_REMEDIATION_OWNER: OpusCore (formalização de requisitos)

RETEST_SPECIFICATION:
(a) REQ/AC versionados cobrindo: rejeição de cancelamento de reserva não ativa; erro de reserva inexistente; registro de metadata de cancelamento (ou decisão formal de remoção).
(b) TC-SIM-002c referenciando o REQ formalizado.
(c) Teste para "Booking not found" se o comportamento for mantido.
(d) Matriz de rastreabilidade sem itens órfãos para estes três comportamentos.
