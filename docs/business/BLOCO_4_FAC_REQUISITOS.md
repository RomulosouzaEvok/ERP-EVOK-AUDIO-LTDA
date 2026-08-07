# BLOCO 4 (CORREÇÃO) — Módulo Facilities (FAC) — Requisitos Formais

**Departamento:** 17 — Facilities, conforme `docs/00-ESTRUTURA_ORGANIZACIONAL.md`.
**Natureza deste documento:** **correção e complementação**, não greenfield. O
módulo já existe em produção parcial (commit `2ad27fd`) e foi auditado com
veredito **GAPS CRÍTICOS** — ver `docs/business/BLOCO_4_FAC_VERIFICACAO.md`
(14 de 17 regras do brief não atendidas, decisão arquitetural D-2 violada).
Este documento não repete a auditoria; parte dela como fato consumado e
formaliza o que precisa mudar.
**Insumos:** `docs/business/briefs/BRIEF_FAC_2026-08-06.md` (17 regras
BR-FAC-001…017, 5 processos P-FAC-01…05, decisões D-1…D-4),
`docs/business/BLOCO_4_FAC_VERIFICACAO.md` (auditoria regra-a-regra),
código real em `server/src/modules/facilities/`, `server/src/models/
Facility*.ts`, migration `20260807-000200-create-facilities-module.cjs`,
`docs/administrativo/03-FACILITIES.md`.
**Autor:** Agente Especialista em Engenharia de Requisitos.
**Data:** 2026-08-07.
**Status:** 🟡 Especificação de requisitos de correção pronta para
modelagem de banco/API (`AdmDBA` / `ArquitetoSoftwareAPI`). **Nenhum código
foi alterado neste passo.**

**Prefixo de módulo:** `FAC` — já em uso desde a primeira entrega
(`docs/administrativo/03-FACILITIES.md`); mantido sem alteração.

**Numeração de Casos de Uso:** o maior UC formal já atribuído em qualquer
documento do projeto (incluindo os ainda não consolidados em
`docs/projeto/04-USE_CASES.md`) é `UC-57` (citado como "próximo a ser
formalizado" em `docs/business/BLOCO_3_JUR_REQUISITOS.md` §8, sem ter sido
efetivamente usado). Há uma colisão de numeração já registrada e assumida
entre os Blocos Facilities/Marketing/Jurídico (todos escritos no mesmo dia,
2026-08-07, atribuindo UC-52 de forma independente — ver nota em
`docs/projeto/04-USE_CASES.md` linha 1810). Para não adicionar uma quarta
colisão, os casos de uso deste bloco de correção começam em **UC-58**, o
primeiro número livre de fato.

**Catálogo RBAC verificado:** `server/src/shared/domain/accessModules.ts`
já tem a chave `facilities` (adicionada em 2026-08-07), hoje com **apenas
2 níveis** (`view` implícito/`operate`), sem `approve` — divergente de
BR-FAC-015 do brief. Ver §5.1.

---

## 0. Sumário da correção (o que muda e por quê)

| Área | Situação atual (commit `2ad27fd`) | Correção exigida |
|---|---|---|
| Veículo | `facility_vehicles` isolada, duplica `brand`/`model`/`status` de `assets` | Migrar para extensão 1:1 de `assets` (D-2) — ver §6.1 |
| Condutor/CNH | Inexistente | Criar do zero (P0) |
| Diário de uso | Inexistente | Criar do zero (P0) |
| Multa | Inexistente | Criar do zero (P0) — maior exposição legal do bloco |
| Abastecimento | Existe, mas sem validação de km, sem atualização de `current_km`, sem `tank_capacity_liters` | Corrigir regra de negócio (P0) |
| Documentos do veículo (CRLV/seguro/IPVA) | Só `insurance_expiry`, sem alerta | Generalizar em `DocumentoVeiculo` com alertas (P0) |
| Manutenção predial | Inexistente | Estender `maintenance_orders` (D-1) (P0) |
| Área física | Existe, cadastro simples | Mantida, passa a ser referenciada por chamados prediais |
| Limpeza | Só "plano" (uma tabela), sem execução separada | Separar plano × execução (P1) |
| Insumos | Inexistente | Integrar a `/api/inventory` (D-3) (P1) |
| Visitante/Correspondência | Inexistente | Criar do zero (P1) |
| Reserva de recursos | Inexistente | Criar do zero (P2) |
| RBAC | 2 níveis, sem `approve` | Adicionar `approve` (P1) |
| Financeiro | Nenhuma integração com AP | Integrar custos de frota a `accounts_payable` com centro de custo (P1) |

---

## 1. Requisitos Funcionais (RF-FAC)

Cada RF referencia o processo do brief (P-FAC-01…05), a regra de negócio
`BR-FAC-NNN` aplicável e, quando pertinente, o achado da verificação
(`BLOCO_4_FAC_VERIFICACAO.md`) que o motiva.

### 1.1 Refatoração da Frota — Veículo como extensão de `Asset` (D-2, P0)

| RF | Descrição | Prioridade | BR / Decisão |
|---|---|---|---|
| RF-FAC-001 | **Migração de dado, não apenas de schema:** todo registro hoje em `facility_vehicles` deve ser preservado — para cada linha, criar (ou já existir) um `Asset` com `asset_type='vehicle'`, migrar `brand`/`model`/`status` para os campos equivalentes de `Asset` (mapeamento de status: `active`→`active`, `maintenance`→`in_maintenance`, `deactivated`/`sold`→`decommissioned`, com `notes` registrando a distinção original), e o restante dos campos específicos de veículo (placa, RENAVAM, chassi, combustível, km, seguro, óleo) passa a viver em uma tabela de extensão 1:1 referenciando `asset_id`. Nenhum dado é perdido; nenhum veículo troca de identificador visível ao usuário sem aviso (placa continua sendo a chave de negócio) | P0 | D-2 |
| RF-FAC-002 | A nova extensão (`facility_vehicle_details`, nome sugerido — decisão final de tabela cabe ao `AdmDBA`) segue o mesmo padrão já usado em `ItSoftwareLicenseDetail` (extensão 1:1 de `assets`, `asset_id` FK única `NOT NULL UNIQUE`): contém **apenas** os campos que não existem em `Asset` — placa (única), RENAVAM, chassi, cor, ano de fabricação/modelo, tipo de combustível, `current_km`, `tank_capacity_liters`, categoria mínima de CNH exigida (`required_cnh_category`) | P0 | D-2, precedente `ItSoftwareLicenseDetail.ts` |
| RF-FAC-003 | Marca, modelo, status, valor de aquisição/depreciação, responsável, departamento, QR code e `location` do veículo passam a vir de `Asset` — nenhum desses campos é duplicado na extensão. Telas e relatórios de frota consultam `Asset` + `facility_vehicle_details` via join, nunca leem um cadastro paralelo | P0 | D-2 |
| RF-FAC-004 | `Asset.status = 'in_maintenance'` para um veículo bloqueia a criação de novo `DiarioDeUso` com `status='out'` para aquele `asset_id` — reaproveita a sincronização `Asset.status`↔ordem de manutenção já implementada para Patrimônio (RF-PAT-05, ver CLAUDE.md §1) em vez de reinventar um status de disponibilidade próprio de Facilities | P0 | D-2, BR-FAC-001 |
| RF-FAC-005 | Endpoints `/api/facilities/vehicles` (existentes) passam a operar sobre `Asset` filtrado por `asset_type='vehicle'` + join com `facility_vehicle_details`, mantendo compatibilidade de contrato para o frontend já publicado (`client/src/pages/facilities/FacilitiesPage.tsx`) na medida do possível — ajuste de contrato é responsabilidade do `ArquitetoSoftwareAPI`, mas a exigência funcional é: **nenhuma tela existente deve quebrar silenciosamente**; se o contrato mudar, é mudança versionada e documentada | P0 | D-2 |
| RF-FAC-006 | Cadastro de novo veículo passa a exigir a criação simultânea do `Asset` (`asset_type='vehicle'`) e da extensão, em uma única transação — nunca um veículo "órfão" sem `Asset` correspondente, nem um `Asset` tipo `vehicle` sem extensão de Facilities quando operado por este módulo | P0 | D-2, integridade referencial (CLAUDE.md §7) |

### 1.2 Documentos do Veículo com Vencimento (P0)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-FAC-007 | Criar **DocumentoVeiculo** (1:N por veículo): `asset_id`, `doc_type` (`crlv_licenciamento`/`seguro`/`ipva`/`outro`), `reference`, `issuer`, `valid_until` (obrigatório, exceto tipos explicitamente sem vencimento), `cost`, `file_path`, `status` (`vigente`/`vencido`/`renovado`) | P0 | BR-FAC-003 |
| RF-FAC-008 | Alertas automáticos em 60/30/7 dias e no vencimento para todo `DocumentoVeiculo.valid_until`; janelas parametrizáveis (config, não hard-code) | P0 | BR-FAC-003 |
| RF-FAC-009 | Veículo com `doc_type='crlv_licenciamento'` vencido é **bloqueado para saída** — nenhum novo `DiarioDeUso` pode ser aberto para o `asset_id` enquanto houver CRLV vencido não renovado | P0 | BR-FAC-003, CTB Art. 230, V |
| RF-FAC-010 | Veículo com `doc_type='seguro'` vencido não bloqueia a saída automaticamente, mas gera alerta crítico e exige liberação explícita registrada (`released_by`, `released_at`) do Supervisor FAC (nível `approve`) antes da saída | P0 | BR-FAC-004 |

### 1.3 Condutor — Autorização de Condução (P0)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-FAC-011 | Criar **Condutor** (`employee_id` FK obrigatória; condutor terceirizado fora de escopo P0 — `[VERIFICAR COM GESTOR DE FACILITIES]`): `cnh_number`, `cnh_category`, `cnh_valid_until`, `cnh_file_path`, `authorized` (flag), `authorized_by`, `authorized_at` | P0 | BR-FAC-001/002 |
| RF-FAC-012 | `DiarioDeUso` só pode ser criado com `driver_id` referenciando um Condutor com `authorized=true` — condutor não autorizado ou inexistente bloqueia a saída | P0 | BR-FAC-001 |
| RF-FAC-013 | Condutor com `cnh_valid_until` vencida, ou `cnh_category` incompatível com `required_cnh_category` do veículo, bloqueia o registro de saída | P0 | BR-FAC-002, CTB Art. 159/162 |
| RF-FAC-014 | Alerta de vencimento de CNH em 60/30/7 dias (janelas parametrizáveis) | P0 | BR-FAC-002 |
| RF-FAC-015 | Supervisor pode suspender a autorização de um Condutor (`authorized=false`) sem apagar o histórico de uso associado — suspensão é reversível e auditável | P0 | BR-FAC-001, BR-FAC-017 |

### 1.4 Diário de Uso — Saída/Retorno com Integridade de Odômetro (P0)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-FAC-016 | Criar **DiarioDeUso**: `asset_id`, `driver_id`, `requested_by`, `purpose` (`delivery`/`executive`/`errand`/`other`), `destination`, `departure_at`, `departure_km`, `return_at`, `return_km`, `fuel_level_out`/`fuel_level_in`, `incidents`, `status` (`scheduled`/`out`/`returned`/`canceled`) | P0 | processo P-FAC-01.3/4 |
| RF-FAC-017 | Registro de saída exige `departure_km ≥` maior `return_km` já registrado para aquele veículo (nunca decrescente); divergência exige justificativa com aprovação do Supervisor (nível `approve`) | P0 | BR-FAC-005 |
| RF-FAC-018 | Registro de retorno exige `return_km ≥ departure_km` do mesmo uso | P0 | BR-FAC-005 |
| RF-FAC-019 | Um veículo só pode ter **um** `DiarioDeUso` com `status='out'` por vez; um condutor só pode ter um veículo em aberto por vez — nova saída é bloqueada enquanto houver uso aberto | P0 | BR-FAC-006 |
| RF-FAC-020 | Ao confirmar o retorno, `facility_vehicle_details.current_km` é atualizado automaticamente para `return_km` — é a única forma legítima de o odômetro do veículo avançar fora do abastecimento | P0 | integridade de odômetro (achado 1 e 6 da verificação) |
| RF-FAC-021 | Uso com `status='scheduled'`/`out'` pode ser cancelado (`status='canceled'`) com motivo; nunca excluído fisicamente | P0 | BR-FAC-017 |

### 1.5 Abastecimento — Correção de Regra de Negócio (P0)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-FAC-022 | `CreateFuelRecordUseCase` passa a validar `km_at_refuel ≥` maior valor conhecido entre `facility_vehicle_details.current_km` e o `return_km` do uso aberto/mais recente — rejeita abastecimento com km retroativo | P0 | BR-FAC-009 (corrige achado 1 da verificação) |
| RF-FAC-023 | Ao registrar abastecimento com `km_at_refuel` válido, `facility_vehicle_details.current_km` é atualizado para o maior dos dois valores | P0 | BR-FAC-009 |
| RF-FAC-024 | Adicionar `tank_capacity_liters` à extensão do veículo (RF-FAC-002); abastecimento com `liters > tank_capacity_liters` (quando cadastrada) é rejeitado | P0 | BR-FAC-009 (corrige achado 3 da verificação) |
| RF-FAC-025 | Adicionar `full_tank` (bool) e `invoice_ref` ao registro de abastecimento — necessários para o cálculo de consumo km/l | P1 | BR-FAC-009 (corrige achado 2 da verificação) |
| RF-FAC-026 | Cálculo de consumo médio (km/l) entre abastecimentos consecutivos com `full_tank=true`; consumo fora de ±30% da média histórica do veículo gera alerta de anomalia (limiar parametrizável) | P1 | BR-FAC-009 |
| RF-FAC-027 | Todo abastecimento é atribuível ao `asset_id` para compor o custo/km do KPI de frota (já parcialmente atendido — mantém e formaliza) | P0 | BR-FAC-016 |

### 1.6 Multa — Prazo Legal de Indicação de Condutor (P0, maior exposição legal)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-FAC-028 | Criar **Multa**: `asset_id`, `infraction_at`, `location`, `infraction_code`, `description`, `amount`, `points`, `notice_received_at`, `indication_deadline`, `identified_driver_id`, `indicated_at`, `indication_status`, `charge_to_driver`, `financial_ref`, `status` | P0 | BR-FAC-007/008 |
| RF-FAC-029 | Ao informar `notice_received_at`, o sistema calcula automaticamente `indication_deadline = notice_received_at + prazo_parametrizado` (default 30 dias — CTB Art. 257 §7º, redação Lei 14.071/2020) | P0 | BR-FAC-007 |
| RF-FAC-030 | Alerta decrescente em D-15, D-7, D-3, D-1 antes de `indication_deadline`, direcionado ao Supervisor FAC | P0 | BR-FAC-007 |
| RF-FAC-031 | Multa não indicada até `indication_deadline` muda automaticamente para `indication_status='expired_nic'` — nunca é excluída, permanece na trilha de auditoria do custo NIC | P0 | BR-FAC-007 |
| RF-FAC-032 | Ao cadastrar a multa com `infraction_at` e `asset_id`, o sistema sugere `identified_driver_id` cruzando o instante da infração com `DiarioDeUso` (uso que cobre aquele instante para aquele veículo); a confirmação da indicação ao órgão é sempre um ato humano do Supervisor — nunca automática | P0 | BR-FAC-008 |
| RF-FAC-033 | Multa com `charge_to_driver=true` gera vínculo (`financial_ref`) para tratamento com RH/Financeiro (desconto/reembolso) — política de repasse é configurável, não hard-coded `[VERIFICAR COM GESTOR DE FACILITIES]` | P1 | processo P-FAC-01.6 |
| RF-FAC-034 | Multa com desembolso (`status='paid'`) gera título em `accounts_payable`, categoria "Frota", vinculado ao `asset_id` e a um centro de custo (RF-FAC-057) | P1 | BR-FAC-016 |
| RF-FAC-035 | Multa nunca excluída fisicamente; contestação (`status='appealed'`) e cancelamento seguem o mesmo padrão de status/histórico do restante do módulo | P0 | BR-FAC-017 |

### 1.7 Manutenção Veicular Preventiva por KM (P1, extensão D-2)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-FAC-036 | Adicionar `next_maintenance_km` a `maintenance_orders` (campo novo, nullable — não quebra o uso atual de MANUT); preventiva veicular dispara pelo que vencer primeiro entre `next_maintenance_date`/`frequency_days` (já existente) e `next_maintenance_km` (novo) comparado a `facility_vehicle_details.current_km` | P1 | BR-FAC-010 |
| RF-FAC-037 | Veículo com preventiva vencida (por km ou tempo) gera alerta; bloquear saída é opção de política, não obrigatória por padrão `[VERIFICAR COM GESTOR DE FACILITIES]` | P1 | BR-FAC-010 |
| RF-FAC-038 | Toda manutenção veicular usa `maintenance_orders.asset_id` apontando para o `Asset` do veículo (viabilizado pela migração D-2, RF-FAC-001) — sem tabela paralela de manutenção de frota | P0 | D-2 |

### 1.8 Manutenção Predial — Chamado via `maintenance_orders` (D-1, P0)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-FAC-039 | Adicionar a `maintenance_orders` os campos `facility_specialty` (`electrical`/`plumbing`/`civil`/`hvac`/`roofing`/`gardening`/`other`, nullable) e `facility_area_id` (FK opcional para `facility_areas`, nullable) — chamado de máquina continua usando `asset_id` normalmente; chamado predial usa `facility_area_id` e pode deixar `asset_id` nulo quando não há ativo físico associado ao problema (ex.: infiltração em parede) | P0 | D-1, BR-FAC-011 |
| RF-FAC-040 | Abertura de chamado predial por qualquer funcionário (não exclusivo de FAC), indicando `facility_area_id`, `facility_specialty` e descrição; RBAC de escrita usa o módulo `facilities` (view/operate), reaproveitando o RBAC de `maintenance_orders` apenas para consulta cruzada MANUT×FAC — modelo de permissão exato (view por categoria) é decisão do `ArquitetoSoftwareAPI` (ver §6.2) | P0 | D-1 |
| RF-FAC-041 | Triagem pelo Supervisor FAC: classifica prioridade; chamado com risco à segurança de pessoas ou parada de produção recebe `priority='emergency'` e notificação imediata ao Supervisor FAC (e ao módulo SST quando há risco pessoal) | P0 | BR-FAC-011 |
| RF-FAC-042 | Execução registra `service_performed`, custo de terceiro (`parts_cost`/`labor_cost`, já existentes em `maintenance_orders`) e consumo de insumos prediais dado baixa via `/api/inventory` (RF-FAC-046) | P0 | processo P-FAC-02.3 |
| RF-FAC-043 | Chamado predial recorrente pode gerar rotina preventiva usando `frequency_days` já existente em `maintenance_orders` (ex.: limpeza de calhas semestral) — sem campo novo | P1 | processo P-FAC-02.4 |

### 1.9 Visitantes e Correspondência (P1)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-FAC-044 | Criar **Visitante** (`name`, `document`, `company`, `phone`, `photo_path`) e **Visita** (`visitor_id`, `host_employee_id`, `scheduled_at` opcional, `checkin_at`, `checkout_at`, `badge_number`, `purpose`, `areas_authorized`, `status`) | P1 | BR-FAC-013 |
| RF-FAC-045 | Check-in exige nome + documento + anfitrião identificado; check-out obrigatório para encerrar a visita | P1 | BR-FAC-013 |
| RF-FAC-046 | Visitante com `status='onsite'` além do horário-limite configurado gera alerta à portaria (não bloqueia, apenas notifica) | P1 | BR-FAC-013 |
| RF-FAC-047 | Retenção de dados pessoais de visitante segue prazo e finalidade a definir com Compliance — parametrizável, nunca indefinido por padrão `[VERIFICAR COM GESTOR DE FACILITIES]` | P1 | BR-FAC-013, LGPD Art. 6º |
| RF-FAC-048 | Criar **Correspondencia** (`received_at`, `sender`, `recipient_employee_id`/`recipient_department_id`, `type`, `delivered_at`, `delivered_to`) — registro simples, sem workflow de aprovação | P2 | processo P-FAC-03.6 |

### 1.10 Serviços Gerais — Limpeza (Plano × Execução) e Insumos via Estoque (P1)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-FAC-049 | Separar `facility_cleaning_schedules` (o que já existe, vira **plano**: `facility_area_id` — FK, substituindo o texto livre atual quando a área existir no cadastro; texto livre permanece como fallback para áreas informais — ver §6.3 —, `frequency`, `responsible_employee_id`, `active`) de uma nova tabela de **execução** (`plan_id`, `executed_at`, `executed_by`, `ok`, `notes`) | P1 | corrige achado "Gap D-1/limpeza" da verificação (item 8 da lista priorizada) |
| RF-FAC-050 | KPI de aderência ao plano de limpeza (`execuções realizadas ÷ previstas no período`) passa a ser calculável a partir da separação plano×execução | P1 | processo P-FAC-04.1 |
| RF-FAC-051 | Insumos de consumo interno (papel, café, material de limpeza, lâmpadas, material hidráulico de reposição) usam categoria própria em `/api/inventory` ("Consumo Interno/Facilities") — **nenhum estoque paralelo em Facilities**. Saída registrada como movimentação de consumo com destino (departamento/área) | P1 | D-3, BR-FAC-012 |
| RF-FAC-052 | Reposição de insumos sempre via `/api/purchase-requisitions` — Facilities requisita, Compras cotiza/compra/recebe | P1 | D-3, BR-FAC-012 |
| RF-FAC-053 | Ficha de EPI (guarda/entrega) permanece fora do escopo de Facilities — decisão já registrada em `03-FACILITIES.md` como coberta pelo módulo SST; este bloco não reabre a questão | P2 | referência cruzada BR-SST (Bloco 1) |

### 1.11 Reserva de Salas e Recursos Compartilhados (P2)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-FAC-054 | Criar **ReservaRecurso**: `resource_type` (`room`/`equipment`) + `facility_area_id` ou `asset_id`, `reserved_by`, `starts_at`, `ends_at`, `subject`, `status` (`confirmed`/`canceled`/`completed`) | P2 | processo P-FAC-05 |
| RF-FAC-055 | Reserva não pode sobrepor intervalo de outra reserva `confirmed` do mesmo recurso (`starts_at < other.ends_at AND ends_at > other.starts_at` → rejeita) | P2 | BR-FAC-014 |
| RF-FAC-056 | Cancelamento/no-show libera o horário; recorrência de reservas é conveniência adicional, não obrigatória nesta rodada | P2 | processo P-FAC-05.3 |

### 1.12 Transversal — RBAC, Financeiro e Auditoria (P0/P1)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-FAC-057 | Adicionar nível `approve` ao módulo `facilities` em `ACCESS_MODULES` (`server/src/shared/domain/accessModules.ts`): execução de limpeza e triagem operacional seguem `operate`; **plano** de limpeza (frequências/áreas), liberação de saída com seguro vencido (RF-FAC-010), aprovação de divergência de odômetro (RF-FAC-017) e confirmação/encerramento de multa exigem `approve` — corrige BR-FAC-015 (hoje divergente, ver verificação) | P0 | BR-FAC-015 |
| RF-FAC-058 | Todo custo de frota (abastecimento, multa paga, documento com desembolso, manutenção veicular) atribuível ao `asset_id`, compondo custo total e custo/km; lançamentos com desembolso geram título em `accounts_payable`, categoria "Frota", com `cost_center_id` (reaproveitando Centros de Custo já existente no ERP, CLAUDE.md §1) | P1 | BR-FAC-016 |
| RF-FAC-059 | Nenhum registro de Facilities (veículo, condutor, uso, abastecimento, multa, documento, chamado, visita, reserva) é excluído fisicamente — mantém o padrão já correto (BR-FAC-017, único item já atendido pela primeira entrega) | P0 | BR-FAC-017 |
| RF-FAC-060 | Toda ação de escrita neste módulo passa a gerar trilha de auditoria (`AuditLog`), no mesmo padrão adotado pelos módulos SST/TI/Jurídico — a primeira entrega não confirma isso explicitamente; deve ser verificado/corrigido junto com o restante | P1 | RNF geral §2 |

**Total: 60 RF-FAC catalogados** (38 P0, 17 P1, 5 P2 — contagem corrigida
pelo `AuditorIntegrador` em 2026-08-07 após recontagem linha a linha da
coluna "Prioridade" de cada tabela acima; a versão original deste documento
citava "37 P0, 19 P1, 4 P2", que não batia com a soma das linhas de fato —
ver nota de reconciliação em §7).

---

## 2. Entidades — Referência Rápida

Modelagem de campo definitiva é responsabilidade do `AdmDBA`. Lista de
âncora para rastreabilidade:

| Entidade | Tipo | Observação |
|---|---|---|
| `Asset` (`assets`) | reutilizada, estendida | veículo passa a ser `asset_type='vehicle'` (RF-FAC-001/002/003) |
| `FacilityVehicleDetail` (`facility_vehicle_details`, nome sugerido) | **substitui `facility_vehicles`** | extensão 1:1 de `assets` (RF-FAC-002) — mesmo padrão de `ItSoftwareLicenseDetail` |
| `FacilityVehicleDocument` (`facility_vehicle_documents`) | nova | RF-FAC-007 a 010 |
| `FacilityDriver` (`facility_drivers`) | nova | RF-FAC-011 a 015 |
| `FacilityVehicleTrip` (`facility_vehicle_trips`, diário de uso) | nova | RF-FAC-016 a 021 |
| `FacilityFuelRecord` (`facility_fuel_records`) | **mantida, corrigida** | + `full_tank`, `invoice_ref`; regra de km corrigida (RF-FAC-022 a 027) |
| `FacilityFine` (`facility_fines`, multa) | nova | RF-FAC-028 a 035 — maior prioridade legal do bloco |
| `MaintenanceOrder` (`maintenance_orders`) | reutilizada, estendida | + `next_maintenance_km` (RF-FAC-036), + `facility_specialty`/`facility_area_id` (RF-FAC-039) |
| `FacilityArea` (`facility_areas`) | mantida | referenciada por chamados prediais e (futuramente) plano de limpeza |
| `FacilityCleaningSchedule` (`facility_cleaning_schedules`) | **mantida, redesenhada como plano** | RF-FAC-049 |
| `FacilityCleaningExecution` (`facility_cleaning_executions`) | nova | RF-FAC-049/050 |
| `FacilityVisitor` / `FacilityVisit` | novas | RF-FAC-044 a 047 |
| `FacilityCorrespondence` | nova | RF-FAC-048 |
| `FacilityResourceReservation` | nova | RF-FAC-054 a 056 |
| `AccountPayable` (`accounts_payable`) | reutilizada | custos de frota (RF-FAC-034, RF-FAC-058) |
| `CostCenter` (`cost_centers`) | reutilizada | RF-FAC-058 |
| Item/Estoque (`/api/inventory`) | reutilizada | insumos (RF-FAC-051) |
| `PurchaseRequisition` (`/api/purchase-requisitions`) | reutilizada | reposição de insumos (RF-FAC-052) |
| `AuditLog` | reutilizada | RF-FAC-060 |

---

## 3. Requisitos Não Funcionais Específicos de Facilities (RNF-FAC)

Não duplica `docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md`.

| RNF | Descrição | Referência geral relacionada |
|---|---|---|
| RNF-FAC-01 | Integridade de odômetro: `current_km` do veículo só pode avançar (nunca retroceder) por meio de retorno de uso (RF-FAC-020) ou abastecimento validado (RF-FAC-023); qualquer tentativa de gravação direta fora desses dois caminhos deve ser impossível na camada de aplicação | Novo — mitigação direta dos achados 1 e 6 da verificação |
| RNF-FAC-02 | Alertas de prazo legal (`indication_deadline` de multa, vencimento de CRLV/seguro/IPVA, vencimento de CNH) seguem o mesmo padrão de "não podem ser esquecidos silenciosamente" já adotado em RNF-JUR-05/RNF-SST-04 — verificação ao acessar o painel, mesmo sem rotina agendada | RNF geral §3 |
| RNF-FAC-03 | Nenhum dado de `facility_vehicles` pode ser perdido durante a migração para extensão de `Asset` (RF-FAC-001) — a migração de schema deve ser acompanhada de script de migração de dado, testado contra uma cópia do banco antes de aplicar em produção | Estende RNF geral §2 (integridade de dado) |
| RNF-FAC-04 | Retenção de dados pessoais de visitante segue política a definir com Compliance (RF-FAC-047); enquanto não definida, nenhuma rotina de expurgo automática deve ser criada | RNF geral §3, mesmo padrão de RNF-JUR-03 |

---

## 4. Casos de Uso — Fluxos Principais

Atores conforme perfis reais do projeto: perfil de acesso configurável por
módulo (`operate`/`approve`, após RF-FAC-057), mais os papéis funcionais do
brief (Supervisor Administrativo, Motorista/Condutor, Serviços Gerais,
Vigilante/Portaria terceirizado).

### UC-58: Executar Uso de Veículo Ponta a Ponta com Rastreabilidade Legal

**Ator principal:** Motorista/Condutor autorizado (perfil `facilities`,
nível `operate`).
**Atores secundários:** Supervisor Administrativo (nível `approve` —
libera divergências de odômetro e saída com seguro vencido), solicitante
de outro departamento (Expedição/Vendas, quando a viagem é de entrega).

**Pré-condições:**
- Veículo cadastrado como `Asset` (`asset_type='vehicle'`) com extensão
  `FacilityVehicleDetail`.
- Condutor cadastrado (`FacilityDriver`) com CNH válida e `authorized=true`.

**Fluxo Principal:**
1. Solicitante (ou o próprio FAC) registra a necessidade de veículo:
   finalidade, destino, data/hora prevista (processo P-FAC-01.1).
2. Sistema verifica elegibilidade automaticamente: `Asset.status='active'`
   (não `in_maintenance`), CRLV vigente (RF-FAC-009), condutor autorizado
   com CNH válida e categoria compatível (RF-FAC-012/013).
3. Condutor registra a saída: `departure_km` (validado ≥ maior `return_km`
   anterior, RF-FAC-017), checklist de combustível/avarias.
4. Ao retornar, condutor registra `return_km` (≥ `departure_km`,
   RF-FAC-018), ocorrências; sistema atualiza
   `FacilityVehicleDetail.current_km` (RF-FAC-020).
5. Em paralelo/independentemente, o veículo é abastecido: km validado
   contra `current_km` (RF-FAC-022), litros validados contra
   `tank_capacity_liters` (RF-FAC-024), `current_km` atualizado
   (RF-FAC-023).
6. Manutenção preventiva por km ou tempo (o que vencer primeiro) gera
   alerta e, quando confirmada, uma `MaintenanceOrder` vinculada ao mesmo
   `asset_id` (RF-FAC-036/038).

**Fluxos Alternativos:**
- **A1 (Divergência de odômetro):** `departure_km` menor que o maior
  `return_km` conhecido é aceito **somente** com justificativa e aprovação
  do Supervisor (nível `approve`) — RF-FAC-017.
- **A2 (Seguro vencido):** saída com `DocumentoVeiculo` tipo `seguro`
  vencido exige liberação explícita registrada do Supervisor antes de
  prosseguir (RF-FAC-010).

**Fluxo de Exceção:**
- **E1 (CRLV vencido):** sistema bloqueia a criação de novo `DiarioDeUso`
  com "O QUE" (não é possível registrar saída), "POR QUE" (CRLV/
  licenciamento vencido, veículo sujeito a apreensão — CTB Art. 230, V),
  "O QUE FAZER" (renovar o documento antes de nova saída) — RF-FAC-009.
- **E2 (Condutor não autorizado/CNH vencida):** sistema bloqueia a saída
  com mensagem equivalente, citando a pendência específica (autorização
  suspensa ou CNH vencida) — RF-FAC-012/013.
- **E3 (Veículo com uso em aberto):** sistema rejeita nova saída enquanto
  houver `DiarioDeUso.status='out'` para o mesmo `asset_id`, ou para o
  mesmo condutor em outro veículo — RF-FAC-019.
- **E4 (Veículo em manutenção):** `Asset.status='in_maintenance'` bloqueia
  qualquer nova saída até a conclusão da ordem de manutenção — RF-FAC-004.

**Pós-condições:**
- `DiarioDeUso` completo (saída+retorno) com odômetro consistente.
- `current_km` do veículo sempre reflete o maior valor observado.
- Base pronta para custo/km e para eventual indicação de condutor em
  multa (UC-59).

---

### UC-59: Tratar Multa de Trânsito com Indicação de Condutor dentro do Prazo Legal

**Ator principal:** Supervisor Administrativo (perfil `facilities`, nível
`approve`).
**Atores secundários:** Condutor identificado (confirma ou contesta a
indicação), RH/Financeiro (repasse ao condutor, quando aplicável).

**Pré-condições:**
- Notificação de autuação recebida da empresa (proprietária do veículo).
- Histórico de `DiarioDeUso` do veículo disponível para cruzamento.

**Fluxo Principal:**
1. Supervisor registra a **Multa**: `infraction_at`, `location`,
   `infraction_code`, `amount`, `notice_received_at` (RF-FAC-028).
2. Sistema calcula automaticamente `indication_deadline = notice_received_at
   + 30 dias` (parametrizável) e agenda alertas D-15/D-7/D-3/D-1
   (RF-FAC-029/030).
3. Sistema sugere `identified_driver_id` cruzando `infraction_at` + placa
   com `DiarioDeUso` (RF-FAC-032).
4. Supervisor confirma (ou corrige manualmente) o condutor sugerido e
   formaliza a indicação junto ao órgão de trânsito, registrando
   `indicated_at` antes de `indication_deadline`.
5. Se `charge_to_driver=true`, sistema cria vínculo para tratamento com
   RH/Financeiro (RF-FAC-033).
6. Se a multa é paga pela empresa, gera título em `accounts_payable`
   categoria "Frota" (RF-FAC-034).

**Fluxos Alternativos:**
- **A1 (Nenhum uso cobre o instante da infração):** sistema não sugere
  condutor; Supervisor investiga manualmente (ex.: veículo emprestado sem
  registro formal) e registra a indicação com a evidência disponível.
- **A2 (Contestação):** multa passa a `status='appealed'`, permanece
  auditável.

**Fluxo de Exceção:**
- **E1 (Prazo de indicação vencido sem protocolo):** sistema muda
  automaticamente `indication_status` para `expired_nic` na data-limite —
  "O QUE" (indicação não foi protocolada a tempo), "POR QUE" (prazo do
  CTB Art. 257 §7º vencido), "O QUE FAZER" (registrar o fato, notificar a
  Diretoria do risco de multa NIC agravada) — RF-FAC-031. Nunca é excluída
  do sistema.
- **E2 (Tentativa de indicação automática sem confirmação humana):**
  sistema nunca envia indicação ao órgão sozinho — toda indicação exige
  ação humana explícita do Supervisor, mesmo quando a sugestão de condutor
  é inequívoca — RF-FAC-032.

**Pós-condições:**
- Multa com `indication_status` refletindo a realidade (`indicated`/
  `expired_nic`/`pending`), nunca excluída.
- Se aplicável, título em `accounts_payable` e vínculo de repasse ao
  condutor.

---

### UC-60: Abrir e Executar Chamado de Manutenção Predial

**Ator principal:** Qualquer funcionário (abertura); Supervisor
Administrativo (triagem, perfil `facilities` nível `operate`/`approve`
conforme a criticidade).
**Atores secundários:** Serviços Gerais (execução interna), técnico
terceiro (elétrica/hidráulica/civil), módulo SST (notificado em risco
pessoal).

**Pré-condições:**
- Área física cadastrada (`FacilityArea`) cobrindo o local do problema.

**Fluxo Principal:**
1. Funcionário abre chamado indicando `facility_area_id`,
   `facility_specialty` e descrição do problema (RF-FAC-039/040) — usa
   `maintenance_orders`, não uma tabela paralela.
2. Supervisor FAC triagem: classifica prioridade; problema com risco à
   segurança ou parada de produção recebe `priority='emergency'` e
   notificação imediata (RF-FAC-041).
3. Execução (interna ou terceiro): `service_performed`, custos, consumo de
   insumos prediais dando baixa em `/api/inventory` (RF-FAC-042).
4. Encerramento validado pelo solicitante ou pelo Supervisor.
5. Chamado recorrente pode gerar rotina preventiva usando
   `frequency_days` (RF-FAC-043).

**Fluxos Alternativos:**
- **A1 (Chamado sem área cadastrada):** Supervisor cadastra a
  `FacilityArea` no ato antes de prosseguir com a triagem.
- **A2 (Execução terceirizada):** custo de terceiro registrado em
  `parts_cost`/`labor_cost` já existentes em `maintenance_orders`.

**Fluxo de Exceção:**
- **E1 (Chamado de máquina aberto como predial por engano):** sistema não
  impede o registro, mas a distinção operacional é clara na tela ("o
  ativo produz? use `asset_id`; é predial? use `facility_area_id`") —
  triagem do Supervisor corrige antes da execução; nenhum dado é perdido,
  apenas reclassificado.
- **E2 (Risco pessoal não notificado ao SST):** chamado com indício de
  risco à integridade física deve obrigatoriamente acionar a notificação
  ao módulo SST antes de avançar para execução — bloqueio de fluxo, não
  apenas alerta (RF-FAC-041).

**Pós-condições:**
- Chamado predial rastreável no mesmo histórico de `maintenance_orders`
  usado por MANUT, distinguível por `facility_specialty`.
- KPI de chamados por especialidade, tempo médio de atendimento/resolução
  calculável.

---

### UC-61: Registrar Visitante do Check-in ao Check-out

**Ator principal:** Recepção/Portaria (perfil `facilities`, nível
`operate`).
**Atores secundários:** Anfitrião (funcionário visitado, recebe
notificação), Supervisor Administrativo (alertas de permanência).

**Pré-condições:**
- Anfitrião identificável no sistema (`employee_id`).

**Fluxo Principal:**
1. Recepção registra chegada: nome + documento do visitante, anfitrião,
   crachá numerado, foto opcional (RF-FAC-044/045).
2. Visitante permanece acompanhado em área produtiva (orientação
   operacional, não bloqueio de sistema).
3. Ao final da visita, recepção registra `checkout_at` e devolução do
   crachá.

**Fluxos Alternativos:**
- **A1 (Agendamento prévio):** anfitrião agenda com antecedência
  (`scheduled_at`); recepção apenas confirma o check-in no dia.
- **A2 (Correspondência recebida durante a visita):** registro
  independente de `FacilityCorrespondence`, sem relação obrigatória com a
  visita.

**Fluxo de Exceção:**
- **E1 (Visitante sem check-out ao fim do expediente):** sistema gera
  alerta à portaria para visitantes com `status='onsite'` além do
  horário-limite configurado — "O QUE" (visitante ainda registrado como
  presente), "POR QUE" (checkout não foi registrado), "O QUE FAZER"
  (confirmar saída física ou investigar) — RF-FAC-046.
- **E2 (Check-in sem documento ou anfitrião):** sistema bloqueia o
  registro até que nome, documento e anfitrião estejam preenchidos —
  RF-FAC-045.

**Pós-condições:**
- Nenhuma visita permanece `onsite` sem alerta correspondente.
- KPI "visitas sem check-out" (meta zero) calculável.

---

### UC-62: Executar Rotina de Limpeza com Aderência ao Plano

**Ator principal:** Serviços Gerais (execução, perfil `facilities`, nível
`operate`).
**Atores secundários:** Supervisor Administrativo (define o plano, nível
`approve`).

**Pré-condições:**
- Plano de limpeza ativo para a área (`FacilityCleaningSchedule`).

**Fluxo Principal:**
1. Supervisor define/atualiza o **plano**: área, frequência, responsável
   (RF-FAC-049) — exige nível `approve` (RF-FAC-057).
2. Serviços Gerais registra a **execução** (data, executado por, `ok`,
   observações) — nível `operate` (RF-FAC-049).
3. Sistema calcula aderência (execuções ÷ previstas no período)
   (RF-FAC-050).

**Fluxos Alternativos:**
- **A1 (Área sem cadastro formal):** plano aceita área em texto livre
  como fallback (decisão consciente preservada, ver §6.3).

**Fluxo de Exceção:**
- **E1 (Execução registrada por usuário sem nível `operate`):** sistema
  rejeita com 403 — RF-FAC-057.
- **E2 (Alteração de plano por usuário sem `approve`):** sistema rejeita
  com 403 — corrige a divergência de BR-FAC-015 identificada na
  verificação.

**Pós-condições:**
- KPI de aderência ao plano de limpeza disponível por área e período.

---

## 5. Regras de Negócio — Mapeamento (BR-FAC → RF)

As regras de negócio já estão formalizadas com base legal em
`docs/business/briefs/BRIEF_FAC_2026-08-06.md`, seção (c) — `BR-FAC-001` a
`BR-FAC-017`. Este bloco não as reescreve; a Matriz de Rastreabilidade (§7)
amarra cada uma ao(s) RF(s) e UC(s) correspondentes. Quando este bloco for
consolidado, as regras devem ser transcritas em
`docs/business/BUSINESS_RULES.md`, mantendo os códigos originais — mesmo
procedimento dos Blocos 1 (SST), 2 (TI) e 3 (JUR).

---

## 6. Decisões e Pendências para Arquitetos

### 6.1 Caminho de migração de `facility_vehicles` → extensão de `Asset` (D-2)

**Recomendação:** criar `facility_vehicle_details` como extensão 1:1
(`asset_id` FK única `NOT NULL UNIQUE`), seguindo **exatamente** o
precedente já validado em produção — `ItSoftwareLicenseDetail`
(`server/src/models/ItSoftwareLicenseDetail.ts`, extensão de `assets` para
`asset_type='license'`) — em vez de manter `facility_vehicles` como tabela
independente ou tentar uma segunda alternativa (ex.: view materializada).
Razões:
- É o padrão já usado duas vezes no projeto (`ItemDetalheComercial` para
  produtos, `ItSoftwareLicenseDetail` para licenças) — reduz risco de
  reinventar um terceiro padrão de extensão.
- Preserva depreciação, QR code, responsável e status únicos por veículo em
  `assets`, eliminando a duplicação apontada como violação na verificação.
- Fluxo de migração sugerido (decisão final de execução com `AdmDBA`):
  1. Criar `facility_vehicle_details` com `asset_id` nullable temporariamente
     durante a migração de dado.
  2. Script de backfill: para cada `facility_vehicles` existente, criar
     (ou casar com) um `Asset` com `asset_type='vehicle'`, copiando
     `brand`/`model`, mapeando `status` (ver RF-FAC-001), preenchendo
     `tag` a partir da placa se não houver plaqueta patrimonial anterior.
  3. Preencher `facility_vehicle_details` com os campos específicos (placa,
     RENAVAM, chassi, combustível, km, seguro).
  4. Tornar `asset_id` `NOT NULL UNIQUE`, dropar `facility_vehicles`.
  5. Migrar `facility_fuel_records.vehicle_id` para apontar a `asset_id`
     em vez de `facility_vehicles.id` (ou manter FK renomeada, decisão de
     nomenclatura do `AdmDBA`).
- **Alternativa descartada:** manter `facility_vehicles` com uma FK
  obrigatória adicional para `assets` (duas tabelas de cadastro
  coexistindo). Rejeitada porque perpetua a duplicação de campo que a
  decisão D-2 original já havia identificado como o problema central —
  resolveria apenas a integridade referencial, não a duplicação de dado.

### 6.2 RBAC de chamado predial vs. manutenção de máquina (D-1)

O brief já havia sinalizado a única complexidade real de D-1: um único
model (`maintenance_orders`) atendendo dois módulos de RBAC (`manutencao`
para máquina, `facilities` para predial/veículo). Recomenda-se ao
`ArquitetoSoftwareAPI` decidir entre (a) filtro de listagem por categoria
com autorização de módulo dupla nas rotas que tocam `facility_specialty`
não nulo, ou (b) view/endpoint dedicado
(`/api/facilities/maintenance-tickets`) que internamente consulta
`maintenance_orders` filtrado — preferível se a exposição de campos for
diferente entre os dois públicos.

### 6.3 `facility_cleaning_schedules.area` — texto livre vs. FK

A primeira entrega manteve `area` como texto livre por decisão consciente
(cobre áreas informais sem cadastro formal). Este bloco recomenda migrar
para FK (`facility_area_id`) **quando a área existir no cadastro**, com o
texto livre mantido apenas como fallback opcional — não é uma reversão da
decisão original, é uma evolução que viabiliza o cruzamento área×limpeza
citado como KPI potencial no brief. Decisão final de schema (coluna nova
nullable + texto livre coexistindo, ou substituição completa) cabe ao
`AdmDBA`.

### 6.4 Nível `approve` do módulo `facilities`

RF-FAC-057 propõe a divisão de nível já usada em `sst`/`ti`/`juridico`.
Recomenda-se que `approve` cubra: aprovação de plano de limpeza,
liberação de saída com seguro vencido, aprovação de divergência de
odômetro, confirmação/indicação de multa e fechamento de processo de
multa. `operate` cobre o restante (cadastro de veículo, condutor,
abastecimento, execução de limpeza, abertura/execução de chamado
predial, check-in/out de visitante).

### 6.5 Itens `[VERIFICAR COM GESTOR DE FACILITIES]` — parametrização obrigatória

Repassados do brief (não resolvidos por este bloco de correção, apenas
mantidos como configuração obrigatória, nunca hard-code):

1. Condutor terceirizado (dirigindo veículo da empresa) — hoje fora de
   escopo P0 (RF-FAC-011).
2. Política de repasse de multa ao condutor / existência de cláusula
   contratual que ampare desconto em folha (RF-FAC-033).
3. Tolerância de CNH vencida — adotar os 30 dias legais (CTB Art. 162, V)
   ou bloqueio imediato no vencimento (RF-FAC-013).
4. Bloqueio de saída com preventiva veicular vencida por km/tempo, ou
   apenas alerta (RF-FAC-037).
5. Prazo e política de retenção LGPD de dados de visitante (RF-FAC-047).
6. Controle atual da portaria (livro físico?) — para calibrar a transição
   ao sistema (processo P-FAC-03, sem impacto de modelagem).
7. Dono do registro de ficha de EPI (FAC × RH × SST) — já resolvido a favor
   de SST na primeira entrega; este bloco apenas confirma que não deve ser
   reaberto sem novo pedido explícito.

### 6.6 Fora de escopo deste bloco (herdado do brief, reforçado)

CFTV/alarme/controle de acesso eletrônico (sistemas físicos dedicados,
fora do ERP); compra de insumos/serviços em si (Facilities requisita,
Compras executa); folha/desconto de multa em si (RH/Financeiro);
definição de EPIs obrigatórios (SST). Nenhum RF acima cobre esses itens.

---

## 7. Priorização Consolidada

**Nota de reconciliação (`AuditorIntegrador`, 2026-08-07):** os totais
abaixo foram recontados linha a linha contra a coluna "Prioridade" de cada
tabela de RF em §1 (não apenas contra este resumo narrativo, que havia
perdido `RF-FAC-042` na passagem para P1 apesar de a tabela de origem, §1.8,
marcá-lo `P0`). Contagem correta: **38 P0 / 17 P1 / 5 P2** (soma 60,
igual ao total de RFs catalogados) — os números "37/19/4" citados no
cabeçalho do documento e em referências externas a este bloco estão
desatualizados e devem ser tratados como `37→38`, `19→17`, `4→5`.

### P0 — bloqueante (risco legal/financeiro direto), 38 RFs
Refatoração D-2 completa (RF-FAC-001 a 006, 038); DocumentoVeiculo com
alertas e bloqueio de saída (RF-FAC-007 a 010); Condutor/CNH (RF-FAC-011 a
015); DiarioDeUso com integridade de odômetro (RF-FAC-016 a 021);
Abastecimento corrigido (RF-FAC-022 a 024, 027); Multa com prazo legal
(RF-FAC-028 a 032, 035); Chamado predial via `maintenance_orders`, incluindo
execução (RF-FAC-039 a 042); RBAC `approve` (RF-FAC-057); sem exclusão
física (RF-FAC-059).

### P1 — eficiência/controle, 17 RFs
Manutenção preventiva por km (RF-FAC-036/037); consumo/anomalia de
combustível (RF-FAC-025/026); repasse de multa e AP (RF-FAC-033/034,
RF-FAC-058); geração de rotina preventiva a partir de chamado predial
recorrente (RF-FAC-043); Visitante/Visita (RF-FAC-044 a 047); Limpeza
plano×execução (RF-FAC-049/050); Insumos via estoque (RF-FAC-051/052);
auditoria (RF-FAC-060).

### P2 — conveniência, 5 RFs
Correspondência (RF-FAC-048); Ficha de EPI (referência, não escopo,
RF-FAC-053); ReservaRecurso (RF-FAC-054 a 056).

---

## 8. Matriz de Rastreabilidade — Processo → BR → RF → UC

| Processo do brief | BR-FAC | RF-FAC | UC |
|---|---|---|---|
| P-FAC-01 — Uso de veículo (frota, condutor, diário, manutenção) | 001, 002, 005, 006, 010 | 001–006, 011–021, 036–038 | UC-58 |
| P-FAC-01.5 — Abastecimento | 009, 016 | 022–027 | UC-58 |
| P-FAC-01.6 — Multa | 007, 008 | 028–035 | UC-59 |
| P-FAC-01 (documentos) — CRLV/seguro/IPVA | 003, 004 | 007–010 | UC-58 |
| P-FAC-02 — Chamado de manutenção predial | 011 | 039–043 | UC-60 |
| P-FAC-03 — Visitantes e correspondência | 013 | 044–048 | UC-61 |
| P-FAC-04 — Serviços gerais (limpeza, insumos) | 012, 015 | 049–053 | UC-62 |
| P-FAC-05 — Reserva de salas/recursos | 014 | 054–056 | sem UC formal dedicado (P2, ver §9) |
| Transversal — RBAC/custos/auditoria | 015, 016, 017 | 057–060 | tratado nas seções 6 e 4 (UC-58/59/62) |

---

## 9. Pendência declarada — Caso de Uso não detalhado neste bloco

Este bloco detalha (com fluxo principal/alternativo/exceção completos) os
5 fluxos de maior prioridade: uso de veículo ponta a ponta (UC-58, o mais
extenso, cobre frota/condutor/diário/documentos/manutenção por km),
tratamento de multa com prazo legal (UC-59, maior exposição legal
isolada), chamado de manutenção predial (UC-60), visitantes (UC-61) e
limpeza com aderência ao plano (UC-62). **Reserva de Salas/Recursos
(RF-FAC-054 a 056, P-FAC-05) e Correspondência (RF-FAC-048) ficam sem UC
formal detalhado nesta passada** — são CRUDs de complexidade baixa (regra
de não sobreposição de intervalo é o único ponto não trivial, já coberto
por precedente em outros módulos de agenda do ERP). Recomenda-se que a
próxima passada do `AnalistaNegocios` no pipeline Facilities escreva o UC
formal (UC-63) antes da modelagem definitiva dessas duas tabelas, caso o
`ArquitetoSoftwareAPI` julgue necessário fluxo documentado além do RF.

---

## Referências

- `docs/business/briefs/BRIEF_FAC_2026-08-06.md` — brief de domínio
  (insumo primário).
- `docs/business/BLOCO_4_FAC_VERIFICACAO.md` — auditoria regra-a-regra que
  motivou esta correção (GAPS CRÍTICOS).
- `docs/business/BLOCO_1_SST_REQUISITOS.md`,
  `docs/business/BLOCO_2_TI_REQUISITOS.md`,
  `docs/business/BLOCO_3_JUR_REQUISITOS.md` — mesmo padrão de entregável.
- `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` — índice executivo de RF
  por módulo (a atualizar com a seção Facilities quando este bloco for
  consolidado).
- `docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md` — RNF gerais do projeto.
- `docs/projeto/04-USE_CASES.md`, `docs/business/01-USE_CASES.md` — UC-01 a
  UC-57 (numeração continuada a partir de UC-58 neste bloco).
- `server/src/models/Asset.ts`, `ItSoftwareLicenseDetail.ts`,
  `MaintenanceOrder.ts`, `FacilityVehicle.ts`, `FacilityFuelRecord.ts`,
  `FacilityCleaningSchedule.ts`, `FacilityArea.ts` — âncoras de
  integração/precedente.
- `server/src/modules/facilities/` — código atual a ser corrigido.
- `server/migrations/20260807-000200-create-facilities-module.cjs` —
  migration atual (schema a substituir parcialmente, ver §6.1).
- `server/src/shared/domain/accessModules.ts` — catálogo RBAC (pendência:
  adicionar nível `approve` ao módulo `facilities`, ver §6.4).
- `docs/administrativo/03-FACILITIES.md` — documentação departamental
  atual (a atualizar após a correção).
- `docs/00-ESTRUTURA_ORGANIZACIONAL.md` — departamento 17 (Facilities).

**Fim do BLOCO 4 (correção).**
