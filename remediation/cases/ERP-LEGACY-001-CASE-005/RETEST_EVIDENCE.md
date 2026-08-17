# Evidência dinâmica de reteste — `ERP-LEGACY-001-CASE-005` / `AUD-AUTHN-01`

```
AUDIT_COMMIT        c1311a6f76b512fef893f7e60d934179cae3409f
REMEDIATION_HEAD    2a100494c6937ccf0c782a2aa1c8934d4784ab60
COLETA POR          vericore-audit-verification-runner (VeriCore)
PERSISTIDO POR      sessão orquestradora (o runner é proibido de escrever no repo)
DATA                2026-08-17
NATUREZA            MEDIÇÃO, não veredito. Nenhum RETEST_PASSED, RETEST_FAILED
                    ou FINDING CLOSED é declarado aqui (Regra 4).
```

> **Método.** Nenhum arquivo foi revertido dentro de worktree nenhuma — a árvore do
> `AUDIT_COMMIT` foi extraída para fora do repositório (`git archive | tar -x`) e
> medida lá. **Nenhum valor de segredo aparece neste documento**, nem parcial nem
> mascarado: todas as medições são `len=` + booleano.

---

## 1. O defeito reproduz no `AUDIT_COMMIT` e não reproduz no HEAD

Medição cruzada — o literal de `docker-compose.yml:54` do `AUDIT_COMMIT` contra os
**dois** códigos, nos quatro regimes de `NODE_ENV`:

```
===== código ANTES (AUDIT_COMMIT) =====
entrada: literal de docker-compose.yml:54 | len=45 casaPlaceholder=true
  NODE_ENV=undefined   -> NAO LANCOU   (boot sobe com a chave publicada)
  NODE_ENV=development -> NAO LANCOU   (boot sobe com a chave publicada)
  NODE_ENV=test        -> NAO LANCOU   (boot sobe com a chave publicada)
  NODE_ENV=production  -> LANCOU

===== código DEPOIS (2a10049), mesma entrada =====
  NODE_ENV=undefined   -> LANCOU
  NODE_ENV=development -> LANCOU
  NODE_ENV=test        -> LANCOU
  NODE_ENV=production  -> LANCOU
```

**No `AUDIT_COMMIT`, em 3 dos 4 regimes — inclusive o instruído pelo próprio
repositório — o boot concluía e `getJwtRuntimeConfig()` devolvia exatamente a
chave publicada.** No HEAD, os quatro reprovam. Execução, não leitura.

## 2. Poder discriminante dos testes

Mesmos 4 arquivos de teste rodados contra a fonte do `AUDIT_COMMIT`:

```
Test Suites: 3 failed, 1 passed, 4 total
Tests:       12 failed, 19 passed, 31 total
```

Contra o HEAD: `4 passed, 31 passed, exit 0`.

| Suíte | Falha ANTES | Leitura |
|---|---|---|
| `runtime-env-jwt-placeholder` | **5 de 8** | discrimina |
| `docker-compose-jwt-secret-guard` | **3 de 4** | discrimina |
| `env-examples-jwt-guard` | **4 de 12** | **fraco — ver §5** |
| `runtime-env` | 0 de 7 | sem poder discriminante, esperado |

## 3. Regressão — a afirmação de "pré-existente" estava incompleta

Suíte unitária completa do `server/`: **1975/1976 passando**. A única falha é
`docs-path-reference-guard.test.ts`, e o runner **não aceitou** a afirmação de
pré-existência — rodou também no worktree principal:

- **`docs/API.md`** — pré-existente **confirmado**, falha idêntica nos dois.
- **`client/node_modules/jsdom/package.json`** — **não é pré-existente e não é
  regressão: é artefato de ambiente.** `client/node_modules` existe no worktree
  principal e não existe no `sana`. **A suíte unitária do `server/` contém um
  teste cujo resultado depende de `npm install` do `client/`** — quem retestar em
  worktree novo verá 2 quebras, não 1. Isso contamina o baseline de **todos** os
  casos, não só deste.

**Sem regressão atribuível ao patch.**

Verificado antes de rodar que a suíte não abre banco (`APR-2026-016`): `setup.ts`
só define `NODE_ENV`, e os arquivos que tocam `sequelize` fazem `jest.mock`.

## 4. Cobertura de causa-raiz

| CR | Estado medido |
|---|---|
| **CR-1** | **PARCIAL, por desenho declarado.** `NODE_ENV` mantém `.default('development')`. Só a guarda de `JWT_SECRET` saiu para antes do early-return (`:103`); as outras **oito** seguem depois de `:110` — `PRODUCTION_TRACKING_REQUIRED`, `CORS_ORIGIN`, `DB_PASSWORD`, `ADMIN_SEED_PASSWORD`, `DB_SSL`, `DB_FORCE_SYNC`, `DB_AUTO_ALTER`, `DB_ALLOW_UNSAFE_ALTER`. **`T18-F02` permanece aberto**, como declarado. |
| **CR-2** | **FECHADA.** `${JWT_SECRET:?…}`; o literal saiu do arquivo no HEAD (segue no histórico — remoção de histórico não era escopo). |
| **CR-3** | **FECHADA na forma escolhida**, sem deletar a linha. Premissa A3 segue sem prova de execução. |
| **CR-4** | **NÃO FECHADA — e sobrevive de forma demonstrável.** Ver §6.1. |

**Fora de escopo, confirmado intocado** por diff vazio: `server/app.ts`
(`AUD-AUTHN-03`), `ADMIN_SEED_PASSWORD` (`AUD-AUTHN-02`, forma idêntica antes e
depois), `docker-compose.prod.yml`, `server/Dockerfile`, `server-ci.yml`,
`seeds.ts`, `auth.ts`.

## 5. Os três `.env*.example` — a propriedade já valia antes

```
### ANTES (AUDIT_COMMIT)
.env.example         len=34 casaPlaceholder=true  SUBIRIA_O_BOOT=false
.env.docker.example  len=26 casaPlaceholder=false SUBIRIA_O_BOOT=false  barradoSoPorComprimento=true
server/.env.example  len=34 casaPlaceholder=true  SUBIRIA_O_BOOT=false

### DEPOIS
os três: len=44 casaPlaceholder=true SUBIRIA_O_BOOT=false
```

**A asserção central de `env-examples-jwt-guard` — "não entrega segredo
utilizável" — já passava nos três arquivos no `AUDIT_COMMIT`. Poder discriminante
zero.** Das 12 asserções, 4 falham antes: 3 são de documentação e **1** é
conteúdo de segurança real (`.env.docker.example` reprovando pela guarda de
placeholder e não só por comprimento).

Essa uma **tem** efeito mensurável, e é a melhor evidência a favor de `2a10049`:

```
entrada: JWT_SECRET de .env.docker.example do AUDIT_COMMIT | len=26 casaPlaceholder=false
código ANTES : boot=NAO LANCOU  · primeiro token=LANCOU   -> FALHA TARDIA
código DEPOIS: boot=LANCOU
```

Saiu de *"API sobe e quebra no primeiro login"* para *"reprova no boot"*. Ganho
real — só não é o ganho que a suíte anuncia.

## 6. Achados que ninguém tinha citado

**6.1 — `CR-4` sobrevive, e há artefato versionado que ainda entrega chave
utilizável.** `.github/workflows/server-ci.yml` (intocado, fora de escopo) tem
duas ocorrências do mesmo `JWT_SECRET` (`:38` e `:107`):

```
len=42 casaPlaceholder=false REPROVARIA_NO_BOOT=false
```

Duas leituras, separadas: **(a)** a guarda nova não o rejeita, logo **não há
regressão de CI** — bom para o patch; **(b)** ainda existe no repositório um
`JWT_SECRET` de ≥32 caracteres, sem prefixo de placeholder, que o `runtimeEnv`
aceita em qualquer ambiente. **Nenhum finding é emitido** (Regra 6) — registro
que a classe descrita em `CR-4` continua instanciada, como insumo à VeriCore.

**6.2 — o patch endureceu `length < 32` além do que o finding pedia.**
`AUD-AUTHN-01` é sobre placeholder; a guarda nova reprova **comprimento E**
placeholder, no boot, em todos os ambientes. Medido que não quebra CI nem a
suíte, mas **é mudança de regime de falha em caminho não exigido pelo finding**,
e atinge qualquer script/CLI cujo `.env` local tenha chave curta.

**6.3 — a suíte unitária do `server/` não é hermética ao ambiente** (§3).

**6.4 — os guard tests não vazam segredo sob falha real.** Nas 12 falhas
produzidas contra o `AUDIT_COMMIT`, nenhuma saída do Jest imprimiu conteúdo de
`docker-compose.yml` ou dos `.env*.example` — só `Expected: false / Received:
true`. Controle que funcionou sob teste.

## 7. Lacunas

| # | Item | Estado |
|---|---|---|
| 1 | `DYN-T02-01` — forja de token contra API de pé | **não medido** — exigiria subir a API, cujo compose aponta para produção |
| 2 | `docker compose config` — o compose ainda parseia? | **FECHADA depois**, ver §7.1 |
| 3 | Premissa **A3** (precedência Docker sobre `ENV` da imagem) | **não verificada por execução** |
| 4 | Premissa **A1** (estado do `.env` das instâncias reais) | fora de alcance por `APR-2026-016` |
| 5 | Efeito de `${VAR:?}` sobre o `up` real (risco R1) | **não medido** |

### 7.1 Lacuna 2 — fechada pela sessão orquestradora

`docker compose config` **não sobe container e não abre conexão** — só resolve e
valida o arquivo.

```
$ docker compose --env-file <.env local> -f docker-compose.yml config --quiet
EXIT=0                                    <- parseia

$ docker compose --env-file /dev/null -f docker-compose.yml config --quiet
error while interpolating services.postgres.environment.POSTGRES_PASSWORD:
required variable DB_PASSWORD is missing a value: defina DB_PASSWORD no .env
antes de subir o Postgres                 <- os `:?` abortam, como pretendido
```

O arquivo continua válido depois da troca `:-` → `:?`, e o mecanismo de aborto
funciona. Aborta primeiro em `DB_PASSWORD` (`:?` pré-existente em `:13`), antes de
chegar em `JWT_SECRET` — o que não enfraquece a prova: o que se queria demonstrar
é que o arquivo parseia e que `:?` interrompe.

## 8. O que a triagem previa e o patch NÃO entregou

**`C6` não foi entregue.** A triagem (`§5.1 C6`, `§10/R1`) declarava a contenção do
risco R1 como **"C5+C6 no mesmo commit"**: sem runbook/README atualizados,
`${VAR:?}` quebra o `up` de todo clone novo e *"a reação previsível é reverter a
correção"*.

```
$ git diff --name-only 694bca9..HEAD -- docs/ README.md
(vazio)
```

**Atenuante medido:** os três `.env*.example` já declaram `NODE_ENV=development`,
então o novo `${NODE_ENV:?}` é satisfazível por quem copiar o exemplo. E a triagem
registrou que a ownership de `docs/` era **pendência aberta ao director** (`§11`
item 2) — pode ser omissão autorizada, não descumprimento. **Decisão de quem
despachou.**

**Drift criado pelo patch:** `README.md` descreve `JWT_SECRET` como *"String longa
e aleatória"* e não menciona a proibição de placeholder, que agora vale em **todos**
os ambientes.

## 9. Estado final verificado

```
worktree sana   HEAD   = 2a100494c6937ccf0c782a2aa1c8934d4784ab60   OK
worktree sana   status = (vazio)                                     OK
worktree princ  status = (vazio)                                     OK
```

Nenhum arquivo do repositório foi criado, editado ou revertido pelo runner.
Nenhuma escrita em `audit/`. Nenhuma conexão de banco.
