# FINDING

FINDING_ID: FIND-SIM-001-006
AUDIT_ID: SIM-001-AUD-001
PROJECT_ID: SIM-001
AUDIT_COMMIT: b736a1e733f802735b1b79348e3c6cc084bd466e
TITLE: Lacunas de teste de fronteira — 24h exatas, price negativo e datas inválidas sem cobertura
DOMAIN: quality
SUBDOMAIN: boundary test coverage
SEVERITY: LOW
CONFIDENCE: CONFIRMED
STATUS: PROPOSED
DETECTED_BY: business-rule auditor; traceability auditor (dedup pelo evidence-controller)

DESCRIPTION:
Três fronteiras implementadas corretamente no código não possuem teste:
1. Fronteira exata de 24h da janela de cancelamento tardio — o código usa `<`
   estrito (`product/SIM-001/src/bookingService.js` L89-90:
   `msUntilStart < LATE_CANCEL_WINDOW_MS`), então exatamente 24h → sem taxa,
   conforme BR-SIM-002 ("menos de 24 horas"); nenhum teste exercita o ponto
   exato (TC-SIM-002 usa 48h e TC-SIM-002b usa 16h).
2. Rejeição de `price` negativo (bookingService.js L36-38) — sem teste.
3. Rejeição de datas inválidas (`toDate`, bookingService.js L17-23) — sem teste.
O código está correto por leitura; o risco é de regressão silenciosa
(ex.: troca de `<` por `<=` na fronteira de 24h).

EXPECTED_BEHAVIOR: Fronteiras críticas cobertas por testes (exatamente 24h → fee 0; price < 0 → erro; data inválida → erro).
ACTUAL_BEHAVIOR: Nenhum teste de fronteira para os três pontos; comportamento correto apenas verificado por leitura de código nesta auditoria.

EVIDENCE:
FILE: product/SIM-001/src/bookingService.js
LINES: 89-90 (comparação estrita `<` na janela de 24h); 36-38 (validação de price); 17-23 (validação de datas em toDate)
FILE: product/SIM-001/tests/booking.test.js
LINES: 89-109 (TC-SIM-002, 48h de antecedência) e 112-132 (TC-SIM-002b, 16h) — nenhum caso no ponto exato de 24h; ausência de testes para price negativo e datas inválidas na suíte (L1-163)

RELATED_PROCESS: criação e cancelamento de reserva
RELATED_BUSINESS_RULE: BR-SIM-002 (fronteira de 24h)
RELATED_REQUIREMENT: REQ-SIM-001 (validações de entrada), REQ-SIM-002
RELATED_USE_CASE: —
RELATED_ACCEPTANCE_CRITERIA: AC-SIM-001, AC-SIM-002
RELATED_TEST: TC-SIM-002 / TC-SIM-002b (não cobrem a fronteira exata); inexistentes para price/datas

BUSINESS_IMPACT: Regressão na fronteira de 24h poderia cobrar taxa indevida no limite exato sem detecção.
TECHNICAL_IMPACT: Validações de entrada sem rede de segurança de testes.
SECURITY_IMPACT: —

REPRODUCTION: Inspeção da suíte — nenhum caso com `now` exatamente 24h antes de `start`; nenhum `assert.throws` para price negativo ou data inválida.
ROOT_CAUSE_HYPOTHESIS: Testes cobriram apenas caminhos felizes e um caso tardio distante da fronteira.
REFERENCE: BUSINESS_RULES.md BR-SIM-002; REQUIREMENTS.md AC-SIM-001/AC-SIM-002.
RECOMMENDATION: Adicionar testes de fronteira (24h exatas → fee 0), rejeição de price negativo e de datas inválidas.
SUGGESTED_REMEDIATION_OWNER: SanaCore

RETEST_SPECIFICATION:
(a) Teste com `now` exatamente 24h antes de `start` → fee = 0.
(b) Teste de `createBooking` com price negativo → erro `price must be a non-negative number`.
(c) Testes de `start`/`end`/`now` inválidos → erro `Invalid date`.
(d) Suíte completa verde no commit de remediação.

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

**Decisão:** FIND-SIM-001-006 **não bloqueia** o `SIM-001_VALIDATION_REPORT.md` nem o
início do SIM-002.

**Ação pendente (não vence prazo, mas não pode ser esquecida):** rodar o
`vericore-finding-validator` sobre este finding **antes** do arquivamento definitivo do
SIM-001; alternativamente, descartá-lo junto com o ambiente do simulado caso se conclua
que não tem valor de aprendizado para o processo.

**Efeito sobre o run:** enquanto essa ação não ocorrer, SIM-001 está **fechado como ciclo
de validação, porém não arquivado**. Nenhum `AUDIT_PASSED` é declarado por este registro.
