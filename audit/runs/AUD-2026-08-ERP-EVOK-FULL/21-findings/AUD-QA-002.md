FINDING_ID: AUD-QA-002

TITLE: Regressão de performance real (não teste lento): fan-out de JOINs em SequelizeTraceabilityRepository.getItemHistory sem paginação, `separate:true` ou limite — cresce sem cota com o volume de dados
DOMAIN: Qualidade / Rastreabilidade
SUBDOMAIN: Performance de query / Clean Architecture (infrastructure layer)

SEVERITY: HIGH
CONFIDENCE: CONFIRMED

DESCRIPTION:
`GET /api/traceability/items/:id` (ISO 9001:2015 §8.5.2, rastreabilidade
de item) executa uma única chamada `Product.findByPk(itemId, { include: [...] })`
com 3 associações-irmãs de primeiro nível, todas `hasMany`/`belongsToMany`
implícitas via alias (`movements`, `lot_controls`, `production_lot_consumptions`),
e a segunda delas (`lot_controls`) tem, por sua vez, uma associação aninhada
`hasMany` (`production_consumptions`) que carrega mais duas associações
(`productionOrder`, `user`). O Sequelize, por padrão, resolve includes
aninhados com múltiplos `hasMany` no mesmo nível através de `LEFT JOIN`
numa única query SQL — sem `separate: true` nas associações `hasMany`, o
resultado sofre "fan-out": se um produto tem M movimentações, N lotes e cada
lote tem K consumos em produção, o banco retorna aproximadamente M×N×K linhas
brutas antes do Node desduplicar em memória. Não há `limit`, não há
`separate: true` em nenhuma das associações `hasMany`, não há filtro de
período nem paginação — o endpoint carrega o histórico VITALÍCIO do item.
Isso bate exatamente com o sintoma medido: a query relacionada a
`GET /api/traceability/items/2` levou 12606ms num banco de teste, onde o
produto de fixture (`CI-PRODUCT-001`/id equivalente) acumula lotes e
movimentações de DEZENAS de arquivos de teste que compartilham a mesma
fixture (`server/scripts/run-api-suite.cjs`, comentário nas linhas 237-248
confirma que "o CI-PRODUCT-001 acumula lotes... a cada rodada"). Em produção,
qualquer item com histórico de compras/produção de meses/anos terá o mesmo
comportamento, só que agravado — o pior caso não é limitado, cresce enquanto
o item existir.

EXPECTED_BEHAVIOR:
Endpoint de rastreabilidade deveria (a) usar `separate: true` nas associações
`hasMany` de primeiro/segundo nível para evitar produto cartesiano em SQL, ou
(b) fazer 2-3 queries independentes (uma por tipo de evento) e mesclar em
memória, ou (c) paginar/filtrar por período — qualquer uma dessas opções
evita crescimento não-cotado da latência.

ACTUAL_BEHAVIOR:
Uma única query com JOINs aninhados em múltiplas associações `hasMany`
irmãs, sem `separate`, sem `limit`, sem paginação — 12.6s medidos num banco
de teste com volume de dados de uma suíte de testes, não de produção real.

EVIDENCE:
FILE: server/src/modules/traceability/infrastructure/sequelize/SequelizeTraceabilityRepository.ts
LINES: 58-90 (método getItemHistory — o include composto completo)
Trecho relevante (linhas 60-89):
    include: [
      { model: InventoryMovement, as: 'movements', include: [...] },
      { model: LotControl, as: 'lot_controls', include: [
          ..., { model: ProductionLotConsumption, as: 'production_consumptions', include: [...] }
        ]},
      { model: ProductionLotConsumption, as: 'production_lot_consumptions', include: [...] }
    ]
Nenhuma ocorrência de `separate: true`, `limit`, `offset` ou filtro de data
em todo o arquivo (confirmado por leitura completa, 372 linhas).
Teste que expõe o sintoma: server/tests/integration/traceability-and-audit-log-regression.test.ts, linhas 56-61.

RELATED_REQUIREMENT: RF de rastreabilidade (ISO 9001:2015 §8.5.2, citado em CLAUDE.md §4 "Rastreabilidade")
RELATED_BUSINESS_RULE: N/A
RELATED_USE_CASE: GetItemTraceabilityUseCase
RELATED_TEST: traceability-and-audit-log-regression.test.ts

BUSINESS_IMPACT: Rastreabilidade é usada em auditoria de qualidade/compliance fiscal (lote, NF-e, ISO 9001) — se o endpoint fica lento/indisponível para itens de alto giro (exatamente os itens de maior interesse de auditoria), a evidência de rastreabilidade pode ficar impraticável de obter sob demanda.
TECHNICAL_IMPACT: Latência não-cotada cresce com o tempo de vida do item; em produção pode evoluir para timeout de gateway/HTTP em itens antigos de alto volume, sem que nenhum código tenha "quebrado" recentemente — é uma bomba-relógio de performance.
SECURITY_IMPACT: Nenhum diretamente; risco de disponibilidade (DoS não intencional) sob volume real.

REPRODUCTION:
Rodar `npm run test:integration` várias vezes seguidas no mesmo banco de teste (sem reset) e observar a query de `GET /api/traceability/items/:id` para o produto de fixture compartilhado ficando progressivamente mais lenta conforme mais lotes/movimentações se acumulam.

REFERENCE: Sequelize docs — "Eager loading" / anti-pattern de fan-out com múltiplos `hasMany` sem `separate: true`

RECOMMENDATION: Refatorar `getItemHistory` para usar `separate: true` nas associações `movements`, `lot_controls` e `production_lot_consumptions` (e na aninhada `production_consumptions`), ou substituir por 3 queries independentes com `Promise.all` e merge em memória (mais previsível). Considerar paginação/filtro de período como parâmetro opcional do endpoint. Adicionar teste de performance com dataset volumoso (não só o teste funcional atual) para não deixar a regressão voltar silenciosamente.

SUGGESTED_OWNER: backend-engineer (módulo traceability) — Development Organization

RETEST_REQUIRED: Yes
