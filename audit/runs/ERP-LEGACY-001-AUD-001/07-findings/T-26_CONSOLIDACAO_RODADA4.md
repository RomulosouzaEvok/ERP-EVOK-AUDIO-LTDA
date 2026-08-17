# T-26 — CONSOLIDAÇÃO · **RODADA 4** (pós-T-35/T-36/T-37 e retificações de soft delete) · ERP-LEGACY-001-AUD-001

```
AUDIT_ID:      ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f   (única referência de leitura)
TRILHA:        T-26 — Consolidação e cobertura executada · RODADA 4
PRODUZIDO POR: vericore-audit-consolidator
DATA:          2026-08-16
REGIME:        read-only. Zero conexão de banco, zero execução, zero comando, zero requisição HTTP.
NATUREZA:      **ATUALIZAÇÃO RASTREÁVEL** das Rodadas 1, 2 e 3 de `T-26`. **Nenhuma linha de
               nenhuma rodada anterior foi reescrita, apagada ou renumerada (Regra 15).** Toda
               mudança está declarada em DE → PARA, com motivo e autor da recomendação. NÃO emite
               finding novo (Regra 6). NÃO corrige nada (Regra 2). NÃO declara `AUDIT_PASSED`,
               `FINDINGS_CONFIRMED`, `RETEST_PASSED`, `FINDING CLOSED` nem `REMEDIATION COMPLETE`
               (Regras 3, 4, 18). NÃO altera severidade fixada pelo dono (Regra 18).
LEITURA:       este documento não substitui as Rodadas 1, 2 e 3. Os quatro só valem lidos juntos.
               Onde divergirem, **prevalece esta Rodada 4**, e cada divergência está registrada.
PAR DE COBERTURA: ⚠️ **CONTINUA NÃO EXISTINDO.** `24-coverage/` contém apenas
               `AUDIT_COVERAGE_EXECUTED.md` e `AUDIT_COVERAGE_EXECUTED_RODADA2.md` (verificado
               nesta sessão). A ressalva da Rodada 3 §7.3 item 1 **permanece válida e está
               AGRAVADA**: o par vigente agora está **dois corpora atrás** (anterior a T-31…T-34
               E a T-35…T-37). Ver §7.4.
```

---

## 0. O que esta rodada absorve

| Origem | Natureza | IDs novos |
|---|---|---|
| `T-35_C137_SEMANTICA_COLUNA_LOTE2.md` | trilha (célula `C-137`, lote 2 — 18 tabelas Tier A + 38 Tier B parcial) | 11 (`T35-EST-F01`, `T35-RH-F02`, `T35-PAT-F03`, `T35-CTB-F04`, `T35-EST-F05`, `T35-DIN-F06`, `T35-PRD-F07`, `T35-RH-F08`, `T35-JUR-F09`, `T35-LGPD-F10`, `T35-META-F01`) |
| `T-36_VALIDACAO_T35.md` | validação adversarial dos 3 HIGH de T-35 (Regra 22) + resolução da divergência "soft delete" | — |
| `AUD-RH-VTHORISTA-01.md`, `AUD-EST-TRUNCCADEIA-01.md`, `AUD-PAT-DEPRECIACAO-01.md`, `AUD-RH-COMISSAO-01.md` | findings formais promovidos por decisão humana (2026-08-16) | 4 |
| `T-03_RETIFICACAO_01.md` | retificação do autor de origem de `T-03`/`AUD-DB-09` + emissão de `AUD-ALOG-01` | 1 (`AUD-ALOG-01`) |
| `AUD-DB-09_RETIFICACAO_01.md` | retificação do titular de `T-13`/`T-31`/`T-35` (inventário de 34 tabelas; anexos `RET01-A1`…`A7`) | — (7 anexos, não são findings) |
| `T-37_VALIDACAO_AUD-ALOG-01.md` | validação adversarial de `AUD-ALOG-01` (Regra 22), decisão de autonomia e correção do universo 13→14 | — |

**Não toca:** nenhum enunciado técnico, severidade original, âncora ou autoria dos IDs das Rodadas
1–3 que não estejam nominalmente listados em §2, §3 e §4. As pendências das rodadas anteriores que
nenhuma dessas entradas responde **continuam abertas e estão relistadas** (§6).

### 0.1 ⚠️ Divergências entre o mandato desta rodada e os artefatos — **o artefato vence (Regra 7)**

| # | O mandato diz | O artefato diz | Adotado |
|---|---|---|---|
| **MND-R4-01** | "os **6** `DUPLICATE` da rodada 1 … faixa **434–440**" | A Rodada 1 marca **7** IDs como `DUPLICATE`: os 6 pares de `T-26_CONSOLIDACAO.md` §2.1 (`D-01`…`D-06`) **mais `AUD-T01-08`**, marcado `DUPLICATE` em §2.4 (`DIV-SEV-02`, `:151`) e reafirmado em `:491`. O encerramento da própria Rodada 1 (`:916`) declara "6", **contra o corpo do próprio documento** | **7, por enumeração.** O número determinado de §2.1 é **433**, fora da faixa do mandato. Inconsistência interna da Rodada 1 registrada como `OBS-T26-29` |
| **MND-R4-02** | "`T35-DIN-F06` **foi ampliado** pela retificação" | `AUD-DB-09_RETIFICACAO_01.md` §5 titula **"AMPLIADO em escopo, MEDIUM mantida"** e, no fecho, formula a emenda como *"recomendação ao director"*. **O autor da retificação é o próprio titular de `T-35`** (autor de `T35-DIN-F06`), logo a ampliação é ato do autor de origem, dentro da sua autoridade | **Ampliação efetiva acolhida** (3 entidades de escrita); o despacho formal do director sobre a emenda do critério de reteste fica registrado como pendência (§6.2, T-17) |
| **MND-R4-03** | "reexame `AUD-DB-04…-09`" listado entre as **pendências do dono** | `AUD-DB-09_RETIFICACAO_01.md` §4 endereça o reexame **ao director** (*"Recomendo formalmente ao director reexaminar"*) | **Pendência do director** (§6.2, T-16), não do dono |

---

## 1. REGRA DE ID — aditivos desta rodada

As regras das Rodadas 2 §1 e 3 §1 permanecem integralmente vinculantes. Acrescento:

> 1. **`RET01-A1`…`A7` NÃO são findings.** São **anexos de evidência** com finding de destino
>    obrigatório (§4.4). Referência sem o destino é rejeitada.
> 2. **Os itens internos de `AUD-ALOG-01` são referenciados como `AUD-ALOG-01/A`…`/H`**, mais
>    `/sales-parcial` e `/production-parcial` (o 14º caso, `T-37` §4). "Item A" sem o finding é ambíguo.
> 3. `DYN-T35-01`…`-07` e `DYN-T03-07` entram na fila DYN com esses nomes; `LIM-T37-01` é limitação
>    de validação, não finding.
> 4. `AUD-RH-VTHORISTA-01`, `AUD-EST-TRUNCCADEIA-01`, `AUD-PAT-DEPRECIACAO-01`, `AUD-RH-COMISSAO-01`
>    e `AUD-ALOG-01` não têm forma curta.

---

## 2. PLACAR CONSOLIDADO — **DE → PARA**, com o delta decomposto

### 2.1 ✅ `OBS-T26-19` RESOLVIDA POR ENUMERAÇÃO — a base da Rodada 3 é **433**, não 440

A Rodada 3 §2.6 deixou aberto se os `DUPLICATE` da Rodada 1 estavam dentro ou fora dos 253
vigentes. **Reabri a enumeração da Rodada 1 nesta sessão e determinei:**

1. **Os IDs marcados `DUPLICATE` estão DENTRO dos totais por trilha da Rodada 1** (`T-26_CONSOLIDACAO.md`
   §1.3). Prova por enumeração das trilhas de origem, refeita por mim:
   - `T-04` emite exatamente **7** IDs (`AUD-SEC-T04-01`…`-07`, `T-04_TRANSVERSAL_AUTHZ.md:136-142`) e a
     Rodada 1 conta `T-04 = 7` — logo inclui os 3 marcados (`-02`, `-03`, `-07`);
   - `T-18` emite **14** (`T18-F01`…`F14`) e a Rodada 1 conta 14 — inclui `T18-F05` e `T18-F11`;
   - `T-16` emite **15** (`T16-F01`…`F15`) e a Rodada 1 conta 15 — inclui `T16-F02`;
   - `T-01` emite **11** (`AUD-T01-01`…`-11`, `T-01_TIER1_CADASTRO.md:38-118`) e a Rodada 1 conta 11 —
     inclui `AUD-T01-08`.
2. **São 7 IDs marcados, não 6** (MND-R4-01): `AUD-SEC-T04-02` (MEDIUM), `AUD-SEC-T04-03` (LOW),
   `AUD-SEC-T04-07` (LOW), `T18-F05` (MEDIUM), `T18-F11` (LOW), `T16-F02` (MEDIUM), `AUD-T01-08` (MEDIUM).
3. **Convenção aplicada:** a mesma que a Rodada 3 §2.2 já usou para os seus próprios 7 absorvidos —
   ID marcado `DUPLICATE`/absorvido **sai dos vigentes e entra em balde próprio, sem ser descartado**
   (Regra 15: todos permanecem íntegros nas trilhas de origem, como registro de primeira detecção).
   Aplicá-la só ao delta novo e não ao estoque antigo era exatamente a incoerência que `OBS-T26-19`
   denunciava. **Não é escolha por conveniência: é a uniformização da convenção já publicada, feita
   depois de reabrir a enumeração — que era a condição que a Rodada 3 declarou para decidir.**

**Base da Rodada 3 reapresentada (DE → PARA):**

| Severidade | R3 declarado | − DUPLICATE R1 | **R3 reapresentado** |
|---|---|---|---|
| CRITICAL | 7 | 0 | **7** |
| HIGH | 87 | 0 | **87** |
| MEDIUM | 223 | −4 | **219** |
| LOW | 112 | −3 | **109** |
| INFO | 11 | 0 | **11** |
| **VIGENTES** | 440 | **−7** | **433** |

Conferência: 448 IDs emitidos = 433 vigentes + 1 `FALSE_POSITIVE` + 7 `DUPLICATE` (Rodada 1) +
7 absorvidos (Rodada 3). Fecha. **O número que `OBS-T26-19` pedia é 433** — e não 434, porque o 7º
`DUPLICATE` (`AUD-T01-08`) não estava na conta de ninguém (`OBS-T26-29`).

### 2.2 Entradas brutas desta rodada — 16 IDs, por enumeração

| Origem | Total | CRIT | HIGH | MED | LOW | INFO | s/ sev. |
|---|---|---|---|---|---|---|---|
| `T-35` (§0) | 11 | 0 | 3 | 7 | 1 | 0 | 0 |
| Findings formais (`AUD-RH-VTHORISTA-01`, `AUD-EST-TRUNCCADEIA-01`, `AUD-PAT-DEPRECIACAO-01`, `AUD-RH-COMISSAO-01`) | 4 | 1 | 1 | 1 | 0 | 0 | **1** |
| `AUD-ALOG-01` (convenção §2.4) | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| **TOTAL BRUTO NOVO** | **16** | **2** | **4** | **8** | **1** | **0** | **1** |

Conferência com as origens: `T-35` §11 declara "11 — 3 HIGH, 7 MEDIUM, 1 LOW" — confere.
`AUD-RH-COMISSAO-01` está **`PROPOSED` sem severidade fixada** (cabeçalho: *"aguarda fixação pelo
dono"*) — entra no placar em coluna própria, **não em nenhum estrato de severidade** (§6.1, D-11).

### 2.3 Absorções desta rodada — **3 IDs saem do placar de vigentes** (detalhe em §3.1)

| ID absorvido | Sev. que carregava | ID sobrevivente | Efeito |
|---|---|---|---|
| `T35-RH-F02` | HIGH | **`AUD-RH-VTHORISTA-01`** (CRITICAL, fixada pelo dono) | −1 HIGH (novos) |
| `T35-EST-F01` | HIGH | **`AUD-EST-TRUNCCADEIA-01`** (HIGH, fixada pelo dono) | −1 HIGH (novos) |
| `T35-PAT-F03` | HIGH | **`AUD-PAT-DEPRECIACAO-01`** (MEDIUM, rebaixamento aceito pelo dono) | −1 HIGH (novos) |

`AUD-RH-COMISSAO-01` **não absorve nada** — é lacuna de modelo de dados distinta, nascida da
resposta do dono ao gate humano de `AUD-RH-VTHORISTA-01` (§3.3). `AUD-ALOG-01` **não absorve nada**
— é autônomo por decisão do validador (§3.2).

### 2.4 Convenção de contagem para `AUD-ALOG-01` — finding heterogêneo, declarada

`AUD-ALOG-01` não tem severidade única: o dono fixou **item A = CRITICAL PRODUÇÃO REAL** e
**item B = HIGH PRODUÇÃO REAL**; os demais itens são HIGH DEV/HOMOLOGAÇÃO pela trilha. **Convenção
desta consolidação:** o finding conta **uma vez**, no estrato da **maior severidade fixada
(CRITICAL)**, com a heterogeneidade carregada como metadado — nunca 9 linhas no placar. Motivo:
contar por item duplicaria a régua de todos os findings multi-âncora do run; contar no estrato menor
esconderia um CRITICAL de produção real. A convenção é minha, está declarada, e o director pode
revertê-la (`OBS-T26-30`).

### 2.5 PLACAR — Rodada 3 (reapresentada) → **Rodada 4**

| Severidade | R3 reapresentado (§2.1) | **Rodada 4 (produto)** | Composição do delta |
|---|---|---|---|
| **CRITICAL** | 7 | **9** | +1 `AUD-RH-VTHORISTA-01` (fixada pelo dono) · +1 `AUD-ALOG-01` (convenção §2.4; item A fixado pelo dono) |
| **HIGH** | 87 | **88** | +1 `AUD-EST-TRUNCCADEIA-01` (os 3 HIGH de T-35 foram todos absorvidos por promoção) |
| **MEDIUM** | 219 | **227** | +7 de T-35 (`T35-CTB-F04`, `-EST-F05`, `-DIN-F06`, `-PRD-F07`, `-RH-F08`, `-JUR-F09`, `-LGPD-F10`) · +1 `AUD-PAT-DEPRECIACAO-01` |
| **LOW** | 109 | **110** | +1 `T35-META-F01` |
| **INFO** | 11 | **11** | — |
| **Sem severidade fixada** | 0 | **1** | `AUD-RH-COMISSAO-01` (⏳ dono — D-11) |
| **TOTAL VIGENTE (produto)** | **433** | **446** | +13 líquidos |
| `FALSE_POSITIVE` | 1 | **1** | inalterado (`T11-F10`). T-36 e T-37: **0 falsos positivos** |
| `DUPLICATE`/absorvidos acumulados | 14 (7 R1 + 7 R3) | **17** | +3 (§2.3) |
| **TOTAL DE IDs EMITIDOS (produto)** | 448 | **464** | 448 + 16 |
| **Processo da auditoria** (categoria separada) | 1 | **1** | `AUD-PROC-CUSTODIA-01` — inalterado (estado registrado na Rodada 3 §5) |

**Conferência aritmética, refeita nos dois sentidos:**
9 + 88 + 227 + 110 + 11 + 1 = **446 vigentes**. 446 + 1 `FALSE_POSITIVE` + 7 (R1) + 7 (R3) + 3 (R4)
= **464 IDs emitidos**. E 448 + 16 = **464**. Fecha. Verificação do líquido: 16 brutos − 3
absorvidos = 13; 433 + 13 = 446. Fecha.

**Resposta direta ao item 1 do mandato:** **entraram 16 IDs**; **3 saíram por absorção**
(promoções formais, §2.3); **nenhuma severidade de ID vigente pré-existente mudou nesta rodada** —
o único movimento de severidade (HIGH proposta → MEDIUM aceita) materializou-se **dentro da
absorção** `T35-PAT-F03` → `AUD-PAT-DEPRECIACAO-01`, por decisão do dono sobre recomendação do
validador (`T-36` §4.6); e a base da Rodada 3 foi **reapresentada de 440 para 433** pela resolução
de `OBS-T26-19` (§2.1).

### 2.6 Severidades fixadas pelo dono nesta leva — intocadas (Regra 18)

`AUD-RH-VTHORISTA-01` **CRITICAL** · `AUD-EST-TRUNCCADEIA-01` **HIGH** · `AUD-PAT-DEPRECIACAO-01`
**MEDIUM** · `AUD-ALOG-01/A` **CRITICAL** e `/B` **HIGH** (ambos PRODUÇÃO REAL). Todos os quatro
findings formais dev/homologação carregam **cláusula de reavaliação automática para bloqueante na
entrada do módulo em produção** — a cláusula é parte do enunciado e acompanha o finding até a
SanaCore e o reteste; não depende de novo despacho. Registro de nuance, sem exigência inventada:
`T-36` validou o fato de `T35-RH-F02` sustentando **HIGH**; a elevação a CRITICAL é **fixação
humana posterior** (Regra 18) e `T-37` §5 registrou, para o caso análogo de `AUD-ALOG-01/A`, que o
quadro fático sustenta CRITICAL por mérito próprio.

---

## 3. DEDUPLICAÇÃO E VÍNCULOS — decisões desta rodada

Método inalterado (Rodadas 1 §2, 3 §3): `DUPLICATE`/absorção só para mesmo defeito, mesmo objeto,
mesma âncora, ou promoção formal. Nenhum finding descartado; todo absorvido tem sobrevivente nomeado.

### 3.1 Absorções por promoção formal

| # | Absorvido | Sobrevivente (canônico) | Prova documental |
|---|---|---|---|
| **DUP-R4-01** | `T35-RH-F02` (HIGH) | **`AUD-RH-VTHORISTA-01`** (CRITICAL) | `AUD-RH-VTHORISTA-01.md:6` — *"ORIGEM: T-35… (T35-RH-F02)"*; validação `T-36` §3 (`CONFIRMED — reforçado`) |
| **DUP-R4-02** | `T35-EST-F01` (HIGH) | **`AUD-EST-TRUNCCADEIA-01`** (HIGH) | `AUD-EST-TRUNCCADEIA-01.md:6` + cláusula de **unificação determinada pelo dono**: os dois vetores (divergência cumulativa no recebimento, `ReceivePurchaseItemsUseCase.ts:154-162,181-184`; truncamento requisição→pedido, `ConvertRequisitionToPurchaseOrdersUseCase.ts:219,226`) são **uma classe só**. A correção de caminho de `T-36` §2.2 (a frase de `T-35:139` estava errada) **já está incorporada ao enunciado do sobrevivente** |
| **DUP-R4-03** | `T35-PAT-F03` (HIGH) | **`AUD-PAT-DEPRECIACAO-01`** (MEDIUM) | `AUD-PAT-DEPRECIACAO-01.md:6-8` — rebaixamento recomendado por `T-36` §4 (coluna **write-only**: 3 escritores, 0 leitores, 0 telas) e **aceito pelo dono**. O fundamento do MEDIUM é a ausência de leitor — por isso a cláusula de reavaliação deste finding dispara **no primeiro consumidor**, não só na entrada em produção |

### 3.2 `AUD-ALOG-01` × `AUD-DB-03` — autonomia decidida pelo validador; **instrução anti-dupla-contagem APLICADA**

`T-37` §6 decidiu **(b): `AUD-ALOG-01` permanece FINDING AUTÔNOMO**, por 4 critérios (escopos não
congruentes nos dois sentidos — atinge `sales` e `production`, fora dos 13 módulos de `AUD-DB-03`;
objetos de prova e critérios de reteste distintos; a granularidade exigida pela decisão humana de
2026-08-16; formas de remediação diferentes). **Acolho e aplico a instrução anti-dupla-contagem,
que passa a ser regra desta consolidação:**

1. **`AUD-ALOG-01` é o dono exclusivo da classe "desativação lógica sem trilha"** nos 14 call
   sites de `T-37` §4 — inclusive nos 7 módulos que também constam de `AUD-DB-03`.
2. **`AUD-DB-03` permanece dono da amplitude** (demais ações sem `logAction` naqueles módulos) e
   recebe, no grupo G-06, a remissão: *"a classe desativação lógica destes módulos é tratada e
   retestada em `AUD-ALOG-01`"*.
3. Fechamento de um **não implica nem pressupõe** o do outro; o reteste de `AUD-DB-03` não
   reexecuta `DYN-T03-07`, e vice-versa.
4. Nas métricas do run, os 7 módulos sobrepostos contam **uma vez em cada dimensão** — amplitude em
   `AUD-DB-03`, classe de evento em `AUD-ALOG-01` — nunca duas na mesma.

**Encaixe com o arranjo da Rodada 3 §3.4 (inalterado):** `T33-B-F03` segue `DUPLICATE` de
`AUD-DB-03` (`serviceOrders` não é caso de desativação); `T33-A-F06` segue `SUBSUMIDO-PARCIAL`;
`T27-SST-F06` segue `COMPLEMENTAR`. A classe de desativação de `employees`/`clients` (2 dos 3
módulos de `T33-A-F06`) passa ao domínio de `AUD-ALOG-01` pela regra 1 acima; a amplitude continua
no lote de `AUD-DB-03`.

**Universo corrigido, acolhido:** **14 casos de uso, 4 completos, 2 parciais, 8 mudos** (`T-37` §4
— o 14º é `productionRouteController.ts:218-225`, alias `inactivate`→`status_change`, sem
`oldValues`). Emenda **numérica** do critério de reteste **adotada por esta consolidação**: onde o
finding lê "13 call sites", leia-se **14**; `DYN-T03-07` passa a esperar **14 linhas**. A escolha
**literal** (admitir alias canônico com par old/new completo × exigir normalização para
`soft_delete`) fica com SanaCore + consolidador no desenho da remediação (§6.2, T-17) — registro
desde já que o critério publicado hoje **reprovaria** um dos 4 conformes (`accessProfiles`, alias
`deactivate`) e **não veria** o 14º caso. Severidade do `/production-parcial`: acolho como
**recomendação** a paridade HIGH DEV/HOMOLOGAÇÃO proposta por `T-37` §5 — é item interno de
`AUD-ALOG-01`, não ID novo; decisão final do director (§6.2, T-15).

### 3.3 `AUD-RH-COMISSAO-01` — vínculo declarado, sem absorção

Deriva da resposta do dono ao gate humano de `AUD-RH-VTHORISTA-01` e **não o duplica**: aquele é
erro de cálculo (`benefitRules.ts:22-28`), este é lacuna de **modelo de dados** (o percentual de
comissão, variável por acordo individual, **não tem onde ser gravado**). Separação determinada pelo
dono; **a remediação de um não fecha o outro**. Dependência de ordem: o caso `'comissionado'` de
`AUD-RH-VTHORISTA-01` **depende** deste finding (a fórmula correta não tem insumo); o caso
`'horista'` **não depende de nada** e pode seguir imediatamente (**OR-25**, §5.3).

### 3.4 **DEC-R4-01** — `T35-CTB-F04` **NÃO é unificado** a `AUD-EST-TRUNCCADEIA-01`

`AUD-EST-TRUNCCADEIA-01` §7 devolveu expressamente esta decisão ao consolidador. **Decido: permanecem
separados.** Critério: (i) a unificação determinada pelo dono citou **nominalmente os dois vetores de
quantidade** — estendê-la por analogia à dimensão **monetária** seria decisão além da evidência e
além do despacho; (ii) os objetos e âncoras são disjuntos (`RfqItem.ts:33` → `PurchaseItem.ts:33`
para dinheiro × cadeia `(18,6)/(12,4)/(12,3)/(10,2)` para quantidade); (iii) as remediações se
tocam (declarar precisão canônica) mas não coincidem — precisão monetária e precisão de quantidade
podem ser fixadas por decisões diferentes. **Vínculo de classe registrado para priorização** (novo
grupo G-23, §8): mesma patologia, dimensões diferentes, cada uma conta uma vez.

### 3.5 Duplicatas plenas entre os 16 novos e o corpus antigo: **ZERO além das listadas**

`T-36` e `T-37` declararam **0 `DUPLICATE`** nos seus escopos. Verificações de não-duplicação já
declaradas pelos produtores e acolhidas: `AUD-RH-VTHORISTA-01` não duplica `T35-RH-F08` (outra
tabela, horas × salário); `AUD-PAT-DEPRECIACAO-01` não duplica `AUD-TES-SALDOMANUAL-01`/`AUD-DB-T31-07`
(mesmo padrão, tabela e impacto distintos — a diferença de impacto é o próprio fundamento do MEDIUM);
`T35-RH-F08` relaciona-se a `AUD-RH-CPFSEARCH-01` sem duplicá-lo (declaração de tipo × busca).
Limite inalterado da Rodada 3 §3.6: minha dedupe é **sintática**, não semântica. `DUP-ABERTA-01` e
`DUP-ABERTA-02` **continuam abertas** — nenhuma entrada desta rodada trouxe os inventários pendentes.

---

## 4. SOFT DELETE — retificação absorvida, com efeito em placar zero e efeito em enunciado grande

### 4.1 O fato

A frase consolidada na Rodada 1 (`T-26_CONSOLIDACAO.md:515`, grupo G-06, bloco `AUD-DB-04…-09`):
*"soft delete **confirmadamente ausente**"* — **foi retificada pelos DOIS autores de origem**:

- `T-03_RETIFICACAO_01.md` §3: a contestação de `T-36` §5 **procede**; a asserção de `T-03:103`
  (*"capacidade que não existe"*) é **factualmente incorreta** — 3 emissores ativos de
  `action: 'soft_delete'` (`productController.ts:197-205`, `bomController.ts:211-219`,
  `DeactivateUserUseCase.ts:41,46-54`), 3 READMEs, **13 (na verdade 14, `T-37` §4) casos de uso de
  desativação lógica**. O erro é de **inferência** (provou o mecanismo `deleted_at`/`paranoid` e
  concluiu sobre a capacidade de negócio).
- `AUD-DB-09_RETIFICACAO_01.md` §1–§3: verificação independente; premissa de `T-13:78` correta,
  **conclusão retirada**; inventário: **34 tabelas** com soft delete semântico (27 por coluna
  booleana — exaustivo; 8 por `status` de desativação — quase-exaustivo; −1 sobreposição), 16,4 %
  de 207; o projeto **nomeia** a prática no próprio código e remete a convenção
  (*"ver CLAUDE.md §7"* — cujo texto não está no `CLAUDE.md` atual: `RET01-A1`).

### 4.2 **DE → PARA da linha consolidada** — redação que passa a valer nesta consolidação

**DE** (Rodada 1, `:515`, último item da célula `AUD-DB-04…-09`): *"soft delete confirmadamente ausente"*.

**PARA** (redação retificada de `AUD-DB-09_RETIFICACAO_01.md` §2.2, adotada verbatim):

> **`AUD-DB-09` — soft delete existe por `active`/`status`, e nenhuma camada de banco o impõe.**
> Soft delete por `deleted_at`/`paranoid` está ausente (verificado). Soft delete **semântico** está
> presente em **34 tabelas** e é exercido por 3 emissores de `action: 'soft_delete'`. A
> "consistência do filtro" **NÃO é satisfeita por ausência da funcionalidade** — precisa ser
> verificada, e a verificação encontra **3 tabelas com filtro opcional ou inexistente no caminho de
> escrita**: `cost_centers`, `clients`, `suppliers`. `.destroy()` físico e desativação lógica
> **coexistem sem critério versionado**.

`T-26_CONSOLIDACAO.md` **não foi editado** (Regra 15); esta rodada é o veículo da substituição, como
a retificação instruiu (`AUD-DB-09_RETIFICACAO_01.md:131`). A parte de `AUD-DB-09` sobre
reconstituição de linha destruída (`productionOrderController.ts:176-183`) **permanece válida e não
foi retificada**. As retificações paralelas de `T-13:78` (conclusão restringida — a responsabilidade
de filtrar registro logicamente excluído **aplica-se**) e `T-31:176` (fundamento corrigido:
`treasury_bank_accounts` **tem** `active` e o dever **é cumprido**, `SequelizeTreasuryRepository.ts:51`
— conformidade por controle verificado, não por inexistência) estão registradas e acolhidas.

### 4.3 🚫 **BLOQUEIO NORMATIVO — vinculante para o restante desta run**

Aplicando o que os dois retificadores pediram (`T-36:458`; `AUD-DB-09_RETIFICACAO_01.md:133`):

> **A frase "soft delete não existe" (e variantes: "confirmadamente ausente", "não há dever de
> filtrar") NÃO pode mais aparecer como conformidade genérica** em nenhuma trilha, delta audit,
> consolidação, relatório final ou reteste desta run. **Forma admissível registrada:**
> *"soft delete por `deleted_at`/`paranoid` não existe"*, **sempre com escopo explícito** — e, onde
> couber, com a contraparte: *"soft delete semântico por `active`/`status` existe em 34 tabelas e o
> filtro é 100 % de aplicação, sem lastro em banco"*.

O `vericore-audit-reporting-agent` **não pode** herdar a redação de `T-26:515`; herda a de §4.2.

### 4.4 Anexos `RET01-A1`…`A7` — anexados aos findings de destino (§6 da retificação)

| Anexo | Conteúdo | **Finding de destino** |
|---|---|---|
| `RET01-A1` | dois regimes de exclusão coexistem sem critério versionado; remissão normativa a "CLAUDE.md §7" cujo texto não está no `CLAUDE.md` atual | **`AUD-DB-09`** + **`AUD-PROC-DOCDRIFT-01`** |
| `RET01-A2` | `docs/project-memory/product/ERP_SSOT.md:401` afirma "apenas `Category`… outras usam `deleted_at`" — errado nos dois pontos (são 27 tabelas; `deleted_at` não existe em nenhuma) | **`AUD-PROC-DOCDRIFT-01`** (autor de origem) |
| `RET01-A3` | quatro grafias (`active`/`is_active`/`ativo`/`ativa`) sem convenção; `is_active` é ocorrência única em 207 tabelas | **`AUD-DB-T31-08`** |
| `RET01-A4` | `item_estruturas` com **dois mecanismos na mesma tabela** (`ativo` + `status='inactive'`) sem CHECK — estado contraditório gravável | **`T13-F07`** |
| `RET01-A5` | `assets` usa `'decommissioned'` porque `'inactive'` causava HTTP 500 — incidente registrado no próprio use case (`DeactivateAssetUseCase.ts:31-36`) | **`AUD-PAT-DEPRECIACAO-01`** (sobrevivente de `T35-PAT-F03`, §3.1) |
| `RET01-A6` | `CreateEntryUseCase.ts:55` documenta `NotFoundError` para `cost_center_id` que o método **não lança** — docstring de controle inexistente | **`T35-DIN-F06`** (amplia) |
| `RET01-A7` | fornecedor `'inactive'`/`'blocked'` recebe pedido novo (`CreatePurchaseUseCase.ts:65-80`); cliente inativo recebe venda (`CreateSaleUseCase.ts:96-160` não carrega o cliente) | **`T35-DIN-F06`** (amplia) |

### 4.5 `T35-DIN-F06` — **AMPLIADO**: de 2 para **3 entidades de escrita**, MEDIUM mantida

DE (T-35): `cost_centers` + `customer_price_lists` (leitura), com falha de escrita em contabilidade.
**PARA** (retificação §3.3/§5, pelo próprio autor): **3 falhas nomeadas no caminho de escrita —
`cost_centers`, `clients`, `suppliers`** — com o reforço decisivo da **assimetria no mesmo laço**:
`CreateEntryUseCase.ts:60-71` valida existência, `accept_entries` **e `active` da conta**, e três
linhas adiante (`:89`) grava `cost_center_id` **sem carregar, sem checar existência, sem checar
`active`** — o que descarta "não é a convenção do projeto" como defesa. Severidade **MEDIUM mantida
pelo autor**; anexos `RET01-A6` e `RET01-A7` incorporados; critério de reteste a ampliar (validação
de estado da entidade referenciada no caminho de escrita + correção do JSDoc) — despacho formal do
director pendente (§6.2, T-17). **Não foi validado por T-36** (fora do mandato — só os 3 HIGH).

### 4.6 Severidade do bloco `AUD-DB-04…-09` — **reexame PENDENTE do director, não resolvido aqui**

O retificador recomendou formalmente (`AUD-DB-09_RETIFICACAO_01.md` §4): o item entrou no bloco
MEDIUM ×6 como *observação inócua* e sai como **lacuna de controle com 3 falhas nomeadas** — manter
a severidade sem reexame é herdá-la de premissa que já não existe. **Registro e escalo (§6.2, T-16);
não reclassifico** — reclassificar aqui seria alterar severidade sem o titular. Até o despacho, o
bloco permanece MEDIUM ×6 no placar, **com esta ressalva anotada no grupo G-06**.

---

## 5. FILA DE REMEDIAÇÃO — REORDENADA POR **EXPOSIÇÃO REAL** (primeira aplicação do critério)

### 5.1 O critério, por escrito (determinação do dono, 2026-08-16, registrada em `AUD-ALOG-01.md` §5)

> **1º critério — exposição real:** finding/item com ambiente **PRODUÇÃO REAL** declarado pelo dono
> vai à frente de **todo** achado apenas DEV/HOMOLOGAÇÃO, **inclusive de severidade nominal igual ou
> superior** cujo módulo ainda não está em produção. Dentro do estrato, ordena a severidade fixada.
> **2º critério — severidade consolidada**, para o restante, preservando as dependências
> `OR-01`…`OR-25` (que reordenam **dentro** do estrato; dependência de item PRODUÇÃO REAL **herda a
> prioridade do dependente**, no recorte necessário).
> **3º — cláusulas de reavaliação automática** são metadado obrigatório da fila: `AUD-RH-VTHORISTA-01`,
> `AUD-EST-TRUNCCADEIA-01`, `AUD-PAT-DEPRECIACAO-01` e `AUD-RH-COMISSAO-01` sobem a BLOQUEANTE
> **automaticamente** na entrada do módulo em produção (a de `AUD-PAT-DEPRECIACAO-01` dispara também
> no primeiro leitor de `current_value`), sem novo despacho.

### 5.2 A cabeça da fila

| Pos. | Item | Sev. / Ambiente | Notas de execução (insumo, não ordem minha) |
|---|---|---|---|
| **1** | **`AUD-ALOG-01/A`** — `DELETE /api/employees/:id` (desligamento sem trilha) | **CRITICAL · PRODUÇÃO REAL** | ato de efeito trabalhista, irreversível por `UPDATE`, sem via de reconstituição (9 refutações falhas, `T-37` §3). Reteste exige `USER` e origem — log sem ator **não fecha**. `Employee` é PK INTEGER — **sem** colisão com `AUD-DB-04` |
| **2** | **`AUD-ALOG-01/B`** — `PATCH /api/items/:id/inactivate` (insumo tier 1, universo dos 327 reais) | **HIGH · PRODUÇÃO REAL** | **duas rotas convergem no mesmo handler mudo** (`items.ts:20-21` mapeia também `DELETE /api/items/:id`) — a prova dinâmica cobre ambas. **`AUD-DB-04` é dependência herdada** no recorte de `Item` (PK UUID × `entity_id integer`): emitir `logAction` sem resolver a representação reproduz o modo de falha `22P02` (`T-37` §7.2) — tratar como dependência ou adotar o contorno documentado **declaradamente** |
| 3… | Fila normal por severidade consolidada (9 CRITICAL, 88 HIGH, …), com `OR-*` | — | ver §5.4 |

**Consequência explícita do critério, para que ninguém a descubra tarde:** `AUD-ALOG-01/B` (HIGH,
produção real) fica **à frente de `AUD-RH-VTHORISTA-01` (CRITICAL, dev/homologação)** e de todos os
demais findings formais desta leva — é exatamente o que a regra do dono determina.

### 5.3 Dependências de ordem **novas** — somadas a `OR-01`…`OR-19`

| # | Ordem | Fundamento |
|---|---|---|
| **OR-20** | **`AUD-ALOG-01/A` instala o padrão `logAction` no módulo `employees`** — executá-lo antes/junto do recorte `employees` do lote `AUD-DB-03` **reduz o pré-requisito de OR-14** (item 4 da §6 de `AUD-RH-CPFSEARCH-01`) | `AUD-ALOG-01.md` §6: em 7 módulos `logAction` não existe em camada alguma — a correção **instala o padrão**, não acrescenta uma linha |
| **OR-21** | **`AUD-ALOG-01/B` trata `AUD-DB-04` como dependência** (recorte `Item`/UUID) ou adota contorno documentado declaradamente | `T-37` §7.2 |
| **OR-22** | **`AUD-EST-TRUNCCADEIA-01` antes (ou junto) da correção de unidade da carga** (`docs/carga-inicial/insumos-materia-prima.csv:82,178,197`, `revisar=SIM`) — **precisão primeiro, nunca unidade primeiro**: corrigir unidade para KG/G com `(10,2)` na cadeia converte risco latente em perda ativa | `AUD-EST-TRUNCCADEIA-01.md` §5; `T-36` §2.7.4 |
| **OR-23** | **Remediação de `AUD-ALOG-01/D` e `/E` corrige também os READMEs** que declaram a ausência de log como intencional (`suppliers/README.md:146-148`, `clients/README.md:165-167`) — senão a guarda de docs-drift acusa, ou o texto volta a legitimar a omissão | `T-37` §7.6 |
| **OR-24** | **Caso `'horista'` de `AUD-RH-VTHORISTA-01` segue imediatamente; caso `'comissionado'` bloqueado por `AUD-RH-COMISSAO-01`** (sem a parte fixa separada, a fórmula correta não tem insumo) | `AUD-RH-VTHORISTA-01.md` §5 |
| **OR-25** | **`AUD-PAT-DEPRECIACAO-01` não inicia antes do gate humano** implementar-depreciação × remover-coluna (decisão de escopo de produto; a SanaCore não pode escolher — Regra 6) | `AUD-PAT-DEPRECIACAO-01.md` §4 |

### 5.4 ⚠️ Limite honesto do critério novo — **o corpus pré-existente não tem campo de ambiente**

A classificação PRODUÇÃO REAL × DEV/HOMOLOGAÇÃO **só existe para a leva de 2026-08-16**. Os 433
IDs reapresentados da Rodada 3 — incluindo os 7 CRITICAL e 87 HIGH anteriores — **não têm declaração
de ambiente registrada**, e eu **não a infiro** (Regra 6; a memória de que o ERP "está em uso real"
não é artefato de decisão — Regras 8/10/18). Consequência: o critério do dono ordena com precisão a
cabeça da fila (§5.2) e rebaixa com precisão o que está **declarado** dev/homologação; a posição
relativa de `AUD-ALOG-01/B` frente aos 7 CRITICAL pré-existentes **é indeterminada até que o
ambiente deles seja declarado**. Escalado como **D-13** (§6.1) — sem essa classificação, a fila
completa não pode ser emitida com o critério novo.

---

## 6. PENDÊNCIAS — decisão do dono separada de pendência técnica

### 6.1 ⏳ PENDÊNCIAS DE DECISÃO DO DONO (Regra 18)

| # | Decisão pendente | Estado |
|---|---|---|
| **D-01** | `AUD-CTB-DEBCRED-01`: manter HIGH (fixada) ou acolher rebaixamento a MEDIUM recomendado pelo validador | ⚠️ **HERDADA da Rodada 3 — INALTERADA.** Nenhuma entrada desta rodada a responde. HIGH preservada enquanto não houver decisão; o item "rejeitar em vez de ignorar valores `<= 0`" tem prioridade independente nos dois desfechos |
| **D-02**…**D-06** | BR-ID de UC-03 (preço>custo); fonte de `manutencao`/`garantia`; lado correto de `T33-B-F02`; candidatas a BR-ID de T-33 B; fórmula de rating de fornecedor | ⚠️ **HERDADAS — INALTERADAS** |
| **D-07** | denominador reconciliado de `C-133` (≈121 páginas) | ⚠️ **HERDADA — INALTERADA** (depende do par de cobertura, §7.4) |
| **D-08** | Regra 23 / `APPROVALS.md:787` | ⚠️ **HERDADA — INALTERADA** |
| **D-09** | 26 HIGH de `npm audit` em `mobile`/`tv` sem finding | ⚠️ **HERDADA — INALTERADA** (3ª rodada consecutiva) |
| **D-10** | ownership de `docs/business/briefs/` | ⚠️ **HERDADA — INALTERADA** |
| **D-11** | **Severidade de `AUD-RH-COMISSAO-01`** — o finding está `PROPOSED` sem severidade; **não entra em nenhum estrato do placar (§2.5) nem na fila (§5)** até a fixação; **Regra 22 aplicável se HIGH+** (a validação só é exigível depois da fixação) | **NOVA — ABERTA** |
| **D-12** | **Gate de `AUD-PAT-DEPRECIACAO-01`: implementar depreciação × remover a coluna** (e as três declarações de capacidade: `Asset.ts:7`, `comment` da coluna, `20260810-000033:124`) | **NOVA — ABERTA.** Bloqueia OR-25 |
| **D-13** | **Classificação de ambiente (PRODUÇÃO REAL × DEV/HOMOLOGAÇÃO) do corpus pré-existente**, no mínimo dos 7 CRITICAL e 87 HIGH reapresentados | **NOVA — ABERTA.** Sem ela, o critério de fila do dono só ordena a cabeça (§5.4) |

**Gate FECHADO nesta leva, registrado:** o significado de `salary` para `'comissionado'` foi
**respondido pelo dono em 2026-08-16** (salário fixo + percentual variável por acordo individual; VT
incide sobre a parte fixa) — `AUD-RH-VTHORISTA-01.md` §5. A resposta fechou o gate **e abriu
`AUD-RH-COMISSAO-01`**. A decisão "VT sobre a parte fixa" **não é pendência**: está registrada e a
SanaCore não precisa consultar ninguém sobre ela.

### 6.2 🔧 PENDÊNCIAS TÉCNICAS E DE OUTRA AUTORIDADE

| # | Pendência | Titular | Estado |
|---|---|---|---|
| **T-01**…**T-10** | (numeração da Rodada 3 §6.2) — veredito de autorização de `T32-FST-F04`; item (c) de `AUD-PROC-DOCDRIFT-01`; `DUP-ABERTA-01`/`-02`; 16 divergências da Rodada 2 §9.2; `FIND-ERP-007`; `OBS-R3A-01`; `T16-F15`/`T21-F01`/`RES-T13-04/-05`/`T29-MOB-F03` | diversos | ⚠️ **TODAS INALTERADAS.** Repeti a busca no corpus desta rodada (T-35, T-36, 4 formais, 2 retificações, `AUD-ALOG-01`, T-37): **nenhuma resposta registrada.** `FIND-ERP-007` é reescalada pela **quarta** rodada consecutiva |
| **T-11** | Fila DYN | runner / director | ⚠️ **AGRAVADA de novo:** +7 `DYN-T35-01`…`-07` e +1 `DYN-T03-07` sobre os ≈180 da Rodada 3 ⇒ **ordem de grandeza ≈190** contra ~103 catalogados. Notas: `DYN-T35-02` **rebaixado a opcional** por `T-36` §4.6.2 (sem consumidor, o resultado não muda decisão); `DYN-T35-07` é **resolvível estaticamente** contra `00_baseline_frozen.sql`; `DYN-T03-07` espera **14** linhas (§3.2) e é o reteste natural da cabeça da fila |
| **T-12** | `AUD-PROC-DOCDRIFT-01` recebe `RET01-A1`/`A2` — o escopo do drift documental **cresce de novo** (agora inclui `ERP_SSOT.md:401` e a remissão órfã a "CLAUDE.md §7") | autor de origem + director | **NOVA** — anexação feita (§4.4); reenquadramento do enunciado é do autor |
| **T-13** | **Autoria de `AUD-DB-09` para efeito de remediação** — o mandato da retificação e o artefato divergem; os dois autores retificaram cada um a sua parte, sem colisão | director | **NOVA — ABERTA** (`RES-RET01-04`; Regra 21) |
| **T-14** | **`LIM-T37-01`** — confirmar identidade de `server/` entre `HEAD 694bca9` e o `AUDIT_COMMIT` (`git diff c1311a6f..HEAD -- server/` vazio fecha) | `vericore-audit-evidence-controller` | **NOVA — ABERTA.** Não bloqueia a remediação; risco declarado baixo |
| **T-15** | Severidade do item `/production-parcial` de `AUD-ALOG-01` (14º caso) | director | **NOVA** — recomendação registrada: HIGH DEV/HOMOLOGAÇÃO por paridade com C–H (`T-37` §5) |
| **T-16** | **Reexame da severidade do bloco `AUD-DB-04…-09`** (§4.6) — o item deixou de ser observação inócua e passou a lacuna de controle com 3 falhas nomeadas | director | **NOVA — ABERTA.** Não resolvida aqui, por desenho |
| **T-17** | Despacho formal das emendas: critério de reteste de `T35-DIN-F06` (§4.5) e escolha **literal** do critério de reteste de `AUD-ALOG-01` (alias × normalização, §3.2) | director / SanaCore + consolidador | **NOVA — ABERTA** (a emenda **numérica** 13→14 já está adotada) |
| **T-18** | `RES-T35-01`…`-06` e `RES-RET01-01`…`-03` — resíduos declarados pelas trilhas (denominador herdado; 21 tabelas sem model não nomeadas; Tier B parcial; `COMMENT` DDL não reconciliado; triggers aceitos como declarados; vocabulários `'blocked'`/`'suspended'`… não triados; escrita verificada em 18/34) | trilhas de origem / delta audit | **REGISTRADOS** — nenhum é resolvido por consolidação |

---

## 7. ESTADO DE COBERTURA — honesto, medido

### 7.1 ⚠️ `C-137` — **52 / 207 (25,1 %)**. Correção explícita sobre a Rodada 3.

**A Rodada 3 §7.1 reportou `A(34/207)` e déficit de 173 — o número estava correto quando escrito e
ficou defasado no mesmo dia:** a Rodada 3 foi consolidada **em paralelo** ao fieldwork de `T-35`.
DE → PARA, com o delta explícito:

| Item | Rodada 3 | **Rodada 4** | Fonte |
|---|---|---|---|
| Denominador (herdado, não reconstruído — `RES-T35-01`) | 207 | **207** | `T-13:62-67`, `T-31:44` |
| Cobertas (`T-13` 22 + `T-31` 12) | 34 | 34 | — |
| **+ `T-35` Tier A** | — | **+18** | `T-35` §2 |
| **Total com semântica de coluna completa** | 34/207 (16,4 %) | **52/207 (25,1 %)** | `T-35:77` |
| **Déficit** | 173 | **155** — **134 nomeadas** (`T-35` §3) **+ 21 sem model** (`RES-T35-02`/`T35-META-F01`) | `T-35:78-81` |
| *(memo)* Tier B — só dimensão monetária/quantitativa, **não conta como fechamento** | — | +38 tabelas | `T-35` §2, declarado de propósito |

**`C-137` continua NÃO FECHADA.** O argumento de materialidade da Rodada 3 §7.1 **se repete e se
reforça**: o lote 2 aplicou o mesmo método a 18 tabelas e produziu **3 HIGH validados** (dois deles
promovidos a finding formal no mesmo dia, um a CRITICAL). A densidade de colunas opacas é **uniforme**
(~1,3/tabela, `T-35` §6) — extrapolar conformidade para as 155 restantes segue sem prova. A banda
**P3 compliance (`sst_*`, `hr_*`, `jur_*`)** foi apenas **tocada** (5 das ~76: `employees`,
`hr_time_import_items`, `jur_lgpd_*` ×2, `jur_legal_case_provisions`) e permanece a maior lacuna
nomeada (34 `sst_*` + 17 RH + 15 jurídico na lista de §3 de `T-35`).

### 7.2 Regra 22 — estado

| | Rodada 3 | **Rodada 4** |
|---|---|---|
| CRITICAL + HIGH sob o regime (produto) | 7 + 87 = 94 | **9 + 88 = 97** |
| Com veredito adversarial registrado | 94 | **97** |
| Exceções | nenhuma | **nenhuma** — os 3 novos têm veredito: `AUD-RH-VTHORISTA-01` e `AUD-EST-TRUNCCADEIA-01` por `T-36` (10 hipóteses refutadoras, 7 falhas, 0 falso positivo); `AUD-ALOG-01` por `T-37` (9 hipóteses, todas falhas) |
| Fora do regime por falta de severidade | — | `AUD-RH-COMISSAO-01` (D-11) |

Nuances registradas, não escondidas: (i) `T-36` validou o fato de `AUD-RH-VTHORISTA-01` **como
HIGH**; o CRITICAL é fixação humana posterior (§2.6); (ii) `AUD-PAT-DEPRECIACAO-01` é MEDIUM e foi
validado mesmo assim; (iii) `T35-DIN-F06` (MEDIUM) **não foi validado** — fora do mandato de `T-36`
— e sua ampliação (§4.5) tampouco.

### 7.3 O que os validadores desta leva mudaram no mérito — resumo de custódia

`T-36`: 3/3 `CONFIRMED`, 1 rebaixamento recomendado (acatado pelo dono via promoção), **1 correção
de caminho que agravou o defeito** (Vetor A de `AUD-EST-TRUNCCADEIA-01`), 1 caminho novo (Vetor B),
divergência "soft delete" resolvida com fonte autoritativa determinada. `T-37`: `CONFIRMED`,
universo corrigido 13→14 **contra o objeto auditado**, autonomia decidida, 0 rebaixamento. Registro
simétrico ao da Rodada 3 §7.2: mais uma leva com 0 falso positivo — a desconfiança de calibração
registrada lá continua valendo como registro, **e** as três correções materiais contra os produtores
(caminho errado em `T-35:139`; 14º caso; asserção de `T-03:103`) são evidência de que a validação
está encontrando erro real, não carimbando.

### 7.4 ⚠️ Par de cobertura — **a ressalva da Rodada 3 CONTINUA VÁLIDA e está agravada**

Resposta direta ao item 4 do mandato: **sim, continua válida.** Não existe
`24-coverage/AUDIT_COVERAGE_EXECUTED_RODADA3.md` nem `_RODADA4.md` (verificado por listagem nesta
sessão; só existem o original e `_RODADA2`). O par vigente mede um corpus **anterior a T-31…T-34 e a
T-35…T-37** — dois ciclos atrás. **Nenhum veredito final pode ser emitido sobre este placar
enquanto o par de cobertura não for reconciliado** (`C-133` incluída — D-07). É a lacuna de processo
mais antiga em aberto da fase de consolidação (`OBS-T26-33`).

---

## 8. AGRUPAMENTO — grupos que recebem população nova e 2 grupos novos

Os 22 grupos das Rodadas 1–3 permanecem.

| Grupo | População nova |
|---|---|
| **G-06** Trilha de auditoria | **`AUD-ALOG-01`** (CRITICAL, com a remissão anti-dupla-contagem de §3.2: classe "desativação lógica" é dele; amplitude segue de `AUD-DB-03`). A célula `AUD-DB-04…-09` passa a carregar a redação retificada de §4.2 **e** a ressalva de reexame (T-16) |
| **G-13** Compliance regulado | `AUD-RH-VTHORISTA-01` (CRITICAL — verba trabalhista com limite legal), `AUD-RH-COMISSAO-01` (s/ sev.), `T35-RH-F08` (folha sem unidade; CPF `STRING(14)`), `T35-LGPD-F10` (RoPA inexecutável — contraste interno: `legal_basis` é ENUM correto das 10 bases do art. 7º) |
| **G-21** Invariante só na aplicação / semântica financeira | `T35-PRD-F07` (domínio na prosa — 3ª ocorrência do padrão de `AUD-CTB-DEBCRED-01`), `T35-DIN-F06` **ampliado** (§4.5), `T35-CTB-F04` (7 precisões monetárias), `T35-EST-F05` (`approved_by` que significa "rejeitou"), `T35-JUR-F09` (valor da causa duplicado), `AUD-PAT-DEPRECIACAO-01` (3ª ocorrência do padrão "coluna derivada declarada, digitada" — com `AUD-TES-SALDOMANUAL-01` e `AUD-DB-T31-07`: **o padrão é sistêmico; a severidade de cada caso é individual**, `T-36` §4.5) |
| **G-22** Requisito declarado e incumprível | `RET01-A2` (via `AUD-PROC-DOCDRIFT-01`), `RET01-A6` (via `T35-DIN-F06`) |
| **G-23** *(NOVO)* **Precisão/unidade heterogênea no mesmo trânsito** — causa-raiz: *nenhum artefato declara a precisão/unidade canônica; o `numeric(p,s)` do PostgreSQL trunca em silêncio, sem arredondamento auditável em aplicação* | `AUD-EST-TRUNCCADEIA-01` (HIGH — quantidade), `T35-CTB-F04` (MEDIUM — dinheiro; **DEC-R4-01**: não unificados), `AUD-DB-T31-06` (3→7 precisões monetárias), `T35-RH-F08` (horas). Contraexemplo interno que prova que a disciplina existe: `CnabReturnOccurrence.ts:39` declara a conversão centavos→reais |
| **G-24** *(NOVO)* **Exclusão lógica sem regime declarado** — causa-raiz: *dois regimes (`.destroy()` físico × desativação lógica) coexistem sem critério versionado; o filtro de excluído lógico é 100 % de aplicação, sem `paranoid`/view/RLS/trigger* | `AUD-DB-09` (retificado, §4.2), `T35-DIN-F06` (+`RET01-A6`/`A7`), `RET01-A1`, `RET01-A3` (→`AUD-DB-T31-08`), `RET01-A4` (→`T13-F07`). `AUD-ALOG-01` toca o grupo pelo lado da **trilha** e permanece titular em G-06 |

---

## 9. LIMITES DESTE AGENTE — sem atenuação

### 9.1 Por leitura própria e integral nesta sessão

`T-26_CONSOLIDACAO_RODADA3.md` (integral, 769 linhas); `T-35_C137_SEMANTICA_COLUNA_LOTE2.md`
(integral); `T-36_VALIDACAO_T35.md` (integral); `AUD-RH-VTHORISTA-01.md`, `AUD-EST-TRUNCCADEIA-01.md`,
`AUD-PAT-DEPRECIACAO-01.md`, `AUD-RH-COMISSAO-01.md` (integrais); `T-03_RETIFICACAO_01.md` e
`AUD-DB-09_RETIFICACAO_01.md` (integrais); `AUD-ALOG-01.md` e `T-37_VALIDACAO_AUD-ALOG-01.md`
(integrais); `T-26_CONSOLIDACAO.md` (dirigido: §1.1–§1.4, §2 completo, `:500-520`, `:910-924`);
enumeração de IDs de `T-04`, `T-18`, `T-16` e `T-01` por varredura de padrão nos relatórios de
origem (base da resolução de `OBS-T26-19`); listagem de `24-coverage/` (base de §7.4).

**Toda a aritmética deste documento foi refeita por mim e fecha nos dois sentidos** (§2.1, §2.5).
A resolução de `OBS-T26-19` é minha, por enumeração; as decisões de §3.2 (autonomia) e §3.1
(promoções) são dos artefatos de origem, acolhidas; **DEC-R4-01 (§3.4) e a convenção de §2.4 são
minhas**, com critério publicado.

### 9.2 Aceito de relato de outra trilha, **SEM reverificar**

1. **Toda âncora `arquivo:linha` dos 464 IDs. Não abri um único arquivo de `server/`, `client/`,
   `docs/`, `product/` ou `coretriad/` nesta sessão. Zero.** Se uma âncora está errada, este
   documento repete o erro.
2. Todos os vereditos de mérito de `T-36` e `T-37` (avaliei estrutura da prova e consistência com o
   corpus; não reli `benefitRules.ts`, `ReceivePurchaseItemsUseCase.ts`, `Asset.ts`,
   `employeeController.ts`, `itemController.ts` nem nenhum dos demais).
3. O inventário de 34 tabelas e o placar 4/2/8 dos 14 call sites — declarados exaustivos pelos
   autores, com os resíduos que eles próprios registraram (`RES-RET01-01/-02`, `RES-T03-05`).
4. A cobertura declarada de `T-35` (18 Tier A, 38 Tier B, 134 nomeadas) e o denominador 207 herdado.
5. Nenhuma afirmação própria de proveniência de commit (sem Bash, sem `git`) — `LIM-T37-01` segue
   com o evidence-controller.

### 9.3 O que esta consolidação não pode oferecer

- Dedupe **sintática**, não semântica — risco inalterado da Rodada 3 §9.3.
- `DUP-ABERTA-01` e `DUP-ABERTA-02` continuam sendo os casos que eu deveria decidir e não decido,
  por falta dos inventários de origem.
- O par de cobertura (§7.4) **não foi produzido por mim** — declaração, não omissão.
- A convenção de §2.4 e a resolução de §2.1 são reversíveis pelo director; se revertidas, o placar
  muda de forma determinística e está decomposto para permitir o recálculo.

---

## 10. Encerramento

- Nenhum arquivo do objeto auditado foi criado, alterado, corrigido ou refatorado (Regra 2).
  Nenhuma escrita fora de `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/`.
- Nenhuma evidência histórica foi alterada (Regra 15). **As Rodadas 1, 2 e 3, os relatórios de
  trilha, as retificações e os findings formais permanecem íntegros.** Onde esta rodada substitui
  redação consolidada (`T-26:515`), a substituição está em §4.2 com DE → PARA e autor de origem.
- **Nenhum finding novo foi criado (Regra 6).** `AUD-ALOG-01` foi criado pelo autor de origem de
  `T-03`; os 4 formais, por decisão humana; os anexos `RET01-A*` não são findings.
- **Nenhuma severidade fixada pelo dono foi alterada (Regra 18):** `AUD-RH-VTHORISTA-01` CRITICAL,
  `AUD-EST-TRUNCCADEIA-01` HIGH, `AUD-PAT-DEPRECIACAO-01` MEDIUM, `AUD-ALOG-01/A` CRITICAL e `/B`
  HIGH permanecem como fixadas; `AUD-CTB-DEBCRED-01` permanece HIGH com D-01 aberta;
  `AUD-RH-COMISSAO-01` permanece **sem severidade**, aguardando o dono (D-11).
- **Nenhum finding foi descartado.** 1 `FALSE_POSITIVE` e **17 absorvidos/`DUPLICATE`** (7 da
  Rodada 1 — agora subtraídos do placar com prova de enumeração —, 7 da Rodada 3, 3 desta rodada),
  todos com sobrevivente nomeado e rastreio.
- **Este documento NÃO declara `AUDIT_PASSED`, `FINDINGS_CONFIRMED`, `RETEST_PASSED`,
  `FINDING CLOSED` nem `REMEDIATION COMPLETE`.** Não declaro G3 cumprido, não declaro `C-133` nem
  `C-137` fechadas — declaro, medido, o que falta (§7).

**Entrega:** ao `vericore-audit-reporting-agent` — que fica **vinculado** ao bloqueio normativo de
§4.3, à redação de §4.2 e à instrução anti-dupla-contagem de §3.2, e **sem par de cobertura**
(§7.4). **Escalonamentos abertos ao `vericore-software-audit-director`:** §6.1 (13 decisões do
dono, 3 novas), §6.2 (18 pendências técnicas, 7 novas), §2.4 e §2.1 (convenções reversíveis),
§4.6 (reexame `AUD-DB-04…-09`), §5.4 (D-13, condição da fila completa).

---

## 11. OBSERVAÇÕES — **explicitamente NÃO PROMOVIDAS a finding**

| ID | Observação | Herdeiro natural |
|---|---|---|
| **`OBS-T26-29`** | **A Rodada 1 marca 7 IDs `DUPLICATE` e declara 6 no encerramento** (`T-26_CONSOLIDACAO.md:916` × §2.1 + §2.4/`:151`/`:491`). `OBS-T26-19` herdou o "6" e por isso a faixa 434–440 estava errada nos dois extremos: o número, determinado por enumeração, é **433** (§2.1). `OBS-T26-19` **encerrada** | director |
| **`OBS-T26-30`** | Convenção de contagem para finding heterogêneo (`AUD-ALOG-01` conta 1× no estrato CRITICAL, §2.4) — declarada e reversível; se o director preferir contá-lo em HIGH, o placar vira 8 CRITICAL / 89 HIGH, mesmos 446 | director |
| **`OBS-T26-31`** | **Primeira aplicação do critério de exposição real** (§5). O corpus pré-existente não tem campo de ambiente — o critério nasceu operante só para a leva nova. D-13 é a condição de generalização | director / dono |
| **`OBS-T26-32`** | `T-37` §4 achou o 14º caso porque trocou o glob de prefixo (`Deactivate`) por vocabulário mais largo — a **mesma classe de erro de enumeração** que `RES-T03-05` declara e que produziu a asserção retificada de soft delete. Duas ocorrências no mesmo dia: enumerar por implementação em vez de por vocabulário de domínio é o modo de falha recorrente das varreduras desta run | todas as trilhas / director |
| **`OBS-T26-33`** | O par de cobertura está **dois corpora atrás** pela primeira vez na run (§7.4) | director |
| **`OBS-T26-34`** | O run produziu, no mesmo dia, a retificação de uma conformidade genérica ("soft delete não existe") **pelos dois autores de origem, sem edição de artefato histórico e com bloqueio normativo** — é o circuito previsto pelas Regras 15/20/21 funcionando ponta a ponta; registrado como precedente de forma para futuras retificações | registro |
