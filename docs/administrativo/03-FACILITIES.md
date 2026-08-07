# Facilities - Módulo Administrativo

> **[IMPLEMENTADO em 2026-08-07]** As tabelas abaixo são reais em
> PostgreSQL (migration `20260807-000200-create-facilities-module.cjs`),
> com endpoints REST em `/api/facilities/*` e tela web em `/facilities`.
> Ver `server/src/modules/facilities/` (Clean Architecture) e
> `docs/database/DATABASE.md` (seção "Módulo Facilities").

## Departamento de Facilities (FAC)

| Cargo | Qtd | Função |
|-------|-----|--------|
| Supervisor Administrativo | 1 | Gestão de facilities, frota |
| Serviços Gerais | 2 | Limpeza, copa, manutenção predial |
| Motorista | 2 | Entregas, transporte executivo |
| Vigilante | 1 (terceirizado) | Segurança patrimonial |

## Funções

| Função | Descrição |
|--------|-----------|
| Limpeza | Higienização da fábrica e escritórios |
| Manutenção Predial | Elétrica, hidráulica, pintura |
| Frota | Manutenção veículos, combustível, seguro |
| Segurança | CFTV, alarme, controle de acesso |
| Copa | Café, água, refeições |
| Jardinagem | Área externa |
| Controle de EPIs | Estoque e distribuição |

## Escopo implementado (2026-08-07)

CRUD completo (create/list/get/update — **sem delete**, físico ou lógico)
para 4 entidades. RBAC via módulo `facilities` (`authorizeModule`),
leitura em nível padrão (`operate`) e escrita explicitamente em `operate`
— sem fluxo de aprovação (`approve`) neste módulo.

### 1. Frota de veículos (`facility_vehicles`)

Cadastro de veículo administrativo/interno: placa (única), marca, modelo,
ano, cor, tipo de combustível (`gasoline`/`ethanol`/`diesel`/`flex`/
`electric`), RENAVAM, chassi, seguro (empresa/apólice/vencimento), última
troca de óleo, km da próxima troca, km atual, status
(`active`/`maintenance`/`deactivated`/`sold`), observações.

| Endpoint | Descrição |
|---|---|
| `GET /api/facilities/vehicles` | Lista paginada, filtro opcional `status` |
| `GET /api/facilities/vehicles/:id` | Busca por id |
| `POST /api/facilities/vehicles` | Cria (409 se placa duplicada) |
| `PUT /api/facilities/vehicles/:id` | Atualiza |

### 2. Abastecimento (`facility_fuel_records`)

Histórico de abastecimento por veículo: data/hora, km no abastecimento,
litros, preço/litro, custo total (calculado automaticamente se não
informado: `liters * price_per_liter`), posto, motorista (`driver_id`,
opcional, FK `employees`).

| Endpoint | Descrição |
|---|---|
| `GET /api/facilities/fuel-records` | Lista paginada, filtro opcional `vehicle_id` |
| `GET /api/facilities/fuel-records/:id` | Busca por id |
| `POST /api/facilities/fuel-records` | Cria (404 se veículo inexistente) |
| `PUT /api/facilities/fuel-records/:id` | Atualiza |

### 3. Programação de limpeza (`facility_cleaning_schedules`)

Programação recorrente por área (texto livre — não FK para
`facility_areas`, cobre áreas informais): frequência
(`daily`/`alternate`/`weekly`/`biweekly`/`monthly`), responsável, última/
próxima limpeza.

| Endpoint | Descrição |
|---|---|
| `GET /api/facilities/cleaning-schedules` | Lista paginada, filtro opcional `frequency` |
| `GET /api/facilities/cleaning-schedules/:id` | Busca por id |
| `POST /api/facilities/cleaning-schedules` | Cria |
| `PUT /api/facilities/cleaning-schedules/:id` | Atualiza |

### 4. Áreas físicas (`facility_areas`)

Cadastro de área física: nome, tipo (`production`/`warehouse`/`office`/
`lab`/`amenities`/`external`), m², departamento (`department_id`,
opcional, FK `departments`), capacidade de pessoas.

| Endpoint | Descrição |
|---|---|
| `GET /api/facilities/areas` | Lista paginada, filtros opcionais `area_type`/`department_id` |
| `GET /api/facilities/areas/:id` | Busca por id |
| `POST /api/facilities/areas` | Cria |
| `PUT /api/facilities/areas/:id` | Atualiza |

## Fora do escopo desta entrega

- Controle de EPIs (já coberto pelo módulo SST — `sst_matriz_epi`/
  `sst_entrega_epi`, não duplicado aqui).
- Segurança/CFTV/alarme (sem cadastro dedicado hoje).
- Vínculo formal entre `facility_cleaning_schedules.area` (texto livre) e
  `facility_areas` — decisão consciente, ver `docs/database/DATABASE.md`.
- Para controle de máquinas/equipamentos como ativos depreciáveis/QR Code,
  ver o módulo de Patrimônio (`assets`, `docs/patrimonio/00-README.md`) —
  `facility_vehicles` é focado em operação de frota (abastecimento, seguro,
  manutenção preventiva por km), não em depreciação contábil.

---

**Última atualização:** 2026-08-07
