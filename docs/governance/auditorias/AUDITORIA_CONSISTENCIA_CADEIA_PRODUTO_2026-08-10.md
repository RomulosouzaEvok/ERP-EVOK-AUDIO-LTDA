# Auditoria de Consistência Tripla — Documentação ↔ Banco ↔ Código
## Cadeia do Produto (Item → BOM → OP → Estoque → Compra → Venda)

> ## ⚠️ SUPERADO em 2026-08-10 pelos commits `92cf555` / `e2a8d7e`
>
> Os achados desta auditoria foram remediados por esses dois commits.
> **Mantido como registro histórico** (a metodologia de auditoria cruzada e o
> raciocínio de cada achado continuam servindo de referência), mas **não é
> retrato do estado atual**. Para pendências abertas, veja
> [`../RESIDUAIS_ABERTOS_2026-08-10.md`](../RESIDUAIS_ABERTOS_2026-08-10.md).
>
> *Banner adicionado em 2026-08-12 pela auditoria documental.*

**Data:** 2026-08-10
**Auditor:** agente `AuditorIntegrador` (auditoria cruzada documento ↔ schema ↔ código)
**Commit base:** `9df39c7` (HEAD em `main` no início da auditoria)
**Banco auditado:** `erp_evok_audio` @ container `evok-postgres` (PostgreSQL 16), migrations aplicadas até `20260809-000027-add-import-origin-to-inventory-and-cost-enums.cjs` (confirmado em `SequelizeMeta`)

> **Status deste arquivo:** escrito incrementalmente durante a auditoria (a rodada anterior foi perdida por queda de rede antes do salvamento).

---

## 0. Escopo

**Dentro do escopo** (entidades da cadeia do produto):
`items`, `item_categorias`, `item_detalhes_comerciais`, `item_especificacoes_tecnicas`, `item_estruturas`, `item_suppliers`,
`products`, `product_categories`, `product_cost_ledgers`, `product_drawings`, `product_warehouse_stock`,
`bill_of_materials`, `bill_of_material_items`,
`production_orders`, `production_order_reservations`, `production_order_tracking`, `production_routes`, `production_route_steps`, `work_centers`, `work_center_shifts`, `production_downtimes`, `production_cost_settings`, `production_lot_consumptions`,
`purchase_requisitions`, `purchase_requisition_items`, `rfqs`, `rfq_items`, `rfq_quotes`, `rfq_suppliers`, `purchase_orders`, `purchase_order_items`, `purchase_receipts`,
`inventory_movements`, `inventory_counts`, `inventory_count_items`, `warehouses`, `warehouse_transfers`, `lot_controls`,
`non_conformities`, `acoustic_test_results`,
`import_processes`, `import_process_items`,
`sales`, `sale_items`, `sale_invoices`, `serial_numbers`.

**Fora do escopo** (auditados por outros agentes): RH/`hr_*`/`employees`, SST/`sst_*`, TI/`it_*`, Jurídico/`jur_*`, Facilities/`facility_*`, Marketing/`marketing_*`, Contabilidade/Tesouraria/Controladoria.

**Método:** o banco real (`\d` + `pg_type`/`pg_enum`) é a fonte da verdade sobre o que existe; os models Sequelize e o código de `server/src/modules` e `server/src/services` são a fonte da verdade sobre comportamento; a documentação em `docs/` foi comparada contra ambos e, quando divergente, **corrigida** (nunca o inverso — nenhuma migration foi criada ou alterada nesta auditoria).

---

## 1. Veredito por camada

| Camada | Veredito | Justificativa em uma linha |
|---|---|---|
| **Banco de dados** | 🔴 **REPROVADO** | A "bomba de schema" do `allowNull` implícito, corrigida só para `production_orders` em 2026-08-04, continua viva em 5 tabelas da cadeia — criar BOM, criar contagem de inventário e criar venda são **impossíveis** contra o banco real (P0-05). Faltam ainda 2 FKs (P1-07) e há 4 FKs `ON DELETE SET NULL` sobre colunas `NOT NULL` (P1-06). |
| **Código** | 🟠 **REPROVADO COM RESSALVAS** | Os models declaram como opcionais colunas que o banco exige, e o Sequelize não valida nada disso (P0-02); `adjust()` grava `reference_id` nulo numa coluna `NOT NULL` (P0-01); dois `reference_type` fora do ENUM aguardam o primeiro chamador desatento (P1-03); fechar RNC grava numa coluna inexistente e o Sequelize engole (P1-13); há **duas BOMs paralelas** sem sincronização (P1-14). |
| **Documentação** | 🟠 **REPROVADO COM RESSALVAS** *(corrigida onde estava no meu escopo)* | O Dicionário de Dados divergia do banco em 194 colunas e omitia 2 tabelas da cadeia (P2-08); 24 tabelas da cadeia estavam documentadas em DDL **MySQL** que nunca existiu (P2-10); a documentação afirmava que as migrations do G3/G14 e de 6 módulos não estavam aplicadas quando **as 150 estão** (P2-09); o DER declarava uma FK que não existe (P2-11); a `API.md` negava a existência de `reserved_quantity` (P2-12). **Tudo isso dentro da cadeia do produto foi corrigido nesta auditoria** (§4); o que ficou de fora está explicitamente marcado como pendente. |

**Veredito consolidado: 🔴 REPROVADO.** A causa não é falta de documentação nem
de regra de negócio — as sete correções de hoje (G2, G3, G8, G10, G12, G14,
G15, G16) estão coerentes entre si e bem documentadas. A causa é que o **schema
físico do banco não corresponde ao que a aplicação escreve**, e isso bloqueia a
cadeia do produto de ponta a ponta. Enquanto **S-1** (§3) não for aplicado, o
G2 (OP não conclui sem BOM ativa) fecha o circuito: sem poder cadastrar BOM,
nenhuma OP nova pode ser concluída.

---

## 1.1 Matriz entidade × camada

Legenda: ✅ consistente · ⚠️ divergência não bloqueante · 🔴 bloqueante ·
"Doc" = presente e correta em `04-DICIONARIO_DADOS.md`/`02-MODELO_LOGICO.md`
**após** as correções de §4.

| Entidade | No banco | Doc | No código | ENUMs iguais nas 3 camadas | Observação |
|---|---|---|---|---|---|
| `items`, `item_categorias`, `item_detalhes_comerciais`, `item_especificacoes_tecnicas` | ✅ | ✅ | ✅ | ✅ | — |
| `item_estruturas` | ✅ | ✅ | ⚠️ | ⚠️ | `status` é ENUM morto; só `ativo` é usado (P1-15) |
| `item_suppliers` | ✅ | ✅ | ✅ | n/a | — |
| `products`, `product_categories` | ✅ | ✅ (corrigida) | ✅ | ✅ | 13 colunas tinham nulabilidade errada no dicionário |
| `product_cost_ledgers` | ⚠️ | ✅ | ✅ | ✅ (`import` presente nas 3) | FK `product_id` ausente (P1-07) |
| `product_drawings`, `product_warehouse_stock` | ✅ | ✅ | ✅ | ✅ | — |
| `bill_of_materials` | ✅ | ✅ (corrigida) | ✅ | ✅ | — |
| `bill_of_material_items` | 🔴 | ✅ (corrigida) | 🔴 | ✅ | **Criação impossível** (P0-05); 2 FKs `SET NULL` sobre `NOT NULL` (P1-06) |
| `production_orders` | ✅ | ✅ (corrigida) | ✅ | ✅ | Já corrigido em 2026-08-04 |
| `production_order_reservations` | ✅ | ✅ (**adicionada**) | ✅ | ✅ | Migration aplicada; backfill ainda pendente |
| `production_order_tracking` | ✅ | ✅ | ⚠️ | ⚠️ | `skipped` morto na escrita |
| `production_routes`, `production_route_steps`, `work_centers`, `work_center_shifts` | ✅ | ✅ | ✅ | ✅ | Docs departamentais descreviam outro schema (P2-10) |
| `production_downtimes`, `production_cost_settings`, `production_lot_consumptions` | ✅ | ✅ | ✅ | ✅ | — |
| `purchase_requisitions`, `purchase_requisition_items` | ✅ | ✅ (corrigida) | ✅ | ✅ | DER afirmava FK inexistente (P2-11); `partial`/`received` deixaram de ser mortos |
| `rfqs`, `rfq_items`, `rfq_quotes`, `rfq_suppliers` | ✅ | ✅ | ✅ | ✅ | — |
| `purchase_orders`, `purchase_order_items` | ✅ | ✅ (corrigida) | ✅ | ✅ | — |
| `purchase_receipts` | ⚠️ | ✅ | ✅ | n/a | **Nenhuma FK** (P1-07) |
| `inventory_movements` | 🔴 | ✅ (corrigida) | 🔴 | ⚠️ | `reference_id NOT NULL` × `adjust()` (P0-01/P0-02); 2 valores fora do ENUM (P1-03) e 2 do Facilities (P1-04) |
| `inventory_counts`, `inventory_count_items` | 🔴 | ✅ (corrigida) | 🔴 | ✅ | **Criação impossível** (P0-05) |
| `warehouses`, `warehouse_transfers` | ✅ | ✅ | ✅ | ✅ | — |
| `lot_controls` | ✅ | ✅ | ⚠️ | ⚠️ | `reserved` e `expired` mortos |
| `non_conformities` | ✅ | ✅ (corrigida) | ⚠️ | ⚠️ | `closed_at` inexistente gravado silenciosamente (P1-13); 4 status mortos |
| `acoustic_test_results` | ✅ | ✅ | ✅ | ✅ | Doc departamental trazia `power` (inexistente) e omitia `thiele_small` (P2-10) |
| `import_processes`, `import_process_items` | ✅ | ✅ | ✅ | ✅ | Doc de COMEX descrevia `imports`/`import_items`, que não existem (P2-10) |
| `sales` | 🔴 | ✅ (corrigida) | 🔴 | ✅ | **`POST /api/sales` responde 500** (P0-05, = BUG-03 do E2E) |
| `sale_items` | ✅ | ✅ (corrigida) | ✅ | n/a | — |
| `sale_invoices` | ✅ | ✅ (**adicionada**) | ✅ | ✅ | Existia no banco e não estava documentada |
| `serial_numbers` | ✅ | ✅ | ⚠️ | ⚠️ | 4 dos 5 status são mortos na escrita |

---

## 2. Achados

Severidade:
- **P0** — erro em runtime ou perda/corrupção de dado (o banco recusa, ou o dado grava errado).
- **P1** — inconsistência real entre camadas, sem falha imediata (armadilha latente, rastreabilidade quebrada).
- **P2** — divergência puramente documental.

---

### P0-01 — `InventoryService.adjust()` grava `reference_id = NULL` numa coluna `NOT NULL`: todo ajuste manual de estoque, aprovação de contagem e scan mobile falham no banco

**Localização:**
- `server/src/services/inventoryService.ts:313-325` (`adjust`, chama `createMovement` sem `referenceId`)
- `server/src/services/inventoryService.ts:141` (`createMovement`: `reference_id: data.referenceId ?? null`)
- `inventory_movements.reference_id` — `integer NOT NULL`, sem default

**Descrição:** a coluna `inventory_movements.reference_id` é `NOT NULL` no banco real (confirmado em `erp_evok_audio` **e** em `erp_evok_audio_test`). A função `adjust()` não recebe nem repassa `referenceId`, e `createMovement` converte o `undefined` em `null` **explícito**. Prova executada contra o banco real:

```
INSERT INTO inventory_movements (... reference_id ...) VALUES (... NULL ...);
ERROR:  null value in column "reference_id" of relation "inventory_movements" violates not-null constraint
```

Todos os caminhos abaixo passam por `adjust()` e portanto morrem em 500 com rollback da transação:

| Caminho | Arquivo |
|---|---|
| `POST /api/inventory/movements` (movimentação manual) | `modules/inventory/application/use-cases/CreateInventoryMovementUseCase.ts:107` |
| `POST /api/products/movements` (movimentação legada) | `RegisterProductMovementUseCase` → `adjust` |
| Aprovação de contagem de inventário (`pending_approval` → `adjusted`) | `modules/inventory/application/use-cases/ApproveInventoryCountUseCase.ts:89` |
| Scan de item no app mobile | `modules/mobileInventory/application/use-cases/ScanItemUseCase.ts:67` |
| Scan em lote no app mobile | `modules/mobileInventory/application/use-cases/BatchScanUseCase.ts:72` |
| Consumo de insumo predial (Facilities) | `modules/facilities/infrastructure/adapters/InventoryServiceAdapter.ts` → `CreateInventoryMovementUseCase` |

**Evidência corroborante:** a tabela `inventory_movements` do banco de desenvolvimento **não tem nenhuma linha** com `reference_type = 'adjustment'` (só `purchase`, `production` e `transfer`) — nenhum destes fluxos jamais gravou com sucesso neste banco.

**Correção aplicada:** nenhuma (é mudança de código de negócio ou de schema — fora do meu mandato).
**Recomendação:** ver §3, item **S-1**.
**Responsável sugerido:** `programador` + `AdmDBA`.

---

### P0-02 — O model `InventoryMovement` declara como opcionais três colunas que o banco exige

**Localização:** `server/src/models/InventoryMovement.ts:38-43` × `inventory_movements` (banco)

| Coluna | Banco | Model Sequelize |
|---|---|---|
| `description` | `text NOT NULL` | `description: DataTypes.TEXT` (⇒ `allowNull: true`) |
| `reference_id` | `integer NOT NULL` | `reference_id: DataTypes.INTEGER` (⇒ `allowNull: true`) |
| `reference_type` | `enum ... NOT NULL` | `reference_type: { type: DataTypes.ENUM(...) }` (⇒ `allowNull: true`) |

**Consequência:** o Sequelize não valida no app o que o Postgres vai recusar, então o erro vira um 500 genérico de driver (`SequelizeDatabaseError`) em vez de um 400/422 didático — é a causa direta de o P0-01 ter passado despercebido. É também a raiz de risco do bootstrap canônico: `server/migrations/20260731-000001-baseline-schema.cjs:140-148` cria colunas com `allowNull: attribute.allowNull !== false`, ou seja, **um banco criado do zero a partir dos models teria essas três colunas nullable** e se comportaria diferente do banco atual.

**Correção aplicada:** nenhuma (alterar o model é mudança de comportamento).
**Recomendação:** ver §3, item **S-1** (a decisão de tornar `reference_id` nullable no banco, ou obrigatório no model, resolve os dois de uma vez).
**Responsável sugerido:** `programador` + `AdmDBA`.

---

### P1-03 — `inventoryService` tem dois valores de `reference_type` fora do ENUM como *fallback* padrão

**Localização:**
- `server/src/services/inventoryService.ts:476` — `referenceType: options.referenceType ?? 'reservation'`
- `server/src/services/inventoryService.ts:573` — `referenceType: options.referenceType ?? 'reservation_release'`

`enum_inventory_movements_reference_type` = `[sale, purchase, production, adjustment, transfer, sst_epi_delivery, import]`. Nem `reservation` nem `reservation_release` existem. Confirmado contra o banco:

```
SELECT 'reservation'::enum_inventory_movements_reference_type;
ERROR:  invalid input value for enum enum_inventory_movements_reference_type: "reservation"
```

**Por que é P1 e não P0 hoje:** o único chamador vivo de `reserve`/`releaseAllReservationsForOrder` é
`modules/production/application/use-cases/ChangeProductionOrderStatusUseCase.ts:456-461` e `:512-517`, que passa `referenceType: 'production'` explicitamente. O default nunca é atingido. É uma mina: o primeiro chamador que esquecer o parâmetro derruba a liberação da OP em produção — exatamente a mesma classe de bug já encontrada duas vezes hoje.

**Correção aplicada:** nenhuma (mudar o literal é lógica).
**Recomendação:** ver §3, item **S-2**.
**Responsável sugerido:** `programador`.

---

### P1-04 — Facilities declara `reference_type` de rastreabilidade que é silenciosamente descartado (e que o ENUM recusaria)

**Localização:**
- `server/src/modules/facilities/infrastructure/adapters/InventoryServiceAdapter.ts:1-8` (JSDoc) e `:32`
- `server/src/modules/inventory/application/use-cases/CreateInventoryMovementUseCase.ts:107-115`

O adapter passa `reference_type: 'facility_maintenance_ticket' | 'facility_cleaning_execution'` e o JSDoc afirma: *"Categoria de referência (`reference_type`/`reference_id`) identifica a origem do consumo (chamado predial ou execução de limpeza) para rastreabilidade"*. **Duas coisas estão erradas:**

1. Nenhum dos dois valores existe em `enum_inventory_movements_reference_type` (verificado contra o banco — `invalid input value for enum`).
2. Isso não explode porque `CreateInventoryMovementUseCase` **descarta** `reference_id`/`reference_type` — chama `InventoryService.adjust(...)`, que não aceita esses parâmetros e força `referenceType: 'adjustment'` (`inventoryService.ts:320`) com `reference_id` nulo.

Ou seja: a rastreabilidade prometida pelo JSDoc **não existe**, e o valor que o adapter tenta gravar seria recusado se algum dia chegasse ao banco. (Facilities está fora do meu escopo de módulo, mas o defeito grava — ou deixa de gravar — em `inventory_movements`, que está no escopo.)

**Correção aplicada:** ✅ JSDoc do adapter corrigido para descrever o comportamento real (ver §4).
**Recomendação de código:** ver §3, item **S-1**/**S-3**.
**Responsável sugerido:** `programador`.

---

### P0-05 — "Bomba de schema" (`allowNull` implícito) ainda viva em 5 tabelas da cadeia: criar BOM, criar contagem de inventário e criar venda são **impossíveis** no banco real

**Contexto:** este defeito já foi diagnosticado e corrigido uma vez, para `production_orders`, em `server/migrations/20260804-000012-fix-production-orders-nullable-columns.cjs`. O cabeçalho daquela migration descreve exatamente o mecanismo: a baseline cria as tabelas a partir do model Sequelize usando `allowNull: attribute.allowNull !== false`, então **toda coluna que o model não marca explicitamente** virou `NOT NULL` sem default no banco físico — apesar de o model, as entidades de domínio e as FKs (`ON DELETE SET NULL`) tratarem a coluna como opcional.

**A correção de 2026-08-04 cobriu só `production_orders`.** O mesmo defeito continua em pelo menos 5 tabelas da cadeia do produto. Levantamento sistemático (introspecção de `information_schema` × parsing dos 167 models):

| Tabela.coluna | Banco | Model | O que o código faz | Efeito |
|---|---|---|---|---|
| `bill_of_material_items.parent_item_id` | `NOT NULL`, sem default | `defaultValue: null` (`BillOfMaterialItem.ts:58`) | omite (⇒ `null`) | 💥 |
| `bill_of_material_items.alternative_product_id` | `NOT NULL`, sem default | `defaultValue: null` (`:65`) | `item.alternative_product_id \|\| null` (`bomService.ts:189`) | 💥 |
| `bill_of_material_items.notes` | `NOT NULL`, sem default | nullable (`:64`) | `item.notes \|\| null` (`bomService.ts:188`) | 💥 |
| `inventory_counts.location` | `NOT NULL`, sem default | nullable (`InventoryCount.ts:83`) | não envia | 💥 |
| `inventory_counts.started_at` / `completed_at` / `approved_at` / `approved_by` / `notes` | `NOT NULL`, sem default | nullable (`:84-93`) | não envia (contagem nasce `draft`) | 💥 |
| `inventory_count_items.counted_quantity` / `variance_quantity` / `counted_by` / `counted_at` / `notes` | `NOT NULL`, sem default | nullable (`InventoryCountItem.ts:40-49`) | não envia (item nasce `pending`) | 💥 |
| `inventory_movements.reference_id` | `NOT NULL`, sem default | nullable (`InventoryMovement.ts:39`) | `?? null` em `adjust` | 💥 (= P0-01) |
| `sales.nfe_number` / `nfe_key` | `NOT NULL`, sem default | nullable (`Sale.ts:60,62`) | não envia (venda nasce sem NF-e) | 💥 |
| `bill_of_materials.revision_date` | `NOT NULL`, sem default | nullable **mas** `defaultValue: DataTypes.NOW` (`BillOfMaterial.ts:42`) | Sequelize preenche | ✅ salvo pelo default |
| `purchase_orders.order_date` | `NOT NULL`, sem default | `defaultValue: DataTypes.NOW` (`Purchase.ts:47`) | preenchido | ✅ |

Provas executadas contra `erp_evok_audio`:

```
INSERT INTO bill_of_material_items (... parent_item_id ...) VALUES (... NULL ...);
ERROR:  null value in column "parent_item_id" of relation "bill_of_material_items" violates not-null constraint

INSERT INTO inventory_counts (count_number,status,count_type,created_by,...) VALUES ('T1','draft','cycle',...);
ERROR:  null value in column "location" of relation "inventory_counts" violates not-null constraint
```

**Corroboração por contagem de linhas em `erp_evok_audio`:** `bill_of_material_items` = **0**, `inventory_counts` = **0**, `sales` = **0** — enquanto `purchase_orders` = 14, `production_orders` = 4, `lot_controls` = 7. Os três fluxos que o schema quebra são exatamente os três que nunca gravaram nada.

**Gravidade acrescida pelo commit `5ec0651` (G2):** concluir OP passou a exigir BOM ativa. Como criar BOM está quebrado no banco, **a cadeia inteira do produto está bloqueada** — não é possível cadastrar estrutura, logo não é possível concluir nenhuma OP nova.

**Correção aplicada:** nenhuma no schema/código (fora do mandato). ✅ Dicionário de dados corrigido para refletir a realidade (ver §4).
**Recomendação:** ver §3, item **S-1** (prioridade máxima).
**Responsável sugerido:** `AdmDBA` (migration) + `programador` (models).

---

### P1-06 — FKs `ON DELETE SET NULL` apontando para colunas `NOT NULL`

**Localização (banco):**

| FK | Coluna | Nulabilidade |
|---|---|---|
| `fk_bom_items_parent_item_id` | `bill_of_material_items.parent_item_id` | `NOT NULL` |
| `fk_bom_items_alternative_product_id` | `bill_of_material_items.alternative_product_id` | `NOT NULL` |
| `fk_inventory_counts_approved_by` | `inventory_counts.approved_by` | `NOT NULL` |
| `fk_inventory_count_items_counted_by` | `inventory_count_items.counted_by` | `NOT NULL` |

`ON DELETE SET NULL` numa coluna `NOT NULL` é uma contradição que o Postgres aceita na criação e só denuncia **no momento do DELETE do pai** (`ERROR: null value in column ... violates not-null constraint`). Na prática: excluir um usuário que aprovou uma contagem, ou um produto usado como alternativo numa BOM, falha com erro de banco em vez de anular a referência como a modelagem pretendia.

**Correção aplicada:** nenhuma (mudança de schema).
**Recomendação:** resolvido junto com **S-1** — ao tornar essas colunas nullable, a semântica `SET NULL` volta a ser coerente.
**Responsável sugerido:** `AdmDBA`.

---

### P1-07 — Duas FKs da cadeia simplesmente não existem no banco

**Localização (banco):**

- `purchase_receipts` — **nenhuma** foreign key. `purchase_receipts.purchase_id` (`NOT NULL`) não tem FK para `purchase_orders.id`, e `received_by` não tem FK para `users.id`. É a única tabela do bloco Compras sem integridade referencial.
- `product_cost_ledgers.product_id` (`NOT NULL`) não tem FK para `products.id` — só `created_by` tem FK (`fk_product_cost_ledgers_created_by`).

Isso contradiz a decisão arquitetural registrada em `CLAUDE.md` §7 ("Foreign Keys Obrigatórias — 159+ FKs... integridade referencial, sem órfãos") e permite razão de custo (`product_cost_ledgers`) e recebimento (`purchase_receipts`) órfãos — justamente os dois registros de valor contábil/fiscal do fluxo de compra.

**Correção aplicada:** nenhuma (mudança de schema).
**Recomendação:** ver §3, item **S-4**.
**Responsável sugerido:** `AdmDBA`.

---

### P2-08 — O Dicionário de Dados diverge do banco em ~194 colunas e omitia 2 tabelas da cadeia

**Localização:** `docs/database/04-DICIONARIO_DADOS.md`

O arquivo declara no cabeçalho ser "gerado por introspecção real do PostgreSQL 16 local (`information_schema`), não a partir de leitura de código". Comparação automatizada linha a linha contra `information_schema.columns` de `erp_evok_audio` (2026-08-10):

- **194 colunas** marcadas `Nulo? = sim` que no banco são `NOT NULL` (70 delas em tabelas da cadeia do produto, distribuídas em 12 tabelas: `products`, `sales`, `bill_of_material_items`, `bill_of_materials`, `inventory_counts`, `inventory_count_items`, `inventory_movements`, `non_conformities`, `production_orders`, `purchase_orders`, `purchase_order_items`, `product_categories`).
- A ordem das colunas também difere (ex.: `bill_of_material_items.item_id` aparece por último no documento e é a **4ª** coluna no banco) — sinal de que o arquivo foi gerado a partir de **outro** banco, provavelmente um criado do zero pelo bootstrap canônico (models), não do `erp_evok_audio` que o app usa.
- `sale_invoices` (18 colunas) e `production_order_reservations` (11 colunas) **existiam no banco e não constavam** do dicionário.
- `migracao_categoria_map` estava catalogada com 3 colunas, mas **a tabela não existe** (`to_regclass` = `NULL`).
- Índice declarava "80 tabelas"; o banco tem **195**.

**Correção aplicada:** ✅ ver §4 — as 46 seções da cadeia do produto foram regeneradas por introspecção real, as 2 tabelas faltantes foram adicionadas, a `migracao_categoria_map` foi marcada como inexistente, o cabeçalho e o índice foram corrigidos, e ficou registrado que as seções **fora** da cadeia do produto continuam desatualizadas.
**Responsável sugerido pelo resto:** `AdmDBA` (regenerar o arquivo inteiro pelo procedimento de `03-MODELO_FISICO.md`).

---

### P2-09 — Documentação afirma que migrations "não foram aplicadas"; todas as 150 estão aplicadas

**Localização:** `docs/database/00-INDICE.md` (§57, 83, 101, 126, 147), `docs/database/DATABASE.md` (§2182, 2453, 2534, 2634), `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` (linha da tabela de execução, G3 e G14), `docs/business/BLOCO_{1..6}_*_MODELO_DADOS.md`.

`SELECT count(*) FROM "SequelizeMeta"` = **150** = número de arquivos `.cjs` em `server/migrations/`. Não há nenhuma migration pendente. Toda a documentação que descreve o schema de SST/TI/Jurídico/Facilities/Marketing/RH, e as migrations `20260809-000026` (G3) e `20260809-000027` (G14), como "criadas mas não aplicadas, aguardando aprovação do dono" está **desatualizada**.

Os números de referência também estão: `00-INDICE.md` fala em "80 tabelas de negócio, 175 foreign keys, 66 migrations"; hoje são **195 tabelas** e **150 migrations**.

**Correção aplicada:** ✅ dentro do escopo — banner de correção global no topo de `00-INDICE.md`; seções G3 e G14 de `DATABASE.md`; linhas G3/G14 de `PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md`; cabeçalho de `02-MODELO_LOGICO.md`.
**Não corrigido (fora do escopo):** os `docs/business/BLOCO_{1..6}_*_MODELO_DADOS.md` e as entradas de SST/TI/JUR/FAC/MKT/RH em `00-INDICE.md`/`DATABASE.md`.
**Responsável sugerido:** `AdmDBA` / `documentador`.

---

### P2-10 — 24 tabelas da cadeia do produto documentadas em DDL **MySQL** que nunca existiu

**Localização:** blocos "Tabelas SQL" de 15 documentos departamentais.

Os documentos de Produção, Qualidade, Logística, Comercial e Suprimentos trazem `CREATE TABLE ... AUTO_INCREMENT ... DATETIME ... ENUM(...)` — dialeto **MySQL**, num projeto que o `README.md` declara ser **PostgreSQL 16 exclusivo**. Confrontadas contra `erp_evok_audio`, **24 dessas tabelas não existem**:

`material_specifications`, `production_programs`, `material_requirements`, `daily_production`, `machine_downtime`, `process_parameters`, `operation_consumables`, `product_standard_costs`, `cost_variations`, `inspection_plans`, `supplier_quality`, `test_certificates`, `product_certifications`, `quality_audits`, `shipping_orders`, `finished_goods_inventory`, `sales_pipeline`, `sales_commissions`, `commission_rules`, `sales_goals`, `supplier_evaluations`, `purchase_categories`, `imports`, `import_items`.

Piores casos (documento e banco descrevem a **mesma coisa** com nomes/ENUMs diferentes, o que induz a erro de implementação):

| Documento diz | Banco real |
|---|---|
| `machine_downtime` (`machine_id`, `reason_category` com `breakdown`/`adjustment`/`cleaning`) | `production_downtimes` (`work_center_id`, `reason` em português: `setup`/`manutencao_corretiva`/`manutencao_preventiva`/`falta_material`/`falta_operador`/`qualidade`/`outros`) |
| `imports` / `import_items` (status `ordered\|shipped\|arrived\|clearance\|delivered`) | `import_processes` / `import_process_items` (status `draft\|shipped\|arrived\|customs_cleared\|received\|cancelled`) |
| `non_conformities.category`, `detected_at`, `detected_by`, `production_record_id`, status com 4 valores | `defect_type`, `report_date`, `reported_by`, `production_order_id`, status com **6** valores |
| `acoustic_test_results.test_type` inclui `power` | ENUM real tem `power_rms` e `power_peak`, e ainda `thiele_small` |
| `purchase_requisition_items.product_id` / `almox_item_id` | coluna real é `item_id UUID NOT NULL` → `items.id` |
| `work_centers` com `capacity_per_hour`, `setup_time_min`, `labor_count`, `status` | `machines_count`, `capacity_hours_per_day`, `efficiency_factor`, `cost_per_hour`, `active` (+ tabela `work_center_shifts`) |
| `finished_goods_inventory` | `product_warehouse_stock` + `products.quantity` + `lot_controls` |

**Correção aplicada:** ✅ banner de advertência inserido no início de cada bloco "Tabelas SQL" dos 15 documentos, com o confronto exato contra o banco e o apontamento da tabela real (ver §4). Os DDLs foram **mantidos** (servem como registro de desenho/backlog), mas deixam de poder ser confundidos com o schema implementado.
**Responsável sugerido:** `AnalistaNegocios` (decidir quais desses desenhos viram backlog real e quais devem ser removidos).

---

### P2-11 — `docs/database/02-MODELO_LOGICO.md` afirmava FK que não existe

**Localização:** `docs/database/02-MODELO_LOGICO.md`, diagrama "Compras" e parágrafo pós-COMEX.

O DER declarava `PRODUCTS ||--o{ PURCHASE_REQUISITION_ITEMS : "product_id"` e o texto afirmava que `PURCHASE_REQUISITION_ITEMS` "ainda aponta para `PRODUCTS`". **`purchase_requisition_items` não tem coluna `product_id`** — tem `item_id UUID NOT NULL` com FK `purchase_requisition_items_item_id_fkey → items.id`. Faltavam ainda no DER: `production_order_reservations`, `sale_invoices`, `purchase_requisition_items.suggested_supplier_id` e `purchase_requisitions.production_order_id`.

**Correção aplicada:** ✅ ver §4.

---

### P2-12 — `docs/arquitetura/API.md` afirmava que `reserved_quantity` "ainda não existe no schema"

**Localização:** `docs/arquitetura/API.md`, nota de arquitetura da seção 8 (`/api/inventory`).

`products.reserved_quantity` existe (`NUMERIC(18,6) NOT NULL DEFAULT 0`), é lida por 5 caminhos vivos e desde o gap G3 é o cache derivado de `production_order_reservations`. A nota estava exatamente invertida em relação à realidade.

**Correção aplicada:** ✅ ver §4.

---

### P0-05b — Confirmação independente do P0-05 pela validação ponta a ponta que rodava em paralelo

Enquanto esta auditoria acontecia, o agente da validação E2E (`server/tests/integration/e2e-cadeia-insumo-produto.test.ts`, não commitado) chegou **aos mesmos defeitos por outro caminho** e teve de escrever contornos para atravessar a cadeia. Os achados batem 1:1:

| Achado do E2E | Achado desta auditoria | Contorno que o E2E precisou usar |
|---|---|---|
| **BUG-01** — não é possível criar BOM | P0-05 (`bill_of_material_items`) | `INSERT` manual em SQL com `notes='Contorno BUG-01'`, **`parent_item_id = id`** (auto-referência) e **`alternative_product_id = component_product_id`**, só para satisfazer os `NOT NULL` |
| **BUG-02** — não é possível criar cliente (`clients.cnae` e outras) | mesma classe, tabela fora do escopo desta auditoria | `Client.create` direto pelo model |
| **BUG-03** — `POST /api/sales` responde **500 para qualquer venda** (`sales.nfe_number`/`nfe_key`) | P0-05 (`sales`) | `Sale.create` direto pelo model com `nfe_number: ''` |
| **BUG-04** — confirmar venda responde 500 (8 colunas `NOT NULL` sem default em `accounts_receivable`) | mesma classe, tabela fora do escopo | `Sale.update({status:'confirmed'})` direto no banco |

**Consequência colateral já materializada:** as 7 linhas hoje em `bill_of_material_items` têm `parent_item_id` apontando para **si mesmas** e `alternative_product_id` igual ao próprio componente — dado factualmente falso, gravado só para contornar o schema. Precisa ser limpo junto com a correção **S-1**.

---

### P1-13 — Fechar uma RNC grava numa coluna que não existe: `closed_date` fica sempre `NULL`

**Localização:** `server/src/modules/nonConformities/application/use-cases/UpdateNonConformityUseCase.ts:70`

```ts
if (body.status === 'closed') {
  updateData.closed_by = closedBy;
  updateData.closed_at = new Date();   // <-- coluna inexistente
}
```

A tabela `non_conformities` **não tem `closed_at`**; a coluna real é **`closed_date DATE`** (assim no banco e no model `NonConformity.ts:81`). Como `closed_at` não existe em `rawAttributes`, o Sequelize **descarta o campo silenciosamente** no `UPDATE` — sem erro, sem aviso. Resultado: **toda RNC fechada fica com `closed_date = NULL` para sempre**, e o indicador "tempo de fechamento de RNC" (docs/qualidade) não tem como ser calculado.

Agrava: `CloseNonConformityUseCase.ts:26` (`POST /:id/close`) grava **apenas** `status: 'closed'` — nem `closed_by`, nem `closed_date`.

Terceira camada afetada: `client/src/api/nonConformities.ts:140` documenta para o front que "o backend grava `closed_by`/`closed_at`" — repetindo o nome errado. (Não editei `client/`, fora do meu mandato.)

**Correção aplicada:** nenhuma (é lógica de negócio).
**Recomendação:** trocar `closed_at` por `closed_date` nos dois use cases e alinhar o comentário do client. Considerar backfill de `closed_date` para as RNCs já fechadas (usar `updated_at` como aproximação, sinalizando a estimativa).
**Responsável sugerido:** `programador`.

---

### P1-14 — Duas BOMs paralelas, com fontes da verdade diferentes por módulo

**Localização:**
- `server/src/services/bomService.ts` → `bill_of_materials` / `bill_of_material_items` (chaves `products.id`)
- `server/src/modules/mrp/infrastructure/sequelize/SequelizeMrpRepository.ts:7` → `item_estruturas` (chaves `items.id`)
- `server/src/modules/items/.../CreateItemStructureUseCase.ts` / `ExplodeItemStructureUseCase.ts` → `item_estruturas`

O ERP tem **duas estruturas de produto vivas ao mesmo tempo**, sem nenhuma rotina de sincronização em runtime (só o script de backfill `02c_bom_to_item_estrutura.ts`, de mão única e pontual):

| Consumidor | Tabela usada |
|---|---|
| Conclusão de OP / consumo de componentes / custo real (`ChangeProductionOrderStatusUseCase` → `BomService.explodeBOM`) | `bill_of_material_items` |
| Reserva de material na liberação da OP (`BomService.checkAvailability`) | `bill_of_material_items` |
| **MRP** (`listActiveEdges`) | `item_estruturas` |
| API de estrutura de item (`/api/items/:id/estrutura`) | `item_estruturas` |

Estado atual do banco: `item_estruturas` = 4 linhas, `bill_of_material_items` = 7 linhas (todas inseridas à mão como contorno do P0-05). **Já divergem.** Na prática, o MRP planeja compra com base numa estrutura e a produção consome com base em outra.

Some a isso que o gap **G2** (commit `5ec0651`) passou a **exigir BOM ativa em `bill_of_material_items`** para concluir OP — enquanto o caminho novo de cadastro de estrutura (`/api/items/.../estrutura`) escreve em `item_estruturas`. Cadastrar a estrutura pelo caminho novo **não destrava** a conclusão da OP.

**Correção aplicada:** nenhuma (decisão de arquitetura, não de documentação).
**Recomendação:** decisão explícita do dono do produto sobre qual das duas é a fonte da verdade, com prazo. Enquanto não houver decisão, documentar em `docs/producao/06-BOM.md` que existem duas e quem lê qual. **Não é auditável objetivamente por mim — é escolha de negócio.**
**Responsável sugerido:** `AnalistaNegocios` + `AdmDBA`.

---

### P1-15 — `item_estruturas` tem dois interruptores de vigência e o código só usa um

**Localização:** `item_estruturas.ativo` (BOOLEAN) × `item_estruturas.status` (`item_estrutura_status`: `draft|active|inactive|superseded`)

Todo o código (`SequelizeItemEstruturaRepository.ts:17,28,36,75`, `SequelizeMrpRepository.ts:8`, `CreateItemStructureUseCase.ts:54`) filtra e grava **apenas `ativo`**. A coluna `status` **nunca é lida nem escrita** pela aplicação — fica sempre no default `'active'` (confirmado: 100% das linhas do banco têm `status='active'`). Uma estrutura marcada `status='superseded'` por qualquer rotina futura continuaria sendo explodida pelo MRP, porque o MRP olha só `ativo = true`.

Mesma tabela tem ainda 4 colunas nunca escritas pela aplicação: `parent_item_estrutura_id` (0 referências fora do model, das associações e do script de backfill), `approved_by`, `approval_date` e `alternative_product_id`.

**Correção aplicada:** nenhuma.
**Recomendação:** ou o código passa a usar `status` como vigência (e `ativo` vira derivado/removido), ou `status` é declarado morto e documentado como tal. Escolher **um** interruptor.
**Responsável sugerido:** `AdmDBA` + `programador`.

---

## 3. Mudanças de schema recomendadas (ordem de prioridade)

> Nenhuma migration foi criada, alterada ou executada nesta auditoria — por
> mandato. Tudo abaixo é **recomendação** para `AdmDBA`.

### S-1 (P0, bloqueia a cadeia inteira) — Migration "fix-nullable-columns", segunda rodada

Repetir, para as tabelas restantes, exatamente o que
`20260804-000012-fix-production-orders-nullable-columns.cjs` fez para
`production_orders`: `ALTER TABLE ... ALTER COLUMN ... DROP NOT NULL` nas
colunas que o model, o domínio e as FKs já tratam como opcionais.

| Tabela | Colunas a tornar nullable |
|---|---|
| `bill_of_material_items` | `parent_item_id`, `alternative_product_id`, `notes` |
| `inventory_counts` | `location`, `started_at`, `completed_at`, `approved_at`, `approved_by`, `notes` |
| `inventory_count_items` | `counted_quantity`, `variance_quantity`, `counted_by`, `counted_at`, `notes` |
| `inventory_movements` | `reference_id`, `reference_type` (e `description`, ou manter com DEFAULT vazio) |
| `sales` | `nfe_number`, `nfe_key` |

Fora do escopo desta auditoria, mas na mesma migration (achados **BUG-02** e
**BUG-04** do E2E): `clients` (`cnae`, `cep`, `phone`, `email`, `street`,
`number`, `complement`, `neighborhood`, `city`, `state`, `ie`, `im`,
`ind_final`, `ind_ie`, `tax_regime`, `status`, `notes`) e `accounts_receivable`
(`payment_date`, `payment_method`, `invoice_number`, `barcode`, `pix_key`,
`protest_date`, `negativation_date`, `notes`).

**No mesmo passo, alinhar os models** (declarar `allowNull` explícito) para que
o bootstrap canônico (`20260731-000001-baseline-schema.cjs:148`) nunca mais
recrie o problema num banco novo.

**Limpeza de dado obrigatória junto:** desfazer os contornos gravados pelo E2E
em `bill_of_material_items` (`parent_item_id = id` e
`alternative_product_id = component_product_id` nas 7 linhas com
`notes` = "Contorno BUG-01").

**Risco:** baixo. `DROP NOT NULL` é operação de metadados, não reescreve
tabela, e nenhuma dessas tabelas tem volume relevante. O `down` deve ser um
no-op documentado (reaplicar `SET NOT NULL` falharia se já houvesse linhas
nulas), exatamente como fez a migration de 2026-08-04.

### S-2 (P1) — Alinhar o `reference_type` de reserva ao ENUM

Duas alternativas, escolher **uma**:

- **(a)** trocar os fallbacks de `inventoryService.ts:476,573` pelo valor
  `production` — não é mudança de schema e é preferível, porque reserva **só
  existe** para OP desde o G3; ou
- **(b)** `ALTER TYPE enum_inventory_movements_reference_type ADD VALUE ...`
  para os dois valores novos, se quiser distinguir reserva de consumo no
  extrato de movimentação.

**Risco:** (a) nenhum; (b) `ADD VALUE` exige commit antes de o valor novo poder
ser usado na mesma sessão.

### S-3 (P1) — Decidir o rastro de consumo de Facilities

Hoje o consumo predial cai como `reference_type = adjustment` com
`reference_id` nulo (uma vez resolvido o P0-01). Se rastreabilidade por origem
for requisito, é preciso `ALTER TYPE ... ADD VALUE` para os dois valores de
Facilities **e** fazer `InventoryService.adjust` aceitar
`referenceId`/`referenceType`. Caso contrário, aceitar `adjustment` como está
(o JSDoc do adapter já foi corrigido — ver §4).

**Risco:** médio — mexe na assinatura de `adjust`, usada por 5 chamadores.

### S-4 (P1) — Criar as 2 FKs ausentes

- `purchase_receipts.purchase_id` → `purchase_orders(id)` `ON DELETE RESTRICT`
- `purchase_receipts.received_by` → `users(id)` `ON DELETE SET NULL`
- `product_cost_ledgers.product_id` → `products(id)` `ON DELETE RESTRICT`

**Risco:** baixo, **desde que** se valide antes que não há órfãos. Passa a
restringir o `DELETE` de produto com histórico de custo — comportamento
desejado, alinhado com `CLAUDE.md` §7.

### S-5 (P2) — Regenerar `docs/database/schema.sql` e o dicionário completo

`docs/database/schema.sql` (anexo do Modelo Físico) descreve `sales.nfe_number`
e `sales.status` como **nullable** — o oposto do banco real, sinal de que foi
gerado de outro banco. Depois de aplicar **S-1**, regenerar `schema.sql`
(`pg_dump --schema-only`) e o dicionário inteiro pelo procedimento de
`03-MODELO_FISICO.md`, agora contra `erp_evok_audio`.

**Risco:** nenhum (documentação).

---

## 4. O que foi corrigido diretamente nesta auditoria

Somente **documentação** e **um JSDoc** que descrevia comportamento inexistente. Nenhuma migration, nenhum schema, nenhuma regra de negócio.

| Arquivo | O que mudou |
|---|---|
| `docs/database/04-DICIONARIO_DADOS.md` | 22 seções da cadeia do produto **regeneradas por introspecção real**; adicionadas `production_order_reservations` (com CHECKs e índice único parcial) e `sale_invoices`; `migracao_categoria_map` marcada como inexistente no banco; cabeçalho corrigido (migration G3 aplicada) e escopo real declarado (81 de 195 tabelas); índice atualizado |
| `docs/database/02-MODELO_LOGICO.md` | Removida a FK inexistente de `PRODUCTS` para `PURCHASE_REQUISITION_ITEMS.product_id` e corrigido o parágrafo que a afirmava; acrescentados `PURCHASE_REQUISITION_ITEMS` (com `item_id` UUID), `PRODUCTION_ORDER_RESERVATIONS`, `SALE_INVOICES`, `purchase_requisitions.production_order_id` e o ENUM de `production_downtimes.reason`; contagens de migrations/tabelas atualizadas |
| `docs/database/00-INDICE.md` | Banner de correção global: as 150 migrations estão **todas aplicadas**; números de referência (80 tabelas / 175 FKs / 66 migrations) declarados desatualizados |
| `docs/database/DATABASE.md` | Seções G3 e G14: status "não aplicada" passou a **aplicada**; o backfill do G3 ficou destacado como o que de fato continua pendente |
| `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` | Linhas G3 e G14: migrations `20260809-000026` e `000027` marcadas como aplicadas |
| `docs/arquitetura/API.md` | Removida a afirmação falsa de que `reserved_quantity` "ainda não existe no schema"; substituída pela descrição real (cache derivado de `production_order_reservations`) |
| `docs/producao/01-ENGENHARIA.md`, `02-PCP.md`, `03-MANUFATURA.md`, `04-ROTEIROS.md`, `05-CUSTOS.md` | Banner "DDL de projeto, NÃO é o schema implementado", com o confronto exato contra o banco e a tabela real correspondente |
| `docs/qualidade/00-README.md`, `02-TESTES_ACUSTICOS.md`, `03-CERTIFICACOES.md` | idem |
| `docs/logistica/00-README.md`, `02-ESTOQUE_PA.md` | idem |
| `docs/comercial/00-README.md`, `01-VENDAS.md` | idem |
| `docs/suprimentos/00-README.md`, `01-COMPRAS.md`, `02-COMEX.md` | idem (COMEX com o mapeamento `imports` → `import_processes` e o ENUM de status real) |
| `server/src/modules/facilities/infrastructure/adapters/InventoryServiceAdapter.ts` | JSDoc reescrito: a rastreabilidade por `reference_type`/`reference_id` que ele prometia **não acontece** (o use case descarta os campos e o ENUM recusaria os valores) |

**Não toquei** (por instrução): `server/src/modules/rh/`, `employees/`, `models/Hr*`, `client/`, `docs/governance/VALIDACAO_CADEIA_PRODUTO_2026-08-10.md`.

---

## 5. Estados mortos encontrados (listados, não removidos)

| Onde | Valor/coluna | Situação |
|---|---|---|
| `item_estruturas.status` | ENUM inteiro (draft, active, inactive, superseded) | **Coluna morta**: nunca lida nem escrita; 100% das linhas ficam no default `active`. A vigência real é `ativo BOOLEAN` (ver P1-15) |
| `item_estruturas` | `parent_item_estrutura_id`, `approved_by`, `approval_date`, `alternative_product_id` | Nunca escritas pela aplicação (o `parent_`, só pelo script de backfill `02c_bom_to_item_estrutura.ts`) |
| `serial_numbers.status` | reserved, sold, blocked, scrapped | Mortos na escrita. O único ponto que cria série (`ChangeProductionOrderStatusUseCase.ts:754`) grava sempre `available`; nada marca a série como vendida no faturamento/expedição |
| `lot_controls.status` | reserved, expired | Mortos. Só há escrita de `quarantine` (`materialReceiptService.ts:170,186`), `blocked` (`BlockLotUseCase`), `available` (`ReleaseLotUseCase`) e `consumed` (`ChangeProductionOrderStatusUseCase.ts:686`). Não existe rotina de expiração por `expires_at` |
| `production_order_tracking.status` | skipped | Morto na escrita; aparece só num filtro de leitura (`ChangeProductionOrderStatusUseCase.ts:116`) |
| `non_conformities.status` | analysis, corrective_action, effectiveness_check, canceled | Nenhum use case os grava. A RNC nasce `open` (`CreateNonConformityUseCase.ts:175`) e só vai a `closed`. Alcançáveis apenas pelo PUT genérico (`ALLOWED_FIELDS` inclui `status`), sem máquina de estados |
| `non_conformities.closed_date` | coluna | **Sempre nula**, por causa do P1-13 (o código grava `closed_at`, que não existe) |
| `inventory_movements.reference_type` | adjustment | Zero linhas no banco (35 movimentos, nenhum `adjustment`) — consequência do P0-01, não decisão de negócio |
| `products.reserved_quantity` | — | Deixou de ser autoritativa em 2026-08-09; hoje é cache derivado. Já documentado corretamente |

**Deixaram de ser mortos hoje** (confirmado no código, não só na documentação):

- `purchase_requisitions.status = partial` e `= received` — acionados por
  `modules/purchases/application/services/syncRequisitionReceiptStatus.ts` a
  cada recebimento (commit `9df39c7`, gap G15). Continuam **não declaráveis**
  por `PATCH /:id/status`, por desenho: são fatos derivados.
- `inventory_movements.reference_type = import` e
  `product_cost_ledgers.source_type = import` — gravados por
  `ReceiveImportProcessUseCase` (gap G14). Existem no ENUM do banco e já há 4
  movimentações `import` gravadas.

---

## 6. Cobertura, método e limitações

**O que foi efetivamente conferido:**

- Introspecção completa (`information_schema.columns`, `pg_type`/`pg_enum`, `\d`) das **46 tabelas** da cadeia do produto em `erp_evok_audio`, com os 150 registros de `SequelizeMeta` conferidos contra os 150 arquivos de `server/migrations/`.
- Comparação **automatizada** (script de parsing dos 167 models × `information_schema`) de nulabilidade e default de **todas** as colunas `NOT NULL` das 46 tabelas — não amostragem.
- Comparação **automatizada** do `04-DICIONARIO_DADOS.md` inteiro (todas as 80 seções, ~1.300 linhas de tabela) contra o banco, coluna a coluna.
- Confronto dos **56 tipos ENUM** do banco contra os `DataTypes.ENUM` dos models e contra os literais de status usados em `server/src/modules/{production,purchases,purchaseRequisitions,rfq,inventory,sales,comex,nonConformities,mrp,items,products,traceability}`.
- Inventário dos `CREATE TABLE` de todos os documentos departamentais em escopo (Produção, Qualidade, Logística, Comercial, Suprimentos), com verificação por `to_regclass` de cada tabela citada.
- Leitura dos 7 commits de remediação de 2026-08-09 (`5ec0651`, `0d5812e`, `9b169a7`, `fed3129`, `9df39c7`, `bf07136`, `4f4122e`) e verificação de que o que eles afirmam ter feito de fato está no código e no banco.
- Provas executadas com `INSERT ... ROLLBACK` contra o banco real para cada P0 alegado.

**O que NÃO foi coberto (declarado explicitamente, para não inflar o veredito):**

1. **Não rodei a suíte de testes nem exercitei a API autenticada.** As conclusões de runtime vêm de leitura de código + prova SQL direta contra o schema, e são corroboradas de forma independente pelos contornos BUG-01 a BUG-04 do teste E2E que rodava em paralelo.
2. **Tabelas fora da cadeia do produto** (RH/`hr_*`, `employees`, SST, TI, Jurídico, Facilities, Marketing, Contabilidade, Tesouraria, Controladoria) não foram auditadas — mas a mesma classe de defeito do P0-05 foi observada de passagem em `clients` e `accounts_receivable` (BUG-02/BUG-04 do E2E). **Recomendo fortemente estender S-1 a essas tabelas.**
3. **`client/` não foi auditado nem tocado.** Consta ao menos uma inconsistência conhecida (`client/src/api/nonConformities.ts:140` repete o nome errado `closed_at`).
4. **As ~124 divergências restantes do Dicionário de Dados** (colunas fora da cadeia do produto) foram medidas e sinalizadas, mas **não corrigidas** — exigem a regeneração completa do arquivo (item **S-5**).
5. **`docs/database/03-MODELO_FISICO.md` / `schema.sql`** não foram regenerados: só faz sentido depois de **S-1**.
6. **Correção código-vs-regra-de-negócio não é meu escopo** — casos como "o MRP deveria usar `item_estruturas` ou `bill_of_material_items`?" (P1-14) são decisão do dono do produto, encaminhados a `AnalistaNegocios`/`auditor`.

---

**Fim do relatório.**
