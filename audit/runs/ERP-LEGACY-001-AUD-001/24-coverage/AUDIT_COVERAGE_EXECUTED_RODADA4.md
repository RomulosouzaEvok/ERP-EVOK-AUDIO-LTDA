# AUDIT_COVERAGE_EXECUTED — **RODADA 4** (recálculo pós-T-31…T-40) · ERP-LEGACY-001-AUD-001

```
AUDIT_ID:      ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f   (única referência de leitura)
TRILHA:        T-26 — cobertura executada · RODADA 4 (par de `07-findings/T-26_CONSOLIDACAO_RODADA4.md`)
PRODUZIDO POR: vericore-traceability-auditor
DATA:          2026-08-17
NATUREZA:      **ADIÇÃO RASTREÁVEL.** Nenhuma célula da `AUDIT_COVERAGE_MATRIX.md`, da EMENDA-02,
               do `AUDIT_COVERAGE_EXECUTED.md` (Rodada 1) ou do `AUDIT_COVERAGE_EXECUTED_RODADA2.md`
               foi editada, apagada ou renumerada (Regra 15). Toda mudança está em DE → PARA.
PAR OBRIGATÓRIO: `07-findings/T-26_CONSOLIDACAO_RODADA4.md`
LEITURA CONJUNTA: não substitui a Rodada 1 nem a Rodada 2. **Não existe `_RODADA3`** — o salto
               2 → 4 é declarado, e o §11 mede o delta contra `_RODADA2`, que é o par vigente.
               Onde divergirem, prevalece esta Rodada 4, e a divergência está registrada.
REGIME:        read-only, 100 % estático. **Zero conexão com `erp_evok_audio`** (`APR-2026-016`),
               nem para contar linhas. Zero execução, zero comando, zero requisição HTTP.
NÃO DECLARA:   `AUDIT_PASSED`, `FINDINGS_CONFIRMED`, `RETEST_PASSED`, `FINDING CLOSED`,
               `REMEDIATION COMPLETE` (Regras 3, 4, 18). **Não declara G3 cumprido**, não declara
               `C-133` fechada, não declara `C-137` fechada. Nenhuma severidade alterada (Regra 18).
               Nenhum finding criado (Regra 6). Escrita exclusiva em `24-coverage/`.
```

---

## 0. Regra que governa este documento (inalterada das Rodadas 1 e 2)

> **Cobertura executada é o que foi lido, não o que foi planejado.** Onde a execução ficou abaixo
> do plano, a diferença está aqui **com número nominal**, e a palavra usada é *déficit*, nunca
> *ajuste*. Onde a execução entregou mais, também está — **registro simétrico obrigatório**.

**Aditivo desta rodada, exigido pelo mandato:** onde a consolidação dá uma célula como fechada e a
evidência do corpus não a sustenta, **a divergência é registrada e escalada** (Regra 20), nunca
conciliada por autoridade do documento mais recente. As divergências que encontrei estão em §9.

**Base de custódia declarada, não produzida por mim (herdada, inalterada):** o orquestrador
verificou que `git diff --stat c1311a6..HEAD -- server/src client/src server/migrations server/database`
é **vazio**. **Ressalva herdada e mantida (`RES-T18-01`):** `server/package.json`,
`server/package-lock.json` e `.github/` **não estão nesse conjunto de caminhos**. **Ressalva nova
herdada de `T-31` (`RES-T31-01`) e de `LIM-T37-01`:** duas trilhas desta leva **não** puderam
reconfirmar o `git diff` por si (Bash indisponível) e o registram como fato de terceiro.

---

## 1. VERIFICAÇÃO PRÓPRIA DE EXISTÊNCIA DAS TRILHAS NOVAS (Regra 7 — a lista do mandato não foi aceita)

Listagem própria de `07-findings/` nesta sessão. **Não presumi nenhuma trilha a partir do enunciado
do mandato.**

| Trilha | Arquivos que existem de fato | Confere com o mandato? |
|---|---|---|
| **T-31** | `T-31_C137_SEMANTICA_COLUNA.md` (1) | sim |
| **T-32** | `T-32_CLIENT_COMERCIAL_FINANCEIRO.md`, `_FACILITIES_SST_TI.md`, `_HR_JURIDICO.md`, `_PRODUCAO_QUALIDADE.md`, `_SUPRIMENTOS.md`, `_TRANSVERSAIS.md` (**6**) | sim — 6 arquivos, como enunciado |
| **T-33** | `T-33_RASOS_BLOCO_A.md`, `T-33_RASOS_BLOCO_B.md` (**2**) | sim |
| **T-34** | `T-34_VALIDACAO_5_FINDINGS_FORMAIS.md`, `T-34_VALIDACAO_T32_CLIENT.md`, `T-34_VALIDACAO_T33_RASOS.md` (**3**) | sim — 3 documentos de validação |
| **T-35** | `T-35_C137_SEMANTICA_COLUNA_LOTE2.md` (1) | sim — `C-137` lote 2 |
| **T-36** | `T-36_VALIDACAO_T35.md` (1) | sim |
| **T-37** | `T-37_VALIDACAO_AUD-ALOG-01.md` (1) | sim |
| **T-38** | `T-38_CLASSIFICACAO_AMBIENTE_CORPUS.md` (1) | sim — classificação de ambiente |
| **T-39** | `T-39_FILA_REMEDIACAO_EXPOSICAO.md` (1) | sim — fila de remediação |
| **T-40** | `T-40_VALIDACAO_AUD-RH-COMISSAO-01.md` (1) | sim |
| **T-41** | ⚠ **NENHUM ARQUIVO.** | **INEXISTENTE no `AUDIT_COMMIT` e no worktree nesta data** |

> **Declaração exigida pelo critério de conclusão desta trilha:** `T-41` é registrado como
> **INEXISTENTE — ausência de evidência**, não como pendente presumido e não como lacuna preenchida
> por inferência. Se estiver em execução, **nada de seu produto entra nesta matriz** e o par terá de
> ser refeito quando existir. Nenhuma célula desta matriz depende de `T-41`.

**Retificações verificadas (existem):** `T-03_RETIFICACAO_01.md` e `AUD-DB-09_RETIFICACAO_01.md`.
**Findings formais verificados (existem, 10/10):** `AUD-COM-DESCONTO-01`, `AUD-RH-CPFSEARCH-01`,
`AUD-TES-SALDOMANUAL-01`, `AUD-CTB-DEBCRED-01`, `AUD-PROC-DOCDRIFT-01`, `AUD-RH-VTHORISTA-01`,
`AUD-EST-TRUNCCADEIA-01`, `AUD-PAT-DEPRECIACAO-01`, `AUD-RH-COMISSAO-01`, `AUD-ALOG-01`.

---

## 2. AS ENTRADAS NOVAS — o que cada uma cobriu, medido

| Entrada | Superfície declarada | Cobertura declarada pela trilha | Célula(s) da EMENDA-02 atacada(s) |
|---|---|---|---|
| `T-31_C137_SEMANTICA_COLUNA.md` | 12 tabelas P1 financeiro/fiscal (≈118 colunas) | **E 12/12** nos 7 critérios; denominador **207 reconstruído por método próprio** | **C-137** (parcial) |
| `T-32` × 6 blocos | `client/` — produção/qualidade 23, RH/jurídico 21, facilities/SST/TI 31, suprimentos 24, comercial/financeiro 21, transversais 37 + 11 widgets | **23/23 · 21/21 · 31/31 · 24/24 · 21/21 · 37 (14 integrais + 23 dirigidas)** | **C-133** |
| `T-33_RASOS_BLOCO_A.md` | `clients` 5, `employees` 5, `nonConformities` 5, `spreadsheetImport` 5, `quality` 3 = **23 endpoints** | **E 23/23** em D1, D2, D3, D4, D5, D6, D9 (D5 e D9 **estáticos**, declarado) | **C-63…C-132** (metade A) |
| `T-33_RASOS_BLOCO_B.md` | `maintenance` 5, `serviceOrders` 5, `intelligentAuditor` 4, `laboratory` 3, `dashboard` 3 = **20 endpoints** | **E 20/20** nas mesmas 7 dimensões, mesmos limites | **C-63…C-132** (metade B) |
| `T-34` × 3 | validação adversarial: 7 HIGH de T-33; 13 HIGH de T-32; 5 findings formais | vereditos individuais (Regra 22) | — (validação) |
| `T-35_C137_..._LOTE2.md` | 18 tabelas Tier A (passagem completa) + 38 Tier B (só dimensão monetária/quantitativa) | **+18** em `C-137`; Tier B **declarado como não-fechamento** | **C-137** (parcial) |
| `T-36_VALIDACAO_T35.md` | 3 HIGH de T-35 | 3/3 com veredito; **resolve a divergência "soft delete"** | — (validação) |
| `T-37_VALIDACAO_AUD-ALOG-01.md` | `AUD-ALOG-01` | `CONFIRMED`; **universo corrigido 13 → 14 contra o objeto auditado** | — (validação) |
| `T-38_CLASSIFICACAO_AMBIENTE_CORPUS.md` | 446 vigentes | **446/446 classificados** por ambiente | — (atributo, não cobertura) |
| `T-39_FILA_REMEDIACAO_EXPOSICAO.md` | fila por exposição real | 98 CRITICAL+HIGH ordenados; 4 reclassificações de ambiente | — (fila, não cobertura) |
| `T-40_VALIDACAO_AUD-RH-COMISSAO-01.md` | `AUD-RH-COMISSAO-01` (HIGH fixada, `APR-2026-031` D-11) | `CONFIRMED`, 5 hipóteses | — (validação) |

### 2.1 Registro simétrico — onde as entradas novas entregaram **MAIS** do que o pedido

- **`T-31` reconstruiu o denominador em vez de herdá-lo** (200 do baseline + 7 das migrations
  pós-freeze = 207), e **nomeou a armadilha de duas camadas**: baseline defasado **e** regex ingênua
  errando por 1 por causa de `CREATE TABLE public."SequelizeMeta"` com identificador aspado.
  Declarou, contra o próprio interesse, que a coincidência com T-13 vem de método **parcialmente
  correlacionado** (`RES-T31-05`) — não a vendeu como confirmação independente.
- **`T-33` recontou a superfície nos dois blocos e corrigiu o encargo em ambas as direções:** Bloco A
  mediu **23** contra "~26" estimados (encargo alto em 3); Bloco B mediu **20** contra "~17"
  (encargo baixo em 3). Nos dois casos **a contagem de T-16 §5 estava certa**. D1/D2 foram
  **reconfirmados por leitura própria**, não herdados de T-16 — e a releitura **acrescentou** achados
  invisíveis a uma varredura de duas colunas.
- **`T-35` publicou a lista nominal das 155 tabelas não cobertas** (134 nomeadas + 21 declaradas
  não-nomeáveis) e mediu a **densidade de coluna opaca (~1,3/tabela, uniforme)** — isto é, produziu
  a prova de que extrapolar conformidade para o resto seria **otimista**, não a extrapolação.
- **`T-35` separou Tier A de Tier B e recusou contar o Tier B como fechamento**, dizendo por escrito
  que medir os dois juntos "seria exatamente a inflação que se proibiu".
- **`T-37` achou o 14º call site** trocando o glob de prefixo por vocabulário de domínio —
  **correção contra o objeto auditado e contra o produtor**, e emenda numérica do critério de reteste.
- **`T-40` varreu direções que o autor do finding não varreu** (vendas, JSONB, contratos, DDL ×
  model) e produziu uma **refutação parcial** que refina a remediação sem reduzir o finding.
- **`T-32 SUPRIMENTOS` e `T-32 COMERCIAL` registraram divergência de contagem contra o próprio
  encargo** (23 arquivos × "22 páginas"; 7 dos 21 não são páginas roteadas) — Regra 20 aplicada de
  ofício.

---

## 3. RECÁLCULO CÉLULA A CÉLULA DAS 137 CÉLULAS ELEVADAS PELA EMENDA-02

### 3.1 Faixa §4 tier 2 — D3/D4 (C-01 … C-15) — **15 células**

| Rodada 2 | **Rodada 4** | Motivo |
|---|---|---|
| **13 E · 2 parciais** (`rh` D3/D4) · 0 ausentes | **13 E · 2 parciais · 0 ausentes — INALTERADA** | **Nenhuma das 11 entradas novas toca `juridico`, `rh`, `sst` ou `rfq` no eixo endpoint×D3/D4.** `T-35` tocou tabelas de RH e LGPD (`employees`, `hr_time_import_items`, `jur_lgpd_*`), que é **D5/semântica de coluna**, não D3/D4 de use case |

**As três notas da Rodada 2 permanecem abertas e são reafirmadas sem atenuação:**
`DIV-T27-JUR-03` (1 endpoint ambíguo — 74/75 × 75/75), `OBS-T26-11` (≈6 endpoints de `sst` sem
atribuição de profundidade; **a trilha declarou 75/75 e este par continua não confirmando**),
`DIV-T27-RH-02` (≈13 endpoints de `rh`).

### 3.2 Faixa §4 tier 2 — D9 (C-16 … C-34) — **19 células**

| Rodada 2 | **Rodada 4** |
|---|---|
| ⚠ **PARCIAL** — `E` em 6 de 10 categorias ASVS; `A`/`M` em cripto, segredos, dependências | ⚠ **PARCIAL — INALTERADA.** Nenhuma das 11 entradas novas é varredura D9 de tier 2. `T-32` e `T-33` produziram D9 **estático** nas suas próprias superfícies (`client/` e os 43 rasos), que são outras faixas |

### 3.3 Faixa §7.1 tier 3 profundo (C-35 … C-62) — **28 células**

| Rodada 2 | **Rodada 4** |
|---|---|
| ⚠ **PARCIAL** — D1/D2/D3(borda) `E 174/174`; D4-D8 `A(≈91/174, 52 %)`; **lista nominal IN/OUT do REG-G3 passo 4 NÃO publicada** | ⚠ **PARCIAL — INALTERADA. A lista nominal continua não publicada** ⇒ a amostra remanescente **continua não sendo "baseada em risco" no sentido da condição (a) de G3**. É a lacuna mais barata de fechar da run e está aberta há quatro rodadas (F-5) |

### 3.4 Faixa §7.3 tier 3 raso (C-63 … C-132) — **70 células** — ⚠️ **A MUDANÇA MATERIAL DESTA RODADA**

| Rodada 2 | **Rodada 4** |
|---|---|
| ❌ **0 de 70 entregues.** *"Estes 43 NÃO foram auditados em profundidade. Nenhuma regra de negócio destes módulos foi examinada"* (T-16 §5). Declarada, isolada, **a maior divergência planejado × executado da run** | ✅ **70 de 70 declaradas E pelas trilhas titulares** — `T-33` Bloco A (23 endpoints × 7 dimensões = 35 células) + Bloco B (20 endpoints × 7 dimensões = 35 células). **Superfície: 43/43 endpoints, zero amostragem, inventário recontado por leitura própria das rotas** |

**Composição, para o número não ser abstrato:** `clients` 5 · `employees` 5 · `nonConformities` 5 ·
`spreadsheetImport` 5 · `quality` 3 (Bloco A = 23) · `maintenance` 5 · `serviceOrders` 5 ·
`intelligentAuditor` 4 · `laboratory` 3 · `dashboard` 3 (Bloco B = 20). **23 + 20 = 43.** Fecha com
a aritmética de fechamento do tier 3 (`174 + 44 + 43 = 261`) já verificada na Rodada 1 §4.1.

**Três ressalvas nominais que impedem ler estas 70 células como cobertura plena** — declaradas pelas
próprias trilhas, e que este par transcreve em vez de arredondar:

1. **D5 é `E` sobre o schema declarado em models e migrations, não sobre o catálogo do Postgres.**
   Onde se lê "sem CHECK", leia-se **"sem CHECK declarado no model"** (`T-33` A §4 ressalva 1).
   Consequência: a mesma classe de limitação de `OBS-R3C-01`, agora do lado do model.
2. **D9 é `E` estático. Nenhuma requisição foi emitida.** Dois achados de alcançabilidade
   (`T33-A-F03`, `T33-A-F12`) são deriváveis do código com alta confiança, mas **prova dinâmica não
   foi produzida** (`T-33` A §4 ressalva 2; B §4 limite 1).
3. **Cobertura de teste por regra crítica: existem suítes para os cinco módulos do Bloco A e
   nenhuma cobre F01, F02, F03, F04, F05, F11 ou F12.** Isto é `TEST COVERAGE` medido, não presumido
   — reforça `RES-06`, não o alivia.

**Validação adversarial da faixa (Regra 22):** `T-34` (T-33) deu veredito aos **7 HIGH** —
**4 mantidos em HIGH** (`T33-A-F01`, `T33-A-F02`, `T33-A-F04`, `T33-B-F02`), **2 rebaixados a
MEDIUM** com fundamento de escala interna (`T33-A-F05`, `T33-B-F01`), **1 `DUPLICATE` de
`AUD-DB-03`** (`T33-B-F03`). **Zero `FALSE_POSITIVE`, zero `NEEDS_MORE_EVIDENCE`.**

### 3.5 Faixa §8 superfícies não-modulares (C-133 … C-137) — **5 células**

| Célula | Superfície | Rodada 2 | **Rodada 4** | Evidência / déficit medido |
|---|---|---|---|---|
| **C-133** | `client/` — 167 páginas | ❌ **NÃO ENTREGUE** — `A(41/167)`, ≈126 páginas não amostradas | ⚠ **PARCIAL ALTA — NÃO declarada entregue.** **157 unidades declaradas lidas** pelos 6 blocos de `T-32` contra **167 arquivos `.tsx` em `client/src/pages/`** (medição própria, §3.5.1) | Ver §3.5.1 e §9 (`DIV-COV4-02`). **D-07 continua aberta** |
| **C-134** | `mobile/` | ✅ **E nos 3 eixos** (T-29) | ✅ **E — INALTERADA** | nenhuma entrada nova toca `mobile/` |
| **C-135** | `tv/` | ✅ **Triagem 100 %, acima do exigido** (T-29) | ✅ **E — INALTERADA** | idem |
| **C-136** | Contrato de API — semântica profunda 683/683 | ❌ **NÃO ENTREGUE** (`RES-T17-01`) | ❌ **NÃO ENTREGUE — INALTERADA** | **nenhuma das 11 entradas novas toca T-17.** Quatro rodadas sem movimento |
| **C-137** | Models/schema — semântica de coluna | ❌ **NÃO ENTREGUE** — `A(22/207)`, déficit 185 | ❌ **NÃO ENTREGUE — MOVIDA: `A(52/207)`, déficit 155** | `T-31` +12, `T-35` +18. Ver §6 |

**Placar da faixa: DE `2 de 5` PARA `2 de 5` E integral + `1 parcial alta` (C-133) + `2 não
entregues` (C-136, C-137).** **Nenhuma célula desta faixa foi fechada nesta rodada.**

#### 3.5.1 `C-133` — reconciliação do denominador, com o número que faltava

**Medição própria nesta sessão (única medição de superfície que produzi, e declarada como tal):**
`Glob client/src/pages/**/*.tsx` ⇒ **167 arquivos**. **O denominador "167 páginas" do plano é, de
fato, a contagem de arquivos `.tsx` sob `client/src/pages/` — inclui abas, diálogos, widgets e
arquivos `.test.tsx`, não apenas páginas roteadas.** Isto responde a metade técnica de `D-07`; a
outra metade — **qual denominador é o normativo para declarar a célula** (167 arquivos × ≈121
páginas roteadas) — **é decisão do dono e não a antecipo** (Regra 18).

| Bloco de `T-32` | Unidades declaradas lidas | Profundidade declarada |
|---|---|---|
| Produção/qualidade | **23/23** | integral |
| RH/jurídico | **21/21** | integral, com **`LegalCasesTab.tsx` parcial declarada** (integral até `:140`, resto por grep dirigido) |
| Facilities/SST/TI | **31/31** | integral, "100 %, sem amostragem" |
| Suprimentos/compras/logística | **24/24** | integral (23 arquivos + `comexShared.ts`) |
| Comercial/financeiro | **21/21** | **13 integrais + 8 dirigidas** — a própria trilha declara a leitura dirigida **insuficiente** para afirmar ausência de achado na renderização desses 8 |
| Transversais | **37** (14 integrais + 23 dirigidas) + 11 widgets + `widgetRegistry` + `useHandoffs` | 23 lidas **só na dimensão autorização/validação**, "não lidas linha a linha no corpo de renderização" |
| **Soma declarada** | **157** | — |

> **Por que NÃO declaro `C-133` entregue, apesar de 157/167:**
> 1. **Nenhum bloco publicou lista nominal cruzada**; a soma 157 é aritmética minha sobre seis
>    declarações com unidades de contagem heterogêneas (páginas, abas, diálogos, widgets,
>    `comexShared.ts`). **≈10 unidades não têm atribuição nominal a nenhum bloco.**
> 2. **A célula exigia dois níveis** — *triagem estática 100 %* **e** *`E` nas IN-categoria*. A
>    triagem está materialmente alcançada; o `E` **não é uniforme**: pelo menos **31 unidades**
>    (23 transversais + 8 comercial/financeiro) foram lidas **dirigidamente**, com a trilha
>    declarando a insuficiência.
> 3. **`D-07` está aberta** e é decisão do dono.
> **Estado atribuído: `A(157/167) com 31 unidades em leitura dirigida` — PARCIAL ALTA.** É a maior
> redução de lacuna desta rodada depois de `C-63…C-132`, e não é fechamento.

### 3.6 ⚠️ TOTAL RECALCULADO — as 137 células

| Faixa | Células | **E integral** | **Parcial** | **Não entregue** |
|---|---|---|---|---|
| §4 tier 2 — D3/D4 (C-01…C-15) | 15 | **13** | **2** (`rh` D3/D4) | 0 |
| §4 tier 2 — D9 (C-16…C-34) | 19 | 0 | **19** | 0 |
| §7.1 tier 3 profundo (C-35…C-62) | 28 | 0 | **28** | 0 |
| §7.3 tier 3 raso (C-63…C-132) | **70** | **70** | 0 | 0 |
| §8 superfícies (C-133…C-137) | 5 | **2** (C-134, C-135) | **1** (C-133) | **2** (C-136, C-137) |
| **TOTAL** | **137** | **85** | **50** | **2** |

**Conferência: 85 + 50 + 2 = 137. Fecha.**

> ### DECLARAÇÃO SEM EUFEMISMO
>
> **DE (Rodada 2): 15 E · 49 parciais · 73 não entregues.**
> **PARA (Rodada 4): 85 E · 50 parciais · 2 não entregues.**
>
> **A Rodada 4 fechou 70 células por entrega real** (C-63…C-132, `T-33` A+B) **e converteu 1 de
> "não entregue" para "parcial alta"** (C-133, `T-32`). **`C-137` moveu-se dentro do balde
> "não entregue": de `A(22/207)` para `A(52/207)`.** `C-136` **não se moveu em quatro rodadas**.
>
> **Isto é a maior mudança de cobertura da run — e continua NÃO sendo o cumprimento de G3.** O que
> resta descoberto mudou de natureza: deixou de ser *superfície inteira sem auditar* e passou a ser
> **(i) profundidade por dimensão** (19 células D9 de tier 2, 28 do tier 3 profundo, 2 de `rh`),
> **(ii) semântica de dado** (`C-137`, 155 tabelas), **(iii) contrato por dimensão** (`C-136`),
> **(iv) toda a prova dinâmica** (`RES-11`). **As quatro são matéria de decisão humana, não de
> conciliação por este agente.**

---

## 4. O QUE FALTA PARA G3 SER INTEGRALMENTE CUMPRIDO — medido, item a item

**Não declaro G3 cumprido.** Declaro o déficit, com número, em ordem de tamanho.

| # | O que falta | Rodada 2 media | **Rodada 4 mede** | Estado |
|---|---|---|---|---|
| **F-1** | 70 células dos 43 rasos (C-63…C-132) | 70 células · 43 endpoints · 10 módulos | ✅ **EXTINTO como lacuna de superfície.** 43/43 endpoints, 70/70 células declaradas E — **com as 3 ressalvas de §3.4** (D5 e D9 estáticos; teste por regra crítica ausente) | **Fechado por entrega**, ressalvas registradas |
| **F-2** | `C-133` — `client/` | ≈126 páginas não amostradas | ⚠ **REDUZIDO A ≈10 unidades não atribuídas + 31 em leitura dirigida** (§3.5.1) | **D-07 aberta** (dono) |
| **F-3** | `C-137` — semântica de coluna | 185 de 207 tabelas | ⚠ **155 de 207 tabelas** — 134 nomeadas + **21 não nomeáveis** | **Critério de encerramento fixado por `APR-2026-034` D2 — ver §6** |
| **F-4** | `C-136` — contrato por dimensão em 683/683 | não alcançada | ⚠ **NÃO ALCANÇADA — INALTERADA em 4 rodadas** | Não executado |
| **F-5** | REG-G3 passo 4 — lista nominal IN × OUT dos 174 profundos | não publicada | ⚠ **NÃO PUBLICADA — INALTERADA em 4 rodadas.** Sem ela, a amostra dos 174 **não satisfaz** a condição (a) de G3 | **A lacuna mais barata da run** |
| **F-6** | D4-D8 nos 174 do tier 3 profundo | `A(≈91/174)` ⇒ ≈83 endpoints | ⚠ **INALTERADO — ≈83 endpoints** | Não executado |
| **F-7** | D9 — 4 de 10 categorias ASVS | 19 células parciais | ⚠ **INALTERADO — 19 células parciais** | Parcial |
| **F-8** | `C-03`/`C-04` — resíduo de `rh` | ≈13 endpoints | ⚠ **INALTERADO — ≈13** (`DIV-T27-RH-02`) | Escalado, aberto |
| **F-9** | `C-05`/`C-06` — resíduo de `sst` | ≈6 endpoints | ⚠ **INALTERADO — ≈6** (`OBS-T26-11`) | **Aberto; a trilha declarou 75/75 e este par continua não confirmando** |
| **F-10** | `C-01`/`C-02` — 1 endpoint ambíguo | 1 | ⚠ **INALTERADO — 1** (`DIV-T27-JUR-03`) | Decisão de definição, director |
| **F-11** | Toda a evidência dinâmica — `CONFLITO-G3×G4` | ≈167 pedidos | ⚠ **AGRAVADO — ordem de grandeza ≈190** (R4 §6.2 T-11: +7 `DYN-T35-*`, +1 `DYN-T03-07` sobre os ≈180 da Rodada 3), mais os pedidos de `T-33`/`T-34` e `DYN-T29-01…04`; **contra ~103 catalogados** | **G4 aberto.** `RES-11` incide integralmente |
| **F-12** *(NOVO)* | **Regra de negócio dos 43 rasos sem artefato normativo** | — | **2 regras decididas por código sem fonte autoritativa versionada**: preço×custo (`T33-A-F01`) e fórmula de rating de fornecedor (`T33-A-F12`); mais `T33-B-F07` e 4 candidatas a BR-ID novo | **Escalado ao director/dono (Regra 21).** Não é lacuna de cobertura: é **lacuna de fonte** |

**Soma do que falta em superfície nominal:** ≈10 unidades + 31 leituras dirigidas do `client/` ·
≈83 endpoints do tier 3 profundo em D4-D8 · ≈13 (`rh`) · ≈6 (`sst`) · 1 (`juridico`) ·
**155 tabelas em `C-137`** · a matriz por dimensão de 683 endpoints em `C-136`.

---

## 5. ESTADO DE `N-04` … `N-08` — reavaliadas uma a uma, com número

> **Método inalterado:** a revogação/redução de declaração negativa é **ato do director** (Regra 18);
> eu **meço** e **proponho**.

| ID | Rodada 2 mediu | **Rodada 4 mede** | Proposta ao director |
|---|---|---|---|
| **N-04** — endpoints de `juridico`/`rh`/`sst` sem D3 | ⚠ REDUZIDA — **≈19** | ⚠ **REDUZIDA, INALTERADA — ≈19** (≈13 `rh` + ≈6 `sst`, todos **dentro** dos clusters-âncora de T-12, que nem T-12 reivindica nem T-27 cobriu) | **Manter com ≈19.** Revogar com 19 endpoints descobertos em categoria vedada seria a promessa vazia que custou o `AUDIT_PASSED` do SIM-002 |
| **N-05** — semântica de coluna (absorvida por `C-137`) | ⚠ EM VIGOR — 185/207 | ⚠ **EM VIGOR, REDUZIDA — 155/207.** `T-31` (+12) e `T-35` (+18) | **Manter em vigor com 155/207 no relatório final**, e com o critério de encerramento de `APR-2026-034` D2 anexado como **critério**, não como cobertura |
| **N-06** — regra de negócio nos 43 rasos | ⚠ **EM VIGOR INTEGRALMENTE** — 0 de 70 células | ✅ **CAUSA MATERIAL EXTINTA.** `T-33` A+B examinaram regra de negócio nos 10 módulos e produziram 40 IDs, dos quais 7 HIGH com veredito adversarial de `T-34` | **PROPONHO A BAIXA de `N-06`** — com **três ressalvas nominais** (§5.1). **A declaração de baixa é do director** |
| **N-07** — 127 de 167 páginas do `client/` | ⚠ EM VIGOR — ≈126 páginas | ⚠ **MATERIALMENTE REDUZIDA — ≈10 unidades não atribuídas + 31 em leitura dirigida** (§3.5.1) | **Manter em vigor, com o número novo.** ⚠ **A alteração deste estado depende de `D-07`, decisão do dono, ainda não tomada** |
| **N-08** — `mobile`/`tv` só estrutural | ✅ CAUSA MATERIAL EXTINTA; baixa proposta | ✅ **PROPOSTA DE BAIXA MANTIDA, INALTERADA** — nenhuma entrada nova a altera; as 3 ressalvas da Rodada 2 §4.1 continuam válidas | **Reitero a proposta de baixa ao director** (3ª rodada consecutiva sem despacho) |

### 5.1 Ressalvas nominais da proposta de baixa de `N-06`

Sem elas a baixa seria arredondamento para cima, e este documento não o faz:

1. **D5 é estático sobre model + migrations, não sobre o catálogo.** Toda afirmação de ausência de
   CHECK nesses 10 módulos é **"ausência no model"**, não "ausência no banco" — a mesma classe de
   `OBS-R3C-01`, do outro lado.
2. **D9 é estático.** `T33-A-F03` e `T33-B-F04`/`F12` têm confiança de comportamento **MÉDIA** por
   falta de execução. Nenhuma requisição foi emitida.
3. **O mapeamento célula → módulo do Bloco A é declaradamente INFERIDO** da ordem literal de
   `AUDIT_PLAN_EMENDA_02.md:199-201`. **Se o control plane tiver mapeamento nominal divergente,
   prevalece o dele** — e, nesse caso, a atribuição das 35 células do Bloco A precisa ser refeita.
   **A trilha declarou a inferência como inferência; eu não a converto em fato.**

### 5.2 Demais declarações negativas

| ID | Estado |
|---|---|
| **N-01, N-02, N-03, N-09, N-10, N-12, N-13, N-15, N-16** | **MANTIDAS, inalteradas** |
| **N-11** (vulnerabilidade transitiva) | **MANTIDA.** ⚠ Os **26 HIGH de `mobile` (14) e `tv` (12)** permanecem sem finding e sem investigação individual — `D-09`, **4ª rodada consecutiva sem decisão** |
| **N-14** (dispensa das trilhas de IA) | **MANTIDA e REFORÇADA por medição nova.** `T-33` Bloco B auditou `intelligentAuditor` **em profundidade** (4 endpoints, todos GET, sob `authorize('admin')` — conformidade C10) e **não encontrou modelo de linguagem, embedding, agente autônomo ou decisão não determinística**. A cláusula de reabertura do plano §9 **continua não acionada**. ⚠ **A dispensa permanece PROVISÓRIA (G5 aberto)** — mas o insumo de evidência que G5 pedia (`T33-B-F07`, `F10`, `F14`, `F16`) **agora existe** |

---

## 6. `C-137` — a maior lacuna nomeada, e o critério de encerramento vigente

### 6.1 O número, sem minimização

| Item | Rodada 2 | Rodada 3 (par inexistente; número em `T-26_R3` §7.1) | **Rodada 4** | Fonte |
|---|---|---|---|---|
| Denominador | 207 | 207 | **207** (herdado; `RES-T35-01`) | `T-13:62-67`; **reconstruído por `T-31` §2** |
| Cobertas | 22 (T-13) | 34 (+12 T-31) | **52** (+18 T-35 Tier A) | `T-35:77` |
| **Déficit** | **185** | 173 | **155 — 74,9 %** | `T-35:78-81` |
| *(memo)* Tier B — só dimensão monetária/quantitativa | — | — | +38 tabelas, **declaradamente NÃO conta como fechamento** | `T-35` §2 |

**Composição nominal do déficit: 134 tabelas nomeadas + 21 sem model, não nomeáveis pela trilha**
(`RES-T35-02`, `T35-META-F01`). Por banda, sobre a lista nominal de `T-35` §3:
suprimentos/compras/RFQ 11 · COMEX 2 · estoque/cadastro de item 7 · produção/planejamento/qualidade
12 · marketing 6 · **RH e organização 17** · **SST 34** · **jurídico 15** · TI 10 · facilities 13 ·
governança/transversais 7 (com 2 já contadas). **134.**

**Por que `C-137` não pode ser tratada como resíduo — argumento medido, não retórico:** o lote 2
aplicou o mesmo método a 18 tabelas e produziu **3 HIGH validados por `T-36`**, **dois deles
promovidos a finding formal no mesmo dia — um a CRITICAL fixado pelo dono** (`AUD-RH-VTHORISTA-01`).
A densidade de coluna opaca é **uniforme** (~1,3/tabela). **Extrapolar conformidade para as 155
restantes segue sem prova, e o histórico da própria célula diz que a extrapolação seria otimista.**

### 6.2 Critério de encerramento vigente — `APR-2026-034` D2 (2026-08-17)

> **Transcrito como CRITÉRIO, jamais como cobertura já alcançada.** A célula `C-137` está hoje em
> **`A(52/207)` — NÃO FECHADA**. O que `APR-2026-034` D2 fixa é **o que contará como encerramento**,
> não o que já foi feito. A própria aprovação diz: *"Não declara `AUDIT_PASSED` nem fecha `C-137`
> — fecha o **critério de encerramento** da célula, que é coisa diferente."*

| Elemento do critério | Texto vinculante | Estado hoje |
|---|---|---|
| **Cobertura integral (7 critérios)** nas bandas **dinheiro, estoque, fiscal e dado pessoal** | ~40-50 tabelas, 2-3 lotes no padrão de `T-35` | **NÃO EXECUTADA.** 0 lotes desses 2-3 existem |
| **Cobertura parcial declarada** no restante (SST, Jurídico, Facilities, TI, Marketing, apoio) | registrada por escrito como **exclusão explícita**, mesmo mecanismo do G3 | **NÃO PRODUZIDA.** Nenhum artefato de exclusão nominal existe |
| **Condição vinculante** | a exclusão precisa constar **nominalmente** — a lista das tabelas não cobertas, **não uma frase genérica de escopo**. *"Cobertura declarada vale; cobertura alegada não."* | ⚠ **HOJE INSATISFAZÍVEL PARA 21 DE 155 TABELAS** — ver `DIV-COV4-01`, §9 |

**Fundamento aceito pelo dono, registrado sem edição:** a densidade uniforme de ~1,3 coluna opaca
por tabela medida por `T-35` torna baixo o retorno marginal dos 7 critérios nas bandas de apoio,
contra 2-3 dias de custo antes dos relatórios finais.

---

## 7. REGRA 22 — **98/98**, confirmado por contagem própria

**Não cito o 98 de nenhum documento. Reconstruí o número.**

| Passo | Cálculo | Fonte da parcela |
|---|---|---|
| CRITICAL vigentes | **9** | `T-26_R4` §2.5, e **enumerados um a um** em `T-38` §4.3: `AUD-AUTHN-01`, `AUD-ALOG-01`, `AUD-INTEG-03`, `FIND-ERP-001`, `FIND-ERP-005`, `T08-F01`, `T24-F01`, `AUD-COM-DESCONTO-01`, `AUD-RH-VTHORISTA-01` = **9**. ✔ |
| HIGH vigentes | 88 (`T-26_R4` §2.5) **+ 1** (`AUD-RH-COMISSAO-01`, HIGH fixada pelo dono em `APR-2026-031` D-11, `APPROVALS.md:1539-1548`) = **89** | `T-39` §1.3 mede o mesmo; **conferido por mim contra o `APPROVALS.md`, não contra a citação** |
| **Universo sob a Regra 22** | 9 + 89 = **98** | — |
| Com veredito adversarial registrado até a Rodada 3 | **94** | `T-26_R3` §7.2 |
| + `T-36` (3 HIGH de `T-35`) e `T-37` (`AUD-ALOG-01`) | 94 + 3 = **97** | `T-26_R4` §7.2 |
| + `T-40` (`AUD-RH-COMISSAO-01`) | 97 + 1 = **98** | `T-40` §6 |
| **Com veredito** | **98** | — |
| **Exceções** | **NENHUMA** | — |

**Conferência independente pelo outro sentido:** `T-39` §2.5 declara a fila com
`4 (E1) + 10 (E2) + 5 (E3) + 79 (E4) = 98 = 9 CRITICAL + 89 HIGH`. **Duas aritméticas por caminhos
diferentes fecham em 98. Confirmo 98/98.**

**Nuances que registro para não serem lidas a mais** (nenhuma altera o placar):

1. **`T-39` foi emitido com "97 com veredito, 1 exceção"** — estado correto **quando escrito**, e
   superado por `T-40` no mesmo ciclo. **A frase de `T-39:82-84` está defasada, não errada.**
2. **`T-36` validou o fato de `AUD-RH-VTHORISTA-01` sustentando HIGH**; o CRITICAL é **fixação
   humana posterior** (Regra 18).
3. **`AUD-PAT-DEPRECIACAO-01` é MEDIUM e foi validado assim mesmo**; `T35-DIN-F06` (MEDIUM) **não
   foi validado**, e sua ampliação para 3 entidades de escrita **tampouco**.
4. **"Veredito registrado" não é "mérito reauditado por mim".** Aceito os vereditos de `T-34`,
   `T-36`, `T-37` e `T-40` sem reverificar o objeto auditado (§12.2).
5. **`AUD-PROC-CUSTODIA-01` (HIGH, processo da auditoria) é categoria separada** e não entra nos 98
   — `T-30` deu seu veredito, e `RES-T26-06` da Rodada 2 fica **encerrado** por esse fato.

---

## 8. BLOQUEIO NORMATIVO DO SOFT DELETE — efeito sobre esta matriz de cobertura

**Aplico integralmente o bloqueio de `T-26_CONSOLIDACAO_RODADA4.md` §4.3.** Este par **não credita
mais "soft delete não existe" como conformidade** em nenhuma célula.

### 8.1 O que mudou de asserção, e onde a cobertura era creditada

| Asserção anterior | Retificada por | Efeito nesta matriz |
|---|---|---|
| `T-03:103` — *"capacidade que não existe"* | `T-03_RETIFICACAO_01.md` §3 (**autor de origem**): 3 emissores ativos de `action:'soft_delete'`, 3 READMEs, **14 casos de uso de desativação lógica** (`T-37` §4). Erro de **inferência** | **`AUD-ALOG-01` (CRITICAL) nasce daí.** A célula D6 de `T-03` **continua `E`** quanto à extensão medida (362/362 call sites), mas **perde a conformidade** que dela se derivava |
| `T-13:78` / bloco `AUD-DB-04…-09` — *"soft delete confirmadamente ausente"* | `AUD-DB-09_RETIFICACAO_01.md` §1-§3: **34 tabelas** com soft delete semântico (27 por coluna booleana — exaustivo; 8 por `status`; −1 sobreposição), **16,4 % de 207** | **Redação substituída (R4 §4.2), adotada aqui verbatim por remissão.** A "consistência do filtro" **não é satisfeita por ausência de funcionalidade** — e a verificação encontra **3 tabelas com filtro opcional ou inexistente no caminho de escrita**: `cost_centers`, `clients`, `suppliers` |
| **`T-31:176`** — conformidade nº 7: *"Soft delete não existe no projeto (`T-13:78`) — não há dever de filtrá-lo nestas 12 tabelas"* | retificação paralela acolhida em R4 §4.2: `treasury_bank_accounts` **tem** `active` e o dever **é cumprido** (`SequelizeTreasuryRepository.ts:51`) | ⚠ **ESTA É A CORREÇÃO QUE TOCA DIRETAMENTE UMA CÉLULA DE `C-137`.** A cobertura de `T-31` **permanece `E 12/12`** — a leitura foi feita; o que muda é o **fundamento** de uma das 7 conformidades: **conformidade por controle verificado, não por inexistência da funcionalidade** |

### 8.2 Forma admissível — vinculante para este documento e para quem o herdar

> A frase **"soft delete não existe"** (e variantes: *"confirmadamente ausente"*, *"não há dever de
> filtrar"*) **não aparece neste par como conformidade genérica**. Forma admissível, sempre com
> escopo explícito:
> **"soft delete por `deleted_at`/`paranoid` não existe"** — e, onde couber, com a contraparte:
> *"soft delete semântico por `active`/`status` existe em 34 tabelas e o filtro é 100 % de
> aplicação, sem lastro em banco (sem `paranoid`, view, RLS ou trigger)."*

**Consequência de cobertura que ninguém havia extraído e que registro aqui:** a classe "exclusão
lógica" **atravessa três células desta matriz** — `C-137` (semântica das colunas `active`/`status`
em 34 tabelas, das quais só uma fração está entre as 52 cobertas), a dimensão **D6** das faixas de
tier 1 e tier 3 (`AUD-ALOG-01`, 14 call sites), e a dimensão **D5** dos 43 rasos (`T-33` mediu D5
sobre model, e o filtro de excluído lógico é 100 % de aplicação). **Nenhuma das três a cobre por
inteiro, e nenhuma pode alegar a ausência da funcionalidade como conformidade.**

---

## 9. DIVERGÊNCIAS QUE ESTE PAR REGISTRA (Regra 20) — não conciliadas

**É para isto que o par existe.** Série nova, sem colisão com `RES-T26-*`/`OBS-T26-*`.

| ID | Divergência | Fontes em conflito | Tratamento |
|---|---|---|---|
| **`DIV-COV4-01`** | ⚠️ **A condição vinculante de `APR-2026-034` D2 — "a exclusão precisa constar NOMINALMENTE" — é hoje INSATISFAZÍVEL para 21 das 155 tabelas.** `T-35` §3 declara: 134 nomeadas + **21 sem model algum, "não nomeáveis por esta trilha"** (`RES-T35-02`, `T35-META-F01`) | `APPROVALS.md:1717-1719` × `T-35:89,113` | **Registro e escalo ao director/dono.** Não invento os 21 nomes e não os obtenho por banco (`APR-2026-016`). **Fechável estaticamente**: a lista sai do cruzamento `00_baseline_frozen.sql` + 9 migrations pós-freeze × os 186 `tableName` de models — **custo estimado: 1 varredura**. Enquanto não existir, **a exclusão declarada de D2 não pode ser emitida em conformidade com a sua própria condição** |
| **`DIV-COV4-02`** | **Denominador de `C-133` não reconciliado, com dois candidatos.** Medição própria: **167 arquivos `.tsx`** em `client/src/pages/`. `D-07` fala em **≈121 páginas**. Os 6 blocos de `T-32` somam **157 unidades** em unidades de contagem heterogêneas | plano (167) × `D-07` (≈121) × soma dos blocos (157) | **Não arbitro.** Registro as três medições lado a lado; `D-07` é decisão do dono (Regra 18). **`C-133` fica PARCIAL ALTA em qualquer dos denominadores** |
| **`DIV-COV4-03`** | **Inconsistência interna de `T-33` Bloco A:** declara *"25 células cobertas"* (`§4`), mas **a sua própria enumeração de células soma 35** (C-63…C-65, C-66…C-68, C-73…C-75, C-76…C-78, C-84…C-86 = 15; C-93…C-95, C-96…C-98, C-103…C-105, C-106…C-108, C-114…C-116 = 15; C-123, C-124, C-127, C-128, C-130 = 5) | `T-33` A §4, resumo × enumeração | **Adoto a ENUMERAÇÃO (35)** — mesma convenção que a Rodada 2 aplicou a `OBS-T26-08`/`-09`. Com 35 + 35 = **70**, a faixa fecha exatamente contra as 70 células da EMENDA-02. **Se prevalecer o "25", 10 células do Bloco A ficam sem titular** e o total de §3.6 cai de 85 para 75 |
| **`DIV-COV4-04`** | **Atribuição sobreposta das células D9 do tier 3 raso.** O Bloco A reivindica **5 células nominais** (C-123, C-124, C-127, C-128, C-130); o Bloco B reivindica **a faixa inteira C-123…C-132 (10)** | `T-33` A §4 × B §4 | **Leio a faixa de B como "as 5 do escopo de B"**, por coerência com a partição 23+20 endpoints. **Não produz vão** (as 10 têm titular), mas **viola a regra de "exatamente uma célula por titular"** de `AUDIT_PLAN.md:614-617` — a mesma classe de `uploadService.ts` na Rodada 1. **Registro, não concilio** |
| **`DIV-COV4-05`** | **`T-38`/`T-39` classificam `AUD-INTEG-03` e `FIND-ERP-001` como PRODUÇÃO REAL** por `APR-2026-031` D-13 item 1 (módulo dev que escreve sobre os 327 itens reais) — **enquanto a cobertura desses módulos permanece medida como dev**: `inventory`/`mobileInventory` estão nas faixas W2, e `T-31`/`T-35` declararam suas tabelas como "de módulos não-produção" **sem reler a lista tabela a tabela** (`T-38` §7.2 item 2) | `APR-2026-031` D-13.1 × `T-38` §7.2 | **Consequência de cobertura que escalo:** se alguma tabela de `T-31`/`T-35` pertencer a módulo de produção real, o ID migra de DEV para MISTO **e a prioridade de cobertura de `C-137` muda de banda**. **Não infiro** — a reconciliação tabela × módulo **não existe em nenhum artefato** |
| **`DIV-COV4-06`** | **Tensão aritmética entre `APR-2026-034` D2 e a lista nominal de `T-35`.** D2 estima **~40-50 tabelas** nas bandas dinheiro/estoque/fiscal/**dado pessoal** e coloca **SST e Jurídico na banda de exclusão declarada**. Mas a lista nominal traz **SST = 34** e **jurídico = 15** tabelas, e o conteúdo de `sst_asos`, `sst_exames_complementares`, `sst_acidentes`, `sst_cats` é **dado pessoal de saúde** | `APPROVALS.md:1705-1710` × `T-35:103,105` | **Não reinterpreto a decisão do dono e não a contradigo.** Registro que **a leitura estrita de "dado pessoal" faz a banda de cobertura integral saltar de ~49 para ~98-100 tabelas**, e que a diferença está inteira em `sst_*` e jurídico. ⚠ **A `APR-2026-034` D2 é a fonte; a determinação de qual leitura vale é do dono.** Enquanto não determinada, **a lista nominal do escopo "cobertura integral" não pode ser emitida** — e sem ela o critério de encerramento não é verificável |
| **`DIV-COV4-07`** | **Célula que a consolidação trata como movida e que este par NÃO confirma:** `C-05`/`C-06` (`sst` D3/D4) seguem declaradas `E 75/75` pela trilha titular, com **≈6 endpoints dos clusters-âncora de T-12 sem atribuição de profundidade** | `T-27 DEF-02B` × `T-12` | ⚠ **`OBS-T26-11` / `RES-T26-07` — INALTERADA, 3ª rodada consecutiva.** Se o director acolher a declaração da trilha sem resolver a assimetria, **`C-05`/`C-06` entram no relatório final com cobertura declarada acima da medida** |

---

## 10. RISCO RESIDUAL (condição G3-b) — atualização do registro obrigatório

| ID | Estado após a Rodada 4 |
|---|---|
| `RES-01` (nenhuma verificação dinâmica de segurança) | **INALTERADO — primeira ordem** |
| `RES-02` (vulnerabilidade transitiva) | **INALTERADO** — os 26 HIGH de `mobile`/`tv` seguem sem finding (`D-09`, 4ª rodada) |
| `RES-03` (fração OUT do tier 3 profundo) | **INALTERADO** — ≈83 endpoints em D4-D8; **lista nominal IN/OUT continua não publicada** (F-5) |
| `RES-04` (fração OUT das 167 páginas do `client/`) | ✅ **MATERIALMENTE REDUZIDO** — de ≈126 páginas para ≈10 unidades não atribuídas + 31 em leitura dirigida. ⚠ **`D-07` pendente** |
| `RES-05` (`tv/` + fração OUT de `mobile/`) | **PROPOSTA DE REBAIXAMENTO MANTIDA** (Rodada 2 §4.1), sem despacho |
| `RES-06` (D7 amostral) | ⚠ **AGRAVADO com medição nova:** `T-33` A §4 mediu cobertura de teste **por regra crítica** nos 5 módulos do Bloco A — *"existem suítes para os cinco módulos, e nenhuma cobre F01, F02, F03, F04, F05, F11 nem F12"*. **É o mesmo padrão que T-27 mediu em 4 módulos:** teste para tudo que o código faz, nada para o que o código deveria decidir e não decide |
| `RES-07` (D8 documentação amostral) | ⚠ **AGRAVADO** — `AUD-PROC-DOCDRIFT-01` teve **escopo corrigido para cima** por `T-34` e recebeu `RET01-A1`/`A2` (`ERP_SSOT.md:401` errado nos dois pontos; remissão órfã a "CLAUDE.md §7") |
| `RES-08` (D10 arquitetura amostral) | **INALTERADO** |
| `RES-09` (conteúdo de credencial não lido) | **INALTERADO** |
| `RES-10` (estado do banco real não observado) | **INALTERADO — e reafirmado como regime desta rodada**: `APR-2026-016` íntegra, zero conexão, nem para contar linhas |
| `RES-11` (toda a evidência dinâmica) | ⚠ **AGRAVADO** — ordem de grandeza **≈190** pedidos DYN contra ~103 catalogados. Incide integralmente sobre os 40 IDs de `T-33`, os 72 de `T-32`, os 11 de `T-35` e os 10 findings formais |
| `RES-12` (código posterior ao `AUDIT_COMMIT`) | **INALTERADO** — e com **duas ressalvas novas de custódia**: `RES-T31-01` (Bash indisponível) e `LIM-T37-01` (identidade de `server/` entre `HEAD` e o `AUDIT_COMMIT` a confirmar pelo evidence-controller) |
| `RES-13` (dispensa de IA não homologada) | ✅ **MAIS DEFENSÁVEL, AINDA PROVISÓRIO** — `T-33` B auditou `intelligentAuditor` em profundidade e o insumo de G5 agora existe (`T33-B-F07`, `F10`, `F14`, `F16`) |
| `RES-14` (auditar a própria regra de proteção de dado real) | **INALTERADO** — `AUD-PROC-CUSTODIA-01` validado por `T-30`; `CE-06` (log de conexões) tem artefato próprio (`G4_CE06_LOG_CONNECTIONS.md`), cuja janela foi confirmada concluída por `APR-2026-030`. **Mede-se o registro, não o fato** |
| **`RES-15`** *(NOVO)* | **A classificação de ambiente (`T-38`/`T-39`) foi propagada por MÓDULO, não por âncora**, e a extração item a item dos 66 IDs `MISTO` **não foi executada** (`T-38` §7.3). **Consequência de cobertura:** a matriz de exposição real que sustenta a fila de remediação **não tem, hoje, o mesmo grão da matriz de cobertura**. Prioridade de cobertura por banda de risco (`C-137`) e prioridade de remediação por exposição real **podem divergir sem que nada acuse** |
| **`RES-16`** *(NOVO)* | **`C-136` não se moveu em quatro rodadas.** A semântica profunda do contrato de 683 endpoints é a única célula da EMENDA-02 que **nenhuma trilha nova, em três levas de fieldwork, sequer tocou**. Registrado para que a sua estabilidade não seja lida como irrelevância |

---

## 11. DELTA EXPLÍCITO CONTRA `_RODADA2` — exigência do mandato

**O par vigente até hoje era `_RODADA2`. Não existe `_RODADA3`.** Este documento cobre **dois
corpora de uma vez** (`T-31`…`T-34` e `T-35`…`T-40`), e o delta é medido contra `_RODADA2`.

### 11.1 O que MUDOU DE ESTADO

| Objeto | `_RODADA2` | **Rodada 4** | Causa |
|---|---|---|---|
| **C-63…C-132** (70 células) | ❌ **0 de 70** | ✅ **70 de 70 (E estático)** | `T-33` A+B; validado por `T-34` |
| **C-133** | ❌ NÃO ENTREGUE — `A(41/167)` | ⚠ **PARCIAL ALTA — 157 unidades declaradas** | `T-32` × 6 |
| **C-137** | ❌ `A(22/207)` — déficit **185** | ❌ **`A(52/207)` — déficit 155** | `T-31` (+12), `T-35` (+18) |
| **Total das 137 células** | 15 E · 49 parciais · **73 não entregues** | **85 E · 50 parciais · 2 não entregues** | §3.6 |
| **Regra 22** | não medida nominalmente no par | **98/98, por contagem própria em dois sentidos** | §7 |
| **Corpus vigente** | 322 IDs à época | **446 vigentes** (9 C · 89 H · 227 M · 110 L · 11 I) | `T-26_R4` §2.5 + `APR-2026-031` D-11 |
| **`N-06`** | ⚠ EM VIGOR INTEGRALMENTE | ✅ **CAUSA MATERIAL EXTINTA — baixa proposta** | `T-33` |
| **`N-05`** | ⚠ EM VIGOR — 185/207 | ⚠ **EM VIGOR — 155/207** | `T-31`, `T-35` |
| **`N-07`** | ⚠ EM VIGOR — ≈126 páginas | ⚠ **EM VIGOR — ≈10 + 31 dirigidas** | `T-32` |
| **Conformidade "soft delete não existe"** | creditada implicitamente pelo corpus (`T-13:78`, `T-31:176`, `T-03:103`) | 🚫 **BLOQUEADA** — 34 tabelas com soft delete semântico; **3 com filtro ausente no caminho de escrita** | 2 retificações + `T-36` |
| **`RES-T26-06`** (`AUD-PROC-CUSTODIA-01` HIGH sem Regra 22) | ⚠ aberto — *"a run tem um finding em violação da própria Regra 22"* | ✅ **ENCERRADO** — `T-30` deu o veredito | `T-30` |
| **Ambiente do corpus** | inexistente como atributo | **446/446 classificados**; 40 produção real, 66 misto, 314 dev, 26 governança, 0 ambíguo | `T-38`, `T-39`, `APR-2026-031` D-13 |

### 11.2 O que ENTROU (e não existia no par anterior)

1. **Um critério de encerramento para `C-137`** (`APR-2026-034` D2) — cobertura por risco com
   **exclusão nominal**. **É critério, não cobertura** (§6.2).
2. **Um critério de fila por exposição real** e a fila emitida (`T-39`) — **não é cobertura**, mas
   condiciona a ordem em que a cobertura restante importa.
3. **10 findings formais promovidos por decisão humana**, com severidade fixada pelo dono:
   `AUD-COM-DESCONTO-01` (CRITICAL), `AUD-RH-CPFSEARCH-01` (HIGH), `AUD-TES-SALDOMANUAL-01` (HIGH,
   `AUDIT_IMPACT` rebaixado), `AUD-CTB-DEBCRED-01` (HIGH, **`D-01` aberta** — rebaixamento a MEDIUM
   recomendado por `T-34` e não decidido), `AUD-PROC-DOCDRIFT-01` (MEDIUM, escopo corrigido para
   cima), `AUD-RH-VTHORISTA-01` (CRITICAL), `AUD-EST-TRUNCCADEIA-01` (HIGH), `AUD-PAT-DEPRECIACAO-01`
   (MEDIUM), `AUD-RH-COMISSAO-01` (HIGH, `APR-2026-031` D-11), `AUD-ALOG-01` (CRITICAL item A /
   HIGH item B, produção real).
4. **Duas retificações que mudaram asserção anterior**, feitas **pelos autores de origem**, sem
   editar artefato histórico (§8).
5. **A lista nominal de 134 tabelas não cobertas de `C-137`** — o insumo que a condição vinculante
   de `APR-2026-034` D2 exige, **completo em 134 de 155**.

### 11.3 O que CONTINUA DESCOBERTO — sem minimização

| # | Lacuna | Número honesto |
|---|---|---|
| **1** | **`C-137` — semântica de coluna** | **155 de 207 tabelas (74,9 %)** — 134 nomeadas, **21 não nomeáveis**. **É a maior lacuna da run.** Bandas intocadas: SST 34, jurídico 15, RH 17, TI 10, facilities 13, marketing 6 |
| **2** | **`C-136` — contrato de API por dimensão** | **683 endpoints sem matriz por dimensão.** Zero movimento em 4 rodadas (`RES-16`) |
| **3** | **D4-D8 do tier 3 profundo** | **≈83 endpoints**, e **a lista nominal IN/OUT do REG-G3 passo 4 continua não publicada** |
| **4** | **D9 de tier 2 — 4 de 10 categorias ASVS** | **19 células parciais** (cripto, segredos, dependências, árvore de dev sem gate) |
| **5** | **Resíduos de `rh`/`sst`/`juridico` em D3/D4** | **≈13 + ≈6 + 1 = ≈20 endpoints**, todos em categoria vedada por G3 |
| **6** | **`C-133` — o que resta do `client/`** | **≈10 unidades não atribuídas + 31 lidas dirigidamente**, com denominador não reconciliado |
| **7** | **Toda a prova dinâmica** | **≈190 pedidos DYN** contra ~103 catalogados; ~21 executados. **G4 aberto** |
| **8** | **Fonte normativa de regra de negócio** | **2 regras decididas por código sem artefato que as fixe** + 4 candidatas a BR-ID (F-12) |

---

## 12. LIMITES DESTE AGENTE — sem atenuação

### 12.1 Consolidado por leitura própria nesta sessão

`AUDIT_COVERAGE_EXECUTED.md` (integral) e `AUDIT_COVERAGE_EXECUTED_RODADA2.md` (integral) — para
travar o formato e o estado anterior; `T-26_CONSOLIDACAO_RODADA4.md` (integral);
`T-26_CONSOLIDACAO_RODADA3.md` (dirigido: §6.1, §7, §9, §11); `T-38` (integral); `T-40` (integral);
`T-39` (§0-§2, dirigido); `T-31` (integral); `T-35` (§1-§3, §9-§11); `T-33` A e B (inventário,
cobertura declarada e encaminhamentos); `T-34` (os 3, seções de placar e veredito);
`T-32` (os 6, seções de inventário e cobertura declarada); `APPROVALS.md:1532-1728`
(`APR-2026-031`, `-032`, `-033`, `-034`); listagem própria de `07-findings/` e de `24-coverage/`.

**Toda a aritmética deste documento é minha e fecha:** 85 + 50 + 2 = 137; 23 + 20 = 43 endpoints;
35 + 35 = 70 células; 22 + 12 + 18 = 52 e 207 − 52 = 155; 134 + 21 = 155; 9 + 89 = 98 e
94 + 3 + 1 = 98; 4 + 10 + 5 + 79 = 98.

**Única medição de superfície que produzi:** `Glob client/src/pages/**/*.tsx` ⇒ **167 arquivos**
(§3.5.1). Declarada como medição própria, estática, sem leitura de conteúdo.

### 12.2 Aceito de relato **SEM reverificar**

1. **Nenhum arquivo do objeto auditado foi lido nesta sessão** — nem `server/src`, nem `client/src`
   (só a **listagem** de nomes de `client/src/pages`), nem `mobile/`, `tv/`, `server/database`,
   `server/migrations`, `docs/` ou `product/`. **Zero conteúdo do produto.**
2. **Toda declaração de cobertura das trilhas** — `E 23/23`, `E 20/20`, `E 12/12`, `18 Tier A`,
   `31/31`, `24/24`, `23/23`, `21/21`. **Não conferi um único endpoint contra o router nem uma
   única tabela contra o baseline.** Se uma trilha declarou `E` e cobriu menos, **este documento
   repete o erro dela** — exceto onde outra evidência do corpus a contradiz, que é exatamente o
   caso dos sete `DIV-COV4-*` de §9.
3. **Todos os vereditos de mérito** de `T-34`, `T-36`, `T-37`, `T-40` e das rodadas anteriores.
4. **Todas as contagens de corpus** (446 vigentes, 464 emitidos, 17 absorvidos, 1 `FALSE_POSITIVE`)
   e as classificações de ambiente de `T-38`/`T-39`.
5. **Toda a evidência de git e de banco.** Não uso Bash; **nenhuma afirmação própria de proveniência
   de commit** (`IN-08`).
6. **Os 34 nomes de tabela com soft delete semântico** e o placar `4 completos / 2 parciais /
   8 mudos` dos 14 call sites.

### 12.3 O que este recálculo **não** pode oferecer

- **A célula "entregue como E" é a declaração da trilha, não medição minha.** Não meço qualidade da
  leitura, só a sua extensão declarada. Uma trilha que tenha lido 20 endpoints superficialmente e
  declarado `E` produz aqui a mesma célula que uma que os tenha lido a fundo. **O contrapeso
  disponível é a validação adversarial** — que cobriu **7 de 40** IDs de `T-33`, **13 de 72** de
  `T-32`, **3 de 11** de `T-35` e **0 de 8** de `T-31`.
- **A reconciliação tabela × módulo** que `DIV-COV4-05` exige — não existe artefato que a sustente.
- **Os 21 nomes de tabela sem model** — `DIV-COV4-01` fica aberto por isso.
- **`D-07` e a leitura de "dado pessoal" de `APR-2026-034` D2** — decisões humanas (Regra 18).

---

## 13. Critério de conclusão desta trilha — autoavaliação

| Critério do mandato | Estado |
|---|---|
| Matriz atualizada, no formato dos pares anteriores | ✅ §3, mesma taxonomia (`E` / `A(n/N)` / `R` / `N(motivo)` / `DYN-PEND`), mesmo regime DE → PARA |
| Trilhas novas verificadas por conta própria, não pela lista do mandato | ✅ §1 — **10 trilhas existem, `T-41` INEXISTE**, declarado como ausência de evidência |
| Células movidas ou fechadas registradas | ✅ §3.4 (C-63…C-132), §3.5 (C-133, C-137), §3.5.1 |
| `C-137` com o número correto | ✅ **52/207, déficit 155** — nunca 34, nunca minimizado (§6.1) |
| 10 findings formais refletidos | ✅ §11.2 item 3, com severidade fixada pelo dono **intocada** |
| Retificações absorvidas; conformidade de soft delete não creditada | ✅ §8, com a forma admissível transcrita e aplicada |
| Regra 22 confirmada por contagem própria | ✅ §7 — **98/98**, por dois caminhos aritméticos independentes |
| Delta explícito contra `_RODADA2` | ✅ §11 (mudou / entrou / continua descoberto) |
| Lacunas remanescentes nomeadas, com número honesto | ✅ §11.3 — 8 itens, `C-137` em primeiro lugar |
| `APR-2026-034` D2 declarado como **critério**, não como cobertura | ✅ §6.2, com a condição vinculante e o seu obstáculo medido (`DIV-COV4-01`) |
| Divergência registrada onde a evidência não sustenta a consolidação | ✅ §9 — **7 divergências**, nenhuma conciliada |
| Nenhuma célula em branco | ✅ **137/137 com valor atribuído**: `E`, parcial com número, ou não entregue com motivo |
| 100 % estático, zero conexão com `erp_evok_audio` | ✅ Nenhuma conexão, nenhum `SELECT`, nenhum comando — `APR-2026-016` íntegra |
| Escrita restrita a `24-coverage/` | ✅ Única escrita: este arquivo |
| Nenhum `AUDIT_PASSED`, `FINDING CLOSED`, severidade alterada | ✅ Nenhum declarado, nenhuma alterada (Regras 3, 4, 18) |
| Nenhum finding novo, nenhum ID inventado | ✅ Regra 6. As 7 divergências `DIV-COV4-*` e os 2 riscos `RES-15`/`RES-16` são **registros**, não findings |

**Estado da trilha:
`PAR DE COBERTURA RECONCILIADO ATÉ T-40 — COBERTURA RECALCULADA, DÉFICIT DE G3 MEDIDO, 7 DIVERGÊNCIAS ESCALADAS.`**

**Efeito sobre `OBS-T26-33` (par dois corpora atrás):** a ressalva **deixa de ter objeto quanto ao
atraso** — o par agora mede o mesmo corpus da consolidação Rodada 4, mais `T-38`, `T-39` e `T-40`.
**Ela NÃO é declarada fechada por mim** (Regra 4, e o registro é do consolidador/director).
**Permanecem como condição de qualquer veredito final:** `D-07`, `D-01`, `D-R1`/`D-R2`/`D-R3`,
`DIV-COV4-01`, `DIV-COV4-06` e `DIV-COV4-07`.

**Entrega:** ao `vericore-audit-consolidator` (par de `T-26_CONSOLIDACAO_RODADA4.md`) e ao
`vericore-audit-reporting-agent`, que fica **vinculado** ao bloqueio normativo de §8, ao número
`155/207` de `C-137` (§6.1) e à leitura de `APR-2026-034` D2 **como critério, não como cobertura**
(§6.2). **Escalonamentos ao `vericore-software-audit-director`:** §9 (7 divergências), §4 (F-5 e
F-12), §5 (baixa de `N-06` e de `N-08`), §10 (`RES-15`, `RES-16`).

**Nenhum arquivo do objeto auditado foi criado, alterado ou corrigido (Regra 2). Nenhuma evidência
histórica de outra organização foi tocada (Regra 15) — `AUDIT_COVERAGE_EXECUTED.md` e
`AUDIT_COVERAGE_EXECUTED_RODADA2.md` permanecem íntegros. Nenhuma regra de negócio, requisito ou
aprovação foi inventada (Regra 6). Nenhum OWNER foi decidido, sugerido ou inferido (G9).**
