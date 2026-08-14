# LEGACY_TRACEABILITY_MATRIX_identidade-acesso.md — ERP-LEGACY-001, Passo 29

```
PROJECT_ID:  ERP-LEGACY-001
CLUSTER:     identidade-acesso
MÓDULOS:     auth, users, accessProfiles, auditLogs
MÉTODO:      Read/Grep/Glob apenas. Nenhum comando, script, teste ou conexão de banco executado.
             READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT.
             READ-ONLY REFORÇADO em auth/users/auditLogs (PRODUÇÃO REAL): só leitura de fonte.
AGENTE:      vericore-traceability-auditor (trilha VeriCore, DISCOVERY — não é auditoria 360º nem remediação)
```

## 0. Ressalva estrutural — a matriz NASCE QUEBRADA (confirmado, não redescoberto)

Confirmo a premissa do Control Plane, com detalhe verificado em disco:

1. **Nenhuma das 39 regras candidatas tem BR-ID canônico versionado.** Só existem os IDs provisórios `BR-IAM-001..039` do passo 26. Não encontrei, neste cluster, **nenhum** rótulo de gap `G/D/K` amarrado às regras de identidade-acesso (os `G1..G18` / `D-C/D-G/D-K` da premissa vivem em outros clusters). A coluna "rótulo de gap" fica `—` em 39 de 39 linhas — isto é, em si, um elo quebrado: as regras deste cluster não têm nem BR-ID canônico nem gap-rótulo cruzável.
2. **Nenhum RF/RNF tem AC- nem TC- apontado** (REQUIREMENTS_BASELINE §6: "a cadeia BR→REQ→UC→AC→TC que o §20 do Master Spec exige não existe em nenhum requisito do repositório"). Confirmado.
3. **9 comportamentos são UC-FANTASMA** (implementados e testados, sem UC no catálogo) e **os requisitos deste cluster têm ghost-requirements** (`REQ-IAM-D09..D14` são rótulos INFERRED, marcados INEXISTENTES no repo — não são requisitos versionados).

## 0.1 DIVERGÊNCIA DE AUDIT_COMMIT entre os insumos (achado próprio — CLAUDE.md Regras 12-14)

`.git/refs/heads/main` (HEAD real agora) = **`7b705f19...`**. Os insumos que estou consolidando foram fixados a commits DIFERENTES e diferentes entre si:

| Insumo | AUDIT_COMMIT declarado |
|---|---|
| Passo 26 — BUSINESS_RULE_CANDIDATES | "anterior ao AUDIT_COMMIT" (não datado) |
| Passo 27 — REQUIREMENTS_BASELINE | `c9359be3...` (tag `legacy-baseline-001`) |
| Passo 28 — USE_CASES_RECOVERED | `f05e865` |
| **HEAD real (passo 29)** | **`7b705f19...`** |

Três commits distintos. HEAD avançou além dos AUDIT_COMMITs dos passos 27 e 28. Meus spot-checks de arquivo:linha em HEAD (change-password :42/:139/:170, refresh :45/:93/:127, access-profiles, me-permissions :55/:89/:113, password-recovery :33/:84/:116) **bateram** com os artefatos — logo não houve drift material NESSES arquivos. Ainda assim, consolidar uma matriz sobre insumos de 3 commits diferentes é elo frágil por construção → **escalar ao director** (delta audit ou fixação de um AUDIT_COMMIT único para o passo 29).

> **NOTA DO ORQUESTRADOR (reconciliação, Regras 12-14):** os "3 commits distintos" são o timeline de commits de DOCUMENTAÇÃO de discovery — `c9359be` (baseline congelada), `f05e865` (passos 21-27), `7b705f1` (passo 28). **Nenhum arquivo de `src/` mudou** entre `c9359be` e `7b705f1`: todos os commits intermediários são exclusivamente docs de `coretriad`. Logo todas as trilhas do passo 29 auditam o MESMO código-fonte da baseline. O alerta fica preservado como evidência de que a verificação de integridade funcionou; a fragilidade é de forma (proveniência dos docs), não de substância (código auditado).

## 0.2 Colisão de UC-ID — verificação do cluster (premissa pedia checar)

**Não há colisão de UC-ID dentro deste cluster.** As colisões `UC-52/53/71` da premissa são de outros clusters. Aqui os `UC-IDACC-01..23` são todos distintos. A patologia deste cluster é outra:
- **OVERLOAD:** um único `UC-10` canônico é reusado para 7 endpoints de `users` (IDACC-09..13,15 — CF-2). Um ID, muitos comportamentos, contrato indefinido → **AMBÍGUO**, não colisão.
- **FANTASMA:** 9 comportamentos sem UC (IDACC-02,03,04,06,07,08,14,22,23).
- **doc×doc:** `OC-1` (draft propõe `GET /api/auth/me/menu`, endpoint inexistente) e `OC-2` (nível `V`/somente-leitura documentado, inexistente no código).

---

## 1. Tabela principal — uma linha por BR candidata do passo 26

Legenda de status do elo mais fraco: **PRESENTE** (cadeia inteira existe) · **QUEBRADO** (algum elo ausente) · **AMBÍGUO** (elo existe mas overloaded/contraditório/parcial). CÓDIGO citado da fonte + `[T]` = caminho confirmado por teste que o importa/mocka. REQ `ghost` = ID INFERRED não versionado (Regra 6).

| BR-ID (prov.) | gap | REQ (RF/RNF ou —) | UC-IDACC | CÓDIGO arquivo:linha | TC arquivo:linha | Elo + fraco | Observação |
|---|---|---|---|---|---|---|---|
| BR-IAM-001 | — | RNF:39 (hash bcrypt) | 03/06/08/11 (invariante) | `models/User.ts:123-133` | change-password-...:42 (indireto/stub) | **QUEBRADO** | Teste usa stub que SIMULA o hook; nenhum teste afirma bcrypt real nem custo=10. Custo só no código. |
| BR-IAM-002 | — | **—** (só API.md:273, não é requisito) | 03/06/08/11 (espalhada) | `AuthCredentialsEntity.ts:89-91`; `authValidators.ts:7,18` | **nenhum** | **QUEBRADO** | Sem RF; 3 implementações da mesma regra; limiar 6 × 8 (admin seed) conflitante; fronteira 5/6 sem teste. |
| BR-IAM-003 | — | RF-AUT-03 / SEC-10 | 06/08 (FANTASMA) | `User.ts:127-131`; `auth.ts:99-103` `[T]` | change-password-...:42,139,170; password-recovery:64-65 | **QUEBRADO** | Regra e teste OK; elo UC quebra (change-password/reset são FANTASMA, sem UC de catálogo). |
| BR-IAM-004 | — | **—** (só código) | 06 (FANTASMA) | `ChangePasswordUseCase.ts:55-58` `[T]` | change-password-...:78 | **QUEBRADO** | REQ e UC ausentes. Regra NÃO existe no reset (ResetPasswordUseCase.ts:54) — assimetria. |
| BR-IAM-005 | — | RF-AUT-01 / NFR-SEC-01 (RNF:32) | 01 (P) / 02 (FANTASMA) | `runtimeEnv.ts:50,247-258`; `TokenService.ts:9-13` `[T]` | auth-refresh:45,93 | **AMBÍGUO** | UC parcial: TTL emitido no login (UC-01 P) e preservado no refresh (UC-02 FANTASMA). Sem teto de TTL validado. |
| BR-IAM-006 | — | RF-AUT-02 | 02 (FANTASMA) | `routes/auth.ts:14`; `authController.ts:67-77` `[T]` | auth-refresh:45,93,127 | **QUEBRADO** | Doc×código×teste batem; elo UC quebra — refresh não tem UC no catálogo. |
| BR-IAM-007 | — | RF-AUT-01 / NFR-SEC-02..06 (RNF:34-38) | 01/02/03/07/08 (espalhada) | `server/app.ts:54-127` | **nenhum** | **QUEBRADO** | Os 5 limiares batem com a doc; prova de teste ZERO (NFR-SEC NOT_VALIDATED). |
| BR-IAM-008 | — | RF-AUT-03 (SEC-12) | 07/08 (FANTASMA) | `ForgotPasswordUseCase.ts:17,45-50`; `ResetPasswordUseCase.ts:45,50-56` `[T]` | password-recovery:15-22,33,84 | **QUEBRADO** | Regra e testes fortes; elo UC quebra (forgot/reset FANTASMA). |
| BR-IAM-009 | — | RF-AUT-03 (**CONFLICTING** 401×422) | 08 (FANTASMA) | `ResetPasswordUseCase.ts:51` (401) `[T]` | password-recovery:76,107 | **QUEBRADO** | Código+teste em 401; API.md:274-275 publica 422. Integrador pela doc trata erro errado (CF-1). |
| BR-IAM-010 | — | RF-AUT-01 (API.md:165) | 01 (CONFIRMED) | `LoginUseCase.ts:47-70`; `auth.ts:94-97` | **nenhum** (login anti-enum) | **QUEBRADO** | Anti-enumeração do LOGIN não é asseverada por teste (o teste de forgot cobre outro endpoint). |
| BR-IAM-011 | — | RF-AUT-09 / RF-AUT-01 | 01 (CONFIRMED) | `LoginUseCase.ts:48-80`; `authController.ts:38,42-44` | **nenhum** (auditoria de FALHA) | **QUEBRADO** | Único fluxo que audita falha; nenhum teste prova que a falha grava audit log. |
| BR-IAM-012 | — | **ghost** REQ-IAM-D09 | 14 (FANTASMA) | `RevokeUserSessionsUseCase.ts:28-45`; `SequelizeUsersRepository.ts:68-70` `[T]` | password-recovery:116 | **QUEBRADO** | Implementado+testado; sem REQ versionado e sem UC de catálogo. |
| BR-IAM-013 | — | RF-AUT-04/05/07 (§1/§3) | 09-15,16-23 (admin-only) | `users.ts:14-20`; `accessProfiles.ts:21-26`; `auditLogs.ts:12-13`; `auth.ts:15` | module-authorization-map:147 (nominal) | **QUEBRADO** | A guarda estrutural **EXCLUI** users/accessProfiles/auditLogs/auth (linhas 120-133) e só checa cobertura. **Nenhum teste positivo** de operator→403 nas 15 rotas do cluster (rbac-critical-routes e legacy-rbac não tocam estas rotas). |
| BR-IAM-014 | — | RF-AUT-04 (**CONFLICTING**) | 12/13 (UC-10, divergente) | `DeactivateUserUseCase.ts:32-34` (bloqueia) vs `UpdateUserUseCase.ts:39-49` (contorna) | **nenhum** | **QUEBRADO** | Regra única, 2 implementações divergentes: `PUT {active:false}` no próprio id fura o bloqueio do DELETE. Auto-lockout com admin único. **Candidato a finding HIGH (CF-5).** |
| BR-IAM-015 | — | RF-AUT-04 (§13, **CONFLICTING**) | 03/11/12 (validação assimétrica) | `CreateUserUseCase.ts:43-45` (valida) vs `UpdateUserEntity.ts:48-55` + `RegisterUserUseCase.ts:49` (não valida) | **nenhum** | **QUEBRADO** | role validado só no POST /users; PUT e register caem no ENUM Postgres → 500 genérico (CF-7). |
| BR-IAM-016 | — | RF-AUT-04 | 12 (UC-10) | `UpdateUserEntity.ts:49-51` | **nenhum** | **QUEBRADO** | PUT nunca troca senha; sem teste. |
| BR-IAM-017 | — | RF-AUT-04 | 11/12 (UC-10) | `User.ts:62-68`; `CreateUserUseCase.ts:55-59` etc. | **nenhum** (conflito de e-mail em users) | **QUEBRADO** | E-mail único/válido; nenhum teste de use-case de users exercita o ConflictError. |
| BR-IAM-018 | — | RF-AUT-05 (§2, UC-33) | 15 (CONFIRMED) | `User.ts:108-113`; `AssignAccessProfileUseCase.ts:69` `[T]` | access-profiles:365,417 | **PRESENTE** | Cadeia completa. Substitui (não acumula); null remove. |
| BR-IAM-019 | — | RF-AUT-05/07 (§3) | 05 (CONFIRMED) | `auth.ts:226-229`; `GetMyPermissionsUseCase.ts:37-46` `[T]` | access-profiles:47; auth-me-permissions:113 | **PRESENTE** | Admin curto-circuito (inclusive ordem) coberto. |
| BR-IAM-020 | — | RF-AUT-05/07 (UC-35-Exc) | 05 (CONFIRMED) | `auth.ts:107,246-256` `[T]` | access-profiles:58; auth-me-permissions:89 | **PRESENTE** | Sem perfil = bloqueio total + auditoria. |
| BR-IAM-021 | — | RF-AUT-08 (§1/§4, **CONFLICTING** 4×2) | 19/20 (níveis) | `accessModules.ts:248`; `AccessProfilePermission.ts:61-65`; `validatePermissions.ts:28-30` `[T]` | access-profiles:107,131,148 (operate/approve) | **AMBÍGUO** | Doc: 4 níveis (`-/V/O/A`); código: 2 (`operate/approve`). Nível `V`/somente-leitura é **INEXISTENTE no código** (OC-2) — link doc→código quebrado nesse sub-elo. **Candidato a finding HIGH (CF-6).** |
| BR-IAM-022 | — | RF-AUT-08 (§4, **CONFLICTING**) | 15 (UC-36) | `auth.ts:213-285` (colapsado); `AssignAccessProfileUseCase.ts:78` (msg) | **nenhum** (conteúdo da msg) | **QUEBRADO** | Log grava "efetivo no próximo login, UC-36", mas API vale no request seguinte. Msg de auditoria mente ao auditor (CF-8). Nenhum teste checa o texto do log. |
| BR-IAM-023 | — | RF-AUT-05 (UC-32) | 21/15 (CONFIRMED) | `DeactivateAccessProfileUseCase.ts:51-57`; `AssignAccessProfileUseCase.ts:61-66` `[T]` | access-profiles:298,388 | **PRESENTE** | Perfil em uso não desativa (422+lista); inativo não atribuível. |
| BR-IAM-024 | — | RF-AUT-05 (UC-30/31) | 19/20 (CONFIRMED) | `CreateAccessProfileUseCase.ts:48-58`; `validatePermissions.ts:14-37` `[T]` | access-profiles:181,198,208,221 | **PRESENTE** | Nome único, ≥1 módulo, módulo válido/não repetido. |
| BR-IAM-025 | — | RF-AUT-09 (§5) | 20/15 (CONFIRMED) | `UpdateAccessProfileUseCase.ts:83-84`; `AuditLog.ts:149` `[T]` | access-profiles:265 | **PRESENTE** | old/new completos testados. **Ressalva de governança:** audit-coverage-guard:16-18 afirma que users/accessProfiles não auditam — **falso hoje** (auditam no use case); a guarda mede só o controller (:82-85) → BR-IAM-025 é o débito com premissa invertida. |
| BR-IAM-026 | — | NFR-AUDIT-01 (RNF:48, **CONFLICTING**) / ghost REQ-IAM-D10 | 03 (FANTASMA) | `authController.ts:87-97` (não chama logAction); `RegisterUserUseCase.ts` (sem auditoria) | **nenhum** (guarda módulo-nível não pega) | **QUEBRADO** | POST /auth/register cria usuário SEM auditar; POST /users audita. audit-coverage-guard passa para `auth` porque OUTROS handlers auditam — o buraco do register é invisível à guarda. **Candidato a finding HIGH (CF-4).** |
| BR-IAM-027 | — | RF-AUT-09 (§5:184-186) | 05/19-21 (authorizeModule) | `auth.ts:231-242,247,261,273` `[T]` | access-profiles:80-83 (só NO_ACCESS_PROFILE) | **AMBÍGUO** | **Detalhe que corrige o passo 26:** o doc dizia "nenhum teste"; access-profiles:80-83 **de fato** afirma logAction(access_denied) para o 403 NO_ACCESS_PROFILE. Mas MODULE_ACCESS_DENIED (:86) e APPROVAL_LEVEL_REQUIRED (:107) NÃO checam o log → cobertura parcial (1 de 3 motivos). |
| BR-IAM-028 | — | RF-REL-07 (§5:182-183) | 22/23 (FANTASMA) | `auditLogs.ts:12-13` (só GET; sem rota de escrita) | auditLogs-use-cases:6,22 (list/get, não imutabilidade) | **QUEBRADO** | Imutabilidade garantida SÓ por ausência de rota; **sem trigger de banco** (FIND-ERP-002); UCs de consulta são FANTASMA; nenhum teste afirma a imutabilidade. |
| BR-IAM-029 | — | **—** (SSOT em código, sem RF) | transversal | `auditActions.ts` (SSOT); `AuditLog.ts:80`; `auditLogService.ts:135-213` `[T]` | audit-action-vocabulary; audit-log-register-normalization:47-98; audit-log-action-downgrade | **QUEBRADO** | Comportamento bem coberto por teste, mas **sem RF** que o documente e sem UC (elo REQ quebrado). Nota: `assign`→`permission_change` na gravação (register-normalization:84-88). |
| BR-IAM-030 | — | **ghost** F-09 (INFERRED) | transversal | `auditLogService.ts:92-98,122` `[T]` | audit-log-failure-alerting:40,64,95 | **QUEBRADO** | Fire-and-forget testado (retry+persist+webhook), mas **sem requisito de negócio aprovado** — operação sensível conclui mesmo com auditoria falhando 2×. Risco de compliance (F-09 ALTO). |
| BR-IAM-031 | — | NFR-AUDIT-01 (RNF:48, **CONFLICTING**) / ghost REQ-IAM-D14 | **fora do cluster** (items) | `itemController.ts:65,84,98,135,167,185,203` (0 logAction) | audit-coverage-guard:49-63 (trava o débito) | **AMBÍGUO / FORA DE ESCOPO** | Regra do módulo `items`, não de identidade-acesso; incluída como referência cruzada. Teste "cobre" o DÉBITO, não a regra. |
| BR-IAM-032 | — | **—** (sem RF; comportamento) | 04 (FANTASMA)/invariante | `User.ts:153-159`; `auth.ts:78`; `SequelizeUsersRepository.ts:31,43` | **nenhum** (afirma ausência de segredo) | **QUEBRADO** | toJSON remove password/token; nenhum teste afirma a ausência dos campos; UC (me) é FANTASMA. |
| BR-IAM-033 | — | **ghost** REQ-IAM-D13 | — (bootstrap, sem UC) | `seeds.ts:128-148`; `runtimeEnv.ts:127-133` | não confirmado (runtime-env.test.ts não relido) | **QUEBRADO** | Admin `admin@evokaudio.com.br` hardcoded; limiar 8 contradiz o 6 (BR-IAM-002). Sem UC, sem RF versionado. |
| BR-IAM-034 | — | **ghost** REQ-IAM-D12 (UNKNOWN) | — | **inexistente** (sem código) | — | **QUEBRADO** | Retenção/expurgo de audit_logs e de inativos: regra INEXISTENTE em doc e código. Todos os elos ausentes → decisão humana (Regra 21). |
| BR-IAM-035 | — | RF-AUT-06 (UC-34) | 05 (CONFIRMED vs SSOT) | `GetMyPermissionsUseCase.ts:36-52`; `auth.ts:74-112` `[T]` | auth-me-permissions:55,89,113 | **PRESENTE** | me/permissions sem query extra; join único. (Ressalva doc×doc OC-1: draft cita /me/menu inexistente.) |
| BR-IAM-036 | — | **ghost** REQ-IAM-D11 / RF-REL-07 | 22 (FANTASMA) | `ListAuditLogsUseCase.ts:42-52` `[T]` | auditLogs-use-cases:15-18 (limitação codificada) | **QUEBRADO** | O teste **trava** que só 5 filtros são passados (sem user_id/success) — a limitação está codificada, mas o REQ é ghost e o UC FANTASMA. |
| BR-IAM-037 | — | **—** (convenção, sem doc) | transversal | `auditLogService.ts:113-116`; `authController.ts:163,229` | **nenhum** (pós-commit) | **QUEBRADO** | Convenção "logAction depois do commit"; nenhum teste afirma a ordenação; sem RF. |
| BR-IAM-038 | — | **—** (AUSENTE) | — | **inexistente** | — | **QUEBRADO** | Rotação/expiração/lockout: regra INEXISTENTE. `passwordVersion` não é rotação. UNKNOWN → director. |
| BR-IAM-039 | — | **—** (comentário obsoleto) | — | `AccessProfilePermission.ts:17-19` (texto normativo obsoleto) | — | **AMBÍGUO** | Comentário afirma "segunda trava nivel=gestor" que o middleware NÃO executa (§4 colapsou). OBSOLETE_CANDIDATE; remoção é da SanaCore. |

---

## 2. Elos reversos — o que existe no código sem âncora

### 2.1 UCs FANTASMA (comportamento no código, sem UC no catálogo) — 9

| UC-IDACC | Endpoint | Tem teste? | BR associada |
|---|---|---|---|
| 02 | `POST /api/auth/refresh` | SIM (auth-refresh) | BR-IAM-006/005 |
| 03 | `POST /api/auth/register` | **NÃO** | BR-IAM-026/015/002 |
| 04 | `GET /api/auth/me` | parcial (usado como sonda em password-recovery :64) | BR-IAM-032 |
| 06 | `PUT /api/auth/change-password` | SIM (change-password-...) | BR-IAM-004/003 |
| 07 | `POST /api/auth/forgot-password` | SIM (password-recovery :15) | BR-IAM-008 |
| 08 | `POST /api/auth/reset-password` | SIM (password-recovery :33,84) | BR-IAM-008/009 |
| 14 | `POST /api/users/:id/revoke-sessions` | SIM (password-recovery :116) | BR-IAM-012 |
| 22 | `GET /api/audit-logs` | SIM (auditLogs-use-cases :6) | BR-IAM-028/036 |
| 23 | `GET /api/audit-logs/:id` | SIM (auditLogs-use-cases :22) | BR-IAM-028 |

### 2.2 UCs sem teste (o buraco de `users`) — 8 de 23

`03` register, `09` list users, `10` get user, `11` create user, `12` update user, `13` deactivate user, `16` list modules, `18` get profile. **Toda a superfície de ESCRITA de `users` (criar/atualizar/inativar = IDACC-11/12/13) e o register (03) têm ZERO teste de use-case.** Glob por `Create/Update/Deactivate/RegisterUserUseCase` em `server/tests/**` → nenhum arquivo. Só `revoke` (14, integração) e `assign` (15, unit — mas é operação de perfil) exercitam o módulo `users`. Os 4 use-cases que controlam quem entra no ERP não têm teste vinculado (CF-9).

### 2.3 REQs fantasma deste cluster (INFERRED sem requisito versionado)

`REQ-IAM-D09` (revoke), `D10` (register sem auditar), `D11` (filtros audit), `D12` (retenção), `D13` (admin bootstrap), `D14` (items sem rastro). Mais `F-09` (fire-and-forget). Nenhum é requisito versionado — são rótulos de trabalho marcados INEXISTENTES (Regra 6).

### 2.4 Código sem BR (comportamento sem regra candidata)

Não achei comportamento de identidade-acesso órfão de BR — o passo 26 cobriu bem os 4 módulos. O inverso é o problema: BRs sem REQ/UC/TC. **Confirmação positiva relevante:** o `role` comparado em `authorize()` vem de `User.findByPk` dentro de `authenticate` (`auth.ts:77-119`) — lido do banco, **não do body/token** → **nenhum caso deste cluster incorre na Regra 24 do CLAUDE.md** (role client-side). Isto é confirmação, não finding.

---

## 3. Placar de rastreabilidade

**Cadeia completa BR→REQ→UC→CÓDIGO→TC (todos PRESENTE): 7 de 39 (18%)** — BR-IAM-018, 019, 020, 023, 024, 025, 035. Todos no núcleo de **perfis de acesso** (accessProfiles) + me/permissions, que é onde existe `access-profiles.test.ts`/`auth-me-permissions.test.ts`.

**Distribuição do elo mais fraco:**
| Status | Qtd | BR-IDs |
|---|---|---|
| PRESENTE (cadeia completa) | 7 | 018,019,020,023,024,025,035 |
| AMBÍGUO | 4 | 005, 021, 027, 031(fora de escopo) |
| QUEBRADO | 28 | 001,002,003,004,006,007,008,009,010,011,012,013,014,015,016,017,022,026,028,029,030,032,033,034,036,037,038,039 |

**Onde cada elo quebra (uma linha pode quebrar em mais de um elo):**
- **REQ quebrado** (ghost / sem RF): ≥12 — 002,004,012,029,030,032,033,034,036,037,038,039.
- **UC quebrado** (comportamento em UC-FANTASMA / sem catálogo): ≥10 — 003,004,006,008,009,012,026,028,032,036.
- **CÓDIGO quebrado** (regra inexistente): 2 — 034, 038 (+039 é comentário obsoleto).
- **TC quebrado** (sem teste ou teste nominal): ≥16 — 001,002,007,010,011,013,014,015,016,017,022,026,028,032,033,037.

**Cobertura de teste real por UC (§ regra 3 — só conta se o describe/it exercita o comportamento com asserção):**
- **Testado com asserção de comportamento: 13/23 (57%)** — 02,05,06,07,08,14,15,17,19,20,21,22,23.
- **Parcial (endpoint exercitado como sonda, regra própria não asseverada): 2/23** — 01 (login), 04 (me).
- **Sem teste: 8/23 (35%)** — 03,09,10,11,12,13,16,18.

**Regras CRITICAL/HIGH sem teste real:** BR-IAM-002 (min 6), BR-IAM-007 (rate-limits), BR-IAM-013 (admin-only, só guarda estrutural que exclui o cluster), BR-IAM-014 (auto-inativação, além de contornável), BR-IAM-015 (role), BR-IAM-026 (register sem auditar), BR-IAM-032 (toJSON).

---

## 4. Causas-raiz da quebra (objetivas, com evidência)

1. **Ausência de BR-ID canônico + de cadeia REQ→AC→TC (raiz primária).** REQUIREMENTS_BASELINE §6: "nenhum dos 90 RFs tem OWNER, critério de aceite (AC-) ou aponta para um TC-". Sem esse esqueleto, todo elo REQ→TC é reconstrução manual — 32 de 39 linhas quebram por isso. Escalar ao director (lacuna de governança).
2. **Sub-documentação por UC (raiz do elo UC).** 9 comportamentos são FANTASMA e 7 endpoints de `users` colapsam num único `UC-10` vago (overload). Evidência: passo 28, "8 dos 8 endpoints admin que não são UC-01/10/33 não têm UC formal 1:1". O código está documentado por REGRA e por REQUISITO, mas não por UC → o elo UC quebra estruturalmente.
3. **Ausência de estratégia de testes (raiz do elo TC).** `NFR-MAINT-D05 (AUSENTE)`: não existe documento de estratégia de testes (REQUIREMENTS_BASELINE §5). Consequência medida: módulo `users` inteiro sem teste de use-case; regras CRITICAL sem teste. As guardas estruturais existentes (`module-authorization-map`, `audit-coverage-guard`) medem cobertura/estrutura e **excluem ou não enxergam** o cluster — dão falsa sensação de rede.
4. **Guardas com premissa/medição invertida (elo TC nominal).** `audit-coverage-guard` mede `logAction` só no controller (:82-85), enquanto users/accessProfiles auditam no use case → a lista de débito :49-63 afirma um fato falso hoje (BR-IAM-025) e não pega o buraco real do register (BR-IAM-026). `module-authorization-map` exclui o cluster (:120-133) e só checa cobertura de pastas, não a imposição admin-only (BR-IAM-013).
5. **Divergência doc-de-API × código não reconciliada.** BR-IAM-009 (401×422) e OC-1 (`/me/menu` inexistente): a documentação publica um contrato que o código não cumpre — elo REQ/UC "presente" mas contraditório (AMBÍGUO/CONFLICTING).
6. **Regras inexistentes tratadas como implícitas.** BR-IAM-034 (retenção) e BR-IAM-038 (rotação/lockout): elo CÓDIGO ausente — não há como rastrear o que não foi decidido (UNKNOWN → Regra 21).
7. **Insumos fixados a 3 AUDIT_COMMITs distintos** (§0.1): a matriz é construída sobre bases não coincidentes; frágil por construção (ver nota do orquestrador em §0.1 — código-fonte idêntico à baseline).

---

## 5. Candidatos a finding (NÃO promovidos — seguem ao passo 31; CRITICAL/HIGH passam pelo vericore-finding-validator)

Nenhum item abaixo é finding formal. Evidência em arquivo:linha nos dois lados; consolida os candidatos dos passos 26/27/28 sob a ótica de rastreabilidade.

- **CT-1 (governança, HIGH):** cadeia BR→REQ→UC→AC→TC inexistente no cluster; 39 regras sem BR-ID canônico, 0 RF com AC/TC, 0 owner. Elo estrutural quebrado em 32/39. (Consolida REQUIREMENTS §8 #6.)
- **CT-2 (auditoria assimétrica, HIGH):** `POST /api/auth/register` cria usuário sem auditar (BR-IAM-026), invisível às guardas; contradiz NFR-AUDIT-01 `[IMPLEMENTADO]`. (=CF-4.)
- **CT-3 (regra contornável, HIGH):** auto-inativação bloqueada no DELETE e furada no PUT (BR-IAM-014); auto-lockout com admin único. (=CF-5.)
- **CT-4 (níveis de acesso, HIGH):** somente-leitura (`V`) inexprimível — doc 4 níveis × código 2 (BR-IAM-021/OC-2); perfil "só ver" recebe escrita. (=CF-6.)
- **CT-5 (rastreabilidade UC, MEDIUM):** 9 comportamentos sem UC + `users` sub-documentado em UC-10 overloaded (CF-2/CF-3).
- **CT-6 (cobertura de teste, MEDIUM/insumo):** superfície de escrita de `users` (IDACC-03,09,10,11,12,13) sem teste; 7 regras CRITICAL/HIGH sem teste real (CF-9).
- **CT-7 (contrato doc×código, MEDIUM):** BR-IAM-009 reset-password 401×422 (CF-1); OC-1 `/me/menu` fantasma.
- **CT-8 (guarda que mede o lugar errado, MEDIUM):** audit-coverage-guard com premissa invertida sobre users/accessProfiles (BR-IAM-025) e cega ao register.
- **CT-9 (mensagem de auditoria enganosa, MEDIUM):** log "efetivo no próximo login, UC-36" × API imediata (BR-IAM-022/CF-8).
- **CT-10 (lacunas de decisão, MEDIUM):** BR-IAM-034 (retenção) e BR-IAM-038 (rotação/lockout) inexistentes; BR-IAM-030 fire-and-forget sem decisão aprovada; BR-IAM-002 limiar 6×8. → Regra 21.
- **CT-11 (integridade do baseline, MEDIUM):** insumos em 3 AUDIT_COMMITs distintos e HEAD (`7b705f19`) além deles → fixar AUDIT_COMMIT único ou delta audit (Regras 12-14). Ver nota do orquestrador em §0.1.

---

## 6. O que esta matriz NÃO afirma

- Não decide qual lado está certo em nenhuma divergência (Regras 20-21); não promove finding nem atribui severidade final.
- Não executou teste, script ou consulta de banco — READ-ONLY REFORÇADO em auth/users/auditLogs (produção real). "Testado" = existe describe/it que exercita a asserção do comportamento; não que passa.
- Não auditou o frontend (menu cacheado do UC-36, telas de UC-35/36) nem a matriz USER→ROLE→PERMISSION completa (fronteira do authorization-auditor).
- Não reli `runtime-env.test.ts` — a cobertura de teste de BR-IAM-033 (admin bootstrap) fica "não confirmada", não "ausente".
- BR-IAM-031 é do módulo `items` (fora do cluster), incluída só como referência cruzada.
- Não preencheu elo por inferência: onde não há evidência, o elo está marcado **QUEBRADO** ou **AMBÍGUO**, nunca em branco.

---

**Arquivos-fonte lidos em disco (HEAD `7b705f19`):**
- Insumos: `docs/coretriad/projects/ERP-LEGACY-001/discovery/{BUSINESS_RULE_CANDIDATES_identidade-acesso, USE_CASES_RECOVERED_identidade-acesso, REQUIREMENTS_BASELINE}.md`
- Testes (TC verificados por leitura): `server/tests/unit/{change-password-session-invalidation, auth-refresh, access-profiles, auditLogs-use-cases, audit-coverage-guard, module-authorization-map, audit-log-failure-alerting, audit-action-vocabulary, audit-log-register-normalization, rbac-critical-routes}.test.ts`; `server/tests/integration/{password-recovery-and-session-revocation, auth-me-permissions, legacy-routes-rbac-regression}.test.ts`
- CÓDIGO citado da rastreabilidade dos passos 26/28; caminhos marcados `[T]` confirmados pelos imports/mocks dos testes acima.

*Produzido por `vericore-traceability-auditor` em modo read-only reforçado; devolvido como TEXTO para persistência pelo orquestrador (o hook org-isolation bloqueia escrita de VeriCore fora de `audit/`; destino `docs/coretriad/…`). Nenhum arquivo alterado.*
