# TRIAGE — ERP-LEGACY-001-CASE-002 (FIND-ERP-005)

CASE_ID: ERP-LEGACY-001-CASE-002
FINDING_ID: FIND-ERP-005
PROJECT_ID: ERP-LEGACY-001
FASE: TRIAGEM (SanaCore) — nenhuma linha de `server/src`, teste ou migration foi alterada
AUTORIZAÇÃO: APR-2026-020 Decisão B (prioridade 1, CRITICAL)
AUDIT_COMMIT do finding: `c9359be399c45191fe90e8e9707803125a5ba91d` (tag `legacy-baseline-001`)
HEAD reconfirmado: `de4dac1213dbf74c3dcbab1788d612650228fd65`
DESTINO: `sanacore-remediation-engineer`, worktree/branch `sana/ERP-LEGACY-001/FIND-ERP-005`

---

## 0. Método e lacuna declarada

**Reprodução ESTÁTICA determinística.** Cada âncora foi relida no HEAD atual (não no
AUDIT_COMMIT, não em contexto herdado). Para cada falha, a cadeia
rota → middleware → controller → use case → repositório → constraint de banco foi lida
integralmente e nenhum branch intermediário reintroduz o controle ausente. Não resta
ambiguidade de fluxo em nenhuma das 4 cadeias.

**Reprodução DINÂMICA: não executada. Lacuna declarada (L-T1).** A infraestrutura não
estava disponível nesta sessão: `psql` ausente do PATH e o daemon Docker não responde
(`docker ps` sem retorno em 120 s), logo o banco efêmero `erp_evok_audio_test` e a API em
`127.0.0.1:3001` (exigida por `server/tests/helpers/testApi.ts`) não puderam ser levantados.
Nenhuma tentativa foi feita contra o banco real (linha vermelha APR-2026-016 respeitada;
nenhuma conexão de banco foi aberta em toda a triagem).

Consequência: idêntica à do próprio finding — a prova empírica pertence ao reteste
R1-R6, executado pelo `vericore-audit-verification-runner` contra o REMEDIATION_COMMIT.
A triagem **não** depende dela: as 3 perguntas em aberto são de *decisão*, não de
*evidência*, e nenhuma resposta empírica as resolveria. O plano das Falhas 2 e 4 é
executável como está.

---

## 1. Reconfirmação das 4 falhas no HEAD (`de4dac1`)

**Verificação de drift:** `git diff c9359be..HEAD -- server/src` toca 8 arquivos, todos em
`inventory`/`products`/`purchases`/`services` (mirror item↔produto, recebimento de
imobilizado). **Zero arquivos do módulo `juridico`, zero em `middlewares/`, zero em
`shared/domain/`.** As linhas do finding continuam válidas número a número — e foram,
ainda assim, relidas uma a uma.

| # | Falha | Âncora no HEAD | Verdito |
|---|---|---|---|
| 1 | Thresholds hard-coded × contrato de API | `juridico/domain/constants.ts:23,26` (`50000`/`300000`), única fonte em `requiredApproverRoles` (`:38-47`) | **CONFIRMADA, sem divergência** |
| 2 | Aprovação por PRESENÇA de módulo, não por NÍVEL | `juridico.ts:71` sem `requiredLevel` → `authorizeAnyModule.ts:82` default `'operate'` → `satisfies` `:39-43` → `contractController.ts:52-53` truthiness | **CONFIRMADA, sem divergência** |
| 3 | Aditivo eleva valor sem reabrir alçada | `CreateContractAddendumUseCase.ts:61` (`if (input.new_value !== undefined && input.new_value !== null) contractUpdates.value = input.new_value`) + `:63` `update` | **CONFIRMADA, sem divergência** |
| 4 | `admin` autoaprova os dois lados | `contractController.ts:50` (`if (user?.role === 'admin') return ['diretor','financeiro']`) + `ApproveContractUseCase.ts:85-88` (dedup por PAPEL) | **CONFIRMADA, sem divergência** |
| — | Agravante: gate fail-open | `ActivateContractUseCase.ts:39,41` (`approvalRepository?`) + `:63` (`&& this.approvalRepository`) | **CONFIRMADO, sem divergência** |

### Detalhamento verificado nesta triagem

**Falha 2 — cadeia completa, cada elo lido no HEAD:**
1. `juridico.ts:71` monta `POST /contracts/:id/approve` **antes** do gate geral da linha 83
   (`authorizeModule('juridico','operate')`), com
   `authorizeAnyModule([{moduleKey:'diretor'},{moduleKey:'financeiro'}])` — sem `requiredLevel`.
2. `authorizeAnyModule.ts:82` — `candidates.some(({ moduleKey, requiredLevel = 'operate' }) => ...)`.
   O default é aplicado no destructuring; não há override.
3. `authorizeAnyModule.ts:39-43` — `satisfies('operate','operate')` retorna `true`
   (`return level === 'operate' || level === 'approve'`).
4. `contractController.ts:52-53` — `if (user?.permissions?.diretor) roles.push('diretor')`.
   Truthiness pura: **qualquer** string não-vazia satisfaz, inclusive `'operate'`.
5. `ApproveContractUseCase.ts:61-95` — nunca consulta nível; recebe `availableRoles` pronto.
6. `diretor` **é** módulo atribuível real e rotulado `'Diretoria (aprovador de alçada,
   RF-JUR-003)'` (`accessModules.ts:342`); `AccessModuleLevel = 'operate' | 'approve'`
   (`:248`) — `'operate'` é o nível mais baixo existente e explicitamente não é `approve`.

**Ponto novo, não registrado no finding:** as *outras* rotas sensíveis do próprio
`juridico.ts` usam `authorizeModule('juridico','approve')` explicitamente
(`:115` close, `:132` revoke, `:166` reject, `:172-173` LGPD). A rota de **alçada
financeira** — a mais sensível do módulo — é a única ação de aprovação do módulo que
não exige `approve`. Isso reforça a partição do finding: a Falha 2 é incoerência
interna do próprio módulo, não decisão de desenho pendente.

**Falha 3 — a linha 61 foi relida caractere a caractere:** não há nenhuma referência a
`input.change_type` na construção de `contractUpdates` (`:59-64`). A validação de
`:36-41` é unidirecional (`change_type='value'` **exige** `new_value`; nada impede
`change_type='term'` de **carregar** `new_value`). Confirmado também que o use case
importa apenas `ContractTypes` (`:10-13`) — `requiredApproverRoles` não é importado nem
chamado; nenhuma aprovação é invalidada; o status do contrato não é tocado.

**Reforço do validator, reverificado aqui:** `UpdateContractUseCase.ts:14,29-42` —
`LOCKED_STATUSES` inclui `'active'` e só `responsible_user_id`/`alert_advance_days` são
editáveis; alterar `value` em contrato `active` via `PUT` lança `BR-JUR-007`. **A Falha 3
não é ausência de controle: é contorno de um controle que o próprio módulo implementa na
rota vizinha.** Isso fixa o comportamento-alvo: qualquer que seja a decisão (b), o
aditivo não pode ser mais permissivo que o `PUT`.

**Falha 4 — o banco institucionaliza a falha (reverificado na migration):**
`server/migrations/20260808-000002-create-jur-contract-approvals.cjs:40-44` cria
`uq_jur_contract_approvals_contract_role` sobre `['contract_id','approver_role']`.
Não há unicidade nem checagem por `approver_user_id`. **Não existe coluna
`approved_value`** na tabela (colunas: `contract_id`, `approver_user_id`, `approver_role`,
`approved_at`, `created_at`, `updated_at`) — fato que condiciona o desenho da Falha 3
(ver §7.2).

**Falha 4 — a origem do papel é server-side:** `middlewares/auth.ts` (`authenticate`)
recarrega `permissions` do banco a **cada request** (`User.findByPk` + `AccessProfile` +
`AccessProfilePermission`, montando o mapa em `:104-110`); o JWT carrega apenas
`{ id, passwordVersion }`. `req.user.role` idem, vem da linha do usuário. Nem `role` nem
`permissions` vêm do cliente — ver §5 (Regra 24).

---

## 2. Causa-raiz (demonstrada, não hipótese)

A causa-raiz é **uma só, com quatro superfícies**:

> **O controle de alçada do Jurídico foi implementado como “registro de um ato de
> aprovação”, não como “invariante do contrato”.** O sistema pergunta *“existe uma linha
> em `jur_contract_approvals` com este papel?”* em vez de *“este valor está coberto por
> aprovações válidas, dadas por pessoas distintas com poder de aprovar?”*.

Cada falha é uma dimensão que a pergunta implementada não cobre:

| Dimensão da invariante | Pergunta correta | O que o código pergunta | Falha |
|---|---|---|---|
| **Parâmetro** (qual é o limiar?) | qual alçada vigia agora, para este tipo de contrato? | dois literais de código | 1 |
| **Poder** (quem pode aprovar?) | esta pessoa tem nível `approve`? | esta pessoa tem o módulo? | 2 |
| **Vínculo** (aprovou o quê?) | a aprovação cobre o valor **atual**? | existe a linha, para qualquer valor | 3 |
| **Identidade** (aprovou quem?) | são duas pessoas? | são dois papéis | 4 |

Evidência de que é uma causa e não quatro coincidências: as quatro dimensões são
exatamente as quatro que o repositório **já sabe** tratar em outro lugar — `approve` nas
demais rotas do próprio `juridico.ts`, `segregationOfDuties.ts` (identidade, D-K,
2026-08-10) e `UpdateContractUseCase` (vínculo valor↔estado). A entrega de 2026-08-08
(`juridico.ts:12-16`, `constants.ts:2-7`) fechou a pendência pelo caminho feliz — registrar
e conferir — e a única dimensão tratada foi a do parâmetro, com a decisão consciente de
divergir do contrato de API (comentário em `constants.ts:5-7`) **sem atualizar o contrato**,
produzindo duas fontes autoritativas contraditórias (Regra 20 / Regra 21).

Correlato: nenhuma das 4 falhas é regressão. Todas nasceram com a funcionalidade.

---

## 3. Blast radius

### 3.1 `authorizeAnyModule` — middleware compartilhado (7 pontos de uso)

Grep exaustivo em `server/src` (excluindo o próprio middleware e comentários JSDoc):

| # | Call site | Método | Nível declarado | Efeito |
|---|---|---|---|---|
| 1 | `juridico/.../juridico.ts:71` | **POST** `/contracts/:id/approve` | **ausente → `operate`** | **escrita — o alvo da Falha 2** |
| 2 | `juridico/.../juridico.ts:79` | GET `/contracts/:id/approvals` | ausente → `operate` | leitura |
| 3 | `comex/.../importProcesses.ts:33` | GET `/:id/approvals` | ausente → `operate` | leitura |
| 4 | `purchases/.../purchases.ts:49` | GET `/:id/approvals` | ausente → `operate` | leitura |
| 5 | `facilities/.../facilities.ts:86` | GET `/maintenance-tickets` | ausente → `operate` | leitura |
| 6 | `facilities/.../facilities.ts:87` | GET `/maintenance-tickets/:id` | ausente → `operate` | leitura |
| 7 | `marketing/.../marketing.ts:56` | (rota MKT, RF-MKT-015) | **explícito `'operate'`** | leitura |

**Números que decidem o desenho:**
- **7** call sites; **1** é escrita/mutação de estado — precisamente `juridico.ts:71`.
- **6** são leitura; **1** desses já declara o nível explicitamente.
- **5** call sites dependem hoje do default implícito `'operate'` para funcionar.

**Conclusão de blast radius (determinante):** alterar o **default** de `authorizeAnyModule`
de `'operate'` para `'approve'` quebraria **5 rotas de leitura legítimas** em 4 módulos
(`juridico`, `comex`, `purchases`, `facilities`) — inclusive rotas de módulos de PRODUÇÃO.
**Não fazer isso.** Adicionar `requiredLevel: 'approve'` **no call site** `juridico.ts:71`
tem blast radius **exatamente 1 rota**, dentro de um módulo NÃO-PRODUÇÃO
(`PRODUCTION_STATUS_MAP.md:160`). A assinatura do middleware já suporta isso sem mudança
(`AnyModuleCandidate.requiredLevel?`, `:34-37`) e a semântica é a correta
(`satisfies('operate','approve') === false`, `:41`).

> **Instrução ao engineer:** a correção da Falha 2 **não deve tocar
> `server/src/middlewares/authorizeAnyModule.ts`.** Se algo lá parecer precisar de mudança,
> é sinal de desenho errado — reabrir com a triagem.

### 3.2 O padrão “presença de módulo = aprovação” fora do Jurídico

Cruzando com FIND-ERP-009 (28 pontos de aprovação mapeados) e com varredura própria de
todas as rotas `POST/PUT/PATCH` de aprovação/liberação em `server/src/modules/*/presentation/routes`:

Dos **~55 endpoints de ato aprovatório** encontrados, **51 declaram `'approve'`
explicitamente**. O padrão defeituoso (nível `operate` autorizando um ato de aprovação)
aparece em **4 linhas de rota / 3 pontos de aprovação distintos**, além do Jurídico:

| Ponto | Rota | Código | Situação |
|---|---|---|---|
| **Falha 2 (este caso)** | `POST /api/jur/contracts/:id/approve` | `juridico.ts:71` | `authorizeAnyModule` sem nível |
| Alçada de diretoria — Compras (G11) | `POST /api/purchases/:id/approve` | `purchases.ts:48` | `authorizeModule('diretor')` — default `'operate'` (`auth.ts:214`) |
| Alçada de diretoria — COMEX (G11-COMEX) | `POST /api/comex/import-processes/:id/approve` | `importProcesses.ts:34` | idem |
| MPS — firmar/liberar | `POST /api/master-production-plans/:id/{firm,release}` | `masterProductionPlans.ts:37-38` | `'operate'` **explícito** |

**Achado material desta triagem (novo, não coberto por FIND-ERP-005 nem por FIND-ERP-009):**
`purchaseController.ts:54` replica a **mesma truthiness**:
`return user?.permissions?.diretor ? ['diretor'] : []`. Ou seja, **a Falha 2 existe
identicamente na alçada de diretoria de Compras e de COMEX** — que são módulos de
PRODUÇÃO, não NÃO-PRODUÇÃO. Um `diretor:operate` registra a aprovação de alçada de um
pedido de compra e de um processo de importação.

- **Fora de escopo deste caso** (o REMEDIATION_CASE é FIND-ERP-005 / `juridico`). SanaCore
  não amplia escopo por conta própria.
- **Encaminhamento:** este parágrafo é o insumo para a CoreTriad/VeriCore abrirem finding
  próprio sobre `purchases`/`comex`. Registrado aqui, **não silenciado**. O MPS já está
  documentado como ausência assumida em FIND-ERP-009 §6 e não é novidade.
- **Implicação de desenho:** a correção do Jurídico deve ser feita de forma **copiável**
  para os outros dois pontos (mesma forma, mesmo código de erro), não de forma
  idiossincrática.

### 3.3 `requiredLevel: 'approve'` quebra fluxo legítimo atual?

**Não, com uma ressalva operacional que o dono precisa conhecer.**

- Nenhum teste versionado exercita `POST /contracts/:id/approve` por HTTP
  (`juridico-contract-use-cases.test.ts` instancia os use cases diretamente — por isso o
  finding diz, corretamente, que a suíte não detecta a falha).
- O módulo `juridico` é **NÃO-PRODUÇÃO** e não há contrato, aditivo ou aprovação real no
  banco (`PRODUCTION_STATUS_MAP.md:160`) — não há histórico legítimo a preservar.
- `role === 'admin'` continua curto-circuitando `authorizeAnyModule` (`:66-69`), então a
  conta que hoje opera o sistema **não perde acesso** à rota pela Falha 2 (ela perderá
  pela Falha 4, que é o efeito pretendido, e essa perda é a mesma já aceita em Compras
  desde D-K).
- **Ressalva:** perfis de acesso que hoje tenham `diretor: 'operate'` ou
  `financeiro: 'operate'` deixarão de conseguir aprovar. O engineer deve **levantar e
  reportar** (query read-only em `access_profile_permissions` no banco de teste, e
  solicitar ao dono a checagem no de produção) quantos perfis estão nessa condição, e
  incluir o número no REMEDIATION_REPORT. Se houver perfis assim, a contrapartida é
  organizacional (promover a `approve` quem de fato é aprovador) — exatamente o mesmo
  padrão de aviso que `segregationOfDuties.ts:45-50` já registrou para D-K.
- **Não quebra** `GET /contracts/:id/approvals` (`:79`): ela permanece `operate`, e é
  desejável que o aprovador consulte antes de decidir.

---

## 4. Agrupamento de findings

Este caso **não** absorve outros findings. Verificado:
- **FIND-ERP-009** compartilha uma das quatro dimensões (identidade/segregação, §1 da
  tabela dele lista o contrato jurídico como ponto #5, `N`). A correção da Falha 4 deste
  caso **fecha o ponto #5 de FIND-ERP-009**, mas não os outros 20 pontos `N`. São casos
  distintos com interseção de 1 ponto — registrar a interseção no REMEDIATION_REPORT para
  que a VeriCore não reteste duas vezes nem feche FIND-ERP-009 por engano.
- As 4 falhas deste finding têm causa-raiz comum (§2) e **permanecem num único caso**,
  como já estava.

---

## 5. Enquadramento na Regra 24 do CLAUDE.md

> *“Papel/role declarado pelo cliente sem verificação server-side é finding CRITICAL
> bloqueante para release — inclui `role`/`userRole`/`isAdmin`/`perfil` vindos de body,
> query, header ou payload de token não verificado. Nunca `RISK_ACCEPTED` em produção.”*

Avaliação vetor a vetor, com a evidência:

| Vetor | O papel vem do cliente? | Enquadra na Regra 24? |
|---|---|---|
| Falha 1 (thresholds) | Não há papel envolvido | **Não** |
| Falha 2 (`operate` aprova) | **Não.** `req.user.permissions` é recarregado do banco a cada request (`auth.ts`, `User.findByPk` + `AccessProfile` + `AccessProfilePermission`); o JWT carrega só `{id, passwordVersion}` e é verificado com `issuer`/`audience` | **Não** — é *nível insuficiente* server-side, não papel declarado pelo cliente |
| Falha 3 (aditivo) | Não há papel envolvido | **Não** |
| Falha 4 (`admin` dos dois lados) | **Não.** `user.role` vem da linha do usuário no banco; o `role` do body (`contractController.ts:166` → `desiredRole`) **só desambigua** e é validado contra `availableRoles` em `ApproveContractUseCase.ts:66-70` — nunca concede papel que o usuário não tenha | **Não** — é *ausência de segregação de identidade* |

**REGISTRO FORMAL: nenhum dos 4 vetores enquadra na Regra 24.** O `role` no body **foi**
verificado como não-concedente (`:67-69` rejeita papel fora de `availableRoles`), que é
exatamente o controle que a Regra 24 exige.

**Isto NÃO rebaixa a severidade.** A Regra 24 é *suficiente* para CRITICAL, não
*necessária*: a severidade CRITICAL de FIND-ERP-005 vem das Falhas 3 e 4 como bypasses
completos e independentes (decomposição do finding), mantida pelo finding-validator.
Consequência prática: `RISK_ACCEPTED` **não** está proibido pela Regra 24 aqui — está
proibido pelo veredito CONFIRMED/CRITICAL do finding-validator e pela APR-2026-020
Decisão B, que já determinou remediação. Registrado para que ninguém use a inaplicabilidade
da Regra 24 como argumento de rebaixamento.

---

## 6. PLANO EXECUTÁVEL — Falhas 2 e 4 (não dependem de decisão)

Ambas seguem imediatamente. **Não segurar por causa das perguntas do §8.**

### 6.1 Falha 2 — exigir nível `approve` (+ fechar o fail-open)

**F2-A — Nível na rota (1 linha, blast radius 1).**
`server/src/modules/juridico/presentation/routes/juridico.ts:71` — acrescentar
`requiredLevel: 'approve'` aos dois candidatos. **Não** tocar
`middlewares/authorizeAnyModule.ts` (§3.1). Atualizar o comentário `:66-70` e o cabeçalho
`:26-29`, citando `FIND-ERP-005`.
Resultado esperado: `diretor:operate` → 403 `MODULE_ACCESS_DENIED`, com `access_denied`
registrado em auditoria (`authorizeAnyModule.ts:91-101`, já existente) e **zero** linhas em
`jur_contract_approvals` → R2(a),(b).
`GET :79` permanece intocada.

**F2-B — Fim da truthiness (defesa em profundidade).**
`contractController.ts:51-54` — trocar `if (user?.permissions?.diretor)` por comparação
estrita `=== 'approve'`, para os dois papéis. Motivo: a rota é a primeira barreira, mas
`resolveAvailableApproverRoles` é quem *nomeia* o papel gravado; deixar truthiness ali
significa que qualquer futura rota que reutilize a função herda a falha. Cobre os vetores
adversariais de R2(e) (`'read'`, `''`, `0`, `'Approve'`, `'APPROVE'`, `' approve '`, `true`,
`['approve']`, `{}`, `null`) sem tratamento caso a caso — comparação estrita rejeita todos.
Manter `role === 'admin'` como concedente de papel nesta função (privilégio é concedível);
quem barra o `admin` é a Falha 4 (identidade), não esta.

**F2-C — Fail-closed no gate de alçada (agravante transversal → R5).**
`ActivateContractUseCase.ts` — tornar `approvalRepository` **obrigatório** no construtor
(`:39,41`) e remover `&& this.approvalRepository` de `:63`. Opção equivalente aceita por
R5(a): manter opcional mas lançar erro quando `requiredRoles.length > 0` e o repositório
faltar. **Preferência da triagem: obrigatório** — elimina a classe inteira em vez de tratar
um caso, e o único motivo declarado da opcionalidade é compatibilidade de teste unitário
(`:12-14`), o que se resolve ajustando as instanciações nos testes.
Impacto: `contractController.ts:143` já injeta (nenhuma mudança). Verificar e ajustar todas
as instanciações em `server/tests/unit/juridico-contract-use-cases.test.ts` — sem alterar as
asserções de `:174-227` (R6(c) exige não-regressão em `:174-333`).

**F2-D — Documentação.** `BLOCO_3_JUR_API.md` — registrar o nível `approve` para
`POST /contracts/:id/approve` (o endpoint hoje sequer figura na tabela §2, `:221-235`,
por ter nascido depois; **incluí-lo** com nível `approve`).

### 6.2 Falha 4 — segregação de identidade (D-K aplicado ao Jurídico)

**Reutilização de `shared/domain/segregationOfDuties.ts` — avaliação:** parcial e
assimétrica, e isto importa para o sequenciamento:

- `assertApproverIsNotRequester` (aprovador ≠ **criador**) resolve **R4(d)**, que é a parte
  **dependente da decisão (c)** do dono.
- **Nenhuma função existente resolve R4(a)** (aprovador ≠ **aprovador anterior**), que é a
  parte **independente de decisão** — “dupla aprovação que uma pessoa só satisfaz não é
  dupla aprovação” é exigência intrínseca, como o próprio finding registra em L3.
- `isSelfApproval` (`:112-119`) **é** reutilizável tal como está: comparação pura de dois
  ids, com `null`/`undefined` → `false`. Serve para os dois casos.

**F4-A — Bloquear o mesmo `approver_user_id` em papéis diferentes do mesmo contrato
(independe de decisão).**
Em `ApproveContractUseCase.execute`, **antes** de `create` (`:90`) e depois do dedup por
papel (`:85-88`): carregar `listByContract(input.contractId)` (método já existe no
repositório — usado por `ActivateContractUseCase.ts:64`; **nenhum método novo de
repositório é necessário**) e rejeitar se alguma aprovação existente tiver
`approver_user_id === input.approverUserId`.
Implementar como função nova em `shared/domain/segregationOfDuties.ts`, ex.
`assertApproverIsNotPriorApprover(...)`, reaproveitando `isSelfApproval` e o mesmo formato
de `BusinessRuleError` prescritivo (`:137-148`), com nova entrada em `SEGREGATION_RULES`
(ex. `JUR_CONTRACT_AUTHORITY: 'D-K-JURIDICO'`).
Justificativa de morar em `shared/domain` e não no módulo: é o argumento literal do
cabeçalho do próprio arquivo (`:12-18`) — “uma cópia por módulo garantiria que, na próxima
rodada, um dos pontos ficasse para trás”. E §3.2 mostra que há outros pontos.
`role === 'admin'` **não** isenta (`:30-43`, decisão já registrada).
Resultado: R4(a) (rejeitado, exatamente 1 linha), R4(b) (duas pessoas distintas → ambas
registradas), **R4(c)** (dois `admin` **diferentes** → permitido — a rejeição é por
identidade, não por papel nem por `role`; o desenho satisfaz isso naturalmente porque
compara ids).

**F4-B — `created_by` ≠ aprovador: NÃO implementar agora.** Depende da decisão (c) — ver
§8.3. Fica desenhado, não executado.

**F4-C — Defesa no banco (recomendada, opcional).** Migration adicionando índice único
parcial ou constraint `unique (contract_id, approver_user_id)` — hoje o banco só tem
`uq_jur_contract_approvals_contract_role` (§1), que institucionaliza a falha. Torna F4-A
inviolável mesmo por caminho que não passe pelo use case.
**Decisão de triagem:** incluir, **mas** apenas se não exigir backfill (o módulo é
NÃO-PRODUÇÃO e a tabela está vazia — o engineer deve confirmar `count(*) = 0` em
`jur_contract_approvals` no banco de teste antes de aplicar; se houver linhas, reportar em
vez de migrar).

---

## 7. PLANO CONDICIONAL — Falhas 1 e 3 (bloqueadas por decisão)

Desenho por ramo, com custo, para o dono decidir vendo o preço. **A triagem não decide
(Regra 6).**

### 7.1 Falha 1 — por ramo da decisão (a)

**Ramo A1 — tabela configurável `jur_approval_thresholds` (o que o contrato de API promete).**
Escopo: migration criando `jur_approval_thresholds` `{id, contract_type, min_value,
max_value, required_level, active, valid_from, created_by, created_at}`; model + repositório;
seed com os valores atuais (50.000 / 300.000) para `contract_type = '*'` (default),
preservando comportamento; `requiredApproverRoles` deixa de ser função pura de constantes e
passa a receber a configuração vigente (assíncrona, ou resolvida no use case e injetada —
**preferir injetar**, para não tornar o domínio dependente de I/O); endpoints
`GET`/`PUT /api/jur/settings/approval-thresholds` com nível `approve`; registro da alçada
vigente no momento da ativação (coluna nova em `jur_contracts` ou linha de histórico) para
R1(d).
Toca: 1 migration nova + 1 model + 1 repositório + `constants.ts` + `ActivateContractUseCase`
+ `ApproveContractUseCase` + `contractController` + `juridico.ts` (2 rotas novas) + doc.
Custo: **alto** (o maior dos dois ramos, de longe). Satisfaz R1(a)-(e) integralmente.
Consequência prática: alterar alçada sem deploy; diferenciação por tipo de contrato;
auditabilidade retroativa. **Requer** a validação do assessor jurídico que §2.7 declara
pendente (`[VERIFICAR COM ASSESSOR JURÍDICO DA EMPRESA]`).

**Ramo A2 — manter constantes em código e corrigir o contrato de API.**
Escopo: `BLOCO_3_JUR_API.md` §2.7 reescrito para descrever o mecanismo real (constantes,
sem `contract_type`, alteração exige deploy), removendo a frase *“Nenhum valor de alçada é
hard-coded”* e a promessa dos dois endpoints; decisão registrada em `APPROVALS.md` com ID.
Toca: **1 arquivo de documentação + 1 registro de aprovação. Zero código.**
Custo: **baixo.** Satisfaz R1(e) por sua segunda via, explicitamente prevista no reteste
(*“ou, se a decisão for manter constantes, o §2.7 é corrigido e a decisão registrada”*).
Consequência prática aceita: alterar alçada exige deploy; **sem** diferenciação por tipo de
contrato; R1(b),(c),(d) tornam-se fora de escopo por decisão registrada — o que exige que a
VeriCore seja informada, pois R1(a) como escrito (“nenhum limiar permanece como literal”)
**reprovaria** este ramo. **Nota obrigatória ao dono:** escolher A2 implica pedir à VeriCore
o ajuste correspondente de R1, com o registro da decisão — não é omissão silenciosa.

**Ramo A3 — híbrido (constantes agora + tabela na próxima rodada).** Só é aceitável se a
decisão registrar prazo e ID de tarefa; caso contrário é A2 sem o registro. A triagem
**desaconselha** apresentá-lo como opção separada: na prática é A2 + um TODO, e a Regra 17
exige o registro de qualquer forma.

### 7.2 Falha 3 — por ramo das decisões (b) e (c)

**Parte invariante (vale em qualquer ramo — o núcleo da Falha 3, CRITICAL isolada):**

**F3-A — condicionar a alteração de valor ao `change_type`.**
`CreateContractAddendumUseCase.ts:61` — só aplicar `contractUpdates.value` quando
`input.change_type === 'value'`; caso contrário, rejeitar `new_value` com erro explícito
(preferível a ignorar em silêncio, que esconderia a intenção do usuário). Fecha a variante
cruzada `change_type='term'` + `new_value` → **R3(b)**.

**F3-B — reabrir a alçada quando o valor sobe de faixa.**
Ainda em `CreateContractAddendumUseCase`, importar `requiredApproverRoles` (hoje ausente,
`:10-13`) e, quando o valor muda: comparar `requiredApproverRoles(previous_value)` com
`requiredApproverRoles(new_value)`. Se a faixa exigir papéis não cobertos pelas aprovações
válidas, **invalidar as aprovações incompatíveis e retornar o contrato a `in_approval`**,
na **mesma transação** do `addAddendum` + `update` (hoje `:45-64` são duas escritas sem
transação explícita — o engineer deve verificar se `repository.addAddendum`/`update`
compartilham transação; se não, envolver).
Fecha **R3(a)** e **R3(c)**. Aditivo que não altera valor segue funcionando → **R3(e)**.

**Alternativa a F3-B, mais simples e mais restritiva:** proibir aditivo que eleve o valor
para faixa superior enquanto o contrato estiver `active`, exigindo o fluxo
`approve` → `activate` explicitamente (alinha o aditivo ao `PUT`, que já bloqueia —
`UpdateContractUseCase.ts:14`). Custo menor, porém muda o fluxo de negócio (aditivo passa a
ter passo extra). **É desenho, não decisão de negócio nova?** A triagem entende que **é**
decisão de negócio, e por isso está aqui e não no §6. Se o dono escolher a alternativa, ela
absorve F3-B.

**Observação de desenho relevante às duas opções:** `jur_contract_approvals` **não tem
coluna de valor** (§1). Vincular aprovação↔valor exige acrescentar `approved_value`
(migration) **ou** invalidar por deleção/flag. Recomendação técnica da triagem (não é
decisão de negócio): acrescentar `approved_value` — preserva histórico, sustenta R3(c)
verificável por leitura da tabela e sustenta R1(d) se o ramo A1 for escolhido.

**Parte dependente da decisão (b) — nível do endpoint de aditivo:**
- **Ramo B1 — `approve` (segue `BLOCO_3_JUR_API.md:214`):** mover
  `POST /contracts/:id/addendums` de trás do gate geral `operate` (`juridico.ts:83,96`)
  para uma linha própria com `authorizeModule('juridico','approve')` — ou, mais fino,
  exigir `approve` **apenas quando** o corpo traz `new_value` (checagem no controller,
  seguindo o padrão já existente de `hasApprove(req)`, `contractController.ts:37-40`,
  usado por `activate`). Custo: baixo. Consequência: aditivo de prazo puro continua
  `operate`; quem mexe em dinheiro precisa de nível de gestor.
- **Ramo B2 — `operate` (segue a tabela `:233`):** manter o nível atual; a proteção passa a
  ser inteiramente F3-A + F3-B (reabertura de alçada). Custo: zero adicional.
  Consequência: um `juridico:operate` continua podendo elevar o valor, mas o contrato
  **sai** de `active` e volta a exigir aprovação — o dinheiro não passa sem diretor.
- **Em qualquer ramo:** `BLOCO_3_JUR_API.md` deve ficar com **uma única versão** (:214 e
  :233 hoje se contradizem) → **R3(d)**.

**Parte dependente da decisão (c) — D-K sobre `created_by`:** ver §8.3; afeta R4(d), não a
Falha 3 diretamente.

---

## 8. AS 3 PERGUNTAS AO DONO (formuladas, NÃO decididas)

> Pré-requisito de forma (Regra 17/18): cada resposta precisa virar registro explícito em
> `APPROVALS.md` com ID `APR-...`. Nenhuma pode ser inferida, nem por memória, nem por
> este documento. Enquanto não houver registro, as Falhas 1 e 3 ficam paradas — e as
> Falhas 2 e 4 **não** ficam.

### 8.1 Pergunta (a) — de onde vem o valor da alçada?

**Contexto.** Hoje os limiares de aprovação de contrato (R$ 50.000 para exigir diretor,
R$ 300.000 para exigir diretor + financeiro) são dois números escritos dentro do código
(`constants.ts:23,26`). O documento que define o contrato da API do Jurídico
(`BLOCO_3_JUR_API.md` §2.7) afirma o **oposto**: que existe uma tabela de configuração
`jur_approval_thresholds`, com limiares **por tipo de contrato**, e que *“nenhum valor de
alçada é hard-coded”*. Essa tabela nunca foi criada (zero ocorrências em `server/src`, zero
migrations). Existem, portanto, dois documentos oficiais em contradição, e é preciso dizer
qual é a verdade.

**Opções e consequência prática:**

| Opção | O que muda | Custo | Consequência que você sente |
|---|---|---|---|
| **A1 — criar a tabela configurável** | tabela + 2 endpoints + registro da alçada vigente por contrato | **Alto** (migration, model, repositório, 2 rotas, 4 arquivos de código) | Você altera a alçada pela tela, sem deploy; pode ter limiar diferente por tipo de contrato (fornecedor ≠ trabalhista); dá para auditar sob qual regra um contrato antigo foi ativado |
| **A2 — manter os números no código e corrigir o documento** | só documentação + registro da decisão | **Baixo** (1 arquivo de doc, zero código) | Mudar a alçada passa a exigir uma nova versão do sistema; todo tipo de contrato usa o mesmo limiar; não fica registro histórico de qual limiar vigia em cada data |

**Pergunta adicional embutida (não a esqueça):** os valores 50.000 e 300.000 nunca foram
validados por autoridade jurídica — o próprio §2.7 está marcado
`[VERIFICAR COM ASSESSOR JURÍDICO DA EMPRESA]`. **Esses dois valores estão corretos?**
Isso vale para os dois ramos.

### 8.2 Pergunta (b) — aditivo que aumenta o valor: quem pode assinar?

**Contexto.** Um aditivo (`POST /contracts/:id/addendums`) pode elevar o valor de um
contrato já ativo. Hoje qualquer pessoa com o nível básico do Jurídico (`operate`) faz
isso. O mesmo documento de contrato de API diz, em um lugar (:214), que assinatura de
aditivo que altera valor exige nível `approve` (gestor) e, em outro (:233), que basta
`operate`. **O documento contradiz a si mesmo** e o código seguiu a versão mais permissiva.
Independentemente da resposta, a triagem já vai fechar o buraco maior: o aditivo que sobe
de faixa passará a **reabrir a aprovação** (o contrato sai de “ativo” e volta a exigir
diretor). A pergunta é se, **além disso**, assinar o aditivo deve exigir nível de gestor.

**Opções e consequência prática:**

| Opção | Consequência que você sente |
|---|---|
| **B1 — exigir `approve`** | Só quem é gestor do Jurídico assina aditivo que mexe em dinheiro. Aditivo só de prazo continua liberado ao time. Mais atrito no dia a dia, mais controle. |
| **B2 — manter `operate`** | O time do Jurídico continua assinando aditivos normalmente; a proteção fica toda na reabertura de aprovação — o valor sobe, mas o contrato deixa de valer até um diretor aprovar de novo. Menos atrito, controle concentrado num único mecanismo. |

### 8.3 Pergunta (c) — quem cria o contrato pode aprová-lo?

**Contexto.** Em 2026-08-10 você decidiu, para Compras (decisão **D-K**), que “quem aprova
não é quem pediu”, e que **nem o `admin` é exceção**, porque identidade não é concedível.
Essa regra foi implementada em `shared/domain/segregationOfDuties.ts` e aplicada a 4 pontos
de compras/importação — **nunca ao Jurídico**. Independentemente da sua resposta, a triagem
já vai impedir que **a mesma pessoa registre as duas aprovações** (diretor e financeiro) do
mesmo contrato — isso não é escolha, é o significado de “dupla aprovação”. A pergunta é se
a regra vai **um passo além**: quem **cadastrou** o contrato também fica proibido de
aprová-lo.

**Opções e consequência prática:**

| Opção | Consequência que você sente |
|---|---|
| **C1 — sim, estender D-K ao Jurídico** | Coerência total com Compras. Mas: hoje o ambiente tem praticamente **um único usuário real (`admin`)**; se ele cadastra o contrato, **ninguém** poderá aprová-lo até existir um segundo aprovador cadastrado. É o mesmo efeito já aceito em Compras — a contrapartida é organizacional, não técnica. |
| **C2 — não estender por ora** | O Jurídico continua operável por uma pessoa só no cadastro+aprovação (com a ressalva de que ela não consegue mais dar as *duas* aprovações). Fica registrado em `APPROVALS.md` que a extensão foi **avaliada e recusada**, com o motivo — não fica um buraco silencioso (o reteste R4(d) exige exatamente esse registro). |

---

## 9. Plano de testes de regressão (alvo: RETEST_SPECIFICATION R1-R6)

**Harness identificado.** Os testes devem ser de **integração HTTP**, não unitários — R2 e
R4 são invisíveis a teste que instancie o use case diretamente (é a razão de a suíte atual
passar verde). Infraestrutura já existente e a ser reutilizada:
- `server/tests/helpers/testApi.ts` — `api()` (supertest contra `TEST_API_URL`, default
  `http://127.0.0.1:3001`), `authToken()`, `hasIntegrationPrerequisites()` e, crucialmente,
  **um segundo token de administrador distinto** (`ci-approver@evok.local`, provisionado por
  `scripts/run-api-suite.cjs` → `ensureFixtures`), criado justamente porque D-K exige duas
  pessoas. **É o que R4(b) e R4(c) precisam, e já existe.**
- Padrão de arquivo: `server/tests/integration/legacy-routes-rbac-regression.test.ts`
  (cria usuário com `role`/perfil, faz login real, valida 403) — modelo direto para R2.
- Banco: **exclusivamente** `erp_evok_audio_test` (`server/.env.test`, `DB_NAME`), com o
  guard de sufixo `_test`/`_ci` de `scripts/run-api-suite.cjs`. **Nunca** o banco real.

**Fixtures — armadilha herdada:** `jur_contracts.contract_number` é `varchar(20)`. Usar
identificadores curtos (ex.: `F5-${Date.now() % 1e6}`). A ativação exige ainda:
`responsible_user_id`, **≥ 2 signatários** `party_a`/`party_b`, **documento assinado**
anexado (`ActivateContractUseCase.ts:83-90`) e, para `employment`/`supplier`/`nda`, o
checklist completo (`:92-101`) — usar um `contract_type` **fora** dessa lista para não
arrastar o checklist para dentro dos testes de alçada.

Arquivo sugerido: `server/tests/integration/jur-contract-authority-find-erp-005.test.ts`,
com cada `describe` referenciando `FIND-ERP-005` e `RF-JUR-003` (exigência de R6(a)).

| Bloco do reteste | Casos a versionar | Depende de decisão? |
|---|---|---|
| **R2(a),(b)** | perfil com `diretor:'operate'` → `POST .../approve` = **403**; idem `financeiro:'operate'`; assertar **0 linhas** em `jur_contract_approvals` | Não |
| **R2(c)** | perfil `diretor:'approve'` → **201**, 1 linha gravada | Não |
| **R2(d)** | contrato R$ 200.000, só a tentativa negada → `POST .../activate` por `juridico:operate` **falha** com `rule: 'RF-JUR-003'`; status inalterado | Não |
| **R2(e)** | tabela de vetores adversariais (`'read'`, `''`, `0`, `'Approve'`, `'APPROVE'`, `' approve '`, `true`, `['approve']`, `{}`, `null`) — todos 403, todos sem registro. **Nota:** valores fora do enum não são inseríveis via perfil normal; o engineer deve exercitá-los por injeção direta em `access_profile_permissions` no banco de teste **ou** por teste unitário do `satisfies`/`resolveAvailableApproverRoles`, e declarar qual via usou | Não |
| **R4(a)** | `admin` A registra `diretor`, tenta `financeiro` no mesmo contrato → **rejeitado**; exatamente **1** linha | Não |
| **R4(b)** | A (`diretor:approve`) + B (`financeiro:approve`) → 2 linhas; ativação de R$ 5.000.000 permitida | Não |
| **R4(c)** | dois `admin` **distintos** (`authToken()` + o segundo token do helper) em papéis diferentes → **permitido** (prova que a rejeição é por identidade, não por `role`) | Não |
| **R5(b)** | unitário: instanciar `ActivateContractUseCase` sem `approvalRepository` e ativar contrato de R$ 5.000.000 → **erro** | Não |
| **R3(a),(b),(c),(e)** | aditivo `value` e aditivo **`term`+`new_value`** → mesmo resultado; aprovações antigas não valem para a faixa nova; aditivo sem mudança de valor segue funcionando | **Sim** (b) |
| **R3(d)** | nível do endpoint coerente com a decisão + doc com uma única versão | **Sim** (b) |
| **R4(d)** | criador não aprova — **ou** registro em `APPROVALS.md` de que ficou fora de escopo | **Sim** (c) |
| **R1(a)-(e)** | conforme ramo A1 ou A2 | **Sim** (a) |
| **R6(b),(c)** | suíte completa verde; **não-regressão em `juridico-contract-use-cases.test.ts:174-333`** (faixa corrigida pelo validator, não `:174-227`) | Não |

**Atenção a R6(c):** F2-C torna `approvalRepository` obrigatório e **vai** exigir ajuste nas
instanciações dentro de `juridico-contract-use-cases.test.ts`. Ajustar **construtor**, nunca
asserção. Qualquer expectativa alterada em `:174-333` reprova o reteste.

**Documentação obrigatória na entrega:** `docs/business/BLOCO_3_JUR_API.md` — §2.7 conforme
a decisão (a); tabela §2 com `POST /contracts/:id/approve` em nível `approve` (F2-D); linha
do aditivo (:214 × :233) unificada conforme a decisão (b).

---

## 10. Risco de regressão

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Perfis com `diretor/financeiro: 'operate'` perdem a aprovação | **Média** | Operacional (usuário travado) | Levantar contagem antes (§3.3) e reportar; promover a `approve` quem é aprovador de fato |
| `approvalRepository` obrigatório quebra testes unitários existentes | **Alta** | Baixo, detectado no CI | Ajustar instanciações; não tocar asserções (R6(c)) |
| Mexer no default de `authorizeAnyModule` quebra 5 rotas de leitura | **Baixa se o plano for seguido** | **Alto** (4 módulos, incl. produção) | Instrução explícita: **não tocar o middleware**; alterar só o call site (§3.1) |
| Reabertura de alçada (F3-B) deixa contrato em estado parcial | Média | Alto (contrato `active` com valor novo e sem aprovação — a própria falha) | Escrita transacional única: aditivo + `update` + invalidação de aprovações |
| Segregação bloqueia o único usuário real do ambiente | **Alta** | Operacional | Já conhecido e aceito em D-K; comunicar antes; cadastrar 2º aprovador |
| Correção idiossincrática não copiável para Compras/COMEX | Média | Médio (§3.2) | Primitivo em `shared/domain`, com `SEGREGATION_RULES` próprio |

---

## 11. Estado do caso

- **Causa-raiz:** demonstrada (§2), não hipótese — cadeia lida elo a elo no HEAD.
- **Blast radius:** mapeado com números (§3): 7 call sites do middleware, 1 de escrita;
  3 outros pontos de aprovação com o mesmo padrão, 2 deles em módulos de PRODUÇÃO
  (encaminhados, fora de escopo).
- **Plano:** executável para as Falhas 2 e 4; condicional por ramo para as Falhas 1 e 3.
- **Bloqueio:** 3 decisões do dono (§8) — bloqueiam **somente** as Falhas 1 e 3.
- **Autoridade:** SanaCore **não** declara `RETEST_PASSED` nem `FINDING CLOSED` (Regras 3-4).
  `STATUS` do finding permanece `OPEN`.

**Handoff → `sanacore-remediation-engineer`**, worktree/branch
`sana/ERP-LEGACY-001/FIND-ERP-005`: executar §6 (F2-A..D, F4-A, F4-C condicionada a tabela
vazia) + os testes de §9 marcados “Depende de decisão? Não”. **Não** iniciar §7 antes dos
`APR-...` das 3 perguntas.

---

*Produzido pelo `sanacore-remediation-triage`. Nenhum arquivo em `server/src`, `server/tests`
ou `server/migrations` foi modificado. Nenhuma conexão com banco de dados foi aberta.*
