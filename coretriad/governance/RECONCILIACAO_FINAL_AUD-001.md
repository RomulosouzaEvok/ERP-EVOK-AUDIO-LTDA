# RECONCILIAÇÃO FINAL — `ERP-LEGACY-001-AUD-001`

```
PROGRAMA:      ERP-LEGACY-001
RUN:           ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f   (única referência de leitura)
PRODUZIDO POR: coretriad-director (CoreTriad Control Plane)
DATA:          2026-08-17
NATUREZA:      ato de orquestração. Resolve por ENUMERAÇÃO a pendência aritmética escalada
               ao director (OBS-T38-02 / T-39 §6.1), despacha as divergências escaladas pelo
               par de cobertura Rodada 4 (§9, §4, §5, §10) e publica a lista exaustiva do que
               ainda impede a emissão dos relatórios finais.
REGIME:        read-only sobre audit/, remediation/ e sobre o objeto auditado.
               Zero comando, zero execução, zero conexão de banco (APR-2026-016 íntegra).
ESCRITA:       exclusivamente coretriad/governance/. Este arquivo é a única escrita.
NÃO DECLARA:   AUDIT_PASSED, FINDINGS_CONFIRMED, RETEST_PASSED, FINDING CLOSED,
               REMEDIATION COMPLETE (Regras 4 e 5). NÃO altera severidade de nenhum finding
               (Regra 18). NÃO edita nenhum artefato de VeriCore ou SanaCore (Regras 15/16).
               NÃO decide nenhum gate humano — os gates estão LISTADOS, não decididos.
```

> **Regra de método deste documento.** Onde há número, ele foi **recontado aqui**, célula a
> célula, a partir do artefato citado. Onde não pude recontar, está escrito que não pude, e o
> item vai para despacho — nunca para arredondamento. **Artefato vence despacho (Regra 7);
> enumeração vence resumo; divergência se registra, não se acomoda (Regra 20).**

---

# BLOCO 1 — A RECONCILIAÇÃO ±2 DA RODADA 1

## 1.1 O que estava escalado

`OBS-T38-02` (`T-38` §3) e `T-39` §6.1 registram que **as colunas HIGH/MEDIUM da §1.3 de
`T-26_CONSOLIDACAO.md` (Rodada 1) não fecham contra a §1.2 por ±2**, e `T-39` declara a
consequência: o **estrato 4 da fila de remediação saiu incompleto** — 22 IDs nominais + 57 por
ponteiro — *"publicar lista declarada completa sobre base que não fecha seria fabricar
completude"*, com **"desbloqueio: reconciliação do ±2 pelo director"**.

`T-38` já havia medido a diferença (HIGH 65 × 67; MEDIUM 120 × 118) e registrado que **não a
resolvia**. O que faltava — e é o que este bloco entrega — é **onde** ela nasce, **qual** coluna
está errada, **por quê**, e **qual é o número correto**.

## 1.2 Recontagem própria da §1.3 da Rodada 1 — coluna a coluna

Somei as 26 linhas da tabela §1.3 de `T-26_CONSOLIDACAO.md` (linhas 55-81), sem exceção:

| Trilha | Total | CRIT | HIGH | MED | LOW | INFO |
|---|---|---|---|---|---|---|
| T-01 | 11 | 0 | 2 | 4 | 4 | 1 |
| T-02 | 13 | 1 | 2 | 5 | 4 | 1 |
| T-03 | 11 | 0 | 3 | 6 | 2 | 0 |
| T-04 | 7 | 0 | 1 | 1 | 5 | 0 |
| T-05 | 13 | 0 | 6 | 5 | 2 | 0 |
| T-06 | 9 | 1 | 3 | 3 | 2 | 0 |
| T-07 | 10 | 0 | 3 | 5 | 2 | 0 |
| T-08 | 20 | 1 | 6 | 7 | 5 | 1 |
| T-09 | 6 | 0 | 0 | 3 | 3 | 0 |
| T-10 | 9 | 0 | 2 | 4 | 2 | 1 |
| T-11 | 10 | 0 | 4 | 5 | 0 | 0 |
| T-12 | 18 | 0 | 4 | 9 | 5 | 0 |
| **T-13** | 12 | 0 | **2** (era 4) ⇩ | **9** (era 7) | 1 | 0 |
| T-14 | 9 | 0 | 2 | 4 | 2 | 1 |
| T-15 | 10 | 0 | 4 | 4 | 2 | 0 |
| T-16 | 15 | 0 | 1 | 6 | 8 | 0 |
| T-17 | 9 | 0 | 3 | 5 | 1 | 0 |
| T-18 | 14 | 0 | 4 | 6 | 4 | 0 |
| T-18-A | 11 | 0 | 1 | 10 | 0 | 0 |
| T-19 | 11 | 0 | 3 | 7 | 1 | 0 |
| T-20 | 4 | 0 | 0 | 4 | 0 | 0 |
| T-21 | 1 | 0 | 0 | 1 | 0 | 0 |
| T-22 | 5 | 0 | 2 | 3 | 0 | 0 |
| T-23 | 5 | 0 | 2 | 2 | 1 | 0 |
| T-24 | 4 | 1 | 1 | 1 | 1 | 0 |
| Preliminares | 7 | 2 | 4 | 1 | 0 | 0 |
| **SOMA RECONTADA** | **254** | **6** | **65** | **120** | **57** | **5** |

**Três conferências que a soma tem de passar, e passa:**

1. **Soma dos totais por trilha = 254** — idêntica ao total de IDs emitidos da §1.1
   (247 de trilha + 7 preliminares). Nenhum ID está fora da tabela, nenhum está duas vezes.
2. **Soma das cinco colunas de severidade = 253** (6+65+120+57+5), que é exatamente
   **254 − 1 `FALSE_POSITIVE`** (`T11-F10`). A linha T-11 fecha o total em 10 e as severidades
   em 9 justamente porque o FP não tem coluna de severidade. **Não há ID perdido.**
3. **Cada linha fecha internamente** (severidades = total da linha), com a única exceção
   declarada de T-11 (o FP), verificada acima.

**Portanto: CRITICAL 6 ✔ · LOW 57 ✔ · INFO 5 ✔ coincidem com a §1.2; HIGH e MEDIUM não.**

## 1.3 (a) ONDE está a diferença — a linha é uma só

A diferença **não está espalhada**: é **HIGH −2 e MEDIUM +2**, isto é, uma **transferência de
exatamente 2 IDs de HIGH para MEDIUM**, e não IDs faltando ou sobrando (o total 253/254 fecha
nos dois lados). Os 2 IDs são identificáveis por enumeração e estão **na linha T-13**:

- **`T13-F01`** — FKs de `production_orders` (`CASCADE`/`SET NULL`): **HIGH → MEDIUM**;
- **`T13-F04`** — `accounts_receivable` sem chave de negócio de parcela: **HIGH → MEDIUM**.

O rebaixamento dos dois é **decisão registrada da própria Rodada 1**, em `T-26_CONSOLIDACAO.md`
**§3.2** (*"Minha decisão: ACOLHO o rebaixamento nos dois casos"*), com fundamento item a item.
A §1.3 **aplicou** a decisão — a linha T-13 traz a marca explícita **`2 (era 4) ⇩`** e
**`9 (era 7)`**. A §1.2 **não aplicou**.

## 1.4 (b) QUAL coluna está errada, e por quê — determinado, não arbitrado

**Está errada a §1.2, nas colunas HIGH e MEDIUM.** Quatro provas convergentes, todas internas ao
próprio artefato:

1. **A §1.2 se autodeclara "após as decisões de §3"** e contradiz a §3.2, que é uma das decisões
   de §3. Um agregado que contradiz a decisão que afirma incorporar é o agregado errado — não a
   decisão.
2. **A §1.2 parou no estágio §3.1.** O texto de §3.1 diz, literalmente: *"o total de HIGH
   vigentes cai de 68 para 67"*. **67 é o número pós-§3.1 e pré-§3.2.** A §1.2 congelou o placar
   nesse ponto intermediário e não foi reprocessada depois de §3.2.
3. **A composição declarada da §1.2 fecha a identificação.** Ela decompõe HIGH em
   *"4 preliminares + 63 de trilha"*; a enumeração dá **61 de trilha** (65 − 4 preliminares).
   A diferença é **exatamente 2**, e são os dois de T-13. Em MEDIUM ela decompõe
   *"1 preliminar + 117 de trilha"*; a enumeração dá **119 de trilha**. **Mesmos 2 IDs, sinal
   invertido.** Não sobra resíduo, não há terceiro candidato.
4. **A §1.3 é auditável e a §1.2 não.** A §1.3 exibe as parcelas e as marcas de decisão (⇧/⇩);
   a §1.2 exibe só o agregado. Precedente vinculante da própria run: `OBS-T26-19` foi resolvida
   pela Rodada 4 §2.1 **reabrindo a enumeração** contra o resumo (7 `DUPLICATE`, não 6), e
   `OBS-T26-04` foi resolvida na Rodada 1 adotando **a enumeração por ID** contra o resumo de
   T-08. **A mesma técnica, aplicada aqui, dá o mesmo tipo de resposta.**

**Não é alteração de severidade (Regra 18 preservada).** A severidade de `T13-F01` e `T13-F04` foi
alterada em 2026-08-16 pelo `vericore-audit-consolidator`, no exercício da sua autoridade,
registrada em §3.2 com fundamento. O que este documento faz é constatar que **um agregado deixou
de refletir uma decisão já tomada**. É erro de agregação, não de mérito.

## 1.5 (c) O NÚMERO CORRETO — e a sua propagação, que é o que realmente importa

### 1.5.1 Rodada 1

| Severidade | §1.2 declara | **CORRETO (enumeração §1.3)** |
|---|---|---|
| CRITICAL | 6 | **6** (inalterado) |
| **HIGH** | 67 | **65** |
| **MEDIUM** | 118 | **120** |
| LOW | 57 | **57** (inalterado) |
| INFO | 5 | **5** (inalterado) |
| **VIGENTES** | 253 | **253** (inalterado) |

Composição corrigida: **HIGH = 4 preliminares + 61 de trilha**; **MEDIUM = 1 preliminar + 119 de
trilha**. Conferência: 6 + 65 + 120 + 57 + 5 = **253**; +1 `FALSE_POSITIVE` = **254 IDs**. Fecha.

### 1.5.2 A cadeia — o erro foi herdado por três rodadas, por citação direta

Verifiquei, por leitura, que cada rodada tomou a coluna da anterior como base:

- `T-26_CONSOLIDACAO_RODADA2.md` §2.2 abre com **"HIGH | 67 | 74"** e **"MEDIUM | 118 | 155"** —
  herdou a §1.2, não a §1.3;
- `T-26_CONSOLIDACAO_RODADA3.md` abre com **"HIGH | 74 | 87"** e **"MEDIUM | 155 | 223"**;
- `T-26_CONSOLIDACAO_RODADA4.md` §2.1/§2.5 parte de 87/223 → 87/219 (após −7 `DUPLICATE` R1,
  todos MEDIUM/LOW) → **88/227**;
- `T-39` §1.3 aplica D-11 (`AUD-RH-COMISSAO-01` HIGH) → **89/227**.

**Nenhum dos deltas de rodada está errado** — todos os +/− são verificáveis e fecham. O que se
propaga é **a base**. Série corrigida, com os mesmos deltas:

| Placar | HIGH declarado | **HIGH correto** | MEDIUM declarado | **MEDIUM correto** | Conferência do total |
|---|---|---|---|---|---|
| Rodada 1 | 67 | **65** | 118 | **120** | 6+65+120+57+5 = **253** ✔ |
| Rodada 2 | 74 | **72** | 155 | **157** | 6+72+157+77+10 = **322** ✔ |
| Rodada 3 (declarado) | 87 | **85** | 223 | **225** | 7+85+225+112+11 = **440** ✔ |
| Rodada 3 (reapresentado, −7 dup R1) | 87 | **85** | 219 | **221** | 7+85+221+109+11 = **433** ✔ |
| **Rodada 4 (produto)** | 88 | **86** | 227 | **229** | 9+86+229+110+11+1 = **446** ✔ |
| **T-39 (pós D-11)** | 89 | **87** | 227 | **229** | 9+87+229+110+11 = **446** ✔ |

**O total vigente de 446 não muda em nenhuma linha.** Nenhum finding entra, sai, muda de
enunciado, de âncora, de autoria ou de mérito. **Muda a distribuição entre duas colunas, e só.**

### 1.5.3 Consequências numéricas nomeadas

| Objeto | Publicado | **Corrigido** | Efeito |
|---|---|---|---|
| **Estrato 4 da fila** (`T-39` §2.4) — HIGH · dev/homologação | **79** = 89 − 10 | **77** = 87 − 10 | 22 nominais + **55** por ponteiro (era 57) |
| **Universo da Regra 22** (`R4 §7`, par de cobertura §7) | **98** = 9 + 89 | **96** = 9 + 87 | ver §1.5.4 |
| **Conferência da fila** (`T-39` §2.5) | 4+10+5+79 = 98; 98+227+110+11 = 446 | **4+10+5+77 = 96; 96+229+110+11 = 446** | fecha nos dois sentidos |
| **Regra 22 na Rodada 2** (§2.4: "6 CRITICAL + 74 HIGH = 80 sob o regime") | 80 | **78** | histórico, sem efeito hoje |
| Estrato 1 (4), estrato 2 (10), estrato 3 (5) | — | **inalterados** | foram **enumerados por ID**, não por coluna |
| CRITICAL, LOW, INFO, total 446, 464 emitidos, 17 absorvidos, 1 FP | — | **inalterados** | nenhum toca HIGH/MEDIUM |

### 1.5.4 Efeito sobre a declaração "Regra 22 — 98/98, sem exceções"

O universo cai para **96**. A conclusão **qualitativa não cai**, e é importante dizer por quê:
`T13-F01` e `T13-F04` **têm veredito adversarial registrado** (`CONFIRMED` na Rodada 3-C, com
recomendação de rebaixamento que a §3.2 acolheu). Eles saem **dos dois lados** da conta — do
universo e dos "com veredito". **Não se cria exceção nova à Regra 22 por esta reconciliação.**

Registro, porém, uma ressalva de método que o par de cobertura não poderia ter visto: a §7 do par
declara **"duas aritméticas por caminhos diferentes fecham em 98"** (9+89 e 4+10+5+79). As duas
partem **do mesmo insumo** (HIGH = 89) — são dois arranjos da mesma parcela, não duas medições
independentes. **A independência declarada não existe.** Fica registrado como `DIR-DIV-04` (§4).

## 1.6 (d) Indeterminável? Não — e o motivo importa

**A hipótese (d) do mandato está afastada.** O ±2 é **plenamente determinável e determinado**,
porque a §1.3 publica as parcelas, as parcelas somam 254 contra o total independente da §1.1, e a
diferença é rastreável a **dois IDs nominais** cuja mudança de severidade está registrada por
escrito na mesma seção do mesmo documento, com marca visual na própria linha. Não há arbitragem,
não há voto, não há autoridade de documento mais recente: há **contagem**.

**Consequência direta e imediata: o estrato 4 está DESBLOQUEADO.** O fundamento declarado em
`T-39` §6.1 para não enumerar (*"base que não fecha"*) **deixa de existir**: a base fecha, e fecha
em **77**. O que resta para a enumeração integral do estrato 4 **não é aritmético**, é trabalho de
listagem — e está nomeado em §3(c) item c3, com titular.

## 1.7 Correção de citação — registrada, porque o rastro tem de ficar certo

`T-39` §2.4 e §6.1 citam o defeito como **"`OBS-T38-02`/`OBS-T26-04`"**. **`OBS-T26-04` não é a
mesma classe e não é fonte deste ±2.** `OBS-T26-04` (`T-26_CONSOLIDACAO.md:831`) é a discrepância
**interna de T-08** entre o resumo da trilha ("4 LOW, 2 INFO") e a sua enumeração ("5 LOW, 1
INFO") — afeta **LOW/INFO**, **não** HIGH/MEDIUM, tem **soma zero** (o total 20 fecha), e **já foi
resolvida** na Rodada 1, que adotou a enumeração (a linha T-08 da §1.3 traz 5 LOW e 1 INFO, e
minha recontagem confirma que é essa a que fecha em 57 LOW e 5 INFO).

**Efeito prático:** a segunda metade do fundamento de bloqueio do estrato 4 **nunca teve objeto**.
Registrado em §4 como `DIR-DIV-02`.

## 1.8 Quem emite a errata — eu determino, não edito

O placar é artefato de **VeriCore** (`audit/`). **Não o edito** (Regras 15 e 16). Este documento é
a **determinação**; a **errata** cabe ao `vericore-audit-consolidator`, por adenda DE → PARA, sem
reescrever nenhuma rodada — exatamente a forma que ele já usou para `OBS-T26-19` e `OBS-T26-29`.
Despacho nominal em §5.

---

# BLOCO 2 — AS DIVERGÊNCIAS ESCALADAS PELO PAR DE COBERTURA RODADA 4

Ordem: as **três declaradas condição de veredito final** primeiro (§13 do par), depois as demais,
depois §4 (F-5, F-12), §5 (`N-06`, `N-08`) e §10 (`RES-15`, `RES-16`).

## 2.1 `DIV-COV4-01` — a exclusão nominal de `APR-2026-034` D2 e as 21 tabelas sem model ⛔ BLOQUEANTE

**O que afirma.** A condição vinculante de `APR-2026-034` D2 (*"a exclusão precisa constar
nominalmente — a lista das tabelas não cobertas, não uma frase genérica de escopo"*) seria **hoje
insatisfazível para 21 das 155 tabelas**, porque `T-35` §3 entregou **134 nomeadas + 21 sem model
algum, "não nomeáveis por esta trilha"** (`RES-T35-02`, `T35-META-F01`).

**O que os artefatos sustentam.** Sustentam a **falta**, não a **impossibilidade** — e a distinção
decide o caso:

1. O denominador **207 não é herdado: foi reconstruído por `T-31` §2** (200 do baseline + 7 das
   migrations pós-freeze), e o par o registra assim (§6.1, "reconstruído por `T-31` §2").
2. Essa reconstrução é **nominal, não cardinal**: `T-31` só pôde apanhar o erro-por-1 da regex
   ingênua porque identificou **o identificador específico** `CREATE TABLE public."SequelizeMeta"`
   (par §2.1). **Uma enumeração que distingue um nome produz todos os nomes.**
3. Logo as 155 são obteníveis por **diferença de conjuntos** entre a lista que produziu 207 e as
   52 cobertas — **estaticamente, sobre `00_baseline_frozen.sql` + as migrations pós-freeze**,
   sem uma linha de SQL executada e sem tocar o banco (`APR-2026-016` intocada).

O que `T-35` declarou foi honesto e continua verdadeiro **no seu escopo**: *"não nomeáveis **por
esta trilha**"* — a trilha partiu dos `tableName` dos models, e tabela sem model não aparece nessa
partida. **Isso é limite de método da trilha, não propriedade do artefato.**

**RESOLUÇÃO POR EVIDÊNCIA (director).** A condição vinculante de `APR-2026-034` D2 é
**SATISFAZÍVEL**. O que falta é **execução de uma varredura estática**, não decisão humana e não
reinterpretação da aprovação do dono. **`DIV-COV4-01` deixa de ser obstáculo de possibilidade e
passa a ser item de trabalho técnico**, listado em §3(c) item c4.

**Encaminhamento nomeado:** `vericore-software-audit-director` → titular de `C-137` (autor de
`T-35`), como **anexo do lote 3**, entregável único: *lista nominal das 155 tabelas não cobertas
(134 já publicadas + as 21 obtidas por diferença de conjuntos sobre `00_baseline_frozen.sql` e as
migrations pós-freeze)*, com o método e as suas limitações declarados. Custo declarado pelo próprio
par: **1 varredura**. **Enquanto a lista não existir, a exclusão declarada de D2 não pode ser
emitida** — isso permanece verdadeiro e permanece bloqueante para o encerramento de `C-137`.

## 2.2 `DIV-COV4-06` — "dado pessoal" em `APR-2026-034` D2 × SST e Jurídico ⛔ BLOQUEANTE

**O que afirma.** `APR-2026-034` D2 manda cobrir integralmente as bandas **dinheiro, estoque,
fiscal e dado pessoal** (estimadas em ~40-50 tabelas) e coloca **SST e Jurídico na banda de
exclusão declarada** — mas a lista nominal de `T-35` traz **SST = 34** e **jurídico = 15** tabelas,
e o conteúdo de `sst_asos`, `sst_exames_complementares`, `sst_acidentes`, `sst_cats` **é dado
pessoal de saúde**. Leitura estrita faz a banda de cobertura integral saltar de ~49 para ~98-100
tabelas.

**O que os artefatos sustentam.** Sustentam **os dois lados**, e é por isso que não se resolve por
evidência:

- o **texto** da decisão nomeia SST e Jurídico na banda de exclusão — e o texto é a fonte
  (Regra 7, `APPROVALS.md:1705-1710`);
- o **fundamento** aceito pelo dono é o retorno marginal baixo medido por `T-35` (~1,3 coluna opaca
  por tabela, uniforme) — fundamento de **custo**, não de natureza do dado;
- e o **corpus** mostra que parte dessas tabelas cai, por conteúdo, dentro da banda que a mesma
  decisão manda cobrir integralmente.

A tensão é **interna à decisão do dono**: uma banda nomeada para exclusão contém dado de uma banda
nomeada para inclusão. **Nenhum agente pode desempatar isso** — Regra 18, e a Regra 6 proíbe
inventar o critério que falta.

**ENCAMINHAMENTO — GATE HUMANO. Não decido, listo.** Pergunta em forma decidível, para
`APPROVALS.md`:

> As tabelas `sst_*` (34) e as do jurídico (15), cujo conteúdo inclui dado pessoal — inclusive de
> **saúde** (`sst_asos`, `sst_exames_complementares`, `sst_acidentes`, `sst_cats`) —
> (**A**) entram na banda de **cobertura integral** de `APR-2026-034` D2, levando o escopo do
> lote de ~49 para **~98-100 tabelas**; ou
> (**B**) permanecem na **exclusão declarada**, e a exclusão nominal registrará por escrito que
> **inclui tabelas de dado pessoal de saúde**; ou
> (**C**) desdobramento intermediário nomeado pelo dono (p.ex.: integral só nas 4 tabelas de saúde
> citadas, exclusão declarada no restante).

Enquanto não decidido, **a lista nominal do escopo "cobertura integral" não pode ser emitida, o
lote 3 opera com escopo indefinido na fronteira, e o critério de encerramento de `C-137` não é
verificável.** Registro factual, sem decidir: a opção (B) tem consequência de LGPD que deve
constar expressamente da ata, porque exclusão declarada de dado sensível é aceitação de risco
sobre categoria especial.

## 2.3 `DIV-COV4-07` — `C-05`/`C-06` (`sst` D3/D4): `E 75/75` declarado × ≈6 sem atribuição ⛔ BLOQUEANTE

**O que afirma.** A trilha titular declara `E 75/75`; o par **não confirma**, porque **≈6
endpoints dos clusters-âncora de `T-12` seguem sem atribuição de profundidade**
(`OBS-T26-11`/`RES-T26-07`, **3ª rodada consecutiva**). O par adverte: se o director acolher a
declaração da trilha sem resolver a assimetria, **`C-05`/`C-06` entram no relatório final com
cobertura declarada acima da medida**.

**O que os artefatos sustentam.** Sustentam a **assimetria**, não o mérito de nenhum dos lados:
`T-27 DEF-02B` declara 75/75 e não publica a lista nominal; `T-12` reivindica clusters-âncora que
contêm ≈6 endpoints não atribuídos; **nenhum artefato cruza as duas listas**. É a mesma classe do
`DEF-02` que originou a própria `T-27` — déficit em categoria que a condição de G3 **veda
amostrar** (dado pessoal sensível, obrigação legal com prazo).

**RESOLUÇÃO — a parte que é minha, resolvida agora.** O que estava em aberto era **processual**:
se o control plane acolhe a declaração da trilha. **Não acolho.** Determinação:

> **`C-05`/`C-06` seguem registradas no control plane como `E 75/75 DECLARADA, NÃO CONFIRMADA
> PELO PAR — ≈6 endpoints sem atribuição de profundidade`.** É esta a forma que entra em qualquer
> relatório de status do programa. **A declaração da trilha não é convertida em cobertura por
> despacho meu, e a divergência viaja junto do número.**

**A parte que não é minha** — dizer se os ≈6 estão ou não cobertos — é **fática e barata**:
cruzar a lista nominal dos 75 endpoints de `sst` de `T-27 DEF-02B` com a lista dos clusters-âncora
de `T-12`. **Encaminhamento nomeado:** `vericore-software-audit-director` → titular de `T-27
DEF-02B`, com co-leitura de `T-12`; entregável: *lista nominal dos 75, marcando os ≈6 como
COBERTO ou NÃO COBERTO, com âncora*. Estaticamente fechável. Enquanto não existir, `RES-T26-07`
permanece **aberta** e nomeada no relatório final.

## 2.4 `DIV-COV4-02` — denominador de `C-133` (167 × ≈121 × 157)

**O que afirma.** Três denominadores candidatos, sem reconciliação: **167** arquivos `.tsx`
(medição própria do par), **≈121** páginas roteadas (`D-07`), **157** unidades declaradas lidas
pelos 6 blocos de `T-32`, em unidades de contagem heterogêneas.

**O que os artefatos sustentam.** O par mediu e **resolveu a metade técnica**: o "167 páginas" do
plano **é**, de fato, a contagem de arquivos `.tsx` sob `client/src/pages/`. Logo, pelo artefato
(Regra 7), **o denominador vigente do plano é 167** — quem quiser outro tem de **emendar o plano**,
não reinterpretá-lo. E o par registra o que decide o efeito prático: **`C-133` fica PARCIAL ALTA em
qualquer dos três denominadores.**

**RESOLUÇÃO (director), na parte de control plane:** a célula é reportada contra **167** (o
denominador do plano), como **`A(157/167)`, com 31 unidades em leitura dirigida e ≈10 sem
atribuição nominal** — que é exatamente o que o par publicou. **`D-07` permanece aberta**, mas o
seu objeto muda: deixa de ser "qual número usar para reportar" e passa a ser **"emendar ou não o
denominador normativo do plano para ≈121 páginas roteadas"**. Não decido a emenda (Regra 18).

**Registro de posição, e do seu limite:** do lado do control plane, `D-07` **não impede a emissão
dos relatórios finais** — impede apenas declarar `C-133` **fechada**, que ninguém propõe. O par
lista `D-07` entre as condições de veredito final; **essa qualificação é de VeriCore e eu não a
revogo** — fica como divergência de âmbito para o `vericore-software-audit-director` despachar
junto ao `vericore-audit-reporting-agent` (§4, `DIR-DIV-07`).

## 2.5 `DIV-COV4-03` — `T-33` Bloco A: "25 células" × enumeração de 35

**O que afirma.** Inconsistência interna: o resumo diz 25, a enumeração das células soma 35. O par
adotou a **enumeração (35)**, com o que 35 + 35 = **70** fecha exatamente contra as 70 células da
EMENDA-02; se prevalecer o "25", **10 células do Bloco A ficam sem titular** e o total de §3.6 cai
de 85 para 75.

**O que os artefatos sustentam.** A enumeração. É a **mesma regra de decisão** aplicada por esta
run em `OBS-T26-04` (T-08), em `OBS-T26-08`/`-09`, em `OBS-T26-19`/`OBS-T26-29` (7 `DUPLICATE`,
não 6) e — agora — no Bloco 1 deste documento. **Enumeração vence resumo, sempre, e nesta run isso
já é jurisprudência, não preferência.**

**RESOLUÇÃO POR EVIDÊNCIA:** adoto **35**, pelo mesmo fundamento, e acrescento a prova externa que
o par tem e o resumo não: a superfície do Bloco A foi **recontada por leitura própria das rotas**
(23 endpoints, contra "~26" do encargo), e a partição 23 + 20 = **43 endpoints** é independente,
nominal e fecha. Contra a métrica que a EMENDA-02 fixa — **70 células** —, **35 + 35 é a única
leitura que a satisfaz sem deixar célula órfã**; "25 + 35" deixaria 10 sem titular. **Errata
formal cabe ao autor de `T-33` Bloco A / `vericore-audit-consolidator`** (despacho em §5).

**E resolvo, aqui, a ressalva 3 de §5.1 do par — que estava endereçada a mim.** O par declarou:
*"o mapeamento célula → módulo do Bloco A é declaradamente INFERIDO de
`AUDIT_PLAN_EMENDA_02.md:199-201`. **Se o control plane tiver mapeamento nominal divergente,
prevalece o dele**"*. **Verifiquei o control plane inteiro por busca nesta sessão: `coretriad/`
NÃO contém nenhum mapeamento nominal célula → módulo para `C-63`…`C-132`** (as únicas ocorrências
de `C-63`/`C-123`/`C-132` em `coretriad/` são citações de `APR-2026-024` a texto do par).
**Determinação: não existe mapeamento divergente do control plane.** A inferência da trilha
**não é contraditada**, a atribuição das 35 células do Bloco A **não precisa ser refeita**, e a
ressalva 3 fica **respondida** — permanecendo, como o par pediu, **declarada como inferência**,
não convertida em fato.

## 2.6 `DIV-COV4-04` — atribuição sobreposta das células D9 do tier 3 raso

**O que afirma.** Bloco A reivindica 5 células nominais (`C-123`, `C-124`, `C-127`, `C-128`,
`C-130`); Bloco B reivindica a faixa inteira `C-123…C-132` (10). Sem vão, mas com violação da
regra "exatamente um titular por célula" (`AUDIT_PLAN.md:614-617`).

**O que os artefatos sustentam.** A partição por **endpoint** é nominal, exaustiva e fecha
(23 + 20 = 43, com os 10 módulos nomeados um a um). A reivindicação de faixa do Bloco B é
**genérica**; a do Bloco A é **nominal**. Nominal vence genérico pela mesma regra que enumeração
vence resumo.

**RESOLUÇÃO POR EVIDÊNCIA:** confirmo a leitura do par — **Bloco B titula as 5 células D9 do seu
próprio recorte de 20 endpoints**; Bloco A titula as 5 que nomeou. **Nenhuma célula fica órfã,
nenhuma fica com dois titulares.** A violação formal fica registrada como **higiene de plano**
(não bloqueia nada, não muda placar) e é anotada para a emenda do `AUDIT_PLAN` na próxima run.

## 2.7 `DIV-COV4-05` — classificação de ambiente × cobertura de `C-137`

**O que afirma.** `T-38`/`T-39` classificam `AUD-INTEG-03` e `FIND-ERP-001` como **PRODUÇÃO REAL**
(por `APR-2026-031` D-13 item 1: módulo dev que escreve sobre os 327 itens reais), **enquanto a
cobertura desses módulos permanece medida como dev**, e `T-31`/`T-35` declararam as suas tabelas
como "de módulos não-produção" **sem reler a lista tabela a tabela** (`T-38` §7.2 item 2). Se
alguma tabela pertencer a módulo de produção real, o ID migra de DEV para MISTO **e a prioridade
de banda de `C-137` muda**.

**O que os artefatos sustentam.** Sustentam integralmente a divergência: **a reconciliação
tabela × módulo não existe em nenhum artefato** — o par declara isso expressamente em §12.3.
Não é conflito entre duas evidências; é **ausência de uma**.

**ENCAMINHAMENTO NOMEADO (trabalho técnico, não decisão):** `vericore-software-audit-director` →
titular de `C-137`, **como coluna adicional do lote 3 e do anexo de `DIV-COV4-01`**: cada tabela da
lista nominal recebe **o módulo a que pertence**. Custo marginal ≈ zero (a lista já vai ser
produzida por §2.1). Produto: (i) fecha `DIV-COV4-05`; (ii) dá insumo direto a `RES-15`; (iii)
permite ordenar as bandas de `C-137` por exposição real, que é o critério que o dono já fixou para
a fila. **Este é o item de melhor relação custo/desbloqueio de toda a lista.**

## 2.8 §4 do par — `F-5` e `F-12`

| Item | Natureza | Despacho |
|---|---|---|
| **`F-5`** — lista nominal IN × OUT dos 174 endpoints do tier 3 profundo (REG-G3 passo 4) não publicada em 4 rodadas. Sem ela, a amostra **não satisfaz a condição (a) de G3** | **Trabalho técnico.** Não depende de decisão humana: a amostra foi tomada, só não foi nomeada | `vericore-software-audit-director` → titular da faixa §7.1 tier 3 profundo. Entregável: *lista nominal dos 174, marcando IN/OUT e o critério de risco aplicado*. O par a chama de **"a lacuna mais barata da run"** e ela está aberta há **4 rodadas** — é falha de despacho, e a assumo como tal (§4, `DIR-DIV-05`) |
| **`F-12`** — 2 regras de negócio decididas por código sem fonte normativa versionada (preço×custo, `T33-A-F01`; fórmula de rating de fornecedor, `T33-A-F12`), mais `T33-B-F07` e 4 candidatas a BR-ID | **Decisão humana** (Regras 6 e 21 — nenhum agente inventa regra de negócio) | **Não é gate novo.** Verifiquei: `F-12` já está integralmente aberto como **`D-02`…`D-06`** na lista de pendências do consolidador (`R4` §6.1: BR-ID de UC-03 preço>custo; fonte de `manutencao`/`garantia`; lado correto de `T33-B-F02`; candidatas a BR-ID de `T-33` B; fórmula de rating). **Consolidar em `D-02`…`D-06` e não abrir gate paralelo** — contagem dupla de gate é o que faz gate morrer sem dono |

## 2.9 §5 do par — baixa de `N-06` e de `N-08`

O par diz, corretamente, que *"a revogação/redução de declaração negativa é ato do director"*.
**Preciso o âmbito, para não usurpar autoridade:** declaração negativa de auditoria é artefato de
**VeriCore** — quem a baixa é o **`vericore-software-audit-director`**, não o CoreTriad Director.
O que **eu** devo (e não fiz até aqui, e é falha minha) é **despachar**.

| Declaração | Estado medido | Posição do control plane |
|---|---|---|
| **`N-06`** — regra de negócio nos 43 rasos | **causa material extinta**: `T-33` A+B examinaram regra de negócio nos 10 módulos, 43/43 endpoints, 40 IDs, 7 HIGH com veredito adversarial de `T-34` | **Nenhum artefato do control plane contradiz a baixa.** Registro que a baixa, se declarada, **tem de viajar com as 3 ressalvas nominais de §5.1** — D5 estático sobre model (não catálogo), D9 estático (zero requisição), e a inferência do mapeamento célula → módulo, **que resolvi em §2.5**. **Despacho ao `vericore-software-audit-director` para o ato.** Não declaro a baixa |
| **`N-08`** — `mobile`/`tv` só estrutural | causa material extinta desde a Rodada 2; **proposta de baixa sem despacho há 3 rodadas consecutivas** | **Falha de despacho do control plane, assumida** (`DIR-DIV-05`). **Despacho agora**, com as 3 ressalvas da Rodada 2 §4.1 anexadas. ⚠ Registro obrigatório para que a baixa não seja lida a mais: `N-08` cair **não** resolve `D-09` — os **26 HIGH de `npm audit` em `mobile` (14) e `tv` (12) seguem sem finding e sem investigação individual**, 4ª rodada sem decisão do dono. São coisas distintas e não podem ser fechadas uma pela outra |

## 2.10 §10 do par — `RES-15` e `RES-16`

**`RES-15` — classificação de ambiente propagada por MÓDULO, não por âncora.** Os **66 IDs
`MISTO`** (T-04 4 + T-05 13 + T-13 12 + T-17 9 + T-18 12 + T-19 11 + T-22 5 = **66**, recontado)
não tiveram extração item a item. Consequência medida pelo par: *a matriz de exposição real que
sustenta a fila **não tem o mesmo grão** da matriz de cobertura* — prioridade de cobertura e
prioridade de remediação podem divergir sem que nada acuse.

- **Isto é meu**, e é o mesmo objeto de `P-T39-01` (alcance da classe de D-13 item 1) e da
  pendência **T-19** — três nomes para o mesmo trabalho. **Unifico:** passam a ser tratados como
  **um único item**, `P-T39-01`, com escopo = *extração âncora a âncora dos 66 `MISTO` + varredura
  dos demais IDs alcançados pela classe "módulo dev que escreve sobre os 327 itens reais"*.
- **Determinação de bloqueio, para não travar o que não precisa travar:** `P-T39-01` **não impede**
  a emissão dos relatórios finais (os estratos 1-3 e a cabeça do 2 estão enumerados por ID, e os
  6 recortes MISTO HIGH estão nomeados em `T-39` §2.2). **Impede**: (i) declarar a fila de
  remediação completa em grão de item; (ii) qualquer gate de release que dependa de exposição real
  por âncora. Fica em §3(c).
- **Encaminhamento:** execução é evidência de auditoria → `vericore-software-audit-director`;
  a **ordenação executiva** resultante volta a mim (Regra 5).

**`RES-16` — `C-136` sem movimento em 4 rodadas.** A semântica profunda do contrato de 683
endpoints é **a única célula da EMENDA-02 que nenhuma trilha, em três levas de fieldwork, sequer
tocou**. **Não há nada a resolver por evidência aqui: há uma escolha.** E a escolha **é do dono**,
por uma razão de artefato: `APR-2026-024` Decisão A **recusou explicitamente a Opção B** (aceitar
cobertura parcial com exclusão registrada no relatório final). **Enquanto essa recusa estiver de
pé, `C-136` não pode ser "aceita como risco residual" por nenhum agente** — teria de ser
executada. Gate listado em §3(b) item b5.

---

# BLOCO 3 — ESTADO DE ENCERRAMENTO

Lista **exaustiva e nominal** do que hoje impede o `vericore-audit-reporting-agent` de emitir os
relatórios finais.

## 3(a) RESOLVIDO POR ESTE DOCUMENTO — 7 itens

| # | Item | Resolução | Efeito imediato |
|---|---|---|---|
| **a1** | **`OBS-T38-02` / `T-39` §6.1 — o ±2 da Rodada 1** | **RESOLVIDO POR ENUMERAÇÃO** (§1.2-§1.6). Está na §1.2, colunas HIGH e MEDIUM; a causa é não ter reprocessado a §1.2 após a decisão §3.2 (rebaixamento de `T13-F01` e `T13-F04`); **os números corretos são HIGH 65 e MEDIUM 120**, com a cadeia corrigida até **HIGH 87 / MEDIUM 229** em `T-39` | **Estrato 4 DESBLOQUEADO**; enumeração integral vira listagem, não aritmética |
| **a2** | **Estrato 4 = 79** | **CORRIGIDO PARA 77** (§1.5.3); fila fecha 4+10+5+77 = 96 e 96+229+110+11 = 446 | número final da fila estabilizado |
| **a3** | **Universo da Regra 22 = 98** | **CORRIGIDO PARA 96** (§1.5.4). **Nenhuma exceção nova**: `T13-F01`/`T13-F04` saem dos dois lados da conta | conclusão qualitativa "sem exceções" preservada; número corrigido |
| **a4** | **`DIV-COV4-01`** — condição nominal de `APR-2026-034` D2 dita "insatisfazível" | **RESOLVIDO POR EVIDÊNCIA** (§2.1): é **satisfazível**; a enumeração que produziu o denominador 207 é **nominal** (`T-31` distinguiu `"SequelizeMeta"` por nome). Vira item de trabalho, não de impossibilidade | deixa de ser obstáculo lógico ao encerramento de `C-137` |
| **a5** | **`DIV-COV4-03`** — 25 × 35 células do Bloco A, **e a ressalva 3 de §5.1 endereçada ao control plane** | **RESOLVIDO** (§2.5): adotada a **enumeração (35)**; e **verifiquei que `coretriad/` NÃO tem mapeamento nominal célula → módulo divergente** — a inferência da trilha não é contraditada e as 35 células **não precisam ser refeitas** | total de 85 células `E` do par **sustentado**; não cai para 75 |
| **a6** | **`DIV-COV4-04`** — sobreposição D9 do tier 3 raso | **RESOLVIDO POR EVIDÊNCIA** (§2.6): nominal (Bloco A) vence genérico (Bloco B); 5 + 5, nenhuma célula órfã nem bicéfala. Violação de "um titular por célula" registrada como higiene de plano | não bloqueia |
| **a7** | **`DIV-COV4-07`** — parte processual | **RESOLVIDO** (§2.3): **não acolho** a declaração `E 75/75` de `sst`. O control plane registra `C-05`/`C-06` como **declarada, não confirmada, ≈6 sem atribuição**, e a divergência viaja junto do número no relatório final | tira o relatório do dilema "acolher ou travar": ele emite **com a divergência declarada** |

## 3(b) PENDENTE DE DECISÃO HUMANA — 13 gates, nominais

**Nenhum destes é decidido aqui.** Estão listados com o objeto exato, para que o dono possa
despachá-los em uma sessão.

| # | Gate | Objeto | Estado |
|---|---|---|---|
| **b1** | **`D-01`** | `AUD-CTB-DEBCRED-01`: manter HIGH (fixada pelo dono) × acolher rebaixamento a MEDIUM recomendado por `T-34` | aberta desde a Rodada 3. HIGH preservada; posição no estrato 4 é **provisória** |
| **b2** | **`D-R1`** | Severidade de `AUD-DB-09` retificado: manter MEDIUM re-fundamentado × elevar a HIGH. **Se elevar:** fixar fronteira com `T35-DIN-F06` **e** acionar Regra 22 — as duas consequências são obrigatórias | `REEXAME_AUD-DB-04-09.md` §6.2 |
| **b3** | **`D-R2`** | Ratificar em lote a manutenção MEDIUM de `AUD-DB-04`, `-05`, `-06`, `-07`, `-08`. A ratificação **fecha a pendência T-16** | idem |
| **b4** | **`D-R3`** | *(condicional a `D-R1` = elevar)* Titularidade das 3 falhas de escrita: `AUD-DB-09` × `T35-DIN-F06` | idem |
| **b5** | ⛔ **A "segunda leva" de `APR-2026-024` Decisão A** | **O maior gate aberto da run, e o que mais diretamente trava o relatório final.** O dono **recusou explicitamente a Opção B** ("aceitar cobertura parcial com exclusão registrada no relatório final") e a aprovação diz que fechar os ≈150 endpoints *"não autoriza declarar o G3 integralmente cumprido"* e **"não supre as células C-63…C-137"**, ficando essa segunda leva como **decisão ABERTA do dono**. Desde então: `C-63…C-132` foi **executada** (`T-33`), `C-133` ficou **parcial alta** (`T-32`), e **só `C-137` recebeu autorização de cobertura por risco** (`APR-2026-034` D2). **Para `C-136`, para as 19 células D9 de tier 2, para D4-D8 dos 174 profundos e para os resíduos `rh`/`sst`/`jurídico` não existe autorização de exclusão declarada.** Ou se executa, ou o dono decide caso a caso | **ABERTA** |
| **b6** | **`DIV-COV4-06`** | Leitura de "dado pessoal" em `APR-2026-034` D2: SST (34) e jurídico (15) entram na cobertura integral (~98-100 tabelas) ou ficam na exclusão declarada (~49)? Três opções redigidas em §2.2 | **NOVA — aberta hoje** |
| **b7** | **`D-07`** | Denominador normativo de `C-133`: emendar o plano para ≈121 páginas roteadas × manter 167 arquivos. **Não altera o estado da célula** (PARCIAL ALTA nos três denominadores) | aberta; ver `DIR-DIV-07` (§4) quanto a ser ou não condição de veredito |
| **b8** | **`D-09`** | 26 HIGH de `npm audit` em `mobile` (14) e `tv` (12) sem finding e sem investigação individual | **4ª rodada consecutiva sem decisão** |
| **b9** | **`D-12`** | `AUD-PAT-DEPRECIACAO-01`: implementar depreciação × remover a coluna (mais as 3 declarações de capacidade). **Bloqueia `OR-25`** | aberta |
| **b10** | **`D-02`…`D-06`** | Fonte normativa de regra de negócio: BR-ID de UC-03 (preço>custo), fonte de `manutencao`/`garantia`, lado correto de `T33-B-F02`, candidatas a BR-ID de `T-33` B, fórmula de rating de fornecedor. **É o `F-12` do par — mesmo objeto, sem gate paralelo** (§2.8) | abertas |
| **b11** | **`D-08`** | Regra 23 × `APPROVALS.md:787` | aberta |
| **b12** | **`D-10`** | Ownership de `docs/business/briefs/` | aberta |
| **b13** | **Convenção `GOVERNANCA_DOC`** (item 4 da §5 de `T-38`) | Os 26 findings documentais ficam "sem ambiente aplicável" (convenção declarada e **reversível**) ou são classificados pelo módulo referido? **Não foi submetida ao dono** (`APPROVALS.md:1568-1570`). Se revertida, o efeito é determinístico e sai por adenda | **não submetida** |

## 3(c) PENDENTE DE TRABALHO TÉCNICO — 12 itens, com titular

| # | Item | Titular | Bloqueia o relatório final? |
|---|---|---|---|
| **c1** | **`C-137` lote 3** — em execução; escopo de encerramento fixado por `APR-2026-034` D2. Hoje `A(52/207)`, déficit **155**. Faltam os **2-3 lotes** das bandas de cobertura integral e o artefato de exclusão declarada | VeriCore (titular de `C-137`) | **SIM** — o critério de encerramento existe, o encerramento não |
| **c2** | **Errata do placar** — adenda DE → PARA aplicando o Bloco 1: R1 65/120 · R2 72/157 · R3 85/225 (reapresentado 85/221) · **R4 86/229** · **T-39 87/229**; estrato 4 = **77**; Regra 22 = **96**; e a correção de citação de `OBS-T26-04` (§1.7) | `vericore-audit-consolidator` | **SIM** — o relatório final não pode publicar dois placares |
| **c3** | **Enumeração integral do estrato 4** — adenda determinística, agora desbloqueada: 22 nominais + **55** por ponteiro → 77 por ID | `vericore-audit-consolidator` (par: `T-39`) | Não para o relatório; **SIM** para entregar a fila completa à SanaCore em grão de item |
| **c4** | **Lista nominal das 21 tabelas sem model** (`DIV-COV4-01`) — por diferença de conjuntos sobre `00_baseline_frozen.sql` + migrations pós-freeze. **Custo: 1 varredura estática** | VeriCore (autor de `T-35`), anexo do lote 3 | **SIM** — sem ela a exclusão de `APR-2026-034` D2 não é emitível em conformidade com a própria condição |
| **c5** | **Reconciliação tabela × módulo** (`DIV-COV4-05`) — coluna "módulo" na mesma lista de c4. Custo marginal ≈ zero | idem c4 | Não bloqueia a emissão; **bloqueia** a ordenação por exposição real de `C-137` e alimenta c6 |
| **c6** | **`P-T39-01`** (unifica `RES-15` + `T-19` + alcance da classe D-13.1) — extração âncora a âncora dos **66** IDs `MISTO` e varredura dos demais IDs alcançados pela classe | VeriCore (execução) → director (ordenação) | Não para o relatório; **SIM** para declarar a fila completa em grão de item e para qualquer gate de release |
| **c7** | **`F-5`** — lista nominal IN × OUT dos 174 endpoints do tier 3 profundo (REG-G3 passo 4). Sem ela a amostra **não satisfaz a condição (a) de G3**. "A lacuna mais barata da run", aberta há 4 rodadas | VeriCore (titular da faixa §7.1) | **SIM** — é condição textual de G3 |
| **c8** | **`DIV-COV4-07`** — cruzar a lista nominal dos 75 endpoints de `sst` (`T-27 DEF-02B`) com os clusters-âncora de `T-12`, marcando os ≈6 | VeriCore (titular `T-27 DEF-02B` + `T-12`) | Não bloqueia **desde a determinação de §2.3** (o relatório emite com a divergência declarada); bloqueia fechar `RES-T26-07` |
| **c9** | **Regra 22 de `AUD-RH-COMISSAO-01`** — HIGH fixada por `APR-2026-031` D-11 tornou a validação adversarial **exigível e ela não ocorreu**. Posição reservada no estrato 4, **NÃO LIBERADA à SanaCore** | `vericore-finding-validator`, por despacho do `vericore-software-audit-director` | **SIM** — é a única exceção viva da Regra 22 no corpus |
| **c10** | **Adjudicação pendente** — `T16-F15` (encaminhado a T-18, veredito nunca dado), `T21-F01` (`ListProductsUseCase`/`ProductController` que nenhuma trilha leu; a própria T-21 pede reavaliação para HIGH se confirmado), `RES-T13-04`/`RES-T13-05` (sem decisão registrada). `OBS-T26-06`, aberta desde a Rodada 1 | VeriCore (adjudicação) / director (alocação) | **SIM** — findings encaminhados e nunca adjudicados não podem entrar no relatório como fechados |
| **c11** | **`DIV-SEV-01`** — `T17-F05` MEDIUM × `T23-F03` HIGH sobre o mesmo fato, **não resolvida**, escalada ao `vericore-software-audit-director` desde a Rodada 1. O grupo G-12 carrega HIGH **apenas para priorização**, declaradamente **não** como resolução de mérito | `vericore-software-audit-director` | **SIM** — o relatório final não pode publicar uma severidade sem mérito resolvido sem dizê-lo |
| **c12** | **`RES-11` / G4 — toda a prova dinâmica.** ≈**190** pedidos DYN contra ~103 catalogados, ~21 executados. `CONFLITO-G3×G4` | dono (autorização de janela) + `vericore-audit-verification-runner` | **SIM** de fato: incide integralmente sobre os 40 IDs de `T-33`, 72 de `T-32`, 11 de `T-35` e os 10 findings formais. Sob `APR-2026-016`, nada disso roda sem decisão humana de janela |

## 3(d) O que NÃO bloqueia — dito explicitamente, para ninguém travar por precaução

- **`T-41`** — inexistente no `AUDIT_COMMIT` e no worktree. **Ausência de evidência, não pendência
  presumida.** Nenhuma célula depende dela. Se vier a existir, o par é refeito.
- **`OBS-T26-33`** (par dois corpora atrás) — **deixou de ter objeto quanto ao atraso**: o par
  Rodada 4 mede o mesmo corpus da consolidação Rodada 4, mais `T-38`, `T-39` e `T-40`. O **ato de
  encerrá-la é do consolidador/`vericore-software-audit-director`**, não meu.
- **`DIV-COV4-03`**, **`DIV-COV4-04`** — resolvidos (§2.5, §2.6).
- **Contagem de ambiente 37/315/2 (`T-38`) × 40/314/0 (par §11.1)** — **conferi: não é
  divergência.** `T-39` §1.2 publica o DE → PARA (+3 produção real, −1 dev líquido, −2 ambíguo)
  por `APR-2026-031` D-13, e fecha em 446 nos dois. Registro para que ninguém a reabra.
- **`AUD-DEP-JSYAML-01` LOW × "HIGH" de `APR-2026-024` D-B** — **conferi: não é violação da
  Regra 18.** O HIGH era **rótulo do scanner**; a Rodada 2 §4.3 registra o rebaixamento a LOW
  **com aceite humano**, por 5 eixos de fora-do-runtime.

---

# 4. DIVERGÊNCIAS QUE ESTE DOCUMENTO REGISTRA (Regra 20) — não acomodadas

Série própria do control plane, sem colisão com `DIV-COV4-*`, `DIV-T38-*`, `OBS-T26-*`.

| ID | Divergência | Fontes | Tratamento |
|---|---|---|---|
| **`DIR-DIV-01`** | **A §1.2 da Rodada 1 não reflete a §3.2 da própria Rodada 1**, e o desvio foi herdado por citação direta em 3 rodadas (R2 §2.2 → R3 → R4 → `T-39`) | `T-26_CONSOLIDACAO.md` §1.2 × §1.3+§3.2 | **RESOLVIDA por enumeração** (Bloco 1). Errata é do consolidador (c2) |
| **`DIR-DIV-02`** | **`OBS-T26-04` citada como "mesma classe" do ±2** em `T-39` §2.4/§6.1 e em `OBS-T38-02`. É outra coisa: T-08, **LOW/INFO**, soma zero, **já resolvida** na Rodada 1 por enumeração | `T-39:174-176` × `T-26_CONSOLIDACAO.md:831` | **Registrada e corrigida.** Metade do fundamento de bloqueio do estrato 4 nunca teve objeto |
| **`DIR-DIV-03`** | **Estrato 4 publicado como 79** e conferência da fila em 98 | `T-39` §2.4/§2.5 | Corrigido para **77 / 96** (§1.5.3). Adenda pelo consolidador |
| **`DIR-DIV-04`** | **"Duas aritméticas por caminhos diferentes fecham em 98"** — as duas partem do **mesmo** HIGH = 89. **A independência declarada não existe** | par Rodada 4 §7 | Registrada. Não desqualifica o trabalho do par (o erro é anterior a ele e ele o herdou declaradamente em §12.2); qualifica a **força probatória** da conferência |
| **`DIR-DIV-05`** | **Falha de despacho do control plane, assumida:** `N-08` com proposta de baixa há **3 rodadas** sem despacho; `F-5` aberta há **4**; `D-09` há **4**; `OBS-T26-06` (adjudicações) desde a **Rodada 1**. Nenhum é problema de auditoria — são itens que pararam **na minha mesa** | par §5, §4; `T-26_CONSOLIDACAO.md` §7 | **Reconhecida.** Despachados em §2.9, §2.8 e §3(c) c10. Sem isto, a lista de "pendências de auditoria" estaria contando como técnico o que é atraso de orquestração |
| **`DIR-DIV-06`** | **`APR-2026-024` D-A (Opção B recusada) × estado de fato**: hoje só `C-137` tem autorização de exclusão declarada (`APR-2026-034` D2); `C-136`, D9 de tier 2, D4-D8 dos 174 e os resíduos `rh`/`sst`/`jurídico` seguem **sem execução e sem autorização de aceitação** | `APPROVALS.md:828-870` × par §3.6/§11.3 | **Registrada e listada como gate b5.** Não resolvo: só o dono pode emendar a própria recusa |
| **`DIR-DIV-07`** | **Âmbito de "condição de veredito final".** O par lista `D-07` entre as condições; do lado do control plane, `D-07` **não impede a emissão** (a célula é PARCIAL ALTA nos três denominadores) | par §13 × §3.5.1 do próprio par | **Registrada, não resolvida por mim.** Condição de veredito é autoridade do `vericore-software-audit-director`. Escalada a ele, com o meu fundamento anexado |

---

# 5. DESPACHOS — o que sai desta mesa, para quem, com o quê

| Destinatário | Item | Entregável |
|---|---|---|
| `vericore-audit-consolidator` | c2, c3, §2.5 | Errata DE → PARA do placar (Bloco 1) + enumeração integral do estrato 4 (77 IDs) + errata "25 → 35 células" do `T-33` Bloco A |
| `vericore-software-audit-director` | §2.9, c7, c8, c9, c11, `DIR-DIV-07` | Ato de baixa de `N-06` (com as 3 ressalvas) e de `N-08`; `F-5`; cruzamento `sst`; despacho de `AUD-RH-COMISSAO-01` ao `vericore-finding-validator`; mérito de `DIV-SEV-01`; âmbito de `D-07` |
| VeriCore — titular de `C-137` (autor de `T-35`) | c1, c4, c5 | Lote 3 + lista nominal das 155 (134 + 21 por diferença de conjuntos) + coluna "módulo" |
| VeriCore — execução, com ordenação de volta ao director | c6 | `P-T39-01`: extração âncora a âncora dos 66 `MISTO` |
| `vericore-audit-reporting-agent` | Bloco 3 inteiro | Fica **vinculado** ao placar corrigido (§1.5), ao bloqueio normativo do soft delete (par §8), ao `155/207` de `C-137`, à leitura de `APR-2026-034` D2 **como critério**, e à forma de registro de `C-05`/`C-06` de §2.3 |
| **Dono** | §3(b), 13 gates | `DIV-COV4-06` (b6) e o gate **b5** (`APR-2026-024` D-A) são os dois que, decididos, mudam a estrutura do que falta |
| SanaCore | — | **Nada muda hoje.** A fila segue chegando **via director**; o estrato 4 completo sai depois de c2+c3 |

---

# 6. LIMITES DESTE DOCUMENTO — declarados

1. **Nenhum arquivo do objeto auditado foi aberto.** Nem `server/`, nem `client/`, nem
   `mobile/`, `tv/`, `docs/`, `product/`, `server/migrations` ou `server/database`. **Zero
   conteúdo de produto.** Zero comando, zero execução, zero conexão de banco (`APR-2026-016`).
2. **Recontei por leitura própria nesta sessão:** as 26 linhas × 6 colunas da §1.3 da Rodada 1;
   as linhas de placar de R2 §2.2, R3 e R4 §2.1/§2.5; `T-39` §1.2/§1.3/§2.4/§2.5/§6.1; `T-38` §3
   e §4.2; `APPROVALS.md` `APR-2026-024` D-A e `APR-2026-034`; `REEXAME_AUD-DB-04-09.md` §6.2; e
   a busca própria por mapeamento célula → módulo em `coretriad/` (§2.5).
3. **Aceito sem reverificar:** todo veredito de mérito de VeriCore; toda âncora `arquivo:linha`;
   toda declaração de cobertura de trilha (`E n/n`); as contagens de corpus 446/464/17/1; as
   classificações de ambiente de `T-38`/`T-39`; a medição `Glob ⇒ 167 arquivos` do par.
   **Se uma trilha declarou `E` e cobriu menos, este documento repete o erro dela** — o
   contrapeso disponível está nas divergências registradas, não em medição minha.
4. **Não alterei severidade de nenhum finding** (Regra 18). O rebaixamento de `T13-F01`/`T13-F04`
   é ato do `vericore-audit-consolidator`, de 2026-08-16, registrado em `T-26_CONSOLIDACAO.md`
   §3.2. **Corrigi um agregado que deixou de refletir essa decisão** — não a decisão.
5. **Não declarei** `AUDIT_PASSED`, `FINDINGS_CONFIRMED`, `RETEST_PASSED`, `FINDING CLOSED`,
   `REMEDIATION COMPLETE`, nem a baixa de qualquer declaração negativa (Regras 3, 4, 5).
6. **Não decidi nenhum gate humano.** Os 13 de §3(b) estão **listados**, com objeto e opções,
   nunca resolvidos por inferência (Regra 18).
7. **Não editei nenhum artefato de VeriCore ou SanaCore** (Regras 15/16). Única escrita: este
   arquivo, em `coretriad/governance/`.
8. **Não atualizei `coretriad/states/`** — `PROJECT_STATE.md` e `PROJECT_EVENT_LOG.md` ficaram
   fora do limite de escrita desta sessão. **Fica devido o registro do evento correspondente a
   esta reconciliação no `PROJECT_EVENT_LOG`**, e o registro em `APPROVALS.md` dos gates novos
   (b5, b6, b13) quando forem submetidos ao dono.

---

**Estado:** `RECONCILIAÇÃO ±2 RESOLVIDA POR ENUMERAÇÃO (R1: HIGH 65 / MEDIUM 120 · T-39: 87 / 229)
· ESTRATO 4 DESBLOQUEADO EM 77 · REGRA 22 = 96 SEM EXCEÇÃO NOVA · 4 DIVERGÊNCIAS DO PAR
RESOLVIDAS (01, 03, 04, 07-processual) · 1 ENCAMINHADA COM MÉTODO (05) · 1 REDUZIDA A EMENDA DE
PLANO (02) · 1 GATE HUMANO NOVO (06) · 13 GATES HUMANOS E 12 ITENS TÉCNICOS NOMINAIS IMPEDEM OS
RELATÓRIOS FINAIS.`
