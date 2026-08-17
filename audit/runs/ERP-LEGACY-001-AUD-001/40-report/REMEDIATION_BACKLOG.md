# REMEDIATION BACKLOG — `ERP-LEGACY-001-AUD-001`

```
PROGRAMA:      ERP-LEGACY-001
RUN:           ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f
PRODUZIDO POR: vericore-audit-reporting-agent (VeriCore)
DATA:          2026-08-17
AUTORIZAÇÃO:   APR-2026-042 D4
HANDOFF:       VeriCore -> SanaCore, VIA vericore-software-audit-director.
               A ordenação executiva final é do director (Regra 5). Este documento é INSUMO.
FONTES:        T-26_CONSOLIDACAO_RODADA5.md §3 e §9.3 · T-39_FILA_REMEDIACAO_EXPOSICAO.md ·
               T-38_CLASSIFICACAO_AMBIENTE_CORPUS.md · T-48_VALIDACAO_T41.md ·
               T-40 / T-44 / T-46 (validações) · APR-2026-031 a APR-2026-042
REGIME:        read-only sobre o objeto auditado. Zero comando, zero execução,
               zero conexão de banco (APR-2026-016 íntegra).
NÃO DECLARA:   AUDIT_PASSED · RETEST_PASSED · FINDING CLOSED · REMEDIATION COMPLETE.
               Nenhum finding é fechado por este documento (Regras 3, 4, 5).
```

---

## 1. Critério de admissão — o que entra e o que NÃO entra

### 1.1 Entra

**Somente findings `CONFIRMED`** — isto é, findings **CRITICAL e HIGH que passaram pelo
`vericore-finding-validator` com veredito adversarial registrado**, conforme a Regra 22 do
`CLAUDE.md`.

| Estrato | Critério | Contagem |
|---|---|---|
| **1** | CRITICAL · **produção real** | **4** |
| **2** | HIGH · **produção real** | **10** (+ itens-metadado e recortes MISTO) |
| **3** | CRITICAL · dev/homologação | **5** |
| **4** | HIGH · dev/homologação | **81** |
| **TOTAL ELEGÍVEL** | | **100** = 9 CRITICAL + 91 HIGH |

**Regra 22 no estado final: 100 sob o regime · 100 com veredito · 0 exceções.** As duas exceções
que existiram — `T41-EST-F01` e `T41-RH-F02`, sem despacho até a rodada 5 detectar — foram
fechadas por `T-48`, ambas `CONFIRMED`, HIGH mantida. **Ambas entram no backlog**, com a trava do
§5.1.

### 1.2 NÃO entra — e por quê

| Excluído | Quantidade | Motivo |
|---|---|---|
| **MEDIUM** | 248 | **Sem veredito de validação adversarial.** `RES-T46-02` declara por escrito que os MEDIUM e LOW **não devem ser lidos como validados por omissão**. A Regra 22 cobre CRITICAL/HIGH; **o silêncio sobre MEDIUM/LOW é escopo, não aval**. Permanecem `PROPOSED` |
| **LOW** | 124 | idem |
| **INFO** | 11 | idem |
| **`FALSE_POSITIVE`** | 1 (`T11-F10`) | Descartado com rastro; nunca entra em backlog |
| **`DUPLICATE` / absorvidos** | 17 | Cada um tem sobrevivente nomeado; o sobrevivente é que entra |
| **`AUD-PROC-CUSTODIA-01`** | 1 | **Achado de processo da auditoria**, não do objeto auditado. Não é item de remediação da SanaCore no produto. Segue pela classe de risco `RC-PROC-01` |
| **`T41-META-F09`** (grupo G-31) | 1 | Achado sobre a **aritmética da própria auditoria**, mesma natureza do anterior |
| **Adjudicações pendentes** — `T16-F15`, `T21-F01`, `RES-T13-04`, `RES-T13-05`, `T29-MOB-F03`, `T32-FST-F04` | 6 | **Encaminhados e nunca adjudicados** (`T5-05`, aberta desde a Rodada 1). **Não entram como confirmados nem como fechados** |
| **`OBS-T48-01`…`-05`, `OBS-T26-40`** | 6 | Observações colaterais, **não convertidas em finding** (não é autoridade do validador). Ver §6 — algumas têm efeito **vinculante** sobre a remediação |

**Nenhum item `PROPOSED` foi promovido por este documento** (Regra 6). Os 383 MEDIUM/LOW/INFO
permanecem rastreados no corpus e serão elegíveis **se e quando** receberem validação — decisão do
director, não deste agente.

---

## 2. ESTRATO 1 — CRITICAL · PRODUÇÃO REAL (4)

Ordem interna: insumo registrado, não ordem final. Casos em curso seguem a ordem do director.

| Pos. | ID | Objeto | Estado | Travas e notas de execução |
|---|---|---|---|---|
| **1** | **`AUD-ALOG-01/A`** | `DELETE /api/employees/:id` — desligamento sem trilha (`employeeController.ts:94-103`) | **`CASE-004` aberto** (`APR-2026-033`). Remediação **declarada**; **`RETEST_REQUIRED`** — reteste independente da VeriCore **pendente**. Ver `DIV-REP-02` no Relatório Técnico §11.1 | **`OR-20`** — instala o padrão `logAction` em `employees`, o que reduz o pré-requisito de `OR-14`. **Critério de reteste literal, já fixado no finding: o registro deve identificar USER e origem — gravar a ação sem o autor NÃO fecha.** `DYN-T03-07` espera **14 linhas**. `Employee` é PK INTEGER: sem colisão com `AUD-DB-04`. **Remediar no mesmo lote que `T33-A-F04`** (rota legada de desligamento, mesma superfície) |
| **2** | **`AUD-AUTHN-01`** | Chave JWT com default versionado (`docker-compose.yml:54`, `runtimeEnv.ts:73`, `:250`) | Aberto | **Dependência de causa-raiz: `T18-F02`** (`NODE_ENV` default `development`, compose/runtimeEnv). **Corrigir o sintoma sem a causa-raiz reabre o achado.** Recomendação de `T-22`: `T22-F02` (validação automatizada dos composes) como **pré-requisito do fechamento definitivo** de `T18-F02`/`T18-F03` — sem gate automatizado, a correção de valor não impede recorrência. **Prova dinâmica mais barata da run** (`DYN-T02-01`) |
| **3** | **`AUD-INTEG-03`** | Scan móvel move estoque fora de depósito, lote e quarentena | Aberto | **Cluster `C-31` com `T32-SUP-F03` (estrato 2): mesmo defeito de saldo fantasma que alimenta a netagem do MRP — UM item de remediação, conta uma vez.** A superfície irmã `RegisterProductMovementUseCase.ts:60-67` (`POST /api/products/movements`) tem o **mesmo** defeito e pertence a outro módulo — **entra no mesmo recorte ou o achado fica meio aberto**. `DYN-06.1` (teste de caracterização unit, **não exige banco**) é o item de menor custo e maior retorno da fila dinâmica |
| — | **`FIND-ERP-001`** | Idempotência — inventário + pagamento parcial | **Em remediação — `CASE-001`.** Caso em curso, não reordenado | **`APR-2026-023` Parte A: GATE HUMANO OBRIGATÓRIO ENTRE AS ETAPAS 2 E 3** da chave de idempotência. **Nenhum agente pode promover a etapa 3 sem nova aprovação humana registrada** — avançar produz interrupção da integração em produção. Chave de negócio inequívoca exigida (`BR-FIN-003`): valor da parcela + título **não** identifica |

---

## 3. ESTRATO 2 — HIGH · PRODUÇÃO REAL (10 contados + itens-metadado + recortes MISTO)

**Cabeça do estrato:**

1. **`AUD-ALOG-01/B`** — `PATCH /api/items/:id/inactivate` **e** `DELETE /api/items/:id` (mesmo
   handler mudo, `items.ts:20-21`), sobre o universo dos **327 insumos reais**.
   **`CASE-004`, Estágio 2. Estado: remediação declarada, `RETEST_REQUIRED`.**
   **`OR-21` resolvido por `APR-2026-034` D1 — Rota 2:** gravar `entityId` indefinido e
   identificar o item em `entityDescription`, com as quatro condições vinculantes da §5 do
   `TRIAGE_REPORT.md`. **É contorno declarado, não correção de causa-raiz**, e deve constar assim
   no `REMEDIATION_EVIDENCE_PACKAGE` e no reteste. **`AUD-DB-04` permanece MEDIUM e aberto.**
2. **`AUD-ALOG-01/C`** (`itemController.ts:205`), **`/F`** (`categoryController.ts:66`),
   **`/G`** (`departmentController.ts:65`) — itens-metadado do mesmo finding, elevados a produção
   real por `APR-2026-031` D-13 item 2. **Remediação e reteste no lote de `AUD-ALOG-01`.**
3. **Os 9 HIGH nominais de produção real** (`T-38` §4.3): `AUD-T01-01` · `AUD-T01-02` ·
   `AUD-AUTHN-02` · `AUD-AUTHN-03` · `AUD-DB-01` · `AUD-DB-02` · `AUD-DB-03` (**no recorte tier 1
   + trilha `auditLogs`**; a classe "desativação lógica" é de `AUD-ALOG-01` — **não somar as duas
   pelo mesmo conteúdo**) · `FIND-ERP-002` · `T33-A-F04`.
4. **`T32-SUP-F03`** — "estoque inicial" cria saldo sem movimento nem depósito. **Cluster `C-31`
   com `AUD-INTEG-03` — um item de remediação.**

**Recortes MISTO que herdam o estrato, no recorte necessário** (`T-38` §4.4): `AUD-SEC-T04-01`
(2 âncoras em módulos de produção) · `T-05-04` (lado `items` da escrita de status) · `T17-F03`
(rotas tier 1 + `auth`) · `T18-F02` (causa-raiz de `AUD-AUTHN-01`) · `T18-F03` (segredos, incl.
JWT) · `T19-F03` (ciclo `items ⇄ mrp`). O restante de cada trilha MISTO segue a fila dev.

> **Pendência que afeta este estrato (`P-T39-01` ampliado, `T5-03`):** a extração âncora a âncora
> dos **66** IDs `MISTO` não foi executada, e os **37 IDs novos não têm classificação de ambiente
> declarada** — não é inferida (Regra 6). **`T41-RH-F02` e `T43-RH-F04` são candidatos nominais a
> produção real** no recorte desligamento (`asoGate.ts:26`,
> `ConcludeTerminationProcessUseCase.ts:71`). **Se confirmado, `T41-RH-F02` sobe do estrato 4 para
> o estrato 2.** Decisão do director.

---

## 4. ESTRATO 3 — CRITICAL · DEV/HOMOLOGAÇÃO (5)

| ID | Objeto | Estado | Travas |
|---|---|---|---|
| **`FIND-ERP-005`** | Alçada de contrato jurídico — 4 falhas encadeadas | **`CASE-002`, `READY_FOR_RETEST` com 2 pendências humanas.** Caso em curso, não reordenado | Falhas 1 e 3 implementadas; alçada por **tabela configurável** (`APR-2026-022` D3), aditivo que eleva valor exige `approve` (D4), segregação D-K vale para aprovação de contrato (D5). **Pendência humana nº 1: a migration `jur_approval_thresholds` foi aplicada somente ao banco de teste; aplicá-la em produção é ato do dono, não de agente** |
| **`T08-F01`** | Fiscal — NF-e | Aberto | Sem atenuação de severidade por o módulo estar em não-produção hoje |
| **`T24-F01`** | Fiscal — integração/resiliência | Aberto | idem. Um dos dois CRITICAL cuja sustentação dinâmica depende da bateria 02 (`APR-2026-024`, pendência (c), **ABERTA**) |
| **`AUD-COM-DESCONTO-01`** | Desconto perdido no faturamento | Aberto | Severidade fixada pelo dono |
| **`AUD-RH-VTHORISTA-01`** | VT de horista e comissionado | **Integralmente destravado** por `APR-2026-032` | Caso `'horista'` **livre para seguir já**. Caso `'comissionado'`: a dependência de `AUD-RH-COMISSAO-01` (`OR-24`) está **satisfeita quanto ao cálculo** — `benefitRules.ts` trata comissionado como mensal —, mas **`AUD-RH-COMISSAO-01` permanece ABERTO**: a ratificação resolve o VT, **não cria o campo que falta**. **Cláusula de reavaliação automática: BLOQUEANTE se o payroll entrar em produção** |

---

## 5. ESTRATO 4 — HIGH · DEV/HOMOLOGAÇÃO (81)

**Base:** 91 HIGH − 10 de produção real = **81** (era 77 antes dos 4 HIGH novos; a correção
79 → 77 vem da errata do placar).

### 5.1 Os 4 HIGH novos — posição, veredito e travas

| ID | Veredito Regra 22 | Liberação | Travas vinculantes |
|---|---|---|---|
| **`T43-SST-F01`** — ASO gravado fora da transação que enfileira o S-2220 | `T-44` — **`CONFIRMED`**, HIGH mantida, confiança de mecanismo elevada a `CONFIRMED` | **LIBERADO. Cabeça recomendada dos 4** | Correção de **3 linhas, sem migration**, com a forma correta já usada por **8 dos 9** repositórios de SST. **`OR-26`: detecção/tratamento de duplicatas de `sst_asos` ANTES da migration de `UNIQUE (employee_id, tipo, data_realizacao)`** — a auditoria é estática e `APR-2026-016` proíbe consultar produção; **não é possível afirmar que não existem duplicatas preexistentes**, e a migration pode falhar no deploy. **Itens 5-7 de `T-44` §6 fazem parte do escopo**: desempate determinístico em `findLatestAsoByEmployee`; reconciliação `sst_asos` × `sst_eventos_esocial`; definição de `status_esocial_s2220`. **Fechar só os itens 1-3 deixa o ASO órfão sem tratamento e o gate de RH não determinístico.** **Teto de severidade registrado:** nenhum modo de falha determinístico foi provado — quem tentar elevar a CRITICAL alegando falha determinística estará errado |
| **`T45-SST-F01`** — portão de BR-SST-002 verifica o rótulo, não o artefato; linha fica imutável | `T-46` — **`CONFIRMED`**, HIGH mantida, confiança de mecanismo elevada a `CONFIRMED` | **LIBERADO** | **`OR-27`: a remediação NÃO pode parar na validação.** O dano das linhas já confirmadas é irreparável pelo par trava-total + estorno inexistente. **Ou `T45-SST-F02` entra no mesmo lote, ou o director decide converter `sst_lock_entrega_epi` em trava seletiva** nos moldes de `sst_lock_cat()` — **decisão humana, não da SanaCore** (Regras 6 e 18). **`server/tests/unit/sst-epi.test.ts:116-130` codifica hoje o comportamento defeituoso e precisa ser atualizado no MESMO commit.** Critério de reteste objetivo em `T-45` §3 |
| **`T41-EST-F01`** — desativar depósito com saldo remove a linha da invariante sem gerar movimento | **`T-48` — `CONFIRMED (parcial)`**, HIGH mantida (mecanismo ALTA / materialização MÉDIA) | **BLOQUEADO POR PENDÊNCIA HUMANA** — ver §6.1 | **`OR-28`: uma remediação que apenas adicione filtro de `active` NÃO resolve este finding.** O que falta é **guarda na transição `true → false`**. **O critério de reteste original de `T-41` é INSUFICIENTE** (`T-48` §2.3): exige guarda só em `UpdateWarehouseUseCase` e deixa **três** buracos — `addToWarehouse`/`removeFromWarehouse` continuam aceitando depósito inativo, `ApproveWarehouseTransferUseCase` continua executando sobre ids obsoletos, `CreateInventoryCountUseCase` continua criando contagem sobre depósito inativo. **`OBS-T48-01` entra no mesmo recorte.** Correção mínima coerente: (a) guarda na transição; (b) revalidação de `active` na **efetivação** da transferência, origem **e** destino; (c) decisão explícita e documentada sobre `add/removeFromWarehouse` recusarem depósito inativo — **recusar fecha o Caminho A, que é hoje a única reversão existente, e portanto exige criar reversão explícita antes**; (d) `comment` em `warehouses.active` |
| **`T41-RH-F02`** — ASO em duas tabelas com domínios divergentes; o gate de retorno lê a cópia | **`T-48` — `CONFIRMED`**, HIGH mantida, confiança ALTA | **LIBERADO**, com as travas ao lado | **`OR-29`: remediar no MESMO caso que `T43-META-F11`** — a divergência é **sistêmica: 3 enums de RH contra 1 de SST**. **O critério de reteste original cobre 2 tabelas; são 4** (`OBS-T48-03`): `hr_admission_processes.aso_result` **decide a admissão** e ficaria fora. **Ordem contraintuitiva e obrigatória: vínculo primeiro, domínio depois — ou os dois na mesma migration.** Unificar a grafia antes de criar o vínculo produz o pior resultado intermediário: **passa a parecer conciliável o que continua não sendo conciliado.** **`OBS-T48-04` (validade nula = validade infinita) entra no mesmo lote** — toca a mesma função e o mesmo gate. **PRESERVAR** a minimização de dado clínico de `00_baseline_frozen.sql:5932`: a correção é vincular e igualar domínio, **não** copiar conteúdo clínico da SST para RH. **`DYN-T41-03` é o pedido dinâmico de maior valor da leva: uma única linha de resultado eleva o finding de HIGH a CRITICAL** |

### 5.2 Os 22 nominais rastreados nas rodadas 2-4

- **Rodada 2 (`T-27`, 7):** `T27-JUR-F01` · `T27-JUR-F07` · `T27-RH-H01` · `T27-RH-H02` ·
  `T27-RH-H03` · `T27-SST-F01` · `T27-RFQ-01`.
- **Rodada 3 (12):** `T32-PROD-F02` · `T32-HRJUR-F01` · `T32-FST-F01` · **`T32-FST-F04`**
  *(veredito de autorização pendente — ver §1.2; não liberar antes da adjudicação)* ·
  `T32-SUP-F01` · `T32-SUP-F02` · `T33-A-F01` · `T33-A-F02` · `T33-B-F02` ·
  `AUD-RH-CPFSEARCH-01` *(dev por `D-13` item 4; `OR-20` reduz o pré-requisito de `OR-14`)* ·
  `AUD-TES-SALDOMANUAL-01` · **`AUD-CTB-DEBCRED-01`** *(HIGH mantida por `APR-2026-035` `D-01`,
  **posição definitiva**; item independente que sobrevive: `PostEntryUseCase.ts:66-67` **ignora**
  em vez de **rejeitar** valor `<= 0`, e tem prioridade própria)*.
- **Rodada 4 (1):** `AUD-EST-TRUNCCADEIA-01` — **`OR-22`: precisão antes ou junto da correção de
  unidade da carga, NUNCA unidade primeiro.** Corrigir unidade com `(10,2)` na cadeia converte
  risco latente em **perda ativa**. Cláusula de reavaliação automática.
- **Nova (1):** `AUD-RH-COMISSAO-01` — HIGH fixada (`D-11`), **veredito `CONFIRMED` dado por
  `T-40`**; **exceção da Regra 22 fechada**. Cláusula de reavaliação: **CRITICAL se o payroll
  entrar em produção**. Requisito de segurança fixado pelo dono (`APR-2026-032` §3): **o campo de
  percentual de comissão entra na deny-list de `employeeSensitiveFields.ts` no MESMO commit que
  criar a coluna — nunca depois**; `GET /api/employees` é aberto a qualquer autenticado e o padrão
  de vazamento já se repetiu.

### 5.3 Os 55 restantes — entrega por ponteiro, e o limite declarado

**A enumeração integral do estrato 4 não foi entregue** (`T5-02`). Base estabilizada em **81**:
**26 nominais** (22 de `T-39` §2.4a + os 4 de §5.1) **+ 55 por ponteiro**.

**O obstáculo aritmético do ±2 deixou de existir** com a errata do placar; o que resta é **trabalho
de listagem** contra as trilhas de origem da Rodada 1. **Isto é declaração, não omissão.**

**Entrega enquanto a listagem não sai:** a SanaCore recebe estes IDs pelos **lotes por grupo de
causa raiz `G-01`…`G-31`**, já particionados nas consolidações, que **não dependem** da
reconciliação ±2. Ponteiros: `T-26_CONSOLIDACAO.md` §1.3 (HIGH da Rodada 1 em módulos dev) e a
parte não-produção das trilhas MISTO.

**Consequência operacional, dita sem eufemismo:** **este backlog não pode ser declarado completo
em grão de item para o estrato 4** enquanto `T5-02` não for entregue. Ele é completo em **grão de
lote**.

---

## 6. TRAVAS DE LIBERAÇÃO — o que a SanaCore não pode descobrir na hora

### 6.1 Bloqueio por pendência humana — `OBS-T48-02`

> **`T41-EST-F01` NÃO PODE SER REMEDIADO** enquanto a contradição de `docs/business/BUSINESS_RULES.md`
> §12 não for decidida por humano.
>
> **Item 2** (`:345-349`): saldo total é a soma dos saldos em **todos** os depósitos.
> **Item 3** (`:351-354`): saldo total é a soma sobre os depósitos **ativos**.
> **Itens consecutivos, definições incompatíveis.**
>
> Sem fonte autoritativa fixada, **não há critério para dizer o que a guarda de desativação deve
> proteger**, e a SanaCore teria de **inventar a regra de negócio — o que a Regra 6 proíbe**.
> Decisão humana obrigatória, **antes** de qualquer item (a)-(d) do §5.1.

### 6.2 Dependências de ordem vigentes

`OR-01`…`OR-19` (Rodadas 1-3) e `OR-20`…`OR-25` (`T-39` §3) **permanecem vinculantes e
inalterados**. Lista normativa: tabela §5.3 da Rodada 4.

| # | Dependência | Efeito |
|---|---|---|
| `OR-20` | `AUD-ALOG-01/A` instala o padrão `logAction` em `employees` | Executar antes/junto do recorte `employees` de `AUD-DB-03` reduz o pré-requisito de `OR-14` |
| `OR-21` | `AUD-ALOG-01/B` ← `AUD-DB-04` no recorte `Item`/UUID | **Resolvido por `APR-2026-034` D1 — Rota 2, contorno documentado declaradamente.** `AUD-DB-04` **não** é fechado por isso |
| `OR-22` | `AUD-EST-TRUNCCADEIA-01` **antes ou junto** da correção de unidade da carga | Precisão primeiro, **nunca** unidade primeiro |
| `OR-23` | `AUD-ALOG-01/D` e `/E` corrigem também os READMEs que declaram a ausência de log como intencional (`suppliers/README.md:146-148`, `clients/README.md:165-167`) | Senão a guarda docs-drift acusa, ou o texto volta a legitimar a omissão |
| `OR-24` | Caso `'comissionado'` de `AUD-RH-VTHORISTA-01` ← `AUD-RH-COMISSAO-01` | **Satisfeito quanto ao cálculo** por `APR-2026-032`; o campo continua faltando |
| `OR-25` | `AUD-PAT-DEPRECIACAO-01` não inicia antes do **gate humano `D-12`** | **`D-12` ABERTA** — implementar depreciação × remover a coluna |
| **`OR-26`** | `T43-SST-F01`: detecção/tratamento de duplicatas de `sst_asos` **antes** da migration de `UNIQUE` | Precondição, não detalhe |
| **`OR-27`** | `T45-SST-F01` e `T45-SST-F02` no **mesmo lote** — ou decisão humana de trava seletiva | Sem isso a validação protege o futuro e deixa o dano existente irreparável |
| **`OR-28`** | `T41-EST-F01` **não** é atendido por filtro de `active` — exige recusa explícita na transição com saldo `<> 0` | `T-41` §7.7 prova que o módulo **sabe** proteger saldo (lock pessimista): a única transição desprotegida é a do flag |
| **`OR-29`** | `T41-RH-F02` + `T43-META-F11` no mesmo caso — domínio único de aptidão nas **4** tabelas | 3 enums de RH × 1 de SST |
| **`OR-30`** | `T42-SUP-F04` (índice único parcial em `item_suppliers`) **antes** de qualquer automação que consuma `findPreferredByItem` | De qual fornecedor comprar e a que preço depende de unicidade que o banco não impõe |
| `C-31` | `AUD-INTEG-03` + `T32-SUP-F03` | **Um item de remediação, conta uma vez** |

**Divergência de remissão registrada e não resolvida (`OBS-T39-02`):** a Rodada 4 §3.3 cita
"`OR-25`" para a dependência comissionado ↔ comissão, que a tabela §5.3 numera **`OR-24`**. **A
lista normativa é a tabela §5.3.**

### 6.3 Cláusulas de reavaliação automática — metadado obrigatório de cada lote

Sobem a **BLOQUEANTE sem novo despacho**: `AUD-RH-VTHORISTA-01` · `AUD-EST-TRUNCCADEIA-01` ·
`AUD-PAT-DEPRECIACAO-01` (dispara também no **primeiro leitor de `current_value`**) ·
`AUD-RH-COMISSAO-01` (payroll em produção → CRITICAL).

### 6.4 Instruções anti-dupla-contagem — vinculantes

1. **`AUD-ALOG-01` × `AUD-DB-03`:** a classe "desativação lógica" é de `AUD-ALOG-01`;
   `AUD-DB-03` cobre o recorte tier 1 + `auditLogs`. **Não remediar duas vezes o mesmo conteúdo,
   e não contar duas vezes.**
2. **`AUD-DB-09` não é elevado** porque as 3 falhas de escrita (`cost_centers`, `clients`,
   `suppliers`) **já têm titular** em `T35-DIN-F06` e a dimensão de trilha em `AUD-ALOG-01`.
3. **`T41-META-F03` × `AUD-DB-T31-03`:** vetores opostos. **A remediação de `AUD-DB-T31-03`
   precisa ser bidirecional**, senão resolve metade.
4. **`T41-EST-F01` × `T35-DIN-F06`:** opostos. **Filtro de `active` não resolve `T41-EST-F01`.**

### 6.5 Conformidades que a remediação NÃO pode destruir

`CHECK` de exatamente-um-dono de `production_order_reservations` · triggers `sst_lock_cat` e
`sst_lock_acidente` (imutabilidade legal da CAT) · `hr_termination_processes.payment_deadline`
**GENERATED ALWAYS** (CLT art. 477 §6º) · guarda de CI `no-orphan-pt-schema-tables.test.ts` ·
lista branca de 8 campos em `CreateEpiDeliveryUseCase` · `errorHandler.ts:84-89` (FK violation →
**400, não 500**) · `00_baseline_frozen.sql:5932` (minimização deliberada de dado clínico na cópia
de RH) · `jur_lgpd_data_subject_requests` (`CHECK` real de identidade verificada) ·
`hr_job_positions` (`CHECK` de faixa salarial, `:6092`).

---

## 7. Regras de execução da SanaCore — não negociáveis

1. **Worktree/branch próprio** por caso: `sana/ERP-LEGACY-001/<CASE>` (Regra 11).
2. **A SanaCore NUNCA fecha o próprio finding** (Regra 3). **Somente a VeriCore declara
   `RETEST_PASSED` e `FINDING CLOSED`** (Regra 4).
3. **Nenhuma conexão com o banco de produção real** (`APR-2026-016`). Reprodução e teste apenas em
   banco com sufixo `_test`/`_ci`. **Ausência de Docker ou `psql` NÃO é evidência de sucesso.**
4. **`REMEDIATION_COMPLETE` só pode ser declarado quando TODOS os elementos do respectivo
   `REMEDIATION_CASE` estiverem implementados e documentados.** Implementação parcial apresentada
   como finding resolvido é **vedada** (`APR-2026-021` Parte C).
5. Ciclo obrigatório: `REMEDIATION_CASE` → worktree → reprodução estática quando possível →
   `ROOT_CAUSE` → `BLAST_RADIUS` → `CORRECTION_STRATEGY` → implementação → testes disponíveis →
   testes de regressão criados → documentação afetada atualizada → `REMEDIATION_EVIDENCE_PACKAGE`
   → devolução à VeriCore.
6. **As remediações não entram nesta run e exigirão delta audit** (`APR-2026-023` Parte B, `G7`;
   Regra 14). Nenhum `RETEST_PASSED`/`FINDING CLOSED` sai desta auditoria.
7. **Nenhum agente inventa regra de negócio** (Regra 6). Onde a fonte normativa não existe, o item
   **para** e volta ao dono — ver §6.1 e §9.

---

## 8. Backlogs paralelos — não são fila de remediação de código

| Destino | Conteúdo |
|---|---|
| **Fila dinâmica (DYN) — ≈232 pedidos, ~21 executados** | Ordenar por **valor de decisão**, não por trilha. **Os 7 que mudam classe de severidade:** `DYN-T41-03` (**HIGH → CRITICAL**), `DYN-T43-02`, `DYN-T43-04`, `DYN-T42-01`, `DYN-T45-01`, `DYN-T45-04`, `DYN-T45-08`. **Executados nesta data:** `DYN-T47-01`/`-02` — resultado **não fecha** `RES-T47-02` (Relatório Técnico §8). **Pendências abertas de `APR-2026-024`:** (a) prova literal de escrita em `audit_logs`; (c) bateria dinâmica 02 com o servidor no ar (~70 verificações, incluindo as que sustentariam `AUD-AUTHN-01` e `T24-F01`) |
| **Backlog de cobertura** | Os **9 blocos** de `CELULAS_SEM_AUTORIZACAO_ACEITACAO.md`, com custo medido. **`B3-bis` (`F-5`) é a lacuna mais barata da run — 1 varredura — e está aberta há 5 rodadas.** `B8` (22 tabelas sem model) **já tem a nomeação entregue** e é decidível |
| **Backlog de produto — NÃO é auditoria** | As **6 tabelas de RH** (`APR-2026-042` D3): **"Estrutura de banco presente, sem uso de aplicação — decisão de produto pendente."** **Sem prazo, e vedado atribuir prazo, urgência ou recomendação de construir/deprecar.** Mais `D-02`…`D-06` (fonte normativa de regra de negócio) e a deprecação formal de `hr_payroll_import_*` / `hr_time_sheet_summaries`, **não registrada em artefato nenhum** |
| **Backlog de instrumento da auditoria** | Regeneração do `00_baseline_frozen.sql` (9 migrations atrasado); reconciliação `COMMENT ON COLUMN` × `comment:` como **censo**; `git diff c1311a6..HEAD` **nunca reconfirmado**; `AUD-PROC-CUSTODIA-01` e a classe `RC-PROC-01` (`CE-01`…`CE-09`, com `CE-06` **`EM IMPLEMENTAÇÃO`** — replicação fora do host pendente) |

---

## 9. O que BLOQUEIA a liberação de lotes deste backlog

| # | Bloqueio | Alcance |
|---|---|---|
| **1** | **`OBS-T48-02`** — contradição em `BUSINESS_RULES.md` §12 | **`T41-EST-F01`** (§6.1). Decisão humana obrigatória |
| **2** | **`D-12`** — depreciação × remoção da coluna | **`AUD-PAT-DEPRECIACAO-01`** por `OR-25` |
| **3** | **`D-02`…`D-06`** — fonte normativa de regra de negócio (preço > custo, `manutencao`/`garantia`, lado correto de `T33-B-F02`, candidatas a BR-ID, fórmula de rating de fornecedor) | Findings de `T-33` que decidem por código sem fonte autoritativa versionada. **Lacuna de fonte, não de cobertura** |
| **4** | **`DIV-SEV-01`** — `T17-F05` MEDIUM × `T23-F03` HIGH sobre o mesmo fato, **5ª rodada sem resolução** | O grupo **G-12** carrega HIGH **apenas para priorização**, declaradamente **não** como resolução de mérito. **A SanaCore não pode tratar essa severidade como mérito resolvido** |
| **5** | **Adjudicações de `T5-05`** — `T16-F15`, `T21-F01`, `RES-T13-04`/`-05`, `T29-MOB-F03`, `T32-FST-F04` | **`T32-FST-F04` está listado no estrato 4 e não deve ser liberado antes do veredito de autorização** |
| **6** | **`P-T39-01` ampliado (`T5-03`)** — ambiente dos 66 MISTO e dos 37 IDs novos | Bloqueia declarar a fila completa em **grão de item** e qualquer gate de release por exposição real |
| **7** | **`T5-02`** — enumeração integral do estrato 4 | Bloqueia entregar 55 dos 81 IDs em grão de item (§5.3) |
| **8** | **`APR-2026-023` Parte A** — gate humano entre as etapas 2 e 3 da chave de idempotência | **`FIND-ERP-001` / `CASE-001`**. Avançar sem aprovação humana registrada é violação de gate (Regra 18) e produz **interrupção da integração em produção** |

---

## 10. Critério de conclusão deste backlog — autoavaliação honesta

| Exigência | Estado |
|---|---|
| Contém **somente** findings `CONFIRMED` | **Sim.** Os 100 CRITICAL/HIGH sob o regime da Regra 22, todos com veredito adversarial registrado. Zero `PROPOSED`, zero `FALSE_POSITIVE` |
| Priorizado por severidade | **Sim**, com o critério de exposição real de `APR-2026-031` D-13 sobreposto nos estratos CRITICAL e HIGH, como o dono determinou |
| **Todos** os findings `CONFIRMED` aparecem | **Parcialmente, e declarado.** 45 de 100 nominais (4 + 10 + 5 + 26) e **55 por ponteiro de grupo**, por `T5-02` não entregue (§5.3). **Completo em grão de lote; não em grão de item no estrato 4** |
| Nenhuma severidade, confiança ou status alterado | **Sim** (Regras 15 e 18) |
| Nenhum finding fechado | **Sim** (Regras 3, 4, 5) |
| Travas de execução acompanham cada lote | **Sim** — `OR-01`…`OR-30`, cláusulas de reavaliação, anti-dupla-contagem, conformidades a preservar, bloqueios humanos |

---

## 11. Encerramento

- Nenhum arquivo do objeto auditado foi criado, alterado ou corrigido (Regra 2).
- Nenhum finding foi fechado, criado ou reclassificado; nenhuma severidade alterada
  (Regras 4, 6, 18).
- **`REMEDIATION COMPLETE` não é declarado e não pode ser inferido daqui** — é autoridade da
  SanaCore, e **o fechamento é da VeriCore**.
- **`CASE-004` itens A e B permanecem ABERTOS**, em `RETEST_REQUIRED`, aguardando reteste
  independente da VeriCore.
- Zero comando, zero execução, zero conexão de banco (`APR-2026-016` íntegra).

**Estado:** `BACKLOG EMITIDO · 100 FINDINGS CONFIRMED ELEGÍVEIS (9 CRITICAL + 91 HIGH) ·
45 NOMINAIS + 55 POR PONTEIRO DE GRUPO · 383 MEDIUM/LOW/INFO NÃO ELEGÍVEIS POR AUSÊNCIA DE
VALIDAÇÃO · 30 DEPENDÊNCIAS DE ORDEM VIGENTES · 8 BLOQUEIOS DE LIBERAÇÃO NOMINAIS ·
NENHUM FINDING FECHADO.`
