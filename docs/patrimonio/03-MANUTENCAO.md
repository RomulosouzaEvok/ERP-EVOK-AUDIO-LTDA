# Manutenção Corretiva e Preventiva — ERP EVOK ÁUDIO

> Este documento descreve **o que o módulo de manutenção faz hoje** no
> sistema (não é um plano/roadmap). Para o passo a passo operacional
> completo (telas, campos), ver `docs/manual/00-MANUAL_DO_USUARIO.md` §10.
> Para o fluxo visual (BPMN), ver
> `docs/arquitetura/DIAGRAMA_CASOS_DE_USO_BPMN.md` §5. Para o caso de uso
> formal, ver `docs/projeto/04-USE_CASES.md` UC-18. Este arquivo evita
> duplicar esse conteúdo — apenas resume e referencia.

## 1. Visão Geral

O módulo de Manutenção (`server/src/modules/maintenance/`, telas em
`client/src/pages/maintenance/`) gerencia **ordens de manutenção** de
ativos de patrimônio (máquinas, equipamentos) e, separadamente,
**ordens de serviço externas** (assistência técnica/garantia de
terceiros). Cobre manutenção **corretiva** (reativa, a partir de um
problema relatado) e **preventiva** (agendada por frequência), além de
**preditiva**, **emergencial** e **overhaul** (recondicionamento).

## 2. Módulos e Telas

| Área | Backend | Tela |
|---|---|---|
| Ordens de manutenção internas | `/api/maintenance` (`server/src/modules/maintenance/`) | `/maintenance` → aba "Ordens" (`MaintenanceOrdersTab.tsx`) |
| Ordens de serviço externas | `/api/service-orders` | `/maintenance` → aba "Serviços Externos" (`ServiceOrdersTab.tsx`) |
| Requisições de compra da Manutenção | reaproveita `/api/purchase-requisitions` (`origin='manutencao'`) | `/maintenance/requisitions` (`MaintenanceRequisitionsPage.tsx`) |

## 3. Modelo de Dados (`MaintenanceOrder`)

Tabela `maintenance_orders` (`server/src/models/MaintenanceOrder.ts`) —
detalhamento completo de colunas/tipos em `docs/database/`. Resumo dos
campos centrais do fluxo:

- `asset_id` (FK → `assets`, obrigatório), `maintenance_type` (`preventive
  | corrective | predictive | emergency | overhaul`), `priority` (`low |
  normal | high | emergency`).
- `problem_description` (obrigatório na abertura), `diagnosed_problem`,
  `service_performed`, `technician_id`, `notes`.
- Datas do ciclo: `report_date`, `diagnosis_date`, `start_date`,
  `completion_date`, e (para preventiva) `scheduled_date`,
  `frequency_days`, `next_maintenance_date`.
- Custos: `parts_cost`, `labor_cost`, `total_cost`, `downtime_hours`.
- `status`: `open → scheduled → in_progress → waiting_parts →
  completed/canceled` (transições detalhadas no BPMN §5).
- `result` (quando concluída): `completed | partial | transferred |
  canceled`.

## 4. Fluxo Resumido

1. **Abertura (UC-18):** operador/gestor identifica um problema em um
   ativo e cria a ordem (`POST /api/maintenance`) — `asset_id` e
   `description` são obrigatórios; `status` nasce `open`,
   `maintenance_type` default `corrective`, `priority` default `normal`.
   O número `order_number` é gerado pelo backend no formato
   `OM-<ano>-NNNN`, serializado por advisory lock (correção de
   2026-08-12 — antes o use case não gerava número nem mapeava
   `description → problem_description`, e **toda criação morria em
   500**; o UPDATE tinha a versão silenciosa do mesmo defeito, com
   `diagnosis`/`solution`/`cost` ignorados sem gravar. Prova real em
   `server/tests/integration/maintenance-order-lifecycle.test.ts`).
2. **Necessidade de peças/insumos:** se a manutenção depende de compra,
   abre-se uma requisição de compra com `origin='manutencao'` em
   `/maintenance/requisitions` (mesmo workflow de aprovação/conversão de
   UC-23/UC-25, sem máquina de estados própria).
3. **Execução:** conforme prioridade, a ordem vai para `scheduled`
   (agenda técnico) ou direto para `in_progress` (emergência).
   `start_date` é preenchido automaticamente pelo use case ao entrar em
   `in_progress`; falta de peça durante a execução move para
   `waiting_parts` até retomar.
4. **Conclusão:** técnico registra `service_performed`, `parts_cost`,
   `labor_cost`, `downtime_hours`; ao concluir, `status → completed`,
   `completion_date` é preenchido automaticamente e `result` é definido
   (`completed`/`partial`/`transferred`). Cancelamento usa
   `CancelMaintenanceOrderUseCase` (`status → canceled`).

## 5. Permissões

Rotas protegidas por `authorizeModule('manutencao', ...)`
(`server/src/modules/maintenance/presentation/routes/maintenance.ts`):
leitura exige apenas o módulo `manutencao` no perfil; criação/edição
exigem nível `operate`; exclusão (cancelamento) exige nível `approve`.

## 6. `Asset.status` sincronizado automaticamente com o ciclo de vida da OM

**Implementado em 2026-08-06, registrado como `RF-PAT-05 [IMPLEMENTADO]`**
em `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` §8 e no BPMN §5
(`docs/arquitetura/DIAGRAMA_CASOS_DE_USO_BPMN.md`). Decisão de negócio
tomada: sincronização **automática** (não manual).

- **Início do serviço:** a criação da OM (`CreateMaintenanceOrderUseCase`)
  continua nascendo com `status: 'open'` — não é o gatilho. O gatilho real
  é a **transição da OM para `in_progress`**, em
  `UpdateMaintenanceOrderUseCase`: nesse momento `Asset.status` vira
  `in_maintenance`.
- **Fim do serviço:** a conclusão (`status: 'completed'`, mesmo use case)
  ou o cancelamento (`CancelMaintenanceOrderUseCase`) tentam devolver
  `Asset.status` para `active`, **mas só se**:
  1. o ativo ainda estiver `in_maintenance` no momento (o `UPDATE` usa
     `WHERE status = 'in_maintenance'` — nunca sobrescreve
     `decommissioned`/`lost`/`returned_to_supplier`; se o ativo foi
     baixado durante a manutenção, a conclusão da OM não o "ressuscita");
     e
  2. **não existir nenhuma outra OM aberta** (`open`/`scheduled`/
     `in_progress`/`waiting_parts`) para o mesmo ativo — o módulo
     `maintenance` permite múltiplas OMs simultâneas por ativo, então
     concluir uma delas só libera o ativo quando não sobra nenhuma outra
     em aberto.
- Toda a sincronização roda na **mesma transação Sequelize** da mudança de
  status da OM (`SELECT ... FOR UPDATE` na OM antes de decidir), coberta
  por `server/tests/unit/maintenance-use-cases.test.ts` (15 casos,
  incluindo os cenários de ativo baixado durante a manutenção e de
  múltiplas OMs abertas simultâneas).
- **Risco residual:** sem teste de integração real contra Postgres para os
  `UPDATE` condicionais e o lock da OM (só unitário com mocks) — ver
  `docs/governance/TODO.md`.

## 7. Referências

- `docs/manual/00-MANUAL_DO_USUARIO.md` §10 — passo a passo operacional
  (visão resumida das telas de Patrimônio/Manutenção).
- `docs/arquitetura/DIAGRAMA_CASOS_DE_USO_BPMN.md` §5 — diagrama de fluxo
  completo (Solicitação → Execução → Conclusão → Atualização do ativo),
  incluindo a mesma ressalva do item 6 acima.
- `docs/projeto/04-USE_CASES.md` UC-18 — caso de uso formal.
- `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` §8 — requisitos
  funcionais de Patrimônio (RF-PAT-01 a RF-PAT-07) com status real.
- `docs/patrimonio/01-ATIVOS_FIXOS.md` — cadastro de ativos (pré-requisito
  para abrir uma ordem de manutenção).
