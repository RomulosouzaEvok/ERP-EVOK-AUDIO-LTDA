# 🚀 GO-LIVE G6 CHECKLIST — ERP Evok Áudio
## Plano de Execução Faseado com Decisões Go/No-Go

**Data Planejada (original):** 2 de agosto de 2026 — **superada**  
**Versão:** 1.2 — reconciliada em 2026-08-06  
**Status:** 🟡 **FASE 1 (bloqueadores P0) CONCLUÍDA** — commit `d1d3aff`, 2026-08-02. **Fase 2/P1 majoritariamente entregue entre 2026-08-04 e 2026-08-06** (RBAC completo, múltiplos depósitos, custeio real, rastreabilidade por lote/QR, apps mobile e Android TV novos — ver `CLAUDE.md` seção 5 e `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md`). Gate atual continua **inalterado**: **UAT + aprovação formal G6**, ainda **não iniciado**. Deploy (Fase 2 deste checklist — Go-Live Day) **NÃO autorizado** — falta servidor de produção.  
**Horizonte:** 30h pré-Go-Live (✅ executadas) + Go-Live Day (⏳ aguardando gate) + 48h pós-Go-Live (⏳ não iniciado)  
**SSOT:** `CLAUDE.md` (seção 5 "Go-Live Readiness") e `docs/governance/auditorias/AUDITORIA_PRE_PRODUCAO_2026-08-02.md` são a fonte da verdade sobre o status dos bloqueadores. Este documento é o plano operacional/checklist detalhado, reconciliado com essas fontes.

> ⚠️ **Nota de reconciliação (2026-08-04):** este arquivo estava desatualizado —
> marcava os 4 bloqueadores P0 originais como `[ ]`/`⏳` quando na verdade
> já haviam sido remediados em 2026-08-02 (commit `d1d3aff`). Os itens abaixo
> foram atualizados com evidência (data, commit, arquivo/local da prova).
> Itens de execução operacional do Go-Live Day (Fase 2) e pós-Go-Live
> (Fase 3) que dependem de infraestrutura real (Kubernetes, Datadog,
> PagerDuty) **permanecem `[PENDENTE]`** — são templates de processo que só
> serão executados/preenchidos no dia real do deploy, e dependem da compra
> do servidor de produção (ver pendência (a) abaixo).

> ⚠️ **Nota de reconciliação (2026-08-06 — auditoria de infraestrutura):**
> confirmado por auditoria dedicada que a infraestrutura real deste projeto
> **não é** Kubernetes/Datadog/PagerDuty — é **Docker Compose + um único
> VPS/servidor on-premise** (ainda não adquirido). Todas as menções a
> `kubectl`, Kubernetes, Datadog, PagerDuty, "3 réplicas"/"blue-green" e
> ferramentas equivalentes nas seções 2.1, 2.3, 3.1 e 3.3 abaixo são
> **[NÃO APLICÁVEL]** ao ambiente real de deploy — são resíduos de um
> template genérico de checklist de Go-Live e devem ser lidos como
> inspiração de processo (o que observar, quando escalar), não como
> comandos literais a executar. O runbook real de deploy (Docker Compose,
> `docker compose up -d`, healthcheck HTTP simples, logs via
> `docker compose logs`) está em `docs/infra/DEPLOY_UBUNTU.md` e
> `docs/infra/DEPLOY.md` — usar esses como referência operacional, não as seções
> de Kubernetes abaixo.

---

## 📊 RESUMO EXECUTIVO

| Fase | Duração | Objetivo | Status Real (2026-08-06) | Go/No-Go |
|------|---------|----------|---------------------------|----------|
| **Fase 1** | 30h | Resolver 4 bloqueadores + UAT | ✅ Bloqueadores resolvidos (d1d3aff, 2026-08-02) \| ✅ Fase 2/P1 majoritariamente entregue (2026-08-04/06) \| ⏳ UAT ainda não executado | Decision Point 1 — **aberto** |
| **Fase 2** | 4-6h | Deploy + Smoke Tests | ⏳ Não iniciada — bloqueada por (a) falta de servidor de produção e (b) Decision Point 1 aberto | Decision Point 2 — não alcançável ainda |
| **Fase 3** | 48h | Monitoramento + Suporte | ⏳ Não iniciada | Decision Point 3 — não alcançável ainda |

**4 Bloqueadores Críticos originais (P0) — todos remediados em 2026-08-02, commit `d1d3aff`:**
1. ✅ **[IMPLEMENTADO] Requisição de Compra inexistente** (1.1) — módulo `/api/purchase-requisitions` implementado e testado end-to-end
2. ✅ **[IMPLEMENTADO] MRP congelado contra estoque_atual** (1.2) — MRP roda contra estoque real (dual-read), validado
3. ✅ **[IMPLEMENTADO] 37 tabelas sem Foreign Keys** (2.1) — 133 FKs aplicadas via migration `20260802-000003`
4. ✅ **[IMPLEMENTADO] IDOR sem validação tenant** (3.1) — RBAC 100% + anti-spoofing de identidade a partir do JWT

**Pendências reais restantes para o Go-Live (rastreadas centralmente em `docs/governance/TODO.md` e `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md`):**
- **(a) [PENDENTE] Servidor de produção não adquirido** — VPS/on-premise ainda não comprado; bloqueia o deploy (Fase 2 / F10) independentemente do gate de UAT.
- **(b) [PENDENTE] UAT completo com stakeholders** — nunca executado; é o gate formal da Fase 1 (Decision Point 1).
- **(c) [x] Risco residual `react-router@7.18.2` — RESOLVIDO em 2026-08-04.** Advisory `GHSA-qwww-vcr4-c8h2` fechado via upgrade real para `react-router@8.3.0` (unificação `react-router-dom` → `react-router` a partir da v8). `npm audit --omit=dev` em `client/` confirma 0 vulnerabilidades. Detalhe em `docs/governance/TODO.md`, seção "Pendências de Segurança / Gate G6", e `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md`, apêndice 2026-08-04.
- **(d) [PENDENTE] Testes de integração RBAC contra infraestrutura real** — cobertura foi adicionada em `server/tests/integration/legacy-routes-rbac-regression.test.ts` (2026-08-04), mas roda via `describe.skip` por falta de `RUN_INTEGRATION=true` + `TEST_API_URL` + `TEST_AUTH_TOKEN` + PostgreSQL acessível no ambiente de CI/dev atual. Precisa ser executada de fato contra infra real antes do Go-Live.
- **(e) [PENDENTE] Apps `mobile/` e `tv/` (novos em 2026-08-06) sem validação em hardware real.** Entregues e auditados (7 agentes em paralelo, achados P0/altos já remediados no mesmo dia — ver `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md`, entrada 2026-08-06), mas validados só por typecheck/bundle. Checklist de validação em dispositivo real em `mobile/README.md` §5 e `tv/README.md` §5.
- **(f) [PENDENTE] Decisão de produto — JWT de 7 dias × painel de TV "sempre ligado".** O app `tv/` roda continuamente em um painel fixo; falta decidir refresh token dedicado, TTL específico, ou runbook de relogin periódico. Registrado em `docs/governance/TODO.md`, seção "2026-08-06".

---

# FASE 1: PRÉ-GO-LIVE (30h — Semana Final de Desenvolvimento)

## 🎯 Objetivo Geral
Garantir que os 4 bloqueadores críticos sejam resolvidos, testados com stakeholders e aprovados formalmente antes de qualquer deploy.

---

## 1.1 — RESOLUÇÃO DE BLOQUEADORES CRÍTICOS (21h)

### P0.1: Requisição de Compra gerada na Cadeia (8h) — ✅ [IMPLEMENTADO]
**Status:** Remediado em 2026-08-02, commit `d1d3aff`.
**Evidência:** Módulo `/api/purchase-requisitions` implementado e testado end-to-end (ver `CLAUDE.md` seção 5, tabela de bloqueadores; `docs/governance/auditorias/AUDITORIA_PRE_PRODUCAO_2026-08-02.md` seção "Plano de Ação → Fase 1", item marcado `[x]`).
**Responsável:** Programador Backend + TechLead  
**⏱️ Estimado:** 8h  
**📍 Arquivo crítico:** `src/usecases/SupplyChainUseCase.ts`  
**Dependência:** Modelo Requisição criado e migrado  

- [x] **Análise (0.5h)**
  - [x] Revisar fluxo atual: MRP → PA → Requisição deveria nascer aqui
  - [x] Definir regra: Requisição criada automaticamente na geração da PA ou manualmente?
  - [x] Documento de decisão: RQ criada por job async ou síncrono?
  - 👤 Responsável: Backend Tech Lead

- [x] **Implementação (6h)**
  - [x] Criar modelo/tabela `purchase_requisitions` se não existe
  - [x] Adicionar endpoint POST `/supply-chain/requisitions` (via módulo `/api/purchase-requisitions`)
  - [x] Lógica: MRP gera PA → trigger automático Requisição
  - [x] Validações: empresa_id, filial_id, tenant_id isolados
  - [x] Testes unitários: 3 casos (criação, validação, erro tenant)
  - 👤 Responsável: Backend Developer

- [ ] **Testes (1.5h)**
  - [x] Test: MRP roda e cria requisição com status `PENDENTE`
  - [x] Test: Requisição vinculada à PA corretamente
  - [x] Test: Auditoria registra origem (MRP trigger)
  - [ ] **[PENDENTE]** UAT: Gestor de Compras valida requisição visível no sistema — ainda não executado (ver pendência (b) no resumo executivo)
  - 👤 Responsável: QA + Gestor de Compras

**🚨 Go/No-Go Decision P0.1:**
- ✅ Requisição criada e visível 100% dos casos
- ✅ Auditoria de origem preenchida
- [PENDENTE] Aprovação de Gestor de Compras (depende do UAT)
- ❌ **NO-GO se:** Requisição criada < 90% dos tempos ou origem não auditável — **não se aplica, critério GO atingido tecnicamente**

---

### P0.2: MRP roda contra estoque_atual REAL (6h) — ✅ [IMPLEMENTADO]
**Status:** Remediado em 2026-08-02, commit `d1d3aff`.
**Evidência:** MRP roda contra estoque real (dual-read), validado (ver `CLAUDE.md` seção 5, item 1.2; `docs/governance/auditorias/AUDITORIA_PRE_PRODUCAO_2026-08-02.md`, "MRP estoque real (1.2) — dual-read validado (BOM + perda %)").
**Responsável:** Programador Backend  
**⏱️ Estimado:** 6h  
**📍 Arquivo crítico:** `src/usecases/MRPUseCase.ts`  
**Bloqueador:** MRP congelado contra `Item.estoque_atual` congelado  

- [x] **Análise (1h)**
  - [x] Investigar por que `estoque_atual` não atualiza durante MRP
  - [x] Revisar fluxo: Apontamento PA → estoque atualiza? (corrigido — ver P0.6)
  - [x] Documento de decisão: estoque_atual = sum(inventory_movements) real-time?
  - 👤 Responsável: Backend Tech Lead

- [x] **Implementação (4h)**
  - [x] Refatorar MRP para usar `inventory_movements`/dual-read em vez de `estoque_atual` cache congelado
  - [x] Adicionar índice em `inventory_movements` se necessário
  - [x] Validar precisão em cálculos
  - [x] Testes: MRP recalcula com dados reais
  - 👤 Responsável: Backend Developer

- [ ] **Validação (1h)**
  - [x] Teste: Apontamento PA aumenta estoque → MRP reflete
  - [x] Teste: Movimentação de estoque → MRP recalcula ofertas
  - [ ] **[PENDENTE]** Performance: MRP roda em < 30s para 5k itens — não há evidência de teste de carga documentado; validar em UAT/pré-deploy
  - 👤 Responsável: QA + DevOps

**🚨 Go/No-Go Decision P0.2:**
- ✅ MRP reflete mudanças de estoque real-time
- ✅ Sem congelamento de netting
- [PENDENTE] Performance aceitável (< 30s) — não testado em escala, validar antes do deploy
- ❌ **NO-GO se:** MRP ainda congelado ou performance > 1min — **congelamento resolvido; performance em escala ainda não validada**

---

### P0.3: Foreign Keys em 37 tabelas operacionais (4h) — ✅ [IMPLEMENTADO]
**Status:** Remediado em 2026-08-02, commit `d1d3aff`.
**Evidência:** 133 FKs aplicadas via migration versionada `20260802-000003` (ver `CLAUDE.md` seção 5, item 2.1: "133 FKs via migration versionada"; `docs/governance/auditorias/AUDITORIA_PRE_PRODUCAO_2026-08-02.md`: "Adicionar FKs (2.1) — 133 FKs via migration `20260802-000003`").
**Responsável:** DevOps + Backend  
**⏱️ Estimado:** 4h (migração + testes)  
**📍 Arquivo crítico:** `migrations/` folder  
**Dependência:** Backup full antes de aplicar  

- [x] **Mapeamento (1h)**
  - [x] Listar tabelas sem FKs (extrair de auditoria)
  - [x] Priorizar: tabelas core (purchase_orders, inventory_movements, bills_of_materials)
  - [x] Identificar ciclos (BOM → Item → BOM?) e resolvê-los
  - 👤 Responsável: Backend Tech Lead + DevOps

- [x] **Migração (2h)**
  - [x] Criar migration: ADD CONSTRAINT para cada FK crítica (133 FKs, migration `20260802-000003`)
  - [x] Validação de dados: nenhuma linha orfã
  - [x] Teste em dev: migration up/down funciona
  - [ ] **[PENDENTE]** Teste em staging real com carga de produção — sem ambiente de staging dedicado; validar quando servidor de produção estiver disponível
  - 👤 Responsável: DevOps + Backend Developer

- [x] **Validação (1h)**
  - [x] Teste: Não conseguir deletar Item com OPs referenciando (RESTRICT aplicado por padrão, ver `CLAUDE.md` seção 7 "Foreign Keys Obrigatórias")
  - [x] Teste: Cascata de deletação (CASCADE/SET NULL onde apropriado)
  - [x] Audit log: FKs adicionadas registradas (migration versionada)
  - 👤 Responsável: QA

**🚨 Go/No-Go Decision P0.3:**
- ✅ FKs críticas aplicadas sem erro de constraint
- ✅ Backup pré-migração confirmado
- ✅ Rollback testado e documentado (migration down disponível via `npm run migration:down`)
- ❌ **NO-GO se:** Há dados orfãos que quebram FK ou rollback falha — **não ocorreu**

---

### P0.4: IDOR — Validação de company_id em cada request (3h) — ✅ [IMPLEMENTADO]
**Status:** Remediado em 2026-08-02, commit `d1d3aff`.
**Evidência:** RBAC 100% em todas as rotas + anti-spoofing de identidade (requester/approved_by/operator vêm do JWT ou são validados por FK) — ver `CLAUDE.md` seção 4 ("Proteção: RBAC em 100% das rotas; anti-spoofing de identidade... remediação 3.1 de 2026-08-02") e seção 5, item 3.1. Cobertura de teste de RBAC ampliada em 2026-08-04 (ver P0.4 nota abaixo e pendência (d) no resumo executivo).
**Responsável:** Backend Security + Tech Lead  
**⏱️ Estimado:** 3h  
**📍 Arquivo crítico:** `src/middleware/authMiddleware.ts`, `src/middleware/tenantMiddleware.ts`  
**Bloqueador:** Usuários acessam recursos de outras empresas  

- [x] **Auditoria (1h)**
  - [x] Listar endpoints vulneráveis: `/items/:id`, `/purchase-orders/:id`, `/inventory/:id`
  - [x] Testar: GET /items/1 como empresa B consegue acessar?
  - [x] Documentar vulnerabilidade encontrada
  - 👤 Responsável: Security Team

- [x] **Implementação (1.5h)**
  - [x] Middleware: validar identidade/permissão via JWT (`authorizeModule` retrofit em todos os módulos — ver commit `8f646dc`)
  - [x] Middleware: cada endpoint verifica autorização e identidade (anti-spoofing)
  - [x] Testes: endpoints críticos cobertos (items, POs, bills, inventory, suppliers)
  - 👤 Responsável: Backend Developer

- [ ] **Teste de Segurança (0.5h)**
  - [x] Tester: Gerar JWT de empresa A, tentar GET /items/:empresa_B_id → esperado 403
  - [x] Esperado: 403 Forbidden — validado
  - [ ] **[PENDENTE]** Teste de integração RBAC dos endpoints de Depósito contra infraestrutura real — cobertura escrita em 2026-08-04 (`server/tests/integration/legacy-routes-rbac-regression.test.ts`), mas roda via `describe.skip` por falta de PostgreSQL/API de teste disponível no ambiente atual; precisa rodar de fato antes do Go-Live (ver pendência (d) no resumo executivo)
  - 👤 Responsável: QA Security

**🚨 Go/No-Go Decision P0.4:**
- ✅ Endpoints críticos com validação de identidade/RBAC
- ✅ Teste de segurança passou (cross-tenant rejected) nos casos cobertos
- [PENDENTE] Execução da suíte de integração RBAC contra infra real (hoje skipped)
- ❌ **NO-GO se:** Qualquer endpoint retorna recurso de outra empresa ou 403 não funciona — **não observado nos testes existentes; integração real ainda deve ser executada**

---

### P0.5: react-router upgrade v7 → v8 (2h) — ✅ [IMPLEMENTADO] (risco residual RESOLVIDO em 2026-08-04)
**Status:** Upgrade original para v7.18.2 concluído em 2026-08-02 (commit `d1d3aff`), resolvendo o CVE-2025-68470 original. Triagem de segurança de 2026-08-04 identificou que a própria v7.18.2 estava na faixa vulnerável de um advisory diferente: `GHSA-qwww-vcr4-c8h2` (CSRF em modo RSC/Server Actions, faixa afetada `>=7.12.0 <8.3.0`). **No mesmo dia (2026-08-04)** foi feito o upgrade para `react-router@8.3.0` (`client/package.json`; `react-router-dom` foi descontinuado a partir da v8 e unificado em `react-router`, incluindo bindings de DOM). `npm audit --omit=dev` em `client/` confirma **0 vulnerabilidades**. Risco fechado, não apenas aceito.
**Evidência:** `CLAUDE.md` seção 5, item 3.2 ("react-router CVE-2025-68470 ✅ RESOLVIDO — v7.18.2"); `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md`, entradas "2026-08-04 — Triagem de Segurança" e apêndice "2026-08-04 — Fechamento react-router@8.3.0"; `docs/governance/TODO.md`, seção "Pendências de Segurança / Gate G6" (item marcado `[x]`).
**Responsável:** Frontend Dev  
**⏱️ Estimado:** 2h  
**📍 Arquivo crítico:** `package.json`, `src/routes/`  
**Bloqueador:** CVE-2025-68470 (open redirect)  

- [x] **Upgrade (1h)**
  - [x] npm update react-router-dom@7 (v7.18.2)
  - [x] Revisar breaking changes na docs
  - [x] Atualizar `<Router>`, `<Route>` se syntax mudou
  - [x] Build sem erros
  - 👤 Responsável: Frontend Developer

- [x] **Testes (1h)**
  - [x] Teste: Navegação básica funciona (home, about, login)
  - [x] Teste: Redirect após login não expõe URL perigosa (CVE-2025-68470 original)
  - [x] Teste: Deep linking funciona
  - [x] npm audit: nenhuma vuln HIGH/CRITICAL — resolvido em 2026-08-04 via upgrade para `react-router@8.3.0` (`>=8.3.0` é o limite superior seguro do advisory `GHSA-qwww-vcr4-c8h2`). `npm audit --omit=dev` em `client/` confirma 0 vulnerabilidades.
  - 👤 Responsável: QA + Frontend Dev

- **Achado correlato (2026-08-04):** `node_modules` local do `client/` estava dessincronizado do lockfile (`react-router-dom@6.30.4` instalado vs `^7.18.2` declarado em `package.json`) — reforça que build de produção deve sempre usar `npm ci` (nunca `npm install`). Achado histórico, sem impacto na versão final `react-router@8.3.0` já em `package.json`.

**🚨 Go/No-Go Decision P0.5:**
- ✅ Upgrade completo (CVE-2025-68470 original resolvido)
- ✅ npm audit clean — risco residual `GHSA-qwww-vcr4-c8h2` fechado em 2026-08-04 via upgrade para `react-router@8.3.0`
- ✅ Testes de navegação passam
- ✅ **GO** — build, testes e audit OK; nenhum risco pendente neste item.

---

### P0.6: Apontamento reconciliação com OP (6h) — ✅ [IMPLEMENTADO]
**Status:** Remediado em 2026-08-02, commit `d1d3aff` (item 1.3 da auditoria, tratado como ALTO mas incluído no pacote de remediação).
**Evidência:** `CLAUDE.md` seção 5, item 1.3 ("Apontamento × OP desconectados ✅ RESOLVIDO — reconciliação na conclusão da OP"); `docs/governance/auditorias/AUDITORIA_PRE_PRODUCAO_2026-08-02.md`: "Apontamento reconciliação (1.3) — reconciliação na conclusão da OP + testes".
**Responsável:** Backend + QA  
**⏱️ Estimado:** 6h  
**📍 Arquivo crítico:** `src/usecases/ProductionReportUseCase.ts`  
**Bloqueador:** Apontamento desconectado da OP, quantity_produced sem validação  

- [x] **Análise (1h)**
  - [x] Revisar fluxo: OP criada → Apontamento registra quantity_produced → reconciliação
  - [x] Validar: quantity_produced não pode > OP.quantidade_planejada
  - [x] Decisão: reconciliação ocorre na conclusão da OP
  - 👤 Responsável: Backend Tech Lead + Gestor Produção

- [x] **Implementação (4h)**
  - [x] Validação: quantity_produced <= OP.quantidade_planejada
  - [x] Reconciliação: quando quantity_produced = OP.quantidade, marcar OP como concluída
  - [x] Reverso: Apontamento deletado → desfazer reconciliação
  - [x] Custo: vinculado ao BOM
  - [x] Testes: casos de reconciliação cobertos
  - 👤 Responsável: Backend Developer

- [ ] **Validação (1h)**
  - [ ] **[PENDENTE]** UAT: Operário aponta 10u → OP marca 10/20 (parcial) — depende do UAT geral (pendência (b))
  - [ ] **[PENDENTE]** UAT: Aponta últimas 10u → OP marca FINALIZADA
  - [ ] **[PENDENTE]** UAT: Deletar apontamento → OP volta a ABERTA
  - [x] Auditoria: cada reconciliação logged (testes automatizados cobrem o fluxo)
  - 👤 Responsável: QA + Gestor Produção

**🚨 Go/No-Go Decision P0.6:**
- ✅ Apontamentos reconciliados com OP (validado por testes automatizados)
- ✅ Sem overshooting (quantity > planejada) — validado em código/testes
- ✅ Reversão funciona
- [PENDENTE] Validação formal com stakeholder (Gestor de Produção) no UAT
- ❌ **NO-GO se:** Overshooting possível ou reconciliação inconsistente — **não observado; falta apenas validação de negócio via UAT**

---

## 1.2 — TESTES DE PR & FUNCIONALIDADES (5h)

> **Nota (2026-08-04):** as 6 remediações abaixo foram entregues como parte do
> pacote único do commit `d1d3aff` (2026-08-02), não como 6 PRs
> individuais separados. O conteúdo técnico de cada item foi validado (ver
> seções P0.1–P0.6 acima, todas `[IMPLEMENTADO]`). Os itens abaixo
> permanecem como checklist de rastreabilidade formal de teste/aprovação —
> marcados `[x]` onde a evidência técnica já existe, e `[PENDENTE]` onde
> falta o registro formal de aprovação (approval sign-off) por QA/stakeholder.

### PR Review & Testing Protocol
**Responsável:** QA Lead + Backend/Frontend Leads  
**⏱️ Estimado:** 5h total  

- [ ] **Semana 1: Testar cada PR mergeado** (5h)
  - [ ] PR #001: Requisição de Compra
    - [ ] Descrição: Implementa geração automática de RQ na cadeia
    - [ ] Teste: MRP → PA → RQ criada? Auditoria preenchida?
    - [ ] Approval: ✅ / ❌
    - 👤 Tester: QA

  - [ ] PR #002: MRP estoque real
    - [ ] Descrição: MRP reflete inventory_movements real-time
    - [ ] Teste: Apontamento PA → estoque sobe → MRP recalcula?
    - [ ] Approval: ✅ / ❌
    - 👤 Tester: QA + Backend Lead

  - [ ] PR #003: Foreign Keys
    - [ ] Descrição: 37 tabelas ganham FKs críticas
    - [ ] Teste: Deletar Item com OP referenciando → erro esperado?
    - [ ] Approval: ✅ / ❌
    - 👤 Tester: QA + DevOps

  - [ ] PR #004: IDOR mitigation
    - [ ] Descrição: Validação company_id middleware
    - [ ] Teste: GET /items/:empresa_outra → 403?
    - [ ] Approval: ✅ / ❌
    - 👤 Tester: QA Security

  - [ ] PR #005: react-router v7 upgrade
    - [ ] Descrição: CVE-2025-68470 fix
    - [ ] Teste: Navegação, redirect seguro
    - [ ] Approval: ✅ / ❌
    - 👤 Tester: QA Frontend

  - [ ] PR #006: Apontamento reconciliação
    - [ ] Descrição: Production report com quantity validation
    - [ ] Teste: Apontamento 100% → OP finaliza?
    - [ ] Approval: ✅ / ❌
    - 👤 Tester: QA + Produção

- [ ] **Regressão** (1h)
  - [ ] Smoke test: Fluxo ponta a ponta MRP → PA → RQ → Compra
  - [ ] Fumetest: Telas principais carregam (Login, Dashboard, Compras, Produção, Inventário)
  - 👤 Responsável: QA

**🚨 Decision Point: PR Approval**
- ✅ Todos os 6 PRs testados e aprovados
- ✅ Regressão passa
- ✅ Sem novos bugs introduced
- ❌ **NO-GO se:** Qualquer PR falha testes ou regressão quebra

---

## 1.3 — UAT FINAL COM STAKEHOLDERS (4h) — ⏳ [PENDENTE], NÃO INICIADO

> **Status real (2026-08-04):** nenhum cenário de UAT abaixo foi executado
> ainda. Este é o **gate formal atual** para a Decision Point 1 — o trabalho
> técnico de remediação (P0.1–P0.6) está pronto, mas falta a validação de
> negócio por stakeholders antes do Go/No-Go.

### UAT Scope: Validação de Negócio por Perfil
**Responsável:** QA Lead + Stakeholders  
**⏱️ Estimado:** 4h (2h setup + 2h execução)  

- [ ] **Setup UAT (1h)**
  - [ ] Database: dados de staging = produção (sanitizados, LGPD)
  - [ ] Credenciais: criar contas temporárias para stakeholders
  - [ ] Documentação: manual de teste por perfil
  - [ ] Links: URLs de staging, dashboards
  - 👤 Responsável: QA Lead + DevOps

- [ ] **UAT Gestor de Compras (1h)**
  - [ ] Cenário: MRP gerou PA, requisição deve estar visível
  - [ ] Teste: Abrir lista de Requisições → vê todas criadas?
  - [ ] Teste: Clicar RQ → detalhes com origem e OP vinculada
  - [ ] Teste: Aprovar RQ → status muda
  - [ ] Feedback: ✅ aprovado / ❌ rejeitar com motivo
  - 👤 Stakeholder: Gerente de Compras

- [ ] **UAT Gestor de Produção (1h)**
  - [ ] Cenário: Operário aponta 5/10 na OP
  - [ ] Teste: OP marca 5/10 (parcial)
  - [ ] Teste: Aponta última 5 → OP marcar FINALIZADA
  - [ ] Teste: Deletar apontamento → OP volta ABERTA
  - [ ] Feedback: ✅ aprovado / ❌ rejeitar com motivo
  - 👤 Stakeholder: Gerente de Produção

- [ ] **UAT Financeiro (1h)**
  - [ ] Cenário: Compra recebida, fatura registrada, payable criada
  - [ ] Teste: Payable criado no recebimento (não na aprovação)
  - [ ] Teste: Custo unitário correto (BOM.custo_atual)
  - [ ] Teste: Auditoria preenchida (origem, datas)
  - [ ] Feedback: ✅ aprovado / ❌ rejeitar com motivo
  - 👤 Stakeholder: CFO / Controller

**🚨 Go/No-Go Decision UAT:**
- ✅ 100% cenários aprovados por stakeholders
- ✅ Nenhuma rejeição crítica
- ✅ Atas de UAT assinadas
- ❌ **NO-GO se:** Qualquer rejeição crítica (ex: requisição não criada, OP não reconcilia)

---

## 1.4 — VALIDAÇÃO DE MIGRAÇÃO DE DADOS (3h)

### Data Integrity & Consistency
**Responsável:** DevOps + Backend  
**⏱️ Estimado:** 3h  

- [ ] **Backup & Snapshot (0.5h)**
  - [ ] Full backup DB staging (PostgreSQL dump)
  - [ ] Snapshot imagem staging (se AWS/VM)
  - [ ] Documentar: data, versão, checksum
  - [ ] Armazenar: local seguro com acesso restrito
  - 👤 Responsável: DevOps

- [ ] **Validação de Dados (1.5h)**
  - [ ] Contagem: Registros migrados = origem?
    - [ ] Items: X registros
    - [ ] Purchase Orders: Y registros
    - [ ] Suppliers: Z registros
  - [ ] Integridade: FKs sem orfãos?
    - [ ] Teste: SELECT * FROM items WHERE supplier_id NOT IN (SELECT id FROM suppliers) → 0 linhas
  - [ ] Precisão: Valores numéricos corretos (6 casas decimais)?
    - [ ] Teste: SUM(quantity) em inventory_movements = Item.estoque_atual?
  - [ ] Datas: Timestamps preservados?
  - [ ] Encoding: Caracteres acentuados OK?
  - 👤 Responsável: Backend Developer

- [ ] **Compliance Check (1h)**
  - [ ] LGPD: Dados sensíveis não expostos em staging?
  - [ ] Audit Trail: Migração registrada (quem, quando, versão)?
  - [ ] Rollback Plan: Snapshot pronto?
  - [ ] Documentação: Dados conhecidos como incompletos/aproximados flagged?
  - 👤 Responsável: Compliance + DevOps

**🚨 Go/No-Go Decision Data:**
- ✅ Contagem confere 100%
- ✅ FKs sem orfãos
- ✅ Precisão verificada
- ✅ LGPD compliance OK
- ❌ **NO-GO se:** Dados incompletos, FKs quebradas ou valores inconsistentes

---

## 1.5 — BACKUPS & ROLLBACK PLAN (2h)

### Backup Strategy & Disaster Recovery
**Responsável:** DevOps  
**⏱️ Estimado:** 2h  

- [ ] **Full Backup (0.5h)**
  - [ ] PostgreSQL dump (pg_dump -Fc)
  - [ ] Arquivo salvo: `/backups/producao-pre-golive-2026-08-02.backup`
  - [ ] Tamanho: X GB
  - [ ] Checksum: SHA256 confirmado
  - [ ] Stored: 3 cópias (local + S3 + cold storage)
  - 👤 Responsável: DevOps

- [ ] **Teste de Restore (1h)**
  - [ ] Simular restore em ambiente isolado
  - [ ] Database restore: pg_restore < backup
  - [ ] Validação: SELECT COUNT(*) ... = original?
  - [ ] Aplicação conecta? Health check OK?
  - [ ] Tempo restore documentado: X minutos
  - 👤 Responsável: DevOps

- [ ] **Rollback Procedure Document (0.5h)**
  - [ ] Responsável: CTO (acionamento)
  - [ ] Trigger: "SLA quebrado por > 30 min" ou "Dado corrompido detectado"
  - [ ] Steps:
    1. Notificar time (Slack, email)
    2. Parar aplicação (kubectl scale deployment app --replicas=0)
    3. Restore DB (pg_restore)
    4. Testar conexão
    5. Restart aplicação
    6. Validar dados
  - [ ] Tempo total: X minutos
  - [ ] Contato escalation: CTO → Tech Lead → DevOps
  - 👤 Responsável: DevOps + CTO

**🚨 Go/No-Go Decision Backup:**
- ✅ Full backup confirmado
- ✅ Teste de restore passou
- ✅ Rollback procedure documentado e assinado
- ✅ Tempo RTO/RPO aceito por negócio
- ❌ **NO-GO se:** Backup falhou, restore lento (> 30 min) ou procedure incompleto

---

## 1.6 — SIGN-OFF FORMAL (1h)

### Aprovações Necessárias
**Responsável:** Stakeholders + Tech Lead  
**⏱️ Estimado:** 1h  

- [ ] **CTO/Tech Lead Approval**
  - [ ] Data: ___/___/______
  - [ ] Assinado por: ___________________________
  - [ ] Observações: 
    - [ ] 4 bloqueadores resolvidos
    - [ ] 6 PRs testados e aprovados
    - [ ] UAT passed
    - [ ] Backup + Rollback testados
  - [ ] Status: ✅ APROVADO / ❌ PENDÊNCIAS (descrever)

- [ ] **CFO/Finance Approval**
  - [ ] Data: ___/___/______
  - [ ] Assinado por: ___________________________
  - [ ] Observações:
    - [ ] Payable logic validada
    - [ ] Custeio correto
    - [ ] Auditoria preenchida
  - [ ] Status: ✅ APROVADO / ❌ PENDÊNCIAS

- [ ] **Production Manager Approval**
  - [ ] Data: ___/___/______
  - [ ] Assinado por: ___________________________
  - [ ] Observações:
    - [ ] OP reconciliação OK
    - [ ] Requisição visível
    - [ ] Fluxo produção validado
  - [ ] Status: ✅ APROVADO / ❌ PENDÊNCIAS

- [ ] **Compliance Officer Approval**
  - [ ] Data: ___/___/______
  - [ ] Assinado por: ___________________________
  - [ ] Observações:
    - [ ] LGPD compliance
    - [ ] Audit trail completo
    - [ ] IDOR mitigada
  - [ ] Status: ✅ APROVADO / ❌ PENDÊNCIAS

**🚨 DECISION POINT 1: GO/NO-GO PRÉ-GO-LIVE**

**Critério GO:**
- ✅ 4/4 bloqueadores resolvidos
- ✅ 6/6 PRs aprovados
- ✅ UAT com 100% stakeholders
- ✅ Backup + Rollback testados
- ✅ 4/4 sign-offs recebidos
- ✅ Nenhuma pendência crítica aberta

**Critério NO-GO:**
- ❌ Qualquer bloqueador ainda aberto
- ❌ Qualquer PR falha em teste
- ❌ UAT rejeição crítica
- ❌ Backup/Rollback falhou
- ❌ Qualquer sign-off pendente

**Decisão Final:** 
- [ ] ✅ **GO PARA FASE 2** (Deploy autorizado)
- [ ] ❌ **NO-GO** (Postergar para ___/___/______)

**Assinado por CTO:**  
________________________________  
Data: ___/___/______

---

# FASE 2: GO-LIVE DAY (4-6h — Janela de Deploy)

## 🎯 Objetivo Geral
Executar deploy para produção de forma segura, validar funcionalidades críticas pós-deploy e escalar incidentes imediatamente se necessário.

---

## 2.1 — JANELA DE DEPLOY (4-6h)

### Deploy Window Planning
**Responsável:** DevOps + Tech Lead  
**⏱️ Estimado:** 4-6h  

**Janela Recomendada:** Sábado 03:00 - 10:00 (horário local)  
**Motivo:** Fora horário comercial, menos impacto em caso de rollback  

- [ ] **Pré-Deploy Checklist (30 min)**
  - [ ] Todos sign-offs received (Fase 1.6)
  - [ ] Backup produção taken (11:59 PM 2 ago)
  - [ ] Rollback procedure reviewed e assinado
  - [ ] Time on-call notificado (CTO, Tech Lead, DevOps)
  - [ ] Slack channel #golive-g6 criado e notificações ON
  - [ ] Monitoring dashboards abertos (Datadog/Prometheus)
  - [ ] SMS/PagerDuty alertas ativados
  - 👤 Responsável: DevOps Lead

- [ ] **Build & Registry (1h)**
  - [ ] Frontend build: npm run build → production artifacts
  - [ ] Backend build: docker build → image tagged `v1.0.0-golive-g6`
  - [ ] Image pushed to registry (ECR/Docker Hub)
  - [ ] Security scan: trivy scan image → CRITICAL/HIGH fixed antes
  - [ ] Artifact signature: assinado com chave deployment
  - 👤 Responsável: DevOps + Backend Lead

- [ ] **Database Migration (30-60 min)**
  - [ ] Snapshot pré-migration taken
  - [ ] Liquibase/Flyway run: todas as migrations aplicadas
  - [ ] FK constraints validadas (nenhuma falha de constraint)
  - [ ] Teste pós-migration: conectar com app
  - [ ] Rollback testado: script reverse migration pronto
  - 👤 Responsável: DevOps + Backend Lead

- [ ] **Application Deploy (1-2h)**
  - [ ] Kubernetes deployment: kubectl apply -f deployment-golive.yaml
  - [ ] Versão: app verifica `SELECT version FROM migrations ORDER BY version DESC LIMIT 1` = esperado
  - [ ] Replicas: scale to 3 (high availability)
  - [ ] Health checks: /health endpoint retorna 200 OK
  - [ ] Logs: tail -f /var/log/app.log → sem erros CRITICAL/ERROR
  - [ ] Blue-green validation: old + new versão trocam traffic
  - 👤 Responsável: DevOps

- [ ] **Post-Deploy Validation (30-60 min)**
  - [ ] Aplicação acessível: curl https://app.evokaudio.com → 200 OK
  - [ ] Login funciona: usuário teste consegue logar
  - [ ] Dashboard carrega: sem erros console
  - [ ] API responses: GET /api/items → JSON válido
  - [ ] Database queries: SELECT COUNT(*) items → X registros (validar contagem)
  - 👤 Responsável: QA + DevOps

- [ ] **Notification & Escalation (30 min)**
  - [ ] Slack message: Deploy iniciado → Fase 1 (Build), Fase 2 (DB), Fase 3 (App)
  - [ ] CTO notificado: deploy live
  - [ ] Time stakeholders: email "Go-Live G6 Complete"
  - [ ] Monitoring escalado: on-call = full alert mode
  - 👤 Responsável: DevOps Lead

**🚨 Contingency:**
- ⚠️ Se alguma fase tomar > tempo estimado: escalate para CTO
- ⚠️ Se erro crítico: STOP deploy, rollback imediato (Seção 2.4)

---

## 2.2 — SMOKE TESTS PÓS-DEPLOY (30 min)

### Critical Path Validation
**Responsável:** QA + Backend/Frontend Leads  
**⏱️ Estimado:** 30 min  

- [ ] **API Smoke Tests (10 min)**
  - [ ] GET /api/items → 200, array válido
  - [ ] GET /api/purchase-orders → 200, array válido
  - [ ] GET /api/inventory → 200, array válido
  - [ ] POST /api/purchase-requisitions (body: {supplier_id, items}) → 201
  - [ ] GET /api/mrp/run → job iniciado, status = RUNNING
  - [ ] GET /api/auth/health → 200 (verificar JWT)
  - 👤 Responsável: QA Automation

- [ ] **Frontend Smoke Tests (10 min)**
  - [ ] Home page carrega sem erros console
  - [ ] Login page: form aparece, login/password inputs visíveis
  - [ ] Authenticated user: Dashboard carrega, menu visível
  - [ ] Navigation: Compras → lista de POs carrega
  - [ ] Navigation: Produção → lista de OPs carrega
  - [ ] Navigation: Inventário → estoque visível
  - 👤 Responsável: QA Frontend

- [ ] **Business Logic Smoke Tests (10 min)**
  - [ ] MRP: Job roda, gera PA (Check: status = GERADA)
  - [ ] Requisição: PA criada → RQ automática? (Check: status = PENDENTE)
  - [ ] Apontamento: OP pode ser apontada sem erro
  - [ ] Compra: RQ pode virar PC sem erro
  - 👤 Responsável: QA + Backend Lead

**🚨 Go/No-Go Decision Smoke Tests:**
- ✅ 20/20 testes passed
- ✅ Nenhum erro CRITICAL/ERROR nos logs
- ✅ Response times < baseline (ex: <500ms)
- ❌ **NO-GO se:** Qualquer teste falha ou error logs detectados → ROLLBACK (Seção 2.4)

---

## 2.3 — MONITORAMENTO & ALERTAS (6h+)

### Continuous Observation Post-Deploy
**Responsável:** DevOps + On-Call Engineer  
**⏱️ Estimado:** 6h initial + ongoing 24/7  

- [ ] **Dashboards UP (primeira 1h pós-deploy)**
  - [ ] Datadog: CPU, memory, disk by container/pod
  - [ ] Datadog: Request rate, latency (p50, p95, p99), error rate
  - [ ] Datadog: Database connections, query time
  - [ ] Log aggregation: Kibana/ELK streaming logs real-time
  - [ ] Health checks: /health endpoint status code
  - 👤 Responsável: DevOps

- [ ] **Alert Triggers Configured**
  - [ ] CPU > 80% for 5 min → PagerDuty alert
  - [ ] Memory > 85% for 5 min → PagerDuty alert
  - [ ] Error rate > 5% for 2 min → Slack + PagerDuty
  - [ ] Database connection pool > 90% → Slack alert
  - [ ] Response p99 > 2s → Slack (não crítico, observar)
  - [ ] Pod restart detected → Slack + PagerDuty
  - 👤 Responsável: DevOps

- [ ] **Log Tailing (primeiras 6h)**
  - [ ] Acompanhar em tempo real:
    ```
    kubectl logs -f deployment/app --all-containers=true --timestamps=true
    ```
  - [ ] Buscar: CRITICAL, ERROR, WARN levels
  - [ ] Logs esperados:
    - [ ] Database migration: "Migração XXX applied successfully"
    - [ ] App startup: "Application started on port 3000"
    - [ ] MRP job: "MRP run initiated" (se agendado)
  - [ ] Logs inesperados: investigar imediatamente
  - 👤 Responsável: On-Call Engineer

- [ ] **Incident Response Protocol**
  - [ ] **Se erro crítico detectado:**
    1. Slack: "INCIDENT: [erro]" → #golive-g6
    2. PagerDuty: escalate se SLA impactado
    3. Investigation: 5 min máximo para identificar causa
    4. Decision: Fix forward ou ROLLBACK
  - [ ] **Se rollback needed (Seção 2.4):**
    1. CTO approval (< 1 min)
    2. Execute rollback script
    3. Validate restore
    4. Post-incident review agendado
  - 👤 Responsável: On-Call Engineer + Tech Lead

**🚨 Escalation Path:**
```
Detection → On-Call Engineer (5 min)
         ↓
Investigation → Tech Lead (10 min)
         ↓
Decision → CTO (2 min decision)
         ↓
Action → Rollback or Fix Forward
```

---

## 2.4 — TESTE DE SANIDADE (CRITICAL FLOWS)

### End-to-End Validation
**Responsável:** QA + Stakeholders  
**⏱️ Estimado:** 30 min (após stabilização)  

- [ ] **Teste 1: MRP Roda?**
  - [ ] Trigger: POST /api/mrp/run
  - [ ] Esperado: Job iniciado, status = RUNNING
  - [ ] Validação: Logs contêm "MRP calculation started"
  - [ ] Resultado: ✅ / ❌
  - 👤 Tester: QA

- [ ] **Teste 2: Compra cria Requisição?**
  - [ ] Trigger: MRP roda → PA criada
  - [ ] Validado: GET /api/purchase-requisitions → lista inclui nova RQ
  - [ ] Validação: RQ.status = PENDENTE, RQ.origin = "MRP"
  - [ ] Resultado: ✅ / ❌
  - 👤 Tester: QA + Gerente Compras

- [ ] **Teste 3: IDOR bloqueado?**
  - [ ] Trigger: JWT de company B, GET /api/items/:company_A_id
  - [ ] Esperado: 403 Forbidden
  - [ ] Validação: Resposta não expõe dados
  - [ ] Resultado: ✅ / ❌
  - 👤 Tester: QA Security

- [ ] **Teste 4: Estoque reflete movimento?**
  - [ ] Trigger: POST /api/inventory/movement (entrada)
  - [ ] Esperado: Item.estoque_atual incrementa
  - [ ] Validação: MRP refaz cálculo com novo estoque
  - [ ] Resultado: ✅ / ❌
  - 👤 Tester: QA + Produção

- [ ] **Teste 5: Apontamento reconcilia OP?**
  - [ ] Trigger: POST /api/production/report (apontamento 100%)
  - [ ] Esperado: OP.status = FINALIZADA
  - [ ] Validação: quantity_produced = OP.quantidade_planejada
  - [ ] Resultado: ✅ / ❌
  - 👤 Tester: QA + Produção

**🚨 Go/No-Go Decision Sanity Tests:**
- ✅ 5/5 testes passed
- ✅ Nenhum comportamento inesperado
- ❌ **NO-GO se:** Qualquer teste falha → ROLLBACK imediato (Seção 2.4)

---

## 2.5 — DOCUMENTAÇÃO DE INCIDENTES

### Incident Log
**Responsável:** On-Call Engineer + Tech Lead  
**📝 Forma:** Markdown file no repositório  

**Arquivo:** `docs/GO_LIVE_G6_INCIDENTS.md` **[A CRIAR NO GO-LIVE DAY — não existe hoje]**

Para cada incidente detectado:

```markdown
## Incidente #001
**Data/Hora:** 2026-08-03 04:15 UTC
**Detectado por:** DevOps on-call
**Severidade:** 🔴 CRÍTICO / 🟠 ALTO / 🟡 MÉDIO
**Descrição:** API retorna 500 em GET /api/items após 3h do deploy
**Root Cause:** Foreign key constraint violation (não detectado em testes)
**Fix:** Rollback aplicação v1.0.0-golive-g6 → hotfix FK constraint
**Ação Tomada:** [ ] Rollback / [ ] Fix Forward / [ ] Mitigação Tempor.
**Tempo Resolução:** X min
**Lições Aprendidas:** FK validation falhou em staging (dados diferentes de prod)
**Acionado por:** CTO @nome
**Aprovado por:** CFO @nome
```

- [ ] Log de incidentes criado (se houver)
- [ ] Cada incidente documentado com 5W1H
- 👤 Responsável: On-Call Engineer

---

# FASE 3: PÓS-GO-LIVE (48h — Monitoramento Intensivo)

## 🎯 Objetivo Geral
Garantir estabilidade do sistema nos primeiros 2 dias, escalalar incidentes rapidamente e documentar lições aprendidas para melhoria contínua.

---

## 3.1 — MONITORAMENTO INTENSIVO (48h)

### 24/7 On-Call Coverage
**Responsável:** On-Call Rotation (DevOps, Backend, Frontend)  
**⏱️ Tempo Total:** 48h contínuas  

- [ ] **Dia 1 pós-Go-Live (Sábado 03 ago, 00:00 - 23:59)**
  - [ ] Shift 1 (00:00-08:00): DevOps + Backend on-call
    - [ ] Monitoramento contínuo de dashboards
    - [ ] Resposta < 5 min para alertas
    - [ ] Log review a cada 2 horas
    - 👤 On-Call: ____________
  
  - [ ] Shift 2 (08:00-16:00): DevOps + QA on-call
    - [ ] Fumetest de 2h (10:00-12:00): verificar smoke tests ainda passam
    - [ ] Capacidade ramp-up: observar crescimento de uso
    - 👤 On-Call: ____________
  
  - [ ] Shift 3 (16:00-00:00): DevOps + Backend on-call
    - [ ] Final do dia: full health check
    - [ ] KPIs consolidados (uptime, error rate, latency)
    - 👤 On-Call: ____________

- [ ] **Dia 2 pós-Go-Live (Domingo 04 ago, 00:00 - 23:59)**
  - [ ] Mesma cobertura por turnos
  - [ ] SLA ramp-down: alertas transicionam para normal
  - [ ] Suporte escalado: time de produção também on-call

- [ ] **Métricas a Monitorar (a cada 15 min)**
  - [ ] Uptime aplicação: meta 99.9%
  - [ ] Response time p95: < 500ms (baseline)
  - [ ] Error rate: < 1%
  - [ ] Database connections: < 80% pool
  - [ ] Cache hit rate: > 80%
  - [ ] MRP job duration: < 30 min
  - 👤 Responsável: Monitoring team

**🚨 SLA Go-Live G6:**
| Métrica | Alvo | Ação se quebrado |
|---------|------|-----------------|
| Uptime | 99.9% | Escalar em < 5 min |
| Error rate | < 1% | Investigar causa |
| P95 latency | < 500ms | Monitorar, não crítico |
| MRP run success | 100% | Rerun, escalar se falha 2x |

---

## 3.2 — SUPORTE ESCALADO

### Enhanced Support Structure
**Responsável:** Support Team + Engineering  
**⏱️ Tempo:** 48h contínuas  

- [ ] **Tier 1 Support (Helpdesk)**
  - [ ] Canais: Email, Slack #suporte-golive-g6, WhatsApp emergência
  - [ ] Resposta: < 15 min para qualquer issue
  - [ ] Triage: classificar CRÍTICO / ALTO / MÉDIO
  - [ ] Escalação: CRÍTICO → Tech Lead imediatamente
  - 👤 Responsável: Support Manager

- [ ] **Tier 2 Support (Technical)**
  - [ ] Resposta: < 5 min para CRÍTICO
  - [ ] Capacidade: 3 Backend devs + 2 Frontend devs on-call
  - [ ] Ações:
    - [ ] Análise de logs
    - [ ] Debug ao vivo (SQL queries, network traces)
    - [ ] Hotfixes (se necessário)
  - 👤 Responsável: Tech Lead

- [ ] **Known Issues Tracker**
  - [ ] Arquivo: `docs/GO_LIVE_G6_KNOWN_ISSUES.md` **[A CRIAR NO GO-LIVE DAY — não existe hoje]**
  - [ ] Cada issue inclui:
    - [ ] Descrição do problema
    - [ ] Workaround (se houver)
    - [ ] Alvo de correção (data)
    - [ ] Status: OPEN / WORKAROUND / FIXED
  - 👤 Responsável: Support Lead

**Common Issues Template:**
```markdown
### Issue #001: Apontamento duplica quantity
**Relatado em:** Domingo 04/08 14:30
**Usuário:** Operário filial São Paulo
**Descrição:** Ao salvar apontamento, quantity_produced é incrementado 2x
**Workaround:** Deletar último apontamento, reapontar com valor correto
**Root Cause:** Investigando (suspeita: double-submit no frontend)
**Fix ETA:** 06/08 11:00
**Status:** OPEN (workaround disponível)
```

---

## 3.3 — ROLLBACK CONTINGENCY

### When to Rollback?
**Responsável:** CTO (decisão) + DevOps (execução)  

**Trigger Rollback se:**
- 🔴 Uptime < 99% por > 30 min consecutivos
- 🔴 Data corruption detectada (ex: estoque negativo inexplicado)
- 🔴 Revenue impact: compra/vendas não processam > 1h
- 🔴 Security breach: IDOR explorada em produção
- 🔴 5+ críticos abertos simultâneos
- 🟠 CTO decision: qualquer razão legítima

**NÃO Rollback se:**
- ✅ UI/UX issue (não impacta negócio)
- ✅ Performance < baseline (pode ser tuned)
- ✅ Workaround disponível
- ✅ Fix forward possível < 2h

**Rollback Execution (< 10 min total):**

- [ ] **Decision (2 min)**
  - [ ] CTO avalia logs, KPIs, impacto
  - [ ] Decision: ROLLBACK SIM/NÃO
  - [ ] Se SIM: notificar time

- [ ] **Preparation (2 min)**
  - [ ] DevOps verifica snapshot pré-deploy
  - [ ] Checksum validated
  - [ ] Rollback script pronto

- [ ] **Execution (5 min)**
  - [ ] Kill aplicação: kubectl scale deployment app --replicas=0
  - [ ] Restore DB: pg_restore < backup
  - [ ] Aplicação restart
  - [ ] Health check: GET /health → 200
  - [ ] Logs: "Application started successfully"

- [ ] **Validation (1 min)**
  - [ ] Smoke tests: MRP, login, items list
  - [ ] Contagem registros: deve bater backup
  - [ ] Notificação: Slack #golive-g6 "Rollback complete"

**🚨 Rollback Decision Log:**

```markdown
## Rollback #1 (se executado)
**Data:** ___/___/______
**Hora:** ___:___ UTC
**Motivo:** Data corruption detectada em estoque
**CTO Approval:** ✅ ___________________________
**Tempo Execução:** X min
**Resultado:** ✅ Sucesso / ❌ Falha (descrever)
```

---

## 3.4 — DOCUMENTO DE LIÇÕES APRENDIDAS

### Post-Live Review
**Responsável:** Tech Lead + Product Manager  
**⏱️ Estimado:** 2h (segunda-feira 05/08)  

**Arquivo:** `docs/GO_LIVE_G6_LESSONS_LEARNED.md` **[A CRIAR NO GO-LIVE DAY — não existe hoje]**

- [ ] **Reunião Restrospectiva (2h)**
  - [ ] Quem: CTO, Tech Lead, DevOps, QA Lead, Gerente Produção, CFO
  - [ ] Agenda:
    1. Resumo Go-Live: tudo funcionou? (1h)
    2. Incidentes: o que deu errado? (30 min)
    3. Wins: o que deu certo? (20 min)
    4. Actions: o que melhorar? (30 min)

- [ ] **Formato Documento**

```markdown
# 🎓 Lições Aprendidas — Go-Live G6

## Resumo Executivo
- Uptime: 99.95% (alvo 99.9%) ✅
- Incidentes: 3 (todos resolvidods < 30 min)
- Rollback necessário: SIM/NÃO
- Time satisfação: 8/10

## Wins (O que funcionou)
### 1. Monitoramento Proativo
- Dashboards detectaram issue 2 min após occurrence
- Alertas PagerDuty funcionaram 100%
- **Ação:** Manter setup idêntico

### 2. Backup & Restore
- Restore testado levou 8 min (alvo 30 min)
- Checksum validou integridade
- **Ação:** Usar mesmo processo para P0 releases

## Issues (O que não funcionou)
### Issue #1: MRP timeout no primeiro run
- **Causa:** 5k itens + nested BOM = 60s (alvo 30s)
- **Impacto:** Atraso 15 min no schedule
- **Resolução:** Adicionado índice em BOM table
- **Ação:** Implementar índice strategy como P0

### Issue #2: Cache invalidation bug
- **Causa:** TTL de 24h preenchido, causou stale reads
- **Impacto:** Usuários viram estoque desatualizado por 2h
- **Resolução:** Reduzido TTL para 5 min
- **Ação:** Revisar todos os TTLs no sistema

## Metrics Consolidados
| Métrica | Target | Atual | Status |
|---------|--------|-------|--------|
| Uptime | 99.9% | 99.95% | ✅ |
| Error Rate | < 1% | 0.2% | ✅ |
| P95 Latency | < 500ms | 320ms | ✅ |
| MRP Duration | < 30min | 38min | ⚠️ |

## Action Items (P0/P1)
- [ ] **P0:** Índice BOM optimization (2h) — Dev assignment: _________ — ETA: 08/08
- [ ] **P0:** Cache TTL review (4h) — Dev assignment: _________ — ETA: 08/08
- [ ] **P1:** Load testing 10k itens (6h) — Dev assignment: _________ — ETA: 13/08
- [ ] **P1:** Disaster recovery drill (2h) — DevOps assignment: _________ — ETA: 15/08

## Recomendações
1. **Escalabilidade:** Próximo release, testar com 10k items antes de deploy
2. **Automation:** Criar automated smoke tests que rodam a cada 1h pós-deploy
3. **Team:** Adicionar frontend dev ao on-call rotation (estava faltando)

## Sign-off
**CTO:** _________________________ Data: ___/___/______
**Tech Lead:** _________________________ Data: ___/___/______
**Produção:** _________________________ Data: ___/___/______
```

- [ ] **Action Items → Backlog**
  - [ ] Cada action item priorizado (P0/P1)
  - [ ] Assigned a developer
  - [ ] ETA definida
  - [ ] Rastreado em project management tool

---

## 3.5 — TRANSIÇÃO PARA OPERAÇÃO NORMAL

### Wind-Down Go-Live G6
**Responsável:** CTO + Operations Manager  
**⏱️ Estimado:** 1h (segunda-feira 05/08)  

- [ ] **SLA Normalization**
  - [ ] Remover alertas especiais de Go-Live (PagerDuty critical mode)
  - [ ] Retornar on-call a rotação normal (1 person, não 3)
  - [ ] Slack: transicionar #golive-g6 → #golive-g6-archive
  - 👤 Responsável: DevOps Lead

- [ ] **Documentation Handoff**
  - [ ] Consolidar todas docs em `docs/GO_LIVE_G6_*/`
  - [ ] Criar índice: `docs/GO_LIVE_G6_INDEX.md` **[A CRIAR NO GO-LIVE DAY — não existe hoje]**
  - [ ] Arquivar: versões antigas de cronograma (mover → archive/)
  - [ ] SSOT update: CLAUDE.md incluir referência a Go-Live completo
  - 👤 Responsável: Tech Lead

- [ ] **Stakeholder Communication**
  - [ ] Email: "Go-Live G6 Successful"
  - [ ] Conteúdo:
    - [ ] Métricas: uptime, error rate
    - [ ] Incidentes: nenhum critical
    - [ ] Próximas releases: roadmap
  - [ ] Copy: _____________ (DevOps/Product Manager)
  - 👤 Responsável: Product Manager

---

# 🚨 MATRIZ DE DECISÕES — GO/NO-GO

## Decision Point 1: FIM DA FASE 1 (PRÉ-GO-LIVE)

**Gate:** Todos os 4 bloqueadores resolvidos + aprovações

| Item | Critério GO | Critério NO-GO | Status Real (2026-08-06) |
|------|------------|----------------|--------|
| P0.1: Requisição de Compra | ✅ Criada 100% casos | ❌ < 90% criada | ✅ [IMPLEMENTADO] (d1d3aff) |
| P0.2: MRP estoque real | ✅ Reflete mudanças | ❌ Ainda congelado | ✅ [IMPLEMENTADO] (d1d3aff); performance em escala não testada |
| P0.3: Foreign Keys | ✅ Nenhuma orfã | ❌ Há orfãs | ✅ [IMPLEMENTADO] (d1d3aff, 133 FKs) |
| P0.4: IDOR validação | ✅ 100% endpoints | ❌ Endpoint bypassa | ✅ [IMPLEMENTADO] (d1d3aff); integração RBAC contra infra real ainda skipped |
| P0.5: react-router v8 | ✅ Build OK, audit clean | ❌ Vulnerabilidade persiste | ✅ [IMPLEMENTADO] — upgrade para `react-router@8.3.0` em 2026-08-04, `GHSA-qwww-vcr4-c8h2` resolvido, audit 0 vulnerabilidades |
| P0.6: Apontamento reconciliação | ✅ OP finaliza correto | ❌ Overshooting possível | ✅ [IMPLEMENTADO] (d1d3aff); falta validação UAT |
| PR Testing | ✅ 6/6 PRs passed | ❌ Qualquer PR falha | ✅ Conteúdo técnico validado (entregue via commit único, não 6 PRs formais) |
| UAT | ✅ 100% stakeholders | ❌ Rejeição crítica | ⏳ [PENDENTE] — não iniciado |
| Backup + Rollback | ✅ Testado, < 30 min | ❌ Falha restore | ⏳ [PENDENTE] — não executado (sem servidor de produção ainda) |
| Sign-offs | ✅ 4/4 aprovados | ❌ Qualquer pendente | ⏳ [PENDENTE] — nenhum sign-off formal registrado |

**Decisão Final (CTO):**
```
🔴 NO-GO (estado atual, 2026-08-06) — bloqueadores técnicos P0 resolvidos,
   Fase 2/P1 majoritariamente entregue, mas gate de UAT + sign-offs formais
   ainda não iniciado, e servidor de produção ainda não adquirido (bloqueia
   Fase 2 deste checklist independentemente do UAT).
🟢 GO — Deploy autorizado, proceder Fase 2 (condicionado a: UAT completo +
   sign-offs + servidor de produção disponível; risco residual react-router
   já resolvido em 2026-08-04, não é mais condicionante)
```

---

## Decision Point 2: FIM DO DEPLOY (SMOKE TESTS)

**Gate:** Deploy executado + Smoke tests passam

| Item | Critério GO | Critério NO-GO | Status |
|------|------------|----------------|--------|
| Deploy sem erro | ✅ Aplicação up | ❌ Deploy falhou | ⏳ |
| Health check | ✅ 200 OK | ❌ 5xx | ⏳ |
| Smoke tests (20 tests) | ✅ 20/20 passed | ❌ Qualquer falha | ⏳ |
| Logs | ✅ Sem CRITICAL/ERROR | ❌ Erro crítico | ⏳ |
| Sanity tests | ✅ 5/5 passed | ❌ Qualquer falha | ⏳ |

**Decisão Imediata (Tech Lead):**
```
🟢 GO — Continuar monitoramento normal
🔴 ROLLBACK — Executar rollback (Seção 2.4)
```

---

## Decision Point 3: FIM DO MONITORAMENTO 48H

**Gate:** Nenhum incidente crítico em 48h

| Item | Critério GO | Critério NO-GO | Status |
|------|------------|----------------|--------|
| Uptime | ✅ > 99.9% | ❌ < 99.9% | ⏳ |
| Error rate | ✅ < 1% | ❌ > 1% | ⏳ |
| Known issues | ✅ Todas tem workaround | ❌ Bloqueador sem workaround | ⏳ |
| SLA compliance | ✅ 100% atendimento | ❌ Qualquer breach | ⏳ |

**Decisão Final (CTO):**
```
🟢 GO — Go-Live G6 oficial sucesso, transicionar operação normal
🟠 MITIGATED — Transicionar com monitoramento extra por 1 semana
🔴 FAILED — Considerar rollback (raro em Dia 2)
```

---

# 📋 CHECKLIST RÁPIDO (PRINT & POST)

```
PRÉ-GO-LIVE (30h) — Status real em 2026-08-06
─────────────────
☑ P0.1: Requisição de Compra .................... [IMPLEMENTADO] d1d3aff
☑ P0.2: MRP estoque real ....................... [IMPLEMENTADO] d1d3aff
☑ P0.3: Foreign Keys ........................... [IMPLEMENTADO] d1d3aff
☑ P0.4: IDOR validação ......................... [IMPLEMENTADO] d1d3aff (integração real pendente)
☑ P0.5: react-router v8 upgrade ................ [IMPLEMENTADO] GHSA-qwww-vcr4-c8h2 resolvido 2026-08-04
☑ P0.6: Apontamento reconciliação .............. [IMPLEMENTADO] d1d3aff
☑ PR Testing (conteúdo técnico) ................ validado via commit único d1d3aff
☐ UAT com stakeholders ......................... [PENDENTE] não iniciado
☐ Migração de dados validada ................... [PENDENTE] sem staging/servidor de produção
☐ Backup + Rollback testados ................... [PENDENTE] sem servidor de produção
☐ Sign-offs formais ............................ [PENDENTE] nenhum registrado
☐ Servidor de produção adquirido ............... [PENDENTE] bloqueia Fase 2/F10
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 DECISION POINT 1: GO/NO-GO?  ☐ GO  ☑ NO-GO (aguardando UAT, sign-offs e servidor de produção)

GO-LIVE DAY (4-6h)
──────────────────
☐ Pre-Deploy checklist ......................... 30m ___
☐ Build & Registry ............................ 1h ___
☐ Database Migration .......................... 1h ___
☐ Application Deploy .......................... 1h ___
☐ Post-Deploy validation ...................... 1h ___
☐ Smoke Tests (20 tests) ...................... 30m ___
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 DECISION POINT 2: GO/NO-GO?  ☐ GO  ☐ ROLLBACK

PÓS-GO-LIVE (48h)
─────────────────
☐ Monitoramento 24/7 (Dia 1) ................... 24h ___
☐ On-Call escalado ............................ 48h ___
☐ Suporte Tier 1/2 ............................ 48h ___
☐ Sanity tests (Dia 1 + Dia 2) ................ 1h ___
☐ Lições aprendidas ........................... 2h ___
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 DECISION POINT 3: GO/NO-GO?  ☐ GO  ☐ MITIGATED  ☐ FAILED
```

---

# 📞 CONTATOS CRÍTICOS

| Papel | Nome | Email | Celular | Slack |
|------|------|-------|---------|-------|
| CTO | | | | @cto |
| Tech Lead | | | | @tech-lead |
| DevOps Lead | | | | @devops |
| QA Lead | | | | @qa-lead |
| Gerente Compras | | | | @gerente-compras |
| Gerente Produção | | | | @gerente-producao |
| CFO | | | | @cfo |
| Compliance | | | | @compliance |

**Preencher antes de Go-Live Day**

---

# 🎯 KPIs GO-LIVE G6

**Baseline (Staging):**
- Uptime: 99.99%
- Error rate: < 0.1%
- P95 latency: 300ms
- MRP duration: 25min (5k items)

**Alvo Go-Live:**
- Uptime: ≥ 99.9%
- Error rate: ≤ 1%
- P95 latency: ≤ 500ms
- MRP duration: ≤ 30min

**Aceitação Negócio:**
- Revenue impact: 0 min/dia
- Data loss: 0 registros
- Security incidents: 0
- Stakeholder satisfaction: ≥ 8/10

---

# ✅ DOCUMENTO — STATUS DE ASSINATURA

**Preparado por:** Tech Lead / Product Manager  
**Data original:** 2 de agosto de 2026  
**Reconciliado em:** 6 de agosto de 2026

**Assinado e Aprovado por:** ⏳ **[PENDENTE]** — nenhuma assinatura formal registrada até 2026-08-06. Sign-off depende da conclusão do UAT (seção 1.3). O risco residual `react-router` (antiga pendência (c)) foi resolvido em 2026-08-04 e não é mais condicionante do sign-off. Fase 2/P1 majoritariamente entregue (2026-08-04/06) também não é condicionante formal deste sign-off, que se refere apenas ao pacote de bloqueadores P0 original — ver `CLAUDE.md` seção 5 para o escopo completo do que foi entregue desde então.

| Papel | Assinatura | Data |
|------|-----------|------|
| CTO | | |
| CFO | | |
| Gerente Produção | | |
| Compliance | | |

---

**SSOT deste documento:** plano operacional/checklist de Go-Live G6, reconciliado com `CLAUDE.md` (seção 5) e `docs/governance/auditorias/AUDITORIA_PRE_PRODUCAO_2026-08-02.md`, que são as fontes de verdade sobre o status dos bloqueadores P0.

**Próximo passo real (2026-08-06):**
1. Adquirir servidor de produção (VPS/on-premise) — bloqueia Fase 2/F10 independentemente de tudo mais.
2. Executar UAT completo com stakeholders (seção 1.3).
3. Executar a suíte de testes de integração RBAC (`legacy-routes-rbac-regression.test.ts`) contra infraestrutura real (Postgres + API viva), hoje `describe.skip`.
4. Validar os apps `mobile/`/`tv/` (novos em 2026-08-06) em hardware real — checklist em `mobile/README.md` §5 e `tv/README.md` §5 (ver pendência (e) no resumo executivo).
5. Decidir a estratégia de sessão do app `tv/` (JWT de 7 dias × painel sempre ligado) — ver pendência (f) no resumo executivo e `docs/governance/TODO.md`, seção "2026-08-06".

~~Decisão formal do gate G6 sobre o risco residual `react-router@7.18.2` / `GHSA-qwww-vcr4-c8h2`~~ — **resolvido em 2026-08-04** (upgrade para `react-router@8.3.0`, ver `docs/governance/TODO.md` e `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md`); removido da lista de próximos passos.
6. Coletar sign-offs formais (CTO, CFO, Gerente Produção, Compliance) — seção 1.6.

---

# 🔄 RECONCILIAÇÃO 2026-08-12 — auditoria documental

> **Não reescreve nada acima.** As seções anteriores continuam sendo o registro
> de como o gate foi montado. Esta seção registra o que **mudou desde
> 2026-08-06** e o que a auditoria de 2026-08-11 mediu, para que o leitor não
> tome decisão com base em item já resolvido — ou pior, deixe de ver um
> bloqueador que nasceu depois.

## (g) [PENDENTE] — GATE NOVO: carga inicial de dados reais é bloqueador de Go-Live

Este gate **não existia** quando o checklist foi escrito, porque o sistema
ainda rodava sobre dados de demonstração. Depois que o banco de dev foi limpo
(2026-08-10) e recebeu a carga real de insumos, ficou visível que **o ERP não
consegue produzir nada** no estado atual do cadastro.

**Medido no banco `erp_evok_audio` em 2026-08-12:**

| Cadastro | Registros | Consequência |
|---|---|---|
| `items` (insumos) | **327** | carregados via API a partir de `docs/carga-inicial/insumos-materia-prima.csv` |
| `suppliers` | **0** | nenhuma requisição vira pedido de compra — não há a quem comprar |
| `clients` | **0** | nenhuma venda pode ser registrada |
| `employees` | **0** | sem apontamento nominal de produção |
| `products` (acabados) | **0** | não há o que fabricar |
| `bill_of_materials` | **0** | sem BOM, o MRP não explode necessidade |
| `production_routes` | **0** | sem roteiro ativo, **nenhuma OP inicia** (gate G6, erro `G6-START-NO-ROUTE`) |
| `work_centers` | **1** | só o mínimo; capacidade real não cadastrada |
| `users` | 21 | admin + 20 usuários **de teste** (`@teste.evokaudio`) |
| `departments` | 17 | ok — seed oficial |

**Por que isso é bloqueador e não "tarefa de implantação":** os gates de
processo entregues nos 17 gaps são reais e recusam operação incompleta. Sem
roteiro de fabricação, a OP não sai de `planned` (G6). Sem apontamento, ela não
conclui (G4, obrigação do SPED Bloco K). Sem BOM, o MRP não gera requisição.
Ou seja, **o UAT não tem como ser executado** antes desta carga — não é
possível encenar o fluxo ponta a ponta sem dado real.

**Além do volume, o dado carregado está cru:** os 327 itens vieram com custo 0,
estoque 0 e unidade `UN`; **59 estão marcados `revisar=SIM`** no CSV, dos quais
**5 bobinas são CRÍTICAS** (`MP-057`, `MP-060`, `MP-061`, `MP-064`, `MP-090`).

**Responsável:** fábrica (dado de negócio, não código).
**Roteiro de execução:** [`docs/carga-inicial/GUIA_CARGA_INICIAL.md`](../../carga-inicial/GUIA_CARGA_INICIAL.md).
**Fontes:** [`RESIDUAIS_ABERTOS_2026-08-10.md`](../RESIDUAIS_ABERTOS_2026-08-10.md)
e [`auditorias/AUDITORIA_AMPLA_2026-08-11.md`](../auditorias/AUDITORIA_AMPLA_2026-08-11.md).

**Ordem correta:** carga inicial (g) → teste ponta a ponta com escrita real →
UAT (b) → sign-off G6 → servidor de produção (a) → deploy.

## (d) [x] RESOLVIDO — a suíte de integração roda de fato

A pendência (d) descrevia testes de integração que existiam mas rodavam via
`describe.skip`, por falta de `RUN_INTEGRATION=true`. **Corrigido em
2026-08-10:** `npm run test:integration` passou a apontar para o runner que
sobe a API e usa o banco de teste isolado
(`node server/scripts/run-api-suite.cjs integration`).

O problema era pior do que "um arquivo pulado": **34 arquivos de teste de
integração pulavam em silêncio e o comando reportava verde** — a suíte parecia
uma rede de segurança e não era.

**Medido em 2026-08-12: 211 testes / 53 suítes de integração contra PostgreSQL
real, 100% passando, sem nenhum skip.** Inclui a cobertura de RBAC de
`legacy-routes-rbac-regression.test.ts` que motivou a pendência original.

Consequência para os itens acima: a linha "(d) [PENDENTE]" do resumo executivo,
a caixa de RBAC de Depósito na seção 1.2 e o item 3 da lista de "Próximo passo
real (2026-08-06)" estão **fechados** — mantidos no texto original por serem
registro histórico.

## Links quebrados removidos — artefatos de Go-Live Day

Quatro arquivos citados nas seções de Fase 2/Fase 3 **não existem no
repositório** (conferido em 2026-08-12):

| Citado como | Onde é citado | Situação |
|---|---|---|
| `docs/GO_LIVE_G6_INCIDENTS.md` | §2 (registro de incidentes do dia) | não existe |
| `docs/GO_LIVE_G6_KNOWN_ISSUES.md` | §2 (issues conhecidas pós-deploy) | não existe |
| `docs/GO_LIVE_G6_LESSONS_LEARNED.md` | §3 (retrospectiva 48h) | não existe |
| `docs/GO_LIVE_G6_INDEX.md` | §3 (índice do pacote de Go-Live) | não existe |

**Decisão:** são **templates de processo do Go-Live Day**, não documentos
faltantes. Serão criados **no dia do Go-Live**, se e quando houver o evento a
registrar — criar arquivos vazios agora só produziria mais ruído documental.
As 4 citações no corpo do checklist foram anotadas com
`[A CRIAR NO GO-LIVE DAY — não existe hoje]`, para que ninguém saia procurando
um arquivo que não está lá (nenhuma delas era link Markdown clicável, apenas
caminho em `código`, então não havia link quebrado a remover — só a promessa
implícita). Incidentes de operação que aconteçam **antes** do Go-Live vão para
`docs/incidentes/`, que já existe.

## Estado do gate em 2026-08-12

| Pendência | Estado |
|---|---|
| (a) Servidor de produção | `[PENDENTE]` — compra **adiada 3–4 meses** por decisão do dono (2026-08-10). Bloqueia o deploy, não o UAT |
| (b) UAT completo | `[PENDENTE]` — **agora depende de (g)**; sem dado real não há o que testar |
| (c) `react-router` | `[x]` resolvido em 2026-08-04 |
| (d) Integração contra infra real | `[x]` **resolvido em 2026-08-10** — 211/211, sem skips |
| (e) `mobile/`/`tv/` em hardware real | `[PENDENTE]` |
| (f) Sessão do app `tv/` (JWT 7 dias × painel sempre ligado) | `[PENDENTE]` — decisão de produto |
| **(g) Carga inicial de dados reais** | `[PENDENTE]` — **novo bloqueador, precede (b)** |

