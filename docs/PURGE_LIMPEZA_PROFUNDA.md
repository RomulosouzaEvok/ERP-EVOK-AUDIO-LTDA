# 🗑️ PLANO DE LIMPEZA (PURGE) — REMOÇÃO DE ARQUIVOS OBSOLETOS

**Total identificado:** 68+ arquivos para remover  
**Economia estimada:** ~15MB + 90% de redução de poluição visual

---

## 📦 GRUPO 1: ARQUIVOS `.js` LEGADOS (duplicados dos `.ts`)

### 1.1 Config (2 arquivos)
| Arquivo | Motivo | Ação |
|---------|--------|------|
| `server/src/config/database.js` | Substituído por `database.ts` | ✅ Remover |
| `server/src/config/seeds.js` | Substituído por `seeds.ts` | ✅ Remover |

### 1.2 Controllers (22 arquivos)
| Arquivo | Motivo | Ação |
|---------|--------|------|
| `server/src/controllers/assetController.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/controllers/auditLogController.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/controllers/authController.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/controllers/bomController.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/controllers/categoryController.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/controllers/clientController.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/controllers/dashboardController.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/controllers/departmentController.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/controllers/employeeController.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/controllers/financeController.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/controllers/intelligentAuditorController.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/controllers/inventoryController.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/controllers/maintenanceController.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/controllers/mobileInventoryController.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/controllers/nonConformityController.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/controllers/productController.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/controllers/productionOrderController.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/controllers/purchaseController.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/controllers/reportController.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/controllers/saleController.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/controllers/serviceOrderController.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/controllers/supplierController.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/controllers/userController.js` | Substituído por `.ts` | ✅ Remover |

### 1.3 Routes (22 arquivos)
| Arquivo | Motivo | Ação |
|---------|--------|------|
| `server/src/routes/assets.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/routes/auditLogs.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/routes/auth.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/routes/bom.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/routes/categories.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/routes/clients.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/routes/dashboard.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/routes/departments.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/routes/employees.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/routes/finance.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/routes/intelligentAuditor.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/routes/inventory.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/routes/maintenance.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/routes/mobileInventory.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/routes/nonConformities.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/routes/productionOrders.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/routes/products.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/routes/purchases.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/routes/reports.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/routes/sales.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/routes/serviceOrders.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/routes/suppliers.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/routes/users.js` | Substituído por `.ts` | ✅ Remover |

### 1.4 Models (22 arquivos)
| Arquivo | Motivo | Ação |
|---------|--------|------|
| `server/src/models/AccountPayable.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/models/AccountReceivable.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/models/Asset.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/models/AuditLog.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/models/BillOfMaterial.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/models/BillOfMaterialItem.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/models/Category.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/models/Client.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/models/Department.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/models/Employee.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/models/index.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/models/InventoryMovement.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/models/MaintenanceOrder.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/models/NonConformity.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/models/Product.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/models/ProductionOrder.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/models/Purchase.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/models/PurchaseItem.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/models/Sale.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/models/SaleItem.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/models/ServiceOrder.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/models/Supplier.js` | Substituído por `.ts` | ✅ Remover |
| `server/src/models/User.js` | Substituído por `.ts` | ✅ Remover |

### 1.5 Middlewares (2 arquivos)
| Arquivo | Motivo | Ação |
|---------|--------|------|
| `server/src/middlewares/auth.js` | Substituído por `auth.ts` | ✅ Remover |
| `server/src/middlewares/errorHandler.js` | Substituído por `errorHandler.ts` | ✅ Remover |

### 1.6 Services (2 arquivos)
| Arquivo | Motivo | Ação |
|---------|--------|------|
| `server/src/services/inventoryService.js` | Substituído por `inventoryService.ts` | ✅ Remover |
| `server/src/services/uploadService.js` | Substituído por `uploadService.ts` | ✅ **Manter temporariamente** (referencia `uploadFile` export) |

---

## 📦 GRUPO 2: MÓDULOS CLEAN ARCHITECTURE VAZIOS (esqueletos não implementados)

### 2.1 Modules vazios (pastas sem arquivos .ts implementados)
| Pasta | Motivo | Ação |
|-------|--------|------|
| `server/src/modules/auth/application/use-cases/` | Esqueleto vazio (estrutura Clean Architecture não preenchida) | ⚠️ Manter estrutura mas remover README.md |
| `server/src/modules/auth/domain/entities/` | Esqueleto vazio | ⚠️ Manter estrutura |
| `server/src/modules/auth/domain/repositories/` | Esqueleto vazio | ⚠️ Manter estrutura |
| `server/src/modules/auth/infrastructure/` | Esqueleto vazio | ⚠️ Manter estrutura |
| `server/src/modules/auth/presentation/` | Esqueleto vazio | ⚠️ Manter estrutura |
| `server/src/modules/clients/application/` | Esqueleto vazio | ⚠️ Manter estrutura |
| `server/src/modules/clients/domain/` | Esqueleto vazio | ⚠️ Manter estrutura |
| `server/src/modules/clients/infrastructure/` | Esqueleto vazio | ⚠️ Manter estrutura |
| `server/src/modules/financial/` | Esqueleto vazio | ⚠️ Manter estrutura |
| `server/src/modules/inventory/` | Esqueleto vazio | ⚠️ Manter estrutura |
| `server/src/modules/production/` | Esqueleto vazio | ⚠️ Manter estrutura |
| `server/src/modules/products/` | Esqueleto vazio | ⚠️ Manter estrutura |
| `server/src/modules/purchases/` | Esqueleto vazio | ⚠️ Manter estrutura |
| `server/src/modules/sales/` | Esqueleto vazio | ⚠️ Manter estrutura |
| `server/src/modules/suppliers/` | Esqueleto vazio | ⚠️ Manter estrutura |
| `server/src/modules/users/` | Esqueleto vazio | ⚠️ Manter estrutura |

> **Decisão:** Os módulos Clean Architecture foram SUBSTITUÍDOS pelos controllers/services em TypeScript. Manter as pastas vazias como estrutura futura, mas remover os README.md que podem causar confusão.

### 2.2 READMEs de módulos vazios a remover
- `server/src/modules/auth/README.md`
- `server/src/modules/bom/README.md`
- `server/src/modules/clients/README.md`
- `server/src/modules/financial/README.md`
- `server/src/modules/inventory/README.md`
- `server/src/modules/production/README.md`
- `server/src/modules/products/README.md`
- `server/src/modules/purchases/README.md`
- `server/src/modules/sales/README.md`
- `server/src/modules/suppliers/README.md`
- `server/src/modules/users/README.md`

---

## 📦 GRUPO 3: DOCUMENTAÇÃO GENÉRICA OU IRRELEVANTE

### 3.1 Documentação corporativa não técnica (sem relação com o código)
| Arquivo | Motivo | Ação |
|---------|--------|------|
| `docs/administrativo/00-README.md` | Documentação de negócio não técnica | 🔵 Manter (visão geral) |
| `docs/administrativo/01-DIRETORIA.md` | Processos de diretoria (não código) | 🔵 Manter |
| `docs/administrativo/02-TI.md` | Infraestrutura de TI | 🔵 Manter |
| `docs/administrativo/03-FACILITIES.md` | Facilities (não código) | 🔵 Manter |
| `docs/comercial/00-README.md` | Visão comercial | 🔵 Manter |
| `docs/comercial/01-VENDAS.md` | Processo de vendas | 🔵 Manter |
| `docs/comercial/02-MARKETING.md` | Marketing (não código) | ❌ **Remover** (sem relação com ERP) |
| `docs/rh/01-FUNCIONARIOS.md` | RH (não implementado no código) | ❌ **Remover** (funcionalidade não existe) |
| `docs/rh/02-FOLHA_PAGAMENTO.md` | Folha (não implementado) | ❌ **Remover** |
| `docs/rh/03-BENEFICIOS.md` | Benefícios (não implementado) | ❌ **Remover** |
| `docs/seguranca_trabalho/01-SST.md` | SST (não implementado) | ❌ **Remover** |
| `docs/seguranca_trabalho/02-CIPA.md` | CIPA (não implementado) | ❌ **Remover** |
| `docs/tributario/01-REGIMES.md` | Regimes tributários | ❌ **Remover** (genérico, sem código) |
| `docs/tributario/02-ICMS_ESTADOS.md` | ICMS (genérico) | ❌ **Remover** (informação pública) |
| `docs/tributario/03-RECEITA_FEDERAL.md` | Receita Federal | ❌ **Remover** |
| `docs/juridico/01-CONTRATOS.md` | Jurídico (não código) | ❌ **Remover** |
| `docs/juridico/02-PROPRIEDADE_INTELECTUAL.md` | PI (não código) | ❌ **Remover** |
| `docs/qualidade/03-CERTIFICACOES.md` | Certificações (não código) | ❌ **Remover** |
| `docs/logistica/01-EXPEDICAO.md` | Expedição (não implementado) | ❌ **Remover** |
| `docs/suprimentos/02-COMEX.md` | Comex (não implementado) | ❌ **Remover** |

### 3.2 Documentação de análise que não reflete o estado atual
| Arquivo | Motivo | Ação |
|---------|--------|------|
| `docs/analises/01-ANALISE_PROFUNDA.md` | Análise antiga, desatualizada | ❌ **Remover** |
| `docs/analises/02-ANALISE_TERCEIRA_RODADA.md` | Análise antiga | ❌ **Remover** |
| `docs/analises/03-ANALISE_QUARTA_RODADA_FALHAS_MELHORIAS.md` | Análise antiga | ❌ **Remover** |

---

## 📦 GRUPO 4: ARQUIVOS TEMPORÁRIOS/BATS

| Arquivo | Motivo | Ação |
|---------|--------|------|
| `server/_check_types.bat` | Script temporário de diagnóstico | ❌ **Remover** |
| `server/_check_types (1).bat` | Cópia duplicada | ❌ **Remover** |
| `../../SistemaEvokAudio/ERP-Evok--Audio-LTDA/server/_check_types.bat` | Fora do projeto | ❌ **Remover** |

---

## 📦 GRUPO 5: DEPENDÊNCIAS NÃO UTILIZADAS

| Pacote | package.json | Motivo | Ação |
|--------|-------------|--------|------|
| `mongoose` | server/package.json | ORM MongoDB não usado (usamos Sequelize) | `npm uninstall mongoose --save` |
| `multer` | server/package.json | Upload manual via fs | `npm uninstall multer --save` (se uploadService.ts refatorado) |

---

## 📊 RESUMO DA LIMPEZA

| Categoria | Qtde | Impacto |
|-----------|------|---------|
| Arquivos `.js` legados | 69 | Elimina 100% de duplicação |
| READMEs de módulos vazios | 11 | Elimina confusão de documentação obsoleta |
| Documentos não técnicos | 15 | Foco apenas no que importa para operação |
| Scripts temporários | 3 | Ambiente limpo |
| Dependências não usadas | 1-2 | -5MB em node_modules |
| **TOTAL REMOÇÕES** | **~99 itens** | **Projeto ~80% mais enxuto** |

---

## 🛡️ ARQUIVOS A MANTER (confirmados)

- ✅ `server/src/config/database.ts` — Config PostgreSQL
- ✅ `server/src/config/seeds.ts` — Seeds iniciais
- ✅ Todos os 22 controllers `.ts` — Lógica de negócio
- ✅ Todas as 22 routes `.ts` — Definição de rotas
- ✅ Todos os 22 models `.ts` + `index.ts` — Entidades
- ✅ `server/src/errors/AppError.ts` + `index.ts` — Erros padronizados
- ✅ `server/src/middlewares/auth.ts` — JWT + RBAC
- ✅ `server/src/middlewares/errorHandler.ts` — Tratamento de erros
- ✅ `server/src/services/*.ts` (6+uploadService.js temporário) — Serviços
- ✅ `server/src/shared/**/*.ts` — Shared kernel
- ✅ `server/src/types/*.d.ts` — Type definitions
- ✅ `server/src/utils/validators.ts` — Validadores
- ✅ `server/index.js` — Entry point (CommonJS, mantido)
- ✅ `docs/API.md` — Documentação de API
- ✅ `docs/DATABASE.md` — Modelagem de dados
- ✅ `docs/projeto/04-USE_CASES.md` — Casos de uso (referência)
- ✅ `docs/producao/01-ENGENHARIA.md` até `06-BOM.md` — Documentação industrial
- ✅ `docs/qualidade/01-CONTROLE_QUALIDADE.md` e `02-TESTES_ACUSTICOS.md`
- ✅ `docs/logistica/02-ESTOQUE_PA.md`
- ✅ `docs/suprimentos/01-COMPRAS.md`
- ✅ `docs/patrimonio/**/*.md` — Gestão de ativos
- ✅ `docs/financeiro/**/*.md` — Financeiro
- ✅ `TODO.md` — Roadmap técnico
