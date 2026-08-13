# FINDING

FINDING_ID: FIND-SIM-001-003
AUDIT_ID: SIM-001-AUD-001
PROJECT_ID: SIM-001
AUDIT_COMMIT: b736a1e733f802735b1b79348e3c6cc084bd466e
TITLE: TC-SIM-003 planejado não existe — BR-SIM-003 (não sobreposição) implementada corretamente mas 100% sem teste
DOMAIN: quality / traceability
SUBDOMAIN: test coverage gap
SEVERITY: HIGH
CONFIDENCE: CONFIRMED
STATUS: CLOSED
DETECTED_BY: traceability auditor; business-rule auditor (dedup pelo evidence-controller)

DESCRIPTION:
REQ-SIM-003 (`product/SIM-001/requirements/REQUIREMENTS.md` L32-42) planeja o
TC-SIM-003 para a rejeição de sobreposição (BR-SIM-003). O teste não existe na
suíte (`product/SIM-001/tests/booking.test.js` — contém apenas TC-SIM-001,
001b, 002, 002b, 002c e 004). A implementação em
`product/SIM-001/src/bookingService.js` L46-58 está correta por leitura
(semântica `[start, end)` via comparações estritas em L50-51:
`start < booking.end && end > booking.start`), mas sem nenhum teste. Uma
regressão de `<` para `<=` (que passaria a rejeitar reservas adjacentes) ou de
`<` para remoção da checagem passaria despercebida pela suíte verde.

EXPECTED_BEHAVIOR: TC-SIM-003 presente na suíte cobrindo AC-SIM-003 (sobreposições rejeitadas, adjacências aceitas).
ACTUAL_BEHAVIOR: BR-SIM-003 sem qualquer cobertura de teste; TC planejado ausente.

EVIDENCE:
FILE: product/SIM-001/src/bookingService.js
LINES: 46-58 (checagem de sobreposição, correta); 50-51 (semântica [start, end))
FILE: product/SIM-001/requirements/REQUIREMENTS.md
LINES: 32-42 (REQ-SIM-003 / AC-SIM-003 / "TC planejado: TC-SIM-003")
FILE: product/SIM-001/tests/booking.test.js
LINES: 1-163 (ausência de TC-SIM-003 em toda a suíte)

RELATED_PROCESS: criação de reserva
RELATED_BUSINESS_RULE: BR-SIM-003
RELATED_REQUIREMENT: REQ-SIM-003
RELATED_USE_CASE: —
RELATED_ACCEPTANCE_CRITERIA: AC-SIM-003
RELATED_TEST: TC-SIM-003 (planejado, inexistente)

BUSINESS_IMPACT: Risco de double-booking silencioso em regressões futuras (regra central do produto sem rede de segurança).
TECHNICAL_IMPACT: Cadeia REQ→TC quebrada; suíte não protege a regra mais crítica de integridade de agenda.
SECURITY_IMPACT: —

REPRODUCTION: Inspeção — grep por "TC-SIM-003" na suíte retorna vazio; REQUIREMENTS.md L42 o declara planejado.
ROOT_CAUSE_HYPOTHESIS: Teste planejado nunca foi implementado; release seguiu com suíte verde por ausência (não por cobertura).
REFERENCE: REQUIREMENTS.md REQ-SIM-003/AC-SIM-003; BUSINESS_RULES.md BR-SIM-003.
RECOMMENDATION: Implementar TC-SIM-003 cobrindo os casos do RETEST_SPECIFICATION. (Remediação é da SanaCore/OpusCore conforme designação do Director.)
SUGGESTED_REMEDIATION_OWNER: SanaCore

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

## Validação (finding-validator)

BUSCA POR CONTROLE COMPENSATÓRIO:
- Releitura integral de `product/SIM-001/tests/booking.test.js` (163 linhas): testes presentes são exatamente TC-SIM-001, TC-SIM-001b, TC-SIM-004, TC-SIM-002, TC-SIM-002b, TC-SIM-002c. Nenhum teste cria duas reservas na mesma sala com intervalos sobrepostos para verificar rejeição — TC-SIM-001 chega a criar duas reservas com o mesmo horário, mas em salas diferentes (`room-a` e `room-b`, L11-31), o que não exercita a checagem de sobreposição (o `for` em L47-58 do serviço filtra por `roomId`, então salas diferentes nunca colidem).
- Grep por `TC-SIM-003` em todo o repositório: só aparece no próprio finding, na `TRACEABILITY_MATRIX.md` (auditoria) e em `REQUIREMENTS.md` L42 como "TC planejado" — confirmando que nunca foi implementado em nenhum branch/arquivo do repo, não apenas no commit auditado.
- Grep por `bookingService` e `cancelBooking`/`createBooking` fora de `product/SIM-001/`: nenhuma outra suíte de teste no repositório (ex.: `server/tests/`) referencia este módulo — SIM-001 é um projeto isolado, sem integração com o restante do ERP, então não há cobertura "escondida" em outra pasta de testes.
- `SOFTWARE_RELEASE_PACKAGE.md` L26-28 (`TEST_RESULTS`) declarado pela OpusCore lista exatamente os mesmos 6 testes (TC-SIM-001, 001b, 004, 002, 002b, 002c) como "pass 6" — confirma independentemente, pela própria declaração de release, que TC-SIM-003 nunca foi executado nem existe.
- Verificação da implementação em si (`bookingService.js` L46-58): por leitura, a lógica está correta (`start < booking.end && end > booking.start`, semântica `[start, end)`), o que o finding já reconhece — a questão não é bug funcional, é ausência de rede de segurança de regressão, que é o cerne do finding (test coverage gap, não incorreção funcional).

RESULTADO DA BUSCA: nenhum teste equivalente a TC-SIM-003 encontrado em qualquer lugar do repositório, nem cobertura indireta (os testes existentes usam salas diferentes, o que não exercita o branch de rejeição por sobreposição). Nenhuma suíte externa ao módulo SIM-001 cobre este código.

VEREDITO: **CONFIRMED**
JUSTIFICATIVA: Ausência de TC-SIM-003 confirmada por leitura completa e por grep exaustivo em todo o repositório — inclusive nenhuma cobertura indireta nos testes existentes, já que estes usam salas distintas e não exercitam o branch de sobreposição. A própria declaração de release da OpusCore (`SOFTWARE_RELEASE_PACKAGE.md`) corrobora a lacuna ao listar apenas 6 testes, sem TC-SIM-003. Gap de rastreabilidade REQ→TC reproduzível e demonstrável sem necessidade de execução. Segue para consolidação como CONFIRMED.

## Fechamento (software-audit-director)

DATA: 2026-08-13
AUDIT_COMMIT (imutável, inalterado): b736a1e733f802735b1b79348e3c6cc084bd466e
REMEDIATION_COMMIT ACEITO: `8297779`
RETEST_REPORT: `audit/runs/SIM-001-AUD-001/30-retest/RETEST_REPORT.md` (Bloco 3)
RETESTE EXECUTADO POR: vericore-audit-verification-runner
RODADAS: 1

RESULTADO DO RETESTE: **RETEST_PASSED**.
Por se tratar de lacuna de cobertura (e não de defeito funcional), o reteste não se apoiou
na verde da suíte — a verde era exatamente o sintoma original. Foram aplicados dois
métodos independentes: (i) reprodução manual de 3 cenários FORA da suíte — sobreposta
rejeitada, adjacente aceita, sala diferente aceita — todos batendo com o comportamento
esperado por BR-SIM-003; e (ii) leitura linha a linha dos testes adicionados, confirmando
os casos **TC-SIM-003a..g** cobrindo os 7 itens (a)-(g) do RETEST_SPECIFICATION, com
asserções que efetivamente distinguem rejeição de aceitação (não tautológicas, não
vazias). Item (h): suíte completa **13/13 verde** no REMEDIATION_COMMIT.
A cadeia de rastreabilidade REQ-SIM-003 → AC-SIM-003 → TC-SIM-003 está restabelecida. Sem
lacuna remanescente identificada. Nenhum efeito colateral: a implementação do serviço não
foi alterada; a semântica `[start, end)` permanece a mesma validada no AUDIT_COMMIT.

NOTA DE ESCOPO: a lacuna registrada na `TRACEABILITY_MATRIX.md` desta auditoria refere-se
ao AUDIT_COMMIT `b736a1e` e permanece verdadeira para aquele commit — evidência histórica
não é reescrita (Regra 15). A lacuna está sanada no REMEDIATION_COMMIT `8297779`.

DECLARAÇÃO DE AUTORIDADE:
Na condição de **vericore-software-audit-director**, e como única autoridade competente
para declarar reteste e fechamento de finding (Regra 4 do CLAUDE.md), declaro
**RETEST_PASSED** para o REMEDIATION_COMMIT `8297779` e **FINDING CLOSED** para
FIND-SIM-001-003. O fechamento vale exclusivamente para esse commit; mudanças posteriores
exigem delta audit ou nova auditoria (Regra 14). Esta declaração não constitui
`REMEDIATION COMPLETE` (autoridade da SanaCore) nem `AUDIT_PASSED` para SIM-001-AUD-001.
