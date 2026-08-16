# T-32 — `client/` Produção, Engenharia, Qualidade, Laboratório

AUDIT_COMMIT `c1311a6f76b512fef893f7e60d934179cae3409f` · Run `ERP-LEGACY-001-AUD-001` ·
Célula `C-133` · Cobertura **23/23**

> **Nota de persistência.** O agente titular (`vericore-frontend-auditor`) não tem autoridade
> para emitir arquivo de relatório. Conteúdo persistido pelo orquestrador **sem alteração** —
> mesmo padrão de ressalva de transparência já aplicado nos passos 23 e 24 e nas trilhas T-27,
> T-29 e T-30.

## 1. Inventário próprio (enumerado, não herdado)

| Diretório | Arquivos auditados | Divergência vs briefing |
|---|---|---|
| `client/src/pages/production/` | BomPage, CompleteProductionOrderDialog, CompleteOrderWithLotScanDialog, MasterProductionPlanPage, MrpPage, ProductionOrdersPage, ProductionRequisitionsPage, ProductionRoutesPage, RouteStepsEditor, ShopFloorPage, WorkCentersPage = **11** | nenhuma; existem ainda `ProductionRoutesPage.test.tsx` e `MasterProductionPlanPage.test.tsx` (fora do escopo como objeto) e o módulo auxiliar `productionRouteShared.ts`, auditado por ser onde vive a regra de tipo de produto |
| `client/src/pages/engineering/` | EngineeringPage, ProjectsTab, DrawingsTab, TechnicalSpecTab, SampleRequestTab = **5** | nenhuma |
| `client/src/pages/quality/` | QualityPage, InspectionTab, NonConformitiesTab, QualityRequisitionsPage = **4** | nenhuma |
| `client/src/pages/laboratory/` | LaboratoryPage, RegisterTestTab, TestHistoryTab = **3** | nenhuma |

`ProductionRequisitionsPage` e `QualityRequisitionsPage` são cascas de
`client/src/pages/shared/DepartmentRequisitionsPage.tsx`, auditado junto por ser onde a regra
realmente está.

## 2. Regra 24 — veredito de escopo

**Nenhuma violação.** `hasRole` deriva de `user.role` obtido em `GET /api/auth/me`
(`client/src/context/AuthContext.tsx:126-129`), e no servidor `role` vem do banco a cada request
(`server/src/middlewares/auth.ts:77-119`), nunca do payload do token nem do body. Nenhuma das 23
telas envia `role`/`isAdmin`/`perfil`. Registrado como ausência de discrepância com evidência.

## 3. Tabela página × achado (âncora dos dois lados)

| Página | Achado | Âncora cliente | Âncora servidor |
|---|---|---|---|
| CompleteProductionOrderDialog / CompleteOrderWithLotScanDialog | Refugo da OP inalcançável | `client/src/api/production.ts:50-54` | `productionValidators.ts:40-44`; `ProductionOrderEntity.ts:197-208` |
| idem | `allow_overproduction` inalcançável + mensagem crua vazada | `translateApiError.ts:214`; `production.ts:50-54` | `ProductionOrderEntity.ts:190-204` |
| idem | Nº do lote acabado gerado no cliente | `CompleteProductionOrderDialog.tsx:62`; `CompleteOrderWithLotScanDialog.tsx:71` | `productionValidators.ts:47` |
| ShopFloorPage | `totalGood` calculado no cliente × `quantity_produced` do servidor | `ShopFloorPage.tsx:105-108, 222-224, 197` | `ChangeProductionOrderStatusUseCase.ts:394` |
| ShopFloorPage | Teto de quantidade da etapa não existe em nenhum lado | `ShopFloorPage.tsx:442-447` | `CompleteProductionTrackingUseCase.ts:30-32` |
| ShopFloorPage | Modo `warn` do gate G4 invisível | — (nenhuma indicação na tela) | `ChangeProductionOrderStatusUseCase.ts:141, 307-308, 339-340` |
| ProductionOrdersPage, BomPage, WorkCentersPage, InspectionTab, NonConformitiesTab, ProjectsTab, TechnicalSpecTab | Gate de escrita por role legada × módulo no backend | `:74`, `:37`, `:324`, `:63`, `:163`, `:104`, `:83` | `productionOrders.ts:30-32`; `bom.ts:24-26`; `workCenters.ts:23-25`; `qualityInspections.ts:24` |
| InspectionTab | Alçada `qualidade:approve` ausente da UI | `InspectionTab.tsx:63, 171-188` | `inventory.ts:35-36`; `qualityInspections.ts:11-19` |
| NonConformitiesTab | `root_cause_category` coletado e descartado | `NonConformitiesTab.tsx:660-667` × `:580-585` | `UpdateNonConformityUseCase.ts:26-36` |
| NonConformitiesTab | Bloqueio de RNC encerrada é só do cliente | `NonConformitiesTab.tsx:574, 650, 110-116` | `UpdateNonConformityUseCase.ts:26-36, 73-77` |
| RegisterTestTab | Caixinha "Abrir RNC" inócua | `RegisterTestTab.tsx:52, 67, 119, 230-240` | `CreateAcousticTestUseCase.ts:63-70, 186`; `laboratoryValidators.ts:36-40` |
| RegisterTestTab | `consumed_quantity` (débito de estoque) inexistente na UI | grep em `client/` = 0 ocorrências | `laboratoryValidators.ts:41-45`; `CreateAcousticTestUseCase.ts:143-169` |
| SampleRequestTab, ProductionRequisitionsPage, QualityRequisitionsPage | `origin` como string mágica do cliente com efeito de depósito | `SampleRequestTab.tsx:25, 84`; `ProductionRequisitionsPage.tsx:9`; `QualityRequisitionsPage.tsx:9`; `DepartmentRequisitionsPage.tsx:124-126` | `purchaseRequisitionValidators.ts:49`; `ReceivePurchaseItemsUseCase.ts:58, 127` |
| 8 telas | `listProducts({limit:200})` como universo + sem filtro de tipo | `ProductionOrdersPage.tsx:87,156`; `BomPage.tsx:49`; `DrawingsTab.tsx:109`; `RegisterTestTab.tsx:77`; `NonConformitiesTab.tsx:186`; `ProjectsTab.tsx:127`; `TestHistoryTab.tsx:54` | `ProductionOrderEntity.ts:142-144` |
| WorkCentersPage | Sobreposição de turnos só no servidor; botão "Turnos" fora do gate | `WorkCentersPage.tsx:74-82, 543` | `ReplaceWorkCenterShiftsUseCase.ts:65-80`; `workCenters.ts:25` |

## 4. Findings `PROPOSED`

### `T32-PROD-F01` — Refugo da Ordem de Produção é inalcançável pela interface

**Severidade HIGH · Confiança ALTA**

`CompleteProductionOrderInput` (`client/src/api/production.ts:50-54`) tem exatamente três campos:
`quantity_produced`, `lot_consumptions`, `finished_lot_number`. O contrato do servidor aceita
também `quantity_scrapped` e `scrap_reason` (`productionValidators.ts:40-44`), gravados em
`changes.quantity_scrapped` / `changes.scrap_reason` (`ProductionOrderEntity.ts:207-208`). Nenhuma
das duas telas de conclusão os envia. Consequência: `production_orders.quantity_scrapped` é sempre
0 e `scrap_reason` sempre `null` para toda OP concluída pela UI. O refugo existe no sistema, mas
apenas por etapa (`ProductionOrderTracking.quantity_scrapped`, `ShopFloorPage.tsx:481-492`) — em
outra tabela, sem consolidação para a OP. Custo de refugo e indicador de perda de produção ficam
estruturalmente zerados.

### `T32-PROD-F02` — Regra de sobreprodução só existe no servidor e vaza o contrato da API para o operador

**Severidade HIGH · Confiança ALTA**

`ProductionOrderEntity.ts:190-204` recusa `produced > quantity` (e `produced + scrapped >
quantity`) com a mensagem literal `'Envie "allow_overproduction: true" na requisicao para
confirmar producao acima do planejado.'`. O cliente **não tem** o campo (`production.ts:50-54`),
então não há caminho de confirmação na UI — o fluxo é um beco sem saída para um evento rotineiro
de fábrica. Pior: `translateApiError.ts:214` repassa `body.error.message` cru quando não há
`details`, de modo que o operador de bancada lê a instrução de payload JSON na tela. Viola o
Padrão de Alerta Didático (§13.4, "nunca expõe código cru") por caminho que o próprio tradutor
deixa aberto.

### `T32-PROD-F03` — Número do lote de produto acabado é gerado no cliente

**Severidade MEDIUM · Confiança ALTA · classe `FIND-ERP-008`**

`setFinishedLotNumber(\`OP-${order.id}-${Date.now()}\`)` em
`CompleteProductionOrderDialog.tsx:62` e `CompleteOrderWithLotScanDialog.tsx:71`, campo editável
livremente pelo usuário (`:142`, `:196-202`). O servidor aceita qualquer string de 1 a 80
caracteres (`productionValidators.ts:47`) e a repassa como `finishedLotNumber`
(`ChangeProductionOrderStatusUseCase.ts:480`). O identificador de rastreabilidade do produto
acabado — a chave que sustenta recall — é decidido pelo cliente, com `Date.now()` do relógio da
estação, sem padrão de numeração nem verificação de unicidade no validador. Contraste interno: o
número da RNC é gerado pelo servidor e a própria UI diz isso (`NonConformitiesTab.tsx:317-319`).

### `T32-PROD-F04` — Duas verdades de "quantidade produzida" na mesma tela de chão de fábrica

**Severidade MEDIUM · Confiança ALTA**

`ShopFloorPage.tsx:105-108` soma `quantity_good` das etapas no cliente e exibe como *"Total bom
acumulado: X de Y planejados"* (`:222-224`). A mesma tela, no cartão da OP (`:197`), mostra
`order.quantity_produced ?? 0` — valor do servidor, gravado só na conclusão
(`ChangeProductionOrderStatusUseCase.ts:394`). Os dois números divergem durante toda a execução da
OP e nada na tela explica qual é o oficial. Cálculo de quantidade produzida no cliente, em
produção, é exatamente o item 4 do escopo.

### `T32-PROD-F05` — O teto que a UI insinua não é imposto por nenhum dos dois lados

**Severidade MEDIUM · Confiança ALTA**

Cliente valida apenas `>= 0` (`ShopFloorPage.tsx:442-447`); servidor valida apenas `>= 0`
(`CompleteProductionTrackingUseCase.ts:30-32`). Não existe checagem de `good + scrapped` contra a
quantidade da OP no apontamento por etapa. A frase *"de Y planejados"* (`:222-224`) comunica um
limite inexistente. A trava correspondente existe **só na conclusão da OP**
(`ProductionOrderEntity.ts:199-204`), regra que o F02 mostra ser inalcançável.

### `T32-QUAL-F07` — Separação inspecionar × liberar (ISO 9001 §8.6) construída no backend e invisível na UI

**Severidade HIGH · Confiança ALTA · cruza mandato do `authorization-auditor`**

`qualityInspections.ts:11-19` documenta a decisão deliberada: inspecionar exige
`qualidade:operate`, **liberar lote exige `qualidade:approve`** (`inventory.ts:35-36`, para
`/release` e `/block`). `InspectionTab.tsx:63` gate os botões "Aprovar"/"Reprovar" com
`hasRole('admin','operator')` — o nível `approve` não é consultado em lugar nenhum da tela. Duas
consequências opostas: (a) inspetor com `qualidade:operate` vê "Aprovar", clica e recebe 403
`APPROVAL_LEVEL_REQUIRED` cru via `translateApiError` sem tradução de alçada; (b) usuário com role
`financial` e perfil `qualidade:approve` não vê o botão, mas a API o autoriza. A UI não é bypass
de segurança — o backend segura —, mas descreve uma alçada que não é a do sistema. **Reporta-se a
discrepância; o veredito de autorização é do `authorization-auditor`.**

### `T32-QUAL-F08` — Categoria de causa raiz (6M) é coletada do usuário e descartada em silêncio

**Severidade MEDIUM · Confiança ALTA**

`NonConformitiesTab.tsx:660-667` renderiza o select "Categoria da causa raiz (6M)", registrado no
formulário (`:512`) e pré-carregado do registro existente (`:565`). A mutation (`:580-585`) **não
inclui** `root_cause_category` no payload; e mesmo se incluísse,
`UpdateNonConformityUseCase.ts:26-36` não o tem em `ALLOWED_FIELDS` e o descartaria. O campo é
decorativo em um registro CAPA — o analista da qualidade preenche 6M, salva, e nada é gravado, sem
erro nem aviso.

### `T32-QUAL-F09` — "RNC encerrada não pode mais ser editada" é gate exclusivamente do cliente

**Severidade MEDIUM · Confiança ALTA**

`NonConformitiesTab.tsx:574` calcula `isFinalized` e `:650` esconde todo o formulário de tratativa.
O próprio arquivo documenta a ausência do par (`:110-116`): *"O backend não impõe máquina de
estados rígida em `UpdateNonConformityUseCase`"* — confirmado: `ALLOWED_FIELDS` inclui `'status'`
sem qualquer validação de transição (`:26-36, 73-77`). Reabrir, reclassificar ou reescrever causa
raiz de uma RNC encerrada é uma chamada direta de API. Registro ISO 9001 §10.2 sem imutabilidade
após encerramento.

### `T32-LAB-F10` — Caixinha "Abrir RNC automaticamente se o teste for reprovado" não faz nada

**Severidade HIGH · Confiança ALTA · classe `FIND-ERP-008` invertida**

`RegisterTestTab.tsx:230-240` oferece o controle, default `true` (`:67`), e o envia (`:119`). O
backend **aceita e ignora**: `laboratoryValidators.ts:36-40` mantém o campo só para não rejeitar o
payload, e `CreateAcousticTestUseCase.ts:63-70` marca-o `@deprecated` — a reprovação **sempre**
abre RNC (`:186`). O JSDoc do servidor instrui literalmente: *"Remover junto com a caixinha … em
`client/src/pages/laboratory/RegisterTestTab.tsx`"*. Quem desmarca acredita ter registrado uma
reprovação sem tratativa; uma RNC é aberta e um lote pode ser bloqueado. Divergência conhecida,
documentada e não remediada desde 2026-08-09.

### `T32-LAB-F11` — Teste destrutivo (UC-42-E) não existe na interface

**Severidade MEDIUM · Confiança ALTA**

`consumed_quantity` é aceito pelo endpoint (`laboratoryValidators.ts:41-45`) e, quando > 0, debita
o Depósito LABORATORIO **na mesma transação** do registro do teste
(`CreateAcousticTestUseCase.ts:143-169`). Busca por `consumed_quantity` em todo `client/`: **zero
ocorrências**. Todo teste destrutivo registrado pela tela não baixa estoque; o material consumido
permanece no saldo do laboratório indefinidamente. Regra que só existe no servidor, sem porta de
entrada.

### `T32-ENG-F12` — `origin` de requisição é string mágica declarada pelo cliente e roteia material fisicamente

**Severidade MEDIUM · Confiança ALTA · classe `FIND-ERP-008`**

`SampleRequestTab.tsx:25` fixa `const ENGINEERING_SAMPLE_ORIGIN = 'engenharia_amostra'` e o envia
(`:84`); `ProductionRequisitionsPage.tsx:9` fixa `origin="op"`; `QualityRequisitionsPage.tsx:9`
fixa `origin="qualidade"` — todos repassados a `createPurchaseRequisition`
(`DepartmentRequisitionsPage.tsx:124-126`). O servidor aceita **qualquer** string
(`purchaseRequisitionValidators.ts:49`, `z.string().trim().min(1).max(80)`, sem enum) e usa o valor
exato `'engenharia_amostra'` para trocar o depósito de destino do recebimento de `INSUMOS` para
`LABORATORIO` (`ReceivePurchaseItemsUseCase.ts:58, 127`). Classificação com efeito físico decidida
pelo cliente, sem lista fechada no servidor. *Conformidade adjacente registrada: a justificativa
obrigatória para essa origem É imposta no servidor
(`CreatePurchaseRequisitionUseCase.ts:51-56`).*

### `T32-PROD-F13` — `limit: 200` como universo de escolha e critério de tipo de produto ausente dos seletores

**Severidade MEDIUM · Confiança ALTA · cruza `T11-F04`**

Oito telas montam o seletor de produto com `listProducts({ limit: 200 })` sem paginação nem busca
(`ProductionOrdersPage.tsx:87`, `BomPage.tsx:49`, `DrawingsTab.tsx:109`, `RegisterTestTab.tsx:77`,
`NonConformitiesTab.tsx:186`, `ProjectsTab.tsx:127`, `TestHistoryTab.tsx:54`). O 201º produto é
inselecionável e nada avisa. Além disso nenhum desses seletores filtra `product_type`:
`ProductionOrdersPage.tsx:156` oferece matéria-prima para abrir OP, e o servidor recusa com
`BusinessRuleError` (`ProductionOrderEntity.ts:142-144`). Resposta direta à pergunta de `T11-F04` —
**a única tela do escopo que reflete um critério de tipo é `ProductionRoutesPage`**, que filtra por
`PRODUCIBLE_PRODUCT_TYPES = ['finished','semi_finished']` (`productionRouteShared.ts:51-52`,
aplicado em `ProductionRoutesPage.tsx:184-186`) declarando espelhar a constante do backend. As
demais telas não refletem nenhuma das quatro implementações.

### `T32-PROD-F14` — Regra de turnos e gate de escrita de centros de trabalho

**Severidade LOW · Confiança ALTA**

Cliente valida só o formato `HH:MM` (`WorkCentersPage.tsx:72-82`); `end_time > start_time` e
ausência de sobreposição por dia são exclusivamente do servidor
(`ReplaceWorkCenterShiftsUseCase.ts:65-80`), e o erro chega cru via `extractApiErrorMessage`
(`:377`). O botão "Turnos" (`:543`) está **fora** do bloco `canWrite`, ao contrário do botão
"Editar" (`:546`): usuário sem escrita abre o diálogo, monta a grade e só descobre no 403.
*Conformidade no mesmo arquivo: os limites numéricos são espelhados com exatidão —
`machines_count ≥ 1`, `capacity_hours_per_day ∈ (0,24]`, `efficiency_factor ∈ (0,1]` em
`WorkCentersPage.tsx:64-66` e `workCenterValidators.ts:29-31, 39-41`.*

### `T32-PROD-F15` — Modo de vigência do apontamento obrigatório (G4) é invisível na UI

**Severidade MEDIUM · Confiança MÉDIA**

`PRODUCTION_TRACKING_REQUIRED` chaveia entre `block` e `warn`
(`ChangeProductionOrderStatusUseCase.ts:141`); em `warn`, gates de liberação e conclusão apenas
logam e deixam passar (`:307-308, 339-340`). Nenhuma das telas de produção indica o modo vigente.
Operador e PCP não têm como saber se a trava que a interface pressupõe está ativa. Confiança MÉDIA
porque o valor efetivo em produção é variável de ambiente — **lacuna declarada**: exige inspeção do
ambiente real, fora do alcance de leitura estática.

### `T32-PROD-F06` — Gate de escrita por role legada onde o backend autoriza por módulo

**Severidade MEDIUM · Confiança ALTA**

Sete telas do escopo derivam `canWrite` de `hasRole('admin','operator')`:
`ProductionOrdersPage.tsx:74`, `BomPage.tsx:37`, `WorkCentersPage.tsx:324`, `InspectionTab.tsx:63`,
`NonConformitiesTab.tsx:163`, `ProjectsTab.tsx:104`, `TechnicalSpecTab.tsx:83`. Os endpoints
correspondentes autorizam por **módulo/nível**, não por role: `producao:operate`
(`productionOrders.ts:30-32`), `bom:operate` (`bom.ts:24-26`), `centros_de_trabalho:operate`
(`workCenters.ts:23-25`), `qualidade:operate` (`qualityInspections.ts:24`). Eixos diferentes:
usuário `operator` sem o módulo vê botões que resultam em 403; usuário com o módulo mas role
`financial` não vê botões para ação que a API permite. O guard de **rota** já usa o eixo certo
(`ModuleRoute module="producao"` etc., `App.tsx:342-417`) — a incoerência é só no nível de botão. O
padrão correto existe no mesmo repositório: `ProductionRoutesPage.tsx:117-121` e
`MasterProductionPlanPage.tsx:156-159`.

## 5. Conformidades (mesmo peso)

| # | Conformidade | Âncora cliente | Âncora servidor |
|---|---|---|---|
| C1 | Guard de rota por módulo é 1:1 com o backend nas 23 páginas (`producao`, `mrp`, `chao_de_fabrica`, `centros_de_trabalho`, `qualidade`, `laboratorio`, `engenharia`) | `App.tsx:342-483`; `ProtectedRoute.tsx:59-71` | `productionOrders.ts`, `mrp.ts`, `workCenters.ts`, `qualityInspections.ts`, `laboratory.ts`, `engineering.ts` |
| C2 | **Referência de qualidade do repositório**: roteiro de fabricação espelha nível de alçada e traduz o 403 em linguagem de negócio | `ProductionRoutesPage.tsx:117-121, 554-589`; `productionRouteShared.ts:270-295` | `productionRoutes.ts:37-38` (`producao:approve`) |
| C3 | MPS usa o mapa de permissões resolvido pelo servidor, não role | `MasterProductionPlanPage.tsx:156-159` | `masterProductionPlans.ts:33-39` (`mrp`) |
| C4 | Liberar/obsoletar desenho técnico: gate de UI idêntico ao do endpoint | `DrawingsTab.tsx:81, 311-334` | `engineering.ts:43-44` (`authorize('admin')`) |
| C5 | Rastreabilidade de consumo na conclusão da OP é imposta no servidor, não só na UI | `CompleteProductionOrderDialog.tsx:89-91` | `ChangeProductionOrderStatusUseCase.ts:774-780` |
| C6 | Veredito aprovado/reprovado do teste é calculado no servidor; a UI só o exibe | `RegisterTestTab.tsx:263-293` | `CreateAcousticTestUseCase.ts:84-98, 126` |
| C7 | Status de criação de requisição tem whitelist no servidor (`draft`/`pending`) — impede auto-aprovação por payload | `SampleRequestTab.tsx:85` | `purchaseRequisitionValidators.ts:48` |
| C8 | Sequência de operações derivada da posição no cliente **e** validada no servidor (defesa em profundidade, `G5-SEQ-GAP`/`G5-SEQ-DUP`) | `RouteStepsEditor.tsx:59-79, 226-229` | `productionRouteValidators.ts` / `productionRouteRules.ts` |
| C9 | Limites numéricos de centro de trabalho espelhados com exatidão | `WorkCentersPage.tsx:64-66` | `workCenterValidators.ts:29-31, 39-41` |
| C10 | MPS mostra "Sugerido pelo sistema" e "Planejado por você" como colunas separadas, nunca fundidas — decisão humana auditável | `MasterProductionPlanPage.tsx:459-465, 483-486` | `DecideMasterProductionPlanLineUseCase.ts` |
| C11 | Aviso preventivo de resultado/faixa antes do envio, alinhado ao erro real do servidor (Regra 1, §13.1) | `RegisterTestTab.tsx:95-99, 212-219` | `CreateAcousticTestUseCase.ts:128-137` |
| C12 | Nenhuma identidade enviada pelo cliente: `tester_id`, `created_by`, `approved_by`, `closed_by` vêm todos do JWT | ausência verificada em `client/src/api/{laboratory,productionRoutes,nonConformities}.ts` | `CreateAcousticTestUseCase.ts:6`; `productionRoutes.ts:19-20`; `UpdateNonConformityUseCase.ts:20-24` |

## 6. Cruzamentos pedidos

- **`FIND-ERP-008` (valor fixo no cliente aceito sem questionamento)** — padrão **reencontrado três
  vezes** no escopo: `T32-PROD-F03` (nº de lote), `T32-ENG-F12` (`origin`), e a variante invertida
  `T32-LAB-F10` (cliente envia, servidor ignora sem avisar).
- **`T11-F02` (`min_quantity` servindo a dois propósitos)** — no escopo desta trilha a UI **não**
  apresenta os dois campos separados: só existe a coluna única "Est. mínimo"
  (`MasterProductionPlanPage.tsx:495, 522`, alimentada por `demand_safety_stock`), e `MrpPage` não
  expõe o campo. A UI não acrescenta a mentira; **também não divulga** que o mesmo número governa o
  lote mínimo do MRP. Nenhuma contradição nova.
- **`T11-F04` (quatro critérios de tipo de produto)** — respondido em `T32-PROD-F13`: só
  `ProductionRoutesPage`/`productionRouteShared.ts:51-52` reflete um critério; as outras sete telas
  com seletor de produto não refletem nenhum.
- **`AUD-INTEG-02`** — não reauditado; nenhuma das 23 telas do escopo escreve movimento de estoque
  com tipo escolhido pelo usuário.

## 7. Lacunas declaradas (exigiriam navegador ou ambiente)

1. Valor efetivo de `PRODUCTION_TRACKING_REQUIRED` no ambiente real (`T32-PROD-F15`).
2. Confirmação por execução dos 403 previstos em `T32-QUAL-F07` e `T32-PROD-F06` — requer usuário
   com role e perfil de área deliberadamente desalinhados (via `vericore-audit-verification-runner`).
3. Renderização literal da mensagem `'Envie "allow_overproduction: true" na requisicao'` na tela
   (`T32-PROD-F02`) — o caminho de código está provado; a captura visual não.
4. Colisão real de `finished_lot_number` gerado com `Date.now()` (`T32-PROD-F03`) — exige duas
   estações concluindo a mesma OP no mesmo milissegundo, ou inspeção de dados de produção.

---

**Resumo:** 15 findings `PROPOSED` (4 HIGH, 9 MEDIUM, 1 LOW, 1 MEDIUM com confiança média), 12
conformidades, cobertura 23/23, Regra 24 sem violação no escopo. Os HIGH (`F01`, `F02`, `F07`,
`F10`) devem seguir para o `vericore-finding-validator`; `F07` precisa de cruzamento explícito com
o `authorization-auditor`.
