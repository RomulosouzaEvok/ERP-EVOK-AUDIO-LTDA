# Módulo Suppliers

## Objetivo

Gerenciar o cadastro de fornecedores da fábrica: listagem com
busca/filtro/paginação, consulta individual, criação (com validação de
CNPJ), atualização de dados cadastrais e inativação (soft delete via
`status='inactive'`), bloqueada quando o fornecedor possui pedidos de
compra pendentes. Migrado para a arquitetura em camadas (`domain` /
`application` / `infrastructure` / `presentation`) descrita na Fase 5/6 do
`docs/BLACKBOX_CRONOGRAMA_CHECKLIST.md`, seguindo o mesmo padrão dos módulos `users`, `products`,
`inventory`, `bom`, `production`, `purchases`, `sales` e `financial`.

Este módulo **não reimplementa** a validação de dígito verificador do
CNPJ: reutiliza `Validators.validateDocument`
(`server/src/utils/validators.ts`), chamada pelo use case
`CreateSupplierUseCase`, e `Validators.sanitizeSearch` para sanitizar o
termo de busca em `ListSuppliersUseCase` — mesmas funções já usadas pelo
controller anterior, sem duplicação.

## Decisão de compatibilidade de rotas

O endpoint `/api/suppliers` (mesmos 5 paths, métodos, middlewares e
formato de sucesso JSON do controller anterior) agora é servido pelas
rotas/controller deste módulo (`presentation/routes/suppliers.ts` →
`presentation/controllers/supplierController.ts`), registrado em
`server/index.ts`.

O arquivo anterior `server/src/routes/suppliers.ts` e o controller
`server/src/controllers/supplierController.ts` **permanecem no
repositório** como referência histórica, mas **não são mais montados em
nenhuma rota** — evitando duplicidade de `/api/suppliers` e o risco de
duas implementações divergentes atenderem à mesma URL. Confirmado via
`grep` que apenas `server/index.ts` monta o módulo novo
(`require('./src/modules/suppliers/presentation/routes/suppliers')`),
nenhuma outra ocorrência de `require('./src/routes/suppliers')` existe no
arquivo. Os arquivos anteriors podem ser removidos em uma limpeza futura,
uma vez confirmada a estabilidade da migração.

Nenhum client precisa mudar quanto a **sucesso**: mesmos 5 endpoints,
mesmos verbos HTTP, mesmo middleware (`authenticate` em **todas** as
rotas, sem `authorize` por papel — preservado 1:1 do anterior, que já não
restringia este módulo por role).

Uma diferença de formato existe apenas nas respostas de **erro** (mesmo
padrão já adotado nos módulos `auth`/`inventory`/`bom`/`production`/
`purchases`/`sales`/`financial`/`users` migrados anteriormente): erros de
validação/negócio agora são instâncias de `AppError`
(`server/src/errors`). Como `ValidationError`/`NotFoundError`/`ConflictError`
são subclasses de `AppError`, o `errorHandler`
(`server/src/middlewares/errorHandler.ts`) entra no primeiro branch
(`err instanceof AppError`) e devolve
`{ success: false, error: { code, message } }` — um **objeto**, não mais a
string simples usada pelo controller anterior (`{ success: false, error: "mensagem" }`).
O `statusCode` HTTP continua o mesmo em todos os casos do anterior (400, 404,
409); não há desvio de status nesta migração, só do formato do corpo de
erro (mesma mudança já documentada nos demais módulos migrados).

Mapeamento das mensagens de erro do anterior para os novos tipos de
`AppError` (mesma mensagem textual, `statusCode` preservado):

| Situação | anterior | Novo |
|---|---|---|
| Fornecedor não encontrado (`GET`/`PUT`/`DELETE :id`) | `404` string | `NotFoundError` (404) |
| `company_name`/`cnpj` ausentes na criação | `400` string | `ValidationError` (400) |
| CNPJ com dígito verificador inválido | `400` string | `ValidationError` (400) |
| CNPJ duplicado (constraint única) | `409` string | `ConflictError` (409) |
| Inativação bloqueada por compras pendentes | `400` string | `ValidationError` (400) |

## Estrutura

```
server/src/modules/suppliers/
  domain/
    entities/SupplierEntity.ts              Validação de forma na criação (company_name/cnpj obrigatórios)
    repositories/SuppliersRepository.ts     Interface do repositório
  application/
    use-cases/
      ListSuppliersUseCase.ts               Busca/filtro/paginação
      GetSupplierByIdUseCase.ts             Busca por id
      CreateSupplierUseCase.ts              Valida CNPJ via Validators.validateDocument, salva CNPJ limpo
      UpdateSupplierUseCase.ts              Atualiza campos permitidos
      DeactivateSupplierUseCase.ts          Soft delete (status='inactive'), bloqueia se houver compras pendentes
  infrastructure/
    sequelize/SequelizeSuppliersRepository.ts Implementação usando os models Supplier/Purchase existentes
  presentation/
    controllers/supplierController.ts
    routes/suppliers.ts
```

## Modelos de dados utilizados

- `server/src/models/Supplier.ts` (Sequelize, reutilizado — nenhum model
  novo foi criado por este módulo).
- `server/src/models/Purchase.ts` (usado apenas para contar pedidos de
  compra pendentes ao inativar um fornecedor; não incluído nas queries de
  listagem, mesmo comportamento do anterior).

## Regras de negócio

- **Listagem** (`list`): busca por `company_name`/`cnpj` (`LIKE`,
  sanitizada via `Validators.sanitizeSearch`), filtro exato por `status`,
  paginação (`page`/`limit`, default `1`/`10`), ordenado por
  `company_name ASC`.
- **Criação** (`create`): `company_name` e `cnpj` obrigatórios; CNPJ
  validado via `Validators.validateDocument` (dígito verificador); CNPJ
  salvo sem formatação (`replace(/[^\d]/g, '')`); `rating` sempre `3`
  (default), `status` sempre `'active'`; `delivery_time` default `15`
  dias; CNPJ duplicado retorna 409.
- **Atualização** (`update`): aceita apenas os campos cadastrais/endereço
  permitidos (`company_name`, `trade_name`, `ie`, `phone`, `email`, `cep`,
  `street`, `number`, `complement`, `neighborhood`, `city`, `state`,
  `contact_name`, `contact_phone`, `payment_terms`, `delivery_time`,
  `rating`, `notes`); não permite alterar `cnpj` nem `status` por este
  endpoint, mesmo comportamento do anterior.
- **Inativação (soft delete)** (`remove`): define `status='inactive'`;
  **bloqueia** a inativação se o fornecedor possuir pedidos de compra com
  status `pending`/`approved`/`sent`/`partial` (mensagem inclui a
  quantidade de pedidos pendentes).

## Endpoints

Base URL: `/api/suppliers`.

| Método | Rota | Middlewares | Descrição |
|---|---|---|---|
| GET | `/api/suppliers` | `authenticate` | Lista fornecedores (busca/filtro/paginação) |
| GET | `/api/suppliers/:id` | `authenticate` | Busca um fornecedor pelo id |
| POST | `/api/suppliers` | `authenticate` | Cria um novo fornecedor |
| PUT | `/api/suppliers/:id` | `authenticate` | Atualiza dados cadastrais |
| DELETE | `/api/suppliers/:id` | `authenticate` | Inativa (soft delete) um fornecedor |

Ver `docs/arquitetura/API.md` (seção "12. Fornecedores") para exemplos completos de
request/response.

## Permissões

Todas as rotas exigem apenas JWT válido (`authenticate`) — não há
`authorize` por papel neste módulo, mesma regra do controller/rotas
anteriors, sem mudança de RBAC nesta migração. RBAC mais granular está
listado como pendência na Fase 12 do `docs/BLACKBOX_CRONOGRAMA_CHECKLIST.md` ("Revisar RBAC completo"),
mesma pendência documentada nos demais módulos migrados.

## Eventos / Auditoria

**Nenhum endpoint deste módulo chama `logAction`** — o controller anterior
(`server/src/controllers/supplierController.ts`) nunca teve integração
com `auditLogService`, e este comportamento foi preservado
intencionalmente nesta migração (instrução explícita: não adicionar
auditoria que não existia). Diferente de `users`/`purchases`/`financial`,
criação, atualização e inativação de fornecedores **não geram registro em
`audit_logs`** hoje.

## Fluxo simplificado (Mermaid)

```mermaid
flowchart TD
  A[HTTP Request] --> B[supplierController]
  B --> C[Use Case]
  C -->|criacao: valida forma| D[SupplierEntity]
  C -->|criacao: valida digito verificador| E[Validators.validateDocument]
  C -->|leitura/escrita| F[SequelizeSuppliersRepository]
  F --> G[(PostgreSQL - tabela suppliers)]
  F -->|inativacao: conta compras pendentes| H[(PostgreSQL - tabela purchases)]
```

## Testes existentes

Nenhum teste automatizado existe hoje para este módulo (nem para o
restante do projeto — `server/tests/` ainda não existe). Cobertura de
testes unitários de `SupplierEntity`/use cases e testes de integração dos
5 endpoints está prevista na Fase 9 do `docs/BLACKBOX_CRONOGRAMA_CHECKLIST.md`.

## Pendências conhecidas

- **Sem auditoria (`AuditLog`)**: nenhuma escrita neste módulo (criação,
  atualização, inativação) gera registro em `audit_logs`, diferente da
  maioria dos demais módulos já migrados (`users`, `purchases`,
  `financial`, etc.). Isso já era verdade no controller anterior; recomenda-se
  avaliar a adição de `logAction` em uma iteração futura para rastreabilidade
  de alterações cadastrais de fornecedores.
- Não há `authorize` por papel neste módulo — qualquer usuário autenticado
  pode criar, atualizar ou inativar fornecedores.
- Validação de entrada é manual/via entidade (sem schema declarativo);
  migração para Zod está prevista para a Fase 8.
- O controller/rota anteriors (`server/src/controllers/supplierController.ts`,
  `server/src/routes/suppliers.ts`) foram deixados intactos no repositório
  como referência histórica, mas não são mais usados; podem ser removidos
  em limpeza futura.
