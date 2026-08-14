# T-07 — FINANCEIRO · Relatório de trilha (ERP-LEGACY-001-AUD-001, onda W2)

**AUDIT_COMMIT lido:** `c1311a6f76b512fef893f7e60d934179cae3409f`.
Regime `APR-2026-016` respeitado: nenhuma conexão de banco, nenhuma execução.
Nenhum arquivo do objeto auditado foi tocado (Regra 2).

> **Nota de persistência.** Produzido pelo `vericore-service-layer-auditor` (T-07 financeiro) e persistido
> **sem alteração de conteúdo** pelo orquestrador — o agente é read-only por
> desenho e não pode escrever em `audit/`. O juízo de auditoria é
> integralmente da trilha. Única transformação aplicada: promoção do
> cabeçalho a H1 e desescape de entidades HTML.

---

```
AUDIT_COMMIT: c1311a6f76b512fef893f7e60d934179cae3409f
TRILHA:       T-07 — financial (30) · treasury (11) · accounting (11) · budget (6)
PAPEL:        vericore-service-layer-auditor (centralização de regra + atomicidade)
MÉTODO:       READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT
REGIME:       APR-2026-016 — read-only reforçado. Zero conexão de banco, zero execução.
ESTADO:       READY_TO_CLOSE_BLOCKED_BY_G4 (parte estática fechada; DYN pendentes)
```

Nenhum arquivo do objeto auditado foi alterado (Regra 2). Nenhuma BR foi inventada; onde não há BR, o registro é **lacuna**, não regra (Regra 6).

---

## 1. Veredito sobre o CNAB não montado (AUD-SEC-T04-03) — **CONFIRMADO por leitura própria**

Verificação independente, sem citar a `TRIAGE` nem o relatório T-04 como prova:

- `server/src/modules/financial/presentation/routes/finance.ts` — 15 declarações de rota + **um único** `router.use`, na linha 59, e ele monta `./reconciliation`. Não há `require('./cnab')` no arquivo.
- `server/app.ts:161` monta `/api/finance` → `financial/presentation/routes/finance`. Não há nenhum outro `app.use` para `cnab`.
- Varredura textual de `cnab|Cnab|CNAB` em todo `server/`: **40 arquivos**, nenhum deles é `app.ts`, `finance.ts` (exceto o comentário de cabeçalho de `treasury.ts:13`, que descreve `cnab.ts` como "real e funcional") ou qualquer arquivo de teste.

**Veredito: CONFIRMADA.** Os 8 endpoints de `cnab.ts:22-31` são **inalcançáveis**. Consequências que adjudico para o meu escopo:

1. **Superfície efetiva de `financial` = 22 endpoints, não 30.** Total da trilha: **50 alcançáveis de 58 declarados**.
2. **Agravante próprio, que T-04 não tinha como ver:** o código morto não é um router vazio — é uma cadeia completa de **8 use cases, 1 controller, 1 repositório Sequelize, 5 módulos de infraestrutura CNAB 240, 5 models e 5 migrations aplicadas**. As tabelas `cnab_remittances`, `cnab_remittance_items`, `cnab_return_files`, `cnab_return_occurrences` e `company_banking_config` **existem no schema** e nenhum caminho alcançável as escreve.
3. **Contradição documental material:** `treasury.ts:11-13` declara, no `AUDIT_COMMIT`, que a conciliação CNAB "já existe, **real e funcional**". Não existe. Isso é insumo direto para T-23 (doc × código) e para T-17 (contrato de API).
4. **Zero cobertura de teste** sobre toda a cadeia CNAB (a varredura de `server/tests/` inteiro não retorna uma ocorrência).
5. Os defeitos que encontrei dentro dessa cadeia (§3, AUD-SERVICE-7) recebem severidade **rebaixada por inalcançabilidade**, e classificação `LATENTE` — não `EXPLORÁVEL`.

---

## 2. Findings por severidade

Todos com âncora arquivo:linha conferida no `AUDIT_COMMIT`. CRITICAL/HIGH em `PROPOSED`, para o `vericore-finding-validator` (Regra 22).

### HIGH

**AUD-SERVICE-1 — `PROPOSED` · Título parcialmente pago desaparece da projeção de fluxo de caixa (30/60/90 dias)**
*Severidade HIGH · Confiança HIGH (estática, aritmética fechada) · Categoria G3: operações financeiras*

- `PayPayableUseCase.ts:69` e `ReceivePaymentUseCase.ts:69` gravam `payment_date` **em toda baixa**, inclusive parcial (`status = 'partial'`, linha 68).
- `SequelizeFinancialRepository.ts:143-159` seleciona os títulos em aberto da projeção com `WHERE payment_date IS NULL AND status != 'canceled'`.
- Logo, um título de R$ 1.000 com R$ 200 pagos tem `payment_date` preenchido e **some inteiro** da projeção — os R$ 800 ainda devidos ficam invisíveis.
- Consumidores: `GetCashFlowProjectionUseCase.ts:72` e `GetDailyCashFlowProjectionUseCase.ts:96` — os dois únicos endpoints de projeção (`/cash-flow-projection`, `/cashflow/projection`), descritos no próprio código como "o dado de decisão do CFO para antecipar risco de caixa negativo" (`financialController.ts:236-239`).
- **Prova de que é defeito, não desenho:** o comentário do autor em `SequelizeFinancialRepository.ts:139-142` raciocina explicitamente sobre `'paid'` ("nunca tem payment_date nulo na prática") e **não menciona `'partial'`**, embora `'partial'` esteja listado no mesmo comentário como enum válido. E `GenerateRemittanceUseCase.ts:95` calcula corretamente `amount - amount_paid` para o mesmo conceito — o saldo devedor é conhecido no módulo; a projeção é a exceção.
- Efeito colateral no mesmo domínio: `GetCashFlowUseCase.ts:37-38` calcula `pending_receivable`/`pending_payable` filtrando **só** `status === 'pending'`, excluindo `'partial'` e `'overdue'`; e `:39-40` soma `amount` de **face** de todos os status, de modo que um título 80% pago entra por 100% no `actual_balance`. Nenhum dos dois números usa `amount_paid`.
- **Lacuna de BR registrada:** não existe BR sobre o tratamento de `partial` em projeção de caixa. `BR-FIN-001` descreve a baixa, não a projeção. Não invento a regra — registro que a divergência aritmética entre `amount_paid` (que existe e acumula) e a projeção (que ignora o saldo) é interna ao próprio código.

**AUD-SERVICE-2 — `PROPOSED` · Ato financeiro de dois efeitos sem transação e sem guarda de estado: `PayFineUseCase`**
*Severidade HIGH · Confiança HIGH · Categoria G3: operações financeiras + integridade de dados*

`server/src/modules/facilities/application/use-cases/fine/FineUseCases.ts:181-194`:

```ts
const payable = await this.accountPayableService.create({ ... });   // write 1
return this.fineRepository.update(input.id, { status: 'paid', accounts_payable_id: payable.id });  // write 2
```

- **Sem transação.** O controller (`facilities/presentation/controllers/fineController.ts:113-129`) **não abre transação** — contraste direto com `reconciliationController.ts:133`, `accountingEntryController.ts:69/97/128/157` e `PayPayableUseCase.ts:40`, que abrem. Falha entre as duas escritas deixa **conta a pagar órfã**, com a multa ainda `pending`.
- **Sem guarda de estado.** Não há `if (fine.status === 'paid') throw` — é a única transição financeira que auditei nesta trilha sem guarda de estado. Duas chamadas a `POST /api/facilities/fines/:id/pay` geram **dois títulos** em `accounts_payable` para a mesma multa; o segundo `update` sobrescreve `accounts_payable_id` e o primeiro título perde qualquer vínculo rastreável.
- A cadeia é estruturalmente incapaz de ser atômica mesmo que o controller quisesse: ver AUD-SERVICE-3.
- **Fronteira:** o módulo `facilities` é de T-16; o **efeito financeiro** (`accounts_payable`) é de T-07 pelo critério "todo caminho que altera saldo financeiro" (`AUDIT_PLAN.md:312-314`). Reporto o efeito financeiro e faço handoff explícito a T-16 quanto ao ciclo de vida da multa. Divergência entre as trilhas escala, não concilia (Regra 20).

**AUD-SERVICE-3 — `PROPOSED` · Contrato do repositório de títulos financeiros não aceita transação — atomicidade cross-módulo é estruturalmente impossível**
*Severidade HIGH · Confiança HIGH · Categoria G3: integridade de dados*

`server/src/modules/financial/infrastructure/sequelize/SequelizeFinancialRepository.ts`:

| Método | Linha | Assinatura |
|---|---|---|
| `createPayable(data)` | 89-91 | **sem** parâmetro `transaction` |
| `createReceivable(data)` | 94-96 | **sem** parâmetro `transaction` |
| `updatePayableCostCenter(id, ccId)` | 99-104 | **sem** transação e **sem lock** (read-then-write) |
| `updateReceivableCostCenter(id, ccId)` | 107-112 | idem |

Contraste interno que prova que não é limitação do framework: no **mesmo** módulo, `findPayableByIdForUpdate(id, transaction)` (:81-86) e `findReceivableByIdForUpdate(id, transaction)` (:48-53) recebem transação **e** aplicam `LOCK.UPDATE`. E `SequelizePurchaseRepository.createAccountPayable(..., transaction)` — a via de compras — recebe transação normalmente.

Consequência: **todo** consumidor cross-módulo do título financeiro (`facilities`, `juridico`) fica impedido de inscrever a criação do título na sua própria transação. É a causa estrutural de AUD-SERVICE-2, e não é corrigível no call site.

### MEDIUM

**AUD-SERVICE-4 — Regra de baixa de título implementada 5 vezes, cálculo de saldo devedor 7 vezes, sem serviço de domínio**
*Severidade MEDIUM · Confiança HIGH · (centralização — núcleo do meu mandato)*

A regra "saldo devedor = `amount − amount_paid`, em centavos; status vira `paid` ao zerar, senão `partial`" aparece, reescrita literal:

| # | Local | Linhas |
|---|---|---|
| 1 | `PayPayableUseCase.ts` | 49-68 |
| 2 | `ReceivePaymentUseCase.ts` | 49-68 — **espelho byte-a-byte** de (1), inclusive os comentários |
| 3 | `MatchEntryUseCase.ts` (lado pagável) | 67-84 |
| 4 | `MatchEntryUseCase.ts` (lado recebível) | 106-123 |
| 5 | `ProcessReturnFileUseCase.ts` | 88-98 |
| 6 | `GetMatchSuggestionsUseCase.ts` | 77 (só saldo) |
| 7 | `GenerateRemittanceUseCase.ts` | 95 (só saldo, com `parseFloat`, não centavos) |

Não existe `applyPaymentToTitle` nem serviço de domínio equivalente. **Contraexemplo interno, no mesmo módulo:** `financial/application/reconciliationRules.ts` centraliza `MATCH_TOLERANCE_CENTS` numa constante única, com comentário proibindo duplicar o número — é o padrão que `BR-FIN-002` registra como o melhor exemplo de conformidade do domínio. O projeto sabe centralizar; a regra mais crítica do módulo é a que não centralizou.

**Divergências já materializadas entre as cópias** (a duplicação não é apenas estética):
- (7) usa `parseFloat` em vez de centavos — a única das sete que não segue a regra "sempre em centavos" declarada em (1):48.
- (3)/(4) gravam `amount_paid = totalCents/100` (quitação integral) e (5) grava `paidCents + incomingCents` (acúmulo) — duas semânticas de baixa convivendo.
- Só (1) e (2) rejeitam `status === 'canceled'` **e** `'paid'`; (5) só verifica `remittanceItem.status === 'pending'`, nunca o status do recebível.

**AUD-SERVICE-5 — Quatro caminhos de escrita em `accounts_payable`, com validação de entidade em apenas um**
*Severidade MEDIUM · Confiança HIGH*

| Caminho | Entrada | Valida via `AccountPayableEntity`? | Transação? |
|---|---|---|---|
| `financial/CreatePayableUseCase.ts:52-66` | `POST /api/finance/payable` | **Sim** (:53) | não |
| `purchases/ReceivePurchaseItemsUseCase.ts:333` | recebimento de compra | não (regras próprias em `purchasePayableRules.ts`) | **sim** |
| `facilities/AccountPayableServiceAdapter.ts:25-32` | pagamento de multa | **não** | não |
| `juridico/AccountPayableServiceAdapter.ts:24` | custo de processo | **não** | não |

`AccountPayableEntity.ts:64-72` é a única guarda de `amount > 0` e obrigatoriedade de `description`/`due_date`. Os dois adapters chamam `financialRepository.createPayable` **direto**, pulando o use case e a entidade. Em `juridico/RegisterCaseCostUseCase.ts:32-34` a validação substituta é `if (!input.amount)` — **truthiness**, que aceita valor **negativo** onde a entidade rejeitaria. (Se o schema Zod da rota de `juridico` fechar esse caso, a defesa é de borda HTTP, não da camada de serviço, e continua ausente nas outras duas vias — registro a verificação de borda como matéria de T-09/T-12, não como refutação deste finding.)

Há ainda **duas classes `AccountPayableService` distintas**, uma em `facilities/application/services/` e outra em `juridico/application/services/`, com `CreatePayableData` divergente (`cost_center_id` numa, `legal_case_id`/`legal_expense_type` na outra) — o próprio JSDoc de cada uma aponta para a outra como "mesmo padrão". É duplicação de porta consciente, sem porta comum.

**AUD-SERVICE-6 — Audit log de baixa registra `status: 'paid'` fixo e `amount` de face, mesmo em pagamento parcial**
*Severidade MEDIUM · Confiança HIGH · interface obrigatória com T-03*

- `financialController.ts:75` — `newValues: { status: 'paid', amount: account.amount }`
- `financialController.ts:189` — idem, lado pagável
- `:76` e `:190` — `description: "... recebida" / "... paga"`

O use case pode ter devolvido `status = 'partial'` (`PayPayableUseCase.ts:68`) e ter aplicado R$ 200 de R$ 1.000; a trilha de auditoria registra `paid` e `1000`. **Agravante material:** não existe tabela de parcelas de pagamento — `amount_paid` é um acumulador escalar em `accounts_payable`/`accounts_receivable` e **o audit log é o único registro de que cada baixa individual existiu**. Sendo ele o único registro, ele registra o valor errado e o estado errado. Além disso, `logAction` é chamado **depois** do `commit` do use case e **não é aguardado** — falha do log não desfaz a baixa.

**AUD-SERVICE-7 — `LATENTE` · Dedup de retorno CNAB executa fora da transação que grava a baixa**
*Severidade MEDIUM (rebaixada de HIGH por inalcançabilidade — §1) · Confiança HIGH*

- `financial/domain/repositories/CnabRepository.ts:33` — `findExistingOccurrence(where)` é o **único** método do contrato sem parâmetro `transaction`; os 9 vizinhos (`:29,30,31,34,35,36,38,39`) têm.
- `SequelizeCnabRepository.ts:111-120` — `CnabReturnOccurrence.findOne({ where })`, sem `transaction`.
- `ProcessReturnFileUseCase.ts:70-79` chama esse dedup dentro do laço que, nas linhas 93-124, **grava a baixa do recebível e a ocorrência dentro da transação**.

Ou seja: a leitura que decide "isto é duplicata" não enxerga o que a própria transação acabou de escrever. O JSDoc do use case (`:22-25`) afirma que "reimportar o mesmo arquivo **ou um arquivo com ocorrências repetidas** não duplica a baixa" — a segunda metade da afirmação é falsa por construção. A dupla baixa do recebível é contida por acidente pela guarda `remittanceItem.status === 'pending'` (`:85`), que roda dentro da transação; o que escapa é a criação de linhas de ocorrência duplicadas e a contagem errada de `duplicates_skipped`. Sob concorrência (dois retornos processados em paralelo) a proteção depende de `findRemittanceItemByNossoNumeroForUpdate` — não verificável estaticamente.

**AUD-SERVICE-8 — Ausência de segregação de funções em 100% dos atos financeiros da trilha**
*Severidade MEDIUM · Confiança HIGH · interface obrigatória com T-09 (FIND-ERP-009)*

`shared/domain/segregationOfDuties.ts` existe e é usado em exatamente 3 módulos — `purchases` (`ApprovePurchaseUseCase.ts:14`, `ChangePurchaseStatusUseCase.ts:16`), `purchaseRequisitions` (`:50`) e `comex` (`:33`). **Zero call sites** em `financial`, `treasury`, `accounting` e `budget`. Consequências verificadas linha a linha:

- `PostEntryUseCase.ts:84-88` grava `approved_by: userId` — quem posta aprova a si mesmo, sem comparar com `created_by`.
- `ReverseEntryUseCase.ts:57-67` cria o lançamento de estorno já `posted`, com `created_by`, `approved_by` e `approved_at` do **mesmo** usuário, sem checar autoria do original — e o estorno nasce `posted`, logo é ele próprio estornável, em cadeia.
- `PayPayableUseCase`/`ReceivePaymentUseCase`: quem cria o título pode baixá-lo, em `operate`.
- `SettleOperationUseCase`/`CancelOperationUseCase`: `approve` é exigido no router (`treasury.ts:48-49`) mas não há checagem de identidade.

Isto **valida** e não copia `BR-CTB-001` (condição ausente nº 1) — confirmei as âncoras por leitura própria. Não o promovo a HIGH: T-09 é dona da superfície de segregação e da alçada, e elevar aqui seria decidir no lugar do titular.

### LOW

**AUD-SERVICE-9 — Numeração `LC-{COUNT(*)+1}` em livro contábil.** `CreateEntryUseCase.ts:73-74` e `ReverseEntryUseCase.ts:53-54`. **Mitigação verificada:** `AccountingEntry.ts:46` e o índice `uq_accounting_entries_entry_number` (`:67`) impõem UNIQUE — colisão falha alto, não silencia. **Mas** a numeração fica com buracos após qualquer exclusão e o `COUNT` é feito dentro da transação sem lock de tabela. Limitação **declarada** pelo autor (`CreateEntryUseCase.ts:7-12`), o que a torna risco aceito documentado, não desconhecido. Já é o achado P2-1 da auditoria de 2026-08-07 — referência cruzada, sem duplicar.

**AUD-SERVICE-10 — `updatePayableCostCenter`/`updateReceivableCostCenter` fazem read-then-write sem lock nem transação** (`SequelizeFinancialRepository.ts:99-112`), alcançáveis por `finance.ts:31` e `:37`. Impacto financeiro indireto: o centro de custo é a chave de agregação do relatório Orçado × Realizado (`GetBudgetVsActualReportUseCase.ts:59`).

---

## 3. Adjudicações que me foram dirigidas

### 3.1 FIND-ERP-001 grupo B — âncoras **CONFIRMADAS**, caracterização **refinada**

`PayPayableUseCase.ts:43-44` e `ReceivePaymentUseCase.ts:43-44` rejeitam apenas `'paid'` e `'canceled'`; `'partial'` passa. Confirmado por leitura própria, e coerente com o teste de caracterização congelado no passo 30 (`server/tests/characterization/comercial-financeiro--pagamento-parcial-repetido.test.ts:79-100`).

**Refinamento que devolvo ao director, com peso de resultado de auditoria:**

1. **A guarda de status não é o defeito — a ausência de chave de negócio é.** Aceitar uma segunda baixa parcial sobre um título `partial` é exatamente o comportamento **legítimo** que `BR-FIN-003` protege. Uma remediação que passe a rejeitar `partial` **violaria** `BR-FIN-003`. O defeito é que **não existe nada** — nem `idempotency_key`, nem número de parcela do pagamento, nem hash de operação — que distinga a segunda parcela legítima do retry da primeira. Varredura de `idempot*` em `server/src`: **34 arquivos**, nenhum deles em `financial`, `treasury`, `accounting` ou `budget`.
2. **O dano é limitado em valor e ilimitado em rastreabilidade.** A guarda `paymentCents > remainingCents` (`:58-60`) impede que `amount_paid` ultrapasse o valor de face — confirmado pelo terceiro caso do teste de caracterização (`:118-136`). O dano não é pagar a mais: é o título ser marcado `paid` tendo saído do caixa apenas parte, **sem que o ERP conserve qualquer registro das baixas individuais** (§AUD-SERVICE-6), tornando a divergência irreconciliável internamente.
3. **Restrição de projeto, não recomendação de correção** (Regra 2, Regra 3): qualquer chave adotada precisa satisfazer `BR-FIN-003`. Registro que `accounts_receivable` **já possui** a coluna `installment`, populada com numeração contínua por venda em `services/saleReceivableService.ts:210-221` — é fato observado, não desenho de solução, e o lado **pagável** não tem equivalente.
4. A triagem SanaCore entrou como hipótese; nenhuma afirmação dela é citada como prova (Regra 3, EMENDA-01 §A).

### 3.2 T-04 Classe C — `finance.ts:30` e `finance.ts:36` em `operate`: **impacto de processo adjudicado**

T-04 entregou o mecanismo. Meu veredito de processo, com o efeito ampliado por dois fatores que só se enxergam de dentro do módulo:

- **Não há nível gestor em nenhum ponto do ciclo do título.** `financeiro:operate` cria o passivo (`finance.ts:29`, `:35`), baixa (`:30`, `:36`) e move o centro de custo (`:31`, `:37`). O módulo `financeiro` **não usa `approve` em nenhuma das 22 rotas alcançáveis** — enquanto `accounting` e `treasury`, do mesmo departamento, exigem `approve` nas transições sensíveis (`accounting.ts:43-44`, `treasury.ts:48-49`). A assimetria é interna ao próprio Financeiro.
- **Nenhum controle compensatório na camada de serviço.** Confirmado em AUD-SERVICE-8: zero segregação, zero teto de valor, zero segunda assinatura. Um único usuário `financeiro:operate` executa o ciclo inteiro sozinho.
- **Agravante documental:** o JSDoc de `finance.ts:14-21` afirma que "o único nível concedido ao perfil Financeiro em `financeiro` é `A` (aprovar), então `authorizeModule('financeiro','operate')` já reflete o comportamento equivalente". Isso condiciona o controle de desembolso a **como os perfis estão configurados no banco**, não ao que o código exige — e o estado do banco real é justamente o que `RES-10` declara não observável nesta run.
- **Severidade que proponho:** mantida em MEDIUM (nível de T-04), **com registro expresso** de que a elevação a HIGH depende de duas evidências que não possuo — DYN-04 e a configuração efetiva de perfis. Não elevo por analogia nem por indignação.

### 3.3 `BR_CATALOG.md` — validado por leitura própria, não copiado

| BR | Âncora conferida | Veredito T-07 |
|---|---|---|
| BR-FIN-001 | `ReceivePaymentUseCase.ts:39` | **Confirmada** e simétrica com `PayPayableUseCase`. As 4 ausências da ficha (juros/multa, `payment_date` livre, sem segregação, sem lançamento contábil) foram todas reconferidas e são verdadeiras. **Acrescento uma 5ª, não registrada em lugar nenhum:** o efeito sobre a projeção de caixa — AUD-SERVICE-1. |
| BR-FIN-002 | `reconciliationRules.ts:16` | **Confirmada.** Constante única, `MATCH_TOLERANCE_CENTS`, consumida em `MatchEntryUseCase.ts:6,72,111`. É o melhor exemplo de centralização do domínio — e por isso o contraexemplo mais forte contra AUD-SERVICE-4. |
| BR-FIN-003 | decisão humana, APR-2026-021 Parte B | **Aplicada**, com a consequência de projeto do §3.1. |
| BR-CTB-001 | `ReverseEntryUseCase.ts:42` | **Confirmada**, incluindo as 6 condições ausentes. Reconferi a nº 1 (segregação) linha a linha. |
| BR-CTB-002 | `PostEntryUseCase.ts:53` | **Confirmada.** Partida dobrada em centavos, ≥2 itens, ≥1 débito e ≥1 crédito, `totalDebitCents !== totalCreditCents` rejeita (`:74-82`). Coerente com `validateEntryItemsShape`. Melhor regra da trilha. |
| BR-CTR-001 | `DeleteBudgetLineUseCase.ts:27` | **Confirmada.** `GetBudgetVsActualReportUseCase.ts:92-96` calcula `variance` e devolve — informativo, nunca impeditivo. Nenhuma criação de título consulta `budget_lines` (varredura própria). `budget.ts:16-21` declara a ausência de `approve` como decisão de projeto. |
| BR-TES-001 | `SettleOperationUseCase.ts:30` | **Confirmada com as 3 lacunas.** Reconferi a nº 1: `settle`/`cancel` gravam **apenas** o status; zero escrita em saldo bancário, zero lançamento contábil, zero título. |

**Lacuna de cobertura de BR, registrada (não é regra inventada):** os 50 endpoints alcançáveis da trilha têm **7 BRs** catalogadas (FIN 001-003, CTB 001-002, CTR 001, TES 001). Não há BR alguma para: conciliação bancária OFX além da tolerância, importação/dedup de extrato, projeção de fluxo de caixa (diária e semanal), relatório de centro de custo, plano de contas, balancete, CRUD de conta bancária, posição de caixa e toda a cadeia CNAB. `BR_CATALOG.md:437` declara "próximo livre em FIN: 004" — a numeração está livre, a superfície não está descrita.

---

## 4. Conformidades registradas (com o mesmo peso das falhas)

Auditoria que só lista defeito é viés. Verifiquei e confirmo:

- **Lock pessimista correto** em toda leitura-para-escrita de título: `findPayableByIdForUpdate`/`findReceivableByIdForUpdate` (`SequelizeFinancialRepository.ts:48-53, 81-86`) com `LOCK.UPDATE`, usados por `PayPayableUseCase.ts:41`, `ReceivePaymentUseCase.ts:41`, `MatchEntryUseCase.ts:62,101`, `UnmatchEntryUseCase.ts:47,55`.
- **Transação com rollback correto** em `reconciliationController.ts:33-37,45,60,85` e `accountingEntryController.ts:36-40,69,77,90` — o helper `rollbackIfPending` evita rollback após commit, e todo `catch` chama rollback antes do `next(error)`. Padrão consistente entre os dois módulos.
- **`MatchEntryUseCase` é o melhor use case financeiro da trilha:** XOR validado (`:42-44`), sinal do lançamento validado contra a natureza da conta (`:58-60`, `:97-99`), tolerância de centavos por constante única, dupla escrita (baixa + vínculo) dentro da mesma transação recebida do controller, com locks nos dois registros.
- **`UnmatchEntryUseCase.ts:46-62`** recusa desfazer vínculo de conta já baixada, com mensagem que explica a consequência — decisão conservadora documentada, não omissão.
- **Aritmética em centavos** consistente em `PostEntryUseCase` (`toCents`/`fromCents`), `purchasePayableRules.ts:71-81`, `saleReceivableService.ts:123-154` e nos use cases de baixa.
- **`services/saleReceivableService.ts`** — fundamentação normativa citada (CPC 47 itens 31/38/108), gateway sem acoplamento a Sequelize, guarda anti-duplicação de dado legado (`:207-208`), numeração de parcela contínua entre emissões (`:210-215`), e a regra explícita de que **nenhuma parcela nasce `paid`** (`:35-43`), que corrige uma quebra de segregação anterior. Exemplo de camada de serviço bem colocada.
- **`ReceivePurchaseItemsUseCase.createReceiptPayable`** (`:307-345`) — o **único** caminho de criação de título que é idempotente por chave de negócio: dedup por `(purchase_id, invoice_number)` (`:330-331`) mais guarda de dado legado (`:327-328`), tudo dentro da transação do recebimento. É a prova, dentro do próprio repositório, de que a solução exigida por `BR-FIN-003` já existe e simplesmente não foi aplicada à baixa.
- **`reconciliationRules.ts`** como fonte única de constante, com comentário proibindo duplicação.
- **Regra 24 — não violada nesta trilha.** Varredura própria de `req.body.(role|userRole|isAdmin|perfil)`, `req.query` e headers `x-*` nos 4 módulos: **zero ocorrências**. `accountingEntryController.ts:26` tipa `req.user` com `role`, mas o campo vem de `authenticate`, nunca do payload, e não é usado em decisão. `reconciliationController.ts:143` e `accountingEntryController.ts:131,160` usam `req.user.id` para autoria — origem correta.

---

## 5. Cobertura efetiva

| Módulo | Declarados | Alcançáveis | Lidos 100% | D3/D4 |
|---|---|---|---|---|
| `financial` | 30 | **22** | 22/22 + 8 inalcançáveis lidos assim mesmo | **E** |
| `treasury` | 11 | 11 | 11/11 | **E** (C-07) |
| `accounting` | 11 | 11 | 11/11 | **E** (C-08) |
| `budget` | 6 | 6 | 6/6 | **E** (C-09) |
| **Total** | **58** | **50** | **58/58 declarados** | **E** |

**Amostragem: zero.** Conforme G3, operações financeiras e integridade de dados vedam amostragem reduzida; li 100% dos use cases, controllers, routers, repositórios e entidades dos 4 módulos, mais os 4 caminhos externos que escrevem título financeiro (`purchases`, `facilities`, `juridico`, `fiscal`/`saleReceivableService`).

**Varredura de testes: `server/tests/` inteiro**, não a pasta do módulo. 44 arquivos com relação à trilha. Cobertura relevante existente: `accounting-use-cases`, `treasury-use-cases`, `budget-use-cases`, `reconciliation-use-cases`, `integrity-transaction-guards`, `cost-center-realized-payment-date`, `g13-payable-receivable`, `bank-reconciliation-ofx-import`, `facilities-fine-use-cases`, `juridico-legal-case-use-cases`, `cost-centers-and-cashflow-projection`, e a caracterização do passo 30. **Sem cobertura alguma:** toda a cadeia CNAB (8 endpoints, 6 use cases, 5 módulos de infraestrutura). Se `facilities-fine-use-cases.test.ts` cobre a dupla chamada de `PayFineUseCase` é matéria de T-20 (efetividade de asserção, D7, RES-06) — não afirmo nem nego sem executar.

**Não coberto por esta trilha, declarado:** efetividade das asserções dos testes (T-20/RES-06); semântica de coluna das 12 tabelas financeiras (T-13); imutabilidade de `accounting_entries` no nível de audit log (T-03 — meu insumo é o §AUD-SERVICE-6 e a cadeia de estorno de AUD-SERVICE-8); ciclo de vida da multa em `facilities` (T-16); validação Zod de borda das rotas de `juridico` e `facilities` (T-09/T-12/T-16).

---

## 6. Pedidos DYN — `vericore-audit-verification-runner`, contra `erp_evok_audio_test`

Banco real **proibido** (`APR-2026-016`). Nenhum pedido toca `erp_evok_audio`.

| ID | Pedido | Critério de aceite | Solicitante |
|---|---|---|---|
| **DYN-03** (já na fila) | Duas chamadas idênticas a `PUT /api/finance/payable/:id/pay` com `amount` ≤ saldo, sobre título já `partial` | 2ª aceita e `amount_paid` acumula ⇒ FIND-ERP-001 grupo B confirmado dinamicamente; 2ª rejeitada ⇒ existe controle não visível na leitura estática | T-07 |
| **DYN-T07-A** *(novo)* | Título de R$ 1.000 com R$ 200 baixados (`status='partial'`, `payment_date` preenchido) → `GET /api/finance/cashflow/projection?days=90` e `GET /api/finance/cash-flow-projection` | O título **não aparece** em nenhuma das duas séries ⇒ **AUD-SERVICE-1 confirmado**. Este é o pedido de maior valor probatório da trilha: é 100% SQL, determinístico, e não depende de concorrência | T-07 |
| **DYN-T07-B** *(novo)* | Duas chamadas a `POST /api/facilities/fines/:id/pay` sobre a mesma multa | Duas linhas em `accounts_payable` para a mesma `fine` ⇒ **AUD-SERVICE-2 confirmado**. Variante com falha injetada no 2º write, para provar o título órfão | T-07, handoff T-16 |
| **DYN-T07-C** *(novo)* | Dois `POST /api/accounting/entries` concorrentes | Violação de `uq_accounting_entries_entry_number` com erro 500 não tratado (falha alto, dado íntegro) **ou** colisão silenciosa. Determina se AUD-SERVICE-9 permanece LOW | T-07 |
| **DYN-T07-D** *(condicional)* | Retorno CNAB com ocorrência repetida no **mesmo** arquivo | **PREJUDICADO** enquanto `cnab.ts` não for montado (§1). Registrado para não se perder; executável só via chamada direta ao use case, sem borda HTTP | T-07 |

**Estado da trilha: `READY_TO_CLOSE_BLOCKED_BY_G4`** (EMENDA-02 §8.1). O "Pronto quando" de T-07 exige classificação de idempotência **provada** por caminho; sem DYN, AUD-SERVICE-1, 2 e o grupo B do FIND-ERP-001 permanecem provados **por leitura**, não por execução. **Não declaro conformidade com G3 nas dimensões dependentes de DYN** — declarar seria a promessa vazia do SIM-002. `CONFLITO-G3×G4` incide integralmente sobre esta trilha: operações financeiras é categoria vedada nominal.

**Contribuição ao registro de risco residual (G3-b):** RES-11 (evidência dinâmica ausente) e RES-06 (efetividade de asserção) incidem aqui. Acrescento, como risco residual **próprio de T-07**: *a cadeia CNAB tem 5 tabelas criadas por migration, zero endpoints alcançáveis e zero testes — a auditoria não pode afirmar nada sobre o estado dessas tabelas no banco, e `RES-10` cobre a impossibilidade de observá-lo.*

---

## 7. Medição de esforço (G11-c)

| Item | Valor |
|---|---|
| Estimado na tarefa recebida | **4 S** |
| Estimado **vigente** | **6 S** — `AUDIT_PLAN_EMENDA_02.md:353` eleva T-07 de 4 para 6 S por C-07/C-08/C-09 (D3 exaustivo em `treasury`/`accounting`/`budget`, 28 endpoints) |
| Esforço real | **≈ 1,5 S** |

**Leitura honesta, com a discrepância registrada em vez de acomodada:**

1. **A tarefa que recebi cita 4 S — o número pré-EMENDA-02.** O plano vigente diz 6 S. Registro a divergência sem conciliá-la em silêncio (cláusula de leitura conjunta, EMENDA-02 §0). Se a medição for consolidada contra 4 S, ela estará comparando contra um número revogado.
2. **Não houve extrapolação: houve subexecução, de 75% contra o número vigente.** Não vou apresentar isso como eficiência.
3. **A causa é verificável e específica desta trilha:** os 50 endpoints alcançáveis se distribuem em ~35 use cases pequenos, quase todos com uma única responsabilidade e JSDoc denso — o custo por endpoint aqui é uma fração do de `juridico` (75) ou `sst` (75). E **8 dos 30 endpoints de `financial` são código morto**, o que retirou da leitura de veredito toda a cadeia CNAB (a li assim mesmo, mas para adjudicar inalcançabilidade, não para classificar cada rota). A elevação de +2 S da EMENDA-02 assumiu 28 endpoints de `treasury`/`accounting`/`budget` de complexidade média; a complexidade real deles é baixa e uniforme.
4. **O que a subexecução custou — declarado, não escondido.** Duas frentes ficaram no mínimo suficiente: (a) a leitura dos **validators** (`financialValidators`, `treasuryValidators`, `accountingEntryValidators`, `budgetValidators`, `reconciliationValidators`) foi de superfície — suficiente para afirmar que a validação de entrada existe em todos os writes, **insuficiente** para auditar cada schema campo a campo, que é D2 e é dimensão vedada por G3; (b) as 5 migrations e 5 models do CNAB foram lidas por listagem, não por conteúdo. Se o director considerar (a) material para G3, **peço 0,5 S adicional** — e registro que não a absorvi em silêncio.
5. **Recomendação de método para o dimensionamento residual de W2** (não é decisão — Regra 6): o preditor de esforço desta run é **quantidade de use cases distintos**, não quantidade de endpoints. T-07 tem 50 endpoints e ~35 use cases pequenos; a proporção nas trilhas de `rh`/`sst` é outra. Se o número de T-07 for extrapolado por endpoint para as trilhas restantes, ele subestimará.

---

## 8. Restrições cumpridas

- Nenhuma escrita em `src/`, `product/`, `tests/`, `requirements/`, `architecture/`. Nenhum arquivo criado.
- Nenhuma execução de código, nenhum teste rodado, nenhuma conexão de banco.
- `c9359be` / `legacy-baseline-001` **não** citado como estado do código auditado; toda âncora é do `AUDIT_COMMIT c1311a6f…` (EMENDA-02 §8.2).
- Insumo SanaCore tratado como hipótese, jamais como prova (Regra 3, EMENDA-01 §A).
- Nenhum juízo sobre se as regras estão **certas para o negócio** — julguei **onde** e **como** elas vivem. Onde a regra de negócio em si é o objeto (juros/multa, limite orçamentário, integração contábil), o registro é lacuna e o mandato é do `domain-logic`/`business-rule-auditor`.
- Nenhum `RETEST_PASSED`, nenhum `FINDING CLOSED`, nenhum `AUDIT_PASSED`.

**Destino:** `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/T-07_FINANCEIRO.md` (persistência pelo `vericore-audit-evidence-controller`). AUD-SERVICE-1, 2 e 3 seguem como `PROPOSED` ao `vericore-finding-validator` (Regra 22).
