# RELATÓRIO TÉCNICO DE AUDITORIA — `ERP-LEGACY-001-AUD-001`

```
PROGRAMA:      ERP-LEGACY-001
RUN:           ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f   (única referência de leitura)
PRODUZIDO POR: vericore-audit-reporting-agent (VeriCore)
DATA:          2026-08-17 — REVISÃO 2 (emissão original 2026-08-17)
AUTORIZAÇÃO:   APR-2026-042 D4 (emissão) · APR-2026-043 e APR-2026-044 (revisão)
MÉTODO:        READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT
REGIME:        read-only. Zero comando, zero execução, zero conexão de banco (APR-2026-016 íntegra).
               Única escrita: audit/runs/ERP-LEGACY-001-AUD-001/40-report/.
NATUREZA:      RELATO. Não cria finding (Regra 6), não corrige o objeto auditado (Regra 2),
               não altera severidade, confiança, status, autoria ou âncora de nenhum finding
               (Regras 15 e 18), não fecha finding e não declara veredito (Regras 4 e 5).
NÃO DECLARA:   AUDIT_PASSED · FINDINGS_CONFIRMED · RETEST_PASSED · FINDING CLOSED ·
               REMEDIATION COMPLETE · G3 cumprido · C-133/C-136/C-137 fechadas.
```

**Leitura conjunta obrigatória:** `40-report/RELATORIO_EXECUTIVO.md` e
`40-report/REMEDIATION_BACKLOG.md`. Todo número do Executivo é rastreável a este documento, e
deste às trilhas de origem.

**O que mudou na revisão 2 — índice de rastreabilidade da revisão:**

| Mudança | Autoridade | Onde |
|---|---|---|
| `G3` reduzido formalmente pela via do `G8`; contradição com a `EMENDA-01` **reconciliada** | `APR-2026-043` D1 | Executivo §1; aqui §7.4 (nota de moldura) e §16 item 2 |
| `C-136` **dividida**; `F-5` publicada e alvo redimensionado em **628 IN / 55 OUT** | `APR-2026-043` D2 + `F-5` | §7.2, **§7.6** (nova) |
| `BUSINESS_RULES` §12: prevalece o **item 3** (depósitos **ativos**); `OBS-T48-02` **resolvida** | `APR-2026-043` D3 | §10, **§6.4** (nova) |
| Critérios de reteste de `T41-EST-F01` e `T41-RH-F02` **reescritos** (`T-49`); os dois **não liberados** | `APR-2026-043` D4 | **§6.4** (nova), §4.1 |
| Finding novo **`AUD-RH-VALIDADENULA-01`** (candidato `T49-RH-C01`), `PROPOSED`, HIGH recomendada **não fixada** | `APR-2026-044` D1 | **§4.5** (nova), §2.1 |
| `OBS-T48-05` anexada como **confirmação independente** de `T43-SST-F01`, **não** como item novo | `APR-2026-044` D2 | §4.4 item 7, §10 |
| `DYN-T41-03` e `DYN-T49-03` **não autorizados**; pendência de janela futura com 4 condições | `APR-2026-044` D3 | **§8.1** (nova), §12 item 2 |

---

## 1. Fontes autoritativas deste relatório

| # | Artefato | Papel |
|---|---|---|
| 1 | `07-findings/T-26_CONSOLIDACAO_RODADA5.md` | **Fonte do placar** (§1.5), errata da base (§1.1), fila (§3), cobertura (§4), bloqueantes (§5), Regra 22 (§6), grupos de causa raiz (§7), conformidades (§8), vinculações ao reporting (§9) |
| 2 | `07-findings/T-39_FILA_REMEDIACAO_EXPOSICAO.md` | Fila por exposição real, estratos 1-4, dependências `OR-20`…`OR-25` |
| 3 | `07-findings/T-38_CLASSIFICACAO_AMBIENTE_CORPUS.md` | Classificação de ambiente do corpus; os 9 CRITICAL um a um (§4.3); recortes MISTO (§4.4) |
| 4 | `24-coverage/AUDIT_COVERAGE_EXECUTED_RODADA4.md` | Cobertura executada, célula a célula; déficit do `G3` (`F-1`…`F-12`); estado de `N-04`…`N-08` |
| 5 | `coretriad/governance/RECONCILIACAO_FINAL_AUD-001.md` | Reconciliação ±2 por enumeração; determinação da errata (`c2`); estado de encerramento |
| 6 | `coretriad/governance/APPROVALS.md` — `APR-2026-024`, `APR-2026-031` a **`APR-2026-044`** | Decisões humanas vinculantes: severidades congeladas, escopo de `C-137`, categoria especial, denominador, liberação dos relatórios, **redução do `G3`, divisão de `C-136`, regra de saldo total, devolução dos critérios, abertura de `AUD-RH-VALIDADENULA-01`, reconciliação de `OBS-T48-05`, não autorização de `DYN-T41-03`/`DYN-T49-03`** |
| 7 | `07-findings/T-48_VALIDACAO_T41.md` | Fechamento das 2 exceções da Regra 22; 5 observações colaterais |
| 8 | `07-findings/DYN-T47_COLETA_CONTEINERES.md` | Execução de `DYN-T47-01`/`-02`; veredito sobre `RES-T47-02` |
| 9 | `07-findings/T-41`, `T-42`, `T-43`, `T-45`, `T-47`; validações `T-40`, `T-44`, `T-46` | Emissão dos 37 IDs da última leva e vereditos adversariais |
| 10 | `02-plan/AUDIT_COVERAGE_MATRIX.md`, `AUDIT_PLAN_EMENDA_01/02.md` | Matriz prometida, contra a qual a cobertura executada é medida |
| 11 | `coretriad/governance/CELULAS_SEM_AUTORIZACAO_ACEITACAO.md` | Os 9 blocos sem decisão de aceitação, com custo medido |
| **12** | **`07-findings/F-5_LISTA_IN_OUT_CATEGORIA.md`** | **Lista nominal IN × OUT por categoria vedada pelo `G3`**; universo 683/683 classificado; 174 nominal por rota; conformidades e divergências próprias |
| **13** | **`07-findings/T-49_CRITERIOS_RETESTE_T41.md`** | **Critérios de reteste reescritos** de `T41-EST-F01` (12 itens) e `T41-RH-F02` (9 itens); 13 armadilhas de fechamento falso; 2 erros da própria auditoria |
| **14** | **`07-findings/AUD-RH-VALIDADENULA-01.md`** | Finding aberto por `APR-2026-044` D1; evidência, critério de reteste e severidade **recomendada e não fixada** |

Nenhuma memória foi usada como fonte normativa (Regras 8 e 10).

---

## 2. Placar consolidado e a errata da base — decomposta

### 2.1 O placar vigente

| Severidade | `T-39` (base corrigida) | **Rodada 5 (produto)** | Delta |
|---|---|---|---|
| CRITICAL | 9 | **9** | — |
| HIGH | 87 | **91** | **+4** |
| MEDIUM | 229 | **248** | **+19** |
| LOW | 110 | **124** | **+14** |
| INFO | 11 | **11** | — |
| **TOTAL VIGENTE** | **446** | **483** | **+37** |
| `FALSE_POSITIVE` | 1 | **1** (`T11-F10`) | — |
| `DUPLICATE` / absorvidos | 17 | **17** | — |
| **IDs emitidos** | 464 | **501** | **+37** |
| Processo da auditoria (categoria separada) | 1 | **1** (`AUD-PROC-CUSTODIA-01`) | — |

Conferência nos dois sentidos: 9 + 91 + 248 + 124 + 11 = **483**; 483 + 1 + 17 = **501**;
464 + 37 = **501**; 446 + 37 = **483**.

### 2.1-bis Movimento posterior à consolidação — 1 finding aberto, 1 observação reconciliada

| Item | Decisão | Efeito |
|---|---|---|
| **`AUD-RH-VALIDADENULA-01`** (candidato `T49-RH-C01`) | **ABERTO** por `APR-2026-044` D1. **`PROPOSED`, HIGH recomendada, severidade NÃO fixada** | **+1 vigente**, na linha *"sem severidade fixada"*. Total vigente **484**; IDs emitidos **502** |
| **`OBS-T48-05`** | **Anexada como confirmação independente de `T43-SST-F01`** (`APR-2026-044` D2) | **0** — não é item novo. Ver §4.4 item 7 e §10 |

| Linha do placar após a revisão | Valor |
|---|---|
| Com severidade fixada (rodada 5, inalterado) | **483** = 9C · 91H · 248M · 124L · 11I |
| **Sem severidade fixada** | **1** (`AUD-RH-VALIDADENULA-01`) |
| **TOTAL VIGENTE** | **484** |
| IDs emitidos | **502** = 501 + 1 |
| Conferência | 484 + 1 `FALSE_POSITIVE` + 17 absorvidos = **502** |

> **`DIV-REP-04` — divergência aritmética registrada (Regra 7), não forçada.** O placar oficial é
> o de `T-26_CONSOLIDACAO_RODADA5.md` §1.5 — **483 / 501** — e **não contém**
> `AUD-RH-VALIDADENULA-01`, aberto depois da consolidação. Este relatório **não** distribui o
> finding em nenhuma banda de severidade: ele **não tem severidade fixada**, e fixá-la aqui
> violaria as Regras 6 e 18. Registro a divergência em vez de conciliá-la à força. **A
> reconciliação formal do placar é ato do `vericore-audit-consolidator` e do
> `vericore-software-audit-director`.** Precedente do próprio run: `AUD-RH-COMISSAO-01` também
> transitou como "sem severidade fixada" até `D-11`.

### 2.2 A errata da base — `RECONCILIACAO_FINAL_AUD-001.md` Bloco 1, executada em `T-26` R5 §1.1

**Causa:** a §1.2 da Rodada 1 não refletiu a decisão §3.2 da própria Rodada 1 — o rebaixamento de
`T13-F01` (FKs de `production_orders`) e `T13-F04` (`accounts_receivable` sem chave de negócio de
parcela) de **HIGH → MEDIUM**. A §1.3 aplicou; a §1.2 congelou no estágio anterior. O desvio foi
herdado **por citação direta** em R2 §2.2 → R3 → R4 §2.1/§2.5 → `T-39` §1.3.

| Placar | HIGH publicado | **HIGH correto** | MEDIUM publicado | **MEDIUM correto** | Conferência do total |
|---|---|---|---|---|---|
| Rodada 1 | 67 | **65** | 118 | **120** | 6+65+120+57+5 = **253** |
| Rodada 2 | 74 | **72** | 155 | **157** | 6+72+157+77+10 = **322** |
| Rodada 3 (declarado) | 87 | **85** | 223 | **225** | 7+85+225+112+11 = **440** |
| Rodada 3 (reapresentado, −7 `DUPLICATE` R1) | 87 | **85** | 219 | **221** | 7+85+221+109+11 = **433** |
| Rodada 4 (produto) | 88 | **86** | 227 | **229** | 9+86+229+110+11+1 = **446** |
| `T-39` (pós `D-11`) | 89 | **87** | 227 | **229** | 9+87+229+110+11 = **446** |

**Série correta de HIGH: 65 / 72 / 85 / 86 / 87** nas rodadas 1 / 2 / 3 / 4 / fila. **Não**
67/74/87/88/89.

**O total de 446 não muda em nenhuma linha.** Nenhum finding entra, sai, muda de enunciado, de
âncora, de autoria ou de mérito. Muda a **distribuição entre duas colunas** — que é exatamente o
que a fila de remediação e a Regra 22 consomem.

**Consequências nominadas, acolhidas:**

| Objeto | Publicado | **Corrigido** |
|---|---|---|
| Estrato 4 da fila (`T-39` §2.4) | 79 | **77** (hoje 81, com os 4 HIGH novos) |
| Universo da Regra 22 (`T-39` §1.3) | 98 | **96** (hoje 100) |
| Conferência da fila (`T-39` §2.5) | 4+10+5+79 = 98 | **4+10+5+77 = 96**; 96+229+110+11 = 446 |
| Regra 22 na Rodada 2 (§2.4) | 80 | **78** (histórico, sem efeito hoje) |
| CRITICAL · LOW · INFO · 446 vigentes · 464 emitidos · 17 absorvidos · 1 FP | — | **inalterados** |

**Efeito sobre o produto da rodada 5:** se a base errada (89 HIGH / 227 MEDIUM) tivesse sido
usada, o produto seria 93/246 — **os mesmos 483**. A errata não muda o total em ponto algum da
cadeia.

**Correção de citação também acolhida** (`RECONCILIACAO` §1.7): `T-39` §2.4/§6.1 e `OBS-T38-02`
citam `OBS-T26-04` como fonte do ±2. **Não é** — `OBS-T26-04` é discrepância interna de `T-08`
em LOW/INFO, soma zero, resolvida na Rodada 1. **Metade do fundamento de bloqueio do estrato 4
nunca teve objeto.**

### 2.3 Retificações que NÃO criam ID e NÃO movem placar

| Objeto | DE | PARA | Fonte |
|---|---|---|---|
| `T35-META-F01` — tabelas sem model | 21 | **22** | `T-47` §1.2; ratificado por `APR-2026-042` D1 |
| `T-35:113` — lista nominal com model | 134 | **133** | `T41-META-F09` |
| `RES-T42-04` — atraso do baseline | "≥ 9 migrations" | **exatamente 9** | `T-47` §1.1 |
| `T-42` §6 — mecanismos executáveis de classificação | "existe um" | **existem dois** (`employeeSensitiveFields.ts`, `rhSensitiveFields.ts`) | `T-43` §6.1 — erro do autor **contra o objeto auditado**, autodeclarado |
| `T-43` §1.4/§9 — 21 sem model "não censáveis" | não censáveis | **nomeáveis e auditáveis por DDL; não contáveis por falta de model** | `T-45` §6.2, executado por `T-47` |
| `T-41` §6.4 — 71 INTEGRAL não cobertas | "limite superior" | **número exato** | `T-42` §2.1 — erro do autor a favor dele próprio, autodeclarado |
| Rodada 4 §7.4 — par de cobertura "não existe" | não existe | **existe** (`24-coverage/AUDIT_COVERAGE_EXECUTED_RODADA4.md`) | listagem em `T-26` R5 |
| **`T41-EST-F01` §5 item 3** — *"o saldo não pode ser transferido para fora; sem caminho de reversão"* | afirmado | **FACTUALMENTE ERRADO** — as primitivas `add/removeFromWarehouse` recebem id numérico e **não filtram `active`**; existem dois caminhos de saída | `T-48` §2.1 H2; **confirmado por leitura própria do autor de origem** em `T-49` §3.4. **Severidade inalterada** (HIGH): reduz a consequência, não toca o defeito central |
| **`T41-RH-F02` §5 (elo "Admissão")** — *"o gate decide Admissão/Demissão e o retorno"* | afirmado | **ERRADO quanto à Admissão** — `ConcludeAdmissionProcessUseCase.ts:119` decide por `process.aso_result`, terceira cópia, fora do gate comum | `T-48` §3.1 H2; **confirmado por leitura própria do autor** em `T-49` §4.3. **O erro AMPLIA o finding** |
| **`T-48` §2.1 (Caminho A, item 1)** — *"`CreateInventoryCountUseCase` não verifica existência nem `active`"* | afirmado | **a existência É imposta pelo banco** — `inventory_counts_warehouse_id_fkey` (`00_baseline_frozen.sql:24132-24136`) rejeita `warehouse_id` inexistente. Falta **apenas** `active` | `T-49` §3.4 (L09). Não altera o vetor; **impede que a remediação persiga o alvo errado** |

Nenhum artefato de origem foi alterado (Regra 15). Este relatório é veículo da leitura corrigida.

---

## 3. Os 9 CRITICAL — enunciado, âncora, regra violada, confiança

Ambiente conforme `T-38` §4.3 e `T-39` §1.1 (reclassificações de `APR-2026-031` D-13).

### 3.1 `AUD-ALOG-01` — desativação lógica sem trilha de auditoria em 8 de 13 casos de uso

**Finding não homogêneo, por decisão do dono (2026-08-16).** Placar dos 13 casos de uso:
**4 logam completo · 1 loga incompleto · 8 não logam nada.**

| Item | Endpoint / ponto | Âncora | Severidade | Ambiente |
|---|---|---|---|---|
| **A** | `DELETE /api/employees/:id` — desligamento | `employeeController.ts:94-103` | **CRITICAL** | **PRODUÇÃO REAL** |
| **B** | `PATCH /api/items/:id/inactivate` (e `DELETE /api/items/:id`, mesmo handler mudo) | `itemController.ts:135-146`; `items.ts:20-21` | **HIGH** | **PRODUÇÃO REAL** |
| C | fornecedor de item | `itemController.ts:205` | HIGH | PRODUÇÃO REAL (por `D-13` item 2) |
| D | fornecedores | `supplierController.ts:121` | HIGH | dev/homologação |
| E | clientes | `clientController.ts:80` | HIGH | dev/homologação |
| F | categorias | `categoryController.ts:66` | HIGH | PRODUÇÃO REAL (por `D-13` item 2) |
| G | departamentos | `departmentController.ts:65` | HIGH | PRODUÇÃO REAL (por `D-13` item 2) |
| H | ativos | `assetController.ts:81` | HIGH | dev/homologação |
| — | vendas (parcial) | `saleController.ts:347` | HIGH | dev/homologação |

**Regra/requisito violado:** rastreabilidade de ato administrativo; `BR-RH-024` (rito de
desligamento) no agravante de `T33-A-F04`. **Confiança:** CONFIRMED (veredito adversarial
registrado). **Por que CRITICAL no item A:** ato de efeito trabalhista, previdenciário e
financeiro; **em uso real hoje**; **sem reconstituição possível** — combinado com `AUD-DB-06`
(sem `CORRELATION_ID`) e `FIND-ERP-002` (trilha não imutável) não existe caminho alternativo para
responder "quem desligou este funcionário"; **o ator pode encobrir o próprio rastro**.

**Nota anti-dupla-contagem, vinculante (Rodada 4 §3.2):** a classe "desativação lógica" é de
`AUD-ALOG-01`. `AUD-DB-03` cobre o recorte tier 1 + trilha `auditLogs`. **Não somar as duas pelo
mesmo conteúdo.**

### 3.2 `AUD-AUTHN-01` — chave de assinatura JWT com default versionado no ambiente de produção real

**Âncoras:** `docker-compose.yml:54` (`JWT_SECRET: ${JWT_SECRET:-dev-only-change-me-please-change-me-123456789}`) ·
`docker-compose.yml:43` (`NODE_ENV: ${NODE_ENV:-development}`) ·
`server/src/config/runtimeEnv.ts:73` (`if (env.NODE_ENV !== 'production') { return; }` desliga todo
o `superRefine`, inclusive a rejeição de placeholder da `:103`, `ENV_PLACEHOLDER_PATTERN` na `:12`) ·
`runtimeEnv.ts:250` (única guarda sempre ativa é `length < 32`; o default tem 42 caracteres —
**passa**) · `TokenService.ts:9` emite e `middlewares/auth.ts:69` verifica com a mesma chave ·
`docker-compose.yml:67` expõe a API em `0.0.0.0:5000`.

**Regra violada:** `CLAUDE.md` Regra 24 (fronteira de confiança de identidade) e requisito de
segredo não versionado. **Ambiente:** o compose hospeda o dado real por `APR-2026-016`.
**Impacto:** token forjado para qualquer `id` recebe autorização administrativa legítima, sem
senha, sem que `revoke-sessions` contenha, sem rastro distinguível. **Confiança:** CONFIRMED.
**Não afirmado (limite declarado, `L-T02-01`):** se a instância define `JWT_SECRET` no `.env` não
versionado. **O defeito provado é do artefato versionado.**
**Dependência:** causa-raiz no recorte `T18-F02` (`NODE_ENV` default `development`) — corrigir o
sintoma sem a causa-raiz reabre o achado.

### 3.3 `AUD-INTEG-03` — scan móvel move estoque fora de depósito, de lote e da quarentena

**Âncoras:** `ScanItemUseCase.ts:67-74` e `BatchScanUseCase.ts:72-79` chamam
`InventoryService.adjust` com **6 argumentos** contra assinatura de 8
(`inventoryService.ts:327-335`) — `warehouseId` (7º) e `itemId` (8º) omitidos ·
`inventoryService.ts:364,186` grava `warehouse_id: null` · `ScanItemUseCase.ts:63-64` valida
`type='out'` contra `product.quantity` **bruto** · `quarantineBalanceService.ts:73,132-138`
(saldo retido e clamp) nunca é lido no caminho do scan.

**Regra violada:** invariante declarada **no próprio código auditado** —
`warehouseStockService.ts:9-17`: *"Toda rotina que altera `products.quantity` via
`inventoryService` DEVE também chamar `addToWarehouse`/`removeFromWarehouse` na MESMA
transação"*; e ISO 9001:2015 §8.7 (material não liberado). **Contraste na mesma trilha:**
`CreateInventoryMovementUseCase.ts:97-120` e `ApproveInventoryCountUseCase.ts:92-96` fazem o
dual-write corretamente — **o mobile é a exceção, não a regra**.
**Estado do dado após a operação (corrupção persistida):** `products.quantity` decrementado ·
`SUM(ProductWarehouseStock)` inalterado ⇒ invariante rompida permanentemente ·
`lot_controls.quantity_available` inalterado ⇒ retido passa a ser maior que o físico ·
`inventory_movements` com `warehouse_id=null`, `type='adjustment'`, `reference_id=null` ⇒ evento
não reconciliável.
**Superfície irmã, mesmo defeito, fora do módulo:** `RegisterProductMovementUseCase.ts:60-67`
(`POST /api/products/movements`). **Confiança:** CONFIRMED. **Ambiente:** PRODUÇÃO REAL por
`APR-2026-031` D-13 item 1. **Cluster `C-31` com `T32-SUP-F03`** — um item de remediação, conta
uma vez.

### 3.4 Os demais 6 CRITICAL

| ID | Objeto | Ambiente | Estado |
|---|---|---|---|
| `FIND-ERP-001` | Idempotência — `POST /api/inventory/movements` sem proteção; pagamento parcial repetido em `PayPayableUseCase`/`ReceivePaymentUseCase` (guarda só rejeita `paid`, não cobre `partial`) | **PRODUÇÃO REAL** (`D-13` item 1) | Em remediação — `CASE-001` |
| `FIND-ERP-005` | Alçada de contrato jurídico — 4 falhas encadeadas | dev/homologação | Em remediação — `CASE-002`, `READY_FOR_RETEST` com 2 pendências humanas |
| `T08-F01` | Fiscal / NF-e | dev/homologação | Aberto |
| `T24-F01` | Fiscal / integração e resiliência | dev/homologação | Aberto |
| `AUD-COM-DESCONTO-01` | Desconto perdido no faturamento | dev/homologação | Severidade fixada pelo dono |
| `AUD-RH-VTHORISTA-01` | Vale-transporte de horista e comissionado | dev/homologação **declarado pelo dono** | Destravado integralmente por `APR-2026-032`; **cláusula de reavaliação automática:** BLOQUEANTE se o payroll entrar em produção |

---

## 4. Os 37 findings da última leva — enunciado, severidade, confiança e evidência referenciada

Emitidos por `T-41`, `T-42`, `T-43`, `T-45` e `T-47`. **Nenhum é `DUPLICATE`, nenhum absorve ou é
absorvido, nenhum foi descartado.** Severidades e confianças são as **propostas pelos autores**,
não alteradas por consolidação nem por este relatório (Regras 15 e 18).

> **Limite de instrumento declarado, sem atenuação:** este agente **não reverificou nenhuma âncora
> `arquivo:linha`** e não abriu nenhum arquivo de `server/`, `client/`, `docs/`, `product/`,
> `mobile/` ou `tv/`. As âncoras de código de cada finding vivem no artefato de origem citado na
> coluna "Fonte", que é a evidência referenciada. Onde a âncora de código aparece abaixo, ela foi
> transcrita de leitura registrada em `T-48`, `T-49`, `T-43`, `T-45` ou `F-5`. É o mesmo limite que
> o `vericore-audit-consolidator` declarou (`T-26` R5 §11.2 item 1).

### 4.1 HIGH — 4, todos com veredito adversarial da Regra 22

| ID | Enunciado | Sev. | Confiança | Veredito | Regra/requisito | Âncoras |
|---|---|---|---|---|---|---|
| **`T41-EST-F01`** | Desativar um depósito **com saldo** é permitido pelo caminho normal, e o saldo sai da invariante sem virar movimento | HIGH | Mecanismo **ALTA**; materialização **MÉDIA** | **`CONFIRMED (parcial)`** — `T-48` §2 | `BUSINESS_RULES.md:351-354` — invariante de soma sobre **depósitos ativos**, **fixada como a regra vigente** por `APR-2026-043` D3 | Rota `inventory.ts:44` · validador `inventoryValidators.ts:57-61` · controller `inventoryController.ts:570-593` · use case `UpdateWarehouseUseCase.ts:38-58` (`:53` grava `active`) · model `Warehouse.ts:42-72` · banco `00_baseline_frozen.sql:14975-14983`, `:18527-18539` — **ausência de guarda verificada em seis camadas**. **Vetores V3/V4 acrescidos por `T-49` §3.3:** `CreateInventoryCountUseCase.ts:90-117`, `ApproveInventoryCountUseCase.ts:89-96`, `CreateWarehouseTransferUseCase.ts:63-69`, `ApproveWarehouseTransferUseCase.ts:59-61` |
| **`T41-RH-F02`** | O mesmo ASO existe em **quatro** tabelas (o texto original dizia duas), com domínios grafados diferente, e o gate de retorno ao trabalho lê **a cópia** | HIGH | **ALTA** | **`CONFIRMED`** — `T-48` §3 | RF-RH-028, RF-RH-048; integridade de dado de saúde (LGPD art. 5º II) | Gate `asoGate.ts:20-28` → `SequelizeEmployeeDocumentRepository.ts:43-54` · gravador livre `CreateEmployeeDocumentUseCase.ts:46-65` · enums divergentes `00_baseline_frozen.sql:669-673`, `:765-769`, `:839-843` (`apto_com_restricao`) × `:2300-2304` (`apto_com_restricoes`) · consumidores `ConcludeTerminationProcessUseCase.ts:71-74`, `ReturnFromAbsenceUseCase.ts:95-103` · **cópia que decide a admissão** `ConcludeAdmissionProcessUseCase.ts:119` |
| **`T43-SST-F01`** | O ASO é gravado **fora** da transação que enfileira a obrigação eSocial; a interface do repositório declara o parâmetro de transação e a implementação o descarta | HIGH | Mecanismo elevado a **`CONFIRMED`**; frequência **MÉDIA** | **`CONFIRMED`** — `T-44` (5 refutações, nenhuma derrubou, duas ampliaram) · **confirmação independente adicional: `OBS-T48-05`** (`APR-2026-044` D2) | Obrigação acessória eSocial S-2220; atomicidade declarada no cabeçalho | `CreateAsoUseCase.ts:72-99` (`:74` grava fora de `t`; `:87-92` enfileira dentro) · `SequelizeAsoRepository.ts:70-72` (`createAso(data)` sem transação) · `AsoRepository.ts:30` (assinatura abstrata **prevê** a transação) |
| **`T45-SST-F01`** | O portão que exige evidência de recebimento de EPI verifica **o rótulo**, não o artefato: `evidencia_tipo='biometria'` com `evidencia_arquivo_url` NULL confirma a entrega, e a linha fica **imutável para sempre** | HIGH | Mecanismo elevado a **`CONFIRMED`**; frequência **MÉDIA** | **`CONFIRMED`** — `T-46` (6 refutações, nenhuma derrubou, uma agravou, uma corrigiu a moldura) | **BR-SST-002** / NR-6 (valor probatório da Ficha de EPI); LGPD art. 5º II (declaração falsa de tratamento de dado biométrico) | Portão `ConfirmEpiDeliveryUseCase.ts:62-64` · gravador `AttachEpiDeliveryEvidenceUseCase.ts:30-42` · único `CHECK` da tabela `00_baseline_frozen.sql:13222` · trigger de imutabilidade total `sst_lock_entrega_epi` `:2971-2988`, `:22240` · rotas `sst.ts:53-54` |

> **Remissão vinculante (Regra 15), acrescida nesta revisão:** para `T41-EST-F01` e `T41-RH-F02`, o
> critério de reteste **operativo** é o de `T-49` — **não** o de `T-41` §5, que permanece
> inalterado como registro histórico. Ver **§6.4**. **Os dois seguem HIGH, `CONFIRMED`, e NÃO
> liberados à SanaCore** até o reteste adotar o critério novo (`APR-2026-043` D4).

**Moldura vinculante de `T45-SST-F01`, acolhida de `T-46` §4.1 (`T-45` não foi alterado):** o eixo
do finding é o **pareamento rótulo × artefato** — o mecanismo é indiferente ao valor do enum e
vale para os três tipos —, com **biometria como agravante nominado**. A justificativa da confiança
MÉDIA de frequência foi **substituída**: o limitante não é a UI (que aceita `"n/a"` e `" "`), é a
ausência de evidência dinâmica (`DYN-T45-01`/`-02`, bloqueados por `APR-2026-016`).

**Teto de severidade de `T43-SST-F01`, registrado por `T-44` §4.3:** nenhum modo de falha
determinístico da 2ª escrita foi provado. *"Quem tentar subir isto a CRITICAL alegando falha
determinística estará errado."* **A confirmação independente de `OBS-T48-05` reforça o mecanismo e
não altera este teto** — dois caminhos independentes provaram o **mesmo** defeito, não um defeito
maior.

### 4.2 MEDIUM — 19

| ID | Enunciado | Confiança | Grupo | Fonte |
|---|---|---|---|---|
| `T41-META-F03` | A semântica existe no DDL e não chega ao model — inverso de `AUD-DB-T31-03`, provado em 5 colunas | ALTA | G-26 | `T-41` §5.3 (`:184`) |
| `T41-TI-F04` | `it_software_license_details.cost` muda de unidade conforme `billing_cycle`, sem declaração em nenhum dos dois artefatos | ALTA | G-21 | `T-41` §5.4 (`:206`) |
| `T41-JUR-F05` | `jur_contracts.value` não declara se é total, mensal ou de aluguel; a periodicidade depende de `contract_type` | ALTA | G-21 | `T-41` §5.5 (`:224`) |
| `T41-SST-F06` | Em `sst_asos`, o artefato nomeia 4 colunas clínicas sensíveis e só 1 recebe marcação; a mais sensível não recebe nenhuma | ALTA | G-25 | `T-41` §5.6 (`:240`) |
| `T41-SUP-F08` | `purchase_requisitions.origin` é `STRING(80)` com o domínio escrito na prosa do `comment` | ALTA | G-21 | `T-41` §5.8 (`:276`) |
| `T42-EST-F01` | `sale_lot_shipments` promete paridade com o `CHECK` de coerência e implementa metade dele; o consumidor de devolução filtra justamente pela coluna desprotegida | ALTA | G-30 | `T-42` §5 (`:129`) |
| `T42-PCP-F02` | `master_production_plan_lines`: 12 colunas numéricas, 3 fórmulas em `comment`, **1** `CHECK` no banco; decisão do planejador sem par estado/autor imposto | ALTA | G-21 | `T-42` §5 (`:163`) |
| `T42-FIS-F03` | `sst_eventos_esocial`: origem do evento legal **polimórfica sem integridade referencial**, prazo legal nullable, estado de transmissão não exige recibo | ALTA | G-30 | `T-42` §5 (`:191`) |
| `T42-SUP-F04` | `item_suppliers`: "um fornecedor preferencial por item" é regra de aplicação **sem lastro no banco**, e o preço que ela seleciona entra em pedido de compra | ALTA | G-21 | `T-42` §5 (`:209`) |
| `T43-SST-F02` | `sst_acidentes`: a justificativa de **não** emitir CAT é exigida por regra no `COMMENT`, não é imposta pelo banco e é **inalcançável pelo caminho normal** | ALTA | G-28 | `T-43` §3 (`:127`); regra `RF-SST-025`/`BR-SST-016`, `00_baseline_frozen.sql:12843` |
| `T43-SST-F03` | O trigger de imutabilidade compara coluna **nullable** com `=` e, nesse caso, trava o acidente por completo — inclusive o campo que a CAT precisa alterar | ALTA (mecanismo) | G-30 | `T-43` §3 (`:147`); `sst_lock_acidente` `:2900-2935` |
| `T43-RH-F04` | `hr_termination_processes.aso_result` é coluna de **dado de saúde write-only**: o gate de conclusão lê outra tabela e o docstring afirma o contrário | ALTA | G-28 | `T-43` §3 (`:167`) |
| `T43-SST-F05` | `sst_exames_complementares`: conclusão clínica é `boolean` sem domínio, tipo de exame é texto livre, e o `CASCADE` apaga a evidência de PCMSO | ALTA | G-21 | `T-43` §3 (`:205`) |
| `T43-SST-F06` | O portão de encerramento de acidente **grave** é satisfeito por uma investigação **vazia** | ALTA | G-28 | `T-43` §3 (`:222`) |
| `T43-SST-F07` | `POST /accidents/:id/close` responde **200 com o acidente encerrado e não grava nada**; o estado de encerramento não tem coluna | ALTA | G-26 | `T-43` §3 (`:238`) |
| `T43-LGPD-F10` | Três clusters de dado clínico trafegam íntegros no DTO; o projeto tem **dois** mecanismos executáveis de classificação e **nenhum** cobre o SST | ALTA | G-25 | `T-43` §3 (`:288`) |
| `T45-SST-F02` | O único canal declarado de correção de registro biométrico imutável **não existe no código**: `sst_estornos_entrega_epi` tem tabela, FKs e índice, e nenhum model, repositório ou rota | ALTA | G-26 | `T-45` §3 (`:135`) |
| `T45-FAC-F03` | A imagem facial do visitante escapa da função que mascara documento e telefone **na mesma instrução** | ALTA | G-25 | `T-45` §3 (`:159`) |
| `T45-LGPD-F04` | O registro de operações de tratamento (LGPD art. 37) não consegue apontar dado biométrico: `data_categories` é texto livre sem domínio e sem vínculo com as tabelas de origem | ALTA | G-25 | `T-45` §3 (`:188`) |

### 4.3 LOW — 14

| ID | Enunciado | Grupo | Fonte |
|---|---|---|---|
| `T41-LGPD-F07` | Prazo legal do art. 19 sem `DEFAULT` e sem `CHECK`; documento do titular sem classificação | G-30 | `T-41` §5.7 (`:260`) |
| `T41-META-F09` | A lista nominal de `T-35` §3 soma **133, não 134**; o déficit declarado está 1 acima do real | G-31 | `T-41` §5.9 (`:294`) |
| `T42-QUA-F05` | `quality_inspections`: a evidência ISO 9001 §8.6 aceita amostra maior que o lote e defeitos negativos no banco | G-30 | `T-42` §5 (`:230`) |
| `T42-META-F06` | Dois models afirmam que sua migration "não foi aplicada" quando o schema congelado mostra a tabela criada | G-26 | `T-42` §5 (`:246`) |
| `T43-RH-F08` | `hr_admission_processes`: **zero `CHECK`** numa tabela que decide contratação com base em aptidão médica | G-30 | `T-43` §3 (`:262`) |
| `T43-SST-F09` | `sst_ges_funcionarios`: a exposição a risco ocupacional aceita duplicata e período invertido, e é a base do PPP | G-30 | `T-43` §3 (`:274`) |
| `T43-META-F11` | A divergência de domínio de `T41-RH-F02` é **três vezes maior** do que registrado: 3 enums de RH contra 1 de SST | G-28 | `T-43` §3 (`:310`) |
| `T45-FAC-F05` | `facility_visitors.document` sustenta um *find-or-create* com índice **não único**: duas linhas para a mesma pessoa, cada uma com sua foto | G-30 | `T-45` §3 (`:211`) |
| `T45-SST-F06` | `sst_devolucoes_epi`: condição do EPI é texto livre com domínio no `COMMENT`, sem coerência de data; o DTO escolhe "a última devolução" sem `ORDER BY` | G-21 | `T-45` §3 (`:225`) |
| `T45-META-F07` | `confirmada` × `confirmada_em` sem `CHECK` que os ligue — e desta vez o estado inconsistente é **permanente** | G-30 | `T-45` §3 (`:241`) |
| `T45-TI-F08` | `it_responsibility_terms`: o pareamento assinatura × artefato é imposto **só na criação**, e o `COMMENT` declara que o banco não o impõe | G-30 | `T-45` §3 (`:253`) |
| `T47-RH-F01` | O módulo de recrutamento existe **inteiro no banco** (FK, índices, enums) e **não existe na aplicação**: a API de admissão aceita `candidate_id`/`job_vacancy_id` que nenhum caminho do sistema é capaz de criar | G-26 | `T-47` §4 (`:230`) |
| `T47-RH-F02` | Um sanitizador de LGPD/segregação foi construído para tabela **sem model e sem leitor** e nunca é chamado: `sanitizePayrollImportItem` tem **zero call sites** | G-25 | `T-47` §4 (`:255`) |
| `T47-META-F03` | Duas tabelas **vivas** de migração são escritas por SQL bruto, sem model, sem `COMMENT` e **fora da guarda** que protege suas 12 irmãs | G-26 | `T-47` §4 (`:279`) |

**Conferência:** 4 HIGH + 19 MEDIUM + 14 LOW = **37**, contra as declarações de fechamento das
cinco trilhas (`T-41` §12 = 9 · `T-42` §11 = 6 · `T-43` §9 = 11 · `T-45` §9 = 8 · `T-47` §11 = 3).

### 4.4 Não-duplicação — as verificações nominadas

1. `T-47` §4 **declara expressamente que NÃO reemite `T45-SST-F02`**, embora a tabela caia no seu
   escopo — não-duplicação por **abstenção do próprio autor**, registrada como precedente.
2. `T43-META-F11` é **amplificação** de `T41-RH-F02`, não duplicata: o objeto inédito são
   `hr_admission_processes` e `hr_termination_processes`. Vínculo `COMPLEMENTAR`; contam uma vez
   cada, em dimensões distintas; **mesmo lote de remediação** (`OR-29`).
3. `T41-EST-F01` × `T35-DIN-F06` são **opostos**: lá falta o filtro de `active` e o inativo volta;
   aqui o filtro existe e falta a **guarda na transição** `true → false`. **Uma remediação que
   adicione filtro de `active` NÃO resolve `T41-EST-F01`** (`OR-28`).
4. `T41-META-F03` × `AUD-DB-T31-03` — vetores opostos (`model → DDL` × `DDL → model`). A
   remediação de `AUD-DB-T31-03` **precisa virar bidirecional**.
5. `T42-FIS-F03` × `T41-LGPD-F07` — mesma patologia (prazo legal sem lastro), severidades
   distintas por exposição declarada.
6. `T-44` e `T-46` declararam **0 falsos positivos e 0 duplicatas** nos seus escopos.
7. **`OBS-T48-05` × `T43-SST-F01` — convergência, não item novo.** `APR-2026-044` D2:
   *"Anexe `OBS-T48-05` como confirmação independente de `T43-SST-F01`, não como item novo — dois
   auditores, caminhos independentes, mesmo defeito."* O `vericore-finding-validator` (`T-48`)
   chegou a `CreateAsoUseCase.ts:74` + `SequelizeAsoRepository.ts:70-72` **por outra trilha e sem
   conhecer** o finding já emitido por `T-43`/validado por `T-44`. **Não conta no placar**;
   **reforça** o finding existente. **Registro de método:** o autor de `T-49` foi cauteloso e
   correto ao **não** abrir o item — *"não foi objeto desta devolução e não o verifiquei por
   leitura própria"* (`RES-T49-04`). Ele não tinha como saber que o defeito já estava reportado; a
   convergência só é visível de fora. **A cautela dele é o que tornou a reconciliação possível sem
   duplicata.**
8. **`AUD-RH-VALIDADENULA-01` × `T41-RH-F02` — findings distintos, lote único.** A independência foi
   provada **nos dois sentidos** (§4.5). O que se separou foi a **contabilidade**, não o trabalho:
   os dois compartilham o lote de remediação. **Não somar duas vezes o mesmo esforço; não fechar um
   pelo outro.**

**Limite herdado, inalterado:** a deduplicação da consolidação é **sintática, não semântica**.
`DUP-ABERTA-01` e `DUP-ABERTA-02` continuam abertas.

### 4.5 `AUD-RH-VALIDADENULA-01` — finding aberto por decisão do dono (`APR-2026-044` D1)

```
ID formal:        AUD-RH-VALIDADENULA-01   (ID de candidato citável: T49-RH-C01)
Origem:           OBS-T48-04 (T-48) + descoberta própria de T-49 §5 quanto à Admissão
Autoridade:       APR-2026-044 D1
Severidade:       PROPOSED — HIGH recomendada, NÃO FIXADA (Regra 18; se HIGH, aciona a Regra 22)
Estado:           PROPOSED — NÃO entra no Remediation Backlog enquanto não for CONFIRMED
Ambiente:         heterogêneo — ver "Ambiente", abaixo
```

**Enunciado.** Um ASO gravado **sem data de validade** é tratado como **válido para sempre** pelos
**dois** consumidores que decidem sobre ele. Não é ausência de informação tratada como ausência —
é ausência tratada como **afirmação positiva de validade**.

**Evidência, arquivo e linha** (transcrita de `AUD-RH-VALIDADENULA-01.md` §4; nenhuma âncora foi
reverificada por este agente):

| # | Artefato | Literal |
|---|---|---|
| 1 | `SequelizeEmployeeDocumentRepository.ts:50` | `[Op.or]: [{ valid_until: null }, { valid_until: { [Op.gte]: today } }]` — **`NULL` entra na disjunção como vigente** |
| 2 | `CreateEmployeeDocumentUseCase.ts:61` | `valid_until: input.valid_until ?? null` — a coluna **nunca é obrigatória**, inclusive para `doc_type` do grupo `aso_*` |
| 3 | `ConcludeAdmissionProcessUseCase.ts:125` | `if (process.aso_valid_until && ...)` — **a guarda de vigência é pulada inteira** quando a data é nula |
| 4 | `ReturnFromAbsenceUseCase.ts:95-96` | `hasValidAso(..., 'aso_retorno', ...)` — consumidor real do vetor 1 (RF-RH-048, afastamento > 30 dias) |
| 5 | `asoGate.ts:26` | `hasValidAso` chama **exclusivamente** `findValidAso` |
| 6 | `00_baseline_frozen.sql:5919` | `valid_until date` — **nullable, sem `CHECK`, sem `DEFAULT`** |
| 7 | `HrEmployeeDocument.ts:27` | `valid_until: DataTypes.DATEONLY` — sem `allowNull: false`, sem `validate` |

**Requisito/regra violada:** **RF-RH-048** (exigência de ASO de retorno após afastamento superior a
30 dias) e o rito de conclusão de admissão sobre exame de aptidão vigente. **Causa raiz comum aos
dois vetores:** `NULL` tratado como afirmação positiva — a ausência de dado produz o resultado
**mais permissivo**, em decisão de saúde ocupacional.

**Consequência com consumidor real.** O gate de retorno **não amarra o documento ao afastamento**
que o motivou: um único `aso_retorno` com `valid_until NULL` **satisfaz todo retorno futuro,
indefinidamente** — inclusive de afastamentos que ainda não ocorreram. No segundo vetor, a admissão
conclui **sem que a validade do exame tenha sido verificada**.

**Por que é finding próprio, e não item de `T41-RH-F02`** (ônus assumido em `T-49` §5, ratificado
pelo dono):

- **Independência nos dois sentidos — o teste decisivo.** Executar **todo** o critério de
  `T41-RH-F02` (`CR-T49-RH-01` a `-08`) deixa este vetor **inteiramente aberto**: um `aso_retorno`
  com `valid_until NULL`, emitido pela própria SST, com domínio unificado e FK correta,
  **perfeitamente concordante**, continua valendo para sempre. Inversamente, corrigir a validade
  **não reconcilia nada** entre SST e RH.
- **Coluna e norma diferentes:** `aptitude_result` / RF-RH-028 × `valid_until` / RF-RH-048.
- **Consequência de rastro:** amarrado ao outro finding, o reteste ficaria refém de defeito alheio.

**Severidade — recomendada HIGH, não fixada.** O fundamento é a régua deste run (*o defeito ocorre
pelo caminho normal, com consumidor real?*): **sim, nos dois vetores** — não exige escrita fora da
aplicação, nem concorrência, nem ator mal-intencionado; **basta omitir um campo opcional** num
formulário. Mesma família de `T41-RH-F02` (HIGH) e `T43-SST-F01` (HIGH). **A fixação é do dono
(Regra 18); se HIGH, o finding vai ao `vericore-finding-validator` antes de remediação (Regra 22).**

**Confiança:** o mecanismo é **estático e demonstrável por leitura** nos dois vetores. A
**materialização** é fato de dado **não medido** — `DYN-T49-05` (quantas linhas `aso_*` têm
`valid_until NULL`) e `DYN-T49-06` (quantos `hr_admission_processes` concluídos têm
`aso_valid_until NULL`) **não foram executados** (`APR-2026-016`).

**Critério de reteste** (`AUD-RH-VALIDADENULA-01.md` §6, resumo fiel): leitura deixa de tratar
`NULL` como vigente para `aso_*`; **escrita** passa a exigir `valid_until` para `aso_*` — *corrigir
só a leitura apenas move o buraco*; a admissão **recusa** conclusão com `aso_valid_until` nula;
teste que **reprove o estado anterior nos dois caminhos**; e **decisão registrada sobre o passivo**
já gravado. **Reprova se** corrigir só um dos dois consumidores, ou fechar sem decisão sobre o
passivo.

**Ambiente — o finding não é homogêneo.** `APR-2026-031` D13 item 4: *"`employees` em uso real
**somente** no fluxo de desligamento"*; o restante do RH segue DEV/HOMOLOGAÇÃO. **Cláusula de
reavaliação automática:** reavaliar para bloqueante quando o RH entrar em produção — e antes disso,
se qualquer fluxo de afastamento/retorno passar a operar com funcionário real.

**Efeitos colaterais registrados:** `CR-T49-RH-09` **deixa de ser item condicional** de
`T41-RH-F02` (`T-49` §4.5) — o fallback está desativado pela abertura. **Grupo de causa raiz: não
atribuído** por este relatório — a atribuição é do `vericore-audit-consolidator`; o autor relaciona
a causa raiz a **semântica de coluna** (matéria de `C-137`), com afinidade declarada a **`G-28`**
(portão satisfeito por conteúdo que não sustenta a decisão).

---

## 5. Grupos de causa raiz

### 5.1 Os 6 grupos novos e os 2 que receberam população

| Grupo | Causa raiz | Titulares |
|---|---|---|
| **G-21** (existente) — Invariante só na aplicação / domínio na prosa | O domínio ou a identidade aritmética está no `comment`/docstring, não no tipo nem em `CHECK` | `T41-TI-F04`, `T41-JUR-F05`, `T41-SUP-F08`, `T42-PCP-F02` (11 colunas de uma vez), `T42-SUP-F04`, `T43-SST-F05`, `T45-SST-F06` — **7** |
| **G-24** (existente) — Exclusão lógica sem regime declarado | — | `T41-EST-F01` — **1**, com a ressalva vinculante do `OR-28` |
| **G-25** (NOVO) — Categoria especial de dado pessoal **sem mecanismo executável de classificação** | A classificação vive em docstring/`COMMENT`; existem **2** mecanismos executáveis cobrindo 2 tabelas; **23 colunas do art. 5º II identificadas, 1 classificada (4,3 %), 2 protegidas por sanitizador (8,7 %)**, nenhuma delas biométrica | `T41-SST-F06`, `T43-LGPD-F10`, `T45-FAC-F03`, `T45-LGPD-F04`, `T47-RH-F02` — **5** |
| **G-26** (NOVO) — Capacidade declarada em artefato versionado e **não construída** na aplicação | Migration, `COMMENT`, docstring ou resposta HTTP anunciam canal, estado ou tabela que não existe em código | `T41-META-F03`, `T42-META-F06`, `T43-SST-F07`, `T45-SST-F02`, `T47-RH-F01`, `T47-META-F03` — **6** |
| **G-27** (NOVO) — Atomicidade prometida e não entregue no caminho **único** de escrita | O cabeçalho declara "mesma transação" e o repositório descartou o parâmetro; TypeScript e ESLint não acusam | `T43-SST-F01` — **1**. `T-44` §4.4 mediu o módulo: `SequelizeAsoRepository` é **o único dos 9** repositórios de SST sem propagação transacional — lapso pontual, **não** arquitetura sem transação |
| **G-28** (NOVO) — Portão de conformidade satisfeito por **rótulo, cópia ou conteúdo vazio** | Gates de negócio verificam existência ou rótulo, não substância; ou leem réplica em vez da fonte | `T41-RH-F02`, `T43-SST-F02`, `T43-RH-F04`, `T43-SST-F06`, `T43-META-F11`, `T45-SST-F01` — **6** |
| **G-30** (NOVO) — Invariante estrutural **sem lastro no banco** | `CHECK`/`UNIQUE`/FK ausente exatamente onde outro artefato do projeto a promete ou onde o projeto já a aplicou em caso análogo | `T41-LGPD-F07`, `T42-EST-F01`, `T42-FIS-F03`, `T42-QUA-F05`, `T43-SST-F03`, `T43-RH-F08`, `T43-SST-F09`, `T45-FAC-F05`, `T45-META-F07`, `T45-TI-F08` — **10** |
| **G-31** (NOVO) — Meta: aritmética e instrumento **da própria auditoria** | Achados sobre os artefatos da auditoria, não sobre o produto | `T41-META-F09` — **1**. **Não é item de remediação da SanaCore no objeto auditado** |

**Conferência:** 7 + 1 + 5 + 6 + 1 + 6 + 10 + 1 = **37**. Todos os 37 têm grupo; nenhum tem dois.
**`AUD-RH-VALIDADENULA-01` está fora desta conferência** — é posterior à consolidação e **não teve
grupo atribuído** (§4.5).

**Subpadrão nomeado, com 8 ocorrências no run:** par **estado × autor/data nullable sem `CHECK`
que os ligue** — `T35-EST-F05` → `T41-SUP-F08` → `T42-PCP-F02` → `T42-FIS-F03` → `T43-SST-F02` →
`T45-META-F07`.

**Padrão sistêmico da banda dinheiro, com 3 ocorrências independentes em 3 módulos:** *"coluna
monetária cuja unidade é função de outra coluna que não a declara"* — `T35-RH-F02`
(`salary` × `salary_type`), `T41-TI-F04` (`cost` × `billing_cycle`), `T41-JUR-F05`
(`value` × `contract_type`).

### 5.2 Causa raiz de 2ª ordem — por que o projeto sabe fazer certo e não fez

Os 8 grupos têm causa raiz enunciada e verificável. A causa de **segunda ordem** está nomeada com
três âncoras independentes:

1. `T-46` §3.1 — `sst_lock_cat()` e `sst_lock_acidente()` são travas **seletivas por coluna**: o
   projeto sabe escrever a versão seletiva e a escreveu **duas vezes**; `sst_entregas_epi` recebeu
   trava **total**, que torna o erro irreparável.
2. `T-45` §3 — a empresa **exige documento assinado para entregar um notebook**
   (`CreateResponsibilityTermUseCase.ts:35-36`) e **não exige artefato biométrico para entregar um
   EPI**.
3. `T-43` §3 — o banco **impõe a devolução do crachá** para concluir a demissão e **não impõe o
   exame demissional**.

**Conclusão registrada: não é limitação técnica; é escolha de onde aplicar o rigor.** Isso torna a
correção barata e remove a defesa de "limitação de arquitetura".

**Quarta âncora, acrescida nesta revisão** (`T-49` §3.4, L05): no **mesmo arquivo**
`CreateInventoryCountUseCase.ts`, o campo `assigned_to` **é** validado como usuário existente **e
ativo** (`:95-107`), e o `warehouse_id` **não recebe a mesma disciplina**. A regra "referência
precisa estar ativa" existe no arquivo e **não foi aplicada ao depósito** — a assimetria aparece
dentro de um único use case.

---

## 6. Regra 22 — universo, vereditos e as duas exceções que existiram

| | `T-39` publicado | Base corrigida | + `T-40` | Rodada 5 | **+ `T-48` (estado final)** |
|---|---|---|---|---|---|
| CRITICAL + HIGH sob o regime | 9 + 89 = **98** | 9 + 87 = **96** | 96 | **9 + 91 = 100** | **100** |
| Com veredito adversarial registrado | 97 | 95 | 96 | **98** | **100** |
| **Exceções** | 1 | 1 | 0 | **2** | **0** |

**Composição:**

1. **Base corrigida = 96.** `T13-F01` e `T13-F04` saem **dos dois lados** da conta — eles **têm**
   veredito adversarial registrado (`CONFIRMED`, Rodada 3-C). A errata **não cria exceção nova**.
2. **`AUD-RH-COMISSAO-01`** — exceção fechada por `T-40`: `CONFIRMED`, 5 hipóteses refutadoras,
   4 falharam, 1 procedeu parcialmente e **refina a remediação sem reduzir o finding**. **Não é
   `DUPLICATE` de `AUD-RH-VTHORISTA-01`.**
3. **+4 HIGH novos** → universo 100. `T43-SST-F01` validado por `T-44`; `T45-SST-F01` por `T-46`.
4. **As 2 exceções** — `T41-EST-F01` e `T41-RH-F02` — **fechadas por `T-48`**.

> **Efeito futuro declarado:** `AUD-RH-VALIDADENULA-01` **não está** sob o regime da Regra 22
> enquanto a severidade não for fixada. **Se o dono a fixar em HIGH, o universo passa a 101** e o
> finding tem de receber veredito do `vericore-finding-validator` **antes** de remediação. Este
> relatório não antecipa a fixação (Regra 18).

### 6.1 A falha de despacho, nomeada

`T-41` §12 declarou expressamente *"os 2 HIGH seguem para `vericore-finding-validator`
(Regra 22)"*. O lote 3 produziu no mesmo dia uma divergência de escopo que consumiu o ciclo
decisório e gerou `APR-2026-036`; **o despacho de validação não acompanhou**. `T-43` e `T-45`
tiveram os seus (`T-44`, `T-46`); `T-41` não teve. **A detecção veio da rodada 5 de consolidação,
por busca no corpus inteiro** — não do orquestrador que falhou. Registrado como `DIV-R5-04`, mesma
classe de `DIR-DIV-05`. Enquanto durou, as duas ficaram **reservadas e não liberadas** à SanaCore.

### 6.2 `T-48` — o que a validação encontrou além do autor

**`T41-EST-F01` → `CONFIRMED (parcial)`.** Cinco hipóteses de refutação:

- **H1** (guarda em outra camada) — **falhou**: ausência de guarda verificada em **seis** camadas
  (rota, validador, controller, use case, model, banco). O `logAction` é rastreabilidade, não
  controle compensatório.
- **H2** (o saldo fica preso?) — **procedeu parcialmente**: **o item 3 do finding é FALSO**.
  Existem dois caminhos de saída que o autor não viu — contagem cíclica
  (`CreateInventoryCountUseCase.ts:90-117`; `ApproveInventoryCountUseCase.ts:89-96` usa
  `count.warehouse_id` direto) e transferência pendente aprovada depois da desativação
  (`ApproveWarehouseTransferUseCase.ts:59-61` executa por id gravado, sem revalidar). **Isso reduz
  a consequência ("saldo preso para sempre" → "saldo fora da invariante, recuperável por caminho
  não óbvio e não exposto na UI") e não toca o defeito central.** Devolvido ao auditor de origem
  para correção do texto — `T-41` **não foi alterado** (Regra 15), e a correção foi **confirmada
  por leitura própria do autor** em `T-49` §3.4.
- **H3** (a invariante existe como citada?) — **falhou**, e revelou `OBS-T48-02` (§10), **hoje
  resolvida por `APR-2026-043` D3**.
- **H4** (`products.quantity` é a fonte do MRP?) — **falhou**: confirmado por consumidor real
  (`SequelizeItemRepository.listMrpInventoryPositions:58-103`, `:92`). Qualifica o dano com
  precisão maior que a do autor — **o MRP planeja sobre material que o próprio ERP recusa a
  consumir**.
- **H5** (restrito a admin?) — **falhou**: `authorizeModule('estoque','approve')` é atribuível a
  qualquer perfil (`middlewares/auth.ts:43-51`).

**`T41-RH-F02` → `CONFIRMED`.** Quatro hipóteses, todas falharam. Duas correções ao texto que
**ampliam** o finding: a **Admissão não usa o gate** (`ConcludeAdmissionProcessUseCase.ts:111-127`
usa `process.aso_result`, uma **terceira** cópia); e existe um **modo 2** que dispensa a
divergência de enum — `findValidAso` trata `valid_until: null` como **válido para sempre**
(`SequelizeEmployeeDocumentRepository.ts:50`). **Este modo 2 foi promovido a finding próprio** por
`APR-2026-044` D1 (§4.5).

**Controle existente que a remediação NÃO pode destruir:** `00_baseline_frozen.sql:5932` documenta
que a cópia de RH guarda *"somente aptidão/validade, **nunca laudo clínico** (LGPD art. 5º II)"*.
A correção é **vincular e igualar domínio**, não copiar conteúdo clínico da SST para RH.

### 6.3 Nuances registradas, não escondidas

1. `T-36` validou o fato de `AUD-RH-VTHORISTA-01` **como HIGH**; o CRITICAL é fixação humana
   posterior.
2. **`RES-T46-02` declara por escrito:** os MEDIUM e LOW da última leva **não têm veredito de
   validação e não devem ser lidos como validados por omissão**. Vale por simetria para `T-41`,
   `T-42`, `T-43` e `T-47`. **A Regra 22 cobre CRITICAL/HIGH; o silêncio sobre MEDIUM/LOW é
   escopo, não aval.**
3. `T-47` §4 declara explicitamente que **não aciona a Regra 22** (0 CRITICAL, 0 HIGH), *"para que
   o silêncio não seja lido como omissão"*.
4. **Régua de HIGH aplicada com consistência mensurável nos seis lotes** — *HIGH exige que o
   defeito ocorra pelo caminho normal do sistema, com consumidor real*: 2 HIGH em `T-41`, 0 em
   `T-42`, 1 em `T-43`, 1 em `T-45`, 0 em `T-47`. Cada reprovação tem motivo escrito
   individualmente. **Zero HIGH num lote não é leniência: é a mesma régua aplicada a material que
   não a sustenta.**

### 6.4 `T-49` — critérios de reteste reescritos (`APR-2026-043` D4)

**Autoridade e fundamento.** `APR-2026-043` D4, verbatim: *"Aprovo devolver os dois à trilha de
origem para reescrever antes de remediação. **Fechamento falso custa mais depois do que corrigir
agora.**"* Um reteste sobre critério estreito **passaria** e fecharia o finding **sem fechar o
defeito** — e, fechado, a VeriCore não poderia reabri-lo sem delta audit (Regra 14).

**Regra 15 preservada:** `T-41` §5 e `T-48` **não foram alterados**. `T-49` vive **ao lado** e
remete a ambos. **O critério operativo — sem o qual não há `RETEST_PASSED` — é o de `T-49`.**

| Finding | Critério original | **Critério vigente (`T-49`)** | Severidade | Estado |
|---|---|---|---|---|
| `T41-EST-F01` | `T-41:153` — **1** vetor | **4 vetores · 12 itens** `CR-T49-EST-01`…`-12` (um condicional) + **4 pedidos dinâmicos novos** | **HIGH — inalterada** | `CONFIRMED (parcial)`; **NÃO liberado** |
| `T41-RH-F02` | `T-41:180` — **2** tabelas | **4 tabelas · 9 itens** `CR-T49-RH-01`…`-09` (um de fallback, **desativado** pela abertura de `AUD-RH-VALIDADENULA-01`) + **3 pedidos dinâmicos novos** | **HIGH — inalterada** | `CONFIRMED`; **NÃO liberado** |

**`T41-EST-F01` — os 4 vetores** (`T-49` §3.3, censo **fechado** sobre as primitivas de saldo: 7
sítios, 9 linhas, e **exatamente 2** operam sobre id armazenado sem revalidação):

| Vetor | Descrição | Em `T-41`? |
|---|---|---|
| **V1** | Desativação sem guarda de saldo (`UpdateWarehouseUseCase.ts:38-58`) | Coberto |
| **V2** | Primitivas não filtram `active`; **o saldo NÃO fica preso** (`warehouseStockService.ts:111-130`, `:147-185`) | **Refutava o item 3 do texto original** |
| **V3** | Contagem de inventário sobre depósito inativo (`CreateInventoryCountUseCase.ts`, `ApproveInventoryCountUseCase.ts`) | **Não coberto** |
| **V4** | Transferência `pending` aprovada após a desativação — **débito e crédito** (`ApproveWarehouseTransferUseCase.ts:59-61`) | **Não coberto** |

**`T41-RH-F02` — as 4 cópias da aptidão** (`T-49` §4.2): `sst_asos.resultado` (ninguém decide);
`hr_employee_documents.aptitude_result` (decide **demissão** e **retorno**);
`hr_admission_processes.aso_result` (**decide a admissão, fora do gate comum**);
`hr_termination_processes.aso_result` (**gravada e nunca lida**). **Duas patologias distintas que o
critério antigo não separava:** cópia que decide sem vínculo × cópia que ninguém lê.

**As 13 armadilhas de fechamento falso nomeadas** (`A1`-`A5`, `B1`-`B5`, mais as embutidas em
`CR-T49-EST-06`, `-09` e `-12`) — casos que **passariam** pelo critério antigo sem fechar o
defeito. As de maior efeito prático:

| ID | Armadilha | Por que passaria |
|---|---|---|
| **A1** | `comment` acrescentado a `20260804-000001-create-warehouses.cjs:149-153` | Satisfaz *"comment na migration"* e **nenhum banco o recebe** — a migration está na lista congelada (`00_baseline_frozen_meta.sql:58`) e é marcada como aplicada sem executar |
| **A2** | Guarda criada e `warehouse-crud.test.ts:136-154` mantido | O teste **afirma** que `active: false` é aceito, com mock **sem** `ProductWarehouseStock`: continuaria **verde**, gerando garantia falsa |
| **A3** | Guarda lendo `products.quantity` | Fonte errada — é o total do MRP, não o saldo daquele depósito |
| **A4** | Guarda apenas no Zod (`inventoryValidators.ts:57-61`) | Não alcança os outros chamadores e não é regra de domínio |
| **A5** | Filtro `active` acrescentado às primitivas "de uma vez" | Fecha o Caminho A **sem reversão** e colide com `T35-DIN-F06` |
| **B1** | FK só em `hr_employee_documents` | É **literalmente o que o critério antigo pedia** — e deixa a **admissão** decidindo sobre cópia solta |
| **B2** | Grafia unificada só em `rhEnums.ts`/models | Fonte única **por módulo** é o limite exato onde a divergência sobrevive; o banco continua com 4 domínios |
| **B3** | `ALTER TYPE ... RENAME VALUE` sem tratar dados das 4 tabelas | Uniformiza o tipo e deixa linhas com rótulo antigo |
| **B4** | Teste de divergência só entre as duas tabelas originais | Passa verde sem cobrir admissão nem demissão |
| **B5** | Vínculo implementado **copiando laudo** da SST para RH | Destrói a minimização de `00_baseline_frozen.sql:5932` — troca um HIGH por problema de LGPD |

**Ordem contraintuitiva e obrigatória** (`CR-T49-RH-03`): **vínculo antes ou junto** do domínio —
unificar a grafia primeiro produz o pior estado intermediário, em que **parece conciliável o que
continua não sendo conciliado**.

**Dois vetores que `T-49` decidiu NÃO separar, com argumento:** `OBS-T48-01` permanece **dentro** de
`T41-EST-F01` (`CR-T49-EST-04`) — mesma invariante, mesma coluna, mesma causa raiz, e o teste da
independência **falha**; e `OBS-T48-05` **não** é vetor de nenhum dos dois — foi encaminhado ao
diretor e reconciliado com `T43-SST-F01` por `APR-2026-044` D2 (§4.4 item 7).

**Resíduos de `T-49`:** `RES-T49-01` (censo fechado apenas sobre `server/src/**`) · `RES-T49-02`
(nenhum critério validado contra plano de remediação real) · `RES-T49-03` (camada cliente não
auditada) · `RES-T49-04` (`OBS-T48-05` não reverificado por leitura própria) · `RES-T49-05`
(baseline usado como verdade estrutural).

**Regra de negócio que destravou o item:** `APR-2026-043` **D3** fixou
`saldo_total(produto) = Σ saldo(produto, depósito) para todo depósito ATIVO` (item 3 de
`BUSINESS_RULES.md` §12). O item 2 (`:345-349`) é **redação a corrigir**, **não** regra
concorrente, e a correção entra no backlog como item de **documentação (OpusCore)**. Com isso,
**`OBS-T48-02` está resolvida** e a Regra 6 fica preservada — a SanaCore não precisa inventar a
regra. Consequência direta no critério: qualquer implementação que some sobre *todos* os depósitos
**reprova** (`CR-T49-EST-11`).

---

## 7. Cobertura executada — célula a célula, e as exclusões nominais

### 7.1 As 137 células elevadas pela `EMENDA-02`

| Faixa | Células | E integral | Parcial | Não entregue |
|---|---|---|---|---|
| §4 tier 2 — D3/D4 (`C-01`…`C-15`) | 15 | **13** | **2** (`rh` D3/D4) | 0 |
| §4 tier 2 — D9 (`C-16`…`C-34`) | 19 | 0 | **19** | 0 |
| §7.1 tier 3 profundo (`C-35`…`C-62`) | 28 | 0 | **28** | 0 |
| §7.3 tier 3 raso (`C-63`…`C-132`) | **70** | **70** | 0 | 0 |
| §8 superfícies (`C-133`…`C-137`) | 5 | **2** (`C-134`, `C-135`) | **1** (`C-133`) | **2** (`C-136`, `C-137`) |
| **TOTAL** | **137** | **85** | **50** | **2** |

DE (Rodada 2): 15 E · 49 parciais · 73 não entregues → PARA (Rodada 4): **85 E · 50 parciais ·
2 não entregues**. **É a maior mudança de cobertura da run — e continua NÃO sendo o cumprimento do
`G3`.** O que resta descoberto mudou de natureza: deixou de ser *superfície inteira sem auditar* e
passou a ser (i) profundidade por dimensão, (ii) semântica de dado (`C-137`), (iii) contrato por
dimensão (`C-136`), (iv) toda a prova dinâmica.

**Estado por célula, consolidado em `T-26` R5 §4.5:**

| Célula | Estado | Bloqueia relatório? |
|---|---|---|
| `C-01`/`C-02` — `juridico` D3/D4 | 1 endpoint ambíguo (`GET /juridico/reports/financeiro`); `DEF-01` fecha 74/75 ou 75/75 conforme definição | não — definição da VeriCore |
| `C-03`/`C-04` — `rh` D3/D4 | **`A(≈44/57)`** — ≈13 endpoints sem exame | não; **bloqueia afirmar cobertura de RH** |
| `C-05`/`C-06` — `sst` D3/D4 | **`E 75/75 DECLARADA, NÃO CONFIRMADA PELO PAR — ≈6 endpoints sem atribuição de profundidade`** — forma de registro determinada pelo director, e **a divergência viaja junto do número** | não |
| `C-16`…`C-34` — D9 tier 2 | 19 células parciais; **4 de 10 categorias ASVS não varridas** (cripto, segredos, dependências, árvore de dev sem gate) | não; **bloqueia afirmar `G3` cumprido** |
| `C-35`…`C-62` — D4-D8 dos 174 profundos | **`A(≈91/174, 52 %)`** — ≈83 endpoints × 5 dimensões | não; **bloqueia a condição (a) do `G3`** |
| `C-63`…`C-132` — 43 rasos | **ENTREGUES** — 70 células, partição resolvida por enumeração | não |
| `C-133` — `client/` | **`A(157/167)` PARCIAL ALTA** — 31 lidas dirigidamente, ≈10 sem atribuição nominal | não |
| `C-134`/`C-135` — `mobile`/`tv` | **`E`**, triagem 100 % | não |
| **`C-136`** — contrato de API por dimensão | **Nenhuma trilha tocou em 3 levas de fieldwork.** 683 endpoints × 11 dimensões ≈ 7.500 células. **Método decidido** (`APR-2026-043` D2 — dividir); **pré-requisito `F-5` ENTREGUE**; alvo redimensionado para **628 rotas IN** (§7.6) | **SIM** |
| **`C-137`** | **`A(79/207)`**, déficit 128 integralmente nominal | **SIM** |

### 7.2 Déficit do `G3`, medido item a item (`F-1`…`F-12`)

`F-1` (70 células dos 43 rasos) **extinto por entrega**, com 3 ressalvas registradas ·
`F-2` (`client/`) reduzido a ≈10 unidades + 31 leituras dirigidas · `F-3` (`C-137`) ·
`F-4` (`C-136`) **inalterado em 4 rodadas; método decidido em `APR-2026-043` D2, execução não
iniciada** · **`F-5` — EXTINTO POR ENTREGA em 2026-08-17**: a lista nominal IN × OUT foi publicada
(`07-findings/F-5_LISTA_IN_OUT_CATEGORIA.md`), satisfazendo o **passo 4 do `REG-G3`**
(`AUDIT_PLAN_EMENDA_02.md:97-99`), que exige a lista **fixada e anexada antes da análise**. **A
condição (a) do `G3` continua NÃO satisfeita** por outro motivo — `F-6` · `F-6` (≈83 endpoints em
D4-D8) · `F-7` (4 de 10 categorias ASVS) · `F-8` (≈13 de `rh`) · `F-9` (≈6 de `sst`) ·
`F-10` (1 de `juridico`) · `F-11` (evidência dinâmica, ≈232 pedidos contra ~21 executados) ·
`F-12` (regra de negócio dos rasos sem artefato normativo — **lacuna de fonte, não de cobertura**).

**Declarações negativas em vigor:** `N-04` (≈19 endpoints sem D3), `N-05` (semântica de coluna),
`N-07` (`client/`). Propostas de baixa pendentes de ato do director: `N-06` (com 3 ressalvas
nominais) e `N-08` (3ª rodada sem despacho).

### 7.3 `C-137` — aritmética do déficit

| Item | Valor | Fonte |
|---|---|---|
| **Denominador oficial** | **207** (200 do baseline + 7 pós-freeze) · **22 sem model** | `T-47` §1.1; fixado por `APR-2026-042` D1 |
| Cobertas até `T-35` | 52 | `T-13` 22 + `T-31` 12 + `T-35` Tier A 18 |
| + `T-41` / `T-42` / `T-43` / `T-45` / `T-47` | +9 / +6 / +8 / +4 / **+0** | §6.1 / §4 / §2 / §2 / §6 |
| **TOTAL COBERTO** | **79 / 207 (38,2 %)** | 52+9+6+8+4+0 = 79 |
| **DÉFICIT** | **128 / 207** | **106 com model** (185 − 79) + **22 sem model** |

**Régua recusada, registrada porque dimensiona a disciplina:** `T-47` §6 declara que, se as 22
sem model fossem contadas, `C-137` saltaria para `A(101/207)` **sem que uma linha de semântica de
coluna de aplicação tivesse sido verificada**. A tentação foi nomeada e recusada **pelo próprio
autor, no lote em que ela mais renderia**. Delta ratificado: **+0**.

**Contagens estritas alternativas publicadas pelos autores, para que a escolha seja auditável:**
`A(74/207)` (`T-43` §6.6, se `sst_acidente_testemunhas` não contar) · `A(76/207)` (`T-45` §6.6,
se só o núcleo biométrico contar) · `A(79/206)` (`T-47` §1.3, denominador alternativo).
**Adotado `A(79/207)` com denominador 207/22**, por `APR-2026-042` D1.

**Bandas de 1ª ordem sob `APR-2026-036`:** ESTOQUE **5/5 FECHADA** · FISCAL **3/3 FECHADA** ·
DINHEIRO 29, cobertas 4, **25 na exclusão declarada** · DADO PESSOAL 20, parcial · 2ª ordem
**22** (era 23, −`sst_ges_funcionarios`).

### 7.4 EXCLUSÃO DECLARADA — listas nominais, tabela a tabela

> Condição vinculante fixada três vezes pelo dono (`APR-2026-034` D2, `APR-2026-036`,
> `APR-2026-037` §5): **a exclusão consta nominalmente, tabela a tabela — frase genérica de escopo
> é vedada.** Estas tabelas **não foram auditadas** quanto aos 7 critérios de `C-137`. É
> **afirmação, não omissão**.
>
> **Moldura acrescida na revisão 2 (`APR-2026-043` D1):** estas listas nominais são **o
> instrumento** pelo qual o `G3` foi formalmente reduzido pela via do `G8` — *"a exclusão nominal
> da EMENDA-01 **é** a exclusão explícita que o `G8` prevê"*. **Estado do gate:
> `REDUCED_BY_DECISION`.** A redução **não amplia cobertura nenhuma** e **não converte exclusão em
> conformidade**: o que estas tabelas dizem continua sendo *"não auditadas"*.

**(a) 1ª ordem, banda DINHEIRO — 25** *(fonte: `T-42` §2.4; `APR-2026-037` §5.1)*

`purchase_order_items` · `purchase_requisition_items` · `rfq_items` · `rfq_quotes` ·
`import_processes` · `import_process_items` · `item_estruturas` · `item_detalhes_comerciais` ·
`production_routes` · `production_route_steps` · `non_conformities` · `maintenance_orders` ·
`service_orders` · `marketing_campaigns` · `marketing_events` · `hr_training_courses` ·
`hr_employee_job_history` · `hr_employee_benefits` · `engineering_projects` ·
`jur_contract_addendums` · `jur_legal_cases` · `facility_fines` · `facility_vehicle_details` ·
`facility_vehicle_documents` · `facility_fuel_records`.

**Ressalva material, reproduzida e não minimizada** (`APR-2026-037` §5.1, palavras do dono):
*"dinheiro é banda de risco alto, e esta exclusão é a mais custosa da decisão. […] É razoável
supor que haja mais ocorrências entre estas 25, e elas não serão encontradas por esta
auditoria."*

**(b) 1ª ordem, banda DADO PESSOAL (não sensível) — 8**
*(fonte nominal vinculante: `T-43` §9 + `T-45` §9 — **não** `APR-2026-037` §5.2)*

`hr_employee_contracts` · `hr_vacation_accrual_periods` · `marketing_leads` ·
`marketing_lead_saneamento_log` · `sst_acidente_testemunhas` · `jur_contract_signatories` ·
`jur_external_lawyers` · `facility_drivers`.

**Histórico da lista, para que o relatório use o número certo:** **14** (`APR-2026-037` §5.2) →
**11 nominais / 9 efetivas** (`APR-2026-039` §2 — saem `sst_investigacoes_acidente`,
`hr_admission_processes`, `hr_termination_processes` por dado de saúde; saem `sst_entregas_epi` e
`sst_devolucoes_epi` por biometria) → **8** (`APR-2026-040` D2 — sai `facility_visitors`).

**(c) 2ª ordem — 22** *(fonte: `T-42` §2.5; `APR-2026-036`; −`sst_ges_funcionarios` por
`APR-2026-039` §2)*

`purchase_requisitions` · `purchase_order_approvals` · `rfqs` · `import_process_approvals` ·
`jur_contract_approvals` · `master_production_plans` · `hr_employee_trainings` ·
`hr_vacation_schedules` · `hr_time_import_batches` · `sst_treinamentos` · `sst_brigadistas` ·
`sst_membros_cipa` · `sst_candidatos_cipa` · `sst_reuniao_cipa_presentes` · `sst_dds_presencas` ·
`sst_permissoes_trabalho` · `sst_pt_executantes` · `jur_proxies` · `it_responsibility_terms` ·
`it_license_seats` · `it_access_requests` · `facility_visits`.

**(d) Banda EXCLUÍDA da triagem — 53** *(fonte: `T-41` §3.2)*

Suprimentos (1): `rfq_suppliers`.
Estoque/cadastro (4): `product_categories` · `item_categorias` · `item_especificacoes_tecnicas` ·
`product_drawings`.
Produção/qualidade (3): `production_downtimes` · `work_center_shifts` · `acoustic_test_results`.
Marketing (2): `marketing_event_checklist_items` · `marketing_materials`.
RH/organização (4): `hr_benefit_types` · `hr_job_position_trainings` · `departments` ·
`directorates`.
SST (15): `sst_tipos_epi` · `sst_matriz_epi` · `sst_planos_exames` · `sst_acoes_corretivas` ·
`sst_mandatos_cipa` · `sst_processos_eleitorais_cipa` · `sst_reunioes_cipa` · `sst_ges` ·
`sst_riscos_ocupacionais` · `sst_risco_epis` · `sst_risco_exames` · `sst_matriz_treinamento` ·
`sst_inspecoes_seguranca` · `sst_inspecao_itens` · `sst_registros_dds`.
Jurídico (7): `jur_contract_documents` · `jur_corporate_acts` · `jur_intellectual_property` ·
`jur_ip_contract_links` · `jur_legal_alerts` · `jur_legal_case_deadlines` ·
`jur_legal_case_events`.
TI (6): `it_tickets` · `it_ticket_categories` · `it_ticket_comments` ·
`it_ticket_priority_history` · `it_backup_logs` · `ti_settings`.
Facilities (6): `facility_areas` · `facility_correspondence` · `facility_cleaning_schedules` ·
`facility_cleaning_executions` · `facility_resource_reservations` · `facility_vehicle_trips`.
Governança/transversais (5): `access_profile_permissions` · `strategic_plannings` ·
`meeting_minutes` · `business_risks` · `webhook_events`.

**(e) SEM MODEL SEQUELIZE — 22** *(fonte: `T-47` §1.5; **nomeadas pela primeira vez neste run**,
o que satisfaz a condição vinculante de `APR-2026-038` D1)*

| # | Tabela | DDL (baseline) | Natureza |
|---|---|---|---|
| 1 | `SequelizeMeta` | `:2999-3001` | Controle do ORM |
| 2 | `auditoria_eventos` | `:3715-3725` | Órfã PT declarada |
| 3 | `entradas_nf` | `:5018-5025` | Órfã PT declarada |
| 4 | `entradas_nf_items` | `:5046-5054` | Órfã PT declarada |
| 5 | `fornecedores` | `:5615-5624` | Órfã PT declarada |
| 6 | `hr_candidates` | `:5789-5799` | Viva no schema, morta na aplicação; **FK entrante** (`:23680`) |
| 7 | `hr_job_vacancies` | `:6134-6144` | Viva no schema, morta na aplicação; **FK entrante** (`:23744`) |
| 8 | `hr_payroll_import_batches` | `:6171-6179` | Viva no schema, morta na aplicação |
| 9 | `hr_payroll_import_items` | `:6206-6218` | Viva no schema, morta na aplicação; **sanitizador dedicado sem call site** |
| 10 | `hr_performance_reviews` | `:6259-6269` | Viva no schema, morta na aplicação |
| 11 | `hr_time_sheet_summaries` | `:6353-6370` | Viva no schema, morta na aplicação; sucedida de fato por `hr_time_import_*` |
| 12 | `lotes` | `:9312-9321` | Órfã PT declarada |
| 13 | `migracao_bom_log` | `:10077-10086` | **Ferramenta de migração VIVA** por SQL bruto |
| 14 | `migracao_product_item_map` | `:10093-10102` | **Crosswalk de migração VIVO** por SQL bruto |
| 15 | `movimentos_estoque` | `:10109-10124` | Órfã PT declarada |
| 16 | `numeros_serie` | `:10300-10307` | Órfã PT declarada |
| 17 | `ordens_producao` | `:10321-10334` | Órfã PT declarada |
| 18 | `requisicao_compra_items` | `:11902-11910` | Órfã PT declarada |
| 19 | `requisicoes_compra` | `:11924-11935` | Órfã PT declarada |
| 20 | `sst_estornos_entrega_epi` | `:13285-13291` | Viva no schema, morta na aplicação; titular `T45-SST-F02` |
| 21 | `usuarios` | `:14883-14892` | Órfã PT declarada |
| 22 | `webhooks_eventos` | `:15074-15083` | Órfã PT declarada |

**Estas 22 estão NOMEADAS, e a decisão de cobrir × excluir continua sendo do dono** (bloco `B8` de
`CELULAS_SEM_AUTORIZACAO_ACEITACAO.md`, que recebeu o **critério de D1 em cascata** por
`APR-2026-043` D5: cobrir onde o `G3` veda, exclusão nominal no resto). Elas **não** são, hoje,
"exclusão aceita" sem essa aplicação.

> **`DIV-REP-03` — divergência aritmética registrada, não suavizada.** A soma nominal das quatro
> listas de tabelas **com model** é 25 + 8 + 22 + 53 = **108**, contra um déficit medido de
> **106 com model**. A diferença de **2** não é conciliada por este relatório. Uma das duas causas
> está identificada: `sst_acidente_testemunhas` aparece **simultaneamente** na lista de exclusão
> (b) e entre as cobertas — `T-43` §6.6 declara isso expressamente ao publicar a contagem estrita
> alternativa `A(74/207)` (*"coberta apesar de o critério a excluir"*). A segunda unidade **não
> foi identificada** por este agente e é escalada ao `vericore-software-audit-director`. O número
> oficial permanece **128 = 106 + 22**, por `APR-2026-042`; as listas são reproduzidas como
> publicadas pelos autores, sem edição (Regra 15).

### 7.5 Categoria especial do art. 5º II — 18 tabelas

| Subcategoria | Tabelas | Censo | Cobertura |
|---|---|---|---|
| **DADO DE SAÚDE** | **11** | `T-43` §1.2 — censo próprio; a marcação anterior (3) subestimava em **3,7×** | **11/11 cobertas** — 4 em trilhas anteriores (`sst_asos`, `sst_cats`, `hr_employee_documents` em `T-41`; `hr_absences` em `T-13`) + 7 em `T-43` |
| **BIOMETRIA** | **7** | `T-45` §1.2 (5) + `employees` (`APR-2026-040` D1) + `hr_candidates` (`APR-2026-042` D2) | **5 contáveis cobertas** (`sst_entregas_epi`, `sst_devolucoes_epi`, `facility_visitors`, `it_responsibility_terms`, `employees`); **2 não contáveis** |
| **TOTAL** | **18** | — | **16 contáveis; 2 não contáveis, ambas auditadas por outra via** |

> **`DIV-R5-01` — correção de medição, registrada pelo consolidador e reproduzida aqui.**
> `APR-2026-042` D2 afirma *"das 7 de biometria, 6 contáveis e 1 não (`hr_candidates`)"*. **Por
> enumeração, as não contáveis são 2**: `hr_candidates` (item 6 de `T-47` §1.5) **e**
> `sst_estornos_entrega_epi` (item 20 de `T-47` §1.5, explicitamente não contada por `T-45` §2.1).
> **Logo: 5 contáveis, 2 não contáveis.** A **composição da categoria — 18 tabelas, 7 de biometria
> — permanece exatamente como o dono decidiu**; o que se corrige é uma medição de contabilidade de
> cobertura. Escalado ao director para retificação formal da entrada. **A não contabilidade reduz
> o que a métrica pode afirmar, não a proteção:** `sst_estornos_entrega_epi` foi auditada por DDL
> + migration e produziu `T45-SST-F02`; `hr_candidates` foi varrida coluna a coluna por `T-47`
> §2.2 e entrou na categoria por precaução, produzindo `T47-RH-F01`/`-F02`.

**Estado de proteção medido:** 23 colunas do art. 5º II identificadas · **1 classificada (4,3 %)**
· **2 protegidas por sanitizador (8,7 %)**, **nenhuma delas biométrica**. Padrão de `G-25`: *o
sanitizador protege o identificador fraco e deixa passar o forte*.

**Declaração de fechamento do censo, nos termos exatos dos artefatos, sem arredondar:** as duas
categorias especiais estão com o **censo FECHADO entre as 207 tabelas do schema**; as 22 sem model
foram enumeradas e submetidas aos dois léxicos — clínico e biométrico — coluna a coluna, com
**zero casamentos** nos dois. **Condicionalidade única e declarada:** os 6 contêineres genéricos
de `RES-T47-02` (§8).

**O que o censo custou em correções contra os próprios auditores:** duas subestimativas da
categoria foram detectadas **pela condição vinculante do dono** — saúde 3 → 11 (`T-43` §6.3),
biometria 2 → 5 (`T-45` §6.3). **Sem essa condição, 4 tabelas com dado de saúde de trabalhador —
incluindo admissão e demissão — teriam entrado na lista de exclusão.**

### 7.6 `F-5` — a lista nominal IN × OUT, publicada (`APR-2026-043` D2)

**Autoridade e finalidade.** `REG-G3` passo 4 (`AUDIT_PLAN_EMENDA_02.md:97-99`) exige que a lista
nominal das duas classes seja **fixada e anexada antes da análise**. Ela constava como *não
publicada* em **cinco** rodadas de cobertura (`AUDIT_COVERAGE_EXECUTED_RODADA4.md:258`).
`APR-2026-043` **D2** tornou-a pré-requisito explícito da divisão de `C-136`. **Foi entregue em
2026-08-17.** Regime: 100 % estático, zero conexão de banco.

**Universo confirmado por medição independente.** `F-5` mediu por Grep **ancorado no início da
linha** (`^\s*router\.(get|post|put|patch|delete)\(`), método **diferente** do usado por `T-17`
(Grep `-o` + 4 leituras manuais de chamada multi-linha), e chegou ao **mesmo 683**: 681 em
`server/src/modules/**` + 2 em `src/routes/health.ts`. Alcançáveis: 683 − 8 (CNAB definido e **não
montado**) + 1 (`GET /api`, `app.ts:227`) = **676**, **fechando exatamente** com `T-17` §1.3 a
partir de base distinta. Fora do universo e declarados: o handler inline `GET /api` e a superfície
**não enumerável** `GET /uploads/*` (`app.ts:225`), que serve ASO, TRCT e contratos.

**Critério declarado ANTES de aplicado** (`F-5` §2): as 12 categorias vedadas pelo `G3` mais as
extensões `I-1a` (dado pessoal) e `I-1b` (obrigação legal com prazo), cada uma com critério
operacional escrito; **três fronteiras discutíveis decididas em aberto** — C2 não é "toda rota com
middleware de authZ" (a leitura ampla poria 683/683 em IN e esvaziaria a triagem), C6 não é "toda
escrita", e a **Regra L** define quando leitura é IN. A regra de desempate `I-6`
(*in dubio pro cobertura*) foi cumprida **e marcada rota a rota**, para que o efeito seja medível
por terceiro.

**Resultado — a contagem honesta:**

| Faixa | Total | **IN** | **OUT** | Não classificado |
|---|---|---|---|---|
| Tier 3 profundo — **nominal por rota** | 174 | **119** | **55** | 0 |
| Tier 1 — por módulo | 39 | 39 | 0 | 0 |
| Tier 2 — por módulo | 381 | 381 | 0 | 0 |
| Tier 3 elevado — por módulo | 44 | 44 | 0 | 0 |
| Tier 3 raso — por módulo (`I-5`) | 43 | 43 | 0 | 0 |
| `health` — nominal | 2 | 2 | 0 | 0 |
| **TOTAL** | **683** | **628 (91,9 %)** | **55 (8,1 %)** | **0** |

628 + 55 = 683 ✔. **Não classificados: ZERO.**

**Subtotal nominal do tier 3 profundo** (as 55 OUT estão **todas** aqui, nominadas com arquivo,
linha, verbo e path em `F-5` §3): `facilities` 64 = 45 IN / 19 OUT · `ti` 47 = 37 / 10 ·
`marketing` 30 = 14 / 16 · `engineering` 11 = 4 / 7 · `comex` 8 = 8 / 0 · `reports` 8 = 8 / 0 ·
`workCenters` 6 = 3 / 3. **Conferência:** 119 + 55 = 174 ✔.

**Sensibilidade à regra de desempate, publicada** (`F-5` §5.3): com `I-6` ligado (norma vigente,
lista oficial) **628 / 55**; com `I-6` desligado **614 / 69**. As **14 rotas** que mudam de lado
estão nominadas: `facilities` 5/20/37/47/48/49, `ti` 43/44, `marketing` 3/4, `engineering` 7/11,
`workCenters` 4/5. *"O efeito de uma regra de desempate não pode ficar dentro da cabeça do
auditor."*

**O resultado desconfortável, dito sem maquiar** (`F-5` §5.2): a divisão aprovada em D2 reduz o
alvo da matriz de 11 dimensões em **8,1 %**, **não em uma ordem de grandeza**. **Isto não invalida
D2** — a divisão continua legítima e as 55 rotas são nominalmente excluíveis a partir de hoje —
mas *"quem dimensionar `C-136` contando com uma redução material **vai errar o prazo**, e essa é
uma informação que o diretor precisa ter **antes** de planejar, não depois"*.

**A única alavanca real — não autorizada.** O refinamento **por rota** dentro de tier 1 e tier 2
(**420 endpoints**) **contraria `I-2`** (`AUDIT_PLAN_EMENDA_02.md:72`), que fixa a unidade em
**módulo** fora do tier 3. Exigiria **nova decisão humana** (Regra 18). Custo estimado: 3-4
sessões sobre 26 arquivos de rota; ganho **não garantido** — `financial`, `inventory`, `sales`,
`rh`, `sst` e `juridico` (287 endpoints) muito provavelmente permanecem IN quase integralmente.
Registrado como `F-5` **L-02**.

**Instrução operacional vinculante para `C-136`** (`F-5` §8, executando D2):

1. **Matriz de 11 dimensões integral** nas **628 rotas IN** — com a ressalva de que os **8
   endpoints de `cnab.ts`** recebem **`N/A — rota não montada`**, **não** `NÃO AUDITADO`, com a
   evidência da não-montagem (`T-17` §1.3, `AUD-SEC-T04-03`).
2. **Exclusão nominal com dimensão declarada** nas **55 rotas OUT** — a exclusão deve citar
   `F-5 §3.x #n` e dizer **quais colunas** ficaram vazias, **nunca** frase genérica (exigência
   literal de D2).
3. **A lista é fixa a partir da publicação.** `REG-G3` passo 4 **proíbe** ajustá-la depois para
   caber no achado; reclassificação exige **adendo com motivo escrito**, não edição silenciosa.
4. **Refutabilidade rota a rota é o produto** — não o número.

**Handoffs que saem de `F-5` e não são finding fechado:** `DIV-F5-02` e `DIV-F5-03` (§11.1); e uma
**segunda ocorrência de `T17-F07`** em `health.ts:42` — o ramo de falha de `GET /health/ready`
devolve `error.message` **cru a chamador não autenticado** (rota montada em `app.ts:39`, **antes**
de qualquer gate). `F-5` §4.5 a encaminhou a `T-18` e ao titular de `T17-F07` como **segunda
ocorrência, em superfície ainda mais exposta** — **não** como finding novo, e este relatório
**não** cria ID para ela.

**Lacunas declaradas por `F-5`, reproduzidas sem edição:** `L-01` (árvore lida **não amarrada
criptograficamente** ao `AUDIT_COMMIT` — mesma limitação de `RES-T17-02`) · **`L-02`**
(refinamento por rota em tier 1/2 não feito e não autorizado; **o IN de 628 é o teto normativo,
não necessariamente o material**) · `L-03` (3 das 4 rotas multi-linha aceitas como insumo de
`T-17`, **declarado como insumo e não como verificação própria**) · `L-04` (`workCenters` POST/PUT
classificadas por `I-6` sem verificar custo-hora no controller/model — 2 rotas **podem** ser OUT) ·
`L-05` (`DIV-F5-02`/`-03` não adjudicadas) · `L-06` (`/uploads/*` é superfície **não enumerável
estaticamente**; cobertura de contrato dessa superfície é **estruturalmente impossível** por método
estático).

---

## 8. `RES-T47-02` — a coleta dinâmica executada e o seu veredito

**Autorização:** `APR-2026-041`, restrita a `erp_evok_audio_test`, com a limitação metodológica
registrada **antes** da coleta. **Executor:** `vericore-audit-verification-runner`. **Artefato:**
`07-findings/DYN-T47_COLETA_CONTEINERES.md`.

**Protocolo verificado no artefato:** trava de alvo dupla (recusa no env e no banco já conectado,
`/(_test|_ci)$/i`); `SET default_transaction_read_only = on`; `BEGIN READ ONLY`; encerramento com
`ROLLBACK`; prova de alvo pelo **próprio servidor** (`current_database = erp_evok_audio_test`,
`transaction_read_only = on`, PostgreSQL 16.14); **nenhum valor de conteúdo lido ou transportado**
— apenas `count(*)` e `jsonb_object_keys`, este último vazio. **Nenhuma conexão com
`erp_evok_audio`** (`APR-2026-016` íntegra). Registro adicional do executor: uma tentativa de
`grep` contendo o nome do banco de produção foi **bloqueada pelo hook** `org-isolation.js` — o
enforcement técnico foi observado funcionando.

**Resultado — as 7 colunas dos 6 contêineres:** todas existem com o tipo declarado; **0 linhas**
em todas; **0** não-nulas; **0** chaves de topo; **133 contagens de léxico (19 termos × 7 alvos),
todas 0**; `pg_stat_user_tables` mostra `ins=0 upd=0 del=0` — a base **nunca recebeu um `INSERT`**
nessas tabelas. **Zero `CHECK`** nas 5 tabelas e nenhum contrato de formato nas 4 colunas `jsonb`.

**Veredito do executor: NÃO FECHA.**

- **Fecha** apenas a dimensão **estrutural** — que não era a dimensão em aberto. Corrobora, não
  decide, a leitura de *"contêineres sem gravador"*.
- **Não fecha** o essencial: *"estes contêineres contêm, em produção, dado de categoria especial?"*
  segue sem resposta. Nas palavras do executor: **"o zero obtido é o zero do banco errado para a
  pergunta"**.
- **Consequência formal, exatamente como `APR-2026-041` previu antes do resultado:** a
  condicionalidade é **rebaixada** de *"não decidível estaticamente"* para **"não decidível sem
  acesso a produção"** — decisão de outra natureza, **não autorizada**, e que exigiria aprovação
  humana caso a caso, jamais por extensão.
- **Registro de método do executor:** os falsos positivos previsíveis dos termos curtos (`cid` em
  "de**cid**ido", `aso` em "c**aso**") e a ausência de tratamento de acento não afetaram este
  resultado porque o denominador é 0 — ficam registrados como cuidado obrigatório caso a bateria
  seja algum dia autorizada contra base povoada.

> **`DIV-REP-01` (Regra 7).** `T-26_CONSOLIDACAO_RODADA5.md` §5.1 `BLQ-3` afirma *"coleta NÃO
> EXECUTADA — nenhum artefato de execução existe em `07-findings/` nesta data"*. **A afirmação
> está defasada**: o artefato existe e é posterior à consolidação. **O artefato vence.** O efeito
> prático é o mesmo em ambas as leituras — `RES-T47-02` permanece **ABERTA** —, mas por motivo
> diferente, e o motivo importa para a decisão do dono.

### 8.1 `DYN-T41-03` e `DYN-T49-03` — não autorizados, pendência de janela futura (`APR-2026-044` D3)

**Decisão, verbatim:** *"Não autorizo `DYN-T41-03` nem `DYN-T49-03` nesta sessão. Registre como
pendência para janela futura, escopada especificamente para essas duas consultas nomeadas, somente
leitura contra produção — fora do lote de ~190 pedidos, decidida separadamente."*

| ID | Pergunta | O que muda |
|---|---|---|
| **`DYN-T41-03`** | Existe funcionário com `sst_asos.resultado='inapto'` **vigente** e documento `aso_*` de RH **válido com aptidão**? | **Único** capaz de mover `T41-RH-F02` de **HIGH para CRITICAL** |
| **`DYN-T49-03`** | Há `inventory_movements` cujo `warehouse_id` esteja **hoje inativo**? | **Único** que separa **risco latente de dano consumado** em `T41-EST-F01` |

**Fundamento registrado, que vira precedente do programa:** rodar contra o banco de teste (vazio)
produziria um **falso zero** — *"pior que não coletar nada, porque poderia ser lido como 'não
existe caso real' quando na verdade é só 'banco sem dado nenhum'"*. É a mesma lição que `DYN-T47`
demonstrou empiricamente (§8) e que `APR-2026-041` já havia registrado **antes** daquela coleta.
A segunda metade do fundamento é de disciplina de acesso: *"produção exige a mesma disciplina que
já aplicamos a noite toda: nunca autorizar por extensão, sempre janela própria, escopada, com
consultas nomeadas"*.

**Quatro condições fixadas para a janela futura:** (1) escopada **especificamente** a estas duas
consultas nomeadas — não por extensão, não em bloco; (2) **somente leitura**, contra produção;
(3) **fora** do lote de ~190 pedidos de `B9`, reservado a decisão separada (`APR-2026-043` D5);
(4) confirmação humana explícita de **dia e horário**, como toda operação contra produção neste
programa (`APR-2026-016`).

**Consequência sobre o que este relatório pode afirmar:** a **materialização** de `T41-RH-F02` e de
`T41-EST-F01` permanece **não medida** (`RES-T48-02`). O mecanismo dos dois está provado
estaticamente; **o dano consumado não está medido e não é afirmado**.

---

## 9. Conformidades verificadas e falsos positivos evitados

Registro consolidado, porque um relatório final que só publica defeito é enviesado.

| Trilha | Conformidades verificadas | Falsos positivos evitados |
|---|---|---|
| `T-41` | 12 | **2** — `jur_lgpd_data_subject_requests` impede resposta sem identidade verificada (`CHECK` real); `hr_job_positions` tem `CHECK` de faixa salarial (`00_baseline_frozen.sql:6092`) |
| `T-42` | 9 | **3** — `sale_lot_shipments` "ausente do schema" (o baseline é que estava atrasado); evento eSocial duplicado (índice único **parcial** correto); concessão ISO 9001 §8.7 impedida **com rigor maior que um `NOT NULL`** |
| `T-43` | 8 | **3** — incluindo o de maior impacto: o renderizador do `Grep` deformou literais de rota e sugeria que o cluster clínico não tinha caminho de escrita |
| `T-45` | 6 | **3** — o upload que não existe; o renderizador de `Grep` (**2ª ocorrência**); a premissa da própria decisão do dono (`sst_devolucoes_epi` não tem coluna biométrica) |
| `T-47` | 3 | **3** — o "schema-fantasma solto" (há guarda em **duas camadas**); `migracao_*` "órfãs" (são **vivas**; o finding é o oposto); ponto biométrico em `hr_time_sheet_summaries` (hipótese forte morta por leitura) |
| **`F-5`** | **4** | **3** |
| **TOTAL** | **42** | **17** |

**Os 7 registros de `F-5` §6.2, nominados:**

| ID | Registro | Tipo |
|---|---|---|
| `CONF-F5-01` | **683 confirmado por método independente** do de `T-17` — Grep ancorado no início da linha × Grep `-o` + leitura manual. Convergência de dois métodos distintos | conformidade |
| `CONF-F5-02` | **676 alcançáveis confirmado partindo de base diferente** (683−8+1 × 681−8+2+1). A aritmética de `T-17` §1.3 **fecha** | conformidade |
| `CONF-F5-03` | **A soma dos tiers fecha em 683 em todos os cortes**: 39 + 381 + 261 + 2, com 261 = 174 + 44 + 43. Nenhum módulo órfão, nenhum contado duas vezes; `financial` 30, `inventory` 27, `production` 23 conferidos por soma de arquivos | conformidade |
| `CONF-F5-04` | **Falso positivo evitado — `/api/engineering/bom`.** Os 12 endpoints de `bom.ts` **não** foram somados aos 11 de `engineering`: montados antes, em prefixo próprio (`app.ts:193-195`), pertencem à faixa §7.2. Somá-los inflaria `engineering` para 23 e **quebraria o 174** | falso positivo evitado |
| `CONF-F5-05` | **Falso positivo evitado — `POST /api/facilities/maintenance-tickets` (`:89`) não é shadow endpoint.** A ausência de `authorizeModule` é **intencional e documentada** (`facilities.ts:15-18, 88`, RF-FAC-040). Classificado IN por C2 (o gate desvia e precisa ser verificado), **não** como defeito — a adjudicação é do `authorization-auditor` | falso positivo evitado |
| `CONF-F5-06` | **Falso positivo evitado — C2 não foi aplicado a "toda rota com middleware de authZ".** A leitura ampla poria **683/683** em IN e esvaziaria a triagem do `REG-G3` | falso positivo evitado |
| `CONF-F5-07` | **`comex` 8/8 IN e `reports` 8/8 IN** coincidem com o que `EMENDA_02:174-184` já determinara **antes** da varredura — o auditor chegou por leitura do arquivo e só depois confrontou o plano. **Convergência, não deferência** | conformidade |

**Conformidades que a remediação NÃO pode destruir, nomeadas:** o `CHECK` de exatamente-um-dono de
`production_order_reservations` · o trigger `sst_lock_cat` (imutabilidade legal da CAT,
verificado) · o trigger `sst_lock_acidente` (12 colunas comparadas uma a uma, com
`IS NOT DISTINCT FROM` nas nullables) · `hr_termination_processes.payment_deadline`
**GENERATED ALWAYS** citando o CLT art. 477 §6º — a única coluna gerada da célula, e exatamente a
técnica que `T42-PCP-F02` pede · a guarda de CI `no-orphan-pt-schema-tables.test.ts`
(**12 tabelas órfãs cercadas em duas camadas**) · `CreateEpiDeliveryUseCase` com **lista branca
explícita de 8 campos** (zero mass assignment) · `errorHandler.ts:84-89` mapeando violação de FK
para **400, não 500** · `00_baseline_frozen.sql:5932`, a minimização deliberada de dado clínico na
cópia de RH · **`getWarehouseByCode` mantém `active: true`** (`CR-T49-EST-10`: remover o filtro
"para uniformizar" é regressão — aqui o filtro **sobra em um lugar e falta nos outros**) ·
**`inventory_counts_warehouse_id_fkey`** (`00_baseline_frozen.sql:24132-24136`), que já impõe a
**existência** do depósito, restando apenas o `active`.

**Regra de método fixada por três trilhas consecutivas, vinculante para o restante do programa:**
*achado que dependa da forma exata de um literal é confirmado por **leitura do arquivo**, nunca por
saída de `Grep`* (`T-43` §4.1, `T-45` §4.2, `T-47` §8.3 — nesta última, um grep de linha única
**perdeu 4 das 7 tabelas pós-freeze** e quase virou omissão). **`T-49` e `F-5` reafirmaram a regra
e a cumpriram**: `T-49` confirmou **27 literais load-bearing** por `Read` com faixa de linhas
citada (L01-L27), e `F-5` reabriu `marketing.ts:54-58` para amarrar a chamada multi-linha.

**Autocrítica medida dos auditores (`OBS-T26-36`, ampliada nesta revisão):** a última leva reportou
**5 erros contra si própria** — `T-42` §10.1 (erro a favor do auditor), `T-43` §6.1 (subestimou os
controles do produto), `T-43` §6.3 (subestimou a própria categoria), `T-45` §6.2 (afirmou
impossibilidade falsa), `T-47` §8.3 (grep que quase virou omissão) — **e 1 contra a premissa de uma
decisão do dono** (`T-45` §6.1). **`T-49` acrescentou 2**, os dois publicados pelo **autor de
origem contra o próprio trabalho**: o elo "Admissão" de `T41-RH-F02` estava **errado** (e o erro
**amplia** o finding) e o item 3 de `T41-EST-F01` era **factualmente errado** (o saldo **não** fica
preso — e isto **reduz** a consequência). **Total: 7 erros contra si próprios.** Um amplia, outro
reduz, os dois foram publicados com o mesmo peso — é isso que torna a contagem não seletiva.

---

## 10. Observações colaterais com efeito sobre a remediação

Registradas como **observações**, não convertidas em finding pelo validador — não é autoridade dele
(`T-48` §4). Devolvidas ao auditor de origem e ao director. **A coluna "Estado" reflete as decisões
de `APR-2026-043` e `APR-2026-044`.**

| ID | Observação | Evidência | Estado / efeito |
|---|---|---|---|
| **`OBS-T48-01`** | **Transferência aprovada não revalida `active` de origem nem de destino.** Uma transferência `pending` cujo destino foi desativado no intervalo **credita saldo em depósito inativo**; a soma sobre ativos cai sem contrapartida em `products.quantity` — **sem que ninguém desative depósito com saldo** | `CreateWarehouseTransferUseCase.ts:63-69` × `ApproveWarehouseTransferUseCase.ts:59-61` | **ABSORVIDA COMO VETOR V4** de `T41-EST-F01`, com item de reteste próprio (`CR-T49-EST-04`), por decisão argumentada de `T-49` §5 — mesma invariante, mesma coluna, mesma causa raiz; o teste da independência **falha**. **Não vira finding separado** |
| **`OBS-T48-02`** | **`BUSINESS_RULES.md` §12 se contradizia.** Item 2 (`:345-349`) definia saldo total como soma de **todos** os depósitos; item 3 (`:351-354`), como soma dos **ativos** | `docs/business/BUSINESS_RULES.md:345-354` | **RESOLVIDA** por `APR-2026-043` **D3**: prevalece o **item 3** (*"é o que o código implementa, o que o model cita, e o que torna a invariante testável"*). O item 2 é **redação a corrigir** — item de backlog de **documentação (OpusCore)** —, **não** regra concorrente. **Deixa de bloquear** a remediação de `T41-EST-F01`; Regra 6 preservada |
| **`OBS-T48-03`** | **A aptidão do ASO vive em QUATRO tabelas, não duas** — `sst_asos.resultado`, `hr_employee_documents.aptitude_result`, `hr_admission_processes.aso_result`, `hr_termination_processes.aso_result`, nenhuma com FK para `sst_asos`. Pior: `hr_termination_processes.aso_result` é **gravado** (`ConfirmTerminationAsoResultUseCase.ts:35`) e **não é lido pelo gate da própria demissão** | `00_baseline_frozen.sql:669-672`, `:765-769`, `:839-842`, `:2300-2304`; `ConcludeAdmissionProcessUseCase.ts:119` | **INCORPORADA AO CRITÉRIO** de `T41-RH-F02` (`CR-T49-RH-01`, `-02`, `-04`, `-05`, `-08`). Amplia o finding de 2 para 4 tabelas e **muda o desenho da correção** |
| **`OBS-T48-04`** | **`valid_until NULL` = validade infinita no gate de ASO**, e o gate não amarra o documento ao afastamento. Um `aso_retorno` sem validade satisfaz **todos** os retornos futuros do funcionário | `SequelizeEmployeeDocumentRepository.ts:43-54` (`:50`); `HrEmployeeDocument.ts:27`; `ReturnFromAbsenceUseCase.ts:95-103` | **PROMOVIDA A FINDING PRÓPRIO** — **`AUD-RH-VALIDADENULA-01`** (`APR-2026-044` D1), **com um segundo consumidor descoberto em `T-49`** (`ConcludeAdmissionProcessUseCase.ts:125`). Ver §4.5. `CR-T49-RH-09` (fallback) fica **desativado** |
| **`OBS-T48-05`** | **`CreateAsoUseCase` grava o ASO FORA da transação** que criou; falha no `create` do evento faz rollback do evento e **o ASO permanece**, sem `S-2220` enfileirado | `CreateAsoUseCase.ts:72-99`; `SequelizeAsoRepository.ts:70-72`; `AsoRepository.ts:30` | **ANEXADA COMO CONFIRMAÇÃO INDEPENDENTE DE `T43-SST-F01`** (`APR-2026-044` D2). **Não é item novo, não conta no placar** — dois auditores, caminhos independentes, o mesmo defeito. **Reforça** o finding existente (§4.4 item 7) |
| **`OBS-T26-40`** | **A suíte de testes existente codifica o comportamento defeituoso** — `server/tests/unit/sst-epi.test.ts:116-130`. **Suíte verde não é evidência de ausência de defeito** quando nenhum teste prova a invariante em questão | `T-46` §3.3 | O teste precisa ser atualizado **no mesmo commit** da remediação de `T45-SST-F01`. **Segunda ocorrência da mesma classe, encontrada por `T-49`:** `server/tests/unit/warehouse-crud.test.ts:136-154` **afirma** que desativar depósito é aceito, com mock sem saldo — armadilha `A2` (§6.4) |

---

## 11. Divergências registradas (Regra 20) — não acomodadas

### 11.1 Divergências desta emissão de relatório

| ID | Divergência | Tratamento |
|---|---|---|
| **`DIV-REP-01`** | `T-26` R5 §5.1 `BLQ-3` afirma que a coleta `DYN-T47-01`/`-02` **não foi executada**; o artefato `DYN-T47_COLETA_CONTEINERES.md` prova que **foi** | **Artefato vence (Regra 7).** Registrado; `RES-T47-02` permanece aberta, com a condicionalidade **rebaixada** (§8) |
| **`DIV-REP-02`** | O mandato desta emissão declara `CASE-004` itens A e B **remediados, `RETEST_REQUIRED`**. O único artefato de `CASE-004` legível na árvore auditável é o `TRIAGE_REPORT.md`, que encerra **autorizando o início do Estágio 1** | **Registrado, não suprido.** O estado é relatado como **declarado, não confirmado por artefato acessível**; o pacote de evidência vive em `sana/ERP-LEGACY-001/CASE-004`, branch não mesclada. **Reforça a exigência de reteste independente da VeriCore** (Regra 4) |
| **`DIV-REP-03`** | Soma nominal das listas de exclusão com model = **108** × déficit medido com model = **106** (§7.4) | **Registrado, não conciliado.** Uma causa identificada (`sst_acidente_testemunhas`, `T-43` §6.6); a segunda não. Escalado ao director |
| **`DIV-REP-04`** | O placar oficial (rodada 5) é **483 / 501** e **não contém** `AUD-RH-VALIDADENULA-01`, aberto depois da consolidação por `APR-2026-044` D1 | **Registrado, não forçado (Regra 7).** O finding **não tem severidade fixada** e não é distribuído em banda alguma; total vigente **484**, IDs emitidos **502**, com a linha "sem severidade fixada" explícita (§2.1-bis). **Reconciliação formal é do consolidador/director** |

**Divergências novas trazidas por `F-5`, reproduzidas sem edição** (`F-5` §6.1):

| ID | Divergência | Situação |
|---|---|---|
| **`DIV-F5-01`** | **681 × 683** — `AUDIT_PLAN.md:475`, `SYSTEM_MAP.md` e `API_INVENTORY.md` (passo 23) dizem 681; a medição própria de `F-5` e `T-17` dizem **683** | **Reconfirmada, não acomodada.** 681 é subcontagem por Grep de linha única (perde 4 chamadas multi-linha) e ignora `health.ts`. Já escalada por `T-17` §7.1; **permanece aberta** |
| **`DIV-F5-02`** | `ti.ts:7-8` declara *"57 endpoints do contrato"*; o arquivo tem **47** — discrepância de **10** contra `BLOCO_2_TI_API.md` | **Não adjudicada** (`F-5` L-05): exigiria contar o documento endpoint a endpoint, o que não foi feito. Encaminhada a `T-23` / `AUD-PROC-DOCDRIFT-01` |
| **`DIV-F5-03`** | `facilities.ts:5-6` declara *"os 60 endpoints do contrato"*; o arquivo tem **64** — discrepância de **4**, mesmo padrão, sentido oposto | **Não adjudicada** (`F-5` L-05) |

> Nota de método registrada pelo próprio autor: `DIV-F5-02` e `DIV-F5-03` foram reportadas **contra
> a sua própria conveniência** — nenhuma delas muda o total de 174, e ele poderia tê-las calado sem
> que a lista mudasse de forma alguma.

### 11.2 Divergências herdadas, reproduzidas por exaustividade

`DIV-R5-01` (biometria: 5 contáveis e 2 não, contra "6 e 1") · `DIV-R5-02` (mandato da rodada 5
mandava somar findings já contidos na base de 446 — **não somados**, artefato venceu) ·
`DIV-R5-03` (par de cobertura declarado inexistente **existe**; `OBS-T26-33` reduzida, não
encerrada) · `DIV-R5-04` (falha de despacho da Regra 22 no lote 3) · **`DIV-R5-05`** (o baseline
**9 migrations atrasado** afeta **retroativamente** `T-13`, `T-31`, `T-35` e `T-41`, que usaram
*"ausente no baseline"* como evidência **sem a verificação de corte que `T-43` §2 e `T-45` §2.2
fizeram** — assimetria de método **não reconciliada**) · `DIV-R5-06` (`CreateAsoUseCase` enfileira
todo evento S-2220 **sem `prazo_legal`**, o que converte `T42-FIS-F03` ponto 2 de latente em
sistemático — **não reclassificado**, seria alterar severidade sem o titular) · `DIV-R5-07`
(denominadores alternativos publicados) · **`DIV-SEV-01`** (`T17-F05` MEDIUM × `T23-F03` HIGH
sobre o mesmo fato, **5ª rodada sem resolução** — o grupo G-12 carrega HIGH **apenas para
priorização**, declaradamente **não** como resolução de mérito; **este relatório não publica essa
severidade como mérito resolvido**) · `DIR-DIV-04`, `DIR-DIV-06`, `DIR-DIV-07`, `DIV-T27-RH-02`,
`DIV-T27-JUR-03`, `DIV-COV4-02`, `DIV-COV4-05`, `OBS-T39-02`.

---

## 12. Limitações de instrumento e de escopo — declaradas

1. **Nenhuma âncora `arquivo:linha` dos 502 IDs foi reverificada por este agente.** Nenhum arquivo
   de `server/`, `client/`, `docs/`, `product/`, `mobile/` ou `tv/` foi aberto na produção deste
   relatório. **Se uma âncora está errada na origem, este documento repete o erro.**
2. **A auditoria é predominantemente estática.** `APR-2026-016` proíbe tocar `erp_evok_audio`. Fila
   dinâmica: **≈232 pedidos catalogados, ~21 executados**. Sete deles **mudam classe de
   severidade** se respondidos: `DYN-T41-03` (**HIGH → CRITICAL**), `DYN-T43-02`, `DYN-T43-04`,
   `DYN-T42-01`, `DYN-T45-01`, `DYN-T45-04`, `DYN-T45-08`. **`DYN-T41-03` e `DYN-T49-03`
   permanecem NÃO AUTORIZADOS**, com janela futura escopada e 4 condições (§8.1); `DYN-T49-01`,
   `-02`, `-04`, `-05`, `-06`, `-07` foram **registrados e não executados** por `T-49`.
3. **`00_baseline_frozen.sql` está exatamente 9 migrations atrasado** (`RES-T42-04`/`RES-T47-06`).
   Para toda tabela criada após `20260810-000038`, *"não achei no baseline"* **não é evidência de
   ausência**. Regenerar exigiria tocar banco, o que `APR-2026-016` proíbe. Ver `DIV-R5-05`.
4. **O renderizador de `Grep` deforma literais de rota** — propriedade conhecida do instrumento,
   observada em **3 trilhas consecutivas**, que teria produzido em dois casos um CRITICAL
   espetacular e **falso**. `T-49` e `F-5` trataram-na explicitamente (§9).
5. **Deduplicação sintática, não semântica.** `DUP-ABERTA-01` e `DUP-ABERTA-02` seguem abertas.
6. **A enumeração integral do estrato 4 (81 IDs) não foi entregue** (`T5-02`): há **26 nominais** e
   **55 por ponteiro**. O obstáculo aritmético do ±2 deixou de existir com a errata; o que falta é
   **trabalho de listagem**. **Declaração, não omissão** — e é o limite do backlog (§13).
7. **A classificação de ambiente dos 37 IDs novos não existe** e não é inferida (Regra 6).
   `T41-RH-F02` e `T43-RH-F04` são **candidatos nominais a produção real** no recorte
   desligamento — se confirmado, `T41-RH-F02` **sobe ao estrato 2**. Escalado como extensão de
   `P-T39-01`. **`AUD-RH-VALIDADENULA-01` tem ambiente heterogêneo declarado** (§4.5) e **não é
   estratificável** enquanto a severidade não for fixada.
8. **`git diff c1311a6..HEAD` nunca foi reconfirmado** em nenhuma trilha da última leva;
   `LIM-T37-01` segue aberto; `RES-T46-01` registra que a própria validação leu a árvore de
   trabalho, não um checkout de `c1311a6f`. **`F-5` L-01 herda a mesma limitação** — a árvore lida
   não foi amarrada criptograficamente ao `AUDIT_COMMIT`.
9. **Adjudicações pendentes desde a Rodada 1** (`OBS-T26-06`/`T5-05`): `T16-F15`, `T21-F01`
   (`ListProductsUseCase`/`ProductController` que **nenhuma trilha leu**, com pedido da própria
   `T-21` de reavaliação para HIGH se confirmado), `RES-T13-04`, `RES-T13-05`, `T29-MOB-F03`,
   `T32-FST-F04`. **Findings encaminhados e nunca adjudicados não entram neste relatório como
   fechados.**
10. **O IN de 628 de `F-5` é teto normativo, não necessariamente material** (`F-5` L-02): a
    qualificação por rota em tier 1/2 (420 endpoints) **não foi feita e não está autorizada**.
    **`/uploads/*` é superfície não enumerável estaticamente** (`F-5` L-06) — cobertura de contrato
    dessa superfície é **estruturalmente impossível** pelo método em vigor.
11. **Os critérios de reteste de `T-49` não foram validados contra plano de remediação real**
    (`RES-T49-02`), e o censo de escrita que os sustenta é **fechado apenas sobre `server/src/**`**
    (`RES-T49-01`): scripts, seeds e migrations de dados não foram varridos.

---

## 13. Bloqueio normativo herdado — soft delete

**Vinculante, herdado sem alteração** (Rodada 4 §4.3, reafirmado em `T-26` R5 §2.2). A frase
*"soft delete não existe"* e variantes **não podem aparecer como conformidade genérica** em
nenhum relatório final deste run.

**Forma admissível, e única:** *"soft delete por `deleted_at`/`paranoid` não existe"*, sempre com
escopo explícito, acompanhada da contraparte: *"soft delete semântico por `active`/`status` existe
em **34 tabelas**, o filtro é **100 % de aplicação, com zero lastro em banco**, e há **3 falhas
nomeadas no caminho de escrita** — `cost_centers`, `clients`, `suppliers`"*.

**`AUD-DB-09` é MEDIUM re-fundamentado, não o MEDIUM herdado** (`APR-2026-035` `D-R1`): a premissa
original ("soft delete confirmadamente ausente") foi retificada pelos dois autores de origem e
**não existe mais**. A redação vigente é a de `AUD-DB-09_RETIFICACAO_01.md` §2.2, **mais
desfavorável ao objeto auditado** que a original. **Não foi elevado porque as 3 falhas concretas
já têm titular** em `T35-DIN-F06` e a dimensão de trilha em `AUD-ALOG-01` — elevar seria **dupla
contagem**, prática que este run rejeita expressamente.

---

## 14. Severidades congeladas por `APR-2026-035` — aplicadas, com o contraditório preservado

- **`D-01` — `AUD-CTB-DEBCRED-01`: MANTIDA HIGH.** O dono **recusou** o rebaixamento recomendado
  por `T-34` e reafirmado pelo director. **O argumento do validador é reproduzido, não apagado**
  (Regra 20): havia quatro camadas de contenção verificadas — `authorizeModule`, Zod
  `.min(0).strict()`, `validateEntryItemsShape` nos dois escritores, estorno fechado sob inversão
  — e **nenhum caminho de alcance demonstrado**; a régua interna sustentava o rebaixamento, já que
  `AUD-DB-T31-01`, da mesma classe, é MEDIUM. **O fundamento da decisão é de risco, não de
  mecanismo. Isto é divergência resolvida por autoridade humana registrada (Regra 20), não
  consenso técnico, e não deve ser apresentado como tal.** Precedente: contenção em aplicação, por
  mais camadas que tenha, **não rebaixa por si só** um finding de integridade contábil neste
  programa. **Item independente que sobrevive à decisão:** `PostEntryUseCase.ts:66-67` **ignora**
  em vez de **rejeitar** valor `<= 0`.
- **`D-R2` — `AUD-DB-04`, `-05`, `-06`, `-07`, `-08`: MEDIUM ratificado em lote**, com fundamento
  verificado finding a finding (`-05`, `-07`, `-08` com **zero menções** nas retificações —
  premissas intactas **por verificação, não por presunção**). **Fecha a pendência `T-16`.**
- **`D-R3` prejudicada**, por ser condicional à elevação que não ocorreu.

**Severidades fixadas pelo dono e intocadas:** `AUD-RH-VTHORISTA-01` CRITICAL ·
`AUD-EST-TRUNCCADEIA-01` HIGH · `AUD-PAT-DEPRECIACAO-01` MEDIUM · `AUD-ALOG-01/A` CRITICAL e
`/B` HIGH · `AUD-RH-COMISSAO-01` HIGH · `AUD-CTB-DEBCRED-01` HIGH · `AUD-DB-04`…`-09` MEDIUM ×6 ·
`T41-EST-F01` e `T41-RH-F02` **HIGH — mantidas por `T-48` e expressamente não alteradas por
`T-49`**.

**Pendência de severidade ABERTA com o dono, criada nesta revisão:**
**`AUD-RH-VALIDADENULA-01` — `PROPOSED`, HIGH recomendada, não fixada** (§4.5). É a única.

**Registro de método, em sentido inverso ao de `D-01`** (`APR-2026-043` D3): ao decidir qual item
do `BUSINESS_RULES` §12 prevalece, o dono **trocou a própria ideia anterior pela recomendação do
auditor**, declarando o motivo — *"mais simples e mais bem fundamentada que minha ideia anterior"*.
Registrado como **mudança de posição por argumento**, não como correção de erro.

---

## 15. Gap de produto documentado sem prazo — seis tabelas de RH

Redação vinculante e literal de `APR-2026-042` D3:

> **Estrutura de banco presente, sem uso de aplicação — decisão de produto pendente.**

`hr_job_vacancies` · `hr_candidates` · `hr_performance_reviews` · `hr_time_sheet_summaries` ·
`hr_payroll_import_batches` · `hr_payroll_import_items`.

**Sem prazo, por determinação expressa.** Este relatório está **proibido de atribuir prazo,
urgência ou recomendação de construir ou deprecar** — **e igualmente proibido de omitir**.
`T47-RH-F01` e `T47-RH-F02` permanecem **LOW e abertos**: adiar decisão de produto não fecha
finding (Regra 4). **Pendência distinta e ainda aberta** (`RES-T43-09`/`RES-T47-03`): a deprecação
formal de `hr_payroll_import_batches`, `hr_payroll_import_items` e `hr_time_sheet_summaries` **não
está registrada em artefato nenhum**, embora `hr_time_import_*` seja o sucessor de fato declarado
no código.

---

## 16. O que este relatório NÃO afirma — lista fechada

1. `AUDIT_PASSED`, `FINDINGS_CONFIRMED`, `RETEST_PASSED`, `FINDING CLOSED`,
   `REMEDIATION COMPLETE`.
2. **`G3` integralmente cumprido.** O gate está **`REDUCED_BY_DECISION`** (`APR-2026-043` D1) —
   **reduzido por decisão humana registrada, não cumprido**. `F-5` **passou a existir** e satisfaz
   o passo 4 do `REG-G3`, mas a amostra dos 174 profundos **continua** não satisfazendo a condição
   (a) — ≈83 endpoints sem D4-D8 (`F-6`) — e **4 de 10 categorias de segurança seguem não
   varridas** em 19 módulos (`F-7`).
3. **`C-137` fechada** · **`C-136` tocada** · **`C-133` fechada** · **cobertura integral da banda
   dinheiro**.
4. **Regra 22 sem histórico de exceção** — houve **2**, por falha de despacho, fechadas por
   `T-48`.
5. **Categoria especial "fechada"** sem a ressalva de `RES-T47-02`.
6. Qualquer variante genérica de *"soft delete não existe"* (§13).
7. Que a decisão de `AUD-CTB-DEBCRED-01` tenha sido consenso técnico.
8. Que os MEDIUM e LOW deste corpus tenham sido validados — **não foram** (`RES-T46-02`).
9. Que as 22 tabelas sem model estejam "aceitas por exclusão" — estão **nomeadas**, e a decisão é
   do dono.
10. Que `T41-EST-F01` e `T41-RH-F02` estejam **liberados** à SanaCore — **não estão**, até o
    reteste adotar o critério de `T-49` (§6.4).
11. Que `AUD-RH-VALIDADENULA-01` seja HIGH — a severidade **não está fixada** (§4.5), e este
    relatório não a fixa nem a antecipa.
12. Que a divisão de `C-136` produza redução material do alvo — **produz 8,1 %** (§7.6).
13. Que a materialização de `T41-EST-F01` ou `T41-RH-F02` esteja medida — **não está** (§8.1).

---

## 17. Encerramento

- Nenhum arquivo do objeto auditado foi criado, alterado, corrigido ou refatorado (Regra 2).
- Nenhuma evidência histórica de outra organização foi alterada (Regra 15). `T-41`, `T-48`, `T-49`
  e `F-5` são citados e remetidos, **nunca editados**.
- Nenhum finding criado, fechado, reclassificado, absorvido ou descartado; nenhuma severidade e
  nenhuma confiança alteradas (Regras 4, 6, 18). O finding aberto nesta revisão o foi por **decisão
  do dono** (`APR-2026-044` D1) e é aqui **relatado**, não criado.
- Zero comando, zero execução, zero conexão de banco (`APR-2026-016` íntegra).
- **4 divergências desta emissão registradas** (`DIV-REP-01`, `-02`, `-03`, **`-04`**), duas delas
  contra o mandato, uma aritmética contra as próprias listas publicadas e uma aritmética contra o
  placar oficial. **3 divergências novas de `F-5`** reproduzidas (`DIV-F5-01`…`-03`).
- Única escrita: `audit/runs/ERP-LEGACY-001-AUD-001/40-report/`.

**Estado:** `484 VIGENTES (9C · 91H · 248M · 124L · 11I + 1 SEM SEVERIDADE FIXADA) · 502 IDs
EMITIDOS · 1 FALSE_POSITIVE · 17 ABSORVIDOS · ERRATA DA BASE APLICADA (HIGH 65/72/85/86/87) ·
REGRA 22 100/100 (2 EXCEÇÕES HISTÓRICAS FECHADAS POR T-48) · G3 REDUCED_BY_DECISION VIA G8
(APR-2026-043 D1) · F-5 PUBLICADA: 683/683 CLASSIFICADOS, 628 IN / 55 OUT, ZERO NÃO CLASSIFICADOS ·
CRITÉRIOS DE RETESTE REESCRITOS EM T-49 (12 + 9 ITENS, 13 ARMADILHAS) E OS DOIS FINDINGS NÃO
LIBERADOS · OBS-T48-02 RESOLVIDA (APR-2026-043 D3) · OBS-T48-05 = CONFIRMAÇÃO INDEPENDENTE DE
T43-SST-F01 · DYN-T41-03 E DYN-T49-03 NÃO AUTORIZADOS, JANELA FUTURA COM 4 CONDIÇÕES ·
C-137 A(79/207), DÉFICIT 128 INTEGRALMENTE NOMINAL (106+22) · CATEGORIA ESPECIAL art. 5º II:
18 TABELAS, CENSO FECHADO ENTRE AS 207, 1 CONDICIONALIDADE REBAIXADA (RES-T47-02) ·
NENHUM AUDIT_PASSED.`
