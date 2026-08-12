# Plano do Projeto — ERP EVOK ÁUDIO

**Status:** 🟡 Pré-Go-Live G6 (ver `CLAUDE.md` como SSOT de status vigente).
Este documento foi reescrito em 2026-08-06 para refletir o estado real do
projeto — a versão anterior descrevia um MVP inicial (18 modelos, "frontend
React planejado") que já foi superado em várias rodadas de entrega. Onde este
plano e `CLAUDE.md` divergirem no futuro, `CLAUDE.md` é a fonte de verdade;
este documento deve ser atualizado para acompanhar.

---

## Visão Geral

Sistema ERP completo para a **EVOK ÁUDIO** — indústria de alto-falantes e
componentes de áudio profissionais, ~100-150 colaboradores, 21 departamentos.

- **Backend:** Node.js + TypeScript + Express + Sequelize + PostgreSQL 16.
- **Frontend web:** React 19 + Vite (`client/`, porta 5173) — cobre hoje
  praticamente todos os módulos de backend (ver §3).
- **Apps móveis novos (2026-08-06):** `mobile/` (Expo/React Native — scan QR
  de estoque, contagens cíclicas) e `tv/` (Android TV — painel de demandas
  por departamento).

---

## 1. Arquitetura do Projeto

```
erp-evok-audio/
├── server/
│   ├── src/
│   │   ├── models/               # ~30+ modelos Sequelize (Item, Fornecedor,
│   │   │                         # OP, NonConformity, MaintenanceOrder,
│   │   │                         # LotControl, RFQ, CostCenter, etc.)
│   │   ├── modules/               # Clean Architecture por domínio
│   │   │   ├── auth/ users/ accessProfiles/
│   │   │   ├── products/ items/ categories/ bom/
│   │   │   ├── sales/ clients/
│   │   │   ├── purchases/ purchaseRequisitions/ rfq/ suppliers/
│   │   │   ├── inventory/ mobileInventory/
│   │   │   ├── production/ workCenters/ mrp/
│   │   │   ├── nonConformities/ laboratory/ engineering/
│   │   │   ├── maintenance/ assets/ serviceOrders/
│   │   │   ├── financial/ fiscal/
│   │   │   ├── reports/ dashboard/ intelligentAuditor/
│   │   │   ├── traceability/ auditLogs/ webhooks/
│   │   │   └── employees/ departments/
│   │   ├── middlewares/          # auth (JWT + RBAC), errorHandler
│   │   ├── config/                # database.ts, runtimeEnv.ts
│   │   └── shared/                # UseCase base, handoffSignal, erros
│   ├── database/postgresql/       # 64 migrations versionadas
│   └── __tests__/                 # unit, integration, edge cases
├── client/                        # React 19 + Vite — páginas por módulo
│   └── src/pages/
│       ├── sales/ purchases/ logistics/ production/
│       ├── quality/ laboratory/ engineering/ maintenance/ patrimonio/
│       ├── financial/ hr/ reports/ users/ settings/ traceability/
├── mobile/                        # Expo/React Native (login, QR, contagens)
├── tv/                             # Android TV (react-native-tvos)
├── docs/
│   ├── projeto/                   # Plano, arquitetura, use-cases
│   ├── business/                  # UCs de RBAC, regras de negócio
│   ├── arquitetura/                # Diagramas, requisitos, BPMN
│   ├── manual/                     # Manual do usuário
│   ├── DATABASE.md                 # Modelo de dados
│   ├── API.md                      # Contrato de endpoints
│   ├── governance/RESIDUAIS_ABERTOS_2026-08-10.md  # Fonte de pendências (medida)
│   ├── governance/TODO.md          # Diário/rastreamento histórico dia a dia
│   └── DIARIO_BORDO_GO_LIVE_G6.md  # Diário de bordo do Go-Live
└── CLAUDE.md                      # SSOT geral do projeto
```

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Versão | Status |
|--------|------------|--------|--------|
| Backend | Node.js + TypeScript (`tsx`) | 18+ | ✅ |
| Framework | Express | 4.18 | ✅ |
| ORM | Sequelize | 6.37 | ✅ |
| Banco | **PostgreSQL** (único suportado — sem MySQL/SQLite) | 16 | ✅ |
| Autenticação | JWT + bcrypt, refresh deslizante | - | ✅ |
| Upload / QR | Multer / qrcode | 2.2 / 1.5 | ✅ |
| Rate limit | express-rate-limit | 8.6 | ✅ |
| Validação | express-validator + Zod (módulos novos) | 7.0 | ✅ |
| Logging | Winston (JSON em produção, colorido em dev) | - | ✅ |
| Testes backend | Jest + Supertest | - | ✅ |
| **Frontend web** | **React 19 + Vite + TypeScript**, React Router 8.3, TanStack Query, Tailwind 4 / shadcn, Vitest | - | ✅ (não é mais "planejado") |
| **App mobile** | Expo / React Native | - | ✅ (validado por typecheck/bundle; sem hardware real ainda) |
| **App Android TV** | react-native-tvos | - | ✅ (mesma ressalva de validação) |

> A versão anterior deste documento listava "Frontend: React (planejado)" e
> "PostgreSQL 8.0+" — ambos desatualizados. O frontend web está implementado
> e cabeado desde 2026-08-02/05; a versão de PostgreSQL suportada é a 16.

---

## 3. Módulos Implementados

A contagem por módulo abaixo é um resumo narrativo. Para a lista completa e
rastreável de requisitos funcionais por módulo (com link para UC/rota real),
ver **[`docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md`](../arquitetura/DOCUMENTO_DE_REQUISITOS.md)**.

### ✅ Autenticação, Usuários e Perfis de Acesso
Login JWT com rate-limit e refresh deslizante; perfis de acesso configuráveis
por módulo (`operate`/`approve`), substituindo o modelo antigo de 3 roles
fixas (admin/operator/financial) como único controle — hoje RBAC é 100% das
rotas + perfil de área.

### ✅ Cadastros Base
Clientes, fornecedores, `Item` (núcleo intocado + extensões comerciais/
técnicas — ver `CLAUDE.md` §7), categorias, departamentos, catálogo
item×fornecedor N:N.

### ✅ Estoque e Almoxarifado
Entrada/saída/ajuste, múltiplos depósitos com transferência, lotes com
liberação/bloqueio de qualidade (`quarantine → available/blocked`),
rastreabilidade por QR, inventário cíclico (pool/atribuído) — inclusive via
app mobile.

### ✅ Vendas / Comercial
Pedidos, alteração de itens antes de faturar, faturamento parcial de NF-e,
tabela de preços por cliente, expedição.

### ✅ Compras / Suprimentos
Requisição de compra como origem obrigatória, cotação/RFQ multi-fornecedor
com adjudicação por item, pedidos de compra, recebimento com quarentena,
cockpit de compras, avaliação de fornecedor.

### ✅ Financeiro
Contas a pagar/receber, centros de custo, projeção de fluxo de caixa
(semanal e diária), conciliação bancária OFX, configuração fiscal.

### ✅ Produção / PCP
Ordens de Produção contra estoque real, apontamento reconciliado, BOM
multi-nível, MRP com conversão manual/automática em requisição, paradas de
máquina categorizadas, OEE por centro de trabalho, custeio real de mão de
obra/overhead.

### ✅ Qualidade / Laboratório / Engenharia
Não-conformidades (ciclo completo causa raiz → ação corretiva →
verificação de eficácia), inspeção de recebimento (libera/bloqueia lote),
testes de laboratório (Thiele-Small, com opção destrutiva), projetos de
engenharia, desenhos técnicos, requisição de amostra.

### ✅ Patrimônio / Manutenção
Ativos com QR Code e depreciação, ordens de manutenção
(preventiva/corretiva/preditiva/emergencial/overhaul) com custo de
peças+mão de obra+downtime, ordens de serviço externas (garantia).

### ✅ RH
Funcionários (CTPS, PIS, dados bancários), departamentos com hierarquia,
turnos e regime de trabalho.

### ✅ Relatórios / Dashboard / Auditor Inteligente
KPIs, relatórios por módulo, OEE, variação de custo, Auditor Inteligente
(estoque negativo/zerado/baixo/excessivo, sugestão de reposição, curva ABC),
semáforo de handoff entre departamentos, painel Android TV.

### ✅ Segurança e Auditoria
JWT + refresh, Helmet, rate limiting por rota sensível, CORS configurável,
anti-spoofing de identidade (requester/approved_by/operator do JWT, nunca do
payload livre), `AuditLog` de ações sensíveis, logging estruturado Winston.

### 🔴 Pendências reais (não implementadas, não "modelo pendente" genérico)
- **Importação/COMEX (UC-19):** descrito em `docs/projeto/04-USE_CASES.md`,
  sem rota/modelo no backend — decisão de negócio pendente (implementar ou
  descontinuar o UC).
- **Folha de pagamento (Payroll) e Benefícios:** sem modelo/rota.
- **Certificações de produto/processo:** sem modelo/rota dedicada.
- **CNAB (boleto/remessa/retorno):** só conciliação via OFX foi implementada.
- **Capacidade finita por centro de trabalho:** roadmap Fase 3 (P2).

Ver detalhamento completo em `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md`
(seção "Divergências UC × Código").

---

## 4. Modelos de Dados

O projeto evoluiu de 18 modelos (versão inicial) para bem mais de 30 hoje,
incluindo `Item`/extensões (substituindo o antigo `Product` monolítico em
migração faseada — ver `docs/governance/HANDOFF_CODEX.md`), `NonConformity`,
`MaintenanceOrder`, `LotControl`, RFQ (`Rfq`, `RfqSupplier`, `RfqQuote`),
`CostCenter`, `ProductionCostSettings`, `ProductCostLedger`,
`AccessProfile`, `AuditLog`, e mais. **A lista completa e o schema real
vivem em [`docs/database/DATABASE.md`](../database/DATABASE.md)** — este documento não
duplica a modelagem de dados, apenas referencia.

---

## 5. Roadmap

Ver **`CLAUDE.md` §5 (Go-Live Readiness)** para o roadmap vigente e
autoritativo, incluindo:

1. **Fase 1 (P0):** ✅ concluída em 2026-08-02.
2. **Fase 2 (P1):** ✅ majoritariamente entregue entre 2026-08-04 e
   2026-08-06 — o que falta está listado lá (validação em hardware real dos
   apps novos, teste de concorrência real de contagem cíclica, backfill de
   custeio, CNAB, histórico multi-NF-e, testes de integração Postgres das
   features de maior risco da terceira rodada).
3. **Fase 3 (P2):** capacidade finita/centros de trabalho, TypeScript strict.
4. **Fase 4 (P3):** refugo detalhado por etapa, CI/CD, unificação de schema
   legado/novo.
5. **Infra de produção:** servidor ainda não adquirido — bloqueia o deploy
   independentemente do progresso funcional acima.

Este documento não repete o roadmap item a item para evitar duas fontes
divergentes — apenas aponta para `CLAUDE.md` como SSOT.

---

## 6. Segurança

### Implementado
- JWT com expiração configurável (7 dias) + refresh deslizante.
- Bcrypt para hash de senha.
- Helmet para headers de segurança.
- Rate limiting específico por rota sensível (login, registro, refresh,
  recuperação de senha) + geral de API.
- CORS configurável por ambiente.
- RBAC 100% das rotas via `authenticate` + `authorizeModule`.
- Anti-spoofing de identidade em campos como `requester`/`approved_by`.
- Proteção contra XSS via express-validator; Zod em módulos novos.
- Auditoria de operações sensíveis (`AuditLog`).

### Pendente / recomendado
- Teste de penetração / pentest formal.
- 2FA (opcional, não decidido).
- Política formal de retenção/anonimização de dados pessoais (LGPD).
- TLS em produção (depende do reverse proxy, ainda não implantado).

Detalhamento completo, item a item, com status e fonte, em
`docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md` §2.

---

## 7. Performance

### Boas práticas em vigor
- Paginação nas principais listagens.
- Índices em foreign keys (159+ FKs versionadas via migration).
- Pool de conexões PostgreSQL (dev: 10 / produção: 20).
- Transações Sequelize em operações críticas (vendas, compras, produção,
  contagem cíclica, conciliação bancária).

### Pontos de atenção conhecidos
- Sem benchmark formal de tempo de resposta sob carga real (nº de usuários
  simultâneos, volume de OPs/vendas) — recomendado antes do Go-Live com uso
  pleno da força de trabalho.
- Sem cache de aplicação (Redis ou equivalente) implementado.
- Arquitetura horizontal (múltiplas instâncias de API) não testada/
  configurada.

Ver `docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md` §1 e §4 para o
detalhamento completo (desempenho e escalabilidade).

---

## Referências

- **[`CLAUDE.md`](../../CLAUDE.md)** — SSOT geral, status vigente do Go-Live.
- **[`docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md`](../arquitetura/DOCUMENTO_DE_REQUISITOS.md)** — requisitos funcionais rastreáveis por módulo.
- **[`docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md`](../arquitetura/REQUISITOS_NAO_FUNCIONAIS.md)** — requisitos não funcionais.
- **[`docs/database/DATABASE.md`](../database/DATABASE.md)** — modelo de dados real.
- **[`docs/arquitetura/API.md`](../arquitetura/API.md)** — contrato de endpoints.
- **[`docs/projeto/04-USE_CASES.md`](04-USE_CASES.md)**, **[`docs/business/01-USE_CASES.md`](../business/01-USE_CASES.md)** — casos de uso formais.
- **[`docs/governance/TODO.md`](../governance/TODO.md)** — pendências dia a dia.

---

**Última atualização:** 6 de agosto de 2026 — reescrita para refletir o
estado real do projeto (substitui a versão de MVP inicial).
