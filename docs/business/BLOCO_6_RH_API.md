# BLOCO 6 — Módulo RH (lacunas) — Contrato de API

**Departamento:** 02 — RH.
**Natureza deste documento:** greenfield sobre lacunas de um módulo que já
existe parcialmente. `server/src/modules/employees/` (CRUD de `Employee`,
segregação de campo sensível BR-RH-020) e `/api/departments` já estão em
produção e **não são reescritos aqui** — apenas estendidos. Este é o sexto e
último bloco do pipeline de módulos novos: SST →
TI → Jurídico → Facilities → Marketing → **RH (este documento)**.
**Insumo:** `docs/business/BLOCO_6_RH_REQUISITOS.md` (81 RF-RH, UC-67 a
UC-71, RNF-RH-01..05).
**Autor:** `ArquitetoSoftwareAPI`.
**Data:** 2026-08-09.
**Status:** 🟡 Contrato pronto para modelagem de banco em paralelo
(`AdmDBA`, trabalhando a partir do mesmo documento de requisitos) e
implementação futura (`programador`). **Nenhum código foi alterado neste
passo.**

Base URL do módulo novo: `/api/rh/*` (novo módulo
`server/src/modules/rh/`), montado ao lado do módulo já existente
`/api/employees/*` (não substituído). Duas rotas cross-módulo são
reaproveitadas por leitura, nunca reimplementadas: `GET
/api/sst/aso/status/:employeeId` (RF-SST-021) e `GET
/api/sst/cipa/stability/:employeeId` (RF-SST-031) — ambas já aceitam módulo
`sst` **ou** `rh` (`requireSstOrRh`, `server/src/modules/sst/presentation/
routes/sst.ts`), confirmado por leitura de código nesta modelagem.

**Autenticação:** `Authorization: Bearer <JWT>` em todas as rotas
(`authenticate`). Identidade de quem executa a ação **sempre** vem de
`req.user.id` (nunca do body) — aplica-se a `esocial_*_confirmed_by`,
`importado_por`, `budget/decision`-equivalentes deste módulo
(`s2200_confirmed_by`, `s2299_confirmed_by`, `s2230_confirmed_by`,
`terminated_by`, `document_uploaded_by`). Referência a pessoa em qualquer
payload usa exclusivamente `employee_id`/`user_id` (nunca duplica nome/CPF —
quem quiser exibir, resolve via `GET /api/employees/:id`, já com a
segregação de campo aplicada).

**Tipos de dado (premissa de schema, a cruzar com `AdmDBA`):** todas as
entidades **novas** deste bloco usam PK/FK `INTEGER autoIncrement`,
consistente com `employees.id`/`departments.id`/`users.id`/`cost_centers.id`
(confirmados `INTEGER` por leitura de `server/src/models/Employee.ts`,
`Department.ts`, `Asset.ts` nesta modelagem) — **nunca `UUID`** neste
módulo (diferente de `items.id`/`clients.id`, que são `UUID` em outros
módulos; RH não referencia nenhum dos dois diretamente). Valores monetários
(`salary`, `discount_value`, `company_cost_value`, `bruto`, `encargos`,
`liquido`, `custo_total`, `salary_range_min/max`) são `DECIMAL` expostos
como **string** no JSON (nunca `number`, mesma decisão do resto do
projeto). Datas de vigência/planejamento (`start_date`, `hire_date`,
`competencia`) são `DATEONLY` (`"YYYY-MM-DD"`, exceto `competencia` que é
`"YYYY-MM"`); timestamps de evento (`qualified_at`-equivalentes deste
módulo: `handoff_at`, `esocial_*_confirmed_at`, `approved_at`) são
`TIMESTAMP`.

---

## 0. RBAC — desenho por entidade (decisão deste contrato)

O módulo `rh` já existe no catálogo (`server/src/shared/domain/
accessModules.ts`), mas hoje só é usado para **segregação de campo** em
`GET /api/employees` (rota aberta a qualquer autenticado, campos sensíveis
condicionados a `hasFullEmployeeAccess`). Este bloco **preserva esse
desenho em `employees`, sem alterá-lo**, mas adota um desenho diferente —
**bloqueio de rota inteira** — para as 15 entidades novas deste bloco,
pelo mesmo racional já usado em `sst`/`ti`/`juridico`: a maioria dos dados
novos (contrato de experiência, demissão, afastamento, benefício, salário
histórico, folha importada) é tão ou mais sensível que os campos já
protegidos em `Employee`, e não faz sentido abrir a listagem básica dessas
entidades a "qualquer autenticado" como faz `GET /api/employees` (que só
existe aberta por causa de consumidores legítimos de nome/cargo, ex.:
seletor de operador do apontamento — nenhum desses consumidores precisa de
`VacationSchedule`/`Absence`/`TerminationProcess`).

**Regra geral (todas as entidades novas, exceto os 2 reforços abaixo):**
- Leitura: `authorizeModule('rh')` (nível `operate` implícito) — bloqueia a
  rota inteira para quem não tem o módulo `rh` atribuído.
- Escrita comum (criar/atualizar/registrar status): `authorizeModule('rh',
  'operate')`.
- Ação de maior impacto/irreversível: `authorizeModule('rh', 'approve')` —
  usado em exatamente 2 ações (mesmo critério de parcimônia de
  `facilities`/`contabilidade`/`tesouraria`, "approve só onde fecha/desfaz
  algo de alto impacto"):
  1. `POST /termination-processes/:id/conclude` (RF-RH-022 — seta
     `employees.status='fired'` e **desativa o login do sistema** no mesmo
     ato transacional; é a ação de maior blast radius de todo o bloco).
  2. `PATCH /employee-contracts/:id/decision` quando `decision='rescindir'`
     (encaminha para demissão por término de experiência) — mesmo nível de
     `approve` por consistência com a decisão 1, já que ambas terminam o
     vínculo; `decision='prorrogar'`/`'efetivar'` continuam em `operate`.

**Dois reforços de acesso além do padrão `rh` (RNF-RH-01, RF-RH-072 —
decisão explícita deste contrato, delegada pelo requisito ao arquiteto):**

1. **`Absence.cid`** — dado de saúde (LGPD art. 5º II). O restante do
   registro de `Absence` já está atrás de `authorizeModule('rh')` (não é
   aberto como `Employee`); o campo `cid` especificamente exige um nível
   **acima** de `rh:operate` — modelado como `rh:approve` (reaproveita o
   nível já existente no catálogo, sem criar submódulo novo). Segue
   exatamente o padrão de `employeeSensitiveFields.ts`: a rota nunca
   retorna 403 por causa do `cid` isoladamente — o campo é omitido do
   payload quando `req.user.permissions.rh !== 'approve'` e `role !==
   'admin'` (novo helper `absenceSensitiveFields.ts`, mesmo formato de
   `sanitizeEmployee`/`hasFullEmployeeAccess`, ver §7.1).
2. **`PayrollImportItem.bruto`/`.liquido`** (RF-RH-072) — dado financeiro
   individual de alta sensibilidade. Rota `GET
   /api/rh/payroll-imports/:batchId/items` já exige `authorizeModule('rh')`
   para existir na resposta; os campos `bruto`/`liquido` especificamente
   exigem `role==='admin'` **OU** `req.user.permissions.financeiro`
   (qualquer nível) — **intersecção** de `rh` (já satisfeita pela rota) com
   `financeiro`, não união. Como `authorizeAnyModule` é composição **OR** e
   não serve aqui, a checagem é feita dentro do use case/mapper (novo
   helper `payrollImportSensitiveFields.ts`, mesmo padrão), nunca em
   middleware de rota — mesma técnica de campo condicionalmente omitido, não
   403. `custo_total`/`department_id`/`cost_center_id` (agregáveis, sem
   dado individual de proventos) permanecem visíveis a qualquer `rh:operate`
   (RF-RH-073 — agregação por centro de custo é segura).

**⚠️ [ADICIONADO pelo `AuditorIntegrador`, 2026-08-09] Conflito de
semântica em `rh:approve` — pendência de decisão do dono do produto, NÃO
resolvida nesta auditoria:** este contrato usa o nível `approve` do módulo
`rh` para **dois significados diferentes e não relacionados**:
(1) autorização para executar uma ação de alto impacto — concluir
demissão, decidir rescisão de contrato de experiência (uso "clássico" de
`approve`, consistente com `contabilidade`/`tesouraria`/`juridico`); e
(2) nível de leitura reforçada para dado sensível de saúde (`Absence.cid`)
e dado financeiro individual (`PayrollImportItem.bruto`/`liquido`).
Reaproveitar o mesmo flag para as duas coisas significa que **todo usuário
autorizado a concluir demissões automaticamente enxerga CID e
salário líquido individual de qualquer funcionário**, e vice-versa —
correlação que nenhum dos dois RFs de origem (RF-RH-022 vs.
RNF-RH-01/RF-RH-072) pediu. O documento de requisitos (§6.3/6.4) já
delegava essa decisão ao `ArquitetoSoftwareAPI` sem fechá-la; o
`ArquitetoSoftwareAPI`, por sua vez, tomou a decisão de reaproveitar
`approve` mas marcou em §21 item 4 que é reversível. O `AuditorIntegrador`
**não decide isso** — apenas formaliza as opções concretas para o dono do
produto escolher antes do passo 4 (`programador`):
- **Opção A** — criar um nível novo no catálogo (`AccessModuleLevel` hoje é
  só `'operate' | 'approve'` em `accessModules.ts`; adicionar um terceiro
  valor, ex. `'sensitive'`, é mudança de tipo em arquivo compartilhado por
  todos os módulos — maior blast radius, mas semântica limpa).
- **Opção B** — exigir dois módulos simultaneamente (`rh` **e**
  `financeiro`/`admin` para `bruto`/`liquido` — já é o desenho descrito em
  §15.2 para `PayrollImportItem`; estender o mesmo padrão de interseção
  para `Absence.cid`, ex. `rh` **e** `sst`, já que ambos tratam dado de
  saúde — elimina a colisão com `approve` sem mudar o catálogo).
- **Opção C** — manter `rh:approve` para as 2 ações de alto impacto (demissão/
  rescisão) e usar a Opção B (interseção de módulo) só para os 2 campos
  sensíveis, evitando qualquer reuso ambíguo de `approve`.
Recomendação do `AuditorIntegrador`: **Opção C** — menor mudança
estrutural (não altera `AccessModuleLevel`), resolve a colisão sem exigir
retrofit de perfis de acesso já configurados para `rh:approve` como "pode
concluir demissão", e segue o precedente já existente de interseção
(`PayrollImportItem`, §15.2). Decisão final, porém, é do dono do produto.

**Auto-serviço do funcionário — decisão deste contrato: NÃO existe nesta
rodada.** `docs/business/BLOCO_6_RH_REQUISITOS.md` não contém nenhum RF que
peça ao próprio colaborador solicitar/consultar seus próprios dados de RH
via API (diferente do precedente de chamado de TI/predial). O padrão
`authorizeSelfOrModule` (Bloco 2 TI) e `authorizeAnyModule` (Bloco 4 FAC)
foram avaliados e **não são necessários** aqui — nenhuma rota deste bloco
usa posse (`ownershipCheck`) nem composição OR de módulos, com uma exceção
pontual: `POST /termination-processes/:id/asset-checklist/sync` (§4.4) usa
leitura cross-módulo de `Asset.responsible_id`, mas por *adapter* de
serviço (padrão já usado em `modules/marketing/`), não por RBAC composto.
Se o RH decidir abrir um portal de autoatendimento do colaborador em uma
rodada futura (ex.: solicitar férias), é uma extensão de contrato nova, não
implícita neste documento.

---

## 1. Padrão de erro e transversais

Idêntico ao restante do projeto — `AppError`/subclasses (`ValidationError`
400/422 conforme o caso, `NotFoundError` 404, `UnauthorizedError` 401,
`ForbiddenError` 403, `ConflictError` 409, `BusinessRuleError` 422) tratadas
pelo `errorHandler` central, shape `{ success: false, error: { code,
message, details } }`, nunca stack trace ao cliente (ver `docs/arquitetura/
API.md` "Respostas Padrão").

**Sem exclusão física** (CLAUDE.md §7, RNF-RH-04): nenhum recurso deste
módulo ganha rota `DELETE`. Toda mudança de estado usa novo status/novo
registro histórico (`EmployeeContract`, `EmployeeJobHistory`,
`VacationAccrualPeriod`, `TerminationProcess` são explicitamente imutáveis
por natureza de auditoria trabalhista — RF-RH-012/040/054/065).

**Auditoria:** toda escrita deste módulo chama `AuditLog.logAction` (mesmo
padrão SST/TI/JUR/FAC/MKT).

**Alertas "nunca esquecidos silenciosamente" (RNF-RH-02, RF-RH-076):**
seguem o padrão já adotado em RNF-JUR-05/RNF-SST-04/RNF-FAC-02 —
verificação ativa ao acessar `GET /api/rh/dashboard` (§13), sem depender de
rotina agendada de background job nesta rodada. Cada endpoint de alerta é
citado no grupo correspondente.

---

## 2. Estrutura de módulo (Clean Architecture)

```
server/src/modules/rh/
├── domain/
│   ├── entities/            # JobPosition, AdmissionProcess, EmployeeContract,
│   │                        #  TerminationProcess, EmployeeDocument,
│   │                        #  VacationAccrualPeriod, VacationSchedule, Absence,
│   │                        #  BenefitType, EmployeeBenefit, TrainingCourse,
│   │                        #  EmployeeTraining, TimeSheetSummary,
│   │                        #  EmployeeJobHistory, PayrollImportBatch,
│   │                        #  PayrollImportItem, PerformanceReview,
│   │                        #  JobVacancy, Candidate
│   ├── services/             # absenceSensitiveFields.ts, payrollImportSensitiveFields.ts
│   │                        #  (mesmo formato de modules/employees/domain/services/
│   │                        #  employeeSensitiveFields.ts)
│   └── repositories/        # Uma interface de Repository por entidade (nunca Sequelize
│                             #  direto em application/)
├── application/
│   ├── services/             # SstAsoService (NOVO — interface), AssetService (NOVO —
│   │                        #  interface), UserAccountService (NOVO — interface,
│   │                        #  desativação de login)
│   └── use-cases/            # Um UseCase por ação de negócio (ver por grupo)
├── infrastructure/
│   ├── adapters/              # SstAsoServiceAdapter (chama GetAsoStatusUseCase de
│   │                        #  modules/sst/, nunca Sequelize/model sst direto),
│   │                        #  AssetServiceAdapter (lê/atualiza Asset.responsible_id
│   │                        #  via repositório de modules/patrimonio ou model direto —
│   │                        #  decisão do programador conforme o que já existir),
│   │                        #  UserAccountServiceAdapter (desativa User.active via
│   │                        #  modules/auth/ ou model direto)
│   └── sequelize/              # SequelizeXxxRepository por entidade
└── presentation/
    ├── controllers/            # Um controller por grupo de recurso (ver seções 3-13)
    ├── routes/                  # rh.ts (router agregador único, monta /api/rh em
    │                          #  server/app.ts — módulo NOVO, não conflita com
    │                          #  employees.ts existente)
    └── validators/              # Um validators.ts por grupo (Zod .strict())
```

**Tipos extraídos para `*Types.ts`** (armadilha ESM+CJS do projeto):
`AdmissionTypes.ts`, `VacationTypes.ts`, `TerminationTypes.ts`,
`PayrollImportTypes.ts` — nenhum arquivo com `export =` deve coexistir com
`export interface`/`export type`.

**Baixo acoplamento — serviços injetados, nunca import direto de outro
módulo (mesmo padrão de `ClientService`/`SalesRevenueService` em
`modules/marketing/`, que por sua vez replicou `MaintenanceOrderService` de
`modules/ti/`):**

1. **`SstAsoService`** — **CORRIGIDO pelo `AuditorIntegrador` em 2026-08-09**:
   a versão original deste parágrafo listava `ConcludeAdmissionUseCase`
   (RF-RH-008), `ConcludeTerminationUseCase` (RF-RH-020) e
   `ConfirmReturnFromAbsenceUseCase` (RF-RH-048) como consumidores deste
   serviço, mas §4.3, §6.2 e §7.1/§9.2 (texto original, não alterado nesta
   correção) descrevem o gate real desses três use cases como uma checagem
   de **snapshot já armazenado** (`hasValidAso(employeeId, docType)` sobre
   `EmployeeDocument`, ou os campos `aso_confirmed_at`/`aso_result` do
   próprio processo) — nunca uma chamada síncrona a `GetAsoStatusUseCase`
   no momento do gate. Isso é consistente com a modelagem do `AdmDBA`
   (`BLOCO_6_RH_MODELO_DADOS.md` §4.1: "ASO admissional sem FK para SST...
   resultado é um snapshot direto"). Escopo real de `SstAsoService`,
   portanto: usado **apenas** por `RequestAsoUseCase` (admissão, §4.2) e
   pelo endpoint equivalente de demissão (§6, `POST
   /termination-processes/:id/request-aso`) para **consultar o status
   atual junto à SST no momento em que o RH solicita o exame** (valor
   informativo/de conveniência, exibido na tela de solicitação) — o
   resultado que efetivamente libera o gate de conclusão continua sendo o
   `EmployeeDocument`/snapshot anexado manualmente pelo RH depois que a SST
   confirma, não uma releitura de `SstAsoService` no instante do
   `conclude`/`return`. `ConcludeAdmissionUseCase`, `ConcludeTerminationUseCase`
   e `ConfirmReturnFromAbsenceUseCase` **não devem injetar** `SstAsoService`
   — apenas `RequestAsoUseCase` (admissão e demissão) o injeta. Interface:
   ```ts
   class SstAsoService {
     async getStatus(employeeId: number): Promise<{ status: string; tipo_ultimo_aso: string | null; vencimento: string | null } | null> { throw new Error('não implementado'); }
   }
   ```
   O adapter chama `GetAsoStatusUseCase` de `modules/sst/` (ou, na ausência
   de export direto de use case entre módulos, faz a mesma chamada HTTP
   interna que `GET /api/sst/aso/status/:employeeId` já expõe — decisão de
   implementação do `programador`; o contrato aqui é a interface, não o
   mecanismo). **Nunca** lê `cid`/laudo clínico — só o status derivado, já
   garantido pelo próprio `GetAsoStatusUseCase` (RF-SST-021, confirmado por
   leitura de código: o use case nunca inclui `restricoes`/`arquivo_url`).
   **Nota:** para `RequestAsoUseCase` da admissão, `employeeId` ainda não
   existe (RF-RH-009) — a chamada a `SstAsoService.getStatus` neste ponto
   específico não é aplicável (funcionário não cadastrado); o parágrafo de
   §4.2 já registrava essa limitação antes desta correção.
2. **`AssetService`** — usado por `SyncAssetChecklistUseCase` (RF-RH-023).
   Interface:
   ```ts
   class AssetService {
     async listByResponsible(employeeId: number): Promise<Array<{ id: number; description: string; returned: boolean }>> { throw new Error('não implementado'); }
   }
   ```
   Read-only nesta rodada — o RH apenas **consulta** os ativos vinculados
   (`Asset.responsible_id = employeeId`) para montar o checklist; a
   devolução em si (mudança de `responsible_id`) continua sendo ação do
   módulo Patrimônio (fora deste contrato), não duplicada aqui.
3. **`UserAccountService`** — usado por `ConcludeTerminationUseCase`
   (RF-RH-022). Interface:
   ```ts
   class UserAccountService {
     async deactivate(userId: number, transaction?: unknown): Promise<void> { throw new Error('não implementado'); }
   }
   ```
   Executa **na mesma transação de banco** que grava
   `employees.status='fired'`/`dismissal_date` — falha na desativação
   reverte a conclusão inteira (RF-RH-022 é explícito: "no mesmo ato
   transacional").

---

## 3. Grupo 1 — Cargos (`JobPosition`) — P2

Base: `/api/rh/job-positions`.

| Método | Rota | Nível | RF |
|---|---|---|---|
| `GET` | `/job-positions` | rh (leitura) | RF-RH-024 |
| `GET` | `/job-positions/:id` | rh (leitura) | RF-RH-024, inclui `training_courses` (matriz) |
| `POST` | `/job-positions` | rh:operate | RF-RH-024 |
| `PUT` | `/job-positions/:id` | rh:operate | RF-RH-024 (sem `DELETE` — usa `active: false`) |
| `POST` | `/job-positions/:id/training-requirements` | rh:operate | RF-RH-026 — associa `training_course_id` como obrigatório para o cargo |
| `DELETE` | `/job-positions/:id/training-requirements/:trainingCourseId` | rh:operate | RF-RH-026 — remove associação (não é exclusão física de `TrainingCourse`, apenas do vínculo N:N) |

**`POST /job-positions` — Request:**
```json
{
  "department_id": 4,
  "name": "Técnico de Manutenção Elétrica",
  "cbo_code": "9144-05",
  "description": "Manutenção preventiva/corretiva de máquinas do parque fabril",
  "salary_range_min": "3200.00",
  "salary_range_max": "4800.00",
  "requirements": "Curso técnico em elétrica, NR-10, NR-12",
  "active": true
}
```
`salary_range_min`/`max` 🔒 — reforço RNF-RH-01 padrão `rh` (não é o
reforço `approve`, apenas o bloqueio de rota já cobre — `JobPosition` inteiro
está atrás de `authorizeModule('rh')`, não precisa de segregação de campo
adicional).

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `department_id`/`name` ausentes; `salary_range_min > salary_range_max` |
| 404 | `NOT_FOUND` | `department_id` informado não existe |

`Employee.job_position_id` (RF-RH-025) é aceito como campo opcional em
`PUT /api/employees/:id` (**alteração no módulo `employees` já existente**,
não em `/api/rh/*` — ver §14 "alterações em `employees` existente").

---

## 4. Grupo 2 — Admissão (`AdmissionProcess`) — UC-69

Base: `/api/rh/admission-processes`.

| Método | Rota | Nível | RF |
|---|---|---|---|
| `GET` | `/admission-processes` | rh (leitura) | Filtros: `status`, `department_id` |
| `GET` | `/admission-processes/:id` | rh (leitura) | Detalhe + checklist de documentos |
| `POST` | `/admission-processes` | rh:operate | RF-RH-007 |
| `POST` | `/admission-processes/:id/request-aso` | rh:operate | RF-RH-008 |
| `POST` | `/admission-processes/:id/checklist` | rh:operate | Marca item de documento como recebido |
| `POST` | `/admission-processes/:id/conclude` | rh:operate | RF-RH-009 (transacional) |
| `PATCH` | `/admission-processes/:id/esocial-confirmation` | rh:operate | RF-RH-010 |
| `POST` | `/admission-processes/:id/cancel` | rh:operate | RF-RH-012 (`status='cancelada'`, motivo obrigatório — nunca exclusão física) |

### 4.1 `POST /admission-processes` — Request (RF-RH-007)

```json
{
  "candidate_id": null,
  "job_vacancy_id": null,
  "candidate_name": "João Pereira",
  "candidate_cpf": "12345678900",
  "department_id": 3,
  "job_position_id": 12,
  "planned_start_date": "2026-09-01",
  "required_documents": ["rg", "cpf", "ctps_digital", "pis", "comprovante_residencia", "foto"]
}
```
`candidate_id` opcional (`Candidate.id`, RF-RH-080 — se vier de UC de
recrutamento). `required_documents` é o checklist inicial (enum livre por
item, cada item vira uma pendência `{ document: string, received: false }`
dentro do processo). Nasce `status='documentos_pendentes'`.

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `candidate_name`/`department_id`/`planned_start_date` ausentes |
| 404 | `NOT_FOUND` | `candidate_id`/`job_vacancy_id`/`job_position_id` informado não existe |

### 4.2 `POST /admission-processes/:id/request-aso` — RF-RH-008

Sem payload (`{}`). Grava `status='aso_pendente'`, `aso_requested_at=now()`.
Bloqueia a transição para `conclude` (§4.3) enquanto
`SstAsoService.getStatus(employeeId-provisório)` não retornar `apto` — como
o funcionário ainda não existe em `employees` neste ponto, o gate real
acontece via `EmployeeDocument` do tipo `aso_admissional` anexado
manualmente pelo RH após a SST confirmar (RF-RH-028 — o ERP não integra em
tempo real com o exame, apenas armazena o resultado já ocorrido), não por
chamada síncrona ao módulo SST neste endpoint específico.

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 404 | `NOT_FOUND` | Processo não existe |
| 422 | `BUSINESS_RULE_VIOLATION` | Processo já `concluida`/`cancelada` |

### 4.3 `POST /admission-processes/:id/conclude` — Request (RF-RH-009, transacional)

```json
{
  "employee": {
    "name": "João Pereira",
    "cpf": "12345678900",
    "hire_date": "2026-09-01",
    "salary": "3500.00",
    "work_regime": "experiencia",
    "shift": "commercial"
  },
  "contract_type": "experiencia",
  "period_1_end_date": "2026-10-30"
}
```

**Transação:**
1. Valida gate: existe `EmployeeDocument` tipo `aso_admissional` com
   aptidão `apto`/`apto_com_restricao` e dentro da validade — senão `422
   BUSINESS_RULE_VIOLATION` (RF-RH-008/030, UC-69 E1), nenhuma escrita.
2. Cria (ou reaproveita, se `candidate_id` já tinha gerado um registro
   parcial) `employees` — mesma tabela/validações de `POST
   /api/employees` já existente (reaproveitado via repositório interno,
   nunca `Employee.create()` duplicado com lógica própria).
3. Cria `EmployeeContract` inicial (`type=contract_type`,
   `start_date=employee.hire_date`, RF-RH-013).
4. Cria `EmployeeJobHistory` inicial (`reason='admissao'`,
   `effective_from=employee.hire_date`, `salary=employee.salary`,
   RF-RH-064).
5. Grava `AdmissionProcess.status='concluida'`, vincula `employee_id`.

Fora da transação (RF-RH-011, efeito colateral não bloqueante): gera
pendências encaminháveis — adesão a benefícios, treinamentos obrigatórios
do cargo (se `job_position_id` presente, via `JobPosition ×
TrainingCourse`).

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Campos obrigatórios de `employee` ausentes; `contract_type` fora do enum |
| 404 | `NOT_FOUND` | Processo não existe |
| 409 | `CONFLICT` | CPF já cadastrado em `employees` (mesma mensagem de `CreateEmployeeUseCase`) |
| 422 | `BUSINESS_RULE_VIOLATION` | ASO admissional pendente/vencido/inapto (RF-RH-008); processo já `concluida`/`cancelada` |

Resposta (`201`): `{ admission_process, employee, contract, job_history }`.

### 4.4 `PATCH /admission-processes/:id/esocial-confirmation` — RF-RH-010

```json
{ "s2200_confirmed": true }
```
Grava `esocial_s2200_confirmed_at=now()`, `esocial_s2200_confirmed_by=req.user.id`
(nunca do body — anti-spoofing). Só aceito com `status='concluida'`.
**Efeito colateral:** enquanto este campo estiver `null`, `PUT
/api/employees/:id` **rejeita** alteração de `hire_date` do funcionário
vinculado (`422 BUSINESS_RULE_VIOLATION` — regra nova em `employees`
existente, ver §14) — essa é a trava de "data de início bloqueada para
edição livre" (RF-RH-010, UC-69 E2).

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 404 | `NOT_FOUND` | Processo não existe |
| 422 | `BUSINESS_RULE_VIOLATION` | Processo ainda não `concluida` |

---

## 5. Grupo 3 — Contrato de Experiência (`EmployeeContract`) — UC-68, P0

Base: `/api/rh/employee-contracts`.

| Método | Rota | Nível | RF |
|---|---|---|---|
| `GET` | `/employee-contracts` | rh (leitura) | Filtros: `employee_id`, `status`, `type`, `expiring_in_days` |
| `GET` | `/employee-contracts/:id` | rh (leitura) | Detalhe |
| `PATCH` | `/employee-contracts/:id/extend` | rh:operate | RF-RH-015 (única prorrogação) |
| `PATCH` | `/employee-contracts/:id/decision` | rh:operate (efetivar/prorrogar) / **rh:approve** (rescindir) | RF-RH-016 |

**Nota:** a criação do `EmployeeContract` inicial acontece dentro de
`POST /admission-processes/:id/conclude` (§4.3); não há `POST
/employee-contracts` avulso nesta rodada — contrato de experiência sempre
nasce vinculado a uma admissão (RF-RH-013 não previu criação solta).

### 5.1 `PATCH /employee-contracts/:id/extend` — Request (RF-RH-015)

```json
{ "period_2_end_date": "2026-11-29" }
```

**Validações:**
- `period_2_end_date` já preenchido → `422 BUSINESS_RULE_VIOLATION`,
  `message: "Contrato já foi prorrogado uma vez."` (RF-RH-015, UC-68 E2).
- `period_2_end_date − start_date > 90 dias corridos` → `422
  BUSINESS_RULE_VIOLATION` (RF-RH-014).
- Contrato não é `type='experiencia'` ou `status` diferente de `ativo` →
  `422 BUSINESS_RULE_VIOLATION`.

Grava `status='prorrogado'`, `effective_end_date=period_2_end_date`.

### 5.2 `PATCH /employee-contracts/:id/decision` — Request (RF-RH-016, UC-68)

```json
{ "decision": "efetivar" }
```
ou
```json
{ "decision": "rescindir", "termination_reason": "termino_experiencia" }
```

`decision` enum: `prorrogar` (atalho para §5.1, mesma validação),
`efetivar` (`status='efetivado'`, `EmployeeContract` seguinte
`type='indeterminado'` criado como novo registro — nunca `UPDATE`
destrutivo, RF-RH-013), `rescindir` (cria `TerminationProcess` com
`termination_type='termino_experiencia'` — UC-68 A1/UC-70 A1 — e retorna o
`id` do processo criado para o RH continuar o fluxo em §6).

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `decision` fora do enum |
| 403 | `FORBIDDEN` | `decision='rescindir'` sem nível `rh:approve` |
| 404 | `NOT_FOUND` | Contrato não existe |
| 422 | `BUSINESS_RULE_VIOLATION` | Contrato não está em `ativo`/`prorrogado`; `decision='rescindir'` mas já existe `TerminationProcess` aberto para o funcionário |

**Alerta automático (RF-RH-016, RNF-RH-02):** vencimento de período sem
decisão é resolvido por **verificação ativa** em `GET /api/rh/dashboard`
(§13) — ao detectar `period_X_end_date < hoje` e `status` ainda `ativo`, o
próprio `GET` daquele contrato (e o dashboard) já retornam `status`
recalculado para `indeterminado_automatico` (side effect de leitura,
mesmo padrão de "vencido sem gozo" de férias no Bloco 5/SST) — grava a
mudança de status no banco na primeira leitura que detectar a condição
(idempotente), não depende de cron.

---

## 6. Grupo 4 — Demissão (`TerminationProcess`) — UC-70

Base: `/api/rh/termination-processes`.

| Método | Rota | Nível | RF |
|---|---|---|---|
| `GET` | `/termination-processes` | rh (leitura) | Filtros: `status`, `payment_deadline_at_risk` (bool) |
| `GET` | `/termination-processes/:id` | rh (leitura) | Detalhe + checklist de ativos |
| `POST` | `/termination-processes` | rh:operate | RF-RH-017/019 |
| `POST` | `/termination-processes/:id/request-aso` | rh:operate | RF-RH-020 |
| `GET` | `/termination-processes/:id/asset-checklist` | rh (leitura) | RF-RH-023 — consulta `AssetService.listByResponsible` |
| `POST` | `/termination-processes/:id/trct` | rh:operate | Anexa TRCT (RF-RH-021) |
| `PATCH` | `/termination-processes/:id/esocial-confirmation` | rh:operate | `s2299_confirmed_at` |
| `POST` | `/termination-processes/:id/conclude` | **rh:approve** | RF-RH-022 (transacional, desativa login) |

### 6.1 `POST /termination-processes` — Request (RF-RH-017/019)

```json
{
  "employee_id": 501,
  "termination_type": "sem_justa_causa",
  "notice_date": "2026-08-10",
  "notice_modality": "indenizado",
  "termination_date": "2026-08-10"
}
```
`termination_type` enum: `pedido`/`sem_justa_causa`/`justa_causa`/
`termino_experiencia`/`acordo`. Resposta inclui `suggested_notice_date`
calculado a partir de `30 + 3 × anos_completos` (limitado a 90 dias,
RF-RH-019) — sugestão, campo `notice_date` do payload permanece o valor
final ajustável pelo RH (não sobrescrito automaticamente).
`payment_deadline` = `termination_date + 10 dias corridos`, calculado no
servidor (RF-RH-018), não aceito no payload.

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `employee_id`/`termination_type`/`notice_date`/`termination_date` ausentes |
| 404 | `NOT_FOUND` | `employee_id` não existe |
| 409 | `CONFLICT` | Já existe `TerminationProcess` aberto (`status` ≠ `concluido`/`cancelado`) para o mesmo `employee_id` |

### 6.2 `POST /termination-processes/:id/conclude` — RF-RH-022 (transacional)

Sem payload obrigatório (`{}`) além de confirmação implícita do nível
`approve`. Pré-condição bloqueante (UC-70 E2): `GET
/termination-processes/:id/asset-checklist` sem pendência (todo item
`returned=true`) — senão `422 BUSINESS_RULE_VIOLATION`.

**Transação:**
1. Valida checklist de ativos (acima) e ASO demissional confirmado
   (`EmployeeDocument` tipo `aso_demissional` — mesma trava de RF-RH-030).
2. Grava `employees.status='fired'`, `employees.dismissal_date=termination_date`.
3. `UserAccountService.deactivate(employee.user_id, transaction)` — se
   `employee.user_id` for `null` (funcionário nunca teve login), passo
   pulado sem erro.
4. Grava `TerminationProcess.status='concluido'`, `concluded_by=req.user.id`,
   `concluded_at=now()`.

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 403 | `FORBIDDEN` | Requisitante sem `rh:approve` |
| 404 | `NOT_FOUND` | Processo não existe |
| 422 | `BUSINESS_RULE_VIOLATION` | Checklist de ativos pendente (RF-RH-023, UC-70 E2); ASO demissional pendente (RF-RH-020); processo já `concluido`/`cancelado` |

**Alerta de prazo (RF-RH-018, UC-70 E1):** `GET
/termination-processes?payment_deadline_at_risk=true` e o dashboard (§13)
sinalizam processos com `payment_deadline` a ≤3 dias ou vencido sem
`trct_confirmed_paid_at` — não há endpoint de confirmação de pagamento
dedicado nesta rodada (o ERP não processa pagamento, RF-RH-021); o campo
existe apenas como marcador informativo preenchido manualmente pelo RH via
`POST /termination-processes/:id/trct` (`{ paid: true }` opcional no mesmo
payload do anexo).

---

## 7. Grupo 5 — Documentos do Funcionário (`EmployeeDocument`)

Base: `/api/rh/employee-documents`.

| Método | Rota | Nível | RF |
|---|---|---|---|
| `GET` | `/employee-documents` | rh (leitura) | Filtros: `employee_id`, `doc_type`, `expiring_in_days` |
| `GET` | `/employee-documents/:id` | rh (leitura) | Detalhe (nunca inclui laudo clínico — RF-RH-028) |
| `POST` | `/employee-documents` | rh:operate | RF-RH-027, reaproveita infraestrutura Multer já existente no projeto (mesmo padrão de upload de `modules/marketing/`/`modules/juridico/`) |
| `PUT` | `/employee-documents/:id` | rh:operate | Atualiza `valid_until`/substitui arquivo (nova versão, não novo registro — documento não tem histórico legal como contrato) |

### 7.1 `POST /employee-documents` — Request (multipart, RF-RH-027)

```
employee_id=501
doc_type=aso_retorno
valid_until=2027-08-01
origin=sst
file=<binário>
```
`doc_type` enum: `rg`/`cpf`/`ctps`/`aso_admissional`/`aso_periodico`/
`aso_retorno`/`aso_mudanca_risco`/`aso_demissional`/`contrato`/
`certificado`/`outro`. Para `doc_type` iniciado em `aso_`: campos aceitos
restritos a **aptidão** (`fitness_result`: `apto`/`inapto`/
`apto_com_restricao`) e `valid_until` — **nunca** texto livre de laudo
clínico (`ValidationError` 400 se o payload trouxer qualquer campo de
conteúdo clínico não previsto no schema, RF-RH-028).

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `employee_id`/`doc_type`/`file` ausentes; campo de conteúdo clínico em `doc_type='aso_*'` |
| 404 | `NOT_FOUND` | `employee_id` não existe |

**Alertas de vencimento (RF-RH-029):** janelas 60/30/7 dias, parametrizadas
(constante de código `EMPLOYEE_DOCUMENT_ALERT_WINDOWS_DAYS = [60, 30, 7]`,
não hard-code espalhado — mesmo critério de "configurável = ponto único no
código" já adotado no Bloco 5 MKT), expostas em `GET
/employee-documents?expiring_in_days=60` e no dashboard (§13).

**Gate de ASO (RF-RH-030, reutilizado por UC-69/UC-71):** função de domínio
compartilhada `hasValidAso(employeeId, docType)` — usada por
`ConcludeAdmissionUseCase` (§4.3), `ConcludeTerminationUseCase` (§6.2) e
`ConfirmReturnFromAbsenceUseCase` (§9.4). Um único lugar de implementação,
não duplicado por endpoint.

---

## 8. Grupo 6 — Férias (`VacationAccrualPeriod`, `VacationSchedule`) — UC-67, P0

Base: `/api/rh/vacation-accrual-periods`, `/api/rh/vacation-schedules`.

### 8.1 Endpoints

| Método | Rota | Nível | RF |
|---|---|---|---|
| `GET` | `/vacation-accrual-periods` | rh (leitura) | Filtros: `employee_id`, `status` (inclui `vencido_dobra`) |
| `GET` | `/vacation-accrual-periods/:id` | rh (leitura) | Detalhe (`dias_direito`, `fim_concessivo`, alertas) |
| `POST` | `/vacation-accrual-periods/:id/recalculate` | rh:operate | RF-RH-032 — recalcula `dias_direito` a partir de `TimeSheetSummary` atualizado (idempotente) |
| `GET` | `/vacation-schedules` | rh (leitura) | Filtros: `employee_id`, `accrual_period_id`, `department_id` (para calendário) |
| `POST` | `/vacation-schedules` | rh:operate | RF-RH-035/036/037 |
| `POST` | `/vacation-schedules/:id/confirm-taken` | rh:operate | Registra gozo efetivo (`dias_gozados`) |
| `GET` | `/vacation-schedules/calendar` | rh (leitura) | RF-RH-039 — visão por departamento/período |

**8 endpoints** (2 leitura de período, 1 ação, 3 de programação + calendário
+ confirmação de gozo).

**Nota:** `VacationAccrualPeriod` **nunca nasce por `POST` manual**
(RF-RH-031 — abertura é automática, disparada por evento de admissão
(§4.3) e por job de aniversário de 12 meses, fora do escopo de rota HTTP
deste contrato — é responsabilidade de um scheduler/trigger de aplicação,
não de endpoint; o `programador` decide o mecanismo exato — cron interno
ou trigger no `ConcludeAdmissionUseCase` mais uma verificação ativa em
leitura, mesmo padrão "nunca esquecido silenciosamente" de RNF-RH-02).

### 8.2 `POST /vacation-accrual-periods/:id/recalculate` — RF-RH-032

Sem payload. Recalcula:
```
faltas = SUM(TimeSheetSummary.faltas_injustificadas) no intervalo do período
dias_direito =
  faltas <= 5  → 30
  6-14         → 24
  15-23        → 18
  24-32        → 12
  > 32         → 0
```
Se não houver `TimeSheetSummary` para algum mês do período, assume `0`
faltas naquele mês e retorna `data_gap_detected: true` no payload de
resposta (RF-RH-032 — não bloqueia, apenas sinaliza a lacuna).

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 404 | `NOT_FOUND` | Período não existe |

### 8.3 `POST /vacation-schedules` — Request (RF-RH-035/036/037, UC-67)

```json
{
  "accrual_period_id": 88,
  "start_date": "2026-12-01",
  "days": 15,
  "abono": false,
  "aviso_em": "2026-10-20",
  "employee_agreement_confirmed": true,
  "override_team_limit_justification": null
}
```

**Validações em cadeia (ordem de checagem, todas retornam `422
BUSINESS_RULE_VIOLATION` com `code` específico):**
1. `days` + soma dos outros fracionamentos do mesmo `accrual_period_id` >
   30 → `EXCEEDS_ACCRUAL_DAYS`.
2. Já existem 3 frações registradas para o período → `MAX_FRACTIONS_REACHED`
   (RF-RH-035).
3. Fracionamento com mais de 1 fração e nenhuma delas ≥14 dias, ou alguma
   <5 dias → `INVALID_FRACTION_SIZE`.
4. `aviso_em` posterior a `start_date - 30 dias` → aceito, mas
   `warning: "Antecedência menor que 30 dias — registre a justificativa em notes."`
   no corpo da resposta (não bloqueia, RF-RH-037 — "aceita com
   justificativa").
5. `abono=true`: `days` (porção de abono) > 1/3 dos dias do período → `422
   ABONO_LIMIT_EXCEEDED` (RF-RH-036); requerimento a menos de 15 dias do
   fim do período aquisitivo → `422 ABONO_DEADLINE_EXPIRED`.
6. Percentual da equipe do departamento simultaneamente em férias no
   intervalo `[start_date, start_date+days)` excede o parâmetro
   configurado (`Department.vacation_team_limit_percent`, `[VERIFICAR COM
   RH DA EMPRESA]` valor padrão — RF-RH-039) → **não bloqueia** por padrão;
   retorna `warning: "TEAM_LIMIT_EXCEEDED"` e exige
   `override_team_limit_justification` preenchido para persistir (se
   ausente, `422 VALIDATION_ERROR` pedindo a justificativa — é a única
   forma de tornar esse aviso "soft-block com override obrigatório", sem
   virar hard rule).

Grava `VacationSchedule` + agenda `POST .../reminder` (interno) para o
Financeiro em D-2 (RF-RH-038).

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Campos obrigatórios ausentes; `override_team_limit_justification` exigido e ausente |
| 404 | `NOT_FOUND` | `accrual_period_id` não existe |
| 422 | `BUSINESS_RULE_VIOLATION` | Qualquer um dos `code`s 1/2/3/5 acima |

**Alteração de programação já aprovada (RF-RH-040):** não há `PUT`; uma
mudança gera **novo registro** com `superseded_schedule_id` apontando para
o anterior e `reason` obrigatório — o anterior nunca é sobrescrito.

**Dobra — E2 (RF-RH-034, UC-67 E2):** verificação ativa em `GET
/vacation-accrual-periods` e no dashboard (§13) — `fim_concessivo < hoje`
e `status` ainda não `gozado` → grava `status='vencido_dobra'` na leitura
(idempotente) e retorna no payload `alert_level: 'critical'`, endereçado a
RH e CFO (a notificação em si — e-mail/push — é responsabilidade de
infraestrutura de notificação já existente no projeto, fora deste
contrato de dados).

**Zeramento por afastamento (RF-RH-041):** `Absence` com `type='inss'` e
acumulado >6 meses dispara `POST /vacation-accrual-periods/:id/reset`
(uso interno do use case de `Absence`, §9, não um endpoint chamado
diretamente pelo cliente HTTP nesta rodada — efeito colateral automático de
`POST /absences`).

---

## 9. Grupo 7 — Afastamentos (`Absence`) — UC-71

Base: `/api/rh/absences`.

| Método | Rota | Nível | RF |
|---|---|---|---|
| `GET` | `/absences` | rh (leitura) | `cid` omitido salvo `rh:approve`/admin (§0) |
| `GET` | `/absences/:id` | rh (leitura) | idem |
| `POST` | `/absences` | rh:operate | RF-RH-044/045/047/049 |
| `PATCH` | `/absences/:id/return` | rh:operate | RF-RH-048 (gate de ASO de retorno) |
| `PATCH` | `/absences/:id/esocial-confirmation` | rh:operate | `s2230_confirmed_at` |

### 9.1 `POST /absences` — Request (RF-RH-044)

```json
{
  "employee_id": 501,
  "type": "auxilio_doenca_inss",
  "start_date": "2026-08-01",
  "expected_end_date": "2026-09-15",
  "cid": "M54.5",
  "document_id": 902
}
```
`type` enum: `doenca_ate_15d`/`auxilio_doenca_inss`/`acidente_trabalho`/
`maternidade`/`paternidade`/`licenca_outras`. `cid` opcional no payload,
mas se ausente e `type` não for `maternidade`/`paternidade`, retorna
`warning` (não bloqueia — nem todo tipo de afastamento tem CID disponível
de imediato). `document_id` referencia `EmployeeDocument` (atestado/CAT/
laudo já anexado).

**Defaults automáticos (RF-RH-046):**
- `type='maternidade'`: se `expected_end_date` ausente,
  `start_date + 120 dias corridos` (CLT art. 392).
  `[VERIFICAR COM RH DA EMPRESA]` se há adesão ao Empresa Cidadã (campo
  `extended_program: boolean`, opcional, some o cálculo para 180 dias
  quando `true`).
- `type='paternidade'`: default `start_date + 5 dias corridos` (ADCT art.
  10 §1º).

**Efeitos colaterais na mesma transação:**
1. `employees.status='license'` (RF-RH-045).
2. Suspensão de `EmployeeBenefit` de VT/VR nos dias afastados, conforme
   `BenefitType.funding_rule` (RF-RH-047) — grava `suspended_days` no
   vínculo, não cancela a adesão.
3. Recalcula `impacto_aquisitivo` do `VacationAccrualPeriod` em curso do
   funcionário (RF-RH-049); se `type='auxilio_doenca_inss'` e acumulado
   (somando registros anteriores do mesmo funcionário) ultrapassa 6 meses,
   dispara o zeramento de RF-RH-041 (§8.3).

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `employee_id`/`type`/`start_date` ausentes |
| 404 | `NOT_FOUND` | `employee_id`/`document_id` informado não existe |
| 409 | `CONFLICT` | Já existe `Absence` em aberto (sem `actual_end_date`) para o mesmo funcionário |

### 9.2 `PATCH /absences/:id/return` — Request (RF-RH-048, UC-71 E1)

```json
{ "actual_end_date": "2026-09-10" }
```

**Validação:**
```
actual_end_date - start_date > 30 dias
  AND NOT hasValidAso(employee_id, 'aso_retorno')
  ⇒ 422 BUSINESS_RULE_VIOLATION, code: "RETURN_ASO_REQUIRED"
```
Se aprovado: grava `actual_end_date`, reverte `employees.status` para
`active` (ou o status anterior aplicável, se havia outro em curso — decisão
de implementação simples: sempre `active`, já que `Absence` é sempre a
causa de `status='license'` nesta modelagem).

**RF-RH-047-A — reativação automática de VT/VR (decisão do dono,
2026-08-12):** na mesma transação, reativa os benefícios VT/VR que este
afastamento suspendeu — reverte exatamente os dias somados por
`CreateAbsenceUseCase` (`accrual_impact_days`) sobre `suspended_days` de
cada benefício ainda `ativo` (nunca sobre um cancelado durante o
afastamento). Seguro sem link explícito afastamento→benefício porque só
existe 1 afastamento aberto por funcionário por vez (RF-RH-044, 409
abaixo). A resposta ganha o campo aditivo:
```json
{
  "reactivated_benefits": [
    { "id": 10, "benefit_type_id": 3, "category": "vt", "suspended_days": 0 }
  ]
}
```
Lista vazia quando nenhum benefício havia sido suspenso por este
afastamento (curso sem VT/VR ativo, ou `expected_end_date` nunca calculada).

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `actual_end_date` ausente ou anterior a `start_date` |
| 404 | `NOT_FOUND` | Afastamento não existe |
| 422 | `BUSINESS_RULE_VIOLATION` | `RETURN_ASO_REQUIRED` (acima); afastamento já encerrado |

---

## 10. Grupo 8 — Benefícios (`BenefitType`, `EmployeeBenefit`)

Base: `/api/rh/benefit-types`, `/api/rh/employee-benefits`.

| Método | Rota | Nível | RF |
|---|---|---|---|
| `GET` | `/benefit-types` | rh (leitura) | RF-RH-050 |
| `POST` | `/benefit-types` | rh:operate | RF-RH-050 |
| `PUT` | `/benefit-types/:id` | rh:operate | Sem `DELETE` (catálogo referenciado) |
| `GET` | `/employee-benefits` | rh (leitura) | Filtros: `employee_id`, `benefit_type_id`, `enrollment_status` |
| `POST` | `/employee-benefits` | rh:operate | RF-RH-051/052 (opt-in) |
| `POST` | `/employee-benefits/:id/cancel` | rh:operate | RF-RH-054 (opt-out, `enrollment_status='cancelado'`) |
| `GET` | `/employee-benefits/monthly-report` | rh (leitura) | RF-RH-053 — relatório mensal desconto×custo, por `competencia` |

**7 endpoints.**

### 10.1 `POST /employee-benefits` — Request (RF-RH-051/052)

```json
{
  "employee_id": 501,
  "benefit_type_id": 3,
  "discount_value": "120.00",
  "company_cost_value": "280.00",
  "dependents": null
}
```
**Validação (RF-RH-052, `category='vt'`):**
```
discount_value > 0.06 × employee.salary  ⇒ 422 BUSINESS_RULE_VIOLATION,
  code: "VT_DISCOUNT_LIMIT_EXCEEDED"
```
`employee.salary` é lido internamente do repositório (nunca aceito no
payload — evita spoofing do limite via salário falso). `dependents`
(`JSON`) só aceito quando `BenefitType.category IN ('saude', 'odonto')` —
`ValidationError` 400 se presente para outra categoria.

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Campos obrigatórios ausentes; `dependents` fora de saúde/odonto |
| 404 | `NOT_FOUND` | `employee_id`/`benefit_type_id` não existe |
| 409 | `CONFLICT` | Já existe adesão `ativo` para o mesmo `employee_id` + `benefit_type_id` |
| 422 | `BUSINESS_RULE_VIOLATION` | `VT_DISCOUNT_LIMIT_EXCEEDED` |

### 10.2 `GET /employee-benefits/monthly-report` — RF-RH-053

```
?competencia=2026-08
```
Resposta: lista por `employee_id`/`department_id`/`cost_center_id` (via
`Department.cost_center_id`, RF-RH-053/071) com `discount_value`
(exportação para provedor de folha — dado individual, mesmo reforço de
`rh` padrão, sem reforço adicional além do já existente para `Employee`) e
`company_cost_value` (custo agregável por centro de custo). Este é um
relatório de **saída** do ERP para o provedor de folha — não escreve
nada no provedor (RNF-RH-03).

---

## 11. Grupo 9 — Treinamentos (`TrainingCourse`, `EmployeeTraining`) — P1

Base: `/api/rh/training-courses`, `/api/rh/employee-trainings`.

**Premissa de fronteira com SST (declarada explicitamente para o
`AuditorIntegrador` cruzar):** `server/src/modules/sst/` já implementa
`training-matrix`/`trainings` (`GET/POST /api/sst/training-matrix`,
`GET/POST /api/sst/trainings`, `GET /api/sst/trainings/blocklist`) — um
cluster de treinamentos **normativos de NR** com matriz função×norma e
cálculo de validade, confirmado por leitura de código nesta modelagem
(`server/src/modules/sst/presentation/routes/sst.ts` linhas 106-111).
`TrainingCourse`/`EmployeeTraining` deste bloco **não duplicam** esse
cluster — são um catálogo **mais amplo** (inclui treinamento não-normativo:
onboarding, técnico, comportamental), consumido pelo RH para a matriz
`JobPosition × TrainingCourse` (RF-RH-026/056) e para o relatório "quem não
pode operar" (RF-RH-058).

**RF-INT-RH-SST-01 — integração síncrona implementada (decisão do dono,
2026-08-12, substitui o texto original desta seção que descrevia a lacuna
como pendência):** para `is_normative=true` (treinamento de NR),
`validity_months` deixou de ser sempre um palpite manual do RH. No
`POST`/`PUT` de `training-courses`, se `nr_code` estiver cadastrado, ATIVO,
no `training-matrix` da SST (em qualquer `position` vinculada a essa
`norma`), a validade GRAVADA é a da matriz — o `validity_months` do
payload é **ignorado** nesse caso. Implementação: `TrainingMatrixService`
(interface em `modules/rh/application/services/`) +
`TrainingMatrixServiceAdapter` (chama `ListTrainingMatrixUseCase` de
`modules/sst/` diretamente, mesmo padrão de `SstAsoService`/
`SstAsoServiceAdapter` de §2). A extensão de RBAC prevista abaixo foi
feita: `GET /api/sst/training-matrix` passou a aceitar `sst`|`rh` via
`requireSstOrRh` (middleware que já existia para `GET /aso/status/:id` e
`GET /cipa/stability/:id` — não foi necessário criar nada novo); a escrita
da matriz (`POST`/`PUT`) continua só `sst`. Como a matriz é modelada por
função×norma e `TrainingCourse` não tem função, a busca agrega todas as
`position` vinculadas à mesma `norma` e usa a MENOR periodicidade não nula
entre elas (política conservadora); `periodicidade_meses: null` só ocorre
quando nenhuma função vinculada exige reciclagem periódica.

### 11.1 Endpoints

| Método | Rota | Nível | RF |
|---|---|---|---|
| `GET` | `/training-courses` | rh (leitura) | RF-RH-055 |
| `POST` | `/training-courses` | rh:operate | RF-RH-055 |
| `PUT` | `/training-courses/:id` | rh:operate | Sem `DELETE` |
| `GET` | `/employee-trainings` | rh (leitura) | Filtros: `employee_id`, `training_course_id`, `expiring_in_days`, `department_id` |
| `POST` | `/employee-trainings` | rh:operate | RF-RH-057 |
| `GET` | `/employee-trainings/cannot-operate-report` | rh (leitura) | RF-RH-058 |

**6 endpoints.**

### 11.2 `POST /training-courses` — Request (RF-RH-055)

```json
{
  "name": "NR-12 — Segurança em Máquinas",
  "is_normative": true,
  "nr_code": "NR-12",
  "validity_months": 24,
  "workload_hours": 8
}
```
`validity_months` nullable (sem vencimento). A resposta sempre traz
`validity_source: 'sst_matrix' | 'manual'` (RF-INT-RH-SST-01):
- `'sst_matrix'` — `is_normative=true` e `nr_code` reconhecido, ATIVO, na
  matriz SST; `validity_months` na resposta é o efetivo GRAVADO (da
  matriz, não o do payload); sem `warning`.
- `'manual'` — qualquer outro caso (não normativo, sem `nr_code`, ou
  `nr_code` não cadastrado na matriz); `validity_months` é o do payload;
  se `is_normative=true` e `nr_code` presente, mantém
  `warning: "Confirme este valor com a SST — treinamentos normativos têm
  validade definida pela SST (RF-RH-059)."` — não bloqueia a gravação.

`PUT /training-courses/:id` aplica a mesma regra sobre o estado EFETIVO do
curso após o merge do payload parcial com o registro existente (ex.: um PUT
que só muda `workload_hours` reaplica `validity_source: 'sst_matrix'` se o
curso já era normativo com NR na matriz).

### 11.3 `POST /employee-trainings` — Request (RF-RH-057)

```json
{
  "employee_id": 501,
  "training_course_id": 7,
  "completed_at": "2026-08-01",
  "instructor_or_provider": "SENAI",
  "certificate_file_path": null
}
```
`valid_until` calculado no servidor: `completed_at + validity_months`
(quando `TrainingCourse.validity_months` não é `null`), nunca aceito no
payload.

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Campos obrigatórios ausentes |
| 404 | `NOT_FOUND` | `employee_id`/`training_course_id` não existe |

**Alertas de reciclagem (RF-RH-058):** `GET
/employee-trainings?expiring_in_days=60` e o relatório dedicado (abaixo).

### 11.4 `GET /employee-trainings/cannot-operate-report` — RF-RH-058

```
?department_id=3
```
Resposta: funcionários com `job_position_id` cuja matriz
(`JobPosition × TrainingCourse`, RF-RH-026) exige `TrainingCourse` cujo
`EmployeeTraining.valid_until` está vencido ou inexistente — insumo para
PCP/SST, nunca bloqueia operação sozinho (é relatório, não gate — o gate
de produção em si, se existir, é responsabilidade de `manufacturing`, fora
deste contrato).

---

## 12. Grupo 10 — Frequência/Ponto (Importação AEJ, `HrTimeImportBatch`/`HrTimeImportItem`) — IMPLEMENTADO 2026-08-12

> Substitui o desenho anterior deste grupo (`TimeSheetSummary`,
> `/timesheet-summaries`, RF-RH-060/061/062 — nunca implementado). Decisão do
> dono em 2026-08-12: **integrar por importação do AEJ** (Arquivo Eletrônico
> de Jornada, Portaria MTP 671/2021, Anexo IX) exportado pelo software da
> administradora dos REPs (RWTech/Pointline) — ver `docs/rh/04-FREQUENCIA.md`
> para o desenho completo, incluindo a limitação conhecida do layout
> (ausência de amostra real do arquivo).

Base: `/api/rh/time-imports` + `/api/rh/attendance/monthly-summary`.

**Fronteira de escopo (RNF-RH-03):** nenhum endpoint de marcação/apuração
bruta de ponto — o ERP só importa a jornada já tratada.

| Método | Rota | Nível | Descrição |
|---|---|---|---|
| `POST` | `/time-imports` | rh:operate | Upload multipart (`file`) do AEJ + `competencia_inicio`/`competencia_fim`; parseia, grava lote+itens, casa por CPF |
| `GET` | `/time-imports` | rh (leitura) | Lista lotes, filtros `status`/`competencia` (`YYYY-MM`) |
| `GET` | `/time-imports/:id` | rh (leitura) | Detalhe com itens e não-casados destacados |
| `POST` | `/time-imports/:id/confirm` | rh:operate | Confirma o lote (só a partir de `status='validated'`) |
| `GET` | `/attendance/monthly-summary` | rh (leitura) | Resumo por funcionário (`competencia` obrigatória, `employee_id` opcional) — só lotes `confirmed`, cruzado com `hr_absences` |

**5 endpoints.**

### 12.1 `POST /time-imports` — Request (multipart)

```
competencia_inicio=2026-08-01
competencia_fim=2026-08-31
file=<arquivo .txt/.aej/.rem exportado pela administradora>
```

Resposta (`201`):
```json
{
  "success": true,
  "data": {
    "batch": { "id": 12, "status": "validated", "total_lines": 62, "matched_count": 58, "unmatched_count": 3, "rejected_count": 1 },
    "matched_count": 58,
    "unmatched_count": 3,
    "rejected_count": 1,
    "unmatched": [ { "id": 501, "cpf": "11144477735", "original_registration": "MAT042", "work_date": "2026-08-03" } ],
    "rejected_lines": [ { "line": 17, "raw": "2;...", "reason": "Data inválida: ..." } ],
    "unknown_record_types": { "5": 2 }
  }
}
```

`unmatched` = linhas cujo CPF não bate com `employees.cpf` (`employee_id`
fica `NULL`, `original_registration` preserva a matrícula do arquivo).
`rejected_lines` = linhas tipo `2` malformadas (não abortam o lote).
`unknown_record_types` = contagem por tipo de registro não reconhecido
(também não aborta o lote). Lote sem **nenhum** registro tipo `2`
reconhecido nasce `status='rejected'` (em vez de `422`) — fica visível na
lista para auditoria, mas `POST .../confirm` recusa (`422`).

**Erros:**
| Código | Quando |
|---|---|
| 400 | Arquivo ausente/vazio; extensão não permitida; `competencia_inicio`/`competencia_fim` ausentes ou invertidas |
| 422 | `POST .../confirm` em lote `rejected` ou já `confirmed` |
| 404 | `GET`/`POST .../confirm` em lote inexistente |

### 12.2 `GET /attendance/monthly-summary`

Soma `hours_worked`/`overtime_50`/`overtime_100`/`night_hours`/faltas dos
itens de lotes **CONFIRMADOS** cujo `work_date` cai na competência, por
funcionário, e cruza com `hr_absences` (dias de afastamento sobrepostos ao
mês, campo `absence_days_from_hr_absences`). **Limitação conhecida:** sem
`UNIQUE(employee_id, work_date)`, reimportação da mesma competência com
dois lotes confirmados soma os dois (mesma decisão já tomada para
`hr_payroll_import_batches`).

---

## 13. Grupo 11 — Transferência/Histórico (`EmployeeJobHistory`) — P1

Base: `/api/rh/employee-job-history`.

| Método | Rota | Nível | RF |
|---|---|---|---|
| `GET` | `/employee-job-history` | rh (leitura) | Filtros: `employee_id`, `reason` |
| `POST` | `/employee-job-history` | rh:operate | RF-RH-064/065/066 |
| `PATCH` | `/employee-job-history/:id/esocial-confirmation` | rh:operate | `esocial_event_confirmed_at` |

### 13.1 `POST /employee-job-history` — Request (RF-RH-065/066, CLT art. 468)

```json
{
  "employee_id": 501,
  "job_position_id": 15,
  "department_id": 5,
  "salary": "4200.00",
  "effective_from": "2026-09-01",
  "reason": "transferencia"
}
```
`reason` enum: `admissao`/`promocao`/`transferencia`/`reajuste`. `salary` 🔒
(reforço padrão `rh`, sem reforço adicional — `EmployeeJobHistory` já está
atrás de `authorizeModule('rh')`).

**Transação:**
1. Fecha o registro `EmployeeJobHistory` vigente do funcionário
   (`effective_to = effective_from - 1 dia`).
2. Cria o novo registro (nunca `UPDATE` do anterior — RF-RH-065).
3. Atualiza `employees.salary`/`job_position_id`/`department_id` para
   refletir o valor vigente (campo "espelho" de leitura rápida — a fonte
   de verdade histórica é `EmployeeJobHistory`).
4. Se `department_id` ou `job_position_id` mudou: verifica ASO de mudança
   de risco (mesma trava de RF-RH-030, `doc_type='aso_mudanca_risco'`) —
   se pendente, a transação **não bloqueia a gravação do histórico**, mas
   marca `pending_aso_risk_change: true` no registro e gera pendência no
   dashboard (RF-RH-066 diz "bloqueia a efetivação da mudança" — decisão
   deste contrato: "efetivação" é interpretada como o `employees.status`
   permanecer habilitado a operar na nova função, não como impedir o
   registro histórico em si, para não travar o RH de documentar a
   transferência enquanto aguarda a SST); e gera pendência não bloqueante
   de treinamentos obrigatórios do novo cargo (via matriz `JobPosition ×
   TrainingCourse`).

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `employee_id`/`effective_from`/`reason` ausentes |
| 404 | `NOT_FOUND` | `employee_id`/`job_position_id`/`department_id` não existe |

---

## 14. Grupo 12 — Quotas PCD/Aprendiz (indicador) — P1

Não há endpoint dedicado além da extensão de `employees` e do dashboard
(§16). `Employee.pcd` (RF-RH-067) é campo novo opcional em `POST`/`PUT
/api/employees` (**alteração no módulo `employees` já existente**, ver
§17). `work_regime='aprendiz'` já existe, reaproveitado sem mudança.
`GET /api/rh/dashboard` expõe `pcd_quota`/`apprentice_quota` (RF-RH-068,
apenas informativo, RF-RH-069).

---

## 15. Grupo 13 — Custo Importado da Folha (`PayrollImportBatch`/`Item`) — P1

Base: `/api/rh/payroll-imports`.

| Método | Rota | Nível | RF |
|---|---|---|---|
| `GET` | `/payroll-imports` | rh (leitura) | Lista lotes por `competencia` |
| `POST` | `/payroll-imports` | rh:operate | RF-RH-070 (cabeçalho + upload de itens) |
| `GET` | `/payroll-imports/:id/items` | rh (leitura) + reforço `financeiro`/admin em `bruto`/`liquido` (§0.2) | RF-RH-070/072/073 |
| `GET` | `/payroll-imports/cost-by-cost-center` | rh (leitura) | RF-RH-071 — agregado, sem detalhamento individual |

### 15.1 `POST /payroll-imports` — Request (multipart, RF-RH-070)

```
competencia=2026-08
fonte=arquivo_provedor_xyz
file=<arquivo do provedor de folha>
```
Cria `PayrollImportBatch` (`importado_por=req.user.id`) e, por linha
aceita do arquivo, um `PayrollImportItem` (`employee_id`, `bruto`,
`encargos`, `liquido`, `custo_total`, `department_id`/`cost_center_id`
resolvido via `Department.cost_center_id`, RF-RH-071). Formato exato do
arquivo `[VERIFICAR COM RH DA EMPRESA]` junto ao provedor (§6.1 dos
requisitos — contrato ainda não assinado no momento deste bloco); este
contrato modela apenas o envelope, mesmo critério de §12.1.

### 15.2 `GET /payroll-imports/:id/items` — Response (RF-RH-072/073)

Para requisitante com `rh` mas sem `financeiro`/`admin`:
```json
{
  "success": true,
  "data": [
    { "id": 1, "employee_id": 501, "department_id": 5, "cost_center_id": 2, "custo_total": "5200.00" }
  ]
}
```
Para requisitante com `rh` **e** `financeiro`/admin, os mesmos registros
incluem `bruto`/`encargos`/`liquido`. Implementado por
`payrollImportSensitiveFields.ts` (novo helper, mesmo formato de
`sanitizeEmployee`), **não** por 403 — mesmo padrão de field-level
segregation já adotado no projeto.

### 15.3 `GET /payroll-imports/cost-by-cost-center` — RF-RH-071/073

```
?competencia=2026-08
```
Resposta agregada (`SUM(custo_total) GROUP BY cost_center_id`) — visível a
qualquer `rh:operate`, sem exigir `financeiro` (RF-RH-073: "agregação por
centro de custo é visível a financeiro sem o detalhamento por
funcionário" — este contrato interpreta que a agregação também é segura
para `rh:operate` puro, já que não expõe `bruto`/`liquido` individual;
`financeiro` sem `rh` **não** acessa este endpoint, pois a rota inteira
está atrás de `authorizeModule('rh')` — se o Financeiro precisar consumir
este agregado sem o módulo `rh`, é uma decisão de atribuição de perfil
(`/api/access-profiles`), não deste contrato).

---

## 16. Grupo 14 — Painel/KPIs de RH — P1

Base: `/api/rh/dashboard`.

| Método | Rota | Nível | RF |
|---|---|---|---|
| `GET` | `/dashboard` | rh (leitura) | RF-RH-074/075/076 |

**1 endpoint**, consolidando (todos agregados, nenhum dado individual
sensível fora do nível já exigido pela entidade de origem — RF-RH-075):

```json
{
  "success": true,
  "data": {
    "turnover_monthly": "0.021",
    "absenteeism_rate": "0.034",
    "vacation_expiring_60d": 4,
    "vacation_expired_dobra": 1,
    "overtime_hours_by_department": [ { "department_id": 3, "he_50": "120.5", "he_100": "8.0" } ],
    "bank_hours_near_limit": 2,
    "payroll_cost_by_cost_center": [ { "cost_center_id": 2, "custo_total": "182000.00" } ],
    "trainings_expiring_60d": 6,
    "trainings_expired": 1,
    "experience_contracts_expiring_10d": 2,
    "pcd_quota": { "required_percent": "0.02", "actual_percent": "0.015", "headcount_active": 132 },
    "apprentice_quota": { "required_percent_min": "0.05", "required_percent_max": "0.15", "actual_percent": "0.03" },
    "headcount_by_department": [ { "department_id": 3, "count": 22 } ],
    "expired_employee_documents": 3
  }
}
```
Cada contagem/soma dispara, na mesma chamada, a verificação ativa de
"nunca esquecido silenciosamente" (RNF-RH-02/RF-RH-076) — reaproveita as
mesmas funções de recálculo de status já descritas em §5.2 (contrato
vencido), §8.3 (concessivo vencido), sem duplicar lógica de detecção.

---

## 17. Grupo 15 — P2: Avaliação de Desempenho e Recrutamento Mínimo

Base: `/api/rh/performance-reviews`, `/api/rh/job-vacancies`, `/api/rh/candidates`.

| Método | Rota | Nível | RF |
|---|---|---|---|
| `GET` | `/performance-reviews` | rh (leitura) | Filtros: `employee_id`, `period`, `status` |
| `POST` | `/performance-reviews` | rh:operate | RF-RH-077 |
| `PUT` | `/performance-reviews/:id` | rh:operate | Só em `status='rascunho'` |
| `GET` | `/job-vacancies` | rh (leitura) | RF-RH-078 |
| `POST` | `/job-vacancies` | rh:operate | RF-RH-078 |
| `PATCH` | `/job-vacancies/:id/status` | rh:operate | `aberta`→`em_triagem`→`fechada`/`cancelada` |
| `GET` | `/candidates` | rh (leitura) | Filtros: `job_vacancy_id`, `stage` |
| `POST` | `/candidates` | rh:operate | RF-RH-079 |
| `PATCH` | `/candidates/:id/stage` | rh:operate | Funil: `triagem`→`entrevista`→`aprovado`/`reprovado` |
| `POST` | `/candidates/:id/promote-to-admission` | rh:operate | RF-RH-080 — cria `AdmissionProcess` pré-preenchido |

**10 endpoints, todos novos, P2.**

`reviewer_id` do `PerformanceReview` sempre `req.user.id` no `POST`, nunca
aceito no body (anti-spoofing — reviewer é sempre quem está autenticado
criando a avaliação; se o RH precisar registrar avaliação em nome de outro
gestor, isso é uma extensão futura fora do MVP).

`POST /candidates/:id/promote-to-admission` — Request:
```json
{ "planned_start_date": "2026-09-15", "job_position_id": 12 }
```
Cria `AdmissionProcess` com `candidate_id`, `candidate_name`/`candidate_cpf`
copiados do `Candidate` (RF-RH-080, conveniência não obrigatória —
`Candidate.stage` deve ser `aprovado`, senão `422
BUSINESS_RULE_VIOLATION`).

---

## 18. Alterações no módulo `employees` já existente (não é `/api/rh/*`)

| Rota | Alteração | Breaking? | RF |
|---|---|---|---|
| `POST`/`PUT /api/employees` | Aceita `pcd` (bool, opcional) | Não — campo novo opcional | RF-RH-067 |
| `POST`/`PUT /api/employees` | Aceita `job_position_id` (opcional, FK `job_positions.id`) | Não — campo novo opcional | RF-RH-025 |
| `PUT /api/employees/:id` | Rejeita alteração de `hire_date` com `422 BUSINESS_RULE_VIOLATION` quando existe `AdmissionProcess` vinculado sem `esocial_s2200_confirmed_at` | **Sim, potencialmente breaking** — qualquer fluxo que hoje edite `hire_date` livremente passa a ser bloqueado nesse cenário específico | RF-RH-010 |
| `PUT /api/employees/:id` | `salary`/`position`/`department_id` passam a, **além de** gravar em `employees` (comportamento atual mantido), também gerar um novo `EmployeeJobHistory` (side effect, RF-RH-065) — decisão deste contrato: `PUT /api/employees/:id` continua aceitando esses campos diretamente (não força o cliente a usar `POST /api/rh/employee-job-history`), mas o backend passa a criar o registro histórico automaticamente quando detecta mudança de valor | **Sim, comportamento novo em endpoint existente** — nenhuma mudança de payload aceito, mas efeito colateral novo (grava em tabela nova). Sinalizado explicitamente para o `AuditorIntegrador`, não é substituição silenciosa | RF-RH-065 |

`GET /api/employees`/`GET /api/employees/:id` **permanecem inalterados**
(mesma sanitização já existente, `hasFullEmployeeAccess`/
`sanitizeEmployee` — este bloco não reabre essa implementação, conforme
RF-RH-006).

---

## 19. Rastreabilidade RF → Endpoint (resumo)

| RF | Endpoint(s) |
|---|---|
| RF-RH-001..005 | `/api/employees`, `/api/departments` (já implementados, sem mudança) |
| RF-RH-006 | `GET /api/employees` (referência, sem mudança) |
| RF-RH-007..012 | Grupo 2, §4 |
| RF-RH-013..016 | Grupo 3, §5 |
| RF-RH-017..023 | Grupo 4, §6 |
| RF-RH-024..026 | Grupo 1, §3 |
| RF-RH-027..030 | Grupo 5, §7 |
| RF-RH-031..043 | Grupo 6, §8 |
| RF-RH-044..049 | Grupo 7, §9 |
| RF-RH-050..054 | Grupo 8, §10 |
| RF-RH-055..059 | Grupo 9, §11 |
| RF-RH-060..063 | Grupo 10, §12 |
| RF-RH-064..066 | Grupo 11, §13 |
| RF-RH-067..069 | §14, `GET /api/rh/dashboard` |
| RF-RH-070..073 | Grupo 13, §15 |
| RF-RH-074..076 | Grupo 14, §16 |
| RF-RH-077..081 | Grupo 15, §17 |

---

## 20. Premissas de schema (para cruzamento com `AdmDBA`)

Declaradas explicitamente para o `AuditorIntegrador` cruzar contra a
modelagem real de banco (que corre em paralelo, a partir do mesmo
documento de requisitos):

1. Todas as 18 entidades novas usam PK `INTEGER autoIncrement`, nunca
   `UUID` (§0 do cabeçalho).
2. `EmployeeContract`, `TerminationProcess`, `VacationAccrualPeriod`,
   `EmployeeJobHistory` são **imutáveis por linha** — qualquer alteração
   relevante grava novo registro; este contrato assume que o `AdmDBA` não
   criará `UPDATE`-friendly colunas sem `effective_from`/`effective_to` ou
   `superseded_*_id` equivalente.
3. `Department.cost_center_id` (já existente, CLAUDE.md §1) é reaproveitado
   sem alteração de schema para RF-RH-053/071.
4. `Asset.responsible_id` (já existente, `FK → employees.id`) é lido
   read-only por `AssetService` (§2) — nenhuma coluna nova é assumida em
   `assets`.
5. `TrainingCourse`/`EmployeeTraining` (RH) são entidades **distintas** de
   `training-matrix`/`trainings` já existentes no schema de `sst` — este
   contrato não assume nomes de tabela compartilhados nem reaproveitamento
   de FK entre os dois clusters (ver §11, premissa detalhada).
6. `employees.job_position_id` (RF-RH-025) e `employees.pcd` (RF-RH-067)
   são colunas novas **nullable** em `employees` — este contrato assume que
   isso é uma migration aditiva simples, sem backfill obrigatório.
7. `PayrollImportItem.bruto`/`.liquido`/`.custo_total`/`.encargos` são
   `DECIMAL`, mesma convenção do restante do projeto.
8. Nomes de tabela (`rh_` prefixado ou não) ficam a critério do `AdmDBA` —
   este contrato usa PascalCase (nome de entidade) nos payloads e não
   assume um prefixo específico, diferente do Bloco 5 MKT que fixou
   `marketing_*` (aqui não há módulo legado com prefixo `rh_` a seguir).

---

## 21. Pendências e decisões que ficam para o `AdmDBA`/`programador`/dono do produto

1. ~~**Extensão da rota SST `training-matrix` para aceitar `rh`**~~ —
   **RESOLVIDO em 2026-08-12** (decisão do dono, RF-INT-RH-SST-01): `GET
   /api/sst/training-matrix` aceita `sst`|`rh` via `requireSstOrRh`
   (middleware já existente, reaproveitado sem alteração); a integração
   síncrona de validade normativa foi implementada (ver §11).
2. ~~**Formato do arquivo de importação de ponto (RF-RH-061)**~~ —
   **RESOLVIDO em 2026-08-12**: decisão do dono, importador AEJ implementado
   (§12, `docs/rh/04-FREQUENCIA.md`). O layout exato aceito pelo parser é
   uma escolha pragmática (delimitado por `;`), **ainda não confirmada
   contra um arquivo real** da administradora — ajustar
   `aejParser.ts`/`parseWorkdayFields` quando a amostra chegar. **Formato do
   arquivo de importação de folha (RF-RH-070)** continua
   `[VERIFICAR COM RH DA EMPRESA]`, depende de contrato ainda não assinado
   (§6.2 dos requisitos).
3. **Percentual máximo de equipe simultaneamente em férias por
   departamento (RF-RH-039)** — `[VERIFICAR COM RH DA EMPRESA]` o valor
   padrão; modelado como coluna `Department.vacation_team_limit_percent`
   (nova, nullable, sem default hard-coded) — confirmar com o `AdmDBA` se
   esse é o lugar certo ou se deve ser uma constante de código como em
   `budget_alert_level` do Bloco 5 MKT.
4. **Reforço de acesso a `Absence.cid`/`PayrollImportItem.bruto/liquido`
   via `rh:approve`** (§0) é uma decisão deste contrato, não um mandato
   explícito e inequívoco do documento de requisitos (que delega a decisão
   final ao arquiteto — §6.3/6.4 dos requisitos). Se o dono do produto
   preferir um submódulo `rh_payroll` dedicado em vez de reaproveitar o
   nível `approve` de `rh`, é uma mudança pontual neste contrato antes da
   implementação.
5. **Mecanismo de abertura automática de `VacationAccrualPeriod`** (cron
   vs. trigger em `ConcludeAdmissionUseCase` + verificação ativa em
   leitura) — decisão de implementação do `programador`, não fixada aqui.
6. **`s2200`/`s2299`/`s2230`/eventos eSocial equivalentes** — todos os
   campos `*_confirmed_at`/`*_confirmed_by` deste contrato são apenas
   **checkboxes de confirmação manual**, nunca transmissão real (RNF-RH-03,
   herdado dos Blocos SST/consistente com a decisão de não construir
   motor de eSocial).
7. **[ADICIONADO pelo `AuditorIntegrador`, 2026-08-09] `employees.pcd`
   precisa ser incluído em `SENSITIVE_EMPLOYEE_FIELDS`** —
   confirmado por leitura de
   `server/src/modules/employees/domain/services/employeeSensitiveFields.ts`:
   a lista atual (`cpf`, `rg`, `pis_pasep`, `ctps`, `salary`, `salary_type`,
   `bank_*`, `pix_key`, `address`, `phone`) **não inclui** `pcd`, mas o
   documento de requisitos marca `Employee.pcd` com 🔒 (RF-RH-067) e o
   próprio dado (condição de pessoa com deficiência) é dado sensível de
   saúde por natureza (LGPD art. 5º II), mais restrito que a maioria dos
   campos já protegidos. Nenhum dos três artefatos deste bloco instruía
   explicitamente essa alteração de código — o `programador` (passo 4)
   deve adicionar `'pcd'` a `SENSITIVE_EMPLOYEE_FIELDS` na mesma migration/
   PR que adiciona a coluna, e não apenas confiar em `authorizeModule('rh')`
   das rotas novas (que não protege `GET /api/employees`, rota que
   permanece aberta a qualquer autenticado).
8. **[ADICIONADO pelo `AuditorIntegrador`, 2026-08-09] Conflito entre
   `DELETE /api/employees/:id` (já em produção) e o novo
   `TerminationProcess`** — `DeactivateEmployeeUseCase`
   (`server/src/modules/employees/application/use-cases/
   DeactivateEmployeeUseCase.ts`) já hoje seta `status='inactive'` +
   `dismissal_date=hoje` como forma de desligar um funcionário (rota `DELETE
   /api/employees/:id`, soft-delete). Nenhum artefato deste bloco cita ou
   reconcilia essa rota existente com o novo fluxo de demissão formal
   (`POST /termination-processes/:id/conclude`, RF-RH-022, que seta
   `status='fired'`). Sem decisão explícita, o ERP passará a ter **dois
   caminhos concorrentes** para desligar um funcionário, com status finais
   diferentes (`inactive` vs `fired`) e sem o checklist/gates de
   `TerminationProcess` (ASO demissional, devolução de ativos, prazo de
   verbas) no caminho antigo. Decisão pendente do dono do produto: (a)
   bloquear `DELETE /api/employees/:id` quando `TerminationProcess` for
   implantado, redirecionando todo desligamento formal para o novo fluxo,
   ou (b) manter as duas rotas para cenários distintos (ex.: `DELETE` para
   correção de cadastro indevido, `TerminationProcess` para desligamento
   real) — mas documentando a distinção explicitamente, o que nenhum dos
   três artefatos faz hoje.
9. **[ADICIONADO pelo `AuditorIntegrador`, 2026-08-09] Fronteira
   RH×SST em treinamento normativo (`is_normative=true`) ainda permite
   drift de dado** — confirmado por leitura de
   `server/src/modules/sst/domain/repositories/TrainingRepository.ts`
   (`findMatrixByPositionAndNorma`, `findBlocklist`) que o SST já mantém
   sua própria matriz função×norma e seu próprio blocklist de "quem não
   pode operar" por treinamento de NR vencido/ausente. Este contrato cria,
   para os mesmos cursos normativos, um **segundo** registro de conclusão
   (`hr_employee_trainings`) e um **segundo** relatório "quem não pode
   operar" (RF-RH-058, `GET
   /employee-trainings/cannot-operate-report`) — sem nenhum mecanismo de
   sincronização automática (§11 já registra isso como "cópia manual" na
   ausência de integração síncrona). Duas fontes de verdade independentes
   para a mesma pergunta ("fulano está apto a operar a máquina X conforme
   NR-12?") é risco real de divergência silenciosa, o mesmo padrão de
   problema já visto em duplicação de módulo no Bloco 3 (Jurídico).
   Recomendação do `AuditorIntegrador`: para `TrainingCourse.is_normative
   =true`, `RF-RH-058` (relatório "quem não pode operar" do RH) deveria
   **delegar** a checagem de normativos para `GET
   /api/sst/trainings/blocklist` (via o mesmo adapter `SstAsoService` já
   desenhado para ASO) em vez de calcular a partir de
   `hr_employee_trainings`, e `hr_employee_trainings` deveria aceitar
   normativos apenas como **espelho de leitura** (import, não fonte
   primária) quando `is_normative=true`. Decisão de arquitetura — não
   implementada nesta correção, registrada como pendência para o dono do
   produto/`ArquitetoSoftwareAPI` decidir antes do passo 4.

---

*Documento produzido sob o mesmo protocolo de rigor dos blocos anteriores:
toda decisão de nomenclatura/RBAC/formato cita o RF que a motiva; nenhuma
tabela de banco foi desenhada aqui (escopo de `AdmDBA`, rodando em
paralelo a partir do mesmo documento de requisitos — divergências pontuais
de nome são esperadas e cabem ao `AuditorIntegrador`); pendências de
negócio marcadas explicitamente em vez de assumidas; endpoints de
folha/ponto deliberadamente NÃO especificados (RNF-RH-03), apenas a
fronteira de importação/exportação de dados já calculados por terceiros.*
