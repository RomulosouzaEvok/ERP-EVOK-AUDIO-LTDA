# AUDIT RUN — ERP-LEGACY-001-AUD-001

Run da auditoria 360° do ERP-LEGACY-001 (passo 31, Parte VIII do
`docs/coretriad/CORETRIAD_MASTER_SPEC.md`), autorizada por `APR-2026-020`
Decisão A (`coretriad/governance/APPROVALS.md`).

**STATUS: SCOPE_REGISTERED — FIELDWORK NÃO AUTORIZADO.** Esta run para no
gate humano do plano de auditoria (`02-plan/AUDIT_PLAN.md`). Nenhuma trilha
de fieldwork inicia sem aprovação humana registrada em
`coretriad/governance/APPROVALS.md`.

## Estrutura da run

Numeração conforme `audit/framework/AUDIT_PROCESS.md` §4 e convenção já
executada em `audit/runs/SIM-001-AUD-001/` e `audit/runs/SIM-002-AUD-001/`:

| Pasta | Estágio | Estado |
|---|---|---|
| `00-scope/` | Escopo reproduzível (`AUDIT_SCOPE.md`) | **CRIADO** |
| `01-inventory/` | Inventário da run (revalidação do discovery contra o `AUDIT_COMMIT`) | CRIADO — aguardando execução |
| `02-plan/` | `AUDIT_PLAN.md` + **GATE HUMANO** | CRIADO — aguardando execução |
| `07-traceability/` | Matriz de rastreabilidade da auditoria | NÃO CRIADO — só após aprovação do plano |
| `21-findings/` | Findings do fieldwork (`FIND-*`) | NÃO CRIADO — só após aprovação do plano |
| `24-coverage/` | Matriz de cobertura da auditoria | NÃO CRIADO — só após aprovação do plano |
| `30-retest/` | Retestes independentes | NÃO CRIADO — fase posterior |
| `31-new-findings/` | Observações novas em reteste | NÃO CRIADO — fase posterior |

As pastas de fieldwork em diante **deliberadamente não existem ainda**:
criá-las agora sugeriria autorização que não foi dada. Serão criadas pelos
agentes produtores de cada estágio, após o gate humano do plano.

## Identidade imutável desta run

```
AUDIT_ID:     ERP-LEGACY-001-AUD-001
AUDIT_COMMIT: c1311a6f76b512fef893f7e60d934179cae3409f  (main, congelado)
BASELINE:     legacy-baseline-001 → c9359be399c45191fe90e8e9707803125a5ba91d (peeled)
```

Regras 12-14 do `CLAUDE.md`: a auditoria audita o `AUDIT_COMMIT` imutável;
não segue HEAD; mudanças posteriores (inclusive remediações SanaCore em
branches `sana/ERP-LEGACY-001/*` autorizadas por `APR-2026-020` Decisão B)
exigem delta audit ou nova auditoria.
