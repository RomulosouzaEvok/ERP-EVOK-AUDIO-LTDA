# FINDING

FINDING_ID: FIND-ERP-009
PROJECT_ID: ERP-LEGACY-001
AUDIT_ID: N/A — finding preliminar levantado durante discovery (passo 26), fora da sequência normal do passo 31, por autorização humana explícita (APR-2026-018)
BASELINE: tag `legacy-baseline-001` → `c9359be399c45191fe90e8e9707803125a5ba91d`
TITLE: Segregação de função (aprovador ≠ solicitante) existe apenas na cadeia de Compras — 20 outros pontos de aprovação do ERP permitem auto-aprovação, sem nenhuma decisão registrada que sustente a assimetria
DOMAIN: security / business-rules / governance
SUBDOMAIN: authorization (segregation of duties / internal control policy gap)
SEVERITY: HIGH
CONFIDENCE: CONFIRMED
STATUS: OPEN
AMBIENTE: DEV/HOMOLOGAÇÃO (todos os módulos afetados NÃO-PRODUÇÃO — ver §Ambiente)
DETECTED_BY: vericore-authorization-auditor (formalização de pontos dos 6 `BUSINESS_RULE_CANDIDATES_*.md`, com verificação independente por leitura direta)
SUGGESTED_REMEDIATION_OWNER: SanaCore
REMEDIAÇÃO APLICADA: **NENHUMA** — VeriCore não corrige o objeto auditado (Regra 2).

## ENQUADRAMENTO — POR QUE É ESTRUTURAL, NÃO PONTUAL

Registro explícito, por determinação do dono do CoreTriad.

O ponto central **não** é que a segregação esteja errada onde existe. Onde existe, está
**correta e é o melhor controle interno do sistema**: `shared/domain/segregationOfDuties.ts` é a
única regra do ERP inteiro que **não** tem curto-circuito para `role === 'admin'`, e a
justificativa registrada no módulo (L30-43) é sólida — privilégio é concedível, identidade não é;
uma exceção para `admin` não seria exceção estreita, seria o cancelamento da regra.

O achado é a **assimetria não decidida**:
- Existe decisão registrada (**D-K**, dono do produto, 2026-08-10) mandando aplicar segregação em
  **4 pontos da cadeia de compras**.
- **Não existe nenhuma decisão registrada** dizendo que os demais pontos **não devem** ter.

Já detectado de forma independente pelo discovery e registrado como **LACUNA-3** em
`BUSINESS_RULE_CANDIDATES_pessoas-governanca.md:497`: *"A segregação D-K foi decidida para
compras. Vale para aprovação de contrato, concessão de acesso e rescisão? **Hoje não vale — mas
não há decisão registrada dizendo que não deve valer.**"*

É **lacuna de política de controle interno**, não defeito isolado. A remediação correta não é
"adicionar a checagem em 20 lugares" — é **o dono decidir o escopo da política** e, só então, a
implementação seguir. Aplicar sem a decisão violaria a Regra 6.

**Agravante de política:** a própria D-K é **CONFLICTING** na documentação —
`docs/governance/TODO.md:5271-5274` afirma o oposto do que o código faz (*"**[PENDENTE] Sem
segregação de função** — decisão explícita do dono. Abaixo de R$ 500.000 no nacional, quem
solicita pode aprovar"*). A única política de segregação existente está documentada de forma
contraditória, o que torna impossível derivar por analogia a intenção para os demais módulos.

## DESCRIPTION

O ERP possui **um único mecanismo de segregação**, em `shared/domain/segregationOfDuties.ts`
(L75-149): `isSelfApproval` (L112-119, pura) e `assertApproverIsNotRequester` (L134-149, lança
`BusinessRuleError` 422).

**Busca exaustiva por chamadores** (grep por
`assertApproverIsNotRequester|isSelfApproval|segregationOfDuties` em todo `server/src` e em
`client/`) retorna **exatamente 4 call sites de produção**, todos na cadeia de compras:

| Regra | Call site | Rota |
|---|---|---|
| `D-K-REQUISICAO` | `ChangePurchaseRequisitionStatusUseCase.ts:104` | `PATCH /api/purchase-requisitions/:id/status` |
| `D-K-PEDIDO` | `ChangePurchaseStatusUseCase.ts:134` | `PUT /api/purchases/:id/status` |
| `D-K-ALCADA` | `ApprovePurchaseUseCase.ts:86` | `POST /api/purchases/:id/approve` |
| `D-K-COMEX` | `ApproveImportProcessUseCase.ts:82` | `POST /api/comex/import-processes/:id/approve` |

O `client/` **não tem nenhuma ocorrência** — a regra é integralmente backend-side (ponto
positivo: não depende de esconder botão na UI).

**Nenhum outro ponto de aprovação chama esse módulo.** Fora de compras, o único controle é RBAC de
nível, que responde "esta pessoa tem o direito de aprovar?" e **nunca** "esta pessoa é a mesma que
pediu?". Em todos eles `role === 'admin'` é curto-circuito — e o ambiente atual tem **1 único
usuário real (`admin`) + 20 contas `@teste.evokaudio`** (`PRODUCTION_STATUS_MAP.md:130`), logo a
totalidade desses fluxos é operável de ponta a ponta por uma única pessoa.

## TABELA-RESUMO — TODOS OS PONTOS DE APROVAÇÃO

**S** = compara aprovador com solicitante e rejeita · **N** = não compara (auto-aprovação
possível) · **N/A** = não há ato de aprovação distinto, ou o solicitante sequer é registrado
(pior que N: a segregação não é nem representável).

| # | Ponto de aprovação | Implementação | Solicitante registrado? | Segregação? |
|---|---|---|---|---|
| 1 | Requisição de compra → `approved` | `ChangePurchaseRequisitionStatusUseCase.ts:104` | Sim (`requester_id` NOT NULL) | **S** |
| 2 | Pedido de compra → `approved` | `ChangePurchaseStatusUseCase.ts:134` | Sim (NULL-able) | **S** |
| 3 | Pedido — alçada diretoria | `ApprovePurchaseUseCase.ts:86` | Sim | **S** |
| 4 | Importação — alçada | `ApproveImportProcessUseCase.ts:82` | Sim (`created_by`) | **S** |
| 5 | **Contrato jurídico — alçada** | `ApproveContractUseCase.ts:85-95` | Sim (`created_by`) | **N** — dedup por **papel**, não por pessoa (§1) |
| 6 | **Solicitação de acesso (TI)** | `ApproveAccessRequestUseCase.ts:29-42` | Sim (`requested_by`) | **N** (§2) |
| 7 | Rejeição de acesso (TI) | `RejectAccessRequestUseCase.ts` | Sim | **N** |
| 8 | **Contagem de inventário** | `ApproveInventoryCountUseCase.ts:50-120` | Sim (`assigned_to`, `counted_by`) | **N** (§3) — e **sem tolerância de variância** |
| 9 | **Lançamento contábil — postagem** | `PostEntryUseCase.ts:84-88` | Sim (`created_by`) | **N** (§4) |
| 10 | **Estorno contábil** | `ReverseEntryUseCase.ts:57-67` | Sim | **N** (§4) |
| 11 | **Estrutura de produto (BOM)** | `bomService.ts:314-322`; `ApproveBOMUseCase.ts:40` (órfão) | `created_by` gravado | **N/A** (§5) |
| 12 | Transferência entre depósitos | `ApproveWarehouseTransferUseCase.ts:43-91` | Sim (`requested_by`) | **N** |
| 13 | Liberação de lote (qualidade) | `ReleaseLotUseCase.ts:118-165` | Inspeção tem inspetor | **N** — gate G7 é compensatório **parcial** (exige *ato* anterior, não *pessoa* diferente) |
| 14 | Bloqueio de lote | `inventory.ts:36` | — | **N** |
| 15 | Desenho de engenharia — release | `ReleaseDrawingUseCase.ts:27-46` | `created_by` | **N** — duplo gate `approve`+`admin` (`engineering.ts:43`) restringe *quem*, não identidade |
| 16 | Roteiro de produção — ativação | `ActivateProductionRouteUseCase.ts:88` | Sim (`created_by`) | **N** |
| 17 | Material de marketing | `ApproveMaterialUseCase.ts:27-42` | Sim (`created_by`) | **N** |
| 18 | Orçamento de campanha | `BudgetDecisionUseCase.ts:41-70` | Sim | **N** |
| 19 | Adjudicação de RFQ | `AwardRFQUseCase.ts:280` | — | **N** — mitigado a jusante (a requisição gerada cai sob D-K) |
| 20 | Override de odômetro em viagem | `TripUseCases.ts:87,135-145` | Sim (`requested_by`) | **N** — 4º mecanismo independente (BR-FAC-D20) |
| 21 | **MPS — firmar / liberar** | `masterProductionPlans.ts:37-38` | **Não** (plano não tem `created_by`) | **N/A** (§6) — nem exige `approve`; ausência **documentada e assumida** |
| 22 | Decisão de contrato de trabalho | `authorizeContractDecision` (BR-RH-D01) | — | **N** — ato unilateral do empregador |
| 23 | Decisão/encerramento de incidente LGPD | `juridico.ts:172-173` | Sim | **N** |
| 24 | Rejeição de solicitação de titular (LGPD) | `juridico.ts:166` | Sim | **N** |
| 25 | Encerramento de processo jurídico | `juridico.ts:115` | Sim | **N** |
| 26 | Revogação de procuração | `juridico.ts:132` | Sim | **N** |
| 27 | Diretoria — planejamento/ata/risco | `directorate.ts:41-54` | — | **N/A** — criação **é** o ato aprovado |
| 28 | Liberação de documento de veículo vencido | `facilities.ts:52` | — | **N** |

**Placar (corrigido pela validação — a contagem original 4·20·4 estava errada): 4 com segregação
(S) · 21 sem (N) · 3 onde o ato nem existe separadamente (N/A). 100% dos S estão na cadeia de
compras.** (O TITLE diz "20 outros pontos"; o número exato de pontos SEM segregação é **21**, e o
total de pontos não-compras que exigem decisão do dono é **25**.)

## DETALHAMENTO DOS 5 PONTOS CENTRAIS

### §1. Contrato jurídico — dedup por PAPEL, não por PESSOA
`ApproveContractUseCase.ts:85-88`: a chave de unicidade é `(contract_id, role)`. **Nada compara
`input.approverUserId` com `contract.created_by`, nem com o `approver_user_id` da aprovação
existente.** `contractController.ts:48-55`: um `admin` recebe **os dois papéis simultaneamente**.
Caminho: (1) cria o contrato (`createdBy: req.user.id`); (2) aprova com `role:'diretor'`;
(3) aprova de novo com `role:'financeiro'` (papel diferente, dedup não dispara). **O contrato
atinge a alçada dupla de RF-JUR-003 com uma única pessoa.** `segregationOfDuties.ts` não é
importado por nenhum arquivo de `juridico`.

### §2. Concessão de acesso (TI)
`ApproveAccessRequestUseCase.ts:29-42` — único gate é `isEligibleApprover`
(`approverEligibilityService.ts:26-37`), que responde apenas *"esta pessoa está autorizada a
aprovar solicitações deste departamento?"*. **`request.requested_by` nunca é lido.** Como
`CreateAccessRequestUseCase.ts:55` grava `requested_by` do JWT, o gestor pode criar e aprovar a
própria concessão — e, sendo `admin`, o curto-circuito dispensa até a checagem de gestor.

### §3. Contagem de inventário
`ApproveInventoryCountUseCase.ts:50-120` — leitura integral: as únicas guardas são existência
(:57), `status === 'pending_approval'` (:60), `warehouse_id` (:63), lock (:56) e transição
condicionada (:107). **`approverId` nunca é comparado com `count.assigned_to` nem
`item.counted_by`** — ambos existentes no modelo (`models/index.ts:407-412`). Quem contou aprova o
próprio ajuste. E o laço de :77-100 aplica o ajuste para **qualquer** `variance !== 0`, **sem
tolerância** por valor ou percentual.

### §4. Lançamento contábil — postagem e estorno
`PostEntryUseCase.ts:84-88` grava `approved_by: userId` — **quem posta aprova a si mesmo**.
`ReverseEntryUseCase.ts:57-67` cria o estorno com `created_by`, `approved_by` e `approved_at` **do
mesmo usuário**, e **não lê `original.created_by` nem `original.approved_by`**. Ambas as rotas
exigem apenas `contabilidade:approve` (`accounting.ts:43-44`). **Um único usuário cria, posta,
estorna e aprova o estorno** — ciclo completo de manipulação do razão, com `approved_by` gravado
dando aparência documental de aprovação que nunca ocorreu. **Maior impacto material da lista.**

### §5. Estrutura de produto (BOM) — não há ato de aprovação algum
1. **A BOM nasce `active`** — `bomService.ts:314-322` cria com `status: 'active'`, **sobrescrevendo
   o `defaultValue: 'draft'`** do modelo (`BillOfMaterial.ts:47`) e pulando o estado `draft`.
2. **`approved_by`/`approval_date` existem no banco e nunca são preenchidos** (`:49-50`; grep não
   retorna nenhuma escrita).
3. **`ApproveBOMUseCase` existe, é testado e não tem rota** — e sua assinatura é
   `execute({ id }: { id: number })` (`:40`): **não recebe identidade de aprovador**, logo a
   segregação não seria nem implementável sem mudar o contrato. O módulo documenta a órfandade em
   `bom/README.md:61,208-211`.

A estrutura que determina o consumo de material de toda a fábrica entra em vigor **sem qualquer
aprovação**, por ato único de quem a cadastrou.

### §6. MPS — a ausência é assumida e documentada (evidência a favor do enquadramento)
`masterProductionPlans.ts:20-28` carrega, no próprio código, a confissão que sustenta este
finding como lacuna de política: *"Firmar e liberar são atos de decisão, e seria natural pedir
`approve`. **Não foi feito de propósito**: nível de alçada do PCP é política de governança **que o
dono do produto não definiu** [...] **Inventar a alçada aqui criaria um segundo padrão** [...]
Registrado como pendência em `docs/governance/TODO.md`."* O plano não registra sequer quem o criou
— segregação não é apenas ausente: é **irrepresentável** no modelo de dados atual.

## EXPECTED_BEHAVIOR

Para cada ponto de aprovação existe, em artefato versionado, uma de duas coisas: (a) a segregação
imposta pelo backend; **ou** (b) decisão registrada e datada do dono declarando que aquele ponto
**não** exige segregação, com justificativa e risco aceito. **Nenhum ponto pode estar no estado
atual: sem segregação e sem decisão.**

## ACTUAL_BEHAVIOR

Decisão registrada (D-K) para 4 pontos de compras, implementados. Para os outros 20+ não existe
nem imposição nem decisão de dispensa. Um único usuário — e há apenas um usuário real, o `admin` —
percorre sozinho o ciclo solicitar-e-aprovar em contratos, acesso, contagem, razão contábil, BOM,
transferência, lote, desenho, roteiro, material e orçamento de marketing, plano mestre e override
de odômetro.

## EVIDENCE

**Onde existe (referência):** `shared/domain/segregationOfDuties.ts` — 75-84 (SEGREGATION_RULES);
112-119; 134-149; **30-43 (justificativa de admin NÃO isento)**; 52-63.
Call sites: `ChangePurchaseRequisitionStatusUseCase.ts:50,104` · `ChangePurchaseStatusUseCase.ts:14-16,134`
· `ApprovePurchaseUseCase.ts:12-14,86` · `ApproveImportProcessUseCase.ts:33,82`.
Teste: `server/tests/unit/purchase-segregation-of-duties.test.ts` — **ÚNICO teste de segregação do
repositório**.

**Onde não existe:** `ApproveContractUseCase.ts:57-96,85-88` · `contractController.ts:48-55,78` ·
`ApproveAccessRequestUseCase.ts:29-42` · `approverEligibilityService.ts:26-37` ·
`CreateAccessRequestUseCase.ts:55` · `ApproveInventoryCountUseCase.ts:50-120,77-100` ·
`models/index.ts:405-412` · `PostEntryUseCase.ts:84-88` · `ReverseEntryUseCase.ts:42-49,57-67` ·
`accounting.ts:43-44` · `bomService.ts:314-322` · `BillOfMaterial.ts:47,49-50` ·
`ApproveBOMUseCase.ts:40,70` · `bom/README.md:61,208-211` ·
`ApproveWarehouseTransferUseCase.ts:43-91,85-88` · `ReleaseLotUseCase.ts:118-169,144-158` ·
`ReleaseDrawingUseCase.ts:27-46` · `engineering.ts:43` · `ActivateProductionRouteUseCase.ts:88` ·
`ApproveMaterialUseCase.ts:27-42` · `BudgetDecisionUseCase.ts:41-70` ·
`TripUseCases.ts:50-65,87,130-146` · `masterProductionPlans.ts:20-28,37-38`.

**Governança:** `BUSINESS_RULE_CANDIDATES_pessoas-governanca.md:219-222,440-449,484,497` ·
`..._comercial-financeiro.md:427,521,555` · `..._qualidade-estoque.md:212` ·
`..._cadastro-suprimentos.md:119-143,550` · `PRODUCTION_STATUS_MAP.md:127-132,137-164`.

## AMBIENTE

**DEV/HOMOLOGAÇÃO** para todos os módulos afetados. Os módulos **PRODUÇÃO REAL (APR-2026-016)**
são `items`, `categories`, `departments`, `users` (parcial), `auth` e `auditLogs`
(`PRODUCTION_STATUS_MAP.md:127-132`). **Nenhum dos pontos de aprovação listados pertence a esses
módulos.** Todos os afetados estão como NÃO-PRODUÇÃO: `bom`(:137), `production`(:138),
`inventory`(:150), `accounting`(:155), `facilities`(:158), `marketing`(:159), `juridico`(:160),
`ti`(:161), `engineering`(:164), `purchases`/`purchaseRequisitions`(:141-142), `comex`(:153),
`rfq`(:152), `quality`(:146), `rh`(:162).

## IMPACTOS

**BUSINESS_IMPACT:** A empresa não possui controle interno de dupla alçada fora de Compras. Um
único operador pode: fechar contrato jurídico de qualquer valor sozinho; conceder a si mesmo
acesso a qualquer sistema; ajustar estoque em qualquer magnitude sobre a própria contagem; lançar,
postar, estornar e "aprovar" movimentos no razão; colocar em vigor a estrutura de produto que
comanda todo o consumo de material da fábrica. Em auditoria externa (contábil, ISO 9001 §8.5.6
para BOM/desenho/roteiro, LGPD para incidentes) são achados de conformidade de primeira ordem.
**TECHNICAL_IMPACT:** O mecanismo correto já existe e é reutilizável — a não-adoção não é
limitação técnica. O próprio cabeçalho do módulo (L12-18) explica por que foi posto em
`shared/domain`: *"Uma cópia por módulo garantiria que, na próxima rodada, um dos pontos ficasse
para trás"*. Dois pontos exigiriam mudança de contrato antes: `ApproveBOMUseCase` não recebe
identidade, e o MPS não registra criador.
**SECURITY_IMPACT:** Violação de segregation of duties (OWASP ASVS V4.1.3; A01 Broken Access
Control, vertente business-logic). O campo `approved_by` gravado com o id do próprio autor produz
**falsa garantia documental**. Agravante ambiental: `admin` é curto-circuito em todos os gates
fora de D-K, e há 1 usuário real, que é `admin`.

## REPRODUCTION (estática — ver LACUNAS)

Cenário mais material (contábil):
1. U com `contabilidade:approve` cria lançamento (`created_by = U`).
2. `PATCH /entries/:id/post` — `accounting.ts:43` autoriza por nível; `PostEntryUseCase.ts:44-82`
   valida apenas partida dobrada; :84-88 grava `approved_by: U`. Nenhum branch compara U com
   `entry.created_by`.
3. `PATCH /entries/:id/reverse` — `:42-49` valida apenas `status === 'posted'`; :57-67 cria o
   estorno com `created_by: U`, `approved_by: U`. Nenhum branch compara U com o original.
4. Ciclo criar→postar→estornar→aprovar por U, com dois registros carimbados como aprovados.

Cenário jurídico: ver §1 (`contractController.ts:48-55` + `ApproveContractUseCase.ts:85-88`).

## ROOT_CAUSE_HYPOTHESIS

A segregação nasceu como resposta a **uma** pergunta pontual do dono (D-K, restrita à cadeia de
compras pela §5 do `PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md`). O módulo foi corretamente
posicionado em `shared/domain` **antecipando a expansão** (L12-18), mas a expansão nunca foi
decidida. Os módulos departamentais foram entregues em blocos sequenciais próprios, cada um com
sua noção de "quem aprova", sem que nenhum passo confrontasse a matriz de aprovação como um todo.
O resultado é o padrão previsto no próprio comentário — "um dos pontos ficaria para trás" — só que
em escala invertida: **o ponto que ficou à frente foi um só.**

## REFERENCE

`segregationOfDuties.ts` L1-66 (D-K e justificativa) · `PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md`
§4-§5 · `docs/governance/TODO.md:5271-5274` (**contradiz** a D-K) · LACUNA-3 ·
OWASP ASVS V4.1.3; A01 · ISO 9001 §8.5.6 · CLAUDE.md Regras 6, 16-17, 20.

## RECOMMENDATION — a decisão precede a implementação (Regra 6)

1. **[Dono]** Decidir o **escopo da política**: quais dos 24 pontos exigem aprovador ≠
   solicitante, quais são dispensados e por quê. Registrar como decisão datada, no formato de D-K.
2. **[Dono]** Resolver a contradição pré-existente da própria D-K (`TODO.md:5271-5274` ×
   `PLANO_ACAO`), que hoje impede derivar a intenção por analogia.
3. **[SanaCore]** Só após (1): aplicar `assertApproverIsNotRequester` nos pontos decididos,
   reutilizando o módulo e adicionando identificador por ponto em `SEGREGATION_RULES`.
4. **[SanaCore]** Para BOM e MPS, a remediação exige mudança de contrato antes:
   `ApproveBOMUseCase` precisa receber identidade; a BOM precisa nascer `draft` e ganhar rota de
   aprovação; o MPS precisa registrar criador.
5. **[Dono]** Contrapartida organizacional já apontada pelo módulo (L44-50): **cadastrar um
   segundo usuário aprovador**. Sem isso, ampliar a regra **trava a operação** — hoje há 1 único
   usuário real.
6. **[SanaCore]** `ApproveInventoryCountUseCase` é caso de dupla remediação: segregação **e**
   tolerância de variância (hoje inexistente).

## RETEST_SPECIFICATION

Um teste por ponto decidido em (1), provando que **solicitante = aprovador é rejeitado**, mais o
par positivo.

**(R0) Não-regressão** — `purchase-segregation-of-duties.test.ts` verde para os 4 pontos D-K,
incluindo `role='admin'` **não** isento.
**(R1) Contrato jurídico** — (a) U cria contrato; U `admin` tenta aprovar com `role='diretor'` →
**rejeitado**, nenhuma linha em `jur_contract_approvals`; (b) o mesmo U tenta a segunda aprovação
em outro papel → **rejeitado**; (c) V ≠ U aprova → sucesso; (d) alçada dupla só com **duas
pessoas**.
**(R2) Acesso (TI)** — (a) gestor G cria e tenta aprovar → **rejeitado**, `status` permanece
`pending`; (b) admin A cria e tenta aprovar → **rejeitado** (admin não isento); (c) E ≠
solicitante → sucesso; (d) idem para `/reject`.
**(R3) Contagem** — (a) C com `assigned_to = C` (ou `counted_by = C`) tenta aprovar → **rejeitado**,
**nenhum `InventoryMovement` criado**, `Product.quantity` + `ProductWarehouseStock` inalterados;
(b) A ≠ C → sucesso; (c) [se decidido] variância acima da tolerância exige alçada superior.
**(R4) Postagem contábil** — (a) U = `created_by` tenta postar → **rejeitado**, `status` permanece
`draft`, `approved_by` permanece `NULL`; (b) U ≠ `created_by` → sucesso.
**(R5) Estorno** — (a) U que consta como `created_by` **ou** `approved_by` do original tenta
estornar → **rejeitado**, original permanece `posted`, nenhum estorno criado; (b) V distinto →
sucesso; (c) **teste de cadeia**: prova que nenhum usuário único percorre
criar→postar→estornar→aprovar.
**(R6) BOM** — (a) criação com `status='draft'` (não `active`) e `approved_by = NULL`; (b) existe
rota `POST /api/boms/:id/approve` recebendo identidade do JWT; (c) `created_by` tentando aprovar →
**rejeitado**; (d) aprovador distinto → sucesso, `approved_by`/`approval_date` preenchidos,
`activateExclusively` rebaixa a vigente; (e) BOM `draft` **não** é selecionada por
`findOne({ product_id, status:'active' })` na explosão/reserva/custeio.
**(R7-Rn)** — mesmo par (a)/(b) para: transferência, liberação/bloqueio de lote (vs. inspetor),
release/obsolete de desenho (vs. autor), ativação de roteiro, material e budget-decision de
marketing, override de odômetro, decisão/encerramento de incidente LGPD, adjudicação de RFQ, MPS
firm/release.
**(RX) Prova de cobertura estrutural** — teste de guarda que **falha** quando um novo ponto de
aprovação é introduzido sem constar da matriz decidida (padrão já usado no repositório para
organograma e docs-drift). **Sem isso, o achado reincide na próxima rodada** — exatamente o modo
de falha que `segregationOfDuties.ts` L12-18 descreve.
**(RZ) Ambiental** — existir mais de um usuário com nível `approve` em cada módulo onde a
segregação for imposta; caso contrário o fluxo fica comprovadamente travado (L44-50).
**(RF)** Suíte completa verde no commit de remediação.

## LACUNAS DECLARADAS (Regra 19)

1. **Prova dinâmica não executada.** Modo read-only reforçado: sem Bash, sem banco, sem HTTP. Toda
   a evidência é **estática**, por leitura determinística de arquivo+linha. Os cenários de
   REPRODUCTION são derivados do fluxo de controle lido, não observados em execução. A prova
   dinâmica é recomendada ao `vericore-audit-verification-runner` no reteste.
2. **Baseline não verificada localmente.** A correspondência tag → commit foi recebida como
   entrada e **não pôde ser confirmada** (`git` exige Bash). Os arquivos foram lidos do working
   tree — o que significa que **as leituras podem não corresponder ao commit de baseline**. Delta
   a confirmar antes da consolidação. *(Nota do orquestrador: o HEAD verificado nesta sessão é
   `1979beb`, e a tag `legacy-baseline-001` aponta para `c9359be` — o agente reportou `65bd66d`
   por contexto injetado desatualizado, mesma classe de achado de calibração já registrada em
   `LEGACY_SYSTEM_INVENTORY.md`. Nenhum arquivo do ERP mudou entre os dois pontos, conforme
   verificação do passo 23.)*
3. **Cobertura da tabela: alta, não exaustiva.** Partiu de grep por
   `approve|approval|/release|/firm|budget-decision` em `**/routes/*.ts`, Glob por `*Approve*.ts`
   e grep por `approved_by|approverId` em `server/src/modules` (41 arquivos). Módulos declarados
   como **não amostrados** pelo discovery (`reports`, `dashboard`, `intelligentAuditor`) não foram
   varridos. Pontos em `budget`, `treasury`, `sst`, `maintenance` e `serviceOrders` foram tocados
   apenas pelo grep de rotas — classificação **UNKNOWN**, não incluídos para não inventar linha.
4. **Matriz de autorização esperada inexistente.** Não há `AUTHORIZATION_MATRIX` documentada que
   declare, por RESOURCE×ACTION, a exigência de segregação. **A ausência é finding, não premissa**
   — e é precisamente o conteúdo deste FIND-ERP-009.
5. **Controles compensatórios buscados.** Antes de afirmar ausência: (a) middleware global — grep
   retornou apenas os 4 call sites + o módulo; (b) guarda no cliente — **zero** ocorrências em
   `client/`; (c) checagem inline — leitura integral das funções `execute` de 12 use cases de
   aprovação: nenhuma comparação de identidade. **Encontrados 3 compensatórios PARCIAIS,
   registrados na tabela e insuficientes:** gate G7 (ato, não pessoa); duplo gate no release de
   desenho (quem, não identidade); herança de D-K a jusante da RFQ (mitiga só a requisição
   gerada). Nenhum refuta o achado.

## PRÓXIMOS PASSOS DE PROCESSO

- SEVERITY HIGH → submeter ao **vericore-finding-validator** antes da consolidação.
- Persistir evidência via **vericore-audit-evidence-controller** em `audit/`.
- Interseção com **tenant-isolation-auditor**: não aplicável — o ERP é single-tenant.
- Interseção com **frontend-auditor**: recomendada verificação de que a UI não exibe botão de
  aprovar para o próprio solicitante nos pontos que vierem a ser decididos — observando que hoje
  **nenhuma** imposição existe no cliente (nem deve: a imposição é e continua sendo do backend).

---

*Produzido pelo agente `vericore-authorization-auditor` em modo read-only reforçado; conteúdo
persistido pelo orquestrador (hook bloqueia escrita VeriCore fora de `audit/`), sem edição de
conteúdo além da nota de correção da lacuna 2 e da aritmética do placar.*

---

## Validação (finding-validator)

**VEREDITO: CONFIRMED — SEVERITY HIGH mantida, CONFIDENCE CONFIRMED mantida.** Enquadramento
("lacuna de política de controle interno, remediação precedida de decisão do dono, Regra 6")
julgado **honesto e correto**, e reforçado por evidência que o próprio finding não usou.

(a) AMOSTRAGEM DE 5 LINHAS "N" — leitura integral, sem confiar na citação:
- `PostEntryUseCase.ts` (95 linhas): `entry.created_by` **não é lido em nenhum ponto**. N confirmado.
- `ReverseEntryUseCase.ts` (93 linhas): `original.created_by`/`approved_by` **nunca lidos**. N.
- `ApproveInventoryCountUseCase.ts:50-125`: `approverId` nunca comparado com `assigned_to`/
  `counted_by`; ajuste sem tolerância. N.
- `ApproveAccessRequestUseCase.ts:29-42`: `request.requested_by` **não é lido**. N.
- `ApproveWarehouseTransferUseCase.ts:43-91`: `approverId` nunca comparado com `requested_by`. N.
Bônus `ReleaseDrawingUseCase.ts:27-46`: N confirmado.

(b) CAÇA A FALSO POSITIVO: grep dirigido por comparações de identidade em `server/src` — **os
únicos pontos que comparam identidade são os 4 call sites de D-K.** Os outros (`authorizeSelfOrModule`,
`ticket.requester_id === req.user.id`) são checagens de **posse** (concedem quando coincidem, o
inverso da segregação). **Nenhuma linha "N" tem segregação escondida.** Os 3 compensatórios
parciais declarados são de fato parciais (G7 nem recebe `releasedBy`; duplo gate de desenho aponta
para autoaprovação hoje, não contra; herança de D-K cobre o pedido, não o ato de adjudicar).

(c) HONESTIDADE DO ENQUADRAMENTO: D-K existe e é datada
(`PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md:210-223`); `TODO.md:5271-5274` confere verbatim (drift
real). **Evidência mais forte, ausente do finding:** `TODO.md:6386-6395`, dentro da própria
entrega de D-K, enumera as aprovações fora de compras **"deliberadamente não tocadas (escopo é a
cadeia de suprimentos)"** e encerra com "Se o dono quiser a mesma regra nesses pontos, a função já
serve" — item aberto. Isso é **deferimento explícito de escopo por quem implementou, não decisão
do dono dispensando o controle**, e é a evidência mais direta a favor do enquadramento.

CORREÇÕES OBRIGATÓRIAS:
1. **Aritmética do placar:** S=4, N=**21**, N/A=**3** (não 4·20·4). Já corrigido no corpo; propaga
   para o TITLE ("20"→"21") e RECOMMENDATION ("24 pontos"→25).
2. Terminologia da linha 19: o artefato gerado pela RFQ é **pedido de compra**, não "requisição".
3. Incluir na LACUNA 5 o **4º compensatório parcial** não declarado: `accounting.ts:41-44` exige
   `contabilidade:approve` para post/reverse (mitigação de privilégio, não de identidade — cai
   diante de `'approve' ⊇ 'operate'` e do curto-circuito de `admin`).
4. Rebaixar a frase "impossível derivar por analogia a intenção para os demais módulos" →
   "drift documental não corrigido em `TODO.md:5271-5274`" (o conteúdo de D-K é resolvível por
   data e reversão explícita de D-C; o que é indeterminável é o **escopo**, não o conteúdo).
5. Corrigir `RELATED_TEST`/afirmação de que não há teste de `ApproveContractUseCase` — o teste
   existe (também vale para FIND-ERP-005).

JUSTIFICATIVA: a tese central ("N pontos de aprovação sem imposição **e** sem decisão registrada
de dispensa") é verificável por dois fatos independentes reproduzidos: (i) o mecanismo tem 4 call
sites de produção, todos em compras, zero em `client/`; (ii) nos pontos amostrados o campo do
solicitante existe no modelo e nunca é lido no caminho de aprovação — ausência de branch,
demonstrável por leitura. A busca por refutação foi mais longe que o finding e só encontrou o
padrão inverso (posse). HIGH (não CRITICAL) é adequado: módulos NÃO-PRODUÇÃO, remediação depende
de decisão do dono (Regra 6), e o próprio repositório registra a omissão como deferimento
consciente de escopo. Os defeitos encontrados são de precisão editorial e não tocam a conclusão.

*Validação produzida pelo `vericore-finding-validator`; seção anexada pelo orquestrador.*
