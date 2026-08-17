# T-26 — CONSOLIDAÇÃO · **RODADA 5** (final de escopo) · ERP-LEGACY-001-AUD-001

```
AUDIT_ID:      ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f   (única referência de leitura)
TRILHA:        T-26 — Consolidação e cobertura executada · RODADA 5
PRODUZIDO POR: vericore-audit-consolidator
DATA:          2026-08-17
MANDATO:       APR-2026-042 D4 (dono, 2026-08-17) — "Prossiga para consolidação rodada 5 →
               relatórios finais". Absorve T-41, T-42, T-43, T-45, T-47 (lotes 3-6 de C-137 +
               enumeração), T-44 e T-46 (validações Regra 22), T-03_RETIFICACAO_01,
               AUD-DB-09_RETIFICACAO_01, e APR-2026-035 a APR-2026-042 +
               RECONCILIACAO_FINAL_AUD-001.md.
REGIME:        read-only. Zero conexão de banco, zero execução, zero comando, zero requisição
               HTTP. Nenhuma escrita fora de audit/runs/ERP-LEGACY-001-AUD-001/07-findings/.
NATUREZA:      **ATUALIZAÇÃO RASTREÁVEL** das Rodadas 1, 2, 3 e 4, de T-38 e de T-39.
               **Nenhuma linha de nenhuma rodada anterior foi reescrita, apagada ou
               renumerada (Regra 15).** Toda mudança está em DE → PARA, com motivo e autor.
               NÃO emite finding novo (Regra 6). NÃO corrige nada (Regra 2). NÃO altera
               severidade fixada pelo dono (Regra 18). NÃO valida CRITICAL/HIGH — autoridade
               do vericore-finding-validator (Regra 22). NÃO declara AUDIT_PASSED,
               FINDINGS_CONFIRMED, RETEST_PASSED, FINDING CLOSED nem REMEDIATION COMPLETE
               (Regras 3, 4, 5).
LEITURA:       este documento não substitui as Rodadas 1-4, T-38 nem T-39. Os sete só valem
               lidos juntos. Onde divergirem, **prevalece esta Rodada 5**, e cada divergência
               está registrada.
ERRATA:        esta rodada executa o despacho c2 de RECONCILIACAO_FINAL_AUD-001.md §5 —
               a errata DE → PARA do placar (§1).
```

---

## 0. O que esta rodada absorve

| Origem | Natureza | IDs novos |
|---|---|---|
| `T-41_C137_SEMANTICA_COLUNA_LOTE3.md` | trilha `C-137` lote 3 — triagem de banda (80 INTEGRAL / 53 EXCLUÍDA) + 9 tabelas cobertas | **9** |
| `T-42_C137_SEMANTICA_COLUNA_LOTE4.md` | trilha `C-137` lote 4 — resolve `RES-T41-01`; fecha bandas ESTOQUE e FISCAL de 1ª ordem; 6 tabelas | **6** |
| `T-43_C137_SEMANTICA_COLUNA_LOTE5.md` | trilha `C-137` lote 5 — censo e fechamento da categoria DADO DE SAÚDE (11 tabelas); 8 tabelas cobertas | **11** |
| `T-44_VALIDACAO_T43.md` | validação adversarial de `T43-SST-F01` (Regra 22) — 5 refutações, todas falharam | — |
| `T-45_C137_SEMANTICA_COLUNA_LOTE6.md` | trilha `C-137` lote 6 — censo e fechamento da categoria DADO BIOMÉTRICO (5 tabelas); 4 cobertas | **8** |
| `T-46_VALIDACAO_T45.md` | validação adversarial de `T45-SST-F01` (Regra 22) — 6 refutações, todas falharam | — |
| `T-47_TABELAS_SEM_MODEL.md` | enumeração nominal das 22 tabelas sem model + dois léxicos (`DYN-T43-10`+`DYN-T45-10`) | **3** |
| `T-03_RETIFICACAO_01.md`, `AUD-DB-09_RETIFICACAO_01.md` | já absorvidas na Rodada 4 §4; reentram aqui **apenas** como fundamento de `APR-2026-035` `D-R1` (§2.2) | — |
| `coretriad/governance/RECONCILIACAO_FINAL_AUD-001.md` | ato de orquestração do director — determina a errata do placar (c2), o estrato 4 em 77 e a Regra 22 em 96 | — |
| `APPROVALS.md` `APR-2026-035` … `APR-2026-042` | 8 decisões do dono — severidades congeladas, escopo de `C-137`, categoria especial, denominador oficial, liberação | — |

**Não toca:** nenhum enunciado técnico, severidade original, âncora ou autoria dos IDs das Rodadas 1-4 que não estejam nominalmente listados em §1, §2 e §3. As pendências anteriores que nenhuma dessas entradas responde **continuam abertas e estão relistadas** (§5).

### 0.1 ⚠️ Divergências entre o mandato desta rodada e os artefatos — **o artefato vence (Regra 7)**

| # | O mandato diz | O artefato diz | Adotado |
|---|---|---|---|
| **MND-R5-01** | somar os findings novos das cinco trilhas *"mais `AUD-ALOG-01`, `AUD-RH-COMISSAO-01` e os promovidos"* | `AUD-ALOG-01` já entrou no placar na **Rodada 4 §2.5** (+1 CRITICAL, convenção §2.4); `AUD-RH-COMISSAO-01` já entrou em **`T-39` §1.3** (coluna "sem severidade" → HIGH, por `D-11`); os **3 promovidos** (`AUD-RH-VTHORISTA-01`, `AUD-EST-TRUNCCADEIA-01`, `AUD-PAT-DEPRECIACAO-01`) entraram na **Rodada 4 §2.2/§2.3**, com os 3 absorvidos correspondentes já subtraídos | **Não são somados de novo.** Todos os cinco **já estão dentro da base de 446**. Somá-los aqui produziria dupla contagem de 5 IDs e um placar de 488, que não fecha contra nenhum artefato. **A base desta rodada é 446 (446 = corpus `T-39`), e o delta é exclusivamente os 37 IDs novos das cinco trilhas** (§1.2) |
| **MND-R5-02** | *"Das 7 [tabelas de biometria], **6 contáveis** e 1 não (`hr_candidates`)"* — repetindo `APR-2026-042` D2 | `T-45` §2.1 declara expressamente que **`sst_estornos_entrega_epi` NÃO é contável** por não ter model, e `T-47` §1.5 item 20 a lista entre as **22 sem model**. Logo as **não contáveis são 2**, não 1 | **5 contáveis, 2 não contáveis** (`hr_candidates` e `sst_estornos_entrega_epi`), por enumeração (§4.3). **Não altero `APR-2026-042`** (Regra 15 / ownership de `coretriad/`) — a decisão do dono é sobre a **composição da categoria (18 tabelas)**, que permanece intacta; o que corrijo é uma **medição de contabilidade**, que é do meu domínio. Registrado como `DIV-R5-01` e escalado ao director (§6) |
| **MND-R5-03** | *"HIGH correto: 65/72/85/86/87 nas rodadas 1/2/3/4/fila"* | `RECONCILIACAO_FINAL_AUD-001.md` §1.5.2 publica exatamente esta série | **Confere. Aplicada sem alteração** (§1.1) |
| **MND-R5-04** | *"`C-137`: `A(79/207)`, déficit 128"* | `T-45` §9 e `T-47` §11 publicam `A(79/207)` e déficit 128 = 106 + 22 | **Confere. Aplicado** (§4.1) |

---

## 1. PLACAR CONSOLIDADO — errata da base + delta da Rodada 5

### 1.1 ✅ ERRATA DE → PARA — despacho `c2` de `RECONCILIACAO_FINAL_AUD-001.md` §5, EXECUTADO

O director determinou por **enumeração** (`RECONCILIACAO_FINAL_AUD-001.md` Bloco 1) que a §1.2 da Rodada 1 **não refletiu a decisão §3.2 da própria Rodada 1** — o rebaixamento de `T13-F01` (FKs de `production_orders`) e `T13-F04` (`accounts_receivable` sem chave de negócio de parcela) de **HIGH → MEDIUM**. A §1.3 aplicou (traz a marca `2 (era 4) ⇩`); a §1.2 congelou no estágio pós-§3.1. O desvio foi herdado por citação direta em R2 §2.2 → R3 → R4 §2.1/§2.5 → `T-39` §1.3.

**Acolho integralmente e publico a errata. Isto NÃO é alteração de severidade (Regra 18): é a aplicação de uma decisão de severidade que eu próprio tomei em 2026-08-16 e que um agregado deixou de refletir.**

| Placar | HIGH publicado | **HIGH correto** | MEDIUM publicado | **MEDIUM correto** | Conferência do total |
|---|---|---|---|---|---|
| Rodada 1 | 67 | **65** | 118 | **120** | 6+65+120+57+5 = **253** ✔ |
| Rodada 2 | 74 | **72** | 155 | **157** | 6+72+157+77+10 = **322** ✔ |
| Rodada 3 (declarado) | 87 | **85** | 223 | **225** | 7+85+225+112+11 = **440** ✔ |
| Rodada 3 (reapresentado, −7 `DUPLICATE` R1) | 87 | **85** | 219 | **221** | 7+85+221+109+11 = **433** ✔ |
| Rodada 4 (produto) | 88 | **86** | 227 | **229** | 9+86+229+110+11+1 = **446** ✔ |
| `T-39` (pós `D-11`) | 89 | **87** | 227 | **229** | 9+87+229+110+11 = **446** ✔ |

**O total vigente de 446 não muda em nenhuma linha. Nenhum finding entra, sai, muda de enunciado, de âncora, de autoria ou de mérito. Muda a distribuição entre duas colunas, e só.**

**Consequências nominadas, também acolhidas:**

| Objeto | Publicado | **Corrigido** |
|---|---|---|
| Estrato 4 da fila (`T-39` §2.4) | 79 | **77** |
| Universo da Regra 22 (`T-39` §1.3) | 98 | **96** |
| Conferência da fila (`T-39` §2.5) | 4+10+5+79 = 98 | **4+10+5+77 = 96**; 96+229+110+11 = 446 ✔ |
| Regra 22 na Rodada 2 (§2.4: "80 sob o regime") | 80 | **78** (histórico, sem efeito hoje) |
| CRITICAL · LOW · INFO · 446 vigentes · 464 emitidos · 17 absorvidos · 1 FP | — | **inalterados** |

**Correção de citação também acolhida** (`RECONCILIACAO` §1.7): `T-39` §2.4/§6.1 e `OBS-T38-02` citam `OBS-T26-04` como fonte do ±2. **Não é.** `OBS-T26-04` é a discrepância interna de `T-08` em **LOW/INFO**, soma zero, **resolvida na Rodada 1**. **Metade do fundamento de bloqueio do estrato 4 nunca teve objeto.** Registro e não reabro.

### 1.2 Entradas brutas desta rodada — **37 IDs**, por enumeração

| Origem | Total | CRIT | HIGH | MED | LOW | INFO |
|---|---|---|---|---|---|---|
| `T-41` (§5) | 9 | 0 | **2** | 5 | 2 | 0 |
| `T-42` (§5) | 6 | 0 | 0 | 4 | 2 | 0 |
| `T-43` (§3) | 11 | 0 | **1** | 7 | 3 | 0 |
| `T-45` (§3) | 8 | 0 | **1** | 3 | 4 | 0 |
| `T-47` (§4) | 3 | 0 | 0 | 0 | 3 | 0 |
| **TOTAL BRUTO NOVO** | **37** | **0** | **4** | **19** | **14** | **0** |

**Enumeração por ID, para que a soma seja auditável sem refazê-la:**

- **HIGH (4):** `T41-EST-F01`, `T41-RH-F02`, `T43-SST-F01`, `T45-SST-F01`.
- **MEDIUM (19):** `T41-META-F03`, `T41-TI-F04`, `T41-JUR-F05`, `T41-SST-F06`, `T41-SUP-F08` · `T42-EST-F01`, `T42-PCP-F02`, `T42-FIS-F03`, `T42-SUP-F04` · `T43-SST-F02`, `T43-SST-F03`, `T43-RH-F04`, `T43-SST-F05`, `T43-SST-F06`, `T43-SST-F07`, `T43-LGPD-F10` · `T45-SST-F02`, `T45-FAC-F03`, `T45-LGPD-F04`.
- **LOW (14):** `T41-LGPD-F07`, `T41-META-F09` · `T42-QUA-F05`, `T42-META-F06` · `T43-RH-F08`, `T43-SST-F09`, `T43-META-F11` · `T45-FAC-F05`, `T45-SST-F06`, `T45-META-F07`, `T45-TI-F08` · `T47-RH-F01`, `T47-RH-F02`, `T47-META-F03`.

Conferência contra as origens: `T-41` §12 declara *"9 — 2 HIGH, 5 MEDIUM, 2 LOW"* ✔ · `T-42` §11 *"6 — 0 CRITICAL, 0 HIGH, 4 MEDIUM, 2 LOW"* ✔ · `T-43` §9 *"11 — 0 CRITICAL, 1 HIGH, 7 MEDIUM, 3 LOW"* ✔ · `T-45` §9 *"8 — 0 CRITICAL, 1 HIGH, 3 MEDIUM, 4 LOW"* ✔ · `T-47` §11 *"3 — 0/0/0/3 LOW"* ✔. **Somas por severidade: 2+0+1+1 = 4 HIGH; 5+4+7+3+0 = 19 MEDIUM; 2+2+3+4+3 = 14 LOW. 4+19+14 = 37.** Fecha nos dois sentidos.

### 1.3 Absorções, `DUPLICATE` e descartes desta rodada — **ZERO**

Nenhum ID novo é `DUPLICATE` de ID pré-existente e nenhum ID pré-existente é absorvido por ID novo. Verificações declaradas pelos produtores e por mim acolhidas:

1. **`T-47` §4 declara expressamente que NÃO reemite `T45-SST-F02`** (`sst_estornos_entrega_epi`), embora a tabela caia no seu escopo. **Não-duplicação por abstenção do próprio autor** — o padrão correto, registrado como precedente.
2. **`T43-META-F11` é amplificação de `T41-RH-F02`, não duplicata.** `T-43` §3 declara: *"isto é amplificação de evidência de `T41-RH-F02`, não finding novo de mecanismo, e eu não altero a severidade daquele finding"*. O objeto inédito são **as duas tabelas adicionais** (`hr_admission_processes`, `hr_termination_processes`), que `T41-RH-F02` não cobria. **Vínculo `COMPLEMENTAR` registrado; os dois contam uma vez cada, em dimensões distintas** (mecanismo × amplitude), e **entram no mesmo lote de remediação** (§3.4, `OR-27`).
3. **`T41-EST-F01` × `T35-DIN-F06`** — `T-41` §11.4 prova que são **opostos**: lá o filtro de `active` falta e o inativo **volta**; aqui o filtro existe e está correto, e falta a **guarda na transição** `true → false`. **Não são duplicata e uma remediação que "adicione filtro de `active`" NÃO resolve `T41-EST-F01`.** Aviso propagado ao grupo G-24 (§7) e à SanaCore.
4. **`T41-META-F03` × `AUD-DB-T31-03`** — vetores opostos da mesma dessincronização (`model → DDL` × `DDL → model`). Não é duplicata; **a remediação de `AUD-DB-T31-03` precisa virar bidirecional**, senão resolve metade.
5. **`T42-FIS-F03` × `T41-LGPD-F07`** — mesma patologia (prazo legal sem lastro), severidades diferentes por exposição declarada (`T-42` §10.5). Não duplicatas.
6. `T-44` e `T-46` declararam **0 falsos positivos e 0 duplicatas** nos seus escopos.

**Limite inalterado (Rodadas 3 §3.6 / 4 §3.5): minha dedupe é sintática, não semântica.** `DUP-ABERTA-01` e `DUP-ABERTA-02` **continuam abertas** — nenhuma entrada desta rodada trouxe os inventários pendentes.

### 1.4 Retificações que NÃO criam ID e NÃO movem placar — registradas

| Objeto | DE | PARA | Fonte | Efeito no placar |
|---|---|---|---|---|
| `T35-META-F01` — tabelas sem model | 21 | **22** | `T-47` §1.2 (aritmética completa: 185 models, não 186; 200+7 = 207 tabelas); ratificado por `APR-2026-042` D1 | **zero** — o déficit total de 155 não muda; muda a partição |
| `T-35:113` — lista nominal com model | 134 | **133** | `T41-META-F09` (LOW, contado em §1.2) | zero |
| `RES-T42-04` — atraso do baseline | "≥ 9 migrations" | **exatamente 9** | `T-47` §1.1 | zero |
| `T-42` §6 — mecanismos executáveis de classificação | "existe **um**" | **existem dois** (`employeeSensitiveFields.ts`, `rhSensitiveFields.ts`) | `T-43` §6.1 — erro do autor **contra o objeto auditado**, autodeclarado | zero |
| `T-43` §1.4/§9 — 21 sem model "não censáveis" | não censáveis | **nomeáveis e auditáveis por DDL; não contáveis por falta de model** | `T-45` §6.2, executado por `T-47` | zero |
| `T-41` §6.4 — 71 INTEGRAL não cobertas | "limite superior" | **número exato** (sobreposição ZERO, por construção do universo) | `T-42` §2.1 — erro do autor a favor dele próprio, autodeclarado | zero |
| Rodada 4 §7.4 — par de cobertura "não existe" | não existe | **existe** `24-coverage/AUDIT_COVERAGE_EXECUTED_RODADA4.md` | listagem própria nesta sessão | zero; ver §4.5 |

**`T-35`, `T-41`, `T-42`, `T-43`, `T-45` e as Rodadas 1-4 NÃO foram alterados (Regra 15).** Este documento é o veículo das leituras corrigidas, como cada trilha instruiu.

### 1.5 PLACAR — `T-39` (base corrigida) → **Rodada 5**

| Severidade | `T-39` corrigido (§1.1) | **Rodada 5 (produto)** | Delta | Composição do delta |
|---|---|---|---|---|
| **CRITICAL** | 9 | **9** | — | nenhuma trilha desta leva emitiu CRITICAL |
| **HIGH** | 87 | **91** | **+4** | `T41-EST-F01`, `T41-RH-F02`, `T43-SST-F01`, `T45-SST-F01` |
| **MEDIUM** | 229 | **248** | **+19** | 5 de `T-41` · 4 de `T-42` · 7 de `T-43` · 3 de `T-45` |
| **LOW** | 110 | **124** | **+14** | 2 de `T-41` · 2 de `T-42` · 3 de `T-43` · 4 de `T-45` · 3 de `T-47` |
| **INFO** | 11 | **11** | — | — |
| **Sem severidade fixada** | 0 | **0** | — | `D-11` fechou a coluna; nenhum novo aguarda fixação |
| **TOTAL VIGENTE (produto)** | **446** | **483** | **+37** | — |
| `FALSE_POSITIVE` | 1 | **1** | — | `T11-F10`. `T-44` e `T-46`: **0 falsos positivos** |
| `DUPLICATE`/absorvidos acumulados | 17 | **17** | — | §1.3: zero nesta rodada |
| **TOTAL DE IDs EMITIDOS (produto)** | 464 | **501** | **+37** | — |
| **Processo da auditoria** (categoria separada) | 1 | **1** | — | `AUD-PROC-CUSTODIA-01` — inalterado |

**Conferência aritmética, refeita nos dois sentidos:**
9 + 91 + 248 + 124 + 11 = **483 vigentes**. 483 + 1 `FALSE_POSITIVE` + 17 absorvidos/`DUPLICATE` = **501 IDs emitidos**. E 464 + 37 = **501**. Fecha. Verificação do líquido: 37 brutos − 0 absorvidos = 37; 446 + 37 = 483. Fecha.

**Efeito da errata sobre o produto desta rodada, dito explicitamente:** se a base errada (89 HIGH / 227 MEDIUM) tivesse sido usada, o produto seria 93/246 — **os mesmos 483**. **A errata não muda o total em nenhum ponto da cadeia; muda quem está em qual coluna, e é isso que a fila de remediação e a Regra 22 consomem.**

---

## 2. SEVERIDADES CONGELADAS POR `APR-2026-035` — aplicadas, com o argumento do validador preservado

`APR-2026-035` encerrou as três pendências de severidade que bloqueavam os relatórios finais. **Aplico as três sem alterá-las (Regra 18) e sem apagar o que foi decidido contra (Regra 20).**

### 2.1 `D-01` — `AUD-CTB-DEBCRED-01`: **MANTIDA HIGH**. Divergência resolvida por autoridade, não por consenso

**O dono recusou o rebaixamento** recomendado por `T-34` e reafirmado pelo director.

**O argumento do validador permanece no corpus e é reproduzido aqui, não apagado:** havia quatro camadas de contenção verificadas — `authorizeModule`, Zod `.min(0).strict()`, `validateEntryItemsShape` nos dois escritores, estorno fechado sob inversão — e **nenhum caminho de alcance demonstrado**; a régua interna sustentava o rebaixamento, já que `AUD-DB-T31-01`, da mesma classe, é MEDIUM.

**O fundamento da decisão é do dono, e é de risco, não de mecanismo:** lançamento contábil sem trava no banco é risco alto **independentemente** das camadas de aplicação.

**Registro a natureza do ato com precisão, porque o relatório final vai precisar dela:** isto é **divergência resolvida por autoridade humana registrada**, exatamente a via da Regra 20 (*"resolve-se por evidência → teste → requisito → regra → responsável humano"*) quando os degraus anteriores não desempatam. **Não é consenso técnico**, e não deve ser apresentado como tal.

**Precedente que a decisão fixa e que o relatório deve carregar:** *contenção em aplicação, por mais camadas que tenha, não rebaixa por si só um finding de integridade contábil neste programa.*

**Efeitos operacionais:** `AUD-CTB-DEBCRED-01` permanece **HIGH no estrato 4**, agora com **posição definitiva** (deixa de ser provisória — `T-39` §4.2 fica superada neste ponto). **`D-01` FECHADA.** O item independente `PostEntryUseCase.ts:66-67` (ignorar em vez de rejeitar valor `<= 0`) sobrevive à decisão e mantém prioridade própria.

### 2.2 `D-R1` — `AUD-DB-09`: **MEDIUM re-fundamentado** (não é o MEDIUM herdado)

Acolhida a recomendação do director (`REEXAME_AUD-DB-04-09.md` §2.6).

**O ponto que o relatório final não pode perder:** o MEDIUM que vigora **não é** o MEDIUM original. A premissa original — *"soft delete confirmadamente ausente"* — foi retificada pelos **dois autores de origem** (`T-03_RETIFICACAO_01.md` §3 e `AUD-DB-09_RETIFICACAO_01.md` §1-§3) e **não existe mais**. O MEDIUM vigente está re-fundamentado na redação retificada de `AUD-DB-09_RETIFICACAO_01.md` §2.2 — adotada verbatim na Rodada 4 §4.2 —, que é **mais desfavorável ao objeto auditado** que a original: soft delete semântico em **34 tabelas**, filtro **100 % de aplicação com zero lastro em banco**, e **3 falhas nomeadas no caminho de escrita** (`cost_centers`, `clients`, `suppliers`).

**Fundamento aceito para não elevar:** as 3 falhas concretas **já têm titular** em `T35-DIN-F06` (MEDIUM, ampliado a 3 entidades de escrita) e a dimensão de trilha em `AUD-ALOG-01` (CRITICAL). Elevar `-09` pelo mesmo conteúdo seria **dupla contagem** — prática que este run rejeita expressamente e que já foi codificada como regra na Rodada 4 §3.2.

**`D-R1` FECHADA.** **`D-R3` PREJUDICADA**, por ser condicional à elevação que não ocorreu.

**🚫 O bloqueio normativo da Rodada 4 §4.3 permanece integralmente vinculante** e é reafirmado aqui: a frase *"soft delete não existe"* e variantes **não podem aparecer como conformidade genérica** em nenhum relatório final. Forma admissível: *"soft delete por `deleted_at`/`paranoid` não existe"*, sempre com escopo explícito, e com a contraparte *"soft delete semântico por `active`/`status` existe em 34 tabelas e o filtro é 100 % de aplicação, sem lastro em banco"*.

### 2.3 `D-R2` — `AUD-DB-04`, `-05`, `-06`, `-07`, `-08`: **MEDIUM ratificado em lote**

Ratificada a manutenção, com o fundamento verificado finding a finding pelo director: `-05`, `-07` e `-08` têm **zero menções** nas retificações — premissas intactas **por verificação, não por presunção**; `-06` ganhou apenas interação de impacto com `AUD-ALOG-01`; `-04` ganhou dependência **condicional** do item `/B` no recorte `Item`/UUID, sem mudança de mérito.

**Esta ratificação FECHA a pendência técnica `T-16`** (Rodada 4 §6.2), que estava aberta desde a Rodada 4 e era escalação minha ao director.

### 2.4 Estado consolidado das severidades

**Nenhuma pendência de severidade permanece aberta com o dono.** As severidades do corpus estão **congeladas para efeito dos relatórios finais**. Severidades fixadas pelo dono e intocadas nesta rodada: `AUD-RH-VTHORISTA-01` CRITICAL · `AUD-EST-TRUNCCADEIA-01` HIGH · `AUD-PAT-DEPRECIACAO-01` MEDIUM · `AUD-ALOG-01/A` CRITICAL e `/B` HIGH · `AUD-RH-COMISSAO-01` HIGH (`D-11`) · `AUD-CTB-DEBCRED-01` HIGH (`D-01`) · `AUD-DB-04`…`-09` MEDIUM ×6 (`D-R1`/`D-R2`).

**Severidades PROPOSTAS pelos autores nesta leva e não alteradas por mim:** as 37 de §1.2. As duas HIGH validadas (`T43-SST-F01` por `T-44`, `T45-SST-F01` por `T-46`) tiveram **manutenção de HIGH recomendada pelos validadores** — recomendação, não alteração; a fixação formal é ato do director (Regra 18).

---

## 3. FILA DE REMEDIAÇÃO — reaplicação do critério de `APR-2026-031`

### 3.1 O critério, inalterado

**Estrato 1** CRITICAL·produção real → **estrato 2** HIGH·produção real → **estrato 3** CRITICAL·dev/homologação → **estrato 4** HIGH·dev/homologação → MEDIUM/LOW/INFO depois, **produção real à frente dentro de cada bloco de mesma severidade**. Exposição real reordena **apenas** CRITICAL e HIGH (`D-13` item 3). `OR-*` reordenam **dentro** do estrato; dependência de item produção real **herda a prioridade do dependente**, no recorte necessário. Cláusulas de reavaliação automática são **metadado obrigatório**. A ordenação executiva final é do director (Regra 5); casos abertos (`CASE-001`, `CASE-002`) seguem a ordem dele.

### 3.2 ⚠️ Os 37 IDs novos **não têm classificação de ambiente declarada** — e eu não a infiro

`T-38` classificou os 446 IDs do corpus então vigente. **Os 37 novos nasceram depois e nenhum artefato lhes atribui ambiente.** Não os classifico por analogia (Regra 6; e a memória de que o ERP "está em uso real" não é artefato de decisão — Regras 8/10/18).

**O que registro como fato verificável, sem decidir:**

| Módulo dos IDs novos | Fato de artefato | Consequência provisória |
|---|---|---|
| `sst` (17 IDs) | `T-42` §5 registra: *"o módulo SST está classificado **NÃO-PRODUÇÃO** em `PRODUCTION_STATUS_MAP.md`"* | provisoriamente **DEV/HOMOLOGAÇÃO** |
| `facilities` (2), `ti` (3), `jur`/LGPD (3), `marketing`/`pcp`/`qua`/`sup` (5) | mesma classificação de não-produção | idem |
| **`rh` — `T41-RH-F02` e `T43-RH-F04`** | `APR-2026-031` `D-13` item 4 declara uso real de `employees` **confirmado só para o fluxo de desligamento**. **`T41-RH-F02` e `T43-RH-F04` incidem exatamente sobre o gate de desligamento** (`asoGate.ts:26`, `ConcludeTerminationProcessUseCase.ts:71`) | ⚠️ **CANDIDATOS a `MISTO`/`PRODUCAO_REAL` no recorte desligamento. NÃO decido** — escalado ao director como extensão nominal de **`P-T39-01`** (§5.2). Se confirmado, `T41-RH-F02` **sobe ao estrato 2** |
| `T47-RH-F01`, `T47-RH-F02`, `T47-META-F03` | superfície de aplicação **zero** (provado por busca exaustiva) | sem ambiente de execução aplicável |

**Enquanto não houver declaração, os 37 entram na fila pelos estratos dev/documental**, com a ressalva acima viajando junto. **Isto é limite declarado, não medição.**

### 3.3 A fila atualizada

| Estrato | Conteúdo | Contagem | Movimento nesta rodada |
|---|---|---|---|
| **1** — CRITICAL · PRODUÇÃO REAL | `AUD-ALOG-01/A`, `AUD-AUTHN-01`, `AUD-INTEG-03`, `FIND-ERP-001` (CASE-001) | **4** | **inalterado** |
| **2** — HIGH · PRODUÇÃO REAL | `AUD-ALOG-01/B` (cabeça) + `/C`,`/F`,`/G` (metadado) + os 9 nominais de `T-38` §4.3 + `T32-SUP-F03`; recortes MISTO herdados (`AUD-SEC-T04-01`, `T-05-04`, `T17-F03`, `T18-F02`, `T18-F03`, `T19-F03`) | **10** | **inalterado** — nenhum ID novo tem produção real **declarada**. ⚠️ `T41-RH-F02` é candidato pendente (§3.2) |
| **3** — CRITICAL · DEV/HOMOLOGAÇÃO | `FIND-ERP-005` (CASE-002), `T08-F01`, `T24-F01`, `AUD-COM-DESCONTO-01`, `AUD-RH-VTHORISTA-01` | **5** | **inalterado** |
| **4** — HIGH · DEV/HOMOLOGAÇÃO | 91 HIGH − 10 de produção real | **81** (era 77) | **+4**: `T41-EST-F01`, `T41-RH-F02`, `T43-SST-F01`, `T45-SST-F01` |
| **MEDIUM** | — | **248** | +19 |
| **LOW** | — | **124** | +14 |
| **INFO** | — | **11** | — |

**Conferência da fila, nos dois sentidos:** 4 + 10 + 5 + 81 = **100** = 9 CRITICAL + 91 HIGH ✔. E 100 + 248 + 124 + 11 = **483** ✔. Fecha com §1.5.

### 3.4 Posicionamento nominal dos 4 HIGH novos dentro do estrato 4

| ID | Estado de liberação | Notas de execução (insumo registrado, não ordem minha) |
|---|---|---|
| **`T43-SST-F01`** — ASO gravado fora da transação que enfileira o S-2220 | ✅ **LIBERADO** — `T-44` `CONFIRMED`, HIGH mantida, confiança de mecanismo elevada a `CONFIRMED` | **Cabeça recomendada dos 4.** Correção de 3 linhas, sem migration, com a forma correta já usada por **8 dos 9** repositórios do módulo SST. **`OR-26` (novo, §3.5):** o `UNIQUE (employee_id, tipo, data_realizacao)` do critério de reteste **pode falhar no deploy** se houver duplicatas preexistentes — detecção/tratamento é **precondição, não detalhe** (`T-44` §6 item 4). Itens 5-7 de `T-44` §6 (desempate determinístico em `findLatestAsoByEmployee`; reconciliação `sst_asos` × `sst_eventos_esocial`; definição de `status_esocial_s2220`) **fazem parte do escopo** — fechar só 1-3 deixa o ASO órfão sem tratamento e o gate de RH não determinístico |
| **`T45-SST-F01`** — portão de BR-SST-002 verifica o rótulo, não o artefato; linha fica imutável | ✅ **LIBERADO** — `T-46` `CONFIRMED`, HIGH mantida, confiança de mecanismo elevada a `CONFIRMED` | **`OR-27` (novo):** a remediação **não pode parar na validação** — o dano das linhas já confirmadas é irreparável pelo par trava-total + estorno inexistente. Ou **`T45-SST-F02` entra no mesmo lote**, ou o director decide converter `sst_lock_entrega_epi` em trava **seletiva** nos moldes de `sst_lock_cat()` — **decisão humana, não da SanaCore** (Regras 6/18). `server/tests/unit/sst-epi.test.ts:116-130` **codifica hoje o comportamento defeituoso** e precisa ser atualizado no mesmo commit (`T-46` §3.3). **Correção de moldura recomendada por `T-46` §4.1, acolhida (§3.6)** |
| **`T41-EST-F01`** — desativar depósito com saldo remove a linha da invariante sem gerar movimento | ⛔ **NÃO LIBERADO** — **sem veredito da Regra 22** (§2 do bloco seguinte / §6) | Posição reservada no estrato 4. **`OR-28` (novo):** aviso vinculante à SanaCore — *uma remediação que apenas adicione filtro de `active` **não resolve** este finding* (`T-41` §11.4). O que falta é **guarda na transição** `true → false` |
| **`T41-RH-F02`** — ASO em duas tabelas com domínios divergentes; o gate de retorno lê a cópia | ⛔ **NÃO LIBERADO** — **sem veredito da Regra 22** | Posição reservada. **`OR-29` (novo):** remediar **no mesmo caso** que `T43-META-F11` — a divergência `apto_com_restricoes` × `apto_com_restricao` é **sistêmica: 3 enums de RH contra 1 de SST**, não um par. ⚠️ **Candidato a produção real** (§3.2). `DYN-T41-03` é o pedido dinâmico de maior valor da leva: **uma única linha de resultado eleva o finding de HIGH a CRITICAL** |

### 3.5 Dependências de ordem **novas** — `OR-26` … `OR-30`

| # | Ordem | Fundamento |
|---|---|---|
| **OR-26** | **`T43-SST-F01`: detecção/tratamento de duplicatas de `sst_asos` ANTES da migration de `UNIQUE`** | `T-44` §6 item 4 — a auditoria é estática e `APR-2026-016` proíbe consultar `erp_evok_audio`; **não é possível afirmar que não existem duplicatas preexistentes**. Migration de `UNIQUE` simples pode falhar no deploy |
| **OR-27** | **`T45-SST-F01` e `T45-SST-F02` no MESMO lote** — ou decisão humana de converter a trava total em seletiva | `T-46` §3.1/§5 item 4 — sem isso, a validação protege o futuro e deixa o dano existente irreparável |
| **OR-28** | **`T41-EST-F01` NÃO é atendido por filtro de `active`** — exige recusa explícita na transição com saldo `<> 0` | `T-41` §11.4; `T-41` §7.7 prova que o módulo **sabe** proteger saldo (lock pessimista) e que a única transição desprotegida é a do flag |
| **OR-29** | **`T41-RH-F02` + `T43-META-F11` no mesmo caso de remediação** — domínio único de aptidão nas **4** tabelas | `T-43` §3 (`T43-META-F11`) — 3 enums de RH × 1 de SST |
| **OR-30** | **`T42-SUP-F04` (índice único parcial em `item_suppliers`) antes de qualquer automação que consuma `findPreferredByItem`** | `T-42` §5 — a escolha de **de qual fornecedor comprar e a que preço** depende de unicidade que o banco não impõe; o controle existe só em aplicação |

`OR-01`…`OR-25` (Rodadas 1-4 e `T-39` §3) **permanecem vinculantes e inalterados**. A divergência de remissão `OBS-T39-02` (a Rodada 4 §3.3 cita "OR-25" para a dependência comissionado↔comissão, que a tabela §5.3 numera **OR-24**) **continua registrada e não resolvida por mim** — a lista normativa é a tabela da Rodada 4 §5.3.

### 3.6 Correções de moldura acolhidas dos validadores — **não alteram severidade nem enunciado de origem**

1. **`T45-SST-F01` — eixo do título.** `T-46` §4.1 prova que o mecanismo é **indiferente ao valor do enum** (`evidencia_tipo IS NOT NULL AND evidencia_arquivo_url IS NULL` vale para os três) e que `'biometria'` **exige seleção deliberada** (o formulário inicializa em `'aceite_eletronico'`). **Acolho a recomendação de moldura:** o eixo é o **pareamento rótulo × artefato** (dano de BR-SST-002/NR-6, principal e mais frequente, que sozinho sustenta HIGH), com **biometria como agravante nominado** (declaração falsa de tratamento de categoria especial). `T-45` **não é alterado** (Regra 15); o relatório final herda esta moldura.
2. **`T45-SST-F01` — justificativa da confiança MÉDIA de frequência.** `T-46` §4.2: a UI **não** é o limitante (aceita `"n/a"` e `" "`). O limitante é **a ausência de evidência dinâmica** (`DYN-T45-01`/`-02`, bloqueados por `APR-2026-016`). **Frequência MÉDIA mantida, justificativa substituída.**
3. **`T43-SST-F01` — teto de severidade.** `T-44` §4.3: **nenhum modo de falha determinístico** da 2ª escrita foi provado. *"Quem tentar subir isto a CRITICAL alegando falha determinística estará errado."* Registro para que nenhuma leitura posterior o eleve sem evidência nova.

---

## 4. ESTADO DE COBERTURA CONSOLIDADO

### 4.1 `C-137` — **`A(79/207)`**, déficit **128 integralmente nominal**

| Item | Valor | Fonte |
|---|---|---|
| **Denominador oficial** | **207** (200 do baseline + 7 pós-freeze) — **reconstruído**, não herdado | `T-47` §1.1; fixado por **`APR-2026-042` D1** |
| Cobertas até `T-35` | 52 | `T-13` 22 + `T-31` 12 + `T-35` Tier A 18 |
| **+ `T-41`** | +9 | `T-41` §6.1 |
| **+ `T-42`** | +6 | `T-42` §4 |
| **+ `T-43`** | +8 | `T-43` §2 |
| **+ `T-45`** | +4 | `T-45` §2 |
| **+ `T-47`** | **+0** | `T-47` §6 — as 22 sem model **não são contáveis** |
| **TOTAL COBERTO** | **79 / 207 (38,2 %)** | fecha: 52+9+6+8+4+0 = 79 |
| **DÉFICIT** | **128 / 207** | **106 com model** (185 − 79) **+ 22 sem model** (`T-47` §1.5) |

**`C-137` NÃO ESTÁ FECHADA.** O que mudou de natureza, e é o produto principal da leva: **o déficit deixou de ser parcialmente anônimo. As 128 estão todas nomeadas** — 106 nas listas de `T-35`/`T-41` e 22 na enumeração de `T-47` §1.5. **Não há mais nenhuma tabela do schema sem nome numa lista de auditoria.**

**Registro a régua recusada, porque ela dimensiona a disciplina:** `T-47` §6 declara que, se as 22 fossem contadas, `C-137` saltaria para `A(101/207)` **sem que uma linha de semântica de coluna de aplicação tivesse sido verificada**. **A tentação foi nomeada e recusada pelo próprio autor**, no lote em que ela mais renderia. **Acolho e ratifico: `+0`.**

**Contagens estritas alternativas publicadas pelos autores, para que a escolha seja do director e não consequência da redação:** `T-43` §6.6 → `A(74/207)` se `sst_acidente_testemunhas` (coberta apesar de o critério a excluir) não contar; `T-45` §6.6 → `A(76/207)` se só o núcleo biométrico contar. **Uso 79**, que é a leitura publicada pelas trilhas e ratificada por `APR-2026-042`.

### 4.2 Bandas de 1ª ordem sob `APR-2026-036` — estado por banda

| Banda (1ª ordem) | Total | Cobertas | Falta | Estado |
|---|---|---|---|---|
| **ESTOQUE** | 5 | 5 | **0** | ✅ **FECHADA** (`T-42` §2.3) — primeira banda de `C-137` a fechar no run |
| **FISCAL** | 3 | 3 | **0** | ✅ **FECHADA** (`T-42` §2.3) |
| **DINHEIRO** | 29 | 4 | **25** | ⛔ **na exclusão declarada** de `APR-2026-037` §5.1 |
| **DADO PESSOAL** | 20 | 3 + as de `T-43`/`T-45` que saíram da exclusão | resíduo na §5.2 retificada | parcial — ver §4.3 |
| **2ª ordem** | 23 → **22** | — | — | exclusão declarada (`APR-2026-036`; −1 por `APR-2026-039` §2) |

**⚠️ Ressalva material que o relatório final deve reproduzir sem minimizar** (`APR-2026-037` §5.1, palavras do dono): *"dinheiro é banda de risco alto, e esta exclusão é a mais custosa da decisão. […] É razoável supor que haja mais ocorrências entre estas 25, e elas não serão encontradas por esta auditoria."* O fundamento é medido: o padrão *"coluna monetária cuja unidade é função de outra coluna que não a declara"* tem **três ocorrências independentes em três módulos** (`T35-RH-F02` salário×tipo, `T41-TI-F04` custo×ciclo, `T41-JUR-F05` valor×tipo de contrato) — **é sistêmico, não incidental**.

### 4.3 Categoria especial do art. 5º II — **18 tabelas** (`APR-2026-042` D2)

| Subcategoria | Tabelas | Censo | Estado de cobertura |
|---|---|---|---|
| **DADO DE SAÚDE** | **11** | `T-43` §1.2 — censo próprio; a marcação anterior (3) subestimava em **3,7×** | **11/11 cobertas.** 4 em trilhas anteriores (`sst_asos`, `sst_cats`, `hr_employee_documents` em `T-41`; `hr_absences` em `T-13`) + 7 em `T-43` |
| **BIOMETRIA** | **7** | `T-45` §1.2 (5) + `employees` (`APR-2026-040` D1) + `hr_candidates` (`APR-2026-042` D2) | **5 contáveis cobertas** (`sst_entregas_epi`, `sst_devolucoes_epi`, `facility_visitors`, `it_responsibility_terms` por `T-45`; `employees` por `T-35`). **2 NÃO CONTÁVEIS** — ver `DIV-R5-01` |
| **TOTAL** | **18** | — | **16 contáveis; 2 não contáveis, ambas auditadas por outra via** |

**`DIV-R5-01` — a correção de contabilidade (`MND-R5-02`).** `APR-2026-042` D2 e o mandato desta rodada afirmam *"das 7, 6 contáveis e 1 não (`hr_candidates`)"*. **Por enumeração, as não contáveis são 2:**

- **`hr_candidates`** — sem model, item 6 de `T-47` §1.5. ✔ conforme a decisão.
- **`sst_estornos_entrega_epi`** — **também sem model**, item 20 de `T-47` §1.5, e **explicitamente não contada por `T-45` §2.1**: *"se eu a contasse, o delta seria +5 e a régua teria sido afrouxada no lote em que ela mais rende. Delta é +4."*

**Logo: 5 contáveis, 2 não contáveis.** **Não altero `APR-2026-042`** (Regra 15 / ownership de `coretriad/`) e **não altero a composição da categoria** — as 18 tabelas e as 7 de biometria permanecem exatamente como o dono decidiu. O que corrijo é uma **medição de contabilidade de cobertura**, que é do meu domínio e é verificável em duas linhas de artefato. **Escalado ao `vericore-software-audit-director` para retificação formal da entrada** (§6).

**As duas não contáveis não estão desprotegidas nem inexaminadas:** `sst_estornos_entrega_epi` foi **auditada por DDL + migration** e produziu `T45-SST-F02` (MEDIUM); `hr_candidates` foi **varrida coluna a coluna por `T-47` §2.2** e entrou na categoria por precaução (`APR-2026-040`), produzindo `T47-RH-F01`/`-F02` (LOW). **A não contabilidade reduz o que a métrica pode afirmar, não a proteção.**

**Declaração de fechamento do censo — nos termos exatos dos artefatos, sem arredondar:**

> **As duas categorias especiais estão com o censo FECHADO entre as 207 tabelas do schema.** As 22 sem model foram enumeradas (`T-47` §1.5) e submetidas aos dois léxicos — clínico e biométrico — coluna a coluna: **ZERO casamentos** nos dois. **Condicionalidade única e declarada:** os **6 contêineres genéricos** de texto livre/`jsonb` (`RES-T47-02`) **não são decidíveis estaticamente** — `auditoria_eventos.antes/depois`, `webhooks_eventos.payload/resposta`, `hr_candidates.notes`, `hr_performance_reviews.notes`, `sst_estornos_entrega_epi.motivo`. `APR-2026-041` autorizou `DYN-T47-01`/`-02` **restritos ao banco de teste**, com a limitação metodológica registrada **antes** da coleta: *"zero linhas no teste NÃO prova zero linhas em produção"*. **Enquanto a coleta não ocorrer e for interpretada sob essa limitação, `RES-T47-02` permanece aberto.**

**O que o censo custou em correções contra os próprios auditores, e que o relatório deve carregar como sinal de qualidade, não de fragilidade:** duas subestimativas da própria categoria foram detectadas e corrigidas **pela condição vinculante que o dono impôs** — saúde 3 → 11 (`T-43` §6.3), biometria 2 → 5 (`T-45` §6.3). **Sem essa condição, 4 tabelas com dado de saúde de trabalhador — incluindo admissão e demissão — teriam entrado na lista de exclusão** (`APR-2026-039` §1).

### 4.4 Lista de exclusão declarada — histórico e **fonte nominal oficial**

| Momento | §5.2 (1ª ordem, dado pessoal sem saúde) | Ato |
|---|---|---|
| `APR-2026-037` §5.2 | **14** | lista original |
| `APR-2026-039` §2 | **11 nominais / 9 efetivas** | saem `sst_investigacoes_acidente`, `hr_admission_processes`, `hr_termination_processes` (dado de saúde); saem `sst_entregas_epi` e `sst_devolucoes_epi` (biometria, §3) |
| `APR-2026-040` D2 | **8** | sai `facility_visitors` (biometria, fronteira A qualificada) |

> **A lista do relatório final é a de 8 tabelas, e a FONTE NOMINAL é `T-43` §9 + `T-45` §9 — NÃO `APR-2026-037` §5.2.**
> `APR-2026-040` D2 fixa isto por escrito; `T-43` §9 e `T-45` §9 são os artefatos que carregam a lista efetiva. O `vericore-audit-reporting-agent` fica **vinculado**.

**As demais faixas de exclusão declarada, todas nominais:** §5.1 dinheiro **25** (`APR-2026-037` §5.1 / `T-42` §2.4) · §5.3 de 2ª ordem **22** (era 23; −`sst_ges_funcionarios` por `APR-2026-039` §2; lista em `T-42` §2.5) · §5.4 banda excluída da triagem **53** (`T-41` §3.2) · **22 sem model** — **agora nomeadas** (`T-47` §1.5), o que **satisfaz pela primeira vez** a condição vinculante de `APR-2026-038` D1 (*"antes de aceitar as 21 por exclusão, é preciso NOMEÁ-LAS"*). **A nomeação está feita; a decisão de cobertura × exclusão sobre elas continua sendo do dono** (bloco **B8**).

### 4.5 Demais células — estado consolidado

| Célula | Estado | Fonte | Bloqueia relatório? |
|---|---|---|---|
| `C-01`/`C-02` — `juridico` D3/D4 | 1 endpoint ambíguo (`GET /juridico/reports/financeiro`); `DEF-01` fecha 74/75 ou 75/75 conforme definição | `DIV-T27-JUR-03`; bloco **B6** | não — definição da VeriCore |
| `C-03`/`C-04` — `rh` D3/D4 | **`A(≈44/57)`** — ≈13 endpoints sem exame | `DIV-T27-RH-02`, aberta; bloco **B4** | não; **bloqueia** afirmar cobertura de RH |
| `C-05`/`C-06` — `sst` D3/D4 | **`E 75/75 DECLARADA, NÃO CONFIRMADA PELO PAR — ≈6 endpoints sem atribuição de profundidade`** | determinação do director, `RECONCILIACAO` §2.3; `RES-T26-07`, 3ª rodada | não — **o relatório emite com a divergência declarada, nesta forma exata** |
| `C-16`…`C-34` — D9 tier 2 | 19 células **parciais**; 4 de 10 categorias ASVS não varridas (cripto, segredos, dependências, árvore de dev sem gate) | bloco **B2** | não; **bloqueia** afirmar G3 cumprido |
| `C-35`…`C-62` — D4-D8 dos 174 profundos | **`A(≈91/174, 52 %)`** — ≈83 endpoints × 5 dimensões | bloco **B3**; depende de `F-5` | não; **bloqueia** condição (a) de G3 |
| `C-63`…`C-132` — 43 rasos | **ENTREGUES** — 70 células (35 Bloco A + 35 Bloco B), partição resolvida por enumeração | `T-33` A+B; `RECONCILIACAO` §2.5/§2.6 | não |
| `C-133` — `client/` | **`A(157/167)` PARCIAL ALTA** — 31 lidas dirigidamente, ≈10 sem atribuição nominal. Denominador do plano = 167 | `RECONCILIACAO` §2.4; `D-07` aberta (objeto mudou: emendar ou não o plano) | não — PARCIAL ALTA nos três denominadores |
| `C-134`/`C-135` — `mobile`/`tv` | **`E`**, triagem 100 % | `T-29` | não |
| **`C-136` — contrato de API por dimensão** | **NENHUMA trilha tocou em 3 levas de fieldwork.** 683 endpoints × 11 dimensões ≈ 7.500 células; ≈50 lotes. **SEM DECISÃO** | `APR-2026-038` D2; `RES-16`, 4ª rodada | ⛔ **SIM** (§5.1) |
| **`C-137`** | **`A(79/207)`**, déficit 128 integralmente nominal | §4.1 | ⛔ **SIM** — critério de encerramento existe, encerramento não |

**Par de cobertura — correção da Rodada 4 §7.4:** `24-coverage/AUDIT_COVERAGE_EXECUTED_RODADA4.md` **EXISTE** (verificado por listagem nesta sessão). A afirmação da Rodada 4 §7.4 (*"continua não existindo"*) está **superada por fato posterior**. **Estado atual:** o par mede o corpus da Rodada 4 + `T-38`/`T-39`/`T-40`; **não alcança `T-41`…`T-47`** — está **um corpus atrás**, não dois. **`OBS-T26-33` é reduzida, não encerrada**, e o ato de encerrá-la é do `vericore-software-audit-director`.

---

## 5. PENDÊNCIAS QUE BLOQUEIAM O ENCERRAMENTO — nominais

`APR-2026-042` D4 liberou a **produção** dos relatórios. **Não liberou o encerramento da auditoria.** A lista abaixo é o que impede a **declaração final**, separada por natureza.

### 5.1 ⛔ BLOQUEANTES DE ENCERRAMENTO — nomeados pelo próprio dono em `APR-2026-042`

| # | Item | Objeto exato | Estado |
|---|---|---|---|
| **BLQ-1** | **Contradição `G3` × EMENDA-01** | **Gate G3** (`APPROVALS.md:584`, `APPROVED_WITH_CONDITIONS`) **VEDA amostragem** em segurança, integridade de dados, **dado pessoal**, contratos e regras críticas. **`APR-2026-037`** (EMENDA-01) **ACEITA cobertura parcial** com exclusão nominal em bandas que incluem dado pessoal e integridade de dados. **Os dois estão aprovados, os dois estão em vigor, e eles se contradizem.** Caracterização do dono: *"é um gate que a própria auditoria criou e depois contornou"*. O `G8` (`:585`) prevê a via legítima — redução por nova decisão humana registrada — **e o G3 não foi formalmente reduzido** | ⛔ **ABERTA.** `APR-2026-038` D3 a torna **condição de fechamento**, com **destaque obrigatório no Relatório Executivo**, **redação minimizadora vedada**, apresentação **como contradição entre dois artefatos aprovados**, com os dois **citados por linha**. O fechamento da categoria especial (§4.3) **reduz** a tensão — **não a elimina**: o G3 fala em *"dado pessoal"*, e as **8** tabelas de dado pessoal **não sensível** seguem excluídas (`RES-T45-10`, `RES-T47-09`) |
| **BLQ-2** | **`C-136`** | Sem decisão de cobertura, sem decisão de aceitação. A caracterização foi entregue e **o julgamento do dono se confirmou**: a estimativa errou por **unidade de contagem** (1 célula/1 sessão no plano × ≈7.500 células reais/≈50 lotes) e a subestimativa **esconde a única superfície onde authz e idempotência são vistas POR ROTA**. Esta auditoria **já provou duas vezes que trilha por módulo erra por omissão de fronteira** — `AUD-SEC-T04-01` e, decisivamente, **`AUD-ALOG-01`**, cujos 8 endpoints mudos **apareceram por acaso numa retificação sobre soft delete**. É também a base para varrer a **Regra 24** por rota — que o `CLAUDE.md` classifica como **CRITICAL bloqueante para release** | ⛔ **ABERTA** (`APR-2026-038` D2). A variante barata (só IN-categoria) **depende de `F-5`, que não existe** |
| **BLQ-3** | **`RES-T47-02`** — 6 contêineres genéricos | Única condicionalidade que resta no fechamento das duas categorias especiais. `APR-2026-041` autorizou `DYN-T47-01`/`-02` **restritos a `erp_evok_audio_test`**, com limitação registrada **antes** da coleta: se o resultado for "zero linhas", a condicionalidade **não fecha** — é **rebaixada** de *"não decidível estaticamente"* para *"não decidível sem acesso a produção"*, que é decisão de outra natureza e **não está autorizada** | ⛔ **ABERTA — coleta NÃO EXECUTADA.** Nenhum artefato de execução existe em `07-findings/` nesta data |
| **BLQ-4** | **Blocos sem decisão de `CELULAS_SEM_AUTORIZACAO_ACEITACAO.md`** | **9 blocos nominais**, com custo medido, **aguardando decisão item a item do dono** (Regra 18). Enquanto a recusa da Opção B de `APR-2026-024` Decisão A estiver de pé para eles, **nenhum agente pode registrar "aceito com exclusão declarada"** | ⛔ **ABERTA** — ver quadro abaixo |

**Os 9 blocos, com estado atualizado por esta rodada:**

| Bloco | O que é | Itens | Custo de cobrir | Estado após a Rodada 5 |
|---|---|---|---|---|
| **B1** | `C-136` — matriz de contrato por dimensão | 683 × 11 ≈ 7.500 células | ≈50 lotes (integral) | **= BLQ-2.** Sem decisão |
| **B2** | D9 tier 2 — segurança em 19 módulos | 19 células parciais, 4 de 10 categorias | 1-2 varreduras transversais | Sem decisão. **Melhor relação custo/risco da lista**, e "segurança" é categoria **nominalmente vedada** à amostragem em G3 |
| **B3** | D4-D8 dos 174 profundos | ≈83 endpoints × 5 dimensões | ≈3 lotes | Sem decisão. **Agravado por `T-41`:** `facilities` e `ti` foram onde se achou **dinheiro sob rótulo de "apoio"** (`it_software_license_details.cost` com três unidades temporais) |
| **B3-bis** | **`F-5`** — lista nominal IN × OUT dos 174 | 174 endpoints | **1 varredura** | ⛔ **ABERTA há 5 rodadas.** *"A lacuna mais barata da run."* Sem ela **a amostra dos 174 não satisfaz a condição (a) de G3**. Já despachada como `c7`; **continua sem entrega** |
| **B4** | Resíduo de `rh` D3/D4 | ≈13 de 57 | **< 1 lote** | Sem decisão. **Densidade de achado medida, não hipotética:** o módulo já produziu `AUD-RH-VTHORISTA-01` (CRITICAL), `AUD-RH-CPFSEARCH-01`, `AUD-RH-COMISSAO-01` — e agora `T41-RH-F02` e `T43-RH-F04` |
| **B5** | Resíduo de `sst` D3/D4 | ≈6 sem prova de cobertura | 1 cruzamento de listas | Sem decisão de fieldwork; forma de registro **já determinada** (`RECONCILIACAO` §2.3). Despachado como `c8`; sem entrega |
| **B6** | Resíduo de `juridico` | 1 endpoint | zero | **Não é matéria do dono** — definição do `vericore-software-audit-director` |
| **B7** | `C-133` — resto do `client/` | ≈10 sem atribuição + 31 dirigidas | 1-2 lotes | Sem decisão. As 8 de comercial/financeiro têm **declaração do próprio executor** de que a leitura dirigida é insuficiente para afirmar ausência de achado |
| **B8** | Tabelas sem model em `C-137` | **22** (era 21) | nomear: **FEITO**; cobrir: 2-3 lotes | ✅ **A NOMEAÇÃO ESTÁ ENTREGUE** (`T-47` §1.5). A condição de `APR-2026-038` D1 está satisfeita. **A decisão cobrir × excluir agora é tomável com a lista na mão — e continua sendo do dono** |
| **B9** | Prova dinâmica / `RES-11` / G4 | ≈**232** pedidos (≈190 + 42 novos); ~103 catalogados, ~21 executados | janela de execução autorizada | Sem decisão de janela. `APR-2026-041` autorizou **2** pedidos, no banco de teste, **e não foram executados** |

### 5.2 🔧 PENDÊNCIAS TÉCNICAS COM TITULAR — herdadas e novas

| # | Pendência | Titular | Estado |
|---|---|---|---|
| **T5-01** | ⛔ **Regra 22 — `T41-EST-F01` e `T41-RH-F02` sem veredito adversarial** | `vericore-finding-validator`, por despacho do `vericore-software-audit-director` | **NOVA — as duas únicas exceções vivas da Regra 22 no corpus.** Ver §6. **Falha de despacho:** `T-41` §12 declarou expressamente *"os 2 HIGH seguem para `vericore-finding-validator`"*; o lote 3 gerou **`APR-2026-036`** (decisão de escopo) e o despacho da validação **não acompanhou**. `T-43` e `T-45` tiveram os seus (`T-44`, `T-46`); `T-41` não |
| **T5-02** | **Enumeração integral do estrato 4** — despacho `c3`. Base **desbloqueada e estabilizada em 81** (77 + 4). Hoje: **26 nominais** (22 de `T-39` §2.4a + os 4 novos de §3.4) **+ 55 por ponteiro** | `vericore-audit-consolidator` (este agente) | ⚠️ **NÃO ENTREGUE NESTA RODADA — declarado, não omitido.** O obstáculo aritmético do ±2 **deixou de existir** (§1.1); o que resta é **trabalho de listagem** contra as trilhas de origem da Rodada 1, que esta rodada não executou. **Bloqueia entregar a fila completa à SanaCore em grão de item; não bloqueia o relatório** |
| **T5-03** | **`P-T39-01` ampliado** — extração âncora a âncora dos **66** IDs `MISTO` + varredura da classe `D-13` item 1 **+ classificação de ambiente dos 37 IDs novos**, com **`T41-RH-F02` e `T43-RH-F04` como candidatos nominais a produção real** (§3.2) | VeriCore (execução) → director (ordenação) | ⚠️ **AMPLIADA nesta rodada.** Bloqueia declarar a fila completa em grão de item e qualquer gate de release por exposição real |
| **T5-04** | **`DIV-SEV-01`** — `T17-F05` MEDIUM × `T23-F03` HIGH sobre o mesmo fato, **não resolvida**, escalada desde a Rodada 1. O grupo G-12 carrega HIGH **apenas para priorização**, declaradamente **não** como resolução de mérito | `vericore-software-audit-director` | ⛔ **ABERTA — 5ª rodada.** O relatório final **não pode publicar uma severidade sem mérito resolvido sem dizê-lo** |
| **T5-05** | **Adjudicações pendentes (`OBS-T26-06`)** — `T16-F15` (encaminhado a `T-18`, veredito nunca dado), `T21-F01` (`ListProductsUseCase`/`ProductController` que nenhuma trilha leu; a própria `T-21` pede reavaliação para HIGH se confirmado), `RES-T13-04`/`RES-T13-05`, `T29-MOB-F03`, `T32-FST-F04` (veredito de autorização) | VeriCore (adjudicação) / director (alocação) | ⛔ **ABERTA desde a Rodada 1.** Findings encaminhados e nunca adjudicados **não podem entrar no relatório como fechados** |
| **T5-06** | **`RES-T42-04` / `RES-T47-06`** — `00_baseline_frozen.sql` está **exatamente 9 migrations atrasado**. Para toda tabela pós-`20260810-000038`, *"não achei no baseline"* **não é evidência de ausência** | director | ⚠️ **QUANTIFICADA, não resolvida.** Regenerar exigiria tocar banco (`APR-2026-016` proíbe). **Afeta retroativamente** qualquer conclusão de `T-13`/`T-31`/`T-35`/`T-41` que tenha usado "ausente no baseline" como evidência — **e essas conclusões não foram reauditadas.** `T-43` §2 e `T-45` §2.2 verificaram e declararam que **não** se aplica aos seus lotes; as trilhas anteriores **não fizeram essa verificação**. Alternativa registrada: declarar a limitação no relatório final |
| **T5-07** | `T-11` — **fila DYN ≈232** contra ~103 catalogados, ~21 executados. +42 novos (`T-41` 8, `T-42` 9, `T-43` 10, `T-45` 10, `T-47` 5) | runner / director / dono | ⚠️ **AGRAVADA.** Pedidos de maior valor nomeados pelos autores: `DYN-T41-03` (**HIGH → CRITICAL** se ≥1 linha), `DYN-T43-02` (**MEDIUM → HIGH**), `DYN-T43-04` (**MEDIUM → HIGH**), `DYN-T45-01`, `DYN-T42-01` (**MEDIUM → HIGH**), `DYN-T45-04`, `DYN-T45-08` |
| **T5-08** | **Resíduos declarados pelas trilhas — 44 novos** (`RES-T41-01`…`-08`, `RES-T42-01`…`-08`, `RES-T43-01`…`-09`, `RES-T45-01`…`-10`, `RES-T47-01`…`-09`) | trilhas de origem / delta audit | **REGISTRADOS.** Fechados por decisão: `RES-T41-01` (`T-42` §2), `RES-T35-02` (`T-47` §1.5 + `APR-2026-042` D1), `RES-T43-05` e `RES-T45-06` (`T-47` §3), `RES-T43-01` e `RES-T45-01` (`APR-2026-039` §3 e `APR-2026-040` D1), `RES-T35-06` parcial (`T-41` §7.3). **Nenhum é resolvido por consolidação** |
| **T5-09** | **`T-12`** — `AUD-PROC-DOCDRIFT-01` cresce de novo; **`T-13`** autoria de `AUD-DB-09`; **`T-14`** `LIM-T37-01`; **`T-15`** severidade do `/production-parcial`; **`T-17`** emendas de critério de reteste (`T35-DIN-F06`, `AUD-ALOG-01` literal) | director / autores | ⚠️ **TODAS INALTERADAS.** Repeti a busca no corpus desta rodada: **nenhuma resposta registrada.** **`T-16` FECHADA** por `APR-2026-035` `D-R2` (§2.3) |
| **T5-10** | `T-01`…`T-10` da Rodada 3 §6.2; **`FIND-ERP-007` reescalada pela QUINTA rodada consecutiva** | diversos | ⚠️ **INALTERADAS** |

### 5.3 ⏳ DECISÕES DO DONO ainda abertas (Regra 18)

| # | Decisão | Estado |
|---|---|---|
| **D-02**…**D-06** | Fonte normativa de regra de negócio: BR-ID de UC-03 (preço>custo); fonte de `manutencao`/`garantia`; lado correto de `T33-B-F02`; candidatas a BR-ID de `T-33` B; fórmula de rating de fornecedor. **É o `F-12` do par — mesmo objeto, sem gate paralelo** | ⚠️ **HERDADAS — INALTERADAS.** Nenhum agente pode supri-las (Regra 6) |
| **D-07** | Denominador normativo de `C-133` (emendar o plano para ≈121 páginas × manter 167 arquivos). **Não altera o estado da célula** | ⚠️ **HERDADA.** Âmbito ("é ou não condição de veredito") escalado como `DIR-DIV-07` |
| **D-08** | Regra 23 × `APPROVALS.md:787` | ⚠️ **HERDADA** |
| **D-09** | **26 HIGH de `npm audit` em `mobile` (14) e `tv` (12)** sem finding e sem investigação individual | ⚠️ **5ª rodada consecutiva sem decisão.** Registro obrigatório: a baixa de `N-08` **não** resolve `D-09` — são coisas distintas |
| **D-10** | Ownership de `docs/business/briefs/` | ⚠️ **HERDADA** |
| **D-12** | `AUD-PAT-DEPRECIACAO-01`: implementar depreciação × remover a coluna (+ 3 declarações de capacidade). **Bloqueia `OR-25`** | ⚠️ **HERDADA — ABERTA** |
| **D-13** *(convenção)* | **`GOVERNANCA_DOC`** — os 26 findings documentais ficam "sem ambiente aplicável" (convenção **declarada e reversível**) ou são classificados pelo módulo referido? **Nunca submetida ao dono** (`APPROVALS.md:1568-1570`) | ⚠️ **NÃO SUBMETIDA.** Se revertida, o efeito é determinístico e sai por adenda |
| **NOVA** | **`RES-T43-09` / `RES-T47-03`** — deprecação formal de `hr_payroll_import_batches`, `hr_payroll_import_items` e `hr_time_sheet_summaries`: **não está registrada em artefato nenhum**, embora `hr_time_import_*` seja o sucessor de fato declarado no código | ⚠️ **ABERTA.** Distinta de `APR-2026-042` D3, que adiou a decisão sobre as **seis** tabelas de RH sem determinar a deprecação documental |

**Decisões FECHADAS nesta leva, registradas:** `D-01`, `D-R1`, `D-R2` (`APR-2026-035`); `D-R3` prejudicada; `DIV-COV4-06` (`APR-2026-036`); `RES-T43-01` biometria (`APR-2026-039` §3); `RES-T45-01` `employees.photo_url` (`APR-2026-040` D1); `RES-T47-01` `hr_candidates` e o denominador 207/22 (`APR-2026-042` D1/D2); `D-11` (`APR-2026-031`, com veredito por `T-40`).

---

## 6. REGRA 22 — RECONTAGEM

### 6.1 O universo e os vereditos

| | `T-39` publicado | **Base corrigida** (`RECONCILIACAO` §1.5.4) | + `T-40` | **Rodada 5 (produto)** |
|---|---|---|---|---|
| CRITICAL + HIGH sob o regime | 9 + 89 = **98** | 9 + 87 = **96** | 96 | **9 + 91 = 100** |
| Com veredito adversarial registrado | 97 | 95 | **96** | **98** |
| **Exceções** | 1 | 1 | **0** | **2** |

**Composição da recontagem, item a item:**

1. **Base corrigida = 96.** `T13-F01` e `T13-F04` saem **dos dois lados** da conta (do universo e dos "com veredito") — eles **têm** veredito adversarial registrado (`CONFIRMED` na Rodada 3-C, com a recomendação de rebaixamento que a §3.2 acolheu). **A errata não cria exceção nova.**
2. **`AUD-RH-COMISSAO-01` — exceção FECHADA.** Era a única exceção viva (`T-39` §4.1: *"a fixação tornou a validação exigível e ainda não ocorreu"*). **`T-40_VALIDACAO_AUD-RH-COMISSAO-01.md` deu o veredito: `CONFIRMED`**, com 5 hipóteses refutadoras — 4 falharam, 1 procedeu parcialmente e **refina a remediação sem reduzir o finding** (a frase *"a fórmula correta não tem insumo"* é absoluta demais: há caminho de estagiamento pela declaração semântica de `employees.salary`). **Não é `DUPLICATE` de `AUD-RH-VTHORISTA-01`** — objetos verificados como distintos. **96/96, zero exceções, antes desta leva.**
3. **+4 HIGH novos.** Universo → **100**.
4. **2 com veredito:** `T43-SST-F01` por **`T-44`** (`CONFIRMED`; 5 refutações executadas, **nenhuma derrubou**, duas **ampliaram**; HIGH mantida, confiança de mecanismo elevada a `CONFIRMED`, frequência MÉDIA mantida) e `T45-SST-F01` por **`T-46`** (`CONFIRMED`; 6 refutações, **nenhuma derrubou**, uma **agravou**, uma corrigiu a moldura; HIGH mantida, confiança de mecanismo elevada a `CONFIRMED`).

### 6.2 ⛔ RESPOSTA DIRETA: **DOIS ficaram sem veredito**

> **`T41-EST-F01`** — HIGH, `T-41` §5.
> **`T41-RH-F02`** — HIGH, `T-41` §5.
>
> **Nenhum dos dois foi submetido ao `vericore-finding-validator`.** Verifiquei por busca no corpus inteiro nesta sessão: os identificadores `T41-EST-F01` e `T41-RH-F02` ocorrem **apenas** em `T-41_C137_SEMANTICA_COLUNA_LOTE3.md` (origem) e em `T-43_C137_SEMANTICA_COLUNA_LOTE5.md` (citação de `T43-META-F11`). **Não existe artefato de validação para nenhum dos dois.**
>
> **`Regra 22: 100 sob o regime · 98 com veredito · 2 exceções.`**

**A causa é de despacho, e eu a nomeio:** `T-41` §12 declarou expressamente *"os 2 HIGH seguem para `vericore-finding-validator` (Regra 22)"*. O lote 3 produziu, no mesmo dia, uma **divergência de escopo** (§4 de `T-41`) que consumiu o ciclo decisório e gerou `APR-2026-036`; **o despacho de validação não acompanhou**. `T-43` e `T-45` tiveram os seus (`T-44`, `T-46`); `T-41` não teve. **Não é falha de auditoria — é item que parou na mesa do despacho**, e é o mesmo padrão que o director já assumiu como `DIR-DIV-05`.

**Efeito operacional, aplicado:** `T41-EST-F01` e `T41-RH-F02` ocupam **posição reservada no estrato 4 e NÃO SÃO LIBERADOS à SanaCore** (§3.4). **A validação de CRITICAL/HIGH é autoridade do `vericore-finding-validator`, não minha** — não a supro, não a presumo, não a dispenso.

### 6.3 Nuances registradas, não escondidas

1. `T-36` validou o fato de `AUD-RH-VTHORISTA-01` **como HIGH**; o CRITICAL é fixação humana posterior (Rodada 4 §2.6).
2. **`T-46` §2 (`RES-T46-02`) declara expressamente:** os 3 MEDIUM e 4 LOW de `T-45` **não têm veredito de validação e não devem ser lidos como validados por omissão**. O mesmo vale, por simetria, para os MEDIUM/LOW de `T-41`, `T-42`, `T-43` e `T-47`. **A Regra 22 cobre CRITICAL/HIGH; o silêncio sobre MEDIUM/LOW é escopo, não aval.**
3. `T-47` §4 declara explicitamente que **não aciona a Regra 22** (0 CRITICAL, 0 HIGH), *"para que o silêncio não seja lido como omissão"*.
4. **Régua de HIGH aplicada com consistência mensurável nos seis lotes:** *HIGH exige que o defeito ocorra pelo caminho normal do sistema, com consumidor real*. Resultado: **2 HIGH em `T-41`, 0 em `T-42`, 1 em `T-43`, 1 em `T-45`, 0 em `T-47`**. Cada reprovação tem o motivo escrito individualmente. **Zero HIGH num lote não é leniência: é a mesma régua aplicada a material que não a sustenta.**

---

## 7. AGRUPAMENTO POR CAUSA RAIZ — os 22 grupos permanecem; **6 grupos novos**

Método inalterado: agrupo por **módulo, causa raiz e severidade sem alterar o conteúdo técnico de nenhum finding**. **Cada finding tem titular único**; vínculos secundários são anotados, nunca duplicados.

| Grupo | Causa raiz | População nova (titulares) |
|---|---|---|
| **G-21** *(existente)* — Invariante só na aplicação / domínio na prosa | *o domínio ou a identidade aritmética está no `comment`/docstring, não no tipo nem em `CHECK`; a régua de `AUD-DB-T31-01`* | `T41-TI-F04`, `T41-JUR-F05`, `T41-SUP-F08`, `T42-PCP-F02` (11 colunas de uma vez), `T42-SUP-F04`, `T43-SST-F05`, `T45-SST-F06` — **7** |
| **G-24** *(existente)* — Exclusão lógica sem regime declarado | — | `T41-EST-F01`, com **ressalva vinculante**: é o **vetor inverso** de `T35-DIN-F06` (lá falta o filtro; aqui falta a **guarda na transição**). **Uma remediação que só adicione filtro de `active` NÃO o resolve** (`OR-28`) — **1** |
| **G-25** *(NOVO)* — **Categoria especial de dado pessoal sem mecanismo executável de classificação** | *a classificação de dado sensível vive em docstring/`COMMENT`; existem **2** mecanismos executáveis no produto (`employeeSensitiveFields.ts`, `rhSensitiveFields.ts`) cobrindo **2** tabelas; **23 colunas do art. 5º II identificadas, 1 classificada (4,3 %), 2 protegidas por sanitizador (8,7 %)**, nenhuma delas biométrica* | `T41-SST-F06`, `T43-LGPD-F10`, `T45-FAC-F03`, `T45-LGPD-F04`, `T47-RH-F02` — **5**. **Padrão que o grupo revela e que o Executivo precisa carregar:** *o sanitizador protege o identificador fraco e deixa passar o forte* — CID protegido campo a campo × laudo do ASO inteiro exposto (`T-43`); CPF mascarado × imagem facial íntegra na mesma instrução (`T-45` §3) |
| **G-26** *(NOVO)* — **Capacidade declarada em artefato versionado e não construída na aplicação** | *migration, `COMMENT`, docstring ou resposta HTTP anunciam canal, estado ou tabela que não existe em código* | `T41-META-F03` (semântica no DDL que não chega ao model), `T42-META-F06` (models afirmam migration não aplicada), `T43-SST-F07` (`POST /accidents/:id/close` responde **200 com o acidente encerrado e não grava nada**), `T45-SST-F02` (o trigger aponta para um canal de estorno que **não existe**), `T47-RH-F01` (módulo de recrutamento inteiro no banco, zero na aplicação), `T47-META-F03` — **6** |
| **G-27** *(NOVO)* — **Atomicidade prometida e não entregue no caminho único de escrita** | *o cabeçalho declara "mesma transação" e o repositório descartou o parâmetro; TypeScript e ESLint não acusam* | `T43-SST-F01` (HIGH, `CONFIRMED` por `T-44`) — **1**. `T-44` §4.4 mediu o módulo inteiro: **`SequelizeAsoRepository` é o único dos 9 repositórios de SST sem propagação transacional** — lapso pontual, **não** arquitetura sem transação |
| **G-28** *(NOVO)* — **Portão de conformidade satisfeito por rótulo, por cópia ou por conteúdo vazio** | *gates de negócio verificam existência ou rótulo, não substância; ou leem uma réplica em vez da fonte* | `T41-RH-F02` (o gate de retorno ao trabalho lê a **cópia** de RH, não o ASO da SST), `T43-SST-F02`, `T43-RH-F04` (coluna de saúde **write-only**; o portão lê outra tabela), `T43-SST-F06` (investigação **vazia** satisfaz o encerramento de acidente com óbito), `T43-META-F11` (amplificação de `T41-RH-F02`, `OR-29`), `T45-SST-F01` (HIGH, `CONFIRMED` por `T-46`) — **6** |
| **G-30** *(NOVO)* — **Invariante estrutural sem lastro no banco** | *`CHECK`/`UNIQUE`/FK ausente exatamente onde outro artefato do projeto a promete ou onde o projeto já a aplicou em caso análogo* | `T41-LGPD-F07`, `T42-EST-F01`, `T42-FIS-F03`, `T42-QUA-F05`, `T43-SST-F03`, `T43-RH-F08`, `T43-SST-F09`, `T45-FAC-F05`, `T45-META-F07`, `T45-TI-F08` — **10**. **Subpadrão nomeado, com 8 ocorrências no run:** par estado × autor/data nullable sem `CHECK` que os ligue (`T35-EST-F05` → `T41-SUP-F08` → `T42-PCP-F02` → `T42-FIS-F03` → `T43-SST-F02` → `T45-META-F07`) |
| **G-31** *(NOVO)* — **Meta: aritmética e instrumento da própria auditoria** | *achados sobre os artefatos da auditoria, não sobre o produto* | `T41-META-F09` — **1**. **Não é item de remediação da SanaCore no objeto auditado** (mesma natureza de `AUD-PROC-CUSTODIA-01`) |

**Conferência: 7 + 1 + 5 + 6 + 1 + 6 + 10 + 1 = 37.** Todos os 37 IDs novos têm grupo, e nenhum tem dois. ✔

**Grupos anteriores que recebem remissão sem população nova:** **G-06** (a célula `AUD-DB-04…-09` passa a carregar a redação retificada da Rodada 4 §4.2 **e** a ratificação `D-R1`/`D-R2` — a ressalva de reexame **é substituída pela decisão**); **G-13**, **G-22**, **G-23** (o padrão *"unidade é função de outra coluna"* ganha 2 ocorrências novas via `T41-TI-F04` e `T41-JUR-F05`, mas os titulares ficam em G-21 para não duplicar).

### 7.1 Causa raiz identificada × lacuna registrada

**Critério de conclusão exigido: todo grupo tem causa raiz identificada ou lacuna registrada.** Estado: **os 8 grupos acima têm causa raiz enunciada e verificável.** As lacunas que impedem fechar a **causa raiz de segunda ordem** — *por que o projeto sabe fazer certo e não fez* — estão registradas nominalmente e são as mesmas em quatro grupos:

- **A técnica está dominada e aplicada ao objeto de menor valor.** `T-46` §3.1: `sst_lock_cat()` e `sst_lock_acidente()` são travas **seletivas por coluna** — o projeto sabe escrever a versão seletiva e a escreveu duas vezes — e `sst_entregas_epi` recebeu trava **total**. `T-45` §3: a empresa **exige o documento assinado para entregar um notebook** e **não exige o artefato biométrico para entregar um EPI**. `T-43` §3: o banco **impõe a devolução do crachá** para concluir a demissão e **não impõe o exame demissional**. **Três instâncias independentes do mesmo padrão. Isto não é limitação técnica; é escolha de onde aplicar o rigor — e é a conclusão de causa raiz que o Relatório Executivo deve carregar.**

---

## 8. CONFORMIDADES E FALSOS POSITIVOS EVITADOS — pesam tanto quanto os defeitos

Registro consolidado, porque um relatório final que só publica defeito é um relatório enviesado.

| Trilha | Conformidades verificadas | Falsos positivos evitados |
|---|---|---|
| `T-41` | 12 | **2** — `jur_lgpd_data_subject_requests` impede resposta sem identidade verificada (`CHECK` real); `hr_job_positions` tem `CHECK` de faixa salarial |
| `T-42` | 9 | **3** — `sale_lot_shipments` "ausente do schema" (o baseline é que estava atrasado); evento eSocial duplicado (índice único **parcial** correto); concessão ISO 9001 §8.7 impedida **com rigor maior que um `NOT NULL`** |
| `T-43` | 8 | **3** — incluindo o de maior impacto: o renderizador do `Grep` deformou literais de rota e sugeria que o cluster clínico não tinha caminho de escrita |
| `T-45` | 6 | **3** — o upload que não existe; o renderizador de `Grep` (**2ª ocorrência**); a premissa da própria decisão do dono (`sst_devolucoes_epi` não tem coluna biométrica) |
| `T-47` | 3 | **3** — o "schema-fantasma solto" (há guarda em **duas camadas**); `migracao_*` "órfãs" (são **vivas**, o finding é o oposto); ponto biométrico em `hr_time_sheet_summaries` (hipótese forte morta por leitura) |
| **TOTAL** | **38** | **14** |

**Conformidades que a remediação NÃO pode destruir, e que o relatório deve nomear:** o `CHECK` de exatamente-um-dono de `production_order_reservations`; o trigger `sst_lock_cat` (imutabilidade legal da CAT, **verificado**); o trigger `sst_lock_acidente` (12 colunas comparadas uma a uma, com `IS NOT DISTINCT FROM` nas nullables); `hr_termination_processes.payment_deadline` **GENERATED ALWAYS** citando o CLT art. 477 §6º — a única coluna gerada da célula, e exatamente a técnica que `T42-PCP-F02` pede; a guarda de CI `no-orphan-pt-schema-tables.test.ts` (**12 tabelas órfãs cercadas em duas camadas**); `CreateEpiDeliveryUseCase` com **lista branca explícita de 8 campos** (zero mass assignment); `errorHandler.ts:84-89` mapeando FK violation para **400, não 500**.

**Regra de método que três trilhas consecutivas estabeleceram e que fica como precedente do run:** *achado que dependa da forma exata de um literal é confirmado por **leitura do arquivo**, nunca por saída de `Grep`* (`T-43` §4.1, `T-45` §4.2, `T-47` §8.3 — a terceira ocorrência, em que um grep de linha única **perdeu 4 das 7 tabelas pós-freeze** e quase virou omissão).

---

## 9. INSUMO DIRETO PARA OS RELATÓRIOS FINAIS

Entregue ao `vericore-audit-reporting-agent`. **Isto é insumo e vinculação, não redação do relatório.**

### 9.1 RELATÓRIO EXECUTIVO — o que carrega com destaque

| # | Item | Forma vinculante |
|---|---|---|
| **E1** | ⛔ **Contradição `G3` × EMENDA-01** | **`APR-2026-038` D3 é vinculante e literal:** vai **no Executivo, com destaque**, **não** no Técnico, **não** em nota de rodapé, **não** em apêndice. Apresentada **como contradição entre dois artefatos aprovados e em vigor**, com os dois **citados por linha** (`APPROVALS.md:584` × `APR-2026-037`). **Redação minimizadora é vedada**: proibido "questão em aberto" e "ponto de atenção". Caracterização do dono a reproduzir: *"é um gate que a própria auditoria criou e depois contornou"*. **É condição de fechamento — nenhuma declaração final de encerramento pode ser emitida antes da reconciliação formal** |
| **E2** | **Placar final: 483 findings vigentes** — 9 CRITICAL · 91 HIGH · 248 MEDIUM · 124 LOW · 11 INFO · 501 IDs emitidos · 1 `FALSE_POSITIVE` · 17 absorvidos/`DUPLICATE` · 1 de processo | **Este placar e nenhum outro.** A errata de §1.1 é a única leitura válida da série histórica: HIGH **65/72/85/86/87** nas rodadas 1/2/3/4/fila. **O relatório final não pode publicar dois placares** |
| **E3** | ⛔ **Regra 22: 100 sob o regime, 98 com veredito, 2 exceções** — `T41-EST-F01` e `T41-RH-F02` | Deve ser dito **como exceção**, com a causa (despacho não acompanhou o lote 3) e o efeito (**não liberados à SanaCore**). **Não pode ser apresentado como "97 %" nem arredondado** |
| **E4** | **`C-137`: `A(79/207)`, déficit 128 integralmente nominal** — 106 com model + 22 sem model | Poderá afirmar: cobertura **total** nas bandas **estoque** (5/5), **fiscal** (3/3) e **categoria especial do art. 5º II**; cobertura **parcial documentada com lista nominal** nas demais. **Não poderá afirmar `C-137` fechada nem cobertura integral da banda dinheiro** (`APR-2026-037` §6) |
| **E5** | **Categoria especial do art. 5º II: 18 tabelas** (11 saúde + 7 biometria), censo **fechado entre as 207** | **A condição vinculante do dono funcionou duas vezes e evitou dano material:** saúde 3 → **11** (3,7×) e biometria 2 → **5** (2,5×). **Sem ela, 4 tabelas com dado de saúde de trabalhador — incluindo admissão e demissão — teriam entrado na lista de exclusão.** Ressalva obrigatória: **`RES-T47-02`** (6 contêineres) mantém a condicionalidade aberta |
| **E6** | **Estado de proteção da categoria especial: 23 colunas identificadas, 1 classificada (4,3 %), 2 protegidas por sanitizador (8,7 %), nenhuma delas biométrica** | O número mais eloquente do run. Acompanhado do padrão de G-25: **o sanitizador protege o identificador fraco e deixa passar o forte** |
| **E7** | **Causa raiz de 2ª ordem: a técnica está dominada e aplicada ao objeto de menor valor** | Três instâncias independentes, com âncora (§7.1). É o que transforma uma lista de findings em diagnóstico |
| **E8** | **`C-136` sem decisão** — a única superfície onde authz e idempotência são vistas **por rota**; base da varredura da **Regra 24** (CRITICAL bloqueante para release pelo `CLAUDE.md`); **zero movimento em 5 rodadas** | Com a prova de que trilha por módulo **já errou duas vezes por omissão de fronteira** nesta run (`AUD-SEC-T04-01`, `AUD-ALOG-01`) |
| **E9** | **Seis tabelas de RH — redação LITERAL e obrigatória** | **`APR-2026-042` D3, verbatim:** *"Estrutura de banco presente, sem uso de aplicação — decisão de produto pendente."* **Proibido atribuir prazo, urgência ou recomendação de construir/deprecar. Igualmente proibido omitir** — gap documentado só cumpre função se aparecer |
| **E10** | **Divergência resolvida por autoridade: `AUD-CTB-DEBCRED-01` HIGH** | Apresentada como **decisão do dono contra recomendação técnica registrada**, com o argumento do validador preservado — **não como consenso** |

### 9.2 RELATÓRIO TÉCNICO — o que é dele

1. **A errata do placar decomposta** (§1.1) e as 7 retificações que não movem placar (§1.4).
2. **Os 37 findings novos**, com enunciado, âncora `arquivo:linha`, severidade **e confiança separadas**, critério de reteste objetivo e autoria de origem preservada (Regra 15).
3. **Os 8 grupos de causa raiz** (§7), com o subpadrão de 8 ocorrências do par estado × autor/data.
4. **As duas validações adversariais na íntegra** — `T-44` (5 refutações) e `T-46` (6 refutações), **incluindo as que falharam**, e o que os validadores encontraram além do autor: rastro **falso positivo** de `status_esocial_s2220`, portão de aptidão de RH **não determinístico** por `ORDER BY` sem desempate, risco de esgotamento de pool, trava total × trava seletiva.
5. **🚫 O bloqueio normativo do soft delete** (Rodada 4 §4.3) — **vinculante, herdado sem alteração**. O reporting agent **não pode** herdar a redação de `T-26:515`; herda a da Rodada 4 §4.2.
6. **A instrução anti-dupla-contagem** de `AUD-ALOG-01` × `AUD-DB-03` (Rodada 4 §3.2) — vinculante.
7. **A forma exata de registro de `C-05`/`C-06`:** `E 75/75 DECLARADA, NÃO CONFIRMADA PELO PAR — ≈6 endpoints sem atribuição de profundidade`. **A divergência viaja junto do número.**
8. **As 38 conformidades e 14 falsos positivos evitados** (§8), com as conformidades que a remediação não pode destruir.
9. **As 4 listas nominais de exclusão declarada**, reproduzidas **nominalmente e não por referência genérica**: 25 (dinheiro) · 8 (dado pessoal, **fonte `T-43` §9 + `T-45` §9**) · 22 (2ª ordem) · 53 (banda excluída) · 22 (sem model, `T-47` §1.5).
10. **As limitações de instrumento declaradas:** baseline **9 migrations atrasado** (e o fato de que trilhas anteriores usaram "ausente no baseline" como evidência **sem a verificação que `T-43` e `T-45` fizeram**); o renderizador de `Grep`; a dedupe **sintática, não semântica**; nenhuma âncora dos 501 IDs reverificada por este agente.

### 9.3 BACKLOG — o que vai para a fila, e com que trava

| Destino | Conteúdo |
|---|---|
| **SanaCore, via director** | Estratos 1-3 completos por ID (19 findings) + estrato 4 **menos as 2 posições reservadas** (`T41-EST-F01`, `T41-RH-F02`) + os blocos MEDIUM/LOW/INFO por grupo `G-01`…`G-31`. **Travas de liberação que acompanham cada lote:** Regra 22 (2 exceções), `D-12`/`OR-25`, `OR-01`…`OR-30`, `C-31`, cláusulas de reavaliação automática |
| **Fila DYN — ≈232 pedidos** | Ordenados por **valor de decisão**, não por trilha. Os 7 que **mudam severidade**: `DYN-T41-03` (HIGH→CRITICAL), `DYN-T43-02`, `DYN-T43-04`, `DYN-T42-01`, `DYN-T45-01`, `DYN-T45-04`, `DYN-T45-08`. Autorizados e **não executados**: `DYN-T47-01`/`-02` (`APR-2026-041`, banco de teste, com a limitação metodológica que **precisa constar do relatório**) |
| **Backlog de cobertura** | Os 9 blocos de `CELULAS_SEM_AUTORIZACAO_ACEITACAO.md`, com custo medido e recomendação do director; **B8 com a nomeação já entregue** |
| **Backlog de produto (não é auditoria)** | As 6 tabelas de RH (`APR-2026-042` D3, sem prazo); `D-02`…`D-06` (fonte normativa de regra de negócio); deprecação de `hr_payroll_import_*`/`hr_time_sheet_summaries` |
| **Backlog de instrumento da auditoria** | Regeneração do `00_baseline_frozen.sql`; reconciliação `COMMENT ON COLUMN` × `comment:` como **censo** (hoje feita só nas tabelas de cada lote); `git diff c1311a6..HEAD` **nunca reconfirmado** em nenhuma trilha desta leva |

### 9.4 O que o relatório final **NÃO** pode afirmar — lista fechada

1. **`AUDIT_PASSED`, `FINDINGS_CONFIRMED`, `RETEST_PASSED`, `FINDING CLOSED`, `REMEDIATION COMPLETE`** — nenhum é declarado aqui e nenhum pode ser inferido deste documento (Regras 3, 4, 5).
2. **`G3` integralmente cumprido** — `F-5` não existe; a amostra dos 174 **não satisfaz a condição (a)**; 4 de 10 categorias de segurança não varridas em 19 módulos.
3. **`C-137` fechada** · **`C-136` tocada** · **`C-133` fechada** · **cobertura integral da banda dinheiro**.
4. **Regra 22 sem exceções** — são **2**.
5. **Categoria especial "fechada" sem a ressalva de `RES-T47-02`.**
6. **"Soft delete não existe"** em qualquer variante genérica (bloqueio normativo da Rodada 4 §4.3).
7. **Que a decisão de `AUD-CTB-DEBCRED-01` foi consenso técnico.**
8. **Que os MEDIUM/LOW desta leva foram validados** — não foram, e `RES-T46-02` diz isso por escrito.

---

## 10. DIVERGÊNCIAS QUE ESTA RODADA REGISTRA (Regra 20) — não acomodadas

| ID | Divergência | Fontes | Tratamento |
|---|---|---|---|
| **`DIV-R5-01`** | **`APR-2026-042` D2 e o mandato afirmam "6 contáveis, 1 não"** na categoria biometria. **São 5 e 2:** `sst_estornos_entrega_epi` também não tem model | `APR-2026-042` D2 × `T-45` §2.1 + `T-47` §1.5 item 20 | **Registrada e corrigida na medição** (§4.3). **Não altero a decisão do dono nem a composição da categoria.** Escalada ao `vericore-software-audit-director` para retificação formal da entrada |
| **`DIV-R5-02`** | **Mandato manda somar `AUD-ALOG-01`, `AUD-RH-COMISSAO-01` e os promovidos** — já contidos na base de 446 | mandato × Rodada 4 §2.2/§2.3/§2.5 e `T-39` §1.3 | **Artefato vence (Regra 7).** Não somados; base 446 preservada (§0.1 `MND-R5-01`) |
| **`DIV-R5-03`** | **Rodada 4 §7.4 declara que o par de cobertura "continua não existindo"**; ele **existe** (`AUDIT_COVERAGE_EXECUTED_RODADA4.md`) | Rodada 4 §7.4 × listagem própria nesta sessão | **Registrada.** `OBS-T26-33` **reduzida** (um corpus atrás, não dois), **não encerrada** — o ato é do director |
| **`DIV-R5-04`** | **Falha de despacho da Regra 22 no lote 3** — `T-41` declarou o encaminhamento dos 2 HIGH e ele não ocorreu, enquanto `T-43` e `T-45` tiveram os seus | `T-41` §12 × ausência de artefato de validação | **Registrada e escalada** (§6.2, `T5-01`). Mesma classe de `DIR-DIV-05` |
| **`DIV-R5-05`** | **`T5-06` — o atraso do baseline afeta retroativamente `T-13`/`T-31`/`T-35`/`T-41`**, que usaram "ausente no baseline" como evidência **sem a verificação de corte que `T-43` §2 e `T-45` §2.2 fizeram** | `T-42` §10.4 / `RES-T42-04` | **Registrada, não resolvida.** `T-42` declarou expressamente que **não reabriu** as conclusões anteriores. **Fica para o director**, e o relatório final deve declarar a limitação |
| **`DIV-R5-06`** | **`T-43` §6.2** — `CreateAsoUseCase` enfileira **todo** evento S-2220 **sem `prazo_legal`**, o que converte `T42-FIS-F03` ponto 2 de "latente" em "sistemático para um dos três tipos de evento". **`T-43` não alterou a severidade de `T-42`** (Regra 15) e submeteu ao director | `T-43` §6.2 × `T42-FIS-F03` | **Registrada e mantida escalada.** **Não reclassifico** — seria alterar severidade sem o titular e sem validação |
| **`DIV-R5-07`** | **Denominadores alternativos publicados pelos próprios autores** — `A(74/207)` (`T-43` §6.6), `A(76/207)` (`T-45` §6.6), `A(79/206)` (`T-47` §1.3) | as três trilhas | **Registradas.** Adoto **`A(79/207)`** com denominador **207/22** por `APR-2026-042` D1. As alternativas ficam publicadas para que a escolha seja auditável, não implícita |

**Divergências herdadas e ainda abertas, relistadas por exaustividade:** `DIV-SEV-01` (`T17-F05` × `T23-F03`, **5ª rodada**), `DIR-DIV-04` (a independência das duas aritméticas de conferência **não existe** — as duas partem do mesmo HIGH), `DIR-DIV-06`, `DIR-DIV-07`, `DIV-T27-RH-02`, `DIV-T27-JUR-03`, `DIV-COV4-02`, `DIV-COV4-05`, `OBS-T39-02`.

---

## 11. LIMITES DESTE AGENTE — sem atenuação

### 11.1 Por leitura própria e integral nesta sessão

`T-41_C137_SEMANTICA_COLUNA_LOTE3.md`, `T-42_C137_SEMANTICA_COLUNA_LOTE4.md`, `T-43_C137_SEMANTICA_COLUNA_LOTE5.md`, `T-45_C137_SEMANTICA_COLUNA_LOTE6.md`, `T-47_TABELAS_SEM_MODEL.md` (os cinco, integrais); `T-44_VALIDACAO_T43.md` e `T-46_VALIDACAO_T45.md` (dirigidos: veredito, hipóteses, ampliações, resíduos); `T-40_VALIDACAO_AUD-RH-COMISSAO-01.md` (veredito e placar de hipóteses); `T-26_CONSOLIDACAO_RODADA4.md` (integral); `T-39_FILA_REMEDIACAO_EXPOSICAO.md` (integral); `coretriad/governance/RECONCILIACAO_FINAL_AUD-001.md` (integral); `coretriad/governance/CELULAS_SEM_AUTORIZACAO_ACEITACAO.md` (integral); `APPROVALS.md` `APR-2026-035`…`APR-2026-042` (integrais); listagem de `24-coverage/`; busca própria por `T41-EST-F01`/`T41-RH-F02` no repositório inteiro (base de §6.2).

**Toda a aritmética deste documento foi refeita por mim e fecha nos dois sentidos** (§1.2, §1.5, §3.3, §4.1, §6.1, §7). A errata de §1.1 é acolhimento de determinação do director, com conferência própria de cada linha. As decisões de §1.3 (não-duplicação), §3.4-§3.5 (`OR-26`…`OR-30`), §3.6 (molduras acolhidas), §4.3 (`DIV-R5-01`) e §7 (6 grupos novos) **são minhas**, com critério publicado.

### 11.2 Aceito de relato de outra trilha, **SEM reverificar**

1. **Toda âncora `arquivo:linha` dos 501 IDs. Não abri um único arquivo de `server/`, `client/`, `docs/`, `product/`, `mobile/` ou `tv/` nesta sessão. Zero.** Se uma âncora está errada, este documento repete o erro.
2. **Todos os vereditos de mérito de `T-40`, `T-44` e `T-46`** — avaliei a estrutura da prova, a consistência com o corpus e a completude das hipóteses refutadoras; **não reli nenhum dos arquivos de produto que eles citam**.
3. **Toda declaração de cobertura de trilha** (`E n/n`, `A n/m`), o censo das 11 tabelas de saúde e das 5 de biometria, a enumeração das 22 sem model, a triagem de banda 80/53, e as contagens de conformidade e de falso positivo.
4. **A reconstrução do denominador 207** por `T-47` §1.1 (200 + 7) — conferida na sua aritmética publicada, **não** refeita contra os arquivos.
5. **Nenhuma afirmação própria de proveniência de commit** (sem Bash, sem `git`). **`LIM-T37-01` segue aberto**, e `RES-T46-01` registra que a própria validação leu a árvore de trabalho, não um checkout de `c1311a6f`.

### 11.3 O que esta consolidação não pode oferecer

- **Dedupe sintática, não semântica.** `DUP-ABERTA-01` e `DUP-ABERTA-02` continuam sendo os casos que eu deveria decidir e não decido, por falta dos inventários de origem.
- **A enumeração integral do estrato 4 (81 IDs) não saiu nesta rodada** (`T5-02`). A base está estabilizada e o obstáculo aritmético foi removido; o que falta é listagem. **Declaração, não omissão.**
- **A classificação de ambiente dos 37 IDs novos não é minha e não a infiro** (§3.2).
- **A validação de `T41-EST-F01` e `T41-RH-F02` não é minha** (Regra 22) e não a supro por consolidação.
- **O par de cobertura desta rodada não existe** — o vigente está um corpus atrás. **Nenhum veredito final de auditoria decorre deste documento.**
- Os 6 grupos novos e as 5 dependências `OR-26`…`OR-30` **são reversíveis pelo director**; se revertidos, o efeito é determinístico e está decomposto para permitir o recálculo.

---

## 12. Encerramento

- Nenhum arquivo do objeto auditado foi criado, alterado, corrigido ou refatorado (Regra 2). **Única escrita: este documento**, em `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/`. Zero comando, zero execução, zero conexão de banco (`APR-2026-016` íntegra).
- **Nenhuma evidência histórica foi alterada (Regra 15).** As Rodadas 1-4, `T-38`, `T-39`, os relatórios de trilha, as retificações, as validações e os findings formais **permanecem íntegros**. Onde esta rodada substitui número ou redação consolidada, a substituição está em DE → PARA, com autor de origem (§1.1, §1.4, §3.6, §4.3).
- **Nenhum finding novo foi criado (Regra 6).** Os 37 IDs foram emitidos pelas trilhas `T-41`, `T-42`, `T-43`, `T-45` e `T-47`.
- **Nenhum finding foi descartado.** Zero `DUPLICATE` novo, zero absorção nova, zero falso positivo novo. **1 `FALSE_POSITIVE` e 17 absorvidos acumulados**, todos com sobrevivente nomeado e rastreio.
- **Nenhuma severidade fixada pelo dono foi alterada (Regra 18).** `APR-2026-035` foi **aplicada**, não interpretada: `AUD-CTB-DEBCRED-01` HIGH, `AUD-DB-09` MEDIUM re-fundamentado, `AUD-DB-04`…`-08` MEDIUM ratificados.
- **Nenhuma severidade proposta pelos autores desta leva foi alterada por mim.** As recomendações de manutenção de `T-44` e `T-46` estão registradas como recomendação; a fixação formal é do director.
- **Nenhum CRITICAL ou HIGH foi validado por este documento** — autoridade do `vericore-finding-validator` (Regra 22). As 2 exceções estão **declaradas e não liberadas**.
- **Este documento NÃO declara `AUDIT_PASSED`, `FINDINGS_CONFIRMED`, `RETEST_PASSED`, `FINDING CLOSED` nem `REMEDIATION COMPLETE`.** Não declara `G3` cumprido, não declara `C-133`, `C-136` nem `C-137` fechadas — declara, medido, o que falta (§4, §5).

**Critério de conclusão desta rodada — conferido item a item:**

| Exigência | Estado |
|---|---|
| Nenhum finding duplicado sem marcação | ✔ **Zero duplicatas nesta leva**, com as 6 verificações de não-duplicação nominadas (§1.3) e a abstenção declarada de `T-47` registrada como precedente |
| Todo grupo com causa raiz identificada ou lacuna registrada | ✔ **8 grupos com causa raiz enunciada** (§7); a causa raiz de 2ª ordem está nomeada com 3 âncoras (§7.1) |
| Total consolidado confere com o total reportado pelas trilhas | ✔ **37 = 9+6+11+8+3**, conferido contra as §12/§11/§9/§9/§11 das cinco trilhas; **483 = 446 + 37**; **501 = 483 + 1 + 17 = 464 + 37**. Fecha nos dois sentidos |
| Autoria e evidência original preservadas (Regra 15) | ✔ nenhum artefato de outra trilha editado; 7 retificações veiculadas por este documento, não por edição |
| Conflitos sinalizados ao director, resolvidos por evidência e nunca por votação (Regra 20) | ✔ **7 divergências novas registradas** (§10), duas delas contra o mandato desta rodada e uma contra uma entrada de `APPROVALS.md` |

**Entrega:**

- ao **`vericore-audit-reporting-agent`** — vinculado ao placar de §1.5, ao bloqueio normativo do soft delete, à instrução anti-dupla-contagem, à forma de registro de `C-05`/`C-06`, à lista de exclusão de 8 com **fonte `T-43` §9 + `T-45` §9**, à redação literal de `APR-2026-042` D3, e ao destaque obrigatório de `APR-2026-038` D3 no Executivo (§9);
- ao **`vericore-software-audit-director`** — **⛔ despacho urgente de `T41-EST-F01` e `T41-RH-F02` ao `vericore-finding-validator`** (§6.2); retificação formal de `DIV-R5-01` (§4.3); `DIV-SEV-01`; adjudicações de `T5-05`; `F-5`; cruzamento de `sst`; `T5-06` (baseline atrasado); `DIV-R5-06`; ampliação de `P-T39-01` (§3.2); e a reversibilidade dos 6 grupos novos e de `OR-26`…`OR-30`;
- ao **dono** — os 4 bloqueantes de encerramento (§5.1) e os 9 blocos de `CELULAS_SEM_AUTORIZACAO_ACEITACAO.md`, agora com **B8 nomeado e decidível**;
- à **SanaCore, via director** — a fila de §3, com as 2 posições reservadas **não liberadas** e as travas de §3.5 como parte integrante de cada lote.

---

## 13. OBSERVAÇÕES — **explicitamente NÃO PROMOVIDAS a finding**

| ID | Observação | Herdeiro natural |
|---|---|---|
| **`OBS-T26-35`** | **A condição vinculante do dono é o controle mais produtivo do run.** Aplicada duas vezes (`APR-2026-037` §4, `APR-2026-039` §3), pegou **duas subestimativas de categoria especial** — 3,7× e 2,5× — cometidas pelo mesmo auditor, pelo **mesmo viés** (triar por nome de módulo em vez de aplicar critério de coluna) que ele próprio havia denunciado em `T-41` §4. **Sem ela, 4 tabelas com dado de saúde de trabalhador teriam entrado na exclusão.** Registrado como precedente de desenho de decisão, não como crítica ao auditor | dono / director |
| **`OBS-T26-36`** | **Os auditores desta leva reportaram 5 erros contra si próprios** — `T-42` §10.1 (erro a favor do auditor), `T-43` §6.1 (subestimou os controles do produto), `T-43` §6.3 (subestimou a própria categoria), `T-45` §6.2 (afirmou impossibilidade falsa), `T-47` §8.3 (grep que quase virou omissão) — **e 1 contra a premissa de uma decisão do dono** (`T-45` §6.1). É a evidência mais forte de que a contagem publicada não é seletiva | registro |
| **`OBS-T26-37`** | **`T-47` §6 recusou nominalmente uma inflação de +22 tabelas** (`A(79/207)` → `A(101/207)`) que a régua de contagem própria proibia, **no lote em que ela mais renderia**, e publicou o número da tentação para que a recusa fosse auditável. Precedente de disciplina de métrica | registro |
| **`OBS-T26-38`** | **O renderizador de `Grep` deformou literais de rota em 3 trilhas consecutivas** (`T-43` §4.1, `T-45` §4.2, `T-47` §8.3) e teria produzido, em dois casos, um CRITICAL espetacular e falso. **Propriedade conhecida do instrumento, não incidente.** A regra derivada é vinculante para o restante do programa | todas as trilhas / director |
| **`OBS-T26-39`** | **A errata do placar (§1.1) prova que erro de agregação sobrevive a 4 rodadas de conferência aritmética**, porque cada rodada conferiu o **delta** — todos corretos — e nenhuma reconferiu a **base**. Precedente de método: **toda consolidação deve reenumerar a base, não só somar o delta** | director / este agente |
| **`OBS-T26-40`** | **`T-46` §3.3** — a suíte de testes existente (`sst-epi.test.ts:116-130`) **codifica o comportamento defeituoso**. Consequência que vale além do caso: **suíte verde não é evidência de ausência de defeito** quando nenhum teste prova a invariante em questão. Insumo direto para `C-137`/D7 e para a SanaCore | director / SanaCore |
| **`OBS-T26-41`** | **A decisão de `APR-2026-042` D3 (6 tabelas de RH) é o primeiro caso do run de "gap deliberadamente documentado sem prazo".** Registro a forma, porque ela é reutilizável e porque a proibição simétrica — **não atribuir prazo E não omitir** — é o que impede que vire esquecimento | director / dono |
| **`OBS-T26-42`** | **Divergência de método entre trilhas da mesma célula:** `T-43` §2 e `T-45` §2.2 **verificaram** que o corte de migrations não afeta seus lotes e disseram isso explicitamente; `T-13`, `T-31`, `T-35` e `T-41` **não fizeram essa verificação** e usaram "ausente no baseline" como evidência. **A assimetria não foi reconciliada** (`DIV-R5-05`) | director |

---

**Estado:** `PLACAR 483 VIGENTES (9C · 91H · 248M · 124L · 11I) · 501 IDs EMITIDOS · ERRATA DA BASE APLICADA (HIGH 65/72/85/86/87) · +37 IDs, 0 DUPLICATE, 0 ABSORVIDOS · REGRA 22: 100 SOB O REGIME, 98 COM VEREDITO, 2 EXCEÇÕES (T41-EST-F01, T41-RH-F02 — NÃO LIBERADOS) · FILA 4+10+5+81 = 100; 100+248+124+11 = 446+37 = 483 ✔ · C-137 A(79/207), DÉFICIT 128 INTEGRALMENTE NOMINAL (106+22) · CATEGORIA ESPECIAL art. 5º II: 18 TABELAS, CENSO FECHADO ENTRE AS 207 COM 1 CONDICIONALIDADE (RES-T47-02) · SEVERIDADES CONGELADAS POR APR-2026-035 · 4 BLOQUEANTES DE ENCERRAMENTO NOMINAIS (G3×EMENDA-01, C-136, RES-T47-02, 9 BLOCOS SEM DECISÃO) · 6 GRUPOS DE CAUSA RAIZ NOVOS · 7 DIVERGÊNCIAS REGISTRADAS · NENHUM AUDIT_PASSED, RETEST_PASSED, FINDING CLOSED OU REMEDIATION COMPLETE.`
