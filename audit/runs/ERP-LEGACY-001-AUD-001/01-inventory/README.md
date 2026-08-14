# 01-inventory — ERP-LEGACY-001-AUD-001 (estágio pendente)

Estágio 2 do ciclo (`audit/framework/AUDIT_PROCESS.md` §4): inventário da run
sobre o `AUDIT_COMMIT c1311a6f76b512fef893f7e60d934179cae3409f`.

**Mandato definido pelo escopo (`00-scope/AUDIT_SCOPE.md` §7):** este estágio
NÃO refaz o discovery — **reaproveita** os inventários de
`docs/coretriad/projects/ERP-LEGACY-001/discovery/` sob a condição obrigatória
de **revalidar contra o AUDIT_COMMIT** cada número materialmente usado:

- módulos backend (49 declarados / 48 com rotas) e 53 arquivos de rota;
- 681 endpoints (`API_INVENTORY.md`);
- 169 migrations / 207 tabelas / 478 FKs (`DATABASE_INVENTORY.md`);
- 164 regras do `BR_CATALOG.md`;
- confirmação de que os 4 commits entre `1979beb` (medição do discovery) e
  `c1311a6f` (AUDIT_COMMIT) não alteraram o objeto além do declarado pelo
  passo 30 (`server/tests/characterization/`, `server/scripts/run-api-suite.cjs`,
  `server/package.json` [script novo]).

Divergência encontrada = registrar (Regra 21), nunca silenciar.

Saída esperada: `SYSTEM_INVENTORY.md` (+ `SYSTEM_MAP.md` se necessário) desta
run, com carimbo do AUDIT_COMMIT. Nenhuma conexão a banco real (APR-2026-016).
