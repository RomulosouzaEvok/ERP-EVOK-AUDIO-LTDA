# TODO - F4 to F8 Implementation

## F4 - Rastreabilidade Total
- [x] Criar `server/src/modules/traceability/domain/repositories/TraceabilityRepository.ts`
- [x] Criar `server/src/modules/traceability/infrastructure/sequelize/SequelizeTraceabilityRepository.ts`
- [x] Criar `server/src/modules/traceability/application/use-cases/GetItemTraceabilityUseCase.ts`
- [x] Criar `server/src/modules/traceability/application/use-cases/GetLotTraceabilityUseCase.ts`
- [x] Criar `server/src/modules/traceability/application/use-cases/GetProductionOrderTraceabilityUseCase.ts`
- [x] Criar `server/src/modules/traceability/presentation/validators/traceabilityValidators.ts`
- [x] Criar `server/src/modules/traceability/presentation/controllers/traceabilityController.ts`
- [x] Criar `server/src/modules/traceability/presentation/routes/traceability.ts`
- [x] Registrar rotas em `server/index.ts`

## F5 - Proteção de Item Vinculado
- [x] Criar `server/src/modules/items/application/use-cases/DeactivateItemUseCase.ts`
- [x] Adicionar rota `PATCH /api/items/:id/inactivate` em `items.ts`
- [x] Adicionar handler no `itemController.ts`

## F6 - Validação e Sanitização
- [x] Corrigir `SequelizeProductRepository.ts` - adicionar `sanitizeSearch` no `Op.like`
- [x] Corrigir `SequelizeSuppliersRepository.ts` - adicionar `sanitizeSearch` no `Op.like`

## F7 - Testes de Integração
- [x] Criar `server/tests/integration/mrp.test.ts`
- [x] Criar `server/tests/integration/traceability.test.ts`

## F8 - DevSecOps
- [x] Criar `.env.example`
- [x] Endurecer `.env.example` com placeholders seguros
- [x] Criar guardas de prerequisito para testes de integracao
- [x] Criar `docs/DEPLOY.md`

## Validação Final
- [x] Corrigir `UseCase` interop em `ListUsersUseCase.ts`
- [x] Rodar `npm run typecheck`
- [x] Rodar `npm run build`
- [ ] Rodar `RUN_INTEGRATION=true npm run test:integration`
- [x] Atualizar `docs/BLACKBOX_CRONOGRAMA_CHECKLIST.md`

## Status de Testes de Integração (Thorough Testing)
- [x] Suite executada
- [ ] Suite 100% verde (há bloqueios externos ao escopo F4-F8)
- [x] Suites com prerequisitos ausentes sao marcadas como skip e nao mascaram falhas de ambiente

## Status de Testes Unitários Recentes
- [x] `items-models.test.ts`
- [x] `items-use-cases.test.ts`
- [x] `bom-recursive.test.ts`
- [x] `mrp-engine.test.ts`
- [x] `mrp-persistence.test.ts`

## Correcao F3
- [x] Corrigir propagacao de origem da demanda no `GenerateMrpPlanUseCase.ts`
- [x] Reexecutar `mrp-persistence.test.ts` com sucesso

## Correcao F8
- [x] Endurecer `server/.env.example` com placeholders seguros
- [x] Criar guardas de prerequisito para testes de integracao

### Bloqueios documentados
- Ambiente:
  - `TEST_AUTH_TOKEN` não configurado (falhas em `stock-concurrency` e `material-requisition-flow`)
  - Serviço webhook indisponível em `127.0.0.1:3001` (falha em `n8n-webhook`)
- Fora do escopo F4-F8:
  - interop CommonJS/TS em módulos legados (ex.: `modules/products`, `ListProductsUseCase extends UseCase`)

## Reconciliação Atual
- F1, F2 e F3 permanecem concluídas no roteiro principal.
- F4, F5 e F6 estão refletidos no código e no checklist principal.
- F7 existe como suíte, mas ainda não está 100% verde.
- F8 está consolidada no histórico: `.env.example`, guardas de prerequisito e documentação de deploy estão prontos; a remoção total de qualquer fallback operacional segue em aberto.
