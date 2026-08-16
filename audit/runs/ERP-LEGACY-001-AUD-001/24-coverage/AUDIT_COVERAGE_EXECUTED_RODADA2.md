# AUDIT_COVERAGE_EXECUTED — **RODADA 2** (recálculo) · ERP-LEGACY-001-AUD-001

```
AUDIT_ID:      ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f   (única referência de leitura)
TRILHA:        T-26 — cobertura executada · RODADA 2
PRODUZIDO POR: vericore-audit-consolidator
DATA:          2026-08-16
NATUREZA:      **ADIÇÃO RASTREÁVEL.** Nenhuma célula da AUDIT_COVERAGE_MATRIX.md, da EMENDA-02
               ou do AUDIT_COVERAGE_EXECUTED.md (Rodada 1) foi editada, apagada ou renumerada.
               Toda mudança está na forma "DE → PARA".
PAR OBRIGATÓRIO: `07-findings/T-26_CONSOLIDACAO_RODADA2.md`
LEITURA CONJUNTA: não substitui a Rodada 1. Onde divergirem, prevalece esta Rodada 2, e a
               divergência está registrada.
REGIME:        read-only. Zero conexão de banco, zero execução, zero comando.
NÃO DECLARA:   AUDIT_PASSED, FINDINGS_CONFIRMED, RETEST_PASSED, FINDING CLOSED (Regras 3,4,18).
               **NÃO declara G3 cumprido** — declara, medido, o que falta.
```

---

## 0. Regra que governa este documento (inalterada da Rodada 1)

> **Cobertura executada é o que foi lido, não o que foi planejado.** Onde a execução ficou abaixo
> do plano, a diferença está aqui **com número nominal**, e a palavra usada é *déficit*, nunca
> *ajuste*. Onde a execução entregou mais, também está — **registro simétrico obrigatório**.

**Base de custódia declarada, não produzida por mim:** o orquestrador verificou que
`git diff --stat c1311a6..HEAD -- server/src client/src server/migrations server/database` é
**vazio**. Consequência que uso: as **migrations de `main` são as do `AUDIT_COMMIT`** (§6).
**Ressalva herdada e mantida (`RES-T18-01`):** `server/package.json`, `server/package-lock.json` e
`.github/` **não estão nesse conjunto de caminhos** — o diff **não** prova ausência de mudança neles.

---

## 1. As sete entradas novas — o que cada uma cobriu, medido

| Entrada | Superfície declarada | Cobertura declarada pela trilha | Célula da EMENDA-02 atacada |
|---|---|---|---|
| `T-27_DEF-01_JURIDICO_D3D4.md` | 37 endpoints de `juridico` fora dos clusters de T-09 | **E 37/37** em D3 **e** D4, com âncora `arquivo:linha` dos **dois** lados | **C-01, C-02** |
| `T-27_DEF-02A_RH_D3D4.md` | 30 endpoints de `rh` fora dos clusters-âncora de T-12 | **E 30/30** em D3 e D4 | **C-03, C-04** (parcial) |
| `T-27_DEF-02B_SST_D3D4.md` | 59 dos 75 endpoints de `sst` | **E 59/59** em D3 e D4, determinado em 3 camadas | **C-05, C-06** |
| `T-27_DEF-03_RFQ_PRECOS_D3D4.md` | **11 rotas** (7 `rfq` + 4 preços) — **não ~5** | **E 7/7 + E 4/4** em D3 e D4 | **C-10, C-11** |
| `T-28_VALIDACAO_T27_BLOCO_JUR_RH.md` | 5 HIGH | 5/5 com veredito individual (Regra 22) | — (validação) |
| `T-28_VALIDACAO_T27_BLOCO_SST_RFQ.md` | 5 HIGH | 5/5 com veredito individual (Regra 22) | — (validação) |
| `T-29_MOBILE_TV.md` | `mobile/` 16 arquivos + `tv/` 15 arquivos | **16/16 e 15/15 lidos integralmente** + 13 pares UI×backend | **C-134, C-135** |

### 1.1 Registro simétrico — onde as entradas novas entregaram **MAIS** do que o pedido

- **`DEF-03` foi enunciado como "≈5 endpoints"; a superfície real é 11 rotas.** A trilha **não
  reduziu o escopo ao número do enunciado**, e justificou: as 3 rotas de leitura de `rfq` carregam
  regra decisória — *"o mapa comparativo **é** o artefato sobre o qual a adjudicação decide"*.
- **`T-27 SST` fechou `OBS-R3C-01` para o seu próprio escopo por varredura própria:** grep em
  `server/migrations/2026081*` por `sst_*|addConstraint|addIndex` ⇒ **zero ocorrências**. As
  afirmações de ausência de constraint valem **contra o schema versionado inteiro**, não só o
  baseline. **É o padrão que a Rodada 1 pediu e que quase nenhuma trilha havia feito.**
- **`T-28` (SST/RFQ) fez o mesmo, transversalmente:** enumerou as **19 migrations pós-freeze** por
  glob e varreu por `sst_|customer_price|rfq_|addConstraint|EXCLUDE|CREATE TRIGGER|addIndex`.
- **`T-28` (JUR/RH) atacou 3 refutações estruturais comuns ANTES de olhar finding a finding** — 13
  triggers enumerados nominalmente no baseline + varredura das 19 migrations + inventário dos 6
  middlewares. **Método que maximiza a chance de derrubar vários findings de uma vez.**
- **`T-29` leu `client/src` de forma dirigida** para adjudicar `T27-SST-F02` e a metade DSR de
  `T27-JUR-F07` — **T-27 havia declarado a lacuna em vez de presumir, e o validador a fechou**.
- **`T-27 RFQ` leu `client/` dirigidamente** (`SalesPage.tsx`, `ClientsPage.tsx`, `RfqPage.tsx`,
  `api/sales.ts`, `api/rfq.ts`) e **declarou expressamente que isso NÃO é cobertura de T-21**.

---

## 2. RECÁLCULO CÉLULA A CÉLULA DAS 137 CÉLULAS ELEVADAS PELA EMENDA-02

### 2.0 ⚠️ Correção aritmética da Rodada 1, antes do recálculo

`AUDIT_COVERAGE_EXECUTED.md` §7.1 linha 1 declarou **"9 entregues / 6 não"** para a faixa
C-01…C-15. **A composição declarada na própria célula soma 7, não 9:** `treasury` D3 (C-07),
`accounting` D3 (C-08), `budget` D3 (C-09) — **3 células, não 6**, porque a EMENDA-02 elevou
**apenas D3** nesses três módulos — mais `suppliers` D3+D4 (C-12/C-13) e `masterProduction` D3+D4
(C-14/C-15) = **7**. Logo, não entregues = 15 − 7 = **8** (C-01…C-06, C-10, C-11), não 6.

> **Correção registrada, não silenciosa: DE `9 entregues / 6 não` PARA `7 entregues / 8 não`.**
> Isso muda o total da Rodada 1 de **≈81** para **≈83 células não entregues como E**.
> Registrado como `OBS-T26-12` no par de findings. **É erro meu, e é corrigido aqui.**

### 2.1 Faixa §4 tier 2 — D3/D4 (C-01 … C-15) — **15 células**

| Célula | Superfície | Rodada 1 | **Rodada 2** | Evidência |
|---|---|---|---|---|
| **C-01** | `juridico` D3 (75) | ❌ `A(38/75)` — DEF-01 | ✅ **E — 75/75** (⚠ ou **74/75**, ver nota) | T-09 (38) + **T-27 DEF-01 (37)** |
| **C-02** | `juridico` D4 (75) | ❌ `A(38/75)` | ✅ **E — 75/75** (⚠ idem) | idem; a negativa de transação é **prova exaustiva de módulo** (grep de `transaction\|lock` em todo `juridico/` ⇒ zero) |
| **C-03** | `rh` D3 (57) | ❌ `A(~14/57)` | ⚠ **PARCIAL — ≈44/57** | T-12 (~14, clusters-âncora) + **T-27 DEF-02A (30)**. **Déficit residual ≈13** (`DIV-T27-RH-02`) |
| **C-04** | `rh` D4 (57) | ❌ `A(~14/57)` | ⚠ **PARCIAL — ≈44/57** | idem |
| **C-05** | `sst` D3 (75) | ❌ `A(~10/75)` | ✅ **E — 75/75 declarada** (⚠ ver `OBS-T26-11`) | T-12 (16 clusters, ~10 em profundidade) + **T-27 DEF-02B (59)** |
| **C-06** | `sst` D4 (75) | ❌ `A(~10/75)` | ✅ **E — 75/75 declarada** (⚠ idem) | idem |
| **C-07** | `treasury` D3 (11) | ✅ E | ✅ **E** | T-07 |
| **C-08** | `accounting` D3 (11) | ✅ E | ✅ **E** | T-07 |
| **C-09** | `budget` D3 (6) | ✅ E | ✅ **E** | T-07 |
| **C-10** | `rfq` D3 (7) | ❌ `A(2/7 use cases)` — DEF-03 | ✅ **E — 7/7** | **T-27 DEF-03**, leitura integral dos 5 use cases + controller + validators + repositório |
| **C-11** | `rfq` D4 (7) | ❌ `A` | ✅ **E — 7/7** | idem |
| **C-12** | `suppliers` D3 (6) | ✅ E | ✅ **E** | T-10 |
| **C-13** | `suppliers` D4 (6) | ✅ E | ✅ **E** | T-10 |
| **C-14** | `masterProduction` D3 (7) | ✅ E | ✅ **E** | T-11 |
| **C-15** | `masterProduction` D4 (7) | ✅ E | ✅ **E** | T-11 |

**Placar da faixa: DE `7 E / 8 não entregues` PARA `13 E / 2 parciais / 0 ausentes`.**

**Duas notas que impedem arredondar para cima:**

1. **C-01/C-02 — `DIV-T27-JUR-03`, ABERTA.** `GET /juridico/reports/financeiro` (`juridico.ts:64`)
   é contado por T-09 dentro de "contratos (16)" e classificado pelo router como **G7 Transversal**.
   **Se prevalecer o router, DEF-01 fecha em 74/75, não 75/75, e 1 endpoint fica sem D3/D4.**
   Decisão de definição, do director. **Registro os dois números.**
2. **C-05/C-06 — `OBS-T26-11`, ABERTA.** A trilha de SST **declara** 75/75 ("16 sob condições de
   T-12"). Contra a declaração de T-12 (`A ~24/132`, ≈10 em `sst`), **≈6 endpoints dos
   clusters-âncora de `sst` ficam sem atribuição de profundidade**. A trilha de RH **declarou** o
   simétrico (`DIV-T27-RH-02`); a de SST **não**. **Não concilio: registro a assimetria.**

### 2.2 Faixa §4 tier 2 — D9 (C-16 … C-34) — **19 células**

| Rodada 1 | **Rodada 2** | Motivo |
|---|---|---|
| ⚠ **PARCIAL** — `E` em 6 de 10 categorias ASVS (injeção, XSS, upload, SSRF, CSRF, config/headers/CORS/rate-limit); `A`/`M` em cripto, segredos, dependências e mass assignment (este depois fechado a 21/21 por T-18-A) | ⚠ **PARCIAL — INALTERADA**, com **um agravamento e um fechamento parcial** | **Agravamento:** `AUD-CICD-DEPGATE-01` prova que a categoria "dependências" tem **ponto cego estrutural de gate** — 640 de 854 entradas do lock de `server` (75%) fora de qualquer controle automatizado; e `AUD-DEP-JSYAML-01` é o **caso concreto** que passa invisível. **Fechamento parcial:** a categoria "dependências" ganha 2 findings formais onde antes havia só uma observação |

**Nenhuma das 7 entradas novas é uma varredura D9.** As 19 células permanecem parciais.

### 2.3 Faixa §7.1 tier 3 profundo (C-35 … C-62) — **28 células**

| Rodada 1 | **Rodada 2** |
|---|---|
| ⚠ **PARCIAL** — D1/D2/D3(borda) `E 174/174`; D4-D8 `A(≈91/174, 52%)`; ⚠⚠ **a lista nominal IN-categoria × OUT-categoria exigida pelo REG-G3 passo 4 NÃO foi publicada** | ⚠ **PARCIAL — INALTERADA.** Nenhuma das 7 entradas toca o tier 3 profundo. **A lista nominal continua não publicada** ⇒ a amostra remanescente **não é "baseada em risco" no sentido da condição (a) de G3** — é amostra com critério declarado em prosa |

### 2.4 Faixa §7.3 tier 3 raso (C-63 … C-132) — **70 células**

| Rodada 1 | **Rodada 2** |
|---|---|
| ❌ **0 de 70 entregues.** T-16 §5, textual: *"Estes 43 NÃO foram auditados em profundidade. Nenhuma regra de negócio destes módulos foi examinada"* | ❌ **0 de 70 — INALTERADA.** **Esta é, isolada, a maior divergência planejado × executado desta run, e nada na Rodada 2 a reduziu em uma única célula.** |

**Composição nominal do que falta**, para que o número não seja abstrato — **43 endpoints × 7
dimensões (D1, D2, D3, D4, D5, D6, D9) = 70 células** distribuídas em 10 módulos:
`clients`, `employees`, `maintenance`, `serviceOrders`, `nonConformities`, `spreadsheetImport`,
`intelligentAuditor`, `quality`, `laboratory`, `dashboard`.

**Por que cada um foi elevado (motivo da EMENDA-02 §3.3, reproduzido para dimensionar o risco):**
`spreadsheetImport` é **importação em massa** — a rota de maior risco de dano irreversível de todo o
tier 3; `nonConformities`/`quality`/`laboratory` decidem **bloqueio/quarentena**, que é movimentação
e disponibilidade de estoque; `employees`/`clients` são **dado pessoal** (I-1);
`maintenance`/`serviceOrders` fazem apropriação de custo e consumo de material; `dashboard` foi
elevado por **vazamento de agregado** (autorização); `intelligentAuditor` sustenta a **dispensa das
trilhas de IA** (G5).

### 2.5 Faixa §8 superfícies não-modulares (C-133 … C-137) — **5 células**

| Célula | Superfície | Rodada 1 | **Rodada 2** | Evidência / déficit medido |
|---|---|---|---|---|
| **C-133** | `client/` — 167 páginas | ❌ `A(41/167)`; triagem 100% **não** feita | ❌ **NÃO ENTREGUE — INALTERADA. ≈126 páginas não amostradas** | ⚠ **DECISÃO DO DONO PENDENTE, EXPLICITAMENTE SEPARADA E AINDA NÃO TOMADA.** Não a antecipo (Regra 18). `T-27 RFQ` e `T-28` leram **5 arquivos** do `client/` de forma dirigida e **declararam que isso não é cobertura de T-21** — o número **não** muda |
| **C-134** | `mobile/` | ❌ **NÃO EXPLORADO**, nem estruturalmente | ✅ **E nos 3 eixos** | **T-29:** 16/16 arquivos lidos integralmente + 5 configs. Eixo 1 (origem do papel — Regra 24): varredura completa de `role\|isAdmin\|perfil`, **8 chamadas de API inspecionadas uma a uma**, `role` rastreado até a fonte no banco, **sem elo inferido**. Eixo 2 (authN): 5 arquivos integrais. Eixo 3 (estoque): 4 telas + 2 clients cruzados com **6 arquivos de backend** |
| **C-135** | `tv/` | ❌ **NÃO EXPLORADO** | ✅ **Triagem estática 100% — e acima do exigido** | **T-29:** 15/15 arquivos-fonte lidos **integralmente** (a célula exigia triagem) + 6 de configuração/documentação |
| **C-136** | Contrato de API — semântica profunda 681/681 | ❌ `PARTIAL` — inventário `E 683/683`, matriz por dimensão **não alcançada** (`RES-T17-01`) | ❌ **NÃO ENTREGUE — INALTERADA** | nenhuma entrada nova toca T-17 |
| **C-137** | Models/schema — **semântica de coluna** | ❌ `A(22/207 tabelas)` | ❌ **NÃO ENTREGUE — INALTERADA. Déficit: 185 de 207 tabelas** | nenhuma entrada nova toca T-13. **Ver §6 para a determinação do denominador 207** |

**Placar da faixa: DE `0 de 5` PARA `2 de 5`.** Faltam **C-133, C-136, C-137**.

### 2.6 ⚠️ TOTAL RECALCULADO — o número real que o mandato pediu

| Faixa | Células | **E integral** | **Parcial** | **Não entregue** |
|---|---|---|---|---|
| §4 tier 2 — D3/D4 (C-01…C-15) | 15 | **13** | **2** (`rh` D3/D4) | 0 |
| §4 tier 2 — D9 (C-16…C-34) | 19 | 0 | **19** | 0 |
| §7.1 tier 3 profundo (C-35…C-62) | 28 | 0 | **28** | 0 |
| §7.3 tier 3 raso (C-63…C-132) | **70** | 0 | 0 | **70** |
| §8 superfícies (C-133…C-137) | 5 | **2** | 0 | **3** |
| **TOTAL** | **137** | **15** | **49** | **73** |

**Conferência: 15 + 49 + 73 = 137. Fecha.**

> ### DECLARAÇÃO SEM EUFEMISMO
>
> **DE (Rodada 1): ≈81 células não entregues como E** — número que, corrigido pelo erro aritmético
> de §2.0, era na verdade **≈83**.
> **PARA (Rodada 2): 73 células não entregues como E, e 15 entregues integralmente (contra 7).**
>
> **A Rodada 2 fechou 8 células por entrega real** (C-01, C-02, C-05, C-06, C-10, C-11, C-134,
> C-135) **e converteu 2 de "não entregue" para "parcial"** (C-03, C-04).
>
> **Isto é progresso material e mensurável. NÃO é o cumprimento de G3.** **70 das 73 células que
> faltam são a mesma faixa: os 43 endpoints rasos do tier 3.** As outras 3 são `C-133`, `C-136` e
> `C-137`. **A EMENDA-02 calculou o custo da elevação em +34 S (110 → 144) e o item de gate G11
> permanece aberto no estado da run.** A cobertura executada continua correspondendo, nessas faixas,
> à matriz **PRÉ-EMENDA-02**. **Divergência de primeira ordem entre planejado e executado, matéria
> de decisão humana — não de conciliação por este agente.**

---

## 3. O QUE FALTA PARA G3 SER INTEGRALMENTE CUMPRIDO — medido, item a item

**Não declaro G3 cumprido.** Declaro o déficit, com número, em ordem de tamanho.

| # | O que falta | Número medido | Categoria vedada por G3 que fica descoberta | Estado de decisão |
|---|---|---|---|---|
| **F-1** | **As 70 células dos 43 endpoints rasos do tier 3** (C-63…C-132) — D1, D2, D3, D4, D5, D6, D9 | **70 células · 43 endpoints · 10 módulos** | operações destrutivas (`spreadsheetImport`), movimentação/disponibilidade de estoque (`quality`, `laboratory`, `nonConformities`), dado pessoal (`employees`, `clients`), autorização por vazamento de agregado (`dashboard`), integridade de dados | **Não executado. Exige decisão de orçamento (G11).** `N-05` e `N-06` permanecem em vigor |
| **F-2** | **`C-133` — triagem estática 100% das 167 páginas do `client/` + E nas IN-categoria** | **≈126 páginas não amostradas** de 167 | autorização, operações financeiras, operações destrutivas | ⚠ **DECISÃO DO DONO, EXPLICITAMENTE SEPARADA E AINDA NÃO TOMADA.** Não antecipo, não infiro (Regra 18) |
| **F-3** | **`C-137` — semântica de coluna** para todas as tabelas tocadas por endpoint IN-categoria | **185 de 207 tabelas** sem análise de nulabilidade/semântica (`A 22/207`) | integridade de dados | Não executado |
| **F-4** | **`C-136` — matriz de contrato por dimensão em 683/683** | inventário `E`; **matriz por dimensão não alcançada** (`RES-T17-01`) | integridade de contrato sobre endpoints IN-categoria | Não executado |
| **F-5** | **REG-G3 passo 4 — a lista nominal IN-categoria × OUT-categoria dos 174 profundos** | **não publicada** | todas (é o que torna a amostra restante legítima) | ⚠ **Sem ela, a amostra dos 174 NÃO satisfaz a condição (a) de G3.** É a lacuna mais barata de fechar e a de maior efeito normativo |
| **F-6** | **D4-D8 nos 174 do tier 3 profundo** | `A(≈91/174, 52%)` ⇒ **≈83 endpoints** sem profundidade em 5 dimensões | integridade de dados, segurança, regras críticas | Não executado |
| **F-7** | **D9 — 4 de 10 categorias ASVS** (cripto, segredos, dependências, e a árvore de dev sem gate) | 19 células parciais | **segurança** (nominal em G3) | Parcial; `AUD-CICD-DEPGATE-01` mede o buraco do gate |
| **F-8** | **`C-03`/`C-04` — resíduo de `rh`** | **≈13 endpoints** dentro dos clusters-âncora de T-12, sem atribuição de profundidade | dado pessoal sensível, obrigação legal com prazo, operações financeiras | `DIV-T27-RH-02` — **escalado, aberto** |
| **F-9** | **`C-05`/`C-06` — resíduo de `sst`** | **≈6 endpoints** (assimetria `OBS-T26-11`) | idem | **Aberto; a trilha declarou 75/75 e eu não confirmo** |
| **F-10** | **`C-01`/`C-02` — 1 endpoint ambíguo** | **1** (`/juridico/reports/financeiro`) | contratos/jurídico | `DIV-T27-JUR-03` — decisão de definição, do director |
| **F-11** | **Toda a evidência dinâmica** — `CONFLITO-G3×G4` | **≈167 pedidos DYN** no universo real (era ≈137; +≈30 nesta rodada) contra ~103 catalogados | movimentação de estoque, operações financeiras, autorização, segregação, integridade — **cinco categorias vedadas simultaneamente** | **G4 aberto.** `RES-11` incide integralmente |

**Soma do que falta em endpoints/páginas nominais:** 43 (tier 3 raso, ×7 dimensões) + ≈126 páginas
do `client/` + ≈83 endpoints do tier 3 profundo em D4-D8 + ≈13 (`rh`) + ≈6 (`sst`) + 1 (`juridico`)
+ 185 tabelas em C-137.

---

## 4. ESTADO DE `N-04` … `N-08` — reavaliadas **uma a uma, com número**

> **Método:** comparo o estado declarado pela EMENDA-02 §4, o estado medido na Rodada 1, e o estado
> medido agora. **A revogação/redução de declaração negativa é ato do director** (Regra 18); eu
> **meço** e **proponho**, não declaro.

| ID | EMENDA-02 §4 declarou | Rodada 1 mediu | **Rodada 2 mede** | Proposta ao director |
|---|---|---|---|---|
| **N-04** — 139 de 207 endpoints de `juridico`/`rh`/`sst` sem D3 | **REVOGADA** | ⚠ **EM VIGOR — 145 endpoints** (DEF-01 37 + DEF-02 108) | ⚠ **REDUZIDA, NÃO REVOGADA — ≈19 endpoints.** Fechados **126**: `juridico` 37 (T-27 DEF-01), `rh` 30 (DEF-02A), `sst` 59 (DEF-02B). **Residual: ≈13 em `rh` + ≈6 em `sst`, todos DENTRO dos clusters-âncora de T-12** — nem T-12 os reivindica, nem T-27 os cobriu | **Manter N-04, com o número reduzido a ≈19 e a composição nominal registrada.** Não revogar: revogar com 19 endpoints descobertos em categoria vedada seria a promessa vazia que custou o `AUDIT_PASSED` do SIM-002 |
| **N-05** — semântica de coluna das tabelas do tier 3 raso (absorvida por C-137) | **REVOGADA** | ⚠ **EM VIGOR** — T-13 entregou `A(22/207)` | ⚠ **EM VIGOR, INALTERADA. Déficit: 185 de 207 tabelas.** Nenhuma das 7 entradas novas toca T-13 | **Manter N-05 em vigor, com o número 185/207 registrado no relatório final** |
| **N-06** — regra de negócio nos 43 endpoints rasos (absorvida por C-93…C-122) | **REVOGADA** | ⚠ **EM VIGOR INTEGRALMENTE** — 0 de 70 células | ⚠ **EM VIGOR INTEGRALMENTE, INALTERADA. 0 de 70 células. Nenhuma regra de negócio dos 43 foi examinada** | **Manter N-06 em vigor, integralmente.** É o maior item de F-1 |
| **N-07** — 127 de 167 páginas do `client/` | **REDUZIDA e recondicionada** (número medido no fieldwork) | ⚠ **EM VIGOR — 126 páginas** | ⚠ **EM VIGOR, INALTERADA — ≈126 páginas.** As 5 leituras dirigidas de `client/` feitas por `T-27 RFQ` e `T-28` foram **declaradas pelas próprias trilhas como não sendo cobertura de T-21** ⇒ **o número não muda** | **Manter N-07 em vigor com ≈126.** ⚠ **A alteração deste estado depende de decisão do dono, explicitamente separada e ainda não tomada** |
| **N-08** — `mobile`/`tv` só estrutural | **REDUZIDA** | ⚠ **EM VIGOR E AGRAVADA** — não explorados **nem estruturalmente** | ✅ **CAUSA MATERIAL EXTINTA.** `mobile/` 16/16 e `tv/` 15/15 lidos **integralmente**; C-134 em **E nos três eixos**; C-135 **acima** do exigido; 13 pares UI×backend verificados dos dois lados; **Regra 24 provada não violada** (`T29-C01`) | **PROPONHO A BAIXA de N-08** — com **três ressalvas nominais** que precisam constar do relatório final, e **a declaração de baixa é do director** (a própria T-29 §8.3 registra isso) |

### 4.1 Ressalvas nominais da proposta de baixa de `N-08`

Sem elas a baixa seria arredondamento para cima, e este documento não o faz:

1. **Zero evidência dinâmica.** `DYN-T29-01`…`04` abertos. **O desfecho** de `T29-MOB-F02`
   (quantidade `NaN`) e de `T29-MOB-F04` (`{ id: undefined }` no `where`) **não está provado** — o
   que está provado é a **ausência da guarda**, que é estática.
2. **Comportamento em dispositivo real não observado** (D-pad, câmera, SecureStore no aparelho).
   Lacuna declarada pela trilha; **nenhum finding depende dela**.
3. **Um veredito cruzado permanece pendente:** o juízo de **autorização** implicado por
   `T29-MOB-F03` (titularidade da contagem) é mandato do `authorization-auditor` e **não foi dado**.

**Efeito sobre o risco residual `RES-05`** (*"`tv/` e a fração OUT-categoria de `mobile/`"*): a
fração OUT-categoria é agora **zero** — 100% dos arquivos-fonte dos dois apps foram lidos.
**`RES-05` deixa de ter objeto de superfície**, restando apenas a lacuna dinâmica, que é `RES-11`.
**Proposta: rebaixar `RES-05` a "coberto, com lacuna dinâmica remetida a RES-11" — decisão do
director.**

### 4.2 Demais declarações negativas — estado

| ID | Estado |
|---|---|
| **N-01, N-02, N-03, N-09, N-10, N-12, N-13, N-15, N-16** | **MANTIDAS, inalteradas** |
| **N-11** (vulnerabilidade transitiva não medida) | **MANTIDA, com fechamento parcial ampliado.** DE: parcialmente fechada por `DYN-T18-03`. PARA: **dois findings formais** (`AUD-DEP-JSYAML-01`, `AUD-CICD-DEPGATE-01`) fecham parcialmente `RES-T18-03` — **apenas para o pacote `js-yaml` de `server`**. ⚠ **Os 26 HIGH de `mobile` (14) e `tv` (12) permanecem sem finding e sem investigação individual** (`OBS-T26-14`) |
| **N-14** (dispensa das trilhas de IA) | **MANTIDA e REFORÇADA.** Nenhuma das 7 entradas novas encontrou modelo de linguagem, embedding, agente autônomo ou decisão não determinística — incluindo **31 arquivos de `mobile`/`tv` lidos integralmente**. A cláusula de reabertura do plano §9 **continua não acionada**. **Dispensa permanece PROVISÓRIA (G5 aberto)** |

---

## 5. RISCO RESIDUAL (condição G3-b) — atualização do registro obrigatório

A EMENDA-02 §6 fixou `RES-01`…`RES-13` como **6º requisito** do veredito. Atualização:

| ID | Estado após a Rodada 2 |
|---|---|
| `RES-01` (nenhuma verificação dinâmica de segurança) | **INALTERADO — primeira ordem** |
| `RES-02` (vulnerabilidade transitiva) | **PARCIALMENTE ENDEREÇADO** por `DYN-T18-03` + 2 findings formais; **agravado** pelo ponto cego de gate medido em `AUD-CICD-DEPGATE-01` (640/854 fora de controle) e pelos 26 HIGH de `mobile`/`tv` sem finding |
| `RES-03` (fração OUT do tier 3 profundo) | **INALTERADO** — ≈83 endpoints em D4-D8, **e a lista nominal continua não publicada** (F-5) |
| `RES-04` (fração OUT das 167 páginas do `client/`) | **INALTERADO — ≈126 páginas.** ⚠ **decisão do dono pendente** |
| `RES-05` (`tv/` + fração OUT de `mobile/`) | ✅ **PROPOSTO REBAIXAR** — superfície 100% coberta; resta só a lacuna dinâmica ⇒ remetida a `RES-11` (§4.1) |
| `RES-06` (D7 amostral) | **INALTERADO**, e **agravado com medição nova**: as 4 trilhas de T-27 mediram cobertura de teste **por regra** e encontraram o mesmo padrão nos quatro módulos — *"existe teste para tudo que o código faz e para nada que o código deveria decidir e não decide"*; e `T27-SST-F20` registra o fato estrutural de que **nenhum teste de `sst` instancia uma implementação Sequelize** ⇒ as regras que vivem no repositório são **invisíveis à suíte por construção** |
| `RES-07` (D8 documentação amostral) | **INALTERADO** |
| `RES-08` (D10 arquitetura amostral) | **INALTERADO** |
| `RES-09` (conteúdo de credencial não lido) | **INALTERADO** |
| `RES-10` (estado do banco real não observado) | **INALTERADO como cobertura** — e agora com **registro de que a única observação de produção que ocorreu foi indevida e é inadmissível** (`AUD-PROC-CUSTODIA-01`) |
| `RES-11` (toda a evidência dinâmica, se G4 permanecer aberto) | **AGRAVADO** — universo de ≈137 para **≈167** pedidos; incide integralmente sobre os 60 findings de T-27, os 7 de T-29 e os 10 CONFIRMED de T-28 |
| `RES-12` (código posterior ao `AUDIT_COMMIT`) | **INALTERADO** |
| `RES-13` (dispensa de IA não homologada) | **INALTERADO** (mais defensável, ainda provisória) |
| **`RES-14`** *(NOVO — proposto)* | **A auditoria não tem, hoje, como auditar a própria regra de proteção de dado real a não ser pela palavra dos agentes.** Não existe retenção de log de conexão do Postgres no repositório, e `org-isolation.js:134` aprova todo Bash ⇒ **"caso isolado no registro" ≠ "caso isolado de fato"**. Fonte: `AUD-PROC-CUSTODIA-01` §4.3/§6.2 |

---

## 6. RECONTAGEM DE TABELAS — determinação da fonte autoritativa

*(Tratamento integral em `07-findings/T-26_CONSOLIDACAO_RODADA2.md` §6. Síntese vinculante para
este documento.)*

| Medida | Valor | Objeto medido | Autoritativa? |
|---|---|---|---|
| M1 | **200** | `CREATE TABLE public.` no `00_baseline_frozen.sql` | **NÃO** — mede só o baseline, congelado entre as migrations `…-000032` e `…-000039` |
| M2 | **207 tabelas / 478 FKs** | Banco de teste **recriado do zero** a partir das 169 migrations de `main` | **SIM** |
| M3 | **207** | Contagem estática de T-13: **200 + 7 tabelas criadas pelas 9 migrations pós-freeze** | **SIM** |
| M4 | 208 / 480 | Banco efêmero **contaminado** (tabela de branch SanaCore não mesclada) | **NÃO** — diferença de 1 tabela / 1 migration / 2 FKs, atribuída |
| M5 | 207 | Banco de **PRODUÇÃO** | **INADMISSÍVEL** — obtido por consulta indevida (`AUD-PROC-CUSTODIA-01`) |

> **DETERMINAÇÃO: 207 tabelas / 478 FKs é o número autoritativo do `AUDIT_COMMIT`.**
> **Fundamento (Regra 20):** M2 e M3 são **medições independentes por métodos disjuntos** (execução
> de migrations × contagem estática) que **coincidem exatamente**. M2 é legítima porque o
> orquestrador verificou `git diff --stat c1311a6..HEAD -- server/migrations` **vazio** ⇒ as
> migrations de `main` **são** as do `AUDIT_COMMIT`.
> **Por que os três diferem — consequência direta de `OBS-R3C-01`:** M1 mede o **baseline
> defasado**; M2/M3 medem o **schema versionado completo**. A diferença de **7 tabelas** é a
> contribuição das 9 migrations pós-freeze. **A Rodada 1 usou 207 e estava correta; o que faltava
> era a explicação.**
> ⚠ **Vedação:** a coincidência com M5 **não pode ser citada como corroboração** — evidência
> inadmissível por origem, e objeto diferente.
> **Limite:** eu **não contei** as 7 tabelas nominalmente nem li o baseline. Aceito de `T-13` §2.

**Efeito sobre `C-137`:** o denominador correto é **207**; a cobertura entregue é **22** ⇒ **déficit
de 185 tabelas**, não 178. O número da Rodada 1 (`A 22/207`) estava certo; o que muda é a
**fundamentação** do denominador, que agora é determinada em vez de herdada.

---

## 7. `OBS-R3C-01` — estado após a Rodada 2

**DE (Rodada 1):** 2 dos 12 findings de T-13 com afirmação de ausência não integralmente fechada
contra o schema versionado (`T13-F07` MÉDIA-ALTA; `T13-F09` em grau menor). Custo de fechar: 1 grep.

**PARA (Rodada 2): INALTERADO quanto a T-13 — e o método foi adotado por três trilhas novas.**

- `T-27 DEF-02B` varreu `server/migrations/2026081*` por `sst_*|addConstraint|addIndex` ⇒ **zero**;
  suas afirmações de ausência valem contra o schema versionado inteiro.
- `T-28` (SST/RFQ) enumerou as **19 migrations pós-freeze** por glob e varreu por
  `sst_|customer_price|rfq_|addConstraint|EXCLUDE|CREATE TRIGGER|addIndex` ⇒ **zero** para
  `sst_*`, `customer_price_lists` e `rfq_*`.
- `T-28` (JUR/RH) varreu as 19 por `TRIGGER|hr_employee_documents|jur_lgpd|jur_proxies|hr_vacation|
  jur_legal_alerts` ⇒ **uma única ocorrência, e é um comentário que CONFIRMA a negativa**
  (`20260812-000046…:21`).
- `T-27 DEF-02A` leu explicitamente o baseline **e** a migration pós-freeze `20260812-000045`.

> **Registro de método, com peso:** `OBS-R3C-01` deixou de ser uma ressalva sobre findings antigos e
> **virou padrão de prova adotado por quatro trilhas novas**. **`T13-F07` continua em MÉDIA-ALTA e
> o custo de fechá-la continua sendo 1 grep** (`RES-T26-02`, ainda aberto).

---

## 8. Riscos residuais próprios de T-26 — atualização

| ID | Estado |
|---|---|
| `RES-T26-01` (16 endpoints de `products`/`assets` sem matriz endpoint×dimensão) | ⚠ **INALTERADO.** `T-29` não o alcança — auditou `mobile`/`tv`. `T21-F01` continua **não adjudicado** |
| `RES-T26-02` (`T13-F07` — 1 grep para fechar) | ⚠ **INALTERADO — ABERTO** |
| `RES-T26-03` (dedup sintática, não semântica) | ⚠ **AGRAVADO.** +69 IDs ⇒ o volume de comparações cresceu 27%. Mitigante: as superfícies de T-27/T-29 são **disjuntas por construção** das já auditadas |
| `RES-T26-04` (erro de trilha propaga-se integralmente) | ⚠ **INALTERADO** |
| **`RES-T26-05`** *(NOVO)* | **A colisão de ID de T-27 esteve viva por duas trilhas inteiras antes de ser mapeada.** Qualquer artefato produzido entre a emissão de T-27 e este documento que cite `T27-F01`, `T27-F02`, `DIV-T27-0x` ou `DIV-T28-0x` **sem qualificador é ambíguo e precisa ser reconferido** contra o mapa canônico |
| **`RES-T26-06`** *(NOVO)* | **`AUD-PROC-CUSTODIA-01` é HIGH e não passou pela Regra 22.** Enquanto permanecer HIGH sem validação, **a run tem um finding em violação da própria Regra 22** — que é, ela mesma, um defeito de processo dentro de um finding de processo |
| **`RES-T26-07`** *(NOVO)* | **`OBS-T26-11`: a trilha de SST declarou `E 75/75` e eu não confirmo** (≈6 endpoints dos clusters-âncora sem atribuição). **Se o director acolher a declaração da trilha sem resolver a assimetria, C-05/C-06 entram no relatório final com cobertura declarada acima da medida** |

---

## 9. LIMITES DESTE AGENTE

### 9.1 Consolidado por leitura própria e integral nesta sessão

`CLAUDE.md`; `AUDIT_PLAN_EMENDA_02.md` (integral — §3, §4, §5, §6, §7 são a base de todo o §2 acima);
`T-26_CONSOLIDACAO.md` (integral); `AUDIT_COVERAGE_EXECUTED.md` §3, §4, §5, §6, §7; os **4
relatórios de T-27**, os **2 de T-28**, **`T-29_MOBILE_TV.md`** e os **3 findings formais** —
integrais; `T-25_..._RODADA3_A/B/C.md` (tabelas de veredito e placares);
`G4_PRECONDICAO_BANCO_TESTE.md` (dirigido).

**Toda a aritmética deste documento é minha e fecha:** 15 + 49 + 73 = 137; a correção 7/8 de §2.0;
145 − 126 = 19 para `N-04`; 207 − 22 = 185 para `C-137`; e o recálculo faixa a faixa.

### 9.2 Aceito de relato **SEM reverificar**

1. **Nenhum arquivo do objeto auditado foi aberto por mim. Zero.** Nem `server/src`, nem
   `client/src`, nem `mobile/`, nem `tv/`, nem `server/database`, nem `server/migrations`, nem
   `.claude/`, nem `docs/`.
2. **Toda declaração de cobertura das trilhas** — `E 37/37`, `E 30/30`, `E 59/59`, `E 7/7 + 4/4`,
   `16/16` e `15/15`. **Não conferi um único endpoint contra o router.**
3. **Toda a evidência de git e de banco** (o `git diff --stat`, as contagens 207/478 e 208/480, a
   ausência da tabela contaminante). **Não uso Bash; não faço afirmação própria de proveniência de
   commit** (`IN-08`).
4. **Os vereditos de mérito de T-25 e T-28**, inclusive os 3 rebaixamentos e as 5 correções de texto.
5. **Os três fatos de causa-raiz de `AUD-PROC-CUSTODIA-01`** (hook, `APPROVALS.md:787`, credencial
   única). Verificáveis por qualquer um; **não os verifiquei**.

### 9.3 O que este recálculo **não** pode oferecer

- **A célula "entregue como E" é aceita da declaração da trilha, não medida por mim.** Onde a trilha
  declarou `E 59/59`, eu registro `E 59/59` — **exceto** onde outra evidência do corpus contradiz a
  declaração, que é exatamente o caso de `OBS-T26-11` (`sst`) e de `DIV-T27-RH-02` (`rh`), e por
  isso esses dois estão marcados.
- **Não meço qualidade da leitura, só a sua extensão declarada.** Uma trilha que tenha lido 59
  endpoints superficialmente e declarado `E` produz, neste documento, a mesma célula que uma que os
  tenha lido a fundo. O contrapeso disponível é a validação adversarial — que cobriu **10 dos 60**
  findings de T-27, e **nenhum** dos 7 de T-29 (nenhum é CRITICAL/HIGH).

---

## 10. Critério de conclusão de T-26 · Rodada 2 — autoavaliação

| Critério do mandato | Estado |
|---|---|
| Nenhum finding duplicado sem marcação | ✅ **0 duplicatas plenas novas; 1 possível duplicata (`DUP-ABERTA-01`) formalmente escalada com critério de decisão publicado.** Nenhum ID descartado |
| Todo grupo tem causa-raiz identificada ou lacuna registrada | ✅ 4 grupos novos (G-15…G-18), todos com causa-raiz; lacunas de causa-raiz de G-09 e G-11 permanecem **registradas como lacunas** |
| Total consolidado confere com o total reportado pelas trilhas | ✅ **com duas ressalvas registradas, não silenciadas:** `OBS-T26-08` (JUR: resumo 9 × enumeração 10) e `OBS-T26-09` (RH: resumo 11 × enumeração 18). **Adotei a enumeração por ID nos dois casos** |
| Colisão de ID resolvida antes de contar | ✅ **§1 do par de findings** — mapeamento canônico completo de 60 findings, **4** séries `DIV-T27` e **2** séries `DIV-T28` (o mandato informava 2 séries; são 6 no total — correção registrada) |
| Aritmética 8 × 11 de T-25 Rodada 3 | ✅ **RESOLVIDA por evidência, não escalada de novo: 11 CONFIRMED + 1 FALSE_POSITIVE.** Placar corrigido de 41 → 44 |
| Mudanças de severidade registradas, nunca silenciosas | ✅ §4 do par de findings, todas em DE → PARA, com autor, evidência, **custo** e **condição de reelevação** |
| Categoria separada para finding de processo da auditoria | ✅ §5 do par de findings — **`AUD-PROC-CUSTODIA-01` não é somado ao placar do ERP** |
| Cobertura recalculada, célula a célula, com déficit **medido** | ✅ §2 e §3 deste documento — **137 = 15 E + 49 parciais + 73 não entregues** |
| Estado de `N-04`…`N-08` | ✅ §4 deste documento — uma a uma, com número |
| Tabela consolidada de dependências de ordem de remediação | ✅ §7 do par de findings — **12 dependências (OR-01…OR-12)** |
| **NÃO declarar G3 cumprido** | ✅ **Não declarado. §3 lista F-1…F-11 com número** |
| **NÃO declarar `AUDIT_PASSED` / `RETEST_PASSED` / `FINDING CLOSED`** | ✅ **Nenhum declarado** |
| **NÃO criar finding novo** | ✅ **Nenhum criado.** 11 observações não promovidas (`OBS-T26-08`…`-18`) |
| **NÃO corrigir o objeto auditado** | ✅ **Zero escritas** fora de `audit/` |

**Estado da trilha: `T-26 RODADA 2 CONCLUÍDA — CONSOLIDAÇÃO ATUALIZADA, COBERTURA RECALCULADA,
DÉFICIT DE G3 MEDIDO E DECLARADO.`**

**Entrega:** ao `vericore-audit-reporting-agent`, com o par obrigatório
`07-findings/T-26_CONSOLIDACAO_RODADA2.md`.
