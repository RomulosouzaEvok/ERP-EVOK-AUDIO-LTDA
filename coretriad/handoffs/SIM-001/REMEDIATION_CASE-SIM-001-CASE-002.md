# REMEDIATION_CASE  (VeriCore → SanaCore, via CoreTriad)
CASE_ID: SIM-001-CASE-002
FINDING_ID: FIND-SIM-001-002
PROJECT_ID: SIM-001
AUDIT_ID: SIM-001-AUD-001
AUDIT_COMMIT: b736a1e733f802735b1b79348e3c6cc084bd466e
SEVERITY: HIGH
CONFIDENCE: CONFIRMED

EXPECTED_BEHAVIOR:
Cancelamento <24h antes do início da reserva cobra 10% do `price` (ex.:
price 200 → fee 20); cancelamento ≥24h antes → fee 0 (BR-SIM-002).

ACTUAL_BEHAVIOR:
Cancelamento <24h cobra 20% (price 200 → fee 40). O teste TC-SIM-002b
assevera `fee === 40`, consagrando o valor incorreto do código em vez de
validar contra a regra de negócio.

EVIDENCE:
- `product/SIM-001/src/bookingService.js` L15: `const LATE_CANCEL_FEE_RATE =
  0.20;`; L91-93: aplicação da taxa sobre `booking.price`. Nenhuma outra
  constante, feature flag, override por sala/usuário ou config externa que
  reduza a taxa efetiva para 10% em algum cenário.
- `product/SIM-001/requirements/BUSINESS_RULES.md` L9-13 (BR-SIM-002): texto
  explícito "cobra taxa de 10%", sem ressalva ou cláusula condicional que
  justifique 20%.
- `product/SIM-001/tests/booking.test.js` L112-132 (TC-SIM-002b):
  `assert.equal(result.fee, 40)` em L131, sobre `price: 200` — teste
  calibrado sobre o comportamento observado do código, não sobre a BR.
- Grep por `LATE_CANCEL_FEE_RATE`, `BR-SIM-002`, "ADR" no repositório
  inteiro: nenhum ADR, changelog ou registro versionado autorizando desvio
  de 10% para 20% (`SOFTWARE_RELEASE_PACKAGE.md` L17 declara "ADRS: N/A").

REPRODUCTION:
Criar reserva com `price: 200`; cancelar com menos de 24h de antecedência;
`fee` retorna 40 (esperado pela BR-SIM-002: 20).

FILES:
- product/SIM-001/src/bookingService.js
- product/SIM-001/tests/booking.test.js
- product/SIM-001/requirements/BUSINESS_RULES.md

LINES:
- bookingService.js: 15 (`LATE_CANCEL_FEE_RATE = 0.20`); 91-93 (aplicação
  da taxa)
- booking.test.js: 112-132 (TC-SIM-002b — assevera fee 40 em L131)
- BUSINESS_RULES.md: 9-13 (BR-SIM-002 — 10%)

BUSINESS_RULE: BR-SIM-002
REQUIREMENT: REQ-SIM-002
USE_CASE: —

TECHNICAL_IMPACT: Teste escrito contra o código neutraliza a suíte como
mecanismo de detecção da divergência entre código e requisito.
BUSINESS_IMPACT: Cobrança em dobro (20% vs 10%) dos usuários em
cancelamento tardio — impacto financeiro direto e risco de contestação.
SECURITY_IMPACT: —

RECOMMENDATION:
Corrigir `LATE_CANCEL_FEE_RATE` para `0.10` em `bookingService.js` L15 e
reescrever TC-SIM-002b para asseverar `fee === 20` sobre `price: 200`,
citando explicitamente 10% e BR-SIM-002 no teste. Caso 20% fosse de fato
uma decisão de negócio, isso exigiria atualização formal da BR com registro
versionado (ADR) — o que não existe hoje; na ausência dessa autorização, a
BR versionada (10%) é a fonte autoritativa (Regras 7 e 21 do CLAUDE.md).

DEPENDENCIES: nenhuma (causa-raiz independente dos demais findings do ciclo
SIM-001).

RETEST_SPECIFICATION:
(a) price 200, cancelamento <24h antes do início → fee = 20.
(b) Cancelamento exatamente 24h antes → fee = 0.
(c) Cancelamento >24h antes → fee = 0.
(d) TC-SIM-002b corrigido, citando 10% e BR-SIM-002.
(e) Suíte completa verde no commit de remediação.

---
NOTA DE ROTEAMENTO (CoreTriad Director): este artefato é o handoff formal
FINDINGS_CONFIRMED → SanaCore. O hook `org-isolation.js` impede o Director
de escrever diretamente em `remediation/cases/` (namespace de escrita
exclusivo da SanaCore). O caso de trabalho oficial deve ser criado pelo
`sanacore-remediation-triage` em
`remediation/cases/SIM-001-FIND-002/REMEDIATION_CASE.md`, copiando o
conteúdo deste handoff ao abrir o caso.
