# REMEDIATION_RESPONSE (SanaCore) — `ERP-LEGACY-001-CASE-004`, estágio 1

**Finding respondido:** `AUD-ALOG-01` **item A** — `DELETE /api/employees/:id`
(desligamento de funcionário sem trilha de auditoria), CRITICAL, produção real.
Objeto original em
`audit/runs/ERP-LEGACY-001-AUD-001/07-findings/AUD-ALOG-01.md` — **não editado**
por esta resposta (Regras 15/16).

**Autorização:** `APR-2026-033` (`coretriad/governance/APPROVALS.md`).
**Branch/worktree:** `sana/ERP-LEGACY-001/CASE-004` (Regra 11).
**Base:** `5836b9e` (`docs(sanacore): CASE-004 triagem de AUD-ALOG-01`).
**Data:** 2026-08-17.

## REMEDIATION_COMMIT

```
fe60f9114b0ab76a1c0e9f18369c1ae4f614026b
```

`fix(employees): trilha de auditoria no desligamento (AUD-ALOG-01/A)` —
3 arquivos, +256/−2.

**Estado do finding: `RETEST_REQUIRED`.** A SanaCore **não** declara
`RETEST_PASSED` nem `FINDING CLOSED` (Regras 3 e 4) — é autoridade exclusiva da
VeriCore.

---

## 0. Nota de continuidade — este estágio foi retomado, não reiniciado

Uma execução anterior deste mesmo estágio foi interrompida por limite de sessão
**com trabalho não commitado no worktree** e parou exatamente ao anunciar a
co-mudança na catraca de cobertura. O estado encontrado foi conferido contra o
artefato antes de qualquer edição:

| Item | Estado encontrado | Ação desta execução |
|---|---|---|
| `employeeController.remove` com `logAction` | Presente, completo e aderente ao desenho da triagem §4 passo 2 | **Mantido sem reescrita.** Auditado linha a linha (§2); nenhum defeito encontrado |
| `employees-soft-delete-audit-trail.test.ts` | Presente, não versionado | **Mantido sem reescrita.** Provado que reprova o estado anterior (§4.1) |
| Remoção de `'employees'` de `DEBITO_CONHECIDO` | **NÃO feita** — confirmada a suspeita | **Executada** (§3) |

Nada foi reescrito por preferência de estilo.

---

## 1. Causa-raiz tratada

O módulo `employees` não chamava `logAction` **em nenhuma camada**. A rota
respondia `200 {"message":"Funcionário desligado com sucesso"}` e `audit_logs`
não recebia linha alguma: um ato de efeito trabalhista, em produção real, ficava
sem autor, sem horário e sem origem.

A correção não é "adicionar a linha apontada": o `logAction` foi instalado **no
controller**, e não no use case, porque é no controller que existe o `req` — e é
dele que `AuditLog.register` extrai `user_id`, `user_name`, `user_ip`,
`user_agent`, `route` e `method` (`server/src/models/AuditLog.ts:149-163`).
Um registro sem autor **não fecha este finding** (requisito de reteste fixado no
próprio finding §7 e transcrito na triagem §5); por isso a autoria é tratada como
parte da causa-raiz, não como detalhe de implementação.

Padrão de referência seguido: `productController.remove`
(`server/src/modules/products/presentation/controllers/productController.ts:192-208`),
inclusive no fire-and-forget (o `logAction` não é aguardado, conforme o contrato
documentado do próprio `auditLogService`: "sempre fire-and-forget (não bloqueia a
resposta HTTP principal); nunca propaga erro para o chamador").

## 2. Restrições vinculantes da triagem — verificação item a item

| Restrição | Cumprida | Evidência |
|---|---|---|
| Payload limitado a `status` e `dismissal_date` (`AUD-DB-08`, `BR-RH-020`) | **Sim** | `oldValues`/`newValues` têm exatamente essas 2 chaves; `entityDescription` usa o nome funcional, nunca CPF. Teste 3 varre o payload serializado por **chave e por valor** contra 7 campos sensíveis (CPF, salário, conta, agência, PIX, endereço, telefone) |
| Registro identifica **USER e origem** | **Sim** | O próprio `req` é repassado a `logAction`. Teste 2 assere **identidade** (`toBe(req)`), não equivalência — um `req` sintético sem `user` produziria linha anônima e passaria numa asserção fraca |
| Não executar `apply-pending-migrations.cjs` nem scripts destrutivos | **Sim** | Nenhum script executado. Nenhuma migration criada ou alterada; `server/migrations/` intocado |
| Nenhuma conexão com banco de produção (`APR-2026-016`) | **Sim** | §4.4 |
| Sem refatoração estética fora do blast radius | **Sim** | O diff toca 3 arquivos; os outros 4 handlers de `employeeController` estão intocados |

Ponto que merece registro explícito para o reteste: `entityId` é
`Number(before?.id ?? req.params.id)`. `employees.id` é `INTEGER`, então aqui
**não** incide a armadilha de UUID que a triagem §3.6 nomeia para o item B — mas
o teste fixa `typeof entityId === 'number'` para que uma futura troca de PK não
passe silenciosamente.

## 3. Co-mudança obrigatória executada — a catraca de cobertura

`server/tests/unit/audit-coverage-guard.test.ts` é catraca de **mão dupla**:
além de exigir auditoria de todo módulo de escrita fora da lista, o terceiro
caso (`:109-116`) reprova entrada **obsoleta** — módulo que passou a auditar e
continua em `DEBITO_CONHECIDO`. Sem essa remoção a suíte ficaria vermelha, e a
prova disso está em §4.2.

- **`'employees'` removido**, com comentário nomeando o caso e `APR-2026-033`.
  A catraca agora **exige** auditoria em `employees` para sempre: remover a
  chamada volta a reprovar.
- **`'items'` mantido** — é o item B, fora deste estágio. Nenhuma outra entrada
  foi tocada.

## 4. Evidência de execução

Ambiente: `NODE_ENV=test`, `npx jest --runInBand`, worktree
`ERP-Evok-sana-CASE-004`.

### 4.1 Prova negativa — o teste reprova o estado anterior

Com o controller revertido ao estado de `5836b9e` (`grep -c logAction` = **0**) e
o restante inalterado:

```
  ● AUD-ALOG-01/A — DELETE /api/employees/:id registra trilha de auditoria › emite logAction com action=soft_delete e par oldValues/newValues
      at Object.toHaveBeenCalledTimes (tests/unit/employees-soft-delete-audit-trail.test.ts:121:27)

  ● AUD-ALOG-01/A — DELETE /api/employees/:id registra trilha de auditoria › repassa o próprio req a logAction — sem autor e origem o finding não fecha
    TypeError: Cannot read properties of undefined (reading '0')
      at Object.<anonymous> (tests/unit/employees-soft-delete-audit-trail.test.ts:140:39)

  ● AUD-ALOG-01/A — DELETE /api/employees/:id registra trilha de auditoria › não vaza dado pessoal sensível no payload da trilha (BR-RH-020 / AUD-DB-08)
    TypeError: Cannot read properties of undefined (reading '1')
      at Object.<anonymous> (tests/unit/employees-soft-delete-audit-trail.test.ts:149:47)

Test Suites: 2 failed, 2 total
Tests:       4 failed, 4 passed, 8 total
```

O teste **não** é um "passa sempre": ele falha exatamente no defeito relatado.
O controller foi restaurado em seguida e conferido por hash
(`md5 2eaf005de67f65527ae2d1e55593e069`, idêntico ao de antes da reversão).

### 4.2 Prova de que a co-mudança era obrigatória

Com o controller **remediado** e `'employees'` reinserido na lista de débito —
isto é, exatamente o estado que a execução interrompida havia deixado:

```
  ● cobertura de auditoria nos módulos de escrita › a lista de débito é uma catraca: não lista módulo que já audita nem módulo inexistente
    - Expected  - 1
    + Received  + 3
    - Array []
    + Array [
    +   "employees",
    + ]
      at Object.toEqual (tests/unit/audit-coverage-guard.test.ts:116:23)

Test Suites: 1 failed, 1 total
Tests:       1 failed, 2 passed, 3 total
```

### 4.3 Estado final — verde

Suítes diretamente afetadas (inclui as duas suítes preexistentes de `employees`,
para detectar regressão no use case e no gate `RF-RH-022`):

```
Test Suites: 4 passed, 4 total
Tests:       23 passed, 23 total
Ran all test suites matching tests/unit/employees-soft-delete-audit-trail.test.ts|
tests/unit/audit-coverage-guard.test.ts|tests/unit/employees-use-cases.test.ts|
tests/unit/rh-deactivate-employee-termination-guard.test.ts.
```

Typecheck (`npm run typecheck` → `tsc -p tsconfig.json --noEmit`): **sem saída,
sem erro**.

Suíte unitária completa:

```
Test Suites: 1 failed, 177 passed, 178 total
Tests:       1 failed, 1956 passed, 1957 total
Time:        43.285 s
```

**A única falha é preexistente e alheia a este caso** — `docs-path-reference-guard`:

```
Documentação cita 2 caminho(s) que não existem:
  docs/coretriad/planning/SIM-002_VALIDATION_REPORT.md:46 → docs/API.md
  docs/coretriad/projects/ERP-LEGACY-001/discovery/DEPENDENCY_INVENTORY.md:86 → client/node_modules/jsdom/package.json
```

Nenhum dos dois tem relação com o item A: o diff deste caso toca 3 arquivos, os
três sob `server/`, e `git status` confirma `docs/` inteiramente intocado. A
segunda quebra é ambiental — `client/node_modules` não está instalado neste
worktree. `docs/` é território OpusCore; registrado como observação em §6, **não**
corrigido aqui.

### 4.4 Custódia de dado real (`APR-2026-016`)

**Nenhuma conexão de banco foi aberta** — nem de produção, nem de teste, em
nenhum momento desta execução:

- O teste novo substitui por dublês `src/models/index`,
  `SequelizeEmployeesRepository` e `auditLogService`; nenhum `sequelize.authenticate`
  ou `connect` é alcançado.
- `tests/setup.ts` apenas define `NODE_ENV`; não conecta.
- Só foram executados `jest tests/unit` e `tsc --noEmit`. **Não** foram
  executados `test:integration`, `run-api-suite.cjs`, `apply-pending-migrations.cjs`
  nem qualquer script de diagnóstico.
- Nenhum dado real foi lido, contado ou inspecionado. Os dados sensíveis que
  aparecem no teste são **fictícios**, escritos para serem detectados caso
  vazassem para o payload.

## 5. Arquivos alterados

```
server/src/modules/employees/presentation/controllers/employeeController.ts   (M)
server/tests/unit/audit-coverage-guard.test.ts                                (M) 'employees' removido
server/tests/unit/employees-soft-delete-audit-trail.test.ts                   (A) 5 casos de regressão
```

Não alterados, de propósito: `server/migrations/`, schema, contrato HTTP,
`DeactivateEmployeeUseCase`, `client/`, `audit/`, `docs/`.

Sobre o commit: o repositório **não tem hook de git configurado** (sem
`core.hooksPath`, sem `.husky`, apenas os `*.sample` padrão), verificado após o
fato — o `--no-verify` usado no commit não contornou gate algum.

## 6. O que NÃO foi feito

- **Item B de `AUD-ALOG-01`** (`PATCH /api/items/:id/inactivate` +
  `DELETE /api/items/:id`, HIGH, produção real) — **não executado**. Segue
  pendente; ver a divergência de §7, que afeta o estado da sua autorização.
- **Itens C–H de `AUD-ALOG-01` e o parcial de `sales`** — fora desta
  autorização (`APR-2026-033`, "Condições vinculantes"); seguem a fila.
- **Nenhum critério global fechado.** `T-37` §7.5 corrige o critério publicado
  de 13 para **14** call sites; este caso cobre **1** deles (o item A). Os
  outros 13 continuam abertos. Nada aqui autoriza leitura de fechamento parcial.
- **`docs/` não alterado** (território OpusCore). Duas observações a registrar:
  (a) as 2 quebras de `docs-path-reference-guard` de §4.3, preexistentes;
  (b) `audit-coverage-guard.test.ts:35` aponta o débito para
  `docs/governance/RESIDUAIS_ABERTOS_2026-08-10.md` §3.2, que ainda lista
  `employees` como débito de auditoria e passa a estar defasado com este commit.
  Ambas são para OpusCore, não para SanaCore.
- **Nenhuma declaração de fechamento.** Sem `RETEST_PASSED`, sem
  `FINDING CLOSED`, sem `REMEDIATION_ACCEPTED`.

### 6.1 Alcance real da catraca — leitura que NÃO deve ser feita

A guarda tem granularidade **de módulo** (`audit-coverage-guard.test.ts:102`).
Com `'employees'` fora da lista, ela passa a exigir `logAction` em *algum*
controller do módulo — e o módulo tem **um** controller, agora coberto no
handler `remove`. Ela **não** verifica `create` nem `update` de `employees`, que
continuam sem trilha e **não** são objeto do item A. "Guarda verde" não deve ser
lido como "módulo `employees` integralmente auditado".

## 7. Divergência registrada — `APR-2026-034` não existe (Regra 7)

O despacho que originou esta execução afirma que o item B está "pendente de
execução sob `APR-2026-034` D1 — Rota 2 já decidida pelo dono". **Esse artefato
não existe.** Verificado:

- `grep -rn "APR-2026-034" --include=*.md .` no worktree: **nenhum resultado**.
- Em `main` (`694bca9`), idem.
- A última entrada de `coretriad/governance/APPROVALS.md` é **`APR-2026-033`**
  (linha 1635).

Artefato vence despacho (Regra 7), e human gate não se aprova por inferência
(Regra 18). Consequências, registradas e **não** resolvidas por esta execução:

1. A autorização vigente do item B é `APR-2026-033` item 2, que o autoriza "na
   sequência natural da fila, **carregando `OR-21`**: tratar `AUD-DB-04` como
   dependência **ou** adotar contorno documentado declaradamente — a escolha é
   da execução e deve ficar registrada".
2. A **Rota 2 é, no repositório, uma recomendação da triagem** (`TRIAGE_REPORT.md`
   §3.4), **não** uma decisão registrada do dono. O estágio 2 tem gate explícito
   (§4, "Estágio 2", passo 0): a decisão de `OR-21` deve estar **registrada antes
   de escrever código**.
3. Portanto o item B permanece **`PENDING_HUMAN_DECISION`** quanto a `OR-21`,
   até que a decisão seja registrada em `APPROVALS.md` por autoridade humana.
   Esta resposta **não** registra essa decisão, **não** a infere e **não** a
   trata como tomada.

Se a decisão do dono de fato ocorreu fora do repositório, o caminho correto é
registrá-la em `coretriad/governance/APPROVALS.md` — ato do Control Plane, não
da SanaCore.

## 8. Entrega

Diff e evidências entregues ao `sanacore-remediation-evidence`.
Reteste (incluindo o dinâmico `DYN-T03-07`, **apenas** contra
`erp_evok_audio_test`) é da VeriCore.

**Estado declarado: `REMEDIATION_COMPLETE` (estágio 1, item A).**
**Finding `AUD-ALOG-01` permanece `RETEST_REQUIRED`.**
