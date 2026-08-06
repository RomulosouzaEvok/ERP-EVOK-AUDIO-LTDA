# Docker + PostgreSQL — guia de conexão e troubleshooting

**Data**: 2026-07-31
**Objetivo**: documentar exatamente como o Postgres local é subido via Docker e
como o backend se conecta a ele, para reproduzir o setup em qualquer máquina
sem re-descobrir os mesmos erros.

---

## 1. Os dois arquivos `.env` que existem neste projeto

Este repositório tem **dois** `.env` diferentes, com propósitos distintos. Confundir
os dois é a causa mais comum de erro de conexão ao trocar de máquina.

| Arquivo             | Usado por                                   | `DB_HOST` correto |
| ------------------- | -------------------------------------------- | ------------------ |
| `.env` (raiz)        | `docker-compose.yml` (sobe Postgres + API)   | `postgres` (nome do serviço, só faz sentido **dentro** da rede do compose) |
| `server/.env`        | `npm run dev` / `npm start` rodando **fora** do Docker, direto no seu PC | `localhost` (o Postgres do compose expõe a porta em `127.0.0.1:5432`) |

Nenhum dos dois é versionado (`.gitignore` bloqueia `.env`). Sempre copie do
`.env.example` correspondente:

```bash
cp .env.example .env                  # raiz — para o docker-compose
cp server/.env.example server/.env    # server — para rodar o Node local
```

### Por que existem dois

- Se você só quer o **banco** em Docker e roda o **backend Node direto no seu
  PC** (fluxo mais comum em dev): use `server/.env` com `DB_HOST=localhost`.
- Se você sobe **banco + API dentro do Docker** (`docker compose up -d` sem
  parar no Postgres): a API usa as variáveis definidas no próprio
  `docker-compose.yml` (`DB_HOST=postgres`), **não** lê `server/.env`.

## 2. Subir o Postgres local (fluxo padrão)

```bash
# 1. Na raiz do repo, criar o .env se ainda não existir
cp .env.example .env

# 2. Definir DB_PASSWORD no .env — OBRIGATÓRIO, sem isso o compose recusa subir
#    (ver docker-compose.yml: POSTGRES_PASSWORD: ${DB_PASSWORD:?defina DB_PASSWORD...})
#    Edite o .env e troque:
#    DB_PASSWORD=CHANGE_ME_USE_A_STRONG_PASSWORD
#    por uma senha real, ex.: DB_PASSWORD=evok_local_dev

# 3. Subir o container do Postgres (Docker Desktop precisa estar rodando)
docker compose up -d postgres

# 4. Confirmar que subiu saudável
docker ps
#   deve mostrar "evok-postgres" com STATUS "healthy" (pode levar ~10-15s)

# 5. Testar a conexão diretamente
docker exec -it evok-postgres pg_isready -U evok_admin -d erp_evok_audio
```

Se o passo 5 responder `accepting connections`, o banco está pronto.

## 3. Rodar o backend Node local apontando para esse Postgres

```bash
cd server
cp .env.example .env    # se ainda não existir

# No server/.env, confirme (valores padrão já vêm assim):
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=erp_evok_audio
# DB_USER=evok_admin
# DB_PASSWORD=<a MESMA senha usada no .env da raiz no passo 2>
# DB_SSL=false

npm install
npm run migration:up     # aplica as migrations versionadas
npm run dev               # sobe a API em watch mode
```

A API loga `PostgreSQL conectado: <host>:<port>/<database> (postgres)`
(`server/src/config/database.ts`) quando a conexão autentica com sucesso.

## 4. Erros comuns ao trocar de PC (e a causa real)

### `error: DB_PASSWORD: defina DB_PASSWORD no .env antes de subir o Postgres`

O `docker-compose.yml` **não tem senha default** — é proposital (evita subir
com uma senha previsível sem perceber). Causa: `.env` da raiz não existe, ou
existe mas `DB_PASSWORD` está vazio/comentado.

Fix: `cp .env.example .env` e preencher `DB_PASSWORD` com um valor real.

### `ECONNREFUSED 127.0.0.1:5432` ao rodar `npm run dev` no `server/`

O Postgres do Docker não está de pé, ou o Docker Desktop não está rodando.

Fix:
```bash
docker ps                      # container "evok-postgres" aparece?
docker compose up -d postgres  # se não aparecer, subir
```
Se `docker ps` falhar com erro de pipe/named pipe (`open //./pipe/docker_engine`),
o Docker Desktop em si não está rodando — abra o Docker Desktop e espere o
ícone ficar "Running" antes de repetir o comando.

### `ENOTFOUND postgres` ao rodar `npm run dev` no `server/`

`server/.env` está com `DB_HOST=postgres` — esse valor só existe dentro da
rede interna do `docker-compose` (é o nome do serviço, resolvido pelo DNS
interno do Compose). Rodando o Node **fora** do Docker, o host correto é
`localhost` (a porta 5432 do container está mapeada para `127.0.0.1:5432`).

Fix: em `server/.env`, usar `DB_HOST=localhost`.

### `password authentication failed for user "evok_admin"`

A senha em `server/.env` (`DB_PASSWORD`) é diferente da senha com que o
volume do Postgres foi **inicializado** pela primeira vez. O Postgres só
aplica `POSTGRES_PASSWORD` na criação inicial do volume — trocar a senha no
`.env` depois não muda a senha já gravada no volume existente.

Fix (ambiente local, sem dados importantes a preservar):
```bash
docker compose down
docker volume rm erp-evok--audio-ltda_postgres_data   # nome pode variar, ver: docker volume ls
docker compose up -d postgres   # recria o volume já com a senha atual do .env
```

### Porta 5432 já em uso (`port is already allocated`)

Outra instância de Postgres (nativa no Windows, ou outro projeto em Docker)
já está usando a porta 5432.

Fix — parar a outra instância, **ou** mudar a porta exposta no
`docker-compose.yml` (ex.: `"127.0.0.1:5433:5432"`) e ajustar `DB_PORT=5433`
em `server/.env` de acordo.

### Docker Desktop com erro de rede ao dar `docker build`

Já visto neste projeto em ambientes com Docker Desktop configurado com um
proxy/VPN corporativo — o `npm ci` dentro do build da imagem falha com
`ECONNRESET` em chamadas HTTPS. Isso afeta apenas `docker build`/`docker
compose up --build` (build da imagem da API), **não afeta** subir só o
Postgres (`docker compose up -d postgres`), que usa uma imagem pronta
(`postgres:16-alpine`) sem precisar baixar dependências Node.

Se só precisar do banco, o comando do passo 2 acima (`up -d postgres`) evita
esse problema por completo.

## 5. Referência rápida das variáveis

| Variável      | `.env` (raiz, compose) | `server/.env` (Node local) |
| ------------- | ----------------------- | --------------------------- |
| `DB_HOST`     | não se aplica (compose define `postgres` para o serviço `api`) | `localhost` |
| `DB_PORT`     | `5432`                   | `5432`                       |
| `DB_NAME`     | `erp_evok_audio`         | `erp_evok_audio`             |
| `DB_USER`     | `evok_admin`             | `evok_admin`                 |
| `DB_PASSWORD` | obrigatório, sem default | igual ao valor usado no `.env` da raiz na criação do volume |
| `DB_SSL`      | `false` (dev local)      | `false` (dev local)          |

Ver também `docs/DATABASE_SETUP.md` (schema, migrations, backfill) e
`docker-compose.yml` / `server/src/config/database.ts` (fonte da verdade).
