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
  "notes": "Cliente desde 2023"
}
```

### PUT /api/clients/:id
Atualiza os dados de um cliente.

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
> transacao) para debitar estoque, e `server/src/shared/utils/money.ts`
> (toCents/fromCents) para o calculo em centavos das parcelas geradas em
> AccountReceivable (ultima parcela absorve o resto da divisao). Erros de
> validacao/regra de negocio retornam `{ success: false, error: { code,
> message } }` (em vez de string simples, mesmo padrao ja adotado em
> `inventory`/`bom`/`production`/`purchases`). Ver
> `server/src/modules/sales/README.md` para detalhes, incluindo a
> pendencia conhecida de reserva de estoque em orcamentos (`quote`).

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
    "accounts_receivable": [
      {
        "installment": 1,
        "amount": 413.23,
        "due_date": "2024-02-15"
      },
      {
        "installment": 2,
        "amount": 413.23,
        "due_date": "2024-03-15"
      },
      {
        "installment": 3,
        "amount": 413.24,
        "due_date": "2024-04-15"
      }
    ]
  }
}
```

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

### PUT /api/sales/:id/items
**(Novo, 2026-08-06)** Gap 2/3 do módulo `sales` ("Alteração de pedido",
`docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`). Substitui **todo** o conjunto de
itens de uma venda (não é um PATCH incremental) — `authorizeModule('vendas',
'operate')`. Implementado em `EditSaleItemsUseCase.ts`.

Permitido apenas com a venda em `quote` ou `confirmed`. A partir de
`partially_invoiced`/`invoiced`/`shipped`/`canceled` retorna **422**
`BUSINESS_RULE_VIOLATION` com `details.status` — a venda já tem NF-e
emitida (total ou parcial) ou já foi encerrada. Em `quote` nada foi
debitado do estoque ainda; em `confirmed`, o estoque já debitado na
confirmação é ajustado (delta por produto) na mesma transação.

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
cujo `sale_item_id` não aparecer no payload é removida (com restauração
de estoque, se aplicável). `product_id` duplicado no payload é rejeitado
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

**Risco residual documentado (não bloqueante para mock/dev):**
`Sale.nfe_*` guarda apenas a NF-e **mais recente** — múltiplas emissões
parciais sobrescrevem chave/protocolo/XML uma da outra, sem histórico por
emissão. Não há tabela `sale_invoices` (1 venda : N NF-e) nesta v1. Ver
`docs/governance/TODO.md`. Além disso, `GetSaleNfeStatusUseCase` (path
assíncrono de provedores reais — `focus_nfe`/`enotas`, não o mock usado em
dev) ainda **não** atualiza `invoiced_quantity`/`partially_invoiced`; só
finaliza a transição `confirmed → invoiced`. Afeta apenas o fluxo com
provedor real, não o mock.

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

### GET /api/finance/receivable
Contas a receber, com paginação.

**Query Params:** status, start_date, end_date, customer_id, page, limit

**Response:** `{ success: true, data: AccountReceivable[], pagination: { total, page, limit, totalPages } }` (cada item inclui `customer` e `sale`).

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
> negócio, entidades e pendências (ex.: `reserved_quantity` ainda não
> existe no schema).

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

### POST /api/inventory/lots/:id/block
Bloqueia um lote (`quarantine`/`available` → `blocked`).
`authorizeModule('qualidade', 'approve')`. Usado pela inspeção de
recebimento e, internamente, por `CreateNonConformityUseCase` ao registrar
uma RNC vinculada a um lote (ver seção "Qualidade — Não Conformidades").

**Request:** `{ "reason": "Dimensional fora de especificação" }` (`reason` obrigatório, mínimo 3 caracteres.)

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
Ao transicionar para `completed`, consome os componentes da BOM ativa do produto (se houver) e dá entrada do produto acabado no estoque, em uma única transação com lock pessimista.

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

### PUT /api/purchases/:id
Atualiza campos permitidos (`expected_date`, `freight_type`, `freight_value`, `notes`, `supplier_id`). Só permitido enquanto o pedido está `pending` ou `approved`.

### PUT /api/purchases/:id/status
Altera o status conforme a máquina de estados `pending → approved → sent → partial/received/canceled`.
```json
{ "status": "approved" }
```
Ao transicionar para `approved`, gera automaticamente uma `AccountPayable` vinculada ao pedido (idempotente), em uma única transação com o `save()` do status.

### POST /api/purchases/:id/receive
Registra o recebimento (total ou parcial) dos itens do pedido. Só permitido enquanto o pedido está `sent` ou `partial`.
```json
{
  "items": [
    { "item_id": 7, "quantity": 60 }
  ]
}
```
Cada item não pode exceder a quantidade pendente (`quantity - received_quantity`). Dá entrada no estoque via `InventoryService.receive` (lock pessimista + transação) e atualiza o status do pedido e dos itens.

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
  "notes": "Fornecedor de bobinas"
}
```
`company_name` e `cnpj` são obrigatórios. O CNPJ é validado (dígito verificador) e salvo sem formatação (apenas dígitos). `rating` é sempre `3` e `status` sempre `"active"` na criação. CNPJ duplicado retorna `409`.

### PUT /api/suppliers/:id
Atualiza campos cadastrais (`company_name`, `trade_name`, `ie`, `phone`, `email`, `cep`, `street`, `number`, `complement`, `neighborhood`, `city`, `state`, `contact_name`, `contact_phone`, `payment_terms`, `delivery_time`, `rating`, `notes`). Não permite alterar `cnpj` nem `status` por este endpoint.

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
```json
{
  "demands": [
    { "item_id": "uuid-item", "quantidade": 100, "data_necessidade": "2026-08-20", "origem": "PEDIDO_VENDA" }
  ]
}
```
`origem` aceita `MANUAL`, `PEDIDO_VENDA`, `PREVISAO`, `ORDEM_PRODUCAO`. Retorna `201` com a lista de ordens planejadas geradas (`necessidade_bruta`, `estoque_disponivel`, `necessidade_liquida`, `quantidade_planejada`, `status` inicial `RASCUNHO`, ou `EM_EXECUCAO` para as convertidas automaticamente — ver abaixo).

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
      "requisition_number": "RQ-1723123456789",
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

Máquina de status: `draft → pending → approved → ordered` (`partial`,
`received`, `canceled` também possíveis conforme o fluxo de conversão/
recebimento do pedido de compra gerado).

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

**Response (201):** requisição criada com `requisition_number` (`RQ-<timestamp>`).

### PATCH /api/purchase-requisitions/:id/status
Transiciona o status: `draft → pending/canceled`, `pending → approved/canceled`.

**Request:** `{ "status": "approved" }` (enum: `approved`/`canceled`/`pending`).

**Erro (403)** — aprovar (`status: "approved"`) sem nível `approve` em
`requisicoes` nem `role: admin` (`ForbiddenError`, checagem redundante rota
+ controller, ver nota acima).

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
Atualiza campos da RNC (análise de causa raiz, ação corretiva, etc.). Se
o payload fechar a RNC, `closed_by` vem de `req.user.id`.

### DELETE /api/quality/non-conformities/:id
Fecha (soft delete lógico, `status → closed`) uma RNC.
`authorizeModule('qualidade', 'approve')`.

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
domínio; ver `server/src/modules/intelligentAuditor/README.md`).

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
  "efficiency_factor": 0.9
}
```
`capacity_hours_per_day` (0 a 24) e `efficiency_factor` (0 a 1) alimentam
diretamente o fallback de cálculo de `available_hours` do OEE (seção 7)
quando o centro não tem turnos cadastrados.

### PUT /api/work-centers/:id
Atualiza campos (todos opcionais, incluindo `active`).

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
atribuído ao módulo, escritas exigem `operate` — **sem etapa de
`approve`** (diferente da adjudicação de RFQ, seção 11.1): o UC-19 define
um único ator (Analista de Comex). Reaproveita o cadastro de `Supplier`
existente (sem campo dedicado de "fornecedor estrangeiro"). Todos os
valores monetários calculados (`customs_value`, `ii_value`, `ipi_value`,
`pis_value`, `cofins_value`, `icms_value`, `nationalized_unit_cost`) são
`DECIMAL(18,6)`. **Sem tela web ainda** — próxima rodada de frontend.

Máquina de status: `draft → shipped → arrived → customs_cleared →
received | cancelled` (marcos de acompanhamento gravados em
`shipped_at`/`arrived_at`/`customs_cleared_at`/`received_at`).

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

### POST /api/comex/import-processes/:id/tracking
Registra o próximo marco do acompanhamento — precisa ser exatamente o
próximo da sequência `shipped → arrived → customs_cleared`; pular etapa
ou repetir dá `422`.

**Request:**
```json
{
  "event": "shipped",
  "event_date": "2026-08-10",
  "exchange_rate": 5.40,
  "freight_value": 1600.00,
  "insurance_value": 200.00,
  "other_expenses_value": 50.00,
  "notes": "opcional"
}
```
`event` obrigatório (`shipped`/`arrived`/`customs_cleared`); `event_date`
opcional (`YYYY-MM-DD`). Campos monetários opcionais — se informados, o
cabeçalho é atualizado e **todos os itens são recalculados** na mesma
chamada.

### POST /api/comex/import-processes/:id/receive
Sem body — o backend recalcula tudo fresco antes de dar entrada. Exige
status `customs_cleared`.

**Erro (422)** — algum item não tem um `Product` legado correspondente
(`items.codigo` sem `products.code` — mesma exigência de
`AwardRfqUseCase`/`ReceivePurchaseItemsUseCase`; o frontend deve orientar
o cadastro do produto correspondente antes).

**Sucesso:** `status → received`, `received_at` preenchido, entrada no
estoque via `InventoryService.receive` (incrementa `Product.quantity`
legado + cria `InventoryMovement` com `reference_type`/`source_type` =
`'purchase'`, rastreabilidade específica via `reference_id`/`source_id` =
`import_processes.id`) e custo médio via
`CostingService.registerWeightedAverageCost`.

### POST /api/comex/import-processes/:id/cancel
Cancela o processo.

**Request:** `{ "reason": "motivo com pelo menos 3 caracteres" }`.

**Erro (422)** — processo já `received` (bloqueado).

> Ver `docs/governance/HANDOFF_CODEX.md`, seção "UC-19 — Importação/COMEX", para o
> detalhamento completo das decisões de escopo (fórmula fiscal
> simplificada, sem AP automática de tributos, sem integração Siscomex).

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
