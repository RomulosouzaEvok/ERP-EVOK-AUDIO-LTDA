# TRIAGE_REPORT — `ERP-LEGACY-001-CASE-004` (`AUD-ALOG-01`, itens A e B)

```
CASE_ID:        ERP-LEGACY-001-CASE-004
FINDING_ID:     ERP-LEGACY-001-AUD-001 / AUD-ALOG-01  (CONFIRMED por T-37)
PROJECT_ID:     ERP-LEGACY-001
AUTORIZAÇÃO:    APR-2026-033  (única entrada de autorização deste caso)
ESCOPO AUTORIZADO: item A (DELETE /api/employees/:id, CRITICAL, produção real)
                   item B (PATCH /api/items/:id/inactivate + DELETE /api/items/:id,
                           HIGH, produção real), carregando OR-21
FASE:           TRIAGEM (SanaCore) — nenhuma linha de `server/`, teste, migration,
                doc de módulo ou artefato de `audit/` foi alterada
AUDIT_COMMIT:   c1311a6f76b512fef893f7e60d934179cae3409f
HEAD analisado: 112ac670a016f1081098d6b908c1102ee17c1237  (working tree limpa)
DESTINO:        sanacore-remediation-engineer, worktree/branch
                `sana/ERP-LEGACY-001/CASE-004`
REGRA 3/4:      nenhum FINDING CLOSED, nenhum RETEST_PASSED é declarado aqui
```

**Regra de dado real (`APR-2026-016`) — cumprimento declarado.** Nenhuma conexão
de banco foi aberta nesta triagem, contra nenhum banco, nem para contar linhas.
`server/scripts/apply-pending-migrations.cjs` **não** foi executado. Toda a
verificação de item 7 (fila de migrations) é estática, sobre arquivos
versionados. A reprodução é estática/estrutural (§1) e não depende de execução.

---

## 0. Método, e o que esta triagem acrescenta à evidência recebida

Cada âncora arquivo+linha citada por `AUD-ALOG-01` e por `T-37` foi **relida por
mim no HEAD atual**, não herdada. Onde a leitura própria diverge do artefato
recebido, a divergência está registrada (§7) — não corrigida no artefato alheio
(Regras 15/16).

**Fato novo desta triagem, que fecha `LIM-T37-01` no recorte que importa a este
caso:**

```
$ git diff --stat c1311a6f..HEAD -- server/src server/migrations server/tests
(vazio)
```

`server/src`, `server/migrations` e `server/tests` são **idênticos byte a byte**
entre o `AUDIT_COMMIT` e o HEAD. O diff de `server/` no período toca apenas 8
arquivos, todos em `server/scripts/` e `server/package.json` (verificadores de
control plane, seeds, limpeza). Logo **nenhuma linha citada pelo finding sofreu
drift** e a remediação parte exatamente do objeto auditado. A confirmação formal
da identidade `HEAD`×`AUDIT_COMMIT` continua sendo do
`vericore-audit-evidence-controller` — este parágrafo é insumo, não veredito.

---

## 1. Reprodução do finding (estática, determinística)

O finding é reproduzível **por construção**, sem execução, porque o caminho de
escrita da trilha é único e explícito. Reconfirmei os três elos:

1. **Caminho único de escrita.** `AuditLog.create` aparece em um só ponto do
   código — `server/src/models/AuditLog.ts:148`, dentro de `AuditLog.register`.
   O único invocador de `register` no fluxo de aplicação é
   `logAction` (`server/src/services/auditLogService.ts:122-214`).
2. **Nenhuma captura implícita.** Refiz por conta própria as buscas que
   derrubariam o finding (middleware global, hook de model, trigger de DDL,
   middleware de rota): `server/app.ts` não tem interceptor de mutação;
   `requestContext` loga `http_request` **sem `req.user`**; as triggers do
   baseline são de bloqueio de imutabilidade RH/JUR/SST e **nenhuma** cobre
   `employees` ou `items`. Resultado idêntico ao de `T-03_RETIFICACAO_01` §5 e
   `T-37` §3 — por caminho independente.
3. **Ausência de call site nos dois pontos autorizados.** Varredura própria de
   `logAction|auditLogService|AuditLog` em **todas as camadas**:
   - `server/src/modules/employees/**` → **0 ocorrências de código de auditoria**
     (os 5 hits do módulo são a palavra "auditoria" em JSDoc de outra auditoria
     de negócio — `employeeController.ts:11`, `DeactivateEmployeeUseCase.ts:4-5`,
     `employeeSensitiveFields.ts:29-30`, `UpdateEmployeeUseCase.ts:35`).
   - `server/src/modules/items/**` → **0 ocorrências**.

**Item A — cadeia completa lida no HEAD:**
`employees.ts:24` (`router.delete('/:id', authenticate, authorize('admin'), employeeController.remove)`)
→ `employeeController.ts:95-103` (`remove`, sem `logAction`)
→ `DeactivateEmployeeUseCase.ts:62-78`: bloqueia se houver `HrTerminationProcess`
aberto; **senão** grava `{ status: 'inactive', dismissal_date: new Date() }`
(`:73`) e retorna `{ message: 'Funcionário desligado com sucesso' }` (`:77`).
Resposta HTTP 200, **zero linha em `audit_logs`**. `authorize('admin')` não
audita nem a negativa (`AUD-DB-07`), então nem o 403 deixa rastro.

**Item B — cadeia completa lida no HEAD:**
`items.ts:20` (`PATCH /:id/inactivate`) **e** `items.ts:21`
(`DELETE /:id`) — **as duas rotas apontam para o mesmo handler**
`itemController.inactivate` → `itemController.ts:135-146` (sem `logAction`)
→ `DeactivateItemUseCase.ts:59-76`: `findById`, verifica 5 vínculos, grava
`{ status: 'INATIVO' }` (`:75`) e devolve o item atualizado. 200, sem trilha.
O agravo de dupla rota registrado por `T-37` §2 **confere linha a linha**.

**Reprodução dinâmica: não executada — lacuna declarada `L-C004-01`.** É
desnecessária para estabelecer a causa-raiz (a ausência é estrutural) e está
formalmente reservada a `DYN-T03-07`, da VeriCore, contra
`erp_evok_audio_test`. Registro que o alvo existe e está apto: o banco de teste
foi recriado do zero em 2026-08-16 com as 169 migrations de `main`
(`G4_PRECONDICAO_BANCO_TESTE.md` §§3-5), portanto **tem o ENUM de auditoria
completo** — o reteste dinâmico não esbarrará em vocabulário.

---

## 2. Causa-raiz e blast radius — item A (`employees`, CRITICAL)

### 2.1 ROOT_CAUSE (A)

**Não é "faltou uma linha no controller". É "o módulo `employees` nunca teve o
padrão de auditoria instalado".** O módulo tem 5 endpoints, 3 deles de escrita
(`POST`, `PUT`, `DELETE`), e **zero** chamada de `logAction` em qualquer camada.
A causa-raiz é de **omissão sistêmica com rede de proteção desligada**:

- A guarda que existiria para pegar isso —
  `server/tests/unit/audit-coverage-guard.test.ts` — tem `'employees'` na lista
  `DEBITO_CONHECIDO` (`:49-63`), isto é, **o próprio repositório declara a
  omissão como débito conhecido e a isenta do teste**.
- A guarda ainda tem duas cegueiras medidas (as mesmas de `AUD-DB-03`):
  granularidade de módulo (`:102`) e leitura **só** de
  `presentation/controllers` (`:83-84`) — auditoria em `application/use-cases`
  não é enxergada.
- O ato desligar-funcionário é o de maior exigência probatória do escopo, e a
  rota é a **legada** (`T33-A-F04`): ela grava `dismissal_date` fora do rito
  formal da `BR-RH-024` **e** não registra o desvio.

`LOCAL_FIX` isolado (uma chamada de `logAction` no `remove`) fecha o item A do
critério de reteste, mas deixa `POST`/`PUT /api/employees/:id` mudos — inclusive
o `PUT` que altera **salário** (`salary_change` existe no vocabulário e não é
usado aqui). Isso é `SYSTEMIC_FIX_REQUIRED`, declarado abaixo e **fora** do
escopo de `APR-2026-033`.

### 2.2 Padrão de referência a instalar (verificado linha a linha)

`productController.ts:192-208` (controller lê `{ before }` do use case e loga) e
`DeactivateUserUseCase.ts:46-54` (use case recebe `req` e loga). Ambos:
`action: 'soft_delete'`, `entityType`, `entityId`, `entityDescription`,
`oldValues` **e** `newValues`, `description`. Chamada **não-`await`ada**
(fire-and-forget por desenho — `auditLogService.ts:92-98`).

Ponto que o `engineer` não pode inverter: `logAction` extrai `USER`, `IP`,
`user-agent`, `route` e `method` **do `req`** (`AuditLog.ts:149-163`). Sem `req`
não há autor — e autor é exatamente o que o reteste exige (§5). Portanto o
`logAction` precisa nascer onde o `req` existe: no controller, ou no use case
com `req` injetado (padrão `DeactivateUserUseCase`).

### 2.3 Desenho recomendado para A (menor blast radius que satisfaz o critério)

O controller **já instancia o repositório** (`employeeController.ts:34`), então
o estado anterior pode ser lido no próprio controller, sem tocar no use case:

1. `const before = await employeesRepository.findById(req.params.id)` antes de
   `useCase.execute(...)` (`SequelizeEmployeesRepository.ts:42-46` — existe e
   devolve a instância).
2. Executar o use case **sem mudar sua assinatura nem seu retorno**.
3. Após sucesso, `logAction(req, { action: 'soft_delete', entityType: 'Employee',
   entityId: before.id, entityDescription: <chave humana>, oldValues: { status,
   dismissal_date }, newValues: { status: 'inactive', dismissal_date: <data> },
   description: ... })`.

**Restrição de privacidade, vinculante (`AUD-DB-08` + `BR-RH-020`):** `oldValues`
/`newValues` devem conter **apenas** `status` e `dismissal_date`. Jogar a
entidade inteira (`before.toJSON()`) despejaria salário, CPF, dados bancários,
endereço e telefone em `audit_logs.old_values` — colunas `json` livres, sem
mascaramento, sem retenção, legíveis em massa por `AUD-DB-05` e sem
imutabilidade (`FIND-ERP-002`). Isso trocaria um finding por outro pior. Pela
mesma razão, `entityDescription` deve usar chave não-sensível (matrícula/nome
funcional conforme a política do módulo), **nunca** CPF.

**Alternativa considerada e não recomendada:** mudar o retorno de
`DeactivateEmployeeUseCase` para `{ before, message }`. Custo: quebra
`server/tests/unit/rh-deactivate-employee-termination-guard.test.ts:18-19,27-28`
(assertivas sobre `result.message`) e o contrato do client
(`client/src/api/employees.ts:176` espera `{ message }`). Ganho: nenhum, para o
critério de reteste. A pré-leitura no controller custa **um `findByPk` a mais por
desligamento** — carga irrelevante nessa rota.

**Não-atomicidade declarada:** ler `before` e depois atualizar não é atômico.
Numa corrida entre dois desligamentos do mesmo funcionário, `oldValues` pode
refletir um estado já sobrescrito. Aceitável e coerente com todo o padrão
existente do repositório (`productController`, `DeactivateUserUseCase` fazem o
mesmo). Registrado para não ser descoberto no reteste como surpresa.

### 2.4 BLAST_RADIUS (A)

| Dimensão | Avaliação |
|---|---|
| Contrato HTTP | **Inalterado** — corpo, status e mensagem preservados. `client/src/api/employees.ts:176` continua válido. |
| Comportamento de negócio | **Inalterado** — o gate `HrTerminationProcess` (`:63-71`) não é tocado. |
| Banco (schema) | **Nenhuma mudança.** `Employee.id` é `INTEGER` (`Employee.ts:53`) e `audit_logs.entity_id` é `integer` — sem colisão `AUD-DB-04`. |
| Banco (dados) | Passa a existir **1 linha nova em `audit_logs` por desligamento**. Volume desprezível. |
| Vocabulário/migration | **Nenhuma dependência.** `soft_delete` é valor **legado** (`auditActions.ts:80-84`, `LEGACY_AUDIT_ACTIONS`), presente no ENUM desde antes de `20260810-000036` — não passa pelo caminho de degradação. |
| Testes existentes | **Quebra garantida de 1 teste, por desenho da catraca**: `audit-coverage-guard.test.ts:106-113` reprova módulo que audita e continua listado em `DEBITO_CONHECIDO`. Remover `'employees'` da lista `:49-63` **faz parte da correção**, não é efeito colateral. Os testes de use case (`employees-use-cases.test.ts`, `rh-deactivate-employee-termination-guard.test.ts`) **não são afetados** pelo desenho recomendado. |
| Falha de gravação | `logAction` nunca derruba a resposta; falha vai para `logs/audit-failures.log` + webhook opcional (`auditLogService.ts:58-90`). Sem risco de indisponibilidade da rota. |

**FILES_AFFECTED (A) — previsão da triagem, não instrução fechada:**

```
server/src/modules/employees/presentation/controllers/employeeController.ts   (edição)
server/tests/unit/audit-coverage-guard.test.ts                                (remover 'employees' do DEBITO_CONHECIDO)
+ teste de regressão novo (unit) provando: logAction chamado, action='soft_delete',
  old/new presentes, req repassado (autor)
```

**REGRESSION_RISK (A): BAIXO.** Única quebra é a catraca, e ela é intencional e
determinística. Sem mudança de schema, de contrato ou de regra de negócio.

---

## 3. Causa-raiz e blast radius — item B (`items`, HIGH)

### 3.1 ROOT_CAUSE (B)

Idêntica em natureza à de A — módulo `items` com **zero `logAction` em qualquer
camada**, `'items'` também isento pela lista `DEBITO_CONHECIDO`
(`audit-coverage-guard.test.ts:56`) — **mais um obstáculo técnico que A não
tem**: a representação da PK.

Agravantes específicos de B, reconfirmados:

- **Dupla porta de entrada.** `items.ts:20` e `items.ts:21` convergem no mesmo
  handler. Corrigir o call site cobre as duas; o **reteste** precisa exercitar as
  duas (`T-37` §7.4).
- **Escala real.** 327 insumos reais carregados; o incidente que originou a
  guarda de cobertura é exatamente deste módulo (`audit-coverage-guard.test.ts`
  `:5-18`: 327 criações reais → `audit_logs` com 2 linhas, os dois logins).

### 3.2 O nó: `OR-21` — PK `UUID` × `audit_logs.entity_id integer`

Cadeia de falha reconstruída por leitura (não por hipótese):

1. `Item.id` é `DataTypes.UUID` (`server/src/models/Item.ts:49-53`).
2. `audit_logs.entity_id` é `integer` — model (`AuditLog.ts:85`) e DDL
   (`00_baseline_frozen.sql:3633` região `audit_logs`, coluna `entity_id integer`).
3. `AuditLog.register` faz `entity_id: Number(data.entityId)` (`AuditLog.ts:155`).
   `Number('<uuid>')` = `NaN` → o `INSERT` não produz linha (é o modo de falha
   `22P02` mapeado em `AUD-DB-04`).
4. **A degradação do `auditLogService` não socorre este caso.**
   `isUnsupportedAuditActionError` (`auditActions.ts:343-353`) só reconhece o
   erro quando a mensagem contém `enum_audit_logs_action`. Um erro de
   `integer`/`NaN` **não** é degradado: cai no retry (`auditLogService.ts:206`),
   falha de novo e termina em `logs/audit-failures.log`. Resultado para o
   usuário: **200 e trilha inexistente no banco** — o mesmo padrão de silêncio
   que originou o incidente de 2026-08-10.
5. **A tipagem já barra o caminho errado:** `LogActionParams.entityId?: number`
   (`auditLogService.ts:24`). Passar `item.id` (string) **não compila**. Ou seja,
   qualquer tentativa ingênua de "só logar" em `items` esbarra no `tsc` antes de
   chegar ao banco — o que é bom, e obriga a decisão a ser consciente.

### 3.3 As duas rotas de `OR-21`, com trade-offs

**Rota 1 — tratar `AUD-DB-04` como dependência (resolver o recorte `Item`/UUID).**

- Escopo mínimo real: migration em `audit_logs` (coluna `entity_uuid uuid` +
  índice, ou alargamento de `entity_id` para texto), mais `AuditLog.register`,
  mais o filtro de leitura (`SequelizeAuditLogsRepository.ts:20`), mais o índice
  `audit_logs_entity_type_entity_id`, mais o contrato da API de trilha.
- Ganhos: recuperação pelo índice canônico; resolve de uma vez as demais
  entidades UUID (`ItemCategoria`, `ItemEstrutura`, `MrpOrdemPlanejada`).
- Custos e riscos: **mudança de schema em tabela transversal** usada por 85
  arquivos de call site; migration teria de ser aplicada **no banco de produção
  real** — operação humana, fora do que `APR-2026-033` autoriza e vedada a este
  agente por `APR-2026-016`; alargar `entity_id` para texto muda semântica de
  filtro para **todas** as entidades já logadas (risco de regressão em consultas
  existentes); e o objeto real da mudança é `AUD-DB-04` (MEDIUM), que tem
  ciclo de vida próprio. Consequência prática: **B, que é cabeça de fila por
  exposição real, ficaria refém de um finding MEDIUM e de uma janela de deploy
  de schema.**

**Rota 2 — contorno documentado declaradamente (precedente já existente).**

- Forma: `entityId: undefined` + identificação do item em `entityDescription`,
  exatamente como `engineeringController.ts:258-265` já faz para entidade UUID
  (e `mrpController.ts:66-72`, `catalogImportController.ts:70-80` omitindo
  `entityId`).
- Refinamento que recomendo sobre o precedente: usar o **código do item**
  (`item.codigo`, chave humana e única — `Item.ts:54-58`) em `entityDescription`
  **junto** com o UUID, e repetir o UUID dentro de `oldValues`/`newValues`, de
  modo que a linha seja recuperável por `entity_type='Item'` + texto, e o
  identificador técnico não se perca.
- Ganhos: zero mudança de schema; zero risco de `22P02`; a linha **existe, é
  atribuível (USER, IP, rota, método) e é recuperável** — que é o requisito de
  reteste; entrega B na posição de fila que o dono determinou.
- Custos: a linha **não** é recuperável pelo índice `entity_type+entity_id`
  (`entity_id` fica nulo) — exatamente o déficit que `AUD-DB-04` já descreve e
  possui. Não cria dívida nova: **reproduz a dívida existente, declaradamente**,
  e a superfície de conversão futura fica trivial (um `UPDATE` de backfill por
  `entity_description` quando `AUD-DB-04` for remediado).

### 3.4 RECOMENDAÇÃO (decisão de execução, registrada conforme `APR-2026-033` §2)

**Adotar a Rota 2 — contorno documentado declaradamente.** Fundamento, na ordem
em que pesou:

1. O critério de fechamento de `AUD-ALOG-01` é **autoria e origem do evento**
   (§5), não a recuperabilidade pelo índice numérico. A Rota 2 satisfaz o
   critério integralmente; a Rota 1 acrescenta uma propriedade que o finding não
   pede e que pertence a outro finding.
2. Misturar os dois vira remediação promíscua: o reteste de B passaria a
   depender de um `RETEST` de schema que é de `AUD-DB-04`, e o fechamento de um
   pressuporia o do outro — precisamente o que `T-37` §6 evitou ao manter os
   findings autônomos.
3. A Rota 1 exige migration em produção real, que **não** está em
   `APR-2026-033` e que este programa trata como gate humano.
4. A prioridade fixada pelo dono é **exposição real**; a Rota 1 atrasa B por um
   MEDIUM.

**Condições vinculantes da recomendação** (sem elas o contorno vira dívida
oculta, que é o vício que este run inteiro combate):

- Comentário no código do call site, nomeando `AUD-DB-04` e `OR-21`, explicando
  por que `entityId` é `undefined` — não um `undefined` órfão.
- Registro neste caso e no `REMEDIATION_RESPONSE` de que a linha de `Item` **não
  é recuperável pelo índice `entity_type+entity_id`** enquanto `AUD-DB-04` não
  for remediado.
- O reteste de B deve verificar recuperabilidade **por `entity_type='Item'` +
  `entity_description`**, e não por `entity_id`.
- Se o dono/VeriCore preferir a Rota 1, **B deve ser suspenso** e reagendado
  atrás de `AUD-DB-04` — não remediado "pela metade". Esta triagem não decide
  por eles; recomenda e deixa a inversão explícita e barata.

### 3.5 Desenho recomendado para B

Mesmo princípio de A, com uma diferença: `DeactivateItemUseCase` **já lê o item
antes** (`:60`), mas devolve só o item atualizado (`:75`). Duas opções:

- **(i) pré-leitura no controller** (`itemRepository.findById(req.params.id)`
  antes do `execute`) — não toca o use case, não toca
  `server/tests/unit/deactivate-item-http-409.test.ts:99-105` (que compara o
  retorno com `objectContaining` sobre as props do item), preserva
  `client/src/api/items.ts:152` (espera `Item` no `data`). Custo: uma leitura
  extra.
- **(ii) use case devolver `{ before, item }`** — evita a leitura extra, mas
  muda o retorno e obriga o controller a manter `data: item` para não quebrar o
  client, **e** ajusta o teste `:99-105`.

Recomendo **(i)**, por simetria com A e por blast radius menor. Em qualquer das
duas, `logAction` fica no controller (onde há `req`), depois do sucesso,
com `action: 'soft_delete'`, `oldValues: { status: before.status }`,
`newValues: { status: 'INATIVO' }`.

### 3.6 BLAST_RADIUS (B)

| Dimensão | Avaliação |
|---|---|
| Contrato HTTP | **Inalterado** nas duas rotas (`PATCH` e `DELETE`). |
| Regra de negócio | **Inalterada** — a verificação dos 5 vínculos (`:84-130`) e o 409 não são tocados. |
| Schema | **Nenhuma mudança** na Rota 2 recomendada. Na Rota 1 seria mudança em `audit_logs` (transversal). |
| Vocabulário | `soft_delete` é legado — sem dependência de migration. |
| Testes | Mesma catraca de A: remover `'items'` de `DEBITO_CONHECIDO` (`:56`) passa a ser obrigatório. `deactivate-item-http-409.test.ts` intacto no desenho (i). |
| Cobertura colateral | **Atenção:** ao chamar `logAction` em `itemController`, o módulo `items` deixa de ser "débito" para a guarda **inteira**, embora `itemController.ts:203-211` (item **C**, fora de escopo) continue mudo. A guarda tem granularidade de módulo (`:102`) — ela **não** cobrirá C. Isso deve ser dito no `REMEDIATION_RESPONSE` para que ninguém leia "guarda verde" como "módulo `items` auditado". |

**FILES_AFFECTED (B) — previsão:**

```
server/src/modules/items/presentation/controllers/itemController.ts        (edição)
server/tests/unit/audit-coverage-guard.test.ts                             (remover 'items')
+ teste de regressão novo (unit): logAction chamado nas duas rotas, action,
  old/new, autor, e contorno de UUID explicitado
```

**REGRESSION_RISK (B): BAIXO-MÉDIO.** Baixo no código (nenhuma mudança de
contrato/regra). O médio vem da armadilha do UUID: se o `engineer` "resolver"
passar `item.id` como `entityId`, o `tsc` barra; se contornar a tipagem
(`as any`, ou chamando `AuditLog.register` direto, que aceita `string`), o
resultado é **200 com trilha inexistente** — pior que o estado atual, porque
pareceria remediado. Esta é a única armadilha real de B e está aqui nomeada.

---

## 4. Plano em estágios

### Estágio 1 — item A (`employees`), sem dependência

1. Worktree/branch `sana/ERP-LEGACY-001/CASE-004` (Regra 11).
2. `employeeController.remove`: pré-leitura + `logAction` no padrão
   `productController.ts:197-205`, com `oldValues`/`newValues` **restritos a
   `status` e `dismissal_date`** (§2.3).
3. Remover `'employees'` de `DEBITO_CONHECIDO`
   (`audit-coverage-guard.test.ts:49-63`).
4. Teste de regressão novo, sem banco: mock de `auditLogService.logAction`,
   asserção de `action: 'soft_delete'`, par old/new completo, e **de que o `req`
   foi repassado** (é o que garante autor/origem).
5. `REMEDIATION_RESPONSE` + `REMEDIATION_COMMIT` declarados; entrega à VeriCore.
   **SanaCore não fecha** (Regra 3).

Gate de saída do estágio 1: typecheck + suíte unitária verdes; nenhuma alteração
em `server/migrations/`; nenhuma conexão de banco.

### Estágio 2 — item B (`items`), após decisão de `OR-21`

0. **Gate de decisão `OR-21`** registrado antes de escrever código: Rota 2
   (recomendada, §3.4) ou Rota 1 (suspende B). Se Rota 1, o estágio 2 **não
   começa** e o caso vai a `PENDING_HUMAN_DECISION`.
1. Pré-leitura no controller + `logAction` com `entityId: undefined`, item
   identificado em `entityDescription`, comentário citando `AUD-DB-04`/`OR-21`.
2. Remover `'items'` de `DEBITO_CONHECIDO`.
3. Teste de regressão novo cobrindo **as duas rotas** (`PATCH .../inactivate` e
   `DELETE /api/items/:id`) — ainda que convirjam no mesmo handler, a prova deve
   ser por entrada, conforme `T-37` §7.4.
4. `REMEDIATION_RESPONSE` declarando o contorno **explicitamente**, com a
   limitação de recuperabilidade escrita por extenso.

Nenhum dos dois estágios altera `audit/`, `docs/` de módulo, migrations ou
schema.

---

## 5. Requisito de reteste que este plano deve satisfazer

Transcrito do finding (§7) e de `T-37` (§7), para o `engineer` não ter de
inferir:

- **Estático:** `logAction` presente no call site, com `action: 'soft_delete'` e
  par `oldValues`/`newValues` — nos dois itens.
- **Autoria (o que fecha ou não fecha):** o registro deve identificar **`USER` e
  origem**. Um `logAction` que grave a ação **sem o autor não fecha o finding**.
  Tradução técnica verificada nesta triagem: o `req` precisa chegar a
  `AuditLog.register`, que dele extrai `user_id`, `user_name`, `user_ip`,
  `user_agent`, `route`, `method` (`AuditLog.ts:149-163`). Chamar `logAction`
  sem `req`, ou com um `req` sintético sem `user`, produz linha anônima —
  reprovação.
- **Dinâmico (`DYN-T03-07`, VeriCore, fila G4):** apenas contra
  `erp_evok_audio_test`. Para B, exercitar **as duas rotas**. Para B, a busca da
  linha deve ser por `entity_type='Item'` + `entity_description` (consequência
  declarada da Rota 2).
- **Emenda numérica pendente (não é deste caso resolver):** `T-37` §7.5 corrige
  o critério publicado de 13 para **14** call sites. Este caso cobre **2** deles;
  os outros 12 continuam abertos e o critério global só fecha quando todos
  forem tratados. Nada aqui autoriza leitura de fechamento parcial.

---

## 6. Verificações pedidas explicitamente no despacho

### 6.1 Item 6 — divergência sinalizada sobre README do módulo `employees`

**Verificado. A premissa do despacho não se confirma, e o achado real é outro.**

- **Não existe README no módulo `employees`.**
  `server/src/modules/employees/` contém apenas `application/`, `domain/`,
  `infrastructure/`, `presentation/`. Busca por `*.md` no módulo: nenhum
  arquivo. Busca por `README.md` em todo o repositório contendo a palavra
  `employees`: **nenhum**.
- Portanto o parêntese de `T-37` §2, item A — *"varredura própria, código;
  único hit é README"* — **não tem lastro para `employees`**. A descrição cabe
  aos módulos **`suppliers`** (`README.md:146`) e **`clients`**
  (`README.md:165`), onde a ausência de `logAction` está de fato documentada
  como escolha, e que `T-37` cita corretamente nos itens D e E. Registro como
  **imprecisão de redação, sem efeito sobre o veredito**: o fato material —
  zero `logAction` em qualquer camada de `employees` — foi por mim reproduzido
  de forma independente e **está confirmado** (§1). Nenhum artefato de VeriCore
  foi alterado (Regras 15/16); cabe ao autor de origem decidir se emenda.

**Deriva documental de fato encontrada (esta sim), registrada como observação
para OpusCore — `OBS-C004-01`:**

| Local | Texto | Realidade no HEAD |
|---|---|---|
| `docs/arquitetura/API.md:3888-3890` | `logAction` é *"chamado pelos controllers/use cases de escrita da **maioria dos módulos** (ver nota de exceção em `/api/suppliers`, seção 12, que **não** gera auditoria)"* | A única exceção declarada é `suppliers`. **`employees` e `items` são exceções não declaradas** — e são as duas em produção real. Um leitor da doc conclui que `DELETE /api/employees/:id` audita. |
| `docs/arquitetura/API.md:3805-3808` | Tabela de endpoints de `/api/employees`, incluindo `DELETE … Desliga (soft delete, role admin)` | Nenhuma marca de "não audita", ao contrário do tratamento dado a `suppliers` em `:2973-2975`. |
| `docs/business/BLOCO_6_RH_API.md:194-195` | *"**Auditoria:** toda escrita deste módulo chama `AuditLog.logAction`"* | **Verdadeiro para `modules/rh`** (9 controllers com `logAction`, conferido). Mas o mesmo documento especifica alterações **dentro do módulo `employees`** (`:357`, `:1214`, `:1361-1362`), que **não** auditam. A frase é correta no seu escopo e **enganosa na leitura de bloco** — risco de induzir a crer que `PUT`/`DELETE /api/employees/:id` auditam. |

`docs/` de módulo e de arquitetura é **OpusCore** — nada corrigido aqui, por
desenho. Observação endereçada ao `coretriad-director` para roteamento (parente
de `AUD-PROC-DOCDRIFT-01`). Nota colateral: quando A e B forem remediados, a
frase de `API.md:3889-3890` fica **mais** errada, porque a lista de exceções
muda — a atualização da doc deveria acompanhar o commit de remediação, por
OpusCore.

### 6.2 Item 7 — estado da fila de migrations que toquem `audit_logs`

**Verificado estaticamente. `apply-pending-migrations.cjs` NÃO foi executado.
Nenhuma conexão de banco foi aberta.**

- Migrations que mencionam `audit_logs`/`AuditLog`/`entity_id` em
  `server/migrations/`: 7 arquivos. Destes, apenas **2 alteram `audit_logs`**:
  - `20260731-000009-align-audit-log-optional-columns.cjs` — torna colunas
    opcionais nuláveis (inclui `entity_id`).
  - `20260810-000036-extend-audit-log-action-enum.cjs` — 9 valores novos no
    ENUM.
  Os outros 5 apenas citam `audit_logs` em comentário
  (`20260811-000044`, `20260812-000046`, `20260806-000134`, `20260806-000042`,
  `20260806-000041`) — verificado arquivo a arquivo: **nenhum DDL sobre
  `audit_logs`**.
- **Nenhuma migration posterior a `20260810-000036` toca `audit_logs`.** A
  última do repositório é `20260812-000047-hr-absences-open-unique.cjs` (169
  arquivos no total).
- **Mecanismo de congelamento, verificado (refina o item acima).** Banco novo
  não executa as migrations antigas uma a uma: `20260731-000001-baseline-schema.cjs`
  carrega o DDL estático de `00_baseline_frozen.sql` e depois **marca 160
  migrations como aplicadas** a partir do bloco `COPY` de
  `00_baseline_frozen_meta.sql`. **As duas migrations de `audit_logs` estão
  dentro desse conjunto congelado** — `20260731-000009` (`meta:34`) e
  `20260810-000036` (`meta:184`). Consequência prática, e é a que importa ao
  reteste: em qualquer banco construído do zero (incluindo
  `erp_evok_audio_test`, recriado em 2026-08-16), o ENUM de 24 valores e as
  colunas nuláveis vêm **do dump congelado, por construção**, sem depender de a
  migration `20260810-000036` ter rodado alguma vez. E `entity_id integer` vem
  do mesmo dump — ou seja, **o congelamento também fixa o obstáculo do UUID**.
- **Efeito sobre a rota do UUID: nenhuma migration pendente muda o quadro.**
  `audit_logs.entity_id` continua `integer` no baseline
  (`00_baseline_frozen.sql`, bloco `CREATE TABLE public.audit_logs`) e no model
  (`AuditLog.ts:85`). Não há nada na fila que resolva `AUD-DB-04` — logo a Rota
  1 exigiria migration **nova**, escrita do zero, e não o mero aproveitamento de
  algo já pendente. Isso reforça a recomendação da Rota 2.
- **Sobre o vocabulário:** irrelevante para este caso, porque `soft_delete` é
  valor **legado** (`auditActions.ts:80-84`) e existe no ENUM desde antes de
  `20260810-000036`. Ainda assim, registro para o reteste: o banco de teste foi
  recriado em 2026-08-16 com as 169 migrations aplicadas
  (`G4_PRECONDICAO_BANCO_TESTE.md` §§4-5) e o ENUM completo chega pelo baseline
  congelado (bullet anterior), portanto **`erp_evok_audio_test` tem o
  vocabulário completo por dois caminhos independentes**.
- **Estado do banco de produção real: NÃO VERIFICADO e NÃO VERIFICÁVEL nesta
  fase** (`APR-2026-016`). Existe contradição documental conhecida sobre isso —
  `AUD-DB-10` (LOW) registra que `auditActions.ts:48-55` e o cabeçalho da
  migration dizem "pendente" enquanto `DATABASE.md` diz numa linha "aplicada em
  2026-08-10" e noutra "continua com 15 valores". **Não resolvo essa
  contradição** (Regra 21: fonte autoritativa seria o próprio banco, e não posso
  consultá-lo). **Não afeta este caso**, pela razão do bullet anterior: o verbo
  usado é legado. Registro para que ninguém use este caso como prova indireta do
  estado da produção.

---

## 7. Divergências e observações registradas (Regra 7 — artefato vence despacho)

| # | Divergência | Tratamento |
|---|---|---|
| D-01 | Despacho supõe menção a auditoria no **README do módulo `employees`**; o módulo **não tem README** e nenhum README do repositório cita `employees`. | Registrado em §6.1. A premissa vinha do parêntese de `T-37` §2/A, que é impreciso. **Nada corrigido em `audit/`.** Sem efeito sobre o mérito. |
| D-02 | Despacho cita o padrão de referência como `productController.ts:197-205` — confere. `DeactivateUserUseCase.ts:46-54` — confere. | Sem divergência. |
| D-03 | Finding cita `itemController.ts:135-146` e `employeeController.ts:94-103` — conferem no HEAD. `T-37` cita `Item.ts:50-52` (UUID) e `Employee.ts:53` (INTEGER) — conferem. | Sem divergência. |
| D-04 | Casos anteriores usam o nome `TRIAGE.md` (`CASE-001`, `CASE-002`); o despacho pede `TRIAGE_REPORT.md`. | Seguido o despacho (nome do arquivo não é matéria normativa). Registrado para o director padronizar se quiser. |
| D-05 | A guarda `audit-coverage-guard.test.ts` **reprovará** se `employees`/`items` auditarem e permanecerem em `DEBITO_CONHECIDO`. Nenhum artefato de auditoria menciona essa co-mudança obrigatória. | Incorporado ao plano (§4). É a única quebra de teste prevista. |
| D-06 | `AUD-DB-08` (dado pessoal verbatim em `new_values`) colide com a remediação de A se o payload for a entidade inteira. Nenhum artefato do finding alerta para isso. | Convertido em **restrição vinculante** de desenho (§2.3). |
| D-07 | Deriva documental em `API.md` e `BLOCO_6_RH_API.md` (`OBS-C004-01`). | Registrado, **não corrigido** — `docs/` é OpusCore. Roteamento ao director. |

---

## 8. O que este plano NÃO cobre (explícito, por exigência do despacho)

1. **Itens C-H de `AUD-ALOG-01`** — `itemController.ts:203-211` (fornecedor de
   item), `supplierController.ts:119-127`, `clientController.ts:77-86`,
   `categoryController.ts:63-72`, `departmentController.ts:62-71`,
   `assetController.ts:78-87`. Fora de `APR-2026-033`; seguem a fila. **Aviso
   operacional:** ao remediar B, a guarda de cobertura deixará de sinalizar o
   módulo `items`, mas **C continuará mudo** (§3.6).
2. **O parcial de `sales`** — `saleController.ts:342-360` (verbo `delete`, sem
   old/new). Não autorizado.
3. **O 14º caso** — `InactivateProductionRouteUseCase` /
   `productionRouteController.ts:210-232` (alias `inactivate`→`status_change`,
   sem `oldValues`), descoberto por `T-37` §4. Não autorizado; ainda pendente de
   classificação de severidade pelo consolidador/director.
4. **Qualquer mudança de schema além do exigido pela decisão de `OR-21`** — e,
   na Rota 2 recomendada, **não há mudança de schema nenhuma**. Nenhuma
   migration é criada, alterada ou aplicada por este caso.
5. **`AUD-DB-04`** (representação de PK UUID em `audit_logs`) — permanece aberto
   e intocado; este caso apenas **declara** o contorno.
6. **`AUD-DB-03`**, **`AUD-DB-06`** (`CORRELATION_ID`), **`AUD-DB-07`**,
   **`AUD-DB-08`**, **`FIND-ERP-002`** (imutabilidade da trilha) — nenhum é
   endereçado. Em particular: mesmo com A e B remediados, a trilha continua
   **mutável** e **sem correlação**, e a credencial de runtime é superusuária
   (`T-03_AUDIT_LOG_REPORT.md` §2). Ninguém deve ler o fechamento de A/B como
   "desligamento agora é rastreável de forma inviolável".
7. **`RES-T03-05`** — desativação por `update` genérico (ex.: `PUT
   /api/employees/:id` gravando `status`) **não foi enumerada** e permanece
   declarada como não coberta. O plano cobre a rota `DELETE`, não toda via de
   inativação de funcionário.
8. **`T33-A-F04`** — a rota legada de desligamento continuar fora do rito formal
   da `BR-RH-024` é finding de processo, independente e cumulativo. Logar o ato
   **não** o traz para o rito.
9. **Emenda 13→14 do critério de reteste** — matéria do consolidador (`T-37`
   §7.5). Este caso não a executa.
10. **Fechamento de finding, `RETEST_PASSED`, ou qualquer juízo sobre
    suficiência da correção** — autoridade exclusiva da VeriCore (Regras 3 e 4).

---

## 9. Critério de conclusão da triagem — autoavaliação

| Exigência | Estado |
|---|---|
| Causa-raiz demonstrada (não hipótese) | **Sim** — cadeia rota→controller→use case→repositório lida integralmente nos dois itens; caminho único de escrita da trilha provado estruturalmente; ausência de controle compensatório reproduzida por caminho próprio. |
| Blast radius mapeado | **Sim** — §2.4 e §3.6, com `FILES_AFFECTED` e a quebra de teste prevista nomeada. |
| Plano com risco de regressão avaliado | **Sim** — A: BAIXO; B: BAIXO-MÉDIO, com a armadilha do UUID nomeada. |
| Decisão de `OR-21` avaliada nas duas rotas e recomendada | **Sim** — §3.3/§3.4, Rota 2, com condições e com a inversão explicitada. |
| Estado da fila de migrations verificado estaticamente | **Sim** — §6.2, sem executar nada. |
| `APR-2026-016` respeitada | **Sim** — nenhuma conexão de banco, nenhum script de diagnóstico executado. |
| Nada escrito fora de `remediation/cases/ERP-LEGACY-001-CASE-004/` | **Sim.** |

**Lacunas declaradas:** `L-C004-01` (reprodução dinâmica não executada — pertence
a `DYN-T03-07`, VeriCore); estado do ENUM no banco de produção real não
verificável nesta fase e irrelevante para este caso (§6.2).

**PRÓXIMO ELO:** `sanacore-remediation-engineer`, worktree
`sana/ERP-LEGACY-001/CASE-004`, começando pelo **Estágio 1 (item A)**. O
**Estágio 2 (item B)** só começa depois de a decisão `OR-21` estar registrada.
