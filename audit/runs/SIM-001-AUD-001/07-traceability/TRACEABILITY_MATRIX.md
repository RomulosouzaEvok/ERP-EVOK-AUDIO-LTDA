# TRACEABILITY MATRIX — SIM-001-AUD-001

AUDIT_ID: SIM-001-AUD-001
AUDIT_COMMIT: b736a1e733f802735b1b79348e3c6cc084bd466e
DATA: 2026-08-13
FONTES: `product/SIM-001/requirements/BUSINESS_RULES.md`, `product/SIM-001/requirements/REQUIREMENTS.md`, `product/SIM-001/src/bookingService.js`, `product/SIM-001/tests/booking.test.js`

Status possíveis: PROVADO (implementado e coberto por teste correto), DIVERGENTE (implementação/teste contradizem a fonte autoritativa), INEXISTENTE (não implementado / sem teste), SEM_REQUISITO (comportamento sem REQ/AC).

## Regras de negócio (BR)

| BR | Regra (fonte autoritativa) | AC | Implementação | Teste | Status | Finding |
|---|---|---|---|---|---|---|
| BR-SIM-001 | Cancelamento só pelo solicitante ou `admin` (BUSINESS_RULES.md L3-7) | AC-SIM-002 (parcial) | INEXISTENTE — `cancelBooking` (bookingService.js L78-105) não valida `userId`/`userRole`; usa-os só como metadata (L97-98) | INEXISTENTE — nenhum teste negativo de autorização | CÓDIGO INEXISTENTE / TESTE INEXISTENTE | FIND-SIM-001-001 |
| BR-SIM-002 | Taxa de 10% para cancelamento <24h (BUSINESS_RULES.md L9-13) | AC-SIM-002 | DIVERGENTE — `LATE_CANCEL_FEE_RATE = 0.20` (L15), aplicada em L91-93 | DIVERGENTE — TC-SIM-002b (booking.test.js L112-132) assevera fee=40 sobre price 200 (20%), escrito contra o código e não contra a regra | DIVERGENTE (código + teste) | FIND-SIM-001-002 |
| BR-SIM-003 | Não sobreposição `[start, end)` na mesma sala (BUSINESS_RULES.md L15-19) | AC-SIM-003 | PROVADO por leitura — bookingService.js L46-58, semântica `[start, end)` correta (L50-51) | INEXISTENTE — TC-SIM-003 planejado (REQUIREMENTS.md L42) não existe na suíte | CÓDIGO CORRETO / TESTE INEXISTENTE | FIND-SIM-001-003 |

## Requisitos (REQ)

| REQ | AC | Implementação | Teste | Status | Finding |
|---|---|---|---|---|---|
| REQ-SIM-001 — Criar reserva | AC-SIM-001 | bookingService.js L33-72 | TC-SIM-001 (booking.test.js L8-33), TC-SIM-001b (L35-48) | PROVADO | — |
| REQ-SIM-002 — Cancelar com autorização e taxa | AC-SIM-002 | Parcial: cancelamento e janela 24h existem (L78-105); autorização ausente; taxa divergente | TC-SIM-002 (L89-109), TC-SIM-002b (L112-132, divergente), TC-SIM-002c (L134-162) | NÃO PROVADO (herda FIND-001 e FIND-002) | FIND-SIM-001-001, FIND-SIM-001-002 |
| REQ-SIM-003 — Rejeição de sobreposição | AC-SIM-003 | bookingService.js L46-58 | INEXISTENTE (TC-SIM-003 ausente) | NÃO PROVADO (sem teste) | FIND-SIM-001-003 |
| REQ-SIM-004 — Listar reservas por sala | AC-SIM-004 | bookingService.js L110-118 | TC-SIM-004 (booking.test.js L51-86) | PROVADO (funcional; política de autorização/escopo de dados não documentada — ver FIND-004) | FIND-SIM-001-004 (política) |

## Testes sem requisito / comportamentos não documentados

| Item | Localização | Situação | Finding |
|---|---|---|---|
| TC-SIM-002c (rejeitar cancelar reserva não ativa) | booking.test.js L134-162; código L83-85 | Teste existe, comportamento sem REQ/AC | FIND-SIM-001-005 |
| Erro "Booking not found" | bookingService.js L80-82 | Sem REQ e sem teste | FIND-SIM-001-005 |
| Objeto `cancellation` (metadata) | bookingService.js L96-102 | Sem REQ funcional | FIND-SIM-001-005 |
| Fronteira exata 24h; price negativo; datas inválidas | L89-90; L36-38; L17-23 | Código presente, sem teste de boundary | FIND-SIM-001-006 |

## Síntese

- **0/3 BRs** com cadeia completa BR → implementação → teste correta.
- **2/4 REQs** provados (REQ-SIM-001, REQ-SIM-004); REQ-SIM-002 e REQ-SIM-003 não provados.
- 1 teste (TC-SIM-002c) sem requisito correspondente; 1 TC planejado (TC-SIM-003) não implementado.
