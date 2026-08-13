# REMEDIATION_CASE  (VeriCore → SanaCore, via CoreTriad)
CASE_ID: SIM-001-CASE-003
FINDING_ID: FIND-SIM-001-003
PROJECT_ID: SIM-001
AUDIT_ID: SIM-001-AUD-001
AUDIT_COMMIT: b736a1e733f802735b1b79348e3c6cc084bd466e
SEVERITY: HIGH
CONFIDENCE: CONFIRMED

EXPECTED_BEHAVIOR:
TC-SIM-003 presente na suíte de testes, cobrindo AC-SIM-003 (rejeição de
sobreposição de reservas na mesma sala; adjacências e cenários diferentes
aceitos), conforme planejado em REQ-SIM-003.

ACTUAL_BEHAVIOR:
BR-SIM-003 (não sobreposição) está implementada corretamente por leitura em
`bookingService.js` L46-58, mas sem qualquer teste. TC-SIM-003 é planejado
em REQUIREMENTS.md L42 mas não existe em nenhum lugar da suíte
(`booking.test.js` contém apenas TC-SIM-001, 001b, 002, 002b, 002c e 004).

EVIDENCE:
- Releitura integral de `product/SIM-001/tests/booking.test.js` (163
  linhas): TC-SIM-001 cria duas reservas com o mesmo horário, mas em salas
  diferentes (`room-a`/`room-b`, L11-31) — não exercita a checagem de
  sobreposição, já que o `for` em L47-58 do serviço filtra por `roomId`.
  Nenhum teste cria duas reservas na mesma sala com intervalos sobrepostos.
- Grep por `TC-SIM-003` no repositório inteiro: só aparece no finding, na
  `TRACEABILITY_MATRIX.md` da auditoria e em `REQUIREMENTS.md` L42 como "TC
  planejado" — nunca foi implementado em nenhum branch/arquivo do repo.
- Grep por `bookingService`/`cancelBooking`/`createBooking` fora de
  `product/SIM-001/`: nenhuma outra suíte no repositório (ex.:
  `server/tests/`) referencia este módulo — SIM-001 é projeto isolado, sem
  cobertura "escondida" em outra pasta.
- `SOFTWARE_RELEASE_PACKAGE.md` L26-28 (`TEST_RESULTS`) lista exatamente os
  mesmos 6 testes como "pass 6" — confirma independentemente, pela própria
  declaração de release da OpusCore, que TC-SIM-003 nunca foi executado nem
  existe.
- Verificação da implementação em si (`bookingService.js` L46-58): por
  leitura, a lógica está correta (`start < booking.end && end > booking.start`,
  semântica `[start, end)`) — não é bug funcional, é lacuna de rede de
  segurança de regressão.

REPRODUCTION:
Grep por "TC-SIM-003" na suíte retorna vazio; `REQUIREMENTS.md` L42 declara
o teste como planejado, nunca implementado.

FILES:
- product/SIM-001/src/bookingService.js
- product/SIM-001/requirements/REQUIREMENTS.md
- product/SIM-001/tests/booking.test.js

LINES:
- bookingService.js: 46-58 (checagem de sobreposição, correta); 50-51
  (semântica [start, end) via `start < booking.end && end > booking.start`)
- REQUIREMENTS.md: 32-42 (REQ-SIM-003 / AC-SIM-003 / "TC planejado:
  TC-SIM-003")
- booking.test.js: 1-163 (ausência de TC-SIM-003 em toda a suíte)

BUSINESS_RULE: BR-SIM-003
REQUIREMENT: REQ-SIM-003
USE_CASE: —

TECHNICAL_IMPACT: Cadeia REQ→TC quebrada; suíte não protege a regra mais
crítica de integridade de agenda contra regressões futuras.
BUSINESS_IMPACT: Risco de double-booking silencioso em regressões futuras
(regra central do produto sem rede de segurança de teste).
SECURITY_IMPACT: —

RECOMMENDATION:
Implementar TC-SIM-003 na suíte `booking.test.js`, cobrindo todos os casos
listados no RETEST_SPECIFICATION do finding original — sobreposição
parcial no início, sobreposição parcial no fim, intervalo contido,
intervalo contendo, adjacência aceita, sala diferente aceita, e reserva
cancelada não bloqueando reuso do horário. A implementação de
`bookingService.js` L46-58 já está correta por leitura e não deve ser
alterada como parte desta remediação, exceto se o novo teste revelar
comportamento divergente do esperado.

DEPENDENCIES: nenhuma (causa-raiz independente dos demais findings do ciclo
SIM-001).

RETEST_SPECIFICATION:
TC-SIM-003 presente na suíte com os casos:
(a) sobreposição parcial no início → rejeitada;
(b) sobreposição parcial no fim → rejeitada;
(c) intervalo contido na reserva existente → rejeitado;
(d) intervalo contendo a reserva existente → rejeitado;
(e) adjacente `[12:00, 13:00)` após `[10:00, 12:00)` → aceito;
(f) mesma janela em sala diferente → aceito;
(g) mesma janela sobre reserva cancelada → aceito;
(h) suíte completa verde no commit de remediação.

---
NOTA DE ROTEAMENTO (CoreTriad Director): este artefato é o handoff formal
FINDINGS_CONFIRMED → SanaCore. O hook `org-isolation.js` impede o Director
de escrever diretamente em `remediation/cases/` (namespace de escrita
exclusivo da SanaCore). O caso de trabalho oficial deve ser criado pelo
`sanacore-remediation-triage` em
`remediation/cases/SIM-001-FIND-003/REMEDIATION_CASE.md`, copiando o
conteúdo deste handoff ao abrir o caso.
