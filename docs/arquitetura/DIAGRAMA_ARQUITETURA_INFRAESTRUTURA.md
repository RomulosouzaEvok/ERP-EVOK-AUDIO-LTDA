# Diagrama de Arquitetura de Infraestrutura — ERP EVOK ÁUDIO

**Status:** 🟡 Parcial — descreve a infraestrutura de **desenvolvimento**
(`docker-compose.yml`, real e em uso) com precisão. A infraestrutura de
**produção** está desenhada conforme `docs/infra/DEPLOY_UBUNTU.md`, mas o
servidor de produção físico/VPS ainda **não foi adquirido** (ver
`docs/governance/TODO.md` e `CLAUDE.md` §5, item "Infra de produção") — os
blocos marcados `[PENDENTE]` abaixo são plano, não fato hoje.

Fontes usadas para este documento: `docker-compose.yml` (raiz),
`server/Dockerfile`, `docs/infra/DEPLOY_UBUNTU.md`, `.env.example`,
`server/app.ts`. Nenhum dado abaixo foi inventado — onde a config real não
determina um valor (ex.: specs de CPU/RAM do servidor de produção), o item
está marcado como não especificado.

---

## 1. Ambiente de desenvolvimento (real, `docker-compose.yml`) [IMPLEMENTADO]

```mermaid
flowchart TB
    subgraph HOST["Host / máquina de desenvolvimento (Windows/Linux)"]
        subgraph DOCKER["Docker Compose (docker-compose.yml)"]
            PG["Container: evok-postgres<br/>Imagem: postgres:16-alpine<br/>Porta: 127.0.0.1:5432 → 5432<br/>(bind só em localhost)<br/>Volume: postgres_data"]
            API["Container: evok-api<br/>Node.js (build server/Dockerfile)<br/>Porta: 0.0.0.0:5000 → 5000<br/>(exposto na rede local — apps<br/>mobile/TV acessam via IP da máquina)<br/>Volume: app_uploads"]
        end
        WEB["client/ (Vite dev server)<br/>Porta: 5173<br/>Fora do Compose — roda direto no host<br/>via `npm run dev`"]
    end

    subgraph LAN["Rede local (Wi-Fi/Ethernet do escritório/fábrica)"]
        MOBILE["App mobile (Expo/React Native)<br/>mobile/ — acessa API pelo IP:5000"]
        TV["App Android TV (react-native-tvos)<br/>tv/ — acessa API pelo IP:5000, refresh 60s"]
    end

    BROWSER["Navegador (operadores)"] -->|HTTP :5173| WEB
    WEB -->|HTTP/JSON :5000/api| API
    MOBILE -->|HTTP/JSON :5000/api<br/>JWT + refresh deslizante| API
    TV -->|HTTP/JSON :5000/api<br/>JWT + refresh 12h| API
    API -->|TCP 5432, pool 10 conexões| PG
    API -->|multer, disco local| VOL["app_uploads (volume nomeado)<br/>fotos/desenhos de produto"]
```

**Notas de segurança já aplicadas em dev:**
- PostgreSQL só aceita conexões de `127.0.0.1` (não exposto na LAN).
- A API (`:5000`) é exposta em `0.0.0.0` **propositalmente** em dev, para
  que `mobile/`/`tv/` na mesma rede local consigam acessá-la pelo IP da
  máquina — isso é aceitável em rede de desenvolvimento fechada, mas
  **não deve se repetir em produção** (ver seção 2).

---

## 2. Ambiente de produção — plano `[PENDENTE]` (servidor ainda não adquirido)

Baseado em `docs/infra/DEPLOY_UBUNTU.md` e nos comentários de produção já
escritos em `docker-compose.yml` (ex.: `TRUST_PROXY`, aviso de bind em
`127.0.0.1:5000` + reverse proxy). **Nenhum destes componentes está em
operação hoje** — é o desenho-alvo.

```mermaid
flowchart TB
    INTERNET["Internet"] -->|HTTPS 443| PROXY

    subgraph SERVER["Servidor de produção (Ubuntu 24.04) — [PENDENTE] VPS/on-premise ainda não comprado"]
        PROXY["Reverse proxy TLS<br/>(nginx/Caddy — [PENDENTE], não implantado)<br/>Termina HTTPS, repassa para 127.0.0.1:5000"]

        subgraph DOCKERPROD["Docker Compose produção<br/>(docker-compose.prod.yml — [PENDENTE], não exercitado de fato)"]
            PGPROD["Container: postgres:16-alpine<br/>Bind: 127.0.0.1:5432 (nunca 0.0.0.0)<br/>Volume: postgres_data"]
            APIPROD["Container: API Node.js<br/>NODE_ENV=production<br/>Bind: 127.0.0.1:5000 (atrás do proxy)<br/>Volume: app_uploads"]
        end

        CRON["cron: dump diário PostgreSQL<br/>[PENDENTE] — aguardando servidor real<br/>(ver docs/infra/DEPLOY_UBUNTU.md)"]
        LOGROTATE["logrotate externo<br/>[PENDENTE] — Winston não rotaciona sozinho<br/>(LOG_FILE opcional, sem rotação embutida)"]
    end

    ADMIN["Administrador/DevOps"] -->|SSH + túnel para Postgres<br/>nunca 0.0.0.0:5432 público| SERVER
    PROXY --> APIPROD
    APIPROD -->|TCP 5432, pool 20 conexões em prod| PGPROD
    CRON --> PGPROD
    APIPROD --> LOGROTATE

    WEBSTATIC["Build estático client/ (Vite build)<br/>[PENDENTE definir hosting: mesmo nginx<br/>ou CDN separada — não decidido]"] --> PROXY
```

**Decisões já registradas em código/config (não é invenção):**
- `TRUST_PROXY` deve ser `1` atrás de exatamente um proxy reverso (nginx),
  para que o rate-limit de login use o IP real do cliente.
- `DB_SSL` deve ser `true` em produção (validado em
  `server/src/config/runtimeEnv.ts`); `ALLOW_LOCAL_DB_NO_SSL=true` é
  bloqueado como caminho de produção real.
- Pool de conexões PostgreSQL: 10 conexões em dev, 20 em produção
  (`server/src/config/database.ts`).
- Uploads (`app_uploads`) e o dump do Postgres precisam entrar na mesma
  rotina de backup — perda do volume = perda de fotos/desenhos enviados.

**O que falta para este bloco sair de `[PENDENTE]` (rastreado em
`docs/governance/TODO.md` e `CLAUDE.md` §5):**
1. Aquisição do servidor de produção (VPS ou on-premise).
2. `docker-compose.prod.yml` real, exercitado em staging antes do primeiro
   deploy.
3. Reverse proxy TLS (nginx/Caddy) configurado com certificado válido.
4. Cron de backup diário do dump PostgreSQL + do volume `app_uploads`.
5. `logrotate` (ou equivalente) para os logs Winston, se `LOG_FILE` for
   usado em produção.

---

## 3. Portas expostas — resumo

| Serviço | Porta (dev) | Porta (prod, plano) | Exposição |
|---|---|---|---|
| PostgreSQL | 5432 | 5432 | `127.0.0.1` apenas, nunca pública (dev e prod) |
| API (Node.js/Express) | 5000 (`0.0.0.0`, LAN) | 5000 (`127.0.0.1`, atrás do proxy) | Dev: LAN para mobile/TV. Prod: só via reverse proxy TLS |
| client/ (Vite dev) | 5173 | N/A (build estático, hosting a definir) | Local ao host de dev |
| Reverse proxy (nginx/Caddy) | N/A | 443 (HTTPS) | `[PENDENTE]` — não implantado |

---

## 4. Acesso remoto seguro

- **Hoje (dev):** sem acesso remoto formal — ambiente roda na máquina/rede
  local do time de implantação.
- **Plano (produção):** SSH para administração do servidor; acesso ao
  PostgreSQL apenas via túnel SSH (nunca porta pública 5432); HTTPS via
  reverse proxy para tráfego de API/frontend. Nenhum mecanismo de VPN
  dedicado está especificado no código/docs hoje — **não especificado
  formalmente** além do túnel SSH mencionado em `docker-compose.yml`.

---

## Referências

- `docker-compose.yml` (raiz) — fonte de verdade do ambiente de dev.
- `docs/infra/DEPLOY_UBUNTU.md` — runbook de deploy/operação Ubuntu.
- `server/src/config/runtimeEnv.ts` — validação de variáveis de ambiente críticas.
- `server/src/config/database.ts` — pool de conexões PostgreSQL.
- `server/app.ts` — helmet, CORS, rate limiters.
- `.env.example` — variáveis de ambiente documentadas.
