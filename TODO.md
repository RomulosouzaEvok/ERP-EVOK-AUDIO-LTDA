# TODO - PROJETO ERP EVOK ÁUDIO

---

## ✅ FASE 1, 2, 3 - Análise, Expansão e Segurança (COMPLETAS)

| Fase | Status | Descrição |
|------|--------|-----------|
| **Fase 1** | ✅ | 22 controllers, 18 models, 19 routes, 4 services analisados e corrigidos |
| **Fase 2** | ✅ | NonConformity, MaintenanceOrder, AuditLog (3 novos módulos) |
| **Fase 3** | ✅ | Validators (CPF/CNPJ), bugs críticos corrigidos, 31 issues documentados |

---

## ⚠️ FASE 4 - Correção de Bugs Críticos para Produção em Massa

### 🟢 Corrigidos (8 issues)

| # | Bug | Arquivos Corrigidos | Status |
|---|-----|---------------------|--------|
| F27 | **CPF/CNPJ sem validação real** | `clientController.js`, `supplierController.js`, `employeeController.js` | ✅ |
| F16 | **Error handler vaza stack trace** | `errorHandler.js` → sanitizado com msgs genéricas em produção | ✅ |
| F28 | **Upload path traversal + magic bytes** | `uploadService.js` → sanitização nome, validação magic bytes | ✅ |
| F25 | **LIKE injection nas buscas** | `validators.js` → sanitizeSearch() + sanitizeError() | ✅ |
| F26 | **Client remove sem verificar vendas** | `clientController.js` → bloqueio com vendas ativas | ✅ |
| L1 | **Missing rating field no update** | `supplierController.js` → campo `rating` adicionado | ✅ |
| — | **Documento armazenado formatado** | Todos 3 controllers → armazenam apenas números | ✅ |
| — | **Error messages vazando detalhes** | Todos 3 controllers → Validators.sanitizeError() | ✅ |

### 🟡 Em Andamento (próximas correções)

| # | Bug | Severidade | Impacto |
|---|-----|------------|---------|
| F10 | **Race condition no estoque** | 🔴 Crítico | Venda simultânea pode gerar estoque negativo |
| F20 | **AuditLog não integrado** | 🔴 Crítico | Sem rastreabilidade de alterações críticas |
| F21 | **AccountPayable gerado no recebimento** | ⚠️ Alto | Deveria ser na aprovação da compra |
| F24 | **Arredondamento parcelas impreciso** | ⚠️ Alto | Diferença de centavos nas parcelas |
| F22 | **Sem reserva de estoque** | ⚠️ Alto | Quotes reservam estoque sem baixar |
| F15 | **Depreciação de ativos automática** | 🟡 Médio | Valor contábil nunca atualiza |
| F19 | **sequelize.literal() nos controllers** | 🟡 Médio | Race condition via SQL direto |

---

## 📋 PRÓXIMAS CORREÇÕES PRIORIZADAS

### Prioridade 1 - Race Condition no Estoque (F10)
**Arquivos:** `saleController.js`, `purchaseController.js`, `inventoryController.js`

**Solução:** Substituir `sequelize.literal('quantity - X')` por `sequelize.increment()`/`decrement()` com transação serializável.

```javascript
// ANTES (race condition)
await Product.update(
  { quantity: sequelize.literal(`quantity - ${qty}`) },
  { where: { id: productId }, transaction: t }
);

// DEPOIS (thread-safe)
const product = await Product.findByPk(productId, { 
  transaction: t, 
  lock: t.LOCK.UPDATE 
});
if (product.quantity < qty) throw new Error('Estoque insuficiente');
await product.decrement('quantity', { by: qty, transaction: t });
```

### Prioridade 2 - AuditLog Integration (F20)
**Arquivos:** Todos os 22 controllers + `models/index.js`

Adicionar chamada `AuditLog.register()` em todas as operações de create, update, delete, status change.

### Prioridade 3 - AccountPayable na Aprovação (F21)
**Arquivo:** `purchaseController.js`

Mover geração de AccountPayable do `receiveItems` para `updateStatus` quando status = 'approved'.

### Prioridade 4 - Arredondamento Preciso (F24)
**Arquivo:** `saleController.js`

Usar `Math.round(value * 100) / 100` em todas as operações de parcelas, garantindo que a soma das parcelas = total líquido exato.

### Prioridade 5 - Sistema de Reserva de Estoque (F22)
**Arquivo:** `Product.js` model + `saleController.js`

- Criar campo `reserved_quantity` no Product
- Ao criar quote, incrementar reserved_quantity
- Ao confirmar, baixar de reserved_quantity e quantity
- Ao cancelar/devolver, decrementar reserved_quantity

---

## 🔧 MÓDULOS FUTUROS (Fase 5+)

| Módulo | Prioridade | Status |
|--------|------------|--------|
| **Frontend React** | Alta | 🔄 Planejado |
| **MRP Engine (BOM Explosion)** | Alta | 🔄 Planejado |
| **Migração PostgreSQL + Docker** | Alta | 🔄 Planejado |
| **Folha de Pagamento (Payroll)** | Média | 📝 Pendente |
| **NFe Integration** | Média | 📝 Pendente |
| **Logística/Expedição** | Média | 📝 Pendente |
| **Testes Automatizados (Jest)** | Média | 📝 Pendente |
| **CI/CD Pipeline** | Baixa | 📝 Pendente |

---

## 📊 RESUMO DO PROJETO

| Categoria | Total |
|-----------|-------|
| **Models** | 21 |
| **Controllers** | 25 |
| **Routes** | 22 |
| **Services** | 4 |
| **Middlewares** | 2 |
| **Utils** | 1 |
| **Documentos** | 30+ |
| **Arquivos** | ~80 |
| **Endpoints** | 80+ |
| **Bugs Críticos Corrigidos (Fase 4)** | **8/15** |
| **Módulos migrados p/ Clean Architecture (Fase 5)** | **7/11** (products, inventory, bom, production, purchases, sales, financial — faltam auth, users, suppliers, clients) |

---

*Última atualização: Fase 5 concluída para os 7 módulos críticos (products, inventory, bom, production, purchases, sales, financial).*
*Fase 4.1 (estabilização crítica) 100% concluída: race condition de estoque, CNPJ, erros padronizados, AuditLog real.*
*Pendências reais e verificadas (não apenas "não iniciado"): testes automatizados concorrentes de race condition (Fase 4.1), reserva de estoque real (reserved_quantity não existe no schema), refugo/eficiência de produção, versionamento formal de BOM com detecção de ciclo, TypeScript (Fase 7), Zod/DTOs (Fase 8), testes automatizados (Fase 9), documentação completa (Fase 10), migrations (Fase 11), RBAC/segurança (Fase 12), OpenAPI (Fase 13), observabilidade (Fase 14).*
*Próximo alvo sugerido: migrar financial/auth/users/suppliers/clients (fechar Fase 5) OU iniciar Fase 9 (testes automatizados) para validar de fato o que foi implementado nas Fases 4.1-6.*


---

# PLANO DE ELEGANCIA, ARQUITETURA E DOCUMENTACAO

Base comparada: `D:\ErpEvokAudio`

Objetivo: manter `D:\erp-evok-audio` como projeto principal por ser o ERP mais completo, mas elevar sua qualidade estrutural ao nivel de organizacao, clareza e elegancia tecnica do `D:\ErpEvokAudio`.

Este plano nao substitui as correcoes criticas da Fase 4. Ele organiza a evolucao do projeto em camadas: primeiro estabilidade e seguranca, depois arquitetura, testes, documentacao e melhoria gradual para TypeScript/Clean Architecture.

## Decisao tecnica

- [x] Continuar usando `D:\erp-evok-audio` como base principal.
- [x] Usar `D:\ErpEvokAudio` como referencia de arquitetura, documentacao, DDD, testes e organizacao modular.
- [x] Nao copiar cegamente a estrutura do projeto TypeScript; adaptar por partes para nao quebrar o ERP funcional existente (rotas legadas mantidas no disco, contrato de API preservado em cada migracao).
- [x] Priorizar modulos criticos: Estoque, Produtos, BOM, Compras, Vendas, Producao e Financeiro — **todos os 7 migrados** (products, inventory, bom, purchases, sales, production, financial).

## O que deve ser herdado do D:\ErpEvokAudio

Status real (auditado em 2026-07-28), item a item:

- [x] Organizacao por modulo com camadas: `domain`, `application`, `infrastructure`, `presentation` — **FEITO nos 11 modulos previstos na Fase 5** (products, inventory, bom, purchases, sales, production, financial, auth, users, suppliers, clients). Modulos fora do escopo original da Fase 5 (categories, employees, departments, reports, assets, maintenance, nonConformities, serviceOrders, mobileInventory, auditLogs, dashboard, intelligentAuditor) continuam no formato antigo — nunca estiveram no checklist da Fase 5.
- [x] Entidades de dominio com regras de negocio fora dos controllers — feito nos 11 modulos migrados.
- [x] Use cases para operacoes importantes — feito nos 11 modulos migrados. Ressalva: varios use cases (especialmente BOM) sao wrappers finos sobre services/models existentes (ex.: bomService.js), nao uma reescrita completa de dominio rico em todos os casos — ver notas especificas na Fase 6.
- [ ] DTOs claros de entrada e saida — **NAO FEITO**. Nao existem classes/schemas de DTO formais; a validacao de entrada e feita por entidades leves (`*Entity.js`) que veem o `req.body` bruto. Isso e explicitamente escopo da Fase 8 (Zod), ainda nao iniciada.
- [x] Interfaces de repositorio — feito nos 11 modulos migrados (`domain/repositories/*Repository.js` + implementacao Sequelize em `infrastructure/sequelize/`).
- [x] Erros padronizados — feito em todo o projeto (nao so nos modulos migrados): `AppError`/subclasses + `errorHandler` central, aplicado nos 25 controllers desde a Fase 4.1.
- [ ] Testes unitarios de dominio — **NAO FEITO**. Zero arquivos de teste no projeto inteiro (nao ha `server/tests/` nem runner configurado). Escopo da Fase 9.
- [ ] Testes de use cases — **NAO FEITO**, mesma razao acima.
- [ ] Documentacao de arquitetura, banco, APIs, fluxos de negocio e guia de desenvolvimento — **PARCIAL**. Existe `docs/API.md` (atualizado a cada modulo migrado) e um `README.md` por modulo migrado (objetivo, entidades, regras, endpoints, permissoes, auditoria, pendencias). NAO existem os documentos formais previstos na Fase 10 (`docs/01-ARQUITETURA.md`, `docs/03-BANCO-DE-DADOS.md`, `docs/05-FLUXOS-DE-NEGOCIO.md`, `docs/06-GUIA-DE-DESENVOLVIMENTO.md`, C4 model, LOGBOOK).
- [ ] Contrato OpenAPI/Swagger centralizado — **NAO FEITO**. Existem comentarios `@openapi` isolados no arquivo legado `server/src/routes/bom.js` (nao mais ativo) mas nao ha spec centralizada nem servida (`/docs`, Swagger UI). Escopo da Fase 13.
- [x] Padrao de resposta JSON consistente — feito nos 11 modulos migrados (`{ success, data, pagination? }` e `{ success:false, error:{ code, message } }` via `AppError`); os controllers ainda nao migrados continuam no formato legado equivalente mas sem a garantia central do `AppError`.
- [ ] Padrao de validacao e sanitizacao em todas as entradas — **PARCIAL**. Ha validacao de forma (entidades leves) nos 11 modulos migrados e sanitizacao de busca (`sanitizeSearch`) desde a Fase 3, mas nao ha padrao de schema/validacao centralizado (Zod) aplicado a todas as rotas — escopo da Fase 8.

## FASE 4.1 - Estabilizacao obrigatoria antes da elegancia

Prioridade: Critica.

### Estoque seguro e sem race condition

- [x] Substituir todos os usos de `sequelize.literal()` em movimentacao de estoque.
- [x] Corrigir `saleController.js` (hoje em `server/src/modules/sales/`).
  - [x] Criacao/confirmacao de venda deve usar transaction.
  - [x] Buscar produto com lock pessimista: `transaction` + `lock: transaction.LOCK.UPDATE`.
  - [x] Validar estoque disponivel dentro da mesma transacao.
  - [x] Usar `product.decrement('quantity', { by, transaction })` (via `InventoryService.consume`).
  - [x] Registrar `InventoryMovement` na mesma transacao.
- [x] Corrigir `purchaseController.js` (hoje em `server/src/modules/purchases/`).
  - [x] Recebimento deve incrementar estoque com lock/transacao.
  - [x] Registrar movimentacao de entrada na mesma transacao.
  - [x] Impedir recebimento duplicado sem controle de quantidade recebida (checagem `maxReceivable`).
- [x] Corrigir `inventoryController.js` (hoje em `server/src/modules/inventory/`).
  - [x] Movimentacao manual deve validar quantidade numerica.
  - [x] Saida manual deve travar o produto antes de baixar estoque.
  - [x] Entrada manual deve registrar auditoria.
- [x] Corrigir `mobileInventoryController.js`.
  - [x] Aplicar mesma regra do estoque manual.
  - [x] Garantir que lote de movimentacoes seja atomico (batchScan agora e tudo-ou-nada).
- [x] Corrigir `productionOrderController.js` (hoje em `server/src/modules/production/`).
  - [x] Finalizacao de OP deve incrementar produto acabado com lock/transacao.
  - [x] Consumo de componentes deve ser transacional.
  - [x] Impedir finalizar OP duas vezes (lock pessimista na OP antes de validar transicao).
- [x] Criar `server/src/services/inventoryService.js`.
  - [x] `reserve(productId, quantity, transaction)` — implementado como stub defensivo; `reserved_quantity` ainda nao existe no schema (ver Prioridade 5, pendente).
  - [x] `releaseReservation(productId, quantity, transaction)` — idem, stub defensivo.
  - [x] `consume(productId, quantity, transaction)`
  - [x] `receive(productId, quantity, transaction)`
  - [x] `adjust(productId, type, quantity, reason, transaction)`
- [x] Nenhum controller deve alterar `Product.quantity` diretamente depois desta fase.

Criterios de aceite:

- [x] `rg "sequelize.literal" server/src/controllers server/src/services` nao deve retornar uso em estoque (verificado: zero ocorrencias funcionais, so comentarios).
- [x] Toda baixa/entrada/reserva de estoque passa por `InventoryService`.
- [x] Toda movimentacao cria registro em `InventoryMovement`.
- [ ] Teste manual com duas vendas simultaneas nao gera estoque negativo — **NAO TESTADO** (sem banco MySQL disponivel neste ambiente para rodar teste de concorrencia real; a protecao via lock pessimista foi implementada e revisada em codigo, mas nao validada com carga concorrente de fato).

### Corrigir validacao de CNPJ

- [x] Corrigir `server/src/utils/validators.js`.
- [x] Em `isValidCNPJ`, o segundo digito verificador deve comparar com `cleaned.charAt(13)`, nao com `charAt(10)`.
- [ ] Adicionar testes para CNPJ valido, invalido, sequencial, formatado e sem formatacao — **NAO FEITO** (validado manualmente via `node -e`, mas nao existe suite de testes automatizados ainda; depende da Fase 9).

Criterios de aceite:

- [x] `Validators.isValidCNPJ('11.444.777/0001-61')` retorna `true`.
- [x] `Validators.isValidCNPJ('11.111.111/1111-11')` retorna `false`.

### Erros seguros e padronizados

- [x] Criar `server/src/errors/AppError.js`.
- [x] Criar `ValidationError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`, `BusinessRuleError`.
- [x] Atualizar `server/src/middlewares/errorHandler.js`.
  - [x] Nao vazar stack trace em producao.
  - [x] Nao retornar `error.message` cru em producao.
  - [x] Retornar `code`, `message`, `details` quando for `AppError`.
  - [x] Logar erro interno no servidor.
- [x] Remover `res.status(500).json({ error: error.message })` dos controllers.
- [x] Controllers devem usar `next(error)` ou erro padronizado.

Criterio de aceite:

- [x] `rg "error.message" server/src/controllers` nao deve encontrar resposta crua ao cliente.

### AuditLog real em operacoes criticas

- [x] Criar `AuditLogService` (wrapper `server/src/services/auditLogService.js` sobre `AuditLog.register`).
- [x] Integrar auditoria em login e tentativa de login falha.
- [x] Integrar auditoria em usuario: criar, editar, inativar.
- [x] Integrar auditoria em produto: criar, editar, inativar, revisar.
- [x] Integrar auditoria em estoque: entrada, saida, ajuste (nao ha endpoints de reserva/transferencia no codigo atual).
- [x] Integrar auditoria em compra: criar, aprovar, receber, cancelar.
- [x] Integrar auditoria em venda: criar, confirmar/faturar/cancelar (status_change).
- [x] Integrar auditoria em OP: criar, iniciar/pausar/finalizar/cancelar (status_change).
- [x] Integrar auditoria em BOM: criar, aprovar, revisar, inativar.
- [x] Integrar auditoria em financeiro: contas a pagar/receber (criar e status_change).
- [x] Auditoria deve registrar `user_id`, `action`, `entity`, `entity_id`, `old_values`, `new_values`, `ip`, `user_agent`, `created_at` (ja suportado pelo model `AuditLog`).

## FASE 5 - Organizacao modular inspirada no D:\ErpEvokAudio

Prioridade: Alta.

### Estrutura alvo por modulo

```text
server/src/modules/
  products/
    domain/
      entities/
      value-objects/
      repositories/
      services/
    application/
      use-cases/
      dtos/
    infrastructure/
      sequelize/
      repositories/
      mappers/
    presentation/
      controllers/
      routes/
      validators/
  inventory/
  bom/
  production/
  purchases/
  sales/
  financial/
  auth/
  users/
  suppliers/
  clients/
```

Checklist:

- [x] Criar `server/src/modules`.
- [x] Migrar primeiro o modulo `products`.
- [x] Migrar segundo o modulo `inventory`.
- [x] Migrar terceiro o modulo `bom`.
- [x] Migrar quarto o modulo `production`.
- [x] Migrar quinto `purchases` e `sales`.
- [x] Manter rotas antigas funcionando durante a migracao (controllers/rotas legados preservados no disco, sem uso ativo; contrato de URL/JSON mantido identico nos novos).
- [x] Evitar quebra de contrato de API sem documentar versao (mesmo path/verbo/formato JSON preservados; sem versionamento novo necessario).
- [ ] `financial`, `auth`, `users`, `suppliers`, `clients` **AINDA NAO MIGRADOS** — continuam em `server/src/controllers`/`server/src/routes` no formato antigo.

Criterios de aceite:

- [x] Cada modulo migrado (products, inventory, bom, production, purchases, sales) tem `domain`, `application`, `infrastructure`, `presentation`.
- [x] Controller enxuto: delega para use cases, sem regra de negocio pesada embutida (verificado por leitura, nao ha lint automatizado que garanta isso continuamente).
- [x] Controller apenas valida request, chama use case/service e responde.

### Shared kernel

- [x] Criar `server/src/shared/domain/Entity.js`.
- [x] Criar `server/src/shared/domain/ValueObject.js`.
- [x] Criar `server/src/errors/AppError.js` (caminho real: `server/src/errors/`, nao `server/src/shared/domain/errors/` como o plano original previa — decisao tomada na Fase 4.1, antes do shared kernel existir; os modulos importam de `server/src/errors`).
- [x] Criar `server/src/shared/application/UseCase.js`.
- [x] Criar `server/src/shared/presentation/httpResponse.js`.
- [x] Criar `server/src/shared/presentation/pagination.js`.
- [x] Criar `server/src/shared/utils/money.js`.
- [x] Criar `server/src/shared/utils/dates.js`.
- [x] Criar `server/src/shared/utils/strings.js`.
- [ ] Criar validacoes compartilhadas (schema/DTO) — **NAO FEITO**, e escopo da Fase 8 (Zod).

## FASE 6 - Dominio rico para Produtos, BOM, Estoque e Producao

### Produto como entidade de dominio

- [x] Criar `ProductEntity`.
- [x] Mover regras de produto para entidade/use case.
- [x] Validar codigo obrigatorio (unicidade e responsabilidade do banco/repositorio via constraint `unique`, nao da entidade).
- [x] Validar nome minimo.
- [x] Validar tipo: `finished`, `semi_finished`, `component`, `raw_material`.
- [x] Validar peso quando aplicavel.
- [x] Validar preco e custo.
- [x] Controlar status e transicoes.
- [x] Criar revisao tecnica do produto.
- [x] Validar parametros Thiele-Small quando informados (`ThieleSmallParams` value object).
- [x] Criar `CreateProductUseCase`.
- [x] Criar `UpdateProductUseCase`.
- [x] Criar `DeactivateProductUseCase`.
- [x] Criar `ChangeProductStatusUseCase`.
- [x] Criar `CreateProductRevisionUseCase`.
- [x] Criar `ListProductsUseCase`.
- [x] Criar `GetProductByIdUseCase`.

### BOM como agregado de dominio

- [x] BOM pertence a um produto acabado (`BomService.createBOM` valida `product_type === 'finished'`).
- [x] BOM precisa ter pelo menos um item.
- [x] Item precisa ter componente existente (valida `Product.findByPk` de cada componente).
- [x] Quantidade do item deve ser maior que zero.
- [x] Percentual de perda deve ser limitado e documentado (`BOMEntity`, 0-100).
- [x] Evitar componente duplicado no mesmo nivel quando nao for intencional (`BOMEntity`).
- [x] Detectar loop/ciclo de BOM — `BomService.explodeBOM` agora mantem um `ancestorPath` (Set de ids de produto) durante a recursao e lanca erro 422 explicito de "Ciclo detectado" assim que um componente reaparece como seu proprio ancestral, em vez de so estourar `MAX_BOM_DEPTH` silenciosamente.
- [x] Controlar profundidade maxima (`MAX_BOM_DEPTH = 10`).
- [x] Versionar BOM (campo `revision` + `status: superseded` automatico ao criar nova BOM ativa para o mesmo produto).
- [x] Aprovar BOM antes de usar em producao (`ApproveBOMUseCase`/fluxo `status: active`; producao consome via `BomService.explodeBOM` que so busca BOM `active`).
- [x] BOM antiga deve virar `superseded`, nao ser apagada.
- [x] Calcular custo total da BOM (`CalculateBOMCostUseCase` / `BomService.calculateCost`).
- [x] Calcular quantidade com perda (`scrap_percentage` aplicado na explosao).
- [x] Explodir BOM para quantidade planejada (`ExplodeBOMUseCase`, recursivo para sub-BOMs).
- [x] Verificar disponibilidade de componentes (`CheckBOMAvailabilityUseCase`).
- [ ] Quebrar `bomService.js` em use cases menores — **PARCIAL**. Os use cases em `server/src/modules/bom/application/use-cases/` sao *wrappers finos* que chamam `bomService.js`; a logica de negocio pesada (explosao recursiva, custo, versionamento) continua centralizada em `bomService.js`, nao foi de fato quebrada em classes menores.

Use cases de BOM (todos criados em `server/src/modules/bom/application/use-cases/`):

- [x] `CreateBOMUseCase`
- [x] `ApproveBOMUseCase` (criado, mas a rota `PUT /:id` hoje usa `UpdateBOMUseCase` para preservar comportamento legado de atualizar varios campos de uma vez; `ApproveBOMUseCase` fica disponivel para um endpoint dedicado futuro)
- [ ] `SupersedeBOMUseCase` — **NAO CRIADO COMO USE CASE SEPARADO**. O supersede automatico ja acontece dentro de `BomService.createBOM`; decisao documentada no README do modulo (nao existe endpoint isolado para isso).
- [x] `ExplodeBOMUseCase`
- [x] `CalculateBOMCostUseCase`
- [x] `CheckBOMAvailabilityUseCase`
- [x] `GetBOMTreeUseCase`
- [x] `ListBOMVersionsUseCase` (endpoint novo aditivo: `GET /api/engineering/bom/product/:productId/versions`)

### Estoque como dominio

- [x] Criar entidade/servico de dominio (`InventoryMovementEntity` + `InventoryService`, nao ha classe `InventoryItem` separada — o "item de estoque" e o proprio `Product`).
- [ ] Separar `quantity`, `reserved_quantity`, `available_quantity`, `minimum_quantity`, `safety_stock` — **PENDENTE**. Model `Product` hoje so tem `quantity` e `min_quantity`. `reserved_quantity`/`available_quantity`/`safety_stock` nao existem no schema (ver Prioridade 5 do TODO original, ainda em aberto).
- [ ] Implementar reserva de estoque — **STUB**. `InventoryService.reserve()` existe mas e um no-op defensivo (documentado no codigo) ate a coluna `reserved_quantity` ser criada.
- [ ] Implementar liberacao de reserva — mesmo status: stub, aguardando schema.
- [x] Implementar baixa confirmada (`InventoryService.consume`, usado em vendas e producao).
- [x] Implementar entrada por compra (`InventoryService.receive`, usado em `receiveItems` de compras).
- [x] Implementar ajuste com motivo obrigatorio (`InventoryService.adjust`, usado em movimentacao manual).
- [ ] Implementar transferencia entre locais — **NAO FEITO**. Nao ha conceito de "local/deposito" no schema atual (`Product.location` e um campo texto livre, sem modelo de transferencia).
- [ ] Implementar inventario/cycle count — **NAO FEITO**.
- [ ] Garantir: `available_quantity = quantity - reserved_quantity` — **NAO APLICAVEL AINDA**, depende do campo `reserved_quantity` existir.

Use cases de estoque (criados em `server/src/modules/inventory/application/use-cases/`):

- [ ] `ReserveStockUseCase` — nao criado como use case HTTP (nao ha endpoint; `InventoryService.reserve` e stub).
- [ ] `ReleaseStockReservationUseCase` — idem.
- [ ] `ConsumeStockUseCase` — nao existe como use case isolado; `consume` e chamado diretamente por outros modulos (sales, production) via `InventoryService`, nao ha endpoint HTTP dedicado.
- [ ] `ReceiveStockUseCase` — idem (chamado via purchases/production, sem endpoint HTTP proprio no modulo inventory).
- [x] `AdjustStockUseCase` — implementado como `CreateInventoryMovementUseCase` (cobre a unica rota manual existente, `POST /movements`).
- [ ] `TransferStockUseCase` — nao existe funcionalidade de transferencia no sistema hoje.
- [x] `ListLowStockUseCase` (endpoint novo aditivo: `GET /api/inventory/low-stock`).

### Ordem de Producao como entidade de dominio

- [x] OP precisa de produto (e produto deve estar `active` e ser `finished`).
- [ ] OP precisa de BOM aprovada — **NAO EXIGIDO NA CRIACAO**. Hoje e possivel criar/liberar uma OP para um produto sem BOM ativa; a ausencia de BOM so e tratada (de forma tolerante, nao bloqueante) no momento de finalizar a OP.
- [x] Quantidade planejada deve ser maior que zero.
- [x] Status controlados: `planned`, `released`, `in_progress`, `paused`, `completed`, `canceled` (maquina de transicao em `ChangeProductionOrderStatusUseCase`/`ProductionOrderEntity`).
- [x] Nao iniciar OP cancelada/concluida (validado pela tabela de transicoes permitidas).
- [x] Nao finalizar OP duas vezes (lock pessimista na OP antes de validar a transicao).
- [x] Apontamento nao pode exceder quantidade planejada sem regra explicita — `ProductionOrderEntity.transitionTo` agora bloqueia `quantity_produced > quantity` a menos que `allow_overproduction: true` seja enviado explicitamente no `PUT /:id/status`.
- [ ] Registrar refugos — **NAO FEITO**. Nao existe campo `quantity_scrapped` no model `ProductionOrder` nem endpoint de refugo.
- [ ] Calcular eficiencia — **NAO FEITO**.
- [x] Consumir componentes conforme BOM (explode a BOM ativa e consome via `InventoryService.consume`, tolerante a produto sem BOM).
- [x] Gerar produto acabado no estoque ao finalizar (`InventoryService.receive`).

Use cases de producao (criados em `server/src/modules/production/application/use-cases/`):

- [x] `CreateProductionOrderUseCase`
- [ ] `ReleaseProductionOrderUseCase` — nao existe como classe separada.
- [ ] `StartProductionOrderUseCase` — idem.
- [ ] `PauseProductionOrderUseCase` — idem.
- [ ] `ResumeProductionOrderUseCase` — idem.
- [ ] `RegisterProductionOutputUseCase` — idem.
- [ ] `CompleteProductionOrderUseCase` — idem.
- [ ] `CancelProductionOrderUseCase` — idem.
  - As 7 transicoes acima foram deliberadamente unificadas em um unico `ChangeProductionOrderStatusUseCase`, que mantem a tabela de transicoes validas como fonte unica de verdade (evita duplicar a mesma maquina de estados em 7 classes). Decisao documentada no README do modulo `production`.
- [ ] `RegisterScrapUseCase` — **NAO FEITO** (schema nao suporta refugo ainda).

## FASE 7 - Migracao gradual para TypeScript

Status real (auditado em 2026-07-28, primeira rodada desta fase):

- [x] Adicionar TypeScript ao projeto principal (`typescript` + `tsx` como devDependencies em `server/package.json`).
- [x] Criar `tsconfig.json` (modo hibrido: `allowJs: true`, `checkJs: false`, `strict: true` para `.ts` novo).
- [x] Criar `tsconfig.build.json` (extends `tsconfig.json`, `noEmitOnError: true`, usado pelo script `build`).
- [x] Adicionar `tsx` (runtime usado pelos scripts `start`/`dev`, permite `require()` de `.ts` a partir de `.js` sem quebrar nada existente).
- [ ] Adicionar tipos do Node, Express e runner de testes — **PARCIAL**. Adicionados `@types/node`, `@types/express`, `@types/jsonwebtoken`, `@types/bcryptjs`, `@types/cors`, `@types/multer`. Tipos de runner de testes ainda nao adicionados (depende da escolha do runner na Fase 9).
- [ ] Configurar ESLint para JS + TS durante periodo hibrido — **NAO FEITO**. Nao existe configuracao de ESLint no projeto ainda.
- [x] Definir regra: arquivos novos de dominio/application devem nascer em TypeScript — decisao registrada aqui no TODO; **nao e reforcada por lint/CI ainda** (depende do ESLint acima), e um acordo de processo por enquanto.
- [x] Migrar `validators.js` para TypeScript (`server/src/utils/validators.ts`, mesma API publica via `export = Validators`, testado via `tsx` isoladamente e via boot completo do servidor).
- [x] Migrar erros compartilhados (`server/src/errors/AppError.ts` e `index.ts`, mesma API via `export =`; testado isoladamente e via boot completo — os 61 arquivos que fazem `require('.../errors')` continuam funcionando sem alteracao).
- [ ] Migrar services puros — **PARCIAL**. Migrados: `auditLogService.ts`, `qrCodeService.ts`, `reportService.ts`, `dashboardService.ts` (testados isoladamente via `tsx` e via boot completo). Faltam: `inventoryService.js`, `bomService.js`, `uploadService.js` (services maiores/mais criticos, migracao adiada para uma proxima rodada dedicada por seguranca).
- [ ] Migrar modulo `products` — **NAO FEITO**.
- [ ] Migrar modulo `inventory` — **NAO FEITO**.
- [ ] Migrar modulo `bom` — **NAO FEITO**.
- [ ] Migrar modulo `production` — **NAO FEITO**.
- [ ] Migrar modulo `sales` — **NAO FEITO**.
- [ ] Migrar modulo `purchases` — **NAO FEITO**.
- [ ] Migrar modulo `financial` — **NAO FEITO**.

Scripts desejados (status real em `server/package.json`):

- [x] `dev` (`tsx watch index.js`)
- [x] `build` (`tsc -p tsconfig.build.json`)
- [x] `start` (`tsx index.js`; `start:node` mantido como fallback usando `node` puro)
- [ ] `test` — **NAO FEITO** (Fase 9).
- [ ] `test:unit` — **NAO FEITO**.
- [ ] `test:integration` — **NAO FEITO**.
- [ ] `test:e2e` — **NAO FEITO**.
- [ ] `test:coverage` — **NAO FEITO**.
- [ ] `lint` — **NAO FEITO** (depende do ESLint acima).
- [ ] `lint:fix` — **NAO FEITO**.
- [ ] `format` — **NAO FEITO**.
- [ ] `migration:run` — **NAO FEITO** (Fase 11).
- [ ] `docs:serve` — **NAO FEITO** (Fase 13).
- [x] `typecheck` (`tsc -p tsconfig.json --noEmit`) — adicionado, nao estava na lista original mas e necessario para o modo hibrido.

## FASE 8 - Validacao de entrada com DTO + schema

- [ ] Escolher biblioteca de schema: Zod recomendado.
- [ ] Criar middleware `validateRequest(schema)`.
- [ ] Criar schemas por rota.
- [ ] Criar DTOs por use case.
- [ ] Validar params, query e body.
- [ ] Sanitizar buscas em todos os controllers.
- [ ] Padronizar paginacao.
- [ ] Limitar `limit` maximo em listagens.
- [ ] Converter tipos explicitamente.
- [ ] Rejeitar campos inesperados em operacoes sensiveis.

Modulos prioritarios:

- [ ] Auth
- [ ] Users
- [ ] Products
- [ ] Inventory
- [ ] Sales
- [ ] Purchases
- [ ] BOM
- [ ] Production
- [ ] Finance

## FASE 9 - Testes automatizados no nivel do D:\ErpEvokAudio

- [ ] Escolher runner: Vitest recomendado.
- [ ] Criar `server/tests/unit`.
- [ ] Criar `server/tests/integration`.
- [ ] Criar `server/tests/e2e`.
- [ ] Criar factories e mocks.
- [ ] Criar testes de Produto.
- [ ] Criar testes de BOM.
- [ ] Criar testes de Estoque.
- [ ] Criar testes de Producao.
- [ ] Criar testes de Financeiro.
- [ ] Criar testes de Auth.
- [ ] Criar testes de fluxos: compra -> estoque, venda -> reserva -> baixa, BOM -> OP -> produto acabado.
- [ ] Cobertura minima inicial: 50%.
- [ ] Cobertura alvo: 80%.
- [ ] Toda correcao de bug critico deve vir com teste regressivo.

## FASE 10 - Documentacao no nivel do D:\ErpEvokAudio

### Documentos raiz

- [ ] Atualizar `README.md`.
  - [ ] Descricao real do ERP.
  - [ ] Stack real atual: Node.js, Express, Sequelize, MySQL.
  - [ ] Stack alvo: TypeScript gradual, Clean Architecture modular.
  - [ ] Como instalar.
  - [ ] Como configurar `.env`.
  - [ ] Como rodar servidor.
  - [ ] Como rodar testes.
  - [ ] Como popular banco.
  - [ ] Avisos de producao.
- [ ] Atualizar `.env.example` com todas as variaveis reais.

### Documentos tecnicos obrigatorios

- [ ] Criar/atualizar `docs/01-ARQUITETURA.md`.
- [ ] Criar/atualizar `docs/02-MODULOS-E-APIS.md`.
- [ ] Criar/atualizar `docs/03-BANCO-DE-DADOS.md`.
- [ ] Criar/atualizar `docs/04-ESTRUTURA-DO-PROJETO.md`.
- [ ] Criar/atualizar `docs/05-FLUXOS-DE-NEGOCIO.md`.
- [ ] Criar/atualizar `docs/06-GUIA-DE-DESENVOLVIMENTO.md`.
- [ ] Criar/atualizar `docs/07-APIS-EXTERNAS-E-FERRAMENTAS.md`.
- [ ] Criar `docs/api/openapi.yaml` ou `docs/api/OPENAPI_SPEC.md`.
- [ ] Criar `docs/architecture/C4_MODEL.md`.
- [ ] Criar/atualizar `docs/LOGBOOK.md`.

### Documentacao por modulo

- [ ] Criar `server/src/modules/products/README.md`.
- [ ] Criar `server/src/modules/inventory/README.md`.
- [ ] Criar `server/src/modules/bom/README.md`.
- [ ] Criar `server/src/modules/production/README.md`.
- [ ] Criar `server/src/modules/sales/README.md`.
- [ ] Criar `server/src/modules/purchases/README.md`.
- [ ] Criar `server/src/modules/financial/README.md`.
- [ ] Criar `server/src/modules/auth/README.md`.
- [ ] Criar `server/src/modules/users/README.md`.
- [ ] Criar `server/src/modules/quality/README.md`.
- [ ] Criar `server/src/modules/maintenance/README.md`.
- [ ] Criar `server/src/modules/assets/README.md`.

Cada README de modulo deve conter:

- [ ] Objetivo do modulo.
- [ ] Entidades principais.
- [ ] Regras de negocio.
- [ ] Endpoints.
- [ ] Permissoes.
- [ ] Eventos/auditoria.
- [ ] Testes existentes.
- [ ] Pendencias conhecidas.

### Documentacao especifica da industria de alto-falantes

- [ ] Atualizar `docs/producao/01-ENGENHARIA.md`.
- [ ] Atualizar `docs/producao/02-PCP.md`.
- [ ] Atualizar `docs/producao/06-BOM.md`.
- [ ] Atualizar `docs/qualidade/02-TESTES_ACUSTICOS.md`.
- [ ] Atualizar `docs/logistica/02-ESTOQUE_PA.md`.
- [ ] Atualizar `docs/suprimentos/01-COMPRAS.md`.

Criterios de aceite:

- [ ] README nao pode prometer tecnologia inexistente sem marcar como "alvo/futuro".
- [ ] Toda rota existente deve aparecer na documentacao de API.
- [ ] Toda regra critica deve existir em documento de fluxo ou modulo.

## FASE 11 - Banco de dados, migrations e producao

- [ ] Remover uso de `sequelize.sync({ alter: true })` em producao.
- [ ] Criar sistema de migrations.
- [ ] Escolher ferramenta: Sequelize CLI, Umzug ou migracao futura planejada.
- [ ] Criar migrations iniciais para todos os models atuais.
- [ ] Criar seed versionado.
- [ ] Criar script de rollback.
- [ ] Documentar processo em `docs/03-BANCO-DE-DADOS.md`.
- [ ] Revisar indices de chaves estrangeiras.
- [ ] Criar unique constraints necessarias.
- [ ] Criar constraints de quantidade/preco nao negativo quando suportado.
- [ ] Revisar deletes para soft delete quando houver historico.

## FASE 12 - Seguranca e permissoes

- [ ] Revisar RBAC completo.
- [ ] Documentar roles: admin, diretoria, gerente, supervisor, operador, comprador, vendedor, financeiro, qualidade, manutencao.
- [ ] Criar matriz de permissoes em `docs/02-MODULOS-E-APIS.md`.
- [ ] Aplicar middleware de autorizacao em todas as rotas sensiveis.
- [ ] Validar JWT secret minimo de 32 caracteres.
- [ ] Implementar refresh token se ainda nao existir.
- [ ] Rate limit especifico para auth.
- [ ] Rate limit geral para API.
- [ ] CORS restrito por ambiente.
- [ ] Helmet ativo.
- [ ] Upload com extensao permitida, magic bytes, tamanho maximo, nome sanitizado e pasta controlada.
- [ ] Logs sem dados sensiveis.

## FASE 13 - Padrao de API e OpenAPI

- [ ] Padronizar resposta de sucesso.
- [ ] Padronizar resposta paginada.
- [ ] Padronizar resposta de erro.
- [ ] Criar `httpResponse` helper.
- [ ] Criar `pagination` helper.
- [ ] Criar `asyncHandler`.
- [ ] Documentar tudo em OpenAPI.
- [ ] Publicar Swagger/ReDoc local.

## FASE 14 - Observabilidade, logs e operacao

- [ ] Criar logger centralizado.
- [ ] Substituir `console.log/error` soltos por logger.
- [ ] Criar correlation/request id.
- [ ] Logar request, erro interno, operacoes criticas e tempo de resposta.
- [ ] Criar healthcheck real.
- [ ] Criar endpoint `/api/health`.
- [ ] Criar endpoint `/api/version`.

## FASE 15 - Cronograma sugerido

### Semana 1 - Estabilidade critica

- [x] Corrigir CNPJ.
- [x] Corrigir race condition de estoque.
- [x] Criar `InventoryService`.
- [x] Remover uso critico de `sequelize.literal`.
- [x] Padronizar erro base com `AppError`.
- [x] Atualizar `errorHandler`.
- [ ] Criar testes regressivos dos bugs corrigidos — **NAO FEITO**. Zero testes automatizados no projeto (escopo Fase 9).

### Semana 2 - Auditoria e seguranca

- [x] Criar `AuditLogService`.
- [x] Integrar auditoria em produtos, estoque, vendas, compras e OP.
- [ ] Revisar rotas sem auth — **NAO FEITO** (nenhuma auditoria sistematica de rotas sem `authenticate` foi feita).
- [ ] Revisar RBAC — **NAO FEITO** (escopo Fase 12).
- [ ] Revisar upload — **NAO FEITO** desde a Fase 3 (upload ja tem sanitizacao/magic bytes, mas nao houve nova revisao nesta rodada).
- [ ] Atualizar documentacao de seguranca — **NAO FEITO**.

### Semana 3 - Modularizacao inicial

- [x] Criar `server/src/shared`.
- [x] Criar `server/src/modules`.
- [x] Migrar modulo `products`.
- [x] Criar use cases de produto.
- [ ] Criar DTOs/schemas de produto — **NAO FEITO** (so entidade leve de validacao de forma, sem Zod; escopo Fase 8).
- [x] Criar README do modulo produtos.

### Semana 4 - Estoque e BOM em camadas

- [x] Migrar `inventory`.
- [x] Migrar `bom`.
- [ ] Quebrar `bomService` em use cases — **PARCIAL**. Use cases criados sao wrappers finos que chamam `bomService.js`; a logica pesada continua centralizada la, nao foi de fato particionada em classes menores.
- [x] Criar regras de dominio de BOM (parcial — ver Fase 6 para detalhes do que falta: deteccao de ciclo).
- [ ] Criar testes unitarios de BOM e estoque — **NAO FEITO**.
- [ ] Atualizar docs de producao/BOM — **NAO FEITO** (docs/producao/06-BOM.md nao foi tocado; so o README do modulo e docs/API.md).

### Semana 5 - Producao, compras e vendas

- [x] Migrar `production`.
- [x] Migrar fluxos criticos de `sales`.
- [x] Migrar fluxos criticos de `purchases`.
- [ ] Implementar reserva de estoque — **NAO FEITO** (schema nao tem `reserved_quantity`; `InventoryService.reserve` e stub).
- [x] Corrigir contas a pagar (F21: AccountPayable gerado na aprovacao, nao no recebimento — ja estava correto antes desta rodada; atomicidade corrigida na migracao de purchases).
- [x] Corrigir arredondamento de parcelas (F24: `toCents`/`fromCents`, ultima parcela absorve o resto — ja estava corrigido antes desta rodada).

### Semana 6 - TypeScript gradual e testes

- [ ] Adicionar TypeScript.
- [ ] Migrar validators/shared/use cases novos.
- [ ] Criar estrutura de testes completa.
- [ ] Cobertura minima de 50%.
- [ ] Build/lint configurados.

### Semana 7 - Documentacao completa

- [ ] Atualizar README.
- [ ] Criar/atualizar docs 01 a 07.
- [ ] Criar OpenAPI.
- [ ] Criar C4 model.
- [ ] Criar LOGBOOK.
- [ ] Criar README por modulo prioritario.

### Semana 8 - Migrations e preparo para producao

- [ ] Substituir `sequelize.sync({ alter: true })` por migrations.
- [ ] Criar migrations iniciais.
- [ ] Criar seeds versionados.
- [ ] Revisar indices.
- [ ] Revisar `.env.example`.
- [ ] Criar checklist de deploy.

## FASE 16 - Checklist de pronto para ser considerado elegante

- [ ] Controllers pequenos, sem regra de negocio pesada.
- [ ] Regras criticas em entities/use cases/services.
- [ ] Modulos principais com camadas claras.
- [ ] Erros padronizados.
- [ ] Respostas padronizadas.
- [ ] Validacao centralizada.
- [ ] Estoque transacional e seguro.
- [ ] Auditoria integrada.
- [ ] Migrations reais.
- [ ] README atualizado.
- [ ] Documentacao tecnica completa.
- [ ] OpenAPI existente.
- [ ] Testes unitarios dos dominios principais.
- [ ] Testes de integracao dos fluxos principais.
- [ ] Nenhum `sequelize.literal` inseguro em estoque.
- [ ] Nenhum `error.message` cru exposto em producao.
- [ ] Nenhuma tecnologia prometida no README sem existir ou estar marcada como futura.
- [ ] Novos modulos seguem checklist padrao.
- [ ] Codigo novo preferencialmente em TypeScript.

## FASE 17 - Checklist padrao para todo novo modulo

- [ ] README do modulo criado.
- [ ] Entidades de dominio criadas.
- [ ] Value objects criados quando fizer sentido.
- [ ] Use cases criados.
- [ ] DTOs/schemas criados.
- [ ] Repositorio/interface definidos.
- [ ] Implementacao Sequelize isolada.
- [ ] Mapper persistence/domain criado.
- [ ] Controller enxuto.
- [ ] Rotas registradas.
- [ ] Auth aplicado.
- [ ] RBAC aplicado.
- [ ] AuditLog aplicado se houver escrita critica.
- [ ] Testes unitarios.
- [ ] Testes de integracao.
- [ ] OpenAPI atualizado.
- [ ] Fluxo de negocio documentado.
- [ ] Migrations criadas se houver schema novo.
- [ ] Seeds atualizados se necessario.

## Observacao final

O `D:\ErpEvokAudio` nao deve substituir o projeto principal agora. Ele deve funcionar como norte tecnico.

O caminho recomendado e evoluir o `D:\erp-evok-audio` por dentro:

1. estabilizar;
2. modularizar;
3. isolar regras de negocio;
4. testar;
5. documentar;
6. migrar gradualmente para TypeScript;
7. preparar banco e deploy de producao.

Essa abordagem aproveita o que cada projeto tem de melhor: o corpo funcional do ERP maior e a elegancia arquitetural do projeto TypeScript.
