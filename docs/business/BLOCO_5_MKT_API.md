# BLOCO 5 (CORREÇÃO) — Módulo Marketing (MKT) — Contrato de API

**Departamento:** 14 — Marketing.
**Natureza deste documento:** **correção de contrato**, não greenfield. Já
existe `/api/marketing/*` em produção parcial (commit `2ad27fd`, rotas em
`server/src/modules/marketing/presentation/routes/marketing.ts`). Este
documento especifica **breaking changes explícitas** nos endpoints de
`leads`/`campaigns`/`materials` e os endpoints **novos** exigidos por
`docs/business/BLOCO_5_MKT_REQUISITOS.md` (40 RF-MKT, UC-63 a UC-66):
conversão atômica de lead, handoff com SLA, deduplicação/lote de captação,
Evento/Feira (entidade nova), KPIs de funil, orçamento/aprovação/alerta de
campanha e aprovação de material.

**Insumos:** `docs/business/BLOCO_5_MKT_REQUISITOS.md` (RF-MKT-001 a
RF-MKT-040, UC-63 a UC-66, §5 pontos em aberto), `docs/business/
BLOCO_5_MKT_VERIFICACAO.md` (gaps críticos do commit `2ad27fd`),
`server/src/modules/marketing/` (código atual), `server/src/modules/
clients/` (padrão de criação/consulta de `Client`, reaproveitado via
adapter — nunca Sequelize direto), `server/src/modules/ti/application/
services/MaintenanceOrderService.ts` + `.../infrastructure/adapters/
MaintenanceOrderServiceAdapter.ts` (precedente de serviço injetado
cross-module que este contrato replica para `ClientService`/
`SalesRevenueService`), `docs/business/BLOCO_4_FAC_API.md` (formato de
referência).
**Autor:** `ArquitetoSoftwareAPI`.
**Data:** 2026-08-07.
**Status:** 🟡 Contrato pronto para modelagem de banco em paralelo
(`AdmDBA`) e implementação futura (`programador`). **Nenhum código foi
alterado neste passo.**

Base URL: `/api/marketing/*` (módulo existente, `server/src/modules/
marketing/`), exceto onde indicado (reaproveitamento de `/api/clients` via
adapter interno, nunca chamada HTTP entre módulos).

**Convenção de nomes de tabela:** prefixo `marketing_` + snake_case,
seguindo a nomenclatura já em uso (`marketing_campaigns`, `marketing_leads`,
`marketing_materials`) e estendendo para as entidades novas:
`marketing_events`, `marketing_event_checklist_items`. Nomes definitivos são
decisão do `AdmDBA`; este contrato assume esses nomes como base para os
payloads.

**Autenticação:** `Authorization: Bearer <JWT>` em todas as rotas
(`authenticate`). Identidade de quem executa a ação **sempre** vem de
`req.user.id` (nunca do body) — aplica-se a `approved_by` (aprovação de
orçamento/material), `budget_approved_by`. Referência a pessoa em qualquer
payload usa exclusivamente `user_id`/`client_id` (nunca duplica nome/
CPF-CNPJ — quem quiser exibir, resolve via `GET /api/users/:id` /
`GET /api/clients/:id`).

**Tipos de dado:** PKs/FKs deste módulo continuam `integer`
(`INTEGER autoIncrement`), consistente com a implementação atual —
`marketing_events`/`marketing_event_checklist_items` seguem o mesmo padrão
(nunca `UUID`). `product_id`/`stock_item_id` referenciam `items.id`, que é
`UUID` no schema real (precedente já confirmado em `marketing_materials.
product_id`). Valores monetários (`budget_requested`, `budget_approved`,
`actual_cost`, `roi`) são `DECIMAL` expostos como **string** no JSON, nunca
`number` (mesma decisão do restante do projeto — evita perda de precisão
de ponto flutuante). Datas são `DATEONLY` (`"YYYY-MM-DD"`) para campos de
planejamento (`start_date`/`end_date` de campanha/evento) e `TIMESTAMP`
para eventos pontuais (`qualified_at`, `handoff_at`, `converted_at`,
`consent_date`, `approved_at`, `budget_approved_at`).

---

## 0. RBAC — módulo `marketing` ganha nível `approve` (pontual)

`server/src/shared/domain/accessModules.ts` já tem a chave `marketing`
(hoje 2 níveis efetivos: leitura implícita/`operate`, sem `approve` — ver
comentário estrutural linhas 109-115). Esta correção **não cria chave
nova**, adiciona uso pontual de `approve` em 2 ações específicas, seguindo
o mesmo precedente de `facilities`/`contabilidade` (não é o módulo inteiro
que muda de padrão):

| Ação | Nível | RF |
|---|---|---|
| Aprovar/rejeitar orçamento de campanha (`POST /campaigns/:id/budget-decision`) | `approve` | RF-MKT-030/031 |
| Aprovar material promocional (`PATCH /materials/:id/approve`) | `approve` | RF-MKT-039 |

Tudo o mais (CRUD de campanha/lead/material/evento, conversão, handoff,
captação em lote, checklist, recálculo de métricas, relatórios) usa
`operate`. Leitura usa o nível padrão (`authorizeModule('marketing')`,
`operate` implícito), mantendo o padrão já em produção.

`[VERIFICAR COM MARKETING]` (herdado de RF-MKT §5.1): se o Coordenador de
Marketing tem `approve` por padrão no seu perfil de acesso, ou se a
aprovação de orçamento é de outro perfil (Diretor Comercial/Financeiro
operando dentro do módulo MKT). Este contrato modela o endpoint
independente de quem efetivamente tem o nível — é decisão de atribuição de
perfil (`/api/access-profiles`), não de rota.

O comentário estrutural de `accessModules.ts` (linhas 109-115, "sem nível
`approve`") deve ser atualizado pelo `programador` na implementação, para
não deixar a documentação inline desatualizada.

---

## 1. Padrão de erro e transversais

Idêntico ao restante do projeto — `AppError`/subclasses (`ValidationError`
400/422, `NotFoundError` 404, `UnauthorizedError` 401, `ForbiddenError` 403,
`ConflictError` 409, `BusinessRuleError` 422) tratadas pelo `errorHandler`
central, nunca stack trace ao cliente. Ver `docs/arquitetura/API.md` seção
"Respostas Padrão" para o shape exato (`{ success: false, error: { code,
message, details } }`).

**Sem exclusão física:** nenhum recurso deste módulo ganha rota `DELETE`
nesta correção, mantendo o padrão já correto da primeira entrega. Correção
de estado é sempre novo status/registro, nunca `UPDATE` destrutivo de
campo histórico (aplica-se em especial ao funil de lead e ao ciclo de vida
de evento/campanha).

**Auditoria:** toda escrita deste módulo deve chamar `AuditLog.logAction`
(mesmo padrão SST/TI/JUR/FAC) — hoje ausente no módulo MKT; correção
registrada aqui, não é uma rota nova, é uma responsabilidade transversal de
todos os endpoints de escrita abaixo.

---

## 2. Estrutura de módulo (ajustada — Clean Architecture)

```
server/src/modules/marketing/
├── domain/
│   ├── entities/            # MarketingCampaign, MarketingLead (com novos
│   │                         #  campos), MarketingMaterial, MarketingEvent
│   │                         #  (NOVO), MarketingEventChecklistItem (NOVO)
│   └── repositories/        # CampaignRepository, LeadRepository,
│                             #  MaterialRepository, EventRepository (NOVO)
├── application/
│   ├── services/             # ClientService (NOVO), SalesRevenueService
│   │                          #  (NOVO) — cada uma com adapter em
│   │                          #  infrastructure/, nunca import direto de
│   │                          #  outro módulo/Sequelize a partir daqui
│   └── use-cases/            # Um UseCase por ação de negócio (ver por grupo)
├── infrastructure/
│   ├── adapters/              # ClientServiceAdapter (NOVO — envolve
│   │                          #  CreateClientUseCase/ClientsRepository de
│   │                          #  modules/clients/, nunca Client.create()
│   │                          #  direto), SalesRevenueServiceAdapter (NOVO
│   │                          #  — agregação read-only contra o model Sale,
│   │                          #  papel de infraestrutura, não de domínio)
│   └── sequelize/              # SequelizeCampaignRepository,
│                              #  SequelizeLeadRepository,
│                              #  SequelizeMaterialRepository,
│                              #  SequelizeEventRepository (NOVO)
└── presentation/
    ├── controllers/            # campaignController, leadController,
    │                          #  materialController, eventController
    │                          #  (NOVO), reportController (NOVO)
    ├── routes/
    │   # marketing.ts (router agregador único, mantém montagem em
    │   # /api/marketing em server/app.ts)
    └── validators/             # campaignValidators, leadValidators,
                               #  materialValidators, eventValidators (NOVO)
```

**Tipos extraídos para `*Types.ts`** (evitar ESM+CJS no mesmo arquivo, a
armadilha real do projeto): `EventTypes.ts`, `ConvertLeadTypes.ts`,
`FunnelReportTypes.ts` — qualquer arquivo cuja classe/use case use
`export =` não deve coexistir com `export interface`/`export type` no
mesmo arquivo.

**Baixo acoplamento — serviços injetados, nunca import direto de outro
módulo:**

1. **`ClientService`** — usado por `ConvertLeadUseCase` (RF-MKT-001/002/
   003). Interface:
   ```ts
   class ClientService {
     async findById(id: number): Promise<any | null> { throw new Error('não implementado'); }
     async search(query: { name?: string; cpf_cnpj?: string; phone?: string; email?: string }): Promise<any[]> { throw new Error('não implementado'); }
     async create(data: Record<string, unknown>, transaction?: unknown): Promise<any> { throw new Error('não implementado'); }
   }
   ```
   `ClientServiceAdapter` implementa `create` chamando
   `CreateClientUseCase.execute()` (reaproveita a validação de documento e
   o `ConflictError` de CPF/CNPJ duplicado já existentes em
   `modules/clients/application/use-cases/CreateClientUseCase.ts`) — **não
   duplica** a lógica de `Validators.validateDocument`. `findById`/`search`
   chamam `ClientsRepository.findById`/`.list({ search })` do módulo
   `clients`, também sem SQL próprio no módulo MKT. Este é o mesmo padrão
   de `MaintenanceOrderServiceAdapter` (`modules/ti/`) — o precedente que
   este contrato replica em vez de reinventar acesso direto a
   `models/Client`.
2. **`SalesRevenueService`** — usado por `RecalculateCampaignMetricsUseCase`
   (RF-MKT-008/009) e pelo `GetFunnelReportUseCase` (RF-MKT-026/029) para
   calcular receita atribuída/ROI. Interface:
   ```ts
   class SalesRevenueService {
     async getAttributedRevenue(clientIds: number[], sinceDate: Date, untilDate?: Date): Promise<string> { throw new Error('não implementado'); }
   }
   ```
   `SalesRevenueServiceAdapter` (infraestrutura, pode usar Sequelize
   diretamente — é adapter, não use case) agrega `SUM(sales.total_amount)`
   de `Sale` com `customer_id IN (:clientIds)` (**correção desta
   auditoria:** a FK real em `server/src/models/Sale.ts` é `customer_id`,
   não `client_id` — `client_id` não existe como coluna de `Sale`, apesar
   de referenciar `clients.id`) e `status IN ('invoiced', 'shipped')`
   (nunca `canceled`), respeitando a janela de atribuição (RF-MKT-010) via
   `sales.created_at` (`Sale` não tem `invoiced_at`/campo de faturamento
   dedicado hoje — confirmado nesta auditoria; `created_at` é o único
   candidato real disponível, o `AdmDBA`/`programador` decidem se isso é
   aceitável ou se um campo de faturamento precisa ser adicionado em
   correção futura) entre `sinceDate` e `untilDate`.

---

## 3. Resumo de breaking changes

| Antes (`2ad27fd`) | Depois (este contrato) | Motivo |
|---|---|---|
| `POST /leads/:id/status` aceita `status='converted'` + `converted_to_customer_id` opcional | `POST /leads/:id/status` **rejeita** `status='converted'` (422, orienta a usar `/convert`); conversão só via `POST /leads/:id/convert`, transacional e com cliente obrigatório | RF-MKT-001/002/003, achado 2.1 da verificação |
| Campo `converted_to_customer_id` | **Mantido sem rename** (mesmo nome, mesmo tipo, mesma FK `clients.id`) — correção de nomenclatura deste contrato: uma passada anterior deste documento havia proposto renomear para `converted_client_id` no payload da API, mas a coluna já existe em produção desde `20260807-000210` com FK e índice ativos (`AdmDBA`, `docs/business/BLOCO_5_MKT_MODELO_DADOS.md` §0); rejeitado explicitamente pelo `AuditorIntegrador` para não introduzir um rename disruptivo sem necessidade funcional nem divergência de nome entre Requisito/Banco/API | Alinhamento Requisito↔Banco↔API — nome definitivo em todas as três camadas é `converted_to_customer_id` |
| `PUT /campaigns/:id` aceita `leads_generated`/`conversions`/`roi` | Removidos de `updateCampaignSchema`/`createCampaignSchema` — envio rejeita com 400 (`.strict()` já barra chave desconhecida) | RF-MKT-006 |
| `campaign.budget` (campo único) | Substituído por `budget_requested`/`budget_approved`/`budget_approval_status`/`budget_approved_by`/`budget_approved_at` | RF-MKT-030 |
| `POST /materials` aceita `approved: true` | `approved` removido do payload de criação — todo material nasce `false` | RF-MKT-039 |
| `createLeadSchema`: `email`/`phone`/`lead_source` todos opcionais | `email` OU `phone` obrigatório (cruzado); `lead_source` obrigatório | RF-MKT-016/017 |
| `PUT /campaigns/:id` aceita qualquer campo em qualquer status | Bloqueado quando `status` atual é `completed`/`canceled`, exceto `notes` | RF-MKT-034 |

---

## 4. Grupo 1 — Leads (alterado + novo) — UC-63, UC-64

Base: `/api/marketing/leads`.

### 4.1 Endpoints

| Método | Rota | Nível | Status | Descrição |
|---|---|---|---|---|
| `GET` | `/leads` | operate | **alterado** | Lista leads — novos filtros: `sla_breached` (bool), `event_id`, `sales_owner_user_id`, `data_issue_flag` (bool, RF de saneamento §2) |
| `GET` | `/leads/:id` | operate | inalterado | Detalhe do lead |
| `POST` | `/leads` | operate | **alterado** | Cria lead — validação cruzada contato, `lead_source` obrigatório, deduplicação (RF-MKT-016/017/018) |
| `POST` | `/leads/bulk` | operate | **novo** | Captação em lote (RF-MKT-019) |
| `PUT` | `/leads/:id` | operate | **alterado** | Nunca aceita `status` (já não aceitava — confirmado explicitamente neste contrato como decisão permanente, RF §0 da correção) nem `converted_to_customer_id` |
| `POST` | `/leads/:id/status` | operate | **alterado** | Funil, **exceto** transição para `converted` (RF-MKT-001) |
| `POST` | `/leads/:id/handoff` | operate | **novo** | Atribui/reatribui `sales_owner_user_id` (RF-MKT-011/012/013) |
| `POST` | `/leads/:id/convert` | operate | **novo** | Conversão atômica lead→cliente (RF-MKT-001/002/003) |

**8 endpoints** (3 alterados: `GET` lista, `POST` criação, `PUT`, `POST
.../status`; 3 novos: `bulk`, `handoff`, `convert`). Nota: `PUT /leads/:id`
é contado como alterado por confirmação de contrato (nenhuma mudança de
schema é necessária além do que já existe — `status` nunca esteve no
`updateLeadSchema`), mas está listado porque este documento é a fonte
formal que impede reintrodução futura do campo.

### 4.2 `POST /api/marketing/leads` — Request (alterado)

```json
{
  "campaign_id": 12,
  "event_id": null,
  "name": "João Pereira",
  "email": "joao@exemplo.com",
  "phone": "11999998888",
  "company": "Loja XYZ",
  "interest": "Kit 15 pol.",
  "lead_source": "website",
  "lead_score": 40,
  "consent_given": true,
  "consent_date": "2026-08-07",
  "consent_channel": "formulario_site"
}
```

**Regras de validação (`createLeadSchema`, Zod `.strict()` +
`.refine()`):**
- `name` obrigatório (já existente).
- **Novo:** `email` OU `phone` obrigatório — payload só com `name` é
  rejeitado (`ValidationError` 400, RF-MKT-016).
- **Novo:** `lead_source` passa de `.optional()` para obrigatório
  (RF-MKT-017). Enum mantido: `website`/`instagram`/`facebook`/`google`/
  `email`/`event`/`indication`/`other`.
- **Novo:** `event_id` opcional (`marketing_events.id`); se presente,
  `lead_source` é forçado/validado como `event` — inconsistência
  (`event_id` presente com `lead_source` diferente de `event`) é
  `ValidationError` 400 (RF-MKT-022).
- **Novo:** `consent_given`/`consent_date`/`consent_channel` opcionais
  (RF-MKT-035/036) — `consent_channel` enum: `formulario_site`/
  `whatsapp`/`telefone`/`feira`/`indicacao`/`outro`.

**Deduplicação (RF-MKT-018, executada pelo use case antes de criar):**
1. Normaliza `email`/`phone` e busca em `marketing_leads` com `status NOT
   IN ('converted', 'lost')` — match encontrado → `409 Conflict`,
   `code: "DUPLICATE_LEAD"`, `details: { existing_lead_id }`.
2. Se não houver duplicidade de lead, busca em `clients` via
   `ClientService.search()` por `cpf_cnpj`/telefone/e-mail normalizado
   (reuso de `/api/clients`, sem duplicar lógica de normalização) —
   cliente ativo encontrado → **não cria o lead**, retorna `409 Conflict`,
   `code: "CLIENT_ALREADY_EXISTS"`, `details: { matched_client: { id,
   name, cpf_cnpj } }`, para o operador registrar a interação como
   comercial direta.

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `name` ausente; nem `email` nem `phone` informado; `lead_source` ausente; `event_id` presente com `lead_source` inconsistente |
| 404 | `NOT_FOUND` | `campaign_id`/`event_id` informado não existe |
| 409 | `DUPLICATE_LEAD` | Lead aberto já existe com mesmo contato |
| 409 | `CLIENT_ALREADY_EXISTS` | `clients` já tem registro ativo com mesmo documento/contato |

Resposta (`201`): lead criado, shape inalterado além dos campos novos.

### 4.3 `POST /api/marketing/leads/bulk` — Request (novo, RF-MKT-019)

```json
{
  "event_id": 7,
  "leads": [
    { "name": "Maria Silva", "phone": "11988887777", "lead_source": "event" },
    { "name": "Sem contato" }
  ]
}
```

`event_id` no nível do lote é aplicado a todo item que não traga o
próprio `event_id` (conveniência de captação pós-feira). Cada item passa
pelas mesmas validações de `POST /leads` (RF-MKT-016/017/018), **item a
item, não tudo-ou-nada** (RF-MKT-019, UC-65 E2).

Resposta (`200` — processamento parcial é resultado esperado, não erro
HTTP):
```json
{
  "success": true,
  "data": {
    "created": [ { "index": 0, "lead": { "id": 501, "name": "Maria Silva", "..." : "..." } } ],
    "rejected": [ { "index": 1, "error": { "code": "VALIDATION_ERROR", "message": "É necessário informar email ou phone." } } ]
  }
}
```

### 4.4 `POST /api/marketing/leads/:id/status` — Request (alterado)

```json
{ "status": "qualified", "sales_owner_user_id": 34 }
```

**Funil corrigido (RF-MKT-005):**
```
new → contacted → qualified → in_sales_attendance → converted
                                                    ↘
                                          lost (de qualquer etapa aberta)
```
`converted` **não é uma transição aceita por este endpoint** — deixa de
constar em `leadStatusEnum` deste schema (`new`/`contacted`/`qualified`/
`in_sales_attendance`/`lost` apenas). Tentativa de enviar
`status: 'converted'` aqui retorna `422 BUSINESS_RULE_VIOLATION`,
`message: "Use POST /leads/:id/convert para converter um lead."`.

`sales_owner_user_id` é aceito **somente** quando `status='qualified'`
(atribuição simultânea, UC-64 A1) — grava `qualified_at=now()` e, se o
campo vier preenchido, também `handoff_at=now()`. Transição para
`in_sales_attendance` **exige** que o lead já tenha
`sales_owner_user_id` preenchido (de handoff anterior ou desta mesma
chamada de qualificação) — sem isso, `422 BUSINESS_RULE_VIOLATION`
(RF-MKT-012).

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `status` ausente ou fora do enum permitido neste endpoint |
| 404 | `NOT_FOUND` | Lead não existe; `sales_owner_user_id` não corresponde a usuário existente |
| 422 | `BUSINESS_RULE_VIOLATION` | Transição não permitida pelo funil; `status='converted'` (redireciona a `/convert`); `in_sales_attendance` sem `sales_owner_user_id` prévio; `sales_owner_user_id` de usuário inativo |

### 4.5 `POST /api/marketing/leads/:id/handoff` — Request (novo, RF-MKT-011/012/013, UC-64)

```json
{ "sales_owner_user_id": 34 }
```

Atribui (ou reatribui) o responsável de Vendas sem mudar `status`. Grava
`handoff_at=now()`. Aplicável a partir de `status='qualified'`
(reatribuição também permitida em `in_sales_attendance`, ex. troca de
vendedor). Usado tanto pelo endpoint padrão quanto pelo módulo de Vendas
(RF-MKT-015 — mesmo endpoint, RBAC dupla via
`authorizeAnyModule([{ moduleKey: 'marketing', requiredLevel: 'operate' },
{ moduleKey: 'vendas', requiredLevel: 'operate' }])`, decisão deste
contrato para permitir que o vendedor aceite/reatribua o próprio handoff
sem depender de Marketing operar por ele. **Correção desta auditoria:** a
chave de RBAC do módulo de Vendas em `accessModules.ts` é `vendas` (não
`sales` — `sales` não existe no catálogo de módulos, ver linha 232 do
arquivo), e o middleware de composição OR **já existe**
(`server/src/middlewares/authorizeAnyModule.ts`, criado no Bloco 4 FAC,
09/2026-08-07 — não é uma pendência de infraestrutura a criar; uma versão
anterior deste contrato descrevia erroneamente como "a criar", replicando
por engano a pendência já resolvida do Bloco 4). O `programador` só
precisa importar e usar `authorizeAnyModule`, não implementá-lo).

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `sales_owner_user_id` ausente |
| 404 | `NOT_FOUND` | Lead não existe; usuário não existe |
| 422 | `BUSINESS_RULE_VIOLATION` | `sales_owner_user_id` de usuário inativo; lead em status anterior a `qualified` (`new`/`contacted`) ou terminal (`converted`/`lost`) |

Resposta (`200`): lead atualizado com `sales_owner_user_id`,
`handoff_at`.

**Nota de decisão (SLA):** este contrato modela o SLA de handoff
(RF-MKT-014) como o intervalo entre `qualified_at` e `handoff_at`
(ou "agora" se ainda não atribuído) — **não** foi criado um endpoint
`first-response` separado, porque `docs/business/BLOCO_5_MKT_REQUISITOS.md`
não define nenhum evento de "primeira resposta do vendedor" distinto da
atribuição (RF-MKT-013 só menciona `qualified_at`/`handoff_at`). Se
o Coordenador de Marketing quiser medir tempo de primeira interação do
vendedor após o handoff (métrica distinta de "tempo até ser atribuído"),
isso fica registrado como pendência para uma futura correção, condicionada
a `[VERIFICAR COM MARKETING]`.

### 4.6 `POST /api/marketing/leads/:id/convert` — Request (novo, RF-MKT-001/002/003, UC-63)

**Opção A — vincular cliente existente:**
```json
{ "client_id": 4821 }
```

**Opção B — criar cliente novo (mesma transação):**
```json
{
  "new_client": {
    "name": "João Pereira",
    "cpf_cnpj": "12345678900",
    "phone": "11999998888",
    "email": "joao@exemplo.com",
    "cep": "01310-100",
    "street": "Av. Paulista",
    "number": "1000",
    "city": "São Paulo",
    "state": "SP"
  }
}
```

Exatamente uma das duas chaves (`client_id` XOR `new_client`) — `.refine()`
cruzado rejeita payload com nenhuma ou ambas (`ValidationError` 400, UC-63
E3). `new_client` reaproveita as mesmas regras de `CreateClientUseCase`
(`name`/`cpf_cnpj` obrigatórios, documento validado por
`Validators.validateDocument`).

**Transação (RF-MKT-002):**
1. Valida transição: lead precisa estar em `qualified` ou
   `in_sales_attendance` — senão `422 BUSINESS_RULE_VIOLATION` (UC-63 E2),
   nenhuma escrita.
2. Opção A: `ClientService.findById(client_id)` — não encontrado → `404
   NOT_FOUND`, nenhuma escrita (RF-MKT-003).
   Opção B: `ClientService.create(new_client, transaction)` dentro da
   **mesma transação de banco** que a atualização do lead — falha (ex.
   `ConflictError` de CPF/CNPJ duplicado) reverte a transação inteira; o
   lead permanece no status anterior (UC-63 E1).
3. Grava `status='converted'`, `converted_to_customer_id`, `converted_at=now()`
   no lead, na mesma transação do passo 2.
4. Fora da transação (efeito colateral não crítico, não deve reverter a
   conversão se falhar): se `lead.campaign_id` presente, dispara o mesmo
   recálculo de `RecalculateCampaignMetricsUseCase` (RF-MKT-009) para a
   campanha — mantém `leads_generated`/`conversions`/`roi` como cache
   consistente sem incremento manual solto.

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Nem `client_id` nem `new_client` informado, ou ambos; `new_client.cpf_cnpj` ausente/inválido |
| 404 | `NOT_FOUND` | `client_id` não corresponde a cliente existente; lead não existe |
| 409 | `CONFLICT` | `new_client.cpf_cnpj` já cadastrado — mensagem original de `CreateClientUseCase` ("CPF/CNPJ já cadastrado"), sugestão de usar Opção A |
| 422 | `BUSINESS_RULE_VIOLATION` | Lead não está em `qualified`/`in_sales_attendance` |

Resposta (`200`):
```json
{
  "success": true,
  "data": {
    "lead": { "id": 501, "status": "converted", "converted_to_customer_id": 4821, "converted_at": "2026-08-07T14:32:00.000Z", "...": "..." },
    "client": { "id": 4821, "name": "João Pereira", "...": "..." }
  }
}
```

---

## 5. Grupo 2 — Campanhas (alterado + novo)

Base: `/api/marketing/campaigns`.

### 5.1 Endpoints

| Método | Rota | Nível | Status | Descrição |
|---|---|---|---|---|
| `GET` | `/campaigns` | operate | **alterado** | Lista — expõe `budget_alert_level` calculado (RF-MKT-032) |
| `GET` | `/campaigns/:id` | operate | **alterado** | Detalhe — idem |
| `POST` | `/campaigns` | operate | **alterado** | Cria — remove `leads_generated`/`conversions`/`roi` do payload aceito; adiciona `budget_requested` |
| `PUT` | `/campaigns/:id` | operate | **alterado** | Remove `leads_generated`/`conversions`/`roi`; bloqueia edição pós `completed`/`canceled` exceto `notes`; bloqueia `status='active'` sem orçamento aprovado |
| `POST` | `/campaigns/:id/budget-decision` | **approve** | **novo** | Aprova/rejeita orçamento (RF-MKT-030/031) |
| `POST` | `/campaigns/:id/recalculate-metrics` | operate | **novo** | Recálculo idempotente de `leads_generated`/`conversions`/`roi` (RF-MKT-009, RNF-MKT-001) |

**6 endpoints** (4 alterados, 2 novos).

### 5.2 `POST`/`PUT /campaigns` — Request (alterado)

```json
{
  "name": "Black Friday Auto-falantes 2026",
  "description": "Campanha de performance em Ads + Social",
  "campaign_type": "ads",
  "start_date": "2026-11-01",
  "end_date": "2026-11-30",
  "budget_requested": "50000.00",
  "target_audience": "Lojistas de som automotivo",
  "channel": "google_ads",
  "status": "planned"
}
```

**Mudanças no schema (`.strict()`):**
- **Removido** de `createCampaignSchema`/`updateCampaignSchema`:
  `budget` (substituído por `budget_requested`), `leads_generated`,
  `conversions`, `roi` — envio de qualquer um retorna `400
  VALIDATION_ERROR` com a lista de chaves não reconhecidas (RF-MKT-006).
- **Novo:** `budget_requested` (`DECIMAL`, obrigatório em `POST`, opcional
  em `PUT`) substitui `budget`.
- **Novo (somente em `PUT`):** `notes` (texto livre, único campo aceito
  quando `status` atual é `completed`/`canceled`).
- `actual_cost` continua aceito em `POST`/`PUT` (custo realizado —
  lançamento manual, dívida técnica registrada com Financeiro, RF §1.10).

**Regra de imutabilidade (RF-MKT-034, `PUT` apenas):**
```
current.status IN ('completed', 'canceled')
  ⇒ apenas { notes } é aceito no payload; qualquer outra chave presente
    (mesmo que igual ao valor atual) retorna 422 BUSINESS_RULE_VIOLATION
```

**Regra de ativação (RF-MKT-031, `PUT` apenas):**
```
payload.status === 'active' AND current.budget_approval_status !== 'approved'
  ⇒ 422 BUSINESS_RULE_VIOLATION, message: "Campanha não pode ser ativada
    sem orçamento aprovado."
```

**Erros adicionais (`POST`/`PUT`):**
| Código | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `leads_generated`/`conversions`/`roi`/`budget` enviados (chave desconhecida) |
| 422 | `BUSINESS_RULE_VIOLATION` | Edição de campo além de `notes` em campanha `completed`/`canceled`; ativação sem orçamento aprovado |

### 5.3 `GET /campaigns` / `GET /campaigns/:id` — Response (alterado)

Campos novos expostos (todos calculados em tempo de leitura, nenhum é
coluna editável por input do usuário):

```json
{
  "id": 12,
  "name": "Black Friday Auto-falantes 2026",
  "budget_requested": "50000.00",
  "budget_approved": "45000.00",
  "budget_approval_status": "approved",
  "budget_approved_by": 7,
  "budget_approved_at": "2026-08-10T12:00:00.000Z",
  "actual_cost": "20000.00",
  "budget_alert_level": "none",
  "leads_generated": 340,
  "conversions": 28,
  "roi": "1.45",
  "notes": null,
  "status": "active",
  "...": "..."
}
```

`budget_alert_level` (RF-MKT-032/033): `none` | `warning_90` | `over_100`,
calculado como `actual_cost ÷ budget_approved` contra os thresholds
90%/100% (constantes de código, não editáveis via API nesta rodada —
`[DEFINIR COM COORDENADOR]`, valor de partida 90%). `null` se
`budget_approved` ainda não existir (aprovação pendente).

### 5.4 `POST /campaigns/:id/budget-decision` — Request (novo, `approve`, RF-MKT-030/031)

```json
{ "decision": "approved", "budget_approved": "45000.00" }
```
ou
```json
{ "decision": "rejected", "reason": "Acima do teto trimestral do canal." }
```

Grava `budget_approval_status` (`approved`/`rejected`),
`budget_approved_by=req.user.id`, `budget_approved_at=now()`. Quando
`decision='approved'`, `budget_approved` é obrigatório no payload. Quando
`decision='rejected'`, `reason` é opcional mas recomendado (fica em
`notes` se `campaign.notes` estiver vazio, decisão de implementação, não
obrigatória neste contrato).

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `decision` ausente/fora do enum; `budget_approved` ausente quando `decision='approved'` |
| 404 | `NOT_FOUND` | Campanha não existe |
| 422 | `BUSINESS_RULE_VIOLATION` | Campanha já `completed`/`canceled` (decisão de orçamento não se aplica mais) |

Resposta (`200`): campanha atualizada.

### 5.5 `POST /campaigns/:id/recalculate-metrics` — Request (novo, RF-MKT-009, RNF-MKT-001)

Sem payload (`{}`). Idempotente — recalcula a partir dos vínculos reais:
- `leads_generated` = `COUNT(marketing_leads WHERE campaign_id = :id)`.
- `conversions` = `COUNT(marketing_leads WHERE campaign_id = :id AND status = 'converted')`.
- `roi` = `(receita_atribuída − actual_cost) ÷ actual_cost`, onde
  receita_atribuída vem de `SalesRevenueService.getAttributedRevenue()`
  sobre os `converted_to_customer_id` dos leads da campanha, na janela de
  atribuição (RF-MKT-010, 90 dias a partir de `converted_at` de cada
  lead — cálculo por lead, não por campanha, para não superestimar quando
  leads convertem em datas muito diferentes).

Resposta (`200`):
```json
{ "success": true, "data": { "id": 12, "leads_generated": 340, "conversions": 28, "roi": "1.45", "recalculated_at": "2026-08-07T15:00:00.000Z" } }
```

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 404 | `NOT_FOUND` | Campanha não existe |

---

## 6. Grupo 3 — Evento/Feira (novo) — UC-65

Base: `/api/marketing/events`.

### 6.1 Endpoints

| Método | Rota | Nível | Descrição |
|---|---|---|---|
| `GET` | `/events` | operate | Lista eventos — filtros: `status`, `event_type`, `campaign_id`, período |
| `GET` | `/events/:id` | operate | Detalhe — inclui `leads_count`, `cost_per_lead` calculados e checklist |
| `POST` | `/events` | operate | Cria evento (RF-MKT-020) |
| `PUT` | `/events/:id` | operate | Atualiza evento — mesma disciplina de imutabilidade pós-`completed`/`canceled` de campanha (exceto `notes`), por consistência de padrão |
| `POST` | `/events/:id/checklist` | operate | Adiciona item de checklist (RF-MKT-021) |
| `PUT` | `/events/:id/checklist/:itemId` | operate | Atualiza item (status/responsável) |
| `POST` | `/events/:id/close` | operate | Encerra evento — exige `actual_cost` (RF-MKT-025) |
| `GET` | `/events/:id/leads` | operate | Lista leads vinculados ao evento (atalho de `GET /leads?event_id=:id`) |

**8 endpoints, todos novos.**

### 6.2 `POST /api/marketing/events` — Request

```json
{
  "name": "Feira Nacional do Som Automotivo 2026",
  "location": "São Paulo Expo",
  "event_type": "feira",
  "start_date": "2026-09-15",
  "end_date": "2026-09-18",
  "campaign_id": 12,
  "budget": "30000.00"
}
```

`event_type` enum: `feira`/`lancamento`/`workshop`/`regional`.
`campaign_id` opcional (evento é criável independentemente de campanha).
`status` nasce `planned`, não aceito em `POST` (definido pelo ciclo de
vida — `planned → in_progress → completed`/`canceled`, transição via `PUT`
com o mesmo espírito não rígido de campanha, sem máquina de estado formal
nesta rodada por ser processo simples de baixo volume, ~2x/ano).

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `name`/`event_type`/`start_date` ausentes; `end_date` anterior a `start_date` |
| 404 | `NOT_FOUND` | `campaign_id` informado não existe |

Resposta (`201`): evento criado, `leads_count: 0`, `cost_per_lead: null`.

### 6.3 `GET /api/marketing/events/:id` — Response

```json
{
  "id": 7,
  "name": "Feira Nacional do Som Automotivo 2026",
  "event_type": "feira",
  "status": "completed",
  "budget": "30000.00",
  "actual_cost": "28500.00",
  "leads_count": 95,
  "cost_per_lead": "300.00",
  "campaign_id": 12,
  "checklist": [
    { "id": 1, "description": "Reservar estande", "status": "done", "responsible_user_id": 22 },
    { "id": 2, "description": "Imprimir catálogo", "status": "pending", "responsible_user_id": null }
  ]
}
```

`leads_count` = `COUNT(marketing_leads WHERE event_id = :id)`, sempre
derivado (RF-MKT-023 — nunca campo editável). `cost_per_lead` =
`actual_cost ÷ leads_count` quando `actual_cost` e `leads_count > 0`
existirem, senão `null` (RF-MKT-024).

### 6.4 `POST /api/marketing/events/:id/checklist` — Request (RF-MKT-021)

```json
{ "description": "Contratar montagem de estande", "responsible_user_id": 22 }
```

Item nasce `status: 'pending'`. Estrutura livre — sem enum fechado de
categoria (decisão explícita do brief, "não engessar em código").

`PUT /events/:id/checklist/:itemId`:
```json
{ "status": "done" }
```

### 6.5 `POST /api/marketing/events/:id/close` — Request (RF-MKT-025, UC-65 E1)

```json
{ "actual_cost": "28500.00" }
```

Grava `actual_cost` (se ainda não informado via `PUT`) e `status='completed'`.
`actual_cost` é obrigatório no payload **ou** já preenchido no evento —
ausência de ambos retorna `400 VALIDATION_ERROR`.

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `actual_cost` ausente (nem no payload nem já gravado) |
| 404 | `NOT_FOUND` | Evento não existe |
| 422 | `BUSINESS_RULE_VIOLATION` | Evento já `completed`/`canceled` |

---

## 7. Grupo 4 — Relatórios / KPIs de Funil (novo) — UC-66

Base: `/api/marketing/reports`.

### 7.1 Endpoints

| Método | Rota | Nível | Descrição |
|---|---|---|---|
| `GET` | `/reports/funnel` | operate | 7 dos 8 KPIs do brief (RF-MKT-026) |
| `GET` | `/reports/events` | operate | ROI/custo por lead agregado por evento (RF-MKT-024/027) |

**2 endpoints, ambos novos.**

### 7.2 `GET /api/marketing/reports/funnel` — Query params

```
?campaign_id=12&lead_source=website&date_from=2026-08-01&date_to=2026-08-31
```

Todos os filtros são opcionais (relatório geral sem filtro quando
ausentes). `date_from`/`date_to` filtram por `marketing_leads.created_at`.

**Response (`200`):**
```json
{
  "success": true,
  "data": {
    "period": { "from": "2026-08-01", "to": "2026-08-31" },
    "filters": { "campaign_id": 12, "lead_source": "website" },
    "cost_per_lead": "147.05",
    "qualification_rate": "0.62",
    "conversion_rate": "0.18",
    "attributed_revenue": "82340.00",
    "roi": "1.45",
    "handoff_sla_compliance_rate": "0.87",
    "median_lead_cycle_days": "9.5",
    "budget_vs_actual": { "requested": "50000.00", "approved": "45000.00", "actual": "20000.00" },
    "has_data": true
  }
}
```

- `cost_per_lead` = `actual_cost ÷ leads_generated` (campanha) ou
  `Σ actual_cost das campanhas no filtro ÷ Σ leads` (sem filtro de
  campanha).
- `qualification_rate` = leads que atingiram `qualified`+ ÷ total de
  leads no período.
- `conversion_rate` = leads `converted` ÷ total de leads no período.
- `attributed_revenue`/`roi` = mesma base de cálculo de
  `RecalculateCampaignMetricsUseCase` (RF-MKT-029 — sem duplicar lógica,
  reaproveita `SalesRevenueService`).
- `handoff_sla_compliance_rate` = leads que tiveram `handoff_at −
  qualified_at` dentro do SLA configurado (RF-MKT-014) ÷ total de leads
  que atingiram `qualified`.
- `median_lead_cycle_days` = mediana de `converted_at − created_at` dos
  leads `converted` no período.
- `budget_vs_actual` só populado quando o filtro resolve a uma única
  campanha ou soma de campanhas do período.

**Fluxo de exceção (UC-66 E1):** filtro sem nenhum lead/campanha no
critério → **não é erro** — todos os campos numéricos retornam `null` (não
`0` nem `NaN`/divisão por zero) e `has_data: false`, com `"200 OK"`.

### 7.3 `GET /api/marketing/reports/events` — Query params

```
?event_type=feira&date_from=2026-01-01&date_to=2026-12-31
```

**Response (`200`):**
```json
{
  "success": true,
  "data": [
    { "event_id": 7, "name": "Feira Nacional do Som Automotivo 2026", "actual_cost": "28500.00", "leads_count": 95, "conversions": 11, "attributed_revenue": "34200.00", "cost_per_lead": "300.00", "roi": "0.20" }
  ]
}
```

`conversions`/`attributed_revenue`/`roi` seguem a mesma base de cálculo de
receita atribuída de campanha, aplicada aos leads do evento (via
`converted_to_customer_id` dos leads com `event_id = :id`).

---

## 8. Grupo 5 — Materiais de Divulgação (alterado + novo)

Base: `/api/marketing/materials`.

### 8.1 Endpoints

| Método | Rota | Nível | Status | Descrição |
|---|---|---|---|---|
| `GET` | `/materials` | operate | inalterado | Lista |
| `GET` | `/materials/:id` | operate | inalterado | Detalhe |
| `POST` | `/materials` | operate | **alterado** | Remove `approved` do payload — nasce sempre `false`; adiciona `stock_item_id` opcional |
| `PUT` | `/materials/:id` | operate | **alterado** | Remove `approved` do payload — aprovação só via endpoint dedicado |
| `POST` | `/materials/:id/file` | operate | **alterado** | Upload de nova versão volta `approved=false` (RF-MKT-040) |
| `PATCH` | `/materials/:id/approve` | **approve** | **novo** | Aprova material (RF-MKT-039) |

**6 endpoints** (3 alterados, 1 novo).

### 8.2 `POST`/`PUT /materials` — Request (alterado)

```json
{
  "title": "Catálogo Linha Profissional 2026",
  "material_type": "catalog",
  "product_id": "3f9c9e2e-...-uuid",
  "stock_item_id": "8a1b2c3d-...-uuid",
  "version": "1.0"
}
```

**Mudanças no schema (`.strict()`):**
- **Removido:** `approved` — enviado em `POST` ou `PUT` retorna `400
  VALIDATION_ERROR` (chave desconhecida).
- **Novo:** `stock_item_id` (UUID, FK opcional `items.id`, item de
  categoria "Material Promocional" no Almoxarifado — RF-MKT-038). Nenhuma
  movimentação de estoque é criada por este módulo; a FK só referencia o
  item cujo Almoxarifado já controla entrada/saída (BR-MKT-011 mantida).

### 8.3 `PATCH /api/marketing/materials/:id/approve` — Request (novo, `approve`, RF-MKT-039)

Sem payload obrigatório (`{}`). Grava `approved=true`,
`approved_by=req.user.id`, `approved_at=now()`.

**Erros:**
| Código | `code` | Quando |
|---|---|---|
| 404 | `NOT_FOUND` | Material não existe |
| 422 | `BUSINESS_RULE_VIOLATION` | Material já `approved=true` (aprovar de novo é no-op rejeitado, não silencioso — força o operador a perceber que já estava aprovado) |

Resposta (`200`): material atualizado.

### 8.4 `POST /materials/:id/file` — Comportamento alterado (RF-MKT-040)

Upload de novo arquivo sobre um material já `approved=true` grava o novo
arquivo **e** reverte `approved=false`, `approved_by=null`,
`approved_at=null` — nova versão sempre exige nova aprovação. Se o
material ainda não estava aprovado, o upload não altera `approved` (já é
`false`).

---

## 9. Rastreabilidade RF → Endpoint

| RF | Endpoint(s) |
|---|---|
| RF-MKT-001/002/003 | `POST /leads/:id/convert` |
| RF-MKT-004 | `POST /leads/:id/status` (terminal, sem mudança de comportamento) |
| RF-MKT-005 | `POST /leads/:id/status` (enum `in_sales_attendance`) |
| RF-MKT-006/007/008/009 | `PUT`/`POST /campaigns`, `POST /campaigns/:id/recalculate-metrics` |
| RF-MKT-010 | `POST /campaigns/:id/recalculate-metrics`, `GET /reports/funnel` (parâmetro de janela, constante de código) |
| RF-MKT-011/012/013 | `POST /leads/:id/status`, `POST /leads/:id/handoff` |
| RF-MKT-014 | `GET /leads?sla_breached=true`, `GET /reports/funnel` (`handoff_sla_compliance_rate`) |
| RF-MKT-015 | `POST /leads/:id/handoff` (RBAC dupla `marketing`/`vendas` via `authorizeAnyModule`) |
| RF-MKT-016/017 | `POST /leads`, `POST /leads/bulk` |
| RF-MKT-018 | `POST /leads`, `POST /leads/bulk` (dedup por item) |
| RF-MKT-019 | `POST /leads/bulk` |
| RF-MKT-020/021 | `POST /events`, `POST /events/:id/checklist`, `PUT /events/:id/checklist/:itemId` |
| RF-MKT-022 | `POST /leads` (`event_id`↔`lead_source` cruzado) |
| RF-MKT-023/024 | `GET /events/:id` |
| RF-MKT-025 | `POST /events/:id/close` |
| RF-MKT-026 | `GET /reports/funnel` |
| RF-MKT-027 | `GET /reports/events`, `GET /events/:id` |
| RF-MKT-028 | Nenhum endpoint expõe métrica de vaidade (ausência deliberada, não gap) |
| RF-MKT-029 | `GET /reports/funnel`, `GET /reports/events` (reuso de `SalesRevenueService`) |
| RF-MKT-030/031 | `POST`/`PUT /campaigns`, `POST /campaigns/:id/budget-decision` |
| RF-MKT-032/033 | `GET /campaigns`, `GET /campaigns/:id` (`budget_alert_level`) |
| RF-MKT-034 | `PUT /campaigns/:id` (imutabilidade pós-conclusão) |
| RF-MKT-035/036 | `POST /leads` (campos de consentimento opcionais) |
| RF-MKT-037 | Fora deste contrato (P3, pendência explícita) |
| RF-MKT-038 | `POST`/`PUT /materials` (`stock_item_id`) |
| RF-MKT-039 | `POST /materials` (sem `approved`), `PATCH /materials/:id/approve` |
| RF-MKT-040 | `POST /materials/:id/file` |

---

## 10. Pendências e decisões que ficam para o `AdmDBA`/`programador`

1. **Migration de saneamento (§2 dos requisitos):** este contrato assume
   que, após a migration de saneamento, `converted_to_customer_id` é
   `NOT NULL` sempre que `status='converted'` — via `CHECK`/trigger no
   banco (decisão do `AdmDBA`), não apenas validação de aplicação. O
   endpoint `POST /leads/:id/convert` já implementa essa garantia do lado
   da aplicação, mas não substitui a constraint de banco.
2. **Constantes configuráveis (RF-MKT-010/014/033):** janela de
   atribuição (90 dias), SLA de handoff (2 dias úteis) e threshold de
   alerta de orçamento (90%) são modeladas como **constantes de código**
   nesta rodada (ex. `server/src/modules/marketing/domain/constants.ts`),
   não como configuração editável via API/admin — decisão deste contrato,
   compatível com "implementar como constante configurável, não hard-code
   espalhado" do requisito (configurável = um único ponto no código, não
   múltiplos lugares — não necessariamente uma tela de admin nesta
   rodada). Se o Coordenador de Marketing precisar ajustar esses valores
   sem deploy, é uma correção futura (endpoint de configuração dedicado).
3. **`sales.created_at` vs. campo de faturamento real:** `SalesRevenueService`
   assume `sales.created_at` como data de referência da janela de
   atribuição; se o modelo `Sale` tiver um campo mais preciso de
   faturamento (`invoiced_at`, a confirmar), o `AdmDBA`/`programador`
   devem usar esse campo em vez de `created_at`.
4. **`marketing_event_checklist_items`** como tabela própria (não JSONB em
   `marketing_events`) é a recomendação deste contrato, para permitir
   `responsible_user_id` como FK real e filtros — decisão final do
   `AdmDBA`.
5. **Middleware de RBAC composto (OR de módulos):** correção desta auditoria
   — `authorizeAnyModule` **já existe** (`server/src/middlewares/
   authorizeAnyModule.ts`, criado no Bloco 4 FAC), não é uma pendência de
   infraestrutura a criar. `POST /leads/:id/handoff` (RF-MKT-015) apenas
   reaproveita esse middleware existente com os módulos `marketing`/
   `vendas` (não `sales` — corrigido nesta auditoria, ver §4.5).

---

*Documento produzido sob o mesmo protocolo de rigor dos blocos anteriores:
toda decisão de nomenclatura/formato cita o RF que a motiva; nenhuma
tabela foi desenhada aqui (escopo de `AdmDBA`); pendências de negócio
marcadas explicitamente em vez de assumidas.*
