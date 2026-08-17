# RELATÓRIO TÉCNICO DE AUDITORIA — `ERP-LEGACY-001-AUD-001`

```
PROGRAMA:      ERP-LEGACY-001
RUN:           ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f   (única referência de leitura)
PRODUZIDO POR: vericore-audit-reporting-agent (VeriCore)
DATA:          2026-08-17
AUTORIZAÇÃO:   APR-2026-042 D4
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

---

## 1. Fontes autoritativas deste relatório

| # | Artefato | Papel |
|---|---|---|
| 1 | `07-findings/T-26_CONSOLIDACAO_RODADA5.md` | **Fonte do placar** (§1.5), errata da base (§1.1), fila (§3), cobertura (§4), bloqueantes (§5), Regra 22 (§6), grupos de causa raiz (§7), conformidades (§8), vinculações ao reporting (§9) |
| 2 | `07-findings/T-39_FILA_REMEDIACAO_EXPOSICAO.md` | Fila por exposição real, estratos 1-4, dependências `OR-20`…`OR-25` |
| 3 | `07-findings/T-38_CLASSIFICACAO_AMBIENTE_CORPUS.md` | Classificação de ambiente do corpus; os 9 CRITICAL um a um (§4.3); recortes MISTO (§4.4) |
| 4 | `24-coverage/AUDIT_COVERAGE_EXECUTED_RODADA4.md` | Cobertura executada, célula a célula; déficit do `G3` (`F-1`…`F-12`); estado de `N-04`…`N-08` |
| 5 | `coretriad/governance/RECONCILIACAO_FINAL_AUD-001.md` | Reconciliação ±2 por enumeração; determinação da errata (`c2`); estado de encerramento |
| 6 | `coretriad/governance/APPROVALS.md` — `APR-2026-024`, `APR-2026-031` a `APR-2026-042` | Decisões humanas vinculantes: severidades congeladas, escopo de `C-137`, categoria especial, denominador, liberação dos relatórios |
| 7 | `07-findings/T-48_VALIDACAO_T41.md` | Fechamento das 2 exceções da Regra 22; 5 observações colaterais |
| 8 | `07-findings/DYN-T47_COLETA_CONTEINERES.md` | Execução de `DYN-T47-01`/`-02`; veredito sobre `RES-T47-02` |
| 9 | `07-findings/T-41`, `T-42`, `T-43`, `T-45`, `T-47`; validações `T-40`, `T-44`, `T-46` | Emissão dos 37 IDs da última leva e vereditos adversariais |
| 10 | `02-plan/AUDIT_COVERAGE_MATRIX.md`, `AUDIT_PLAN_EMENDA_01/02.md` | Matriz prometida, contra a qual a cobertura executada é medida |
| 11 | `coretriad/governance/CELULAS_SEM_AUTORIZACAO_ACEITACAO.md` | Os 9 blocos sem decisão de aceitação, com custo medido |

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
> transcrita de leitura registrada em `T-48`, `T-43` ou `T-45`. É o mesmo limite que o
> `vericore-audit-consolidator` declarou (`T-26` R5 §11.2 item 1).

### 4.1 HIGH — 4, todos com veredito adversarial da Regra 22

| ID | Enunciado | Sev. | Confiança | Veredito | Regra/requisito | Âncoras |
|---|---|---|---|---|---|---|
| **`T41-EST-F01`** | Desativar um depósito **com saldo** é permitido pelo caminho normal, e o saldo sai da invariante sem virar movimento | HIGH | Mecanismo **ALTA**; materialização **MÉDIA** | **`CONFIRMED (parcial)`** — `T-48` §2 | `BUSINESS_RULES.md:351-354` — invariante de soma sobre **depósitos ativos** | Rota `inventory.ts:44` · validador `inventoryValidators.ts:57-61` · controller `inventoryController.ts:570-593` · use case `UpdateWarehouseUseCase.ts:38-58` (`:53` grava `active`) · model `Warehouse.ts:42-72` · banco `00_baseline_frozen.sql:14975-14983`, `:18527-18539` — **ausência de guarda verificada em seis camadas** |
| **`T41-RH-F02`** | O mesmo ASO existe em duas tabelas, com dois domínios grafados diferente, e o gate de retorno ao trabalho lê **a cópia** | HIGH | **ALTA** | **`CONFIRMED`** — `T-48` §3 | RF-RH-028, RF-RH-048; integridade de dado de saúde (LGPD art. 5º II) | Gate `asoGate.ts:20-28` → `SequelizeEmployeeDocumentRepository.ts:43-54` · gravador livre `CreateEmployeeDocumentUseCase.ts:46-65` · enums divergentes `00_baseline_frozen.sql:765-769` (`apto_com_restricao`) × `:2300-2304` (`apto_com_restricoes`) · consumidores `ConcludeTerminationProcessUseCase.ts:71-74`, `ReturnFromAbsenceUseCase.ts:95-103` |
| **`T43-SST-F01`** | O ASO é gravado **fora** da transação que enfileira a obrigação eSocial; a interface do repositório declara o parâmetro de transação e a implementação o descarta | HIGH | Mecanismo elevado a **`CONFIRMED`**; frequência **MÉDIA** | **`CONFIRMED`** — `T-44` (5 refutações, nenhuma derrubou, duas ampliaram) | Obrigação acessória eSocial S-2220; atomicidade declarada no cabeçalho | `CreateAsoUseCase.ts:72-99` · `SequelizeAsoRepository.ts:70-72` (`createAso(data)` sem transação) · `AsoRepository.ts:30` (assinatura abstrata **prevê** a transação) |
| **`T45-SST-F01`** | O portão que exige evidência de recebimento de EPI verifica **o rótulo**, não o artefato: `evidencia_tipo='biometria'` com `evidencia_arquivo_url` NULL confirma a entrega, e a linha fica **imutável para sempre** | HIGH | Mecanismo elevado a **`CONFIRMED`**; frequência **MÉDIA** | **`CONFIRMED`** — `T-46` (6 refutações, nenhuma derrubou, uma agravou, uma corrigiu a moldura) | **BR-SST-002** / NR-6 (valor probatório da Ficha de EPI); LGPD art. 5º II (declaração falsa de tratamento de dado biométrico) | Portão `ConfirmEpiDeliveryUseCase.ts:62-64` · gravador `AttachEpiDeliveryEvidenceUseCase.ts:30-42` · único `CHECK` da tabela `00_baseline_frozen.sql:13222` · trigger de imutabilidade total `sst_lock_entrega_epi` `:2971-2988`, `:22240` · rotas `sst.ts:53-54` |

**Moldura vinculante de `T45-SST-F01`, acolhida de `T-46` §4.1 (`T-45` não foi alterado):** o eixo
do finding é o **pareamento rótulo × artefato** — o mecanismo é indiferente ao valor do enum e
vale para os três tipos —, com **biometria como agravante nominado**. A justificativa da confiança
MÉDIA de frequência foi **substituída**: o limitante não é a UI (que aceita `"n/a"` e `" "`), é a
ausência de evidência dinâmica (`DYN-T45-01`/`-02`, bloqueados por `APR-2026-016`).

**Teto de severidade de `T43-SST-F01`, registrado por `T-44` §4.3:** nenhum modo de falha
determinístico da 2ª escrita foi provado. *"Quem tentar subir isto a CRITICAL alegando falha
determinística estará errado."*

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

### 4.4 Não-duplicação — as seis verificações nominadas

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

**Limite herdado, inalterado:** a deduplicação da consolidação é **sintática, não semântica**.
`DUP-ABERTA-01` e `DUP-ABERTA-02` continuam abertas.

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
  (`CreateInventoryCountUseCase.ts:90-117` não verifica existência nem `active`;
  `ApproveInventoryCountUseCase.ts:89-96` usa `count.warehouse_id` direto) e transferência
  pendente aprovada depois da desativação (`ApproveWarehouseTransferUseCase.ts:59-61` executa por
  id gravado, sem revalidar). **Isso reduz a consequência ("saldo preso para sempre" → "saldo fora
  da invariante, recuperável por caminho não óbvio e não exposto na UI") e não toca o defeito
  central.** Devolvido ao auditor de origem para correção do texto — `T-41` **não foi alterado**
  (Regra 15).
- **H3** (a invariante existe como citada?) — **falhou**, e revelou `OBS-T48-02` (§10).
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
(`SequelizeEmployeeDocumentRepository.ts:50`), de modo que **um único `aso_retorno` sem validade
satisfaz todo retorno futuro do mesmo funcionário**.

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
| **`C-136`** — contrato de API por dimensão | **Nenhuma trilha tocou em 3 levas de fieldwork.** 683 endpoints × 11 dimensões ≈ 7.500 células; ≈50 lotes. **SEM DECISÃO** | **SIM** |
| **`C-137`** | **`A(79/207)`**, déficit 128 integralmente nominal | **SIM** |

### 7.2 Déficit do `G3`, medido item a item (`F-1`…`F-12`)

`F-1` (70 células dos 43 rasos) **extinto por entrega**, com 3 ressalvas registradas ·
`F-2` (`client/`) reduzido a ≈10 unidades + 31 leituras dirigidas · `F-3` (`C-137`) ·
`F-4` (`C-136`) **inalterado em 4 rodadas** · **`F-5` — lista nominal IN × OUT dos 174 profundos,
NÃO PUBLICADA em 5 rodadas; sem ela a amostra dos 174 não satisfaz a condição (a) do `G3`. É a
lacuna mais barata da run: 1 varredura** · `F-6` (≈83 endpoints em D4-D8) · `F-7` (4 de 10
categorias ASVS) · `F-8` (≈13 de `rh`) · `F-9` (≈6 de `sst`) · `F-10` (1 de `juridico`) ·
`F-11` (evidência dinâmica, ≈232 pedidos contra ~21 executados) · `F-12` (regra de negócio dos
rasos sem artefato normativo — **lacuna de fonte, não de cobertura**).

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
`CELULAS_SEM_AUTORIZACAO_ACEITACAO.md`). Elas **não** são, hoje, "exclusão aceita".

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
| **TOTAL da última leva** | **38** | **14** |

**Conformidades que a remediação NÃO pode destruir, nomeadas:** o `CHECK` de exatamente-um-dono de
`production_order_reservations` · o trigger `sst_lock_cat` (imutabilidade legal da CAT,
verificado) · o trigger `sst_lock_acidente` (12 colunas comparadas uma a uma, com
`IS NOT DISTINCT FROM` nas nullables) · `hr_termination_processes.payment_deadline`
**GENERATED ALWAYS** citando o CLT art. 477 §6º — a única coluna gerada da célula, e exatamente a
técnica que `T42-PCP-F02` pede · a guarda de CI `no-orphan-pt-schema-tables.test.ts`
(**12 tabelas órfãs cercadas em duas camadas**) · `CreateEpiDeliveryUseCase` com **lista branca
explícita de 8 campos** (zero mass assignment) · `errorHandler.ts:84-89` mapeando violação de FK
para **400, não 500** · `00_baseline_frozen.sql:5932`, a minimização deliberada de dado clínico na
cópia de RH.

**Regra de método fixada por três trilhas consecutivas, vinculante para o restante do programa:**
*achado que dependa da forma exata de um literal é confirmado por **leitura do arquivo**, nunca por
saída de `Grep`* (`T-43` §4.1, `T-45` §4.2, `T-47` §8.3 — nesta última, um grep de linha única
**perdeu 4 das 7 tabelas pós-freeze** e quase virou omissão).

**Autocrítica medida dos auditores (`OBS-T26-36`):** a última leva reportou **5 erros contra si
própria** — `T-42` §10.1 (erro a favor do auditor), `T-43` §6.1 (subestimou os controles do
produto), `T-43` §6.3 (subestimou a própria categoria), `T-45` §6.2 (afirmou impossibilidade
falsa), `T-47` §8.3 (grep que quase virou omissão) — **e 1 contra a premissa de uma decisão do
dono** (`T-45` §6.1). É a evidência mais forte de que a contagem publicada não é seletiva.

---

## 10. Observações colaterais com efeito sobre a remediação

Registradas como **observações**, não convertidas em finding — não é autoridade do validador
(`T-48` §4). Devolvidas ao auditor de origem e ao director.

| ID | Observação | Evidência | Efeito |
|---|---|---|---|
| **`OBS-T48-01`** | **Transferência aprovada não revalida `active` de origem nem de destino.** Uma transferência `pending` cujo destino foi desativado no intervalo **credita saldo em depósito inativo**; a soma sobre ativos cai sem contrapartida em `products.quantity` — **sem que ninguém desative depósito com saldo** | `CreateWarehouseTransferUseCase.ts:63-69` × `ApproveWarehouseTransferUseCase.ts:59-61` | Viola `BUSINESS_RULES.md` §12 item 4 (`docs/business/BUSINESS_RULES.md:360-364`). **Mesma invariante de `T41-EST-F01`, segundo mecanismo.** Se a remediação só tratar o `PUT`, este fica aberto |
| **`OBS-T48-02`** | **`BUSINESS_RULES.md` §12 se contradiz.** Item 2 (`:345-349`) define saldo total como soma de **todos** os depósitos; item 3 (`:351-354`), como soma dos **ativos**. Itens consecutivos, definições incompatíveis | `docs/business/BUSINESS_RULES.md:345-354` | **Regras 6 e 20. BLOQUEIA a remediação de `T41-EST-F01`** — sem fonte autoritativa fixada, a SanaCore escolheria a regra de negócio sozinha. **Exige decisão humana** |
| **`OBS-T48-03`** | **A aptidão do ASO vive em QUATRO tabelas, não duas** — `sst_asos.resultado`, `hr_employee_documents.aptitude_result`, `hr_admission_processes.aso_result`, `hr_termination_processes.aso_result`, nenhuma com FK para `sst_asos`. Pior: `hr_termination_processes.aso_result` é **gravado** (`ConfirmTerminationAsoResultUseCase.ts:35`) e **não é lido pelo gate da própria demissão** | `00_baseline_frozen.sql:669-672`, `:765-769`, `:839-842`, `:2300-2304`; `ConcludeAdmissionProcessUseCase.ts:119` | Amplia `T41-RH-F02` de 2 para 4 tabelas e **muda o desenho da correção** |
| **`OBS-T48-04`** | **`valid_until NULL` = validade infinita no gate de ASO**, e o gate não amarra o documento ao afastamento. Um `aso_retorno` sem validade satisfaz **todos** os retornos futuros do funcionário | `SequelizeEmployeeDocumentRepository.ts:43-54` (`:50`); `HrEmployeeDocument.ts:27`; `ReturnFromAbsenceUseCase.ts:95-103` | Torna o gate de RF-RH-048 satisfazível uma única vez para sempre. **Candidato a finding próprio** — adjudicação do director |
| **`OBS-T48-05`** | **`CreateAsoUseCase` grava o ASO FORA da transação** que criou; falha no `create` do evento faz rollback do evento e **o ASO permanece**, sem `S-2220` enfileirado | `CreateAsoUseCase.ts:72-99`; `SequelizeAsoRepository.ts:70-72`; `AsoRepository.ts:30` | Obrigação acessória eSocial perdida em silêncio. Convergente com `T43-SST-F01` |
| **`OBS-T26-40`** | **A suíte de testes existente codifica o comportamento defeituoso** — `server/tests/unit/sst-epi.test.ts:116-130`. **Suíte verde não é evidência de ausência de defeito** quando nenhum teste prova a invariante em questão | `T-46` §3.3 | O teste precisa ser atualizado **no mesmo commit** da remediação de `T45-SST-F01` |

---

## 11. Divergências registradas (Regra 20) — não acomodadas

### 11.1 Divergências desta emissão de relatório

| ID | Divergência | Tratamento |
|---|---|---|
| **`DIV-REP-01`** | `T-26` R5 §5.1 `BLQ-3` afirma que a coleta `DYN-T47-01`/`-02` **não foi executada**; o artefato `DYN-T47_COLETA_CONTEINERES.md` prova que **foi** | **Artefato vence (Regra 7).** Registrado; `RES-T47-02` permanece aberta, com a condicionalidade **rebaixada** (§8) |
| **`DIV-REP-02`** | O mandato desta emissão declara `CASE-004` itens A e B **remediados, `RETEST_REQUIRED`**. O único artefato de `CASE-004` legível na árvore auditável é o `TRIAGE_REPORT.md`, que encerra **autorizando o início do Estágio 1** | **Registrado, não suprido.** O estado é relatado como **declarado, não confirmado por artefato acessível**; o pacote de evidência vive em `sana/ERP-LEGACY-001/CASE-004`, branch não mesclada. **Reforça a exigência de reteste independente da VeriCore** (Regra 4) |
| **`DIV-REP-03`** | Soma nominal das listas de exclusão com model = **108** × déficit medido com model = **106** (§7.4) | **Registrado, não conciliado.** Uma causa identificada (`sst_acidente_testemunhas`, `T-43` §6.6); a segunda não. Escalado ao director |

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

1. **Nenhuma âncora `arquivo:linha` dos 501 IDs foi reverificada por este agente.** Nenhum arquivo
   de `server/`, `client/`, `docs/`, `product/`, `mobile/` ou `tv/` foi aberto na produção deste
   relatório. **Se uma âncora está errada na origem, este documento repete o erro.**
2. **A auditoria é predominantemente estática.** `APR-2026-016` proíbe tocar `erp_evok_audio`. Fila
   dinâmica: **≈232 pedidos catalogados, ~21 executados**. Sete deles **mudam classe de
   severidade** se respondidos: `DYN-T41-03` (**HIGH → CRITICAL**), `DYN-T43-02`, `DYN-T43-04`,
   `DYN-T42-01`, `DYN-T45-01`, `DYN-T45-04`, `DYN-T45-08`.
3. **`00_baseline_frozen.sql` está exatamente 9 migrations atrasado** (`RES-T42-04`/`RES-T47-06`).
   Para toda tabela criada após `20260810-000038`, *"não achei no baseline"* **não é evidência de
   ausência**. Regenerar exigiria tocar banco, o que `APR-2026-016` proíbe. Ver `DIV-R5-05`.
4. **O renderizador de `Grep` deforma literais de rota** — propriedade conhecida do instrumento,
   observada em **3 trilhas consecutivas**, que teria produzido em dois casos um CRITICAL
   espetacular e **falso**.
5. **Deduplicação sintática, não semântica.** `DUP-ABERTA-01` e `DUP-ABERTA-02` seguem abertas.
6. **A enumeração integral do estrato 4 (81 IDs) não foi entregue** (`T5-02`): há **26 nominais** e
   **55 por ponteiro**. O obstáculo aritmético do ±2 deixou de existir com a errata; o que falta é
   **trabalho de listagem**. **Declaração, não omissão** — e é o limite do backlog (§13).
7. **A classificação de ambiente dos 37 IDs novos não existe** e não é inferida (Regra 6).
   `T41-RH-F02` e `T43-RH-F04` são **candidatos nominais a produção real** no recorte
   desligamento — se confirmado, `T41-RH-F02` **sobe ao estrato 2**. Escalado como extensão de
   `P-T39-01`.
8. **`git diff c1311a6..HEAD` nunca foi reconfirmado** em nenhuma trilha da última leva;
   `LIM-T37-01` segue aberto; `RES-T46-01` registra que a própria validação leu a árvore de
   trabalho, não um checkout de `c1311a6f`.
9. **Adjudicações pendentes desde a Rodada 1** (`OBS-T26-06`/`T5-05`): `T16-F15`, `T21-F01`
   (`ListProductsUseCase`/`ProductController` que **nenhuma trilha leu**, com pedido da própria
   `T-21` de reavaliação para HIGH se confirmado), `RES-T13-04`, `RES-T13-05`, `T29-MOB-F03`,
   `T32-FST-F04`. **Findings encaminhados e nunca adjudicados não entram neste relatório como
   fechados.**

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

**Nenhuma pendência de severidade permanece aberta com o dono.** Severidades fixadas pelo dono e
intocadas: `AUD-RH-VTHORISTA-01` CRITICAL · `AUD-EST-TRUNCCADEIA-01` HIGH ·
`AUD-PAT-DEPRECIACAO-01` MEDIUM · `AUD-ALOG-01/A` CRITICAL e `/B` HIGH · `AUD-RH-COMISSAO-01`
HIGH · `AUD-CTB-DEBCRED-01` HIGH · `AUD-DB-04`…`-09` MEDIUM ×6.

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
2. **`G3` integralmente cumprido** — `F-5` não existe; a amostra dos 174 não satisfaz a condição
   (a); 4 de 10 categorias de segurança não varridas em 19 módulos.
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

---

## 17. Encerramento

- Nenhum arquivo do objeto auditado foi criado, alterado, corrigido ou refatorado (Regra 2).
- Nenhuma evidência histórica de outra organização foi alterada (Regra 15).
- Nenhum finding criado, fechado, reclassificado, absorvido ou descartado; nenhuma severidade e
  nenhuma confiança alteradas (Regras 4, 6, 18).
- Zero comando, zero execução, zero conexão de banco (`APR-2026-016` íntegra).
- **3 divergências novas registradas** (`DIV-REP-01`, `-02`, `-03`), duas delas contra o mandato
  desta emissão e uma aritmética contra as próprias listas publicadas.
- Única escrita: `audit/runs/ERP-LEGACY-001-AUD-001/40-report/`.

**Estado:** `483 VIGENTES (9C · 91H · 248M · 124L · 11I) · 501 IDs EMITIDOS · 1 FALSE_POSITIVE ·
17 ABSORVIDOS · ERRATA DA BASE APLICADA (HIGH 65/72/85/86/87) · REGRA 22 100/100 (2 EXCEÇÕES
HISTÓRICAS FECHADAS POR T-48) · C-137 A(79/207), DÉFICIT 128 INTEGRALMENTE NOMINAL (106+22) ·
CATEGORIA ESPECIAL art. 5º II: 18 TABELAS, CENSO FECHADO ENTRE AS 207, 1 CONDICIONALIDADE
REBAIXADA (RES-T47-02) · 4 BLOQUEANTES DE ENCERRAMENTO · NENHUM AUDIT_PASSED.`
