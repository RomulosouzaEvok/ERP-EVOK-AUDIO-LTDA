# 📅 CRONOGRAMA PASSO A PASSO — IMPLEMENTAÇÃO E AJUSTES

**Duração Total Estimada:** 8 sprints (16 dias úteis / ~3 semanas)  
**Equipe:** 1 desenvolvedor full-stack  
**Base:** TypeScript + PostgreSQL (estrutura atual pós-migração)

---

## 📊 VISÃO GERAL DOS SPRINTS

| Sprint | Foco | Dias | Itens | Esforço |
|--------|------|------|-------|---------|
| **S0** | 🔥 Correções Críticas (P0) | 2 | 8 bugs CRÍTICOS | 8h |
| **S1** | 🗑️ Limpeza (PURGE) | 1 | Remover 99 itens obsoletos | 4h |
| **S2** | 🔧 Rastreabilidade & Modelagem (P1) | 2 | 4 itens ALTO | 8h |
| **S3** | 🛡️ Segurança (P2) | 2 | 4 itens ALTO | 8h |
| **S4** | ⚡ Melhorias de Código (P3) | 1 | 3 itens MÉDIO | 4h |
| **S5** | 🧪 Testes Automatizados | 4 | Vitest, unitários, integração | 16h |
| **S6** | 🐳 Docker + PostgreSQL | 2 | docker-compose, migrations | 8h |
| **S7** | 📚 Documentação Técnica | 2 | Cloud-ready docs, C4, Mermaid | 8h |

---

## 🔥 SPRINT 0 — CORREÇÕES CRÍTICAS (2 dias)

### Dia 1 — Correção de Parâmetros nos Controllers (4h)

| Horário | Tarefa | Arquivo | Esforço |
|---------|--------|---------|---------|
| 08:00-08:30 | **A01** — Corrigir `bomController.create` | `controllers/bomController.ts` | 30min |
| 08:30-09:00 | **A02** — Corrigir `explodeBOM` | `controllers/bomController.ts` | 30min |
| 09:00-10:00 | **A03** — Corrigir `saleController.consume` | `controllers/saleController.ts` | 30min |
| 10:00-11:00 | **A04** — Corrigir `productionOrder.updateStatus` (transação + consumo BOM) | `controllers/productionOrderController.ts` | 1h |
| 11:00-11:30 | **A05** — Corrigir `saleController.updateStatus` | `controllers/saleController.ts` | 30min |
| 11:30-12:00 | **A06** — Corrigir userId na finalização OP | `controllers/productionOrderController.ts` | 15min |
| 13:00-14:00 | **A09** — Implementar `validateFileMagic` | `utils/validators.ts` | 30min |
| 14:00-14:30 | **A08** — Remover exclude do tsconfig | `tsconfig.json` | 5min |

### Dia 2 — Validação e Teste das Correções (4h)

| Horário | Tarefa | Esforço |
|---------|--------|---------|
| 08:00-09:00 | Rodar `npx tsc --noEmit` e corrigir erros residuais | 1h |
| 09:00-10:00 | Testar fluxo: Criação de BOM → Explosão → Custos | 1h |
| 10:00-11:00 | Testar fluxo: Venda → Baixa de estoque → Cancelamento → Restauração | 1h |
| 11:00-12:00 | Testar fluxo: OP → Finalização → Consumo BOM → Produto acabado | 1h |

**✅ Critério de aceite S0:** `npx tsc --noEmit` com ZERO erros + 3 fluxos críticos testados

---

## 🗑️ SPRINT 1 — LIMPEZA PURGE (1 dia)

### Dia 3 — Remoção de Arquivos Obsoletos (4h)

| Horário | Tarefa | Comando/Arquivos | Esforço |
|---------|--------|------------------|---------|
| 08:00-08:30 | Remover 22 controllers `.js` | `rm server/src/controllers/*Controller.js` (exceto `uploadService.js` que exporta `uploadFile`) | 10min |
| 08:30-09:00 | Remover 22 routes `.js` | `rm server/src/routes/*.js` | 10min |
| 09:00-09:30 | Remover 22 models `.js` + index | `rm server/src/models/*.js` (manter index.js que referencia models .ts?) | 15min |
| 09:30-10:00 | Remover 2 middlewares `.js` | `rm server/src/middlewares/auth.js errorHandler.js` | 5min |
| 10:00-10:30 | Remover config `.js` + services `.js` | `rm server/src/config/database.js seeds.js` + `rm server/src/services/inventoryService.js` | 10min |
| 10:30-11:00 | Remover docs não técnicos | 15 arquivos em docs/ | 15min |
| 11:00-11:30 | Remover scripts temporários | `rm server/_check_types.bat` | 5min |
| 11:30-12:00 | Remover dependências não usadas | `npm uninstall mongoose multer --save` | 10min |

**⚠️ ATENÇÃO:** Antes de remover os `.js`, verificar se `server/index.js` (entry point CommonJS) está importando corretamente os `.ts`. O `tsx` runtime deve estar configurado para resolver módulos TypeScript.

```bash
# Script de PURGE automático
# Deve ser executado APÓS verificar que todos os .ts compilam e o servidor sobe
cd server
rm src/config/database.js src/config/seeds.js
rm src/controllers/*Controller.js
rm src/routes/*.js
rm src/models/*.js
rm src/middlewares/auth.js src/middlewares/errorHandler.js
rm src/services/inventoryService.js
rm _check_types.bat
```

**✅ Critério de aceite S1:** Servidor sobe sem erros (`npm run dev`) após remoção dos `.js`

---

## 🔧 SPRINT 2 — RASTREABILIDADE E MODELAGEM (2 dias)

### Dia 4 — Campos de Rastreabilidade (4h)

| Tarefa | Arquivo | Esforço |
|--------|---------|---------|
| Adicionar `serial_number`, `lot_number`, `batch_id`, `manufacture_date`, `expiry_date` ao model Product | `models/Product.ts` | 1h |
| Adicionar migration/alteração no banco | `src/config/database.ts` (ou migration futura) | 1h |
| Popular `lot_number` e `batch_id` na finalização da OP | `controllers/productionOrderController.ts` | 1h |
| Adicionar rota `GET /api/products/:id/trace` — histórico de rastreabilidade | `controllers/productController.ts` + `routes/products.ts` | 1h |

### Dia 5 — Validações Faltantes (4h)

| Tarefa | Arquivo | Esforço |
|--------|---------|---------|
| **B05** — Validar `due_date` obrigatório na OP | `controllers/productionOrderController.ts` | 15min |
| **B06** — Bloquear remoção de OP com venda vinculada | `controllers/productionOrderController.ts` | 30min |
| **B07** — Guardrail de produção para sync | `config/database.ts` | 30min |
| Adicionar validação de `quantity > 0` em todos os controllers | Controllers de sale, purchase, inventory | 1h |
| Adicionar validação de `price > 0` | Controllers de sale, purchase, product | 1h |

**✅ Critério de aceite S2:** Produto finalizado tem lot_number + endpoint de rastreabilidade funcional

---

## 🛡️ SPRINT 3 — SEGURANÇA (2 dias)

### Dia 6 — Sanitização e SQL Injection (4h)

| Tarefa | Arquivos | Esforço |
|--------|----------|---------|
| **B01** — Sanitizar `Op.like` no bomController | `controllers/bomController.ts` | 30min |
| **B02** — Sanitizar `Op.like` em todos os controllers | `controllers/clientController.ts`, `productController.ts`, `supplierController.ts`, etc. | 2h |
| Criar helper `sanitizeSearch()` | `shared/utils/strings.ts` | 30min |
| Aplicar sanitização em buscas de listagem | Todos controllers com `search` param | 1h |

### Dia 7 — Middleware de Validação de Payload (4h)

| Tarefa | Arquivo | Esforço |
|--------|---------|---------|
| Instalar Zod | `npm install zod` | 5min |
| Criar middleware `validateRequest` | `middlewares/validate.ts` | 1h |
| Criar schemas de validação para rotas principais | `routes/schemas/saleSchema.ts`, `purchaseSchema.ts`, `productSchema.ts` | 2h |
| Aplicar middleware nas 22 rotas | `routes/*.ts` | 1h |

**✅ Critério de aceite S3:** Nenhum endpoint aceita payload malformado sem retornar erro 400 estruturado

---

## ⚡ SPRINT 4 — MELHORIAS DE CÓDIGO (1 dia)

### Dia 8 — Refatoração (4h)

| Tarefa | Arquivo | Esforço |
|--------|---------|---------|
| **C01** — Alterar `quantity` para DECIMAL no Product | `models/Product.ts` | 30min |
| **C02** — Remover mongoose | `npm uninstall mongoose` | 5min |
| **C04** — Corrigir `fromCents` | `shared/utils/money.ts` | 15min |
| **D01** — Centralizar status machines em constants | `shared/utils/constants.ts` + refatorar controllers | 1h |
| **D02** — Implementar logger estruturado | `services/loggerService.ts` (Winston) | 1h |
| Substituir `console.log` por logger | Controllers e services | 1h |

**✅ Critério de aceite S4:** `npm run typecheck` passa limpo + `npm start` sobe sem warnings

---

## 🧪 SPRINT 5 — TESTES AUTOMATIZADOS (4 dias)

### Dia 9-10 — Testes Unitários (8h)

| Tarefa | Arquivo | Esforço |
|--------|---------|---------|
| Configurar Vitest | `vitest.config.ts` | 1h |
| Testar `shared/utils/money.ts` | `tests/unit/money.test.ts` | 1h |
| Testar `shared/utils/validators.ts` | `tests/unit/validators.test.ts` | 2h |
| Testar `errors/AppError.ts` | `tests/unit/errors.test.ts` | 1h |
| Testar entidades de domínio | `tests/unit/entities.test.ts` | 3h |

### Dia 11-12 — Testes de Integração (8h)

| Tarefa | Arquivo | Esforço |
|--------|---------|---------|
| Configurar banco de teste PostgreSQL | `docker-compose.test.yml` | 1h |
| Testar fluxo: Login → CRUD Cliente | `tests/integration/auth-client.test.ts` | 2h |
| Testar fluxo: Criação de Venda → Baixa Estoque | `tests/integration/sale-stock.test.ts` | 2h |
| Testar fluxo: OP → BOM → Consumo → Produto Acabado | `tests/integration/production-bom.test.ts` | 2h |
| Testar fluxo: Compra → Recebimento → AP | `tests/integration/purchase-ap.test.ts` | 1h |

**✅ Critério de aceite S5:** Cobertura mínima de 40% + 3 fluxos críticos testados

---

## 🐳 SPRINT 6 — DOCKER + POSTGRESQL (2 dias)

### Dia 13 — Docker Compose (4h)

| Tarefa | Arquivo | Esforço |
|--------|---------|---------|
| Criar `docker-compose.yml` com PostgreSQL 16 + pgAdmin | `docker-compose.yml` | 1h |
| Criar Dockerfile do backend | `server/Dockerfile` | 1h |
| Criar script init.sql com schema inicial | `docker/postgres/init.sql` | 1h |
| Testar subida completa dos containers | `docker compose up -d` | 1h |

### Dia 14 — Migrations e Scripts (4h)

| Tarefa | Arquivo | Esforço |
|--------|---------|---------|
| Configurar Umzug para migrations | `server/src/config/migrator.ts` | 1h |
| Criar migration inicial (tabelas) | `server/src/migrations/001-initial-schema.ts` | 1h |
| Criar script de seed versionado | `server/src/seeds/001-admin-seed.ts` | 1h |
| Criar script de setup Ubuntu | `scripts/setup-ubuntu.sh` | 30min |
| Criar script de backup automático | `scripts/backup.sh` | 30min |

**✅ Critério de aceite S6:** `docker compose up` sobe API + PostgreSQL em 30s

---

## 📚 SPRINT 7 — DOCUMENTAÇÃO TÉCNICA (2 dias)

### Dia 15 — Documentação Cloud-Ready (4h)

| Tarefa | Arquivo | Esforço |
|--------|---------|---------|
| Criar README.md completo (instalação, config, run) | `README.md` | 1h |
| Criar `.env.example` completo | `.env.example` | 30min |
| Atualizar `docs/API.md` com todos os endpoints | `docs/API.md` | 2h |
| Criar documentação de deploy | `docs/DEPLOY.md` | 30min |

### Dia 16 — Diagramas e Documentação Visual (4h)

| Tarefa | Arquivo | Esforço |
|--------|---------|---------|
| Criar DER em Mermaid (banco de dados) | `docs/DER.md` | 1h |
| Criar C4 Model (diagramas de contexto, container, componente) | `docs/C4_MODEL.md` | 1.5h |
| Criar diagramas de sequência (fluxos: venda, produção, compra) | `docs/FLUXOS.md` | 1h |
| Criar documentação do MRP Engine | `docs/MRP_ENGINE.md` | 30min |

**✅ Critério de aceite S7:** Documentação completa, copiável para GitHub Wiki / Notion / Obsidian

---

## 📊 RESUMO DE ESFORÇO

| Sprint | Dias | Horas | Entregável |
|--------|------|-------|------------|
| S0 🔥 | 2 | 8h | 8 bugs CRÍTICOS corrigidos |
| S1 🗑️ | 1 | 4h | 99 arquivos removidos, projeto enxuto |
| S2 🔧 | 2 | 8h | Rastreabilidade + validações |
| S3 🛡️ | 2 | 8h | SQL Injection eliminado + Zod |
| S4 ⚡ | 1 | 4h | Clean Code + Logger |
| S5 🧪 | 4 | 16h | Testes unitários + integração |
| S6 🐳 | 2 | 8h | Docker + PostgreSQL + Migrations |
| S7 📚 | 2 | 8h | Documentação Cloud-Ready |
| **TOTAL** | **16** | **64h** | **Projeto pronto para produção** |

---

## 🚨 RISCOS E MITIGAÇÕES

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Quebra de compatibilidade ao remover `.js` | Alto | Antes do PURGE, rodar `npx tsc --noEmit` e testar `npm run dev` |
| `tsx` não resolver módulos corretamente após PURGE | Alto | Verificar `moduleResolution: "Node16"` no tsconfig |
| Testes lentos sem banco PostgreSQL | Médio | Usar SQLite em memória para testes unitários |
| Dependência de serviços externos (WhatsApp, n8n) | Baixo | Mock nos testes de integração |

---

## 🏆 CHECKLIST FINAL DE GO-LIVE

- [ ] S0: `npx tsc --noEmit` = ZERO erros
- [ ] S0: Venda → Baixa de estoque → Cancelamento = OK
- [ ] S0: OP → Finalização → Consumo BOM → Produto acabado = OK
- [ ] S0: BOM → Criação → Explosão → Custo = OK
- [ ] S1: Servidor sobe sem arquivos `.js` legados
- [ ] S2: Produto finalizado tem `lot_number` no banco
- [ ] S3: Nenhum `Op.like` sem sanitização
- [ ] S3: Payloads inválidos retornam erro 400 estruturado
- [ ] S4: `npm run typecheck` limpo
- [ ] S5: Cobertura de testes ≥ 40%
- [ ] S6: `docker compose up` funcional
- [ ] S7: Documentação publicável na nuvem
