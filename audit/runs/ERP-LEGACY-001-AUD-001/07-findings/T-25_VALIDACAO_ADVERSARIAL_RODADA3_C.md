# T-25 — VALIDAÇÃO ADVERSARIAL · RODADA 3 (cirúrgica) · BLOCO C

**AUDIT_ID:** `ERP-LEGACY-001-AUD-001`
**AUDIT_COMMIT:** `c1311a6f76b512fef893f7e60d934179cae3409f`
**Bloco:** C — `T13-F01`, `T13-F04`, `T19-F02`, `T23-F02` (4 dos 12 `NEEDS_MORE_EVIDENCE` da Rodada 2)
**Regime:** read-only. Nenhum comando executado, nenhuma conexão de banco aberta, nenhum arquivo do objeto auditado alterado (Regra 2). O `00_baseline_frozen.sql` foi tratado exclusivamente como ARQUIVO DE TEXTO (Read/Grep), nunca executado.
**Base de leitura:** o orquestrador verificou nesta sessão que `git diff --stat c1311a6..HEAD -- server/src client/src server/migrations server/database` é vazio; os arquivos da árvore de trabalho lidos aqui são idênticos ao `AUDIT_COMMIT`.

**Motivo desta rodada:** a Rodada 2 (`T-25_VALIDACAO_ADVERSARIAL_RODADA2.md:39,42,44,50` e a "observação de processo" em `:57`) deixou estes 4 em `NEEDS_MORE_EVIDENCE` por não ter conseguido reconfirmar citações de linha no baseline SQL e por não ter relido as fontes — explicitamente **não** por refutação bem-sucedida.

---

## 1. TABELA DE VEREDITO

| ID | Trilha | Sev. proposta | Veredito (mérito) | Recomendação de severidade | Âncora lida por mim nesta rodada |
|---|---|---|---|---|---|
| `T13-F01` | T-13 | HIGH | **CONFIRMED** (fato de schema integralmente verificado) | **Rebaixar HIGH → MEDIUM** — controle compensatório de aplicação parcial, encontrado e provado abaixo | `server/database/postgresql/00_baseline_frozen.sql:23136, 23312, 23344, 23568, 25160` (5/5 citações exatas); `server/src/modules/production/application/use-cases/RemoveProductionOrderUseCase.ts:30-31,41-48` |
| `T13-F04` | T-13 | HIGH | **CONFIRMED** (fato de schema integralmente verificado) | **Rebaixar HIGH → MEDIUM** — dois controles compensatórios de aplicação, ambos verificados | `00_baseline_frozen.sql:3335-3359, 16515, 18719`; `server/src/modules/financial/application/use-cases/CreateReceivableUseCase.ts:84-89,120`; `server/src/services/saleReceivableService.ts:203-230` |
| `T19-F02` | T-19 | HIGH | **CONFIRMED** — nenhum controle compensatório existe, nem em código nem em banco | **Manter HIGH** | `server/src/modules/comex/infrastructure/sequelize/SequelizeComexRepository.ts:110`; `server/src/modules/purchases/infrastructure/sequelize/SequelizePurchaseRepository.ts:313`; `.../production/application/use-cases/ChangeProductionOrderStatusUseCase.ts:962`; `server/src/services/saleLotService.ts:487,494`; `server/src/services/materialReceiptService.ts:168,182`; `00_baseline_frozen.sql:9179-9201` e `:22156-22240` |
| `T23-F02` | T-23 | HIGH | **CONFIRMED e REFORÇADO** — a tentativa de refutação produziu evidência *contra* o documento | **Manter HIGH** | `docs/tributario/00-README.md:62,82-85`; `server/src/modules/fiscal/domain/services/TaxCalculationService.ts:101,133,137` |

**REFUTED: 0. FALSE_POSITIVE: 0. DUPLICATE: 0. NEEDS_MORE_EVIDENCE: 0.** Os 4 findings do bloco saem desta rodada com veredito de mérito fechado.

---

## 2. TENTATIVA DE REFUTAÇÃO, FINDING A FINDING

### 2.1 `T13-F01` — `ON DELETE CASCADE`/`SET NULL` nas FKs de `production_orders`

**Fato verificado (leitura própria, grep dirigido por nome de constraint):** as 5 citações do finding batem **exatamente**, linha por linha:

- `:23136` `fk_lot_controls_production_order_id … ON DELETE SET NULL`
- `:23312` `fk_production_lot_consumptions_order_id … ON DELETE CASCADE`
- `:23344` `fk_production_order_tracking_order_id … ON DELETE CASCADE`
- `:23568` `fk_serial_numbers_production_order_id … ON DELETE SET NULL`
- `:25160` `production_order_reservations_production_order_id_fkey … ON UPDATE CASCADE ON DELETE CASCADE`

**Ampliação minha (não é finding novo, é reforço do mesmo fato):** grep de `REFERENCES public.production_orders(id)` no baseline retorna **10** FKs, não 5. As 5 não citadas — `acoustic_test_results…_fkey:22352` (SET NULL), `fk_non_conformities_production_order_id:23232` (SET NULL), `master_production_plan_lines…_fkey:24976` (SET NULL), `production_downtimes…_fkey:25128` (SET NULL), `purchase_requisitions…_fkey:25256` (SET NULL) — confirmam a afirmação central: **nenhuma das 10 FKs é `RESTRICT`**.

**Refutação buscada em banco:** procurei trigger de imutabilidade. O baseline tem exatamente **13 `CREATE TRIGGER`** (`:22156-22240`), todos em RH/JUR/SST (`hr_employee_benefits`, `hr_vacation_schedules`, `hr_employee_contracts`, `hr_employee_job_history`, `hr_vacation_accrual_periods`, `jur_*`, `sst_*`). **Nenhum** cobre `production_orders`, `lot_controls`, `production_lot_consumptions`, `production_order_tracking` ou `serial_numbers`. Também varri `server/migrations/2026081*` — nenhuma migration posterior adiciona `RESTRICT`, trigger ou `deleted_at` a essas tabelas. **Refutação por banco: falhou.**

**Refutação buscada em aplicação — PARCIALMENTE BEM-SUCEDIDA.** A trilha T-13 escalou esta pergunta a T-11 e ela nunca foi respondida. Respondo agora:

- A superfície de `DELETE` existe: `server/src/modules/production/presentation/routes/productionOrders.ts:33` → `DELETE /:id`, `authorizeModule('producao','approve')`.
- Mas `RemoveProductionOrderUseCase.ts:30-31` **bloqueia** `in_progress` e `completed`, e `:41-48` bloqueia OP com reserva de material ativa.
- Isso importa porque, por leitura própria de `ChangeProductionOrderStatusUseCase.ts:107-110, 936-944, 962-973`, **`production_lot_consumptions` e o lote de produto acabado (`lot_controls.production_order_id`) só são criados dentro de `completeOrder`, isto é, na transição para `completed`** — e `completed` é estado final (`ProductionOrderEntity.ts:60-64`) e indeletável. Ou seja: **o pior cenário do finding (recall perdendo "qual lote entrou em qual OP" de uma OP concluída) NÃO é alcançável pela rota de aplicação.**

**Exposição residual real (por isso `CONFIRMED`, não `REFUTED`):**
1. `canceled` **é** deletável e `in_progress → canceled` é transição válida (`ProductionOrderEntity.ts:63`). Apontamentos de chão de fábrica são gravados durante a execução (`SequelizeProductionOrderRepository.ts:252`, `ProductionOrderTracking.create`). Logo: **OP que rodou, foi cancelada e depois removida perde todo o log de apontamento por CASCADE (`:23344`)** — sem aviso e sem trilha.
2. Pelo mesmo caminho, `fk_non_conformities_production_order_id` (`:23232`, SET NULL) faz a não conformidade aberta contra aquela OP perder silenciosamente a origem.
3. A guarda é 100% de aplicação: qualquer `DELETE` fora do use case (script, psql, futuro endpoint, backfill) reencontra o schema nu.

**Conclusão:** o fato está `CONFIRMED` com citação perfeita; a *narrativa de impacto* ("nenhum bloqueio") está **superestimada** e a severidade não se sustenta em HIGH. Recomendo **MEDIUM**, com o impacto redigido em torno de OP cancelada e de defesa em profundidade, não de recall de OP concluída. Rebaixamento de severidade é prerrogativa deste papel; a decisão final é do consolidador/diretor.

### 2.2 `T13-F04` — `accounts_receivable` sem chave de negócio de parcela

**Fato verificado:** grep exaustivo de `accounts_receivable` no baseline. A tabela está em `:3335-3359` (`sale_id integer` nullable em `:3337`; `installment integer DEFAULT 1 NOT NULL` em `:3339` — **as duas citações do finding batem exatamente**). Restrições existentes sobre a tabela, em todo o arquivo:
- `accounts_receivable_pkey PRIMARY KEY (id)` — `:16515`
- `CREATE INDEX idx_accounts_receivable_cost_center_id` — `:18719` (comum, não único)
- FKs `:22328` (cost_center, SET NULL), `:22800` (customer, RESTRICT), `:22808` (sale_id, SET NULL)

**Zero `UNIQUE`, zero índice único, zero índice parcial, zero `CHECK` sobre `(sale_id, installment)`.** Confirmado. Varredura de `server/migrations/2026081*` por `accounts_receivable`: nenhuma adiciona unicidade (as ocorrências são de nulabilidade e comentários). **Refutação por banco: falhou.**

**Refutação buscada em aplicação — BEM-SUCEDIDA quanto à explorabilidade.** Enumerei **todos** os pontos de `AccountReceivable.create` em `server/src` (4 wrappers de repositório; nenhuma criação solta):

1. `CreateReceivableUseCase.ts:84-89` **rejeita com `BusinessRuleError` qualquer `sale_id` informado** e grava `sale_id: null` explicitamente (`:120`). O endpoint avulso **não consegue** produzir um par `(sale_id, installment)` duplicado — suas linhas têm `sale_id` NULL por construção.
2. O único caminho ligado a venda é `saleReceivableService.createInvoiceReceivables` (`:185-233`), que lê as parcelas existentes da venda (`:203`), calcula `maxInstallment + 1` (`:210-215`) e **numera continuamente**, com guarda extra para parcela legada (`:207-208`).
3. Os **dois** chamadores desse serviço operam sobre a venda travada com `FOR UPDATE` na mesma transação: `IssueSaleNfeUseCase.ts:350` (lock) → `:424` (chamada); `GetSaleNfeStatusUseCase.ts:185` (opera sobre `locked`, com guarda `alreadyReconciled` em `:146`). O lock de linha da venda serializa emissões concorrentes da MESMA venda — que é exatamente a corrida que a ausência de `UNIQUE` deixaria passar.

**Por que ainda `CONFIRMED` e não `REFUTED`:** o finding se declarou explicitamente limitado à camada de banco ("não afirmo que BR-FIN-003 esteja violada no código… afirmo que o banco não a impõe e não oferece a chave que ela exige") — e essa afirmação é **verdadeira e verificada**. O que refutei foi a explorabilidade prática, não o fato. A proteção é read-then-write em aplicação, dependente de um lock correto em cada futuro chamador, sem backstop físico. Recomendo **MEDIUM** (defesa em profundidade ausente), não HIGH.

### 2.3 `T19-F02` — `lot_controls` com 5 caminhos de escrita independentes

**Fato verificado, ponto a ponto (todas as âncoras batem):**
- `SequelizeComexRepository.ts:110` — `LotControl.create(data, { transaction })` ✔
- `SequelizePurchaseRepository.ts:313` — `LotControl.create(data, { transaction })` ✔
- `ChangeProductionOrderStatusUseCase.ts:962` — `LotControl.create({…})` na **camada de aplicação**, com o model importado direto em `:29` ✔
- `services/saleLotService.ts:487` — `models().LotControl.findByPk(… LOCK.UPDATE)` seguido de `lot.update({ quantity_available, status })` em `:494-500` ✔ (escrita)
- `services/materialReceiptService.ts:168-179` — `existingLot.update({ status:'quarantine', … })` direto na instância, e `:182-195` `lotGateway.createLot({ status:'quarantine', … })` ✔
- `SequelizeInventoryRepository.ts:190-230` — o módulo **dono** só lê (`findByPk`/`findOne`/`findAll`/`findAndCountAll`); grep de `update(`/`save(` nesse arquivo retorna **zero**. As escritas do dono vivem nos use cases (`BlockLotUseCase.ts:71-72`, `lot.update`). Confirma literalmente a tese "o módulo dono é apenas um dos escritores".

**Refutação buscada em banco (a hipótese que a própria T-19 levantou em `DYN-T19-03`, `T-19_ARQUITETURA.md:423`: "se algum dos 13 triggers cobrir `lot_controls`, existe controle compensatório e a severidade cai"). RESPOSTA: NÃO COBRE.** Li a definição de `lot_controls` no baseline (`:9179-9201`): sem `CHECK`, sem constraint de coerência de estado. E os 13 triggers (`:22156-22240`) são todos de RH/JUR/SST. Varredura de `server/migrations/2026081*` por `lot_controls`: apenas `addColumn` (`20260810-000032` → `release_inspection_id`/`released_by`/`released_at`; `20260811-000044` → `blocked_at`). **Nenhum trigger, nenhuma constraint sobre `lot_controls` em nenhum ponto do schema versionado.** A hipótese de refutação levantada pela própria trilha está eliminada por leitura estática — o que reduz o escopo de `DYN-T19-03` ao que só o banco vivo pode dizer.

**Refutação buscada em desenho (a mais promissora):** `materialReceiptService.ts:47,107,162,182` escreve via um **port injetado** (`lotGateway`), o que pareceria ownership disciplinado. Fui ver quem injeta: `ReceiveImportProcessUseCase.ts:190` passa `this.comexRepository` e `ReceivePurchaseItemsUseCase.ts:214` passa `this.purchaseRepository`. **O gateway é implementado pelos repositórios de comex e compras — não pelo repositório de inventário, dono da entidade.** A abstração não devolve a posse ao dono; apenas dá nome de porta ao mesmo atalho. Refutação **falhou e virou evidência a favor** do finding.

**Nuance de contagem (registro de precisão, não de mérito):** `materialReceiptService` não é um 6º escritor ORM independente — sua criação delega aos repositórios de comex/compras já contados. Ele **é**, porém, um ponto de escrita independente de invariante, porque faz `existingLot.update(...)` direto na instância (`:168`), sem passar por método algum de repositório. O número "5" se sustenta; a redação "cinco escritores" merece a precisão de que um deles compartilha o adaptador de outros dois.

**Veredito: CONFIRMED, severidade HIGH mantida.** Nem código nem banco são donos de `lot_controls`.

### 2.4 `T23-F02` — fluxograma fiscal com sujeito invertido e 3 eventos omitidos

**Fato verificado por leitura própria de `docs/tributario/00-README.md:56-86`:**
- `:62` — segundo passo do fluxo: `Identifica Regime do Cliente (SN, LP, LR)`. É o único ponto do fluxo em que o regime entra, e o sujeito é o **cliente**.
- `:71-76` — ICMS/PIS/COFINS/IRPJ/CSLL são calculados "(regime)", herdando esse sujeito.
- `:82-85` — o fluxo encerra em `Contabiliza na apuracao mensal → Gera arquivos SPED, DCTF, etc.` **Nenhum ramo** para cancelamento, rejeição/denegação ou carta de correção.

**Refutação buscada em documentação:** grep por `cancelament|carta de correc|CC-e|rejeic|denegac|inutiliza` em **todo** `docs/tributario/` → **1 ocorrência**, em `SETUP_FISCAL_NFE_2026-07-31.md:103`, e ainda assim citando um arquivo de teste, não um fluxo. Grep por carta de correção em **todo** `docs/` → **zero**. Nenhum documento compensa a omissão. Refutação falhou.

**Refutação buscada em código — e aqui a tentativa produziu o oposto do esperado.** Fui verificar se o código faz o que o documento diz (o que tornaria o achado uma questão de mérito tributário, fora do mandato doc×código de T-23). Encontrei o contrário:
- `TaxCalculationService.ts:101` (`if (company.crt === '1')` → CSOSN 102, ICMS zerado), `:133` e `:137` (PIS/COFINS por `company.crt`): **o código decide pelo regime do EMITENTE**, corretamente.
- `IssueSaleNfeUseCase.ts:218` passa `tax_regime: client.tax_regime` ao serviço; grep de `client.tax_regime` dentro de `TaxCalculationService.ts` → **zero leituras**. O regime do cliente é campo **morto** no cálculo (o cliente influencia apenas via `state` e `ind_ie`, `:88,106`).

Ou seja: o fluxograma **contradiz a implementação real** do próprio sistema, além de contradizer a técnica tributária. Isso não enfraquece o finding — **fortalece**: a única representação de processo do módulo fiscal descreve uma lógica que o código não executa, e é o artefato que um agente ou humano leria antes de mexer no cálculo.

**Veredito: CONFIRMED, HIGH mantido.**

---

## 3. DISCREPÂNCIAS DE CITAÇÃO NO BASELINE SQL — MÉRITO × CITAÇÃO, SEPARADOS

A Rodada 2 registrou que não conseguiu reconfirmar as citações de linha no `00_baseline_frozen.sql`. Resolvi com grep por **nome de constraint/tabela** em vez de paginação sequencial, e o resultado é o seguinte:

| Citação original | Confere? | Observação |
|---|---|---|
| `T13-F01` → `:23136, 23312, 23344, 23568, 25160` | **5/5 exatas** | Nenhuma discrepância |
| `T13-F04` → `:3335-3359` (tabela), `:3337` (`sale_id`), `:3339` (`installment`), `:18719` (índice de cost center) | **4/4 exatas** | Nenhuma discrepância |
| `T19-F02` → âncoras de código, não de SQL | **6/6 exatas** | Nenhuma discrepância |
| `T13-F03` (fora do meu bloco, tocado colateralmente) | não reconferido por mim | não me pronuncio |

**Conclusão desta seção: não há discrepância de citação a registrar no meu bloco.** A falha da Rodada 2 foi de método de busca (paginação de um arquivo de dezenas de milhares de linhas), não de imprecisão dos auditores de origem. Registro isso explicitamente para que o consolidador não carregue suspeita indevida sobre as âncoras de T-13/T-19.

---

## 4. DIVERGÊNCIAS E OBSERVAÇÕES NOVAS (Regra 20 — registradas, NÃO promovidas a finding)

Nenhuma destas é finding novo. Criar finding não é atribuição deste papel; registro como observação para o `vericore-audit-consolidator` decidir o encaminhamento.

**OBS-R3C-01 — `00_baseline_frozen.sql` está DEFASADO em relação às migrations do próprio `AUDIT_COMMIT`.** Grep no baseline: `sale_lot_shipments` → **0 ocorrências**; `public.directorates` → **0**; `lot_controls.blocked_at` → ausente da definição da tabela (`:9179-9201`, 22 colunas, sem `blocked_at`). Essas três estruturas são criadas por `20260810-000039-sale-lot-shipments-quality-gate.cjs`, `20260811-000043-create-directorates-hierarchy.cjs` e `20260811-000044-lot-blocked-at-quality-gate.cjs`, todas presentes no repositório. Já `quality_inspections` (migration `20260810-000032`) **está** no baseline (`:11794`). Logo, o congelamento ocorreu entre `…-000032` e `…-000039`, e há pelo menos 9 migrations posteriores fora dele.
**Consequência metodológica, e é por isso que registro:** qualquer conclusão do tipo "o schema NÃO tem X" baseada só no baseline é incompleta por construção — precisa da varredura complementar de `server/migrations/` posterior ao freeze. Fiz essa varredura complementar para os três itens de schema deste bloco (por isso os vereditos se sustentam), mas os demais findings de T-13 ancorados exclusivamente no baseline podem herdar essa fragilidade. É insumo direto para `T13-F06` (drift de schema) e para o consolidador.

**OBS-R3C-02 — parâmetro morto no cálculo fiscal.** `IssueSaleNfeUseCase.ts:218` alimenta `TaxCalculationService` com `tax_regime: client.tax_regime`; o campo é declarado na interface (`TaxCalculationService.ts:23`) e **nunca lido** no corpo do serviço. Convive com o defeito documental de `T23-F02` e explica a origem provável dele. Não promovo: é matéria de T-08/T-14, não minha.

**OBS-R3C-03 — resposta à pergunta que T-13 escalou a T-11 e ficou sem dono.** `T-13_DADOS_E_SCHEMA.md:198` e `:504` pediram a T-11 que verificasse se existe guarda de aplicação impedindo `DELETE` de OP. A resposta é **sim, parcial**, e está provada em §2.1 acima (`RemoveProductionOrderUseCase.ts:30-31,41-48`). Registro para que a pendência de handoff seja fechada pelo consolidador.

---

## 5. DECLARAÇÃO DE ENCERRAMENTO

- Nenhum arquivo do objeto auditado foi corrigido, refatorado ou alterado. Nenhuma escrita fora de `audit/` (Regra 2, Regra 16).
- Nenhum comando, teste ou script foi executado; nenhuma conexão de banco foi aberta. O baseline SQL foi lido como texto.
- **Não** declaro `AUDIT_PASSED`, `FINDINGS_CONFIRMED`, `RETEST_PASSED` nem `FINDING CLOSED` (Regras 3 e 4) — essas autoridades são do `vericore-software-audit-director` e do dono.
- Nenhum finding novo foi criado (§4 são observações explicitamente não promovidas).
- Os 4 findings do Bloco C saem com veredito de mérito **CONFIRMED**. Dois deles (`T13-F01`, `T13-F04`) saem com **recomendação de rebaixamento de severidade para MEDIUM**, fundamentada em controle compensatório de aplicação verificado por leitura própria — a decisão de acolher o rebaixamento é do consolidador/diretor.
- Limite honesto desta passada: minhas conclusões de schema valem para o **schema versionado** (baseline + migrations). Não afirmo nada sobre o schema **efetivo** de nenhum banco vivo — `OBS-R3C-01` e `DYN-T13-05`/`DYN-T19-03` permanecem pertinentes como verificação dinâmica, com escopo reduzido pelo que provei estaticamente aqui.

**Arquivos lidos nesta rodada (caminhos absolutos):**
`c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\{T-25_VALIDACAO_ADVERSARIAL_RODADA2,T-13_DADOS_E_SCHEMA,T-19_ARQUITETURA,T-23_DOCUMENTACAO_X_CODIGO}.md` ·
`c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\database\postgresql\00_baseline_frozen.sql` (grep dirigido por nome de constraint/tabela + leitura de `:3335-3359`, `:9179-9201`) ·
`…\server\src\modules\production\application\use-cases\{RemoveProductionOrderUseCase,ChangeProductionOrderStatusUseCase}.ts` ·
`…\server\src\modules\production\presentation\routes\productionOrders.ts` · `…\server\src\modules\production\domain\entities\ProductionOrderEntity.ts` ·
`…\server\src\modules\production\infrastructure\sequelize\SequelizeProductionOrderRepository.ts` ·
`…\server\src\modules\financial\application\use-cases\CreateReceivableUseCase.ts` · `…\server\src\services\saleReceivableService.ts` ·
`…\server\src\modules\fiscal\application\use-cases\{IssueSaleNfeUseCase,GetSaleNfeStatusUseCase}.ts` · `…\server\src\modules\fiscal\domain\services\TaxCalculationService.ts` ·
`…\server\src\services\{saleLotService,materialReceiptService}.ts` · `…\server\src\modules\comex\infrastructure\sequelize\SequelizeComexRepository.ts` ·
`…\server\src\modules\purchases\infrastructure\sequelize\SequelizePurchaseRepository.ts` · `…\server\src\modules\inventory\infrastructure\sequelize\SequelizeInventoryRepository.ts` ·
`…\server\src\modules\inventory\application\use-cases\BlockLotUseCase.ts` · `…\server\migrations\2026081*.cjs` (grep dirigido) ·
`…\docs\tributario\00-README.md` e varredura de `docs\tributario\` e `docs\`.
