# SOFTWARE_RELEASE_PACKAGE  (OpusCore → VeriCore)
PROJECT_ID: SIM-001
RELEASE_ID: SIM-001-RC1
VERSION: 0.1.0
COMMIT_HASH: (a preencher pelo CoreTriad Director no commit de entrega — vira AUDIT_COMMIT congelado)
SOURCE_BRANCH: main

PRODUCT_SPECIFICATION: API em memória de reserva de salas de reunião ("Sala Livre"). Node.js puro CommonJS, zero dependências. Ver `product/SIM-001/README.md`.
BUSINESS_PROCESS: Reserva e cancelamento de salas de reunião (criação, cancelamento com autorização/taxa, listagem por sala).
BUSINESS_RULES: BR-SIM-001, BR-SIM-002, BR-SIM-003 — `product/SIM-001/requirements/BUSINESS_RULES.md`
REQUIREMENTS: REQ-SIM-001, REQ-SIM-002, REQ-SIM-003, REQ-SIM-004 — `product/SIM-001/requirements/REQUIREMENTS.md`
NFRS: N/A neste ciclo (projeto simulado; sem NFRs formais definidos).
USE_CASES: Cobertos diretamente pelos REQs (criar reserva, cancelar reserva, listar por sala); UCs formais não foram destacados neste ciclo.
ACCEPTANCE_CRITERIA: AC-SIM-001, AC-SIM-002, AC-SIM-003, AC-SIM-004 — `product/SIM-001/requirements/REQUIREMENTS.md`

ARCHITECTURE: Serviço único em memória (`createBookingService`), sem persistência, sem transporte HTTP. Código em `product/SIM-001/src/bookingService.js`.
ADRS: N/A (decisão única: fábrica em memória, zero dependências, imposta pelo escopo do simulado).
API_CONTRACTS: API programática — `createBooking({roomId, userId, start, end, price})`, `cancelBooking({bookingId, userId, userRole, now})`, `listBookings(roomId)`.
DATA_MODEL: Entidade `Booking` { id, roomId, userId, start, end, price, status: active|cancelled, cancellation }.
MIGRATIONS: N/A (armazenamento em memória).

SECURITY_REQUIREMENTS: BR-SIM-001 (autorização de cancelamento: solicitante ou `admin`).
THREAT_MODEL: N/A formal; superfície limitada a chamadas programáticas em memória.
AUTHORIZATION_MATRIX: Cancelamento — solicitante da reserva: permitido; `admin`: permitido; demais usuários: negado (BR-SIM-001).
TEST_STRATEGY: Testes unitários com runner nativo `node:test`, um arquivo por módulo, suíte em `product/SIM-001/tests/`. Comando: `node --test "product/SIM-001/tests/**/*.test.js"`.
TEST_RESULTS: Execução em 2026-08-13 (Node.js v24.18.0):
  tests 6 / suites 0 / pass 6 / fail 0 / cancelled 0 / skipped 0 / todo 0
  Testes: TC-SIM-001, TC-SIM-001b, TC-SIM-004, TC-SIM-002, TC-SIM-002b, TC-SIM-002c — todos PASS.

KNOWN_LIMITATIONS: Armazenamento volátil (dados perdidos ao reiniciar o processo); sem interface HTTP; sem concorrência multi-processo.
KNOWN_RISKS: Nenhum risco registrado pela engenharia neste ciclo.
DEPLOYMENT_PLAN: N/A (biblioteca em memória para o simulado; sem deploy).
ROLLBACK_PLAN: N/A (sem deploy; reversão via git).
DOCUMENTATION_INDEX:
  - `product/SIM-001/README.md`
  - `product/SIM-001/requirements/BUSINESS_RULES.md`
  - `product/SIM-001/requirements/REQUIREMENTS.md`
  - `product/SIM-001/SOFTWARE_RELEASE_PACKAGE.md`

---

DECLARAÇÃO OpusCore: IMPLEMENTATION COMPLETE — release SIM-001-RC1 pronta para auditoria da VeriCore.
