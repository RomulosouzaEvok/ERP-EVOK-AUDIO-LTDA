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

## UC-19 [IMPLEMENTADO] (backend; tela web pendente): Gerenciar Importacao (COMEX)

**Ator:** Analista de Comex
**Pre-condicoes:** Fornecedor internacional cadastrado
**Fluxo Principal:**
1. Usuario acessa "Suprimentos > Importacao"
2. Registra processo de importacao
3. Informa dados: fornecedor, produto, quantidade, valor FOB
4. Sistema calcula tributos de importacao (II, IPI, PIS, COFINS, ICMS)
5. Registra acompanhamento (embarque, chegada, desembaraco)
6. Apos recebimento, da entrada no estoque com custo nacionalizado

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

## UC-52 (implementado): Módulo Facilities — Frota, Abastecimento, Limpeza, Áreas Físicas

**Departamento:** 17 — Facilities (FAC). Backend implementado do zero
(nenhum código existia antes, apenas a linha do departamento em `seeds.ts`
e um esboço `[PENDENTE]` em `docs/administrativo/03-FACILITIES.md`) em
`server/src/modules/facilities/`, montado em `/api/facilities`. Tela web em
`/facilities` (`client/src/pages/facilities/FacilitiesPage.tsx`, 4 abas).

Módulo essencialmente de cadastro/controle, sem máquina de estados nem
fluxo de aprovação — CRUD create/list/get/update (sem delete, físico ou
lógico) para 4 entidades independentes entre si (exceto FKs de referência):

- **Frota de veículos** (`facility_vehicles`): placa única, dados do
  veículo, seguro, status (`active`/`maintenance`/`deactivated`/`sold`).
  `POST` rejeita placa duplicada com `ConflictError` (409).
- **Abastecimento** (`facility_fuel_records`): histórico por veículo
  (FK obrigatória `vehicle_id`, `ON DELETE RESTRICT`), motorista opcional
  (FK `driver_id → employees`, `ON DELETE SET NULL`). `total_cost`
  calculado automaticamente (`liters * price_per_liter`) quando não
  informado. `POST` rejeita `vehicle_id` inexistente com `NotFoundError`
  (404).
- **Programação de limpeza** (`facility_cleaning_schedules`): área em texto
  livre (decisão consciente — não FK para `facility_areas`, cobre áreas
  informais sem cadastro formal), frequência, responsável, última/próxima
  limpeza.
- **Áreas físicas** (`facility_areas`): tipo, m², capacidade de pessoas,
  departamento opcional (FK `department_id → departments`,
  `ON DELETE SET NULL`).

**RBAC:** novo módulo `facilities` em
`server/src/shared/domain/accessModules.ts` (espelhado em
`client/src/api/accessProfiles.ts`) — leitura em nível padrão (`operate`,
mesmo padrão de `centros_de_trabalho`/`sst`/`ti`), escrita explicitamente
`authorizeModule('facilities', 'operate')`. Sem nível `approve`.

**Testes:** `server/tests/unit/facilities-vehicle-use-cases.test.ts` (6),
`facilities-fuel-record-use-cases.test.ts` (3),
`facilities-cleaning-schedule-use-cases.test.ts` (3),
`facilities-area-use-cases.test.ts` (2) — 14 casos novos, cobrindo os fluxos
principais (criar veículo, listar frota, criar abastecimento com cálculo
automático de custo, criar programação de limpeza) e os principais fluxos
de exceção (placa/veículo duplicados, entidade inexistente). Ver
`docs/governance/HANDOFF_CODEX.md` e `docs/administrativo/03-FACILITIES.md`
(contrato completo de 16 endpoints).

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

> **Legenda:** 🔓 Acesso livre | 🔒 Requer permissao especifica
