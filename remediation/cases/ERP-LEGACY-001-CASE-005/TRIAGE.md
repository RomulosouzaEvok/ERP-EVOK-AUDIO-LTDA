# TRIAGE — `ERP-LEGACY-001-CASE-005` (`AUD-AUTHN-01`)

```
CASE_ID:         ERP-LEGACY-001-CASE-005
FINDING_ID:      ERP-LEGACY-001-AUD-001 / AUD-AUTHN-01
SEVERIDADE:      CRITICAL (fixada pela VeriCore — NÃO reavaliada aqui, Regra 6)
AMBIENTE:        PRODUÇÃO REAL (T-39 §2.1, estrato 1, posição 2)
PROJECT_ID:      ERP-LEGACY-001
AUTORIZAÇÃO:     APR-2026-047 D4 (APPROVALS.md:2849ss — "autoriza a abertura desse caso")
AUDIT_COMMIT:    c1311a6f76b512fef893f7e60d934179cae3409f
HEAD analisado:  8b9e120  (working tree limpa)
DESTINO:         sanacore-remediation-engineer, worktree/branch
                 `sana/ERP-LEGACY-001/CASE-005`
SEGUNDA ENGINE:  Codex — parecer de causa-raiz e revisão de patch antes do reteste
                 VeriCore (CORETRIAD_MASTER_SPEC Parte VI §35; APR-2026-047 D3/D4).
                 §8 desta triagem é o insumo direto do contraditório.
FASE:            TRIAGEM — nenhuma linha de server/, client/, tests/, migration,
                 docker-compose, workflow ou artefato de audit/ foi alterada.
REGRA 3/4:       nenhum FINDING CLOSED, RETEST_PASSED ou REMEDIATION_COMPLETE aqui.
```

**Regra permanente de dado real (`APR-2026-016`) — cumprimento declarado.**
Nenhuma conexão de banco foi aberta nesta triagem, contra banco nenhum, nem para
"só contar linhas". `server/scripts/apply-pending-migrations.cjs` **não** foi
executado. Nenhuma requisição HTTP, nenhum `docker`, nenhum boot de API, nenhuma
suíte de teste. Comandos executados: apenas `git` de leitura (`log`,
`rev-parse`, `diff --stat`, `diff --name-only`, `merge-base`, `branch`,
`ls-files`) e **um** `node -e` puro sobre uma string literal, sem I/O
(contagem de caracteres, §9/D-1). Toda a reprodução do defeito é **estática**,
sobre arquivos versionados.

**Segredos.** Nenhum valor de segredo ou credencial é transportado para este
documento. O literal de `docker-compose.yml:54` é referenciado **por arquivo e
linha**, e o prefixo `dev-only-change-me` aparece apenas porque é o *padrão de
detecção* codificado em `runtimeEnv.ts:12` — não é o segredo de uma instância.

---

## 0. Método, e o que esta triagem acrescenta ao insumo recebido

Cada âncora arquivo+linha de `AUD-AUTHN-01` (`T-02_TIER1_IDENTIDADE_REPORT.md`
§3) e da causa-raiz declarada (`T18-F02`, `T-18_APPSEC_…md:68-81`) foi **relida
por mim, arquivo aberto, no HEAD atual** — nenhuma âncora foi herdada, nenhuma
foi confirmada por saída de `grep` (o renderizador já deformou literais em três
trilhas deste run; o grep foi usado só para *localizar* arquivo, nunca para
*confirmar* literal).

**Fato desta triagem que fecha a questão do drift:**

```
$ git diff --stat c1311a6f..HEAD -- docker-compose.yml docker-compose.prod.yml \
    .env.docker.example .env.example server/.env.example server/Dockerfile \
    server/Dockerfile.local-runtime server/src server/tests server/app.ts server/index.ts
(vazio)
```

**Todos** os artefatos deste caso são byte a byte idênticos entre o
`AUDIT_COMMIT` e o HEAD. O único arquivo do meu escopo com diferença no período
é `.github/workflows/server-ci.yml` (+74 linhas — o job informativo de governança
de `CASE-003`/`CASE-004`, já em `main`). A remediação parte exatamente do objeto
auditado. A confirmação formal da identidade `HEAD`×`AUDIT_COMMIT` continua sendo
do `vericore-audit-evidence-controller`; este parágrafo é insumo, não veredito.

---

## 1. REPRODUÇÃO ESTÁTICA DO FINDING — âncora a âncora, lida no arquivo

### 1.1 A chave versionada (`docker-compose.yml`)

| Linha | Conteúdo (transcrito da leitura do arquivo) |
|---|---|
| `:43` | `NODE_ENV: ${NODE_ENV:-development}` |
| `:54` | `JWT_SECRET: ${JWT_SECRET:-dev-only-change-me-please-change-me-123456789}` |
| `:57` | `ADMIN_SEED_PASSWORD: ${ADMIN_SEED_PASSWORD:-dev-only-change-me-please}` |
| `:67` | `- "5000:5000"` (bind `0.0.0.0`, comentado como proposital em dev, `:60-66`) |
| `:7,48` | `POSTGRES_DB`/`DB_NAME` = `erp_evok_audio` — **o banco sem sufixo, PRODUÇÃO REAL por `APR-2026-016`** |
| `:13,50` | `DB_PASSWORD: ${DB_PASSWORD:?…}` — **o padrão correto já existe no mesmo arquivo** |

O contraste de `:13`/`:50` contra `:54`/`:57` é o achado operacional do recorte:
o projeto **já domina** a forma `${VAR:?mensagem}` e a aplicou ao banco; a chave
de assinatura e a senha do admin ficaram na forma `${VAR:-valorFraco}`.

### 1.2 O desligamento das guardas (`server/src/config/runtimeEnv.ts`)

| Linha | Conteúdo |
|---|---|
| `:12` | `const ENV_PLACEHOLDER_PATTERN = /^(CHANGE_ME|dev-only-change-me)/i;` |
| `:34` | `NODE_ENV: z.enum(['development','test','production']).default('development'),` |
| `:49` | `JWT_SECRET: z.string().optional(),` |
| `:72-75` | `}).superRefine((env, ctx) => { if (env.NODE_ENV !== 'production') { return; }` |
| `:94-101` | guarda `PRODUCTION_TRACKING_REQUIRED=warn` (Bloco K/G4/G6) — dentro do ramo |
| `:103-109` | guarda `JWT_SECRET` (`<32` **ou** placeholder) — dentro do ramo |
| `:111-117` | guarda `CORS_ORIGIN` — dentro do ramo |
| `:119-125` | guarda `DB_PASSWORD` — dentro do ramo |
| `:127-133` | guarda `ADMIN_SEED_PASSWORD` — dentro do ramo |
| `:135-141` | guarda `DB_SSL` — dentro do ramo |
| `:143-165` | guardas `DB_FORCE_SYNC`, `DB_AUTO_ALTER`, `DB_ALLOW_UNSAFE_ALTER` — dentro do ramo |
| `:250-252` | única guarda **sempre ativa**: `if (!jwtSecret \|\| jwtSecret.length < 32) throw` |

O literal de `:54` tem **45 caracteres** (§9/D-1) → passa em `:250` sem tocar em
`:103`. O boot conclui, a API sobe, e o `superRefine` inteiro nunca executa.

### 1.3 Emissão e verificação com a mesma chave

- `server/src/modules/auth/infrastructure/jwt/TokenService.ts:7,9` —
  `const { secret, expiresIn } = getJwtRuntimeConfig();` →
  `jwt.sign({ id: userId, passwordVersion }, secret, { expiresIn, issuer, audience })`.
- `server/src/middlewares/auth.ts:60,69-72` — `const { secret } = getJwtRuntimeConfig();`
  → `jwt.verify(token, secret, { issuer: JWT_ISSUER, audience: JWT_AUDIENCE })`.
- `runtimeEnv.ts:244-245` — `JWT_ISSUER`/`JWT_AUDIENCE` são **constantes
  versionadas**, não segredo. Não acrescentam entropia contra quem lê o repo.
- `auth.ts:77-128` — o `id` decodificado vira `User.findByPk(decoded.id)` e o
  `role` é lido **do banco**. É exatamente por isso que a Regra 24 não é violada
  (T-02 §2, T-18 "Conformidade") **e** exatamente por isso o defeito é grave: o
  atacante não declara papel nenhum; ele forja `{id: N}` e o servidor concede,
  legitimamente, o papel real daquele usuário.

### 1.4 Cadeia de exploração — determinística, sem execução

1. Ler `docker-compose.yml:54` no repositório (acesso de leitura basta).
2. Assinar `{ id: <alvo>, passwordVersion: <v> }` com esse segredo,
   `issuer='erp-evok-audio'`, `audience='erp-evok-audio-api'` (`runtimeEnv.ts:244-245`).
3. `auth.ts:69` valida a assinatura; `:77` carrega o usuário; `:100` compara
   `passwordVersion` (valor de partida `1` por `:99`, e é adivinhável/enumerável
   em faixa pequena); `:114-128` monta `req.user` com `role` real do banco.
4. `authorize('admin')` (`:158`) e `authorizeModule` (`:226`) autorizam.

Nenhum passo depende de senha, de sessão existente, ou de `revoke-sessions`
(que altera `passwordVersion`, e portanto só força o atacante a incrementar um
inteiro). **Reprodução formal por execução é `DYN-T02-01` — e ela NÃO foi
executada**: a bateria dinâmica registra que `docker compose` estava
indisponível na máquina (`DYN_VERIFICACAO_BATERIA_01.md` §3, entrada
`DYN-T18-10`). O que existe hoje é prova estática completa + `DYN-T18-02`
(`ibid.` §2.3): o literal entrou no histórico em `95541ca` e **segue presente**
em `docker-compose.yml:54`.

---

## 2. CAUSA-RAIZ — o que está PROVADO e o que está ASSUMIDO

### 2.1 PROVADO (leitura direta de arquivo versionado, citada acima)

**CR-1 — fail-open no schema, não no compose.**
`runtimeEnv.ts:34` dá a `NODE_ENV` o default `'development'`, e `:73` faz o
`superRefine` retornar cedo fora de `production`. Isto é **independente do
Docker**: qualquer forma de subir o processo sem `NODE_ENV=production` explícito
(shell, systemd, `npm start`, worktree de dev) desliga o mesmo bloco.

**CR-2 — segredo de assinatura com valor forte-o-bastante-para-passar
versionado no repositório.** `docker-compose.yml:54`. Sozinho, CR-2 não seria
explorável se CR-1 não existisse: com `NODE_ENV=production`, `:103` casa o
prefixo em `:12` e **derruba o boot**. Sozinho, CR-1 não produziria *este*
finding se `:54` não entregasse um valor conhecido. **São duas condições
necessárias; nenhuma é suficiente.**

**CR-3 — a linha `:43` não é um default omisso: é um *rebaixamento ativo*.**
Achado desta triagem, **não registrado em `AUD-AUTHN-01` nem em `T18-F02`**:
`server/Dockerfile:21` declara `ENV NODE_ENV=production` no estágio de runtime
(idem `server/Dockerfile.local-runtime:4`). A imagem, por si, nasce em modo
produção — e nesse modo o boot **falharia** com o segredo de `:54`. É a linha
`docker-compose.yml:43` que sobrescreve o `ENV` da imagem e devolve o processo
a `development`. Consequência material para o desenho da correção: **remover a
linha `:43` não é neutro** — faria o container herdar `production` e, aí,
esbarrar em `DB_SSL` (`:135`) e `CORS_ORIGIN=localhost` (`:111`), derrubando o
boot de todo desenvolvedor. Ver §5, opção C3.

**CR-4 — a guarda de placeholder é uma denylist de dois prefixos.**
`ENV_PLACEHOLDER_PATTERN` (`:12`) é ancorado em `^` e cobre apenas `CHANGE_ME` e
`dev-only-change-me`. Prova de que ela não é uma rede de segurança geral:
`.env.docker.example:16` traz `JWT_SECRET=troque-por-uma-chave-forte`, que **não**
casa com o padrão (só é barrado hoje por ter menos de 32 caracteres). Isto não é
finding novo (Regra 6 — não emito finding); é **restrição de desenho da
correção**: a correção não pode ter como único mecanismo "adicionar o literal à
denylist".

### 2.2 Veredito sobre a hipótese recebida (`T-39` §3: causa-raiz = `T18-F02`)

**A hipótese se sustenta, mas é incompleta — e a diferença muda o lote.**

| Afirmação de `T18-F02` | Veredito desta triagem |
|---|---|
| `NODE_ENV` default `development` transforma o bloco de guardas em código morto | **CONFIRMADO** por leitura de `:34` + `:72-75` |
| `docker-compose.yml:43` faz o deploy que "esquecer de exportar `NODE_ENV`" subir com tudo desligado | **CONFIRMADO no efeito, incompleto na descrição**: não é esquecimento passivo, é override do `ENV=production` da imagem (CR-3) |
| Causa-raiz **única** | **DIVERGE.** São duas condições necessárias e independentes (CR-1 e CR-2). Corrigir só `NODE_ENV` deixa o literal no repositório e mantém o achado reproduzível por qualquer ambiente que declare `development` — inclusive o que o próprio repositório instrui (`.env.docker.example:1`, `server/.env.example:9`). Corrigir só `JWT_SECRET` fecha *este* finding e deixa **oito outras guardas** mortas (`:94,111,119,127,135,143,151,159`), entre elas a de `AUD-AUTHN-02` |
| Controle compensatório: `docker-compose.prod.yml:73,100,101,105` | **CONFIRMADO por leitura**: `:73` `NODE_ENV: production` literal; `:100`,`:101`,`:105`,`:92` usam `${VAR:?…}`. E confirmo a ressalva: `:1-8` declara o arquivo **não exercitado**, e nada no repositório impede subir com `docker-compose.yml` |

**Resposta direta à pergunta "corrigir só a causa-raiz elimina o defeito?"**
Não. Restariam dois caminhos de reprodução: (a) o operador que segue
`.env.docker.example:1` / `server/.env.example:9` e declara `NODE_ENV=development`
— versionadamente instruído a fazê-lo — continua recebendo o segredo público de
`:54`; (b) qualquer clone novo sem `.env` idem. O inverso também vale: corrigir
só `:54` fecha o vetor de forja e deixa a superfície sistêmica intacta.

### 2.3 ASSUMIDO (não provado por mim) — ver §8 para a lista completa

O item que mais sustenta peso: a semântica de precedência do Docker (o
`environment:` do serviço vence o `ENV` da imagem) é **conhecimento de
plataforma, não evidência deste repositório**; não pude rodar
`docker compose config` (execução fora de escopo; e a bateria dinâmica registra
Docker indisponível nesta máquina). CR-3 depende dela.

---

## 3. BLAST RADIUS

### 3.1 Superfície de autenticação — ponto único, e é isso que amplia o dano

`jwt.verify` aparece **uma única vez** em código de produção: `auth.ts:69`
(varredura por `jwt.(sign|verify|decode)` em todo o repo, com leitura dos
arquivos encontrados; as demais ocorrências são `server/tests/**` e
`server/scripts/run-api-suite.cjs:572-574`). Não há segundo ponto de decisão de
autenticação, nem router legado paralelo (`T-02` §1 confirma
`server/src/routes/` = só `health.ts`). Consequência: **toda** rota montada
atrás de `authenticate` está no raio — os 681 endpoints citados pelo finding.
Não há endpoint "protegido por outro mecanismo" que sobreviva.

### 3.2 Segundo ponto que **lê** o token sem verificar — fora deste caso

`server/app.ts:74-90`: `apiRequestKey()` faz `jwt.decode(...)` (`:79`, sem
verificação) e devolve `user:${decoded.id}` como chave dos limiters `:99-104`
(refresh) e `:105-116` (API, 300/15min). Isso é **`AUD-AUTHN-03`** (HIGH,
estrato 2), **não** é escopo do CASE-005, e **não é controle compensatório**: o
limiter roda antes de `authenticate`. Registro para que a correção do CASE-005
não seja lida como fechando `-03`.

### 3.3 Raio da causa-raiz CR-1 — muito maior que o JWT

O mesmo `if (env.NODE_ENV !== 'production') return;` (`:73`) desliga, no mesmo
ato: `PRODUCTION_TRACKING_REQUIRED=warn` (`:94` — Bloco K / Livro modelo 3,
obrigação fiscal), `CORS_ORIGIN` real (`:111`), `DB_PASSWORD` não-placeholder
(`:119`), `ADMIN_SEED_PASSWORD` (`:127` — é o gate de `AUD-AUTHN-02`),
`DB_SSL` (`:135`), `DB_FORCE_SYNC` (`:143`), `DB_AUTO_ALTER` (`:151`),
`DB_ALLOW_UNSAFE_ALTER` (`:159`).

E há consumidores de `NODE_ENV` fora do `runtimeEnv`, todos verificados por
leitura: `seeds.ts:130` (fallback de senha do admin de bootstrap — a linha
`:138` usa o literal de conveniência) e `seeds.ts:193` (fora de produção o erro
de seed é **engolido**, o boot continua); `errorHandler.ts:66,77` (fora de
produção devolve mensagem crua de `ValidationError`/`UniqueConstraintError` ao
cliente); `database.ts:19,30-31` (pool menor); `logger.ts:33` (formato de log);
`app.ts:113` (teto do `apiLimiter`); `validators.ts:173`.

**Leitura honesta:** a correção do CASE-005 deve fechar o vetor de forja de
token; ela **não** fecha esse raio inteiro, e não deve ser apresentada como se
fechasse. Os itens acima pertencem a `T18-F02` (estrato 2) e a `AUD-AUTHN-02`.

### 3.4 O mesmo padrão em outros arquivos versionados

| Arquivo:linha | Estado | Efeito |
|---|---|---|
| `docker-compose.prod.yml:73,92,100,101,105` | **correto** (`production` literal + `${VAR:?}`) | controle compensatório real, mas `:1-8` declara o arquivo nunca exercitado |
| `.env.docker.example:1` | `NODE_ENV=development` | instrução versionada que **produz** o estado do defeito |
| `.env.docker.example:16` | `JWT_SECRET=troque-por-uma-chave-forte` | não casa com a denylist de `:12` (CR-4); hoje só barrado por comprimento |
| `.env.example:33` / `server/.env.example:27` | `CHANGE_ME_…` | **casa** com a denylist — forma correta, e é o precedente a seguir |
| `.env.example` (raiz) / `server/.env.example:9` | `NODE_ENV=development` | idem `.env.docker.example:1` |
| `.github/workflows/server-ci.yml:103,112` e `:172,181` | `NODE_ENV: test` + segredo fixo de CI | aceitável em CI, **mas** significa que o pipeline nunca exercita o caminho `production` do `superRefine` — relevante para §6 |
| `server/Dockerfile:21`, `Dockerfile.local-runtime:4` | `ENV NODE_ENV=production` | o único lugar onde o default é seguro — e é sobrescrito pelo compose |
| `docs/infra/DEPLOY.md:65,110` (blocos `docker run`) | `-e NODE_ENV=production` explícito | runbook correto neste ponto |

### 3.5 Caminho de UI que produza o estado

**Não existe caminho de UI que crie ou altere este estado.** O cliente não
assina token: `client/src/api/httpClient.ts:7,12,17` apenas armazena/envia o
token emitido pela API (âncora de `T-18`, não relida por mim — ver §8/A6). O
estado é 100% de configuração de deploy. O que existe de UI no raio é
**consequência**, não causa: qualquer tela que dependa de `req.user` confia em
`auth.ts:114-128`.

### 3.6 Ambiente e alcance físico

`docker-compose.yml:67` publica a API em `0.0.0.0:5000` (comentado como
proposital em dev, para mobile/TV da rede local) sobre o banco
`erp_evok_audio` (`:7,48`) — o banco de **produção real**. Somando: qualquer
host da rede da fábrica, com acesso de leitura ao repositório, forja
administrador. O adendo de `T-02` §10 registra que o `.env` **de uma máquina**
define `JWT_SECRET` diferente do placeholder; o estado da segunda máquina, de
réplicas, restores e ambientes futuros **não foi verificado** — e continua sem
verificar nesta triagem (§8/A1).

---

## 4. AGRUPAMENTO DE FINDINGS COM A MESMA CAUSA-RAIZ

| ID | Relação | Recomendação de lote (decisão de escopo é do director) |
|---|---|---|
| `AUD-AUTHN-01` | o caso | CASE-005 |
| `T18-F02` (HIGH, recorte de produção real, estrato 2) | **causa-raiz declarada** — CR-1/CR-3 | **mesmo lote.** Sem ele a correção é sintomática (T-39 §3) |
| `AUD-AUTHN-02` (HIGH) | `docker-compose.yml:57`, **linha adjacente**, mesmo defeito de forma, mesmo gate morto (`:127`) | **recomendo mesmo lote**: o edit é idêntico, o risco marginal é ~zero, e deixar `:57` como `${VAR:-…}` ao lado de um `:54` corrigido convida a regressão por simetria. **Não decido escopo** — é do director |
| `T18-F03` (HIGH, segredos fora do schema) | mesma família, **superfície diferente** (9 variáveis lidas cruas de `process.env`) | **lote separado.** Entra pelo estrato 2 |
| `T22-F02` (MEDIUM) | gate de CI que impede recorrência | ver §5.3 — recomendo **mesmo lote**, com justificativa técnica |
| `AUD-AUTHN-03` (HIGH) | toca `app.ts` e JWT, **causa-raiz distinta** (`jwt.decode` como chave de limiter) | **não** misturar |

---

## 5. PLANO DE CORREÇÃO

### 5.1 Opções avaliadas

**Opção A — só o valor (`:54` → `${JWT_SECRET:?…}`).** Fecha o vetor de forja.
Deixa CR-1 intacta: as outras oito guardas seguem mortas, e o próximo default
fraco introduzido em qualquer variável repete o achado. *Insuficiente, e é
exatamente o que `T-39` §3 adverte.*

**Opção B — só a causa-raiz (`NODE_ENV` obrigatório).** Restaura as guardas,
**mas** só protege quem declarar `production`; o repositório continua publicando
uma chave de assinatura utilizável, e o próprio repositório instrui
`NODE_ENV=development` em três arquivos de exemplo. *Insuficiente.*

**Opção C — combinada. RECOMENDADA.**

| # | Alteração | Arquivo:linha | Fundamento |
|---|---|---|---|
| **C1** | `JWT_SECRET: ${JWT_SECRET:?defina JWT_SECRET no .env antes de subir a API}` | `docker-compose.yml:54` | Forma **já usada no mesmo arquivo** para `DB_PASSWORD` (`:13`,`:50`) e em `docker-compose.prod.yml:100`. Zero invenção. Remove o literal do repositório — o que também torna CR-4 irrelevante para esta variável |
| **C2** | idem para `ADMIN_SEED_PASSWORD` | `docker-compose.yml:57` | `AUD-AUTHN-02` — **sujeito à decisão de escopo do director** (§4) |
| **C3** | `NODE_ENV: ${NODE_ENV:?defina NODE_ENV no .env (development \| test \| production)}` | `docker-compose.yml:43` | Elimina o **rebaixamento silencioso** do `ENV=production` da imagem (CR-3), sem o efeito colateral de *deletar* a linha (que jogaria todo dev em `production` e derrubaria o boot em `DB_SSL`/`CORS`). Torna a escolha de ambiente explícita e auditável |
| **C4** | tornar a rejeição de placeholder de `JWT_SECRET` **independente de `NODE_ENV`** | `runtimeEnv.ts` (`:103` e/ou `:250`) | Ataca CR-1 no ponto que importa para este finding sem reescrever o regime de ambiente inteiro. Verifiquei o impacto: CI usa `ci-test-secret-with-at-least-32-characters` (`server-ci.yml:112,181`) e os unitários usam `'a'.repeat(32)` / `'1234…'` — **nenhum casa com `:12`**; e `runtime-env.test.ts:42-54` continua passando (ele afirma o *throw*, e o throw continuará existindo) |
| **C5** | `.env.docker.example:16` → valor com prefixo `CHANGE_ME_…` | `.env.docker.example` | Alinha ao precedente correto de `.env.example:33` e faz a denylist de `:12` valer também para este arquivo (CR-4) |
| **C6** | atualizar o runbook/onboarding para "criar `.env` antes de `docker compose up`" | `docs/infra/…`, `README.md:49` | Sem isso, C1/C3 param o `up` de todo clone novo e a reação previsível é reverter a correção. **Ownership de `docs/` neste worktree: questão para o director** |

**O que a Opção C deliberadamente NÃO faz:** não move as demais oito guardas
para fora do ramo de produção (isso é `T18-F02` cheio, estrato 2, e tem risco de
regressão muito maior — `DB_SSL`/`CORS` derrubariam dev); não toca
`app.ts:74-90` (`AUD-AUTHN-03`); não altera a política de rotação de chave
(§8/A7, decisão humana).

### 5.2 Ordem de execução sugerida ao engineer

1. C4 (código + teste que reprova, §6/T1) — é o que sobrevive a qualquer edição
   futura de compose.
2. C1/C3 (+C2 se autorizado) — remove o material exposto.
3. C5/C6 — impede que a correção seja desfeita por atrito operacional.
4. T22-F02 (§5.3), se autorizado no lote.

### 5.3 `T22-F02` entra no mesmo lote? — recomendação técnica, com o porquê

**Recomendo que sim**, e o fundamento não é conveniência:

- **É o único mecanismo que reprova o estado no nível do compose.** Um teste
  unitário Node não enxerga `${VAR:-default}`; um *guard test* de conteúdo de
  arquivo (§6/T2) enxerga a *forma*, mas não prova que o compose ainda **parseia**
  depois de trocar `:-` por `:?`. `docker compose config` prova as duas coisas.
- **A troca `:-` → `:?` muda o comportamento de falha.** Introduzir isso sem um
  gate que exercite o compose é entregar uma mudança cujo efeito principal
  (falhar cedo) nunca é testado.
- `T-22` já recomendou exatamente isso (`T-22_PLATAFORMA.md:84`).

**Contrapesos honestos:** (a) `T22-F02` é MEDIUM e tem ID próprio — incluí-lo
mistura estratos, e a autoridade para isso é do director, não minha;
(b) `DYN-T18-10` não rodou porque o Docker estava indisponível **nesta máquina**
(`DYN_VERIFICACAO_BATERIA_01.md` §3), então o gate tem de ser **do CI**, nunca
uma pré-condição local; (c) o job novo deve ser **próprio e bloqueante**, jamais
pendurado no job `governance-detective-controls` — este carrega a condição
vinculante **CD-CI-01** (`APR-2026-026`, item 3), que proíbe remover
`continue-on-error` (o comentário está no próprio `server-ci.yml`). Nenhum
agente encosta nessa cláusula.

---

## 6. O TESTE DE REGRESSÃO QUE **REPROVA** O ESTADO ANTERIOR

Critério aceito: um teste que passa antes e depois não protege nada. Cada teste
abaixo vem com a asserção de **por que falha no `AUDIT_COMMIT`**.

### T1 — unitário, sem banco, sem rede (o teste principal)

```
Arquivo sugerido: server/tests/unit/runtime-env-jwt-placeholder.test.ts
Cenário: delete process.env.NODE_ENV   (SEM declarar ambiente)
         process.env.JWT_SECRET = <literal de docker-compose.yml:54>
Asserção: loadRuntimeEnv() / getJwtRuntimeConfig() DEVE lançar, citando JWT_SECRET
```

- **Estado anterior (AUDIT_COMMIT):** `NODE_ENV` cai em `'development'`
  (`:34`), `superRefine` retorna em `:73`, `:250` aprova (45 > 32) → **não
  lança** → o teste **FALHA**. É a prova de que o teste tem poder discriminante.
- **Estado corrigido (C4):** lança → passa.
- **Por que a suíte atual não protege:** `server/tests/unit/runtime-env.test.ts`
  tem 5 testes de guarda e **todos** setam `process.env.NODE_ENV = 'production'`
  antes (linhas 14, 29, 43, 57, 71). O ramo default de `:73` nunca é exercitado
  por teste nenhum no repositório. Lido, não inferido.

Variação obrigatória do mesmo arquivo: repetir com `NODE_ENV='development'` e
com `NODE_ENV='test'` **explícitos** — senão a correção pode ser implementada
como "só quando `NODE_ENV` está ausente" e o caminho de `.env.docker.example:1`
segue aberto.

### T2 — guard test estático sobre o artefato versionado

```
Asserção: docker-compose.yml não contém JWT_SECRET nem ADMIN_SEED_PASSWORD
          na forma `${VAR:-<valor>}` (default fraco); a forma exigida é `${VAR:?…}`
```

- **Estado anterior:** `:54` e `:57` casam o padrão proibido → **FALHA**.
- **Estado corrigido:** passa.
- Roda sem Docker, sem banco, sem rede — sobrevive à indisponibilidade de Docker
  que travou `DYN-T18-10`. Existe precedente de *guard test* de conteúdo de
  arquivo neste repositório (`server/tests/unit/docs-path-reference-guard.test.ts`,
  citado em execução real na bateria dinâmica §2.3); a **forma exata** desse
  precedente é premissa minha, não leitura (§8/A4).

### T3 — gate de CI (só se `T22-F02` entrar no lote)

`docker compose -f docker-compose.yml config` com ambiente **vazio** deve
**falhar** (as variáveis `:?` são obrigatórias); com as variáveis definidas,
deve passar. No `AUDIT_COMMIT`, com ambiente vazio, o comando **sucede** (os
`:-` preenchem tudo) → o gate reprova o estado anterior por construção.

### T4 — o que NÃO fazer

Não escrever teste que assine um token com o literal e espere `401` da API: (a)
exige API + banco de pé, o que é vedado nesta fase e caro na seguinte; (b)
recarrega o literal para dentro de `server/tests/`, movendo o problema de lugar.
A prova dinâmica correta é `DYN-T02-01`, e ela é **da VeriCore**, no reteste,
contra `erp_evok_audio_test` — nunca contra `erp_evok_audio`.

---

## 7. INTERAÇÃO COM `CASE-004` — análise de colisão

`CASE-004` (`AUD-ALOG-01/A` e `/B`) está em `sana/ERP-LEGACY-001/CASE-004`, com
tip `2c10a80` ("estagio 2 REMEDIATION_COMPLETE"). Diff contra o merge-base
(`694bca98`), arquivos de **produto** tocados:

```
server/src/modules/employees/presentation/controllers/employeeController.ts
server/src/modules/items/presentation/controllers/itemController.ts
server/tests/unit/employees-soft-delete-audit-trail.test.ts
server/tests/unit/items-soft-delete-audit-trail.test.ts
server/tests/unit/audit-coverage-guard.test.ts
server/package.json · server/scripts/*.cjs
```

**Colisão com o escopo do CASE-005: nenhuma.** `docker-compose.yml`,
`server/src/config/runtimeEnv.ts`, `server/src/middlewares/auth.ts`,
`server/app.ts`, `server/Dockerfile`, `.env*.example` **não** são tocados por
`CASE-004`.

**Único arquivo compartilhado possível:** `.github/workflows/server-ci.yml` — e
**só se** `T22-F02` entrar no lote do CASE-005. Verificado:

```
$ git diff --stat HEAD sana/ERP-LEGACY-001/CASE-004 -- .github/workflows/server-ci.yml
(vazio)
```

A cópia do `CASE-004` é **idêntica** à de `main`. Portanto um job novo,
apendado pelo CASE-005, integra sem conflito **desde que** o `CASE-004` não
volte a editar esse arquivo.

**Para o director decidir a ordem:** não há dependência técnica entre os casos;
podem correr em paralelo. Duas notas: (1) `CASE-004` já está em
`REMEDIATION_COMPLETE` aguardando reteste — se o reteste dele exigir subir a API,
uma alteração de compose do CASE-005 mesclada antes pode mudar a pré-condição de
ambiente do reteste (o `up` passa a exigir `.env`); (2) se `T22-F02` entrar no
CASE-005, pedir ao `CASE-004` que não reabra `server-ci.yml`.

---

## 8. PREMISSAS ASSUMIDAS — insumo direto do contraditório (Codex, §35)

Nada abaixo foi provado por mim. Está separado exatamente para que a segunda
opinião ataque aqui primeiro.

| # | Premissa | Por que não provei | Peso se for falsa |
|---|---|---|---|
| **A1** | O `.env` da instância que hospeda `erp_evok_audio` continua definindo um `JWT_SECRET` que **não** é o placeholder | `.env` não é versionado; leitura de valor é vedada (`APR-2026-016`/E6). O adendo `T-02` §10 verificou **uma** máquina, em 2026-08-16, por comparação booleana | **Alto para a resposta a incidente, nulo para o finding.** Se for falsa, há exposição ativa e a rotação de chave vira urgente. O defeito do artefato versionado existe de qualquer forma |
| **A2** | `docker-compose.yml` é o arquivo efetivamente usado para subir a instância com dado real | Herdado de `T-38`/`T-39`/`APR-2026-031` D-13; não verifiquei por execução nem por inspeção de host | Médio. Se a instância sobe por `docker run` (`DEPLOY.md:65,110`, que já passa `NODE_ENV=production`), o vetor prático some e sobra o defeito do artefato + o risco de provisionamento |
| **A3** | **Precedência Docker:** `services.api.environment` sobrescreve o `ENV NODE_ENV=production` da imagem (`Dockerfile:21`) | Semântica de plataforma, não evidência do repositório; `docker compose config` não foi executado (fora de escopo; Docker indisponível conforme `DYN_VERIFICACAO_BATERIA_01.md` §3) | **Alto para CR-3 e para a opção C3.** Se for falsa, o container do compose já roda em `production` e o boot **falharia** hoje com o segredo de `:54` — o que mudaria a leitura de exploração prática (não o defeito do artefato). **Este é o ponto nº 1 para a segunda engine checar** |
| **A4** | Existe no repositório precedente de *guard test* que assere conteúdo de arquivo versionado, reutilizável para T2 | Vi `docs-path-reference-guard.test.ts` citado em execução real e `audit-coverage-guard.test.ts` por nome; **não** li os arquivos | Baixo — muda a forma de implementar T2, não sua validade |
| **A5** | O número de 681 endpoints atrás de `authenticate` | Herdado de `AUD-AUTHN-01`; provei o **ponto único** de `jwt.verify`, não a contagem | Baixo — a conclusão ("toda a superfície autenticada") não depende do número exato |
| **A6** | `client/mobile/tv` não assinam token; só armazenam o emitido | Li a âncora via `T-18` (`httpClient.ts:7,12,17`), **não** abri `client/`, `mobile/` nem `tv/`. `T-18` declara a mesma lacuna em `RES-T18-05` | Médio para o raio de UI. Se algum app minerar token localmente, o raio cresce |
| **A7** | Se a chave precisa ser **rotacionada** (invalidando todas as sessões) | Depende de A1 e é **decisão humana** (Regra 18), não técnica | Alto operacionalmente. Registro como **pergunta ao dono**, não como item de patch |
| **A8** | `passwordVersion` de partida é `1` e é enumerável em faixa pequena | Li `auth.ts:99` (`decoded.passwordVersion ?? 1`); não inspecionei distribuição real de valores (exigiria banco — vedado) | Baixo — no máximo muda o custo do ataque de trivial para trivial-com-loop |

---

## 9. DIVERGÊNCIAS REGISTRADAS (Regra 20) — não corrigidas no artefato alheio

Nenhum artefato de `audit/` foi editado (Regras 15/16). Registro aqui, com
arquivo e linha, para o director encaminhar a quem tem autoridade.

- **D-1 — comprimento do literal de `docker-compose.yml:54`.**
  `T-02_TIER1_IDENTIDADE_REPORT.md:83` diz **42 caracteres**;
  `T-18_APPSEC_SEGREDOS_DEPENDENCIAS.md:76` diz **44**. O valor real é **45**
  (medido localmente sobre a string, sem I/O). **Imaterial**: os três números
  são > 32 e a conclusão ("passa em `:250`") é idêntica. Registro porque três
  contagens diferentes do mesmo literal em um run é sinal de citação sem
  releitura — a classe `RC-PROC-01`.
- **D-2 — `server/Dockerfile:21` (`ENV NODE_ENV=production`) não aparece em
  `AUD-AUTHN-01` nem em `T18-F02`.** Muda a descrição da causa (override ativo,
  não omissão) e o conjunto de opções de correção (§5, C3). **Material para o
  desenho do patch**, imaterial para a severidade.
- **D-3 — causa-raiz única × dupla.** `T-39` §3 e `T18-F02` apresentam
  `NODE_ENV` como *a* causa-raiz. Demonstrei em §2.2 que são duas condições
  necessárias e nenhuma suficiente. Efeito prático: o lote não pode ser "só
  `T18-F02`" nem "só `:54`".
- **D-4 — `ENV_PLACEHOLDER_PATTERN` (`runtimeEnv.ts:12`) é denylist de dois
  prefixos**, e `.env.docker.example:16` é a prova de um valor fraco que escapa
  dela. Não emito finding (Regra 6); registro como **restrição de desenho** da
  correção e como possível insumo à VeriCore.

---

## 10. CAMPOS FORMAIS DO REMEDIATION DESIGN

**ROOT_CAUSE** — Duas condições necessárias, ambas provadas por leitura:
(CR-1) `runtimeEnv.ts:34` + `:72-75` — `NODE_ENV` default `'development'` e
`superRefine` com retorno antecipado fora de `production`, o que torna código
morto as nove guardas de `:94`–`:165`, inclusive a rejeição de placeholder de
`JWT_SECRET` em `:103`; (CR-2) `docker-compose.yml:54` — chave de assinatura com
default versionado, de 45 caracteres, que satisfaz a única guarda sempre ativa
(`:250`, `length < 32`). Agravante estrutural (CR-3): `docker-compose.yml:43`
sobrescreve o `ENV NODE_ENV=production` da própria imagem (`server/Dockerfile:21`).
Amplificador (não causa): HS256 com a mesma chave emitindo (`TokenService.ts:9`)
e verificando (`auth.ts:69`) — leitura do repositório equivale a capacidade de
forja.

**LOCAL_FIX** — C1 (`docker-compose.yml:54` → `${JWT_SECRET:?…}`) + C4
(rejeição de placeholder de `JWT_SECRET` independente de `NODE_ENV`).

**SYSTEMIC_FIX_REQUIRED** — **Sim.** C3 (`NODE_ENV` explícito no compose) + C5
(`.env.docker.example:16`) + C6 (runbook), com `T18-F02` completo (mover as
demais oito guardas para fora do ramo de produção) permanecendo como item
próprio do estrato 2, e `T22-F02` como gate anti-recorrência (§5.3). Sem o
sistêmico, o achado reabre pelo caminho versionadamente instruído
(`.env.docker.example:1`).

**BLAST_RADIUS** — Toda a superfície autenticada da API (ponto único de
`jwt.verify` em `auth.ts:69`; ~681 endpoints por `AUD-AUTHN-01`), incluindo
`authorize('admin')` e `authorizeModule`; mais, por CR-1, nove guardas de boot
(fiscal/Bloco K, CORS, senha de banco, senha do admin de bootstrap, TLS do
banco, três flags de DDL destrutivo) e o comportamento de `seeds.ts:130,193`,
`errorHandler.ts:66,77`, `database.ts:19`, `logger.ts:33`, `app.ts:113`.
Exposição de rede: `0.0.0.0:5000` (`docker-compose.yml:67`) sobre o banco
`erp_evok_audio`. Sem caminho de UI que produza o estado (§3.5).

**FILES_AFFECTED** (candidatos ao patch — o engineer confirma no worktree):
```
docker-compose.yml                          (:43, :54, e :57 se C2 autorizado)
server/src/config/runtimeEnv.ts             (:103 e/ou :250)
.env.docker.example                         (:16, e :1 se C3)
server/tests/unit/runtime-env-jwt-placeholder.test.ts   (NOVO — T1)
server/tests/unit/compose-no-weak-defaults.test.ts      (NOVO — T2)
.github/workflows/server-ci.yml             (SOMENTE se T22-F02 entrar no lote — job novo, bloqueante, separado do job com a cláusula CD-CI-01)
docs/infra/DEPLOY_UBUNTU.md · README.md:49  (C6 — ownership a confirmar com o director)
```
Fora do patch, por decisão explícita: `server/app.ts` (`AUD-AUTHN-03`),
`docker-compose.prod.yml` (já correto), `server/Dockerfile` (já correto).

**REGRESSION_RISK**

| # | Risco | Prob. | Impacto | Contenção |
|---|---|---|---|---|
| R1 | `${VAR:?}` faz `docker compose up` **falhar** em qualquer máquina/clone sem `.env` — inclusive a segunda máquina do dono | **Alta** (é o comportamento pretendido) | Operacional | C5+C6 no **mesmo commit**; mensagem de erro do `:?` deve dizer o que fazer, como já fazem `:13`/`:50` |
| R2 | C3 quebra o hábito de `docker compose up` sem `NODE_ENV` | Alta | Baixo | `.env.docker.example:1` já traz `NODE_ENV=development` |
| R3 | C4 derruba boot de alguma suíte cujo `JWT_SECRET` case a denylist | **Baixa — verificada** | Médio | Valores lidos: CI `server-ci.yml:112,181`, unitários `'a'.repeat(32)`/`'1234…'`, nenhum casa `:12`. **Risco residual real:** `server/scripts/run-api-suite.cjs:572-574` usa `process.env.JWT_SECRET` — se o `.env` de um dev tiver valor com prefixo de placeholder, a suíte passa a falhar no boot (falha correta, mas parecerá regressão) |
| R4 | Perda ou corrupção de dado | **Nula** | — | Nenhuma migration, nenhum schema, nenhuma escrita em banco. A remediação inteira é de configuração e validação de boot |
| R5 | Rotação de `JWT_SECRET` invalida todas as sessões vivas | Depende de A1/A7 | Alto (usuários) | **Não é decisão do engineer** — gate humano (Regra 18) |
| R6 | Falso senso de fechamento: ler a correção como se fechasse `T18-F02`, `AUD-AUTHN-02` e `AUD-AUTHN-03` | Média | Alto (governança) | §3.2, §3.3 e §4 declaram o limite; o `REMEDIATION_RESPONSE` deve repeti-lo |

---

## 11. CRITÉRIO DE CONCLUSÃO DESTA TRIAGEM

- Causa-raiz **demonstrada por leitura de arquivo versionado**, não hipótese —
  CR-1, CR-2, CR-3, CR-4 com arquivo e linha (§1, §2.1).
- Hipótese recebida (`T18-F02`) **verificada contra o código** e divergência
  registrada com âncora (§2.2, §9/D-3).
- Blast radius mapeado, incluindo o que a correção **não** fecha (§3).
- Plano de correção com opções, ordem e o teste que **reprova o estado
  anterior** com o motivo da reprovação (§5, §6).
- Premissas separadas das provas, para o contraditório da segunda engine (§8).
- Colisão com `CASE-004` verificada por `git diff`: nenhuma no produto; uma
  condicional em `server-ci.yml` (§7).

**Pendências que esta triagem devolve ao `coretriad-director`, não decide:**
1. Escopo: `AUD-AUTHN-02` (C2) entra no lote? `T22-F02` (T3) entra no lote?
2. Ownership de `docs/infra/` e `README.md` no worktree `sana/` para C6.
3. Pergunta ao dono (A1/A7): a chave deve ser rotacionada, e o estado do `.env`
   da segunda máquina/réplicas foi verificado?
4. Ordem CASE-004 × CASE-005 e a nota sobre pré-condição de ambiente do reteste
   de `CASE-004` (§7).

**Nenhum `FINDING CLOSED`, `RETEST_PASSED`, `AUDIT_PASSED` ou
`REMEDIATION_COMPLETE` é declarado neste documento (Regras 3 e 4).**
Única escrita desta triagem: este arquivo.
