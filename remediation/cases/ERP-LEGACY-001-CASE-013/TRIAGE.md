# TRIAGE — ERP-LEGACY-001-CASE-013 (FIND-ERP-009)

CASE_ID: ERP-LEGACY-001-CASE-013
FINDING_ID: FIND-ERP-009
PROJECT_ID: ERP-LEGACY-001
FASE: TRIAGEM (SanaCore) — nenhuma linha de `server/`, `client/`, `docs/`, `audit/` ou
`coretriad/` foi alterada. Este arquivo é o único artefato escrito.
SEVERIDADE DO FINDING: HIGH · CONFIDENCE: CONFIRMED (finding-validator) · STATUS: OPEN
AUDIT_COMMIT do finding: `c9359be399c45191fe90e8e9707803125a5ba91d` (tag `legacy-baseline-001`)
HEAD reconfirmado nesta triagem: `752b6d8338a7db114f75acca3a2110397285f2a4`
DESTINO PREVISTO: `sanacore-remediation-engineer`, worktree/branch
`sana/ERP-LEGACY-001/FIND-ERP-009` — **condicionado ao §8** (Regra 11).

---

## 0. Método, escopo e lacunas declaradas

**Reprodução ESTÁTICA determinística.** Cada ponto de aprovação da tabela do finding foi
**relido no HEAD atual**, arquivo por arquivo, sem confiar na citação do documento nem em
contexto herdado. Onde o finding cita faixa de linhas, a faixa foi lida integralmente e as
funções `execute` foram lidas de ponta a ponta para procurar comparação de identidade
escondida. Além disso, foi feita **varredura própria** dos módulos que o próprio finding
declarou como `UNKNOWN` (LACUNA 3) — e ela produziu resultado material (§2).

**Verificação de drift baseline → HEAD.** `git diff c9359be..HEAD -- server/src server/migrations`
toca **8 arquivos**, todos em `items`/`products`/`purchases`/`services` (espelho item↔produto,
recebimento de imobilizado). **Zero arquivos** de `shared/domain`, `juridico`, `ti`,
`accounting`, `inventory`, `bom`, `engineering`, `marketing`, `facilities`, `masterProduction`,
`rh`, `rfq`. As âncoras do finding continuam válidas número a número — e foram, ainda assim,
relidas uma a uma.

**Reprodução DINÂMICA: NÃO executada. Lacuna L-T1 declarada.** Regra permanente de segurança
de dado real (`PROJECT_STATE.md`, permanente por **APR-2026-016**): nenhuma suíte de teste foi
executada, nenhum script de diagnóstico foi rodado e **nenhuma conexão com banco de dados foi
aberta** — nem com `erp_evok_audio`, nem com `erp_evok_audio_test`, nem "só para contar
linhas". Toda a evidência abaixo é leitura de código-fonte, model declarado e rota. A prova
empírica pertence ao reteste, pelo `vericore-audit-verification-runner`.

**Lacuna L-T2 — contagem de perfis/usuários com nível `approve` não medida.** O §5 depende de
saber quantos usuários reais têm `approve` em cada módulo. Isso exige `SELECT` em
`access_profile_permissions`, o que a regra acima **proíbe** nesta fase. A triagem usa apenas
o que está em artefato versionado (`PRODUCTION_STATUS_MAP.md`) e registra a medição como
tarefa do engineer **em banco de teste**, ou do dono, com aprovação caso a caso.

**Lacuna L-T3 — cobertura da minha própria varredura: alta, não exaustiva.** Varri
`server/src/modules/*/presentation/routes` por `router.(post|put|patch)` contendo
`approve|reject|release|firm|decision|award|authorize|close|validate|sign|activate|confirm|settle|pay`
(315 linhas de rota retornadas) e inspecionei dirigidamente os módulos que o finding deixou
`UNKNOWN`. **Não** inspecionei os ~200 atos de rota restantes um a um. O que afirmo em §2 é
piso, não teto.

### Exclusão explícita de escopo (agrupamento — anti-duplicação)

O **ponto #5 da tabela do finding (contrato jurídico, `ApproveContractUseCase.ts:85-88`,
dedup por PAPEL e não por PESSOA) está FORA deste caso.** Ele é a **Falha 4 de FIND-ERP-005**,
já triado em `remediation/cases/ERP-LEGACY-001-CASE-002/TRIAGE.md` §6.2 (F4-A / F4-B / F4-C) e
já despachado. Aquela triagem registra explicitamente, no seu §4, que "a correção da Falha 4
deste caso **fecha o ponto #5 de FIND-ERP-009**, mas não os outros pontos `N`". Esta triagem
**confirma e honra** essa partição:

- não reanaliso o ponto #5, não proponho correção para ele e não conto com ele no plano;
- registro a interseção para que a VeriCore **não reteste duas vezes** e, sobretudo, **não
  feche FIND-ERP-009 por causa do reteste de FIND-ERP-005**;
- a única coisa que este caso herda de CASE-002 é **desenho**: a função nova
  `assertApproverIsNotPriorApprover` que CASE-002 manda criar em
  `shared/domain/segregationOfDuties.ts` é reutilizável por qualquer ponto multi-assinatura
  que venha a ser decidido aqui. **Dependência de ordem, registrada:** se este caso for
  despachado antes de CASE-002 aterrissar, os dois tocam o mesmo arquivo → colisão de
  worktree (Regra 11). Sequenciar.

---

## 1. Reconfirmação, ponto a ponto, no HEAD `752b6d8`

### 1.1 O mecanismo e seus chamadores

**Divergência de caminho (D-1).** O finding cita o módulo como
`shared/domain/segregationOfDuties.ts`. O arquivo real é
**`server/src/shared/domain/segregationOfDuties.ts`** (150 linhas). Não existe `shared/` na
raiz do repositório. Divergência **editorial**, sem efeito sobre a conclusão — mas o engineer
que seguir a citação literal do finding não acha o arquivo.

Conteúdo reconfirmado linha a linha:
- `SEGREGATION_RULES` (`:75-84`) — exatamente 4 entradas, todas `D-K-*`, todas de compras.
- `isSelfApproval` (`:112-119`) — pura, `null`/`undefined` → `false`, comparação por `Number()`.
- `assertApproverIsNotRequester` (`:134-149`) — lança `BusinessRuleError` (422) com
  `details.rule`, `requester_user_id`, `approver_user_id`, `what_to_do`.
- `:30-43` — a justificativa de **`admin` NÃO isenta** está lá, íntegra, e é a única regra do
  ERP nessa condição. **Confirmo o enquadramento do finding: onde a segregação existe, ela
  está correta.** Este caso não propõe tocá-la.
- `:45-50` — a contrapartida organizacional ("um segundo aprovador cadastrado") está escrita
  no próprio código, não é invenção da auditoria.

**Chamadores — grep exaustivo reexecutado** por
`assertApproverIsNotRequester|isSelfApproval|segregationOfDuties` em `server/src` e `client/src`:

| Regra | Call site reconfirmado | Verdito |
|---|---|---|
| `D-K-REQUISICAO` | `ChangePurchaseRequisitionStatusUseCase.ts:50` (import), `:104` (chamada) | **S, confirmado** |
| `D-K-PEDIDO` | `ChangePurchaseStatusUseCase.ts:14-16` (import), `:134` | **S, confirmado** |
| `D-K-ALCADA` | `ApprovePurchaseUseCase.ts:12-14`, `:86` | **S, confirmado** |
| `D-K-COMEX` | `ApproveImportProcessUseCase.ts:33`, `:82` | **S, confirmado** |

**`client/src`: ZERO ocorrências** (grep limpo, saída vazia). Confirmado: a regra é
integralmente backend-side, e isso é um ponto **positivo** que a remediação deve preservar.

**Teste:** `server/tests/unit/purchase-segregation-of-duties.test.ts` existe, 381 linhas.
Nenhum outro arquivo de teste do repositório menciona segregação. Confirmado: **é o único
teste de segregação do ERP**.

### 1.2 Os pontos `N` e `N/A` — releitura no HEAD

Leitura integral das funções `execute`, procurando ativamente por qualquer comparação de
identidade (o inverso do que o finding afirma). Resultado: **nenhuma encontrada em nenhum
ponto.** Detalhamento apenas onde acrescento fato ao finding:

| # | Ponto | Releitura no HEAD | Verdito |
|---|---|---|---|
| 5 | Contrato jurídico | **fora de escopo — CASE-002** | — |
| 6 | Acesso TI — approve | `ApproveAccessRequestUseCase.ts:29-42` lido inteiro: `request.requested_by` **nunca é lido**; único gate é `isEligibleApprover` (`:35`) | **N, confirmado** |
| 7 | Acesso TI — reject | `RejectAccessRequestUseCase.ts:28-40`: idem, mesma elegibilidade, `requested_by` nunca lido | **N, confirmado** |
| 8 | Contagem de inventário | `ApproveInventoryCountUseCase.ts:50-125` lido inteiro. Guardas: existência (`:57`), status (`:60`), `warehouse_id` (`:63`), lock (`:56`), transição condicionada (`:107`). **`approverId` nunca comparado com `assigned_to`/`counted_by`.** O laço `:77-100` aplica ajuste para **qualquer** `variance !== 0` (`:80`) — **sem tolerância por valor ou percentual**. `approverId` é ainda usado como **ator do movimento de estoque** (`:89`) e gravado em `approved_by` (`:109`) | **N, confirmado + dupla falha confirmada** |
| 9 | Postagem contábil | `PostEntryUseCase.ts` lido integralmente (92 linhas). **`entry.created_by` não aparece em nenhuma linha do arquivo.** As únicas validações são status `draft` (`:49`), ≥2 itens (`:54`), ao menos um débito e um crédito (`:70`), soma em centavos (`:74`). `:84-88` grava `status:'posted', approved_by: userId` | **N, confirmado** |
| 10 | Estorno contábil | `ReverseEntryUseCase.ts` lido integralmente (92 linhas). **Nem `original.created_by` nem `original.approved_by` aparecem no arquivo.** `:57-67` cria o estorno com `created_by: userId`, `approved_by: userId`, `approved_at`, já `status:'posted'` — **nasce postado e "aprovado" pela mesma pessoa, sem passar por `PostEntryUseCase`** (o próprio cabeçalho `:13-14` declara isso como desenho intencional) | **N, confirmado + agravante novo (§1.3)** |
| 11 | BOM | `bomService.ts` (bloco da transação): `BillOfMaterial.create({ ..., status: 'active', created_by, ... })` — **grava `active` explicitamente**, sobrescrevendo `defaultValue: 'draft'` do model (`models/BillOfMaterial.ts:47`). `approved_by` (`:49`) e `approval_date` (`:50`) existem no model e **nenhuma escrita foi encontrada em todo `server/src`**. `ApproveBOMUseCase.ts:40` — assinatura `execute({ id }: { id: number })`, **sem identidade de aprovador**; o corpo (`:41-66`) só valida `superseded` e chama `activateExclusively` — **não escreve `approved_by` nem `approval_date`, mesmo sendo o "use case de aprovação"** | **N/A, confirmado + agravante novo (§1.3)** |
| 12 | Transferência entre depósitos | `ApproveWarehouseTransferUseCase.ts:43-91` lido inteiro: guardas de existência (`:46`) e status `pending` (`:49`). **`input.approverId` nunca comparado com `transfer.requested_by`** — é usado como `user_id` dos dois `InventoryMovement` (`:65`, `:76`) e gravado em `approved_by` (`:87`) | **N, confirmado** |
| 13 | Liberação de lote | `ReleaseLotUseCase.ts:118-176`: gate G7 real e bem-feito (`decideLotRelease`, `:146`), mas compara **ato** (existe inspeção posterior ao bloqueio, veredito ≠ rejeitado), **nunca pessoa**. `releasedBy` (`:165`) não é comparado com o inspetor da `latestInspection` | **N, confirmado — compensatório PARCIAL, como declarado** |
| 14 | Bloqueio de lote | `inventory.ts:36` — `POST /lots/:id/block`, `authorizeModule('qualidade','approve')`; nenhuma noção de solicitante | **N, confirmado** |
| 15 | Release de desenho | `ReleaseDrawingUseCase.ts:27-46`: guardas de existência e `status==='draft'`; grava `approved_by: approvedBy` (`:43`). **`drawing.created_by` nunca lido.** Rota `engineering.ts:43` tem duplo gate `authorizeModule('engenharia','approve')` + `authorize('admin')` — restringe **quem**, e como só há 1 `admin` real, **aponta para autoaprovação, não contra** | **N, confirmado** |
| 16 | Ativação de roteiro | `ActivateProductionRouteUseCase.ts:88` grava `approved_by: input.approved_by ?? null`. Nenhuma comparação com `route.created_by` no arquivo | **N, confirmado** |
| 17 | Material de marketing | `ApproveMaterialUseCase.ts:27-42` lido inteiro: guardas de existência e `material.approved` já verdadeiro. `approvedByUserId` gravado (`:39`), **nunca comparado com o criador** | **N, confirmado** |
| 18 | Orçamento de campanha | `BudgetDecisionUseCase.ts:41-70` lido inteiro: guardas de existência, status terminal, `budget_approved` obrigatório. `decidedByUserId` gravado (`:57`) sem qualquer comparação. Nota: o cabeçalho `:6-8` declara corretamente `budget_approved_by` **sempre de `req.user.id`, nunca do body** — anti-spoofing OK, segregação ausente | **N, confirmado** |
| 19 | Adjudicação de RFQ | **Divergência D-2:** o arquivo é `modules/rfq/application/use-cases/AwardRfqUseCase.ts` (`Rfq`, não `RFQ`). Nenhuma comparação de identidade. Mitigação a jusante confirmada como **parcial**: o artefato gerado cai sob D-K, o **ato de adjudicar** não | **N, confirmado** |
| 20 | Override de odômetro | `TripUseCases.ts:48-108` lido inteiro. `CreateTripUseCase` (`:50-65`) grava `requested_by: requestedBy`. Em `DepartTripUseCase`, o override exige `divergence_justification` **e** `hasApproveLevel` (`:96`) e grava `odometer_override_approved_by: input.approvedBy` (`:104`). **`trip.requested_by` nunca é lido no caminho do override** — e, por construção, quem executa o `/depart` é quem precisa do override: **é autoaprovação estrutural, não acidental** | **N, confirmado — leitura mais forte que a do finding** |
| 21 | MPS firmar/liberar | **Divergência D-3:** o arquivo é `modules/masterProduction/presentation/routes/masterProductionPlans.ts`, não `modules/production/...`. `:37-38` reconfirmadas: `firm` e `release` com `authorizeModule('mrp','operate')`. O comentário-confissão está em **`:20-28`** e confere verbatim ("Não foi feito **de propósito** … política de governança que o dono do produto não definiu … Inventar a alçada aqui criaria um segundo padrão"). Grep por `created_by` em todo `modules/masterProduction`: **única ocorrência é `ReleaseMasterProductionPlanUseCase.ts:149`, e é o `created_by` da Ordem de Produção gerada, não do plano.** Confirmado: **o plano mestre não registra quem o criou** | **N/A, confirmado — segregação irrepresentável** |
| 22 | Decisão de contrato de trabalho | `rh.ts:67` define `authorizeContractDecision`; `:87` a aplica em `PATCH /employee-contracts/:id/decision`. Ato unilateral do empregador | **N, confirmado** |
| 23-26 | LGPD decisão/encerramento, rejeição de titular, encerramento de processo, revogação de procuração | `juridico.ts` reconfirmado: `:115` close (`juridico:approve`), `:132` revoke (`approve`), `:166` reject (`approve`), `:172-173` incident decision/close (`approve`). Todas exigem **nível**; nenhuma compara identidade | **N, confirmado (4 pontos)** |
| 27 | Diretoria — planejamento/ata/risco | `directorate.ts`: `POST /strategic-plannings`, `POST /meeting-minutes`, `POST /business-risks`, todos `authorizeModule('diretoria','approve')`. Criação **é** o ato | **N/A, confirmado** |
| 28 | Liberação de documento vencido | `facilities.ts:52` — `POST /vehicles/:assetId/documents/:docId/release`, `facilities:approve`. Consumido por `DepartTripUseCase:67` (`!insurance.released_by`) — o gate verifica **existência** de liberação, não **quem** liberou | **N, confirmado** |

### 1.3 Fatos que a releitura acrescenta ao finding

Três, todos verificáveis por leitura e nenhum deles favorável:

**F-A — o estorno contábil é pior que "sem segregação": ele contorna o próprio gate de
postagem.** `ReverseEntryUseCase.ts:62` cria o lançamento de estorno já com
`status: 'posted'`, sem passar por `PostEntryUseCase`. O cabeçalho justifica ("nasce
balanceado por construção"), e para partida dobrada o argumento é válido — mas a consequência
é que **o único ponto do módulo que carrega uma validação de aprovação é desviado**, e o
`approved_by` do estorno é gravado (`:64`) sem que qualquer verificação de aprovação tenha
ocorrido. Se a decisão do dono for aplicar segregação em `accounting`, ela precisa cobrir
**dois** caminhos de escrita de `approved_by`, não um.

**F-B — `ApproveBOMUseCase` não é só órfão: ele não aprova nada.** Além de não receber
identidade (`:40`), ele **não escreve `approved_by` nem `approval_date`** em lugar algum
(`:55-66` só chama `activateExclusively`). Ou seja: mesmo que uma rota fosse criada hoje e
ligada a ele, o campo de aprovação continuaria `NULL`. O finding trata a órfandade; a
releitura mostra que a implementação também está incompleta no que já existe.

**F-C — `role === 'admin'` foi reconfirmado como curto-circuito no caminho de aprovação de
TI.** `approverEligibilityService.ts:27` — `if (input.approverRole === 'admin') return true;`,
**antes** de qualquer checagem de gestor. Confirma o agravante ambiental do finding no nível
do código, não só do RBAC genérico.

### 1.4 Placar reconfirmado e divergência de contagem

Das 28 linhas da tabela do finding, reconfirmei **28/28 sem inversão de classificação**:

> **S = 4 · N = 21 · N/A = 3.** 100% dos `S` na cadeia de compras.

**Divergência D-4 (aritmética, já apontada pelo finding-validator e aqui confirmada de forma
independente):** o TITLE do finding diz **"20 outros pontos"**. O número correto é **21** (`N`),
e o total de pontos não-compras que exigem decisão do dono é **25** (21 `N` + 3 `N/A` + o
ponto #5, que sai por CASE-002 → **24 dentro do escopo deste caso**). O corpo do finding já
está corrigido; **o TITLE não**. Correção editorial pertence à VeriCore (Regra 15 — SanaCore
não edita finding); registrada aqui como pedido, não como alteração.

---

## 2. A tabela do finding é piso, não teto — pontos novos que a varredura encontrou

O finding declarou honestamente (LACUNA 3) que `budget`, `treasury`, `sst`, `maintenance`,
`serviceOrders` ficaram `UNKNOWN`, e que `reports`, `dashboard`, `intelligentAuditor` não
foram varridos. **Resolvi os `UNKNOWN` e varri mais.** Resultado: pelo menos **11 famílias
adicionais** de ato aprovatório sem segregação, ~20 linhas de rota, nenhuma na tabela do
finding:

| ID | Ponto novo | Rota / código | Nível | Identidade do solicitante |
|---|---|---|---|---|
| **NP-1** | **Pagamento de conta a pagar** | `PUT /api/finance/payable/:id/pay` — `finance.ts:36` → `financialController.ts:175-183` → `PayPayableUseCase` | **`financeiro:operate`** | **NENHUMA.** `models/AccountPayable.ts:55` declara `approved_by: { type: INTEGER, comment: 'FK → users.id' }` e **grep em todo `server/src` não encontra uma única escrita nesse campo**. O controller (`:181`) **não passa `req.user.id`** ao use case. Não há `created_by`. O pagamento fica registrado apenas no `logAction` |
| **NP-2** | Recebimento de conta a receber | `PUT /api/finance/receivable/:id/pay` — `finance.ts:30` | `financeiro:operate` | Mesma classe de NP-1 |
| **NP-3** | **Liquidação / cancelamento de operação financeira** | `PATCH /api/treasury/financial-operations/:id/{settle,cancel}` — `treasury.ts:48-49` | `tesouraria:approve` | **NENHUMA.** `models/TreasuryFinancialOperation.ts` tem `settled_at` (`:64`) e **nenhuma coluna de usuário** — nem `created_by`, nem `settled_by`. Grep por `req.user`/`userId` em `modules/treasury/application` e nos controllers: **zero ocorrências** |
| **NP-4** | Emissão / cancelamento de NF-e de venda | `POST /api/sales/:id/nfe` e `/nfe/cancel` — `sales.ts:54,56` | `vendas:approve` | não verificada |
| **NP-5** | **Conclusão de processo de rescisão** | `POST /api/rh/termination-processes/:id/conclude` — `rh.ts:99` | `rh:approve` | não verificada. **Nomeada por LACUNA-3 ("vale para … rescisão?") e ausente da tabela** |
| **NP-6** | SST — 10 atos `sst:approve` | `sst.ts:54` (confirmar entrega de EPI), `:74` (encerrar acidente), `:75` (emitir CAT), `:77` (reabrir CAT), `:84` (reenviar eSocial), `:90,91,92,93,95` (CIPA: mandato, membro, posse, processo eleitoral, encerramento) | `sst:approve` | não verificada |
| **NP-7** | Obsoletar desenho | `POST /api/engineering/drawings/:id/obsolete` — `engineering.ts:44` | `engenharia:approve` + `admin` | gêmeo do ponto #15 |
| **NP-8** | Inativar roteiro de produção | `PATCH /api/production-routes/:id/inactivate` — `productionRoutes.ts:38` | `producao:approve` | gêmeo do ponto #16 |
| **NP-9** | Designar gestor de diretoria | `PATCH /api/directorate/directorates/:id/manager` — `directorate.ts:36` | `diretoria:approve` | ato de nomeação |
| **NP-10** | Facilities — suspender condutor, indicar e pagar multa | `facilities.ts:60,80,82` | `facilities:approve` | não verificada |
| **NP-11** | **Criação/edição de perfil de acesso** | `POST`/`PUT /api/access-profiles` — `accessProfiles.ts:24-25` | `authorize('admin')` | ato de concessão de privilégio. **Toca `users`, que é PRODUÇÃO REAL parcial (APR-2026-016)** |

**Consequência para este caso — e é a mais importante do §2:** NP-1, NP-2 e NP-3 não são
"mais um `N`". São a **classe pior** da própria taxonomia do finding (`N/A` por
irrepresentabilidade), aplicada aos **atos de saída de caixa e de liquidação de operação
financeira**. O `approved_by` de `accounts_payable` existir e nunca ser escrito é, isoladamente,
um defeito de trilha de auditoria independente de qualquer política de segregação.

**Encaminhamento, não ampliação (Regra 16 / precedente CASE-002 §3.2):** NP-1 a NP-11 estão
**fora do escopo** deste `REMEDIATION_CASE`, cujo objeto é FIND-ERP-009 como consolidado. SanaCore
não amplia escopo por conta própria. Registro aqui como insumo para a **CoreTriad/VeriCore**
decidirem entre (i) delta audit sobre FIND-ERP-009 para absorver NP-1..NP-11, ou (ii) finding
próprio. **Não silenciado.** Recomendação técnica: NP-1/NP-2/NP-3 merecem tratamento
prioritário e provavelmente severidade própria, porque são financeiros e porque a ausência de
identidade não depende de decisão de política para ser defeito.

---

## 3. Causa-raiz — demonstrada, e são TRÊS, não uma

O finding propõe uma hipótese única ("a expansão nunca foi decidida"). A releitura **não a
sustenta como causa única**. Há três causas distintas, com naturezas, evidências e remediações
diferentes — e tratá-las como uma só é o que faria o plano falhar.

### RC-1 — POLÍTICA: o escopo de D-K foi deferido explicitamente, e o deferimento nunca foi resolvido

**Não é hipótese. Está escrito, verbatim, no artefato de entrega da própria D-K.**
`docs/governance/TODO.md:6386-6395`, dentro da seção de entrega de D-K:

> "**Aprovações fora da cadeia de compras** encontradas na varredura de rotas e
> **deliberadamente não tocadas** (escopo é a cadeia de suprimentos):
> `PUT /api/inventory/transfers/:id/approve`, `POST /api/inventory/counts/:id/approve`,
> `PATCH /api/marketing/materials/:id/approve`, `POST /api/ti/access-requests/:id/approve` …
> e `POST /api/juridico/contracts/:id/approve`. Se o dono quiser a mesma regra nesses pontos,
> a função de `shared/domain/segregationOfDuties.ts` já serve sem alteração."

E `PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md:209-223` confirma o lado positivo: D-K existe, é
datada (2026-08-10), enumera os 4 pontos e reverte explicitamente a ressalva de D-C.

**Isto é prova, não inferência:** quem implementou D-K **viu** os outros pontos, **listou** 5
deles por rota, **declarou** que não os tocou por escopo, e deixou item aberto. Portanto:

- a omissão **não** foi esquecimento nem falha de desenho — foi **deferimento consciente**;
- **não existe decisão do dono dispensando** o controle nesses pontos (o item continua `[ ]`);
- o mecanismo é reutilizável **sem alteração**, atestado por quem o escreveu.

**Escopo de RC-1:** os 21 pontos `N`, menos o #5 (CASE-002) → **20 pontos**. Coincide
numericamente com o "20" do TITLE, mas por outra via: 20 é o que sobra em RC-1 depois de
CASE-002, não o total de `N`.

**Corolário demonstrado:** RC-1 é uma causa **única** para esses 20 pontos. A prova é que a
correção de cada um é literalmente a mesma linha de código chamando a mesma função pura, com
apenas o `rule`, o `documentLabel` e o `approverHint` variando — e o campo do solicitante
**já existe e já é gravado do JWT** em todos eles. Nada além da decisão de política falta.

### RC-2 — MODELO DE DADOS: em 4 pontos a identidade não é representável, e isso não é o mesmo defeito

Categoria diferente, porque nela **nenhuma decisão de política é suficiente**: aplicar D-K é
tecnicamente impossível antes de mudar contrato ou schema.

| Ponto | O que falta | Evidência |
|---|---|---|
| BOM (#11) | `ApproveBOMUseCase.execute({ id })` não recebe identidade; e **não escreve `approved_by`/`approval_date` nem quando é chamado** (F-B); e a BOM nasce `active`, pulando `draft` | `ApproveBOMUseCase.ts:40,55-66`; `bomService.ts` (`status:'active'` explícito) × `models/BillOfMaterial.ts:47` (`defaultValue:'draft'`) |
| MPS (#21) | `master_production_plans` **não tem `created_by`** — o solicitante não existe no modelo | grep em `modules/masterProduction`: única ocorrência de `created_by` é `:149`, da OP gerada |
| NP-1/NP-2 | `AccountPayable.approved_by` existe e **nunca é escrito**; controller não passa `req.user.id` | `models/AccountPayable.ts:55`; `financialController.ts:175-183` |
| NP-3 | `TreasuryFinancialOperation` **não tem nenhuma coluna de usuário** | `models/TreasuryFinancialOperation.ts:42-64` |

**Por que separar importa:** RC-2 contém uma parte que **não depende de decisão do dono** —
*registrar quem praticou o ato* não é regra de negócio, é trilha de auditoria, e é o padrão
que o próprio ERP aplica em ~50 outros pontos (`approved_by` + `approved_at`). Já *exigir que
o ato passe por aprovação* é decisão. §6 explora exatamente essa fronteira.

### RC-3 — GOVERNANÇA: não existe artefato de matriz de autorização, e a política que existe está em drift

Duas evidências independentes, ambas relidas no HEAD:

1. **Drift da própria D-K.** `docs/governance/TODO.md:5271-5274` confere verbatim:
   *"[PENDENTE] **Sem segregação de função** (aprovador ≠ solicitante) — decisão explícita do
   dono, não é defeito. Abaixo de R$ 500.000 no nacional, quem solicita pode aprovar."* Isso
   afirma **o oposto** do que o código faz. Aplico aqui a correção 4 do finding-validator e
   **concordo com ela**: o **conteúdo** de D-K é resolvível por data (o `PLANO_ACAO` é de
   2026-08-10 e reverte D-C explicitamente); o que é indeterminável é o **escopo**. A linha
   5271-5274 é resíduo de D-C não atualizado — **drift documental**, não contradição
   irresolúvel. Mas é drift **na única política de segregação existente**, o que é
   exatamente o que a Regra 21 manda interromper.
2. **Ausência de matriz.** Não existe artefato `AUTHORIZATION_MATRIX` declarando, por
   RESOURCE×ACTION, se aquele ato exige aprovador ≠ solicitante. Consequência **estrutural, não
   estética**: sem esse artefato não há contra o quê um teste de guarda comparar, e o
   comentário `segregationOfDuties.ts:12-18` ("uma cópia por módulo garantiria que, na próxima
   rodada, um dos pontos ficasse para trás") descreve o modo de falha que **vai reincidir**.

**RC-3 é a causa da reincidência**, distinta da causa dos 20 pontos atuais. Corrigir só RC-1
fecha o buraco de hoje e garante que ele volte no próximo módulo entregue.

### Síntese de causa-raiz

| Causa | Natureza | Pontos | Bloqueada por decisão? |
|---|---|---|---|
| **RC-1** | política de controle interno | 20 (`N` menos #5) | **SIM, integralmente** (Regra 6) |
| **RC-2** | contrato/schema — identidade irrepresentável | BOM, MPS (+ NP-1/2/3, encaminhados) | **PARCIALMENTE** — registrar identidade não; exigir aprovação sim |
| **RC-3** | governança — matriz inexistente + drift de D-K | transversal | **PARCIALMENTE** — o *inventário* não; o *conteúdo* da coluna "exige segregação?" sim |

**Não é uma causa só. Não são 24 causas. São três.**

---

## 4. Blast radius por família

Agrupei os 24 pontos em escopo (20 de RC-1 + 3 `N/A` + #14 sem solicitante) por *forma da
correção*, porque é isso que determina custo e risco — não o módulo.

### F1 — "chamada única, campo já existe" (12 pontos, o grosso de RC-1)

Pontos **6, 7, 8, 12, 16, 17, 18, 20, 22, 23, 24, 25, 26** (13 rotas; #22-#26 compartilham
padrão de `juridico`/`rh` sem solicitante distinto em alguns casos — ver F4).

- **Módulos:** `ti`, `inventory`, `production`, `marketing`, `facilities`, `juridico`, `rh`.
- **Call sites a alterar:** 1 por ponto, dentro do `execute` do use case, **antes da primeira
  escrita**. Zero mudança de middleware, zero mudança de rota, zero migration.
- **Arquivos tocados por ponto:** 1 use case + 1 entrada em `SEGREGATION_RULES` + 1 arquivo de
  teste. `shared/domain/segregationOfDuties.ts` é tocado **uma vez** (novas entradas no
  `const`), não por ponto.
- **O que quebraria:** o fluxo em que a mesma pessoa cria e aprova. Ver §5.
- **Blast radius em código: mínimo e localizado.** Nenhum destes pontos tem consumidor a
  jusante que dependa de o `approved_by` ser igual ao criador.

### F2 — "exige mudança de contrato antes" (2 pontos: BOM #11, MPS #21)

- **BOM:** `ApproveBOMUseCase.execute` precisa receber `approverUserId`; precisa escrever
  `approved_by`/`approval_date`; precisa de rota; e a BOM precisa **nascer `draft`**.
  **Blast radius alto e não local:** `BillOfMaterial.findOne({ product_id, status:'active' })`
  é consumido pela **explosão de MRP, pela reserva na liberação de OP e pelo custeio na
  conclusão** (documentado em `ApproveBOMUseCase.ts:11-17`). Fazer a BOM nascer `draft`
  significa que **nenhuma BOM nova entra em vigor até ser aprovada** — muda o fluxo de
  cadastro da fábrica inteira. Não é refactor, é mudança de processo.
- **MPS:** exige migration adicionando `created_by` a `master_production_plans` +
  escrita do JWT na criação. Blast radius **baixo** (tabela nova em módulo NÃO-PRODUÇÃO, 0
  registros), mas é migration.

### F3 — "a segregação não se aplica; o controle correto é outro" (2 pontos: #13, #14)

- **#13 liberação de lote:** o gate G7 já existe e é bom. Segregação aqui significa
  `releasedBy ≠ inspetor da inspeção usada`. **Blast radius conceitual:** em fábrica pequena,
  o inspetor de qualidade **é** quem libera — aplicar isso pode exigir dois funcionários de
  qualidade, o que é decisão organizacional, não de software.
- **#14 bloqueio de lote:** bloquear é ato **restritivo**. Segregação em ato restritivo é
  controle de baixo valor (o risco é bloquear indevidamente, não autoaprovar). **Recomendação
  técnica da triagem: candidato natural a dispensa registrada**, não a imposição. Não decido.

### F4 — "ato unilateral / criação é o ato" (4 pontos: #19, #22, #27, #28)

- **#27 diretoria:** criar planejamento/ata/risco **é** o ato aprovado. Segregação
  literalmente não é definível. Dispensa deveria ser registrada, não implementada.
- **#22 decisão de contrato de trabalho:** ato unilateral do empregador (BR-RH-D01). Idem.
- **#19 adjudicação de RFQ:** mitigado a jusante. `TODO.md:6379-6381` registra que a
  adjudicação foi avaliada e deixada de fora com a frase **"Basta o dono dizer 'sim' para
  entrar"** — ou seja, este ponto já tem pergunta formulada e resposta pendente **desde a
  entrega de D-K**.
- **#28 liberação de documento vencido:** o consumidor (`DepartTripUseCase:67`) checa
  `!insurance.released_by`. Segregação natural aqui é `released_by ≠ quem faz o /depart`, que
  é **um controle diferente** do de solicitante×aprovador.

### F5 — transversal (RC-3)

O guarda de cobertura (`RX` do reteste) é **1 arquivo de teste novo + 1 artefato de matriz**.
Blast radius em código: zero. Blast radius em processo: alto e positivo — passa a **reprovar o
CI** quando um ponto de aprovação novo entra sem constar da matriz. **Sem ele, o achado
reincide**, e isso está previsto no próprio código auditado.

### Resumo numérico do blast radius

| Família | Pontos | Migrations | Mudança de contrato | Mudança de fluxo de negócio |
|---|---|---|---|---|
| F1 | 13 rotas / 12-13 pontos | 0 | 0 | só o travamento de autoaprovação |
| F2 | 2 | 1 (MPS) | 1 (BOM) | **sim, alta (BOM)** |
| F3 | 2 | 0 | 0 | possivelmente (segundo inspetor) |
| F4 | 4 | 0 | 0 | n/a — candidatos a dispensa registrada |
| F5 | transversal | 0 | 0 | CI passa a reprovar ponto novo sem matriz |

---

## 5. O travamento operacional — o precedente D-K **não** se aplica igual, e a diferença é a favor de agir agora

O despacho pede confirmação explícita disto. Resposta: **o padrão aceito em D-K se aplica em
espécie, mas o custo hoje é MENOR aqui do que era em Compras — e cresce com o tempo.**

**Ambiente, por artefato versionado** (`coretriad/states/ERP-LEGACY-001/PRODUCTION_STATUS_MAP.md`,
seção `server/`, relida no HEAD):

- `users`: **PRODUÇÃO REAL parcial** — 21 registros = **1 admin real + 20 contas
  `@teste.evokaudio`** explicitamente não-produção. Confirmado: **há um único usuário real,
  e ele é `admin`.**
- **Todos** os módulos dos 24 pontos em escopo estão **NÃO-PRODUÇÃO**: `ti`, `inventory`,
  `accounting`, `bom`, `production`, `masterProduction`, `engineering`, `marketing`,
  `facilities`, `juridico`, `rh`, `quality`, `rfq`, `directorate`. Vários com "0 registros
  medidos" e confiança ALTA.

**Três consequências, todas relevantes para a decisão do dono — e nenhuma delas é a decisão:**

1. **Hoje o travamento é teórico, não operacional.** Em Compras, D-K travou um fluxo que
   *existia* (`purchases` depende de `suppliers`, medido em 0 — logo também não travava nada
   real). Aqui é o mesmo: **não há contrato, contagem, lançamento contábil, BOM, plano mestre
   ou solicitação de acesso real no sistema para travar.** O custo de aplicar segregação
   **agora** é próximo de zero em operação, e integralmente pago em esforço de engenharia.
2. **O custo cresce monotonicamente.** Depois do Go-Live, cada ponto travado é um processo
   parado com dado real dentro. A janela em que essa correção é barata é **exatamente agora**.
3. **Não há deadlock de bootstrap.** Verifiquei o caso circular óbvio: se a segregação valer
   para o ponto #6 (concessão de acesso de TI), o `admin` conseguiria ainda cadastrar o
   segundo aprovador? **Sim.** O caminho de criação de usuário e atribuição de perfil é
   `POST /api/users` + `POST/PUT /api/access-profiles` (`accessProfiles.ts:24-25`,
   `authorize('admin')`), que **não passa** pelo fluxo de `it_access_requests`. A porta de
   saída existe e é independente. Registro isto porque, sem verificar, seria a objeção
   correta contra qualquer plano.

**Contrapartida organizacional (`segregationOfDuties.ts:45-50`), reafirmada:** aplicar em
qualquer ponto exige **um segundo usuário com nível `approve` naquele módulo**. Isso é
condição de aceite do reteste (`RZ`), não detalhe de implantação. **Quantos perfis hoje têm
`approve` por módulo é a lacuna L-T2** — não medível nesta fase sem violar APR-2026-016.

---

## 6. Plano — a fronteira entre executável e bloqueado

### 6.1 EXECUTÁVEL sem decisão do dono (E)

Curto, e é assim de propósito. Só entra aqui o que **não** afirma política de controle
interno nova.

**E-1 — Registrar a identidade onde ela não existe (RC-2, parte de trilha de auditoria).**
Justificativa de que não é decisão de negócio: gravar *quem praticou o ato* é o padrão que o
próprio ERP aplica em ~50 pontos (`approved_by` + `approved_at`), e em dois destes casos a
**coluna já existe declarada no model com o comentário `'FK → users.id'`** — a intenção está
versionada; só a escrita falta.
- **E-1a (MPS, ponto #21):** migration adicionando `created_by INTEGER` a
  `master_production_plans` + escrita de `req.user.id` na criação. Torna a segregação
  **representável** sem decidir que ela é **exigida**. Módulo NÃO-PRODUÇÃO, 0 registros → sem
  backfill (o engineer deve confirmar `count(*) = 0` **no banco de teste**, nunca no real).
- **E-1b (BOM, ponto #11, parte segura):** estender `ApproveBOMUseCase.execute` para receber
  `approverUserId` e **escrever `approved_by`/`approval_date`** (fecha F-B). Como o use case é
  **órfão (sem rota)**, esta mudança tem blast radius operacional **zero** e destrava
  qualquer ramo futuro. **NÃO** criar a rota e **NÃO** mudar a BOM para nascer `draft` — isso
  é §6.2.
- **NP-1/NP-2/NP-3 pertencem a esta classe** (`AccountPayable.approved_by` nunca escrito;
  treasury sem coluna de usuário) mas estão **fora do escopo do caso** → §2, encaminhamento.

**E-2 — Inventário versionado dos pontos de aprovação (RC-3, parte factual).**
Produzir o artefato `AUTHORIZATION_MATRIX` — RESOURCE × ACTION × rota × campo do solicitante ×
"tem segregação hoje? S/N/N-A" — **com a coluna "exige segregação?" DELIBERADAMENTE VAZIA**.
É levantamento de fato, não política. Duplo valor: (i) é o documento sobre o qual o dono
responde a Pergunta Q1 sem ter que ler código; (ii) é o alvo contra o qual o guarda de
cobertura (E-3) compara.
**Ressalva de ownership (Regra 16, a resolver com o Director antes do despacho):** o destino
natural é `requirements/` ou `architecture/`, cuja autoridade de escrita é OpusCore (e
SanaCore **apenas em worktree de remediação**). Portanto: produzir **em worktree
`sana/ERP-LEGACY-001/FIND-ERP-009`**, jamais direto na branch de auditoria.

**E-3 — Guarda de reincidência (RC-3, parte estrutural), desenhado mas condicionado.**
Teste que **falha** quando surge rota de ato aprovatório fora do inventário. O padrão já existe
no repositório (guardas de organograma e docs-drift). **Condição:** o guarda só pode *reprovar*
por "falta segregação" depois de E-2 preenchido pelo dono. Antes disso ele reprova apenas por
"ponto novo não inventariado" — que **já é útil e já é executável**.

**E-4 — Não-regressão de D-K (R0).** `purchase-segregation-of-duties.test.ts` (381 linhas) deve
permanecer verde, **incluindo os casos que provam que `admin` não é isento**. Nenhuma
alteração em `segregationOfDuties.ts` pode afrouxar os 4 pontos existentes. Isto é restrição,
não tarefa.

### 6.2 BLOQUEADO por decisão do dono (B)

**Tudo o que impõe a regra em qualquer ponto novo.** Sem exceção, e a razão é a Regra 6:
declarar que um ato exige dupla pessoa é **inventar regra de negócio** se o dono não decidiu.

- **B-1 (RC-1, 20 pontos):** aplicar `assertApproverIsNotRequester` nos pontos **decididos**,
  com entrada própria em `SEGREGATION_RULES` por ponto (padrão `D-K-<PONTO>` ou
  identificador novo, se o dono decidir que não é extensão de D-K mas política nova).
  **Está integralmente desenhado** (§4/F1) e é mecânico. Falta só o "quais".
- **B-2 (BOM, resto):** BOM nascer `draft` + rota `POST /api/boms/:id/approve` + exigir
  aprovação para entrar em vigor. **É mudança de processo produtivo** (§4/F2), não refactor.
- **B-3 (MPS, resto):** exigir nível `approve` em `firm`/`release`. O código diz, em
  `masterProductionPlans.ts:20-28`, que isso foi omitido **de propósito** porque é "política de
  governança que o dono do produto não definiu" e que "inventar a alçada aqui criaria um
  segundo padrão". **A triagem concorda com o código auditado e não inventa a alçada.**
- **B-4 (contagem de inventário, ponto #8, dupla remediação):** além da segregação, a
  **tolerância de variância** — hoje `variance !== 0` ajusta qualquer magnitude
  (`ApproveInventoryCountUseCase.ts:80`). O valor/percentual da tolerância e se variância acima
  dela exige alçada superior são **parâmetros de negócio**. Não os invento.
- **B-5 (dispensas registradas):** os pontos que a triagem entende como candidatos naturais a
  **dispensa** (#14 bloqueio de lote, #22 ato unilateral, #27 criação-é-o-ato, e possivelmente
  #19) precisam de **decisão registrada dizendo que não exigem**, porque o EXPECTED_BEHAVIOR do
  finding é explícito: *"Nenhum ponto pode estar no estado atual: sem segregação e sem
  decisão."* **Dispensa registrada fecha o finding tão legitimamente quanto imposição** — e é
  mais barata. Isso é observação de método, não recomendação de escolha.
- **B-6 (RC-3, conteúdo):** preencher a coluna "exige segregação?" da matriz de E-2.
- **B-7 (drift de D-K):** corrigir `docs/governance/TODO.md:5271-5274`, que hoje afirma o
  oposto do código. **Tecnicamente** é edição de doc e seria executável; **na prática** o texto
  correto depende de qual é a política final, então segue com B-6.

### 6.3 Sequenciamento e colisão (Regra 11)

1. **CASE-002 antes.** Ele cria `assertApproverIsNotPriorApprover` e novas entradas em
   `SEGREGATION_RULES` no **mesmo arquivo** que B-1 vai tocar. Despachar os dois em paralelo é
   colisão garantida em `server/src/shared/domain/segregationOfDuties.ts`.
2. **E-1, E-2, E-4** podem seguir em worktree própria — não colidem (arquivos disjuntos).
3. **B-1..B-7** só depois dos `APR-...` do §7.

---

## 7. PERGUNTAS AO DONO — formuladas, NÃO respondidas

> Pré-requisito de forma (Regras 17/18): cada resposta precisa virar registro explícito em
> `APPROVALS.md` com ID `APR-...`, datado, no formato de D-K. **Nenhuma pode ser inferida** —
> nem de D-K por analogia, nem de memória, nem deste documento. A triagem **não escolhe** e
> não sugere padrão implícito.

### Q1 — Escopo: em quais dos 24 pontos "quem pede não aprova"?

**Contexto.** Em 2026-08-10 você decidiu (**D-K**) que na compra "quem aprova não é quem
pediu", e que **nem o `admin` é exceção**, porque identidade não é concedível. Foi implementado
em 4 pontos da cadeia de compras — e está correto onde está. Quem implementou **listou por
escrito 5 outros pontos de aprovação do sistema e registrou que os deixou de fora "de propósito,
porque o escopo era a cadeia de suprimentos", encerrando com "se o dono quiser a mesma regra
nesses pontos, a função já serve"** (`TODO.md:6386-6395`). Esse item nunca foi fechado. Hoje
há **24 pontos** em que uma pessoa só pode pedir e aprovar: contrato de trabalho, concessão e
rejeição de acesso, contagem de estoque, postagem e estorno de lançamento contábil,
transferência entre depósitos, liberação e bloqueio de lote, liberação de desenho, ativação de
roteiro, material e orçamento de marketing, adjudicação de RFQ, override de odômetro, plano
mestre, estrutura de produto (BOM), decisões de LGPD, encerramento de processo jurídico,
revogação de procuração, atos de diretoria e liberação de documento de veículo vencido.

**O que você precisa dizer.** Para **cada** ponto: **exige** aprovador ≠ solicitante, ou
**está dispensado** (com o motivo). As duas respostas fecham o achado; **"não responder" é a
única que não fecha.** A triagem preparou (E-2) a lista completa em formato de tabela para
você marcar.

**Sub-pergunta de forma, que muda muito o custo:** você quer decidir
(a) **ponto por ponto**; (b) **por módulo** ("todo o financeiro/contábil sim, o resto não");
(c) **por severidade** ("só onde há dinheiro ou estoque"); ou (d) **tudo de uma vez** ("a
mesma regra vale em todo ato de aprovação do ERP, salvo exceção nomeada")?
A opção (d) é a única que também fecha os **11 pontos novos** que esta triagem encontrou fora
da lista do finding (§2) e os pontos que ainda não foram varridos — as outras deixam a
próxima rodada reabrir o assunto.

### Q2 — Prioridade e faseamento: agora, ou junto com o Go-Live?

**Contexto que você precisa ter, e que é evidência, não opinião.** Todos os módulos afetados
estão hoje **sem dado real** (`PRODUCTION_STATUS_MAP.md`): zero contrato, zero contagem, zero
lançamento contábil, zero BOM, zero plano mestre. **Logo, aplicar a regra hoje não trava
nenhuma operação real** — trava fluxos que ninguém está usando. Depois do Go-Live, cada ponto
travado é um processo parado com dado dentro. O custo de fazer é o mesmo; **o custo de errar
cresce.** Em contrapartida, é engenharia real: 24 pontos, 2 deles (BOM e plano mestre)
exigindo mudança de estrutura antes.

**O que você precisa dizer:** fazer **em bloco único agora**, fazer **em ondas** (e qual onda
primeiro), ou **postergar** com data registrada. Se ondas, uma ordem possível — que a triagem
apresenta como material para você **escolher ou recusar**, não como decisão — é: (1) dinheiro
e estoque (contábil, contagem, transferência); (2) acesso e pessoas (TI, RH); (3) engenharia e
produção (BOM, roteiro, desenho, plano mestre); (4) o resto.

### Q3 — Segundo aprovador: quem, em quais módulos?

**Contexto.** A regra só funciona com **duas pessoas**. Hoje há **1 usuário real no sistema, e
é o `admin`** (`PRODUCTION_STATUS_MAP.md`: 21 usuários = 1 admin + 20 contas de teste). O
próprio código já avisou disto quando D-K foi entregue
(`segregationOfDuties.ts:45-50`: *"hoje o banco de dev tem 1 único usuário capaz de aprovar
compra … falta a contrapartida organizacional"*). Verifiquei que **não há armadilha de
bootstrap**: cadastrar o segundo aprovador não passa pelo fluxo de solicitação de acesso, então
não há deadlock.

**O que você precisa dizer:** quais pessoas reais serão cadastradas como segundo aprovador, e
em quais módulos. **Sem isso, cada ponto onde a regra entrar fica comprovadamente inoperante
para o usuário `admin`** — o que é aceitável hoje (nada em produção) e não será depois. É
condição de aceite do reteste (`RZ`), não detalhe de implantação.

### Q4 — A contagem de inventário tem uma segunda pergunta embutida: tolerância de variância

**Contexto.** Hoje aprovar uma contagem cíclica ajusta o estoque para **qualquer** diferença
encontrada, de 1 unidade a 100.000, sem faixa de tolerância e sem exigir alçada maior para
diferença grande (`ApproveInventoryCountUseCase.ts:80`). Isso é independente da segregação: é
um segundo controle ausente no mesmo ponto.

**O que você precisa dizer:** existe tolerância (em valor R$, em percentual, ou nas duas
dimensões)? Diferença acima dela exige aprovação de nível superior, ou apenas justificativa
registrada? **A triagem não arbitra número.**

### Q5 — Governança: você quer o guarda que impede a reincidência?

**Contexto.** O módulo de segregação foi posto em código compartilhado justamente porque quem
o escreveu previu o problema: *"uma cópia por módulo garantiria que, na próxima rodada, um dos
pontos ficasse para trás"* (`segregationOfDuties.ts:12-18`). Foi exatamente o que aconteceu —
em escala invertida: o ponto que ficou à frente foi um só. Sem um guarda automático, o próximo
módulo entregue reintroduz o achado, **independentemente do que você responder em Q1**.

**O que você precisa dizer:** aceita que o CI passe a **reprovar** a entrada de um ato de
aprovação novo que não conste da matriz de autorização decidida? Custo: um atrito a mais em
cada entrega nova de módulo. Benefício: o achado não volta.

---

## 8. Testes de regressão previstos

**Harness (herdado de CASE-002 §9, reverificado por leitura):** os testes precisam ser de
**integração HTTP**, não unitários — segregação por identidade é invisível a teste que instancie
o use case direto (é por isso que a suíte atual passa verde com 20 pontos abertos).
Infraestrutura existente e reutilizável: `server/tests/helpers/testApi.ts` — `api()`,
`authToken()`, `hasIntegrationPrerequisites()` e o **segundo token de administrador distinto**
(`ci-approver@evok.local`, provisionado por `scripts/run-api-suite.cjs`), criado justamente
porque D-K exige duas pessoas. **É exatamente o que o par (a)/(b) de cada bloco precisa, e já
existe.** Banco: **exclusivamente** `erp_evok_audio_test`, com o guard de sufixo `_test`/`_ci`.
**Nunca** o banco real (APR-2026-016).

Mapeamento contra a `RETEST_SPECIFICATION` do finding:

| Bloco do reteste | Casos a versionar | Depende de decisão? |
|---|---|---|
| **R0** não-regressão D-K | `purchase-segregation-of-duties.test.ts` verde, **incluindo `admin` não isento** nos 4 pontos | **Não** |
| **R1** contrato jurídico | **NÃO ENTRA NESTE CASO** — é o reteste de FIND-ERP-005/CASE-002 (§0). Registrar a interseção para a VeriCore não retestar duas vezes | n/a |
| **R2** acesso TI | (a) gestor G cria e tenta aprovar → **rejeitado**, `status` permanece `pending`; (b) `admin` A cria e tenta aprovar → **rejeitado** (prova de que `approverEligibilityService.ts:27` não isenta); (c) E ≠ solicitante → sucesso; (d) idem `/reject` | **Sim (Q1)** |
| **R3** contagem | (a) C com `assigned_to = C` ou `counted_by = C` tenta aprovar → **rejeitado**, **zero `InventoryMovement`**, `Product.quantity` e `ProductWarehouseStock` **inalterados** (a asserção de "nada gravado" é essencial: o ajuste roda dentro da transação, `:89-96`); (b) A ≠ C → sucesso; (c) variância acima da tolerância exige alçada superior | **Sim (Q1 + Q4)** |
| **R4** postagem contábil | (a) U = `created_by` tenta postar → **rejeitado**, `status` permanece `draft`, `approved_by` permanece `NULL`; (b) U ≠ `created_by` → sucesso | **Sim (Q1)** |
| **R5** estorno | (a) U que consta como `created_by` **ou** `approved_by` do original tenta estornar → **rejeitado**, original permanece `posted`, **nenhum lançamento de estorno criado**; (b) V distinto → sucesso; (c) **teste de cadeia**: prova que nenhum usuário único percorre criar→postar→estornar→aprovar. **Acréscimo desta triagem (F-A):** o teste deve cobrir os **dois** caminhos de escrita de `approved_by`, porque o estorno nasce `posted` sem passar por `PostEntryUseCase` | **Sim (Q1)** |
| **R6** BOM | (a) criação com `status='draft'` e `approved_by = NULL`; (b) existe `POST /api/boms/:id/approve` recebendo identidade do JWT; (c) `created_by` tentando aprovar → rejeitado; (d) aprovador distinto → sucesso **com `approved_by`/`approval_date` preenchidos** (hoje não são, mesmo pelo use case existente — F-B) e `activateExclusively` rebaixando a vigente; (e) BOM `draft` **não** é selecionada por `findOne({product_id, status:'active'})` na explosão/reserva/custeio | **Sim (Q1 + Q2/B-2)** |
| **E-1a/E-1b** (executáveis) | MPS: plano criado registra `created_by` do JWT. BOM: `ApproveBOMUseCase` recebe `approverUserId` e grava `approved_by`/`approval_date`; **não** cria rota nova | **Não** |
| **R7-Rn** | par (a)/(b) para cada ponto **decidido** em Q1: transferência, lote (vs. inspetor), release/obsolete de desenho (vs. autor), ativação de roteiro, material e budget-decision de marketing, override de odômetro, LGPD, adjudicação de RFQ, MPS firm/release | **Sim (Q1)** |
| **RX** guarda estrutural | teste que **falha** quando entra ato de aprovação novo fora da matriz. **Parte executável agora:** reprovar por "não inventariado". **Parte bloqueada:** reprovar por "falta segregação" (precisa de Q1/B-6) | **Parcial** |
| **RZ** ambiental | existir >1 usuário com `approve` em cada módulo onde a regra entrar. **Não verificável nesta fase** (L-T2) | **Sim (Q3)** |
| **RF** | suíte completa verde no REMEDIATION_COMMIT | **Não** |

**Armadilha herdada, aplicável aqui:** as classes de bug do repositório que passam por
typecheck **e** por suíte verde (registro histórico do projeto) incluem exatamente este padrão
— teste unitário com repositório mockado que nunca exercita o caminho HTTP. Um teste unitário
de `isSelfApproval` **não** prova nada sobre nenhum dos 24 pontos.

---

## 9. Risco de regressão

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Segregação trava o `admin`, único usuário real, nos pontos onde entrar | **Alta (certa, por construção)** | **Baixo hoje / Alto após Go-Live** — todos os módulos afetados estão sem dado real (§5) | Q3 antes de aplicar; cadastrar 2º aprovador por módulo; `RZ` como condição de aceite. Padrão já aceito em D-K |
| **BOM nascer `draft` para a fábrica sem BOM ativa** | **Média** | **ALTO** — `findOne({product_id, status:'active'})` alimenta explosão de MRP, reserva na liberação de OP e custeio na conclusão | Não executar B-2 sem decisão; `R6(e)` é obrigatório; migrar BOM existente **não** é necessário hoje (0 registros — confirmar em banco de **teste**) |
| Escrita de `approved_by` onde hoje é `NULL` muda comportamento de consumidor a jusante | Baixa | Médio | Antes de E-1b, grep por leitores de `approved_by`/`approval_date` de BOM e de `created_by` de MPS. Registrar no REMEDIATION_REPORT |
| Colisão em `shared/domain/segregationOfDuties.ts` entre este caso e CASE-002 | **Alta se paralelizado** | Médio (merge sujo em módulo crítico) | §6.3: sequenciar. CASE-002 primeiro |
| Correção idiossincrática por módulo, reintroduzindo o modo de falha que o próprio módulo previu | **Média** | **Alto** — é literalmente o achado se repetindo | Primitivo único em `shared/domain`, entrada em `SEGREGATION_RULES` por ponto, **nunca** cópia local. RX como rede |
| Migration de `created_by` em `master_production_plans` sobre tabela não vazia | Baixa | Médio | Coluna `NULL`-able; confirmar `count(*)` em banco de **teste**; **nunca** consultar `erp_evok_audio` |
| Fechar RC-1 e deixar RC-3 aberto → achado reincide no próximo módulo | **Alta** | Médio-Alto | Q5 + RX. Sem isso, a remediação tem prazo de validade |
| VeriCore fechar FIND-ERP-009 ao retestar FIND-ERP-005 (ou vice-versa) | Média | **Alto** (finding fechado sem estar corrigido) | §0: interseção do ponto #5 registrada nos dois casos. Regra 4: só VeriCore fecha, e precisa saber disto |
| Tratar as 3 causas-raiz como uma → plano bloqueia inteiro à espera de decisão | **Média** | Médio (atraso desnecessário do que já é executável) | §3 + §6.1: E-1/E-2/E-4 não dependem de decisão |

---

## 10. Estado do caso e VEREDITO

**Reconfirmação:** 28/28 pontos da tabela do finding relidos no HEAD `752b6d8`, **nenhuma
inversão de classificação**. Placar confirmado de forma independente: **S=4 · N=21 · N/A=3**,
100% dos `S` em compras, **zero** ocorrências em `client/src`. Quatro divergências
**editoriais** registradas (D-1 caminho do módulo; D-2 `AwardRfqUseCase`; D-3 módulo
`masterProduction`; D-4 "20" no TITLE deve ser "21") — nenhuma toca a conclusão, e a correção
do finding pertence à VeriCore (Regra 15).

**Divergência material (§2):** a tabela do finding é **piso, não teto**. A varredura dos
módulos que ele declarou `UNKNOWN` encontrou **≥11 famílias adicionais** de ato aprovatório sem
segregação, incluindo **pagamento de conta a pagar** e **liquidação de operação financeira** —
onde a identidade do executante **não é registrada em campo nenhum**, apesar de
`accounts_payable.approved_by` existir declarada no model. Encaminhado, não silenciado, não
absorvido.

**Causa-raiz:** **demonstrada, e são TRÊS** (§3), não uma. RC-1 (política — deferimento de
escopo **escrito verbatim** em `TODO.md:6386-6395` por quem implementou D-K); RC-2 (modelo de
dados — identidade irrepresentável em 4 pontos); RC-3 (governança — matriz inexistente + drift
de D-K em `TODO.md:5271-5274`). A demonstração de RC-1 como causa **única** para 20 pontos é
que a correção de cada um é a mesma chamada da mesma função pura, e o campo do solicitante já
existe e já é gravado do JWT em todos eles.

**Blast radius:** mapeado por família com números (§4) — F1: 13 rotas, 0 migration, 0 mudança
de contrato; F2: 2 pontos, 1 migration, 1 contrato, **mudança de fluxo produtivo em BOM**;
F3/F4: 6 pontos onde o controle correto pode não ser segregação; F5: transversal.
**Travamento operacional confirmado e requalificado** (§5): o precedente D-K se aplica em
espécie, mas **todos os módulos afetados estão sem dado real hoje** — o custo operacional de
aplicar agora é próximo de zero e cresce com o tempo. Verificado que **não há deadlock de
bootstrap** para cadastrar o segundo aprovador.

**Plano:** fronteira traçada (§6). Executável sem decisão: E-1 (registrar identidade em MPS e
BOM), E-2 (inventário da matriz com a coluna de política **vazia**), E-3 parcial, E-4
(não-regressão de D-K). Bloqueado: **todo ato de impor a regra** em qualquer ponto novo.

---

### VEREDITO: **BLOQUEADO POR DECISÃO HUMANA**

O núcleo deste caso — **quais dos 24 pontos exigem aprovador ≠ solicitante** — é escolha de
política de controle interno. Decidi-lo aqui violaria a **Regra 6** e produziria exatamente o
que o código auditado alerta em `masterProductionPlans.ts:20-28`: *"inventar a alçada aqui
criaria um segundo padrão"*. **A triagem não decide, não sugere padrão implícito e não
interpreta silêncio como dispensa.** As perguntas estão em **§7 (Q1 a Q5)**, formuladas com
consequência prática e custo, **não respondidas**.

**Carve-out executável, se o `coretriad-director` quiser despacho parcial:** E-1a, E-1b, E-2 e
o guarda de "ponto novo não inventariado" (E-3 parcial) podem seguir para o
`sanacore-remediation-engineer` **como estágio próprio**, em worktree
`sana/ERP-LEGACY-001/FIND-ERP-009`, **após CASE-002 aterrissar** (§6.3). Eles **não fecham o
finding** e não devem ser apresentados como se fechassem: tornam a segregação
**representável** e a decisão do dono **respondível sobre um documento** em vez de sobre
código. Se o Director preferir aguardar Q1 e despachar tudo de uma vez, a triagem não vê
prejuízo técnico — apenas perda da janela barata descrita em §5.

**Autoridade (Regras 3 e 4):** SanaCore **não** declara `RETEST_PASSED`, **não** declara
`FINDING CLOSED` e **não** declara `RISK_ACCEPTED`. `STATUS` de FIND-ERP-009 permanece
**`OPEN`**. Nota explícita para o reteste: a Regra 24 do `CLAUDE.md` **não se aplica** a este
finding (nenhum dos pontos deriva papel de payload do cliente — `req.user` é recarregado do
banco a cada request), e **isso não rebaixa a severidade**: HIGH foi mantido pelo
finding-validator por outros fundamentos. Registrado para que ninguém use a inaplicabilidade
da Regra 24 como argumento de rebaixamento ou de `RISK_ACCEPTED`.

---

*Produzido pelo `sanacore-remediation-triage`. Nenhum arquivo em `server/`, `client/`, `docs/`,
`audit/`, `coretriad/governance/`, `coretriad/states/` ou `.claude/` foi modificado. Nenhuma
suíte de teste foi executada, nenhum script de diagnóstico foi rodado e **nenhuma conexão com
banco de dados foi aberta** (regra permanente de segurança de dado real, APR-2026-016).*
