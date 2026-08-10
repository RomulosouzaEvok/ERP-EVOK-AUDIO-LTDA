# Módulo COMEX (Importação)

## Objetivo

Gerenciar o ciclo de vida de um **processo de importação** (UC-19): registro
do processo com itens e alíquotas, cálculo de tributos e custo
nacionalizado, acompanhamento (embarque → chegada → desembaraço),
recebimento com entrada em estoque pelo mesmo caminho do recebimento de
compra, e cancelamento. Base URL `/api/comex/import-processes`.

Arquitetura em camadas (`domain` / `application` / `infrastructure` /
`presentation`), igual aos demais módulos. Sem integração Siscomex/NCM: as
alíquotas de II/IPI/PIS/COFINS/ICMS são informadas manualmente pelo Analista
de Comex e o cálculo é feito em código (`importTaxCalculator.ts`), não no
banco.

## Máquina de status

```
draft ──(gate da diretoria: G11-COMEX)──▶ shipped ──▶ arrived ──▶ customs_cleared ──▶ received
  │                                          │           │              │
  └──────────────────────────────────────────┴───────────┴──────────────┴──▶ cancelled
```

Os eventos de acompanhamento são estritamente sequenciais (`/tracking` não
aceita pular etapa nem retroceder) e gravam
`shipped_at`/`arrived_at`/`customs_cleared_at`/`received_at`. `cancelled` é
possível em qualquer estado anterior a `received`.

## G11-COMEX — gate de aprovação da diretoria (NOVO, 2026-08-10)

Decisão **D-G** do dono do produto. Regra em
`domain/constants.ts`; aplicada em `RegisterImportTrackingUseCase`.

### Por que existe

O **G11** (`modules/purchases/domain/constants.ts`, decisão D-C) colocou a
alçada da diretoria sobre o pedido de compra: nacional acima de R$ 500.000 e
**importação em qualquer valor** exigem `diretor`. Só que
`import_processes` é um fluxo **paralelo** — não vira `purchase_orders`, não
tem FK nenhuma para ele — e, até esta rodada, **todas** as escritas do
módulo eram `comex:operate`, sem etapa de aprovação nenhuma. Ou seja: uma
importação de R$ 1 milhão registrada aqui percorria o ciclo inteiro, dava
entrada em estoque e gerava custo nacionalizado sem passar pela diretoria.
A regra do G11 não alcançava esse caminho porque ele não toca as tabelas que
ela protege.

### A regra

| Dimensão | Decisão |
|---|---|
| Quem aprova | papel `diretor` (mesmo módulo de acesso do G11/RF-JUR-003) |
| Faixa de valor | **não há** — importação é sempre da diretoria |
| Onde trava | transição `draft → shipped` (evento `shipped` de `/tracking`) |

O gate está no embarque porque é o último ponto do ciclo em que ainda dá
para desistir **sem custo afundado**: depois dele, câmbio e frete estão
comprometidos. Sem a aprovação registrada, `422` com
`details.rule = 'G11-COMEX'` e **nada** é gravado — nem o status, nem o
recálculo de tributos dos itens.

### Congelamento dos valores aprovados

No evento `shipped`, os 4 campos monetários do cabeçalho
(`exchange_rate`, `freight_value`, `insurance_value`,
`other_expenses_value`) são **rejeitados**. Motivo: `POST /:id/tracking` é o
**único** caminho de escrita capaz de alterá-los — não existe `PUT /:id`
neste módulo e os itens são imutáveis desde a criação. Sem esse
congelamento, a mesma requisição que consome a aprovação poderia inflar o
valor, e a diretoria teria aprovado um processo diferente do que embarcou:
o gate viraria decoração. É o equivalente do congelamento de
`supplier_id`/`freight_value`/`origin` após `approved` no G11.

`arrived` e `customs_cleared` **continuam aceitando** dados monetários —
despesas aduaneiras reais (armazenagem, capatazia) só são conhecidas depois
e são posteriores ao compromisso; bloqueá-las quebraria o custo
nacionalizado sem proteger nada.

**Consequência operacional:** corrigir câmbio/frete antes de embarcar exige
cancelar e recriar o processo. É a mesma regra que já valia para fornecedor
e itens. Registrado como pendência de validação com o dono em
`docs/governance/TODO.md`, seção G11-COMEX.

### Anti-spoofing (regra P0 do projeto)

`approver_user_id` vem **sempre** de `req.user.id` (JWT) e `approver_role` é
**sempre** resolvido pelo RBAC do usuário logado
(`resolveAvailableApproverRoles`, em `presentation/controllers/importProcessController.ts`)
— nenhum dos dois é aceito do body. `POST /:id/approve` não tem body.

## Estrutura

```
server/src/modules/comex/
  domain/
    constants.ts                                  G11-COMEX: regra, gate e campos congelados
    repositories/ComexRepository.ts               Interface do repositório
  application/
    use-cases/
      CreateImportProcessUseCase.ts
      ListImportProcessesUseCase.ts
      GetImportProcessByIdUseCase.ts
      RegisterImportTrackingUseCase.ts            Sequência de eventos + GATE G11-COMEX
      ApproveImportProcessUseCase.ts              G11-COMEX: registra a aprovação (NOVO)
      ListImportProcessApprovalsUseCase.ts        G11-COMEX: situação da alçada (NOVO)
      ReceiveImportProcessUseCase.ts              Entrada em estoque + lote em quarentena (G14)
      CancelImportProcessUseCase.ts
      importTaxCalculator.ts                      Cálculo puro de tributos/custo nacionalizado
      recalculateImportProcessTaxes.ts
  infrastructure/
    sequelize/SequelizeComexRepository.ts
  presentation/
    controllers/importProcessController.ts
    routes/importProcesses.ts
    validators/importProcessValidators.ts         Zod
```

## Modelos de dados utilizados

- `server/src/models/ImportProcess.ts` — cabeçalho (`import_processes`).
- `server/src/models/ImportProcessItem.ts` — itens (`import_process_items`),
  apontando para o núcleo canônico `items` (UUID), não para `products`.
- `server/src/models/ImportProcessApproval.ts` — **NOVO (G11-COMEX)**,
  `import_process_approvals`; mesmo desenho de `PurchaseOrderApproval` (G11)
  e `JurContractApproval` (RF-JUR-003).
- `Supplier`, `User`, `Item`, `LotControl` (leitura/gateway de lote).

## Endpoints

Todas as rotas exigem JWT válido (`authenticate`).

| Método | Rota | Módulo dono | Nível |
|---|---|---|---|
| GET | `/api/comex/import-processes` | `comex` | padrão (leitura) |
| GET | `/api/comex/import-processes/:id` | `comex` | padrão (leitura) |
| GET | `/api/comex/import-processes/:id/approvals` | `comex` **OU** `diretor` | padrão |
| POST | `/api/comex/import-processes/:id/approve` | `diretor` | padrão |
| POST | `/api/comex/import-processes` | `comex` | `operate` |
| POST | `/api/comex/import-processes/:id/tracking` | `comex` | `operate` (embarque exige a alçada, checada no use case) |
| POST | `/api/comex/import-processes/:id/receive` | `comex` | `operate` |
| POST | `/api/comex/import-processes/:id/cancel` | `comex` | `operate` |

Um Analista de Comex, mesmo com `comex:approve`, **não** registra a
aprovação da diretoria: são módulos de acesso diferentes.
`role === 'admin'`, porém, satisfaz qualquer um deles (curto-circuito padrão
de `authorizeModule` em todo o projeto) — ou seja, um admin sozinho fecha a
alçada. Segregação de função (aprovador ≠ solicitante) **não** está
implementada, por decisão explícita do dono do produto.

Ver `docs/arquitetura/API.md` §32 para payloads e exemplos completos.

## Recebimento (gap G14, 2026-08-09)

`POST /:id/receive` passa pelo **mesmo caminho do recebimento de compra**
(`materialReceiptService.receiveMaterialIntoQuarantine`), com 4 passos na
mesma transação: `InventoryService.receive` (saldo global +
`InventoryMovement` com `reference_type='import'`), dual-write de depósito
(`INSUMOS`), criação do **lote em `quarantine`**
(`IMP-<ano>-XXXX-ITEM<id>-R001`) e
`CostingService.registerWeightedAverageCost` com o custo nacionalizado.

## Auditoria

Todos os endpoints de escrita chamam `logAction` **após** o commit (para não
segurar locks): `create`, `register_tracking`, `receive`, `cancel` e
`approve` (G11-COMEX, entidade `ImportProcessApproval`). As leituras não
geram auditoria.

## Testes

- `server/tests/unit/comex.test.ts` — calculadora de tributos, criação,
  acompanhamento, cancelamento e recebimento (inclusive os casos G14).
- `server/tests/unit/comex-directorate-approval.test.ts` — **NOVO
  (G11-COMEX)**: gate no embarque (incluindo "nada é gravado" sem
  aprovação), congelamento dos valores aprovados, registro da aprovação
  (JWT + RBAC, sem retroatividade) e leitura da situação da alçada. Todo
  teste de erro afirma `details.rule === 'G11-COMEX'`, para não passar pelo
  motivo errado.

## Pendências conhecidas

- **Tela em `client/`** — o módulo inteiro ainda não tem UI (backend-only).
- **Migration `20260810-000031` ainda não aplicada** ao banco.
- **Sem Conta a Pagar automática dos tributos** — ligada ao G13 (momento de
  reconhecimento do passivo), decisão do dono.
- Demais riscos residuais em `docs/governance/TODO.md`, seção G11-COMEX.
