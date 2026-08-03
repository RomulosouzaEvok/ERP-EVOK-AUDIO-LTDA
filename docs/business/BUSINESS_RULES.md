# Regras de Negócio — Controle de Acesso por Área/Departamento

Documento complementar a `docs/business/01-USE_CASES.md`. Aqui ficam as
regras estáticas (matriz de permissões, invariantes, fórmulas) que os
casos de uso referenciam. Status: 🟡 requisito em especificação, NÃO
implementado.

---

## §1. Matriz de Referência Módulo × Permissão (ponto de partida editável)

**Convenção de nível por módulo:**
- `-` = nenhum acesso (módulo some do menu, API responde 403)
- `V` = ver (leitura apenas)
- `O` = operar (leitura + escrita das ações do dia a dia)
- `A` = aprovar (tudo de operar + ações de aprovação/gestão da área —
  só é efetivo se o usuário também tiver `nivel = gestor`, ver §4)

**Lista de módulos do sistema** (mapeada a partir do menu real em
`client/src/layouts/AppLayout.tsx` e das rotas em `server/app.ts`):
`dashboard`, `produtos`, `contagens`, `vendas`, `clientes`, `compras`,
`requisicoes`, `fornecedores`, `producao`, `bom`, `mrp`,
`chao_de_fabrica`, `centros_de_trabalho`, `qualidade`, `laboratorio`,
`engenharia`, `estoque`, `recebimento`, `expedicao`, `patrimonio`,
`rastreabilidade`, `financeiro`, `relatorios.producao`,
`relatorios.compras`, `relatorios.custos`, `relatorios.financeiro`,
`usuarios` (admin only), `audit_logs` (admin only).

> `usuarios` e `audit_logs` nunca aparecem na matriz de perfis de área —
> são exclusivos do papel `admin` global (ver §3), não fazem parte do
> catálogo de módulos atribuíveis a um perfil de área.

| Módulo | Almoxarife | Recebimento | Expedição | Comprador | Gestor de Compras | Analista de Laboratório | Engenheiro | PCP | Operador de Produção | Qualidade | Financeiro | RH |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| dashboard | V | V | V | V | V | V | V | V | V | V | V | V |
| produtos | V | V | V | O | O | V | O | V | V | V | - | - |
| contagens | O | - | - | - | - | - | - | V | - | - | - | - |
| vendas | - | - | V | - | - | - | - | - | - | - | V | - |
| clientes | - | - | - | - | - | - | - | - | - | - | V | - |
| compras | V | V | - | O | A | - | V | V | - | - | V | - |
| requisicoes | O | V | - | O | A | O | O | O | O | O | - | - |
| fornecedores | - | V | - | O | A | - | - | - | - | O | - | - |
| producao | V | - | V | - | - | - | V | A | O | V | - | - |
| bom | V | - | - | - | - | - | A | O | V | V | - | - |
| mrp | - | - | - | V | O | - | - | A | - | - | - | - |
| chao_de_fabrica | - | - | - | - | - | - | - | O | O | V | - | - |
| centros_de_trabalho | - | - | - | - | - | - | - | A | V | - | - | - |
| qualidade | - | O | - | - | - | O | V | V | V | A | - | - |
| laboratorio | - | - | - | - | - | A | O | - | - | O | - | - |
| engenharia | - | - | - | - | - | O | A | V | - | V | - | - |
| estoque | A | O | O | V | V | - | V | V | O | O | - | - |
| recebimento | O | A | - | V | V | - | - | - | - | O | - | - |
| expedicao | V | - | A | - | - | - | - | - | - | - | - | - |
| patrimonio | - | - | - | - | - | - | - | - | - | - | O | - |
| rastreabilidade | V | V | V | - | - | V | V | V | - | A | - | - |
| financeiro | - | - | - | - | V | - | - | - | - | - | A | - |
| relatorios.producao | V | - | - | - | - | - | V | O | V | V | - | - |
| relatorios.compras | - | - | - | V | O | - | - | V | - | - | V | - |
| relatorios.custos | - | - | - | - | O | - | - | V | - | - | O | - |
| relatorios.financeiro | - | - | - | - | - | - | - | - | - | - | O | - |

> **Nota explícita para RH:** o perfil RH não foi mapeado às colunas de
> módulos de manufatura/vendas acima porque o módulo de RH (funcionários,
> departamentos, folha) não está listado no inventário de rotas fornecido
> no enunciado desta tarefa. **Pendência a validar com o dono/DBA**: RH
> precisa de um módulo próprio (`rh`) na matriz, hoje ausente da lista de
> módulos do menu informada — sugerido como item de TODO técnico (ver
> `docs/governance/TODO.md`) antes da implementação.
>
> Esta matriz é um **ponto de partida editável pelo administrador** via
> UC-30/UC-31 — nada aqui é hard-coded no sistema; é a configuração
> inicial sugerida para seed dos perfis, refletindo os departamentos hoje
> conhecidos da fábrica.

---

## §2. Regra do Perfil Único por Usuário

- Cada usuário (`role != admin`) possui **no máximo um** `access_profile_id`
  ativo por vez.
- Atribuir um novo perfil **substitui** o anterior — não há acumulação
  nem herança de permissões de perfis anteriores.
- Não existe conceito de "perfil secundário" ou "múltiplos chapéus" neste
  modelo — se um funcionário exerce duas funções, o admin escolhe qual
  perfil reflete seu papel principal, ou (fora de escopo deste requisito)
  um novo perfil combinado pode ser criado especificamente para esse caso
  (ex.: "Almoxarife + Expedição").

---

## §3. Regra do Admin Global

- O papel JWT `admin` (já existente em `server/src/middlewares/auth.ts`,
  `authorize('admin', ...)`) está **acima** de qualquer perfil de área.
- Um usuário `role = admin` **nunca** é bloqueado pelo middleware de
  autorização por módulo — todas as checagens de perfil de área são
  puladas quando `req.user.role === 'admin'`.
- Um usuário `admin` pode, opcionalmente, ter um `access_profile_id`
  atribuído (ex.: para fins de relatório de "quem é de qual área"), mas
  esse valor é **decorativo/informativo** para o admin — nunca restringe
  seu acesso.
- Esta regra é a primeira checagem do middleware (curto-circuito), antes
  de qualquer consulta à tabela de perfis — evita que um bug de cadastro
  de perfil derrube acesso de administradores.

---

## §4. Regra dos Dois Níveis (Operador × Gestor)

- Todo perfil de área tem, por usuário atribuído, um `nivel`:
  `operador` ou `gestor`.
- O nível do módulo na matriz (`V`/`O`/`A`) define o que o **perfil**
  permite; o `nivel` do **usuário** (`operador`/`gestor`) é uma segunda
  trava obrigatória para qualquer ação marcada como exigindo `A` (aprovar).
- **Fórmula de autorização para uma ação de aprovação:**
  ```
  permitido = (role == 'admin')
           OR (perfil.modulo[modulo_da_acao] == 'A' AND usuario.nivel == 'gestor')
  ```
- **Fórmula de autorização para uma ação de operação comum (escrita não
  privilegiada):**
  ```
  permitido = (role == 'admin')
           OR (perfil.modulo[modulo_da_acao] IN ('O', 'A'))
  ```
  (aqui o nível do usuário — operador ou gestor — não importa; ambos
  podem operar se o módulo permite `O` ou `A`)
- **Fórmula de autorização para leitura:**
  ```
  permitido = (role == 'admin')
           OR (perfil.modulo[modulo_da_acao] IN ('V', 'O', 'A'))
  ```
- Um `nivel = gestor` **não** ganha acesso a módulos fora do seu perfil —
  o nível de usuário só eleva o que o próprio perfil já concede; não é uma
  segunda dimensão independente de acesso.
- A checagem de autorização é sempre avaliada pelo **módulo dono da ação
  sendo executada**, nunca pelo módulo de origem do dado (ver
  `01-USE_CASES.md` UC-37, cenário "Qualidade libera lote que o
  Recebimento criou").

---

## §5. Regra de Auditoria de Perfil/Atribuição

Toda mudança relacionada a perfis de acesso é obrigatoriamente registrada
no log de auditoria (`logAction`, já existente e usado em todo o sistema),
com, no mínimo:

| Campo | Origem | Obrigatoriedade |
|---|---|---|
| `userId` (quem fez) | Sempre do JWT (`req.user.id`) — nunca do body | Obrigatório |
| `timestamp` (quando) | Data/hora do servidor | Obrigatório |
| `action` | `create`/`update`/`deactivate` (perfil) ou `assign`/`reassign` (atribuição a usuário) | Obrigatório |
| `entity` | `AccessProfile` ou `UserAccessAssignment` | Obrigatório |
| `entityId` | id do perfil ou do usuário afetado | Obrigatório |
| `oldValues` | Matriz de permissões anterior completa (na edição) OU perfil/nível anteriores (na atribuição) | Obrigatório quando houver valor anterior |
| `newValues` | Matriz de permissões nova completa OU perfil/nível novos | Obrigatório |

- Eventos cobertos: UC-30 (criar), UC-31 (editar — com valor anterior
  completo), UC-32 (desativar), UC-33 (atribuir/trocar perfil de usuário).
- Este log é **imutável** (mesmo padrão de auditoria já usado no restante
  do sistema — sem soft delete de log, sem edição posterior).
- Tentativas de acesso negado (`403`) também devem gerar um registro (ver
  §8 — nível de detalhe é uma decisão de implementação a validar com
  Segurança/Compliance, não deste documento de negócio).

---

## §6. Regra dos Módulos Agregadores (Dashboard/Relatórios/Rastreabilidade)

Ver `01-USE_CASES.md` UC-38 para o fluxo completo. Resumo normativo:

1. **Dashboard**: módulo próprio (`dashboard`) no perfil; ao acessar, o
   sistema filtra os cards exibidos pela interseção entre os cards
   existentes e os demais módulos concedidos ao perfil — não é bloqueio
   total, é filtragem de conteúdo.
2. **Relatórios**: módulo próprio, com sub-permissões por tipo de
   relatório (`relatorios.producao`, `relatorios.compras`,
   `relatorios.custos`, `relatorios.financeiro`). Relatórios que cruzam
   departamentos (ex.: variação de custo) exigem a sub-permissão
   específica, não são liberados por interseção automática.
3. **Rastreabilidade**: módulo próprio, de leitura, concedido
   explicitamente aos perfis que precisam rastrear ponta a ponta
   (Qualidade, PCP, Controller/Engenharia) — não é herdado
   automaticamente por quem tem acesso a produção ou estoque isoladamente.

---

## §7. Precisão, Isolamento e Rastreabilidade (Invariantes do Projeto Aplicadas a Este Requisito)

- Toda tabela nova (`access_profiles`, `access_profile_permissions`, ou
  equivalente) e todo cálculo (nenhum cálculo numérico é esperado neste
  requisito — é booleano/enum) seguem as invariantes do projeto: 100%
  PostgreSQL local, sem qualquer leitura/escrita no ERP legado.
- `userId` em qualquer registro de auditoria deste requisito **sempre**
  vem de `req.user.id` (JWT) — nunca aceito do corpo da requisição, mesmo
  em endpoints administrativos.
- Onde houver campos monetários/quantidades relacionados aos fluxos
  adicionais (ex.: quantidade de amostra em UC-39), mantém-se o padrão de
  precisão de 6 casas decimais já usado em todo o sistema
  (`DECIMAL(18,6)`).

---

## §8. Convivência com Checagens de `role` JWT Já Existentes (Risco/Gargalo)

- O sistema **já tem** pontos de checagem de `role` global embutidos em
  controllers específicos (ex.: aprovação de requisição exige
  `role = admin`, ver UC-23 de `docs/projeto/04-USE_CASES.md`; cash-flow
  projection exige `admin`/`financial`, ver UC-29).
- Este novo modelo de perfis de área **não substitui** essas checagens
  automaticamente — elas convivem em camadas: primeiro o middleware de
  módulo/nível de área (novo, deste requisito), depois qualquer checagem
  de `role` já codificada no controller (antiga).
- **Risco identificado:** se a checagem de perfil de área liberar um
  `operator` com perfil "Gestor de Compras" nível `gestor` a aprovar uma
  requisição (UC-37), mas o controller legado (UC-23) ainda exigir
  `role === 'admin'` explicitamente, o usuário levará 403 mesmo tendo
  "gestor" no novo modelo — **inconsistência de UX e de regra de
  negócio**. Este documento aponta o risco; a decisão de qual checagem
  prevalece (substituir a checagem de `role` legada pela nova checagem de
  módulo/nível, ou manter ambas cumulativamente) é uma decisão técnica
  de implementação que deve ser validada com o dono antes do
  desenvolvimento — recomenda-se que o novo modelo de perfil de área
  **substitua** as checagens pontuais de `role` em endpoints de aprovação
  já existentes (UC-23, e outros a levantar), para não haver dois
  sistemas de autorização divergentes.

---

## §9. Regras da Requisição de Amostra da Engenharia (UC-39)

- Novo valor de `origin` em `purchase_requisitions`: `engineering_sample`
  (ao lado dos já existentes — confirmar valores atuais do enum com o
  DBA/programador antes de implementar; hoje o sistema já usa `origin='mrp'`
  como precedente de múltiplas origens na mesma tabela).
- `justificativa` (texto) é **obrigatória** quando `origin = 'engineering_sample'`
  — não é obrigatória para as demais origens.
- `project_id` (vínculo ao projeto de P&D, `engineering_projects`) é
  **opcional**.
- Quantidade não tem limite hard-coded, mas a UI deve sinalizar
  visualmente quando a quantidade for atípica para uma amostra (sugestão:
  alerta não bloqueante acima de 50 unidades — parâmetro configurável,
  não regra rígida).
- **Destino em estoque — RESOLVIDO por UC-42:** amostra recebida entra
  automaticamente no **Depósito do Laboratório** (depósito físico
  cadastrável, não mais uma segregação lógica em cima de um estoque
  único), de modo que o MRP e o consumo de produção — que operam apenas
  sobre o Depósito de Insumos — nunca leem/consomem uma quantidade trazida
  como amostra. Ver `BUSINESS_RULES.md` §12 e `01-USE_CASES.md` UC-42.
- O restante do ciclo de vida (aprovação, conversão em pedido, recebimento
  com nota fiscal) reaproveita **integralmente** o workflow já existente
  e documentado em UC-23/UC-25/UC-16 de `docs/projeto/04-USE_CASES.md` —
  nenhuma regra nova de aprovação é criada, apenas a origem e o destino
  físico são diferenciados.

---

## §10. Regras do Semáforo de Handoff (UC-40)

- O indicador de status (`handoff_signal`) é **sempre calculado no
  momento da consulta** (derivado de status + datas dos registros já
  existentes), nunca armazenado como coluna redundante que possa ficar
  dessincronizada da fonte de verdade (`status` do pedido/venda/lote).
- Cores e critérios por cadeia (tabela normativa, replicada de
  `01-USE_CASES.md` UC-40 para referência rápida de implementação):

  | Cadeia | Verde | Amarelo | Vermelho |
  |---|---|---|---|
  | Compras → Recebimento | `sent/approved/partial`, dentro do prazo | — | `expected_date` vencida sem `delivery_date` |
  | Recebimento → Qualidade | — | `quarantine` (aguardando inspeção) | `blocked` |
  | Qualidade → Almoxarifado | `available` | `quarantine` | `blocked` |
  | Vendas → Expedição | `invoiced` | `processing` (NF-e em emissão) | `denied`/`cancelled` |
  | Recebimento/Qualidade → RNC | — | `open`/`in_analysis` | `closed` não efetivo (reincidência) |

- Um documento **não desaparece** da fila do departamento destino por
  estar atrasado (vermelho) — ele permanece visível até ser efetivamente
  concluído (recebido, liberado, embarcado etc.), justamente para forçar
  acompanhamento do atraso.
- Este requisito **não cria** um motor de notificação push/e-mail — é
  puramente sobre enriquecer as listagens já consultadas pelas telas
  existentes com um campo derivado consistente. Notificação ativa
  (push/e-mail/badge de contagem) é uma extensão possível, marcada como
  decisão em aberto (ver `01-USE_CASES.md` UC-40, decisão proposta).

---

## §11. Regras de Emissão de NF-e pelo Vendas (UC-41)

- `sale.status` só avança de `confirmed` para `invoiced` **automaticamente**,
  como efeito colateral da NF-e ser autorizada — nunca é setado
  manualmente (regra já implementada em `ChangeSaleStatusUseCase`, que
  bloqueia `status=invoiced` explícito com erro dedicado).
- `shipped` só é alcançável a partir de `invoiced` — não existe caminho de
  expedição sem NF-e autorizada (regra já implementada, UC-27).
- `shipped` é terminal: cancelamento de NF-e após embarque não reverte
  `sale.status` — é tratado como situação excepcional que exige ação
  logística manual fora do sistema.
- **DECISÃO PROPOSTA:** emissão e cancelamento de NF-e exigem módulo
  `vendas` (ou `faturamento`, se for desmembrado como módulo próprio) com
  nível `A` (aprovar) no perfil **e** `nivel = gestor` do usuário — mesma
  fórmula de §4. Um operador de vendas comum (nível `operador`) não emite
  nem cancela NF-e, mesmo que o módulo do perfil permita `A` — a segunda
  trava de nível de usuário sempre se aplica (consistente com UC-37).

---

## §12. Regras de Múltiplos Depósitos (Armazéns)

**Diretriz de modelagem aprovada pelo dono/orquestrador** (não é mais
decisão em aberto quanto ao "se existem 3 depósitos"; detalhes de
implementação seguem sendo tarefa técnica, ver `TODO.md`):

1. **Depósitos são cadastráveis** (tabela própria, ex.: `warehouses`),
   com 3 registros de seed obrigatórios no primeiro deploy:
   - `INSUMOS` — Depósito de Insumos de Produção (matéria-prima)
   - `ACABADOS` — Depósito de Produto Acabado
   - `LABORATORIO` — Depósito do Laboratório (testes/amostras)
   Depósitos adicionais podem ser cadastrados pelo administrador sem
   alteração de código (ex.: um segundo galpão físico no futuro).

2. **Saldo por depósito.** O saldo de um produto/item deixa de ser um
   único número global — passa a existir uma linha de saldo por par
   `(produto, depósito)`. O "saldo total" de um produto, exibido em
   telas gerenciais/relatórios que não especificam depósito, é sempre a
   **soma** dos saldos em todos os depósitos.

3. **Invariante de soma (obrigatória, testável):**
   ```
   saldo_total(produto) = Σ saldo(produto, depósito) para todo depósito ativo
   ```
   Toda movimentação de estoque (entrada, saída, transferência, ajuste)
   deve preservar esta invariante — nenhuma operação pode alterar o saldo
   total sem uma entrada/saída física correspondente (compra, consumo de
   produção, venda expedida, ajuste de inventário justificado).

4. **Transferência não altera o total.** Uma transferência entre
   depósitos é, por definição, `saldo_total` invariante — debita a origem
   e credita o destino no mesmo valor, na mesma transação atômica. Se a
   soma antes ≠ soma depois de uma transferência, há um bug crítico de
   integridade (candidato a teste automatizado obrigatório).

5. **Precisão:** saldos por depósito seguem o mesmo padrão de precisão
   fracionária do restante do sistema — mínimo de 6 casas decimais
   (`DECIMAL(18,6)`), sem exceção para os novos campos de saldo/movimentação.

6. **Toda movimentação referencia depósito.** Os tipos de movimentação
   existentes (`in`/`out`/`adjustment`) passam a exigir `warehouse_id`
   obrigatório. Novo tipo: `transfer`, que sempre gera **dois** registros
   de movimentação (um `out` na origem, um `in` no destino) vinculados por
   um identificador comum (`transfer_id`), nunca um único registro
   "neutro".

7. **Direcionamento por origem/fluxo (regra de roteamento obrigatória):**
   | Evento | Depósito de destino/origem |
   |---|---|
   | Recebimento de compra, requisição origem `manual`/`mrp` | Entra em `INSUMOS` |
   | Recebimento de compra, requisição origem `engineering_sample` (UC-39) | Entra em `LABORATORIO` |
   | Consumo de componentes em OP | Sai de `INSUMOS` |
   | Conclusão de OP (produto acabado) | Entra em `ACABADOS` |
   | Expedição de venda | Sai **exclusivamente** de `ACABADOS` — nunca lê saldo de outro depósito, mesmo que o produto exista lá |
   | Consumo em teste destrutivo de laboratório | Sai de `LABORATORIO` (ver decisão proposta em UC-42-E: manual vs vinculado ao teste) |
   | Transferência manual (ex.: retrabalho, cessão a laboratório) | Conforme solicitado pelo usuário, sempre com aprovação de gestor (item 8 abaixo) |

8. **Transferência exige aprovação de gestor.** Toda transferência entre
   depósitos nasce em `status = pending` e só se efetiva (débito/crédito
   real) após aprovação por um usuário com `nivel = gestor` no módulo
   `estoque` (mesma fórmula de autorização de §4). Solicitação e
   aprovação são eventos distintos, ambos auditados (quem solicitou,
   quem aprovou, quando, motivo).

9. **Quarentena/bloqueio NÃO são depósitos (regra explícita para não
   confundir os dois conceitos, pedido direto do dono).** `LotControl.status`
   (`quarantine`/`available`/`blocked`/`reserved`/`consumed`/`expired`)
   continua descrevendo **se** um material pode ser consumido; o
   `warehouse_id` descreve **onde** ele está fisicamente. Um lote em
   `quarantine` normalmente está dentro do Depósito de Insumos (onde
   chegou do Recebimento) — a liberação de qualidade (UC-17B) muda o
   `status` do lote, não o move de depósito. As duas dimensões são
   ortogonais e devem permanecer como colunas/domínios independentes no
   modelo de dados — nunca modeladas como um único enum combinado.

10. **Contagem cíclica e extrato filtram por depósito.** Toda sessão de
    contagem de inventário (mobile/QR) passa a ser sempre escopada a um
    único depósito por vez; telas de extrato de movimentação/saldo devem
    aceitar filtro por depósito (com opção "todos" para visão consolidada
    gerencial, que soma os depósitos conforme item 3).

11. **Amarração com a matriz de permissões (§1).** Cada perfil de área
    enxerga, dentro do módulo `estoque` (ou dos módulos
    `recebimento`/`expedicao`/`laboratorio`, conforme o caso), apenas os
    depósitos pertinentes à sua função — não é uma segunda matriz
    independente, é um refinamento dentro da permissão de módulo já
    existente:
    - Almoxarife → enxerga/opera `INSUMOS` (e, tipicamente, `ACABADOS`
      para fins de apoio logístico — a confirmar com o dono se Almoxarife
      deve ou não operar Acabados, ou se isso é exclusivo da Expedição)
    - Recebimento → opera `INSUMOS` (destino padrão) e `LABORATORIO`
      (quando a origem for `engineering_sample`)
    - Expedição → opera exclusivamente `ACABADOS`
    - Analista de Laboratório → opera exclusivamente `LABORATORIO`
    - PCP/Operador de Produção → consome de `INSUMOS`, credita `ACABADOS`
      (via apontamento de OP, não como operação livre de estoque)
    Este refinamento por depósito dentro do módulo é uma extensão da
    matriz do §1 — **pendência técnica**: definir se o campo de permissão
    por depósito é uma lista simples (`warehouses_visible: ['INSUMOS']`)
    dentro da mesma linha de permissão do módulo `estoque`, ou uma tabela
    própria de associação perfil×depósito. Ambas são viáveis; a segunda é
    mais flexível para crescimento (novos depósitos futuros sem alterar
    schema de permissão). **Decisão de desenho técnico a validar com o
    AdmDBA/programador, não bloqueia a especificação de negócio.**

---

## §13. Padrão de Alerta Didático de Pré-Requisitos (Transversal — UC-43)

**Aplicabilidade:** este padrão é **obrigatório em toda tela do sistema**
que executa uma ação com pré-requisitos verificáveis — telas já
existentes (retrofit obrigatório, priorizado pela lista de casos reais
abaixo) e qualquer tela nova a ser construída daqui em diante. Não é
opcional por módulo.

### 13.1 Regra 1 — Validação Preventiva (Checklist)

- Toda tela de ação com pré-requisitos deve exibir, **antes** de o
  usuário tentar a ação, um checklist com cada pré-requisito marcado como
  `✓ atendido` ou `✗ faltando`.
- Cada item `✗` deve trazer, **na própria linha do checklist** (não em
  tooltip, não em modal separado), o motivo específico com dados
  concretos — nunca um texto genérico do tipo "Requisito não atendido".
- O botão da ação principal permanece **desabilitado** enquanto houver
  qualquer `✗` pendente.
- **Regra explícita, não-negociável:** um botão desabilitado **nunca**
  pode existir sem uma explicação visível ao lado — se o motivo do
  desabilitado não pode ser determinado/exibido, o botão deve
  permanecer habilitado e a validação ocorre no backend (fallback para a
  Regra 2), mas o padrão preferencial é sempre a checagem preventiva.
- A re-checagem do checklist não precisa ser em tempo real (não exige
  WebSocket/polling contínuo) — é aceitável recarregar ao reabrir a tela
  ou via um botão explícito "Verificar novamente". Decisão de
  granularidade de refresh é técnica, não bloqueia esta especificação.

### 13.2 Regra 2 — Padrão da Mensagem de Erro (3 Partes, Sempre)

Toda mensagem de erro voltada ao usuário final (seja de uma validação
preventiva não coberta por checklist, seja de uma resposta `4xx` do
backend) deve seguir **exatamente** esta estrutura de 3 partes:

1. **O QUE** — não pode ser feito, nomeando a ação e o documento/entidade
   envolvido (ex.: "Não é possível liberar a OP-2026-0012")
2. **POR QUE** — com dados concretos: nome/código do item, quantidade,
   número de documento, número de lote, status atual — nunca um código de
   erro cru (`BUSINESS_RULE_VIOLATION`, `VALIDATION_ERROR`) exposto como
   texto para o usuário final, e nunca stack trace
3. **O QUE FAZER** — orientação de próximo passo, idealmente com um
   link/atalho de navegação direto para a tela onde o pré-requisito é
   resolvido (ex.: "Solicite a inspeção em Qualidade → Inspeção de
   Recebimento")

- Linguagem sempre de **fábrica** (termos que um almoxarife, comprador ou
  operador de produção reconhece no dia a dia), nunca jargão técnico de
  sistema.
- Este padrão vale tanto para o alerta gerado no frontend a partir de uma
  validação local quanto para a tradução de um erro `4xx` vindo da API.

### 13.3 Regra 3 — Lista Completa de Pendências, Nunca Apenas a Primeira

- Se há múltiplos pré-requisitos não atendidos (seja no checklist
  preventivo, seja no `details` de um erro `422`/`400`), **todos** devem
  ser exibidos de uma vez.
- É uma falha de conformidade com este padrão qualquer tela que force o
  usuário a corrigir um problema, tentar novamente, e só então revelar o
  próximo problema ("erro em cascata" — proibido).
- Isso implica que os casos de uso/endpoints do backend que hoje validam
  e falham no primeiro erro encontrado (`throw` na primeira condição
  violada) devem ser revisados, quando viável, para **coletar todas as
  violações antes de retornar o erro** (ex.: `details: { missing: [...] }`
  como array, não um único motivo). Alguns endpoints já fazem isso
  corretamente (ex.: `ConvertRequisitionToPurchaseOrdersUseCase` já lista
  todos os itens sem fornecedor resolvível, ver UC-25 em
  `docs/projeto/04-USE_CASES.md`) — esse é o padrão a generalizar.

### 13.4 Regra 4 — Nunca um Erro Genérico

- Proibido exibir ao usuário qualquer variação de "Erro ao processar
  solicitação", "Algo deu errado", ou a mensagem crua de uma exceção
  técnica (`error.message` de uma exception JS/SQL não tratada) como
  única informação.
- O contrato de erro já existente no backend (`server/src/errors/index.ts`):
  ```json
  { "success": false, "error": { "code": "BUSINESS_RULE_VIOLATION", "message": "...", "details": {} } }
  ```
  já separa `code` (uso interno/log), `message` (hoje geralmente 1 frase)
  e `details` (dados estruturados, nem sempre presente hoje). O requisito
  deste UC-43 é que o **frontend deixe de descartar `details`** (hoje
  `extractApiErrorMessage` em `client/src/api/httpClient.ts` usa somente
  `message`) e componha as 3 partes da Regra 2 a partir de `message` +
  `details`, com um mapa de "O QUE FAZER" por tipo de erro/contexto de
  tela (ver `TODO.md`).
- Quando um endpoint específico ainda não retorna `details` estruturado
  (dívida técnica pré-existente), o frontend aplica o formato de 3 partes
  mesmo assim, usando `message` para a parte "POR QUE" e uma orientação
  genérica de fallback para "O QUE FAZER" — nunca regride para um alerta
  sem estrutura.

### 13.5 Casos Mapeados (Referência Cruzada)

A tabela completa de casos reais (ação, O QUE, POR QUE, O QUE FAZER) está
em `01-USE_CASES.md` UC-43. Resumo dos endpoints/fluxos já existentes que
devem ser cobertos no retrofit, por ordem de criticidade operacional
(fluxos mais usados no dia a dia primeiro):

1. Liberar OP (material insuficiente / BOM inativa / roteiro não liberado)
2. Concluir OP com etapa de apontamento aberta
3. Embarcar venda sem NF-e autorizada (`PUT /api/sales/:id/status`,
   UC-27)
4. Converter requisição em pedido sem fornecedor resolvível (UC-25)
5. Receber compra sem nota fiscal informada
6. Registrar teste de laboratório sem resultado nem faixa (UC-LAB-01)
7. Converter ordem planejada do MRP já em execução (UC-24)
8. Aprovar requisição fora de sequência de status (UC-23)
9. Liberar/bloquear lote em status terminal (UC-17B)

### 13.6 Não é uma Nova Regra de Negócio

Este UC/seção **não cria nenhuma regra de negócio nova** — todos os
pré-requisitos listados já existem e já são validados pelo backend
(muitos já retornam `422` com alguma informação). O requisito é
exclusivamente sobre **como a informação já existente é apresentada** ao
usuário: preventivamente (checklist) e, quando o erro ocorre mesmo assim,
de forma didática e completa (3 partes, lista integral). Nenhuma
migration de schema é necessária só por causa deste UC — apenas
evolução incremental de `details` em alguns use cases que hoje não o
populam, e trabalho de frontend.

---

## Changelog Deste Documento

| Data | Alteração |
|---|---|
| 2026-08-03 | Criação — matriz módulo × permissão inicial, regras §1–§8 (perfis de acesso configuráveis) |
| 2026-08-03 | Adição §9 (amostra de engenharia), §10 (semáforo de handoff), §11 (NF-e do Vendas) |
| 2026-08-03 | Adição §12 (múltiplos depósitos); §9 atualizado — destino da amostra resolvido pelo Depósito do Laboratório |
| 2026-08-03 | Adição §13 (padrão de alerta didático de pré-requisitos, transversal, UC-43) |
