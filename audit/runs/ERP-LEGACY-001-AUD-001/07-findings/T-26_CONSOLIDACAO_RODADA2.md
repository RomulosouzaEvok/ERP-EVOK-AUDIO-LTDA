# T-26 — CONSOLIDAÇÃO · **RODADA 2** (reconsolidação) · ERP-LEGACY-001-AUD-001

```
AUDIT_ID:      ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f   (única referência de leitura)
TRILHA:        T-26 — Consolidação e cobertura executada · RODADA 2
PRODUZIDO POR: vericore-audit-consolidator
DATA:          2026-08-16
REGIME:        APR-2026-016 — read-only. Zero conexão de banco, zero execução, zero comando.
NATUREZA:      **ATUALIZAÇÃO RASTREÁVEL** de `07-findings/T-26_CONSOLIDACAO.md` (Rodada 1).
               Nenhuma linha da Rodada 1 foi reescrita, apagada ou renumerada. Toda mudança
               está declarada aqui na forma "DE → PARA", com motivo — padrão da EMENDA-02.
               NÃO emite finding novo (Regra 6). NÃO corrige nada (Regra 2). NÃO altera
               evidência de outra organização (Regra 15). NÃO declara AUDIT_PASSED,
               FINDINGS_CONFIRMED, RETEST_PASSED, FINDING CLOSED nem REMEDIATION COMPLETE
               (Regras 3, 4, 18).
PAR OBRIGATÓRIO: `24-coverage/AUDIT_COVERAGE_EXECUTED_RODADA2.md`
LEITURA CONJUNTA: este documento **não substitui** a Rodada 1. Os dois só valem lidos
               juntos, no mesmo regime de cláusula de conjunto que a EMENDA-02 impôs ao plano.
               Onde divergirem, **prevalece esta Rodada 2**, e a divergência está registrada.
```

> **Cláusula de conjunto do plano, conferida (obrigação do mandato).** `AUDIT_PLAN.md`,
> `AUDIT_COVERAGE_MATRIX.md`, `AUDIT_PLAN_EMENDA_01.md` e `AUDIT_PLAN_EMENDA_02.md` foram lidos
> como um só corpo. **Divergência registrada, não conciliada:** a `EMENDA-02` §4 declara **N-04,
> N-05 e N-06 REVOGADAS**; a cobertura executada (§10 e o par de cobertura) mostra **N-05 e N-06
> materialmente em vigor** e **N-04 reduzida, não revogada**. Pela regra da emenda de numeração
> mais alta, a EMENDA-02 **prevalece como norma de cobertura**; o que não se cumpriu foi a
> **execução contra o plano**, não o plano contra a realidade. Registro nessa direção porque é a
> direção verdadeira, e ela é matéria de decisão humana (G3/G11), não de conciliação por mim.

---

## 0. O que esta rodada absorve, e o que ela não toca

**Absorve:** 4 trilhas `T-27` (DEF-01/02A/02B/03), 2 validações adversariais `T-28`, 1 trilha
`T-29` (`mobile`/`tv`), 3 findings formais novos promovidos por decisão humana, e 2 relatórios de
infraestrutura de evidência (`G4_*`).

**Não toca:** nenhum enunciado técnico, severidade original, âncora ou autoria dos 254 IDs da
Rodada 1 que não estejam nominalmente listados em §4. Onde a Rodada 1 escalou uma divergência ao
director e ela não foi respondida, **ela continua escalada e aberta** (§9).

---

## 1. ⚠️ RESOLUÇÃO DA COLISÃO DE ID — feita **antes** de qualquer contagem

Contar sem resolver isto funde ou perde finding. O `T-28` publicou o mapeamento canônico dos 10
HIGH; **os não-HIGH herdavam a mesma colisão e ainda não estavam mapeados**. Publico o mapeamento
**completo e vinculante** para toda referência cruzada desta run.

### 1.1 Regra canônica

> **Todo ID de T-27 é qualificado por trilha.** A forma `T27-Fnn`, `T27-Hnn`, `T27-Mnn`,
> `T27-Lnn` e `T-27-nn` **sem qualificador é ambígua e não pode ser usada** em relatório,
> roteamento à SanaCore, pedido DYN ou reteste. Referência que use a forma crua é rejeitada.

### 1.2 Mapeamento canônico — findings (60 IDs)

| Trilha de origem | ID de origem | **ID canônico** | Sev. proposta | Sev. **vigente** |
|---|---|---|---|---|
| `T-27_DEF-01_JURIDICO_D3D4.md` | `T27-F01` | **`T27-JUR-F01`** | HIGH | **HIGH** (T-28 mantida) |
| idem | `T27-F02` | **`T27-JUR-F02`** | MEDIUM | MEDIUM |
| idem | `T27-F03` | **`T27-JUR-F03`** | MEDIUM | MEDIUM |
| idem | `T27-F04` | **`T27-JUR-F04`** | MEDIUM | MEDIUM |
| idem | `T27-F05` | **`T27-JUR-F05`** | MEDIUM | MEDIUM |
| idem | `T27-F06` | **`T27-JUR-F06`** | LOW | LOW |
| idem | `T27-F07` | **`T27-JUR-F07`** | HIGH | **HIGH** (T-28 mantida, **base estreitada**) |
| idem | `T27-F08` | **`T27-JUR-F08`** | MEDIUM | MEDIUM |
| idem | `T27-F09` | **`T27-JUR-F09`** | LOW | LOW |
| idem | `T27-F10` | **`T27-JUR-F10`** | INFO | INFO |
| `T-27_DEF-02A_RH_D3D4.md` | `T27-H01` | **`T27-RH-H01`** | HIGH | **HIGH** (T-28, **escopo corrigido**) |
| idem | `T27-H02` | **`T27-RH-H02`** | HIGH | **HIGH** (T-28 mantida) |
| idem | `T27-H03` | **`T27-RH-H03`** | HIGH | **HIGH** (T-28 mantida) |
| idem | `T27-M01`…`M07` | **`T27-RH-M01`…`M07`** | MEDIUM ×7 | MEDIUM ×7 |
| idem | `T27-L01`…`L08` | **`T27-RH-L01`…`L08`** | LOW ×8 | LOW ×8 |
| `T-27_DEF-02B_SST_D3D4.md` | `T27-F01` | **`T27-SST-F01`** | HIGH | **HIGH** (T-28 mantida) |
| idem | `T27-F02` | **`T27-SST-F02`** | HIGH | **MEDIUM** ⇩ (T-28 rebaixada) |
| idem | `T27-F03`…`F12` | **`T27-SST-F03`…`F12`** | MEDIUM ×10 | MEDIUM ×10 |
| idem | `T27-F13`…`F18` | **`T27-SST-F13`…`F18`** | LOW ×6 | LOW ×6 |
| idem | `T27-F19`, `F20` | **`T27-SST-F19`, `F20`** | INFO ×2 | INFO ×2 |
| `T-27_DEF-03_RFQ_PRECOS_D3D4.md` | `T-27-01` | **`T27-RFQ-01`** | HIGH | **HIGH** (T-28 mantida) |
| idem | `T-27-02`, `-03` | **`T27-RFQ-02`, `-03`** | MEDIUM ×2 | MEDIUM ×2 |
| idem | `T-27-04` | **`T27-RFQ-04`** | HIGH | **MEDIUM** ⇩ (T-28 rebaixada) |
| idem | `T-27-05` | **`T27-RFQ-05`** | HIGH | **MEDIUM** ⇩ (T-28 rebaixada) |
| idem | `T-27-06`, `-07`, `-08`, `-10` | **`T27-RFQ-06`, `-07`, `-08`, `-10`** | MEDIUM ×4 | MEDIUM ×4 |
| idem | `T-27-09` | **`T27-RFQ-09`** | LOW | LOW |
| idem | `T-27-11`, `-12` | **`T27-RFQ-11`, `-12`** | INFO ×2 | INFO ×2 |
| `T-29_MOBILE_TV.md` | `T29-MOB-F01`…`F05` | **inalterados** (não colidem) | 4 MED + 1 LOW | idem |
| idem | `T29-TV-F01`, `F02` | **inalterados** | 1 MED + 1 LOW | idem |

**`T29-TV-F03` não é finding** — é corroboração de `AUD-AUTHN-05`, declarada como tal pela própria
trilha ("sem severidade nova"). Não recebe ID de finding e não entra em contagem. **`T29-C01`…`C12`**
são conformidades registradas, não findings.

### 1.3 Mapeamento canônico — séries de divergência

**O mandato informou "duas séries `DIV-T27-01…04` distintas". Por leitura própria dos quatro
relatórios, são QUATRO séries colidentes, e há ainda DUAS séries `DIV-T28` colidentes.** Correção
registrada, não silenciada.

| Série de origem | Faixa real | **Série canônica** | Colisão material |
|---|---|---|---|
| T-27 Jurídico | `DIV-T27-01`…`03` | **`DIV-T27-JUR-01`…`03`** | `-01` colide com RH e RFQ; `-02`/`-03` colidem com RH, SST e RFQ |
| T-27 RH | `DIV-T27-01`…`04` | **`DIV-T27-RH-01`…`04`** | idem |
| T-27 SST | `DIV-T27-00`, `02`…`06` | **`DIV-T27-SST-00`, `02`…`06`** | `-02`…`-06` colidem com RFQ |
| T-27 RFQ | `DIV-T27-01`…`06` | **`DIV-T27-RFQ-01`…`06`** | idem |
| T-28 bloco JUR+RH | `DIV-T28-01`…`03` | **`DIV-T28-JR-01`…`03`** | **colide integralmente** com o bloco SST/RFQ, com conteúdo diferente |
| T-28 bloco SST+RFQ | `DIV-T28-01`…`05` | **`DIV-T28-SR-01`…`05`** | idem |

**Consequência prática registrada:** `DIV-T28-01` significa "escopo de `T27-RH-H01` corrigido" num
documento e "colisão de ID de T-27" no outro. Sem esta requalificação, o encaminhamento ao director
apontaria para o item errado.

### 1.4 Pedidos DYN colidentes — requalificação obrigatória

Quatro trilhas emitiram `DYN-T27-01`…`-05` sobre objetos diferentes; T-29 emitiu `DYN-T29-01`…`04`
(sem colisão). Canônico: **`DYN-T27-JUR-01…05`**, **`DYN-T27-RH-01…05`** (origem `DYN-27.1…27.5`),
**`DYN-T27-SST-01…08`**, **`DYN-T27-RFQ-A…E`** (a série RFQ já usava letras e não colide).
`DYN-CICD-01…03` e `DYN-DEP-01…03` não colidem.

---

## 2. PLACAR CONSOLIDADO — **DE → PARA**

### 2.1 Total de IDs

| Origem | Rodada 1 | **Rodada 2** | Δ |
|---|---|---|---|
| Findings preliminares do discovery (`FIND-ERP-*`) | 7 | 7 | — |
| Findings das 27 trilhas de fieldwork | 247 | 247 | — |
| **`T-27` — 4 trilhas de fechamento de déficit** | — | **60** | +60 |
| **`T-29` — `mobile`/`tv`** | — | **7** | +7 |
| **Findings formais novos (produto)** — `AUD-DEP-JSYAML-01`, `AUD-CICD-DEPGATE-01` | — | **2** | +2 |
| **TOTAL DE IDs DE PRODUTO** | **254** | **323** | **+69** |
| menos `FALSE_POSITIVE` (`T11-F10`) | −1 | −1 | — |
| **TOTAL VIGENTE (produto)** | **253** | **322** | **+69** |
| **Findings de PROCESSO DA AUDITORIA** (categoria separada, §5) | — | **1** | +1 |
| **TOTAL GERAL DE IDs** | 254 | **324** | +70 |

### 2.2 Por severidade — **após** as decisões de §4

| Severidade | Rodada 1 | **Rodada 2 (produto)** | Composição do delta |
|---|---|---|---|
| **CRITICAL** | 6 | **6** | nenhum CRITICAL novo em nenhuma das 7 entradas |
| **HIGH** | 67 | **74** | +10 de T-27 propostos, **−3 rebaixados por T-28** ⇒ +7 |
| **MEDIUM** | 118 | **155** | +31 T-27 (28 propostos + 3 rebaixados) · +5 T-29 · +1 `AUD-CICD-DEPGATE-01` |
| **LOW** | 57 | **77** | +17 T-27 · +2 T-29 · +1 `AUD-DEP-JSYAML-01` |
| **INFO** | 5 | **10** | +5 T-27 (`JUR-F10`, `SST-F19`, `SST-F20`, `RFQ-11`, `RFQ-12`) |
| **FALSE_POSITIVE** | 1 | **1** | inalterado (`T11-F10`) |
| **Conformidade registrada como achado** (não é finding) | 2 | **19** | +5 T-27 JUR · +12 T-29 (`T29-C01`…`C12`) — as 2 de T-24 permanecem |

**Conferência aritmética:** 6 + 74 + 155 + 77 + 10 = **322 vigentes**; +1 `FALSE_POSITIVE` = **323
IDs de produto**. Fecha. **Categoria separada:** `AUD-PROC-CUSTODIA-01` (HIGH, processo) = **1**,
**não somado** ao placar do ERP. Total geral 324.

### 2.3 Por trilha — apenas as linhas novas ou alteradas (as demais permanecem como na Rodada 1 §1.3)

| Trilha | Total | CRIT | HIGH | MED | LOW | INFO |
|---|---|---|---|---|---|---|
| **T-27 / DEF-01 `juridico`** | 10 | 0 | 2 | 5 | 2 | 1 |
| **T-27 / DEF-02A `rh`** | 18 | 0 | 3 | 7 | 8 | 0 |
| **T-27 / DEF-02B `sst`** | 20 | 0 | **1** (era 2) ⇩ | **11** (era 10) | 6 | 2 |
| **T-27 / DEF-03 `rfq`+preços** | 12 | 0 | **1** (era 3) ⇩ | **8** (era 6) | 1 | 2 |
| **T-29 `mobile`/`tv`** | 7 | 0 | 0 | 5 | 2 | 0 |
| **Findings formais novos (produto)** | 2 | 0 | 0 | 1 | 1 | 0 |
| **Processo da auditoria (categoria separada)** | 1 | 0 | **1** | 0 | 0 | 0 |

⇩ rebaixado por decisão registrada — ver §4.1.

### 2.4 ⚠️ Divergências aritméticas internas dos relatórios de origem, registradas e resolvidas por enumeração

Adotei, em todos os casos, a **enumeração por ID**, nunca o resumo — mesmo critério que a Rodada 1
aplicou a `OBS-T26-04` (T-08).

| # | Relatório | Resumo declarado | **Enumeração por ID (adotada)** | Tratamento |
|---|---|---|---|---|
| A-01 | `T-27_DEF-01_JURIDICO` §0 | "**9** findings: 2 HIGH, **4** MEDIUM, 2 LOW, 1 INFO" | **10 IDs**: `F01`…`F10` ⇒ 2 HIGH, **5** MEDIUM, 2 LOW, 1 INFO | `OBS-T26-08` |
| A-02 | Mandato desta rodada / sumário de RH | "**11** findings" para DEF-02A | **18 IDs**: `H01`–`H03`, `M01`–`M07`, `L01`–`L08` | `OBS-T26-09` |
| A-03 | `T-27_DEF-02B_SST` | 20 findings | **20 IDs** — confere | registro simétrico |
| A-04 | `T-27_DEF-03_RFQ` | 12 findings | **12 IDs** — confere | registro simétrico |
| A-05 | `T-29_MOBILE_TV` §9 | 7 findings | **7 IDs** — confere (`TV-F03` corretamente excluído) | registro simétrico |

---

## 3. ESTADO DE VALIDAÇÃO (Regra 22) — **DE → PARA**, com a aritmética divergente RESOLVIDA

### 3.1 ⚠️ Resolução da divergência 8 × 11 da Rodada 3 de T-25 (item 2 do mandato)

**A divergência:** a Rodada 1 compôs os 41 `CONFIRMED` contando **8** vereditos nas Rodadas 3-A/B/C;
a soma dos três relatórios é **11**. O `coretriad-director` registrou e escalou sem conciliar.

**Determinação da fonte autoritativa — por releitura própria dos três relatórios nesta sessão,
não por aceitação de relato:**

| Relatório | Escopo | Vereditos lidos por mim, nominalmente | CONFIRMED | Outros |
|---|---|---|---|---|
| `T-25_..._RODADA3_A.md` §"TABELA DE VEREDITO" + resumo do bloco (`:17-22`) | 4 | `T-05-02`, `T-05-05`, `T-05-06`, `T-10-02` | **4** | 0 |
| `T-25_..._RODADA3_B.md` §tabela + "Placar do bloco" (`:23-28`) | 4 | `T11-F02`, `T11-F04`, `AUD-SERVICE-3` CONFIRMED; `T11-F10` FALSE_POSITIVE | **3** | 1 FP |
| `T-25_..._RODADA3_C.md` §tabela (`:17-20`) + `:143` | 4 | `T13-F01`, `T13-F04`, `T19-F02`, `T23-F02` | **4** | 0 (2 com recomendação de rebaixamento) |
| **TOTAL** | **12** | — | **11** | **1 FP** |

**Cadeia de resolução aplicada (Regra 20: evidência → teste → requisito → regra).** Não resolvi por
votação nem por autoridade do documento mais recente. **A evidência é aritmética e é fechada:** os
12 itens deixados em `NEEDS_MORE_EVIDENCE` pela Rodada 2 são **exatamente** os 12 avaliados nas
Rodadas 3-A/B/C — logo **nenhum deles podia estar entre os 20 da Rodada 2**, e **não existe dupla
contagem** que justificasse 8. Os três relatórios declaram os placares dos seus próprios blocos
(4 · 3+1FP · 4) e são internamente consistentes.

> **DETERMINAÇÃO: a fonte autoritativa é o conjunto dos três relatórios de rodada. O número correto
> é 11 `CONFIRMED` + 1 `FALSE_POSITIVE`. O "8" da Rodada 1 é erro aritmético meu, e é corrigido
> aqui.** Não escalo de novo: a divergência **resolveu-se por evidência**, que é o critério da
> Regra 20. **Origem provável do erro, registrada sem certeza:** 11 − 3 = 8, e os 3 subtraídos
> correspondem exatamente aos 2 findings rebaixados a MEDIUM (`T13-F01`, `T13-F04`) mais o
> `FALSE_POSITIVE` — isto é, a Rodada 1 provavelmente contou "CONFIRMED que permaneceram HIGH", e
> rotulou o resultado como "CONFIRMED". **A confusão é de rótulo, não de mérito: nenhum veredito de
> validação foi perdido, e nenhum finding mudou de estado por causa dela.**

### 3.2 Placar de validação — DE → PARA

| Estado | Rodada 1 | **Rodada 2** | Composição do delta |
|---|---|---|---|
| **CONFIRMED** por T-25 | 41 | **44** | correção de §3.1: 4 (R1 CRITICAL) + 9 (R1 HIGH) + 20 (R2) + **11** (R3) |
| **CONFIRMED** por T-28 (novo) | — | **10** | 5 do bloco JUR/RH + 5 do bloco SST/RFQ |
| **TOTAL CONFIRMED** | 41 | **54** | |
| **FALSE_POSITIVE** | 1 | **1** | T-28 produziu 0 |
| **REFUTED** | 0 | **0** | T-28 produziu 0 |
| **NEEDS_MORE_EVIDENCE remanescente** | 0 | **0** | T-28 produziu 0 |
| **`NEEDS_MORE_EVIDENCE` de origem** | 1 | **1** | `FIND-ERP-007` item 3 — pendência **procedimental** inalterada (§9.1) |
| **PROPOSED sem passagem pela Regra 22** | 211 | **268** | +50 MEDIUM/LOW/INFO de T-27 · +7 T-29 · +`AUD-DEP-JSYAML-01` (LOW) · +`AUD-CICD-DEPGATE-01` (MEDIUM). **A Regra 22 não os exige** |

**Declaração de conformidade com a Regra 22 — DE → PARA:**

- **DE:** 6 CRITICAL + 67 HIGH = 73 sob o regime; 72 com veredito registrado.
- **PARA:** 6 CRITICAL + 74 HIGH = **80 sob o regime**. Os **7 HIGH novos de T-27 têm veredito
  adversarial individual registrado por `T-28`**, com refutação estrutural comum tentada antes
  (banco, middleware, gate de rota) e falha nos três eixos.
- ⚠️ **UMA EXCEÇÃO FORMAL, que não escondo:** **`AUD-PROC-CUSTODIA-01` é HIGH e NÃO passou pelo
  `vericore-finding-validator`.** O próprio finding declara isso em §CABEÇALHO item 2 e §12 item 4.
  **A Regra 22 está descumprida para este ID enquanto ele permanecer HIGH.** Não o rebaixo para
  contornar a regra e não declaro a validação como feita. **Escalado ao director** (§9.3).
- **Registro de risco de calibração:** `T-28` bloco JUR/RH devolveu **5/5 CONFIRMED** e ele próprio
  escreveu que "5/5 confirmados é um resultado que, por si, merece desconfiança". O bloco SST/RFQ
  rebaixou **3 de 5**. A assimetria entre os dois blocos é registrada como fato, **não** como juízo
  sobre a qualidade de nenhum dos dois — os dois documentaram refutações tentadas com âncora.

---

## 4. DECISÕES DE SEVERIDADE E STATUS — **DE → PARA**, nunca silenciosas

> Toda alteração abaixo tem: o estado anterior, o novo, **quem** recomendou, **com que evidência**,
> e **o custo** da decisão. Nenhum enunciado técnico foi reescrito (Regra 15).

### 4.1 Os três rebaixamentos do bloco SST/RFQ — **ACOLHIDOS**

| ID canônico | DE | PARA | Recomendado por | Evidência que decidiu (avaliada por mim quanto à estrutura da prova; **não reli o código**) |
|---|---|---|---|---|
| **`T27-SST-F02`** | **HIGH** | **MEDIUM** | `T-28` §3.2 | O autor declarou "nenhum consumidor localizado"; **o validador procurou e resolveu a lacuna — e o resultado rebaixa**: em `server/src/modules/production` há **zero** ocorrências de SST/treinamento/blocklist; o único consumidor é **exibição** (`client/src/pages/sst/TrainingsTab.tsx:45-60`); e `RF-SST-046` (`REQUISITOS:123`) é requisito de **visibilidade**, não de bloqueio. Classe idêntica a `T12-M07` (lista falsa), já MEDIUM nesta run ⇒ **uniformidade de calibração** |
| **`T27-RFQ-04`** | **HIGH** | **MEDIUM** | `T-28` §3.4 | O autor mediu **uma** compensação; existem **duas**, ambas relidas: D-K a montante na requisição (`ChangePurchaseRequisitionStatusUseCase.ts:104`) e D-K + alçada G11 a jusante no pedido (`ChangePurchaseStatusUseCase.ts:127-143`). **Nenhum compromisso financeiro se materializa por uma única identidade.** O residual real é mais estreito: a **escolha do vencedor e do preço dentro de demanda já aprovada** |
| **`T27-RFQ-05`** | **HIGH** | **MEDIUM** | `T-28` §3.5 | Duas descobertas do validador: (i) o **caminho sequencial está fechado nos dois endpoints** e não há rota de reativação (`saleValidators.ts:99-104` é `.strict()` e não aceita `active`) ⇒ **só corrida real explora**; (ii) o invariante protege **tabela sem consumidor operacional** — nenhum use case de venda lê `customer_price_lists`. Acresce que **BR-COM-011 não tem fonte documental** ⇒ não há requisito descumprido |

**Por que acolho, sendo a severidade minha autoridade.** Mesmo fundamento aplicado na Rodada 1 §3.2
a `T13-F01`/`T13-F04`, e aplico-o simetricamente para não ter dois pesos: **a refutação é de
explorabilidade, não de fato.** Nos três casos o fato permanece `CONFIRMED` com âncora conferida
pelo validador; o que cai é a narrativa de dano. Severidade é função de impacto.

**Custo declarado destas três decisões, para que não sejam lidas como neutras:**

1. Os três **saem do regime obrigatório da Regra 22** e da faixa que o `AUDIT_PLAN.md` §11.2 item 2
   lista como pré-condição de veredito. **Isso já ocorreu de fato** (foram validados antes do
   rebaixamento), então o custo é retroativamente nulo — mas vale para eventual reabertura.
2. **`T27-SST-F02` não está resolvido**: o defeito é real e o efeito hoje é **relatório falso com
   subnotificação sistemática** em obrigação de NR. **Condição explícita de reelevação a HIGH,
   carregada por mim para o backlog:** no instante em que qualquer consumidor operacional (Apontamento
   de Produção, RNF-SST-06, previsto em `BLOCO_1_SST_API.md:645`) passar a chamar
   `GET /api/sst/trainings/blocklist` como gate, **volta a HIGH sem nova auditoria**.
3. **`T27-RFQ-04` não está resolvido**: favorecimento na escolha do vencedor permanece possível, com
   detecção dependente de diligência humana. **Reelevação a HIGH** se o dono declarar a adjudicação
   como 5º ato de D-K (`01-COMPRAS.md:57-62`) — hoje a regra **não existe** no artefato.
4. **`T27-RFQ-05` não está resolvido**: **reeleva a HIGH no momento em que `T27-RFQ-07` for
   remediado** (quando a tabela de preços ganhar consumidor de venda). Daí a dependência de ordem
   de §7.

### 4.2 Correções impostas pelo validador **contra os autores** — parte do finding, não anexo

`T-28` (bloco JUR/RH) impôs 3 correções e acolheu 2 refutações parciais. **Carrego-as porque elas
acompanham o finding à SanaCore** (declaração expressa do validador em §7).

| ID canônico | Correção imposta | DE (texto do autor) | PARA (texto validado) |
|---|---|---|---|
| **`T27-RH-H01`** | **Escopo — refutação parcial PROCEDENTE** | "o gate atingido é o de conclusão de **admissão**, de conclusão de demissão e de retorno de afastamento" — **3 consumidores** | **2 consumidores.** `ConcludeAdmissionProcessUseCase.ts:119-127` usa o **snapshot** `process.aso_result`/`aso_valid_until`, não `hasValidAso`. Grep de `hasValidAso`: **2 call sites** (`ConcludeTerminationProcessUseCase.ts:71`, `ReturnFromAbsenceUseCase.ts:96`). **Retirar a afirmação sobre admissão antes de remediar** (`DIV-T28-JR-01`) |
| **`T27-JUR-F07`** | **Base estreitada — refutação parcial PROCEDENTE** | "nenhum alerta e nenhum substituto" | **Existe controle detectivo real e alcançável** para a metade DSR: `SequelizeLgpdRequestRepository.ts:51-63` → `client/src/api/juridico.ts:1000-1002` → `LgpdTab.tsx:89`. **Porém é opt-in** (`:77` `useState(false)`, `:90` `enabled: criticalOnly`). **O que sustenta HIGH é a metade INCIDENTES** — zero preventivo, zero detectivo, **zero suporte de schema** (`enum_jur_legal_alerts_origin_type` não tem `lgpd_incident`, `baseline:1303-1309`) |
| **`T27-JUR-F01`** | **Correção factual de texto** | "sem trilha de reversão" | **Inexato.** Existe trilha **do evento e do autor** (`lgpdController.ts:134,147,159`); o que não existe é o **valor anterior** (`oldValues`) — objeto de `T27-JUR-F10` (INFO). **Dimensionar a remediação por "sem valores anteriores", não por "sem trilha"** |
| **`T27-RH-H02`** | **Correção de direção do erro** | impacto genérico | O erro é **sempre a favor do empregado** (30 dias quando o direito poderia ser menor). Risco de **custo indevido e registro legal incorreto**, **não** risco ao trabalhador. **Não rebaixa a severidade**; muda a priorização |
| **`T27-RH-H03`** | **Correção de causalidade jurídica** | "o defeito causa a dobra do Art. 137" | A dobra **é devida por força de lei** independentemente da coluna `status`. O defeito é a **falha do controle preventivo** (alertas 6/3/1 sem produtor nem destinatário). **Mudar o `status` sem criar o produtor autônomo não remedia nada** |

### 4.3 `AUD-DEP-JSYAML-01` → **LOW**, contra o rótulo HIGH do scanner — **registro do aceite humano**

**Não é decisão minha; é registro de decisão já tomada, que a consolidação precisa carregar.**

| Etapa | Ato |
|---|---|
| 1 | `DYN-T18-03` (`npm audit`, bateria dinâmica 01) reportou **1 HIGH ativo** em `server`: `js-yaml 3.0.0–3.15.0`, `CVE-2026-59870` |
| 2 | **Rodada 1** registrou como `OBS-T26-01` — **observação explicitamente NÃO promovida**, herdeiro natural T-18 |
| 3 | **Decisão do dono**, textual: *"Promova o achado js-yaml HIGH a finding formal e priorize para a SanaCore"* — autoriza **promoção e priorização**; **não fixa severidade** |
| 4 | `vericore-dependency-security-auditor` produziu o finding formal e atribuiu **LOW**, refutando o rótulo do scanner em **cinco eixos verificados por leitura própria**: `dev: true` + `npm prune --omit=dev` (`Dockerfile:16`) ⇒ fora do runtime de produção; zero referências a YAML em `server/src`; falha é **DoS por CPU**, não RCE; **o arquivo `.nycrc.yml` não existe**; e a pré-condição do atacante (write access) já dá RCE por outro caminho no mesmo carregador |

**`OBS-T26-01` muda de estado: DE `observação não promovida` → PARA `PROMOVIDA a
AUD-DEP-JSYAML-01`.** Não é fechada — é promovida, com rastreio.

**Registro obrigatório de escopo do aceite:** a decisão do dono **não** cobre os **14 HIGH de
`mobile`** e **12 HIGH de `tv`** da mesma bateria. O `js-yaml` de `mobile`/`tv` é **4.3.1, fora da
faixa afetada** — **não é este pacote**. Esses 26 HIGH **permanecem lacuna aberta sem finding
emitido**, herdeiro natural T-18. **Não podem ser lidos como cobertos por este finding.**

**Custo declarado:** ao ficar LOW, `AUD-DEP-JSYAML-01` **não entra** no regime obrigatório da
Regra 22. **Se o validador ou o director restabelecerem HIGH, a validação adversarial passa a ser
obrigatória antes de qualquer remediação.** O próprio autor recomenda que o validador o examine de
qualquer modo, porque a discordância com o scanner **é o mérito do finding**.

### 4.4 `AUD-CICD-DEPGATE-01` → **MEDIUM com gatilho explícito de elevação**

**Severidade MEDIUM**, com o alcance real do pipeline medido: sem `secrets.*` injetados, sem
registry, sem job de deploy, runner efêmero. **Gatilho de elevação a HIGH, carregado por mim para o
backlog e para o reteste** — qualquer um destes eleva, e **nesse caso a Regra 22 passa a ser
obrigatória**:

(a) `DYN-CICD-03` mostrar `GITHUB_TOKEN` com `contents: write` por default **e** ausência de branch
protection com review obrigatório (converge com `DYN-T22-01`, hoje `NOT_VERIFIED`);
(b) o pipeline passar a publicar imagem em registry ou injetar qualquer `secrets.*`;
(c) surgir job de deploy no mesmo workflow.

**Confiança declarada, não arredondada:** `CONFIRMED` quanto ao escopo do gate;
`MEDIUM_CONFIDENCE` quanto à contagem 640/854 (contagem de entradas de lock, não `npm ls`);
`NOT_VERIFIED` quanto às permissões efetivas do token.

### 4.5 Severidades **inalteradas**, registradas para não haver leitura silenciosa

- **`T27-SST-F01` permanece HIGH.** O validador considerou e **recusou** a calibração por
  `T12-M07`: aquele é **relatório falso**; este é **gate de escrita** que falha na metade do
  predicado para o qual existe, em ato de alçada `sst:approve`, produzindo registro probatório
  perante fiscalização NR-5. **Falha de gate ≠ falha de relatório.**
- **`T27-RFQ-01` permanece HIGH.** O argumento "upsert é decisão de produto" (JSDoc) justifica a
  correção de digitação; **não** justifica a janela aberta em `quoted` **somada** à ausência total
  de valor no log. As duas escolhas são independentes e ambas ausentes.
- **`T27-JUR-F01` permanece HIGH**, com agravante próprio do validador que o autor não explorou: a
  regressão mais destrutiva (`answered → in_progress`, `verify-identity`, `juridico.ts:164`) **não
  tem override de nível** e cai no gate base `operate` — é alcançável no **menor** privilégio do módulo.
- **Nenhum finding de `T-29` é CRITICAL ou HIGH.** Nenhum entra no `finding-validator` por severidade.

### 4.6 ⚠️ **Regra 24 — conformidade PROVADA, não presumida** (registro de peso igual ao de um finding)

`T-29` fecha o último vão da Regra 24 desta run. **DE:** a Rodada 1 registrava verificação própria
em T-01 (22/22), T-02 (15/15), T-04 (681), T-07, T-08, T-12 e T-16 (174), com `mobile`/`tv` **não
explorados**. **PARA:** `T29-C01` prova, por cadeia estática completa e sem elo inferido, que
`mobile/` e `tv/` **não violam a Regra 24**: as três ocorrências de `role` em `mobile/src` são
inertes (tipo + 2 comentários); o único header de identidade é `Authorization: Bearer`; o payload
do JWT declara apenas `{ id, passwordVersion, iat, exp }` (`middlewares/auth.ts:17-22`); e o
servidor **relê usuário e perfil do banco a cada requisição** (`:77-87`, `:114-126`). O ponto de
maior risco (`StartInventoryCountUseCase.ts:74`, `role !== 'admin'`) foi rastreado até o banco.

**Ressalva material que o veredito não dispensa, herdada e mantida:** a propriedade só vale enquanto
a assinatura for confiável — **`AUD-AUTHN-01` (CRITICAL) alcança o mesmo resultado por outro
caminho**. E `T29-MOB-F05` (LOW) registra que o `role` já está persistido no dispositivo: é
exatamente o insumo que uma futura tela "só admin vê isto" usaria, **criando a violação que hoje
não existe**.

---

## 5. **CATEGORIA SEPARADA — FINDINGS DE PROCESSO DA PRÓPRIA AUDITORIA**

> **Regra de contagem, fixada aqui:** finding cujo objeto é o **aparato de auditoria** (cadeia de
> custódia, hooks, credenciais de agente, taxonomia de agentes) **não é defeito do sistema
> auditado** e **não pode ser somado ao placar do ERP**. Conta em categoria própria, com placar
> próprio, e vai ao relatório final em seção própria. Somá-lo ao placar do produto inflaria o
> veredito sobre o ERP com um defeito que não é dele.

| ID | Sev. | Confiança | Objeto | Status |
|---|---|---|---|---|
| **`AUD-PROC-CUSTODIA-01`** | **HIGH** | `CONFIRMED` quanto ao fato e à causa-raiz técnica; `MEDIUM_CONFIDENCE` quanto à exaustividade da varredura de recorrência | Conexão de agente automatizado ao banco de **PRODUÇÃO REAL** (`erp_evok_audio`) durante o gate G4, sob proibição textual de `APR-2026-015/016/021/024` | **`PROPOSED` · ⚠️ Regra 22 NÃO cumprida** |

### 5.1 A descoberta material que este finding carrega — registrada com o peso que tem

**Não é o `SELECT count(*)` o achado. É o que a apuração encontrou embaixo dele.** Três fatos,
verificados por leitura direta de artefato versionado pelo autor do finding, e que eu **aceito de
relato sem reverificar** (§11.2):

1. **O hook aprova todo Bash incondicionalmente.** `.claude/settings.json:5` registra o `PreToolUse`
   para um matcher que **inclui `Bash`** — o que dá **aparência de cobertura**. Mas
   `.claude/hooks/org-isolation.js:134` executa, antes de qualquer outra avaliação,
   `if (!WRITE_TOOLS.has(tool)) return respond('approve', ...)`, e `WRITE_TOOLS` (`:67`) contém
   **apenas** `Write`, `Edit`, `MultiEdit`, `NotebookEdit`. **Todo comando `Bash` é aprovado
   incondicionalmente.**
   ⇒ **A Regra 23 do `CLAUDE.md` — "permissões são impostas por hooks e settings; o prompt é
   reforço, nunca o único mecanismo" — está DESCUMPRIDA para esta classe de risco.** Não é
   interpretação: é consequência lógica direta de `:134` × `:67`.
2. **A afirmação de governança não corresponde a mecanismo algum.** `coretriad/governance/APPROVALS.md:787`
   afirma que *"o guard que recusa banco sem sufixo de teste segue ativo"*. **Não existe tal guard
   em `.claude/`.** O "guard" real é a carta de responsabilidades do agente e a instrução do prompt.
   ⇒ **Divergência entre artefato de governança e mecanismo real (Regra 20)**, registrada e **não
   conciliada**. Ou o guard passa a existir, ou o texto é corrigido por adição — **decisão do
   dono/director**, fora do meu namespace (Regra 16).
3. **Uma credencial, dois bancos, zero separação.** Produção e teste são o mesmo container
   (`docker-compose.yml:3-4`); a role de runtime é `evok_admin` (`:48-49`); `evok_admin` é
   **superusuário** (`rolsuper = true`, medido em `DYN_VERIFICACAO_BATERIA_01.md:78-81`). **A única
   coisa que separa um comando de auditoria do dado real é o valor do argumento `-d`.**

### 5.2 Consequências que a consolidação precisa declarar, e declara

- **Nenhum finding de produto é invalidado.** A saída da consulta indevida (o inteiro `207`) **não
  foi usada como insumo de nenhuma conclusão** desta run. Confirmo por conferência própria do corpus
  consolidado: nenhuma conclusão desta consolidação depende dela — e a contagem de 207 tabelas que
  **eu uso** em §6 vem do **banco de teste recriado** e do schema versionado, não de produção.
- **Toda a bateria dinâmica 01 e toda a fila DYN correram sob esta ausência de controle.** Isso não
  invalida os resultados obtidos (que são de catálogo, no banco efêmero), mas **significa que a
  contenção dependeu inteiramente da disciplina dos agentes**. Registro como fato material para o
  director decidir sobre G4.
- **É o 5º incidente de processo da run** (`PROJECT_STATE.md:888-935` cataloga 4) e o **2º em que a
  contenção do dano dependeu exclusivamente da disciplina do agente, não de um mecanismo**. O
  próprio finding formula a leitura correta, e eu a carrego: *"um ato isolado dentro de uma classe
  recorrente não é um acidente, é uma taxa."*
- **O comportamento correto observado é parte do registro, não anexo.** O incidente **não foi
  detectado por controle** — foi **auto-reportado** pelo executor, com comando verbatim, sem
  minimização, em primeira seção do relatório, sem autoclassificar severidade. **Nenhum mecanismo o
  teria pego.** Precedente que carrego: **o auto-reporte não reduz a severidade, mas é o único
  motivo pelo qual este risco é hoje conhecido** — e deve ser tratado como comportamento esperado,
  nunca como confissão punível.
- ⚠️ **`AUD-PROC-CUSTODIA-01` é HIGH e não passou pela Regra 22.** **Escalado ao director** (§9.3).
  Não o rebaixo, não declaro a validação feita, e não o encaminho a remediação.

### 5.3 Relatórios de infraestrutura de evidência — absorvidos, sem finding

| Artefato | Natureza | Efeito na consolidação |
|---|---|---|
| `G4_PRECONDICAO_BANCO_TESTE.md` | Relatório de recriação do banco de teste | **Fecha `OBS-T26-02`** da Rodada 1 (banco contaminado por migration de branch SanaCore). O banco foi recriado do zero; a tabela contaminante (`jur_approval_thresholds`) confirmada ausente. **Origem primária de `AUD-PROC-CUSTODIA-01`, preservada íntegra (Regra 15)** |
| `G4_CREDENCIAL_ISOLADA_AUDITORIA.md` | Relatório de remediação em curso da causa-raiz §6.1 do finding de custódia | **Registrado, não validado.** Nada nesta consolidação aprova, valida ou dá por concluída essa correção — **a verificação é reteste futuro da VeriCore (Regra 4)** |

**`OBS-T26-02` muda de estado: DE `aberta` → PARA `ENDEREÇADA por G4_PRECONDICAO_BANCO_TESTE.md`.**
Não declaro fechada: o fechamento é ato do director.

---

## 6. RECONTAGEM DE TABELAS — determinação da fonte autoritativa (item 6 do mandato)

**Três números, três objetos diferentes. Não é divergência de medição: é divergência de objeto
medido — e a origem é `OBS-R3C-01`.**

| # | Número | O que foi medido | Fonte | Autoritativo? |
|---|---|---|---|---|
| M1 | **200** | `CREATE TABLE public.` em `server/database/postgresql/00_baseline_frozen.sql` | orquestrador | **NÃO** — mede **só o baseline**, que está **congelado entre as migrations `…-000032` e `…-000039`** |
| M2 | **207 tabelas / 478 FKs** | Banco de teste **recriado do zero** a partir das migrations de `main` (169 migrations) | `G4_PRECONDICAO_BANCO_TESTE.md:209,215,277,306` | **SIM** |
| M3 | **207** | Contagem estática de T-13: **200 do baseline + 7 tabelas criadas pelas 9 migrations pós-freeze** | `T-13_DADOS_E_SCHEMA.md` §2, reconciliado em `AUDIT_COVERAGE_EXECUTED.md:287` | **SIM — e é a mesma medida que M2, por caminho independente** |
| M4 | 208 tabelas / 480 FKs | Banco efêmero **contaminado** por migration da branch `sana/ERP-LEGACY-001/FIND-ERP-005` | `DYN-T13-03/04` (bateria 01) | **NÃO** — objeto contaminado; diferença de exatamente 1 tabela / 1 migration / 2 FKs, atribuída |
| M5 | 207 | Contagem de tabelas do banco de **PRODUÇÃO** | consulta **indevida** de `AUD-PROC-CUSTODIA-01` | **INADMISSÍVEL** |

> **DETERMINAÇÃO: o número autoritativo do `AUDIT_COMMIT` é 207 tabelas / 478 FKs.**
>
> **Fundamento (Regra 20 — evidência, não votação):** M2 e M3 são **duas medições independentes,
> por métodos disjuntos** (execução de migrations × contagem estática), que **coincidem exatamente**
> nos dois números. M2 é legítima porque incide sobre migrations de `main`, e o orquestrador
> verificou que `git diff --stat c1311a6..HEAD -- server/migrations` é **vazio** ⇒ as migrations de
> `main` **são** as do `AUDIT_COMMIT`.
>
> **Por que os três diferem — consequência direta de `OBS-R3C-01`:** M1 mede o **baseline
> defasado**; M2/M3 medem o **schema versionado completo**. A diferença de **7 tabelas** é
> exatamente a contribuição das 9 migrations pós-freeze. **A Rodada 1 usou 207 e estava correta**;
> o que faltava era a **explicação** de por que 200 ≠ 207, e ela é a mesma causa que rebaixou a
> confiança de `T13-F07` de ALTA para MÉDIA-ALTA.
>
> ⚠️ **Vedação registrada:** o fato de M5 também ser 207 **é coincidência sem valor probatório e
> NÃO pode ser citado como corroboração** — a evidência é inadmissível por origem
> (`AUD-PROC-CUSTODIA-01`) e o objeto é outro (banco de produção, não `AUDIT_COMMIT`).
>
> **Limite da minha determinação:** eu **não contei** as 7 tabelas nominalmente nem li o baseline
> nesta sessão. A atribuição "7 tabelas ⇐ 9 migrations pós-freeze" é aceita de `T-13` §2 e da
> reconciliação da Rodada 1 (§11.2).

---

## 7. **TABELA CONSOLIDADA DE DEPENDÊNCIAS DE ORDEM DE REMEDIAÇÃO** (item 8 do mandato)

> **Por que existe:** remediar fora de ordem **cria risco** — em três dos casos abaixo, corrigir o
> item B antes do item A **aumenta** a exposição, e num quarto a correção "óbvia" **não fecha o
> finding**. Recomendação técnica (Regra 6); a decisão de sequenciamento é do director/SanaCore.

| # | Ordem obrigatória / recomendada | Natureza | Fundamento, com fonte |
|---|---|---|---|
| **OR-01** | **`AUD-SERVICE-3` → `AUD-SERVICE-2`** | **Bloqueio técnico absoluto** | Rodada 3-B: *"corrigir `AUD-SERVICE-2` sem `AUD-SERVICE-3` é impossível"* — o contrato do repositório financeiro não prevê transação; não é corrigível no call site |
| **OR-02** | **`AUD-INTEG-01` junto de `FIND-ERP-001`** | **Pré-requisito técnico** | `reference_*` são descartados ⇒ a correção óbvia por `UNIQUE` seria **inócua**. E `T14-F03`/`BR-FIN-003` é **restrição de projeto** sobre a mesma remediação (rejeitar 2ª baixa sobre `partial` violaria a BR) |
| **OR-03** | **`AUD-CICD-DEPGATE-01` ANTES ou JUNTO de `T22-F01`** | **Inversão aumenta risco** | `AUD-CICD-DEPGATE-01` §6 e Nota ao director item 2: *"corrigir `T22-F01` (publicar imagem em registry) **antes** deste **eleva** o risco — cria o artefato envenenável que hoje não existe"*. ⚠️ **Correção ao enunciado do mandato:** o mandato descreveu a ordem como "`T22-F01` antes de `AUD-CICD-DEPGATE-01`"; **a fonte diz o inverso**, e adoto a fonte |
| **OR-04** | **`T27-RFQ-05` ANTES ou JUNTO de `T27-RFQ-07`** — **nunca depois** | **Inversão cria efeito econômico** | `T-28` §3.5: hoje a sobreposição de preços é cadastro órfão sem consumidor; **remediar `T27-RFQ-07` (vincular preço à venda) sem `T27-RFQ-05` transforma o ambíguo em efeito econômico e reeleva `T27-RFQ-05` a HIGH** |
| **OR-05** | **`T27-RFQ-01` ANTES de `T27-RFQ-04`** | **Par ordenado; restaura auditabilidade** | `T-28` §3.4: *"enquanto a cotação perdedora puder ser reescrita sem rastro, a detecção ex post do favorecimento é impossível"*. Remediar `-01` primeiro **reduz o residual de `-04`** |
| **OR-06** | **`T29-MOB-F03` JUNTO de `AUD-INTEG-04`** | **Mesmo endpoint, eixos distintos** | `AUD-INTEG-04` (HIGH) = ausência de transação/lock em `submit`; `T29-MOB-F03` (MEDIUM) = ausência de checagem de titularidade no mesmo `submit`. Remediação conjunta recomendada pela própria T-29 |
| **OR-07** | **`T27-SST-F01` — a correção "óbvia" NÃO FECHA** | **Alerta de escopo de remediação** | `T-28` §3.1: acrescentar `validade >= hoje` ao `where` **não fecha**. `CreateTrainingUseCase.ts:50-59` só calcula `validade` sob condições estreitas e `CreateTrainingMatrixUseCase.ts:28-31` **não exige** periodicidade ⇒ **`validade = NULL` é o caso MAJORITÁRIO**. Um filtro ingênuo troca "aceita vencido" por "rejeita todo mundo". **A remediação precisa decidir e registrar o significado de `validade IS NULL` — decisão do dono (Regra 6), não do agente.** Mesma decisão fecha `T27-SST-F02` |
| **OR-08** | **`T27-JUR-F07` — remediar só a metade DSR deixa resíduo HIGH** | **Escopo de remediação** | `T-28` §2: *"se a remediação tratar apenas a metade DSR, o resíduo continua HIGH"*. E a metade incidentes **exige migration de enum** (`enum_jur_legal_alerts_origin_type` não tem `lgpd_incident` — `OBS-T28-JR-02`), não só código |
| **OR-09** | **`T27-RH-H01` — anexar `T27-RH-L06` e `OBS-T28-JR-01`** | **Família de remediação** | `findValidAso` também aceita `valid_until IS NULL` (`T27-RH-L06`) e **não filtra `origin`** (`OBS-T28-JR-01`). Os três tocam a mesma função. **E retirar do texto a afirmação sobre conclusão de admissão** (`DIV-T28-JR-01`) antes de remediar |
| **OR-10** | **`T29-MOB-F01` e `T29-TV-F01` juntos** | **Mesmo defeito, dois artefatos** | Default `http://192.168.0.10:5000/api` idêntico em `mobile/src/config/env.ts:13,27` e `tv/src/config/env.ts:14,28`; nenhum dos dois tem `eas.json` versionado. Agravante só em `tv`: sessão renovada a cada 12h **indefinidamente** ⇒ ~1.440 exposições/dia do token em canal claro |
| **OR-11** | **`AUD-INTEG-03` — a correção server-side não terá dado de entrada** | **Restrição de remediação** | `T-29` §4.2: o app **não tem como informar** depósito/lote porque **nem UI nem contrato têm o campo** (`types.ts:22-27`). A correção exige mudança de **contrato e de tela**, não só de servidor |
| **OR-12** | **`AUD-PROC-CUSTODIA-01` — controle técnico de Bash antes de nova bateria dinâmica** | **Pré-condição de processo** | Enquanto `org-isolation.js:134` aprovar todo Bash, **nenhuma regra de banco é imponível por mecanismo** (§5.1). Recomendação ao director, não requisito de auditoria |

---

## 8. DEDUPLICAÇÃO E AGRUPAMENTO DOS 69 IDs NOVOS

**Método inalterado da Rodada 1:** `DUPLICATE` só quando é **o mesmo defeito, no mesmo objeto, com
a mesma âncora**. Eixos distintos sobre o mesmo objeto ⇒ `COMPLEMENTAR` (os dois permanecem, o
defeito conta **uma vez** na priorização). **Nenhum ID foi descartado.**

### 8.1 Duplicatas plenas novas: **ZERO**

Registro simétrico obrigatório: **nenhum dos 69 IDs novos é duplicata plena de ID pré-existente**, e
**nenhum é duplicata plena de outro ID novo**. Os quatro relatórios de T-27 auditaram superfícies
**disjuntas por construção** (endpoints fora dos clusters-âncora de T-09/T-12/T-10), e `T-29`
auditou diretórios (`mobile/`, `tv/`) que nenhuma outra trilha abriu. As duas validações de `T-28`
declararam expressamente **0 `DUPLICATE`**.

### 8.2 ⚠️ Uma possível duplicata **NÃO RESOLVIDA** — escalada, não arbitrada

| # | IDs | Objeto | Estado |
|---|---|---|---|
| **DUP-ABERTA-01** | `T27-JUR-F05` (MEDIUM, T-27 JUR) × os **21 call sites** de `T18-F01`/`T18A-F01…F11` | `PUT /corporate-acts/:id` — `{ id, ...req.body }` → `update(id, {...rest})` sem whitelist ⇒ `created_by` (NOT NULL) reescrevível | ⚠️ **NÃO DECIDIDA.** `T-27` declara textualmente: *"Não se afirma que T-18 errou — afirma-se que a interseção precisa ser conferida por quem tem o inventário dos 21"* (`DIV-T27-JUR-02`). **Não marco `DUPLICATE` sem evidência** (isso seria descartar finding sem rastreio) e **não marco `COMPLEMENTAR` sem conferir**. **ESCALADO ao director → T-18-A**, com o critério de decisão explícito: se o call site estiver entre os 21, `T27-JUR-F05` é `DUPLICATE` de `T18-F01`; se não estiver, o **placar de 21/21 de T-18-A precisa de correção por adição** |

### 8.3 Complementares novos — mesmo objeto, eixos distintos; contam **uma vez** na priorização

| # | IDs | Objeto comum | Eixos distintos, ambos preservados |
|---|---|---|---|
| **C-15** | `T29-MOB-F02` (MEDIUM) + `AUD-INTEG-09` (LOW, T-06) | `quantity` não-numérica no scan | T-06: `parseInt` × `parseFloat`, mobile sem Zod. T-29: **a única barreira contra `NaN` está no cliente** — `NaN <= 0` é `false`, atravessa `ScanItemUseCase.ts:48-54`, e `available < NaN` é `false` em `inventoryService.ts:142`. **T-29 declara "não é duplicata; o diretor decide se consolida"** — mantenho os dois, conto uma vez |
| **C-16** | `T29-MOB-F03` (MEDIUM) + `AUD-INTEG-04` (HIGH, T-06) | `POST /inventory-counts/:id/submit` | T-06: **ausência de transação/lock** ⇒ duplo ajuste. T-29: **ausência de checagem de titularidade** — `SubmitInventoryCountUseCase` **nem recebe `userId`** (`inventoryCountController.ts:260`). Ver **OR-06** |
| **C-17** | `T27-RFQ-05` (MEDIUM) + `T13-F02` + `T13-F03` (HIGH, T-13) | Constraint de unicidade ausente | Mesma família, **tabela distinta**: `customer_price_lists` **não está** listada em `T13-F02`/`F03`. T-27 leu a ausência **diretamente no baseline**, sem concluir por analogia. Handoff declarado a T-13 |
| **C-18** | `T27-RFQ-07` (MEDIUM) + `T-10-02` (HIGH) + `T08-F06` (HIGH) + BR-COM-009 | Política de preço efetivamente cobrado do cliente | T-27: a tabela de preços é **cadastro órfão** e o JSDoc afirma o contrário. T-10: desconto não chega ao recebível. T-08: base fiscal maior que a operação. **Somados: o preço cobrado não tem NENHUMA âncora de política no sistema** |
| **C-19** | `T27-RFQ-09` (LOW) + `T-10-07` (LOW) | Comentário normativo de rota que contradiz o middleware (nível `view` inexistente) | **Segunda ocorrência independente**, arquivo distinto (`sales.ts:15-16,22-23` × rota de ato aprovatório de T-10). A reincidência **prova que o defeito é de padrão, não de descuido** — `rfqs.ts:8-12` **não** incorre |
| **C-20** | `T27-JUR-F10` (INFO) + `AUD-DB-04`…`-09` (T-03) + `T18A-F01`…`F11` | Trilha sem `oldValues` / log ausente | T-27 **recusou-se a elevar** — D6 é titularidade de T-03, que declarou `E — 362/362`. *"Não se duplica severidade sobre trilha alheia (Regra 15)"*. Encaminhado a T-03 |
| **C-21** | `T27-SST-F06` (MEDIUM) + `AUD-DB-03` (HIGH, T-03) | Ausência de `logAction` | T-27 mede o caso concreto: `epiController.ts` **não loga nenhuma das 8 rotas**, incluindo `confirm` (ato `approve`, irreversível por trigger) e `DELETE /epi-matrix`. **Instância nominal do defeito que T-03 mede em superfície** |
| **C-22** | `T27-RH-M02` (MEDIUM) + `FIND-ERP-007` (MEDIUM) | Campo aceito e sem efeito | T-27 registra a **diferença material**, e eu a preservo: em `FIND-ERP-007` falta a coluna; aqui **o campo tem coluna e é gravado — o que falta é a regra**. *"Não reaudito o 007; registro que o padrão reaparece"* |
| **C-23** | `AUD-DEP-JSYAML-01` (LOW) + `AUD-CICD-DEPGATE-01` (MEDIUM) + `T18-F07` (MEDIUM) + `T22-F02` (MEDIUM) | Família "gate verde que não exerce o controle" | Quatro eixos **disjuntos**: pacote × **escopo do gate de dependências** × pontos cegos do scanner de segredos × ausência de validação de compose. `AUD-CICD-DEPGATE-01` §6 conferiu os quatro e declarou **não-subsunção** item a item |
| **C-24** | `AUD-CICD-DEPGATE-01` (MEDIUM) + `T22-F05` (HIGH) | Cobertura de pipeline | **Subsunção parcial declarada pelo autor:** as linhas `client`/`mobile`/`tv` da matriz de cobertura são **consequência de `T22-F05`** e ficam **atribuídas a ele**; `AUD-CICD-DEPGATE-01` **não emite achado próprio sobre elas** e as apresenta só como dimensionamento |
| **C-25** | `T27-SST-F03` (MEDIUM) + cluster PT de `T-12` | Escrita multi-tabela sem transação | `CreateWorkPermitUseCase.ts:45-53` tem o mesmo desenho, mas está no cluster-âncora de T-12 ⇒ **corroboração declarada, não achado novo**. Os 4 use cases do escopo próprio de T-27 são os que contam |
| **C-26** | `T27-SST-F02` (MEDIUM) + `T12-M07` (MEDIUM) | Lista/relatório falso por ausência de verificação ativa | Mesma classe; **foi a base explícita da calibração do rebaixamento** (§4.1). Objetos distintos (blocklist de treinamento × PT vencida) ⇒ não fundir |
| **C-27** | `T29-TV-F03` (corroboração) + `AUD-AUTHN-05` (MEDIUM, T-02) | Sessão sem vida absoluta | **Nenhum ID novo.** T-29 acrescenta o **consumidor** que T-02 não tinha: `tv/src/context/AuthContext.tsx:37-38,113-118` renova a cada 12h **indefinidamente, por requisito de produto declarado**. Isso **eleva o impacto real** sem mudar o enunciado — **reavaliação de severidade é do director** |
| **C-28** | `T27-SST-F01` + `T27-SST-F02` + `T29-*` + `FIND-ERP-008` | Padrão "defeito coberto por teste que o valida" | `T-28` §3.1 registra que `T27-SST-F01` é a **3ª ocorrência do padrão nesta run**; `T27-SST-F07` é a 4ª. **Registro simétrico:** `T29-C09` prova que o padrão de `FIND-ERP-008` (`tipo` hard-coded no cliente) **NÃO se repete** no `mobile` |

### 8.4 Agregadores — os dois da Rodada 1 recebem população nova, sem apagar nada

| Agregador | População nova subsumida (permanece vigente na trilha de origem) | Regra de contagem |
|---|---|---|
| **`T14-F05`** (HIGH) — regras vivas sem BR-ID | **+9 de `rh`** (escala do Art. 130, fracionamento §1º, vedação §3º, teto e prazo do abono Art. 143, dobra do Art. 137, 6% de VT, limite de equipe 0.3, validade de NR pela matriz SST) · **+6 de `rfq`/preços** (`T27-RFQ` §3) · **+`T27-SST-F19`**, que **quantifica**: **0 de 59 endpoints de `sst` têm regra no `BR_CATALOG.md`** · **+`T27-SST-F17`** (constantes sem BR-ID) · **+`T27-RH-M03`** (`0.3` sem fonte documental) | O **defeito de governança** conta **uma vez**. Os findings de origem contam nas suas trilhas porque cada um tem dano técnico próprio |
| **`T15-F06`** (HIGH) — elos sem instância | **+`T27-SST-F12`** (regra de conclusão de ação corretiva **não existe em artefato** — RA-08) · **+`T27-JUR-F03`** (janela de alerta de PI **sem fonte autoritativa fechada**) · **+`T27-RFQ` §3 BR-SUP-012** (*"vazio de regra confirmado"*: o critério de adjudicação existe só como **default de UI**) | Idem |

### 8.5 Divergências de severidade entre trilhas sobre o mesmo fato: **ZERO novas**

Nenhum par novo do tipo `DIV-SEV-01`. As três mudanças de severidade de `T-27` foram **decididas por
validador com evidência própria**, não são divergência entre duas trilhas de igual autoridade.
`DIV-SEV-01` (`T17-F05` × `T23-F03`) permanece **aberta e escalada** (§9.2).

### 8.6 Findings encaminhados que ninguém adjudicou — estado atualizado

| ID | DE (Rodada 1) | **PARA (Rodada 2)** |
|---|---|---|
| `T16-F15` (LOW) — `file_path` de documento de veículo | ⚠ não adjudicado por T-18 | ⚠ **INALTERADO — continua sem veredito** |
| `T21-F01` (MEDIUM) — `cost_price` incondicional em `GET /api/products` | ⚠ não adjudicado | ⚠ **INALTERADO.** `T-29` **não** o alcança: auditou `mobile`/`tv`, não `products`. O vão de `RES-T26-01` (16 endpoints de `products`/`assets`) permanece |
| `RES-T13-04` / `RES-T13-05` | ⚠ sem decisão do director | ⚠ **INALTERADO** |
| **`T27-JUR-F05` × 21 call sites de T-18-A** | — | ⚠ **NOVO — `DUP-ABERTA-01`** (§8.2) |
| **`T29-MOB-F03` — veredito de autorização** | — | ⚠ **NOVO.** T-29 declara: *"o veredito de autorização é do `authorization-auditor`"*. **Encaminhado a T-04/T-09; sem veredito** |
| **`T27-RFQ` §5 — 2 candidatos nominais ao denominador de `FIND-ERP-009`** | — | ⚠ **NOVO.** `POST /api/rfqs/:id/award` (ponto de aprovação **sem** segregação, com compensação parcial medida) e as **3 escritas de preço** (**sem** ponto de aprovação). **A incorporação é decisão de T-09/director** — não a faço |

---

## 9. ITENS QUE EXIGEM DECISÃO HUMANA OU DE OUTRA AUTORIDADE — **DE → PARA**

### 9.1 Escalonamentos da Rodada 1 — estado

| Item | Estado |
|---|---|
| §6.1 `OBS-R3A-01` (hipótese do espelho × `bom-tipo-nao-produtivo`) | ⚠ **INALTERADO — permanece HIPÓTESE.** Nenhuma das 7 entradas novas a testou. Continua sendo o pedido dinâmico mais barato e decisivo que resta |
| §6.2 `FIND-ERP-007` — pendência procedimental da `APR-2026-020` B.3 | ⚠ **INALTERADO.** Repeti a busca no corpus **ampliado** (T-27 ×4, T-28 ×2, T-29, 3 findings formais, 2 relatórios G4): **nenhuma evidência do retorno ao autor de origem**. Permanece `NEEDS_MORE_EVIDENCE`. **Reescalado** |
| §6.3 as 7 divergências abertas | ⚠ **TODAS INALTERADAS E AINDA ABERTAS** — ver §9.2 |
| §7 `OBS-T26-01` | ✅ **PROMOVIDA** a `AUD-DEP-JSYAML-01` (§4.3) |
| §7 `OBS-T26-02` (banco de teste contaminado) | ✅ **ENDEREÇADA** por `G4_PRECONDICAO_BANCO_TESTE.md` (§5.3) |
| §7 `OBS-T26-03` (catálogo DYN incompleto: ~103 declarados × ≈137 reais) | ⚠ **INALTERADO E AGRAVADO** — as 7 entradas novas acrescentam **≈30 pedidos DYN** (§9.4) |
| §7 `OBS-T26-04`/`-05` (aritmética e gap de numeração de T-08) | ⚠ **INALTERADOS**, e agora acompanhados de `OBS-T26-08`/`-09` (mesma classe, T-27) |
| §7 `OBS-T26-06` (encaminhados sem adjudicação) | ⚠ **INALTERADO e AMPLIADO** — §8.6 |
| §7 `OBS-T26-07` (cláusula de reabertura de IA não acionada) | ✅ **REFORÇADO.** Nenhuma das 7 entradas novas encontrou modelo de linguagem, embedding, agente autônomo ou decisão não determinística. **31 arquivos de `mobile`/`tv` lidos integralmente sem uma ocorrência.** A dispensa fica **mais** defensável — e **permanece PROVISÓRIA** (N-14 / G5 aberto) |

### 9.2 Divergências abertas — quadro consolidado (Regra 20 — nenhuma resolvida por votação)

| ID | Divergência | Estado | Encaminhada a |
|---|---|---|---|
| `DIV-SEV-01` | `T17-F05` MEDIUM × `T23-F03` HIGH | **ABERTA** | director |
| `ESC-T15-03` / `ESC-T15-05` | espaços de busca disjuntos T-14 × T-15 | **ABERTA** | dono (`APR-2026-019`) |
| `RES-T15-02` | 164 × 165 BRs; estatuto de `T14-F03` | **ABERTA** | director (escopo, Regras 12-14) |
| `DIV-T09-01` | `FIND-ERP-009`: 4 × ≥5 pontos de segregação | **ABERTA e AMPLIADA** — `T27-RFQ` acrescenta 2 candidatos nominais ao denominador (§8.6) | director → autor de origem |
| INV-01 × INV-02 | 673 × 676 × 683 endpoints | **ABERTA** — depende de definição que ninguém fixou | director |
| `PROJECT_STATE.md` §OBS-INV-01 desatualizado | fora do meu namespace (Regra 16) | **ABERTA** | director |
| **Rodada 3 de T-25: 8 × 11** | — | ✅ **RESOLVIDA por evidência** (§3.1) — **não escalo de novo** | — |
| **`DIV-T27-JUR-02` / `DUP-ABERTA-01`** | `PUT /corporate-acts/:id` está entre os 21 call sites de T-18-A? | **NOVA — ABERTA** | director → T-18-A |
| **`DIV-T27-JUR-03`** | "contratos (16)" de T-09 só fecha com `/reports/financeiro` dentro; o router o classifica como G7 Transversal. **Se prevalecer o router, DEF-01 fecha em 74/75, não 75/75** | **NOVA — ABERTA** | director (decisão de definição, não de evidência) |
| **`DIV-T27-RH-02`** | T-12 declara D3 `A ~14/57` cobrindo 4 clusters cuja população nominal é **27** ⇒ **≈13 endpoints de `rh` sem atribuição de profundidade** — nem T-12 os reivindica, nem T-27 os cobriu | **NOVA — ABERTA** | director |
| **`DIV-T27-RH-03`** | `RF-RH-060` documenta `TimeSheetSummary` (grão mensal, `faltas_injustificadas`); o implementado é `hr_time_import_*` (grão **diário**, booleanos). Entidade, grão e campo diferentes, **sem emenda do RF** | **NOVA — ABERTA** | dono (qual versão vale) |
| **`DIV-T27-SST-02`** | `vencido` no domínio de RF-SST-021: `REQUISITOS:78` **sim**, `API:355` **não**. **Dois artefatos oficiais incompatíveis; o código segue o segundo** | **NOVA — ABERTA** | director (Regra 21) |
| **`DIV-T28-SR-05`** | `RF-SST-046` é requisito de **visibilidade**; `BLOCO_1_SST_API.md:645` promete consumo por **gate** do Apontamento que não existe. **Determina se `T27-SST-F02` é defeito de relatório ou gate faltante** | **NOVA — ABERTA** | director (Regra 21) |
| **`DIV-T27-RFQ-06`** | Nenhuma regra de `rfq`/preço tem owner; `BUSINESS_RULE_CANDIDATES_*.md:203-204` atribui BR-SUP-011 a um **departamento** — departamento não é responsável por regra | **NOVA — ABERTA** | director (Regra 21) |
| **`DIV-T27-RH-01`** | T-12 declara `rh` com "5 validadores Zod"; glob próprio de T-27: **10 arquivos** (9 schemas + `rhEnums`). A cobertura de borda de `rh` é **maior** do que T-12 registrou | **NOVA — registro; não corrijo T-12** | registro (Regra 15) |
| **`DIV-T28-SR-02`** | Âncora de caminho errada na origem de `T27-RFQ-05` (`CreateCustomerPriceUseCase.ts` está em `.../use-cases/`, não em `.../use-cases/customer-price/`) | **NOVA — correção de âncora; não afeta o mérito** (linhas conferem) | registro |
| **`DIV-T29-01`** | Contagem de arquivos de `tv/`: orquestrador 16, medição própria da trilha **15** `.ts`/`.tsx` (16 com `babel.config.js`) | **NOVA — diferença de base de contagem, não de fato. Não material** | registro |

### 9.3 ⚠️ Escalonamentos **novos** ao director — de primeira ordem

1. **`AUD-PROC-CUSTODIA-01` é HIGH e não passou pela Regra 22.** Precisa de validação adversarial
   **antes** de qualquer encaminhamento a remediação. Não a substituo pelo auto-reporte do executor.
2. **A Regra 23 do `CLAUDE.md` está descumprida para a classe "comando de banco"** (§5.1), e
   **`APPROVALS.md:787` afirma um guard que não existe**. Ambos estão em `coretriad/` e em
   `.claude/` — **fora do meu namespace (Regra 16)**. Não escrevo lá; escalo.
3. **`AUD-DEP-JSYAML-01` LOW × HIGH do scanner:** recomendo que o `vericore-finding-validator` o
   examine **mesmo sendo LOW**, porque a discordância com o scanner é o próprio mérito do finding.
4. **G3 não está cumprido, e o déficit está medido** (§10 e o par de cobertura). Não declaro G3
   cumprido; declaro o que falta, com número.
5. **Decisão pendente do dono, explicitamente separada e ainda não tomada:** as **≈121 páginas do
   `client/`** não amostradas (`C-133`/`N-07`). **Não a antecipo e não a infiro.**
6. **26 HIGH de `mobile`/`tv` (`npm audit`) permanecem sem finding emitido** (§4.3) — lacuna aberta,
   herdeiro T-18.

### 9.4 Fila DYN — crescimento registrado

| Origem | Pedidos novos |
|---|---|
| `T-27` JUR | `DYN-T27-JUR-01`…`05` |
| `T-27` RH | `DYN-T27-RH-01`…`05` |
| `T-27` SST | `DYN-T27-SST-01`…`08` |
| `T-27` RFQ | `DYN-T27-RFQ-A`…`E` |
| `T-29` | `DYN-T29-01`…`04` |
| `AUD-DEP-JSYAML-01` | `DYN-DEP-01`…`03` |
| `AUD-CICD-DEPGATE-01` | `DYN-CICD-01`…`03` (o `-03` **decide MEDIUM × HIGH**; converge com `DYN-T22-01/02` — **um único pedido consolidado**) |

**≈30 pedidos novos.** O universo real passa de ≈137 para **≈167**, contra os ~103 catalogados pela
bateria — `OBS-T26-03` **agrava-se**. **Nenhum é pré-requisito de nenhum veredito acima**: os 10
CONFIRMED de T-28 e os 60 findings de T-27 são **provas de ausência de código ou de constraint**,
melhor demonstradas estaticamente. Os DYN são o **caminho natural de reteste** — autoridade do
director, não minha.

---

## 10. AGRUPAMENTO POR MÓDULO / CAUSA-RAIZ — grupos novos e grupos alterados

Os 14 grupos da Rodada 1 permanecem. **Adiciono 4 grupos** e registro a população nova dos
existentes. Cada grupo tem causa-raiz identificada **ou lacuna registrada**.

### **G-15 — Jurídico/LGPD: transição de estado sem gate de estado anterior** *(NOVO)*
**Causa-raiz:** *o módulo sabe fazer o gate — existe exatamente um correto, `UpdateCorporateActUseCase.ts:37-42`, na mesma passada — e não o replicou; e a camada de banco só tem predicados de estado **final**, que por construção não podem ler `OLD`.*
**Prova negativa exaustiva de módulo:** grep de `transaction|Transaction|sequelize.transaction|lock` em **todo** `server/src/modules/juridico/` ⇒ **zero ocorrências**.

| ID | Sev. | Status | Nota |
|---|---|---|---|
| `T27-JUR-F01` | **HIGH** | **CONFIRMED** (T-28) | 11 escritas; 3 gravam desfecho de obrigação legal com prazo e titular externo. **Regressão mais destrutiva alcançável em `operate`** |
| `T27-JUR-F07` | **HIGH** | **CONFIRMED**, base estreitada | Alerta prometido pelo contrato **nunca criado**; **`lgpd_incident` não existe no enum** ⇒ exige migration |
| `T27-JUR-F02`, `F03`, `F04`, `F05`, `F08` | MEDIUM ×5 | PROPOSED | datas de efeito jurídico do cliente sem validação; 3 janelas de PI × 1 implementada; guarda sobre campo inexistente; mass assignment (`DUP-ABERTA-01`); **`Boolean("false") === true`** derrota a verificação de identidade |
| `T27-JUR-F06`, `F09` | LOW ×2 | PROPOSED | 4 criações sem unicidade natural; `trade_secret` não aplicado na rota de vínculos; alerta de terceiro reconhecível |
| `T27-JUR-F10` | INFO | — | `oldValues` ausente — **C-20**, encaminhado a T-03 |

**Conformidades registradas com o mesmo peso (5):** valor de 30 dias documentado = implementado;
+15 dias do art. 19, II conferido em **três camadas** (doc × código × teste); justificativa
obrigatória **em ambos os sentidos** na decisão de incidente; alerta fatal indesativável **por
ausência estrutural de coluna** (forma mais forte possível); e `POST /ip-assets/:id/contracts`
**idempotente por prova de banco** — *a constraint foi verificada em vez de confiar no comentário,
que é exatamente o erro que `T13-F02`/`F03` documentam em outras tabelas*.

### **G-16 — RH: a regra existe, está correta, e está desligada** *(NOVO)*
**Causa-raiz:** *três mecanismos documentados como automáticos têm o produtor ausente — o insumo fixo em zero, o gatilho sendo "alguém abrir a tela", e o método feito para o trabalho com **zero call sites**; e o gate documental mais crítico (ASO) é reescrevível em nível `operate`, numa tabela que é a única do módulo sem trigger.*

| ID | Sev. | Status | Nota |
|---|---|---|---|
| `T27-RH-H01` | **HIGH** | **CONFIRMED**, **escopo corrigido para 2 gates** | `inapto → apto` por `PUT` em `operate`; o gate que sobrevive é o **retorno de afastamento > 30 dias** ⇒ risco à **integridade física do trabalhador** |
| `T27-RH-H02` | **HIGH** | **CONFIRMED** | Art. 130 CLT com insumo **permanentemente zerado**; **a fonte de dados JÁ EXISTE no `AUDIT_COMMIT`** — falta a ligação. **Não existe segundo produtor** de `entitled_days` |
| `T27-RH-H03` | **HIGH** | **CONFIRMED** | `findAllOpen()` e `CONCESSIVE_ALERT_WINDOWS_MONTHS` com **zero consumidores**; transição de status como **efeito colateral de leitura**, e **só na página corrente** |
| `T27-RH-M01`…`M07` | MEDIUM ×7 | PROPOSED | revisão de férias em 3 escritas sem transação, com estado intermediário **irrecuperável por desenho** (trigger impede apagar); concordância do empregado gravada e nunca exigida; limite de equipe `0.3` **com valor e sem dono**; 3 `check-then-act` em tabelas que **proíbem DELETE**; confirmação de gozo decidida fora da transação; categoria de benefício editável com adesões vivas; validade de treinamento congelada |
| `T27-RH-L01`…`L08` | LOW ×8 | PROPOSED | `GET` que escreve **sem `logAction`**; janelas de alerta como literal decorativo; RF × RF contraditórios; exceção documentada **com dono e sem controle compensatório**; `completed_at` sem teto; **`findValidAso` aceita `valid_until IS NULL`**; enum duplicado; cobertura de teste por regra |

**Conformidades registradas (5):** os 6% de VT documentado = implementado **com salário lido do
repositório e nunca do payload** — o exemplo mais limpo de conformidade de valor do escopo; Arts.
134/143/137 em funções puras **com citação legal verificada na fonte pelo autor**, incluindo
**correção documentada** de §2º→§3º e **divergência lei × requisito declarada e não escondida**;
`RF-INT-RH-SST-01` caso a caso com teste nos 4 ramos; `POST /time-imports/:id/confirm` é o **padrão
D4 correto** (transação + `FOR UPDATE` + guarda); e `.strict()` sem campo de texto livre como
desenho **deliberado e efetivo** contra laudo clínico (LGPD art. 5º II).

### **G-17 — SST: gates que verificam metade do predicado, e escrita multi-tabela sem transação** *(NOVO)*
**Causa-raiz:** *a regra crítica mora **dentro do repositório Sequelize**, e **nenhum teste do módulo instancia uma implementação Sequelize** — as regras são invisíveis à suíte por construção; e quatro use cases escrevem em N tabelas cujos repositórios **já aceitam** `transaction` e nunca o recebem.*
**Determinação pedida e dada:** *código, banco ou lugar nenhum?* → **lugar nenhum.**

| ID | Sev. | Status | Nota |
|---|---|---|---|
| `T27-SST-F01` | **HIGH** | **CONFIRMED** (T-28) | `findValidCipaTraining` **não filtra `validade`** — e o método se chama assim. **Ver OR-07: o filtro ingênuo não fecha** |
| `T27-SST-F02` | **MEDIUM** ⇩ | **CONFIRMED**, rebaixado (§4.1) | blocklist cega para `validade = null`, que é o caso **majoritário**. **Condição de reelevação registrada** |
| `T27-SST-F03`…`F12` | MEDIUM ×10 | PROPOSED | 4 use cases sem transação; **`POST /aso` com transação decorativa** (abre, grava a escrita principal **fora**, e faz rollback do que já foi commitado); GES/matriz EPI sem idempotência **com efeito de evento eSocial**; confirmação de EPI **irreversível por trigger, sem autor e sem log**; `reference_type` divergente **congelado por teste**; 4 pares criar/atualizar assimétricos; efetivo de brigada contado **sobre a página**; **duas implementações divergentes de "tem ASO válido"**; plano de exames **não determinístico**; ação corretiva sem regra em artefato |
| `T27-SST-F13`…`F18` | LOW ×6 | PROPOSED | CA validado contra data do corpo; sem vínculo entrega↔matriz; `estabilidade_inicio` nunca produzido; paridade da CIPA nunca confrontada; constantes sem BR-ID; paginação que falseia o `count` |
| `T27-SST-F19`, `F20` | INFO ×2 | — | **0 de 59 endpoints com regra no `BR_CATALOG.md`**; cobertura de teste por regra crítica **medida** |

**Conformidades registradas (6):** `ConfirmEpiDeliveryUseCase` é o **padrão correto do repositório
inteiro** (transação, `FOR UPDATE`, rollback, serviço externo na mesma `t`, guarda em app **e**
trigger); BR-SST-026 é o melhor caso de coerência app×banco; NR-10/24 meses é o **único caso do
escopo com o tripé completo** (documentado × implementado × testado); simplificações **declaradas**
no código e na resposta; `AddCandidateUseCase.ts:5-12` **declara no artefato versionado a regra
extra que criou** — oposto do anti-padrão "regra que só existe na conversa"; e as UNIQUEs de par
existem onde alguém pensou nelas ⇒ **a ausência é lacuna, não escolha, e o contraste interno prova**.

### **G-18 — Front-ends embarcados: regra que só existe num lado** *(NOVO)*
**Causa-raiz:** *nos dois apps a autorização é impecável — o papel nunca sai do cliente e o servidor relê tudo do banco a cada requisição; o que diverge é **validação e titularidade**, presentes só de um lado, e a configuração de build, que faz fallback silencioso para HTTP.*
**13 pares UI × backend verificados dos dois lados: 11 conformes, 2 divergentes. Nenhuma divergência é de autorização por papel.**

| ID | Sev. | Status | Nota |
|---|---|---|---|
| `T29-MOB-F01` + `T29-TV-F01` | MEDIUM ×2 | PROPOSED | fallback silencioso para **API em HTTP** sem a variável de build; **o default contradiz a intenção do projeto** (`.env.example` documenta HTTPS); **nenhum `eas.json` versionado** nos dois. Agravante só em `tv`: **~1.440 exposições/dia do token** em canal claro, por tempo indeterminado, em Wi-Fi de chão de fábrica |
| `T29-MOB-F02` | MEDIUM | PROPOSED | **`NaN <= 0` é `false`** — a única barreira de tipo está no cliente — **C-15** |
| `T29-MOB-F03` | MEDIUM | PROPOSED | exclusividade do claim imposta **exatamente uma vez** (no `start`) e depois desaparece; `submit` **nem recebe `userId`** — **C-16**, **OR-06** |
| `T29-MOB-F04` | MEDIUM | PROPOSED | resolução do código escaneado casa **por `code` OU por `id`**; código curto numérico casa com o produto de mesmo `id`; **a tela só mostra qual produto casou DEPOIS de gravar** |
| `T29-MOB-F05` | LOW | PROPOSED | `role` persistido no dispositivo **sem nenhum uso pela UI** — minimização; e é o insumo de uma futura violação de Regra 24 |
| `T29-TV-F02` | LOW | PROPOSED | painel de parede sem minimização para a audiência: **a fronteira de confidencialidade é física e nenhum controle do sistema a modela** |

**Conformidades registradas (12, `T29-C01`…`C12`) — com o mesmo peso dos findings:** Regra 24 não
violada (§4.6); **`userId` do servidor não é sobrescrevível pelo corpo** — `userId: user.id` vem
**depois** do spread, **contraste explícito com `T16-F04a`/`T18A-F09`, onde a ordem invertida gerou
finding**; token em `expo-secure-store`, nunca `AsyncStorage`; zero segredo embarcado nos 31
arquivos; 401 global limpa a sessão; `GET /movements` não vaza dado de usuário; 403 tratado como
estado definitivo na TV; **nenhuma tela escondida por permissão de UI** — a classe "rota escondida
no cliente e aberta no backend" **não existe aqui**; `type` de movimentação vem de escolha do
usuário ⇒ **o padrão de `FIND-ERP-008` não se repete**; `details`/stack nunca renderizados; zero
cache em disco; e o guard de UI **não é o único controle** — removê-lo não abriria dado nenhum.

### Grupos existentes que recebem população nova

| Grupo | População nova |
|---|---|
| **G-02** Idempotência de estoque | `T29-MOB-F02`, `T29-MOB-F03` (**C-15**, **C-16**); corroborações de `AUD-INTEG-03` e `AUD-INTEG-02` com **sintoma de UI documentado** — o operador aperta "Entrada"/"Saída" e o histórico do próprio app renderiza **"Ajuste"** |
| **G-03** Alçada e segregação | `T27-RFQ-04` (MEDIUM), `T27-RFQ-08` (MEDIUM — **ponto de aprovação ausente**, não ponto sem segregação), 2 candidatos nominais ao denominador de `FIND-ERP-009` (§8.6). **`T27-RFQ-11` item 6 registra que `CAND-AUTHZ-01` NÃO se reproduz nas 11 rotas** — `award` declara `'approve'` explícito |
| **G-06** Trilha de auditoria | `T27-JUR-F10` (**C-20**), `T27-SST-F06` (**C-21**), `T27-RFQ-06`, `T27-RH-L01` |
| **G-08** Integridade no schema declarado | `T27-RFQ-05` (**C-17**), `T27-JUR-F06`, `T27-SST-F05` |
| **G-10** Financeiro | `T27-RFQ-01`, `T27-RFQ-07` (**C-18**) |
| **G-11** Governança de rastreabilidade | população nova dos dois agregadores (§8.4) |
| **G-13** Compliance regulado | todo o **G-15**, **G-16** e **G-17** convergem: *o sistema implementa o **registro** da obrigação e não o **efeito** dela*. `T27-RH-H03` e `T27-JUR-F07` **reconfirmam por caminho independente** a prova negativa exaustiva de `T12-M02`: **não existe agendador em `server/src`** |
| **G-14** Plataforma e custódia | `AUD-CICD-DEPGATE-01`, `AUD-DEP-JSYAML-01` (**C-23**, **C-24**), `T29-MOB-F01`, `T29-TV-F01` |

---

## 11. LIMITES DESTE AGENTE — declaração explícita, sem atenuação

### 11.1 Por leitura própria e integral nesta sessão

`CLAUDE.md`; `AUDIT_PLAN_EMENDA_02.md` (integral); `T-26_CONSOLIDACAO.md` (integral, 928 linhas);
`AUDIT_COVERAGE_EXECUTED.md` §3, §4, §5, §6, §7; **os 4 relatórios de `T-27` (integrais)**; **os 2
relatórios de `T-28` (integrais)**; **`T-29_MOBILE_TV.md` (integral)**; **`AUD-DEP-JSYAML-01.md`,
`AUD-CICD-DEPGATE-01.md` e `AUD-PROC-CUSTODIA-01.md` (integrais)**;
`T-25_VALIDACAO_ADVERSARIAL_RODADA3_A/B/C.md` (tabelas de veredito e placares — **releitura
dirigida para a determinação de §3.1**); `T-25_VALIDACAO_ADVERSARIAL_RODADA2.md` (tabela de
veredito, dirigida); `G4_PRECONDICAO_BANCO_TESTE.md` (dirigido, contagens).

**Toda a aritmética deste documento foi refeita por mim e fecha:** 254 + 60 + 7 + 2 = 323; 322
vigentes; conferência por severidade; enumeração ID a ID dos 60 de T-27 (10 + 18 + 20 + 12); a
recontagem 4 + 3 + 4 = **11** das Rodadas 3-A/B/C; e o recálculo célula a célula do par de cobertura.

**Toda a análise de deduplicação de §8 é minha**, por comparação de âncoras e enunciados entre
relatórios: **0 duplicatas plenas, 1 possível duplicata escalada, 14 complementares novas, 2
agregadores com população nova**.

**O mapeamento canônico de ID de §1 é meu**, exceto os 10 HIGH, que herdo de `T-28`.

### 11.2 Aceito de relato de outra trilha, **SEM reverificar**

1. **Toda âncora `arquivo:linha` dos 324 IDs. Não abri um único arquivo de `server/src`,
   `client/src`, `mobile/`, `tv/`, `server/database`, `server/migrations`, `server/tests`, `docs/`,
   `.claude/` ou `product/` nesta sessão. Zero.** Se uma âncora está errada, **este documento repete
   o erro**.
2. **Todo veredito de mérito do `vericore-finding-validator`** (T-25 e T-28), inclusive os 3
   rebaixamentos de §4.1 e as 5 correções de §4.2. Avaliei a **estrutura da prova** — é interna? é
   fechada? tem contraprova? converge com outra trilha? — e a **consistência com o corpus**. **Não
   reli `SequelizeCipaRepository.ts`, `SequelizeTrainingRepository.ts`, `AwardRfqUseCase.ts`,
   `CreateCustomerPriceUseCase.ts`, `RecalculateVacationAccrualPeriodUseCase.ts`,
   `ConcludeAdmissionProcessUseCase.ts` nem `00_baseline_frozen.sql`.**
3. **Toda declaração de cobertura, contagem de superfície e severidade original de cada trilha** —
   incluindo `E 37/37`, `E 30/30`, `E 59/59`, `E 11/11` e `16/16 + 15/15 arquivos lidos`.
4. **Os três fatos materiais de `AUD-PROC-CUSTODIA-01` §5.1** (hook, `APPROVALS.md:787`,
   credencial única). **Não abri `.claude/hooks/org-isolation.js`, `.claude/settings.json` nem
   `docker-compose.yml`.** São verificáveis por qualquer um; eu não os verifiquei.
5. **Toda a evidência de git** (`E1`, `E2`, `E3`, o `git diff --stat` desta sessão) — coletada pelo
   **orquestrador**, não por agente VeriCore. **Não a reexecutei. Não uso Bash**; a regra derivada
   `IN-08` de T-00 vale para mim: **não faço nenhuma afirmação própria de proveniência de commit**.
6. **Toda a bateria dinâmica e as contagens de `G4_PRECONDICAO_BANCO_TESTE.md`** (207/478,
   208/480, a ausência da tabela contaminante). Nenhuma conexão de banco, nenhum teste, nenhum comando.
7. **A contagem 640/854 de `AUD-CICD-DEPGATE-01`**, que o próprio autor declara
   `MEDIUM_CONFIDENCE`, e a identidade do `CVE-2026-59870`, que `AUD-DEP-JSYAML-01` declara
   **não verificável por artefato do repositório**.

### 11.3 O que esta consolidação **não** pode oferecer

- A dedup que apliquei é **sintática** (mesmo objeto, mesma âncora, mesmo enunciado) — **não
  semântica**. Dois findings com âncoras e vocabulário diferentes sobre o mesmo defeito **podem ter
  escapado**. Risco **aumentado** nesta rodada: os 60 IDs de T-27 vêm de superfícies que nenhuma
  trilha anterior leu em profundidade, o que **reduz** a chance de duplicata com o corpus antigo,
  mas o volume de comparações cresceu 27%.
- Um erro de contagem, severidade ou âncora cometido por uma trilha e não detectado pelas rodadas de
  validação **propaga-se integralmente** para este documento. Registrado como `RES-T26-03`/`-04` no
  par de cobertura, agora acrescido de `RES-T26-05`…`-07` (Rodada 2).
- **`DUP-ABERTA-01` é o único caso em que eu deveria decidir e não decido** — porque decidir sem o
  inventário dos 21 call sites seria descartar finding sem evidência (vedado) ou duplicar o placar.

---

## 12. Encerramento

- Nenhum arquivo do objeto auditado foi criado, alterado, corrigido ou refatorado (Regra 2). Nenhuma
  escrita em `server/src`, `client/src`, `mobile/`, `tv/`, `tests/`, `product/`, `requirements/`,
  `architecture/`, `server/database`, `docs/`, `.claude/` ou `coretriad/`.
- Nenhuma evidência histórica pertencente a outra organização foi alterada (Regra 15).
  `G4_PRECONDICAO_BANCO_TESTE.md` e os 4 relatórios de T-27 permanecem íntegros; **este documento é
  adição, nunca reescrita**. Onde alterei severidade ou status, está em §4, com DE → PARA, decisão,
  fundamento e autor da recomendação.
- **Nenhum finding novo foi criado (Regra 6).** Os achados materiais desta passada estão em §13 como
  **observações explicitamente não promovidas**.
- Nenhuma regra de negócio, requisito ou aprovação foi inventada. **Nenhum OWNER foi decidido,
  sugerido ou inferido** (G9, `APR-2026-019` parte 2) — inclusive nos casos em que quatro trilhas
  novas escalaram exatamente essa lacuna.
- **Nenhum finding foi descartado.** 1 `FALSE_POSITIVE` e 6 `DUPLICATE` da Rodada 1 permanecem
  marcados com rastreio e canônico nomeado; **0 novos `DUPLICATE`**; **1 possível duplicata
  formalmente escalada com critério de decisão publicado**.
- **Este documento NÃO declara `AUDIT_PASSED`, `FINDINGS_CONFIRMED`, `RETEST_PASSED`,
  `FINDING CLOSED` nem `REMEDIATION COMPLETE`.** Nenhum `RETEST_PASSED` e nenhum `FINDING CLOSED` de
  `FIND-ERP-001` ou `FIND-ERP-005` pode sair desta run (Regras 4 e 14). **Não declaro G3 cumprido**
  — declaro, medido, o que falta.

**Entrega:** ao `vericore-audit-reporting-agent`, com o par obrigatório
`24-coverage/AUDIT_COVERAGE_EXECUTED_RODADA2.md`.
**Escalonamentos abertos ao `vericore-software-audit-director`:** §9.2 (16 divergências), §9.3 (6
escalonamentos de primeira ordem, incluindo **a Regra 22 descumprida para `AUD-PROC-CUSTODIA-01`** e
**a Regra 23 descumprida para comandos de banco**), §8.2 (`DUP-ABERTA-01`) e §13.

---

## 13. OBSERVAÇÕES — **explicitamente NÃO PROMOVIDAS a finding**

**Nenhuma recebe ID de finding, severidade ou confiança. Criar finding não é atribuição deste papel
(Regra 6 e mandato).**

| ID | Observação | Herdeiro natural |
|---|---|---|
| **`OBS-T26-08`** | `T-27_DEF-01_JURIDICO` §0 declara "9 findings / 4 MEDIUM"; a enumeração por ID dá **10 findings / 5 MEDIUM**. Mesma classe de `OBS-T26-04` (T-08). **Adotei a enumeração** | T-27 / director |
| **`OBS-T26-09`** | O sumário de `DEF-02A` (e o enunciado do mandato) fala em **11 findings**; a enumeração por ID dá **18** (`H01`–`H03`, `M01`–`M07`, `L01`–`L08`). **Adotei a enumeração** | T-27 / director |
| **`OBS-T26-10`** | Existem **QUATRO** séries `DIV-T27-*` colidentes (não duas, como o mandato informou) e **DUAS** séries `DIV-T28-*` colidentes. Requalificadas em §1.3 | director |
| **`OBS-T26-11`** | `T-27 DEF-02B` afirma que `sst` D3/D4 fecha em **75/75** ("16 sob condições de T-12"). Contra a declaração de T-12 (`A ~24/132`, ≈10 em `sst`), **≈6 endpoints dos clusters-âncora de `sst` ficam sem atribuição de profundidade**. Simétrico de `DIV-T27-RH-02`, que a trilha de RH **declarou** e a de SST **não** | director |
| **`OBS-T26-12`** | Erro aritmético interno **na minha própria Rodada 1**: `AUDIT_COVERAGE_EXECUTED.md` §7.1 linha 1 diz "9 entregues / 6 não" para C-01…C-15; a composição declarada soma **7 entregues / 8 não**. Corrigido no par de cobertura desta rodada | eu mesmo — corrigido |
| **`OBS-T26-13`** | **Descoberta material de `AUD-PROC-CUSTODIA-01`:** `org-isolation.js:134` aprova **todo** Bash ⇒ **Regra 23 descumprida** para a classe "comando de banco"; e `APPROVALS.md:787` afirma um guard de banco que **não corresponde a mecanismo algum**. Consequência transversal: **toda a fila DYN executada até aqui correu sem controle técnico** | **dono / director** (`coretriad/` e `.claude/` — Regra 16) |
| **`OBS-T26-14`** | Os **26 HIGH de `npm audit` em `mobile` (14) e `tv` (12)** permanecem **sem finding emitido e sem investigação individual**. `AUD-DEP-JSYAML-01` §5 declara expressamente que **não os cobre e não deve ser usado como registro deles** | T-18 |
| **`OBS-T26-15`** | `T-29` registra que o controle detectivo de LGPD é **opt-in por desenho de UI** (`LgpdTab.tsx:77` `useState(false)` + `:90` `enabled: criticalOnly`) — `OBS-T28-JR-03` recomenda **verificar o mesmo padrão em outros painéis "críticos" do `client/`**. Isso **cruza diretamente com a decisão pendente do dono sobre as ≈121 páginas do `client/`** | **dono** (decisão sobre `C-133`) |
| **`OBS-T26-16`** | `T-29` §4.3 registra um **not-a-finding** com prova: `ScanItemUseCase.ts:63-64` checa saldo fora de lock, **mas `validateAndLock` relê sob `FOR UPDATE` e rejeita com 422**. Registrado para que não seja "redescoberto" como buraco nem removido por remediação sem análise. Mesma função do `T27-RFQ-12` (INFO) | registro |
| **`OBS-T26-17`** | `T-28` (SST/RFQ) §6 registra, **em favor dos autores**, que os três rebaixamentos decorreram de **evidência que os autores não tinham medido, não de erro de leitura**: todas as âncoras citadas por eles e relidas pelo validador **conferem**. Registro porque a leitura contrária (autores erraram) seria injusta e falsa | registro |
| **`OBS-T26-18`** | O `T-28` do bloco JUR/RH registra desconforto próprio com **5/5 CONFIRMED** e descreve o método com que tentou evitar viés (3 refutações estruturais comuns atacadas **antes** de olhar finding a finding). O bloco SST/RFQ rebaixou **3/5**. **A assimetria é fato registrado, não juízo** sobre nenhum dos dois | director |
