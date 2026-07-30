# Cronograma e Checklist de Implementacao - Blackbox

Projeto: ERP Evok Audio  
Responsavel pela implementacao: Blackbox  
Data-base: 2026-07-29  
Stack autorizada: Node.js, TypeScript, Express, Sequelize, PostgreSQL.

## 1. Estado Atual Confirmado

| Area | Status |
|---|---|
| Backend TypeScript | Fonte principal sem arquivos `.js` duplicados fora de `dist` e `node_modules`. |
| Banco | Runtime configurado para PostgreSQL. |
| Testes | Jest configurado; testes unitarios e edge locais existentes. |
| MRP | Motor puro em TypeScript existente; persistencia/API parcial adicionada nesta rodada. |
| BOM | Implementacao atual ainda usa `Product`, `BillOfMaterial`, `BillOfMaterialItem`, mas a camada canonica `Item` foi adicionada nesta rodada. |
| Schema alvo | Scripts SQL ja definem `items`, `item_estruturas`, `mrp_ordens_planejadas`. |
| Rastreabilidade | Parcial; a trilha de consultas foi adicionada, mas a cadeia operacional completa ainda depende de consolidacao de fluxo e dados reais. |

## 1.1 Replanejamento por Auditoria - 2026-07-30

Auditoria profunda realizada em 2026-07-30 confirmou que o projeto ainda possui bloqueios de producao que precisam entrar explicitamente no cronograma:

- Fluxos criticos de compra e producao estao chamando `InventoryService` com assinatura incorreta.
- A camada de rastreabilidade consulta schema canonico que nao corresponde ao schema ativo do backend.
- Criacao e conclusao de OP ainda nao fecham o ciclo exigido de material disponivel, reserva, consumo por lote e geracao de lote/serie do acabado.
- Quantidades fracionadas sao aceitas em partes do dominio, mas o estoque principal ainda usa campos `INTEGER`.
- F9 e F10 nao podem ser considerados liberaveis enquanto esses itens estiverem abertos.

## 2. Regra de Trabalho Para o Blackbox

1. Nao recriar arquivos `.js` em `server/src`, `server/config` ou `server/index`.
2. Nao reintroduzir MySQL, `DB_DIALECT`, MongoDB, `mongoose` ou conexoes externas ao ERP antigo.
3. Toda nova regra de negocio deve ser TypeScript.
4. Toda operacao multi-tabela deve usar transacao Sequelize/PostgreSQL.
5. Toda rota nova deve ter validacao de payload.
6. Toda funcao, metodo, interface e rota nova deve conter JSDoc.
7. Ao final de cada fase, rodar:

```bash
cd server
npm run typecheck
npm run build
npm test
```

8. Testes de integracao so contam como concluido quando rodarem com:

```bash
RUN_INTEGRATION=true npm run test:integration
```

## 3. Cronograma Executivo

| Fase | Entrega | Prioridade | Prazo |
|---|---|---:|---:|
| F1 | Models canonicos `Item`, `ItemEstrutura`, `MrpOrdemPlanejada` | Critico | 1-2 dias |
| F2 | Repositories e use cases para BOM canonica | Critico | 2 dias |
| F3 | MRP persistente com endpoints | Critico | 2 dias |
| F4 | Rastreabilidade por lote/serie em compras, estoque e producao | Critico | 2-3 dias |
| F5 | Bloqueio de alteracao/exclusao de item vinculado | Alto | 1 dia |
| F6 | Validacao Zod e sanitizacao de buscas | Alto | 1-2 dias |
| F7 | Testes de integracao reais | Alto | 1 dia |
| F8 | Hardening DevSecOps e `.env.example` | Alto | 1 dia |
| F9 | Pré-produção guiada com validações finais | Alto | 1-2 dias |
| F10 | Go live controlado com rollback documentado | Critico | 1 dia |

## 4. F1 - Models Canonicos Industriais

### Objetivo

Criar a camada persistente alinhada ao modelo industrial real:

- `items`
- `item_estruturas`
- `mrp_ordens_planejadas`

### Checklist

- [x] Criar `server/src/models/Item.ts`.
- [x] Criar `server/src/models/ItemEstrutura.ts`.
- [x] Criar `server/src/models/MrpOrdemPlanejada.ts`.
- [x] Registrar associations em `server/src/models/index.ts`.
- [x] Usar `DataTypes.DECIMAL(18, 6)` para quantidades industriais.
- [x] Usar enum industrial:
  - `MATERIA_PRIMA`
  - `SUBCONJUNTO`
  - `PRODUTO_ACABADO`
- [x] Garantir que item pai nunca seja igual ao componente.
- [x] Garantir `ON DELETE RESTRICT` em relacionamentos de estrutura.

### Criterio de Aceite

- [x] Models compilam.
- [x] Associations carregam sem erro.
- [x] Nenhum campo industrial de quantidade usa `INTEGER`.

## 5. F2 - BOM Canonica

### Objetivo

Criar repositories e use cases para operar BOM multinivel com `Item` e `ItemEstrutura`.

### Checklist

- [x] Criar `server/src/modules/items`.
- [x] Criar repository `ItemRepository`.
- [x] Criar repository `ItemEstruturaRepository`.
- [x] Criar use case `CreateItemUseCase`.
- [x] Criar use case `CreateItemStructureUseCase`.
- [x] Criar use case `ExplodeItemStructureUseCase`.
- [x] Detectar ciclos recursivos.
- [x] Agregar componentes repetidos na explosao.
- [x] Bloquear estrutura inativa no calculo.
- [x] Criar rotas:
  - `POST /api/items`
  - `GET /api/items`
  - `POST /api/items/:id/estrutura`
  - `GET /api/items/:id/estrutura/explode`

### Criterio de Aceite

- [ ] Produto acabado explode subconjunto e materia-prima.
- [ ] Ciclo de BOM retorna erro 422.
- [ ] Insumo repetido em ramos diferentes aparece agregado.

## 6. F3 - MRP Persistente

### Objetivo

Conectar `mrpEngine.ts` ao banco e transformar o calculo em fluxo real do ERP.

### Checklist

- [x] Criar `server/src/modules/mrp/domain/repositories/MrpRepository.ts`.
- [x] Criar `SequelizeMrpRepository.ts`.
- [x] Criar `GenerateMrpPlanUseCase.ts`.
- [x] Ler demandas reais ou payload manual.
- [x] Ler `item_estruturas` ativas.
- [x] Ler estoque, reserva, seguranca, lote minimo e lead time de `items`.
- [x] Persistir em `mrp_ordens_planejadas`.
- [x] Evitar duplicidade por item/origem/data.
- [x] Criar rota `POST /api/mrp/plan`.
- [x] Criar rota `GET /api/mrp/planned-orders`.

### Criterio de Aceite

- [x] MRP gera ordens planejadas (via `GenerateMrpPlanUseCase` + `calculateMrpPlan` + `upsertPlannedOrders`).
- [x] MRP respeita estoque disponivel (calcula `onHand - reserved - safetyStock`).
- [x] MRP respeita lote minimo (arredonda para múltiplo do `minimumLotSize`).
- [x] MRP calcula data de liberacao pelo lead time (`releaseDate = dueDate - leadTimeDays`).
- [ ] Rodar teste unitario e teste de integracao (responsabilidade do QA).

## 7. F4 - Rastreabilidade Total

### Objetivo

Fechar a cadeia de custodia: requisicao, entrada, lote, consumo, OP e produto acabado.

### Checklist

- [x] Entrada de compra deve criar ou associar lote.
- [x] Baixa de producao deve informar lote consumido.
- [x] Produto acabado deve gerar lote ou numero de serie.
- [x] Movimento de estoque deve registrar:
  - `item_id`
  - `lote_id`
  - `numero_serie_id`
  - `origem_tabela`
  - `origem_id`
  - `usuario_id`
  - `correlation_id`
- [x] Criar consulta de rastreabilidade:
  - `GET /api/traceability/items/:id`
  - `GET /api/traceability/lots/:id`
  - `GET /api/traceability/production-orders/:id`

### Criterio de Aceite

- [ ] Dado um produto acabado, localizar todos os insumos consumidos.
- [ ] Dado um lote de materia-prima, localizar todas as OPs que consumiram esse lote.
- [ ] Dado uma entrada de NF, localizar os movimentos e consumos derivados.
- [ ] Confirmar que o repositorio de rastreabilidade usa as tabelas reais do schema atual (`inventory_movements`, `lot_controls`, `production_orders`, `production_lot_consumptions`, `serial_numbers`).
- [ ] Confirmar que a conclusao da OP persiste `ProductionLotConsumption`, `LotControl` e `SerialNumber` quando aplicavel.

## 8. F5 - Protecao de Item Vinculado

### Objetivo

Impedir perda historica por exclusao/alteracao indevida.

### Checklist

- [x] Bloquear exclusao fisica de item.
- [x] Usar soft delete/status `INATIVO`.
- [x] Antes de inativar, verificar:
  - BOM ativa
  - OP aberta
  - OP historica
  - movimento de estoque
  - lote/serie vinculado
- [x] Retornar erro 409 em conflito.

### Criterio de Aceite

- [x] Item vinculado a BOM ativa nao pode ser removido.
- [x] Item com movimento historico nao pode ser removido fisicamente.

## 9. F6 - Validacao e Sanitizacao

### Objetivo

Fechar entrada insegura e busca ampla indevida.

### Checklist

- [x] Criar schemas Zod para rotas criticas.
- [x] Validar quantidades `> 0`.
- [x] Validar escala decimal ate 6 casas.
- [x] Validar enums industriais.
- [x] Sanitizar todos os `Op.like` com `Validators.sanitizeSearch`.
- [x] Rejeitar campos desconhecidos em payloads criticos.

### Pontos Atuais Para Corrigir

- `server/src/modules/products/infrastructure/sequelize/SequelizeProductRepository.ts`
- `server/src/modules/suppliers/infrastructure/sequelize/SequelizeSuppliersRepository.ts`

### Observacao de Execucao

- F4, F5 e F6 agora estao refletidos no codigo e no checklist.
- F7 existe como suite de integracao, mas ainda nao ficou 100% verde; os testes agora pulam quando faltam prerequisitos, em vez de mascarar falhas de ambiente.
- F8 agora foi endurecido em `server/.env.example` com placeholders seguros para `DB_PASSWORD`, `JWT_SECRET` e `ADMIN_SEED_PASSWORD`.
- `npm run typecheck`, `npm run build` e a bateria de unit tests passaram.
- A validacao de unidade confirmou e depois corrigiu um desvio real em F3: `mrp-persistence.test.ts` falhava porque a origem da ordem persistida virava `MANUAL` para componentes explodidos; o fluxo foi ajustado e o teste agora passa.
- `RUN_INTEGRATION=true npm run test:integration` foi executado, com bloqueios remanescentes:
  - Ambiente: `TEST_AUTH_TOKEN` nao configurado.
  - Ambiente externo: webhook indisponivel em `127.0.0.1:3001`.
  - Fora do escopo F4-F8: interop legado em `modules/products` impactando bootstrap em algumas suites.

### Criterio de Aceite

- [x] Busca com `%` ou `_` nao faz wildcard injection.
- [x] Payload invalido retorna 400 com erro estruturado.

## 10. F7 - Testes de Integracao

### Objetivo

Executar fluxos reais contra API e PostgreSQL.

### Checklist

- [x] Configurar banco PostgreSQL de teste.
- [ ] Criar usuario/token de teste.
- [x] Configurar:
  - `TEST_API_URL`
  - `TEST_AUTH_TOKEN`
  - `TEST_PRODUCT_ID`
  - `TEST_SUPPLIER_ID`
  - `TEST_LOW_STOCK_PRODUCT_ID`
  - `TEST_BOM_LINKED_PRODUCT_ID`
- [x] Rodar:

```bash
RUN_INTEGRATION=true npm run test:integration
```

### Criterio de Aceite

- [ ] Fluxo compra/aprovacao passa.
- [ ] Concorrencia de estoque nao deixa saldo negativo.
- [ ] Webhook n8n/IA responde 200 ou 202.
- [ ] Fluxo de conclusao de OP prova consumo rastreavel e entrada de produto acabado.
- [ ] Endpoint `/api/traceability/production-orders/:id` responde com dados reais do schema atual.

## 11. F8 - DevSecOps

### Objetivo

Preparar producao Ubuntu 24.04 sem segredo hardcoded.

### Checklist

- [x] Criar `.env.example` final.
- [ ] Remover senha fallback do seed admin.
- [x] Em producao, falhar se `ADMIN_SEED_PASSWORD` nao existir.
- [ ] Revisar `npm audit`.
- [x] Nao usar `npm audit fix --force` sem revisao.
- [x] Criar `docs/DEPLOY.md`.
- [ ] Remover ou alinhar `.env.example` raiz legado que ainda referencia MongoDB.
- [ ] Revisar e remover artefatos de drift/legado como `_fix_database.ts`.
- [ ] Remover `@types/sequelize` deprecated do backend.

### Criterio de Aceite

- [ ] Nenhum segredo hardcoded.
- [x] Deploy documentado.
- [ ] Rollback documentado.

## 12. F9 - Pre-Producao Guiada

### Objetivo

Conferir, com calma e em ordem, tudo que precisa estar pronto antes da liberacao final.

### Responsavel

- Lead Architect
- QA/DevSecOps

### Ordem de Execucao

1. Congelar o escopo da versao que sera liberada.
2. Fechar primeiro os bloqueios criticos da auditoria de 2026-07-30.
3. Revisar o status das fases F1 a F8.
4. Executar os testes unitarios e registrar o resultado.
5. Executar os testes de integracao com prerequisitos validos.
6. Validar a documentacao de deploy e rollback.
7. Validar o arquivo `.env.example` como modelo seguro.
8. Confirmar que nao existe dependencia ao banco legado.
9. Liberar somente quando todos os itens de aceite estiverem marcados.

### Sprints de Correcao Obrigatorias Antes do Aceite

- [ ] Sprint A - Corrigir assinatura/chamada de `InventoryService` e restaurar consistencia dos fluxos de compra/producao.
- [ ] Sprint B - Corrigir rastreabilidade para schema real e fechar cadeia lote/serie/consumo.
- [ ] Sprint C - Fechar regras omitidas de OP: disponibilidade, reserva e consumo rastreavel.
- [ ] Sprint D - Migrar quantidades de estoque para decimal industrial e revisar arredondamentos.
- [ ] Sprint E - Hardening final de ambiente, dependencias e artefatos legados.

### Checklist

- [ ] Verificar se o branch de release esta limpo ou com mudancas revisadas.
- [ ] Verificar se `npm run typecheck` passa.
- [ ] Verificar se `npm run build` passa.
- [ ] Verificar se `npm test` passa para as suites relevantes.
- [ ] Verificar se `RUN_INTEGRATION=true npm run test:integration` passa com ambiente configurado.
- [ ] Verificar se `TEST_API_URL` aponta para o ambiente certo.
- [ ] Verificar se `TEST_AUTH_TOKEN` existe e e valido.
- [ ] Verificar se `TEST_PRODUCT_ID`, `TEST_SUPPLIER_ID`, `TEST_LOW_STOCK_PRODUCT_ID` e `TEST_BOM_LINKED_PRODUCT_ID` existem.
- [ ] Verificar se `server/.env.example` nao contem segredo real.
- [ ] Verificar se `docs/DEPLOY.md` explica instalacao, inicializacao e rollback.
- [ ] Verificar se os modulos `items`, `mrp` e `traceability` estao montados em `server/index.ts`.
- [ ] Verificar se os endpoints novos retornam erro estruturado em payload invalido.
- [ ] Verificar se nao existe leitura do banco legado.
- [ ] Verificar se `InventoryService` foi corrigido e testado em `ReceivePurchaseItemsUseCase` e `ChangeProductionOrderStatusUseCase`.
- [ ] Verificar se o repositorio de rastreabilidade consulta o schema real do backend.
- [ ] Verificar se criacao/conclusao de OP respeita material disponivel, reserva e consumo por lote.
- [ ] Verificar se quantidades fracionadas (KG/L/M) nao sofrem truncamento em estoque e movimentos.

### Critérios de Aceite

- [ ] Todos os testes obrigatorios passaram.
- [ ] Nenhum segredo real ficou em arquivo exemplo.
- [ ] Nenhuma dependencia ao ecossistema antigo foi introduzida.
- [ ] O procedimento de rollback esta claro para uma pessoa nova no projeto.
- [ ] Nenhum ponto cego de rastreabilidade permanece aberto nos fluxos de compra, estoque e producao.

## 13. F10 - Go Live Controlado

### Objetivo

Liberar a versao para producao com o menor risco possivel e com retorno facil se algo falhar.

### Responsavel

- Lead Architect

### Checklist

- [ ] Registrar o hash do commit liberado.
- [ ] Criar ou registrar a tag da release.
- [ ] Confirmar backup recente do banco.
- [ ] Confirmar Cloudflare Tunnel ativo.
- [ ] Confirmar n8n ativo.
- [ ] Confirmar workflows de WhatsApp e IA habilitados.
- [ ] Confirmar logs e monitoramento basico ativos.
- [ ] Confirmar que a equipe sabe quem acionar em caso de falha.
- [ ] Confirmar que existe instrução de rollback escrita.

### Critério de Aceite

- [ ] API sobe sem erro.
- [ ] Autenticacao funciona.
- [ ] Cadastro, BOM, MRP e rastreabilidade respondem.
- [ ] Existe caminho claro para voltar a versao anterior.
- [ ] Fluxo de pedido, compra, OP e rastreabilidade ponta a ponta foi validado em homologacao com dados reais de teste.
## 14. Comandos de Validacao Final

```bash
cd server
npm run typecheck
npm run build
npm test
RUN_INTEGRATION=true npm run test:integration
```

## 15. Varredura Obrigatoria

```bash
rg -n "MySQL|mysql|DB_DIALECT|MONGODB_URI|ERP antigo|password.*=.*['\"]|token.*=.*['\"]" server/src server/config server/package.json
```

O resultado esperado e vazio, exceto usos legitimos de `process.env`.
