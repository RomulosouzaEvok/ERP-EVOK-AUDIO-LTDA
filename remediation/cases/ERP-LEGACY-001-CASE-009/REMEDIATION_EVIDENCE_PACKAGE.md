# REMEDIATION_EVIDENCE_PACKAGE - ERP-LEGACY-001-CASE-009

## Identificacao

- CASE_ID: ERP-LEGACY-001-CASE-009
- Finding: FIND-ERP-002
- Escopo remediado: imutabilidade de `audit_logs`
- Worktree: `sana/ERP-LEGACY-001/CASE-009`
- Papel executor: sanacore-remediation-engineer

## Decisoes Recebidas

- D1: remediar somente `audit_logs`.
- D2: aplicar congelamento a partir de agora; aceitar passivo existente como imutavel sem tentativa de saneamento retroativo.
- D3: usar `ENABLE ALWAYS` no trigger.
- D4: nao preservar `audit_logs` silenciosamente no script `limpar-dados-transacionais.cjs`; a limpeza deve quebrar explicitamente ao tentar apagar a tabela protegida.

## Causa-Raiz

A tabela `audit_logs` registrava trilha de auditoria por aplicacao, mas nao tinha protecao estrutural no banco contra `UPDATE` ou `DELETE`. Isso deixava a integridade historica dependente apenas de disciplina operacional e da camada de aplicacao.

O script `server/scripts/limpar-dados-transacionais.cjs` tambem executa limpeza com `session_replication_role = 'replica'`, o que pode desabilitar triggers comuns. Por isso, a correcao exige trigger `ENABLE ALWAYS`, garantindo bloqueio mesmo em sessoes de manutencao que alterem replication role.

## Estrategia de Correcao

- Criar migration versionada para instalar funcao PL/pgSQL de bloqueio de `UPDATE` e `DELETE`.
- Criar trigger `BEFORE UPDATE OR DELETE ON public.audit_logs`.
- Ativar o trigger com `ALTER TABLE public.audit_logs ENABLE ALWAYS TRIGGER`.
- Manter `AuditLog.register` como caminho legitimo de escrita append-only via `create()`.
- Nao adicionar `audit_logs` a `PRESERVAR_EXATO`, preservando a decisao D4: falhar explicitamente em tentativas de limpeza transacional.
- Manter `sale_invoices` e `accounting_entries` fora do escopo deste caso.

## Arquivos Alterados

- `server/migrations/20260814-000049-audit-logs-immutable-case-009.cjs`
- `server/tests/unit/case009-audit-logs-immutability.test.ts`
- `remediation/cases/ERP-LEGACY-001-CASE-009/REMEDIATION_EVIDENCE_PACKAGE.md`

## Evidencia de Regressao Antes da Correcao

Comando executado sem abrir conexao de banco:

```text
git show c1311a6f76b512fef893f7e60d934179cae3409f:server/migrations/20260814-000049-audit-logs-immutable-case-009.cjs
```

Resultado:

```text
RED_PROOF_OK: migration absent at audit commit, so new CASE-009 immutability assertions fail before remediation
BASELINE_RISK_CONFIRMED: cleanup script uses session_replication_role replica
BASELINE_D4_CONFIRMED: audit_logs not silently preserved by cleanup script
NEW_REGRESSION_TEST_PRESENT
```

Conclusao: no `AUDIT_COMMIT` nao havia migration com funcao, trigger `BEFORE UPDATE OR DELETE` nem `ENABLE ALWAYS` para `audit_logs`. Os testes novos de imutabilidade falhariam antes da correcao pela ausencia do artefato remediador.

## Validacao Apos Correcao

Validacao estatica automatizada executada sem abrir conexao de banco:

```text
PASS function
PASS trigger
PASS before_update_delete
PASS enable_always
PASS clear_error
PASS down_order
PASS cleanup_not_preserved
PASS cleanup_replica_risk_covered
PASS unit_append_only_create
GREEN_STATIC_VALIDATION_OK
```

Teste novo executado usando dependencias ja instaladas da worktree CASE-008, sem abrir banco:

```text
jest --runInBand --no-cache tests/unit/case009-audit-logs-immutability.test.ts
```

Resultado:

```text
Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
```

Bateria unitaria relevante de audit log executada usando dependencias ja instaladas da worktree CASE-008, sem abrir banco:

```text
jest --runInBand --no-cache tests/unit/case009-audit-logs-immutability.test.ts tests/unit/audit-log-register-normalization.test.ts tests/unit/audit-log-failure-alerting.test.ts tests/unit/audit-coverage-guard.test.ts
```

Resultado:

```text
Test Suites: 4 passed, 4 total
Tests:       18 passed, 18 total
```

Tentativa de instalacao de dependencias dentro da propria worktree:

```text
npm ci
```

Resultado:

```text
npm warn tar TAR_ENTRY_ERROR ENOSPC: no space left on device, write
npm error ENOSPC: no space left on device, write
```

Tentativa alternativa de Jest antes da limpeza do `node_modules` parcial:

```text
jest --runInBand --no-cache tests/unit/case009-audit-logs-immutability.test.ts
```

Resultado:

```text
Error: Failed to load native binding
at ...\ERP-Evok-sana-CASE-009\server\node_modules\@swc\core\binding.js:345:11
```

Tentativa alternativa de typecheck usando binario da worktree CASE-008:

```text
tsc -p tsconfig.json --noEmit
```

Resultado resumido:

```text
Falha ambiental por resolucao contra dependencias ausentes/parciais na worktree CASE-009:
- Could not find a declaration file for module 'sequelize'
- Cannot find module 'zod' or its corresponding type declarations
- Cannot find name 'console' / 'setTimeout' / 'fetch'
```

Lacuna declarada: `npm ci`, typecheck e build completos nao puderam ser concluidos dentro da propria worktree porque o drive `C:` ficou sem espaco durante a instalacao (`ENOSPC`). A VeriCore deve reinstalar dependencias em ambiente com espaco livre e executar:

```text
cd server
npm ci
npm run test:unit -- --ci tests/unit/case009-audit-logs-immutability.test.ts
npm run typecheck
npm run build
```

## Riscos Residuais Declarados para VeriCore

- R1: este pacote comprova estaticamente a migration e a rota append-only de aplicacao; a VeriCore ainda deve executar reteste dinamico em banco homologacao/teste.
- R2: a limpeza transacional deve falhar ao tentar `DELETE FROM audit_logs`; essa falha e comportamento esperado por desenho, nao regressao.
- R3: o passivo historico existente foi aceito como imutavel a partir desta remediacao, sem ajuste retroativo.
- R4: `sale_invoices` e `accounting_entries` continuam fora do escopo do CASE-009 por decisao D1.
- R5: `npm ci`, typecheck e build completos dentro da propria worktree ficaram pendentes por limitacao ambiental local (`ENOSPC`).

## Status

REMEDIATION_COMPLETE
