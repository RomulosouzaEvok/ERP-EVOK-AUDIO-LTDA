# Perfis de Acesso & Governança de Usuários - Módulo Administrativo

> Documenta o que **existe de fato no código** (RBAC + Perfis de Acesso
> Configuráveis). Fonte: `server/src/shared/domain/accessModules.ts`,
> `server/src/modules/accessProfiles/`, `server/src/middlewares/auth.ts`,
> `client/src/api/accessProfiles.ts`. Casos de uso relacionados: UC-30 a
> UC-34 em `docs/business/01-USE_CASES.md`.

## Duas camadas de controle de acesso

O sistema tem **duas camadas independentes** de autorização, que atuam em
conjunto:

1. **`role` do usuário** (`admin` | `operator` | `financial`) — grosseira,
   fixa no cadastro do usuário (`users.role`). `admin` sempre passa em tudo;
   é a única role que pode gerenciar Perfis de Acesso (`authorize('admin')`
   em `server/src/modules/accessProfiles/presentation/routes/accessProfiles.ts`).
2. **Perfil de Acesso configurável** (`AccessProfile` + `AccessProfilePermission`)
   — fina, por módulo, atribuída a um usuário via
   `PUT /api/users/:id/access-profile`. Controla, módulo a módulo, se o
   usuário pode **operar** (`operate`) ou **operar + aprovar** (`approve`)
   naquela área do sistema. `authorizeModule` (`server/src/middlewares/auth.ts`)
   é o middleware que lê essa matriz em cada requisição autenticada.

Um usuário `admin` não precisa de Perfil de Acesso (passa direto). Usuários
`operator`/`financial` só enxergam/operam os módulos liberados pelo Perfil de
Acesso vinculado a eles — sem perfil vinculado, `authorizeModule` nega
(`NO_ACCESS_PROFILE`).

## O que é um Perfil de Acesso

Um Perfil de Acesso representa uma "área/departamento" de permissões (ex.:
"Almoxarifado", "Vendas Interna", "Financeiro Sênior") e é composto por:

- `nome` (único) e `descricao` opcional;
- `allowedWarehouses` — lista opcional de armazéns (`warehouse` codes) aos
  quais o perfil fica restrito (JSONB, ver `BUSINESS_RULES.md` §12 item 11);
  `null`/vazio = sem restrição de armazém;
- `active` — soft delete; um perfil desativado não pode ser atribuído a
  novos usuários (bloqueado se ainda houver usuário ativo vinculado, ver
  abaixo);
- `permissions[]` — a matriz módulo × nível, cada linha com:
  - `module`: uma das 29 chaves fixas de `AccessModuleKey` (ver tabela
    abaixo), validada contra `ACCESS_MODULE_KEYS`;
  - `level`: `'operate'` ou `'approve'`. `approve` inclui as permissões de
    `operate` no mesmo módulo; `operate` isolado nunca autoriza uma ação que
    exija `approve` (ex.: aprovar requisição de compra, aprovar pedido).

## Catálogo de módulos atribuíveis

Lista completa retornada por `GET /api/access-profiles/modules`
(`ACCESS_MODULES` em `accessModules.ts`, 29 chaves — `usuarios` e
`audit_logs` são exclusivos do `role='admin'` e nunca aparecem aqui):

| Chave (`module`) | Rótulo pt-BR |
|---|---|
| `dashboard` | Dashboard |
| `produtos` | Produtos |
| `contagens` | Contagens de Inventário |
| `vendas` | Vendas |
| `clientes` | Clientes |
| `compras` | Compras |
| `requisicoes` | Requisições de Compra |
| `fornecedores` | Fornecedores |
| `comex` | Importação (Comex) |
| `producao` | Produção |
| `bom` | Estrutura de Produtos (BOM) |
| `mrp` | MRP |
| `chao_de_fabrica` | Chão de Fábrica |
| `centros_de_trabalho` | Centros de Trabalho |
| `qualidade` | Qualidade |
| `laboratorio` | Laboratório |
| `engenharia` | Engenharia |
| `estoque` | Estoque |
| `recebimento` | Recebimento |
| `expedicao` | Expedição |
| `patrimonio` | Patrimônio |
| `manutencao` | Manutenção |
| `garantia` | Garantia/Assistência Técnica |
| `rastreabilidade` | Rastreabilidade |
| `financeiro` | Financeiro |
| `relatorios.producao` | Relatórios de Produção |
| `relatorios.compras` | Relatórios de Compras |
| `relatorios.custos` | Relatórios de Custos |
| `relatorios.financeiro` | Relatórios Financeiros |

## Como criar um Perfil de Acesso (fluxo administrativo)

1. Logado como `admin`, acessar a tela **Usuários → Perfis de Acesso**
   (frontend consome `client/src/api/accessProfiles.ts`).
2. `POST /api/access-profiles` com `nome`, `descricao` opcional e
   `permissions[]` (pelo menos 1 item obrigatório). Regras validadas pelo
   backend (`CreateAccessProfileUseCase`):
   - `nome` duplicado → `409`;
   - `permissions` vazio → `422`;
   - `module` inválido (fora do catálogo) → `422` (mensagem cita
     `GET /api/access-profiles/modules`);
   - `module` duplicado no mesmo payload → `422`;
   - perfil + matriz de permissões são criados em uma única transação.
3. Perfil criado fica disponível para atribuição a usuários.

## Como editar e vincular a um usuário

- **Editar (`PUT /api/access-profiles/:id`):** substitui **integralmente**
  a matriz de permissões anterior (delete + recria na mesma transação) —
  não é um merge incremental. Mesmas validações da criação.
- **Vincular a um usuário (UC-33):** `PUT /api/users/:id/access-profile`
  com `{ "access_profile_id": <id ou null> }`. `null` remove o vínculo
  (usuário volta a não ter nenhum módulo liberado, exceto se `role='admin'`).
  Implementado em `AssignAccessProfileUseCase` (módulo `users`, não
  `accessProfiles` — o recurso afetado é o `User`).
- **Desativar (`DELETE /api/access-profiles/:id`, UC-32):** soft delete
  **bloqueado** com `422` enquanto houver usuário `active=true` vinculado ao
  perfil (lista cada um em `error.details.users`). É preciso reatribuir
  todos os usuários (outro perfil ou `null`) antes de conseguir desativar.

## Consultar as próprias permissões (menu dinâmico)

`GET /api/auth/me/permissions` (UC-34) retorna, para o usuário autenticado:
`{ modules: { <module>: 'operate'|'approve', ... }, profile: { id, nome } | null }`.
É a base para o frontend montar o menu dinâmico e decidir o que renderizar —
mas a autorização real acontece sempre no backend (`authorizeModule`), nunca
apenas pela ausência de item de menu.

## Auditoria

Toda criação, edição e desativação de Perfil de Acesso é registrada via
`logAction` (`server/src/services/auditLogService.ts`): `create` grava a
matriz nova; `update` grava matriz anterior e nova; `deactivate` grava a
transição `active: true → false`. Tentativas de acesso negadas por
`authorizeModule` também são auditadas (`action: 'access_denied'`).

## Estado de implementação (2026-08-06)

- [IMPLEMENTADO] CRUD completo de Perfis de Acesso (`/api/access-profiles`),
  catálogo de 29 módulos, atribuição a usuário, endpoint de permissões do
  usuário logado (`/api/auth/me/permissions`).
- [IMPLEMENTADO] `authorizeModule` aplicado como piloto em dois módulos
  (`laboratory`, `engineering`).
- [PENDENTE] Retrofit de `authorizeModule` nos demais módulos (vendas,
  compras, estoque, produção, qualidade, financeiro, patrimônio,
  rastreabilidade, relatórios) — ver `docs/governance/TODO.md` Bloco 1.2.
- [PENDENTE] Seed dos perfis operacionais padrão por departamento (matriz de
  `docs/business/BUSINESS_RULES.md` §1) — adiado pelo dono do produto até
  validação de nomenclatura/UX.
- [DESCONTINUADO/NÃO IMPLEMENTADO] Coluna `users.access_level`
  (`operador`/`gestor`) prevista no design original — não existe no schema.
  O nível operador/gestor mora no **perfil** (`level` da permissão), não no
  usuário — decisão registrada em `server/src/modules/accessProfiles/README.md`.
- [PENDENTE] Telas de frontend de gestão de perfis, menu dinâmico e tela
  "Acesso Negado" — fora do escopo das entregas de backend já concluídas.

## Referências

- `server/src/modules/accessProfiles/README.md` — detalhamento técnico do módulo.
- `docs/arquitetura/API.md` § "1.2 Perfis de Acesso (Access Profiles)" — exemplos de request/response.
- `docs/business/BUSINESS_RULES.md` §1, §4, §12 — matriz de módulos e regras de aprovação.
- `docs/business/01-USE_CASES.md` UC-30 a UC-34.

---

**Última atualização:** 2026-08-06
