# Módulo `quality` — Inspeção de lote (G7)

Clean Architecture. Montado sob `/api/quality` em `server/app.ts`, **depois**
de `/api/quality/non-conformities` (para não capturar as rotas da RNC).

> Não confundir com o módulo `nonConformities` (`/api/quality/non-conformities`),
> que é **reativo** — documenta o problema depois. Este módulo é o registro
> **preventivo** de liberação: a evidência de que o lote foi verificado contra
> um critério antes de sair da quarentena.

## Por que existe

Até 2026-08-10 o ERP não tinha entidade de inspeção. Liberar um lote da
quarentena era `POST /api/inventory/lots/:id/release` gravando apenas
`lot_controls.notes` — texto livre, sem inspetor, sem critério, sem resultado.

Decisão **D-H** do dono do produto (2026-08-10): a empresa pretende se
certificar ISO 9001, então o registro nasce no formato que a norma pede
— **§8.6** (evidência de conformidade com o critério de aceitação +
rastreabilidade de quem autorizou a liberação) e **§8.7** (controle de saída
não conforme, incluindo aceitação sob concessão) — **sem** travar a operação
com burocracia que ninguém ainda executa.

⚠️ O texto integral da ISO 9001 é paywalled. As cláusulas são citadas por
número e assunto; conferir o literal no exemplar da empresa antes de usar em
documento de auditoria. Fonte:
`docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md` §Decisão 5.

## Endpoints

| Método | Rota | RBAC |
|---|---|---|
| `POST` | `/api/quality/inspections` | `qualidade:operate` |
| `GET` | `/api/quality/inspections` | `qualidade` (view) |
| `GET` | `/api/quality/lots/:lotId/release-eligibility` | `qualidade` (view) |

**Liberar o lote continua fora deste módulo**
(`POST /api/inventory/lots/:id/release`, `qualidade:approve`). A separação é
deliberada: inspecionar (evidência) e autorizar a liberação (decisão) são atos
distintos na §8.6, e agora também níveis de permissão distintos.

## Onde mora a regra

`domain/constants.ts` → `decideLotRelease(latestInspection)`. Função pura,
sem banco, sem exceção — devolve `{ allowed, reason, inspectionId, verdict }`.
`ReleaseLotUseCase` (módulo `inventory`) apenas a consulta, através de um
**gateway injetado** (`findLatestInspectionForLot`), não de um import do model
de qualidade — mesmo padrão do `lotGateway` de
`services/materialReceiptService.ts`.

A regra é **"a inspeção mais recente"**, não "existe alguma aprovada": só
assim uma reprovação posterior fecha de novo um lote antes aprovado, e a
re-inspeção após retrabalho vira o mecanismo natural de reabertura.

## O que este módulo deliberadamente NÃO faz

- **Não libera o lote** (ver acima).
- **Não decide Ac/Re por amostragem.** Não há AQL nem nível de inspeção
  parametrizado — são decisão da Engenharia da Qualidade e o dono não a tomou.
  `sampling_plan`, `lot_size` e `sample_size` são evidência textual do que foi
  aplicado. O veredito é do inspetor humano.
- **Não reimplementa bloqueio de lote nem RNC.** `verdict = 'rejected'` delega
  a `CreateNonConformityUseCase`, exatamente como `CreateAcousticTestUseCase`
  passou a fazer no **G8**; aquele caso de uso já bloqueia o lote, herda o
  fornecedor, recalcula `quality_score` e grava o aviso do **G10**.

## Pendências conhecidas

- `QualityInspection` **não está registrado** em `server/src/models/index.ts`
  (arquivo sob edição concorrente na rodada em que este módulo nasceu). O
  repositório carrega o model direto do arquivo — funciona, mas **sem
  associações**, então nenhuma consulta usa `include`.
- Migration `20260810-000032` **escrita e não aplicada**. Sem ela o código não
  roda.

Ver `docs/governance/TODO.md`, entrada de 2026-08-10 (G7).
