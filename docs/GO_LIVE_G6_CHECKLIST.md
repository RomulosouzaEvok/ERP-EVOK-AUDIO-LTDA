# 🚀 GO-LIVE G6 CHECKLIST — ERP Evok Áudio
## Plano de Execução Faseado com Decisões Go/No-Go

**Data Planejada:** 2 de agosto de 2026  
**Versão:** 1.0  
**Status:** ⏳ EM PLANEJAMENTO  
**Horizonte:** 30h pré-Go-Live + Go-Live Day + 48h pós-Go-Live  
**SSOT:** Auditoria pré-produção consolidada em `docs/AUDITORIA_PRE_PRODUCAO_2026-08-02.md`

---

## 📊 RESUMO EXECUTIVO

| Fase | Duração | Objetivo | Risco | Go/No-Go |
|------|---------|----------|-------|----------|
| **Fase 1** | 30h | Resolver 4 bloqueadores + UAT | Crítico se atrasado | Decision Point 1 |
| **Fase 2** | 4-6h | Deploy + Smoke Tests | Alto (janela restrita) | Decision Point 2 |
| **Fase 3** | 48h | Monitoramento + Suporte | Médio (pré-configurado) | Decision Point 3 |

**4 Bloqueadores Críticos (P0):**
1. ✋ **Requisição de Compra inexistente** (1.1) — 8h
2. ✋ **MRP congelado contra estoque_atual** (1.2) — 6h
3. ✋ **37 tabelas sem Foreign Keys** (2.1) — 4h
4. ✋ **IDOR sem validação tenant** (3.1) — 3h

---

# FASE 1: PRÉ-GO-LIVE (30h — Semana Final de Desenvolvimento)

## 🎯 Objetivo Geral
Garantir que os 4 bloqueadores críticos sejam resolvidos, testados com stakeholders e aprovados formalmente antes de qualquer deploy.

---

## 1.1 — RESOLUÇÃO DE BLOQUEADORES CRÍTICOS (21h)

### P0.1: Requisição de Compra gerada na Cadeia (8h)
**Responsável:** Programador Backend + TechLead  
**⏱️ Estimado:** 8h  
**📍 Arquivo crítico:** `src/usecases/SupplyChainUseCase.ts`  
**Dependência:** Modelo Requisição criado e migrado  

- [ ] **Análise (0.5h)**
  - [ ] Revisar fluxo atual: MRP → PA → Requisição deveria nascer aqui
  - [ ] Definir regra: Requisição criada automaticamente na geração da PA ou manualmente?
  - [ ] Documento de decisão: RQ criada por job async ou síncrono?
  - 👤 Responsável: Backend Tech Lead

- [ ] **Implementação (6h)**
  - [ ] Criar modelo/tabela `purchase_requisitions` se não existe
  - [ ] Adicionar endpoint POST `/supply-chain/requisitions`
  - [ ] Lógica: MRP gera PA → trigger automático Requisição
  - [ ] Validações: empresa_id, filial_id, tenant_id isolados
  - [ ] Testes unitários: 3 casos (criação, validação, erro tenant)
  - 👤 Responsável: Backend Developer

- [ ] **Testes (1.5h)**
  - [ ] Test: MRP roda e cria requisição com status `PENDENTE`
  - [ ] Test: Requisição vinculada à PA corretamente
  - [ ] Test: Auditoria registra origem (MRP trigger)
  - [ ] UAT: Gestor de Compras valida requisição visível no sistema
  - 👤 Responsável: QA + Gestor de Compras

**🚨 Go/No-Go Decision P0.1:**
- ✅ Requisição criada e visível 100% dos casos
- ✅ Auditoria de origem preenchida
- ✅ Aprovação de Gestor de Compras
- ❌ **NO-GO se:** Requisição criada < 90% dos tempos ou origem não auditável

---

### P0.2: MRP roda contra estoque_atual REAL (6h)
**Responsável:** Programador Backend  
**⏱️ Estimado:** 6h  
**📍 Arquivo crítico:** `src/usecases/MRPUseCase.ts`  
**Bloqueador:** MRP congelado contra `Item.estoque_atual` congelado  

- [ ] **Análise (1h)**
  - [ ] Investigar por que `estoque_atual` não atualiza durante MRP
  - [ ] Revisar fluxo: Apontamento PA → estoque atualiza? (Hoje não)
  - [ ] Documento de decisão: estoque_atual = sum(inventory_movements) real-time?
  - 👤 Responsável: Backend Tech Lead

- [ ] **Implementação (4h)**
  - [ ] Refatorar MRP para usar `inventory_movements` SUM em vez de `estoque_atual` cache
  - [ ] Adicionar índice em `inventory_movements` (company_id, item_id, date) se não existe
  - [ ] Validar precisão: 6 casas decimais em cálculos
  - [ ] Testes: MRP recalcula com dados reais
  - 👤 Responsável: Backend Developer

- [ ] **Validação (1h)**
  - [ ] Teste: Apontamento PA aumenta estoque → MRP reflete
  - [ ] Teste: Movimentação de estoque → MRP recalcula ofertas
  - [ ] Performance: MRP roda em < 30s para 5k itens
  - 👤 Responsável: QA + DevOps

**🚨 Go/No-Go Decision P0.2:**
- ✅ MRP reflete mudanças de estoque real-time
- ✅ Sem congelamento de netting
- ✅ Performance aceitável (< 30s)
- ❌ **NO-GO se:** MRP ainda congelado ou performance > 1min

---

### P0.3: Foreign Keys em 37 tabelas operacionais (4h)
**Responsável:** DevOps + Backend  
**⏱️ Estimado:** 4h (migração + testes)  
**📍 Arquivo crítico:** `migrations/` folder  
**Dependência:** Backup full antes de aplicar  

- [ ] **Mapeamento (1h)**
  - [ ] Listar 37 tabelas sem FKs (extrair de auditoria)
  - [ ] Priorizar: tabelas core (purchase_orders, inventory_movements, bills_of_materials)
  - [ ] Identificar ciclos (BOM → Item → BOM?) e resolvê-los
  - 👤 Responsável: Backend Tech Lead + DevOps

- [ ] **Migração (2h)**
  - [ ] Criar migration: ADD CONSTRAINT para cada FK crítica
  - [ ] Validação de dados: nenhuma linha orfã
  - [ ] Teste em dev: migration up/down funciona
  - [ ] Teste em staging: replicar carga de produção se possível
  - 👤 Responsável: DevOps + Backend Developer

- [ ] **Validação (1h)**
  - [ ] Teste: Não conseguir deletar Item com OPs referenciando
  - [ ] Teste: Cascata de deletação (se configurado)
  - [ ] Audit log: FKs adicionadas registradas
  - 👤 Responsável: QA

**🚨 Go/No-Go Decision P0.3:**
- ✅ FKs críticas aplicadas sem erro de constraint
- ✅ Backup pré-migração confirmado
- ✅ Rollback testado e documentado
- ❌ **NO-GO se:** Há dados orfãos que quebram FK ou rollback falha

---

### P0.4: IDOR — Validação de company_id em cada request (3h)
**Responsável:** Backend Security + Tech Lead  
**⏱️ Estimado:** 3h  
**📍 Arquivo crítico:** `src/middleware/authMiddleware.ts`, `src/middleware/tenantMiddleware.ts`  
**Bloqueador:** Usuários acessam recursos de outras empresas  

- [ ] **Auditoria (1h)**
  - [ ] Listar endpoints vulneráveis: `/items/:id`, `/purchase-orders/:id`, `/inventory/:id`
  - [ ] Testar: GET /items/1 como empresa B consegue acessar?
  - [ ] Documentar vulnerabilidade encontrada
  - 👤 Responsável: Security Team

- [ ] **Implementação (1.5h)**
  - [ ] Middleware: validar company_id na JWT (req.user.company_id)
  - [ ] Middleware: cada endpoint verifica: resource.company_id === req.user.company_id
  - [ ] Testes: 5 endpoints críticos (items, POs, bills, inventory, suppliers)
  - 👤 Responsável: Backend Developer

- [ ] **Teste de Segurança (0.5h)**
  - [ ] Tester: Gerar JWT de empresa A, tentar GET /items/:empresa_B_id
  - [ ] Esperado: 403 Forbidden
  - [ ] Teste: 10 endpoints auditados, 100% com validação
  - 👤 Responsável: QA Security

**🚨 Go/No-Go Decision P0.4:**
- ✅ 100% endpoints com validação company_id
- ✅ Teste de segurança passou (cross-tenant rejected)
- ✅ Documentação: quais endpoints auditados
- ❌ **NO-GO se:** Qualquer endpoint retorna recurso de outra empresa ou 403 não funciona

---

### P0.5: react-router-dom upgrade v7 (2h)
**Responsável:** Frontend Dev  
**⏱️ Estimado:** 2h  
**📍 Arquivo crítico:** `package.json`, `src/routes/`  
**Bloqueador:** CVE-2025-68470 (open redirect)  

- [ ] **Upgrade (1h)**
  - [ ] npm update react-router-dom@7
  - [ ] Revisar breaking changes na docs
  - [ ] Atualizar `<Router>`, `<Route>` se syntax mudou
  - [ ] Build sem erros
  - 👤 Responsável: Frontend Developer

- [ ] **Testes (1h)**
  - [ ] Teste: Navegação básica funciona (home, about, login)
  - [ ] Teste: Redirect após login não expõe URL perigosa
  - [ ] Teste: Deep linking funciona
  - [ ] npm audit: nenhuma vuln HIGH/CRITICAL
  - 👤 Responsável: QA + Frontend Dev

**🚨 Go/No-Go Decision P0.5:**
- ✅ Upgrade completo, npm audit clean
- ✅ Testes de navegação passam
- ✅ Sem breaking changes em produção
- ❌ **NO-GO se:** Build falha, redirect vulnerável ou testes falham

---

### P0.6: Apontamento reconciliação com OP (6h)
**Responsável:** Backend + QA  
**⏱️ Estimado:** 6h  
**📍 Arquivo crítico:** `src/usecases/ProductionReportUseCase.ts`  
**Bloqueador:** Apontamento desconectado da OP, quantity_produced sem validação  

- [ ] **Análise (1h)**
  - [ ] Revisar fluxo: OP criada → Apontamento registra quantity_produced → ?
  - [ ] Validar: quantity_produced não pode > OP.quantidade_planejada?
  - [ ] Decisão: Requisição de Material criada quando apontamento finaliza OP?
  - 👤 Responsável: Backend Tech Lead + Gestor Produção

- [ ] **Implementação (4h)**
  - [ ] Validação: quantity_produced <= OP.quantidade_planejada
  - [ ] Reconciliação: quando quantity_produced = OP.quantidade, marcar OP como FINALIZADA
  - [ ] Reverso: Apontamento deletado → desfazer reconciliação
  - [ ] Custo: PA.custo_unitario = BOM.custo_atual
  - [ ] Testes: 4 casos (parcial, completo, reverso, erro)
  - 👤 Responsável: Backend Developer

- [ ] **Validação (1h)**
  - [ ] UAT: Operário aponta 10u → OP marca 10/20 (parcial)
  - [ ] UAT: Aponta últimas 10u → OP marca FINALIZADA
  - [ ] UAT: Deletar apontamento → OP volta a ABERTA
  - [ ] Auditoria: cada reconciliação logged
  - 👤 Responsável: QA + Gestor Produção

**🚨 Go/No-Go Decision P0.6:**
- ✅ Apontamentos reconciliados com OP 100%
- ✅ Sem overshooting (quantity > planejada)
- ✅ Reversão funciona
- ❌ **NO-GO se:** Overshooting possível ou reconciliação inconsistente

---

## 1.2 — TESTES DE PR & FUNCIONALIDADES (5h)

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

## 1.3 — UAT FINAL COM STAKEHOLDERS (4h)

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

**Arquivo:** `docs/GO_LIVE_G6_INCIDENTS.md`

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
  - [ ] Arquivo: `docs/GO_LIVE_G6_KNOWN_ISSUES.md`
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

**Arquivo:** `docs/GO_LIVE_G6_LESSONS_LEARNED.md`

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
  - [ ] Criar índice: `docs/GO_LIVE_G6_INDEX.md`
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

| Item | Critério GO | Critério NO-GO | Status |
|------|------------|----------------|--------|
| P0.1: Requisição de Compra | ✅ Criada 100% casos | ❌ < 90% criada | ⏳ |
| P0.2: MRP estoque real | ✅ Reflete mudanças | ❌ Ainda congelado | ⏳ |
| P0.3: Foreign Keys | ✅ Nenhuma orfã | ❌ Há orfãs | ⏳ |
| P0.4: IDOR validação | ✅ 100% endpoints | ❌ Endpoint bypassa | ⏳ |
| P0.5: react-router v7 | ✅ Build OK, audit clean | ❌ Vulnerabilidade persiste | ⏳ |
| P0.6: Apontamento reconciliação | ✅ OP finaliza correto | ❌ Overshooting possível | ⏳ |
| PR Testing | ✅ 6/6 PRs passed | ❌ Qualquer PR falha | ⏳ |
| UAT | ✅ 100% stakeholders | ❌ Rejeição crítica | ⏳ |
| Backup + Rollback | ✅ Testado, < 30 min | ❌ Falha restore | ⏳ |
| Sign-offs | ✅ 4/4 aprovados | ❌ Qualquer pendente | ⏳ |

**Decisão Final (CTO):**
```
🟢 GO — Deploy autorizado, proceder Fase 2
🔴 NO-GO — Postergar, resolver pendências listadas
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
PRÉ-GO-LIVE (30h)
─────────────────
☐ P0.1: Requisição de Compra .................... 8h ___
☐ P0.2: MRP estoque real ....................... 6h ___
☐ P0.3: Foreign Keys ........................... 4h ___
☐ P0.4: IDOR validação ......................... 3h ___
☐ P0.5: react-router v7 upgrade ............... 2h ___
☐ P0.6: Apontamento reconciliação .............. 6h ___
☐ PR Testing (6 PRs) ........................... 5h ___
☐ UAT com stakeholders ......................... 4h ___
☐ Migração de dados validada ................... 3h ___
☐ Backup + Rollback testados ................... 2h ___
☐ Sign-offs formais ............................ 1h ___
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 DECISION POINT 1: GO/NO-GO?  ☐ GO  ☐ NO-GO

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

# ✅ DOCUMENTO ASSINADO

**Preparado por:** Tech Lead / Product Manager  
**Data:** 2 de agosto de 2026

**Assinado e Aprovado por:**

| Papel | Assinatura | Data |
|------|-----------|------|
| CTO | | |
| CFO | | |
| Gerente Produção | | |
| Compliance | | |

---

**SSOT:** Este é o único documento de Go-Live G6. Todas as informações consolidadas.  
**Próximo passo:** Iniciar Fase 1 e atualizar status em tempo real neste documento.

