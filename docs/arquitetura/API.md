# Documentação da API - ERP EVOK ÁUDIO

## Base URL

```
Produção: https://api.evokaudio.com.br/api
Desenvolvimento: http://localhost:5000/api
```

## Autenticação

A API utiliza **JWT (JSON Web Token)** para autenticação.

### Headers
```http
Authorization: Bearer <token>
Content-Type: application/json
```

### Respostas Padrão

**Sucesso (200/201):**
```json
{
  "success": true,
  "data": { ... }
}
```

**Erro (400/401/404/500) — formato anterior (string):**

Ainda usado por respostas de validação simples e mensagens de negócio pontuais em alguns controllers:
```json
{
  "success": false,
  "error": "Mensagem do erro"
}
```

**Erro padronizado (`AppError` e subclasses) — formato estruturado:**

Erros lançados via `server/src/errors` (`ValidationError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`, `BusinessRuleError`) e tratados pelo `errorHandler` central (`server/src/middlewares/errorHandler.ts`) retornam:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Cliente não encontrado.",
    "details": {}
  }
}
```
- `code`: identificador estável do tipo de erro (ex.: `VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`, `BUSINESS_RULE_VIOLATION`).
- `message`: mensagem segura para exibição ao usuário.
- `details`: opcional, presente apenas quando o erro carrega informação estruturada adicional (ex.: lista de campos inválidos).

**Erros inesperados (bugs, falhas de banco, exceções não tratadas):**

Nunca expõem stack trace nem a mensagem crua da exceção ao cliente, em nenhum ambiente (dev ou produção). São logados integralmente no servidor via `console.error` para depuração e respondidos como:
```json
{
  "success": false,
  "error": "Erro interno do servidor"
}
```

> Nota: controllers devem propagar exceções inesperadas com `next(error)` (nunca montar a resposta de erro manualmente com `error.message`); o `errorHandler` central é responsável por sanitizar e formatar a resposta.

### Convenção de caixa (casing) dos campos JSON

**(Nota adicionada em 2026-08-06, achado da auditoria cruzada `AuditorIntegrador`.)**
Este projeto **não tem uma convenção única** de `snake_case` vs `camelCase`
para os campos das respostas/requests — o comportamento real depende de
como cada model Sequelize e cada handler foi escrito, não de uma
configuração global. Documentamos a realidade abaixo em vez de fingir uma
padronização que o código não tem:

- **Todos os models usam `underscored: true`** (mapeamento para colunas
  `snake_case` no PostgreSQL), mas isso só afeta o nome da **coluna no
  banco** — não força o nome do atributo exposto em JSON.
- **Timestamps (`createdAt`/`updatedAt`)** aparecem em **camelCase** em
  praticamente toda a API — é o nome de atributo padrão do Sequelize e a
  maioria dos models não o sobrescreve. Exceção conhecida: o model `Item`
  (módulo `items`, tabela `items`) renomeia os próprios atributos de
  timestamp para `criado_em`/`atualizado_em` (português, snake_case).
- **Os demais campos seguem o que o model declarou como nome de atributo
  JS**, não necessariamente a coluna do banco:
  - Models que declaram o atributo já em `snake_case` (ex.: `Client.cpf_cnpj`,
    `Sale.customer_id`, `Asset.purchase_value`) devolvem esse campo em
    `snake_case` no JSON — é a maioria dos models de domínio deste projeto.
  - Models que declaram o atributo em `camelCase` com `field: 'coluna_snake'`
    explícito (ex.: `User.accessProfileId` → coluna `access_profile_id`,
    `User.passwordVersion` → coluna `password_version`) devolvem esse campo
    em `camelCase` no JSON.
- **Requests (bodies)** seguem o schema Zod (ou o parsing manual do
  controller) de cada endpoint — a grande maioria usa `snake_case`
  (convenção herdada dos primeiros contratos da API), mas há exceções
  pontuais em `camelCase` (ex.: `resetPasswordSchema.newPassword` em
  `POST /api/auth/reset-password`). Não há checagem automática de
  consistência entre módulos.
- **Consequência prática mais visível (achado confirmado no código, não
  erro de digitação da doc):** `PUT /api/users/:id/access-profile` aceita
  `access_profile_id` (snake) no request e devolve `accessProfileId`
  (camel) no response — o controller lê `req.body.access_profile_id`
  manualmente, mas o use case (`AssignAccessProfileUseCase`) devolve o
  objeto já no shape do model `User` (`accessProfileId`).
- **Correção de shape em 2026-08-10 (achado S-1b, commit `92cf555`):** até
  esta data, objetos serializados de `User` e `AccessProfilePermission`
  traziam a **mesma informação duplicada sob dois nomes** —
  `accessProfileId` *e* `access_profile_id`. Não era intencional: as 4
  associações de perfil de acesso em `server/src/models/index.ts` passavam
  `foreignKey` com o nome da **coluna** em vez do nome do **atributo**, e o
  Sequelize criava um segundo atributo homônimo apontando para a mesma
  coluna. Corrigido: **agora só `accessProfileId` aparece no JSON.**
  Nenhum consumidor lia a chave duplicada (verificado em `server/`,
  `client/`, `mobile/` e `tv/`), e `PUT /api/users/:id/access-profile`
  **continua aceitando `access_profile_id` no request** — o campo do
  *payload* é lido manualmente pelo controller e não foi alterado.

**Regra prática para quem consome a API:** não assuma nenhum padrão
global — sempre confira o exemplo de request/response do endpoint
específico nesta documentação.

---

## 1. Autenticação

### POST /api/auth/login
Autentica o usuário e retorna o token JWT.

**Request:**
```json
{
  "email": "admin@evokaudio.com.br",
  "password": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "name": "Administrador",
      "email": "admin@evokaudio.com.br",
      "role": "admin"
    }
  }
}
```

**Erro (401) — formato estruturado (`UnauthorizedError`):**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Email ou senha incorretos"
  }
}
```
> A mensagem é propositalmente idêntica tanto para "email não encontrado" quanto para "senha incorreta" — nunca revela se um email está cadastrado. Usuário inativo retorna a mesma estrutura com `message: "Usuário inativo. Contate o administrador."`.

### POST /api/auth/refresh
**(Novo, 2026-08-06)** Renova (renovação deslizante) o token JWT de uma
sessão já autenticada — usado principalmente pelo painel Android TV
(sessão "sempre ligada", ver `tv/`) para evitar redigitar credenciais
quando o token de 7 dias (`JWT_EXPIRE`) está perto de expirar, mas
disponível para qualquer cliente. Requer `Authorization: Bearer <token>`
com um token **ainda válido** (mesmo middleware `authenticate` normal) —
**não existe refresh-token separado nesta v1**. Token já expirado sempre
recebe `401`; o cliente deve refazer login normalmente. Rate-limit: 30
requisições/15min por usuário. O token renovado embute exatamente o mesmo
`passwordVersion` já validado nesta mesma requisição pelo `authenticate`
(nunca uma leitura própria e potencialmente divergente do banco).

**Request:** sem corpo (só o header `Authorization`).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

Implementado em `server/src/modules/auth/application/use-cases/RefreshTokenUseCase.ts`
(`TokenService`, mesma implementação de geração de token do login). Uso
recomendado: mobile (`mobile/src/context/AuthContext.tsx`, renova ao abrir
o app com sessão persistida) e TV (`tv/src/context/AuthContext.tsx`,
renovação proativa a cada 12h — bem abaixo do TTL de 7 dias, fecha a
pendência "Decisão de produto — JWT de 7 dias × painel de TV sempre
ligado" de `docs/governance/TODO.md`).

### POST /api/auth/register
Registra um novo usuário (apenas admin).

**Request:**
```json
{
  "name": "Novo Usuário",
  "email": "novo@evokaudio.com.br",
  "password": "123456",
  "role": "operator"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Novo Usuário",
    "email": "novo@evokaudio.com.br",
    "role": "operator"
  }
}
```

### POST /api/auth/forgot-password
**(SEC-12)** Inicia o fluxo de recuperação de senha por e-mail. Sem
`authenticate` (endpoint público). Rate-limit dedicado
(`passwordRecoveryLimiter`, 10 requisições/15min por e-mail+IP — não
compartilha cota com `POST /api/auth/login`).

**Request:**
```json
{ "email": "usuario@evokaudio.com.br" }
```

**Response (200) — sempre a mesma mensagem, exista ou não o e-mail (evita
enumeração de contas):**
```json
{
  "success": true,
  "data": { "message": "Se o e-mail informado existir, enviaremos instruções de recuperação em instantes." }
}
```

Internamente (`ForgotPasswordUseCase`), quando o e-mail existe, gera um
token de uso único, salva `resetPasswordTokenHash` (SHA-256) e
`resetPasswordExpiresAt` no usuário. **Erro (400)** — `email` ausente ou
formato inválido (`ValidationError`).

### POST /api/auth/reset-password
**(SEC-12)** Conclui a recuperação de senha com o token recebido por
e-mail. Sem `authenticate` (o próprio token no body é a credencial). Mesmo
rate-limit de `forgot-password`.

**Request:**
```json
{ "token": "<token de 32+ caracteres recebido por e-mail>", "newPassword": "novaSenha123" }
```
Note o campo `newPassword` em **camelCase** — exceção à convenção
predominante `snake_case` dos demais bodies desta API (ver "Convenção de
caixa" no topo deste documento).

**Response (200):**
```json
{ "success": true, "data": { "message": "Senha redefinida com sucesso. Faça login novamente." } }
```

Efeitos (SEC-10): a troca de senha incrementa `passwordVersion` do
usuário, **invalidando todos os tokens JWT emitidos anteriormente**
(sessões antigas passam a receber `401` no próximo request autenticado).

**Erro (400)** — `token`/`newPassword` ausentes ou `newPassword` com menos
de 6 caracteres (`ValidationError`). **Erro (422)** — token inválido,
expirado ou já utilizado (`BusinessRuleError`).

### GET /api/auth/me
Retorna os dados do usuário autenticado.

**Headers:** Authorization: Bearer \<token\>

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Administrador",
    "email": "admin@evokaudio.com.br",
    "role": "admin",
    "active": true
  }
}
```

### GET /api/auth/me/permissions
Retorna o mapa `módulo → nível` do usuário autenticado e o perfil de
acesso atual, para o frontend montar o menu (UC-34). Não faz query
adicional ao banco — reaproveita `req.user.permissions`, já resolvido por
`authenticate` junto do `AccessProfile` do usuário.

**Headers:** Authorization: Bearer \<token\>

**Response (200) — usuário `admin` global (todos os módulos, sempre `approve`):**
```json
{
  "success": true,
  "data": {
    "modules": { "dashboard": "approve", "estoque": "approve", "...": "approve" },
    "profile": null
  }
}
```

**Response (200) — usuário com perfil "Almoxarife":**
```json
{
  "success": true,
  "data": {
    "modules": { "estoque": "operate", "producao": "operate", "dashboard": "operate" },
    "profile": { "id": 3, "nome": "Almoxarife" }
  }
}
```

**Response (200) — usuário sem perfil atribuído (UC-35-Exceção):**
```json
{ "success": true, "data": { "modules": {}, "profile": null } }
```

---

## 1.1 Usuários (Gestão)

Endpoints de gestão de usuários do ERP (CRUD administrativo). Distintos de
`/api/auth/register` (que também cria usuários, mas focado no fluxo de
autenticação) — mesma validação de nome/email/senha é reutilizada
internamente pelos dois. Todos os endpoints abaixo exigem `authenticate` +
`authorize('admin')`.

### GET /api/users
Lista usuários com busca/filtro e paginação.

**Headers:** Authorization: Bearer \<token\> (role: admin)

**Query Params:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| page | int | Nº da página (default: 1) |
| limit | int | Itens por página (default: 10) |
| search | string | Busca por nome ou email |
| role | string | Filtro exato: admin / operator / financial |
| active | boolean | Filtro exato: true / false |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Administrador",
      "email": "admin@evokaudio.com.br",
      "role": "admin",
      "active": true,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 3,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### GET /api/users/:id
Retorna os dados de um usuário específico (sem `password`).

**Erro (404) — formato estruturado (`NotFoundError`):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Usuário não encontrado"
  }
}
```

### POST /api/users
Cria um novo usuário.

**Request:**
```json
{
  "name": "Novo Usuário",
  "email": "novo@evokaudio.com.br",
  "password": "123456",
  "role": "operator"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Novo Usuário",
    "email": "novo@evokaudio.com.br",
    "role": "operator"
  }
}
```

**Erro (400) — email/senha inválidos ou `role` fora de `admin|operator|financial` (`ValidationError`); erro (409) — email já cadastrado (`ConflictError`).**

### PUT /api/users/:id
Atualiza nome/email/role/active de um usuário. **Não permite alterar senha** por este endpoint.

**Request:**
```json
{
  "name": "Nome Atualizado",
  "role": "financial",
  "active": true
}
```

**Erro (400) — se `password` for enviado no corpo (`ValidationError`, mensagem `"Use endpoint específico para alterar senha"`); erro (409) — email já cadastrado.**

### DELETE /api/users/:id
Inativa (soft delete via `active=false`) um usuário. Bloqueia auto-inativação.

**Response (200):**
```json
{
  "success": true,
  "data": { "message": "Usuário inativado com sucesso" }
}
```

**Erro (422) — usuário tentando inativar a si mesmo (`BusinessRuleError`):**
```json
{
  "success": false,
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Você não pode inativar seu próprio usuário"
  }
}
```

### PUT /api/users/:id/access-profile
Atribui (ou remove, com `access_profile_id: null`) o perfil de acesso de
área do usuário (UC-33). A troca **não** invalida sessão/token já
emitidos do usuário-alvo (UC-36 — vale a partir do próximo login para o
menu; a API já reflete o novo perfil na próxima requisição, sem cache).

**Headers:** Authorization: Bearer \<token\> (role: admin)

**Request:**
```json
{ "access_profile_id": 3 }
```

**Response (200):**
```json
{ "success": true, "data": { "id": 12, "accessProfileId": 3 } }
```

**Erro (404)** — usuário ou perfil informado não existem.
**Erro (422)** — perfil informado existe mas está `active = false` (`BusinessRuleError`).

---

## 1.2 Perfis de Acesso (Access Profiles)

Endpoints de gestão dos Perfis de Acesso Configuráveis (UC-30 a UC-32,
`docs/business/01-USE_CASES.md`). Todos os endpoints abaixo exigem
`authenticate` + `authorize('admin')` — CRUD de perfis é exclusivo do
Administrador Global, nunca delegado a um perfil de área (mesmo com
`approve`).

### GET /api/access-profiles/modules
Lista os 26 `module keys` válidos, com rótulo pt-BR — fonte única
compartilhada com o middleware `authorizeModule`.

**Response (200):**
```json
{
  "success": true,
  "data": [
    { "key": "dashboard", "label": "Dashboard" },
    { "key": "estoque", "label": "Estoque" },
    "..."
  ]
}
```

### GET /api/access-profiles
Lista todos os perfis (ativos e inativos), com a matriz de permissões e a
contagem de usuários **ativos** vinculados a cada um.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "nome": "Almoxarife",
      "descricao": null,
      "allowedWarehouses": null,
      "active": true,
      "permissions": [{ "module": "estoque", "level": "operate" }],
      "userCount": 5
    }
  ]
}
```

### GET /api/access-profiles/:id
Busca um perfil por id, mesmo formato do item da listagem acima.
**Erro (404)** se não existir.

### POST /api/access-profiles
Cria um novo perfil de acesso (UC-30).

**Request:**
```json
{
  "nome": "Almoxarife",
  "descricao": "Movimentação de estoque de insumos",
  "allowed_warehouses": ["INSUMOS"],
  "permissions": [
    { "module": "estoque", "level": "approve" },
    { "module": "producao", "level": "operate" }
  ]
}
```

**Response (201):** mesmo formato do item de `GET /api/access-profiles` (com `userCount: 0`).

**Erro (409)** — `nome` duplicado.
**Erro (422)** — nenhuma permissão informada, `module` inválido/duplicado, ou `level` fora de `operate|approve`.

### PUT /api/access-profiles/:id
Edita um perfil existente, **substituindo integralmente** a matriz de
`permissions` (UC-31). Mesmo payload do `POST`. Audita `oldValues`/`newValues`
com a matriz de permissões anterior completa.

**Erro (404)** — perfil não existe.
**Erro (409)/(422)** — mesmas regras do `POST`.

### DELETE /api/access-profiles/:id
Desativa (soft delete, `active = false`) um perfil (UC-32).

**Response (200):**
```json
{ "success": true, "data": { "id": 3, "nome": "Almoxarife", "active": false } }
```

**Erro (422)** — há usuário(s) ativo(s) vinculado(s) ao perfil (`BusinessRuleError`):
```json
{
  "success": false,
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Não é possível desativar o perfil \"Almoxarife\": há 2 usuário(s) ativo(s) vinculado(s) a ele. Reatribua cada usuário a outro perfil (PUT /api/users/:id/access-profile) antes de desativar.",
    "details": {
      "profileId": 3,
      "profileName": "Almoxarife",
      "userCount": 2,
      "users": [{ "id": 1, "name": "João", "email": "joao@evokaudio.com" }]
    }
  }
}
```

---

## 2. Clientes

### GET /api/clients
Lista todos os clientes (com paginação e busca).

**Query Params:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| page | int | Nº da página (default: 1) |
| limit | int | Itens por página (default: 10) |
| search | string | Busca por nome ou CPF/CNPJ |
| status | string | active / inactive |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "João Silva",
      "cpf_cnpj": "123.456.789-00",
      "phone": "(11) 99999-8888",
      "email": "joao@email.com",
      "address": "Rua A, 123",
      "status": "active",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

### GET /api/clients/:id
Retorna os dados de um cliente específico.

### POST /api/clients
Cadastra um novo cliente.

**Request:**
```json
{
  "name": "Maria Souza",
  "cpf_cnpj": "987.654.321-00",
  "phone": "(11) 97777-6666",
  "email": "maria@email.com",
  "address": "Rua B, 456",
  "notes": "Cliente desde 2023",
  "cnae": "2660-4/00"
}
```

**Campos:**
| Campo | Tipo | Obrigatório | Observação |
|-------|------|-------------|------------|
| name | string | **sim** | Nome ou razão social |
| cpf_cnpj | string | **sim** | CPF (11 díg.) ou CNPJ (14 díg.), validado por dígito verificador |
| phone | string(20) | não | Ausente grava `''` (coluna `NOT NULL DEFAULT ''`), nunca `NULL` |
| email | string(100) | não | Idem `phone`; aceita `''` |
| notes | string(2000) | não | Idem `phone` |
| tax_regime | string(50) | não | `simples_nacional` / `lucro_presumido` / `lucro_real` |
| ie / im | string(20) | não | Inscrição estadual / municipal |
| **cnae** | string(10) | **não** | **NOVO (2026-08-10)** — ver nota abaixo |
| cep, street, number, complement, neighborhood, city, state | string | não | Endereço inteiro é opcional |

> **`cnae` — decisão D-I do dono do produto (2026-08-10): "sim, mas opcional".**
> O campo é aceito por `POST /api/clients` e `PUT /api/clients/:id`, mas **não
> trava a criação** — CNAE não se aplica a pessoa física. Ausência (ou string
> em branco) grava `NULL`, nunca `''`, porque `clients.cnae` é
> `varchar(10) NULL` **sem `DEFAULT`**. Nenhuma máscara/regex de formato é
> imposta: a decisão foi disponibilizar o campo, não normalizá-lo. O limite de
> 10 caracteres é validado na API (422) para não virar erro 500 do Postgres.
> Antes desta data a coluna existia no banco mas era inalcançável — o
> `createClientSchema` é `.strict()` e rejeitava a chave.

O schema é `.strict()`: qualquer campo não listado acima resulta em `422`.

### PUT /api/clients/:id
Atualiza os dados de um cliente.

Aceita os mesmos campos do `POST` (todos opcionais), **exceto `cpf_cnpj`**, que
não é editável, mais `status`. `cnae` está na allowlist desde 2026-08-10, para
que um cliente cadastrado sem CNAE possa recebê-lo depois.

### DELETE /api/clients/:id
Inativa um cliente (soft delete - status = 'inactive').

---

## 3. Produtos

### GET /api/products
Lista todos os produtos.

**Query Params:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| page | int | Nº da página |
| limit | int | Itens por página |
| search | string | Busca por nome ou código |
| category_id | int | Filtrar por categoria |
| low_stock | bool | Apenas estoque baixo |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Microfone SM58",
      "code": "MIC-SM58",
      "description": "Microfone dinâmico cardioide",
      "price": 599.90,
      "cost_price": 350.00,
      "quantity": 15,
      "min_quantity": 5,
      "status": "active",
      "category": {
        "id": 1,
        "name": "Microfones"
      }
    }
  ],
  "pagination": {
    "total": 120,
    "page": 1,
    "limit": 10,
    "totalPages": 12
  }
}
```

### POST /api/products
Cadastra um novo produto.

**Request:**
```json
{
  "name": "Cabo P10 5m",
  "code": "CAB-P10-5M",
  "description": "Cabo de áudio P10 5 metros",
  "price": 39.90,
  "cost_price": 22.00,
  "quantity": 50,
  "min_quantity": 10,
  "category_id": 3
}
```

### PUT /api/products/:id
Atualiza dados do produto.

### DELETE /api/products/:id
Inativa um produto (bloqueado se houver vendas ativas associadas: retorna erro de regra de negocio).

### POST /api/products/movements
Registra uma movimentacao manual de estoque (entrada ou saida) para um produto.

**Request:**
```json
{
  "product_id": 1,
  "type": "in",
  "quantity": 10,
  "description": "Ajuste de inventario"
}
```

### GET /api/products/:id/stock-by-warehouse
**Novo (Bloco 4 — Depósitos).** Retorna o saldo de UM produto específico,
detalhado por depósito (`authorizeModule('estoque')`, nível de leitura —
mesmo padrão do endpoint de listagem `GET /api/inventory/warehouse-stock`).
Complementa `GET /api/inventory/warehouse-stock?product_id=` (que cobre o
mesmo caso de uso via query param, com paginação para múltiplos produtos)
com uma rota aninhada dedicada ao detalhe de um único produto.

**Decisão de escopo:** a resposta inclui **todos os depósitos ativos**,
mesmo aqueles em que o produto ainda não tem nenhuma linha em
`product_warehouse_stock` (retornados com `quantity: 0`) — ao contrário do
backfill original (que só cria linha para saldo > 0). Isso evita que o
frontend precise cruzar a lista de depósitos com a lista de saldos para
descobrir os que faltam (ex.: tela de transferência precisa oferecer os 3
depósitos como origem/destino mesmo que o saldo atual em algum deles seja
zero).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "product": { "id": 1, "code": "AF-001", "name": "Alto-Falante 8\"", "quantity": "100.000000" },
    "warehouses": [
      { "warehouse_id": 2, "warehouse_code": "ACABADOS", "warehouse_name": "Deposito de Produto Acabado", "quantity": 0 },
      { "warehouse_id": 1, "warehouse_code": "INSUMOS", "warehouse_name": "Deposito de Insumos de Producao", "quantity": 100 },
      { "warehouse_id": 3, "warehouse_code": "LABORATORIO", "warehouse_name": "Deposito do Laboratorio", "quantity": 0 }
    ]
  }
}
```

**Erro (404) — produto inexistente (`NotFoundError`, `NOT_FOUND`).**

> Nota de arquitetura: desde a Fase 5 do TODO, o modulo Produtos foi migrado
> para Clean Architecture (`server/src/modules/products/`). O contrato de
> `/api/products` (paths, metodos, formato de resposta) permanece identico;
> apenas a implementacao interna passou a usar entidades de dominio e use
> cases. Detalhes em `server/src/modules/products/README.md`.

> **BREAKING CHANGE (2026-08-06):** o Item Mestre canônico (`POST`/`PATCH
> /api/items` — não confundir com `/api/products`, que é o schema legado)
> tem o campo `fornecedor_padrao_id`. Até 2026-08-06 essa coluna era `UUID`
> no banco (herdada por engano da tabela órfã `fornecedores`), mas o
> código sempre associava a FK ao model `Supplier` real (`suppliers.id`,
> `INTEGER`) — na prática o campo era impossível de preencher via API
> (`operator does not exist: uuid = integer` em qualquer `include`).
> Migration `20260806-000040-fix-items-fornecedor-padrao-id-type.cjs`
> corrigiu a coluna para `INTEGER` com FK real para `suppliers(id)` (`ON
> DELETE SET NULL`). **A partir de agora, `POST`/`PATCH /api/items` exige
> um inteiro (`supplier_id`) em `fornecedor_padrao_id`, não mais um UUID**
> (validator: `z.coerce.number().int().positive().nullable().optional()`
> em `server/src/modules/items/presentation/validators/itemValidators.ts`).
> Nenhum dado existente foi perdido — as 13 linhas de `items` em produção
> tinham o campo 100% `NULL` no momento da correção.

---

## 4. Categorias

### GET /api/categories
Lista todas as categorias.

**Response (200):**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Microfones", "description": "Microfones profissionais", "product_count": 12 },
    { "id": 2, "name": "Mesas de Som", "description": "Mesas de som e mixers", "product_count": 8 }
  ]
}
```

### POST /api/categories
```json
{
  "name": "Caixas de Som",
  "description": "Caixas acústicas ativas e passivas"
}
```

### PUT /api/categories/:id
### DELETE /api/categories/:id

---

## 5. Vendas

> Nota de arquitetura: os endpoints de `/api/sales` sao servidos pelo
> modulo `server/src/modules/sales/` (Clean Architecture). A criacao
> reutiliza `server/src/services/inventoryService.ts` (lock pessimista +
> transacao) para **reservar** estoque. O calculo em centavos das parcelas
> de `AccountReceivable` (ultima parcela absorve o resto da divisao)
> continua usando `server/src/shared/utils/money.ts`, mas mudou de lugar:
> desde o G13 vive em `server/src/services/saleReceivableService.ts` e roda
> na **autorizacao da NF-e**, nao mais na venda. Erros de
> validacao/regra de negocio retornam `{ success: false, error: { code,
> message } }` (em vez de string simples, mesmo padrao ja adotado em
> `inventory`/`bom`/`production`/`purchases`). Ver
> `server/src/modules/sales/README.md` para detalhes.

> ### ⚠️ Quando o estoque sai (gap **G9**, 2026-08-10)
>
> **Confirmar o pedido RESERVA. Autorizar a NF-e BAIXA.**
>
> | Momento | Efeito em `products.quantity` | Efeito em `production_order_reservations` | Efeito no deposito ACABADOS |
> |---|---|---|---|
> | `POST /api/sales` com `status: 'quote'` | nenhum | nenhum | nenhum |
> | `POST /api/sales` com `status: 'confirmed'` (default) | **nenhum** | cria reserva (dona = a venda) | nenhum |
> | `PUT /api/sales/:id/status` `quote → confirmed` | **nenhum** | cria reserva | nenhum |
> | `PUT /api/sales/:id/items` (venda `confirmed`) | **nenhum** | ajusta a reserva pelo delta | nenhum |
> | `POST /api/sales/:id/nfe` **autorizada** | **-quantidade faturada** | consome a reserva no mesmo montante | **-quantidade faturada** |
> | `GET /api/sales/:id/nfe` que reconcilia uma autorizacao assincrona | idem acima | idem acima | idem acima |
> | `PUT /api/sales/:id/status` `→ canceled` | **+`invoiced_quantity`** (so o que ja virou NF-e) | libera todo o saldo reservado | **+`invoiced_quantity`** |
> | `PUT /api/sales/:id/status` `invoiced → shipped` | nenhum | nenhum | nenhum |
>
> Base normativa: Ajuste SINIEF 07/05, clausula 1a §1o e clausula 9a §1o — a
> NF-e e autorizada antes do fato gerador e a mercadoria so transita depois
> da autorizacao de uso. Ate 2026-08-10 a baixa ocorria na confirmacao do
> pedido, registrando saida de mercadoria que ainda estava fisicamente na
> empresa. Decisao D-A do dono
> (`docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4).

> ### ⚠️ Quando nasce a conta a receber (gap **G13**, 2026-08-10)
>
> **Confirmar o pedido NAO cobra. Autorizar a NF-e cobra.**
>
> | Momento | Efeito em `accounts_receivable` |
> |---|---|
> | `POST /api/sales` com `status: 'quote'` | nenhum |
> | `POST /api/sales` com `status: 'confirmed'` (default) | **nenhum** (antes criava as parcelas) |
> | `PUT /api/sales/:id/status` `quote → confirmed` | **nenhum** (antes criava as parcelas) |
> | `POST /api/sales/:id/nfe` **autorizada** | **cria as parcelas do valor DESTA emissao**, sempre `pending` |
> | `GET /api/sales/:id/nfe` que reconcilia uma autorizacao assincrona | idem acima |
> | `PUT /api/sales/:id/status` `→ canceled` | cancela as parcelas ainda nao pagas |
>
> Base normativa: **CPC 47** item 31 (receita quando o cliente obtem o
> CONTROLE), item 38 (na confirmacao nao ha posse fisica, titularidade,
> aceite nem direito presente a pagamento) e item 108 (recebivel exige
> direito **incondicional**). Ate 2026-08-10 as parcelas nasciam na
> confirmacao — antecipando receita e inflando o ativo — e a venda a vista
> nascia com `status: 'paid'` e `payment_date` preenchido **sem que nenhum
> dinheiro tivesse entrado**, o que quebrava conciliacao bancaria, trilha de
> auditoria e segregacao de funcoes.
>
> Regras derivadas:
> - **Faturamento parcial**: uma venda faturada em duas notas gera duas
>   levas de parcelas, cada uma no valor da sua nota, com **numeracao
>   continua** (`installment` 1..N, depois N+1..M) — o mesmo criterio que o
>   G9 ja aplicava ao estoque.
> - **Nenhuma parcela nasce `paid`**: mesmo venda a vista nasce `pending`
>   com vencimento na data da emissao; a baixa e evento proprio
>   (`PUT /api/finance/receivable/:id/pay`), com valor, data, usuario e
>   contrapartida conciliavel no extrato.
> - **Dado legado**: venda confirmada **antes** do corte ja tem parcelas
>   criadas pela regra antiga, reconheciveis por `invoice_number IS NULL`.
>   Faturar essa venda **nao recria** o recebivel (evita duplicacao) e nao
>   altera nenhuma linha existente.
> - **Cobranca avulsa continua livre** (decisao D-J): reembolso, aluguel e
>   venda de sucata entram por `POST /api/finance/receivable`, sem
>   `sale_id`.
>
> Consequencia para quem consome a API: entre confirmar e faturar, o produto
> aparece com `quantity` inalterada e `reserved_quantity` maior. O estoque
> **disponivel** para novas vendas/OPs e `quantity - reserved_quantity` — e
> e esse o numero validado ao confirmar um pedido (422 quando insuficiente).
>
> Requer a migration `20260810-000030-generalize-stock-reservations-for-sales-g9.cjs`
> aplicada (ver `docs/database/DATABASE.md`, secao G9).

### GET /api/sales
Lista vendas com paginação.

**Query Params:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| page | int | Nº da página |
| limit | int | Itens por página |
| status | string | quote, confirmed, invoiced, shipped, canceled |
| start_date | date | Início do período |
| end_date | date | Fim do período |
| customer_id | int | Filtrar por cliente |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customer": { "id": 1, "name": "João Silva" },
      "user": { "id": 1, "name": "Admin" },
      "total_amount": 1250.00,
      "status": "confirmed",
      "payment_method": "credit_card",
      "items_count": 3,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### POST /api/sales
Registra uma nova venda.

**Request:**
```json
{
  "customer_id": 1,
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "unit_price": 599.90
    },
    {
      "product_id": 3,
      "quantity": 1,
      "unit_price": 39.90
    }
  ],
  "discount": 0,
  "payment_method": "credit_card",
  "installments": 3,
  "notes": "Entrega agendada"
}
```

**Response (201) - Venda registrada com sucesso:**
```json
{
  "success": true,
  "data": {
    "id": 10,
    "customer_id": 1,
    "total_amount": 1239.70,
    "status": "confirmed",
    "items": [
      {
        "product_id": 1,
        "quantity": 2,
        "unit_price": 599.90,
        "total_price": 1199.80
      },
      {
        "product_id": 3,
        "quantity": 1,
        "unit_price": 39.90,
        "total_price": 39.90
      }
    ],
    "accounts_receivable": []
  }
}
```

> **⚠️ G13 (2026-08-10): `accounts_receivable` vem VAZIO na criação da
> venda.** Até esta data as parcelas eram criadas aqui (e a venda à vista
> nascia `paid`). Agora elas nascem na autorização da NF-e
> (`POST /api/sales/:id/nfe`), no valor de cada emissão — CPC 47 item 108,
> recebível exige direito incondicional. Ver o quadro "Quando nasce a conta
> a receber" no início desta seção.

### GET /api/sales/:id
Detalhes completos de uma venda.

### PUT /api/sales/:id/status
Atualiza status da venda (máquina de estados: `quote` → `confirmed` →
`invoiced` → `shipped`; `canceled` disponível a partir de
`quote`/`confirmed`/`invoiced`). `shipped` é terminal: não pode ser
cancelada (422) nem transicionar para nenhum outro status.

**(Novo, 2026-08-06)** `partially_invoiced` também faz parte da máquina de
estados (`confirmed → partially_invoiced → invoiced`), mas é uma
transição **automática**, disparada por `POST /:id/nfe` quando a NF-e
emitida cobre só parte da quantidade dos itens — nunca aceita como valor
manual de `PUT /:id/status` (só `POST /:id/nfe` decide isso). Embarque
(`shipped`) continua exigindo a venda totalmente `invoiced`.

**Request:**
```json
{
  "status": "canceled"
}
```

**Request (expedição, Onda 3):**
```json
{
  "status": "shipped"
}
```
Só é aceito a partir de `invoiced`. Qualquer outra origem retorna 422
(`BusinessRuleError`). Cancelar uma venda já `shipped` também retorna 422,
com a mensagem "Venda já foi expedida (status shipped) e não pode ser
cancelada."

**(G9, 2026-08-10) Efeito em estoque desta rota:**
- `quote → confirmed`: **reserva** o produto acabado de cada item (não
  baixa). 422 com `details.rule = 'reservation_requires_owner'` é erro de
  programação (dono ausente); 422 de estoque insuficiente é validado contra
  `quantity - reserved_quantity` sob lock.
- `→ canceled`: libera **todo** o saldo reservado da venda e devolve ao
  estoque **apenas** `sale_items.invoiced_quantity` (o que já tinha virado
  NF-e). Cancelar um `quote` não movimenta estoque nenhum — antes do G9
  este caminho devolvia a quantidade inteira do item e criava estoque
  fantasma em orçamento cancelado.
- `invoiced → shipped`: não movimenta estoque (a baixa já ocorreu na
  autorização da NF-e). Continua exigindo `nfe_status === 'authorized'`.

### PUT /api/sales/:id/items
**(Novo, 2026-08-06)** Gap 2/3 do módulo `sales` ("Alteração de pedido",
`docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`). Substitui **todo** o conjunto de
itens de uma venda (não é um PATCH incremental) — `authorizeModule('vendas',
'operate')`. Implementado em `EditSaleItemsUseCase.ts`.

Permitido apenas com a venda em `quote` ou `confirmed`. A partir de
`partially_invoiced`/`invoiced`/`shipped`/`canceled` retorna **422**
`BUSINESS_RULE_VIOLATION` com `details.status` — a venda já tem NF-e
emitida (total ou parcial) ou já foi encerrada. Em `quote` nada foi
comprometido do estoque ainda; em `confirmed`, **a reserva** criada na
confirmação é ajustada (delta por produto) na mesma transação — desde o G9
(2026-08-10) esta rota **não altera `products.quantity` nem saldo de
depósito**, porque a baixa só acontece na autorização da NF-e.

**Request:**
```json
{
  "items": [
    { "sale_item_id": 42, "product_id": 1, "quantity": 3, "unit_price": 599.90 },
    { "product_id": 5, "quantity": 1, "unit_price": 129.90 }
  ]
}
```
`sale_item_id` omitido = linha nova; informado = atualiza a linha
existente daquele id (precisa pertencer à venda). Toda linha existente
cujo `sale_item_id` não aparecer no payload é removida (com **liberação da
reserva**, se aplicável). `product_id` duplicado no payload é rejeitado
(422).

**Response:** `200 OK`, venda atualizada no mesmo formato de
`GET /api/sales/:id`.

### POST /api/sales/:id/nfe (payload de faturamento parcial)
**(Novo, 2026-08-06)** Gap 3/3 do módulo `sales` ("Faturamento parcial").
Endpoint pré-existente (`authorizeModule('vendas', 'approve')`), agora
aceita um payload opcional para faturar só parte da quantidade dos itens:

**Request (opcional — omitido/vazio preserva o comportamento anterior, fatura o saldo pendente inteiro):**
```json
{
  "items": [
    { "sale_item_id": 42, "quantity": 2 }
  ]
}
```
`quantity` é cumulativa contra `sale_items.invoiced_quantity` — não pode
exceder o saldo pendente (`quantity - invoiced_quantity`) do item. Quando
o saldo pendente de **todos** os itens chega a zero, a venda transiciona
automaticamente para `invoiced`; enquanto houver saldo pendente em pelo
menos um item, fica em `partially_invoiced`. Response continua `202
Accepted` com a venda atualizada (`nfe_status`, `nfe_key`, etc.).

**(G9, 2026-08-10) É esta rota que baixa o estoque.** Quando a NF-e é
autorizada, e **na mesma transação** que incrementa `invoiced_quantity`,
o serviço `server/src/services/saleStockService.ts`:
1. libera a reserva da venda no montante faturado;
2. consome `products.quantity` (gera `InventoryMovement` `type='out'`,
   `reference_type='sale'`, `reference_id` = id da venda, `user_id` do JWT);
3. debita o depósito `ACABADOS`.

A baixa é **proporcional à quantidade desta emissão**, nunca ao pedido
inteiro: faturar 10 unidades em 4 + 6 gera duas baixas (4 e 6). NF-e
`denied` não baixa nada.

Se a baixa falhar (estoque insuficiente — só possível em venda legada sem
reserva ou após ajuste manual), a transação inteira volta atrás:
`invoiced_quantity` **não** avança sem a baixa correspondente. A emissão
continua recuperável — `sale_invoices` já foi gravado com o snapshot de
itens na transação de reserva, então, depois de corrigir o estoque,
`GET /api/sales/:id/nfe` reconsulta o provedor e reaplica.

**Nota histórica (já resolvido, corrigido aqui em 2026-08-10):** o texto
anterior desta seção dizia que não existia tabela `sale_invoices` e que
`GetSaleNfeStatusUseCase` não atualizava `invoiced_quantity`. As duas coisas
foram entregues em 2026-08-06 — `sale_invoices` (1 venda : N NF-e) guarda 1
registro por emissão com snapshot de itens, e o caminho assíncrono
(`focus_nfe`/`enotas`) aplica a mesma lógica de acúmulo do síncrono via
`SaleInvoiceAccumulator`, além da baixa de estoque do G9. `Sale.nfe_*`
continua em dual-write com a emissão **mais recente**, por
compatibilidade de leitura.

**(G13, 2026-08-10) É também esta rota que cria a conta a receber.** Na
mesma transação da baixa de estoque e do `invoiced_quantity`, o serviço
`server/src/services/saleReceivableService.ts` gera as parcelas em
`accounts_receivable`:
- valor = total **desta emissão** (não do pedido), rateado por
  `sales.installments`, com a última parcela absorvendo o resto da divisão
  em centavos (regra F24 preservada);
- `installment` continua a numeração da emissão anterior (nota 1 → 1..N,
  nota 2 → N+1..M);
- vencimento: parcela única vence na data da emissão; N parcelas vencem
  +1, +2… meses a partir dela (sem overflow de data);
- `status` sempre `pending`, `payment_date` sempre `null` —
  **nenhuma parcela nasce paga**, nem em venda à vista;
- `invoice_number` recebe o número da NF-e, o que distingue o recebível
  novo do legado (criado na confirmação, sem nota).

Venda **legada** (confirmada antes do corte, com parcelas já criadas pela
regra antiga) **não** ganha parcelas novas ao ser faturada — a duplicação
de recebível é bloqueada e nenhuma linha existente é alterada.

**Risco residual:** cancelar uma NF-e autorizada
(`POST /api/sales/:id/nfe/cancel`) **não** reverte `invoiced_quantity`, não
devolve o estoque baixado e **não cancela as parcelas geradas por essa
emissão** — comportamento pré-existente ao G9, mantido de propósito para as
três coisas permanecerem coerentes entre si (baixado == faturado ==
cobrado). A reversão, hoje, é manual (ajuste de estoque + baixa/cancelamento
da parcela) ou pelo cancelamento da venda, que já derruba os recebíveis
pendentes. Ver `docs/governance/TODO.md`.

### Tabela de preços por cliente (`/api/sales/customers/:id/prices`)
**(Novo, 2026-08-06)** Gap 1/3 do módulo `sales`. Preço unitário negociado
por par cliente×produto, com vigência opcional. Referencia `products.id`
(schema legado, mesmo usado pelo restante do fluxo de vendas), não
`items.id`. `authorizeModule('vendas', ...)` — leitura para todos, escrita
exige `operate`.

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/sales/customers/:id/prices?product_id=&active_only=` | Lista preços do cliente (filtros opcionais) |
| `POST` | `/api/sales/customers/:id/prices` | Cria `{ product_id, unit_price, currency?, valid_from?, valid_until? }` (`currency` default `"BRL"`, datas `YYYY-MM-DD`) |
| `PUT` | `/api/sales/customers/:id/prices/:priceId` | Atualiza `{ unit_price?, currency?, valid_from?, valid_until? }` |
| `DELETE` | `/api/sales/customers/:id/prices/:priceId` | Soft delete (`active = false`) |

Não há índice único de `customer_id + product_id` no banco — a vigência
permite múltiplas faixas de preço no tempo para o mesmo par (ex.: reajuste
anual mantendo histórico); a unicidade de uma vigência ativa e não
sobreposta é validada na camada de aplicação
(`CreateCustomerPriceUseCase`), não no banco. UI: dialog "Tabela de
preços" em `ClientsPage.tsx`, com sugestão de preço ao adicionar item ao
pedido (editável manualmente).

---

## 6. Financeiro

Implementado no módulo `server/src/modules/financial/` (Clean Architecture). Todas as rotas exigem `authenticate`; `POST /api/finance/payable` exige adicionalmente `authorize('admin', 'financial')`.

> **⚠️ Gap G13 (2026-08-10) — quando cada conta nasce.** A conta a **pagar**
> de compra nasce no **recebimento** (`POST /api/purchases/:id/receive`), não
> mais na aprovação do pedido: pelo **CPC 00 (R2) itens 4.56/4.58**, pedido
> aprovado e não entregue é contrato executório, não passivo. A conta a
> **receber** de venda nasce na **autorização da NF-e**
> (`POST /api/sales/:id/nfe`), não mais na confirmação do pedido: pelo
> **CPC 47 itens 31/38/108**, recebível exige direito incondicional, que só
> existe com a nota. **Nenhuma parcela nasce `paid`** — quitação é evento
> próprio (`PUT /api/finance/receivable/:id/pay`). Cobrança **avulsa**, sem
> venda, continua livre em `POST /api/finance/receivable` (decisão D-J).

### GET /api/finance/receivable
Contas a receber, com paginação.

**Query Params:** status, start_date, end_date, customer_id, page, limit

**Response:** `{ success: true, data: AccountReceivable[], pagination: { total, page, limit, totalPages } }` (cada item inclui `customer` e `sale`).

### POST /api/finance/receivable
Registra uma cobrança **avulsa**, sem venda vinculada — reembolso, aluguel,
venda de sucata (decisão D-J do dono do produto). RBAC:
`authorizeModule('financeiro', 'operate')`.

**Request:**
```json
{
  "customer_id": 12,
  "amount": 350.50,
  "due_date": "2026-09-15",
  "installment": 1,
  "invoice_number": "REC-2026-014",
  "notes": "Venda de sucata de alumínio",
  "cost_center_id": 3
}
```
Campos obrigatórios: `customer_id`, `amount` (> 0), `due_date`. Opcionais:
`installment` (default 1), `invoice_number`, `notes`, `cost_center_id`.
Criada sempre com `sale_id: null` e `status: "pending"`.

**Erros de regra (422, `BusinessRuleError`) — sempre com `details.rule`:**

| `details.rule` | Quando | Mensagem resumida |
|---|---|---|
| `G13-AR` | `sale_id` informado | Recebível de venda nasce na autorização da NF-e (`POST /api/sales/:id/nfe`), não neste endpoint. Cobrança avulsa deve vir **sem** `sale_id`. |
| `G13-AR-PAID` | `status` informado | Conta a receber sempre nasce pendente; registre o recebimento em `PUT /api/finance/receivable/:id/pay`, para existir data, valor, usuário e contrapartida conciliável no extrato. |

### PUT /api/finance/receivable/:id/pay
Registra recebimento de conta a receber (total ou parcial via `amount`).

**Request:**
```json
{
  "payment_date": "2024-01-20",
  "payment_method": "pix",
  "amount": 413.23
}
```
Regras: conta não pode estar `paid` ou `canceled`; se `amount` informado, deve ser > 0 e não pode exceder o valor atual da conta. Em caso de sucesso, `status` vira `paid`.

### GET /api/finance/payable
Contas a pagar, com paginação.

**Query Params:** status, start_date, end_date, page, limit

**Response:** `{ success: true, data: AccountPayable[], pagination: { total, page, limit, totalPages } }`

### POST /api/finance/payable
Registra nova conta a pagar. Requer papel `admin` ou `financial`.

**Request:**
```json
{
  "description": "Conta de Luz",
  "amount": 450.00,
  "due_date": "2024-02-10",
  "category": "Utilidades"
}
```
Campos obrigatórios: `description`, `amount` (> 0), `due_date`. Opcionais: `category`, `supplier_id`, `purchase_id`, `notes`. Criada sempre com `status: "pending"`.

### PUT /api/finance/payable/:id/pay
Registra pagamento de conta a pagar (total ou parcial via `amount`). Mesmas regras de `PUT /api/finance/receivable/:id/pay`.

### GET /api/finance/cash-flow
Fluxo de caixa agregado por status, no período informado (padrão: mês corrente).

**Query Params:** start_date, end_date

**Response:**
```json
{
  "success": true,
  "data": {
    "period": { "start": "2024-01-01T00:00:00.000Z", "end": "2024-01-31T00:00:00.000Z" },
    "summary": {
      "total_receivable": 25000.00,
      "total_payable": 18000.00,
      "pending_receivable": 12000.00,
      "pending_payable": 5000.00,
      "projected_balance": 7000.00,
      "actual_balance": 7000.00
    },
    "receivable_by_status": [ { "status": "pending", "total": "12000.00" }, { "status": "paid", "total": "13000.00" } ],
    "payable_by_status": [ { "status": "pending", "total": "5000.00" }, { "status": "paid", "total": "13000.00" } ]
  }
}
```

### GET /api/finance/cash-flow-projection
**(Onda 3)** Projeção semanal de fluxo de caixa dos títulos EM ABERTO
(`accounts_receivable`/`accounts_payable` com `payment_date IS NULL` e
`status != 'canceled'`), com saldo acumulado por semana. Exige
`authorize('admin', 'financial')`.

**Query Params:** `days` (int, 7 a 90, default 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "horizon_days": 30,
    "totals": {
      "receivable": 25000.00,
      "payable": 18000.00,
      "net": 7000.00,
      "overdue_receivable": 1200.00,
      "overdue_payable": 300.00
    },
    "due_next_7_days": { "receivable": 4000.00, "payable": 2500.00 },
    "weeks": [
      {
        "week_start": "2026-08-03",
        "week_end": "2026-08-09",
        "receivable": 4000.00,
        "payable": 2500.00,
        "net": 1500.00,
        "cumulative_net": 1500.00
      }
    ]
  }
}
```
Títulos vencidos e não pagos (`due_date < hoje`) entram apenas em
`totals.overdue_receivable`/`totals.overdue_payable`, nunca em nenhuma
semana do horizonte futuro. `cumulative_net` acumula o `net` de todas as
semanas anteriores.

### GET /api/finance/cashflow/projection
**(Novo, 2026-08-06)** Projeção de fluxo de caixa **diária** (série dia a
dia com saldo acumulado a partir de um saldo de abertura informado) —
complementa a projeção semanal acima (`GET /api/finance/cash-flow-projection`),
que continua existindo sem alteração. `authorizeModule('financeiro')`
(qualquer nível — leitura).

**Query Params:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| days | int | Horizonte: **apenas `30`, `60` ou `90`** (default `30`; outros valores → 400) |
| opening_balance | number | Saldo de caixa inicial informado pelo usuário (default `0`) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "horizon_days": 30,
    "opening_balance": 10000.00,
    "overdue": { "receivable": 1200.00, "payable": 300.00 },
    "series": [
      {
        "date": "2026-08-06",
        "day_index": 0,
        "receivable": 4000.00,
        "payable": 2500.00,
        "net": 1500.00,
        "balance": 11500.00
      }
    ],
    "summary": {
      "lowest_balance": { "date": "2026-08-14", "balance": 8200.00 },
      "final_balance": 15300.00
    }
  }
}
```
Regras:
- A série cobre `[hoje, hoje + days]` inclusive (`days + 1` pontos, `day_index` de `0` a `days`).
- Títulos **vencidos** (`due_date < hoje`, não pagos) são somados no dia `0` (hoje) da série — já deveriam ter movimentado o caixa — e também expostos separadamente em `overdue` para transparência.
- `balance` de cada dia = saldo do dia anterior + `net` do dia (o dia `0` parte de `opening_balance`).
- `summary.lowest_balance` é o menor `balance` de toda a série (calculado sobre saldos **após** a movimentação de cada dia, nunca sobre o `opening_balance` isolado) — é o "dado de decisão do CFO" para antecipar risco de caixa negativo.
- Correção de fuso aplicada nesta entrega: datas `DATEONLY` (`due_date`) são normalizadas por componentes de calendário (ano/mês/dia), nunca via `new Date('YYYY-MM-DD')`/`toISOString()`, que deslocavam a série em 1 dia em fusos negativos (`America/Sao_Paulo`, UTC-3).

### Centros de Custo (`/api/finance/cost-centers`)
**(Novo, 2026-08-06)** Gap "centros de custo" de
`docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`. `cost_center_id` (nullable, `ON
DELETE SET NULL`) foi adicionado em `accounts_payable`/`accounts_receivable`
— ver `docs/database/DATABASE.md`.

| Método | Rota | Nível | Descrição |
|--------|------|-------|-----------|
| `GET` | `/api/finance/cost-centers` | leitura | Lista centros de custo (`page`, `limit`, `active`) |
| `POST` | `/api/finance/cost-centers` | `operate` | Cria `{ code, name, description? }` (`code` único) |
| `PUT` | `/api/finance/cost-centers/:id` | `operate` | Atualiza `{ code?, name?, description?, active? }` |
| `GET` | `/api/finance/cost-centers/report?from=&to=` | leitura | Relatório agrupado por centro de custo |
| `PUT` | `/api/finance/payable/:id/cost-center` | `operate` | Atribui/remove (`cost_center_id: null`) o centro de custo de uma conta a pagar existente |
| `PUT` | `/api/finance/receivable/:id/cost-center` | `operate` | Idem, para conta a receber |
| `POST` | `/api/finance/payable` | `operate` | Aceita `cost_center_id` (inteiro, opcional) no payload de criação |

**Response de `GET /api/finance/cost-centers/report?from=2026-08-01&to=2026-08-31`:**
```json
{
  "success": true,
  "data": {
    "period": { "from": "2026-08-01", "to": "2026-08-31" },
    "groups": [
      {
        "cost_center_id": 1,
        "code": "PROD",
        "name": "Produção",
        "receivable": { "open": 0, "realized": 0 },
        "payable": { "open": 4500.00, "realized": 12000.00 }
      },
      {
        "cost_center_id": null,
        "code": null,
        "name": "Sem centro de custo",
        "receivable": { "open": 25000.00, "realized": 13000.00 },
        "payable": { "open": 500.00, "realized": 0 }
      }
    ],
    "totals": {
      "receivable": { "open": 25000.00, "realized": 13000.00 },
      "payable": { "open": 5000.00, "realized": 12000.00 }
    }
  }
}
```
O grupo `"Sem centro de custo"` (`cost_center_id: null`) sempre aparece,
mesmo sem nenhum lançamento no período — cobre 100% do histórico
pré-existente, que nasce sem `cost_center_id` (sem backfill retroativo,
decisão registrada na migration `20260806-000020-create-cost-centers.cjs`:
não há mapeamento automático seguro de lançamentos antigos para um centro
de custo específico). **Fora de escopo, registrado como próxima etapa do
módulo:** mapeamento automático departamento→centro de custo na criação
automática de `AccountPayable` (ex.: ao aprovar um pedido de compra),
conciliação bancária/CNAB — ver `docs/governance/TODO.md`.

### Conciliação Bancária (`/api/finance/reconciliation`)
**(Novo, 2026-08-06)** Fecha parte do gap "conciliação bancária/CNAB" de
`docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` (só a parte OFX — **CNAB fica fora
desta v1**). Sub-router de `/api/finance`, resultando em
`/api/finance/reconciliation/...`. `authorizeModule('financeiro', ...)`
— leitura para todos, escrita (upload/match/ignore/unmatch) exige
`operate`. Tabelas `bank_statements`/`bank_statement_entries`
(migration `20260806-000070-create-bank-statements.cjs`) — ver
`docs/database/DATABASE.md`.

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/finance/reconciliation/statements` | Upload multipart (campo `file`) de um extrato `.ofx`. Cria o extrato e seus lançamentos, com dedup por `fitid` **global** (contra qualquer importação anterior, não só a mesma) |
| `GET` | `/api/finance/reconciliation/statements` | Lista extratos importados, paginado |
| `GET` | `/api/finance/reconciliation/statements/:id/entries?status=` | Lista lançamentos de um extrato (`status`: `pending`/`matched`/`ignored`) |
| `GET` | `/api/finance/reconciliation/statements/:id/suggestions` | Sugestões automáticas de match por lançamento pendente (nunca vincula sozinho) |
| `POST` | `/api/finance/reconciliation/entries/:id/match` | Vincula e dá baixa: `{ payable_id }` **ou** `{ receivable_id }` (XOR, nunca os dois) |
| `POST` | `/api/finance/reconciliation/entries/:id/ignore` | Marca o lançamento como sem conciliação necessária |
| `POST` | `/api/finance/reconciliation/entries/:id/unmatch` | Desfaz o vínculo — **422** se a conta já foi baixada (correção manual exigida, decisão conservadora) |

**Response de `POST /statements` (201):**
```json
{
  "success": true,
  "data": {
    "statement": { "id": 3, "filename": "extrato-agosto.ofx", "bank_name": "341", "period_start": "2026-08-01", "period_end": "2026-08-31" },
    "entries_created": 42,
    "duplicates_skipped": 3,
    "total_in_file": 45
  }
}
```

**Parser OFX:** implementação manual em
`server/src/modules/financial/infrastructure/ofx/`, cobrindo os dois
formatos mais comuns em uso real — OFX 1.x (SGML) e OFX 2.x (XML). **Sem
biblioteca nova** (decisão justificada: cobertura suficiente do
subconjunto necessário para conciliação bancária, sem dependência frágil
numa área de upload de arquivo de terceiro). Detecção de encoding
(Latin-1/CP1252) é **heurística**, não uma leitura garantida do header
OFX.

**Sugestões de match** (`GetMatchSuggestionsUseCase`): para lançamentos de
saída (`amount < 0`), busca contas a pagar em aberto; para entrada
(`amount > 0`), contas a receber em aberto. Candidatos com diferença de
valor até 1 centavo (`MATCH_TOLERANCE_CENTS`) e vencimento a até ±7 dias
da data do lançamento, ordenados por proximidade de data e depois de
valor.

**Riscos residuais documentados:** sem teste de integração end-to-end
contra Postgres real (só unitários com mocks); CNAB (boleto/remessa/
retorno) fora de escopo desta v1 — ver `docs/governance/TODO.md`.

---

## 7. Relatórios

### GET /api/reports/sales
Relatório de vendas.

**Query Params:** start_date, end_date, customer_id

### GET /api/reports/inventory
Relatório de estoque.

### GET /api/reports/customers
Relatório de clientes.

### GET /api/reports/cash-flow
Relatório de fluxo de caixa.

**Response (todos os relatórios):**
```json
{
  "success": true,
  "data": {
    "report_type": "sales",
    "generated_at": "2024-01-20T15:00:00.000Z",
    "filters": {
      "start_date": "2024-01-01",
      "end_date": "2024-01-31"
    },
    "summary": {
      "total_sales": 45,
      "total_amount": 38500.00,
      "average_ticket": 855.55
    },
    "details": [ ... ]
  }
}
```

### GET /api/reports/oee
**(Novo, 2026-08-06)** OEE (Overall Equipment Effectiveness) por centro de
trabalho e agregado geral — fecha o item 7/9 do
`docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` ("OEE completo"). `authorizeModule
('relatorios.producao')` (mesma sub-permissão de `GET /api/reports/production`).

**Query Params:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| start_date | date | Início do período (default: 30 dias atrás) |
| end_date | date | Fim do período (default: hoje) |
| work_center_id | int | Filtra um único centro de trabalho (opcional) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "report_type": "oee",
    "generated_at": "2026-08-06T15:00:00.000Z",
    "period": { "start_date": "2026-07-07", "end_date": "2026-08-06" },
    "work_center_id": null,
    "by_work_center": [
      {
        "work_center_id": 1,
        "code": "CNC-01",
        "name": "Corte CNC",
        "has_shifts": true,
        "available_hours": 168.5,
        "downtime_hours": 7.5,
        "downtime_by_reason": [
          { "reason": "setup", "hours": 4.0 },
          { "reason": "falta_material", "hours": 3.5 }
        ],
        "run_hours": 140.5,
        "standard_hours": 132.0,
        "quantity_good": 980,
        "quantity_scrapped": 20,
        "tracking_count": 42,
        "availability": 0.8338,
        "performance": 0.9395,
        "quality": 0.98,
        "oee": 0.7676,
        "no_data_reason": null
      }
    ],
    "aggregate": {
      "available_hours": 168.5,
      "downtime_hours": 7.5,
      "downtime_by_reason": [
        { "reason": "setup", "hours": 4.0 },
        { "reason": "falta_material", "hours": 3.5 }
      ],
      "run_hours": 140.5,
      "standard_hours": 132.0,
      "quantity_good": 980,
      "quantity_scrapped": 20,
      "tracking_count": 42,
      "availability": 0.8338,
      "performance": 0.9395,
      "quality": 0.98,
      "oee": 0.7676,
      "no_data_reason": null,
      "work_centers_count": 1
    }
  }
}
```

**Fórmulas (os 3 eixos clássicos de OEE):**
- **Disponibilidade** = horas produzindo (`run_hours`, somadas de
  `production_order_tracking` — apontamentos `completed` no período) /
  horas disponíveis **líquidas** (`available_hours`). As horas
  **brutas** de calendário são calculadas do calendário de turnos do
  centro (`work_center_shifts`, multiplicado pelas ocorrências de cada dia
  da semana no período × `machines_count` × `efficiency_factor`; sem
  turnos cadastrados, usa o fallback `capacity_hours_per_day × dias do
  período × machines_count × efficiency_factor`) e então **descontam o
  downtime real** registrado em `production_downtimes` no período:
  `available_hours = max(horas_brutas_calendario - downtime_hours, 0)`
  (satura em zero, nunca fica negativa). `downtime_hours` (soma) e
  `downtime_by_reason` (breakdown por categoria — setup, manutenção
  corretiva/preventiva, falta de material/operador, qualidade, outros)
  vêm no payload **(novo, 2026-08-06)**. Paradas em aberto (`finished_at
  IS NULL`) contam até o fim do período (ou `now`, se anterior).
- **Performance** = (tempo padrão × unidades processadas) / tempo real
  apontado, ambos agregados por centro. Tempo padrão usa
  `standard_time_minutes` da etapa de roteiro; "unidades processadas" =
  boas + refugadas.
- **Qualidade** = unidades boas / (boas + refugadas), agregado por centro
  no período.
- **OEE = Disponibilidade × Performance × Qualidade**, calculado somente
  quando os 3 eixos são não-nulos.
- Cada eixo individual é limitado a 100% (`Math.min(rate, 1)`) — valores
  acima de 100% indicariam horas extras não cadastradas no calendário de
  turnos, nunca eficiência real acima do ideal; as horas brutas
  (`available_hours`/`run_hours`/`standard_hours`) permanecem sem cap no
  payload, para auditoria.
- `availability`/`performance`/`quality`/`oee` são **`null`** (nunca `0`
  artificial/enganoso) quando o denominador correspondente é zero;
  `no_data_reason` explica o motivo em texto (ex.: "sem apontamento
  concluído no período").
- `aggregate` **soma as bases brutas de todos os centros e recalcula os 3
  eixos sobre os totais** — não é a média das taxas por centro (uma média
  simples distorceria o resultado quando os centros têm volumes de
  produção muito diferentes).

**LIMITAÇÃO ANTERIOR RESOLVIDA (2026-08-06):** até 2026-08-06, o schema não
tinha um campo explícito de parada de máquina/downtime, e a Disponibilidade
era só uma aproximação por calendário de turnos (tempo apontado vs. tempo
disponível do centro, sem desconto de paradas reais). A tabela
`production_downtimes` (migration `20260806-000060-create-production-downtimes.cjs`)
fecha esse gap — ver `POST/PUT/GET /api/production/downtimes` abaixo e
`docs/database/DATABASE.md`.

Implementado em `server/src/modules/reports/application/use-cases/GetOeeReportUseCase.ts`.
Migration `20260806-000060` (downtime); demais fontes reaproveitadas
(`production_order_tracking`, `work_centers`, `work_center_shifts`,
`production_route_steps`).

### Paradas de Máquina / Centro de Trabalho (`/api/production/downtimes`)
**(Novo, 2026-08-06)** Registro de paradas (downtime), base do desconto de
disponibilidade acima. `authorizeModule('chao_de_fabrica', ...)` — mesmo
módulo de permissão do apontamento de etapas de OP (quem aponta produção
também registra/encerra paradas do centro). UI: `ShopFloorPage.tsx`.

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/production/downtimes` | Lista paradas (filtros de centro/período/status aberto-fechado) |
| `POST` | `/api/production/downtimes` | Abre uma parada: `{ work_center_id, production_order_id?, reason, notes?, started_at? }` |
| `PUT` | `/api/production/downtimes/:id/finish` | Encerra a parada aberta: `{ finished_at? }` (default: agora) |

`reason` (enum): `setup`, `manutencao_corretiva`, `manutencao_preventiva`,
`falta_material`, `falta_operador`, `qualidade`, `outros`.
`production_order_id` é opcional — parada pode ser geral do centro ou
vinculada a uma OP específica.

**Bloqueio de 2ª parada aberta simultânea no mesmo centro** — protegido em
2 níveis: `OpenProductionDowntimeUseCase` (checagem em aplicação) **e**
índice único parcial no Postgres
(`uq_production_downtimes_open_per_work_center`, `work_center_id` WHERE
`finished_at IS NULL`) — o índice cobre corrida de escrita concorrente que
a checagem em aplicação sozinha não pega.

**Riscos residuais documentados:** sem teste de integração real contra
Postgres para o índice único parcial (só unitário com mock) — ver
`docs/governance/TODO.md`.

---

## 8. Estoque / Movimentações

### GET /api/inventory/movements
Histórico de movimentações.

**Query Params:** product_id, type (in/out), start_date, end_date, warehouse_id (INTEGER, opcional — filtra movimentações de um depósito específico, Bloco 4 UC-42; quando ausente, lista de todos os depósitos como antes)

### POST /api/inventory/movements
Registra movimentação manual.

**Request:**
```json
{
  "product_id": 1,
  "type": "in",
  "quantity": 20,
  "description": "Compra de reposição"
}
```

### GET /api/inventory/movements/:id
Busca uma movimentação de estoque específica pelo id.

### GET /api/inventory/stock-report
Relatório consolidado de estoque: `{ summary: { total_products, total_items, total_value, low_stock_count }, products: [...] }`.

### GET /api/inventory/low-stock
Lista produtos ativos com estoque em ou abaixo do ponto de reposição (`quantity <= min_quantity`).

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "...", "code": "...", "quantity": 2, "min_quantity": 5, "category": { "id": 1, "name": "..." } }
  ]
}
```

> Nota de arquitetura: os endpoints de `/api/inventory` são servidos pelo
> módulo `server/src/modules/inventory/` (Clean Architecture). Ver
> `server/src/modules/inventory/README.md` para detalhes de regras de
> negócio e entidades.
>
> **Correção 2026-08-10:** a versão anterior desta nota dizia que
> "`reserved_quantity` ainda não existe no schema". **É falso.**
> `products.reserved_quantity` existe (`NUMERIC(18,6) NOT NULL DEFAULT 0`) e,
> desde a migration `20260809-000026` (gap G3), é um **cache derivado** da
> tabela `production_order_reservations` — vale sempre
> `SUM(quantity - quantity_released)` das reservas `active` daquele produto,
> recalculado na mesma transação. A disponibilidade usada nas validações de
> estoque é `quantity - reserved_quantity`.

---

## 8.1 Múltiplos Depósitos

Base URL: `/api/inventory`. Depósito físico do estoque (ex.: INSUMOS,
ACABADOS, LABORATORIO — Bloco 4, UC-42, docs/business/BUSINESS_RULES.md
§12). O saldo total de um produto é sempre a soma dos saldos em todos os
depósitos ativos (`ProductWarehouseStock`).

### GET /api/inventory/warehouses
Lista depósitos ativos (`authorizeModule('estoque')`), ordenados por `code`.

**Response (200):**
```json
{
  "success": true,
  "data": [
    { "id": 1, "code": "INSUMOS", "name": "Depósito Insumos", "description": null, "active": true, "createdAt": "...", "updatedAt": "..." },
    { "id": 2, "code": "ACABADOS", "name": "Depósito Acabados", "description": null, "active": true, "createdAt": "...", "updatedAt": "..." }
  ]
}
```

### POST /api/inventory/warehouses
Cria um novo depósito (`authorizeModule('estoque', 'approve')` — mesmo
nível exigido para aprovar/rejeitar transferência). `code` é obrigatório,
único e normalizado para uppercase antes de persistir.

**Request:**
```json
{
  "code": "expedicao",
  "name": "Depósito Expedição",
  "description": "Área de separação para envio",
  "active": true
}
```
- `code` (string, obrigatório, máx. 30) — normalizado para uppercase (`EXPEDICAO`).
- `name` (string, obrigatório, máx. 100).
- `description` (string, opcional, máx. 2000, aceita `null`).
- `active` (boolean, opcional, default `true`).

**Response (201):**
```json
{
  "success": true,
  "data": { "id": 4, "code": "EXPEDICAO", "name": "Depósito Expedição", "description": "Área de separação para envio", "active": true, "createdAt": "...", "updatedAt": "..." }
}
```

**Erro (400) — `code`/`name` ausente ou payload inválido (`ValidationError`, `VALIDATION_ERROR`); erro (409) — já existe depósito com o mesmo `code` (case-insensitive) (`ConflictError`, `CONFLICT`):**
```json
{ "success": false, "error": { "code": "CONFLICT", "message": "Já existe um depósito com o código \"INSUMOS\"." } }
```

### PUT /api/inventory/warehouses/:id
Edita `name`/`description`/`active` de um depósito existente
(`authorizeModule('estoque', 'approve')`). **`code` nunca é editável** —
é a chave usada por `WarehouseStockService.getWarehouseByCode` em todo o
roteamento automático do dual-write (recebimento, produção, vendas,
laboratório, transferências); enviar `code` no corpo retorna 400
(`ValidationError`, schema é `.strict()`). Desativação lógica é feita com
`{ "active": false }` — não existe DELETE físico.

**Request (todos os campos opcionais, mas ao menos um deve ser enviado):**
```json
{
  "name": "Depósito Insumos Renomeado",
  "description": "Nova descrição",
  "active": false
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { "id": 1, "code": "INSUMOS", "name": "Depósito Insumos Renomeado", "description": "Nova descrição", "active": false, "createdAt": "...", "updatedAt": "..." }
}
```

**Erro (404) — depósito inexistente (`NotFoundError`, `NOT_FOUND`).**

### GET /api/inventory/warehouse-stock
Lista saldos por par produto×depósito (`authorizeModule('estoque')`).

**Query Params:** product_id, warehouse_code, page, limit

> Ver também `GET /api/products/:id/stock-by-warehouse` (seção 3. Produtos)
> — mesmo caso de uso, mas voltado ao detalhe de UM produto específico
> (sem paginação, sempre traz todos os depósitos ativos, inclusive com
> saldo 0).

### GET /api/inventory/transfers
Lista transferências entre depósitos (`authorizeModule('estoque')`).

**Query Params:** status (pending/approved/rejected)

### POST /api/inventory/transfers
Solicita transferência de saldo entre depósitos
(`authorizeModule('estoque', 'operate')`). Cria em `status='pending'` —
não altera nenhum saldo até a aprovação.

**Request:**
```json
{
  "product_id": 10,
  "from_warehouse_code": "INSUMOS",
  "to_warehouse_code": "LABORATORIO",
  "quantity": 7,
  "reason": "Cessão para teste destrutivo"
}
```

### PUT /api/inventory/transfers/:id/approve
Aprova uma transferência pendente (`authorizeModule('estoque', 'approve')`). Executa débito/crédito atômico entre depósitos e gera 2 `InventoryMovement` (`type='transfer'`).

### PUT /api/inventory/transfers/:id/reject
Rejeita uma transferência pendente (`authorizeModule('estoque', 'approve')`), com `body.reason` obrigatório.

---

## 8.2 Inventário Cíclico (Contagens)

Base URL: `/api/inventory-counts`. Todas as rotas exigem JWT válido
(`authenticate`) e `authorizeModule('contagens', ...)` — leituras exigem
`view` implícito, escritas comuns exigem `operate`, aprovar/rejeitar/reatribuir
exigem `approve`.

O app mobile (`mobile/`, construído em paralelo em outro time — mesma
lógica de paridade do app Android TV citado na seção 14) é o consumidor
principal do fluxo de contagem cíclica no chão de fábrica: lista/filtra
contagens (`GET /api/inventory-counts?assigned_to=me`/`unassigned=true`),
inicia (`POST /:id/start`) e registra as quantidades contadas
(`POST /:id/items/:itemId/count`). O painel web é usado para criar
contagens, aprovar/rejeitar e reatribuir.

Workflow de status: `draft` → `counting` → `pending_approval` → `approved`
→ `adjusted` (ou `pending_approval` → `rejected`).

### Atribuição a funcionário (`assigned_to`) e "pool"

Toda contagem tem um campo opcional `assigned_to` (id de usuário):

- **Atribuição específica:** informado na criação (`assigned_to` no
  payload) — só aquele funcionário pode iniciar a contagem.
- **Pool:** `assigned_to` ausente/`null` na criação — qualquer funcionário
  autorizado (`operate` em `contagens`, mesmo depósito) pode "pegar" a
  contagem chamando `POST /:id/start`.
- Em criação e reatribuição, `assigned_to` (quando informado e não-`null`)
  precisa apontar para um usuário que existe e está ATIVO — caso
  contrário, **422** `BUSINESS_RULE_VIOLATION` com mensagem didática.

### POST /api/inventory-counts
Cria uma contagem (`status='draft'`) (`authorizeModule('contagens', 'operate')`).

**Request:**
```json
{
  "count_type": "cycle",
  "warehouse_id": 2,
  "location": "Corredor A",
  "notes": "Contagem mensal",
  "item_ids": ["uuid-item-1", "uuid-item-2"],
  "assigned_to": 15,
  "department_id": 3
}
```
`warehouse_id` é obrigatório. `product_ids` (legado) OU `item_ids` (novo,
preferido) são opcionais e mutuamente aceitos (dual-read). `assigned_to` é
opcional — ausente/`null` deixa a contagem no pool. `department_id` é
**opcional** (FK → `departments.id`) — departamento dono da contagem, usado
apenas pelo painel de TV (`GET /api/dashboard/department-demands`); ausente
= contagem aparece no grupo "Sem departamento" do painel.

### GET /api/inventory-counts
Lista contagens com filtros e paginação (`authorizeModule('contagens')`).

**Query Params:**
- `status`, `count_type` (filtros pré-existentes, inalterados)
- `assigned_to=<id>` — contagens atribuídas a um funcionário específico
- `assigned_to=me` — atalho: resolvido pelo servidor para o id do usuário
  autenticado (contagens atribuídas a mim)
- `unassigned=true` — apenas contagens do pool (`assigned_to IS NULL`);
  tem prioridade sobre `assigned_to` se ambos forem informados; tipicamente
  combinado com `status=draft` para montar a tela "contagens disponíveis
  para pegar"
- `page`, `limit`

### GET /api/inventory-counts/:id
Busca uma contagem por id, com itens (`authorizeModule('contagens')`).

### POST /api/inventory-counts/:id/start
Inicia a contagem, `draft` → `counting` (`authorizeModule('contagens', 'operate')`).

Resolve a atribuição de forma atômica:
- Contagem no pool (`assigned_to IS NULL`): faz o **claim** — `assigned_to`
  passa a ser o usuário logado. Em corrida entre dois usuários, apenas um
  vence (lock pessimista `SELECT ... FOR UPDATE` dentro de transação).
- Contagem já atribuída a **outro** usuário e quem inicia **não é
  `admin`**: rejeita com **409 Conflict** — `{ "success": false, "error": { "code": "CONFLICT", "message": "Esta contagem já foi atribuída a outro funcionário." } }`.
- Contagem já atribuída a **outro** usuário e quem inicia **é `admin`**:
  **override permitido** (achado de auditoria 2026-08-06, item 1b) — a
  contagem passa a ser do admin, sem erro. Auditado (`AuditLog`) com
  `oldValues.assigned_to` (responsável anterior) e
  `newValues.assigned_to` (admin) para rastreabilidade.
- Contagem já atribuída ao **próprio** usuário: segue normalmente
  (idempotente, nenhuma reatribuição).

### PUT /api/inventory-counts/:id/reassign
Reatribui a contagem a outro funcionário, ou devolve ao pool
(`authorizeModule('contagens', 'approve')`, exclusivo de gestor/admin —
achado de auditoria 2026-08-06, item 1a). Corrige o cenário em que uma
contagem atribuída a um funcionário de férias/desligado ficava presa em
`draft` para sempre, sem nenhuma via oficial de recuperação além de
`UPDATE` manual no banco.

**Request:**
```json
{ "assigned_to": 42 }
```
`assigned_to` é **obrigatório** no payload (pode ser `null` para devolver
ao pool — a intenção precisa ser explícita, o campo não pode ser
omitido). Quando não-`null`, precisa ser um usuário ativo (ver acima).

Só permitido com a contagem em `draft` ou `counting` — **422**
`BUSINESS_RULE_VIOLATION` caso contrário, com `details`:
```json
{
  "success": false,
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Apenas contagens em status 'draft' ou 'counting' podem ser reatribuídas. Status atual: 'pending_approval'.",
    "details": { "current_status": "pending_approval", "allowed_statuses": ["draft", "counting"] }
  }
}
```

**Response:** `200 OK`, mesmo formato de `GET /api/inventory-counts/:id`
(contagem atualizada, com `assigned_to`/`assignedTo` refletindo a nova
atribuição). Auditado com `oldValues.assigned_to` (anterior) e
`newValues.assigned_to` (novo).

### POST /api/inventory-counts/:id/items/:itemId/count
Registra a quantidade contada de um item (`authorizeModule('contagens', 'operate')`).

### POST /api/inventory-counts/:id/submit
Envia para aprovação, `counting` → `pending_approval` (`authorizeModule('contagens', 'operate')`).

### POST /api/inventory-counts/:id/approve
Aprova a contagem, `pending_approval` → `adjusted` (`authorizeModule('contagens', 'approve')`, exclusivo do painel web). Ajusta `Product.quantity` e o saldo do depósito da contagem para cada item com variância.

### POST /api/inventory-counts/:id/reject
Rejeita a contagem, `pending_approval` → `rejected` (`authorizeModule('contagens', 'approve')`, exclusivo do painel web), com `body.reason` opcional.

---

## 8.3 Lotes (`LotControl`) — Rastreabilidade Física e QR Code

**(Seção adicionada em 2026-08-06 — endpoints já existiam em código, sem
documentação.)** Base URL: `/api/inventory/lots*`, módulo
`server/src/modules/inventory/`. `authorizeModule('estoque')` para
leitura/listagem; liberar (`release`) e bloquear (`block`) um lote exigem
`authorizeModule('qualidade', 'approve')` — ação de gestão de Qualidade
sobre um dado que nasce no Recebimento/Estoque (UC-37).

### GET /api/inventory/lots?product_id=&status=&page=&limit=
Lista lotes (`LotControl`) com filtros e paginação, incluindo `product` e
`supplier`. Uso duplo:
- Sem `status` e com `product_id` (uso legado/produção): só lotes
  `status='available'` com `quantity_available > 0` (consumo em conclusão
  de OP).
- Com `status` explícito (ex.: `status=quarantine`): usado pela inspeção
  de recebimento para listar lotes pendentes de liberação.

### GET /api/inventory/lots/by-code/:lot_number?product_id=
Resolve um lote a partir do código legível (`lot_number`), lido por
scanner físico ou digitado manualmente no app mobile. `product_id` é
opcional, usado só para desambiguar quando o mesmo código existir em mais
de um produto. Registrada **antes** de `/lots/:id/*` para não colidir com
o parâmetro posicional `:id`.

### GET /api/inventory/lots/:id/qrcode?format=png|svg
Gera o QR Code de um lote para impressão em etiqueta física, reaproveitando
o `GenerateEntityQrCodeUseCase` genérico (o mesmo usado por
`GET /api/assets/:id/qrcode`).

**IMPORTANTE (achado nº 5 da auditoria cruzada):** o QR é gerado
**on-the-fly, a cada chamada** — não existe nenhuma coluna no banco (nem em
`lot_controls`, nem em `assets`/`products`) que armazene a imagem ou o
payload do QR. `GenerateEntityQrCodeUseCase` busca a entidade
(`LotControl.findByPk`), monta o payload
(`{ lot_number, product_code, product_name }`) e chama
`QRCodeService.generate`/`generateSvg` em memória, devolvendo o resultado
já codificado na resposta HTTP. Chamar o endpoint duas vezes gera o PNG/SVG
duas vezes (determinístico para o mesmo payload, mas nunca lido de cache
ou de disco).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "format": "png",
    "qrDataUrl": "data:image/png;base64,iVBORw0K...",
    "qrCodeData": { "type": "lot", "id": 42, "lot_number": "LOTE-2026-0042", "product_code": "AF-001", "product_name": "Alto-Falante 8\"" }
  }
}
```
Com `?format=svg`, a resposta troca `qrDataUrl` por `qrSvg` (string SVG
inline). O QR codifica o **código legível** (`lot_number`), não o `id`
interno — a leitura no mobile deve extrair `lot_number` e chamar
`GET /api/inventory/lots/by-code/:lot_number` para resolver o registro
completo. **Erro (404)** — lote inexistente (`NotFoundError`).

### POST /api/inventory/lots/:id/release
Libera um lote para consumo (`quarantine`/`blocked` → `available`). Usado
pela inspeção de recebimento (pós-quarentena) e pela qualidade
(pós-tratativa de RNC). `authorizeModule('qualidade', 'approve')`.

**Request:** `{ "notes": "Inspecionado, aprovado no lote-piloto" }` (`notes` opcional.)

> ⚠️ **G7 (2026-08-10) — a liberação deixou de ser um clique.** Este endpoint
> agora **exige** que a inspeção MAIS RECENTE do lote
> (`POST /api/quality/inspections`, seção 16.1) tenha veredito `approved` ou
> `approved_under_concession`. Antes disso, liberar gravava apenas um texto
> livre em `notes` — sem inspetor, sem critério, sem resultado —, o que não
> atende à ISO 9001:2015 §8.6. Decisão D-H do dono do produto.

Quem autoriza a liberação vem **sempre** do JWT (`req.user.id`) e é gravado
no lote, junto com a inspeção que autorizou:

| Campo gravado em `lot_controls` | Origem |
|---|---|
| `release_inspection_id` | id da inspeção aprovada mais recente |
| `released_by` | `req.user.id` (nunca do body) |
| `released_at` | data/hora do servidor |
| `blocked_at` | **zerado** — o bloqueio vigente deixou de existir |

> ⚠️ **Auditoria de 2026-08-11 — re-liberar lote BLOQUEADO exige inspeção
> POSTERIOR ao bloqueio.** A regra "a inspeção mais recente aprovou" não
> cobria o bloqueio sem inspeção nova: a sequência `aprovada → liberada →
> RNC/bloqueio → release` era **concedida com a inspeção antiga**, e o
> bloqueio virava decorativo (ISO 9001:2015 §8.7). O bloqueio passou a gravar
> `lot_controls.blocked_at`, e a liberação exige
> `quality_inspections.inspected_at > blocked_at` (comparação estrita:
> empate de instante fica do lado seguro).
>
> Lote em `quarantine` (nunca bloqueado) e lote bloqueado **antes** desta
> mudança têm `blocked_at = NULL` e mantêm o comportamento anterior.
>
> A chamada roda dentro de **transação com lock de linha** (`FOR UPDATE`):
> antes, a leitura do lote, a consulta da inspeção e a escrita eram três
> operações soltas, e um bloqueio concorrente entre elas era sobrescrito por
> `status = 'available'`.

**Erros (422 `BUSINESS_RULE_VIOLATION`)** — todos com `details.rule = "G7"` e
**sem gravar nada** no lote:

| `details.reason` | Quando |
|---|---|
| `no_inspection` | o lote não tem nenhuma inspeção registrada |
| `last_inspection_rejected` | a inspeção mais recente reprovou o material (trate a RNC e registre uma NOVA inspeção aprovada) |
| `inspection_before_block` | há inspeção aprovada, mas ela é **anterior** ao bloqueio vigente (`details.blocked_at`) — reinspecione o material depois do bloqueio |

```json
{
  "success": false,
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Lote LOT-2026-077 não tem inspeção de qualidade registrada. Registre a inspeção em POST /api/quality/inspections antes de liberar (ISO 9001 8.6).",
    "details": {
      "rule": "G7",
      "lot_id": 77,
      "lot_number": "LOT-2026-077",
      "current_status": "quarantine",
      "reason": "no_inspection",
      "inspection_id": null,
      "inspection_verdict": null
    }
  }
}
```

O status inválido (`available`, `consumed`, ...) continua sendo recusado
antes de qualquer consulta à qualidade, com
`details: { rule: "G7", current_status, allowed_statuses: ["quarantine","blocked"] }`.

> 💡 Para saber **antes de clicar** se a liberação vai passar, use
> `GET /api/quality/lots/:lotId/release-eligibility` (leitura pura, sem efeito
> colateral).

### POST /api/inventory/lots/:id/block
Bloqueia um lote (`quarantine`/`available` → `blocked`).
`authorizeModule('qualidade', 'approve')`. Usado pela inspeção de
recebimento e, internamente, por `CreateNonConformityUseCase` ao registrar
uma RNC vinculada a um lote (ver seção "Qualidade — Não Conformidades").

**Request:** `{ "reason": "Dimensional fora de especificação" }` (`reason` obrigatório, mínimo 3 caracteres.)

Além de `status` e `notes`, grava **`blocked_at`** (data/hora do servidor) —
é esse instante que a re-liberação passa a ter de superar com uma inspeção
nova (ver o aviso em `POST /api/inventory/lots/:id/release`). O bloqueio por
**RNC** (`POST /api/quality/non-conformities`) grava o mesmo campo.

---

## 9. Estrutura de Produto (BOM)

Base URL: `/api/engineering/bom`

### GET /api/engineering/bom
Lista BOMs com paginação e filtros.

**Query Params:** page, limit, status (draft/active/inactive/superseded), search (nome do produto), product_id

### GET /api/engineering/bom/product/:productId
Retorna a BOM ativa (`status=active`) de um produto, com itens.

### GET /api/engineering/bom/product/:productId/versions
**Novo.** Lista todas as versões (qualquer status) de BOM de um produto, ordenadas por data de criação (mais antiga primeiro).

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": 1, "product_id": 10, "revision": "00", "status": "superseded", "createdAt": "..." },
    { "id": 5, "product_id": 10, "revision": "01", "status": "active", "createdAt": "..." }
  ]
}
```

### GET /api/engineering/bom/:id
Detalhes da BOM com produto e itens (componentes).

### POST /api/engineering/bom
Cria uma nova BOM para um produto acabado (`product_type = 'finished'`). Marca automaticamente qualquer BOM `active` anterior do mesmo produto como `superseded` (versionamento).

**Request:**
```json
{
  "product_id": 1,
  "revision": "00",
  "notes": "BOM inicial Alto-Falante 12" PRO",
  "items": [
    { "component_product_id": 10, "quantity": 1, "unit": "un", "bom_level": 1 },
    { "component_product_id": 11, "quantity": 1, "unit": "un", "bom_level": 1 }
  ]
}
```

**Erros de regra de negócio na criação (422 `BUSINESS_RULE_VIOLATION`):**

| `details.rule` | Quando |
|---|---|
| `G1-BOM-AUTO-REF` | o próprio produto aparece como componente dele mesmo (ciclo de profundidade 1). Formato legado: `error` é string, com `rule` no topo do erro |
| `G1-BOM-CICLO` | **(2026-08-11)** o componente já contém o produto na estrutura dele, direta ou indiretamente — ex.: `A → B` gravado e agora `B → A`. `details: { rule, product_id, component_product_id }` |
| `G1-BOM-TIPO-NAO-PRODUTIVO` | **(2026-08-12)** o pai ou um componente tem item mestre (crosswalk `products.code = items.codigo`) do tipo `USO_E_CONSUMO` ou `ATIVO_IMOBILIZADO` — suprimento/patrimônio não entra em estrutura de produto. `details: { rule, papel_na_estrutura, product_id, item_tipo }` |

> A detecção multinível nasceu da auditoria de 2026-08-11: só a
> auto-referência era barrada, então um ciclo de dois níveis entrava no banco
> e só estourava depois, na explosão (`GET /:id/explode` → 422) — o que,
> depois do G2 (BOM ativa obrigatória), significa **produto que não conclui
> OP**. A verificação roda antes da transação; nada é gravado.

### PUT /api/engineering/bom/:id
Atualiza campos gerais (`revision`, `revision_notes`, `notes`, `status`). Quando `status` muda para `active`, o log de auditoria registra a ação como `approve`.

### DELETE /api/engineering/bom/:id
Inativa (soft delete) a BOM. Apenas BOMs em `draft` ou `active` podem ser inativadas.

### GET /api/engineering/bom/:id/explode?qty=
Explode a BOM (incluindo sub-BOMs recursivamente) para a quantidade informada.

### GET /api/engineering/bom/:id/cost?qty=
Calcula o custo total/unitário do produto baseado na BOM ativa.

### GET /api/engineering/bom/:id/availability?qty=
Verifica se há estoque suficiente dos componentes para produzir a quantidade desejada.

### GET /api/engineering/bom/:id/tree
Retorna a árvore hierárquica completa da BOM (útil para produtos com subconjuntos).

### GET /api/engineering/bom/:id/items
Lista os itens (componentes) de uma BOM.

> Nota de arquitetura: os endpoints de `/api/engineering/bom` são servidos
> pelo módulo `server/src/modules/bom/` (Clean Architecture). A lógica de
> negócio pesada (explosão, custo, disponibilidade, versionamento)
> permanece em `server/src/services/bomService.ts`. Ver
> `server/src/modules/bom/README.md` para detalhes de regras de negócio,
> entidades e pendências.

## 10. Ordens de Produção

### GET /api/production-orders
Lista ordens de produção. Filtros: `status`, `product_id`, `priority`, `start_date`, `end_date`; paginação: `page`, `limit`.
```json
{
  "success": true,
  "data": [ { "id": 1, "order_number": "OP-2026-0001", "status": "planned", "quantity": 100, "product": { "id": 5, "name": "Alto-falante 12in" } } ],
  "summary": { "total": 10, "planned": 3, "in_progress": 2, "completed": 4, "overdue": 1 },
  "pagination": { "total": 10, "page": 1, "limit": 10, "totalPages": 1 }
}
```

### GET /api/production-orders/report
Relatório de produção de um período (`start_date`, `end_date`), com totais planejados/produzidos, taxa de conclusão e distribuição por status.

### GET /api/production-orders/:id
Detalhes da OP (produto, responsável, criador).

### POST /api/production-orders
Cria uma OP. Requer papel `admin` ou `operator`.
```json
{
  "product_id": 5,
  "quantity": 100,
  "due_date": "2026-08-30",
  "priority": "normal",
  "responsible_id": 3,
  "department_id": 3,
  "notes": "Lote para pedido X"
}
```
O `order_number` (`OP-<ano>-XXXX`) é gerado automaticamente. O produto deve estar `active` e ser do tipo `finished`. `department_id` é **opcional** (FK → `departments.id`) — departamento dono da OP, usado apenas pelo painel de TV (`GET /api/dashboard/department-demands`); ausente = OP aparece no grupo "Sem departamento" do painel.

### PUT /api/production-orders/:id
Atualiza campos gerais (`priority`, `due_date`, `responsible_id`, `notes`). **Não aceita** `status` — use `PUT /:id/status`.

### PUT /api/production-orders/:id/status
Muda o status da OP conforme a máquina de estados `planned → released → in_progress → completed/paused/canceled`.
```json
{ "status": "completed", "quantity_produced": 98 }
```
Ao transicionar para `completed`, consome os componentes da BOM ativa do produto e dá entrada do produto acabado no estoque, em uma única transação com lock pessimista.

**Ao transicionar para `released` (gap G4, 2026-08-10):** se o produto tiver
roteiro **ativo** (`/api/production/routes`), as etapas ativas desse roteiro são
materializadas automaticamente em `production_order_tracking` com
`status = 'pending'`, cada linha já apontando para o `production_route_step_id`
da revisão vigente naquele instante. Idempotente — nada é criado se a OP já
tiver apontamento. Sem roteiro ativo a liberação **passa** (não se trava a
fábrica por cadastro faltante); o bloqueio mora na partida e na conclusão.

#### Gate de PARTIDA — `* → in_progress` (gap G6)

A OP só entra em produção quando existe **algo contra o que apontar**. Todas
as reprovações são **HTTP 422** com o código em `error.details.rule`:

| `details.rule` | Quando |
|---|---|
| `G6-START-NO-ROUTE` | a OP não tem **nenhuma** linha de apontamento |
| `G6-START-NO-ROUTE-STEP` | **(2026-08-11)** existem linhas, mas nenhuma aponta para uma etapa de roteiro (`production_route_step_id = null`), e o produto **não** tem roteiro ativo |
| `G6-START-WC-INACTIVE` | alguma etapa aponta para centro de trabalho **inativo** (a hora trabalhada sairia sem taxa) |

> ⚠️ **`G6-START-NO-ROUTE-STEP` nasceu da auditoria de 2026-08-11.** O gate
> contava linhas, e `POST /api/production-orders/:id/tracking` aceita
> `production_route_step_id: null` (apontamento manual, fluxo legítimo). Uma
> **linha manual vazia destravava a partida** de uma OP sem roteiro nenhum.
>
> A saída indicada pela mensagem — cadastrar o roteiro do produto e deixá-lo
> ativo — **destrava a mesma OP**, sem precisar apagar a linha manual.
> Apontamento manual **depois** da partida continua livre: o gate é de
> partida.

A partida também grava o responsável: quando `responsible_id` está vazio, o
usuário do JWT é traduzido para `employees.id`. Usuário sem funcionário
vinculado **não** trava a partida (seria travar produção por cadastro de RH).

#### Apontamento obrigatório na conclusão (gap G4)

> **Base legal, não preferência de processo.** Ajuste SINIEF 2/09, cláusula 3ª
> §7º III — Bloco K desde 01/01/2019 para os demais estabelecimentos
> industriais das divisões 10–32 (alto-falante = CNAE 2640-0/00, divisão 26).
> O **§10** mantém obrigatório o Livro Registro de Controle da Produção e do
> Estoque (modelo 3) — que exige consumo e produção **por ordem de produção** —
> enquanto não houver escrituração completa do Bloco K; o **§13** deixa claro
> que a versão simplificada dispensa *transmitir*, não *registrar*. Soma-se a
> exigência de custo integrado e coordenado (RIR/2018): produto acabado
> valorizado com mão de obra R$ 0,00 não é custo real.
> Fonte e ressalvas: `docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md`, Decisão 4.

Todas as reprovações respondem **HTTP 422** no envelope padrão, com o código
legível em `error.details.rule`:

```json
{
  "success": false,
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Nao e possivel concluir a OP OP-2026-0003 sem nenhum apontamento de producao. …",
    "details": { "rule": "G4-TRACKING-REQUIRED", "orderNumber": "OP-2026-0003" }
  }
}
```

| `details.rule` | Reprova quando | Campos extras em `details` |
|---|---|---|
| `G4-TRACKING-STEP-OPEN` | há etapa `pending`/`in_progress`/`paused` | `open_steps[]` (**todas**, não a primeira) |
| `G4-TRACKING-REQUIRED` | a OP não tem nenhuma linha de apontamento | `orderNumber` |
| `G4-TRACKING-NO-COMPLETED` | existe apontamento mas nenhuma etapa `completed` (ex.: tudo `skipped`) | `steps[]` |
| `G4-TRACKING-QTY-EXCEEDS` | `quantity_produced` > `quantity_good` da última etapa concluída | `last_step_sequence`, `last_step_quantity_good`, `quantity_produced` |
| `G4-TRACKING-TIME-MISSING` | etapa `completed` sem `started_at`/`finished_at`, ou com duração ≤ 0 | `steps[]` com os dois timestamps |
| `G4-LABOR-RATE-MISSING` | nenhuma taxa horária positiva resolvível para uma etapa concluída | `default_labor_rate_per_hour`, `steps[]` com `work_center_id` e `work_center_cost_per_hour` |

Nenhuma escrita ocorre quando a conclusão é reprovada — o gate roda **antes**
de qualquer consumo, entrada de estoque, criação de lote ou lançamento de custo.

`G4-TRACKING-STEP-OPEN` e `G4-TRACKING-QTY-EXCEEDS` são anteriores ao G4
(reconciliação 1.3) e valem **sempre**; as demais respeitam a janela de
transição abaixo.

**Janela de transição — `PRODUCTION_TRACKING_REQUIRED`**

| Valor | Efeito |
|---|---|
| ausente / `block` (**padrão**) | a lei aplicada: bloqueia a conclusão e materializa as etapas na liberação |
| `warn` | registra a pendência em log estruturado e deixa concluir; **não** materializa etapas na liberação |
| qualquer outro | cai em `block` e loga erro com `rule: G4-TRACKING-MODE-INVALID` — um typo nunca desliga a regra em silêncio |

`warn` é temporário por desenho e precisa estar desligado no Go-Live.

> **Mudança de envelope (2026-08-10):** os erros de `AppError` deste módulo
> passaram a ser serializados pelo `errorHandler` central
> (`{ error: { code, message, details } }`) em vez do envelope antigo
> `{ error: "<mensagem>" }`, que **descartava `details`** — e com ele o
> `details.rule`. `extractApiErrorMessage` no cliente já aceita as duas formas;
> nenhuma tela precisou mudar.

### DELETE /api/production-orders/:id
Remove a OP. Requer papel `admin`. Não permitido se a OP estiver `in_progress` ou `completed`.

> Nota de arquitetura: os endpoints de `/api/production-orders` são servidos
> pelo módulo `server/src/modules/production/` (Clean Architecture). O
> consumo/entrada de estoque reutiliza `server/src/services/inventoryService.ts`
> (lock pessimista + transação) e a explosão de BOM reutiliza
> `server/src/services/bomService.ts`. Ver
> `server/src/modules/production/README.md` para detalhes de regras de
> negócio, a máquina de estados e pendências (ex.: registro de refugo).

---

## 11. Compras (Pedidos de Compra)

### GET /api/purchases
Lista pedidos de compra. Filtros: `status`, `supplier_id`, `start_date`, `end_date`; paginação: `page`, `limit`.
```json
{
  "success": true,
  "data": [ { "id": 1, "order_number": "PO-1730000000000", "status": "pending", "total_amount": "1500.00", "supplier": { "id": 2, "company_name": "Fornecedor X" } } ],
  "pagination": { "total": 1, "page": 1, "limit": 10, "totalPages": 1 }
}
```

### GET /api/purchases/cockpit
**(Onda 3)** Métricas agregadas do cockpit de compras, somente leitura,
sem paginação. Rota registrada ANTES de `/api/purchases/:id`.
```json
{
  "success": true,
  "data": {
    "pending_requisitions": 3,
    "open_orders": { "count": 5, "total_amount": 45230.50 },
    "arriving_this_week": 2,
    "overdue": 1
  }
}
```
- `pending_requisitions`: `purchase_requisitions` com `status = 'pending'`.
- `open_orders`: `purchase_orders` com `status` em `pending`/`approved`/`sent`/`partial`.
- `arriving_this_week`: pedidos com `status` em `sent`/`approved`/`partial` e `expected_date` entre hoje e hoje+7 dias.
- `overdue`: pedidos com `status` fora de `received`/`canceled`, `expected_date` vencida e sem `delivery_date`.

### GET /api/purchases/:id
Detalhes do pedido, com fornecedor e itens (+ produto).

### POST /api/purchases
Cria um pedido de compra com itens (transacional).
```json
{
  "supplier_id": 2,
  "expected_date": "2026-08-15",
  "notes": "Reposição de bobinas",
  "items": [
    { "product_id": 10, "quantity": 100, "unit_price": 12.5 }
  ]
}
```
`order_number` (`PO-<timestamp>`) e `total_amount` são calculados no backend. Cada `product_id` deve existir.

Aceita também `origin` (`"national"` — padrão — ou `"import"`, G11). Declarar
`"national"` não escapa da alçada quando o fornecedor é estrangeiro
(`suppliers.is_foreign`), ver seção **Alçada de aprovação (G11)** abaixo.

> ⚠️ **Coerência origem × cadastro do fornecedor (auditoria de 2026-08-11).**
> A origem passou a ser conferida contra `suppliers.is_foreign` **na
> criação**, e o pedido é gravado já com a origem efetiva:
>
> | Declarado | Fornecedor | Resultado |
> |---|---|---|
> | `import` | `is_foreign = true` | criado como `import` |
> | `import` | `is_foreign = false` | **422 `G11-ORIGIN-SUPPLIER-MISMATCH`** — um dos dois cadastros está errado |
> | `national` (ou omitido) | `is_foreign = true` | criado como **`import`** (o cadastro prevalece; o comprador não é punido por dado que não controla) |
> | `national` (ou omitido) | `is_foreign = false` | criado como `national` |
>
> `details: { rule, supplier_id, supplier_is_foreign, declared_origin }`.
> A mesma checagem roda de novo em `PUT /api/purchases/:id/status →
> approved`, como segunda linha de defesa para pedidos gravados antes desta
> regra. Antes, a resolução só acontecia na aprovação e o pedido ficava
> **gravado** com uma origem que contradizia o cadastro.

### PUT /api/purchases/:id
Atualiza campos permitidos (`expected_date`, `freight_type`, `freight_value`, `notes`, `supplier_id`, `origin`). Só permitido enquanto o pedido está `pending` ou `approved`.

**Restrições da alçada (G11):** `origin` nunca volta de `"import"` para
`"national"` (422); e com o pedido já `approved`, `supplier_id`,
`freight_value` e `origin` ficam congelados (422) — são os campos que
determinam a alçada.

### PUT /api/purchases/:id/status
Altera o status conforme a máquina de estados `pending → approved → sent → partial/received/canceled`.
```json
{ "status": "approved" }
```
Ao transicionar para `approved`, gera automaticamente uma `AccountPayable` vinculada ao pedido (idempotente), em uma única transação com o `save()` do status.

**Segregação de função (D-K):** a transição para `approved` é bloqueada com
**422** (`details.rule = "D-K-PEDIDO"`) quando quem aprova é quem consta em
`purchase_orders.requester_id`. Verificada **antes** da alçada G11 e antes de
qualquer escrita. Ver a seção *Segregação de função na compra (D-K)* abaixo.

**Alçada de aprovação (G11):** a transição para `approved` é bloqueada com
**422** (`details.rule = "G11"`) quando o pedido exige aprovação da diretoria
e ela ainda não foi registrada. Nada é gravado nesse caso (nem status, nem
conta a pagar).

### Segregação de função na compra (D-K) — quem solicita não aprova

**(NOVO 2026-08-10 — decisão D-K do dono do produto,
`docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4.)** Fecha o
critério de pronto da §5 do mesmo plano, que até esta data estava
explicitamente **não atendido**: o G11 entregou *alçada* (quem tem poder de
aprovar), não *segregação* (se essa pessoa é a mesma que pediu).

Regra única, aplicada em **4 pontos de aprovação** da cadeia de suprimentos.
O aprovador vem **sempre de `req.user.id` (JWT)**, nunca do body:

| Endpoint | `details.rule` | Solicitante comparado |
|---|---|---|
| `PATCH /api/purchase-requisitions/:id/status` (`approved`) | `D-K-REQUISICAO` | `purchase_requisitions.requester_id` |
| `PUT /api/purchases/:id/status` (`approved`) | `D-K-PEDIDO` | `purchase_orders.requester_id` |
| `POST /api/purchases/:id/approve` (alçada G11) | `D-K-ALCADA` | `purchase_orders.requester_id` |
| `POST /api/comex/import-processes/:id/approve` (G11-COMEX) | `D-K-COMEX` | `import_processes.created_by` |

Corpo do erro (HTTP **422**), igual nos quatro:

```json
{
  "success": false,
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Segregacao de funcao: voce mesmo registrou o pedido de compra PO-2026-0007, entao nao pode aprova-la. Peca a aprovacao a outro usuario com acesso ao modulo de compras (ou outro administrador). Se ninguem mais tem esse acesso hoje, o administrador precisa cadastrar um segundo aprovador (Administracao > Perfis de Acesso) — a regra existe para que nenhuma compra seja pedida e aprovada pela mesma pessoa.",
    "details": {
      "rule": "D-K-PEDIDO",
      "requester_user_id": 7,
      "approver_user_id": 7,
      "what_to_do": "Solicitar a aprovacao a outro usuario com acesso ao modulo de compras."
    }
  }
}
```

Pontos que o cliente precisa conhecer:

- ⚠️ **`role: "admin"` NÃO isenta.** É a única regra do ERP em que o
  administrador não tem curto-circuito. RBAC e alçada tratam de
  **privilégio** (concedível); segregação trata de **identidade**, e nenhum
  nível de permissão transforma uma pessoa em duas. Consequência prática:
  **é preciso existir um segundo usuário habilitado a aprovar** — com um
  único aprovador cadastrado, nada é aprovável.
- Só vale para **aprovar**. O solicitante continua submetendo
  (`draft → pending`), cancelando, convertendo e enviando o próprio pedido
  (`approved → sent`).
- **Nada é gravado** quando a regra reprova — nem `status`, nem `approved_by`,
  nem `approval_date`, nem a linha de alçada.
- Documento **sem solicitante registrado** não é bloqueado (comparação
  impossível). Isso só alcança pedidos legados:
  `purchase_orders.requester_id` é a única das três colunas que é `NULL`-able
  no schema (0 linhas nulas hoje); as outras duas são `NOT NULL`.
- Implementação: `server/src/shared/domain/segregationOfDuties.ts`.

### Alçada de aprovação de compra (G11) — `approve` / `approvals`

Decisão D-C do dono do produto (2026-08-10). A alçada é por **ORIGEM**:

| Origem | Regra |
|---|---|
| Nacional | até R$ 500.000 segue direto; **acima** exige a diretoria |
| Importação | **sempre** exige a diretoria, em qualquer valor |

Origem efetiva = `purchase_orders.origin = 'import'` **OU**
`suppliers.is_foreign = true` (escalation-only — o campo do pedido só torna a
regra mais restritiva). Valor comparado com o teto = `total_amount` + `freight_value`,
sem impostos.

#### POST /api/purchases/:id/approve
Registra **uma** aprovação de alçada. Módulo dono: `diretor`
(`authorizeModule('diretor')`) — não `compras`, porque quem aprova a alçada é
a diretoria, que não necessariamente opera compras. Sem body.

`approver_user_id` vem do JWT e `approver_role` do RBAC — nenhum dos dois é
aceito do body. Só é aceita enquanto o pedido está `pending`. O mesmo papel
não aprova duas vezes (UNIQUE no banco → 422).

```json
{ "success": true, "data": { "id": 12, "purchase_id": 7, "approver_user_id": 42, "approver_role": "diretor", "approved_at": "2026-08-10T13:02:00.000Z" } }
```

Erros (422, `details.rule = "G11"`): usuário sem o papel; pedido que não
exige alçada; pedido fora de `pending`; papel que já aprovou.

Erro (422, `details.rule = "D-K-ALCADA"`): o diretor é o próprio solicitante
do pedido (`purchase_orders.requester_id`) — verificado **antes** de tudo o
que está acima, inclusive para `role: "admin"`. Sem essa trava a segregação do
pedido teria porta lateral: o mesmo usuário criaria o pedido, assinaria a
própria alçada e a diretoria viraria carimbo.

#### GET /api/purchases/:id/approvals
Situação da alçada, **sem efeito colateral**. Autorização: `compras` **OU**
`diretor`.

```json
{
  "success": true,
  "data": {
    "origin": "import",
    "origin_source": "supplier",
    "approval_value": 1000000,
    "required_roles": ["diretor"],
    "approvals": [],
    "missing_roles": ["diretor"],
    "approval_complete": false
  }
}
```

`origin_source` explica **por que** o pedido caiu na alçada: `supplier`
(cadastro do fornecedor), `declared` (declarado no pedido) ou `none`
(nacional).

### POST /api/purchases/:id/receive
Registra o recebimento (total ou parcial) dos itens do pedido. Só permitido enquanto o pedido está `sent` ou `partial`.
```json
{
  "items": [
    { "item_id": 7, "quantity": 60 }
  ],
  "invoice_number": "NF-1001",
  "warehouse_code": "INSUMOS",
  "invoice_date": "2026-08-08",
  "due_date": "2026-09-07"
}
```
Cada item não pode exceder a quantidade pendente (`quantity - received_quantity`). Dá entrada no estoque via `InventoryService.receive` (lock pessimista + transação) e atualiza o status do pedido e dos itens.

**Conta a pagar (gap G13, 2026-08-10 — decisão D-A do dono):** é **este**
endpoint que cria a `AccountPayable` da compra, não mais a aprovação do
pedido (`PUT /api/purchases/:id/status` → `approved`). Base normativa:
**CPC 00 (R2) item 4.56** (pedido aprovado e não entregue é *contrato
executório*) e **item 4.58** (o passivo surge quando a outra parte cumpre
primeiro — a entrega do fornecedor).

- **Valor:** soma de `quantidade recebida × preço unitário` **desta entrega**.
  Recebeu metade, deve a metade. Um pedido recebido em três entregas gera
  três contas a pagar, uma por NF do fornecedor. `freight_value` continua
  fora (como já ficava fora de `total_amount`) e é lançamento manual em
  `POST /api/finance/payable`.
- **Vencimento:** `due_date` informado prevalece; senão `invoice_date + 30`
  dias; senão data do recebimento + 30 dias. Os 30 dias são o mesmo default
  que já existia — o que mudou é a data-base, que era `expected_date` (data
  prometida) e passou a ser um fato ocorrido. ⚠️ A pergunta **C7** ao
  contador (prazo conta da NF ou do recebimento físico?) segue em aberto;
  quando respondida, muda apenas a data-base do item 2.
- **Aprovador:** `approved_by`/`approval_date` nascem **nulos** — quem recebe
  não aprova pagamento (segregação de funções / three-way match). Quem
  recebeu fica em `purchase_receipts.received_by`, em `notes` e no log de
  auditoria.
- **Idempotência:** chave `(purchase_id, invoice_number)`, a mesma do índice
  único de `purchase_receipts`.
- **Dado legado:** pedido aprovado **antes** do corte já tem uma AP do valor
  cheio, criada pela regra antiga e reconhecível por `invoice_number IS
  NULL`. Nesse caso o recebimento **não lança nada** (evita duplicar
  passivo) e devolve `payable_skip_reason: "legacy_created_on_approval"`.
  Nenhuma linha financeira existente é alterada — o destino dessas APs
  (estorno ou congelamento) é a pergunta **C9** ao contador.

**Campos novos do payload (ambos opcionais):**

| Campo | Formato | Efeito |
|---|---|---|
| `invoice_date` | `YYYY-MM-DD` | Data de emissão da NF do fornecedor; base do vencimento quando `due_date` não vem |
| `due_date` | `YYYY-MM-DD` | Vencimento negociado; prevalece sobre qualquer cálculo |

**Campos novos da resposta (fora de `data`):**

```json
{
  "success": true,
  "data": { "...": "pedido completo" },
  "requisition_status": null,
  "account_payable": { "id": 91, "amount": "125.00", "due_date": "2026-09-07", "invoice_number": "NF-1001" },
  "payable_skip_reason": null
}
```

`account_payable` é `null` quando nada foi lançado; nesse caso
`payable_skip_reason` explica: `legacy_created_on_approval`, `no_supplier`
(pedido sem fornecedor — lançamento fica manual), `zero_amount` ou
`already_exists`.

**Entrada em estoque (caminho único, gap G14):** desde 2026-08-09 os quatro
passos ficam em `materialReceiptService.receiveMaterialIntoQuarantine`
(estoque → dual-write de depósito → lote nascendo em `quarantine` → custo
real). O comportamento do recebimento de compra **não mudou** — a extração
existiu para que a Importação/COMEX (seção 32), que entrava sem lote e sem
quarentena, passasse a usar exatamente o mesmo caminho em vez de uma cópia
degradada.

**Reflexo na requisição de origem (gap G15):** quando o pedido tem
`requisition_id`, o recebimento recalcula e grava o status da requisição
(`partial`/`received`) na mesma transação, com lock pessimista na requisição.
A resposta traz `requisition_status` **fora de `data`** (novo status da
requisição, ou `null` quando não há requisição de origem ou nada mudou).
Regra completa na seção 15.

> Nota de arquitetura: os endpoints de `/api/purchases` são servidos pelo
> módulo `server/src/modules/purchases/` (Clean Architecture). O
> recebimento reutiliza `server/src/services/inventoryService.ts` (lock
> pessimista + transação). Erros de validação/regra de negócio retornam
> `{ success: false, error: { code, message } }` (em vez de string simples,
> mesmo padrão já adotado em `inventory`/`bom`/`production`). Ver
> `server/src/modules/purchases/README.md` para detalhes de regras de
> negócio, a máquina de estados e a correção de atomicidade da aprovação.

---

## 11.1 Cotação / RFQ (Multi-fornecedor)

**(Novo, 2026-08-06)** Módulo `server/src/modules/rfq/` — fecha o gap
"Cotação/RFQ multi-fornecedor" do item 1 (`docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`
seção 2). Tabelas `rfqs`/`rfq_items`/`rfq_suppliers`/`rfq_quotes` (migration
`20260806-000010-create-rfq-tables.cjs`, ver `docs/database/DATABASE.md`). Todas as
rotas exigem `authenticate` + `authorizeModule('compras', ...)` — leitura
para `GET`, `operate` para criação/convite/cotação, **`approve`** (nível
gestor) para adjudicar. Página web: `/purchases/rfqs`. Testado ao vivo
ponta a ponta.

**Máquina de status:** `draft → sent → quoted → awarded` (`cancelled`
reservado, ainda sem transição implementada).

### GET /api/rfqs
Lista cotações, paginada.

**Query Params:** `page`, `limit` (máx. 100), `status` (`draft`/`sent`/`quoted`/`awarded`/`cancelled`), `requisition_id`

### GET /api/rfqs/:id
Detalhe completo (itens, fornecedores convidados, cotações recebidas).

### GET /api/rfqs/:id/comparison
Mapa comparativo item × fornecedor.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "rfq": { "id": 12, "rfq_number": "RFQ-2026-0012", "status": "quoted", "requisition_id": 45 },
    "items": [
      {
        "rfq_item_id": 101,
        "item_id": "9f2b...uuid",
        "item": { "id": "9f2b...uuid", "codigo": "BOB-8POL", "descricao": "Bobina 8 polegadas" },
        "quantity": 500,
        "unit": "un",
        "awarded_supplier_id": null,
        "awarded_unit_price": null,
        "quotes": [
          {
            "quote_id": 1,
            "supplier_id": 3,
            "supplier_name": "Fornecedor X",
            "unit_price": 12.50,
            "lead_time_days": 10,
            "moq": 100,
            "validity_date": "2026-09-01",
            "notes": null,
            "line_total": 6250.00,
            "is_best_price": true,
            "is_best_lead_time": false
          }
        ]
      }
    ],
    "supplier_totals": [
      { "supplier_id": 3, "supplier_name": "Fornecedor X", "items_quoted_count": 1, "total_amount": 6250.00 }
    ]
  }
}
```
`is_best_price`/`is_best_lead_time` são calculados por item, entre os
fornecedores que efetivamente cotaram aquele item. `supplier_totals` é
ordenado por `total_amount` crescente.

### POST /api/rfqs
Cria uma cotação — **avulsa** (`items`) OU **a partir de uma requisição**
(`requisition_id`), nunca os dois nem nenhum (XOR validado no schema).

**Request (avulsa):**
```json
{
  "items": [
    { "item_id": "9f2b...uuid", "quantity": 500, "unit": "un" }
  ],
  "response_deadline": "2026-08-20",
  "notes": "Cotação para reposição trimestral"
}
```
**Request (a partir de requisição):**
```json
{ "requisition_id": 45 }
```
Gera `rfq_number` no formato `RFQ-<ano>-XXXX`, status inicial `draft`.

**Saldo e estado da requisição de origem (gap G12, 2026-08-09).** Ao cotar a
partir de `requisition_id`:
- a requisição precisa estar em estado que ainda admita compra —
  `draft`/`pending`/`approved`. Com `ordered`/`partial`/`received`/`canceled`,
  responde **422** (cotar e adjudicar uma requisição já atendida geraria um
  segundo pedido de compra dos mesmos itens);
- só são puxados os itens com **saldo** (`purchase_requisition_items.status =
  'pending'`); itens já pedidos ou cancelados são ignorados. Se nenhum item
  tiver saldo, responde **422**.

Cotar antes de aprovar continua permitido de propósito (o preço cotado é o que
embasa a aprovação) — o gate de aprovação é aplicado na **adjudicação**.

### POST /api/rfqs/:id/suppliers
Convida fornecedores a cotar (transiciona `draft → sent` no primeiro convite).

**Request:**
```json
{ "supplier_ids": [3, 7, 12] }
```

### POST /api/rfqs/:id/quotes
Registra a resposta de cotação de UM fornecedor (preço/prazo/MOQ/validade
por item; upsert por par item × fornecedor — reenviar substitui a cotação
anterior do mesmo fornecedor para o mesmo item).

**Request:**
```json
{
  "supplier_id": 3,
  "items": [
    {
      "rfq_item_id": 101,
      "unit_price": 12.50,
      "lead_time_days": 10,
      "moq": 100,
      "validity_date": "2026-09-01",
      "notes": "Preço válido para pedido único"
    }
  ]
}
```

### POST /api/rfqs/:id/award
**Adjudica** a cotação — escolhe, por item, o fornecedor vencedor entre os
que cotaram (podendo dividir itens entre fornecedores diferentes). Exige
`authorizeModule('compras', 'approve')`. RFQ precisa estar `quoted`.

**Request:**
```json
{
  "awards": [
    { "rfq_item_id": 101, "supplier_id": 3 },
    { "rfq_item_id": 102, "supplier_id": 7 }
  ],
  "notes": "Adjudicado por melhor prazo no item 102"
}
```
**Efeitos, todos na mesma transação:**
1. Gera **um Pedido de Compra por fornecedor vencedor** (agrupando os
   itens adjudicados àquele fornecedor).
2. Congela `rfq_items.awarded_supplier_id`/`awarded_unit_price` (preço
   vencedor, para auditoria/exibição sem recalcular o mapa comparativo).
3. Faz **upsert no catálogo `item_suppliers`** com o preço/prazo/MOQ do
   vencedor (realimenta o catálogo item × fornecedor para as próximas
   requisições/conversões).
4. Marca a RFQ `awarded`.
5. **Consome o saldo da requisição de origem, quando houver** (gap G12,
   2026-08-09): os itens adjudicados viram `ordered` em
   `purchase_requisition_items` e, **somente quando não sobra nenhum item
   pendente**, a requisição inteira vira `ordered`. Sobrando saldo, ela
   permanece `approved` (aberta) e o restante pode ser comprado por outra
   cotação ou pela conversão direta. A requisição é travada
   (`SELECT ... FOR UPDATE`) antes da criação de qualquer pedido.

**Response (201):**
```json
{
  "success": true,
  "data": {
    "purchase_orders": [ { "id": 88, "order_number": "PO-1754...-1", "supplier_id": 3, "total_amount": 6250.00, "items": [ ... ] } ],
    "rfq_id": 12,
    "rfq_status": "awarded",
    "requisition_id": 45,
    "requisition_status": "ordered"
  }
}
```
`requisition_id`/`requisition_status` são `null` em RFQ avulsa.

**Erros (422, `BusinessRuleError`):** RFQ não está `quoted`; item duplicado
na adjudicação; `rfq_item_id` não pertence à RFQ; não há cotação
registrada para o par item/fornecedor informado; item sem produto legado
correspondente (`items.codigo` sem `products.code`); **requisição de origem
não está `approved`** (adjudicar não é atalho para pular a aprovação da
requisição); **item adjudicado sem saldo na requisição** (já pedido ou
cancelado) — `details.requisition_item_ids_without_balance`. Erro **404** se a
requisição de origem não existir mais.

**Nota de concorrência:** a RFQ é travada via `SELECT ... FOR UPDATE`
(repositório) durante a adjudicação, para impedir duas adjudicações
concorrentes duplicadas na mesma RFQ.

---

## 12. Fornecedores

### GET /api/suppliers
Lista fornecedores. Filtros: `search` (busca por `company_name`/`cnpj`, sanitizada), `status`; paginação: `page`, `limit`.
```json
{
  "success": true,
  "data": [ { "id": 2, "company_name": "Fornecedor X", "cnpj": "12345678000199", "status": "active", "rating": 3, "quality_score": "100.00" } ],
  "pagination": { "total": 1, "page": 1, "limit": 10, "totalPages": 1 }
}
```
`quality_score` (item 8 do levantamento, realimentação de rating a partir de
RNCs): `DECIMAL(5,2)` **somente leitura** — não existe no schema Zod de
`POST/PUT` (`.strict()`), logo nenhum payload consegue setá-lo. É recalculado
de forma síncrona, na mesma transação de `POST /api/non-conformities`, apenas
quando a RNC referencia um lote (`lot_number`+`product_id`) cujo
`lot_controls.supplier_id` está preenchido — fórmula em
`server/src/modules/nonConformities/application/use-cases/CreateNonConformityUseCase.ts`
(`recalculateSupplierQualityScore`). Distinto de `rating` (inteiro 1-5,
digitado manualmente no cadastro).

### GET /api/suppliers/:id
Detalhes de um fornecedor. `404` (`{ "success": false, "error": "Fornecedor não encontrado" }`) se o id não existir.

### POST /api/suppliers
Cria um fornecedor.
```json
{
  "company_name": "Fornecedor X Ltda",
  "cnpj": "12.345.678/0001-99",
  "trade_name": "Fornecedor X",
  "ie": "123456789",
  "phone": "(11) 99999-0000",
  "email": "contato@fornecedorx.com",
  "contact_name": "João",
  "contact_phone": "(11) 98888-0000",
  "payment_terms": "30/60/90",
  "delivery_time": 15,
  "notes": "Fornecedor de bobinas",
  "is_foreign": false
}
```
`company_name`, `cnpj` e **`is_foreign`** são obrigatórios. O CNPJ é validado (dígito verificador) e salvo sem formatação (apenas dígitos). `rating` é sempre `3` e `status` sempre `"active"` na criação. CNPJ duplicado retorna `409`.

`is_foreign` (booleano, G11): marca fornecedor estrangeiro. **Todo pedido de
compra de fornecedor marcado assim exige aprovação da diretoria, em qualquer
valor** — é a fonte de origem que não está sob controle de quem monta o
pedido.

> ⚠️ **Passou a ser OBRIGATÓRIO em 2026-08-11 (auditoria).** Era opcional, com
> `DEFAULT false` na coluna: cadastrar um fornecedor estrangeiro sem marcar o
> campo — o caminho de menor esforço, e o único para quem integra pela API —
> gravava importação como **nacional**. A partir daí, todo pedido dele
> resolvia `origin = 'national'` e passava por baixo do teto de R$ 500 mil,
> sem erro em lugar nenhum. Omitir o campo agora responde **400**
> (`VALIDATION_ERROR`) apontando `is_foreign`.
>
> Na **edição** (`PUT /api/suppliers/:id`) o campo segue opcional: não se
> exige redeclarar a origem para trocar um telefone, e o desmarcar já é
> proibido (escalation-only, abaixo).

### PUT /api/suppliers/:id
Atualiza campos cadastrais (`company_name`, `trade_name`, `ie`, `phone`, `email`, `cep`, `street`, `number`, `complement`, `neighborhood`, `city`, `state`, `contact_name`, `contact_phone`, `payment_terms`, `delivery_time`, `rating`, `notes`, `is_foreign`). Não permite alterar `cnpj` nem `status` por este endpoint.

`is_foreign` é **escalation-only** (G11): marcar como estrangeiro é livre;
desmarcar (`true → false`) retorna **422** — tirar um fornecedor da alçada
obrigatória exige ação administrativa direta no banco, com trilha própria.

### DELETE /api/suppliers/:id
Inativa (soft delete, `status="inactive"`) um fornecedor. Bloqueado (`400`) se o fornecedor possuir pedidos de compra com status `pending`/`approved`/`sent`/`partial`:
```json
{ "success": false, "error": "Fornecedor possui 2 pedido(s) de compra pendente(s)." }
```

> Nota de arquitetura: os endpoints de `/api/suppliers` são servidos pelo
> módulo `server/src/modules/suppliers/` (Clean Architecture). Todas as
> rotas exigem apenas `authenticate` (sem `authorize` por papel). Erros de
> validação/regra de negócio preservam exatamente o mesmo corpo de resposta
> do controller anterior (`{ success: false, error: "mensagem" }`), pois o
> `errorHandler` devolve `err.message` como string simples para erros com
> `statusCode < 500`. Este módulo **não gera auditoria** (`AuditLog`) em
> nenhum endpoint — pendência conhecida documentada em
> `server/src/modules/suppliers/README.md`.

---

## 13. MRP (Planejamento de Materiais)

> Módulo `server/src/modules/mrp/` (Clean Architecture). Todas as rotas exigem
> `authenticate` + `authorizeModule('mrp', ...)`. Rotas de leitura exigem
> permissão `view` implícita; rotas de escrita (`plan`, `planned-orders/convert`)
> exigem `operate`.

### POST /api/mrp/plan
Roda o MRP contra o estoque real (não congelado) e cria ordens planejadas a partir de uma lista de demandas.

> ⚠️ **G7 (achado colateral, 2026-08-10) — o que o MRP conta como "estoque"
> mudou.** O recebimento cria o lote em `quarantine` mas **já incrementa
> `products.quantity`** no mesmo passo. Enquanto o MRP lia esse número cru,
> material recebido e **não inspecionado** contava como disponível — o plano
> **comprava de menos**, e a quarentena era decorativa para o planejamento
> (exatamente o "uso não pretendido" que a ISO 9001 §8.7 manda prevenir).
>
> A partir do G7, `estoque_disponivel` desconta o saldo retido em lotes
> `quarantine`/`blocked` (`max(0, físico − retido)`). O efeito é
> **conservador**: o MRP passa a ver MENOS estoque, então o erro possível é
> planejar a mais, nunca planejar sobre material bloqueado. As posições
> internas do MRP expõem também `estoque_fisico` e `estoque_retido_qualidade`
> para diagnóstico. Implementação em `server/src/services/quarantineBalanceService.ts`.
>
> A mesma correção vale para a **checagem de disponibilidade de OP**
> (`BomService.explodeBOM` → `checkAvailability`, usada por
> `POST /api/production-orders` e pela conversão de plano em OP): antes ela
> aprovava a OP contra material que o FEFO da produção — que só consome lote
> `available` — nunca conseguiria consumir, e a falha só aparecia lá na
> frente, na conclusão da OP. Cada componente agora traz `stock_available`
> (líquido), `stock_physical` (bruto) e `stock_quality_withheld`.
```json
{
  "demands": [
    { "item_id": "uuid-item", "quantidade": 100, "data_necessidade": "2026-08-20", "origem": "PEDIDO_VENDA" }
  ]
}
```
`origem` aceita `MANUAL`, `PEDIDO_VENDA`, `PREVISAO`, `ORDEM_PRODUCAO`. Retorna `201` com a lista de ordens planejadas geradas (`necessidade_bruta`, `estoque_disponivel`, `necessidade_liquida`, `quantidade_planejada`, `status` inicial `RASCUNHO`, ou `EM_EXECUCAO` para as convertidas automaticamente — ver abaixo).

> 🩹 **Correção de 2026-08-11 (defeito crítico 1 da auditoria) — netagem
> conjunta.** Até aqui o endpoint rodava o motor **uma vez por demanda**,
> sempre com a posição de estoque íntegra: cada demanda abatia o saldo
> inteiro, como se fosse a única da fábrica. Duas demandas de 100 do mesmo
> item contra 100 em estoque davam necessidade líquida **zero** nas duas
> (o motor descarta linha com quantidade planejada 0) e o plano voltava
> vazio — **a fábrica comprava a menos** e só descobria na linha de
> produção.
>
> Agora a netagem é **conjunta**: todas as demandas do payload disputam a
> mesma posição de estoque numa única passagem pelo motor, e a necessidade
> líquida agregada é **rateada por origem**, proporcionalmente à necessidade
> bruta de cada uma, para preservar `origem`/`origem_id`. Consequências
> visíveis no payload de resposta:
> - a soma de `necessidade_liquida` das linhas de um item/data é a
>   necessidade real (no exemplo acima: 100, não 0);
> - `estoque_disponivel` agora é a **parcela** do saldo alocada àquela
>   origem (antes o saldo inteiro era repetido em toda linha, e a linha não
>   fechava: `bruta − disponível ≠ líquida`). A soma das parcelas é o saldo;
> - `quantidade_planejada` respeita o **lote mínimo no agregado**, não na
>   linha — arredondar linha a linha compraria a mais a cada rodada.
>
> Provado contra PostgreSQL real em
> `server/tests/integration/mrp-multi-demand-netting.test.ts`; aritmética do
> rateio em `server/tests/unit/mrp-multi-demand-allocation.test.ts`.

> 🩹 **Correção de 2026-08-11 (defeito crítico 2) — reexecutar o plano é
> idempotente.** Rodar o MRP de novo (rotina diária do planejador) sobre a
> mesma demanda **ressuscitava ordens já convertidas**: o upsert reaplicava o
> payload inteiro — inclusive `status: 'RASCUNHO'` — sobre a linha existente,
> e a ordem em `EM_EXECUCAO` voltava a ser elegível para conversão
> automática, gerando **uma requisição de compra nova por rodada**. Agora
> `status` fica fora do UPDATE do upsert (é máquina de estados, não dado
> recalculado) e a criação da requisição ignora ordem que já foi convertida.
> Provado em `server/tests/integration/mrp-rerun-idempotency.test.ts`.

**Fechamento automático do ciclo (roadmap pós-Go-Live item 3):** na mesma
transação em que o plano é persistido, ordens planejadas cujo item tem
`items.conversao_automatica = true` são convertidas automaticamente em
Requisição de Compra (`origin: "mrp_auto"`, `requester_id` = usuário que
chamou este endpoint), sem esperar a seleção manual do UC-24
(`POST /api/mrp/planned-orders/convert`, `origin: "mrp"`). Itens sem a
flag (padrão `false`) continuam exigindo a conversão manual — comportamento
inalterado. Decisão de design completa e justificativa (por que não é
100% automático para todo item) em `docs/projeto/04-USE_CASES.md` (UC-24b)
e no cabeçalho da migration
`server/migrations/20260804-000010-add-mrp-auto-convert-to-items.cjs`.

### GET /api/mrp/planned-orders
Lista as ordens planejadas geradas pelo MRP, com o item relacionado (`id`, `codigo`, `descricao`).

### POST /api/mrp/planned-orders/convert
Converte um lote de ordens planejadas (status `RASCUNHO` ou `APROVADA`) em uma única **Requisição de Compra**, fechando o ciclo planejamento → suprimentos. A identidade do solicitante (`requester_id`) vem sempre de `req.user` (JWT) — nunca do body. A operação é atômica (transação Sequelize): se qualquer ordem informada não existir ou estiver em status inválido, nada é persistido.

Requisição:
```json
{
  "planned_order_ids": ["order-uuid-1", "order-uuid-2"],
  "notes": "Urgente cliente XPTO"
}
```
`notes` é opcional (default: `"Gerada automaticamente do plano MRP"`).

Resposta (`201`):
```json
{
  "success": true,
  "data": {
    "requisition": {
      "id": 99,
      "requisition_number": "RQ-2026-0004",
      "status": "pending",
      "origin": "mrp",
      "items": [
        {
          "item_id": "uuid-item",
          "quantity": "10.000000",
          "required_date": "2026-08-20",
          "suggested_supplier_id": 7,
          "unit_price_estimated": 12.5
        }
      ]
    },
    "converted_ids": ["order-uuid-1", "order-uuid-2"]
  }
}
```

Regras de negócio:
- Todas as ordens informadas devem existir; caso contrário `404` (`NotFoundError`).
- Todas devem estar em status `RASCUNHO` ou `APROVADA`; caso contrário `422` (`BusinessRuleError`) com a lista de ids inválidos em `invalid_ids` — nenhuma conversão parcial é permitida.
- Uma única requisição é criada (`origin: "mrp"`), com um item de requisição por ordem convertida.
- O fornecedor preferencial ativo do item (`ItemSupplier`), quando existir, é sugerido automaticamente (`suggested_supplier_id`) junto com o preço de referência (`unit_price_estimated`).
- Ao final, as ordens planejadas convertidas são marcadas como `EM_EXECUCAO`.

---

## 14. Dashboard / Painel de TV

### GET /api/dashboard/department-demands
Painel de TV (gestores) — demandas em aberto agrupadas por departamento, para acompanhamento sem precisar entrar no sistema (consumido pelo app Android TV construído em paralelo em `tv/`). Somente leitura; qualquer usuário autenticado com acesso ao módulo `dashboard` (`authorizeModule('dashboard')`, mesma autorização de `GET /api/dashboard` e `GET /api/dashboard/handoffs`).

Agrega, sem paginação, 3 entidades por departamento:
- **OPs** (`open_production_orders`): status `planned`, `released`, `in_progress` ou `paused` (tudo que não é `completed`/`canceled`).
- **Requisições de compra** (`open_purchase_requisitions`): status `draft`, `pending` ou `approved` (ainda não convertidas em pedido de compra pelo MRP/Compras — a partir de `ordered` a requisição deixa de ser demanda do departamento requisitante).
- **Contagens de inventário** (`open_inventory_counts`): status `draft`, `counting` ou `pending_approval`.

Inclui sempre um grupo agregado `department_id: null` ("Sem departamento") — cobre hoje 100% do histórico de OPs e contagens (campo novo, sem backfill retroativo por design, ver `docs/database/DATABASE.md`) e qualquer requisição legada sem departamento atribuído.

```json
{
  "success": true,
  "data": [
    {
      "department_id": 3,
      "department_name": "Producao",
      "open_production_orders": {
        "count": 2,
        "items": [
          { "id": 10, "reference": "OP-2026-0001", "status": "planned", "due_date": "2026-08-10", "label": "Alto-falante 12in" }
        ]
      },
      "open_purchase_requisitions": { "count": 0, "items": [] },
      "open_inventory_counts": {
        "count": 1,
        "items": [
          { "id": 30, "reference": "CC-2026-0001", "status": "counting", "due_date": null, "label": "cycle" }
        ]
      }
    },
    {
      "department_id": null,
      "department_name": "Sem departamento",
      "open_production_orders": { "count": 5, "items": [ "..." ] },
      "open_purchase_requisitions": { "count": 1, "items": [ "..." ] },
      "open_inventory_counts": { "count": 3, "items": [ "..." ] }
    }
  ]
}
```

Departamentos ativos aparecem em ordem alfabética; o grupo `"Sem departamento"` é sempre o último item da lista. Demandas vinculadas a um departamento inativo (soft delete, `active = false`) não aparecem em nenhum grupo até o departamento ser reativado.

---

## 15. Requisição de Compra

**(Seção adicionada em 2026-08-06 — módulo P0 do Go-Live, sem seção própria
em `docs/arquitetura/API.md` até então.)** Módulo `server/src/modules/purchaseRequisitions/`,
base URL `/api/purchase-requisitions`. Origem obrigatória de toda a cadeia
de suprimentos (`CLAUDE.md` §7, "Requisição de Compra como Origem").
`authorizeModule('requisicoes', ...)`: leituras exigem `view` implícito,
escritas comuns `operate`; `PATCH /:id/status` exige nível `approve` **na
rota** para qualquer transição, mas o controller ainda tem uma checagem
adicional hard-coded (`role !== 'admin'`) especificamente para a transição
`→ approved` — risco de convivência documentado no cabeçalho do arquivo de
rotas e em `docs/governance/TODO.md` (um usuário com perfil "Gestor de
Requisições", `level='approve'`, passa pela rota mas ainda pode ser barrado
pelo controller legado).

Máquina de status: `draft → pending → approved → ordered → partial →
received` (+ `canceled`). **Só os três primeiros saltos são manuais**
(`PATCH /:id/status`); `ordered`, `partial` e `received` são fatos derivados
de outros módulos e **não podem ser marcados à mão** — permitir isso seria
um jeito de declarar "requisição atendida" sem nada ter chegado ao estoque:

| Status | Quem grava | Significado |
|---|---|---|
| `ordered` | `POST /:id/convert` ou adjudicação de RFQ (gap G12) | todo o saldo requisitado virou pedido |
| `partial` | recebimento do pedido de compra (gap G15) | parte do que foi requisitado já chegou fisicamente |
| `received` | recebimento do pedido de compra (gap G15) | requisição **atendida** — tudo chegou |

**Corrigido em 2026-08-09 (gap G15):** `partial` e `received` eram estados
**mortos** — existiam no ENUM e nenhuma rotina os atingia, então a requisição
morria em `ordered` e não havia como responder "esta requisição foi
atendida?". O gatilho passou a ser
`POST /api/purchases/:id/receive` (ver seção 13), que recalcula o status da
requisição do zero a cada recebimento: `received` quando **todos** os pedidos
gerados por ela estão `received` **e** nenhum item da requisição ficou com
saldo `pending`; `partial` quando já chegou algo mas não tudo. Pedidos
`canceled` são ignorados no cálculo.

Requisição ainda `approved` (com saldo de compra em aberto) **não é tocada**
pelo recebimento, de propósito: `approved` é o estado que autoriza cotar/
converter o restante, e empurrá-la para `partial` deixaria o saldo
remanescente impossível de comprar (`CreateRfqUseCase`/`AwardRfqUseCase`
bloqueiam `partial`/`received`). Quando o último saldo vira pedido, ela passa
a `ordered` e o recebimento desse pedido fecha em `received` normalmente.

### GET /api/purchase-requisitions
Lista requisições, paginada.

**Query Params:** `page`, `limit` (máx. 100), `status` (`draft`/`pending`/`approved`/`ordered`/`partial`/`received`/`canceled`), `origin`, `requester_id`, `department_id`, `start_date`, `end_date`.

### GET /api/purchase-requisitions/:id
Detalhe da requisição, com itens.

### POST /api/purchase-requisitions
Cria uma requisição (`status` inicial `draft` ou `pending`, se informado).
`requester_id` **nunca** vem do body — sempre de `req.user.id` (JWT), e
`department_id` **nunca** é aceito do cliente (schema `.strict()` rejeita)
— é sempre resolvido a partir do `Employee` vinculado ao usuário
autenticado (`requester_id → Employee.user_id → Employee.department_id`).

**Request:**
```json
{
  "production_order_id": 12,
  "engineering_project_id": 4,
  "request_date": "2026-08-06",
  "priority": "urgent",
  "status": "pending",
  "origin": "manual",
  "notes": "Reposição de bobinas para OP-2026-0012",
  "items": [
    { "item_id": "9f2b...uuid", "quantity": 100, "unit": "un", "required_date": "2026-08-20", "suggested_supplier_id": 7, "unit_price_estimated": 12.5 }
  ]
}
```
`priority`: `normal`/`urgent`/`emergency` (opcional). `origin` é
`VARCHAR(80)` livre (não enum) — aceita também `mrp`, `mrp_auto` (gerados
automaticamente pelo MRP) e `engenharia_amostra` (UC-39; quando usado,
`notes` passa a ser **obrigatório em runtime**, validado no use case como
`BusinessRuleError` 422, não no schema Zod). `items` exige ao menos 1 item;
`item_id` é UUID (`items.id`, não `products.id`).

**Response (201):** requisição criada com `requisition_number` no padrão anual
do ERP, `RQ-YYYY-NNNN` (ex.: `RQ-2026-0004`) — mesma convenção de OP, MPS,
RFQ, contrato e importação. A numeração é serializada por advisory lock de
transação e derivada do **maior** número já emitido no ano
(`SequelizePurchaseRequisitionRepository.nextRequisitionNumberForYear`).

> Até 2026-08-11 o número era `RQ-<timestamp>` (`RQ-1723123456789`) — achado
> BAIXO 15 da auditoria: não ordenava, não comunicava nada ao usuário, ficava
> fora da série anual e podia colidir numa coluna `UNIQUE` entre duas
> requisições criadas no mesmo milissegundo. Os números antigos permanecem no
> histórico e são simplesmente ignorados pela geração (não casam com o
> prefixo do ano).

### PATCH /api/purchase-requisitions/:id/status
Transiciona o status: `draft → pending/canceled`, `pending → approved/canceled`.

**Request:** `{ "status": "approved" }` (enum: `approved`/`canceled`/`pending`).

**Erro (403)** — aprovar (`status: "approved"`) sem nível `approve` em
`requisicoes` nem `role: admin` (`ForbiddenError`, checagem redundante rota
+ controller, ver nota acima).

**Erro (422, `details.rule = "D-K-REQUISICAO"`)** — **(NOVO 2026-08-10,
decisão D-K)** aprovar a própria requisição
(`purchase_requisitions.requester_id == req.user.id`). Vale inclusive para
`role: "admin"`; nada é gravado (nem `status`, nem `approved_by`, nem
`approval_date`). Ver *Segregação de função na compra (D-K)* na seção de
Compras.

### POST /api/purchase-requisitions/:id/convert
Converte uma requisição **aprovada** em um ou mais Pedidos de Compra (um
por fornecedor resolvido), transacional com lock pessimista
(`SELECT...FOR UPDATE`) na requisição.

**Request:** `{ "fallback_supplier_id": 9, "notes": "Urgente cliente XPTO" }`
(`fallback_supplier_id` opcional, usado só para itens sem
`suggested_supplier_id` nem fornecedor preferencial ativo em
`item_suppliers`; `notes` opcional, default
`"Gerada automaticamente do plano MRP"`).

**Response (201):**
```json
{
  "success": true,
  "data": {
    "requisition_id": 99,
    "requisition_status": "ordered",
    "purchase_orders": [ { "id": 150, "order_number": "PO-1754...-1", "supplier_id": 7, "total_amount": 1250.0 } ]
  }
}
```
**Erro (404)** — requisição inexistente. **Erro (422)** — requisição não
está `approved`, algum item não tem fornecedor resolvível, ou **nenhum item
tem saldo a converter** (`BusinessRuleError`).

> **Saldo por item (gap G12, 2026-08-09):** só são convertidos os itens com
> `purchase_requisition_items.status = 'pending'`. Itens já pedidos pela
> adjudicação de uma cotação (`POST /api/rfqs/:id/award`) ou cancelados são
> ignorados — sem esse filtro, os mesmos itens virariam **dois** pedidos de
> compra pelos dois caminhos.

> Ver também `POST /api/mrp/planned-orders/convert` (seção 13, MRP) — a
> outra origem de criação de requisições, e `POST /api/rfqs` (seção 11.1)
> para o caminho alternativo de cotação multi-fornecedor antes de gerar o
> pedido de compra.

---

## 16. Qualidade — Não Conformidades (RNC)

Módulo `server/src/modules/nonConformities/`, base URL
`/api/quality/non-conformities`. `authorizeModule('qualidade', ...)`:
leituras `view` implícito, escritas comuns `operate`, `DELETE` (fechamento)
exige `approve`.

### GET /api/quality/non-conformities
Lista RNCs com filtros e paginação (`status`, `origin`, `severity`,
`product_id`, `production_order_id`, `asset_id`, `page`, `limit`).

### GET /api/quality/non-conformities/:id
Detalhe de uma RNC.

### POST /api/quality/non-conformities
Registra uma nova RNC. `reported_by` vem sempre de `req.user.id` (nunca do
body). Único campo obrigatório em runtime é `description`
(`ValidationError` 400 se ausente) — os demais têm defaults no model
(`severity: 'minor'`, `origin: 'in_process'`, `defect_type: 'other'`).

**Request:**
```json
{
  "product_id": 5,
  "purchase_item_id": 42,
  "asset_id": null,
  "production_order_id": null,
  "supplier_id": 7,
  "description": "Bobina fora de especificação dimensional",
  "severity": "major",
  "origin": "incoming",
  "defect_type": "dimensional",
  "quantity_affected": 20,
  "immediate_action": "return_supplier",
  "lot_number": "LOTE-2026-0042"
}
```
`severity`: `critical`/`major`/`minor`. `origin`: `incoming`/`in_process`/
`final`/`audit`/`customer_complaint`/`supplier`. `defect_type`:
`dimensional`/`visual`/`electrical`/`acoustic`/`material`/`packaging`/
`other`. `immediate_action`: `rework`/`scrap`/`return_supplier`/
`use_as_is`/`sorting`/`other`.

**Efeitos, todos na mesma transação:**
1. Se `lot_number` + `product_id` referenciam um lote existente em status
   bloqueável (`available`/`quarantine`/`reserved`), o lote é bloqueado
   (→ `blocked`) — ver `POST /api/inventory/lots/:id/block` (seção 8.3).
   **Quando nenhum lote é bloqueado, a RNC é criada assim mesmo (pode
   referenciar lote externo/legado) porém com aviso explícito** gravado em
   `notes`, prefixado por `[ATENCAO: NENHUM LOTE BLOQUEADO]`, e que portanto
   volta no payload da resposta (gap G10, 2026-08-09). Os quatro casos que
   geram aviso: lote não encontrado para o produto; `lot_number` informado sem
   `product_id` (a busca é por par produto × lote, não resolve); lote em
   status não bloqueável (ex.: `consumed`/`expired`/já `blocked`); RNC de
   produto sem `lot_number`. RNC que não referencia produto (ex.: `audit`,
   `asset_id`) não gera aviso — não há lote a conter.
   Até 2026-08-09 esse caminho era **mudo**: uma RNC que não conteve material
   nenhum era indistinguível de uma que bloqueou o lote.
2. Se o lote referenciado tem `supplier_id` preenchido (veio de um
   recebimento), `suppliers.quality_score` daquele fornecedor é
   recalculado de forma síncrona (`MAX(0, 100 - rncs_count/receipts_count*100)`)
   — ver `GET /api/suppliers` (seção 12) para o campo resultante.
3. Se `immediate_action = "return_supplier"`, aciona a devolução ao
   fornecedor (`SupplierReturnHandler`): estorna estoque (via
   `purchase_item_id`) ou muda `Asset.status` (via `asset_id`). A
   tratativa comercial (crédito/reposição) não é resolvida aqui — vira
   item de trabalho na fila de Compras (`GetDashboardHandoffsUseCase`).

**Erro (400)** — `description` ausente (`ValidationError`).

### PUT /api/quality/non-conformities/:id
Atualiza campos da RNC (análise de causa raiz, ação corretiva, etc.).

Campos aceitos do body: `description`, `severity`, `origin`,
`quantity_affected`, `immediate_action`, `root_cause`, `corrective_action`,
`status`, `responsible_id`.

Quando o payload traz `status: 'closed'`, o backend grava **`closed_date`**
(`DATE`, `YYYY-MM-DD`) e **`closed_by`** (sempre de `req.user.id`).

> ⚠️ **Corrigido em 2026-08-10** (achado §3 de
> `docs/governance/auditorias/VARREDURA_ESCRITA_REAL_2026-08-10.md`): até
> essa data o use case gravava `closed_at`, chave que **não é atributo do
> model** — o Sequelize a descartava em silêncio, o `UPDATE` saía sem ela e a
> API respondia `200`. **Toda RNC fechada ficava sem data de fechamento**
> (ISO 9001:2015 §8.7/§10.2). A coluna real sempre foi `closed_date`.
>
> No mesmo dia, `closed_by` foi **removido** da lista de campos aceitos do
> body: ele estava lá, então bastava enviá-lo no payload para atribuir o
> encerramento a outra pessoa. Passa a vir exclusivamente do JWT — mesmo
> padrão anti-spoofing da remediação 3.1.

### DELETE /api/quality/non-conformities/:id
Fecha (soft delete lógico, `status → closed`) uma RNC.
`authorizeModule('qualidade', 'approve')`.

Grava o **mesmo** conjunto de campos do `PUT` acima: `status`, `closed_date`
e `closed_by` (do JWT).

> ⚠️ **Segunda ocorrência do mesmo defeito, corrigida em 2026-08-10** (não
> apontada pela auditoria; encontrada ao varrer o módulo). Esta rota gravava
> **apenas** `status = 'closed'` — sem data e sem responsável. Os dois
> caminhos de encerramento agora derivam os campos da mesma função
> (`modules/nonConformities/domain/closure.ts`), e há teste comparando os
> dois payloads para impedir que voltem a divergir.

---

## 16.1 Qualidade — Inspeção de Lote (G7, ISO 9001 §8.6/§8.7)

Módulo `server/src/modules/quality/`, base URL `/api/quality`.
`authorizeModule('qualidade', ...)`: leitura exige `view` implícito,
registrar inspeção exige `operate`. **Liberar o lote continua exigindo
`approve`**, na rota de estoque (`POST /api/inventory/lots/:id/release`) — a
separação é deliberada: inspecionar (evidência) e autorizar a liberação
(decisão) são atos distintos na §8.6, e agora também níveis de permissão
distintos.

**Por que este recurso existe.** Até 2026-08-10 não havia entidade de
inspeção no ERP: liberar um lote da quarentena era um POST com um campo
`notes` livre — sem inspetor identificado, sem critério de aceitação, sem
resultado. Decisão **D-H** do dono (a empresa pretende se certificar
ISO 9001) em `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4.

⚠️ O texto integral da ISO 9001 é paywalled (iso.org devolve 403); as
cláusulas são citadas por número e assunto, conforme
`docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md` §Decisão 5.

⚠️ **Não há motor de amostragem Ac/Re.** Nível de inspeção e AQL por classe
de defeito (ISO 2859-1) são decisão da Engenharia da Qualidade e ainda não
foram definidos — a própria pesquisa normativa marca os valores de AQL como
`[NÃO CONFIRMADO NA FONTE]`. `sampling_plan`, `lot_size` e `sample_size` são
**evidência textual do que foi aplicado**, não entrada de cálculo. O veredito
é sempre do inspetor humano.

**Associações disponíveis (registradas em 2026-08-10).** Na entrega do G7 o
model `QualityInspection` ficou fora de `server/src/models/index.ts` (o arquivo
estava sob edição concorrente), então a tabela existia mas **nenhuma consulta
podia usar `include`**. O registro foi feito e os aliases abaixo estão
disponíveis para as respostas deste módulo evoluírem sem nova migration:

| Origem | Alias | Destino | FK |
|--------|-------|---------|-----|
| `QualityInspection` | `lot` | `LotControl` | `lot_id` |
| `QualityInspection` | `inspector` | `User` | `inspector_id` |
| `QualityInspection` | `nonConformity` | `NonConformity` | `non_conformity_id` |
| `QualityInspection` | `released_lots` | `LotControl` | `release_inspection_id` |
| `LotControl` | `inspections` | `QualityInspection` | `lot_id` |
| `LotControl` | `releaseInspection` | `QualityInspection` | `release_inspection_id` |
| `LotControl` | `releasedBy` | `User` | `released_by` |
| `User` | `quality_inspections` | `QualityInspection` | `inspector_id` |
| `NonConformity` | `quality_inspections` | `QualityInspection` | `non_conformity_id` |

⚠️ O **payload das respostas não mudou** nesta rodada — o registro habilita o
`include`, não o utiliza ainda. A migration `20260810-000032`, que cria
`quality_inspections` e as 3 colunas de liberação em `lot_controls`, **está
aplicada** nos dois bancos (`erp_evok_audio` e `erp_evok_audio_test`) —
verificado em `SequelizeMeta` em 2026-08-12. O aviso de "pendente de aplicação"
que existia aqui era de quando a migration acabara de ser escrita.

### POST /api/quality/inspections
Registra uma inspeção sobre um lote. `authorizeModule('qualidade','operate')`.

**Request:**
```json
{
  "lot_id": 77,
  "stage": "incoming",
  "acceptance_criteria": "Inspeção visual e dimensional conforme desenho DES-1042 rev. C",
  "sampling_plan": "ISO 2859-1 nível II",
  "lot_size": 500,
  "sample_size": 20,
  "defects_found": 0,
  "verdict": "approved",
  "notes": "Amostra conforme"
}
```

| Campo | Obrigatório | Observação |
|---|---|---|
| `lot_id` | **sim** | `lot_controls.id`. Não existe inspeção desvinculada de lote |
| `stage` | não (default `incoming`) | `incoming` \| `in_process` \| `final` |
| `acceptance_criteria` | **sim** (mín. 3 caract.) | §8.6 — o critério contra o qual o lote foi verificado |
| `verdict` | **sim** | `approved` \| `rejected` \| `approved_under_concession` |
| `concession_justification` | **sim quando** `verdict = approved_under_concession` (mín. 10 caract.) | §8.7 — aceitação sob concessão é decisão registrada e justificada |
| `sampling_plan`, `lot_size`, `sample_size`, `defects_found`, `notes` | não | evidência; `lot_size` omitido herda `lot_controls.quantity_initial` |

`inspector_id` **nunca** vem do body: é sempre `req.user.id` (anti-spoofing,
regra P0 — e é literalmente o requisito da §8.6).

**Efeitos por veredito:**

| Veredito | Efeito |
|---|---|
| `approved` | grava a evidência. **Não libera o lote** — liberar é ato separado |
| `approved_under_concession` | idem, com a justificativa retida |
| `rejected` | delega a `CreateNonConformityUseCase` (mesmo caminho do **G8/G10**), que **abre a RNC e bloqueia o lote**; o `non_conformity_id` volta gravado na inspeção |

**Erros (400 `VALIDATION_ERROR`, todos com `details.rule = "G7"` e `details.field`):**
`lot_id` ausente, `stage`/`verdict` fora do ENUM, `acceptance_criteria` curto,
`concession_justification` ausente na concessão, `defects_found`/`sample_size`
não numéricos. **Erro (404)** — lote inexistente, com
`details: { rule: "G7", lot_id }`.

### GET /api/quality/inspections
Lista inspeções. **Query params:** `lot_id`, `verdict`, `stage`,
`inspector_id`, `page`, `limit` (máx. 100).

Filtro de enum com valor inválido é **ignorado** (não vira `where`) em vez de
ser repassado ao Postgres — repassar produziria um 500 a partir de um query
string digitado errado.

### GET /api/quality/lots/:lotId/release-eligibility
Diagnóstico do gate de liberação de um lote. **Leitura pura, sem efeito
colateral** — a tela usa isto para saber se o botão "Liberar" vai funcionar
antes de o usuário clicar. Responde exatamente à mesma regra que o POST de
release aplica.

**Response:**
```json
{
  "success": true,
  "data": {
    "rule": "G7",
    "lot_id": 77,
    "lot_number": "LOT-2026-077",
    "lot_status": "quarantine",
    "blocked_at": null,
    "status_allows_release": true,
    "quality_gate_passed": false,
    "can_release": false,
    "reason": "no_inspection",
    "releasing_verdicts": ["approved", "approved_under_concession"],
    "latest_inspection": null
  }
}
```

`reason` é `null` quando o gate passa; caso contrário `no_inspection`,
`last_inspection_rejected` ou **`inspection_before_block`** (2026-08-11 — a
inspeção aprovada é anterior ao bloqueio vigente, cujo instante vem em
`blocked_at`).

> **A regra é "a inspeção MAIS RECENTE", não "existe alguma aprovada".** É a
> única leitura que sobrevive ao retrabalho e à reprovação posterior: com
> "existe alguma aprovada", um lote aprovado na entrada e reprovado depois
> continuaria liberável para sempre — o oposto do que a §8.7 manda. A
> re-inspeção após retrabalho é, então, o mecanismo natural de reabertura.

---

## 17. Laboratório (Testes Acústicos / Thiele-Small)

Módulo `server/src/modules/laboratory/`, base URL `/api/laboratory`.
Piloto de `authorizeModule('laboratorio', ...)` **aditivo** — compõe em
camada com `authorize('admin', 'operator')` legado no `POST /tests`
(ambos precisam passar), não o substitui. Leituras exigem `view`
implícito.

### GET /api/laboratory/tests/summary?product_id=&days=
Agregado (total/passed/failed/pass_rate) por `test_type`, últimos `days`
dias (default 30, máx. 3650). Registrada **antes** de `GET /tests` para
não colidir com um futuro `/tests/:id`.

### GET /api/laboratory/tests?product_id=&test_type=&passed=&serial_number=&start_date=&end_date=&page=&limit=
Lista paginada de testes de laboratório, com `product` e `tester`
incluídos.

### POST /api/laboratory/tests
Registra um resultado de teste. `authorizeModule('laboratorio', 'operate')`
**e** `authorize('admin', 'operator')` (ambos exigidos).

**Request:**
```json
{
  "product_id": 5,
  "serial_number": "SN-000123",
  "lot_number": "LOTE-2026-0042",
  "production_order_id": 12,
  "test_type": "thiele_small",
  "parameters": { "fs_hz": 45.2, "qts": 0.35 },
  "result": 45.2,
  "unit": "Hz",
  "specification_min": 40,
  "specification_max": 50,
  "curve_data": { "frequencies": [20, 50, 100], "db": [70, 85, 90] },
  "notes": "Amostra do lote piloto",
  "create_rnc_on_fail": true,
  "consumed_quantity": 1
}
```
`test_type` (enum): `impedance`/`frequency_response`/`thd`/`power_rms`/
`power_peak`/`life`/`polarity`/`noise`/`thiele_small`. `create_rnc_on_fail`
(opcional): **aceito e ignorado desde 2026-08-09 (gap G8)** — teste reprovado
(`passed = false`) abre RNC SEMPRE, não é mais opt-in. O campo segue no schema
apenas para não rejeitar o payload que a tela ainda envia; será removido junto
com a caixinha correspondente no `client/`.
`consumed_quantity` (opcional, Bloco 4/UC-42-E): quando > 0, debita
automaticamente o Depósito `LABORATORIO` na mesma transação (teste
destrutivo); ausente/0 = teste não-destrutivo, sem débito de estoque.

**Response (201):** teste criado, com `tester_id` = `req.user.id`.

---

## 18. Engenharia — Projetos P&D, Desenhos Técnicos e Ficha Técnica

Módulo `server/src/modules/engineering/`, base URL `/api/engineering`
(**exceto** `/api/engineering/bom/*`, que é o módulo `bom` — seção 9,
registrado ANTES deste em `app.ts` para não ser capturado). Piloto de
`authorizeModule('engenharia', ...)` **aditivo**, compõe com
`authorize('admin', 'operator')` legado nos endpoints de escrita comuns.
Liberar (`release`)/obsoletar (`obsolete`) um desenho exigem
`authorizeModule('engenharia', 'approve')` **e** `authorize('admin')`.

### Projetos de Engenharia (P&D)

| Método | Rota | RBAC | Descrição |
|--------|------|------|-----------|
| `GET` | `/api/engineering/projects?status=&stage=&page=&limit=` | view | Lista paginada |
| `GET` | `/api/engineering/projects/:id` | view | Detalhe |
| `POST` | `/api/engineering/projects` | operate + `admin`/`operator` | Cria (409 se `project_code` duplicado) |
| `PUT` | `/api/engineering/projects/:id` | operate + `admin`/`operator` | Atualiza |

**Request (`POST`):**
```json
{
  "project_code": "PD-2026-001",
  "name": "Alto-falante 15\" Pro Series",
  "description": "Novo modelo para linha profissional",
  "project_type": "new_product",
  "product_id": 8,
  "project_manager_id": 3,
  "start_date": "2026-08-10",
  "target_date": "2026-12-01",
  "budget": 150000,
  "priority": "high",
  "notes": "Prioridade do trimestre"
}
```
`project_type`: `new_product`/`improvement`/`customization`/`research`.
`priority`: `low`/`normal`/`high`/`critical`. `PUT` aceita adicionalmente
`stage` (`concept`/`design`/`prototype`/`testing`/`homologation`/
`production`), `status` (`active`/`paused`/`completed`/`canceled`),
`completion_date`, `actual_cost`.

### Desenhos Técnicos

| Método | Rota | RBAC | Descrição |
|--------|------|------|-----------|
| `GET` | `/api/engineering/drawings?product_id=&status=&page=&limit=` | view | Lista paginada |
| `POST` | `/api/engineering/drawings` | operate + `admin`/`operator` | Cria (409 se número+revisão duplicados) |
| `PUT` | `/api/engineering/drawings/:id` | operate + `admin`/`operator` | Atualiza |
| `POST` | `/api/engineering/drawings/:id/release` | **approve** + `admin` | Libera (`draft → released`) |
| `POST` | `/api/engineering/drawings/:id/obsolete` | **approve** + `admin` | Torna obsoleto (`released → obsolete`) |

**Request (`POST`):**
```json
{
  "product_id": 8,
  "drawing_number": "DWG-15POL-001",
  "revision": "A",
  "title": "Vista explodida — Alto-falante 15\"",
  "drawing_type": "exploded",
  "file_path": "/uploads/drawings/dwg-15pol-001-a.pdf",
  "material_spec": "Aço SAE 1020",
  "dimensions": "Ø 380mm x 150mm",
  "tolerances": "±0.5mm",
  "notes": "Revisão inicial"
}
```
`drawing_type`: `assembly`/`detail`/`exploded`/`schematic`/`bom`.
`release`/`obsolete` não recebem body — `approved_by` vem de `req.user.id`.

### Ficha Técnica Thiele-Small (`ItemEspecificacaoTecnica`)

| Método | Rota | RBAC | Descrição |
|--------|------|------|-----------|
| `GET` | `/api/engineering/items/:itemId/technical-spec` | view | Busca a ficha técnica de um item (404 se item não existe) |
| `PUT` | `/api/engineering/items/:itemId/technical-spec` | operate + `admin`/`operator` | Upsert |

**Request (`PUT`):**
```json
{
  "familia_tecnica": "woofer_15",
  "atributos": {
    "fs_hz": 32.5, "qms": 5.2, "qes": 0.42, "qts": 0.39,
    "vas_l": 85.0, "sd_cm2": 855, "xmax_mm": 6.5,
    "re_ohms": 6.2, "le_mh": 1.8, "bl_tm": 18.5,
    "mms_g": 95.0, "cms_mm_n": 0.28, "spl_db": 96.5
  }
}
```
Os 13 parâmetros Thiele-Small são todos opcionais e numéricos, persistidos
dentro do JSONB `atributos` (`.catchall` permite campos extras
número/string/boolean/null além dos 13 nomeados).

---

## 19. Patrimônio (Ativos)

Módulo `server/src/modules/assets/`, base URL `/api/assets`.
`authorizeModule('patrimonio', ...)`: leituras `view` implícito, escritas
comuns `operate`, `DELETE` exige `approve`.

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/assets` | Lista ativos (filtros e paginação) |
| `GET` | `/api/assets/:id` | Detalhe |
| `POST` | `/api/assets` | Cria |
| `PUT` | `/api/assets/:id` | Atualiza |
| `DELETE` | `/api/assets/:id` | Inativa (soft delete) |
| `POST` | `/api/assets/:id/photo` | Envia/substitui a foto (multipart, campo `photo`) |
| `GET` | `/api/assets/:id/qrcode?format=png\|svg` | Gera QR Code do ativo |

**Request (`POST`):**
```json
{
  "tag": "AT-0042",
  "name": "Torno CNC Romi",
  "description": "Torno CNC para usinagem de componentes",
  "department_id": 3,
  "responsible_id": 5,
  "location": "Setor de Usinagem",
  "asset_type": "machine",
  "brand": "Romi",
  "model": "GL 240M",
  "serial_number": "SN-ROMI-2020",
  "purchase_date": "2020-03-15",
  "purchase_value": 250000.0,
  "useful_life_months": 120,
  "notes": "Adquirido em leilão de ativos usados"
}
```
`asset_type`: `machine`/`equipment`/`tool`/`furniture`/`vehicle`/`it`/
`other`/`license`. `status` (não aceito na criação, default `active`):
`active`/`in_maintenance`/`decommissioned`/`lost`/`returned_to_supplier`
(este último setado automaticamente por
`SupplierReturnHandler.applySupplierReturn`, ver seção 16). `tag` é único.

**QR Code — mesma observação da seção 8.3 (Lotes):** gerado **on-the-fly**
a cada chamada via `GenerateEntityQrCodeUseCase`/`QRCodeService`, sem
nenhuma coluna de imagem persistida (`assets.qr_code` guarda apenas um
identificador de texto legado, não a imagem). Payload do QR:
`{ tag, name }`.

---

## 20. Manutenção

Módulo `server/src/modules/maintenance/`, base URL `/api/maintenance`.
`authorizeModule('manutencao', ...)`: leituras `view` implícito, escritas
comuns `operate`, `DELETE` (cancelamento) exige `approve`.

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/maintenance` | Lista ordens de manutenção (filtros e paginação) |
| `GET` | `/api/maintenance/:id` | Detalhe |
| `POST` | `/api/maintenance` | Cria |
| `PUT` | `/api/maintenance/:id` | Atualiza |
| `DELETE` | `/api/maintenance/:id` | Cancela |

**Request (`POST`):**
```json
{
  "asset_id": 42,
  "maintenance_type": "corrective",
  "priority": "high",
  "problem_description": "Ruído anormal no eixo principal"
}
```
`reported_by` vem de `req.user.id`. `maintenance_type`: `preventive`/
`corrective`/`predictive`/`emergency`/`overhaul`. `priority`: `low`/
`normal`/`high`/`emergency`. `order_number` (`MO-<timestamp>` ou
equivalente) é gerado no backend. Campos de acompanhamento (diagnóstico,
serviço executado, custos, `status`) são atualizados via `PUT`. `status`
(enum): `open`/`scheduled`/`in_progress`/`waiting_parts`/`completed`/
`canceled`.

---

## 21. RH — Funcionários

Módulo `server/src/modules/employees/`, base URL `/api/employees`.
**Mantém o RBAC legado** (não passou pelo retrofit `authorizeModule`):
leitura exige apenas `authenticate`; escrita (`POST`/`PUT`/`DELETE`) exige
`authorize('admin')` — dados de RH (salário, admissão) restritos ao
administrador global.

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/employees` | Lista funcionários (busca/filtro/paginação) |
| `GET` | `/api/employees/:id` | Detalhe |
| `POST` | `/api/employees` | Cria (role `admin`) |
| `PUT` | `/api/employees/:id` | Atualiza (role `admin`) |
| `DELETE` | `/api/employees/:id` | Desliga (soft delete, role `admin`) |

**Request (`POST`):**
```json
{
  "department_id": 3,
  "name": "Maria Oliveira",
  "cpf": "12345678900",
  "position": "Operadora de Produção",
  "salary": 2200.0,
  "salary_type": "mensal",
  "hire_date": "2026-08-10",
  "shift": "morning",
  "work_regime": "clt",
  "work_hours_weekly": 44
}
```
`salary_type`: `mensal`/`horista`/`comissionado`. `shift`: `morning`/
`afternoon`/`night`/`commercial`/`rotating`. `work_regime`: `clt`/`pj`/
`estagiario`/`aprendiz`. `status` (default `active`, não aceito na
criação): `active`/`inactive`/`fired`/`vacation`/`license`. `cpf` é único.

---

## 22. RH — Departamentos

Módulo `server/src/modules/departments/`, base URL `/api/departments`.
Mesmo padrão de RBAC legado de Funcionários: leitura só `authenticate`,
escrita exige `authorize('admin')`.

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/departments` | Lista departamentos ativos |
| `GET` | `/api/departments/:id` | Detalhe |
| `POST` | `/api/departments` | Cria (role `admin`) |
| `PUT` | `/api/departments/:id` | Atualiza (role `admin`) |
| `DELETE` | `/api/departments/:id` | Inativa (soft delete, role `admin`) |

**Request (`POST`):**
```json
{ "code": "PROD", "name": "Produção", "sigla": "PRD", "description": "Chão de fábrica", "manager_id": 12 }
```
`code` e `sigla` são únicos (índices únicos no banco). `manager_id` (FK →
`employees.id`) é opcional.

---

## 23. Rastreabilidade

Módulo `server/src/modules/traceability/`, base URL `/api/traceability`.
`authorizeModule('rastreabilidade')` (`view` implícito, qualquer nível
presente) em todas as rotas — módulo somente leitura, concedido
explicitamente aos perfis que precisam rastrear ponta a ponta
(`docs/business/BUSINESS_RULES.md` §6.3).

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/traceability/items/:id` | Histórico de movimentações de um item (id inteiro; **404** se nenhum movimento encontrado) |
| `GET` | `/api/traceability/lots/:id` | Histórico completo de um lote (id inteiro; **404** se nenhum movimento) |
| `GET` | `/api/traceability/production-orders/:id` | Detalhes da OP com todos os insumos consumidos (**404** se OP não existe) |

`:id` é validado como inteiro positivo em todas as 3 rotas
(`traceabilityIdParamSchema`) — **400** `ValidationError` caso contrário.

---

## 24. Logs de Auditoria

Módulo `server/src/modules/auditLogs/`, base URL `/api/audit-logs`.
**RBAC legado**, exclusivo de `authorize('admin')` em ambas as rotas —
não passou pelo retrofit `authorizeModule` (log de auditoria é
informação sensível de todo o sistema, não de um módulo/área específica).

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/audit-logs` | Lista logs com filtros e paginação (role `admin`) |
| `GET` | `/api/audit-logs/:id` | Detalhe de um log (role `admin`) |

Cada log inclui `action`, `entityType`, `entityId`, `entityDescription`,
`oldValues`/`newValues` (quando aplicável), `userId`, `description` e
timestamp — gerado internamente por `logAction()` (`server/src/services/auditLogService.ts`),
chamado pelos controllers/use cases de escrita da maioria dos módulos (ver
nota de exceção em `/api/suppliers`, seção 12, que **não** gera auditoria).

### 24.1 Vocabulário de `action` (fechado, revisto em 2026-08-10)

> ⚠️ **Achado P0 §2 de
> [`VARREDURA_ESCRITA_REAL_2026-08-10.md`](../governance/auditorias/VARREDURA_ESCRITA_REAL_2026-08-10.md).**
> `enum_audit_logs_action` tinha 15 valores e o código chamava `logAction`
> com **43 literais** (37 fora do tipo, em 46 call sites). Como `logAction` é
> fire-and-forget por desenho, o Postgres rejeitava o `INSERT`
> (`22P02 invalid input value for enum`), **a API respondia `200` e a trilha
> não era gravada**. Prova no dado real: `audit_logs` só tinha 5 valores
> distintos (`login=111, create=85, status_change=42, update=27, approve=20`).
> Entre os ausentes, **`access_denied`** — tentativa de acesso indevido sem
> rastro nenhum.

**SSOT:** `server/src/shared/domain/auditActions.ts`. `action` deixou de ser
`string` no model e passou a ser um union type derivado dessa constante.

**24 valores canônicos** = os 15 originais + 9 novos:

| Valor | Quando é usado |
|---|---|
| `create` · `update` · `delete` · `soft_delete` | CRUD |
| `login` · `logout` · `password_change` | sessão e credencial |
| `status_change` · `approve` · `reject` | ciclo de vida de documento |
| `price_change` · `salary_change` | alteração de valor sensível |
| `export` · `import` · `print` | saída de dado |
| **`access_denied`** *(novo)* | negativa de autorização (middlewares de RBAC) |
| **`read`** *(novo)* | consulta a dado pessoal/regulado (LGPD art. 37) |
| **`read_sensitive`** *(novo)* | exibição de segredo em claro (ex.: chave de licença) |
| **`permission_change`** *(novo)* | concessão/revogação de acesso (perfil ↔ usuário) |
| **`cancel`** *(novo)* | cancelamento terminal de documento |
| **`close`** *(novo)* | encerramento de processo/caso |
| **`post`** *(novo)* | contabilização (lançamento vira definitivo) |
| **`reverse`** *(novo)* | estorno contábil |
| **`settle`** *(novo)* | liquidação/baixa de operação financeira |

**Critério de admissão de um valor novo:** *a pergunta do auditor muda?* —
não "o verbo é diferente?". `action` responde **que tipo** de evento;
`entity_type` responde **sobre o quê**; `route`/`method`, **por onde**;
`description`/`new_values`, **com que conteúdo**. Um `ENUM` que ganha um
valor por endpoint não é vocabulário: é texto livre com passos extras, que
não agrega, não indexa e volta a divergir no módulo seguinte.

**Os outros 29 verbos de módulo são sinônimos**, traduzidos para o
vocabulário na gravação — `award` → `approve`, `settle` já é canônico,
`upsert` → `update`, `mrp_auto_convert_to_requisition` → `create`, etc. O
verbo original **não se perde**: vira marcador no início da `description`,
consultável diretamente:

```sql
SELECT * FROM audit_logs WHERE description LIKE '[award]%';
```

**Comportamento antes e depois da migration `20260810-000036`**
(que acrescenta os 9 valores e ainda **não foi aplicada**):

| | antes | depois |
|---|---|---|
| `access_denied` | grava `reject`, `description` começa com `[access_denied]` | grava `access_denied` |
| `read` / `read_sensitive` | grava `export` + marcador | grava o valor exato |
| `permission_change` | grava `update` + marcador | grava o valor exato |
| `cancel`/`close`/`post`/`reverse`/`settle` | grava `status_change` + marcador | grava o valor exato |

Em nenhum dos dois estados o evento é perdido. Nenhuma degradação mente de
categoria: evento **não-mutante** só cai em valor não-mutante (`reject`,
`export`) — uma leitura nunca é registrada como escrita. As linhas gravadas
em modo degradado são identificáveis (`description LIKE '[<valor>]%'`) e
**não sofrem backfill automático**: reescrever log de auditoria existente é
justamente o que uma trilha não pode permitir.

**Rede de proteção:** `server/tests/integration/enum-literal-guard.test.ts`
confronta todo literal com o `pg_enum` real; `server/tests/unit/audit-action-vocabulary.test.ts`
faz a metade que não precisa de banco e roda na suíte rápida.

---

## 25. Ordens de Serviço (Garantia / Assistência Técnica)

Módulo `server/src/modules/serviceOrders/`, base URL `/api/service-orders`.
`authorizeModule('garantia', ...)`: leituras `view` implícito, escritas
comuns `operate`, `DELETE` (cancelamento) exige `approve`.

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/service-orders` | Lista OS (filtros e paginação) |
| `GET` | `/api/service-orders/:id` | Detalhe |
| `POST` | `/api/service-orders` | Cria |
| `PUT` | `/api/service-orders/:id` | Atualiza |
| `DELETE` | `/api/service-orders/:id` | Cancela |

**Request (`POST`):**
```json
{
  "client_id": 10,
  "product_id": 5,
  "equipment_description": "Caixa acústica ativa 15\"",
  "reported_issue": "Sem áudio em um dos canais",
  "priority": "normal"
}
```
`priority`: `low`/`normal`/`high`/`urgent`. `status` (default `open`, não
aceito na criação): `open`/`diagnosing`/`in_progress`/`waiting_parts`/
`completed`/`delivered`/`canceled`. `warranty_days` (default 90) e
`order_number` (`OS-<timestamp>` ou equivalente) são geridos no backend.

---

## 26. Fiscal — Configuração do Emitente

Módulo `server/src/modules/fiscal/`, base URL `/api/fiscal`. **Só a
configuração fiscal da empresa emitente vive aqui** — os endpoints de NF-e
por venda/compra ficam em `/api/sales/:id/nfe*` (seção 5) e
`/api/purchases/:id/nfe` (seção 11), pois pertencem ao ciclo de vida de
venda/compra. Ambas as rotas abaixo exigem `authorize('admin')` (dado
sensível — não passou pelo retrofit `authorizeModule`).

### GET /api/fiscal/config
Retorna a configuração fiscal atual (ou `null`/vazio se nunca configurada).

### PUT /api/fiscal/config
Cria/atualiza (upsert) a configuração fiscal.

**Request:**
```json
{
  "legal_name": "Evok Audio Industria e Comercio LTDA",
  "trade_name": "Evok Audio",
  "cnpj": "12345678000199",
  "ie": "1234567890",
  "crt": "3",
  "cep": "01310-100",
  "street": "Av. Paulista",
  "number": "1000",
  "city": "São Paulo",
  "city_ibge_code": "3550308",
  "state": "SP",
  "nfe_series": 1,
  "nfe_environment": "homologacao",
  "nfe_provider": "mock"
}
```
`crt` (Código de Regime Tributário, enum string): `"1"` (Simples
Nacional), `"2"` (Simples — excesso), `"3"` (Regime Normal). `nfe_environment`:
`homologacao`/`producao`. `nfe_provider`: `mock`/`focus_nfe`/`enotas` —
determina se `POST /api/sales/:id/nfe` (seção 5) simula a emissão (`mock`,
usado em dev) ou integra com um provedor real.

---

## 27. Inventário Mobile (Scanner)

Módulo `server/src/modules/mobileInventory/`, base URL `/api/mobile-inventory`.
Consumido pelo app `mobile/` (scan de estoque). `authorizeModule('estoque', ...)`
— mesmo módulo de permissão de `/api/inventory/movements`: leitura `view`
implícito, escritas `operate`.

### POST /api/mobile-inventory/scan
Registra uma movimentação de estoque (entrada/saída) a partir de um único
código escaneado. Transacional (lock pessimista via
`InventoryService.adjust`, reaproveitado de `/api/inventory/movements`).

**Request:**
```json
{ "product_code": "AF-001", "quantity": 10, "type": "in", "description": "Recebimento manual via mobile" }
```
`type`: `in`/`out`. **Erro (400)** — campo obrigatório ausente, quantidade
`<= 0`, ou `type` inválido (`ValidationError`). **Erro (404)** — produto
não encontrado pelo código. **Erro (400/422)** — estoque insuficiente para
`type: "out"`.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "product": { "id": 1, "name": "Alto-Falante 8\"", "code": "AF-001" },
    "movement": { "movementId": 501, "quantityAfter": 110 },
    "new_quantity": 110
  }
}
```

### POST /api/mobile-inventory/batch
Igual ao `scan`, mas processa uma lista de itens numa única transação —
se qualquer item da lista falhar (produto não encontrado, quantidade
inválida, estoque insuficiente), **toda a transação é revertida** (nenhum
item é aplicado parcialmente).

**Request:**
```json
{
  "items": [
    { "product_code": "AF-001", "quantity": 10, "type": "in" },
    { "product_code": "CAB-P10-5M", "quantity": 5, "type": "out", "description": "Uso em montagem" }
  ]
}
```

**Response (200):** `{ "success": true, "data": { "items_processed": 2, "results": [ { "product_code": "AF-001", "product_name": "...", "type": "in", "quantity": 10, "movement_id": 501 } ] } }`

### GET /api/mobile-inventory/movements
Lista movimentações de estoque (paginação) — mesma fonte de dados de
`GET /api/inventory/movements` (seção 8), exposta também aqui para o app
mobile.

---

## 28. Webhooks (Integrações Externas)

Módulo `server/src/modules/webhooks/`, base URL `/api/webhooks`. **Sem
`authenticate`/`authorize`** — são endpoints de sistema externo
(automação n8n, provedor de NF-e), protegidos por segredo compartilhado ou
assinatura HMAC, nunca por JWT de usuário. Consistente com o princípio de
desacoplamento do ERP: sistemas externos (n8n, Meta/WhatsApp via n8n)
entram **apenas** por este webhook autenticado por segredo — nunca com
acesso direto a use case/repository/banco.

### POST /api/webhooks/n8n
Recebe eventos de automação do n8n. Protegido por **assinatura HMAC** no
header `X-Evok-Signature`, validada contra `req.rawBody` (corpo bruto
capturado antes do parse JSON, ver `server/app.ts`).

**Response (202):** `{ "success": true, "accepted": true, "event": "...", "duplicate": false }`
(`duplicate: true` quando o `event_id` já foi processado antes — idempotência).

**Erros:**
| Status | Condição |
|--------|----------|
| 400 | Assinatura ausente (`MISSING_SIGNATURE`) ou payload sem `event_id` (`MISSING_EVENT_ID`) |
| 401 | Assinatura inválida (`INVALID_SIGNATURE`) |
| 503 | Webhook não configurado no ambiente (`WEBHOOK_SECRET_NOT_CONFIGURED`) |
| 500 | Erro inesperado ao processar |

### POST /api/webhooks/focus-nfe
Notificação assíncrona de mudança de status de NF-e do provedor Focus NFe.
Protegido por segredo compartilhado no header `X-Webhook-Secret`
(`FOCUS_NFE_WEBHOOK_SECRET`), **não** por HMAC (a Focus NFe não assina o
corpo por padrão). O payload recebido só extrai a referência (`ref`) — o
status real da NF-e é **sempre reconsultado diretamente na API do
provedor**, nunca aplicado cegamente do corpo do webhook.

**Erros:** `401` (segredo inválido/ausente no header), `503` (secret não
configurado no ambiente), `500`/`error.statusCode` (erro ao reconsultar).

---

## 29. Auditor Inteligente

Módulo `server/src/modules/intelligentAuditor/`, base URL `/api/auditor`.
**RBAC legado**, exclusivo de `authorize('admin')` nas 4 rotas — auditoria
de consistência de dados de todo o sistema, não escopado a um módulo/área.

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/auditor/stock` | Audita consistência de estoque (ex.: saldo negativo, produto sem movimentação recente com saldo alto) |
| `GET` | `/api/auditor/sales` | Audita consistência de vendas |
| `GET` | `/api/auditor/purchases` | Audita compras paradas (sem movimento há muito tempo) |
| `GET` | `/api/auditor/financial` | Audita consistência financeira |

Todas retornam `{ success: true, data: { ... } }`, sem paginação — cada
`AuditXUseCase` agrega achados num objeto único (formato específico por
domínio; ver os quatro use cases em
`server/src/modules/intelligentAuditor/application/use-cases/`).

---

## 30. Centros de Trabalho

Módulo `server/src/modules/workCenters/`, base URL `/api/work-centers`.
`authorizeModule('centros_de_trabalho', ...)`: leituras `view` implícito,
escritas `operate`. Base do cálculo de OEE (seção 7) e do MRP de
capacidade finita (roadmap P2).

### GET /api/work-centers/load?days=
**Registrada ANTES de `GET /:id`** para não ser capturada pelo parâmetro
posicional. Relatório de carga-máquina por centro de trabalho ativo, para
os próximos `days` dias (1 a 60, default 7).

### GET /api/work-centers?active=&page=&limit=
Lista paginada, com turnos (`work_center_shifts`) incluídos.

### GET /api/work-centers/:id
Detalhe, com turnos incluídos.

### POST /api/work-centers
Cria um centro de trabalho (409 se `code` duplicado).

**Request:**
```json
{
  "code": "CNC-02",
  "name": "Corte CNC 2",
  "description": "Segunda máquina de corte CNC",
  "machines_count": 1,
  "capacity_hours_per_day": 16,
  "efficiency_factor": 0.9,
  "cost_per_hour": 85.50
}
```
`capacity_hours_per_day` (0 a 24) e `efficiency_factor` (0 a 1) alimentam
diretamente o fallback de cálculo de `available_hours` do OEE (seção 7)
quando o centro não tem turnos cadastrados.

`cost_per_hour` (0 a 1.000.000, default `0`) — **novo em 2026-08-10 (gap G4)**.
Custo de mão de obra + operação por hora produtiva, em BRL/h. É a **base do
custeio real de mão de obra** na conclusão da OP: cada etapa de apontamento
concluída soma `horas apontadas × cost_per_hour` do centro da sua etapa de
roteiro. A coluna existia desde o custeio real, mas os schemas eram `.strict()`
e não a aceitavam — só dava para alterá-la por SQL direto. Isso virou
impedimento quando a conclusão da OP passou a exigir taxa horária resolvível
(`G4-LABOR-RATE-MISSING`, seção 10): uma regra bloqueante precisa de caminho de
remediação pelo próprio sistema.

O valor `0` é aceito na entrada (centro sem custo atribuído); recusá-lo é
decisão da regra de negócio na conclusão da OP, não da validação de payload.

> **Pendência conhecida:** o fallback global
> `production_cost_settings.default_labor_rate_per_hour` — usado por etapas de
> apontamento **sem** centro de trabalho — continua **sem nenhuma API**. Ver
> `docs/governance/TODO.md`.

### PUT /api/work-centers/:id
Atualiza campos (todos opcionais, incluindo `cost_per_hour` e `active`).

### PUT /api/work-centers/:id/shifts
Substitui integralmente os turnos do centro (transacional).

**Request:**
```json
{
  "shifts": [
    { "weekday": 1, "start_time": "07:00", "end_time": "17:00" },
    { "weekday": 2, "start_time": "07:00", "end_time": "17:00" }
  ]
}
```
`weekday`: 0 (domingo) a 6 (sábado). `start_time`/`end_time`: formato
`HH:MM` (24h). Enviar `shifts: []` remove todos os turnos do centro (volta
a usar o fallback `capacity_hours_per_day` no cálculo de OEE).

---

## 31. Itens (Item Mestre Industrial)

Módulo `server/src/modules/items/`, base URL `/api/items`. É o cadastro
mestre canônico usado por BOM/MRP/rastreabilidade (`CLAUDE.md` §4, "Item
Core Intocado + Extensões"), **distinto** de `/api/products` (schema
legado, seção 3) — os dois convivem durante a migração Product→Item (ver
`docs/governance/HANDOFF_CODEX.md`). `authorizeModule('produtos', ...)`: leituras
`view` implícito, escritas `operate`. Todos os campos numéricos de
estoque/custo são `DECIMAL(18,6)`, expostos como **string** no JSON (não
`number` — evita perda de precisão de ponto flutuante em quantidades
industriais), ex.: `"estoque_atual": "100.000000"`.

### GET /api/items?page=&limit=&search=&tipo=&status=
Lista paginada. `tipo`: `MATERIA_PRIMA`/`SUBCONJUNTO`/`PRODUTO_ACABADO`/
`USO_E_CONSUMO`/`ATIVO_IMOBILIZADO`. `status`: `ATIVO`/`INATIVO`/
`BLOQUEADO`.

### POST /api/items
Cria um item.

**Request:**
```json
{
  "codigo": "BOB-8POL",
  "descricao": "Bobina 8 polegadas",
  "tipo": "MATERIA_PRIMA",
  "unidade": "un",
  "estoque_seguranca": 50,
  "lote_minimo": 100,
  "lead_time_dias": 15,
  "custo_padrao": 12.5,
  "fornecedor_padrao_id": 7,
  "conversao_automatica": false
}
```
`codigo` é único. `fornecedor_padrao_id` (FK → `suppliers.id`, INTEGER —
ver nota de BREAKING CHANGE 2026-08-06 na seção 3, Produtos) é opcional e
aceita `null`. `conversao_automatica` (opcional, default `false`):
opt-in do fechamento automático de ciclo do MRP (seção 13, UC-24b).

### PATCH /api/items/:id
Atualiza parcialmente o cadastro (todos os campos opcionais, exceto
`codigo`/`tipo`/`unidade`, que não são editáveis por este endpoint).

### PATCH /api/items/:id/inactivate (e alias DELETE /api/items/:id)
Inativa (soft delete, `status → INATIVO`) um item, com verificação de
vínculos ativos (BOM, OP, movimentos, lotes, MRP). **Erro (422)** — item
tem dependência ativa que impede a inativação (`BusinessRuleError`, com
`details` listando o(s) vínculo(s) encontrado(s)).

### POST /api/items/:id/estrutura
Cria uma ligação de estrutura (BOM do item mestre — distinto de
`/api/engineering/bom`, seção 9, que opera sobre `products`).

**Request:** `{ "item_componente_id": "uuid", "quantidade": 2, "perda_percentual": 5, "nivel": 1 }`
(`item_pai_id` vem sempre de `:id` da rota; `criado_por` vem de `req.user.id`.)

### GET /api/items/:id/estrutura/explode?quantity=&due_date=
Explode a estrutura do item para a quantidade informada.

### Catálogo Item × Fornecedor (`/api/items/:id/suppliers`)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/items/:id/suppliers` | Lista fornecedores vinculados ao item (catálogo N:N) |
| `POST` | `/api/items/:id/suppliers` | Cria vínculo item×fornecedor |
| `PUT` | `/api/items/:id/suppliers/:linkId` | Atualiza campos comerciais do vínculo |
| `DELETE` | `/api/items/:id/suppliers/:linkId` | Desativa (soft delete) o vínculo |
| `GET` | `/api/items/:id/purchase-history` | Histórico de compras do item, agregado por fornecedor |

**Request (`POST /suppliers`):**
```json
{
  "supplier_id": 7,
  "unit_price": 12.5,
  "currency": "BRL",
  "lead_time_days": 15,
  "moq": 100,
  "supplier_item_code": "FX-BOB8",
  "preferred": true,
  "notes": "Fornecedor homologado desde 2024"
}
```
Se `preferred: true`, zera o preferencial dos demais vínculos ativos do
mesmo item (transacional) — só pode haver 1 fornecedor preferencial por
item, usado como sugestão automática em `POST /api/mrp/planned-orders/convert`
(seção 13) e em `POST /api/purchase-requisitions/:id/convert` (seção 15).

---

## 32. Importação / COMEX

**(Seção adicionada em 2026-08-06 — módulo novo, UC-19.)** Módulo
`server/src/modules/comex/`, base URL `/api/comex/import-processes`.
`authorizeModule('comex', ...)`: leituras aceitam qualquer nível
atribuído ao módulo, escritas exigem `operate`. Reaproveita o cadastro de
`Supplier` existente (sem campo dedicado de "fornecedor estrangeiro").
Todos os valores monetários calculados (`customs_value`, `ii_value`,
`ipi_value`, `pis_value`, `cofins_value`, `icms_value`,
`nationalized_unit_cost`) são `DECIMAL(18,6)`. **Tela web:**
`/purchases/comex` (menu Compras → Importação (Comex)) — cobre o ciclo
completo, incluindo o gate de aprovação abaixo (o bloco "Aprovação da
diretoria" consome exclusivamente `GET /:id/approvals`, nunca infere estado a
partir de tentativa de escrita).

**Alterado em 2026-08-10 (G11-COMEX, decisão D-G do dono do produto):** o
módulo deixou de ter "um único ator sem etapa de aprovação". O G11 (seção
11) colocou a alçada da diretoria sobre o pedido de compra — importação
exigindo `diretor` em qualquer valor —, mas `import_processes` é um fluxo
**paralelo**, que nunca vira `purchase_orders`; com todas as escritas em
`comex:operate`, uma importação de R$ 1 milhão registrada aqui embarcava
sem passar por ninguém. Agora **a diretoria aprova antes do embarque**
(2 rotas novas abaixo, tabela `import_process_approvals`).

Máquina de status: `draft →(gate da diretoria)→ shipped → arrived →
customs_cleared → received | cancelled` (marcos de acompanhamento
gravados em `shipped_at`/`arrived_at`/`customs_cleared_at`/`received_at`).

### GET /api/comex/import-processes
Lista paginada.

**Query Params:** `page`, `limit` (máx. 100), `status`
(`draft`/`shipped`/`arrived`/`customs_cleared`/`received`/`cancelled`),
`supplier_id`. Cada item retorna `items` (com `item: { codigo, descricao
}`), `supplier`, `createdBy`.

### GET /api/comex/import-processes/:id
Detalhe completo — todos os itens com tributos calculados.

### POST /api/comex/import-processes
Cria o processo (`status` nasce `draft`); tributos de cada item já são
calculados na criação (estimativa inicial, pode mudar se câmbio/frete
forem atualizados depois via `/tracking`).

**Request:**
```json
{
  "supplier_id": 12,
  "fob_currency": "USD",
  "exchange_rate": 5.35,
  "freight_value": 1500.00,
  "insurance_value": 200.00,
  "other_expenses_value": 0,
  "notes": "opcional",
  "items": [
    {
      "item_id": "uuid-do-item",
      "quantity": 1000,
      "fob_unit_price": 4.20,
      "ii_rate": 60,
      "ipi_rate": 8,
      "pis_rate": 2.1,
      "cofins_rate": 9.65,
      "icms_rate": 18
    }
  ]
}
```
`supplier_id` inteiro positivo obrigatório. `fob_currency` 3 letras
maiúsculas (default `USD`). `exchange_rate` positivo (default `1`).
`freight_value`/`insurance_value`/`other_expenses_value` não-negativos
(default `0`). `items` exige ao menos 1 item; `item_id` é UUID
(`items.id`); `quantity`/`fob_unit_price` não-negativos; `ii_rate`/
`ipi_rate`/`pis_rate`/`cofins_rate`/`icms_rate` percentuais 0–100
(default `0`), informados manualmente — **sem resolução automática via
Siscomex/NCM**.

**Response (201):** processo criado com `process_number`
(`IMP-<ano>-XXXX`, sequencial por ano) e itens já com `customs_value`/
`*_value`/`nationalized_unit_cost` calculados.

### POST /api/comex/import-processes/:id/approve
**(NOVO 2026-08-10 — G11-COMEX.)** Registra **1 aprovação da diretoria**
sobre o processo. Não embarca o processo: quem embarca continua sendo
`POST /:id/tracking` com `event = 'shipped'`, que passa a exigir esta
aprovação.

**Módulo dono: `diretor`** (`authorizeModule('diretor')`) — diferente do
resto da seção. Um Analista de Comex, mesmo com `comex:approve`, **não**
consegue registrar a aprovação; `role === 'admin'` satisfaz (curto-circuito
padrão de `authorizeModule` em todo o projeto).

**Request:** sem body. `approver_user_id` vem **sempre** do JWT
(`req.user.id`) e `approver_role` é **sempre** resolvido pelo RBAC do
usuário logado (`req.user.permissions.diretor`) — nenhum dos dois é aceito
do body (regra P0 anti-spoofing; mesmo padrão de
`POST /api/purchases/:id/approve` e do Jurídico/RF-JUR-003). Qualquer
payload enviado é ignorado.

**Response (201):** `{ id, import_process_id, approver_user_id,
approver_role: "diretor", approved_at }`.

**Erros (422, todos com `error.details.rule = "G11-COMEX"`):**
- processo fora de `draft` (`details.current_status`) — aprovação
  retroativa não existe: depois do embarque o compromisso já foi assumido;
- usuário sem o papel `diretor` (`details.required_roles`);
- o papel já aprovou este processo (garantia final: UNIQUE
  `uq_import_process_approvals_process_role`).

**Erro (422, `details.rule = "D-K-COMEX"`)** — **(NOVO 2026-08-10, decisão
D-K, segregação de função)** o aprovador é o analista que registrou o
processo (`import_processes.created_by`). Verificado **antes** dos erros
acima e **sem exceção para `role: "admin"`** — ao contrário do RBAC da rota,
que continua com o curto-circuito de admin. Como este gate é o único
controle antes do embarque de uma importação, permitir auto-aprovação aqui
deixaria a importação inteira (processos citados na casa de R$ 1 milhão) sem
segunda pessoa em nenhum ponto. Nada é gravado. Ver *Segregação de função na
compra (D-K)* na seção de Compras.

**Erro (404):** processo inexistente.

### GET /api/comex/import-processes/:id/approvals
**(NOVO 2026-08-10 — G11-COMEX.)** Situação da alçada. **Somente leitura,
sem efeito colateral** — existe para a tela não precisar descobrir o estado
tentando `POST /approve` (que grava de verdade) ou tentando embarcar e
tomando 422.

**Permissão:** `comex` **OU** `diretor` (`authorizeAnyModule`) — os dois
lados precisam enxergar.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "rule": "G11-COMEX",
    "process_status": "draft",
    "gate_event": "shipped",
    "can_register_approval": true,
    "required_roles": ["diretor"],
    "approvals": [],
    "missing_roles": ["diretor"],
    "approval_complete": false
  }
}
```

### POST /api/comex/import-processes/:id/tracking
Registra o próximo marco do acompanhamento — precisa ser exatamente o
próximo da sequência `shipped → arrived → customs_cleared`; pular etapa
ou repetir dá `422`.

**Gate da diretoria no embarque (G11-COMEX, 2026-08-10):** `event =
"shipped"` só passa se a aprovação já estiver registrada. Sem ela, `422`
com `error.details = { rule: "G11-COMEX", required_roles: ["diretor"],
missing_roles: ["diretor"] }` e **nada é gravado** — nem o status, nem o
recálculo de tributos. O gate está no embarque porque é o último ponto do
ciclo em que ainda dá para desistir sem custo afundado (depois disso,
câmbio e frete já estão comprometidos). **Não há faixa de valor:**
importação é sempre da diretoria, coerente com o G11 (seção 11).

**Campos monetários congelados no embarque (mesma decisão):** no evento
`shipped`, `exchange_rate`/`freight_value`/`insurance_value`/
`other_expenses_value` são **rejeitados** (`422`, `details = { rule:
"G11-COMEX", frozen_fields: [...] }`). Sem isso, a mesma requisição que
consome a aprovação poderia inflar o valor e a diretoria teria aprovado um
processo diferente do que embarcou — o equivalente do congelamento de
`supplier_id`/`freight_value`/`origin` após `approved` no G11. Para
corrigir valores antes de embarcar, cancele e recrie o processo (mesma
regra que já valia para fornecedor e itens, que também não têm endpoint de
edição). Os eventos `arrived` e `customs_cleared` **continuam aceitando**
dados monetários — despesas aduaneiras reais (armazenagem, capatazia) só
aparecem depois e são posteriores ao compromisso.

**Request:**
```json
{
  "event": "arrived",
  "event_date": "2026-08-10",
  "exchange_rate": 5.40,
  "freight_value": 1600.00,
  "insurance_value": 200.00,
  "other_expenses_value": 50.00,
  "notes": "opcional"
}
```
`event` obrigatório (`shipped`/`arrived`/`customs_cleared`); `event_date`
opcional (`YYYY-MM-DD`). Campos monetários opcionais — se informados **em
`arrived`/`customs_cleared`**, o cabeçalho é atualizado e **todos os itens
são recalculados** na mesma chamada; em `shipped` eles são rejeitados
(ver o congelamento G11-COMEX acima) — por isso o exemplo acima usa
`arrived`. O embarque aceita apenas `event`, `event_date` e `notes`.

### POST /api/comex/import-processes/:id/receive
Sem body — o backend recalcula tudo fresco antes de dar entrada. Exige
status `customs_cleared`.

**Erro (422)** — algum item não tem um `Product` legado correspondente
(`items.codigo` sem `products.code` — mesma exigência de
`AwardRfqUseCase`/`ReceivePurchaseItemsUseCase`; o frontend deve orientar
o cadastro do produto correspondente antes).

**Sucesso:** `status → received`, `received_at` preenchido, e a entrada em
estoque passa pelo **mesmo caminho do recebimento de compra**
(`materialReceiptService.receiveMaterialIntoQuarantine`), com os 4 passos na
mesma transação:

1. `InventoryService.receive` — incrementa `Product.quantity` legado e cria o
   `InventoryMovement`;
2. **dual-write de depósito** — `WarehouseStockService.addToWarehouse` no
   depósito `INSUMOS` (o endpoint não aceita `warehouse_code`; ver JSDoc do
   use case para o critério);
3. **lote (`lot_controls`) nascendo em `quarantine`** — número
   `IMP-<ano>-XXXX-ITEM<id do item>-R001`, `supplier_id` do processo,
   `purchase_id` nulo, `received_at` = data do desembaraço. O material fica
   retido até `POST /api/inventory/lots/:id/release` (o FEFO da produção só
   consome lote `available`);
4. `CostingService.registerWeightedAverageCost` — custo nacionalizado.

**Alterado em 2026-08-09 (gap G14):** até então a importação era uma versão
degradada do recebimento — **sem lote, sem quarentena e sem dual-write de
depósito** —, ou seja, insumo importado entrava sem rastreabilidade por lote e
podia ser consumido pela produção sem nenhuma liberação de qualidade.

**Alterado em 2026-08-09 (gap G14):** `reference_type` /`source_type` passaram
de `'purchase'` para **`'import'`**. O valor antigo era dado factualmente
errado: `reference_id` aponta para `import_processes.id`, e a consulta reversa
por `(reference_type, reference_id)` devolvia um **pedido de compra alheio**
de id coincidente. O valor novo entra pela migration `20260809-000027`, que
**precisa estar aplicada** antes de subir este código (as linhas gravadas
antes dela continuam com `'purchase'` — sem backfill automático possível; o
número do processo está na `description` do movimento).

**Ainda não gera Conta a Pagar dos tributos** — pendência ligada ao **G13**
(momento de reconhecimento do passivo, Onda 3 de
`docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md`), decisão do dono
que vale para compra nacional e importação ao mesmo tempo.

### POST /api/comex/import-processes/:id/cancel
Cancela o processo.

**Request:** `{ "reason": "motivo com pelo menos 3 caracteres" }`.

**Erro (422)** — processo já `received` (bloqueado).

> Ver `docs/governance/HANDOFF_CODEX.md`, seção "UC-19 — Importação/COMEX", para o
> detalhamento completo das decisões de escopo (fórmula fiscal
> simplificada, sem AP automática de tributos, sem integração Siscomex).

---

## 33. Roteiro de Produção (Rotas de Manufatura)

**NOVO em 2026-08-10 (gap G5).** Módulo `server/src/modules/production/`
(arquivos `*ProductionRoute*`), base URL `/api/production/routes`.

As tabelas `production_routes` e `production_route_steps` **já existiam** e já
eram **lidas** pelo sistema — custeio real de mão de obra na conclusão da OP
(`ChangeProductionOrderStatusUseCase`), carga-máquina por centro de trabalho
(seção 30) e OEE (seção 7) —, mas **não tinham nenhum endpoint**: só eram
populáveis por script. Esta seção documenta a API que fechou esse buraco. Ela é
**pré-requisito** do apontamento de produção obrigatório (**G4**, Bloco K do
SPED Fiscal — ver `docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md`,
Decisão 4): exigir apontamento sem poder cadastrar roteiro seria regra
inexequível.

**RBAC** (`server/src/shared/domain/accessModules.ts`):

| Ação | Middleware |
|---|---|
| Leitura (`GET`) | `authorizeModule('producao')` (nível `operate` implícito) |
| Escrita de rascunho (`POST`, `PUT`, `POST /:id/revise`, `DELETE`) | `authorizeModule('producao', 'operate')` |
| **Liberação/aposentadoria** (`PATCH /:id/activate`, `PATCH /:id/inactivate`) | `authorizeModule('producao', 'approve')` |

`created_by` e `approved_by` vêm **sempre** de `req.user.id` (JWT) — os schemas
são `.strict()` e sequer aceitam esses campos no body (regra anti-spoofing P0).

### Ciclo de vida e imutabilidade

```
draft ──activate──> active ──(nova revisão ativada)──> superseded (final)
                      │
                      └──inactivate──> inactive ──activate──> active
```

- **`draft`** — editável à vontade (cabeçalho e etapas).
- **`active`** — **CONGELADO**. Nenhum `PUT` de cabeçalho ou de etapas é aceito
  (422 `G5-ROUTE-NOT-DRAFT`). No máximo **1 ativo por produto**, garantido em
  transação pelo use case **e** pelo índice único parcial
  `uq_production_routes_active_per_product` (migration `20260810-000034`).
- **`inactive`** — aposentado, reversível.
- **`superseded`** — substituído automaticamente quando uma revisão mais nova é
  ativada. Estado final.

**Efeito sobre OPs já abertas: nenhum.** Um roteiro liberado nunca muda; quem
precisa alterar cria uma **nova revisão** (`POST /:id/revise`), e a revisão
anterior fica `superseded` com todas as etapas intactas — continuando a servir
os apontamentos (`production_order_tracking.production_route_step_id`) que já
apontaram para ela. ⚠️ **Limitação estrutural conhecida:** não existe coluna
que amarre uma OP a uma revisão específica de roteiro (`production_orders` não
tem `production_route_id`), então relatórios derivados (carga-máquina) sempre
usam a revisão **ativa no momento da consulta**. Vincular OP → revisão na
liberação é decisão de negócio em aberto, registrada em
`docs/governance/TODO.md`.

### Códigos de regra (`error.details.rule`)

Todo erro 422/409 deste módulo carrega um código estável em `details.rule`
(catálogo em `server/src/modules/production/domain/productionRouteRules.ts`):

| Código | HTTP | Significado |
|---|---|---|
| `G5-ROUTE-NOT-DRAFT` | 422 | Escrita de conteúdo em roteiro já liberado |
| `G5-ROUTE-STATUS-TRANSITION` | 422 | Transição de status não permitida |
| `G5-ROUTE-CODE-DUP` | 409 | `route_code` já usado (único global) |
| `G5-REVISION-DUP` | 409 | Par (produto, revisão) já existe |
| `G5-PRODUCT-NOT-PRODUCIBLE` | 422 | Produto inexistente/inativo ou que não é `finished`/`semi_finished` |
| `G5-SEQ-EMPTY` | 422 | Ativação de roteiro sem nenhuma etapa |
| `G5-SEQ-DUP` | 422 | Duas etapas com a mesma `sequence` |
| `G5-SEQ-GAP` | 422 | Sequência com buraco (deve ser 1..N contígua) |
| `G5-STEP-CODE-DUP` | 422 | `step_code` repetido no mesmo roteiro |
| `G5-WC-NOT-FOUND` | 422 | `work_center_id` inexistente |
| `G5-WC-INACTIVE` | 422 | `work_center_id` existe mas está inativo |
| `G5-ROUTE-IN-USE` | 422 | Etapa já referenciada por apontamento |

### GET /api/production/routes?product_id=&status=&route_code=&search=&page=&limit=
Lista paginada (cabeçalho + produto + item), ordenada por `product_id` e
`revision` decrescente. `status` aceita `draft`/`active`/`inactive`/`superseded`.

### GET /api/production/routes/:id
Detalhe com `steps` ordenadas por `sequence`, `workCenter` de cada etapa,
`createdBy`/`approvedBy`, e os totais:

- `total_standard_time_minutes` — soma de `standard_time_minutes` das etapas
  **ativas** (tempo padrão **por unidade**);
- `total_setup_time_minutes` — **derivado na leitura**, não persistido;
- `steps_count`.

⚠️ **Setup NÃO entra no tempo padrão total**, de propósito: `setup_time_minutes`
é tempo por **lote**, e somá-lo ao tempo por unidade distorceria o OEE (mesma
convenção já documentada em `GetOeeReportUseCase`). O relatório de
carga-máquina (seção 30) soma os dois, mas lá o setup é contado **uma vez por
etapa**, não por unidade.

### POST /api/production/routes
Cria o roteiro. **Sempre nasce em `draft`**, independente do body.

**Request:**
```json
{
  "product_id": 7,
  "route_code": "ROT-ALT15",
  "revision": "00",
  "description": "Roteiro principal do alto-falante 15\"",
  "steps": [
    {
      "sequence": 1,
      "step_code": "BOB-01",
      "name": "Enrolamento da bobina",
      "work_center_id": 3,
      "standard_time_minutes": 4.5,
      "setup_time_minutes": 20,
      "instructions": "Fio 0,25mm, 42 espiras",
      "quality_check_required": true
    },
    { "sequence": 2, "step_code": "MONT-01", "name": "Montagem do conjunto móvel", "work_center_id": 5, "standard_time_minutes": 8 }
  ]
}
```

- `route_code` e `step_code` são normalizados para **uppercase/trim**;
- `revision` default `"00"`;
- `steps` é opcional (rascunho pode nascer vazio) e limitado a 200 etapas;
- `work_center_id` é **opcional** (coluna nullable, fase expand de
  `work_centers`): etapa sem centro estruturado é válida, apenas não entra na
  carga-máquina nem no custeio por hora-máquina. Quando informado, o campo
  legado `work_center` (texto) é preenchido automaticamente com o `code` do
  centro, se o cliente não mandar texto próprio;
- `item_id` (UUID, Fase 4.8 expand-contract) é resolvido automaticamente pelo
  `products.code` ⇄ `items.codigo` — **best-effort**, a ausência de Item
  equivalente não bloqueia o cadastro.

**Resposta:** `201` com o cabeçalho criado.

### PUT /api/production/routes/:id
Atualiza `route_code`, `revision` e/ou `description`. **Só em `draft`.**

### PUT /api/production/routes/:id/steps
**Substituição total** das etapas (delete + insert na mesma transação), mesmo
padrão de `PUT /api/work-centers/:id/shifts`. **Só em `draft`.**

**Request:** `{ "steps": [ ...mesmo formato de etapa do POST... ] }`

Validações antes de qualquer escrita: sequência 1..N contígua e sem repetição,
`step_code` único no roteiro, centros de trabalho existentes e ativos. Recalcula
`total_standard_time_minutes`.

**Erro (422 `G5-ROUTE-IN-USE`)** — se alguma etapa do roteiro já tiver
apontamento vinculado: apagar as etapas zeraria o vínculo do apontamento com a
operação, e com ele o custeio de mão de obra daquela OP.

### PATCH /api/production/routes/:id/activate
Libera o roteiro (`draft`/`inactive` → `active`), grava `approved_by` (JWT) e
`approved_at`, recalcula `total_standard_time_minutes` e **torna `superseded` a
revisão ativa anterior do mesmo produto**.

Revalida o conteúdo inteiro na ativação — o que **não** é redundante: entre o
rascunho e a liberação um centro de trabalho pode ter sido desativado, e um
roteiro ativo apontando para centro morto quebraria o custeio silenciosamente.

**Resposta:** `{ "success": true, "data": { ...roteiro }, "meta": { "superseded_route_id": 55 } }`
(`superseded_route_id` é `null` quando o produto ainda não tinha revisão ativa).

### PATCH /api/production/routes/:id/inactivate
`active` → `inactive`. O produto fica sem roteiro ativo até que uma revisão
nova seja liberada.

### POST /api/production/routes/:id/revise
**Caminho oficial para alterar um roteiro já liberado.** Clona cabeçalho e
etapas do roteiro de origem em um **novo rascunho**.

**Request (todos opcionais):**
```json
{ "revision": "01", "route_code": "ROT-ALT15-R01", "description": "Troca de adesivo da bobina" }
```

- `revision` ausente → sugerida como `max(revisões numéricas) + 1` com 2 dígitos;
- `route_code` ausente → derivado como `<code de origem>-R<revisão>`.

O roteiro de origem **não é alterado aqui** — ele só vira `superseded` quando a
nova revisão for **ativada**.

**Resposta:** `201` com o rascunho criado.

### DELETE /api/production/routes/:id
Remove o roteiro e suas etapas. **Só rascunho nunca usado** — roteiro liberado
(ou já substituído) é histórico industrial que alimenta o custeio de OPs
concluídas e a rastreabilidade do Bloco K: não se apaga, se inativa.

**Erros:** `422 G5-ROUTE-NOT-DRAFT` (não é rascunho), `422 G5-ROUTE-IN-USE`
(há apontamento vinculado às etapas).

---

## 34. Plano Mestre de Produção (MPS)

**NOVO em 2026-08-10 (gap G17, decisão D-F do dono do produto).** Módulo
`server/src/modules/masterProduction/`, base URL
`/api/production/master-plans`.

É a camada de decisão que faltava entre a **carteira de pedidos** e a **ordem
de produção**. Até aqui, confirmar uma venda não produzia efeito nenhum na
fábrica (`ChangeSaleStatusUseCase` apenas reserva estoque, G9) e o MRP só
calculava contra a demanda **digitada no payload**
(`GenerateMrpPlanUseCase` → `input.demands`): ninguém lia a carteira aberta e
ninguém tratava o estoque mínimo como demanda.

> ⚠️ **Não existe geração automática de OP na confirmação da venda, e isso é
> deliberado.** A decisão D-F registrou que existe PCP formal — há quem
> planeje. O sistema consolida a informação, **uma pessoa decide**, e a decisão
> registrada é o que gera a ordem. A linha do plano nasce `pending` com
> `planned_quantity = 0` mesmo quando a sugestão calculada é positiva.

**RBAC** (`server/src/shared/domain/accessModules.ts`):

| Ação | Middleware |
|---|---|
| Leitura (`GET`) | `authorizeModule('mrp')` (nível `operate` implícito) |
| Todas as escritas | `authorizeModule('mrp', 'operate')` |

O caminho é de produção, mas o **ator é o PCP** — o mesmo que opera o MRP e
converte ordem planejada em OP (`POST /api/mrp/planned-orders/convert-to-production`,
também `mrp:operate`). Nenhuma rota exige `approve`: alçada do PCP é política
de governança que o dono não definiu (pendência em `docs/governance/TODO.md`).

`planner_id`, `firmed_by`, `released_by`, `canceled_by` e `decided_by` vêm
**sempre** de `req.user.id` (JWT), nunca do body — regra anti-spoofing P0.

### Ciclo de vida

```
draft ──firm──> firm ──release──> released (terminal)
  │              │
  └──cancel──────┴──> canceled (terminal)
```

- **`draft`** — demanda consolidada; linhas editáveis pelo planejador.
- **`firm`** — decisão **congelada**; nenhuma linha muda mais (422).
- **`released`** — OPs geradas.

### A conta do plano

```
necessidade líquida = max(0,
    (carteira de pedidos + estoque mínimo + previsão manual)
  − (saldo de planejamento + saldo a produzir das OPs abertas))
```

| Componente | Origem no banco |
|---|---|
| `demand_sales_orders` | `Σ (sale_items.quantity − invoiced_quantity)` das vendas `confirmed`/`partially_invoiced` |
| `demand_safety_stock` | `products.min_quantity` |
| `demand_forecast` | informado manualmente no payload (não existe entidade de forecast) |
| `supply_on_hand` | `max(0, products.quantity − retido em quarentena/bloqueio − reservado)` |
| `supply_in_production` | `Σ max(0, quantity − quantity_produced)` das OPs `planned`/`released`/`in_progress`/`paused` |

O saldo usado é o **saldo de planejamento**, idêntico ao imposto pelo G7 ao MRP
e à disponibilidade de OP: material em quarentena (não inspecionado) e material
reservado por OP/venda (G3/G9) **não** contam como disponíveis.
`supply_withheld` e `supply_reserved` ficam gravados na linha para que o número
seja auditável sem refazer a conta.

`suggested_quantity` (cálculo) e `planned_quantity` (decisão do humano) são
colunas **distintas** e a primeira nunca é sobrescrita.

### Códigos de regra (`error.details.rule`)

Todo erro 400/404/422 deste módulo carrega `details.rule = "G17"`, junto de
`field` (erros de validação) ou do contexto do bloqueio.

### GET /api/production/master-plans
Lista planos. Query: `status` (`draft|firm|released|canceled`), `page`,
`limit` (teto 100). `status` fora do ENUM → `400` com `details.rule = "G17"`.

### GET /api/production/master-plans/:id
Plano com `lines` (produto e OP gerada incluídos) e um bloco `summary`
agregado: `total_lines`, `pending_lines`, `planned_lines`, `dismissed_lines`,
`released_lines`, `total_suggested_quantity`, `total_planned_quantity`.

### POST /api/production/master-plans
Consolida a demanda do horizonte e abre o plano em `draft`.

```json
{
  "horizon_start": "2026-08-10",
  "horizon_end": "2026-09-10",
  "notes": "Plano mestre de setembro",
  "forecast_demands": [{ "product_id": 25, "quantity": 120 }]
}
```

- `horizon_start`/`horizon_end` são **obrigatórios** e não têm default:
  horizonte de planejamento é política de PCP que o dono não definiu.
- `forecast_demands` é opcional — é a única forma de previsão no ERP hoje.

**Resposta:** `201` com `{ plan, lines, skipped }`. `skipped` lista produtos
que **têm demanda mas o plano mestre não planeja** (`not_manufactured` —
componente/matéria-prima, que é necessidade de compra e cabe ao MRP →
Requisição; `inactive_product`). A omissão é explícita, nunca silenciosa.

**Erros:** `400` horizonte ausente/mal formado/invertido ou previsão inválida
(`details.field`); `422` quando não há demanda nenhuma a planejar — e nesse
caso **nada é gravado**.

### PATCH /api/production/master-plans/:id/lines/:lineId
Registra a **decisão do planejador** sobre uma linha. Só em plano `draft`.

```json
{ "planned_quantity": 800, "due_date": "2026-09-05", "notes": "sobe p/ lote cheio" }
```
ou
```json
{ "dismiss": true, "notes": "cobertura suficiente" }
```

- `planned_quantity > 0` → linha vira `planned`;
- `planned_quantity = 0` ou `dismiss: true` → linha vira `dismissed`.
  `dismissed` é informação diferente de `pending`: significa que **alguém
  olhou e decidiu não produzir**.
- Informar `planned_quantity` **e** `dismiss` juntos → `400` (decisões opostas).

**Erros:** `404` plano/linha inexistente ou linha de outro plano; `422` plano
já firmado (`details.status`); `400` payload sem decisão.

### POST /api/production/master-plans/:id/firm
Congela a decisão (`draft → firm`).

**Erro `422`:** plano sem **nenhuma** linha `planned` com quantidade positiva —
`details.decided_lines = 0`. Um plano em que ninguém decidiu nada não é um
plano.

### POST /api/production/master-plans/:id/release
Gera as **Ordens de Produção** das linhas decididas (`firm → released`).
Exige plano `firm`.

Cada linha `planned` com quantidade positiva vira **uma OP**:

| Campo da OP | Valor |
|---|---|
| `order_number` | `OP-YYYY-NNNN` pelo repositório serializado (advisory lock + `MAX`, G16) |
| `product_id` / `quantity` / `due_date` | da linha |
| `status` | `planned` |
| `sales_order_id` | **`NULL` de propósito** — a demanda é consolidada de vários pedidos; apontar um só seria rastreabilidade falsa |
| `created_by` | `req.user.id` |

O **rastro de origem** fica em `master_production_plan_lines.production_order_id`:
da OP se chega à linha, ao plano, ao planejador e à demanda que a justificou.

**Validações — as mesmas dos outros dois caminhos de criação de OP** (para não
recriar a divergência de rigor que o G16 fechou): produto ativo, tipo
`finished`/`semi_finished`, **BOM ativa** (G2) e material mínimo disponível.

**Erro `422`:** a liberação é **tudo ou nada**. Todos os bloqueios são
coletados antes de qualquer escrita e devolvidos em `details.blocked_lines`,
com `reason` ∈ `product_not_found | inactive_product | not_manufactured |
no_active_bom | insufficient_material` (+ `max_possible_quantity` e
`missing_items` neste último). **Nenhuma OP é criada** e o status do plano não
muda.

**Resposta:** `201` com `{ plan, production_orders, released_lines }`.

### POST /api/production/master-plans/:id/cancel
Cancela o plano (`draft|firm → canceled`). Body opcional: `{ "reason": "..." }`.
Não desfaz OPs já geradas — plano `released` é terminal e não cancela.

### Limitações conhecidas

- **A carteira de pedidos não tem data de entrega prometida** (`sales` não tem
  coluna de prazo). A demanda é consolidada por produto no horizonte inteiro,
  **sem baldes de tempo**; um MPS semanal de verdade depende dessa coluna.
- **Não há entidade de previsão de vendas** — só a previsão digitada no
  payload.
- **Não há replanejamento automático:** o plano é uma fotografia
  (`consolidated_at`); pedido que chega depois entra no próximo plano.
- `BomService.checkAvailability` **não participa da transação** e a reserva de
  material só ocorre quando a OP vai a `released` — duas linhas do mesmo plano
  que consomem o mesmo componente são avaliadas de forma independente (mesma
  limitação já existente no caminho do MRP).

---

## 35. Diretoria — Organograma, Planejamento Estratégico, Atas e Riscos

**NOVO em 2026-08-12.** Módulo `server/src/modules/directorate/`, base URL
`/api/directorate`. Cobre `docs/administrativo/01-DIRETORIA.md`: a
hierarquia CEO→diretorias→departamentos (já existia desde 2026-08-11 na
tabela `directorates`, sem API até aqui), e a governança que o documento
descrevia em SQL aspiracional (Planejamento Estratégico, Atas de Reunião,
Riscos Corporativos) — agora implementada em `strategic_plannings`,
`meeting_minutes`, `business_risks`.

**RBAC** (`server/src/shared/domain/accessModules.ts`, módulo `diretoria`):

| Ação | Middleware |
|---|---|
| `GET /org-chart` | apenas `authenticate` — organograma não é segredo interno |
| Demais leituras (`GET`) | `authorizeModule('diretoria')` (nível `operate` implícito) |
| Todas as escritas | `authorizeModule('diretoria', 'approve')` — governança sensível, não operação de rotina |

`created_by`/`createdBy` e o autor do provimento de cargo vêm **sempre** de
`req.user.id` (JWT), nunca do body — regra anti-spoofing P0.

### 35.1 Organograma Executivo

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/directorate/org-chart` | Árvore CEO→diretorias→departamentos, com `manager` e `vacant` por diretoria |
| PATCH | `/api/directorate/directorates/:id/manager` | Prove (`manager_id: number`) ou vaga (`manager_id: null`) o cargo de diretor |

`GET /org-chart` resposta:

```json
{
  "success": true,
  "data": {
    "directorates": [
      {
        "id": 2, "code": "SUP", "name": "Suprimentos & Logística",
        "position_title": "Diretor de Suprimentos & Logística",
        "manager": null, "vacant": true,
        "departments": [
          { "id": 7, "code": "07", "name": "Compras", "sigla": "COMP" }
        ]
      }
    ]
  }
}
```

`PATCH /directorates/:id/manager` — `{ "manager_id": 42 }` ou
`{ "manager_id": null }`. Recusa (422, `DIRETORIA-CARGO-VAGO`) prover
funcionário com `status !== 'active'`; recusa (404) diretoria ou funcionário
inexistente.

### 35.2 Planejamento Estratégico

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/directorate/strategic-plannings` | Lista paginada. Filtros: `year`, `directorate_id`, `department_id`, `status` |
| GET | `/api/directorate/strategic-plannings/:id` | Busca por id |
| POST | `/api/directorate/strategic-plannings` | Cria objetivo estratégico anual |
| PUT | `/api/directorate/strategic-plannings/:id` | Atualiza campos do plano (exceto `actual_value`) |
| PATCH | `/api/directorate/strategic-plannings/:id/actual` | Registra o valor REALIZADO |

`POST` payload:

```json
{
  "year": 2026,
  "objective": "Reduzir CPV em 8%",
  "directorate_id": 3,
  "kpi": "CPV / faturamento",
  "target_value": 8,
  "weight": 30,
  "status": "in_progress",
  "responsible_id": 12
}
```

- `directorate_id` e `department_id` são **mutuamente exclusivos** (422 se os
  dois vierem preenchidos) — `NULL` nos dois é objetivo da empresa inteira.
- `PATCH .../actual` (`{ "actual_value": 1200 }`) deriva `status`
  automaticamente quando `target_value` está preenchido: `achieved` se
  realizado ≥ meta, senão `in_progress`. Sem `target_value`, `status` não é
  alterado automaticamente — use `PUT` para forçar `not_achieved`.

### 35.3 Atas de Reunião

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/directorate/meeting-minutes` | Lista paginada. Filtros: `meeting_type`, `from`, `to` (`YYYY-MM-DD`) |
| GET | `/api/directorate/meeting-minutes/:id` | Busca por id |
| POST | `/api/directorate/meeting-minutes` | Registra uma ata |

> ⚠️ **Não existe `PUT`/`DELETE` de conteúdo, por desenho.** Ata é registro
> de governança imutável após criação — se está errada, registra-se uma ata
> retificadora nova via `POST`. `PUT`/`DELETE` em `/meeting-minutes/:id`
> retornam 404 (rota inexistente).

`POST` payload:

```json
{
  "meeting_date": "2026-08-01",
  "meeting_type": "directors",
  "title": "Reunião de Diretoria — agosto/2026",
  "participants": "CEO, Diretor Industrial, Diretor Comercial",
  "summary": "Revisão de indicadores do mês.",
  "decisions": ["Aprovar orçamento 2027"],
  "action_items": ["Diretor Financeiro: enviar planilha até 15/08"]
}
```

`meeting_type`: `directors | commercial | industrial | financial | board | general`.
`meeting_date` não pode estar no futuro (422) — a ata registra uma reunião
que já ocorreu.

### 35.4 Riscos Corporativos

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/directorate/business-risks` | Lista paginada. Filtros: `status`, `risk_category` |
| GET | `/api/directorate/business-risks/:id` | Busca por id |
| POST | `/api/directorate/business-risks` | Registra um risco |
| PUT | `/api/directorate/business-risks/:id` | Atualiza um risco |

`POST` payload:

```json
{
  "risk_category": "supply",
  "description": "Fornecedor único de bobina de voz (MP-057)",
  "probability": "high",
  "impact": "critical",
  "mitigation_actions": "Qualificar segundo fornecedor",
  "contingency_plan": "Estoque de segurança de 60 dias",
  "responsible_id": 12,
  "review_date": "2026-12-01"
}
```

> ⚠️ **`risk_score` nunca é aceito do payload.** Os schemas Zod de
> criação/atualização (`.strict()`) nem declaram o campo — enviá-lo é
> REJEITADO com 400, não silenciosamente ignorado. `risk_score` é sempre
> `probability × impact` calculado no servidor (`low=1, medium=2, high=3,
> critical=4`, escala 1–16). Em `PUT`, mudar `probability` e/ou `impact`
> recalcula automaticamente.

`risk_category`: `operational | financial | market | regulatory | reputation | supply`.
`probability`/`impact`: `low | medium | high | critical`.
`status`: `active | mitigated | accepted | closed` (default `active`).

---

## Códigos de Erro

| Código | Significado |
|--------|-------------|
| 400 | Bad Request - Dados inválidos |
| 401 | Unauthorized - Token ausente ou inválido |
| 403 | Forbidden - Sem permissão |
| 404 | Not Found - Recurso não encontrado |
| 409 | Conflict - Duplicidade (CPF, email, etc) |
| 422 | Unprocessable Entity - Validação |
| 500 | Internal Server Error |

---

## Exemplos de Uso (cURL)

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@evokaudio.com.br","password":"123456"}'
```

### Listar Clientes (autenticado)
```bash
curl http://localhost:5000/api/clients?page=1&limit=10 \
  -H "Authorization: Bearer <token>"
```

### Criar Venda
```bash
curl -X POST http://localhost:5000/api/sales \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "customer_id": 1,
    "items": [{"product_id": 1, "quantity": 2, "unit_price": 599.90}],
    "payment_method": "pix",
    "installments": 1
  }'
