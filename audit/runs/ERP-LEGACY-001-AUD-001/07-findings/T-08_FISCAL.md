# T-08 — FISCAL · RELATÓRIO DE TRILHA

> **Nota de persistência.** Produzido pelo `vericore-business-process-auditor` (T-08 fiscal NF-e) e persistido
> **sem alteração de conteúdo** pelo orquestrador — o agente é read-only por
> desenho e não pode escrever em `audit/`. O juízo de auditoria é
> integralmente da trilha. Única transformação aplicada: promoção do
> cabeçalho a H1 e desescape de entidades HTML.

---

| Campo | Valor |
|---|---|
| **AUDIT_ID** | `ERP-LEGACY-001-AUD-001` |
| **TRILHA** | T-08 — FISCAL (onda W2), plano §4.3 (`AUDIT_PLAN.md:317-325`) |
| **TITULAR** | `vericore-business-process-auditor` |
| **AUDIT_COMMIT** | `c1311a6f76b512fef893f7e60d934179cae3409f` — arquivos lidos direto do disco em `c:/Sistema EvokAudio/ERP-Evok--Audio-LTDA/`; nenhum HEAD/branch consultado |
| **REGIME** | `APR-2026-016` read-only reforçado — zero conexões de banco, zero execuções, zero escritas. Nenhum segredo extraído (li apenas nomes de variáveis de ambiente) |
| **REGRA 22** | Todos os findings saem `PROPOSED` ao `vericore-finding-validator`. Nada aqui é `CONFIRMED` como veredito de auditoria |
| **REGRA 2** | Nenhum arquivo do objeto auditado foi alterado; nenhum arquivo criado em disco |
| **IN-08** | **Nenhuma afirmação de origem/commit de código é feita neste relatório.** Não executei `git log`/`git show`; onde o próprio código traz datas (ex.: "2026-08-06", "D-M 2026-08-10") elas são citadas **como texto do arquivo**, não como fato histórico verificado |

### Cobertura efetiva (declaração honesta, G3 — profundidade exaustiva, amostragem zero)

O plano descreve o módulo como "2 endpoints". **Isso é verdadeiro apenas para o prefixo `/api/fiscal`** (`fiscal.ts:14-15`). A superfície real do módulo `fiscal` no `AUDIT_COMMIT` é de **7 use cases, 7 handlers de controller e 3 provedores**, expostos por **6 rotas em 3 roteadores distintos** (`sales.ts:54,55,56,60`, `purchases.ts` via `registerIncomingNfe`, `webhooks.ts:13`) mais o `fiscal.ts`. Li **100%** de: os 7 use cases, o controller, os validators, as rotas, o repositório Sequelize, os 3 provedores, o port, `TaxCalculationService`, `SaleInvoiceAccumulator`, o model `SaleInvoice`, o model `CompanyFiscalConfig`, a migration `20260806-000100`, os 4 documentos de `docs/tributario/`, os 2 testes de caracterização do passo 30, e os caminhos externos que a máquina de estados fiscal toca (`ChangeSaleStatusUseCase`, `EditSaleItemsUseCase`, `saleReceivableService.createInvoiceReceivables`).

**Não coberto:**
- **RES-T08-01** — nenhuma verificação dinâmica (G4 reserva execução ao `vericore-audit-verification-runner`). As três janelas assíncronas (T08-F07, F08, F09) e o backfill (F12) são provados por leitura estática de fluxo, não por observação. 6 pedidos `DYN-T08-nn` na §6.
- **RES-T08-02** — `saleStockService.ts` e `saleLotService.ts` foram lidos apenas nas assinaturas consumidas pelo módulo fiscal; a lógica interna de baixa/devolução por lote é de T-10/T-06.
- **RES-T08-03** — nenhuma tela de `client/` inspecionada (T-21). Não afirmo nada sobre o que o usuário vê do estado fiscal.
- **RES-T08-04** — a perna de **entrada** (crédito de ICMS/IPI na compra, escrituração da nota do fornecedor) foi auditada apenas em `RegisterIncomingNfeUseCase`; a apuração de crédito não existe no código e não tem dono de trilha declarado.
- **RES-T08-05** — não avaliei se as alíquotas do código estão corretas perante a legislação vigente em 2026-08-14. **Isso é deliberado e é o núcleo de T08-F02:** a auditoria não pode ser a fonte normativa que o repositório não tem.

---

## 1. Matriz desenho × implementação por transição de NF-e (entregável de conclusão)

Desenho de referência: `docs/tributario/SETUP_FISCAL_NFE_2026-07-31.md:16-32` e `docs/tributario/00-README.md:56-85` (não existe BPMN versionado — ver §5, lacuna PROC).

| # | Transição | Evento / rota | Ator e permissão **desenhados** | Ator e permissão **implementados** | Pré-condição implementada | Efeito implementado | Log | Veredito |
|---|---|---|---|---|---|---|---|---|
| 1 | `pending → processing` | `POST /api/sales/:id/nfe` | "confirmar venda e chamar" (`SETUP:90-92`), sem ator | `vendas:approve` (`sales.ts:54`) | `status ∈ {confirmed, partially_invoiced}` (`IssueSaleNfeUseCase.ts:113`); `nfe_status ≠ processing` (`:116`); lotes liberados (`:168`); config com CNPJ+IBGE (`:183`) | reserva série/número sob lock (`:187-189`), calcula e **persiste tributos no `SaleItem`** (`:228-229`), cria `sale_invoices` (`:266`) | **só ao fim do request** (`fiscalController.ts:46`) | **Conforme, com lacuna de log** |
| 2 | `processing → authorized` (síncrono) | mesmo request | — | idem #1 | resultado do provedor | baixa estoque + `invoiced_quantity` + AR + `sale.status` (`:396-433`) | sim | Conforme |
| 3 | `processing → authorized` (assíncrono, humano) | `GET /api/sales/:id/nfe` | não previsto no desenho | **`vendas` nível view** (`sales.ts:55`) | nenhuma além de `nfe_provider_ref` existir | **idênticos ao #2** (`GetSaleNfeStatusUseCase.ts:156-194`) | **nenhum** | **Divergente — T08-F21 / T-10-04** |
| 4 | `processing → authorized` (webhook) | `POST /api/webhooks/focus-nfe` | "webhook protegido por segredo" (`SETUP:29-32`) | **sem usuário**; segredo compartilhado (`webhookController.ts:52-60`) | idem | idem, com `userId` = **vendedor da venda** (`:162`) | **nenhum** | **Divergente — T08-F21** |
| 5 | `processing → denied` | qualquer dos acima | não desenhado | idem | — | grava mensagem; **número da NF-e permanece consumido** | parcial | **Lacuna de processo — T08-F10** |
| 6 | `authorized → cancelled` | `POST /api/sales/:id/nfe/cancel` | não desenhado | `vendas:approve` (`sales.ts:56`) | `nfe_status = authorized` (`CancelSaleNfeUseCase.ts:94`); justificativa ≥15 (`:88`) | **total, OU nenhum** (`:174-181`) | sim (`fiscalController.ts:89`) | **Divergente — T08-F05** |
| 7 | `authorized → cancelled` (descoberto por reconsulta) | `GET .../nfe` ou webhook | não desenhado | view / nenhum | `nfe_status ∉ {authorized, cancelled}` (`:88`) | **grava o status e nada mais** | nenhum | **Divergente — T08-F09** |
| 8 | `* → corrigida` (CC-e), `faixa → inutilizada` | — | **não desenhado** | **não existe** | — | — | — | **Etapa obrigatória do processo real ausente dos dois lados — T08-F22** |

**Critério de pronto do plano — "cada tributo calculado tem fonte normativa citada, ou é registrado como regra sem fonte":**

| Tributo | Fonte citada no código | Veredito |
|---|---|---|
| ICMS interestadual | `TaxCalculationService.ts:62` — "Resolução do Senado 22/1989 e 13/2012" | **Com fonte** (a exceção de 4% para importado é declarada ausente em `:68`) |
| ICMS interno por UF | **nenhuma** (`:52-59` diz apenas "padrão geral, simplificado") | **REGRA SEM FONTE — T08-F02** |
| ICMS CSOSN 102 / CST 40 / 00 | `:102-111`, prosa sem norma | **REGRA SEM FONTE** |
| IPI | `:119-124` — declara explicitamente que assume NT por ausência de tabela | **REGRA SEM FONTE, e contrária ao único documento do projeto — T08-F01** |
| PIS/COFINS | `:137-148` — alíquotas corretas de cumulativo/não-cumulativo, sem citar Lei 9.718/98 nem 10.637/02 e 10.833/03 | **Sem citação, valores conferem com `00-README.md:26-30`** |
| CFOP | `:91-95`, sem norma | **REGRA SEM FONTE, e divergente do doc — T08-F14** |
| DIFAL, ICMS-ST | ausentes | **Etapa desenhada sem código — T08-F13** |

---

## 2. Findings

### T08-F01 — CRITICAL · confiança CONFIRMED · `PROPOSED`
**Toda NF-e de saída da fábrica é emitida com IPI 0% e CST 53 (saída não-tributada), enquanto o único documento tributário do projeto atribui 10% a 15% ao NCM 8518 — que é o produto da empresa.**

- `TaxCalculationService.ts:122-124` — `ipiCst = '53'; ipiAliquot = 0; ipiValue = 0;` constantes, sem nenhum ramo condicional.
- `TaxCalculationService.ts:119-121` — o próprio código declara o motivo: "sem alíquota por NCM cadastrada no catálogo hoje".
- `item.ncm` é recebido (`:30`) e **nunca lido** em nenhum ponto do cálculo — varredura própria de `ncm` no arquivo: só a declaração da interface.
- `docs/tributario/02-ICMS_ESTADOS.md:71-85` — 13 NCMs do capítulo 8518, todas com IPI 10%, exceto `8518.40.00` com 15%.
- **Agravante não registrado em nenhum insumo:** ainda que o IPI fosse calculado, **ele não chegaria à nota**. `FocusNfeProvider.ts:76-97` monta o item com ICMS, PIS e COFINS e **nenhum campo de IPI**; `ENotasProvider.ts:67-79` idem. O port declara `ipi_cst/ipi_aliquot/ipi_value` (`NfeProviderPort.ts:62-64`) e os dois adapters descartam os três.

**Impacto de negócio:** contribuinte industrial (CNAE 2640-0/00, `00-README.md:15`) emitindo saída sem destaque de IPI. Tributo não destacado e não recolhido, em documento fiscal com validade legal; passivo por período não decadente, com multa de ofício e juros; o adquirente também perde o crédito. É o achado de maior valor esperado da trilha.
**Interface:** BR-FIS-003 (`BR_CATALOG.md:265`) — validado por leitura própria, **e ampliado**: o catálogo registra a divergência de alíquota; não registra que o canal de transporte para o provedor não tem o campo.

---

### T08-F02 — HIGH · confiança CONFIRMED · `PROPOSED`
**A tabela de ICMS interno é uma regra fiscal sem fonte: 19 das 27 UFs divergem do documento do projeto, nenhuma alíquota tem norma ou data de vigência citada, e UF desconhecida cai em 18% silenciosamente.**

- `TaxCalculationService.ts:55-59` — literal de 27 UFs; o comentário `:52-54` não cita nenhuma norma.
- `TaxCalculationService.ts:114` — `ICMS_INTERNAL_RATE[company.state] ?? 18` — sem validação da UF, sem erro, sem log.
- `docs/tributario/02-ICMS_ESTADOS.md:9-35` — tabela rotulada "(2024)", divergente. Amostra conferida por leitura própria: AC 17↔19, AL 17↔19, AM 18↔20, BA 18↔19, CE 18↔20, DF 18↔20, GO 17↔19, PE 18↔20,5, PI 18↔21, RJ 18↔20, RO 17,5↔19,5, RR 17↔20, TO 18↔20 — e **RS 18↔17, único sentido em que o código tributa menos**.
- Congelado em `comercial-financeiro--tributos-vigentes.test.ts:55-91`. **Teste de caracterização congela, não valida** — declarado no próprio cabeçalho (`:32-34`) e reafirmado aqui.

**Impacto:** os valores do código são plausivelmente mais recentes que os do documento, o que torna o defeito pior, não melhor: **não existe no repositório nenhum artefato que diga qual dos dois é a verdade, quem decidiu, e a partir de que data**. Erro para menos gera autuação; para maior, cobrança indevida do cliente. O fallback de 18% transforma um typo em `CompanyFiscalConfig.state` em erro tributário sistemático e invisível.
**Interface:** BR-FIS-001 (`BR_CATALOG.md:263`) — confirmado por leitura própria. **Acrescento a dimensão que o catálogo não tem: ausência de vigência/versionamento**, sem a qual nenhuma remediação é verificável.

---

### T08-F03 — HIGH · confiança CONFIRMED · `PROPOSED`
**"Produção" e "homologação" têm duas fontes de verdade independentes, e o adapter Focus NFe ignora a que o ERP grava no registro fiscal.**

- `IssueSaleNfeUseCase.ts:256` grava `sale.nfe_environment = config.nfe_environment` e `:302` repassa `environment` ao provedor.
- `FocusNfeProvider.ts:49` — a URL base vem de `process.env.FOCUS_NFE_ENVIRONMENT`, resolvida **no construtor**; `:100` usa `this.baseUrl`. **`payload.environment` não é lido em nenhuma linha do arquivo.**
- Contraste que prova que o projeto sabe fazer: `ENotasProvider.ts:51` — `ambienteEmissao: payload.environment === 'producao' ? ...`.

**Impacto:** com `FOCUS_NFE_ENVIRONMENT=producao` e `nfe_environment='homologacao'` no banco, o ERP emite **documento fiscal com validade real acreditando estar em teste**, e grava `homologacao` no próprio registro da nota — o campo que um auditor usaria depois para separar teste de produção passa a mentir. O inverso (config diz produção, emissão vai para homologação) produz venda faturada, estoque baixado e cliente cobrado por uma nota sem existência fiscal. O passo 6 do procedimento oficial (`SETUP:97-98`) manda trocar **os dois** — é controle por disciplina humana, não por código.

---

### T08-F04 — HIGH · confiança CONFIRMED · `PROPOSED`
**Nada impede o provedor `mock` de operar com `nfe_environment = 'producao'`, e o mock autoriza tudo, sempre.**

- `MockNfeProvider.ts:19-32` — `issue()` retorna `status: 'authorized'` incondicionalmente, com chave de 44 dígitos aleatórios (`:20`).
- `MockNfeProvider.ts:9-10` — a regra existe, escrita em prosa: *"NUNCA deve ser usado com `nfe_environment = 'producao'`"*. **Regra desenhada, não implementada em lugar nenhum.**
- `UpsertCompanyFiscalConfigUseCase.ts:5-9,26-32` — copia campo a campo, **zero validação cruzada**; `fiscalValidators.ts:46-48` valida os dois enums isoladamente.
- `NfeProviderFactory.ts:22-24` — `default` cai em mock (BR-FIS-009).
- `CompanyFiscalConfig.ts:59-60` / `00_baseline_frozen.sql:4564-4565` — defaults `homologacao` + `mock`.

**Impacto:** um `PUT /api/fiscal/config` de admin com `{"nfe_environment":"producao"}` e o provedor deixado no default produz, a cada `POST /sales/:id/nfe`: `nfe_status='authorized'`, **baixa real de estoque** (`IssueSaleNfeUseCase.ts:396`), **conta a receber real** (`:424`), `sale.status='invoiced'` e uma **chave de acesso falsa gravada como chave de NF-e** — venda inteiramente escriturada no ERP e inexistente na SEFAZ. Combina com T08-F03 para transformar erro de configuração em omissão de receita.

---

### T08-F05 — HIGH · confiança CONFIRMED · `PROPOSED`
**Cancelar NF-e sem snapshot de itens cancela a nota e não cancela nada mais — inclusive a conta a receber, porque o retorno antecipado acontece antes da etapa que a cancela.**

- `CancelSaleNfeUseCase.ts:174-181` — `if (snapshot.length === 0) { logger.warn(...); return; }`.
- As quatro etapas do processo desenhado no JSDoc da própria classe (`:19-32`) ficam **todas** atrás desse `return`: `invoiced_quantity` (`:185-194`), regressão de status (`:203,221-223`), devolução de estoque (`:206-219`) e **`cancelInvoiceReceivables` (`:226-231`)**.
- Fora dele, `locked.nfe_status = 'cancelled'` (`:137`) e o `save` (`:145`) executam normalmente.
- O caminho é alcançável de duas formas: venda sem registro em `sale_invoices` (`:111-113` devolve `null`), e **venda cujo registro retroativo nasceu com `items = []`** — o backfill só inclui linhas com `invoiced_quantity > 0` (`20260806-000100-create-sale-invoices.cjs:148`), campo criado por outra migration (`20260806-000051`).

**Impacto de negócio, na ordem em que o dono sente:** a nota é cancelada na SEFAZ, **o cliente continua com título a receber ativo por uma nota que não existe** (o JSDoc `:36-39` descreve exatamente esse dano como o motivo de a etapa existir), a mercadoria continua baixada do estoque e a venda continua `invoiced`. O único vestígio é um `logger.warn` (`:176`) — não vai para `audit_logs`, e T-03/AUD-DB-02 já demonstrou que a persistência de log é best-effort.
**Nota de honestidade:** o código chama isso de "risco residual documentado em `TODO.md`" (`:169-173`). O texto documenta **apenas o estoque**; o recebível e o status não são mencionados. Documentação parcial de um efeito não é aceite de risco do efeito inteiro.

---

### T08-F06 — HIGH · confiança CONFIRMED · `PROPOSED` — *escalada conjunta com T-10-02 (Regra 20), perna fiscal*
**A NF-e é emitida sobre base de cálculo maior que o valor da operação: o desconto do pedido não existe para o módulo fiscal.**

- `IssueSaleNfeUseCase.ts:213-214` — `invoiceTotal = round(invoiceQty × unitPrice)`; `totalAmount += invoiceTotal`.
- Varredura própria de `discount|desconto` em **todo** `server/src/modules/fiscal/`: **zero ocorrências** (o único hit de `desconto` é o nome do arquivo de teste).
- `:224` — `total_price: invoiceTotal` vai para `TaxCalculationService.calculateItem`, que usa esse valor como `icms_base` (`TaxCalculationService.ts:97`) e como base de PIS/COFINS (`:151-152`).
- Nem `FocusNfeProvider.ts:76-97` nem `ENotasProvider.ts:67-79` possuem campo de desconto — o defeito não é só de cálculo, é de **canal**: ainda que o valor fosse conhecido, não há por onde transmiti-lo.
- Congelado em `comercial-financeiro--desconto-nao-chega-nfe-ar.test.ts:176-189` e **reconferido por leitura própria**, não herdado.

**Diferença deliberada em relação a T-10-02:** T-10 mede o dano comercial (cliente cobrado a mais). A perna fiscal é distinta e adicional — **ICMS, PIS e COFINS são calculados e destacados sobre valor superior ao da operação**, o que produz recolhimento a maior e um documento fiscal que não corresponde ao negócio praticado. **Escalada conjunta, não conciliada.**

---

### T08-F07 — HIGH · confiança HIGH · `PROPOSED`
**Os itens da venda podem ser trocados ou apagados enquanto a NF-e está em emissão no provedor; a reconciliação posterior aceita o desaparecimento em silêncio.**

- `IssueSaleNfeUseCase.ts:253` marca `nfe_status='processing'` e **não altera `sale.status`** — a venda permanece `confirmed`.
- `EditSaleItemsUseCase.ts:73-80` — a guarda inspeciona **somente** `sale.status`; `editableStatuses = ['quote','confirmed']`. **Zero referência a `nfe_status` no arquivo** (varredura própria: `status|nfe` retorna apenas as linhas de `sale.status` e `product.status`).
- `:120` — `deleteSaleItem` remove linhas ausentes do payload (substituição completa, `:41-45`).
- Reconciliação: `GetSaleNfeStatusUseCase.ts:147-151` reconstrói `qtyToInvoiceByItemId` do snapshot e chama `SaleInvoiceAccumulator.applyInvoicedQuantities`, que **itera os itens atuais** (`SaleInvoiceAccumulator.ts:50-53`) — um `sale_item_id` que não existe mais simplesmente não gera `update`, sem erro e sem log.
- Mas o recebível é criado pelo **total da nota** (`GetSaleNfeStatusUseCase.ts:185-192`, `invoiceTotal = saleInvoice.total_amount`), e o status resolve para `invoiced` (`:194`).

**Impacto:** NF-e autorizada na SEFAZ contendo item que não pertence mais ao pedido; estoque não baixado para esse item; cliente cobrado pelo total da nota. A janela é curta com o provedor mock (mesmo request) e **arbitrariamente longa com `focus_nfe`/`enotas`**, que é o cenário de produção real descrito em `GetSaleNfeStatusUseCase.ts:9-19`.
**Por que HIGH e não CRITICAL:** exige concorrência de operador dentro da janela. G3 veda atenuar por baixa probabilidade em integridade de dados fiscais; não veda distinguir de um defeito determinístico. Confiança HIGH e não CONFIRMED porque a janela não foi exercitada (**DYN-T08-05**).

---

### T08-F08 — MEDIUM · confiança CONFIRMED · `PROPOSED`
**O cancelamento é efetivado no provedor antes e fora da transação; qualquer falha posterior deixa a nota cancelada na SEFAZ e o ERP convicto de que ela está autorizada.**
`CancelSaleNfeUseCase.ts:102` — `await provider.cancel(...)` **antes** do `sequelize.transaction` que abre em `:104`. Um rollback em `:105-146` (lock, `NotFoundError` `:106`, falha de `restoreCanceledInvoice`, falha de `save`) desfaz tudo do lado do ERP e nada do lado da SEFAZ. Não há compensação, fila, retry nem marcação de "cancelamento pendente de reconciliação". O caminho de reconsulta que poderia corrigir é o próprio T08-F09, que também não faz nada. Contraste interno: `IssueSaleNfeUseCase.ts:339-347` **tem** tratamento explícito para a falha de comunicação na emissão.

---

### T08-F09 — MEDIUM · confiança CONFIRMED · `PROPOSED`
**Descobrir por reconsulta que a nota foi cancelada só muda um campo: estoque, recebível e status da venda permanecem como se ela estivesse autorizada.**
`GetSaleNfeStatusUseCase.ts:118` grava `locked.nfe_status = result.status`; o único bloco de efeitos é `if (result.status === 'authorized')` (`:134-199`). `'cancelled'` é um retorno legítimo dos dois provedores reais (`FocusNfeProvider.ts:30` `'cancelado' → 'cancelled'`; `ENotasProvider.ts:21` `'Cancelada' → 'cancelled'`). O cancelamento feito **no portal do provedor pelo contador** — que é o caminho operacional mais comum quando o prazo aperta — entra por aqui, não por `POST /nfe/cancel`. Resultado: a única via de cancelamento que executa a decisão D-M do dono é a via interna do ERP; a via externa registra o status e abandona todos os efeitos.

---

### T08-F10 — MEDIUM · confiança CONFIRMED · `PROPOSED`
**Numeração de NF-e: quebras de sequência são produzidas e não há inutilização; a série é livremente alterável e o contador é único e global.**

- `IssueSaleNfeUseCase.ts:187-189` — número reservado e incrementado sob lock pessimista. **Correto e elogiável** quanto a não reusar.
- Consequência: toda emissão `denied` (`:339-347`) consome um número **definitivamente**. Não existe no repositório — nem código, nem documento — o **evento de inutilização de faixa de numeração**, que é o ato que legaliza a lacuna perante o fisco. Varredura própria de `inutiliz` em `server/src`: zero.
- `CompanyFiscalConfig.ts:57-58` — `nfe_series` e `nfe_next_number` são **campos únicos**, não uma sequência por série; `00_baseline_frozen.sql:4631` comenta o campo como *"Proximo numero de NF-e a ser usado (sequencial por serie)"* — **o comentário do banco descreve um controle por série que a coluna não implementa.**
- `nfe_series` é livremente alterável por `PUT /api/fiscal/config` (`UpsertCompanyFiscalConfigUseCase.ts:8`, `fiscalValidators.ts:46`) — corretamente, `nfe_next_number` **não** é aceito (`:12-15`). Mas trocar de série e voltar reaproveita o contador, e não existe unicidade de `(nfe_series, nfe_number)` no banco: os únicos índices são `sale_id`, `nfe_provider_ref` (único) e `nfe_status` (`20260806-000100:103-108`). O `nfe_provider_ref` inclui o `saleId`, então **não impede** duas vendas com mesma série e número.

---

### T08-F11 — MEDIUM · confiança CONFIRMED · `PROPOSED` — *interface obrigatória com T-03*
**`sale_invoices` é a única memória do que cada NF-e continha, e não tem nenhuma proteção de imutabilidade — nem no banco, nem na aplicação.**

- Varredura própria de `sale_invoices` em `server/migrations/`: **2 arquivos** (`20260806-000100` que cria, `20260810-000039` que referencia). **Nenhuma trigger, nenhuma `RULE`, nenhuma constraint de imutabilidade, nenhuma coluna de hash/assinatura.**
- `items` é `JSONB` comum (`SaleInvoice.ts:69-74`), atualizável; `total_amount`, `nfe_key` e `nfe_protocol` idem.
- A garantia declarada no model — *"`nfe_status` … nunca regride depois de `authorized`/`denied`/`cancelled`"* (`SaleInvoice.ts:37-39`) — é imposta **em um único caminho de aplicação**, a variável `alreadyReconciled` (`GetSaleNfeStatusUseCase.ts:116,125,146,202`). `CancelSaleNfeUseCase.ts:140` e `IssueSaleNfeUseCase.ts:367` escrevem sem essa checagem. **Invariante de documento fiscal sustentada por convenção de código.**
- `sale_id` é `onDelete: 'CASCADE'` (`20260806-000100:54-59`): apagar uma venda apaga seu histórico fiscal. Registro de mitigação: **não encontrei rota de exclusão de venda** (varredura de `Sale.destroy|deleteSale` em `server/src/modules/sales`: só `deleteSaleItem`). O risco é de banco, não de API.

**Composição com T-03 (não conciliação silenciosa, vínculo explícito):** AUD-DB-01 estabeleceu que a credencial de runtime é **superusuário**, e a §2 daquele relatório registrou que `ALTER DEFAULT PRIVILEGES … GRANT SELECT, INSERT, UPDATE, DELETE` é **política padrão do schema**, de modo que toda tabela futura nasce alterável. `sale_invoices` é uma dessas tabelas. **Consequência que nenhuma das duas trilhas enxerga sozinha:** o registro do que foi vendido em cada nota — a base de qualquer reconstituição fiscal e a fonte da devolução de estoque do D-M — é livremente reescrevível pela credencial que a aplicação usa todo dia, e a reescrita não deixa rastro (FIND-ERP-002).

---

### T08-F12 — MEDIUM · confiança HIGH · `PROPOSED`
**O backfill do histórico de NF-e consulta uma tabela que não existe, engole o erro e carimba `mock` como provedor de todas as notas retroativas.**

- `20260806-000100-create-sale-invoices.cjs:135` — `SELECT nfe_provider FROM company_fiscal_configs`.
- A tabela é **`company_fiscal_config`**, singular: `CompanyFiscalConfig.ts:62` (`tableName`) e `00_baseline_frozen.sql:4545` (`CREATE TABLE public.company_fiscal_config`).
- `:136` — `.catch(() => [[{ nfe_provider: 'mock' }]])` — o erro é silenciado; `:137` fixa `fallbackProvider = 'mock'`; `:173` grava esse valor em **todos** os registros retroativos.
- Efeito colateral do mesmo bloco: `:148` filtra `invoiced_quantity > 0`, o que produz `items = []` para notas cuja quantidade faturada ainda não havia sido escriturada — **alimenta diretamente T08-F05**.

**Impacto:** toda nota anterior ao histórico multi-NF-e fica registrada como emitida pelo provedor de simulação, inclusive as emitidas por provedor real. Confiança HIGH e não CONFIRMED por um ponto que exige execução: se a `sequelize-cli` roda migrations em transação, o `SELECT` abortado envenena a transação (`25P02`) e as consequências são maiores que o fallback — **DYN-T08-03**.

---

### T08-F13 — MEDIUM · confiança CONFIRMED · `PROPOSED`
**DIFAL e ICMS-ST estão desenhados com fórmula e exemplo numérico, e não têm uma linha de código — inclusive para o próprio NCM da fábrica.**
`docs/tributario/02-ICMS_ESTADOS.md:45-63` (DIFAL, com repartição 20/80 e exemplo SP→RJ) e `:102-131` (ST, com tabela que marca **MG, RJ e PR com ST para o NCM 8518** e a fórmula de MVA). Em `TaxCalculationService.ts`: zero ocorrências de `st`, `difal` ou `mva` como regra; o retorno (`:154-169`) não tem campo algum de ST ou DIFAL, e o port (`NfeProviderPort.ts:60-72`) também não. O campo que decidiria o DIFAL — consumidor final — está desenhado em `00-README.md:39` (`ind_final`) e **não existe na interface do cliente** (`TaxCalculationService.ts:21-25` tem `state`, `tax_regime`, `ind_ie`). BR-FIS-004 e BR-FIS-005 (`BR_CATALOG.md:266-267`) confirmados por leitura própria; acrescento que a ausência de `ind_final` torna o DIFAL **não calculável** com o modelo de dados atual, não apenas não calculado.

---

### T08-F14 — LOW · confiança CONFIRMED · `PROPOSED`
**A única "fonte normativa" de CFOP do projeto está errada, e o código está mais certo que ela.**
`docs/tributario/02-ICMS_ESTADOS.md:100` classifica `6.101` como *"Venda ao exterior (exportação)"* e `:92` classifica `5.401` como venda industrializada fora do estado (5xxx é operação interna). `TaxCalculationService.ts:93-95` usa `5101/6101` (produção própria, interna/interestadual) e `5102/6102` (revenda) — coerente com a lógica real de CFOP. **O finding não é o código: é o documento**, porque é ele que um contador ou um remediador leria como referência. BR-FIS-006 confirmado, com o sentido da divergência explicitado (o catálogo registra "divergente", não "qual lado erra").

---

### T08-F15 — LOW · confiança CONFIRMED · `PROPOSED`
**O fluxo desenhado manda calcular PIS/COFINS pelo regime do cliente; o código usa o regime do emitente (correto) e recebe o regime do cliente sem nunca usá-lo.**
`00-README.md:56-85` — o fluxograma oficial põe *"Identifica Regime do Cliente (SN, LP, LR)"* como o primeiro passo e deriva PIS/COFINS dele. `TaxCalculationService.ts:126-127` diz o oposto, com razão: *"incidem sobre o faturamento do EMITENTE (nao do cliente)"*, e `:133-149` decide por `company.crt`. `TaxCalcClient.tax_regime` (`:23`) é declarado, preenchido pelo chamador (`IssueSaleNfeUseCase.ts:218`) e **lido em zero lugares**. Desenho de processo materialmente incorreto convivendo com implementação correta, mais um parâmetro morto que induz o próximo leitor a acreditar no desenho. BR-FIS-007 confirmada quanto ao código.

---

### T08-F16 — LOW · confiança CONFIRMED · `PROPOSED`
**Duas etapas terminais do processo fiscal desenhado não têm implementação nenhuma.**
`00-README.md:80-85` desenha, depois da nota: *"Contabiliza na apuração mensal"* → *"Gera arquivos SPED, DCTF, etc."*. Varredura própria de `sped|apuracao|apuração|bloco.?k` em todo `server/src`: 7 arquivos, e a inspeção linha a linha mostra que **nenhum é geração ou apuração fiscal** — são comentários normativos em `production/domain/productionTrackingRules.ts`, `config/runtimeEnv.ts`, um comentário em `TaxCalculationService.ts:144` e falsos positivos. O próprio `00-README.md:19-20` admite o correlato do Bloco K: *"o ERP já registra o dado; a geração do arquivo ainda não foi iniciada"*. Registrado como **etapa desenhada sem código** conforme §20 do Master Spec, sem juízo sobre prioridade — a decisão de quando entregar obrigação acessória é do dono.

---

### T08-F17 — LOW · confiança CONFIRMED · `PROPOSED`
**Origem da mercadoria fixada em "nacional" no payload da NF-e.**
`FocusNfeProvider.ts:86` — `icms_origem: '0'`, constante, sem consultar nenhum atributo do produto; `ENotasProvider.ts:76` não envia origem alguma. O mesmo repositório documenta importação de componentes com II, IPI e ICMS de importação (`02-ICMS_ESTADOS.md:147-176`). Produto com conteúdo de importação declarado como nacional é informação incorreta em campo obrigatório do documento fiscal.

---

### T08-F18 — INFO · confiança CONFIRMED
**Falha de cancelamento no provedor não deixa rastro.** `CancelSaleNfeUseCase.ts:116` atribui `locked.nfe_error_message = result.error_message` e `:117` lança em seguida, dentro da transação — a atribuição nunca é persistida. A mensagem de recusa da SEFAZ chega ao chamador HTTP e desaparece do registro. Não é defeito de segurança; é perda de evidência operacional em ato fiscal.

---

### T08-F21 — MEDIUM · confiança CONFIRMED · `PROPOSED`
**A autoria do movimento de estoque de uma NF-e finalizada por webhook é atribuída a quem não executou nada.**
`GetSaleNfeStatusUseCase.ts:162` — `userId ?? locked.user_id`; o caminho de webhook chama `execute({ saleId })` **sem `userId`** (`HandleNfeStatusWebhookUseCase.ts:35`), porque não há usuário autenticado (`webhooks.ts:13`, sem `authenticate`). O `InventoryMovement` de saída é então assinado pelo **vendedor da venda**. O mesmo padrão está em `IssueSaleNfeUseCase.ts:402` e `CancelSaleNfeUseCase.ts:131`, e é declarado no JSDoc como decisão consciente (`GetSaleNfeStatusUseCase.ts:75`).

**Por que registro assim mesmo, e onde é minha fronteira:** a coluna é NOT NULL e alguém precisa ir ali — o desenho não é irracional. O finding é de **conformidade de processo**: o campo de responsável passa a afirmar um fato falso (*"o vendedor X deu baixa neste estoque"*), sem nenhum marcador que distinga ato humano de ato de sistema, e essa distinção é justamente o que uma auditoria de segregação de funções precisa. **Não invado o ângulo do `vericore-domain-logic-auditor`** (se a regra faz sentido para o negócio): afirmo apenas que o ator implementado diverge do ator real da transição, que é a pergunta desta trilha. Compõe com T-10-04 (mesma rota, sem log): a transição de maior efeito patrimonial do módulo é a única sem ator verdadeiro **e** sem registro.

---

### T08-F22 — LOW · confiança CONFIRMED · `PROPOSED`
**O modelo guarda estado de NF-e, não eventos de NF-e — e dois eventos obrigatórios do processo real não existem em nenhum lado.**
Não há Carta de Correção Eletrônica (varredura de `carta|cce|correcao` no módulo fiscal: zero) nem inutilização (T08-F10). Mais estrutural: `sale_invoices` tem `nfe_status` **atual** (`SaleInvoice.ts:80`) e nenhuma tabela de eventos — a sequência "autorizada em X, corrigida em Y, cancelada em Z por W com justificativa J" **não é reconstituível**: a justificativa do cancelamento vive só na descrição de um `logAction` (`fiscalController.ts:95`), cuja fragilidade T-03/AUD-DB-02 mediu. Etapa ausente **dos dois lados** (desenho e código), registrada conforme §20.

---

## 3. Escalonamento a outras trilhas (Regra 20 — divergência se escala, não se concilia)

**ESC-T08-01 → T-10 (refutação parcial de T-10-08, para o `vericore-software-audit-director`).**
T-10-08 (INFO) afirma que a guarda dedicada de `nfe_status` no embarque é **inalcançável** pelo caminho público, porque `CancelSaleNfeUseCase.ts:203,221-222` regride `invoiced → confirmed|partially_invoiced` e nenhum desses admite `shipped`. **Confirmo o raciocínio para o caminho com snapshot e o refuto para o caminho sem snapshot.** Em `CancelSaleNfeUseCase.ts:174-181` o `return` antecipado ocorre **antes** de `:203` — `willRegress` nunca é avaliado, `sale.status` permanece `'invoiced'` e `nfe_status` vai a `'cancelled'` (`:137`). `VALID_TRANSITIONS.invoiced` inclui `'shipped'` (`ChangeSaleStatusUseCase.ts:24`), logo a checagem de `:153` passa e **a guarda de `:159-170` dispara** — exatamente o cenário que o JSDoc `:94-101` descreve. Consequências: (a) a guarda **não** é morta e não deve ser removida em remediação — a conclusão prática de T-10-08 se mantém, por um motivo diferente do declarado; (b) o mesmo trecho que a torna alcançável é T08-F05, um HIGH; (c) o JSDoc `:94-101` está **desatualizado** para o caminho com snapshot, afirmando que o cancelamento não reverte `sale.status` quando ele reverte. Peço ao director que cruze as duas leituras antes de qualquer consolidação.

**ESC-T08-02 → T-10.** T08-F06 é a perna fiscal de T-10-02/BR-COM-010, com fundamento **adicional e independente**: base de cálculo de ICMS/PIS/COFINS acima do valor da operação, e ausência de campo de desconto nos dois adapters. As duas pernas devem ser validadas juntas; nenhuma substitui a outra.

**ESC-T08-03 → T-03.** T08-F11 estende FIND-ERP-002/AUD-DB-01 a `sale_invoices`: documento fiscal sem imutabilidade, sob credencial superusuária e política default de `GRANT` amplo. Insumo dirigido; **o mérito de FIND-ERP-002 é de T-25**, nada aqui o reabre ou reclassifica.

**ESC-T08-04 → T-04 (authZ) e T-06 (idempotência).** T-10-04 já registrou `GET /api/sales/:id/nfe` em nível `view` executando efeitos patrimoniais. Acrescento a face de T-08: o **mesmo** conjunto de efeitos é alcançável por `POST /api/webhooks/focus-nfe`, sem autenticação de usuário, protegido apenas por segredo estático em header (`webhookController.ts:52-60`) — sem HMAC, sem replay protection, sem idempotência por evento (contraste interno: o webhook do n8n **tem** verificação de assinatura e `event_id`, `webhookController.ts:20-35`). O julgamento de authZ/replay é de T-04/T-06; registro o fato e a assimetria.

**ESC-T08-05 → T-07.** T-07 §3.3 elogia `saleReceivableService` (com razão quanto à fundamentação em CPC 47 e à numeração contínua). Registro dois fatos observados do lado fiscal que a trilha financeira não tinha como ver: (a) `createInvoiceReceivables` recebe o **valor bruto** (T08-F06); (b) o **cancelamento** do recebível não é simétrico à criação — mora no módulo fiscal (`CancelSaleNfeUseCase.ts:247-290`) e é pulado no caminho de T08-F05.

---

## 4. Conformidades registradas (mesmo peso — "sem finding" ≠ "não verificado")

1. **Justificativa de cancelamento ≥ 15 caracteres**, validada em duas camadas (`fiscalValidators.ts:7` e `CancelSaleNfeUseCase.ts:88`), com a exigência da SEFAZ citada. BR-FIS-010 confirmada.
2. **O webhook nunca aplica o payload recebido** — usa a referência só para localizar a venda e reconsulta o provedor (`HandleNfeStatusWebhookUseCase.ts:1-8,28-36`). Desenho correto e implementado.
3. **Reserva de série/número sob lock pessimista** (`IssueSaleNfeUseCase.ts:179,187-189`) e chamada externa **fora** de transação na emissão (`:295`) — evita segurar lock durante HTTP e evita reuso de numeração. É o melhor trecho do módulo.
4. **Gate de qualidade de lote roda antes de queimar número** (`:161-174`), com o motivo escrito.
5. **`invoiced`/`partially_invoiced` não são setáveis à mão** (`ChangeSaleStatusUseCase.ts:125-132`).
6. **Idempotência de reconciliação** por `alreadyReconciled` (`GetSaleNfeStatusUseCase.ts:116`) e de devolução por `wasAuthorized` (`CancelSaleNfeUseCase.ts:123-125`).
7. **`nfe_next_number` não é aceito pela API de configuração** (`UpsertCompanyFiscalConfigUseCase.ts:5-9,12-15`) — allowlist explícita, não denylist.
8. **Credenciais de provedor só de ambiente, nunca do banco** (`NfeProviderFactory.ts:5-7`, `FocusNfeProvider.ts:44-48`, `ENotasProvider.ts:35-39`), com falha explícita na ausência.
9. **Chave de acesso de NF-e de entrada validada com dígito verificador** (`RegisterIncomingNfeUseCase.ts:49-51`), e registro só sobre pedido recebido (`:56-58`).
10. **`/api/fiscal/config` restrito a admin** nos dois verbos (`fiscal.ts:14-15`), com o motivo declarado (`:11`).
11. **Regra 24 — não violada nesta trilha.** Varredura própria de `req.body.(role|userRole|isAdmin|perfil)`, `req.query` e headers `x-*` em `server/src/modules/fiscal/`: **zero ocorrências**. `userId` vem sempre de `(req as any).user?.id` (`fiscalController.ts:43,69,86,128`), nunca do corpo — e o controller documenta isso como remediação anti-spoofing (`:30-32`).
12. **Emissão e cancelamento exigem `vendas:approve`** (`sales.ts:54,56`), conforme UC-41 citado em `sales.ts:18-23`.

---

## 5. Lacuna de artefato (Regra 17 / PROC-ID) — registro obrigatório

**PROC-T08-GAP-01 — o processo fiscal crítico não tem desenho versionado com ID.** Não existe BPMN, diagrama de estados nem documento com `PROC-*` para o ciclo de vida da NF-e. O que existe é: um registro histórico de setup (`SETUP_FISCAL_NFE_2026-07-31.md`, autodeclarado "registro histórico" em `00-README.md:12`), um fluxograma ASCII de 6 caixas (`00-README.md:56-85`) **materialmente incorreto** em uma delas (T08-F15) e omisso quanto a cancelamento, negação e correção, e prosa em JSDoc. A matriz da §1 deste relatório teve de ser **reconstruída a partir do código**, o que significa que, para as transições 3 a 8, "desenho" e "implementação" são a mesma fonte — e a comparação, nesses casos, **não é possível**. Isso é achado, não detalhe: sem desenho versionado, nenhuma remediação fiscal tem critério de aceite objetivo, e a divergência de alíquotas (T08-F02) não tem árbitro.

---

## 6. Pedidos de evidência dinâmica (fila G4 — banco `erp_evok_audio_test`; **nenhum executado por mim**)

| ID | O que verificar | Comando/roteiro proposto | Por que a leitura estática não basta | Serve a |
|---|---|---|---|---|
| **DYN-T08-01** | Imutabilidade real de `sale_invoices` | `SELECT tgname FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relname='sale_invoices' AND NOT t.tgisinternal;` + `\d+ sale_invoices` | Trigger pode existir fora de `migrations/` (baseline, script manual) | T08-F11 |
| **DYN-T08-02** | Unicidade efetiva de `(nfe_series, nfe_number)` | `SELECT indexdef FROM pg_indexes WHERE tablename IN ('sale_invoices','sales');` | O código não é fonte autoritativa do estado do schema | T08-F10 |
| **DYN-T08-03** | Efeito real do backfill | Em banco efêmero: popular `company_fiscal_config` com `nfe_provider='focus_nfe'` + 1 venda com `nfe_provider_ref`; rodar `20260806-000100`; ler `sale_invoices.nfe_provider` e `items`; capturar log de erro da query | Depende de a `sequelize-cli` usar transação por migration — não determinável por leitura | T08-F12, T08-F05 |
| **DYN-T08-04** | Mock em produção | `PUT /api/fiscal/config {"nfe_environment":"producao","nfe_provider":"mock", ...}` → `POST /api/sales/:id/nfe`; observar `nfe_status`, `inventory_movements` e `accounts_receivable` | Prova que a ausência de validação cruzada é explorável ponta a ponta | T08-F04 |
| **DYN-T08-05** | Janela de edição durante `processing` | Forçar provedor a `processing`; `PUT /api/sales/:id/items` removendo um item; `GET /api/sales/:id/nfe`; comparar `sale_invoices.items` × `sale_items` × `inventory_movements` × `accounts_receivable` | A janela é temporal; nenhum teste do repositório a cobre | T08-F07 |
| **DYN-T08-06** | Cancelamento sem snapshot | Criar `sale_invoices` com `items='[]'` e nota `authorized`; `POST /api/sales/:id/nfe/cancel`; verificar que `accounts_receivable` segue `pending` e `sale.status` segue `invoiced` | Confirma o dano financeiro do retorno antecipado com dado observável | T08-F05 |

Enquanto DYN-T08-01/02/03 não rodarem, T08-F11 e T08-F12 permanecem **`READY_TO_CLOSE_PENDING_DYN`** — nunca "concluídos com ressalva". Os demais findings estão completos por prova estática.

---

## 7. Arquivos lidos (caminhos absolutos)

**Código do objeto auditado**
`c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\fiscal\presentation\routes\fiscal.ts` · `...\presentation\controllers\fiscalController.ts` · `...\presentation\validators\fiscalValidators.ts` · `...\application\use-cases\IssueSaleNfeUseCase.ts` · `...\GetSaleNfeStatusUseCase.ts` · `...\CancelSaleNfeUseCase.ts` · `...\HandleNfeStatusWebhookUseCase.ts` · `...\RegisterIncomingNfeUseCase.ts` · `...\UpsertCompanyFiscalConfigUseCase.ts` · `...\domain\services\TaxCalculationService.ts` · `...\domain\services\SaleInvoiceAccumulator.ts` · `...\infrastructure\providers\NfeProviderFactory.ts` · `...\MockNfeProvider.ts` · `...\FocusNfeProvider.ts` · `...\ENotasProvider.ts` · `...\infrastructure\sequelize\SequelizeFiscalRepository.ts`
`c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\sales\presentation\routes\sales.ts` · `...\sales\application\use-cases\ChangeSaleStatusUseCase.ts` · `...\EditSaleItemsUseCase.ts`
`c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\webhooks\presentation\routes\webhooks.ts` · `...\controllers\webhookController.ts`
`c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\services\saleReceivableService.ts` (trecho `createInvoiceReceivables`)
`c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\models\SaleInvoice.ts` · `...\models\CompanyFiscalConfig.ts`
`c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\migrations\20260806-000100-create-sale-invoices.cjs`
`c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\database\postgresql\00_baseline_frozen.sql` (trecho `company_fiscal_config`)
`c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\tests\characterization\comercial-financeiro--tributos-vigentes.test.ts` · `...\comercial-financeiro--desconto-nao-chega-nfe-ar.test.ts`

**Documentação e insumos de auditoria**
`c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\tributario\00-README.md` · `...\02-ICMS_ESTADOS.md` · `...\SETUP_FISCAL_NFE_2026-07-31.md`
`c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\coretriad\projects\ERP-LEGACY-001\BR_CATALOG.md` (índice BR-FIS/BR-COM)
`c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\T-03_AUDIT_LOG_REPORT.md` · `...\T-07_FINANCEIRO.md` · `...\T-10_SUPRIMENTOS_VENDAS.md` · `...\00-scope\AUDIT_SCOPE.md` (trecho FIND-ERP-002)

**Varreduras exaustivas com padrão reexecutável:** `nfe_status` em `server/src` · `discount|ipi|desconto` (-i) em `server/src/modules/fiscal` · `company_fiscal_configs` em `server/` · `sale_invoices` em `server/migrations` · `sped|apuracao|apuração|bloco.?k` (-i) em `server/src` · `Sale.destroy|deleteSale` (-i) em `server/src/modules/sales`.

---

**Estado da trilha:** parte estática **completa**, sem amostragem, com 20 findings `PROPOSED` (1 CRITICAL, 6 HIGH, 7 MEDIUM, 4 LOW, 2 INFO), 12 conformidades registradas, 1 lacuna PROC, 5 escalonamentos abertos e 6 pedidos DYN. **Nenhuma declaração de `AUDIT_PASSED`, `FINDINGS_CONFIRMED`, `RETEST_PASSED` ou `REMEDIATION COMPLETE`** — todas fora da minha autoridade.
