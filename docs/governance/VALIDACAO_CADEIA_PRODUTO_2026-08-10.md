# Validação ponta a ponta da cadeia do produto — 2026-08-10

> ## ⚠️ SUPERADO em 2026-08-10 pelos commits `92cf555` / `e2a8d7e`
>
> As lacunas apontadas neste documento foram fechadas por esses dois commits.
> **Mantido como registro histórico** da execução daquele dia (o rastro de
> *como* a cadeia foi provada continua útil), mas **não use como lista de
> pendências** — para isso vale
> [`RESIDUAIS_ABERTOS_2026-08-10.md`](RESIDUAIS_ABERTOS_2026-08-10.md).
>
> *Banner adicionado em 2026-08-12 pela auditoria documental.*

**Objetivo (critério de aceite do dono, `ESTADO_SESSAO_2026-08-09.md` §1):**

> "Um insumo é cadastrado e segue seu curso até virar produto finalizado, passando
> pelos departamentos, **sem gap**."

Este documento registra a **execução real** dessa corrente contra API + PostgreSQL
rodando (sem mock), e onde ela quebra.

**Artefato de teste:** `server/tests/integration/e2e-cadeia-insumo-produto.test.ts`
(26 casos, convenção `tests/integration` do projeto: `RUN_INTEGRATION=true`,
`TEST_API_URL`, `TEST_AUTH_TOKEN`, gate `hasIntegrationPrerequisites()`).

---

## 1. Resultado em uma linha

**8 das 10 estações fecham. 2 quebram: a estação 2 (estrutura/BOM) e a estação 9
(venda).** Os 8 gates de regressão pedidos (G2, G3, G8, G12, G14, G15, G16) foram
**todos provados fechados**.

As duas quebras **não são de regra de negócio** — são de **schema**: o banco real
tem colunas `NOT NULL` que os models Sequelize e as migrations tratam como
opcionais, e o `INSERT` estoura em runtime (HTTP 500 genérico
`"Erro ao processar operação no banco de dados."`). São 4 bugs P0 novos, todos
confirmados no banco do dono (`erp_evok_audio`).

| Execução | Ambiente | Resultado |
|---|---|---|
| Principal | API Docker `:5000` + banco `erp_evok_audio` (ambiente no ar) | **22 passaram / 4 falharam** (26) |
| Convenção | Banco isolado `erp_evok_audio_test` (`.env.test`) | **6 passaram / 20 falharam** (26) |

A diferença entre as duas execuções é, ela mesma, um achado — ver §5.

---

## 2. Como foi executado

### 2.1 Ambiente escolhido e por quê

A convenção do projeto (`server/scripts/run-api-suite.cjs`) exige `DB_NAME` com
sufixo `_test`/`_ci` e sobe um servidor próprio a partir de `dist/`. **Comecei por
ela**: apliquei as 100 migrations pendentes em `erp_evok_audio_test`
(50 → 150, agora igual ao dev) e rodei.

O banco de teste, porém, tem **29 colunas `NOT NULL` a mais que o banco de
desenvolvimento** (lista em §5), o que derruba a corrente já na estação 4 por um
motivo que **não existe no sistema real** — ou seja, produziria falsos negativos e
esconderia o que interessa. Por isso a execução **principal** foi feita contra o
ambiente que está no ar (API em Docker na `:5000`, banco `erp_evok_audio`), e a
execução no banco isolado ficou como comparação.

### 2.2 Credenciais

Não criei nem alterei nenhum usuário no banco do dono. O JWT foi **emitido
diretamente** com o `JWT_SECRET` da raiz (o mesmo que o `docker-compose` injeta no
container `evok-api`) para o usuário admin **já existente** (`id = 1`,
`admin@evokaudio.com.br`, `password_version = 3`) — mesma técnica de
`scripts/run-api-suite.cjs` e de `quality-releases-receiving-lot.test.ts`. O
middleware `authenticate` recarrega usuário/perfil do banco a cada request, então o
caminho de autorização exercitado é idêntico ao de um login real.

No banco **isolado** foi usado o usuário sintético de CI já previsto pela convenção
(`ci-admin@evok.local`, `findOrCreate` — mesmo do `run-api-suite.cjs`). Ele existe
**apenas em `erp_evok_audio_test`**; nenhum usuário novo foi criado em
`erp_evok_audio`.

### 2.3 Comandos

```bash
# banco isolado (convenção do projeto), depois de aplicar as migrations pendentes:
cd server
DB_NAME=erp_evok_audio_test NODE_ENV=test npm run migration:up
npm run test:integration:strict      # roda a suíte inteira, inclui este arquivo

# execução principal (ambiente no ar), a partir de server/:
# ⚠️ transcrição histórica (2026-08-10) — DB_NAME=erp_evok_audio é o banco
# classificado PRODUÇÃO REAL por APR-2026-016 (decidido depois desta data).
# Nenhum agente pode repetir este comando: regra permanente de segurança de
# dado real em coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md.
RUN_INTEGRATION=true \
TEST_API_URL=http://127.0.0.1:5000 \
TEST_AUTH_TOKEN=<JWT admin id=1 assinado com o JWT_SECRET da raiz> \
DB_NAME=erp_evok_audio \
npx jest --runInBand tests/integration/e2e-cadeia-insumo-produto.test.ts --forceExit
```

---

## 3. Estação por estação

| # | Estação | Status | O que foi executado / evidência |
|---|---------|--------|--------------------------------|
| 1 | **Cadastro do insumo e do produto acabado** | ✅ | `POST /api/products` (matéria-prima `E2E-MP-*` e acabado `E2E-PA-*`), `POST /api/items` (`MATERIA_PRIMA` / `PRODUTO_ACABADO`, mesmos códigos — o crosswalk item↔produto é por `code`), `POST /api/suppliers`, `POST /api/items/:id/suppliers` (catálogo N:N, `preferred: true`). Todos 201. |
| 2 | **Estrutura do produto (BOM)** | ❌ **QUEBRA** | `POST /api/engineering/bom` → **HTTP 500** em 100% das tentativas. **BUG-01** (§4). Sem BOM ativa não existe OP, então a corrente pararia aqui — segui com um contorno explícito (BOM gravada direto no banco), documentado no próprio teste. |
| 3 | **Requisição de compra + aprovação** | ✅ | `POST /api/purchase-requisitions` (nasce `pending`) → `PATCH /:id/status {approved}`. Fornecedor resolvido depois pelo catálogo item×fornecedor, sem `fallback_supplier_id`. |
| 4 | **Pedido de compra → aprovar → enviar** | ✅ | `POST /:id/convert` gerou 1 pedido com `unit_price` vindo do catálogo (R$ 5,00) e deixou a requisição `ordered`; `PUT /api/purchases/:id/status` para `approved` e `sent`. |
| 5 | **Recebimento com lote em quarentena** | ✅ | `POST /api/purchases/:id/receive` (100 un, `E2E-LOTE-MP-*`, NF `E2E-NF-*`). Lote nasce `quarantine` com 100 disponíveis; `products.quantity` sobe para 100. |
| 6 | **Liberação do lote pela Qualidade** | ✅ | `POST /api/inventory/lots/:id/release` → `available`. |
| 7 | **OP criada e liberada (reserva)** | ✅ | `POST /api/production-orders` (10 un) e `PUT /:id/status {released}`. Criou **1 linha em `production_order_reservations`** de 20 un vinculada àquela OP, e `products.reserved_quantity` = 20 (cache derivado). |
| 8 | **Conclusão da OP** | ✅ | `in_progress` → `completed` com `lot_consumptions` explícito. Verificado: insumo baixou 100 → 80 (produto e lote), reserva zerada (nenhuma linha `active`), lote de acabado `E2E-LOTE-PA-*` criado com 10 un, e **custo do acabado = R$ 10,00** (2 × R$ 5,00) — **diferente de zero**, que é o ponto do G2. |
| 9 | **Venda → NF-e → expedição** | ❌ **QUEBRA (parcial)** | `POST /api/clients` → **500** (**BUG-02**); `POST /api/sales` → **500** (**BUG-03**); `PUT /api/sales/:id/status {confirmed}` → **500** (**BUG-04**). Com os três contornados, **`POST /api/sales/:id/nfe` (202, `authorized`, venda → `invoiced`) e `PUT /status {shipped}` (200) funcionam**. Ou seja: emissão fiscal e expedição estão OK; **cadastrar cliente, criar pedido e confirmar pedido não funcionam**. |
| 10 | **Rastro completo** | ✅ | `GET /api/traceability/production-orders/:id` devolve a OP com `generated_lots` contendo `E2E-LOTE-PA-*` e `insumos` apontando para `E2E-LOTE-MP-*` / código do insumo. `GET /api/traceability/lots/<lote acabado>` traz `production_lot_generated` com o número da OP; `GET /api/traceability/lots/<lote insumo>` traz `lot_consumed_in_production` com a mesma OP. **O caminho lote de acabado → OP → lote do insumo fecha.** |

### 3.1 O que os contornos NÃO provam

Os contornos existem para não perder as estações seguintes; eles **não** substituem
o passo contornado:

- **BOM (BUG-01):** a BOM foi gravada direto em `bill_of_materials` /
  `bill_of_material_items`. A explosão, o custeio e os gates G2/G3/G16 consomem
  essa linha normalmente — a lógica testada é a real; só a **criação pela API** não
  foi provada (ela está quebrada).
- **Venda (BUG-03/BUG-04):** a venda foi criada como `quote` e promovida a
  `confirmed` direto no banco. Portanto **o débito de estoque do produto acabado e a
  geração da conta a receber NÃO foram exercitados**. A estação 9 não pode ser dada
  como validada — apenas NF-e e expedição.

---

## 4. Quebras — erro exato, causa raiz e classificação

Todos os quatro são **novos** (não constam dos 17 gaps de
`PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md`) e todos são a **mesma classe de
defeito**: divergência entre o schema vivo do PostgreSQL e o que os models/migrations
declaram. Passam por `npm run typecheck` e pela suíte unitária (repositórios
mockados) e só aparecem contra o Postgres — exatamente o tipo de falha que este
teste existe para pegar.

### BUG-01 — `POST /api/engineering/bom` responde 500 para qualquer BOM · **P0**

- **Erro:** `null value in column "parent_item_id" of relation "bill_of_material_items" violates not-null constraint`
- **Causa raiz:** `bill_of_material_items.parent_item_id`, `.notes` e
  `.alternative_product_id` estão `NOT NULL` **sem default** no banco. O model
  `server/src/models/BillOfMaterialItem.ts` declara as três como nuláveis
  (`defaultValue: null` / sem `allowNull: false`) e `BomService.createBOM`
  (`server/src/services/bomService.ts`, ~linha 118) nunca as preenche.
- **Agravante:** as mesmas colunas têm FK `ON DELETE SET NULL`
  (`fk_bom_items_parent_item_id`, `fk_bom_items_alternative_product_id`) — `SET NULL`
  numa coluna `NOT NULL` é autocontraditório e provaria que o `NOT NULL` é indevido.
- **Onde nasceu:** nenhuma migration versionada cria a tabela ou aplica esse
  `NOT NULL`; o dump documental `docs/database/schema.sql` mostra
  `parent_item_id integer` (nulável). É **drift**, provavelmente resíduo do antigo
  `sequelize.sync({alter})` (o bootstrap `server/config/db.ts` hoje proíbe DDL
  automático, mas o histórico ficou no banco).
- **Impacto:** **não é possível cadastrar estrutura de produto pelo sistema.** Sem
  BOM ativa não há OP, não há MRP de produção e não há custeio. No banco do dono
  existem 1 `bill_of_materials` e **0 `bill_of_material_items`**, coerente com isso.
- **Correção sugerida:** migration `ALTER COLUMN ... DROP NOT NULL` nas três colunas
  (alinhar ao model, que é o comportamento pretendido).

### BUG-02 — `POST /api/clients` responde 500 para qualquer payload · **P0**

- **Erro:** `null value in column "cnae" of relation "clients" violates not-null constraint`
- **Causa raiz:** `clients.cnae` (e mais `cep`, `street`, `number`, `complement`,
  `neighborhood`, `city`, `state`, `tax_regime`, `ie`, `im`) são `NOT NULL` sem
  default. `createClientSchema` é `.strict()` e **não aceita `cnae`** — não existe
  payload válido capaz de criar um cliente.
- **Impacto:** **nenhum cliente pode ser cadastrado.** `clients` no banco do dono:
  **0 linhas**. Por consequência, nenhuma venda pode existir.
- **Observação:** o teste `sale-nfe-issuance.test.ts` (já no repositório) cria
  cliente com `{name, cpf_cnpj, state}` — ele está vermelho contra qualquer banco
  atual; a suíte de integração provavelmente não roda há tempos.

### BUG-03 — `POST /api/sales` responde 500 para qualquer venda · **P0**

- **Erro:** `null value in column "nfe_number" of relation "sales" violates not-null constraint`
- **Causa raiz:** `sales.nfe_number` e `sales.nfe_key` são `NOT NULL` sem default,
  mas só são preenchidos na **emissão** da NF-e; `CreateSaleUseCase` não os envia.
- **Impacto:** **nenhum pedido de venda pode ser criado.** `sales` no banco do dono:
  **0 linhas**. Order-to-Cash está interrompido na origem.

### BUG-04 — confirmar venda responde 500 (conta a receber) · **P0**

- **Erro:** `null value in column "payment_date" of relation "accounts_receivable" violates not-null constraint`
- **Causa raiz:** `accounts_receivable.payment_date`, `payment_method`,
  `invoice_number`, `barcode`, `pix_key`, `protest_date`, `negativation_date` e
  `notes` são `NOT NULL` sem default. `ChangeSaleStatusUseCase` (~linha 180) cria a
  parcela só com `sale_id/customer_id/amount/due_date/status`.
- **Impacto:** **nenhuma conta a receber pode ser gerada** → `quote → confirmed`
  sempre falha → não há débito de estoque de venda nem financeiro de vendas.

### BUG-05 — trilha de auditoria perdida silenciosamente · **P1**

- **Erro (log do container, nível `critical`):**
  `Falha ao gravar audit log apos retry` /
  `invalid input value for enum enum_audit_logs_action: "update_status"` — e também
  `"convert"`, `"register_tracking"`, `"receive"` durante esta execução.
- **Causa raiz:** o enum `enum_audit_logs_action` tem **15 valores**
  (`create, update, delete, soft_delete, login, logout, password_change,
  status_change, approve, reject, price_change, salary_change, export, import,
  print`), mas o código usa **43 literais distintos** em `logAction`. **28 nunca
  gravam**: `access_denied, acknowledge, activate, assign, award, cancel, close,
  confirm, convert, convert_to_production_order, convert_to_requisition, deactivate,
  decision, fulfill, invite_suppliers, mrp_auto_convert_to_requisition, obsolete,
  post, read, read_sensitive, receive, register_quote, register_tracking, release,
  resolve, reverse, review, revoke, rework, settle, terminate, update_shifts,
  update_status, upsert, verify_identity`.
- **Por que é grave e invisível:** o `auditLogService` engole a falha (retry + log
  `critical`) — a requisição responde **200** normalmente. Aprovar requisição,
  converter em pedido, liberar lote, receber importação: **nada disso fica
  registrado**. É o mesmo padrão de falha já documentado em
  `ESTADO_SESSAO_2026-08-09.md` §2 achado B ("literal de enum que passa por typecheck
  e por 1200+ testes").
- **Correção sugerida:** migration `ALTER TYPE ... ADD VALUE` para os 28 faltantes
  (ou normalizar a coluna para `VARCHAR` com validação na aplicação) **+** um teste
  que compare os literais usados no código com os valores do enum.

---

## 5. Achado de governança — o banco de teste está mais quebrado que o de dev

`erp_evok_audio_test` tem **29 colunas `NOT NULL` que não existem assim em
`erp_evok_audio`**, com as mesmas 150 migrations aplicadas:

```
clients.city_ibge_code
non_conformities.asset_id
purchase_orders.nfe_key, nfe_series, nfe_xml_path, nfe_registered_by, nfe_registered_at
sale_items.cfop, icms_cst, icms_aliquot, icms_base, icms_value, ipi_cst, ipi_aliquot,
           ipi_value, pis_cst, pis_aliquot, pis_value, cofins_cst, cofins_aliquot, cofins_value
sales.nfe_series, nfe_protocol, nfe_environment, nfe_provider_ref, nfe_xml_url,
      nfe_danfe_url, nfe_error_message, nfe_issued_at
```

Consequências:

1. `npm run test:integration:strict` roda contra um schema que **não é o do
   sistema** — passar lá não significa funcionar, e falhar lá pode ser artefato.
   Com esse drift, a corrente morre já na estação 4 (criar pedido de compra é
   impossível), daí **6/26** contra **22/26** no ambiente real.
2. Nenhum dos dois bancos pode ser reconstruído a partir das migrations. **O schema
   real não é reproduzível** — isso é um bloqueador para o Go-Live (não há como
   provisionar o servidor de produção com o mesmo schema).

**Recomendação:** antes de qualquer nova feature, (a) migration versionada
corrigindo os `NOT NULL` indevidos, (b) recriar `erp_evok_audio_test` **do zero
apenas por migrations** e (c) um teste de guarda que compare
`information_schema.columns` com os `allowNull` dos models.

---

## 6. Gates de regressão — o que NÃO pode acontecer

Todos exercitados na execução principal. **8/8 provados fechados.**

| Gate | Resultado | Evidência (resposta real) |
|---|---|---|
| **G2** — concluir OP **sem BOM ativa** falha | ✅ | BOM posta em `inactive` → `PUT /status {completed}` → **422**: *"o produto não tem estrutura (BOM) ativa … concluir assim faria o produto acabado entrar em estoque com custo zero"*. OP permaneceu `in_progress`; nada consumido. |
| **G2** — concluir OP com **quantidade zero** falha | ⚠️ ✅ com ressalva | `{quantity_produced: 0}` → **400** (`Payload invalido`), barrado pelo Zod (`decimalQuantity.positive()`) antes de chegar à regra. **A `BusinessRuleError` de G2 é inalcançável via HTTP** — é defesa em profundidade, não o gate efetivo. Omitir o campo também não chega lá: `transitionTo` assume `quantity_produced = quantity` planejada. O comportamento externo está correto (falha), mas quem ler o código pensando que o 422 é o guarda ativo se engana. |
| **G3** — uma OP não libera/consome a reserva de outra | ✅ | 2 OPs de 10 un liberadas → `reserved_quantity` = 40. Cancelar a 2ª → **0 reservas ativas da 2ª**, **1 reserva de 20 un intacta na 1ª**, `reserved_quantity` = 20 (não 0, não 40). Nada de canibalização. |
| **G16** — OP via MRP valida material igual ao manual | ✅ | Subconjunto com BOM ativa e componente com estoque 0, ligado a um pai por `item_estruturas`; `POST /api/mrp/plan` gerou a ordem planejada; `POST /api/mrp/planned-orders/convert-to-production` → **422**: *"Não há material mínimo disponível para produzir 5 de 'E2E Conjunto Magnético' … converta primeiro as ordens planejadas de matéria-prima em Requisição de Compra"*. |
| **G8** — teste acústico reprovado abre NC sozinho | ✅ | `POST /api/laboratory/tests` (`result: 99`, faixa 7–9, **sem** `create_rnc_on_fail`) → 201 com `passed: false` e `non_conformity_id` preenchido; a NC aparece em `GET /api/quality/non-conformities?product_id=…`. |
| **G12** — a mesma requisição não gera dois pedidos | ✅ ⚠️ | 2ª chamada a `/convert` → **422**. Ressalva: quem barrou foi a **máquina de estados** (*"Requisição precisa estar aprovada … (status atual: ordered)"*), não o filtro de saldo por item. O filtro de saldo cobre o cenário de **adjudicação parcial de cotação (RFQ)**, que não foi exercitado aqui. |
| **G15** — requisição chega a `received` | ✅ | Após o recebimento total, `GET /api/purchase-requisitions/:id` → `status: "received"` (o estado morto foi de fato acionado). |
| **G14** — importação cria lote em quarentena | ✅ | Processo COMEX criado (US$, câmbio 5,20, frete/seguro, tributos calculados), `tracking` `shipped → arrived → customs_cleared`, `receive` → lote `IMP-2026-XXXX-ITEM<n>-R001` com **`status: quarantine`** e 40 un no depósito INSUMOS, custo nacionalizado R$ 49,05/un. |

---

## 7. Outros achados (menores, sem quebra)

| # | Achado | Nota |
|---|---|---|
| OBS-01 | `GET /api/inventory/lots?product_id=X` **sem** `status` assume `status='available'` (compatibilidade retroativa documentada em `ListLotsUseCase`). Um lote em quarentena fica invisível nessa consulta — armadilha fácil para quem integra (custou um falso negativo nesta validação). | Comportamento intencional; vale destacar na `API.md`. |
| OBS-02 | O motor de MRP (`explodeBomRequirements`) planeja **apenas os componentes** da demanda, **nunca o próprio item demandado**. Demanda de um `PRODUTO_ACABADO` sem estrutura filha devolve plano vazio. Só existe ordem planejada de fabricação quando um `SUBCONJUNTO` aparece como componente. | Reforça o G17 já mapeado ("MRP não lê carteira"): hoje o MRP não sabe planejar a produção do que foi vendido. |
| OBS-03 | `POST /api/comex/import-processes/:id/receive` e `/tracking` respondem **201**, não 200 — inconsistente com o resto dos endpoints de transição de estado (que usam 200). | Cosmético; alinhar contrato/documentação. |
| OBS-04 | A OP não vai de `released` direto a `completed` (`STATUS_TRANSITIONS` exige `in_progress`). Correto, mas nenhum documento da cadeia menciona esse passo obrigatório. | Documentar no manual/UC. |
| OBS-05 | O erro 500 devolve sempre `"Erro ao processar operação no banco de dados."` e, com `NODE_ENV=test`, o `errorHandler` **não loga nada** a menos que `DEBUG_ERRORS=true`. Diagnosticar os 4 bugs acima exigiu ligar essa flag e reproduzir o `INSERT` fora da API. | Considerar logar sempre `err.original.message` no servidor (nunca ao cliente). |

---

## 8. Dados de teste criados e como limpar

Todo registro criado carrega o prefixo `E2E-` (códigos/lotes) ou `E2E ` (nomes),
mais um sufixo `Date.now()` por execução. Foram **4 execuções** contra
`erp_evok_audio` durante o diagnóstico.

Volume atual no banco do dono:

| Tabela | Linhas `E2E` |
|---|---|
| `products` | 17 |
| `items` | 15 |
| `suppliers` | 4 |
| `clients` | 4 (criados pelo contorno) |
| `bill_of_materials` (+ itens) | 7 |
| `purchase_requisitions` | 4 |
| `purchase_orders` (+ itens) | 5 |
| `lot_controls` | 10 (inclui `IMP-*`) |
| `production_orders` (+ reservas/consumos) | 8 |
| `sales` (+ itens) | 3 |
| `import_processes` (+ itens) | 4 |
| `acoustic_test_results` | 4 |
| `non_conformities` | 4 |
| `mrp_ordens_planejadas` / `item_estruturas` | 4 / 4 |

**Nada foi apagado e nenhum dado pré-existente foi alterado.** Nenhum usuário novo
foi criado em `erp_evok_audio`; nenhuma senha foi alterada.

### Script de limpeza (revisar antes de rodar — ordem importa por causa das FKs)

Rodar da raiz do repositório, dentro de uma transação, conferindo os `SELECT`
equivalentes antes de cada `DELETE`:

```sql
BEGIN;

-- 1) Venda
DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE notes LIKE 'E2E%');
DELETE FROM accounts_receivable WHERE sale_id IN (SELECT id FROM sales WHERE notes LIKE 'E2E%');
DELETE FROM sales WHERE notes LIKE 'E2E%';
DELETE FROM clients WHERE name LIKE 'E2E %';

-- 2) Qualidade / laboratório
--    ATENÇÃO: existe uma NC REAL de 2026-08-03 (id 3) que casa com o mesmo
--    texto. O recorte por data é obrigatório aqui.
DELETE FROM acoustic_test_results WHERE notes LIKE 'E2E%';
DELETE FROM non_conformities
 WHERE description LIKE 'Reprovacao no teste de laboratorio "impedance"%'
   AND created_at >= DATE '2026-08-10';

-- 3) Produção
DELETE FROM production_lot_consumptions WHERE production_order_id IN
  (SELECT id FROM production_orders WHERE notes LIKE 'E2E%');
DELETE FROM production_order_reservations WHERE production_order_id IN
  (SELECT id FROM production_orders WHERE notes LIKE 'E2E%');
DELETE FROM serial_numbers WHERE production_order_id IN
  (SELECT id FROM production_orders WHERE notes LIKE 'E2E%');
DELETE FROM lot_controls WHERE production_order_id IN
  (SELECT id FROM production_orders WHERE notes LIKE 'E2E%');
DELETE FROM production_orders WHERE notes LIKE 'E2E%';

-- 4) COMEX
DELETE FROM import_process_items WHERE import_process_id IN
  (SELECT id FROM import_processes WHERE notes LIKE 'E2E%');
DELETE FROM import_processes WHERE notes LIKE 'E2E%';

-- 5) Compras / recebimento
DELETE FROM lot_controls WHERE lot_number LIKE 'E2E-%' OR lot_number LIKE 'IMP-2026-%';
-- A AP gerada no recebimento NÃO carrega o prefixo E2E (descrição
-- "Fornecimento PO PO-<timestamp>"); o recorte é pelo pedido de origem.
DELETE FROM accounts_payable WHERE description IN (
  SELECT 'Fornecimento PO ' || order_number FROM purchase_orders WHERE notes LIKE '%E2E%'
);
DELETE FROM purchase_order_items WHERE purchase_id IN
  (SELECT id FROM purchase_orders WHERE notes LIKE '%E2E%');
DELETE FROM purchase_orders WHERE notes LIKE '%E2E%';
DELETE FROM purchase_requisition_items WHERE requisition_id IN
  (SELECT id FROM purchase_requisitions WHERE notes LIKE 'E2E%');
DELETE FROM purchase_requisitions WHERE notes LIKE 'E2E%';

-- 6) MRP / estrutura nova
DELETE FROM mrp_ordens_planejadas WHERE item_id IN (SELECT id FROM items WHERE codigo LIKE 'E2E-%');
DELETE FROM item_estruturas WHERE item_pai_id IN (SELECT id FROM items WHERE codigo LIKE 'E2E-%')
   OR item_componente_id IN (SELECT id FROM items WHERE codigo LIKE 'E2E-%');

-- 7) Estrutura legada (BOM) e cadastros
DELETE FROM bill_of_material_items WHERE bom_id IN
  (SELECT id FROM bill_of_materials WHERE notes LIKE 'Contorno BUG-01%');
DELETE FROM bill_of_materials WHERE notes LIKE 'Contorno BUG-01%';
DELETE FROM product_cost_ledgers WHERE product_id IN (SELECT id FROM products WHERE code LIKE 'E2E-%');
DELETE FROM inventory_movements WHERE product_id IN (SELECT id FROM products WHERE code LIKE 'E2E-%');
DELETE FROM product_warehouse_stock WHERE product_id IN (SELECT id FROM products WHERE code LIKE 'E2E-%');
DELETE FROM item_suppliers WHERE item_id IN (SELECT id FROM items WHERE codigo LIKE 'E2E-%');
DELETE FROM items WHERE codigo LIKE 'E2E-%';
DELETE FROM products WHERE code LIKE 'E2E-%';
DELETE FROM suppliers WHERE company_name LIKE 'E2E %';

-- COMMIT;  -- confira os row counts antes de confirmar
ROLLBACK;
```

> ⚠️ `lot_controls` aparece duas vezes de propósito (lotes gerados por OP e lotes de
> recebimento/importação).
>
> ⚠️ **`non_conformities` tem uma NC REAL do dono (id 3, 2026-08-03) com descrição
> quase idêntica** (`Reprovacao no teste de laboratorio "thd"`). Por isso o `DELETE`
> filtra por `"impedance"` **e** `created_at >= 2026-08-10`. Não remova o recorte
> de data.

---

## 9. Conclusão

A corrente **não fecha hoje**, mas não pelos motivos que a auditoria de 2026-08-09
previa: as regras de negócio corrigidas naquele dia (G2, G3, G8, G12, G14, G15, G16)
estão **todas funcionando** e foram provadas contra o banco real. O que impede o
"insumo até produto expedido" é uma camada abaixo — **o schema do banco divergiu dos
models e das migrations**, e três operações básicas do dia a dia (cadastrar
estrutura de produto, cadastrar cliente, criar pedido de venda) respondem 500 em
100% das tentativas.

Prioridade sugerida:

1. **BUG-01 a BUG-04** (P0) — uma migration versionada resolve os quatro
   (`DROP NOT NULL` nas colunas indevidas), com o cuidado de alinhar model ↔ banco
   coluna a coluna, não só nas que apareceram aqui.
2. **BUG-05** (P1) — enum de auditoria; trilha perdida hoje.
3. **§5** (P1) — recriar o banco de teste apenas por migrations e adicionar guarda
   de conformidade schema ↔ model, senão o problema volta.
4. Reexecutar este teste; a meta é **26/26 sem contorno nenhum**.
