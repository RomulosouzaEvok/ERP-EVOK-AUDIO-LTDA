# TRIAGE — `ERP-LEGACY-001-CASE-015` · `AUD-DB-01`

```
CASE_ID:        ERP-LEGACY-001-CASE-015
FINDING_ID:     ERP-LEGACY-001-AUD-001 / AUD-DB-01
TITULO:         A credencial de runtime e superusuario; a role de privilegio
                minimo existe e nunca foi ativada
SEVERIDADE:     HIGH (estrato 2, PRODUCAO REAL por APR-2026-016)
FILA:           T-39 estrato 2, item 3 (REMEDIATION_BACKLOG.md:107)
AUDIT_COMMIT:   c1311a6f76b512fef893f7e60d934179cae3409f
HEAD LIDO HOJE: 53a18b5 (branch audit/ERP-LEGACY-001-AUD-001/2026-08-16)
DATA:           2026-08-18
PAPEL:          sanacore-remediation-triage
VEREDITO:       **BLOQUEADO POR DECISAO DO DONO** — nenhum CODEX_REMEDIATION_DISPATCH
                foi emitido. Perguntas formuladas em PENDING_DECISION.md
```

> **Regra de dado real observada integralmente.** Nenhuma conexão de banco foi
> aberta nesta triagem — nem a `erp_evok_audio`, nem a `erp_evok_audio_test`.
> Todo o conteúdo abaixo vem de leitura de artefato versionado. As duas únicas
> medições sobre arquivos não versionados (`.env`, `server/.env`) são
> **contagens de existência de chave** (`grep -c '^CHAVE='`), sem imprimir nem
> transportar valor algum. O que exigiria banco está declarado como
> **não verificado**, nunca inferido.

---

## 1. O finding ainda reflete o código? SIM — reconfirmado hoje, arquivo:linha

O `AUDIT_COMMIT` é de 2026-08-16. Reli os arquivos citados no HEAD atual
(`53a18b5`). **Nada mudou. As quatro âncoras do finding estão intactas:**

| Âncora do finding | Estado hoje (`53a18b5`) | Verbatim |
|---|---|---|
| `docker-compose.yml:49` | **inalterado** | `DB_USER: evok_admin` |
| `server/.env.example:16` | **inalterado** | `DB_USER=evok_admin` |
| `...-000080...cjs:4-9` | **inalterado** | descreve `evok_admin` como superusuário |
| `...-000080...cjs:18-24` | **inalterado** | *"esta migration APENAS CRIA a role … Ela NAO troca a credencial ativa em uso"* |
| `docker-compose.prod.yml:91` | **inalterado** | `DB_USER: ${APP_DB_USER:-evok_app}` — compose **não exercitado** (`:3-8`) |

Âncoras adicionais que o finding não cita e que **agravam a superfície** (todas
lidas hoje):

- `docker-compose.yml:8` — `POSTGRES_USER: evok_admin` e `:22` healthcheck
  `pg_isready -U evok_admin`: o superusuário é também o dono do cluster/schema.
- `.env.example:16` e `.env.docker.example:7` — `DB_USER=evok_admin` nos **três**
  arquivos de exemplo do repositório, não só no de `server/`.
- `server/config/sequelize-cli.config.cjs:26` —
  `username: process.env.DB_USER || 'evok_admin'`: **a mesma variável que serve
  o runtime serve as migrations** (§4.3, achado adicional).

**Conclusão da reprodução estática:** `AUD-DB-01` é **REPRODUZIDO**, não
hipótese. A credencial de runtime declarada para o banco que `APR-2026-016`
(`APPROVALS.md:329-344`) define como **produção real** é o superusuário
`evok_admin`, e a role de privilégio mínimo `evok_app` — desenhada
corretamente — segue desativada.

### 1.1 O que ainda não é verificável sem banco (declarado, não inferido)

- Se `evok_app` **existe** hoje no cluster de produção e com que ACL. A única
  evidência versionada é `coretriad/infra/CODEX_ENGINE_SETUP.md:34,72`, que
  registra a `datacl` medida em 2026-08-17:
  `erp_evok_audio | {=T/evok_admin,evok_admin=CTc/evok_admin,evok_app=c/evok_admin}`
  → `evok_app` **tem `CONNECT`** em produção. Isso é evidência de terceiro,
  versionada, e eu **não a reconfirmei** (exigiria conexão).
- Se os `GRANT`s de DML de `evok_app` estão íntegros em produção hoje. Não
  observável (`RES-T03-01`, `APR-2026-016`).
- **Qual é a senha da role `evok_app` em produção** — ver §5.1, é o nó do caso.

---

## 2. ROOT_CAUSE — causa-raiz demonstrada

**A causa-raiz não é "falta a role". A role existe, está correta e está
desligada. A causa-raiz é que a ativação foi desenhada como um ato manual
humano, sem mecanismo, e nunca aconteceu.**

Cadeia, com evidência linha a linha:

1. `server/migrations/20260806-000080-create-app-role-least-privilege.cjs:53-62`
   cria `evok_app WITH LOGIN … NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`.
   O desenho está certo.
2. A **mesma** migration, `:18-24`, declara em texto que **não** troca a
   credencial ativa, e remete a troca a *"um passo manual separado … a ser feito
   quando apropriado"*.
3. `docs/database/05-ACESSOS_E_ISOLAMENTO.md:149-164` registra a decisão
   explícita de **não aplicar** a troca em 2026-08-06 (motivo declarado: backend
   e frontend estavam em uso naquele momento) e `:166-190` documenta o
   procedimento manual de 5 passos.
4. `docker-compose.yml:49` continua com o literal `evok_admin` — e é este o
   compose que sobe o banco com os 327 insumos reais (`APR-2026-016`).
5. `docker-compose.prod.yml:79-92` **acerta** (usa `evok_app` por padrão e
   explica, em `:84-86`, exatamente por que ser default e não recomendação:
   *"seguranca que depende de alguem lembrar de trocar uma variavel no dia do
   deploy nao acontece"*) — mas esse arquivo é, por declaração própria
   (`:3-8`), **esqueleto não exercitado**.

**O defeito, em uma frase:** o repositório provou que sabe qual é a forma
correta (`prod.yml`) e aplicou essa forma **somente ao arquivo que ninguém
usa**, deixando produção real com o superusuário — o controle existe, e a
ativação depende de alguém lembrar, que é exatamente o modo de falha que o
próprio `prod.yml:84-86` diz não aceitar.

### 2.1 Por que isso é HIGH e não cosmético — o poder concreto do superusuário

`evok_admin` é superusuário (`...-000080...cjs:4-9`;
`docs/database/05-ACESSOS_E_ISOLAMENTO.md:12-21` traz a introspecção real de
`pg_roles`: `rolsuper=t, rolcreaterole=t, rolcreatedb=t`). Com isso, quem
alcança o runtime da API (vazamento de `DB_PASSWORD`, comprometimento do
contêiner `api`, SQL injection residual) obtém, **além** de DML nas tabelas de
negócio:

- `ALTER TABLE … DISABLE TRIGGER ALL` — dono da tabela é `evok_admin`;
- `SET session_replication_role = 'replica'` — só superusuário;
- `TRUNCATE` em qualquer tabela;
- `DROP DATABASE`, `CREATE ROLE`, leitura de `SequelizeMeta`/`SequelizeData`.

Ou seja: **a defesa em profundidade do schema inteiro (as 13 triggers de
imutabilidade de RH/JUR/SST) é revogável por um comando** enquanto o runtime
for superusuário.

---

## 3. Relação com a ressalva residual de `CASE-009` — `AUD-DB-01` é a causa-raiz dela

Registro exigido pelo despacho, e ele se sustenta na evidência:

**Ressalva residual de `CASE-009` (FIND-ERP-002), confirmada por execução real
de SQL:**

- `coretriad/states/ERP-LEGACY-001/SECOND_OPINION_CASE-002_004_009.md:105-107`
  — *"sem defesa contra `TRUNCATE` … nem contra `ALTER TABLE ... DISABLE
  TRIGGER` por um role com privilégio suficiente"*.
- `coretriad/states/ERP-LEGACY-001/QUEUE_STATUS.md:55` — reteste dinâmico real:
  R3 (`DELETE` sob `session_replication_role='replica'`) **bloqueado**, o que
  valida o `ENABLE ALWAYS TRIGGER`; e **`TRUNCATE` confirmado não bloqueado**.
  Estado do caso: `RETEST_PASSED_COM_RESSALVA`.
- `remediation/cases/ERP-LEGACY-001-CASE-009/TRIAGE.md:177` (P5) e `:197-198`
  (A4/A5) já anteciparam isto — inclusive A5 já diz, textualmente, que importa
  *"para o cenário pós-`AUD-DB-01`: se `evok_app` não for dona nem puder setar o
  parâmetro, o trigger torna-se **inviolável pelo runtime**"*.
- A segunda voz de `T-03` chegou à mesma conclusão pelo outro lado
  (`T-03_AUDIT_LOG_REPORT.md:146-155`): *"adicionar trigger nas 3 tabelas é
  necessário e **insuficiente** enquanto a credencial de runtime for
  superusuário"*.

**Vínculo técnico, explicitado:**

| Vetor de bypass da imutabilidade | Como superusuário (`evok_admin`, hoje) | Como `evok_app` (pós-remediação) |
|---|---|---|
| `UPDATE`/`DELETE` direto | bloqueado pelo trigger (CASE-009, provado R1/R2) | bloqueado pelo trigger |
| `session_replication_role='replica'` | bloqueado por `ENABLE ALWAYS` (provado R3) | idem, **e** o `SET` já exigiria superusuário |
| `ALTER TABLE … DISABLE TRIGGER` | **POSSÍVEL** — é dono da tabela | **recusado** — exige ser dono da tabela; `evok_app` não é dono (o schema é de `evok_admin`) |
| `DROP TRIGGER` | **POSSÍVEL** | **recusado** — mesmo motivo |
| `TRUNCATE audit_logs` | **POSSÍVEL** — ressalva confirmada por execução | **recusado** — `TRUNCATE` exige privilégio `TRUNCATE` na tabela, que os `GRANT`s de `...-000080...cjs:79` **não concedem** (`SELECT, INSERT, UPDATE, DELETE` apenas) |

**Benefício cruzado (registrado como tal, não como fechamento):** remediar
`AUD-DB-01` fecha, **pelo lado do privilégio**, os dois vetores residuais que
`CASE-009` declarou explicitamente fora do seu escopo — `DISABLE TRIGGER` e
`TRUNCATE`. É a resposta arquitetural correta para a ressalva: ela não se fecha
com mais trigger, fecha-se com menos privilégio.

**Limites deste registro, para não induzir a erro:**

1. Isto **não fecha nem reclassifica** `FIND-ERP-002` nem `CASE-009`. Autoridade
   de `RETEST_PASSED`/`FINDING CLOSED` é exclusiva da VeriCore (Regra 4).
2. A afirmação sobre `TRUNCATE` é **derivada dos `GRANT`s declarados na
   migration**, não de sondagem. Precisa de prova dinâmica —
   `DYN-CASE015-04` na §7.
3. O benefício vale contra **quem alcança o runtime**. Não protege contra quem
   já tem a credencial administrativa (`evok_admin` continua existindo, e é
   isso que uma role de aplicação é: contenção do raio, não eliminação do risco).
4. `ALTER DEFAULT PRIVILEGES … GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO
   evok_app` (`...-000080...cjs:105-112`) — o agravante que a segunda voz de
   `T-03` registrou em `:139-144` — **sobrevive** à remediação de `AUD-DB-01`:
   toda tabela futura nasce `UPDATE`/`DELETE`-ável por `evok_app`. Qualquer
   imutabilidade futura exigirá `REVOKE` explícito. **Isto não é escopo deste
   caso e não deve ser silenciosamente absorvido por ele.**

---

## 4. BLAST_RADIUS — honesto, e é aqui que o caso é difícil

A troca da credencial de runtime **pode derrubar a aplicação inteira**. A
pergunta não é "`evok_app` tem os grants?" — é "**quais caminhos de código
compartilham a variável `DB_USER` com o runtime?**". Mapa real, lido hoje:

### 4.1 Runtime da API — o que `evok_app` precisa e TEM

| Necessidade em runtime normal | `evok_app` cobre? | Evidência |
|---|---|---|
| `SELECT/INSERT/UPDATE/DELETE` nas tabelas de negócio | **SIM** | `...-000080...cjs:70-83` + `...-000041...cjs:70-83` (reaplicação idempotente) |
| Tabelas criadas por migrations futuras | **SIM** | `ALTER DEFAULT PRIVILEGES` (`...-000080...cjs:105-112`; `...-000041...cjs:104-115` corrige para `current_user`) |
| Sequences (`SERIAL`/`IDENTITY` em `INSERT`) | **SIM** | `...-000080...cjs:86-99` (`USAGE, SELECT`) |
| `CONNECT` no banco + `USAGE` no schema | **SIM** | `...-000080...cjs:65-66` |
| `pg_advisory_xact_lock(...)` — numeração de OP/OM/MPS/RQ | **SIM**, não exige privilégio especial | `SequelizeProductionOrderRepository.ts:117`, `SequelizeMaintenanceRepository.ts:71`, `SequelizeMasterProductionPlanRepository.ts:168`, `SequelizePurchaseRequisitionRepository.ts:130` |
| DDL no boot (`sync({alter})`) | **NÃO PRECISA** — foi removido | `server/config/db.ts:16-20` lança erro explícito se `DB_FORCE_SYNC`/`DB_AUTO_ALTER`/`DB_ALLOW_UNSAFE_ALTER`; `runtimeEnv.ts:143-163` proíbe os três em produção |
| Seeds no boot (`seedDatabase()`) | **SIM** — é DML | `server/config/db.ts:23`; `src/config/seeds.ts` grava em `users`/`directorates`/`departments`/`categories`, todas tabelas de negócio |
| Ler `SequelizeMeta`/`SequelizeData` | **NÃO tem — e não precisa** | excluídas em `...-000080...cjs:40`; varredura de `SequelizeMeta` em `server/src` = **0 ocorrências de runtime** (só a string do nome de erro `SequelizeDatabaseError` em `errorHandler.ts:26,109`) |

**Veredito parcial:** para o **runtime da API**, `evok_app` é suficiente pelo
desenho declarado, e há prova real anterior registrada
(`docs/database/05-ACESSOS_E_ISOLAMENTO.md:131-140`: login, `SELECT` em
`products` com 646 linhas, `INSERT`+sequence, `UPDATE`/`DELETE` OK; `CREATE
TABLE`/`DROP TABLE`/`SequelizeMeta` recusados). **Não reconfirmei isso** — é
evidência de 2026-08-10.

### 4.2 O que QUEBRA — credencial de MIGRATION/DEPLOY e scripts administrativos

Tudo abaixo lê **a mesma** `DB_USER` e **exige** privilégio que `evok_app`
deliberadamente não tem:

| Consumidor de `DB_USER` | O que exige | Efeito se `DB_USER=evok_app` |
|---|---|---|
| `server/config/sequelize-cli.config.cjs:26` (todas as migrations: `npm run migration:up/down/status`) | DDL + `SequelizeMeta` | **QUEBRA TOTAL** — `permission denied for schema public` e `permission denied for table SequelizeMeta` |
| `server/scripts/apply-pending-migrations.cjs` | idem | **QUEBRA** |
| `server/scripts/limpar-dados-transacionais.cjs:266` | `SET LOCAL session_replication_role='replica'` (**superusuário**) | **QUEBRA** |
| `server/scripts/comparar-bancos.cjs` | introspecção ampla | quebra parcial/total |
| `server/scripts/criar-aprovador.cjs`, `seed-usuarios-departamentos.cjs` | DML | provavelmente OK |
| `scripts/backup-postgres.sh` (`pg_dump`) | leitura ampla | quebra ou dump incompleto (`05-ACESSOS…:34` registra que hoje usa `evok_admin`) |
| `tests/integration/app-role-privileges-guard.test.ts` | ver §4.4 | vira **vacuamente verde** |

### 4.3 ACHADO ADICIONAL — o desenho **não separa** runtime de migration, e a documentação pede o impossível

`docs/database/05-ACESSOS_E_ISOLAMENTO.md:180-185` instrui, em negrito:
*"**Não trocar `DB_USER` usado pelas migrations** … Migrations devem sempre
rodar com `evok_admin`"*.

**Essa instrução é inexequível como o repositório está montado**, e isso é um
achado novo desta triagem, não do finding:

- `server/src/config/runtimeEnv.ts:10` — `dotenv.config()` (runtime da API,
  cwd `server/` → lê `server/.env`), variável `DB_USER`.
- `server/config/sequelize-cli.config.cjs:4-5` — carrega `server/.env` e depois
  a raiz `.env` (`dotenv` **não sobrescreve** var já definida → `server/.env`
  vence), e usa em `:26` a **mesma** `DB_USER`.

Existe **uma única variável** para dois papéis com requisitos opostos. Portanto:

- Trocar `DB_USER` em `server/.env` para ativar `evok_app` **também troca a
  credencial das migrations** → migration quebra.
- Cumprir a instrução da doc exige editar `.env` para trás e para frente a cada
  deploy — controle que depende de disciplina humana repetida, exatamente a
  classe `RC-PROC-01`.
- `docker-compose.prod.yml` resolve isso **por acidente de topologia**
  (`:88-90`: migrations rodam FORA do contêiner, com o `.env` do host; o
  contêiner recebe `APP_DB_USER`), não por contrato de configuração. E
  `docker-compose.yml` (o de produção real) **não** tem essa separação: o
  serviço `api` traz o literal `evok_admin` em `:49`.
- `docs/database/05-ACESSOS_E_ISOLAMENTO.md:192-200` registra que a role de
  migration dedicada **não foi criada**, por decisão consciente.

**Consequência para a remediação:** qualquer correção que apenas troque o valor
de `DB_USER` é uma armadilha. A correção mínima honesta precisa **criar o
contrato de duas credenciais** (runtime × administrativa/migration) nos três
caminhos de execução: contêiner Docker, API no host (`npm run dev`/`start`),
CLI de migration. **Isso é engenharia de configuração, não troca de senha.**

### 4.4 Ponto cego da guarda existente — a guarda pode ficar verde por não ver nada

`server/tests/integration/app-role-privileges-guard.test.ts` é boa e cobre o
essencial (não-superusuário `:47-67`; todas as tabelas com DML `:69-97`;
sequences `:99-114`; **ausência** de acesso a `SequelizeMeta` `:116-128`). Duas
fraquezas medidas por leitura:

1. `:33-35` — `describe.skip` se `integrationEnabled()` for falso: a guarda
   **não roda** na suíte unitária padrão. Uma regressão de ACL passa em CI
   silenciosamente.
2. `:70-84` — usa `information_schema.tables` e `information_schema.role_table_grants`.
   Essas views do `information_schema` **filtram pelo papel corrente**. Se a
   suíte rodar **conectada como `evok_app`** (o cenário criado justamente pela
   remediação deste caso), uma tabela sem nenhum privilégio **não aparece** em
   `information_schema.tables` — e a asserção "nada faltando" fica verde por
   cegueira. **A guarda precisa rodar com credencial administrativa, ou trocar
   para `pg_class`/`has_table_privilege`.** Este é exatamente o modo de falha
   que a migration `...-000041` foi criada para consertar (1 de 201 tabelas com
   grant no banco de teste) e que a guarda existe para impedir de voltar.

### 4.5 `FILES_AFFECTED` (previsão da triagem, não autorização de escrita)

Nenhum arquivo de `server/src/` (lógica de negócio) precisa mudar. A superfície
é de configuração, migration e teste:

```
docker-compose.yml                                     (serviço api: DB_USER)
docker-compose.prod.yml                                (alinhamento do contrato de 2 credenciais)
.env.example / .env.docker.example / server/.env.example
server/config/sequelize-cli.config.cjs                 (credencial administrativa separada)
server/src/config/runtimeEnv.ts                        (se o contrato virar variável validada)
server/scripts/{apply-pending-migrations,limpar-dados-transacionais,comparar-bancos}.cjs
server/tests/integration/app-role-privileges-guard.test.ts   (§4.4)
server/tests/unit/<nova guarda estática de compose/env>      (arquivo NOVO, ver §6)
server/migrations/<nova, opcional>                     (rotação/hardening da role — ver §5.1)
docs/database/05-ACESSOS_E_ISOLAMENTO.md               (drift: §149-190 descreveria estado velho)
```

### 4.6 `REGRESSION_RISK`

| Escopo | Risco | Fundamento |
|---|---|---|
| Preparar o contrato de 2 credenciais + guardas, **sem ativar** | **BAIXO-MÉDIO** | nenhum `server/src` tocado; risco concentrado em quebrar `npm run migration:*` de quem já usa o `.env` atual, e em compose com `${VAR:?}` (precedente `CASE-005`) |
| **Ativar** `evok_app` no runtime de produção | **ALTO** | superfície = 100% dos endpoints. Um `GRANT` faltando, ou senha divergente, = API **não sobe** ou falha no 1º request. Sintoma (`permission denied` em tudo) não aponta para a causa (`...-000041...cjs:21-25`) |
| Ativar sem antes rotacionar a senha de `evok_app` | **INACEITÁVEL** | ver §5.1 |
| Ativar sem separar a credencial de migration | **ALTO** | o próximo `migration:up` quebra; e §4.4 pode esconder a falha de ACL |

---

## 5. Este caso é executável agora? NÃO — e o motivo é decisão do dono

### 5.1 O nó: a senha de `evok_app` em produção provavelmente é a versionada

- `...-000080...cjs:36` define `DEV_DEFAULT_PASSWORD` (valor **não reproduzido
  aqui**) e `:48` a consome como fallback de `APP_DB_ROLE_PASSWORD` no
  `CREATE ROLE`.
- **Medição feita hoje, sem imprimir valor:** `APP_DB_ROLE_PASSWORD` está
  declarada em **0** dos dois `.env` vivos (`grep -c '^APP_DB_ROLE_PASSWORD='`
  → `.env` = 0, `server/.env` = 0). Ambos declaram `DB_USER=evok_admin`.
- `audit/.../T-18_APPSEC_SEGREDOS_DEPENDENCIAS.md:108-113` (`T18-F04`, MEDIUM)
  já registrou exatamente este vetor: *"Se a migration rodar sem
  `APP_DB_ROLE_PASSWORD` no ambiente, a role de aplicação nasce com senha
  conhecida por qualquer leitor do repositório"*.

**Inferência mínima e honesta:** não posso afirmar qual senha `evok_app` tem em
produção (exigiria banco, e a senha não é legível nem assim). Mas posso afirmar
que **nada no ambiente versionado nem nos `.env` vivos indica que a variável
tenha sido definida**, e o fallback existe. Logo: **ativar `evok_app` como
credencial de runtime sem rotacionar sua senha antes trocaria um superusuário
com senha forte por uma role de privilégio mínimo com senha publicada no
repositório.** Isso não é remediação — é troca de um HIGH por um vetor de acesso
direto.

E `ALTER ROLE evok_app WITH PASSWORD …` no cluster de produção **é** rotação de
credencial de produção.

### 5.2 A reserva de `APR-2026-049` alcança este caso? — leitura fundamentada

Li `APPROVALS.md:2991-3071` inteiro. Sendo preciso, porque a diferença importa:

- `APR-2026-049` **D3** (`:3042-3055`) reserva nominalmente a **rotação da chave
  JWT** de produção: *"gate humano pendente, sem prazo … Não decidir agora"*,
  com fundamento declarado do dono — invalidar todo token emitido exige janela
  combinada e aviso prévio. **Não menciona credencial de banco.**
- Portanto **não afirmo** que `APR-2026-049` D3, na letra, cobre `AUD-DB-01`.
  Fazer isso seria estender aprovação por analogia, que `APR-2026-016` proíbe.

**Mas o caso está bloqueado de todo modo, por três fundamentos independentes e
mais fortes que a analogia:**

1. **`APR-2026-016`** (`APPROVALS.md:329-344`) põe o banco de
   `docker-compose.yml` sob regime read-only reforçado **permanente**, e exige
   **aprovação humana caso a caso** para tocar dado/estado real — *"nunca por
   extensão"*. `ALTER ROLE … PASSWORD` e reinício da API de produção são atos
   de produção. **Nenhum agente pode executá-los.**
2. **Precedente literal, no mesmo espírito, negado por falta de autorização:**
   `APPROVALS.md:2967-2977` (`APR-2026-048`) registra que **nem uma tentativa de
   conexão que deveria falhar** foi executada contra produção, porque *"exigiria
   nomear o banco, e o hook bloqueia"* e *"para igualar o precedente é preciso
   **autorização humana explícita e escopada** … Caso a caso, nunca por
   extensão"*. Se conectar para provar recusa exige autorização, trocar a
   credencial de runtime exige mais.
3. **Ativar é ato operacional com indisponibilidade**, não patch: exige janela
   (reinício da API), rollback ensaiado (`05-ACESSOS…:186-190`) e alguém
   presente. Mesma classe de `PEND-2026-001` (`log_connections`, janela de
   manutenção) e o fundamento que o dono usou em D3: *"Não é decisão de
   madrugada."*

**Há ainda um efeito que torna até a parte "só versionada" uma decisão do
dono:** trocar `docker-compose.yml:49` para `evok_app` **não é** mudança
inerte de documentação. Ela **entra em vigor sozinha** no próximo
`docker compose up -d` do dono, contra produção real, sem gate no momento da
aplicação — e se a senha não tiver sido rotacionada/definida no `.env`, a API
**não sobe**. Um patch versionado que agenda uma indisponibilidade para o
próximo `up` é decisão do dono, não da SanaCore.

### 5.3 Veredito

**`BLOQUEADO_DECISAO_DONO`.** Existe trabalho técnico legítimo e não trivial
que **não** toca produção (o contrato de duas credenciais da §4.3, as guardas da
§4.4/§6, o drift de doc). Mas **qual desses recortes executar já é a pergunta**,
e escolher por conta própria seria decidir escopo de risco de produção no lugar
do dono (Regra 6). Perguntas formuladas com opções e consequências em
`PENDING_DECISION.md`.

### 5.4 Por que o `CODEX_REMEDIATION_DISPATCH.md` NÃO foi emitido

Despachar exigiria fixar **uma** das três estratégias da §6. As três têm
consequência operacional distinta e irreversível sem trabalho (indisponibilidade
imediata, indisponibilidade agendada para o próximo `up`, ou nenhuma). Emitir o
despacho da Opção B — a que eu considero tecnicamente melhor — seria transformar
recomendação em decisão. O despacho fica **pronto para ser escrito em uma
sessão** assim que houver resposta em `APPROVALS.md`.

---

## 6. Plano de correção — três recortes, com o que cada um entrega e cobra

Ordem de risco crescente. **Nenhum está autorizado.**

### Opção A — apenas registrar (nada de código)

Documentar que a ativação é gate humano pendente, nos moldes de `PEND-2026-001`.
- **Entrega:** rastreabilidade.
- **Não entrega:** nada. `AUD-DB-01` continua materialmente aberto, e a ressalva
  de `CASE-009` (`DISABLE TRIGGER`/`TRUNCATE`) continua exposta.
- **Toca produção:** não.

### Opção B — preparar o mecanismo sem ativar (recomendação técnica da triagem)

Torna a ativação um ato de **uma linha no `.env` do dono**, sem editar arquivo
versionado no dia, e **deixa de ser possível** ativar e quebrar as migrations.

1. **Separar as duas credenciais no contrato de configuração** (§4.3):
   `server/config/sequelize-cli.config.cjs:26` passa a usar
   `DB_ADMIN_USER`/`DB_ADMIN_PASSWORD` **com fallback para `DB_USER`/`DB_PASSWORD`**
   (compatível com quem já tem `.env`), e os três `.env*.example` documentam o
   par. Mesmo tratamento nos scripts administrativos da §4.2.
2. **`docker-compose.yml`**: `DB_USER: evok_admin` → `DB_USER: ${DB_USER:?…}`.
   **Neutro hoje** — a raiz `.env` já declara `DB_USER=evok_admin` (medido:
   `grep -c` = 1), então o compose resolve para o mesmo valor de hoje. Torna a
   escolha explícita e auditável, e a ativação passa a ser editar `.env`.
   Precedente de forma e de aceitação: `CASE-005` fez exatamente isso com
   `NODE_ENV` e `JWT_SECRET` (`${…:?}`), aprovado em `APR-2026-049` D2.
   **Alternativa a decidir:** `${DB_USER:-evok_admin}` (mais conservador, mas
   mantém o default fraco que é a essência do finding).
3. **Guarda estática nova** (unitária, sem banco, roda sempre): reprova
   `DB_USER`/`POSTGRES_USER` com **literal versionado de superusuário** no
   serviço `api` dos composes, e reprova `docker-compose.prod.yml` deixando de
   usar a role de aplicação. Arquivo **novo** — não editar
   `docker-compose-jwt-secret-guard.test.ts`, que é de `CASE-005`.
4. **Consertar os dois pontos cegos da guarda de ACL** (§4.4): tirar do
   `describe.skip` condicional **ou** documentar por que fica, e trocar
   `information_schema` por `pg_class` + `has_table_privilege`, para a guarda
   não ficar cega justamente quando rodar como `evok_app`.
5. **Alinhar `docs/database/05-ACESSOS_E_ISOLAMENTO.md`** (`:149-190`, `:180-185`)
   ao contrato novo — a instrução "não trocar `DB_USER` das migrations" passa a
   ser executável, e deixa de ser instrução para humano.
6. **`TRUNCATE` explícito:** avaliar `REVOKE TRUNCATE` (defensivo; hoje já não é
   concedido) e registrar a asserção no teste, para blindar a §3 contra um
   `GRANT ALL` futuro.
- **Toca produção:** **não** — nenhum comando SQL contra `erp_evok_audio`;
  nenhum arquivo versionado passa a apontar para `evok_app` por default.
- **Cobra do dono depois:** rotação da senha de `evok_app` + 1 linha no `.env` +
  reinício, em janela.
- **Fecha `AUD-DB-01`?** **NÃO.** Entrega o mecanismo; a ativação é o finding.
  Isso precisa estar escrito no pacote de evidência e no reteste — sob risco de
  virar "concluído com ressalva", que este programa não aceita.

### Opção C — preparar **e** ativar

Opção B + rotação da senha de `evok_app` em produção + flip do `.env` +
`docker compose up -d` + validação de `GET /health/ready` + rollback ensaiado.
- **Fecha `AUD-DB-01`?** Sim, materialmente — e fecha por privilégio os vetores
  residuais de `CASE-009`.
- **Exige:** aprovação humana explícita e escopada (`APR-2026-016`), janela de
  manutenção, e **executor humano ou de infraestrutura — não SanaCore**
  (`PEND-2026-006`: a lacuna de papel de infraestrutura está registrada e
  aberta). A SanaCore entrega o runbook; não executa contra produção.
- **Pré-requisito técnico não negociável:** rodar
  `20260810-000041-reapply-app-role-privileges.cjs` **antes** do flip, ou
  confirmar por sonda administrativa que os `GRANT`s estão íntegros
  (`...-000041...cjs:9-25` documenta o caso real em que estavam em 1 de 201
  tabelas). Sem isso o sintoma é `permission denied` em tudo.

---

## 7. Critério de reteste (para a VeriCore fixar; não é fechamento)

### 7.1 Estático — sem banco, roda em CI

| ID | Asserção | Reprova hoje? |
|---|---|---|
| `CR-015-E1` | Nenhum serviço `api` de compose versionado traz literal de credencial superusuária em `DB_USER` | **SIM** (`docker-compose.yml:49`) |
| `CR-015-E2` | A credencial de runtime é declarada/obrigatória, sem default versionado de superusuário | **SIM** |
| `CR-015-E3` | Existe variável administrativa distinta consumida por `sequelize-cli.config.cjs`, e o CLI **não** usa a credencial de runtime quando ela é a de aplicação | **SIM** (`:26`) |
| `CR-015-E4` | `docker-compose.prod.yml` continua usando a role de aplicação por default (conformidade a **preservar**, `:91`) | não — já passa, e não pode regredir |
| `CR-015-E5` | A guarda de ACL não usa view que filtra pelo papel corrente (§4.4-2) | **SIM** |
| `CR-015-E6` | `docs/database/05-ACESSOS_E_ISOLAMENTO.md` sem drift em relação ao contrato implementado | **SIM** após Opção B |
| `CR-015-E7` | Nenhuma senha real aparece em arquivo versionado; o fallback de `...-000080...cjs:36` não é reintroduzido em lugar novo (`T18-F04` não é agravado por este caso) | não — vigilância |

### 7.2 Dinâmico — **exclusivamente `erp_evok_audio_test`**, nunca `erp_evok_audio`

Inclui as duas asserções de `T-03` que **nunca foram executadas**
(`T-03_AUDIT_LOG_REPORT.md:206-211`, fila G4):

| ID | Sonda | Resultado que fecha | Origem |
|---|---|---|---|
| **`DYN-T03-03`** | `information_schema.table_privileges` das 3 tabelas de `FIND-ERP-002` + `pg_roles.rolsuper` + `current_user`, **conectado como a credencial de runtime** | `current_user` = role de aplicação; `rolsuper=false`; DML presente; **`TRUNCATE` ausente** | `T-03:206` — **NÃO EXECUTADA** |
| **`DYN-T03-05`** | Como runtime: `SET session_replication_role='replica'` **e** `ALTER TABLE audit_logs DISABLE TRIGGER ALL` | **ambos recusados** (`permission denied` / `must be owner of table`) | `T-03:208` — **NÃO EXECUTADA** |
| `DYN-CASE015-01` | Boot completo da API como role de aplicação contra o banco de teste + `GET /health/ready` | `{"status":"ready","database":"up"}` | novo |
| `DYN-CASE015-02` | Suíte de caracterização/integração com a credencial de runtime | sem regressão atribuível ao privilégio | novo |
| `DYN-CASE015-03` | `npm run migration:status`/`up` **com a credencial administrativa** | funciona; e **falha explicitamente** se rodado com a de aplicação (prova de que a separação existe) | novo (§4.3) |
| `DYN-CASE015-04` | `TRUNCATE audit_logs` como role de aplicação | **recusado** — fecha por privilégio a ressalva de `CASE-009` (§3) | novo |
| `DYN-CASE015-05` | `CREATE TABLE`/`DROP TABLE`/`SELECT` em `SequelizeMeta` como role de aplicação | os três recusados (reconfirma `05-ACESSOS…:131-140`, que é de 2026-08-10) | novo |
| `DYN-CASE015-06` | Guarda de ACL rodada **como role de aplicação** e **como administrativa** | mesmo veredito nas duas — se divergir, §4.4-2 está confirmado | novo |

**Armadilhas de reteste (reprovam o fechamento se ignoradas):**

1. Guarda de ACL verde rodando como a role de aplicação **sem** a correção da
   §4.4-2 → verde por cegueira, poder discriminante zero (precedente
   `APR-2026-050` D1: *"a faixa errada produziu o pior artefato do caso"*).
2. Declarar `AUD-DB-01` remediado com a Opção B: mecanismo ≠ ativação.
3. Provar `evok_app` no banco de **teste** e ler isso como estado de produção —
   `RES-T03-01`, e foi exatamente esse o erro que a migration `...-000041` teve
   de consertar (dev 201/201 × teste 1/201).
4. `DYN-T03-05` executado como `evok_admin` por engano: passaria a "conseguir
   desabilitar", e o resultado seria interpretado ao contrário. Registrar
   `current_user` no output de **cada** sonda.
5. Aceitar `TRUNCATE` recusado por não existir a tabela / por rollback de
   transação, em vez de por `permission denied`. **A mensagem de erro é a
   asserção.**

---

## 8. Risco de coordenação com `CASE-005` (`AUD-AUTHN-01`) — verificado, não presumido

**Verificação real:** `git diff --stat main...sana/ERP-LEGACY-001/CASE-005`.
O commit `7b06404` citado no despacho **não** toca `docker-compose.yml` — quem
toca é o commit anterior da mesma branch (`2a10049`, o do incidente
`RC-PROC-02`, `APR-2026-050` D1). O efeito acumulado da **branch** sobre
`docker-compose.yml` é de **16 linhas**, em dois hunks do bloco
`services.api.environment`:

| Hunk (numeração de `main`) | Linha alterada | Conteúdo |
|---|---|---|
| `@@ -40,7 +40,13 @@` | `:43` | `NODE_ENV: ${NODE_ENV:-development}` → `${NODE_ENV:?…}` + 6 linhas de comentário |
| `@@ -51,7 +57,13 @@` | `:54` | `JWT_SECRET: ${JWT_SECRET:-dev-only-…}` → `${JWT_SECRET:?…}` + 6 linhas de comentário |

**`DB_USER` (`:49`) fica exatamente entre os dois hunks**, com as linhas 47-48
(`DB_PORT`/`DB_NAME`) e 50 (`DB_PASSWORD`) intocadas.

**Risco registrado, no mesmo formato do `CASE-014` § de coordenação:**

1. `CASE-005` está em `AGUARDANDO_RETESTE_DINAMICO` e **não está em `main`**
   (`QUEUE_STATUS.md:52`). Se `CASE-015` sair de `main`, os dois patches de
   compose serão reconciliados no merge.
2. Como há 2-3 linhas inalteradas de cada lado, o merge automático de git é
   **provável, não garantido**. Regra: **rebase, um caso de cada vez, nunca em
   paralelo sem rebase.**
3. **Deslocamento de linha é certo:** depois dos dois hunks de `CASE-005`,
   `DB_USER` sai de `:49` para `~:55`. **Nenhum despacho deste caso pode
   endereçar linha fixa de `docker-compose.yml`** — endereçar por chave
   (`services.api.environment.DB_USER`).
4. `CASE-005` **já implantou** a forma `${VAR:?…}` neste mesmo bloco e ela foi
   ratificada (`APR-2026-049` D2). Usar a mesma forma para `DB_USER` é
   consistência, não invenção — mas o **default** é decisão do dono (§6-B2).
5. `CASE-005` criou `server/tests/unit/docker-compose-jwt-secret-guard.test.ts`,
   que **parseia `docker-compose.yml`**. Uma guarda de credencial deve ser
   **arquivo novo**; editar aquele arquivo cria colisão real de merge e mistura
   os dois findings no mesmo artefato de evidência.
6. Sequência recomendada (ao director, não decisão minha): mesclar `CASE-005`
   primeiro (está mais adiantado), depois rebasear `CASE-015`.

**Contraste com `CASE-014`/`CASE-004`:** lá, os dois casos disputavam a mesma
lista num teste (conflito semântico). Aqui é o mesmo bloco YAML em linhas
distintas (conflito textual/posicional). Mais simples — e, por isso mesmo, mais
fácil de mesclar errado sem ninguém notar.

---

## 9. `SYSTEMIC_FIX_REQUIRED` — o padrão por trás do finding

`AUD-DB-01` não é isolado. É a terceira instância do **mesmo padrão sistêmico**
neste programa: **o controle certo existe, versionado, e está desligado; a
ativação foi delegada a um humano lembrar.**

| Instância | Controle correto existe | Estava ligado? |
|---|---|---|
| `AUD-AUTHN-01` / `CASE-005` | `${VAR:?}` sem default fraco | não — default versionado |
| `FIND-ERP-002` / `CASE-009` | 13 triggers de imutabilidade | não — nas 3 tabelas críticas, ausentes |
| **`AUD-DB-01` / este caso** | role `evok_app` + `prod.yml:91` | **não — no compose de produção real, não** |

A correção sistêmica é a mesma nos três: **transformar o controle em default
mecânico e travar por guarda automatizada**, exatamente o que `T22-F02`
(validação automatizada dos composes) propõe como pré-requisito de fechamento
definitivo de `T18-F02`/`T18-F03` (`REMEDIATION_BACKLOG.md:86`). A guarda da
§6-B3 é a contribuição deste caso a essa frente — **e é o único ponto em que
este caso e `CASE-005` se sobrepõem conceitualmente.**

---

## 10. Registro de escopo e de dependências

- **Sem `OR-*` dedicado.** Varredura de `AUD-DB-01` em
  `audit/runs/ERP-LEGACY-001-AUD-001/40-report/REMEDIATION_BACKLOG.md`:
  **uma única ocorrência**, `:107`, na lista dos 9 HIGH nominais de produção
  real. Nenhuma das travas `OR-01`…`OR-30` (`:267-282`) o nomeia. **Não invento
  trava**; as dependências reais deste caso são as da §3 (`CASE-009`), §8
  (`CASE-005`) e §5 (aprovação humana).
- **Não agrupável com outro finding.** Causa-raiz distinta de `AUD-DB-02`
  (trilha não-transacional) e `AUD-DB-03` (cobertura de `logAction`), que
  compartilham só o relatório `T-03`. `T18-F04` (senha default da role) é
  **pré-requisito prático** da ativação (§5.1), não o mesmo defeito — e é MEDIUM,
  de outra trilha. Sinalizado, não absorvido.
- **Fora de escopo, explicitamente:** o `ALTER DEFAULT PRIVILEGES` amplo
  (`...-000080...cjs:105-112` / `T-03:139-144`); role de migration dedicada;
  `evok_backup`; role de BI (`05-ACESSOS…:192-209`). Nenhum deles pode ser
  silenciosamente incluído — e nenhum é fechado por este caso.
- **Conformidades a preservar** (reprovam o reteste se regredirem):
  `docker-compose.prod.yml:91`; ausência de acesso de `evok_app` a
  `SequelizeMeta`/`SequelizeData`; `db.ts:16-20` sem DDL no boot; `evok_app`
  `NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`.

---

## 11. Saída formal da triagem

```
ROOT_CAUSE:            Ativacao da role de privilegio minimo `evok_app` foi
                       desenhada como passo manual humano e nunca executada;
                       `docker-compose.yml:49` mantem o superusuario
                       `evok_admin` como credencial de runtime do banco que
                       APR-2026-016 define como producao real.
LOCAL_FIX:             trocar a credencial de runtime para `evok_app`
                       (INSUFICIENTE isolado — ver SYSTEMIC).
SYSTEMIC_FIX_REQUIRED: SIM — (a) contrato de DUAS credenciais (runtime x
                       administrativa/migration), inexistente hoje: uma unica
                       `DB_USER` serve runtime, sequelize-cli e scripts
                       (§4.3); (b) guarda automatizada de compose/env para o
                       controle nao poder ser desligado de novo (§9);
                       (c) correcao dos 2 pontos cegos da guarda de ACL (§4.4).
BLAST_RADIUS:          100% dos endpoints (credencial unica de acesso a dados).
                       Runtime coberto pelos grants declarados; QUEBRAM se a
                       variavel for trocada sem separacao: migrations,
                       apply-pending-migrations, limpar-dados-transacionais
                       (exige superusuario), comparar-bancos, pg_dump e a
                       guarda de ACL (que fica cega, nao vermelha).
FILES_AFFECTED:        §4.5 — nenhum arquivo de `server/src/` de negocio.
REGRESSION_RISK:       BAIXO-MEDIO preparar sem ativar; ALTO ativar;
                       INACEITAVEL ativar antes de rotacionar a senha de
                       `evok_app` (T18-F04, §5.1).
DEPENDENCIA CRUZADA:   fecha por privilegio os vetores residuais de CASE-009
                       (DISABLE TRIGGER, TRUNCATE) — beneficio, nao fechamento.
COORDENACAO:           CASE-005 (mesmo bloco YAML, linhas vizinhas; nao esta em
                       main; deslocamento de linha certo) — §8.
ESTADO:                BLOQUEADO_DECISAO_DONO
DESPACHO:              NAO EMITIDO — ver §5.4 e PENDING_DECISION.md
AUTORIDADE DE FECHAR:  VeriCore, exclusivamente (Regra 4). Esta triagem nao
                       declara FINDING CLOSED nem RETEST_PASSED.
```

**Critério de conclusão da triagem (autoavaliação honesta):** causa-raiz
**demonstrada** por arquivo:linha em artefato versionado, não hipótese; blast
radius mapeado com a distinção runtime × migration e com um achado adicional
que o finding não continha (§4.3); risco de regressão avaliado por recorte;
plano com três opções e consequências. **O que esta triagem não pode entregar,
e declara:** nenhuma prova dinâmica — `APR-2026-016` a proíbe contra produção, e
eu optei por **não** tocar `erp_evok_audio_test` também, porque nada nesta
triagem dependia disso. As sondagens ficam nomeadas na §7.2 para quem tiver a
autorização e o ambiente.
