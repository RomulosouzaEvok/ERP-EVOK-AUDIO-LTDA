# REMEDIATION_RESPONSE (SanaCore) — `ERP-LEGACY-001-CASE-004`, estágio 2

**Finding respondido:** `AUD-ALOG-01` **item B** —
`PATCH /api/items/:id/inactivate` **e** `DELETE /api/items/:id` (inativação de
item do cadastro mestre industrial sem trilha de auditoria), HIGH, produção
real. Objeto original em
`audit/runs/ERP-LEGACY-001-AUD-001/07-findings/AUD-ALOG-01.md` — **não editado**
por esta resposta (Regras 15/16).

**Autorizações:** `APR-2026-033` (abertura do caso) e **`APR-2026-034` D1**
(`OR-21` decidido pelo dono: **Rota 2 — contorno documentado declaradamente**;
Rota 1, migration em `audit_logs`, **recusada**). Ambas lidas em
`coretriad/governance/APPROVALS.md` **antes** de qualquer linha de código.
**Branch/worktree:** `sana/ERP-LEGACY-001/CASE-004` (Regra 11).
**Base:** `9d42cbc` (merge de governança que trouxe `APR-2026-034`).
**Data:** 2026-08-17.

Este arquivo é **novo**, e não uma edição do `REMEDIATION_RESPONSE.md` do
estágio 1: aquele registro é evidência datada de outro estágio, com sua própria
divergência §7 (à época `APR-2026-034` ainda não existia — hoje existe, e é o
que autoriza este estágio). Reescrevê-lo apagaria o histórico de como a decisão
foi obtida.

## REMEDIATION_COMMIT

```
a44f25bfbe2d0506ff53f5a553d3403fb675c05c
```

`fix(items): trilha de auditoria na inativacao (AUD-ALOG-01/B)` — 3 arquivos.

**Estado do finding: `RETEST_REQUIRED`.** A SanaCore **não** declara
`RETEST_PASSED` nem `FINDING CLOSED` (Regras 3 e 4) — autoridade exclusiva da
VeriCore.

---

## 0. Nota de continuidade — retomada, não reinício

Uma execução anterior deste estágio parou por falha de infraestrutura **depois**
do merge de governança e **antes** de escrever código. O estado encontrado foi
conferido antes de qualquer edição: worktree limpo, `HEAD 9d42cbc`, nenhum
trabalho parcial. O passo de governança (merge + confirmação de `APR-2026-034`
D1) **não foi refeito**; foi **verificado**: `APPROVALS.md:1670-1727` contém a
entrada, com a decisão D1 e com a frase que este documento repete adiante — *"o
contorno é contorno declarado, não correção de causa-raiz"*.

---

## 1. Causa-raiz tratada

O módulo `items` não chamava `logAction` **em nenhuma camada**. Inativar um item
do cadastro mestre industrial — 327 insumos reais em produção — respondia
`200 {"success":true,"data":{...}}` e `audit_logs` não recebia linha alguma.
É o módulo que **originou** a guarda de cobertura: a carga inicial de 2026-08-10
criou 327 itens e a tabela de auditoria terminou com **2 linhas, os dois
logins**.

A correção não é "adicionar a linha apontada". O `logAction` foi instalado **no
controller**, e não no use case, porque é no controller que existe o `req` — e é
dele que `AuditLog.register` extrai `user_id`, `user_name`, `user_ip`,
`user_agent`, `route` e `method` (`server/src/models/AuditLog.ts:149-163`).
**Registro sem autor não fecha este finding** (finding §7; triagem §5). Autoria
é parte da causa-raiz, não detalhe de implementação.

### 1.1 Restrição 1 do despacho — as duas rotas, verificada

`server/src/modules/items/presentation/routes/items.ts:20-21` foi relido:

```
router.patch('/:id/inactivate', authenticate, authorizeModule('produtos', 'operate'), itemController.inactivate);
router.delete('/:id',           authenticate, authorizeModule('produtos', 'operate'), itemController.inactivate);
```

**Confere.** As duas rotas convergem no mesmo handler, logo a trilha instalada
cobre as duas. Elas continuam **distinguíveis na trilha**, porque
`AuditLog.register` grava `method` e `route` a partir do próprio `req`
(`PATCH /api/items/<uuid>/inactivate` vs `DELETE /api/items/<uuid>`), e a
`description` também nomeia o verbo e a URL.

A prova é feita **por entrada** (`T-37` §7.4): dois testes distintos, um por
rota, com `req` e usuário diferentes — e **um teste estrutural** que lê o
arquivo de rotas e reprova se qualquer uma das duas deixar de apontar para o
handler auditado. Sem esse teste, desviar `DELETE /:id` para outro handler no
futuro apagaria a trilha daquela porta sem nenhum teste reclamar.

---

## 2. A armadilha do UUID — o núcleo do trabalho

Cadeia de falha, tal como a triagem §3.2 a reconstruiu e como foi reconferida
aqui:

1. `Item.id` é `DataTypes.UUID` (`src/models/Item.ts:49-53`).
2. `audit_logs.entity_id` é `integer` (`AuditLog.ts:85` + baseline congelado).
3. `AuditLog.register` faz `entity_id: Number(data.entityId)`
   (`AuditLog.ts:155`) → `Number('<uuid>')` = `NaN` → `INSERT` rejeitado
   (`22P02`).
4. A degradação de `auditLogService` **não socorre**:
   `isUnsupportedAuditActionError` só reconhece `enum_audit_logs_action`. O erro
   de `integer`/`NaN` cai no retry, falha de novo e termina em
   `logs/audit-failures.log`.
5. Resultado de uma correção ingênua: **200 ao usuário, trilha inexistente,
   finding aparentemente remediado** — pior que o estado atual.

**Como o código entregue barra isso:** `entityId: undefined` (grava `NULL`), com
comentário nomeando `AUD-DB-04` e `OR-21` no ponto exato — não um `undefined`
órfão. A contenção de tipo (`LogActionParams.entityId?: number`) permanece
intacta: **nenhum `as any`, nenhuma chamada direta a `AuditLog.register`,
nenhuma cast** foi usada para contornar o `tsc`. E o teste falha se `entityId`
deixar de ser `undefined`, com asserção explícita contra o valor `NaN`.

### 2.1 Declaração exigida: isto é contorno, não correção de causa-raiz

> O tratamento do UUID neste caso é **contorno declarado**. A causa-raiz da
> incompatibilidade — `audit_logs.entity_id integer` × PK `uuid` — **não foi
> corrigida**. `AUD-DB-04` permanece **MEDIUM e ABERTO**, e nada neste caso o
> fecha, o mitiga ou o reduz de severidade.

Consequência operacional, escrita por extenso para não ser descoberta no
reteste: **a linha de auditoria de `Item` NÃO é recuperável pelo índice
`entity_type + entity_id`** (`entity_id` fica nulo). A consulta de reteste
**tem de ser** por `entity_type='Item'` + `entity_description`. Quando
`AUD-DB-04` for remediado, o backfill é um `UPDATE` por `entity_description` —
razão pela qual o UUID foi mantido íntegro ali e repetido em
`oldValues`/`newValues`.

### 2.2 Achado colateral tratado — `varchar(255)` teria produzido a MESMA falha silenciosa

Achado desta execução, não previsto na triagem: `entity_description` é
`DataTypes.STRING(255)`. Como o contorno faz desse campo a **única** chave de
recuperação, a tentação natural é concatenar `codigo` + `descricao` + UUID — mas
`codigo` é `varchar(80)` e `descricao` é `varchar(240)`: o texto chega a ~367
caracteres e o `INSERT` seria rejeitado pelo Postgres. Como `logAction` nunca
propaga erro ao chamador, o efeito seria **exatamente o modo de falha que este
caso combate**: HTTP 200 e nenhuma linha na trilha — desta vez para os itens de
descrição longa, isto é, de forma intermitente e ainda mais difícil de notar.

Tratado com truncagem que **preserva íntegras as duas chaves de recuperação**
(`codigo` e UUID) e corta apenas a descrição, com teste dedicado usando
`codigo` e `descricao` no comprimento máximo.

---

## 3. Restrições vinculantes — verificação item a item

| Restrição (despacho + triagem §3.4) | Cumprida | Evidência |
|---|---|---|
| 1. Ambas as rotas cobertas pela trilha | **Sim** | §1.1: rotas relidas; 2 testes por entrada + 1 teste estrutural sobre `items.ts` |
| 2. Autoria (USER e origem) | **Sim** | O próprio `req` é repassado. Os testes asserem **identidade** (`toBe(req)`), não equivalência — um `req` sintético sem `user` produziria linha anônima e passaria numa asserção fraca |
| 3. Co-mudança na catraca + corolário registrado | **Sim** | §4 |
| 4. Payload mínimo e suficiente | **Sim** | `oldValues`/`newValues` têm exatamente `item_id`, `codigo`, `status`. Teste varre o payload serializado por chave **e** por valor contra `custo_padrao`, `estoque_atual`, `estoque_reservado` |
| 5. Teste que reprove o estado anterior | **Sim** | §5.1, com restauração conferida por hash |
| 6. Nenhuma conexão com banco (`APR-2026-016`) | **Sim** | §5.5 |
| Comentário nomeando `AUD-DB-04`/`OR-21` no call site | **Sim** | Bloco JSDoc de `inactivate` + comentário na própria linha `entityId: undefined` |
| Registro da não-recuperabilidade por `entity_id` | **Sim** | §2.1, e no código, e na mensagem do commit |
| Reteste deve buscar por `entity_type` + `entity_description` | **Declarado** | §2.1 e §7 — é instrução para a VeriCore, não execução daqui |
| Sem refatoração estética fora do blast radius | **Sim** | Dos 11 handlers de `itemController`, apenas `inactivate` foi tocado |

---

## 4. Co-mudança obrigatória executada — e o corolário que a acompanha

`server/tests/unit/audit-coverage-guard.test.ts` é catraca de **mão dupla**: o
terceiro caso reprova entrada **obsoleta** — módulo que passou a auditar e
continua em `DEBITO_CONHECIDO`. `'items'` foi removido, com comentário nomeando
o caso, `APR-2026-033` e `APR-2026-034` D1. A prova de que a remoção era
obrigatória está em §5.2.

**Corolário, registrado no próprio arquivo da guarda e aqui — leitura que NÃO
deve ser feita:**

A guarda tem granularidade de **módulo**: ela pergunta apenas se *algum*
controller do módulo cita `logAction`. Com `'items'` fora da lista, ela deixa de
sinalizar o módulo — mas **continuam mudos**:

- `itemController.removeSupplier` (`DELETE /api/items/:id/suppliers/:linkId`,
  fornecedor de item) — **item C de `AUD-ALOG-01`, fora desta autorização**;
- `itemController.create` (`POST /api/items` — o próprio handler do incidente
  das 327 cargas) e `itemController.update` (`PATCH /api/items/:id`), que não
  são objeto do item B.

**"Guarda verde" ≠ "módulo `items` auditado".** A guarda não cobre esses
handlers e não passará a cobri-los. Quem ler a suíte verde como cobertura do
módulo estará errado — e é precisamente esse tipo de leitura que produziu o
débito original.

---

## 5. Evidência de execução

Ambiente: `NODE_ENV=test`, `npx jest --runInBand`, worktree
`ERP-Evok-sana-CASE-004`.

### 5.1 Prova negativa — o teste reprova o estado anterior

Com o controller revertido ao estado pré-remediação (`git checkout HEAD --`,
`grep -c logAction` = **0**) e o restante inalterado:

```
● … › emite logAction com action=soft_delete e par oldValues/newValues
● … › cobre a rota PATCH /:id/inactivate com autor e origem próprios
● … › cobre a rota DELETE /api/items/:id com autor e origem próprios
● … › NÃO passa o UUID em entityId — contorno declarado de AUD-DB-04 / OR-21
● … › mantém o item recuperável por entity_description (codigo + UUID), já que entity_id fica nulo
● … › entityDescription cabe em varchar(255) mesmo com codigo e descricao no tamanho máximo
● … › não despeja campos comerciais do item no payload da trilha (payload mínimo)

Test Suites: 1 failed, 1 total
Tests:       7 failed, 4 passed, 11 total
```

O teste **não** é um "passa sempre": falha exatamente no defeito relatado. Os
4 que passam na reversão são, por desenho, os que **não** dependem da trilha —
o estrutural de rotas, o 409, o 404 e o contrato HTTP — e existem para provar
que a remediação não alterou regra de negócio nem contrato.

O controller foi restaurado em seguida e conferido por hash:
`md5 20c3f0d46bb023f29e1061287b4acbdf`, idêntico ao de antes da reversão.

### 5.2 Prova de que a co-mudança na catraca era obrigatória

Com o controller **remediado** e `'items'` reinserido na lista de débito:

```
● cobertura de auditoria nos módulos de escrita › a lista de débito é uma
  catraca: não lista módulo que já audita nem módulo inexistente
    +   "items",

Test Suites: 1 failed, 1 total
Tests:       1 failed, 2 passed, 3 total
```

Arquivo restaurado e conferido por hash (`md5 9fb776763f4c94c220da61eef3f74999`,
idêntico).

### 5.3 Estado final — verde

Suítes diretamente afetadas (inclui `deactivate-item-http-409`, para detectar
regressão no use case, e a suíte do estágio 1, para detectar regressão cruzada):

```
Test Suites: 4 passed, 4 total
Tests:       23 passed, 23 total
```

Typecheck (`npm run typecheck` → `tsc -p tsconfig.json --noEmit`): **sem saída,
sem erro** — inclusive com a contenção `entityId?: number` intacta.

Suíte unitária completa:

```
Test Suites: 1 failed, 178 passed, 179 total
Tests:       1 failed, 1967 passed, 1968 total
Time:        72.214 s
```

### 5.4 A única falha é preexistente e alheia a este caso

`docs-path-reference-guard`, com os **mesmos 2 caminhos** já registrados no
estágio 1 (§4.3 do `REMEDIATION_RESPONSE.md`):

```
docs/coretriad/planning/SIM-002_VALIDATION_REPORT.md:46 → docs/API.md
docs/coretriad/projects/ERP-LEGACY-001/discovery/DEPENDENCY_INVENTORY.md:86 → client/node_modules/jsdom/package.json
```

`git status` confirma que o diff deste estágio toca **3 arquivos, os três sob
`server/`**, e que `docs/` está inteiramente intocado. A segunda quebra é
ambiental (`client/node_modules` não instalado neste worktree). `docs/` é
território OpusCore; registrado como observação em §6, **não** corrigido aqui.

### 5.5 Custódia de dado real (`APR-2026-016`)

**Nenhuma conexão de banco foi aberta** — nem de produção, nem de teste, em
nenhum momento desta execução:

- O teste novo substitui por dublês `src/models/index`, `SequelizeItemRepository`
  e `SequelizeItemEstruturaRepository`, além de `auditLogService`; nenhum
  `sequelize.authenticate`/`connect` é alcançado.
- Só foram executados `jest tests/unit` e `tsc --noEmit`. **Não** foram
  executados `test:integration`, `run-api-suite.cjs`,
  **`apply-pending-migrations.cjs`** nem qualquer script de diagnóstico.
- Nenhum dado real foi lido, contado ou inspecionado. O UUID, o código
  `MP-0042` e os valores do teste são **fictícios**, escritos para serem
  detectados caso vazassem para o payload.
- Nenhuma migration foi criada, alterada ou aplicada; `server/migrations/` está
  intocado.

---

## 6. Arquivos alterados

```
server/src/modules/items/presentation/controllers/itemController.ts   (M) logAction em `inactivate` + helper de truncagem
server/tests/unit/audit-coverage-guard.test.ts                        (M) 'items' removido + corolário de granularidade
server/tests/unit/items-soft-delete-audit-trail.test.ts               (A) 11 casos de regressão
```

Não alterados, de propósito: `server/migrations/`, schema, contrato HTTP,
`DeactivateItemUseCase` (assinatura e retorno), `client/`, `audit/`, `docs/`.

**Documentação afetada pela correção:** nenhuma doc sob autoridade da SanaCore.
A documentação que a correção torna defasada é de OpusCore e está listada em
§6.1 como observação — não corrigida aqui (Regra 16, ownership).

### 6.1 Observações para OpusCore (não corrigidas — `docs/` é OpusCore)

1. **`OBS-C004-01` (triagem §6.1) fica agora com sinal invertido.**
   `docs/arquitetura/API.md:3888-3890` diz que `logAction` cobre a "maioria dos
   módulos", com `suppliers` como única exceção declarada. Com A e B remediados,
   a lista de exceções mudou de novo — a frase continua errada, por outro motivo.
2. **`docs/governance/RESIDUAIS_ABERTOS_2026-08-10.md` §3.2**, apontado por
   `audit-coverage-guard.test.ts:35` como registro do débito, ainda lista `items`
   (e `employees`, desde o estágio 1) como débito de auditoria — passa a estar
   defasado com este commit.
3. As 2 quebras preexistentes de `docs-path-reference-guard` (§5.4).

---

## 7. O que NÃO foi feito

- **Itens C–H de `AUD-ALOG-01`** — `itemController.removeSupplier`
  (`:203-211`, fornecedor de item, **mesmo controller que este commit tocou** e
  que **continua mudo** — ver §4), `supplierController.ts:119-127`,
  `clientController.ts:77-86`, `categoryController.ts:63-72`,
  `departmentController.ts:62-71`, `assetController.ts:78-87`. Fora de
  `APR-2026-033`; seguem a fila.
- **O parcial de `sales`** — `saleController.ts:342-360` (verbo `delete`, sem
  par `old/new`). Não autorizado; **não** tratado.
- **O 14º caso** — `InactivateProductionRouteUseCase` /
  `productionRouteController.ts:210-232` (alias `inactivate`→`status_change`,
  sem `oldValues`), descoberto por `T-37` §4. Não autorizado e ainda pendente de
  classificação de severidade.
- **`AUD-DB-04`** — permanece **MEDIUM e ABERTO**. Este caso apenas **declara** o
  contorno (§2.1). Nenhuma migration foi escrita, e a Rota 1 segue disponível
  para quando `AUD-DB-04` for tratado.
- **`create` e `update` de `items`** — continuam sem trilha; não são objeto do
  item B.
- **`AUD-DB-03`, `AUD-DB-06`, `AUD-DB-07`, `AUD-DB-08`, `FIND-ERP-002`** — nenhum
  endereçado. Em particular: mesmo com A e B remediados, a trilha continua
  **mutável** e **sem correlação**, e a credencial de runtime é superusuária.
  Ninguém deve ler o fechamento de A/B como "inativação de item agora é
  rastreável de forma inviolável".
- **Nenhum critério global fechado.** `T-37` §7.5 corrige o critério publicado de
  13 para **14** call sites; somados os dois estágios, este caso cobre **2**.
  Os outros **12 continuam abertos**. Nada aqui autoriza leitura de fechamento
  parcial.
- **Reprodução dinâmica** (`L-C004-01`) — não executada; pertence a `DYN-T03-07`
  (VeriCore), **apenas** contra `erp_evok_audio_test`. Instrução decorrente do
  contorno: para B, exercitar **as duas rotas** e buscar a linha por
  `entity_type='Item'` + `entity_description`, **nunca** por `entity_id`.
- **Nenhuma declaração de fechamento.** Sem `RETEST_PASSED`, sem
  `FINDING CLOSED`, sem `REMEDIATION_ACCEPTED`.

---

## 8. Entrega

Diff e evidências entregues ao `sanacore-remediation-evidence`. Reteste é da
VeriCore (Regra 4).

**Estado declarado: `REMEDIATION_COMPLETE` (estágio 2, item B).**
**Finding `AUD-ALOG-01` permanece `RETEST_REQUIRED`.**
