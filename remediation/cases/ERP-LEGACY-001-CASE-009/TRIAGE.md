# TRIAGE — ERP-LEGACY-001-CASE-009

| Campo | Valor |
|---|---|
| `CASE_ID` | `ERP-LEGACY-001-CASE-009` |
| `FINDING_ID` | `FIND-ERP-002` (discovery formalizado; segunda voz em `T-03` §2 do run `ERP-LEGACY-001-AUD-001`) |
| Severidade | **HIGH** · `CONFIDENCE: CONFIRMED` — **fixadas, não reavaliadas aqui** (Regra 18) |
| `PROJECT_ID` | `ERP-LEGACY-001` (produção real, `APR-2026-016`) |
| `AUDIT_COMMIT` | `c1311a6f76b512fef893f7e60d934179cae3409f` (imutável — Regra 12) |
| Fase | **TRIAGEM APENAS** |
| Agente | `sanacore-remediation-triage` |
| Árvore usada | worktree principal, `a3349a2` (branch `audit/ERP-LEGACY-001-AUD-001/2026-08-16`) |
| Data | 2026-08-17 |
| Caso irmão | `ERP-LEGACY-001-CASE-008` (`AUD-DB-02`) — **triado e aprovado** por `APR-2026-053` (Opção C sem webhook) |

## Declaração de cumprimento (obrigatória)

- **Nenhuma conexão de banco foi aberta**, contra banco nenhum, em nenhum momento
  desta triagem. Nenhuma suíte de teste executada, nenhum script de diagnóstico,
  nenhuma query — **nem para contar linhas**. `APR-2026-016`, regra permanente de
  segurança de dado real.
- Toda a análise é **estática sobre arquivos versionados**. Comandos usados:
  exclusivamente `git` (`log`, `diff`, `rev-parse`, `branch`, `worktree`), `ls`/`find`,
  leitura de arquivo e busca de texto.
- **Nenhuma âncora foi confirmada por saída de `grep`.** `00_baseline_frozen.sql`
  (faixas 2700-2780, 3620-3720, 22150-22245), `20260806-000080-create-app-role-least-privilege.cjs`
  (133 linhas, integral), `20260808-000014-create-hr-employee-contracts.cjs`,
  `limpar-dados-transacionais.cjs` (349 linhas, integral), `AuditLog.ts` (integral),
  `auditLogService.ts:100-217`, `lgpdController.ts:40-204`, `auditLogs.ts` (integral),
  `tests/setup.ts` (integral) foram **lidos com a ferramenta de leitura**. Busca de
  texto foi usada apenas para **localizar** e para **provar ausência**, nunca para
  citar literal.
- **Nenhum valor de segredo ou credencial foi copiado.** Só nomes: `evok_admin`,
  `evok_app`, `DB_USER`, `DB_NAME`, `APP_DB_ROLE_PASSWORD`, `erp_evok_audio`.
- **Nada foi implementado.** Nenhum worktree criado, nenhuma branch criada, nenhum
  arquivo de código, migration, teste ou rascunho escrito. Este é o **único** arquivo
  produzido.
- Nenhum `FINDING CLOSED`, `RETEST_PASSED` ou `REMEDIATION_COMPLETE` é declarado
  (Regras 3 e 4).

> **Nota de validade da árvore.** `git diff --name-only c1311a6f…HEAD` restrito a
> `server/src`, `server/migrations`, `server/database` e `server/tests` retorna
> **vazio**. O **único** arquivo relevante alterado depois do `AUDIT_COMMIT` é
> `server/scripts/limpar-dados-transacionais.cjs`, e o diff é **exclusivamente de
> comentário** (advertências de `APR-2026-016`/`CE-03` no cabeçalho e um comentário
> antes da linha de exemplo de `pg_restore`). **Nenhuma linha executável mudou** —
> `PRESERVAR_EXATO`, o `SET LOCAL session_replication_role`, o laço de `DELETE` e as
> guardas são byte-idênticos ao `AUDIT_COMMIT`. Toda conclusão abaixo vale para os dois.

---

## 1. Escopo real do finding — `audit_logs` **é** o item 1 do finding, não uma extensão do `T-03`

**Resposta com citação: o `T-03` NÃO estendeu o escopo. Ele aprofundou o item 1 do
finding original.**

`FIND-ERP-002.md` já nomeia `audit_logs` **no título** e **como a primeira das três
tabelas**:

- Título (`:7`): *"Nenhuma proteção de banco (trigger/RULE/REVOKE) contra
  UPDATE/DELETE em **audit_logs**, sale_invoices (NF-e emitida) e
  accounting_entries…"*
- `SUBDOMAIN` (`:9`): `audit-log-immutability / database-enforcement`.
- Corpo, item **1** (`:33-38`): *"**`audit_logs`** (`00_baseline_frozen.sql:3627-3708`)
  — o próprio registro de auditoria do sistema… Nenhum trigger, nenhuma `RULE`,
  nenhum `REVOKE` restringindo `UPDATE`/`DELETE`…"*
- `EXPECTED_BEHAVIOR` (`:76-77`): *"(a) `audit_logs` nunca sofre `UPDATE`/`DELETE`
  após `INSERT`"*.

O `T-03` §2 (`:130-137`) declara-se explicitamente como **segunda voz sobre o mesmo
finding**, reconferindo por evidência própria a DDL, os 4 índices, a FK e o GRANT
amplo — âncoras que *"T-00 §3.2 expressamente remeteu a T-03"*. E `T-03` §4 (`:196-198`)
registra o vínculo arquitetural: *"a regra 'audit log não se atualiza nem se apaga'
não tem onde morar no código — é o `FIND-ERP-002` refletido no nível arquitetural"*.

### 1.1 Mas há uma decisão de escopo real a tomar, e ela não é minha

O finding tem **três tabelas**. O despacho deste caso enuncia a pergunta em cima de
**`audit_logs`** (*"o registro resiste?"*). As outras duas — `sale_invoices`
(`:40-45`) e `accounting_entries` (`:47-58`) — **continuam abertas no mesmo
`FINDING_ID`** e têm perfil de remediação **materialmente diferente**:

| Tabela | Regra de imutabilidade | Dificuldade |
|---|---|---|
| `audit_logs` | **incondicional** — nunca `UPDATE`, nunca `DELETE` | Baixa: a aplicação **nunca** atualiza nem apaga (§4.1) |
| `sale_invoices` | **condicional** a `nfe_status = 'authorized'`, com transições fiscais legítimas (`cancelled`) que precisam continuar possíveis | Média-alta: exige mapear o fluxo fiscal de cancelamento; regra fiscal, não só técnica |
| `accounting_entries` (+ `accounting_entry_items`) | **condicional** a `status = 'posted'`, com estorno legítimo via `ReverseEntryUseCase` | Média-alta: exige mapear estorno; hoje a única barreira é `UpdateEntryUseCase.ts:57-59`, de aplicação |

**Não decido isso.** Recomendo tecnicamente que **`CASE-009` seja `audit_logs`
apenas** — é a única das três cuja regra é incondicional e cujo caminho de escrita
é único e comprovadamente `INSERT`-only (§4.1) — e que as outras duas virem **caso
próprio** (mesmo `FINDING_ID`, escopo distinto), porque agrupá-las triplica a
superfície e mistura regra fiscal e contábil, que são decisão de negócio, com uma
regra técnica que não é. Item **D1** no §11.

---

## 2. Reprodução estática — âncoras reconferidas por leitura de arquivo

### 2.1 A DDL de `audit_logs` — **CONFIRMADA**

`00_baseline_frozen.sql:3627-3646` é o `CREATE TABLE` inteiro: 17 colunas, `id integer
NOT NULL`, `old_values json`, `new_values json` (`:3637-3638`, **sem `CHECK`, sem
constraint de forma, sem mascaramento**), `created_at`/`updated_at` `NOT NULL`.
Fecha em `);` na linha 3646. Depois vêm só `COMMENT ON COLUMN` (`:3650-3688`) e a
sequence (`:3695-3708`). **Não há uma única linha de `CREATE TRIGGER`, `CREATE RULE`
ou `REVOKE` associada a `audit_logs` em lugar nenhum do dump.**

### 2.2 Os 13 triggers que existem — **CONFIRMADOS, e li o padrão**

`00_baseline_frozen.sql:22156-22240`: exatamente 13 `CREATE TRIGGER`, todos
`trg_hr_*`/`trg_jur_*`/`trg_sst_*`. Forma canônica (`:22170`):

```sql
CREATE TRIGGER trg_hr_lock_employee_contract
  BEFORE DELETE OR UPDATE ON public.hr_employee_contracts
  FOR EACH ROW EXECUTE FUNCTION public.hr_lock_employee_contract();
```

Função correspondente (`:2730-2755`): `LANGUAGE plpgsql`, `IF TG_OP = 'DELETE' THEN
RAISE EXCEPTION …`. O bloqueio total mais simples do conjunto está em `:2704-2710`
(`hr_block_delete_employee_benefit`): corpo com uma única linha de `RAISE EXCEPTION`.

**A migration que instalou esse padrão está versionada e é o molde a copiar:**
`server/migrations/20260808-000014-create-hr-employee-contracts.cjs:69-100` —
`CREATE FUNCTION` via `queryInterface.sequelize.query`, depois `CREATE TRIGGER`, e
`down()` (`:102-110`) fazendo `DROP TRIGGER IF EXISTS` + `DROP FUNCTION IF EXISTS`
na ordem certa. **O implementador não precisa inventar forma nenhuma.**

### 2.3 **Nenhum dos 13 triggers é `ENABLE ALWAYS`** — achado novo, e é decisivo

Busca por `ENABLE ALWAYS` e `ENABLE REPLICA` em todo `server/`: **zero ocorrências**.
Os 13 triggers estão no modo padrão (`ORIGIN`). Isso importa muito — §3.4 e §5.2.

### 2.4 O GRANT amplo e a política padrão — **CONFIRMADOS, li a migration inteira**

`20260806-000080-create-app-role-least-privilege.cjs`, 133 linhas:

- `:40` — `const EXCLUDED_TABLES = ['SequelizeMeta', 'SequelizeData'];` — a **única**
  exclusão.
- `:70-83` — laço `FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname =
  'public' AND tablename NOT IN (…)` executando
  `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO evok_app`.
- `:105-108` — **o agravante do `T-03` §2, confirmado**:
  `ALTER DEFAULT PRIVILEGES FOR ROLE evok_admin IN SCHEMA public GRANT SELECT,
  INSERT, UPDATE, DELETE ON TABLES TO evok_app`. Não é fato pontual: é **política
  padrão do schema**. Toda tabela futura nasce alterável e apagável por `evok_app`.
- `:4-9` — a própria migration descreve `evok_admin` como **superusuário**, e diz
  que um comprometimento dessa credencial dá *"superusuario completo do Postgres
  (DROP DATABASE, criar roles, **ler/alterar qualquer tabela do sistema**)"*.
- `:18-24` — *"esta migration **APENAS CRIA** a role e concede privilegios. Ela **NAO
  troca a credencial ativa em uso** (`DB_USER=evok_admin` no `.env`/`docker-compose.yml`)"*.

`docker-compose.yml:49` → `DB_USER: evok_admin`; `:3` → `image: postgres:16-alpine`;
`:8` → `POSTGRES_USER: evok_admin`. **Premissa retificada do `T-03` §2 confirmada
por leitura própria: a credencial de runtime é `evok_admin`, superusuário — não
`evok_app`.**

---

## 3. A pergunta que decide a estratégia: **a imutabilidade sobrevive a uma credencial superusuário?**

**Resposta curta: TRIGGER sobrevive; GRANT/REVOKE não. Portanto a estratégia é
TRIGGER, e este caso é INDEPENDENTE de `AUD-DB-01` — mas o teto de eficácia dele é
limitado por `AUD-DB-01`, e isso precisa estar escrito no risco residual.**

Separo com rigor o que é prova de artefato do que é semântica de produto.

### 3.1 O que está **PROVADO** por artefato versionado

| # | Fato | Âncora (lida) |
|---|---|---|
| P1 | A credencial de runtime é `evok_admin` e é descrita como **superusuário** pelo próprio repositório | `20260806-000080…cjs:4-9`; `docker-compose.yml:8,49` |
| P2 | Superusuário **lê/altera qualquer tabela** — afirmado no repositório como justificativa de existir a role de privilégio mínimo | `20260806-000080…cjs:4-9` |
| P3 | `evok_app` existe, está corretamente desenhada e **nunca foi ativada** | `20260806-000080…cjs:18-24` |
| P4 | Os 13 triggers existentes são tratados, por dois artefatos de auditoria independentes, como **a única regra imposta pelo Postgres independentemente da aplicação** | `FIND-ERP-002:26-28`; `T-03` §1 `AUD-DB-01` |
| P5 | Para neutralizar esses triggers, o superusuário precisa de um **ato explícito**: `ALTER TABLE … DISABLE TRIGGER ALL` ou `SET session_replication_role='replica'` | `T-03` §1 `AUD-DB-01` (`:25-28`) |
| P6 | **Esse ato explícito já existe no repositório e já roda contra o banco real** | `limpar-dados-transacionais.cjs:266` — `SET LOCAL session_replication_role = 'replica'` |
| P7 | Nenhum dos 13 triggers usa `ENABLE ALWAYS` | busca em `server/`: zero ocorrências |

**P5 é a chave lógica.** Ele é a admissão, num artefato de auditoria versionado, de
que **o trigger dispara** — se não disparasse, não haveria nada a "neutralizar".
Um GRANT, ao contrário, não precisa ser neutralizado por superusuário: ele
simplesmente não se aplica.

### 3.2 O que é **ASSUMIDO** — semântica documentada do PostgreSQL 16, com grau de certeza

Estes pontos **não são verificáveis contra artefato deste repositório** e **não
executei nada** para confirmá-los (`APR-2026-016`). Declaro grau de certeza para que
a segunda opinião possa atacá-los:

| # | Premissa | Certeza | Como refutar |
|---|---|---|---|
| **A1** | Superusuário **ignora toda checagem de privilégio** de tabela → `REVOKE UPDATE, DELETE ON audit_logs FROM …` é **inócuo** contra `evok_admin` | **MUITO ALTA** — semântica basilar do PostgreSQL, corroborada pelo próprio texto de `20260806-000080…cjs:4-9` | Documentação oficial do PG 16 (§ privilégios); ou sondagem `DYN` em `erp_evok_audio_test` |
| **A2** | Um trigger `BEFORE UPDATE OR DELETE … RAISE EXCEPTION` **dispara para qualquer role, inclusive superusuário** — não há bypass implícito por privilégio | **MUITO ALTA** — corroborada por P5 | Idem A1; `DYN-T03-02`/`DYN-T03-04` já estão na fila do `T-03` §5 e servem exatamente para isto |
| **A3** | `SET session_replication_role = 'replica'` suspende triggers em modo `ORIGIN` (o default) — inclusive triggers de usuário, não só os de FK | **ALTA** — e o repositório depende desse comportamento: `limpar-dados-transacionais.cjs:45-49` o usa deliberadamente para apagar tabelas com trigger de bloqueio | Ler a documentação; ou observar que hoje o script consegue apagar `hr_*`/`jur_*`/`sst_*` |
| **A4** | `ALTER TABLE … ENABLE ALWAYS TRIGGER` faz o trigger disparar **mesmo** sob `session_replication_role='replica'` | **ALTA** | Documentação; sondagem `DYN` |
| **A5** | `DISABLE TRIGGER` / `DROP TRIGGER` exigem ser **dono da tabela** ou superusuário; `session_replication_role` exige superusuário (ou `SET` privilege concedido explicitamente) | **MÉDIA-ALTA** | Documentação. Importa para o cenário pós-`AUD-DB-01`: se `evok_app` não for dona nem puder setar o parâmetro, o trigger torna-se **inviolável pelo runtime** |

### 3.3 Conclusão operacional

- **`REVOKE` como estratégia primária: descartado.** Sob `evok_admin` (A1) não faz
  absolutamente nada. Se fosse a estratégia, `AUD-DB-01` seria pré-requisito duro e
  este caso ficaria bloqueado. **Não é.**
- **`TRIGGER` como estratégia primária: viável hoje.** Bloqueia (A2) o `UPDATE`/`DELETE`
  direto, inclusive o vindo da credencial superusuária, **até que alguém desligue o
  trigger explicitamente**. Isso muda a natureza do ato: de "escrita silenciosa
  indistinguível de operação normal" para "ato administrativo deliberado e nomeado".
- **Logo: `CASE-009` é INDEPENDENTE de `AUD-DB-01`** e pode andar sozinho.
- **Mas o teto é real e tem de ser declarado:** enquanto o runtime for superusuário,
  a imutabilidade é uma **barreira**, não uma **garantia**. `AUD-DB-01` continua
  sendo o que transforma barreira em garantia — e o `REVOKE` só passa a ter efeito
  **depois** dele. Isso é **risco residual do `CASE-009`**, não bloqueio.

### 3.4 Refinamento que muda o valor da correção: `ENABLE ALWAYS`

Como nenhum dos 13 triggers é `ENABLE ALWAYS` (P7) e o repositório **já contém e usa**
`session_replication_role='replica'` (P6), um trigger criado no padrão da casa
seria **silenciosamente contornado pelo script de limpeza que já existe**. Um
`ALTER TABLE public.audit_logs ENABLE ALWAYS TRIGGER trg_…` fecha esse caminho (A4).

**Consequência que exige decisão:** com `ENABLE ALWAYS`, o
`limpar-dados-transacionais.cjs` **passa a falhar** ao chegar em `audit_logs` — e,
como ele roda tudo em transação única (`:263`, `:298`), **a limpeza inteira aborta em
rollback**. Isso é conserto, não regressão — o script hoje **apaga a trilha de
auditoria** —, mas é uma quebra operacional real e visível. Ver §5.2 e **D3**.

---

## 4. As três lacunas anexas — **são três problemas, com custos e donos diferentes**

O `T-03` `AUD-DB-08` (`:91-97`) as amarra numa frase só: colunas `json` livres *"sem
CHECK nem mascaramento (`:3637-3638`), **sem retenção**, **sem imutabilidade**
(FIND-ERP-002), legíveis em massa por AUD-DB-05"*. Elas **não** têm o mesmo custo,
o mesmo risco, nem o mesmo decisor. Trato separadamente.

### 4.1 Lacuna A — **IMUTABILIDADE** (o núcleo deste caso)

**Estado:** nenhuma proteção. **Superfície de escrita da aplicação: `INSERT` puro.**
Isto eu provei, e é o que torna esta lacuna barata:

- Único ponto de escrita: `AuditLog.ts:148` (`AuditLog.create`), chamado só por
  `AuditLog.register` (`:119-165`).
- `auditLogService.ts:176-213`: os **três** caminhos (degradado direto `:178`,
  degradado pós-`22P02` `:198`, retry `:209`) chamam `AuditLog.register` — ou seja,
  **`INSERT`**. Não existe `UPDATE` em caminho nenhum.
- Busca por `AuditLog.update|AuditLog.destroy|AuditLog.upsert|AuditLog.bulkCreate`
  em `server/`: **zero ocorrências em código de produção** (os únicos hits são mocks
  de `register` em `server/tests/unit/audit-log-*.test.ts`).
- API: `server/src/modules/auditLogs/presentation/routes/auditLogs.ts` tem **duas
  rotas, ambas `GET`** (`:12-13`). Não existe rota legada concorrente —
  `server/src/routes/` contém apenas `health.ts`.
- Repositório de leitura: `SequelizeAuditLogsRepository` (`findAndCountAll`/`findByPk`),
  sem método de escrita — já registrado em `T-03` §4.

**Custo: BAIXO.** Uma migration no molde de `20260808-000014` + testes. **Zero
mudança em código de aplicação. Zero call sites.**
**Risco: concentrado fora da aplicação** — no script de limpeza e no provisionamento
de banco (§5).
**Decisor: técnico**, exceto pela interação com a lacuna C (§4.3), que é jurídica.

### 4.2 Lacuna B — **MASCARAMENTO** de dado sensível

**Estado (verificado por leitura):** `lgpdController.ts` grava **a entidade inteira**
no `new_values` em três pontos:

- `:63` — `newValues: activity` (RoPA — atividade de tratamento, objeto completo
  retornado pelo use case).
- `:120` — `newValues: request` — **pedido de titular de dados**. O objeto é o
  resultado de `CreateDataSubjectRequestUseCase` sobre `{...req.body, dpoUserId}`
  (`:116-119`). É, por definição, o dado pessoal do titular que exerceu o direito.
- `:191` — `newValues: incident` — incidente de segurança com dado pessoal.

E há mais no mesmo arquivo, com `req.body` cru: `:72`, `:147`, `:159`, `:200`. O
`T-03` `AUD-DB-08` mede o padrão em todo o sistema: `newValues: req\.body|newValues:
parsed\.data|oldValues: req\.body` = **39 ocorrências / 30 arquivos**.

Do lado do armazenamento: `old_values json` / `new_values json`
(`00_baseline_frozen.sql:3637-3638`) — tipo livre, **sem `CHECK`**; e
`AuditLog.ts:157-158` grava `data.oldValues ?? null` **sem transformação nenhuma**.
Não existe allowlist, denylist, redator ou truncador em caminho nenhum.

**Conformidade que existe e deve ser preservada:** nenhuma credencial é logada
(`T-03` `AUD-DB-08` `:96-97`, citando `CreateUserUseCase.ts:62-69` e
`authController.ts:163-169,229-234`).

**Custo: MÉDIO.** O mecanismo é barato — um redator no ponto único de escrita
(`AuditLog.register`, `:148`) ou em `logAction`, **2 arquivos, zero call sites**. O
que é caro é a **lista**: quais campos são sensíveis, e se a política é allowlist
(só grava o declarado) ou denylist (remove o proibido). A allowlist é a única
defensável em LGPD e a mais cara, porque muda o valor probatório do log.
**Decisor: parcialmente jurídico.** Item **D4**.
**E, crucialmente: mascarar não resolve o passivo** — só o fluxo novo (§4.4).

### 4.3 Lacuna C — **RETENÇÃO / EXPURGO** (`BR-IAM-034`)

**Estado: a regra não existe.** Provado:

- `BR_CATALOG.md:144` — `| BR-IAM-034 | Retenção/expurgo de logs e usuários:
  inexistente | **UNKNOWN** | :498 | — (regra ausente) | PENDENTE — decisão humana |`
- `BUSINESS_RULE_CANDIDATES_identidade-acesso.md:498-500` — *"BR-IAM-034 —
  Retenção/expurgo de audit_logs e de usuários inativos. **Nenhuma regra em
  documento nem código** (soft delete `active=false` é permanente; `audit_logs`
  cresce sem política). STATUS: UNKNOWN — decisão humana."*

E o próprio código invoca a norma: `auditActions.ts:135-138` justifica o valor `read`
com *"Consulta a dado pessoal/regulado (**LGPD art. 37** exige registro das operações
de tratamento, e acesso é uma delas)"*.

**Custo: ALTO, e não é primariamente de código.** Falta a regra: prazo, critério,
o que é expurgo (apagar linha? anonimizar campo?), quem autoriza, e qual base legal
sustenta guardar vs. apagar. **Regra 6: não invento regra de negócio, e não infiro
norma jurídica.** Item **D5**.

### 4.4 A contradição entre A e C — **este é o ponto mais importante desta seção**

**Uma tabela absolutamente imutável não pode implementar retenção.** Se a remediação
da lacuna A instalar um bloqueio incondicional de `DELETE`, a futura remediação da
lacuna C fica **impossível sem desfazer a lacuna A** — e desfazer é exatamente o ato
(`DISABLE TRIGGER`) que este caso existe para tornar difícil.

Isso não é hipótese: hoje o **de facto** expurgo do sistema é o
`limpar-dados-transacionais.cjs` apagando `audit_logs` inteiro (§5.2) — um expurgo
sem política, sem prazo, sem registro e sem autorização.

Consequência de sequenciamento, enunciada e **não decidida**:

- **Se D5 (retenção) for "sim, haverá política"**, o desenho de A precisa nascer com
  uma **porta legítima e auditável** — tipicamente uma função `SECURITY DEFINER`
  nomeada, que o trigger reconhece, e que **ela própria registra o expurgo**. Custo
  maior, mas é o único desenho que concilia as duas lacunas.
- **Se D5 for "não haverá política / decidir depois"**, o bloqueio incondicional é o
  mais simples e o mais forte — e **assume-se explicitamente** que qualquer retenção
  futura exigirá nova migration de remediação sobre a própria imutabilidade.

**Enuncio; não escolho.** Item **D2**.

---

## 5. O passivo de dado, e o problema da ordem

### 5.1 Enunciado do problema (não decidido)

Já existem linhas gravadas em `audit_logs` no banco de produção real, e elas contêm
dado pessoal verbatim (§4.2) — **incluindo, potencialmente, o conteúdo de pedidos de
titular de dados** (`lgpdController.ts:120`). Não sei quantas, nem quais: **não posso
olhar** (`APR-2026-016`), e não olhei.

**Congelar a tabela congela o passivo com o dado exposto dentro.** A partir do
momento em que o trigger existir, retificar ou remover essas linhas exige o mesmo
ato administrativo que a correção tenta tornar difícil.

Três ordens possíveis, com o preço de cada uma:

| Ordem | O que acontece | Preço |
|---|---|---|
| **O1 — mascarar/expurgar antes de congelar** | Uma passada única de remediação de dado sobre as linhas existentes, e só depois o trigger | Exige política de mascaramento (**D4**) **antes** do caso técnico andar; a passada é `UPDATE`/`DELETE` em massa sobre dado real de produção — **ato do dono, jamais de agente**; atrasa a correção de imutabilidade, que é a HIGH |
| **O2 — congelar agora, aceitar o passivo** | Trigger imediato; o passivo fica dentro, imutável | Correção mais rápida e a única que não toca dado real; mas registra-se que dado pessoal legado fica **irremovível** por caminho normal — potencial tensão com direito de eliminação/retificação do titular |
| **O3 — congelar com porta de expurgo desenhada** | Trigger + função autorizada e auditável de expurgo/mascaramento retroativo | Concilia tudo, é o único compatível com `BR-IAM-034` futura, e é o mais caro; a porta é, por construção, também a superfície de ataque |

**Não decido. Registro que O1 e O3 dependem de D4/D5, e O2 não depende de nada** —
o que significa que **O2 é a única ordem executável hoje sem decisão humana nova**.
Item **D2**.

### 5.2 Um agravante de passivo que ninguém registrou ainda — **achado novo desta triagem**

`server/scripts/limpar-dados-transacionais.cjs`, lido integralmente:

- `:104-117` — `PRESERVAR_EXATO` contém `SequelizeMeta`, `users`, `access_profiles`,
  `access_profile_permissions`, `departments`, `warehouses`, `work_centers`,
  `work_center_shifts`, `accounting_chart_of_accounts`. **`audit_logs` não está na
  lista.**
- `:123` — `PRESERVAR_PADRAO = [/_settings$/, /_config$/, /^company_/]`. **`audit_logs`
  não casa com nenhum.**
- `:171-178` + `:223` — o alvo é montado em tempo de execução a partir do
  `information_schema`, e é *"todo o resto do schema `public`"* (`:30-33`). Logo
  **`audit_logs` está no escopo de exclusão**.
- `:266` — `SET LOCAL session_replication_role = 'replica'`, e `:268-270` — laço de
  `DELETE FROM "<tabela>"` para cada alvo, tudo em transação única (`:263`, `:298`).
- `:199-202` — a única guarda é `NODE_ENV === 'production'`. O próprio cabeçalho
  (`:75-88`) admite: *"**não é uma guarda de nome de banco**… Se `.env` tiver
  `DB_NAME=erp_evok_audio` (o default de `server/.env.example`) e `NODE_ENV` não
  estiver `production` — configuração normal de dev local, por este projeto não ter
  banco de dev separado do real — `--confirmar` apaga dado real de produção."*
  (Compare com a guarda de sufixo `_test`/`_ci` que `run-api-suite.cjs` tem no início
  de `main()`, ~`:525-537`, e que este script **não** tem. Residual já registrado
  como `CE-03` em `RISK_CLASS-RC-PROC-01`.)

**Traduzindo:** existe, versionado, um script que **apaga a trilha de auditoria
inteira** — e que **já roda com o bypass de trigger ligado**. Ele é, hoje, tanto o
principal caminho de destruição da trilha quanto a prova viva de que a defesa por
trigger em modo `ORIGIN` é contornável por um caminho que o projeto **de fato usa**.

Isto tem três consequências diretas:

1. **É a razão técnica mais forte para `ENABLE ALWAYS`** (§3.4).
2. **É blast radius real** (§6.2): com `ENABLE ALWAYS`, o script quebra e a limpeza
   inteira sofre rollback.
3. **É insumo de decisão para D3**: a alternativa a quebrar o script é acrescentar
   `audit_logs` ao `PRESERVAR_EXATO` — mas isso é **decidir, na prática, que a trilha
   nunca mais é apagada por esse caminho**, o que é a política de retenção entrando
   pela porta dos fundos (§4.4). **Não faço essa edição, nem a recomendo sem D2/D5.**

---

## 6. Blast radius

### 6.1 O que **NÃO** quebra — verificado, não suposto

| Superfície | Verificação | Resultado |
|---|---|---|
| Escrita da aplicação | `AuditLog.create` é o único ponto (`AuditLog.ts:148`); os 3 caminhos de `auditLogService.ts:176-213` são `INSERT` | **Não quebra.** Um bloqueio de `UPDATE`/`DELETE` é invisível para o fluxo normal |
| API pública | `auditLogs.ts:12-13` — duas rotas `GET`; `server/src/routes/` só tem `health.ts` | **Não quebra** |
| ORM / `updated_at` | `AuditLog.ts:94-97` (`timestamps: true`) preenche `created_at`/`updated_at` **no `INSERT`**; nada faz `save()` posterior | **Não quebra** |
| Suíte de testes | Busca por `DELETE FROM` e `.destroy(` em todo `server/tests`: **zero ocorrências**. Nenhum teste limpa `audit_logs` entre casos; os testes de integração apenas **conferem que a linha apareceu** (`rh-block6-extension.test.ts:6`, `rh-time-import-attendance.test.ts:9`, `directorate-governance-cycle.test.ts:17`) | **Não quebra.** A pergunta do despacho ("rotina de teste que limpa a tabela") tem resposta: **essa rotina não existe** |
| Testes unitários de auditoria | `audit-log-failure-alerting`, `audit-log-action-downgrade`, `audit-log-register-normalization` mockam o model/serviço | **Não quebra** |
| Migrations existentes que citam `audit_logs` | `20260731-000009` (`changeColumn` — DDL, não dispara trigger de linha), `20260810-000036` (`ALTER TYPE … ADD VALUE`), `20260806-000041`/`000042` (só comentário/schema-fantasma), `20260811-000044`, `20260812-000046` (só menção em prosa) | **Não quebram** — nenhuma faz `UPDATE`/`DELETE` de linha em `audit_logs` |
| Mecanismo do `CASE-008` | §7 | **Não quebra** |

### 6.2 O que **quebra**, ou fica exposto

| # | Superfície | Efeito | Gravidade |
|---|---|---|---|
| **B1** | `server/scripts/limpar-dados-transacionais.cjs` | Com `ENABLE ALWAYS`: `RAISE EXCEPTION` ao chegar em `audit_logs` → **rollback da limpeza inteira** (`:299-304`), script inutilizável até `audit_logs` entrar em `PRESERVAR_EXATO`. Sem `ENABLE ALWAYS`: **continua apagando a trilha em silêncio** e a correção vira teatro | **Alta — é a decisão D3** |
| **B2** | Migrations **futuras** que precisem corrigir dado em `audit_logs` (ex.: backfill, normalização, correção de `entity_id` sob `AUD-DB-04`) | Passam a falhar. DDL (`ALTER TABLE`) continua funcionando — trigger de linha não dispara em DDL —, mas **backfill de dado**, sim | **Média** — precisa constar como restrição conhecida do projeto |
| **B3** | `server/scripts/comparar-bancos.cjs` (guarda de drift entre bancos) | Busca por `trigger`/`pg_trigger` no arquivo: **zero ocorrências**. O script compara colunas, índices e constraints — **não compara triggers**. Um trigger presente no banco real e ausente no de teste (ou vice-versa) é **invisível** para a guarda de drift | **Média — ponto cego de verificação, precisa ser fechado pelo teste do §8** |
| **B4** | Provisionamento de banco novo | `20260731-000001-baseline-schema.cjs:46-53`: banco que **já existe** (`erp_evok_audio`, `erp_evok_audio_test`) **nunca reexecuta** o baseline. Logo **só uma migration nova instala o trigger nos bancos existentes**. Em banco novo, o dump congelado (sem o trigger) é aplicado e, na sequência, a migration nova roda — pois só as 159 migrations **anteriores** são marcadas como aplicadas (`:270`). Convergem. **Mas o dump `00_baseline_frozen.sql` fica desatualizado em relação ao schema efetivo** | **Média — decisão de manutenção do baseline, item D6** |
| **B5** | `20260806-000080` está em `STILL_RUN_AFTER_FROZEN` (`:80-86`) — **roda depois** do dump congelado em todo banco novo, reconcedendo o GRANT amplo | Se a estratégia incluísse `REVOKE`, ele seria **desfeito** em todo provisionamento novo. Mais um motivo para **não** apoiar a correção em `REVOKE` | **Confirmatória de §3.3** |

### `FILES_AFFECTED` (previsão de escopo, não implementação)

| Escopo | Arquivos | Colisão? |
|---|---|---|
| Correção (núcleo) | **1 migration nova** em `server/migrations/` (data > `20260812-000047`) | Nenhuma (§9) |
| Reteste | 1-2 arquivos novos em `server/tests/` | Nenhuma |
| Se D3 = preservar | `server/scripts/limpar-dados-transacionais.cjs` | **Churn em várias linhagens** (§9) |
| Se D6 = regenerar baseline | `server/database/postgresql/00_baseline_frozen.sql` | Nenhuma, mas é artefato congelado — **exige decisão** |
| Mascaramento (lacuna B, se entrar) | `server/src/models/AuditLog.ts` **ou** `server/src/services/auditLogService.ts` | **`auditLogService.ts` é do `CASE-008`** (§7) |

### `REGRESSION_RISK`

- **Imutabilidade em `audit_logs`, sozinha, sem `ENABLE ALWAYS`, sem tocar o script:
  BAIXO.** Nenhum caminho de aplicação, API ou teste faz `UPDATE`/`DELETE`.
- **Com `ENABLE ALWAYS`: MÉDIO** — B1 é certo, previsível e detectável, mas real.
- **Estendida a `sale_invoices` e `accounting_entries` (§1.1): ALTO** — regra
  condicional, fluxos fiscais/contábeis legítimos, e a única barreira atual
  (`UpdateEntryUseCase.ts:57-59`) é de aplicação. Outro caso.
- **Mascaramento retroativo sobre dado real: FORA da alçada de agente** — ato do dono.

---

## 7. Interação com o `CASE-008` (`AUD-DB-02`) — e a ordem recomendada

### 7.1 Estado atual do `CASE-008`, corrigido

O despacho descreve o `CASE-008` como *"triado e ainda não despachado"*. **Isso mudou
antes desta triagem e o implementador precisa saber:** `APR-2026-053` (2026-08-17,
`coretriad/governance/APPROVALS.md:3341-3386`) **aprovou a Opção C, sem webhook**,
com escopo de quatro itens (`:3369-3375`):

| # | Item do `CASE-008` | Arquivo |
|---|---|---|
| 1 | Dreno da promessa destacada no shutdown | `server/index.ts` |
| 2 | Handlers de `unhandledRejection`/`uncaughtException` | arquivo novo |
| 3 | Fechar o `try` de `auditLogService.ts:67` | `server/src/services/auditLogService.ts` |
| 4 | Volume persistente para `logs/` | `docker-compose.yml` |

E: *"**Zero dos 268 call sites. Nenhuma mudança semântica:** `logAction` continua
fire-and-forget e continua não propagando erro ao chamador"* (`:3376-3377`).

### 7.2 Sobreposição de arquivos: **NENHUMA**

`CASE-008` toca `server/index.ts`, `auditLogService.ts`, um arquivo novo e
`docker-compose.yml`. `CASE-009` toca `server/migrations/` (arquivo novo),
`server/tests/` (arquivos novos) e, condicionalmente, `limpar-dados-transacionais.cjs`
e o dump congelado. **Interseção vazia.**

### 7.3 Sobreposição semântica: **NENHUMA — e isto eu provei**

A pergunta certa é: *a imutabilidade quebra o fallback ou o retry do `CASE-008`?*
**Não.** `auditLogService.ts:176-213` tem exatamente três caminhos de gravação —
degradado direto (`:178`), degradado pós-`22P02` (`:198`) e retry após 200 ms
(`:209`) — e **os três chamam `AuditLog.register`**, que faz **`AuditLog.create`**
(`AuditLog.ts:148`). O texto de `enum-literal-guard.test.ts:35` que diz *"regrava a
mesma linha"* descreve **um novo `INSERT`** com a `action` degradada, **não** um
`UPDATE` da linha anterior — a linha anterior nunca chegou a existir, porque o
`INSERT` foi rejeitado com `22P02`.

**Um bloqueio de `UPDATE`/`DELETE` é ortogonal a 100% do mecanismo do `CASE-008`.**

### 7.4 Ordem recomendada — **e a razão é o banco, não o merge**

**Recomendo: `CASE-008` primeiro, `CASE-009` depois.** Duas razões técnicas, nenhuma
de conflito de arquivo:

1. **O `CASE-008` está aprovado e o `CASE-009` ainda não** (`D1`-`D6` abertos).
   Sequenciar o não-decidido à frente do decidido só cria espera.
2. **Razão substantiva:** o item 1 do `CASE-008` (dreno no shutdown) e o item 4
   (volume) aumentam a chance de o evento **chegar** à tabela. `CASE-009` garante
   que, uma vez chegado, ele **fica**. Fazer o segundo antes do primeiro protege
   perfeitamente uma trilha que continua perdendo eventos em todo deploy — a ordem
   inversa entrega menos valor pelo mesmo custo.

**Não há dependência dura em nenhuma direção.** Se o director preferir paralelizar,
é seguro: as superfícies não se tocam (§7.2, §7.3). **Sequenciamento é do director.**

---

## 8. Critério de reteste — o **ANTI-CRITÉRIO primeiro**

### 8.1 ANTI-CRITÉRIO — o que **não prova nada**, e por quê

1. **"Existe um trigger `trg_audit_logs_immutable`."** Um teste que lê
   `00_baseline_frozen.sql` (ou a migration) e afirma que a string existe **passa
   pela mesma razão que qualquer `grep` passa**: porque o texto foi escrito. Não diz
   se o trigger está **instalado no banco**, se está **habilitado**, nem se **recusa**
   alguma coisa.
2. **"A migration roda sem erro."** Prova que o SQL é sintaticamente válido. Um
   trigger que retorna `NEW` sem checar nada também roda sem erro.
3. **"`\d+ audit_logs` mostra o trigger"** — é o item (a) da
   `RETEST_SPECIFICATION` original do finding (`FIND-ERP-002:134`). Melhor que 1 e 2,
   e ainda insuficiente: mostra existência, não eficácia, e **não vê o modo
   `ORIGIN` × `ALWAYS`** que é justamente onde o bypass mora (§3.4, §5.2).
4. **"Nenhum código chama `AuditLog.update`."** Já é verdade **hoje**, no
   `AUDIT_COMMIT` (§4.1). Passa antes e depois. Vácuo.
5. **Qualquer teste que mocke o model e afirme que `create` foi chamado.** É o
   anti-critério herdado do `CASE-008` §9.1 — mede chamada, não sobrevivência.

> O defeito **não é** a ausência de um objeto no schema. É que **um `UPDATE`/`DELETE`
> real não é recusado**, e que **o caminho que a operação de fato usa contorna a
> recusa**.

### 8.2 O que o reteste tem de **provar** — e como ele **REPROVA** o `AUDIT_COMMIT`

| ID | Afirmação | Por que REPROVA hoje | Ambiente |
|---|---|---|---|
| **R1 — recusa de `UPDATE`** | Inserir uma linha em `audit_logs` e tentar `UPDATE audit_logs SET new_values = '{}' WHERE id = <linha>`: a query **falha** com exceção do banco | No `AUDIT_COMMIT` não há trigger nenhum (§2.1) → o `UPDATE` **sucede** → o teste falha | **`erp_evok_audio_test` apenas.** Pedido `DYN` — nunca produção |
| **R2 — recusa de `DELETE`** | Idem para `DELETE FROM audit_logs WHERE id = <linha>` | Idem | Idem |
| **R3 — a recusa não é contornável pelo caminho que a aplicação usa** | Dentro de uma transação, `SET LOCAL session_replication_role = 'replica'` e então `DELETE FROM audit_logs`: **ainda falha** | Hoje falha por dois motivos: não há trigger; e, mesmo com um trigger em modo `ORIGIN`, o `replica` o desligaria (A3). **Este é o teste que separa correção de teatro** — é literalmente o caminho de `limpar-dados-transacionais.cjs:266-270` | Idem |
| **R4 — o `INSERT` legítimo continua passando** | `AuditLog.register(...)` grava normalmente; retry e degradação continuam funcionando | Regressão. Deve estar **verde antes e depois** — é controle, não critério | Unitário com mock (§8.3) |
| **R5 — guarda estática do modo do trigger** | Ler o artefato de schema/migration e afirmar que o trigger de `audit_logs` está declarado como `ENABLE ALWAYS` (se D3 assim decidir) | Fecha o ponto cego B3: `comparar-bancos.cjs` não compara trigger nenhum | Estático, sem banco. Estilo já praticado por `audit-coverage-guard.test.ts` |
| **R6 — guarda contra reintrodução do apagamento** | Ler `limpar-dados-transacionais.cjs` e afirmar que `audit_logs` está preservada **ou** que o script declara explicitamente o comportamento decidido em D3 | Hoje `audit_logs` não está em `PRESERVAR_EXATO` nem casa com `PRESERVAR_PADRAO` (§5.2) → reprova | Estático, sem banco |

**R1, R2 e R3 exigem banco.** Eles **não podem** rodar contra produção, e **não podem**
rodar no default de `DB_NAME`. Devem entrar como **pedido `DYN` escopado a
`erp_evok_audio_test`**, na fila que o `T-03` §5 já abriu — `DYN-T03-02`
(*"Como role de runtime: `UPDATE`/`DELETE` em `audit_logs`"*) e `DYN-T03-04`
(*"`pg_trigger WHERE NOT tgisinternal` — 13 e nenhuma nas 3"*) são exatamente estas
provas, já formuladas pela auditoria e **ainda não executadas**.

**Sem R1-R3, o reteste do `CASE-009` é estático e, portanto, incompleto.** Isso
precisa estar declarado — não convertido em "concluído com ressalva".

### 8.3 Restrições de segurança **obrigatórias** para quem implementar (Codex)

> **Leia antes de escrever a primeira linha.**

1. **`server/tests/setup.ts` tem 5 linhas e define apenas `NODE_ENV`** (lido
   integralmente; `:5` é `process.env.NODE_ENV = process.env.NODE_ENV || 'test'`).
   **`DB_NAME` cai no default do schema de ambiente, que é o nome do banco de
   produção real.** Armadilha já confirmada nos `CASE-007` e `CASE-008`; **confirmada
   aqui pela terceira vez**.
2. **`auditLogService.ts:14` faz `require('../models/AuditLog')`**, e
   `AuditLog.ts:20` importa `../config/database`, que instancia `new Sequelize` no
   carregamento do módulo. **A construção não abre socket — qualquer query abre**,
   contra o banco de produção.
3. **Portanto: todo teste unitário deste caso DEVE mockar o model.** O padrão correto
   já existe: `server/tests/unit/audit-log-failure-alerting.test.ts:6-8` —
   `jest.mock('../../src/models/AuditLog', () => ({ register: jest.fn() }))`, com
   `jest.resetModules()` e `require` tardio. **Nunca deixe um `create()` real rodar.**
4. **R1-R3 não são teste unitário.** São `DYN`, contra `erp_evok_audio_test`, com
   autorização própria. `run-api-suite.cjs` já tem a guarda de sufixo `_test`/`_ci`
   no início de `main()`; `limpar-dados-transacionais.cjs` **não tem** (§5.2) — não o
   use como referência de segurança.
5. **Não tocar:** `server/package.json` (`CASE-003`/`004`/`006`), `docker-compose.yml`
   e os três `.env*.example` (`CASE-005`, **não mesclado**), `server/index.ts` e
   `auditLogService.ts` (`CASE-008`, `APR-2026-053`), `server/app.ts` e
   `src/middlewares/auth.ts` (`CASE-007`), `src/config/runtimeEnv.ts` (`CASE-005`).
6. **Não escrever** em `audit/`, `coretriad/`, `.claude/`, `docs/`.
7. **Não declarar** `FINDING CLOSED`, `RETEST_PASSED` nem `REMEDIATION_COMPLETE`
   (Regras 3 e 4).

---

## 9. Colisões — verificado por conta própria

**Confirmo a verificação do director: nenhuma branch ativa toca `AuditLog.ts` nem
`auditLogService.ts`.** Método: `git diff --name-only main...<branch> -- server/
docker-compose.yml` (três pontos = mudanças do lado da branch) para as **sete**
branches `sana/ERP-LEGACY-001/*` e as sete worktrees correspondentes.

| Branch | Toca `AuditLog.ts` / `auditLogService.ts` / `00_baseline_frozen.sql`? | Território relevante |
|---|---|---|
| `CASE-003` | **Não** | `server/package.json` |
| `CASE-004` | **Não** | `itemController.ts`, `employeeController.ts`, 3 testes, `package.json` |
| `CASE-005` | **Não** | **`docker-compose.yml`**, **`.env.example`**, `server/.env.example`, `runtimeEnv.ts`, `.github/workflows/server-ci.yml`, 5 testes |
| `CASE-006` | **Não** | items/products/mobileInventory + serviços de estoque |
| `CASE-007` | **Não** | `server/app.ts`, `src/middlewares/auth.ts`, `rateLimitPolicy.ts` |
| `CASE-008` | **Não** (ainda sem implementação; escopo aprovado em §7.1) | `server/index.ts`, `auditLogService.ts`, `docker-compose.yml` |
| `FIND-ERP-005` | **Não** | módulo `juridico` + **`server/migrations/20260814-000048-…cjs`** |

Ressalvas que o implementador precisa levar em conta:

- **Espaço de nomes de migration.** `FIND-ERP-005` já adiciona
  `20260814-000048-jur-approval-thresholds-and-authority-find-erp-005.cjs`, enquanto a
  última migration em `main` é `20260812-000047`. Não é conflito de arquivo, mas a
  migration do `CASE-009` deve escolher data/sequencial que **não colida** com ela.
- **`server/scripts/limpar-dados-transacionais.cjs` tem churn em várias linhagens.**
  Ele aparece no diff de `CASE-003`, `004`, `006`, `007` e `008` (herança da mesma
  base de comentários de `APR-2026-016`/`CE-03`) e é o único arquivo alterado entre o
  `AUDIT_COMMIT` e o `HEAD` no escopo relevante. Está idêntico entre `HEAD` e a
  branch do `CASE-008` (diff vazio). **Se D3 mandar preservar `audit_logs` nesse
  script, é conflito a levantar e a sequenciar com o director — não a resolver
  sozinho.**
- **`docker-compose.yml` e os três `.env*.example` são território do `CASE-005`,
  ainda não mesclado.** **A estratégia que recomendo (§3.3, trigger) não precisa de
  nenhum deles** — este caso não depende de `CASE-005`. Isso **só** mudaria se a
  estratégia migrasse para `REVOKE`, que exigiria trocar `DB_USER` (`AUD-DB-01`) —
  e aí seria conflito direto com `CASE-005` **e** com `CASE-008` item 4. **Mais um
  motivo para não apoiar a correção em `REVOKE`.**
- **`server/package.json` está fora** (`CASE-003`/`004`/`006`) — e, felizmente, este
  caso não tem razão para tocá-lo.

---

## 10. Campos formais da triagem

- **`ROOT_CAUSE`** — A política de imutabilidade do sistema foi decidida **módulo a
  módulo** (13 triggers em RH/JUR/SST, instalados por migrations de módulo como
  `20260808-000014`), **nunca como política uniforme do schema**. A tabela de maior
  valor probatório do sistema — `audit_logs` — é anterior a esse padrão e nunca foi
  reprocessada por ele. A causa é **agravada por desenho**, não só por omissão:
  `20260806-000080…cjs:105-108` estabelece, via `ALTER DEFAULT PRIVILEGES`, que **a
  postura padrão de toda tabela do schema, inclusive futura, é "alterável e
  apagável"**. Somando-se a isso, a regra *"audit log não se atualiza nem se apaga"*
  **não tem onde morar no código** — o caminho de escrita vive em `src/services/`,
  fora de qualquer módulo, sem repositório e sem camada de domínio (`T-03` §4) —, de
  modo que não existe lugar, nem no banco nem na arquitetura, onde a regra pudesse
  ser expressa. **Demonstrada, não hipotética:** cada elo acima foi lido em artefato
  versionado (§2).
- **`LOCAL_FIX`** — Uma migration criando função + trigger `BEFORE UPDATE OR DELETE`
  em `audit_logs`, no molde de `20260808-000014-create-hr-employee-contracts.cjs:69-100`,
  com `down()` simétrico. **Fecha o item 1 do finding e nada mais.**
- **`SYSTEMIC_FIX_REQUIRED`** — **Sim**, em três eixos distintos e não intercambiáveis:
  (a) `sale_invoices` e `accounting_entries`, que são o resto do mesmo finding (§1.1);
  (b) a **postura padrão** do schema (`ALTER DEFAULT PRIVILEGES`), que faz toda tabela
  futura nascer mutável — endereçável de verdade só depois de `AUD-DB-01`;
  (c) o par **mascaramento × retenção** (§4.2, §4.3), que é o que determina se a
  imutabilidade pode ser incondicional ou precisa nascer com porta de expurgo (§4.4).
- **`BLAST_RADIUS`** — §6. Aplicação, API e suíte de testes: **nulo** (provado).
  Fora da aplicação: script de limpeza (B1), backfills futuros (B2), ponto cego da
  guarda de drift (B3), sincronia do dump congelado (B4).
- **`FILES_AFFECTED`** — §6, tabela. Núcleo: **1 migration nova + 1-2 testes novos.**
- **`REGRESSION_RISK`** — **BAIXO** para `audit_logs` sozinha sem `ENABLE ALWAYS`;
  **MÉDIO** com `ENABLE ALWAYS` (quebra certa e previsível do script de limpeza);
  **ALTO** se estendido às outras duas tabelas do finding.

---

## 11. O que devolvo para decisão humana (Regra 6, Regra 18)

| # | Decisão | Por que não é minha |
|---|---|---|
| **D1** | **Escopo do `CASE-009`:** só `audit_logs`, ou as três tabelas do `FIND-ERP-002` (`sale_invoices`, `accounting_entries`)? Recomendação técnica: só `audit_logs`; as outras duas como caso próprio (§1.1) | Escopo de caso é do director; e as regras das outras duas são fiscais/contábeis, não técnicas |
| **D2** | **Ordem em relação ao passivo:** O1 (mascarar/expurgar antes), O2 (congelar já e aceitar), O3 (congelar com porta de expurgo)? **Só O2 é executável sem decisão nova** (§5.1) | Envolve dado pessoal real, direito de titular e ato sobre produção |
| **D3** | **`ENABLE ALWAYS` sim ou não** — e, se sim, o que acontece com `limpar-dados-transacionais.cjs`: ele quebra, ou `audit_logs` entra em `PRESERVAR_EXATO`? Note que preservar **é** decidir retenção pela porta dos fundos (§4.4, §5.2) | Muda uma rotina operacional do dono e antecipa política de retenção |
| **D4** | **Mascaramento (lacuna B):** entra neste caso ou vira caso próprio? Se entrar: allowlist ou denylist, e **qual é a lista**? (`lgpdController.ts:120` grava pedido de titular inteiro) | Lista de campo sensível é decisão jurídica/negócio |
| **D5** | **Retenção/expurgo (`BR-IAM-034`, hoje `UNKNOWN`):** haverá política? Qual prazo, qual base legal, expurgo é apagar ou anonimizar? O código já invoca **LGPD art. 37** (`auditActions.ts:135-138`) | Regra de negócio inexistente + leitura jurídica. **Regra 6** |
| **D6** | **Manutenção do baseline congelado:** `00_baseline_frozen.sql` é regenerado para refletir o trigger, ou fica declaradamente defasado (com a migration como fonte)? (B4) | Artefato congelado por decisão anterior |
| **D7** | **Autorizar os pedidos `DYN` R1-R3 contra `erp_evok_audio_test`** — sem eles, o reteste deste caso é apenas estático (§8.2). `DYN-T03-02` e `DYN-T03-04` já estão na fila do `T-03` §5, não executados | Execução contra banco exige autorização humana explícita, caso a caso (`APR-2026-016`) |
| **D8** | **Sequenciamento com `CASE-008`** (aprovado por `APR-2026-053`). Recomendação técnica: `CASE-008` primeiro (§7.4). Não há dependência dura em nenhum sentido | Director |

**Recomendação técnica que não invade nenhuma dessas decisões:** a estratégia é
**TRIGGER**, não `REVOKE` (§3.3), e isso vale sob **qualquer** resposta a D1-D8 — porque
`REVOKE` é inócuo contra a credencial de runtime atual (A1), é desfeito no
provisionamento de banco novo (B5), e exigiria invadir território de dois outros
casos abertos (§9). Isto é escolha de mecanismo, não de política.

---

## 12. Divergências e acréscimos registrados (Regra 21)

Nenhum altera a direção nem a severidade (Regra 18); todos afetam a execução.

1. **Estado do `CASE-008` desatualizado no despacho.** Ele não está apenas "triado e
   não despachado": foi **aprovado por `APR-2026-053`** em 2026-08-17, Opção C sem
   webhook, escopo de quatro itens (§7.1).
2. **`FIND-ERP-002:66-69,118,120,123` afirma que `evok_app` é "a credencial que a
   própria API usa em produção".** Incorreto no `AUDIT_COMMIT` — confirmei por
   leitura própria (`20260806-000080…cjs:18-24`, `docker-compose.yml:49`). A
   retificação do `T-03` §2 (`:145-155`) está certa, e **agrava**.
3. **Acréscimo material (achado novo desta triagem):** existe um script versionado —
   `limpar-dados-transacionais.cjs` — que **apaga `audit_logs` inteiro** e que **já
   usa `session_replication_role='replica'`**, isto é, o próprio bypass de trigger.
   Nem o finding nem a validação adversarial nem o `T-03` registram isso. É,
   simultaneamente, o vetor de destruição mais provável da trilha hoje e a prova de
   que a defesa por trigger em modo `ORIGIN` seria contornada pelo caminho que o
   projeto **de fato usa** (§5.2).
4. **Acréscimo:** nenhum dos 13 triggers existentes é `ENABLE ALWAYS` (§2.3) —
   portanto **a proteção de imutabilidade de RH/JUR/SST também é contornada** por
   aquele script. Isso não é finding deste caso; **registro para a VeriCore avaliar
   como finding próprio**, e não remedio aqui.
5. **Acréscimo:** `comparar-bancos.cjs`, a guarda de drift entre bancos, **não
   compara triggers** (zero ocorrências de `trigger`/`pg_trigger` no arquivo) —
   ponto cego de verificação que o teste R5 fecha parcialmente (§6.2 B3).
6. **Precisão sobre a `RETEST_SPECIFICATION` original** (`FIND-ERP-002:134-138`): o
   item (a) — *"`\d+ audit_logs` mostra trigger… e uma tentativa de `UPDATE`/`DELETE`
   falha"* — é necessário mas **não suficiente**, porque não distingue modo `ORIGIN`
   de `ALWAYS` e portanto não cobre o bypass do §5.2. O critério R3 (§8.2) é o
   acréscimo obrigatório.
7. **Resposta explícita à pergunta do despacho sobre a suíte:** **não existe rotina
   de teste que limpe `audit_logs` entre casos.** `DELETE FROM` e `.destroy(` em todo
   `server/tests`: **zero ocorrências**. A imutabilidade **não quebra a suíte** (§6.1).

---

## 13. Critério de conclusão da triagem — autoavaliação

| Critério | Estado |
|---|---|
| Causa-raiz **demonstrada**, não hipótese | **Sim** — §10, cada elo lido em artefato versionado (§2), incluindo o `ALTER DEFAULT PRIVILEGES` que torna a postura padrão do schema parte da causa |
| Pergunta trigger × grant respondida, com grau de certeza | **Sim** — §3, com PROVADO (P1-P7) e ASSUMIDO (A1-A5) separados e graduados. **Conclusão: TRIGGER; caso independente de `AUD-DB-01`, com teto declarado** |
| Escopo real delimitado com citação | **Sim** — §1: `audit_logs` **é** o item 1 do finding; `T-03` não estendeu escopo. Decisão de recorte devolvida em D1 |
| Três lacunas separadas, com custo | **Sim** — §4.1 (baixo/técnico), §4.2 (médio/jurídico parcial), §4.3 (alto/jurídico), e a contradição A×C em §4.4 |
| Passivo de dado **enunciado, não decidido** | **Sim** — §5.1, três ordens com preço; §5.2 acrescenta o agravante do script |
| Blast radius mapeado | **Sim** — §6, separando o que **não** quebra (provado) do que quebra |
| Interação e ordem com `CASE-008` respondidas | **Sim** — §7: zero sobreposição de arquivo e de semântica (provado em §7.3); ordem recomendada com razão substantiva |
| Critério **e** anti-critério de reteste | **Sim** — §8.1 e §8.2, com R3 provando que a recusa não é contornável pelo caminho real |
| Colisões verificadas por conta própria | **Sim** — §9, sete branches e sete worktrees |
| PROVADO × ASSUMIDO separados | **Sim** — §3.1/§3.2 explicitamente; e cada afirmação de risco marcada |
| Regra permanente de dado real cumprida | **Sim** — cabeçalho; nenhuma conexão aberta, nenhum comando de diagnóstico, nenhuma suíte |

**Estado do caso:** `TRIAGED — AGUARDANDO DECISÃO HUMANA (D1-D8)`.
Nada implementado. Nenhum worktree, nenhuma branch, nenhum arquivo de código.
Despacho ao `sanacore-remediation-engineer` (Codex, `APR-2026-051`) fica condicionado
a **D1** (escopo) e **D2/D3** (ordem em relação ao passivo e modo do trigger). Sem
elas, o caso não é executável sem inventar regra de negócio ou alterar unilateralmente
uma rotina operacional do dono.
