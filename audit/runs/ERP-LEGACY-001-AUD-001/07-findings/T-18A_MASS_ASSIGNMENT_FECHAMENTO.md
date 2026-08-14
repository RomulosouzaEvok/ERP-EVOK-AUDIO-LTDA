# T-18-A — MASS ASSIGNMENT: FECHAMENTO DE RES-T18-04 · RELATÓRIO DIRIGIDO

> **Nota de persistência.** Produzido pelo `vericore-controller-auditor` (T-18-A fechamento de RES-T18-04) e persistido
> **sem alteração de conteúdo** pelo orquestrador — o agente é read-only por
> desenho e não pode escrever em `audit/`. O juízo de auditoria é
> integralmente da trilha. Única transformação aplicada: promoção do
> cabeçalho a H1 e desescape de entidades HTML.

---

**Objeto:** os 12 call sites (21 linhas, ver Nota de Contagem) do padrão `{ id/…Id: req.params, ...req.body }` deixados sem rastreio por T-18 (`T18-F01`/`RES-T18-04`). `AUDIT_COMMIT c1311a6f76b512fef893f7e60d934179cae3409f`, leitura própria, sem execução (`APR-2026-016`). Confirmei a lista por varredura própria (`Grep` de `...req.body` em `server/src/modules/**/presentation/controllers/*.ts`) — **nenhum call site fora da lista foi encontrado**; a lista de T-18 está completa.

**Nota de contagem (Regra 20 — divergência registrada, não conciliada em silêncio):** o rótulo "12 call sites" do encargo não bate com a enumeração literal, que soma **21 linhas** em 9 controllers (contractController 3 + lgpdController 4 + legalCaseController 5 + ipAssetController 1 + corporateActController 1 + deadlineController 1 + ticketController 3 + accessRequestController 1 + productionOrderController 2 = 21). Tracei as 21, não 12 — cobertura maior que a pedida, não menor.

**Achado metodológico central, que muda a leitura de T18-F01:** existem **dois defeitos independentes** no mesmo padrão, e closing um não fecha o outro:
1. **Mass assignment de campo** — o use case passa `rest`/`data` inteiro ao repositório sem whitelist. Fechado quando o use case destrutura e nomeia campos explicitamente.
2. **Sobrescrita de ID de registro** — como o spread de `req.body` vem depois do `id`/`contractId`/`legalCaseId` derivado da rota, um campo de mesmo nome no corpo **sempre** sobrescreve o alvo, **mesmo quando (1) está fechado** — porque o use case usa o `id` já sobrescrito tanto para o `findById` quanto para o `update` (check-then-act consistente, mas sobre o registro errado). Isso só vira falha de autorização quando o gate da rota é **escopado por posse** (`authorizeSelfOrModule`); nos demais casos (gate é sempre por módulo, nunca por registro) não há escalada de privilégio, mas sobra **falsificação de log de auditoria** sempre que o `logAction` cita `Number(req.params.id)` literal em vez do id efetivamente mutado.

### Tabela — uma linha por call site

| # | Rota · arquivo:linha | Validação de schema | Whitelist no use case | Whitelist no repositório | ID sobrescritível | Campos sensíveis alcançáveis | Rota dedicada mais protegida contornada | Veredito |
|---|---|---|---|---|---|---|---|---|
| 1 | `PUT /contracts/:id/signatories` · `contractController.ts:116` | Não | **Sim** (`AddContractSignatoryUseCase.ts:31-37`) | Não (`.update()` cru é irrelevante aqui — não chamado) | Sim (`contractId`), sem consequência (sem `logAction`, acesso já é módulo-largo) | — | Não | **Conformidade** |
| 2 | `POST /contracts/:id/addendums` · `contractController.ts:192` | Não | **Sim** (`CreateContractAddendumUseCase.ts:45-64`) | N/A (create) | Sim (`contractId`), mas `logAction` cita `addendum.id` (entidade real), sem falsificação | value/end_date do próprio contrato (escritos deliberadamente) | Não | **Conformidade** |
| 3 | `POST /contracts/:id/terminate` · `contractController.ts:211` | Não | Parcial — `status/termination_reason/termination_date` fixos (`TerminateContractUseCase.ts:43-47`), mas `input.id` usado sem filtro | Não | **Sim, com efeito**: `input.id` sobrescrito é usado no `findById`+`update`; `logAction:88` cita `Number(req.params.id)` literal | `status` (encerramento, contrato jurídico crítico) | Não (mesmo `juridico:operate` já pode encerrar qualquer contrato pela URL certa) | **T18A-F01 — MEDIUM** |
| 4 | `PUT /lgpd/processing-activities/:id` · `lgpdController.ts:71` | Não | **Sim** (`UpdateProcessingActivityUseCase.ts:32-43`, whitelist explícita por `'campo' in rest`) | Não | Sim, com `logAction:72` citando `Number(req.params.id)` literal | `department_id` (realocação de atividade de tratamento) | Não | **T18A-F02 — MEDIUM** |
| 5 | `POST /lgpd/data-subject-requests` · `lgpdController.ts:117` | Não | **Sim** (`CreateDataSubjectRequestUseCase.ts:43-53`) | N/A (create, sem `:id` na rota) | N/A — não há alvo de rota para sobrescrever | — | Não | **Conformidade** |
| 6 | `POST /lgpd/incidents` · `lgpdController.ts:187` | Não | **Sim** (`CreateIncidentUseCase.ts:43-53`) | N/A (create) | N/A | — | Não | **Conformidade** |
| 7 | `POST /lgpd/incidents/:id/decision` · `lgpdController.ts:199` | Não | **Sim** (`DecideIncidentUseCase.ts:38-63`, decisão derivada de booleans validados) | Não | Sim; `input.id` usado direto; `logAction:200` cita `Number(req.params.id)` literal | `status`, `communication_decision` (comunicação à ANPD — LGPD) | Não (rota já é `authorizeModule('juridico','approve')`, nível módulo, não por registro) | **T18A-F03 — MEDIUM** |
| 8 | `PUT /external-lawyers/:id` · `legalCaseController.ts:72` | Não | **Não** — `UpdateExternalLawyerUseCase.ts:22-23`: `const {id,...rest}=input; repository.update(id, rest)` — `rest` inteiro, sem whitelist | Não (`SequelizeExternalLawyerRepository.ts:27-32`, `lawyer.update(data)` cru) | Sim, sem `logAction` (handler não audita esta ação) | **`supplier_id`** (`JurExternalLawyer.ts:41`, FK única para faturamento de honorários) | Não (sem rota dedicada de vínculo) | **T18A-F04 — MEDIUM** (mass assignment de campo financeiro + ausência total de trilha de auditoria) |
| 9 | `POST /legal-cases/:id/events` · `legalCaseController.ts:111` | Não | **Sim** (`CreateLegalCaseEventUseCase.ts:35-42`) | N/A | Sim (`legalCaseId`), sem `logAction` — sem consequência detectável | — | Não | **Conformidade** |
| 10 | `POST /legal-cases/:id/provisions` · `legalCaseController.ts:131` | Não | **Sim** (`CreateLegalCaseProvisionUseCase.ts:49-57`) + gate de negócio próprio (`hasApprove` resolvido server-side, `:37-40`) | N/A | Sim (`legalCaseId`); `logAction:135` cita `provision.id` (entidade real) — sem falsificação | `risk_class=probable` protegido por `ForbiddenError` no próprio use case | Não | **Conformidade** (exemplo positivo de defesa em profundidade) |
| 11 | `POST /legal-cases/:id/costs` · `legalCaseController.ts:161` | Não | **Sim** (`RegisterCaseCostUseCase.ts:39-46`) | N/A | Sim (`legalCaseId`); `logAction:163` cita `payable.id` correto, mas `entityDescription: "Custo do processo #${req.params.id}"` cita literal da rota — pode descrever o processo errado | **operação financeira** (`AccountPayable.create`) | Não (mesmo módulo já cobre qualquer processo) | **T18A-F05 — MEDIUM** (misatribuição financeira entre processos, não fraude de valor) |
| 12 | `POST /legal-cases/:id/close` · `legalCaseController.ts:171` | Não | **Sim** (`CloseLegalCaseUseCase.ts:40-64`) | N/A | Sim; `input.id` direto; `logAction:172` cita `Number(req.params.id)` literal | `status` (encerramento de processo, gerador de parcelas de acordo — financeiro) | Não (rota já `authorizeModule('juridico','approve')`, nível módulo) | **T18A-F06 — MEDIUM** |
| 13 | `PUT /ip-assets/:id` · `ipAssetController.ts:60` | Não | **Sim** (`UpdateIpAssetUseCase.ts:39-51`, whitelist explícita) | Não | Sim; `logAction:61` cita `Number(req.params.id)` literal | `status`, `responsible_user_id` de ativo de PI (inclusive potencialmente `trade_secret`) | Não | **T18A-F07 — MEDIUM** |
| 14 | `PUT /corporate-acts/:id` · `corporateActController.ts:49` | Não | **Não** — `UpdateCorporateActUseCase.ts:48-51`: `repository.update(id, {...rest, status: computed})` — `rest` inteiro, só `status` é protegido | Não (`SequelizeCorporateActRepository.ts:33-38`, `.update(data)` cru) | Sim; `logAction:50` cita `Number(req.params.id)` literal | **`created_by`** (`JurCorporateAct.ts:48`, autoria de ata societária/deliberação de diretoria — registro de governança) | Não | **T18A-F08 — MEDIUM** (falsificação de autoria de ato societário + registro no alvo errado) |
| 15 | `POST /legal-cases/:caseId/deadlines` · `deadlineController.ts:55` | Não | **Sim** (`CreateDeadlineUseCase.ts:54-64`) | N/A | Sim (`legalCaseId`); `logAction:58` cita `deadline.id`/objeto real, sem literal de rota — consistente mesmo se `legalCaseId` for sobrescrito | `responsible_user_id`, `escalation_user_id` (prazo fatal — bloqueio de maior prioridade do módulo, já validado) | Não | **Conformidade** |
| 16 | `POST /tickets` · `ticketController.ts:100` | Não (documentado como decisão) | **Sim** — ordem segura: `...req.body` primeiro, `requesterId`/`requesterHasTiOperate` depois (`ticketController.ts:99-103`; `CreateTicketUseCase.ts:68-81`, whitelist total) | N/A | N/A (create) | `requesterId` protegido pela ordem correta do spread | Não | **Conformidade** — exemplo do padrão correto (server-field depois do spread) |
| 17 | `POST /tickets/:id/assign` · `ticketController.ts:140` | Não | Parcial — `AssignTicketUseCase.ts:25,32-39` destrutura campos nomeados, MAS o **controller** coloca `assignedTo: user.id` **antes** de `...req.body` (`ticketController.ts:137-141`) — ordem insegura, oposto do item 16 | Não | **Sim, com efeito real**: `id` **e** `assignedTo` sobrescritíveis pelo corpo | `assigned_to` (atribuição de responsabilidade de chamado) sequestrável a qualquer usuário/qualquer chamado | Não (rota já `authorizeModule('ti','operate')`, módulo largo) — mas quebra a invariante "quem assume o chamado é quem faz a chamada" | **T18A-F09 — MEDIUM** (campo servidor-autoritativo sobrescrito por ordem de spread invertida — mesma causa-raiz do T18-F01, aplicada a integridade de fluxo, não a alçada) |
| 18 | `POST /tickets/:id/confirm` · `ticketController.ts:200` | Não | Parcial — `ConfirmTicketUseCase.ts:27` destrutura `{id, satisfaction_rating, satisfaction_comment}`, mas usa `id` como veio | Não | **Sim, com CONSEQUÊNCIA DE AUTORIZAÇÃO**: a rota é gateada por `authorizeSelfOrModule('ti','operate', ticketOwnershipCheck)` (`ti.ts:49`), cuja checagem de posse (`ticketOwnershipCheck`, `ticketController.ts:51-55`) resolve **exclusivamente `req.params.id`**; a mutação subsequente ocorre sobre o `id` **do corpo**, se presente, sem recheque de posse | `status→closed`, `satisfaction_rating/comment` de um chamado **que o requerente não possui** | **Sim — contorna o gate `authorizeSelfOrModule` (posse)** | **T18A-F10 — HIGH** (bypass de autorização real: qualquer requerente com ao menos um chamado próprio "resolved" pode fechar/avaliar QUALQUER chamado de terceiro colocando o `id` alheio no corpo; sem `logAction`, o abuso é silencioso) |
| 19 | `POST /access-requests/:id/checklist` · `accessRequestController.ts:122` | Não | **Sim** (`UpdateAccessRequestChecklistUseCase.ts:26-35`, só `field`/`value` num JSONB) | Não (mas irrelevante — escreve só no JSONB `checklist`) | Sim (`id`), mas sem consequência material: rota já `authorizeModule('ti','operate')` módulo-largo, sem `logAction` | Nenhum campo de permissão/papel — só entrada arbitrária dentro do `checklist` JSONB | Não | **Conformidade, com nota** — **não** é vetor adicional de `T16-F01` (escalada de privilégio): os únicos campos graváveis são `field`/`value` dentro do JSONB, nenhuma coluna de decisão/aprovação/papel é alcançada por este endpoint |
| 20 | `POST /production-orders/:id/tracking` · `productionOrderController.ts:210` | Não | **Sim** (`CreateProductionTrackingUseCase.ts:37-43`, campos nomeados) | N/A | **Sim, com efeito**: `production_order_id` sobrescritível; `logAction:216` grava `entityDescription`/`newValues.production_order_id` citando **`req.params.id` literal**, não o valor efetivamente usado | vínculo com Ordem de Produção (rastreabilidade de apontamento de etapa — adjacente a movimentação de estoque) | Não (mesmo `chao_de_fabrica:operate` já cobre qualquer OP) | **T18A-F11 — MEDIUM** (apontamento pode ser anexado a OP diferente da rota + log de auditoria atribui à OP errada) |
| 21 | `POST /production-orders/tracking/:trackingId/complete` · `productionOrderController.ts:255` | Não | **Sim** (`CompleteProductionTrackingUseCase.ts:42-48`, campos nomeados) | N/A | Sim (`tracking_id`), mas `logAction:259-260` cita `tracking.id` (entidade real) — sem falsificação | `quantity_good/quantity_scrapped` (protegidos por validação `>=0` e por status `in_progress`) | Não | **Conformidade** |

---

## Findings propostos

### T18A-F10 — Bypass de `authorizeSelfOrModule` via sobrescrita de ID no corpo: requerente fecha/avalia chamado de terceiro sem posse
**Severidade: HIGH · Confiança: ALTA · ASVS V4.2.1/V4.1.1**

`ticketController.ts:200` → `ConfirmTicketUseCase.ts:27,34`. A rota (`ti.ts:49`) confia a checagem de posse a `ticketOwnershipCheck` (`ticketController.ts:51-55`), que resolve **apenas o `req.params.id`**. A ação em si roda contra `{ id: Number(req.params.id), ...req.body }` — se o corpo trouxer `id`, o `ConfirmTicketUseCase` age sobre esse `id` sem qualquer recheque de posse. **Consequência provada por leitura de código, não por execução**: um usuário sem módulo `ti` algum, dono de qualquer chamado próprio em `resolved`, pode `POST /api/ti/tickets/<seu-id>/confirm` com `{ id: <id-de-terceiro>, satisfaction_rating: 1 }` e fechar/avaliar o chamado alheio. Sem `logAction` nesta ação — o abuso não deixa rastro. Requer verificação dinâmica para confirmação empírica (ver pedido abaixo).

### T18A-F04 — `supplier_id` de advogado externo gravável sem whitelist e sem trilha de auditoria
**Severidade: MEDIUM · Confiança: ALTA · ASVS V5.1.2**
`legalCaseController.ts:72` → `UpdateExternalLawyerUseCase.ts:22-23` → `SequelizeExternalLawyerRepository.ts:30` (`lawyer.update(data)` cru) → `JurExternalLawyer.ts:41` (`supplier_id`, FK única de faturamento de honorários). Qualquer usuário `juridico:operate` redireciona o vínculo de faturamento de honorários para outro fornecedor, e a ação **não gera `logAction`** — nem sequer há registro de que ocorreu.

### T18A-F08 — Autoria de ato societário (`created_by`) falsificável; ausência de whitelist no `UpdateCorporateActUseCase`
**Severidade: MEDIUM · Confiança: ALTA · ASVS V5.1.2/V4.2.1**
`corporateActController.ts:49` → `UpdateCorporateActUseCase.ts:48-51` (`{...rest, status: computed}`) → `SequelizeCorporateActRepository.ts:36` (`.update(data)` cru) → `JurCorporateAct.ts:48` (`created_by`). Único campo protegido é `status` (calculado explicitamente); `created_by` e qualquer outro atributo do modelo passam direto. Some-se a isso a sobrescrita de `id` (o `logAction:50` cita `Number(req.params.id)` literal, podendo divergir do ato efetivamente alterado).

### T18A-F01/F02/F03/F06/F07/F11 — Sobrescrita de ID de registro falsifica o log de auditoria (contratos, LGPD, contencioso, PI, produção)
**Severidade: MEDIUM (cada) · Confiança: ALTA · ASVS V4.2.1**
Mesmo mecanismo em seis pontos (`contractController.ts:211`, `lgpdController.ts:71,199`, `legalCaseController.ts:171`, `ipAssetController.ts:60`, `productionOrderController.ts:210`): o use case, mesmo com whitelist de **valores**, usa o `id`/`legalCaseId`/`production_order_id` **já potencialmente sobrescrito pelo corpo** tanto para localizar quanto para atualizar o registro, e o `logAction` correspondente cita o **id literal da rota**, não o efetivamente mutado. Não há escalada de privilégio (autorização é sempre por módulo, nunca por registro, nestes seis pontos), mas há **registro de auditoria não fidedigno** em: encerramento de contrato, atualização de atividade de tratamento LGPD, decisão de incidente LGPD (comunicação à ANPD), encerramento de processo judicial, atualização de ativo de PI, e apontamento de etapa de produção.

### T18A-F05 — Custo de processo jurídico pode ser lançado contra processo diferente do informado na URL (`legalCaseId` sobrescritível)
**Severidade: MEDIUM · Confiança: ALTA · ASVS V4.2.1**
`legalCaseController.ts:161` → `RegisterCaseCostUseCase.ts:36,44`. `logAction:163` grava `entityId: payable.id` (correto), mas `entityDescription` cita `req.params.id` literal — pode descrever o processo errado quando `legalCaseId` for sobrescrito pelo corpo. Não gera pagamento fraudulento (valor seguiria correto), mas atribui a despesa jurídica ao processo errado no relatório de provisões/custos.

### T18A-F09 — `assigned_to` de chamado de TI sobrescritível: ordem de spread inverte a regra "servidor por último"
**Severidade: MEDIUM · Confiança: ALTA · ASVS V4.2.1**
`ticketController.ts:137-141`: `{ id: ..., assignedTo: user.id, ...req.body }` — o campo servidor-autoritativo `assignedTo` vem **antes** do spread do corpo, contrário ao padrão correto observado no próprio módulo (`ticketController.ts:99-103`, `create`, onde o spread vem primeiro). Um analista pode atribuir um chamado a **outro** funcionário arbitrário via `assignedTo` no corpo, quebrando a invariante "quem assume, assume para si".

---

## Conformidades registradas (mesmo peso de resultado)

- `contractController.ts:116,192` — `AddContractSignatoryUseCase`/`CreateContractAddendumUseCase`: whitelist completa; `logAction` de `:192` usa id da própria entidade.
- `lgpdController.ts:117,187` — `CreateDataSubjectRequestUseCase`/`CreateIncidentUseCase`: creates sem `:id` de rota — padrão de sobrescrita não se aplica.
- `legalCaseController.ts:111,131` — `CreateLegalCaseEventUseCase`/`CreateLegalCaseProvisionUseCase`: whitelist completa; `:131` tem gate de negócio (`hasApprove`) resolvido 100% server-side dentro do próprio use case — exemplo positivo de defesa em profundidade.
- `deadlineController.ts:55` — `CreateDeadlineUseCase`: whitelist completa; `logAction` usa o objeto real, consistente mesmo sob sobrescrita de `legalCaseId`.
- `ticketController.ts:100` — `CreateTicketUseCase`: **padrão correto** de ordenação de spread (`...req.body` antes dos campos servidor), citado como referência positiva.
- `accessRequestController.ts:122` — `UpdateAccessRequestChecklistUseCase`: whitelist a `field`/`value` num JSONB; **não** é vetor adicional para `T16-F01` — nenhuma coluna de decisão/aprovação/papel é alcançável por este endpoint.
- `productionOrderController.ts:255` — `CompleteProductionTrackingUseCase`: whitelist completa; `logAction` usa a entidade real.
- **Padrão sistêmico observado (não é finding isolado, é contexto):** em nenhum dos 21 pontos o **repositório** aplica whitelist própria — toda a proteção depende exclusivamente da disciplina do use case. Onde o use case whitelista valores mas não protege o `id` de entrada (a maioria), a proteção é parcial.

---

## RES-T18A — o que não foi possível fechar

Nenhuma lacuna de cobertura declarada: as 21 linhas foram rastreadas ponta a ponta (rota → controller → use case → repositório → model), 100% sem amostragem. A única verificação que fica pendente de confirmação **dinâmica** (fora do escopo read-only desta trilha):

| ID | Pedido para `vericore-audit-verification-runner` | Objetivo |
|---|---|---|
| `DYN-T18A-01` | Usuário sem módulo `ti`, dono de um chamado `resolved` (id A) → `POST /api/ti/tickets/A/confirm` com body `{ id: B }` onde B é chamado de terceiro `resolved` | Confirmar empiricamente `T18A-F10` (HIGH) |
| `DYN-T18A-02` | `juridico:operate` → `PUT /api/jur/corporate-acts/1` com `{ created_by: <outro-user-id> }` | Confirmar `T18A-F08`: autoria de ato societário falsificável |
| `DYN-T18A-03` | `juridico:operate` → `PUT /api/jur/external-lawyers/1` com `{ supplier_id: <id-arbitrário> }` | Confirmar `T18A-F04`: redirecionamento de vínculo de faturamento |
| `DYN-T18A-04` | `PUT /api/jur/contracts/A/terminate` com `{ id: B }`; conferir `audit_logs` | Confirmar falsificação de log em `T18A-F01` (padrão replicado de `T18-F01`) |

## Escalonamentos

1. **Para `vericore-finding-validator` (Regra 22):** `T18A-F10` (HIGH) segue para validação antes de remediação.
2. **Para `vericore-software-audit-director`:** divergência de contagem "12" vs. 21 linhas rastreadas — registrada, não conciliada (Regra 20); recomendo que o rótulo de esforço futuro conte linhas, não arquivos.
3. **Para `vericore-mvc-architecture-auditor`:** disciplina de camada confirmada nos 21 pontos — nenhuma regra de negócio nova encontrada nos controllers; a falha é sempre de fronteira (ordem de spread) ou de use case (whitelist ausente/parcial), nunca de lógica de negócio vazando para o controller.
4. **Para `vericore-authorization-auditor`:** `T18A-F10` é evidência de que ao menos um gate `authorizeSelfOrModule` é contornável por manipulação de corpo — recomendo auditoria dedicada de todos os `ownershipCheck` do projeto (padrão pode se repetir onde `authorizeSelfOrModule` é usado, hoje restrito a `ti.ts`).
5. **Para `T-16` (`T16-F01`):** verificado especificamente — `accessRequestController.ts:122` **não** é vetor adicional da escalada de privilégio já reportada; nenhuma coluna de papel/aprovação é alcançável por este endpoint.

---

## Veredito final

**`RES-T18-04` está fechada quanto à obrigação de esforço** (100% dos 21 call sites rastreados ponta a ponta, sem amostragem) — mas **não** no sentido de "nada a reportar": produziu **11 findings novos** (10 MEDIUM + 1 HIGH), além do `T18-F01` original já registrado por T-18.

**A condição G3 NÃO está integralmente atendida para esta classe de defeito.** `T18A-F10` é um bypass de autorização confirmado por leitura de código (pendente apenas de confirmação dinâmica) em módulo que manipula chamados de TI — não é a classe "aprovação/segregação/financeiro" do texto do dono no sentido mais estrito, mas é autorização quebrada por manipulação de corpo, a mesma família de risco que motivou a condição. As 10 MEDIUMs remanescentes, somadas ao `T18-F01` original (HIGH, contratos), confirmam que o padrão estrutural (`{ id: req.params, ...req.body }` sem proteção do próprio `id`) é sistêmico no módulo `juridico` e presente também em `ti` e `production`, e que a defesa por whitelist de **valores** — presente na maioria dos 21 pontos — **não** protege contra a segunda metade do defeito (sobrescrita de `id`/falsificação de log/bypass de posse). Recomendo ao diretor: (a) validar `T18A-F10` como HIGH antes de qualquer remediação; (b) tratar a correção estrutural (nunca aceitar `id`/`*Id` do corpo quando já veio da rota) como item de arquitetura transversal, não patch pontual — mandato que **não** é meu (Regra 2).

**Arquivos lidos nesta trilha (além dos já citados na tabela):** `server/src/modules/juridico/presentation/routes/juridico.ts`; `server/src/modules/ti/presentation/routes/ti.ts`; `server/src/modules/production/presentation/routes/productionOrders.ts`; `server/src/middlewares/authorizeSelfOrModule.ts`; `server/src/modules/ti/presentation/validators/ticketValidators.ts`; `server/src/models/JurExternalLawyer.ts`; `server/src/models/JurCorporateAct.ts`; `server/src/modules/juridico/infrastructure/sequelize/SequelizeExternalLawyerRepository.ts`; `server/src/modules/juridico/infrastructure/sequelize/SequelizeCorporateActRepository.ts`; e todos os use cases citados na tabela. Nenhum arquivo do objeto auditado foi alterado; nenhuma conexão de banco aberta; nenhum comando executado.
