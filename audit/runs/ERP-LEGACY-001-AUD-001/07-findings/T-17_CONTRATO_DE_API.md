# T-17 — CONTRATO DE API · RELATÓRIO DE TRILHA

> **Nota de persistência.** Produzido pelo `vericore-api-auditor` (T-17 contrato de API) e persistido
> **sem alteração de conteúdo** pelo orquestrador — o agente é read-only por
> desenho e não pode escrever em `audit/`. O juízo de auditoria é
> integralmente da trilha. Única transformação aplicada: promoção do
> cabeçalho a H1 e desescape de entidades HTML.

---

```
AUDIT_ID:      ERP-LEGACY-001-AUD-001
TRILHA:        T-17 — Contrato de API (53+1 arquivos de rota)
TITULAR:       vericore-api-auditor
AUTORIDADE:    AUDIT_PLAN.md §4.4 (linhas 475-483)
REGIME:        APR-2026-016 — read-only, zero conexão de banco, zero execução
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f (declarado; ver IN-08 abaixo)
ESTADO:        PARTIAL — inventário EXAUSTIVO alcançado; matriz por dimensão
               NÃO alcançada em 683/683 (ver §6 e RES-T17-01)
```

**IN-08 — declaração vinculante.** Não tenho shell nesta sessão (a ferramenta Bash está desabilitada). Consequências que assumo e sigo: (a) **não posso verificar por `git rev-parse` que a árvore lida corresponde ao `AUDIT_COMMIT`** — auditei a árvore de trabalho em `c:/Sistema EvokAudio/ERP-Evok--Audio-LTDA/` lida diretamente do disco, e **não faço nenhuma afirmação de proveniência temporal de código** (nada sobre "quando" ou "em que commit" algo foi introduzido); (b) todas as contagens vêm de Grep/Read, não de comandos. Se o diretor exigir amarração criptográfica ao `AUDIT_COMMIT`, isso é uma lacuna de método desta trilha, registrada como **RES-T17-02**.

Nenhum arquivo foi criado ou alterado (Regra 2). Findings saem `PROPOSED` (Regra 22).

---

## 1. Inventário — o produto central

### 1.1 Contagem real, medida, não herdada

| Medida | Valor | Como foi obtida |
|---|---|---|
| Arquivos de rota sob `server/src/**/presentation/routes/` | **53** | Glob |
| Arquivo de rota fora desse padrão (`server/src/routes/health.ts`) | **1** | Glob — **omitido do escopo declarado do plano** |
| Registros `router.<verbo>(` em `server/src/modules/**` | **681** | Grep exaustivo, `head_limit: 0` |
| Registros em `health.ts` | **2** | Grep |
| **Total de handlers registrados** | **683** | soma verificada arquivo a arquivo |
| Handler inline em `app.ts:227` (`GET /api`) | **+1** | leitura integral de `app.ts` |
| Montagem estática `app.use('/uploads', authenticate, express.static(...))` (`app.ts:225`) | superfície não enumerável | leitura |

**Enumeração nominal:** os 683 estão enumerados com `arquivo:linha:verbo:path`. 677 saíram de Grep `-o` direto; os **4 restantes** têm o path em linha separada (chamada multi-linha) e foram localizados por leitura manual, nominalmente:

- `juridico.ts:77` — `GET /contracts/:id/approvals`
- `marketing.ts:54` — `POST /leads/:id/handoff`
- `catalogImport.ts:31` — `POST /simulacao`
- `catalogImport.ts:40` — `POST /` (`/api/catalog-import`)

Registro de método: **um Grep de linha única perde 4 endpoints reais.** Qualquer trilha ou documento que tenha contado por Grep de uma linha só está 4 abaixo — inclusive o `API_INVENTORY.md` do passo 23, que declara "681 linhas confirmadas… batendo com `MODULE_CATALOG.md`". A coincidência com 681 é aritmética, não semântica (§1.2).

### 1.2 Distribuição por método (método × semântica, dimensão 1)

| Método | Qtd | Observação de contrato |
|---|---|---|
| `GET` | **306** | inclui **ao menos 1 GET não-safe** com efeito patrimonial — `T17-F02` |
| `POST` | **257** | usado tanto para criação quanto para transição de estado (`/approve`, `/close`, `/cancel`, `/resolve`); não é defeito por si, mas **não há regra escrita** que discipline 200 × 201 |
| `PUT` + `PATCH` + `DELETE` | **120** | — |
| **Total** | **683** | |

### 1.3 Adjudicação do ponto 2 — rotas inalcançáveis no inventário. **O número 681 está errado nas duas pontas.**

Verifiquei por leitura própria, não por deferência a T-04.

- `financial/routes/cnab.ts` define **8 endpoints** (`:22,23,25,26,27,29,30,31`).
- `finance.ts:59` monta **apenas** `router.use('/reconciliation', reconciliationRouter)`. Não há `/cnab`.
- Grep exaustivo em todo `server/**/*.ts` por `require(...routes/cnab...)`, `from '...cnab'` e `routes/cnab`: **zero ocorrências**. O router **não é importado por arquivo algum**.
- O próprio docblock do arquivo afirma o contrário: `cnab.ts:13-15` — *"Montado como sub-router em `server/src/modules/financial/presentation/routes/finance.ts` sob `/cnab`… resulta em `/api/finance/cnab/...`"*. **A afirmação é falsa contra `finance.ts:59`.**
- `docs/arquitetura/API.md`: zero ocorrências de `cnab` ou `/api/finance/cnab`.
- `client/src`: 3 ocorrências de "CNAB", **todas em comentário de prosa** dizendo que CNAB está fora do escopo (`ReconciliationTab.tsx:40`, `treasury.ts:11`, `TreasuryPage.tsx:19`). **Zero chamadas.**

**Veredito de T-17 (autoridade de contrato): CONFIRMO `AUD-SEC-T04-03` e vou além.** Os 8 endpoints CNAB não são apenas não montados — são **código morto sem consumidor, sem documentação e com docblock que mente sobre a própria montagem**.

**Correção aritmética do escopo, que escalono ao diretor:**

```
681  (plano §4.4 / SYSTEM_MAP / API_INVENTORY passo 23)
-  8  CNAB — definidos mas INALCANÇÁVEIS
+  2  health.ts (/health/live, /health/ready) — alcançáveis, fora do escopo declarado
+  1  GET /api (app.ts:227) — alcançável, ausente de todo inventário
= 676  endpoints HTTP efetivamente alcançáveis
```

Consequência material: o bloco "Financeiro" do `SYSTEM_MAP.md:86` conta `financial (30 = 15+8+7)`; o correto alcançável é **22**. Toda métrica de cobertura de T-07 que use 30 como denominador está inflada em 8 endpoints que não existem em runtime. **Isto não é divergência com T-07 — é insumo para T-07 e para o diretor.**

---

## 2. Adjudicações dirigidas

### 2.1 Ponto 1 — o 409×422 do `FIND-ERP-007`. **CONCORDO com T-12, e acrescento a regra ausente.**

Reproduzi os quatro elos por leitura própria, sem deferência:

| Elo | Verificação independente de T-17 |
|---|---|
| Contrato exige 422 | **CONFIRMADO.** `docs/business/BLOCO_6_RH_API.md:542` — `\| 422 \| BUSINESS_RULE_VIOLATION \| … decision='rescindir' mas já existe TerminationProcess aberto` |
| Código produz 409 | **CONFIRMADO.** `DecideEmployeeContractUseCase.ts:100-107` delega a `CreateTerminationProcessUseCase`; `CreateTerminationProcessUseCase.ts:62-65` lança `ConflictError`; `errors/index.ts:53-56` mapeia para **409 `CONFLICT`** |
| Mesmo documento declara 409 para a mesma condição | **CONFIRMADO.** `BLOCO_6_RH_API.md:594` — `\| 409 \| CONFLICT \| Já existe TerminationProcess aberto (status ≠ concluido/cancelado) para o mesmo employee_id` |
| Nenhum teste arbitra | Não reexecutei a varredura de 250 arquivos de teste; **aceito o elo 4 de T-12 como insumo, não como verificação própria** (declarado, não omitido) |

**O que T-17 acrescenta, por ser a trilha de contrato:** a ambiguidade do requisito é **sintoma de uma ausência sistêmica** — não existe, em lugar nenhum do repositório, uma regra de contrato que discipline **quando usar 409 e quando usar 422**. Medi:

- `new ConflictError(` → **73 ocorrências em 69 arquivos**
- `new BusinessRuleError(` → **326 ocorrências em 164 arquivos**
- `docs/arquitetura/API.md:53` lista os dois códigos como códigos válidos e **não diz o que distingue um do outro**.

Na prática há uma convenção *de facto* (409 ≈ unicidade/duplicidade; 422 ≈ pré-condição de estado), mas ela não está escrita e a condição em disputa — *"já existe um processo de demissão aberto para este funcionário"* — cai **legitimamente nas duas** leituras: é uma unicidade condicional *e* uma regra de negócio. Por isso não há resposta derivável do contrato: **o contrato não tem a regra.**

**Veredito de T-17:** o item 3 do `FIND-ERP-007` é **requisito ambíguo, não defeito de mapeamento** — idêntico ao veredito de T-12, alcançado por caminho independente. **Sem divergência a escalar por Regra 20.** Elevo o enquadramento de T-12 acrescentando a causa-raiz de contrato como finding próprio (`T17-F09`), porque a mesma ambiguidade reincidirá em qualquer ponto do sistema até que a regra exista — e já reincidiu: `AUD-T01-07` (T-01, `DeactivateItemUseCase.ts:69-73`) é a **mesma classe** em outro módulo.

### 2.2 Ponto 4 — efeito patrimonial em verbo de leitura. **CONFIRMO T-08/T-10 e classifico como HIGH de contrato.**

`sales.ts:55` — `router.get('/:id/nfe', authenticate, authorizeModule('vendas'), fiscalController.getSaleNfeStatus)` — nível `view` (o comentário `sales.ts:21-23` afirma explicitamente *"`GET .../nfe` (consulta de status) permanece em `view`/`operate` implícito — não é uma ação de aprovação"*).

Li `GetSaleNfeStatusUseCase.ts` linha a linha. O que um `GET` executa:

- `:97` — chamada a **provedor externo** (`provider.queryStatus`) — efeito fora do processo;
- `:99-100` — abre transação e toma **`LOCK.UPDATE`** sobre a venda;
- `:118-123, 203` — **escreve** `nfe_status`, `nfe_key`, `nfe_protocol`, `nfe_xml_url`, `nfe_danfe_url`, `nfe_issued_at` em `Sale`;
- `:126-131, 202` — **escreve** o registro `sale_invoices`;
- `:156-171` — **`SaleStockService.commitInvoicedStock(...)`** — **baixa de estoque**, gerando `InventoryMovement`;
- `:185-192` — **`SaleReceivableService.createInvoiceReceivables(...)`** — **cria conta a receber**;
- `:194` / `:198` — **muda o `status` da venda** para `invoiced`/`partially_invoiced`.

**Veredito de contrato:** `GET` é **safe** por definição normativa (RFC 9110 §9.2.1). Este `GET` não é safe: ele movimenta estoque e cria obrigação financeira. Consequências que são estritamente de contrato, não de autorização:

1. **Qualquer intermediário HTTP pode disparar o efeito.** Prefetch de navegador, *link preview*, crawler autenticado, retry automático de cliente, proxy que repete `GET` — todos tratam `GET` como repetível sem consequência. Aqui repetir tem consequência.
2. **`authorizeModule('vendas')` sem nível** significa que **um perfil de leitura** dispara baixa de estoque e contas a receber. O irmão que faz a mesma coisa explicitamente (`POST /:id/nfe`, `sales.ts:54`) exige `approve`. **Duas portas para o mesmo efeito patrimonial com alçadas incompatíveis.**
3. **Terceira porta, sem autenticação de usuário:** `POST /api/webhooks/focus-nfe` (`webhooks.ts:13`) → `webhookController.ts:64-65` → `HandleNfeStatusWebhookUseCase` → o mesmo `GetSaleNfeStatusUseCase` (o docblock `:5-7` diz isso literalmente). Protegido apenas por segredo compartilhado em header (`webhookController.ts:57`, comparação `!==`, não constant-time). O `userId` é opcional (`GetSaleNfeStatusUseCase.ts:75`) e cai em `locked.user_id` — o autor do `InventoryMovement` passa a ser o vendedor da venda, **não quem disparou**.

Existe mitigação parcial de reentrância: `:88-91` (estado terminal) e `:116` (`alreadyReconciled`). Ela cobre a **repetição após conclusão**, não a **primeira execução por via indevida**, que é o defeito de contrato.

### 2.3 Ponto 3 — `POST /api/mobile-inventory/batch`, contrato × consumo. **CONFIRMADO, com agravantes de contrato.**

- Rota: `mobileInventory.ts:18`, `authenticate` + `authorizeModule('estoque','operate')`.
- Documentada: `docs/arquitetura/API.md:4073-4089`.
- **Chamador first-party: zero.** Grep em todo o repositório (excluindo `node_modules`): `mobile/src/api/mobileInventory.ts` implementa **apenas** `/scan` (`:27`) e `/movements` (`:41`). Nenhuma referência a `/batch` em `client/`, `mobile/`, `tv/`.
- Consumidor externo confirmado pelo dono e registrado em `docs/coretriad/projects/ERP-LEGACY-001/EXTERNAL_CONSUMER_INVENTORY.md:81,182`.

Defeitos de contrato que são meus:

1. **Nenhum limite de lote, nem no contrato nem no código.** `BatchScanUseCase.ts:49-51` rejeita lista vazia e nada mais; `:54-81` itera sem teto, cada item tomando lock pessimista (`InventoryService.adjust`, `:72`) **dentro de uma única transação**. `app.ts:129-135` permite corpo de **5 MB**. Um lote de milhares de itens mantém locks de estoque abertos por toda a duração. `API.md:4073-4089` **não declara limite algum**.
2. **Ausência de idempotência não declarada.** O documento promete atomicidade (*"toda a transação é revertida"*, `API.md:4076-4077`) — o que é verdade — mas **não diz que reenvio duplica**. Para um consumidor de automação, que reenviará em timeout, a leitura natural de "transacional" é "seguro reenviar". Não é. Corrobora `TRIAGE.md:137` do CASE-001. O eixo de idempotência é de T-06 (`FIND-ERP-001`); **o que registro aqui é o defeito de contrato: a documentação induz o consumidor externo ao erro.**
3. **Envelope de resposta 200 sem `Location`, sem id de lote.** `mobileInventoryController.ts:43` → `res.json(...)` (200), criando N `InventoryMovement`. Sem identificador de lote, o consumidor externo **não tem como reconciliar** um reenvio.

---

## 3. Achados sistêmicos de contrato (dimensões transversais, cobertura exaustiva)

### 3.1 `T17-F01` — **Envelope de erro bimodal: `error` é STRING em umas respostas e OBJETO em outras, na mesma semântica HTTP**
**Severidade: HIGH · Confiança: CONFIRMED**

`errorHandler.ts` produz **duas formas incompatíveis** do mesmo campo:

| Ramo | Linha | Forma de `error` |
|---|---|---|
| 1 — `AppError` e subclasses | `errorHandler.ts:49-53` | **objeto** `{ code, message, details? }` |
| 2 — erro com `statusCode < 500` | `:58` | **string** |
| 3 — `SequelizeValidationError` | `:64-69` | **string** |
| 4 — `UniqueConstraintError` (409) | `:75-80` | **string** |
| 5 — `ForeignKeyConstraintError` | `:85-88` | **string** |
| 6 — trigger de imutabilidade SST (409) | `:102-105` | **objeto** |
| 6b — demais `DatabaseError` | `:107-110` | **string** |
| 7 — JWT (401) | `:115,118` | **string** |
| 8 — Multer | `:124,127,131` | **string** |
| 9 — fallback | `:136-139` | **string** |

Repare no par 4 × 6: **dois 409 do mesmo handler, com formas diferentes.**

Pior, a bifurcação existe **dentro da mesma preocupação**, nos middlewares de autorização:

| Middleware | Linha | Status | Forma |
|---|---|---|---|
| `auth.ts` (`authenticate`) | `:64, 90, 95, 101, 132, 137` | 401 | **string** |
| `auth.ts` (`authorizeModule`) | `:221` | 401 | **string** |
| `auth.ts` (`authorizeModule`) | `:248-254, 262-268, 274-280` | 403 | **objeto** com `code` |
| `auth.ts` (`authorize` legado) | `:159` | 403 | **string** |
| `authorizeAnyModule.ts` | `:62` | 401 | **string** |
| `authorizeAnyModule.ts` | `:72-78, 103-107` | 403 | **objeto** |
| `authorizeSelfOrModule.ts` | `:49` | **401** | **objeto** `{ code:'UNAUTHORIZED', message }` |

**`authorizeSelfOrModule.ts:49` retorna 401 como objeto; `auth.ts:221` retorna 401 como string.** Um cliente que faça `error.code` quebra num caso; um que faça `String(error)` produz `[object Object]` no outro. Não há caminho de parsing correto sem *type-check* em cada resposta.

`docs/arquitetura/API.md:30-55` **documenta a bimodalidade como se fosse desenho** ("formato anterior (string)" × "formato estruturado"), sem dizer **quais endpoints usam qual** — logo, o contrato documentado é indecidível para o cliente.

**Impacto:** todo tratamento de erro de `client/`, `mobile/`, `tv/` e da automação externa é escrito contra um contrato que não determina o tipo do próprio campo de erro. Mensagens de negócio silenciosamente inexibidas e códigos de erro não roteáveis são a manifestação esperada.

### 3.2 `T17-F02` — **`GET` com efeito patrimonial (safety violada) e três portas de alçada incompatível para o mesmo efeito**
**Severidade: HIGH · Confiança: CONFIRMED**
Âncoras: `sales.ts:55` · `GetSaleNfeStatusUseCase.ts:97-205` (esp. `:156-171`, `:185-192`, `:194`) · `sales.ts:54` (`approve`) · `webhooks.ts:13` + `webhookController.ts:51-70`. Detalhamento em §2.2. Fronteira: o veredito de *permissão* é do authorization-auditor; o que entrego é **método × semântica**, que é minha dimensão.

### 3.3 `T17-F03` — **Paginação sem teto em ~108 de 111 listas; o helper que impõe o teto tem ZERO chamadores**
**Severidade: HIGH · Confiança: CONFIRMED**

Prova negativa exaustiva:

- `server/src/shared/presentation/pagination.ts` define `paginate()` com `PAGINATION_DEFAULT_LIMIT = 10` e **`PAGINATION_MAX_LIMIT = 100`** (`:26`, `constants.ts:14-20`).
- Grep `paginate\(` em **todo** `server/src`, `head_limit: 0`: **1 ocorrência — a própria definição.** **O helper é código morto. O teto de 100 não é aplicado em lugar nenhum.**
- Grep `Math\.min\([^)]*limit|limit\s*>\s*[0-9]+|MAX_LIMIT` em todo `server/src`: apenas **3** use cases impõem teto, e com **três valores diferentes** — `ListMasterProductionPlansUseCase.ts:58` (100), `ListQualityInspectionsUseCase.ts:51` (100), `ListProductionDowntimesUseCase.ts:46` (**200**).
- `pagination: {` em controllers: **111 ocorrências em 88 arquivos**. Logo **~108 listas paginadas não têm teto algum**.
- Padrão inline dominante — `const { page = 1, limit = 20, ...filters } = req.query` seguido de `Number(limit)` — medido em **27 ocorrências / 21 arquivos**.

Exemplos verificados linha a linha, com a cadeia inteira até o Sequelize:
- `contractController.ts:60-62` → `ListContractsUseCase.ts:26-27`: `offset = (page-1)*limit`; `findAndCount(filters, { limit, offset })`. **`limit` do cliente vai direto ao ORM.**
- `lgpdController.ts:91-93` — **`GET /api/jur/lgpd/data-subject-requests`**, a lista que T-12 (`T12-H04`) prova carregar `requester_name`, `requester_document` (**CPF**) e `requester_email`. **Sem teto de página e sem log de leitura.** `?limit=999999` exfiltra a base de titulares LGPD em uma requisição.

Defeitos adicionais do mesmo padrão: `Number(limit)` **sem guarda de `NaN`** (`limit=abc` → `NaN` → `offset=NaN` → erro de driver → 500 pelo ramo 6b do `errorHandler`) e **sem guarda de negativo** (`limit=-1`).

**Impacto:** DoS trivial autenticado sobre 108 listas, e exfiltração em massa na superfície de dado pessoal. **Handoff explícito a T-18 (appsec)** — mas o defeito de origem é de contrato: a API não declara nem impõe limite de página.

### 3.4 `T17-F04` — **8 endpoints inalcançáveis contados como escopo; docblock afirma montagem que não existe**
**Severidade: MEDIUM · Confiança: CONFIRMED** · Âncoras: `cnab.ts:13-15` (afirmação falsa), `cnab.ts:22-31` (8 rotas), `finance.ts:59` (única montagem real). Detalhamento e correção aritmética em §1.3.

### 3.5 `T17-F05` — **Documentação de API fragmentada em 7 arquivos sem índice; o documento-título omite 348 endpoints sem se declarar parcial**
**Severidade: MEDIUM · Confiança: CONFIRMED**

`docs/arquitetura/API.md` intitula-se *"Documentação da API - ERP EVOK ÁUDIO"*. Medi:
- **184** cabeçalhos `### <VERBO> /...` + **87** linhas de tabela `| VERBO |` → **teto superior de 271** entradas distintas, contra **676 endpoints alcançáveis**.
- Grep no arquivo por `BLOCO_`, `/api/sst`, `/api/ti`, `/api/jur`, `/api/facilities`, `/api/marketing`, `/api/rh`: **zero ocorrências**.

Ou seja: os módulos `sst` (75), `ti` (47), `juridico` (75), `facilities` (64), `marketing` (30) e `rh` (57) = **348 endpoints, 51% da superfície alcançável**, estão **totalmente ausentes** do documento que se apresenta como a documentação da API — e o documento **não declara ser parcial nem aponta para onde eles estão**. Eles existem, sim, em `docs/business/BLOCO_{1..6}_*_API.md`, mas **nada liga um ao outro**. Um integrador que leia `API.md` conclui, corretamente pela leitura, que esses módulos não existem.

Cobertura documental mínima demonstrável: **≥ 405 dos 676 alcançáveis (60%) sem entrada em `API.md`**; a fração coberta pelos 6 blocos não foi verificada endpoint a endpoint por esta trilha (**RES-T17-03**).

### 3.6 `T17-F06` — **Ausência total de versionamento de API + duas declarações de versão contraditórias**
**Severidade: MEDIUM · Confiança: CONFIRMED**

Prova negativa exaustiva: Grep em todo `server/**/*.ts` por `/api/v[0-9]`, `/v1/`, `Accept-Version`, `API-Version`, `api-version` → **zero ocorrências**. Todos os 676 endpoints vivem em `/api/<recurso>` sem versão, sem negociação por header, sem política de depreciação.

E as duas únicas declarações de versão do produto **se contradizem**:
- `app.ts:230` → `version: '2.0.0 (PostgreSQL/Sequelize/TypeScript)'` em `GET /api`
- `health.ts:7` → `const appVersion = '1.0.0'`, servido em `GET /health/live`

**Impacto:** com um consumidor externo confirmado (automação sobre `mobile-inventory/batch` e as rotas de `EXTERNAL_CONSUMER_INVENTORY.md`), **qualquer mudança de contrato é quebra silenciosa** — não há canal para versionar, depreciar ou sinalizar. Somado a `T17-F01`, o consumidor externo integra contra um contrato sem versão e com envelope de erro indeterminado.

### 3.7 `T17-F07` — **Webhook público vaza mensagem de exceção crua e deriva status de exceção arbitrária, contornando o `errorHandler`**
**Severidade: MEDIUM · Confiança: CONFIRMED**

`webhookController.ts:68`:
```ts
res.status(error?.statusCode || 500).json({ success: false, error: error?.message || 'Erro ao processar webhook' });
```
Isto está num endpoint **sem autenticação de usuário** (`POST /api/webhooks/focus-nfe`) e viola duas promessas escritas do próprio sistema:
- `errorHandler.ts:4-7` — *"Nunca retorna stack trace ou `error.message` cru de exceções inesperadas ao cliente HTTP, **em nenhum ambiente**"*;
- `API.md:57-59` — a mesma promessa ao integrador.

O `try/catch` local nunca chama `next(error)`, então o `errorHandler` **não roda**: `error.message` de qualquer exceção interna (incluindo erro de driver Sequelize, que costuma carregar SQL e nomes de coluna) vai direto ao cliente anônimo. O status também é ditado pela exceção (`error?.statusCode`), o que permite respostas com semântica arbitrária. Nota lateral para T-18: `:57` compara o segredo com `!==` (não constant-time).

### 3.8 `T17-F08` — **`POST /api/mobile-inventory/batch`: contrato sem limite de lote, sem idempotência declarada e sem identificador de lote — com consumidor externo confirmado**
**Severidade: MEDIUM · Confiança: CONFIRMED** · Âncoras: `mobileInventory.ts:18` · `BatchScanUseCase.ts:49-81` · `mobileInventoryController.ts:36-48` · `API.md:4073-4089` · `app.ts:129-135`. Detalhamento em §2.3.

### 3.9 `T17-F09` — **Não existe regra de contrato que discipline 409 × 422; a ambiguidade é reincidente**
**Severidade: LOW · Confiança: CONFIRMED** · Âncoras: `errors/index.ts:53-56` (409) e `:63-67` (422) · `API.md:53` (lista os dois, não os distingue) · `BLOCO_6_RH_API.md:542` × `:594` (mesma regra, dois códigos) · `CreateTerminationProcessUseCase.ts:62-65` · reincidência independente em `DeactivateItemUseCase.ts:69-73` (`AUD-T01-07`, T-01). Medição de dispersão: 73 `ConflictError` × 326 `BusinessRuleError`. Adjudicação completa em §2.1.

---

## 4. O que está correto (registro de negativa, para não inflar o quadro)

- **Ordenação de rotas estáticas antes de `:id`** é sistematicamente respeitada e comentada: `finance.ts:47-49`, `juridico.ts:119`, `workCenters.ts:20-22`, `app.ts:187-189` (`/api/quality/non-conformities` antes de `/api/quality`), `app.ts:194` (`/api/engineering/bom` antes de `/api/engineering`). Não encontrei colisão de prefixo.
- **Bypass ordenado de gate em `juridico`** (`:64,71,77` antes de `router.use(authorizeModule(...))` em `:83`) é intencional, documentado nas linhas `:59-63` e `:66-70`, e não é shadow endpoint.
- `POST /api/webhooks/n8n` responde **202** com sinal explícito de idempotência (`duplicate`), `webhookController.ts:22` — semântica correta para aceitação assíncrona, e o único ponto da API que expõe idempotência ao cliente.
- Uso de **201** em criação é majoritariamente correto onde amostrei (154 ocorrências; conferi par a par em `financial`, `items`, `inventory`, `sales`, `juridico` — batem com o número de POSTs de criação de cada módulo).
- **Nenhuma rota montada antes do `router.use(authenticate)`** nos 12 módulos que usam gate de topo, com a exceção intencional e documentada de `juridico`.

---

## 5. Cobertura efetiva — declarada sem arredondar para cima

| Dimensão do §4.4 | Nível alcançado | Base |
|---|---|---|
| **Inventário (verbo, path, arquivo:linha)** | **E — exaustivo, 683/683** | Grep `head_limit:0` + leitura manual dos 4 multi-linha |
| **Alcançabilidade (montagem em `app.ts`)** | **E — exaustivo** | `app.ts` lido integralmente + Grep de todos os `router.use` |
| **Método × semântica** | **A — amostral declarado** | Profundidade nos alvos dirigidos (`sales/:id/nfe`, webhooks, `batch`) + varredura de distribuição nos 683 |
| **Código de status** | **E na origem (`errorHandler` + `errors/index` lidos linha a linha); A nos 683 pontos de emissão** | 154 `res.status(201)` contados; não conferi 683 mapeamentos |
| **Formato de erro** | **E — exaustivo por origem** | Todos os 9 ramos do `errorHandler` + os 4 middlewares de auth lidos integralmente |
| **Versionamento** | **E — prova negativa exaustiva** | Grep de 5 padrões em todo `server/**/*.ts` → zero |
| **Paginação** | **E — prova negativa exaustiva do teto** | `paginate\(` = 1 (a definição); 3 tetos locais; 111 listas |
| **Contrato documentado × implementado** | **A — parcial, com teto e piso medidos** | 184+87 entradas em `API.md`; 6 blocos não conferidos endpoint a endpoint |

**A matriz de 683 linhas × 13 colunas do §20 do Master Spec NÃO foi produzida.** Alcancei o inventário exaustivo (colunas *method*, *path*, *arquivo:linha*, *alcançabilidade*) e as dimensões transversais por prova exaustiva de origem, mas **não preenchi authn/authz/input/validação/output/erros/regra/idempotência/rate-limit/logging/teste por endpoint nos 683**. Declarar o contrário seria a promessa vazia que derrubou o `AUDIT_PASSED` do SIM-002.

**Riscos residuais nominais (G3, condição b):**

- **`RES-T17-01`** — **683 endpoints têm inventário e alcançabilidade em `E`, mas apenas ~30 tiveram leitura de controller/use case linha a linha** (os alvos dirigidos e os âncoras de cada finding). Dano possível: um endpoint com envelope de resposta próprio, status incorreto ou efeito colateral não declarado **não seria detectado** nos ~653 restantes. Custo para fechar: **3 a 4 sessões**. Assume o risco: o dono, por G3.
- **`RES-T17-02`** — **sem shell, a árvore lida não foi amarrada criptograficamente ao `AUDIT_COMMIT`.** Dano possível: divergência entre o objeto auditado e o commit declarado. Custo para fechar: 1 comando (`git rev-parse HEAD` + `git status --porcelain`) por um agente com shell. **Bloqueia a formalização dos findings HIGH até ser fechado.**
- **`RES-T17-03`** — **cobertura documental dos 6 `BLOCO_*_API.md` não conferida endpoint a endpoint.** O piso de 405 endpoints ausentes de `API.md` está provado; a fração real coberta pelo conjunto dos 7 documentos **não está**. Custo para fechar: 1 sessão, em coautoria com o `api-documentation-auditor` (co-titular desta trilha, que **não participou** desta execução — registro como lacuna de composição).

---

## 6. Evidência dinâmica requerida (`DYN-T17-nn`) — nada foi executado

| ID | O que provar | Comando exato | Por que estático não basta |
|---|---|---|---|
| `DYN-T17-01` | Que `GET /api/sales/:id/nfe` de fato baixa estoque e cria recebível com perfil `view` | `curl -H "Authorization: Bearer <jwt_view_vendas>" http://localhost:5000/api/sales/<id>/nfe` com `SELECT` antes/depois em `inventory_movements` e `accounts_receivable` no banco **`erp_evok_audio_test`** | O efeito depende do retorno `authorized` do provedor externo, que é mockado em teste; a leitura estática prova o caminho, não a consumação |
| `DYN-T17-02` | Que o teto de página não existe em `GET /api/jur/lgpd/data-subject-requests` | `curl -H "Authorization: Bearer <jwt>" "http://localhost:5000/api/jur/lgpd/data-subject-requests?limit=100000"` contra **`erp_evok_audio_test`** (nunca contra base com CPF real) | Só a resposta prova que o ORM aceita o `limit` sem truncar |
| `DYN-T17-03` | Que os 8 endpoints CNAB retornam 404 | `curl -i -H "Authorization: Bearer <jwt>" http://localhost:5000/api/finance/cnab/banking-config` | Fecha a inalcançabilidade por observação, não por ausência de import |
| `DYN-T17-04` | Que o mesmo 401 muda de forma conforme o middleware | Comparar corpo de `GET /api/users/:id` (via `authorizeSelfOrModule`) e `GET /api/finance/receivable` (via `authorizeModule`), ambos sem token | O tipo do campo `error` na resposta real é a prova do contrato quebrado |
| `DYN-T17-05` | Que `POST /api/webhooks/focus-nfe` vaza mensagem de exceção | Requisição com `X-Webhook-Secret` correto e `ref` inexistente, inspecionando o corpo | O conteúdo exato de `error.message` do driver só aparece em runtime |
| `DYN-T17-06` | Que `POST /api/mobile-inventory/batch` duplica em reenvio | Mesmo payload duas vezes, contando `inventory_movements` em **`erp_evok_audio_test`** | Idempotência é propriedade observável, não derivável |

Todos requerem **G4** e execução pelo `vericore-audit-verification-runner`. **T-17 não executou nada.**

---

## 7. Escalonamentos

1. **Ao diretor — correção de escopo (não é divergência entre trilhas):** o número **681** do `AUDIT_PLAN.md:475`, do `SYSTEM_MAP.md` e do `API_INVENTORY.md` do passo 23 **inclui 8 endpoints inalcançáveis e exclui 3 alcançáveis**. O denominador correto de superfície HTTP é **676**. Toda métrica de cobertura já publicada contra 681 precisa ser reafirmada. O bloco "Financeiro" do `SYSTEM_MAP.md:86` está inflado em 8.
2. **Ao diretor — lacuna de composição:** o `AUDIT_PLAN.md:476-477` designa `vericore-api-documentation-auditor` como **co-titular** de T-17. Esta execução teve **apenas o titular**. O cruzamento doc × real exigido pelo §4.4 ficou, por isso, no piso demonstrável de `T17-F05`, não no cruzamento completo (**`RES-T17-03`**).
3. **Sem divergência a resolver por Regra 20.** Concordo com T-12 (§2.1), com T-04/`AUD-SEC-T04-03` (§1.3) e com T-08/T-10 (§2.2), em todos os casos por verificação independente e não por deferência. Onde fui além, ampliei o enquadramento — não o contradisse.
4. **Handoffs:** `T17-F03` → T-18 (appsec, DoS e exfiltração) e T-12 (superfície LGPD). `T17-F02` → authorization-auditor (veredito de alçada) e T-08 (fiscal). `T17-F07` → T-18 (segredo em header, comparação não constant-time). `T17-F08` → T-06 (idempotência, `FIND-ERP-001`). `T17-F09` → T-25 (confronto do `FIND-ERP-007`) e T-01 (`AUD-T01-07`, mesma classe).
5. **Regra 22:** `T17-F01`, `T17-F02` e `T17-F03` são **HIGH** e devem passar pelo `vericore-finding-validator` antes de qualquer remediação. **`RES-T17-02` (ausência de amarração ao `AUDIT_COMMIT`) deve ser fechado antes dessa validação.**

---

## 8. Arquivos lidos (caminhos absolutos)

**Objeto auditado — rotas e composição**
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\app.ts` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\routes\health.ts` (integral)
- `...\server\src\modules\financial\presentation\routes\finance.ts` (integral)
- `...\server\src\modules\financial\presentation\routes\cnab.ts` (integral)
- `...\server\src\modules\sales\presentation\routes\sales.ts` (integral)
- `...\server\src\modules\mobileInventory\presentation\routes\mobileInventory.ts` (integral)
- `...\server\src\modules\spreadsheetImport\presentation\routes\catalogImport.ts` (integral)
- `...\server\src\modules\juridico\presentation\routes\juridico.ts` (`:55-154`)
- `...\server\src\modules\marketing\presentation\routes\marketing.ts` (`:40-81`)
- **Os 54 arquivos de rota** — enumerados por Grep exaustivo (`router.<verbo>(`, `head_limit: 0`), com `arquivo:linha:verbo:path` de 681/683 registros

**Objeto auditado — contrato transversal**
- `...\server\src\middlewares\errorHandler.ts` (integral)
- `...\server\src\middlewares\auth.ts` (`:60-160`, `:215-284`)
- `...\server\src\middlewares\authorizeAnyModule.ts` (`:58-107`)
- `...\server\src\middlewares\authorizeSelfOrModule.ts` (por Grep, `:49,88,92`)
- `...\server\src\errors\AppError.ts` (integral) · `...\server\src\errors\index.ts` (integral)
- `...\server\src\shared\presentation\pagination.ts` (integral) · `...\server\src\shared\utils\constants.ts` (`:14-20`)

**Objeto auditado — controllers e use cases**
- `...\server\src\modules\webhooks\presentation\controllers\webhookController.ts` (integral)
- `...\server\src\modules\mobileInventory\presentation\controllers\mobileInventoryController.ts` (integral)
- `...\server\src\modules\mobileInventory\application\use-cases\BatchScanUseCase.ts` (integral)
- `...\server\src\modules\fiscal\application\use-cases\GetSaleNfeStatusUseCase.ts` (integral)
- `...\server\src\modules\rh\application\use-cases\contract\DecideEmployeeContractUseCase.ts` (`:60-112`)
- `...\server\src\modules\rh\application\use-cases\termination\CreateTerminationProcessUseCase.ts` (`:50-74`)
- `...\server\src\modules\juridico\application\use-cases\contract\ListContractsUseCase.ts` (integral)
- `...\server\src\modules\juridico\presentation\controllers\contractController.ts` (`:58-70`)
- `...\server\src\modules\juridico\presentation\controllers\lgpdController.ts` (`:43-47, 89-93, 167-171`)

**Documentação**
- `...\docs\arquitetura\API.md` (`:1-60`, `:4040-4114`, contagens estruturais em todo o arquivo)
- `...\docs\business\BLOCO_6_RH_API.md` (`:520-609`)
- `...\docs\coretriad\projects\ERP-LEGACY-001\discovery\API_INVENTORY.md` (`:1-80`)

**Artefatos de auditoria (leitura, não escrita)**
- `...\audit\runs\ERP-LEGACY-001-AUD-001\02-plan\AUDIT_PLAN.md` (`:455-514`)
- `...\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\T-12_PESSOAS_COMPLIANCE.md` (`:1-199`)
- `...\audit\runs\ERP-LEGACY-001-AUD-001\00-scope\AUDIT_SCOPE.md` e `...\01-inventory\SYSTEM_MAP.md` (trechos por Grep)

**Clientes (verificação de consumo)**
- `...\mobile\src\api\mobileInventory.ts` · `...\client\src\api\treasury.ts` · `...\client\src\pages\financial\ReconciliationTab.tsx` · `...\client\src\pages\treasury\TreasuryPage.tsx`

**Nenhum arquivo foi criado, alterado ou removido. Nenhum comando foi executado. Nenhuma conexão de banco foi aberta. Nenhum arquivo `.local.txt` de credencial foi aberto (ressalva E6 respeitada).**
