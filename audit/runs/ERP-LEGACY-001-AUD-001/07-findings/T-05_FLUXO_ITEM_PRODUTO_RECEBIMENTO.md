# T-05 — FLUXO ITEM ↔ PRODUTO ↔ RECEBIMENTO — RELATÓRIO DE TRILHA

```
AUDIT_ID:     ERP-LEGACY-001-AUD-001
TRILHA:       T-05 (W1, cross-tier 1/2/3, dona única do fluxo e da fronteira)
AUDIT_COMMIT: c1311a6f76b512fef893f7e60d934179cae3409f  (única referência de leitura)
AUTORIDADE:   APR-2026-023 Parte C (G11 opção c) · RA-08 (AUDIT_PLAN.md:140, :266)
REGIME:       APR-2026-016 — read-only reforçado. ZERO conexão de banco, ZERO execução.
ESTADO:       FIELDWORK CONCLUÍDO — 13 findings PROPOSED (6 HIGH, 5 MEDIUM, 2 LOW)
```

> **Nota de persistência (transparência de processo).** Conteúdo produzido pelo
> agente `vericore-service-layer-auditor` (trilha T-05) e persistido **sem
> alteração** pelo `coretriad-director`/orquestrador. O agente registrou que a
> persistência de evidência é mandato do `vericore-audit-evidence-controller`;
> aplica-se aqui o mesmo padrão de persistência-pelo-orquestrador já usado nos
> passos 23/24 e na validação dos findings preliminares. O juízo de auditoria
> permanece integralmente atribuído à trilha VeriCore; o orquestrador não
> alterou severidade, confiança, veredito nem texto.

---

## 1. Findings por severidade

Nenhum CRITICAL. Registro explícito de por que **não** promovi nada a CRITICAL:
os dois efeitos de maior dano (T-05-03, T-05-04) exigem ato deliberado do
operador (bloquear/inativar item) e o dano se materializa em dado que eu **não
posso inspecionar** (`APR-2026-016`). Declarar CRITICAL sem medir o blast radius
seria a promessa vazia que custou o `AUDIT_PASSED` do SIM-002. Os seis HIGH vão
ao `vericore-finding-validator` (Regra 22).

### HIGH — 6

**T-05-01 — A regra "criar produto garante item gêmeo" está declarada no
serviço, implementada, e NUNCA é chamada. Confiança: CONFIRMED.**

`server/src/services/itemProductMirrorService.ts:30-32` declara como regra do
serviço:
> `- Criar um **produto** garante o item gêmeo na MESMA transação (fecha a porta dos fixtures/telas legadas que criavam produto órfão).`

O método existe (`ensureItemMirrorForProduct`, `itemProductMirrorService.ts:121-140`)
e tem **zero call sites de produção em todo o repositório** — a única ocorrência
fora do próprio arquivo é o dublê `jest.mock` em
`server/tests/unit/items-use-cases.test.ts:16`. O caller que a regra descreve
declara literalmente o oposto:

`server/src/modules/products/application/use-cases/CreateProductUseCase.ts:34`
> `* services/itemProductMirrorService.ts) — esta porta NÃO cria item gêmeo.`

E `CreateProductUseCase.ts:39` afirma: *"Órfãos legados são fechados pelo
backfill (`ensureItemMirrorForProduct`)"* — **afirmação falsa**: o backfill
`server/src/scripts/backfill/02b_product_to_item.ts:139` faz `Item.create`
próprio e não referencia o serviço em nenhuma linha.

Efeito: `POST /api/products`
(`server/src/modules/products/presentation/routes/products.ts:21`) segue sendo
porta aberta de produto órfão; a aresta some da projeção que o MRP lê
(`server/src/services/bomStructureProjection.ts:61-66, 154-203`, saída
`unmapped`) — exatamente a falha que o serviço diz existir para fechar. **Regra
de negócio que vive só como comentário é a definição de regra não centralizada.**

---

**T-05-02 — O espelho falha para entrada legal: `items.codigo` varchar(80) →
`products.code` varchar(50). Confiança: CONFIRMED.**

Três larguras divergentes, provadas no schema congelado e no model:

| Origem (item) | Destino (produto) | Gap |
|---|---|---|
| `items.codigo varchar(80)` — `00_baseline_frozen.sql:7903` / `Item.ts:55` / `itemValidators.ts:9` (`max(80)`) | `products.code varchar(50)` — `00_baseline_frozen.sql:11200` / `Product.ts:61` | 30 |
| `items.descricao varchar(240)` — `:7904` / `itemValidators.ts:10` (`max(240)`) | `products.name varchar(200)` — `:11199` | 40 |
| `items.unidade varchar(12)` — `:7906` / `itemValidators.ts:12` (`max(12)`) | `products.unit varchar(10)` — `Product.ts:75` | 2 |

O mapeamento é direto e sem truncamento: `itemProductMirrorService.ts:98`
(`code: item.codigo`), `:99` (`name: item.descricao`), `:108`
(`unit: item.unidade || 'un'`). Como o espelho roda **dentro** da transação
(`CreateItemUseCase.ts:51`), um `codigo` de 51-80 caracteres — aceito pelo
validador — derruba `Product.create` e faz `rollback` da criação inteira
(`CreateItemUseCase.ts:55-58`), que rethrow cru vira 500 sem mensagem de
negócio. O item torna-se **incriável** por uma faixa inteira do domínio de
entrada que o próprio validador declara válida. `items` é PRODUÇÃO REAL (327
registros).

---

**T-05-03 — `BLOQUEADO` degrada silenciosamente para `active` no produto gêmeo.
Confiança: CONFIRMED.**

`items.status` é tri-estado `ENUM('ATIVO','INATIVO','BLOQUEADO')` (`Item.ts:72`;
`00_baseline_frozen.sql:7907`), aceito pelo validador em criação e atualização
(`itemValidators.ts:13, :39`). `products.status` é bi-estado
`ENUM('active','inactive')` (`Product.ts:69`; `:11208`). O mapeamento, nos
**dois** sentidos de escrita do serviço, é:

- `itemProductMirrorService.ts:110` — `status: item.status === 'INATIVO' ? 'inactive' : 'active'`
- `itemProductMirrorService.ts:168` — idêntico, na propagação de atualização

`BLOQUEADO` cai no ramo `else` e vira **`active`**. Um item bloqueado permanece
produto ativo: aparece na listagem (`SequelizeProductRepository.ts:26`,
`where.status = filters.status || 'active'`) e segue comprável/consumível/
vendável por todos os fluxos que operam por `product_id`. O bloqueio
administrativo do Item Mestre **não tem efeito nenhum** sobre o catálogo
transacional. Nenhuma BR do `BR_CATALOG.md` decide o que `BLOQUEADO` deve
significar do lado `products`.

---

**T-05-04 — A inativação do item não passa pelo serviço: mesma regra, dois
lugares, dois comportamentos. Confiança: CONFIRMED.**

Existem dois caminhos que escrevem `items.status`:

| Caminho | Propaga ao gêmeo? | Transação? |
|---|---|---|
| `PATCH /api/items/:id` → `UpdateItemUseCase.ts:57` | **SIM** (`syncProductMirrorFromItem`) | sim (`:54`) |
| `PATCH /api/items/:id/inactivate` **e** `DELETE /api/items/:id` → `DeactivateItemUseCase.ts:75` | **NÃO** — `this.itemRepository.update(input.itemId, { status: 'INATIVO' })`, sem nenhuma chamada ao serviço | **nenhuma** |

Ambas as rotas apontam para o mesmo controller (`items.ts:20` e `:21` →
`itemController.inactivate`). Resultado: pela rota dedicada de inativação — a
rota que o usuário naturalmente usa para inativar — o item fica `INATIVO` e o
produto gêmeo permanece `active` indefinidamente. Pela rota genérica de update,
o mesmo efeito de negócio propaga corretamente. É duplicação de regra entre
serviço e use case com divergência de resultado — o alvo direto do meu mandato.

Agravante de coerência: `DeactivateItemUseCase.ts:139-144` resolve o gêmeo por
`Product.findAll({ where: { code: item.codigo } })` para **checar vínculos** —
ou seja, o use case conhece o crosswalk, usa-o para ler, e não o usa para
escrever.

---

**T-05-05 — BR-CAD-009 (invariante central) é sustentada por um teste-fantasma.
Confiança: CONFIRMED. Veredito: o teste NÃO existe.**

Detalhado em §3. Nenhum teste — unit, integração ou caracterização — exercita o
espelhamento real. O único que o tocaria o substitui por dublê.

---

**T-05-06 (RA-08) — As regras do `fixedAssetReceiptService.ts` não têm NENHUMA
BR no `BR_CATALOG.md`. Confiança: CONFIRMED.**

Detalhado em §2. Seis regras de negócio extraídas, zero mapeadas em 165 regras
catalogadas. Por RA-08 (`AUDIT_PLAN.md:140`), **ausência de BR é finding, não
silêncio**.

### MEDIUM — 5

**T-05-07 — A regra do crosswalk item↔produto está implementada em 4 lugares
independentes, com divergências.**

| # | Implementação | Local |
|---|---|---|
| 1 | `TIPO_TO_PRODUCT_TYPE` + `mapProductTypeToItemTipo` | `itemProductMirrorService.ts:58-64, :73-77` |
| 2 | `mapProductTypeToItemTipo` + `mapProductStatusToItemStatus` próprios | `server/src/scripts/backfill/02b_product_to_item.ts:139-156` |
| 3 | `resolveTipo` → produz `productType` **e** `itemTipo` no mesmo passo | `server/src/modules/spreadsheetImport/application/validation/validarPlanilhaCadastro.ts:289, :386, :404-408` |
| 4 | crosswalk por `codigo` recomputado à mão | `fixedAssetReceiptService.ts:62`; `DeactivateItemUseCase.ts:139-142` |

O próprio serviço admite a cópia (`itemProductMirrorService.ts:40-42`:
*"mantido aqui em espelho para o serviço não depender de código de script"*).
Divergências já visíveis entre (1) e (2): o backfill grava
`lote_minimo: product.min_quantity` (`02b:150`) enquanto o serviço grava
`lote_minimo: 0` (`itemProductMirrorService.ts:134`); o backfill cria
`ItemDetalheComercial`, que declara **"obrigatório 1:1"** (`02b:158-174`), e o
serviço não cria. O caminho de importação em massa — o que carregou os 327
insumos reais — grava `items` e `products` pelo seu próprio repositório
(`SequelizeCatalogImportRepository.ts:96, :104, :109, :117`) sem tocar o serviço.

**T-05-08 — Numeração de plaqueta por contagem, sob constraint UNIQUE, acoplada
à transação de estoque+financeiro.**

`fixedAssetReceiptService.ts:68` conta
(`Asset.count({ where: { purchase_item_id } })`) e `:72` deriva
`tag: AT-${line.purchaseItemId}-${existingCount + unit}`. `assets.tag` é
`UNIQUE NOT NULL` (`Asset.ts:43`). Contagem não é sequência: se um ativo dessa
linha for excluído (`DELETE /api/assets/:id`, `assets.ts:22`) e houver
recebimento parcial posterior, a numeração **reinicia sobre tag existente** →
violação de unicidade. Como a chamada está na mesma transação do recebimento
(`ReceivePurchaseItemsUseCase.ts:229-234`), o erro derruba junto o estoque, a
quarentena, o lote, o custo e a conta a pagar daquela entrega. A atomicidade
aqui está corretamente implementada — e é justamente por isso que um defeito de
numeração patrimonial vira indisponibilidade de recebimento. Prova sob
concorrência exige execução: **DYN-T05-01**.

**T-05-09 — `compras:operate` cria registros patrimoniais sem nenhuma permissão
de `patrimonio`.**

`POST /api/purchases/:id/receive` exige `compras`. O módulo `assets` protege sua
própria porta de escrita com `authorizeModule('patrimonio','operate')`
(`assets.ts:20`) e a exclusão com `approve` (`:22`). O recebimento cria linhas
em `assets` (`fixedAssetReceiptService.ts:71-83`) sem qualquer verificação de
`patrimonio`. Não há decisão registrada autorizando esse efeito cruzado.
**Adjudicação de authZ é de T-04** — encaminho como insumo dirigido, não
adjudico.

**T-05-10 — O espelho grava em `products` sem audit log; a porta direta grava
com.**

`productController.ts:4` importa `logAction` de `auditLogService` e registra as
escritas diretas. O `products` criado/atualizado pelo espelho
(`itemProductMirrorService.ts:97, :162`) não gera nenhuma entrada. Registro
adicional, fora do meu escopo mas encontrado no fluxo e não silenciado: **o
módulo `items` inteiro não tem audit log algum** — nenhuma ocorrência de
`auditLogService` em `itemController.ts`, `CreateItemUseCase.ts`,
`UpdateItemUseCase.ts` ou `DeactivateItemUseCase.ts`, em módulo de PRODUÇÃO
REAL. **Handoff a T-01 e T-03.**

**T-05-11 — Divergência produto→item é ilimitada, silenciosa e sem detector.**

`UpdateProductUseCase.ts:6` permite alterar `name`, `unit`, `product_type`,
`status`, `cost_price` — exatamente os cinco campos que
`syncProductMirrorFromItem` propaga no sentido inverso
(`itemProductMirrorService.ts:163-168`) — sem nenhuma propagação de volta nem
detecção. A unidirecionalidade é decisão declarada
(`itemProductMirrorService.ts:35-38`), mas a decisão cobre **saldo**; ela não
decide o que acontece quando o cadastro do lado `products` é editado. Após uma
edição de produto, o par gêmeo diverge permanentemente e nada no sistema
reporta. Não há BR, nem guarda, nem teste.

### LOW — 2

**T-05-12 —** `3dee99f` acrescentou o parâmetro de transação a
`SequelizeProductRepository.create(data, transaction?)` (`:52-54`) e à interface
`ProductRepository`; **nenhum caller o usa** — `CreateProductUseCase.ts:88`
chama `create(entity.toPersistence())` sem transação. Capacidade morta que
corrobora T-05-01: a direção produto→item foi projetada e não foi ligada.

**T-05-13 —** `CreateItemUseCase.ts:28-31` faz check-then-act **fora** da
transação aberta em `:33`. O banco protege (UNIQUE em `items.codigo`,
`00_baseline_frozen.sql` + `Item.ts:57`), então não há duplicidade — mas a
corrida perdedora recebe erro cru do Sequelize (`:55-58` rethrow) e sai como
500, não como o 409 `ConflictError` que a regra promete.

---

## 2. RA-08 — resultado: regras extraídas × BR correspondente

**Cobertura: 100% das linhas dos 2 arquivos lidas** —
`itemProductMirrorService.ts` (173 linhas) e `fixedAssetReceiptService.ts` (92
linhas), integralmente, incluindo os cabeçalhos normativos (que são onde a regra
de fato mora).

### `itemProductMirrorService.ts` — 7 regras extraídas

| # | Regra | BR correspondente | Veredito |
|---|---|---|---|
| M-1 | Criar item garante produto gêmeo na mesma transação, para **todos** os tipos | **BR-CAD-009** (`BR_CATALOG.md:181`, `DISCOVERED`) | **COBERTA** |
| M-2 | Contraparte pré-existente é **adotada**, nada é sobrescrito (`:94-95`, `:122-123`) | — | **SEM BR** |
| M-3 | Criar produto garante item gêmeo na mesma transação (`:30-31`) | — | **SEM BR — e a regra NÃO é executada** (T-05-01) |
| M-4 | Atualização propaga só item→produto; saldo nunca (`:35-38`, `:162-169`) | — | **SEM BR** |
| M-5 | `USO_E_CONSUMO`/`ATIVO_IMOBILIZADO` degradam para `raw_material` (`:58-64`) | vizinha de BR-CAD-016 (`:188`), que trata BOM, não o mapeamento | **SEM BR** |
| M-6 | `component` degrada para `MATERIA_PRIMA` (`:73-77`) | — | **SEM BR** |
| M-7 | Item sem código ou de tipo não mapeado **não** ganha gêmeo — retorno `null` silencioso (`:92`, `:153`) | — | **SEM BR** (exceção não declarada à própria BR-CAD-009) |
| M-8 | Atualizar item sem gêmeo **cria** o gêmeo retroativamente (`:156-160`) | — | **SEM BR** |

**1 de 8 coberta.**

### `fixedAssetReceiptService.ts` — 6 regras extraídas

| # | Regra | BR correspondente |
|---|---|---|
| F-1 | Recebimento de linha cujo item mestre é `ATIVO_IMOBILIZADO` cria ativo patrimonial na mesma transação (`:57-63`) | **NENHUMA** |
| F-2 | Um ativo por unidade recebida — "1 plaqueta por bem" (`:70-85`) | **NENHUMA** |
| F-3 | Quantidade fracionária gera **1** ativo, com a quantidade anotada em `notes` (`:65`, `:80-82`) | **NENHUMA** |
| F-4 | Numeração continua de onde parou em recebimentos parciais (`:68`, `:72`) | **NENHUMA** |
| F-5 | O registro nasce incompleto por desenho — `department_id`, `responsible_id`, `useful_life_months` nulos (`:17-19`, `:74`) | **NENHUMA** |
| F-6 | `purchase_value` = `current_value` = preço unitário da linha; `purchase_date` = momento do recebimento (`:76-79`) | **NENHUMA** |

**0 de 6 cobertas.** Varredura confirmatória no `BR_CATALOG.md` (165 regras) por
`ativo|patrim|asset|recebimento|plaqueta|imobilizado`: os únicos vizinhos são
BR-QE-013 (baixa/ciclo de ativo), BR-QE-005/006 (quarentena e re-recebimento) e
BR-CAD-016 (imobilizado fora de BOM) — nenhum trata da **criação** do bem. O
único registro do comportamento em todo o discovery é uma menção de passagem em
`USE_CASES_RECOVERED_cadastro-suprimentos.md:189` (*"imobilizado vira ativo
(`:229-234`, F3)"*), sem BR-ID.

**Conclusão RA-08:** das **14 regras de negócio** que os dois serviços
implementam, **1 tem BR** (BR-CAD-009) e **13 não têm**. Regras que criam
registro patrimonial com valor contábil (F-1, F-2, F-6) existem no código sem
nenhuma âncora normativa e sem OWNER. Emitido como **T-05-06 (HIGH)**.

---

## 3. Veredito sobre o teste-fantasma do BR-CAD-009

**CONFIRMADO por evidência própria. O teste não existe.**

1. `server/tests/**/item-product*` → **nenhum arquivo**.
   `server/tests/integration/` tem 59 arquivos, enumerados;
   `item-product-mirror.test.ts` não está entre eles.
2. O nome é citado **10 vezes** no repositório: em 8 arquivos de teste unit como
   justificativa do dublê (`items-use-cases.test.ts:9`,
   `material-receipt-quarantine.test.ts:23`,
   `integrity-transaction-guards.test.ts:3`,
   `engineering-sample-requisition.test.ts:3`,
   `purchase-payable-no-recebimento-g13.test.ts:30`,
   `purchase-approval-authority.test.ts:3`,
   `requisition-receipt-status.test.ts:4`, `warehouse-stock.test.ts:16`), e — o
   mais grave — **em código de produção**: `fixedAssetReceiptService.ts:24-25`
   afirma *"o comportamento real é provado em
   `tests/integration/item-product-mirror.test.ts`"*.
3. O único teste que alcançaria o serviço o **substitui por dublê**:
   `items-use-cases.test.ts:14-17` mocka os três métodos retornando `null`. Um
   `CreateItemUseCase` que não criasse gêmeo algum passaria nesse teste.
4. **Verificação adicional que a instrução exigia e que ninguém tinha feito:** os
   testes de caracterização do passo 30 **também não cobrem** o fluxo.
   `CHARACTERIZATION_TESTS.md` §4 (9 arquivos) não congela nada de espelhamento,
   item↔produto ou recebimento de imobilizado — busca por
   `mirror|espelh|gêmeo|CreateItem|imobilizado` retorna zero. Portanto a
   conclusão "sem teste" **não** decorre de olhar só a pasta do módulo: decorre
   de varrer `server/tests/` inteiro e a suíte de caracterização.

**Correção que devolvo ao registro do passo 29:** a matriz afirma que o teste é
referenciado por `CreateItemUseCase.ts:33-58`
(`LEGACY_TRACEABILITY_MATRIX_cadastro-suprimentos.md:156`). **Isso é
impreciso.** Li o arquivo inteiro: `CreateItemUseCase.ts` **não menciona**
`item-product-mirror.test.ts` em nenhuma linha; o cabeçalho (`:7-17`) cita
`services/itemProductMirrorService.ts`. Quem referencia o teste-fantasma são os
8 arquivos de teste e o `fixedAssetReceiptService.ts:25`. O achado do passo 29
está **materialmente correto e a âncora está errada** — o que, pela regra
derivada IN-08 de T-00, é registro obrigatório e não conciliação silenciosa. A
conclusão de HIGH/CONFIRMED se sustenta com âncora corrigida.

---

## 4. Veredito de atomicidade (pergunta central do meu mandato)

Registro o que encontrei de **bom** com o mesmo rigor dos defeitos —
subdeclarar é o erro simétrico de superdeclarar.

| Operação multi-efeito | Transação única? | Evidência |
|---|---|---|
| criar item + produto gêmeo | **SIM** | `CreateItemUseCase.ts:33-58` — `t` criada antes, repasse a `create(...,t)` e ao serviço, `commit` em `:53`, `rollback` em `:56` |
| atualizar item + propagar gêmeo | **SIM** | `UpdateItemUseCase.ts:54-63` |
| recebimento: estoque + quarentena + lote + custo + **ativo patrimonial** + conta a pagar + status da requisição | **SIM, uma única transação** | `ReceivePurchaseItemsUseCase.ts:75` recebe a `transaction` de fora e a repassa a **todos** os efeitos: `:181-216` (material/quarentena/custo), `:229-234` (ativos), `:237-246` (AP), `:394-410` (requisição, com lock pessimista em `:394`) |
| idempotência do recebimento | **SIM** | `purchase_receipts` UNIQUE `(purchase_id, invoice_number)`, com o `SequelizeUniqueConstraintError` traduzido para `ConflictError` (`:100-112`) — controle compensatório real, registrado a favor do sistema |

**Nenhuma operação multi-write do meu escopo roda fora de transação.** Os
serviços não acessam banco por fora do model layer, não dependem de `req`/HTTP e
recebem a transação por parâmetro — desenho correto. Duas exceções declaradas:

- `DeactivateItemUseCase.ts:75` — write único, sem transação; o problema não é
  atomicidade, é a **ausência do segundo write** (T-05-04).
- `ImportCatalogSpreadsheetUseCase.ts:21-28, :167-194` — janela declarada e
  assumida entre o commit dos produtos/itens (passo 2) e a criação das BOMs
  (passo 3), porque `BomService.createBOM` abre transação própria e não aceita
  uma de fora. **Risco residual já declarado pelo autor**; registro como
  confirmado, não como achado novo, e encaminho a T-11 (dona de `bomService.ts`).

---

## 5. Completude dos 16 serviços — 16/16 com titular, 0 órfãos

| # | Serviço | Trilha | Fonte |
|---|---|---|---|
| 1 | `auditLogService.ts` | T-03 | `AUDIT_PLAN.md:607` |
| 2 | `itemProductMirrorService.ts` | **T-05 (RA-08)** | `:609` — **auditado nesta trilha** |
| 3 | `fixedAssetReceiptService.ts` | **T-05 (RA-08)** | `:609` — **auditado nesta trilha** |
| 4-9 | `inventoryService`, `warehouseStockService`, `quarantineBalanceService`, `saleStockService`, `materialReceiptService`, `saleLotService` | T-06 | `:295` |
| 10-11 | `saleReceivableService`, `costingService` | T-07 | `:309-310` |
| 12-13 | `bomService`, `bomStructureProjection` | T-11 | `:364`, `:627` |
| 14-16 | `emailService`, `uploadService`, `qrCodeService` | T-24 | `:572-573` |

**Veredito: nenhum arquivo órfão.** A regra de completude de
`AUDIT_PLAN.md:614-617` está satisfeita quanto a órfãos — não há motivo, por
esta via, para T-26 rejeitar a consolidação.

**Defeito de plano registrado (não é finding do produto):** `uploadService.ts`
aparece em **duas** células — T-18 (`:489`, superfície de segurança de upload) e
T-24 (`:573`, integrações). A regra de `:614-616` exige "exatamente uma célula
de titularidade". A dupla alocação é plausivelmente dimensional (D9 ×
integração) e **não** produz vão, mas produz o risco simétrico do órfão: cada
trilha supor que a outra cobriu. **Encaminho ao director e a T-26 para
desambiguação explícita**, não para conciliação silenciosa.

---

## 6. Pedidos DYN (G4 aprovado — `erp_evok_audio_test` apenas)

| ID | Pedido | Prova | Finding |
|---|---|---|---|
| **DYN-T05-01** | Criar item com `codigo` de 60 caracteres via `POST /api/items` no banco de teste; observar o erro e o estado final da tabela | Se a criação falha por `value too long for character varying(50)` e o item **não** persiste, T-05-02 passa de estático a demonstrado | T-05-02 |
| **DYN-T05-02** | Criar item, mudar `status` para `BLOQUEADO` via `PATCH /api/items/:id`, ler `products.status` do gêmeo | Prova que `BLOQUEADO → active` e que o produto continua listável em `GET /api/products` | T-05-03 |
| **DYN-T05-03** | Criar item, inativar por `PATCH /api/items/:id/inactivate`, ler `products.status`; repetir por `PATCH /api/items/:id` com `{status:'INATIVO'}` e comparar | Prova a divergência de comportamento entre os dois caminhos da mesma regra | T-05-04 |
| **DYN-T05-04** | Receber parcialmente uma linha de compra de item `ATIVO_IMOBILIZADO`, excluir um dos ativos gerados, receber o saldo | Prova a colisão de `tag` e que ela derruba a transação inteira de recebimento (estoque + AP) | T-05-08 |
| **DYN-T05-05** | Dois recebimentos concorrentes da mesma linha de pedido, em conexões distintas | Prova (ou refuta) a corrida no `Asset.count` — não demonstrável estaticamente | T-05-08 |
| **DYN-T05-06** | `POST /api/products` com código novo; consultar `items` por `codigo` e `listActiveStructure().unmapped` | Prova que o produto nasce órfão e que a aresta cai em `unmapped` | T-05-01 |

Todos read-only sobre `erp_evok_audio_test`, executáveis pelo
`vericore-audit-verification-runner`. **Nenhum toca `erp_evok_audio`.** Enquanto
não executados, T-05-02, T-05-03, T-05-04 e T-05-08 permanecem sustentados por
leitura estática — que considero suficiente para T-05-02/03/04 (são leitura
literal de constante e de fluxo de controle) e **insuficiente para a componente
concorrente de T-05-08**, declarada como lacuna.

---

## 7. Limites do que declarei (para ninguém reconstruir depois)

1. **Auditei o fluxo, não a matriz endpoint × dimensão** dos 9 endpoints de
   `products` e 7 de `assets`. Cobri authZ e transação nos que o fluxo
   atravessa; **não** cobri validação de entrada, audit log e integridade dos
   demais endpoints de `products`/`assets`. Isso é **cobertura de módulo**, e o
   plano a coloca em T-10/T-16 — mas se ninguém a reivindicar, é vão. **Registro
   como pergunta ao director.**
2. **Não adjudiquei authZ** (T-05-09) — é de T-04.
3. **Não julguei se as regras estão corretas para o negócio** — mandato do
   `domain-logic`/`business-rule-auditor`. Julguei **onde** e **como** vivem.
4. **Não inspecionei dado real**, não abri conexão, não executei nada.
   `APR-2026-016` intacto.
5. **Nenhuma leitura em `c9359be`** nem na worktree SanaCore. Toda citação
   arquivo:linha foi lida na árvore de `main`, idêntica ao `AUDIT_COMMIT` por E1.
6. **IN-07 tratado como contexto de fronteira**, conforme corrigido por T-00: o
   ramo `item_id` de `CreateInventoryMovementUseCase.ts:80-90` já existia na
   baseline, não veio de `3dee99f`, e a titularidade é de **T-06**. Não o
   adjudiquei.

---

## 8. Esforço medido × estimado (obrigação de G11-c)

| | Valor |
|---|---|
| **Estimado** (`AUDIT_PLAN.md:273`, mantido pela EMENDA-02 §7.1) | **4 S** |
| **Medido** | **1 S** — uma sessão contínua, sem interrupção nem retomada |
| **Volume real** | 28 chamadas de ferramenta (11 `Read`, 9 `Grep`, 4 `Glob`, em 8 blocos paralelos); ~2.400 linhas de código-fonte lidas; 265 linhas dos 2 arquivos de RA-08 lidas a 100% |
| **Razão medido/estimado** | **0,25×** |

**Leitura honesta do número, para que ele não seja extrapolado errado:**

- O ganho **não** é produtividade genérica. Vem de três fatores específicos e
  não universais: (i) a superfície de T-05 é pequena e densa — 2 serviços novos
  + 6 arquivos alterados, todos nomeados no plano, sem descoberta de escopo;
  (ii) T-00 já entregou a lista exata dos 8 arquivos, poupando toda a fase de
  delimitação; (iii) leitura paralela em bloco, viável porque o alvo era
  conhecido a priori.
- **Não extrapolar para T-04, T-09, T-12, T-16 e T-21.** Essas trilhas têm
  superfície enumerável em centenas de endpoints e exigem triagem REG-G3
  nominal — trabalho que **não** paraleliza da mesma forma. Aplicar 0,25× a elas
  produziria exatamente a promessa sem lastro que a EMENDA-02 §4 manda vigiar.
- **Extrapolação defensável**, se o dono quiser um número para decidir G11:
  trilhas com superfície **fechada e pré-enumerada** (T-00 3 S, T-01 4 S,
  T-03 4 S, T-05 4 S) parecem estar superestimadas por fator ~2-4×. Trilhas com
  superfície **aberta ou de triagem** (T-04, T-16, T-21, T-12) devem ser
  tratadas como **não medidas** até que uma delas execute. O delta 110 → 144
  **não** deve ser decidido só com a minha medida: uma trilha de superfície
  fechada é a menos informativa do conjunto.
- **Custo omitido do número:** validação Regra 22 dos 6 HIGH (T-25) e execução
  dos 6 DYN não estão nas 1 S.

---

## 9. Estado de conclusão de T-05

| Critério do "Pronto quando" (`AUDIT_PLAN.md:269-272`) | Estado |
|---|---|
| Fluxo insumo → item → produto espelhado → recebimento → imobilizado descrito ponta a ponta com arquivo+linha | **CUMPRIDO** (§4 + findings) |
| Divergências de estado entre `items` e `products` enumeradas | **CUMPRIDO** — 4 enumeradas: status `BLOQUEADO` (T-05-03), status na inativação (T-05-04), cadastro por edição de produto (T-05-11), existência do gêmeo (T-05-01) |
| Os 2 serviços novos cobertos integralmente | **CUMPRIDO** — 100% das linhas, 14 regras extraídas, 13 sem BR |
| RA-08 | **CUMPRIDA** |
| Completude dos 16 serviços | **CUMPRIDA** — 0 órfãos; 1 dupla alocação reportada |

**T-05 fecha.** Não depende de G4: a fila DYN **fortalece** quatro findings, não
os sustenta. Nenhum finding meu está em `READY_TO_CLOSE_BLOCKED_BY_G4`, com a
ressalva única e declarada da componente concorrente de T-05-08.

**Encaminhamentos:** 6 HIGH → `vericore-finding-validator` (Regra 22) ·
T-05-09 → T-04 · T-05-10 (audit log de `items`) → T-01 e T-03 · janela do
`spreadsheetImport` → T-11 · dupla alocação de `uploadService.ts` → director e
T-26 · correção de âncora do BR-CAD-009 → T-26 · 6 DYN →
`vericore-audit-verification-runner` · persistência →
`vericore-audit-evidence-controller`.
