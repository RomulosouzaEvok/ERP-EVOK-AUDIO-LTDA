# T-49 — Critérios de reteste reescritos de `T41-EST-F01` e `T41-RH-F02`

| Campo | Valor |
|---|---|
| Run | `ERP-LEGACY-001-AUD-001` |
| Trilha | `T-49` (reescrita de critério; objeto: `T-41_C137_SEMANTICA_COLUNA_LOTE3.md` §5) |
| `AUDIT_COMMIT` | `c1311a6f76b512fef893f7e60d934179cae3409f` |
| Organização | VeriCore — `vericore-database-auditor` (autor de origem de `T-41`) |
| Natureza | **100% estática**. Nenhuma conexão a `erp_evok_audio` (`APR-2026-016` íntegra). Nenhum `SELECT`, nenhum DDL/DML. |
| Método | READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT |
| Autoridade | `coretriad/governance/APPROVALS.md` `APR-2026-043` **D4** (devolução à trilha de origem) e **D3** (regra declarada) |
| Insumo | `T-48_VALIDACAO_T41.md` (`OBS-T48-01` a `-05`, `RES-T48-01` a `-05`) |
| Artefatos de origem | `T-41` e `T-48` **não alterados** (Regra 15). Este documento vive **ao lado** e remete a ambos. |

> **Nota de persistência.** Agente titular sem `Write` nesta sessão. Persistido pelo orquestrador **sem alteração**. O juízo é integralmente da trilha.

> **Remissão explícita (Regra 15).** O critério de `T41-EST-F01` publicado em `T-41_C137_SEMANTICA_COLUNA_LOTE3.md:153` e o de `T41-RH-F02` em `:180` **permanecem inalterados** como registro histórico. A partir desta trilha, o critério **operativo** — sem o qual não haverá `RETEST_PASSED` — é o deste documento. `T-41` §5 deve ser lido **sempre** com esta remissão anexa.

> **Nota de método (armadilha deste run).** O renderizador de `Grep` já deformou literais em trilhas anteriores. **Todo** literal load-bearing foi confirmado por `Read` de arquivo, com faixa de linhas citada (§2). `grep` foi usado apenas para **localizar** candidatos.

---

## 1. Por que este documento existe

`APR-2026-043` D4, verbatim:

> *"Aprovo devolver os dois à trilha de origem para reescrever antes de remediação. Fechamento falso custa mais depois do que corrigir agora."*

O `T-48` confirmou os dois como `CONFIRMED`/HIGH **e** demonstrou que os critérios que escrevi em `T-41` §5 são **subdimensionados**. Um reteste sobre critério estreito **passaria** e fecharia o finding **sem fechar o defeito** — e, fechado, a VeriCore não poderia reabri-lo sem delta audit (Regra 14). O custo do erro é assimétrico e recai inteiro no futuro.

**O que este documento faz:** reescreve os dois critérios, item a item, dizendo **o que se verifica**, **onde** e **o que reprova**; separa estático de dinâmico; e declara **o que mudou e por quê**, com a evidência que motivou cada ampliação.

**O que NÃO faz:** não altera severidade (os dois seguem **HIGH**, fixados); não declara `FINDING CLOSED`, `RETEST_PASSED` nem `AUDIT_PASSED`; não corrige o objeto auditado (Regra 2); não altera `T-41`/`T-48` (Regra 15); não inventa regra de negócio (Regra 6 — a regra veio de `APR-2026-043` D3).

---

## 2. Confirmações literais desta trilha — o que eu li, não o que supus

| # | Artefato e faixa lida | Literal confirmado |
|---|---|---|
| L01 | `UpdateWarehouseUseCase.ts:1-61` (inteiro) | Único `throw` é `NotFoundError` (`:41`); `:53` `if (input.active !== undefined) updates.active = input.active;`; `:55` `await warehouse.update(updates);`. **Nenhuma leitura de saldo.** |
| L02 | `server/src/services/warehouseStockService.ts:1-187` (inteiro) | `getWarehouseByCode` filtra `active: true` (`:86`), lança `NotFoundError` (`:91`). `addToWarehouse` (`:111-130`) e `removeFromWarehouse` (`:147-185`) recebem `warehouseId: number` e **não leem `Warehouse.active`**. `findOrCreateLocked` (`:49-71`) **cria** a linha de saldo se não existir, com `LOCK.UPDATE`. |
| L03 | `ApproveWarehouseTransferUseCase.ts:1-95` (inteiro) | `:59` `removeFromWarehouse(..., transfer.from_warehouse_id, ...)`; `:61` `addToWarehouse(..., transfer.to_warehouse_id, ...)`. Guardas: `NotFoundError` (`:47`) e `status !== 'pending'` (`:49-53`). **Nenhuma revalidação de `active`.** |
| L04 | `CreateWarehouseTransferUseCase.ts:1-81` (inteiro) | `:63-64` resolve origem/destino por `getWarehouseByCode` (**exige ativo**); `:68-69` grava os **ids**; nasce `status: 'pending'` (`:73`). |
| L05 | `CreateInventoryCountUseCase.ts:1-128` | `assigned_to` validado como usuário **existente e ativo** (`:95-107`). `warehouse_id` **não** é validado — nenhuma chamada a repositório de depósito no `execute`. |
| L06 | `ApproveInventoryCountUseCase.ts:60-115` | `:63-72` recusa `!count.warehouse_id`; `:89` `InventoryService.adjust(..., count.warehouse_id)`; `:93`/`:95` `addToWarehouse`/`removeFromWarehouse`. **Nenhuma checagem de `active`.** |
| L07 | `00_baseline_frozen.sql:14975-14997` | `warehouses` completa: `active boolean DEFAULT true NOT NULL` (`:14980`). `COMMENT ON COLUMN` para `code` (`:14990`) e `name` (`:14997`) — **nenhum para `active`**. |
| L08 | `00_baseline_frozen.sql:10516-10531`, `:18450-18451`, `:20707`, `:20714`, `:25104`, `:25112` | `product_warehouse_stock`: `CHECK (quantity >= 0)` (`:10523`), `UNIQUE (product_id, warehouse_id)`, índices por `product_id` e `warehouse_id`, FK para `warehouses` **`ON DELETE RESTRICT`**. |
| L09 | `00_baseline_frozen.sql:24132-24136` | **`inventory_counts_warehouse_id_fkey` EXISTE** — `FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON UPDATE CASCADE ON DELETE RESTRICT`. |
| L10 | `server/migrations/20260804-000001-create-warehouses.cjs:1-256` (inteiro) | `active` criada em `:149-153` **sem `comment`**, enquanto `code` (`:138`) e `name` (`:143`) têm. `up` condicional (`:44-47`). |
| L11 | `00_baseline_frozen_meta.sql:58` | `20260804-000001-create-warehouses.cjs` **está** na lista congelada. |
| L12 | `20260731-000001-baseline-schema.cjs:1-70` | Banco novo recebe DDL do dump e as migrations da lista são **marcadas como aplicadas sem executar** (`:25-32`); banco existente não reexecuta o `up` (`:46-52`). |
| L13 | `server/tests/unit/warehouse-crud.test.ts:97-154` | O teste `'edita name/description/active de um deposito existente'` (`:136`) **afirma que `active: false` é aceito** (`:142`, `:148`, `:149-153`), com mock **sem `ProductWarehouseStock`** (`:120-124`). |
| L14 | `docs/business/BUSINESS_RULES.md:336-393` | Item 2 (`:345-349`) "todos os depósitos"; item 3 (`:351-354`) "todo depósito **ativo**"; item 4 (`:360-364`); item 8 (`:388-393`) transferência nasce `pending` e só efetiva na aprovação. |
| L15 | Censo de chamadores das primitivas (localização por `grep`, **cada sítio confirmado por `Read`**) | 7 sítios, 9 linhas — §3.3. **Exatamente 2** operam sobre id armazenado sem revalidação. |
| L16 | `SequelizeProductRepository.ts:96-110` | `getWarehouseStockSummary` lista **só depósitos ativos** (`:98`) e mapeia os saldos sobre eles — saldo em depósito inativo **não aparece** no resumo do produto. |
| L17 | `server/src/modules/rh/domain/services/asoGate.ts:1-31` (inteiro) | `hasValidAso` chama **exclusivamente** `findValidAso` (`:26`). Cabeçalho (`:6-7`): *"Nunca chama o módulo SST em tempo real"*. |
| L18 | `SequelizeEmployeeDocumentRepository.ts:43-54` | Filtra `aptitude_result IN ('apto','apto_com_restricao')` (`:49`) e `[Op.or]: [{ valid_until: null }, { valid_until: { [Op.gte]: today } }]` (`:50`) — **`NULL` é válido**. |
| L19 | `ConcludeAdmissionProcessUseCase.ts:100-134` | `:119` decide por `process.aso_result`, **não** por `hasValidAso`; `:111-118` documenta o porquê; `:125` `if (process.aso_valid_until && ...)` — **validade nula também passa**. |
| L20 | `ConcludeTerminationProcessUseCase.ts:60-89` | `:71` `hasValidAso(..., 'aso_demissional')`. **Não lê `process.aso_result`.** |
| L21 | `ConfirmTerminationAsoResultUseCase.ts:1-40` (inteiro) | `:35` grava `{ aso_result, aso_confirmed_at }`; domínio local (`:16`) usa `'apto_com_restricao'`. |
| L22 | `ReturnFromAbsenceUseCase.ts:85-104` | `:95-96` `requiresReturnAso(...)` → `hasValidAso(..., 'aso_retorno', ...)`; `:98-102` `RETURN_ASO_REQUIRED`. **Não amarra o documento ao afastamento.** |
| L23 | `CreateEmployeeDocumentUseCase.ts:1-69` (inteiro) | `FITNESS_RESULTS` local (`:20`); `:61` `valid_until: input.valid_until ?? null` — **nunca obrigatória**, inclusive para `aso_*`; `:63` `origin: input.origin ?? 'rh'` — declarado pelo chamador. |
| L24 | `server/src/models/HrEmployeeDocument.ts:1-37` (inteiro) | `valid_until: DataTypes.DATEONLY` (`:27`); `aptitude_result` com `'apto_com_restricao'` (`:28`); **sem `hooks`**. |
| L25 | `00_baseline_frozen.sql:5914-5932` | `valid_until date` nullable (`:5919`); `employee_id integer NOT NULL` (`:5916`); `COMMENT` de minimização LGPD (`:5932`). |
| L26 | `00_baseline_frozen.sql:669-673`, `:765-769`, `:839-843`, `:2300-2304` | Quatro ENUMs: admissão, documentos e demissão com **`'apto_com_restricao'`**; `enum_sst_asos_resultado` com **`'apto_com_restricoes'`**. **3 grafias contra 1.** |
| L27 | `00_baseline_frozen_meta.sql:163`, `:165` | `20260808-000015-create-hr-admission-processes.cjs` e `20260808-000017-create-hr-employee-documents.cjs` **estão** na lista congelada. |

---

## 3. `T41-EST-F01` — critério de reteste reescrito

**Severidade: HIGH (fixada). Estado: `CONFIRMED (parcial)` por `T-48`.**

### 3.1 O critério original, verbatim

`T-41:153`:

> *"**Critério de reteste objetivo (estático):** recusa explícita (`BusinessRuleError`) em `UpdateWarehouseUseCase` à transição `active: true → false` quando houver `product_warehouse_stock.quantity <> 0` para o depósito, **com teste que reprove a regressão**; e `comment` em `warehouses.active`, **na migration**, declarando o efeito sobre a invariante §12 item 3."*

Cobre **um** vetor de quatro, e é satisfazível por duas remediações que **não fecham o defeito** (§3.5, A1 e A2).

### 3.2 Regra de negócio aplicável — declarada, não deduzida

`APR-2026-043` D3 fixou: `saldo_total(produto) = Σ saldo(produto, depósito) para todo depósito ATIVO`. O item 2 de §12 (`:345-349`, L14) é **redação a corrigir**, não regra concorrente. Consequência para o critério: qualquer implementação que some sobre *todos* os depósitos reprova (`CR-T49-EST-11`). Não há mais bloqueio de Regra 6 sobre este finding.

### 3.3 Censo de vetores — fechado sobre as primitivas de saldo (L15)

Toda alteração de `product_warehouse_stock` em `server/src/**` passa por `addToWarehouse`/`removeFromWarehouse` (nenhuma escrita direta no model fora do serviço; leituras em `SequelizeProductRepository.ts:99` e `SequelizeInventoryRepository.ts:175`). Chamadores:

| # | Chamador | Como obtém o depósito | Protegido? |
|---|---|---|---|
| 1 | `materialReceiptService.ts:159` | `warehouseId` de `ReceivePurchaseItemsUseCase.ts:138` e `ReceiveImportProcessUseCase.ts:149`, **ambos** via `getWarehouseByCode` | **Sim** |
| 2 | `saleStockService.ts:175`, `:265` | `getWarehouseByCode('ACABADOS')` — `:146`, `:238` | **Sim** |
| 3 | `CreateAcousticTestUseCase.ts:168` | `getWarehouseByCode(LABORATORY_WAREHOUSE_CODE)` — `:167` | **Sim** |
| 4 | `ChangeProductionOrderStatusUseCase.ts:449`, `:473` | `getWarehouseByCode('INSUMOS'/'ACABADOS')` — `:402-403` | **Sim** |
| 5 | `CreateInventoryMovementUseCase.ts:104`, `:119` | `getWarehouseByCode(warehouse_code \|\| 'INSUMOS')` — `:97` | **Sim** |
| 6 | **`ApproveInventoryCountUseCase.ts:93`, `:95`** | `count.warehouse_id` (id armazenado) | **NÃO** |
| 7 | **`ApproveWarehouseTransferUseCase.ts:59`, `:61`** | `transfer.from_/to_warehouse_id` (ids armazenados) | **NÃO** |

**É isto que torna o critério novo defensável:** não é lista de suspeitas, é o conjunto **fechado** dos pontos de escrita no `AUDIT_COMMIT`, com exatamente dois descobertos — que são exatamente V3 e V4. Limite: fechado sobre `server/src/**` (`RES-T49-01`).

| Vetor | Descrição | Evidência | Em `T-41`? |
|---|---|---|---|
| **V1** | Desativação sem guarda de saldo | L01, L07; `T-48` §2.1 H1 (seis camadas) | Coberto |
| **V2** | Primitivas não filtram `active`; o saldo **não** fica preso | L02, L05, L06 | **Refutava meu item 3** |
| **V3** | Contagem de inventário sobre depósito inativo | L05, L06, L09 | Não coberto |
| **V4** | Transferência `pending` aprovada após desativação (débito **e crédito**) | L03, L04; `OBS-T48-01` | Não coberto |

### 3.4 O que mudou, e por quê

| Mudança | Origem da ampliação (evidência, não zelo) |
|---|---|
| De 1 para **4 vetores** + 12 itens | Censo L15 fechou o espaço de escrita e provou V3 e V4 alcançáveis pelo caminho normal |
| Revalidação de `active` **na efetivação** | L03 × L04: solicitação resolve por *code* e grava *id*; aprovação executa por *id*. §12 item 8 (L14) garante janela temporal real |
| Guarda no **crédito**, não só no débito | `OBS-T48-01`: crédito em inativo quebra a invariante **sem ninguém desativar depósito com saldo** — basta desativar um depósito **vazio** com transferência `pending` apontando para ele |
| Tratamento explícito da **contagem** | L05: o mesmo arquivo valida `assigned_to` como *ativo* (`:95-107`) e não aplica a disciplina ao depósito. A **existência** já é imposta pelo banco (L09) — falta só `active` |
| **Decisão declarada** sobre as primitivas, em vez de exigir recusa | V2: recusar fecha o **único caminho de reversão existente** (Caminho A). Exigir recusa sem reversão seria impor desenho e criar dano novo |
| Migration **nova** (não edição da existente) | L10+L11+L12: `20260804-000001` está na lista congelada e é marcada como aplicada; editá-la é **inerte**. Meu critério dizia só *"na migration"* — literalmente satisfazível por alteração sem efeito |
| **Substituição** do teste de CRUD | L13: o teste vigente **afirma** que desativar é permitido, com mock sem saldo — continuaria **verde** após a guarda, gerando garantia falsa |
| Tratamento do **estoque preexistente** | L16: saldo em inativo **não aparece** no resumo por depósito. A guarda protege o futuro; o passivo fica invisível e sem correção pela UI |

**Erro meu, na direção que me desfavorece:** o item 3 de `T41-EST-F01` (`T-41:147-149`) — *"não pode ser transferido para fora"* e *"sem caminho de reversão"* — está **factualmente errado**. A premissa oculta era que todo consumo passa por `getWarehouseByCode`; L02 prova que não. Confirmo a refutação de `T-48` §2.1 H2 por leitura própria. Isso **reduz a consequência** e **não toca** o defeito central. `T-41` não foi alterado.

**Precisão que devolvo ao `T-48`:** `T-48` §2.1 (Caminho A, item 1) diz que `CreateInventoryCountUseCase` *"não verifica existência nem `active`"*. A **existência** é imposta pelo **banco** — `inventory_counts_warehouse_id_fkey` (L09) rejeita `warehouse_id` inexistente no `INSERT`. A aplicação de fato não verifica, mas o dado não passa. Falta **apenas** `active`. Não altera V3; impede que a remediação persiga o alvo errado.

### 3.5 Armadilhas de fechamento falso

| ID | Armadilha | Por que passaria pelo critério antigo |
|---|---|---|
| **A1** | `comment` em `20260804-000001-create-warehouses.cjs:149-153` | Satisfaz *"comment na migration"* e **nenhum banco** o recebe (L10-L12) |
| **A2** | Guarda adicionada e `warehouse-crud.test.ts:136-154` mantido | Continua verde porque o mock não tem saldo (L13) |
| **A3** | Guarda lendo `products.quantity` | Fonte errada: é o total do MRP, não o saldo daquele depósito |
| **A4** | Guarda apenas no Zod (`inventoryValidators.ts:57-61`) | Não alcança outros chamadores e não é regra de domínio |
| **A5** | Filtro `active` acrescentado em `add/removeFromWarehouse` "de uma vez" | Fecha o Caminho A sem reversão e colide com `T35-DIN-F06` (`T-41` §11.4) |

### 3.6 Critério de reteste — **estático**

> Reprovação em qualquer item impede `RETEST_PASSED`. Não há item opcional; há um **condicional** (`CR-T49-EST-06`).

**`CR-T49-EST-01` — Guarda na transição `true → false`** *(V1)*
- **Verifica:** recusa explícita (`BusinessRuleError`, 422) quando houver saldo ≠ 0 em `product_warehouse_stock` para o depósito.
- **Onde:** `UpdateWarehouseUseCase.execute` ou serviço de domínio por ele invocado.
- **Reprova se:** viver só no Zod (A4); ler `products.quantity` (A3); depender de flag do cliente (`force`) sem `PERM` própria e registro; ou existir só na UI.
- **Precisão:** `quantity > 0` é aceitável **enquanto** existir o `CHECK ck_product_warehouse_stock_quantity_non_negative` (L08), sob o qual `<> 0 ≡ > 0`. Se o `CHECK` cair no mesmo lote, a guarda precisa ser `<> 0`.

**`CR-T49-EST-02` — A guarda vale pelo caminho HTTP real**
- **Verifica:** teste que exercite `PUT /api/inventory/warehouses/:id` com saldo ≠ 0 esperando 422, e com saldo = 0 esperando sucesso.
- **Reprova se:** só houver unitário com repositório mockado sem saldo; ou faltar o caso "saldo = 0 → permitido" (guarda que recusa sempre também é defeito).

**`CR-T49-EST-03` — O teste vigente deixa de afirmar o comportamento defeituoso** *(A2)*
- **Verifica:** `warehouse-crud.test.ts:136-154` substituído por dois casos (com saldo → recusa; sem saldo → sucesso), com duplo capaz de responder saldo.
- **Reprova se:** o caso continuar asserindo `active: false` aceito sem saldo modelado — **mesmo que passe**.

**`CR-T49-EST-04` — Revalidação de `active` na efetivação da transferência, origem **e** destino** *(V4, `OBS-T48-01`)*
- **Onde:** `ApproveWarehouseTransferUseCase.ts`, entre `:53` e `:59`, dentro de `input.transaction`.
- **Reprova se:** revalidar só a origem (o **crédito** é o vetor que quebra a invariante sem ninguém desativar depósito com saldo); revalidar por `code` em vez de `id` (L04 `:68-69`); ler `warehouses` fora da transação que detém o lock; ou não haver teste de "destino desativado entre solicitação e aprovação".

**`CR-T49-EST-05` — Depósito da contagem validado na criação **e** na aprovação** *(V3)*
- **Onde:** `CreateInventoryCountUseCase.execute` (mesma disciplina de `assigned_to`, L05 `:95-107`) **e** `ApproveInventoryCountUseCase` junto do bloco `:63-72`.
- **Reprova se:** existir só na criação (reproduz a janela temporal de V4); a mensagem tratar como "depósito não encontrado" ignorando que a existência já é imposta pela FK (L09); ou viver só no schema Zod.

**`CR-T49-EST-06` — Decisão declarada sobre as primitivas** *(V2 — condicional)*
- **Verifica:** decisão **escrita** sobre `addToWarehouse`/`removeFromWarehouse` (L02) passarem ou não a recusar depósito inativo, no JSDoc do serviço **e** em `BUSINESS_RULES.md` §12.
- **Reprova se:** (a) passarem a recusar **sem** caminho explícito de reversão no mesmo lote (`CR-T49-EST-09`); (b) permanecerem permissivas **sem declaração** — caso em que `-04` e `-05` viram a única defesa e passam a exigir teste em **cada** um dos 7 sítios do censo; (c) a decisão for tomada sem registro.

**`CR-T49-EST-07` — Semântica da coluna chega ao banco **e** ao model**
- **Verifica:** `COMMENT ON COLUMN public.warehouses.active` declarando a coluna como **operando da invariante** §12 item 3, **e** `comment:` correspondente em `Warehouse.ts:63-67`.
- **Onde:** migration **nova**, ausente de `00_baseline_frozen_meta.sql`; e o model.
- **Reprova se:** o comment for para `20260804-000001` (A1); só no model (vetor de `AUD-DB-T31-03`); ou só no DDL (vetor de `T41-META-F03`). Este finding exige **os dois** — por isso o item é único.

**`CR-T49-EST-08` — Teste de invariante com depósito inativo**
- **Verifica:** `warehouse-invariants.test.ts` ganha invariante nova: após tentativa de crédito/débito envolvendo inativo, `products.quantity` = Σ `product_warehouse_stock` **sobre ativos**.
- **Reprova se:** somar sobre todos os depósitos (implementaria o item 2, contra D3); ou cobrir só o `PUT` e não os dois pontos de efetivação.

**`CR-T49-EST-09` — Passivo preexistente tem caminho declarado** *(condicionado a `DYN-T41-01`)*
- **Verifica:** decisão registrada sobre saldo **já** existente em depósito inativo — reconciliação, reversão, ou aceitação formal com dimensão declarada.
- **Reprova se:** a remediação só impedir casos futuros e o passivo ficar sem menção — L16 prova que ele é **invisível** no resumo por depósito. Zero linhas em `DYN-T41-01` satisfaz o item **pelo registro do resultado**.

**`CR-T49-EST-10` — Nenhuma regressão sobre o filtro correto**
- **Verifica:** `getWarehouseByCode` (L02 `:84-95`) **mantém** `active: true`.
- **Reprova se:** o filtro for removido "para uniformizar" — `T-41` §11.4: aqui o filtro **sobra em um lugar e falta nos outros**.

**`CR-T49-EST-11` — A implementação segue o item 3, não o item 2**
- **Verifica:** toda soma de "saldo total" tocada pela remediação restringe a ativos (D3), e a redação de `BUSINESS_RULES.md:345-349` é corrigida.
- **Reprova se:** a contradição permanecer no artefato oficial — a guarda citaria norma ambígua.

**`CR-T49-EST-12` — Camada de banco: cobertura declarada**
- **Verifica:** se não houver imposição no banco (trigger/constraint), isso está **declarado** como lacuna, com motivo.
- **Reprova se:** o caso afirmar integridade "garantida" sem qualificar que é de aplicação. Registro de auditor de banco: as constraints de L08 impedem saldo negativo, par duplicado e exclusão de depósito com saldo — **nenhuma** alcança `active = false`; um `CHECK` não expressa regra inter-tabela. **O critério não exige trigger** — exige escolha explícita.

### 3.7 Evidência dinâmica — registrada, **não executada** (`APR-2026-016`)

Mantidos `DYN-T41-01` e `-02`. Acrescentados:

| ID | Pergunta | Para que serve |
|---|---|---|
| `DYN-T49-01` | Há `warehouse_transfers` `pending` com origem **ou destino** hoje inativo? | Cada linha é quebra de invariante **agendada** para a próxima aprovação (V4) |
| `DYN-T49-02` | Há `inventory_counts` não finalizadas apontando para depósito inativo? | Mesma lógica para V3 |
| `DYN-T49-03` | Há `inventory_movements` cujo `warehouse_id` esteja hoje inativo? | **Único** que separa risco latente de dano consumado |
| `DYN-T49-04` | Quantos depósitos inativos existem, e há algum com linha em `product_warehouse_stock`? | Dimensiona `CR-T49-EST-09`; dá o denominador de `DYN-T41-01` |

---

## 4. `T41-RH-F02` — critério de reteste reescrito

**Severidade: HIGH (fixada). Estado: `CONFIRMED` por `T-48`.**

### 4.1 O critério original, verbatim

`T-41:180`:

> *"**Critério de reteste:** FK `hr_employee_documents.sst_aso_id` (ou fonte única com view de leitura para o gate), **e** domínio idêntico nos dois enums, **e** teste que reprove divergência entre `sst_asos.resultado` e o `aptitude_result` correspondente."*

Cobre **duas** tabelas. A aptidão vive em **quatro** (L26), e a decisão de **admissão** é tomada sobre uma tabela que o critério nem menciona.

### 4.2 Mapa real das quatro cópias

| Tabela / coluna | Quem grava | Quem lê para decidir | 3º valor |
|---|---|---|---|
| `sst_asos.resultado` | `CreateAsoUseCase` | **Ninguém decide** (só exibição informativa) | `'apto_com_restricoes'` (L26) |
| `hr_employee_documents.aptitude_result` | `CreateEmployeeDocumentUseCase.ts:62` (digitação livre, L23) | `hasValidAso` → **Demissão** (L20 `:71`) e **Retorno** (L22 `:95-96`) | `'apto_com_restricao'` |
| `hr_admission_processes.aso_result` | `ConfirmAdmissionAsoResultUseCase` | **Admissão** (L19 `:119`) — **fora do gate comum** | `'apto_com_restricao'` |
| `hr_termination_processes.aso_result` | `ConfirmTerminationAsoResultUseCase.ts:35` (L21) | **Ninguém** (L20 usa `hasValidAso`) | `'apto_com_restricao'` |

Duas patologias distintas que o critério antigo não separa: **cópia que decide sem vínculo** (admissão) e **cópia que ninguém lê** (demissão). Corrigir a grafia não toca nenhuma.

### 4.3 O que mudou, e por quê

| Mudança | Origem |
|---|---|
| De 2 para **4 tabelas** | L26 + `OBS-T48-03` |
| Tratamento explícito da **Admissão** | L19 `:119` + `:111-118`. Meu texto (`T-41:174`) dizia que o gate *"decide Admissão/Demissão e o retorno"* — **errado quanto à Admissão**, e o erro **amplia** o finding |
| Decisão sobre a **cópia órfã** de demissão | L21 × L20: gravada e nunca lida — armadilha de conciliação futura |
| **Ordem** (vínculo antes ou junto do domínio) | `T-48` §3.3 item 2: grafia unificada antes do vínculo é o pior estado intermediário |
| Migration **nova** para o vínculo | L27 — mesma armadilha A1 no lado RH |
| `valid_until NULL` **sai** do critério e vira candidato próprio | §5, com regra de fallback |
| Preservação explícita da minimização LGPD | L25 `:5932` — vincular e igualar domínio, **não** copiar laudo |

**Erro meu, registrado:** `T-41:174` afirma que o gate decide a Admissão. L19 prova que **não**. `T-41` não alterado; a correção vive aqui e é vinculante para o reteste.

### 4.4 Armadilhas de fechamento falso

| ID | Armadilha | Por quê |
|---|---|---|
| **B1** | FK só em `hr_employee_documents` | É literalmente o que meu critério pedia — e deixa a **admissão** decidindo sobre cópia solta |
| **B2** | Grafia unificada só em `rhEnums.ts`/models | Fonte única **por módulo** é o limite exato onde a divergência sobrevive; o banco continua com 4 domínios |
| **B3** | `ALTER TYPE ... RENAME VALUE` sem tratar dados/rótulos das 4 tabelas | Uniformiza o tipo e deixa linhas com rótulo antigo |
| **B4** | Teste de divergência só entre as duas tabelas originais | Passa verde sem cobrir admissão nem demissão |
| **B5** | Vínculo implementado copiando laudo da SST para RH | Destrói o controle de L25 `:5932` — troca um HIGH por problema de LGPD |

### 4.5 Critério de reteste — **estático**

**`CR-T49-RH-01` — Vínculo entre a decisão e o ASO de origem, nas quatro cópias**
- **Verifica:** cada cópia que **decide** ganha vínculo verificável com `sst_asos` (FK `sst_aso_id` ou fonte única com leitura derivada): `hr_employee_documents` (L17-L18) e `hr_admission_processes` (L19 `:119`), no DDL **e** no model.
- **Reprova se:** vínculo só em `hr_employee_documents` (B1); coluna sem FK (convenção não é vínculo); ou consumidor continuar decidindo pela cópia solta.

**`CR-T49-RH-02` — Domínio único nas quatro tabelas**
- **Verifica:** os quatro ENUMs (L26) com o mesmo conjunto de rótulos no DDL.
- **Reprova se:** unificação só em aplicação (B2); `RENAME VALUE` sem tratar dados preexistentes (B3); ou sobrar literal divergente em `SstAso.ts:44`, `CreateAsoUseCase.ts:28`, `HrEmployeeDocument.ts:28`, `CreateEmployeeDocumentUseCase.ts:20`, `ConfirmTerminationAsoResultUseCase.ts:16`, `rhEnums.ts:43`, `SequelizeEmployeeDocumentRepository.ts:49`.

**`CR-T49-RH-03` — Ordem da remediação**
- **Verifica:** vínculo (`-01`) **antes** ou **na mesma** migration do domínio (`-02`).
- **Reprova se:** houver estado intermediário com domínios iguais e vínculo ausente — **parece** conciliado e não é.

**`CR-T49-RH-04` — A Admissão passa a ser coberta**
- **Verifica:** `ConcludeAdmissionProcessUseCase.ts:119` decide sobre valor **vinculado** ao ASO da SST, respeitando a restrição real de `:111-118`.
- **Reprova se:** continuar decidindo por coluna sem vínculo; ou a "correção" forçar `HrEmployeeDocument` antes de o funcionário existir — quebraria `employee_id NOT NULL` (L25 `:5916`) e trocaria defeito por falha de execução.

**`CR-T49-RH-05` — A cópia órfã de demissão recebe destino declarado**
- **Verifica:** decisão explícita sobre `hr_termination_processes.aso_result` — o gate passa a lê-la, ou ela deixa de ser gravável, ou é declarada histórico com `COMMENT` dizendo que **não decide nada**.
- **Reprova se:** permanecer gravável e não lida sem declaração (mesma classe de `AUD-PAT-DEPRECIACAO-01`).

**`CR-T49-RH-06` — Teste que reprova divergência, nas rotas que decidem**
- **Verifica:** teste que falhe quando `sst_asos.resultado='inapto'` vigente coexistir com aptidão válida em qualquer cópia que decida — **admissão**, **demissão** e **retorno**.
- **Reprova se:** cobrir só o par original (B4); ou ser teste de módulo isolado — a divergência é consistente dentro de cada módulo e só aparece no cruzamento (`T-48` §3.1 H3).

**`CR-T49-RH-07` — Minimização de dado clínico preservada**
- **Verifica:** o `COMMENT` de L25 `:5932` continua verdadeiro — RH guarda **apenas** aptidão e validade.
- **Reprova se:** a remediação replicar campos clínicos (B5).

**`CR-T49-RH-08` — Semântica declarada nas quatro colunas (objeto de `C-137`)**
- **Verifica:** cada coluna de aptidão declara, no `COMMENT` e no model, **quem preenche, quem lê e se decide algo**.
- **Onde:** migration nova, fora de `00_baseline_frozen_meta.sql` (L27) + models.
- **Reprova se:** só `hr_employee_documents` for comentada; ou o comentário for para `20260808-000015`/`-000017` (A1 aplicada ao RH).

**`CR-T49-RH-09` — Validade nula (fallback, condicional)**
- **Condição:** aplica-se **apenas se** o diretor **não** abrir o finding próprio de §5; então torna-se bloqueante.
- **Verifica:** `valid_until: null` deixa de significar "válido para sempre" nos **dois** pontos: `SequelizeEmployeeDocumentRepository.ts:50` e `ConcludeAdmissionProcessUseCase.ts:125`.
- **Reprova se:** corrigir só um dos dois; ou corrigir a leitura sem tornar `valid_until` obrigatória para `aso_*` na escrita (L23 `:61`) — apenas moveria o buraco.

### 4.6 Evidência dinâmica — registrada, **não executada**

Mantidos `DYN-T41-03` (único capaz de mover a severidade para CRITICAL) e `-04`. Acrescentados:

| ID | Pergunta | Para que serve |
|---|---|---|
| `DYN-T49-05` | Quantas linhas `aso_*` de `hr_employee_documents` têm `valid_until IS NULL`? Quantos funcionários distintos? | Denominador do finding candidato (§5) |
| `DYN-T49-06` | Quantos `hr_admission_processes` concluídos têm `aso_valid_until IS NULL`? | Extensão do mesmo vetor à Admissão (L19 `:125`) — **descoberto nesta trilha**, não coberto por `OBS-T48-04` |
| `DYN-T49-07` | Há `hr_termination_processes` com `aso_result='inapto'` cujo processo foi **concluído**? | Custo real da cópia que ninguém lê (`CR-T49-RH-05`) |

---

## 5. Um vetor que merece finding próprio — argumentado

**Proposta:** `OBS-T48-04` (validade nula = validade infinita) **não** deve ser absorvido pelo critério de `T41-RH-F02`; deve ser finding próprio. Registro como **candidato**, `T49-RH-C01`, **não** aberto — abertura e despacho são do diretor.

**Por que não é o mesmo defeito** (o ônus é meu):

1. **Coluna e regra diferentes.** `T41-RH-F02` é sobre `aptitude_result` (resultado duplicado, sem vínculo, com domínio divergente). O candidato é sobre `valid_until` (vigência). Normas distintas: RF-RH-028 × RF-RH-048.
2. **Independência nos dois sentidos — o teste decisivo.** Executar **todo** `CR-T49-RH-01` a `-08` deixa o vetor **inteiramente aberto**: um `aso_retorno` com `valid_until NULL`, emitido pela própria SST e perfeitamente concordante, satisfaz **todo** retorno futuro (L18 `:50`, L22 `:95-96` — o gate não amarra o documento ao afastamento). Inversamente, corrigir a validade não reconcilia nada entre SST e RH.
3. **Alcança consumidor que o outro finding não alcança, pela mesma causa.** L19 `:125` mostra a mesma permissividade em `hr_admission_processes.aso_valid_until` — descoberta desta trilha, **não** coberta por `OBS-T48-04`. A causa raiz comum é "`NULL` tratado como afirmação positiva de validade" — padrão de semântica de coluna, matéria de `C-137`, não duplicação de entidade.
4. **Consequência de rastro.** Dentro de `T41-RH-F02`, o reteste fica refém de defeito alheio: ou não fecha por motivo estranho, ou fecha e leva o vetor junto, invisível.

**O que impede isto de virar inflação:** o vetor **compartilha o lote de remediação** (`T-48` §3.3 item 3 está certo). Proponho separar a **contabilidade**, não o trabalho.

**Fallback:** se o diretor não abrir `T49-RH-C01`, `CR-T49-RH-09` vira item bloqueante de `T41-RH-F02`. Em nenhuma hipótese o vetor fica sem critério.

**Dois vetores que decidi NÃO separar:**

- **`OBS-T48-01`** permanece dentro de `T41-EST-F01` (`CR-T49-EST-04`): mesma invariante, mesma coluna, mesma causa raiz. O censo §3.3 mostra V1/V3/V4 como três faces de um único buraco, e o teste da independência **falha** — remediar V1 sem V4 deixa a invariante quebrada. Nota à SanaCore: os itens são numerados e independentes, então viram tarefas separadas sem virar findings separados.
- **`OBS-T48-05`** (ASO gravado fora da transação; S-2220 perdido) **não** é vetor de nenhum dos dois e não entra em critério. Concordo com `T-48` §4: **encaminhar** ao diretor como candidato autônomo. Não o abro — não foi objeto desta devolução e não o verifiquei por leitura própria (`RES-T49-04`).

---

## 6. Resíduos

| ID | Resíduo |
|---|---|
| `RES-T49-01` | Censo de escrita fechado apenas sobre `server/src/**`; scripts, seeds e migrations de dados não varridos. Herda `RES-T48-03`. |
| `RES-T49-02` | Nenhum critério validado contra plano de remediação real. Se o desenho for "fonte única" em vez de FK, `CR-T49-RH-01` exige leitura de conformidade, não reescrita. |
| `RES-T49-03` | Camada cliente não auditada (UI de depósito, tela de documentos). Irrelevante para veredito; declarado por escopo. Herda `RES-T48-04`. |
| `RES-T49-04` | `OBS-T48-05` não reverificado por leitura própria nesta trilha. |
| `RES-T49-05` | Baseline usado como verdade estrutural, sem reler cada migration de origem de `hr_admission_processes`/`hr_termination_processes`. Herda `RES-T48-05`. |

---

## 7. Estado

- **`T41-EST-F01`** — **HIGH** (fixada, não alterada), `CONFIRMED (parcial)`. Critério reescrito: de 1 para **4 vetores**, **12 itens estáticos** (`CR-T49-EST-01` a `-12`, um condicional) e **4 pedidos dinâmicos novos**. Item 3 do texto original **confirmado como errado** por leitura própria; `T-41` não alterado.
- **`T41-RH-F02`** — **HIGH** (fixada, não alterada), `CONFIRMED`. Critério reescrito: de 2 para **4 tabelas**, **9 itens estáticos** (`CR-T49-RH-01` a `-09`, um de fallback) e **3 pedidos dinâmicos novos**. Elo "Admissão" **confirmado como impreciso**; a imprecisão **amplia** o finding.
- **`OBS-T48-02` resolvida** por `APR-2026-043` D3 — a regra está declarada e citada; Regra 6 preservada.
- **1 finding candidato** proposto e argumentado (`T49-RH-C01`) — **não aberto**, com fallback declarado.
- **2 vetores explicitamente não separados**, com argumento.
- **13 armadilhas de fechamento falso** nomeadas (`A1`-`A5`, `B1`-`B5`, mais as embutidas em `CR-T49-EST-06`, `-09`, `-12`).
- **5 resíduos** abertos.
- **Nenhum `FINDING CLOSED`. Nenhum `RETEST_PASSED`. Nenhum `AUDIT_PASSED`. Nenhuma severidade alterada. Nenhum artefato de outra organização alterado** (Regra 15).
- **Nada escrito fora de `audit/`.** **Banco `erp_evok_audio`: não acessado** — `APR-2026-016` íntegra.

---

### O que exige ação do diretor

1. **Decidir `T49-RH-C01`** (§5) — sem isso `CR-T49-RH-09` fica condicional e a SanaCore não sabe o escopo do reteste.
2. **Encaminhar `OBS-T48-05`** — não pertence a nenhum destes dois findings e morre com o run se ficar só na tabela de observações do `T-48`.
3. **`DYN-T41-03` e `DYN-T49-03`** são os dois pedidos dinâmicos de maior valor: o primeiro é o único que mudaria a classe de severidade; o segundo é o único que separa risco latente de dano consumado. Se houver autorização escopada, devem ser respondidos na mesma execução.
