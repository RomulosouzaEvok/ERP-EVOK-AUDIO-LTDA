# T-02 — TIER1 IDENTIDADE (`auth`, `users`) — RELATÓRIO DE TRILHA

`AUDIT_COMMIT c1311a6f76b512fef893f7e60d934179cae3409f` · titular
`vericore-authentication-auditor` · regime `APR-2026-016` (nenhuma execução,
nenhuma conexão de banco, nenhum login, nenhuma forja de token). Nenhuma
evidência cita `c9359be`.

> **Nota de persistência (transparência de processo).** Conteúdo produzido pelo
> agente `vericore-authentication-auditor` (trilha T-02) e persistido **sem
> alteração** pelo `coretriad-director`/orquestrador, porque a ferramenta Write
> estava desabilitada para o agente nesta sessão. Mesmo padrão de
> persistência-pelo-orquestrador dos passos 23/24 e da validação dos findings
> preliminares. O juízo de auditoria permanece integralmente atribuído à trilha
> VeriCore; o orquestrador não alterou severidade, confiança, veredito nem texto.
>
> **Adendo do orquestrador sobre a lacuna L-T02-01 — ver §10.** A lacuna
> declarada pela trilha foi verificada e o resultado está registrado ao final,
> claramente separado do juízo da trilha.

## 1. Superfície — 15/15 endpoints, cobertura E

`server/src/modules/auth/presentation/routes/auth.ts` (8) e
`server/src/modules/users/presentation/routes/users.ts` (7):

| Rota | AuthN | AuthZ | Linha |
|---|---|---|---|
| POST `/api/auth/login` | público por desenho | — | auth.ts:13 |
| POST `/api/auth/refresh` | `authenticate` | — | auth.ts:14 |
| POST `/api/auth/register` | `authenticate` | `authorize('admin')` | auth.ts:15 |
| GET `/api/auth/me` · `/me/permissions` | `authenticate` | — | auth.ts:16-17 |
| PUT `/api/auth/change-password` | `authenticate` | — | auth.ts:18 |
| POST `/api/auth/forgot-password` · `/reset-password` | público por desenho | — | auth.ts:19-20 |
| GET/POST/PUT/DELETE `/api/users…` + `/revoke-sessions` + `/access-profile` | `authenticate` | `authorize('admin')` | users.ts:14-20 |

**12 autenticados · 3 públicos-por-design documentados · 0 desprotegidos por
omissão.** Montagem conferida em `server/app.ts:143-151`; `server/src/routes/`
contém apenas `health.ts` — não há router legado paralelo.

## 2. VEREDITO DA REGRA 24

**Método:** leitura integral dos 15 endpoints + 15 use cases + model +
TokenService + runtimeEnv + `middlewares/auth.ts`; varredura server-wide
`req.(body|query|headers|params)` × `role|userRole|isAdmin|perfil|permission`
(**5 ocorrências em todo `server/`**); varredura `req.headers['x-…']` (**0 em
`src/`**); varredura `jwt.sign|verify|decode` (**3 em código de produção**).

Adjudicação das 5: `userController.ts:100` e `authController.ts:89` gravam papel
de terceiro sob `authorize('admin')` — atribuição administrativa, não
autodeclaração; `contractController.ts:166` (`desiredRole`) é **intersectado**
com os papéis resolvidos por RBAC em `ApproveContractUseCase.ts:66-70`
(`if (!input.availableRoles.includes(input.desiredRole)) throw`);
`ipAssetController.ts:27-29` lê `req.user.role`;
`tests/unit/rbac-critical-routes.test.ts:30,38` é mock, inexistente em runtime.

**Cadeia provada:** `LoginUseCase.ts:72` → `TokenService.ts:9` assina **apenas**
`{id, passwordVersion}` → `middlewares/auth.ts:69` verifica com
`issuer`/`audience` → `:77` recarrega `User` + `AccessProfile` + permissões **do
banco a cada request** → `:89-103` rejeita inexistente/inativo/`passwordVersion`
obsoleto → `:114-128` monta `req.user` 100% do banco → `:158`/`:226` decidem
authZ.

> **VEREDITO: Regra 24 NÃO violada nos 15 endpoints.** A hipótese da triagem
> SanaCore (EMENDA-01 §B.4) é **confirmada por verificação própria da VeriCore**,
> e passa a valer como evidência VeriCore.

**Ressalva material que o veredito não dispensa:** a propriedade só vale
enquanto a assinatura for confiável. O AUD-AUTHN-01 mostra que a chave do
ambiente PRODUÇÃO REAL tem default versionado — o atacante não declara papel
nenhum: forja `{id:1}` e o servidor **carrega admin do próprio banco,
legitimamente**. O resultado que a Regra 24 existe para impedir é alcançado por
outro caminho. O veredito é literal e correto; **não** é atestado de identidade
inforjável.

## 3. Findings

**AUD-AUTHN-01 — CRITICAL / HIGH_CONFIDENCE / PROPOSED — chave de assinatura JWT
com default versionado no ambiente de produção real.**
`docker-compose.yml:54` → `JWT_SECRET: ${JWT_SECRET:-dev-only-change-me-please-change-me-123456789}`;
`docker-compose.yml:43` → `NODE_ENV: ${NODE_ENV:-development}`;
`server/src/config/runtimeEnv.ts:73` → `if (env.NODE_ENV !== 'production') { return; }`
desliga todo o `superRefine`, inclusive a rejeição de placeholder da linha 103
(`ENV_PLACEHOLDER_PATTERN`, linha 12, casa com `dev-only-change-me`); a única
guarda sempre ativa é `length < 32` (`:250`) e o default tem 42 caracteres —
**passa**. Mesma chave emite (`TokenService.ts:9`) e verifica
(`middlewares/auth.ts:69`). API em `0.0.0.0:5000` (`docker-compose.yml:67`).
Esse compose hospeda o dado real por `APR-2026-016`. Impacto: token forjado para
qualquer `id` recebe autorização administrativa legítima em todos os 681
endpoints, sem senha, sem que `revoke-sessions` contenha, sem rastro
distinguível.
*Não afirmado:* se a instância define `JWT_SECRET` no `.env` (E6, não
versionado) — lacuna L-T02-01, pergunta ao dono. O defeito provado é do artefato
versionado.

**AUD-AUTHN-02 — HIGH — senha do admin de bootstrap com default versionado.**
`docker-compose.yml:57` (`ADMIN_SEED_PASSWORD:-dev-only-change-me-please`) +
`server/src/config/seeds.ts:128-148` (semeia `admin@evokaudio.com.br`,
`role:'admin'`; fallback `'dev-only-change-me'` na linha 138; comprimento curto
só **avisa**, `:139-141`). **Controle compensatório encontrado:**
`seeds.ts:117-121` aborta se `User.count() > 0` — por isso HIGH, não CRITICAL.
Risco é de provisionamento (restauração, réplica, segundo PC). Valida BR-IAM-033.

**AUD-AUTHN-03 — HIGH — chave do rate limiter derivada de JWT não verificado.**
`server/app.ts:74-90`: `apiRequestKey()` usa `jwt.decode(...)` (linha 79, **sem
verificação**) e devolve `user:${decoded.id}`; alimenta o `apiLimiter`
(`:105-116`, 300/15min), único teto agregado de `/api`. `loginAttemptKey`
(`:48-52`) é `${ip}:${email}` — contador **independente por par**. O comentário
`app.ts:44-47` afirma que "um atacante testando N contas do mesmo IP ainda soma
por IP via `ipKeyGenerator`" — **o código não faz isso**. Consequências: (a)
password spraying não é contido pelo `authLimiter`; (b) o teto residual é
anulável por qualquer anônimo enviando `Bearer` lixo com `id` rotativo, porque o
limiter roda antes de `authenticate` e não valida nada. Delimitação honesta: o
`refreshLimiter` usa a mesma chave mas exige token válido — o bypass não o
atinge.

**AUD-AUTHN-04 — MEDIUM — sem lockout de conta / sem detecção de credential
stuffing.** Único controle é `app.ts:54-59` (10/15min, janela que libera
sozinha). `server/src/models/User.ts:21-35` não tem
`failed_login_attempts`/`locked_until`; `LoginUseCase.ts:48-62` audita a falha e
nada a consome. Valida BR-IAM-038. ASVS 2.2.1/2.2.3.

**AUD-AUTHN-05 — MEDIUM — sessão sem logout server-side, sem revogação
individual, sem vida absoluta.** Não há endpoint de logout (`auth.ts:13-20`);
`runtimeEnv.ts:50` → `JWT_EXPIRE` default `'7d'`; `authController.ts:67-77` +
`RefreshTokenUseCase.ts:47-50` renovam de forma deslizante **sem limite de
encadeamento**; a única revogação (`middlewares/auth.ts:99-103`) é coletiva.
Token vazado vive até 7 dias e renova indefinidamente enquanto a senha não
mudar; o usuário não consegue encerrar a própria sessão. Detecção de reuso é
inexistente por construção (não há refresh token separado — BR-IAM-006).

**AUD-AUTHN-06 — MEDIUM — o único ponto de hash de senha é contornável pelo
repositório genérico.** `server/src/models/User.ts:118-134` (`beforeSave`) é o
único lugar que aplica bcrypt e incrementa `passwordVersion` (violação V3 da
AS-IS). `SequelizeUsersRepository.ts:59-62` usa
`User.update(data, {where:{id}})` — **bulk update**, que dispara
`beforeBulkUpdate`, não `beforeSave`, salvo `individualHooks:true`, ausente.
Chamadores: `UpdateUserUseCase.ts:60`, `DeactivateUserUseCase.ts:41`,
`AssignAccessProfileUseCase.ts:69`. **Controle compensatório:**
`UpdateUserEntity.ts:49-51` rejeita `password` e `:64-71` faz allowlist — **não
há exploração hoje**, daí MEDIUM. É finding porque o contrato "toda escrita de
senha passa pelo hook" é falso e o que o sustenta é uma allowlist em outra
camada, sem teste que a prenda: a primeira linha que acrescentar `password` ao
`toUpdateData()` grava texto claro com typecheck e suíte verdes.

**AUD-AUTHN-07 — MEDIUM — proteções de conta administrativa contornáveis, sem
guarda de "último admin".** `DeactivateUserUseCase.ts:31-34` proíbe
auto-inativação no DELETE; `UpdateUserUseCase.ts:39-60` não tem a guarda e
aceita `active:false` (`UpdateUserEntity.ts:69`) — mesma operação pelo PUT
contorna a regra (valida BR-IAM-014 por leitura própria). Ausentes: verificação
de "não deixar o sistema sem admin ativo" e segregação sobre a própria conta.
Registrado para evitar falso positivo: a expulsão por `!active` **funciona** no
request seguinte (`middlewares/auth.ts:94-97`).

**AUD-AUTHN-08 — MEDIUM — `POST /api/auth/register` sem validação de papel e sem
audit log.** `RegisterUserUseCase.ts:40-50` passa `role` do body a `createUser`
sem confronto com `VALID_ROLES`, enquanto `CreateUserUseCase.ts:43-45` valida —
assimetria confirmada (BR-IAM-015). Valor inválido só é barrado pelo ENUM
(`User.ts:74-78`), virando 500 genérico (`errorHandler.ts:99-111`) em vez de
400. Agravante: `authController.register` (`:87-97`) é o único dos 15 endpoints
que **cria usuário sem `logAction`** — criação de conta `admin` sem rastro
(BR-IAM-026). Insumo para T-03.

**AUD-AUTHN-09 — LOW — política de senha abaixo do mínimo defensável.**
`AuthCredentialsEntity.ts:89-91` e `authValidators.ts:7,18` (mínimo 6); sem
complexidade, sem checagem de senha vazada, sem histórico, sem rotação
(BR-IAM-002/038). bcrypt custo 10 literal em `User.ts:125` — no piso do ASVS,
sem parâmetro. Positivo confirmado: `User.ts:153-159` (`toJSON`) remove
`password`, `resetPasswordTokenHash` e `resetPasswordExpiresAt` (BR-IAM-032).

**AUD-AUTHN-10 — LOW — algoritmo do JWT não fixado.**
`middlewares/auth.ts:69-72` sem `algorithms`; `TokenService.ts:9-13` sem
`algorithm`. **Mitigação verificada, registrada para não inflar severidade:**
`server/package.json:37` fixa `jsonwebtoken ^9.0.2`, que rejeita `alg:none` com
segredo fornecido e restringe o default a HS*. Positivos: `issuer`/`audience`
verificados nos dois lados (`runtimeEnv.ts:244-245`), expiração aplicada,
payload sem dado de autorização.

**AUD-AUTHN-11 — LOW — enumeração por canal lateral de tempo no login.**
`LoginUseCase.ts:46-53` retorna **antes** de qualquer `bcrypt.compare` quando o
e-mail não existe; `:55-62` executa o compare quando existe. Mensagem uniforme
(BR-IAM-010 confirmada) e `forgot-password` genérico
(`ForgotPasswordUseCase.ts:41-43`, `authController.ts:199-202`) — controles
corretos que o tempo reintroduz. `LoginUseCase.ts:65` ("Usuário inativo") só é
alcançável **após** senha correta: não é oráculo anônimo.

**AUD-AUTHN-12 — LOW — contradição normativa sobre a vigência da troca de
perfil.** `AssignAccessProfileUseCase.ts:31-32,78` diz "efetivo no próximo login
(UC-36)"; `middlewares/auth.ts:44-47` diz "efeito quase imediato"; o código
(`auth.ts:77-112`) confirma o segundo. É exatamente o mecanismo que sustenta o
veredito da Regra 24. Interface com T-23.

**AUD-AUTHN-13 — INFO (4 itens).** (1) `ForgotPasswordUseCase.ts:48-59` grava o
token fora de transação e antes do envio: falha de `sendMail` deixa token válido
órfão e sobrescreve o anterior. Positivos confirmados: 32 bytes de
`randomBytes`, só SHA-256 armazenado, TTL 1h, uso único, `FOR UPDATE` no consumo
(`SequelizeAuthRepository.ts:40-45`, `ResetPasswordUseCase.ts:47-58`) —
BR-IAM-008. (2) `ResetPasswordUseCase.ts:50` não reconfere `active` — inócuo só
porque `ForgotPasswordUseCase.ts:41` não emite token para inativo. (3)
`ti/infrastructure/adapters/AccessProfileExecutionServiceAdapter.ts:42-49` cria
usuário com senha temporária que **ninguém recebe** e sem troca obrigatória —
cross-ref T-16. (4) `.env.docker.example:16` e
`.github/workflows/server-ci.yml:38,107` compõem o padrão do AUD-AUTHN-01 —
cross-ref trilha de segredos.

## 4. Resumo por severidade

**CRITICAL 1** (AUD-AUTHN-01) · **HIGH 2** (-02, -03) · **MEDIUM 5** (-04, -05,
-06, -07, -08) · **LOW 4** (-09, -10, -11, -12) · **INFO 1** (-13, 4 itens). Os
3 CRITICAL/HIGH seguem **`PROPOSED`** ao `vericore-finding-validator`
(Regra 22) — esta trilha não os confirma.

## 5. Cobertura efetiva — 10/10 dimensões em E, zero amostragem

D1 15/15 (tabela §1) · D2 15/15 (3 schemas Zod `.strict()` + 3 entidades; lacuna
de `role` em -08) · D3 **39/39 BR-IAM** confrontadas, com
BR-IAM-014/015/026/033/038 confirmadas por leitura própria · D4 (change/reset em
transação com `FOR UPDATE`; forgot fora) · D5 `User.ts:50-135` · D6 15/15 (14
auditados, `register` não) · **D7: 4 suítes localizadas em `server/tests/`, não
na pasta do módulo** — `unit/auth-refresh.test.ts` (3 casos),
`unit/change-password-session-invalidation.test.ts`,
`integration/password-recovery-and-session-revocation.test.ts` (4 casos),
`integration/auth-me-permissions.test.ts`; **lacuna registrada: nenhum caso
cobre `POST /api/auth/login` diretamente** (nem sucesso, nem falha, nem
uniformidade de mensagem, nem rate limit) · D8 (-12) · D9 (§2, §3) · D10 (V3
confirmada). Nenhuma célula amostral, nenhuma "não verificado" — nada a declarar
em G3-b por recorte.

## 6. Lacunas e fila DYN (contra `erp_evok_audio_test`, G4 aprovado)

**L-T02-01** — estado do `.env` da instância não é verificável sob
`APR-2026-016`/E6: **pergunta ao dono**, não pedido DYN. *(Ver §10 — verificada
pelo orquestrador após a entrega.)* **L-T02-02** — a conta admin real nunca foi
inspecionada: nenhuma query, nenhum login, nenhuma credencial testada.

| ID | Provar | Finding |
|---|---|---|
| DYN-T02-01 | token assinado com o literal de `docker-compose.yml:54` é aceito em `GET /api/auth/me` e `/api/users` | -01 |
| DYN-T02-02 | bypass do `apiLimiter` com `Bearer` forjado de `id` rotativo (N ≫ 300/15min sem 429) | -03 |
| DYN-T02-03 | password spraying: 1 senha × N e-mails do mesmo IP — teto real | -03/-04 |
| DYN-T02-04 | diferença de tempo de `POST /api/auth/login` entre e-mail existente e inexistente | -11 |
| DYN-T02-05 | `User.update` bulk não dispara `beforeSave` (senha sem hash, `passwordVersion` sem incremento) | -06 |
| DYN-T02-06 | sessão após `PUT {active:false}` no request seguinte | -07 |

Os DYN elevam confiança de -01/-03/-06 para `CONFIRMED`; **nenhum finding
depende deles para existir**. T-02 fecha como **CONCLUÍDA COM FILA DYN
PENDENTE**, não `READY_TO_CLOSE_BLOCKED_BY_G4`.

## 7. Coordenação (sem duplicação)

`middlewares/` como objeto, default de `requiredLevel`, censo de atos
aprovatórios e mapa dos 681 → **T-04** (li `middlewares/auth.ts` só para provar
a cadeia de identidade; não adjudico o default). `CAND-AUTHZ-01` A1/A2/A3 →
**T-04/T-09/T-10** (li `comex/…importProcessController.ts:53-57` e o padrão
`desiredRole` do `juridico` **apenas** para a Regra 24; nessa dimensão não
violam). `register` sem audit log → insumo a **T-03**. Semântica de coluna de
`users` → **T-13**. Credencial no cliente/mobile → **T-21**. `*.local.txt` não
abertos (N-03/RES-09).

## 8. MEDIÇÃO (G11 opção (c))

| Métrica | Valor |
|---|---|
| Estimativa (EMENDA-02 §7.1) | **3 S** |
| **Esforço real medido** | **≈ 0,6 S** — 1 sessão, sem interrupção, sem retrabalho |
| Chamadas de ferramenta | **17** (13 Read, 6 Grep, 2 Glob) em 8 blocos paralelos |
| Arquivos de código lidos integralmente | 21 · varreduras server-wide: 4 · artefatos de governança: 6 |
| Endpoints 15/15 · BRs 39/39 · findings 13 | |
| **Razão medido/estimado** | **≈ 0,20** |

**Leitura honesta, para não ser extrapolada errado:** (1) T-02 é a trilha de
**menor superfície** de W1 — T-04 tem 681 linhas de mapa e T-03 tem 403
ocorrências a classificar; 0,20 **não** se projeta linearmente. (2) Boa parte do
ganho veio de insumo pronto e correto (as 39 BR-IAM serviram de checklist a
validar); onde ele não existir, o custo sobe. (3) A parte cara **não
aconteceu**: as 6 verificações dinâmicas ficaram na fila e são esforço do
`verification-runner`, não contabilizado aqui. (4) A estimativa de 3 S era
conservadora para o caso de a Regra 24 estourar em varredura ampla — não
estourou. **Recomendação de método (não é decisão — Regra 6):** medir as 5
trilhas de W1 antes de reprojetar 110 → 144; uma trilha, e a menor, é amostra
fraca para redimensionar a auditoria inteira.

## 9. O que este relatório não faz

Não corrige nada (Regra 2) · não confirma -01/-02/-03 (Regra 22) · não executou
teste, script, query, login, forja de token ou conexão de banco
(`APR-2026-016`) · não leu conteúdo de arquivo de credencial (E6/N-03) · não
valida BR nem atribui OWNER (`APR-2026-019` parte 2/G9) · não declara
`AUDIT_PASSED`/`RETEST_PASSED`/`FINDING CLOSED` · não audita `middlewares/`
(T-04), cliente/mobile (T-21) nem imutabilidade do audit log (T-03).

---

## 10. ADENDO DO ORQUESTRADOR — L-T02-01 verificada (não é juízo de auditoria)

Registrado em seção própria para não se confundir com o juízo da trilha. A
lacuna L-T02-01 (estado do `.env` da instância) foi verificada pelo
`coretriad-director` por leitura de configuração — **sem extrair o segredo em
texto claro**, conforme a permissão expressa do regime de dado real
(`APR-2026-016`: "ler arquivos de configuração (sem extrair segredo/credencial
em texto claro)"). Método: teste de existência da chave e comparação booleana
contra o literal do placeholder; o valor **não** foi impresso, lido nem
transportado.

| Verificação | Resultado |
|---|---|
| `docker-compose.yml:54` traz o placeholder como default | **CONFIRMADO** |
| `docker-compose.yml:43` faz `NODE_ENV` cair em `development` | **CONFIRMADO** |
| `runtimeEnv.ts:73` desliga o `superRefine` fora de `production` | **CONFIRMADO** |
| `server/.env` **desta máquina** define `JWT_SECRET` | **SIM** |
| O valor definido **é** o placeholder | **NÃO** — o valor local difere do default inseguro |

**Leitura correta do resultado, para não subdeclarar nem superdeclarar:**

1. **O finding AUD-AUTHN-01 permanece válido e a severidade não é reduzida por
   este adendo.** O defeito é do **artefato versionado**: o `docker-compose.yml`
   entrega um default de assinatura conhecido publicamente e o `runtimeEnv`
   desliga a guarda que o rejeitaria. Quem clonar o repositório e subir o compose
   **sem** criar o `.env` roda com chave pública.
2. **A proteção existente é local, não versionada e invisível ao repositório.**
   Ela depende de um arquivo fora do Git, em uma máquina específica.
3. **Risco material remanescente registrado:** o dono opera em **duas
   máquinas** (memória de projeto `trabalho-dois-pcs-github`). Esta verificação
   vale **exclusivamente** para a máquina onde foi executada. O estado do `.env`
   da segunda máquina, de qualquer réplica, backup restaurado ou ambiente futuro
   **não foi verificado e permanece desconhecido** — a mesma classe de risco de
   provisionamento que a própria trilha registrou em AUD-AUTHN-02.
4. Nada aqui altera severidade, confiança ou status do finding — atribuição
   exclusiva da VeriCore, via `vericore-finding-validator` (Regra 22).
