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
7. Sistema dá baixa no estoque
8. Sistema gera Conta a Receber (se parcelado)
9. Sistema exibe comprovante da venda

**Fluxo Alternativo (estoque insuficiente):**
- Sistema alerta "Estoque insuficiente para o produto X"
- Venda não pode ser concluída

**Regras de Negócio:**
- Venda não pode ser concluída sem cliente
- Produtos com estoque zerado são sinalizados
- Venda à vista gera recebimento imediato
- Venda parcelado gera contas a receber futuras

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
**Pré-condições:** Venda realizada com parcelamento  
**Fluxo Principal:**
1. Usuário acessa "Financeiro > Contas a Receber"
2. Visualiza parcelas pendentes
3. Registra o recebimento
4. Sistema baixa a parcela como "Recebida"
5. Sistema atualiza o fluxo de caixa

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
   ate a inspecao de recebimento liberar (ver UC-17B). O estoque fisico
   entra normalmente; apenas o consumo rastreavel por lote fica retido.
7. Sistema atualiza status do pedido para "received"
8. Sistema gera conta a pagar para o fornecedor

**Fluxo Alternativo (divergencia):**
- Se quantidade recebida < quantidade pedida: recebimento parcial
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
   `reserved`), registrando `"Bloqueado pela RNC #<id>"` em `notes`. Se o
   lote nao for encontrado, a NC e criada normalmente (pode referenciar
   lote de sistema externo).
7. **Fechamento da NC:** ao mudar `status` para `closed` com
   `effectiveness_result = 'effective'`, o sistema **nao desbloqueia** o
   lote automaticamente — a liberacao pos-tratativa e sempre uma decisao
   manual e explicita de qualidade (ver UC-17B).

**Validacoes/Gatilhos:**
- Bloqueio de lote e best-effort e nao bloqueante: NC sempre e criada mesmo
  que o lote nao exista ou ja esteja em status terminal (ex.: `consumed`).
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
3. Apos inspecao aprovar o material (ou apos tratativa de RNC concluida),
   usuario aciona `POST /api/inventory/lots/:id/release` (body opcional
   `{ notes }`)
4. Sistema move o lote para `available` — a partir de `quarantine`
   (liberacao pos-inspecao de recebimento) OU `blocked` (liberacao manual
   pos-tratativa de RNC)
5. Sistema registra log de auditoria (`logAction`)

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
- O FEFO da producao (`ChangeProductionOrderStatusUseCase`) so seleciona
  lotes `status = 'available'` — lotes em `quarantine` ou `blocked` ficam
  automaticamente fora do consumo automatico, sem necessidade de filtro
  adicional no motor de producao.

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

## UC-19: Gerenciar Importacao (COMEX)

**Ator:** Analista de Comex
**Pre-condicoes:** Fornecedor internacional cadastrado
**Fluxo Principal:**
1. Usuario acessa "Suprimentos > Importacao"
2. Registra processo de importacao
3. Informa dados: fornecedor, produto, quantidade, valor FOB
4. Sistema calcula tributos de importacao (II, IPI, PIS, COFINS, ICMS)
5. Registra acompanhamento (embarque, chegada, desembaraco)
6. Apos recebimento, da entrada no estoque com custo nacionalizado

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
4. Para cada item da requisição, sistema resolve o fornecedor nesta ordem
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
8. Sistema atualiza a requisição para `status='ordered'` e todos os seus
   itens para `status='ordered'`
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
   `specification_max`, `curve_data`, `notes`, `create_rnc_on_fail`
2. Sistema calcula `passed` automaticamente: `true` quando `result` foi
   informado e está dentro de `[specification_min, specification_max]`
   (comparação parcial se apenas um dos limites for informado)
3. Sistema grava `tester_id` como o usuário autenticado (nunca aceito do
   corpo da requisição)
4. Se `passed = false` e `create_rnc_on_fail = true`, sistema cria uma
   Não-Conformidade (reaproveitando `CreateNonConformityUseCase` do módulo de
   qualidade: `origin = 'final'`, `defect_type = 'acoustic'`,
   `severity = 'major'`, descrição automática com teste/medido/faixa,
   `product_id`, `lot_number`) e grava `non_conformity_id` no teste. Quando o
   `lot_number` informado corresponde a um lote existente (`LotControl`), a
   RNC bloqueia automaticamente esse lote (regra já existente no módulo de
   qualidade, sem duplicação de lógica)

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
- Não debita estoque nem gera/altera `AccountReceivable` (isso já ocorreu
  em `quote -> confirmed` e na emissão da NF-e)

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

> **Nota de consolidação (2026-08-03):** UC-30 a UC-34 acima cobrem apenas
> o Bloco 1.2 (middleware `authorizeModule` + CRUD de perfis + atribuição
> + endpoint de permissões), aplicado como piloto nos módulos `laboratory`
> e `engineering`. A especificação completa de UC-30 a UC-43 (incluindo
> UC-35 a UC-43, ainda não implementados) permanece em
> `docs/business/01-USE_CASES.md` e `docs/business/BUSINESS_RULES.md`,
> que continuam a fonte de verdade normativa até serem integralmente
> implementados e consolidados aqui.

> **Legenda:** 🔓 Acesso livre | 🔒 Requer permissao especifica
