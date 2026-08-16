# T-34 — VALIDAÇÃO ADVERSARIAL DOS 5 FINDINGS FORMAIS (Regra 22)

```
AUDIT_ID:      ERP-LEGACY-001-AUD-001
PROJECT_ID:    ERP-LEGACY-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f
AGENTE:        vericore-finding-validator
ESCOPO:        AUD-COM-DESCONTO-01 · AUD-RH-CPFSEARCH-01 · AUD-TES-SALDOMANUAL-01 ·
               AUD-CTB-DEBCRED-01 · AUD-PROC-DOCDRIFT-01
MÉTODO:        READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT
```

## CABEÇALHO NORMATIVO

1. **Regra 2 — nada foi corrigido.** `server/`, `client/`, `docs/` **apenas lidos**.
   Escrita exclusiva em `audit/`.
2. **Regra 4 — nenhum `AUDIT_PASSED`, `RETEST_PASSED` ou `FINDING CLOSED`** é declarado
   aqui. Este documento produz **veredito de validação**, não fechamento.
3. **Nenhum comando de banco, nenhuma requisição HTTP, nenhum teste executado.**
4. **Nenhuma âncora do encargo foi citada sem releitura direta.** Todas as linhas citadas
   abaixo foram abertas nesta sessão. Onde o encargo/finding trazia âncora, ela foi
   reconferida; divergências estão marcadas ▲.
5. **Regra 18 × Regra 20.** Quatro das cinco severidades foram fixadas pelo dono. Este
   agente **não as altera unilateralmente**. Onde a evidência não sustenta a severidade
   fixada, registro **recomendação fundamentada de rebaixamento** endereçada ao dono e ao
   director — que é o resultado legítimo do mandato adversarial. Rebaixar por deferência
   seria vício simétrico ao de confirmar por deferência; não fiz nenhum dos dois.
6. **Nenhum dado pessoal, CPF, credencial ou segredo foi lido, citado ou reproduzido.**

---

## 0. PLACAR

| FINDING_ID | Veredito | Severidade fixada | Severidade que a evidência sustenta | Segue para SanaCore? |
|---|---|---|---|---|
| `AUD-COM-DESCONTO-01` | **CONFIRMED** | CRITICAL (dono) | **CRITICAL — sustentada** | Sim, após decisão do dono |
| `AUD-RH-CPFSEARCH-01` | **CONFIRMED** | HIGH (dono) | **HIGH — sustentada** | Sim, após decisão do dono |
| `AUD-TES-SALDOMANUAL-01` | **CONFIRMED** (com 1 refutação parcial de escopo) | HIGH (dono) | **HIGH — sustentada no núcleo**; `AUDIT_IMPACT` **rebaixado** (§3.3) | Sim, com o escopo corrigido |
| `AUD-CTB-DEBCRED-01` | **CONFIRMED quanto ao fato** | HIGH (dono) | ⚠ **MEDIUM — HIGH NÃO sustentada pela evidência** (§4) | Sim, mas com **recomendação formal de rebaixamento** |
| `AUD-PROC-DOCDRIFT-01` | **CONFIRMED** | MEDIUM (juízo do auditor) | **MEDIUM — sustentada**, com **correção de escopo para cima** (§5.3) | A critério do director |

**Nenhum FALSE_POSITIVE. Nenhum DUPLICATE. Nenhum NEEDS_MORE_EVIDENCE.** Os cinco
sobrevivem à refutação **como fato**. Um deles (`DEBCRED`) não sobrevive **como HIGH**.

---

## 1. LACUNA DAS 169 MIGRATIONS — FECHADA

O produtor declarou como lacuna residual (`AUD-CTB-DEBCRED-01` §9) não ter varrido
`server/migrations/` em busca de CHECK acrescentada depois do baseline. **Varri. Fecho a
lacuna, nos dois findings de schema.**

**Varredura 1 — `accounting_entry_items` em `server/migrations/` (grep integral, resultado
completo, sem recorte):** 14 ocorrências, **todas** em **um único arquivo**,
`server\migrations\20260807-000230-create-accounting-module.cjs` (linhas 9, 19, 24, 54,
63, 66, 68, 152, 153, 154, 204, 205, 206, 210). **Nenhuma outra migration menciona a
tabela.**

**O conteúdo desse arquivo, lido diretamente (`:152-206`):** `createTable` com
`debit: { type: Sequelize.DECIMAL(15,2), allowNull: false, defaultValue: 0 }` (`:177`) e
`credit` idem (`:178`). Em seguida, `:204-206`, **apenas três `addIndexIfMissing`**
(`entry_id`, `account_id`, `cost_center_id`). **Zero `addConstraint`, zero `CHECK`, zero
`queryInterface.sequelize.query` com DDL de constraint sobre esta tabela.**

**Varredura 2 — cruzada, por palavra-chave.** `grep -i 'debit|credit'` em
`server/migrations/` retorna **10 ocorrências**; as **únicas** que tocam
`accounting_entry_items` são as duas linhas de definição de coluna acima (`:177-178`). As
demais são comentários de estoque, benefícios e OFX — nenhuma é DDL de constraint.

**Varredura 3 — `current_balance` em todo `server/`** (fecha a mesma lacuna declarada em
`AUD-TES-SALDOMANUAL-01` §8): a **única** ocorrência em `server/migrations/` é
`20260807-000240-create-treasury-module.cjs:78`, a criação da coluna. As constraints
adicionadas por essa migration (`:126-128`) são **um índice único de agência+conta e dois
índices btree** — nenhuma CHECK.

**Varredura 4 — controle a nível de ORM, que nenhum dos dois findings verificou.**
`server\src\models\AccountingEntryItem.ts:32-49` define `debit`/`credit` **sem nenhum
bloco `validate`** do Sequelize; `server\src\models\TreasuryBankAccount.ts:49` idem para
`current_balance`. **Não existe controle compensatório de ORM que alcance escritas que
contornem os use cases.** Verifiquei porque, se existisse, seria a refutação mais
provável de ambos os findings — e derrubaria o `DEBCRED` inteiro.

> **CONCLUSÃO DA LACUNA:** a ausência de CHECK em `accounting_entry_items` **deixa de ser
> `CONFIRMED` só no baseline**. Ela é **`CONFIRMED` sobre o conjunto completo de artefatos
> versionados que constroem o schema** — baseline **e** migrations **e** camada de model.
> A ressalva "MEDIUM quanto ao banco atual" **cai**: para que o banco vivo tivesse a CHECK,
> alguém teria de tê-la criado por DDL manual fora do versionamento, o que é hipótese sem
> nenhuma evidência e contrária ao regime de `APR-2026-016`. **O mesmo vale para
> `treasury_bank_accounts.current_balance`.**
>
> **Efeito prático:** o fechamento desta lacuna **elimina a única incerteza factual** do
> `DEBCRED` — e, feito isso, o que resta do finding é **exatamente** o eixo de
> alcançabilidade, que é onde ele não sustenta HIGH (§4).

**Autolimite declarado:** a varredura cobre `server/migrations/`. Não varri
`server/database/postgresql/` além dos trechos citados, nem scripts de seed, quanto a DDL
de constraint sobre estas duas tabelas.

---

## 2. `AUD-COM-DESCONTO-01` — **CONFIRMED** · CRITICAL **sustentada**

### 2.1 Tentativas de refutação (todas falharam)

| # | Hipótese refutadora testada | Resultado |
|---|---|---|
| R-1 | O desconto é aplicado no `unit_price` do item, e por isso não precisa transitar | **REFUTADA.** `CreateSaleUseCase.ts:133-140` grava `unit_price`/`total_price` do item **antes** de qualquer desconto; `:143-149` calcula `totalNetCents = totalCents - discountCents` e só o **cabeçalho** recebe o líquido (`:154`). O item permanece bruto. |
| R-2 | O desconto é conhecido em algum outro ponto do módulo fiscal | **REFUTADA por prova negativa mais forte que a do produtor.** Ele fez grep em **um arquivo**; eu fiz em **todo o módulo**: `grep -i 'discount\|desconto\|vDesc'` em `server\src\modules\fiscal\` → **0 ocorrências**. A palavra não existe no módulo inteiro. |
| R-3 | Existe outro caminho de criação de recebível que use o valor líquido | **REFUTADA.** `server\src\services\saleReceivableService.ts` exporta **exatamente duas** funções — `buildInstallmentPlan` (`:117`) e `createInvoiceReceivables` (`:185`). `grep 'total_amount'` no arquivo → **0**. `grep -i 'discount'` → **0**. O valor cobrado vem de `invoiceTotal` (`:200`) → `buildInstallmentPlan` (`:215`) → `amount: parcel.amount` (`:222`). |
| R-4 | A UI não afirma o valor líquido ao usuário | **REFUTADA.** `SalesPage.tsx:416` renderiza `DetailField label="Desconto"`; `:466` "Soma dos itens" = `itemsTotal`; `:470` "Total da venda" = `Number(current.total_amount)` — **o líquido**. As duas afirmações convivem na mesma tela. |
| R-5 | Existe teste que reprova a divergência | **REFUTADA.** `CHARACTERIZATION_TESTS.md:69` descreve o teste `--desconto-nao-chega-nfe-ar` como **caracterização do comportamento atual** — documenta, não reprova. |

### 2.2 O vínculo `F-41` / `BR-COM-010` — **confere**

Conferido em disco, por leitura própria, em **cinco** artefatos independentes:
`REQUIREMENTS_BASELINE.md:220` (`F-41` … `BR-COM-010` … **CRÍTICO**) e `:318`;
`BR_CATALOG.md:259` (`BR-COM-010`, `DISCOVERED`, OWNER `PENDENTE`);
`BUSINESS_RULE_CANDIDATES_comercial-financeiro.md:27,185` (**CRITICAL**);
`LEGACY_TRACEABILITY_MATRIX.md:95` (*"= C-1/F-41"*, CRITICAL/CONFIRMED, TC inexistente);
`LEGACY_TRACEABILITY_MATRIX_comercial-financeiro.md:73,119`. **O par é autoritativo e
pré-existente ao finding.** A autocorreção do dono (de `FIND-ERP-005` para `F-41`) está
correta, e o próprio `FIND-ERP-005` foi conferido em `APPROVALS.md:434` como **alçada de
contrato jurídico** — sem relação.

### 2.3 O exame que o encargo pediu: CRITICAL em módulo não-produção com zero registros

**Verifiquei a premissa de ambiente eu mesmo, não por citação:**
`PRODUCTION_STATUS_MAP.md:94` (`clients` = **0**), `:96` (`products` acabados = **0**),
`:143` (`sales` NÃO-PRODUÇÃO, confiança ALTA), `:173` (`fiscal` idem). Confere.

**O que sustenta CRITICAL, e está declarado:**

1. **A régua já existe no programa e é humana, não do agente.** `APPROVALS.md:440-445`
   (`APR-2026-018`), lido integralmente: *"A severidade atribuída se justifica pelo padrão
   que será promovido a produção … não por exposição atual de dado real. **Isso deve
   constar em cada finding.**"* O finding cumpre a exigência formal (ENVIRONMENT + gatilho
   nomeado) e se enquadra na régua.
2. **O dano é determinístico, não probabilístico.** Não é "pode ocorrer": **toda** venda
   com `discount > 0` produzirá três valores divergentes, porque nenhum dos dois módulos a
   jusante conhece o conceito. Não há caminho feliz.
3. **O dano é externo e irreversível por ajuste técnico.** NF-e autorizada pela SEFAZ com
   valor errado não se conserta em banco — exige carta de correção, cancelamento ou nota
   de devolução. É a diferença material entre este e os outros quatro: os demais produzem
   **dado interno errado**; este produz **documento fiscal errado nas mãos de terceiro**.
4. **O gatilho é anterior ao Go-Live e está nomeado:** primeira carga real de `clients` +
   `products`. Um leitor futuro não precisa redescobrir o critério.

**VEREDITO:** `CONFIRMED`. **Severidade CRITICAL — sustentada pela evidência.** Não
recomendo alteração. Confiança `CONFIRMED` no fato de código; a tabela de valores de §2.5
do finding é **aritmética declarada**, não medição, e está corretamente rotulada como tal.

---

## 3. `AUD-TES-SALDOMANUAL-01` — **CONFIRMED** · HIGH sustentada · **1 refutação parcial**

### 3.1 Refiz a prova de ausência — e a ampliei

O encargo exige que prova de ausência seja exaustiva. O produtor varreu `server/src`. **Eu
varri `server/` inteiro** (inclui `migrations/`, `tests/`, `database/`), com dois padrões
(`current_balance|currentBalance` e `treasury_bank_accounts|TreasuryBankAccount`).
Resultado completo, sem recorte:

| Grupo | Ocorrências | Natureza |
|---|---|---|
| Schema versionado | `00_baseline_frozen.sql:14697`; `20260807-000240-create-treasury-module.cjs:78` | definição da coluna — **sem CHECK, sem trigger, sem default derivado** |
| Model | `TreasuryBankAccount.ts:32,49` | tipagem/coluna — **sem `validate` Sequelize** |
| Validação | `treasuryValidators.ts:22,33` | `z.number().finite().optional()` |
| **ESCRITA** | `CreateBankAccountUseCase.ts:45`; `UpdateBankAccountUseCase.ts` (tipo em `:18`) via `SequelizeTreasuryRepository.updateBankAccount` **`:43-48`** | **os dois únicos** |
| LEITURA | `GetCashPositionUseCase.ts:32,51` | posição de caixa |
| Homônimo | `GetTrialBalanceUseCase.ts:58,63,73,84` | campo **de saída** do balancete — **não é esta coluna** |
| Testes | `treasury-use-cases.test.ts:53,72,89,91,92,216,217` | exercitam o CRUD, **nenhum exercita derivação** |

**▲ Precisão minha sobre a correção do produtor:** ele corrigiu a âncora do encargo de
`UpdateBankAccountUseCase.ts:18` para `:51`, e está certo quanto ao use case. **Mas a
escrita física é `SequelizeTreasuryRepository.ts:46` — `await account.update(data)` com o
`data` inteiro, sem whitelist de campos.** Registro a terceira âncora porque é ela que
prova o ponto material: **nenhuma camada filtra `current_balance` do payload de update.**

**Universo de escritores fechado em DOIS, ambos no CRUD de cadastro. Zero escritores
derivados. A ausência é real, e a prova é exaustiva sobre `server/` inteiro.**

### 3.2 Tentativas de refutação (falharam no núcleo)

| # | Hipótese | Resultado |
|---|---|---|
| R-6 | Trigger/CHECK no banco derivam ou restringem o saldo | **REFUTADA** — §1, varredura 3 e 4. |
| R-7 | O relatório de posição de caixa recalcula a partir de movimentos | **REFUTADA.** `GetCashPositionUseCase.ts:32` lê `Number(account.current_balance)` cru e `:37` o usa como base de `projected_balance`. O que é derivado são **apenas** `totalReceivable`/`totalPayable`. |
| R-8 | Existe restrição de domínio no valor | **REFUTADA.** `treasuryValidators.ts:22,33` — `z.number().finite()`, sem `.nonnegative()`, sem teto. |

### 3.3 ⚠ REFUTAÇÃO PARCIAL — o `AUDIT_IMPACT` do finding está **superestimado**

O finding afirma (§5, `AUDIT_IMPACT`): *"Não é possível determinar, pelo schema, quem
alterou o saldo de caixa e quando"*, e recomenda em §6 *"Trilha. Registrar em `auditLogs`
toda alteração de `current_balance`"* — **como se não houvesse nenhuma trilha**.

**Encontrei o controle compensatório que o produtor não verificou:**
`server\src\modules\treasury\presentation\controllers\bankAccountController.ts:78-85` —
o `PUT /bank-accounts/:id` chama `logAction(req, { action: 'update', entityType:
'TreasuryBankAccount', entityId, entityDescription, newValues: parsed.data, ... })`.
**`parsed.data` é a saída do `updateBankAccountSchema` e, portanto, INCLUI
`current_balance` quando ele é enviado.** O `POST` tem log equivalente (`:56-63`).

**Segundo controle não creditado pelo finding:** a rota exige perfil de módulo —
`treasury.ts:41`: `router.put('/bank-accounts/:id', authorizeModule('tesouraria',
'operate'), ...)`. Não é rota aberta.

**O que resta verdadeiro, com precisão:** (a) a **tabela** não tem `created_by`/
`updated_by` — verdade, e é o que o texto do finding literalmente diz; (b) **o valor
anterior não é registrado** — `bankAccountController` **não passa `oldValues`**, embora o
campo exista e seja usado por outros controllers do projeto (`purchaseController`,
`saleController`, `productController`, `inventoryController`, `financialController`,
`bomController`, `productionOrderController`, `UpdatePurchaseUseCase` e o próprio
`auditLogService`/`AuditLog`). **A trilha existe e diz quem e para quanto; não diz de
quanto veio.**

**Consequência para o finding:** o item de recomendação "registrar em auditLogs" deve ser
reescrito como **"acrescentar `oldValues` ao log já existente"** — mudança de esforço de
ordem de grandeza. O item (f) da `RETEST_SPECIFICATION` ("alteração aparece em `audit_logs`
com valor anterior") **continua válido e é o único que importa**, mas a premissa de que
hoje não há rastro nenhum **é falsa**.

### 3.4 Severidade

**HIGH sustentada no núcleo.** O achado é uma ausência estrutural de derivação num dado de
decisão financeira, provada por exaustão, sem qualquer controle compensatório que a supra —
e o contraste interno é real: o subsistema OFX vizinho **tem** constraint
(`00_baseline_frozen.sql:3760`) e semântica declarada. A refutação parcial de §3.3 afeta
**um dos quatro eixos de impacto**, não o achado.

**VEREDITO:** `CONFIRMED`, com **correção obrigatória do `AUDIT_IMPACT` e do item de
trilha da §6** antes de seguir à SanaCore. Devolvo esse ponto ao
`vericore-audit-evidence-controller` (§7, D-3).

---

## 4. `AUD-CTB-DEBCRED-01` — **ADJUDICAÇÃO DA DIVERGÊNCIA**

**A pergunta que me foi posta:** *a severidade HIGH se sustenta para uma invariante que
existe, funciona, e só não está no banco?*

**Resposta: NÃO. A evidência sustenta MEDIUM.**

### 4.1 O que confirmei por leitura própria (o fato é sólido)

| Afirmação | Veredito meu | Âncora relida por mim |
|---|---|---|
| Sem CHECK no baseline | **CONFIRMADA** | `00_baseline_frozen.sql:3176-3186` (via finding) + §1 deste documento |
| Sem CHECK em migration posterior | **CONFIRMADA — lacuna fechada** | `20260807-000230-create-accounting-module.cjs:154-182, 204-206` |
| Sem validator de ORM | **CONFIRMADA — verificação nova** | `AccountingEntryItem.ts:32-49` |
| Exclusividade mútua imposta na aplicação | **CONFIRMADA** | `validateEntryItemsShape.ts:37-39` |
| Não-negatividade imposta na aplicação | **CONFIRMADA** | `validateEntryItemsShape.ts:43-45` — e **verifiquei que não é código morto**: para `debit = -5, credit = 100`, `:37` e `:40` passam e `:43` dispara |
| Invocado nos dois caminhos de escrita | **CONFIRMADA** | `CreateEntryUseCase.ts:58`; `UpdateEntryUseCase.ts:70` |
| Não há terceiro chamador de `validateEntryItemsShape` | **CONFIRMADA por grep integral de `server/`** | 3 arquivos: o serviço + os dois use cases |
| `.min(0)` na borda HTTP | **CONFIRMADA** | `accountingEntryValidators.ts:20-21`, dentro de `entryItemSchema` `.strict()` (`:17-23`), usado por `createEntrySchema` (`:25-30`) e `updateEntrySchema` (`:32-37`) |
| `PostEntryUseCase` ignora silenciosamente valor `<= 0` | **CONFIRMADA** | `PostEntryUseCase.ts:63-68` — `if (debit > 0)` estrito |
| Balancete soma a coluna crua | **CONFIRMADA** | `SequelizeAccountingRepository.ts:135-138` (âncora ▲ corrigida pelo produtor, e a correção **procede**) |
| `ReverseEntryUseCase` não é brecha | **CONFIRMADA, com fundamento mais forte que o do produtor** | `:47-48` exige `status === 'posted'`; `:51` lê os itens já persistidos; `:75-76` inverte um par que já satisfaz "exatamente um > 0". **Fechada sob a operação.** |

**Controle compensatório adicional que nem o encargo nem o produtor registraram:**
`accounting.ts:41-44` — `POST`/`PUT` de lançamento exigem
`authorizeModule('contabilidade', 'operate')`; `PATCH .../post` e `.../reverse` exigem
**`'approve'`**. O caminho de escrita não é acessível a qualquer autenticado.

**Fato novo, materialmente relevante para a calibragem:**
`server\src\models\AccountingEntryItem.ts:6-14` **documenta a lacuna explicitamente**:
*"Por linha, exatamente um de `debit`/`credit` é diferente de zero … (validado em
`CreateEntryUseCase`/`UpdateEntryUseCase`, **não no banco**)"* e, sobre imutabilidade,
*"aplicado na camada de aplicação …, **não como constraint de banco**"*. **A decisão de
não levar a invariante ao schema é consciente, declarada e versionada** — não é
esquecimento. Isso não a torna certa; torna-a **dívida técnica conhecida**, que é uma
categoria de severidade diferente de **defeito latente desconhecido**.

### 4.2 Por que HIGH não se sustenta

**São quatro camadas de contenção, e nenhum caminho de alcance demonstrado:**

1. Autorização de módulo/nível (`accounting.ts:41-44`);
2. Zod `.min(0)` + `.strict()` na borda HTTP (`accountingEntryValidators.ts:20-21`);
3. `validateEntryItemsShape` — XOR **e** não-negatividade — nos **dois** escritores de
   payload (`:58`, `:70`);
4. O terceiro escritor (`ReverseEntryUseCase`) **preserva** a invariante por construção.

**O finding, corretamente estreitado pelo próprio produtor, afirma:** *"a invariante é
real, correta e bem escrita — mas vive inteiramente na aplicação, e o banco não a
conhece."* **Concordo com o enunciado. Discordo da severidade que ele carrega.** O que
resta é, tecnicamente, **ausência de defesa em profundidade sobre uma invariante que é
efetivamente imposta**. A materialização exige um **escritor futuro que ainda não existe**
— SQL direto, script de carga, DBA, ou use case novo escrito por quem desconheça
`validateEntryItemsShape`. O produtor foi honesto ao declarar isso `MEDIUM` de confiança e
ao dizer que **não foi demonstrado no `AUDIT_COMMIT`**.

**A régua interna do próprio programa aponta para MEDIUM.** `AUD-DB-T31-01` — semântica
ausente em subsistemas financeiros — é **MEDIUM**. O `DEBCRED` é a mesma família: **o dado
não carrega a regra; o código carrega.** Elevá-lo a HIGH enquanto o gênero permanece MEDIUM
é incoerência de calibragem — o mesmo argumento que `AUD-PROC-DOCDRIFT-01` §5 usa
corretamente ao invocar o precedente `T23-F04`.

**Contraste com os outros dois HIGH desta rodada, que é o teste decisivo:**

| | `AUD-RH-CPFSEARCH-01` | `AUD-TES-SALDOMANUAL-01` | `AUD-CTB-DEBCRED-01` |
|---|---|---|---|
| Caminho de exploração/ocorrência existe hoje? | **Sim** — `GET /api/employees?search=` | **Sim** — todo `PUT` de conta bancária | **Não** — exige escritor que não existe |
| Precisa de ator/artefato futuro? | Não | Não | **Sim** |
| Controle de aplicação impede? | **Não** | **Não** | **Sim, em 4 camadas** |

**Os dois primeiros são HIGH porque o defeito ocorre pelo caminho normal do sistema. O
terceiro só ocorre se alguém sair do sistema.** Essa é a diferença que a severidade deve
refletir.

**O que puxa para cima, e por que não basta:** a matéria é registro contábil, o contraste
interno é real (`chk_bank_statement_entries_single_match`, `:3760`, prova que o time sabe
fazê-lo), e o dano seria silencioso. **São argumentos sobre a gravidade da hipótese, não
sobre a sua alcançabilidade.** Severidade que ignora alcançabilidade transforma toda
ausência de constraint do repositório em HIGH — e há 169 migrations de superfície para
aplicar essa régua.

### 4.3 Um defeito **real** que o finding contém e que sobrevive independentemente

`PostEntryUseCase.ts:66-67` **ignora** valores `<= 0` em vez de **rejeitá-los**. Isso é
defeito de código por si — "ignorar dado inválido" é o mecanismo que produz a divergência
entre os dois leitores, e vale **mesmo com CHECK no banco**. O item 3 da §7 do finding o
endereça, e é o item de **maior valor por menor custo** de todo o finding. **Registro que
ele não depende do desfecho da severidade.**

### 4.4 Veredito

**STATUS: `CONFIRMED`** quanto ao fato — ele é sólido, exaustivamente provado, e agora sem
a lacuna das migrations.

**SEVERIDADE: a evidência sustenta `MEDIUM`, não `HIGH`.** ⚠ **Não a altero** — foi fixada
por decisão do dono (Regra 18) e a Regra 20 manda registrar a divergência em vez de
conciliá-la. **Recomendo formalmente ao dono e ao director o rebaixamento para MEDIUM**,
mantendo:
- o **gatilho de reavaliação já nomeado no finding** — *"qualquer script, migration ou
  rotina de importação que passe a escrever em `accounting_entry_items` sem atravessar
  `CreateEntryUseCase`/`UpdateEntryUseCase`"* — que é **exatamente** a condição que
  restauraria HIGH, e está bem redigido;
- o item 3 da §7 (rejeitar em vez de ignorar) **em prioridade independente da severidade**.

**Se o dono mantiver HIGH, a decisão é legítima e este veredito não a obstrui** — o
finding segue com `CONFIRMED` e a divergência fica registrada, adjudicada e fundamentada,
que é o que a Regra 20 exige. **O que este agente não faz é declarar sustentada uma
severidade que a evidência não sustenta.**

**Recomendação processual adicional:** `DYN-CTB-04` (§7 do finding — `POST` com
`debit: -300` via API deve ser **rejeitado**) é, na minha leitura, **o cenário dinâmico
mais importante dos quatro**, porque é o que **delimita** o achado. Executá-lo antes da
remediação impede que a SanaCore dimensione a correção sobre premissa mais ampla que a
evidência.

---

## 5. `AUD-RH-CPFSEARCH-01` — **CONFIRMED** · HIGH sustentada

### 5.1 Os dois pressupostos do oráculo — **ambos confirmados por leitura própria**

**(a) `name` permanece visível.** `employeeSensitiveFields.ts:36-51` — a lista
`SENSITIVE_EMPLOYEE_FIELDS` tem 14 campos e **`name` não está entre eles**.
`sanitizeEmployee` (`:81-96`) faz `delete plain[field]` **apenas** sobre essa lista, e
`sanitizeEmployeeList` (`:105-110`) a aplica linha a linha. **`name` sai na resposta para
qualquer autenticado.** Confirmado.

**(b) O `LIKE %...%` aceita fragmento.** `SequelizeEmployeesRepository.ts:20-23`:
`where[Op.or] = [{ name: { [Op.like]: '%'+s+'%' } }, { cpf: { [Op.like]: '%'+s+'%' } }]`.
**Substring nos dois lados.** E o sanitizador não neutraliza: `validators.ts:163-166`
escapa **exclusivamente** `%` e `_` (`replace(/[%_]/g, '\\$&')`) — **dígitos passam
intactos**. Confirmado.

**(c) Reforço que nenhum dos dois documentos registrou, e que fortalece o achado:**
`Employee.ts:57` — `cpf: { type: DataTypes.STRING(14), allowNull: false, unique: true,
comment: 'CPF (apenas números)' }`. **O CPF é armazenado em claro, apenas dígitos, e é
`unique`.** Não há hash, não há cifra, não há máscara em repouso — ou seja, o casamento
por fragmento numérico é **exato**, e a unicidade garante que um prefixo suficientemente
longo isola **um único** funcionário.

### 5.2 Tentativas de refutação (todas falharam)

| # | Hipótese | Resultado |
|---|---|---|
| R-9 | O use case descarta `search` para quem não tem `rh` | **REFUTADA.** `ListEmployeesUseCase.ts:53-66`: `search` é repassado cru ao repositório (`:59-60`); `hasFullEmployeeAccess` só é consultado **depois** (`:64`), e o próprio JSDoc do input (`:22-27`) declara que o usuário requisitante é usado *"apenas para decidir se os campos sensíveis entram na resposta — **nunca para filtrar quais funcionários aparecem na lista**"*. **O código documenta a própria lacuna.** |
| R-10 | Middleware de rota exige `rh` na leitura | **REFUTADA.** `employees.ts:19-20` — só `authenticate`. `:21-23` — escritas exigem `admin`. |
| R-11 | O CPF está cifrado/hasheado em repouso, quebrando o oráculo | **REFUTADA** — `Employee.ts:57`, §5.1(c). |
| R-12 | Sem `name`, o oráculo não fecha | **REFUTADA, e o achado é mais amplo do que o finding afirma:** a resposta devolve `total` (`ListEmployeesUseCase.ts:67`) — **a própria contagem é oráculo**, mesmo que `name` fosse mascarado. A dependência do finding em relação a `name` é suficiente, mas não necessária. **Isso amplia o vetor, não o restringe.** |

### 5.3 A fronteira levantada — muda a leitura de "sem risco ativo hoje"?

**Verifiquei a premissa de ambiente:** `PRODUCTION_STATUS_MAP.md:95` (`employees` = **0**,
*"sem apontamento nominal de produção"*), `:135` (NÃO-PRODUÇÃO, ALTA), `:162` (`rh`
idem). Confere. **Com zero funcionários, não há CPF a reconstruir hoje. A avaliação de
"sem risco ativo" está correta e deve permanecer.**

**Mas o argumento de fronteira do finding procede e é materialmente relevante**, por razão
que verifiquei de forma independente: **o `employeeController` não emite `logAction` em
nenhuma operação** — `grep 'logAction'` no arquivo retorna **zero**. Não há trilha na
leitura (o que o finding afirma) **e tampouco na escrita** (o que ele não afirma; ver §7,
D-1). O `auditLogs` **é produção real** por `APR-2026-016`. Portanto: quando `employees`
receber a primeira linha real, a enumeração ocorrerá **sem rastro em um módulo que já hoje
é tratado como produção**, e o `INSERT` do funcionário que dispara o gatilho **também não
terá rastro**.

**Efeito sobre a leitura:** não converte o risco em ativo — converte-o em **não
detectável a posteriori**. Não há como, depois do fato, determinar se houve enumeração
antes de a trilha existir. **Isso reforça o gatilho nomeado (primeira linha real em
`employees`) e recomenda que o item 4 da §6 do finding — instrumentar a trilha — seja
tratado como parte da remediação, não como opcional.**

**VEREDITO:** `CONFIRMED`. **HIGH sustentada.** Confiança: `CONFIRMED` no fato de código;
**mantenho `HIGH` (não `CONFIRMED`) no eixo de explorabilidade** — o custo de ~110
requisições contra a janela de 300/15min (`app.ts:105-116`, âncora do finding, não relida
por mim — declarada como herdada) é derivação aritmética, não medição. `DYN-RH-01` fecha
esse eixo.

---

## 6. `AUD-PROC-DOCDRIFT-01` — **CONFIRMED** · MEDIUM sustentada · **escopo corrigido para cima**

O produtor pediu expressamente validação, embora MEDIUM não a exija. **Atendo o pedido, e
o pedido estava certo: encontrei um fato que o finding não tinha.**

### 6.1 As duas declarações — conferidas literalmente

`docs\business\briefs\BRIEF_RH_2026-08-06.md:158` — `| BR-RH-020 ✅ **REMEDIADO em
2026-08-06** | …` e, **na mesma linha, depois do selo**, o diagnóstico original preservado
(*"hoje QUALQUER autenticado lê salário via `GET /api/employees`"*). Confirmado.
`:219` — `| **P0 ✅ REMEDIADO 2026-08-06** | Segregação de acesso a dados de RH
(BR-RH-020) + perfil "rh" | …`. Confirmado.

A leitura do produtor sobre a "nuance textual" — um selo que contradiz o corpo do próprio
parágrafo é **pior** que um documento simplesmente desatualizado — **procede**, e concordo
que corta contra o artefato, não a favor.

### 6.2 ⚠ DIVERGÊNCIA NOVA — há uma **terceira** declaração, em um **segundo** artefato

Busca dirigida por `BR-RH-020` em todo o repositório (a mesma que o item (c) da
`RETEST_SPECIFICATION` do finding prescreve para o reteste). Encontrei, além das duas
conhecidas:

- `docs\governance\HANDOFF_CODEX.md:8550` — **`## Bloco 0 — BR-RH-020: segregação de dados
  sensíveis de RH (Concluído)`**
- `docs\governance\HANDOFF_CODEX.md:8557` — **`**Status**: ✅ Concluído`**
- `:8627` — registra que *"`BRIEF_RH_2026-08-06.md` — BR-RH-020 marcado"*, propagando a
  marca de um artefato para o outro.

**Consequências, que são três e todas materiais:**

1. **O limite de escopo declarado do finding é factualmente estreito.** §8 diz *"cobre
   **uma** declaração falsa em **um** arquivo"*. São **pelo menos três declarações em dois
   arquivos**, e o segundo (`HANDOFF_CODEX.md`) é artefato de governança de circulação
   ainda mais ampla que o brief.
2. **O item (c) da `RETEST_SPECIFICATION` já falha hoje.** Ele exige que *"nenhum outro
   artefato versionado afirme `BR-RH-020` como remediada"*. **Um afirma.** O reteste
   reprovaria mesmo que o brief fosse corrigido — e o item 1 da §6 ("corrigir as duas
   declarações") é, portanto, **insuficiente por construção**.
3. **A tese central do finding fica mais forte, não mais fraca:** a propagação atravessou
   arquivos, o que é evidência direta de que o defeito é **de mecanismo** (nada verifica o
   selo), como a `ROOT_CAUSE_HYPOTHESIS` sustenta.

**Registro adicional, em favor do artefato auditado, para não inflar:** os `COMMENT ON
COLUMN` do baseline que citam `BR-RH-020` (`:4938`, `:5847`, `:5981`, `:6100`, `:6107`)
**não** afirmam estado de remediação — declaram que o campo **segue** a segregação. **Não
são instâncias do defeito** e não devem ser contadas como tal.

### 6.3 Os dois juízos que o produtor pediu que eu avaliasse

**(a) Recusar DEV/HOMOLOGAÇÃO a este finding — JUÍZO CORRETO, e eu o endosso.** A condição
de ambiente de `APR-2026-018` (`APPROVALS.md:440-445`) é expressamente sobre **módulos
classificados no `PRODUCTION_STATUS_MAP`**. O objeto aqui não é módulo: é artefato de
governança vivo, cujo efeito — retirar `BR-RH-020` da fila de trabalho — **é integral
hoje**, sem depender de promoção alguma. Aplicar a condição por simetria seria conciliação
indevida, exatamente como ele escreveu. **Endosso sem ressalva.**

**(b) Validar um MEDIUM — pedido correto, e a validação produziu resultado.** Se ele não
tivesse pedido, a terceira declaração de §6.2 não teria sido encontrada nesta rodada.
**Registro isso como evidência a favor de o director acolher pedidos voluntários de
validação em MEDIUM quando o próprio mérito for a severidade.**

### 6.4 Severidade

**MEDIUM — sustentada.** Os dois fundamentos do produtor resistem ao meu exame:
(i) o dano material só se realiza **através** de `AUD-RH-CPFSEARCH-01`, que já está
precificado em HIGH — classificar este em HIGH seria contar o mesmo dano duas vezes,
vedação de `C-20`; (ii) o precedente `T23-F04` (rebaixado de HIGH a MEDIUM por T-23) é do
mesmo gênero e aplica-se diretamente.

A descoberta de §6.2 **aumenta a extensão** do defeito, não a sua natureza — e extensão de
defeito indireto não converte dano indireto em direto. **A condição de elevação a HIGH
nomeada pelo produtor** (primeira decisão de programa tomada citando `BR-RH-020` como
remediada) **está bem construída e deve ser preservada literalmente.**

**VEREDITO:** `CONFIRMED`. **MEDIUM sustentada.** **Com determinação de que o escopo, o
item 1 da §6 e o item (c) da `RETEST_SPECIFICATION` sejam corrigidos** para abranger
`HANDOFF_CODEX.md:8550,8557` — sob pena de a remediação corrigir o brief e deixar em pé a
afirmação mais ampla.

---

## 7. DIVERGÊNCIAS NOVAS — devolvidas ao auditor de origem

Registro como **devolução de evidência**, não como findings novos: **este agente não cria
findings** (valida os dos outros). Endereçadas ao
`vericore-audit-evidence-controller` e ao `vericore-software-audit-director`.

| ID | Divergência | Âncora (relida por mim) | Efeito |
|---|---|---|---|
| **D-1** | `employeeController` **não emite `logAction` em nenhuma operação** — nem leitura, nem `create`, nem `update`, nem `delete`. `AUD-RH-CPFSEARCH-01` §3.4 afirma apenas a ausência **na leitura**. A ausência é **total**. | `grep 'logAction'` em `server\src\modules\employees\presentation\controllers\employeeController.ts` → **0 ocorrências** | Amplia o vetor de "sem rastro" de `AUD-RH-CPFSEARCH-01`; **pode pertencer à família de trilha de auditoria de T-03/T18A** — subsunção é decisão do consolidador, **não a declaro** |
| **D-2** | **Terceira declaração de `BR-RH-020` como concluída**, em segundo artefato, não capturada por `AUD-PROC-DOCDRIFT-01` | `docs\governance\HANDOFF_CODEX.md:8550,8557` (e propagação em `:8627`) | §6.2 — corrige escopo, item 1 da §6 e item (c) da `RETEST_SPECIFICATION` do finding |
| **D-3** | `AUD-TES-SALDOMANUAL-01` **superestima** o `AUDIT_IMPACT`: existe trilha de aplicação registrando autor e **novo** valor do saldo; falta o **valor anterior** (`oldValues`) | `bankAccountController.ts:56-63` (create), **`:78-85` (update, `newValues: parsed.data`)**; `oldValues` existe e é usado por 7 outros controllers e por `auditLogService`/`AuditLog` | §3.3 — reduz o esforço de remediação de "criar trilha" para "acrescentar `oldValues`" |
| **D-4** | `AUD-TES-SALDOMANUAL-01` não registra a âncora da escrita **física**, que é onde se prova a ausência de whitelist de campos | `SequelizeTreasuryRepository.ts:43-48` — `await account.update(data)` com o objeto inteiro | §3.1 — terceira âncora, complementar (não substitui) à correção `:18`→`:51` já feita pelo produtor |
| **D-5** | A lacuna do banco no `DEBCRED` é **decisão de desenho declarada e versionada**, não omissão — fato ausente do finding e relevante para calibragem e para a `ROOT_CAUSE_HYPOTHESIS` | `AccountingEntryItem.ts:6-14` (*"validado em `CreateEntryUseCase`/`UpdateEntryUseCase`, **não no banco**"*) | §4.1 |
| **D-6** | Controles compensatórios de **autorização** não creditados em dois findings | `accounting.ts:41-44` (`contabilidade` `operate`/`approve`); `treasury.ts:38-41` (`tesouraria` `operate`) | Reduz superfície nos dois; material para `DEBCRED` (§4.2), marginal para `TES` |

**Correção de âncora herdada — confirmação para o registro:** as duas correções que o
produtor já havia feito **procedem** e devem ser tratadas como canônicas:
`UpdateBankAccountUseCase.ts:51` (não `:18`) e `SequelizeAccountingRepository.ts:135-138`
(não `GetTrialBalanceUseCase.ts:58`, que é a **composição** do saldo). **Reli as duas.**

---

## 8. ENCAMINHAMENTO (Regra 22)

**Seguem para a SanaCore, após decisão do dono e do director** — os cinco estão
`CONFIRMED` quanto ao fato:

1. `AUD-COM-DESCONTO-01` — CRITICAL sustentada. **Sem ressalva.**
2. `AUD-RH-CPFSEARCH-01` — HIGH sustentada. **Sem ressalva de mérito**; recomendo tratar o
   item 4 da §6 (trilha) como parte da remediação, não como opcional (§5.3, D-1).
3. `AUD-TES-SALDOMANUAL-01` — HIGH sustentada no núcleo. **Ressalva: corrigir
   `AUDIT_IMPACT` e o item de trilha antes do encaminhamento** (D-3).
4. `AUD-CTB-DEBCRED-01` — CONFIRMED quanto ao fato; **recomendação formal de rebaixamento
   a MEDIUM** (§4). A decisão é do dono. Item 3 da §7 do finding (rejeitar em vez de
   ignorar) tem valor independente do desfecho.
5. `AUD-PROC-DOCDRIFT-01` — MEDIUM sustentada; **escopo a ampliar** para o segundo
   artefato (D-2) antes de qualquer remediação.

**O que este documento NÃO faz:** não fecha finding, não declara reteste, não altera
severidade fixada por decisão humana, não corrige objeto auditado, não cria finding novo,
não decide ownership de `docs/business/briefs/` (a lacuna apontada em `DOCDRIFT` §6
permanece aberta e é do director).

---

## 9. DECLARAÇÃO DE MÉTODO E LIMITES

- **Método:** READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT. Nenhum passo de correção.
- **Refutação ativa tentada e documentada nos cinco findings** — 12 hipóteses refutadoras
  nominais (R-1…R-12), todas com resultado registrado. **Nenhum CRITICAL ou HIGH foi
  aceito sem tentativa documentada de refutação** (Regra 22).
- **Duas refutações tiveram sucesso parcial** e estão registradas como tais: §3.3 (trilha
  de tesouraria existe) e §4 (a alcançabilidade do `DEBCRED` é bloqueada em quatro
  camadas). **Nenhuma derruba um finding inteiro; ambas alteram escopo ou severidade.**
- **Lacuna do produtor fechada por medida, não por declaração** (§1): 4 varreduras
  independentes sobre `server/migrations/`, `server/` e a camada de model.
- **Fatos herdados que NÃO reverifiquei, declarados como lacuna:** `app.ts:105-116`
  (limitador de taxa — usado apenas na calibragem de confiança do eixo de
  explorabilidade); o conteúdo de `employees-use-cases.test.ts` e de
  `accounting-use-cases.test.ts` (li apenas as ocorrências que apareceram em grep, não os
  arquivos); as âncoras de `T-31`, `T-23`, `T-26`, `T-32`, `T-33` citadas pelos findings
  como correlação de classe; o mérito dos `ON DELETE SET NULL` herdados de `T-31:110`.
- **Nenhum comando executado, nenhuma conexão de banco, nenhuma requisição HTTP**
  (`APR-2026-016`, `APR-2026-021` Parte D, `APR-2026-025`).
- **Nenhum arquivo de `server/`, `client/`, `docs/`, `product/`, `tests/`,
  `requirements/`, `architecture/` criado ou alterado** (Regra 2). Escrita exclusiva neste
  arquivo, em `audit/`.
- **Nenhum dado pessoal, CPF, credencial, número de conta ou segredo foi lido, citado ou
  reproduzido.**
- **Limite de escopo:** valida **exclusivamente** os cinco findings nomeados. Não constitui
  varredura de outros achados da run, não fecha `RES-T23-03`, `RES-T31-01`/`-02`, nem
  `AUD-DB-T31-01`.

**ARQUIVOS LIDOS NESTA VALIDAÇÃO (caminhos absolutos):**

- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\CLAUDE.md`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\AUD-COM-DESCONTO-01.md` (integral)
- `…\07-findings\AUD-RH-CPFSEARCH-01.md` (integral)
- `…\07-findings\AUD-TES-SALDOMANUAL-01.md` (integral)
- `…\07-findings\AUD-CTB-DEBCRED-01.md` (integral)
- `…\07-findings\AUD-PROC-DOCDRIFT-01.md` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\migrations\20260807-000230-create-accounting-module.cjs` (parcial: 145-214 + grep integral do diretório)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\accounting\application\services\validateEntryItemsShape.ts` (integral)
- `…\accounting\application\use-cases\entry\PostEntryUseCase.ts` (parcial: 40-94)
- `…\accounting\application\use-cases\entry\ReverseEntryUseCase.ts` (parcial: 45-93)
- `…\accounting\presentation\validators\accountingEntryValidators.ts` (integral)
- `…\accounting\presentation\routes\accounting.ts` (parcial, por consulta: 37-46)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\models\AccountingEntryItem.ts` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\models\TreasuryBankAccount.ts` (parcial, por consulta)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\models\Employee.ts` (parcial, por consulta: 14-61)
- `…\employees\presentation\routes\employees.ts` (integral)
- `…\employees\infrastructure\sequelize\SequelizeEmployeesRepository.ts` (parcial: 1-50)
- `…\employees\domain\services\employeeSensitiveFields.ts` (integral)
- `…\employees\application\use-cases\ListEmployeesUseCase.ts` (integral)
- `…\employees\presentation\controllers\employeeController.ts` (grep integral de `logAction`)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\utils\validators.ts` (parcial: 155-178)
- `…\treasury\presentation\controllers\bankAccountController.ts` (parcial: 35-89)
- `…\treasury\presentation\routes\treasury.ts` (parcial, por consulta: 35-44)
- `…\treasury\infrastructure\sequelize\SequelizeTreasuryRepository.ts` (parcial: 38-53)
- `…\sales\application\use-cases\CreateSaleUseCase.ts` (parcial: 120-169)
- `…\fiscal\application\use-cases\IssueSaleNfeUseCase.ts` (parcial: 198-247 + grep integral do módulo)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\services\saleReceivableService.ts` (parcial: 180-229 + grep integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\client\src\pages\sales\SalesPage.tsx` (parcial: 408-477)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\business\briefs\BRIEF_RH_2026-08-06.md` (parcial: 155-160, 216-221)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\governance\HANDOFF_CODEX.md` (parcial: 8546-8559 + grep)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\coretriad\governance\APPROVALS.md` (parcial: 428-449)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\coretriad\states\ERP-LEGACY-001\PRODUCTION_STATUS_MAP.md` (parcial, por consulta dirigida)
- `docs\coretriad\projects\ERP-LEGACY-001\` — `BR_CATALOG.md`, `discovery\REQUIREMENTS_BASELINE.md`, `discovery\BUSINESS_RULE_CANDIDATES_comercial-financeiro.md`, `discovery\CHARACTERIZATION_TESTS.md`, `discovery\LEGACY_TRACEABILITY_MATRIX.md`, `discovery\LEGACY_TRACEABILITY_MATRIX_comercial-financeiro.md`, `discovery\USE_CASES_RECOVERED_comercial-financeiro.md` (todos parciais, por consulta dirigida a `F-41`/`BR-COM-010`)

---

*Produzido por `vericore-finding-validator`. Regra 22 cumprida para os quatro
CRITICAL/HIGH; o MEDIUM foi validado a pedido expresso do produtor e a validação produziu
fato novo (§6.2). Nenhum `FINDING CLOSED`, `RETEST_PASSED` ou `AUDIT_PASSED` declarado
(Regra 4). Severidades fixadas por decisão humana **não foram alteradas**; onde a
evidência não as sustenta, a divergência está registrada e fundamentada para decisão do
dono (Regras 18 e 20).*
