# T-20 — QUALIDADE E TESTES · RELATÓRIO DE TRILHA

> **Nota de persistência.** Produzido pelo `vericore-qa-auditor` (T-20 qualidade e testes) e persistido
> **sem alteração de conteúdo** pelo orquestrador — o agente é read-only por
> desenho e não pode escrever em `audit/`. O juízo de auditoria é
> integralmente da trilha. Única transformação aplicada: promoção do
> cabeçalho a H1 e desescape de entidades HTML.

---

```
AUDIT_ID:  ERP-LEGACY-001-AUD-001
AUDIT_COMMIT: c1311a6f76b512fef893f7e60d934179cae3409f
TRILHA:    T-20 — QUALIDADE E TESTES
TITULAR:   vericore-qa-auditor
REGIME:    read-only reforçado (APR-2026-016) — nenhum teste executado, nenhuma conexão de banco
COBERTURA EFETIVA:
  - 246 arquivos de teste inventariados (177 unit + 59 integration + 1 edge + 9 characterization)
  - Lidos integralmente: ~24 arquivos (amostra dirigida por G3 + controles compensatórios citados
    pelas 19 trilhas anteriores + os 2 arquivos de OBS-INV-06)
  - Censo estrutural (grep) aplicado a 100% dos 246 arquivos: describe.skip/it.skip/test.skip/
    xit/xdescribe/.todo/expect(true)-vacuous/jest.mock por arquivo
  - NÃO lidos linha a linha: ~222 arquivos restantes — risco residual declarado em RES-T20
```

### Método aplicado
READ (código de teste + produção referenciada) → ANALYZE (o que cada asserção realmente prova) → VERIFY (cruzamento com o código de produção real, sem executar) → PROVE (âncora arquivo:linha) → CLASSIFY (testado / testado-só-caminho-feliz / sem teste / teste que mocka o próprio objeto verificado) → REPORT.

---

### 1. Censo estrutural (100% dos 246 arquivos)

| Padrão | Ocorrências | Achado |
|---|---|---|
| `it.skip(` / `test.skip(` / `xit(` / `xdescribe(` | **0** | Nenhuma. |
| `.todo(` | **0** | Nenhuma. |
| `expect(true).toBe(true)` / vacuous assert | **0** | Nenhuma. |
| `describeIntegration = hasIntegrationPrerequisites()\|integrationEnabled() ? describe : describe.skip` | **59 de 59** arquivos de integração + `edge` + 2 arquivos de `characterization` | Ver §2 — não é finding isolado, é o desenho **da suíte inteira**. |
| `jest.mock(` de módulo inteiro | 140 ocorrências em 69 arquivos unit | Uso majoritariamente legítimo (isolamento de `config/database`, `models/index`, serviços adjacentes). Um caso mocka exatamente o objeto sob verificação — já registrado por T-16 (`T16-F03`), confirmado por leitura direta (§3). |

**Conformidade T20-C01 (peso equivalente a um finding):** a suíte não tem nenhum `it.skip`/`.todo`/asserção vazia em lugar nenhum do repositório. Isso não é acidental: `server/scripts/assert-jest-no-skips.cjs` falha o CI (`numPendingTests`/`numPendingTestSuites`/`numTodoTests` > 0 ⇒ exit 1) e é chamado tanto para `test:unit:strict` (`server/package.json:23`) quanto, via `run-api-suite.cjs:511-513`, para toda suíte de `integration`/`edge`/`characterization` rodada por `test:api:strict`. É um controle de qualidade real, não decorativo — e o padrão `describe.skip` condicional dos 59 arquivos de integração **é auditado por este mesmo mecanismo em CI** (skip “vazando” sem rodar nada faria `numPendingTestSuites>0` e derrubaria o pipeline).

---

### 2. `T13-F06` generalizado — risco real, mas não onde T-13 apontou

T-13 registrou `schema-model-drift-guard.test.ts` como guarda unidirecional que "passa verde sem ter verificado nada" fora do modo integração. Confirmei por leitura: **o mesmo padrão `describeIntegration = … ? describe : describe.skip` está em TODOS os 59 arquivos de `server/tests/integration/*.test.ts`**, no arquivo de `edge` e em 2 de 9 arquivos de `characterization` — não é uma exceção isolada, é a arquitetura padrão de toda a camada de integração.

- **Em CI** (`.github/workflows/server-ci.yml:71-73` → `test:api:strict` → `run-api-suite.cjs`): `RUN_INTEGRATION='true'` é setado explicitamente (`run-api-suite.cjs:582`) e `assert-jest-no-skips.cjs` roda depois de cada suíte (`:512`). **Neste caminho o risco está mitigado** — se um arquivo caísse silenciosamente em `describe.skip`, o job falharia.
- **Fora de CI** (qualquer `npm run test` ou `npm run test:integration:skipped` local sem `RUN_INTEGRATION=true`/sem `.env.test`): as 59 suítes de integração relatam **verde com zero asserções executadas**, sem nenhum aviso — exatamente o sintoma que T-13 descreveu para um arquivo, mas em escala de suíte inteira. Não há guarda equivalente a `assert-jest-no-skips` fora do fluxo `run-api-suite.cjs`/CI.

#### `T20-F01` — A suíte de integração inteira (59+ arquivos) roda "verde sem verificar nada" fora do único caminho de execução com o guard, sem aviso ao desenvolvedor
**Severidade: MEDIUM · Confiança: ALTA**
**Impacto:** um desenvolvedor local, ou uma automação futura que rode `jest tests/integration` sem reproduzir exatamente `run-api-suite.cjs` (ex.: IDE "run test file", ou um segundo workflow de CI adicionado sem os mesmos env vars), obtém 100% de suítes passando sem uma única query ao Postgres ter sido feita — sem qualquer diferença visível no output de `jest` padrão (sem `--json`) entre "passou de verdade" e "passou porque pulou". Generaliza o achado pontual de `T13-F06` para toda a trilha de testes de integração/idempotência/concorrência/RBAC HTTP.
**Âncora:** `server/tests/helpers/testApi.ts:102-104` (`hasIntegrationPrerequisites`); 59 ocorrências do padrão em `server/tests/integration/*.test.ts` (lista completa no censo acima); `server/scripts/run-api-suite.cjs:582` (único ponto que injeta `RUN_INTEGRATION=true`); ausência de equivalente a `assert-jest-no-skips.cjs` fora desse caminho.
**Fronteira:** não é finding de cobertura percentual (território `test-coverage-auditor`) nem de infraestrutura de CI (território `sdet-auditor`/`cicd-auditor`, T-22) — é sobre a suíte **declarar** verificação que não fez, silenciosamente, para quem não reproduzir exatamente o comando de CI.

---

### 3. Teste que mocka o próprio objeto de verificação

Confirmei por leitura direta o achado já registrado por T-16 (`T16-F03`), sem duplicar o finding:

`server/tests/unit/marketing-material-use-cases.test.ts:93-95` reseta `uploadFile`/`deleteFile` a cada `beforeEach`, e o único teste do fluxo de upload (`:113-127`) fornece um `mockResolvedValue` manual para `uploadFile` — **a validação real de `deriveAllowedMimes`/magic bytes dentro de `uploadService.ts` nunca é chamada**, porque o serviço inteiro é `jest.mock`. O teste prova que `UploadMaterialFileUseCase` chama `uploadFile` e grava o retorno; não prova que arquivos de vídeo são rejeitados nem que PDFs de verdade são aceitos — que é exatamente o defeito real descrito por `T16-F03`. **Confirmação independente, mesma âncora.**

**Busca por recorrência do padrão em RBAC (investigação dirigida, não confirmada como defeito):** `server/tests/unit/rbac-critical-routes.test.ts` substitui `authenticate`/`authorizeModule` reais (`src/middlewares/auth.ts`) por uma reimplementação em memória (`createAuthMock()`, `:28-84`) para testar se 17 arquivos de rota **conectam** `authorizeModule(moduleKey, level)` corretamente. À primeira vista isso parece o mesmo padrão de T16-F03/T13-F06 — mas verifiquei que **não é**: a lógica real de `authorizeModule` (admin bypass, `NO_ACCESS_PROFILE`, `MODULE_ACCESS_DENIED`, `APPROVAL_LEVEL_REQUIRED`) é testada com a função real, sem mock, em `server/tests/unit/access-profiles.test.ts:42-174` (import direto de `../../src/middlewares/auth`), e o caminho HTTP fim-a-fim com Postgres real é coberto para o módulo `produtos` em `server/tests/integration/rbac-module-access-denied.test.ts`. Registro isso como:

**Conformidade T20-C02:** separação de responsabilidades correta entre "a lógica de autorização está certa" (unit, função real) e "a rota está fiação corretamente à função" (unit, fake controlado, para não depender de banco). Contraexemplo direto ao padrão viciado de T16-F03.

**`T20-F02` — 16 das 17 rotas "críticas" só têm a fiação testada com fake; a integração real (rota real × `authorizeModule` real × Postgres real) só existe para 1 (`produtos`)**
**Severidade: MEDIUM · Confiança: MÉDIA**
Se um dia o `authorizeModule` real e o fake de `rbac-critical-routes.test.ts` divergirem sutilmente (ex.: uma mudança de assinatura, um novo modo de bypass introduzido só no real), nenhum teste unitário pegaria — só o E2E pegaria, e ele só existe para `produtos`, `legacy-routes-rbac-regression.test.ts` e `rbac-maintenance-service-orders-access-denied.test.ts` (não li estes dois por completo; ver RES-T20-01). As outras 14+ rotas listadas em `rbac-critical-routes.test.ts:158-363` (vendas, recebimento, estoque, qualidade/lote `approve`, contagens `approve`, produção, chão de fábrica, BOM, MRP, financeiro, requisições, centros de trabalho, patrimônio, fornecedores, clientes, não-conformidades) nunca são exercitadas com o middleware real e banco real na mesma execução.
**Âncora:** `server/tests/unit/rbac-critical-routes.test.ts:158-363`; `server/tests/integration/rbac-module-access-denied.test.ts` (única E2E confirmada por leitura).

---

### 4. `OBS-INV-06` — as 2 falhas pré-existentes: uma raiz encontrada por leitura, uma não

#### `T20-F03` — `onda3-shipping-cockpit-cashflow.test.ts`: causa raiz identificável estaticamente — inconsistência de fuso horário entre geração e leitura de data em `GetCashFlowProjectionUseCase`
**Severidade: MEDIUM · Confiança: ALTA (leitura estática) / requer DYN-T20-01 para confirmação dinâmica**

`GetCashFlowProjectionUseCase.ts:107,117` faz `new Date(row.due_date)` sobre uma string `YYYY-MM-DD` vinda do banco — isso é interpretado pelo motor JS como **meia-noite UTC**. Em seguida, `startOfWeek`/`toDateOnly` (mesmo arquivo, `:12-32`) usam `getFullYear()/getMonth()/getDate()`, que leem em **fuso horário local do processo**. Em qualquer TZ com offset negativo (ex.: `America/Sao_Paulo`, UTC-3), `new Date("2026-08-17")` vira `2026-08-16T21:00:00-03:00` local — a data "volta" um dia sempre que o dia produzido por `toDateOnly()` (que É local) é lido de volta como UTC. O teste (`server/tests/unit/onda3-shipping-cockpit-cashflow.test.ts:140-153,192-206`) gera `due_date` com `toDateOnly()` **local** e depois espera que a mesma data caia na mesma semana (`mondayOf`) calculada **local** — a inconsistência só se manifesta quando o dia gerado (hoje+3) cruza uma fronteira de semana (segunda-feira) sob TZ ≠ UTC, o que bate com a descrição de "asserção relativa a data" registrada em `CHARACTERIZATION_TESTS.md:58-59` como falha pré-existente.
**Impacto em produção:** o mesmo bug existe no código real, não só no teste — `GetCashFlowProjectionUseCase` pode alocar um título de vencimento numa semana errada da projeção de fluxo de caixa dependendo do fuso horário do processo Node em produção vs. o fuso do usuário que lê o dado. Não é só "teste frágil" — é candidato a bug funcional real no cash-flow projection (escalono à trilha financeira, T-07, para avaliação de severidade de negócio).
**Âncora:** `server/src/modules/financial/application/use-cases/GetCashFlowProjectionUseCase.ts:27-32,107,117`; `server/tests/unit/onda3-shipping-cockpit-cashflow.test.ts:140-153,192-206`.

#### `RES-T20-01` — `docs-path-reference-guard.test.ts`: mecanismo do teste é sólido; não determinei QUAL caminho está quebrado
O arquivo é bem desenhado: regex ancorada (`:81-82`), regras de isenção explícitas e documentadas (R1-R6), e uma seção de **auto-verificação** (`:182-231`) que prova que a própria guarda reprova quando deve — nenhum sinal de `skip`/`todo`/mock que anule a verificação. A falha "pré-existente" citada em `CHARACTERIZATION_TESTS.md:57-58` é, portanto, mais provavelmente um **caso real** de drift documental (algum `docs/**/*.md` ou `CLAUDE.md` cita um caminho que não existe mais no AUDIT_COMMIT) do que um defeito do teste. Identificar QUAL citação está quebrada é uma varredura de 172 `.md` que pertence à fronteira de **T-23 (Documentação × Código)** — não dupliquei esse trabalho aqui para não colidir com o titular daquela trilha. Escalono.

---

### 5. Teste de concorrência com asserção fraca (contraste dentro da própria categoria)

Comparação de 3 arquivos da mesma família ("duas requisições HTTP simultâneas contra a mesma linha"):

| Arquivo | Asserção |
|---|---|
| `stock-concurrency.test.ts:32` | `expect(statuses.some(s => [400,409,422].includes(s))).toBe(true)` — só prova que **pelo menos uma** das duas falhou |
| `sale-cancel-concurrency.test.ts:96-97` | `expect(successCount).toBe(1); expect(failureCount).toBe(1)` — prova exatamente 1-1 |
| `inventory-count-claim-concurrency.test.ts:149-164` | prova exatamente 1-1, **e** relê o estado final via `GET` para confirmar que não ficou "meio atribuída" |

#### `T20-F04` — `stock-concurrency.test.ts` não prova a invariante que alega proteger
**Severidade: MEDIUM · Confiança: ALTA**
A asserção `.some(...)` passa mesmo se: (a) as duas requisições tiverem tido sucesso e uma terceira causa externa (não simulada) tivesse retornado erro; (b) o servidor caísse em 500 numa delas por outro motivo, mascarado como "proteção funcionando". O teste não verifica **o estado final do estoque** (não faz `GET` de conferência, ao contrário do padrão correto em `inventory-count-claim-concurrency.test.ts:156-164`), então não prova que o saldo nunca fica negativo — só que "algo, em algum lugar, retornou um erro esperado". Comparado a `sale-cancel-concurrency.test.ts` e `inventory-count-claim-concurrency.test.ts`, que testam exatamente a mesma classe de risco com rigor muito maior, este é o caso — dentro da própria trilha de idempotência/concorrência exigida pelo Master Spec §20 — mais fraco.
**Âncora:** `server/tests/integration/stock-concurrency.test.ts:23-33` (contraste: `server/tests/integration/sale-cancel-concurrency.test.ts:84-98`; `server/tests/integration/inventory-count-claim-concurrency.test.ts:124-165`).

---

### 6. Conformidades registradas com o mesmo peso de finding

- **T20-C01** — zero `it.skip`/`test.skip`/`.todo`/asserção vazia em 246 arquivos, com gate de CI (`assert-jest-no-skips.cjs`) que reprovaria a introdução de qualquer um.
- **T20-C02** — separação correta entre teste de lógica de autorização (função real, `access-profiles.test.ts`) e teste de fiação de rota (fake controlado, `rbac-critical-routes.test.ts`); não é o padrão viciado de T16-F03.
- **T20-C03** — `schema-model-drift-guard.test.ts` tem `KNOWN_EXCEPTIONS` vazio por desenho (`:51-54`) — não virou depósito de exceções silenciosas (já registrado por T-13, corroborado aqui).
- **T20-C04** — `sale-cancel-concurrency.test.ts` e `inventory-count-claim-concurrency.test.ts` são exemplares de teste de concorrência real (`Promise.allSettled`, contagem exata de vencedores/perdedores, releitura do estado final via GET) — controle compensatório genuíno para a idempotência exigida pelo Master Spec §20.

---

### 7. Limites de método declarados (não contornados)

- **`OBS-INV-03`** — os 33 blocos estáticos que geram 66 casos em laço (característica de `comercial-financeiro--maquina-estados-venda-shipped.test.ts` e irmãos) não são auditáveis por contagem estática de `it(`; qualquer afirmação de "quantos cenários realmente rodam" exige `DYN-T20-01`.
- **`RES-T20-02`** — não li os ~222 arquivos de teste restantes linha a linha (orçamento de 4S não comporta). Priorizei tier 1/tier 2, G3 (auth/authz/financeiro/estoque/integridade/contratos/permissões administrativas) e os controles compensatórios já citados pelas 19 trilhas anteriores. Risco residual: padrões como o de `T16-F03` ou `T20-F04` podem existir em arquivos não lidos — o censo estrutural (grep) cobre sintaxe (`skip`/`todo`/mock de módulo inteiro), não cobre "asserção fraca que não mocka nada mas também não prova nada" fora da amostra lida.
- **`RES-T20-03`** — não determinei se `legacy-routes-rbac-regression.test.ts` e `rbac-maintenance-service-orders-access-denied.test.ts` cobrem, com middleware real + banco real, alguma das 14 rotas de `rbac-critical-routes.test.ts` além de `produtos` — não os li por completo. Se cobrirem, `T20-F02` deve ter a severidade revista para baixo.
- **`RES-T20-04`** — regra de negócio (BR-ID) sem nenhum teste correspondente: não fiz o mapeamento completo BR→teste (exigiria cruzar `docs/business/BUSINESS_RULES.md` inteiro com os 246 arquivos); o que registrei é a granularidade de padrão estrutural, não de regra individual. Escalono para o diretor se um mapeamento BR×teste completo for exigido — está fora do que o esforço de 4S permite junto com o restante do escopo.

---

### 8. Evidência dinâmica solicitada (não executada)

| ID | Comando exato | Por que o estático não basta |
|---|---|---|
| `DYN-T20-01` | `cd server && npm run test:unit:strict && npm run test:api:strict` (ambiente descartável, banco de teste isolado) | Confirma/refuta `OBS-INV-06` (2 falhas), materializa os 66 casos gerados em laço (`OBS-INV-03`) e prova se `T20-F03` (bug de fuso) reproduz de fato sob o TZ do runner |
| `DYN-T20-02` | `TZ=America/Sao_Paulo npx jest tests/unit/onda3-shipping-cockpit-cashflow.test.ts --runInBand` **e** `TZ=UTC npx jest tests/unit/onda3-shipping-cockpit-cashflow.test.ts --runInBand`, comparar resultado | Só a execução sob os dois fusos prova que `T20-F03` é TZ-dependente (hipótese) e não outra causa |
| `DYN-T20-03` | Rodar `stock-concurrency.test.ts` (`RUN_INTEGRATION=true`) e, na mesma execução, consultar `SELECT quantity, reserved_quantity FROM products WHERE id = <TEST_LOW_STOCK_PRODUCT_ID>` antes/depois | Prova se a invariante que `T20-F04` diz não estar provada pelo teste é, na prática, respeitada pelo código (o teste fraco pode estar coincidindo com um comportamento correto que simplesmente não prova) |
| `DYN-T20-04` | `node scripts/run-api-suite.cjs integration legacy-routes-rbac-regression` e `... rbac-maintenance-service-orders-access-denied`, ler `tmp/jest-integration.json` | Fecha `RES-T20-03`: confirma quantas das 17 rotas de `rbac-critical-routes.test.ts` têm cobertura E2E real além de `produtos` |
| `DYN-T20-05` (= plano `DYN-06`) | `npm run test:characterization` contra `erp_evok_audio_test` | Reconfirma os "9 suítes, 66 testes, 66 verdes" declarados em `CHARACTERIZATION_TESTS.md:53`, agora sob o AUDIT_COMMIT imutável, não apenas por declaração de terceiro |
| `DYN-T20-06` (= plano `DYN-07`) | `npx jest tests/unit/docs-path-reference-guard.test.ts tests/unit/onda3-shipping-cockpit-cashflow.test.ts --runInBand` | Único jeito de transformar `OBS-INV-06` de "declaração de terceiro, confiança MEDIUM" em observação direta VeriCore |

---

### 9. Findings — resumo

| ID | Descrição | Severidade | Confiança |
|---|---|---|---|
| T20-F01 | Suíte de integração inteira (59+ arquivos) roda verde-sem-verificar fora do único caminho com guard (CI), sem aviso | MEDIUM | ALTA |
| T20-F02 | 16/17 rotas RBAC críticas sem E2E real (fake só prova fiação, não lógica real em conjunto) | MEDIUM | MÉDIA |
| T20-F03 | Bug de fuso horário em `GetCashFlowProjectionUseCase` explica a falha pré-existente de `onda3-shipping-cockpit-cashflow.test.ts` — candidato a defeito funcional real | MEDIUM | ALTA (estático) |
| T20-F04 | `stock-concurrency.test.ts` não prova a invariante de estoque não-negativo, ao contrário de testes irmãos da mesma categoria | MEDIUM | ALTA |

Nenhum CRITICAL/HIGH nesta trilha — todos MEDIUM, portanto **não** roteados obrigatoriamente ao `vericore-finding-validator` pela Regra 22 (mas disponíveis se o diretor decidir escalar `T20-F03` por seu impacto financeiro potencial).

---

### Arquivos lidos (lista para rastreabilidade)

`audit/runs/ERP-LEGACY-001-AUD-001/02-plan/AUDIT_PLAN.md`, `.../01-inventory/SYSTEM_INVENTORY.md`, `.../07-findings/T-13_DADOS_E_SCHEMA.md`, `.../T-16_TIER3_BACKEND.md`, `.../T-18_APPSEC_SEGREDOS_DEPENDENCIAS.md`, `.../T-19_ARQUITETURA.md`; `docs/coretriad/projects/ERP-LEGACY-001/discovery/CHARACTERIZATION_TESTS.md`; `.github/workflows/server-ci.yml`; `server/package.json`; `server/scripts/run-api-suite.cjs`; `server/scripts/assert-jest-no-skips.cjs`; `server/tests/helpers/testApi.ts`; `server/tests/unit/marketing-material-use-cases.test.ts`; `server/tests/unit/docs-path-reference-guard.test.ts`; `server/tests/unit/onda3-shipping-cockpit-cashflow.test.ts`; `server/src/modules/financial/application/use-cases/GetCashFlowProjectionUseCase.ts`; `server/src/modules/sales/application/use-cases/ChangeSaleStatusUseCase.ts` (grep); `server/tests/integration/schema-model-drift-guard.test.ts`; `server/tests/unit/rbac-critical-routes.test.ts`; `server/src/middlewares/auth.ts`; `server/tests/unit/access-profiles.test.ts`; `server/tests/unit/ti-access-request-use-cases.test.ts`; `server/tests/integration/rbac-module-access-denied.test.ts`; `server/tests/integration/stock-concurrency.test.ts`; `server/tests/integration/sale-cancel-concurrency.test.ts`; `server/tests/integration/inventory-count-claim-concurrency.test.ts`.

### Escalonamentos
- `T20-F03` → **T-07 (Financeiro)**: avaliar severidade de negócio do bug de fuso na projeção de fluxo de caixa.
- `RES-T20-01` → **T-23 (Documentação × Código)**: determinar qual citação de caminho está quebrada para `docs-path-reference-guard.test.ts`.
- `RES-T20-02`/`RES-T20-04` → **vericore-software-audit-director**: decidir se um mapeamento completo BR×teste e leitura integral dos ~222 arquivos restantes justificam esforço adicional além dos 4S orçados.
- `T20-F01`, `T20-F02`, `T20-F04` → candidatos a `DYN-T20-01..04` pelo `vericore-audit-verification-runner` antes de qualquer fechamento.
