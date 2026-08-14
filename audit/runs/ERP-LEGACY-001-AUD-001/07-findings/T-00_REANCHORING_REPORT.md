# T-00 — RELATÓRIO DE RE-ANCORAGEM E INTEGRIDADE DO OBJETO

```
AUDIT_ID:      ERP-LEGACY-001-AUD-001
TRILHA:        T-00 (onda W0 — fundação: integridade + re-ancoragem)
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f   (imutável — Regras 12-14)
TAREFAS:       RA-01 … RA-07 (AUDIT_PLAN.md §3.3). RA-08 é de T-05; RA-09 é do
               vericore-audit-scope-agent e está BLOQUEADA POR G6 (§4)
DATA:          2026-08-14
PRODUZIDO POR: vericore-finding-validator (autor de nenhum dos 7 findings —
               AUDIT_SCOPE.md §8.3; AUDIT_PLAN.md §7)
NATUREZA:      relatório de re-ancoragem. **NÃO** é veredito de auditoria, **NÃO**
               emite finding, **NÃO** altera severidade, confiança ou status de
               nenhum finding, **NÃO** altera o objeto auditado (Regra 2) e **NÃO**
               altera evidência de outra organização (Regra 15)
ESTADO:        RE-ANCORAGEM CONCLUÍDA — 7/7 findings com veredito registrado
VERSÃO:        v2 — retificada pelo **ADENDO-01** (§2.0), que registra a refutação
               de um argumento probatório da v1. **A classificação 7/7 não mudou**
```

Documentos vinculantes lidos em conjunto (cláusula de conjunto da EMENDA-02 §0):
`00-scope/AUDIT_SCOPE.md`, `02-plan/AUDIT_PLAN.md`, `02-plan/AUDIT_PLAN_EMENDA_01.md`,
`02-plan/AUDIT_PLAN_EMENDA_02.md`, `coretriad/governance/HUMAN_GATE_RECORD-ERP-LEGACY-001-AUD-001.md`.

---

## 0. Sumário executivo

| Finding | Sev. declarada | RA | Veredito de re-ancoragem | Âncoras reconferidas |
|---|---|---|---|---|
| FIND-ERP-001 | CRITICAL | RA-07 | **ÂNCORAS_VÁLIDAS** | 14 arquivos / 24 faixas |
| FIND-ERP-002 | HIGH | RA-01 | **ÂNCORAS_VÁLIDAS** | 5 arquivos / 12 faixas + 1 varredura própria |
| FIND-ERP-005 | CRITICAL | RA-02 | **ÂNCORAS_VÁLIDAS** | 9 arquivos / 17 faixas |
| FIND-ERP-006 | HIGH | RA-03 | **ÂNCORAS_VÁLIDAS** | amostra dirigida de 5 arquivos / 8 faixas |
| FIND-ERP-007 | MEDIUM | RA-04 | **ÂNCORAS_VÁLIDAS** | 3 arquivos / 5 faixas (as 3 load-bearing) |
| FIND-ERP-008 | HIGH | RA-05 | **ÂNCORAS_VÁLIDAS** | 4 arquivos / 6 faixas (server + client) |
| FIND-ERP-009 | HIGH | RA-06 | **ÂNCORAS_VÁLIDAS** | 4 call sites D-K (varredura própria) + 4 pontos "N" amostrados |

**Zero `ÂNCORAS_DERIVADAS`. Zero `ÂNCORAS_INVÁLIDAS`.**

**Fundamento do veredito (retificado — ver §2):** o veredito repousa, em primeiro
lugar, na **releitura direta de cada âncora no `AUDIT_COMMIT`** (§3) — que é
suficiente por si só — e, em segundo lugar, no fato verificado de que **nenhum dos
8 arquivos alterados entre `c9359be` e `c1311a6f` é âncora de nenhum dos 7
findings** (§2.2), o que **explica** por que as âncoras sobreviveram.

**Nenhum finding foi reclassificado, rebaixado ou promovido por este relatório.**
Re-ancoragem ≠ (re)validação de mérito: a validação de mérito dos CRITICAL/HIGH é
**T-25** (Regra 22), na onda W4, e é lá que a tentativa de refutação ocorre.

---

## 1. Integridade do objeto auditado

### 1.1 E1 reconfirmada — leitura da árvore de trabalho == leitura do AUDIT_COMMIT

Evidência dinâmica coletada pelo **orquestrador da sessão**, não por agente auditor
VeriCore — mesmo padrão de transparência de `AUDIT_PLAN.md` §2.3 e dos passos 23/24
do discovery. Registro sem eufemismo, com cadeia de custódia declarada:

| # | Comando | Saída | Leitura |
|---|---|---|---|
| **E1** (reexecutado no início de T-00, cumprindo EMENDA-02 §8.4.2 e §10.2.2) | `git diff --stat c1311a6f76b512fef893f7e60d934179cae3409f HEAD -- server client mobile tv .github` | **vazia** | A árvore de trabalho de `main` é **idêntica** ao `AUDIT_COMMIT` em **todos** os caminhos auditados. Ler o arquivo no disco **é** ler o `AUDIT_COMMIT` |
| **E-WT** | `git worktree list` | worktree isolada `C:/Sistema EvokAudio/ERP-Evok-sana-FIND-ERP-005`, branch `sana/ERP-LEGACY-001/FIND-ERP-005`, commit WIP `67b49fb`, publicada em `origin` | A remediação SanaCore do `FIND-ERP-005` **não corre na `main`** |

**Estado de L2 (working tree × commit): FECHADA**, reconfirmada nesta data.
Toda leitura de código deste relatório foi feita na árvore de `main`, sob essa
equivalência — **nenhuma** leitura foi feita na worktree SanaCore.

### 1.2 Registro obrigatório — mitigação concreta do risco de G7

A `EMENDA-02` §8.4 declarou G7 o "gate aberto de maior risco de contaminação da
run", porque a `APR-2026-021` Parte C autorizou a SanaCore a executar CASE-001 e
CASE-002 **em paralelo ao fieldwork**, produzindo commits novos sobre o mesmo
código durante a auditoria. T-00 registra o fato material que **mitiga** esse risco
no estado atual:

> A remediação do `FIND-ERP-005` roda em **worktree e branch isolados**
> (`sana/ERP-LEGACY-001/FIND-ERP-005`), **não** na `main`. Enquanto esse branch não
> for integrado, `main` permanece idêntica ao `AUDIT_COMMIT` (E1 vazia) e a
> equivalência declarada em `AUDIT_PLAN.md` §2.2 (fechamento de L2) **continua
> válida**.

**Condições de validade, declaradas agora para não serem reconstruídas depois:**

1. A equivalência vale **exclusivamente enquanto E1 permanecer vazia**.
2. **No primeiro merge/rebase do branch SanaCore em `main`, L2 REABRE** e toda
   leitura de evidência passa a exigir `git show c1311a6f:<arquivo>` ou uma
   worktree do próprio `AUDIT_COMMIT` — **nunca** o working tree. Isto vincula
   todas as 27 trilhas, não apenas T-00.
3. Isolamento em worktree **não** é decisão de gate: **não supre G7** (Regra 18). É
   mitigação de fato, não autorização. O que G7 decidiria — que as remediações não
   entram nesta run e exigem delta audit — continua **não decidido**, e **RES-12**
   permanece integralmente em vigor.
4. Consequência normativa reafirmada (EMENDA-02 §8.4.3): **nenhum `RETEST_PASSED` e
   nenhum `FINDING CLOSED`** de `FIND-ERP-001` ou `FIND-ERP-005` pode sair desta
   run — o reteste incidiria sobre commit **posterior** ao `AUDIT_COMMIT`, o que é
   delta audit por definição (Regras 4 e 14).

### 1.3 DYN-01 não executada — substituição declarada

`DYN-01` (reexecução de E1/E2/E3 sob custódia VeriCore) está **bloqueada por G4,
aberto**. Conforme EMENDA-02 §10.2.3, T-00 usa a evidência do orquestrador com a
custódia declarada e **registra a substituição**: perde-se a independência da cadeia
de custódia, **não** o fato — os comandos são read-only sobre `.git`, reprodutíveis
por qualquer terceiro com acesso de leitura, e não tocam o produto nem qualquer
banco (regime `APR-2026-016` intacto: nenhuma execução, nenhuma conexão a
`erp_evok_audio`, nenhum teste rodado por este agente).

---

## 2. Por que as âncoras sobreviveram — fundamento retificado

### 2.0 ADENDO-01 — ARGUMENTO REFUTADO, registrado como refutado

**Correção por adição rastreável, nunca por reescrita silenciosa** — a mesma
disciplina que este relatório exige de terceiros (RA-09, EMENDA-01, EMENDA-02).
O argumento abaixo foi apresentado na **v1 deste relatório como "prova decisiva"** e
está **REFUTADO**. Fica registrado, não apagado.

**O que a v1 afirmava (ARG-01):** que os 7 findings foram lidos numa árvore
**posterior** a `3dee99f` ("etiqueta incorreta sobre leitura correta"), provado por
deslocamento de linha — *"`FIND-ERP-001` localiza `InventoryService.adjust` em
`CreateInventoryMovementUseCase.ts:107`; o bloco `item_id` das linhas 80-90 veio de
`3dee99f`; logo, em `c9359be` esse bloco não existiria e `adjust` não poderia estar
na 107"*.

**Verificação que o refutou** — executada pelo **orquestrador da sessão**, mesma
cadeia de custódia declarada de E1 (§1.1), reprodutível por terceiro:

| # | Comando | Saída | Efeito sobre ARG-01 |
|---|---|---|---|
| R-01 | `git show c9359be:server/src/modules/inventory/application/use-cases/CreateInventoryMovementUseCase.ts \| Select-String findLegacyProductByItemId` | **True** | **Destrói a premissa.** O bloco `item_id` **já existia na baseline** — não veio de `3dee99f` |
| R-02 | `git show c1311a6f…:<mesmo arquivo> \| Select-String findLegacyProductByItemId` | **True** | idem no AUDIT_COMMIT |
| R-03 | posição de `InventoryService.adjust` nos dois commits | **linha 107 em AMBOS** | A âncora na 107 é compatível com leitura em **qualquer** dos dois commits — **não discrimina nada** |
| R-04 | `git diff --stat c9359be c1311a6f… -- <mesmo arquivo>` | **vazia** | O arquivo usado como prova **nunca mudou** entre baseline e AUDIT_COMMIT |

**Veredito sobre ARG-01: REFUTADO.** O argumento era logicamente válido mas partia
de uma premissa factual falsa (que o bloco `item_id` teria origem em `3dee99f`),
premissa que este agente **inferiu do conteúdo do código** — o bloco cita "mesmo
padrão já usado por `ConvertPlannedOrdersToProductionOrderUseCase`" e trata do
espelhamento item↔produto — **sem verificar o histórico do arquivo**. Não havia
como verificá-lo sem Bash, e a inferência **não deveria ter sido apresentada como
prova**. Registrado como erro de método deste agente, não como detalhe editorial:
**sustentar conclusão correta com prova errada é exatamente o defeito que custou o
`AUDIT_PASSED` do SIM-002** (`AUDIT_PLAN.md` §1, §2.2 do SIM-002).

**O que NÃO muda:** a classificação `ÂNCORAS_VÁLIDAS` 7/7 (§3) **não dependia** de
ARG-01. Ela repousa na releitura direta de cada âncora no `AUDIT_COMMIT`, feita
arquivo a arquivo, linha a linha, e essa releitura permanece integralmente válida.
ARG-01 era **explicação** do resultado, não sua base.

**O que muda:** o fundamento explicativo é substituído pelo de §2.2, que é mais
simples, verificado e mais forte.

### 2.1 O fato de OBS-INV-01 permanece — e permanece relevante para a run

`3dee99f` ∈ (`c9359be`, `1979beb`] (provado por E2/E3, `AUDIT_PLAN.md` §2.1) e
alterou **8 arquivos** de `server/src` depois da tag. Isso continua verdadeiro e
continua significando que **a tag `legacy-baseline-001` não representa o código
auditado** — premissa que o `AUDIT_SCOPE.md` §2.3 ainda afirma (§4).

O que a retificação estabelece é mais estreito e mais preciso: **esse risco, real
em princípio, é inócuo para estes 7 findings em particular.**

### 2.2 Verificação arquivo a arquivo — nenhuma âncora cai nos 8 alterados

Os 8 arquivos alterados entre `c9359be` e `c1311a6f` (`git diff --name-only
c9359be c1311a6f… -- server/src`, saída do orquestrador):

1. `server/src/modules/items/…/CreateItemUseCase.ts`
2. `server/src/modules/items/…/UpdateItemUseCase.ts`
3. `server/src/modules/products/…/CreateProductUseCase.ts`
4. `server/src/modules/products/domain/repositories/ProductRepository.ts`
5. `server/src/modules/products/infrastructure/sequelize/SequelizeProductRepository.ts`
6. `server/src/modules/purchases/…/ReceivePurchaseItemsUseCase.ts`
7. `server/src/services/fixedAssetReceiptService.ts` *(novo)*
8. `server/src/services/itemProductMirrorService.ts` *(novo)*

**Verificação própria executada por T-00** (não recebida pronta): grep dirigido
pelos 8 nomes de arquivo sobre **os 7 arquivos de finding**
(`docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-*.md`), padrão
`CreateItemUseCase|UpdateItemUseCase|CreateProductUseCase|ProductRepository|SequelizeProductRepository|ReceivePurchaseItemsUseCase|fixedAssetReceiptService|itemProductMirrorService`:

> **Resultado: ZERO ocorrências.** Nenhum dos 8 arquivos alterados é citado em
> nenhum dos 7 findings — **não apenas não é âncora: não é mencionado sequer uma
> vez**, em nenhuma seção (`EVIDENCE`, `ACTUAL_BEHAVIOR`, `REPRODUCTION`, lista de
> arquivos lidos, ou validação anexada).

Como um arquivo só pode ser âncora se for nomeado, a ausência total de menção é
**condição suficiente** para concluir a disjunção. Conferência por conjunto de
âncoras, para leitura humana:

| Finding | Módulos/superfícies ancorados | Interseção com os 8 |
|---|---|---|
| FIND-ERP-001 | `financial` (pay/receive/CNAB/repo/rotas), `inventory` (controller/use case/rotas), `models/InventoryMovement.ts`, `models/CnabReturnOccurrence.ts`, `fiscal` (issue/cancel NF-e), `sales` rotas, `mrp` (2 use cases + rotas), `app.ts`, 2 testes | **∅** |
| FIND-ERP-002 | `00_baseline_frozen.sql`, 2 migrations de GRANT, `accounting/UpdateEntryUseCase.ts`, `accounting.ts` | **∅** |
| FIND-ERP-005 | `juridico` (constants/rotas/controller/3 use cases), `middlewares/authorizeAnyModule.ts`, `shared/domain/{segregationOfDuties,accessModules}.ts` | **∅** |
| FIND-ERP-006 | `juridico/lgpd` (controller + 6 use cases + rotas), 3 models `JurLgpd*` | **∅** |
| FIND-ERP-007 | `rh` (validators/controller/2 use cases), `models/HrTerminationProcess.ts`, `errors/index.ts` | **∅** |
| FIND-ERP-008 | `sst` (use cases/rotas/controller/serviço de prazo), models `SstCat`/`SstAcidente`, `client/src/api/sst.ts`, `client/…/AccidentsTab.tsx` | **∅** |
| FIND-ERP-009 | `shared/domain/segregationOfDuties.ts` + 4 call sites D-K + ~24 pontos de aprovação (accounting, inventory, bom, ti, marketing, engineering, facilities, juridico, masterProduction…) | **∅** |

**Proximidade máxima, declarada para que ninguém a descubra depois:** o
`FIND-ERP-009` ancora **dois** arquivos do módulo `purchases`
(`ChangePurchaseStatusUseCase.ts:134`, `ApprovePurchaseUseCase.ts:86`) e o commit
`3dee99f` alterou **um terceiro arquivo do mesmo módulo**
(`ReceivePurchaseItemsUseCase.ts`). São **arquivos distintos** — a interseção
permanece vazia, mas a vizinhança é registrada em vez de omitida.

**Limite de alcance desta verificação, declarado:** o `git diff --name-only
c9359be c1311a6f` do orquestrador foi escopado a **`server/src`**. Para as âncoras
**fora** de `server/src` — `server/database/postgresql/00_baseline_frozen.sql` e as
2 migrations (FIND-ERP-002), `client/src/**` (FIND-ERP-008), `server/tests/**`,
`docs/business/**` — o delta `c9359be → c1311a6f` **não foi medido**. Consequência
honesta: para essas âncoras, o fundamento do veredito é **exclusivamente** a
releitura direta no `AUDIT_COMMIT` (§3), que é suficiente por si só, mas a
explicação "não mudou desde a baseline" **não está provada** e não é afirmada aqui.

### 2.3 Estado da tese "declararam um commit e leram outro"

**Rebaixada de conclusão a INDÍCIO NÃO PROVADO.** Com ARG-01 refutado, resta:

- **Indício A (forte, mas autolimitado a 1 dos 7):** `FIND-ERP-009`, LACUNA 2,
  declara textualmente *"Baseline não verificada localmente. A correspondência tag
  → commit foi recebida como entrada e não pôde ser confirmada (`git` exige Bash).
  Os arquivos foram lidos do working tree — o que significa que as leituras podem
  não corresponder ao commit de baseline."* É **admissão do próprio autor**, mas
  vale para **aquele** finding, não para os outros 6.
- **Indício B (fraco):** os demais findings foram produzidos em modo read-only sem
  Bash (declarado nos rodapés), o que torna materialmente improvável que tenham
  feito checkout da tag. **Improbabilidade não é prova.**

**Consequência registrada:** T-00 **não afirma** que os 7 findings foram lidos fora
da baseline declarada. Afirma o que verificou: **as âncoras conferem no
`AUDIT_COMMIT`**, e **os arquivos ancorados não estão entre os 8 que mudaram** —
de modo que, para estes 7 findings, **a questão de qual dos dois commits foi lido é
materialmente indiferente**, porque o conteúdo ancorado é o mesmo nos dois.

---

## 3. Re-ancoragem finding a finding

Método por finding: (i) extração das citações `FILE:`+`LINES:` do bloco `EVIDENCE`
e das citações inline de `ACTUAL_BEHAVIOR`; (ii) leitura direta do arquivo no
`AUDIT_COMMIT` na faixa citada; (iii) comparação do **trecho** com o que o finding
afirma; (iv) classificação. Nenhum número foi aceito de contexto injetado — toda
linha citada abaixo foi relida nesta sessão.

Onde a superfície de âncoras é grande (006, 007, 008, 009), a reconferência foi
**dirigida às âncoras load-bearing** — aquelas de que depende a afirmação central
do finding — e isso está **declarado por finding**, nunca apresentado como
exaustivo. Reconferência integral de âncora não-load-bearing pertence às trilhas de
módulo (T-03, T-06, T-07, T-09, T-12).

### 3.1 FIND-ERP-001 (CRITICAL) — RA-07 — **ÂNCORAS_VÁLIDAS**

| Âncora citada | Conferida no `AUDIT_COMMIT` | Resultado |
|---|---|---|
| `PayPayableUseCase.ts:39-44` | L39 `async execute({ id, payment_date, payment_method, amount })`; L41 `findPayableByIdForUpdate`; **L43** `if (account.status === 'paid') throw new ValidationError`; L44 `'canceled'` | **exata** |
| `PayPayableUseCase.ts:53-68` | L53-55 `paymentCents`; **L62** `const newAmountPaidCents = alreadyPaidCents + paymentCents;`; L68 `status = ... ? 'paid' : 'partial'` | **exata** (inclusive a linha 62 citada nominalmente) |
| `ReceivePaymentUseCase.ts:39-44`, `53-68` | mesma estrutura, mesmo guard, espelho do anterior | **exata** |
| `SequelizeFinancialRepository.ts:48-53` | `findReceivableByIdForUpdate`, `lock: transaction.LOCK.UPDATE` | **exata** |
| `SequelizeFinancialRepository.ts:81-86` | `findPayableByIdForUpdate`, `lock: transaction.LOCK.UPDATE` | **exata** |
| `finance.ts:30, 36` | L30 `PUT /receivable/:id/pay`; L36 `PUT /payable/:id/pay` — ambas `authorizeModule('financeiro','operate')`, sem middleware de idempotência | **exata** |
| `inventoryController.ts:113-137` | **L113** `exports.create`; L114 `const t = await sequelize.transaction()`; L131 `useCase.execute`; **L137** `await t.commit()` | **exata** |
| `CreateInventoryMovementUseCase.ts:71-126` | L71 `async execute(...)`; **L107** `InventoryService.adjust(`; o corpo do `execute` termina em L123 (a faixa citada alcança `module.exports`, L126) | **exata**, com imprecisão inócua de cauda (3 linhas) |
| `InventoryMovement.ts:43-51` | L43 `reference_id`, L48 `reference_type` | **exata** |
| `InventoryMovement.ts:57-69`, com destaque para **L65** | L57 `indexes:`; **L65** `{ fields: ['reference_type', 'reference_id'] }` — **sem `unique: true`**, por leitura literal do objeto de índice | **exata** |
| `inventory.ts:25` | `router.post('/movements', authenticate, authorizeModule('estoque','operate'), inventoryController.create)` | **exata** |
| `GenerateRemittanceUseCase.ts:46` / `75-82` | L46 `findBankingConfigForUpdate` (lock no singleton); L75-82 `findOpenRemittanceItemsByReceivableIds` + `ConflictError` | **exata** |
| `ProcessReturnFileUseCase.ts:53` / `70-79` / `85` / `108` | L53 `findRemittanceItemByNossoNumeroForUpdate(..., transaction)` (lock real); L70-75 `findExistingOccurrence({...})` **sem `transaction`**; **L85** `if (isSettlement && remittanceItem.status === 'pending')`; **L108** `else if (isRejection && remittanceItem.status === 'pending')` | **exata**, incluindo as duas guardas de estado nas linhas nominais |
| `CancelSaleNfeUseCase.ts:92-102` | L92 `findSaleById(saleId)` sem transação/lock; L94-96 guarda `nfe_status !== 'authorized'`; **L102** `await provider.cancel(...)` — chamada externa **antes** de qualquer lock | **exata** |
| `CancelSaleNfeUseCase.ts:104-135` | L104 `sequelize.transaction`; L105 relê com `lock: transaction.LOCK.UPDATE`; L123-125 `wasAuthorized`; L127-135 `restoreCanceledInvoice` | **exata** |
| `ConvertPlannedOrdersToRequisitionUseCase.ts:59-63` / `71-78` / `101` | L59 `execute`; L63 `findPlannedOrdersByIdsForUpdate`; L71-78 guarda `CONVERTIBLE_STATUSES`; **L101** `updatePlannedOrdersStatus(uniqueIds, 'EM_EXECUCAO', transaction)`; comentário do autor original em L90-93 | **exata** |

**Veredito: ÂNCORAS_VÁLIDAS.** Nenhuma derivada, nenhuma inválida. A única
imprecisão é a cauda de 3 linhas em `CreateInventoryMovementUseCase.ts` (faixa
citada 71-126 × corpo real 71-123), que **não afeta** nenhuma afirmação do finding.

**Observação de completude, registrada sem alterar o finding (Regra 15) —
retificada pelo ADENDO-01:** o `execute` de `CreateInventoryMovementUseCase`
contém o ramo `item_id` (L80-90) que o texto do finding não descreve. **Correção:
esse ramo NÃO tem origem em `3dee99f`** — ele já existia na baseline `c9359be`
(comandos R-01/R-04, §2.0), e o arquivo é **idêntico** nos dois commits. Segue
sendo superfície **não enumerada pelo finding**, e por isso permanece como insumo
dirigido a **T-06** (módulo `inventory`) — mas **deixa de ser** insumo a T-05/RA-08,
cujo objeto são os 2 serviços novos de `3dee99f`, que este arquivo não é.

#### RA-07 — verificação independente da re-ancoragem feita pela SanaCore

A `TRIAGE.md` do `CASE-001` (SanaCore) afirma ter relido todas as âncoras do
`FIND-ERP-001` no HEAD `c1311a6` e conclui, em tabela de 10 linhas, "idêntico /
SIM" para todas. Tratamento aplicado, conforme Regra 3 e a instrução expressa da
tarefa: **hipótese a confirmar, jamais verificação feita**. Este agente releu as
âncoras **por conta própria**, no `AUDIT_COMMIT`, **antes** de abrir a triagem.

> **Resultado: CONFIRMAÇÃO INDEPENDENTE — sem divergência.** A leitura própria da
> VeriCore chega ao mesmo resultado material que a triagem SanaCore: as âncoras do
> `FIND-ERP-001` se sustentam integralmente. **Não há divergência a registrar sob a
> Regra 20 neste finding.**

Qualificações obrigatórias, para que convergência não vire deferência:

1. A conclusão vale **porque a evidência VeriCore a sustenta**, não porque a
   SanaCore a afirmou. **Nenhuma linha da `TRIAGE.md` é citada como prova** em
   nenhum ponto deste relatório; ela é citada apenas como **origem de hipótese**.
2. A triagem cita duas âncoras que o finding original **não** cita
   (`inventoryService.ts:327-381` / `:162-190` e
   `InventoryMovementEntity.toServiceInput()`). Elas **não** integram esta
   re-ancoragem: T-00 re-ancora o que o **finding** afirma, não o que a SanaCore
   acrescentou. Segue para **T-06** como insumo dirigido.
3. **Confirmação de âncora não é confirmação de remediação**, não é
   `RETEST_PASSED` e não fecha nada (Regra 4).

### 3.2 FIND-ERP-002 (HIGH) — RA-01 — **ÂNCORAS_VÁLIDAS**

| Âncora citada | Conferida no `AUDIT_COMMIT` | Resultado |
|---|---|---|
| `00_baseline_frozen.sql:3627-3708` (`audit_logs`) | **L3627** `CREATE TABLE public.audit_logs (`, com `old_values`/`new_values` json e `action` enum | **exata** |
| `00_baseline_frozen.sql:12153-12206` (`sale_invoices`) | **L12153** `CREATE TABLE public.sale_invoices (`; L12162 `nfe_status ... DEFAULT 'processing'` | **exata** |
| `00_baseline_frozen.sql:3136-3169` (`accounting_entries`) | **L3136** `CREATE TABLE public.accounting_entries (`; L3142 `status ... DEFAULT 'draft'` | **exata** |
| `00_baseline_frozen.sql:22156-22240` (13 `CREATE TRIGGER`) | **L22156** `CREATE TRIGGER trg_hr_block_delete_employee_benefit BEFORE DELETE ON public.hr_employee_benefits …`; L22163 `trg_hr_block_delete_vacation_schedule` | **exata** |
| Alegação estrutural: **zero** trigger/RULE/REVOKE para as 3 tabelas | **Varredura própria e independente:** grep por `CREATE TRIGGER\|CREATE RULE\|REVOKE` no dump inteiro → **13 ocorrências no total**. Como os 13 `CREATE TRIGGER` de RH/JUR/SST já esgotam a contagem, segue-se **zero `CREATE RULE`, zero `REVOKE` e zero trigger sobre `audit_logs`/`sale_invoices`/`accounting_entries`** | **confirmada por método próprio** |
| `UpdateEntryUseCase.ts:57-59` | **L57-58** `if (current.status !== 'draft') { throw new BusinessRuleError(...apenas lançamentos em rascunho (draft) podem ser editados) }` | **exata** |
| `accounting.ts:43` | **L43** `router.patch('/entries/:id/post', authorizeModule('contabilidade', 'approve'), accountingEntryController.post);` — literal idêntico ao citado | **exata** |

**Veredito: ÂNCORAS_VÁLIDAS.** A alegação mais forte do finding (a ausência é
total, não parcial) foi reconferida por método próprio: a contagem agregada de 13
para os três padrões somados é prova direta de que nenhum `REVOKE` ou `RULE`
escapou da varredura original.

**Nota de escopo, sem prejulgamento:** as âncoras de **privilégio** (as duas
migrations de `GRANT`) não foram reconferidas linha a linha por T-00 — a alegação
de GRANT amplo é **matéria de mérito de T-03/T-13**, não de re-ancoragem.
Registre-se ainda (§2.2, limite de alcance) que o delta baseline→AUDIT_COMMIT
**não foi medido** para `server/database/` nem `server/migrations/`; o veredito
deste finding repousa integralmente na releitura direta no `AUDIT_COMMIT`.

### 3.3 FIND-ERP-005 (CRITICAL) — RA-02 — **ÂNCORAS_VÁLIDAS**

Todas as leituras abaixo foram feitas na árvore de `main` (= `AUDIT_COMMIT`),
**jamais** na worktree `sana/ERP-LEGACY-001/FIND-ERP-005` — precaução material,
porque este é o único finding com remediação em curso.

| Falha | Âncora citada | Conferida no `AUDIT_COMMIT` | Resultado |
|---|---|---|---|
| 1 | `constants.ts:23, 26` | **L23** `export const JUR_APPROVAL_THRESHOLD_DIRECTOR = 50000;`; **L26** `..._FINANCE = 300000;` | **exata** |
| 1 | `constants.ts:38-47` | L38 `export function requiredApproverRoles(...)`; L40-46 as três faixas (`[]`, `['diretor']`, `['diretor','financeiro']`) — **única fonte** | **exata** |
| 2 | `juridico.ts:71` | `router.post('/contracts/:id/approve', authorizeAnyModule([{ moduleKey: 'diretor' }, { moduleKey: 'financeiro' }]), contractController.approve);` — **sem `requiredLevel`**, montada **antes** do gate geral | **exata** |
| 2 | `juridico.ts:83` | `router.use(authorizeModule('juridico', 'operate'));` — gate geral | **exata** |
| 2/3 | `juridico.ts:95-96` | L95 `POST /contracts/:id/activate`; L96 `POST /contracts/:id/addendums` — ambas apenas sob o gate geral `operate` | **exata** |
| 2 | `authorizeAnyModule.ts:52` | JSDoc: *"nível padrão `'operate'`"* | **exata** |
| 2 | `authorizeAnyModule.ts:82` | `candidates.some(({ moduleKey, requiredLevel = 'operate' }) => satisfies(...))` — **default efetivo** | **exata** |
| 2 | `authorizeAnyModule.ts:66-69` | `if (user.role === 'admin') { next(); return; }` — curto-circuito | **exata** |
| 4 | `contractController.ts:50` | `if (user?.role === 'admin') return ['diretor', 'financeiro'];` | **exata** |
| 2 | `contractController.ts:52-53` | `if (user?.permissions?.diretor) roles.push('diretor');` / `financeiro` — resolução por **truthiness** | **exata** |
| 4 | `ApproveContractUseCase.ts:85-88` | L85 `findByContractAndRole(input.contractId, role)`; L86-88 rejeita se `existing` — **dedup por PAPEL** | **exata** |
| 4 | `ApproveContractUseCase.ts:90-95` | grava `approver_user_id: input.approverUserId` **sem compará-lo a nada** | **exata** |
| 3 | `CreateContractAddendumUseCase.ts:59-64`, com destaque para **:61** | **L61** `if (input.new_value !== undefined && input.new_value !== null) contractUpdates.value = input.new_value;` — **não consulta `change_type`**; L63 `await this.repository.update(...)` | **exata**, incluindo o refinamento da variante `change_type='term'` |
| agravante | `ActivateContractUseCase.ts:61-73`, com destaque para **:63** | L62 `requiredApproverRoles(contract.value)`; **L63** `if (requiredRoles.length > 0 && this.approvalRepository) {` — o gate inteiro depende de dependência opcional | **exata** |
| agravante | `ActivateContractUseCase.ts:57` | `if (!['draft','in_approval','approved'].includes(contract.status))` — ativa a partir de `approved` | **exata** |

**Veredito: ÂNCORAS_VÁLIDAS.** As 4 falhas e o agravante estrutural estão
ancorados, linha a linha, no `AUDIT_COMMIT`. Nenhum arquivo do módulo `juridico`,
de `middlewares/` ou de `shared/domain/` está entre os 8 alterados (§2.2).

#### RA-02 — verificação independente da re-ancoragem feita pela SanaCore

A `TRIAGE.md` do `CASE-002` (SanaCore) declara ter relido as 4 falhas + o agravante
"no HEAD", com veredito "CONFIRMADA, sem divergência" para cada uma. Mesmo
tratamento da Regra 3: **hipótese, não verificação**. Leitura própria feita antes
de abrir a triagem.

> **Resultado: CONFIRMAÇÃO INDEPENDENTE — sem divergência material.** As cinco
> âncoras que a triagem lista batem, uma a uma, com o que este agente leu no
> `AUDIT_COMMIT`. **Não há divergência a registrar sob a Regra 20 neste finding.**

**Divergência formal registrada (não material, mas obrigatória — Regra 21):** a
`TRIAGE.md` do `CASE-002` identifica o HEAD em que leu como **`de4dac1`**, enquanto
a `TRIAGE.md` do `CASE-001` identifica **`c1311a6`** — dois documentos SanaCore do
mesmo período referenciando pontos de leitura diferentes, **nenhum dos dois igual à
baseline que os findings declaram**. Pelo `AUDIT_PLAN.md` §2.1 (E1), `de4dac1` é
idêntico a `c1311a6` nos caminhos auditados, de modo que **o efeito material é
nulo** — mas o registro fica, porque conciliar em silêncio divergência de
identificação de commit é exatamente o antipadrão que esta run existe para não
repetir. **A referência válida continua sendo, e apenas, o `AUDIT_COMMIT`.**

**Vedação observada:** as âncoras A1/A2/A3 de `CAND-AUTHZ-01`
(`purchaseController.ts:54`, `purchases.ts:48`, `importProcesses.ts:34`) **não
foram adjudicadas por T-00** — pertencem a T-04/T-09/T-10 (EMENDA-01 §D.1, §E.1,
§E.2) e adjudicá-las aqui seria auditar no lugar do especialista e promover
candidato por analogia, vedado por EMENDA-01 §C.1 e §H.3.

### 3.4 FIND-ERP-006 (HIGH) — RA-03 — **ÂNCORAS_VÁLIDAS**

Reconferência **dirigida às âncoras load-bearing** das três obrigações alegadas
(DPO sem cadastro; retenção sem consumidor; incidente sem prazo ANPD). Declarado:
não é reconferência exaustiva das ~14 citações do finding.

| Obrigação | Âncora citada | Conferida no `AUDIT_COMMIT` | Resultado |
|---|---|---|---|
| DPO | `lgpdController.ts:118` (fallback real) | **L118** `dpoUserId: req.body?.dpo_user_id ?? (req as any).user.id,` — o fallback é literal e está exatamente na linha citada | **exata** |
| Incidente sem prazo | `JurLgpdIncident.ts:37-51` (campos) | L37 `sequelize.define('JurLgpdIncident', {`; os **únicos** campos temporais são `occurred_at` (L39), `detected_at` (L40) e `closed_at` (L50) — **nenhum campo de prazo de comunicação**; **L49** `dpo_user_id: { type: DataTypes.INTEGER, allowNull: false }` | **exata** |
| Incidente sem prazo | `JurLgpdIncident.ts:56` (índices) | `indexes: [{ fields: ['status'] }, { fields: ['dpo_user_id'] }]` — nenhum índice de prazo | **exata** |
| Retenção | `JurLgpdProcessingActivity.ts:48` | **L48** `retention_period: { type: DataTypes.STRING(150), allowNull: true },` — texto livre, opcional | **exata** |
| Retenção | `JurLgpdProcessingActivity.ts:58` (índices) | `indexes: [{ fields: ['department_id'] }, { fields: ['next_review_due_at'] }]` — **há** índice para a revisão anual, **nenhum** sobre retenção. O contraste que o finding usa é real | **exata** |
| Nível de rota | `juridico.ts:163, 171` (criação sem `approve`) | **L163** `router.post('/lgpd/data-subject-requests', lgpdController.createDataSubjectRequest);` e **L171** `router.post('/lgpd/incidents', lgpdController.createIncident);` — ambas **sem** `authorizeModule` próprio (herdam o gate geral `operate` da L83) | **exata** |
| Nível de rota | `juridico.ts:166, 172-173` (as 3 rotas com `approve`) | **L166** `/reject`, **L172** `/decision`, **L173** `/close` — as três com `authorizeModule('juridico', 'approve')` | **exata** |

**Veredito: ÂNCORAS_VÁLIDAS.**

### 3.5 FIND-ERP-007 (MEDIUM) — RA-04 — **ÂNCORAS_VÁLIDAS**

| Item | Âncora citada | Conferida no `AUDIT_COMMIT` | Resultado |
|---|---|---|---|
| 2 | `DecideEmployeeContractUseCase.ts:104` (bloco 100-107) | **L104** `notice_modality: 'trabalhado',` — literal hard-coded, dentro da chamada iniciada em **L100** e fechada em **L107**; sem parâmetro de entrada correspondente | **exata** |
| 1 | mesmo arquivo, ramo de rescisão `100-107` | o objeto passado contém `employee_id`, `termination_type`, `notice_date`, `notice_modality`, `termination_date`, `createdBy` — **`termination_reason` não aparece**, confirmando o descarte alegado | **exata** |
| 3 | `CreateTerminationProcessUseCase.ts:62-65` | **L62** `findOpenByEmployeeId`; **L63-64** `throw new ConflictError('Já existe um processo de demissão em aberto para este funcionário.')` | **exata** |
| 3 | `errors/index.ts:53-57` (mapeamento 409) | **L53** `export class ConflictError extends AppError {`; **L55** `super(message, 409, 'CONFLICT', details);` | **exata** |
| 3 | `errors/index.ts:63-67` (mapeamento 422) | **L63** `export class BusinessRuleError extends AppError {`; **L65** `super(message, 422, 'BUSINESS_RULE_VIOLATION', details);` | **exata** |
| 2 | `CreateTerminationProcessUseCase.ts:58-60` (enum aceito) | `if (!NOTICE_MODALITIES.includes(input.notice_modality)) throw new ValidationError(...)` | **exata** |

**Veredito: ÂNCORAS_VÁLIDAS** (âncoras de código dos 3 itens).

**Declaração de limite, obrigatória:** o item 3 está registrado no próprio finding
como `NEEDS_MORE_EVIDENCE`, e a `APR-2026-020` Decisão B item 3 determina que o
finding **não segue à SanaCore** até o ponto 409×422 retornar ao autor de origem.
**T-00 não toca nesse status**: re-ancorar ≠ reabrir mérito. A determinação
independente sobre 409×422 é de **T-12** e **T-17**, confrontadas em T-25. As
âncoras **documentais** (`BLOCO_6_RH_API.md:526, 542, 577`) **não foram
reconferidas por T-00** — são objeto de T-23 e T-17.

### 3.6 FIND-ERP-008 (HIGH) — RA-05 — **ÂNCORAS_VÁLIDAS**

| Âncora citada | Conferida no `AUDIT_COMMIT` | Resultado |
|---|---|---|
| `EmitCatUseCase.ts:60` (**TIPO vem do corpo**) | **L60** `const tipo = body.tipo === 'obito' ? 'obito' : 'inicial';` | **exata** |
| `EmitCatUseCase.ts:61` (**PRAZO vem da gravidade**) | **L61** `const prazoLimite = calcularPrazoLimiteCat(acidente.data_hora, acidente.gravidade);` | **exata** |
| `EmitCatUseCase.ts:54-58` (unicidade filtra só `inicial`) | **L55** `catsExistentes.some((c: any) => c.tipo === 'inicial')` | **exata** |
| `EmitCatUseCase.ts:63-70` (INSERT) | `createCat({ acidente_id, tipo, data_emissao, prazo_limite, emitente_id, status_esocial_s2210 }, t)` — grava `tipo` e `prazo_limite` **sem nenhuma comparação entre eles** | **exata** |
| `EmitCatUseCase.ts:72-78` (S-2210 na mesma transação) | **L72-75** `esocialEventRepository.create({ tipo: 'S-2210', origem_tipo: 'cat', origem_id: cat.id, ... })` | **exata** |
| `sst.ts:75` (rota sem validação de payload) | **L75** `router.post('/accidents/:id/cat', authorizeModule('sst', 'approve'), accidentController.emitCat);` — **nenhum middleware de validação** entre authZ e controller | **exata** |
| `sst.ts:77` (reopen) | **L77** `router.post('/cat/:catId/reopen', authorizeModule('sst', 'approve'), accidentController.reopenCat);` | **exata** |
| `client/src/api/sst.ts:388-393` (**UI produz a combinação errada**) | **L388** `export async function emitCat(accidentId: number, emitente: string)`; **L391** `{ tipo: 'inicial', emitente },` — `tipo` **hard-coded**, sem ramo para óbito | **exata** |

**Veredito: ÂNCORAS_VÁLIDAS**, ancorado com precisão de linha nos dois lados
(server **e** client). Âncoras não reconferidas por T-00, declaradas:
`legalDeadlineService.ts`, `sst-accident.test.ts:195-202` e as âncoras documentais
de `BLOCO_1_SST_*` — pertencem a **T-12**, **T-20** e **T-23**. Para as âncoras de
`client/` vale o limite de alcance de §2.2 (delta baseline→AUDIT_COMMIT não medido
fora de `server/src`).

### 3.7 FIND-ERP-009 (HIGH) — RA-06 — **ÂNCORAS_VÁLIDAS**

A afirmação central do finding é uma **alegação de exaustividade** ("o mecanismo de
segregação tem exatamente 4 call sites, todos em compras"). Ela não se re-ancora
por leitura de faixa: exige varredura própria. Foi feita.

| Alegação | Verificação própria no `AUDIT_COMMIT` | Resultado |
|---|---|---|
| Exatamente **4 call sites de produção** de `assertApproverIsNotRequester`/`isSelfApproval`, todos na cadeia de compras | Grep próprio em todo `server/src`: **definição** (`shared/domain/segregationOfDuties.ts:55, 89, 112, 134, 135`) + **import e chamada** em exatamente 4 use cases — `ApproveImportProcessUseCase.ts:33, 82` · `ChangePurchaseRequisitionStatusUseCase.ts:50, 104` · `ChangePurchaseStatusUseCase.ts:14, 134` · `ApprovePurchaseUseCase.ts:12, 86`. **Nenhuma outra chamada em todo `server/src`**; as 4 linhas batem exatamente com as citadas | **confirmada por varredura própria** |
| Ponto 9 — `PostEntryUseCase.ts:84-88` | **L84-88** `updateEntry(id, { status: 'posted', approved_by: userId, approved_at: new Date() }, transaction)` — `approved_by` na **L86**, nenhuma comparação com `created_by` no bloco | **exata** |
| Ponto 8 — `ApproveInventoryCountUseCase.ts:50-120` | **L50** `async execute({ id, approverId })`; L56 lock; L57 existência; **L60** `status !== 'pending_approval'`; L63 `warehouse_id` — exatamente as quatro guardas enumeradas, e `approverId` não é comparado a nada nelas | **exata** |
| Ponto 11 — `bomService.ts:314-322` (BOM nasce `active`) | **L314** `const bom = await BillOfMaterial.create({`; **L319** `status: 'active',`; L320 `created_by` | **exata** |
| Ponto 21 — `masterProductionPlans.ts:37-38` | **L37** `POST /:id/firm` e **L38** `POST /:id/release`, ambas `authorizeModule('mrp', 'operate')` | **exata** |
| Ponto 5 — `ApproveContractUseCase.ts:85-88` | já reconferido em §3.3 — idêntico | **exata** |

**Veredito: ÂNCORAS_VÁLIDAS.** A alegação de exaustividade (o núcleo do finding)
foi **reproduzida por método próprio**.

**Declaração de limite:** a tabela do finding tem 28 linhas; T-00 reconferiu 5 + os
4 call sites "S". As 23 restantes **não** foram reconferidas por T-00 e vão para
**T-09** (dona da superfície de ato aprovatório cross-módulo, EMENDA-01 §E.2) com o
mapa authZ de **T-04**.

---

## 4. G6 ABERTO — o `AUDIT_SCOPE.md` §2.3 permanece sabidamente incorreto

Registro exigido pela EMENDA-02 §8.2 e reafirmado em cada um dos 7 vereditos acima.

**O fato:** o `AUDIT_SCOPE.md` §2.3 apresenta a tag `legacy-baseline-001`
(`c9359be`) como base histórica válida de comparação e delega ao inventário a
confirmação de que "o código do ERP em si não mudou entre baseline e
`AUDIT_COMMIT`". O `AUDIT_PLAN.md` §2.1/§3.1 **provou o contrário** (E2/E3):
`3dee99f` alterou 8 arquivos de `server/src` depois da tag e antes do discovery.
**RA-09** corrigiria o escopo por adição rastreável; **G6 aberto impede**, porque
`AUDIT_SCOPE.md` é do `vericore-audit-scope-agent` e alteração de escopo registrado
exige autorização humana (Regra 18).

**Estado registrado: `RA-09` PENDENTE — BLOQUEADA POR G6.** T-00 **não corrige** o
`AUDIT_SCOPE.md` e **não supre G6 por inferência**.

**Instrução de leitura, reafirmada por T-00:**

> A **única** referência de leitura desta run é o `AUDIT_COMMIT`
> `c1311a6f76b512fef893f7e60d934179cae3409f`. A tag `legacy-baseline-001` /
> `c9359be` **não é referência de leitura** e **não pode ser citada como estado do
> código auditado** em nenhuma evidência. **Citar `c9359be` como base de leitura é
> evidência rejeitável** — e T-26 deve rejeitá-la.

**Razões que sustentam a instrução (retificadas pelo ADENDO-01):**

1. **G6/OBS-INV-01 — mantida, e é suficiente sozinha:** `3dee99f` alterou 8
   arquivos de `server/src` depois da tag. A tag **não** representa o código
   auditado. Vale para a run inteira, mesmo sendo inócua para os 7 findings (§2.2).
2. **G7/EMENDA-02 §8.4.1 — mantida:** com remediação SanaCore em curso, ler `HEAD`
   (e não o `AUDIT_COMMIT`) pode produzir falso negativo — defeito ausente
   **porque já foi corrigido**. Hoje mitigado pelo isolamento em worktree (§1.2),
   não eliminado.
3. ~~**T-00: os 7 findings declaram `c9359be` e leram outra coisa.**~~
   **RETIRADA pelo ADENDO-01.** A tese está rebaixada a indício não provado (§2.3),
   e para estes 7 findings é materialmente indiferente qual dos dois commits foi
   lido, porque o conteúdo ancorado é idêntico nos dois. **A instrução não perde
   força**: as razões 1 e 2 permanecem intactas e cada uma basta.

**Efeito registrado sobre a cadeia de evidência da própria auditoria** (EMENDA-02
§8.2, risco nível 2): a run convive com um artefato versionado oficialmente
incorreto (`AUDIT_SCOPE.md` §2.3) ao lado de artefatos que o contradizem. Pela
Regra 7, artefato versionado é fonte oficial de verdade; pela Regra 21, contradição
entre documento e evidência interrompe a decisão. **Isto é um defeito na cadeia de
evidência da auditoria** e deve constar do relatório final como tal.

---

## 5. Inconsistências de integridade encontradas

Registradas, não silenciadas (Regra 21). **Nenhuma é finding** — T-00 não emite
finding (`AUDIT_PLAN.md` §4.1).

| ID | Inconsistência | Estado após ADENDO-01 | Destinatário |
|---|---|---|---|
| **IN-01** | Os 7 findings declaram `AUDIT_COMMIT`/`BASELINE` = `c9359be…` sem que essa correspondência tenha sido verificada por quem os produziu | **REDUZIDA E REQUALIFICADA.** A v1 afirmava "etiqueta incorreta sobre leitura correta" — isso **não está provado** (ARG-01 refutado, §2.0). O que permanece é mais estreito e verificável: **a declaração de baseline dos 7 findings é não verificada pelos próprios autores**, admitido expressamente em `FIND-ERP-009` LACUNA 2 (*"a correspondência tag → commit… não pôde ser confirmada"*); para os outros 6 é **indício** (modo read-only sem Bash), não fato. **Efeito material: NENHUM** — os arquivos ancorados são idênticos nos dois commits (§2.2) | `vericore-audit-consolidator` (T-26), como nota de rastreabilidade. **Não corrigível por T-00** (Regra 15) |
| **IN-02** | `AUDIT_SCOPE.md` §2.3 sabidamente incorreto e não corrigido | **MANTIDA** (§4) | `vericore-audit-scope-agent`, **bloqueado por G6** |
| **IN-03** | Duas `TRIAGE.md` SanaCore do mesmo período identificam HEADs diferentes (`c1311a6` no CASE-001, `de4dac1` no CASE-002) | **MANTIDA** — efeito material nulo por E1 | registro; nenhuma ação VeriCore |
| **IN-04** | Heterogeneidade de template: `FIND-ERP-009` usa `BASELINE:` onde os outros 6 usam `AUDIT_COMMIT:`; `FIND-ERP-001` não traz `AMBIENTE`, presente em 005/008/009 | **MANTIDA** | `coretriad/templates/FINDING_TEMPLATE.md` — CoreTriad Director |
| **IN-05** | `FIND-ERP-001` cita faixa `71-126` onde o corpo real do `execute` termina em `123` | **MANTIDA** — imprecisão inócua de cauda | registro; nenhuma ação |
| **IN-06** | ~~`FIND-ERP-005` afirma que as 4 falhas foram "confirmadas por leitura direta no AUDIT_COMMIT" sendo que o commit declarado não foi lido — afirmação que "não se sustenta"~~ | **RETIRADA.** A acusação repousava inteiramente em ARG-01, que está refutado (§2.0). Além de a base ter caído, a evidência disponível **favorece o finding**: nenhum arquivo ancorado pelo `FIND-ERP-005` está entre os 8 alterados (§2.2), logo o conteúdo é o mesmo em `c9359be` e `c1311a6f` e a afirmação do finding é **materialmente verdadeira**, independentemente de qual árvore o autor tenha lido. **Nenhuma acusação a artefato de terceiro permanece de pé sobre argumento refutado** | — (encerrada) |
| **IN-07** | Superfície citada por T-00 e não enumerada pelo `FIND-ERP-001`: o ramo `item_id` de `CreateInventoryMovementUseCase.ts:80-90` | **REQUALIFICADA.** A v1 atribuía o ramo a `3dee99f` — **incorreto**: o ramo já existia na baseline e o arquivo é idêntico nos dois commits (R-01/R-04). Segue sendo superfície não enumerada pelo finding, mas **não** é código novo. Insumo dirigido a **T-06**; **deixa de ser** insumo a T-05/RA-08 | T-06 |
| **IN-08** *(novo, deste ADENDO)* | **Erro de método do próprio T-00 (v1):** inferência sobre origem de código (`3dee99f`) apresentada como prova, sem verificação de histórico — impossível de verificar sem Bash, e por isso mesmo não apresentável como prova | **REGISTRADA E CORRIGIDA** nesta v2. Regra derivada, vinculante para as demais trilhas: **atribuir origem de código a um commit exige `git log`/`git show` sob custódia declarada; ler o conteúdo do arquivo não estabelece quando ele entrou** | todas as trilhas; T-26 na consolidação |

**Nenhuma inconsistência encontrada invalida qualquer um dos 7 findings.**

---

## 6. Limites de autoridade deste relatório

Este documento **não** emite finding, **não** altera severidade, confiança ou
status de nenhum finding, **não** declara `AUDIT_PASSED`, `FINDINGS_CONFIRMED`,
`RETEST_PASSED`, `FINDING CLOSED` nem `REMEDIATION COMPLETE`, **não** promove
`CAND-AUTHZ-01`, **não** altera o objeto auditado (Regra 2), **não** altera
evidência de outra organização (Regra 15), **não** corrige o `AUDIT_SCOPE.md`
(RA-09 / G6) e **não** supre G4, G5, G6, G7 ou G11 por inferência (Regra 18).

**Estado de T-00 quanto ao seu próprio "Pronto quando" (`AUDIT_PLAN.md` §4.1):**

| Critério | Estado |
|---|---|
| 7 findings com veredito de re-ancoragem registrado contra `c1311a6f`, com arquivo+linha reconferido | **CUMPRIDO** (§3), com os limites de reconferência dirigida declarados por finding |
| Lista de arquivos alterados por `3dee99f` reconciliada com a árvore auditada | **CUMPRIDO** (§2.2) — os 8 arquivos foram confrontados com o conjunto de âncoras dos 7 findings, com resultado de interseção vazia verificado por grep próprio. Os 2 serviços novos (`itemProductMirrorService.ts`, `fixedAssetReceiptService.ts`) permanecem **sem cobertura de auditoria** e são **RA-08, de T-05**, como o plano já previa |
| Nenhuma citação de finding permanece apontando para `c9359be` sem nota de re-ancoragem | **CUMPRIDO** — §2 e §4 são a nota, e valem para os 7 |
| Congelamento do manifesto de evidência da run | **A CARGO** do `vericore-audit-evidence-controller` |
| Reconferência do `AUDIT_PLAN.md` §2 | **CUMPRIDO** (§1.1), com DYN-01 substituída e a substituição declarada (§1.3) |
