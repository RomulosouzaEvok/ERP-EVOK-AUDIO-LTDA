# T-28 — VALIDAÇÃO ADVERSARIAL (Regra 22) — bloco SST + RFQ/Preços de T-27

```
AUDIT_ID:      ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f
AGENTE:        vericore-finding-validator
DATA:          2026-08-16
ESCOPO:        5 findings HIGH PROPOSED — 2 de T-27/SST, 3 de T-27/RFQ+Preços
REGIME:        read-only. Nenhuma execução, nenhuma conexão de banco, nenhum arquivo do
               objeto auditado alterado (Regra 2). Não declara AUDIT_PASSED,
               RETEST_PASSED nem FINDING CLOSED (Regra 4). Não cria finding novo.
MÉTODO:        READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT. Toda âncora abaixo foi
               relida diretamente neste worktree; nenhum número foi herdado do relatório de
               origem nem do enunciado do mandato.
```

**Fato de base (cadeia de custódia externa, declarado pelo orquestrador, não produzido aqui):**
`git diff --stat c1311a6..HEAD -- server/src client/src server/migrations server/database` → vazio.

---

## 1. Mapeamento de ID — colisão tratada antes da validação

`T27-F01`/`T27-F02` existem em SST **e** em Jurídico com conteúdos diferentes; RFQ usa `T-27-01`,
visualmente quase idêntico a `T27-F01`. A partir deste documento, os IDs deste bloco são
**qualificados por trilha**. IDs não qualificados de T-27 devem ser considerados ambíguos.

| ID qualificado (canônico) | ID de origem | Arquivo de origem | Objeto |
|---|---|---|---|
| `T27-SST-F01` | `T27-F01` | `07-findings/T-27_DEF-02B_SST_D3D4.md` §4 | Gate de posse CIPA não filtra `validade` |
| `T27-SST-F02` | `T27-F02` | `07-findings/T-27_DEF-02B_SST_D3D4.md` §4 | Blocklist trata `validade = null` como não vencido |
| `T27-RFQ-01` | `T-27-01` | `07-findings/T-27_DEF-03_RFQ_PRECOS_D3D4.md` §4 | Cotação reescrita após o mapa comparativo, sem histórico |
| `T27-RFQ-04` | `T-27-04` | `07-findings/T-27_DEF-03_RFQ_PRECOS_D3D4.md` §4 | Adjudicação sem segregação de função |
| `T27-RFQ-05` | `T-27-05` | `07-findings/T-27_DEF-03_RFQ_PRECOS_D3D4.md` §4 | BR-COM-011 sem transação, lock ou constraint |

**Não pertencem a este mandato** (registro para evitar reuso do ID cru): `T27-F01`/`T27-F02` da
trilha Jurídico, e os demais `T27-F03…F20` (SST) e `T-27-02…T-27-12` (RFQ), todos MEDIUM/LOW/INFO
e portanto fora da Regra 22.

---

## 2. Refutação estrutural comum aos 3 findings que dependem de ausência de banco

O mandato exige não concluir ausência só pelo baseline (`OBS-R3C-01`). Varredura própria:

- **19 migrations pós-freeze** enumeradas por glob (`server/migrations/2026081*`): de
  `20260810-000028-fix-nullable-columns-round-2.cjs` a
  `20260812-000047-hr-absences-open-unique.cjs`.
- Grep próprio nessas 19 por `sst_|customer_price|rfq_|addConstraint|EXCLUDE|CREATE TRIGGER|addIndex`:
  os únicos `addConstraint` são `import_process_approvals`
  (`20260810-000031-comex-directorate-approval-gate.cjs:77`) e `purchase_order_approvals`
  (`20260810-000029-purchase-approval-authority-g11.cjs:90`); os `addIndex` são de
  `sale_lot_shipments`, `quality_inspections`, `strategic_plannings`, `meeting_minutes`,
  `business_risks`, `hr_time_import_*`, `production_order_reservations`,
  `master_production_plan*`, `departments`, `access_profiles`, `import_process_approvals`.
  **Zero ocorrências de `sst_*`, `customer_price_lists` ou `rfq_*`.**
- Grep próprio de `CREATE TRIGGER` no baseline (`00_baseline_frozen.sql`): **14 triggers**, linhas
  `:22156, :22163, :22170, :22177, :22184, :22191, :22198, :22205, :22212, :22219, :22226, :22233, :22240`
  (+ nenhuma outra). Todas em `hr_*`, `jur_*`, `sst_eventos_esocial`, `sst_acidentes`, `sst_cats`,
  `sst_entregas_epi`. **Nenhuma em `sst_treinamentos`, `sst_membros_cipa`, `rfq_quotes` ou
  `customer_price_lists`.**
- `sst_treinamentos` (`baseline:14452-14467`): PK (`:18314-18315`), 3 índices não únicos
  (`:21505, :21512, :21519`), 2 FKs (`:25847, :25855`). `validade` é `DATEONLY` nullable
  (`server/src/models/SstTreinamento.ts:45`), sem `defaultScope` e sem `hooks`.
- `customer_price_lists` (`baseline:4707-4719`): **só PK** (`:16682-16683`), 3 índices **não
  únicos** (`:18978, :18985, :18992`), 3 FKs (`:22472, :22480, :22488`). Sem UNIQUE, sem EXCLUDE,
  sem CHECK, sem trigger.
- `rfq_quotes` (`baseline:12014-12025`): colunas `id, rfq_item_id, supplier_id, unit_price,
  lead_time_days, moq, validity_date, notes, created_at, updated_at`. **Não existe `created_by`,
  `updated_by` nem tabela de histórico.**

**Conclusão desta seção:** as três afirmações de ausência de controle de banco **sobrevivem** à
refutação, agora contra o schema versionado inteiro (baseline + 19 migrations pós-freeze), não só
contra o baseline defasado.

---

## 3. Vereditos

### 3.1 `T27-SST-F01` — gate de posse na CIPA verifica existência, nunca validade

**Veredito: `CONFIRMED`. Severidade HIGH — SUSTENTADA.**

Refutação tentada e falha:

| Vetor de refutação | Resultado (evidência própria) |
|---|---|
| O repositório filtra validade em outro predicado? | Não. `server/src/modules/sst/infrastructure/sequelize/SequelizeCipaRepository.ts:69-71`: `SstTreinamento.findOne({ where: { employee_id: employeeId, norma: 'CIPA' }, order: [['data_realizacao','DESC']] })`. Nenhum predicado sobre `validade` |
| O use case compensa depois? | Não. `TakeOfficeUseCase.ts:33-36` só testa `!treinamento`; `:38-41` grava `treinamento_cipa_id` e `posse_confirmada_em` |
| Scope/hook do model filtra? | Não. `models/SstTreinamento.ts:45,55` — coluna nullable e índice; sem `defaultScope`, sem `hooks` |
| Constraint/trigger no banco? | Não — §2. A FK `fk_sst_membros_cipa_treinamento` (`baseline:23624`) é `ON DELETE SET NULL`: garante existência da linha, nunca vigência. O `COMMENT` (`baseline:13848`) reconhece que a regra é "validado em app" |
| Teste que provaria o contrário? | Não. `server/tests/unit/sst-cipa.test.ts:36` mocka `findValidCipaTraining → {id:900}`; `:106-109` (o teste rotulado "FLUXO DE EXCECAO (BR-SST-024)") apenas troca o mock por `null`. Grep próprio: **nenhum arquivo em `server/tests` menciona `SequelizeCipaRepository`**. A suíte é estruturalmente incapaz de ver o defeito — 3ª ocorrência do padrão `FIND-ERP-008` nesta run |
| A UI evita ou força o caminho? | Nenhum caminho de UI: grep próprio de `take-office\|takeOffice\|posse` em `client/src` retorna só `api/sst.ts:497` (`posse_registrada?: boolean`, campo de leitura). O endpoint é **API-only** |

Lado documental relido: `docs/business/BLOCO_1_SST_REQUISITOS.md:100` — RF-SST-033, P0, BR-SST-024:
"Bloqueio de posse de membro (eleito ou designado) sem TreinamentoSST de CIPA registrado **e
válido**". A própria mensagem de erro do código (`TakeOfficeUseCase.ts:35`) afirma "válido".

**Por que HIGH e não MEDIUM (calibração pedida pelo autor).** `T12-M07` é MEDIUM por ser
**lista/relatório falso** (PT vencida continua `emitida`, sem verificação ativa na leitura).
`T27-SST-F01` **não** é dessa classe: é um **gate de escrita** que falha exatamente na metade do
predicado para o qual existe, num ato de alçada `sst:approve` (`server/src/modules/sst/presentation/routes/sst.ts:92`),
produzindo registro afirmativo (`posse_confirmada_em` + `treinamento_cipa_id`) que é peça
probatória perante fiscalização NR-5. Falha de gate ≠ falha de relatório. HIGH mantido.

**Atenuante registrado, que não altera a severidade:** exposição hoje é só via API, e o ato exige
`sst:approve`. Atenua a probabilidade de acionamento acidental, não a consequência.

**Alerta de escopo de remediação (para SanaCore e para o reteste do director):** acrescentar
`validade >= hoje` ao `where` **não fecha o finding**. `CreateTrainingUseCase.ts:50-59` só calcula
`validade` quando existe item de matriz com `periodicidade_reciclagem_meses` **ou** quando a norma
é `NR-10`; e `CreateTrainingMatrixUseCase.ts:28-31` **não exige** periodicidade. Logo
`sst_treinamentos.validade` é `NULL` na maioria dos casos, e um filtro ingênuo por `validade`
apenas trocaria "aceita vencido" por "rejeita todo mundo" ou manteria o buraco, conforme a
semântica escolhida para `NULL`. **A remediação precisa decidir e registrar o significado de
`validade IS NULL` (Regra 6: decisão do dono, não do agente).** Sem isso, o reteste pode passar
com o gate ainda parcialmente cego.

---

### 3.2 `T27-SST-F02` — blocklist trata `validade = null` como nunca vencido

**Veredito: `CONFIRMED` quanto ao defeito. Severidade HIGH — NÃO SUSTENTADA: rebaixada para
`MEDIUM`.**

Defeito confirmado por leitura direta:
`server/src/modules/sst/infrastructure/sequelize/SequelizeTrainingRepository.ts:78` —
`const vencido = !treinamento || (treinamento.validade && treinamento.validade < hoje);`
Com `validade = null` o segundo termo é falso e o funcionário **sai** da lista. Não é caso raro:
ver §3.1 (`CreateTrainingUseCase.ts:50-59` × `CreateTrainingMatrixUseCase.ts:28-31`) — `NULL` é o
caso **majoritário**, não a exceção. O mesmo ponto cego reaparece no filtro
`vencido=true` (`:50`, compara `validade` com `Op.lt` e portanto descarta `NULL`).
Teste: `server/tests/unit/sst-training.test.ts:79-88` mocka `findBlocklist` e afirma o próprio
mock; o use case é passthrough (`GetTrainingBlocklistUseCase.ts:22`). Zero linha da regra
exercitada; nenhum teste instancia `SequelizeTrainingRepository` (grep próprio em `server/tests`).

**Lacuna do autor resolvida — resultado: rebaixa, não eleva.** O autor declarou não ter localizado
consumidor do Apontamento. Minha varredura:

- `server/src/modules/production` — grep por `sst|SST|treinamento|blocklist|training`: **zero
  ocorrências**. Não existe gate de apontamento consumindo a lista.
- `server/src` — os únicos pontos são rota (`sst.ts:118`), controller
  (`trainingController.ts:66-69`), use case, interface e a implementação. Nenhum consumidor.
- `client/src` — **localizei o consumidor que faltava**: `client/src/pages/sst/TrainingsTab.tsx:45-60`
  (query `sst-trainings-blocklist`, banner "N funcionário(s) bloqueado(s) por treinamento
  vencido"). É **exibição**, não bloqueio.
- O adaptador de RH que consome SST usa a **matriz**, não a blocklist
  (`server/src/modules/rh/infrastructure/adapters/TrainingMatrixServiceAdapter.ts:28`, montado em
  `rh/presentation/controllers/trainingController.ts:33`), conforme o próprio comentário da rota
  (`sst.ts:109-114`).

**Fundamento do rebaixamento.** O requisito relido — `BLOCO_1_SST_REQUISITOS.md:123`, RF-SST-046 —
define o artefato como *"Lista de bloqueio operacional: funcionário sem treinamento obrigatório
válido para sua função, **visível a liderança e SST**"*: é requisito de **visibilidade**. No
`AUDIT_COMMIT` não existe nenhum consumidor que bloqueie. O efeito atual é, literalmente,
**relatório falso com subnotificação sistemática** — a mesma classe de `T12-M07` (lista falsa por
ausência de verificação ativa), classificada MEDIUM nesta mesma run. Uniformidade de calibração
exige MEDIUM.

**Condição explícita de reelevação (registrar no finding):** no instante em que qualquer consumidor
operacional (Apontamento de Produção, RNF-SST-06, previsto em `docs/business/BLOCO_1_SST_API.md:645`)
passar a chamar `GET /api/sst/trainings/blocklist` como gate, o finding volta a **HIGH** sem nova
auditoria — vira bloqueio que não bloqueia. Recomendo que o consolidator carregue essa condição
para o backlog de T-26/G4.

---

### 3.3 `T27-RFQ-01` — cotação reescrita depois do mapa comparativo, sem histórico e sem valor no log

**Veredito: `CONFIRMED`. Severidade HIGH — SUSTENTADA.**

Cadeia relida integralmente:

1. Janela aberta: `RegisterRfqQuoteUseCase.ts:21` — `QUOTABLE_STATUSES = ['sent','quoted']`; `:59-64`
   rejeita apenas fora desses dois. `quoted` é o estado em que o mapa já existe e é o **único**
   estado adjudicável (`AwardRfqUseCase.ts:114-119`). Logo a janela de reescrita cobre toda a fase
   de decisão.
2. Exposição prévia dos concorrentes: `GetRfqComparisonUseCase.ts:57-86` devolve `unit_price`,
   `line_total` e `is_best_price` de **todos** os fornecedores; a rota exige apenas
   `authorizeModule('compras')` (`server/src/modules/rfq/presentation/routes/rfqs.ts:16`).
3. Sobrescrita sem retenção: `RegisterRfqQuoteUseCase.ts:84-101` — havendo cotação do par, chama
   `updateRfqQuote(existingQuote.id, payload, transaction)`; `payload` (`:86-94`) não carrega o
   valor anterior e nada o persiste.
4. Sem histórico no banco: `rfq_quotes` (`baseline:12014-12025`) tem só `created_at`/`updated_at`;
   **nem sequer `created_by`/`updated_by`** — a linha não identifica quem a digitou. Nenhuma
   trigger (§2), nenhuma tabela de histórico.
5. Log sem o dado que importa: `rfqController.ts:187-194` — `logAction` de `register_quote` grava
   `newValues: { supplier_id, status }`. **Não grava preço, não grava item, não grava `oldValues`**
   — e `oldValues` é suportado pela infraestrutura (`server/src/services/auditLogService.ts:26,128,151`).
   Contraste interno no mesmo repositório: `saleController.ts:286` grava
   `newValues:{unit_price, valid_from, valid_until}`.

Refutações tentadas e falhas: (a) middleware genérico de auditoria de corpo de requisição — não
existe: `server/src/middlewares` contém apenas `auth.ts`, `authorizeAnyModule.ts`,
`authorizeSelfOrModule.ts` como arquivos que mencionam auditoria/authz, nenhum grava `req.body`;
(b) trigger de banco — inexistente (§2); (c) congelamento do preço vencedor — existe
(`AwardRfqUseCase.ts:308-311` grava `awarded_unit_price`; `:261-273` replica no item do pedido),
mas isso preserva apenas o **preço adjudicado**, e o vetor do finding é a manipulação dos preços
**perdedores**, que desaparecem sem rastro; (d) teste — `rfq.test.ts` cobre o upsert como
funcionalidade desejada, nenhum caso de rastreabilidade.

**Por que HIGH se sustenta.** Um único `compras:operate` consulta o mapa e reescreve a cotação de
qualquer concorrente até o `award`, e o sistema, terminada a operação, **não consegue demonstrar o
que foi substituído nem quem o fez** — a linha de `rfq_quotes` não tem autor e o `audit_log` não
tem valor. Não é apenas falha de controle preventivo: é perda de auditabilidade de ato de decisão
econômica em módulo de produção, o que remove inclusive a detecção *ex post*. O argumento
"upsert é decisão de produto" (JSDoc `RegisterRfqQuoteUseCase.ts:5-8`) justifica a correção de
digitação; **não** justifica a janela aberta em `quoted` somada à ausência total de valor no log.
As duas escolhas são independentes e ambas ausentes. HIGH mantido.

---

### 3.4 `T27-RFQ-04` — adjudicação sem segregação de função

**Veredito: `CONFIRMED` quanto ao fato. Severidade HIGH — NÃO SUSTENTADA: rebaixada para
`MEDIUM`, com fundamento em compensação medida por leitura própria.**

Fato confirmado: grep próprio de `assertApproverIsNotRequester` em `server/src` → **1 definição +
4 call sites**: `shared/domain/segregationOfDuties.ts:134` (def);
`purchaseRequisitions/.../ChangePurchaseRequisitionStatusUseCase.ts:104`;
`comex/.../ApproveImportProcessUseCase.ts:82`; `purchases/.../ChangePurchaseStatusUseCase.ts:134`;
`purchases/.../ApprovePurchaseUseCase.ts:86`. **Nenhum em `rfq`.** Grep próprio de
`created_by|requester_id|userId|user_id` em `AwardRfqUseCase.ts` → apenas `:46` (tipo) e `:280`
(`requester_id: input.userId`): o use case **não lê** `rfq.created_by` nem o autor das cotações.
`docs/suprimentos/01-COMPRAS.md:57-62` lista 4 atos cobertos por D-K e **a adjudicação não está na
tabela**, nem como ausência justificada.

**Compensação medida — mais ampla do que a que o autor registrou.** O autor mediu **uma** das
duas pontas. Existem duas, ambas relidas:

1. **A montante (demanda):** `AwardRfqUseCase.ts:211-219` — havendo requisição de origem, ela é
   travada (`findRequisitionByIdForUpdate`) e precisa estar aprovada, senão nada é criado; e essa
   aprovação já passou por D-K (`ChangePurchaseRequisitionStatusUseCase.ts:104`,
   `D-K-REQUISICAO`). O *o quê* e o *quanto* já foram aprovados por uma segunda identidade antes
   de o adjudicador agir.
2. **A jusante (compromisso):** o pedido nasce `status: 'pending'` com
   `requester_id: input.userId` (`AwardRfqUseCase.ts:280,288`). Para chegar a `approved`,
   `ChangePurchaseStatusUseCase.ts:127-143` aplica **primeiro** D-K
   (`assertApproverIsNotRequester`, `:134-140`) e **depois** a alçada G11
   (`_assertApprovalAuthority`, `:142`); o cabeçalho do próprio método (`:118-126`) documenta que
   sem `approved` o pedido nunca chega a `sent` e portanto nunca gera conta a pagar no
   recebimento. A alçada de diretoria é exigida para importação em qualquer valor e para nacional
   acima de `PURCHASE_APPROVAL_THRESHOLD_DIRECTOR = 500000`
   (`server/src/modules/purchases/domain/constants.ts:74,172`), e o registro dessa alçada tem D-K
   próprio (`ApprovePurchaseUseCase.ts:78-92`, `D-K-ALCADA`).

Note-se que o *admin bypass* de `middlewares/auth.ts` (agravante sistêmico citado pelo autor, cujo
dono é T-09/`FIND-ERP-009`) **não derrota** D-K: `assertApproverIsNotRequester` compara ids de
usuário (`segregationOfDuties.ts:112-119,134-135`), não papéis.

**Fundamento do rebaixamento.** Nenhum compromisso financeiro se materializa por uma única
identidade: a demanda foi aprovada por outra pessoa antes, e o pedido gerado exige outra pessoa
depois (mais diretoria acima do teto/importação). O risco residual **real e não coberto** é mais
estreito do que "ato aprovatório sem segregação": é **a escolha do vencedor e do preço dentro de
uma demanda já aprovada** — um único `compras:approve` decide sozinho quem vende e a que preço, e
o aprovador do pedido recebe fornecedor e preço congelados (`AwardRfqUseCase.ts:308-311,261-273`)
sem obrigação sistêmica de rever o mapa comparativo. Isso é favorecimento possível com detecção
dependente de diligência humana — MEDIUM, não HIGH.

**Não é descarte.** `CONFIRMED` com severidade MEDIUM segue para remediação. Registro três
condicionantes:

- **Interação com `T27-RFQ-01`:** enquanto a cotação perdedora puder ser reescrita sem rastro, a
  detecção *ex post* do favorecimento é impossível. O par (`T27-RFQ-01` + `T27-RFQ-04`) é a
  exposição material; remediar `T27-RFQ-01` primeiro restaura a auditabilidade e reduz o residual
  de `T27-RFQ-04`. **Recomendo ao consolidator tratá-los como par ordenado.**
- **Reelevação por decisão do dono (Regra 6/21):** se o dono do produto declarar a adjudicação
  como 5º ato de D-K (`01-COMPRAS.md:57-62`), o finding volta a HIGH por violação de regra
  documentada. Hoje a regra **não existe** no artefato — o finding aponta ausência de controle,
  não descumprimento de requisito.
- A compensação a jusante é **de valor, não de escolha**: nacional abaixo de R$ 500.000 exige só
  a segunda identidade do D-K, sem diretoria.

---

### 3.5 `T27-RFQ-05` — BR-COM-011 sem transação, sem lock e sem constraint

**Veredito: `CONFIRMED` quanto ao fato. Severidade HIGH — NÃO SUSTENTADA: rebaixada para
`MEDIUM`.**

Fato confirmado por leitura direta (arquivo em
`server/src/modules/sales/application/use-cases/CreateCustomerPriceUseCase.ts` — note-se que o
caminho citado na origem, `.../use-cases/customer-price/...`, **não existe**; divergência de
âncora registrada em §5):

- `CreateCustomerPriceUseCase.ts:60-65` — *read-then-write*: `_findOverlap` e, se nada retornar,
  `createCustomerPrice`. `:92-105` — comparação **em memória**, com o próprio JSDoc (`:80-83`)
  declarando a escolha de não usar SQL de intervalo.
- `SequelizeSaleRepository.ts:233-237` (`listActiveCustomerPricesForProduct`) e `:243-245`
  (`createCustomerPrice`): `findAll`/`create` **sem `transaction` e sem `lock`**.
- `saleController.ts:263-292` — nenhuma `sequelize.transaction()`; contraste literal no mesmo
  repositório: `rfqController.ts:172,220`.
- Banco: §2 — só PK, 3 índices não únicos, sem UNIQUE/EXCLUDE/CHECK/trigger, e nada nas 19
  migrations pós-freeze.
- `UpdateCustomerPriceUseCase.ts:53-60,67` herda a mesma janela (`price.save()` após leitura não
  travada).
- Teste: `customer-price-list.test.ts` cobre o caso **sequencial** com repositório mockado; nenhum
  teste de concorrência.

Refutações tentadas: (a) constraint/trigger — inexistentes (§2); (b) transação em camada superior
— inexistente (controller lido integralmente na faixa `:237-360`); (c) *retry*/lock otimista no
model — `models/CustomerPriceList.ts:32-52` não declara `version` nem hooks.

**Fundamento do rebaixamento — dois fatos que só aparecem quando se procura refutar:**

1. **A única via de exploração é uma corrida real.** O caminho **sequencial está fechado nos dois
   endpoints de escrita**: criação (`:60-65`) e edição (`UpdateCustomerPriceUseCase.ts:53-60`)
   checam sobreposição; e **não existe caminho de reativação**: `updateCustomerPriceSchema`
   (`saleValidators.ts:99-104`) é `.strict()` e não aceita `active`, e o DELETE só desativa
   (`DeactivateCustomerPriceUseCase.ts:33-35`). Não há bypass por sequência de chamadas — só por
   simultaneidade.
2. **O invariante protege uma tabela sem consumidor operacional.** Varredura própria:
   em `server/src`, os únicos leitores de `CustomerPriceList` são o próprio CRUD
   (`ListCustomerPricesUseCase.ts:32` → `SequelizeSaleRepository.ts:205-215`, `:221-225`, `:233-237`)
   e as associações do `models/index.ts:924-931`; **nenhum use case de venda lê a tabela**. Em
   `client/src`, o único consumo é `pages/sales/ClientsPage.tsx:208-210` — a própria tela de
   cadastro. Ou seja: dois preços ativos e sobrepostos produzem **um cadastro incoerente que
   nenhuma decisão consome** — não produzem pedido, nota nem cobrança errada hoje.

Somando: (i) exige corrida; (ii) o invariante violado **não tem fonte documental** — o próprio
relatório de origem registra BR-COM-011 como "sem documento de origem", e eu não localizei
requisito que a fixe, logo não há requisito descumprido, e sim invariante auto-imposto pela
aplicação; (iii) impacto atual limitado a integridade de cadastro órfão. Isso é **MEDIUM**,
mesma família de `T13-F02`/`T13-F03` (constraint ausente), como o próprio autor identificou.

**Condição explícita de reelevação:** no momento em que qualquer fluxo de venda passar a consumir
`customer_price_lists` (ou seja, quando `T-27-07` for remediado), o ambíguo passa a ter efeito
econômico e o finding volta a **HIGH**. **A ordem de remediação importa: `T27-RFQ-05` deve ser
remediado antes ou junto de `T-27-07`, nunca depois.** Registro isso ao consolidator como
dependência entre findings.

---

## 4. Quadro-resumo dos vereditos

| ID canônico | Veredito | Severidade proposta | Severidade validada | Confiança | Segue para SanaCore? |
|---|---|---|---|---|---|
| `T27-SST-F01` | **CONFIRMED** | HIGH | **HIGH (mantida)** | CONFIRMED | Sim (Regra 22 cumprida) |
| `T27-SST-F02` | **CONFIRMED** | HIGH | **MEDIUM (rebaixada)** | CONFIRMED | Sim, como MEDIUM |
| `T27-RFQ-01` | **CONFIRMED** | HIGH | **HIGH (mantida)** | CONFIRMED | Sim (Regra 22 cumprida) |
| `T27-RFQ-04` | **CONFIRMED** | HIGH | **MEDIUM (rebaixada)** | CONFIRMED | Sim, como MEDIUM, pareado a `T27-RFQ-01` |
| `T27-RFQ-05` | **CONFIRMED** | HIGH | **MEDIUM (rebaixada)** | CONFIRMED | Sim, como MEDIUM, antes ou junto de `T-27-07` |

Nenhum `FALSE_POSITIVE`, nenhum `DUPLICATE`, nenhum `NEEDS_MORE_EVIDENCE`. Os cinco são
tecnicamente demonstráveis por leitura estática (todos são provas de **ausência de código ou de
constraint**, melhor demonstradas assim do que por execução); nenhum depende de "pode haver um
problema". **Prova dinâmica continua ausente para os cinco** — os `DYN-T27-*` propostos pelas duas
trilhas permanecem pertinentes e pendentes de G4; os vereditos acima valem como confirmação
estática, sob o mesmo regime `CONFLITO-G3×G4`/RES-11 já usado em T-12.

**Placar de HIGH deste bloco: 2 mantidos, 3 rebaixados, 0 refutados.**

---

## 5. Divergências novas registradas nesta validação (Regra 20 — registro, não conciliação)

| ID | Divergência | Partes | Encaminhamento |
|---|---|---|---|
| `DIV-T28-01` | Colisão de ID: `T27-F01`/`T27-F02` em SST **e** em Jurídico; `T-27-01` × `T27-F01` quase homógrafos | dois relatórios de T-27 | Resolvida aqui por qualificação de trilha (§1). **Consolidator deve adotar o ID canônico e reescrever as referências cruzadas** |
| `DIV-T28-02` | Âncora de caminho errada na origem: `T-27_DEF-03` cita `CreateCustomerPriceUseCase.ts` sem informar o diretório real; o arquivo está em `server/src/modules/sales/application/use-cases/`, **não** em `.../use-cases/customer-price/` | relatório × repositório | Correção de âncora; **não afeta** o mérito — números de linha conferem exatamente |
| `DIV-T28-03` | `T27-SST-F02` declara "nenhum consumidor localizado"; existe consumidor de **exibição** em `client/src/pages/sst/TrainingsTab.tsx:45-60` | relatório × client | Registrado; foi insumo do rebaixamento (consumo é visual, não gate) |
| `DIV-T28-04` | `T27-RFQ-04` mede **uma** compensação (D-K no pedido); existem **duas** (D-K na requisição a montante + D-K e G11 no pedido a jusante) | relatório × código | Fundamento do rebaixamento (§3.4) |
| `DIV-T28-05` | RF-SST-046 (`REQUISITOS:123`) é requisito de **visibilidade** ("visível a liderança e SST"), enquanto `BLOCO_1_SST_API.md:645` promete consumo por gate do Apontamento (RNF-SST-06) que **não existe** no `AUDIT_COMMIT` | dois artefatos oficiais | **Escala ao director** (Regra 21) — determina se `T27-SST-F02` é defeito de relatório ou gate faltante |

---

## 6. Observação de método sobre as duas trilhas de origem

Registro em favor dos autores, com o mesmo peso das divergências: os dois relatórios trouxeram
**calibração explícita e antecipada** (`T27-F01` citando `T12-M07`; `T-27-01` admitindo que MEDIUM
é defensável) e **lacunas declaradas** em vez de omitidas. Foi exatamente isso que tornou possível
refutar severidade sem refutar fato. Os três rebaixamentos decorrem de evidência que os autores
**não tinham medido**, não de erro de leitura: todas as âncoras que eles citaram e que eu reli
conferem.

---

## 7. Encerramento

- Os **5 findings HIGH** encaminhados a este agente têm veredito de validação registrado. A
  exigência da Regra 22 está cumprida para o bloco SST + RFQ/Preços de T-27.
- **Nenhum finding foi corrigido, refatorado ou fechado.** Nenhum arquivo de `server/src`,
  `client/src`, `tests/`, `server/database`, `product/`, `requirements/` ou `architecture/` foi
  tocado (Regra 2).
- **Não se declara** `AUDIT_PASSED`, `RETEST_PASSED` nem `FINDING CLOSED` (Regra 4) — `FINDING
  CLOSED` é do `vericore-software-audit-director` após reteste.
- **Nenhum finding novo foi criado** (Regra 6/escopo do validator). As duas condições de
  reelevação (§3.2, §3.5), a dependência de ordem `T27-RFQ-05` → `T-27-07`, o par ordenado
  `T27-RFQ-01` → `T27-RFQ-04` e o alerta de escopo de remediação de `T27-SST-F01` são
  **qualificações dos findings existentes**, a serem carregadas pelo consolidator.
- Encaminhamentos: **`vericore-audit-consolidator`** — os 5 CONFIRMED com as severidades validadas
  e o mapeamento de ID canônico; **`vericore-software-audit-director`** — `DIV-T28-05` (Regra 21) e
  a decisão do dono sobre adjudicação como 5º ato de D-K; **`vericore-audit-evidence-controller`** —
  persistência deste veredito em `audit/`.
