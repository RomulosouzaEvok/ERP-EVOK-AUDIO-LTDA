# TRIAGE — `ERP-LEGACY-001-CASE-018` · `AUD-AUTHN-02`

```
CASE_ID:        ERP-LEGACY-001-CASE-018
FINDING_ID:     ERP-LEGACY-001-AUD-001 / AUD-AUTHN-02
TITULO:         Senha do admin de bootstrap com default versionado
SEVERIDADE:     HIGH (estrato 2, PRODUCAO REAL por APR-2026-016)
FILA:           T-39 estrato 2 (REMEDIATION_BACKLOG.md:107)
AUDIT_COMMIT:   c1311a6f76b512fef893f7e60d934179cae3409f
BRANCH/HEAD LIDO HOJE: main @ 0ee65c5  (git rev-parse --abbrev-ref HEAD = main)
DATA:           2026-08-18
PAPEL:          sanacore-remediation-triage
VEREDITO:       PARCIALMENTE EXECUTAVEL.
                (a) endurecimento de codigo/config/guardas -> DESPACHADO
                (b) rotacao da senha do admin existente em producao ->
                    BLOQUEADO POR DECISAO DO DONO (PENDING_DECISION.md)
```

> **Regra permanente de segurança de dado real (`APR-2026-016`) observada
> integralmente.** Nenhuma conexão de banco foi aberta — nem `erp_evok_audio`,
> nem `erp_evok_audio_test`. Nenhum teste, script ou sonda foi executado. Todo o
> conteúdo vem de leitura de artefato versionado, exceto **duas contagens de
> existência de chave** em arquivos não versionados (`grep -c '^CHAVE='`), sem
> imprimir, comparar ou transportar valor algum.
>
> **Nenhum valor de segredo é reproduzido neste artefato.** Onde o finding cita
> um literal, esta triagem cita `arquivo:linha`. Os placeholders públicos
> (`CHANGE_ME_…`) são citados por serem, por desenho, marcadores de recusa — não
> segredos.

---

## 0. Disciplina de branch — declarada antes de qualquer afirmação de estado

A triagem do `CASE-016` foi retificada por ter lido worktree não mesclada como
se fosse `main`. Verificação executada **agora**, não presumida:

```
git rev-parse --abbrev-ref HEAD          -> main
git rev-parse --short HEAD               -> 0ee65c5
git merge-base --is-ancestor HEAD main   -> 0 (HEAD é main)
```

Varredura de **todas** as branches `sana/*` e `origin/sana/*` com
`git merge-base --is-ancestor <branch> main`:

| Branch | Em `main`? |
|---|---|
| `sana/ERP-LEGACY-001/CASE-003` … `CASE-013` (11 branches) | **NÃO** |
| `sana/ERP-LEGACY-001/FIND-ERP-001`, `FIND-ERP-005` | **NÃO** |
| `origin/sana/ERP-LEGACY-001/CASE-003`, `-004`, `-005`, `FIND-ERP-005` | **NÃO** |
| `origin/sana/SIM-001/*`, `origin/sana/SIM-002/*` | **NÃO** |
| `audit/ERP-LEGACY-001-AUD-001/2026-08-16` | **SIM** (é ancestral de `main`) |

**Consequência declarada, sem eufemismo: `CASE-005` NÃO ESTÁ EM `main`.**
Nenhuma remediação de nenhum `CASE-0xx` deste programa está em `main`. Tudo o
que este documento afirma sobre "estado atual do código" refere-se a
`main @ 0ee65c5`, que é o estado que o dono efetivamente roda quando faz
`docker compose up` na árvore principal.

---

## 1. O finding ainda reflete o código? SIM — reconfirmado hoje, `arquivo:linha`

Reli os arquivos no HEAD atual. **As três âncoras do finding estão intactas em
`main`.** Verbatim omitido onde o conteúdo é o próprio valor sob remediação.

| Âncora do finding (`T-02:94-100`) | Estado em `main @ 0ee65c5` |
|---|---|
| `docker-compose.yml:57` — `ADMIN_SEED_PASSWORD: ${ADMIN_SEED_PASSWORD:-<literal>}` | **INALTERADO.** Forma de default versionado confirmada por leitura da linha 57 |
| `server/src/config/seeds.ts:128-148` — semeia `admin@evokaudio.com.br` com `role:'admin'`, `active:true` | **INALTERADO** (`:142-148`) |
| `server/src/config/seeds.ts:138` — `const resolvedPassword: string = adminPassword \|\| '<literal>'` | **INALTERADO** — fallback hardcoded presente |
| `server/src/config/seeds.ts:139-141` — `if (resolvedPassword.length < 8) { console.warn(...) }` | **INALTERADO** — apenas avisa, não lança, não interrompe |
| `server/src/config/seeds.ts:117-121` — `if (userCount > 0) { return; }` | **INALTERADO** — é o controle compensatório |
| `server/src/config/seeds.ts:129-135` — `throw` só se `runtimeEnv.nodeEnv === 'production'` | **INALTERADO** |

Âncoras adicionais que o finding **não** cita e que a triagem confirmou hoje
(ampliam a superfície, não a inventam):

| Arquivo:linha | Estado | Relevância |
|---|---|---|
| `docker-compose.yml:43` | `NODE_ENV: ${NODE_ENV:-development}` | **Mata o gate de produção.** Ver §3.4 |
| `server/src/config/runtimeEnv.ts:52` | `ADMIN_SEED_PASSWORD: z.string().optional()` | opcional no schema, em qualquer ambiente |
| `server/src/config/runtimeEnv.ts:73-75` | `if (env.NODE_ENV !== 'production') { return; }` | early-return que desliga o `superRefine` |
| `server/src/config/runtimeEnv.ts:127-133` | única guarda forte (`length < 8` **e** `ENV_PLACEHOLDER_PATTERN`) | **inalcançável** fora de `production` |
| `server/src/config/runtimeEnv.ts:12` | `ENV_PLACEHOLDER_PATTERN = /^(CHANGE_ME\|dev-only-change-me)/i` | **casa** com o default do compose e com o fallback do seed |
| `server/config/db.ts:23` | `await seedDatabase()` no `connectDB()` | o seed roda **no boot**, sempre |
| `server/src/config/seeds.ts:188-196` | fora de `production`, erro de seed é **engolido** e o boot continua | reforça §3.4 |
| `docker-compose.prod.yml:105` | `${ADMIN_SEED_PASSWORD:?defina … de producao}` | **forma correta já existe no repositório** — e é o arquivo não exercitado (`:23`) |
| `.env.example:46`, `.env.docker.example:18`, `server/.env.example:40` | `ADMIN_SEED_PASSWORD=CHANGE_ME_REQUIRED_IN_PRODUCTION` | os três **já** casam com o `ENV_PLACEHOLDER_PATTERN` — forma correta, é o precedente a preservar |
| `.github/workflows/server-ci.yml:114,183` | valor de CI forte, `NODE_ENV: test` (`:103`) | CI **nunca** exercita o ramo `production` do `superRefine` |
| `server/tests/unit/seeds-production-boot.test.ts:79-85` | **asserta o literal do fallback** como valor esperado | **o teste existente trava o defeito**. Ver §5.3 |
| `README.md:50`, `:220-222` | afirmam que sem a variável "o servidor não inicia" | verdadeiro **só** com `NODE_ENV=production`. Ver §3.4 |

**Conclusão da reprodução estática: `AUD-AUTHN-02` é REPRODUZIDO, não hipótese.**
E o escopo é maior que o enunciado: são **três defeitos distintos** (§3) mais um
gate morto (§3.4) e um **teste que trava o defeito** (§5.3).

### 1.1 Medição em arquivo não versionado (existência apenas)

Contagem de chave, sem imprimir valor, sem comparar contra literal:

```
grep -c '^ADMIN_SEED_PASSWORD=' .env         -> 1
grep -c '^ADMIN_SEED_PASSWORD=' server/.env  -> 1
grep -c '^NODE_ENV='            .env         -> 0
```

**Leitura honesta, três frases separadas para não colapsar:**

1. A variável **existe** nos dois `.env` desta máquina. **Não sei, e não posso
   saber sob `APR-2026-016`, se o valor é o placeholder ou um valor real** — não
   repeti a técnica de comparação booleana do adendo `T-02` §10 porque nada nesta
   triagem depende do resultado.
2. `NODE_ENV` **não está declarado** no `.env` da raiz. Logo
   `docker-compose.yml:43` resolve para `development` **hoje, nesta máquina** →
   `runtimeEnv.ts:73` retorna cedo → a guarda `:127-133` **não roda** → e
   `seeds.ts:130` **não** lança. Isto é medição, não inferência.
3. Vale **exclusivamente para esta máquina**. O dono opera em duas
   (`trabalho-dois-pcs-github`; registrado em `T-02` §10 item 3). O estado do
   segundo PC, de réplica, backup restaurado ou ambiente futuro **não foi
   verificado e permanece desconhecido**.

---

## 2. ROOT_CAUSE — causa-raiz demonstrada

**A causa-raiz é: o único ponto de criação da conta administrativa do sistema
não tem, em nenhum ambiente, um caminho de falha por credencial fraca — ele tem
três caminhos de sucesso silencioso, e o único que falharia está atrás de um
`NODE_ENV` que o próprio compose rebaixa.**

Cadeia, linha a linha, do artefato versionado ao efeito:

1. `docker-compose.yml:43` → `NODE_ENV` cai em `development`.
2. `server/src/config/runtimeEnv.ts:73-75` → `superRefine` retorna antes de
   `:127`. A única validação forte de `ADMIN_SEED_PASSWORD` do sistema (mínimo 8
   **e** rejeição de placeholder) fica inalcançável.
3. `server/src/config/runtimeEnv.ts:52` → a variável é `optional()` no schema.
   Ausência não é erro de parse.
4. `docker-compose.yml:57` → se o operador não declarar a variável, o compose
   **fornece** um valor. O valor é conhecido por qualquer leitor do repositório.
5. `server/src/config/seeds.ts:129-135` → o `throw` de ausência é condicionado a
   `nodeEnv === 'production'`. Em `development` (passo 1) só emite `console.warn`
   (`:136`).
6. `server/src/config/seeds.ts:138` → e se **nem** a variável existir, um segundo
   literal, também versionado, entra como fallback.
7. `server/src/config/seeds.ts:139-141` → comprimento curto emite `console.warn`
   e **prossegue**.
8. `server/src/config/seeds.ts:142-148` → `User.create` com `role:'admin'`,
   `active:true`.
9. `server/config/db.ts:23` → isto roda no boot, automaticamente, sem
   intervenção.

**O defeito, em uma frase:** o repositório já demonstra saber a forma correta
(`docker-compose.prod.yml:105`, `${VAR:?}`) e a aplicou **somente ao arquivo que
`:23` declara não exercitado**, deixando o compose que hospeda produção real
(`APR-2026-016`) com um default publicado — e o único gate que o barraria
depende de um `NODE_ENV` que o mesmo arquivo rebaixa.

**Padrão sistêmico (idêntico ao registrado em `CASE-015` §9):** *o controle certo
existe, versionado, e está desligado.*

| Instância | Controle correto existe | Ligado no compose de produção real? |
|---|---|---|
| `AUD-AUTHN-01` / `CASE-005` | `${JWT_SECRET:?}` em `prod.yml:100` | **não** (`docker-compose.yml:54`) |
| `AUD-DB-01` / `CASE-015` | `evok_app` + `prod.yml:91` | **não** (`docker-compose.yml:49`) |
| **`AUD-AUTHN-02` / este caso** | `${ADMIN_SEED_PASSWORD:?}` em `prod.yml:105` | **não** (`docker-compose.yml:57`) |

---

## 3. Os TRÊS defeitos distintos dentro do mesmo finding — separados

O enunciado do finding os junta. Remediá-los como um só produz correção parcial
apresentada como completa. Separados, com efeito próprio:

### D-1 — Default versionado no compose (`docker-compose.yml:57`)

- **O que é:** `${ADMIN_SEED_PASSWORD:-<literal>}`. O compose **fornece** a senha
  quando o operador não a declara.
- **Quem atinge:** quem sobe `docker compose up` sem `ADMIN_SEED_PASSWORD` no
  `.env` da raiz, contra um banco cujo `users` está vazio.
- **Efeito:** admin criado com senha legível no repositório.
- **Independência:** corrigir D-1 **não** corrige D-2 — quem roda a API fora do
  Docker (`npm run dev`, o fluxo documentado em
  `docs/infra/DOCKER_POSTGRES_SETUP.md:18`) nunca passa pelo compose.

### D-2 — Fallback hardcoded no seed (`seeds.ts:138`)

- **O que é:** `adminPassword || '<literal>'`. Um **segundo** valor versionado,
  em outro arquivo, na linguagem da aplicação.
- **Quem atinge:** **qualquer** caminho de boot fora de `production` sem a
  variável — inclusive `npm run dev` no host, sem Docker nenhum.
- **Efeito:** idêntico a D-1, e sobrevive à correção de D-1.
- **Agravante próprio:** o valor casa com `ENV_PLACEHOLDER_PATTERN`
  (`runtimeEnv.ts:12`) — ou seja, **o próprio sistema classifica esse valor como
  placeholder proibido** em produção, e o usa como credencial em dev.

### D-3 — Validação de comprimento que só avisa (`seeds.ts:139-141`)

- **O que é:** `console.warn`, não `throw`. Não há `return`, não há exceção.
- **Quem atinge:** quem **declarou** a variável, corretamente, com valor curto ou
  fraco — o operador diligente que errou.
- **Efeito:** admin criado com a senha fraca declarada. A única sinalização é uma
  linha de log que rola para fora da tela no boot.
- **Independência:** é o único dos três que **não** envolve valor versionado.
  Corrigir D-1 e D-2 deixa D-3 inteiro: `ADMIN_SEED_PASSWORD=123` produz um admin
  de produção real com senha `123` e boot verde.

### 3.4 O gate morto — por que os três coexistem sem ninguém notar

`runtimeEnv.ts:127-133` é uma guarda **correta e suficiente** (mínimo 8 +
`ENV_PLACEHOLDER_PATTERN`, que casa com D-1 e D-2). Ela está atrás de
`runtimeEnv.ts:73`. Com `NODE_ENV=development` (o default de
`docker-compose.yml:43`, e a medição da §1.1 mostra que o `.env` desta máquina
não declara `NODE_ENV`), ela **nunca executa**.

**Este é o mesmo `CR-1` que `CASE-005` registrou** em
`remediation/cases/ERP-LEGACY-001-CASE-005/TRIAGE.md:230-232`, que nomeia
`ADMIN_SEED_PASSWORD` (`:127`) textualmente como *"o gate de `AUD-AUTHN-02`"*, e
que `T18-F02` cobre como finding próprio. `CASE-005` moveu **apenas** a guarda de
`JWT_SECRET` para fora do early-return — `RETEST_EVIDENCE.md:85` do `CASE-005`
declara que as outras **oito**, incluindo `ADMIN_SEED_PASSWORD`, seguem depois de
`:110`, e que **`T18-F02` permanece aberto**.

**Consequência de escopo, explícita:** existem duas formas de fechar este finding
— endurecer os três pontos locais (D-1/D-2/D-3), ou tirar a guarda `:127` de trás
do early-return. A segunda é `T18-F02`, tem raio muito maior (`DB_SSL`/`CORS`
derrubariam dev — `CASE-005` §5.1 opção B, rejeitada por isso) e **não é escopo
deste caso**. Esta triagem escolhe a primeira e **declara** que não fecha
`T18-F02`.

### 3.5 Documentação em drift — o README afirma um controle que não existe no ambiente real

- `README.md:50` — *"Com `NODE_ENV=production` o servidor **não inicia** sem
  ela."* **Literalmente verdadeiro e operacionalmente enganoso**: a condicional é
  precisamente o que `docker-compose.yml:43` desfaz.
- `README.md:220-222` — *"Não há credenciais hardcoded no código"*. **Falso por
  leitura direta:** `seeds.ts:138` é uma credencial hardcoded no código.
- `docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md:47` — classifica
  *"segredos obrigatórios sem default fraco … `ADMIN_SEED_PASSWORD` exigidos em
  produção, sem fallback previsível"* como **`[IMPLEMENTADO]`**, citando
  `docker-compose.yml` e `runtimeEnv.ts` como evidência. **Os dois arquivos
  citados provam o contrário.**

`VERDICT_CASE-005.md:139` já registrou esta contradição no README. Ela é insumo
deste caso, não achado novo — mas é **drift ativo** e faz parte do
`FILES_AFFECTED`.

---

## 4. Força real do controle compensatório — em que cenário `User.count() > 0` NÃO protege

`seeds.ts:117-121` é o que rebaixa este finding de CRITICAL a HIGH, e a leitura
da VeriCore está correta. Medindo o alcance exato:

**O que ele protege:** um banco que **já tem** qualquer usuário. Nesse caso o
seed retorna em `:120` e nada é criado. Nas 21 linhas de `users` hoje
(`PRODUCTION_STATUS_MAP.md:100`), o guard fecha. **A conta admin de hoje não foi
criada de novo por nenhum boot posterior** — isso é verdade e não deve ser
subdeclarado.

**O que ele NÃO protege — e o finding diz "provisionamento". Confere. Detalhando
em cenários concretos, todos derivados do código:**

| # | Cenário | Por que o guard falha | Evidência |
|---|---|---|---|
| **C-1** | Restauração de backup **parcial/seletivo** que não traz `users` | `User.count()` = 0 → seed roda com o default do compose | `seeds.ts:117-118`; `db.ts:23` |
| **C-2** | Segundo PC do dono provisiona banco novo por migrations e sobe a API | migrations criam schema mas **não** inserem em `users` → count 0 | `trabalho-dois-pcs-github`; `T-02` §10 item 3 |
| **C-3** | Réplica / ambiente de homologação criado a partir do repositório | idem C-2; e o `.env` novo provavelmente não tem `ADMIN_SEED_PASSWORD` nem `NODE_ENV` | §1.1 |
| **C-4** | Volume Docker do Postgres removido (`docker compose down -v`) e recriado | banco novo, `users` vazia, próximo `up` semeia | `docker-compose.yml` (volume nomeado) |
| **C-5** | O admin **atual** foi criado por este mesmo caminho | Se a conta admin de produção nasceu de um boot sem `ADMIN_SEED_PASSWORD` declarada, **ela já tem a senha versionada, hoje** | ver §4.1 — **não verificável sem inspecionar dado real** |
| **C-6** | Dev novo clona o repositório e sobe o compose apontando para o banco real (`DB_NAME: erp_evok_audio` é literal em `docker-compose.yml:47`) | se `users` estiver populada, o guard protege; se não, semeia **no banco de produção real** | `docker-compose.yml:47` |

**Duas propriedades do guard que reduzem ainda mais sua força, medidas por
leitura:**

1. **Ele é uma checagem TOCTOU sem transação.** `seeds.ts:117` conta e `:142`
   insere, fora de transação. Não é o vetor principal, mas significa que o guard
   é uma conveniência de idempotência, **não um invariante**.
2. **Ele protege a existência, não a qualidade.** Ele nunca examina a senha da
   conta existente. Se a conta admin já tem senha fraca, o guard a **preserva
   para sempre** e garante que nenhum boot futuro a corrija. **O controle
   compensatório é, ao mesmo tempo, o que impede a autocorreção.**

### 4.1 O que esta triagem NÃO PODE afirmar, e declara

**Não sei se a conta `admin@evokaudio.com.br` de produção tem hoje a senha
versionada.** Determinar isso exigiria (a) inspecionar dado real na tabela
`users`, ou (b) tentar autenticar contra a instância. As duas são **proibidas**
sob `APR-2026-016` sem aprovação humana explícita caso a caso, e nenhuma foi
solicitada nesta triagem. `T-02` §6 registra a mesma lacuna: **`L-T02-02` — "a
conta admin real nunca foi inspecionada: nenhuma query, nenhum login, nenhuma
credencial testada."**

**Isto é o nó do caso, e é exatamente por isso que a parte de produção é decisão
do dono (§6).** O cenário C-5 é indeterminado, e a diferença prática entre
"indeterminado" e "comprometido" é uma pergunta que só o dono pode responder ou
autorizar responder.

### 4.2 Por que a conta afetada é *exatamente* a parte que é produção real

`PRODUCTION_STATUS_MAP.md:130` classifica `users` como
**"PRODUÇÃO REAL, parcial … apenas a conta admin"** — as 20 contas
`@teste.evokaudio` são NÃO-PRODUÇÃO. `APPROVALS.md:341-342` (`APR-2026-016`) diz
o mesmo: *"`users` (parcialmente — a conta admin, não as 20 contas de teste
`@teste.evokaudio`)"*.

`seeds.ts:144` cria `email: 'admin@evokaudio.com.br'`, `role:'admin'`.

**Material, e é o que dá a severidade:** dos 21 registros de `users`, este
finding atinge **o único que é produção real**. Não há sobreposição parcial nem
zona cinzenta — o recorte de produção real e o recorte do finding são a mesma
linha. E é a conta com `role:'admin'`, que `middlewares/auth.ts:114-128` carrega
do banco a cada request e que autoriza os 681 endpoints (`T-02` §2).

---

## 5. BLAST_RADIUS — o que quebra se o seed exigir senha forte obrigatória sem fallback

Esta é a pergunta central do despacho e a resposta **não** é "nada".

### 5.1 O que quebra, verificado caminho por caminho

| Caminho | Hoje | Com exigência obrigatória sem fallback | Veredito |
|---|---|---|---|
| **Boot de banco novo via `docker compose up`, sem `.env` completo** | sobe, semeia com o default de `:57` | **`docker compose up` FALHA** antes de subir o container (se D-1 virar `${VAR:?}`) | **QUEBRA — por desenho.** É a correção. Precedente aceito: `DB_PASSWORD` (`:50`) já faz isso, e `CASE-005` fez o mesmo com `JWT_SECRET`/`NODE_ENV`, ratificado em `APR-2026-049` D2 |
| **Boot de banco novo via `npm run dev` (host, sem Docker)** | sobe, semeia com o fallback de `:138` | **boot lança** no seed | **QUEBRA — por desenho.** Fluxo real e documentado (`DOCKER_POSTGRES_SETUP.md:18,86-93`) |
| **Boot com `users` já populada (o caso do dono, hoje)** | `seeds.ts:118-120` retorna antes de tocar senha | **inalterado** — não chega em `:128` | **NÃO QUEBRA.** Ponto crítico: se a exigência for validada **dentro** de `seedDatabase()`, depois do guard, o dono não sente nada. Se for movida para o schema Zod (`runtimeEnv.ts:52`), **quebra o boot de todo mundo, inclusive com banco populado.** Ver §7 |
| **CI (`server-ci.yml`)** | `NODE_ENV: test` (`:103`), `ADMIN_SEED_PASSWORD` forte (`:114`, `:183`) | **NÃO QUEBRA** — valor tem 18 caracteres, não casa com `ENV_PLACEHOLDER_PATTERN` | **OK.** Verificado nos dois jobs |
| **Suíte unitária `seeds-production-boot.test.ts`** | 5 casos passam | **QUEBRA 2 de 5** (`:67-92` e `:133-150`) | **QUEBRA — e é o achado mais importante do blast radius.** Ver §5.3 |
| **Suítes que só definem a variável para satisfazer o schema** (`runtime-env.test.ts:20,34,48,62,77`, `runtime-env-production-tracking.test.ts:48`, `logger.test.ts:32`, `database-config.test.ts:19`) | valores fortes, ≥ 8, sem prefixo de placeholder | **NÃO QUEBRAM** | verificado por leitura das 8 ocorrências |
| **`docker-compose.prod.yml`** | já é `${VAR:?}` (`:105`) | inalterado | **conformidade a PRESERVAR** — reprova o reteste se regredir |
| **Dev novo clonando o repositório** | `cp .env.example .env` já traz `ADMIN_SEED_PASSWORD=CHANGE_ME_REQUIRED_IN_PRODUCTION` (`.env.example:46`) | **o valor do exemplo casa com `ENV_PLACEHOLDER_PATTERN`** → se a rejeição de placeholder passar a valer fora de produção, o boot do dev novo **falha após copiar o exemplo** | **QUEBRA, e é a armadilha do caso.** Ver §5.2 |

### 5.2 A armadilha do onboarding — e o precedente que a resolve

**Doc de setup real, localizado antes de afirmar** (não é suposição):
`docs/infra/DOCKER_POSTGRES_SETUP.md`. `:10-25` documenta os **dois** `.env` do
projeto e instrui `cp .env.example .env` + `cp server/.env.example server/.env`.
`:60-65` diz explicitamente *"Definir `DB_PASSWORD` no `.env` — OBRIGATÓRIO, sem
isso o compose recusa subir"*. `:106-112` documenta a mensagem de erro de
`DB_PASSWORD` como **comportamento correto e esperado**, com o fix.
`README.md:56-60` reforça o mesmo para `DB_PASSWORD`.

**Ou seja: o repositório já tem um fluxo de onboarding que ensina "o boot falha
até você preencher o segredo, e isso é de propósito", e ele já foi aceito para
`DB_PASSWORD`.** A correção deste caso deve **entrar nesse fluxo existente**, não
criar outro. Sem esse alinhamento de doc, a reação previsível ao primeiro boot
falhado é reverter a correção — é exatamente o risco que `CASE-005` §5.1 (item
C6) registrou.

**Tensão que precisa de decisão técnica no despacho, não de invenção:** os três
`.env*.example` trazem `CHANGE_ME_REQUIRED_IN_PRODUCTION`, que **casa** com
`ENV_PLACEHOLDER_PATTERN`. Isso é a forma **correta** e foi ratificada em
`APR-2026-049` D2 (o dono autorizou; o engineer implementou de modo que os
exemplos *não subam o boot*, e a reprovação venha da guarda de placeholder, não
de comprimento). **Portanto: se a rejeição de placeholder de
`ADMIN_SEED_PASSWORD` passar a valer fora de produção, o boot após `cp
.env.example .env` falha — e isso é o comportamento ratificado, não uma
regressão.** Mas o doc tem de dizer isso, e a mensagem de erro tem de ensinar o
fix, como `DOCKER_POSTGRES_SETUP.md:106-112` faz para `DB_PASSWORD`.

### 5.3 ACHADO ADICIONAL — o teste existente TRAVA o defeito

`server/tests/unit/seeds-production-boot.test.ts:79-85` asserta:

```ts
expect(User.create).toHaveBeenCalledWith(
  expect.objectContaining({
    email: 'admin@evokaudio.com.br',
    password: 'dev-only-change-me',    // <- o literal do fallback, como valor ESPERADO
    role: 'admin',
  }),
);
```

E `:133-150` (*"avisa quando `ADMIN_SEED_PASSWORD` e muito curta"*) asserta que
uma senha de 3 caracteres produz **`console.warn` e boot bem-sucedido** — ou
seja, **asserta D-3 como comportamento correto**.

**Consequências, e são duas coisas diferentes:**

1. **Operacional:** remover o fallback (D-2) e fazer o comprimento bloquear (D-3)
   **reprova 2 dos 5 casos desta suíte**. O engineer **tem** de reescrever esses
   dois casos, e a reescrita é parte da remediação — não é "consertar teste
   quebrado". Se ele apenas ajustar o literal esperado, a correção não aconteceu.
2. **De método, e é o mais grave:** este é um caso de **teste que congela o
   defeito**. A suíte de 1400+ testes passa verde **porque** afirma que o
   fallback é o esperado. É a mesma classe registrada em
   `armadilhas-validacao-erp` e o motivo pelo qual asserção de comportamento
   inseguro é pior que ausência de teste: ela transforma a correção em "quebra de
   suíte", criando pressão para reverter.

### 5.4 `FILES_AFFECTED` (previsão da triagem, não autorização de escrita)

Nenhum arquivo de lógica de negócio de `server/src/modules/` muda.

```
docker-compose.yml                                  (services.api.environment.ADMIN_SEED_PASSWORD — D-1)
server/src/config/seeds.ts                          (:138 fallback D-2; :139-141 comprimento D-3)
server/tests/unit/seeds-production-boot.test.ts      (§5.3 — 2 casos a reescrever)
server/tests/unit/<nova guarda de compose>            ARQUIVO NOVO (ver §8 e §5.5)
README.md                                            (:50, :220-222 — drift §3.5)
docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md         (:47 — [IMPLEMENTADO] falso, §3.5)
docs/infra/DOCKER_POSTGRES_SETUP.md                   (§5.2 — o fluxo de onboarding)
```

**Fora de `FILES_AFFECTED`, deliberadamente:**
`server/src/config/runtimeEnv.ts:73` (é `T18-F02`, §3.4);
`docker-compose.prod.yml` (já correto, conformidade a preservar);
`.env*.example` (já corretos, ratificados em `APR-2026-049` D2 — **não tocar**);
`.github/workflows/server-ci.yml` (valor já forte; e há trava `CD-CI-01` /
`APR-2026-026` item 3 sobre este arquivo).

### 5.5 Colisão de artefato de teste — `docker-compose-jwt-secret-guard.test.ts`

`CASE-005` criou `server/tests/unit/docker-compose-jwt-secret-guard.test.ts` (na
branch, **não em `main`**). Li o arquivo na branch. Ele termina com:

```
// NOTA DE ESCOPO: `ADMIN_SEED_PASSWORD` (docker-compose.yml:57) tem a mesma
// forma defeituosa e e o finding AUD-AUTHN-02, cujo escopo ainda nao foi
// decidido pelo dono. Deliberadamente NAO asserido aqui.
```

**Isto é um handoff explícito do `CASE-005` para este caso.** Duas leituras
possíveis, e escolho a segunda com fundamento:

- Editar aquele arquivo para acrescentar a asserção → **colisão real de merge**
  com uma branch não mesclada, e mistura dois findings no mesmo artefato de
  evidência (o mesmo erro que `CASE-015` §8 item 5 já identificou e evitou).
- **Criar arquivo novo** (`docker-compose-admin-seed-guard.test.ts`) → sem
  colisão, evidência separada por finding, e a nota de escopo do `CASE-005`
  permanece verdadeira como registro histórico.

**Regra para o engineer: arquivo NOVO. Não editar o guard do `CASE-005`.**

### 5.6 `REGRESSION_RISK`

| Escopo | Risco | Fundamento |
|---|---|---|
| D-1 (`${VAR:?}` no compose) | **BAIXO** | forma já usada 2× no mesmo arquivo (`:13`, `:50`) e em `prod.yml:105`. Precedente aceito em `APR-2026-049` D2. Efeito: `docker compose up` falha ruidosamente sem a variável |
| D-2 (remover fallback) | **BAIXO-MÉDIO** | nenhum consumidor de produção depende dele; quebra 1 caso de teste (§5.3) e o boot de dev sem variável — **é o objetivo** |
| D-3 (comprimento bloqueia) | **MÉDIO** | quebra 1 caso de teste (§5.3). Risco real: escolher um mínimo mais rígido que `runtimeEnv.ts:127` (8) cria **duas políticas divergentes** no mesmo sistema. Ver §7 item 3 |
| Guarda estática nova | **BAIXO** | arquivo novo, sem banco, sem execução |
| Alinhar README / NFR / setup doc | **BAIXO** | mas **necessário** — sem isso a correção é revertida por atrito (§5.2) |
| **Mover a validação para o schema Zod** (`runtimeEnv.ts:52`) | **ALTO — NÃO FAZER** | quebraria o boot de **toda** instância com banco já populado, inclusive a do dono, que hoje não passa por `:128`. A validação tem de ficar **depois** do guard `:117-121` |
| **Rotacionar a senha do admin existente em produção** | **fora de escopo técnico** | ato de produção. §6 |

---

## 6. Este caso é executável agora? PARCIALMENTE — e o limite é `APR-2026-049`

### 6.1 A reserva de `APR-2026-049` alcança a rotação da senha do admin?

Li `APPROVALS.md:2991-3071` inteiro. Sendo preciso, porque a diferença importa e
`APR-2026-016` proíbe estender aprovação por analogia:

- `APR-2026-049` **D3** (`:3042-3055`) reserva nominalmente a **rotação da chave
  JWT** de produção: *"gate humano pendente, sem prazo … Não decidir agora."*
  **Não menciona senha de usuário, nem credencial de banco.** Portanto **NÃO
  afirmo** que D3, na letra, cobre a senha do admin.
- `APR-2026-049` **D1** (`:2997-3013`) autorizou e executou a troca de um segredo
  em `server/.env` — arquivo **local, não versionado, sem estado no banco**.
  Trocar a senha do admin é **categoricamente diferente**: o estado vive na
  tabela `users`, que é produção real.

**Mas a rotação está bloqueada de todo modo, por três fundamentos independentes
e mais fortes que a analogia:**

1. **`APR-2026-016`** (`APPROVALS.md:329-344`) põe `users` (a conta admin) e o
   banco de `docker-compose.yml` sob regime read-only reforçado **permanente**, e
   exige aprovação humana **caso a caso**, *"nunca por extensão de uma aprovação
   anterior, nunca por inferência"*. Trocar a senha do admin é escrita em dado
   real. **Nenhum agente pode executá-la.**
2. **O fundamento material do próprio dono em D3 se aplica com força igual, e é
   por isso que a analogia, embora eu não a invoque como autorização, aponta para
   a mesma resposta.** Trocar a senha do admin incrementa `passwordVersion`
   (`User.ts:118-134`), e `middlewares/auth.ts:99-103` **expulsa todas as sessões
   ativas daquele usuário**. É o mesmo efeito operacional que fundamentou D3
   (*"invalida todo token já emitido … Não é decisão de madrugada"*), aplicado à
   única conta real do sistema — **inclusive a sessão de quem está executando a
   troca.**
3. **Precedente literal de recusa por falta de autorização:**
   `APPROVALS.md:2967-2977` (`APR-2026-048`) registra que **nem uma tentativa de
   conexão que deveria falhar** foi executada contra produção, porque *"para
   igualar o precedente é preciso autorização humana explícita e escopada … Caso
   a caso, nunca por extensão."* Se conectar para provar recusa exige
   autorização, trocar a credencial do único admin real exige mais.

**Veredito da §6.1, na forma que o despacho pediu:** a rotação **não está
coberta pela letra de `APR-2026-049` D3**, e por isso **não** digo "bloqueada por
D3". Ela está **BLOQUEADA POR `APR-2026-016`**, que é mais forte e não depende de
analogia. O efeito prático é o mesmo: **é decisão e ato do dono, não da
SanaCore.** E há uma pergunta anterior à rotação, que só o dono pode responder ou
autorizar responder: **a senha atual é a versionada?** (§4.1, `L-T02-02`).

### 6.2 A linha divisória — o que É e o que NÃO É executável

**EXECUTÁVEL AGORA (nenhuma decisão nova do dono; despachado):**

| # | Item | Por que não precisa de decisão nova |
|---|---|---|
| **E-1** | D-1: `docker-compose.yml:57` → `${ADMIN_SEED_PASSWORD:?…}` | Forma já presente 2× no mesmo arquivo, e em `prod.yml:105`. `APR-2026-049` D2 ratificou exatamente esta forma neste mesmo bloco YAML. Zero invenção |
| **E-2** | D-2: remover o fallback de `seeds.ts:138` | Remover credencial hardcoded do código é o núcleo do finding. `README.md:220-222` já **afirma** que ela não existe |
| **E-3** | D-3: comprimento passa a **bloquear** (`seeds.ts:139-141`) | Alinha com a política **já versionada** em `runtimeEnv.ts:127` (mínimo 8). Não é regra nova — é aplicar a existente onde ela não chegava |
| **E-4** | Rejeição de placeholder no seed, reusando `ENV_PLACEHOLDER_PATTERN` | O padrão já existe (`runtimeEnv.ts:12`) e já classifica esses valores como proibidos. Precedente de forma: `APR-2026-049` D2 |
| **E-5** | Guarda estática nova (arquivo novo, §5.5) | Impede reintrodução. Sem banco, sem execução |
| **E-6** | Reescrever os 2 casos de `seeds-production-boot.test.ts` (§5.3) | Consequência mecânica de E-2/E-3 |
| **E-7** | Corrigir o drift de `README.md:220-222`, `REQUISITOS_NAO_FUNCIONAIS.md:47` e alinhar `DOCKER_POSTGRES_SETUP.md` | Documentação passa a descrever o código. §5.2 mostra que sem isso a correção é revertida |

**NÃO EXECUTÁVEL — exige ação e decisão humana em produção:**

| # | Item | Por quê |
|---|---|---|
| **H-1** | Determinar se `admin@evokaudio.com.br` tem hoje a senha versionada | Exige inspeção de dado real ou tentativa de login. `APR-2026-016` — aprovação caso a caso. `L-T02-02` |
| **H-2** | Rotacionar a senha do admin de produção | Escrita em produção real; expulsa todas as sessões (`passwordVersion`). §6.1 |
| **H-3** | Declarar `ADMIN_SEED_PASSWORD` e `NODE_ENV` no `.env` de produção antes do próximo `docker compose up` | **Pré-requisito operacional de E-1.** Sem isso o próximo `up` do dono **falha** |
| **H-4** | Verificar o estado do segundo PC / réplicas | Fora do alcance desta máquina (§1.1 item 3) |

### 6.3 O aviso operacional que o despacho de E-1 obriga

**E-1 não é mudança inerte.** `${ADMIN_SEED_PASSWORD:?}` **entra em vigor
sozinho** no próximo `docker compose up -d` do dono. Se `ADMIN_SEED_PASSWORD` não
estiver no `.env` da raiz, **o `up` falha e a API não sobe.**

Medição da §1.1: a chave **existe** no `.env` da raiz desta máquina (`grep -c`
= 1). **Logo, nesta máquina, E-1 é neutro no próximo `up`.** Mas:

- Não sei se o valor satisfaz as validações novas (não posso ler o valor).
- **Não sei nada sobre o `.env` do segundo PC.**

**Portanto o despacho deve carregar, e o `PENDING_DECISION.md` deve registrar,
uma nota operacional:** antes do próximo `docker compose up` **em qualquer
máquina**, confirmar que `ADMIN_SEED_PASSWORD` está declarada com valor forte
(≥ 8, sem prefixo `CHANGE_ME`/`dev-only-change-me`). Isto **não** é aprovação de
escopo — é aviso de efeito, e é obrigação da triagem declarar.

---

## 7. Plano de correção — decisões técnicas que o engineer NÃO deve improvisar

Estas quatro têm resposta correta derivável do repositório. Fixadas aqui para o
engineer não inventar:

1. **Onde validar: dentro de `seedDatabase()`, DEPOIS do guard `:117-121`.**
   **Não** no schema Zod (`runtimeEnv.ts:52`). Fundamento: mover para o schema
   quebra o boot de toda instância com banco populado — inclusive a do dono, que
   hoje nem chega em `:128`. A validação só deve existir no caminho que
   **realmente vai criar** a conta. §5.6.
2. **Independente de `NODE_ENV`.** A validação nova **não** pode ficar atrás de
   `nodeEnv === 'production'`, senão reproduz o gate morto da §3.4 e o patch é
   cosmético. Este é o critério que separa correção de teatro.
3. **Mínimo de comprimento: 8** — o mesmo de `runtimeEnv.ts:127`. **Não** inventar
   12, 16 ou regra de complexidade. Fundamento: política de senha é
   `AUD-AUTHN-09` (LOW, finding separado, `AuthCredentialsEntity.ts:89-91`
   mínimo 6); mudá-la aqui é decidir regra de negócio (Regra 6) e criar uma
   terceira política divergente. **Aplicar a existente onde ela não chegava é
   remediação; endurecê-la é outro finding.**
4. **Rejeição de placeholder: reusar `ENV_PLACEHOLDER_PATTERN` de
   `runtimeEnv.ts:12`.** Não escrever regex nova, não copiar o literal. Exportar
   e importar. Fundamento: `APR-2026-049` D2 estabeleceu que a reprovação deve
   vir da **guarda de placeholder**, não de comprimento — *"reprovar só por
   comprimento é frágil, porque alongar a string faria o exemplo subir com chave
   conhecida."* Mesma lógica exata aqui.

**O que o plano deliberadamente NÃO faz:** não move `runtimeEnv.ts:73`
(`T18-F02`); não toca `docker-compose.prod.yml`; não toca os `.env*.example`
(ratificados em `APR-2026-049` D2); não toca `server-ci.yml` (`CD-CI-01`); não
endurece a política de senha de usuário final (`AUD-AUTHN-09`); não rotaciona
credencial nenhuma.

---

## 8. RISCO DE COORDENAÇÃO — três casos tocam `docker-compose.yml`

Modelado na §3 de `CASE-014/CODEX_REMEDIATION_DISPATCH.md` e na §8 de
`CASE-015/TRIAGE.md`. **Verificado, não presumido.**

### 8.1 Estado de merge — verificado agora

| Caso | Branch | Em `main`? (`git merge-base --is-ancestor`) | Estado |
|---|---|---|---|
| `CASE-005` (`AUD-AUTHN-01`) | `sana/ERP-LEGACY-001/CASE-005` @ `7b06404` | **NÃO** | remediação feita, aguardando reteste dinâmico |
| `CASE-015` (`AUD-DB-01`) | — (nenhuma branch criada) | — | `BLOQUEADO_DECISAO_DONO`, despacho **não emitido** |
| **`CASE-018`** (este) | a criar | **NÃO** | triagem hoje; parte executável despachada |

### 8.2 Quem toca qual linha — mapa exato (numeração de `main @ 0ee65c5`)

| Linha em `main` | Chave | `CASE-005` | `CASE-015` | `CASE-018` |
|---|---|---|---|---|
| `:43` | `NODE_ENV` | **TOCA** (`${:-development}` → `${:?}`, +6 linhas de comentário) | — | — |
| `:47` | `DB_NAME` | — | — | — |
| `:49` | `DB_USER` | — | **TOCA** (`evok_admin` → `${DB_USER:?}`, Opção B item 2) | — |
| `:50` | `DB_PASSWORD` | preserva (assere, não altera) | preserva | preserva |
| `:54` | `JWT_SECRET` | **TOCA** (`${:-…}` → `${:?}`, +6 linhas) | — | — |
| **`:57`** | **`ADMIN_SEED_PASSWORD`** | **NÃO TOCA — escopo excluído explicitamente** | — | **TOCA** (`${:-…}` → `${:?}`) |

**Prova de que `CASE-005` não toca `:57`** — três evidências independentes:

1. `git show sana/ERP-LEGACY-001/CASE-005:docker-compose.yml | grep -n
   ADMIN_SEED_PASSWORD` → linha **69** (deslocada pelos comentários novos), com a
   forma `${ADMIN_SEED_PASSWORD:-<literal>}` **intacta**.
2. `docker-compose-jwt-secret-guard.test.ts` (na branch) traz a *NOTA DE ESCOPO*
   citada na §5.5, declarando a omissão como deliberada.
3. `VERDICT_CASE-005.md:300` (VeriCore): *"**Não fecha `AUD-AUTHN-02`**
   (`docker-compose.yml:57`, `ADMIN_SEED_PASSWORD`…)"*.

**Não há sobreposição de linha entre os três casos.** `CASE-005` §4 recomendou
incluir `:57` no mesmo lote (item C2) e o director **não** o incluiu. Este caso é
a execução daquela recomendação, em caso próprio.

### 8.3 As regras de coordenação

1. **Mesclar um caso de cada vez, nunca em paralelo sem rebase.** Os três hunks
   (`:43`, `:54`, `:57`) ficam a 3-4 linhas de distância no mesmo bloco
   `services.api.environment`. Merge automático é **provável, não garantido** —
   e por serem próximos, é fácil mesclar errado sem ninguém notar.
2. **Deslocamento de linha é CERTO.** Após os dois hunks de `CASE-005`
   (+6 linhas de comentário cada), `ADMIN_SEED_PASSWORD` sai de `:57` para
   `~:69` (medido: linha 69 na branch de `CASE-005`).
   **Nenhum item do despacho deste caso pode endereçar linha fixa de
   `docker-compose.yml` — endereçar por chave
   (`services.api.environment.ADMIN_SEED_PASSWORD`).**
3. **Ordem de merge segura (recomendação ao director, não decisão minha):**
   `CASE-005` → `CASE-018` → `CASE-015`.
   Fundamento: `CASE-005` está mais adiantado (aguardando reteste dinâmico) e
   introduz os deslocamentos de linha; `CASE-018` é o menor delta de compose (1
   linha) e rebaseia trivialmente; `CASE-015` está bloqueado por decisão do dono
   e ainda pode mudar de forma (Opção A/B/C não decidida). Mesclar `CASE-015`
   antes seria fixar posição a partir de um caso que não está aprovado.
4. **Guardas de teste: arquivo novo por caso.** `CASE-005` →
   `docker-compose-jwt-secret-guard.test.ts`; `CASE-018` →
   `docker-compose-admin-seed-guard.test.ts` (novo); `CASE-015` → guarda própria
   de credencial. **Editar o guard de outro caso cria colisão real de merge e
   mistura findings no mesmo artefato de evidência.** §5.5.
5. **A guarda deste caso não deve assertar `JWT_SECRET` nem `DB_USER`**, sob pena
   de ficar vermelha em `main` antes de `CASE-005`/`CASE-015` serem mesclados, e
   de o veredito deste caso passar a depender de outro. Ela deve assertar
   `ADMIN_SEED_PASSWORD` e **preservar** `DB_PASSWORD` (já correto em `main`).
6. **Não agrupar os três num caso só.** `CASE-005` já está em reteste;
   `CASE-015` está bloqueado. Agrupar agora reabriria `CASE-005` e sequestraria
   este caso pelo bloqueio de `CASE-015`. As causas-raiz **são** a mesma família
   (§2), e o mecanismo comum é `T22-F02` (validação automatizada de composes) —
   que é finding próprio, não escopo deste caso.

### 8.4 Sobreposição conceitual declarada — e o que este caso não fecha

- **`T18-F02`** (HIGH) — o early-return de `runtimeEnv.ts:73` que mata a guarda
  `:127`. **Este caso NÃO o fecha.** §3.4.
- **`T22-F02`** (MEDIUM) — validação automatizada de compose via
  `docker compose config`. A guarda estática de E-5 é contribuição parcial;
  **não** fecha `T22-F02` (um guard de conteúdo de arquivo vê a *forma*, não
  prova que o compose parseia — `CASE-005` §5.3).
- **`AUD-AUTHN-09`** (LOW) — política de senha de usuário final. §7 item 3.
- **`AUD-AUTHN-13`** item (3) — `AccessProfileExecutionServiceAdapter.ts:42-49`
  cria usuário com senha temporária que ninguém recebe. Mesma **família**
  (provisionamento de credencial), causa-raiz **distinta**, outra trilha (T-16).
  **Sinalizado, não absorvido.**
- **Sem `OR-*` dedicado.** Varredura de `AUD-AUTHN-02` em
  `REMEDIATION_BACKLOG.md`: **uma única ocorrência**, `:107`, na lista dos HIGH
  nominais de produção real. Nenhuma trava `OR-01`…`OR-30` o nomeia. **Não invento
  trava.**

### 8.5 Registro de escopo do ID nominal `AUD-T01-02` (decisão recebida, não revisitada)

Registrado por rastreabilidade: o próximo ID nominal da fila era `AUD-T01-02`, e
ele **não** ganha caso próprio porque `T-26_CONSOLIDACAO.md:129` (cluster
**C-06**) declara `AUD-DB-03` + `AUD-T01-02` + `T-05-10` como *"um defeito, três
medições convergentes"* — resolvido em `CASE-016` (+ `CASE-014`). Caso próprio
seria dupla contagem, proibida por `T-39` §2.2 item 3. **Decisão de escopo
recebida do director; esta triagem não a revisita.**

---

## 9. Critério de reteste (para a VeriCore fixar; NÃO é fechamento)

### 9.1 Estático — sem banco, roda em CI

| ID | Asserção | Reprova em `main @ 0ee65c5`? |
|---|---|---|
| `CR-018-E1` | `docker-compose.yml` não usa a forma `${ADMIN_SEED_PASSWORD:-…}` (sem default versionado) | **SIM** (`:57`) |
| `CR-018-E2` | `docker-compose.yml` usa `${ADMIN_SEED_PASSWORD:?…}`, como `DB_PASSWORD` já faz | **SIM** |
| `CR-018-E3` | `server/src/config/seeds.ts` não contém nenhum literal de senha como fallback; nenhuma senha é construída por `\|\|` com string literal | **SIM** (`:138`) |
| `CR-018-E4` | Senha de seed abaixo do mínimo **interrompe** a criação da conta (`throw`), não apenas `console.warn` | **SIM** (`:139-141`) |
| `CR-018-E5` | A validação nova **não** é condicionada a `NODE_ENV` — vale em `development`, `test` e `production` | **SIM** (hoje `:130` condiciona) |
| `CR-018-E6` | Valor que casa com `ENV_PLACEHOLDER_PATTERN` é **rejeitado** pelo seed em qualquer ambiente, e a rejeição vem da guarda de placeholder (não só de comprimento) | **SIM** |
| `CR-018-E7` | O mínimo aplicado é **o mesmo** de `runtimeEnv.ts:127` (8) — nenhuma política nova de senha foi inventada | vigilância |
| `CR-018-E8` | Nenhum caso de teste asserta valor de senha versionado como esperado (§5.3) | **SIM** (`seeds-production-boot.test.ts:82`) |
| `CR-018-E9` | `docker-compose.prod.yml:105` continua `${VAR:?}` — **conformidade a PRESERVAR** | não — não pode regredir |
| `CR-018-E10` | Os três `.env*.example` continuam com valor que casa com `ENV_PLACEHOLDER_PATTERN` — **conformidade de `APR-2026-049` D2 a PRESERVAR** | não — não pode regredir |
| `CR-018-E11` | `README.md` e `docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md:47` sem drift em relação ao código (§3.5) | **SIM** |
| `CR-018-E12` | Nenhum artefato de remediação/evidência reproduz o valor de senha | vigilância — vale para o próprio pacote |

### 9.2 Dinâmico — **exclusivamente `erp_evok_audio_test`**, NUNCA `erp_evok_audio`

> **Trava explícita.** Nenhuma sonda deste caso pode nomear, conectar ou
> escrever em `erp_evok_audio`. `APR-2026-016` proíbe; o guarda de banco de
> produção de `.claude/hooks/org-isolation.js` bloqueia. Sonda contra
> `users` real **exige aprovação humana explícita caso a caso** e **nenhuma foi
> concedida**.

| ID | Sonda | Resultado que fecha |
|---|---|---|
| `DYN-018-01` | Banco de teste **vazio** (`users` sem linhas), `NODE_ENV=development`, `ADMIN_SEED_PASSWORD` **ausente** → boot | **FALHA** com erro nomeando a variável. Hoje: sobe e cria admin com o literal de `seeds.ts:138` |
| `DYN-018-02` | Idem, variável presente mas **curta** (< 8) | **FALHA**. Hoje: `console.warn` e cria a conta |
| `DYN-018-03` | Idem, variável presente casando com `ENV_PLACEHOLDER_PATTERN` (ex.: prefixo `CHANGE_ME`) | **FALHA** pela guarda de placeholder — a **mensagem** é a asserção |
| `DYN-018-04` | Idem, variável presente e forte | **SUCESSO**; admin criado; senha **bcrypt-hasheada** (`User.ts:118-134`), nunca em texto claro |
| `DYN-018-05` | Banco de teste com `users` **populada** (≥ 1 linha), variável **ausente** | **SUCESSO, boot normal** — prova que o guard `:117-121` continua curto-circuitando e que a correção **não** quebra instância existente (§5.6, o risco ALTO evitado) |
| `DYN-018-06` | Suíte `server/tests/unit/seeds-production-boot.test.ts` completa | passa com os 2 casos **reescritos** (§5.3), e os casos novos reprovam no `AUDIT_COMMIT` |

**Armadilhas de reteste (reprovam o fechamento se ignoradas):**

1. **Validação escondida atrás de `NODE_ENV`.** Se `DYN-018-01` passar apenas com
   `NODE_ENV=production`, o gate morto da §3.4 foi reproduzido e o patch é
   cosmético. **Todas as sondas rodam com `NODE_ENV` fora de `production`.**
2. **`DYN-018-05` omitido.** Sem ele, ninguém prova que a correção não derruba a
   instância do dono no próximo boot. É a sonda que mede o risco, não a correção.
3. **Verde por não executar.** Se o seed não chegar em `:128` por qualquer motivo
   colateral, todas as sondas "passam". Registrar, no output de cada uma, que a
   criação foi tentada (`User.count()` = 0 antes).
4. **Teste ajustado em vez de reescrito.** Trocar o literal esperado em
   `seeds-production-boot.test.ts:82` por outro literal mantém o defeito.
   `CR-018-E8` existe para pegar isso.
5. **Ler o resultado do banco de teste como estado de produção.** `DYN-018-*`
   provam que o **código** está correto. Não dizem **nada** sobre a senha do
   admin de produção (§4.1 / `L-T02-02`). Confundir os dois é o erro que este
   documento mais tenta prevenir.
6. **Declarar `AUD-AUTHN-02` fechado com E-1…E-7.** O código fica correto e a
   **reintrodução** fica travada. Se a conta admin de produção já tem a senha
   versionada, ela **continua tendo** — o guard `:117-121` garante que nenhum
   boot a corrija (§4 item 2). **Mecanismo ≠ estado da credencial.** Isso precisa
   estar escrito no pacote de evidência, sob risco de virar "concluído com
   ressalva", que este programa não aceita.

---

## 10. Saída formal da triagem

```
ROOT_CAUSE:            O unico ponto de criacao da conta administrativa
                       (seeds.ts:128-148, executado no boot por db.ts:23) nao
                       tem caminho de falha por credencial fraca em nenhum
                       ambiente: o compose FORNECE um default versionado
                       (docker-compose.yml:57), o seed tem um SEGUNDO literal
                       como fallback (seeds.ts:138), o comprimento curto apenas
                       AVISA (seeds.ts:139-141), e a unica guarda forte do
                       sistema (runtimeEnv.ts:127-133) esta atras do
                       early-return de runtimeEnv.ts:73, inalcancavel porque
                       docker-compose.yml:43 rebaixa NODE_ENV a development
                       (medido: `.env` da raiz nao declara NODE_ENV).

TRES DEFEITOS DISTINTOS (nao um):
  D-1 default versionado no compose        -> docker-compose.yml:57
  D-2 fallback hardcoded no seed           -> seeds.ts:138 (sobrevive a D-1;
                                              atinge `npm run dev` sem Docker)
  D-3 comprimento que so avisa             -> seeds.ts:139-141 (sobrevive a
                                              D-1 e D-2; atinge quem declarou
                                              valor fraco)

LOCAL_FIX:             D-1 + D-2 + D-3, com a validacao DENTRO de
                       seedDatabase(), DEPOIS do guard :117-121, e
                       INDEPENDENTE de NODE_ENV.
SYSTEMIC_FIX_REQUIRED: SIM, e PARCIALMENTE FORA DE ESCOPO —
                       (a) guarda estatica de compose para o default nao poder
                           voltar (arquivo NOVO; escopo deste caso);
                       (b) reuso de ENV_PLACEHOLDER_PATTERN em vez de regra
                           nova (escopo deste caso);
                       (c) o early-return de runtimeEnv.ts:73, que mata 8
                           guardas de producao -> `T18-F02`, FORA DE ESCOPO,
                           NAO FECHADO por este caso;
                       (d) validacao de compose por `docker compose config`
                           -> `T22-F02`, FORA DE ESCOPO.

CONTROLE COMPENSATORIO: seeds.ts:117-121 (`User.count() > 0`) e REAL e
                       justifica HIGH em vez de CRITICAL. NAO protege em:
                       restauracao parcial sem `users` (C-1), segundo PC (C-2),
                       replica/homologacao (C-3), `down -v` + recriacao (C-4),
                       e NAO diz nada sobre a conta que JA EXISTE (C-5,
                       indeterminado - L-T02-02). Ele protege a EXISTENCIA, nao
                       a QUALIDADE: ao impedir novo seed, garante que nenhum
                       boot futuro corrija uma senha fraca ja gravada.

BLAST_RADIUS:          A conta `admin@evokaudio.com.br` — que e EXATAMENTE o
                       unico registro de `users` classificado PRODUCAO REAL
                       (PRODUCTION_STATUS_MAP.md:130; APR-2026-016), com
                       role:'admin', autorizando os 681 endpoints.
                       Quebram por desenho: `docker compose up` sem a variavel;
                       `npm run dev` com banco novo sem a variavel; 2 de 5
                       casos de seeds-production-boot.test.ts (:79-85, :133-150
                       — o teste ASSERTA o defeito).
                       NAO quebram: CI (server-ci.yml:114,183 — valor forte,
                       NODE_ENV=test); boot com `users` populada (o caso do
                       dono hoje); as 8 suites que so definem a variavel;
                       docker-compose.prod.yml (ja correto).
                       QUEBRARIA TUDO, e por isso PROIBIDO: mover a validacao
                       para o schema Zod (runtimeEnv.ts:52).

FILES_AFFECTED:        §5.4 — nenhum arquivo de server/src/modules/.
REGRESSION_RISK:       BAIXO em D-1; BAIXO-MEDIO em D-2; MEDIO em D-3 (risco de
                       inventar politica de senha divergente — mitigado por §7
                       item 3); ALTO e PROIBIDO mover para o schema Zod.
                       Risco de REVERSAO por atrito operacional se o fluxo de
                       onboarding (DOCKER_POSTGRES_SETUP.md) nao for alinhado.

COORDENACAO:           TRES casos tocam docker-compose.yml, em linhas
                       DISTINTAS e sem sobreposicao: CASE-005 (:43, :54),
                       CASE-015 (:49), CASE-018 (:57).
                       NENHUM CASE ESTA EM `main` — verificado com
                       `git merge-base --is-ancestor` em todas as branches
                       sana/*. CASE-005 NAO toca :57 (3 provas independentes,
                       §8.2). Ordem de merge segura recomendada:
                       CASE-005 -> CASE-018 -> CASE-015. Enderecar por CHAVE,
                       nunca por linha (deslocamento certo: :57 -> ~:69).
                       Guarda de teste: ARQUIVO NOVO, nao editar o guard do
                       CASE-005.

ESTADO:                PARCIALMENTE EXECUTAVEL
  parte (a) codigo/config/guardas/docs  -> DESPACHADA
                                          (CODEX_REMEDIATION_DISPATCH.md)
  parte (b) rotacao da senha do admin   -> BLOQUEADA
                                          por APR-2026-016 (nao pela letra de
                                          APR-2026-049 D3 — §6.1);
                                          PENDING_DECISION.md
  pergunta anterior a (b)               -> a senha atual E a versionada?
                                          INDETERMINADO (L-T02-02); responder
                                          exige aprovacao caso a caso.

AUTORIDADE DE FECHAR:  VeriCore, exclusivamente (Regra 4). Esta triagem NAO
                       declara FINDING CLOSED, RETEST_PASSED nem
                       RISK_ACCEPTED, e nao autoriza rotacao de credencial de
                       producao.
```

**Critério de conclusão da triagem (autoavaliação honesta).** Causa-raiz
**demonstrada** por `arquivo:linha` em artefato versionado no HEAD lido hoje, com
a branch declarada; os três defeitos separados por quem cada um atinge; a força
do controle compensatório medida em 6 cenários derivados do código; blast radius
mapeado caminho por caminho, com **dois achados que o finding não continha** (o
teste que trava o defeito, §5.3; e o drift do README/NFR, §3.5); risco de
regressão avaliado por recorte, incluindo um caminho explicitamente proibido; e a
linha entre executável e decisão do dono traçada com fundamento normativo citado,
sem estender aprovação por analogia.

**O que esta triagem não entrega, e declara:** nenhuma prova dinâmica.
`APR-2026-016` a proíbe contra produção, e eu optei por **não** tocar
`erp_evok_audio_test` também, porque nada aqui dependia disso — as sondas ficam
nomeadas na §9.2 para quem tiver a autorização e o ambiente. E **não determinei se
a senha do admin de produção é a versionada** (`L-T02-02`): é o nó do caso, exige
aprovação humana caso a caso, e está formulado como pergunta em
`PENDING_DECISION.md`.
