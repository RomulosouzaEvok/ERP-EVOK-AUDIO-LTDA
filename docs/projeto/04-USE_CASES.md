# Casos de Uso - ERP EVOK ÁUDIO

## Atores do Sistema

| Ator | Descrição |
|------|-----------|
| **Administrador** | Acesso total ao sistema. Gerencia usuários, configurações e todos os módulos. |
| **Operador** | Realiza vendas, cadastra clientes e produtos, consulta relatórios. |
| **Financeiro** | Gerencia contas a pagar/receber, baixas e fluxo de caixa. |

---

## UC-01: Login no Sistema

**Ator:** Administrador, Operador, Financeiro  
**Pré-condições:** Usuário cadastrado no sistema  
**Fluxo Principal:**
1. Usuário acessa a tela de login
2. Informa email e senha
3. Sistema valida as credenciais
4. Sistema gera token JWT
5. Usuário é redirecionado ao dashboard

**Fluxo Alternativo (credenciais inválidas):**
- Sistema exibe mensagem "Email ou senha incorretos"

**Pós-condição:** Sessão iniciada com token válido

---

## UC-02: Cadastrar Cliente

**Ator:** Operador, Administrador  
**Pré-condições:** Usuário autenticado  
**Fluxo Principal:**
1. Usuário acessa "Clientes > Novo Cliente"
2. Preenche os dados: Nome, CPF/CNPJ, Telefone, Email, Endereço
3. Sistema valida os campos obrigatórios
4. Sistema verifica CPF/CNPJ duplicado
5. Sistema salva o cliente
6. Sistema exibe mensagem "Cliente cadastrado com sucesso"

**Fluxo Alternativo (CPF/CNPJ já existe):**
- Sistema exibe "Já existe um cliente com este CPF/CNPJ"

**Regras de Negócio:**
- CPF/CNPJ é único no sistema
- Campos obrigatórios: Nome e CPF/CNPJ
- Cliente é criado com status "Ativo" por padrão

---

## UC-03: Cadastrar Produto

**Ator:** Operador, Administrador  
**Pré-condições:** Usuário autenticado, categoria existente  
**Fluxo Principal:**
1. Usuário acessa "Produtos > Novo Produto"
2. Preenche: Nome, Código, Descrição, Preço, Custo, Quantidade, Categoria
3. Define quantidade mínima para alerta de estoque
4. Sistema valida os dados
5. Sistema salva o produto
6. Sistema exibe mensagem de sucesso

**Regras de Negócio:**
- Código do produto é único
- Preço de venda deve ser maior que preço de custo
- Quantidade mínima padrão: 5 unidades
- Produto é criado com status "Ativo"

---

## UC-04: Registrar Venda

**Ator:** Operador, Administrador  
**Pré-condições:** Cliente e produtos cadastrados  
**Fluxo Principal:**
1. Usuário acessa "Vendas > Nova Venda"
2. Seleciona o cliente
3. Adiciona produtos (código ou nome)
4. Sistema calcula subtotal, descontos e total
5. Seleciona forma de pagamento (dinheiro, cartão, pix, boleto)
6. Usuário confirma a venda
7. Sistema **reserva** o estoque de cada item (gap G9, 2026-08-10 — **não**
   dá baixa; ver Regras de Negócio)
8. Sistema **não** gera Conta a Receber neste momento (gap G13, 2026-08-10 —
   ela nasce na autorização da NF-e; ver UC-06 e Regras de Negócio)
9. Sistema exibe comprovante da venda

**Fluxo Alternativo (estoque insuficiente):**
- Sistema alerta "Estoque insuficiente para o produto X"
- Venda não pode ser concluída
- O que é comparado é o estoque **disponível**
  (`products.quantity - products.reserved_quantity`), não o saldo bruto:
  material já comprometido com outro pedido ou com uma OP não conta

**Regras de Negócio:**
- Venda não pode ser concluída sem cliente
- Produtos com estoque zerado são sinalizados
- **[G13, 2026-08-10 — decisão D-A do dono] Confirmar o pedido NÃO cobra;
  autorizar a NF-e cobra.** A confirmação (`quote → confirmed`, ou criação
  já `confirmed`) **não cria nenhuma parcela** em `accounts_receivable`; as
  parcelas nascem quando a NF-e é autorizada, no valor **daquela emissão**
  (faturamento parcial cobra em parcelas, com numeração de `installment`
  contínua entre as notas). Base normativa: **CPC 47** item 31 (receita
  quando o cliente obtém o controle), item 38 (na confirmação não há posse
  física, titularidade, aceite nem direito presente a pagamento) e item 108
  (recebível exige direito **incondicional**). Criar as parcelas na
  confirmação antecipava receita e inflava o ativo.
- **[G13] Venda à vista NÃO gera recebimento imediato.** A parcela nasce
  `pending` com vencimento na data da emissão; a quitação é evento próprio
  da Tesouraria (`PUT /api/finance/receivable/:id/pay`). Antes, a parcela
  nascia `status: 'paid'` com `payment_date` preenchido sem que nenhum
  dinheiro tivesse entrado — invisível para a conciliação bancária, para a
  régua de cobrança e para a trilha de auditoria, e com quem vende dando
  quitação (falha de segregação de funções).
- Venda parcelada gera contas a receber futuras **a partir da NF-e**
- **[G9, 2026-08-10 — decisão D-A do dono] Confirmar o pedido RESERVA;
  autorizar a NF-e BAIXA.** A confirmação (`quote → confirmed`, ou criação
  já `confirmed`) cria uma reserva em `production_order_reservations` com a
  venda como dona; `products.quantity` só diminui quando a NF-e é
  autorizada, e **na quantidade efetivamente faturada** (faturamento parcial
  baixa em parcelas). Base normativa: Ajuste SINIEF 07/05, cláusula 1ª §1º e
  cláusula 9ª §1º — a NF-e é autorizada antes do fato gerador e a mercadoria
  só transita depois da autorização de uso; enquanto o pedido está apenas
  confirmado, a mercadoria continua fisicamente na empresa. Ver
  `docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md` e
  `docs/database/DATABASE.md` (seção G9).
- **Alteração de pedido confirmado** (`PUT /api/sales/:id/items`) ajusta a
  reserva pelo delta, sem tocar em `products.quantity`
- **Cancelamento** libera todo o saldo reservado e devolve ao estoque
  apenas o que já tinha sido faturado (`sale_items.invoiced_quantity`).
  Cancelar um orçamento (`quote`) não movimenta estoque nenhum

---

## UC-05: Gerenciar Contas a Pagar

**Ator:** Financeiro, Administrador  
**Pré-condições:** Usuário autenticado  
**Fluxo Principal:**
1. Usuário acessa "Financeiro > Contas a Pagar"
2. Visualiza lista de contas (pendentes, pagas, vencidas)
3. Filtra por período, status ou categoria
4. Registra novo pagamento (data, valor, comprovante)
5. Sistema baixa a conta como "Paga"
6. Sistema registra no fluxo de caixa

**Fluxo Alternativo (conta vencida):**
- Sistema exibe contas em vermelho
- Calcula multa/juros automaticamente

---

## UC-06: Receber Contas (Contas a Receber)

**Ator:** Financeiro, Administrador  
**Pré-condições:** NF-e da venda autorizada (parcelas de venda) **ou**
lançamento avulso de cobrança  
**Fluxo Principal:**
1. Usuário acessa "Financeiro > Contas a Receber"
2. Visualiza parcelas pendentes
3. Registra o recebimento
4. Sistema baixa a parcela como "Recebida"
5. Sistema atualiza o fluxo de caixa

**Fluxo Alternativo (cobrança avulsa, sem venda — decisão D-J):**
- Reembolso, aluguel e venda de sucata são cobranças legítimas **sem pedido
  de venda**. O usuário lança direto em `POST /api/finance/receivable`
  informando cliente, valor, vencimento e a origem em `notes`.
- A parcela nasce com `sale_id: null` e `status: 'pending'`.

**Regras de Negócio:**
- **[G13, 2026-08-10] Origem determina o caminho.** Recebível **de venda**
  só nasce pela autorização da NF-e (`POST /api/sales/:id/nfe`) — informar
  `sale_id` em `POST /api/finance/receivable` é recusado com 422 e
  `details.rule = 'G13-AR'`. Recebível **avulso** (sem `sale_id`) passa
  normalmente. Base: **CPC 47 item 108** (recebível exige direito
  incondicional) + decisão **D-J** do dono do produto.
- **Nenhuma parcela nasce baixada.** Informar `status` na criação é recusado
  com 422 e `details.rule = 'G13-AR-PAID'`. Quitação exige valor, data,
  usuário e contrapartida conciliável no extrato.
- Baixa parcial acumula em `amount_paid` e a parcela fica `partial`;
  `amount` (valor original) nunca é sobrescrito.

---

## UC-07: Gerar Relatório de Vendas

**Ator:** Administrador, Operador, Financeiro  
**Pré-condições:** Vendas registradas no período  
**Fluxo Principal:**
1. Usuário acessa "Relatórios > Vendas"
2. Define período (data inicial e final)
3. Sistema filtra as vendas do período
4. Sistema exibe: total de vendas, quantidade, ticket médio
5. Usuário pode exportar para PDF ou Excel

---

## UC-08: Controlar Estoque

**Ator:** Operador, Administrador  
**Pré-condições:** Produto cadastrado  
**Fluxo Principal:**
1. Usuário acessa "Estoque > Movimentações"
2. Registra entrada (compra, ajuste) ou saída (venda, perda)
3. Informa quantidade, motivo e observação
4. Sistema atualiza saldo do produto
5. Sistema registra histórico de movimentação

**Regras de Negócio:**
- Saída de estoque não pode ser maior que o saldo atual
- Toda movimentação gera registro histórico
- Produto com quantidade abaixo do mínimo gera alerta

---

## UC-09: Gerenciar Categorias

**Ator:** Administrador  
**Pré-condições:** Usuário autenticado como admin  
**Fluxo Principal:**
1. Usuário acessa "Configurações > Categorias"
2. Cadastra, edita ou exclui categorias
3. Sistema valida nome único
4. Sistema atualiza lista

**Regras de Negócio:**
- Categoria com produtos vinculados não pode ser excluída

---

## UC-10: Gerenciar Usuários

**Ator:** Administrador  
**Pré-condições:** Usuário autenticado como admin  
**Fluxo Principal:**
1. Usuário acessa "Configurações > Usuários"
2. Cadastra novo usuário (nome, email, senha, perfil)
3. Edita permissões ou inativa usuário
4. Sistema valida email único
5. Sistema salva alterações

---

## UC-11: Cadastrar Funcionario (RH)

**Ator:** Administrador (RH)
**Pre-condicoes:** Departamento cadastrado
**Fluxo Principal:**
1. Usuario acessa "RH > Funcionarios > Novo"
2. Preenche dados pessoais (nome, CPF, RG, PIS, CTPS)
3. Seleciona departamento e cargo
4. Informa dados contratuais (salario, turno, regime)
5. Anexa documentos (RG, CPF, CTPS, foto, exames)
6. Sistema valida CPF unico
7. Sistema salva o funcionario
8. Sistema registra no eSocial (evento S-2200)

**Regras de Negocio:**
- CPF e unico no sistema
- Funcionario e criado com status "active"
- Exame admissional e obrigatorio antes do inicio

---

## UC-12: Cadastrar Ordem de Producao (PCP)

**Ator:** Supervisor de PCP
**Pre-condicoes:** Produto cadastrado, materiais em estoque
**Fluxo Principal:**
1. Usuario acessa "Producao > Ordens de Producao"
2. Seleciona produto (auto-falante) e quantidade
3. Define data de inicio e data de vencimento
4. Sistema verifica disponibilidade de materiais (MRP)
5. Sistema verifica capacidade produtiva (CRP)
6. Usuario confirma a OP
7. Sistema gera numero unico (OP-2024-XXXX)
8. Sistema reserva materiais em estoque
9. OP entra na fila de programacao diaria

**Fluxo Alternativo (material insuficiente):**
- Sistema exibe "Materiais insuficientes" com lista
- Sugere gerar requisicao de compra automaticamente

**Regras de Negócio (gap G16, 2026-08-09):**
- Existem **dois caminhos** de criação de OP e ambos aplicam as mesmas
  validações de produção: produto ativo, estrutura (BOM) ativa e material
  mínimo disponível para a quantidade. O caminho manual é
  `POST /api/production/orders` (`CreateProductionOrderUseCase`); o caminho
  do planejamento é `POST /api/mrp/planned-orders/convert-to-production`
  (`ConvertPlannedOrdersToProductionOrderUseCase`). Até 2026-08-09 o caminho
  do MRP **não validava disponibilidade nenhuma** e criava OP sem material —
  OP que depois não conseguia ser concluída (a conclusão consome a BOM e
  falha sem estoque/sem BOM, ver gap G2).
- Diferença intencional entre os dois: o caminho do MRP aceita produto
  `finished` **e** `semi_finished` (produzir subconjunto é legítimo e é o que
  o MRP planeja ao explodir a necessidade de um `SUBCONJUNTO`); o caminho
  manual aceita apenas `finished`.
- A numeração `OP-YYYY-NNNN` é gerada de forma serializada no repositório
  (advisory lock por ano + `MAX` do sufixo já emitido), não por contagem de
  linhas: `COUNT` colidia entre criações concorrentes e regredia quando uma
  OP era removida, reemitindo um número já usado (`order_number` é `UNIQUE`).

**Regras de Negócio — reserva de material (gap G3, 2026-08-09):**

A criação da OP (`planned`) **não** reserva nada. A reserva acontece na
**liberação** (`PUT /api/production/orders/:id/status`, `status: 'released'`)
e, desde 2026-08-09, é **vinculada à ordem**, em
`production_order_reservations` (uma linha por OP × produto). O contador
`products.reserved_quantity` continua existindo apenas como **cache
derivado** — soma das reservas vivas.

| Evento | Efeito na reserva |
|---|---|
| `planned → released` | Explode a BOM na quantidade planejada e cria uma reserva **da OP** para cada componente. Falha se faltar material disponível (`quantity - reserved_quantity`), listando **todos** os itens faltantes de uma vez. |
| `released → in_progress → paused` | Nenhum. A reserva permanece viva. |
| `→ canceled` | Libera **integralmente e apenas** o saldo reservado por esta OP. Não reexplode a BOM: devolve o que a própria reserva registra. |
| `→ completed` | Libera a reserva desta OP **antes** de consumir (senão a própria reserva bloquearia o consumo), depois consome os componentes de fato. Concluir com quantidade zero é proibido (gap G2) — deixaria a reserva presa. |
| Remoção da OP (`DELETE`) | **Bloqueada** enquanto houver reserva ativa. O caminho correto é cancelar (o que devolve o material) e só então remover. |

Invariantes que o sistema passa a garantir:

1. **Uma OP não consegue liberar nem consumir material reservado por outra.**
   A liberação é limitada ao saldo da própria ordem; pedir mais devolve
   apenas o que é seu. Antes desta correção a liberação fazia
   `MIN(reservado_total_do_produto, desejado)` sobre o contador global — e
   qualquer OP canibalizava a reserva de qualquer outra.
2. **A pergunta "quanto deste item está reservado para a OP X?" tem resposta**
   (`inventoryService.listOrderReservations`).
3. **Reserva anônima não existe mais:** reservar sem informar a ordem dona é
   erro 400 do serviço de estoque.
4. Sobreprodução (produzido > planejado) continua permitida — o excedente
   consome estoque livre e é validado normalmente na baixa.

Escopo declarado: apenas produção. **Venda não reserva estoque** neste ERP
(orçamento não toca estoque; a confirmação já dá baixa direta), então não há
reserva de venda a vincular.

---

## UC-13: Apontar Producao (Chao de Fabrica)

**Ator:** Operador de Producao
**Pre-condicoes:** Ordem de producao liberada
**Fluxo Principal:**
1. Operador seleciona OP em andamento
2. Informa quantidade produzida (boas)
3. Informa quantidade refugada (defeituosas)
4. Registra paradas de maquina (motivo, duracao)
5. Sistema calcula eficiencia (OEE)
6. Sistema atualiza saldo da OP
7. Se OP concluida, da baixa no estoque de produto acabado

---

## UC-14: Controlar Estoque de Insumos (Almoxarifado)

**Ator:** Almoxarife
**Pre-condicoes:** Itens cadastrados no almoxarifado
**Fluxo Principal:**
1. Usuario acessa "Almoxarifado > Movimentacoes"
2. Registra entrada (compra, devolucao) ou saida (producao, consumo)
3. Informa quantidade, departamento e motivo
4. Sistema atualiza saldo do item
5. Sistema alerta se estoque abaixo do minimo

---

## UC-15: Registrar Ordem de Compra (Suprimentos)

**Ator:** Comprador
**Pre-condicoes:** Fornecedor cadastrado, produto/insumo cadastrado
**Fluxo Principal:**
1. Usuario acessa "Compras > Novo Pedido"
2. Seleciona fornecedor
3. Adiciona itens (produto, quantidade, preco negociado)
4. Define condicoes de pagamento e prazo de entrega
5. Sistema calcula total do pedido
6. Usuario confirma e emite pedido
7. Sistema altera status para "sent"
8. Pedido e registrado para acompanhamento

### Alcada de aprovacao do pedido — G11 [IMPLEMENTADO 2026-08-10]

Decisao D-C do dono do produto
(`docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4). A alcada e
por **ORIGEM**, nao apenas por faixa de valor:

| Origem | Regra |
|---|---|
| Nacional | ate R$ 500.000 segue direto; **acima** exige aprovacao da diretoria |
| Importacao | **sempre** exige a diretoria, em qualquer valor |

**Origem efetiva** (`resolvePurchaseOrigin`,
`server/src/modules/purchases/domain/constants.ts`) = `import` se
`purchase_orders.origin = 'import'` **OU** `suppliers.is_foreign = true`.
Desenho escalation-only: a declaracao feita no pedido so consegue tornar a
alcada mais restritiva; marcar como `national` um pedido de fornecedor
estrangeiro **nao** escapa da diretoria.

**Valor comparado com o teto:** `total_amount` (mercadoria) + `freight_value`
(frete), sem impostos — o pedido de compra nacional nao calcula tributo neste
ERP.

**Fluxo quando a alcada e exigida:**
1. Comprador cria o pedido normalmente (`pending`).
2. `GET /api/purchases/:id/approvals` mostra origem, valor, papeis exigidos e
   o que falta (somente leitura, sem efeito colateral).
3. Um usuario com o modulo de acesso `diretor` registra a aprovacao em
   `POST /api/purchases/:id/approve` — `approver_user_id` vem do JWT e
   `approver_role` do RBAC, nunca do body; um papel so aprova uma vez por
   pedido (UNIQUE no banco). So e aceita enquanto o pedido esta `pending`.
4. `PUT /api/purchases/:id/status` com `status='approved'` passa a verificar
   as aprovacoes registradas: sem a alcada satisfeita, devolve **422**
   (`BUSINESS_RULE_VIOLATION`, `details.rule='G11'`) e **nao** grava o
   status.

**Interacao com o G13 (2026-08-10):** a aprovacao **nao gera mais conta a
pagar** — o passivo nasce no recebimento (UC-16). A alcada continua sendo o
portao do passivo, so que por um caminho mais longo: pedido que nao pode ser
aprovado nunca chega a `sent`, e `sent`/`partial` sao os unicos status que o
recebimento aceita. Nenhum passivo passa a existir sem aprovacao.

**Fluxo normal (maioria dos pedidos):** nacional dentro do teto continua
seguindo direto, sem passo novo e sem consulta extra de aprovacoes.

**Congelamento pos-aprovacao:** depois que o pedido esta `approved`,
`supplier_id`, `freight_value` e `origin` nao podem mais ser alterados em
`PUT /api/purchases/:id` (senao daria para aprovar R$ 450.000 sem a diretoria
e acrescentar R$ 100.000 de frete depois). `origin` tambem nunca volta de
`import` para `national`, e `suppliers.is_foreign` nao pode ser desmarcado
pela API.

**NAO implementado (decisao explicita do dono):** segregacao de funcao
(aprovador != solicitante). Abaixo de R$ 500.000 no nacional, quem solicita
ainda pode aprovar — risco residual de controle interno registrado no plano
de acao, nao um defeito.

---

## UC-16: Receber Pedido de Compra

**Ator:** Almoxarife
**Pre-condicoes:** Pedido de compra enviado ao fornecedor
**Fluxo Principal:**
1. Usuario acessa "Compras > Recebimento"
2. Localiza pedido por numero
3. Confere nota fiscal do fornecedor
4. Confere quantidade recebida fisicamente
5. Sistema da entrada no estoque (`products.quantity` incrementado normalmente)
6. Sistema cria/atualiza o lote (`LotControl`) do item recebido em status
   **`quarantine`** (nao `available`) — o lote fica bloqueado para CONSUMO
   ate a inspecao de recebimento (UC-17C) aprovar e a liberacao (UC-17B)
   acontecer. O estoque FISICO entra normalmente (`products.quantity`),
   mas **[G7, 2026-08-10]** esse saldo retido passou a ser descontado do
   estoque que o PLANEJAMENTO enxerga (MRP e disponibilidade de OP) — antes
   disso material nao inspecionado contava como disponivel e a quarentena
   era decorativa para o planejamento.
7. Sistema atualiza status do pedido para "received"
8. **[G13, 2026-08-10]** Sistema gera a conta a pagar do fornecedor **neste
   momento** (nao mais na aprovacao do pedido), no valor do que foi
   **efetivamente recebido nesta entrega**

**Regra de negocio do passivo — G13 [IMPLEMENTADO 2026-08-10]**

Decisao D-A do dono
(`docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4). Base
normativa: **CPC 00 (R2) item 4.56** — pedido aprovado e nao entregue e
*contrato executorio*, nao passivo — e **item 4.58** — o passivo surge
quando a outra parte cumpre primeiro, isto e, quando o fornecedor entrega.

| Aspecto | Regra |
|---|---|
| Gatilho | `POST /api/purchases/:id/receive` (era: transicao para `approved`) |
| Valor | Soma de `quantidade recebida x preco unitario` **desta entrega**. Recebeu metade, deve a metade. Tres entregas = tres contas a pagar |
| Documento | `invoice_number` = NF do fornecedor desta entrega (era: `null`) |
| Vencimento | `due_date` informado prevalece; senao `invoice_date + 30`; senao data do recebimento + 30. ⚠️ Pergunta **C7** ao contador (prazo conta da NF ou do recebimento fisico?) segue aberta |
| Aprovador | `approved_by`/`approval_date` **nulos** — quem recebe nao aprova pagamento (three-way match: pedido x recebimento x NF) |
| Idempotencia | Par `(purchase_id, invoice_number)`, o mesmo do indice unico de `purchase_receipts` |
| Frete | **Fora** do valor da AP, como ja ficava fora de `total_amount`; continua lancamento manual |

**Dado legado.** Pedido aprovado antes do corte ja tem uma AP do valor
cheio (reconhecivel por `invoice_number IS NULL`). Ao receber esse pedido, o
sistema **nao lanca nada** e devolve `payable_skip_reason:
"legacy_created_on_approval"`, para nao duplicar passivo. Nenhuma linha
financeira existente e alterada — o destino delas (estorno ou congelamento)
e a pergunta **C9** ao contador, em aberto.

**Fluxo Alternativo (divergencia):**
- Se quantidade recebida < quantidade pedida: recebimento parcial (e a
  conta a pagar cobre so o que chegou)
- Se produto com defeito: aciona qualidade (incoming inspection, UC-17B) —
  o inspetor pode bloquear o lote diretamente (`quarantine` → `blocked`) ou
  abrir uma RNC referenciando o `lot_number` (UC-17), que bloqueia o lote
  automaticamente.

---

## UC-17: Realizar Inspecao de Qualidade (Registro de Nao Conformidade)

**Ator:** Inspetor de Qualidade
**Pre-condicoes:** Producao apontada ou material recebido
**Fluxo Principal:**
1. Usuario acessa "Qualidade > Inspecao"
2. Seleciona tipo (incoming, processo, final)
3. Realiza medicoes conforme plano de inspecao
4. Registra resultados (aprovado, rejeitado, retrabalho)
5. Se rejeitado, sistema gera NC (Nao Conformidade) via
   `POST /api/quality/non-conformities`
6. **Se a NC informar `lot_number` + `product_id`:** o sistema localiza o
   `LotControl` correspondente e, na MESMA transacao da criacao da NC, move
   o lote para `blocked` (a partir de `available`, `quarantine` ou
   `reserved`), registrando `"Bloqueado pela RNC #<id>"` em `notes`.
6b. **Se a NC NAO bloquear lote nenhum:** ela e criada assim mesmo (pode
   referenciar lote de sistema externo), porem com **aviso explicito**
   gravado em `non_conformities.notes`, prefixado por
   `[ATENCAO: NENHUM LOTE BLOQUEADO]` e dizendo o motivo — lote nao
   encontrado para o produto, `lot_number` sem `product_id` (a busca e por
   par produto x lote), lote em status nao bloqueavel
   (`consumed`/`expired`/ja `blocked`), ou NC de produto sem `lot_number`.
   Como o endpoint devolve a RNC inteira, o aviso volta no payload da
   resposta. NC que nao se refere a produto (ex.: `origin='audit'`,
   `asset_id`) nao gera aviso — nao ha lote a conter.
   *(Gap G10, 2026-08-09: ate essa data uma RNC que nao conteve material
   nenhum era indistinguivel de uma que bloqueou o lote — quem abriu a RNC
   acreditava ter contido o material, e nao tinha.)*
7. **Fechamento da NC:** ao mudar `status` para `closed` com
   `effectiveness_result = 'effective'`, o sistema **nao desbloqueia** o
   lote automaticamente — a liberacao pos-tratativa e sempre uma decisao
   manual e explicita de qualidade (ver UC-17B).

**Validacoes/Gatilhos:**
- Bloqueio de lote e best-effort e nao bloqueante: NC sempre e criada mesmo
  que o lote nao exista ou ja esteja em status terminal (ex.: `consumed`) —
  mas **nunca em silencio**: nesse caso a NC carrega o aviso do passo 6b.
  A NC e registro de qualidade e evidencia de auditoria (ISO 9001 8.7);
  recusa-la porque o lote nao foi localizado faria o sistema perder o
  registro do defeito para proteger um controle secundario.
- Nenhum outro campo do lote (quantidades, custo) e alterado pelo bloqueio.

---

## UC-17B: Liberar/Bloquear Lote (Inspecao de Recebimento e Pos-Tratativa de RNC)

**Ator:** Inspetor de Qualidade / Almoxarife (perfis `admin`, `operator`)
**Pre-condicoes:** Lote existente (`LotControl`) em `quarantine`, `available` ou `blocked`
**Fluxo Principal (liberacao):**
1. Usuario acessa "Qualidade > Lotes em Quarentena"
   (`GET /api/inventory/lots?status=quarantine`)
2. Sistema lista lotes com `product` (id, name, code) e `supplier` (id,
   company_name) incluidos, paginados
3. **[G7, 2026-08-10]** Usuario registra a INSPECAO do lote
   (`POST /api/quality/inspections`, UC-17C) — sem ela a liberacao e
   recusada
4. Apos a inspecao aprovar o material (ou apos tratativa de RNC concluida +
   nova inspecao aprovada), usuario aciona
   `POST /api/inventory/lots/:id/release` (body opcional `{ notes }`)
5. **[G7]** Sistema verifica o gate de qualidade: a inspecao MAIS RECENTE do
   lote precisa ter veredito `approved` ou `approved_under_concession`
6. Sistema move o lote para `available` — a partir de `quarantine`
   (liberacao pos-inspecao de recebimento) OU `blocked` (liberacao manual
   pos-tratativa de RNC) — gravando tambem `release_inspection_id`,
   `released_by` (do JWT) e `released_at`
7. Sistema registra log de auditoria (`logAction`)

**Fluxo Alternativo (bloqueio manual):**
1. Usuario aciona `POST /api/inventory/lots/:id/block` com
   `{ reason: string (min. 3 chars, obrigatorio) }`
2. Sistema move o lote para `blocked` — a partir de `quarantine` ou
   `available`
3. Sistema registra log de auditoria (`logAction`)

**Validacoes/Gatilhos:**
- 422 (`BusinessRuleError`) se a transicao solicitada nao for permitida a
  partir do status atual do lote (ex.: liberar lote ja `available`,
  bloquear lote `consumed`).
- 400 (`ValidationError`) se `reason` do bloqueio estiver ausente ou tiver
  menos de 3 caracteres.
- 404 (`NotFoundError`) se o lote nao existir.
- **[G7]** 422 (`BusinessRuleError`) com `details.rule = 'G7'` se o gate de
  qualidade recusar, e **nada e gravado no lote**:
  - `details.reason = 'no_inspection'` — o lote nunca foi inspecionado;
  - `details.reason = 'last_inspection_rejected'` — a inspecao mais recente
    reprovou o material.
- O FEFO da producao (`ChangeProductionOrderStatusUseCase`) so seleciona
  lotes `status = 'available'` — lotes em `quarantine` ou `blocked` ficam
  automaticamente fora do consumo automatico, sem necessidade de filtro
  adicional no motor de producao.
- **[G7, achado colateral]** O saldo retido em lotes `quarantine`/`blocked`
  passou a ser DESCONTADO do estoque que o PLANEJAMENTO enxerga (MRP e
  checagem de disponibilidade de OP). Antes disso a quarentena era
  decorativa para o planejamento: o recebimento incrementa
  `products.quantity` no mesmo passo em que cria o lote em quarentena, entao
  material nao inspecionado contava como disponivel e o MRP comprava de
  menos. O desconto e sempre `max(0, fisico - retido)`.

---

## UC-17C: Registrar Inspecao de Qualidade de Lote (G7 — ISO 9001 8.6/8.7)

**Ator:** Inspetor de Qualidade (`authorizeModule('qualidade','operate')`)
**Pre-condicoes:** Lote existente (`LotControl`)
**Decisao de negocio:** D-H do dono do produto, 2026-08-10 — a empresa
pretende se certificar ISO 9001, entao o registro de inspecao nasce no
formato que a norma pede, **sem** travar a operacao com burocracia que
ninguem executa (`docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4).

**Fluxo Principal:**
1. Usuario acessa "Qualidade > Inspecao de Lote"
   (`GET /api/inventory/lots?status=quarantine`)
2. Opcionalmente consulta `GET /api/quality/lots/:lotId/release-eligibility`
   (leitura pura, sem efeito colateral) para ver se o lote ja tem inspecao
3. Usuario registra a inspecao (`POST /api/quality/inspections`) informando
   **criterio de aceitacao** (obrigatorio), veredito, e opcionalmente plano
   de amostragem, tamanhos de lote/amostra, defeitos encontrados e notas
4. Sistema grava `inspector_id = req.user.id` (do JWT, NUNCA do body) e
   `inspected_at`
5. Conforme o veredito:
   - `approved` / `approved_under_concession` → a inspecao habilita a
     liberacao do lote (UC-17B), mas **nao libera sozinha**: liberar e ato
     separado, com permissao `qualidade:approve`
   - `rejected` → o sistema aciona `CreateNonConformityUseCase` (UC-17),
     que **abre a RNC e bloqueia o lote**, e grava `non_conformity_id` na
     inspecao

**Validacoes/Gatilhos (todas com `details.rule = 'G7'`):**
- 400 se `lot_id` ausente — nao existe inspecao desvinculada de lote
- 400 se `acceptance_criteria` tiver menos de 3 caracteres (§8.6 exige
  evidencia do criterio de aceitacao aplicado)
- 400 se `verdict`/`stage` estiverem fora do ENUM
- 400 se `verdict = 'approved_under_concession'` sem
  `concession_justification` (min. 10 caracteres) — a **aceitacao sob
  concessao** da §8.7 e decisao registrada e justificada, nunca um "release
  com observacao"
- 404 se o lote nao existir

**Regras de decisao:**
- O gate de liberacao usa a inspecao **MAIS RECENTE** do lote, nao "existe
  alguma aprovada". Com a segunda leitura, um lote aprovado na entrada e
  reprovado depois continuaria liberavel para sempre — o oposto do que a
  §8.7 manda. Assim, a re-inspecao apos retrabalho e o mecanismo natural de
  reabertura.
- Aprovar **nao** libera: inspecionar (evidencia, `operate`) e autorizar a
  liberacao (decisao, `approve`) sao atos distintos na §8.6 e agora tambem
  niveis de permissao distintos.

**⚠️ Fora de escopo por falta de decisao de negocio:**
Nao ha motor de amostragem Ac/Re. Nivel de inspecao e AQL por classe de
defeito (ISO 2859-1) sao decisao da Engenharia da Qualidade e ainda **nao
foram definidos** — a pesquisa normativa marca os valores de AQL como
`[NAO CONFIRMADO NA FONTE]`. `sampling_plan`, `lot_size` e `sample_size` sao
evidencia textual do que foi aplicado; o veredito e sempre humano.

---

## UC-18: Gerenciar Manutencao de Maquinas

**Ator:** Supervisor de Manutencao
**Pre-condicoes:** Maquina cadastrada como ativo
**Fluxo Principal:**
1. Usuario acessa "Patrimonio > Manutencao"
2. Registra ordem de servico (corretiva ou preventiva)
3. Informa maquina, descricao do problema, prioridade
4. Designa tecnico responsavel
5. Apos conclusao, registra servico realizado e pecas trocadas
6. Sistema atualiza historico de manutencao da maquina
7. Sistema programa proxima manutencao preventiva

---

## UC-19 [IMPLEMENTADO] (backend; tela web pendente): Gerenciar Importacao (COMEX)

**Ator:** Analista de Comex
**Pre-condicoes:** Fornecedor internacional cadastrado
**Fluxo Principal:**
1. Usuario acessa "Suprimentos > Importacao"
2. Registra processo de importacao
3. Informa dados: fornecedor, produto, quantidade, valor FOB
4. Sistema calcula tributos de importacao (II, IPI, PIS, COFINS, ICMS)
5. Registra acompanhamento (embarque, chegada, desembaraco)
6. Apos recebimento, da entrada no estoque com custo nacionalizado, **no
   mesmo padrao de rastreabilidade do recebimento de compra nacional**: lote
   proprio (`IMP-<ano>-XXXX-ITEM<id>-R001`) nascendo em **quarentena**,
   dual-write no deposito `INSUMOS` e custo medio ponderado (gap G14,
   2026-08-09)
7. A liberacao do material para a producao depende da inspecao de
   recebimento (`POST /api/inventory/lots/:id/release`) — o FEFO da producao
   so consome lote `available`

**Status real (2026-08-06):** backend completo em
`server/src/modules/comex/` (`/api/comex/import-processes`, RBAC via
módulo `comex`), models `ImportProcess`/`ImportProcessItem`, RF-COM-12
`[IMPLEMENTADO]` (`docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` §3), API
documentada em `docs/arquitetura/API.md` §32. **Tela web (`client/`) ainda não existe**
— próxima rodada de frontend.

**Decisões de escopo tomadas (não pedidas explicitamente pelo UC, mas
necessárias para implementar; detalhadas em `docs/governance/HANDOFF_CODEX.md`, seção
"UC-19 — Importação/COMEX"):**
- Reaproveitado o cadastro de `Supplier` existente — sem campo dedicado de
  "fornecedor estrangeiro"; qualquer fornecedor cadastrado pode ser usado.
- Alíquotas de II/IPI/PIS/COFINS/ICMS são **informadas manualmente** por
  item, por processo — **sem integração Siscomex/tabela NCM** para
  resolvê-las automaticamente.
- Fórmula de cálculo dos tributos é uma **simplificação fiscal** que segue
  a prática padrão brasileira (valor aduaneiro em BRL + rateio de
  frete/seguro, II/IPI/PIS/COFINS em cascata, ICMS "por dentro"), não uma
  engine de compliance fiscal certificada.
- "Registrar acompanhamento" implementado como transições sequenciais de
  `status` (`draft → shipped → arrived → customs_cleared → received |
  cancelled`), sem tabela de eventos separada.
- **Sem geração automática de Conta a Pagar** dos tributos de importação
  — `AccountPayable` não suporta moeda estrangeira; fica como melhoria
  futura (`docs/governance/TODO.md`).

**Corrigido em 2026-08-09 (gap G14, `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md`):**
a entrada de estoque da importação era uma versão **degradada** do
recebimento de compra — mexia em `products.quantity` e no custo médio, mas
**não criava lote, não passava por quarentena e não fazia dual-write de
depósito**. Na prática, insumo importado entrava sem rastreabilidade por lote
e podia ser consumido pela produção sem nunca ter sido liberado pela
qualidade, enquanto o mesmo insumo comprado no Brasil ficava retido. A
correção não duplicou lógica: os dois caminhos passaram a chamar
`services/materialReceiptService.receiveMaterialIntoQuarantine`. O rastro de
origem também deixou de mentir — `reference_type`/`source_type` passaram de
`'purchase'` para `'import'` (migration `20260809-000027`, **não aplicada**),
porque `reference_id` aponta para `import_processes.id` e a consulta reversa
devolvia um pedido de compra alheio.

**Pendência ligada ao G13 — PARADA E REPORTADA em 2026-08-10, aguarda
decisão do dono/contador.** O G13 fechou o momento do passivo para a compra
(nasce no recebimento, CPC 00 (R2) 4.58) e para o recebível de venda (nasce
na NF-e, CPC 47 108). **A Conta a Pagar dos tributos de importação
continua não sendo gerada** — e a razão deixou de ser "falta decidir o
momento" e passou a ser um conjunto de lacunas concretas que o ERP não tem
como preencher sozinho:

1. **Vencimento por tributo.** II, IPI, PIS e COFINS na importação têm fato
   gerador no **registro da Declaração de Importação**; o ICMS-Importação é
   devido no desembaraço, com prazo e forma de recolhimento que **variam por
   UF** e por eventual regime especial. O ERP hoje guarda
   `import_processes.customs_cleared_at` (data do desembaraço), mas **não
   guarda número nem data de registro da DI** — não há de onde derivar o
   vencimento sem inventar.
2. **Credor.** O beneficiário dos tributos é a União (DARF) ou o Estado
   (GNRE/GARE), não o fornecedor estrangeiro do processo.
   `accounts_payable.supplier_id` aponta para `suppliers`, e criar
   fornecedores fictícios "União"/"Estado" é decisão de cadastro do dono,
   não escolha técnica.
3. **Uma AP ou cinco?** II, IPI, PIS, COFINS e ICMS têm guias, datas e
   credores distintos — juntá-los numa AP única facilita o lançamento e
   destrói a conciliação; separá-los exige o de-para tributo→credor do
   item 2.
4. **Moeda.** `AccountPayable` não tem coluna de moeda nem de câmbio. Os
   tributos já são calculados em BRL (`import_processes.exchange_rate`
   aplicado no cálculo), então esta é a **menor** das lacunas — mas o FOB do
   fornecedor, esse sim, continua sem lugar para ser lançado como passivo em
   moeda estrangeira.

**O que o dono/contador precisa responder** antes de esta parte ser
implementada: (a) o ERP deve passar a registrar número e data da DI?
(b) cada tributo vira uma AP própria, e qual o credor cadastrado de cada
um? (c) qual a UF e o prazo de ICMS-Importação aplicável? Nenhuma dessas
respostas é técnica, e nenhuma delas está na pesquisa normativa — as datas
de vencimento **não foram confirmadas em fonte oficial** nesta rodada e não
devem ser assumidas.

---

## UC-20: Gerenciar BOM do Produto (Engenharia)

**Ator:** Engenheiro de Produto
**Pre-condicoes:** Produto final e componentes cadastrados
**Fluxo Principal:**
1. Usuario acessa "Engenharia > BOM"
2. Seleciona produto final
3. Adiciona componentes com quantidade por produto
4. Define nivel hierarquico (0 = produto, 1 = subconjunto, 2 = componente)
5. Define roteiro de fabricacao (operacoes, tempos, maquinas)
6. Sistema salva versao da BOM

### Fonte única da estrutura (gap G1, 2026-08-10) `[IMPLEMENTADO]`

Até esta data o ERP tinha **duas** estruturas de produto paralelas e o
usuário podia cadastrar em qualquer uma das duas, sem saber que a outra
existia:

- `item_estruturas` (mestre `items`, UUID) — lida **só pelo MRP** e pela
  explosão de item
- `bill_of_materials` (mestre `products`, INTEGER) — lida pela criação,
  liberação (reserva), **consumo e custeio** da OP

Ou seja: dava para o planejamento comprar contra uma árvore e o chão de
fábrica consumir contra outra, e **ninguém percebia**. A ponte entre as duas
era casamento de string (`products.code = items.codigo`), nunca exercida
para estrutura.

**A partir do G1, `bill_of_materials` é a fonte única.** O MRP e a explosão
de item passaram a ler a **mesma** BOM ativa que a produção consome,
projetada para UUID em tempo de leitura
(`server/src/services/bomStructureProjection.ts`) — sem cópia de dado, sem
réplica para dessincronizar. Racional da escolha em `docs/producao/06-BOM.md`
§G1 (resumo: é a estrutura que governa dinheiro e estoque, sua chave é a que
o resto do sistema usa, e `items.estoque_atual` é zero em 100% das linhas).

**Efeito no fluxo deste UC:** o passo 3 vale **apenas** pelo módulo de BOM
(`POST /api/engineering/bom`, tela *Produção > Estrutura de produto*).
O caminho antigo `POST /api/items/:id/estrutura` (aba de estrutura na ficha
do item) passa a responder **422 `G1-ESTRUTURA-DUPLA`** apontando para o
módulo correto — recusar é melhor que aceitar: antes o usuário cadastrava a
árvore, recebia 201, e a produção seguia sem enxergar nada.

### Controle de alteração de engenharia (ISO 9001 §8.5.6) `[IMPLEMENTADO]`

Mesmo ciclo do roteiro de manufatura (UC de roteiro, gap G5):

| Situação | Resposta | Código |
|---|---|---|
| Alterar `revision`/`notes` de BOM vigente | 422 — crie uma revisão nova | `G1-BOM-ATIVA-IMUTAVEL` |
| Alterar ou reativar BOM já substituída | 422 — ela sustenta o que as OPs consumiram | `G1-BOM-SUPERSEDED-IMUTAVEL` |
| Voltar BOM vigente para rascunho | 422 — de vigente só para `inactive`/`superseded` | `G1-BOM-STATUS-INVALIDO` |
| Repetir rótulo de revisão do produto | 409 — sem rótulo único não dá para dizer contra qual versão a OP rodou | `G1-BOM-REV-DUP` |
| Produto como componente de si mesmo | 422 — ciclo | `G1-BOM-AUTO-REF` |

Ativar uma revisão **rebaixa a anterior para `superseded` na mesma
transação**, com os componentes intactos. Nunca duas vigentes (índice único
parcial `uq_bill_of_materials_active_per_product`), nunca zero.

⚠️ **Decisão de negócio ainda em aberto:** não existe coluna ligando a OP à
revisão de BOM que ela executou (`production_orders` não tem `bom_id`) — a
conclusão explode a revisão **vigente no momento da conclusão**. Se a
engenharia revisar a estrutura no meio de uma OP aberta, ela é consumida e
custeada pela revisão nova. Mesmo gap que o G5 registrou para roteiro.
Registrado em `docs/governance/TODO.md`.

**Testes:** `server/tests/unit/bom-single-source-g1.test.ts` (15 casos),
`bom-engineering-change-control-g1.test.ts` (10), `bom-create-revision-rules-g1.test.ts`
(6) — inclusive o teste de que **planejamento e consumo leem a mesma
estrutura**; todo teste de erro afirma `details.rule`.

---

## UC-21: Calcular Custo Industrial

**Ator:** Controller / Analista de Custos
**Pre-condicoes:** BOM definida, roteiro definido, precos atualizados
**Fluxo Principal:**
1. Usuario acessa "Custos > Custo Padrao"
2. Sistema calcula:
   - Custo MP = soma (componente x quantidade x preco)
   - Custo MOD = soma (tempo operacao x custo hora)
   - CIF = rateio por centro de custo
3. Sistema exibe custo fabril total
4. Usuario define margem de lucro
5. Sistema calcula preco de venda sugerido
6. Usuario aprova versao do custo padrao

---

## UC-22: Gerenciar Catálogo Item × Fornecedor

**Ator:** Comprador, Administrador
**Pré-condições:** Item e fornecedor cadastrados
**Fluxo Principal:**
1. Usuário acessa "Item > Fornecedores" (`GET /api/items/:id/suppliers`)
2. Adiciona um vínculo informando fornecedor, preço de referência, prazo de
   entrega, MOQ e código do item no catálogo do fornecedor
   (`POST /api/items/:id/suppliers`)
3. Sistema valida que item e fornecedor existem
4. Sistema valida que o vínculo item-fornecedor ainda não existe
5. Se o vínculo for marcado como `preferred`, sistema zera o `preferred`
   dos demais vínculos ativos do mesmo item (transação)
6. Sistema salva o vínculo
7. Usuário pode atualizar (`PUT .../suppliers/:linkId`) ou desativar
   (`DELETE .../suppliers/:linkId`, soft delete via `active=false`)
8. Usuário consulta o histórico agregado de compras do item por fornecedor
   (`GET /api/items/:id/purchase-history`)
9. Usuário consulta os itens vinculados a um fornecedor
   (`GET /api/suppliers/:id/items`)

**Fluxo Alternativo (vínculo duplicado):**
- Sistema retorna 409 CONFLICT se já existir vínculo para o mesmo par
  item/fornecedor

**Fluxo Alternativo (item ou fornecedor inexistente):**
- Sistema retorna 404 NOT_FOUND

**Regras de Negócio:**
- No máximo um fornecedor `preferred=true` por item
- Vínculo é único por par `(item_id, supplier_id)`
- Desativação é soft delete (`active=false`); não remove o registro
  histórico

---

## UC-23: Workflow de Aprovação da Requisição de Compra

**Ator:** Solicitante, Administrador (aprovação)
**Pré-condições:** Requisição de compra criada (`draft` ou `pending`)
**Fluxo Principal:**
1. Usuário altera o status da requisição
   (`PATCH /api/purchase-requisitions/:id/status`)
2. Sistema valida a transição solicitada contra a máquina de estados:
   - `draft` → `pending` ou `canceled`
   - `pending` → `approved` ou `canceled`
3. Se a transição for para `approved`, sistema exige perfil `admin` e
   registra `approved_by` (usuário logado) e `approval_date` (data atual)
4. Sistema salva a requisição com o novo status
5. Sistema registra log de auditoria (`logAction`)

**Fluxo Alternativo (transição inválida):**
- Sistema retorna 422 BUSINESS_RULE_VIOLATION (ex.: `draft` → `approved`
  diretamente, ou `approved` → `pending`)

**Fluxo Alternativo (aprovação sem permissão):**
- Sistema retorna 403 FORBIDDEN se o usuário não for `admin` e tentar
  aprovar (`status=approved`)

**Fluxo Alternativo (requisição inexistente):**
- Sistema retorna 404 NOT_FOUND

**Regras de Negócio:**
- Aprovação (`approved`) só pode ser realizada por usuário com perfil
  `admin`
- `approved_by` e `approval_date` nunca são informados pelo cliente da API
  (sempre derivados do usuário autenticado e da data do servidor)
- **Os estados `ordered`, `partial` e `received` NÃO são alcançáveis por este
  endpoint** — são fatos derivados de outros módulos (gap G15, 2026-08-09).
  Marcá-los à mão seria um jeito de declarar "requisição atendida" sem nada
  ter chegado ao estoque:

| Status | Quem grava | Significado |
|---|---|---|
| `ordered` | conversão em pedido (UC-25) ou adjudicação de RFQ | todo o saldo requisitado virou pedido |
| `partial` | recebimento do pedido de compra (`POST /api/purchases/:id/receive`) | parte do que foi requisitado já chegou |
| `received` | recebimento do pedido de compra | requisição **atendida** — tudo chegou |

**Corrigido em 2026-08-09 (gap G15):** `partial` e `received` eram estados
**mortos** — existiam no ENUM `purchase_requisitions.status` e nenhuma rotina
os atingia. A requisição morria em `ordered` e ninguém conseguia responder
"esta requisição foi atendida?", deixando aberto o elo final do rastro
requisição → pedido → recebimento → estoque (rastreabilidade 100%,
`CLAUDE.md` §7). Optou-se por **acionar** os estados, não removê-los do ENUM:
a pergunta é requisito de auditoria fiscal, não enfeite.

Regra de decisão (recálculo **total** a cada recebimento, nunca incremental —
`modules/purchases/application/services/syncRequisitionReceiptStatus.ts`):
- `received` ⇔ todos os pedidos ativos gerados pela requisição estão
  `received` **e** nenhum item da requisição ficou com saldo `pending`;
- `partial` ⇔ já chegou algo, mas não tudo;
- pedidos `canceled` são ignorados (senão a requisição nunca fecharia);
- requisição ainda `approved` (com saldo de compra em aberto) **não é
  tocada**: `approved` é o estado que autoriza cotar/converter o restante, e
  empurrá-la para `partial` deixaria o saldo remanescente impossível de
  comprar. Quando o último saldo vira pedido ela passa a `ordered`, e o
  recebimento desse pedido fecha em `received` normalmente.

---

## UC-24: Conversão de Ordens Planejadas do MRP em Requisição de Compra

**Ator:** Planejador de PCP (`admin`, `operator`)
**Pré-condições:** Ordens planejadas existentes com status `RASCUNHO` ou
`APROVADA` (geradas via `POST /api/mrp/plan`)
**Fluxo Principal:**
1. Usuário seleciona um lote de ordens planejadas (1 a 100) e envia
   `POST /api/mrp/planned-orders/convert` com `planned_order_ids` (array de
   UUID) e `notes` opcional
2. Sistema abre uma transação e carrega as ordens planejadas por id com
   lock pessimista (`SELECT ... FOR UPDATE`), para evitar conversão
   concorrente da mesma ordem
3. Sistema valida que todas as ordens existem e estão em status `RASCUNHO`
   ou `APROVADA`
4. Sistema cria **uma única** Requisição de Compra (`origin='mrp'`,
   `status='pending'`, `priority='normal'`, `requester_id` = usuário
   logado, `notes` = texto informado ou `"Gerada automaticamente do plano
   MRP"`)
5. Para cada ordem planejada, sistema cria um item de requisição
   (`item_id`, `quantity` = `quantidade_planejada`, `required_date` =
   `data_necessidade`) e busca o fornecedor preferencial ativo do item em
   `item_suppliers` (`preferred=true`, `active=true`); se existir, sugere
   `suggested_supplier_id` e `unit_price_estimated` (preço de referência do
   vínculo)
6. Sistema atualiza o status de todas as ordens planejadas convertidas para
   `EM_EXECUCAO`
7. Sistema confirma a transação (`commit`) e retorna a requisição completa
   (com itens) e a lista de ids convertidos
8. Sistema registra log de auditoria (`logAction`, ação
   `convert_to_requisition`)

**Fluxo Alternativo (ordem inexistente):**
- Sistema faz `rollback` e retorna 404 NOT_FOUND citando os ids não
  encontrados

**Fluxo Alternativo (status inválido):**
- Sistema faz `rollback` e retorna 422 BUSINESS_RULE_VIOLATION citando os
  ids em status diferente de `RASCUNHO`/`APROVADA` (ex.: já `EM_EXECUCAO`,
  `CONCLUIDA` ou `CANCELADA`)

**Regras de Negócio:**
- Toda a operação (lock das ordens, criação da requisição e itens,
  atualização de status) ocorre em uma única transação Sequelize
  (`commit`/`rollback`)
- Sugestão de fornecedor é best-effort: ordem sem fornecedor preferencial
  cadastrado gera item de requisição com `suggested_supplier_id=null` e
  `unit_price_estimated=null` (comprador decide manualmente)
- `requester_id` nunca é informado pelo cliente da API (sempre derivado do
  usuário autenticado via JWT)
- Fecha o ciclo de rastreabilidade: MRP (ordem planejada) → Requisição de
  Compra → Pedido de Compra → Recebimento → Estoque

---

## UC-24b: Fechamento Automático do Ciclo MRP → Requisição (opt-in por item)

**Ator:** Sistema (disparado dentro de `POST /api/mrp/plan`, sem ação extra
do planejador)
**Pré-condições:** Item com `items.conversao_automatica = true`
**Decisão de design (roadmap pós-Go-Live item 3,
`docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` seção 3):** dado que o projeto tem
cultura forte de rastreabilidade/auditoria, comprar automaticamente **sem
nenhuma revisão humana para qualquer item** foi descartado por risco de
negócio. O trigger automático é um **opt-in explícito por item**
(`items.conversao_automatica`, migration
`20260804-000010-add-mrp-auto-convert-to-items.cjs`, default `false`):
apenas ordens planejadas de itens marcados são convertidas sozinhas; todos
os demais itens continuam exigindo a conversão manual do UC-24. Não foi
criado nenhum job/cron novo — o gatilho é o próprio fluxo síncrono já
existente de geração/atualização do plano MRP (`GenerateMrpPlanUseCase`),
coerente com a decisão arquitetural "MRP roda contra estoque real, a cada
evento relevante, não em batch agendado" (`CLAUDE.md` §7).

**Fluxo Principal:**
1. Usuário (planejador ou qualquer chamador autenticado) roda `POST
   /api/mrp/plan` normalmente (UC de geração de plano)
2. Sistema persiste as ordens planejadas do plano (mesma transação de
   sempre)
3. Dentro da MESMA transação, sistema filtra as ordens recém-persistidas
   com status `RASCUNHO`/`APROVADA` cujo `item_id` tem
   `conversao_automatica = true`
4. Para as ordens elegíveis, sistema cria **uma única** Requisição de
   Compra (`origin='mrp_auto'` — distinto de `'mrp'` do UC-24 manual —,
   `requester_id` = usuário que disparou `POST /api/mrp/plan`, mesma regra
   de sugestão de fornecedor preferencial do UC-24) e marca as ordens
   convertidas como `EM_EXECUCAO`
5. Sistema confirma a transação e registra log de auditoria (`logAction`,
   ação `mrp_auto_convert_to_requisition`)
6. Ordens de itens sem a flag permanecem `RASCUNHO`/`APROVADA`, aguardando
   o planejador rodar o UC-24 manualmente, como hoje

**Regras de Negócio:**
- `origin='mrp_auto'` (nunca `'mrp'`) identifica, na própria requisição,
  que nenhuma ordem individual foi revisada por um humano antes da compra
  — auditoria consegue distinguir os dois fluxos
- Sem `requester_id` (ex.: chamador futuro não autenticado), a
  auto-conversão é pulada (no-op) — nunca viola o `NOT NULL` de
  `purchase_requisitions.requester_id` nem inventa um usuário "sistema"
- Reaproveita a mesma lógica de sugestão de fornecedor preferencial e
  criação de itens de requisição do UC-24 (helper compartilhado
  `createRequisitionFromPlannedOrders`), sem duplicar regra de negócio
- Ativação da flag por item é responsabilidade do planejador/comprador no
  cadastro do item; **risco residual**: hoje não existe endpoint HTTP
  público para editar `Item` (só `POST /api/items`, `.../estrutura`,
  `.../inactivate`, `.../suppliers`) nem tela para ligar/desligar a flag —
  a ativação só é possível hoje via banco/seed direto. Endpoint
  `PATCH /api/items/:id` + UI de edição do item ficam como próximo passo
  (fora do escopo desta entrega, que ficou restrita a `modules/mrp/**` e
  `models/Item*.ts`)

---

## UC-25: Conversão de Requisição de Compra Aprovada em Pedido(s) de Compra

**Ator:** Comprador (`admin`, `operator`)
**Pré-condições:** Requisição de compra existente com `status='approved'`
(ver UC-23)
**Fluxo Principal:**
1. Usuário envia `POST /api/purchase-requisitions/:id/convert` com
   `fallback_supplier_id` opcional (fornecedor a usar quando um item não
   tiver fornecedor resolvível) e `notes` opcional
2. Sistema abre uma transação e carrega a requisição com seus itens com
   lock pessimista (`SELECT ... FOR UPDATE`), para evitar conversão
   concorrente da mesma requisição
3. Sistema valida que a requisição existe e está em `status='approved'`
3b. Sistema seleciona **apenas os itens com saldo**
   (`purchase_requisition_items.status = 'pending'`). Itens já pedidos pela
   adjudicação de uma cotação (UC-25b, `POST /api/rfqs/:id/award`) ou
   cancelados são ignorados; se nenhum item tiver saldo, 422
   BUSINESS_RULE_VIOLATION. *(Gap G12, 2026-08-09: sem este filtro, os mesmos
   itens viravam dois pedidos de compra — um por este caminho, outro pela
   adjudicação da cotação.)*
4. Para cada item **com saldo**, sistema resolve o fornecedor nesta ordem
   de prioridade: (1) `suggested_supplier_id` do item; (2) fornecedor
   preferencial ativo em `item_suppliers` (`preferred=true`,
   `active=true`); (3) `fallback_supplier_id` do body
5. Para cada item, sistema resolve o `product_id` legado (tabela
   `products`) correspondente ao `Item` (modelo canônico) da requisição,
   casando `products.code = items.codigo`
6. Sistema agrupa os itens por fornecedor resolvido e cria **um Pedido de
   Compra (`purchase_orders`) por fornecedor**, com `requisition_id`
   apontando para a requisição de origem, `requester_id` = usuário logado,
   `status='pending'`, `order_number` gerado pelo mesmo helper usado na
   criação manual de pedidos (`generatePurchaseOrderNumber`)
7. Para cada item do pedido, `unit_price` é resolvido nesta ordem: preço do
   vínculo `item_suppliers` para o fornecedor daquele pedido → 
   `unit_price_estimated` do item da requisição → `0`
8. Sistema atualiza os itens convertidos para `status='ordered'`; como todos
   os itens com saldo são convertidos neste fluxo (item sem fornecedor
   derruba a operação inteira), não sobra pendência e a requisição também
   vai para `status='ordered'`
9. Sistema confirma a transação (`commit`) e retorna os pedidos de compra
   criados (com itens), o `requisition_id` e o novo `requisition_status`
10. Sistema registra log de auditoria (`logAction`, ação `convert`)

**Fluxo Alternativo (requisição inexistente):**
- Sistema faz `rollback` e retorna 404 NOT_FOUND

**Fluxo Alternativo (requisição não aprovada):**
- Sistema faz `rollback` e retorna 422 BUSINESS_RULE_VIOLATION citando o
  `status` atual (ex.: `draft`, `pending`, `ordered`, `canceled`)

**Fluxo Alternativo (item sem fornecedor resolvível):**
- Sistema faz `rollback` e retorna 422 BUSINESS_RULE_VIOLATION listando os
  `item_id` (dos itens de requisição) sem fornecedor sugerido, preferencial
  ou fallback

**Fluxo Alternativo (item sem produto legado correspondente):**
- Sistema faz `rollback` e retorna 422 BUSINESS_RULE_VIOLATION listando os
  `codigo` de `Item` sem `Product` correspondente em `products.code`,
  orientando a cadastrar o produto correspondente

**Regras de Negócio:**
- Toda a operação (lock da requisição e itens, resolução de fornecedor e
  produto, criação dos pedidos e itens, atualização de status) ocorre em
  uma única transação Sequelize (`commit`/`rollback`)
- `order_number` reutiliza exatamente o mesmo formato/gerador do use case
  de criação manual de pedidos (`CreatePurchaseUseCase` /
  `generatePurchaseOrderNumber`); quando mais de um pedido é criado na
  mesma conversão, um sufixo sequencial (`-1`, `-2`, ...) evita colisão de
  `order_number` únicos gerados no mesmo instante
- `requester_id` dos pedidos criados nunca é informado pelo cliente da API
  (sempre derivado do usuário autenticado via JWT)
- Fecha o ciclo de rastreabilidade: Requisição de Compra (aprovada) →
  Pedido(s) de Compra → Recebimento → Estoque

---

## UC-26: Relatório de Variação de Custo

**Ator:** Controller / Analista de Custos
**Endpoint:** `GET /api/reports/cost-variance?start_date&end_date` (autenticado)
**Pré-condições:** Existem lançamentos em `product_cost_ledgers` e/ou
pedidos de compra no período consultado
**Fluxo Principal:**
1. Usuário acessa "Relatórios > Variação de Custo" informando
   `start_date`/`end_date` (formato `YYYY-MM-DD`); se omitido, sistema usa
   período default dos últimos 30 dias (`resolveReportPeriod`)
2. Sistema calcula, por produto com lançamento de custo real no período:
   - `standard_cost`: `items.custo_padrao` do item cujo `codigo` casa com
     `products.code` (join dual-schema, `LEFT JOIN` pois nem todo produto
     tem item correspondente); fallback `products.cost_price` quando não há
     item
   - `avg_real_cost`: média ponderada por quantidade dos lançamentos de
     `product_cost_ledgers` no período (`SUM(quantity * unit_cost) / SUM(quantity)`)
   - `variance_abs` = `avg_real_cost - standard_cost`;
     `variance_rate` = `variance_abs / standard_cost` (protegida contra
     divisão por zero via `safeRate`; retorna `0` quando `standard_cost = 0`)
3. Sistema ordena `by_product` por `|variance_rate|` decrescente (maiores
   desvios primeiro)
4. Sistema calcula, por par produto × fornecedor com compras no período
   (`purchase_order_items`/`purchase_orders`, pedidos não cancelados):
   - `catalog_price`: `item_suppliers.unit_price` do vínculo item×fornecedor
     (`null` quando não há catálogo cadastrado para o par)
   - `avg_paid_price`: média ponderada por quantidade de
     `purchase_order_items.unit_price` no período
   - `variance_abs`/`variance_rate` vs `catalog_price`; ambos `null` quando
     `catalog_price` é `null` (sem base de comparação)
5. Sistema retorna `totals.products_with_variance` (produtos com
   `|variance_rate| > 0.05`, ou seja, desvio acima de 5%) e
   `totals.avg_variance_rate` (variação média ponderada por quantidade)

**Fluxo Alternativo (sem lançamentos no período):**
- `by_product` e `purchase_price_variance` retornam `[]`;
  `totals.products_with_variance = 0` e `totals.avg_variance_rate = 0`
  (sem erro)

**Regras de Negócio:**
- Somente produtos com lançamento de custo real no período aparecem em
  `by_product`; somente pares produto×fornecedor com compras no período
  aparecem em `purchase_price_variance`
- Toda divisão usa `safeRate` (nunca retorna `NaN`/`Infinity`)
- Relatório é somente leitura (sem escrita em `product_cost_ledgers`,
  `items` ou `products`)

---

## Atores Industriais (Adicionais)

| Ator | Descricao |
|------|-----------|
| **Supervisor de PCP** | Cria e gerencia ordens de producao, programa maquinas |
| **Operador de Producao** | Aponta producao realizada no chao de fabrica |
| **Almoxarife** | Controla estoque de insumos e produto acabado |
| **Comprador** | Realiza cotacoes e emite pedidos de compra |
| **Inspetor de Qualidade** | Realiza inspecoes e registra nao conformidades |
| **Engenheiro de Produto** | Gerencia BOM, desenhos e especificacoes tecnicas |
| **Controller** | Apura custos industriais e analisa variacoes |
| **Supervisor de Manutencao** | Gerencia ordens de servico de manutencao |
| **Analista de Comex** | Gerencia processos de importacao |
| **Diretor Industrial** | Aprova custos padrao e investimentos |

---

## UC-ENG-01: Gerenciar Projeto de Engenharia (P&D)

**Ator:** Engenheiro de Produto, Administrador
**Pré-condições:** Usuário autenticado com papel `admin` ou `operator`
**Endpoints:** `GET/POST /api/engineering/projects`, `GET/PUT /api/engineering/projects/:id`

**Fluxo Principal:**
1. Usuário informa `project_code` (único, 1-20 caracteres), `name`, `project_type`
   (`new_product`, `improvement`, `customization`, `research`), e opcionalmente
   `product_id`, `project_manager_id`, datas, `budget` e `priority`
   (`low`/`normal`/`high`/`critical`)
2. Sistema valida unicidade de `project_code`
3. Sistema cria o projeto com `stage = 'concept'` e `status = 'active'` (defaults)
4. Em atualizações (`PUT`), o usuário pode avançar `stage` (`concept → design →
   prototype → testing → homologation → production`), alterar `status`
   (`active/paused/completed/canceled`) e registrar `actual_cost` e
   `completion_date`

**Fluxo Alternativo (código duplicado):**
- Sistema retorna 409 (`ConflictError`) informando o `project_code` já existente

**Pós-condição:** Projeto de P&D criado/atualizado, rastreável até o produto
resultante (`product_id`) quando aplicável

---

## UC-ENG-02: Gerenciar Desenho Técnico (CAD)

**Ator:** Engenheiro de Produto, Administrador
**Pré-condições:** Usuário autenticado
**Endpoints:** `GET/POST /api/engineering/drawings`, `PUT /api/engineering/drawings/:id`,
`POST /api/engineering/drawings/:id/release`, `POST /api/engineering/drawings/:id/obsolete`

**Fluxo Principal:**
1. Usuário informa `product_id`, `drawing_number`, `title`, `drawing_type`
   (`assembly`/`detail`/`exploded`/`schematic`/`bom`) e opcionalmente `revision`
   (default `'00'`), `file_path`, `material_spec`, `dimensions`, `tolerances`
2. Sistema valida unicidade da combinação `drawing_number` + `revision`
3. Sistema cria o desenho com `status = 'draft'`
4. Administrador libera o desenho (`POST /:id/release`): transição
   `draft → released`, gravando `approved_by` (usuário autenticado) e
   `approval_date` (data corrente)
5. Administrador torna o desenho obsoleto (`POST /:id/obsolete`) quando uma
   nova revisão substitui a anterior: transição `released → obsolete`

**Fluxo Alternativo (transição de status inválida):**
- Sistema retorna 422 (`BusinessRuleError`) se tentar liberar um desenho que
  não está em `draft`, ou tornar obsoleto um desenho que não está em `released`

**Fluxo Alternativo (número+revisão duplicados):**
- Sistema retorna 409 (`ConflictError`)

**Pós-condição:** Desenho técnico com ciclo de vida controlado
(`draft → released → obsolete/canceled`), rastreável ao produto e ao aprovador

---

## UC-ENG-03: Consultar/Atualizar Ficha Técnica Thiele-Small do Item

**Ator:** Engenheiro de Produto, Administrador
**Pré-condições:** Usuário autenticado; item (`Item`, UUID) previamente cadastrado
**Endpoints:** `GET/PUT /api/engineering/items/:itemId/technical-spec`

**Fluxo Principal:**
1. Usuário consulta a ficha técnica de um item (`GET`); sistema retorna `data:
   null` se o item existe mas ainda não possui especificação cadastrada
2. Usuário realiza upsert da ficha técnica (`PUT`) informando os parâmetros
   Thiele-Small opcionais (`fs_hz`, `qms`, `qes`, `qts`, `vas_l`, `sd_cm2`,
   `xmax_mm`, `re_ohms`, `le_mh`, `bl_tm`, `mms_g`, `cms_mm_n`, `spl_db`) dentro
   de `atributos` (JSONB), e opcionalmente `familia_tecnica`
3. Sistema cria a especificação se não existir, ou atualiza a existente
   (preservando `familia_tecnica` anterior se não informada no payload)

**Fluxo Alternativo (item inexistente):**
- Sistema retorna 404 (`NotFoundError`) em ambos os endpoints

**Pós-condição:** `ItemEspecificacaoTecnica` (1:1 opcional com `Item`) criada
ou atualizada, usada por engenharia/qualidade para validar testes acústicos

---

## UC-LAB-01: Registrar Teste de Laboratório (Acústico / Thiele-Small)

**Ator:** Inspetor de Qualidade, Engenheiro de Produto, Administrador
**Pré-condições:** Usuário autenticado com papel `admin` ou `operator`
**Endpoint:** `POST /api/laboratory/tests`

**Fluxo Principal:**
1. Usuário informa `product_id`, `test_type` (`impedance`, `frequency_response`,
   `thd`, `power_rms`, `power_peak`, `life`, `polarity`, `noise`,
   `thiele_small`), e opcionalmente `serial_number`, `lot_number`,
   `production_order_id`, `parameters`, `result`, `unit`, `specification_min`,
   `specification_max`, `curve_data`, `notes`
2. Sistema calcula `passed` automaticamente: `true` quando `result` foi
   informado e está dentro de `[specification_min, specification_max]`
   (comparação parcial se apenas um dos limites for informado)
3. Sistema grava `tester_id` como o usuário autenticado (nunca aceito do
   corpo da requisição)
4. Se `passed = false`, o sistema **sempre** cria uma Não-Conformidade
   (reaproveitando `CreateNonConformityUseCase` do módulo de qualidade:
   `origin = 'final'`, `defect_type = 'acoustic'`, `severity = 'major'`,
   descrição automática com teste/medido/faixa, `product_id`, `lot_number`) e
   grava `non_conformity_id` no teste. Quando o `lot_number` informado
   corresponde a um lote existente (`LotControl`), a RNC bloqueia
   automaticamente esse lote (regra já existente no módulo de qualidade, sem
   duplicação de lógica); quando **não** bloqueia lote nenhum, a RNC nasce com
   um aviso explícito em `notes` (ver UC de não conformidade, gap G10).
   > **Mudança 2026-08-09 (gap G8):** até essa data a abertura da RNC dependia
   > de `create_rnc_on_fail = true` no payload — reprovação era opcional e, por
   > omissão de quem chamava a API, morria sem tratativa e sem bloqueio de
   > lote. O campo continua sendo aceito pelo endpoint (schema `strict`, para
   > não quebrar o payload da tela atual) mas é **ignorado**.

**Fluxo Alternativo (sem dado suficiente para aprovação):**
- Sistema retorna 422 (`ValidationError`) se `result` não foi informado e
  nenhum limite de especificação (`specification_min`/`specification_max`)
  foi informado — não há como determinar `passed`

**Pós-condição:** Resultado de teste registrado (`AcousticTestResult`),
com bloqueio de lote acionado quando aplicável

---

## UC-LAB-02: Consultar Testes de Laboratório

**Ator:** Inspetor de Qualidade, Engenheiro de Produto, Administrador,
Controller
**Pré-condições:** Usuário autenticado
**Endpoints:** `GET /api/laboratory/tests`, `GET /api/laboratory/tests/summary`

**Fluxo Principal (listagem):**
1. Usuário filtra por `product_id`, `test_type`, `passed`, `serial_number`,
   `start_date`/`end_date`, com paginação (`page`/`limit`)
2. Sistema retorna testes com `product` (`id`, `name`, `code`) e `tester`
   (`id`, `name`) incluídos

**Fluxo Principal (resumo agregado):**
1. Usuário informa `days` (default 30) e opcionalmente `product_id`
2. Sistema agrega, por `test_type`, o total de testes, aprovados, reprovados
   e taxa de aprovação (`pass_rate`) no período, via SQL parametrizado

**Pós-condição:** Nenhuma (operações somente leitura)

---

## UC-27: Expedir Venda Faturada (Status `shipped`)

**Ator:** Operador, Administrador
**Pré-condições:** Venda existente com status `invoiced` (NF-e emitida)
**Endpoint:** `PUT /api/sales/:id/status` (`{ "status": "shipped" }`)

**Fluxo Principal:**
1. Usuário aciona a expedição de uma venda já faturada
2. Sistema valida a transição de status através de
   `ChangeSaleStatusUseCase.VALID_TRANSITIONS` (single source of truth)
3. Sistema confirma que a venda está em `invoiced` (única origem permitida
   para `shipped`)
4. Sistema atualiza `sales.status` para `shipped`, dentro de transação
5. Sistema registra auditoria (`logAction`) com `oldValues`/`newValues` de
   status

**Fluxo Alternativo (origem inválida):**
- Se a venda não estiver em `invoiced` (ex.: `quote`, `confirmed`), sistema
  retorna 422 (`BusinessRuleError`) informando as transições permitidas a
  partir do status atual

**Fluxo Alternativo (cancelamento de venda já expedida):**
- `PUT /api/sales/:id/status` com `{ "status": "canceled" }` em uma venda
  `shipped` retorna 422 (`BusinessRuleError`) com mensagem dedicada: "Venda
  já foi expedida (status shipped) e não pode ser cancelada."

**Regras de Negócio:**
- `shipped` é terminal: nenhuma transição sai dele (nem para `canceled`,
  nem para qualquer outro status) — mercadoria já saiu para o cliente
- Única transição de entrada permitida: `invoiced -> shipped`
- Não debita estoque nem gera/altera `AccountReceivable`. **Atualizado pelo
  G9 (2026-08-10):** a baixa de estoque ocorre na **autorização da NF-e**
  (não mais em `quote -> confirmed`), e como `shipped` exige a venda
  totalmente `invoiced`, quando o embarque acontece o estoque já saiu e a
  reserva da venda já foi integralmente consumida. **Atualizado pelo G13
  (2026-08-10):** `AccountReceivable` também passou a nascer na autorização
  da NF-e (não mais na confirmação do pedido), então no embarque as
  parcelas já existem e nada mais é criado aqui

**Pós-condição:** Venda com `status = 'shipped'`, imutável a partir daí

---

## UC-28: Consultar Cockpit de Compras

**Ator:** Comprador, Administrador, Gerente de Suprimentos
**Pré-condições:** Usuário autenticado
**Endpoint:** `GET /api/purchases/cockpit`

**Fluxo Principal:**
1. Usuário acessa o painel de suprimentos
2. Sistema calcula, via SQL raw parametrizado:
   - `pending_requisitions`: quantidade de `purchase_requisitions` com
     `status = 'pending'`
   - `open_orders`: quantidade e valor total (`total_amount`) de
     `purchase_orders` com `status` em
     `pending`/`approved`/`sent`/`partial`
   - `arriving_this_week`: quantidade de pedidos com `expected_date` entre
     hoje e hoje+7 dias e `status` em `sent`/`approved`/`partial`
   - `overdue`: quantidade de pedidos com `expected_date` vencida (`<`
     hoje), sem `delivery_date` registrada, e `status` fora de
     `received`/`canceled`
3. Sistema retorna `{ success: true, data: { pending_requisitions,
   open_orders: { count, total_amount }, arriving_this_week, overdue } }`

**Regras de Negócio:**
- Rota somente leitura, sem paginação
- Registrada em `/api/purchases/cockpit`, antes de `/api/purchases/:id`
  para não ser capturada pela rota parametrizada

**Pós-condição:** Nenhuma (operação somente leitura)

---

## UC-29: Consultar Projeção de Fluxo de Caixa

**Ator:** Financeiro, Administrador
**Pré-condições:** Usuário autenticado com papel `admin` ou `financial`
**Endpoint:** `GET /api/finance/cash-flow-projection?days=30`

**Fluxo Principal:**
1. Usuário informa `days` (opcional, 7 a 90, default 30)
2. Sistema busca os títulos EM ABERTO (`accounts_receivable` e
   `accounts_payable` com `payment_date IS NULL` e `status != 'canceled'`)
   com vencimento entre hoje e hoje+`days`, via SQL raw parametrizado
3. Sistema agrupa os valores por semana (segunda a domingo), calculando
   `receivable`, `payable`, `net` e `cumulative_net` (saldo acumulado
   semana a semana) por bucket
4. Sistema soma, à parte, os títulos vencidos e não pagos
   (`due_date < hoje`) nos campos `totals.overdue_receivable` /
   `totals.overdue_payable`
5. Sistema retorna `{ success: true, data: { horizon_days, totals:
   { receivable, payable, net, overdue_receivable, overdue_payable },
   due_next_7_days: { receivable, payable }, weeks: [{ week_start,
   week_end, receivable, payable, net, cumulative_net }] } }`

**Fluxo Alternativo (parâmetro inválido):**
- `days` fora do intervalo 7–90 retorna 400 (`ValidationError`, Zod
  `.strict()`)

**Regras de Negócio:**
- Apenas `admin`/`financial` podem acessar (`authorize('admin',
  'financial')`)
- Vencidos não pagos entram apenas no bucket `overdue` de `totals`, nunca
  nas semanas do horizonte futuro
- `cumulative_net` é estritamente acumulativo (soma do `net` de todas as
  semanas anteriores + a atual)

**Pós-condição:** Nenhuma (operação somente leitura)

---

## UC-30: Criar Perfil de Acesso (Área/Departamento)

**Ator:** Administrador Global
**Pré-condições:** Usuário autenticado com papel JWT `admin`
**Endpoint:** `POST /api/access-profiles`

**Fluxo Principal:**
1. Administrador informa `nome`, `descricao` opcional, `allowed_warehouses`
   opcional e a matriz `permissions: [{ module, level }]` (`level` ∈
   `'operate'|'approve'`; ausência de módulo na lista = sem acesso)
2. Sistema valida `module` contra a lista fixa de 26 módulos
   (`server/src/shared/domain/accessModules.ts`, servida também em
   `GET /api/access-profiles/modules`), rejeita módulo duplicado no
   payload e exige ao menos uma permissão
3. Sistema cria o perfil + permissões em uma única transação Sequelize
4. Sistema audita (`logAction`, ação `create`, entidade `AccessProfile`)

**Fluxo Alternativo (nome duplicado):** 409 `CONFLICT`
**Fluxo Alternativo (nenhuma permissão informada / módulo inválido):** 422 `VALIDATION_ERROR`
**Fluxo Alternativo (usuário não é admin):** 403 `FORBIDDEN`

**Regras de Negócio:** ver `docs/business/BUSINESS_RULES.md` §1/§3.

---

## UC-31: Editar Perfil de Acesso

**Ator:** Administrador Global
**Endpoint:** `PUT /api/access-profiles/:id`

**Fluxo Principal:**
1. Administrador altera `nome`/`descricao`/`allowed_warehouses` e/ou
   substitui integralmente a matriz de `permissions`
2. Sistema aplica as mesmas validações do UC-30 (nome único excluindo o
   próprio id, ao menos um módulo)
3. Sistema audita com **valor anterior completo da matriz** (`oldValues`)
   e o novo valor (`newValues`), em uma única transação Sequelize
4. Efeito imediato: a próxima requisição de qualquer usuário atribuído a
   este perfil já reflete a nova matriz (`authorizeModule` consulta o
   banco a cada request, sem cache no JWT)

**Fluxo Alternativo (perfil não existe):** 404 `NOT_FOUND`

**Regras de Negócio:** ver `docs/business/BUSINESS_RULES.md` §5.

---

## UC-32: Desativar (Inativar) Perfil de Acesso

**Ator:** Administrador Global
**Endpoint:** `DELETE /api/access-profiles/:id` (soft delete, `active = false`)

**Fluxo Principal:**
1. Administrador solicita a desativação
2. Sistema conta usuários **ativos** vinculados ao perfil
   (`users.access_profile_id = :id AND users.active = true`)
3. Se `count = 0`: sistema marca `active = false` e audita (`action:
   'deactivate'`)

**Fluxo Alternativo (perfil em uso — DECIDIDO):** 422
`BUSINESS_RULE_VIOLATION`, com `error.details.users` listando `{ id, name,
email }` de cada usuário ativo afetado e `error.details.userCount` — o
admin deve realocar (UC-33) todos antes de tentar novamente.

**Regras de Negócio:** ver `docs/business/BUSINESS_RULES.md` §1.2/UC-32 em `docs/business/01-USE_CASES.md`.

---

## UC-33: Atribuir Perfil de Acesso a Usuário

**Ator:** Administrador Global
**Endpoint:** `PUT /api/users/:id/access-profile` (`{ "access_profile_id": <id>|null }`)

**Fluxo Principal:**
1. Administrador informa o novo `access_profile_id` (ou `null` para
   remover a atribuição) de um usuário existente
2. Sistema valida que o perfil informado existe e está `active = true`
3. Sistema substitui a atribuição anterior (um usuário tem no máximo um
   perfil) e audita com `oldValues`/`newValues` de `accessProfileId`
   (`action: 'assign'`, `entity: 'UserAccessAssignment'`)
4. **UC-36 (decidido):** a troca não invalida a sessão/token já emitidos
   do usuário-alvo — vale a partir do próximo login para fins de menu; a
   API já reflete o novo perfil na próxima requisição (sem cache)

**Fluxo Alternativo (perfil inexistente):** 404 `NOT_FOUND`
**Fluxo Alternativo (perfil inativo):** 422 `BUSINESS_RULE_VIOLATION`

**Regras de Negócio:** ver `docs/business/BUSINESS_RULES.md` §2/§5.

---

## UC-34 (parcial): Menu Resolvido do Usuário Autenticado

**Ator:** Qualquer usuário autenticado
**Endpoint:** `GET /api/auth/me/permissions`

**Fluxo Principal:**
1. Usuário autenticado consulta o endpoint
2. Se `role = admin`: sistema retorna todos os 26 módulos em `'approve'`
3. Se `role != admin`: sistema retorna `req.user.permissions` (mapa
   `module → 'operate'|'approve'`), já resolvido por `authenticate` sem
   query adicional, e `profile: { id, nome } | null`

**Nota de escopo:** este UC cobre apenas o endpoint de dados brutos de
permissão; a renderização do menu lateral no frontend consumindo este
payload é tarefa do Bloco 1.4 (`docs/governance/TODO.md`), ainda pendente.

**Regras de Negócio:** ver `docs/business/BUSINESS_RULES.md` §3, UC-34/UC-35-Exceção em `docs/business/01-USE_CASES.md`.

---

## UC-35 [IMPLEMENTADO]: Tentativa de Acesso a Módulo Fora do Perfil (Tela e API)

**Ator:** Operador de Área, Gestor de Área
**Endpoint:** qualquer rota protegida por `authorizeModule` fora do perfil do usuário

**Fluxo Principal (API):**
1. Usuário (ou script) chama um endpoint de um módulo fora do seu perfil.
2. `authorizeModule` intercepta **antes** de qualquer controller/use case:
   `role = admin`? libera; senão resolve o módulo dono da ação e consulta
   a permissão do `access_profile_id` do usuário para aquele módulo.
3. Se a permissão for inexistente (nível `none`, incluindo o caso de
   usuário sem perfil — UC-35-Exceção), sistema responde `403` **sem
   revelar dados**, para leitura e escrita (GET/POST/PUT/PATCH/DELETE).
4. Tentativa é registrada em log de auditoria (`logAction`, ação
   `access_denied`, fire-and-forget, com `userId`, módulo, método,
   timestamp).

**Fluxo Principal (Tela):**
1. Módulo fora do perfil não aparece no menu (UC-34).
2. Navegação direta por URL é interceptada pelo guard `ModuleRoute`
   (`client/src/routes/ProtectedRoute.tsx`), aplicado a todos os grupos
   de rota de módulo em `client/src/App.tsx`, que renderiza
   `AccessDeniedPage` (`variant="accessDenied"`,
   `client/src/pages/AccessDeniedPage.tsx`) em vez de tentar carregar
   dados do módulo.

**Fluxo Alternativo (nível insuficiente dentro do módulo permitido):**
usuário com nível `operate` tentando uma ação que exige `approve` → `403
APPROVAL_LEVEL_REQUIRED` (mesma fórmula do UC-37).

**Regras de Negócio:** ver `docs/business/BUSINESS_RULES.md` §2/§8, UC-35 em `docs/business/01-USE_CASES.md`.

---

## UC-35-Exceção [IMPLEMENTADO]: Usuário Sem Perfil de Acesso Atribuído

**Ator:** Operador/Gestor de Área sem `access_profile_id` atribuído (ex.:
usuário recém-criado, ou cujo perfil anterior foi desativado)

**Fluxo Principal:**
1. Usuário autentica normalmente — a restrição é de autorização, não de
   autenticação.
2. `authenticate` resolve `req.user.permissions = {}` (sem perfil);
   qualquer chamada a módulo de negócio retorna `403 NO_ACCESS_PROFILE`.
3. Frontend (`AppLayout`) renderiza `AccessDeniedPage variant="noProfile"`
   no `<main>` quando o mapa de permissões vem vazio (usuário não-admin,
   sem perfil, sem falha de rede), com o texto oficial "Seu acesso ainda
   não foi configurado — procure o administrador." — apenas o header
   (trocar senha/sair) permanece acessível, nenhum item de módulo aparece
   no menu.

**Regras de Negócio:** bloqueio total, sem perfil provisório (decisão do
dono, 2026-08-03) — ver `docs/business/BUSINESS_RULES.md`, UC-35-Exceção
em `docs/business/01-USE_CASES.md`.

---

## UC-36 [IMPLEMENTADO]: Troca de Perfil de Usuário Logado (Vale no Próximo Login)

**Ator:** Administrador Global (ação), usuário afetado (impacto)

**Fluxo Principal:**
1. Administrador troca o perfil/nível de um usuário (UC-33,
   `PUT /api/users/:id/access-profile`).
2. Sistema grava a mudança imediatamente no banco — **não** invalida o
   token/sessão já emitidos (nenhum campo `permission_version` foi criado
   nesta entrega, decisão consciente do dono, 2026-08-03).
3. Como `authorizeModule` consulta o perfil do usuário no banco a cada
   requisição (sem cache no payload do JWT), a API já reflete o novo
   perfil na próxima chamada; apenas o **menu renderizado no frontend**
   pode ficar desatualizado (cacheado) até o próximo login — não é uma
   brecha de segurança real, a decisão de autorização de fato sempre roda
   no backend.
4. Mitigação para revogação urgente: desativar o usuário (`active =
   false`) — mecanismo já existente (`server/src/middlewares/auth.ts`,
   checagem `if (!user.active)`) que força `401 — Usuário inativo` na
   próxima requisição, sem esperar logout voluntário ou expiração do
   token.

**Regras de Negócio:** ver `docs/business/BUSINESS_RULES.md`, UC-36 em
`docs/business/01-USE_CASES.md`. `permission_version`/invalidação forçada
de sessão continua registrado como melhoria futura opcional, não
implementada por decisão de escopo.

---

## UC-37 [IMPLEMENTADO]: Ação de Gestor vs Operador Dentro da Área

**Ator:** Operador de Área, Gestor de Área

**Regra central:** uma ação de aprovação só é liberada quando o módulo da
ação está no perfil do usuário com nível `approve` — não existe campo
`access_level` separado no usuário (decisão de arquitetura registrada em
`docs/governance/TODO.md` Bloco 1.2): o "gestor" de uma área é justamente
quem tem `approve` no módulo daquela área; `operate` isolado nunca
autoriza uma ação que exija `approve`.

**Fluxo Principal:**
1. Operador com nível `operate` no módulo executa as ações do dia a dia
   normalmente (ex.: registrar movimentação de estoque).
2. Usuário com `approve` no módulo executa as ações de aprovação/gestão
   daquele módulo (ex.: aprovar requisição, liberar/bloquear lote).
3. Usuário com apenas `operate` tentando uma ação que exige `approve` →
   `403 APPROVAL_LEVEL_REQUIRED`.
4. A permissão avaliada é sempre a do módulo **dono da ação sendo
   executada**, nunca a do módulo que originou o dado — validado
   end-to-end no cenário "Qualidade libera lote criado pelo Recebimento"
   (`server/tests/integration/quality-releases-receiving-lot.test.ts`):
   um lote criado pelo Recebimento só é liberado por quem tem `approve`
   no módulo `qualidade`, não `recebimento`.

**Regras de Negócio:** ver `docs/business/BUSINESS_RULES.md` §4/§8, UC-37
em `docs/business/01-USE_CASES.md`.

---

## UC-38 [IMPLEMENTADO]: Endpoints Compartilhados Entre Áreas (Dashboard, Relatórios, Rastreabilidade)

**Ator:** Todos os perfis operacionais

**Fluxo Principal:**
1. **Dashboard** não aplica bloqueio total — filtra os cards exibidos pela
   interseção entre os cards existentes e os módulos com nível ≠ `none`
   no perfil do usuário (`client/src/pages/DashboardPage.tsx`,
   `canSee`/`hasModuleAccess`, com fallback de segurança que nunca esconde
   cards por falha de infraestrutura).
2. **Relatórios** têm sub-módulo próprio por tipo (`relatorios.producao`,
   `relatorios.compras`, `relatorios.custos`, `relatorios.financeiro`) —
   um relatório cruzado (ex.: variação de custo, UC-26) exige a
   sub-permissão própria, não é herdado de `compras`/`producao`
   isoladamente (`server/src/modules/reports/presentation/routes/reports.ts`).
3. **Rastreabilidade** é módulo próprio (`rastreabilidade`), concedido
   explicitamente — não é herdado de `producao`/`qualidade`/`estoque`
   (`server/src/modules/traceability/presentation/routes/traceability.ts`,
   `authorizeModule('rastreabilidade')` nas 3 rotas).

**Regras de Negócio:** ver `docs/business/BUSINESS_RULES.md`, UC-38 em
`docs/business/01-USE_CASES.md`.

---

> **Nota de consolidação (atualizada 2026-08-06):** UC-30 a UC-38 acima
> cobrem o Bloco 1 completo (middleware `authorizeModule` + CRUD de
> perfis + atribuição + menu dinâmico + telas de acesso negado +
> endpoints compartilhados), com retrofit completo em todos os módulos de
> rota do backend (não mais restrito aos pilotos `laboratory`/
> `engineering` — ver `docs/governance/TODO.md` Bloco 1.2). O texto
> normativo completo (critérios de aceite BDD, tabelas, decisões do dono)
> permanece em `docs/business/01-USE_CASES.md` e
> `docs/business/BUSINESS_RULES.md`, que continuam a fonte de verdade
> detalhada; este arquivo é o resumo consolidado do estado real.

## UC-39 (parcial — backend): Requisição de Amostra da Engenharia

**Ator:** Qualquer usuário com permissão `operate` no módulo `requisicoes`
(inclusive perfis de Engenharia, aos quais o módulo `requisicoes` é
concedido — **não existe módulo `engenharia` dedicado a esta ação**,
decisão registrada em `docs/governance/TODO.md` Bloco 2).
**Endpoints:** `POST /api/purchase-requisitions` (reaproveitado, sem rota
nova), `POST /api/purchase-requisitions/:id/convert`,
`POST /api/purchases/:id/receive`.

**Fluxo Principal:**
1. Usuário cria uma requisição de compra normalmente, informando
   `origin: 'engenharia_amostra'` e, opcionalmente,
   `engineering_project_id` (vínculo ao projeto de P&D de origem).
2. Se `engineering_project_id` for informado e não corresponder a um
   projeto existente, o sistema responde `404` didático
   (`Projeto de engenharia {id} não encontrado.`).
3. O restante do ciclo de vida é **idêntico** ao de qualquer requisição
   (aprovação — UC-23 — e conversão em pedido — UC-25): nenhuma máquina
   de estados nova.
4. Ao converter a requisição aprovada em pedido de compra
   (`ConvertRequisitionToPurchaseOrdersUseCase`), o(s) pedido(s) gerado(s)
   recebem uma marcação automática concatenada em `notes`: "AMOSTRA
   ENGENHARIA — receber no Depósito do Laboratório". Não há coluna nova
   em `purchase_orders` — a marcação é apenas informativa.
5. Ao registrar o recebimento do pedido (`POST /api/purchases/:id/receive`),
   se o campo `warehouse_code` não for informado explicitamente no
   payload **e** o pedido tiver `requisition_id` apontando para uma
   requisição com `origin='engenharia_amostra'`, o depósito de destino
   default passa a ser `LABORATORIO` (em vez de `INSUMOS`).
   `warehouse_code` explícito no payload sempre prevalece sobre esse
   default automático.

**Regras de Negócio:** ver `docs/business/BUSINESS_RULES.md` §9, UC-39 em
`docs/business/01-USE_CASES.md`.

**Nota de escopo:** este UC cobre apenas o backend (schema + validação +
roteamento de depósito). Telas de frontend ("Engenharia > Solicitar
Amostra", badge "Amostra — Engenharia" no Recebimento) permanecem
pendentes — ver `docs/governance/TODO.md` Bloco 2.3.

---

## UC-40 (parcial — backend): Semáforo de Handoff Entre Departamentos

**Ator:** Todos os perfis operacionais que consultam as filas de
Recebimento, Requisições, Qualidade, Expedição e Dashboard.
**Endpoints:** `GET /api/purchases`, `GET /api/purchase-requisitions`,
`GET /api/inventory/lots`, `GET /api/sales`,
`GET /api/quality/non-conformities` (todas com o campo aditivo
`handoff_signal`), e `GET /api/dashboard/handoffs` (resumo agregado).

**Fluxo Principal:**
1. Usuário consulta qualquer uma das 5 listagens acima.
2. Cada linha da resposta ganha o campo aditivo `handoff_signal`
   (`'green'|'yellow'|'red'`), calculado no momento da consulta (nunca
   persistido) via `calculateHandoffSignal` (utilitário compartilhado em
   `server/src/shared/domain/handoffSignal.ts`), implementando a tabela
   normativa de `BUSINESS_RULES.md` §10.
3. Um documento **nunca desaparece** da fila por estar `red` (atrasado) —
   apenas muda de cor; a exclusão da fila continua sendo controlada pelo
   filtro de `status` de cada listagem (não pelo semáforo).
4. `GET /api/dashboard/handoffs` (`authorizeModule('dashboard')`) retorna
   um resumo agregado por área, para um futuro badge/contador de menu:
   `{ recebimento: { pending }, requisicoes: { awaiting_approval },
   expedicao: { ready_to_ship }, qualidade: { quarantine, open_rncs } }`.

**Regras de Negócio:** ver `docs/business/BUSINESS_RULES.md` §10, UC-40 em
`docs/business/01-USE_CASES.md`.

**Nota de escopo:** este UC cobre apenas o backend. O componente visual de
"bolinha de status" (semáforo) e sua aplicação nas telas existentes
permanecem pendentes — ver `docs/governance/TODO.md` Bloco 3.2.

---

## UC-41: Emissão de Nota Fiscal pelo Vendas — Restrita a Gestor

**Ator:** Usuário com nível `approve` (gestor) no módulo `vendas`, ou
`admin` global.
**Endpoints:** `POST /api/sales/:id/nfe` (emissão),
`POST /api/sales/:id/nfe/cancel` (cancelamento) — ambos exigem
`authorizeModule('vendas', 'approve')`. `GET /api/sales/:id/nfe`
(consulta de status) permanece acessível a qualquer nível do módulo
`vendas` (não é ação de aprovação).

**Fluxo Principal:**
1. Usuário com nível `operate` (não `approve`) em `vendas` tenta emitir ou
   cancelar NF-e → `403` (`APPROVAL_LEVEL_REQUIRED`, mesma fórmula do
   middleware `authorizeModule` já usada em outras ações `approve` do
   sistema).
2. Usuário com nível `approve` em `vendas` (ou `admin`) emite a NF-e
   normalmente — `sale.status` avança automaticamente para `invoiced` ao
   ser autorizada (regra pré-existente, `ChangeSaleStatusUseCase`, não
   alterada nesta entrega).
3. Cancelamento segue a mesma trava — sem distinção entre emitir e
   cancelar (DECIDIDO 2026-08-03, `BUSINESS_RULES.md` §11).

**Regras de Negócio:** ver `docs/business/BUSINESS_RULES.md` §11, UC-41 em
`docs/business/01-USE_CASES.md`.

**Nota de escopo:** não existe módulo `faturamento` dedicado nem coluna
`access_level` no usuário — o nível "gestor" é resolvido pelo
`level='approve'` da permissão do perfil no módulo `vendas` (mesma
decisão de arquitetura do Bloco 1.2).

---

## UC-42 [IMPLEMENTADO]: Múltiplos Depósitos (Insumos, Acabados, Laboratório)

**Ator:** Almoxarife (Insumos), Recebimento, Expedição, Analista de
Laboratório, Operador de Produção, Administrador Global (cadastro de
depósitos)
**Endpoints:** `GET/POST/PUT /api/inventory/warehouses`,
`GET /api/inventory/warehouse-stock`,
`GET /api/products/:id/stock-by-warehouse`,
`GET/POST /api/inventory/transfers`,
`PUT /api/inventory/transfers/:id/approve|reject`

**Fluxo Principal (A) — Cadastro de Depósito:** administrador cadastra
depósitos (`code` único, `name`, `active`) em "Logística > Estoque >
Depósitos" (`client/src/pages/logistics/WarehousesPage.tsx`). Seed
inicial: `INSUMOS`, `ACABADOS`, `LABORATORIO`.

**Fluxo Principal (B) — Recebimento Direciona o Depósito Certo:**
recebimento de compra credita `INSUMOS` por padrão, ou `LABORATORIO`
quando o pedido de origem vem de uma requisição `origin =
'engenharia_amostra'` (UC-39) — roteamento automático por origem da
requisição, sem exigir `warehouse_code` manual (`warehouse_code` explícito
no payload continua prevalecendo quando informado).

**Fluxo Principal (C) — Conclusão de OP e Consumo de Produção:** consumo de
componente de OP debita sempre `INSUMOS`; conclusão de OP (produto bom)
credita sempre `ACABADOS` — via
`server/src/services/warehouseStockService.ts`
(`addToWarehouse`/`removeFromWarehouse`, transacional com lock pessimista
`LOCK.UPDATE`), dual-write que mantém `products.quantity` (fonte de
verdade do MRP) sempre igual à soma dos saldos por depósito.

**Fluxo Principal (D) — Expedição Embarca Apenas do Depósito de Acabados:**
`ChangeSaleStatusUseCase` (`quote → confirmed`) debita exclusivamente o
depósito `ACABADOS`, mesmo que o mesmo produto tenha saldo positivo em
outro depósito (ex.: uma amostra em `LABORATORIO`) — bloqueado por saldo
insuficiente em `ACABADOS` sem considerar outros depósitos. Cancelamento
credita de volta, mesma transação. Validado em
`server/tests/unit/warehouse-invariants.test.ts` (Invariante 1).

**Fluxo Principal (E) — Laboratório Consome do Seu Próprio Depósito:**
registro de `AcousticTestResult` marcado como destrutivo
(`consumed_quantity > 0`) debita automaticamente o depósito `LABORATORIO`
na mesma transação do registro do teste (`CreateAcousticTestUseCase`), sem
lançamento manual separado.

**Fluxo Principal (F) — Transferência Entre Depósitos (Aprovação de
Gestor):** `CreateWarehouseTransferUseCase` cria a transferência em
`pending` sem alterar saldo; `ApproveWarehouseTransferUseCase`
(`authorizeModule('estoque', 'approve')`) debita origem/credita destino
atomicamente e gera 2 `InventoryMovement` (`type='transfer'`) vinculados
por `reference_type='transfer'`/`reference_id=warehouse_transfers.id`;
`RejectWarehouseTransferUseCase` não altera saldo. Tela "Transferências"
em `client/src/pages/logistics/TransfersTab.tsx`.

**Regra explícita:** quarentena/bloqueio (`LotControl.status`) continua
sendo status do lote, não depósito — as duas dimensões são ortogonais
(um lote pode estar `quarantine`/`blocked` dentro de qualquer depósito).

**Regras de Negócio:** ver `docs/business/BUSINESS_RULES.md` §12, UC-42 em
`docs/business/01-USE_CASES.md`.

**Nota de escopo:** sem coluna `tipo` (`insumos|acabados|laboratorio|outro`)
em `warehouses` — o `code` único cumpre esse papel nesta fase (desvio
deliberado, ver `docs/governance/TODO.md` Bloco 4.1). Filtro de depósito
em Expedição e no inventário mobile QR ainda não implementado.

---

## UC-43 (parcial): Alertas Didáticos de Pré-Requisitos (Transversal)

**Ator:** Todos os perfis operacionais (qualquer usuário que executa uma
ação de negócio com pré-requisitos)

**Fluxo Principal (B) — Alerta ao Tentar uma Ação que Falha no Backend
[IMPLEMENTADO nas 9 telas priorizadas]:** quando o backend retorna `422
BUSINESS_RULE_VIOLATION`/`400 VALIDATION_ERROR` com `details`
estruturado, o frontend traduz a resposta em 3 partes (O QUE / POR QUE /
O QUE FAZER) via `client/src/lib/translateApiError.ts` +
`client/src/components/DidacticAlert.tsx`, em vez de exibir `error.message`
cru. Os 9 casos priorizados em `BUSINESS_RULES.md` §13.5 (liberar OP sem
material/BOM/roteiro, concluir OP com etapa aberta, embarcar venda sem
NF-e, converter requisição sem fornecedor, receber compra sem NF, registrar
teste de laboratório sem resultado/faixa, converter ordem MRP já em
execução, aprovar requisição fora de sequência, liberar/bloquear lote em
status terminal) já retornam `details` estruturado no backend e já
consomem o padrão didático no frontend (`ProductionOrdersPage.tsx`,
`ShopFloorPage.tsx`/`CompleteProductionOrderDialog.tsx`,
`ShippingPage.tsx`, `RequisitionsPage.tsx`, `ReceivingConferenceDialog.tsx`,
`RegisterTestTab.tsx`, `MrpPage.tsx`, `InspectionTab.tsx`). Regressão
travada por `client/src/test/didacticAlertRegression.test.ts` (varre as
telas novas dos Blocos 1–5 contra `window.alert()` cru).

**Fluxo Principal (A) — Validação Preventiva (checklist antes da
tentativa) [PENDENTE]:** o componente `PrerequisiteChecklist`
(`client/src/components/PrerequisiteChecklist.tsx`, `items: { label, ok,
detail?, action? }`, helper `hasPendingPrerequisite`) existe, mas **não é
consumido em nenhuma tela** — nenhum checklist preventivo (`✓`/`✗` antes do
clique, botão desabilitado até todos os pré-requisitos estarem atendidos)
foi de fato aplicado às 6 telas mapeadas (liberar OP, concluir OP, embarcar
venda, converter requisição, aprovar requisição, liberar/bloquear lote).
Decisão técnica de caminho de implementação já registrada
caso a caso (`docs/governance/TODO.md` Bloco 6.1), mas a aplicação em UI
ainda não foi feita.

**Pendente adicional:** retrofit das demais ~25 telas do projeto que ainda
usam `extractApiErrorMessage`/alerta cru fora das 9 priorizadas (inventário
completo em `docs/governance/TODO.md` Bloco 6.2); `RegisterTestTab.tsx`
tem conformidade parcial deliberada (alerta não-bloqueante, formulário
permite submeter mesmo com o aviso visível — decisão de UX, não bug).

**Regras de Negócio:** ver `docs/business/BUSINESS_RULES.md` §13, UC-43 em
`docs/business/01-USE_CASES.md`.

---

## UC-44 a UC-48 + CRUDs enxutos (implementado): Módulo SST — EPI, ASO/PCMSO, Acidente/CAT, Fila eSocial, CIPA, PGR/GES, Treinamentos, Rotina Preventiva, Ações Corretivas

**Status:** 🟢 Backend 100% implementado — 75/75 endpoints do contrato
(passada 1 em 2026-08-07, commit `8482e79`, 38 endpoints; passada 2 em
2026-08-07, 37 endpoints restantes). **Migrations continuam pendentes de
aprovação** (`server/migrations/20260806-000130` a `000141`, `migration:up`
não executado). Especificação completa em
`docs/business/BLOCO_1_SST_REQUISITOS.md` (UC-44 a UC-48, 55 RF-SST),
`docs/business/BLOCO_1_SST_MODELO_DADOS.md` e `docs/business/BLOCO_1_SST_API.md`.
Módulo: `server/src/modules/sst/` (Clean Architecture: domain/application/
infrastructure/presentation), rotas sob `/api/sst/*`
(`server/src/modules/sst/presentation/routes/sst.ts`, montada em
`server/app.ts`). RBAC: `authorizeModule('sst', ...)` em todas as rotas,
exceto `GET /api/sst/aso/status/:employeeId` (exceção `sst`|`rh`).

### UC-44: Ficha de EPI (NR-6)
**Fluxo Principal:** `POST /api/sst/epi-types` (catálogo) →
`POST /api/sst/epi-matrix` (exigência por função/setor) →
`POST /api/sst/epi-deliveries` (cria em `rascunho`, valida CA não vencido
na `data_entrega` — BR-SST-001) → `PATCH .../evidence` (evidência de
recebimento — BR-SST-002) → `POST .../confirm` (revalida CA e evidência,
dispara saída de estoque via `InventoryMovementService` quando o TipoEPI
tem `item_id`, torna a entrega imutável por trigger Postgres) →
`GET .../ficha/:employeeId` (Ficha de EPI consolidada, join com
`sst_devolucoes_epi`).
**Fluxos de Exceção:** E1 (CA vencido na confirmação) e E2 (evidência
ausente) bloqueiam com `BusinessRuleError` 422 sem confirmar nada;
reconfirmar uma entrega já confirmada retorna `ValidationError` 400
(idempotência negativa); devolução (`POST .../return`) só é aceita para
entrega `confirmada`, nunca reabre a entrega original.
**Testes:** `server/tests/unit/sst-epi.test.ts` (13 casos).

### UC-45: ASO/PCMSO (NR-7)
**Fluxo Principal:** `POST /api/sst/aso` calcula `data_vencimento` via
`PlanoExames` aplicável (obrigatório para `tipo=periodico`, BR-SST-011) e
enfileira `EventoESocialSST` tipo `S-2220` `pendente` na mesma transação.
`GET /api/sst/aso/status/:employeeId` (RF-SST-021) retorna status enxuto
(sem `restricoes`/`medico_examinador`/`arquivo_url`) para o RH consumir no
gate de admissão/retorno.
**Fluxos de Exceção:** ASO `periodico` sem `PlanoExames` aplicável →
`BusinessRuleError` 422. Leitura de detalhe completo (`GET /:id`) e da
rota de status geram log de leitura (RNF-SST-05).
**Pendência declarada (próximo bloco):** RF-SST-018 (bloqueio automático
de apontamento de funcionário `inapto`) não tem mecanismo de flag
implementado nesta passada — apenas o dado (`resultado` do ASO) já existe
para uma integração futura.
**Testes:** `server/tests/unit/sst-aso.test.ts` (7 casos).

### UC-46: Acidente e CAT (Lei 8.213/91)
**Fluxo Principal:** `POST /api/sst/accidents` registra o acidente já
imutável (trigger `sst_lock_acidente`) → `POST .../cat` emite CAT inicial,
calcula `prazo_limite` (1º dia útil seguinte; imediato em óbito) e
enfileira `S-2210` → `POST .../investigation` (com `acoes_corretivas`
opcionais) → `POST .../close` valida que acidentes com afastamento (ou
mais graves) têm investigação + ao menos 1 ação corretiva antes de
encerrar (RF-SST-026/BR-SST-018, E2).
**Fluxos de Exceção:** 2ª CAT `inicial` para o mesmo acidente →
`BusinessRuleError` 422 (usar `POST /cat/:catId/reopen`); encerramento sem
investigação/ação corretiva → `BusinessRuleError` 422; complementos de
`dias_perdidos`/`houve_cat` (`POST .../complements`) gravam trilha de
auditoria (`sst_acidente_complementos`) e atualizam a coluna consolidada
na mesma transação — nunca um `UPDATE` livre.
**Gap de schema documentado:** `sst_acidentes` não tem status de
encerramento dedicado; `CloseAccidentUseCase` valida a regra mas não
persiste uma nova transição de estado (ver `docs/database/DATABASE.md`
seção "BLOCO 1 SST — Implementação Backend").
**Testes:** `server/tests/unit/sst-accident.test.ts` (15 casos).

### UC-47: Fila de Eventos eSocial SST (S-2210/S-2220/S-2240)
**Fluxo Principal:** fila 100% passiva — eventos nascem como efeito
colateral de `POST /api/sst/aso`, `POST /api/sst/accidents/:id/cat` e (no
próximo bloco) `POST /api/sst/ges/:id/members`. `POST .../resend` reenvia
um evento `rejeitado` criando uma NOVA linha `pendente` (idempotência por
`origem_tipo`+`origem_id`, garantida também pelo índice único parcial do
banco).
**Fluxos de Exceção:** reenviar evento que não está `rejeitado` →
`ValidationError` 400; corrida rara de já existir evento ativo para a
mesma origem → `ConflictError` 409 (defesa em profundidade — o índice
único parcial do banco é a garantia real).
**Testes:** `server/tests/unit/sst-esocial.test.ts` (5 casos).

### UC-48: CIPA (NR-5, CF/88)
**Fluxo Principal:** `GET /cipa/dimensioning` (tabela genérica por
headcount, `[VERIFICAR CNAE/grau de risco]`) → `POST /cipa/mandates` →
`POST /cipa/electoral-processes` (edital) → `POST .../candidates`
(inscrição, bloqueada com 2 mandatos consecutivos eleitos — BR-SST-021) →
`POST .../close` (apuração: atualiza `votos`/`eleito` dos candidatos e
consolida `total_votantes`/`atas_urls` no processo) → `POST
/cipa/mandates/:id/members` (persiste `estabilidade_fim = mandato.data_fim
+ 1 ano` na criação, decisão fechada) → `POST /cipa/members/:id/take-office`
(exige `TreinamentoSST` tipo `CIPA` válido — BR-SST-024) → `POST
/cipa/meetings` (ata obrigatória para `ordinaria` — BR-SST-023) → `GET
/cipa/stability/:employeeId` (exceção `sst`|`rh`, não bloqueia
desligamento — apenas informa).
**Fluxos de Exceção:** eleger membro ou inscrever candidato com 2 mandatos
consecutivos já cumpridos → `BusinessRuleError` 422 (BR-SST-021);
inscrever candidato em processo eleitoral já encerrado (apurado) →
`BusinessRuleError` 422 (decisão de design desta passada, não estava
explícita no contrato); posse sem treinamento CIPA válido →
`BusinessRuleError` 422 (BR-SST-024); reunião ordinária sem ata →
`ValidationError` 400 (BR-SST-023).
**Testes:** `server/tests/unit/sst-cipa.test.ts` (17 casos).

### CRUDs enxutos (sem UC formal detalhado, `BLOCO_1_SST_REQUISITOS.md` §7): PGR/GES, Treinamentos, Rotina Preventiva, Ações Corretivas
**PGR/GRO + GES (NR-1):** `POST /api/sst/risks` valida em aplicação a
mesma coerência do `CHECK` de banco entre `ausencia_risco_identificado` e
`categoria_agente`/`agente` (RF-SST-036/BR-SST-026); `POST
/ges/:id/members` gera `EventoESocialSST` tipo `S-2240` pendente
(RF-SST-040). Testes: `server/tests/unit/sst-pgr.test.ts` (9 casos).

**Treinamentos de Segurança (NRs):** `POST /api/sst/trainings` calcula
`validade` pela `sst_matriz_treinamento` da função/norma ou usa o default
bienal confirmado para NR-10; `GET /trainings/blocklist` (RF-SST-046) cruza
matriz × treinamentos × funcionários ativos. Testes:
`server/tests/unit/sst-training.test.ts` (8 casos).

**Rotina Preventiva (Inspeções, PT, Brigada, DDS):** `POST
/api/sst/inspections` gera `SstAcaoCorretiva` automática por item
não-conforme (prazo 1 dia se `risco_grave_iminente`, 15 dias caso
contrário — parametrização desta passada); `POST /work-permits/:id/close`
só aceita PT em status `emitida`. Testes:
`server/tests/unit/sst-safety-routine.test.ts` (13 casos).

**Ações Corretivas (CRUD dedicado, polimórfico):** `PUT
/corrective-actions/:id` nunca aceita `status: atrasada` diretamente — é
sempre derivado por leitura (`prazo` × data corrente). Testes:
`server/tests/unit/sst-corrective-action.test.ts` (7 casos).

**Regras de Negócio:** ver `docs/business/BLOCO_1_SST_REQUISITOS.md` (55
RF-SST, 36 BR-SST) e `docs/business/BLOCO_1_SST_API.md` (contrato completo
de 75 endpoints, 100% implementados — ver
`docs/governance/HANDOFF_CODEX.md`).

---

## UC-49 a UC-51 (implementado): Módulo TI — Helpdesk, Termo de Responsabilidade, Solicitação de Acesso

**Departamento:** 13 — TI. Backend completo em `server/src/modules/ti/`
(57 endpoints, `docs/business/BLOCO_2_TI_API.md`), montado em `/api/ti`.

**UC-49 — Abrir, Atender e Encerrar Chamado de TI (Helpdesk):** qualquer
usuário autenticado abre e acompanha os PRÓPRIOS chamados sem precisar do
módulo `ti` (BR-TI-001/RNF-TI-02, novo middleware
`authorizeSelfOrModule` — `server/src/middlewares/authorizeSelfOrModule.ts`);
gestão da fila completa (triagem, atribuição, resolução, fechamento de
chamado de terceiro) exige `ti:operate`. SLA (`sla_response_due_at`/
`sla_resolution_due_at`) calculado na abertura a partir de `ti_settings`
(nunca hard-code), sinaliza mas nunca bloqueia transição (RNF-TI-03).
Máquina de estados: `open→in_progress|canceled`,
`in_progress→waiting|resolved`, `waiting→in_progress`,
`resolved→closed|in_progress` (reabertura dentro do prazo parametrizável).
**Fluxo de exceção coberto em teste:** fechar sem passar por `resolved`
(E1/BR-TI-004), reabrir chamado `closed` fora do prazo de
`ti_settings.reopen_window_days` (E3), nota interna (`is_internal=true`)
negada a quem não tem módulo `ti` (RF-TI-014). Falha de backup
(`ItBackupLog.success=false`) abre chamado `urgent` automático com
`requester_id: null`/`system_generated: true` (RF-TI-040/BR-TI-017).

**UC-50 — Entregar e Devolver Equipamento com Termo de Responsabilidade:**
`POST /api/ti/responsibility-terms` cria o termo `active` e atualiza
`Asset.responsible_id` na MESMA transação (RF-TI-018), via
`AssetLookupService` (interface injetada, sem import direto do model
`Asset`). Invariante "1 termo `active` por asset" garantida por índice
único parcial no banco (BR-TI-010). **Fluxo de exceção coberto em teste:**
segunda entrega ativa do mesmo asset (E1 → `ConflictError`), asset que não
é `asset_type='it'` (BR-TI-008 aplicado por analogia), aceite físico
(`physical_signature`) sem upload do termo assinado (E3).

**UC-51 — Processar Solicitação de Acesso (Onboarding/Change/Offboarding):**
`grant`/`change` exigem aprovação (`ti:approve` OU gestor do departamento
via `departments.manager_id → employees.user_id`, resolvido em
`domain/services/approverEligibilityService.ts` e exposto na rota via
`authorizeSelfOrModule('ti','approve', approverEligibilityCheck)`);
`revoke` dispensa aprovação prévia. Execução delega 100% a operações RBAC
reais já auditadas (`AssignAccessProfileUseCase`/`DeactivateUserUseCase`/
`CreateUserUseCase` do módulo `users`, via `AccessProfileExecutionService`)
— nunca duplica `AuditLog` (RF-TI-036/BR-TI-013). **Fluxo de exceção mais
crítico do bloco, coberto em teste:** `POST /:id/execute` de um `revoke`
é BLOQUEADO (`BusinessRuleError` 422, `details.pending_terms`) enquanto
houver `ItResponsibilityTerm` `active` do funcionário sem tratamento
(E1/RF-TI-037/BR-TI-011) — checagem síncrona via
`CheckOffboardingBlockersUseCase`, reaproveitando o mesmo repositório de
`GET /responsibility-terms/pending-for-offboarding/:employeeId`, sem HTTP
loopback.

**Licenças (P3) e Backup (P5) — CRUD enxuto sem UC formal dedicado**
(mesmo padrão de "CRUDs enxutos" do SST acima): `license_key` mascarada por
padrão, revelada apenas a `ti:operate`/`role=admin` com log de leitura
(BR-TI-014/RNF-TI-01); bloqueio de assento excedente contra `seats`
contratado (RF-TI-026); renovação de licença gera `PurchaseRequisition`
via `PurchaseRequisitionService` (nunca compra direta, BR-TI-015).

**Regras de Negócio:** ver `docs/business/BLOCO_2_TI_REQUISITOS.md` (46
RF-TI, 18 BR-TI, RNF-TI-01 a 05) e `docs/business/BLOCO_2_TI_API.md`
(contrato completo de 57 endpoints). **Testes:**
`server/tests/unit/ti-authorize-self-or-module.test.ts` (7),
`ti-ticket-use-cases.test.ts` (15), `ti-term-use-cases.test.ts` (7),
`ti-license-use-cases.test.ts` (10), `ti-access-request-use-cases.test.ts`
(9), `ti-backup-use-cases.test.ts` (6) — 54 casos novos, ver
`docs/governance/HANDOFF_CODEX.md`.

---

## UC-52 (SUBSTITUÍDO pelo BLOCO 4 FAC — correção, 2026-08-07): Módulo Facilities

**Status:** 🔴 A implementação original descrita abaixo (14/17 regras do
brief não atendidas, `docs/business/BLOCO_4_FAC_VERIFICACAO.md`) foi
**reescrita** na mesma data pelo BLOCO 4 FAC (correção) — ver UC-58 a
UC-62 logo abaixo, que são os casos de uso REAIS e atuais do módulo. Texto
original preservado nesta seção apenas como registro histórico do que
existia antes da correção (não reflete mais o código em produção).

~~Módulo essencialmente de cadastro/controle, sem máquina de estados nem
fluxo de aprovação — CRUD create/list/get/update (sem delete) para 4
entidades independentes entre si: Frota de veículos (`facility_vehicles`,
tabela isolada duplicando `brand`/`model`/`status` de `assets`),
Abastecimento (`facility_fuel_records`, FK `vehicle_id`), Programação de
limpeza (`facility_cleaning_schedules`, sem separação plano×execução),
Áreas físicas (`facility_areas`). Sem condutor, sem diário de uso com
odômetro, sem documento com vencimento, sem multa, sem chamado predial
formal, sem visitante, sem correspondência, sem reserva de recursos.~~

---

## UC-58 a UC-62 (implementado — BLOCO 4 FAC, correção, 2026-08-07): Módulo Facilities completo

**Departamento:** 17 — Facilities (FAC). Reescrita completa em
`server/src/modules/facilities/`, montado em `/api/facilities` (60
endpoints — 48 novos, 8 breaking changes, 4 mantidos sem mudança de
contrato). Numeração `UC-58..62` conforme
`docs/business/BLOCO_4_FAC_REQUISITOS.md` (mesma dívida de numeração já
registrada acima para o trio Facilities/Marketing/Jurídico — UC-52..57 já
atribuídos a outros módulos no mesmo dia).

- **UC-58 — Frota Legal Completa:** veículo como extensão 1:1 de `Asset`
  (`asset_type='vehicle'`, D-2 — `FacilityVehicleDetail` substitui a
  antiga `facility_vehicles`, dropada), documento com vencimento
  (`FacilityVehicleDocument`: CRLV, seguro, IPVA — bloqueia saída se
  vencido, exceto liberação explícita nível `approve`), condutor
  (`FacilityDriver`: CNH, autorização, suspensão nível `approve`), diário
  de uso (`FacilityVehicleTrip`, máquina de estados
  `scheduled→out→returned`/`canceled`, odômetro crescente garantido por
  CHECK + validação de divergência aprovada, no máximo 1 uso aberto por
  veículo/condutor via índice único parcial), abastecimento
  (`FacilityFuelRecord`, valida km/tanque, atualiza `current_km`, alerta
  de anomalia de consumo ±30%).
- **UC-59 — Multa (Prazo Legal de Indicação de Condutor):** `FacilityFine`,
  `indication_deadline` calculado automaticamente, transição automática
  para `expired_nic` ao vencer sem indicação, sugestão de condutor
  cruzando `infraction_at`+placa com o diário de uso, pagamento gera
  título em Contas a Pagar via `AccountPayableService` (nunca Sequelize
  direto).
- **UC-60 — Manutenção Predial (D-1):** reaproveita `maintenance_orders`
  existente (`facility_area_id`/`facility_specialty`/`next_maintenance_km`
  novos, `asset_id` nullable com CHECK garantindo ao menos um vínculo),
  abertura auto-serviço (qualquer autenticado), leitura com
  `authorizeAnyModule(['manutencao','facilities'])` (middleware novo —
  achado 9 da auditoria, `authorizeModule` só aceitava um módulo por vez).
- **UC-61 — Visitantes e Correspondência:** `FacilityVisitor`/`FacilityVisit`
  (check-in/check-out, dado pessoal mascarado em listagem — LGPD,
  RNF-FAC-04), `FacilityCorrespondence` (recebimento/entrega).
- **UC-62 — Limpeza Plano × Execução:** `FacilityCleaningSchedule` (plano,
  agora com FK opcional para `facility_areas`/`employees`, criação/edição
  exige nível `approve` — BREAKING, era `operate`) separado de
  `FacilityCleaningExecution` (execução), viabilizando KPI de aderência.
  Reserva de recursos (`FacilityResourceReservation`, P2) com não
  sobreposição garantida por `EXCLUDE USING gist` no banco.

**Integração D-3 (insumos):** sem estoque próprio — consumo de material em
chamado predial/execução de limpeza via `InventoryService` (adapter para
`CreateInventoryMovementUseCase` do módulo `inventory`), reposição via
`/api/purchase-requisitions` existente (sem endpoint próprio).

**RBAC:** `facilities` ganhou uso real do nível `approve` (RF-FAC-057).

**Testes:** `server/tests/unit/facilities-vehicle-use-cases.test.ts` (9,
reescrito), `facilities-fuel-record-use-cases.test.ts` (8, reescrito),
`facilities-trip-use-cases.test.ts` (13, novo — odômetro e elegibilidade
E1-E4/A1), `facilities-driver-use-cases.test.ts` (6, novo — CNH/suspensão),
`facilities-fine-use-cases.test.ts` (6, novo — prazo de indicação),
`facilities-visitor-use-cases.test.ts` (3, novo — mascaramento LGPD),
`facilities-cleaning-schedule-use-cases.test.ts` (3, mantido),
`facilities-area-use-cases.test.ts` (2, mantido) — 50 casos, ver
`docs/governance/HANDOFF_CODEX.md` e `docs/business/BLOCO_4_FAC_API.md`
(contrato completo).

**Migrations `20260807-000290..300` ainda NÃO aplicadas** (aguardando
teste contra cópia de banco com dados reais, RNF-FAC-03) — código de
aplicação já assume o schema-alvo.

**Pendência:** telas web (`client/src/pages/facilities/`) ainda consomem o
contrato antigo e vão quebrar com os breaking changes — fora do escopo
deste passo de backend.

---

## UC-53 (implementado): Módulo Marketing — Campanhas, Leads (funil), Materiais de Divulgação

**Departamento:** 14 — Marketing (MKT). Backend implementado do zero
(nenhum código existia antes, apenas a linha do departamento em `seeds.ts`
e um esboço de 3 tabelas em sintaxe MySQL, nunca migradas, em
`docs/comercial/02-MARKETING.md`) em `server/src/modules/marketing/`,
montado em `/api/marketing`. Tela web em `/marketing`
(`client/src/pages/marketing/MarketingPage.tsx`, 3 abas).

CRUD create/list/get/update (sem delete, físico ou lógico) para 3
entidades:

- **Campanhas** (`marketing_campaigns`): tipo (`ads`/`social`/`email`/
  `event`/`trade`/`content`), datas, orçamento/custo real, contadores
  `leads_generated`/`conversions` (incrementados automaticamente pelo
  fluxo de Lead, não exigem atualização manual), ROI informado
  manualmente, status (`planned`/`active`/`paused`/`completed`/
  `canceled`). `POST`/`PUT` rejeitam `end_date` anterior a `start_date`
  com `ValidationError` (400).
- **Leads** (`marketing_leads`): FK opcional `campaign_id` (`ON DELETE
  SET NULL`), origem, score, FK opcional `converted_to_customer_id` →
  `clients` (`ON DELETE SET NULL`). O funil é uma **ação dedicada**
  (`ChangeLeadStatusUseCase`, `POST /api/marketing/leads/:id/status`),
  não um `PUT` genérico irrestrito — mesmo espírito de
  `ChangeSaleStatusUseCase`, porém mais simples (sem efeito colateral de
  estoque/financeiro): `new -> contacted -> qualified -> converted/lost`,
  `lost` alcançável de qualquer etapa aberta, `converted`/`lost`
  terminais, transições fora do mapa retornam 422 (`BusinessRuleError`).
  Ao converter, incrementa `marketing_campaigns.conversions` se houver
  campanha de origem.
- **Materiais de divulgação** (`marketing_materials`): tipo (`catalog`/
  `flyer`/`banner`/`video`/`manual`/`technical_sheet`/`presentation`), FK
  opcional `product_id` → `items.id` (**UUID**, não INT — diferença
  deliberada do esboço original em MySQL). Upload de arquivo separado da
  criação dos metadados (`POST /api/marketing/materials/:id/file`,
  multipart, campo `file`, até 50MB, extensões
  imagem/PDF/vídeo/apresentação/documento).

**RBAC:** novo módulo `marketing` em
`server/src/shared/domain/accessModules.ts` (espelhado em
`client/src/api/accessProfiles.ts`) — leitura em nível padrão (`operate`,
mesmo padrão de `facilities`/`centros_de_trabalho`/`sst`/`ti`), escrita
explicitamente `authorizeModule('marketing', 'operate')`. Sem nível
`approve`.

**Testes:** `server/tests/unit/marketing-campaign-use-cases.test.ts` (7),
`marketing-lead-use-cases.test.ts` (11),
`marketing-material-use-cases.test.ts` (7) — 25 casos novos, cobrindo os
fluxos principais (criar campanha, criar lead com/sem campanha, avançar o
funil, converter lead, criar/aprovar material, upload de arquivo) e os
principais fluxos de exceção (datas inválidas, campanha/lead/material
inexistente, transição de funil inválida, upload sem arquivo). Ver
`docs/governance/HANDOFF_CODEX.md` e `docs/comercial/02-MARKETING.md`
(contrato completo de 13 endpoints).

---

## UC-52-JUR a UC-54-JUR (implementado, passada 1/2): Módulo Jurídico — Contratos, Contencioso e Prazos Processuais Fatais

**Nota de numeração (dívida de documentação a resolver):** os documentos do
Bloco 3 (`docs/business/BLOCO_3_JUR_REQUISITOS.md` e correlatos) numeram os
5 casos de uso do módulo Jurídico como UC-52 a UC-56, sem saber que
`UC-52`/`UC-53` deste arquivo já haviam sido atribuídos, no mesmo dia
(2026-08-07), aos módulos Facilities e Marketing (ver seções acima). Os
títulos abaixo usam o sufixo `-JUR` para não colidir com as seções
existentes deste documento — a renumeração formal do trio de documentos do
Bloco 3 (que usa UC-52..56 internamente) fica para uma rodada futura de
consolidação de documentação, fora do escopo desta implementação.

Substitui o módulo Jurídico enxuto (contratos + PI, sem contencioso, sem
prazos fatais com dupla confirmação) mesclado anteriormente — ver
`docs/business/BLOCO_3_JUR_AUDITORIA.md` §6 e
`docs/governance/HANDOFF_CODEX.md`.

**UC-52-JUR — Gerenciar Contrato Ponta a Ponta com Alertas de Vencimento:**
`POST /api/jur/contracts` cria em `draft`, contraparte polimórfica
mutuamente exclusiva (`supplier_id` XOR `client_id` XOR `employee_id` XOR
`counterparty_name`+`counterparty_doc`, validada em aplicação e reforçada
por `CHECK` de banco). Minuta versionada
(`POST .../documents`) e signatários (`POST .../signatories`) precedem a
ativação. `POST .../activate` bloqueia sem `responsible_user_id` (E1),
sem 2 signatários parte + versão assinada (E3), ou sem checklist de
cláusulas respondido para `employment`/`supplier`/`nda`; ao ativar, gera
automaticamente `JurLegalAlert` de vencimento (antecedência
`alert_advance_days`), de denúncia (se `renewal_auto`+`notice_days`) e de
reajuste (se índice ≠ `none`). Aditivos (`POST .../addendums`) preservam
snapshot de valores anteriores e atualizam o contrato na mesma chamada —
imutáveis a partir da criação (trigger de banco). `POST .../terminate`
bloqueia qualquer reversão `expired`/`terminated → active` (E2).
Alçada de aprovação por valor (RF-JUR-003) **IMPLEMENTADA em 2026-08-08**
(correção) — ver seção "UC-52-JUR / UC-55-JUR (correção, 2026-08-08)"
abaixo.

**UC-53-JUR — Gerenciar Contencioso (Processo, Andamento, Provisão,
Advogado Externo):** `POST /api/jur/legal-cases` exige `case_number_cnj`
único, no máximo uma FK de parte contrária preenchida
(funcionário XOR fornecedor XOR cliente). Andamentos
(`POST .../events`) são insert-only (trigger de banco); `event_type=decision`
dispara reavaliação de risco em 90 dias. Avaliação de risco/provisão
(`POST .../provisions`, CPC 25, append-only) — `risk_class=probable` exige
nível `approve` e `provisioned_amount>0`+`rationale` (E1). Custos
(`POST .../costs`) e acordos com parcelamento (`POST .../close` com
`resolution=settled`) lançam em `AccountPayable` via
`AccountPayableServiceAdapter` (nunca Sequelize direto de outro módulo),
distinguindo despesa de depósito judicial (`legal_expense_type`).
`GET /api/jur/reports/provisions` nunca omite processo `active` sem
avaliação — marca `risco_nao_avaliado: true` (E3).

**UC-54-JUR — Baixar Prazo Processual Fatal com Dupla Confirmação (fluxo
mais crítico do módulo):** `POST /api/jur/legal-cases/:caseId/deadlines`
rejeita sem `responsible_user_id` — sem exceção, nem para rascunho (E1) —
e exige `escalation_user_id` quando `is_fatal=true`. `POST .../acknowledge`
só aceita o próprio responsável (ou o backup, com `as_backup: true`).
`POST .../fulfill` (1ª confirmação) exige `evidence_file_path`; se o prazo
já venceu sem baixa, `retroactive_justification` passa a ser obrigatória
(E3). `POST .../confirm` (2ª confirmação) é a regra central do bloco:
**rejeita `confirmedBy === fulfilled_by`** (E2, BR-JUR-013) — o mesmo
usuário nunca pode confirmar a própria baixa — além do `CHECK` de banco já
existente na migration. Nenhuma rota deste módulo permite desativar um
alerta de prazo fatal (RNF-JUR-04, garantido por ausência estrutural de
coluna, não por regra de aplicação).

**RBAC:** chave `juridico` (já existente em `accessModules.ts`, ampliada
nesta passada — desenho mais restritivo do catálogo, igual a `sst`/`ti`,
`authorizeModule('juridico', ...)` bloqueando a rota inteira em toda rota).
`approve` exigido para `risk_class=probable` e para
`POST /api/jur/legal-cases/:id/close`.

**Testes:** `server/tests/unit/juridico-contract-use-cases.test.ts` (16),
`juridico-legal-case-use-cases.test.ts` (15),
`juridico-deadline-use-cases.test.ts` (18) — 49 casos novos, com foco no
fluxo de dupla confirmação (mesmo usuário tentando confirmar a própria
baixa, baixa sem evidência, baixa retroativa sem justificativa, escalada
sem `escalation_user_id`). Ver `docs/governance/HANDOFF_CODEX.md` e
`docs/business/BLOCO_3_JUR_API.md` (contrato completo, 71 endpoints — 35
implementados nesta passada, 36 restantes para a passada 2: Procurações,
Propriedade Intelectual, LGPD, Transversal).

## UC-52-JUR / UC-55-JUR (correção, 2026-08-08): alçada de aprovação de contrato por valor + Atos Societários

Fecha as 2 pendências reais deixadas na passada 2 do Bloco 3 (ver nota de
numeração acima — mesmo sufixo `-JUR`), com regras de negócio decididas
pelo dono do produto.

**RF-JUR-003 — Alçada de aprovação de contrato por valor (extensão de
UC-52-JUR):** 3 faixas sobre `jur_contracts.value` (constantes de código,
`server/src/modules/juridico/domain/constants.ts`): `<= R$ 50.000` ativa
direto (comportamento já existente); `R$ 50.000 < valor <= R$ 300.000`
exige 1 aprovação `diretor`; `> R$ 300.000` exige `diretor` **e**
`financeiro`. Novo endpoint `POST /api/jur/contracts/:id/approve`
(`ApproveContractUseCase`) grava em `jur_contract_approvals` (unique
`contract_id`+`approver_role` — nunca duplicado). `approver_user_id` sempre
de `req.user.id`; `approver_role` sempre resolvido pelo módulo de acesso do
aprovador (`diretor`/`financeiro`, novo módulo `diretor` em
`accessModules.ts`), nunca aceito do body — `role` no body só desambigua
quando o usuário tem os dois perfis. Rota protegida por
`authorizeAnyModule([{moduleKey:'diretor'},{moduleKey:'financeiro'}])`,
montada antes do gate geral `authorizeModule('juridico', ...)` (aprovador
de alçada não necessariamente tem o módulo `juridico`).
`POST /api/jur/contracts/:id/activate` passa a consultar os approvals
registrados antes de transicionar para `active`, bloqueando com
`BusinessRuleError` (regra `RF-JUR-003`) e listando os papéis faltantes.

**RF-JUR-030 — Atos Societários (extensão de UC-55-JUR, Procurações):**
`GET/POST /api/jur/corporate-acts` e `GET/PUT /api/jur/corporate-acts/:id`
sobre nova tabela `jur_corporate_acts` (assembleia geral, reunião de
sócios, alteração contratual/estatutária, deliberação de diretoria,
outros) — entidade própria da Secretaria/Governança, sem FK para
contrato/caso. Criado sempre em `status='draft'`; `PUT` bloqueado depois de
`status='registered'` (imutabilidade pós-registro, `BusinessRuleError`); a
transição `draft → registered` acontece quando `registration_protocol` e
`registered_at` são informados juntos (o registro na Junta Comercial pode
ficar pendente por um tempo após `act_date`). RBAC igual ao resto do
módulo: `authorizeModule('juridico', 'operate')`.

**Testes:** `server/tests/unit/juridico-corporate-act-use-cases.test.ts`
(10 casos, novo) + 11 casos novos em
`server/tests/unit/juridico-contract-use-cases.test.ts`. Ver
`docs/governance/TODO.md` (entrada 2026-08-08) e
`docs/governance/HANDOFF_CODEX.md` para o detalhamento completo.

---

## UC-67 a UC-70 (implementado — BLOCO 6 RH, escopo P0, 2026-08-09): Férias, Contrato de Experiência, Admissão e Demissão

**Departamento:** 02 — RH. Módulo novo `server/src/modules/rh/`, montado em
`/api/rh`, **ao lado** de `/api/employees` (que permanece inalterado —
RF-RH-006 mantém a rota aberta a qualquer autenticado com segregação por
campo). Artefatos de origem: `docs/business/BLOCO_6_RH_REQUISITOS.md`
(81 RF-RH), `docs/business/BLOCO_6_RH_MODELO_DADOS.md` + migrations
`20260808-000010` a `-000025`, `docs/business/BLOCO_6_RH_API.md` e
`docs/business/BLOCO_6_RH_AUDITORIA.md`.

Esta passada entrega **apenas o escopo P0** (Grupos 2 a 6 do contrato de
API, 34 endpoints). Os grupos P1/P2 (Cargos, Afastamentos, Benefícios,
Treinamentos, Ponto, Histórico Contratual, Quotas PCD/aprendiz, Folha
importada, Painel/KPIs, Avaliação/Recrutamento) ficam para a passada 2 —
ver `docs/governance/TODO.md`.

### UC-67 — Férias com alertas de dobra (RF-RH-031 a 043, P0)

`GET/POST /api/rh/vacation-accrual-periods*` e
`/api/rh/vacation-schedules*`. Regras legais implementadas como funções
puras em `domain/services/vacationRules.ts`, **cada uma citando o artigo
conferido no texto oficial da CLT em `planalto.gov.br` (2026-08-09)**:

- **Art. 130, I a IV** — `dias_direito` por faltas injustificadas
  (30/24/18/12) e **Art. 133, II** (0 dias acima de 32 faltas).
- **Art. 130 caput / Art. 134 caput** — período aquisitivo de 12 meses e
  concessivo de mais 12. O cálculo replica a saturação de fim de mês do
  PostgreSQL (`date '2028-02-29' + interval '1 year'` = `2029-02-28`),
  exigida pelos CHECKs da migration `20260808-000018`.
- **Art. 134 §1º** — até 3 frações, uma ≥14 dias e as demais ≥5.
- **Art. 134 §3º** — vedação de início nos 2 dias que antecedem o DSR
  (cobertura parcial: feriados não são verificáveis, o ERP não tem
  calendário de feriados — gap declarado).
- **Art. 135 caput** — aviso com 30 dias de antecedência (aceito com
  aviso/justificativa, não bloqueante, por determinação de RF-RH-037;
  divergência lei × requisito registrada no HANDOFF).
- **Art. 143 caput e §1º** — abono de até 1/3 e prazo de 15 dias antes do
  fim do aquisitivo.
- **Art. 137 caput** — dobra: verificação **ativa na leitura**
  (`GET` grava `status='vencido_dobra'` de forma idempotente e devolve
  `alert_level: 'critical'`), sem depender de cron (RF-RH-076/RNF-RH-02).
- **Art. 133, IV** — afastamento previdenciário >6 meses zera o período
  aquisitivo e abre um novo a partir do retorno (`Reset...UseCase` pronto,
  ainda **sem gatilho**: depende de `Absence`, que é P1).

O período aquisitivo **nunca nasce por `POST` manual** (RF-RH-031): é
aberto automaticamente dentro da transação de conclusão da admissão.
`POST /vacation-schedules/:id/revise` (RF-RH-040) grava a alteração como
**novo registro** encadeado por `superseded_by_id`, nunca sobrescreve.

### UC-68 — Contrato de experiência (RF-RH-013 a 016, P0)

`GET /api/rh/employee-contracts`, `PATCH .../extend`, `PATCH .../decision`.
**Art. 445, parágrafo único** (máximo de 90 dias corridos) e **Art. 451**
(uma única prorrogação). Vencimento sem decisão vira
`indeterminado_automatico` por verificação ativa na leitura — inclusive
para contratos já **prorrogados**, que é o cenário de maior risco do
Art. 451. `decision='efetivar'` fecha o contrato de experiência e cria um
**novo** contrato `indeterminado` na mesma transação (RNF-RH-04, histórico
imutável); `decision='rescindir'` abre o `TerminationProcess` sem encerrar
o contrato antes dos gates de demissão.

### UC-69 — Admissão com gate de ASO e confirmação de eSocial (RF-RH-007 a 012)

`POST /api/rh/admission-processes` e ações. A conclusão é **uma única
transação**: cria `employees` + `hr_employee_contracts` +
`hr_employee_job_history` + o primeiro `hr_vacation_accrual_periods`.
Bloqueada por `422` enquanto o ASO admissional não estiver confirmado como
`apto`/`apto_com_restricao` e dentro da validade. O ERP **nunca transmite**
eSocial: `esocial_s2200_confirmed_at` é confirmação manual (RNF-RH-03).
Cancelamento usa `status='cancelada'` com motivo — nunca exclusão física.

### UC-70 — Demissão com checklist e prazo de verbas (RF-RH-017 a 023)

`POST /api/rh/termination-processes` e ações. **Art. 477 §6º da CLT**:
`payment_deadline` = `termination_date + 10 dias corridos` (coluna GERADA
pelo banco, nunca gravada pela aplicação); `?payment_deadline_at_risk=true`
lista os processos a ≤3 dias do vencimento sem pagamento confirmado.
**Lei 12.506/2011**: aviso prévio proporcional sugerido (30 + 3 dias por
ano completo, teto de 90) — sugestão, não imposição. A conclusão exige
nível `rh:approve` e, na mesma transação, grava
`employees.status='fired'` + `dismissal_date` e desativa o login
(`users.active=false`); é bloqueada enquanto houver ativo/EPI vinculado ao
funcionário ou ASO demissional pendente.

**Reconciliação com a rota antiga (achado 13 da auditoria, decisão do dono
do produto):** `DELETE /api/employees/:id` passa a ser **bloqueado com
422** quando existir `HrTerminationProcess` em aberto para o funcionário —
o desligamento formal só pode ser concluído pelo novo fluxo. Sem processo
formal, o comportamento legado é preservado (ex.: correção de cadastro
indevido).

### RBAC do módulo (decisão normativa do dono do produto, fecha o achado 10)

Todas as rotas de `/api/rh` ficam atrás de `authorizeModule('rh', ...)`
(bloqueio de rota inteira). `rh:approve` é exigido em **exatamente 2
ações** — concluir demissão e decidir rescisão de experiência — e **não** é
reaproveitado como nível de leitura de dado sensível. Os 2 campos
sensíveis do bloco usam **interseção de módulos**, implementada como
omissão do campo no retorno (nunca 403 de rota):
`hr_absences.cid` exige `rh` **E** `sst`;
`hr_payroll_import_items.bruto`/`liquido` exige `rh` **E** `financeiro`
(`server/src/modules/rh/domain/services/rhSensitiveFields.ts`). `pcd` foi
adicionado a `SENSITIVE_EMPLOYEE_FIELDS` (achado 11).

**Testes:** `rh-vacation-rules`, `rh-vacation-use-cases`,
`rh-contract-use-cases`, `rh-admission-termination-use-cases`,
`rh-termination-rules`, `rh-experience-contract-rules`,
`rh-sensitive-fields`, `rh-validators` (guarda que cruza cada literal de
enum do validador contra o `ENUM` real da migration) e
`rh-deactivate-employee-termination-guard` em `server/tests/unit/`.
Ver `docs/governance/HANDOFF_CODEX.md` (entrada 2026-08-09) para o
detalhamento, as divergências lei × requisito e os riscos residuais.

---

## UC-71 [IMPLEMENTADO — gap G5, 2026-08-10]: Cadastrar e Liberar Roteiro de Produção

**Ator:** PCP / Engenharia de Processo (`producao:operate`) e Gerência de
Produção (`producao:approve`) 🔒
**Módulo:** `server/src/modules/production/` (arquivos `*ProductionRoute*`),
base URL `/api/production/routes` — contrato em `docs/arquitetura/API.md` §33,
visão de processo em `docs/producao/04-ROTEIROS.md`.

**Problema que fecha.** `production_routes` / `production_route_steps` já eram
**lidas** pelo custeio real de mão de obra na conclusão da OP, pela
carga-máquina e pelo OEE — mas **não tinham nenhum endpoint**. Era impossível
ao usuário cadastrar as etapas que geram o custo. É **pré-requisito** do
apontamento obrigatório (**G4**, Bloco K do SPED Fiscal): exigir apontamento sem
roteiro cadastrável seria regra inexequível
(`docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md`, Decisão 4).

### Fluxo principal

1. PCP cria o roteiro (`POST /api/production/routes`) informando produto,
   `route_code`, revisão e (opcionalmente) já as etapas. **Nasce sempre em
   `draft`**, com `created_by` vindo do JWT.
2. PCP monta/ajusta as etapas (`PUT /:id/steps`, substituição total).
3. Gerência libera (`PATCH /:id/activate`, exige `producao:approve`): grava
   `approved_by`/`approved_at`, recalcula `total_standard_time_minutes`,
   **congela o conteúdo** e torna `superseded` a revisão ativa anterior.
4. Precisou mudar? `POST /:id/revise` clona em um rascunho novo; o roteiro
   liberado só é substituído quando a nova revisão for ativada.

### Validações e gatilhos

| Regra | `details.rule` | Resposta |
|---|---|---|
| Sequência das operações **1..N contígua**, sem buraco | `G5-SEQ-GAP` | 422 |
| Sem duas etapas na mesma `sequence` | `G5-SEQ-DUP` | 422 |
| `step_code` único no roteiro | `G5-STEP-CODE-DUP` | 422 |
| `work_center_id` deve existir | `G5-WC-NOT-FOUND` | 422 |
| `work_center_id` deve estar ativo (revalidado **também na liberação**) | `G5-WC-INACTIVE` | 422 |
| Roteiro liberado é imutável (cabeçalho, etapas e exclusão) | `G5-ROUTE-NOT-DRAFT` | 422 |
| Transição de status inválida | `G5-ROUTE-STATUS-TRANSITION` | 422 |
| Roteiro sem etapa não pode ser liberado | `G5-SEQ-EMPTY` | 422 |
| Etapa já referenciada por apontamento não pode ser apagada | `G5-ROUTE-IN-USE` | 422 |
| `route_code` único global / (produto, revisão) único | `G5-ROUTE-CODE-DUP` / `G5-REVISION-DUP` | 409 |
| Produto inexistente, inativo, ou que não é `finished`/`semi_finished` | `G5-PRODUCT-NOT-PRODUCIBLE` | 422 |

`sequence` é o **ordinal** (1..N, é por ele que o apontamento casa com a etapa);
o número de operação de chão de fábrica ("OP 10", "OP 20") vai no `step_code`.

### Efeito sobre OPs já abertas

**Nenhum, por desenho.** Roteiro ativo não muda — muda-se por revisão, e a
revisão anterior sobrevive `superseded` com as etapas intactas, continuando a
sustentar os apontamentos já feitos e o custeio da OP em curso.
⚠️ **Decisão de negócio ainda em aberto:** não existe coluna ligando a OP a uma
revisão específica (`production_orders` não tem `production_route_id`), então
relatórios derivados usam a revisão **ativa no momento da consulta**. Registrado
em `docs/governance/TODO.md`.

**Testes:** `server/tests/unit/production-routes.test.ts` (43 casos — regras de
sequência, vínculo com centro de trabalho, imutabilidade, revisão, unicidade e
guarda de apontamento; todo teste de erro afirma `details.rule`).

---

> **Legenda:** 🔓 Acesso livre | 🔒 Requer permissao especifica
