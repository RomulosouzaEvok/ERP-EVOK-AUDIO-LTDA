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

---

## 0. Ondas de remediação retestadas

| Onda | REMEDIATION_COMMIT | Findings no escopo | Suíte |
|---|---|---|---:|
| WAVE-A | `f0aaa7a` (produto byte-idêntico ao HEAD, verificado por hash de árvore) | FIND-001, FIND-007, FIND-008 (divergência B) | 20/20 |
| WAVE-B | `9f7b056` | FIND-002, FIND-011 | 17/17 |
| WAVE-C | `9ce4754` | FIND-003, FIND-005, FIND-006 | 22/22 |

Condição de independência atendida: o runner executou scripts próprios, fora do
repositório, sem reutilizar a suíte da OpusCore/SanaCore como única prova, e —
para WAVE-B — extraiu o código do `AUDIT_COMMIT` via `git show` e submeteu
original e remediado ao **mesmo** harness, obtendo reprodução do bug original.

Limitação de escopo registrada de saída: este reteste cobre **os findings
listados**, no commit de remediação de cada onda. Não é auditoria do commit
remediado como um todo. Mudanças posteriores ao `AUDIT_COMMIT` exigem delta audit
(Regras 12-14) — ver §3 e `31-new-findings/NEW_OBSERVATIONS.md`.

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

## 2. Quadro consolidado de vereditos

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

---

## 3. Veredito do run — AUDIT_PASSED?

### DECISÃO: **AUDIT_PASSED = NÃO**

RUN_STATUS: `RETEST_PARTIAL_COMPLETE — AUDIT_NOT_PASSED`

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

## 4. Handoff

- **CoreTriad Director**: `AUDIT_PASSED = NÃO`; abrir delta audit (condição `e`);
  encaminhar human gates.
- **SanaCore**: 7 findings fechados; FIND-008 permanece parcialmente remediado;
  registrada a discrepância de precisão do pacote de evidência da WAVE-C (§1.3,
  item 5) — sem imputação de má-fé e sem efeito sobre os vereditos.
- **Relatórios**: este relatório e `31-new-findings/NEW_OBSERVATIONS.md` são as
  entradas oficiais da fase de reteste do run SIM-002-AUD-001.
