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

## F9 - Pre-Produção
**Responsavel tecnico:** Lead Architect + QA/DevSecOps  
**Objetivo:** fechar o que precisa estar pronto antes de colocar o ERP em uso real pela fabrica.

## F9.1 - Plano de Correcao por Sprint (Auditoria 2026-07-30)
**Origem:** auditoria profunda de codigo, rastreabilidade e DevSecOps realizada em 2026-07-30.  
**Regra:** este plano complementa F9/F10 e deve ser executado antes da liberacao.

### Sprint A - Bloqueios Criticos de Execucao
- [ ] Corrigir a assinatura e todas as chamadas de `InventoryService.receive/consume` nos fluxos de compras e producao.
- [ ] Garantir persistencia correta de `user_id`, `reference_id` e `reference_type` em todas as movimentacoes de estoque.
- [ ] Validar subida real da API em ambiente local/homologacao com PostgreSQL limpo.
- [ ] Confirmar `npm run build` + healthcheck `/api` sem erro de runtime.

### Sprint B - Rastreabilidade Ponta a Ponta
- [ ] Refatorar `SequelizeTraceabilityRepository` para usar tabelas e colunas reais do schema PostgreSQL atual.
- [ ] Registrar `ProductionLotConsumption` no consumo real da OP.
- [ ] Gerar `LotControl` para produto acabado ao concluir OP.
- [ ] Gerar ou vincular `SerialNumber` quando aplicavel.
- [ ] Validar os 3 cenarios de aceite:
- [ ] Produto acabado encontra todos os insumos consumidos.
- [ ] Lote de MP encontra todas as OPs consumidoras.
- [ ] Entrada de compra encontra movimentos e consumos derivados.

### Sprint C - Regras de Negocio Omitidas
- [ ] Bloquear criacao/liberacao de OP sem disponibilidade minima de materiais.
- [ ] Implementar reserva real de estoque para OP.
- [ ] Bloquear conclusao de OP sem consumo rastreavel por lote quando o item exigir rastreabilidade.
- [ ] Revisar recebimento de compra para criar/associar lote no ato da entrada.
- [ ] Revisar coerencia entre `Product/BillOfMaterial` e camada canonica `Item/ItemEstrutura`.

### Sprint D - Integridade, Decimais e Validacao
- [ ] Migrar quantidades de estoque e movimento para decimal industrial.
- [ ] Revisar arredondamento para compra, estoque, BOM, MRP e custo medio.
- [ ] Corrigir `DeactivateItemUseCase` para consultar campos/status reais.
- [ ] Adicionar validacao de payload nas rotas criticas de compras, estoque e producao.

### Sprint E - Hardening de Pre-Producao
- [ ] Remover ou alinhar `.env.example` raiz legado com MongoDB.
- [ ] Revisar e remover artefatos de drift/legado como `_fix_database.ts`.
- [ ] Remover `@types/sequelize` deprecated.
- [ ] Executar `npm audit` com registro de decisao tecnica.
- [ ] Fechar F9/F10 somente apos as sprints A-D estarem concluidas.

### Ordem de Execução
1. Congelar o escopo da versao.
2. Corrigir apenas erros que impedem uso real, sem iniciar funcionalidades novas.
3. Validar ambiente local, banco, integração e documentação.
4. Confirmar que o rollback existe e foi entendido.
5. Liberar somente depois de checklist 100% coerente.

### Checklist de Preparação
- [ ] Confirmar que o branch de release nao tem alteracoes nao revisadas.
- [ ] Confirmar que `npm run typecheck` passa sem erros.
- [ ] Confirmar que `npm run build` gera artefatos sem erro.
- [ ] Confirmar que `npm test` passa nas suites unitarias relevantes.
- [ ] Confirmar que `RUN_INTEGRATION=true npm run test:integration` executa com prerequisitos reais.
- [ ] Confirmar que os testes que dependem de token/URL estao configurados com valores de homologacao.
- [ ] Confirmar que `server/.env.example` nao possui senha real, token real ou URL real.
- [ ] Confirmar que `docs/DEPLOY.md` descreve instalacao, inicializacao e rollback.
- [ ] Confirmar que `docs/BLACKBOX_CRONOGRAMA_CHECKLIST.md` e TODO estao atualizados.
- [ ] Confirmar que os módulos `items`, `mrp` e `traceability` respondem corretamente em ambiente de teste.
- [ ] Confirmar que os endpoints novos possuem validacao e retornam erro estruturado em payload invalido.
- [ ] Confirmar que o banco de producao sera acessado apenas por credenciais exclusivas do ERP novo.
- [ ] Confirmar que `InventoryService` foi corrigido e testado em compras e producao.
- [ ] Confirmar que a rastreabilidade usa schema real (`inventory_movements`, `lot_controls`, `production_lot_consumptions`, `serial_numbers`).
- [ ] Confirmar que criacao/conclusao de OP respeita material disponivel, reserva e consumo rastreavel.
- [ ] Confirmar que quantidades fracionadas (KG/L/M) funcionam sem truncamento indevido.

### Como Executar Cada Verificacao
- [ ] Para o tipo de compilacao, executar `cd server` e depois `npm run typecheck`.
- [ ] Para o build, executar `cd server` e depois `npm run build`.
- [ ] Para os testes unitarios, executar `cd server` e depois `npm test`.
- [ ] Para integracao, definir `RUN_INTEGRATION=true`, `TEST_API_URL`, `TEST_AUTH_TOKEN` e demais variaveis exigidas antes de rodar `npm run test:integration`.
- [ ] Se uma variavel nao existir, nao prosseguir como se fosse sucesso; marcar como bloqueio.
- [ ] Se um teste falhar por ambiente, registrar a causa exata e nao transformar isso em "ok".
- [ ] Se um teste falhar por codigo, abrir correcao antes de liberar.

### Aceite da Fase
- [ ] Nenhum teste critico falha.
- [ ] Nenhum segredo real existe nos arquivos de exemplo.
- [ ] Nenhuma dependencia ao banco legado existe.
- [ ] O rollback foi documentado e entendido.
- [ ] O responsavel tecnico assinou a liberacao.
- [ ] Nenhum ponto cego de rastreabilidade permanece aberto nos fluxos de compra, estoque e producao.

## F10 - Go Live Controlado
**Responsavel tecnico:** Lead Architect  
**Objetivo:** entrar em producao com risco controlado e possibilidade real de retorno.

### Checklist de Go Live
- [ ] Criar tag ou identificador da versao.
- [ ] Registrar hash do commit liberado.
- [ ] Confirmar backup recente do banco PostgreSQL Hostinger.
- [ ] Confirmar que o `.env` de producao foi gerado fora do repositório.
- [ ] Confirmar que o Cloudflare Tunnel responde para a API.
- [ ] Confirmar que n8n esta online e com workflows ativos.
- [ ] Confirmar que o fluxo WhatsApp/IA foi validado com dados de teste.
- [ ] Confirmar que os logs estao sendo gerados.
- [ ] Confirmar que monitoramento basico foi ativado.
- [ ] Confirmar contato de rollback e suporte.

### Critério de Aceite
- [ ] API responde em produção sem erro 5xx nos endpoints críticos.
- [ ] Autenticação funciona com usuário real.
- [ ] Fluxo de pedido, compra e rastreabilidade funciona.
- [ ] Rollback pode ser executado sem perda de dados não planejada.
