# Casos de Uso — Requisitos de Negócio (Draft para Implementação)

**Módulo:** Controle de Acesso por Área/Departamento (Perfis de Acesso Configuráveis)
**Numeração:** continuação de `docs/projeto/04-USE_CASES.md` (último UC formal: UC-29).
**Status:** 🟢 Requisito especificado, com todas as decisões de negócio
confirmadas pelo dono em 2026-08-03 — NÃO implementado ainda. Programador
deve ler este arquivo + `docs/business/BUSINESS_RULES.md` antes de codar,
e ao concluir, consolidar os casos de uso implementados em
`docs/projeto/04-USE_CASES.md`.

---

## Contexto e decisões já fechadas com o dono (não reabrir)

1. Modelo: **Perfis de Acesso Configuráveis**. O administrador cria perfis
   (ex.: "Almoxarife", "Analista de Laboratório", "Comprador") marcando,
   módulo a módulo, o que o perfil enxerga.
2. **Bloqueio total** fora da área: módulo fora do perfil não aparece no
   menu **e** a API nega leitura e escrita com `403`.
3. Um funcionário pertence a **uma única área/perfil**.
4. Dois níveis por área: **OPERADOR** (ações do dia a dia) e **GESTOR**
   (tudo do operador + aprovações/gestão da área).
5. O perfil `admin` global (papel JWT existente) continua **acima** de
   qualquer perfil de área — nunca é bloqueado por este sistema.

## Decisões do dono sobre pontos antes em aberto (DECIDIDO em 2026-08-03,
não reabrir — detalhamento completo em cada UC/seção referenciada)

6. **UC-32** (desativar perfil com usuários ativos vinculados):
   **bloquear** a desativação até o admin realocar todos os usuários para
   outro perfil.
7. **UC-35-Exceção** (usuário sem perfil atribuído): **bloqueio total**
   com aviso didático — texto oficial: "Seu acesso ainda não foi
   configurado — procure o administrador."
8. **UC-36** (troca de perfil de usuário logado): **vale no próximo
   login** — não derruba a sessão ativa. Consequência aceita: o usuário
   segue com o conjunto de permissões antigo até logout/expiração natural
   do token. Mitigação para revogação urgente: desativar o usuário
   (`active = false`), mecanismo já existente que força logout imediato.
9. **UC-41** (permissão de NF-e): emissão **e** cancelamento restritos ao
   nível **gestor** do perfil de Vendas, sem distinção entre as duas
   operações.
10. **UC-42 item E** (consumo do Depósito de Laboratório em teste
    destrutivo): **vinculado ao teste** — o registro do teste destrutivo
    (`AcousticTestResult`) debita o depósito automaticamente na mesma
    transação, sem lançamento manual separado.
11. **`BUSINESS_RULES.md` §12 item 11** (permissão por depósito dentro do
    perfil): **lista simples** de depósitos permitidos dentro da própria
    linha de permissão do módulo (`warehouses_visible: [...]`), sem
    tabela de associação perfil×depósito separada.

## Atores (novos, adicionais aos já listados em `docs/projeto/04-USE_CASES.md`)

| Ator | Descrição |
|------|-----------|
| **Administrador Global** | Papel JWT `admin`. Cria/edita/desativa perfis de acesso, atribui perfis a usuários. Nunca é bloqueado por este sistema. |
| **Gestor de Área** | Usuário com perfil de área e `nivel = gestor`. Executa tudo que o operador da área executa, mais ações de aprovação/liberação/gestão daquela área. |
| **Operador de Área** | Usuário com perfil de área e `nivel = operador`. Executa as ações do dia a dia da área, sem aprovações. |

---

## UC-30: Criar Perfil de Acesso (Área/Departamento)

**Ator:** Administrador Global
**Pré-condições:** Usuário autenticado com papel JWT `admin`
**Endpoint proposto:** `POST /api/access-profiles`

**Fluxo Principal:**
1. Administrador acessa "Usuários > Perfis de Acesso > Novo Perfil"
2. Informa `nome` (ex.: "Almoxarife"), `descricao` opcional
3. Para cada módulo do sistema (lista fixa do sistema — ver
   `BUSINESS_RULES.md`, matriz módulo × permissão), marca o nível de acesso
   do perfil naquele módulo: `nenhum` (padrão, não marcado) | `ver` |
   `operar` | `aprovar`
4. Sistema valida que ao menos um módulo tem acesso diferente de `nenhum`
   (perfil vazio não faz sentido — ver Fluxo Alternativo)
5. Sistema salva o perfil com `criado_por` = usuário autenticado (JWT),
   `criado_em` = timestamp do servidor
6. Sistema registra log de auditoria (`logAction`, ação `create`, entidade
   `AccessProfile`)
7. Sistema exibe "Perfil criado com sucesso"

**Fluxo Alternativo (nome duplicado):**
- Sistema retorna 409 CONFLICT — "Já existe um perfil com este nome"

**Fluxo Alternativo (perfil sem nenhuma permissão marcada):**
- Sistema retorna 422 BUSINESS_RULE_VIOLATION — "Perfil deve conceder
  acesso a pelo menos um módulo"

**Fluxo Alternativo (usuário não é admin):**
- Sistema retorna 403 FORBIDDEN

**Critérios de Aceite (BDD):**
```gherkin
Cenário: Administrador cria perfil com módulos válidos
  Dado que estou autenticado como admin
  Quando envio POST /api/access-profiles com nome "Almoxarife" e
    permissões { estoque: "operar", producao: "ver" }
  Então o sistema responde 201
  E o perfil é persistido com criado_por = meu user id (do JWT, nunca do body)
  E um registro de auditoria é criado com ação "create"

Cenário: Nome de perfil duplicado
  Dado que já existe um perfil "Almoxarife"
  Quando tento criar outro perfil "Almoxarife"
  Então o sistema responde 409

Cenário: Não-admin tenta criar perfil
  Dado que estou autenticado com papel "operator"
  Quando envio POST /api/access-profiles
  Então o sistema responde 403
```

**Regras de Negócio:** ver `BUSINESS_RULES.md` §1 (matriz módulo ×
permissão) e §3 (regra do admin global).

---

## UC-31: Editar Perfil de Acesso

**Ator:** Administrador Global
**Pré-condições:** Perfil de acesso existente
**Endpoint proposto:** `PUT /api/access-profiles/:id`

**Fluxo Principal:**
1. Administrador acessa o perfil existente e altera nome, descrição e/ou
   a matriz de permissões por módulo
2. Sistema valida as mesmas regras do UC-30 (nome único, ao menos um
   módulo com acesso)
3. Sistema salva o **valor anterior completo da matriz de permissões**
   junto ao log de auditoria (obrigatório — ver `BUSINESS_RULES.md` §5)
4. Sistema atualiza o perfil e registra `atualizado_por`/`atualizado_em`
5. **Efeito imediato:** todos os usuários atualmente atribuídos a este
   perfil passam a refletir a nova matriz de permissões na **próxima
   requisição de API** (o middleware de autorização consulta a permissão
   em tempo real, não há cache de sessão no payload do JWT); o menu
   renderizado no frontend segue a mesma regra decidida em UC-36 (vale de
   fato no próximo login para fins de exibição, embora a autorização real
   de API já seja imediata)

**Fluxo Alternativo (perfil não existe):**
- Sistema retorna 404 NOT_FOUND

**Fluxo Alternativo (remoção de módulo que deixaria perfil vazio):**
- Sistema retorna 422 BUSINESS_RULE_VIOLATION, mesma regra do UC-30

**Critérios de Aceite (BDD):**
```gherkin
Cenário: Editar permissões de um perfil em uso
  Dado que o perfil "Almoxarife" tem 3 usuários atribuídos
  E o perfil tem acesso "ver" ao módulo "compras"
  Quando o admin altera a permissão de "compras" para "nenhum"
  Então a próxima requisição de qualquer usuário com perfil "Almoxarife"
    ao módulo "compras" retorna 403
  E o log de auditoria registra o valor anterior ({ compras: "ver" }) e o
    novo valor ({ compras: "nenhum" })
```

**Regras de Negócio:** toda mudança de matriz de permissões é auditada com
quem/quando/valor anterior (ver `BUSINESS_RULES.md` §5).

---

## UC-32: Desativar (Inativar) Perfil de Acesso

**Ator:** Administrador Global
**Pré-condições:** Perfil de acesso existente e ativo
**Endpoint proposto:** `PATCH /api/access-profiles/:id/status` (`{ "active": false }`)

**Fluxo Principal:**
1. Administrador solicita a desativação de um perfil
2. Sistema verifica se há usuários ativos atribuídos a este perfil (ver
   Fluxo Alternativo — DECIDIDO)
3. Sistema marca o perfil como `active = false` (soft delete — nunca
   remove o registro, por auditoria/histórico, seguindo o padrão do
   projeto para entidades de configuração)
4. Sistema registra log de auditoria (quem/quando/motivo, se informado)

**Fluxo Alternativo — DECIDIDO (2026-08-03) (perfil em uso):**
> **Decisão do dono:** bloquear a desativação com 422 BUSINESS_RULE_VIOLATION
> enquanto houver usuário ativo com este perfil atribuído, listando os
> usuários afetados — o admin deve realocar (reatribuir) **todos** os
> usuários vinculados para outro perfil antes de conseguir desativar este.
> Evita usuários "órfãos" (ver UC-35-Exceção). A alternativa mais
> permissiva (desativar e tratar como "sem perfil") foi descartada.

**Critérios de Aceite (BDD):**
```gherkin
Cenário: Tentar desativar perfil com usuários ativos (regra decidida)
  Dado que o perfil "Comprador" tem 2 usuários ativos vinculados
  Quando o admin tenta desativar o perfil "Comprador"
  Então o sistema responde 422
  E a mensagem lista os 2 usuários afetados

Cenário: Desativar perfil após realocar todos os usuários vinculados
  Dado que o perfil "Comprador" tinha 2 usuários ativos vinculados
  E o admin reatribuiu (UC-33) os 2 usuários para outro perfil
  Quando o admin tenta desativar o perfil "Comprador" novamente
  Então o sistema responde 200 e o perfil fica com active = false

Cenário: Desativar perfil sem usuários vinculados
  Dado que o perfil "Analista de Comex" não tem usuários vinculados
  Quando o admin desativa o perfil
  Então o sistema responde 200 e o perfil fica com active = false
  E o perfil não aparece mais na lista de perfis disponíveis para
    atribuição a novos usuários
```

---

## UC-33: Atribuir Perfil de Acesso a Usuário

**Ator:** Administrador Global
**Pré-condições:** Usuário e perfil de acesso existentes e ativos
**Endpoint proposto:** `PATCH /api/users/:id/access-profile` (`{ "access_profile_id": <id>, "nivel": "operador"|"gestor" }`)

**Fluxo Principal:**
1. Administrador acessa "Usuários > Editar Usuário"
2. Seleciona um perfil de acesso (lista de perfis ativos) e o nível
   (`operador` ou `gestor`)
3. Sistema valida que o perfil selecionado está ativo
4. Sistema salva `access_profile_id` e `nivel` no usuário, substituindo
   qualquer atribuição anterior (um usuário tem no máximo um perfil — ver
   `BUSINESS_RULES.md` §2)
5. Sistema registra log de auditoria com valor anterior (perfil/nível
   antigos) e novo valor
6. Sistema exibe "Perfil atribuído com sucesso"

**Fluxo Alternativo (perfil inativo ou inexistente):**
- Sistema retorna 404 NOT_FOUND ou 422 se o perfil existir mas estiver
  `active = false`

**Fluxo Alternativo (usuário é admin global):**
- Sistema permite a atribuição (não é bloqueante), mas ela é **irrelevante
  em runtime**: o papel `admin` sempre ignora a checagem de perfil de área
  (ver `BUSINESS_RULES.md` §3). Recomenda-se a UI avisar isso ao operador
  ("Usuários admin não são afetados por perfis de área").

**Critérios de Aceite (BDD):**
```gherkin
Cenário: Atribuir perfil pela primeira vez
  Dado que o usuário "joao@evokaudio.com" não tem perfil de acesso
  Quando o admin atribui o perfil "Almoxarife" nível "operador"
  Então o usuário passa a enxergar, no próximo login/refresh de menu,
    apenas os módulos marcados como ver/operar/aprovar no perfil
    "Almoxarife"

Cenário: Trocar perfil de usuário já atribuído
  Dado que o usuário tem o perfil "Expedição"
  Quando o admin atribui o perfil "Laboratório"
  Então o perfil anterior ("Expedição") deixa de valer imediatamente
  E o log de auditoria registra { anterior: "Expedição", novo: "Laboratório" }
```

---

## UC-34: Login e Montagem do Menu Conforme Perfil

**Ator:** Operador de Área, Gestor de Área, Administrador Global
**Pré-condições:** Usuário cadastrado, ativo, com ou sem perfil de acesso
atribuído
**Endpoint envolvido:** `POST /api/auth/login` (existente) + endpoint
proposto `GET /api/auth/me/menu` (ou payload de login já retorna o menu
resolvido)

**Fluxo Principal:**
1. Usuário faz login (fluxo já existente — UC-01 de
   `docs/projeto/04-USE_CASES.md`)
2. Sistema identifica o papel JWT do usuário:
   - Se `role = admin`: sistema monta o menu completo (todos os módulos)
   - Se `role != admin`: sistema consulta o `access_profile_id` do usuário
     e monta o menu **apenas** com os módulos cuja permissão no perfil for
     `ver`, `operar` ou `aprovar` (qualquer nível diferente de `nenhum`)
3. Sistema retorna a lista de módulos visíveis e, para cada módulo, o
   nível de permissão do usuário (`ver`/`operar`/`aprovar`) — o frontend
   usa isso para habilitar/desabilitar botões de ação dentro da tela (ex.:
   botão "Aprovar Requisição" só aparece se nível = `aprovar`)
4. Frontend renderiza o menu lateral apenas com os itens retornados

**Fluxo Alternativo — usuário sem perfil atribuído (ver DECIDIDO
(2026-08-03) no UC-35-Exceção):**
- Sistema aplica a política definida no UC-35-Exceção: bloqueio total,
  com aviso didático orientando o usuário a procurar o administrador

**Critérios de Aceite (BDD):**
```gherkin
Cenário: Login de usuário com perfil "Comprador" nível operador
  Dado que o usuário tem access_profile "Comprador" com
    { compras: "operar", requisicoes: "ver", fornecedores: "operar" }
  Quando o usuário faz login
  Então o menu retornado contém apenas os itens Compras, Requisições e
    Fornecedores
  E o item Requisições vem marcado com nível "ver" (somente leitura)
  E módulos como "Financeiro" e "Produção" não aparecem no menu

Cenário: Login de admin global
  Dado que o usuário tem role "admin"
  Quando faz login
  Então o menu retornado contém todos os módulos do sistema, independente
    de qualquer access_profile_id que porventura tenha
```

---

## UC-35: Tentativa de Acesso a Módulo Fora do Perfil (Tela e API)

**Ator:** Operador de Área, Gestor de Área
**Pré-condições:** Usuário autenticado com perfil de acesso que não cobre
o módulo solicitado

**Fluxo Principal (tela):**
1. Como o módulo não aparece no menu (UC-34), o caminho normal do usuário
   já não oferece a navegação
2. Se o usuário acessar a URL diretamente (ex.: digitar `/financial` na
   barra de endereço), o frontend deve exibir uma tela "Acesso Negado"
   (403), sem tentar renderizar dados parciais do módulo

**Fluxo Principal (API) — Fluxo de Exceção:**
1. Usuário (ou script/integração) chama um endpoint de um módulo fora do
   seu perfil (ex.: `GET /api/financial/accounts-payable`)
2. Middleware de autorização por módulo intercepta a requisição **antes**
   de qualquer controller/use case rodar
3. Sistema verifica: `role = admin`? Se sim, libera. Senão, resolve o
   módulo do endpoint acessado e consulta a permissão do
   `access_profile_id` do usuário para aquele módulo
4. Se a permissão for `nenhum` (ou o usuário não tiver perfil — ver
   UC-35-Exceção), sistema retorna 403 **sem revelar dados** (mesmo
   comportamento para GET e para métodos de escrita — POST/PUT/PATCH/DELETE)
5. Sistema registra tentativa em log de auditoria/segurança (ação
   `access_denied`, com `userId`, módulo solicitado, método HTTP,
   timestamp)

**Fluxo Alternativo — Ação de escrita vs leitura dentro do módulo
permitido, mas sem nível suficiente:**
- Usuário tem `ver` no módulo, mas tenta `POST`/`PUT`/`DELETE`: sistema
  retorna 403 (nível insuficiente — `ver` não inclui escrita)
- Usuário tem `operar`, mas a ação específica exige `aprovar` (ex.:
  aprovar requisição, liberar lote): sistema retorna 403 (ver UC-37 para
  detalhamento operador vs gestor)

**Critérios de Aceite (BDD):**
```gherkin
Cenário: Operador de Expedição tenta ler dados do Laboratório via API
  Dado que o usuário tem perfil "Expedição" sem acesso ao módulo "laboratorio"
  Quando ele chama GET /api/laboratory/tests
  Então o sistema responde 403
  E nenhum dado de teste de laboratório é retornado no corpo da resposta
  E um registro de auditoria de acesso negado é criado

Cenário: Operador com nível "ver" tenta escrever
  Dado que o usuário tem perfil com { compras: "ver" }
  Quando ele chama POST /api/purchases
  Então o sistema responde 403

Cenário: Frontend bloqueia navegação direta por URL
  Dado que o usuário não tem acesso ao módulo "financial"
  Quando ele acessa diretamente a URL /financial no navegador
  Então a aplicação exibe a tela "Acesso Negado", sem chamar endpoints do
    módulo financeiro
```

---

## UC-35-Exceção: Usuário Sem Perfil de Acesso Atribuído

**Contexto:** usuário `role != admin` (ex.: `operator`, `financial`) que
ainda não teve um `access_profile_id` atribuído (ex.: recém-criado, ou
perfil anterior foi desativado).

> **DECIDIDO (2026-08-03):** bloqueio total com aviso didático, e não
> acesso mínimo. Justificativa: o modelo de negócio já fechado é
> "bloqueio total fora da área" — um usuário sem área definida não tem
> uma área, logo não deve enxergar nada além do próprio perfil de usuário
> (tela de "meus dados") e uma mensagem clara orientando a contatar o
> administrador. Dar "acesso mínimo" a um conjunto arbitrário de módulos
> contradiria a regra #2 já fechada com o dono e criaria uma zona
> cinzenta de permissão implícita. A alternativa de liberar
> Dashboard + Relatórios como "acesso mínimo universal" foi descartada.
> **Texto oficial do aviso (copy aprovado pelo dono):** "Seu acesso ainda
> não foi configurado — procure o administrador."

**Fluxo Principal (com a decisão confirmada acima):**
1. Usuário sem `access_profile_id` faz login com sucesso (autenticação
   continua funcionando — a restrição é de autorização, não de
   autenticação)
2. Sistema monta o menu contendo **apenas** um item: "Meu Perfil" (dados
   pessoais, troca de senha) e uma mensagem no topo, em destaque:
   **"Seu acesso ainda não foi configurado — procure o administrador."**
   (este texto segue o Padrão de Alerta Didático de UC-43/
   `BUSINESS_RULES.md` §13 — é direto, sem jargão técnico, e já indica o
   próximo passo)
3. Qualquer chamada de API a módulos de negócio retorna 403 (mesmo
   comportamento do UC-35)

**Critérios de Aceite (BDD):**
```gherkin
Cenário: Usuário novo sem perfil atribuído faz login
  Dado que o usuário "novo@evokaudio.com" tem role "operator" e
    access_profile_id = null
  Quando ele faz login
  Então o sistema autentica com sucesso (200, token emitido)
  E o menu retornado contém apenas "Meu Perfil"
  E qualquer chamada a GET /api/sales, /api/inventory, etc. retorna 403
```

---

## UC-36: Troca de Perfil de Usuário Logado (Vale no Próximo Login)

**Ator:** Administrador Global (ação), Usuário afetado (impacto)
**Pré-condições:** Usuário-alvo pode ou não estar com sessão ativa (token
JWT válido) no momento em que o admin altera seu perfil

> **DECIDIDO (2026-08-03):** a troca de perfil **não derruba a sessão
> ativa**. O novo perfil/nível vale a partir do **próximo login** do
> usuário — não é forçada invalidação de token nem exigido novo login
> imediato (mecanismo `permissionVersion`/reaproveitamento de
> `passwordVersion`, cogitado na proposta original, **não será
> implementado como obrigatório** — ver nota de escopo abaixo).
>
> **Consequência aceita (registrada explicitamente, por instrução do
> dono):** um usuário com sessão ativa no momento da troca de perfil
> continua operando, durante o tempo restante daquela sessão (até
> logout manual ou expiração natural do token, hoje 7 dias TTL), com o
> **conjunto de permissões antigo** — mesmo que o admin já tenha
> revogado/alterado o acesso dele no banco. Isso é uma janela de acesso
> "desatualizado" aceita conscientemente pelo negócio, em troca de
> simplicidade (não força logout inesperado de um usuário no meio de uma
> operação, ex.: no meio de um apontamento de produção).
>
> **Mitigação recomendada para o caso urgente (ex.: desligamento ou
> suspeita de uso indevido):** se o admin precisar revogar o acesso de um
> usuário **imediatamente**, deve usar o mecanismo já existente de
> **desativar o usuário** (`active = false`) — o middleware de
> autenticação já bloqueia usuários inativos em toda requisição
> (`server/src/middlewares/auth.ts`, checagem `if (!user.active)`,
> `401 — Usuário inativo`), efetivamente forçando logout imediato. Trocar
> apenas o perfil (mantendo o usuário ativo) é para o caso comum de
> realocação de função, não para revogação de emergência.

**Fluxo Principal (decisão final):**
1. Administrador troca o perfil (ou nível) de um usuário (UC-33)
2. Sistema grava o novo `access_profile_id`/`nivel` imediatamente no
   banco — mas **não** invalida o token/sessão já emitidos
3. Enquanto o usuário não fizer logout/novo login, seu token continua
   válido e o middleware de autorização por módulo consulta o perfil
   **atual** do usuário no banco a cada requisição (não há cache de
   permissão no payload do JWT) — na prática, a maior parte das checagens
   já reflete o novo perfil quase imediatamente, **exceto** onde o
   frontend cacheia o menu/nível localmente durante a sessão (ver Nota de
   Escopo)
4. No próximo login (voluntário, ou forçado por expiração/logout), o
   usuário recebe o menu e as permissões já 100% consistentes com o novo
   perfil

**Nota de escopo (esclarecimento técnico registrado para não gerar
ambiguidade na implementação):** como o middleware de autorização por
módulo (Bloco 1) consulta o `access_profile_id` do usuário no banco a
cada requisição — e não embute o perfil no payload do JWT — a troca de
perfil já tem efeito quase imediato nas chamadas de **API** subsequentes,
mesmo sem novo login. O que **só** atualiza no próximo login é o **menu
renderizado no frontend** (que pode ter sido montado/cacheado no momento
do login anterior). Ou seja: um usuário rebaixado de gestor para operador
pode, tecnicamente, ainda ver um botão de "Aprovar" no menu antigo
cacheado até relogar — mas ao clicar, a API já vai negar com 403,
consistente com o novo perfil. Isso é aceitável dentro da decisão do
dono (não é a "janela de acesso antigo total" mencionada acima — é
apenas uma inconsistência visual até o próximo login, não uma brecha de
segurança real, pois a decisão de autorização de fato sempre roda no
backend). O mecanismo `permissionVersion` fica registrado como **melhoria
futura opcional** (ver `TODO.md`) caso o negócio queira, no futuro, forçar
consistência imediata de menu também.

**Critérios de Aceite (BDD):**
```gherkin
Cenário: Admin rebaixa usuário de Gestor para Operador durante sessão ativa
  Dado que o usuário está logado com perfil "Compras" nível "gestor"
  E ele tem um token JWT válido em uso
  Quando o admin altera o nível dele para "operador"
  Então a sessão do usuário NÃO é invalidada (token antigo continua
    autenticando)
  E qualquer nova requisição de API do usuário já é avaliada contra o
    nível "operador" atual (tentativa de aprovar requisição retorna 403)
  E o menu do frontend só reflete 100% o novo perfil após o próximo login

Cenário: Admin precisa revogar acesso imediatamente (mitigação)
  Dado que o admin identificou uso indevido de um usuário com sessão ativa
  Quando o admin desativa o usuário (active = false), em vez de apenas
    trocar o perfil
  Então a próxima requisição desse usuário, com o token antigo, retorna
    401 "Usuário inativo" — acesso revogado de fato, sem esperar logout
    voluntário ou expiração do token
```

---

## UC-37: Ação de Gestor vs Operador Dentro da Área

**Ator:** Operador de Área, Gestor de Área
**Pré-condições:** Usuário com perfil de área atribuído; módulo com nível
`operar` ou `aprovar`

**Regra central:** a permissão de aprovação é uma propriedade do **nível
do usuário dentro do perfil** (`operador`/`gestor`), combinada com a
permissão do **módulo** (`operar` habilita ações do dia a dia; `aprovar`
habilita ações de gestão/aprovação daquele módulo). Um usuário só executa
uma ação de aprovação se: (a) o módulo da ação está no seu perfil com
nível `aprovar`, **e** (b) seu `nivel` de usuário é `gestor`. Um operador
nunca aprova, mesmo que o admin (por engano) marque o módulo como
`aprovar` no perfil — a checagem de nível de usuário é uma segunda trava
(ver `BUSINESS_RULES.md` §4).

**Fluxo Principal (operador executa ação do dia a dia):**
1. Operador do Almoxarifado registra uma movimentação de estoque
2. Middleware valida: módulo "estoque" está no perfil com `operar`? Sim.
   Ação é de escrita comum (não é uma ação marcada como "requer aprovar")
3. Sistema executa a movimentação normalmente

**Fluxo Alternativo (gestor aprova requisição):**
1. Gestor de Compras acessa uma requisição pendente
2. Aciona a aprovação (`PATCH /api/purchase-requisitions/:id/status` com
   `status=approved` — endpoint já existente, ver UC-23 de
   `docs/projeto/04-USE_CASES.md`)
3. Middleware valida: módulo "requisicoes" está no perfil com `aprovar`?
   Sim. `nivel` do usuário é `gestor`? Sim
4. Sistema executa a aprovação normalmente

**Fluxo de Exceção (operador tenta aprovar):**
1. Operador de Compras (nível `operador`, não `gestor`) tenta aprovar a
   mesma requisição
2. Middleware valida: módulo tem `aprovar`? Sim (o módulo permite
   aprovação a quem for gestor). `nivel` do usuário é `gestor`? Não
3. Sistema retorna 403 FORBIDDEN — "Ação de aprovação restrita a gestores
   da área"

**Nota de compatibilidade:** este UC-37 **não substitui** a regra
existente de UC-23 (aprovação de requisição restrita a `role=admin`
global) — ela é **adicionada em camada**: primeiro passa pelo novo
middleware de módulo/nível de área (novo), depois pela checagem de role
JWT já existente no controller. Ver risco/gargalo em
`BUSINESS_RULES.md` §8 sobre convivência das duas checagens.

**Critérios de Aceite (BDD):**
```gherkin
Cenário: Gestor de Qualidade libera lote em quarentena
  Dado que o usuário tem perfil "Qualidade" nível "gestor"
  E o perfil tem { qualidade: "aprovar", estoque: "ver" }
  Quando ele chama POST /api/inventory/lots/:id/release
  Então o sistema executa a liberação normalmente (200)

Cenário: Operador de Qualidade tenta liberar lote
  Dado que o usuário tem perfil "Qualidade" nível "operador"
  E o perfil tem { qualidade: "aprovar" } (nível de módulo, não de usuário)
  Quando ele chama POST /api/inventory/lots/:id/release
  Então o sistema responde 403 "Ação de aprovação restrita a gestores da área"

Cenário: Qualidade libera lote criado pelo Recebimento (permissão é do módulo, não do dado)
  Dado que o lote foi criado pela ação de recebimento do Almoxarife
  E o usuário logado tem perfil "Qualidade" nível "gestor", com acesso
    "aprovar" ao módulo "qualidade" (que inclui a ação de liberar/bloquear lote)
  Quando ele libera o lote
  Então o sistema permite a ação, pois a permissão avaliada é sobre o
    MÓDULO "qualidade" (dono da ação de liberação), não sobre qual área
    originalmente criou o registro do lote
```

**Regra explícita (gargalo tratado):** a autorização de uma ação é sempre
avaliada pelo módulo **dono da ação sendo executada**, nunca pelo módulo
que originou o dado sendo lido/alterado. Isto é o que permite Qualidade
liberar um lote que o Recebimento criou: a ação "liberar lote" pertence ao
módulo `qualidade` (ou `estoque`/`inventory`, conforme mapeamento da
matriz — ver `BUSINESS_RULES.md` §1), e é essa permissão que é checada —
não importa que o registro (`LotControl`) tenha sido originalmente escrito
por uma ação do módulo `compras`/`recebimento`.

---

## UC-38: Endpoints Compartilhados Entre Áreas (Rastreabilidade, Dashboard, Relatórios)

**Contexto/Gargalo identificado:** módulos como Rastreabilidade
(agregam dados de produção + qualidade + estoque + vendas), Dashboard
(cards de várias áreas) e Relatórios (cruzam departamentos, ex.: variação
de custo cruza Compras + Produção + Financeiro) não pertencem a uma única
área operacional — não faz sentido negar Dashboard/Relatórios a todo mundo
que não seja "dono" de todos os dados exibidos.

**Regra proposta e adotada como requisito (não é mais decisão em aberto,
é a forma como a matriz deve ser modelada — mas o dono deve validar a
lista de módulos "agregadores" abaixo):**

1. **Dashboard** é seu próprio módulo no perfil (`dashboard`). Ao acessar,
   o sistema não aplica bloqueio total: ele **filtra os cards exibidos**
   pela interseção entre os cards existentes e os módulos que o perfil do
   usuário também enxerga (ex.: perfil "Almoxarife" com acesso a
   `estoque` e `producao` vê os cards de estoque e produção no dashboard,
   mas não vê o card de "Contas a Pagar", mesmo com `dashboard: ver`
   marcado). Isso é uma exceção deliberada à regra de bloqueio total,
   pois o Dashboard é uma "vitrine" agregadora, não um módulo de dado
   único.
2. **Relatórios** é seu próprio módulo no perfil (`relatorios`), com
   sub-permissões por tipo de relatório recomendadas na matriz (ex.:
   `relatorios.producao`, `relatorios.compras`, `relatorios.custos`,
   `relatorios.financeiro`) — cada perfil só acessa os relatórios das
   áreas que também enxerga como módulo operacional. Relatórios
   cross-área (ex.: variação de custo, que cruza Compras/Produção/
   Financeiro) exigem `relatorios.custos` explicitamente concedido —
   tipicamente reservado a Controller/Diretoria, não ao Almoxarife.
3. **Rastreabilidade** é seu próprio módulo (`rastreabilidade`), de
   leitura, e é o único módulo do sistema com uma exceção documentada de
   "leitura ampla por natureza" (rastrear um lote exige atravessar
   recebimento → produção → expedição). Perfis que precisam rastrear (ex.:
   Qualidade, PCP, Controller) recebem `rastreabilidade: ver`
   explicitamente — não é concedido automaticamente a todo mundo.

**Fluxo Principal (Dashboard filtrado):**
1. Usuário com perfil "Almoxarife" ({ estoque: operar, producao: ver,
   dashboard: ver }) acessa o Dashboard
2. Sistema calcula a lista de cards a exibir = cards do sistema ∩ módulos
   com permissão ≠ nenhum no perfil do usuário
3. Sistema retorna apenas os cards de Estoque e Produção; cards de
   Financeiro/Vendas não aparecem, mesmo que existam no sistema

**Fluxo Principal (Relatório de Variação de Custo — UC-26):**
1. Usuário tenta acessar `GET /api/reports/cost-variance`
2. Middleware valida se o perfil do usuário tem
   `relatorios.custos = ver` (ou nível superior)
3. Se não tiver, retorna 403, mesmo que o usuário tenha acesso a
   `compras` e `producao` isoladamente — o relatório cruzado exige
   permissão própria

**Critérios de Aceite (BDD):**
```gherkin
Cenário: Dashboard mostra apenas cards dos módulos do perfil
  Dado que o perfil do usuário tem { estoque: "ver", producao: "ver" }
    e nenhum outro módulo de negócio
  Quando ele acessa GET /api/dashboard
  Então a resposta contém apenas os cards de estoque e produção
  E não contém os cards de financeiro, vendas ou compras

Cenário: Relatório cruzado exige permissão própria
  Dado que o perfil do usuário tem { compras: "operar", producao: "ver" }
    mas NÃO tem { relatorios.custos: "ver" }
  Quando ele chama GET /api/reports/cost-variance
  Então o sistema responde 403

Cenário: Rastreabilidade é módulo próprio, não herdado
  Dado que o perfil "Operador de Produção" tem { producao: "operar" } mas
    NÃO tem { rastreabilidade: "ver" }
  Quando ele chama o endpoint de rastreabilidade de um lote
  Então o sistema responde 403, mesmo ele tendo acesso operacional a
    Produção
```

---

## UC-39: Requisição de Amostra da Engenharia (Insumos para Protótipo)

**Ator:** Engenheiro de Produto (solicitante), Comprador (execução),
Almoxarife/Recebimento (entrada física)
**Pré-condições:** Projeto de P&D existente (opcional — ver Regra de
Negócio); item/insumo a amostrar cadastrado ou identificável para cadastro
rápido
**Endpoint envolvido:** reaproveita o fluxo já existente Requisição →
Pedido → Recebimento (`purchase_requisitions`, ver UC-25 de
`docs/projeto/04-USE_CASES.md`), com uma variante de **origem**

**Fluxo Principal:**
1. Engenheiro de Produto acessa "Engenharia > Solicitar Amostra" e cria
   uma Requisição de Compra com `origin = 'engineering_sample'` (novo
   valor de origem, ao lado dos já existentes `manual`/`mrp`),
   informando: item(ns), quantidade (tipicamente pequena — 1 a poucas
   unidades, sem limite hard-coded, mas a UI deve sinalizar quando a
   quantidade for incomum para uma amostra, ex.: > 50 unidades),
   `project_id` do projeto de P&D vinculado (opcional — ver Regra de
   Negócio), e uma justificativa textual obrigatória
2. Sistema salva a requisição com `status = 'draft'` e `requester_id` =
   usuário autenticado (JWT, nunca do body)
3. Fluxo segue **exatamente** o workflow já existente: `draft → pending`
   (engenheiro confirma) `→ approved` (aprovação, ver UC-23) `→` conversão
   em Pedido de Compra (UC-25) `→` envio ao fornecedor `→` recebimento
   físico com nota fiscal (UC-16)
4. No Recebimento, o item da requisição de origem `engineering_sample`
   aparece sinalizado visualmente (badge "Amostra — Engenharia") na tela
   de conferência, para que o Almoxarife saiba que o destino não é o
   estoque produtivo comum
5. Ao dar entrada, o Almoxarife/Recebimento direciona o material
   automaticamente para o Depósito do Laboratório (regra resolvida por
   UC-42, ver abaixo)

**Regra de Negócio — vínculo a projeto:**
- `project_id` é **opcional**: nem toda amostra nasce de um projeto formal
  de P&D já cadastrado (pode ser uma investigação exploratória). Quando
  informado, cria rastreabilidade entre o insumo recebido e o projeto
  (`UC-ENG-01` em `docs/projeto/04-USE_CASES.md`), útil para apuração de
  custo do protótipo.

**Destino da amostra no estoque — RESOLVIDO por UC-42 (Múltiplos
Depósitos):**
> A dúvida original ("estoque segregado lógico vs estoque normal
> marcado") foi resolvida estruturalmente: o sistema passa a ter um
> **Depósito do Laboratório** físico e cadastrável (ver UC-42). Toda
> amostra recebida de uma requisição `engineering_sample` entra
> automaticamente nesse depósito — nunca no Depósito de Insumos de
> Produção — o que impede por construção que o MRP ou uma OP consumam uma
> amostra por engano (o MRP e o consumo de produção só enxergam saldo do
> Depósito de Insumos, ver UC-42 Fluxo C). Não há mais necessidade de uma
> flag lógica `is_sample` improvisada em cima do estoque único.

**Fluxo Alternativo (requisição sem justificativa):**
- Sistema retorna 422 BUSINESS_RULE_VIOLATION — justificativa é
  obrigatória para `origin = 'engineering_sample'` (auditoria de por que o
  insumo foi trazido)

**Critérios de Aceite (BDD):**
```gherkin
Cenário: Engenheiro solicita amostra vinculada a projeto
  Dado que existe um projeto de P&D "Novo Tweeter TW-30" (status "design")
  Quando o engenheiro cria uma requisição com origin "engineering_sample",
    2 unidades de um componente e project_id do projeto acima
  Então a requisição é criada em draft, com project_id preenchido
  E segue o mesmo workflow de aprovação/conversão já existente

Cenário: Recebimento identifica visualmente uma amostra
  Dado que uma requisição "engineering_sample" foi convertida em pedido e
    o pedido foi enviado ao fornecedor
  Quando o Almoxarife abre a tela de Recebimento
  Então o item aparece com o badge "Amostra — Engenharia"
  E (decisão proposta) o sistema orienta a dar entrada na localização
    segregada de amostras, não no estoque produtivo comum

Cenário: Requisição de amostra sem justificativa
  Quando o engenheiro tenta criar a requisição sem preencher justificativa
  Então o sistema responde 422
```

**Regras de Negócio adicionais:** ver `BUSINESS_RULES.md` §9.

---

## UC-40: Handoff Entre Departamentos com Status Visual (Semáforo)

**Contexto/Requisito central do dono:** "fiz um pedido de compra; quando
eu finalizar, irá aparecer na tela do Recebimento todas as informações
desse pedido e o status, por exemplo uma bolinha verde sinalizando que foi
feito pedido de insumo e vai chegar; quando chegar, ele recebe a
mercadoria mudando o status." Generalização: todo documento que atravessa
mais de um departamento deve **aparecer automaticamente na fila do
departamento seguinte**, com um indicador visual de status (cor/bolinha),
sem que ninguém precise procurar ou ser avisado manualmente.

**Ator:** Todos os perfis operacionais envolvidos nas cadeias abaixo
**Pré-condições:** Documento (pedido de compra, venda, RNC) existente,
transitando entre os elos já modelados no sistema

**Cadeias de handoff cobertas (elos já existentes no backend — este UC
não cria fluxo novo de dados, apenas padroniza a leitura/exibição em
fila):**

| Cadeia | Elo 1 (origem) | Elo 2 (destino) | Sinal verde | Sinal amarelo | Sinal vermelho |
|---|---|---|---|---|---|
| Compras → Recebimento | Pedido de Compra `status=sent` (UC-15) | Fila do Recebimento | `sent`/`approved`/`partial` dentro do prazo (`expected_date` ≥ hoje) — "A caminho" | `expected_date` vencida sem `delivery_date` — "Atrasado" (mesma regra do UC-28 `overdue`) | — (não há status de erro nesta cadeia; recebimento parcial é amarelo informativo, não erro) |
| Recebimento → Qualidade | Lote criado em `quarantine` (UC-16) | Fila de Inspeção de Qualidade | `quarantine` — "Aguardando inspeção" | — | `blocked` — "Bloqueado" |
| Qualidade → Almoxarifado | Lote liberado (`available`, UC-17B) | Estoque volta a ficar disponível para consumo | `available` — "Liberado" | `quarantine` (ainda aguardando) | `blocked` — "Reprovado" |
| Vendas → Expedição | Venda `status=invoiced` (NF-e autorizada, ver UC-41) | Fila de Expedição | `invoiced` — "Pronta para embarque" | `processing` (NF-e sendo emitida) | `denied`/`cancelled` (NF-e negada/cancelada — não pode embarcar) |
| Engenharia (amostra) → Compras → Recebimento | Requisição `origin=engineering_sample` (UC-39) | Fila do Recebimento (com badge "Amostra") | mesma semântica da linha 1, com badge adicional | mesma | mesma |
| Recebimento/Qualidade → RNC (não-conformidade) | RNC criada (UC-17) | Fila de tratativa de Qualidade | `open`/`in_analysis` — "Em tratativa" | — | `closed` com `effectiveness_result != effective` — "Reincidente" |

**Fluxo Principal (genérico, aplicável a todas as cadeias acima):**
1. Um documento muda de status em seu módulo de origem (ex.: comprador
   confirma envio do pedido, `status → sent`)
2. Sistema **não** exige nenhuma ação manual de "notificar" o próximo
   departamento — a mudança de status já é, por si, o gatilho: o
   próximo endpoint de listagem do departamento destino (ex.:
   `GET /api/purchases?status=sent,approved,partial` já usado pela tela
   de Recebimento, ou um novo endpoint dedicado "Fila de Recebimento" —
   ver DECISÃO PROPOSTA) já retorna esse documento automaticamente,
   porque a query filtra por status, não por "quem foi avisado"
3. Sistema calcula o indicador de cor (semáforo) **no momento da consulta**
   (não é um campo persistido redundante — é derivado do status + datas,
   igual ao `overdue` do UC-28 Cockpit de Compras), usando a tabela acima
   como regra
4. Tela do departamento destino exibe a bolinha colorida ao lado de cada
   item da fila, sem exigir que o usuário abra o detalhe para saber a
   situação
5. Ao departamento destino agir (ex.: Almoxarife confere e recebe o
   pedido), o status muda (`received`) e o item **desaparece da fila
   "pendente"** do Recebimento — não há necessidade de o Comprador ser
   avisado ativamente da conclusão; ele vê o novo status ao consultar seu
   próprio painel/cockpit (UC-28 já mostra isso para compras)

**DECISÃO PROPOSTA — mecanismo de "fila" (endpoint dedicado vs filtro
existente):**
> As telas de Recebimento/Expedição **já existem** e já listam os
> documentos pendentes por status (conforme nota do dono). O que falta,
> como requisito novo, é: (1) garantir que **todo elo relevante da tabela
> acima** tenha um endpoint de listagem filtrável por status "pendente
> daquele departamento" (alguns já existem — ex. `GET /api/purchases`
> aceita filtro de status; outros podem precisar de um parâmetro
> dedicado, ex. `?pending_for=receiving`); e (2) que a resposta de cada
> listagem inclua um campo derivado `handoff_signal: 'green'|'yellow'|'red'`
> calculado no backend (não no frontend), para que a cor seja
> consistente entre telas e não dependa de lógica duplicada no cliente.
> **Proponho** adicionar esse campo `handoff_signal` como enriquecimento
> nas listagens já existentes (sem quebrar contrato — campo novo,
> aditivo), em vez de criar um módulo de "notificações" separado (mais
> caro de construir e com mais superfície de erro). **Aguardando
> confirmação do dono se este nível é suficiente ou se ele espera também
> um contador/alerta (ex.: badge "3" no menu lateral do módulo
> Recebimento) — se sim, é um requisito adicional a especificar.**

**Fluxo Alternativo (documento nunca sai do amarelo — atraso):**
- Pedido com `expected_date` vencida permanece na fila do Recebimento com
  sinal vermelho ("Atrasado") até `received` ou até a data ser atualizada
  — não desaparece da fila, para forçar acompanhamento

**Critérios de Aceite (BDD):**
```gherkin
Cenário: Pedido de compra enviado aparece na fila do Recebimento com sinal verde
  Dado que o comprador finalizou o envio de um pedido (status "sent")
    com expected_date daqui a 5 dias
  Quando o Almoxarife/Recebimento consulta sua fila
  Então o pedido aparece na listagem
  E o campo handoff_signal é "green" com o rótulo "A caminho"

Cenário: Pedido atrasado muda para sinal vermelho automaticamente
  Dado que o mesmo pedido tem expected_date de ontem e ainda não foi
    recebido (delivery_date nulo)
  Quando o Almoxarife consulta a fila hoje
  Então o handoff_signal é "red" com o rótulo "Atrasado"
  E nenhuma ação manual foi necessária para essa mudança (é derivada de data)

Cenário: Recebimento confere e o pedido some da fila de pendentes
  Dado que o pedido está com handoff_signal "green" na fila
  Quando o Almoxarife registra o recebimento completo
  Então o pedido passa para status "received"
  E deixa de aparecer na fila de "pendentes de recebimento"
  E volta a aparecer no cockpit do Comprador (UC-28) refletindo o novo status

Cenário: Venda faturada aparece na fila de Expedição
  Dado que a NF-e de uma venda foi autorizada (status "invoiced")
  Quando o time de Expedição consulta sua fila
  Então a venda aparece com handoff_signal "green" ("Pronta para embarque")

Cenário: NF-e negada não aparece como pronta para embarque
  Dado que a emissão de NF-e de uma venda retornou status "denied"
  Quando o time de Expedição consulta sua fila
  Então a venda NÃO aparece como "green" — aparece (se aparecer) com
    handoff_signal "red" ou é filtrada da fila de embarque, pois não pode
    ser expedida sem NF-e autorizada (regra já implementada, UC-27)
```

**Regras de Negócio:** ver `BUSINESS_RULES.md` §10 (definição formal do
semáforo por cadeia e regra de que o sinal é sempre calculado, nunca
armazenado como fonte da verdade).

---

## UC-41: Emissão de Nota Fiscal pelo Vendas (Faturamento) e Elo Obrigatório com Expedição

**Ator:** Operador de Vendas, Gestor de Vendas (permissão — ver DECISÃO
PROPOSTA), Administrador Global
**Pré-condições:** Venda existente com `status = 'confirmed'`
**Endpoints existentes (já implementados, apenas documentados aqui como
caso de uso formal):** `POST /api/sales/:id/nfe` (emissão),
`POST /api/sales/:id/nfe/cancel` (cancelamento), `GET /api/sales/:id/nfe`
(status), `PUT /api/sales/:id/status` com `{status: 'shipped'}` (UC-27)

**Fluxo Principal (emissão):**
1. Usuário aciona a emissão de NF-e de uma venda confirmada
   (`POST /api/sales/:id/nfe`)
2. Sistema valida que a venda está em `status = 'confirmed'` e que não há
   NF-e `processing` ou `authorized` já existente para ela (ver Fluxos
   Alternativos)
3. Sistema calcula os tributos de cada item (`TaxCalculationService`),
   reserva o próximo número de NF-e (`CompanyFiscalConfig.nfe_next_number`,
   sob lock pessimista) e marca `nfe_status = 'processing'`
4. Sistema chama o provedor fiscal configurado (eNotas/FocusNFe/Mock)
5. Se o provedor autoriza (`status = 'authorized'`): sistema grava
   `nfe_key`, `nfe_protocol`, `nfe_xml_url`, `nfe_danfe_url`,
   `nfe_issued_at`, e transiciona automaticamente `sale.status`:
   `confirmed → invoiced`
6. A partir de `invoiced`, a venda entra na fila de Expedição com sinal
   verde (UC-40) — **elo obrigatório**: a expedição só pode marcar a
   venda como `shipped` a partir de `invoiced` (regra já implementada em
   `ChangeSaleStatusUseCase.VALID_TRANSITIONS`, UC-27); não existe caminho
   de embarque sem NF-e autorizada

**Fluxo Alternativo (NF-e rejeitada/denegada pelo provedor ou pela
SEFAZ):**
- Sistema grava `nfe_status = 'denied'` e `nfe_error_message` com o motivo
  retornado pelo provedor; `sale.status` **permanece** `confirmed` (não
  avança para `invoiced`) — a venda não entra na fila de Expedição
- Usuário deve corrigir a causa raiz (ex.: dados fiscais do cliente,
  configuração da empresa) e tentar emitir novamente

**Fluxo Alternativo (cancelamento de NF-e):**
1. Usuário aciona `POST /api/sales/:id/nfe/cancel` com `reason` (mínimo 15
   caracteres — exigência SEFAZ, já implementada)
2. Sistema valida que `nfe_status = 'authorized'` (só se cancela NF-e
   autorizada)
3. Sistema chama o provedor; se sucesso, `nfe_status = 'cancelled'`
4. **Gargalo tratado:** se a venda já estiver `shipped` (mercadoria já
   embarcou), o cancelamento da NF-e continua tecnicamente possível dentro
   do prazo legal junto à SEFAZ, mas o sistema **não reverte**
   `sale.status` de volta (regra já existente: `shipped` é terminal, UC-27)
   — a UI deve alertar o usuário que cancelar a NF-e de uma venda já
   expedida é uma situação excepcional que exige tratativa manual
   logística (recolhimento da mercadoria), fora do escopo do sistema

**Fluxo Alternativo (tentativa de emitir NF-e duplicada):**
- Sistema retorna 409 CONFLICT se já houver NF-e `processing` ou
  `authorized` para a venda

**DECIDIDO (2026-08-03) — nível de permissão para emitir NF-e:**
> Emissão **e** cancelamento de NF-e exigem módulo `vendas` (ou um módulo
> dedicado `faturamento`, se desmembrado futuramente) com nível
> **`aprovar`**, restritos ao **nível de usuário `gestor` do Vendas** —
> coerente com o padrão dos demais dois níveis (operador executa o dia a
> dia: criar orçamento, confirmar venda; gestor aprova/executa ações de
> maior risco fiscal). A alternativa mais permissiva (liberar emissão a
> `operar`/operador comum) foi descartada — emitir/cancelar NF-e é ação
> fiscal com consequência tributária real (SEFAZ) e fica reservada ao
> gestor em ambas as operações, sem distinção entre emitir e cancelar.

**Critérios de Aceite (BDD):**
```gherkin
Cenário: Emissão de NF-e autorizada muda status automaticamente
  Dado que a venda está em status "confirmed"
  Quando o gestor de vendas aciona a emissão de NF-e e o provedor autoriza
  Então sale.status muda automaticamente para "invoiced"
  E a venda passa a aparecer na fila de Expedição com sinal verde (UC-40)

Cenário: NF-e negada não libera a venda para expedição
  Dado que a venda está em "confirmed"
  Quando a emissão de NF-e retorna "denied"
  Então sale.status permanece "confirmed"
  E a venda não aparece na fila de Expedição como pronta para embarque

Cenário: Expedição não pode embarcar sem NF-e autorizada
  Dado que uma venda está em "confirmed" (sem NF-e autorizada)
  Quando alguém tenta PUT /api/sales/:id/status com {"status":"shipped"}
  Então o sistema responde 422 (transição inválida — só invoiced -> shipped)

Cenário: Operador de Vendas tenta emitir NF-e (regra decidida)
  Dado que o usuário tem perfil "Vendas" nível "operador"
  E o módulo "vendas" no perfil está marcado como "aprovar" (nível de
    módulo necessário para emitir NF-e, ainda que o usuário seja operador)
  Quando ele chama POST /api/sales/:id/nfe
  Então o sistema responde 403 "Ação de aprovação restrita a gestores da área"
    (mesma regra de UC-37: nível de usuário "operador" nunca aprova)

Cenário: Operador de Vendas tenta cancelar NF-e (mesma restrição da emissão)
  Dado que o usuário tem perfil "Vendas" nível "operador"
  Quando ele chama POST /api/sales/:id/nfe/cancel
  Então o sistema responde 403 — cancelamento segue a mesma restrição de
    gestor aplicada à emissão, sem distinção entre as duas operações

Cenário: Cancelamento de NF-e de venda já expedida não reverte status
  Dado que a venda está "shipped" com NF-e "authorized"
  Quando o gestor cancela a NF-e com justificativa válida (>= 15 caracteres)
  E o provedor confirma o cancelamento
  Então nfe_status muda para "cancelled"
  E sale.status permanece "shipped" (não regride — regra UC-27)
  E a tela exibe um alerta de situação excepcional exigindo tratativa
    logística manual
```

**Regras de Negócio:** ver `BUSINESS_RULES.md` §11.

---

## UC-42: Múltiplos Depósitos (Armazéns) — Insumos, Produto Acabado e Laboratório

**Contexto/Requisito estrutural do dono:** a fábrica precisa de estoques
fisicamente separados: (1) **Depósito de Insumos de Produção** (matéria-
prima — o estoque "principal" atual), (2) **Depósito de Produto Acabado**
(o que a produção conclui e a expedição embarca), (3) **Depósito do
Laboratório** (insumos de teste/amostras). Esta funcionalidade **resolve**
a decisão proposta em `UC-39 §Destino da amostra`: a amostra recebida
passa a ter destino físico explícito — o Depósito do Laboratório — em vez
de exigir uma segregação lógica improvisada dentro do estoque produtivo.

**Modelagem aprovada pelo orquestrador (diretriz de negócio, não é mais
decisão em aberto — mas o desenho técnico exato é tarefa do
AdmDBA/programador, ver `TODO.md`):**
- Depósitos são **cadastráveis** (tabela própria), com os 3 acima como
  seed inicial — o admin pode criar depósitos adicionais no futuro (ex.:
  um segundo galpão), sem alteração de código.
- Saldo de cada produto/item é mantido **por depósito** (não existe mais
  um único saldo global "flat" — o saldo total do produto é a soma dos
  saldos em todos os depósitos, ver invariante em `BUSINESS_RULES.md` §12).
- Toda movimentação de estoque referencia obrigatoriamente um depósito de
  origem e/ou destino, incluindo um **novo tipo de movimentação**:
  `transferência` entre depósitos.

**Ator:** Almoxarife (Insumos), Recebimento, Expedição, Analista de
Laboratório, Operador de Produção, Administrador Global (cadastro de
depósitos)

**Pré-condições:** Depósitos cadastrados (seed: Insumos, Acabados,
Laboratório)

### Fluxo Principal (A) — Cadastro de Depósito

1. Administrador acessa "Configurações > Depósitos" e cadastra um novo
   depósito: `codigo` (único), `nome`, `tipo` (`insumos`/`acabados`/
   `laboratorio`/`outro`), `ativo`
2. Sistema valida `codigo` único
3. Sistema salva o depósito
4. Perfis de acesso (UC-30/UC-31) podem, opcionalmente, restringir quais
   depósitos um perfil enxerga dentro dos módulos de estoque (ver
   `BUSINESS_RULES.md` §12, item de amarração com a matriz de permissões)

### Fluxo Principal (B) — Recebimento de Compra Direciona o Depósito Certo

1. Recebimento confere um pedido de compra recebido (UC-16 já existente)
2. Sistema determina o depósito de destino conforme a **origem da
   requisição** que gerou o pedido (UC-25):
   - Requisição de origem `manual`/`mrp` (compra produtiva comum) →
     **Depósito de Insumos**
   - Requisição de origem `engineering_sample` (UC-39) → **Depósito do
     Laboratório** (substitui a segregação lógica proposta anteriormente
     em UC-39 — agora é uma segregação física real)
3. Sistema dá entrada no depósito determinado, incrementando o saldo do
   produto **naquele depósito** (e, por consequência, o saldo total do
   produto)
4. Lote (`LotControl`) nasce em `quarantine` como já ocorre hoje (UC-16) —
   a quarentena é **status do lote**, independente do depósito (ver Regra
   de Negócio explícita abaixo)

### Fluxo Principal (C) — Conclusão de OP e Consumo de Produção

1. Ao apontar consumo de componentes em uma Ordem de Produção (UC-13), o
   sistema debita os componentes do **Depósito de Insumos**
2. Ao concluir a OP (produto acabado pronto), o sistema credita a
   quantidade produzida no **Depósito de Produto Acabado** — nunca no
   Depósito de Insumos
3. Caso a OP consuma um subconjunto/semi-acabado produzido internamente,
   o mesmo padrão se aplica em cascata (semi-acabado sai do depósito onde
   estava — tipicamente Insumos ou um depósito intermediário, a definir
   pela engenharia de processo — e entra no depósito do próximo nível de
   consumo)

### Fluxo Principal (D) — Expedição Embarca Apenas do Depósito de Acabados

1. Expedição consulta sua fila (UC-40) e confere a venda faturada
2. Sistema debita a baixa de estoque de expedição **exclusivamente** do
   **Depósito de Produto Acabado**
3. **Fluxo de Exceção:** se o saldo do produto no Depósito de Acabados for
   insuficiente (mesmo que exista saldo do mesmo produto/código em outro
   depósito, ex.: uma amostra de laboratório do mesmo código), a operação
   é bloqueada com mensagem explícita — depósitos **não se substituem
   automaticamente**; expedição nunca lê saldo de Insumos ou Laboratório

### Fluxo Principal (E) — Laboratório Consome do Seu Próprio Depósito

> **DECIDIDO (2026-08-03):** consumo do Depósito de Laboratório em testes
> destrutivos é **vinculado ao teste** — ao registrar um
> `AcousticTestResult` (UC-LAB-01 já existente) marcado como destrutivo,
> o sistema debita automaticamente a quantidade informada do Depósito de
> Laboratório, na mesma transação do registro do teste. Padrão adotado
> por rastreabilidade superior: o consumo fica automaticamente ligado ao
> teste que o gerou, sem depender de disciplina manual do analista, e
> evita duplo lançamento/esquecimento. Implementação exige um campo
> opcional `consumed_quantity`/`is_destructive` no teste e um débito
> condicional no mesmo use case de registro (ver `TODO.md` Bloco 4).

### Fluxo Principal (F) — Transferência Entre Depósitos (Com Aprovação de Gestor)

1. Usuário solicita transferência (ex.: "Acabado devolvido para
   retrabalho" — do Depósito de Acabados de volta ao processo produtivo;
   ou "Insumo cedido ao laboratório" — do Depósito de Insumos ao
   Laboratório para um teste específico), informando depósito de origem,
   depósito de destino, produto/item, quantidade e motivo (texto
   obrigatório)
2. Sistema cria a transferência em status `pending` (**exige aprovação de
   gestor** — nível `gestor` do módulo `estoque` do depósito de origem
   e/ou destino, a definir pela matriz de permissões — ver
   `BUSINESS_RULES.md` §12)
3. Gestor aprova (`nivel = gestor`, módulo `estoque` com `A`)
4. Sistema executa a transferência **atomicamente** (mesma transação):
   debita o depósito de origem, credita o depósito de destino, gera dois
   registros de movimentação (`out` na origem, `in` no destino) vinculados
   por um `transfer_id` comum, preservando o total do produto (invariante
   — ver `BUSINESS_RULES.md` §12)
5. Sistema registra auditoria completa: quem solicitou, quem aprovou,
   quando, motivo

**Regra de Negócio explícita (para não confundir os conceitos — pedido
direto do dono):** quarentena/bloqueio (`LotControl.status`) **continuam
sendo status do lote**, não viram depósito. Um lote pode estar `quarantine`
ou `blocked` **dentro** de qualquer depósito (tipicamente dentro do
Depósito de Insumos, ao chegar do Recebimento) — depósito responde "ONDE
fisicamente está o material"; status do lote responde "SE aquele material
pode ser consumido". As duas dimensões são ortogonais e não devem ser
fundidas em uma única modelagem.

**Fluxo Alternativo (contagem cíclica e saldos passam a filtrar por
depósito):**
- Telas de Contagem (UC atual de inventário mobile/QR) e de extrato de
  movimentações passam a exigir/aceitar filtro por depósito — uma
  contagem cíclica é sempre de **um depósito por vez** (fisicamente
  coerente: não se conta dois galpões simultaneamente na mesma sessão de
  contagem)

**Critérios de Aceite (BDD):**
```gherkin
Cenário: Recebimento de compra comum entra no Depósito de Insumos
  Dado que um pedido de compra tem origem "manual" (requisição comum)
  Quando o Recebimento confere e dá entrada
  Então o saldo do produto no Depósito de Insumos aumenta na quantidade
    recebida
  E o saldo nos demais depósitos permanece inalterado

Cenário: Recebimento de amostra de engenharia entra no Depósito do Laboratório
  Dado que o pedido de compra teve origem em uma requisição
    "engineering_sample" (UC-39)
  Quando o Recebimento confere e dá entrada
  Então o saldo do produto no Depósito do Laboratório aumenta
  E o saldo no Depósito de Insumos permanece inalterado

Cenário: Conclusão de OP credita o Depósito de Acabados
  Dado que uma Ordem de Produção é concluída com 100 unidades boas
  Quando o sistema dá baixa nos componentes (Depósito de Insumos)
  Então as 100 unidades de produto acabado são creditadas no Depósito de
    Produto Acabado, não no Depósito de Insumos

Cenário: Expedição não pode embarcar de outro depósito
  Dado que o produto X tem saldo 0 no Depósito de Acabados mas saldo 5 no
    Depósito do Laboratório
  Quando a Expedição tenta embarcar 1 unidade do produto X
  Então o sistema bloqueia por saldo insuficiente, sem considerar o saldo
    do Depósito do Laboratório

Cenário: Transferência entre depósitos exige aprovação de gestor
  Dado que um operador de Insumos solicita transferir 10 unidades para o
    Depósito do Laboratório, com motivo "Amostra para teste destrutivo"
  Quando a transferência é criada
  Então ela fica em status "pending", aguardando um gestor
  E ao ser aprovada por um gestor, o saldo de Insumos cai 10 e o saldo do
    Laboratório sobe 10, na mesma transação, com dois registros de
    movimentação vinculados pela mesma transferência (`reference_type =
    'transfer'` / `reference_id = warehouse_transfers.id` em
    `InventoryMovement` — não existe coluna `transfer_id` dedicada, ver
    nota de implementação abaixo)

Cenário: Quarentena não é depósito
  Dado que um lote está com LotControl.status = "quarantine" dentro do
    Depósito de Insumos
  Quando a Qualidade libera o lote (status -> available, UC-17B)
  Então o lote permanece fisicamente no Depósito de Insumos — a liberação
    não move o material entre depósitos, apenas muda seu status de
    consumo

Cenário: Teste destrutivo debita automaticamente o Depósito de Laboratório
  Dado que o Depósito de Laboratório tem saldo 5 unidades do componente Y
  Quando o analista registra um AcousticTestResult marcado como
    destrutivo, informando consumed_quantity = 2 do componente Y
  Então o sistema debita 2 unidades do Depósito de Laboratório na mesma
    transação do registro do teste
  E o saldo do Depósito de Laboratório passa a ser 3, sem exigir um
    lançamento manual separado de baixa de estoque
```

**Regras de Negócio:** ver `BUSINESS_RULES.md` §12.

**Nota de implementação (backend, entrega parcial):** Fluxos B (recebimento
→ depósito) e C (consumo/conclusão de OP) implementados via dual-write em
`server/src/services/warehouseStockService.ts`, com roteamento
`INSUMOS`/`ACABADOS` automático e `INSUMOS`/`LABORATORIO` via parâmetro
`warehouse_code` opcional no payload de `POST /api/purchases/:id/receive`
(o roteamento 100% automático por `origin` da requisição depende do Bloco
2/UC-39, ainda não implementado). Fluxo F (transferência) implementado via
`POST/GET /api/inventory/transfers` e
`PUT /api/inventory/transfers/:id/approve|reject`. Fluxo D (expedição
exclusiva de `ACABADOS`) e Fluxo E (débito automático de teste destrutivo,
UC-42-E) **ainda não implementados** — ver `docs/governance/TODO.md`
Bloco 4.2/4.4 para o detalhamento completo de escopo entregue vs.
pendente.

---

## UC-43: Alertas Didáticos de Pré-Requisitos (Requisito Transversal de UX)

**Contexto/Requisito do dono (palavras do dono):** "seja mais específico
quanto à resposta de um alerta avisando o que precisa; busque ser
didático para compreensão do usuário". Este UC é **transversal** — não
pertence a um módulo específico, é um padrão de interface aplicável a
**toda tela que executa uma ação com pré-requisitos** (liberar OP,
concluir OP, embarcar venda, gerar pedido de compra, receber compra,
registrar teste de laboratório, converter ordem planejada do MRP, aprovar
requisição, liberar lote, etc.) — tanto as telas já existentes (retrofit)
quanto qualquer tela nova a ser construída.

**Ator:** Todos os perfis operacionais (qualquer usuário que executa uma
ação de negócio com pré-requisitos)
**Pré-condições:** Usuário autenticado, tela de uma ação com um ou mais
pré-requisitos verificáveis (dados já existentes no backend — este UC não
exige nenhuma nova regra de negócio, apenas uma nova forma de
**apresentar** regras que já existem, muitas já retornadas como `422` com
`details` estruturado)

**Fluxo Principal (A) — Validação Preventiva (checklist antes da tentativa):**
1. Usuário abre a tela de uma ação com pré-requisitos (ex.: tela de
   liberação de uma Ordem de Produção)
2. Antes de qualquer clique, a tela carrega e exibe um **checklist de
   pré-requisitos**, cada item com estado `✓ atendido` ou `✗ faltando`:
   - `✓ BOM ativa`
   - `✓ Roteiro liberado`
   - `✗ Material insuficiente: faltam 40 un de Ímã ferrite 120mm (MP-IMA-120) no Depósito de Insumos`
3. O botão da ação principal (ex.: "Liberar OP") permanece **desabilitado**
   enquanto houver qualquer item `✗` na lista
4. O motivo de cada item `✗` é **sempre visível ao lado do item**, nunca
   escondido atrás de um tooltip que exige hover, e nunca um botão
   desabilitado sem nenhuma explicação visível na tela
5. Assim que o pré-requisito for corrigido (ex.: material chegou, RNC foi
   tratada), o checklist deve refletir o novo estado ao recarregar/revalidar
   (a re-checagem pode ser manual — botão "Verificar novamente" — ou
   automática ao reabrir a tela; **não é obrigatório polling em tempo
   real**, ver Regra de Negócio)

**Fluxo Principal (B) — Alerta ao Tentar uma Ação que Falha no Backend
(retrofit dos erros já existentes):**
1. Usuário tenta uma ação e o backend retorna `422 BUSINESS_RULE_VIOLATION`
   (ou `400 VALIDATION_ERROR`) com `details` estruturado (contrato já
   existente: `{ success: false, error: { code, message, details? } }`)
2. O frontend **não exibe apenas `error.message` cru** (comportamento
   atual do `extractApiErrorMessage`, que descarta `details`) — traduz a
   resposta para o **Padrão de Alerta Didático de 3 Partes** (ver
   `BUSINESS_RULES.md` §13):
   - **O QUE** não pode ser feito (ação + identificador do documento)
   - **POR QUE**, com dados concretos (item, quantidade, número de
     documento/lote — nunca um código de erro cru tipo
     `BUSINESS_RULE_VIOLATION` exposto ao usuário final)
   - **O QUE FAZER**, com um link/atalho de navegação para a tela onde o
     usuário resolve o pré-requisito
3. Se `details` contiver uma **lista** de pendências (ex.: vários itens
   sem fornecedor resolvível, várias ordens em status inválido), o alerta
   lista **todas de uma vez** — nunca apenas a primeira, forçando o
   usuário a tentar várias vezes para descobrir as demais

**Fluxo Alternativo (backend não retorna `details` estruturado para um
caso específico):**
- Se o endpoint envolvido ainda não retorna `details` (dívida técnica
  pré-existente, fora do escopo desta especificação para reescrever todo
  backend), o frontend deve, no mínimo, exibir a `message` já retornada
  dentro do mesmo formato visual de 3 partes (mesmo que a parte "O QUE
  FAZER" seja um texto genérico de orientação, como "Corrija os dados e
  tente novamente" ou "Contate o suporte") — nunca voltar a um alert/toast
  cru sem estrutura. Backend deve ser evoluído incrementalmente para
  retornar `details` estruturado nos casos mapeados abaixo (ver
  `TODO.md`).

**Mapeamento dos casos reais do sistema (ponto de partida obrigatório
para a implementação — lista não exaustiva, cada linha deve virar um
teste QA):**

| Ação | O QUE (exemplo) | POR QUE (exemplo, com dados concretos) | O QUE FAZER (exemplo, com destino) |
|---|---|---|---|
| Liberar OP sem material suficiente | "Não é possível liberar a OP-2026-0012" | "Faltam 40 un de Ímã Ferrite 120mm (MP-IMA-120) no Depósito de Insumos. O lote LOTE-IMA-001 está em quarentena aguardando inspeção." | "Solicite a inspeção em Qualidade → Inspeção de Recebimento, ou gere uma requisição de compra para o item MP-IMA-120." |
| Liberar OP sem BOM ativa | "Não é possível liberar a OP-2026-0012" | "O produto Alto-falante 10\" não possui uma estrutura (BOM) com status ativo." | "Cadastre/ative a BOM em Engenharia → BOM antes de liberar a ordem." |
| Liberar OP sem roteiro liberado | "Não é possível liberar a OP-2026-0012" | "O roteiro de fabricação do produto ainda está em rascunho (draft), não foi liberado." | "Libere o roteiro em Produção → Centros de Trabalho / Roteiro antes de liberar a ordem." |
| Concluir OP com etapa de apontamento aberta | "Não é possível concluir a OP-2026-0012" | "A etapa 'Bobinagem' (sequência 3, Centro de Trabalho CT-02) ainda está em andamento, iniciada por João Silva às 14:32 e não foi finalizada." | "Vá ao Chão de Fábrica e conclua (ou cancele) a etapa pendente antes de encerrar a ordem." |
| Embarcar venda sem NF-e autorizada | "Não é possível marcar a Venda #451 como embarcada" | "A nota fiscal desta venda está com status 'processing' (em emissão) — nenhuma NF-e autorizada foi encontrada." | "Aguarde a emissão concluir ou emita a NF-e em Vendas → Faturamento." |
| Gerar pedido de requisição sem fornecedor resolvível | "Não é possível converter a Requisição #78 em pedido de compra" | "3 itens não têm fornecedor definido: MP-IMA-120, MP-BOB-08, MP-CAB-15 — nenhum tem fornecedor sugerido, preferencial ou de fallback." | "Cadastre um fornecedor preferencial para esses itens em Item → Fornecedores, ou informe um fornecedor padrão (fallback) ao converter." |
| Receber compra sem nota fiscal | "Não é possível confirmar o recebimento do Pedido PO-2026-0034" | "Nenhum número de nota fiscal foi informado para esta conferência." | "Informe o número da NF-e do fornecedor no campo indicado antes de confirmar o recebimento." |
| Registrar teste sem resultado nem faixa de especificação | "Não é possível salvar este teste de laboratório" | "Nenhum resultado (result) foi informado e nenhuma faixa de especificação (mínimo/máximo) foi definida — o sistema não consegue determinar se o teste passou ou falhou." | "Preencha o campo Resultado, ou informe ao menos um limite de especificação (mínimo ou máximo)." |
| Converter ordem planejada já em execução | "Não é possível converter a(s) ordem(ns) planejada(s) selecionada(s)" | "A ordem PLN-2026-0091 já está em status 'EM_EXECUCAO' — apenas ordens RASCUNHO ou APROVADA podem ser convertidas." | "Remova essa ordem da seleção, ou consulte o status atual em Produção → MRP." |
| Aprovar requisição fora de sequência | "Não é possível aprovar a Requisição #78" | "A requisição está em status 'draft' — só é possível aprovar requisições em status 'pending'." | "Envie a requisição para aprovação (mude o status para 'pending') antes de tentar aprová-la." |
| Liberar/bloquear lote em status terminal | "Não é possível liberar o lote LOTE-IMA-001" | "O lote já está com status 'consumed' — material já foi integralmente utilizado na produção." | "Nenhuma ação necessária: o lote já foi consumido e não pode mais ser movimentado." |

**Regras de Negócio:** ver `BUSINESS_RULES.md` §13 (padrão de alerta
obrigatório, aplicável a toda tela nova e retrofit das existentes).

**Critérios de Aceite (BDD):**
```gherkin
Cenário: Checklist preventivo bloqueia ação com motivo visível
  Dado que o usuário abre a tela de liberação da OP-2026-0012
  E a OP tem BOM ativa, roteiro liberado, mas material insuficiente
  Quando a tela carrega
  Então o checklist mostra "✓ BOM ativa", "✓ Roteiro liberado" e
    "✗ Material insuficiente: faltam 40 un de MP-IMA-120 no Depósito de
    Insumos"
  E o botão "Liberar OP" está desabilitado
  E o motivo do "✗" está visível na tela, sem exigir hover ou clique extra

Cenário: Alerta de erro traduz 422 estruturado em 3 partes
  Dado que o usuário tenta converter a Requisição #78 em pedido de compra
  E o backend responde 422 com details listando 3 itens sem fornecedor
    resolvível
  Quando o alerta é exibido
  Então ele mostra "O QUE": "Não é possível converter a Requisição #78..."
  E "POR QUE": lista os 3 itens (MP-IMA-120, MP-BOB-08, MP-CAB-15), não
    apenas o primeiro
  E "O QUE FAZER": orientação com link para Item → Fornecedores

Cenário: Lista completa de pendências, não a primeira
  Dado que faltam 3 pré-requisitos distintos para uma ação (ex.: material
    insuficiente, roteiro não liberado e etapa de apontamento aberta)
  Quando o usuário abre a tela ou tenta a ação
  Então as 3 pendências aparecem juntas no mesmo checklist/alerta
  E o usuário não precisa corrigir uma, tentar de novo, e só então
    descobrir a próxima

Cenário: Ação sem pré-requisito pendente libera o botão normalmente
  Dado que todos os itens do checklist estão "✓"
  Quando o usuário abre a tela
  Então o botão da ação principal está habilitado, sem nenhum alerta

Cenário: Backend sem details estruturado ainda assim segue o padrão visual
  Dado que um endpoint legado retorna apenas { message } sem details
  Quando o erro é exibido
  Então o alerta ainda segue o formato de 3 partes, com "O QUE FAZER"
    usando um texto de orientação genérico, nunca um toast cru com a
    mensagem crua da API
```

---

## Índice de Requisitos Deste Documento

| UC | Título | Ator Principal |
|----|--------|-----------------|
| UC-30 | Criar Perfil de Acesso | Administrador Global |
| UC-31 | Editar Perfil de Acesso | Administrador Global |
| UC-32 | Desativar Perfil de Acesso | Administrador Global |
| UC-33 | Atribuir Perfil de Acesso a Usuário | Administrador Global |
| UC-34 | Login e Montagem do Menu Conforme Perfil | Todos os usuários |
| UC-35 | Tentativa de Acesso a Módulo Fora do Perfil (403) | Operador/Gestor de Área |
| UC-35-Exceção | Usuário Sem Perfil Atribuído | Operador/Gestor de Área |
| UC-36 | Troca de Perfil de Usuário Logado (Sessão) | Administrador Global |
| UC-37 | Ação de Gestor vs Operador Dentro da Área | Operador/Gestor de Área |
| UC-38 | Endpoints Compartilhados Entre Áreas | Todos os usuários |
| UC-39 | Requisição de Amostra da Engenharia | Engenheiro de Produto |
| UC-40 | Handoff Entre Departamentos com Status Visual (Semáforo) | Todos os perfis operacionais |
| UC-41 | Emissão de Nota Fiscal pelo Vendas (Faturamento) | Vendas (Gestor) |
| UC-42 | Múltiplos Depósitos (Insumos, Acabados, Laboratório) | Almoxarife/Recebimento/Expedição/Laboratório |
| UC-43 | Alertas Didáticos de Pré-Requisitos (Transversal) | Todos os perfis operacionais |

**Decisões de negócio — todas confirmadas pelo dono em 2026-08-03** (ver
lista consolidada no topo deste documento, item "Decisões do dono sobre
pontos antes em aberto"): UC-32 (bloquear desativação de perfil em uso
até realocar usuários), UC-35-Exceção (bloqueio total com aviso
didático), UC-36 (troca de perfil vale no próximo login, sem invalidar
sessão ativa; mitigação de emergência via desativação de usuário), UC-41
(emissão e cancelamento de NF-e restritos a gestor de Vendas), UC-42 item
E (consumo do Depósito de Laboratório vinculado ao teste destrutivo),
`BUSINESS_RULES.md` §12 item 11 (permissão por depósito como lista
simples no perfil).

**Ainda em aberto (não fazia parte deste lote de 6 decisões, não
bloqueia o início do desenvolvimento — decisão de UX/escopo técnico, não
de regra de negócio):** UC-40 — se o campo `handoff_signal` aditivo nas
listagens já existentes é suficiente, ou se o dono também espera um
contador/badge de notificação no menu lateral por módulo (ver
`BUSINESS_RULES.md` §10 e `TODO.md` Bloco 3).

> Quando este requisito for implementado, os UCs acima devem ser revisados
> e consolidados (com qualquer ajuste de contrato real de endpoint) em
> `docs/projeto/04-USE_CASES.md`, continuando a numeração a partir de
> UC-30 (ou do próximo UC livre no momento da implementação).
