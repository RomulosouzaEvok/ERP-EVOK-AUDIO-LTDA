# Docker + PostgreSQL â€” guia de conexÃ£o e troubleshooting

**Data**: 2026-07-31
**Objetivo**: documentar exatamente como o Postgres local Ã© subido via Docker e
como o backend se conecta a ele, para reproduzir o setup em qualquer mÃ¡quina
sem re-descobrir os mesmos erros.

---

## 1. Os dois arquivos `.env` que existem neste projeto

Este repositÃ³rio tem **dois** `.env` diferentes, com propÃ³sitos distintos. Confundir
os dois Ã© a causa mais comum de erro de conexÃ£o ao trocar de mÃ¡quina.

| Arquivo             | Usado por                                   | `DB_HOST` correto |
| ------------------- | -------------------------------------------- | ------------------ |
| `.env` (raiz)        | `docker-compose.yml` (sobe Postgres + API)   | `postgres` (nome do serviÃ§o, sÃ³ faz sentido **dentro** da rede do compose) |
| `server/.env`        | `npm run dev` / `npm start` rodando **fora** do Docker, direto no seu PC | `localhost` (o Postgres do compose expÃµe a porta em `127.0.0.1:5432`) |

Nenhum dos dois Ã© versionado (`.gitignore` bloqueia `.env`). Sempre copie do
`.env.example` correspondente:

```bash
cp .env.example .env                  # raiz â€” para o docker-compose
cp server/.env.example server/.env    # server â€” para rodar o Node local
```

### Por que existem dois

> ðŸ”’ **AVISO â€” `erp_evok_audio` (mencionado abaixo) Ã© DADO REAL de produÃ§Ã£o, nÃ£o um banco de dev descartÃ¡vel**
>
> Este guia descreve como subir o **Ãºnico banco do projeto**
> (`erp_evok_audio`, atrÃ¡s de `docker-compose.yml`) â€” nÃ£o existe banco de
> produÃ§Ã£o separado. Por decisÃ£o humana explÃ­cita (`APR-2026-016`, em
> `coretriad/governance/APPROVALS.md`), ele Ã© classificado **PRODUÃ‡ÃƒO REAL**
> (catÃ¡logo de itens/categorias/departamentos, conta `admin`, `auth`,
> `auditLogs`), mesmo rodando localmente via Docker.
>
> - **Quem PODE executar os comandos deste guia:** um humano configurando seu
>   prÃ³prio ambiente de desenvolvimento.
> - **Quem NÃƒO PODE, sem exceÃ§Ã£o:** nenhum agente automatizado (IA) pode
>   executar comando que conecte a `erp_evok_audio` (nem `pg_isready`, nem
>   `psql -c "SELECT ..."`, nem para diagnÃ³stico) â€” a **regra permanente de
>   seguranÃ§a de dado real**
>   (`coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md`) veda isso em
>   qualquer passo do programa `ERP-LEGACY-001` (21-40).
> - **ReferÃªncia normativa:** `APR-2026-016` + `PROJECT_STATE.md` (seÃ§Ã£o
>   "Regra permanente de seguranÃ§a de dado real"). Aviso adicionado apÃ³s o
>   finding `AUD-PROC-CUSTODIA-01`.

- Se vocÃª sÃ³ quer o **banco** em Docker e roda o **backend Node direto no seu
  PC** (fluxo mais comum em dev): use `server/.env` com `DB_HOST=localhost`.
- Se vocÃª sobe **banco + API dentro do Docker** (`docker compose up -d` sem
  parar no Postgres): a API usa as variÃ¡veis definidas no prÃ³prio
  `docker-compose.yml` (`DB_HOST=postgres`), **nÃ£o** lÃª `server/.env`.

## 2. Subir o Postgres local (fluxo padrÃ£o)

```bash
# 1. Na raiz do repo, criar o .env se ainda nÃ£o existir
cp .env.example .env

# 2. Definir DB_PASSWORD no .env â€” OBRIGATÃ“RIO, sem isso o compose recusa subir
#    (ver docker-compose.yml: POSTGRES_PASSWORD: ${DB_PASSWORD:?defina DB_PASSWORD...})
#    Edite o .env e troque:
#    DB_PASSWORD=CHANGE_ME_USE_A_STRONG_PASSWORD
#    por uma senha real, ex.: DB_PASSWORD=evok_local_dev
# 2b. Definir ADMIN_SEED_PASSWORD no .env â€” OBRIGATÃ“RIO para o seed do admin.
#     O compose agora exige essa variÃ¡vel na API e o seed nÃ£o aceita fallback
#     nem placeholder. Exemplo seguro:
#     ADMIN_SEED_PASSWORD=UseUmaSenhaLongaEUnica123!

# 3. Subir o container do Postgres (Docker Desktop precisa estar rodando)
docker compose up -d postgres

# 4. Confirmar que subiu saudÃ¡vel
docker ps
#   deve mostrar "evok-postgres" com STATUS "healthy" (pode levar ~10-15s)

# 5. Testar a conexÃ£o diretamente
docker exec -it evok-postgres pg_isready -U evok_admin -d erp_evok_audio
```

Se o passo 5 responder `accepting connections`, o banco estÃ¡ pronto.

## 3. Rodar o backend Node local apontando para esse Postgres

```bash
cd server
cp .env.example .env    # se ainda nÃ£o existir

# No server/.env, confirme (valores padrÃ£o jÃ¡ vÃªm assim):
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=erp_evok_audio
# DB_USER=evok_admin
# DB_PASSWORD=<a MESMA senha usada no .env da raiz no passo 2>
# DB_SSL=false

npm install
npm run migration:up     # aplica as migrations versionadas
npm run dev               # sobe a API em watch mode

Se o seed do administrador falhar com `ADMIN_SEED_PASSWORD` ausente,
placeholder ou curta, o erro Ã© proposital: defina a variÃ¡vel real antes do
primeiro boot para que a conta inicial nÃ£o nasÃ§a com credencial fraca.
```

A API loga `PostgreSQL conectado: <host>:<port>/<database> (postgres)`
(`server/src/config/database.ts`) quando a conexÃ£o autentica com sucesso.

## 4. Erros comuns ao trocar de PC (e a causa real)

### `error: DB_PASSWORD: defina DB_PASSWORD no .env antes de subir o Postgres`

O `docker-compose.yml` **nÃ£o tem senha default** â€” Ã© proposital (evita subir
com uma senha previsÃ­vel sem perceber). Causa: `.env` da raiz nÃ£o existe, ou
existe mas `DB_PASSWORD` estÃ¡ vazio/comentado.

Fix: `cp .env.example .env` e preencher `DB_PASSWORD` com um valor real.

### `ECONNREFUSED 127.0.0.1:5432` ao rodar `npm run dev` no `server/`

O Postgres do Docker nÃ£o estÃ¡ de pÃ©, ou o Docker Desktop nÃ£o estÃ¡ rodando.

Fix:
```bash
docker ps                      # container "evok-postgres" aparece?
docker compose up -d postgres  # se nÃ£o aparecer, subir
```
Se `docker ps` falhar com erro de pipe/named pipe (`open //./pipe/docker_engine`),
o Docker Desktop em si nÃ£o estÃ¡ rodando â€” abra o Docker Desktop e espere o
Ã­cone ficar "Running" antes de repetir o comando.

### `ENOTFOUND postgres` ao rodar `npm run dev` no `server/`

`server/.env` estÃ¡ com `DB_HOST=postgres` â€” esse valor sÃ³ existe dentro da
rede interna do `docker-compose` (Ã© o nome do serviÃ§o, resolvido pelo DNS
interno do Compose). Rodando o Node **fora** do Docker, o host correto Ã©
`localhost` (a porta 5432 do container estÃ¡ mapeada para `127.0.0.1:5432`).

Fix: em `server/.env`, usar `DB_HOST=localhost`.

### `password authentication failed for user "evok_admin"`

A senha em `server/.env` (`DB_PASSWORD`) Ã© diferente da senha com que o
volume do Postgres foi **inicializado** pela primeira vez. O Postgres sÃ³
aplica `POSTGRES_PASSWORD` na criaÃ§Ã£o inicial do volume â€” trocar a senha no
`.env` depois nÃ£o muda a senha jÃ¡ gravada no volume existente.

Fix (ambiente local, sem dados importantes a preservar):
```bash
docker compose down
docker volume rm erp-evok--audio-ltda_postgres_data   # nome pode variar, ver: docker volume ls
docker compose up -d postgres   # recria o volume jÃ¡ com a senha atual do .env
```

### Porta 5432 jÃ¡ em uso (`port is already allocated`)

Outra instÃ¢ncia de Postgres (nativa no Windows, ou outro projeto em Docker)
jÃ¡ estÃ¡ usando a porta 5432.

Fix â€” parar a outra instÃ¢ncia, **ou** mudar a porta exposta no
`docker-compose.yml` (ex.: `"127.0.0.1:5433:5432"`) e ajustar `DB_PORT=5433`
em `server/.env` de acordo.

### Docker Desktop com erro de rede ao dar `docker build`

JÃ¡ visto neste projeto em ambientes com Docker Desktop configurado com um
proxy/VPN corporativo â€” o `npm ci` dentro do build da imagem falha com
`ECONNRESET` em chamadas HTTPS. Isso afeta apenas `docker build`/`docker
compose up --build` (build da imagem da API), **nÃ£o afeta** subir sÃ³ o
Postgres (`docker compose up -d postgres`), que usa uma imagem pronta
(`postgres:16-alpine`) sem precisar baixar dependÃªncias Node.

Se sÃ³ precisar do banco, o comando do passo 2 acima (`up -d postgres`) evita
esse problema por completo.

## 5. ReferÃªncia rÃ¡pida das variÃ¡veis

| VariÃ¡vel      | `.env` (raiz, compose) | `server/.env` (Node local) |
| ------------- | ----------------------- | --------------------------- |
| `DB_HOST`     | nÃ£o se aplica (compose define `postgres` para o serviÃ§o `api`) | `localhost` |
| `DB_PORT`     | `5432`                   | `5432`                       |
| `DB_NAME`     | `erp_evok_audio`         | `erp_evok_audio`             |
| `DB_USER`     | `evok_admin`             | `evok_admin`                 |
| `DB_PASSWORD` | obrigatÃ³rio, sem default | igual ao valor usado no `.env` da raiz na criaÃ§Ã£o do volume |
| `DB_SSL`      | `false` (dev local)      | `false` (dev local)          |

Ver tambÃ©m `docs/database/DATABASE_SETUP.md` (schema, migrations, backfill) e
`docker-compose.yml` / `server/src/config/database.ts` (fonte da verdade).

