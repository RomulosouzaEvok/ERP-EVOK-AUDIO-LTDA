# T-32 — CLIENT: TRANSVERSAIS, ACESSO E MÓDULOS MENORES

**Run:** `ERP-LEGACY-001-AUD-001` · **Célula:** `C-133` · **AUDIT_COMMIT:**
`c1311a6f76b512fef893f7e60d934179cae3409f`
Nenhum arquivo alterado, nenhum comando executado.

> **Nota de persistência.** Agente titular sem emissão de arquivo. Persistido pelo orquestrador
> **sem alteração**.

## 1. As páginas fora da divisão por subdiretório — respondido

`client/src/pages/` tem exatamente **8 arquivos `.tsx` na raiz** (7 páginas + 1 teste):

| # | Arquivo | Rota | Guard |
|---|---|---|---|
| 1 | `LoginPage.tsx` | `/login` | pública |
| 2 | `ForgotPasswordPage.tsx` | `/forgot-password` | pública |
| 3 | `ResetPasswordPage.tsx` | `/reset-password` | pública |
| 4 | `ChangePasswordPage.tsx` | `/change-password` | só `ProtectedRoute` (`App.tsx:135-142`) |
| 5 | `AccessDeniedPage.tsx` | — | renderizada por `ModuleRoute`/`AnyModuleRoute`/`AppLayout` |
| 6 | `NotFoundPage.tsx` | `*` no layout autenticado (`App.tsx:671-678`) |
| 7 | `DashboardPage.tsx` | **órfã** — `/dashboard` é `executive/CommandCenterPage` (`App.tsx:111-119`) |
| — | `LoginPage.test.tsx` | teste |

**Não há subdiretório órfão** — a diferença de contagem vem destas 7 páginas de raiz mais arquivos
`.test.tsx` contados como `.tsx`. Escopo efetivo: **37 páginas + 11 widgets + `widgetRegistry` +
`useHandoffs`**, mais os transversais que governam todas elas.

## 2. Resposta à pergunta central sobre a Regra 24

**O `client/` web tem o mesmo desenho de `mobile/` e `tv/` (T-29): NÃO viola a Regra 24.** Provado
nos dois lados:

- **Origem do papel:** `AuthContext.tsx:106-114` (bootstrap via `GET /api/auth/me`) e `:116-124`
  (`login()` usa o `user` da resposta). O papel **nunca** é digitado, escolhido ou reconstruído no
  cliente.
- **Persistência:** `httpClient.ts:3-18` — o `localStorage` guarda **apenas o token**; `user.role`
  vive só em estado React (`AuthContext.tsx:60`), evaporando no reload.
- **Devolução ao servidor:** o interceptor envia **somente** `Authorization: Bearer <token>`
  (`httpClient.ts:40-46`). Varredura de `client/src/api/**` por `role:`/`isAdmin`/`userRole`/`perfil`:
  nenhuma requisição carrega o papel *do requisitante*. O único `role` enviado é o do
  **usuário-alvo** em `POST/PUT /api/users` (`api/users.ts:20,36`), endpoint `authorize('admin')`
  (`users.ts:16-17`) com validação de domínio em `CreateUserUseCase.ts:43`.
- **Releitura por request:** `middlewares/auth.ts:77-126` — `User.findByPk` a cada `authenticate`,
  com `role`, `active`, `passwordVersion` e a matriz vindos do banco, nunca do payload do JWT (que
  só carrega `id` + `passwordVersion`, `:17-22`).

## 3. Findings `PROPOSED`

### `T32-TRV-F01` — MEDIUM · Gate de escrita por `role` legado contra autorização por módulo/nível

7 telas decidem escrita com `hasRole(...)`, papel que o servidor **não usa** nesses endpoints. As
duas direções quebram:

- **UI mais restritiva que o servidor:** usuário `role='operator'` com perfil `contabilidade:approve`
  é contador legítimo pela matriz; `EntriesTab.tsx:49` o deixa em somente-leitura, embora
  `accounting.ts:41-44` aceite `POST/post/reverse` dele. **O provisionamento correto não produz a
  tela correta.**
- **UI mais permissiva:** `FinancialOperationsTab.tsx:47-48` define `canApprove` igual a `canWrite`;
  um `role='financial'` com `tesouraria:operate` vê "liquidar"/"cancelar" e recebe 403
  `APPROVAL_LEVEL_REQUIRED` (`treasury.ts:48-49`). **O nível `approve` — a espinha do modelo de
  alçada — é invisível ao cliente nestas telas.**

Âncoras cliente: `EntriesTab.tsx:49`; `ChartOfAccountsTab.tsx:33`; `BankAccountsTab.tsx:32`;
`FinancialOperationsTab.tsx:47-48`; `BudgetLinesTab.tsx:41`; `MaintenanceOrdersTab.tsx:74-75`;
`ServiceOrdersTab.tsx:71-72`; `AssetsPage.tsx:99`; `DepartmentRequisitionsPage.tsx:90`.
Servidor: `accounting.ts:35-44`; `treasury.ts:40-49`; `budget.ts:37-39`; `maintenance.ts:21-23`;
`serviceOrders.ts:21-23`; `assets.ts:20-23`; `purchaseRequisitions.ts:23`.

O padrão correto existe no mesmo commit: `CleaningTab.tsx:29-30` e `OrgChartTab.tsx:26` leem
`permissions?.<módulo> === 'approve'`. **Não é escalação de privilégio** — o backend impõe.

### `T32-TRV-F02` — MEDIUM · Segregação departamental de requisições só existe no cliente

A tela declara "Departamento: X" (`DepartmentRequisitionsPage.tsx:154-156`) e lista só as
requisições daquele departamento — mas o recorte é um parâmetro de query que o **próprio cliente**
calcula (`useMyDepartment.ts:24-34` → `:105`). O servidor aceita `department_id` como filtro livre
(`ListPurchaseRequisitionsUseCase.ts:36,50`; `SequelizePurchaseRequisitionRepository.ts:17`) e a rota
exige apenas `authorizeModule('requisicoes')` (`:21`). **Qualquer titular do módulo lê as
requisições de todos os departamentos alterando o parâmetro.** A **criação** está correta (servidor
resolve pelo `Employee`, `CreatePurchaseRequisitionUseCase.ts:87`) — a leitura é a ponta solta.

### Demais findings

| ID | Achado | Sev. |
|---|---|---|
| `T32-TRV-F03` | Menu esconde por papel rotas que rota e backend liberam por módulo — três camadas, três regras (`AppLayout.tsx:213-215` × `App.tsx:545-576` × `accounting.ts:33`, `treasury.ts:38`, `budget.ts:35`). Usuário `operator` com o módulo **não vê o item**, digita `/accounting` e trabalha. Repetido em `widgetRegistry.tsx:117,125` | LOW |
| `T32-TRV-F04` | `/financial`: `RoleRoute(['admin','financial'])` sobre `ModuleRoute('financeiro')` (`App.tsx:604-615`), enquanto o servidor **documenta a substituição** (`finance.ts:14-21`) e aplica só o módulo. Perfil financeiro com `role='operator'` é barrado pela UI e aceito pela API | LOW |
| `T32-TRV-F05` | `UsersPage.tsx:362-365` afirma "a mudança de perfil vale a partir do próximo login"; o servidor resolve permissões **a cada requisição** (`middlewares/auth.ts:44-48,105-112`). Quem **concede** acredita ter de esperar; quem **revoga** recebe garantia mais fraca do que a real | LOW |
| `T32-TRV-F06` | `allowed_warehouses` existe no model (`AccessProfile.ts:66-69`), no contrato de entrada e no tipo do cliente, mas **`AccessProfilesPage.tsx` não tem campo algum** — e a varredura em `server/src/` não encontra **nenhum ponto de imposição**. Confiança MÉDIA (busca estática). O `update` preserva o valor (`SequelizeAccessProfilesRepository.ts:117`) — **sem perda de dado** ao editar | LOW |
| `T32-TRV-F07` | Guards do cliente falham **abertos** em `permissionsFetchFailed` (`ProtectedRoute.tsx:66,87`; `AppLayout.tsx:375,414-419`). **Não é vulnerabilidade** — `middlewares/auth.ts:246-282` nunca falha aberto. Efeito colateral: numa falha de `/permissions`, o usuário recebe o menu completo e a Home dispara todas as queries, poluindo a trilha com 403 auditados como `access_denied` | LOW |
| `T32-TRV-F08` | `DashboardPage.tsx` órfã com JSDoc que contradiz o roteamento (`:159-163`); `AppLayout.tsx:298` ainda mantém breadcrumb da tela antiga | LOW |
| `T32-TRV-F09` | JWT em `localStorage` (`httpClient.ts:3-18`), sem `HttpOnly`. Mitigações verificadas: nenhum outro dado sensível persistido (varredura retorna **apenas** essas 3 linhas + testes), cache do React Query só em memória, papel não persistido, revogação por `passwordVersion`. Cruza `AUD-AUTHN-05` — não reauditado | LOW |

## 4. Conformidades declaradas (ausência de discrepância, com evidência)

1. **Regra 24 — `client/` web conforme** (§2). **Estende o veredito de T-29 ao terceiro app, com
   prova própria.**
2. **Administração de acesso é admin-only nos dois lados, 13/13 endpoints** (`users.ts:14-20`,
   `accessProfiles.ts:21-26`) — `/users`, `/users/access-profiles`, `/audit-logs`,
   `/settings/fiscal`, `/reports/auditor` conferidos um a um contra `auditLogs.ts:12-13`,
   `fiscal.ts:14-15`, `intelligentAuditor.ts:12-15`.
3. **Nenhum item de menu esconde rota que o backend libere a quem não deveria.** O sentido do
   desalinhamento é sempre "UI mais restritiva que o servidor" — **o oposto do vetor de escalação**.
4. **Paridade de validação** nas telas de autenticação (`min(6)` = `authValidators.ts:7,18`) e fiscal
   (`FiscalConfigPage.tsx:39-58` = `fiscalValidators.ts:31-47`).
5. **Sem regra de negócio exclusiva do cliente em cálculo financeiro**: `BudgetReportTab` e
   `CashPositionTab` apenas renderizam agregação do servidor. As únicas somas locais são
   totalizadores visuais de conferência (`EntriesTab.tsx:205-206,303-308`), explicitamente não
   bloqueantes (`:409`).
6. **Sem excesso de dado sensível**: `api/users.ts:5-14` (sem `password`), `api/auditLogs.ts:4-15`
   (sem IP/user-agent/valores antigos), `api/auth.ts:5-10` (o mínimo do cabeçalho).
7. **Erros não vazam interno**: `translateApiError.ts:20-22`; `httpClient.ts:69-78`.
8. **`{...req.body}` (T16-F04a/T18A-F09): sem vetor pelo escopo.** As telas enviam payloads
   explícitos, campo a campo (`FiscalConfigPage.tsx:149-168`; `BudgetLinesTab.tsx:232-239`;
   `DepartmentRequisitionsPage.tsx:124-134`; `EntriesTab.tsx:311-312`).

## 5. Cobertura declarada

- **Leitura integral (14):** `UsersPage`, `AccessProfilesPage`, `FiscalConfigPage`, `AuditLogsPage`,
  `HomePage`, `widgetRegistry`, `DashboardPage`, `LoginPage`, `ChangePasswordPage`,
  `ForgotPasswordPage` (60 linhas de lógica), `ResetPasswordPage` (70), `AccessDeniedPage`,
  `NotFoundPage`, `EntriesTab`.
- **Leitura dirigida à dimensão de autorização/validação (23):** demais tabs de
  `accounting`/`treasury`/`budget`/`maintenance`, `AssetsPage`, `DepartmentRequisitionsPage`,
  `TraceabilityPage`, `landing/*` e os 11 widgets — varredura sistemática por
  `hasRole|canWrite|canApprove|useAuth|permissions[`, `localStorage`, `reduce|Number(`, cruzada com
  as rotas correspondentes. **Não lidos linha a linha no corpo de renderização.**
- **Transversais lidos:** `App.tsx`, `AppLayout.tsx` (60-460), `AuthContext.tsx`,
  `ProtectedRoute.tsx`, `httpClient.ts`, `translateApiError.ts`, `useMyDepartment.ts`,
  `api/{auth,users,accessProfiles,auditLogs}.ts`.
- **Servidor:** `middlewares/auth.ts` (integral) e 20 arquivos de rota.

**Lacunas — exigiriam execução ou navegador:** prova dinâmica de F02
(`GET /api/purchase-requisitions?department_id=<outro>` com token de operador de Manutenção); as duas
direções de F01 em runtime; confirmação de que `allowed_warehouses` não é lido por caminho dinâmico
(F06, confiança MÉDIA por isso); comportamento real do fallback de F07.

**Cruzamento de mandatos:** F01 a F04 e F06 tocam autorização — reporta-se a discrepância, **não** o
veredito. Dois ponteiros fora do escopo, sem finding próprio: `client/src/api/juridico.ts:259-260` e
`client/src/api/comex.ts:177-178` expõem `approver_role` como campo de contrato — vale checar se
alguma dessas rotas o aceita vindo do cliente.

**Findings CRITICAL/HIGH nesta trilha: nenhum.** Os 9 achados são MEDIUM (2) e LOW (7), todos
`PROPOSED`.
