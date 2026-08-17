# T-36 — Validação adversarial dos 3 HIGH de `T-35`

| Campo | Valor |
|---|---|
| Run | `ERP-LEGACY-001-AUD-001` |
| Trilha | `T-36` (validação de `T-35_C137_SEMANTICA_COLUNA_LOTE2.md` §4) |
| `AUDIT_COMMIT` | `c1311a6f76b512fef893f7e60d934179cae3409f` |
| Organização | VeriCore — `vericore-finding-validator` |
| Natureza | Auditoria **estática** — refutação ativa (Regra 22, §22 Master Spec) |
| Banco acessado | **NENHUM** — `APR-2026-016` íntegra. Nenhuma conexão, nenhum `SELECT`, nenhuma contagem de linhas. |
| Artefatos não alterados | `T-35`, `T-31`, `T-13`, `T-03`, `T-27` (Regra 15) |
| Escopo | `T35-EST-F01`, `T35-RH-F02`, `T35-PAT-F03` + divergência `T-35:420` (§10 item 1) |

> **Mandato desta trilha:** tentar **derrubar** cada HIGH. Hipóteses refutadoras foram formuladas
> antes de buscar evidência e o resultado de cada uma está registrado, **inclusive as que falharam** —
> refutação que falha é evidência de sustentação, não ruído.

> Nenhuma severidade é **alterada** aqui: severidade é recomendada ao
> `vericore-software-audit-director` (Regra 18). Nenhum `FINDING CLOSED`, nenhum `RETEST_PASSED`,
> nenhum finding novo criado (autoridade dos auditores de origem).

---

## 1. Quadro-resumo dos vereditos

| Finding | Severidade proposta em `T-35` | Veredito `T-36` | Severidade que a evidência sustenta | Refutações que **falharam** | Refutações que **procederam** |
|---|---|---|---|---|---|
| `T35-EST-F01` | HIGH | **CONFIRMED com refutação parcial** | **HIGH** (mantida) | 3 de 4 | 1 de 4 — corrige o **caminho**, não o defeito |
| `T35-RH-F02` | HIGH | **CONFIRMED — reforçado** | **HIGH** (mantida; evidência agora é operacional, não declaratória) | 3 de 3 | nenhuma |
| `T35-PAT-F03` | HIGH | **CONFIRMED com refutação parcial** | **MEDIUM** (rebaixamento recomendado) | 2 de 3 | 1 de 3 — **elimina o consumidor**, mantém a contradição |

**Nenhum dos três é FALSE_POSITIVE. Nenhum é NEEDS_MORE_EVIDENCE.** Todos são
tecnicamente demonstráveis por artefato versionado, sem "pode haver um problema".

---

## 2. `T35-EST-F01` — quatro precisões de quantidade

### Veredito: `CONFIRMED` com refutação parcial · Severidade sustentada: **HIGH**

### 2.1 Hipótese refutadora **H1** — "existe arredondamento explícito ou conversão declarada que torne a perda impossível"

**RESULTADO: REFUTAÇÃO FALHOU.** Não existe.

- `server/src/modules/purchases/**` — nenhum `round`/`toFixed` sobre quantidade. As três únicas
  ocorrências são monetárias ou de mensagem: `purchasePayableRules.ts:78` (`Math.round(quantity * toCents(unitPrice))` — arredonda **o produto em centavos**, não a quantidade),
  `ChangePurchaseStatusUseCase.ts:211` e `ApprovePurchaseUseCase.ts:108` (ambos `toFixed(2)` em **string de mensagem de erro**).
- `server/src/services/**` — `costingService.ts:65` (`Math.round(value * 10000) / 10000`) arredonda **custo** a 4 casas;
  `bomService.ts:691` `toFixed(2)` é **texto de sugestão de compra**; `uploadService.ts:150` é tamanho de arquivo.
  **Nenhum arredondamento de quantidade em nenhum ponto da cadeia.**
- `ReceivePurchaseItemsUseCase.ts:144` — `const qty = parseFloat(received.quantity)` — sem normalização de escala.

**Consequência:** onde há perda, ela é **silenciosa, feita pelo `numeric(p,s)` do PostgreSQL**, sem
arredondamento auditável em aplicação. Isso é pior que o cenário refutador, não melhor.

### 2.2 Hipótese refutadora **H2** — "`PurchaseItem.quantity` (10,2) realmente alimenta `InventoryMovement.quantity` (18,6), ou há camada entre eles?"

**RESULTADO: REFUTAÇÃO PROCEDEU — o caminho descrito em `T-35:139` está errado.** Existe camada, e ela desvia o dado.

`ReceivePurchaseItemsUseCase.ts:181-184`:

```
await MaterialReceiptService.receiveMaterialIntoQuarantine({
  productId: item.product_id,
  quantity: qty,        // <- qty vem do PAYLOAD (:144), NAO de item.received_quantity
```

O que entra no estoque é `qty`, a quantidade **do payload da requisição**, não a coluna
`received_quantity (10,2)`. **A frase de `T-35:139` — "`PurchaseItem.received_quantity` (10,2) …
alimenta `InventoryMovement.quantity` (18,6)" — é imprecisa e deve ser corrigida na
remediação/consolidação.**

**Mas a refutação, ao proceder, expõe um defeito pior — e é este que sustenta o HIGH:**

`ReceivePurchaseItemsUseCase.ts:154-162`:

```
const currentReceived = parseFloat(item.received_quantity) || 0;   // le a coluna JA truncada em (10,2)
const maxReceivable  = parseFloat(item.quantity) - currentReceived;
if (qty > maxReceivable) throw new BusinessRuleError(...)
const newReceived = currentReceived + qty;                          // grava de volta em (10,2)
```

O estoque recebe `qty` com 6 casas; o **razão de recebimento** (`received_quantity`) guarda
`currentReceived + qty` **truncado a 2 casas pelo banco**, e o **próximo recebimento parcial lê o
valor truncado**. Ou seja: **`SUM(InventoryMovement.quantity)` de um pedido e
`purchase_order_items.received_quantity` divergem por construção, e a divergência é cumulativa a
cada entrega parcial**, exatamente na coluna que serve de **teto de recebimento** (`:156`) e de
**critério de fechamento do item** (`:161`, `newReceived >= item.quantity`). Recebimento a maior ou
item que nunca fecha são ambos alcançáveis.

### 2.3 Caminho de perda **novo**, não visto por `T-35` — registro obrigatório

`ConvertRequisitionToPurchaseOrdersUseCase.ts:219,226`:

```
const quantity = parseFloat(item.quantity);   // purchase_requisition_items.quantity  DECIMAL(18,6)
...
return { product_id: ..., quantity, unit_price: unitPrice, ... };   // -> purchase_order_items.quantity DECIMAL(10,2)
```

**Requisição (18,6) → pedido (10,2), cópia literal, sem arredondamento, sem validação, sem aviso.**
Como a requisição é o destino do MRP, é a **saída do planejamento** que é truncada ao virar pedido.
Este caminho é mais grave que os dois de `T-35:138-139` porque atravessa um limite de módulo e
porque a origem é calculada, não digitada. **Deve entrar na instrução do finding.**

### 2.4 Hipótese refutadora **H3** — "o negócio compra sempre em peça/caixa; fração < 0,01 não ocorre"

**RESULTADO: REFUTAÇÃO FALHOU, e falhou com evidência do próprio dado de carga.**

- `server/src/services/bomService.ts:149-158` — `UNITS_MAP` do projeto admite
  `'un'`, `'g'`, `'kg'`, `'m'`, `'cm'`, `'l'`, `'ml'`, `'m2'`. Unidades de massa, volume e
  comprimento são **cidadãs de primeira classe** da estrutura de produto.
- `server/src/models/BillOfMaterialItem.ts:57` — `unit … comment: 'Unidade: un, g, kg, m, l'`.
- `server/src/models/Product.ts:75` e `server/src/models/Item.ts:67` — unidade é **string livre**
  (`STRING(10)` / `STRING(12)`), sem domínio imposto.
- **Prova material, na carga real** — `docs/carga-inicial/insumos-materia-prima.csv`:
  - `:178` `MP-178;COLA BORRACHA 5032-P ZBOND 19G - REPARO;…;UN;…;G;SIM;` — motivo declarado:
    *"Unidade: cola vendida em 19G cadastrada como UN — **a BOM consome grama, nao unidade**"*;
  - `:82` e `:197` (`MP-082`, `MP-197`, cola Loctite BO1KG) — *"**unidade deveria ser KG**"*.

Um insumo em `kg` cuja BOM consome gramas gera quantidade da ordem de `0,019 kg` —
**abaixo da resolução de `numeric(10,2)`, que a arredonda para `0,02` (+5,3 %)**. Se a unidade for
corrigida para `KG`/`G` como a própria carga determina, a perda deixa de ser hipotética.
**A refutação não só falha: o artefato de carga contém a instrução que a torna impossível.**

### 2.5 Hipótese refutadora **H4** — "o model está desatualizado; a migration tem outra precisão"

**RESULTADO: REFUTAÇÃO FALHOU. DDL e model são idênticos.**

`server/database/postgresql/00_baseline_frozen.sql`:

| Objeto | DDL | Model | Confere? |
|---|---|---|---|
| `purchase_order_items.quantity` | `:11443` `numeric(10,2) NOT NULL` | `PurchaseItem.ts:32` `DECIMAL(10,2)` | **sim** |
| `purchase_order_items.received_quantity` | `:11446` `numeric(10,2) DEFAULT 0 NOT NULL` | `PurchaseItem.ts:35` `DECIMAL(10,2)` | **sim** |
| `inventory_count_items.system_quantity` | `:6856` `numeric(12,3)` | `InventoryCountItem.ts:39` | **sim** |
| `inventory_count_items.counted_quantity` | `:6857` `numeric(12,3)` | `InventoryCountItem.ts:40` | **sim** |
| `inventory_count_items.variance_quantity` | `:6858` `numeric(12,3)` | `InventoryCountItem.ts:41` | **sim** |
| `sale_lot_shipments.quantity` / `quantity_returned` | — | `SaleLotShipment.ts:72-73` `DECIMAL(12,4)` | model confirmado |

**Não há desatualização.** As quatro precisões existem no banco congelado.
Efeito colateral favorável ao finding: o critério de reteste de `T-35:145` (exigir escala ≥ 6
**no model e na migration**) é executável e não é redundante.

### 2.6 Achado adicional — nulabilidade divergente entre model e DDL

`PurchaseItem.ts:35` declara `received_quantity` **sem `allowNull`** (default Sequelize = `true`);
o DDL `00_baseline_frozen.sql:11446` a declara `NOT NULL`. Divergência model × banco na mesma
coluna do finding. **Fora do escopo de `C-137`; registrado para o auditor de schema, não instruído aqui.**

### 2.7 Conclusão e efeito na remediação

**CONFIRMED · HIGH sustentada.** Três de quatro refutações falharam; a que procedeu **corrigiu o
caminho e agravou o defeito**. O que muda na instrução para a SanaCore:

1. **Corrigir a redação de `T-35:139`** — `received_quantity` não alimenta `InventoryMovement`.
2. **Substituir por dois caminhos provados:** (a) divergência cumulativa
   `SUM(InventoryMovement.quantity)` × `received_quantity` em recebimento parcial
   (`ReceivePurchaseItemsUseCase.ts:154-162,181-184`); (b) truncamento
   requisição (18,6) → pedido (10,2) (`ConvertRequisitionToPurchaseOrdersUseCase.ts:219,226`).
3. **Ampliar o critério de reteste de `T-35:145`** para incluir
   `purchase_requisition_items.quantity` → `purchase_order_items.quantity` como par de escala.
4. **Pré-requisito de negócio:** a correção de unidade pendente em
   `docs/carga-inicial/insumos-materia-prima.csv:82,178,197` (`revisar=SIM`) e a remediação de
   precisão são **a mesma decisão** e devem ser sequenciadas juntas — corrigir a unidade para `KG`/`G`
   **sem** corrigir a precisão converte um risco latente em perda ativa.

---

## 3. `T35-RH-F02` — `employees.salary` × `salary_type`

### Veredito: `CONFIRMED` — **reforçado** · Severidade sustentada: **HIGH**

### 3.1 Hipótese refutadora **H1** — "nenhum código soma `salary` cegamente; o impacto é declaratório"

**RESULTADO: REFUTAÇÃO FALHOU, e a falha é a evidência mais forte do finding.**

Existe **exatamente um** consumidor aritmético de `employees.salary` no servidor, e ele é
**cego à unidade**:

`server/src/modules/rh/domain/services/benefitRules.ts:22-28`

```
export function validateVtDiscountLimit(discountValue: number, salary: number): void {
  const limit = salary * VT_DISCOUNT_LIMIT_PERCENT;      // :8  VT_DISCOUNT_LIMIT_PERCENT = 0.06
  if (discountValue > limit) throw new Error(`VT_DISCOUNT_LIMIT_EXCEEDED: ...`);
}
```

Chamado em `CreateEmployeeBenefitUseCase.ts:70`:
`validateVtDiscountLimit(Number(input.discount_value), Number(employee.salary))`.

O limite de 6 % de vale-transporte (`RF-RH-052`, doc. do próprio módulo em `benefitRules.ts:7,14`)
é, por natureza legal, **6 % do salário-base mensal**. A função **não lê `salary_type`**. Para
`salary_type = 'horista'`, `salary` é valor/hora e o limite calculado é 6 % de um valor-hora —
**duas ordens de grandeza abaixo do correto**, o que **rejeita adesões legítimas de VT de horistas**.
O `comment` do use case (`CreateEmployeeBenefitUseCase.ts:3`) chega a documentar que o salário é
lido do repositório *"nunca aceito no payload — evita spoofing"*: o controle **anti-spoofing existe
e está correto**; o controle **de unidade não existe**.

Isto move `T35-RH-F02` de "risco de soma futura" para **defeito funcional presente, com função,
arquivo, linha e regra de negócio nomeados**. É o oposto de refutação.

> **Sinalização ao `vericore-software-audit-director`:** este caminho pode merecer finding próprio
> (defeito funcional de RH), distinto do finding semântico de `C-137`. **Não o crio** — não é
> autoridade deste agente. Registrado como evidência de `T35-RH-F02` e como recomendação de
> abertura pelo auditor de origem.

### 3.2 Hipótese refutadora **H2** — "há `comment` na migration que o model não repete"

**RESULTADO: REFUTAÇÃO FALHOU. O DDL é idêntico ao model, e igualmente vazio.**

- `00_baseline_frozen.sql:4924` — `COMMENT ON COLUMN public.employees.salary IS 'Salário';`
  — **exatamente o mesmo texto de `Employee.ts:65`**, sem periodicidade.
- `00_baseline_frozen.sql:4868` — `salary_type … NOT NULL` — e **nenhum `COMMENT ON COLUMN
  public.employees.salary_type` existe no baseline**. Confirmado por busca dirigida.
- Contraste que prova que a disciplina existe e não foi aplicada aqui:
  `20260808-000010-create-hr-job-positions.cjs:50,53` e
  `20260808-000013-create-hr-employee-job-history.cjs:85` **emitem `COMMENT ON COLUMN`** para as
  colunas de salário **dessas** tabelas (classificação de sensibilidade, `RF-RH-006`/`BR-RH-020`).
  A migration de RH sabe comentar coluna salarial; `employees.salary` ficou de fora.

**A refutação não só falha: a evidência buscada para derrubar o finding fortalece-o**, porque
mostra convenção existente e não aplicada — descartando "não é o padrão do projeto".

### 3.3 Hipótese refutadora **H3** — "`salary_type = 'comissionado'` não tem consumidor algum"

**RESULTADO: REFUTAÇÃO PROCEDE quanto ao fato, mas NÃO reduz o finding — inverte-o.**

Busca exaustiva por `horista|comissionado|salary_type` em todo o repositório: **nenhum ramo de
lógica de negócio em nenhum dos três valores**. As ocorrências são, sem exceção:

| Categoria | Evidência |
|---|---|
| Declaração de tipo/enum | `Employee.ts:27,66`; `models.d.ts:278`; `client/src/api/employees.ts:26,53,113,145`; `00_baseline_frozen.sql:399-402` |
| CRUD passa-adiante | `CreateEmployeeUseCase.ts:23,65,97`; `UpdateEmployeeUseCase.ts:22` |
| Lista de campo sensível | `employeeSensitiveFields.ts:42` |
| Dropdown de UI | `EmployeesTab.tsx:277,467-470` |
| Fixtures de teste | 4 arquivos, **todos com `salary_type: 'mensal'`** |
| Documentação | `docs/rh/01-FUNCIONARIOS.md:31`; `docs/arquitetura/API.md:3825` |

**Nenhum `if`, `switch`, `case` ou mapa sobre `salary_type` em `server/src`.**

Leitura correta desse fato: `salary_type` é **coluna declarativa pura**, enquanto `salary` **é
consumida aritmeticamente** (§3.1). É precisamente a combinação que produz o defeito — o
discriminador de unidade existe, é preenchível pela UI (`EmployeesTab.tsx:469-470` oferece
"Horista" e "Comissionado" ao usuário), e **nenhum consumidor o lê**. Se `salary_type` não existisse,
haveria uma única unidade implícita e o cálculo de VT estaria certo por sorte. Ele existe, é
selecionável, e é ignorado.

**Nota:** todas as 4 fixtures usarem `'mensal'` significa que **a suíte de testes não exercita
`'horista'` nem `'comissionado'`** — o defeito de §3.1 é invisível para os testes existentes.
Isso é agravante de detectabilidade, não atenuante de severidade.

### 3.4 Achado adicional — a base de conversão existe e não é usada

`Employee.ts:72` / `00_baseline_frozen.sql:4874` — `work_hours_weekly INTEGER DEFAULT 44 NOT NULL`.
É a base que permitiria normalizar horista → mensal. Busca exaustiva:
**`work_hours_weekly` aparece apenas em `Employee.ts:33` e `:72` — declarado, nunca lido.**
A remediação tem insumo disponível; a ausência é de lógica, não de dado.

### 3.5 Conclusão e efeito na remediação

**CONFIRMED · HIGH sustentada, com base probatória mais forte que a original.** Nenhuma das três
refutações reduziu o finding; duas o ampliaram. O que muda na instrução:

1. O critério de reteste de `T-35:162` (`comment` na migration) é **necessário mas insuficiente**:
   comentar a coluna não corrige `validateVtDiscountLimit`.
2. Acrescentar ao critério: `validateVtDiscountLimit` deve receber **salário mensal normalizado**
   (ou `salary` + `salary_type` + `work_hours_weekly`) e ter **teste cobrindo `'horista'` e
   `'comissionado'`** — hoje nenhuma fixture usa esses valores.
3. Decisão de negócio **humana e prévia** (Regra 18, não inferível de artefato): o que
   `salary` significa para `salary_type = 'comissionado'`. Nenhum artefato versionado responde;
   a SanaCore **não pode arbitrar** (Regra 6). Isto é gate humano antes da remediação.

---

## 4. `T35-PAT-F03` — `assets.current_value`

### Veredito: `CONFIRMED` com refutação parcial · Severidade sustentada: **MEDIUM** (rebaixamento recomendado)

### 4.1 Hipótese refutadora **H1** — "a busca por rotina de depreciação não foi exaustiva"

**RESULTADO: REFUTAÇÃO FALHOU. Busca independente e ampliada confirma a ausência.**

Busca `deprecia|amortiz|useful_life|current_value|residual|baixa_ativo|write_off`, case-insensitive,
sobre **todo** `server/` (inclui `server/migrations/`, `server/scripts/`, `server/tests/`, não só `src/`):

| Ocorrência | Natureza | É rotina? |
|---|---|---|
| `AccountingEntry.ts:25,50`; `accountingEntryValidators.ts:12`; `UpdateEntryUseCase.ts:35`; `CreateEntryUseCase.ts:39`; `20260807-000230:117`; `00_baseline_frozen.sql:83` | valor `'depreciation'` do ENUM `entry_type` | **não** — sem produtor |
| `bomService.ts:42,81`; `bom-tipo-nao-produtivo.test.ts:8`; `FacilityVehicleDetail.ts:12` | **texto de comentário/mensagem** citando depreciação | **não** |
| `layouts240.ts:120,121,195` (`write_off_*`) | campos de layout **CNAB bancário** | **não** — domínio alheio |
| `fixedAssetReceiptService.ts:18,79`; `CreateAssetUseCase.ts:58,81,83`; `UpdateAssetUseCase.ts:23,24` | os 3 escritores já listados em `T-35:173-175` | **não** |
| ~20 ocorrências de `residual` | "risco residual" em docstrings — **falso positivo lexical** | **não** |

**Zero jobs agendados, zero migrations com `UPDATE assets`, zero serviço de depreciação, zero
`baixa`/`amortização` de ativo.** A afirmação de `T-35:177` está correta e agora tem busca
independente e mais ampla por trás.

### 4.2 Achado adicional que **agrava** — o plano de contas provisiona o que ninguém produz

`server/migrations/20260807-000231-seed-accounting-chart-of-accounts.cjs:44`:
`{ code: '1.2.3', name: '(-) Depreciação Acumulada', type: 'asset', acceptEntries: true }`.

A conta contábil de Depreciação Acumulada é **semeada, aceita lançamento**, e o `entry_type`
`'depreciation'` existe no ENUM — **e nenhum código do repositório posta nela**. O ERP declara a
capacidade em **três camadas independentes** (plano de contas, ENUM contábil, cabeçalho
`Asset.ts:7` "Suporta depreciação") e **não a implementa em nenhuma**.

### 4.3 Achado adicional que **agrava** — a migration contradiz o use case

`server/migrations/20260810-000033-fix-nullable-columns-round-3.cjs:124-125`, justificativa
versionada de por que a coluna é nullable:

```
current_value:      'valor contabil so existe apos a primeira depreciacao',
useful_life_months: 'vida util so se aplica a ativo depreciavel',
```

**A migration declara que `current_value` só deve existir após a primeira depreciação.**
`CreateAssetUseCase.ts:83` a preenche com `purchase_value` **no momento da criação** —
antes de qualquer depreciação, que aliás nunca ocorre. **A contradição `comment` × uso é mais
profunda que a apontada em `T-35:179`:** não é só o `comment` do model que mente, é a
**justificativa de nulabilidade registrada na migration** que o código de aplicação viola.
`T-35` usou apenas o model; o DDL sustenta o finding com mais força.

### 4.4 Hipótese refutadora **H2** — "`useful_life_months` é lido em algum lugar"

**RESULTADO: REFUTAÇÃO FALHOU. Grep independente confirma: nunca lido.**

Ocorrências totais: `Asset.ts:29` (tipo), `Asset.ts:57` (declaração), `models.d.ts:315` (tipo),
`CreateAssetUseCase.ts:24,58,81` (entrada e escrita), `UpdateAssetUseCase.ts:24` (lista de
editáveis), `fixedAssetReceiptService.ts:18` (**comentário** dizendo que a NF não carrega o dado),
`00_baseline_frozen.sql:3520` (DDL), `20260810-000033:125` (justificativa de nullable).
**Nenhuma leitura para cálculo. Confirma `T-35:177`.**

### 4.5 Hipótese refutadora **H3** — "existe consumidor que depende de `current_value` ser valor contábil"

**RESULTADO: REFUTAÇÃO PROCEDE. Não existe consumidor algum — a coluna é write-only.**

| Camada | Busca | Resultado |
|---|---|---|
| Módulo de ativos | `current_value` em `server/src/modules/assets/**` | **2 ocorrências, ambas escrita**: `CreateAssetUseCase.ts:83`, `UpdateAssetUseCase.ts:23` (lista de campos editáveis) |
| Serviços | `server/src/services/**` | `fixedAssetReceiptService.ts:79` — **escrita** |
| Relatório / balanço / apólice | todo `server/src` | **nenhuma leitura, nenhuma agregação, nenhum `SUM`** |
| Front-end | `client/src` | **1 ocorrência**: `client/src/api/assets.ts:19`, **declaração de tipo TypeScript**. `client/src/pages/**` — **zero**: a coluna **não é renderizada em nenhuma tela** |

**`assets.current_value` é escrita por três caminhos e lida por nenhum, em todo o repositório.**
Consequência para a severidade: **não há hoje consumidor que tome decisão financeira, contábil ou
patrimonial sobre um valor errado.** O dano é **latente**, não corrente. A frase de `T-35:181` que o
equipara a `AUD-TES-SALDOMANUAL-01` e `AUD-DB-T31-07` **não se sustenta em impacto**: naqueles,
`current_balance` **é lido como posição de caixa** — há consumidor. Aqui não há.

**Como padrão semântico, a equiparação de `T-35:181` continua válida** (é de fato a terceira
ocorrência de "coluna cujo `comment` afirma derivação que nenhum código produz"); **como
severidade, não.** Padrão sistêmico é argumento de consolidação, não de severidade individual.

### 4.6 Conclusão e efeito na remediação

**CONFIRMED · rebaixamento de HIGH para MEDIUM recomendado.**

O defeito é **real, exaustivamente provado e agora com duas evidências novas que o agravam
semanticamente** (§4.2, §4.3). Duas das três refutações falharam. A terceira procedeu e é decisiva
**para a severidade, não para a validade**: HIGH exige impacto demonstrável, e não há consumidor.

O que muda na instrução:

1. **Severidade MEDIUM**, com nota explícita: *"reclassificável para HIGH no instante em que
   qualquer relatório patrimonial, balanço, seguro ou integração contábil passar a ler
   `assets.current_value`"* — a barreira que segura a severidade é **ausência de leitor**, que é
   frágil e não é controle.
2. `DYN-T35-02` (`T-35:396`) **perde prioridade**: sem consumidor, saber se o valor divergiu não muda
   decisão de remediação hoje. Recomenda-se **rebaixar `DYN-T35-02` a opcional**.
3. **Ampliar o critério de reteste de `T-35:183`** com as duas evidências novas: a remediação deve
   reconciliar também (a) `20260810-000033:124` — se não há depreciação, a justificativa de
   nulabilidade registrada na migration é falsa e `CreateAssetUseCase.ts:83` a viola; e
   (b) a conta `1.2.3 (-) Depreciação Acumulada` (`20260807-000231:44`) e o `entry_type`
   `'depreciation'`, que declaram capacidade inexistente.
4. **Decisão humana prévia** (Regra 18): implementar depreciação **ou** renomear/remover a coluna e
   retirar as três declarações de capacidade. Escolha de escopo de produto, não de remediação.

---

## 5. Divergência `T-35` §10 item 1 — "soft delete não existe" (Regra 21)

**Contradição entre artefatos versionados. Fonte autoritativa determinada abaixo.**

### 5.1 As asserções em conflito

| Artefato | Asserção literal | Escopo declarado |
|---|---|---|
| `T-13:78` | *"**Soft delete: não existe.** `deleted_at` tem 0 ocorrências no baseline e 0 em `server/src/models/`. Não há `paranoid: true`. Portanto a responsabilidade 'filtrar soft delete em toda query' **não se aplica**"* | projeto inteiro |
| `T-31:176` | *"**Soft delete não existe no projeto** (`T-13:78`) — não há dever de filtrá-lo **nestas 12 tabelas**"* | 12 tabelas de `T-31` |
| `T-03:98-105` (`AUD-DB-09`) | *"soft delete **CONFIRMADAMENTE ausente**… O ENUM tem o valor `soft_delete` (`auditActions.ts:84`) **para uma capacidade que não existe**"* | projeto inteiro |
| `T-27:71,269` | *"`DELETE /customers/:id/prices/:priceId` — **Soft delete `active = false`** (`DeactivateCustomerPriceUseCase.ts:33-35`)"* | endpoint |
| `T-35:225-238` (`T35-DIN-F06`) | *"correto na letra, insuficiente no efeito — há soft delete por `active`"* | `cost_centers`, `customer_price_lists` |

### 5.2 Verificação independente sobre o código

| Verificação | Resultado |
|---|---|
| `paranoid` \| `deleted_at` em `server/src` | **0 ocorrências** — a **letra** de `T-13:78` é **verdadeira** |
| `CostCenter.ts:33` | `active … comment: 'Desativacao logica (**sem delete fisico**) — registros com lancamentos historicos preservam auditoria'` — **confirmado** |
| `CustomerPriceList.ts:40` | `active … comment: '**Soft delete**'` — **confirmado**, o artefato usa o termo |
| `SequelizeCostCenterRepository.ts:17` | `if (typeof filters.active === 'boolean') where.active = filters.active;` — **confirmado**: sem filtro no input, inativos retornam |
| **`soft_delete` como ação de auditoria emitida** | **3 emissores reais**: `productController.ts:198`, `bomController.ts:212`, `DeactivateUserUseCase.ts:47` |
| Documentação de módulo | `products/README.md:118` *"`soft_delete` → produto inativado"*; `bom/README.md:171` *"`DELETE /:id` → `action: 'soft_delete'`, `newValues: { status: 'inactive' }`"*; `users/README.md:152` *"`soft_delete` registra a transição `active: true → false`"* |

### 5.3 Determinação da fonte autoritativa

**Fonte autoritativa: o código e as migrations versionadas** (`CostCenter.ts:33`,
`CustomerPriceList.ts:40`, `DeactivateCustomerPriceUseCase.ts:33-35`,
`DeactivateUserUseCase.ts:47`, `productController.ts:198`, `bomController.ts:212`), **sobre as
conclusões derivadas de `T-13:78`, `T-31:176` e `T-03:98-105`** — Regra 7 (artefato versionado é a
única fonte oficial) e Regra 20 (evidência antes de derivação).

**Resolução, artefato por artefato:**

1. **`T-13:78`** — **verdadeiro na premissa, excedido na conclusão.** A premissa (`deleted_at` = 0,
   sem `paranoid`) é factual e verificada. A conclusão — *"a responsabilidade 'filtrar soft delete
   em toda query' não se aplica"* — **extrapola**: ela vale para soft delete **por `deleted_at`**,
   não para exclusão lógica por `active`/`status`, que existe e é assim nomeada em 3 módulos.
   **Não é falso positivo nem erro de fato: é generalização indevida do escopo da premissa.**

2. **`T-31:176`** — **correto dentro do escopo que ele próprio declara** (*"nestas 12 tabelas"*).
   Verificação: nenhuma das 12 tabelas de `T-31` é `cost_centers` nem `customer_price_lists`
   (`T-35:44-61` lista ambas como **novas** do Tier A de `T-35`). `T-31:176` **não precisa de
   correção** — precisa apenas **não ser citado fora do escopo dele**.

3. **`T-03:98-105` (`AUD-DB-09`)** — **contém asserção factualmente incorreta**, não vista por `T-35`.
   A frase *"o ENUM tem o valor `soft_delete` para uma **capacidade que não existe**"* é **refutada
   por três emissores ativos** (`productController.ts:198`, `bomController.ts:212`,
   `DeactivateUserUseCase.ts:47`) e por três READMEs que documentam o comportamento. A capacidade
   existe, tem nome próprio no vocabulário de auditoria do projeto e é exercida.
   **Consequência de consolidação:** `AUD-DB-09` é consolidado em `T-26:515` como *"soft delete
   confirmadamente ausente"* dentro do grupo `AUD-DB-04…-09` (MEDIUM ×6). **A instrução desse grupo
   propagaria a asserção incorreta se não for corrigida antes.**

4. **`T35-DIN-F06` / `T-35:420`** — **a divergência levantada por `T-35` procede**, e procede com
   base mais ampla do que a que o autor usou: além de `CostCenter.ts:33` e `CustomerPriceList.ts:40`,
   há o vocabulário `soft_delete` com 3 emissores e o precedente de `T-27:71,269`, que **já havia
   registrado soft delete por `active` na mesma auditoria** — ou seja, a contradição interna do run
   é anterior a `T-35`, que apenas a explicitou.

### 5.4 Efeito, sem alterar artefato de terceiro

- `T-13`, `T-31`, `T-03`, `T-27` e `T-35` **não foram alterados** (Regra 15). Esta seção é o registro
  de resolução previsto em `T-35:238`.
- **Encaminhamento ao `vericore-software-audit-director`:**
  1. instruir o autor de `T-03` a **retificar a asserção de `AUD-DB-09`** *"capacidade que não
     existe"* — três emissores nomeados acima; a retificação é de **redação**, e a severidade do
     grupo `AUD-DB-04…-09` **não é objeto desta trilha**;
  2. instruir o autor de `T-13` a **restringir a conclusão de `:78`** a soft delete por
     `deleted_at`/`paranoid`;
  3. `T-31:176` **dispensa ação** — está no escopo;
  4. **bloquear** o uso de "soft delete não existe" como conformidade genérica em qualquer trilha
     futura ou na consolidação `T-26`.
- **`T35-DIN-F06` permanece `PROPOSED` com severidade MEDIUM proposta pelo autor.** Não é HIGH e
  **não foi validado nesta trilha** — fora do mandato de `T-36`, que cobre os 3 HIGH e esta
  divergência. **Só a divergência foi resolvida, não o finding.**

---

## 6. Achados novos registrados por esta trilha

Registrados por dever de completude, inclusive quando **agravam** o finding (mandato explícito).
**Nenhum é finding novo** — este agente não cria findings. São evidências anexadas aos findings de
origem, para os respectivos autores.

| # | Achado | Evidência | Efeito |
|---|---|---|---|
| 1 | Divergência cumulativa `received_quantity` (10,2) × movimentos de estoque (18,6) em recebimento parcial; a coluna truncada é **teto de recebimento** e **critério de fechamento** | `ReceivePurchaseItemsUseCase.ts:154-162,181-184` | **agrava** `T35-EST-F01` |
| 2 | Truncamento requisição (18,6) → pedido (10,2), sem arredondamento — **saída do MRP** | `ConvertRequisitionToPurchaseOrdersUseCase.ts:219,226` | **agrava** `T35-EST-F01`; caminho novo |
| 3 | `PurchaseItem.received_quantity` sem `allowNull` no model × `NOT NULL` no DDL | `PurchaseItem.ts:35` × `00_baseline_frozen.sql:11446` | divergência model×banco; **fora de `C-137`**, para o auditor de schema |
| 4 | `validateVtDiscountLimit` aplica 6 % sobre `salary` **sem ler `salary_type`** | `benefitRules.ts:22-28`; `CreateEmployeeBenefitUseCase.ts:70` | **agrava** `T35-RH-F02` — torna-o defeito funcional presente |
| 5 | Nenhuma fixture usa `'horista'`/`'comissionado'`; o defeito #4 é invisível à suíte | 4 arquivos de teste, todos `salary_type: 'mensal'` | agravante de detectabilidade |
| 6 | `work_hours_weekly` declarado e **nunca lido** — base de normalização disponível e não usada | `Employee.ts:33,72`; `00_baseline_frozen.sql:4874` | insumo de remediação de `T35-RH-F02` |
| 7 | Conta `1.2.3 (-) Depreciação Acumulada` semeada e `acceptEntries: true`, sem produtor | `20260807-000231-seed-accounting-chart-of-accounts.cjs:44` | **agrava** `T35-PAT-F03` semanticamente |
| 8 | Migration declara *"valor contabil so existe apos a primeira depreciacao"*; use case preenche na criação | `20260810-000033:124` × `CreateAssetUseCase.ts:83` | **agrava** `T35-PAT-F03`; contradição no DDL, não só no model |
| 9 | `assets.current_value` **write-only em todo o repositório** (3 escritores, 0 leitores, 0 telas) | `server/src/modules/assets/**`, `server/src`, `client/src/pages/**` | **atenua o impacto** de `T35-PAT-F03` — base do rebaixamento |
| 10 | `soft_delete` tem **3 emissores** e 3 READMEs documentando-o | `productController.ts:198`; `bomController.ts:212`; `DeactivateUserUseCase.ts:47`; `products/README.md:118`; `bom/README.md:171`; `users/README.md:152` | **refuta** asserção de `T-03:103`; sustenta `T-35` §10 item 1 |
| 11 | Carga real exige correção de unidade para `KG`/`G` em 3 insumos; *"a BOM consome grama, nao unidade"* | `docs/carga-inicial/insumos-materia-prima.csv:82,178,197` | **sequenciamento obrigatório** com `T35-EST-F01` |

---

## 7. Estado

- **Findings HIGH validados:** **3 / 3**. Todos com tentativa de refutação **documentada** (Regra 22:
  nenhum HIGH aceito sem refutação tentada).
- **Hipóteses refutadoras testadas:** **10** — **7 falharam** (sustentam o finding), **3 procederam**
  (1 corrigiu caminho sem derrubar o defeito; 1 confirmou fato sem reduzir o finding; 1 removeu o
  impacto e fundamenta rebaixamento).
- **`FALSE_POSITIVE`:** **0**. **`NEEDS_MORE_EVIDENCE`:** **0**. **`DUPLICATE`:** **0**.
- **Seguem para SanaCore com status `CONFIRMED`:** `T35-EST-F01` (HIGH), `T35-RH-F02` (HIGH),
  `T35-PAT-F03` (**MEDIUM recomendada** — a decisão de severidade é do
  `vericore-software-audit-director`, Regra 18).
- **Divergência `T-35` §10 item 1:** **RESOLVIDA** — fonte autoritativa determinada (§5.3); 2 artefatos
  requerem retificação de redação pelos **autores de origem**; 1 dispensa ação. **Nenhum artefato de
  terceiro foi alterado** (Regra 15).
- **Divergências §10 itens 2, 3 e 4 de `T-35`:** **não avaliadas** — fora do mandato de `T-36`.
- **Findings MEDIUM/LOW de `T-35` (`F04`…`F10`, `META-F01`):** **não validados** — não são HIGH; fora
  da Regra 22 e fora deste mandato.
- **Gates humanos identificados (Regra 18, bloqueiam remediação):** significado de `salary` para
  `salary_type = 'comissionado'` (§3.5.3); decisão implementar-depreciação × remover-coluna (§4.6.4);
  sequenciamento unidade-de-insumo × precisão (§2.7.4).
- **Banco de produção:** **não acessado**. `APR-2026-016` íntegra. Nenhuma conexão, nenhum `SELECT`,
  nenhuma contagem de linhas. Toda a evidência é estática sobre artefatos versionados no
  `AUDIT_COMMIT` `c1311a6f76b512fef893f7e60d934179cae3409f`.
- **Escrita:** somente `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/T-36_VALIDACAO_T35.md`.
  Nenhuma escrita em `src/`, `product/`, `tests/`, `requirements/`, `architecture/`, `docs/`.
- Nenhuma declaração de `AUDIT_PASSED`, `RETEST_PASSED`, `FINDING CLOSED` ou
  `REMEDIATION COMPLETE`. Nenhuma severidade alterada. Nenhum finding criado.
