# T-26 — CONSOLIDAÇÃO · **RODADA 3** (reconsolidação pós-T-34) · ERP-LEGACY-001-AUD-001

```
AUDIT_ID:      ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f   (única referência de leitura)
TRILHA:        T-26 — Consolidação e cobertura executada · RODADA 3
PRODUZIDO POR: vericore-audit-consolidator
DATA:          2026-08-16
REGIME:        read-only. Zero conexão de banco, zero execução, zero comando, zero requisição HTTP.
NATUREZA:      **ATUALIZAÇÃO RASTREÁVEL** de `07-findings/T-26_CONSOLIDACAO.md` (Rodada 1) e de
               `07-findings/T-26_CONSOLIDACAO_RODADA2.md` (Rodada 2). **Nenhuma linha de
               nenhuma das duas foi reescrita, apagada ou renumerada (Regra 15).** Toda mudança
               está declarada aqui na forma "DE → PARA", com motivo e autor da recomendação.
               NÃO emite finding novo (Regra 6). NÃO corrige nada (Regra 2). NÃO declara
               `AUDIT_PASSED`, `FINDINGS_CONFIRMED`, `RETEST_PASSED`, `FINDING CLOSED` nem
               `REMEDIATION COMPLETE` (Regras 3, 4, 18).
LEITURA:       este documento **não substitui** as Rodadas 1 e 2. Os três só valem lidos juntos.
               Onde divergirem, **prevalece esta Rodada 3**, e a divergência está registrada.
PAR DE COBERTURA: ⚠️ **NÃO EXISTE** `24-coverage/AUDIT_COVERAGE_EXECUTED_RODADA3.md`. O par
               obrigatório desta rodada **não foi produzido** e está declarado como lacuna em §7.3.
               O par vigente continua sendo `AUDIT_COVERAGE_EXECUTED_RODADA2.md`, que **é anterior**
               a T-31, T-32, T-33 e T-34.
```

---

## 0. O que esta rodada absorve, e o que ela não toca

**Absorve** (tudo o que entrou no corpus **depois** da Rodada 2):

| Origem | Natureza | IDs |
|---|---|---|
| `T-31_C137_SEMANTICA_COLUNA.md` | trilha (semântica de coluna, célula `C-137`) | 8 |
| `T-32_CLIENT_*.md` (6 relatórios) | trilha (célula `C-133`, `client/`) | 72 |
| `T-33_RASOS_BLOCO_A.md` / `_BLOCO_B.md` | trilha (43 endpoints rasos) | 40 |
| `AUD-COM-DESCONTO-01`, `AUD-RH-CPFSEARCH-01`, `AUD-TES-SALDOMANUAL-01`, `AUD-CTB-DEBCRED-01`, `AUD-PROC-DOCDRIFT-01` | findings formais promovidos por decisão humana | 5 |
| `T-34_VALIDACAO_5_FINDINGS_FORMAIS.md` | validação adversarial (Regra 22) | — |
| `T-34_VALIDACAO_T32_CLIENT.md` | validação adversarial (Regra 22) | — |
| `T-34_VALIDACAO_T33_RASOS.md` | validação adversarial (Regra 22) | — |
| `T-30_VALIDACAO_AUD-PROC-CUSTODIA-01.md` | validação adversarial (categoria processo) | — |
| `30-retest/RETEST_AUD-PROC-CUSTODIA-01.md` | reteste independente (categoria processo) | — |
| `G4_CE06_LOG_CONNECTIONS.md` | infraestrutura de evidência | — |

**Não toca:** nenhum enunciado técnico, severidade original, âncora ou autoria dos 323 IDs das
Rodadas 1 e 2 que não estejam nominalmente listados em §2 e §3. Onde a Rodada 2 escalou uma
divergência e ela não foi respondida, **ela continua escalada e aberta** (§6).

### 0.1 ⚠️ Divergências entre o mandato desta rodada e os artefatos — **o artefato vence (Regra 7)**

| # | O mandato diz | O artefato diz | Adotado |
|---|---|---|---|
| **MND-01** | "as **4** validações do T-34" | Existem **3** documentos `T-34_*` em `07-findings/`. O quarto ato de validação da leva é `T-30_VALIDACAO_AUD-PROC-CUSTODIA-01.md`, que **não** é T-34 e é de categoria separada (processo) | **3 documentos T-34**, absorvidos; `T-30` absorvido em §5 como categoria própria |
| **MND-02** | "7 HIGH dos rasos — **5 mantidos** (`T33-A-F01`, `T33-A-F02`, `T33-A-F04`, `T33-B-F02`)" | `T-34_VALIDACAO_T33_RASOS.md:35-37,424-426` declara **4 mantidos**, e enumera exatamente esses **4** IDs | **4 mantidos.** O "5" do mandato não tem lastro na enumeração |
| **MND-03** | "13 HIGH do client — 7 mantidos" | `T-34_VALIDACAO_T32_CLIENT.md:17` traz **`6`** na coluna "Qtd" e **7 IDs** enumerados na mesma célula; `:24` corrige para **"7 mantidos em HIGH"** | **7**, por enumeração de ID (mesmo critério de `OBS-T26-04`/`-08`/`-09`). A incoerência interna do próprio placar de T-34 fica registrada como `OBS-T26-20` |

---

## 1. ⚠️ REGRA DE ID DESTA RODADA — reforçada, não relaxada

A Rodada 2 §1 fixou a qualificação obrigatória dos IDs de `T-27`. **Colisão de ID já quebrou uma
consolidação nesta run**, e as trilhas novas trouxeram três novas famílias de colisão potencial.
Fixo aqui, com o mesmo caráter vinculante:

> 1. **Nenhum ID de `T-32` pode ser referenciado sem a área.** As formas `F01`, `F02`, `SUP-F01`,
>    `PROD-F01` são **ambíguas e rejeitadas**. Canônico: **`T32-PROD-Fnn`**, `T32-QUAL-Fnn`,
>    `T32-LAB-Fnn`, `T32-ENG-Fnn`, `T32-HRJUR-Fnn`, `T32-FST-Fnn`, `T32-SUP-Fnn`, `T32-COM-Fnn`,
>    `T32-TRV-Fnn`. **Motivo material:** existe `T32-PROD-F01` **e** `T32-SUP-F01` **e**
>    `T32-COM-F01` **e** `T32-FST-F01` **e** `T32-HRJUR-F01` — cinco findings distintos, todos
>    HIGH na proposta, com desfechos de validação **diferentes** (`T32-PROD-F01` foi rebaixado;
>    `T32-SUP-F01`, `T32-FST-F01` e `T32-HRJUR-F01` foram mantidos; `T32-COM-F01` foi promovido a
>    CRITICAL). Uma referência a "F01" pode significar cinco coisas incompatíveis.
> 2. **Nenhum ID de `T-33` pode ser referenciado sem o bloco.** Canônico: **`T33-A-Fnn`** e
>    **`T33-B-Fnn`**. **Motivo material:** `T33-A-F01` (preço × custo, HIGH mantida) e `T33-B-F01`
>    (`equipment_description`, HIGH → MEDIUM) coexistem, assim como `T33-A-F02`/`T33-B-F02` e
>    `T33-A-F03`/`T33-B-F03` — e neste último par um foi **promovido a finding formal** e o outro
>    foi marcado **`DUPLICATE`**. Trocar os dois inverteria completamente o encaminhamento.
> 3. **Os IDs de `T-31` são `AUD-DB-T31-nn`** e **não** devem ser abreviados para `T31-nn` nem
>    confundidos com `AUD-DB-01`…`-09` de `T-03`, que são outra série, de outra trilha, com outra
>    autoria. `AUD-DB-03` (T-03) e `AUD-DB-T31-03` (T-31) são findings **diferentes** e ambos
>    aparecem nesta rodada.
> 4. Os cinco findings formais usam a série `AUD-<MÓDULO>-<TEMA>-01` e **não** têm forma curta.
> 5. Os IDs de divergência desta leva: `T-34_VALIDACAO_5_FINDINGS_FORMAIS.md` usa `D-1`…`D-6`;
>    `T-34_VALIDACAO_T32_CLIENT.md` usa `D-1`…`D-10`; `T-34_VALIDACAO_T33_RASOS.md` usa `D1`…`D10`.
>    **As três séries colidem integralmente entre si.** Canônico desta consolidação:
>    **`DIV-T34-FORM-01…06`**, **`DIV-T34-CLI-01…10`**, **`DIV-T34-RAS-01…10`**. A forma crua
>    `D-1` é rejeitada. Registrado como `OBS-T26-21`.

---

## 2. PLACAR CONSOLIDADO — **DE → PARA**, com o delta decomposto

### 2.1 Entradas brutas desta rodada, antes de qualquer decisão

Contagem **por enumeração de ID**, nunca por resumo (mesmo critério das Rodadas 1 e 2):

| Origem | Total | CRIT | HIGH | MED | LOW | INFO |
|---|---|---|---|---|---|---|
| `T-31` (`AUD-DB-T31-01`…`-08`) | 8 | 0 | 2 | 6 | 0 | 0 |
| `T-32` / `PRODUCAO_QUALIDADE` (`T32-PROD-F01`…`F06`, `F13`…`F15`; `T32-QUAL-F07`…`F09`; `T32-LAB-F10`, `F11`; `T32-ENG-F12`) | 15 | 0 | 4 | 10 | 1 | 0 |
| `T-32` / `SUPRIMENTOS` (`T32-SUP-F01`…`F14`) | 14 | 0 | 4 | 7 | 3 | 0 |
| `T-32` / `COMERCIAL_FINANCEIRO` (`T32-COM-F01`…`F14`) | 14 | 0 | 2 | 6 | 6 | 0 |
| `T-32` / `HR_JURIDICO` (`T32-HRJUR-F01`…`F10`) | 10 | 0 | 1 | 4 | 5 | 0 |
| `T-32` / `FACILITIES_SST_TI` (`T32-FST-F01`…`F10`) | 10 | 0 | 3 | 5 | 2 | 0 |
| `T-32` / `TRANSVERSAIS` (`T32-TRV-F01`…`F09`) | 9 | 0 | 0 | 2 | 7 | 0 |
| `T-33` / Bloco A (`T33-A-F01`…`F24`) | 24 | 0 | 5 | 12 | 7 | 0 |
| `T-33` / Bloco B (`T33-B-F01`…`F16`) | 16 | 0 | 3 | 7 | 5 | 1 |
| **Findings formais** (`AUD-COM-DESCONTO-01`, `AUD-RH-CPFSEARCH-01`, `AUD-TES-SALDOMANUAL-01`, `AUD-CTB-DEBCRED-01`, `AUD-PROC-DOCDRIFT-01`) | 5 | 1 | 3 | 1 | 0 | 0 |
| **TOTAL BRUTO NOVO** | **125** | **1** | **27** | **60** | **36** | **1** |

**Conferência com a declaração das trilhas de origem:** `T-31` §10 declara "8 `PROPOSED`, 2 HIGH" —
confere. `T-32_CLIENT_PRODUCAO_QUALIDADE.md:288` declara "15 findings (4 HIGH, 9 MEDIUM, 1 LOW, 1
MEDIUM com confiança média)" — confere pela enumeração (10 MEDIUM, sendo 1 de confiança MÉDIA; a
confiança não altera a severidade). `T-33` Bloco A enumera `F01`…`F24` (o resumo do bloco não declara
placar por severidade); Bloco B enumera `F01`…`F16`. **Total de T-32 conferido por varredura de ID
distinto: 72.** `T-34_VALIDACAO_T32_CLIENT.md` operou sobre **13 HIGH** — que é 14 menos
`T32-COM-F01`, expressamente fora de escopo por já ter sido promovido (`:8`). Fecha.

### 2.2 Deduplicação aplicada — **7 IDs saem do placar de vigentes**

Detalhamento, âncora e critério em §3. Aqui só o efeito aritmético:

| ID absorvido | Sev. que carregava | ID sobrevivente | Efeito no placar |
|---|---|---|---|
| `T32-COM-F01` | HIGH | `AUD-COM-DESCONTO-01` | −1 HIGH (novos) |
| `T33-A-F03` | HIGH | `AUD-RH-CPFSEARCH-01` | −1 HIGH (novos) |
| `AUD-DB-T31-02` | HIGH | `AUD-CTB-DEBCRED-01` | −1 HIGH (novos) |
| `AUD-DB-T31-07` | HIGH | `AUD-TES-SALDOMANUAL-01` | −1 HIGH (novos) |
| `T33-B-F03` | HIGH | `AUD-DB-03` (T-03, pré-existente) | −1 HIGH (novos) |
| `T32-COM-F14` | LOW | `T32-TRV-F09` | −1 LOW (novos) |
| **`T-10-02`** (pré-existente, Rodada 1) | HIGH | `AUD-COM-DESCONTO-01` | **−1 HIGH na base da Rodada 2** |

### 2.3 Mudanças de severidade aplicadas por `T-34` — 8 rebaixamentos, 0 elevações

| ID canônico | DE | PARA | Documento que decidiu |
|---|---|---|---|
| `T32-PROD-F01` | HIGH | **MEDIUM** | `T-34_VALIDACAO_T32_CLIENT.md` §2 |
| `T32-QUAL-F07` | HIGH | **MEDIUM** | idem |
| `T32-LAB-F10` | HIGH | **MEDIUM** | idem |
| `T32-FST-F02` | HIGH | **MEDIUM** | idem |
| `T32-COM-F03` | HIGH | **MEDIUM** | idem |
| `T32-SUP-F04` | HIGH | **MEDIUM** | idem (`CONFIRMED_PARCIAL`) |
| `T33-A-F05` | HIGH | **MEDIUM** | `T-34_VALIDACAO_T33_RASOS.md` §2.4 |
| `T33-B-F01` | HIGH | **MEDIUM** | `T-34_VALIDACAO_T33_RASOS.md` §2.5 |

**Nenhuma outra severidade foi alterada.** Em particular: **`AUD-CTB-DEBCRED-01` permanece HIGH**
(§3.4 e §4.1). **`AUD-PROC-CUSTODIA-01` permanece HIGH** (T-30 atacou dos dois lados e manteve).

### 2.4 Composição das entradas **líquidas** desta rodada

| | CRIT | HIGH | MED | LOW | INFO | Total |
|---|---|---|---|---|---|---|
| Bruto novo (§2.1) | 1 | 27 | 60 | 36 | 1 | **125** |
| − absorvidos entre os novos (§2.2) | 0 | −5 | 0 | −1 | 0 | **−6** |
| − rebaixados HIGH→MEDIUM (§2.3) | 0 | −8 | +8 | 0 | 0 | 0 |
| **LÍQUIDO NOVO** | **1** | **14** | **68** | **35** | **1** | **119** |

Os 14 HIGH novos vigentes, nominalmente: `T32-PROD-F02`, `T32-HRJUR-F01`, `T32-FST-F01`,
`T32-FST-F04`, `T32-SUP-F01`, `T32-SUP-F02`, `T32-SUP-F03`, `T33-A-F01`, `T33-A-F02`, `T33-A-F04`,
`T33-B-F02`, `AUD-RH-CPFSEARCH-01`, `AUD-TES-SALDOMANUAL-01`, `AUD-CTB-DEBCRED-01`.
O CRITICAL novo: `AUD-COM-DESCONTO-01`.

### 2.5 PLACAR — Rodada 2 → **Rodada 3**

| Severidade | Rodada 2 | **Rodada 3 (produto)** | Composição do delta |
|---|---|---|---|
| **CRITICAL** | 6 | **7** | +1 `AUD-COM-DESCONTO-01` (promoção formal com severidade **fixada pelo dono**) |
| **HIGH** | 74 | **87** | +14 líquidos · **−1** (`T-10-02` absorvido por `AUD-COM-DESCONTO-01`) |
| **MEDIUM** | 155 | **223** | +60 propostos · +8 rebaixados de HIGH |
| **LOW** | 77 | **112** | +36 propostos · −1 absorvido (`T32-COM-F14`) |
| **INFO** | 10 | **11** | +1 (`T33-B-F16`) |
| **TOTAL VIGENTE (produto)** | **322** | **440** | **+118** |
| `FALSE_POSITIVE` | 1 | **1** | inalterado (`T11-F10`). **T-34 produziu 0 falsos positivos nos três blocos** |
| `DUPLICATE`/absorvidos marcados nesta rodada | — | **7** | §2.2 |
| **TOTAL DE IDs EMITIDOS (produto)** | 323 | **448** | 323 + 125 |
| **Processo da auditoria** (categoria separada, §5) | 1 | **1** | `AUD-PROC-CUSTODIA-01` — inalterado no placar; **estado mudou** (§5) |

**Conferência aritmética, refeita célula a célula:**
7 + 87 + 223 + 112 + 11 = **440 vigentes**. 440 + 1 `FALSE_POSITIVE` + 7 absorvidos = **448 IDs
emitidos**. E 323 (Rodada 2) + 125 (§2.1) = **448**. Fecha nos dois sentidos.
Verificação independente do delta: 322 − 1 (`T-10-02`) + 119 (§2.4) = **440**. Fecha.

**Resposta direta ao item 1 do mandato — o delta em três números:**
**entraram 125 IDs**; **8 mudaram de severidade** (todos HIGH→MEDIUM, nenhuma elevação);
**7 saíram do placar de vigentes por absorção/duplicata** (6 dos novos + 1 pré-existente).

### 2.6 ⚠️ Divergência aritmética herdada, registrada e **não conciliada**

A Rodada 1 declara **254 IDs** e **253 vigentes** (254 − 1 `FALSE_POSITIVE`), e a Rodada 2 §12
afirma que **"6 `DUPLICATE` da Rodada 1 permanecem marcados"**. **Os 6 `DUPLICATE` não aparecem
subtraídos em nenhuma das duas aritméticas** — ou estavam fora dos 254, ou estão dentro dos 253
vigentes. **Não determino qual**, porque decidir sem reabrir a enumeração da Rodada 1 seria escolher
por conveniência de fechamento, e as duas leituras deslocam o total de produto em 6.

**O que eu faço, e é o máximo defensável:** minha própria contabilidade de absorção (§2.2) é
explícita e separada — os 7 absorvidos **saem** dos vigentes e **entram** num balde próprio, e a
soma fecha nos dois sentidos **dentro do meu delta**. **Se a leitura correta da Rodada 1 for a de
que os 6 estão dentro dos 253, o total de produto vigente desta rodada é 434, não 440.** Registrado
como **`OBS-T26-19`**, endereçado ao director. **Não escolho o número que me convém.**

---

## 3. DEDUPLICAÇÃO — lista completa, com sobrevivente e absorvido

**Método inalterado das Rodadas 1 e 2:** `DUPLICATE`/absorção só quando é **o mesmo defeito, no
mesmo objeto, com a mesma âncora**, ou quando um ID é a **promoção formal** de outro. Eixos distintos
sobre o mesmo objeto ⇒ `COMPLEMENTAR` (os dois permanecem; o defeito conta **uma vez** na
priorização). **Nenhum finding foi descartado; todos os absorvidos estão marcados com rastreio.**

### 3.1 Absorções por **promoção formal** (o ID de trilha vira finding formal)

| # | Absorvido | Sobrevivente (canônico) | Prova documental |
|---|---|---|---|
| **DUP-R3-01** | `T32-COM-F01` (HIGH) | **`AUD-COM-DESCONTO-01`** (CRITICAL) | `AUD-COM-DESCONTO-01.md:29-30,384` — *"origem (cliente): `T32-COM-F01`"* |
| **DUP-R3-02** | **`T-10-02`** (HIGH, Rodada 1) | **`AUD-COM-DESCONTO-01`** (CRITICAL) | `AUD-COM-DESCONTO-01.md:29,74,382` — *"origem (servidor): `T-10-02`, validado `CONFIRMED` na Rodada 3-A"*. ⚠️ **É o único caso desta rodada em que um ID de rodada anterior sai do placar de vigentes.** Marcado, não apagado: `T-10-02` permanece íntegro no `T-10_SUPRIMENTOS_VENDAS.md` e no veredito de `T-25` Rodada 3-A (Regra 15) |
| **DUP-R3-03** | `T33-A-F03` (HIGH) | **`AUD-RH-CPFSEARCH-01`** (HIGH) | `AUD-RH-CPFSEARCH-01.md:345` — *"origem: `T33-A-F03` (`T-33_RASOS_BLOCO_A.md:71-91`) — esta é a promoção formal"*; e `T-34_VALIDACAO_T33_RASOS.md:8` põe `T33-A-F03` fora do seu escopo por esse motivo |
| **DUP-R3-04** | `AUD-DB-T31-02` (HIGH) | **`AUD-CTB-DEBCRED-01`** (HIGH) | `AUD-CTB-DEBCRED-01.md:439-440` — *"`AUD-DB-T31-02` deve ser marcada como **PROMOVIDA** a `AUD-CTB-DEBCRED-01`"* |
| **DUP-R3-05** | `AUD-DB-T31-07` (HIGH) | **`AUD-TES-SALDOMANUAL-01`** (HIGH) | `AUD-TES-SALDOMANUAL-01.md:378-380` — mesma fórmula |

**Nota obrigatória sobre `AUD-PROC-DOCDRIFT-01`:** sua origem é *"observação lateral em
`T-33_RASOS_BLOCO_A.md:89-91`"* (`AUD-PROC-DOCDRIFT-01.md:276`) — **observação, não finding com ID**.
Portanto **não há ID absorvido** por ele, e ele **não** duplica `T33-A-F03`: aquele é o oráculo de
CPF; este é o selo de remediação falso sobre `BR-RH-020`. Objetos distintos, remediações distintas.

### 3.2 `DUPLICATE` decidido pelo validador — acolhido

| # | Absorvido | Sobrevivente | Fundamento |
|---|---|---|---|
| **DUP-R3-06** | `T33-B-F03` (HIGH) | **`AUD-DB-03`** (HIGH, T-03) | `T-34_VALIDACAO_T33_RASOS.md` §2.7: `serviceOrders` é **um dos 13 módulos nominalmente listados** em `AUD-DB-03` (`T-03_AUDIT_LOG_REPORT.md:46-58`, `:49`), confirmado na fonte primária que T-03 cita (`server/tests/unit/audit-coverage-guard.test.ts:49-63`, `'serviceOrders'` em `:59`). **Mesma condição, mesmo `AUDIT_COMMIT`, mesmo mecanismo, mesma remediação.** **Não segue como item próprio** |

**A materialidade específica não se perde** — e eu a carrego para o roteamento, porque é insumo de
priorização e não de contagem: dos 13 módulos de `AUD-DB-03`, `serviceOrders` é o que carrega
**valor cobrado do cliente** (`labor_cost`, `total_amount`) e **prazo de garantia**
(`warranty_days`), e por isso deve ser **priorizado dentro do lote** de `AUD-DB-03`, **sem criar
lote paralelo**. O mérito, a severidade e o eventual encerramento de `AUD-DB-03` são de T-03 e do
seu validador; **nada aqui reclassifica aquele finding**.

### 3.3 Duplicata plena **decidida por mim** — mesma âncora, mesmo enunciado

| # | Absorvido | Sobrevivente | Fundamento |
|---|---|---|---|
| **DUP-R3-07** | `T32-COM-F14` (LOW) | **`T32-TRV-F09`** (LOW) | Mesmo objeto, **mesma âncora**: `httpClient.ts:3-18` (`T32-COM-F14`) e `httpClient.ts:3-18` (`T32-TRV-F09`), mesmo enunciado ("JWT em `localStorage`, sem `HttpOnly`"). O próprio `T32-COM-F14` se autodeclara *"provável duplicata … com pedido explícito de deduplicação"*. **Sobrevive o de `T-32 TRANSVERSAIS`** porque é o titular do escopo transversal e é o que traz as mitigações verificadas (nenhum outro dado sensível persistido, cache só em memória, papel não persistido, revogação por `passwordVersion`) |

⚠️ **O que eu NÃO decido aqui:** ambos os relatórios remetem a `T-18`/`T-21` e a `AUD-AUTHN-05`.
**Não marco `T32-TRV-F09` como duplicata de nenhum ID de `T-18`/`T-21` sem o inventário daqueles
findings** — seria descartar finding sem evidência. Fica como **`DUP-ABERTA-02`**, escalada ao
director com o mesmo critério publicado de `DUP-ABERTA-01`: se existir ID de `T-18`/`T-21` sobre
`httpClient.ts:3-18`, `T32-TRV-F09` é `DUPLICATE` dele; se não existir, é achado próprio e o placar
daquelas trilhas precisa de correção **por adição**.

### 3.4 Sobreposição de **remediação** com `AUD-DB-03` — a dedupe que o validador pediu

Este é o item 2 das duas divergências que `T-34_VALIDACAO_T33_RASOS.md` (`DIV-T34-RAS-09`) devolveu
expressamente ao consolidador. **Decido, e o critério está declarado.**

| ID | Objeto | Interseção com `AUD-DB-03` | **Decisão** |
|---|---|---|---|
| `T33-B-F03` | `serviceOrders` sem `logAction` | **1 de 13 módulos** — integral | **`DUPLICATE`** (§3.2). Sai do placar |
| **`T33-A-F06`** (MEDIUM) | `clients`, `employees`, `nonConformities` sem **nenhum** audit log, em 9 endpoints de escrita | **3 de 13 módulos** — integral | **`SUBSUMIDO-PARCIAL`.** ⚠️ **NÃO é `DUPLICATE`** e **permanece vigente como ID, com a severidade MEDIUM que a trilha lhe deu** — porque tem enunciado próprio (mede 9 endpoints nominais e a ausência de middleware global em `app.ts`) e severidade distinta da de `AUD-DB-03`. **Mas NÃO gera lote de remediação próprio:** os 3 módulos são remediados **dentro** do lote de `AUD-DB-03`, e o defeito conta **uma vez** na priorização |
| `T27-SST-F06` (MEDIUM, Rodada 2, **C-21**) | `epiController.ts` sem `logAction` nas 8 rotas | instância nominal do mesmo defeito | **inalterado** — permanece `COMPLEMENTAR` como a Rodada 2 o classificou. Registro que agora são **três** IDs orbitando `AUD-DB-03` |

**Por que `T33-A-F06` não vira `DUPLICATE`:** marcar `DUPLICATE` obrigaria a apagar a medição de 9
endpoints e a observação sobre `app.ts` — que `AUD-DB-03` **não contém**. Marcar `COMPLEMENTAR`
puro deixaria a SanaCore abrir dois casos para a mesma correção. `SUBSUMIDO-PARCIAL` é a única
classificação que preserva a evidência **e** impede a remediação em duplicidade. **A decisão de
severidade agregada do conjunto `AUD-DB-03` + `T33-A-F06` + `T33-B-F03` + `T27-SST-F06` +
`AUD-DB-04` + `T33-A-F05` é do director** — ver §4.2 e §6.2.

### 3.5 Vínculos de remediação **sem** duplicidade de ID (contam uma vez na priorização)

| # | IDs | Objeto comum | Tratamento |
|---|---|---|---|
| **C-29** | `T33-A-F02` (HIGH) + célula `T-15_REQUISITOS_UC_RASTREABILIDADE.md:230` (RF-QUA-02, IMPL-DIV HIGH, **sem FIND-ID promovido**) | `effectiveness_result` sem caminho de escrita | `DIV-T34-RAS-04` pediu que eu amarrasse. **Amarro:** `T33-A-F02` **não** é duplicata — é a **promoção formal, com evidência própria**, daquela célula de matriz. **Um único item de remediação.** A célula de T-15 permanece íntegra (Regra 15) |
| **C-30** | `T33-A-F13` + `T33-A-F14` + `T33-B-F01` (todos MEDIUM após §2.3) | "campo aceito na borda, respondido 200 e descartado em silêncio" | **Uma classe, uma guarda** (contrato de borda × model), não três correções pontuais — recomendação expressa do validador (`T-34_VALIDACAO_T33_RASOS.md` §2.5). Causa-raiz comum exposta em `server/src/types/models.d.ts:248`: **o tipo do servidor não é derivado do model**, e por isso o `tsc --noEmit` é cego ao defeito |
| **C-31** | `T32-SUP-F03` (HIGH) + `AUD-INTEG-03` (T-06) | "estoque inicial" cria saldo sem movimento e sem depósito | Cruzamento **confirmado por leitura própria** do validador; e ele **ampliou**: o saldo fantasma alimenta a netagem do MRP (`SequelizeItemRepository.ts:90-112` → `GenerateMrpPlanUseCase.ts:94-101` → `mrpEngine.ts:246-254`). Os dois permanecem; conta uma vez |
| **C-32** | `T32-SUP-F01` (HIGH) + `T32-HRJUR-F01` (HIGH) + `T32-SUP-F09` (MEDIUM) | `translateApiError.ts:213-215` **descarta a mensagem em português** quando há `details`, exibindo a chave crua ao usuário | `DIV-T34-CLI-02` estabeleceu o mecanismo comum. **`T32-SUP-F09` é a causa-raiz transversal**; os outros dois são consequências **em fluxos de alto risco** (alçada G11 e prazo fatal). Remediar `T32-SUP-F09` **reduz** os outros dois, mas **não os fecha** — o beco funcional permanece |
| **C-33** | `T32-QUAL-F07` + `T32-HRJUR-F04` + `T32-SUP-F05` + `T32-FST-F08` (todos MEDIUM) | "ação às cegas": UI autoriza por papel legado, backend por módulo/nível | Classe única, **base explícita da calibração** do rebaixamento de `T32-QUAL-F07`. Objetos distintos ⇒ **não fundir**, mas priorizar como classe |
| **C-34** | `T32-TRV-F08` + `T33-B-F02` | `DashboardPage.tsx` órfã | `DIV-T34-RAS-08`: `T33-B-F02` creditava a `DashboardPage.tsx` uma filtragem que **não existe para aquele payload**, e o componente é órfão (`App.tsx:112-119`) — fato que `T32-TRV-F08` já registrara. **A premissa cai e o finding fica mais forte** |
| **C-35** | `T32-FST-F02` (MEDIUM) + `T32-FST-F03` (MEDIUM) | CAT: `tipo` hard-coded no cliente | `DIV-T34-CLI-07`: o tipo do cliente é `CatTipo = 'inicial' \| 'reabertura'` (`client/src/api/sst.ts:374`) e o model aceita `'obito'` (`SstCat.ts:38`) — **a mesma causa produz os dois findings**. Remediação conjunta |

### 3.6 Duplicatas plenas **entre** os 125 novos e o corpus antigo: **ZERO** além das listadas

Registro simétrico obrigatório: fora das 7 absorções de §3.1–§3.3, **nenhum dos 125 IDs novos é
duplicata plena de ID pré-existente**. Os três validadores de `T-34` declararam expressamente
**0 `DUPLICATE`** nos seus blocos, exceto o de §3.2. **Limite declarado:** minha dedupe é
**sintática** (mesmo objeto, mesma âncora, mesmo enunciado), **não semântica** — e o risco cresceu
nesta rodada, porque `T-32` auditou o **outro lado** (`client/`) de superfícies que as trilhas de
servidor já haviam auditado. Dois findings com vocabulário e âncora diferentes sobre o mesmo defeito
**podem ter escapado**. Ver §7.2.

---

## 4. DECISÕES DE SEVERIDADE E STATUS — **DE → PARA**, nunca silenciosas

### 4.1 ⚠️ `AUD-CTB-DEBCRED-01` — **HIGH PRESERVADA**, com recomendação de rebaixamento **PENDENTE**

**Este é o item mais delicado da rodada e não o simplifico.**

| Eixo | Estado |
|---|---|
| **Veredito de fato** | **`CONFIRMED`** — e mais forte do que era: `T-34_VALIDACAO_5_FINDINGS_FORMAIS.md` §1 **fechou a lacuna das 169 migrations** por 4 varreduras independentes (migrations, palavra-chave cruzada, `current_balance` em todo `server/`, e camada de ORM). A ressalva "MEDIUM quanto ao banco atual" **cai** |
| **Severidade vigente** | **HIGH — INALTERADA.** Fixada por **decisão humana do dono** (`AUD-CTB-DEBCRED-01.md:20`). Regra 18: **não a altero, e o validador não a alterou** |
| **Recomendação pendente** | O `vericore-finding-validator` **recomendou formalmente o rebaixamento a MEDIUM** e **não o aplicou** (`T-34_VALIDACAO_5_FINDINGS_FORMAIS.md` §4.4). Fundamento: 4 camadas de contenção (autorização de módulo `accounting.ts:41-44`; Zod `.min(0)` + `.strict()`; `validateEntryItemsShape` nos dois escritores; `ReverseEntryUseCase` preserva a invariante por construção) e **nenhum caminho de alcance demonstrado no `AUDIT_COMMIT`** — a materialização exige **escritor futuro que ainda não existe**. Régua interna citada: `AUD-DB-T31-01` (mesma família) é MEDIUM |
| **Fato novo que pesa na calibragem** | `AccountingEntryItem.ts:6-14` **documenta a lacuna explicitamente** (*"validado em `CreateEntryUseCase`/`UpdateEntryUseCase`, **não no banco**"*) ⇒ é **dívida técnica declarada e versionada**, não omissão (`DIV-T34-FORM-05`) |
| **Estado** | ⏳ **PENDENTE DE DECISÃO DO DONO** — §6.1, item D-01 |

**Registro de peso igual, que não pode ser perdido no caminho:** o validador identificou dentro do
finding **um defeito real que sobrevive independentemente do desfecho da severidade** —
`PostEntryUseCase.ts:66-67` **ignora** valores `<= 0` em vez de **rejeitá-los**, e isso vale **mesmo
com CHECK no banco**. É o item de **maior valor por menor custo** de todo o finding
(`T-34_VALIDACAO_5_FINDINGS_FORMAIS.md` §4.3). **Se o dono rebaixar a severidade, este item não deve
cair com ela.**

**Custo declarado das duas saídas, para que nenhuma seja lida como neutra:**
(a) **Mantendo HIGH:** o finding permanece no regime obrigatório da Regra 22 (já cumprido) e entra
na faixa de pré-condição de veredito do `AUDIT_PLAN.md` §11.2 — e o placar de HIGH desta run carrega
um item cuja alcançabilidade o validador declarou não demonstrada.
(b) **Rebaixando a MEDIUM:** sai do regime obrigatório, **e o gatilho de reelevação precisa ser
carregado explicitamente para o backlog** — *"qualquer script, migration ou rotina de importação que
passe a escrever em `accounting_entry_items` sem atravessar `CreateEntryUseCase`/`UpdateEntryUseCase`"*.
**Eu o carrego aqui nas duas hipóteses.**

### 4.2 `AUD-TES-SALDOMANUAL-01` — HIGH mantida no núcleo, `AUDIT_IMPACT` **rebaixado**

| Eixo | DE | PARA |
|---|---|---|
| Veredito | `PROPOSED` | **`CONFIRMED`** (com 1 refutação parcial de escopo) |
| Severidade | HIGH (fixada pelo dono) | **HIGH — inalterada, sustentada no núcleo** |
| `AUDIT_IMPACT` | *"Não é possível determinar, pelo schema, quem alterou o saldo de caixa e quando"* | ⇩ **REBAIXADO.** `bankAccountController.ts:78-85` **já registra** `logAction` com `newValues: parsed.data`, que **inclui `current_balance`**; o `POST` tem log equivalente (`:56-63`). **A trilha existe e diz quem e para quanto; não diz de quanto veio** — falta `oldValues` (`DIV-T34-FORM-03`) |
| Recomendação §6 | *"Registrar em `auditLogs` toda alteração de `current_balance`"* | ⇩ **"acrescentar `oldValues` ao log já existente"** — mudança de esforço de **ordem de grandeza** |
| Âncora | `UpdateBankAccountUseCase.ts:51` | **+ terceira âncora**, complementar: `SequelizeTreasuryRepository.ts:43-48` — `await account.update(data)` com o objeto inteiro, **sem whitelist de campos** (`DIV-T34-FORM-04`) |

**Por que a severidade não cai junto:** a refutação parcial afeta **um dos quatro eixos de impacto**,
não o achado. O núcleo — ausência estrutural de derivação num dado de decisão financeira, provada por
exaustão sobre `server/` inteiro, sem controle compensatório que a supra — permanece, e o contraste
interno é real (o subsistema OFX vizinho **tem** constraint, `00_baseline_frozen.sql:3760`).
**O item (f) da `RETEST_SPECIFICATION` continua válido e é o único que importa.**

### 4.3 `AUD-PROC-DOCDRIFT-01` — MEDIUM sustentada, **escopo ampliado para cima**

| Eixo | DE | PARA |
|---|---|---|
| Veredito | `PROPOSED` | **`CONFIRMED`** |
| Severidade | MEDIUM (juízo do auditor) | **MEDIUM — sustentada** |
| Escopo declarado | *"uma declaração falsa em um arquivo"* (`BRIEF_RH_2026-08-06.md:158,219`) | ⇧ **pelo menos três declarações em dois arquivos**: acrescenta `docs/governance/HANDOFF_CODEX.md:8550` (*"Bloco 0 — BR-RH-020 … (Concluído)"*) e `:8557` (*"Status: ✅ Concluído"*), com propagação registrada em `:8627` |
| Item (c) da `RETEST_SPECIFICATION` | pendente | ⚠️ **JÁ FALHA HOJE** — ele exige que *"nenhum outro artefato versionado afirme `BR-RH-020` como remediada"*, e **um afirma**. O reteste reprovaria **mesmo que o brief fosse corrigido** |
| Item 1 da §6 (remediar "as duas declarações") | — | **insuficiente por construção** |

⚠️ **`docs/governance/HANDOFF_CODEX.md` é registro histórico e NÃO pode ser alterado.**
A divergência é **registrada, não corrigida** — e essa é a única saída compatível com as Regras 2 e
15. Consequência operacional que declaro expressamente, porque muda o desenho do reteste:
**o item (c) da `RETEST_SPECIFICATION`, como está redigido, é insatisfazível sem violar a
imutabilidade do registro histórico.** Ou o item (c) é reescrito para excluir artefatos históricos e
exigir, em seu lugar, um **registro de correção por adição** (errata, nota de divergência ou índice
de estado que aponte o valor correto), ou o finding nasce com um critério de reteste que ninguém pode
cumprir. **Não reescrevo o item (c) — a redação é do produtor e a decisão de escopo é do director.**
Escalado em §6.2, item T-04.

**Registro em favor do artefato auditado, para não inflar:** os `COMMENT ON COLUMN` do baseline que
citam `BR-RH-020` (`:4938`, `:5847`, `:5981`, `:6100`, `:6107`) **não** afirmam estado de remediação
— declaram que o campo **segue** a segregação. **Não são instâncias do defeito e não contam.**

### 4.4 `AUD-COM-DESCONTO-01` e `AUD-RH-CPFSEARCH-01` — CRITICAL e HIGH **sustentadas, sem ressalva de mérito**

- **`AUD-COM-DESCONTO-01`** — `CONFIRMED`, **CRITICAL sustentada**. Cinco hipóteses refutadoras
  (`R-1`…`R-5`) tentadas e **todas falharam**, uma delas com prova negativa **mais forte** que a do
  produtor (`grep -i 'discount|desconto|vDesc'` em **todo** `server/src/modules/fiscal/` → **0
  ocorrências**). O par `F-41`/`BR-COM-010` foi conferido em **cinco artefatos independentes** e é
  **pré-existente ao finding**. **Sem ressalva.**
- **`AUD-RH-CPFSEARCH-01`** — `CONFIRMED`, **HIGH sustentada**. `R-9`…`R-12` falharam, e `R-12`
  **ampliou o vetor**: a resposta devolve `total` (`ListEmployeesUseCase.ts:67`), logo **a própria
  contagem é oráculo**, mesmo que `name` fosse mascarado. **Ressalva de escopo de remediação, não de
  mérito:** o item 4 da §6 (instrumentar a trilha) deve ser tratado como **parte da remediação, não
  como opcional** — porque `employeeController` **não emite `logAction` em nenhuma operação**, nem
  leitura, nem `create`, nem `update`, nem `delete` (`DIV-T34-FORM-01`).

⚠️ **`DIV-T34-FORM-01` é subsunção pendente e eu a decido aqui:** a ausência total de `logAction` em
`employeeController` é **exatamente o defeito que `T33-A-F06` mede** (`employees` entre os 3 módulos)
e que `AUD-DB-03` mede em superfície. **Trato como a mesma família de §3.4** — a instrumentação de
`employees` é remediada **dentro** do lote de `AUD-DB-03`, e `AUD-RH-CPFSEARCH-01` **depende** dela
para que o item 4 da sua §6 seja verificável. Dependência de ordem registrada em §4.7 (**OR-16**).

### 4.5 Os 8 rebaixamentos — **ACOLHIDOS**, com o custo declarado

**Acolho os 8** pelo mesmo fundamento que a Rodada 1 §3.2 aplicou a `T13-F01`/`T13-F04` e a Rodada 2
§4.1 aplicou aos três de `T-28`, e aplico-o simetricamente para não ter dois pesos: **a refutação é
de explorabilidade ou de impacto, não de fato.** Nos oito, o fato permanece `CONFIRMED` com âncora
**relida pelo validador**; o que cai é a narrativa de dano. **Severidade é função de impacto.**

| ID | DE → PARA | Evidência que decidiu (avaliada por mim quanto à **estrutura da prova**; **não reli o código**) | **O que NÃO está resolvido, e a condição de reelevação** |
|---|---|---|---|
| `T32-PROD-F01` | HIGH → **MEDIUM** | `server/src/modules/production/README.md:117` — decisão **versionada** de que o refugo da OP é *"puramente um registro de auditoria"*, sem efeito em estoque ou consumo; e existe **indicador paralelo íntegro** (`scrap_by_step` com `scrap_rate` por etapa, `GetProductionReportUseCase.ts:70-83`) | O campo continua **inalcançável** e `adherence.scrap_rate` (`:100`) fica **permanentemente em zero**. **Reeleva** se o refugo da OP passar a ter efeito em custo ou estoque |
| `T32-QUAL-F07` | HIGH → **MEDIUM** | Backend barra em **todos** os caminhos verificados; é "ação às cegas" (categoria 2), **mesma classe já MEDIUM** em `T32-HRJUR-F04`, `T32-SUP-F05` e `T32-FST-F08` ⇒ **paridade interna da run**. E **uma sub-afirmação do finding foi REFUTADA** (§4.6) | O inspetor com `qualidade:operate` continua **sem caminho** para liberar/bloquear lote. **`DIV-T34-CLI-01`**: `GET /lots/:lotId/release-eligibility` (`qualityInspections.ts:25`) foi desenhado para esta tela e tem **zero consumidores** no cliente. ⚠️ **O veredito de autorização permanece com o `authorization-auditor`** |
| `T32-LAB-F10` | HIGH → **MEDIUM** | A divergência é **fail-safe**: o sistema executa o controle **mais** rigoroso que o pedido; **nenhum dado é perdido** — contraste direto com `T32-QUAL-F08` (`root_cause_category` coletado e descartado, com perda real), classificado MEDIUM pelo **mesmo** relatório; e o default é `true` (`RegisterTestTab.tsx:67`) | Controle fantasma na UI, documentado como divergência **desde 2026-08-09** e não remediado — agravante legítimo **mantido** |
| `T32-FST-F02` | HIGH → **MEDIUM** | O **prazo legal** da CAT de óbito é calculado por `acidente.gravidade`, **não** por `tipo` (`EmitCatUseCase.ts:61` → `legalDeadlineService.ts:30-34`) ⇒ **o controle legal funciona mesmo com `tipo='inicial'`**; `cat.tipo === 'obito'` **não tem nenhum consumidor**; o evento eSocial `S-2210` é enfileirado identicamente | Campo de classificação de documento legal **inalcançável pela UI**, com rótulo errado na tela. **Reeleva** se `cat.tipo` ganhar consumidor (roteamento eSocial, regra de encerramento ou relatório) |
| `T32-COM-F03` | HIGH → **MEDIUM** | **Não há regra sendo contornada — a regra não existe.** Sem perda de dado, sem alçada furada, sem exposição. Paridade interna: `T32-COM-F02` e `T32-COM-F04` são MEDIUM e carregam risco financeiro **maior** | Dois artefatos versionados **afirmando o oposto um do outro** (`ClientsPage.tsx:197-203` × `CreateCustomerPriceUseCase.ts:8-12`) — nota **Regra 21**, fonte a reconciliar. Cruza `T27-RFQ-07` e **OR-04** da Rodada 2 |
| `T32-SUP-F04` | HIGH → **MEDIUM** | `CONFIRMED_PARCIAL` — **dois dos impactos declarados são falsos** (§4.6) | Resíduo real: **número de lote do fornecedor** e **`expires_at`** não capturáveis pela tela simples ⇒ perda do vínculo com rastreabilidade externa (recall) e lote sem validade. ⚠️ **Não remediável com o texto atual** — §4.6 |
| `T33-A-F05` | HIGH → **MEDIUM** | T-03 mediu a **condição sistêmica** (≈90 eventos mutantes, **76%**, gravam só o estado DEPOIS — `T-03_AUDIT_LOG_REPORT.md:186-187`) e **não a promoveu a finding de nenhuma severidade**; e **a mesma âncora já é MEDIUM** em `AUD-DB-04` (`:62-71`, cita nominalmente `catalogImportController.ts:70-80`) | Depois do commit é **impossível reconstruir** o que cada registro valia antes; `spreadsheetUpload.ts:21-23` usa `memoryStorage` ⇒ **nem a planilha original é retida pelo sistema**. **Reeleva no nível do CONJUNTO, por T-03** — nunca neste ID isolado |
| `T33-B-F01` | HIGH → **MEDIUM** | Paridade com `T33-A-F13` (`cpf_cnpj` de cliente descartado) e `T33-A-F14` (`address`), ambos MEDIUM pelo **mesmo autor, no mesmo lote, sobre dado mais sensível**. Campo opcional, sem impacto em autorização, sem lançamento financeiro | O dado **não é recuperável nem por edição posterior** (`UpdateServiceOrderUseCase.ts:11-24`, allowlist de 12 campos relida integralmente). São **6 artefatos divergentes, não 4**, e um deles é `server/src/types/models.d.ts:248` — **por isso o typecheck é cego**. Ver **C-30** |

**Custo comum aos 8, declarado:** todos **saem do regime obrigatório da Regra 22** e da faixa que o
`AUDIT_PLAN.md` §11.2 item 2 lista como pré-condição de veredito. **O custo é retroativamente nulo**
(os 8 foram validados **antes** do rebaixamento), mas **vale para eventual reabertura**.

### 4.6 ⚠️ Refutações **parciais** — sub-afirmações falsas dentro de findings que se confirmam

**Isto acompanha o finding até a SanaCore. Não é anexo — é parte do enunciado corrigido.**

| ID | Sub-afirmação **REFUTADA** | Prova da refutação |
|---|---|---|
| **`T32-SUP-F04`** | *"vai ao depósito errado silenciosamente"* | **FALSA.** `ReceivePurchaseItemsUseCase.ts:131-138`: sem `warehouseCode`, se o pedido tem `requisition_id` com `origin = ENGINEERING_SAMPLE_ORIGIN`, o default passa a `'LABORATORIO'` **automaticamente**. O JSDoc `:58` e o comentário `:123-130` declaram o desenho como deliberado. **O caso citado pelo relatório é exatamente o caso que o servidor cobre** — é **conformidade**, não defeito (`DIV-T34-CLI-08`) |
| **`T32-SUP-F04`** | *"cria lote sem número"* | **FALSA.** `:168-174` gera `buildGeneratedLotNumber(order_number, item.id, sequence)` → `materialReceiptService.ts:127-129` produz `"<pedido>-ITEM<id>-R00n"`, **determinístico** e compatível com o índice único `(product_id, lot_number)` (`:118-120`). O lote nasce **numerado e em quarentena** (`:181`) — **conformidade** (`DIV-T34-CLI-09`) |
| **`T32-QUAL-F07`** | *"o inspetor recebe 403 `APPROVAL_LEVEL_REQUIRED` **cru**, sem tradução de alçada"* | **FALSA.** `middlewares/auth.ts:272-281` responde *"Esta ação exige nível gestor da área."* — português de negócio, sem código — e `InspectionTab.tsx:87,108` traduz com contexto `'release-lot'`. **O erro entregue é didático; o defeito é só o eixo do gate de botão** (`DIV-T34-CLI-10`) |
| **`T33-B-F02`** | *"a filtragem existe só no cliente (`DashboardPage.tsx:25,32-38`)"* | **FALSA em dois níveis.** (i) `DashboardPage.tsx` é **componente órfão** — `App.tsx:9-12,112-119` roteia `/dashboard` para `executive/CommandCenterPage`; (ii) mesmo o órfão **não consome** `GET /api/dashboard` (`:32-38` só habilita chamadas a **outros** endpoints). **Nenhum cliente oficial consome esse endpoint.** ⇒ **não existe filtragem em lugar nenhum**, e **o finding fica mais forte** (`DIV-T34-RAS-08`) |
| **`T33-A-F01`** | *"a regra não tem artefato versionado que a fixe"* (`:201-202`) | **FALSA.** `docs/projeto/04-USE_CASES.md:65-67` (UC-03) registra *"Preço de venda deve ser maior que preço de custo"*, **sem condicionante**. O que falta é **BR-ID**, não artefato. ⇒ **a instrução de remediação muda**: não é "o dono escolhe qual versão vale", é **"quatro caminhos não cumprem UC-03 e um cumpre"** (`DIV-T34-RAS-02`) |
| **`AUD-TES-SALDOMANUAL-01`** | *"não há trilha nenhuma"* (§5 `AUDIT_IMPACT`) | **FALSA** — §4.2 acima (`DIV-T34-FORM-03`) |
| **`AUD-PROC-DOCDRIFT-01`** | *"cobre uma declaração em um arquivo"* (§8) | **FALSA por estreiteza** — são **três declarações em dois arquivos** (§4.3, `DIV-T34-FORM-02`) |

### 4.7 Ampliações **contra o objeto auditado** — o defeito é maior do que o finding declarou

| ID | Ampliação, com âncora relida pelo validador |
|---|---|
| **`T32-FST-F01`** | O vazamento **não é só da listagem**: **três** métodos do mesmo repositório têm o include idêntico sem `attributes` — `SequelizeVisitRepository.ts:17-27` (`list`), `:29-36` (`findById`), `:49-58` (`listOnsite`) — servindo `facilities.ts:99`, `:100`, `:101`, todas em **nível de leitura**. E `VisitorsTab.tsx:41-44` consome `onsite-overdue` **sem nenhum gate** (`DIV-T34-CLI-03`) |
| **`T32-FST-F04`** | **Cadeia completa de escalonamento demonstrada**: usuário com `ti:operate` que **também** seja `manager_id` de algum departamento pode (1) criar a solicitação escolhendo o próprio departamento; (2) **aprová-la a si mesmo** pela branch de gestor de `authorizeSelfOrModule` (`ti.ts:82`), **sem nunca ter `ti:approve`**; (3) executá-la com o mesmo `ti:operate` (`ti.ts:84`) → `ExecuteAccessRequestUseCase.ts:76-81` → `provisionAccess({ profileId })`. **Não existe guarda `requester ≠ approver`** (`ApproveAccessRequestUseCase.ts:29-41`). Quem não é gestor ainda assim **escolhe qual gestor** aprovará (`DIV-T34-CLI-04`) |
| **`T32-SUP-F02`** | **Não há controle detectivo algum:** `rfqController.ts:187-194` registra `action:'register_quote'` com `newValues: { supplier_id, status }` — **sem nenhum preço e sem `oldValues`**. A sobrescrita de cotação é **indetectável a posteriori** (`DIV-T34-CLI-05`) |
| **`T32-SUP-F03`** | O saldo fantasma **alimenta a netagem do MRP** (`SequelizeItemRepository.ts:90-112` → `GenerateMrpPlanUseCase.ts:94-101` → `mrpEngine.ts:246-254`): quantidade digitada no cadastro, sem movimento e sem depósito, **reduz a compra e a produção planejadas** (`DIV-T34-CLI-06`) |
| **`T33-A-F01`** | **Não são três implementações — são cinco pontos de decisão**, e dois deles (`itemProductMirrorService.ts:97-111` e `:162-169`) estão no caminho que `CreateProductUseCase.ts:33-39` **declara canônico** (`POST /api/items`). `ensureProductMirrorForItem` cria produto com `price: 0` fixo e `cost_price = item.custo_padrao` ⇒ **gera sempre o estado que `ProductEntity.ts:144` proíbe** (`DIV-T34-RAS-01`) |
| **`T33-A-F02`** | Âncora de requisito **mais forte** que a usada: **RF-QUA-02 está marcado `[IMPLEMENTADO]`** (`docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md:121`). E `handoffSignal.ts` é consumido **em produção**, não só em teste: `ListNonConformitiesUseCase.ts:60` calcula `handoff_signal` para **cada linha** ⇒ **toda RNC encerrada aparece vermelha/"reincidente", sem exceção possível** (`DIV-T34-RAS-03`) |
| **`T33-B-F01`** | **6 artefatos divergentes, não 4** — `server/src/types/models.d.ts:248` carrega o nome errado (**o typecheck valida o caminho quebrado**) e `docs/database/DATABASE.md:190` contradiz `04-DICIONARIO_DADOS.md:1759` e `schema.sql:6196`. Além disso a remissão *"Ver relatório de handoff"* (`client/src/api/serviceOrders.ts:19`) é **órfã**: o defeito é conhecido pela engenharia e **não está registrado em nenhum artefato de governança** (Regras 7/17) (`DIV-T34-RAS-05`, `DIV-T34-RAS-06`) |
| **`T33-B-F02`** | **10 perfis, não 6** — e a prova saiu do **seed real**, não da matriz: `seed-usuarios-departamentos.cjs` tem `dashboard` **sem** `financeiro` em RH (`:111`), Engenharia (`:121`), PCP (`:133`), Produção (`:145`), Almoxarifado (`:157`), Compras (`:171`), Gestão de Compras (`:182`), Vendas (`:193`), Qualidade (`:217`), Expedição (`:228`). **Só Diretoria e Financeiro têm `financeiro`.** A exposição **não é hipótese de documento** (`DIV-T34-RAS-07`) |

### 4.8 Dependências de ordem de remediação — **novas**, somadas às `OR-01`…`OR-12` da Rodada 2

> **Por que existe:** remediar fora de ordem **cria risco**. Recomendação técnica (Regra 6); o
> sequenciamento é decisão do director/SanaCore.

| # | Ordem | Natureza | Fundamento |
|---|---|---|---|
| **OR-13** | **`T32-SUP-F09` ANTES ou JUNTO de `T32-SUP-F01` e `T32-HRJUR-F01`** | Causa-raiz antes das consequências | **C-32.** Enquanto `translateApiError.ts:213-215` descartar a mensagem em português na presença de `details`, corrigir a UI de alçada ou do prazo fatal **entrega ao usuário a chave crua do erro** que a correção pretende explicar |
| **OR-14** | **`AUD-DB-03` (lote) ANTES do item 4 da §6 de `AUD-RH-CPFSEARCH-01`** | Pré-requisito de verificabilidade | §4.4. `employeeController` **não tem `logAction` nenhum**; instrumentar a leitura sem instrumentar o módulo produz trilha parcial e um reteste que não fecha |
| **OR-15** | **`T33-B-F01` — corrigir `models.d.ts:248` ANTES da guarda** | A correção "óbvia" **não fecha** | **C-30** e `DIV-T34-RAS-05`: *"sem consertar o `.d.ts`, a guarda não fecha"* — o tipo do servidor não é derivado do model, e o typecheck continua cego |
| **OR-16** | **`T33-A-F01` — corrigir `ProductEntity` sozinho NÃO FECHA** | Alerta de escopo | `DIV-T34-RAS-01`: são **5 pontos**, e a porta **canônica** (`itemProductMirrorService`) é uma das permissivas. Corrigir só o caminho legado deixa o defeito no caminho recomendado |
| **OR-17** | **`T32-FST-F02` JUNTO de `T32-FST-F03`** | Mesma causa, dois findings | **C-35.** O cliente **nem conhece** `'obito'` (`api/sst.ts:374`); corrigir a renderização sem corrigir o tipo não produz o valor |
| **OR-18** | **`T32-SUP-F04` — NÃO remediar pelo texto; remediar pelo resíduo** | Restrição de remediação | §4.6. Dois dos impactos são **falsos**; remediar pelo texto original faria a SanaCore "corrigir" **duas conformidades deliberadas** |
| **OR-19** | **`AUD-PROC-DOCDRIFT-01` — não iniciar antes de o director decidir o item (c)** | Critério de reteste insatisfazível | §4.3. `HANDOFF_CODEX.md` é histórico e imutável; o item (c) exige que **nenhum** artefato afirme a remediação. Sem decisão, a remediação nasce reprovada |

---

## 5. CATEGORIA SEPARADA — findings de PROCESSO DA PRÓPRIA AUDITORIA

**Regra de contagem, reafirmada:** finding cujo objeto é o **aparato de auditoria** não é defeito do
sistema auditado e **não pode ser somado ao placar do ERP**.

| ID | Sev. | DE (Rodada 2) | **PARA (Rodada 3)** |
|---|---|---|---|
| **`AUD-PROC-CUSTODIA-01`** | **HIGH** | `PROPOSED` · ⚠️ **Regra 22 NÃO cumprida** — escalado ao director (Rodada 2 §9.3 item 1) | ✅ **Regra 22 CUMPRIDA.** `T-30_VALIDACAO_AUD-PROC-CUSTODIA-01.md` emitiu veredito: **`CONFIRMED`, severidade `HIGH` MANTIDA**, com tentativa de elevação a CRITICAL **e** de rebaixamento a MEDIUM — **ambas executadas e ambas falhadas** (§4 daquele documento). **O escalonamento de primeira ordem da Rodada 2 §9.3 item 1 está ENDEREÇADO** |

**Estado posterior, registrado como fato de artefato — NÃO como declaração minha:**
`30-retest/RETEST_AUD-PROC-CUSTODIA-01.md:26,305` **declara** `RETEST_PASSED` e `FINDING CLOSED`
para `AUD-PROC-CUSTODIA-01`, com quatro critérios da `RETEST_SPECIFICATION` executados e três
limites declarados pelo próprio retestador (incluindo `Limite 3 — âncora de commit`: o objeto é
estado de mecanismo, não código do `AUDIT_COMMIT`, e o retestador não pôde executar `git`).
⚠️ **Eu não declaro `RETEST_PASSED` nem `FINDING CLOSED`, e não os endosso** — registro que o
artefato os contém, quem os emitiu e sob que limites. **A conversão disso em estado do control plane
é ato do director.**

**`AUD-PROC-DOCDRIFT-01` NÃO é finding de processo da auditoria** e por isso conta no placar do
produto (§2.5, MEDIUM). Critério: seu objeto são **artefatos de governança do objeto auditado**
(`docs/business/briefs/BRIEF_RH_2026-08-06.md`, `docs/governance/HANDOFF_CODEX.md`), **não** o
aparato da auditoria (hooks, credenciais de agente, cadeia de custódia). A distinção é a mesma que a
Rodada 2 §5 fixou, aplicada literalmente.

**`G4_CE06_LOG_CONNECTIONS.md`** — relatório de infraestrutura de evidência, **absorvido sem
finding**; não declara `AUDIT_PASSED`, `RETEST_PASSED` nem `FINDING CLOSED` (`:177`).

---

## 6. PENDÊNCIAS — decisão do dono **separada** de pendência técnica

### 6.1 ⏳ PENDÊNCIAS DE DECISÃO DO DONO (Regra 18 — **nenhuma pode ser suprida por inferência, memória ou agente**)

| # | Decisão pendente | Estado | Consequência de não decidir |
|---|---|---|---|
| **D-01** | **`AUD-CTB-DEBCRED-01`: manter HIGH (fixada pelo dono) ou acolher a recomendação formal de rebaixamento a MEDIUM do `vericore-finding-validator`?** | **NOVA — ABERTA.** Severidade **preservada em HIGH** enquanto não houver decisão | A SanaCore dimensiona a correção sobre premissa que o validador declarou não sustentada; e o placar de HIGH da run carrega um item de alcançabilidade não demonstrada. **Nos dois desfechos, o item 3 da §7 do finding (rejeitar em vez de ignorar valores `<= 0`) tem prioridade independente** |
| **D-02** | **`T33-A-F01`: criar o BR-ID da regra "preço de venda > custo"**, formalizando UC-03 (`docs/projeto/04-USE_CASES.md:65-67`) | **NOVA — ABERTA.** `DIV-T34-RAS-02` **reduziu** a decisão: não é mais "qual das cinco versões vale" (o artefato já adjudica), é **"criar o BR-ID"** | 5 pontos de decisão divergentes sem regra identificada; a porta canônica continua sendo a permissiva |
| **D-03** | **`T33-B-F07`: fonte autoritativa dos módulos `manutencao` e `garantia`**, ausentes da matriz de perfis mas presentes em `accessModules.ts:227-228` — concedidos por `seed-usuarios-departamentos.cjs:240-243` porque *"o smoke de apresentação acusou 403 nessa tela"* | **NOVA — ABERTA** (Regra 21) | **Permissão concedida por sintoma de demonstração**, contra o owner declarado. Sem decisão, não há critério de reteste |
| **D-04** | **`T33-B-F02`: qual lado é o correto** — `BUSINESS_RULES.md:194-197` (*"o sistema filtra"*) ou o código (não filtra em lugar nenhum)? | **NOVA — ABERTA** (Regra 20) | A remediação pode "corrigir" o documento em vez do código, num endpoint que **hoje entrega contas a receber, contas a pagar, saldo projetado e faturamento do mês a 10 perfis semeados sem `financeiro`** |
| **D-05** | **Candidatas a BR-ID novo de `T-33` Bloco B:** prazo de garantia de OS; alçada de custo em OM e OS; máquina de estados de OM; limites do Auditor Inteligente (30 dias, `quantity < 0`, janela ausente, conta vencida) | **NOVA — ABERTA** | `T33-B-F05`, `T33-B-F06`, `T33-B-F10` permanecem sem régua; alimenta `T14-F05` |
| **D-06** | **`T33-A-F12`: fórmula de rating de fornecedor** sem artefato versionado que a fixe | **NOVA — ABERTA** (Regra 21) | Reenvio de inspeção duplica RNC e **zera `quality_score`** do fornecedor, sem regra que diga se está certo |
| **D-07** | **≈121 páginas do `client/` não amostradas (`C-133`/`N-07`)** | ⚠️ **HERDADA da Rodada 2 §9.3 item 5 — MATERIALMENTE ALTERADA, não fechada.** `T-32` cobriu `C-133` em 6 blocos, com cobertura declarada 23/23, 31/31, 21, 22, ~37 transversais. **A reconciliação do denominador é do par de cobertura, que não existe nesta rodada (§7.3)** | Enquanto o par de cobertura não reconciliar, **não se pode afirmar que `C-133` está fechada**, nem o contrário |
| **D-08** | **Regra 23 descumprida para a classe "comando de banco"** e `APPROVALS.md:787` afirmando um guard que não existe | ⚠️ **HERDADA da Rodada 2 §9.3 item 2.** O reteste de `AUD-PROC-CUSTODIA-01` declara critérios `PASS`; **a decisão sobre o texto de governança permanece do dono/director** (`coretriad/` e `.claude/` — fora do meu namespace, Regra 16) | — |
| **D-09** | **26 HIGH de `npm audit` em `mobile` (14) e `tv` (12) sem finding emitido** | ⚠️ **HERDADA da Rodada 2 §9.3 item 6 e `OBS-T26-14` — INALTERADA.** Nenhuma das entradas desta rodada os alcança | Lacuna aberta; herdeiro natural T-18 |
| **D-10** | **`AUD-PROC-DOCDRIFT-01`: ownership de `docs/business/briefs/`** | **NOVA — ABERTA.** `T-34_VALIDACAO_5_FINDINGS_FORMAIS.md:537-538` declara expressamente que **não** a decide e que ela é do director | Sem dono, o selo falso pode ser reintroduzido pelo mesmo mecanismo |

### 6.2 🔧 PENDÊNCIAS TÉCNICAS E DE OUTRA AUTORIDADE (não são decisão do dono)

| # | Pendência | Titular | Estado |
|---|---|---|---|
| **T-01** | **`T32-FST-F04` — veredito de autorização.** O validador **manteve HIGH** e **encaminhou ao `authorization-auditor` com recomendação expressa de avaliar elevação a CRITICAL**, à luz da cadeia criar→auto-aprovar→executar **sem guarda `requester ≠ approver`** (`DIV-T34-CLI-04`) | **`vericore-authorization-auditor`** | ⏳ **PENDENTE DE VEREDITO.** ⚠️ **Não decido, e registro que não decido.** A delimitação do relatório de origem **é mantida e está correta: NÃO é violação da Regra 24** — nenhum papel é aceito do cliente como fonte de autorização; o defeito é um **campo controlado pelo solicitante com efeito de autorização** |
| **T-02** | **`DIV-T34-RAS-10` — incoerência de escala de severidade em T-33**, devolvida a mim: ausência **total** de trilha = MEDIUM (`T33-A-F06`) × trilha **sem before-image** = HIGH (`T33-A-F05`); e campo fiscal descartado = MEDIUM (`T33-A-F13`) × texto livre descartado = HIGH (`T33-B-F01`) | consolidador → director | ✅ **RESOLVIDA POR EVIDÊNCIA quanto aos dois pares** (Regra 20, não por votação): os dois rebaixamentos de §2.3 **eliminam a inversão** — `T33-A-F05` e `T33-B-F01` passam a MEDIUM, ficando na mesma escala de `T33-A-F06`, `T33-A-F13` e `T33-A-F14`. ⚠️ **O que NÃO se resolve por aqui, e escalo:** se a condição sistêmica de D6 (**76% dos eventos mutantes sem `oldValues`**, `T-03_AUDIT_LOG_REPORT.md:186-187`) merece reclassificação para cima, **isso é decisão do director no nível do CONJUNTO, por T-03** — não em nenhum ID isolado |
| **T-03** | **`DIV-T34-RAS-09` — sobreposição de remediação com `AUD-DB-03`**, devolvida a mim | consolidador | ✅ **RESOLVIDA em §3.4:** `T33-B-F03` = `DUPLICATE`; `T33-A-F06` = `SUBSUMIDO-PARCIAL` (permanece como ID, sem lote próprio); `T27-SST-F06` = `COMPLEMENTAR` inalterado. ⚠️ **A severidade agregada do conjunto é do director** |
| **T-04** | **Item (c) da `RETEST_SPECIFICATION` de `AUD-PROC-DOCDRIFT-01` é insatisfazível** sem alterar registro histórico (§4.3) | director + produtor do finding | ⏳ **ABERTA** — e **bloqueia OR-19** |
| **T-05** | **`DUP-ABERTA-01`** — `T27-JUR-F05` × os 21 call sites de `T18-F01`/`T18A-F01`…`F11` | director → T-18-A | ⚠️ **INALTERADA e ainda ABERTA.** Nenhuma das entradas desta rodada trouxe o inventário dos 21 |
| **T-06** | **`DUP-ABERTA-02`** — `T32-TRV-F09` × `T-18`/`T-21` (JWT em `localStorage`) | director → T-18/T-21 | **NOVA — ABERTA** (§3.3), com critério de decisão publicado |
| **T-07** | **As 16 divergências abertas da Rodada 2 §9.2** (`DIV-SEV-01`, `ESC-T15-03`/`-05`, `RES-T15-02`, `DIV-T09-01`, `INV-01`×`INV-02`, `DIV-T27-*`, `DIV-T28-SR-*`, `DIV-T29-01`, `PROJECT_STATE.md` §OBS-INV-01) | director | ⚠️ **TODAS INALTERADAS E AINDA ABERTAS.** Repeti a busca no corpus **ampliado** (T-31, 6× T-32, 2× T-33, 5 findings formais, 3× T-34, T-30, reteste, G4-CE06): **nenhuma resposta registrada** |
| **T-08** | **`FIND-ERP-007` — pendência procedimental da `APR-2026-020` B.3** (retorno ao autor de origem) | director | ⚠️ **INALTERADA.** Permanece `NEEDS_MORE_EVIDENCE`. **Reescalada pela terceira rodada consecutiva** |
| **T-09** | **`OBS-R3A-01`** — hipótese do espelho × `bom-tipo-nao-produtivo` | director | ⚠️ **INALTERADA — permanece HIPÓTESE.** Continua sendo o pedido dinâmico mais barato e decisivo que resta. **Nota material desta rodada:** `DIV-T34-RAS-01` mostra que `itemProductMirrorService` é **caminho canônico**, o que **aumenta** a relevância de testá-lo |
| **T-10** | **`T16-F15`, `T21-F01`, `RES-T13-04`/`-05`, `T29-MOB-F03`, os 2 candidatos ao denominador de `FIND-ERP-009`** — encaminhados e **nunca adjudicados** | director | ⚠️ **INALTERADOS.** ⚠️ **`T21-F01` (`cost_price` incondicional em `GET /api/products`) NÃO foi alcançado por `T-32`**, que auditou telas, não o endpoint — o vão de `RES-T26-01` (16 endpoints de `products`/`assets`) **permanece** |
| **T-11** | **Fila DYN** — a Rodada 2 mediu ≈167 pedidos reais contra ~103 catalogados (`OBS-T26-03`) | `vericore-audit-verification-runner` / director | ⚠️ **AGRAVADA.** Esta rodada acrescenta `DYN-T34-01`…`-05` (T-33), `DYN-RH-01` e `DYN-CTB-04` (findings formais), `DYN-T31-*` da trilha de semântica, e **4 capturas nominais sem ID** pedidas por `T-34_VALIDACAO_T32_CLIENT.md` §4. **Ordem de grandeza declarada: ≈180.** ⚠️ **`DYN-CTB-04` é o mais importante** — é o que **delimita** `AUD-CTB-DEBCRED-01`, e executá-lo **antes** da remediação impede que a SanaCore dimensione a correção sobre premissa mais ampla que a evidência |

---

## 7. ESTADO DE COBERTURA — o que ainda falta para o veredito final

**Não declaro `AUDIT_PASSED`. Não declaro G3 cumprido. Declaro, medido, o que falta.**

### 7.1 ⚠️ `C-137` — semântica de coluna: **34 de 207 tabelas**. A maior lacuna conhecida da run.

**Não minimizo, e registro o número dos dois lados:**

| Item | Valor | Fonte |
|---|---|---|
| Denominador autoritativo | **207 tabelas** | Rodada 2 §6 (determinação por M2 × M3, dois métodos disjuntos que coincidem) |
| Cobertas por `T-13` | 22 | `T-31_C137_SEMANTICA_COLUNA.md:183` |
| Cobertas por `T-31` | **+12** | `:184` |
| **Total com semântica de coluna** | **34 / 207 — 16,4 %** | `:185` |
| **DÉFICIT** | **173 / 207 — 83,6 %** | `:186` |

> **`C-137` NÃO ESTÁ FECHADA.** Sai de `A(22/207)` para **`A(34/207)`**. O déficit registrado em
> `AUDIT_COVERAGE_EXECUTED_RODADA2.md:157,200` (185 tabelas) passa a **173**. É **progresso
> mensurável e NÃO cumprimento da célula** — a própria trilha o declara nesses termos (`:188-190`).

**O que o déficit contém, nominalmente — e é a parte que não pode ser lida como resíduo formal:**

- **P3 compliance: ≈76 tabelas — todo `sst_*`, `hr_*`, `jur_lgpd_*` — INTEIRAMENTE descoberto.**
  É a banda de **maior densidade de dado pessoal e sensível** da base (saúde ocupacional, folha,
  requisições LGPD) e é **exatamente a banda que o dicionário de dados exclui por completo**. A
  própria trilha a recomenda como a **próxima** (`:194-196`).
- **P1 residual: 10 tabelas**, com `cost_centers` como a mais urgente — **zero `COMMENT`** e destino
  de FK `ON DELETE SET NULL` vinda de `accounting_entry_items`.
- **P2: ≈26** · **P4: ≈9** · **P5: ≈47** (18 delas `[DEPRECATED]`, de valor marginal).

**Por que isto pesa no veredito final e não é dívida cosmética:** dois dos cinco findings formais
desta rodada (`AUD-CTB-DEBCRED-01` e `AUD-TES-SALDOMANUAL-01`) **nasceram dentro das 12 tabelas que
`T-31` conseguiu cobrir**. A taxa observada é de **2 findings HIGH promovidos a formal por 12 tabelas
auditadas**. **Não extrapolo essa taxa** — seria inventar evidência —, mas registro que **o método
que produziu esses dois findings foi aplicado a 16,4 % da base**, e que **83,6 % dela nunca foi
submetida a ele**. Um veredito final que trate `C-137` como resíduo estará afirmando, sem prova, que
as 173 tabelas restantes não contêm defeito da mesma classe. **Resíduos declarados pela própria
trilha:** `RES-T31-01` (`git diff` não reconfirmado, Bash indisponível), `RES-T31-02` (173/207),
`RES-T31-03` (rótulos de ENUM não extraídos), `RES-T31-04` (três corpora medidos, não reconciliados),
`RES-T31-05` (denominador confirmado por método parcialmente correlacionado).

### 7.2 Regra 22 — estado

| | Rodada 2 | **Rodada 3** |
|---|---|---|
| CRITICAL + HIGH sob o regime (produto) | 6 + 74 = 80 | **7 + 87 = 94** |
| Com veredito adversarial registrado | 79 (1 exceção formal) | **94** |
| Exceções formais | ⚠️ `AUD-PROC-CUSTODIA-01` (categoria processo) | ✅ **nenhuma** — `T-30` fechou a exceção (§5) |

**Os 15 CRITICAL/HIGH novos têm veredito individual, com refutação documentada:** 12 hipóteses
nominais (`R-1`…`R-12`) nos 5 findings formais; 13/13 no bloco `T-32`; 7/7 no bloco `T-33`.
**Resultado agregado desta leva: 0 `FALSE_POSITIVE`, 0 `NEEDS_MORE_EVIDENCE`, 1 `DUPLICATE`,
8 rebaixamentos, 7 sub-afirmações refutadas dentro de findings confirmados.**

**Registro de risco de calibração, simétrico ao que a Rodada 2 fez com `T-28`:** o bloco dos 5
findings formais devolveu **5/5 `CONFIRMED`** — resultado que, por si, merece a mesma desconfiança
que a Rodada 2 registrou; **em contrapeso**, foi o único bloco em que o validador **recomendou
rebaixar uma severidade fixada pelo dono e não a aplicou**, e em que **fechou uma lacuna do produtor
por medida** (4 varreduras). Os blocos `T-32` e `T-33` rebaixaram **6/13** e **2/7**. **A assimetria
é fato registrado, não juízo** sobre a qualidade de nenhum deles.

### 7.3 ⚠️ O que falta para o veredito final — lista fechada e medida

1. ⚠️ **O par de cobertura desta rodada NÃO EXISTE.** Não há
   `24-coverage/AUDIT_COVERAGE_EXECUTED_RODADA3.md`. **A consolidação de findings está à frente da
   consolidação de cobertura**, e o par vigente (`_RODADA2`) é **anterior** a `T-31`, `T-32`, `T-33`
   e `T-34`. **Nenhum veredito final pode ser emitido sobre um placar cujo par de cobertura mede
   outro corpus.** É a lacuna de processo mais imediata desta rodada.
2. **`C-137` em 34/207** — §7.1. **A maior lacuna material conhecida.**
3. **`C-133`** — `T-32` cobriu os 6 blocos com cobertura declarada por bloco, mas o **denominador
   reconciliado** (as ≈121 páginas de `D-07`) é ato do par de cobertura. **Não declaro `C-133`
   fechada.**
4. **Fila DYN: ≈180 pedidos reais contra ~103 catalogados** (`OBS-T26-03`, agravado). **Nenhum é
   pré-requisito dos vereditos acima** — os 15 vereditos de `T-34` são provas de ausência de código,
   de constraint ou de consumidor, melhor demonstradas estaticamente. **Mas `DYN-CTB-04`,
   `DYN-RH-01` e `DYN-T34-01`…`-05` são o caminho natural de reteste**, e `DYN-CTB-04` delimita um
   finding cuja severidade está pendente do dono.
5. **10 decisões do dono abertas** (§6.1) e **11 pendências técnicas** (§6.2), das quais **8 estão
   inalteradas há três rodadas consecutivas**.
6. **`T32-FST-F04` sem veredito de autorização** — o único HIGH desta leva cuja severidade **pode
   subir** e cuja decisão **não é minha nem do validador que o examinou**.
7. **26 HIGH de `npm audit` em `mobile`/`tv` sem finding emitido** (`D-09`).
8. **`DUP-ABERTA-01` e `DUP-ABERTA-02`** — duas duplicatas possíveis que **eu deveria decidir e não
   decido**, porque decidir sem o inventário das trilhas de origem seria descartar finding sem
   evidência (vedado) ou duplicar o placar.

---

## 8. AGRUPAMENTO POR MÓDULO / CAUSA-RAIZ — grupos novos e população nova

Os 18 grupos das Rodadas 1 e 2 permanecem. **Adiciono 4 grupos.** Cada grupo tem causa-raiz
identificada **ou lacuna registrada**.

### **G-19 — `client/`: a regra existe de um lado só** *(NOVO — titular `T-32`)*
**Causa-raiz:** *a autorização real vive no servidor e a UI a reimplementa por um eixo diferente
(papel legado × módulo/nível), ou anuncia um controle que o servidor não tem, ou oferece um caminho
que o servidor sempre recusa. Em nenhum caso os dois lados leem a mesma fonte.*

| ID | Sev. | Nota |
|---|---|---|
| `T32-SUP-F01` | **HIGH** | **Todo pedido de importação é impossível de aprovar pelo ERP** — não é degradação, é impasse funcional total num fluxo obrigatório. `purchases.ts:48` exige `diretor`; `client/src/api/purchases.ts:56-116` expõe seis funções e **nenhuma de alçada** |
| `T32-HRJUR-F01` | **HIGH** | Prazo fatal vencido **sem caminho de cumprimento**: `isMissed` (`DeadlinesTab.tsx:290`) nunca se torna verdadeiro porque **ninguém escreve `status='missed'`** e não há scheduler; o servidor recusa sem a justificativa (`FulfillDeadlineUseCase.ts:40-48`). **Falha fechada em UC-54** |
| `T32-PROD-F02` | **HIGH** | Sobreprodução sem caminho de confirmação; o operador lê literalmente `Envie "allow_overproduction: true" na requisicao`. **Recomendação do validador: split** (beco sem saída = HIGH; vazamento de contrato = MEDIUM isolado) — **não altero a severidade do conjunto** |
| `T32-QUAL-F07`, `T32-HRJUR-F04`, `T32-SUP-F05`, `T32-FST-F08` | MEDIUM ×4 | **C-33** — classe "ação às cegas" |
| `T32-COM-F03`, `T32-COM-F05`, `T32-COM-F06`, `T32-TRV-F01`, `T32-TRV-F02` | MEDIUM ×5 | dois lados delegando um ao outro; **"quem lista as contas pode pagar as contas"** (`accessModules.ts:248` — não existe nível de leitura no servidor) |
| `T32-TRV-F03`…`F09` | LOW ×7 | menu × rota × backend com três regras; guards do cliente falham **abertos**, sem ser vulnerabilidade (`middlewares/auth.ts:246-282` nunca falha aberto) |

### **G-20 — Campo aceito na borda, respondido 200 e descartado em silêncio** *(NOVO)*
**Causa-raiz:** *o tipo do servidor **não é derivado do model** (`server/src/types/models.d.ts:248`),
então o contrato, o use case, a coluna e o cliente podem divergir **sem que o `tsc --noEmit` veja
nada**. É a classe "passa por typecheck E por teste".*

| ID | Sev. | Nota |
|---|---|---|
| `T33-B-F01` | MEDIUM ⇩ | `equipment_desc` × `equipment_description` em **6 artefatos**; **não recuperável nem por edição posterior**; remissão de handoff **órfã** |
| `T33-A-F13`, `T33-A-F14` | MEDIUM ×2 | `cpf_cnpj` de cliente e `address` aceitos, validados e **nunca persistidos** |
| — | — | **C-30**: uma guarda única, não três correções. **OR-15**: corrigir o `.d.ts` **antes** |

### **G-21 — Invariante financeira que vive só na aplicação; o dado não carrega a regra** *(NOVO — titular `T-31`)*
**Causa-raiz:** *o schema dos subsistemas financeiros mais recentes colapsa em semântica (11 tabelas
com **zero** `COMMENT`), e as invariantes que existem — e funcionam — foram **deliberadamente**
mantidas fora do banco, com a decisão declarada em JSDoc de model.*

| ID | Sev. | Nota |
|---|---|---|
| `AUD-CTB-DEBCRED-01` | **HIGH** (⏳ rebaixamento recomendado, pendente do dono) | Promoção de `AUD-DB-T31-02`. Lacuna das migrations **fechada** por 4 varreduras; 4 camadas de contenção; **nenhum caminho de alcance demonstrado** |
| `AUD-TES-SALDOMANUAL-01` | **HIGH** | Promoção de `AUD-DB-T31-07`. **Dois** escritores, ambos no CRUD de cadastro; **zero** escritores derivados; `SequelizeTreasuryRepository.ts:43-48` faz `account.update(data)` **sem whitelist** |
| `AUD-DB-T31-01`, `-03`, `-04`, `-05`, `-06`, `-08` | MEDIUM ×6 | 609 `comment:` de model que **não chegam ao banco**; dicionário que **contradiz a si mesmo**; singleton por literal `id = 1`; **três precisões monetárias no mesmo trânsito de dinheiro** (10,2 / 15,2 / 18,6); ausência de convenção de dado sensível |
| **Conformidades provadas (7)** | — | balanceamento de partidas dobradas **é** validado em centavos; contador CNAB com `FOR UPDATE`; nosso-número único; **conciliação OFX com constraint no banco** (`:3760`) — *é o contraste interno que prova que o time sabe fazê-lo* |

### **G-22 — Requisito declarado implementado, e incumprível** *(NOVO)*
**Causa-raiz:** *o selo de conclusão é escrito por quem entrega e **nada o verifica**; o defeito
atravessou arquivos, o que é evidência direta de que é **de mecanismo**, não de descuido.*

| ID | Sev. | Nota |
|---|---|---|
| `T33-A-F02` | **HIGH** | **RF-QUA-02 marcado `[IMPLEMENTADO]`** e sem **nenhum** caminho de escrita para `effectiveness_result`; efeito **permanente e visível** na fila operacional (toda RNC encerrada = vermelha). **C-29** amarra à célula `T-15:230` |
| `AUD-PROC-DOCDRIFT-01` | MEDIUM | **Três** declarações de `BR-RH-020` como remediada, em **dois** arquivos; o dano material se realiza **através** de `AUD-RH-CPFSEARCH-01` — contar em HIGH seria contar o mesmo dano duas vezes (vedação de **C-20**) |
| `T32-COM-F03` | MEDIUM ⇩ | dois artefatos versionados afirmando o oposto um do outro |
| `T33-B-F01` | MEDIUM ⇩ | defeito **conhecido e descrito pela engenharia**, sem registro em artefato de governança (Regras 7/17) |

### Grupos existentes que recebem população nova

| Grupo | População nova |
|---|---|
| **G-02** Idempotência de estoque | `T32-SUP-F03` (**C-31**, alcança o **MRP**), `T32-SUP-F07`, `T33-A-F12`, `T33-A-F07` |
| **G-03** Alçada e segregação | `T32-FST-F04` (**HIGH**, ⏳ veredito de autorização pendente), `T32-SUP-F01`, `T32-SUP-F10`, `T32-COM-F04`, `T33-B-F05` (**`DELETE` exige `approve`; lançar R$ 500.000 de custo exige `operate`**) |
| **G-06** Trilha de auditoria | `AUD-DB-03` recebe `T33-B-F03` (**absorvido**) e `T33-A-F06` (**subsumido-parcial**); `AUD-DB-04` recebe `T33-A-F05`; `T32-SUP-F02` (**log sem preço e sem `oldValues`**); `T33-B-F08`; `T33-B-F11` |
| **G-08** Integridade no schema declarado | todo o **G-21**; `T33-A-F10` (numeração por `Date.now()` sob UNIQUE) |
| **G-10** Financeiro | `AUD-COM-DESCONTO-01` (**CRITICAL**), `T32-COM-F02`, `T32-COM-F10`, `T32-COM-F11`, `T33-B-F02` |
| **G-11** Governança de rastreabilidade | `T14-F05` e `T15-F06` recebem `T33-A-F01` (UC-03 sem BR-ID), `T33-B-F10` (4 critérios sem BR), `T33-B-F07`, `T33-A-F12`, `T33-B-F14` |
| **G-13** Compliance regulado | `AUD-RH-CPFSEARCH-01` (**HIGH**, LGPD), `T32-FST-F01` (**HIGH**, CPF+telefone de visitante em 3 rotas), `T32-FST-F02`, `T32-HRJUR-F02`, `T32-HRJUR-F03`, `T32-COM-F13` (**captação em lote sem registro de consentimento**), `T33-A-F04` (**HIGH**, conta de ex-funcionário viva — LGPD art. 46) |
| **G-14** Plataforma e custódia | `T32-TRV-F09` (**`DUP-ABERTA-02`**), `T33-B-F09` (lado servidor de `T29-TV-F02`) |

---

## 9. LIMITES DESTE AGENTE — sem atenuação

### 9.1 Por leitura própria e integral nesta sessão

`T-26_CONSOLIDACAO_RODADA2.md` (integral, 854 linhas); `T-34_VALIDACAO_5_FINDINGS_FORMAIS.md`
(integral); `T-34_VALIDACAO_T32_CLIENT.md` (integral); `T-34_VALIDACAO_T33_RASOS.md` (integral);
`T-33_RASOS_BLOCO_A.md` e `T-33_RASOS_BLOCO_B.md` (integrais); `T-31_C137_SEMANTICA_COLUNA.md`
(§7 a §10, dirigido, incluindo a tabela de findings e a de cobertura); os 6 relatórios de `T-32`
(**seções de findings e de cobertura, por leitura dirigida e varredura de ID — não integrais**);
os 5 findings formais (**cabeçalho, severidade, origem e seção de relacionados — dirigido**);
`T-30_VALIDACAO_AUD-PROC-CUSTODIA-01.md` e `RETEST_AUD-PROC-CUSTODIA-01.md` (**seções de veredito —
dirigido**); `G4_CE06_LOG_CONNECTIONS.md` (**declaração de encerramento — dirigido**).

**Toda a aritmética deste documento foi refeita por mim e fecha:** enumeração ID a ID dos 125 novos
(8 + 15 + 14 + 14 + 10 + 10 + 9 + 24 + 16 + 5); a decomposição do delta (125 − 6 − 0 = 119); o
placar por severidade (7 + 87 + 223 + 112 + 11 = 440); e a conferência cruzada 323 + 125 = 448 =
440 + 1 + 7. **Toda a análise de deduplicação de §3 é minha**, exceto `DUP-R3-06`, herdado do
validador de `T-33`.

### 9.2 Aceito de relato de outra trilha, **SEM reverificar**

1. **Toda âncora `arquivo:linha` dos 448 IDs. Não abri um único arquivo de `server/`, `client/`,
   `mobile/`, `tv/`, `docs/`, `.claude/`, `coretriad/` ou `product/` nesta sessão. Zero.**
   Se uma âncora está errada, **este documento repete o erro**.
2. **Todo veredito de mérito do `vericore-finding-validator`** — os 15 de `T-34`, o de `T-30`,
   e os herdados de `T-25`/`T-28`. Avaliei a **estrutura da prova** (é interna? é fechada? tem
   contraprova documentada? converge com outra trilha?) e a **consistência com o corpus**.
   **Não reli `ReceivePurchaseItemsUseCase.ts`, `materialReceiptService.ts`, `itemProductMirrorService.ts`,
   `handoffSignal.ts`, `seed-usuarios-departamentos.cjs`, `models.d.ts`, `AccountingEntryItem.ts`,
   `bankAccountController.ts`, `SequelizeTreasuryRepository.ts` nem `HANDOFF_CODEX.md`.**
3. **Toda declaração de cobertura e de contagem de superfície de cada trilha** — incluindo
   `23/23`, `20/20`, `31/31`, `12 tabelas`, `34/207`, `173` de déficit e os `10 perfis semeados`.
4. **O veredito e os `PASS` do reteste de `AUD-PROC-CUSTODIA-01`.** Não verifiquei nenhum dos
   critérios; registro o que o artefato declara e **não o endosso**.
5. **A determinação de 207 tabelas / 478 FKs** da Rodada 2 §6, e a de 11 `CONFIRMED` da Rodada 2 §3.1.
6. **Nenhuma afirmação própria de proveniência de commit.** Não uso Bash, não executo `git`.

### 9.3 O que esta consolidação **não** pode oferecer

- A dedupe que apliquei é **sintática**, não semântica (§3.6). **O risco cresceu nesta rodada**,
  porque `T-32` auditou o **outro lado** de superfícies já auditadas pelas trilhas de servidor: os
  cruzamentos que eu **encontrei** estão em §3.5, mas um par com vocabulário e âncora diferentes
  sobre o mesmo defeito **pode ter escapado**.
- Um erro de contagem, severidade ou âncora cometido por uma trilha e não detectado pelas rodadas de
  validação **propaga-se integralmente** para este documento.
- **`OBS-T26-19` (§2.6) é uma ambiguidade aritmética herdada que eu não posso fechar sem reabrir a
  enumeração da Rodada 1**, e que desloca o total de produto em 6.
- **`DUP-ABERTA-01` e `DUP-ABERTA-02` são os dois casos em que eu deveria decidir e não decido.**
- **Não produzi o par de cobertura** (§7.3 item 1) — não é omissão silenciosa, é declaração.

---

## 10. Encerramento

- Nenhum arquivo do objeto auditado foi criado, alterado, corrigido ou refatorado (Regra 2). Nenhuma
  escrita fora de `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/`.
- Nenhuma evidência histórica pertencente a outra organização foi alterada (Regra 15).
  **`T-26_CONSOLIDACAO.md` e `T-26_CONSOLIDACAO_RODADA2.md` permanecem íntegros; este documento é
  adição, nunca reescrita.** Os relatórios de `T-31`, `T-32`, `T-33`, `T-34`, `T-30`, o reteste e os
  5 findings formais permanecem intocados. Onde alterei severidade ou status, está em §2.3, §3 e §4,
  com DE → PARA, fundamento e autor da recomendação.
- **Nenhum finding novo foi criado (Regra 6).** Os achados materiais desta passada estão em §11 como
  **observações explicitamente não promovidas**.
- **Nenhuma severidade fixada pelo dono foi alterada** (Regra 18). `AUD-COM-DESCONTO-01` permanece
  CRITICAL; `AUD-RH-CPFSEARCH-01`, `AUD-TES-SALDOMANUAL-01` e **`AUD-CTB-DEBCRED-01` permanecem
  HIGH** — este último **com recomendação de rebaixamento registrada e pendente** (§4.1, `D-01`).
- **Nenhum finding foi descartado.** 1 `FALSE_POSITIVE` e 6 `DUPLICATE` da Rodada 1 permanecem
  marcados; **7 novos absorvidos/`DUPLICATE`, todos com ID sobrevivente nomeado e prova documental**
  (§3); **2 duplicatas possíveis formalmente escaladas com critério de decisão publicado**.
- **Nenhuma regra de negócio, requisito, aprovação ou OWNER foi inventado, sugerido ou inferido.**
- **Este documento NÃO declara `AUDIT_PASSED`, `FINDINGS_CONFIRMED`, `RETEST_PASSED`,
  `FINDING CLOSED` nem `REMEDIATION COMPLETE`.** Onde um artefato de terceiro contém tais
  declarações (§5), elas estão **atribuídas ao artefato e ao seu autor**, não a mim.
- **Não declaro G3 cumprido, não declaro `C-133` fechada e não declaro `C-137` fechada** — declaro,
  medido, o que falta (§7).

**Entrega:** ao `vericore-audit-reporting-agent`. ⚠️ **Sem o par obrigatório de cobertura**, que não
existe para esta rodada (§7.3 item 1) — o relatório final **não pode** tratar `AUDIT_COVERAGE_EXECUTED_RODADA2.md`
como par desta consolidação, porque ele mede um corpus anterior a `T-31`, `T-32`, `T-33` e `T-34`.
**Escalonamentos abertos ao `vericore-software-audit-director`:** §6.1 (10 decisões do dono), §6.2
(11 pendências técnicas), §2.6 (`OBS-T26-19`), §3.3 (`DUP-ABERTA-02`) e §11.

---

## 11. OBSERVAÇÕES — **explicitamente NÃO PROMOVIDAS a finding**

**Nenhuma recebe ID de finding, severidade ou confiança. Criar finding não é atribuição deste papel
(Regra 6).**

| ID | Observação | Herdeiro natural |
|---|---|---|
| **`OBS-T26-19`** | Ambiguidade aritmética herdada: os **6 `DUPLICATE` da Rodada 1** não aparecem subtraídos nem no total de 254 nem nos 253 vigentes. As duas leituras deslocam o total de produto desta rodada entre **434 e 440**. **Não escolho** (§2.6) | director |
| **`OBS-T26-20`** | `T-34_VALIDACAO_T32_CLIENT.md:17` declara `Qtd = 6` para "severidade HIGH mantida" e **enumera 7 IDs** na mesma célula, corrigindo para 7 em `:24`. Mesma classe de `OBS-T26-04`/`-08`/`-09`. **Adotei a enumeração** | T-34 / director |
| **`OBS-T26-21`** | **Três séries `D-n`/`Dn` colidentes** nos três documentos de `T-34`, sobre objetos completamente diferentes. Requalificadas em §1 item 5 como `DIV-T34-FORM-*`, `DIV-T34-CLI-*`, `DIV-T34-RAS-*`. Sem isso, "D-4" significa *"cadeia de auto-aprovação de acesso"*, *"terceira âncora de tesouraria"* **e** *"amarrar T33-A-F02 à célula de T-15"* | director |
| **`OBS-T26-22`** | **O par de cobertura da Rodada 3 não existe** (§7.3 item 1). A consolidação de findings está à frente da de cobertura pela primeira vez nesta run | director |
| **`OBS-T26-23`** | **O item (c) da `RETEST_SPECIFICATION` de `AUD-PROC-DOCDRIFT-01` é insatisfazível** sem alterar registro histórico imutável (§4.3). É um critério de reteste que ninguém pode cumprir — e a única saída legítima é **correção por adição**, não edição de `HANDOFF_CODEX.md` | director + produtor |
| **`OBS-T26-24`** | `T-34_VALIDACAO_5_FINDINGS_FORMAIS.md` §6.3(b) registra que **a validação voluntária de um MEDIUM produziu fato novo material** (a terceira declaração de `BR-RH-020`), que não teria sido encontrado de outro modo. Evidência a favor de o director acolher pedidos voluntários de validação em MEDIUM **quando o próprio mérito for a severidade** | director |
| **`OBS-T26-25`** | `T33-B-F16` (INFO) prova por leitura integral dos 7 arquivos (314 LOC) que **não há IA em `intelligentAuditor`**: nenhum cliente HTTP, nenhuma chamada externa, nenhum modelo, nenhuma chave de API; 4 GETs que devolvem JSON e **não escrevem em nada**. **A premissa de escopo da run não é contrariada** e a cláusula de reabertura de IA (`OBS-T26-07`, N-14/G5) segue **não acionada e PROVISÓRIA** | director |
| **`OBS-T26-26`** | `T-34_VALIDACAO_T33_RASOS.md` §2.7 examinou se `DEBITO_CONHECIDO` (`audit-coverage-guard.test.ts:46-48`) é controle compensatório de `AUD-DB-03` e concluiu que **não é**: a lista só admite **remoção** de entradas — a guarda impede o débito **crescer**, não o corrige — e **não existe decisão humana registrada que aceite o risco dos 13 módulos**. **Registro de débito ≠ controle** | director |
| **`OBS-T26-27`** | `T-34_VALIDACAO_T33_RASOS.md` §2.3 registra, **contra o próprio veredito**, a leitura alternativa de `BR-RH-024` via `RF-RH-022` (`docs/business/BLOCO_6_RH_REQUISITOS.md:148`), que enfraqueceria parcialmente `T33-A-F04`. **Não foi escondida.** Registro porque o director precisa dela para decidir, e porque a conduta é o padrão que a run deve premiar | director |
| **`OBS-T26-28`** | `T-33` Bloco A e Bloco B corrigiram **para cima e para baixo** as estimativas do próprio encargo (23 endpoints contra "~26" estimados; 20 contra "~17"), sempre coincidindo com a contagem de T-16. **A contagem de T-16 estava correta nos dois casos**; as estimativas de briefing é que erravam | registro |
