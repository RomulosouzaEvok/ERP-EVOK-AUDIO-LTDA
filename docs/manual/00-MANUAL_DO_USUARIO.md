# Manual do Usuário — ERP EVOK ÁUDIO

**Status:** 🟡 Esqueleto inicial (2026-08-06) — cobre navegação real
confirmada em `client/src/App.tsx` e o comportamento documentado em
`docs/projeto/04-USE_CASES.md`/`docs/API.md`. É o ponto de partida para
treinamento; **não é** um guia passo-a-passo com capturas de tela (fora do
escopo desta rodada — ver "Próximos passos" no fim). Cada seção aponta o
caminho de menu real e o(s) caso(s) de uso formal(is) por trás da tela.

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

## 2. Vendas (`/sales`, `/sales/clients`)

- **Clientes** (`/sales/clients`): cadastro de clientes (UC-02). Campo
  obrigatório: Nome + CPF/CNPJ (único no sistema).
- **Nova venda** (`/sales`): seleciona cliente, adiciona produtos, define
  forma de pagamento (UC-04). O sistema bloqueia a confirmação se não
  houver estoque suficiente.
- **Alterar pedido:** enquanto a venda estiver em `quote`/`confirmed`, é
  possível editar os itens da mesma tela (ajusta reserva de estoque
  automaticamente). Depois de faturada (mesmo parcialmente), a edição de
  itens fica bloqueada.
- **Emitir NF-e:** ação restrita a usuários com nível "gestor"
  (`approve`) no módulo Vendas (UC-41). Suporta faturamento parcial —
  pode faturar parte da quantidade de um pedido e completar depois.
- **Tabela de preços por cliente:** ao montar um pedido para um cliente
  com preço negociado cadastrado, o sistema sugere o preço (editável).

---

## 3. Produtos (`/products`, `/products/inventory-counts`)

- Cadastro de produtos/itens (UC-03): nome, código, categoria, preço,
  custo, estoque mínimo.
- **Contagem cíclica de inventário** (`/products/inventory-counts`):
  contagens podem ser criadas por pool (qualquer operador pode assumir)
  ou atribuídas a uma pessoa específica. Também disponível no app mobile
  (`mobile/`) com leitura de QR Code.

---

## 4. Compras / Suprimentos (`/purchases`, `/purchases/suppliers`, `/purchases/rfqs`, `/purchases/requisitions`)

- **Requisições** (`/purchases/requisitions`): toda compra começa aqui
  (decisão arquitetural de rastreabilidade — `CLAUDE.md` §7). Fluxo:
  `draft → pending → approved` (aprovação restrita a `admin`, UC-23).
- **Cotação/RFQ** (`/purchases/rfqs`): cria cotação avulsa ou a partir de
  uma requisição aprovada, convida fornecedores, registra as cotações
  recebidas (o sistema destaca melhor preço/prazo no mapa comparativo) e
  permite adjudicar por item — inclusive dividindo entre fornecedores.
  Gera automaticamente o(s) pedido(s) de compra do(s) fornecedor(es)
  vencedor(es).
- **Pedidos de compra** (`/purchases`): quando não é necessário cotar,
  a requisição aprovada é convertida direto em pedido (UC-25) — um pedido
  por fornecedor resolvido.
- **Fornecedores** (`/purchases/suppliers`): cadastro, avaliação
  (`rating` manual) e `quality_score` calculado automaticamente a partir
  de não-conformidades vinculadas a lotes recebidos do fornecedor.

---

## 5. Estoque / Logística (`/logistics/estoque`, `/logistics/recebimento`, `/logistics/expedicao`, `/logistics/warehouses`)

- **Estoque** (`/logistics/estoque`): saldo, movimentações,
  entrada/saída/ajuste com motivo obrigatório.
- **Recebimento** (`/logistics/recebimento`): confere pedido de compra
  contra a nota fiscal do fornecedor, dá entrada física no estoque (UC-16).
  O lote recebido entra em **quarentena** (`quarantine`) — fica bloqueado
  para consumo em produção até a inspeção de qualidade liberar.
- **Expedição** (`/logistics/expedicao`): expede vendas já faturadas
  (UC-27) — status final `shipped`, não pode ser cancelado depois.
- **Depósitos/Múltiplos armazéns** (`/logistics/warehouses`): suporte a
  múltiplos depósitos físicos e transferência entre eles.

---

## 6. Produção / PCP (`/production`, `/production/bom`, `/production/mrp`, `/production/shop-floor`, `/production/work-centers`)

- **Ordens de Produção** (`/production`): criação com verificação
  automática de disponibilidade de material contra o estoque **real**
  (não é uma foto congelada) — UC-12.
- **BOM** (`/production/bom`): estrutura de produto (componentes,
  perdas %), multi-nível.
- **MRP** (`/production/mrp`): gera plano de necessidade de materiais;
  ordens planejadas podem ser convertidas manualmente em requisição de
  compra (UC-24), ou automaticamente para itens marcados como
  `conversao_automatica` (UC-24b, opt-in por item, sem revisão humana).
- **Chão de fábrica** (`/production/shop-floor`): apontamento de
  quantidade boa/refugada, registro de paradas de máquina por motivo
  (setup, manutenção, falta de material/operador, qualidade, outros) —
  alimenta o cálculo de OEE.
- **Centros de trabalho** (`/production/work-centers`): capacidade,
  turnos e custo/hora usados no custeio real de produção.

---

## 7. Qualidade / Laboratório (`/quality`, `/laboratory`)

- **Qualidade** (`/quality`): registro de não-conformidades (RNC),
  inspeção de recebimento (libera ou bloqueia lote em quarentena —
  UC-17B).
- **Laboratório** (`/laboratory`): testes acústicos (parâmetros
  Thiele-Small e outros), com opção de teste destrutivo (debita
  automaticamente a quantidade consumida do depósito de laboratório).

---

## 8. Engenharia (`/engineering`)

Projetos de P&D, desenhos técnicos (CAD), ficha técnica Thiele-Small do
item e requisição de amostra vinculada a um projeto de engenharia
(UC-39).

---

## 9. Financeiro (`/financial`)

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

## 10. Patrimônio / Manutenção (`/patrimonio`, `/maintenance`)

Cadastro de ativos com QR Code, depreciação, ordens de manutenção
(preventiva/corretiva) e ordens de serviço externas (`/service-orders`).

---

## 11. RH (`/hr`)

Departamentos, funcionários, turnos e regime de trabalho.

---

## 12. Relatórios (`/reports`, `/reports/auditor`)

Dashboard de KPIs, relatórios de vendas/estoque/produção/custos, OEE por
centro de trabalho, e o "Auditor Inteligente" (`/reports/auditor`):
análise de estoque negativo/zerado/baixo/excessivo, sugestão de
reposição por consumo histórico, curva ABC.

---

## 13. Rastreabilidade e Auditoria (`/traceability`, `/audit-logs`)

Consulta de lote/série por produto e histórico de ações sensíveis
(quem alterou o quê e quando) — `AuditLog`.

---

## 14. Administração (`/users`, `/users/access-profiles`, `/settings/fiscal`)

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

- **App mobile** (`mobile/`, Expo/React Native): login, scan de estoque
  por QR Code, histórico de movimentações, execução de contagens
  cíclicas. Ainda sem validação em dispositivo físico real (só
  typecheck/bundle) — ver `mobile/README.md` §5.
- **Painel Android TV** (`tv/`, react-native-tvos): painel de demandas
  por departamento (recebimento, requisições, expedição, qualidade),
  atualiza sozinho a cada 60 segundos. Mesma ressalva de validação em
  hardware real — ver `tv/README.md` §5.

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
