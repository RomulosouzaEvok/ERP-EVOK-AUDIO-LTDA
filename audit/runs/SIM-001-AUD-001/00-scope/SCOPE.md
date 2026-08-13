# AUDIT SCOPE — SIM-001-AUD-001

AUDIT_ID: SIM-001-AUD-001
PROJECT_ID: SIM-001 ("Sala Livre" — reserva de salas de reunião)
REPOSITORY: c:\Gilwagno WorkSpace\ERP-Evok--Audio-LTDA
BRANCH: main
AUDIT_COMMIT: b736a1e733f802735b1b79348e3c6cc084bd466e (congelado — Regra 12/13 CLAUDE.md)
AUDIT_DATE: 2026-08-13

## Escopo

- `product/SIM-001/` (integral):
  - `product/SIM-001/src/bookingService.js`
  - `product/SIM-001/tests/booking.test.js`
  - `product/SIM-001/requirements/BUSINESS_RULES.md`
  - `product/SIM-001/requirements/REQUIREMENTS.md`
  - `product/SIM-001/README.md`
  - `product/SIM-001/SOFTWARE_RELEASE_PACKAGE.md`

## Exclusões

- Nenhuma.

## Auditores (trilhas)

| Trilha | Papel | Acesso |
|---|---|---|
| business-rule auditor | Conformidade BR × implementação × teste | read-only |
| authorization auditor | Autorização, IDOR, escopo de dados | read-only |
| traceability auditor | Cadeia BR/REQ/AC/TC × código × suíte | read-only |
| vericore-audit-evidence-controller | Verificação e persistência de evidência (único write em `audit/`) | write em `audit/` apenas |

## Ambiente

- Node v24.18.0 / win32 (Windows 11 Pro 10.0.26200)
- Suíte de testes: `node:test` (`product/SIM-001/tests/booking.test.js`)

## Notas de método

- Método: READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT.
- Todas as citações arquivo+linha dos findings foram re-verificadas por leitura
  direta do código no AUDIT_COMMIT antes da persistência. Nenhuma citação
  precisou de correção.
- Deduplicação entre trilhas registrada em cada finding (campo de detecção).
- Findings persistidos com STATUS `PROPOSED`; CRITICAL/HIGH seguem ao
  vericore-finding-validator (Regra 22).
