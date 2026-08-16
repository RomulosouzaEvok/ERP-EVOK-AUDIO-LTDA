# T-25 — VALIDAÇÃO ADVERSARIAL · RODADA 3 (cirúrgica) · BLOCO B

**AUDIT_ID:** `ERP-LEGACY-001-AUD-001`
**AUDIT_COMMIT:** `c1311a6f76b512fef893f7e60d934179cae3409f`
**Agente:** `vericore-finding-validator`
**Escopo do bloco:** 4 findings deixados em `NEEDS_MORE_EVIDENCE` pela Rodada 2 — `T11-F02`, `T11-F04`, `T11-F10`, `AUD-SERVICE-3`.
**Regime:** read-only (Read/Grep/Glob). Nenhuma execução, nenhuma conexão de banco, nenhuma escrita fora de `audit/` (Regras 2 e 23). Não uso Bash — não faço nenhuma afirmação própria de proveniência de commit; a identidade `AUDIT_COMMIT ≡ árvore de trabalho` foi verificada e declarada pelo orquestrador desta sessão, não por mim.

**Motivo da rodada:** a Rodada 2 (`T-25_VALIDACAO_ADVERSARIAL_RODADA2.md:35,37,38,30`) registrou estes 4 como não-reverificados por falta de orçamento de leitura, explicitamente **não** por refutação bem-sucedida. Esta rodada faz a leitura própria linha a linha que faltava.

---

## 0. Correção de atribuição de trilha (registro, não veredito)

O briefing deste bloco atribui `AUD-SERVICE-3` à trilha T-16. A leitura própria mostra que o finding é **de T-07 (Financeiro)**: `07-findings/T-07_FINANCEIRO.md:78-92`. Grep de `AUD-SERVICE-3` em todo `07-findings/` retorna apenas `T-07_FINANCEIRO.md:75,78` e as duas linhas da Rodada 2 — **zero ocorrências em `T-16_TIER3_BACKEND.md` e em `T16_FECHAMENTO_RES-T16-06.md`**. Validei o finding real de T-07. A confusão é compreensível: `AUD-SERVICE-2` (T-07) faz handoff explícito a T-16 quanto ao ciclo de vida da multa (`T-07_FINANCEIRO.md:76`), e `AUD-SERVICE-3` é citado como causa estrutural de `AUD-SERVICE-2` (`:75`).

---

## 1. TABELA DE VEREDITO

| ID | Trilha | Sev. proposta | Veredito desta rodada | Âncora lida por mim | Tentativa de refutação |
|---|---|---|---|---|---|
| `T11-F02` | T-11 | HIGH | **CONFIRMED** | `server/src/modules/items/infrastructure/sequelize/SequelizeItemRepository.ts:109-110`; `server/src/modules/mrp/application/use-cases/GenerateMrpPlanUseCase.ts:86,98-99`; `server/src/modules/mrp/application/mrpEngine.ts:248,251-254` | Refutação tentada e falhada — detalhe em §2.1 |
| `T11-F04` | T-11 | HIGH | **CONFIRMED** | `ProductionOrderEntity.ts:139-145`; `CreateProductionOrderUseCase.ts:32,38-41`; `ConvertPlannedOrdersToProductionOrderUseCase.ts:144-155,201`; `ReleaseMasterProductionPlanUseCase.ts:134,197-210` + `masterProduction/domain/constants.ts:96`; `00_baseline_frozen.sql:10891-10912` | Refutação tentada e falhada — detalhe em §2.2 |
| `T11-F10` | T-11 | HIGH | **FALSE_POSITIVE (refutado por controle compensatório na própria camada)** | `SequelizeItemEstruturaRepository.ts:29-38,41-58`; `CreateItemStructureUseCase.ts:79-92`; `ExplodeItemStructureUseCase.ts:29`; `SequelizeMrpRepository.ts:22-24` | **Refutação bem-sucedida** — detalhe em §2.3 |
| `AUD-SERVICE-3` | T-07 (não T-16) | HIGH | **CONFIRMED** | `SequelizeFinancialRepository.ts:48-53,81-86,89-91,94-96,99-104,107-112`; `financial/domain/repositories/FinancialRepository.ts:21-23`; `facilities/infrastructure/adapters/AccountPayableServiceAdapter.ts:18-33`; `purchases/infrastructure/sequelize/SequelizePurchaseRepository.ts:174-176` | Refutação tentada e falhada — detalhe em §2.4 |

**Placar do bloco: 3 CONFIRMED, 1 FALSE_POSITIVE, 0 NEEDS_MORE_EVIDENCE.** Nenhum dos 4 permanece sem veredito.

---

## 2. FUNDAMENTAÇÃO POR FINDING

### 2.1 `T11-F02` — lote mínimo e estoque de segurança lêem a mesma coluna · **CONFIRMED**

Cadeia reconstruída por leitura própria, ponta a ponta:

1. `SequelizeItemRepository.listMrpInventoryPositions` (definido em `:58`) monta o crosswalk `items.codigo → products.code` (`:66-74`) e devolve, em `:109-110`:
   `estoque_seguranca: liveProduct?.min_quantity ?? item.estoque_seguranca` e `lote_minimo: liveProduct?.min_quantity ?? item.lote_minimo` — **a mesma coluna `products.min_quantity` nos dois campos**, exatamente como o finding afirma.
2. `GenerateMrpPlanUseCase.ts:86` chama esse método e `:98-99` mapeia `safetyStock ← estoque_seguranca` e `minimumLotSize ← lote_minimo`.
3. `mrpEngine.ts:248` usa `safetyStock` para **reduzir** o disponível (`max(0, onHand − reserved − safetyStock)`) e `:251-254` usa `minimumLotSize` para **arredondar para cima** a quantidade planejada (`ceil(net/lot)*lot`). Efeito duplo e cumulativo do mesmo número: confirmado no código, não inferido.

**Tentativas de refutação, todas falhadas:**
- *Guarda no cadastro?* `itemValidators.ts:16-17` (e `:40-41`) aceitam `estoque_seguranca` e `lote_minimo` como campos **independentes**. O usuário pode cadastrá-los distintos — o repositório os sobrescreve depois. Não é guarda, é agravante.
- *O fallback salva o caso?* Só vale quando não há produto com o mesmo `code`. `itemProductMirrorService.ts:107` espelha `min_quantity: item.estoque_seguranca` na criação do produto gêmeo, e `:133-134` na direção inversa grava `estoque_seguranca: product.min_quantity` e **`lote_minimo: 0` fixo**. Ou seja: o pareamento é a norma e o `lote_minimo` próprio do item é sistematicamente descartado nos dois sentidos.
- *Constraint/serviço que separasse os papéis?* Grep de `safetyStock|minimumLotSize|estoque_seguranca|lote_minimo` em todo `server/src`: os únicos pontos de leitura de planejamento são os três acima. Nada intermedeia.
- *Teste que prove o contrário?* O oposto. Existe teste de caracterização que **congela o defeito**: `server/tests/characterization/planejamento-producao--mrp-lote-minimo-estoque-seguranca-mesma-coluna.test.ts:131` monta `{ safetyStock: 500, minimumLotSize: 500 }` e `:137-141` documenta os dois efeitos do mesmo 500. Isso reforça o finding e o torna demonstrável sem banco.

*Ressalva de precisão, sem efeito no veredito:* a frase do finding "lacuna de teste confirmada" continua literalmente correta quanto a `tests/unit/mrp-engine.test.ts:18` (`safetyStock:5` ≠ `minimumLotSize:10`, não exercita o defeito), mas o corpus de caracterização **tem** um teste dedicado ao defeito. Recomendo ao consolidador ajustar a redação da lacuna de teste — não a severidade.

### 2.2 `T11-F04` — "que produto pode gerar OP": 4 implementações, 2 respostas · **CONFIRMED**

As quatro implementações, reconferidas por mim:

| # | Local lido | Resposta |
|---|---|---|
| A | `ProductionOrderEntity.ts:139-145` (`assertCanBeCreatedFor`) | só `finished` (`:142-144`) |
| B | `CreateProductionOrderUseCase.ts:38-41` (inline, após instanciar a entidade em `:32`) | só `finished` |
| C | `ConvertPlannedOrdersToProductionOrderUseCase.ts:150-155` | `finished` **ou** `semi_finished` |
| D | `ReleaseMasterProductionPlanUseCase.ts:201` via `PLANNABLE_PRODUCT_TYPES` (`masterProduction/domain/constants.ts:96` = `['finished','semi_finished']`) | `finished` **ou** `semi_finished` |

- **Método morto confirmado por grep própria em todo o repositório:** `assertCanBeCreatedFor` aparece em 1 definição (`ProductionOrderEntity.ts:139`) e em 0 chamadas em `server/src` e em `server/tests`. As demais ocorrências são texto de auditoria/discovery (`docs/coretriad/.../USE_CASES_RECOVERED_planejamento-producao.md:62`, `LEGACY_TRACEABILITY_MATRIX_planejamento-producao.md:109`, `BUSINESS_RULE_CANDIDATES_planejamento-producao.md:310,319`) e o próprio `T-11_PRODUCAO_MRP.md`.
- **Contorno da entidade confirmado:** B instancia a entidade (`:32`) e valida por conta própria (`:38-41`); C escreve direto no repositório (`ConvertPlannedOrdersToProductionOrderUseCase.ts:201`) e D idem (`ReleaseMasterProductionPlanUseCase.ts:134`) — nenhum dos dois passa por `ProductionOrderEntity`/`toCreatePersistence`.
- **Divergência de resposta é real e material:** o caminho manual **recusa** `semi_finished`; os caminhos automáticos (conversão de MRP e liberação de plano mestre) **aceitam**. Mesma pergunta de negócio, duas respostas, dependendo da porta.

**Tentativas de refutação, todas falhadas:**
- *Constraint de banco que unificasse a regra?* `00_baseline_frozen.sql:10891-10912` — `CREATE TABLE public.production_orders` não tem nenhuma `CHECK` sobre tipo de produto; `product_id` é só FK `integer NOT NULL`. Nenhuma guarda no banco.
- *Guarda de rota/middleware?* A regra é de domínio (tipo do produto), não de permissão; nenhum middleware pode conhecê-la. Não há camada intermediária entre os três use cases e o repositório.
- *Documento que declarasse `semi_finished` planejável e tornasse B o defeito isolado?* `constants.ts:91-95` justifica a escolha de D contra o enum do banco, mas não existe BR versionada que arbitre entre B e C/D — o próprio T-11 registra isso. A divergência permanece não resolvida no código, que é exatamente o que o finding afirma. Não invento a regra (Regra 6).

### 2.3 `T11-F10` — "terceira superfície de estrutura de produto, de escrita" · **FALSE_POSITIVE**

**Refutação encontrada, com evidência direta.** A premissa factual central do finding — *"`POST /api/items/:id/estrutura` (`produtos:operate`) → `CreateItemStructureUseCase` grava em `item_estruturas`"* (`T-11_PRODUCAO_MRP.md:105`) — **é falsa no AUDIT_COMMIT**. Não existe superfície de escrita.

1. `CreateItemStructureUseCase.execute` **nunca retorna**: valida existência do pai (`:49-52`), do componente (`:54-57`), auto-referência (`:59-65`) e ciclo (`:67-77`) e então, para **todo payload válido**, lança `BusinessRuleError` com `rule: 'G1-ESTRUTURA-DUPLA'` (`:79-92`), apontando `endpoint_correto: 'POST /api/engineering/bom'`. Não há caminho de retorno bem-sucedido no método.
2. Barreira redundante na infraestrutura: `SequelizeItemEstruturaRepository.create` lança erro 422 `G1-ESTRUTURA-DUPLA` (`:29-38`), documentado como "última barreira, para o caso de alguém instanciar o repositório direto" (`:26-27`).
3. `itemController.ts:101-103` instancia esse use case com `itemEstruturaRepository` (`= new SequelizeItemEstruturaRepository()`, `:29`) — logo o `res.status(201)` de `:103` é **inalcançável**; o erro cai no `next(error)` de `:108`.
4. A segunda premissa — *"recebe uma explosão plausível de volta e nem o MRP nem a OP enxergam uma linha dela"* — também não se sustenta: `ExplodeItemStructureUseCase.ts:29` chama `itemEstruturaRepository.listActiveEdges()`, que em `SequelizeItemEstruturaRepository.ts:46-48` delega a `BomStructureProjection.listActiveEdges()` — **exatamente a mesma chamada** que `SequelizeMrpRepository.listActiveEdges` faz em `:22-24`. A explosão devolvida ao usuário sai da mesma árvore que o MRP planeja. Idem para `hasPathBetween` (`:51-53`) e `hasActiveParentOrComponent` (`:56-58`).
5. Varredura de escrita residual: grep de `item_estruturas|ItemEstrutura` em `server/src` só encontra o model (`models/ItemEstrutura.ts`), as associações (`models/index.ts:560-577`), os scripts de backfill offline (`scripts/backfill/02c_bom_to_item_estrutura.ts`, `02d_validation.sql`) e o repositório que recusa. **Nenhum caminho de request grava na tabela.**

O finding descreve com precisão o estado **anterior ao G1 (2026-08-10)** — que os próprios comentários do código narram (`CreateItemStructureUseCase.ts:9-20`, `SequelizeItemEstruturaRepository.ts:2-5`, `SequelizeMrpRepository.ts:12-18`). No commit auditado o defeito já está fechado, e fechado na camada certa (recusa explícita + fonte única de leitura). Classifico como `FALSE_POSITIVE` e **não** como `NEEDS_MORE_EVIDENCE`: o caso de teste dinâmico previsto pela própria trilha (`DYN-T11-D`, `T-11_PRODUCAO_MRP.md:188`) não é mais necessário para decidir — a prova estática é fechada, porque o método não tem retorno de sucesso.

**Consequências que o consolidador precisa propagar:**
- `T-11_PRODUCAO_MRP.md:141` (mapa invariante, linha I-18 "duas superfícies de escrita") e `:232` (escalonamento de `T11-F10` a T-01/T-05) perdem o fundamento.
- `DYN-T11-D` pode ser retirado da fila dinâmica.
- Isto **não** afeta `T11-F03` nem `T11-F01`, que tratam da projeção e do algoritmo, não da superfície de escrita, e que a Rodada 2 já confirmou por leitura direta.

### 2.4 `AUD-SERVICE-3` — contrato do repositório financeiro não aceita transação · **CONFIRMED**

Reli `SequelizeFinancialRepository.ts` inteiro na faixa relevante. As quatro assinaturas do finding conferem **linha a linha**:

| Método | Linha lida | Assinatura verificada |
|---|---|---|
| `createPayable(data)` | 89-91 | `AccountPayable.create(data)` — sem 2º argumento, sem transação |
| `createReceivable(data)` | 94-96 | `AccountReceivable.create(data)` — idem |
| `updatePayableCostCenter(id, costCenterId)` | 99-104 | `findByPk` seguido de `update` — read-then-write **sem transação e sem lock** |
| `updateReceivableCostCenter(id, costCenterId)` | 107-112 | idem |

O contraste interno que o finding usa como prova de que não é limitação de framework também confere: `findReceivableByIdForUpdate(id, transaction)` (`:48-53`) e `findPayableByIdForUpdate(id, transaction)` (`:81-86`) recebem transação **e** aplicam `lock: transaction.LOCK.UPDATE`. E `SequelizePurchaseRepository.createAccountPayable(data, transaction?)` (`:174-176`) grava na **mesma tabela** aceitando transação — a capacidade existe no repositório vizinho.

**Tentativas de refutação, todas falhadas:**
- *O defeito é só da implementação, corrigível no call site?* Não: o **contrato de domínio** também não prevê transação — `financial/domain/repositories/FinancialRepository.ts:21-23` declara `createPayable(data)`, `createReceivable(data)`, `updatePayableCostCenter(id, costCenterId)` sem parâmetro de transação. É fronteira de arquitetura, não detalhe de implementação.
- *Os consumidores cross-módulo teriam outra via?* Não: `facilities/infrastructure/adapters/AccountPayableServiceAdapter.ts:18-33` expõe `create(data)` **sem sequer aceitar** um parâmetro de transação, e delega a `financialRepository.createPayable` (`:25`). O adapter de `juridico` (`juridico/infrastructure/adapters/AccountPayableServiceAdapter.ts:24`) segue o mesmo padrão. O cabeçalho do adapter de `facilities` (`:1-6`) registra que chamar `AccountPayable.create()` direto do módulo é proibido por desenho (RF-FAC-034/058) — ou seja, a via alternativa que salvaria a atomicidade é justamente a via vedada. O consumidor está encurralado: confirma "não é corrigível no call site".
- *Hook de model, `afterCreate` compensatório, saga ou outbox?* Nenhum: `createPayable` é uma chamada nua a `Model.create` (`:90`), sem opções.

Confirmo também a relação causal com `AUD-SERVICE-2` (já `CONFIRMED` na Rodada 2): a não-atomicidade de `PayFineUseCase` é consequência desta fronteira, não escolha do chamador. **Não são duplicados** — `AUD-SERVICE-2` é o sintoma com dano concreto (título órfão + ausência de guarda de estado), `AUD-SERVICE-3` é a causa estrutural que impede a correção local. Devem seguir juntos à SanaCore, com `AUD-SERVICE-3` remediado primeiro; corrigir `AUD-SERVICE-2` sem `AUD-SERVICE-3` é impossível.

---

## 3. DIVERGÊNCIAS E OBSERVAÇÕES NOVAS — **explicitamente não promovidas a finding**

Registro sem criar finding novo (fora do meu mandato; Regra 20 — escalo, não arbitro):

- **OBS-R3B-01 (contrato de API, herdeiro natural: T-17).** Embora `POST /api/items/:id/estrutura` seja funcionalmente inócuo (§2.3), a rota **continua registrada** (`items/presentation/routes/items.ts:18`) e o controller **anuncia** `res.status(201)` (`itemController.ts:103`) para um caminho inalcançável. É superfície morta que documenta um contrato que o código recusa 100% das vezes. Materialidade baixa (o comportamento é seguro por construção: recusa explícita, com mensagem que aponta a rota correta). **Não promovo** — não é meu papel criar finding, e a severidade candidata seria LOW/INFO, fora da Regra 22.
- **OBS-R3B-02 (redação, não mérito).** A frase de lacuna de teste de `T11-F02` deveria citar que existe teste de caracterização dedicado ao defeito (`server/tests/characterization/planejamento-producao--mrp-lote-minimo-estoque-seguranca-mesma-coluna.test.ts:131,137-141`). Isso **fortalece** o finding (torna-o reproduzível sem banco) e só corrige a afirmação sobre cobertura.
- **OBS-R3B-03 (atribuição).** `AUD-SERVICE-3` é de T-07, não de T-16 (§0). Recomendo ao consolidador corrigir a rastreabilidade de origem antes do roteamento à SanaCore.

---

## 4. LIMITES HONESTOS DESTA PASSADA

- Verifiquei tudo por **leitura estática direta**. Não executei nenhum teste, script ou consulta (regime read-only). Para `T11-F02` e `T11-F04` a prova estática é fechada (o dado percorre um caminho único e visível). Para `T11-F10` a prova estática também é fechada, porque a refutação é do tipo "o método não possui caminho de retorno bem-sucedido" — não depende de estado de banco.
- Para `T11-F04`, verifiquei a ausência de `CHECK` na definição de `CREATE TABLE public.production_orders` (`00_baseline_frozen.sql:10891-10912`). **Não** varri o arquivo inteiro atrás de um `ALTER TABLE ... ADD CONSTRAINT` posterior sobre a mesma tabela; considero improvável (a regra depende de `products.product_type`, de outra tabela, o que uma `CHECK` não alcança sem trigger), mas declaro a limitação em vez de silenciá-la.
- Não reli `T-16_TIER3_BACKEND.md` nem `T16_FECHAMENTO_RES-T16-06.md` além do grep de `AUD-SERVICE-3` que provou a não-ocorrência do ID neles (§0). Se o diretor pretendia um finding **distinto**, de T-16, com nomenclatura parecida, ele não foi validado aqui — e precisa ser reidentificado por ID antes de qualquer roteamento.

---

## 5. DECLARAÇÃO DE ENCERRAMENTO

Nenhum arquivo do objeto auditado foi criado, alterado, corrigido ou refatorado; nenhuma escrita ocorreu em `server/src`, `client/src`, `tests/`, `product/`, `requirements/` ou `architecture/` (Regra 2). Este relatório **não** declara `AUDIT_PASSED`, `FINDINGS_CONFIRMED`, `RETEST_PASSED` nem `FINDING CLOSED` (Regra 4) — essas autoridades são do `vericore-software-audit-director` e da decisão humana do dono (Regra 18). Nenhum finding novo foi criado; os achados materiais desta passada estão em §3 como observações explicitamente não promovidas.

Encaminho ao `vericore-audit-consolidator`: `T11-F02`, `T11-F04` e `AUD-SERVICE-3` com veredito **CONFIRMED** por leitura própria e direta, aptos a roteamento sob a Regra 22; `T11-F10` com veredito **FALSE_POSITIVE**, com o pedido de propagar a baixa aos artefatos derivados listados em §2.3.

**Arquivos-fonte lidos nesta rodada (caminhos absolutos):**
`c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\items\infrastructure\sequelize\SequelizeItemRepository.ts` ·
`...\server\src\modules\items\infrastructure\sequelize\SequelizeItemEstruturaRepository.ts` ·
`...\server\src\modules\items\application\use-cases\CreateItemStructureUseCase.ts` ·
`...\server\src\modules\items\application\use-cases\ExplodeItemStructureUseCase.ts` ·
`...\server\src\modules\items\presentation\routes\items.ts` ·
`...\server\src\modules\items\presentation\controllers\itemController.ts` (grep dirigido) ·
`...\server\src\modules\mrp\application\mrpEngine.ts` ·
`...\server\src\modules\mrp\application\use-cases\GenerateMrpPlanUseCase.ts` ·
`...\server\src\modules\mrp\application\use-cases\ConvertPlannedOrdersToProductionOrderUseCase.ts` ·
`...\server\src\modules\mrp\infrastructure\sequelize\SequelizeMrpRepository.ts` ·
`...\server\src\modules\production\domain\entities\ProductionOrderEntity.ts` ·
`...\server\src\modules\production\application\use-cases\CreateProductionOrderUseCase.ts` ·
`...\server\src\modules\masterProduction\application\use-cases\ReleaseMasterProductionPlanUseCase.ts` ·
`...\server\src\modules\masterProduction\domain\constants.ts` ·
`...\server\src\modules\financial\infrastructure\sequelize\SequelizeFinancialRepository.ts` ·
`...\server\src\modules\financial\domain\repositories\FinancialRepository.ts` (grep dirigido) ·
`...\server\src\modules\facilities\infrastructure\adapters\AccountPayableServiceAdapter.ts` ·
`...\server\src\modules\purchases\infrastructure\sequelize\SequelizePurchaseRepository.ts` ·
`...\server\src\services\bomStructureProjection.ts` ·
`...\server\src\services\itemProductMirrorService.ts` (grep dirigido) ·
`...\server\database\postgresql\00_baseline_frozen.sql` (grep dirigido) ·
`...\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\{T-25_VALIDACAO_ADVERSARIAL_RODADA2,T-11_PRODUCAO_MRP,T-07_FINANCEIRO}.md`
