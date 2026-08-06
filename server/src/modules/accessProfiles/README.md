# Módulo Access Profiles

## Objetivo

Gerenciar os **Perfis de Acesso Configuráveis** por área/departamento
(UC-30 a UC-33 de `docs/business/01-USE_CASES.md`) — CRUD administrativo
completo, sempre restrito a `role='admin'`. Distinto do middleware de
autorização por módulo (`authorizeModule`, `server/src/middlewares/auth.ts`),
que **consome** os dados persistidos por este módulo em toda requisição
autenticada, e do módulo `users`, que expõe `PUT /api/users/:id/access-profile`
para atribuir um perfil já criado a um usuário.

Este módulo **não cria nenhum model/migration novos** — usa exclusivamente
`AccessProfile`/`AccessProfilePermission`, já existentes desde o Bloco 1.1
(`server/src/models/AccessProfile.ts`, `AccessProfilePermission.ts`,
`server/migrations/20260803-000008-create-access-profiles.cjs`).

## Decisão de arquitetura: onde mora o nível gestor/operador

O desenho original (`docs/governance/TODO.md` Bloco 1.1) previa uma coluna
`users.access_level` (`operador`/`gestor`) como "segunda trava" para ações
de aprovação (`BUSINESS_RULES.md` §4). Essa coluna **não existe** no
schema atual e **não foi criada** por esta entrega (fora do escopo deste
agente, que não altera migrations).

Decisão do orquestrador, aplicada em `authorizeModule`
(`server/src/middlewares/auth.ts`): o nível gestor/operador de um usuário
dentro de uma área mora no **perfil**, não no usuário. Uma linha de
`AccessProfilePermission` com `level = 'approve'` no módulo já caracteriza
qualquer usuário atribuído àquele perfil como **gestor** daquele módulo;
`level = 'operate'` caracteriza **operador**. `approve` inclui `operate`;
`operate` isolado nunca autoriza uma ação que exija `approve`. Ver a nota
de implementação em `docs/business/BUSINESS_RULES.md` §4 para o
detalhamento completo desta adaptação.

## Estrutura

```
server/src/modules/accessProfiles/
  domain/
    repositories/AccessProfilesRepository.ts   Interface do repositório
  application/
    use-cases/
      ListAccessProfilesUseCase.ts             GET /api/access-profiles
      GetAccessProfileByIdUseCase.ts            GET /api/access-profiles/:id
      CreateAccessProfileUseCase.ts             POST /api/access-profiles (UC-30)
      UpdateAccessProfileUseCase.ts             PUT /api/access-profiles/:id (UC-31)
      DeactivateAccessProfileUseCase.ts         DELETE /api/access-profiles/:id (UC-32)
      validatePermissions.ts                    Validação de forma da matriz (compartilhada create/update)
  infrastructure/
    sequelize/SequelizeAccessProfilesRepository.ts
  presentation/
    controllers/accessProfilesController.ts
    routes/accessProfiles.ts
```

A atribuição de perfil a um usuário (UC-33) vive no módulo `users`
existente (`server/src/modules/users/application/use-cases/AssignAccessProfileUseCase.ts`,
rota `PUT /api/users/:id/access-profile`) — não duplicada aqui, pois o
recurso afetado é o `User`, não o `AccessProfile`.

O endpoint de menu resolvido (UC-34, `GET /api/auth/me/permissions`) vive
no módulo `auth` (`GetMyPermissionsUseCase.ts`), pois opera sobre o
`req.user` já autenticado, sem necessidade de nova query.

## Modelos de dados utilizados

- `server/src/models/AccessProfile.ts` — `id`, `nome` (único), `descricao`,
  `allowedWarehouses` (JSONB, lista simples — `BUSINESS_RULES.md` §12
  item 11), `active` (soft delete).
- `server/src/models/AccessProfilePermission.ts` — `accessProfileId`,
  `module` (validado contra `server/src/shared/domain/accessModules.ts`),
  `level` (`'operate'|'approve'`), `UNIQUE(access_profile_id, module)`.

## Regras de negócio

- **Listagem/Busca:** retorna a matriz de permissões completa e a
  contagem de usuários **ativos** vinculados (`userCount`), para a tela
  administrativa decidir se a desativação é bloqueada.
- **Criação (UC-30):** `nome` obrigatório e único (409); `permissions`
  deve ter ao menos 1 item (422); cada `module` deve ser uma chave válida
  de `ACCESS_MODULES` (422 didático, citando `GET /api/access-profiles/modules`);
  `module` duplicado no payload é rejeitado; perfil + permissões criados
  em uma única transação Sequelize. Auditado via `logAction` (`action:
  'create'`).
- **Edição (UC-31):** mesmas validações da criação; **substitui
  integralmente** a matriz de permissões anterior (delete + bulkCreate na
  mesma transação); audita `oldValues` com a matriz **completa anterior**
  e `newValues` com a nova (`BUSINESS_RULES.md` §5).
- **Desativação (UC-32, DECIDIDO):** **bloqueia** com 422
  `BusinessRuleError` enquanto houver usuário `active=true` vinculado ao
  perfil, listando cada um (`id`, `name`, `email`) em `error.details.users`
  — o admin deve reatribuir todos via `PUT /api/users/:id/access-profile`
  antes de desativar. Só quando `count === 0` o soft delete é aplicado.

## Endpoints

Base URL: `/api/access-profiles`. Todas as rotas exigem `authenticate` +
`authorize('admin')`.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/access-profiles/modules` | Lista os 26 module keys válidos (rótulo pt-BR) |
| GET | `/api/access-profiles` | Lista perfis com permissões + `userCount` |
| GET | `/api/access-profiles/:id` | Busca um perfil por id |
| POST | `/api/access-profiles` | Cria um novo perfil (UC-30) |
| PUT | `/api/access-profiles/:id` | Edita um perfil, substitui a matriz (UC-31) |
| DELETE | `/api/access-profiles/:id` | Desativa (soft delete), bloqueado se houver usuário ativo (UC-32) |

Ver `docs/arquitetura/API.md` seção "1.2 Perfis de Acesso (Access Profiles)" para
exemplos completos de request/response, e "1. Autenticação" para
`GET /api/auth/me/permissions` e `PUT /api/users/:id/access-profile`.

## Eventos / Auditoria

`POST /`, `PUT /:id` e `DELETE /:id` chamam `logAction`
(`server/src/services/auditLogService.ts`), preservando o padrão do
restante do projeto: `create` registra `newValues` (nome/descrição/matriz);
`update` registra `oldValues`/`newValues` completos da matriz de
permissões; `deactivate` registra a transição `active: true → false`.

O middleware `authorizeModule` (`server/src/middlewares/auth.ts`) também
audita **tentativas negadas** (`action: 'access_denied'`, `entity:
'AccessProfile'`) — não é responsabilidade deste módulo, mas consome o
mesmo `AuditLog`.

## Testes existentes

`server/tests/unit/access-profiles.test.ts` cobre: middleware
`authorizeModule` (admin sempre passa, `NO_ACCESS_PROFILE`,
`MODULE_ACCESS_DENIED`, `APPROVAL_LEVEL_REQUIRED`, 401 sem `req.user`);
`CreateAccessProfileUseCase` (409 duplicado, 422 sem permissão, 422
module inválido, criação + auditoria); `UpdateAccessProfileUseCase`
(404, auditoria com matriz anterior/nova completas);
`DeactivateAccessProfileUseCase` (422 com usuários vinculados listados,
desativação bem-sucedida); `AssignAccessProfileUseCase` do módulo `users`
(auditoria de atribuição, 422 perfil inativo, 404 perfil inexistente,
remoção com `null`).

## Pendências conhecidas

- `authorizeModule` foi aplicado apenas como piloto em dois módulos
  (`laboratory`, `engineering`) nesta entrega. O retrofit dos demais
  módulos (vendas, compras, estoque, produção, qualidade, financeiro,
  patrimônio, rastreabilidade, relatórios) é tarefa própria do
  `docs/governance/TODO.md` (Bloco 1.2, item pendente).
- Seed dos 11 perfis operacionais de departamento da matriz de
  `BUSINESS_RULES.md` §1 continua pendente (Bloco 1.1, decisão do dono de
  adiar até validação de nomenclatura/UX, incluindo a pendência do módulo
  `rh`).
- Telas de frontend (Bloco 1.4: menu dinâmico, tela "Acesso Negado",
  gestão de perfis) não fazem parte desta entrega (proibido tocar em
  `client/`).
