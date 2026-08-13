# FINDING

FINDING_ID: FIND-SIM-001-001
AUDIT_ID: SIM-001-AUD-001
PROJECT_ID: SIM-001
AUDIT_COMMIT: b736a1e733f802735b1b79348e3c6cc084bd466e
TITLE: BR-SIM-001 (autorização de cancelamento) não implementada nem testada — qualquer usuário cancela qualquer reserva
DOMAIN: security / business-rules
SUBDOMAIN: authorization (broken access control / IDOR)
SEVERITY: CRITICAL
CONFIDENCE: CONFIRMED
STATUS: CLOSED
DETECTED_BY: business-rule auditor; authorization auditor; traceability auditor (deduplicado pelo evidence-controller)

DESCRIPTION:
BR-SIM-001 (`product/SIM-001/requirements/BUSINESS_RULES.md` L3-7) exige que uma
reserva só seja cancelada pelo próprio solicitante OU por usuário com papel
`admin`, rejeitando qualquer outra tentativa. A função `cancelBooking`
(`product/SIM-001/src/bookingService.js` L78-105) não implementa nenhuma
verificação: não compara o `userId` do chamador com `booking.userId` e não
verifica `userRole === 'admin'`. Os parâmetros `userId` e `userRole` são usados
apenas como metadata de auditoria no objeto `cancellation` (L97-98). Não existe
nenhum teste negativo de autorização na suíte (`product/SIM-001/tests/booking.test.js`).
Agravante: `userRole` é autodeclarado pelo chamador — mesmo que a comparação de
papel fosse adicionada, a fonte do papel não é confiável.

EXPECTED_BEHAVIOR:
Cancelamento por usuário que não é o solicitante nem `admin` é rejeitado com
erro; a reserva permanece `active` (BR-SIM-001; AC-SIM-002, REQUIREMENTS.md L25-29).

ACTUAL_BEHAVIOR:
Qualquer `userId`/`userRole` cancela qualquer reserva ativa. IDs de reserva são
sequenciais e enumeráveis (`BKG-${nextId++}`, bookingService.js L61), permitindo
exploração por enumeração.

EVIDENCE:
FILE: product/SIM-001/src/bookingService.js
LINES: 78-105 (função inteira sem verificação); 97-98 (userId/userRole usados só como metadata); 61 (IDs enumeráveis BKG-N)
FILE: product/SIM-001/requirements/BUSINESS_RULES.md
LINES: 3-7 (BR-SIM-001)
FILE: product/SIM-001/tests/booking.test.js
LINES: 1-163 (suíte completa — ausência de qualquer teste negativo de autorização)

RELATED_PROCESS: cancelamento de reserva
RELATED_BUSINESS_RULE: BR-SIM-001
RELATED_REQUIREMENT: REQ-SIM-002
RELATED_USE_CASE: —
RELATED_ACCEPTANCE_CRITERIA: AC-SIM-002 (cláusula "usuário não é o solicitante nem admin → rejeitado")
RELATED_TEST: nenhum (lacuna — TC negativo inexistente)

BUSINESS_IMPACT: Qualquer usuário pode cancelar reservas de terceiros, com possível cobrança de taxa tardia contra a vítima e negação de serviço da sala.
TECHNICAL_IMPACT: Regra de negócio central ausente; suíte verde dá falsa garantia.
SECURITY_IMPACT: Broken access control / IDOR (cenário da trilha authorization: user-2 com role `user` cancela reserva de user-1 enumerando BKG-N). `userRole` autodeclarado agrava.

REPRODUCTION:
1. user-1 cria reserva (retorna `BKG-1`).
2. user-2 chama `cancelBooking({ bookingId: 'BKG-1', userId: 'user-2', userRole: 'user', now })`.
3. Cancelamento é aceito; reserva vira `cancelled`.

ROOT_CAUSE_HYPOTHESIS: Implementação cobriu apenas a mecânica de taxa (parcial de REQ-SIM-002); a cláusula de autorização de BR-SIM-001 nunca foi codificada nem testada.
REFERENCE: BUSINESS_RULES.md BR-SIM-001; REQUIREMENTS.md REQ-SIM-002/AC-SIM-002; OWASP A01 Broken Access Control.
RECOMMENDATION: Implementar verificação (solicitante OU admin) em `cancelBooking`, com fonte de papel confiável, e adicionar testes negativos referenciando BR-SIM-001. (Remediação é da SanaCore — VeriCore não corrige.)
SUGGESTED_REMEDIATION_OWNER: SanaCore

RETEST_SPECIFICATION:
(a) user-2 com role `user` tenta cancelar reserva de user-1 → erro lançado E a reserva permanece `active`.
(b) O próprio dono cancela a sua reserva → sucesso.
(c) Usuário `admin` cancela reserva de terceiro → sucesso.
(d) Suíte contém testes cobrindo os 3 cenários, referenciando BR-SIM-001.
(e) Suíte completa verde no commit de remediação.

## Validação (finding-validator)

BUSCA POR CONTROLE COMPENSATÓRIO:
- Releitura integral de `product/SIM-001/src/bookingService.js` (123 linhas) — confirmado: `cancelBooking` (L78-105) não faz nenhuma comparação de `userId`/`booking.userId` nem checagem de `userRole === 'admin'`. Os dois parâmetros só alimentam o objeto `cancellation` como metadata (L96-102).
- Releitura integral de `product/SIM-001/tests/booking.test.js` (163 linhas, 6 testes: TC-SIM-001, TC-SIM-001b, TC-SIM-004, TC-SIM-002, TC-SIM-002b, TC-SIM-002c) — nenhum teste chama `cancelBooking` com `userId` diferente do dono da reserva; nenhum teste de rejeição por autorização existe.
- Grep por `cancelBooking` em todo o repositório: 6 ocorrências, todas em `bookingService.js`, `booking.test.js`, `README.md`, `SOFTWARE_RELEASE_PACKAGE.md` e nos próprios artefatos de auditoria — nenhum wrapper, controller, rota HTTP ou camada intermediária que chame `cancelBooking` com verificação prévia.
- Grep por `bookingService` em todo o repositório: mesmas 6 localizações — não existe versão alternativa do módulo, não existe outro arquivo de serviço no escopo SIM-001.
- Grep case-insensitive por `middleware|guard|interceptor|policy|authoriz` dentro de `product/SIM-001/`: única ocorrência é a linha `AUTHORIZATION_MATRIX` em `SOFTWARE_RELEASE_PACKAGE.md` L24, que é **documentação declarativa** ("solicitante: permitido; admin: permitido; demais: negado") — não é código, não impõe nada em runtime, e está em contradição direta com o comportamento real do código. Isso reforça o finding em vez de refutá-lo (falsa garantia documental).
- `README.md` e `SOFTWARE_RELEASE_PACKAGE.md` confirmam a arquitetura: "Serviço único em memória, sem persistência, sem transporte HTTP" (SOFTWARE_RELEASE_PACKAGE.md L16) — não há camada de rede/gateway onde uma verificação de autorização pudesse residir fora da função.
- `TEST_RESULTS` em `SOFTWARE_RELEASE_PACKAGE.md` L26-28 lista exatamente os mesmos 6 testes achados na suíte — confirma que a suíte executada é a suíte lida, sem testes ocultos em outro lugar.

RESULTADO DA BUSCA: nenhum controle compensatório encontrado. Todo o escopo do produto SIM-001 é este único arquivo de serviço; não há outra camada (rede, middleware, gateway, banco) onde a regra pudesse estar implementada.

REPRODUÇÃO TÉCNICA CONFIRMADA POR LEITURA: dado o código em L78-105, a chamada `cancelBooking({ bookingId: 'BKG-1', userId: 'user-2', userRole: 'user', now })` sobre uma reserva criada por `user-1` executa sem lançar erro e retorna `{ status: 'cancelled' }` — não há branch de rejeição no fluxo.

VEREDITO: **CONFIRMED**
JUSTIFICATIVA: Ausência de verificação de autorização comprovada por leitura direta da função inteira (não há `if` algum comparando `userId` ou `userRole`). Ausência de teste negativo comprovada por leitura direta da suíte completa. Busca exaustiva por controle compensatório em qualquer camada do repositório (grep por `cancelBooking`, `bookingService`, termos de autorização/middleware) não encontrou nada que refute o finding — ao contrário, a documentação `AUTHORIZATION_MATRIX` declara uma proteção que não existe no código, agravando o achado (falsa garantia). Finding é reproduzível por leitura estática determinística, sem necessidade de execução. Segue para consolidação como CONFIRMED, elegível para remediação pela SanaCore (Regra 22 do CLAUDE.md).

## Fechamento (software-audit-director)

DATA: 2026-08-13
AUDIT_COMMIT (imutável, inalterado): b736a1e733f802735b1b79348e3c6cc084bd466e
REMEDIATION_COMMIT ACEITO: `08b4323`
REMEDIATION_COMMIT REJEITADO (rodada anterior): `3ca9dd9`
RETEST_REPORT: `audit/runs/SIM-001-AUD-001/30-retest/RETEST_REPORT.md` (Bloco 1)
RETESTE EXECUTADO POR: vericore-audit-verification-runner (execução dinâmica real, independente da suíte do projeto)

RESULTADO DO RETESTE — RODADA v1 (`3ca9dd9`): **RETEST_FAILED**.
O item (c) do RETEST_SPECIFICATION (admin cancela reserva de terceiro → sucesso) retornou
`ERROR "User user-99 is not authorized"`. A implementação v1 restringia o cancelamento
exclusivamente ao dono, negando o papel `admin` que BR-SIM-001 autoriza expressamente. O
item (d) também falhou: a suíte de 8 testes, embora verde, não continha nenhum caso
exercitando o papel `admin`. Retornado à SanaCore.

RESULTADO DO RETESTE — RODADA v2 (`08b4323`): **RETEST_PASSED**.
(a) `mallory` (não-dono, não-admin) → ERROR e a reserva permanece `active`;
(b) `alice` (dona) → SUCCESS;
(c) `root` com `userRole: 'admin'` → SUCCESS, reserva `cancelled`, `cancelledByRole` = `"admin"`;
(d) suíte cobre os 3 cenários, incluindo TC-SIM-007 (cenário admin);
(e) suíte 9/9 verde no REMEDIATION_COMMIT.
Regressão: 10 vetores adversariais de papel não-admin sobre reserva alheia (`undefined`,
`'user'`, `''`, `'ADMIN'`, `'Admin'`, `null`, `' admin '`, `true`, `['admin']`, `userId`
`undefined`) — todos rejeitados, reserva permanecendo `active`; comportamento consistente
com comparação estrita `=== 'admin'` e postura fail-closed. Sem efeito colateral sobre a
taxa (dono e admin cancelando tardiamente → fee 20). Integridade verificada:
`product/SIM-001` byte-idêntico entre `08b4323` e o worktree de reteste.

RESSALVA NÃO ABSORVIDA NESTE FECHAMENTO: a procedência de `userRole` (autodeclarado, sem
camada de autenticação) NÃO faz parte do RETEST_SPECIFICATION (a)-(e) deste finding e
permanece aberta como OBS-SIM-001-A em
`audit/runs/SIM-001-AUD-001/31-new-findings/NEW_OBSERVATIONS.md`. O fechamento abaixo não
a abrange e não a considera mitigada.

DECLARAÇÃO DE AUTORIDADE:
Na condição de **vericore-software-audit-director**, e como única autoridade competente
para declarar reteste e fechamento de finding (Regra 4 do CLAUDE.md), declaro
**RETEST_FAILED** para o commit `3ca9dd9`, **RETEST_PASSED** para o commit `08b4323` e
**FINDING CLOSED** para FIND-SIM-001-001. O fechamento vale exclusivamente para o
REMEDIATION_COMMIT `08b4323`; mudanças posteriores exigem delta audit ou nova auditoria
(Regra 14). Esta declaração não constitui `REMEDIATION COMPLETE` (autoridade da SanaCore)
nem `AUDIT_PASSED` para SIM-001-AUD-001.
