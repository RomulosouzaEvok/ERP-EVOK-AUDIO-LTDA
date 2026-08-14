# T-03 — TIER 1 AUDIT LOG (`auditLogs` + `auditLogService.ts`)

`AUDIT_COMMIT c1311a6f76b512fef893f7e60d934179cae3409f` · titular
`vericore-database-auditor` · regime `APR-2026-016` read-only reforçado ·
autoridade `APR-2026-023` Parte B/C (G11(c))

> **Nota de persistência.** Produzido pelo `vericore-database-auditor` (T-03) e
> persistido **sem alteração** pelo orquestrador — a ferramenta Write estava
> desabilitada para o agente. Nenhuma conexão de banco foi aberta; `c9359be` não
> foi usado como referência. O juízo de auditoria é integralmente da trilha.

## 1. Findings por severidade

### HIGH — 3 (todos `PROPOSED` ao `vericore-finding-validator`, Regra 22)

**AUD-DB-01 — A credencial de runtime é superusuário; a role de privilégio
mínimo existe e nunca foi ativada.** `docker-compose.yml:49` →
`DB_USER: evok_admin`; `server/.env.example:16` idem;
`server/migrations/20260806-000080-create-app-role-least-privilege.cjs:4-9`
descreve `evok_admin` como **superusuário**, e `:18-24` declara que a migration
*"NAO troca a credencial ativa em uso"*. `evok_app` só é credencial de runtime
em `docker-compose.prod.yml:91`, compose não exercitado. Como `APR-2026-016`
define o banco de `docker-compose.yml` como produção real, a API que toca os 327
insumos roda como superusuário — que pode
`ALTER TABLE … DISABLE TRIGGER ALL` / `SET session_replication_role='replica'` e
**neutralizar as 13 triggers de imutabilidade de RH/JUR/SST**, a única defesa em
profundidade do schema inteiro. Controle compensatório procurado: a role
`evok_app` **é** o controle, corretamente desenhada em `:53-99`, e está
desligada.

**AUD-DB-02 — A trilha é best-effort e estruturalmente não-transacional.**
`LogActionParams` não tem parâmetro de transação (`auditLogService.ts:16-31`);
`AuditLog.create({...})` é chamado **sem objeto de opções** (`AuditLog.ts:148-164`),
logo nenhuma transação é propagável; varredura
`await auditLogService\.logAction|await logAction` em `server/src` = **0
ocorrências** (362/362 call sites não aguardam). A persistência de último
recurso é `<cwd>/logs/audit-failures.log` (`auditLogService.ts:33`) e **`logs/`
não é volume** em `docker-compose.yml:68-74` (único volume: `app_uploads`) —
morre no recreate. O alerta `AUDIT_ALERT_WEBHOOK_URL` está **vazio por padrão**
(`.env.example:76`). Prova histórica do mesmo modo de falha no próprio código:
`auditActions.ts:8-20` e `20260810-000036-…cjs:6-23` (37 literais, `22P02`, API
200, trilha inexistente, incluindo `access_denied`). HIGH e não CRITICAL porque
há mitigação parcial real e deliberada (retry `:206-212`, degradação sem perda
`:176-204`).

**AUD-DB-03 — 13 módulos com rota de escrita e zero `logAction`, incluindo tier
1 PRODUÇÃO REAL.** `audit-coverage-guard.test.ts:49-63` lista `items`,
`categories`, `departments`, `assets`, `clients`, `employees`,
`mobileInventory`, `nonConformities`, `serviceOrders`, `suppliers`, `users`,
`accessProfiles`, `webhooks`. Confirmação independente: `logAction` em
`server/src/modules/items` = **0 ocorrências**. O próprio JSDoc do teste
(`:5-18`) registra que as 327 criações reais deixaram `audit_logs` com **2 linhas
(os dois logins)**. Duas fragilidades medidas da guarda: (a) granularidade de
módulo — um `logAction` em um controller cobre o módulo inteiro (`:82-85`); (b)
cegueira de camada — só lê `presentation/controllers` (`:83`), por isso
`users`/`accessProfiles`, que auditam em `application/use-cases`, seguem
listados como débito. Fronteira declarada: `items` é objeto de T-01, mas a
dimensão **D6 é de T-03 em 100% do sistema**.

### MEDIUM — 6

- **AUD-DB-04** — `audit_logs.entity_id integer` (`00_baseline_frozen.sql:3635`;
  `AuditLog.ts:85,155` `Number(entityId)`) não representa PK `UUID`:
  `Item.ts:49-51` (tier 1), `ItemCategoria.ts:21-23` (tier 1),
  `ItemEstrutura.ts:47-50`, `MrpOrdemPlanejada.ts:35-38`. Contorno confirmado nos
  call sites — `engineeringController.ts:258-265` grava `entityId: undefined` e
  joga o UUID em `entityDescription`; `mrpController.ts:66-72` e
  `catalogImportController.ts:70-80` omitem `entityId`. O índice
  `audit_logs_entity_type_entity_id` (`:18600`) e o filtro `entity_id` da API
  (`SequelizeAuditLogsRepository.ts:20`) ficam estruturalmente incapazes de
  recuperar esses eventos.
- **AUD-DB-05** — `ListAuditLogsUseCase.ts:42-50`: `parseInt` cru, **sem teto,
  sem piso, sem guarda de NaN**. O projeto tem o controle e não o aplica aqui:
  `shared/presentation/pagination.ts:20-31` + `constants.ts:20`
  (`PAGINATION_MAX_LIMIT = 100`), usado por `ListQualityInspectionsUseCase.ts:51`
  e `ListMasterProductionPlansUseCase.ts:58`. `?limit=999999` extrai a trilha
  inteira (com o dado pessoal de AUD-DB-08) numa requisição.
- **AUD-DB-06 — CORRELATION_ID ausente.** `requestContext.ts:21-25` gera/propaga
  `x-request-id` e o Winston o registra (`:31-37`), mas `audit_logs` não tem
  coluna de correlação (`:3627-3646`) e `AuditLog.register` não lê
  `req.requestId`. Além disso `requestContext.ts:21` aceita o header do cliente
  **sem validação** (correlação forjável). Placar: USER ✔ TIMESTAMP ✔ ACTION ✔
  ENTITY ✔(com AUD-DB-04) OLD/NEW ~24% SOURCE ✔ **CORRELATION ✘**.
- **AUD-DB-07** — negativa de authZ auditada em `authorizeModule`
  (`auth.ts:231-242`), `authorizeAnyModule` e `authorizeSelfOrModule`, mas
  **`authorize(role)` responde 403 sem nenhum log** (`auth.ts:151-165`) — e as
  duas rotas da própria trilha usam exatamente esse mecanismo
  (`auditLogs.ts:12-13`). Somado a isso, **ler a trilha não gera evento**:
  `auditLogController.ts:16-35` não chama `logAction`, embora
  `read`/`read_sensitive` existam e sejam usados em `licenseController.ts:89-94`.
- **AUD-DB-08** — dado pessoal verbatim em `new_values`: varredura
  `newValues: req\.body|newValues: parsed\.data|oldValues: req\.body` = **39
  ocorrências / 30 arquivos**; entidade inteira em `lgpdController.ts:63,120,191`
  (inclusive pedido de titular de dados). Colunas `json` livres sem CHECK nem
  mascaramento (`:3637-3638`), sem retenção, sem imutabilidade (FIND-ERP-002),
  legíveis em massa por AUD-DB-05. Conformidade registrada: **nenhuma credencial
  é logada** (`CreateUserUseCase.ts:62-69`; `authController.ts:163-169,229-234`).
- **AUD-DB-09 — soft delete CONFIRMADAMENTE ausente.** `paranoid` em todo
  `server/src` = **0 ocorrências**; `\.destroy\(` = **10 ocorrências / 9
  arquivos** (o "9+" da arquitetura está correto; o número exato é 9/10).
  `productionOrderController.ts:176-183` registra o `delete` com
  `oldValues: { status }` apenas — a linha destruída não é reconstituível. O ENUM
  tem o valor `soft_delete` (`auditActions.ts:84`) para uma capacidade que não
  existe. A "consistência do filtro de soft delete" é satisfeita **por ausência
  da funcionalidade**, e isso é registrado para não ser lido como conformidade.

### LOW — 2

- **AUD-DB-10** — deriva doc×schema: `auditActions.ts:48-55` e o cabeçalho da
  migration afirmam que a extensão do ENUM está pendente, mas
  `00_baseline_frozen.sql:223-248` já traz os 24 valores e `DATABASE.md:3562-3563`
  diz "aplicada em 2026-08-10" — enquanto `DATABASE.md:3668-3669` afirma, na
  mesma seção, "continua com 15 valores". Contradição documental (Regra 21).
- **AUD-DB-11** — `FK ON DELETE SET NULL` em `user_id` (`:22839-22840`). LOW
  porque há controle compensatório real: `AuditLog.ts:149-152` desnormaliza
  `user_name`/`user_ip`/`user_agent` na gravação. Se existe rota de exclusão
  física de usuário é matéria de **T-02** — não afirmo.

### Conformidade registrada (para que "sem finding" ≠ "não verificado")

PK (`:3628`,`:3695-3708`); NOT NULL em `action`/`entity_type`/`success`/
`created_at`/`updated_at` **consistente model × schema**; domínio ENUM com 24
valores == `AUDIT_ACTIONS` derivado da SSOT (`AuditLog.ts:80`) — **sem
divergência model × migration**; 4 índices (`:18586,18593,18600,18607`) cobrindo
exatamente os 4 filtros e a ordenação do repositório; `created_at`/`updated_at`;
**Regra 24 satisfeita** (papel vem de `jwt.verify` + `User.findByPk`,
`auth.ts:69-128,158`); caminho único de escrita (`AuditLog.create` só em
`AuditLog.ts:148`); vocabulário fechado com 3 guardas de teste.

## 2. Segunda voz sobre o FIND-ERP-002 — CONFIRMADO NO MÉRITO, com premissa retificada e agravante novo

Severidade **HIGH mantida**, confiança **CONFIRMED mantida**, **nenhum controle
compensatório** encontrado em busca própria de 3 camadas. Reconferi por evidência
própria a DDL de `audit_logs` (`:3627-3646`), os 4 índices, a FK única, e o GRANT
amplo (`20260806-000080…cjs:70-83` com `EXCLUDED_TABLES` só de
`SequelizeMeta`/`SequelizeData` em `:40`) — as âncoras de privilégio que T-00
§3.2 expressamente remeteu a T-03.

**Agravante novo, não registrado pelo finding nem pela validação adversarial:**
`20260806-000080…cjs:105-112` —
`ALTER DEFAULT PRIVILEGES … GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO evok_app`.
O GRANT amplo não é fato pontual das tabelas existentes: é **política padrão do
schema**, e toda tabela futura nasce alterável/apagável. Qualquer imutabilidade
futura exigirá `REVOKE` explícito.

**Premissa retificada:** o finding afirma (l.66-69, 118, 120, 123) que `evok_app`
é "a credencial que a própria API usa em produção". **Isso é incorreto no
`AUDIT_COMMIT`** — a prova está na migration que o próprio finding cita
(`:18-24`), em `docker-compose.yml:49` e `.env.example:16`. **A retificação
agrava:** a credencial real é o superusuário `evok_admin` (`:4-9`), que não só
pode `UPDATE`/`DELETE` nas 3 tabelas como pode desabilitar as 13 triggers que o
finding trata como a proteção existente. **Efeito sobre remediação:** adicionar
trigger nas 3 tabelas é necessário e **insuficiente** enquanto a credencial de
runtime for superusuário. Nada aqui fecha, reabre ou reclassifica o finding — o
mérito é de T-25 (Regra 22); isto é insumo dirigido.

## 3. Estratificação dos 101 arquivos / 403 ocorrências — número reproduzido e método recuperado

O plano declara 101/403 sem registrar o padrão. Reconstruí: `server/` inteiro com
`logAction` = 450/111; com `auditLogService` = 137/106; com `logAction\(` =
279/88; **`server/src` com `logAction` = 403/101** — correspondência exata
(450−47 de testes/migrations = 403; 111−10 = 101). O número do plano está correto
e agora é auditável.

**Registro obrigatório de escopo:** "403 ocorrências" ≠ "403 call sites". 41 não
são chamadas (13 READMEs + 3 arquivos de definição). O universo real de chamadas
é **362 ocorrências / 85 arquivos**.

| Classe | Arq. | Ocorr. |
|---|---|---|
| C0 Definição/SSOT (`auditLogService.ts` 2, `AuditLog.ts` 2, `auditActions.ts` 5) | 3 | 9 |
| C1 READMEs de módulo | 13 | 32 |
| C2 Middleware authZ (`auth.ts` 3, `authorizeAnyModule` 2, `authorizeSelfOrModule` 2) | 3 | 7 |
| C3 Use case (users 15; accessProfiles 9; `LoginUseCase` 1; `RevealLicenseKeyUseCase` 1) | 10 | 26 |
| C4 Controllers | 72 | 329 |
| **TOTAL** | **101** | **403** |

**As três dimensões pedidas pelo plano, resolvidas por prova estrutural
exaustiva (mais forte que enumeração):**

- **Ator: 362/362 derivam do servidor, zero autodeclarados.** `LogActionParams`
  não tem campo de ator (`:16-31`); a via que aceitaria (`AuditLog.register` com
  `userId`) tem **zero chamadores de produção**.
- **Transação: 362/362 FORA, e é estruturalmente impossível estar dentro** (sem
  parâmetro de transação; `create` sem opções; zero `await`).
- **Antes-depois: ~24%.** `oldValues:` = 28 em 15 arquivos contra ações mutantes
  = 118 em 57. **≈90 eventos mutantes (76%) gravam só o estado DEPOIS.**

## 4. Ownership de dado — QUEBRA CONFIRMADA

Leitura: `SequelizeAuditLogsRepository.ts:27-41` (`findAndCountAll`/`findByPk`; a
interface de domínio não declara nenhum método de escrita). Escrita:
`auditLogService.ts:187` → `AuditLog.ts:148`, em `src/services/`, **fora de
qualquer módulo**, sem repositório, sem use case, sem camada de domínio. Os dois
caminhos são independentes e exaustivamente confirmados. **Efeito material:** a
regra "audit log não se atualiza nem se apaga" não tem onde morar no código — é o
`FIND-ERP-002` refletido no nível arquitetural, vínculo registrado aqui pela
primeira vez.

## 5. Pedidos DYN (fila G4, `erp_evok_audio_test` apenas; nenhum executado)

| ID | Pedido | Serve |
|---|---|---|
| DYN-T03-01 | `pg_enum` de `enum_audit_logs_action` — 24 ou 15 valores | AUD-DB-10 |
| DYN-T03-02 | Como role de runtime: `UPDATE`/`DELETE` em `audit_logs` | FIND-ERP-002 (prova dinâmica) |
| DYN-T03-03 | `information_schema.table_privileges` das 3 tabelas + `pg_roles.rolsuper` + `current_user` | AUD-DB-01, FIND-ERP-002 |
| DYN-T03-04 | `pg_trigger WHERE NOT tgisinternal` — 13 e nenhuma nas 3 | FIND-ERP-002 |
| DYN-T03-05 | `SET session_replication_role='replica'` / `DISABLE TRIGGER ALL` como runtime | AUD-DB-01 |
| DYN-T03-06 | `GET /api/audit-logs?limit=999999` e `?limit=abc` | AUD-DB-05 |

Parte estática **completa**; as asserções de AUD-DB-01 e da segunda voz
permanecem **`READY_TO_CLOSE_PENDING_DYN`** — nunca "concluída com ressalva".

**Risco residual (G3-b):** RES-T03-01 estado efetivo do banco real não observável
(`APR-2026-016`); RES-T03-02 eficácia do arquivo/webhook só medida com mock;
RES-T03-03 cobertura por **endpoint** depende do mapa authZ de T-04 — AUD-DB-03
mede no nível de módulo e declara isso; RES-T03-04 `client/`/`mobile/`/`tv/` não
inspecionados (T-21).

## 6. Esforço medido × estimado (obrigação do G11(c))

**Estimado: 4 S. Medido: 1 sessão de agente** — 21 chamadas de ferramenta, ~40
artefatos lidos, 13 varreduras exaustivas com padrão reexecutável, 11 findings, 6
pedidos DYN.

Leitura honesta, para o dono não ser induzido a erro: **o fator 4:1 não é
generalizável.** T-03 teve superfície de módulo mínima (2 endpoints, 6 arquivos),
resolveu a dimensão transversal por **prova estrutural** em vez de enumeração
linha a linha, e auditou um objeto que o próprio código documenta com rigor
incomum. Além disso, **a parte cara não entra nesta medição**: as 6 sondagens DYN
exigem ambiente e uma segunda passada — o fechamento pleno de T-03 é honestamente
~**1 S estático + ~0,5 S pós-DYN**. Trilhas com superfície enumerável e sem prova
estrutural disponível (T-04 com 681 endpoints, T-16, T-21) **não devem ser
reestimadas por este resultado**; extrapolar 4:1 seria repetir o erro que a
EMENDA-02 §4 manda vigiar.
