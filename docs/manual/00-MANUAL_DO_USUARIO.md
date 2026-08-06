# Manual do Usuário — ERP EVOK ÁUDIO

**Status:** 🟡 Parcial (atualizado em 2026-08-06) — cobre navegação real
confirmada em `client/src/App.tsx` e o comportamento documentado em
`docs/projeto/04-USE_CASES.md`/`docs/API.md`. É o ponto de partida para
treinamento; **não é** um guia com capturas de tela (fora do escopo desta
rodada — ver "Próximos passos" no fim).

**O que tem conteúdo completo (passo a passo prático) nesta rodada:**
Vendas (§2), Compras — requisição→RFQ→pedido→recebimento (§4), Estoque/
Inventário incluindo fluxo mobile QR (§5), Produção — apontamento e paradas
(§6). **O que continua esqueleto** (caminho de menu + UC, sem passo a passo
ainda): Produtos (§3), Qualidade/Laboratório (§7), Engenharia (§8),
Financeiro (§9), Patrimônio/Manutenção (§10), RH (§11), Relatórios (§12),
Rastreabilidade (§13), Administração (§14), Apps móveis (§15, exceto o fluxo
de scan já detalhado em §5).

Convenção: `role` = perfil JWT global (admin/operator/financial);
`perfil de área` = perfil configurável por módulo (`operate`/`approve`),
ver `docs/business/BUSINESS_RULES.md`.

---

## Como entrar no sistema

1. Acesse a URL do ERP (produção) ou `http://localhost:5173` (ambiente
   local).
2. Informe email e senha cadastrados. Após 10 tentativas erradas em 15
   minutos, o sistema bloqueia temporariamente novas tentativas
   (proteção contra força bruta).
3. Esqueceu a senha? Use "Esqueci minha senha" (`/forgot-password`) —
   fluxo de recuperação por email.
4. Sua sessão vale por até 7 dias; alguns painéis (ex.: TV de demandas)
   renovam a sessão automaticamente em segundo plano.

Se o menu não mostrar um módulo que você espera ver, isso normalmente
significa que seu perfil de acesso não tem permissão naquela área — fale
com o administrador (mensagem do próprio sistema: "Seu acesso ainda não
foi configurado — procure o administrador").

---

## 1. Dashboard (`/`)

Tela inicial após o login. Mostra KPIs (vendas do dia/mês/ano) e, quando
aplicável, os sinais de "handoff" (bolinha verde/amarela/vermelha) das
filas de recebimento, requisições, expedição e qualidade — ver
`docs/business/BUSINESS_RULES.md` §10.

---

## 2. Vendas (`/sales`, `/sales/clients`) — conteúdo completo

### 2.1 Cadastrar um cliente novo
1. Menu **Vendas → Clientes** (`/sales/clients`).
2. Clique em "Novo Cliente".
3. Preencha Nome + CPF/CNPJ (obrigatório e único — o sistema rejeita
   duplicado). Dados fiscais (IE, IM, regime tributário) são opcionais mas
   recomendados se o cliente vai receber NF-e.
4. Salvar. O cliente já fica disponível na tela de Nova Venda.

### 2.2 Registrar uma venda nova (UC-04)
1. Menu **Vendas** (`/sales`) → "Nova Venda".
2. Selecione o cliente (já cadastrado — se não existir, cadastre primeiro
   em §2.1).
3. Adicione produtos: busque por código/nome, informe quantidade. Se o
   cliente tiver preço negociado cadastrado (§2.5), o sistema já sugere
   esse valor — pode ser editado item a item.
4. Aplique desconto (se houver) e defina a forma de pagamento
   (à vista/parcelado). Se parcelado, o sistema já monta as parcelas de
   Contas a Receber automaticamente ao confirmar.
5. Confirme. **Se não houver estoque suficiente de algum item, o sistema
   bloqueia a confirmação** e mostra qual item está faltando — não é
   possível "forçar" a venda sem estoque.
6. Venda confirmada = reserva/baixa de estoque já acontece na mesma
   transação (não precisa de passo manual de baixa).

### 2.3 Alterar um pedido já criado
1. Abra a venda na lista (`/sales`) e clique em editar itens.
2. **Só é possível enquanto o status for `quote` ou `confirmed`.** Depois de
   faturado (mesmo parcialmente), a edição de itens é bloqueada — o sistema
   mostra a mensagem de bloqueio em vez do formulário de edição.
3. Ao salvar a alteração, a reserva de estoque é recalculada
   automaticamente para os novos itens/quantidades.

### 2.4 Emitir NF-e (inclusive parcial)
1. Na tela da venda, botão "Emitir NF-e". **Só aparece/funciona para quem
   tem nível "gestor" (`approve`) no módulo Vendas** (UC-41) — se seu
   perfil for só operacional, o botão fica oculto ou dá erro 403.
2. Informe a quantidade a faturar por item — não precisa ser o total do
   pedido. O sistema acumula a quantidade já faturada
   (`invoiced_quantity`) e você pode voltar depois e faturar o restante.
3. Status do pedido muda para `partially_invoiced` (se sobrou saldo) ou
   `invoiced` (se faturou tudo).
4. **Atenção:** o sistema hoje guarda os dados da NF-e mais recente por
   pedido, não um histórico completo de todas as NF-e emitidas contra o
   mesmo pedido — se precisar do histórico de todas as emissões, seria
   necessário consultar fora do sistema por enquanto (risco residual
   conhecido, ver `CLAUDE.md` §5).

### 2.5 Tabela de preços por cliente
1. Cadastro de preço negociado fica vinculado ao cliente (uma linha por
   par cliente×produto, com vigência opcional).
2. Ao montar uma nova venda para esse cliente, o preço sugerido já vem
   preenchido — o vendedor pode aceitar ou digitar outro valor.

### 2.6 Expedir uma venda faturada (UC-27)
1. Depois de faturada, a venda aparece na fila de **Expedição**
   (`/logistics/expedicao`, §5.3).
2. Confirmar a expedição muda o status para `shipped` — **estado final,
   não é possível cancelar depois disso.**

---

## 3. Produtos (`/products`, `/products/inventory-counts`) — esqueleto

- Cadastro de produtos/itens (UC-03): nome, código, categoria, preço,
  custo, estoque mínimo.
- Contagem cíclica de inventário: ver passo a passo completo em §5.4/§5.5
  (tela web e app mobile).

---

## 4. Compras / Suprimentos (`/purchases`, `/purchases/suppliers`, `/purchases/rfqs`, `/purchases/requisitions`) — conteúdo completo

Fluxo completo ponta a ponta: **requisição → (opcional) RFQ/cotação →
pedido de compra → recebimento**, refletindo a decisão arquitetural de que
toda compra nasce em uma requisição (`CLAUDE.md` §7).

### 4.1 Abrir uma requisição de compra (UC-23)
1. Menu **Compras → Requisições** (`/purchases/requisitions`) → "Nova
   Requisição".
2. Também pode nascer automaticamente do MRP (§6.3) — nesse caso já chega
   pronta nesta tela, no status `draft`.
3. Preencha os itens e quantidades necessárias. Salvar deixa a requisição
   em `draft`.
4. Envie para aprovação: `draft → pending`.
5. **Aprovação é restrita a `admin`** (UC-23) — um usuário comum não vê o
   botão de aprovar. O aprovador confirma e o status vira `approved`; o
   sistema registra quem aprovou a partir do login (não é um campo livre
   preenchido pelo solicitante).

### 4.2 Cotar com múltiplos fornecedores (RFQ) — opcional
1. Menu **Compras → RFQ/Cotações** (`/purchases/rfqs`) → "Nova Cotação".
2. Duas formas de começar: avulsa (monta os itens na hora) ou a partir de
   uma requisição já `approved` (§4.1) — nesse caso os itens vêm
   preenchidos automaticamente.
3. Convide um ou mais fornecedores para cotar.
4. Ao receber as propostas (por telefone/e-mail, fora do sistema), registre
   preço e prazo de cada fornecedor por item na tela. O sistema destaca
   automaticamente o melhor preço/prazo no mapa comparativo.
5. Adjudique: escolha o fornecedor vencedor por item — **é possível
   dividir o mesmo item entre fornecedores diferentes** (ex.: metade da
   quantidade para o fornecedor A, metade para o B).
6. Ao confirmar a adjudicação, o sistema gera automaticamente um pedido de
   compra por fornecedor vencedor (não precisa criar o pedido manualmente
   depois).

### 4.3 Converter requisição direto em pedido (sem cotar)
1. Se não for necessário cotar, na tela da requisição `approved`
   (`/purchases/requisitions`) use a opção de converter em pedido (UC-25).
2. O sistema resolve o fornecedor (catálogo item×fornecedor — preferencial
   primeiro, com fallback) e gera um pedido por fornecedor.

### 4.4 Acompanhar e enviar o pedido de compra
1. Menu **Compras** (`/purchases`) lista os pedidos gerados (por RFQ ou
   conversão direta), com status `pending → approved → sent → partial →
   received`.
2. Use o **Cockpit de Compras** (visão consolidada de pedidos/requisições
   em aberto) para priorizar o que está mais atrasado.

### 4.5 Receber um pedido de compra (UC-16)
1. Menu **Estoque → Recebimento** (`/logistics/recebimento`, também
   acessível a partir do pedido em `/purchases`).
2. Confira os itens do pedido contra a nota fiscal física do fornecedor.
3. Informe a quantidade recebida por item — **aceita recebimento parcial**
   (o pedido fica `partial` até o restante chegar).
4. Ao confirmar, o sistema dá entrada física no estoque, e **o lote
   recebido nasce automaticamente em quarentena (`quarantine`)** — fica
   bloqueado para consumo em produção/venda até a Qualidade liberar (ver
   §7 esqueleto / `docs/arquitetura/DIAGRAMA_CASOS_DE_USO_BPMN.md` seção 3
   e 4 para o fluxo completo de liberação).
5. A conta a pagar é gerada **automaticamente só depois do recebimento**,
   nunca no momento da aprovação do pedido.

### 4.6 Cadastrar e avaliar fornecedores
1. Menu **Compras → Fornecedores** (`/purchases/suppliers`).
2. Cadastro com dados fiscais, prazos e termos de pagamento.
3. `rating` é preenchido manualmente pelo comprador; `quality_score` é
   calculado automaticamente pelo sistema a partir das não-conformidades
   vinculadas a lotes recebidos daquele fornecedor — não precisa
   atualizar manualmente.

---

## 5. Estoque / Logística (`/logistics/estoque`, `/logistics/recebimento`, `/logistics/expedicao`, `/logistics/warehouses`) — conteúdo completo

### 5.1 Consultar saldo e movimentar estoque manualmente
1. Menu **Estoque** (`/logistics/estoque`) — mostra saldo atual por item
   (e por depósito, se a empresa usa múltiplos armazéns).
2. Para lançar uma movimentação manual (ajuste, perda, etc.): "Nova
   Movimentação" → escolha o item, tipo (entrada/saída/ajuste) e **informe
   o motivo — é campo obrigatório**, não é possível salvar sem justificar.

### 5.2 Recebimento de pedido de compra
Ver passo a passo completo em §4.5 — o recebimento é parte do fluxo de
Compras, mas a tela fica em Estoque (`/logistics/recebimento`).

### 5.3 Expedir uma venda faturada
1. Menu **Estoque → Expedição** (`/logistics/expedicao`).
2. Lista as vendas já faturadas aguardando envio.
3. Confirme a expedição → status final `shipped`. **Não é possível
   cancelar ou desfazer depois desse ponto** — confira os itens/quantidade
   antes de confirmar.

### 5.4 Contagem cíclica de inventário — tela web
1. Menu **Produtos → Contagens de Inventário**
   (`/products/inventory-counts`).
2. Contagens podem ser criadas por **pool** (qualquer operador pode
   assumir/"puxar" uma contagem da fila) ou **atribuídas** a uma pessoa
   específica pelo gestor.
3. Ao assumir uma contagem, o operador informa a quantidade física contada
   por item; o sistema compara com o saldo do sistema e sinaliza
   divergências para ajuste.

### 5.5 Contagem cíclica e scan de estoque pelo app mobile (`mobile/`)
**Pré-requisito:** app instalado (Expo/React Native) e login feito com as
mesmas credenciais do sistema web. **Nota:** este fluxo foi validado só por
typecheck/bundle, ainda sem teste em dispositivo físico real — reporte
qualquer comportamento inesperado em campo.

1. Abra o app e faça login (mesma tela de usuário/senha do ERP).
2. Na tela inicial ("Home"), duas opções:
   - **Movimentação rápida por QR:** toque em "Escanear", aponte a câmera
     para o QR Code do item/etiqueta. O código do produto é preenchido
     automaticamente. Informe quantidade e tipo (entrada/saída),
     descrição opcional, e toque em "Registrar movimentação" — o app
     mostra o novo saldo em estoque na hora, confirmando que a
     movimentação foi aplicada no servidor.
   - **Contagem de Inventário:** toque no card "Contagem de Inventário"
     para ver a lista de contagens em aberto (pool ou atribuídas a você).
3. Dentro de uma contagem, escaneie cada item da lista (ou digite o
   código manualmente) e informe a quantidade física — mesmo
   comportamento da tela web (§5.4), só que otimizado para leitura rápida
   em campo.
4. **Histórico:** "Ver histórico de movimentações" na tela inicial mostra
   as últimas movimentações feitas por você, útil para conferência antes
   de fechar o turno.

### 5.6 Múltiplos depósitos e transferência
1. Menu **Estoque → Depósitos** (`/logistics/warehouses`).
2. Cadastro de depósitos físicos (ex.: Almoxarifado Principal, Depósito de
   Laboratório).
3. Transferência entre depósitos: cria uma solicitação de transferência
   que precisa ser **aprovada** por um perfil com nível de gestão antes de
   mover o saldo de fato (mesmo padrão de aprovação usado em requisições).

---

## 6. Produção / PCP (`/production`, `/production/bom`, `/production/mrp`, `/production/shop-floor`, `/production/work-centers`) — conteúdo completo

### 6.1 Criar uma Ordem de Produção (OP) (UC-12)
1. Menu **Produção** (`/production`) → "Nova OP".
2. Selecione o produto acabado e a quantidade a produzir. O sistema busca
   a BOM (estrutura de produto, §6.2) para calcular os materiais
   necessários.
3. O sistema verifica a disponibilidade contra o **estoque real** no
   momento da criação (não uma foto congelada de outro dia) — se faltar
   material, ele avisa, mas a decisão de liberar mesmo assim (para depois
   resolver via requisição/MRP) fica com o planejador.
4. Status inicial `planned`. Ao liberar para a fábrica: `released →
   in_progress` (o apontamento, §6.4, é quem move para `in_progress` e
   depois `completed`).

### 6.2 Consultar/editar a BOM (estrutura de produto)
1. Menu **Produção → BOM** (`/production/bom`).
2. Mostra os componentes de cada produto, com percentual de perda
   cadastrado, em estrutura multi-nível (componente de componente).

### 6.3 Rodar o MRP e gerar requisições
1. Menu **Produção → MRP** (`/production/mrp`).
2. O MRP calcula ordens planejadas de compra/produção com base na demanda
   (vendas confirmadas + OPs) contra o estoque real.
3. Para cada ordem planejada de compra: o planejador pode converter
   manualmente em requisição (UC-24, abre em `draft` na tela de Compras,
   §4.1), **ou** o item pode estar marcado como `conversao_automatica`
   (opt-in cadastrado no item) — nesse caso a requisição é aberta sozinha,
   sem revisão humana nesse passo (UC-24b). Confira sempre a origem
   `MRP` na requisição gerada para saber se foi automática ou manual.

### 6.4 Apontamento de produção — chão de fábrica (UC-13)
1. Menu **Produção → Chão de Fábrica** (`/production/shop-floor`).
2. Selecione a OP em andamento.
3. Informe a quantidade produzida no turno: **quantidade boa** e
   **quantidade refugada** separadamente — não é um único campo.
4. Se a máquina parou durante o turno, registre a parada (ver §6.5) antes
   ou depois do apontamento de quantidade — os dois são lançamentos
   independentes.
5. Ao concluir a OP (todo o planejado apontado, ou fechamento manual pelo
   gestor), o sistema reconcilia o total apontado com a OP — a OP só
   fecha (`completed`) de forma consistente com o que foi realmente
   produzido, não com o valor originalmente planejado.

### 6.5 Registrar parada de máquina (downtime)
1. Na mesma tela de Chão de Fábrica, "Registrar Parada".
2. Escolha o centro de trabalho e o motivo categorizado: setup,
   manutenção corretiva, manutenção preventiva, falta de material, falta
   de operador, qualidade, outros.
3. **O sistema não deixa abrir uma segunda parada simultânea no mesmo
   centro de trabalho** — se já existe uma parada aberta ali, é preciso
   encerrá-la antes de abrir outra (proteção contra duplicidade que
   distorceria o cálculo de OEE).
4. Encerre a parada quando a máquina voltar a operar (informando a hora
   de término, ou o sistema usa o momento do encerramento).
5. Essas paradas alimentam automaticamente o cálculo de **OEE**
   (Disponibilidade × Performance × Qualidade), disponível em
   **Relatórios → OEE** (§12, esqueleto) — não é preciso lançar nada
   manualmente lá.

### 6.6 Centros de trabalho
1. Menu **Produção → Centros de Trabalho** (`/production/work-centers`).
2. Cadastro de capacidade, turnos e custo/hora — usados tanto no cálculo
   de OEE (§6.5) quanto no custeio real de mão de obra da OP.

---

## 7. Qualidade / Laboratório (`/quality`, `/laboratory`) — esqueleto

- **Qualidade** (`/quality`): registro de não-conformidades (RNC),
  inspeção de recebimento (libera ou bloqueia lote em quarentena —
  UC-17B).
- **Laboratório** (`/laboratory`): testes acústicos (parâmetros
  Thiele-Small e outros), com opção de teste destrutivo (debita
  automaticamente a quantidade consumida do depósito de laboratório).

---

## 8. Engenharia (`/engineering`) — esqueleto

Projetos de P&D, desenhos técnicos (CAD), ficha técnica Thiele-Small do
item e requisição de amostra vinculada a um projeto de engenharia
(UC-39).

---

## 9. Financeiro (`/financial`) — esqueleto

- Contas a pagar/receber, com baixa manual ou automática (compras geram
  conta a pagar **após** o recebimento, não na aprovação do pedido).
- **Centros de custo:** atribuição opcional em contas a pagar/receber,
  com relatório agrupado.
- **Fluxo de caixa:** projeção semanal (30/60/90 dias) e projeção diária
  com saldo acumulado.
- **Conciliação bancária:** importação de extrato OFX, sugestão
  automática de correspondência (match) com contas a pagar/receber, baixa
  em lote. CNAB (boleto/remessa/retorno) ainda não implementado.

---

## 10. Patrimônio / Manutenção (`/patrimonio`, `/maintenance`) — esqueleto

Cadastro de ativos com QR Code, depreciação, ordens de manutenção
(preventiva/corretiva) e ordens de serviço externas (`/service-orders`).

---

## 11. RH (`/hr`) — esqueleto

Departamentos, funcionários, turnos e regime de trabalho.

---

## 12. Relatórios (`/reports`, `/reports/auditor`) — esqueleto

Dashboard de KPIs, relatórios de vendas/estoque/produção/custos, OEE por
centro de trabalho, e o "Auditor Inteligente" (`/reports/auditor`):
análise de estoque negativo/zerado/baixo/excessivo, sugestão de
reposição por consumo histórico, curva ABC.

---

## 13. Rastreabilidade e Auditoria (`/traceability`, `/audit-logs`) — esqueleto

Consulta de lote/série por produto e histórico de ações sensíveis
(quem alterou o quê e quando) — `AuditLog`.

---

## 14. Administração (`/users`, `/users/access-profiles`, `/settings/fiscal`) — esqueleto

- **Usuários** (`/users`): criação/edição/inativação, atribuição de
  perfil de acesso por área.
- **Perfis de acesso** (`/users/access-profiles`): o administrador
  monta perfis (ex.: "Almoxarife", "Comprador") marcando módulo a módulo
  o nível de acesso (`operate`/`approve`). Um perfil fora da lista de um
  usuário = módulo oculto do menu **e** bloqueado na API.
- **Configuração Fiscal** (`/settings/fiscal`): dados da empresa para
  emissão de NF-e.

---

## 15. Aplicativos móveis

- **App mobile** (`mobile/`, Expo/React Native): passo a passo completo do
  fluxo de scan/movimentação e contagem cíclica já em §5.5. Histórico de
  movimentações acessível na tela inicial do app. Ainda sem validação em
  dispositivo físico real (só typecheck/bundle) — ver `mobile/README.md`
  §5.
- **Painel Android TV** (`tv/`, react-native-tvos) — esqueleto: painel de
  demandas por departamento (recebimento, requisições, expedição,
  qualidade), atualiza sozinho a cada 60 segundos. Mesma ressalva de
  validação em hardware real — ver `tv/README.md` §5.

---

## Próximos passos (fora do escopo desta rodada)

- Capturas de tela / gravações curtas por módulo (treinamento visual).
- Guia de erros comuns e como resolvê-los (ex.: "por que não consigo
  editar minha venda?" → já faturada parcialmente).
- Tradução/adaptação para uso offline (PDF/impresso) na linha de
  produção.
- Vídeo de onboarding para o app mobile/TV assim que a validação em
  hardware real for concluída.

## Referências

- `docs/projeto/04-USE_CASES.md`, `docs/business/01-USE_CASES.md` — casos
  de uso formais por trás de cada tela.
- `docs/business/BUSINESS_RULES.md` — regras de perfis de acesso.
- `client/src/App.tsx` — rotas reais do frontend web.
- `docs/API.md` — comportamento detalhado de cada endpoint, se precisar
  ir além da tela.
- `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` — lista rastreável de
  requisitos funcionais por módulo.
- `docs/arquitetura/DIAGRAMA_CASOS_DE_USO_BPMN.md` — visão de processo
  ponta a ponta (Vendas, Compras, Qualidade, Manutenção).
