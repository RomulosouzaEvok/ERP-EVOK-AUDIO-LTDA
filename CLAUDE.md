# CLAUDE.md — ERP Evok Áudio LTDA
**Single Source of Truth (SSOT) para o projeto ERP**

**Status:** 🟡 Pré-Go-Live G6 — bloqueadores P0 remediados (commit `d1d3aff`, 2026-08-02) | **Data:** 2 de agosto de 2026  
**Próximo passo:** UAT completo → aprovação formal G6 → Go-Live

---

## 1. Overview

**ERP EVOK ÁUDIO LTDA** é um sistema completo de gestão empresarial para manufatura de auto-falantes profissionais em larga escala (~100-150 colaboradores, 21 departamentos).

### Cobertura
- **RH & Departamentos:** Estrutura organizacional, funcionários, turnos
- **Vendas & Comercial:** Pedidos, cotações, projeção financeira
- **Compras & Suprimentos:** Requisição (NOVO), pedidos, recebimento, avaliação de fornecedores
- **Estoque & Almoxarifado:** Entrada/saída, inventário mobile (QR Code), reservas, curva ABC
- **Produção & PCP:** Ordens de Produção (OP), apontamento, BOM (estrutura de produtos), rotas de manufatura
- **Qualidade:** Inspeção, não-conformidades (NC), testes acústicos
- **Financeiro & Contabilidade:** Contas a pagar/receber, fluxo de caixa, projeção 30 dias
- **Patrimônio & Manutenção:** Ativos, QR Code, depreciação, manutenção
- **Relatórios & Dashboard:** KPIs, análise de estoque, eficiência de produção, auditor inteligente

### Status Atual
- ✅ Backend: Node.js + Express + Sequelize (30+ módulos, 32 rotas montadas)
- ✅ Database: PostgreSQL 16 (24 migrations versionadas, 133 foreign keys)
- ✅ Frontend: React 19 + Vite em `client/` (porta 5173) — 9 módulos com UI completa, 8 parciais, 12 sem tela
- ✅ **4 bloqueadores P0 + 2 P1 remediados em 2026-08-02** (commit `d1d3aff`) — Veja [AUDITORIA_PRE_PRODUCAO_2026-08-02.md](docs/AUDITORIA_PRE_PRODUCAO_2026-08-02.md)

---

## 2. Stack Técnico

| Camada | Tecnologia | Versão | Notas |
|--------|------------|--------|-------|
| **Runtime** | Node.js + TypeScript (`tsx`) | 18+ | Watch mode com nodemon |
| **Web Framework** | Express.js | 4.18 | MVC + Clean Architecture |
| **ORM** | Sequelize | 6.37 | Migrations versionadas, seeds idempotentes |
| **Banco** | PostgreSQL | 16 | Single source of truth, sem alternativas |
| **Autenticação** | JWT + bcrypt | - | 7 dias TTL (configurável), rate-limit 10/15min login |
| **Upload & QR** | Multer + qrcode | 2.2 / 1.5 | Assets armazenados no disco local |
| **Validação** | express-validator | 7.0 | XSS protection, sanitização |
| **Segurança** | Helmet + rate-limit | - | Headers, CORS configurável |
| **Testes** | Jest + Supertest | - | Unit, integration, edge cases |
| **Frontend** | React + TypeScript + Vite | 19 / 8 | React Router v7.18.2, TanStack Query, Tailwind 4/shadcn, Vitest |

### Variáveis de Ambiente Críticas
```bash
DB_HOST              # localhost (Docker) ou IP externo
DB_PASSWORD          # Obrigatória — sem default seguro
JWT_SECRET           # String longa + aleatória
ADMIN_SEED_PASSWORD  # Obrigatória em produção (NODE_ENV=production)
NODE_ENV             # development | production
```

---

## 3. Estrutura de Pastas Crítica

```
erp-evok-audio/
├── server/
│   ├── src/
│   │   ├── models/                  # 18 modelos Sequelize (Item, Fornecedor, OP, etc)
│   │   ├── modules/                 # Módulos por domínio
│   │   │   ├── auth/                  # Login, JWT, perfis (admin, operator, financial)
│   │   │   ├── products/              # Produtos/Items (HANDOFF em Fase 4)
│   │   │   ├── manufacturing/         # Ordens de Produção, apontamento
│   │   │   ├── procurement/           # Requisição (NOVO), compras, fornecedores
│   │   │   ├── warehouse/             # Estoque, inventário, movimentações
│   │   │   ├── sales/                 # Vendas, clientes, contas a receber
│   │   │   ├── financial/             # Financeiro, fluxo de caixa
│   │   │   └── ...
│   │   ├── controllers/             # Camada HTTP
│   │   ├── middlewares/             # Auth, errorHandler
│   │   ├── routes/                  # 19 arquivos de rotas
│   │   ├── services/                # Dashboard, relatórios, QR, upload
│   │   ├── scripts/backfill/        # Migrations Product→Item (Fase 4)
│   │   └── config/
│   ├── database/
│   │   └── postgresql/
│   │       ├── 01_schema.sql        # Schema base (37 tabelas)
│   │       ├── 02a_extend_item_estruturas.sql  # BOM estendido
│   │       ├── 02b_item_categorias.sql        # Categorias novo modelo
│   │       ├── 04a_inventory_movements_expand.sql  # Dual-read Phase 4.1
│   │       └── ...
│   └── __tests__/                   # Unit, integration, edge tests
├── client/                          # Frontend React 19 + Vite (páginas, rotas, api client)
├── docs/
│   ├── projeto/                     # Plano arquitetura, use-cases
│   │   ├── 00-README.md
│   │   ├── 01-PLANO.md
│   │   ├── 02-PLANO_INDUSTRIAL.md
│   │   └── 04-USE_CASES.md
│   ├── producao/                    # Documentação operacional
│   │   ├── 06-BOM.md
│   │   └── ...
│   ├── AUDITORIA_PRE_PRODUCAO_2026-08-02.md  # CRÍTICO: Bloqueadores
│   ├── HANDOFF_CODEX.md             # Product/Item migration (Phase 1–4.1)
│   ├── DATABASE.md                  # Modelo de dados
│   └── ...
├── package.json
└── CLAUDE.md                        # Este arquivo
```

---

## 4. Módulos Principais

### Autenticação & Autorização
- **Login JWT:** rate-limited, 10 tentativas/15min, 7 dias TTL
- **Perfis:** admin (acesso total), operator (leitura/escrita operacional), financial (leitura financeira)
- **Proteção:** RBAC em 100% das rotas; anti-spoofing de identidade (requester/approved_by/operator vêm do JWT ou são validados por FK) — remediação 3.1 de 2026-08-02

### Produtos & Engenharia (Handoff em Execução)
- **Núcleo (Item):** Código, descrição, tipo, estoque, custo padrão — **NUNCA MUDA** (MRP hot path)
- **Extensões:** 
  - `ItemDetalheComercial` (1:1 obrigatória): preço, NCM/CEST, peso, localização, desenho
  - `ItemEspecificacaoTecnica` (1:1 opcional): Thiele-Small (13 parâmetros JSONB), família técnica
  - `ItemCategoria` (1:n): categorias refatoradas em novo modelo
- **BOM (ItemEstrutura):** Hierarquia multi-nível, componentes, perdas %, custo total, validação de ciclos
- **Status:** Fase 1–2 (schema + backfill scripts) ✅ | Fase 4 (dual-read, inventory_movements) ✅ | Fase 5 (módulos app) 🔧

### Planejamento & Produção
- **OP (Ordem de Produção):** Status (planned → released → in_progress → completed), vínculo com venda
- **Apontamento:** Quantidade produzida, refugo, parada de máquina, downtime (CRÍTICO: reconciliação com OP) 
- **Rotas de Manufatura:** Operações sequenciais, setup, cycle time, labor time
- **MRP:** Roda contra estoque REAL (não congelado), requisita materiais via **Requisição de Compra** (NOVO P0)

### Compras & Suprimentos
- **Requisição de Compra (NOVO):** Origem da cadeia de suprimentos, rastreabilidade 100% (bloqueador P0)
- **Pedido de Compra:** Origem em Requisição, status (pending → approved → sent → partial → received)
- **Fornecedores:** Avaliação, prazos, termos de pagamento
- **Recebimento:** Entrada no estoque, geração de Contas a Pagar (pós-recebimento, não em aprovação)

### Estoque & Logística
- **Inventário:** Entrada/saída/ajuste com rastreamento completo
- **Movimentações:** Cada evento registra tipo (in/out/adj), motivo, quantidade, custo
- **Reservas:** Global por item (CRÍTICO: vincular por OP em P1 para evitar canibalização)
- **Mobile QR:** Leitura em lote para inventário rápido
- **Curva ABC:** Análise de rotatividade e valor

### Vendas & Financeiro
- **Pedidos:** Itens, descontos, transições de status (quote → confirmed → invoiced)
- **Contas a Receber:** Origem em vendas, controle de inadimplência
- **Contas a Pagar:** Manual + automática de compras (no recebimento)
- **Fluxo de Caixa:** Projeção 30 dias, conciliação
- **Relatórios:** Dashboard KPI (vendas hoje/mês/ano), análise cliente

### Qualidade & Compliance
- **Inspeção:** Entrada, in-process, final, auditoria
- **Não-Conformidades:** Registro de defeitos, ações corretivas
- **Testes Acústicos:** Parâmetros Thiele-Small (fs, Qms, Vas, etc)
- **Rastreabilidade:** Lote/série para cada produto acabado

---

## 5. Go-Live Readiness (Crítico)

### ✅ Bloqueadores remediados em 2026-08-02 (commit `d1d3aff`)
Veja [AUDITORIA_PRE_PRODUCAO_2026-08-02.md](docs/AUDITORIA_PRE_PRODUCAO_2026-08-02.md) e [LEVANTAMENTO_ERP_2026-08-02.md](docs/LEVANTAMENTO_ERP_2026-08-02.md).

| ID | Bloqueador | Status |
|----|-----------|--------|
| 1.1 | Requisição de Compra | ✅ RESOLVIDO — módulo `/api/purchase-requisitions` testado end-to-end |
| 1.2 | MRP congelado | ✅ RESOLVIDO — MRP contra estoque real (dual-read), validado |
| 2.1 | Foreign keys ausentes | ✅ RESOLVIDO — 133 FKs via migration versionada |
| 3.1 | IDOR / spoofing de identidade | ✅ RESOLVIDO — RBAC 100% + identidade do JWT |
| 3.2 | react-router CVE-2025-68470 | ✅ RESOLVIDO — v7.18.2 |
| 1.3 | Apontamento × OP desconectados | ✅ RESOLVIDO — reconciliação na conclusão da OP |

### Roadmap
1. **Fase 1 (P0):** ✅ Concluída em 2026-08-02 → **próximo: UAT → Go-Live G6**
2. **Fase 2 (P1):** Catálogo item×fornecedor (N:N), conversão requisição→pedido, MRP fecha ciclo (plano→OP/requisição), telas de MRP/requisição/qualidade — ver LEVANTAMENTO
3. **Fase 3 (P2):** Capacidade finita/centros de trabalho, custo real vs padrão, TypeScript strict
4. **Fase 4 (P3):** Relatórios de manufatura (OEE, refugo), CI/CD, unificação schema legado/novo

---

## 6. Runbook Operacional

### Setup Local
```bash
# 1. Variáveis de ambiente
cp .env.example .env
# Preencha: DB_PASSWORD, JWT_SECRET, ADMIN_SEED_PASSWORD

# 2. Instale dependências
npm run install-all

# 3. Suba PostgreSQL (Docker)
docker compose up -d

# 4. Rode backend em watch mode
npm run server
# Seed automático na primeira execução (admin, departamentos, categorias)

# 5. Teste
npm test                    # Suíte completa
npm run test:unit          # Apenas unitários
npm run test:integration   # Apenas integração
```

### Migrations
```bash
cd server

npm run migration:status    # Lista migrations
npm run migration:up        # Aplica próxima
npm run migration:down      # Desfaz última
npm run migration:up --name 01_schema.sql  # Aplica específica
```

### Deploy (CI/CD)
- **Branch:** `main` (produção)
- **Env:** Docker Compose (PostgreSQL 16 gerenciado)
- **Secrets:** `.env` gerado via secrets manager (não versionado)
- **Entrypoint:** `npm start` (Node.js em produção)
- **Rollback:** Revert Git commit + re-deploy + `npm run migration:down` se necessário

### Monitoramento Pós-Go-Live
- **Logs:** Console (TODO: Winston structured logging em P1)
- **Alertas:** Estoque zerado/negativo, OP atrasadas, contas vencidas
- **Health Check:** `GET /health/live` (processo) e `GET /health/ready` (processo + PostgreSQL) — implementados
- **Backup:** PostgreSQL dump diário via cron

---

## 7. Decisões Arquiteturais & Trade-offs

### Item Core Intocado + Extensões por Domínio
**Decisão:** `Item` mantém 12 colunas críticas para MRP (nunca muda); extensões em tabelas separadas.

**Por quê:** 
- MRP não acessa campos comerciais/técnicos → sem N+1, sem bloqueios
- Novos tipos de produto (CABOS, AMPLIFICADORES) → sem ALTER TABLE
- Facilita versionamento de especificações técnicas

**Tradeoff:** Mais JOINs em queries comerciais, mas ganho em flexibilidade e performance.

### Requisição de Compra como Origem
**Decisão:** Toda cadeia de suprimentos começa em Requisição (não em OP/previsão).

**Por quê:** 
- Rastreabilidade 100% (origem → requisição → compra → recebimento → estoque)
- Auditoria fiscal simples
- Requisição pode vir de: MRP, OP, estoque baixo, ou planejador

**Tradeoff:** Passo extra no fluxo, mas requisito P0 de auditoria.

### MRP Contra Estoque Real, Não Congelado
**Decisão:** MRP roda cada vez que venda/OP é criada, contra estoque atualizado (não snapshot).

**Por quê:** Não há necessidade de congelar; base de dados é transacional
- Requisição gerada com dados atuais
- Incorpora compras recentes e ajustes

**Tradeoff:** Menos previsível (não há "MRP run" com hora específica), mas mais preciso.

### Foreign Keys Obrigatórias
**Decisão:** Integridade referencial obrigatória — 133 FKs aplicadas via migrations versionadas, com `ON DELETE RESTRICT` (padrão) ou `CASCADE`/`SET NULL` (quando apropriado).

**Por quê:** Integridade referencial, sem órfãos, auditoria
**Tradeoff:** Mais rígido (ex: não pode deletar fornecedor com compras abertas), mas banco garante consistência

### Sem Soft Delete Padrão (Apenas Category)
**Decisão:** Apenas `Category` tem soft delete (`active` flag); outras tabelas usam `status` enum ou `deleted_at`.

**Por quê:** Auditoria fiscal exige histórico imutável (ex: OP, NF-e não podem "desaparecer")
**Tradeoff:** Cuidado com queries (sempre filtra `active = true` ou `status != 'deleted'`)

---

## 8. Links Críticos

### Documentação Técnica
- **[docs/projeto/01-PLANO.md](docs/projeto/01-PLANO.md)** — Arquitetura, 18 modelos, stack, roadmap técnico
- **[docs/projeto/02-PLANO_INDUSTRIAL.md](docs/projeto/02-PLANO_INDUSTRIAL.md)** — 21 departamentos, BOM de auto-falante, processos produção
- **[docs/projeto/04-USE_CASES.md](docs/projeto/04-USE_CASES.md)** — Casos de uso (UC-01 a UC-XX)
- **[docs/HANDOFF_CODEX.md](docs/HANDOFF_CODEX.md)** — Migração Product → Item (Fase 1–4.1, backfill scripts)
- **[docs/DATABASE.md](docs/DATABASE.md)** — Modelo de dados, ER diagram

### Crítico — Go-Live
- **[docs/AUDITORIA_PRE_PRODUCAO_2026-08-02.md](docs/AUDITORIA_PRE_PRODUCAO_2026-08-02.md)** — 4 bloqueadores P0, 15 altos P1, plano 30h
- **[docs/API.md](docs/API.md)** — Endpoints, payloads, erros

### Operacional
- **[README.md](README.md)** — Setup rápido, scripts npm
- **[docs/DOCKER_POSTGRES_SETUP.md](docs/DOCKER_POSTGRES_SETUP.md)** — Docker Compose, troubleshooting DB
- **[docs/DEPLOY.md](docs/DEPLOY.md)** — CI/CD, produção

### Funcional por Área
- **[docs/producao/06-BOM.md](docs/producao/06-BOM.md)** — Estrutura de produtos (detalhado)
- **[docs/00-ESTRUTURA_ORGANIZACIONAL.md](docs/00-ESTRUTURA_ORGANIZACIONAL.md)** — 21 departamentos
- Mais em `docs/comercial/`, `docs/financeiro/`, `docs/qualidade/`, etc.

---

## 9. Perguntas Frequentes

**P: Por que Go-Live está bloqueado?**  
R: Não está mais bloqueado pelos 4 críticos — todos remediados em 2026-08-02 (commit d1d3aff). O gate remanescente é UAT + aprovação formal G6.

**P: Como codar um novo módulo?**  
R: Siga `modules/{modulo}/{use-cases,repositories,controllers}/` padrão Clean Architecture. Modelos em `src/models/`, rotas em `src/routes/`.

**P: Quem aprova o Go-Live?**  
R: CTO/Tech Lead (plano 30h), CFO (riscos), Gerente Produção (rastreabilidade), Compliance (LGPD/ISO).

**P: Frontend está pronto?**  
R: Parcialmente. Existe em `client/` (React 19 + Vite, porta 5173) com login, dashboard, produtos, vendas, compras, produção/BOM, financeiro, patrimônio, usuários e rastreabilidade. Faltam telas para 12 módulos do backend (MRP, requisição de compra, qualidade, manutenção, RH, relatórios, etc.) — ver docs/LEVANTAMENTO_ERP_2026-08-02.md.

**P: Posso rodar em MySQL/SQLite?**  
R: Não. Apenas PostgreSQL 16 é suportado (veja README.md seção "Diretriz de arquitetura").

---

## 10. Contato & Escalação

- **CTO / Tech Lead:** Plano técnico 30h, aprovação P0
- **CFO:** Risco contábil (custeio, payable), aprovação fiscal
- **Gerente Produção:** Validação rastreabilidade, OP + apontamento
- **Compliance:** LGPD conformidade, ateste ISO (se aplicável)
- **Claude Code Agents:** `claude --agent evok-production-remediation` ou `@evok-production-remediation` em sessão; `claude --agent PromadorFonteEnd` ou `@PromadorFonteEnd` para tarefas de frontend; `claude --agent AdmDBA` ou `@AdmDBA` para schema e PostgreSQL; `claude --agent iterative-review` ou `@iterative-review` para revisões multi-agente; `claude --agent cleanliness-review` ou `@cleanliness-review` para limpeza e polimento de código

---

**Versão:** 1.0 SSOT  
**Última atualização:** 2 de agosto de 2026  
**Próxima revisão:** Pós-Go-Live (semana 1 de setembro)

Remova referências a análises antigas. Este documento é o guia único de verdade.
