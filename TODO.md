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

---

*Última atualização: Fase 4 - Correção de Bugs Críticos*
*8 de 15 bugs críticos corrigidos (53%)*
*Próximo alvo: Race condition no estoque*


---

# PLANO DE ELEGANCIA, ARQUITETURA E DOCUMENTACAO

Base comparada: `D:\ErpEvokAudio`

Objetivo: manter `D:\erp-evok-audio` como projeto principal por ser o ERP mais completo, mas elevar sua qualidade estrutural ao nivel de organizacao, clareza e elegancia tecnica do `D:\ErpEvokAudio`.

Este plano nao substitui as correcoes criticas da Fase 4. Ele organiza a evolucao do projeto em camadas: primeiro estabilidade e seguranca, depois arquitetura, testes, documentacao e melhoria gradual para TypeScript/Clean Architecture.

## Decisao tecnica

- [x] Continuar usando `D:\erp-evok-audio` como base principal.
- [x] Usar `D:\ErpEvokAudio` como referencia de arquitetura, documentacao, DDD, testes e organizacao modular.
- [ ] Nao copiar cegamente a estrutura do projeto TypeScript; adaptar por partes para nao quebrar o ERP funcional existente.
- [ ] Priorizar modulos criticos: Estoque, Produtos, BOM, Compras, Vendas, Producao e Financeiro.

## O que deve ser herdado do D:\ErpEvokAudio

- [ ] Organizacao por modulo com camadas: `domain`, `application`, `infrastructure`, `presentation`.
- [ ] Entidades de dominio com regras de negocio fora dos controllers.
- [ ] Use cases para operacoes importantes.
- [ ] DTOs claros de entrada e saida.
- [ ] Interfaces de repositorio.
- [ ] Erros padronizados.
- [ ] Testes unitarios de dominio.
- [ ] Testes de use cases.
- [ ] Documentacao de arquitetura, banco, APIs, fluxos de negocio e guia de desenvolvimento.
- [ ] Contrato OpenAPI/Swagger centralizado.
- [ ] Padrao de resposta JSON consistente.
- [ ] Padrao de validacao e sanitizacao em todas as entradas.

## FASE 4.1 - Estabilizacao obrigatoria antes da elegancia

Prioridade: Critica.

### Estoque seguro e sem race condition

- [ ] Substituir todos os usos de `sequelize.literal()` em movimentacao de estoque.
- [ ] Corrigir `saleController.js`.
  - [ ] Criacao/confirmacao de venda deve usar transaction.
  - [ ] Buscar produto com lock pessimista: `transaction` + `lock: transaction.LOCK.UPDATE`.
  - [ ] Validar estoque disponivel dentro da mesma transacao.
  - [ ] Usar `product.decrement('quantity', { by, transaction })`.
  - [ ] Registrar `InventoryMovement` na mesma transacao.
- [ ] Corrigir `purchaseController.js`.
  - [ ] Recebimento deve incrementar estoque com lock/transacao.
  - [ ] Registrar movimentacao de entrada na mesma transacao.
  - [ ] Impedir recebimento duplicado sem controle de quantidade recebida.
- [ ] Corrigir `inventoryController.js`.
  - [ ] Movimentacao manual deve validar quantidade numerica.
  - [ ] Saida manual deve travar o produto antes de baixar estoque.
  - [ ] Entrada manual deve registrar auditoria.
- [ ] Corrigir `mobileInventoryController.js`.
  - [ ] Aplicar mesma regra do estoque manual.
  - [ ] Garantir que lote de movimentacoes seja atomico.
- [ ] Corrigir `productionOrderController.js`.
  - [ ] Finalizacao de OP deve incrementar produto acabado com lock/transacao.
  - [ ] Consumo de componentes deve ser transacional.
  - [ ] Impedir finalizar OP duas vezes.
- [ ] Criar `server/src/services/inventoryService.js` ou `server/src/modules/inventory/application/services/InventoryService.js`.
  - [ ] `reserve(productId, quantity, transaction)`
  - [ ] `releaseReservation(productId, quantity, transaction)`
  - [ ] `consume(productId, quantity, transaction)`
  - [ ] `receive(productId, quantity, transaction)`
  - [ ] `adjust(productId, type, quantity, reason, transaction)`
- [ ] Nenhum controller deve alterar `Product.quantity` diretamente depois desta fase.

Criterios de aceite:

- [ ] `rg "sequelize.literal" server/src/controllers server/src/services` nao deve retornar uso em estoque.
- [ ] Toda baixa/entrada/reserva de estoque passa por `InventoryService`.
- [ ] Toda movimentacao cria registro em `InventoryMovement`.
- [ ] Teste manual com duas vendas simultaneas nao gera estoque negativo.

### Corrigir validacao de CNPJ

- [ ] Corrigir `server/src/utils/validators.js`.
- [ ] Em `isValidCNPJ`, o segundo digito verificador deve comparar com `cleaned.charAt(13)`, nao com `charAt(10)`.
- [ ] Adicionar testes para CNPJ valido, invalido, sequencial, formatado e sem formatacao.

Criterios de aceite:

- [ ] `Validators.isValidCNPJ('11.444.777/0001-61')` retorna `true`.
- [ ] `Validators.isValidCNPJ('11.111.111/1111-11')` retorna `false`.

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

- [ ] Criar `server/src/modules`.
- [ ] Migrar primeiro o modulo `products`.
- [ ] Migrar segundo o modulo `inventory`.
- [ ] Migrar terceiro o modulo `bom`.
- [ ] Migrar quarto o modulo `production`.
- [ ] Migrar quinto `purchases` e `sales`.
- [ ] Manter rotas antigas funcionando durante a migracao.
- [ ] Evitar quebra de contrato de API sem documentar versao.

Criterios de aceite:

- [ ] Cada modulo migrado deve ter `domain`, `application`, `infrastructure`, `presentation`.
- [ ] Controller nao pode conter regra de negocio complexa.
- [ ] Controller apenas valida request, chama use case/service e responde.

### Shared kernel

- [ ] Criar `server/src/shared/domain/Entity.js`.
- [ ] Criar `server/src/shared/domain/ValueObject.js`.
- [ ] Criar `server/src/shared/domain/errors/AppError.js`.
- [ ] Criar `server/src/shared/application/UseCase.js`.
- [ ] Criar `server/src/shared/presentation/httpResponse.js`.
- [ ] Criar `server/src/shared/presentation/pagination.js`.
- [ ] Criar `server/src/shared/utils/money.js`.
- [ ] Criar `server/src/shared/utils/dates.js`.
- [ ] Criar `server/src/shared/utils/strings.js`.
- [ ] Criar validacoes compartilhadas.

## FASE 6 - Dominio rico para Produtos, BOM, Estoque e Producao

### Produto como entidade de dominio

- [ ] Criar `ProductEntity`.
- [ ] Mover regras de produto para entidade/use case.
- [ ] Validar codigo obrigatorio e unico.
- [ ] Validar nome minimo.
- [ ] Validar tipo: `finished`, `semi_finished`, `component`, `raw_material`.
- [ ] Validar peso quando aplicavel.
- [ ] Validar preco e custo.
- [ ] Controlar status e transicoes.
- [ ] Criar revisao tecnica do produto.
- [ ] Validar parametros Thiele-Small quando informados: Fs, Qms, Qes, Qts, Vas, Sd, Xmax, Re, Le, BL, Mms, Cms, SPL.
- [ ] Criar `CreateProductUseCase`.
- [ ] Criar `UpdateProductUseCase`.
- [ ] Criar `DeactivateProductUseCase`.
- [ ] Criar `ChangeProductStatusUseCase`.
- [ ] Criar `CreateProductRevisionUseCase`.
- [ ] Criar `ListProductsUseCase`.
- [ ] Criar `GetProductByIdUseCase`.

### BOM como agregado de dominio

- [ ] BOM pertence a um produto acabado.
- [x] BOM precisa ter pelo menos um item.
- [ ] Item precisa ter componente existente.
- [x] Quantidade do item deve ser maior que zero.
- [x] Percentual de perda deve ser limitado e documentado.
- [x] Evitar componente duplicado no mesmo nivel quando nao for intencional.
- [ ] Detectar loop/ciclo de BOM.
- [x] Controlar profundidade maxima.
- [ ] Versionar BOM.
- [ ] Aprovar BOM antes de usar em producao.
- [ ] BOM antiga deve virar `superseded`, nao ser apagada.
- [ ] Calcular custo total da BOM.
- [ ] Calcular quantidade com perda.
- [ ] Explodir BOM para quantidade planejada.
- [ ] Verificar disponibilidade de componentes.
- [ ] Quebrar `bomService.js` em use cases menores.

Use cases de BOM:

- [ ] `CreateBOMUseCase`
- [ ] `ApproveBOMUseCase`
- [ ] `SupersedeBOMUseCase`
- [ ] `ExplodeBOMUseCase`
- [ ] `CalculateBOMCostUseCase`
- [ ] `CheckBOMAvailabilityUseCase`
- [ ] `GetBOMTreeUseCase`
- [ ] `ListBOMVersionsUseCase`

### Estoque como dominio

- [ ] Criar entidade/servico de dominio `InventoryItem`.
- [ ] Separar `quantity`, `reserved_quantity`, `available_quantity`, `minimum_quantity`, `safety_stock`.
- [ ] Implementar reserva de estoque.
- [ ] Implementar liberacao de reserva.
- [ ] Implementar baixa confirmada.
- [ ] Implementar entrada por compra.
- [ ] Implementar ajuste com motivo obrigatorio.
- [ ] Implementar transferencia entre locais.
- [ ] Implementar inventario/cycle count.
- [ ] Garantir: `available_quantity = quantity - reserved_quantity`.

Use cases de estoque:

- [ ] `ReserveStockUseCase`
- [ ] `ReleaseStockReservationUseCase`
- [ ] `ConsumeStockUseCase`
- [ ] `ReceiveStockUseCase`
- [ ] `AdjustStockUseCase`
- [ ] `TransferStockUseCase`
- [ ] `ListLowStockUseCase`

### Ordem de Producao como entidade de dominio

- [x] OP precisa de produto.
- [ ] OP precisa de BOM aprovada.
- [x] Quantidade planejada deve ser maior que zero.
- [x] Status controlados: `planned`, `released`, `in_progress`, `paused`, `completed`, `cancelled`.
- [x] Nao iniciar OP cancelada/concluida.
- [x] Nao finalizar OP sem apontamento valido.
- [ ] Apontamento nao pode exceder quantidade planejada sem regra explicita.
- [ ] Registrar refugos.
- [ ] Calcular eficiencia.
- [ ] Consumir componentes conforme BOM.
- [ ] Gerar produto acabado no estoque ao finalizar.

Use cases de producao:

- [ ] `CreateProductionOrderUseCase`
- [ ] `ReleaseProductionOrderUseCase`
- [ ] `StartProductionOrderUseCase`
- [ ] `PauseProductionOrderUseCase`
- [ ] `ResumeProductionOrderUseCase`
- [ ] `RegisterProductionOutputUseCase`
- [ ] `RegisterScrapUseCase`
- [ ] `CompleteProductionOrderUseCase`
- [ ] `CancelProductionOrderUseCase`

## FASE 7 - Migracao gradual para TypeScript

- [ ] Adicionar TypeScript ao projeto principal.
- [ ] Criar `tsconfig.json`.
- [ ] Criar `tsconfig.build.json`.
- [ ] Adicionar `tsx`.
- [ ] Adicionar tipos do Node, Express e runner de testes.
- [ ] Configurar ESLint para JS + TS durante periodo hibrido.
- [ ] Definir regra: arquivos novos de dominio/application devem nascer em TypeScript.
- [ ] Migrar `validators.js` para TypeScript.
- [ ] Migrar erros compartilhados.
- [ ] Migrar services puros.
- [ ] Migrar modulo `products`.
- [ ] Migrar modulo `inventory`.
- [ ] Migrar modulo `bom`.
- [ ] Migrar modulo `production`.
- [ ] Migrar modulo `sales`.
- [ ] Migrar modulo `purchases`.
- [ ] Migrar modulo `financial`.

Scripts desejados:

- [ ] `dev`
- [ ] `build`
- [ ] `start`
- [ ] `test`
- [ ] `test:unit`
- [ ] `test:integration`
- [ ] `test:e2e`
- [ ] `test:coverage`
- [ ] `lint`
- [ ] `lint:fix`
- [ ] `format`
- [ ] `migration:run`
- [ ] `docs:serve`

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

- [ ] Corrigir CNPJ.
- [ ] Corrigir race condition de estoque.
- [ ] Criar `InventoryService`.
- [ ] Remover uso critico de `sequelize.literal`.
- [ ] Padronizar erro base com `AppError`.
- [ ] Atualizar `errorHandler`.
- [ ] Criar testes regressivos dos bugs corrigidos.

### Semana 2 - Auditoria e seguranca

- [ ] Criar `AuditLogService`.
- [ ] Integrar auditoria em produtos, estoque, vendas, compras e OP.
- [ ] Revisar rotas sem auth.
- [ ] Revisar RBAC.
- [ ] Revisar upload.
- [ ] Atualizar documentacao de seguranca.

### Semana 3 - Modularizacao inicial

- [ ] Criar `server/src/shared`.
- [ ] Criar `server/src/modules`.
- [ ] Migrar modulo `products`.
- [ ] Criar use cases de produto.
- [ ] Criar DTOs/schemas de produto.
- [ ] Criar README do modulo produtos.

### Semana 4 - Estoque e BOM em camadas

- [ ] Migrar `inventory`.
- [ ] Migrar `bom`.
- [ ] Quebrar `bomService` em use cases.
- [ ] Criar regras de dominio de BOM.
- [ ] Criar testes unitarios de BOM e estoque.
- [ ] Atualizar docs de producao/BOM.

### Semana 5 - Producao, compras e vendas

- [ ] Migrar `production`.
- [ ] Migrar fluxos criticos de `sales`.
- [ ] Migrar fluxos criticos de `purchases`.
- [ ] Implementar reserva de estoque.
- [ ] Corrigir contas a pagar.
- [ ] Corrigir arredondamento de parcelas.

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
