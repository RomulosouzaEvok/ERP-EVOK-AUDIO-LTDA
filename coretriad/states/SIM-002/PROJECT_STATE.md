# PROJECT STATE — SIM-002

| Campo | Valor |
|---|---|
| Project ID | SIM-002 |
| Nome | PagaFácil — cadastro e aprovação de fornecedores com pagamento |
| Tipo | SIMULATION |
| Data de registro | 2026-08-13 |
| Estado atual | `IN_REMEDIATION` |
| Situação do ciclo | EM EXECUÇÃO — onda de remediação WAVE-D em curso |
| AUDIT_COMMIT | `f2fcf1c78a6a1255738d05e66a6100fa9c47428a` (imutável — Regras 12 e 13) |
| Run de auditoria | `audit/runs/SIM-002-AUD-001/` |
| Última atualização | 2026-08-13 18:50 |
| State machine | `coretriad/states/STATE_MACHINE.md` |
| Event log | `coretriad/states/SIM-002/PROJECT_EVENT_LOG.md` |
| Referência normativa | `docs/coretriad/CORETRIAD_MASTER_SPEC.md` — Parte VII |

## Descrição

Segundo simulado de validação operacional do modelo CoreTriad, mais exigente
que o SIM-001: cadastro e aprovação de fornecedores com emissão e envio de
pagamentos. Percurso: IDEA → BUILD → AUDIT (8 trilhas paralelas) → FINDINGS →
REMEDIATION (ondas A/B/C) → RETEST parcial → human gates → REMEDIATION
(WAVE-D).

## Estado da auditoria

- Auditoria `SIM-002-AUD-001` executada sobre o AUDIT_COMMIT congelado
  `f2fcf1c78a6a1255738d05e66a6100fa9c47428a`, sem acesso ao gabarito do
  simulado, em 8 trilhas paralelas.
- 13 findings emitidos; 9 validados adversarialmente pelo
  `vericore-finding-validator`; **0 falsos positivos**; 2 severidades
  rebaixadas.
- **`AUDIT_PASSED` NÃO foi declarado.** O `vericore-software-audit-director`
  recusou o encerramento do run com o FIND-SIM-002-004 (CRITICAL) ainda
  aberto. Somente a VeriCore pode declarar `AUDIT_PASSED` (Regras 2 e 4).

## Findings

| Finding | Status | Nota |
|---|---|---|
| FIND-SIM-002-001 | `CLOSED` | Fechado pela VeriCore no reteste |
| FIND-SIM-002-002 | `CLOSED` | Fechado pela VeriCore no reteste |
| FIND-SIM-002-003 | `CLOSED` | Fechado pela VeriCore no reteste |
| FIND-SIM-002-004 | `CONFIRMED` | CRITICAL — em remediação na WAVE-D; destravado por `APR-2026-007` |
| FIND-SIM-002-005 | `CLOSED` | Fechado pela VeriCore no reteste |
| FIND-SIM-002-006 | `CLOSED` | Fechado pela VeriCore no reteste |
| FIND-SIM-002-007 | `CLOSED` | Fechado pela VeriCore no reteste |
| FIND-SIM-002-008 | `PARTIALLY_REMEDIATED` | Parte A (matriz de papéis) destravada por `APR-2026-008` |
| FIND-SIM-002-009 | `CONFIRMED` | Em remediação na WAVE-D; destravado por `APR-2026-009` (estado `failed`) |
| FIND-SIM-002-010 | `PROPOSED` | Pendência rastreada — ver abaixo |
| FIND-SIM-002-011 | `CLOSED` | Fechado pela VeriCore no reteste |
| FIND-SIM-002-012 | `PROPOSED` | Pendência rastreada — ver abaixo |
| FIND-SIM-002-013 | `PROPOSED` | Pendência rastreada — ver abaixo |

Totais: **7 CLOSED**, **1 PARTIALLY_REMEDIATED**, **2 CONFIRMED em
remediação**, **3 PROPOSED rastreados**.

Arquivos de finding: `audit/runs/SIM-002-AUD-001/21-findings/`.

## Human gates fechados (2026-08-13)

Decisões humanas explícitas de Gilwagno registradas em
`coretriad/governance/APPROVALS.md` (Regra 18). O Director apenas registra —
não decide, não reclassifica finding (Regras 5 e 6).

1. **`APR-2026-007` — FIND-SIM-002-004 (`cancelPayment`).** `cancelPayment` é
   válido **apenas** para pagamentos em estado `created`; **não existe
   cancelamento após `sent`** (isso seria estorno, fora de escopo). Remediação:
   remover a transição `sent → created`.
2. **`APR-2026-008` — FIND-SIM-002-008-A e OBS-002 (papéis de pagamento).**
   Escrita (criar/enviar pagamento) restrita a `manager`; leitura
   (`getSupplier`, `listPaymentsBySupplier`) permitida a `analyst` e `manager`;
   em ambos os casos o papel **deve ser verificado no servidor** contra fonte
   confiável de identidade, nunca autodeclarado pelo cliente — aplicação direta
   da **Regra 24 do `CLAUDE.md`**.
3. **`APR-2026-009` — FIND-SIM-002-009 (recusa do gateway).** Criado o estado
   **`failed`** no domínio de `payments.status` (antes
   `created`/`sent`/`cancelled`), para rastrear recusa do gateway como causa
   distinta de cancelamento.

Esses três gates destravaram a lacuna normativa que impedia a SanaCore de
remediar sem inventar regra de negócio (Regra 6) e motivaram a reabertura do
projeto para a **WAVE-D**.

## Pendências rastreadas, não descartadas

Por **decisão humana de 2026-08-13**, os findings abaixo recebem o **mesmo
tratamento dado aos FIND-SIM-001-004/005/006 no `APR-2026-006`**: **não
bloqueiam o fechamento do ciclo, mas permanecem explicitamente rastreados como
pendentes — não descartados.**

| Finding | Conteúdo |
|---|---|
| FIND-SIM-002-010 | Lost update em `approveSupplier` — check-then-act sem CAS (compare-and-swap), permitindo sobrescrita concorrente de aprovação |
| FIND-SIM-002-012 | Schema sem `CHECK` de domínio, sem `updated_at`, e `payments.company_id` sem FK composta |
| FIND-SIM-002-013 | Lacunas de fronteira e de testes negativos; mensagens de erro divergentes; status `rejected` órfão; índices ausentes |

**Ação pendente (não vence prazo, mas não pode ser esquecida):** rodar o
`vericore-finding-validator` sobre FIND-SIM-002-010, -012 e -013 **antes do
arquivamento definitivo do SIM-002** — ou descartá-los junto com o ambiente do
simulado, caso se conclua que não têm valor de aprendizado para o processo.
Enquanto essa ação não ocorrer, o SIM-002 poderá ser fechado como ciclo de
validação, porém **não arquivado**.

## Observações abertas do reteste

Registradas em
`audit/runs/SIM-002-AUD-001/31-new-findings/NEW_OBSERVATIONS.md` — abertas,
sem decisão, sob autoridade da VeriCore e do responsável humano:

- **OBS-001** — coerção de tipo: `approved_by="77.0"` aceito como identificador
  válido.
- **OBS-003** — `sent_at` instável no caminho pós-cancelamento.
- **OBS-004** — teste de TOCTOU não distingue "corrigido" de "não observável" —
  ausência de falha não é prova de correção.
- **OBS-005** — prova de mutação não evidenciada.

## Notas de governança

- O AUDIT_COMMIT é imutável: mudanças posteriores exigem delta audit ou nova
  auditoria (Regras 12, 13 e 14).
- `RETEST_PASSED` deste ciclo foi **parcial** — cobre apenas os 7 findings
  fechados e **não** substitui o encerramento do run de auditoria.
- O Director não implementa, não audita e não corrige (Regra 5); este arquivo é
  registro de estado, não decisão.
