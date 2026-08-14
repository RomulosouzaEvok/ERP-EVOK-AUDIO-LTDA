# SYSTEM_MAP.md — ERP-LEGACY-001, Passo 23 (Snapshot técnico)

Mapa de alto nível de como os componentes se relacionam, produzido por
leitura estática (Read/Grep/Glob, sem execução de nenhum comando ou conexão
de banco).

```mermaid
graph TB
  subgraph Clients["Clientes"]
    WEB["client/ (React + Vite SPA)\nNAO-PRODUCAO (pre-Go-Live)"]
    MOB["mobile/ (Expo/React Native)\nNAO-PRODUCAO (sem hardware real)"]
    TV["tv/ (react-native-tvos)\nNAO-PRODUCAO (sem hardware real)"]
  end

  subgraph Backend["server/ - Node+Express+Sequelize monolito modular"]
    API["48 modulos em server/src/modules/*\nClean Architecture: domain/application/infrastructure/presentation\n53 arquivos de rota, 681 endpoints (grep)"]
  end

  subgraph DB["Banco (schema declarado)"]
    PG["PostgreSQL 16\n169 migrations .cjs\n186 modelos Sequelize legado + entidades de dominio por modulo"]
  end

  subgraph External["Integracoes externas declaradas"]
    NFE["Provedores NF-e: FocusNfeProvider, ENotasProvider, MockNfeProvider\n(server/src/modules/fiscal/infrastructure/providers/)"]
    CNAB["CNAB remessa/retorno + OFX conciliacao\n(server/src/modules/financial/infrastructure/cnab e ofx)"]
    N8N["Webhook POST /api/webhooks/n8n\n(server/src/modules/webhooks - 2 endpoints)"]
  end

  subgraph Infra["Infraestrutura declarada"]
    DEVCOMPOSE["docker-compose.yml (dev)\nPRODUCAO REAL confirmada - hospeda os 327 itens reais (APR-2026-016)"]
    PRODCOMPOSE["docker-compose.prod.yml\nNAO-PRODUCAO - nunca exercitado, servidor nao adquirido"]
    CI[".github/workflows/server-ci.yml\nso cobre server/; sem CI para client/mobile/tv"]
  end

  WEB -->|axios / REST JSON| API
  MOB -->|REST JSON| API
  TV -->|REST JSON| API
  API -->|Sequelize| PG
  API --> NFE
  API --> CNAB
  API <-->|entrada/saida| N8N
  DEVCOMPOSE -. hospeda .-> PG
  PRODCOMPOSE -. nao usado ainda .-> PG
  CI -. builda/testa .-> API
```

## Notas do mapa

- **Único ponto de entrada de dado real hoje:** o banco por trás de
  `docker-compose.yml` — não existe banco de produção separado (fonte:
  `PRODUCTION_STATUS_MAP.md`, `docker-compose.yml:55` `CORS_ORIGIN` apontando
  para `localhost:5173`).
- Não há evidência, nesta leitura estática, de comunicação direta
  `client/`↔banco ou `mobile/`↔banco sem passar pelo `server/` — toda
  integração observada nos globs de infraestrutura passa por `axios`/REST
  contra a API Express.
- `webhooks` é a única integração backend-to-backend declarada (n8n),
  citada na memória do projeto como "fora do ar" — não reverificado nesta
  sessão (proibido testar conexão real). Ver `INTEGRATION_INVENTORY.md` para
  o inventário detalhado de integrações.
- Nenhum componente de IA/LLM/RAG identificado em operação (consistente com
  a auditoria anterior de `dc52081`).

---

*Produzido pelo agente `vericore-architecture-auditor` em modo read-only
reforçado; conteúdo persistido neste caminho pelo orquestrador a partir da
resposta do agente, sem edição de conteúdo (apenas remoção de acentos dentro
do bloco Mermaid, que não os aceita de forma confiável em todos os
renderizadores).*
