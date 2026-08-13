# FINDING

FINDING_ID: FIND-SIM-001-002
AUDIT_ID: SIM-001-AUD-001
PROJECT_ID: SIM-001
AUDIT_COMMIT: b736a1e733f802735b1b79348e3c6cc084bd466e
TITLE: Taxa de cancelamento tardio de 20% no código contradiz BR-SIM-002 (10%); teste TC-SIM-002b consagra o valor errado
DOMAIN: business-rules
SUBDOMAIN: financial calculation / test-vs-requirement divergence
SEVERITY: HIGH
CONFIDENCE: CONFIRMED
STATUS: CLOSED
DETECTED_BY: business-rule auditor; traceability auditor (dedup pelo evidence-controller)

DESCRIPTION:
BR-SIM-002 (`product/SIM-001/requirements/BUSINESS_RULES.md` L9-13) determina
taxa de **10%** do `price` para cancelamento com menos de 24h de antecedência.
O código define `LATE_CANCEL_FEE_RATE = 0.20`
(`product/SIM-001/src/bookingService.js` L15) e aplica essa taxa em L91-93,
cobrando **20%**. O teste TC-SIM-002b (`product/SIM-001/tests/booking.test.js`
L112-132) assevera `fee === 40` sobre `price 200` (20%) — foi escrito contra o
código, não contra a regra, então a suíte verde mascara a divergência. Não há
ADR ou registro versionado autorizando 20%; pela hierarquia de fontes (Regras 7
e 21 do CLAUDE.md), a BR é a fonte autoritativa.

EXPECTED_BEHAVIOR: Cancelamento <24h antes do início cobra 10% do `price` (ex.: price 200 → fee 20); ≥24h → fee 0.
ACTUAL_BEHAVIOR: Cancelamento <24h cobra 20% (price 200 → fee 40); TC-SIM-002b valida os 20%.

EVIDENCE:
FILE: product/SIM-001/src/bookingService.js
LINES: 15 (`const LATE_CANCEL_FEE_RATE = 0.20;`); 91-93 (aplicação da taxa)
FILE: product/SIM-001/tests/booking.test.js
LINES: 112-132 (TC-SIM-002b — `assert.equal(result.fee, 40)` em L131, price 200)
FILE: product/SIM-001/requirements/BUSINESS_RULES.md
LINES: 9-13 (BR-SIM-002 — 10%)

RELATED_PROCESS: cancelamento de reserva / cobrança de taxa
RELATED_BUSINESS_RULE: BR-SIM-002
RELATED_REQUIREMENT: REQ-SIM-002
RELATED_USE_CASE: —
RELATED_ACCEPTANCE_CRITERIA: AC-SIM-002 (cláusula de taxa de 10%)
RELATED_TEST: TC-SIM-002b (divergente da BR)

BUSINESS_IMPACT: Cobrança em dobro (20% vs 10%) dos usuários em cancelamento tardio — impacto financeiro direto e risco de contestação.
TECHNICAL_IMPACT: Teste escrito contra o código neutraliza a suíte como mecanismo de detecção da divergência.
SECURITY_IMPACT: —

REPRODUCTION: Criar reserva price 200; cancelar com <24h de antecedência; `fee` retorna 40 (esperado pela BR: 20).
ROOT_CAUSE_HYPOTHESIS: Constante codificada com valor incorreto e teste derivado do comportamento observado, sem verificação contra a BR.
REFERENCE: BUSINESS_RULES.md BR-SIM-002; REQUIREMENTS.md AC-SIM-002; CLAUDE.md Regras 7 e 21.
RECOMMENDATION: Corrigir taxa para 0.10 e reescrever TC-SIM-002b citando 10%/BR-SIM-002. Se 20% for decisão de negócio, exige atualização formal da BR com registro (não há hoje). (Remediação é da SanaCore.)
SUGGESTED_REMEDIATION_OWNER: SanaCore

RETEST_SPECIFICATION:
(a) price 200, cancelamento <24h antes do início → fee = 20.
(b) Cancelamento exatamente 24h antes → fee = 0.
(c) Cancelamento >24h antes → fee = 0.
(d) TC-SIM-002b corrigido, citando 10% e BR-SIM-002.
(e) Suíte completa verde no commit de remediação.

## Validação (finding-validator)

BUSCA POR CONTROLE COMPENSATÓRIO:
- Releitura de `product/SIM-001/src/bookingService.js`: L15 confirma `const LATE_CANCEL_FEE_RATE = 0.20;`; L91-93 confirma `fee = isLateCancellation ? Math.round(booking.price * LATE_CANCEL_FEE_RATE * 100) / 100 : 0;` — nenhuma outra constante, feature flag, override por sala/usuário, ou parâmetro que pudesse reduzir a taxa efetiva para 10% em algum cenário. `LATE_CANCEL_FEE_RATE` é módulo-level, imutável, sem leitura de config externa.
- Releitura de `product/SIM-001/requirements/BUSINESS_RULES.md` L9-13: texto explícito "cobra taxa de **10%**" — sem ressalva, sem cláusula condicional que justificasse 20% em algum caso.
- Grep por `LATE_CANCEL_FEE_RATE`, `BR-SIM-002`, `BR-SIM-001` no repositório inteiro: ocorrências restritas a `bookingService.js`, `BUSINESS_RULES.md`, `SOFTWARE_RELEASE_PACKAGE.md` e artefatos de auditoria. Nenhum ADR, changelog, ou registro versionado em qualquer lugar do repo (busca por "ADR" em `product/SIM-001/` retornou apenas `SOFTWARE_RELEASE_PACKAGE.md` L17: "ADRS: N/A") autorizando desvio de 10% para 20%.
- Releitura de `booking.test.js` L112-132 (TC-SIM-002b): `assert.equal(result.fee, 40)` sobre `price: 200` — confirma que o teste foi calibrado sobre o comportamento observado do código (20%), não sobre a BR (10%, que daria fee=20). Nenhum outro teste na suíte testa a taxa de cancelamento tardio com valor diferente.
- Nenhuma camada de configuração, wrapper de negociação, ou desconto/ajuste posterior encontrado que pudesse fazer a taxa efetivamente cobrada divergir do valor calculado em L91-93 — a função retorna `fee` diretamente ao chamador sem pós-processamento.

RESULTADO DA BUSCA: nenhum controle compensatório, ADR ou justificativa formal encontrados. A divergência entre código (20%) e BR-SIM-002 (10%) é direta, reproduzível estaticamente, e o teste existente consagra o valor do código em vez de validar contra o requisito — exatamente como descrito no finding original.

VEREDITO: **CONFIRMED**
JUSTIFICATIVA: Constante e aplicação de taxa lidas diretamente no código (bookingService.js L15, L91-93) confirmam 20%; BR-SIM-002 (BUSINESS_RULES.md L9-13) exige 10%; nenhuma fonte autoritativa (ADR, registro versionado) encontrada que legitime 20%. Pela Regra 21 do CLAUDE.md (contradição entre documento e código deve ser resolvida pela fonte autoritativa — aqui, a BR versionada prevalece sobre a constante do código não documentada como decisão formal). Busca por controle compensatório (config externa, override, pós-processamento) não encontrou nada. Segue para consolidação como CONFIRMED.

## Fechamento (software-audit-director)

DATA: 2026-08-13
AUDIT_COMMIT (imutável, inalterado): b736a1e733f802735b1b79348e3c6cc084bd466e
REMEDIATION_COMMIT ACEITO: `0e76a1c`
RETEST_REPORT: `audit/runs/SIM-001-AUD-001/30-retest/RETEST_REPORT.md` (Bloco 2)
RETESTE EXECUTADO POR: vericore-audit-verification-runner (execução dinâmica real, independente da suíte do projeto)
RODADAS: 1

RESULTADO DO RETESTE: **RETEST_PASSED**.
Bug original não reproduzível: `price` 200 com cancelamento a 16h do início → `fee` = 20
(10%), não mais 40. RETEST_SPECIFICATION integralmente satisfeito — (a) fee 20; (b)
exatamente 24h → fee 0; (c) 48h → fee 0; (d) TC-SIM-002b corrigido citando 10% /
BR-SIM-002; (e) suíte 7/7 verde no REMEDIATION_COMMIT.
Regressão independente: oito sondagens adicionais além do retest spec — antecedências de
23h59m59s, 24h+1ms, 1h, 0h e -2h, e preços 1000, 333 e 0 — todas resultando em 10% dentro
da janela tardia e 0 fora dela, sem descontinuidade de fronteira nem caso especial
embutido. Isso demonstra correção estrutural da alíquota, e não um ajuste calibrado ao
caso do finding. Integridade verificada: blob de `bookingService.js` bit-a-bit idêntico ao
do REMEDIATION_COMMIT `0e76a1c`.
A fonte autoritativa foi respeitada na direção correta (Regras 7 e 21): o código foi
alinhado à BR-SIM-002 versionada, e não a BR ao código.

RESSALVA NÃO ABSORVIDA NESTE FECHAMENTO: a aceitação de cancelamento APÓS o início da
reserva, com cobrança de taxa (observada na sondagem de -2h), não é coberta por nenhuma BR
e é pré-existente ao AUDIT_COMMIT. Não faz parte do RETEST_SPECIFICATION deste finding e
permanece aberta como OBS-SIM-001-B em
`audit/runs/SIM-001-AUD-001/31-new-findings/NEW_OBSERVATIONS.md`. O fechamento abaixo não
a abrange.

DECLARAÇÃO DE AUTORIDADE:
Na condição de **vericore-software-audit-director**, e como única autoridade competente
para declarar reteste e fechamento de finding (Regra 4 do CLAUDE.md), declaro
**RETEST_PASSED** para o REMEDIATION_COMMIT `0e76a1c` e **FINDING CLOSED** para
FIND-SIM-001-002. O fechamento vale exclusivamente para esse commit; mudanças posteriores
exigem delta audit ou nova auditoria (Regra 14). Esta declaração não constitui
`REMEDIATION COMPLETE` (autoridade da SanaCore) nem `AUDIT_PASSED` para SIM-001-AUD-001.
