# Requisitos Não Funcionais (RNF) — ERP EVOK ÁUDIO

**Status:** 🟡 Parcial — este documento formaliza o que já está
**implementado e verificável no código**. Onde não existe implementação,
teste de carga ou configuração explícita, o item está marcado
"não especificado formalmente" em vez de um número inventado. Não é uma
lista de metas aspiracionais — é o retrato do que existe hoje, com
lacunas explícitas para o time de negócio decidir.

---

## 1. Desempenho / Tempo de resposta

| Item | Valor | Status | Fonte |
|---|---|---|---|
| SLA de tempo de resposta da API (p95/p99) | Não especificado formalmente | `[PENDENTE]` | Nenhum teste de carga (k6, artillery, etc.) encontrado no repositório |
| Paginação em listagens | Aplicada nos principais endpoints de listagem | `[IMPLEMENTADO]` | `docs/arquitetura/API.md`, controllers com `page`/`limit` |
| Pool de conexões PostgreSQL | dev: 10 conexões / produção: 20 conexões | `[IMPLEMENTADO]` | `server/src/config/database.ts` |
| Transações em operações críticas | Vendas, compras, produção, contagem cíclica, conciliação bancária usam transação Sequelize | `[IMPLEMENTADO]` | Use cases correspondentes (`CreateSaleUseCase`, `ReceivePurchaseUseCase`, etc.) |
| Auto-refresh do painel Android TV | 60 segundos | `[IMPLEMENTADO]` | `tv/` — CLAUDE.md §1 |

**Lacuna conhecida:** não há benchmark formal de tempo de resposta sob
carga real (nº de usuários simultâneos, volume de OPs/vendas). Recomendado
antes do Go-Live definitivo com uso pleno de ~100-150 colaboradores.

---

## 2. Segurança

| Item | Valor | Status | Fonte |
|---|---|---|---|
| Autenticação | JWT, TTL configurável via `JWT_EXPIRE` (padrão `7d`) | `[IMPLEMENTADO]` | `.env.example`, `server/app.ts` |
| Renovação de sessão | `POST /api/auth/refresh` (renovação deslizante, requer token ainda válido) | `[IMPLEMENTADO]` | `docs/arquitetura/API.md` §1, `RefreshTokenUseCase.ts` |
| Rate-limit login (`/api/auth/login`) | 10 tentativas / 15 min | `[IMPLEMENTADO]` | `server/app.ts` (`authLimiter`) |
| Rate-limit registro (`/api/auth/register`) | 5 tentativas / 60 min | `[IMPLEMENTADO]` | `server/app.ts` (`registerLimiter`) |
| Rate-limit refresh token | 30 requisições / 15 min por usuário | `[IMPLEMENTADO]` | `server/app.ts` (`refreshLimiter`), `docs/arquitetura/API.md` §1 |
| Rate-limit geral de API | 300 requisições / 15 min (100.000 em ambiente de teste) | `[IMPLEMENTADO]` | `server/app.ts` (`apiLimiter`) |
| Rate-limit recuperação de senha | 10 tentativas / 15 min | `[IMPLEMENTADO]` | `server/app.ts` (`passwordRecoveryLimiter`) |
| Hash de senha | bcrypt | `[IMPLEMENTADO]` | modelo `User` |
| Headers de segurança | Helmet | `[IMPLEMENTADO]` | `server/app.ts` |
| CORS | Restrito por `CORS_ORIGIN` configurável | `[IMPLEMENTADO]` | `server/app.ts`, `.env.example` |
| RBAC | 100% das rotas com `authenticate` + `authorizeModule`/checagem de role; perfis de acesso configuráveis por módulo (`operate`/`approve`) | `[IMPLEMENTADO]` | `docs/business/BUSINESS_RULES.md`, `docs/database/DATABASE.md` (access_profiles) |
| Anti-spoofing de identidade | `requester`/`approved_by`/`operator` vêm do JWT ou são validados por FK, nunca aceitos livres do payload | `[IMPLEMENTADO]` | remediação 3.1 de `docs/governance/auditorias/AUDITORIA_PRE_PRODUCAO_2026-08-02.md` |
| Validação/sanitização de entrada | express-validator (XSS), Zod em vários módulos novos | `[IMPLEMENTADO]` | validators por módulo |
| TLS em produção | `[PENDENTE]` — depende do reverse proxy ainda não implantado | `[PENDENTE]` | `docs/infra/DEPLOY_UBUNTU.md` |
| SSL na conexão com o banco | Obrigatório em produção (`DB_SSL=true`, validado no boot) | `[IMPLEMENTADO]` (validação) / `[PENDENTE]` (certificado real do servidor de produção) | `server/src/config/runtimeEnv.ts` |
| Segredos obrigatórios sem default fraco | `DB_PASSWORD`, `JWT_SECRET`, `ADMIN_SEED_PASSWORD` exigidos sem fallback previsível; `ADMIN_SEED_PASSWORD` também é validada no seed inicial | `[IMPLEMENTADO]` | `docker-compose.yml`, `runtimeEnv.ts`, `seeds.ts` |
| Auditoria de operações sensíveis | `AuditLog` (ações de usuário), Winston estruturado para logs de sistema | `[IMPLEMENTADO]` | modelo `AuditLog`, `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md` |
| Vulnerabilidades de dependências conhecidas | `npm audit`: 0 vulnerabilidades (última verificação 2026-08-04, após upgrade react-router) | `[IMPLEMENTADO]` (no momento da verificação) | CLAUDE.md §5 |
| Teste de penetração / pentest formal | Não realizado | `[PENDENTE]` | Não especificado formalmente em nenhum documento |
| LGPD — política formal de retenção/anonimização de dados pessoais | Não especificado formalmente além de RBAC e auditoria | `[PENDENTE]` | — |

---

## 3. Disponibilidade e confiabilidade

| Item | Valor | Status | Fonte |
|---|---|---|---|
| Health check de processo | `GET /health/live` | `[IMPLEMENTADO]` | `server/src/routes/health.ts` |
| Health check de dependência (DB) | `GET /health/ready` | `[IMPLEMENTADO]` | `server/src/routes/health.ts` |
| Restart automático de containers | `restart: unless-stopped` (Postgres e API) | `[IMPLEMENTADO]` (dev) | `docker-compose.yml` |
| Healthcheck de container Docker | Postgres (`pg_isready`) e API (`/health/ready`) | `[IMPLEMENTADO]` | `docker-compose.yml` |
| SLA de disponibilidade (uptime %) | Não especificado formalmente | `[PENDENTE]` | — |
| Backup do banco | Dump diário via cron — plano documentado, aguardando servidor de produção | `[PENDENTE]` | `docs/infra/DEPLOY_UBUNTU.md`, `CLAUDE.md` §5 |
| Backup de uploads (`app_uploads`) | Precisa acompanhar o backup do dump; ainda não implantado em produção | `[PENDENTE]` | `docker-compose.yml` (comentários) |
| Plano de disaster recovery formal | Delegado ao agente `AdmDBA` (escopo próprio, mais profundo) | `[PENDENTE]` — fora do escopo deste documento | Ver nota abaixo |

> **Nota de escopo:** o Plano de Disaster Recovery detalhado (RPO/RTO,
> procedures, triggers de banco) está sendo tratado separadamente pelo
> agente `AdmDBA`, junto com o Dicionário de Dados completo e a Matriz de
> Privilégios — não duplicado aqui para evitar divergência de duas fontes.

---

## 4. Escalabilidade

| Item | Valor | Status |
|---|---|---|
| Arquitetura horizontal (múltiplas instâncias de API) | Não testada/configurada — `docker-compose.yml` sobe uma única instância da API | `[PENDENTE]` |
| Volume de dados/transações esperado (dimensionamento) | ~100-150 colaboradores, 21 departamentos (escala de negócio conhecida) — sem dimensionamento técnico formal (TPS, GB/ano) | `[PENDENTE]` |
| Cache | Não implementado (sem Redis/cache de aplicação) | `[PENDENTE]` |

---

## 5. Compatibilidade / plataforma

| Item | Valor | Status |
|---|---|---|
| Banco de dados suportado | PostgreSQL 16 exclusivamente — sem suporte a MySQL/SQLite (decisão arquitetural documentada) | `[IMPLEMENTADO]` |
| Node.js | 18+ | `[IMPLEMENTADO]` |
| Navegadores suportados (frontend web) | Não especificado formalmente (React 19 + Vite, sem matriz de compatibilidade documentada) | `[PENDENTE]` |
| App mobile — validação em hardware real | Ainda não testado em dispositivo físico (só typecheck/bundle) | `[PENDENTE]` — checklist em `mobile/README.md` §5 |
| App Android TV — validação em hardware real | Ainda não testado em hardware físico (só typecheck/bundle) | `[PENDENTE]` — checklist em `tv/README.md` §5 |

---

## 6. Observabilidade

| Item | Valor | Status |
|---|---|---|
| Logging estruturado | Winston — JSON em produção, colorido em dev; integrado em request-logger, errorHandler e boot | `[IMPLEMENTADO]` |
| Rotação de log de arquivo | Não implementada nativamente — `LOG_FILE` opcional sem rotação; depende de `logrotate` externo se usado em produção | `[PENDENTE]` |
| Alertas de negócio (estoque zerado/negativo, OP atrasada, contas vencidas) | Cobertos via relatórios/dashboard e "sinal de handoff" (semáforo verde/amarelo/vermelho) — sem canal de notificação push/email automatizado | `[IMPLEMENTADO]` (visualização) / `[PENDENTE]` (notificação ativa) |
| Webhook de saída para alertas externos (Slack/Discord/Teams) | Suportado via variável de ambiente, mas configuração real não confirmada em produção | `[IMPLEMENTADO]` (mecanismo) / não verificado em uso real |

---

## Referências

- `server/app.ts` — rate limiters, helmet, CORS.
- `server/src/config/runtimeEnv.ts` — validação de variáveis críticas.
- `server/src/config/database.ts` — pool de conexões.
- `.env.example` — variáveis de ambiente e seus defaults.
- `docs/arquitetura/API.md` — comportamento documentado de cada endpoint.
- `docs/governance/auditorias/AUDITORIA_PRE_PRODUCAO_2026-08-02.md` — remediações de segurança P0/P1.
- `CLAUDE.md` §5 — Go-Live Readiness.
