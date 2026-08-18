# REMEDIATION_EVIDENCE_PACKAGE (SanaCore → VeriCore)

Formato base: `coretriad/contracts/REMEDIATION_EVIDENCE_PACKAGE.md`.

```
CASE_ID:        ERP-LEGACY-001-CASE-018
FINDING_ID:     ERP-LEGACY-001-AUD-001 / AUD-AUTHN-02
TITULO:         Senha do admin de bootstrap com default versionado
SEVERIDADE:     HIGH (estrato 2, PRODUCAO REAL por APR-2026-016)
AUDIT_COMMIT:   c1311a6f76b512fef893f7e60d934179cae3409f
TRIAGE:         remediation/cases/ERP-LEGACY-001-CASE-018/TRIAGE.md
DISPATCH:       remediation/cases/ERP-LEGACY-001-CASE-018/CODEX_REMEDIATION_DISPATCH.md
PENDING:        remediation/cases/ERP-LEGACY-001-CASE-018/PENDING_DECISION.md (não respondido)
BRANCH:         sana/ERP-LEGACY-001/CASE-018
WORKTREE:       C:\Sistema EvokAudio\ERP-Evok-sana-CASE-014
REMEDIATION_COMMIT: 078ee8b (+ correção de encoding não commitada, ver §5)
STATUS DESTE PACOTE: evidência de implementação — NÃO é reteste, NÃO declara
                      RETEST_PASSED/FINDING CLOSED/RISK_ACCEPTED (Regras 3/4).
```

**Nota de escopo, herdada da triagem e repetida aqui para o reteste não
presumir errado:** este caso é **PARCIALMENTE EXECUTÁVEL**. A parte de
código/config/guardas/docs (E-1…E-7 do despacho) está implementada e é o
objeto deste pacote. A rotação da senha do admin de produção existente
permanece **BLOQUEADA por `APR-2026-016`** e não é tocada por esta
remediação — ver `PENDING_DECISION.md` (perguntas 1 e 2, ainda sem resposta
registrada em `APPROVALS.md`). **Mecanismo ≠ estado da credencial**: esta
correção torna o código correto e trava a reintrodução do defeito; ela não
prova nem altera o estado da senha da conta `admin@evokaudio.com.br` que já
existe em produção.

---

## 1. ROOT_CAUSE

O único ponto de criação da conta administrativa (`seeds.ts:114-147`,
executado no boot por `server/config/db.ts:23`) não tinha, em nenhum
ambiente, um caminho de falha por credencial fraca. Havia **três defeitos
distintos** dentro do mesmo finding, cada um sobrevivendo à correção do
anterior:

- **D-1** — `docker-compose.yml:57` **fornecia** um default versionado
  (`${ADMIN_SEED_PASSWORD:-dev-only-change-me-please}`) quando o operador não
  declarava a variável.
- **D-2** — `server/src/config/seeds.ts:138` (no `AUDIT_COMMIT`) tinha um
  **segundo** literal como fallback (`adminPassword || '<literal>'`),
  atingindo qualquer boot fora de `production`, inclusive `npm run dev` sem
  Docker.
- **D-3** — comprimento curto apenas emitia `console.warn`
  (`seeds.ts:139-141` no `AUDIT_COMMIT`), sem `throw`, permitindo que uma
  senha declarada e fraca ainda criasse a conta.

A única guarda forte do sistema (`runtimeEnv.ts:127-133`, mínimo 8 +
`ENV_PLACEHOLDER_PATTERN`) ficava atrás do early-return de
`runtimeEnv.ts:73-75`, inalcançável porque `docker-compose.yml:43` rebaixa
`NODE_ENV` a `development` por padrão. Esse gate morto é `T18-F02`, finding
separado, **não fechado por esta remediação** (ver §3).

## 2. LOCAL_FIX

Verificado por leitura direta do arquivo no worktree
(`C:\Sistema EvokAudio\ERP-Evok-sana-CASE-014`, branch
`sana/ERP-LEGACY-001/CASE-018`, HEAD `078ee8b`):

- **`server/src/config/seeds.ts:114-140`** — a validação da senha do admin
  foi movida para **dentro** de `seedDatabase()`, **depois** do guard
  `if (userCount > 0) return;` (`:117-121`), e é **independente de
  `NODE_ENV`**:
  ```ts
  // seeds.ts:126-140 (HEAD 078ee8b)
  const adminPassword = runtimeEnv.adminSeedPassword;
  if (!adminPassword) {
    throw new Error(
      'ADMIN_SEED_PASSWORD é obrigatória para criar o administrador inicial. '
      + 'Defina a variável de ambiente antes de inicializar o seed.',
    );
  }
  if (ENV_PLACEHOLDER_PATTERN.test(adminPassword)) {
    throw new Error(
      'ADMIN_SEED_PASSWORD não pode usar placeholder. Defina um valor real antes de inicializar o seed.',
    );
  }
  if (adminPassword.length < 8) {
    throw new Error('ADMIN_SEED_PASSWORD deve ter ao menos 8 caracteres.');
  }
  ```
  Isto corrige **D-2** (nenhum literal de senha resta como fallback — a
  senha vem exclusivamente de `runtimeEnv.adminSeedPassword`), **D-3**
  (comprimento curto agora **interrompe** a criação da conta via `throw`,
  mínimo 8 — o mesmo já versionado em `runtimeEnv.ts:127`, nenhuma política
  nova de senha inventada) e acrescenta rejeição de placeholder (E-4 do
  despacho), reusando `ENV_PLACEHOLDER_PATTERN`.

- **`server/src/config/runtimeEnv.ts:12`** — o padrão passou a ser
  exportado: `export const ENV_PLACEHOLDER_PATTERN = /^(CHANGE_ME|dev-only-change-me)/i;`.
  Nenhuma regex nova foi escrita nem literal copiado, conforme exigido pelo
  despacho (E-4).

- **`docker-compose.yml:57`** — corrige **D-1**. Trocado de
  `${ADMIN_SEED_PASSWORD:-dev-only-change-me-please}` para
  `${ADMIN_SEED_PASSWORD:?defina ADMIN_SEED_PASSWORD no .env antes de subir a API}`,
  a mesma forma já usada para `DB_PASSWORD` no mesmo arquivo (`:13`, `:50`) e
  para esta mesma variável em `docker-compose.prod.yml:105`. Nenhuma outra
  linha do bloco `services.api.environment` foi tocada (`NODE_ENV:43`,
  `JWT_SECRET:54` pertencem ao `CASE-005`; `DB_USER:49` pertence ao
  `CASE-015` — endereçados por chave, sem colisão, conforme §3 da triagem).

- **`server/tests/unit/seeds-production-boot.test.ts`** — os 2 casos que
  **assertavam o defeito como comportamento correto** foram reescritos, não
  apenas ajustados no literal esperado:
  - o caso que verificava *"loga aviso mas continua em desenvolvimento sem
    `ADMIN_SEED_PASSWORD`"* virou *"rejeita seed do admin em desenvolvimento
    sem `ADMIN_SEED_PASSWORD"*, com `rejects.toThrow` e
    `expect(User.create).not.toHaveBeenCalled()`.
  - o caso *"avisa quando `ADMIN_SEED_PASSWORD` é muito curta"* virou parte
    do caso de placeholder/senha forte, também com `rejects.toThrow`.
  - casos novos acrescentados: rejeição de placeholder em
    `development` (`CHANGE_ME_REQUIRED_IN_PRODUCTION`), aceitação de senha
    forte com criação do admin (sem assertar o valor da senha em texto
    claro — apenas `email`/`role`/`active` e `toHaveLength(15)`), e
    confirmação de que banco com `users` populada **não** tenta criar o
    admin mesmo sem a variável definida (prova de não regressão do guard
    `:117-121`).

- **`server/tests/unit/docker-compose-admin-seed-guard.test.ts`** — arquivo
  **novo** (não edita o guard do `CASE-005`,
  `docker-compose-jwt-secret-guard.test.ts`, conforme exigido pela triagem
  §5.5 e pelo despacho E-7a). Asserções booleanas por regex, sem imprimir
  arquivo inteiro:
  - `docker-compose.yml` não casa mais `${ADMIN_SEED_PASSWORD:-` e passa a
    casar `${ADMIN_SEED_PASSWORD:?`.
  - `docker-compose.prod.yml` continua na forma `${...:?}` — conformidade a
    preservar.
  - `DB_PASSWORD` permanece obrigatório em ambos os composes.
  - os três `.env*.example` continuam com
    `ADMIN_SEED_PASSWORD=CHANGE_ME_REQUIRED_IN_PRODUCTION` e
    `DB_PASSWORD=CHANGE_ME_USE_A_STRONG_PASSWORD` — **não alterados**.
  - `seeds.ts` não contém mais `|| '<literal>'` como fallback de senha.
  - **Não assere `JWT_SECRET` nem `DB_USER`** — evita ficar vermelha em
    `main` antes de `CASE-005`/`CASE-015` serem mesclados (regra de
    coordenação §3 da triagem).

- **Documentação (drift corrigido, E-7c do despacho):**
  - `README.md:50` — deixou de afirmar que só `NODE_ENV=production` faz o
    servidor recusar a variável ausente; passou a descrever o comportamento
    real (o seed não cria a conta sem ela, e o compose a exige ao subir a
    API).
  - `docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md:47` — deixou de
    classificar `ADMIN_SEED_PASSWORD` como protegida só por
    `docker-compose.yml`/`runtimeEnv.ts`; passou a citar também `seeds.ts`
    como ponto de validação.
  - `docs/infra/DOCKER_POSTGRES_SETUP.md` — passo `2b` acrescentado, no
    mesmo formato já usado para `DB_PASSWORD` (`:60-65`, `:106-112`),
    instruindo a declarar `ADMIN_SEED_PASSWORD` com valor forte antes do
    `docker compose up`, e nota na seção 3 explicando que a falha do seed
    por variável ausente/placeholder/curta é **proposital**.

**O que este pacote NÃO faz, por estar fora de escopo (declarado, não
omitido):** não move `runtimeEnv.ts:73` (`T18-F02`); não toca
`docker-compose.prod.yml` nem os três `.env*.example` (já corretos,
ratificados em `APR-2026-049` D2); não toca `server-ci.yml`; não altera a
política de senha de usuário final (`AUD-AUTHN-09`); **não rotaciona
nenhuma credencial de produção**.

## 3. SYSTEMIC_FIX_REQUIRED

**Sim, parcialmente fora de escopo, exatamente como a triagem previu:**

- O early-return de `runtimeEnv.ts:73-75`, que mantém 8 guardas de produção
  (incluindo a de `runtimeEnv.ts:127-133`) inalcançáveis fora de
  `NODE_ENV=production`, **não foi tocado**. É `T18-F02`, finding próprio,
  com raio maior (mover a guarda quebraria `DB_SSL`/`CORS` em dev — já
  rejeitado em `CASE-005` §5.1 opção B).
- Validação automatizada de compose via `docker compose config` (`T22-F02`)
  não é fechada por este caso; a guarda estática nova (E-7a) vê a *forma* do
  arquivo, não prova que o compose parseia.
- Política de senha de usuário final (`AUD-AUTHN-09`, mínimo 6) permanece
  intocada — endurecê-la seria decidir regra de negócio fora do escopo
  deste caso (Regra 6 do `CLAUDE.md`).

## 4. BLAST_RADIUS

Confirmado por leitura, alinhado ao previsto na triagem §5.1:

**Quebra por desenho, como esperado:**
- `docker compose up` sem `ADMIN_SEED_PASSWORD` no `.env` — falha ruidosa
  antes de subir o container.
- `npm run dev` (host, sem Docker) com banco novo e sem a variável — o seed
  lança.
- Os 2 casos de `seeds-production-boot.test.ts` que assertavam o
  comportamento antigo — reescritos (§2).

**Não quebra, verificado:**
- Banco com `users` já populada (o caso do dono, hoje) — o guard
  `:117-121` continua retornando antes de `:126`, confirmado pelo caso novo
  "não tenta criar admin quando já existem usuários, mesmo sem senha
  configurada".
- `docker-compose.prod.yml` — inalterado, forma já correta preservada.
- Os três `.env*.example` — inalterados, conformidade de `APR-2026-049` D2
  preservada.

**Não verificado por este pacote (declarado, não omitido):** o estado do
`.env` da raiz e do `server/.env` do segundo PC do dono. A triagem já
registrou (§1.1) que a variável existe no `.env` desta máquina, mas não é
possível saber, sob `APR-2026-016`, se o valor satisfaz as validações novas.
`PENDING_DECISION.md` pergunta 3 permanece em aberto.

## 5. CORRECTION_STRATEGY

Estratégia seguida exatamente como fixada pela triagem §7 (nenhuma decisão
técnica improvisada pelo engineer):
1. Validação **dentro** de `seedDatabase()`, depois do guard de
   idempotência — não no schema Zod, para não quebrar o boot de instâncias
   com banco já populado.
2. Validação **independente de `NODE_ENV`** — critério que separa correção
   de teatro; testado explicitamente com `NODE_ENV=development` nos casos
   novos/reescritos.
3. Mínimo de comprimento fixado em **8**, o mesmo já versionado em
   `runtimeEnv.ts:127` — nenhuma política de senha nova inventada.
4. Rejeição de placeholder por **reuso** de `ENV_PLACEHOLDER_PATTERN`
   (exportado, não reescrito).

**Nota sobre o estado do worktree.** No momento deste empacotamento, além do
commit `078ee8b`, há uma alteração **não commitada** em
`docs/infra/DOCKER_POSTGRES_SETUP.md` e `server/src/config/seeds.ts`. Foi
lida integralmente (`git diff`) e confirmada como **correção de encoding**
apenas — o commit anterior tinha trechos em mojibake (ex.:
`ðŸŒ± Iniciando seeds...` em vez de `🌱 Iniciando seeds...`, `nÃ£o` em vez de
`não`); a mudança pendente restaura UTF-8 correto, sem alterar nenhuma linha
de lógica, condicional ou literal de segurança. Nenhum commit foi criado por
este agente (fora de escopo — Regra: SanaCore-evidence não edita código nem
commita); a mudança permanece no working tree do worktree para revisão do
usuário.

---

## FILES_CHANGED

| Arquivo | Mudança |
|---|---|
| `docker-compose.yml` | 1 linha — `ADMIN_SEED_PASSWORD` de `${:-...}` para `${:?...}` |
| `server/src/config/seeds.ts` | validação de senha movida para dentro de `seedDatabase()`, após o guard de idempotência, independente de `NODE_ENV`; fallback hardcoded removido; comprimento passa a bloquear; placeholder rejeitado (+ correção de encoding pendente, não commitada) |
| `server/src/config/runtimeEnv.ts` | 1 linha — `ENV_PLACEHOLDER_PATTERN` exportado |
| `server/tests/unit/seeds-production-boot.test.ts` | 2 casos reescritos (não ajustados no literal — reescritos para não mais assertar o defeito), casos novos de placeholder/senha forte/não-regressão |
| `server/tests/unit/docker-compose-admin-seed-guard.test.ts` | **arquivo novo** — guarda estática do compose e do seed |
| `README.md` | drift corrigido (`:50`) |
| `docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md` | drift corrigido (`:47`) |
| `docs/infra/DOCKER_POSTGRES_SETUP.md` | passo `2b` acrescentado, mesmo formato de `DB_PASSWORD` (+ correção de encoding pendente, não commitada) |

**Fora de `FILES_CHANGED`, confirmado por leitura — nenhum arquivo de
`server/src/modules/` foi tocado. Nenhuma linha de `docker-compose.yml`
pertencente a `CASE-005` (`:43`, `:54`) ou `CASE-015` (`:49`) foi alterada.**

## TESTS_ADDED

- `server/tests/unit/docker-compose-admin-seed-guard.test.ts` (novo, 5
  casos) — guarda estática de conformidade do compose/`.env*.example`/seed.
- 3 casos novos em `seeds-production-boot.test.ts`: rejeição de placeholder
  em desenvolvimento, aceitação de senha forte com criação do admin (sem
  assertar valor de senha), e prova de não-regressão (banco populado + sem
  variável → sucesso, admin não criado de novo).

## TESTS_CHANGED

- 2 casos de `seeds-production-boot.test.ts` **reescritos** (não apenas
  ajuste de literal esperado): de "loga aviso e continua" para "rejeita",
  e de "avisa quando curta" para "falha quando curta". Isto é a parte mais
  crítica do E-6 do despacho — o teste antigo **travava o defeito**
  asserindo-o como esperado; a reescrita é parte da remediação, não
  "conserto de teste quebrado".

## TEST_RESULTS

Reportados pelo `sanacore-remediation-engineer` que implementou a correção
nesta mesma worktree, **não reexecutados por este agente de evidência**
(a Regra permanente de segurança de dado real e a Regra 16 do `CLAUDE.md`
proíbem este agente de executar suíte de teste ou script de diagnóstico, em
qualquer circunstância — nem contra banco de teste, nem sem banco nenhum):

- `npm run typecheck` — **passou, 0 erros**.
- Testes de seeds (`seeds-production-boot.test.ts`,
  `docker-compose-admin-seed-guard.test.ts`,
  `organizational-structure-guard.test.ts`) — **15/15 passaram**.
- `npm run test:unit` completo — **1956/1957 passaram**. A única falha
  (`docs-path-reference-guard.test.ts`) é declarada **PRÉ-EXISTENTE e NÃO
  relacionada a este caso** — o próprio `CODEX_REMEDIATION_DISPATCH.md` §5.3
  já registra esse baseline conhecido (`APR-2026-050` D4: o guard valida um
  caminho dentro de `client/node_modules` e contamina o baseline de reteste
  em worktree sem `npm install` no `client/`), e foi confirmada reproduzindo
  o mesmo erro no commit anterior à correção (via `git stash`). **Esta é uma
  lacuna conhecida e declarada, não escondida — e não bloqueante para o
  reteste deste caso.**
- `docker compose config` — **falhou nesta worktree por ausência de arquivo
  `.env` local**. Confirmado por este agente de evidência (`test -f .env` →
  "NAO EXISTE" nesta worktree). Não há erro de sintaxe YAML — é limitação do
  ambiente de validação, não defeito de código. **Nenhum segredo foi criado
  para contornar isso**, e nenhum `.env` foi gerado por este pacote.

**Este agente de evidência verificou, por leitura estática independente,
sem executar nenhum comando de teste:**
- `git diff 0ee65c5 078ee8b -- docker-compose.yml` — confirma a troca exata
  de `${:-...}` para `${:?...}` em `ADMIN_SEED_PASSWORD`, sem tocar
  `NODE_ENV`, `JWT_SECRET` ou `DB_USER`.
- `git diff 0ee65c5 078ee8b -- server/src/config/seeds.ts` — confirma a
  validação em `:126-140`, depois do guard `:117-121`, sem condicional de
  `NODE_ENV`.
- Conteúdo integral de `docker-compose-admin-seed-guard.test.ts` — confirma
  as 5 asserções booleanas descritas em §2, sem `JWT_SECRET`/`DB_USER`.
- `git diff 0ee65c5 078ee8b -- server/tests/unit/seeds-production-boot.test.ts`
  — confirma que os 2 casos problemáticos foram reescritos (não apenas o
  literal trocado) e que os 3 casos novos cobrem placeholder, senha forte e
  não-regressão do guard de idempotência.
- `git diff` (não commitado) em `seeds.ts` e `DOCKER_POSTGRES_SETUP.md` —
  confirma que a única mudança pendente é de encoding (mojibake → UTF-8),
  sem impacto de lógica.

## REGRESSION_ANALYSIS

- **BAIXO** para D-1 (`${VAR:?}` no compose) — forma já usada 2× no mesmo
  arquivo e em `docker-compose.prod.yml`; precedente aceito em
  `APR-2026-049` D2.
- **BAIXO-MÉDIO** para D-2 (remover fallback) — nenhum consumidor de
  produção depende do literal; quebra apenas o caminho que a correção
  pretende quebrar (boot sem a variável).
- **MÉDIO** para D-3 (comprimento bloqueia) — mitigado ao usar o mesmo
  mínimo já versionado (8), evitando duas políticas de senha divergentes.
- **Risco de reversão por atrito operacional** identificado pela triagem
  (§5.2): sem o alinhamento de `DOCKER_POSTGRES_SETUP.md`, a reação
  previsível a um `docker compose up` falhado seria reverter a correção.
  Mitigado pela atualização do passo `2b` no mesmo formato já aceito para
  `DB_PASSWORD`.
- **Não verificado por este pacote:** o estado real do `.env` do segundo PC
  do dono e de eventuais réplicas/homologação (`PENDING_DECISION.md`
  pergunta 4) — se `ADMIN_SEED_PASSWORD` não estiver declarada lá com valor
  forte, o próximo `docker compose up` **falhará** nessas máquinas. Isto é
  efeito por desenho da correção, não bug, mas precisa ser lido pela
  VeriCore e pelo dono como aviso operacional, não como regressão oculta.

## ARCHITECTURE_IMPACT

Nenhum. Mudança contida em configuração de compose, um módulo de
inicialização (`seeds.ts`), um export de padrão já existente
(`runtimeEnv.ts`), testes e documentação. Nenhuma rota, middleware, use
case, model ou migration foi tocada. Nenhum arquivo de
`server/src/modules/` aparece no diff.

## DATABASE_IMPACT

Nenhum schema, migration ou dado foi alterado. O efeito é exclusivamente
sobre a validação que precede `User.create` no caminho de bootstrap de um
banco vazio. Nenhuma conexão de banco (real ou de teste) foi aberta por
este agente de evidência em nenhum momento deste empacotamento —
`APR-2026-016` observada integralmente.

## API_IMPACT

Nenhum endpoint HTTP foi alterado. O efeito é apenas no processo de boot:
`docker compose up`/`npm run dev` podem passar a falhar (por desenho) se
`ADMIN_SEED_PASSWORD` estiver ausente, curta ou casando com o padrão de
placeholder.

## SECURITY_CHECKS

- Nenhum literal de senha permanece como fallback em `seeds.ts` — verificado
  pela guarda nova (E-7b/`docker-compose-admin-seed-guard.test.ts`, caso "o
  seed não volta a ter fallback literal").
- Nenhum valor de segredo foi reproduzido em nenhum artefato deste pacote,
  do commit ou dos testes — os testes novos usam valores sintéticos
  (`'SenhaSegura123!'`, `'CHANGE_ME_REQUIRED_IN_PRODUCTION'`) e comparam o
  admin criado por `email`/`role`/`active`/`toHaveLength`, nunca pelo valor
  literal da senha.
- A validação nova é **independente de `NODE_ENV`**, verificado nos testes
  reescritos rodando com `NODE_ENV=development` — não reproduz o gate morto
  de `runtimeEnv.ts:73`.
- **Não coberto por esta remediação, declarado, não escondido:** o estado
  da credencial da conta `admin@evokaudio.com.br` que já existe em
  produção. O guard de idempotência `seeds.ts:117-121` (preservado,
  confirmado pelo caso novo de não-regressão) garante que nenhum boot
  futuro corrija uma senha fraca já gravada nessa conta — este é
  exatamente o "nó do caso" que a triagem (§4, `L-T02-02`) e o
  `PENDING_DECISION.md` (perguntas 1 e 2) deixam para decisão do dono.

## DOCUMENTATION_UPDATED

- `README.md:50` — drift corrigido; deixa de condicionar a exigência a
  `NODE_ENV=production`.
- `docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md:47` — passa a citar
  `seeds.ts` como parte da evidência do controle implementado.
- `docs/infra/DOCKER_POSTGRES_SETUP.md` — passo `2b` novo, no mesmo formato
  já aceito para `DB_PASSWORD`; nota na seção 3 explicando que a falha do
  seed é proposital.

---

## Avaliação de suficiência da prova (obrigatório declarar, não apenas repassar)

**Avaliação deste agente de evidência: a prova relatada pelo
`sanacore-remediation-engineer` é consistente com o que este agente
verificou de forma independente por leitura estática do diff e dos
arquivos, mas os números de execução (15/15, 1956/1957) NÃO foram
reexecutados por este pacote** — por proibição normativa (regra
permanente de segurança de dado real e Regra 16 do `CLAUDE.md`), não por
opção. Especificamente:

1. **Reprodutível a partir do repositório:** sim, ao contrário do
   `CASE-003`. Todos os testes novos e reescritos estão commitados
   (`078ee8b`) e podem ser lidos/reexecutados pela VeriCore.
2. **Verificação independente feita por este pacote:** leitura completa do
   diff de cada arquivo tocado, confirmando que a lógica descrita pelo
   engineer bate com o código real — não apenas com o relato textual dele.
   Isto cobre o ponto cego que o `CASE-003` identificou (quem escreveu a
   correção também escreveu a prova): aqui, ao menos a *forma* do teste foi
   auditada por um segundo agente antes do reteste da VeriCore.
3. **O que este pacote não pode fazer:** confirmar que os números relatados
   (15/15, 1956/1957) batem exatamente ao executar a suíte agora — isso
   exigiria rodar `npm run test:unit`, proibido para este agente. A
   VeriCore, ou o `vericore-audit-verification-runner`, deve reexecutar a
   suíte completa como parte do reteste dinâmico (§9.2 da `TRIAGE.md`,
   `DYN-018-01`…`06`), e comparar contra o `AUDIT_COMMIT`
   `c1311a6f76b512fef893f7e60d934179cae3409f` para confirmar que as guardas
   novas reprovam lá e passam no `REMEDIATION_COMMIT` — conforme exigido
   pelo despacho §5.1 e pelo precedente `APR-2026-050` D1.

---

## RETEST_INSTRUCTIONS (proposta; autoridade de desenho final é da VeriCore)

Herdadas de `TRIAGE.md` §9 (`CR-018-E1`…`E12` estático, `DYN-018-01`…`06`
dinâmico) e `CODEX_REMEDIATION_DISPATCH.md` §5. Resumo operacional:

1. **Estático, sem banco:** confirmar que `docker-compose-admin-seed-guard.test.ts`
   e os casos reescritos de `seeds-production-boot.test.ts` **reprovam** ao
   serem executados contra o `AUDIT_COMMIT`
   (`c1311a6f76b512fef893f7e60d934179cae3409f`) e **passam** no
   `REMEDIATION_COMMIT` (`078ee8b`). Poder discriminante zero se a suíte já
   passasse no `AUDIT_COMMIT` (precedente `APR-2026-050` D1).
2. **Dinâmico, exclusivamente contra `erp_evok_audio_test`, NUNCA
   `erp_evok_audio`:** executar `DYN-018-01`…`06` da `TRIAGE.md` §9.2,
   rodando **todas** as sondas de rejeição com `NODE_ENV` fora de
   `production` — se só falharem em `production`, o gate morto de
   `runtimeEnv.ts:73` foi reproduzido e o patch é cosmético.
   `DYN-018-05` (banco populado + variável ausente → boot normal) é
   **obrigatória**: é a única sonda que mede o risco de regressão contra a
   instância real do dono, não a correção em si.
3. **Reexecutar a suíte completa** (`npm run typecheck`, `npm run
   test:unit`) para confirmar os números reportados neste pacote (0 erros
   de tipo; 1956/1957 em `test:unit`; falha isolada e pré-existente em
   `docs-path-reference-guard.test.ts` por ausência de `npm install` no
   `client/` — `APR-2026-050` D4).
4. **Confirmar `docker compose config`** em ambiente com `.env` presente
   (o que esta worktree não tem) — a VeriCore deve validar que o YAML
   parseia corretamente com a nova forma `${ADMIN_SEED_PASSWORD:?...}`,
   fechando a lacuna que este pacote não pôde fechar.
5. **Ler explicitamente, e não confundir:** o mecanismo de criação de conta
   está corrigido e travado contra reintrodução; isso **não** determina, e
   não pode ser lido como determinando, se a conta `admin@evokaudio.com.br`
   de produção tem hoje a senha versionada (`L-T02-02`, indeterminado). A
   VeriCore precisa decidir, à luz de `PENDING_DECISION.md`, se o finding
   pode ser fechado com o mecanismo corrigido e o estado da credencial
   pendente, ou se permanece parcialmente aberto — decisão que esta carta
   **não** antecipa (Regra 4).
6. **Coordenação com `CASE-005`/`CASE-015`:** confirmar, antes do reteste,
   que nenhuma das duas branches foi mesclada antes desta de forma a
   deslocar a linha de `ADMIN_SEED_PASSWORD` em `docker-compose.yml` sem
   que a guarda nova (que endereça por regex de conteúdo, não por número de
   linha) continue válida.

## RESIDUAL_RISK

- **Estado da credencial admin de produção — INDETERMINADO.** Não
  verificável sem inspeção de dado real ou tentativa de login, ambas
  proibidas sem aprovação humana caso a caso (`APR-2026-016`). Registrado
  como pergunta 1 do `PENDING_DECISION.md`, sem resposta em `APPROVALS.md`
  até o momento deste pacote.
- **Rotação da senha do admin — não executada, bloqueada por
  `APR-2026-016`.** Não é ato da SanaCore. Registrado como pergunta 2 do
  `PENDING_DECISION.md`.
- **`.env` do segundo PC e de réplicas/homologação — não verificado.** Se
  `ADMIN_SEED_PASSWORD` não estiver declarada lá com valor forte, o próximo
  `docker compose up` falhará nessas máquinas — efeito por desenho, não
  regressão oculta, mas não medido por este pacote (`PENDING_DECISION.md`
  pergunta 4).
- **`T18-F02`** (early-return de `runtimeEnv.ts:73`) permanece aberto, fora
  de escopo.
- **`T22-F02`** (validação de compose por `docker compose config`)
  permanece parcialmente descoberto — a guarda estática nova vê a forma, não
  prova que o compose parseia; esta worktree não tem `.env` para validar
  isso agora.
- **`docs-path-reference-guard.test.ts`** — falha pré-existente e não
  relacionada, confirmada por reprodução no commit anterior à correção;
  registrada para não ser confundida com regressão deste caso.

## O QUE ESTE PACOTE NÃO FAZ

Não declara `RETEST_PASSED`, `FINDING CLOSED` nem `RISK_ACCEPTED` (Regras
3/4 do `CLAUDE.md`). Não responde nenhuma das 4 perguntas de
`PENDING_DECISION.md`. Não autoriza nem executa rotação de credencial de
produção. Não abriu nenhuma conexão de banco, real ou de teste, em nenhum
momento deste empacotamento. Não executou nenhuma suíte de teste nem
script de diagnóstico — os resultados de teste citados são os reportados
pelo agente de implementação, com verificação independente por leitura
estática do diff, não por reexecução. Não oculta a falha pré-existente de
`docs-path-reference-guard.test.ts`, a ausência de `.env` nesta worktree,
nem o estado indeterminado da credencial de produção.
