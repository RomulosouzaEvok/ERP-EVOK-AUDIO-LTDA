# Varredura dupla — 11 de agosto de 2026 (tarde)

> ## ⚠️ REGISTRO DATADO — varredura de 2026-08-11
>
> Achados **medidos em 2026-08-11**. Cita caminhos de arquivos justamente por
> estarem fora do lugar ou mortos (L-3, L-5) — são a evidência do achado. Parte
> já foi remediada.
>
> Mantido sem reescrita do corpo. Pendências vivas:
> `docs/governance/RESIDUAIS_ABERTOS_2026-08-10.md`.
>
> *Banner adicionado em 2026-08-12, junto com a ampliação das guardas
> documentais (`server/tests/helpers/docsGuardConventions.ts`). O documento
> declara-se registro datado: as guardas param de auditar suas afirmações de
> estado, e o leitor é avisado antes de agir sobre elas.*

**Pedido do dono:** varredura no ERP inteiro ("todo o código, toda a arquitetura")
usando dois agentes — `iterative-review` (defeitos) e `cleanliness-review`
(cruft) — em modo relatório, sem editar.

**Base:** commit `ec54e41`, árvore limpa. **Limitação declarada:** o PostgreSQL
estava fora do ar nesta máquina (Docker Desktop parado), então a suíte de
integração e as 4 guardas de drift **não rodaram** — tudo sobre schema é
leitura de código/migration, não medição no banco.

Os 3 achados de maior peso foram re-verificados pela sessão principal antes de
entrar neste registro (grep/leitura independente do agente que os reportou).

---

## 1. Defeitos confirmados (iterative-review)

### V-1 🔴 Banco novo provisionado por migrations não sobe em produção

`server/src/config/seeds.ts:154` e `:160` — `Directorate.bulkCreate` e
`Department.bulkCreate` **sem `ignoreDuplicates`**, colidindo com as linhas que
as migrations `20260811-000043` e `20260806-000120` já inserem (`code` é
UNIQUE nas duas tabelas). Nenhuma migration insere usuário e o baseline
congelado tem zero `INSERT`, então em banco recém-provisionado `User.count()`
é 0 e o seed roda.

- Em `NODE_ENV=production`: o erro é relançado → `connectDB()` rejeita →
  `process.exit(1)`. **O servidor não sobe** — exatamente o caminho
  documentado do Go-Live.
- Em dev: o erro é engolido, mas `Category.bulkCreate` (linha 168) nunca é
  alcançado; como o admin já foi criado, todo boot seguinte pula o seed e o
  banco fica **permanentemente sem as 7 categorias de produto**.

O commit `ec54e41` não criou o defeito — o `Department.bulkCreate` já colidia
desde `000120`; a diretoria só moveu a explosão uma linha para cima. A
alegação do CLAUDE.md "banco novo nasce igual ao atual" cobria o **schema**;
ninguém tinha testado o **boot** depois do provisionamento.

**Defeito de fundo:** o gate do seed é `User.count()` — uma tabela decide se
as outras cinco são semeadas.

### V-2 🟡 Sala de Comando sem guarda de rota e inventando zeros no erro

`client/src/App.tsx` — `/dashboard` é a única rota do app fora de
`ModuleRoute`/`RoleRoute`, apesar de o menu declarar `module: 'diretor'`.
`CommandCenterPage.tsx` não trata `isError` em nenhuma das 4 queries: com 403
(usuário sem os módulos de relatório) ou API fora, `chainTotal` dá 0 e a tela
renderiza **check verde + "Nenhum documento em circulação no período"** — um
fato de negócio falso ("fábrica parada") na tela da diretoria.

### V-3 🟡 `access_profiles.department_id` e `directorates` são dado morto

Zero leituras e zero escritas fora do backfill da migration `000043`. Perfil
criado via `POST /api/access-profiles` nasce `NULL` sem reclamação;
`seed-usuarios-departamentos.cjs --limpar` + `semear` destrói o backfill dos
perfis de teste. Nenhum relatório agrega por diretoria — a motivação declarada
do F-6 continua verdadeira: entregou-se o **schema**, não o **recurso**.

### V-4 🟡 Departamento ativo se perde na aba OEE

`AppLayout.tsx:508-518` — item com `?` exige igualdade exata de URL, sem
fallback por pathname. Trocar de aba dentro de `/reports` (ex.: OEE) gera URL
sem item de menu correspondente → a barra troca para "Início" com o conteúdo
de OEE na tela. Mesma família do F1; a guarda nova só valida o sentido
"`?tab=` declarado → aba existe", não o inverso.

### V-5 🟡 `ReportsPage` com zero abas renderiza Produção assim mesmo

`ReportsPage.tsx:191-194, 366` — `initialTab` cai em `?? 'production'` e as
seções condicionam só a `tab`, nunca a `availableTabs.includes(tab)`. Usuário
só com `relatorios.financeiro` abrindo link `/reports?tab=purchasing` vê o
aviso "sem permissão para nenhum relatório" **e** a seção Produção, que
dispara uma chamada garantidamente 403.

### V-6 🔵 Escapes conhecidos nas guardas novas

- `audit-coverage-guard`: considera módulo auditado se a **string**
  `logAction` aparecer em qualquer lugar (até comentário); mede presença, não
  cobertura.
- `docs-reality-drift-guard`: `✔ aplicada` na linha silencia qualquer
  alegação.

### V-7 🔵 Fonte dupla do mapa departamento→diretoria

`migrations/20260811-000043` (`DEPARTMENT_TO_DIRECTORATE`) ×
`seeds.ts` (`DEPARTMENT_DIRECTORATE`) — hoje idênticas (conferidas entrada a
entrada), mas nenhuma guarda cruza as duas.

### Verificações que passaram

- `Directorate.ts`/`Department.ts`/`AccessProfile.ts` batem coluna a coluna
  com a migration `000043`; o `down()` reverte de verdade.
- **511 chamadas do client × 629 endpoints do backend: zero divergências.**
- 52/52 routers com `authenticate`; só `/api/webhooks` fora, por desenho
  (HMAC).
- `IssueSaleNfeUseCase`: padrão reserva→provedor→commit com locks corretos.

---

## 2. Cruft confirmado (cleanliness-review)

### L-1 🟡 O ERP mostra dinheiro em formatos divergentes — já visível ao usuário

Não existe `client/src/lib/format.ts`; são ~15 formatadores de moeda e ~20 de
data por página. **Contabilidade/Tesouraria/Orçamento** mostram `R$ 1.234,56`;
**Financeiro, Logística, Compras, Vendas e RFQ** mostram `R$ 1234.56` (sem
milhar, ponto decimal). `formatDate`/`formatDateTime`/`toDateInputValue` estão
byte a byte idênticos em 5 arquivos `*Shared.tsx`.

### L-2 🟡 Lógica de negócio sombra: `server/src/services/{dashboard,report}Service.ts`

249 linhas, **zero consumidores** (verificado por grep independente),
consultando o model **legado `Product`** — o par que diverge sem ninguém
notar, mesma forma da dor das duas BOMs.

### L-3 🟡 Teste de FKs críticas fora do runner

`server/__tests__/database/05_add_critical_foreign_keys.test.ts` —
`jest.config.cjs` tem `roots: ['<rootDir>/tests']`; o arquivo nunca executa.
Mesma classe das 34 suítes que pulavam em silêncio (10/08).

### L-4 🟡 Helper morto que era uma trava

`shared/presentation/pagination.ts` (0 consumidores) existe para aplicar
`PAGINATION_MAX_LIMIT = 100`. Sem ele, controllers fazem `parseInt(limit)` sem
teto e nenhum validator tem `max: 100`. Também mortos:
`shared/utils/dates.ts`, `shared/presentation/httpResponse.ts` (650
`success: true` à mão vs. helper com 0 imports).

### L-5 🔵 Código morto pontual

- `client/src/pages/maintenance/MaintenancePage.tsx` (78 linhas, sem rota nem
  import; docblock descreve agrupamento que não existe mais)
- `server/src/modules/products/`: `ChangeProductStatusUseCase`,
  `CreateProductRevisionUseCase`, `ProductMapper` — sem rota, controller ou
  teste (scaffolding especulativo declarado)
- 9 componentes shadcn sem importador + deps só deles (`recharts`, `cmdk`,
  4 `@radix-ui/*`)
- Constantes exportadas sem consumidor em 6 arquivos `*Shared`

### L-6 🔵 Comentários que mentem

- `AppLayout.tsx:582-584` cita `NAV_SECTIONS`, que não existe mais
- 15 comentários de seção citam `departments.id` serial ("departamento 15") —
  a chave que `departments.ts:99` proíbe usar, deslocada em +1 do `code`
- 8 controllers dizem que o controller antigo "permanece no repositório" —
  `server/src/controllers/` foi removida; 51 arquivos citam caminhos
  inexistentes em notas de proveniência
- Narração de processo em `AppLayout.tsx` (109-118, 147-152, 170-172,
  223-224, 294-303) — história do PR, já registrada em commit/auditoria

### L-7 🔵 Achado que NÃO é limpeza: lacuna funcional de frontend

~78 funções em `client/src/api/*` sem chamador (`updateSupplier`,
`deactivateSupplier`, `updateProduct`, `closeNonConformity`…) são **backend
implementado sem tela** — backlog funcional, não cruft. Não apagar.

### Deliberadamente não tocado

Comentários de decisão (NULL de SST, não-uso de `parent_id`, 422 do G1),
tabelas DEPRECATED em português (**nenhum código novo escreve nelas** —
verificado), duplicação declarada `mobile/`×`tv/`, scripts one-shot de
backfill, 3 controllers falando Sequelize direto (refatoração, não limpeza).

---

## 3. Cobertura honesta — o que esta varredura NÃO viu

- **Os 47 módulos de negócio não foram auditados a fundo.** Gates D-K
  (segregação de função), D-L (quarentena × faturamento), G6 e alçada por
  origem **não foram exercitados adversarialmente**.
- Suíte de integração e guardas de drift não rodaram (PostgreSQL fora do ar).
- `mobile/` e `tv/` só estaticamente (limpos; 0 console.log, 0 órfãos).
- 151 páginas do client cobertas mecanicamente, não uma a uma.
- Conteúdo das 165 migrations; qualidade interna dos 1811 testes unitários.

**Recomendação registrada:** com o Docker de pé, segunda passada do
`iterative-review` focada nos 47 módulos e nos gates de negócio.

---

## 4. Remediação aplicada (mesma tarde)

| Achado | O que foi feito | Prova |
|---|---|---|
| **V-1** | `ignoreDuplicates: true` nos 3 `bulkCreate` de `seeds.ts` + releitura das diretorias via `findAll` (instância de linha pré-existente não traz `id`) | **Escrita real:** banco descartável `seed_boot_check` provisionado só pelas 165 migrations → `seedDatabase()` completou: 1 admin, 5 diretorias, 17 departamentos (16 vinculados; SST NULL por desenho) e **7 categorias criadas** — o caminho que antes abortava |
| **V-2** | `/dashboard` entrou em `ModuleRoute module="diretor"`; `CommandCenterPage` trata `isError` em todas as queries — KPI vira `—`, a cadeia vira `—` e o diagnóstico vira aviso vermelho em vez do check verde falso | typecheck + build + 83 testes de client |
| **L-1** | Criado `client/src/lib/format.ts` (formatCurrency/formatDate/formatDateTime/toDate*InputValue). Os 9 pontos com `R$ ${toFixed}` (Financeiro, Logística, Compras, RFQ, Vendas) e as 14 definições locais duplicadas (5 `*Shared`, budget, treasury, accounting, 3 `formatDate` idênticos) apontam para o canônico. Exceção deliberada: `ComexPage.formatMoney` (página mistura moeda estrangeira e nacionalizada — decisão à parte) e formatadores com fallback próprio (`'Não registrado'`, timezone UTC) | build + testes verdes; grep: zero `R$ ${` restante fora do COMEX |
| **L-2/L-5** | Removidos: `services/{dashboard,report}Service.ts`, `shared/utils/dates.ts`, `shared/presentation/httpResponse.ts`, os 3 arquivos órfãos de `modules/products/`, `MaintenancePage.tsx` (zero consumidores, verificado por grep independente) | typecheck + 1816 unitários |
| **L-3** | Teste de FKs críticas movido de `__tests__/database/` (fora do runner) para `tests/integration/critical-foreign-keys-guard.test.ts`, com gate `RUN_INTEGRATION` | **Roda de verdade agora:** suíte de integração passou de 44 para **45 suítes (172 testes), tudo verde** contra Postgres real |
| **L-6** | `AppLayout.tsx`: menção a `NAV_SECTIONS` corrigida, 15 números seriais de departamento removidos dos comentários, narração de processo enxugada; 8 controllers pararam de afirmar que `server/src/controllers/` "permanece no repositório" | grep zero ocorrências |
| **Novo (achado na validação)** | **`npm run build` do client estava quebrado desde `fdb544c`**: as guardas novas usam `node:fs` e `tsconfig.app.json` incluía os testes no build (TS2591). Confirmado por stash que pré-existia. Corrigido com `exclude` de `*.test.*` no `tsconfig.app.json` | build verde |
| Dublê de `Directorate` | `seeds-production-boot.test.ts` ganhou `findAll` no mock (a guarda pegou a mudança do seed — rede funcionando) | 5/5 verdes |

**Validação final:** server typecheck ✅ · 1816 unitários ✅ · **45 suítes / 172
testes de integração contra PostgreSQL real ✅** · client: build ✅, 83 testes ✅,
lint só com warnings pré-existentes.

**Permanecem abertos** (para o próximo retrato de residuais): V-3
(directorates/`access_profiles.department_id` sem consumidor — schema entregue,
recurso não), V-4 (departamento ativo se perde em aba sem item de menu), V-5
(ReportsPage com zero abas renderiza Produção), V-6 (escapes das guardas),
V-7 (mapa duplicado seed×migration sem guarda), L-4 (adotar `paginate()` com
teto de `limit` — o helper foi mantido para isso), L-7 (backlog funcional das
~78 funções de API sem tela) e a lacuna de cobertura da seção 3 (47 módulos +
gates D-K/D-L/G6).

---

**Auditores:** agentes `iterative-review` e `cleanliness-review`, escopo total,
modo relatório; re-verificação amostral pela sessão principal.
