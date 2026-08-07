# BLOCO 4 (CORREÇÃO) — Módulo Facilities (FAC) — Contrato de API

**Departamento:** 17 — Facilities.
**Natureza deste documento:** **correção de contrato**, não greenfield. Já
existe `/api/facilities/*` em produção parcial (commit `2ad27fd`, rotas em
`server/src/modules/facilities/presentation/routes/facilities.ts`). Este
documento especifica **breaking changes explícitas** nos endpoints de
`vehicles`/`fuel-records` (consequência direta de D-2) e os endpoints
**novos** para os 8 conceitos ainda não implementados (Condutor, Diário de
Uso, Multa, Documento de Veículo, Chamado Predial, Visitante/Visita,
Correspondência, Limpeza-execução, Reserva de Recursos).
**Insumos:** `docs/business/BLOCO_4_FAC_REQUISITOS.md` (60 RF-FAC, UC-58 a
UC-62, §6 decisões/pendências), `docs/business/BLOCO_4_FAC_VERIFICACAO.md`
(gaps críticos), `server/src/modules/facilities/` (código atual),
`server/src/models/Asset.ts`, `ItSoftwareLicenseDetail.ts`,
`MaintenanceOrder.ts` (precedentes de integração).
**Autor:** `ArquitetoSoftwareAPI`.
**Data:** 2026-08-07.
**Status:** 🟡 Contrato pronto para modelagem de banco em paralelo
(`AdmDBA`) e implementação futura (`programador`). **Nenhum código foi
alterado neste passo.** Segue o mesmo padrão estrutural de
`docs/business/BLOCO_3_JUR_API.md` (Bloco 3).

Base URL: `/api/facilities/*` (módulo existente, `server/src/modules/
facilities/`), exceto onde indicado (reaproveitamento de `/api/inventory`,
`/api/purchase-requisitions`, `/api/finance/cost-centers`, `/api/accounts-payable`,
e a extensão de `/api/maintenance` — ver §6).

**Convenção de nomes de tabela:** prefixo `facility_` + snake_case, seguindo
a nomenclatura sugerida em `BLOCO_4_FAC_REQUISITOS.md` §2 e **confirmada
contra as migrations reais** de `server/migrations/20260807-000290` a
`20260807-000300` (`facility_vehicle_details`, `facility_vehicle_documents`,
`facility_drivers`, `facility_vehicle_trips`, `facility_fines`,
`facility_cleaning_executions`, `facility_visitors`, `facility_visits`,
`facility_correspondence` — **singular**, ver nota de reconciliação abaixo —,
`facility_resource_reservations`). Nomes definitivos são decisão do
`AdmDBA`; este contrato assume esses nomes como base para os payloads.

**Nota de reconciliação (`AuditorIntegrador`, 2026-08-07):** a migration
`20260807-000299-create-facility-correspondence.cjs` cria a tabela no
singular (`facility_correspondence`), divergindo do plural
(`facility_correspondences`) originalmente assumido neste contrato — mesmo
padrão de divergência de prefixo já visto no Bloco 3. Corrigido neste
documento (rotas HTTP continuam no plural, `/api/facilities/correspondences`,
por ser convenção REST de coleção — só o nome da tabela é singular).

**Autenticação:** `Authorization: Bearer <JWT>` em todas as rotas
(`authenticate`). Identidade de quem executa a ação **sempre** vem de
`req.user.id` (nunca do body) — aplica-se a `requested_by`, `released_by`,
`authorized_by`, `indicated_by`, `executed_by`, `delivered_to` (quando
autoatribuição), `checkin_by`. Referência a pessoa em qualquer payload usa
exclusivamente `employee_id`/`user_id` (nunca duplica nome/CPF — quem quiser
exibir, resolve via `GET /api/employees/:id`).

**Tipos de dado:** PKs/FKs novos deste módulo são `integer`
(`INTEGER autoIncrement`, nunca `UUID` — mesmo padrão do restante do
projeto). `asset_id` referencia `assets.id` (já `INTEGER`). Valores
monetários (`amount`, `cost`, `total_cost`) são `DECIMAL` expostos como
**string** no JSON, nunca `number` (mesma decisão de `/api/items` e do
Bloco 3 JUR). Datas são `DATEONLY` (`"YYYY-MM-DD"`) salvo quando o campo é
claramente `TIMESTAMP` (`departure_at`, `return_at`, `checkin_at`,
`created_at`), indicado caso a caso. Quilometragem (`current_km`,
`departure_km`, `return_km`, `km_at_refuel`) é `INTEGER` (km inteiro, não
fracionário — precedente `facility_vehicles.current_km` já `INTEGER` na
implementação atual).

---

## 0. RBAC — módulo `facilities` ganha nível `approve`

### 0.1 Alteração em `ACCESS_MODULES`

`server/src/shared/domain/accessModules.ts` já tem a chave `facilities`
(2 níveis efetivos: leitura implícita `operate`, escrita `operate`). Esta
correção **não cria chave nova**, adiciona uso real do nível `approve`
(que o catálogo RBAC já suporta genericamente para qualquer módulo — o que
faltava era uso explícito nas rotas). Atualizar o comentário estrutural
de `accessModules.ts` (linhas 87-94) removendo a afirmação "nenhuma rota
deste módulo usa nível `approve`" — tarefa do `programador`, registrada
aqui para não deixar o comentário desatualizado (RF-FAC-057).

### 0.2 O que exige `approve` (decisão deste contrato, conforme §6.4 dos requisitos)

| Ação | Nível | RF |
|---|---|---|
| Criar/atualizar **plano** de limpeza (`facility_cleaning_schedules`) | `approve` | RF-FAC-049/057 |
| Liberar saída de veículo com documento tipo `seguro` vencido | `approve` | RF-FAC-010 |
| Aprovar divergência de odômetro (`departure_km` < maior `return_km` conhecido) | `approve` | RF-FAC-017 |
| Confirmar indicação de condutor / encerrar processo de multa | `approve` | RF-FAC-032/035 |
| Suspender autorização de condutor (`authorized=false`) | `approve` | RF-FAC-015 |

Tudo o mais (cadastro de veículo/condutor, saída/retorno normal,
abastecimento, execução de limpeza, abertura/execução de chamado predial,
check-in/out de visitante, correspondência, reserva) usa `operate`.
Leitura usa o nível padrão (`authorizeModule('facilities')`, `operate`
implícito), mantendo o padrão já em produção.

### 0.3 RBAC de chamado predial (D-1, decisão §6.2 dos requisitos)

Decisão adotada: **(a) filtro de listagem por categoria com autorização de
módulo dupla**, não endpoint dedicado espelhado. Razão: os campos expostos
para chamado predial e chamado de máquina são os mesmos (`maintenance_orders`
inteiro), só muda o filtro de negócio (`facility_area_id` presente vs.
`asset_id` de produção presente) — criar um segundo endpoint que devolve o
mesmo shape só duplicaria mapper/DTO sem ganho de segurança. Implementação:

- Rotas de manutenção predial vivem em `/api/facilities/maintenance-tickets`
  (namespace do módulo Facilities, para não misturar o RBAC de FAC dentro
  do router de MANUT), mas o **controller reaproveita o mesmo `MaintenanceOrder`
  model/use-cases já existentes em `server/src/modules/maintenance/`**
  (confirmado nesta reconciliação, `AuditorIntegrador`, 2026-08-07 — a
  versão anterior deste documento apontava `server/src/modules/manufacturing/`
  como local provável e pedia confirmação; o caminho real é
  `server/src/modules/maintenance/`, com `CreateMaintenanceOrderUseCase.ts`,
  `SequelizeMaintenanceRepository.ts` etc. Há inclusive precedente direto de
  injeção de serviço para esse mesmo model a partir de outro módulo —
  `server/src/modules/ti/application/services/MaintenanceOrderService.ts` +
  `server/src/modules/ti/infrastructure/adapters/MaintenanceOrderServiceAdapter.ts`
  — o padrão que Facilities deve replicar, não reinventar), filtrando sempre
  `facility_area_id IS NOT NULL` nas leituras e forçando `facility_area_id`
  obrigatório (com `asset_id` opcional) nas escritas.
- **Abertura de chamado (RF-FAC-040) é liberada a qualquer usuário
  autenticado** (`authenticate` apenas, sem `authorizeModule`), reaproveitando
  o precedente já validado do auto-serviço de TI (`authorizeSelfOrModule`,
  Bloco 2) — decisão explícita deste contrato, não do requisito (que deixou
  em aberto). Justificativa: o brief já define isso como "qualquer
  funcionário" (RF-FAC-040) e o precedente de TI evita reinventar um
  terceiro modelo de "quem pode abrir chamado". Triagem/execução/encerramento
  exigem `authorizeModule('facilities', 'operate'/'approve')` conforme a
  ação.
- Consulta cruzada MANUT×FAC (um técnico de manutenção vendo chamados
  prediais, ou o Supervisor FAC vendo chamados de máquina) usa, na leitura
  (`GET /api/facilities/maintenance-tickets`), a **composição lógica**
  "`facilities` OU `manutencao`", nunca na escrita. **Nota de reconciliação
  (`AuditorIntegrador`, 2026-08-07):** `authorizeModule()`
  (`server/src/middlewares/auth.ts`) hoje só aceita **um** `moduleKey` por
  chamada — não existe primitivo `authorizeAnyModule([...])`/OR de módulos
  no projeto (`grep` confirma nenhum precedente). Esta rota exige que o
  `programador` crie esse middleware novo (composição de dois
  `authorizeModule` independentes com curto-circuito no primeiro que
  autorizar) antes da implementação — não é reuso de infraestrutura
  existente, como o texto original desta seção sugeria implicitamente.

---

## 1. Padrão de erro e transversais

Idêntico ao restante do projeto — `AppError`/subclasses (`ValidationError`
400/422, `NotFoundError` 404, `UnauthorizedError` 401, `ForbiddenError` 403,
`ConflictError` 409, `BusinessRuleError` 422) tratadas pelo `errorHandler`
central, nunca stack trace ao cliente. Ver `docs/arquitetura/API.md` seção
"Respostas Padrão".

**Auditoria (RF-FAC-060):** toda escrita deste módulo passa a chamar
`AuditLog.logAction` (mesmo padrão SST/TI/JUR) — hoje ausente, é correção,
não feature nova.

**Sem exclusão física (RF-FAC-059, RNF geral):** nenhum recurso deste
módulo tem rota `DELETE`, mantendo o padrão já correto da primeira entrega.
Correção de registro é sempre novo status/registro, nunca `UPDATE`
destrutivo de campo histórico.

**Integridade de odômetro (RNF-FAC-01):** `current_km` de
`facility_vehicle_details` só é gravável por dois caminhos de aplicação —
`POST /trips/:id/return` (retorno de uso) e `POST /fuel-records` (com km
validado). Nenhum endpoint aceita `current_km` diretamente no payload de
`PUT /vehicles/:id` (campo ignorado/rejeitado se enviado — `400` se
presente e diferente do valor atual, para não falhar silenciosamente).

---

## Estrutura de módulo (ajustada — Clean Architecture)

```
server/src/modules/facilities/
├── domain/
│   ├── entities/            # FacilityVehicleDetail, FacilityVehicleDocument,
│   │                         #  FacilityDriver, FacilityVehicleTrip,
│   │                         #  FacilityFuelRecord (existente, corrigida),
│   │                         #  FacilityFine, FacilityCleaningSchedule
│   │                         #  (existente, redesenhada), FacilityCleaningExecution,
│   │                         #  FacilityArea (existente), FacilityVisitor,
│   │                         #  FacilityVisit, FacilityCorrespondence,
│   │                         #  FacilityResourceReservation
│   └── repositories/        # Interfaces por entidade acima
├── application/
│   ├── services/             # AssetService, MaintenanceOrderService,
│   │                          #  AccountPayableService, InventoryService,
│   │                          #  PurchaseRequisitionService, AuditLogService
│   │                          #  — cada uma com adapter em infrastructure/,
│   │                          #  nunca import direto de outro módulo
│   └── use-cases/            # Um UseCase por ação de negócio (ver por grupo)
├── infrastructure/
│   ├── adapters/              # AssetServiceAdapter, MaintenanceOrderServiceAdapter,
│   │                          #  AccountPayableServiceAdapter, InventoryServiceAdapter,
│   │                          #  PurchaseRequisitionServiceAdapter
│   ├── mappers/                # VehicleMapper, DriverMapper, TripMapper,
│   │                          #  FineMapper, TicketMapper (predial), VisitMapper,
│   │                          #  CleaningMapper, ReservationMapper
│   └── sequelize/              # SequelizeVehicleDetailRepository, ... (um por entidade)
└── presentation/
    ├── controllers/
    └── routes/
        # facilities.ts (router agregador único, mantém montagem em
        # /api/facilities em server/app.ts)
```

**Tipos extraídos para `*Types.ts`** (evitar ESM+CJS no mesmo arquivo):
`VehicleTypes.ts`, `DriverTypes.ts`, `TripTypes.ts`, `FineTypes.ts`,
`MaintenanceTicketTypes.ts`, `VisitTypes.ts`, `CleaningTypes.ts`,
`ReservationTypes.ts`.

**Baixo acoplamento — serviços injetados, nunca import direto de outro
módulo:**
1. `AssetService` — usado por `CreateVehicleUseCase` (cria/vincula `Asset`
   `asset_type='vehicle'` na mesma transação, RF-FAC-006) e por
   `RegisterTripReturnUseCase`/`SyncVehicleStatusUseCase` (lê
   `Asset.status`, nunca grava direto — RF-FAC-004, reaproveita a
   sincronização já existente de RF-PAT-05).
2. `MaintenanceOrderService` — usado por `CreateFacilityMaintenanceTicketUseCase`
   e `CreateVehiclePreventiveUseCase` (§6.2/§1.7 dos requisitos), nunca
   `MaintenanceOrder.create()` direto do módulo `facilities`.
3. `AccountPayableService` — usado por `PayFineUseCase`,
   `RegisterVehicleDocumentCostUseCase` (RF-FAC-034/058).
4. `InventoryService` — usado por `ConsumeSupplyUseCase` (baixa de insumo
   predial contra `/api/inventory`, RF-FAC-042/051).
5. `PurchaseRequisitionService` — usado por `RequestSupplyReplenishmentUseCase`
   (RF-FAC-052) — na prática, é apenas documentação de que Facilities
   **chama** `/api/purchase-requisitions` existente; não há endpoint
   próprio deste módulo para isso (ver §7).
6. `AuditLogService` — reaproveita `AuditLog.logAction` (RF-FAC-060).

---

## 2. Grupo 1 — Frota: Veículo como extensão de `Asset` (D-2, Breaking Change) — UC-58

Base: `/api/facilities/vehicles`. **BREAKING CHANGE** em relação ao
contrato hoje publicado e consumido por
`client/src/pages/facilities/FacilitiesPage.tsx`/`client/src/api/facilities.ts`
— sinalizado explicitamente conforme exigido pelo checklist de auditoria
deste agente. A tela será atualizada junto pelo `programador`/`PromadorFonteEnd`
na mesma entrega (RF-FAC-005 aceita esse tipo de mudança versionada e
documentada).

### 2.1 O que muda

| Antes (`2ad27fd`) | Depois (este contrato) |
|---|---|
| `facility_vehicles` tabela própria com `brand`/`model`/`status` | `Asset` (`asset_type='vehicle'`) + `facility_vehicle_details` (extensão 1:1, `asset_id` FK única) |
| `GET /vehicles` retorna `{ id, brand, model, plate, status, ... }` achatado | `GET /vehicles` retorna `{ id: <asset_id>, asset: {...}, vehicle_detail: {...} }` — **campo `id` do recurso passa a ser o `asset_id`**, não mais um id de `facility_vehicles` |
| `POST /vehicles` grava só a tabela própria | `POST /vehicles` cria `Asset` + `facility_vehicle_details` na mesma transação (RF-FAC-006) |
| `vehicle_id` em `facility_fuel_records` referenciava `facility_vehicles.id` | `vehicle_id` (renomeado para `asset_id` no payload de `fuel-records`, ver §4) referencia `assets.id` |

### 2.2 Endpoints

| Método | Rota | Nível | Descrição |
|---|---|---|---|
| `GET` | `/api/facilities/vehicles` | operate | Lista veículos — join `Asset` (`asset_type='vehicle'`) + `facility_vehicle_details`; filtros: `status` (de `Asset`), `fuel_type`, `document_expiring` (bool, algum `FacilityVehicleDocument` vencendo em ≤30 dias), `preventive_due` (bool) |
| `GET` | `/api/facilities/vehicles/:assetId` | operate | Detalhe completo (asset + extensão + documentos + preventiva) |
| `POST` | `/api/facilities/vehicles` | operate | Cria `Asset` (`asset_type='vehicle'`) + `facility_vehicle_details` numa transação |
| `PUT` | `/api/facilities/vehicles/:assetId` | operate | Atualiza campos da extensão (placa, RENAVAM, chassi, `tank_capacity_liters`, `required_cnh_category`) — campos de `Asset` (marca/modelo/status/responsável) atualizados via `PUT /api/assets/:id` existente, **não duplicados aqui** |
| `GET` | `/api/facilities/vehicles/:assetId/documents` | operate | Lista `FacilityVehicleDocument` (RF-FAC-007) |
| `POST` | `/api/facilities/vehicles/:assetId/documents` | operate | Cadastra documento com vencimento |
| `POST` | `/api/facilities/vehicles/:assetId/documents/:docId/renew` | operate | Marca `renovado`, cria novo `vigente` (histórico preservado, nunca `UPDATE` do vencido) |
| `POST` | `/api/facilities/vehicles/:assetId/documents/:docId/release` | **approve** | Libera saída com documento `seguro` vencido (RF-FAC-010) |

**8 endpoints** (4 alterados: `GET` lista/detalhe/`POST`/`PUT`; 4 novos:
documentos).

### 2.3 POST /api/facilities/vehicles — Request

```json
{
  "brand": "Fiat",
  "model": "Fiorino",
  "responsible_id": 88,
  "department_id": 17,
  "plate": "ABC1D23",
  "renavam": "01234567890",
  "chassi": "9BD17106JK1234567",
  "color": "branco",
  "year": 2022,
  "fuel_type": "flex",
  "current_km": 12000,
  "tank_capacity_liters": "48.00",
  "required_cnh_category": "B"
}
```

`brand`/`model`/`responsible_id`/`department_id` são repassados ao
`AssetService.create({ asset_type: 'vehicle', tag: plate, ... })` (a placa
vira `Asset.tag`/plaqueta se não houver uma anterior, RF-FAC-001) — nomes
de campo **idênticos** aos já usados por `CreateAssetUseCase`
(`server/src/modules/assets/application/use-cases/CreateAssetUseCase.ts`),
corrigido nesta reconciliação (`AuditorIntegrador`, 2026-08-07): a versão
anterior deste documento usava `responsible_employee_id` (inexistente no
serviço real) e campos `manufacture_year`/`model_year` duplicados quando
`facility_vehicle_details` tem uma única coluna `year` ("ano de fabricação/
modelo, unificado" — `BLOCO_4_FAC_MODELO_DADOS.md` §2.2); `chassis` também
foi corrigido para `chassi`, nome real da coluna na migration `000290`.
`fuel_type` (enum, **igual ao ENUM Postgres real** criado em
`facility_vehicle_details.fuel_type`, migration `000290`):
`gasoline`/`ethanol`/`diesel`/`flex`/`electric` — a versão anterior deste
documento citava `hybrid`/`other` (inexistentes no schema) e omitia
`ethanol` (existente e relevante no mercado brasileiro); corrigido.
`required_cnh_category` é `VARCHAR(5)` livre (não `ENUM` no banco), aceita
categorias combinadas do CTB (`A`/`B`/`C`/`D`/`E`/`AB`/`AC`/`AD`/`AE`), não
apenas as 5 simples.

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `plate`, `brand`, `model` ou `fuel_type` ausentes |
| 409 | `CONFLICT` | `plate` já cadastrada em outro veículo ativo |
| 422 | `BUSINESS_RULE_VIOLATION` | `department_id` informado não corresponde a departamento existente |

Resposta (`201`):
```json
{ "success": true, "data": { "asset_id": 501, "asset": { "id": 501, "asset_type": "vehicle", "status": "active", "tag": "ABC1D23", "brand": "Fiat", "model": "Fiorino", "..." : "..." }, "vehicle_detail": { "asset_id": 501, "plate": "ABC1D23", "renavam": "01234567890", "current_km": 12000, "tank_capacity_liters": "48.00", "required_cnh_category": "B" } } }
```

### 2.4 POST /api/facilities/vehicles/:assetId/documents — Request

```json
{ "doc_type": "crlv_licenciamento", "reference": "CRLV-2026-998877", "issuer": "DETRAN-SP", "valid_until": "2027-03-31", "cost": "158.23", "file_path": "https://.../crlv-abc1d23.pdf" }
```

`doc_type` (enum): `crlv_licenciamento`/`seguro`/`ipva`/`outro`.
`valid_until` obrigatório salvo `doc_type='outro'` sem vencimento aplicável
(campo `has_expiration: false` explícito nesse caso). Alertas 60/30/7 dias
e no vencimento agendados automaticamente (RF-FAC-008, job/verificação ao
acessar — mesmo padrão RNF-FAC-02).

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `doc_type` ausente, ou `valid_until` ausente sem `has_expiration:false` |
| 404 | `NOT_FOUND` | `assetId` não corresponde a veículo (`asset_type != 'vehicle'` ou sem extensão) |

### 2.5 POST /api/facilities/vehicles/:assetId/documents/:docId/release — Request

```json
{ "release_reason": "Apólice em processo de renovação junto à seguradora, protocolo 445566, saída autorizada por 48h" }
```
Grava `released_by = req.user.id`, `released_at = now()` (RF-FAC-010).
**Erro (400)** — `release_reason` ausente. **Erro (422/`BUSINESS_RULE_VIOLATION`)**
— documento informado não é `doc_type='seguro'` ou não está vencido (nada
a liberar).

---

## 3. Grupo 2 — Condutor (Autorização de Condução) — UC-58

Base: `/api/facilities/drivers`.

| Método | Rota | Nível | Descrição |
|---|---|---|---|
| `GET` | `/api/facilities/drivers` | operate | Lista (filtros: `authorized`, `cnh_expiring`, `employee_id`) |
| `GET` | `/api/facilities/drivers/:id` | operate | Detalhe |
| `POST` | `/api/facilities/drivers` | operate | Cadastra condutor a partir de `employee_id` |
| `PUT` | `/api/facilities/drivers/:id` | operate | Atualiza CNH (`cnh_number`/`cnh_category`/`cnh_valid_until`/`cnh_file_path`) |
| `POST` | `/api/facilities/drivers/:id/authorize` | operate | Autoriza (`authorized=true`, `authorized_by=req.user.id`) |
| `POST` | `/api/facilities/drivers/:id/suspend` | **approve** | Suspende (`authorized=false`), histórico de uso preservado |

**6 endpoints, todos novos.**

### 3.1 POST /api/facilities/drivers — Request

```json
{ "employee_id": 88, "cnh_number": "12345678900", "cnh_category": "B", "cnh_valid_until": "2029-05-10", "cnh_file_path": "https://.../cnh-88.pdf" }
```

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `employee_id`, `cnh_number`, `cnh_category` ou `cnh_valid_until` ausentes |
| 404 | `NOT_FOUND` | `employee_id` não existe |
| 409 | `CONFLICT` | `employee_id` já cadastrado como condutor |

Condutor terceirizado (`employee_id` obrigatório) está **fora de escopo
P0** — `[VERIFICAR COM GESTOR DE FACILITIES]`, RF-FAC-011. Resposta
(`201`) traz `authorized: false` por padrão — exige chamada explícita a
`.../authorize`.

### 3.2 POST /api/facilities/drivers/:id/suspend — Request

```json
{ "suspension_reason": "CNH cassada temporariamente — comunicado pelo próprio condutor em 2026-08-07" }
```
**Erro (400)** — `suspension_reason` ausente (RF-FAC-015).

---

## 4. Grupo 3 — Diário de Uso (Saída/Retorno) e Abastecimento — UC-58, fluxo mais crítico do bloco

Base: `/api/facilities/trips` (novo), `/api/facilities/fuel-records`
(existente, corrigido).

`FacilityVehicleTrip` é modelado como **máquina de estados de 2 passos**:
`scheduled → out → returned` (ou `canceled` a qualquer momento antes de
`returned`).

| Método | Rota | Nível | Descrição |
|---|---|---|---|
| `GET` | `/api/facilities/trips` | operate | Lista (filtros: `asset_id`, `driver_id`, `status`, `purpose`) |
| `GET` | `/api/facilities/trips/:id` | operate | Detalhe |
| `POST` | `/api/facilities/trips` | operate | Cria uso (`status='scheduled'` ou já `'out'` se `departure_km` informado) |
| `POST` | `/api/facilities/trips/:id/depart` | operate (ou **approve** se divergência de odômetro) | Registra saída — valida elegibilidade completa (E1–E4 do UC-58) |
| `POST` | `/api/facilities/trips/:id/return` | operate | Registra retorno — atualiza `current_km` |
| `POST` | `/api/facilities/trips/:id/cancel` | operate | Cancela uso `scheduled`/`out` com motivo |
| `GET` | `/api/facilities/fuel-records` | operate | Lista abastecimentos (mantido, filtros: `asset_id`, `full_tank`, `anomaly`) |
| `GET` | `/api/facilities/fuel-records/:id` | operate | Detalhe (mantido) |
| `POST` | `/api/facilities/fuel-records` | operate | **BREAKING**: `vehicle_id` renomeado para `asset_id`; nova validação de km/tanque |
| `PUT` | `/api/facilities/fuel-records/:id` | operate | Mantido — corrige apenas campos não recalculáveis (`invoice_ref`, `notes`); **não permite alterar `km_at_refuel`/`liters` após criado** (RNF-FAC-01) |

**10 endpoints** (2 alterados: `POST`/`PUT` fuel-records; 6 novos de
trips; 2 mantidos sem mudança de contrato: `GET` fuel-records).

### 4.1 POST /api/facilities/trips — Request

```json
{ "asset_id": 501, "driver_id": 12, "requested_by_department_id": 6, "purpose": "delivery", "destination": "Cliente XPTO — Guarulhos/SP", "scheduled_departure_at": "2026-08-10T08:00:00Z" }
```
`requested_by` sempre `req.user.id` (JWT), gravado automaticamente — não
aceito no body. `purpose` (enum): `delivery`/`executive`/`errand`/`other`.

**Erros (elegibilidade prévia, RF-FAC compostos, não bloqueiam o
agendamento, só a saída em `.../depart`):** nenhum — `POST /trips` só
agenda; toda a validação pesada (E1-E4 do UC-58) acontece em
`.../depart`, permitindo agendar mesmo com pendência a resolver antes da
saída de fato.

### 4.2 POST /api/facilities/trips/:id/depart — Request

```json
{ "departure_km": 12050, "fuel_level_out": "3/4", "notes": "Sem avarias visíveis" }
```

Validações em sequência (todas na mesma transação):
1. `Asset.status == 'active'` (não `in_maintenance`) — senão `E4`.
2. Nenhum `FacilityVehicleDocument.doc_type='crlv_licenciamento'` vencido —
   senão `E1`.
3. `FacilityVehicleDocument.doc_type='seguro'` vencido sem `released_by`
   preenchido para este uso — senão `E2` (`403`, exige `.../documents/:docId/release`
   primeiro, não é resolvido inline nesta chamada).
4. `FacilityDriver.authorized=true`, `cnh_valid_until >= hoje`,
   `cnh_category` compatível com `required_cnh_category` — senão `E2`
   (variante condutor).
5. Nenhum outro `FacilityVehicleTrip.status='out'` para o mesmo `asset_id`
   nem para o mesmo `driver_id` — senão `E3`.
6. `departure_km >= maior return_km conhecido` — se menor, exige
   `divergence_justification` no payload **e** nível `approve` (RF-FAC-017);
   sem os dois, `422`.

**Erros:**
| Código | `code` | Quando | Fluxo UC-58 |
|---|---|---|---|
| 422 | `BUSINESS_RULE_VIOLATION` | CRLV vencido | E1 |
| 403 | `FORBIDDEN` | Seguro vencido sem liberação registrada | E2 |
| 422 | `BUSINESS_RULE_VIOLATION` | Condutor não autorizado / CNH vencida / categoria incompatível | E2 (variante condutor) |
| 409 | `CONFLICT` | Uso em aberto para o veículo ou o condutor | E3 |
| 422 | `BUSINESS_RULE_VIOLATION` | `Asset.status='in_maintenance'` | E4 |
| 403 | `FORBIDDEN` | `departure_km` retroativo sem `divergence_justification` **e** nível `approve` | A1/RF-FAC-017 |

Resposta (`200`): `{ trip: { id, status: "out", departure_at, departure_km, driver_id, asset_id } }`.

### 4.3 POST /api/facilities/trips/:id/return — Request

```json
{ "return_km": 12180, "fuel_level_in": "1/2", "incidents": null }
```
**Erro (422/`BUSINESS_RULE_VIOLATION`)** — `return_km < departure_km` do
mesmo uso (RF-FAC-018, sem exceção/aprovação — diferente da saída, aqui
não há caminho alternativo). Efeito: `facility_vehicle_details.current_km`
= `return_km` (RF-FAC-020, único caminho legítimo junto com abastecimento —
RNF-FAC-01).

### 4.4 POST /api/facilities/fuel-records — Request (payload corrigido)

```json
{
  "asset_id": 501,
  "km_at_refuel": 12200,
  "liters": "35.500",
  "unit_price": "5.89",
  "full_tank": true,
  "invoice_ref": "NF-e 000123456",
  "trip_id": null
}
```
`total_cost` calculado no backend (`liters × unit_price`) se ausente,
mantendo o comportamento já correto da implementação atual. `trip_id`
(opcional) — **nota de reconciliação (`AuditorIntegrador`, 2026-08-07):**
a migration `000294` originalmente não criava essa coluna em
`facility_fuel_records` (API prometia campo sem sustentação no banco);
corrigido — `trip_id` agora existe como FK nullable para
`facility_vehicle_trips.id`.

**Erros:**
| Código | `code` | Quando | RF |
|---|---|---|---|
| 422 | `BUSINESS_RULE_VIOLATION` | `km_at_refuel < maior(current_km, return_km do uso aberto/mais recente)` | RF-FAC-022 (corrige achado 1 da verificação) |
| 422 | `BUSINESS_RULE_VIOLATION` | `liters > tank_capacity_liters` cadastrada | RF-FAC-024 (corrige achado 3) |
| 400 | `VALIDATION_ERROR` | `asset_id`, `km_at_refuel` ou `liters` ausentes |
| 404 | `NOT_FOUND` | `asset_id` não corresponde a veículo cadastrado |

Efeito: `current_km` atualizado para `max(current_km, km_at_refuel)`
(RF-FAC-023). Resposta (`201`) inclui `consumption_alert: boolean` — `true`
se consumo km/l entre dois abastecimentos consecutivos `full_tank=true`
está fora de ±30% da média histórica do veículo (RF-FAC-026, P1 — pode
retornar `null` se não houver dois `full_tank` anteriores para comparar).

---

## 5. Grupo 4 — Multa (Prazo Legal de Indicação de Condutor) — UC-59

Base: `/api/facilities/fines`. Fluxo de maior exposição legal do bloco,
mesmo padrão de máquina de estados fatal do Bloco 3 JUR (`PrazoProcessual`),
mas de um passo só (sem dupla confirmação — decisão deste contrato: a
indicação de condutor não exige segundo confirmante distinto, porque quem
formaliza o protocolo junto ao órgão já é ato único do Supervisor,
diferente do prazo processual do JUR que tem risco de erro de dupla
digitação — RF-FAC-032 já exige confirmação humana explícita, suficiente).

| Método | Rota | Nível | Descrição |
|---|---|---|---|
| `GET` | `/api/facilities/fines` | operate | Lista (filtros: `asset_id`, `indication_status`, `status`, `deadline_expiring_days`) |
| `GET` | `/api/facilities/fines/:id` | operate | Detalhe |
| `POST` | `/api/facilities/fines` | operate | Registra multa — calcula `indication_deadline` automaticamente |
| `GET` | `/api/facilities/fines/:id/suggested-driver` | operate | Sugere `identified_driver_id` cruzando `infraction_at` + `asset_id` com `FacilityVehicleTrip` (RF-FAC-032) |
| `POST` | `/api/facilities/fines/:id/indicate` | **approve** | Confirma indicação (ato humano, nunca automático) |
| `POST` | `/api/facilities/fines/:id/appeal` | operate | Marca `status='appealed'` |
| `POST` | `/api/facilities/fines/:id/pay` | **approve** | Marca `status='paid'`, gera título em `accounts_payable` categoria "Frota" |
| `POST` | `/api/facilities/fines/:id/charge-driver` | operate | Registra `charge_to_driver=true` + `financial_ref` (vínculo RH/Financeiro) |

**8 endpoints, todos novos.**

### 5.1 POST /api/facilities/fines — Request

```json
{
  "asset_id": 501,
  "infraction_at": "2026-07-15T14:32:00Z",
  "location": "Marginal Tietê, km 12 — São Paulo/SP",
  "infraction_code": "7455-0",
  "description": "Excesso de velocidade até 20%",
  "amount": "195.23",
  "points": 4,
  "notice_received_at": "2026-08-01"
}
```
`indication_deadline` calculado automaticamente = `notice_received_at + 30
dias` (parametrizável, default CTB Art. 257 §7º — RF-FAC-029). Alertas
D-15/D-7/D-3/D-1 agendados ao Supervisor FAC (RF-FAC-030).

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `asset_id`, `infraction_at`, `infraction_code`, `amount` ou `notice_received_at` ausentes |
| 404 | `NOT_FOUND` | `asset_id` não corresponde a veículo cadastrado |

Resposta (`201`) inclui `indication_deadline` calculado e
`suggested_driver_id` já resolvido inline (mesma lógica de
`.../suggested-driver`, para não exigir 2 chamadas no fluxo feliz).

### 5.2 POST /api/facilities/fines/:id/indicate — Request

```json
{ "identified_driver_id": 12, "indicated_at": "2026-08-20", "protocol_number": "SPTRANS-2026-889900" }
```
`indicated_by = req.user.id` (JWT). **Erro (422/`BUSINESS_RULE_VIOLATION`)**
— `indication_status` já `expired_nic` (indicação fora do prazo não pode
mais ser "confirmada" como tempestiva — o sistema aceita o registro tardio
apenas como `indicated_at` informativo, mas mantém `indication_status:
'expired_nic'` permanentemente, nunca reverte para `indicated` — E1/RF-FAC-031).

### 5.3 Transição automática para `expired_nic` (E1, RF-FAC-031)

Não é uma rota — verificação ao acessar (mesmo padrão RNF-FAC-02) ou
rotina agendada: `indication_status` muda para `expired_nic`
automaticamente quando `hoje > indication_deadline` e `indicated_at IS
NULL`. Nunca excluída (RF-FAC-035).

### 5.4 POST /api/facilities/fines/:id/pay — Request

```json
{ "payment_date": "2026-08-25", "cost_center_id": 4 }
```
Efeito: chama `AccountPayableService.create({ category: "Frota", asset_id,
cost_center_id, amount, description: "Multa " + infraction_code })`
(RF-FAC-034/058) — nunca `AccountPayable.create()` direto do módulo
`facilities`.

---

## 6. Grupo 5 — Manutenção Predial via `maintenance_orders` estendida (D-1) — UC-60

Base: `/api/facilities/maintenance-tickets` (namespace de leitura/escrita
sob RBAC de `facilities`, mas persistindo em `maintenance_orders`
existente — ver §0.3 para a decisão de desenho).

| Método | Rota | Nível | Descrição |
|---|---|---|---|
| `GET` | `/api/facilities/maintenance-tickets` | `authorizeModule('manutencao') OR authorizeModule('facilities')` | Lista chamados prediais (`facility_area_id IS NOT NULL`) — filtros: `facility_specialty`, `priority`, `status`, `facility_area_id` |
| `GET` | `/api/facilities/maintenance-tickets/:id` | idem | Detalhe |
| `POST` | `/api/facilities/maintenance-tickets` | `authenticate` apenas (auto-serviço, RF-FAC-040) | Abre chamado — qualquer funcionário |
| `POST` | `/api/facilities/maintenance-tickets/:id/triage` | operate | Classifica prioridade; `priority='emergency'` dispara notificação imediata (+ SST se risco pessoal) |
| `POST` | `/api/facilities/maintenance-tickets/:id/execute` | operate | Registra `service_performed`, `parts_cost`/`labor_cost`, consome insumo via `/api/inventory` (§7) |
| `POST` | `/api/facilities/maintenance-tickets/:id/close` | operate (solicitante ou Supervisor) | Encerra — valida execução registrada |
| `POST` | `/api/facilities/maintenance-tickets/:id/generate-preventive` | operate | Gera rotina preventiva usando `frequency_days` (RF-FAC-043) |

**7 endpoints, todos novos** (o model subjacente `maintenance_orders` é
reutilizado, não é endpoint duplicado do módulo MANUT — este é o namespace
FAC sobre o mesmo dado).

### 6.1 POST /api/facilities/maintenance-tickets — Request

```json
{ "facility_area_id": 14, "facility_specialty": "electrical", "asset_id": null, "description": "Tomada com fio exposto próxima à bancada 3", "reported_by_employee_id": null }
```
`reported_by_employee_id` **não é aceito no body** — sempre resolvido de
`req.user.id` (o funcionário autenticado é o solicitante; ver padrão de
identidade do JWT). `facility_specialty` (enum): `electrical`/`plumbing`/
`civil`/`hvac`/`roofing`/`gardening`/`other`. `asset_id` opcional
(RF-FAC-039 — nulo quando não há ativo físico associado).

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `facility_area_id`, `facility_specialty` ou `description` ausentes |
| 404 | `NOT_FOUND` | `facility_area_id` não existe |

Resposta (`201`): `status: "open"` (mesmo enum já existente de
`maintenance_orders`), `priority: "normal"` (default, ajustado na triagem).

### 6.2 POST /api/facilities/maintenance-tickets/:id/triage — Request

```json
{ "priority": "emergency", "personal_safety_risk": true }
```
**Bloqueio de fluxo (E2 do UC-60, não apenas alerta):**
`personal_safety_risk=true` **exige** que a resposta inclua confirmação de
notificação enviada ao módulo SST antes de permitir avançar para
`.../execute` — a checagem é feita em `.../execute` (rejeita `422` se
`personal_safety_risk=true` e `sst_notified_at IS NULL`), não apenas nesta
rota.

### 6.3 POST /api/facilities/maintenance-tickets/:id/execute — Request

```json
{
  "service_performed": "Substituição de tomada e revisão do circuito",
  "parts_cost": "45.00",
  "labor_cost": "0.00",
  "supplies_consumed": [ { "item_id": 890, "quantity": 2, "unit": "un" } ]
}
```
`supplies_consumed` gera chamada a `InventoryService.registerConsumption`
(§7) — nunca escrita direta em tabela de estoque pelo módulo `facilities`.

**Erro (422/`BUSINESS_RULE_VIOLATION`, E2 do UC-60)** — `personal_safety_risk=true`
sem notificação SST prévia registrada.

---

## 7. Grupo 6 — Insumos: Sem Estoque Próprio (D-3, apenas documentação de uso)

**Nenhum endpoint novo criado neste bloco.** Facilities reutiliza:

- `GET/POST /api/inventory/movements` (existente) — baixa de consumo de
  insumo predial, com `category: "Consumo Interno/Facilities"` (categoria
  nova a criar no seed de categorias de item, não uma rota nova) e
  `reference_type: "facility_maintenance_ticket"` / `reference_id: <id>`
  quando a saída é para executar um chamado (RF-FAC-042), ou
  `reference_type: "facility_cleaning_execution"` quando é consumo de
  material de limpeza.
- `POST /api/purchase-requisitions` (existente) — reposição de insumos,
  com `origin: "facilities"` e `department_id` = Facilities (RF-FAC-052).
  Facilities **requisita**; Compras cotiza/compra/recebe — nenhuma etapa
  de compra em si é responsabilidade deste módulo.

`InventoryService`/`PurchaseRequisitionService` (interfaces internas do
módulo `facilities`, §"Estrutura de módulo" acima) são os únicos pontos de
acoplamento — chamam os use-cases reais desses módulos, nunca Sequelize
direto de `Item`/`InventoryMovement`/`PurchaseRequisition`.

---

## 8. Grupo 7 — Visitantes e Correspondência — UC-61

Base: `/api/facilities/visitors`, `/api/facilities/visits`,
`/api/facilities/correspondences`.

| Método | Rota | Nível | Descrição |
|---|---|---|---|
| `GET` | `/api/facilities/visitors` | operate | Lista visitantes cadastrados (busca por nome/documento) |
| `POST` | `/api/facilities/visitors` | operate | Cadastra visitante (ou reaproveita se `document` já existe) |
| `GET` | `/api/facilities/visits` | operate | Lista visitas (filtros: `status`, `host_employee_id`, `onsite_overdue`) |
| `GET` | `/api/facilities/visits/:id` | operate | Detalhe |
| `POST` | `/api/facilities/visits` | operate | Check-in (cria/reaproveita `Visitante` + `Visita`, `status='onsite'`) |
| `POST` | `/api/facilities/visits/:id/checkout` | operate | Check-out (`checkout_at`, devolução de crachá) |
| `GET` | `/api/facilities/visits/onsite-overdue` | operate | Dashboard: `status='onsite'` além do horário-limite configurado (E1/RF-FAC-046) |
| `GET` | `/api/facilities/correspondences` | operate | Lista correspondências (filtros: `delivered`, `recipient_employee_id`, `recipient_department_id`) |
| `POST` | `/api/facilities/correspondences` | operate | Registra recebimento |
| `POST` | `/api/facilities/correspondences/:id/deliver` | operate | Registra entrega (`delivered_at`, `delivered_to`) |

**10 endpoints, todos novos** (7 visitante/visita — RF-FAC-044/047; 3
correspondência — RF-FAC-048).

### 8.1 POST /api/facilities/visits — Request

```json
{ "visitor": { "name": "Maria Souza", "document": "123.456.789-00", "company": "Fornecedor XPTO", "phone": "(11) 98765-4321" }, "host_employee_id": 45, "scheduled_at": null, "badge_number": "V-0231", "purpose": "Reunião comercial", "areas_authorized": ["recepcao", "sala_reuniao_2"] }
```
Se `visitor.document` já existe em `facility_visitors`, reaproveita o
registro (não duplica cadastro) — apenas cria nova `Visita`.

**Erro (400/`VALIDATION_ERROR`, E2 do UC-61)** — `visitor.name`,
`visitor.document` ou `host_employee_id` ausentes; bloqueia o check-in
até completos (RF-FAC-045).

### 8.2 LGPD — retenção (RF-FAC-047, RNF-FAC-04)

**Nenhuma rotina de expurgo automática é criada neste contrato** — dados
pessoais de visitante (`name`, `document`, `phone`, `photo_path`)
permanecem até definição de política com Compliance
(`[VERIFICAR COM GESTOR DE FACILITIES]`). O endpoint `GET
/api/facilities/visitors` **não é exposto a nenhum público além de
`facilities:operate`** — não há listagem pública de dados pessoais (item
5 do checklist deste agente), e a resposta de `GET /visitors` (listagem)
omite `document`/`phone` completos (mascarados, ex. `"***.***.789-00"`),
seguindo o mesmo padrão de "campo omitido em listagem, completo só em
detalhe" do Bloco 3 JUR (§0.4 daquele contrato) — aqui aplicado por
analogia, decisão deste contrato.

### 8.3 GET /api/facilities/visits/onsite-overdue — Response (200)

```json
{ "success": true, "data": [ { "id": 90, "visitor_id": 12, "visitor_name": "Maria Souza", "host_employee_id": 45, "checkin_at": "2026-08-07T08:10:00Z", "hours_onsite": 11.4, "overdue": true } ] }
```
Horário-limite configurável (não hard-code) — RF-FAC-046.

---

## 9. Grupo 8 — Limpeza: Plano × Execução — UC-62

Base: `/api/facilities/cleaning-schedules` (existente, redesenhado como
**plano**), `/api/facilities/cleaning-executions` (novo).

| Método | Rota | Nível | Descrição |
|---|---|---|---|
| `GET` | `/api/facilities/cleaning-schedules` | operate | Lista planos (mantido) |
| `GET` | `/api/facilities/cleaning-schedules/:id` | operate | Detalhe (mantido) |
| `POST` | `/api/facilities/cleaning-schedules` | **approve** (BREAKING: era `operate`) | Cria plano — `facility_area_id` FK quando a área existe no cadastro, `area` (texto livre) como fallback (§6.3 dos requisitos) |
| `PUT` | `/api/facilities/cleaning-schedules/:id` | **approve** (BREAKING: era `operate`) | Atualiza plano |
| `GET` | `/api/facilities/cleaning-executions` | operate | Lista execuções (filtros: `plan_id`, `ok`, `period`) |
| `POST` | `/api/facilities/cleaning-executions` | operate | Registra execução contra um plano |
| `GET` | `/api/facilities/cleaning-schedules/:id/adherence` | operate | KPI de aderência (`execuções ÷ previstas no período`, RF-FAC-050) |

**7 endpoints** (2 alterados — mudança de nível `operate→approve`,
BREAKING CHANGE de RBAC sinalizada explicitamente, corrige BR-FAC-015; 2
mantidos; 3 novos de execução/KPI).

### 9.1 POST /api/facilities/cleaning-schedules — Request

```json
{ "facility_area_id": 14, "area": null, "frequency": "weekly", "responsible_employee_id": 30, "active": true }
```
`facility_area_id` **ou** `area` (texto livre, nome de coluna real em
`facility_cleaning_schedules` — corrigido nesta reconciliação, a versão
anterior usava `area_free_text`, inexistente no schema), nunca ambos
nulos, decisão `[422/BUSINESS_RULE_VIOLATION]` se ambos ausentes. Quando
`facility_area_id` é informado, `area` continua obrigatório também (texto
livre sempre preenchido, mesmo com FK — `BLOCO_4_FAC_MODELO_DADOS.md` §8,
"para não quebrar telas existentes que leem o texto livre").

### 9.2 POST /api/facilities/cleaning-executions — Request

```json
{ "plan_id": 7, "executed_at": "2026-08-07T09:00:00Z", "ok": true, "notes": null, "supplies_consumed": [ { "item_id": 1023, "quantity": 1, "unit": "un" } ] }
```
`executed_by = req.user.id` (JWT). `supplies_consumed` opcional — mesma
integração de `InventoryService` do §7/§6.3.

---

## 10. Grupo 9 — Reserva de Recursos (P2, sem UC formal dedicado — §9 dos requisitos)

Base: `/api/facilities/resource-reservations`.

| Método | Rota | Nível | Descrição |
|---|---|---|---|
| `GET` | `/api/facilities/resource-reservations` | operate | Lista (filtros: `resource_type`, `facility_area_id`, `asset_id`, `status`, `period`) |
| `GET` | `/api/facilities/resource-reservations/:id` | operate | Detalhe |
| `POST` | `/api/facilities/resource-reservations` | operate | Cria reserva — rejeita sobreposição de intervalo |
| `POST` | `/api/facilities/resource-reservations/:id/cancel` | operate | Cancela/no-show, libera o horário |

**4 endpoints, todos novos.**

### 10.1 POST /api/facilities/resource-reservations — Request

```json
{ "resource_type": "room", "facility_area_id": 8, "asset_id": null, "starts_at": "2026-08-10T14:00:00Z", "ends_at": "2026-08-10T15:00:00Z", "subject": "Reunião de fechamento mensal" }
```
`resource_type` (enum): `room`/`equipment` — exatamente um de
`facility_area_id`/`asset_id` preenchido conforme o tipo. `reserved_by =
req.user.id` (JWT).

**Erro (409/`CONFLICT`, RF-FAC-055):**
```json
{ "success": false, "error": { "code": "CONFLICT", "message": "O recurso já está reservado nesse intervalo.", "details": { "rule": "BR-FAC-014", "conflicting_reservation_id": 41 } } }
```
Regra: `starts_at < other.ends_at AND ends_at > other.starts_at` contra
toda reserva `status='confirmed'` do mesmo recurso.

---

## 11. Resumo de contagem de endpoints

| Grupo | Novos | Alterados (breaking) | Mantidos sem mudança |
|---|---|---|---|
| 1. Frota — Veículo/Documento (§2) | 4 (documentos) | 4 (lista/detalhe/create/update de vehicles) | 0 |
| 2. Condutor (§3) | 6 | 0 | 0 |
| 3. Diário de Uso + Abastecimento (§4) | 6 (trips) | 2 (`POST`/`PUT` fuel-records) | 2 (`GET` fuel-records) |
| 4. Multa (§5) | 8 | 0 | 0 |
| 5. Manutenção Predial (§6) | 7 | 0 | 0 |
| 6. Insumos (§7) | 0 (reuso de `/api/inventory`, `/api/purchase-requisitions`) | 0 | 0 |
| 7. Visitantes/Correspondência (§8) | 10 | 0 | 0 |
| 8. Limpeza plano×execução (§9) | 3 | 2 (RBAC `operate→approve`) | 2 |
| 9. Reserva de Recursos (§10) | 4 | 0 | 0 |
| **Total** | **48** | **8** | **4** |

**60 endpoints no total do contrato** (48 novos + 8 alterados + 4
mantidos sem mudança de contrato — `GET /fuel-records`, `GET
/fuel-records/:id`, `GET /cleaning-schedules`, `GET
/cleaning-schedules/:id`).

---

## 12. Decisões de contrato (resumo)

1. **D-2 aplicado como breaking change real**, não migração silenciosa —
   `id` do recurso `vehicles` passa a ser `asset_id`; tela quebra e é
   corrigida junto (RF-FAC-005 permite explicitamente).
2. **Chamado predial: filtro por categoria sobre `maintenance_orders`
   existente** (não endpoint espelhado) + **abertura liberada a qualquer
   autenticado**, reaproveitando o precedente de auto-serviço de TI.
3. **`approve` cobre**: liberação de saída com seguro vencido, aprovação
   de divergência de odômetro, suspensão de condutor, indicação/pagamento
   de multa, e — decisão nova deste contrato — **plano de limpeza**
   (criação/atualização de `cleaning-schedules`), corrigindo a divergência
   de BR-FAC-015 apontada na verificação.
4. **Insumos: zero endpoints próprios** — Facilities só consome
   `/api/inventory` e `/api/purchase-requisitions` via interface de
   serviço interna, nunca acesso direto a `Item`/`InventoryMovement`.
5. **Multa: indicação sem dupla confirmação** (diferente do prazo fatal do
   JUR) — decisão justificada por não haver o mesmo risco de erro humano
   de "confirmar a própria baixa"; RF-FAC-032 já exige ato humano explícito
   único.
6. **Visitante: dado pessoal mascarado em listagem**, nunca exposto em
   massa — aplicação por analogia do padrão §0.4 do Bloco 3 JUR.

---

## 13. Pendências para o `AdmDBA` / próxima passada

1. ~~Nome definitivo das 10 tabelas novas~~ — **CONFIRMADO** contra as
   migrations reais (`AuditorIntegrador`, 2026-08-07): `facility_vehicle_details`,
   `facility_vehicle_documents`, `facility_drivers`,
   `facility_vehicle_trips`, `facility_fines`,
   `facility_cleaning_executions`, `facility_visitors`, `facility_visits`,
   `facility_correspondence` (singular — corrigido, ver nota no topo do
   documento), `facility_resource_reservations`.
2. Script de migração de dado `facility_vehicles → assets +
   facility_vehicle_details` (RNF-FAC-03) — schema e dado, não só schema.
3. Colunas novas em `maintenance_orders`
   (`facility_specialty`/`facility_area_id`/`next_maintenance_km`) —
   nullable, não quebram uso atual de MANUT.
4. ~~Confirmar caminho real de `maintenance_orders` no código~~ —
   **CONFIRMADO** (`AuditorIntegrador`, 2026-08-07): `server/src/modules/maintenance/`,
   ver §0.3 acima.
5. Categoria "Consumo Interno/Facilities" a criar no seed de categorias de
   item (não é migration de schema, é dado de seed).
6. `jur`-style `AlertConfigService`/janelas parametrizáveis (60/30/7 dias
   documento, 60/30/7 CNH, D-15/D-7/D-3/D-1 multa, horário-limite
   visitante) — decisão de onde vive a configuração (tabela própria vs.
   `.env`) cabe ao `AdmDBA`/`programador`, mas o contrato exige que sejam
   parametrizáveis, nunca hard-code (RF-FAC-008/014/030/046).

---

## Referências

- `docs/business/BLOCO_4_FAC_REQUISITOS.md` — 60 RF-FAC, UC-58 a UC-62.
- `docs/business/BLOCO_4_FAC_VERIFICACAO.md` — auditoria que motivou a
  correção (GAPS CRÍTICOS).
- `docs/business/BLOCO_3_JUR_API.md` — mesmo padrão estrutural de contrato.
- `server/src/modules/facilities/` — código atual a corrigir.
- `server/src/models/Asset.ts`, `ItSoftwareLicenseDetail.ts`,
  `MaintenanceOrder.ts` — precedentes de integração/extensão 1:1.
- `server/src/shared/domain/accessModules.ts` — catálogo RBAC (uso do
  nível `approve` já suportado genericamente, aplicação nova neste bloco).
- `docs/arquitetura/API.md` — a atualizar com a seção Facilities quando
  este bloco for consolidado (fora do escopo deste passo).

**Fim do BLOCO 4 (correção) — Contrato de API.**
