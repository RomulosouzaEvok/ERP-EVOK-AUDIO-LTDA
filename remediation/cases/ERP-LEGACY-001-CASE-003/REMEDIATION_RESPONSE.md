# REMEDIATION_RESPONSE (SanaCore)

Objeto respondido: `REMEDIATION_CASE-ERP-LEGACY-001-CASE-003`
(`coretriad/handoffs/ERP-LEGACY-001/REMEDIATION_CASE-ERP-LEGACY-001-CASE-003.md`).

**Nota de nomenclatura, registrada por transparência:** `coretriad/contracts/FINDING.md`
descreve a `remediation-response` como a forma pela qual a SanaCore responde
a um `FIND-*` sem editar o original. **Este caso não tem `FIND-*` próprio**
(declarado explicitamente em §0 do `REMEDIATION_CASE` e reafirmado em
`REMEDIATION_EVIDENCE_PACKAGE.md` §0). Este documento aplica o mesmo
princípio — responder sem editar o objeto original — ao `REMEDIATION_CASE`,
que é aqui o artefato de origem, no lugar de um finding. O `REMEDIATION_CASE`
não foi editado por esta resposta; permanece intocado no diretório do
`coretriad-director`.

---

## O que foi determinado (para referência, sem repetir o texto integral)

Dono, via `APR-2026-025`: estender os dois scripts com a guarda de sufixo
`_test`/`_ci` em `DB_NAME`, fail-closed, sem escape, replicando
`run-api-suite.cjs:530-536`.

## O que a SanaCore fez

- Implementou a guarda em `sana/ERP-LEGACY-001/CASE-003`, commit
  `d4c166e9c57f473df11b9f5244736c46316dc807`, nos exatos dois arquivos
  autorizados: `server/scripts/limpar-dados-transacionais.cjs` e
  `server/scripts/seed-usuarios-departamentos.cjs`.
- Fail-closed sem escape, conforme `I-2` (decisão mais recente do dono,
  prevalece sobre `I-1` por Regra 20 — divergência já registrada e resolvida
  no próprio `REMEDIATION_CASE` §3, não reaberta aqui).
- Atualizou as notas de cabeçalho dos dois arquivos, que descreviam o gap
  como não corrigido — texto que se tornaria falso após a correção.
- Não ampliou o escopo a nenhum outro script.
- Não alterou `.env.example`, `docker-compose.yml`, nem criou banco de dev
  separado (fora de escopo, §7 do caso).
- Não introduziu nenhum escape/bypass.
- Não executou os scripts, não abriu conexão de banco, real ou de teste, em
  nenhum momento da implementação nem deste empacotamento (`APR-2026-016`).

## O que a SanaCore NÃO fez e não fará

- Não declara `RETEST_PASSED`, `FINDING CLOSED`, `REMEDIATION_ACCEPTED` nem
  nenhum critério `CE-*` de `RC-PROC-01` cumprido (Regras 3/4 do
  `CLAUDE.md`).
- Não fecha `AUD-PROC-CUSTODIA-01` — objeto distinto, sem relação de
  dependência com este caso (§4 do `REMEDIATION_CASE`).
- Não persistiu teste automatizado versionado cobrindo a guarda — a
  verificação feita pelo implementador foi isolada (extração de função via
  `new Function`) e não commitada. Este pacote (`REMEDIATION_EVIDENCE_PACKAGE.md`
  §6) avalia essa lacuna como relevante e recomenda que a VeriCore produza e
  persista prova própria.

## Estado devolvido ao Control Plane

`REMEDIATION_COMPLETE` / `READY_FOR_RETEST`. Ver
`remediation/cases/ERP-LEGACY-001-CASE-003/STATUS.md`.

Próximo passo determinado pelo `REMEDIATION_CASE` §5 e §1: reteste
independente da VeriCore, por agente que não escreveu a correção
(`vericore-audit-verification-runner` ou equivalente), executando
`RT-CASE003-01`…`06` (§9 do caso).
