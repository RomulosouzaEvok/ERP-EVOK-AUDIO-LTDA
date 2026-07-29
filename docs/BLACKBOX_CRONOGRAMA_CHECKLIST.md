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
| MRP | Motor puro em TypeScript existente, ainda sem persistencia/API. |
| BOM | Implementacao atual ainda usa `Product`, `BillOfMaterial`, `BillOfMaterialItem`. |
| Schema alvo | Scripts SQL ja definem `items`, `item_estruturas`, `mrp_ordens_planejadas`. |
| Rastreabilidade | Parcial; estoque gera movimentacao, mas falta lote/serie ponta a ponta. |

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

## 4. F1 - Models Canonicos Industriais

### Objetivo

Criar a camada persistente alinhada ao modelo industrial real:

- `items`
- `item_estruturas`
- `mrp_ordens_planejadas`

### Checklist

- [ ] Criar `server/src/models/Item.ts`.
- [ ] Criar `server/src/models/ItemEstrutura.ts`.
- [ ] Criar `server/src/models/MrpOrdemPlanejada.ts`.
- [ ] Registrar associations em `server/src/models/index.ts`.
- [ ] Usar `DataTypes.DECIMAL(18, 6)` para quantidades industriais.
- [ ] Usar enum industrial:
  - `MATERIA_PRIMA`
  - `SUBCONJUNTO`
  - `PRODUTO_ACABADO`
- [ ] Garantir que item pai nunca seja igual ao componente.
- [ ] Garantir `ON DELETE RESTRICT` em relacionamentos de estrutura.

### Criterio de Aceite

- [ ] Models compilam.
- [ ] Associations carregam sem erro.
- [ ] Nenhum campo industrial de quantidade usa `INTEGER`.

## 5. F2 - BOM Canonica

### Objetivo

Criar repositories e use cases para operar BOM multinivel com `Item` e `ItemEstrutura`.

### Checklist

- [ ] Criar `server/src/modules/items`.
- [ ] Criar repository `ItemRepository`.
- [ ] Criar repository `ItemEstruturaRepository`.
- [ ] Criar use case `CreateItemUseCase`.
- [ ] Criar use case `CreateItemStructureUseCase`.
- [ ] Criar use case `ExplodeItemStructureUseCase`.
- [ ] Detectar ciclos recursivos.
- [ ] Agregar componentes repetidos na explosao.
- [ ] Bloquear estrutura inativa no calculo.
- [ ] Criar rotas:
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

- [ ] Criar `server/src/modules/mrp/domain/repositories/MrpRepository.ts`.
- [ ] Criar `SequelizeMrpRepository.ts`.
- [ ] Criar `GenerateMrpPlanUseCase.ts`.
- [ ] Ler demandas reais ou payload manual.
- [ ] Ler `item_estruturas` ativas.
- [ ] Ler estoque, reserva, seguranca, lote minimo e lead time de `items`.
- [ ] Persistir em `mrp_ordens_planejadas`.
- [ ] Evitar duplicidade por item/origem/data.
- [ ] Criar rota `POST /api/mrp/plan`.
- [ ] Criar rota `GET /api/mrp/planned-orders`.

### Criterio de Aceite

- [ ] MRP gera ordens planejadas.
- [ ] MRP respeita estoque disponivel.
- [ ] MRP respeita lote minimo.
- [ ] MRP calcula data de liberacao pelo lead time.
- [ ] Rodar teste unitario e teste de integracao.

## 7. F4 - Rastreabilidade Total

### Objetivo

Fechar a cadeia de custodia: requisicao, entrada, lote, consumo, OP e produto acabado.

### Checklist

- [ ] Entrada de compra deve criar ou associar lote.
- [ ] Baixa de producao deve informar lote consumido.
- [ ] Produto acabado deve gerar lote ou numero de serie.
- [ ] Movimento de estoque deve registrar:
  - `item_id`
  - `lote_id`
  - `numero_serie_id`
  - `origem_tabela`
  - `origem_id`
  - `usuario_id`
  - `correlation_id`
- [ ] Criar consulta de rastreabilidade:
  - `GET /api/traceability/items/:id`
  - `GET /api/traceability/lots/:id`
  - `GET /api/traceability/production-orders/:id`

### Criterio de Aceite

- [ ] Dado um produto acabado, localizar todos os insumos consumidos.
- [ ] Dado um lote de materia-prima, localizar todas as OPs que consumiram esse lote.
- [ ] Dado uma entrada de NF, localizar os movimentos e consumos derivados.

## 8. F5 - Protecao de Item Vinculado

### Objetivo

Impedir perda historica por exclusao/alteracao indevida.

### Checklist

- [ ] Bloquear exclusao fisica de item.
- [ ] Usar soft delete/status `INATIVO`.
- [ ] Antes de inativar, verificar:
  - BOM ativa
  - OP aberta
  - OP historica
  - movimento de estoque
  - lote/serie vinculado
- [ ] Retornar erro 409 em conflito.

### Criterio de Aceite

- [ ] Item vinculado a BOM ativa nao pode ser removido.
- [ ] Item com movimento historico nao pode ser removido fisicamente.

## 9. F6 - Validacao e Sanitizacao

### Objetivo

Fechar entrada insegura e busca ampla indevida.

### Checklist

- [ ] Criar schemas Zod para rotas criticas.
- [ ] Validar quantidades `> 0`.
- [ ] Validar escala decimal ate 6 casas.
- [ ] Validar enums industriais.
- [ ] Sanitizar todos os `Op.like` com `Validators.sanitizeSearch`.
- [ ] Rejeitar campos desconhecidos em payloads criticos.

### Pontos Atuais Para Corrigir

- `server/src/modules/products/infrastructure/sequelize/SequelizeProductRepository.ts`
- `server/src/modules/suppliers/infrastructure/sequelize/SequelizeSuppliersRepository.ts`

### Criterio de Aceite

- [ ] Busca com `%` ou `_` nao faz wildcard injection.
- [ ] Payload invalido retorna 400 com erro estruturado.

## 10. F7 - Testes de Integracao

### Objetivo

Executar fluxos reais contra API e PostgreSQL.

### Checklist

- [ ] Configurar banco PostgreSQL de teste.
- [ ] Criar usuario/token de teste.
- [ ] Configurar:
  - `TEST_API_URL`
  - `TEST_AUTH_TOKEN`
  - `TEST_PRODUCT_ID`
  - `TEST_SUPPLIER_ID`
  - `TEST_LOW_STOCK_PRODUCT_ID`
  - `TEST_BOM_LINKED_PRODUCT_ID`
- [ ] Rodar:

```bash
RUN_INTEGRATION=true npm run test:integration
```

### Criterio de Aceite

- [ ] Fluxo compra/aprovacao passa.
- [ ] Concorrencia de estoque nao deixa saldo negativo.
- [ ] Webhook n8n/IA responde 200 ou 202.

## 11. F8 - DevSecOps

### Objetivo

Preparar producao Ubuntu 24.04 sem segredo hardcoded.

### Checklist

- [ ] Criar `.env.example` final.
- [ ] Remover senha fallback do seed admin.
- [ ] Em producao, falhar se `ADMIN_SEED_PASSWORD` nao existir.
- [ ] Revisar `npm audit`.
- [ ] Nao usar `npm audit fix --force` sem revisao.
- [ ] Criar `docs/DEPLOY.md`.

### Criterio de Aceite

- [ ] Nenhum segredo hardcoded.
- [ ] Deploy documentado.
- [ ] Rollback documentado.

## 12. Comandos de Validacao Final

```bash
cd server
npm run typecheck
npm run build
npm test
RUN_INTEGRATION=true npm run test:integration
```

## 13. Varredura Obrigatoria

```bash
rg -n "MySQL|mysql|DB_DIALECT|MONGODB_URI|ERP antigo|password.*=.*['\"]|token.*=.*['\"]" server/src server/config server/package.json
```

O resultado esperado e vazio, exceto usos legitimos de `process.env`.
