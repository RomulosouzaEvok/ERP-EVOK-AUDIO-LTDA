# ERP EVOK ÁUDIO LTDA

ERP interno da EVOK ÁUDIO, cobrindo as áreas administrativa, comercial, financeira,
de produção, suprimentos, logística, qualidade, RH e tributária da fábrica.

Monorepo com backend em **Node.js + TypeScript** + **PostgreSQL** (Sequelize) em
`server/`, organizado em módulos por domínio seguindo Clean Architecture, e
frontend **React 19 + Vite** em `client/`.

## Diretriz de arquitetura

Este projeto adota oficialmente **Docker** como padrao de empacotamento e
execucao entre ambientes, e **PostgreSQL** como unico banco de dados
suportado.

- Nao devem ser propostas alternativas de banco para este ERP fora de PostgreSQL.
- Nao devem ser propostos fluxos de execucao ou deploy fora do artefato conteinerizado em Docker.
- Scripts, testes, migrations e documentacao operacional devem assumir Docker + PostgreSQL como baseline.

## Stack

| Camada   | Tecnologia                     |
| -------- | ------------------------------ |
| Runtime  | Node.js + TypeScript (`tsx`)   |
| Banco    | PostgreSQL 16 (Sequelize, 24+ migrations versionadas) |
| Auth     | JWT                            |
| Frontend | React 19 + TypeScript + Vite 8, React Router 7, TanStack Query, Tailwind 4/shadcn |
| Testes   | Jest (backend) / Vitest + Testing Library (frontend) |
| Infra    | Docker Compose (Postgres + API) |

## Requisitos

- Node.js 18+
- PostgreSQL 16 (ou Docker, para subir o banco local)

## Configuração

Copie o modelo de ambiente e preencha os valores. **Nenhum `.env` é versionado.**

```bash
cp .env.example .env
```

Variáveis que exigem atenção:

| Variável              | Obrigatória | Observação                                                       |
| --------------------- | ----------- | ---------------------------------------------------------------- |
| `DB_PASSWORD`         | sim         | Senha do PostgreSQL.                                             |
| `JWT_SECRET`          | sim         | String longa e aleatória.                                        |
| `ADMIN_SEED_PASSWORD` | em produção | Senha do admin inicial. Com `NODE_ENV=production` o servidor **não inicia** sem ela. |

## Banco de dados

Para subir o PostgreSQL local via Docker:

```bash
docker compose up -d
```

O compose usa `DB_PASSWORD` do `.env` e **não tem default**: se a variável
não estiver definida, `docker compose up` falha explicitamente em vez de subir
com uma senha previsível. Guia completo de conexão e troubleshooting (dois PCs
diferentes, `DB_HOST` local vs. dentro do Compose, erros comuns):
[`docs/DOCKER_POSTGRES_SETUP.md`](docs/DOCKER_POSTGRES_SETUP.md).

Na primeira execução o servidor roda os seeds automaticamente (usuário
administrador, departamentos e categorias). O seed é idempotente: não faz nada
se o banco já tiver dados.

## Executando

```bash
npm run install-all     # instala dependências (raiz + client + server)

npm run server           # backend em watch mode (porta 5000)
npm run client           # frontend Vite em dev (porta 5173)
npm run dev              # backend + frontend juntos (concurrently)
npm start                # backend em modo produção
```

Health check do backend: `GET /health/live` (processo) e `GET /health/ready`
(processo + PostgreSQL).

Scripts do backend (dentro de `server/`):

```bash
npm run dev              # watch mode
npm run typecheck        # tsc --noEmit
npm run build            # compila para dist/
npm run migration:up     # aplica migrations versionadas
npm run migration:down   # desfaz a ultima migration
npm run migration:status # lista status das migrations
npm test                 # suíte completa
npm run test:unit        # apenas unitários
npm run test:integration # apenas integração
npm run test:edge        # casos de borda
npm run test:coverage    # cobertura
```

## Estrutura

```
client/            # frontend React 19 + Vite (login, dashboard, produtos, ...)
  src/
    pages/         # páginas por domínio
    routes/        # ProtectedRoute e roteamento
    api/           # httpClient Axios (VITE_API_URL, default http://localhost:5000)
server/
  src/
    config/        # conexão com o banco, seeds
    modules/       # módulos por domínio (auth, produção, etc.)
    controllers/   # camada HTTP
    models/        # entidades Sequelize
    middlewares/   # autenticação, validação, erros
    routes/        # definição de rotas
    services/      # regras de negócio
    shared/        # utilitários compartilhados
  tests/           # unit, integration, edge
docs/              # documentação por área da empresa
```

## Documentação

| Documento                                                              | Conteúdo                       |
| ---------------------------------------------------------------------- | ------------------------------ |
| [docs/API.md](docs/API.md)                                             | Endpoints da API               |
| [docs/DATABASE.md](docs/DATABASE.md)                                   | Modelo de dados                |
| [docs/DEPLOY.md](docs/DEPLOY.md)                                       | Processo de deploy             |
| [docs/00-ESTRUTURA_ORGANIZACIONAL.md](docs/00-ESTRUTURA_ORGANIZACIONAL.md) | Estrutura organizacional    |
| [CLAUDE.md](CLAUDE.md)                                                  | SSOT do projeto (status, arquitetura, runbook) |
| [docs/AUDITORIA_PRE_PRODUCAO_2026-08-02.md](docs/AUDITORIA_PRE_PRODUCAO_2026-08-02.md) | Auditoria pré-produção e status da remediação |
| [docs/GO_LIVE_G6_CHECKLIST.md](docs/GO_LIVE_G6_CHECKLIST.md)            | Checklist de Go-Live G6        |

## Agente Claude Code

O agente de remediacao de producao segue o cronograma G0-G6 e carrega a skill
`evok-production-readiness` automaticamente:

```bash
claude --agent evok-production-remediation
```

Dentro de uma sessao Claude Code, tambem e possivel mencionar
`@evok-production-remediation` para delegar uma tarefa ao agente.

As pastas em `docs/` seguem as áreas da empresa (comercial, financeiro,
produção, qualidade, RH, entre outras).

## Segurança

- Segredos vivem apenas no `.env` local, nunca no repositório.
- Não há credenciais hardcoded no código: em produção, a ausência de
  `ADMIN_SEED_PASSWORD` interrompe a inicialização em vez de criar um admin com
  senha previsível.
- O bootstrap da aplicação não executa mais DDL automático; evolução de schema
  ocorre por migrations versionadas com `sequelize-cli` (133 FKs de integridade
  referencial aplicadas).
- Remediação da auditoria pré-produção de 2026-08-02 aplicada: Requisição de
  Compra, MRP contra estoque real, foreign keys, anti-spoofing de identidade
  (IDOR), react-router v7 (CVE-2025-68470) e reconciliação apontamento × OP.
- Repositório privado.

---

Software proprietário — EVOK ÁUDIO LTDA. Uso interno.
