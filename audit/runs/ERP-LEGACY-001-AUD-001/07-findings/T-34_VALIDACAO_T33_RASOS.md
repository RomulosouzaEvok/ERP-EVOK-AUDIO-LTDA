# T-34 — VALIDAÇÃO ADVERSARIAL DOS HIGH DE T-33 (ENDPOINTS RASOS)

**Run:** `ERP-LEGACY-001-AUD-001` · **AUDIT_COMMIT:** `c1311a6f76b512fef893f7e60d934179cae3409f`
**Titular:** `vericore-finding-validator` · **Autoridade:** Regra 22 (CRITICAL/HIGH passam por refutação
antes de remediação) · **Regime:** somente leitura; nenhum comando de banco; nenhuma execução dinâmica.
**Objeto:** 7 findings HIGH — `T33-A-F01`, `T33-A-F02`, `T33-A-F04`, `T33-A-F05` (de
`T-33_RASOS_BLOCO_A.md`) e `T33-B-F01`, `T33-B-F02`, `T33-B-F03` (de `T-33_RASOS_BLOCO_B.md`).
**Fora de escopo, por já estarem sob outro validador:** `T33-A-F03` (promovido a
`AUD-RH-CPFSEARCH-01`), os dois HIGH de T-31 (`AUD-CTB-DEBCRED-01`, `AUD-TES-SALDOMANUAL-01`).

**Método:** READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT. Toda âncora abaixo foi **relida no
arquivo-fonte**; nenhuma foi herdada do finding nem do encargo. Para cada HIGH foi feita busca ativa
de controle compensatório (middleware, guard, hook de model, constraint, validação em outra camada,
teste de regressão) — §22 do Master Spec.

**Limites declarados (Regra 21):** validação **estática**. Onde a materialidade dependeria de
observar o banco vivo ou uma resposta HTTP real, isso está dito e virou pedido DYN (§4). Nenhum
`FINDING CLOSED`, nenhum `RETEST_PASSED`, nenhum veredito de auditoria (Regra 4). Nada foi corrigido
(Regra 2).

---

## 1. Placar

| Finding | Sev. proposta | Sev. validada | Confiança | Status | Fundamento em 1 linha |
|---|---|---|---|---|---|
| `T33-A-F01` | HIGH | **HIGH** (mantida) | CONFIRMED | **CONFIRMED** | Não são três implementações: são **cinco pontos de decisão** e **dois caminhos que ignoram o domínio**; e existe artefato que fixa a regra (UC-03), ao contrário do que o finding afirma |
| `T33-A-F02` | HIGH | **HIGH** (mantida) | CONFIRMED | **CONFIRMED** | Prova de ausência refeita: nenhuma escrita de `effectiveness_result` em `server/src`; consequência confirmada e **alcançável por endpoint de lista** |
| `T33-A-F04` | HIGH | **HIGH** (mantida) | CONFIRMED | **CONFIRMED** | Caminho sem `HrTerminationProcess` conclui o desligamento e nada escreve em `users`; `authenticate` só olha `users.active` |
| `T33-A-F05` | HIGH | **MEDIUM** (rebaixada) | CONFIRMED | **CONFIRMED (severidade rebaixada)** | O fato é verdadeiro, mas é **instância** de condição sistêmica que T-03 mediu (76% dos eventos mutantes sem `oldValues`) e **não** classificou como HIGH; a mesma âncora já é MEDIUM em `AUD-DB-04` |
| `T33-B-F01` | HIGH | **MEDIUM** (rebaixada) | CONFIRMED | **CONFIRMED (severidade rebaixada)** | Fato verdadeiro e **mais amplo** que o relatado (6 artefatos, não 4), mas é a mesma classe que o próprio autor classificou MEDIUM duas vezes no Bloco A (`T33-A-F13`, `T33-A-F14`) |
| `T33-B-F02` | HIGH | **HIGH** (mantida) | CONFIRMED | **CONFIRMED** | O cruzamento da matriz **e do seed real** confirma e amplia: ao menos **9 perfis semeados** têm `dashboard` sem `financeiro`; e a "filtragem no cliente" que o finding credita **não existe para este payload** |
| `T33-B-F03` | HIGH | — | CONFIRMED (do fato) | **DUPLICATE de `AUD-DB-03`** | `serviceOrders` é um dos 13 módulos nominalmente cobertos por `AUD-DB-03` (T-03, HIGH, já em validação); mesma condição, mesmo commit, mesmo mecanismo |

**Encaminhamento:** seguem para SanaCore, quando o director autorizar, **`T33-A-F01`, `T33-A-F02`,
`T33-A-F04`, `T33-B-F02`** como HIGH e **`T33-A-F05`, `T33-B-F01`** como MEDIUM. **`T33-B-F03` não
segue como item próprio** — sua materialidade é anexada a `AUD-DB-03` (§3.7).

---

## 2. Tentativa de refutação, finding a finding

### 2.1 `T33-A-F01` — preço de venda > custo · **CONFIRMED · HIGH mantida**

**Refutação tentada:** procurei (a) uma constraint `CHECK` no baseline que imponha a regra no banco;
(b) um validador Zod na borda de `products`; (c) um hook de model; (d) qualquer ponto único que
todos os caminhos atravessem. **Nenhum encontrado.**

As três implementações do finding foram **confirmadas literalmente**:

1. `server/src/modules/products/domain/entities/ProductEntity.ts:144` —
   `if (this.cost_price > 0 && this.price <= this.cost_price) throw`. O agravante do finding também
   confere: `:100` faz `price` ausente virar `0`, então custo > 0 sem preço **é recusado**.
2. `server/src/modules/products/application/use-cases/UpdateProductUseCase.ts:43-47` — a comparação
   só ocorre `if (updateData.price !== undefined && updateData.cost_price !== undefined)`. PUT só com
   `cost_price` acima do preço gravado **passa**. O próprio JSDoc `:10-11` assume isso como
   comportamento ("quando ambos são enviados juntos").
3. `server/src/modules/spreadsheetImport/application/validation/validarPlanilhaCadastro.ts:323-330`
   — exige `precoVenda !== undefined && precoVenda > 0 && custoPadrao !== undefined && custoPadrao > 0`.
   Planilha com `preco_venda` em branco e `custo_padrao` positivo **passa**, e o comentário `:319-322`
   declara a divergência como deliberada.

**Contorno do domínio na importação: confirmado.**
`SequelizeCatalogImportRepository.ts:96` → `Product.create(...)`; `:104` → `Product.update(...)`.
Nenhuma passagem por `ProductEntity`.

**Divergência nova a favor do finding (§ Regra 20) — não são três, são cinco, e o pior caminho é o
declarado canônico.** Duas implementações adicionais, ambas fora de `ProductEntity`:

4. `server/src/services/itemProductMirrorService.ts:97-111` — `ensureProductMirrorForItem` cria o
   produto com **`price: 0` fixo** (`:104`) e `cost_price: item.custo_padrao ?? 0` (`:105`). Todo
   item mestre com custo padrão positivo gera um produto no estado que `ProductEntity.ts:144`
   proíbe — e gera **sempre**, não por exceção.
5. `itemProductMirrorService.ts:162-169` — `syncProductMirrorFromItem` atualiza `cost_price`
   (`:165`) sem tocar em `price` e sem comparar os dois.

O peso disso: `CreateProductUseCase.ts:33-39` declara, em JSDoc, que **"o caminho canônico de
cadastro é o Item Mestre (`POST /api/items`)"**. Ou seja, a porta que o próprio código chama de
canônica é uma das que não aplicam a regra. A porta que aplica (`CreateProductUseCase.ts:66-88`,
via `ProductEntity`) é a que o código trata como legada.

**Correção material ao finding (Regra 21):** o Bloco A conclui (`:51-53` e `:201-202`) que "nenhum
`BR-*` identifica esta regra" e que ela "não tem artefato versionado que a fixe", remetendo o caso
ao director como lacuna de fonte autoritativa. **A primeira metade é verdadeira; a segunda é
incorreta.** `docs/projeto/04-USE_CASES.md:65-67` (UC-03, "Regras de Negócio") registra: *"Preço de
venda deve ser maior que preço de custo"*, sem condicionante. Existe artefato versionado; o que não
existe é **BR-ID**. E o artefato **adjudica**: a redação incondicional é a de `ProductEntity`; os
outros quatro pontos são **menos restritivos que o documentado**, portanto divergências, não
alternativas equivalentes. Isso muda a instrução de remediação — não é "o dono escolhe qual das
versões vale", é "quatro caminhos não cumprem UC-03 e um cumpre".

**Severidade:** HIGH mantida. Não é CRITICAL: não há bypass de autenticação/autorização, não há
lançamento contábil nem fiscal decorrente direto, e a regra é de consistência de cadastro. É HIGH
porque o mesmo produto é aceito ou recusado conforme a porta, a porta de escrita em massa e a porta
canônica são as permissivas, e a margem de venda é a grandeza afetada.

**Cobertura de teste:** nenhuma suíte encontrada exercita a regra fora de `ProductEntity`.

---

### 2.2 `T33-A-F02` — `effectiveness_result` sem caminho de escrita · **CONFIRMED · HIGH mantida**

**Prova de ausência refeita por mim** (não herdada): varredura de
`effectiveness_result|effectiveness_check|effectiveness_date` em `server/` inteiro. Ocorrências, com
classificação:

| Local | Natureza |
|---|---|
| `server/src/models/NonConformity.ts:35-38,74-77` | **definição** de coluna/ENUM |
| `server/src/shared/domain/handoffSignal.ts:68,73,76,196-210` | **leitura** |
| `server/src/modules/nonConformities/application/use-cases/ListNonConformitiesUseCase.ts:62` | **leitura** |
| `server/database/postgresql/00_baseline_frozen.sql:1742-1745,10186-10188`; `server/migrations/20260803-000003-fix-non-conformities-nullability.cjs:21-23` | DDL |
| `server/tests/unit/handoff-signal.test.ts:142-160` | teste da função pura, com o campo **injetado no objeto de entrada** |

**Zero escritas.** Confirmei os três pontos que poderiam escrever:
`UpdateNonConformityUseCase.ts:26-36` — `ALLOWED_FIELDS` tem 9 campos e **nenhum** dos três;
`closure.ts:57-62` (`buildClosureFields`, ponto único de encerramento usado pelo PUT e pelo DELETE)
grava **apenas** `closed_by` e `closed_date`; `CreateNonConformityUseCase` não aparece na varredura.
No cliente, `NonConformitiesTab.tsx:630-633` apenas **exibe** `effectiveness_result` quando presente
e o schema de edição (`:511`) só tem `status`. Não há formulário que o produza.

**Materialidade confirmada e mais forte do que o finding declarou.** `handoffSignal.ts:210` é
literalmente `if (entity.status === 'closed' && entity.effectiveness_result !== 'effective') return
'red'`, e o JSDoc `:196-200` declara que inclui *"`closed` sem nenhum resultado de eficácia
registrado"*. **Confirmei que essa função é consumida em produção**, não só em teste:
`ListNonConformitiesUseCase.ts:60` calcula `handoff_signal` para **cada linha** da listagem de RNC.
Logo o efeito é observável por qualquer consumidor de `GET /api/quality/non-conformities`: **toda RNC
encerrada aparece vermelha/"reincidente", sem exceção possível**.

**Elementos novos, ambos agravantes:**

- **Requisito declarado IMPLEMENTADO.** `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md:121` — RF-QUA-02
  ("análise de causa raiz + ação corretiva + **verificação de eficácia**, ciclo de status … →
  `effectiveness_check` → `closed`") está marcado **`[IMPLEMENTADO]`**. O finding citou UC-40, que é
  a régua do semáforo; RF-QUA-02 é a âncora mais forte, porque é o requisito que se declara
  cumprido. `DIAGRAMA_CASOS_DE_USO_BPMN.md:238` desenha o passo `effectiveness_check +
  effectiveness_result` como parte do fluxo.
- **Contradição interna no mesmo arquivo.** `UpdateNonConformityUseCase.ts:59-66` documenta, em
  `@remarks`, o cenário *"Fechar a RNC com `status = 'closed'` e `effectiveness_result =
  'effective'`"* — cenário que as `ALLOWED_FIELDS` do próprio arquivo (`:26-36`) tornam inalcançável
  por aquela rota. O código descreve um estado que ele mesmo impede.

**Correlação obrigatória (para não remediar duas vezes):** `T-15_REQUISITOS_UC_RASTREABILIDADE.md:230`
já registrou RF-QUA-02 como **IMPL-DIV (HIGH)** com a mesma frase ("`effectiveness_result` sem
caminho de escrita"). Aquilo é **célula de matriz de rastreabilidade, sem FIND-ID promovido** — não
é finding duplicado, e portanto `T33-A-F02` **não** é `DUPLICATE`; é a promoção formal, com evidência
própria, daquela linha. Registro o vínculo para o `vericore-audit-consolidator` amarrar os dois num
único item de remediação.

**Severidade:** HIGH mantida. Requisito de qualidade declarado implementado, exigido por ISO 9001
§10.2 (avaliação da eficácia da ação corretiva), sem qualquer caminho de cumprimento, com efeito
visível e permanente na fila operacional. Não é CRITICAL porque não há perda de dado nem exposição.

---

### 2.3 `T33-A-F04` — BR-RH-024 no `DELETE /api/employees/:id` · **CONFIRMED · HIGH mantida**

**Regra documentada, relida na fonte:** `docs/business/briefs/BRIEF_RH_2026-08-06.md:162` —
*"BR-RH-024 | Desligamento desativa imediatamente o usuário do sistema vinculado
(`employees.user_id`)"*, com base "Controle interno … LGPD art. 46". `:178` repete a regra na tabela
de integração RH → Auth. A BR está escrita no nível do **evento de negócio** ("desligamento"), não no
nível de uma rota.

**O gate, relido:** `DeactivateEmployeeUseCase.ts:63-71` só lança `BusinessRuleError` **se**
`terminationProcessChecker.hasOpenTerminationProcess(id)` retornar verdadeiro. O checker é injetado
de fato em produção (`employeeController.ts:97`), então o gate não é decorativo — mas ele é
**condicional por construção**, e o próprio JSDoc `:11-14` declara: *"Quando NÃO existe
`HrTerminationProcess` para o funcionário, o comportamento anterior é preservado integralmente"*.

**O caminho real sem processo aberto existe e foi confirmado.** Nesse caminho, `:73` grava
**exclusivamente** `{ status: 'inactive', dismissal_date: new Date() }` e retorna *"Funcionário
desligado com sucesso"*. Nenhuma escrita em `users`.

**Busca de controle compensatório — quatro tentativas, todas negativas:**

1. **Hook de model.** `hooks` em `server/src/models` = **1 ocorrência**, `User.ts:118`, e é
   `beforeSave` de hash de senha (`:123-132`). `Employee` não tem hook nenhum.
2. **Camada de autenticação.** `server/src/middlewares/auth.ts:94` — `if (!user.active)`. A varredura
   de `Employee|employee` nesse arquivo dá **zero**: a sessão nunca consulta o funcionário. Um
   `Employee` com `status: 'inactive'` cujo `User.active` continua `true` **autentica e opera
   normalmente**.
3. **Ponto que desativa o usuário.** `UserAccountServiceAdapter.ts:12-13` (`User.update({ active:
   false })`) — existe e está correto, mas é acionado pela conclusão do processo formal (RF-RH-022),
   ou seja, exatamente o caminho que **não** foi percorrido.
4. **Constraint/trigger.** Nenhuma relação `employees.status` × `users.active` no model
   (`Employee.ts:54` declara `user_id` apenas como FK anulável).

**Ressalva honesta, registrada porque enfraquece parcialmente o enquadramento:**
`docs/business/BLOCO_6_RH_REQUISITOS.md:148` amarra BR-RH-024 ao **RF-RH-022**, isto é, à conclusão do
`TerminationProcess` — e esse caminho **cumpre** a regra. Cabe a leitura de que a BR só se destina ao
fluxo formal. **Ela não me convence, por dois motivos:** (a) a BR está redigida sobre o evento
"desligamento", e a rota legada é um desligamento — grava `dismissal_date` e diz "desligado com
sucesso"; (b) a rota legada continua exposta (`employees.ts:23`), sem depreciação, sem `410`, sem
aviso. Enquanto houver uma porta que produz o efeito de negócio "desligado", a regra vale para ela.
Deixo a leitura alternativa registrada para o director, mas o veredito é **CONFIRMED**.

**Severidade:** HIGH mantida. O resultado é conta de ex-funcionário viva por tempo indeterminado —
controle de acesso e LGPD art. 46. Mitigação parcial real que impede CRITICAL: a rota exige
`authorize('admin')` (`employees.ts:23`), e o caminho formal, quando usado, cumpre a regra.

---

### 2.4 `T33-A-F05` — importação em massa sem `oldValues` · **CONFIRMED no mérito · HIGH → MEDIUM**

**Fato confirmado, integralmente.** `catalogImportController.ts:69-81`: `logAction` com
`action:'import'`, `newValues: { resumo: relatorio.resumo, arquivos: relatorio.arquivos }` e
`description` com três contadores. **Sem `oldValues`, sem `entityId`, sem lista de códigos.** A
operação de fato atualiza registros preexistentes:
`ImportCatalogSpreadsheetUseCase.ts:169-181` alterna entre `criarProduto`/`atualizarProduto` (`:171`,
`:173`) e `criarItem`/`atualizarItem` (`:177`, `:179`). Os dois agravantes também conferem: o
`logAction` está **dentro** de `if (relatorio.gravado)` (`:69`), logo planilha recusada não deixa
rastro, e a simulação nunca chega lá. Acrescento um terceiro: `spreadsheetUpload.ts:21-23` usa
`multer.memoryStorage()` — **o arquivo enviado não é retido em lugar nenhum**, então nem "reconstruir
pela planilha original" é garantia do sistema; depende de o operador ter guardado o CSV.

**Por que a severidade cai.** Não é o fato que está em dúvida — é a escala:

- **T-03 mediu a condição sistêmica e não a classificou como HIGH.** `T-03_AUDIT_LOG_REPORT.md:186-187`:
  *"Antes-depois: ~24%. `oldValues:` = 28 em 15 arquivos contra ações mutantes = 118 em 57. ≈90
  eventos mutantes (76%) gravam só o estado DEPOIS."* Isso está na seção de dimensões, **não** virou
  finding próprio de nenhuma severidade. Um caso particular não pode ser HIGH quando o universo de
  ~90 casos não foi sequer promovido.
- **A mesma âncora já é MEDIUM.** `T-03_AUDIT_LOG_REPORT.md:62-71` (`AUD-DB-04`, **MEDIUM**) cita
  nominalmente `catalogImportController.ts:70-80` — pela omissão de `entityId`. Duas deficiências do
  mesmo `logAction`, uma já classificada MEDIUM pela trilha titular de D6.
- **Incoerência interna do próprio Bloco A.** `T33-A-F06` — `clients`, `employees` e
  `nonConformities` com **nenhum** audit log em 9 endpoints de escrita — foi classificado **MEDIUM**.
  Ausência total de trilha não pode ser MEDIUM e trilha-sem-before-image ser HIGH no mesmo relatório.

**MEDIUM, portanto**, com confiança CONFIRMED. Registro que a trilha titular de D6 é T-03: se o
director entender que o conjunto (`AUD-DB-04` + `T33-A-F05` + o 76% do §3 de T-03) merece uma
reclassificação para cima, isso deve ser feito **no nível do conjunto, por T-03**, e não neste
finding isolado.

---

### 2.5 `T33-B-F01` — `equipment_description` da OS · **CONFIRMED no mérito · HIGH → MEDIUM**

**Os quatro artefatos confirmados, um a um:**

| Artefato | Nome usado | Âncora relida |
|---|---|---|
| Contrato de API | `equipment_description` | `docs/arquitetura/API.md:3986` (corpo do `POST`) |
| Use case | `equipment_desc` | `CreateServiceOrderUseCase.ts:14` (interface), `:37` (destructuring), `:48` (repassado ao repositório) |
| Model / coluna | `equipment_description` | `server/src/models/ServiceOrder.ts:18,43` (`DataTypes.TEXT`) |
| Cliente web | `equipment_desc` | `client/src/api/serviceOrders.ts:75`; `ServiceOrdersTab.tsx:56,103,196` |

**Divergência nova: são seis artefatos, não quatro** — e o quinto explica por que nenhum
`tsc --noEmit` jamais pegaria isto:

5. `server/src/types/models.d.ts:248` — `equipment_desc?: string;`. **A própria declaração de tipo do
   servidor carrega o nome errado.** O tipo concorda com o defeito, então o typecheck valida o
   caminho quebrado. É exatamente a classe "passa por typecheck e por teste".
6. `docs/database/DATABASE.md:190` — o diagrama de `service_orders` exibe `equipment_desc` como se
   fosse a coluna, contradizendo `docs/database/04-DICIONARIO_DADOS.md:1759` e
   `docs/database/schema.sql:6196`, que trazem `equipment_description`. A documentação de banco
   diverge **de si mesma**.

**Perda confirmada em todos os caminhos.** `SequelizeServiceOrdersRepository.ts:44-45` faz
`ServiceOrder.create(data)` cru — a chave `equipment_desc` não é atributo do model e o Sequelize a
descarta em silêncio. **`UpdateServiceOrderUseCase.ts:11-24`: reli a `ALLOWED_FIELDS` inteira — 12
campos, e nenhum deles é `equipment_desc` nem `equipment_description`.** Confirmo a afirmação mais
forte do finding: **o dado não é recuperável por edição posterior**. Não existe nenhuma outra rota de
escrita em `service_orders` (`serviceOrderController.ts` tem 5 handlers, `:41-49`, `:52-60`, `:63-71`
são os de escrita).

**Conhecimento prévio da engenharia: confirmado, e pior do que o relatado.**
`client/src/api/serviceOrders.ts:12-19` descreve o defeito com precisão cirúrgica — *"o valor digitado
pelo operador é silenciosamente perdido"* — e encerra com *"Ver relatório de handoff"*. **Busquei o
tal relatório: `equipment_desc` em todo o repositório dá 17 ocorrências e nenhuma delas está em
`docs/governance/HANDOFF_*` nem em qualquer finding anterior a T-33.** A remissão é órfã. O defeito
é conhecido, descrito, e não está registrado em nenhum artefato de governança (Regra 7/17).

**Por que a severidade cai.** O mesmo autor, no mesmo lote, classificou **MEDIUM** duas ocorrências
da mesma classe, sobre dado mais sensível: `T33-A-F13` (`PUT /clients/:id` aceita `cpf_cnpj`,
responde 200 e não grava) e `T33-A-F14` (`address` aceito, validado e nunca persistido). Se
identificador fiscal do cliente descartado em silêncio é MEDIUM, descrição livre de equipamento —
campo opcional, sem impacto em autorização, sem lançamento financeiro, sem efeito em outra entidade —
não é HIGH. **MEDIUM**, confiança CONFIRMED.

**Recomendação ao consolidador:** tratar `T33-A-F13`, `T33-A-F14` e `T33-B-F01` como **uma classe de
defeito** — "campo aceito na borda, respondido 200 e descartado em silêncio" — com uma guarda única
(contrato borda × model) em vez de três correções pontuais. A causa raiz comum está exposta em
`models.d.ts:248`: o tipo do servidor não é derivado do model.

---

### 2.6 `T33-B-F02` — filtragem de cards do Dashboard só no cliente · **CONFIRMED · HIGH mantida**

Este é o finding que o encargo mandou fazer viver ou morrer no cruzamento da matriz. **Ele vive, e o
alcance é maior do que o finding afirma.**

**Regra documentada, relida:** `docs/business/BUSINESS_RULES.md:194-197` — *"**Dashboard**: módulo
próprio (`dashboard`) no perfil; ao acessar, **o sistema filtra** os cards exibidos pela interseção
entre os cards existentes e os demais módulos concedidos ao perfil — não é bloqueio total, é
filtragem de conteúdo."* Sujeito: **o sistema**.

**Implementação, relida:** `dashboard.ts:27` monta `GET /` com `authenticate, authorizeModule('dashboard')`;
`dashboardController.ts:16-24` chama `useCase.execute()` **sem argumento algum** — `req.user` não é
tocado; `SequelizeDashboardRepository.getSummary():22-55` agrega incondicionalmente e retorna, em
`:53`, `financial: { pending_receivable: ar, pending_payable: ap, projected_balance: ar - ap }`, além
de `sales: { month_total }` em `:49`. Os somatórios vêm de `AccountReceivable.sum` e
`AccountPayable.sum` (`:44-45`).

**Cruzamento da matriz — `BUSINESS_RULES.md:36` × `:57`, contados por mim:** a linha `dashboard`
(`:36`) traz `V` para as **12** colunas de perfil. A linha `financeiro` (`:57`) traz valor só em duas:
Gestor de Compras (`V`) e Financeiro (`A`); as outras **10** são `-`. O finding lista 6 perfis
(Almoxarife, Recebimento, Expedição, Analista de Laboratório, Operador de Produção, RH). **São 10**:
os 6 citados mais **Comprador, Engenheiro, PCP e Qualidade**. O finding subestima o próprio alcance.

**Verificação decisiva, que o finding não fez: a matriz é doc, o seed é implementação (Regra 7).**
`BUSINESS_RULES.md:71-74` declara a matriz "ponto de partida editável", então ela sozinha não
provaria nada. Fui ao seed real, `server/scripts/seed-usuarios-departamentos.cjs`, e confirmei perfis
concretos com `dashboard` e **sem** `financeiro`: RH (`:111`), Engenharia (`:121`), PCP (`:133`),
Produção (`:145`), Almoxarifado (`:157`), Compras (`:171`), Gestão de Compras (`:182`), Vendas
(`:193`), Qualidade (`:217`), Expedição (`:228`). **Dez perfis semeados.** Só Diretoria (`:97`) e
Financeiro (`:203-205`) têm `financeiro`. A exposição não é hipotética de documento: está no seed.

**Premissa do finding que precisa ser corrigida — e a correção agrava (Regra 21).** O finding diz
*"A filtragem existe só no cliente (`DashboardPage.tsx:25,32-38`)"*. Reli o cliente e isso não se
sustenta em dois níveis:

1. **`DashboardPage.tsx` é componente órfão.** `client/src/App.tsx:9-12,112-119` roteia `/dashboard`
   para `executive/CommandCenterPage`, e o comentário `:9-11` registra a substituição. O achado
   `T32-TRV-F08` (`T-32_CLIENT_TRANSVERSAIS.md:22,92`) já havia constatado a orfandade.
2. **Mesmo o componente órfão não filtra este payload.** `DashboardPage.tsx:32-38` calcula
   `canSeeFinanceiro` para **habilitar/desabilitar chamadas a outros endpoints** (`:58-62`,
   `financialApi.listPayables`). Ele não consome `GET /api/dashboard`.

E o fecho: varredura de `api/dashboard` em `client/src` mostra que `client/src/api/dashboard.ts`
expõe **apenas** `GET /api/dashboard/handoffs` (`:23-25`). **Nenhum cliente oficial consome
`GET /api/dashboard`.** Logo não existe "filtragem no cliente" para este payload — existe **um
endpoint sem consumidor, autorizado a 10 perfis, devolvendo a posição financeira da empresa**. É pior
do que uma regra imposta no lugar errado: é uma regra imposta em lugar nenhum.

**Agravante documental:** `dashboard.ts:10-14` declara, na própria rota, que *"a filtragem de cards
por interseção … é responsabilidade do controller/frontend, não desta rota"*. O controller
(`dashboardController.ts:16-24`) não a faz. A responsabilidade foi atribuída explicitamente a uma
camada e não foi cumprida lá.

**Severidade:** HIGH mantida. Regra de negócio versionada, não imposta no servidor, expondo contas a
receber, contas a pagar, saldo projetado e faturamento do mês a perfis sem o módulo `financeiro` —
confirmado no seed real. Não é CRITICAL: os dados são **agregados** (sem registro individual, sem
dado pessoal), a operação é somente leitura e há `authorizeModule` na rota, isto é, não é acesso
anônimo. Confiança **CONFIRMED** para a alcançabilidade estática (rota + middleware + payload); a
resposta HTTP real não foi observada — ver `DYN-T34-01`.

---

### 2.7 `T33-B-F03` — `serviceOrders` sem auditoria · **DUPLICATE de `AUD-DB-03`**

**O fato é verdadeiro e foi reconfirmado por varredura própria.**
`serviceOrderController.ts` tem 71 linhas; os `require` de `:3-8` são cinco use cases e um
repositório — **`auditLogService` não é importado**; `logAction` no arquivo = **zero**. Os três
handlers de escrita (`:41-49` `create`, `:52-60` `update`, `:63-71` `remove`) não deixam rastro.
O contraste apontado também confere no mesmo commit: `maintenanceController.ts` registra os três
(`:47`, `:68`, `:88`) e `laboratoryController.ts:31-38` registra a criação. A materialidade é real:
`UpdateServiceOrderUseCase.ts:14-15,23` admite `labor_cost`, `total_amount` e `warranty_days` na
allowlist, e nada disso gera evento.

**Mas o finding não é novo.** `T-03_AUDIT_LOG_REPORT.md:46-58` — **`AUD-DB-03`, HIGH, já `PROPOSED` ao
validador** — enuncia: *"13 módulos com rota de escrita e zero `logAction`"*, e a lista nominal
inclui **`serviceOrders`** (`:49`), junto de `clients`, `employees` e `nonConformities`. Confirmei a
lista na fonte primária que T-03 cita: `server/tests/unit/audit-coverage-guard.test.ts:49-63`,
`DEBITO_CONHECIDO`, com `'serviceOrders'` em `:59`.

Mesma condição, mesmo `AUDIT_COMMIT`, mesmo mecanismo, mesma remediação. Emitir `T33-B-F03` como item
separado produziria dois casos SanaCore para uma correção só e distorceria a contagem de HIGH da run.

**Veredito: `DUPLICATE` de `AUD-DB-03`.** Não segue para remediação como item próprio.
**A materialidade específica não se perde:** fica registrada aqui como **insumo dirigido a
`AUD-DB-03`** — dos 13 módulos, `serviceOrders` é o que carrega valor cobrado do cliente
(`labor_cost`, `total_amount`) e prazo de garantia (`warranty_days`), o que deve **priorizar
`serviceOrders` dentro do lote** de `AUD-DB-03`, não criar um lote paralelo. O mérito, a severidade e
o eventual encerramento de `AUD-DB-03` são da trilha T-03 e do seu validador — nada aqui reclassifica
aquele finding.

**Observação da mesma natureza, fora do meu bloco (não é veredito, é alerta ao consolidador):**
`T33-A-F06` (MEDIUM — `clients`, `employees`, `nonConformities` sem audit log) descreve **outros três
módulos da mesma lista de 13** de `AUD-DB-03`. Mesma sobreposição, mesmo risco de remediação em
duplicidade. Recomendo ao `vericore-audit-consolidator` tratá-lo junto.

**Sobre `DEBITO_CONHECIDO` ser controle compensatório:** examinei e **não é**.
`audit-coverage-guard.test.ts:46-48` declara que a lista só admite **remoção** de entradas — ou seja,
a guarda impede o débito **crescer**, não o corrige, e não existe decisão humana registrada que
aceite o risco dos 13. Registro do débito ≠ controle.

---

## 3. Divergências e correções que este validador produziu

Nenhuma delas é finding novo (não é minha atribuição criá-los) — são correções e insumos dirigidos às
trilhas de origem e ao director.

| # | Divergência | Destino | Efeito |
|---|---|---|---|
| D1 | `T33-A-F01` diz "três implementações". São **cinco pontos de decisão**, e dois deles (`itemProductMirrorService.ts:97-111,162-169`) estão no caminho que `CreateProductUseCase.ts:33-39` declara **canônico** | autor de T-33 Bloco A; SanaCore via director | Amplia o escopo da correção; `ProductEntity` sozinho não resolve |
| D2 | `T33-A-F01` afirma que a regra "não tem artefato versionado que a fixe" (`:201-202`). **Tem:** UC-03, `docs/projeto/04-USE_CASES.md:65-67`. O que falta é BR-ID | director (a lacuna deixa de ser "qual regra vale" e passa a ser "criar o BR-ID") | Remove uma decisão do dono; a regra já está adjudicada |
| D3 | `T33-A-F02` tem âncora de requisito mais forte que a usada: **RF-QUA-02 marcado `[IMPLEMENTADO]`** em `DOCUMENTO_DE_REQUISITOS.md:121` | `vericore-traceability-auditor` | Requisito declarado cumprido e incumprível |
| D4 | `T33-A-F02` correlaciona-se com `T-15:230` (IMPL-DIV HIGH, sem FIND-ID) | `vericore-audit-consolidator` | Amarrar num item só |
| D5 | `T33-B-F01`: **6 artefatos divergentes, não 4**. `server/src/types/models.d.ts:248` declara o nome errado — por isso o typecheck é cego; `docs/database/DATABASE.md:190` contradiz `04-DICIONARIO_DADOS.md:1759` | autor de T-33 Bloco B; T-23 (doc × código) | Muda a correção: sem consertar o `.d.ts`, a guarda não fecha |
| D6 | `T33-B-F01`: a remissão *"Ver relatório de handoff"* (`client/src/api/serviceOrders.ts:19`) é **órfã** — nenhum artefato de governança registra `equipment_desc` | director (Regra 7/17) | Defeito conhecido e não registrado |
| D7 | `T33-B-F02` subconta o alcance: **10 perfis na matriz** sem `financeiro`, não 6; e **10 perfis semeados** em `seed-usuarios-departamentos.cjs` | autor de T-33 Bloco B | Amplia a exposição |
| D8 | `T33-B-F02` credita filtragem a `DashboardPage.tsx`, que é **componente órfão** (`App.tsx:112-119`) e que **não consome** `GET /api/dashboard`. Nenhum cliente consome esse endpoint | autor de T-33 Bloco B; T-32 (correlação com `T32-TRV-F08`) | A premissa cai e o finding fica mais forte |
| D9 | `T33-B-F03` sobrepõe-se a `AUD-DB-03`; `T33-A-F06` (MEDIUM, fora do meu bloco) sobrepõe-se ao mesmo | `vericore-audit-consolidator` | Evita remediação em duplicidade |
| D10 | Incoerência de escala dentro de T-33: ausência total de trilha = MEDIUM (`T33-A-F06`) enquanto trilha sem `oldValues` = HIGH (`T33-A-F05`); campo fiscal descartado = MEDIUM (`T33-A-F13`) enquanto texto livre descartado = HIGH (`T33-B-F01`) | `vericore-software-audit-director` | Fundamento dos dois rebaixamentos |

---

## 4. Pedidos DYN (nenhum executado; fila G4, `erp_evok_audio_test`)

| ID | Pedido | Serve a |
|---|---|---|
| `DYN-T34-01` | `GET /api/dashboard` com JWT de perfil **Almoxarifado** (seed `:157`, sem `financeiro`); observar se o corpo traz `financial.projected_balance` | `T33-B-F02` — converte alcançabilidade estática em prova |
| `DYN-T34-02` | `POST /api/service-orders` com `equipment_description` **e** com `equipment_desc`; em seguida `GET /:id`; depois `PUT` tentando recuperar o campo | `T33-B-F01` — prova da perda e da irrecuperabilidade |
| `DYN-T34-03` | `POST /api/items` com `custo_padrao > 0`; conferir o produto gêmeo criado (`price = 0`, `cost_price > 0`) | `T33-A-F01` D1 — prova de que a porta canônica gera o estado proibido |
| `DYN-T34-04` | `PUT /api/quality/non-conformities/:id` com `effectiveness_result: 'effective'`; depois `GET` da lista e leitura de `handoff_signal` | `T33-A-F02` — prova de que o campo é inescrevível e o semáforo fica `red` |
| `DYN-T34-05` | Criar funcionário com `user_id` vinculado, `DELETE /api/employees/:id` sem processo de rescisão, e tentar login com a credencial do desligado | `T33-A-F04` — prova de que o login sobrevive |

---

## 5. Declaração de encerramento

1. Os **7 HIGH** do encargo têm veredito registrado: **4 CONFIRMED em HIGH** (`T33-A-F01`,
   `T33-A-F02`, `T33-A-F04`, `T33-B-F02`), **2 CONFIRMED com severidade rebaixada para MEDIUM**
   (`T33-A-F05`, `T33-B-F01`), **1 DUPLICATE** (`T33-B-F03` → `AUD-DB-03`).
2. **Nenhum FALSE_POSITIVE e nenhum NEEDS_MORE_EVIDENCE.** Todos os sete são tecnicamente
   demonstráveis por leitura do artefato versionado no `AUDIT_COMMIT`; nenhum se apoia em "pode haver
   um problema".
3. **Toda tentativa de refutação está documentada**, inclusive as que falharam (§2.3 — a leitura
   alternativa de BR-RH-024 via RF-RH-022 ficou registrada, não escondida).
4. Cada um dos sete teve busca ativa de controle compensatório em pelo menos três camadas (rota,
   middleware/hook, model/constraint). Os controles encontrados estão registrados: gate condicional
   de `DeactivateEmployeeUseCase.ts:63-71`, `authorizeModule('dashboard')` em `dashboard.ts:27`,
   `authorize('admin')` em `employees.ts:21-23`, `UserAccountServiceAdapter.ts:12-13`,
   `DEBITO_CONHECIDO` de `audit-coverage-guard.test.ts:49-63`. **Nenhum deles invalida o finding
   correspondente**; os que reduzem impacto foram usados como razão para não elevar a CRITICAL.
5. Nada do objeto auditado foi alterado (Regra 2). Nenhum comando de banco foi executado. Nenhum
   `FINDING CLOSED`, nenhum `RETEST_PASSED`, nenhuma declaração de conclusão de auditoria (Regra 4).
   Nenhum finding novo foi criado.
6. Fica **pendente do director**: (a) a decisão do BR-ID da regra preço × custo, agora reduzida a
   formalizar UC-03 (D2); (b) a coerência de escala de severidade apontada em D10; (c) o
   encaminhamento das sobreposições D9 ao consolidador.
