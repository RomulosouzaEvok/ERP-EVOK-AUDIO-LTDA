# 📊 Matriz de Conformidade Pré-Produção — ERP Evok Áudio
**Data:** 2 de agosto de 2026  
**Versão:** 1.0  
**SSOT:** Single Source of Truth para rastreamento de conformidade  
**Próxima atualização:** A cada PR merged (marcar achados como ✓)

---

## 🎯 Resumo Executivo

| Métrica | Valor |
|---------|-------|
| **Total de Achados** | 40 |
| **Bloqueadores Go-Live** | 7 |
| **Conformidade Total** | 15% (6 de 40 ✓) |
| **Status Crítico** | 🔴 NÃO APROVADO PARA GO-LIVE |

---

## 📈 Conformidade por Pilar

| Pilar | Conforme | Total | % | Bloqueadores |
|------|----------|-------|---|--------------|
| **1. Regras de Negócio & Rastreabilidade** | 0 | 8 | 0% | 2 |
| **2. Integridade Transacional & Edge Cases** | 1 | 12 | 8% | 2 |
| **3. Segurança & DevSecOps** | 4 | 15 | 27% | 2 |
| **4. Dependências & Arquitetura** | 1 | 5 | 20% | 1 |
| **TOTAL** | **6** | **40** | **15%** | **7** |

---

## 🔴 PILAR 1: Regras de Negócio & Rastreabilidade (8 achados)

**Status:** 0% conforme | 2 bloqueadores de Go-Live

| ID | Gravidade | Descrição | Status | Bloqueador? | PR de Correção | Notas |
|----|-----------|-----------|--------|-------------|----------------|-------|
| **1.1** | 🔴 CRÍTICO | Cadeia de Suprimentos sem Requisição de Compra (impossível auditar origem de compras) | ✗ Não conforme | **SIM** | `feat/purchase-requisition` | Impacto crítico na rastreabilidade; falta módulo inteiro |
| **1.2** | 🔴 CRÍTICO | MRP roda contra `Item.estoque_atual` congelado, causando netting incorreto | ✗ Não conforme | **SIM** | `fix/mrp-live-inventory` | Gera compras desnecessárias; decisões erradas de planejamento |
| **1.3** | 🟠 ALTO | Apontamento de Produção desconectado da OP (sem validação de `quantity_produced`) | ✗ Não conforme | SIM | `fix/production-forecast-validation` | Impossível conciliar produção real vs. planejado |
| **1.4** | 🟠 ALTO | Payable criado na aprovação de compra, não no recebimento (contabilidade prematura) | ✗ Não conforme | SIM | `fix/payable-on-receipt` | Distorção de fluxo de caixa e contas a pagar |
| **1.5** | 🟠 ALTO | OP sem BOM ativa gera PA com custo zero (contabilidade quebrada) | ⚠️ Parcial | Não | `fix/bom-cost-validation` | Validação parcial implementada; falta reconciliação |
| **1.6** | 🟠 ALTO | Reserva de estoque global sem vínculo por OP (canibalização entre OPs) | ✗ Não conforme | Não | `feat/stock-reservation-by-op` | Reservas competem; sem alocação determinística |
| **1.7** | 🟠 ALTO | MRP sem netting por nível (multi-level) (compra de MPs desnecessárias) | ✗ Não conforme | Não | `fix/mrp-multilevel-netting` | Backlog P1; afeta otimização de compras |
| **1.8** | 🟠 ALTO | Estoque abatido por demanda no MRP, causando netting invertido | ✗ Não conforme | Não | `fix/mrp-demand-netting` | Backlog P1; refinamento do netting |

**Subtotal Pilar 1:** 0/8 ✓ | 4 bloqueadores críticos

---

## 🟠 PILAR 2: Integridade Transacional & Edge Cases (12 achados)

**Status:** 8% conforme | 2 bloqueadores de Go-Live

| ID | Gravidade | Descrição | Status | Bloqueador? | PR de Correção | Notas |
|----|-----------|-----------|--------|-------------|----------------|-------|
| **2.1** | 🔴 CRÍTICO | 37 tabelas operacionais SEM foreign keys (integridade referencial não garantida) | ✗ Não conforme | **SIM** | `fix/add-foreign-keys` | Risco crítico de corrupção de dados; falta 4h de implementação |
| **2.2** | 🟠 ALTO | BOM supersede fora de transação (produto fica sem BOM ativa durante transição) | ✗ Não conforme | SIM | `fix/bom-supersede-transaction` | Race condition; blackout de produção |
| **2.3** | 🟡 MÉDIO | TOCTOU em atualização de estoque (falta lock pessimista) | ⚠️ Parcial | Não | `fix/pessimistic-locking` | Implementado parcial; falta cobertura em variações |
| **2.4** | 🟡 MÉDIO | NF-e `processing` state sem timeout (webhook pendurado indefinidamente) | ✗ Não conforme | Não | `fix/nfe-processing-timeout` | Backlog P1; falta tratamento de dead letter |
| **2.5** | 🟡 MÉDIO | Precisão decimal em cálculos financeiros (Java BigDecimal vs. JavaScript number) | ✗ Não conforme | Não | `fix/decimal-precision` | Backlog P1; impacto em DRE de centavos |
| **2.6** | 🟡 MÉDIO | Deadlock em operações paralelas de estoque (A → B → A lock order) | ⚠️ Parcial | Não | `fix/lock-order-consistency` | Mitigado com retry; falta redesign global |
| **2.7** | 🟡 MÉDIO | Sem rollback automático em falha de NF-e (transação fica inconsistente) | ⚠️ Parcial | Não | `fix/nfe-rollback-strategy` | Implementado com trigger manual; falta orquestração |
| **2.8** | 🟡 MÉDIO | Estoque negativo possível em race condition (sem check-before-allocate) | ✗ Não conforme | Não | `fix/negative-stock-guard` | Backlog P1; falta validação em camada aplicação |
| **2.9** | 🟡 MÉDIO | Reconciliação de estoque sem snapshot point-in-time | ✗ Não conforme | Não | `feat/stock-snapshot-audit` | Backlog P1; impacto em auditoria |
| **2.10** | 🔵 BAIXO | Sem tratamento de índice duplicado em `stock_movements` | ⚠️ Parcial | Não | `fix/duplicate-index-cleanup` | Corrigido em v66626fe; validação pending |
| **2.11** | 🔵 BAIXO | Backup sem retry inteligente (falha silenciosa) | ⚠️ Parcial | Não | `fix/backup-retry-exponential` | Implementado em v66626fe; validação em staging |
| **2.12** | 🔵 BAIXO | Ciclo em getBOMTree sem proteção (proteção contra ciclo implementada) | ✓ Conforme | Não | `fix/bom-cycle-protection` | Validado em v19e457f |

**Subtotal Pilar 2:** 1/12 ✓ | 2 bloqueadores críticos

---

## 🟡 PILAR 3: Segurança & DevSecOps (15 achados)

**Status:** 27% conforme | 2 bloqueadores de Go-Live

| ID | Gravidade | Descrição | Status | Bloqueador? | PR de Correção | Notas |
|----|-----------|-----------|--------|-------------|----------------|-------|
| **3.1** | 🔴 CRÍTICO | IDOR: Usuários acessam recursos de outras empresas (sem validação `company_id`) | ✗ Não conforme | **SIM** | `fix/idor-tenant-validation` | Falta 3h de implementação; bloqueio crítico |
| **3.2** | 🟠 ALTO | `react-router-dom ^6.30.4` vulnerável (CVE-2025-68470 — open redirect) | ✗ Não conforme | **SIM** | `fix/react-router-v7-upgrade` | Falta 2h; atualizar para v7.0+ |
| **3.3** | 🟠 ALTO | TypeScript sem `strict: true` (NaN em cálculos financeiros) | ✗ Não conforme | Não | `fix/typescript-strict-mode` | Backlog P1; falta 8h para refatoração |
| **3.4** | 🟠 ALTO | 13 use-cases acoplados a Sequelize (testabilidade quebrada) | ✗ Não conforme | Não | `refactor/decouple-sequelize` | Backlog P1; falta 20h para abstração |
| **3.5** | 🟡 MÉDIO | Sem helmet (segurança HTTP headers) | ⚠️ Parcial | Não | `fix/helmet-security-headers` | Implementado parcial; falta CSP tunning |
| **3.6** | 🟡 MÉDIO | Sem rate limiting em endpoints sensíveis (auth, upload) | ✗ Não conforme | Não | `fix/rate-limiting` | Backlog P1; falta implementação de quota |
| **3.7** | 🟡 MÉDIO | Sem validação de upload MIME type (aceita qualquer arquivo) | ✗ Não conforme | Não | `fix/upload-mime-validation` | Backlog P1; falta whitelist de tipos |
| **3.8** | 🟡 MÉDIO | JWT sem rotação de chaves (secret expira em 1 ano) | ✗ Não conforme | Não | `fix/jwt-key-rotation` | Backlog P1; falta orquestração de rotação |
| **3.9** | 🟡 MÉDIO | Sem autenticação multi-fator (MFA) para usuários admin | ✗ Não conforme | Não | `feat/mfa-admin` | Backlog P1; falta TOTP/SMS |
| **3.10** | 🟡 MÉDIO | Logs não criptografados (plaintext passwords em alguns erros) | ✗ Não conforme | Não | `fix/sanitize-logs` | Backlog P1; falta redaction automática |
| **3.11** | 🟡 MÉDIO | Sem validação de CORS origin (permite qualquer origin) | ✗ Não conforme | Não | `fix/cors-origin-validation` | Backlog P1; falta whitelist |
| **3.12** | 🔵 BAIXO | Dependências desatualizadas (npm audit com 12 vulnerabilidades menores) | ⚠️ Parcial | Não | `chore/update-npm-dependencies` | Em andamento; validação em CI |
| **3.13** | 🔵 BAIXO | Sem assinatura de commits Git (forjar commits) | ✗ Não conforme | Não | `chore/enforce-git-signing` | Backlog técnico; falta configuração |
| **3.14** | 🔵 BAIXO | Secrets em `.env` sem validação de schema | ⚠️ Parcial | Não | `fix/env-schema-validation` | Implementado com zod; falta cobertura |
| **3.15** | 🔵 BAIXO | Sem auditoria de acesso de admin (quem acessou o quê) | ✗ Não conforme | Não | `feat/admin-access-audit` | Backlog P2; falta logging estruturado |

**Subtotal Pilar 3:** 4/15 ✓ | 2 bloqueadores críticos

---

## 🔵 PILAR 4: Dependências & Arquitetura (5 achados)

**Status:** 20% conforme | 1 bloqueador de Go-Live

| ID | Gravidade | Descrição | Status | Bloqueador? | PR de Correção | Notas |
|----|-----------|-----------|--------|-------------|----------------|-------|
| **4.1** | 🟠 ALTO | Duplicação de `pg` e `sequelize` em package.json (conflito potencial) | ⚠️ Parcial | Não | `chore/deduplicate-deps` | Detectado; falta cleanup automático |
| **4.2** | 🟠 ALTO | Arquivo `scripts/dead-code-marker.js` lixo (nunca usado) | ✓ Conforme | Não | `chore/remove-dead-files` | Removido em v5723615 |
| **4.3** | 🟠 ALTO | Arquitetura dual backend (Sequelize + raw SQL) sem guia de decisão | ✗ Não conforme | **SIM** | `docs/sql-strategy-decision` | Falta 2h de documentação; bloqueia padrão de código |
| **4.4** | 🔵 BAIXO | Build cache miss frequente (node_modules reinstalação desnecessária) | ⚠️ Parcial | Não | `ci/optimize-build-cache` | Implementado em CI; falta validação em staging |
| **4.5** | 🔵 BAIXO | Sem testes de carga (não sabe escalabilidade da aplicação) | ✗ Não conforme | Não | `test/load-testing-k6` | Backlog P2; falta baseline de performance |

**Subtotal Pilar 4:** 1/5 ✓ | 1 bloqueador crítico

---

## 🚀 Bloqueadores de Go-Live (7 achados)

Estes **DEVEM** ser resolvidos antes de Go-Live:

| ID | Prioridade | Descrição | Esforço | Status |
|----|-----------|-----------|---------|--------|
| **1.1** | P0 | Requisição de Compra | 8h | ✗ Não iniciado |
| **1.2** | P0 | MRP contra estoque real | 6h | ✗ Não iniciado |
| **1.3** | P0 | Validação de Apontamento | 6h | ✗ Não iniciado |
| **2.1** | P0 | Foreign Keys (37 tabelas) | 4h | ✗ Não iniciado |
| **2.2** | P0 | BOM transação atômica | 3h | ✗ Não iniciado |
| **3.1** | P0 | IDOR tenant validation | 3h | ✗ Não iniciado |
| **3.2** | P0 | react-router v7 | 2h | ✗ Não iniciado |
| **4.3** | P0 | SQL strategy docs | 2h | ✗ Não iniciado |

**Total P0:** 34 horas de trabalho crítico

---

## 📋 Legenda de Status

| Símbolo | Significado |
|---------|------------|
| ✓ | **Conforme** — Achado resolvido e validado |
| ⚠️ | **Parcial** — Implementação em progresso ou mitigação temporária |
| ✗ | **Não Conforme** — Achado aberto, sem implementação |
| **SIM** | Bloqueador: impede Go-Live |
| **Não** | Não bloqueador: pode ir para backlog P1/P2 |

---

## 🟢 Achados Conformes (6 de 40)

| ID | Descrição | Validação |
|----|-----------|-----------|
| **2.12** | Ciclo em getBOMTree com proteção | v19e457f |
| **4.2** | Arquivo morto removido | v5723615 |
| **3.5** | Helmet implementado | Parcial em staging |
| **3.12** | npm audit atualizado | Em CI |
| **3.14** | .env schema com zod | Parcial em test |
| **4.4** | Build cache otimizado | Parcial em CI |

---

## 📅 Plano de Ação Recomendado

### Fase 1: Bloqueadores (Semana 1 — 34h)
- **Dia 1-2:** FKs (2.1) + IDOR (3.1) = 7h
- **Dia 2-3:** Requisição de Compra (1.1) = 8h
- **Dia 3-4:** MRP (1.2) + Apontamento (1.3) = 12h
- **Dia 4:** BOM transação (2.2) + react-router (3.2) = 5h
- **Dia 5:** SQL docs (4.3) + UAT = 2h

### Fase 2: Pós-Go-Live (Backlog P1 — 20h)
- TypeScript strict (3.3)
- Desacoplar Sequelize (3.4)
- Stock reservations (1.6)
- MRP netting (1.7)
- Payable proporcional (1.4)

### Fase 3: Backlog Técnico (P2/P3)
- Todos os achados BAIXO (🔵)
- Performance e escalabilidade

---

## 🔄 Como Usar Este Documento

1. **Atualização por PR:** Quando uma PR for mergeada, marque o achado como ✓ e atualize a coluna "PR de Correção"
2. **Rastreamento de Status:** Use `⚠️ Parcial` para PRs em code review
3. **Cálculo de % Conforme:** Fórmula = (Achados ✓) / (Total de Achados) × 100
4. **Go-Live Gate:** Todas as 7 PRs bloqueadoras devem estar ✓ antes de autorização

---

## 📊 Histórico de Conformidade

| Data | % Conforme | Bloqueadores Resolvidos | Status |
|------|-----------|------------------------|----|
| 2026-08-02 | 15% (6/40) | 0/7 | 🔴 Não aprovado |
| *A atualizar* | - | - | - |

---

## ✍️ Notas Finais

Este documento é o **SSOT (Single Source of Truth)** para rastreamento de conformidade pré-produção. Será atualizado a cada PR mergeada. Go-Live só será autorizado quando:
- Todos os 7 bloqueadores estiverem ✓
- Teste UAT passar
- Aprovação de CTO/CFO/Compliance

**Próxima revisão:** A cada PR merged  
**Responsável:** Tech Lead / DevOps
