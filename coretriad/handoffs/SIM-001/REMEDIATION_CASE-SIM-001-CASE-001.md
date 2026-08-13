# REMEDIATION_CASE  (VeriCore → SanaCore, via CoreTriad)
CASE_ID: SIM-001-CASE-001
FINDING_ID: FIND-SIM-001-001
PROJECT_ID: SIM-001
AUDIT_ID: SIM-001-AUD-001
AUDIT_COMMIT: b736a1e733f802735b1b79348e3c6cc084bd466e
SEVERITY: CRITICAL
CONFIDENCE: CONFIRMED

EXPECTED_BEHAVIOR:
Cancelamento por usuário que não é o solicitante nem `admin` é rejeitado com
erro; a reserva permanece `active` (BR-SIM-001; AC-SIM-002, REQUIREMENTS.md
L25-29).

ACTUAL_BEHAVIOR:
Qualquer `userId`/`userRole` cancela qualquer reserva ativa. IDs de reserva
são sequenciais e enumeráveis (`BKG-${nextId++}`, bookingService.js L61),
permitindo exploração por enumeração.

EVIDENCE:
- Releitura integral de `product/SIM-001/src/bookingService.js` (123 linhas)
  confirmou que `cancelBooking` (L78-105) não faz nenhuma comparação de
  `userId`/`booking.userId` nem checagem de `userRole === 'admin'`. Os dois
  parâmetros só alimentam o objeto `cancellation` como metadata (L96-102).
- Releitura integral de `product/SIM-001/tests/booking.test.js` (163 linhas,
  6 testes: TC-SIM-001, TC-SIM-001b, TC-SIM-004, TC-SIM-002, TC-SIM-002b,
  TC-SIM-002c) — nenhum teste de rejeição por autorização existe.
- Grep por `cancelBooking`/`bookingService` no repositório inteiro: nenhum
  wrapper, controller, rota HTTP ou camada intermediária com verificação
  prévia de autorização.
- `SOFTWARE_RELEASE_PACKAGE.md` L24 declara uma `AUTHORIZATION_MATRIX`
  ("solicitante: permitido; admin: permitido; demais: negado") que é
  documentação declarativa, não código — contradiz o comportamento real e
  agrava o achado (falsa garantia documental).
- Busca exaustiva por controle compensatório (config externa, middleware,
  gateway) não encontrou nada: o produto SIM-001 é um único arquivo de
  serviço em memória, sem transporte HTTP, sem camada externa onde a
  verificação pudesse residir.

REPRODUCTION:
1. user-1 cria reserva (retorna `BKG-1`).
2. user-2 chama `cancelBooking({ bookingId: 'BKG-1', userId: 'user-2', userRole: 'user', now })`.
3. Cancelamento é aceito; reserva vira `cancelled`.

FILES:
- product/SIM-001/src/bookingService.js
- product/SIM-001/requirements/BUSINESS_RULES.md
- product/SIM-001/tests/booking.test.js

LINES:
- bookingService.js: 78-105 (função inteira sem verificação); 97-98
  (userId/userRole usados só como metadata); 61 (IDs enumeráveis BKG-N)
- BUSINESS_RULES.md: 3-7 (BR-SIM-001)
- booking.test.js: 1-163 (suíte completa — ausência de teste negativo de
  autorização)

BUSINESS_RULE: BR-SIM-001
REQUIREMENT: REQ-SIM-002
USE_CASE: —

TECHNICAL_IMPACT: Regra de negócio central ausente; suíte verde dá falsa
garantia de proteção.
BUSINESS_IMPACT: Qualquer usuário pode cancelar reservas de terceiros, com
possível cobrança de taxa tardia contra a vítima e negação de serviço da
sala.
SECURITY_IMPACT: Broken access control / IDOR (OWASP A01). Cenário
confirmado: user-2 com role `user` cancela reserva de user-1 enumerando
BKG-N. `userRole` é autodeclarado pelo chamador — mesmo com a comparação de
papel adicionada, a fonte do papel precisa ser confiável (não pode
continuar sendo um parâmetro livre do chamador).

RECOMMENDATION:
Implementar em `cancelBooking` uma verificação de autorização que rejeite
com erro qualquer chamador que não seja o dono da reserva nem admin,
cobrindo explicitamente AMBOS os caminhos de permissão exigidos pelo
RETEST_SPECIFICATION do finding original:
`userId === booking.userId` OU `userRole === 'admin'`.
Qualquer chamador que não satisfaça nenhuma das duas condições deve ser
rejeitado, e a reserva deve permanecer `active`. A fonte de `userRole` usada
na verificação deve ser tratada como não confiável enquanto for apenas um
parâmetro autodeclarado pelo chamador — a remediação deve deixar isso
documentado e, se possível, endereçar a origem do papel (não apenas a
comparação). Adicionar testes negativos e positivos referenciando
BR-SIM-001 cobrindo: (i) não-dono/não-admin rejeitado, (ii) dono aprovado,
(iii) admin aprovado.

DEPENDENCIES: nenhuma (causa-raiz independente dos demais findings do ciclo
SIM-001).

RETEST_SPECIFICATION:
(a) user-2 com role `user` tenta cancelar reserva de user-1 → erro lançado
    E a reserva permanece `active`.
(b) O próprio dono cancela a sua reserva → sucesso.
(c) Usuário `admin` cancela reserva de terceiro → sucesso.
(d) Suíte contém testes cobrindo os 3 cenários, referenciando BR-SIM-001.
(e) Suíte completa verde no commit de remediação.

---
NOTA DE ROTEAMENTO (CoreTriad Director): este artefato é o handoff formal
FINDINGS_CONFIRMED → SanaCore. O hook `org-isolation.js` impede o Director
de escrever diretamente em `remediation/cases/` (namespace de escrita
exclusivo da SanaCore). O caso de trabalho oficial deve ser criado pelo
`sanacore-remediation-triage` em
`remediation/cases/SIM-001-FIND-001/REMEDIATION_CASE.md`, copiando o
conteúdo deste handoff ao abrir o caso.
