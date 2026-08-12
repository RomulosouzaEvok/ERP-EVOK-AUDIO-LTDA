# Frequência / Ponto Eletrônico — Módulo RH

> **Implementado em 2026-08-12.** Este documento descrevia originalmente uma
> especificação aprovada; a partir desta data reflete o código real —
> tabelas, rotas e o que o parser cobre de fato. Ver
> `docs/governance/HANDOFF_CODEX.md`, entrada 2026-08-12.

## Decisão do dono (2026-08-12)

A Evok Áudio **possui os relógios de ponto** (REPs das marcas **RWTech** e
**Pointline**), mas **outra empresa administra** o ponto com o software dela.
Decisão: **não construir** tratamento de ponto próprio — **integrar por
importação**, no mesmo padrão do importador de folha externa
(`hr_payroll_import_batches`, migration `20260808-000024`).

## Base legal e formato

Todo REP homologado é obrigado pela **Portaria MTP 671/2021** a gerar o
**AFD (Arquivo-Fonte de Dados)** — registro imutável das marcações. Softwares
de tratamento exportam também o **AEJ (Arquivo Eletrônico de Jornada)**, que
já traz a jornada tratada (extras, faltas, abonos).

**Confirmado com a administradora em 2026-08-12: o software dela exporta
AEJ.** Formato de importação definido:

1. **AEJ** — formato primário do importador. Jornada já tratada (Portaria
   671, Anexo IX: registros de jornada por trabalhador com marcações
   ajustadas, extras, faltas e abonos), sem o ERP precisar replicar regra de
   tratamento;
2. **AFD** — apenas conferência/fallback opcional (marcações brutas dos REPs
   RWTech/Pointline), **fora do escopo desta implementação**.

## ⚠️ Limitação conhecida do layout (leia antes de integrar com um arquivo real)

A Portaria 671/2021 não publica um layout binário/fixed-width único e
obrigatório para o AEJ — cada software de tratamento homologado exporta um
arquivo textual próprio, desde que contenha os dados do Anexo IX. **Sem uma
amostra real do arquivo que a administradora da Evok Áudio gera**, o parser
implementado (`server/src/modules/rh/domain/services/aejParser.ts`) adota um
layout **textual delimitado por ponto-e-vírgula, um registro por linha**,
com o primeiro campo identificando o tipo:

| Tipo | Conteúdo | Vira item? |
|---|---|---|
| `1` | Cabeçalho do lote (CNPJ, competência) | Não — informativo |
| `2` | Jornada diária: `2;CPF;MATRICULA;DATA(YYYY-MM-DD);HORAS_TRABALHADAS;HE_50;HE_100;HORAS_NOTURNAS;FALTA(S/N);ABONO` | **Sim** |
| `9` | Rodapé/trailer (contagem de registros) | Não — informativo |
| qualquer outro | Tipo de registro desconhecido | Não — contado em `unknown_record_types`, nunca derruba o lote |

Os 4 campos de horas aceitam `HH:MM` ou decimal (`7.5`/`7,5`). `FALTA` é
`S`/`N`. `ABONO` é texto livre (vazio = sem abono, presente = falta
justificada).

**Quando um arquivo AEJ real da administradora estiver disponível**, ajustar
`aejParser.ts` (`parseWorkdayFields`) para o layout observado — o parser foi
desenhado para essa troca ser localizada em um único arquivo. Até lá, este é
o contrato que o importador aceita.

## O que existe hoje (banco/rotas reais)

### Tabelas (`server/migrations/20260812-000045-create-hr-time-imports.cjs`)

- **`hr_time_import_batches`** — um lote por arquivo importado: `filename`,
  `competencia_inicio`/`competencia_fim`, `imported_by` (FK `users`,
  RESTRICT), `status` (`uploaded → validated`/`rejected` → `confirmed`),
  `total_lines`, `matched_count`, `unmatched_count`, `rejected_count`,
  `unknown_record_types` (JSONB), `rejected_lines` (JSONB), `rejection_reason`,
  `confirmed_by`/`confirmed_at`.
- **`hr_time_import_items`** — uma linha por funcionário×dia: `batch_id` (FK
  CASCADE), `employee_id` (FK `employees`, **NULLABLE**, RESTRICT — casamento
  por CPF), `original_registration` (matrícula do arquivo, sempre
  preservada), `cpf`, `work_date`, `hours_worked`, `overtime_50`,
  `overtime_100`, `night_hours`, `absence`, `absence_justified`,
  `absence_reason`.

O casamento com `employees` é feito **por CPF** (campo padrão do Anexo IX),
não por uma coluna `matricula` — `employees` não tem esse campo no modelo
atual; `original_registration` guarda a matrícula do arquivo para auditoria/
depuração mesmo quando o casamento por CPF funciona.

Sem `UNIQUE(employee_id, work_date)`: reimportação da mesma competência é
permitida (mesma decisão já tomada para `hr_payroll_import_batches` — cada
lote é um evento auditável). **Limitação conhecida:** se dois lotes
CONFIRMADOS cobrirem a mesma competência, o resumo mensal soma os dois.

### Rotas (`/api/rh/*`, `authorizeModule('rh', 'operate'|...)`)

- `POST /api/rh/time-imports` — upload multipart (`file`, `.txt`/`.aej`/
  `.rem`) + `competencia_inicio`/`competencia_fim`. Parseia, grava lote +
  itens, casa por CPF, devolve o relatório de não-casados na mesma resposta.
  Lote sem nenhum registro tipo `2` reconhecido nasce `status='rejected'`
  (não deleta o upload — fica visível na lista, auditável).
- `GET /api/rh/time-imports` — lista lotes, filtros `status`/`competencia`
  (`YYYY-MM`).
- `GET /api/rh/time-imports/:id` — detalhe com itens e não-casados
  destacados.
- `POST /api/rh/time-imports/:id/confirm` — só a partir de
  `status='validated'` (RH precisa ter visto o relatório); recusa (422)
  lote `rejected` (erro estrutural) ou já `confirmed`.
- `GET /api/rh/attendance/monthly-summary?competencia=YYYY-MM&employee_id=` —
  resumo por funcionário a partir de lotes CONFIRMADOS, cruzado com
  `hr_absences` (dias de afastamento sobrepostos ao mês).

Todas as rotas de escrita chamam `logAction` (`audit-coverage-guard`).

### Tela

`client/src/pages/hr/AttendanceTab.tsx` — aba "Frequência" em `/hr`: upload
do AEJ, lista de lotes com status, detalhe do lote (não-casados destacados
antes do botão Confirmar, linhas rejeitadas com motivo, itens importados) e
resumo mensal por funcionário.

## O que este módulo NÃO faz (por decisão)

- Não administra os REPs, não coleta marcação em tempo real, não substitui o
  software da administradora.
- Não calcula jornada a partir do AFD bruto — o AEJ (confirmado disponível)
  já entrega a jornada tratada.
- Não reconcilia automaticamente o ponto importado com a folha importada
  (`hr_payroll_import_*`) — cruzamento futuro, fora do escopo desta rodada.

---

**Última atualização:** 2026-08-12 (implementado — backend + tela; parser
AEJ com layout pragmático documentado, pendente de validação contra um
arquivo real da administradora)
