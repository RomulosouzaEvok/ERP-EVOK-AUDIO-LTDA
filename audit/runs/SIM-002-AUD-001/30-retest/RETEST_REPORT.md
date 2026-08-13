# RETEST REPORT — SIM-002-AUD-001

AUDIT_ID: SIM-002-AUD-001
PROJECT_ID: SIM-002
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
DATA: 2026-08-13
EMITIDO_POR: vericore-software-audit-director
BASE CONTRATUAL: `coretriad/contracts/RETEST_REPORT.md`
EXECUÇÃO TÉCNICA DO RETESTE: vericore-audit-verification-runner (harness próprio, fora do repositório)

> Autoridade: somente a VeriCore declara `RETEST_PASSED` e `FINDING CLOSED`
> (Regra 4 do `CLAUDE.md`). A VeriCore não corrigiu, não refatorou e não tocou
> em `product/`, `src/` ou `tests/` (Regra 2).

> **Histórico preservado.** As seções 0 a 4 registram as ondas A, B e C e o
> veredito emitido naquele momento. A seção 5 acrescenta a rodada WAVE-D. A
> seção 6 substitui o veredito de run da seção 3, que passa a valer como
> **registro histórico** e não como decisão vigente. Nada foi apagado.

---

## 0. Ondas de remediação retestadas

| Onda | REMEDIATION_COMMIT | Findings no escopo | Suíte |
|---|---|---|---:|
| WAVE-A | `f0aaa7a` (produto byte-idêntico ao HEAD, verificado por hash de árvore) | FIND-001, FIND-007, FIND-008 (divergência B) | 20/20 |
| WAVE-B | `9f7b056` | FIND-002, FIND-011 | 17/17 |
| WAVE-C | `9ce4754` | FIND-003, FIND-005, FIND-006 | 22/22 |
| WAVE-D | `b6d44da` (integra A+B+C; produto idêntico ao HEAD) | FIND-004, FIND-008 (divergência A) + OBS-002, FIND-009 | 49/49 |

Condição de independência atendida: o runner executou scripts próprios, fora do
repositório, sem reutilizar a suíte da OpusCore/SanaCore como única prova, e —
para WAVE-B e WAVE-D — extraiu o código do `AUDIT_COMMIT` via `git show` e
submeteu original e remediado ao **mesmo** harness, obtendo reprodução do bug
original.

Limitação de escopo registrada de saída: este reteste cobre **os findings
listados**, no commit de remediação de cada onda. Não é auditoria do commit
remediado como um todo. Mudanças posteriores ao `AUDIT_COMMIT` exigem delta audit
(Regras 12-14) — ver §3, §6 e `31-new-findings/NEW_OBSERVATIONS.md`.

---

## 1. Blocos por finding

### 1.1 FIND-SIM-002-001 — Alçada do analista em 50000 contra BR-APR-001 (CRITICAL)

FINDING_ID: FIND-SIM-002-001
CASE_ID: WAVE-A
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
REMEDIATION_COMMIT: f0aaa7a

ORIGINAL_REPRODUCTION_RESULT: **não reproduz mais**. O cenário 3 da
`RETEST_SPECIFICATION` (`analyst` + 49999), que passava no `AUDIT_COMMIT`, agora
é recusado.

RETEST_SPEC_EXECUTED: os quatro cenários exigidos, integralmente:
1. `analyst` + 10000 → **ACEITA**, com releitura do banco: `credit_limit = 10000`.
2. `analyst` + 10000.01 → **RECUSA**, com pós-condição verificada por releitura:
   `status = 'pending'`, `credit_limit = 0`, `approved_by = NULL`.
3. `analyst` + 49999 → **RECUSA**, idem pós-condição.
4. `manager` + 25000 → **ACEITA**.

Verificação estrutural complementar: constante alinhada a 10000 e comparador `>`
estrito — a fronteira inclusiva de BR-APR-001 ("até R$ 10.000,00 **inclusive**")
é reproduzida com exatidão, e não por aproximação.

REGRESSION_EXECUTED: suíte 20/20; cenário 4 (`manager`) preserva o caminho
positivo; working tree limpo antes e depois da execução.

SIDE_EFFECTS_CHECKED: sim — a pós-condição foi verificada por **releitura do
fornecedor no banco**, não apenas pela exceção lançada. Nenhuma escrita parcial
na recusa. Efeito colateral incidental detectado em terreno vizinho
(`approved_by = "77.0"`) → registrado como observação OBS-SIM-002-001, **não
imputado a este finding** (não altera o cumprimento de BR-APR-001).

REQUIREMENT_RECHECKED: BR-APR-001 (`requirements/BUSINESS_RULES.md:24-27`),
REQ-SIM2-002 / AC-SIM2-002. Comportamento medido é congruente com a norma nas
quatro faixas, incluindo a fronteira.

DOCUMENTATION_RECHECKED: `docs/API.md:52` não numera a alçada — não conflita com
10000; nenhuma divergência documental introduzida.

RESULT: **RETEST_PASSED**
NEW_EVIDENCE_IF_FAILED: n/a
FINAL_STATUS: **CLOSED**

> Nota acrescentada em 2026-08-13 (WAVE-D): o fechamento deste finding cobre
> **os valores de alçada**, e não a **procedência do papel** usado para aplicá-la.
> A confiança em `approver.role` autodeclarado (`approvalService.js:14`) é objeto
> do **FIND-SIM-002-014**, aberto nesta data. O fechamento de FIND-001 permanece
> válido; sua eficácia prática, porém, fica condicionada ao desfecho do FIND-014,
> porque um papel forjado contorna a alçada corrigida. Ver §5.5.

---

### 1.2 FIND-SIM-002-002 — Vazamento cross-tenant em listPaymentsBySupplier (CRITICAL)

FINDING_ID: FIND-SIM-002-002
CASE_ID: WAVE-B
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
REMEDIATION_COMMIT: 9f7b056

ORIGINAL_REPRODUCTION_RESULT: **reproduzido e medido**, e este é o ponto forte
desta onda. O runner extraiu o código do `AUDIT_COMMIT` via `git show` e rodou o
mesmo harness nos dois estados: no original, o usuário da empresa B recebeu os
**2 pagamentos completos** da empresa A (`leakedRows = 2`); no remediado, a
chamada resulta em `Fornecedor não encontrado`, sem nenhum dado. A prova de
discriminação exigida ("o teste deve falhar contra o `AUDIT_COMMIT` e passar após
a remediação") está satisfeita de forma direta, e não por inferência.

RETEST_SPEC_EXECUTED: os quatro itens:
1. Cross-tenant → recusa, zero registros da empresa A.
2. Caminho positivo → usuário legítimo recebe os 2 pagamentos.
3. Invariante universal → `invariantViolations = 0` (todo item retornado
   satisfaz `item.company_id === user.companyId`).
4. Falha contra o `AUDIT_COMMIT`, passa no remediado — comprovado (acima).

Ganho não exigido pela spec, mas verificado e aceito como reforço: o **oráculo de
existência** foi eliminado — fornecedor alheio e fornecedor inexistente produzem
resposta literalmente idêntica, o que antes era distinguível. A correção não
apenas veda o dado; veda a inferência sobre o dado.

REGRESSION_EXECUTED: suíte 17/17; regressão de vizinhança executada sobre
`getSupplier`, `approveSupplier` e `createPayment` — todas seguem recusando
cross-tenant, sem afrouxamento colateral.

SIDE_EFFECTS_CHECKED: sim — estado do fornecedor inalterado após tentativa
cross-tenant; nenhuma escrita produzida por operação de leitura.

REQUIREMENT_RECHECKED: BR-SEC-001 (`BUSINESS_RULES.md:43-47`), AC-SIM2-005
("Dado um usuário de outra empresa, então a listagem é recusada") — cumprido
literalmente, pela recusa e não por coleção vazia.

DOCUMENTATION_RECHECKED: `docs/API.md:88-96` ("restritos à empresa do usuário")
passa a corresponder ao comportamento. Ressalva **não bloqueante para este
finding**: o mesmo trecho exige papel `analyst|manager`, exigência que o código
não impõe → OBS-SIM-002-002. O isolamento de tenant, objeto deste finding, está
íntegro.

RESULT: **RETEST_PASSED**
NEW_EVIDENCE_IF_FAILED: n/a
FINAL_STATUS: **CLOSED**

> Nota acrescentada em 2026-08-13 (WAVE-D): a ressalva acima (OBS-SIM-002-002)
> foi **decidida e remediada** — ver §5.3. O isolamento de tenant foi
> reconfirmado no código integrado de `b6d44da` sem regressão (§5.4).

---

### 1.3 FIND-SIM-002-003 — sendPayment sem idempotência (CRITICAL)

FINDING_ID: FIND-SIM-002-003
CASE_ID: WAVE-C
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
REMEDIATION_COMMIT: 9ce4754

ORIGINAL_REPRODUCTION_RESULT: **não reproduz mais** no caminho principal. Seis
envios sobre o mesmo pagamento produzem: mesma `external_ref`, mesmo `sent_at`,
`callsFor = 1`, **1** linha em `payment_attempts`. Espião de integração confirmou
**1** invocação real de `submitPayment` — ou seja, a contagem não é artefato de
inspeção, é chamada efetiva.

RETEST_SPEC_EXECUTED: os cinco itens da `RETEST_SPECIFICATION`:
1. `callsFor(paymentId).length === 1` → OK.
2. `external_ref` do reenvio idêntica à do primeiro envio → OK.
3. `COUNT(*) payment_attempts` = 1 → OK.
4. `sent_at` inalterado entre chamadas → OK **no caminho enviar→enviar**;
   **NÃO OK no caminho enviar→cancelar→enviar** (ver ressalva).
5. Sequência enviar→cancelar→enviar não produz segunda movimentação no gateway →
   **resultado observável OK** (1 movimentação, 1 attempt), **mecanismo divergente
   do declarado** (ver ressalva).

REGRESSION_EXECUTED: suíte 22/22.
SIDE_EFFECTS_CHECKED: sim — estado final medido em `payments` e
`payment_attempts` após cada ciclo.
REQUIREMENT_RECHECKED: BR-PAY-002 (`BUSINESS_RULES.md:36-41`) e AC-SIM2-004.
DOCUMENTATION_RECHECKED: `docs/API.md:74-86` permanece silente sobre reenvio —
lacuna documental preexistente, não introduzida pela remediação; não bloqueia.

#### Ressalva material (medida, não hipótese)

No caminho **enviar → cancelar → enviar**, o curto-circuito **do serviço** não
age: `cancelPayment` devolve o `status` para `created`, de modo que a condição
`status === 'sent' && external_ref` é falsa, e `submitPayment` é **realmente
invocado a cada reenvio** — 1 → 4 invocações em 3 ciclos. A não-duplicação
observada decorre **exclusivamente** da deduplicação por `idempotencyKey`
**dentro do gateway**. Consequências medidas: (a) o resultado final permanece
correto — 1 movimentação, 1 attempt; (b) `sent_at` **não é estável** nesse
caminho, mudando a cada reenvio; (c) a defesa repousa no gateway, não no serviço.

#### Decisão do diretor sobre a ressalva — opção (c)

Decido **(c): RETEST_PASSED com observação residual nova**, e registro a
fundamentação para que a decisão seja auditável e contestável:

1. **A norma foi cumprida no que ela efetivamente exige.** BR-PAY-002 é redigida
   em termos de resultado — "um mesmo pagamento nunca pode ser enviado duas vezes
   ao gateway ... sem produzir nova movimentação financeira". O medido é: **uma**
   movimentação, **um** attempt, em todos os caminhos exercitados. Nenhum artefato
   versionado exige que a proteção resida na camada de serviço. Exigir isso como
   condição de fechamento seria a VeriCore **inventando requisito de desenho**,
   vedado pela Regra 6.

2. **(b) — RETEST_FAILED — está descartado por evidência, não por leniência.** A
   opção (b) exigiria que o bug original persistisse ou que a spec falhasse. Nem
   um nem outro: os itens 1-3 e 5 da `RETEST_SPECIFICATION` foram atendidos com
   medição direta, incluindo o item 5, que é justamente o cenário da ressalva.
   Reprovar aqui seria reprovar por **mecanismo**, tendo o **resultado** aprovado
   — e o objeto do FIND-003 é a duplicação de movimentação financeira, que não
   ocorre.

3. **(a) — "aceitável, ponto final" — também está descartado.** Três fatos
   impedem o encerramento silencioso: (i) `sent_at` instável é desvio observável
   de comportamento, com impacto em conciliação e trilha; (ii) a
   `AUDIT_COVERAGE_MATRIX` §3.3 registra que **o gateway real não é auditável** —
   o `gatewayClient` do repositório é stub; portanto a dedup em que a defesa agora
   repousa **não tem garantia verificável fora do ambiente de teste**, e tratá-la
   como controle definitivo seria estender confiança a um componente que esta
   auditoria declarou não auditável; (iii) a defesa em profundidade some: se o
   gateway (real) não deduplicar, não há segunda barreira.

4. **O caminho pós-cancelamento está sob human gate e por isso não decide esta
   onda.** `cancelPayment` é objeto de FIND-SIM-002-004 (CRITICAL, aberto): sua
   própria legitimidade, autorização e a transição `sent → created` estão **sob
   decisão humana pendente**. Não é possível fixar o comportamento idempotente
   correto de um caminho cuja semântica normativa ainda não existe — e a Regra 18
   proíbe suprir essa decisão por inferência. O caminho pós-cancelamento é,
   portanto, **fora do escopo decidível desta onda**, e a observação residual fica
   formalmente **dependente do desfecho de FIND-004**.

5. **Nota de integridade da evidência da SanaCore (registrada por dever).** O
   pacote de evidência da remediação descreve o **curto-circuito do serviço** como
   a proteção contra reenvio. A medição independente mostra que, no caminho
   pós-cancelamento, esse curto-circuito **não age** e a proteção efetiva é do
   gateway. A narrativa do pacote é, nesse ponto, **mais forte que o comportamento
   medido**. Isso não altera o veredito deste finding — o resultado observável
   cumpre a norma —, mas fica registrado como desvio de precisão de evidência de
   remediação, endereçado à SanaCore e ao CoreTriad Director, e é exatamente o
   tipo de discrepância que justifica a exigência de reteste independente
   (Regra 3 combinada com a Regra 4).

Observação residual aberta: **OBS-SIM-002-003** em
`31-new-findings/NEW_OBSERVATIONS.md`.

RESULT: **RETEST_PASSED** (com observação residual OBS-SIM-002-003)
NEW_EVIDENCE_IF_FAILED: n/a
FINAL_STATUS: **CLOSED** — o fechamento cobre a duplicação de movimentação e a
sobrescrita de `external_ref` (objeto do finding). **Não** cobre nem absolve o
comportamento de `sent_at` no caminho pós-cancelamento, que permanece aberto como
observação.

> Nota acrescentada em 2026-08-13 (WAVE-D): a condição prevista no item 4 acima
> ocorreu. Com a decisão APR-2026-007 e a remediação de FIND-004, **cancelar um
> pagamento `sent` passou a ser recusado** — logo o caminho
> enviar→cancelar→enviar **deixou de existir**. A OBS-SIM-002-003 extingue-se por
> **perda de objeto**, registrada e não presumida (§5.2 e
> `31-new-findings/NEW_OBSERVATIONS.md`). Consequência material: a defesa contra
> reenvio deixa de repousar na dedup do gateway não auditável no único caminho em
> que repousava. A lacuna §3.3 da matriz de cobertura permanece viva para o
> gateway em geral, mas **não é mais o único controle** de BR-PAY-002.

---

### 1.4 FIND-SIM-002-005 — Unicidade de CNPJ (BR-SUP-002) ausente (HIGH)

FINDING_ID: FIND-SIM-002-005
CASE_ID: WAVE-C
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
REMEDIATION_COMMIT: 9ce4754

ORIGINAL_REPRODUCTION_RESULT: **não reproduz mais**. Os passos 2 e 3 da
REPRODUCTION (mesmo CNPJ na mesma empresa e em empresa diferente), antes aceitos,
são recusados.

RETEST_SPEC_EXECUTED: os quatro itens:
1. Mesmo CNPJ, mesma empresa → recusado com **erro de negócio legível**.
2. Mesmo CNPJ, **empresas diferentes** → também recusado. Este é o item
   discriminante da spec: comprova unicidade **global**, e não uma unicidade
   composta `(company_id, cnpj)`, que seria insuficiente para BR-SUP-002
   ("independentemente da empresa").
3. CNPJs distintos seguem aceitos (não-regressão de TC-SIM2-001).
4. **Prova de camada de dados executada e aprovada**: `INSERT` direto pelo handle
   de banco, contornando o serviço, falhou com
   `UNIQUE constraint failed: suppliers.cnpj`. A constraint está no banco, não
   apenas na aplicação — exatamente o que a spec exigia e o que o finding
   apontava como indispensável.

REGRESSION_EXECUTED: suíte 22/22.
SIDE_EFFECTS_CHECKED: sim — recusa sem persistência parcial.
REQUIREMENT_RECHECKED: BR-SUP-002 (`BUSINESS_RULES.md:14-17`), AC-SIM2-001
(2ª sentença, antes sem realização).
DOCUMENTATION_RECHECKED: a divergência documento × DDL que integrava este finding
está resolvida no sentido correto — o DDL passou a honrar
`DATA_DICTIONARY.md:26` (`UNIQUE`), em vez de o dicionário ser rebaixado ao DDL.
Autoíndice de unicidade presente no schema, o que também endereça o Bloco D de
FIND-013 quanto a índice sobre `suppliers.cnpj` (FIND-013 permanece aberto pelos
demais blocos).

RESULT: **RETEST_PASSED**
NEW_EVIDENCE_IF_FAILED: n/a
FINAL_STATUS: **CLOSED**

---

### 1.5 FIND-SIM-002-006 — TOCTOU no teto de crédito (HIGH)

FINDING_ID: FIND-SIM-002-006
CASE_ID: WAVE-C
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
REMEDIATION_COMMIT: 9ce4754

ORIGINAL_REPRODUCTION_RESULT: **não reproduz**. 3 rodadas de
`Promise.all([createPayment(8000), createPayment(8000)])` com `credit_limit =
10000` → **1 sucesso por rodada**, `SUM(amount) = 8000`. Rajada de 10 chamadas
concorrentes → **1 sucesso**. No `AUDIT_COMMIT` o mesmo cenário produziria
`SUM = 16000`.

RETEST_SPEC_EXECUTED:
1. `Promise.all` de dois pagamentos de 8000 → exatamente 1 sucesso e 1 rejeição —
   OK, em 3 rodadas independentes e em rajada de 10.
2. Invariante pós-condição `SUM(amount) ≤ credit_limit` — OK (`SUM = 8000`).
3. Não-regressão sequencial — coberta pelos cenários acumulados executados no
   reteste de FIND-007 (3000 aceito, 2500 recusado sobre limite 5000; fronteira
   exata 3000+2000 aceitos e +0.01 recusado) e pela suíte 22/22.
4. **Verificação estrutural** — atendida: `createPayment` passou a executar o
   bloco de leitura-decisão-escrita de forma **transacional e síncrona**, sem
   `await` interposto. Este item é o que sustenta o veredito, e não o item 1
   isoladamente (ver ressalva).

REGRESSION_EXECUTED: suíte 22/22.
SIDE_EFFECTS_CHECKED: sim — nenhuma criação além da única aceita por rodada.
REQUIREMENT_RECHECKED: BR-PAY-001 (`BUSINESS_RULES.md:31-34`), invariante "em
nenhum momento".
DOCUMENTATION_RECHECKED: sem impacto documental.

#### Ressalva metodológica do runner, acolhida

O runner declarou honestamente que, removido o `await` que antecedia o bloco
transacional, **a janela deixou de ser fisicamente alcançável neste modelo de
execução** — logo o teste de concorrência **não distingue "corrigido" de "não
observável"**. Acolho a ressalva e registro que o veredito **não repousa** no
teste dinâmico: repousa no **item 4 da própria `RETEST_SPECIFICATION`**
(demarcação transacional efetiva, verificada estruturalmente), que foi escrito
justamente porque a auditoria previu esta limitação. A eliminação do ponto de
suspensão entre leitura e escrita é, ademais, precisamente o mecanismo que o
finding-validator apontou como causa da corrida (`await` de `:48-49` diferindo a
continuação para a fila de microtarefas): removê-lo remove a corrida, não a
esconde. A limitação de observabilidade fica registrada como
**OBS-SIM-002-004** (INFO, metodológica), para que nenhuma auditoria futura
interprete "0 estouros medidos" como prova de atomicidade multiprocesso.

Delimitação explícita do fechamento: fecha-se a corrida **intraprocesso** sobre
BR-PAY-001. A corrida **entre processos/conexões** não foi exercitada por
nenhuma das partes e não é objeto deste fechamento; permanece coberta,
conceitualmente, por FIND-SIM-002-010 (MEDIUM, aberto) e pela §3.2 da
`AUDIT_COVERAGE_MATRIX`.

RESULT: **RETEST_PASSED**
NEW_EVIDENCE_IF_FAILED: n/a
FINAL_STATUS: **CLOSED** (com delimitação acima)

---

### 1.6 FIND-SIM-002-007 — TC-SIM2-003b falso-positivo (HIGH)

FINDING_ID: FIND-SIM-002-007
CASE_ID: WAVE-A
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
REMEDIATION_COMMIT: f0aaa7a

ORIGINAL_REPRODUCTION_RESULT: o defeito era **ausência de poder discriminatório**
(zero asserções, `catch` vazio). O reteste mediu comportamento **com asserção e
pós-condição**, o que é logicamente incompatível com a permanência do defeito:
um teste sem asserção não pode produzir a verificação `COUNT(*) payments = 0`.

RETEST_SPEC_EXECUTED:
1. Rejeição verificada: limite 5000 + pagamento 9000 → **REJEITADO**.
2. Nada persistido: `COUNT(*)` de `payments` = **0** após a tentativa.
3. Caso acumulado: 3000 aceito, 2500 rejeitado, `SUM = 3000` — o teto considera a
   **soma**, não o valor isolado.
4. Fronteira exata: 3000 + 2000 aceitos (`SUM = 5000`, igual ao limite →
   **aceito**); +0.01 → **recusado**.
5. Prova de discriminação por mutação (neutralizar a guarda e exigir falha do
   teste) — **NÃO EVIDENCIADA** nesta onda. Ver ressalva.

REGRESSION_EXECUTED: suíte 20/20 (contra 12/12 no `AUDIT_COMMIT` — o crescimento
da suíte é, ele próprio, indício de acréscimo de casos, não de reescrita
cosmética).
SIDE_EFFECTS_CHECKED: sim — contagem de linhas persistidas verificada.
REQUIREMENT_RECHECKED: AC-SIM2-003, 3ª sentença — antes sem prova, agora com
prova executável e discriminante.
DOCUMENTATION_RECHECKED: `SOFTWARE_RELEASE_PACKAGE.md:31-34` deixa de sustentar
`12/12 PASS` contaminado por evidência nula.

Ressalva: o item 5 (mutation check) não consta da evidência do runner. Não a
trato como bloqueante porque o objeto do finding — "o teste passa nos dois mundos
possíveis" — está diretamente refutado: os quatro cenários produziram asserções
avaliadas sobre estado do banco, com discriminação de fronteira em 0,01, o que
nenhum teste sem asserção pode fazer. A prova de mutação **elevaria** a
confiança; não é condição necessária para demonstrar a extinção do defeito.
Registro a lacuna como **OBS-SIM-002-005** (INFO) para a próxima rodada de
assurance, e não como motivo de `RETEST_FAILED`.

RESULT: **RETEST_PASSED**
NEW_EVIDENCE_IF_FAILED: n/a
FINAL_STATUS: **CLOSED**

---

### 1.7 FIND-SIM-002-008 — docs/API.md × código em createPayment (MEDIUM; HIGH original)

FINDING_ID: FIND-SIM-002-008
CASE_ID: WAVE-A (somente divergência B)
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
REMEDIATION_COMMIT: f0aaa7a

ORIGINAL_REPRODUCTION_RESULT:
- **Divergência B (status de saída)**: não reproduz mais. `docs/API.md` passa a
  declarar `status: "created"`, convergindo com as cinco fontes concordantes
  (`paymentService.js:58`, `schema.sql:27`, `DATA_DICTIONARY.md:44`,
  AC-SIM2-003, `payments.test.js:36`).
- **Divergência A (papel exigido)**: **reproduz integralmente**. A linha do papel
  `manager` **não foi alterada**, e o runner confirmou **empiricamente** que
  `analyst` consegue criar pagamento. A contradição documento × código persiste —
  como esperado e como correto, porque a decisão normativa não foi tomada.

RETEST_SPEC_EXECUTED: item 1 (divergência B) → **atendido**, sem ocorrência
remanescente de `pending` na seção de pagamentos. Item 2 (divergência A) →
**não executável**: pressupõe decisão humana registrada que institua BR de papel
para registro de pagamento; tal decisão não existe no repositório. Item 3 da
própria spec é terminante: *"Sem a decisão humana da divergência A, o finding
permanece aberto ainda que a divergência B esteja corrigida."*

REGRESSION_EXECUTED: suíte 20/20.
SIDE_EFFECTS_CHECKED: alteração documental de uma linha; sem efeito em código.
REQUIREMENT_RECHECKED: nenhuma BR arbitra o papel — a lacuna normativa
identificada pelo finding-validator permanece intacta.
DOCUMENTATION_RECHECKED: `docs/API.md:65` (papel) segue divergente de
`paymentService.js:3` e de `SOFTWARE_RELEASE_PACKAGE.md:28`.

RESULT: **RETEST_PASSED (PARCIAL — divergência B)** /
**RETEST_NOT_APPLICABLE (divergência A — human gate)**
FINAL_STATUS: **NÃO CLOSED — PARTIALLY_REMEDIATED**. Fechar o finding inteiro
exigiria que este diretor arbitrasse, por inferência, qual papel o negócio
autoriza — vedado pela Regra 18 e pela Regra 6. Permanece aberto até decisão
humana registrada.

Alerta preservado (cláusula de reversão de severidade do finding-validator): se a
decisão humana estabelecer que **somente `manager`** registra pagamento, a
divergência A deixa de ser documental, torna-se defeito de autorização confirmado
e **deve ser re-elevada a HIGH** no mesmo ato, com reavaliação de segregação de
funções em conjunto com FIND-001. Este diretor reafirma a cláusula para que ela
não se perca no handoff. Relacionada: OBS-SIM-002-002, que é a mesma classe de
divergência em outras duas operações e deve ser levada **ao mesmo human gate**.

> Nota acrescentada em 2026-08-13 (WAVE-D): o human gate ocorreu
> (**APR-2026-008**), a cláusula de reversão de severidade foi **acionada** e o
> finding foi retestado e fechado — ver §5.3.

---

### 1.8 FIND-SIM-002-011 — createSupplier sem sujeito (MEDIUM)

FINDING_ID: FIND-SIM-002-011
CASE_ID: WAVE-B
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
REMEDIATION_COMMIT: 9f7b056

Nota de conformidade processual: este finding estava em `STATUS: PROPOSED` e sem
passagem pelo `vericore-finding-validator`. A Regra 22 exige validação apenas
para CRITICAL e HIGH; sendo MEDIUM com `CONFIDENCE: CONFIRMED` e evidência
arquivo+linha verificada, o fechamento por reteste independente é regular.

ORIGINAL_REPRODUCTION_RESULT: **reproduzido no original e extinto no remediado**,
com o mesmo harness aplicado aos dois estados: o `createSupplier` do
`AUDIT_COMMIT` criava fornecedor em empresa alheia e aceitava chamada **sem
`user`**; o remediado recusa ambos.

RETEST_SPEC_EXECUTED:
1. Cadastro cross-tenant → recusado; `COUNT(*) suppliers WHERE company_id = B`
   permaneceu **0** — pós-condição verificada no banco, não apenas pela exceção.
2. Caminho positivo → preservado.
3. Chamada sem `user` → recusada (não há escrita sem sujeito).
4. Não-regressão de TC-SIM2-001/001b → suíte 17/17.
5. Consistência documental com `docs/API.md:26-35` → a assinatura passa a admitir
   sujeito, compatível com "qualquer usuário autenticado **da empresa**".

Reforço não exigido pela spec e aceito: **contornos por coerção** foram testados
— `companyId` como string e como `null` também são recusados. Isso é relevante
porque a validação original era de tipo/existência, e a classe de bypass mais
provável seria justamente a coerção.

REGRESSION_EXECUTED: suíte 17/17; regressão de vizinhança em `getSupplier`,
`approveSupplier`, `createPayment` — sem afrouxamento.
SIDE_EFFECTS_CHECKED: sim — contagem na empresa alvo inalterada.
REQUIREMENT_RECHECKED: BR-SEC-001 ("nem alterados"), AC-SIM2-001.
DOCUMENTATION_RECHECKED: sem divergência introduzida.

RESULT: **RETEST_PASSED**
NEW_EVIDENCE_IF_FAILED: n/a
FINAL_STATUS: **CLOSED**

---

## 2. Quadro consolidado de vereditos (ondas A/B/C — histórico)

| Finding | Sev. | Onda | REMEDIATION_COMMIT | Resultado | Status final |
|---|---|---|---|---|---|
| FIND-SIM-002-001 | CRITICAL | A | `f0aaa7a` | RETEST_PASSED | **CLOSED** |
| FIND-SIM-002-002 | CRITICAL | B | `9f7b056` | RETEST_PASSED | **CLOSED** |
| FIND-SIM-002-003 | CRITICAL | C | `9ce4754` | RETEST_PASSED (obs. residual) | **CLOSED** |
| FIND-SIM-002-004 | CRITICAL | — | — | não retestado | **ABERTO — human gate** |
| FIND-SIM-002-005 | HIGH | C | `9ce4754` | RETEST_PASSED | **CLOSED** |
| FIND-SIM-002-006 | HIGH | C | `9ce4754` | RETEST_PASSED (delimitado) | **CLOSED** |
| FIND-SIM-002-007 | HIGH | A | `f0aaa7a` | RETEST_PASSED | **CLOSED** |
| FIND-SIM-002-008 | MEDIUM | A (só B) | `f0aaa7a` | PASSED parcial / A n/a | **PARTIALLY_REMEDIATED — human gate** |
| FIND-SIM-002-009 | MEDIUM | — | — | não retestado | **ABERTO — human gate** |
| FIND-SIM-002-010 | MEDIUM | — | — | não remediado | **PROPOSED** |
| FIND-SIM-002-011 | MEDIUM | B | `9f7b056` | RETEST_PASSED | **CLOSED** |
| FIND-SIM-002-012 | MEDIUM | — | — | não remediado | **PROPOSED** |
| FIND-SIM-002-013 | LOW | — | — | não remediado | **PROPOSED** |

Fechados: 7 de 13 (3 CRITICAL, 3 HIGH, 1 MEDIUM).
Abertos: 6 — sendo 1 CRITICAL, 1 MEDIUM parcial e 1 MEDIUM em human gate; 2
MEDIUM e 1 LOW sem remediação.

**Este diretor NÃO declara `REMEDIATION COMPLETE`** — autoridade da SanaCore
(Regra 3). O que se declara aqui é exclusivamente `RETEST_PASSED` e
`FINDING CLOSED`, nos termos da Regra 4.

> Quadro atualizado após a WAVE-D em §5.6.

---

## 3. Veredito do run após as ondas A/B/C — HISTÓRICO (superado pela §6)

> **Este veredito não é mais a decisão vigente.** Fica preservado como registro
> do estado em que foi emitido. A decisão vigente está na §6.

### DECISÃO (histórica): **AUDIT_PASSED = NÃO**

RUN_STATUS (histórico): `RETEST_PARTIAL_COMPLETE — AUDIT_NOT_PASSED`

Justificativa objetiva, por critério verificável:

1. **Existe finding CRITICAL aberto.** FIND-SIM-002-004 (`cancelPayment` sem
   autorização, sem tenant, não documentado, revertendo `sent → created`)
   permanece `CONFIRMED` e não remediado, aguardando decisão humana. Nenhum
   critério de conclusão desta auditoria admite veredito de aprovação com um
   CRITICAL confirmado em aberto. Este item, isoladamente, é suficiente para o
   `NÃO`.

2. **Três itens dependem de human gate e não podem ser supridos por inferência**
   (Regra 18): FIND-004, a divergência A de FIND-008 (papel para registro de
   pagamento — lacuna normativa, sem BR que arbitre) e FIND-009. Enquanto o
   árbitro normativo não existir, a Regra 21 impõe **interromper a decisão**, não
   resolvê-la em favor do código.

3. **MEDIUM/LOW sem remediação e sem aceitação de risco registrada.**
   FIND-010, FIND-012 e FIND-013 seguem `PROPOSED`. Não há, no repositório,
   decisão humana de aceitação de risco para nenhum deles. "Não remediado" não
   equivale a "aceito"; sem registro, não há base para desconsiderá-los no
   veredito.

4. **Cobertura: suficiente para a auditoria, insuficiente para aprovação do
   objeto.** A `AUDIT_COVERAGE_MATRIX` demonstra 100% de cobertura de inventário
   e nenhuma trilha omitida — o requisito de "nunca declarar cobertura sem
   matriz" está satisfeito. Porém a própria matriz declara **0% de prova
   dinâmica** na fase de auditoria (§3.1) e três lacunas transversais vivas
   (§3.2 concorrência multiprocesso, §3.3 gateway real não auditável, §3.4
   ausência de controle compensatório por inexistir camada HTTP). Os retestes
   destas três ondas **reduziram** a lacuna §3.1 nos pontos retestados, mas
   §3.2 e §3.3 permanecem — e §3.3 é justamente aquela em que a defesa de
   FIND-003 passou a repousar.

5. **Os commits remediados não foram auditados como um todo.** As correções vivem
   em `f0aaa7a`, `9f7b056` e `9ce4754`, posteriores ao `AUDIT_COMMIT`. As Regras
   12-14 são explícitas: a auditoria não segue HEAD, e mudanças posteriores
   exigem **delta audit**. Este relatório fecha findings por reteste dirigido; não
   substitui a auditoria do estado remediado. Além disso, apenas WAVE-A teve
   equivalência com o HEAD verificada por hash de árvore — para WAVE-B e WAVE-C
   essa equivalência **não foi demonstrada** e deve ser estabelecida na abertura
   do delta audit.

6. **Há observações novas não dispostas.** Cinco observações
   (`31-new-findings/NEW_OBSERVATIONS.md`), duas delas candidatas a finding
   próprio, foram levantadas sobre commits posteriores ao `AUDIT_COMMIT`. Nenhuma
   está triada, validada ou fechada.

### Condições objetivas para reavaliar o veredito

Um veredito de aprovação só poderá ser considerado quando, cumulativamente:
(a) FIND-004 for decidido em human gate, remediado se for o caso, e retestado;
(b) a divergência A de FIND-008 tiver BR registrada por decisão humana, com a
cláusula de reversão de severidade aplicada, e FIND-009 for decidido;
(c) FIND-010, FIND-012 e FIND-013 forem remediados **ou** tiverem aceitação de
risco humana registrada no repositório;
(d) as observações OBS-001 a OBS-005 forem triadas;
(e) for aberto e concluído **delta audit** sobre um novo `AUDIT_COMMIT` que
contenha as três ondas, com nova `AUDIT_COVERAGE_MATRIX`.

### Escalonamento a humano (Regra 21)

Escalados ao responsável humano, por conflito de fonte autoritativa ou por
severidade: FIND-SIM-002-004 (CRITICAL aberto); divergência A de FIND-008 e
OBS-SIM-002-002 (mesma lacuna normativa de papel — devem ser decididas em ato
único); FIND-SIM-002-009.

---

## 4. Handoff das ondas A/B/C (histórico)

- **CoreTriad Director**: `AUDIT_PASSED = NÃO`; abrir delta audit (condição `e`);
  encaminhar human gates.
- **SanaCore**: 7 findings fechados; FIND-008 permanece parcialmente remediado;
  registrada a discrepância de precisão do pacote de evidência da WAVE-C (§1.3,
  item 5) — sem imputação de má-fé e sem efeito sobre os vereditos.
- **Relatórios**: este relatório e `31-new-findings/NEW_OBSERVATIONS.md` são as
  entradas oficiais da fase de reteste do run SIM-002-AUD-001.

---
---

# 5. RODADA WAVE-D — 2026-08-13

CASE_ID: WAVE-D
REMEDIATION_COMMIT: `b6d44da`
ESCOPO DA ONDA: (a) integração das ondas A+B+C; (b) remediação de
FIND-SIM-002-004, FIND-SIM-002-008 (divergência A) + OBS-SIM-002-002 e
FIND-SIM-002-009.
HUMAN GATES QUE DESTRAVARAM A ONDA: **APR-2026-007**, **APR-2026-008** e
**APR-2026-009** (`coretriad/governance/APPROVALS.md`) — lidos integralmente por
este diretor antes de emitir qualquer veredito, conforme Regra 18 (human gate não
se supre por inferência; aqui há decisão humana explícita e registrada).
EXECUÇÃO TÉCNICA: `vericore-audit-verification-runner`.

## 5.0 Condições de independência e integridade do reteste

Verificadas e aceitas, nos termos exigidos pela Regra 4 e pelo contrato de
reteste:

1. **Harness próprio, fora do repositório** — o runner não reutilizou a suíte da
   OpusCore/SanaCore como prova única.
2. **Comparação antes/depois com o objeto auditado** — o código do `AUDIT_COMMIT`
   foi extraído via `git show` e submetido ao **mesmo** harness, de modo que os
   itens 5.1 e 5.4 abaixo têm **prova de discriminação** (o teste falha contra
   `f2fcf1c` e passa contra `b6d44da`), e não apenas afirmação de conformidade.
3. **Working tree limpo antes e depois** — nenhuma contaminação do objeto medido.
4. **Produto de `b6d44da` idêntico ao HEAD** — a equivalência que faltava para as
   ondas B e C (§3, item 5) fica estabelecida para o estado integrado.
5. **Suíte 49/49** — crescimento coerente com o acréscimo de casos das quatro
   ondas (12/12 no `AUDIT_COMMIT` → 49/49).

Registro, por dever de precisão: nenhum item do reteste da WAVE-D falhou, e a
SanaCore **declarou espontaneamente um risco residual material** que não lhe
favorecia (§5.5). Isso é o oposto do desvio de precisão registrado na WAVE-C
(§1.3, item 5) e é anotado como conduta de evidência correta.

---

## 5.1 FIND-SIM-002-004 — cancelPayment (CRITICAL)

FINDING_ID: FIND-SIM-002-004
CASE_ID: WAVE-D
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
REMEDIATION_COMMIT: `b6d44da`
HUMAN GATE: **APR-2026-007** — `cancelPayment` é válido **apenas** para
pagamentos em `created`; **não existe cancelamento após `sent`**; reverter
pagamento enviado seria **estorno**, operação distinta, fora do escopo do SIM-002.

MÉTODO: comparação antes/depois sobre o mesmo harness, com o código do
`AUDIT_COMMIT` extraído por `git show`; verificação de estado por **releitura do
banco**, não apenas pela exceção lançada.

EVIDÊNCIA ANTES (`f2fcf1c`): cancelar um pagamento `sent` **revertia** para
`created`, **zerava `sent_at`** e **mantinha `external_ref`** — exatamente a
transição descrita na EVIDENCE do finding (`paymentService.js:124-138`).

EVIDÊNCIA DEPOIS (`b6d44da`):
- Cancelar `created` → `cancelled`. Caminho legítimo preservado.
- Cancelar `sent` → **RECUSADO**, com erro de negócio explícito e aderente à
  norma aprovada: *"Pagamento já enviado não pode ser cancelado; estorno é
  operação distinta"*. Estado permanece `sent` — verificado por releitura.
- Cross-tenant → **RECUSADO** (BR-SEC-001).

RETEST_SPEC_EXECUTED (contra a `RETEST_SPECIFICATION` do próprio finding):
- Item 2 (operação mantida): exige `user` → **atendido** (a recusa cross-tenant
  pressupõe sujeito e empresa; sem `user` não há chamada válida); recusa chamador
  de outra empresa → **atendido**; a sequência enviar→cancelar→enviar não produz
  segunda movimentação → **atendido por impossibilidade de caminho** (cancelar
  `sent` é recusado, logo a sequência não existe mais). **Recusa papel sem
  alçada → NÃO ATENDIDO** — ver delimitação.
- Item 3 (nenhuma transição apaga `sent_at` mantendo `external_ref`; alteração
  auditável): a primeira metade está **atendida por remoção da transição**; a
  segunda metade (trilha de alteração) **não** foi demonstrada e permanece
  coberta por FIND-SIM-002-012 (`updated_at`/trilha), que segue aberto.

REGRESSION_EXECUTED: suíte 49/49; não-regressão de integração conferida em §5.4.
SIDE_EFFECTS_CHECKED: sim — estado do pagamento relido após cada tentativa.
REQUIREMENT_RECHECKED: APR-2026-007 (norma aprovada, fonte da semântica);
BR-SEC-001; BR-PAY-002 por encadeamento (a duplicação ilimitada descrita no
BUSINESS_IMPACT deixa de ser alcançável, pois seu passo 3 é agora recusado).

### Delimitação do fechamento (obrigatória, não cosmética)

O que se fecha: (i) a transição `sent → created`; (ii) a duplicação financeira
encadeada com FIND-003; (iii) a escrita sem sujeito e sem tenant; (iv) a ausência
de origem normativa — que **deixou de existir** com APR-2026-007.

O que **não** se fecha e sai deste finding como item próprio: **qual papel pode
cancelar um pagamento `created`**. A APR-2026-007 definiu *quais estados* são
canceláveis; não definiu *quem* cancela. Continua sem árbitro normativo, e este
diretor **não** o supre por inferência (Regras 6 e 18). Registrado como
**OBS-SIM-002-007**, com escalonamento a human gate. Impacto residual medido em
seu contexto: cancelar um pagamento `created` libera crédito comprometido
(`sumCommittedAmount`, `paymentService.js:31`) sem alçada e — enquanto
FIND-SIM-002-012 estiver aberto — sem trilha. Não há duplicação financeira nesse
caminho.

Registro por que isso não impede o fechamento, diferentemente do que decidi para
FIND-008 nas ondas anteriores: a `RETEST_SPECIFICATION` de FIND-008 continha
cláusula **terminante** ("o finding permanece aberto"), enquanto a de FIND-004
enuncia cobertura mínima; e o **objeto** deste finding — comportamento sem
requisito, revertendo envio, sem sujeito — está extinto e provado extinto. Manter
o CRITICAL aberto para carregar um item normativo distinto degradaria a precisão
do registro: o dano CRITICAL não existe mais e dizer o contrário seria inexato.

RESULT: **RETEST_PASSED**
NEW_EVIDENCE_IF_FAILED: n/a
FINAL_STATUS: **CLOSED** (com a delimitação acima)

---

## 5.2 Efeito colateral do fechamento de FIND-004 sobre OBS-SIM-002-003

Registrado por exigência da própria observação ("se `cancelPayment` for removido,
a observação se extingue por perda de objeto — o que deve ser registrado, e não
presumido").

A OBS-SIM-002-003 tinha dois fatos: (a) `sent_at` instável no caminho
enviar→cancelar→enviar; (b) a não-duplicação nesse caminho vinha da dedup do
gateway, não do serviço. Com a recusa de cancelar pagamento `sent`, **o caminho
deixou de existir**. Ambos os fatos perdem objeto.

Consequência material que registro explicitamente porque melhora o risco do run:
a defesa de BR-PAY-002 **deixa de repousar** sobre a dedup do gateway declarado
não auditável (§3.3 da matriz de cobertura) no único caminho em que repousava; no
caminho enviar→enviar o curto-circuito do serviço já havia sido medido atuante na
WAVE-C. A lacuna §3.3 continua viva para o gateway em geral — não a declaro
resolvida —, mas ela não é mais o único controle.

OBS-SIM-002-003 → **EXTINTA POR PERDA DE OBJETO** (não é "aceita", não é
"corrigida"). Confirmação formal no delta audit.

---

## 5.3 FIND-SIM-002-008 — divergência A (papel) + OBS-SIM-002-002

FINDING_ID: FIND-SIM-002-008
CASE_ID: WAVE-D (divergência A; a B fechou na WAVE-A)
REMEDIATION_COMMIT: `b6d44da`
HUMAN GATE: **APR-2026-008** — escrita (criar e enviar pagamento) restrita a
**`manager`**; leitura (consultar pagamentos e fornecedores) permitida a
**`analyst` e `manager`**; em ambos os casos **o papel deve ser verificado no
servidor contra fonte confiável de identidade, nunca autodeclarado**.

### Acionamento da cláusula de reversão de severidade

A condição prevista pelo `vericore-finding-validator` ocorreu literalmente: a
decisão humana estabeleceu que **somente `manager`** registra pagamento. Portanto,
**no mesmo ato**, a divergência A deixa de ser contradição documental e passa a
ser **defeito de autorização confirmado**, e a severidade do FIND-SIM-002-008 é
**re-elevada de MEDIUM para HIGH**. Faço isso antes de julgar o reteste, e não
depois, para que o fechamento se dê sobre a severidade correta e não sobre a
severidade conveniente.

Reavaliação de segregação de funções (exigida pela cláusula, em conjunto com
FIND-001): com alçada de aprovação em 10000 para `analyst` e criação/envio de
pagamento restritos a `manager`, **concessão e consumo de crédito deixam de ser
exercíveis pelo mesmo papel**. A segregação que faltava passa a existir no plano
dos papéis. Ressalva imediata e material: essa segregação só é efetiva se o papel
for confiável — e é exatamente esse pressuposto que o **FIND-SIM-002-014** põe em
questão para a aprovação (§5.5).

MÉTODO: exercício direto das quatro operações com papéis distintos, mais um
**teste decisivo de procedência do papel** (abaixo), com releitura de estado.

EVIDÊNCIA DEPOIS (`b6d44da`):
- `createPayment` e `sendPayment`: `analyst` → **RECUSADO**; `manager` →
  **ACEITO**. Converge com `docs/API.md:65`, que já dizia `manager`.
- Leitura (`getSupplier`, `listPaymentsBySupplier`): funciona para `analyst` e
  para `manager` — atende à parte de leitura da APR-2026-008 e **remedia
  OBS-SIM-002-002**, que era a mesma lacuna normativa em outras duas operações e
  foi decidida no mesmo ato, como este diretor havia exigido.
- Usuário inexistente → **RECUSADO** com *"Usuário não autenticado"*.
- **Teste decisivo (procedência do papel):** payload declarando
  `role:'manager'` **falso**, cujo registro em `users` diz `analyst` →
  **RECUSADO nas duas escritas**. O papel vem do **banco**, não do payload. Este
  é o item que prova o cumprimento da parte mais exigente da APR-2026-008 e da
  **Regra 24** — e é prova por comportamento, não por leitura de código.

RETEST_SPEC_EXECUTED (item 2 da spec do finding), item a item:
- "existe BR identificada que define o papel" → **atendido** por APR-2026-008,
  decisão humana registrada em `coretriad/governance/APPROVALS.md`. Ressalva
  registrada: a norma vive no registro de aprovações e **não foi transcrita como
  BR com ID** em `requirements/BUSINESS_RULES.md` — a Regra 18 está satisfeita
  (decisão humana explícita e registrada), a Regra 17 (requisitos com IDs
  padronizados) fica com pendência formal → **OBS-SIM-002-006**.
- "código e `docs/API.md:65` convergem" → **atendido** (medido).
- "`SOFTWARE_RELEASE_PACKAGE.md:28` converge" → **NÃO VERIFICADO**. Aquela linha
  declara, no `AUDIT_COMMIT`, "Criar pagamento: `analyst`, `manager` ... —
  permitido". A evidência do reteste é comportamental e não cobre esse artefato,
  e este diretor não pode inspecionar `b6d44da` (o working tree lido está no
  estado do `AUDIT_COMMIT`). → **OBS-SIM-002-006**, a verificar no delta audit.
- "teste negativo com papel não autorizado no repositório" → o runner executou o
  negativo em harness próprio (prova mais forte quanto ao comportamento); a
  existência do caso **na suíte versionada** não foi evidenciada isoladamente,
  embora a suíte tenha ido de 20 para 49 casos. → **OBS-SIM-002-006**.

REGRESSION_EXECUTED: suíte 49/49; isolamento de tenant reconfirmado (§5.4).
SIDE_EFFECTS_CHECKED: sim — recusas sem persistência parcial.

### Decisão: fecha integralmente ou permanece parcial?

**Fecha integralmente.** Fundamento, e a fronteira do que estou fechando:

1. O finding tinha duas divergências. A B fechou na WAVE-A. A A tinha **um único
   obstáculo declarado** — a inexistência de árbitro normativo. O árbitro existe
   (APR-2026-008), o código foi alinhado **à norma** (e não a norma ao código), e
   o alinhamento foi medido, inclusive contra papel forjado.
2. O que resta do item 2 da spec é **convergência documental de terceiro
   artefato** e **formalização de BR com ID** — matéria de consistência
   documental sobre um commit posterior ao `AUDIT_COMMIT`, que não tenho como
   verificar sem delta audit e que **não altera o defeito de autorização**, o qual
   está provado extinto. Manter um HIGH de autorização aberto para carregar uma
   pendência documental descreveria mal o risco real. Sai como **OBS-SIM-002-006**,
   com instrução expressa: se o delta audit encontrar
   `SOFTWARE_RELEASE_PACKAGE.md:28` ainda divergente, **abra-se finding
   documental próprio** — não se reabre este.
3. **OBS-SIM-002-002 fica remediada junto** e é declarada resolvida no mesmo ato,
   como sempre foi exigido para não produzir norma de papel fragmentada.

SEVERIDADE FINAL DO FINDING: **HIGH** (re-elevada de MEDIUM por cláusula acionada).
RESULT: **RETEST_PASSED** (divergência A; divergência B já passada na WAVE-A)
FINAL_STATUS: **CLOSED** — integralmente, nos termos acima.

---

## 5.4 Não-regressão da integração A+B+C+D em `b6d44da`

Este item não pertence a nenhum finding: é a verificação de que a **integração**
das quatro ondas não desfez controles já fechados. Sem ele, quatro fechamentos
individuais não autorizam nenhuma afirmação sobre o estado integrado.

| Controle | Origem | Resultado em `b6d44da` |
|---|---|---|
| Isolamento de tenant (`listPaymentsBySupplier`, `getSupplier`, `createSupplier`) | WAVE-B / FIND-002, FIND-011 | **Reconfirmado** |
| Idempotência de `sendPayment` | WAVE-C / FIND-003 | **Reconfirmada** |
| CNPJ único **global** | WAVE-C / FIND-005 | **Reconfirmado** |
| Alçada `analyst` = 10000 | WAVE-A / FIND-001 | **Reconfirmada** |
| Suíte completa | todas | **49/49** |

Nenhuma regressão detectada. Registro a delimitação probatória: esta verificação
é de **não-regressão dirigida aos controles fechados**, não é auditoria do commit
integrado — a distinção sustenta a §6.

Ganho colateral registrado: a equivalência produto↔HEAD, que faltava para as
ondas B e C (§3, item 5), fica demonstrada para o estado integrado `b6d44da`.

---

## 5.5 FIND-SIM-002-009 — recusa do gateway (MEDIUM → HIGH re-elevado)

FINDING_ID: FIND-SIM-002-009
CASE_ID: WAVE-D
REMEDIATION_COMMIT: `b6d44da`
HUMAN GATE: **APR-2026-009** — criação do estado **`failed`** no domínio de
`payments.status`; recusa do gateway é causa distinta de cancelamento e deve ser
rastreável separadamente.

### Acionamento da cláusula de re-elevação

O `vericore-finding-validator` fixou: re-elevar a HIGH quando ocorrer "(b)
registro de requisito que normatize o estado sob recusa". A APR-2026-009 é
exatamente isso. Severidade **re-elevada de MEDIUM para HIGH** antes do
julgamento do reteste, pela mesma razão de método usada em §5.3. A condição (a)
da cláusula — cliente capaz de retornar `accepted:false` — também se realizou no
plano de teste, o que aliás é o que tornou o defeito finalmente alcançável.

MÉTODO: duplo de gateway devolvendo recusa; comparação antes/depois com o código
do `AUDIT_COMMIT` extraído por `git show`; asserção cruzada entre `payments` e
`payment_attempts`.

EVIDÊNCIA ANTES (`f2fcf1c`): pagamento ficava **`sent`** mesmo com o gateway
recusando, com `external_ref` e `sent_at` preenchidos, enquanto a trilha gravava
`failed` — a contradição interna descrita no finding, agora **medida** e não
apenas provada estaticamente. Registro que isto encerra a limitação apontada pelo
próprio finding ("o ramo de recusa é inalcançável em teste"): a auditoria original
só pôde prová-lo por leitura; o reteste o provou por execução.

EVIDÊNCIA DEPOIS (`b6d44da`): gateway recusando → `status: "failed"`,
`external_ref: null`, `sent_at: null`, tentativa registrada como `failed`.

RETEST_SPEC_EXECUTED:
1. Não assume `sent`; assume o estado da norma aprovada (`failed`); `sent_at`
   nulo → **atendido**, com o reforço de `external_ref` também nulo, o que evita
   que uma referência de gateway inexistente contamine conciliação futura.
2. Coerência cruzada trilha × estado → **atendida** (`failed`/`failed`).
3. **Atomicidade** (falha simulada entre as duas escritas: nenhuma persiste) →
   **NÃO EVIDENCIADA**. Ver delimitação.
4. Não-regressão com gateway aceitando (TC-SIM2-004) → **atendida** (49/49 e §5.4).
5. Pré-condição "existir requisito que defina o estado sob recusa" → **atendida**
   por APR-2026-009. Sem ela o reteste seria inválido; com ela, é válido.

### Delimitação do fechamento

Fecha-se o **defeito principal**: estado persistido contradizendo o resultado real
da integração. Não se fecha, porque não foi evidenciado, o item 3 (atomicidade das
duas escritas) — que o próprio finding-validator já havia **rebaixado a observação
residual (LOW)** após demonstrar que `db.run` é síncrono e as chamadas
consecutivas, com janela desprezível em processo único. Não converto uma
observação LOW já refutada em bloqueio de fechamento; registro-a em
**OBS-SIM-002-008**, junto com dois residuais correlatos declarados pela SanaCore:
o `CHECK` de `payments.status` **não retroage a bases já existentes** (não há
migração) e **não há política de limite de retentativa** para pagamento `failed`.

Chamo atenção, sem exagerar seu peso: o novo estado `failed` cria uma pergunta que
antes não existia — o que fazer com um pagamento `failed` — e a norma aprovada não
a responde. Isso não é defeito do que foi remediado; é lacuna normativa nova, e
por isso vai a observação com encaminhamento a human gate, não a finding.

SEVERIDADE FINAL DO FINDING: **HIGH** (re-elevada de MEDIUM por cláusula acionada).
RESULT: **RETEST_PASSED**
FINAL_STATUS: **CLOSED** (com a delimitação acima)

---

## 5.6 Risco residual material declarado pela SanaCore → FIND-SIM-002-014

A SanaCore reportou, por iniciativa própria, que
`approvalService.approveSupplier` **continua confiando em `approver.role`
autodeclarado**: a APR-2026-008 cobriu criar/enviar/ler pagamento, mas **não** a
alçada de aprovação. A SanaCore **recusou-se a estender a correção por conta
própria**, invocando a Regra 6. Registro que a recusa está **correta**: estender
norma humana por analogia é precisamente o que a Regra 6 proíbe, e este diretor
não a teria aceitado se tivesse sido feita.

Verificação independente feita por este diretor no **objeto auditado**
(`AUDIT_COMMIT`, leitura direta de `product/SIM-002/src/approvalService.js`):

```js
const APPROVER_ROLES = ['analyst', 'manager'];          // :4
function approveSupplier({ supplierId, creditLimit, approver }) {
  if (!approver || !APPROVER_ROLES.includes(approver.role)) { ... }   // :14
  ...
  if (approver.role === 'analyst' && creditLimit > ANALYST_APPROVAL_LIMIT) { ... } // :37
```

O papel decisivo da alçada vem **do objeto passado pelo chamador**, sem qualquer
consulta a fonte de identidade. Fato confirmado por leitura direta no
`AUDIT_COMMIT`.

Este risco é formalizado como **FIND-SIM-002-014**
(`21-findings/FIND-SIM-002-014.md`), severidade **HIGH** com cláusula de elevação
obrigatória a CRITICAL, `STATUS: PROPOSED`, sujeito ao `vericore-finding-validator`
(Regra 22) e a human gate. A fundamentação da severidade — inclusive por que
**não** a fixei em CRITICAL apesar da Regra 24 — está no próprio finding e é
resumida em §6.

Consequência que registro aqui, e que é o ponto mais desconfortável desta rodada:
a segregação de funções conquistada em §5.3 e a alçada corrigida em §1.1
pressupõem que o papel seja confiável. Em `approveSupplier`, ele não é. Os
fechamentos de FIND-001 e FIND-008 permanecem válidos — cada um cumpriu seu
objeto e sua norma —, mas sua **eficácia prática** está condicionada ao desfecho
de FIND-014. Dizer o contrário seria vender uma garantia que a evidência não
sustenta.

Registro também, como **lacuna de cobertura deste run**: a §2.2 da
`AUDIT_COVERAGE_MATRIX` declara ter coberto "todos os pontos de decisão de papel",
citando nominalmente `approvalService.js:4`, `:14` e `:37` — as mesmas linhas.
A trilha `authorization` **leu** essas linhas e **não questionou a procedência**
do papel; detectou o valor errado da alçada (FIND-001) e não a fonte não confiável
do papel. Isso deve ser corrigido na matriz do delta audit: a trilha de
autorização passa a exigir, como item de checklist, a **procedência** de cada
atributo de autorização, não apenas seu uso.

---

## 5.7 Quadro consolidado de vereditos após a WAVE-D

| Finding | Sev. final | Onda | REMEDIATION_COMMIT | Resultado | Status |
|---|---|---|---|---|---|
| FIND-SIM-002-001 | CRITICAL | A | `f0aaa7a` | RETEST_PASSED | **CLOSED** |
| FIND-SIM-002-002 | CRITICAL | B | `9f7b056` | RETEST_PASSED | **CLOSED** |
| FIND-SIM-002-003 | CRITICAL | C | `9ce4754` | RETEST_PASSED | **CLOSED** |
| FIND-SIM-002-004 | CRITICAL | D | `b6d44da` | RETEST_PASSED | **CLOSED** (delimitado) |
| FIND-SIM-002-005 | HIGH | C | `9ce4754` | RETEST_PASSED | **CLOSED** |
| FIND-SIM-002-006 | HIGH | C | `9ce4754` | RETEST_PASSED | **CLOSED** (delimitado) |
| FIND-SIM-002-007 | HIGH | A | `f0aaa7a` | RETEST_PASSED | **CLOSED** |
| FIND-SIM-002-008 | **HIGH** (re-elevado) | A + D | `f0aaa7a` + `b6d44da` | RETEST_PASSED | **CLOSED** |
| FIND-SIM-002-009 | **HIGH** (re-elevado) | D | `b6d44da` | RETEST_PASSED | **CLOSED** (delimitado) |
| FIND-SIM-002-010 | MEDIUM | — | — | não remediado | **PROPOSED** |
| FIND-SIM-002-011 | MEDIUM | B | `9f7b056` | RETEST_PASSED | **CLOSED** |
| FIND-SIM-002-012 | MEDIUM | — | — | não remediado | **PROPOSED** |
| FIND-SIM-002-013 | LOW | — | — | não remediado | **PROPOSED** |
| **FIND-SIM-002-014** | **HIGH** (novo, 2026-08-13) | — | — | não remediado | **PROPOSED** |

Fechados: **10 de 14** — 4 CRITICAL, 5 HIGH, 1 MEDIUM. **Nenhum CRITICAL aberto.**
Abertos: 4 — FIND-010 (MEDIUM), FIND-012 (MEDIUM), FIND-013 (LOW) e **FIND-014
(HIGH, novo)**.

**Este diretor NÃO declara `REMEDIATION COMPLETE`** — autoridade da SanaCore
(Regra 3). Declara-se aqui, exclusivamente, `RETEST_PASSED` e `FINDING CLOSED`
(Regra 4).

---

# 6. VEREDITO VIGENTE DO RUN SIM-002-AUD-001 — 2026-08-13

## DECISÃO: **AUDIT_PASSED = NÃO**

RUN_STATUS: `RETEST_COMPLETE — AUDIT_NOT_PASSED (delta audit requerido)`

Registro, antes da fundamentação, o que **mudou** e o que **não** mudou, porque um
"NÃO" repetido sem essa distinção seria informação de má qualidade:

- **Mudou, e é substantivo:** os quatro motivos mais graves do veredito anterior
  caíram. Não há mais CRITICAL aberto; os três human gates foram decididos por
  humano e registrados; os três findings que dependiam deles foram remediados e
  retestados com prova de discriminação antes/depois; a integração não regrediu
  controles; a equivalência produto↔HEAD, antes indemonstrada para B e C, foi
  estabelecida para o estado integrado.
- **Não mudou:** o run continua sem poder afirmar que **o objeto auditado está
  aprovado**, e as razões abaixo são independentes entre si — cada uma bastaria.

### Fundamento 1 — há finding HIGH aberto sobre o próprio objeto auditado (decisivo)

FIND-SIM-002-014 (`approveSupplier` decide alçada por papel autodeclarado) **não
é** uma observação sobre commit posterior: verifiquei-o por leitura direta no
`AUDIT_COMMIT` (`approvalService.js:4`, `:14`, `:37`). É defeito do objeto desta
auditoria, encontrado tardiamente, `PROPOSED`, **não validado** pelo
finding-validator (Regra 22), **não decidido** em human gate e **não remediado**.

Aprovar um run com um HIGH aberto no objeto auditado exigiria que este diretor
tratasse como aceitável um risco que nenhuma decisão humana aceitou. A APR-2026-005
aceitou risco análogo **restrito ao SIM-001**, e diz expressamente que "não se
estende a nenhum outro projeto". Não há aceitação equivalente para o SIM-002 —
ao contrário: a APR-2026-008 mandou **implementar** a verificação server-side no
SIM-002, não aceitá-la. Estender essa decisão a `approveSupplier` por analogia é
o que a Regra 6 me proíbe; ignorá-la é o que a evidência me proíbe.

Agravante de coerência interna: FIND-014 **condiciona a eficácia prática** de dois
fechamentos deste mesmo run (FIND-001, alçada; FIND-008, segregação de funções),
porque ambos pressupõem papel confiável. Um veredito de aprovação afirmaria uma
garantia que a própria §5.6 demonstra não existir.

### Fundamento 2 — o estado aprovável não é o estado auditado (Regras 12-14)

As correções vivem em `f0aaa7a`, `9f7b056`, `9ce4754` e `b6d44da`, **todos
posteriores** ao `AUDIT_COMMIT`. O que este relatório faz é **reteste dirigido a
findings**, e a §5.4 é **não-regressão dirigida a controles fechados** — nenhum
dos dois é auditoria do commit integrado. As Regras 12-14 não admitem que a
auditoria siga HEAD nem que reteste substitua delta audit. Aprovar `f2fcf1c`
seria aprovar um estado em que **todos os 13 findings originais existiam**;
aprovar `b6d44da` seria aprovar um commit **nunca auditado**. Nenhuma das duas
proposições é sustentável.

Além disso, a §2.2 da matriz de cobertura provou-se **imprecisa** (§5.6): declara
cobertura de "todos os pontos de decisão de papel" e deixou passar a procedência
do papel. Um veredito de aprovação repousaria sobre uma matriz cuja precisão
acabou de ser refutada por evidência. A matriz deste run permanece válida como
registro do que foi feito; não serve como demonstração de suficiência.

### Fundamento 3 — os `PROPOSED` remanescentes: por que a decisão informada não basta *como está*

Fui informado de que, por decisão humana de 2026-08-13, FIND-010, FIND-012 e
FIND-013 recebem o mesmo tratamento do APR-2026-006 — rastreados como pendentes,
não bloqueantes para o fechamento do ciclo, não descartados.

Aceito **integralmente o mérito**: são MEDIUM/MEDIUM/LOW, e a decisão de não
bloquear o **ciclo** por eles é razoável e é prerrogativa humana, não minha.
Sobre isso não faço objeção.

Registro, porém, um fato verificável e uma distinção:

1. **Fato:** ao ler hoje `coretriad/governance/APPROVALS.md`, a tabela termina em
   **APR-2026-009** e não há entrada correspondente a esses três findings do
   SIM-002 (as entradas 005 e 006 tratam do **SIM-001**). A Regra 18 exige decisão
   humana **registrada**; a Regra 8 proíbe fundamentar decisão em contexto não
   versionado; e a minha própria condição (c) do veredito anterior pedia
   "aceitação de risco registrada **no repositório**". Não posso suprir esse
   registro — e não estou dizendo que a decisão não ocorreu; estou dizendo que
   **eu não posso lê-la**, e é isso que a regra exige. Basta uma linha
   `APR-2026-010` no arquivo, por quem tem autoridade para escrevê-lo, e este
   fundamento se resolve. Não escrevo em `coretriad/` — não é meu namespace.
2. **Distinção que sustento mesmo depois de registrada:** "não bloqueia o
   fechamento do **ciclo de validação**" e "o objeto está **aprovado**" são
   proposições diferentes. O APR-2026-006 fez a primeira para o SIM-001, e o
   SIM-001 ficou "fechado como ciclo, **não arquivado**". Aplicar o mesmo padrão
   aqui fecha o ciclo — não produz `AUDIT_PASSED`.

Este fundamento, sozinho, **não** sustentaria o "NÃO" (é formalidade sanável). Os
fundamentos 1 e 2 sustentam.

### Fundamento 4 — observações não dispostas

Continuam abertas OBS-001, OBS-004 e OBS-005, e nascem OBS-006, OBS-007 e
OBS-008. OBS-002 foi remediada (§5.3) e OBS-003 extinguiu-se por perda de objeto
(§5.2) — registrado, não presumido. As abertas não são, por si, motivo de
reprovação; são item de disposição pendente e entram nas condições abaixo.

## O que esta decisão **não** significa

- Não é reprovação do trabalho da SanaCore. Nesta onda ela remediou três itens sob
  norma aprovada, integrou quatro ondas sem regressão e **declarou espontaneamente
  o risco residual que originou o FIND-014**, recusando-se a extrapolar a decisão
  humana. Isso é conduta correta e fica registrado como tal.
- Não é `RETEST_FAILED`: **todos os cinco retestes da WAVE-D passaram**.
- Não impede o fechamento do SIM-002 **como ciclo de validação do CoreTriad**,
  se o CoreTriad Director e o responsável humano assim decidirem — essa é decisão
  deles, e o insumo objetivo está aqui.

## Condições objetivas e exaustivas para `AUDIT_PASSED`

Cumulativas. Nada além delas será exigido depois:

(a) **FIND-SIM-002-014** passar pelo `vericore-finding-validator` (Regra 22) e,
    então: ser remediado e retestado, **ou** receber decisão humana explícita de
    aceitação de risco **registrada em `coretriad/governance/APPROVALS.md`**, com
    escopo restrito ao SIM-002 e menção expressa à Regra 24 — nos moldes da
    APR-2026-005. Qualquer dos dois caminhos satisfaz esta condição.
(b) **Registro em `APPROVALS.md`** da decisão sobre FIND-010, FIND-012 e FIND-013.
(c) **Delta audit** concluído sobre `b6d44da` (ou sucessor) como novo
    `AUDIT_COMMIT` imutável, com **nova `AUDIT_COVERAGE_MATRIX`** que inclua, como
    item obrigatório da trilha `authorization`, a **procedência** de cada atributo
    de autorização, e que verifique OBS-006 (convergência de
    `SOFTWARE_RELEASE_PACKAGE.md:28` e formalização da BR de papéis).
(d) **Disposição das observações** OBS-001, 004, 005, 006, 007, 008 (triagem:
    finding, aceitação registrada ou extinção), e confirmação formal da extinção
    de OBS-003.

Não incluo entre as condições a remediação de FIND-010/012/013: uma vez
registrada a decisão de (b), eles ficam pendentes rastreados e não obstam.

## Escalonamento a humano (Regra 21)

1. **FIND-SIM-002-014** — papel autodeclarado na alçada de aprovação. Escalado com
   prioridade: é o único item aberto que toca controle financeiro do objeto
   auditado, e a Regra 24 exige tratamento explícito. **Decisão necessária:**
   estender o padrão da APR-2026-008 a `approveSupplier`, ou aceitar o risco
   restrito ao SIM-002 com registro. Não decido por analogia (Regra 6).
2. **OBS-SIM-002-007** — qual papel pode cancelar pagamento `created`. Lacuna
   deixada em aberto pela APR-2026-007.
3. **OBS-SIM-002-008** — política de retentativa/expiração para pagamento
   `failed` e migração do `CHECK` de status para bases preexistentes.
4. **Registro formal** da decisão sobre FIND-010/012/013 (fundamento 3).

## Handoff

- **CoreTriad Director:** `AUDIT_PASSED = NÃO`, com o quadro de risco
  materialmente melhor que o anterior; abrir **delta audit** sobre `b6d44da`;
  encaminhar os quatro itens de escalonamento; providenciar o registro em
  `APPROVALS.md` junto ao responsável humano.
- **vericore-finding-validator:** FIND-SIM-002-014 (HIGH) aguarda validação —
  Regra 22. A cláusula de elevação a CRITICAL nele registrada deve ser examinada,
  não presumida.
- **SanaCore:** 10 findings fechados; nada a remediar em FIND-014 até validação e
  decisão humana; conduta de declaração espontânea do risco residual registrada
  positivamente.
- **Relatórios:** este relatório, `21-findings/FIND-SIM-002-014.md` e
  `31-new-findings/NEW_OBSERVATIONS.md` são as entradas oficiais desta rodada.
