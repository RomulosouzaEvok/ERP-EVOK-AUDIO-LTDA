# RETEST_REPORT (VeriCore → CoreTriad)

AUDIT_ID: SIM-001-AUD-001
PROJECT_ID: SIM-001
AUDIT_COMMIT: b736a1e733f802735b1b79348e3c6cc084bd466e
EMITIDO_POR: vericore-software-audit-director
DATA: 2026-08-13
EXECUÇÃO DOS RETESTES: vericore-audit-verification-runner (execução dinâmica real; scripts de reteste mantidos FORA do repositório; working tree limpo antes e depois de cada rodada)
CONTRATO BASE: `coretriad/contracts/RETEST_REPORT.md`

## Nota de imutabilidade do AUDIT_COMMIT (Regras 12-14 do CLAUDE.md)

O `AUDIT_COMMIT` desta auditoria permanece **b736a1e733f802735b1b79348e3c6cc084bd466e**, imutável e
referenciado como baseline de todos os findings. Nenhum reteste alterou, rebaseou ou
substituiu o AUDIT_COMMIT. Os retestes foram executados sobre `REMEDIATION_COMMIT`s
distintos, produzidos pela SanaCore, e são avaliados **contra** o comportamento
observado no AUDIT_COMMIT e contra o `RETEST_SPECIFICATION` registrado em cada finding
no momento da confirmação. Qualquer mudança posterior aos REMEDIATION_COMMITs aqui
aceitos exige delta audit ou nova auditoria (Regra 14) — o fechamento declarado neste
relatório vale exclusivamente para os commits nomeados abaixo.

VeriCore não corrigiu, não refatorou e não alterou o objeto auditado em nenhum momento
(Regra 2). Nenhum artefato de `product/`, `src/` ou `tests/` foi escrito por esta trilha.

---

## Bloco 1 — FIND-SIM-001-001 (CRITICAL — autorização de cancelamento)

FINDING_ID: FIND-SIM-001-001
CASE_ID: remediação SanaCore — autorização de cancelamento (BR-SIM-001)
AUDIT_COMMIT: b736a1e733f802735b1b79348e3c6cc084bd466e
SEVERIDADE / CONFIANÇA: CRITICAL / CONFIRMED

Este finding exigiu **duas rodadas de reteste**. Ambas ficam registradas: a rodada v1
não é apagada nem substituída pela v2 (Regra 15 — evidência histórica é preservada).

### Rodada v1

REMEDIATION_COMMIT: `3ca9dd9`

MÉTODO:
- Reprodução independente do cenário original (não-dono cancelando reserva alheia),
  fora da suíte do projeto, via script de execução dinâmica externo ao repositório.
- Execução item a item do `RETEST_SPECIFICATION` (a)-(e) do finding.
- Execução da suíte do projeto no commit de remediação.

ORIGINAL_REPRODUCTION_RESULT: bug original **não** mais reproduzível no item (a) — não-dono
recebe erro e a reserva permanece `active`.

RETEST_SPEC_EXECUTED: SIM — parcialmente satisfeito:
- (a) não-dono tenta cancelar reserva de terceiro → erro lançado. **OK**
- (b) dono cancela a própria reserva → sucesso. **OK**
- (c) usuário `admin` cancela reserva de terceiro → **FALHOU**. A execução retornou
  `ERROR "User user-99 is not authorized"`. O `RETEST_SPECIFICATION` item (c) exige
  **SUCESSO** para o papel `admin`, conforme BR-SIM-001 ("solicitante OU admin").
- (d) suíte cobrindo os 3 cenários referenciando BR-SIM-001 → **FALHOU**. A suíte v1
  estava 8/8 verde, porém **sem nenhum teste do cenário admin** — a verde da suíte não
  demonstrava o item (c); pelo contrário, mascarava a sua ausência.
- (e) suíte verde no commit de remediação → 8/8 verde (fato isolado, insuficiente).

REGRESSION_EXECUTED: não concluída — reteste interrompido pela falha de especificação em (c)/(d).

SIDE_EFFECTS_CHECKED: SIM — a correção v1 introduziu **regressão funcional de negócio**:
o papel `admin`, explicitamente autorizado por BR-SIM-001, passou a ser negado. A
implementação v1 trocou "qualquer um pode cancelar" por "somente o dono pode cancelar",
o que é uma implementação **incompleta** da regra, não a regra.

REQUIREMENT_RECHECKED: SIM — BR-SIM-001 (`product/SIM-001/requirements/BUSINESS_RULES.md` L3-7)
e AC-SIM-002 (`REQUIREMENTS.md` L25-29) exigem as duas vias de autorização.

DOCUMENTATION_RECHECKED: SIM — `AUTHORIZATION_MATRIX` do `SOFTWARE_RELEASE_PACKAGE.md`
("solicitante: permitido; admin: permitido; demais: negado") continuava divergente do
comportamento real em v1, agora pela via oposta (admin negado).

**RESULT: RETEST_FAILED**

NEW_EVIDENCE_IF_FAILED: cenário (c) do RETEST_SPECIFICATION — `admin` cancelando reserva
de terceiro — retornou `ERROR "User user-99 is not authorized"` quando o esperado era
SUCESSO. Adicionalmente, a suíte de 8 testes declarada verde não continha nenhum caso
exercitando o papel `admin`, portanto não constituía evidência de cobertura do item (d).

FINAL_STATUS (v1): **RETURNED_TO_SANACORE**

### Rodada v2

REMEDIATION_COMMIT: `08b4323`

MÉTODO:
- Reprodução independente do cenário original de IDOR, fora da suíte, em script externo
  ao repositório.
- Execução item a item do `RETEST_SPECIFICATION` (a)-(e).
- **Bateria de regressão de autorização** com 10 vetores adversariais de papel.
- Verificação de não-regressão do cálculo de taxa (interação com FIND-SIM-001-002).
- Verificação de integridade do objeto auditado entre o REMEDIATION_COMMIT e o worktree
  em que o reteste rodou.

ORIGINAL_REPRODUCTION_RESULT: bug original **não reproduzível**. `mallory` (não-dono,
não-admin) → ERROR lançado E a reserva permanece `active` (estado verificado após a
tentativa, não apenas o lançamento da exceção).

RETEST_SPEC_EXECUTED: SIM — todos os itens satisfeitos:
- (a) `mallory` cancela reserva de `alice` → ERROR + reserva permanece `active`. **OK**
- (b) `alice` (dona) cancela a própria reserva → SUCCESS. **OK**
- (c) `root` com `userRole: 'admin'` cancela reserva de terceiro → SUCCESS, reserva
  `cancelled`, `cancelledByRole` registrado como `"admin"`. **OK** (item que reprovou em v1)
- (d) suíte contém os 3 cenários referenciando BR-SIM-001, incluindo **TC-SIM-007**
  (cenário admin, ausente em v1). **OK**
- (e) suíte completa 9/9 verde no REMEDIATION_COMMIT. **OK**

REGRESSION_EXECUTED: SIM — 10 vetores de papel não-admin tentando cancelar reserva alheia:
`undefined`, `'user'`, `''`, `'ADMIN'`, `'Admin'`, `null`, `' admin '` (com espaços),
`true`, `['admin']` (array), e `userId` `undefined`. **TODOS rejeitados**, com a reserva
permanecendo `active` em cada caso. Comportamento consistente com comparação estrita
`=== 'admin'` e postura **fail-closed** — sem coerção de tipo, sem normalização
permissiva de caixa ou de espaços, sem bypass por valor ausente.

SIDE_EFFECTS_CHECKED: SIM — a lógica de taxa continua operando após a introdução da
autorização: dono cancelando tardiamente → fee 20; admin cancelando tardiamente → fee 20.
A autorização não curto-circuitou nem alterou o cálculo financeiro.

REQUIREMENT_RECHECKED: SIM — BR-SIM-001 satisfeita nas duas vias (solicitante OU admin),
AC-SIM-002 satisfeito na cláusula de rejeição.

DOCUMENTATION_RECHECKED: SIM — o comportamento em runtime passa a corresponder ao
`AUTHORIZATION_MATRIX` declarado no `SOFTWARE_RELEASE_PACKAGE.md`; a falsa garantia
documental apontada na validação original deixou de existir.

INTEGRIDADE DO OBJETO RETESTADO: verificado que `product/SIM-001` é **byte-idêntico**
entre o REMEDIATION_COMMIT `08b4323` e o HEAD do worktree onde o reteste foi executado —
ou seja, o reteste incidiu exatamente sobre o código do commit declarado, sem
contaminação por alterações locais.

**RESULT: RETEST_PASSED**

NEW_EVIDENCE_IF_FAILED: n/a

FINAL_STATUS: **CLOSED** (commit aceito: `08b4323`)

RESSALVA REGISTRADA (não bloqueante, não absorvida no fechamento): a confiabilidade da
origem de `userRole` permanece fora do escopo desta correção — ver
`31-new-findings/NEW_OBSERVATIONS.md`, OBS-SIM-001-A.

---

## Bloco 2 — FIND-SIM-001-002 (HIGH — taxa de cancelamento tardio 10% vs 20%)

FINDING_ID: FIND-SIM-001-002
CASE_ID: remediação SanaCore — taxa de cancelamento tardio (BR-SIM-002)
AUDIT_COMMIT: b736a1e733f802735b1b79348e3c6cc084bd466e
REMEDIATION_COMMIT: `0e76a1c`
SEVERIDADE / CONFIANÇA: HIGH / CONFIRMED

MÉTODO:
- Reprodução independente do cenário original (price 200, cancelamento tardio) fora da
  suíte, em script externo ao repositório.
- Execução item a item do `RETEST_SPECIFICATION` (a)-(e).
- **Regressão por sondagem de fronteira e de escala**: varredura de valores em torno do
  limite de 24h e de faixas de preço, para confirmar que a correção é a mudança de
  alíquota e não um ajuste pontual calibrado para o caso do finding.
- Verificação de integridade binária do artefato retestado.

ORIGINAL_REPRODUCTION_RESULT: bug original **não reproduzível**. `price` 200 com
cancelamento a 16h do início → `fee` = **20** (10%), não mais 40 (20%).

RETEST_SPEC_EXECUTED: SIM — todos os itens satisfeitos:
- (a) price 200, cancelamento <24h → fee 20. **OK**
- (b) cancelamento exatamente 24h antes → fee 0. **OK** (fronteira tratada como
  "não tardio", coerente com "menos de 24h" da BR-SIM-002)
- (c) cancelamento >24h antes (48h) → fee 0. **OK**
- (d) TC-SIM-002b corrigido para 10% / BR-SIM-002. **OK**
- (e) suíte completa 7/7 verde no REMEDIATION_COMMIT. **OK**

REGRESSION_EXECUTED: SIM — oito sondagens adicionais além do retest spec:
antecedências de 23h59m59s, 24h+1ms, 1h, 0h e -2h (cancelamento após o início), e preços
1000, 333 e 0. Resultado: **10% em toda a janela tardia e 0 fora dela**, sem
descontinuidade, sem arredondamento anômalo e sem caso especial embutido. Confirma
correção estrutural da alíquota, não um patch de caso de teste.

SIDE_EFFECTS_CHECKED: SIM — nenhuma alteração observada no fluxo de criação de reserva
nem no estado da reserva cancelada além do valor de `fee`.

REQUIREMENT_RECHECKED: SIM — BR-SIM-002 (`BUSINESS_RULES.md` L9-13, taxa de 10%) e
AC-SIM-002. A fonte autoritativa (BR versionada) prevaleceu sobre a constante de código,
conforme Regras 7 e 21 — e a remediação alinhou o código à BR, não o inverso.

DOCUMENTATION_RECHECKED: SIM — não foi criado ADR autorizando 20%; a divergência foi
resolvida por conformidade do código à regra existente, que é o desfecho correto.

INTEGRIDADE DO OBJETO RETESTADO: o blob de `bookingService.js` no worktree de reteste é
**bit-a-bit idêntico** ao do REMEDIATION_COMMIT `0e76a1c`.

**RESULT: RETEST_PASSED**

NEW_EVIDENCE_IF_FAILED: n/a

FINAL_STATUS: **CLOSED** (commit aceito: `0e76a1c`)

RESSALVA REGISTRADA (não bloqueante, não absorvida no fechamento): a aceitação de
cancelamento **após o início** da reserva, com cobrança de taxa, foi observada durante a
sondagem de -2h e não é coberta por nenhuma BR — ver `31-new-findings/NEW_OBSERVATIONS.md`,
OBS-SIM-001-B. Não é regressão introduzida pela remediação (é pré-existente) e por isso
não impede o fechamento deste finding.

---

## Bloco 3 — FIND-SIM-001-003 (HIGH — TC-SIM-003 ausente / lacuna de cobertura)

FINDING_ID: FIND-SIM-001-003
CASE_ID: remediação SanaCore — implementação de TC-SIM-003 (BR-SIM-003)
AUDIT_COMMIT: b736a1e733f802735b1b79348e3c6cc084bd466e
REMEDIATION_COMMIT: `8297779`
SEVERIDADE / CONFIANÇA: HIGH / CONFIRMED

MÉTODO:
- Este finding é uma **lacuna de cobertura**, não um defeito funcional. Portanto o
  reteste não podia se apoiar na verde da suíte (a verde era exatamente o sintoma
  original). O método aplicado foi duplo:
  (i) **reprodução manual independente**, fora da suíte, do comportamento de
      não-sobreposição, para estabelecer a verdade de referência do serviço;
  (ii) **leitura linha a linha** dos testes adicionados, confrontando cada asserção com
      cada item do `RETEST_SPECIFICATION` — para verificar que os testes de fato
      distinguem rejeição de aceitação e não passariam trivialmente.
- Execução da suíte completa no commit de remediação.

ORIGINAL_REPRODUCTION_RESULT: a lacuna original **não persiste** — `TC-SIM-003` existe na
suíte no REMEDIATION_COMMIT.

RETEST_SPEC_EXECUTED: SIM. A leitura linha a linha confirmou os casos **TC-SIM-003a..g**
cobrindo os 7 itens (a)-(g) do `RETEST_SPECIFICATION` — sobreposição parcial no início,
sobreposição parcial no fim, intervalo contido, intervalo contendo, adjacência aceita,
mesma janela em sala diferente aceita, e mesma janela sobre reserva cancelada aceita —
com asserções que **distinguem rejeição de aceitação** (não são asserções vazias nem
tautológicas). Item (h): suíte completa **13/13 verde** no REMEDIATION_COMMIT.

REGRESSION_EXECUTED: SIM — 3 cenários reproduzidos manualmente FORA da suíte, como
controle independente contra testes auto-confirmatórios: sobreposta rejeitada; adjacente
`[12:00,13:00)` após `[10:00,12:00)` aceita; mesma janela em sala diferente aceita. Os
três resultados bateram com o esperado pela BR-SIM-003 e com o que os novos testes
asseveram — ou seja, os testes descrevem o comportamento real e o comportamento real
está conforme a regra.

SIDE_EFFECTS_CHECKED: SIM — nenhuma alteração de comportamento do serviço foi requerida
ou observada; a semântica `[start, end)` permanece a mesma validada no AUDIT_COMMIT.

REQUIREMENT_RECHECKED: SIM — REQ-SIM-003 / AC-SIM-003 / BR-SIM-003. Cadeia de
rastreabilidade REQ→TC restabelecida: o TC planejado deixou de ser apenas planejado.

DOCUMENTATION_RECHECKED: SIM — a lacuna declarada na `TRACEABILITY_MATRIX.md` desta
auditoria refere-se ao AUDIT_COMMIT e permanece válida para aquele commit; está sanada no
REMEDIATION_COMMIT `8297779`.

**RESULT: RETEST_PASSED**

NEW_EVIDENCE_IF_FAILED: n/a

FINAL_STATUS: **CLOSED** (commit aceito: `8297779`)

Sem lacuna remanescente identificada para este finding.

---

## Consolidação

| FINDING | SEV | REMEDIATION_COMMIT aceito | RODADAS | RESULTADO FINAL |
|---|---|---|---|---|
| FIND-SIM-001-001 | CRITICAL | `08b4323` | v1 `3ca9dd9` = RETEST_FAILED; v2 `08b4323` = RETEST_PASSED | **FINDING CLOSED** |
| FIND-SIM-001-002 | HIGH | `0e76a1c` | 1 | **FINDING CLOSED** |
| FIND-SIM-001-003 | HIGH | `8297779` | 1 | **FINDING CLOSED** |

## Declaração de autoridade

Na condição de **vericore-software-audit-director**, e como única autoridade competente
para tal (Regra 4 do CLAUDE.md), declaro:

- **RETEST_FAILED** para FIND-SIM-001-001 sobre o REMEDIATION_COMMIT `3ca9dd9` (v1).
- **RETEST_PASSED** para FIND-SIM-001-001 sobre o REMEDIATION_COMMIT `08b4323` (v2).
- **RETEST_PASSED** para FIND-SIM-001-002 sobre o REMEDIATION_COMMIT `0e76a1c`.
- **RETEST_PASSED** para FIND-SIM-001-003 sobre o REMEDIATION_COMMIT `8297779`.
- **FINDING CLOSED** para FIND-SIM-001-001, FIND-SIM-001-002 e FIND-SIM-001-003.

Este relatório **não** declara `REMEDIATION COMPLETE` — essa declaração é autoridade da
SanaCore e não da VeriCore. Este relatório **não** declara `AUDIT_PASSED` para
SIM-001-AUD-001: o veredito global da auditoria depende do tratamento dos demais findings
do run (FIND-SIM-001-004, -005, -006) e da cobertura demonstrada na
`AUDIT_COVERAGE_MATRIX`, fora do escopo deste documento.

Observações levantadas durante os retestes e **não** absorvidas nestes fechamentos estão
registradas separadamente em
`audit/runs/SIM-001-AUD-001/31-new-findings/NEW_OBSERVATIONS.md`.
