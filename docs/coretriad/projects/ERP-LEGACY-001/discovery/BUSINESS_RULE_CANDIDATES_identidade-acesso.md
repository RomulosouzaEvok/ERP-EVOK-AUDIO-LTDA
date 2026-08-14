# BUSINESS_RULE_CANDIDATES_identidade-acesso.md — ERP-LEGACY-001, Passo 26

```
PROJECT_ID: ERP-LEGACY-001
DOMÍNIO: Identidade & Acesso (auth, users, accessProfiles, auditLogs)
MÉTODO: Read/Grep/Glob apenas — nenhum comando executado, nenhuma conexão de banco,
        nenhum arquivo alterado. READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT.
REGRA 2 DO PROGRAMA APLICADA: cada afirmação de documento foi conferida contra o código;
        onde doc e código divergem, o veredito é CONFLICTING e a decisão NÃO é tomada aqui.
OWNER: nenhum artefato versionado atribui owner por regra neste domínio.
        Todas as regras abaixo saem com OWNER indeterminado → Regra 21 (escalar ao director).
```

## 0. Sumário de vereditos

| Status | Qtd | BR-IDs |
|---|---|---|
| CONFIRMED | 18 | 001, 003, 005, 006, 007, 008, 010, 011, 013, 016, 017, 018, 019, 020, 023, 024, 027, 028, 032, 035 |
| DISCOVERED (só no código) | 8 | 004, 012, 026, 029, 030, 033, 036, 037 |
| CONFLICTING (doc × código) | 7 | 002, 009, 014, 015, 021, 022, 025, 031 |
| UNKNOWN (precisa decisão humana) | 2 | 034, 038 |
| OBSOLETE_CANDIDATE | 1 | 039 |

Os 3 vereditos de maior impacto: **BR-IAM-021** (nível "V/ver" documentado
não existe no código — todo acesso concedido é escrita), **BR-IAM-014**
(proibição de auto-inativação contornável por outro endpoint) e
**BR-IAM-025/026/031** (auditoria declarada `[IMPLEMENTADO]` em RNF, mas com
buracos comprovados).

---

## 1. Política de senha e rotação

### BR-IAM-001 — Hash bcrypt no `beforeSave`
```
BR_ID: BR-IAM-001
NAME: Toda senha é persistida como hash bcrypt, custo 10, no hook do model
DESCRIPTION: Ao criar ou salvar um User com o campo `password` alterado, o valor é
             substituído por bcrypt.hash(valor, 10) antes do INSERT/UPDATE.
ORIGIN: docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md:39 ("Hash de senha | bcrypt | [IMPLEMENTADO] | modelo User")
OWNER: [NÃO DETERMINADO]
VALIDITY: anterior ao AUDIT_COMMIT; não datada em artefato
DOMAIN: Identidade & Acesso
CONDITIONS: user.changed('password') === true (create e update)
EXCEPTIONS: nenhuma — não há caminho de escrita de senha que não passe pelo model
PRIORITY: CRITICAL
IMPLEMENTATION: server/src/models/User.ts:123-133 (hooks.beforeSave), :143-145 (comparePassword)
RELATED_USE_CASES: UC-33 (indireto), SEC-09, SEC-12
RELATED_TESTS: server/tests/unit/change-password-session-invalidation.test.ts:42 (indireto)
STATUS: CONFIRMED
NOTA DE CONFORMIDADE: o VALOR do custo (10 rounds) existe apenas no código
  (User.ts:125) e no cabeçalho JSDoc do próprio arquivo (User.ts:11). Nenhum
  documento de negócio/segurança fixa o custo — não há valor documentado contra o
  qual comparar. Lacuna de origem, não divergência.
```

### BR-IAM-002 — Comprimento mínimo de senha ⚠ CONFLICTING
```
BR_ID: BR-IAM-002
NAME: Senha de usuário deve ter no mínimo 6 caracteres
ORIGIN: docs/arquitetura/API.md:273-274 (reset-password: "menos de 6 caracteres → 400")
OWNER: [NÃO DETERMINADO]
CONDITIONS: length >= 6; nenhuma exigência de complexidade (maiúscula/dígito/símbolo)
EXCEPTIONS: PUT /api/users/:id não aceita senha (BR-IAM-016)
PRIORITY: HIGH
IMPLEMENTATION (3 implementações independentes da MESMA regra):
  - server/src/modules/auth/domain/entities/AuthCredentialsEntity.ts:89-91 (register + POST /api/users)
  - server/src/modules/auth/presentation/validators/authValidators.ts:7 (change-password, Zod min(6))
  - server/src/modules/auth/presentation/validators/authValidators.ts:18 (reset-password, Zod min(6))
RELATED_TESTS: nenhum teste exercita a fronteira 5/6 caracteres em nenhuma das 3 vias
STATUS: CONFLICTING
DIVERGÊNCIA PROVADA: o mesmo repositório aplica DOIS limiares para "senha de usuário
  do ERP": 6 caracteres para qualquer usuário humano (3 arquivos acima) e 8
  caracteres para a senha do admin semeado
  (server/src/config/runtimeEnv.ts:127 — falha o boot em produção se
  ADMIN_SEED_PASSWORD < 8; server/src/config/seeds.ts:139-141 — warn se < 8).
  Nenhum documento declara qual é a política. Decisão do responsável humano.
COBERTURA: regra crítica sem teste automatizado nas 3 implementações.
```

### BR-IAM-003 — Invalidação de sessão por `passwordVersion` (SEC-10)
```
BR_ID: BR-IAM-003
NAME: Toda troca de senha invalida todos os tokens JWT emitidos antes dela
ORIGIN: docs/arquitetura/API.md:269-271 ("Efeitos (SEC-10)"); comentário SEC-10 no código
CONDITIONS: !user.isNewRecord && user.changed('password') → passwordVersion += 1
            token.passwordVersion (default 1 se ausente) !== user.passwordVersion → 401
EXCEPTIONS: usuário recém-criado nasce com passwordVersion = 1, sem incremento
PRIORITY: CRITICAL
IMPLEMENTATION: server/src/models/User.ts:127-131; server/src/middlewares/auth.ts:99-103;
                server/src/modules/auth/infrastructure/jwt/TokenService.ts:9
RELATED_TESTS: server/tests/unit/change-password-session-invalidation.test.ts:42,139,170;
               server/tests/integration/password-recovery-and-session-revocation.test.ts:64-65
STATUS: CONFIRMED
OBSERVAÇÃO: `decoded.passwordVersion ?? 1` (auth.ts:99) faz um token legado sem o claim
  ser tratado como versão 1 — aceito para usuários que nunca trocaram senha. Exceção
  implementada e não documentada.
```

### BR-IAM-004 — Nova senha ≠ senha atual
```
BR_ID: BR-IAM-004
ORIGIN: nenhuma — regra existe apenas no código
CONDITIONS: em PUT /api/auth/change-password, compara a nova senha com o hash atual
EXCEPTIONS NÃO DOCUMENTADAS: POST /api/auth/reset-password NÃO aplica esta regra —
  é possível "redefinir" para exatamente a mesma senha via token de recuperação.
PRIORITY: MEDIUM
IMPLEMENTATION: server/src/modules/auth/application/use-cases/ChangePasswordUseCase.ts:55-58
NÃO IMPLEMENTADO EM: .../ResetPasswordUseCase.ts:54
RELATED_TESTS: server/tests/unit/change-password-session-invalidation.test.ts:78
STATUS: DISCOVERED (com exceção não documentada entre os dois caminhos)
```

### BR-IAM-038 — Rotação/expiração periódica de senha e lockout ⚠ UNKNOWN
```
BR_ID: BR-IAM-038
NAME: [AUSENTE] Política de rotação de senha, expiração e lockout de conta
DESCRIPTION: Não existe, em nenhum artefato versionado nem no código, regra de
             expiração periódica de senha, histórico de senhas anteriores, ou
             bloqueio de conta após N tentativas falhas.
PROVA (ausência): grep por "rotação/rotac/90 dias/complexidade de senha/mínimo de 8"
  em docs/ retorna apenas rotação de LOG e de secret de banco, nada de senha de
  usuário. No código, `User.ts` não tem campo de expiração de senha nem contador de
  falhas; o único freio é o rate-limit de IP+email (BR-IAM-007).
IMPACTO: `passwordVersion` é frequentemente descrito como "rotação" — ele NÃO é
  rotação, é invalidação de sessão. São regras diferentes.
PRIORITY: HIGH (decisão de negócio pendente)
STATUS: UNKNOWN — fonte autoritativa indeterminável (Regra 21: escalar ao director)
```

---

## 2. Token JWT, refresh e sessão

### BR-IAM-005 — TTL do JWT
```
NAME: Token JWT expira em 7 dias (configurável por JWT_EXPIRE)
ORIGIN: docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md:32; docs/arquitetura/API.md:171,196
IMPLEMENTATION: server/src/config/runtimeEnv.ts:50 (JWT_EXPIRE default '7d'),
                :247-258 (getJwtRuntimeConfig); TokenService.ts:9-13 (issuer/audience fixos)
CONDITIONS: issuer 'erp-evok-audio', audience 'erp-evok-audio-api' (runtimeEnv.ts:244-245),
            verificados na entrada (middlewares/auth.ts:69-72)
RELATED_TESTS: server/tests/unit/auth-refresh.test.ts:45 (preserva iss/aud), :93 (expirado → 401)
STATUS: CONFIRMED (valor documentado 7d = valor implementado '7d')
RESSALVA: `JWT_EXPIRE: z.string()` — não há teto validado. Um valor como '365d' passa
  no boot de produção sem alerta, ao contrário de JWT_SECRET/DB_SSL que têm superRefine.
```

### BR-IAM-006 — Renovação deslizante
```
NAME: Refresh exige token ainda válido; não existe refresh-token separado
ORIGIN: docs/arquitetura/API.md:167-198
IMPLEMENTATION: server/src/modules/auth/presentation/routes/auth.ts:14 (authenticate antes
  do handler); authController.ts:67-77; RefreshTokenUseCase (reemite com o MESMO
  passwordVersion já validado — auth.ts:34-42 documenta a razão)
RELATED_TESTS: server/tests/unit/auth-refresh.test.ts:45,93,127
STATUS: CONFIRMED (doc × código × teste batem nos 3 pontos)
```

### BR-IAM-007 — Rate-limits de autenticação
```
ORIGIN: docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md:34-38
CONFRONTO VALOR DOCUMENTADO × IMPLEMENTADO:
  | Endpoint          | Documentado   | Implementado (server/app.ts) | Veredito |
  | login             | 10 / 15 min   | max:10, 15*60*1000 (:54-59)  | BATE |
  | register          | 5 / 60 min    | max:5, 60*60*1000 (:60-64)   | BATE |
  | refresh           | 30 / 15 min   | max:30, 15*60*1000 (:99-104) | BATE |
  | forgot/reset      | 10 / 15 min   | max:10, 15*60*1000 (:122-127)| BATE |
  | API geral         | 300 / 15 min  | max:300 (100000 em test) (:113)| BATE |
CONDITIONS: chave de login = IP+email (app.ts:51); chave de refresh/api = usuário autenticado
RELATED_TESTS: nenhum teste automatizado verifica os limiares
STATUS: CONFIRMED
```

### BR-IAM-008 / BR-IAM-009 — Token de recuperação (SEC-12)
```
BR-IAM-008 — Token de recuperação: 32 bytes aleatórios, guardado só como SHA-256, TTL 1h, uso único
  ORIGIN: docs/arquitetura/API.md:246-275
  IMPLEMENTATION: ForgotPasswordUseCase.ts:17 (RESET_TOKEN_TTL_MS = 60*60*1000), :45-50;
                  ResetPasswordUseCase.ts:45,50-56 (limpa hash e expiração após uso);
                  models/User.ts:96-107 (colunas), :153-159 (toJSON nunca serializa o hash)
  RELATED_TESTS: password-recovery-and-session-revocation.test.ts:33,84
  STATUS: CONFIRMED

BR-IAM-009 — Status HTTP de token de recuperação inválido/expirado ⚠ CONFLICTING
  DOCUMENTADO: API.md:274-275 — "Erro (422) — token inválido, expirado ou já utilizado
               (BusinessRuleError)"
  IMPLEMENTADO:  ResetPasswordUseCase.ts:51 lança UnauthorizedError → HTTP 401
                 (server/src/errors/index.ts:35-37)
  TESTADO COMO:  401 (password-recovery-and-session-revocation.test.ts:76 e :107)
  STATUS: CONFLICTING — código e teste concordam entre si (401); a documentação da API
    publica 422/BUSINESS_RULE_VIOLATION. Quem integra pela doc trata o erro errado.
    Severidade MEDIUM, confiança CONFIRMED.
```

### BR-IAM-010 / 011 / 012 — Login, sessão e revogação
```
BR-IAM-010 — Login nunca revela se o e-mail existe; usuário inativo não autentica
  IMPLEMENTATION: LoginUseCase.ts:47-70 (mesma mensagem 'Email ou senha incorretos'
    para e-mail inexistente e senha errada; mensagem distinta só para inativo),
    middlewares/auth.ts:94-97 (inativo → 401 em toda requisição)
  ORIGIN: docs/arquitetura/API.md:165  |  STATUS: CONFIRMED
  EXCEÇÃO IMPLEMENTADA: a distinção "Usuário inativo" é observável por um atacante que
    já conheça a senha — mitigação de emergência prevista em UC-36 (01-USE_CASES.md:448-456).

BR-IAM-011 — Toda tentativa de login (sucesso e falha) é auditada
  IMPLEMENTATION: LoginUseCase.ts:48-52,57-61,64-69,77-80; authController.ts:38, :42-44
  STATUS: CONFIRMED — é o único fluxo do domínio que audita FALHA, não só sucesso.

BR-IAM-012 — Revogação emergencial de sessões por admin, sem tocar na senha
  ORIGIN: userController.ts:126-131 (SEC-12); sem documento de negócio próprio
  IMPLEMENTATION: RevokeUserSessionsUseCase.ts:28-45; SequelizeUsersRepository.ts:68-70
    (User.increment('passwordVersion')); rota users.ts:19 authenticate+authorize('admin')
  RELATED_TESTS: password-recovery-and-session-revocation.test.ts:116
  STATUS: DISCOVERED (implementado e testado; nenhum UC/BR documental o descreve)
```

---

## 3. Quem pode criar/alterar usuário e perfil

### BR-IAM-013 — Autoridade sobre usuários, perfis e logs
```
ORIGIN: docs/business/BUSINESS_RULES.md §1 (:30-32), §3 (:92-105)
IMPLEMENTATION: users.ts:14-20 (7 rotas, todas authenticate+authorize('admin'));
                accessProfiles.ts:21-26 (6 rotas idem); auditLogs.ts:12-13 (2 rotas idem);
                auth.ts:15 (register admin-only)
CONDITIONS: `authorize()` compara req.user.role com a lista (middlewares/auth.ts:151-165);
            nenhum destes módulos usa `authorizeModule`
RELATED_TESTS: server/tests/unit/module-authorization-map.test.ts:147 (guarda de cobertura)
STATUS: CONFIRMED
```

### BR-IAM-014 — Auto-inativação: regra com implementação divergente ⚠ CONFLICTING
```
BR_ID: BR-IAM-014
NAME: Um usuário não pode inativar o próprio usuário
ORIGIN: apenas JSDoc do use case; nenhum documento de negócio
IMPLEMENTATION: DeactivateUserUseCase.ts:32-34 →
  `if (id === currentUserId) throw new BusinessRuleError('Você não pode inativar seu próprio usuário')`
  Aplicada em: DELETE /api/users/:id (users.ts:18)
CONTORNO PROVADO: UpdateUserUseCase.ts:39-49 + UpdateUserEntity.ts:64-71 aceitam `active`
  como campo atualizável e NÃO recebem nem consultam `currentUserId`
  (userController.ts:96-105 não repassa req.user.id). Portanto
  `PUT /api/users/<meu-próprio-id>  { "active": false }` inativa o próprio admin sem
  qualquer verificação — a mesma regra que o DELETE bloqueia.
CONSEQUÊNCIA OPERACIONAL: com um único admin ativo no sistema, isso é um caminho de
  auto-lockout total (nenhuma rota de recuperação: todas as rotas de users exigem admin).
PRIORITY: HIGH  |  SEVERIDADE: HIGH  |  CONFIANÇA: CONFIRMED
RELATED_TESTS: nenhum (não há teste de DeactivateUserUseCase nem de UpdateUserUseCase)
STATUS: CONFLICTING — regra única com duas implementações divergentes.
  → CANDIDATO A FINDING FORMAL (encaminhar a vericore-finding-validator)
```

### BR-IAM-015 — Papéis válidos (validação assimétrica) ⚠ CONFLICTING
```
NAME: role ∈ {admin, operator, financial}, padrão 'operator'
ORIGIN: models/User.ts:74-78 (ENUM + comentário); UpdateUserEntity.ts:5-6 (VALID_ROLES)
CONFRONTO POR CAMINHO DE ESCRITA:
  | Caminho                     | Valida role contra VALID_ROLES? | Evidência |
  | POST /api/users             | SIM                              | CreateUserUseCase.ts:43-45 |
  | PUT /api/users/:id          | NÃO                              | UpdateUserEntity.ts:48-55 (validate() só checa password e email); toUpdateData():68 copia role cru |
  | POST /api/auth/register     | NÃO                              | RegisterUserEntity.ts:82-92; RegisterUserUseCase.ts:49 |
  Nos 2 caminhos sem validação, a única barreira é o ENUM do Postgres → erro 500 genérico
  em vez do 400 didático exigido por BUSINESS_RULES.md §13.
PRIORITY: MEDIUM  |  STATUS: CONFLICTING (mesma regra, 3 implementações, 2 ausentes)
RELATED_TESTS: nenhum
```

### BR-IAM-016 / BR-IAM-017
```
BR-IAM-016 — PUT /api/users/:id nunca troca senha (endpoint dedicado obrigatório)
  IMPLEMENTATION: UpdateUserEntity.ts:49-51 (presença de `password`, mesmo null → 400)
  STATUS: CONFIRMED  |  RELATED_TESTS: nenhum

BR-IAM-017 — E-mail único e com formato válido
  IMPLEMENTATION: models/User.ts:62-68 (unique + isEmail); EMAIL_REGEX
    (AuthCredentialsEntity.ts:11) reusada por UpdateUserEntity.ts:52-54;
    SequelizeUniqueConstraintError → ConflictError 'Email já cadastrado'
    (CreateUserUseCase.ts:55-59, UpdateUserUseCase.ts:61-66, RegisterUserUseCase.ts:51-56)
  STATUS: CONFIRMED
```

---

## 4. Perfis de acesso e autorização por módulo

### BR-IAM-018 / 019 / 020
```
BR-IAM-018 — Perfil único por usuário; atribuir substitui, não acumula
  ORIGIN: BUSINESS_RULES.md §2 (:78-88); 01-USE_CASES.md UC-33
  IMPLEMENTATION: coluna única users.access_profile_id (models/User.ts:108-113);
    AssignAccessProfileUseCase.ts:69 (update sobrescreve); null remove a atribuição
  RELATED_TESTS: server/tests/unit/access-profiles.test.ts:365,417  |  STATUS: CONFIRMED

BR-IAM-019 — Admin global nunca é bloqueado por perfil de área (curto-circuito)
  ORIGIN: BUSINESS_RULES.md §3 (:92-105, inclusive "primeira checagem, antes de
    qualquer consulta à tabela de perfis")
  IMPLEMENTATION: middlewares/auth.ts:226-229 (primeira checagem de authorizeModule);
    GetMyPermissionsUseCase.ts:37-46 (admin recebe todos os módulos em 'approve')
  RELATED_TESTS: access-profiles.test.ts:47; auth-me-permissions.test.ts:113
  STATUS: CONFIRMED (inclusive a exigência de ordem/curto-circuito)

BR-IAM-020 — Usuário sem perfil (ou com perfil inativo) = bloqueio total
  ORIGIN: 01-USE_CASES.md UC-35-Exceção (:49-51, :381+); User.ts:112
  IMPLEMENTATION: middlewares/auth.ts:107 (perfil inativo → permissions {}),
    :246-256 (403 NO_ACCESS_PROFILE + auditoria)
  RELATED_TESTS: access-profiles.test.ts:58; auth-me-permissions.test.ts:89
  STATUS: CONFIRMED
```

### BR-IAM-021 — Níveis de permissão: 3 documentados × 2 implementados ⚠⚠ CONFLICTING
```
BR_ID: BR-IAM-021
NAME: Níveis de acesso de um perfil sobre um módulo
DOCUMENTADO (BUSINESS_RULES.md §1 :13-18 e §4 :129-133): QUATRO estados —
  `-` nenhum, `V` ver (LEITURA APENAS), `O` operar (leitura+escrita), `A` aprovar.
  A matriz oficial §1 (:36-50) atribui `V` massivamente: 12 dos 12 perfis têm
  `dashboard = V`; "Almoxarife" tem `produtos = V`, `compras = V`, `producao = V`, etc.
IMPLEMENTADO: DOIS estados — shared/domain/accessModules.ts:248
  (`type AccessModuleLevel = 'operate' | 'approve'`), models/AccessProfilePermission.ts:61-65
  (`DataTypes.ENUM('operate','approve')`), validatePermissions.ts:28-30 (rejeita qualquer
  level fora de operate|approve).
CONSEQUÊNCIA PROVADA: não existe forma de cadastrar acesso somente-leitura. Um perfil
  que, pela matriz de negócio, deveria apenas VER "compras" só pode ser cadastrado com
  `operate` — que autoriza escrita (middlewares/auth.ts:258-270 libera qualquer ação de
  nível 'operate' com a linha presente). Ou o módulo some do menu, ou vem com escrita.
  O comentário do model (AccessProfilePermission.ts:8-10) reconhece isso ao dizer
  "a presença da linha já implica visibilidade (`view` implícito)" — mas visibilidade
  implícita não é o mesmo que restrição de leitura.
PRIORITY: CRITICAL  |  SEVERIDADE: HIGH  |  CONFIANÇA: CONFIRMED
RELATED_TESTS: access-profiles.test.ts:107,131,148 cobrem operate/approve; nenhum teste
  cobre "somente leitura" — porque o estado não existe.
STATUS: CONFLICTING — pode ser matriz desatualizada ou implementação incompleta.
  Decisão do responsável humano (Regra 20-21).
  → CANDIDATO A FINDING FORMAL
```

### BR-IAM-022 — "Segunda trava" gestor e efeito da troca de perfil ⚠ CONFLICTING
```
CAMADA 1 (regra de negócio, §4 :109-140): dois níveis, `nivel` do USUÁRIO como segunda
  trava para ações de aprovação.
CAMADA 2 (nota de implementação decidida, §4 :142-160): a segunda trava foi COLAPSADA
  na própria linha de permissão — não existe coluna users.access_level.
CÓDIGO: middlewares/auth.ts:213-285 implementa a versão colapsada → CONFORME à decisão.
DOC-EM-CÓDIGO OBSOLETA: models/AccessProfilePermission.ts:17-19 ainda afirma
  "`level = 'approve'` só é efetivo ... quando o usuário também tem `nivel = gestor`
  (segunda trava ... ver middleware authorizeModule)". O middleware citado não faz
  essa checagem. → OBSOLETE_CANDIDATE (ver BR-IAM-039).
UC-36 (vigência): 01-USE_CASES.md:458-489 decide "não invalida sessão; a API já reflete
  o perfil novo quase imediatamente; só o MENU do frontend espera o próximo login".
  Código: middlewares/auth.ts:77-112 relê perfil+permissões a cada request → conforme.
  DIVERGÊNCIA DE MENSAGEM: AssignAccessProfileUseCase.ts:78 grava no audit log
  "Perfil de acesso do usuário X alterado (efetivo no próximo login, UC-36)" — afirmação
  falsa para a API, que passa a valer no request seguinte. O log de auditoria comunica
  ao auditor uma regra diferente da aplicada.
PRIORITY: MEDIUM  |  STATUS: CONFLICTING (mensagem de auditoria × comportamento real)
```

### BR-IAM-023 / BR-IAM-024 — Ciclo de vida do perfil
```
BR-IAM-023 — Perfil em uso não pode ser desativado; perfil inativo não pode ser atribuído
  ORIGIN: 01-USE_CASES.md UC-32 (:46-48, :181-228, decisão datada 2026-08-03)
  IMPLEMENTATION: DeactivateAccessProfileUseCase.ts:51-57 (422 + lista de usuários
    afetados em details, conforme §13); AssignAccessProfileUseCase.ts:61-66 (422)
  RELATED_TESTS: access-profiles.test.ts:298,332,388  |  STATUS: CONFIRMED

BR-IAM-024 — Perfil precisa de nome único e de ao menos um módulo; módulo válido e não repetido
  ORIGIN: 01-USE_CASES.md UC-30/UC-31; BUSINESS_RULES.md §1
  IMPLEMENTATION: CreateAccessProfileUseCase.ts:48-58; UpdateAccessProfileUseCase.ts:55-67;
    validatePermissions.ts:14-37; unicidade (access_profile_id, module) também no banco
    (AccessProfilePermission.ts:71)
  RELATED_TESTS: access-profiles.test.ts:181,198,208,221,256  |  STATUS: CONFIRMED
```

---

## 5. O que o audit log captura — e o que não captura

### BR-IAM-025 — Auditoria de perfil (§5) e a guarda que mede o lugar errado ⚠ CONFLICTING
```
NAME: Toda mudança de perfil/atribuição é auditada com oldValues e newValues completos
ORIGIN: BUSINESS_RULES.md §5 (:164-186, tabela de campos obrigatórios)
CONFRONTO CAMPO A CAMPO (§5 × código):
  | Campo §5        | Exigência          | Implementado em | Veredito |
  | userId (quem)   | sempre do JWT      | models/AuditLog.ts:149 | BATE |
  | timestamp       | hora do servidor   | timestamps:true (AuditLog.ts:97) | BATE |
  | action          | create/update/deactivate/assign | os 4 use cases | BATE |
  | entity          | AccessProfile / UserAccessAssignment | mesmas linhas | BATE |
  | oldValues       | matriz anterior COMPLETA | UpdateAccessProfileUseCase.ts:83 | BATE |
  | newValues       | matriz nova completa | :84 | BATE |
Regra §5 em si: CONFIRMED.
CONFLITO DE MEDIÇÃO (o achado): server/tests/unit/audit-coverage-guard.test.ts:49-63
  lista `accessProfiles` e `users` como DÉBITO CONHECIDO ("era possível criar usuário e
  trocar permissões sem rastro" — :16-18), e o teste :106-113 EXIGE que permaneçam na
  lista. Mas a guarda só procura `logAction` em
  `modules/<mod>/presentation/controllers/` (:82-85), e ambos os módulos auditam nos
  USE CASES (CreateUserUseCase.ts:62, UpdateUserUseCase.ts:73, DeactivateUserUseCase.ts:46,
  RevokeUserSessionsUseCase.ts:36, AssignAccessProfileUseCase.ts:71 e os 3 de accessProfiles).
  Efeito duplo: (a) a afirmação do débito é falsa hoje para users/accessProfiles;
  (b) a guarda mede o lugar errado — daria "verde" a um módulo que auditasse no
  controller e nada no use case, e falso-vermelho a quem auditar corretamente no use case.
PRIORITY: MEDIUM  |  STATUS: CONFLICTING (artefato de governança × código)
```

### BR-IAM-026 — Buraco de auditoria dentro do próprio domínio ⚠ DISCOVERED
```
NAME: POST /api/auth/register cria usuário SEM registrar auditoria
PROVA: authController.ts:87-97 (register) é o ÚNICO handler do módulo auth que não chama
  `logAction` — login (:38), change-password (:163), reset-password (:229) chamam.
  RegisterUserUseCase.ts (arquivo inteiro) não importa auditLogService.
CONTRASTE: o caminho equivalente POST /api/users audita (CreateUserUseCase.ts:62).
  Criar usuário deixa rastro por uma rota e não deixa pela outra — mesma entidade,
  mesma autoridade exigida (admin), auditoria assimétrica.
CONFLITA COM: REQUISITOS_NAO_FUNCIONAIS.md:48 "Auditoria de operações sensíveis |
  AuditLog | [IMPLEMENTADO]"; BUSINESS_RULES.md §5.
PRIORITY: HIGH  |  SEVERIDADE: HIGH  |  CONFIANÇA: CONFIRMED
STATUS: DISCOVERED (exceção não documentada) → CANDIDATO A FINDING FORMAL
```

### BR-IAM-027 / 028 / 029 / 030
```
BR-IAM-027 — Toda negativa 403 de módulo é auditada como `access_denied`
  ORIGIN: BUSINESS_RULES.md §5 :184-186
  IMPLEMENTATION: middlewares/auth.ts:231-242 + :247,:261,:273 (3 motivos distintos),
    success:false  |  STATUS: CONFIRMED
  RELATED_TESTS: nenhum teste verifica que o log é gravado no 403

BR-IAM-028 — O log de auditoria é imutável
  ORIGIN: BUSINESS_RULES.md §5 :182-183
  IMPLEMENTATION (por ausência): auditLogs.ts:12-13 expõe SOMENTE GET / e GET /:id.
    O módulo não tem repositório de escrita e nenhum use case de update/delete.
  STATUS: CONFIRMED (garantida por ausência de caminho de escrita NA API)
  RESSALVA CRÍTICA: essa garantia é só de aplicação — no nível de banco não há trigger,
    conforme FIND-ERP-002 (HIGH, CONFIRMED). A regra documentada de imutabilidade NÃO
    é garantida contra SQL direto.
  LACUNA ANEXA: nenhuma política de RETENÇÃO/expurgo existe. → BR-IAM-034.

BR-IAM-029 — Vocabulário fechado de `action`, com degradação em vez de perda
  IMPLEMENTATION: shared/domain/auditActions.ts (SSOT), AuditLog.ts:80 (ENUM derivado),
    auditLogService.ts:135-213 (se o banco rejeita, regrava no valor legado marcando
    `[verbo]` na description; memoiza a rejeição por processo em :46,:176-184)
  RELATED_TESTS: audit-action-vocabulary, audit-log-action-downgrade,
    audit-log-register-normalization  |  STATUS: DISCOVERED (bem coberto)

BR-IAM-030 — Auditoria nunca bloqueia a operação (fire-and-forget)
  IMPLEMENTATION: auditLogService.ts:92-98,122 (nunca propaga erro; 1 retry após 200ms;
    fallback em logs/audit-failures.log :58-74 e webhook AUDIT_ALERT_WEBHOOK_URL :76-89)
  CONSEQUÊNCIA DE NEGÓCIO (não documentada como decisão): uma operação sensível conclui
    com sucesso mesmo quando o registro de auditoria falhou nas duas tentativas. Para um
    controle de compliance, é exceção material à §5 — implementada e justificada em
    comentário, mas sem documento de negócio aprovado.
  RELATED_TESTS: audit-log-failure-alerting.test.ts  |  STATUS: DISCOVERED
```

### BR-IAM-031 — `items` continua sem auditoria (confirmação solicitada) ⚠ CONFLICTING
```
NAME: Escritas do módulo `items` não deixam rastro de auditoria
VERIFICAÇÃO PEDIDA: CONFIRMADA, permanece verdadeira no AUDIT_COMMIT. Grep por
  `logAction|auditLog` (case-insensitive) em server/src/modules/items/** → ZERO
  ocorrências, em todo o módulo (não só no controller).
  8 handlers de escrita sem auditoria: itemController.ts:65 create, :84 update,
  :98 createStructure, :135 inactivate, :167 createSupplier, :185 updateSupplier,
  :203 removeSupplier.
FATO HISTÓRICO: audit-coverage-guard.test.ts:5-18 — a carga real de 327 itens via
  POST /api/items deixou audit_logs com 2 linhas (os dois logins).
DÉBITO FORMALIZADO EM: docs/governance/RESIDUAIS_ABERTOS_2026-08-10.md §3.2 e na lista
  DEBITO_CONHECIDO (audit-coverage-guard.test.ts:49-63, 13 módulos).
CONFLITA COM: REQUISITOS_NAO_FUNCIONAIS.md:48 declara "[IMPLEMENTADO]" sem ressalva —
  o cadastro mestre do ERP (`items`, PRODUÇÃO REAL e hot path segundo DOMAIN_MAP §2)
  está fora dela.
PRIORITY: HIGH — insumo para o auditor do domínio Cadastro Central e para
  vericore-traceability-auditor
STATUS: CONFLICTING (RNF × código) / débito conhecido e assumido
```

---

## 6. Exposição de dado sensível e bootstrap

```
BR-IAM-032 — Serialização de User nunca expõe segredo
  IMPLEMENTATION: models/User.ts:153-159 (toJSON remove password,
    resetPasswordTokenHash, resetPasswordExpiresAt); reforço em consulta:
    middlewares/auth.ts:78 e SequelizeUsersRepository.ts:31,43
    (`attributes: { exclude: ['password'] }`)
  STATUS: CONFIRMED  |  RELATED_TESTS: nenhum teste afirma a ausência dos campos

BR-IAM-033 — Usuário admin de bootstrap
  IMPLEMENTATION: server/src/config/seeds.ts:128-148 — cria `admin@evokaudio.com.br`,
    role admin, ativo; senha de ADMIN_SEED_PASSWORD; em produção a ausência lança erro
    (:130-135); fora de produção cai em 'dev-only-change-me' (:138) com warn.
    Reforço de boot: runtimeEnv.ts:127-133 exige >= 8 caracteres e proíbe o placeholder
    em produção.
  STATUS: DISCOVERED — e-mail do admin é constante hardcoded, sem documento que o fixe;
    o limiar de 8 contradiz o de 6 de BR-IAM-002.

BR-IAM-034 — Retenção/expurgo de audit_logs e de usuários inativos
  Nenhuma regra em documento nem código (soft delete `active=false` é permanente;
  audit_logs cresce sem política). STATUS: UNKNOWN — decisão humana.

BR-IAM-035 — GET /api/auth/me/permissions não consulta o banco
  IMPLEMENTATION: GetMyPermissionsUseCase.ts:36-52 reaproveita req.user.permissions
    resolvido em authenticate (auth.ts:74-112, join único, sem N+1)
  ORIGIN: 01-USE_CASES.md UC-34  |  RELATED_TESTS: auth-me-permissions.test.ts:55,89,113
  STATUS: CONFIRMED

BR-IAM-036 — Filtros de consulta do audit log
  IMPLEMENTATION: ListAuditLogsUseCase.ts:42-52 (entity_type, entity_id, action,
    start_date, end_date, page/limit default 10). NÃO é possível filtrar por `user_id`
    nem por `success` — consultar "tudo que o usuário X fez" ou "todas as negativas"
    exige varredura manual, apesar de existir índice em user_id (AuditLog.ts:99).
  STATUS: DISCOVERED (limitação funcional não documentada)

BR-IAM-037 — Auditoria fora de transação
  CONVENÇÃO: auditLogService.ts:113-116 exige chamar logAction DEPOIS do commit.
    Verificado conforme em ChangePassword e ResetPassword (authController.ts:163, :229).
  STATUS: DISCOVERED (convenção implementada, sem documento de negócio)

BR-IAM-039 — Comentário normativo obsoleto no model de permissão
  models/AccessProfilePermission.ts:17-19 descreve uma "segunda trava `nivel = gestor`"
  que a decisão de §4 (:142-160) explicitamente NÃO implementou e que authorizeModule
  não executa. STATUS: OBSOLETE_CANDIDATE (texto normativo em código, contraditório com
  a decisão vigente — remoção é da alçada da SanaCore, não deste agente).
```

---

## 7. Cobertura de teste por regra crítica

| Regra crítica | Teste automatizado | Veredito |
|---|---|---|
| BR-IAM-002 mínimo de 6 caracteres (3 implementações) | nenhum | **SEM TESTE** |
| BR-IAM-003 invalidação por passwordVersion | unit + integração | OK |
| BR-IAM-005 TTL/iss/aud | auth-refresh.test.ts | OK |
| BR-IAM-007 rate-limits (5 valores) | nenhum | **SEM TESTE** |
| BR-IAM-008/009 token de recuperação | integração | OK |
| BR-IAM-013 admin-only nas 15 rotas | module-authorization-map (estrutural) | PARCIAL |
| BR-IAM-014 auto-inativação | nenhum | **SEM TESTE** (e a regra é contornável) |
| BR-IAM-015 role válido | nenhum | **SEM TESTE** |
| BR-IAM-016 PUT não troca senha | nenhum | **SEM TESTE** |
| BR-IAM-019/020/021 authorizeModule | access-profiles.test.ts | OK (exceto nível "V", inexistente) |
| BR-IAM-023/024 ciclo de vida de perfil | access-profiles.test.ts | OK |
| BR-IAM-027 auditoria do 403 | nenhum | **SEM TESTE** |
| BR-IAM-032 toJSON sem segredo | nenhum | **SEM TESTE** |

**Módulo `users` inteiro sem teste de use case:** grep por
`CreateUserUseCase|UpdateUserUseCase|DeactivateUserUseCase|RevokeUserSessionsUseCase|RegisterUserUseCase`
em `server/tests/**` → zero arquivos. Os 4 use cases de escrita de usuário
(o cadastro que controla o acesso ao ERP inteiro) só são exercitados
indiretamente, pelo teste de integração de revoke-sessions.

---

## 8. O que este documento NÃO afirma

- Não decide qual lado está certo em nenhuma das 7 divergências (Regra 20-21)
  — em especial BR-IAM-021 (matriz V/O/A × ENUM operate/approve) e BR-IAM-009
  (401 × 422).
- Não é finding formal: **BR-IAM-014, BR-IAM-021 e BR-IAM-026** são os
  candidatos a finding CRITICAL/HIGH e devem passar por
  `vericore-finding-validator` antes de virarem finding com severidade; a
  evidência já está em arquivo:linha nos dois lados de cada comparação.
- OWNER: nenhuma das 39 regras tem owner nomeado em artefato versionado.
  `BUSINESS_RULES.md` registra decisões "do dono" (changelog :570) sem
  identificar responsável por regra. Isso atinge 100% do domínio → escalar ao
  `vericore-software-audit-director` como lacuna de governança.
- Não verificado o frontend (`client/`, `mobile/`, `tv/`): onde a regra
  depende do cliente (menu cacheado do UC-36, BR-IAM-022), o veredito cobre
  apenas o backend.

---

Arquivos-chave desta análise: `server/src/models/{User,AuditLog,AccessProfilePermission}.ts`,
`server/src/middlewares/auth.ts`, `server/src/services/auditLogService.ts`,
`server/src/config/{runtimeEnv,seeds}.ts`, `server/app.ts`,
`server/src/modules/{auth,users,accessProfiles,auditLogs}/**`,
`server/src/modules/items/presentation/controllers/itemController.ts`,
`server/tests/unit/audit-coverage-guard.test.ts`,
`docs/business/{BUSINESS_RULES,01-USE_CASES}.md`,
`docs/arquitetura/{API,REQUISITOS_NAO_FUNCIONAIS}.md`.

---

*Produzido pelo agente `vericore-business-rule-auditor` em modo read-only
reforçado; conteúdo persistido neste caminho pelo orquestrador (o hook de
segregação bloqueia escrita de agentes VeriCore fora de `audit/`), sem
edição de conteúdo.*
