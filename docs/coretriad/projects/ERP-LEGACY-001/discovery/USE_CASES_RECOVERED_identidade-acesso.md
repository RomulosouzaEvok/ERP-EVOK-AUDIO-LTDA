# USE_CASES_RECOVERED_identidade-acesso.md — ERP-LEGACY-001, Passo 28

```
PROJECT_ID:   ERP-LEGACY-001
CLUSTER:      identidade-acesso
MÓDULOS:      auth, users, accessProfiles, auditLogs
AUDIT_COMMIT: f05e865 (HEAD real informado pelo orquestrador; não reconferido além do que o
              orquestrador declarou — nenhuma contagem/rota citada aqui vem de contexto injetado)
MÉTODO:       Read/Grep/Glob apenas. Nenhum comando executado, nenhuma conexão a banco,
              nenhum arquivo alterado. READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT.
              Módulos de PRODUÇÃO REAL (auth, users[conta admin], auditLogs) lidos SOMENTE por
              código-fonte/rota/validator — sem execução de teste ou script. accessProfiles
              (não-produção) idem, sem alteração.
REGRA 2 DO PROGRAMA: docs/projeto/04-USE_CASES.md, docs/business/01-USE_CASES.md e
              docs/arquitetura/DIAGRAMA_CASOS_DE_USO_BPMN.md são OBJETO DE AUDITORIA. O código é a
              evidência; a doc foi cruzada, nunca copiada.
RESSALVA:     Tudo abaixo é DISCOVERED_USE_CASE (recuperado do código, provisório) até validação
              humana. Nada aqui é "caso de uso oficial". IDs UC-IDACC-NN são provisórios.
```

## Método — arquivos lidos por inteiro

- Rotas: `server/src/modules/{auth,users,accessProfiles,auditLogs}/presentation/routes/*.ts`
- Middlewares de borda: `server/src/middlewares/auth.ts`, `authorizeSelfOrModule.ts`, `authorizeAnyModule.ts`
- Controllers: `authController.ts`, `userController.ts`, `accessProfilesController.ts`, `auditLogController.ts`
- Use-cases (23): todos os `modules/{auth,users,accessProfiles,auditLogs}/application/use-cases/*.ts`
- Validators/infra: `auth/presentation/validators/authValidators.ts`, `auth/infrastructure/jwt/TokenService.ts`
- Montagem de rotas: `server/app.ts:143-192` (prefixos `/api/auth`, `/api/users`, `/api/access-profiles`, `/api/audit-logs` + rate-limiters)
- Doc cruzada (objeto): `docs/projeto/04-USE_CASES.md` (UC-01, UC-10, UC-30..UC-38), `docs/business/01-USE_CASES.md` (UC-30..UC-38 draft), `docs/arquitetura/DIAGRAMA_CASOS_DE_USO_BPMN.md`
- Insumos de discovery relidos: `BUSINESS_RULE_CANDIDATES_identidade-acesso.md` (passo 26), `REQUIREMENTS_BASELINE.md` §2.1/§2.4, `CURRENT_ARCHITECTURE.md` (V2/V3, ownership auditLogs)

### Nota transversal sobre imposição de permissão (fronteira com authorization-auditor)

Todas as rotas admin deste cluster impõem `authorize('admin')` no backend (`middlewares/auth.ts:151-165`), e o `role` comparado vem de `User.findByPk` dentro de `authenticate` (`auth.ts:77-119`) — **lido do banco, não do body/token não verificado**. Logo, **nenhum caso deste cluster incorre na Regra 24 do CLAUDE.md** (role client-side). Isto é confirmação positiva, não finding. A matriz completa USER→ROLE→PERMISSION é do authorization-auditor; aqui só se verifica a permissão DECLARADA em cada UC vs. imposta na rota.

---

## Casos de uso recuperados

### Módulo `auth` (`/api/auth`, montado em `app.ts:150`)

---

**UC-IDACC-01 — Autenticar usuário (login) e emitir JWT**
- **Objetivo:** validar email/senha e devolver token JWT + dados do usuário.
- **Ator(es):** público não autenticado (rota SEM `authenticate`; qualquer um tenta). Rate-limit por IP+email (`app.ts:143`).
- **Gatilho:** `POST /api/auth/login` (`routes/auth.ts:13`).
- **Fluxo principal:** `LoginUseCase.execute` (`LoginUseCase.ts:43-82`): busca por email (`:46`) → `comparePassword` (`:55`) → checa `active` (`:64`) → gera token (`:72`, `TokenService.ts:9`) → retorna `audit` de sucesso; `authController.login` grava `logAction` (`authController.ts:38`).
- **Fluxos alternativos / exceções:** email inexistente e senha errada devolvem a MESMA mensagem `'Email ou senha incorretos'` (`:48-62`) → 401; usuário inativo → `'Usuário inativo. Contate o administrador.'` (`:64-70`) → 401. **Toda falha carrega `error.audit` e é auditada** (`authController.ts:42-44`).
- **Pré/pós e invariantes:** pós = sessão com token de 7d (JWT_EXPIRE); invariante: token embute `passwordVersion` (SEC-10). Login é o ÚNICO fluxo do cluster que audita FALHA.
- **BRs:** BR-IAM-010 (não-enumeração; inativo observável), BR-IAM-011 (auditoria de falha), BR-IAM-003/005 (passwordVersion/TTL).
- **Rastreabilidade vs. doc:** **CONFIRMED** — UC-01 (`04-USE_CASES.md:13-27`). Ressalva menor: UC-01 lista ator "Administrador, Operador, Financeiro"; o código não restringe papel no login (qualquer usuário ativo). UC-01 não menciona auditoria de falha (que existe).

---

**UC-IDACC-02 — Renovar token de sessão (renovação deslizante)**
- **Objetivo:** reemitir JWT com TTL renovado sem redigitar credenciais (painel TV).
- **Ator(es):** qualquer usuário autenticado (`authenticate`, `routes/auth.ts:14`).
- **Gatilho:** `POST /api/auth/refresh` (`routes/auth.ts:14`).
- **Fluxo principal:** `RefreshTokenUseCase.execute` (`RefreshTokenUseCase.ts:47-50`) reemite com o MESMO `passwordVersion` já validado por `authenticate` (`authController.ts:71`).
- **Exceções:** token expirado → 401 em `authenticate` (`auth.ts:131-133`); não há refresh-token separado.
- **Invariantes:** token renovado preserva `id`+`passwordVersion` (SEC-10 continua válido).
- **BRs:** BR-IAM-006, BR-IAM-005.
- **Rastreabilidade vs. doc:** **FANTASMA** — implementado e testado (`auth-refresh.test.ts`), com requisito `RF-AUT-02` e regra `BR-IAM-006`, mas **NÃO há UC** no catálogo (`04-USE_CASES.md`/`01-USE_CASES.md` não descrevem refresh). Lacuna de rastreabilidade UC↔código.

---

**UC-IDACC-03 — Registrar usuário via `auth/register`**
- **Objetivo:** admin cria usuário por dentro do módulo auth.
- **Ator(es):** Administrador Global — `authenticate` + `authorize('admin')` (`routes/auth.ts:15`).
- **Gatilho:** `POST /api/auth/register` (`routes/auth.ts:15`).
- **Fluxo principal:** `RegisterUserUseCase.execute` (`RegisterUserUseCase.ts:40-58`): `RegisterUserEntity` valida forma → `createUser` (role default `'operator'`, `:49`) → 201.
- **Exceções:** email duplicado → `ConflictError 'Email já cadastrado'` (`:52-55`). **`role` NÃO é validado contra VALID_ROLES aqui** (só o ENUM do Postgres barra → 500 genérico) — BR-IAM-015.
- **Invariantes tocadas:** senha vira hash bcrypt (hook do model). **NÃO chama `logAction`** — único handler de escrita do módulo auth sem auditoria (BR-IAM-026).
- **BRs:** BR-IAM-013 (admin-only), BR-IAM-015 (role sem validação), BR-IAM-026 (sem auditoria), BR-IAM-002 (min 6).
- **Rastreabilidade vs. doc:** **FANTASMA / CONFLITANTE** — nenhum UC descreve `auth/register`; sobrepõe `POST /api/users` (UC-IDACC-11 / UC-10) com mesma entidade e autoridade, mas **auditoria assimétrica** (register não audita, `POST /api/users` audita). Candidato a finding (BR-IAM-026).

---

**UC-IDACC-04 — Consultar próprio usuário (me)**
- **Objetivo:** devolver dados do usuário autenticado (sem `password`).
- **Ator(es):** qualquer usuário autenticado (`routes/auth.ts:16`).
- **Gatilho:** `GET /api/auth/me` (`routes/auth.ts:16`).
- **Fluxo principal:** `GetMeUseCase.execute` (`GetMeUseCase.ts:27-29`) → `findUserById`.
- **Exceções:** retorna `null` se não encontrado (sem 404 explícito no use-case).
- **Invariantes:** `toJSON`/`exclude:['password']` nunca serializa segredo (BR-IAM-032).
- **BRs:** BR-IAM-032.
- **Rastreabilidade vs. doc:** **FANTASMA** — sem UC próprio (usado indiretamente por testes de sessão). Lacuna de rastreabilidade.

---

**UC-IDACC-05 — Consultar próprias permissões (menu resolvido)**
- **Objetivo:** devolver o mapa `module→nível` + perfil para o frontend montar o menu.
- **Ator(es):** qualquer usuário autenticado (`routes/auth.ts:17`).
- **Gatilho:** `GET /api/auth/me/permissions` (`routes/auth.ts:17`).
- **Fluxo principal:** `GetMyPermissionsUseCase.execute` (`GetMyPermissionsUseCase.ts:36-52`): admin recebe todos os 26 módulos em `'approve'` (`:37-46`); não-admin recebe `req.user.permissions` já resolvido por `authenticate` (`auth.ts:105-112`), **sem query adicional**.
- **Exceções:** usuário sem perfil → `modules = {}`, `profile = null` (UC-35-Exceção).
- **BRs:** BR-IAM-019 (admin curto-circuito), BR-IAM-035 (sem query extra), BR-IAM-020.
- **Rastreabilidade vs. doc:** **CONFIRMED** vs. SSOT — UC-34 (`04-USE_CASES.md:1618-1634`) cita exatamente `GET /api/auth/me/permissions`. **CONFLITANTE vs. draft histórico**: `01-USE_CASES.md:279-282` propõe `GET /api/auth/me/menu` (endpoint que **não existe** no código) — ver OBSOLETE_CANDIDATE OC-1.

---

**UC-IDACC-06 — Trocar a própria senha (autenticada)**
- **Objetivo:** usuário troca a própria senha e invalida sessões anteriores.
- **Ator(es):** qualquer usuário autenticado (`routes/auth.ts:18`).
- **Gatilho:** `PUT /api/auth/change-password` (`routes/auth.ts:18`).
- **Fluxo principal:** `ChangePasswordUseCase.execute` (`ChangePasswordUseCase.ts:43-64`) em transação: `findUserByIdWithPasswordForUpdate` → confere senha atual (`:50`) → nova ≠ atual (`:55-58`) → salva (incrementa `passwordVersion` no hook). `authController.changePassword` audita (`authController.ts:163`).
- **Exceções:** usuário inexistente → 404 (`:46-48`); senha atual errada → 401 (`:51-53`); nova = atual → `ValidationError` (`:55-58`). Validação Zod `newPassword min(6)` (`authValidators.ts:7`).
- **Invariantes:** SEC-09 + SEC-10 (invalidação de sessão via `passwordVersion`).
- **BRs:** BR-IAM-004 (nova≠atual — só existe aqui), BR-IAM-003, BR-IAM-002.
- **Rastreabilidade vs. doc:** **FANTASMA** — comportamento com refs SEC-09/SEC-10 e `API.md`, mas **sem UC** no catálogo. Lacuna de rastreabilidade. (BR-IAM-004 só está neste caminho, não no reset — UC-IDACC-08.)

---

**UC-IDACC-07 — Solicitar recuperação de senha**
- **Objetivo:** iniciar reset por email sem revelar existência de conta.
- **Ator(es):** público não autenticado (rota SEM `authenticate`, rate-limited `app.ts:146`).
- **Gatilho:** `POST /api/auth/forgot-password` (`routes/auth.ts:19`).
- **Fluxo principal:** `ForgotPasswordUseCase.execute` (`ForgotPasswordUseCase.ts:38-60`): busca por email; se existe e ativo, gera token 32 bytes, guarda só SHA-256 com TTL 1h (`:45-50`), envia email. Sempre responde mensagem genérica (`authController.ts:199-202`).
- **Exceções:** email inexistente/inativo → `return` silencioso (`:41-43`) → mesma resposta (anti-enumeração).
- **Invariantes:** token nunca persistido em texto plano; `toJSON` nunca serializa o hash.
- **BRs:** BR-IAM-008 (SEC-12).
- **Rastreabilidade vs. doc:** **FANTASMA** — documentado em `API.md`/SEC-12, **sem UC**. Lacuna de rastreabilidade.

---

**UC-IDACC-08 — Redefinir senha com token de recuperação**
- **Objetivo:** concluir o reset validando token de uso único.
- **Ator(es):** público não autenticado com token (rate-limited `app.ts:147`).
- **Gatilho:** `POST /api/auth/reset-password` (`routes/auth.ts:20`).
- **Fluxo principal:** `ResetPasswordUseCase.execute` (`ResetPasswordUseCase.ts:44-61`) em transação: hash do token → `findUserByResetTokenHash` → valida expiração (`:50`) → grava nova senha → limpa token (`:55-56`). `authController` audita (`authController.ts:229`).
- **Exceções:** token inválido/expirado/já usado → `UnauthorizedError` → **HTTP 401** (`:51`). **NÃO aplica "nova ≠ atual"** (BR-IAM-004 ausente aqui — pode-se redefinir para a mesma senha). Zod `token min(32)`, `newPassword min(6)` (`authValidators.ts:17-18`).
- **Invariantes:** SEC-10 (incrementa `passwordVersion` no hook).
- **BRs:** BR-IAM-008/009, BR-IAM-004 (ausente).
- **Rastreabilidade vs. doc:** **FANTASMA + CONFLITANTE** — sem UC; e `API.md:274-275` documenta erro **422** para token inválido, mas código+teste usam **401** (BR-IAM-009, `password-recovery-and-session-revocation.test.ts:76`). Divergência doc-de-API × código.

---

### Módulo `users` (`/api/users`, montado em `app.ts:151`) — todas as rotas `authenticate` + `authorize('admin')`

---

**UC-IDACC-09 — Listar usuários (busca/filtro/paginação)**
- **Ator(es):** Administrador Global (`routes/users.ts:14`).
- **Gatilho:** `GET /api/users` (`routes/users.ts:14`).
- **Fluxo principal:** `ListUsersUseCase.execute` (`ListUsersUseCase.ts:28-41`): parse page/limit/search/role/active → `repository.list`.
- **Exceções:** nenhuma além de authz (403 se não admin).
- **BRs:** BR-IAM-013.
- **Rastreabilidade vs. doc:** **CONFLITANTE (parcial)** — coberto de forma vaga por UC-10 (`04-USE_CASES.md:234-244`), que não descreve listagem/filtro nem contrato de resposta. Ver CF-2.

---

**UC-IDACC-10 — Consultar usuário por id**
- **Ator(es):** Administrador Global (`routes/users.ts:15`).
- **Gatilho:** `GET /api/users/:id` (`routes/users.ts:15`).
- **Fluxo principal:** `GetUserByIdUseCase.execute` (`GetUserByIdUseCase.ts:25-31`) → 404 `'Usuário não encontrado'` se ausente.
- **BRs:** BR-IAM-013, BR-IAM-032.
- **Rastreabilidade vs. doc:** **CONFLITANTE (parcial)** — subsumido em UC-10 sem detalhamento. Ver CF-2.

---

**UC-IDACC-11 — Criar usuário**
- **Ator(es):** Administrador Global (`routes/users.ts:16`).
- **Gatilho:** `POST /api/users` (`routes/users.ts:16`).
- **Fluxo principal:** `CreateUserUseCase.execute` (`CreateUserUseCase.ts:40-72`): `RegisterUserEntity` valida forma → **valida `role` contra `VALID_ROLES`** (`:43-45`) → cria → **audita `logAction`** (`:62`).
- **Exceções:** role inválido → `ValidationError` (`:43-45`); email duplicado → `ConflictError` (`:55-59`).
- **Invariantes:** senha bcrypt (hook); role default `'operator'`.
- **BRs:** BR-IAM-013, BR-IAM-015 (aqui SIM valida), BR-IAM-017, BR-IAM-002.
- **Rastreabilidade vs. doc:** **CONFLITANTE (parcial)** — UC-10 menciona "Cadastra novo usuário" mas não o contrato, nem a validação de role, nem a auditoria. Sobreposição não resolvida com UC-IDACC-03 (`auth/register`), que faz o mesmo sem validar role e sem auditar. Ver CF-2/CF-4.

---

**UC-IDACC-12 — Atualizar usuário**
- **Ator(es):** Administrador Global (`routes/users.ts:17`).
- **Gatilho:** `PUT /api/users/:id` (`routes/users.ts:17`).
- **Fluxo principal:** `UpdateUserUseCase.execute` (`UpdateUserUseCase.ts:39-84`): `UpdateUserEntity` (bloqueia troca de senha; valida email) → `findById` (404) → atualiza `name/email/role/active` → audita com `oldValues`/`newValues` (`:73`).
- **Exceções:** `password` presente → `ValidationError` (BR-IAM-016); email duplicado → `ConflictError`; id inexistente → 404.
- **Invariantes tocadas / RISCO:** aceita `active` como campo atualizável e **NÃO recebe `currentUserId`** (`userController.ts:96-105` não repassa `req.user.id`). Isso permite `PUT /api/users/<meu-id> {active:false}` — **contorno da proibição de auto-inativação** que o `DELETE` bloqueia (BR-IAM-014); `role` NÃO validado contra VALID_ROLES neste caminho (BR-IAM-015).
- **BRs:** BR-IAM-013, BR-IAM-014 (contorno), BR-IAM-015 (ausente), BR-IAM-016, BR-IAM-017.
- **Rastreabilidade vs. doc:** **CONFLITANTE** — UC-10 fala "inativa usuário" mas nenhum doc descreve que o PUT também inativa nem a proteção de auto-inativação. Regra única (não auto-inativar) com **duas implementações divergentes** (DELETE bloqueia, PUT não). Candidato a finding (BR-IAM-014, HIGH).

---

**UC-IDACC-13 — Inativar usuário (soft delete)**
- **Ator(es):** Administrador Global (`routes/users.ts:18`).
- **Gatilho:** `DELETE /api/users/:id` (`routes/users.ts:18`).
- **Fluxo principal:** `DeactivateUserUseCase.execute` (`DeactivateUserUseCase.ts:31-57`): **bloqueia auto-inativação** `if (id === currentUserId)` (`:32-34`) → `findById` (404) → `update {active:false}` → audita `soft_delete` (`:46`).
- **Exceções:** auto-inativação → `BusinessRuleError` (`:32-34`); id inexistente → 404.
- **Invariantes:** soft delete permanente (sem política de expurgo — BR-IAM-034).
- **BRs:** BR-IAM-013, BR-IAM-014 (regra imposta AQUI, contornável no PUT — UC-IDACC-12).
- **Rastreabilidade vs. doc:** **CONFLITANTE (parcial)** — UC-10 cita "inativa usuário" sem a regra de auto-inativação. Ver CF-2 e BR-IAM-014.

---

**UC-IDACC-14 — Revogar sessões de um usuário (emergencial)**
- **Ator(es):** Administrador Global (`routes/users.ts:19`).
- **Gatilho:** `POST /api/users/:id/revoke-sessions` (`routes/users.ts:19`).
- **Fluxo principal:** `RevokeUserSessionsUseCase.execute` (`RevokeUserSessionsUseCase.ts:28-45`): `findById` (404) → `incrementPasswordVersion` (invalida todos os JWT) → audita (`:36`).
- **Exceções:** id inexistente → 404.
- **Invariantes:** SEC-12; não altera/exige senha atual.
- **BRs:** BR-IAM-012.
- **Rastreabilidade vs. doc:** **FANTASMA** — implementado e testado (`password-recovery-and-session-revocation.test.ts:116`), **nenhum UC/BR documental** o descreve. Lacuna de rastreabilidade.

---

**UC-IDACC-15 — Atribuir/remover perfil de acesso de usuário**
- **Ator(es):** Administrador Global (`routes/users.ts:20`).
- **Gatilho:** `PUT /api/users/:id/access-profile` (`routes/users.ts:20`).
- **Fluxo principal:** `AssignAccessProfileUseCase.execute` (`AssignAccessProfileUseCase.ts:50-82`): `findById` usuário (404) → se `accessProfileId` não-nulo, valida perfil existe (404) e ativo (`:56-66`) → `update` substitui atribuição → audita `assign`/`UserAccessAssignment` com old/new (`:71`).
- **Exceções:** usuário inexistente → 404; perfil inexistente → 404; perfil inativo → `BusinessRuleError` (422); `null` remove a atribuição.
- **Invariantes:** um perfil por usuário (coluna única); **não** invalida sessão (UC-36). Nova permissão vale na próxima requisição de API (authorizeModule relê banco).
- **BRs:** BR-IAM-018, BR-IAM-023 (perfil inativo não atribuível), BR-IAM-022.
- **Rastreabilidade vs. doc:** **CONFIRMED com divergência de mensagem** — UC-33 (`04-USE_CASES.md:1595-1614`) bate no fluxo/exceções. Porém a mensagem de auditoria "efetivo no próximo login, UC-36" (`:78`) é **falsa para a API** (que passa a valer no request seguinte, sem cache) — o log comunica ao auditor regra diferente da aplicada (BR-IAM-022). Candidato a finding (MEDIUM).

---

### Módulo `accessProfiles` (`/api/access-profiles`, montado em `app.ts:152`) — todas `authenticate` + `authorize('admin')`

---

**UC-IDACC-16 — Listar módulos atribuíveis**
- **Ator(es):** Administrador Global (`routes/accessProfiles.ts:21`).
- **Gatilho:** `GET /api/access-profiles/modules` (`routes/accessProfiles.ts:21`, registrada ANTES de `/:id` para não colidir).
- **Fluxo principal:** `accessProfilesController.listModules` devolve `ACCESS_MODULES` estático (`controller:43-49`), fonte única compartilhada com `authorizeModule`.
- **BRs:** BR-IAM-021 (a lista de módulos e níveis suportados — só `operate|approve`).
- **Rastreabilidade vs. doc:** **CONFIRMED (suporte)** — referenciada como passo do UC-30 (`04-USE_CASES.md:1537-1539`), sem UC próprio de leitura (aceitável).

---

**UC-IDACC-17 — Listar perfis de acesso (com matriz e contagem de usuários)**
- **Ator(es):** Administrador Global (`routes/accessProfiles.ts:22`).
- **Gatilho:** `GET /api/access-profiles` (`routes/accessProfiles.ts:22`).
- **Fluxo principal:** `ListAccessProfilesUseCase.execute` (`ListAccessProfilesUseCase.ts:19-21`) → lista com permissões + `userCount`.
- **BRs:** BR-IAM-023/024.
- **Rastreabilidade vs. doc:** **CONFIRMED (parcial)** — apoia UC-30/UC-32; sem UC de leitura dedicado (aceitável).

---

**UC-IDACC-18 — Consultar perfil de acesso por id**
- **Ator(es):** Administrador Global (`routes/accessProfiles.ts:23`).
- **Gatilho:** `GET /api/access-profiles/:id` (`routes/accessProfiles.ts:23`).
- **Fluxo principal:** `GetAccessProfileByIdUseCase.execute` (`GetAccessProfileByIdUseCase.ts:27-33`) → 404 se ausente.
- **Rastreabilidade vs. doc:** **CONFIRMED (parcial)** — sem UC de leitura dedicado (aceitável).

---

**UC-IDACC-19 — Criar perfil de acesso**
- **Ator(es):** Administrador Global (`routes/accessProfiles.ts:24`; comentário `routes:9-11` reforça: CRUD de perfil é exclusivo do admin, nunca delegado a perfil de área).
- **Gatilho:** `POST /api/access-profiles` (`routes/accessProfiles.ts:24`).
- **Fluxo principal:** `CreateAccessProfileUseCase.execute` (`CreateAccessProfileUseCase.ts:47-74`): valida `nome` obrigatório (`:48-51`) → `validatePermissions` (`:53`, `validatePermissions.ts:13-39`) → checa nome duplicado (`:55-58`) → cria perfil+permissões em transação → audita `create` (`:65`).
- **Exceções:** nome vazio/permissões inválidas/módulo inválido/duplicado → `ValidationError` (422); nome duplicado → `ConflictError` (409); não-admin → 403.
- **Invariantes:** níveis restritos a `operate|approve` (`validatePermissions.ts:28-30`) — **não existe nível somente-leitura** (BR-IAM-021); unicidade `(access_profile_id, module)`.
- **BRs:** BR-IAM-024, BR-IAM-021 (2 níveis × 4 documentados), BR-IAM-013.
- **Rastreabilidade vs. doc:** **CONFIRMED com CONFLITO de níveis** — fluxo/exceções batem com UC-30 (`04-USE_CASES.md:1527-1546`). Porém `BUSINESS_RULES.md §1/§4` documenta 4 níveis (`-/V/O/A`) e o código só cadastra 2 (`operate|approve`) — acesso somente-leitura é inexprimível (BR-IAM-021, candidato a finding HIGH).

---

**UC-IDACC-20 — Editar perfil de acesso (substitui a matriz)**
- **Ator(es):** Administrador Global (`routes/accessProfiles.ts:25`).
- **Gatilho:** `PUT /api/access-profiles/:id` (`routes/accessProfiles.ts:25`).
- **Fluxo principal:** `UpdateAccessProfileUseCase.execute` (`UpdateAccessProfileUseCase.ts:49-89`): `findById` (404) → valida nome único excluindo o próprio id (`:55-65`) → `validatePermissions` → update em transação → audita com **matriz anterior completa** em `oldValues` (`:78-86`).
- **Exceções:** perfil inexistente → 404; nome vazio/permissões inválidas → 422; nome colidente → 409.
- **Invariantes:** efeito imediato na API (authorizeModule relê banco a cada request, sem cache).
- **BRs:** BR-IAM-024, BR-IAM-025 (auditoria com old/new completos).
- **Rastreabilidade vs. doc:** **CONFIRMED** — UC-31 (`04-USE_CASES.md:1552-1570`).

---

**UC-IDACC-21 — Desativar perfil de acesso (soft delete)**
- **Ator(es):** Administrador Global (`routes/accessProfiles.ts:26`).
- **Gatilho:** `DELETE /api/access-profiles/:id` (`routes/accessProfiles.ts:26`).
- **Fluxo principal:** `DeactivateAccessProfileUseCase.execute` (`DeactivateAccessProfileUseCase.ts:45-72`): `findById` (404) → `countActiveUsers` (`:51`) → se `count>0` bloqueia com `BusinessRuleError` 422 listando usuários afetados (`:52-57`) → senão `deactivate` + audita (`:61`).
- **Exceções:** perfil inexistente → 404; perfil em uso → 422 com `details.users`/`userCount`.
- **Invariantes:** perfil em uso não pode ser desativado (BR-IAM-023).
- **BRs:** BR-IAM-023.
- **Rastreabilidade vs. doc:** **CONFIRMED** — UC-32 (`04-USE_CASES.md:1574-1591`), inclusive o 422 com lista de afetados.

---

### Módulo `auditLogs` (`/api/audit-logs`, montado em `app.ts:192`) — todas `authenticate` + `authorize('admin')`

---

**UC-IDACC-22 — Listar logs de auditoria (filtros/paginação)**
- **Ator(es):** Administrador Global (`routes/auditLogs.ts:12`).
- **Gatilho:** `GET /api/audit-logs` (`routes/auditLogs.ts:12`).
- **Fluxo principal:** `ListAuditLogsUseCase.execute` (`ListAuditLogsUseCase.ts:41-53`): filtros `entity_type/entity_id/action/start_date/end_date` + page/limit → `findAndCountAll`.
- **Exceções:** não-admin → 403.
- **Invariantes / lacuna:** **não** filtra por `user_id` nem por `success` (`:42`) — consultar "tudo que o usuário X fez" ou "todas as negativas" exige varredura manual, apesar do índice em `user_id` (BR-IAM-036). Módulo só de LEITURA; escrita bypassa o módulo (via `auditLogService.logAction`, ownership quebrado — `CURRENT_ARCHITECTURE.md` §V3).
- **BRs:** BR-IAM-028 (imutabilidade por ausência de rota de escrita), BR-IAM-036 (filtros limitados).
- **Rastreabilidade vs. doc:** **FANTASMA** — nenhum UC descreve a consulta de logs pelo admin (há RF/`BUSINESS_RULES.md §5`, mas sem UC). Lacuna de rastreabilidade.

---

**UC-IDACC-23 — Consultar log de auditoria por id**
- **Ator(es):** Administrador Global (`routes/auditLogs.ts:13`).
- **Gatilho:** `GET /api/audit-logs/:id` (`routes/auditLogs.ts:13`).
- **Fluxo principal:** `GetAuditLogByIdUseCase.execute` (`GetAuditLogByIdUseCase.ts:25-31`) → 404 `'Registro de auditoria não encontrado'` se ausente.
- **BRs:** BR-IAM-028.
- **Rastreabilidade vs. doc:** **FANTASMA** — sem UC. Lacuna de rastreabilidade.

---

## OBSOLETE_CANDIDATE (na doc, sem correspondência no código)

- **OC-1 — `GET /api/auth/me/menu` (endpoint proposto):** `docs/business/01-USE_CASES.md:279-282` propõe `GET /api/auth/me/menu` (ou "payload de login já retorna o menu"). **Não existe no código** — a resolução de menu é `GET /api/auth/me/permissions` (UC-IDACC-05). O SSOT `04-USE_CASES.md:1621` já corrige o path; o draft histórico permanece com o endpoint fantasma. Objeto documental obsoleto (não é código).
- **OC-2 — Nível de permissão "V/ver" (somente-leitura):** a matriz oficial de `BUSINESS_RULES.md §1/§4` (citada em BR-IAM-021) atribui o nível `V` (ver, leitura apenas) massivamente. **Não existe no código** (`AccessModuleLevel = 'operate'|'approve'`, `validatePermissions.ts:28-30`). É doc-sem-código no nível de regra que impacta UC-IDACC-19/20 — não um UC inteiro, mas um estado documentado inexistente. Decisão humana (matriz desatualizada × implementação incompleta).
- **OC-3 — Segunda trava `nivel = gestor` como campo separado do usuário:** o desenho original de UC-37/§4 (coluna `users.access_level`) foi colapsado na linha de permissão; o texto normativo obsoleto sobrevive **em comentário de código** (`models/AccessProfilePermission.ts:17-19`, BR-IAM-039), não na doc de UC (que já reflete o colapso em UC-37 `04-USE_CASES.md:1728-1733`). Remoção do comentário é alçada da SanaCore.
- **Fluxos de "Tela" (frontend) de UC-35/UC-35-Exceção/UC-36:** descrevem `client/src/...` (guard `ModuleRoute`, `AccessDeniedPage`) — **fora do escopo backend deste cluster**; não verificados aqui. Não são obsoletos, apenas não confrontáveis por este agente (backend-only).

---

## Contagem por classificação (23 DISCOVERED_USE_CASE)

| Classificação | Qtd | UC-IDACC |
|---|---|---|
| **CONFIRMED** (doc bate com código) | 6 | 01, 15*, 19*, 20, 21, 05* |
| **CONFLITANTE** (doc diverge do código) | 8 | 03, 08, 09, 10, 11, 12, 13, 15/19 (marcados com *) |
| **FANTASMA** (no código, ausente na doc de UC) | 9 | 02, 04, 06, 07, 14, 22, 23, (03 e 08 também têm faceta FANTASMA) |
| **CONFIRMED-suporte** (leitura/apoio sem UC dedicado, aceitável) | 4 | 16, 17, 18, (05 vs. SSOT) |

Nota: UC-IDACC-05 é CONFIRMED vs. SSOT e CONFLITANTE vs. draft (OC-1); UC-IDACC-15 e UC-IDACC-19 são CONFIRMED no fluxo com CONFLITO pontual (mensagem de auditoria / níveis). Contagem indicativa — a natureza mista está detalhada em cada UC.

**Fato de cobertura de UC:** 8 dos 8 endpoints admin do módulo `auth`+`users`+`auditLogs` que NÃO são UC-01/UC-10/UC-33 (refresh, register, me, me/permissions[vs draft], change-password, forgot, reset, revoke-sessions, audit-logs GET×2) não têm UC formal 1:1 no catálogo — o cluster está **documentado por regra (BR-IAM) e por requisito (RF-AUT/REQ-IAM), mas sub-documentado por UC**.

---

## Candidatos a finding (NÃO promovidos — seguem o fluxo normal até o passo 31)

Nenhum item abaixo é finding formal. CRITICAL/HIGH devem passar por `vericore-finding-validator`; persistência via `vericore-audit-evidence-controller`. Evidência já em arquivo:linha nos dois lados.

- **CF-1 (rastreabilidade / doc-de-API × código, MEDIUM):** `POST /api/auth/reset-password` devolve **401**, doc `API.md:274-275` publica **422** (UC-IDACC-08 / BR-IAM-009). Quem integra pela doc trata o erro errado.
- **CF-2 (completude de UC, MEDIUM):** 7 endpoints de `users` (UC-IDACC-09..15) colapsados no UC-10 vago, que ainda menciona "Edita permissões" — capacidade inexistente como tal no código (edição de permissão de usuário é via atribuição de perfil, UC-33/UC-IDACC-15). Granularidade UC × implementação divergente.
- **CF-3 (rastreabilidade, MEDIUM):** 9 comportamentos implementados sem UC (refresh, me, change-password, forgot, reset, revoke-sessions, audit-logs GET×2, register) — insumo direto para `vericore-traceability-auditor`.
- **CF-4 (auditoria assimétrica, HIGH):** `POST /api/auth/register` (UC-IDACC-03) cria usuário **sem `logAction`**, enquanto `POST /api/users` (UC-IDACC-11) audita — mesma entidade, mesma autoridade admin (BR-IAM-026). Contradiz `REQUISITOS_NAO_FUNCIONAIS.md:48 [IMPLEMENTADO]`.
- **CF-5 (regra contornável, HIGH):** proibição de auto-inativação imposta no `DELETE` (UC-IDACC-13) é **contornável pelo `PUT /api/users/:id {active:false}`** (UC-IDACC-12), que não recebe `currentUserId` (BR-IAM-014). Com admin único = auto-lockout total, sem rota de recuperação.
- **CF-6 (níveis de acesso, HIGH):** perfil só cadastra `operate|approve` (UC-IDACC-19/20), doc prevê 4 níveis com `V`=somente-leitura (BR-IAM-021 / OC-2). Acesso somente-leitura é inexprimível; um perfil que deveria "só ver" recebe escrita.
- **CF-7 (validação assimétrica de `role`, MEDIUM):** `role` validado contra `VALID_ROLES` só em `POST /api/users` (UC-IDACC-11); ausente em `PUT /api/users/:id` (UC-IDACC-12) e `POST /api/auth/register` (UC-IDACC-03) — nesses, erro 500 genérico em vez de 400 didático (BR-IAM-015).
- **CF-8 (mensagem de auditoria enganosa, MEDIUM):** UC-IDACC-15 grava no log "efetivo no próximo login, UC-36", mas a API reflete o novo perfil no request seguinte (sem cache) — o log comunica ao auditor regra diferente da aplicada (BR-IAM-022).
- **CF-9 (cobertura de teste, informativo/insumo ao acceptance-criteria-auditor):** módulo `users` inteiro sem teste de use-case (UC-IDACC-09..13,15 sem teste direto; só revoke-sessions é exercitado por integração) — os 4 use-cases de escrita que controlam o acesso ao ERP não têm teste vinculado.

---

### O que este documento NÃO afirma
- Não decide qual lado está certo em nenhuma divergência (Regra 20/21); não promove finding nem atribui severidade final.
- Não auditou a matriz USER→ROLE→PERMISSION completa (fronteira do authorization-auditor); apenas confrontou a permissão declarada em cada UC vs. imposta na rota — e confirmou que o role vem do banco, não do cliente (sem Regra 24 neste cluster).
- Não verificou frontend (`client/`, `tv/`): fluxos de "Tela" de UC-35/36 e o menu cacheado ficam sem veredito de implementação aqui.
- Nenhum número (rota, contagem, commit) foi copiado de contexto injetado sem releitura direta em disco; as contagens acima derivam dos arquivos citados.
