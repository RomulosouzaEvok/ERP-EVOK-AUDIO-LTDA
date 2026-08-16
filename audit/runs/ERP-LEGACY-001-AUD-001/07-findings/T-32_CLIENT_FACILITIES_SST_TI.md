# T-32 — CLIENT: FACILITIES, SST, TI

Run `ERP-LEGACY-001-AUD-001` · célula `C-133` · AUDIT_COMMIT
`c1311a6f76b512fef893f7e60d934179cae3409f`
Status dos findings: **PROPOSED** (nenhum veredito — Regra 4)

> **Nota de persistência.** Agente titular sem autoridade de escrita em `audit/`. Conteúdo
> persistido pelo orquestrador **sem alteração**.

## 1. Inventário próprio (31/31)

| Módulo | Arquivos |
|---|---|
| `facilities/` (15) | `FacilitiesPage`, `FleetTab`, `VehiclesPanel`, `DriversPanel`, `TripsPanel`, `FuelRecordsPanel`, `FinesPanel`, `MaintenanceTicketsTab`, `FacilityTicketPage`, `VisitorsTab`, `CleaningTab`, `ReservationsTab`, `AreasTab`, `CorrespondenceTab`, `facilitiesShared` |
| `sst/` (8) | `SstPage`, `EpiTab`, `AsoTab`, `AccidentsTab`, `EsocialTab`, `CipaTab`, `TrainingsTab`, `sstShared` |
| `ti/` (8) | `TiPage`, `TicketsTab`, `TermsTab`, `LicensesTab`, `AccessRequestsTab`, `BackupTab`, `MyTicketsPage`, `tiShared` |

Sem divergência com o escopo declarado.

## 2. Findings

### `T32-FST-F01` — CPF e telefone de visitante trafegam sem máscara para o browser; a UI afirma o contrário

**HIGH** / confiança **ALTA** (código) — LGPD, dado pessoal

| Lado | Âncora |
|---|---|
| Cliente (afirmação) | `client/src/pages/facilities/VisitorsTab.tsx:24-26` — "dados pessoais (`document`/`phone`) mascarados em listagem (LGPD, aplicação no backend — `GET /visitors`)" |
| Cliente (consumo real) | `VisitorsTab.tsx:38` chama `listVisits`, **não** `listVisitors`; a tabela usa só `visit.visitor?.name` (`:114`) |
| Contrato cliente | `client/src/api/facilities.ts:670` `Visit.visitor?: Visitor`; `:630-639` `Visitor.document`/`phone`; `:633` admite "completo apenas quando embutido no detalhe de uma visita" |
| Servidor (máscara existe) | `VisitorUseCases.ts:12-16, 26-29` — só em `GET /visitors` |
| Servidor (vazamento) | `SequelizeVisitRepository.ts:19-21, 31-33, 52-54` — `{ model: FacilityVisitor, as: 'visitor' }` **sem `attributes` e sem máscara**, ao lado de `{ model: Employee, as: 'hostEmployee', attributes: ['id','name'] }` |
| Rota | `facilities.ts:100` — `GET /visits` exige só nível de leitura `facilities` |

Documento e telefone de todo visitante são entregues a qualquer usuário com leitura em
`facilities`, na **listagem** (não só no detalhe), e nunca são renderizados. Três artefatos se
contradizem: docblock da tela, comentário do contrato do cliente e o repositório do servidor. Fonte
autoritativa = código do servidor (Regra 21).

### `T32-FST-F02` — A UI não consegue emitir CAT de óbito: `tipo` hard-coded no cliente

**HIGH** / confiança **ALTA** — confirma e estende o padrão de `FIND-ERP-008`

| Lado | Âncora |
|---|---|
| Cliente | `client/src/api/sst.ts:388-394` — `emitCat(accidentId, emitente)` envia `{ tipo: 'inicial', emitente }`; o parâmetro `tipo` **não existe** na assinatura |
| Cliente | `AccidentsTab.tsx:307` — `sstApi.emitCat(accident!.id, 'Técnico SST')` |
| Cliente | `AccidentsTab.tsx:251` — o formulário oferece `gravidade = 'obito'` |
| Servidor | `EmitCatUseCase.ts:60` — `const tipo = body.tipo === 'obito' ? 'obito' : 'inicial';` |

O servidor suporta CAT `obito`; o cliente jamais a produz. Para acidente com `gravidade='obito'` a
CAT nasce classificada como `inicial`. É o mesmo mecanismo de `FIND-ERP-008` (cliente fixa
`tipo:'inicial'`), aqui no par tipo-de-CAT × gravidade. Agravante de exibição:
`AccidentsTab.tsx:379` rotula `cat.tipo === 'inicial' ? 'CAT inicial' : 'Reabertura'` — uma CAT
`obito` apareceria como **"Reabertura"**.

### `T32-FST-F03` — Contrato da CAT divergente: `emitente` é payload morto e é renderizado como `undefined`

**MEDIUM** / confiança **ALTA**

Cliente envia `{ tipo:'inicial', emitente }` (`api/sst.ts:391`), declara `Cat { emitente: string; … }`
(`:376-385`) e renderiza `emitido por {cat.emitente}` (`AccidentsTab.tsx:379`). Servidor ignora o
campo — `accidentController.ts:71` usa `emitenteId: (req as any).user.id`, `EmitCatUseCase.ts:68`
grava `emitente_id`. O DTO de resposta (`AccidentMapper.ts:51-63`) devolve `acidente_id`,
`numero_cat`, `status_esocial_s2210`, `recibo_esocial` — **não** devolve `emitente`, `accident_id`
nem `status`.

O literal `'Técnico SST'` (`AccidentsTab.tsx:307`) sugere ao operador que a autoria está sendo
registrada por ele. O servidor está **correto** (usa a sessão). O efeito no cliente é "emitido por
undefined" e três campos declarados que nunca chegam. Invisível ao typecheck porque o DTO do
servidor é `Record<string, unknown>`.

### `T32-FST-F04` — TI: o solicitante escolhe o `department_id` que define quem pode aprovar seu próprio acesso

**HIGH** / confiança **ALTA** (código) / **MÉDIA** (explorabilidade — depende do conjunto de
gestores)

| Lado | Âncora |
|---|---|
| Cliente | `AccessRequestsTab.tsx:222-229` — select de **todos** os departamentos, não vinculado ao funcionário selecionado; enviado em `:169` |
| Cliente | `AccessRequestsTab.tsx:231-235` — `requested_profile_id` é `Input type="number"` livre |
| Servidor | `CreateAccessRequestUseCase.ts:39` — `const departmentId = input.department_id ?? employee.department_id;` — **não confere** se bate com o departamento real do funcionário |
| Servidor | `ApproveAccessRequestUseCase.ts:35` — `isEligibleApprover({ …, departmentId: request.department_id })` |
| Rota | `ti.ts:80-82` — "elegível = `ti:approve` OU gestor do `department_id` da solicitação (mesmo sem módulo `ti` nenhum)" |

O campo que determina **quem tem autoridade para aprovar** é escolhido livremente por quem
solicita (`ti:operate`), para um `requested_profile_id` arbitrário entre os perfis existentes. O
servidor valida que o perfil existe (`:43-46`) mas não restringe qual.

**Delimitação explícita**: isto **não** é violação literal da Regra 24 — o papel do cliente não é
aceito como fonte de autorização, e o provisionamento passa por `AccessProfileExecutionService`
(`ExecuteAccessRequestUseCase.ts:76-81`), que delega ao RBAC real. É um campo controlado pelo
cliente com efeito de autorização. **Cruzamento de mandato: veredito pertence ao
`authorization-auditor`.**

### `T32-FST-F05` — TI: a UI oferece "Executar" para solicitação `pending` que o servidor sempre rejeita

**MEDIUM** / confiança **ALTA**

Cliente renderiza Executar para `status === 'pending' || 'approved'` (`AccessRequestsTab.tsx:430`);
Aprovar/Rejeitar só para `pending && type !== 'revoke'` (`:405`). Servidor lança `ValidationError`
para `grant`/`change` ainda `pending` (`ExecuteAccessRequestUseCase.ts:53-55`). Rotas: execute =
`ti:operate` (`ti.ts:84`); approve = `ti:approve` **ou** gestor (`:82`).

O gate de aprovação é real no servidor. O defeito é do cliente: anuncia um caminho de execução sem
aprovação que não existe, exatamente sobre a fronteira de segregação de funções. Nenhuma tela de TI
tem gating de permissão (`AccessRequestsTab` não usa `useAuth`), ao contrário de `TermsTab.tsx:27` e
`LicensesTab.tsx:29`.

### `T32-FST-F06` — SST: o banner de bloqueio operacional afirma um controle de produção que não tem consumidor no servidor

**MEDIUM** / confiança **ALTA** — identifica o consumidor visual previsto em `T27-SST-F02`

Cliente: `TrainingsTab.tsx:45-48` (query) e `:52-63` (banner), com a afirmação em `:58` —
"Consultado pelo módulo de Apontamento de Produção antes de iniciar etapa (RF-SST-046)". Servidor:
`GetTrainingBlocklistUseCase.ts:21-23` → `trainingController.ts:67-69` → `sst.ts:118`. Grep de
`blocklist|findBlocklist` em `server/src` retorna **apenas** rota/controller/use-case/repositório do
próprio SST — nenhum consumidor em produção/apontamento.

**Esta é a tela** que `T27-SST-F02` aponta como "único consumidor é visual". O achado aqui é que o
cliente **declara como fato** um controle server-side inexistente.

### `T32-FST-F07` — SST: aviso de ASO afirma bloqueio automático de apontamento e notificação sem contraparte localizada

**MEDIUM** / confiança **MÉDIA** (evidência negativa por grep)

Cliente: `AsoTab.tsx:254-263` — "Este resultado bloqueia automaticamente o apontamento do
funcionário na função de origem até novo ASO apto, e notifica SST/RH/liderança." Servidor:
`CreateAsoUseCase.ts:9` — RF-SST-018 aparece **apenas em comentário**. Consumidores de
`GetAsoStatusUseCase`: `SstAsoServiceAdapter.ts:14-19`, `ConcludeAdmissionProcessUseCase.ts:121`,
`ConcludeTerminationProcessUseCase.ts:73` — admissão/demissão, **não** apontamento de produção.
Nenhum despacho de notificação encontrado no caminho de criação de ASO.

### `T32-FST-F08` — Facilities: `AreasTab` é a única tela do escopo que autoriza por papel legado em vez do mapa de permissões

**MEDIUM** / confiança **ALTA**

`AreasTab.tsx:32-33` — `const canWrite = hasRole('admin', 'operator');` × `facilities.ts:128-129` —
`POST/PUT /areas` exigem `authorizeModule('facilities','operate')`. Irmãs com o padrão correto:
`VisitorsTab.tsx:30`, `CorrespondenceTab.tsx:27`, `ReservationsTab.tsx:24`, `CleaningTab.tsx:29-30`,
`TripsPanel.tsx:24` — todas usam `permissions?.facilities`.

Erra nos dois sentidos: papel `operator` sem o módulo vê botões que resultam em 403;
`facilities:'operate'` com papel `financial` perde botões que o servidor aceitaria. **Não é
Regra 24** — o papel nunca é enviado como fonte de autorização.

### `T32-FST-F09` — Facilities: condutor pode ser autorizado com CNH vencida; a UI exibe "Vencido" ao lado do botão habilitado

**LOW** / confiança **ALTA** — mesma classe de `T27-SST-F01`, replicada em facilities

Cliente: `DriversPanel.tsx:116` renderiza "Vencido"; `:123-127` botão "Autorizar" **não**
desabilitado. Servidor: `DriverUseCases.ts:88-97` grava `authorized: true` sem checar
`cnh_valid_until`. Controle mitigador verificado: `TripUseCases.ts:115-117` bloqueia a **saída** com
CNH vencida. Severidade LOW porque o gate a jusante fecha o risco; o residual é um estado
"Autorizado" falso.

### `T32-FST-F10` — SST: o seletor de entrega de EPI oferece tipos com CA vencido embora o contrato permita filtrar

**LOW** / confiança **ALTA**

`EpiTab.tsx:237-241` chama `listEpiTypes({ active: true })` sem `ca_valido`, que o contrato expõe
(`api/sst.ts:35-39`); o cliente já sabe calcular o vencimento (`:512`). O servidor documenta 422
`BUSINESS_RULE_VIOLATION` para CA vencido na data de entrega (`api/sst.ts:147`). A UI conduz o
operador a uma falha garantida.

## 3. Conformidades declaradas (com evidência)

1. **Regra 24 não é acionada em nenhuma das 31 páginas.** `role`/`permissions` vêm do servidor
   (`AuthContext.tsx:106-121`) e são usados só para UX — declarado no próprio contrato (`:32-38`).
   Nenhum `role`/`isAdmin`/`perfil` é enviado em body/query/header. **Módulo TI incluído**: o
   `requested_profile_id` é validado contra `AccessProfile` (`CreateAccessRequestUseCase.ts:43-46`)
   e aplicado via RBAC real — ver ressalva em F04.
2. **Gating de rota espelha o servidor.** `App.tsx:488` (`/sst`), `:499` (`/ti`), `:510`
   (`/facilities`) × `sst.ts:35`, `ti.ts:30`, `facilities.ts:42`. Exceções de auto-serviço
   `/meus-chamados` (`App.tsx:167`) e `/chamado-predial` (`:184`) fora do guard, casando com
   `ti.ts:39-40` e `facilities.ts:89`.
3. **Nota interna de chamado é imposta no servidor.** UI promete em `TicketsTab.tsx:320-323`;
   servidor cumpre em `TicketMapper.ts:61-63` e `AddTicketCommentUseCase.ts:31-32` (403).
4. **Divergência de odômetro**: aviso do cliente (`TripsPanel.tsx:314-318`) corresponde à
   imposição real (`TripUseCases.ts:135-140`).
5. **Botões de nível `approve` alinhados às rotas**: EPI confirm (`EpiTab.tsx:183` × `sst.ts:54`);
   CAT e encerramento de acidente (`AccidentsTab.tsx:394,427` × `sst.ts:74-75`); reenvio eSocial
   (`EsocialTab.tsx:128` × `sst.ts:84`); termo perdido (`TermsTab.tsx:101` × `ti.ts:62`); renovação
   de licença (`LicensesTab.tsx:138` × `ti.ts:74`); indicação/pagamento de multa
   (`FinesPanel.tsx:329,362` × `facilities.ts:80,82`); suspensão de condutor
   (`DriversPanel.tsx:128` × `facilities.ts:60`); plano de limpeza (`CleaningTab.tsx:52,94` ×
   `facilities.ts:113-114`); liberação de documento (`VehiclesPanel.tsx:413-419` ×
   `facilities.ts:52`).
6. **Estado do cliente sem exposição**: nenhuma das 31 páginas escreve em
   `localStorage`/`sessionStorage`; chave de licença revelada fica só em estado de componente
   (`LicensesTab.tsx:34`, descartada em `:121-125`).
7. **Nomenclatura de abastecimento alinhada**: `FuelRecordsPanel.tsx:107` (`unit_price`) ×
   `fuelRecordValidators.ts:17`.

**Observações (não elevadas a finding):**

- **OBS-A** — Botões de criação sem gate de `operate` são sistemáticos e server-enforced:
  `CipaTab.tsx:134`, `TrainingsTab.tsx:85`, `AsoTab.tsx:96`, `AccidentsTab.tsx:56`,
  `EpiTab.tsx:129/486/662`, `TermsTab.tsx:57`, `LicensesTab.tsx:70`, `BackupTab.tsx:83`,
  `AccessRequestsTab.tsx:60`. Registrado como padrão único, não 9 findings.
- **OBS-B (resposta direta sobre `T27-SST-F01`)** — **Não, a UI não sugere que checa.** `CipaTab` é
  somente-leitura para mandatos/membros; `CipaMember.posse_registrada` existe no contrato
  (`api/sst.ts:497`) mas não é renderizado, e `POST /cipa/members/:id/take-office` (`sst.ts:92`)
  **não tem chamador no cliente**. É o caso inverso: regra que só existe no servidor.
- **OBS-C (`T16-F01`)** — Nenhuma contradição adicional introduzida pelo cliente de `ti` além de
  F04/F05.

## 4. Lacunas — exigem o `vericore-audit-verification-runner`

- **L-1 (F01)** — capturar o JSON de `GET /api/facilities/visits` e confirmar
  `visitor.document`/`visitor.phone` sem máscara.
- **L-2 (F02)** — emitir CAT para acidente com `gravidade='obito'` pela UI e confirmar persistência
  como `tipo='inicial'`.
- **L-3 (F07)** — provar ausência de bloqueio de apontamento e de notificação após ASO `inapto`.
- **L-4 (F05)** — confirmar o 422 ao clicar "Executar" em `grant` `pending`.
- **L-5** — nenhuma interação real de navegador nesta trilha; todos os achados são estáticos com
  âncora dupla.

## 5. Encaminhamentos

- **`finding-validator`** (Regra 22, CRITICAL/HIGH): `T32-FST-F01`, `T32-FST-F02`, `T32-FST-F04`.
- **`authorization-auditor`** (cruzamento explícito de mandato): `T32-FST-F04` e `T32-FST-F08`.
- **Cobertura declarada: 31/31 páginas, 100%, sem amostragem** — fecha a parte facilities/SST/TI de
  `N-07`/G3.
