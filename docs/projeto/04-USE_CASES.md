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
5. Sistema da entrada no estoque
6. Sistema atualiza status do pedido para "received"
7. Sistema gera conta a pagar para o fornecedor

**Fluxo Alternativo (divergencia):**
- Se quantidade recebida < quantidade pedida: recebimento parcial
- Se produto com defeito: aciona qualidade (incoming inspection)

---

## UC-17: Realizar Inspecao de Qualidade

**Ator:** Inspetor de Qualidade
**Pre-condicoes:** Producao apontada ou material recebido
**Fluxo Principal:**
1. Usuario acessa "Qualidade > Inspecao"
2. Seleciona tipo (incoming, processo, final)
3. Realiza medicoes conforme plano de inspecao
4. Registra resultados (aprovado, rejeitado, retrabalho)
5. Se rejeitado, sistema gera NC (Nao Conformidade)
6. Sistema atualiza lote com status da inspecao

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

> **Legenda:** 🔓 Acesso livre | 🔒 Requer permissao especifica
