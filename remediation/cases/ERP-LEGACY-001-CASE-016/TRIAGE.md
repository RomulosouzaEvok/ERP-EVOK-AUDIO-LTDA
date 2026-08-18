# Triage — `ERP-LEGACY-001-CASE-016`

```
CASE_ID:        ERP-LEGACY-001-CASE-016
FINDING_ID:     ERP-LEGACY-001-AUD-001 / AUD-DB-03 (HIGH) e sua caracterização
                em AUD-ALOG-01 (itens C-H e remanescente)
AUDIT_COMMIT:   c1311a6f76b512fef893f7e60d934179cae3409f (2026-08-14, 14:00 UTC)
TRIAGE_DATE:    2026-08-18 (versão original)
RETIFICADO_EM:  2026-08-18 (esta versão)
HEAD verificado: baab7df (branch `main`) — árvore principal, working tree com
                 apenas `remediation/cases/ERP-LEGACY-001-CASE-016/` untracked
STATUS:         TRIAGE — RETIFICADO
TRIAGE_AGENT:   sanacore-remediation-triage
REGRA 3/4:      nenhum FINDING CLOSED, nenhum RETEST_PASSED é declarado aqui
```

**Regra de dado real (`APR-2026-016`) — cumprimento declarado.** Nenhuma conexão
de banco foi aberta nesta triagem nem nesta retificação, em nenhum momento e
por nenhum motivo. Toda verificação é estática sobre arquivos versionados
(`Read`, `Grep`, `git show`, `git merge-base`).

---

## 0. RETIFICAÇÃO — 2026-08-18

Esta triagem foi emitida com **erros factuais**, identificados por verificação
independente contra a árvore real de `main`. O histórico do erro é preservado
deliberadamente (exigência de rastreabilidade; não apagar, registrar).

### 0.1 Os erros corrigidos

| # | Afirmação errada da versão original | Fato verificado | Causa do erro |
|---|---|---|---|
| **1** (grave) | "`employees` e `items` saíram de `DEBITO_CONHECIDO` no commit `a44f25b` (2026-08-17)"; escopo de **11 módulos** | `DEBITO_CONHECIDO` em `main` tem **13 entradas**, e `employees` e `items` **estão** nela (`server/tests/unit/audit-coverage-guard.test.ts:49-63`). A remediação do `CASE-004` existe apenas na branch `sana/ERP-LEGACY-001/CASE-004` (HEAD `2c10a80`), **não mesclada** | **Leitura de worktree/branch não mesclada reportada como se fosse `main`.** É a mesma armadilha já registrada no `CASE-002` §0.1 ("leitura do `coretriad/` defasado do worktree") |
| **2** (grave) | "`users` e `accessProfiles`: **0** `logAction`"; pergunta D1 formulada como "o controller também deve emitir (redundância)?" | `users` tem `logAction` em **5** arquivos e `accessProfiles` em **3**, todos em `application/use-cases` (evidência em §2.3). Os dois constam do débito por **cegueira de camada da própria guarda** | **Inversão do sentido da fragilidade (b) do finding.** O finding diz "a guarda é cega"; a triagem leu "o módulo não audita". Texto original em `T-03_AUDIT_LOG_REPORT.md:53-57` |
| **3** (menor) | contagem de `logAction` em `clients`/`suppliers` sem restringir a `.ts` | As únicas ocorrências estão em `clients/README.md:165,199` e `suppliers/README.md:146,180`, e o texto diz literalmente "**Nenhum endpoint deste módulo chama `logAction`**". São documentação | **Contagem incluindo README.** Varredura sem `--include=*.ts` |

### 0.2 Dois erros adicionais encontrados nesta retificação

Não estavam na lista recebida; encontrados ao reverificar tudo, e corrigidos:

| # | Afirmação errada | Fato verificado |
|---|---|---|
| **4** | §3.1 original: "Nenhum dos 11 módulos está marcado como PRODUÇÃO REAL" | **Falso.** `PRODUCTION_STATUS_MAP.md:127-130` marca `items`, `categories`, `departments` e `users` (parcial — só a conta admin) como **PRODUÇÃO REAL confirmada por decisão humana (`APR-2026-016`)**. Isso muda a severidade e a prioridade — ver §3.1 |
| **5** | §3.2 original: `categories` → Model `ItemCategory`, PK INTEGER | Nome do model errado. O módulo `categories` usa `Category` (`SequelizeCategoriesRepository.ts:8`), PK **INTEGER** (`server/src/models/Category.ts`). `ItemCategoria` (PK **UUID**, `ItemCategoria.ts:21-23`) é outro model, do domínio de `items`, e é ele que aparece em `AUD-DB-04`. A conclusão "sem contorno UUID" continua correta para `categories`, mas por um motivo que a versão original não tinha verificado |

### 0.3 O que da versão original permanece válido

Preservado sem alteração de mérito: o padrão de referência (`products`,
`bom`), a restrição de privacidade `AUD-DB-08`/`BR-RH-020` (§4.3), a exclusão
de `OR-21`/`AUD-DB-04` do escopo, a proibição de banco real, e a estrutura do
critério de reteste. O faseamento e o escopo foram **recalculados** (§4.4).

### 0.4 Regra de método que este erro fixa

Toda triagem deste programa declara o **HEAD e a branch** de onde leu, e antes
de afirmar que uma remediação "já ocorreu" verifica com
`git merge-base --is-ancestor <branch> main`. Estado em worktree de remediação
**não é** estado do produto.

---

## 1. Escopo real: 13 módulos

O finding `AUD-DB-03` (HIGH, T-03) e sua caracterização em `AUD-ALOG-01`
abrangem os **13 módulos** listados em `DEBITO_CONHECIDO`
(`server/tests/unit/audit-coverage-guard.test.ts:49-63`), verbatim da árvore
principal:

```
accessProfiles, assets, categories, clients, departments, employees, items,
mobileInventory, nonConformities, serviceOrders, suppliers, users, webhooks
```

Todos os 13 têm rota de escrita e nenhum tem `logAction` em
`presentation/controllers`. Mas os 13 **não são o mesmo problema**, e tratá-los
como um bloco uniforme foi o erro estrutural da versão original. Eles se
separam em três classes:

- **Classe I — a guarda está cega, o módulo já audita (2 módulos):**
  `users`, `accessProfiles`. Não precisam de código de produção novo. §2.3.
- **Classe II — remediação já existe, em branch não mesclada (2 módulos):**
  `employees`, `items`. Não devem ser reimplementados aqui. §2.4.
- **Classe III — mudos, sem remediação em lugar algum (9 módulos):**
  `assets`, `categories`, `clients`, `departments`, `mobileInventory`,
  `nonConformities`, `serviceOrders`, `suppliers`, `webhooks`. §2.5.
  Destes, `categories` e `departments` já têm despacho aberto no `CASE-014`.

---

## 2. Causa-raiz confirmada (arquivo:linha, árvore `main` @ `baab7df`)

### 2.1 Tabela módulo por módulo — os 13

Colunas: **W** = arquivos de rotas com `router.post|put|patch|delete` /
nº de rotas de escrita · **C** = `logAction` em `presentation/controllers`
(`--include=*.ts`) · **A** = `logAction` em `application/` (`--include=*.ts`) ·
**D** = está em `DEBITO_CONHECIDO` · **Rem.** = remediação em branch não
mesclada · **Código novo neste caso?**

| # | Módulo | W | C | A | D | Rem. em branch não mesclada | Código novo aqui? | Classe |
|---|---|---|---|---|---|---|---|---|
| 1 | `users` | 1 / 5 | 0 | **5** | sim | — | **NÃO** (só a guarda, se D1=(i)) | I |
| 2 | `accessProfiles` | 1 / 3 | 0 | **3** | sim | — | **NÃO** (só a guarda, se D1=(i)) | I |
| 3 | `employees` | 1 / 3 | 0 | 0 | sim | `sana/…/CASE-004` (`2c10a80`), item A | **NÃO** — não reimplementar | II |
| 4 | `items` | 1 / 8 | 0 | 0 | sim | `sana/…/CASE-004` item B; **e** `CASE-014` item C (branch ainda não criada) | **NÃO** — não reimplementar | II |
| 5 | `categories` | 1 / 3 | 0 | 0 | sim | `CASE-014` item F (despacho pronto, branch não criada) | **NÃO** se `CASE-014` executar; ver §4.2 | III |
| 6 | `departments` | 1 / 3 | 0 | 0 | sim | `CASE-014` item G (idem) | **NÃO** se `CASE-014` executar; ver §4.2 | III |
| 7 | `clients` | 1 / 3 | 0 | 0 | sim | — | **SIM** | III |
| 8 | `suppliers` | 1 / 3 | 0 | 0 | sim | — | **SIM** | III |
| 9 | `assets` | 1 / 4 | 0 | 0 | sim | — | **SIM** | III |
| 10 | `nonConformities` | 1 / 3 | 0 | 0 | sim | — | **SIM** | III |
| 11 | `serviceOrders` | 1 / 3 | 0 | 0 | sim | — | **SIM** | III |
| 12 | `mobileInventory` | 1 / 2 | 0 | 0 | sim | — | **SIM** (exceção arquitetural, §2.6) | III |
| 13 | `webhooks` | 1 / 2 | 0 | 0 | sim | — | **SIM** (exceção arquitetural, §2.6) | III |

**Comando de verificação (estático, sem banco), por módulo:**
`grep -rl "logAction" server/src/modules/<M>/presentation/controllers --include=*.ts`
e o mesmo para `…/<M>/application`. A restrição `--include=*.ts` é obrigatória
— foi a sua ausência que produziu o ERRO 3.

### 2.2 Rotas de escrita por módulo (verbatim dos arquivos de rota)

| Módulo | Rotas de escrita |
|---|---|
| `accessProfiles` | `POST /`, `PUT /:id`, `DELETE /:id` |
| `assets` | `POST /`, `PUT /:id`, `DELETE /:id`, `POST /:id/photo` |
| `categories` | `POST /`, `PUT /:id`, `DELETE /:id` |
| `clients` | `POST /`, `PUT /:id`, `DELETE /:id` |
| `departments` | `POST /`, `PUT /:id`, `DELETE /:id` |
| `employees` | `POST /`, `PUT /:id`, `DELETE /:id` |
| `items` | 8 rotas de escrita (inclui `PATCH /:id/inactivate` e vínculo de fornecedor) |
| `mobileInventory` | `POST /scan`, `POST /batch` |
| `nonConformities` | `POST /`, `PUT /:id`, `DELETE /:id` |
| `serviceOrders` | `POST /`, `PUT /:id`, `DELETE /:id` |
| `suppliers` | `POST /`, `PUT /:id`, `DELETE /:id` |
| `users` | 5 rotas de escrita |
| `webhooks` | `POST /n8n`, `POST /focus-nfe` |

### 2.3 Classe I — `users` e `accessProfiles` JÁ auditam (correção do ERRO 2)

Call sites reais de `logAction`, verificados linha a linha:

**`users` — 5 arquivos, todos em `application/use-cases/`:**
- `CreateUserUseCase.ts:62`
- `UpdateUserUseCase.ts:73`
- `DeactivateUserUseCase.ts:46`
- `AssignAccessProfileUseCase.ts:71`
- `RevokeUserSessionsUseCase.ts:36`

**`accessProfiles` — 3 arquivos, todos em `application/use-cases/`:**
- `CreateAccessProfileUseCase.ts:65`
- `UpdateAccessProfileUseCase.ts:78`
- `DeactivateAccessProfileUseCase.ts:61`

Em `presentation/controllers` dos dois módulos: **zero** ocorrências. Portanto
a guarda os reprova — e é a guarda que está errada, não o módulo.

**A causa é a guarda, e o finding original já dizia isso.**
`temAuditoria` (`audit-coverage-guard.test.ts:82-85`) lê **somente**
`presentation/controllers`:

```typescript
function temAuditoria(mod: string): boolean {
  const controllers = lerArquivosTs(path.join(MODULES_DIR, mod, 'presentation', 'controllers'));
  return controllers.some((f) => fs.readFileSync(f, 'utf8').includes('logAction'));
}
```

Texto do finding, `T-03_AUDIT_LOG_REPORT.md:53-57`, verbatim:

> Duas fragilidades medidas da guarda: (a) granularidade de módulo — um
> `logAction` em um controller cobre o módulo inteiro (`:82-85`); (b)
> **cegueira de camada — só lê `presentation/controllers` (`:83`), por isso
> `users`/`accessProfiles`, que auditam em `application/use-cases`, seguem
> listados como débito.**

`users` e `accessProfiles` **não precisam de `logAction` novo**. A questão que
resta é de correção da guarda, não de correção de módulo — ver D1 em §5.

### 2.4 Classe II — `employees` e `items` (correção do ERRO 1)

Estado verificado em `main` @ `baab7df`: ambos **em** `DEBITO_CONHECIDO`
(`audit-coverage-guard.test.ts:55,56`), ambos com **0** `logAction` em
qualquer camada.

A remediação existe, mas fora de `main`:

```
$ git merge-base --is-ancestor sana/ERP-LEGACY-001/CASE-004 main
NOT MERGED
$ git worktree list
… C:/Sistema EvokAudio/ERP-Evok-sana-CASE-004   2c10a80 [sana/ERP-LEGACY-001/CASE-004]
```

Na branch do `CASE-004`, `git show sana/ERP-LEGACY-001/CASE-004:server/tests/unit/audit-coverage-guard.test.ts`
mostra as duas entradas já comentadas como removidas, com referência a
`APR-2026-033` (item A) e `APR-2026-033` + `APR-2026-034` D1 (item B).

Corroboração documental independente:
`coretriad/states/ERP-LEGACY-001/HANDOFF_PROXIMA_FASE.md` §5 lista
`sana/ERP-LEGACY-001/CASE-004` (`2c10a80`) como `REMEDIATION_COMPLETE`
aguardando reteste, entre as branches **não mescladas**, e declara:

> quem lê apenas a árvore principal **não vê** a evidência de remediação do
> `CASE-004`. Isso não é defeito — é a segregação funcionando —, mas exige que
> o reteste seja feito a partir da branch.

Foi exatamente essa frase que a versão original desta triagem contrariou.

`items` é tocado por um segundo caso: `CASE-014` item C
(`itemController.removeSupplier`), cujo despacho está pronto em
`remediation/cases/ERP-LEGACY-001-CASE-014/` mas cuja branch
`sana/ERP-LEGACY-001/CASE-014` **ainda não existe** (`git branch -a --list
"*CASE-014*"` retorna vazio).

**Consequência para este caso:** `CASE-016` **não implementa** `employees` nem
`items`, e **não remove** suas entradas de `DEBITO_CONHECIDO`. Ver a regra de
coordenação de merge em §4.2.

### 2.5 Classe III — os 9 mudos de verdade

Nenhum `logAction`, em nenhuma camada, em nenhum arquivo `.ts`. Confirmado com
varredura restrita a `--include=*.ts` sobre a árvore inteira de cada módulo.

**`clients` e `suppliers` (correção do ERRO 3):** as únicas ocorrências da
string em todo o módulo estão nos README, e são a **negação** da existência
do código:

- `server/src/modules/clients/README.md:165` — "**Nenhum endpoint deste módulo
  chama `logAction`** — o controller anterior…"; `:199` — "recomenda-se avaliar
  a adição de `logAction` em uma iteração futura"
- `server/src/modules/suppliers/README.md:146` — mesma frase; `:180` — idem

Os dois estão **corretamente** no débito e precisam de `logAction` real.

### 2.6 Duas exceções arquiteturais que invalidam a "estratégia uniforme"

A versão original propôs uma estratégia uniforme CRUD
(`POST`→`create`, `PUT`→`update`, `DELETE`→`soft_delete`) para todos. Dois
módulos não são CRUD:

**`webhooks` — não há usuário autenticado.**
`server/src/modules/webhooks/presentation/routes/webhooks.ts` monta as duas
rotas **sem `authenticate`/`authorize`**, com comentário explícito no arquivo:
"é um webhook de sistema externo (n8n)". Como `AuditLog.register`
(`server/src/models/AuditLog.ts:149-151`) resolve autoria por
`data.req?.user?.id ?? null`, um `logAction` aqui gravaria trilha com
`user_id` e `user_name` **nulos**. Isso é gravável, mas é uma decisão de
desenho de trilha (identidade do sistema externo, não de pessoa) e não pode ser
inventada pelo engineer. **Escalado como D2 (§5).**

**`mobileInventory` — não é CRUD de entidade própria.**
As rotas são `POST /scan` e `POST /batch`
(`mobileInventory/presentation/routes`), autenticadas com
`authorizeModule('estoque', 'operate')`, e o repositório opera
`InventoryMovement`, `Product`, `User`
(`SequelizeMobileInventoryRepository.ts:8`) — não existe entidade
`MobileInventory`. O `entityType` e a granularidade (uma linha por lote ou uma
por item escaneado?) precisam ser decididos. **Escalado como D3 (§5).**

---

## 3. Blast radius

### 3.1 Classificação de produção (correção do ERRO 4)

Fonte: `coretriad/states/ERP-LEGACY-001/PRODUCTION_STATUS_MAP.md`.

**PRODUÇÃO REAL — confirmada por decisão humana (`APR-2026-016`):**

| Módulo | Linha | Base do dado real |
|---|---|---|
| `items` | `:127` | 327 registros reais carregados via API |
| `categories` | `:128` | referenciada pelos 327 itens reais |
| `departments` | `:129` | 17 registros = organograma real da empresa |
| `users` | `:130` | **parcial**: apenas a conta admin (as 20 `@teste.evokaudio` não) |

**NÃO-PRODUÇÃO:** `suppliers` (`:133`), `clients` (`:134`), `employees`
(`:135`), `serviceOrders` (`:145`), `nonConformities` (`:147`),
`mobileInventory` (`:149`), `assets` (`:151`), `accessProfiles` (`:171`),
`webhooks` (`:172`).

**Efeito na priorização:** dos módulos que exigem código novo neste caso,
`categories` e `departments` são **produção real** — e são precisamente os que
o `CASE-014` já reivindica (itens F e G), com `APR-2026-031` D-13 item 2
registrando a decisão do dono de que sobem a produção real. Os outros 7 são
NÃO-PRODUÇÃO. A severidade HIGH de `AUD-DB-03` para estes 7 é por **padrão de
cobertura**, não por exposição de dado real hoje.

### 3.2 Model e tipo de PK (correção do ERRO 5)

| Módulo | Model usado | PK | Nota |
|---|---|---|---|
| `categories` | `Category` (`SequelizeCategoriesRepository.ts:8`) | INTEGER | **Não** é `ItemCategoria`; ver abaixo |
| `assets` | `Asset` | INTEGER | |
| `clients` | `Client` | INTEGER | |
| `departments` | `Department` | INTEGER | |
| `nonConformities` | `NonConformity` | INTEGER | |
| `serviceOrders` | `ServiceOrder` | INTEGER | |
| `suppliers` | `Supplier` | INTEGER | |
| `users` | `User` | INTEGER | fora do trabalho de código |
| `accessProfiles` | `AccessProfile` | INTEGER | fora do trabalho de código |
| `mobileInventory` | `InventoryMovement` / `Product` / `User` | INTEGER | sem entidade própria — D3 |
| `webhooks` | `WebhookEvent` (`SequelizeWebhookRepository.ts:8`) | — | D2 |
| `employees` | `Employee` | INTEGER | Classe II, fora do escopo |
| `items` | `Item` | **UUID** (`Item.ts`) | Classe II, fora do escopo; origem do `OR-21` |

**Registro de precisão:** `ItemCategoria` (`ItemCategoria.ts:21-23`) tem PK
**UUID** e é citado em `AUD-DB-04` como tier 1. Ele **não** é o model do módulo
`categories`. A versão original confundiu os dois nomes e acertou a conclusão
("PK INTEGER, sem contorno") por acidente. Para os módulos que este caso
implementa, `entityId` direto é válido — nenhum tem PK UUID — e o contorno
`OR-21` **não** se aplica.

`OR-21`/`AUD-DB-04` (UUID × `audit_logs.entity_id integer`) permanece
**fora do escopo** deste caso.

### 3.3 `FILES_AFFECTED` previsto

Dependente de D1/D2/D3. Na hipótese D1=(i), D2=adiar, D3=adiar:

- `server/src/modules/{clients,suppliers,assets,nonConformities,serviceOrders}/presentation/controllers/*.ts`
  — 5 controllers (`categories`/`departments` só se `CASE-014` não executar)
- `server/tests/unit/audit-coverage-guard.test.ts` — `temAuditoria` ampliada
  (D1=(i)) **e** remoção das entradas efetivamente cobertas
- `server/tests/unit/modules/<mod>/…` — testes novos, um por módulo tocado

**Não toca:** nenhuma migration, nenhum model, nenhum contrato HTTP,
`server/src/services/auditLogService.ts`, `server/src/models/AuditLog.ts`,
`server/src/middlewares/auth.ts`, `audit/`, `coretriad/`, `.claude/`.

### 3.4 `REGRESSION_RISK`

**Baixo, com três riscos nomeados:**

1. **Terceiro teste da guarda (`:106-113`) — o risco que a versão original não
   viu.** `audit-coverage-guard.test.ts` tem um teste de catraca reversa: a
   lista não pode conter módulo que **já** audita. Se D1=(i) ampliar
   `temAuditoria` para ler `application/` e as entradas `users`/`accessProfiles`
   **não** forem removidas no mesmo commit, este teste passa a **reprovar**
   (`obsoletas` deixa de ser vazio). Ampliação da varredura e remoção das duas
   entradas são **atômicas**, no mesmo commit.
2. **Colisão de merge em `DEBITO_CONHECIDO`.** Três casos editam a mesma lista
   (`CASE-004`, `CASE-014`, este). Ver §4.2.
3. **Regra de dado real.** Teste de `logAction` sem mock abre conexão. Todo
   teste novo mocka `auditLogService`; nenhuma execução contra banco real,
   nem para contar linhas (`APR-2026-016`).

Risco **nulo** de mudança de comportamento externo: `logAction` é chamado após
o sucesso do use-case e não altera status code nem payload — igual ao padrão
de `products` (`productController.ts:133-140`).

---

## 4. Plano de correção

### 4.1 Padrão de referência (inalterado da versão original, verificado)

`server/src/modules/products/presentation/controllers/productController.ts:133-140`,
dentro de `exports.create`, após `useCase.execute`:

```typescript
logAction(req, {
  action: 'create',
  entityType: 'Product',
  entityId: product.id,
  entityDescription: product.code,
  newValues: { name: product.name, code: product.code, price: product.price },
  description: `Produto ${product.code} criado`
});
```

Demais call sites do mesmo padrão: `productController.ts:165,197,235` e
`bom/presentation/controllers/bomController.ts:137,182,211`.

### 4.2 Coordenação de merge — regra explícita (modelo: `CASE-014` §3)

Três casos tocam `DEBITO_CONHECIDO` no mesmo arquivo. Não é conflito de regra
de negócio; é **sequenciamento de merge**. Nenhum deles bloqueia o outro
tecnicamente.

**Dependência declarada:**

- Se `CASE-004` mesclar **antes** deste: `employees` e `items` já saíram da
  lista. Este caso **não** as reintroduz e **não** as remove de novo.
- Se este caso mesclar **antes** de `CASE-004`/`CASE-014`: aqueles precisam
  **rebase** sobre o novo estado da lista e da função `temAuditoria` (que pode
  ter mudado de assinatura de comportamento por D1).
- Se `CASE-014` executar (itens F=`categories`, G=`departments`): esses dois
  saem do trabalho de código **deste** caso. Se não executar, entram. Esta é
  decisão de sequenciamento do director, registrada como **D4** (§5).

**Regras absolutas de quem mesclar:**

1. Mesclar **um caso de cada vez**, nunca em paralelo sem rebase.
2. Antes de tocar `DEBITO_CONHECIDO`, **ler o estado atual da lista na branch
   de destino**. Entrada já removida por outro caso: **não reintroduzir**.
   Entrada ainda presente e cujo módulo passou a auditar: **remover, uma única
   vez**, sem duplicar o comentário de rastreabilidade.
3. Nenhum caso declara "remoção concluída" sem olhar o que os outros fizeram.
   O que não pode acontecer é um merge apressado sobrescrever o trabalho do
   outro.
4. Cada remoção carrega comentário no padrão já usado pelo `CASE-004`:
   `// '<mod>' SAIU em <data> (SanaCore <CASE>, <finding> item <X>, <APR>): <o que passou a auditar>.`

### 4.3 Restrição de privacidade (`AUD-DB-08` / `BR-RH-020`) — mantida

`oldValues`/`newValues` carregam **apenas campos de negócio/estruturais**.
Proibidos: CPF, salário, dado bancário, endereço/telefone pessoal.
`entityDescription` nunca usa CPF nem e-mail pessoal — usa código, nome
comercial ou matrícula. Proibido `{ ...entity.toJSON() }`.

### 4.4 Faseamento recalculado

O volume real de trabalho de código mudou em relação à versão original:
**saem** `users` e `accessProfiles` (já auditam — só guarda), **saem**
`employees` e `items` (Classe II), **condicionais** `categories` e
`departments` (`CASE-014`), **entram como exceção** `webhooks` e
`mobileInventory` (D2/D3).

**Fase 1 — correção da guarda (nenhum código de produção).**
Escopo: se D1=(i), ampliar `temAuditoria` para varrer `application/` além de
`presentation/controllers`, e remover `users` e `accessProfiles` de
`DEBITO_CONHECIDO` **no mesmo commit** (risco 1 de §3.4). Efeito colateral
medido: **nenhum outro módulo** muda de classificação — ver §5/D1.
Custo: 1 arquivo, 1 commit. Risco: nulo para produção.

**Fase 2 — os 5 módulos mudos sem disputa, NÃO-PRODUÇÃO, CRUD padrão.**
`clients`, `suppliers`, `assets`, `nonConformities`, `serviceOrders`.
Padrão idêntico ao de `products`; PK INTEGER; sem exceção arquitetural.
Este é o núcleo executável do caso.

**Fase 3 — condicional a D4:** `categories`, `departments`. Só entram se o
director decidir que `CASE-014` não os cobre. São **produção real** — se
entrarem, têm prioridade sobre a Fase 2.

**Fase 4 — as exceções, bloqueadas por decisão:** `webhooks` (D2),
`mobileInventory` (D3). Não implementar sem resposta.

**Fora do escopo, permanentemente neste caso:** `employees`, `items`
(Classe II), `sales` (parcial de `AUD-ALOG-01`), `OR-21`/`AUD-DB-04`.

### 4.5 Testes

Por módulo tocado, teste unitário novo com `auditLogService` **mockado**,
asserindo: `logAction` chamado uma vez por handler de escrita; `action`
correto; `entityType` = nome do model; `entityId` presente e numérico;
`oldValues`/`newValues` sem campo sensível; `req` repassado (autoria).
Prova vermelha antes da implementação, prova verde depois, com **output real
capturado** — não alegação em texto.

---

## 5. Decisões que dependem do dono (não decididas aqui)

### D1 — `users`/`accessProfiles`: corrigir a guarda ou duplicar a trilha?

**Premissa factual (§2.3):** os dois módulos **já auditam**, em
`application/use-cases`. A guarda os reprova por cegueira de camada, que o
próprio finding registra como fragilidade **(b)** dela.

**Opção (i) — ampliar `temAuditoria` para varrer `application/` além de
`presentation/controllers`, e remover as duas entradas por correção da guarda.**
- Nenhuma linha de código de produção muda.
- Consequência: a guarda passa a medir o que o finding diz que ela deveria
  medir. As duas entradas saem porque o débito **não existe**, não porque foi
  pago.
- Efeito colateral **medido, não estimado**: varri `application/` dos 13
  módulos com `--include=*.ts`. Passam a ser detectados como já-auditados
  **exatamente `users` (5 arquivos) e `accessProfiles` (3)**. Os outros 11 têm
  **zero** em `application/` — nenhum outro módulo se beneficia, nenhuma
  remoção adicional é destravada, e nenhum módulo hoje fora da lista passa a
  ficar exposto.
- Risco: a remoção precisa ser atômica com a ampliação (risco 1 de §3.4).

**Opção (ii) — duplicar `logAction` no controller dos dois módulos.**
- Consequência: **duas linhas de trilha por ação** (uma do controller, uma do
  use-case). Auditoria com evento duplicado é pior que auditoria em uma camada
  só: infla `audit_logs`, e qualquer contagem ou relatório sobre a trilha passa
  a contar dobrado para esses dois módulos e simples para os demais.
- Contraria o próprio finding, que classifica a situação como defeito **da
  guarda**, não do módulo.
- Custo: ~8 call sites novos em código de produção de autenticação e
  permissão — a superfície mais sensível do sistema — sem ganho de cobertura.

**Recomendação técnica: (i).** Motivos: (a) é a correção do defeito que o
finding realmente descreve; (b) custo zero em código de produção, portanto
risco de regressão zero em `users`/`accessProfiles`; (c) evita trilha
duplicada, que degradaria a qualidade da própria evidência de auditoria;
(d) o efeito colateral está medido e é nulo além dos dois módulos.
**A escolha é do dono — esta triagem não decide.**

### D2 — `webhooks`: trilha sem autor identificável

As duas rotas são **não autenticadas** por desenho (webhook de n8n / Focus
NFe). `logAction` gravaria `user_id`/`user_name` nulos
(`AuditLog.ts:149-151`). Decidir: (a) gravar com autoria de sistema
(identificar a origem externa em `entityDescription`/`description`);
(b) manter fora do escopo e registrar `webhooks` como débito com justificativa
arquitetural; (c) outro desenho. **Não implementar sem resposta.**

### D3 — `mobileInventory`: qual entidade e qual granularidade

Não há entidade `MobileInventory`; `POST /scan` e `POST /batch` movimentam
`InventoryMovement`. Decidir `entityType` e se `POST /batch` gera **uma** linha
de trilha por lote ou **uma por item** escaneado. Afeta volume de `audit_logs`.
**Não implementar sem resposta.**

### D4 — sequenciamento com `CASE-014`

`CASE-014` (despacho pronto, branch inexistente) reivindica `categories` (F) e
`departments` (G) — os dois **produção real**. Decidir se saem deste caso
(recomendado: sim, evita trabalho duplicado e conflito na mesma lista) ou se
`CASE-016` os absorve e `CASE-014` fica reduzido ao item C.

### D5 — falha de `logAction`

Se a gravação da trilha falhar, o handler degrada (responde sucesso, loga o
erro) ou propaga erro ao usuário? O padrão atual de `products`/`bom` **não**
faz `await` no `logAction`, portanto degrada silenciosamente por omissão.
Manter esse padrão é a opção de menor risco de regressão; formalizá-lo é
decisão de negócio.

---

## 6. Critério de reteste (VeriCore)

### 6.1 Estático

1. Para cada módulo declarado remediado: `logAction` presente em
   `presentation/controllers` **ou**, se D1=(i), em `application/`, com
   varredura `--include=*.ts` **excluindo testes e README** (o ERRO 3 nasceu
   disso).
2. `DEBITO_CONHECIDO` reduzido apenas nos módulos efetivamente cobertos, sem
   reintroduzir entrada removida por outro caso (§4.2).
3. **Os três testes** de `audit-coverage-guard.test.ts` verdes — incluindo o de
   `:106-113` (catraca reversa), que é o que pega ampliação de `temAuditoria`
   sem remoção correspondente.
4. Parâmetros de cada chamada: `action`, `entityType`, `entityId` numérico não
   `NaN`, `oldValues`/`newValues` sem campo sensível, `req` repassado.
5. Suíte unitária de cada módulo tocado 100% verde, sem asserção removida ou
   afrouxada.
6. Nenhum diff em `audit/`, `coretriad/`, `.claude/`, migrations, models.

### 6.2 Dinâmico

Fila G4, banco `erp_evok_audio_test`, **nunca** `erp_evok_audio`. Verificar
que cada handler de escrita produz o número esperado de linhas em `audit_logs`
com `action` e `entity_type` corretos. Executado por
`vericore-audit-verification-runner`. Esta triagem **não** executou nada
disso, por `APR-2026-016`.

---

## 7. Conclusão

**Status:** TRIAGE RETIFICADO. Causa-raiz demonstrada por arquivo:linha, não
por hipótese. Escopo real: **13 módulos**, em 3 classes com tratamentos
diferentes — não 11 módulos uniformes.

**Bloqueio:** o caso **não** é candidato a aprovação direta, como a versão
original afirmou. Há 5 decisões abertas (D1-D5), das quais D1 e D4 alteram o
escopo e D2/D3 bloqueiam dois módulos.

**Executável já hoje, sem nenhuma decisão nova:** a Fase 2 (5 módulos
NÃO-PRODUÇÃO, CRUD padrão, PK INTEGER, padrão de `products`). É o que o
despacho prioriza.

**Autoridade:** nenhum `FINDING CLOSED`, nenhum `RETEST_PASSED` é declarado
aqui — autoridade exclusiva da VeriCore (Regras 3 e 4 do `CLAUDE.md`).

---

**Produzido por:** sanacore-remediation-triage
**Retificado em:** 2026-08-18, contra `main` @ `baab7df`
**Audit commit:** c1311a6f76b512fef893f7e60d934179cae3409f
