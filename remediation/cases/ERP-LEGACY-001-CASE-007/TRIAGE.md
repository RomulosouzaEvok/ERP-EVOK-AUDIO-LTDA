# TRIAGE — ERP-LEGACY-001-CASE-007

| Campo | Valor |
|---|---|
| `CASE_ID` | `ERP-LEGACY-001-CASE-007` |
| `FINDING_ID` | `AUD-AUTHN-03` (run `ERP-LEGACY-001-AUD-001`) |
| Severidade | **HIGH** — fixada por decisão registrada, **não reavaliada aqui** (Regra 18) |
| `PROJECT_ID` | `ERP-LEGACY-001` (produção real) |
| `AUDIT_COMMIT` | `c1311a6f76b512fef893f7e60d934179cae3409f` (imutável — Regra 12) |
| Duplicata consolidada | `T18-F05` (MEDIUM, T-18) → mesma linha, dono `T-02` por `T-26` D-04 |
| Fase | **TRIAGEM APENAS** |
| Agente | `sanacore-remediation-triage` |
| Árvore usada | worktree principal, `3a0d0c2` (branch `audit/ERP-LEGACY-001-AUD-001/2026-08-16`) |
| Data | 2026-08-17 |

## Declaração de cumprimento (obrigatória)

- **Nenhuma conexão de banco foi aberta**, contra banco nenhum, em nenhum
  momento desta triagem. Nenhuma suíte de teste, nenhum script de diagnóstico,
  nenhuma query — nem para contar linhas. `APR-2026-016`, regra permanente de
  segurança de dado real.
- Toda a análise é **estática sobre arquivos versionados**. Os comandos usados
  foram exclusivamente `git` (log, diff, branch, worktree) e leitura de
  arquivo.
- **Nenhum valor de segredo ou credencial foi copiado** para este documento —
  só nomes de variáveis (`JWT_SECRET`, `TRUST_PROXY`, `DB_NAME`) e de roles.
- **Nenhuma âncora foi lida por saída de `grep`.** Cada trecho citado abaixo
  foi obtido lendo o arquivo inteiro (ou o bloco contíguo), exatamente pelo
  motivo registrado no despacho: o renderizador já deformou literais em três
  trilhas deste run.
- Nada foi implementado. Nenhum worktree criado, nenhuma branch criada, nenhum
  arquivo de código escrito. Este é o **único** arquivo produzido.
- Nenhum `FINDING CLOSED`, `RETEST_PASSED` ou `REMEDIATION_COMPLETE` é
  declarado aqui (Regras 3 e 4).

---

## 1. Reprodução estática do finding

Estado do defeito no `AUDIT_COMMIT` **e no HEAD atual** — `server/app.ts` está
intocado desde então (confirmado: nenhuma das branches abertas o modifica,
§8).

### 1.1 O ponto do defeito — `server/app.ts:74-90`

```ts
// server/app.ts:74-90 (lido do arquivo)
function apiRequestKey(req: Request): string {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.decode(authHeader.slice('Bearer '.length)) as { id?: number | string } | null;

      if (decoded?.id !== undefined) {
        return `user:${decoded.id}`;
      }
    } catch {
      // Token ilegivel — cai para chave por IP abaixo.
    }
  }

  return ipKeyGenerator(req.ip ?? '');
}
```

`jwt.decode` (`:79`) **não verifica assinatura, emissor, audiência nem
expiração**. Qualquer string que faça *parse* como JWT produz `decoded`. O
`id` daí sai direto para a chave do limiter (`:82`).

### 1.2 Quem consome essa chave

| Consumidor | Âncora | Teto | Montagem |
|---|---|---|---|
| `refreshLimiter` | `app.ts:99-104` (`keyGenerator: apiRequestKey`, `:102`) | 30 / 15 min | `app.use('/api/auth/refresh', refreshLimiter)` — `app.ts:144` |
| `apiLimiter` | `app.ts:105-116` (`keyGenerator: apiRequestKey`, `:114`) | `nodeEnv === 'test' ? 100000 : 300` / 15 min (`:113`) | `app.use('/api', apiLimiter)` — `app.ts:148` |

Nenhum outro consumidor. Verificado por leitura do arquivo inteiro (240
linhas).

### 1.3 O segundo eixo do mesmo finding — `loginAttemptKey`

```ts
// server/app.ts:48-52 (lido do arquivo)
function loginAttemptKey(req: Request): string {
  const ip = ipKeyGenerator(req.ip ?? '');
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  return email ? `${ip}:${email}` : ip;
}
```

O comentário imediatamente acima (`app.ts:44-47`) afirma:

> *"um atacante testando N contas do mesmo IP ainda soma por IP via
> `ipKeyGenerator`, so nao compartilha cota com contas legitimas de outros
> colegas atras do mesmo IP"*

**O código não faz isso.** A função retorna **uma única chave composta**
`${ip}:${email}`. Não existe segundo contador por IP. Trocar o `email` gera um
balde novo, com 10 tentativas frescas (`authLimiter`, `app.ts:54-59`).
Consumidores: `authLimiter` (`:57`) e `passwordRecoveryLimiter` (`:125`).

Confirmo a refutação do comentário feita por `T-02`, por leitura própria.

### 1.4 Ordem de execução (o que torna os vetores alcançáveis sem credencial)

`app.ts:143-148` monta os limiters **no nível da aplicação**, antes de
qualquer router:

```
:143  app.use('/api/auth/login',    authLimiter);
:144  app.use('/api/auth/refresh',  refreshLimiter);
:145  app.use('/api/auth/register', registerLimiter);
:146  app.use('/api/auth/forgot-password', passwordRecoveryLimiter);
:147  app.use('/api/auth/reset-password',  passwordRecoveryLimiter);
:148  app.use('/api', apiLimiter);
```

O `authenticate` mora **dentro** dos routers
(`server/src/modules/auth/presentation/routes/auth.ts:14` para `/refresh`) ou
não existe (`:13`, `/login` é público). Portanto **o limiter conta a
requisição antes de qualquer verificação de assinatura**, e conta mesmo quando
o resultado final é 401 — ver a prova de biblioteca em §9/P2.

### 1.5 O único ponto de verificação real

`server/src/middlewares/auth.ts:69` — `jwt.verify(token, secret, { issuer,
audience })`. É o **único** `jwt.verify` em código de produção. O `decoded`
do limiter **nunca** alimenta `req.user`: `auth.ts:114-128` monta o
`RequestUser` a partir de `User.findByPk` (`:77`), não do token. Ou seja, a
frase do comentário `app.ts:72` — *"nunca autoriza nada"* — **é verdadeira**.
Isso delimita o finding: é abuso de disponibilidade, não de autorização.

---

## 2. Causa-raiz

### 2.1 O que está PROVADO

**A escolha de `decode` em vez de `verify` foi deliberada e documentada — não
foi descuido.** Prova, por leitura do próprio arquivo (`app.ts:65-73`):

> *"Chave de rate-limit por USUARIO autenticado (nao por IP) quando o request
> traz um Bearer token decodificavel: o objetivo deste limiter e conter abuso
> por CONTA (credencial vazada, script rodando sem limite), nao por endereco
> de rede - varios colaboradores atras do mesmo IP/NAT nao devem compartilhar
> cota, senao trocar de aba rapido em varias estacoes do mesmo escritorio
> derruba o sistema para todo mundo. O token so e decodificado (nao
> verificado) aqui: chave errada na pior hipotese isola mal um request nao
> autenticado, nunca autoriza nada — a validacao de assinatura real continua
> em `authenticate`."*

O autor **conhecia** a diferença entre decodificar e verificar, **nomeou** a
diferença, **antecipou** a objeção e a respondeu. Introduzido junto com o
comentário no commit `2044dbf` (*"feat(departamentos): reorganizacao completa
por departamento (Blocos A-F) + correcao de seguranca da suite de testes"*),
verificado por `git log -L 74,90:server/app.ts` — a função nasce inteira ali,
nunca foi alterada depois.

**A causa-raiz é uma omissão de modelo de ameaça dentro de um desenho
deliberado.** Especificamente, a frase *"chave errada na pior hipotese isola
mal um request"* avalia apenas o caso **acidental** (uma chave sai errada por
azar) e o eixo **autorização** (que está correto). Nunca avalia o caso
**adversarial**: um atacante **escolhe** a chave. Num controle de segurança
cuja função é *particionar* tráfego, quem controla o particionador controla o
controle — e aqui o particionador é entrada não confiável.

**O padrão sistêmico é mais amplo que a linha 79.** A mesma classe aparece em
`loginAttemptKey` (`:50`), que particiona por `req.body.email` — também
escolhido pelo atacante. Formulação da causa sistêmica:

> **Decidir rate limiting antes da autenticação, usando dado que só a
> autenticação pode validar.** É um problema de ordenação de fase, não de uma
> API mal escolhida. Por isso os dois `keyGenerator` pertencem ao **mesmo**
> caso e não devem ser corrigidos em lotes separados.

### 2.2 O que é ASSUMIDO (e o dono pode refutar)

- Que **não existe** motivação operacional adicional além da registrada no
  comentário — por exemplo, um incidente real de NAT que tenha derrubado a
  fábrica e originado o desenho. O comentário descreve o cenário
  hipoteticamente (*"senao ... derruba o sistema para todo mundo"*), não
  relata um evento. Se houve incidente real, o custo da Opção D (§6) é maior
  do que estimo.

---

## 3. Vetores de ataque — o que eu confirmei e o que eu recusei confirmar

Todos verificados estaticamente. **Nenhum foi executado.** Cada linha diz o
que sustenta a conclusão.

### V1 — Diluição do próprio teto de `/api` (**CONFIRMADO estaticamente**)

Atacante **sem credencial nenhuma** envia `Authorization: Bearer <qualquer
JWT que faça parse, com `id` rotativo>`. `app.ts:79` decodifica sem verificar;
`:82` devolve `user:<id>`. Cada `id` novo é um **balde novo** no `apiLimiter`
(`:105-116`). O teto de 300/15 min — **o único teto agregado de toda a
superfície `/api`** — deixa de existir para quem faz isso.

Precisão sobre a descrição de `T18-F05`: ela fala em *"token com `alg:none`"*.
**Não é necessário.** `jwt.decode` não olha o header, não olha a assinatura,
não olha nada — um payload base64 com `{"id":N}` e uma assinatura de lixo
basta. O vetor é mais barato do que o registrado. Isso **não** altera
severidade (Regra 18); é precisão de reprodução para quem for implementar.

Alcançável em rota pública: `/api/auth/login` está sob `/api` (mount `:148`) e
não tem `authenticate` (`routes/auth.ts:13`).

### V2 — DoS dirigido a um usuário nomeado (**CONFIRMADO estaticamente**)

Atacante fixa a chave em `user:<id da vítima>`, dispara 300 requisições e a
vítima recebe **429 em toda a API por até 15 minutos**, sem que o atacante
tenha qualquer credencial.

Cadeia de prova, elo por elo:

| Elo | Âncora | Fato |
|---|---|---|
| A chave é o `id` do payload | `app.ts:79,82` | `user:${decoded.id}` |
| O `id` do payload é o `id` do usuário | `TokenService.ts:9` | `jwt.sign({ id: userId, passwordVersion }, ...)` |
| O `id` é inteiro sequencial, **enumerável** | `server/src/models/User.ts:50-55` | `id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }` |
| O contador incrementa mesmo quando a resposta é 401 | `express-rate-limit@8.6.1`, `dist/index.cjs:823-824` | defaults `skipFailedRequests: false`, `skipSuccessfulRequests: false` |
| Alcançável da rede local sem autenticação | `docker-compose.yml:67` | API publicada em `0.0.0.0:5000` |

O último elo é o que transforma isto de teoria em exposição: qualquer host da
rede da fábrica consegue tirar um usuário nomeado do ar, repetidamente, sem
login. Amplificação trivial: `id` de 1 a N em paralelo derruba **todos** os
usuários.

### V2b — O mesmo contra `/api/auth/refresh` (**CONFIRMADO — corrige uma delimitação da auditoria**)

`T-02` registrou: *"o `refreshLimiter` usa a mesma chave mas exige token
válido — o bypass não o atinge."*

Isso é **correto para V1** (o atacante não ganha cota extra de refresh — ele
não tem o que renovar) e **incorreto para V2**. O `refreshLimiter` está
montado no nível da aplicação (`app.ts:144`), **antes** do router; o
`authenticate` só entra em `routes/auth.ts:14`. Com `skipFailedRequests:
false` (provado acima), **30 requisições forjadas consomem a cota de refresh
da vítima** e a resposta 401 não devolve o crédito. Efeito: o painel de TV
"sempre ligado" da vítima perde a renovação deslizante por 15 minutos — que é
exatamente o cenário para o qual o `refreshLimiter` foi criado
(`app.ts:92-98`).

Isto **não** muda a severidade (Regra 18). É **ampliação de escopo do mesmo
finding**, e precisa constar do design porque muda o critério de reteste.

### V3 — Password spraying sem teto efetivo (**CONFIRMADO — é composição, não vetor isolado**)

Este é o vetor que só existe pela **combinação** dos dois eixos, e é a
justificativa de os dois estarem num caso só:

1. `loginAttemptKey` (`:48-52`) dá 10 tentativas por par `(ip, email)`.
   Rotacionar o e-mail dá um balde novo a cada conta visada. **Não existe
   contador por IP**, apesar do comentário `:44-47`.
2. O único teto agregado sobre `/api/auth/login` seria o `apiLimiter`
   (300/15 min, mount `:148`, que cobre `/api/auth/login`).
3. **V1 anula esse teto**: basta anexar um `Bearer` forjado com `id` rotativo
   a cada tentativa de login.

Resultado: com `Bearer` forjado + e-mail rotativo, as tentativas de login
ficam **efetivamente sem teto**.

**Contradição entre artefatos que devolvo (Regra 21).** `T18-F05` registra o
limiter de login como *"controle compensatório real"* que mantém o brute-force
contido (`T-18:124`). `T-02` refuta (`T-02:106-109`). **Fonte autoritativa:
`T-02`**, tanto pela consolidação já decidida (`T-26` D-04 atribui a
titularidade a T-02) quanto porque **eu confirmei por leitura do código**: não
há segundo contador por IP em `loginAttemptKey`. **O controle compensatório
descrito em `T18-F05` não existe.** Consequência prática para o engenheiro:
não conte com ele ao dimensionar a correção.

### Vetores que eu recusei confirmar (e por quê)

| Candidato | Veredito | Base |
|---|---|---|
| Escalonamento de autorização via `decode` | **REFUTADO** | O `decoded` do limiter nunca chega a `req.user`; `auth.ts:69` verifica e `:77` recarrega o usuário do banco. O comentário `app.ts:72` está certo neste ponto |
| Bypass do `authenticate` | **REFUTADO** | Ponto único de verificação intacto, `auth.ts:69` |
| Leitura de token não verificado no client | **NÃO ENCONTRADO** | Busca por `atob(`, `jwt-decode`, `jwtDecode`, `split('.')[1]` em `client/src` — nenhuma ocorrência |
| Fragmentação de contador por múltiplas instâncias | **NÃO APLICÁVEL hoje** | Um único serviço `api` (`docker-compose.yml:32-68`), sem `replicas`. Ver §4 (nota sobre `MemoryStore`) |
| Vazamento de dado por 429 | **NÃO AFIRMO** | Não investiguei diferença observável de resposta que permita enumerar usuários por 429. Fica declarado como não coberto |

---

## 4. Blast radius

### 4.1 Superfície do defeito (estreita)

| Medida | Resultado | Como verifiquei |
|---|---|---|
| `jwt.decode` em código de produção | **exatamente 1** — `server/app.ts:79` | busca no repositório; demais ocorrências são `.md` de auditoria/triagem |
| `jwt.verify` em código de produção | **exatamente 1** — `server/src/middlewares/auth.ts:69` | idem |
| Leitura de `headers.authorization` em produção | **exatamente 2** — `app.ts:75`, `auth.ts:61` | busca em `server/src` + `server/app.ts` |
| Arquivos de produção a alterar | **1** — `server/app.ts` | consequência das medidas acima |

Ou seja: **a superfície de "identidade derivada de token não verificado" é um
único sítio.** Isso é uma boa notícia para o risco de regressão do *código*.

### 4.2 Superfície de impacto (larga)

O que muda de comportamento se a chave mudar:

- **Todo o `/api/*`** — mount `:148`, cobrindo a tabela de rotas inteira
  (`app.ts:150-218`, ~60 mounts de módulo).
- **`/api/auth/refresh`** (`:144`) — cota 30/15 min, painéis de TV.
- **`/api/auth/login`** (`:143`), **`/api/auth/forgot-password`** e
  **`/api/auth/reset-password`** (`:146-147`) — se `loginAttemptKey` mudar.
- `registerLimiter` (`:60-64`) **não** usa nenhuma das duas funções (sem
  `keyGenerator` → default por IP). Fora do blast radius.

### 4.3 Cobertura de teste existente: **zero**

Busca por `rateLimit`, `rate-limit`, `429`, `apiRequestKey`, `loginAttemptKey`
em `server/tests`, `server/src` e `client/src`: **nenhum teste exercita
qualquer limiter**. Consequências das duas direções:

- Nenhum teste protege o comportamento atual → nada quebra "por acidente".
- Nenhum teste pegaria uma regressão → o que o engenheiro escrever é a
  **primeira** e única rede.

### 4.4 Observabilidade: o ataque é invisível hoje

`server/src/middlewares/requestContext.ts:27-38` loga `requestId`, `method`,
`path`, `statusCode`, `durationMs`. **Não loga a chave do limiter, nem a
origem da chave, nem a quem o 429 foi atribuído.** Uma campanha V2 contra um
usuário aparece no log como "esse usuário tomou muitos 429" —
indistinguível de um usuário barulhento. Não há como detectar nem
diagnosticar hoje. Isto é insumo para D4 (§6.3).

### 4.5 Notas de infraestrutura relevantes à correção

- **`MemoryStore` (default, nenhum `store:` configurado)** → contadores por
  processo, zerados a cada restart. Não altera a análise hoje (instância
  única), mas uma segunda instância fragmentaria qualquer teto.
- **`TRUST_PROXY` default `0`** (`runtimeEnv.ts:59`; `docker-compose.yml:56`).
  O próprio compose instrui, em produção, a pôr um proxy reverso TLS na frente
  (`docker-compose.yml:61-67`). **Se isso for feito sem definir `TRUST_PROXY`,
  `req.ip` vira o IP do proxy e toda a chave por IP colapsa num único
  balde** — a fábrica inteira compartilharia 300/15 min. Hoje isso afeta só o
  ramo de fallback; sob qualquer correção que passe a chavear por IP, isso
  vira o caminho principal. **É pré-requisito operacional da correção, não
  detalhe.**
- **`NODE_ENV` em produção**: `docker-compose.yml:43` usa
  `${NODE_ENV:-development}`. Logo o teto vigente é 300 (não o bypass de
  100000, que exige `test` explícito).

---

## 5. Interação com `AUD-AUTHN-01` / `CASE-005` (`F3` pendente)

Pergunta do despacho: enquanto a chave não rodar (`F3`, `APR-2026-049` D3),
quem leu o repositório forja token válido — **isso agrava este finding?**

### Resposta: **não agrava. E o motivo importa.**

`apiRequestKey` **não faz verificação nenhuma** (`app.ts:79`). O atacante de
V1/V2/V2b **não precisa** de token válido, não precisa da chave, não precisa
saber que existe uma chave. Um payload de lixo basta. Um atacante com
conhecimento **zero** do segredo executa os três vetores integralmente.

Portanto a forjabilidade de `AUTHN-01` **não adiciona capacidade** a
`AUTHN-03`. Os dois findings apontam para direções distintas:

| Finding | O que o atacante precisa | O que ele consegue |
|---|---|---|
| `AUD-AUTHN-01` | token que **AUTENTICA** (exige a chave) | autorização administrativa |
| `AUD-AUTHN-03` | qualquer coisa que **FAÇA PARSE** (não exige nada) | negação de serviço dirigida / anulação de teto |

### A dependência real corre no sentido inverso — e é decisiva para escolher a opção de correção

Se a correção **voltar a chavear por usuário** — seja verificando dentro do
`keyGenerator` (Opção B), seja chaveando por `req.user.id` depois do
`authenticate` (Opção A) — então a confiabilidade da chave do limiter passa a
**herdar** a confiabilidade da chave de assinatura. Com `F3` em aberto, quem
tem o segredo forja um token **válido** e volta a escolher a chave: V1 e V2
retornam, reduzidos ao conjunto de quem leu o repositório.

**Formulação precisa, para o registro:**

> Qualquer chaveamento por usuário — pós-`authenticate` inclusive — é
> **condicional a `F3`**. Somente chaveamento por IP é **incondicional**.

Isto **não** é motivo para escolher IP: é um fato que o dono precisa ter na
mão ao decidir §6. E é um argumento a favor de haver, em qualquer desenho, um
teto por IP que **não dependa de token nenhum**.

### Confirmações de estado

- `VERDICT_CASE-005.md:301-302` registra que `CASE-005` **não fecha**
  `AUD-AUTHN-03` (*"`app.ts:74-90`, `jwt.decode` como chave de limiter, diff
  vazio"*). **Confirmo por leitura direta**: o conteúdo de `server/app.ts` no
  HEAD casa exatamente com as âncoras de `T-02` e `T-18`.
- `CASE-005` está `RETEST_PASSED` no escopo e **`FINDING NOT CLOSED`**, com
  `F1`, `F2`, `F3`, `F4` abertas (`VERDICT_CASE-005.md:345-347`). `F3` é gate
  humano (Regra 18) — não é meu para mover, nem para o engenheiro.
- `VERDICT_CASE-005.md:313-339` devolveu ao dono uma divergência material
  sobre o `JWT_SECRET` da máquina medida (a família de placeholder). Isso
  **aumenta** a urgência de `F3` e, por consequência, reforça o parágrafo
  acima: uma correção condicional a `F3` protege menos do que aparenta hoje.

---

## 6. Estratégia de correção — opções, trade-offs, e o que NÃO é meu para decidir

**O nó do problema, em uma frase:** não é possível, ao mesmo tempo, (a)
chavear por identidade de usuário e (b) fazê-lo antes da autenticação. O
desenho atual tenta as duas coisas. A correção passa por **separar as duas
fases** ou por **abrir mão de uma delas**.

Por isso "trocar `decode` por `verify`" **não é automaticamente a resposta** —
é a Opção B, uma entre quatro, e nem sequer a mais forte.

### 6.1 Opções para `apiRequestKey`

#### Opção A — Duas fases: teto por IP antes da autenticação + cota por usuário depois

Um limiter pré-auth chaveado **estritamente por IP** (imune a entrada não
confiável) e um segundo limiter, montado **depois** do `authenticate`,
chaveado por `req.user.id` (identidade já verificada em `auth.ts:69`).

- **Fecha:** V1 e V2 completamente na fase pré-auth. Preserva integralmente a
  intenção do autor (cota por conta, sem colateral de NAT para quem está
  autenticado).
- **Custo/risco:** é a maior mudança estrutural — exige inserir um estágio
  depois do `authenticate`, que hoje vive dentro de cada router
  (`routes/*.ts`), não no `app.ts`. Diff potencialmente grande ou um ponto de
  montagem novo. **Maior risco de regressão** das quatro.
- **Condicional a `F3`** na fase autenticada (§5).
- **Ilustrativo apenas**, para comunicar o desenho — não é código a colar:
  `pre-auth: key = ip` → `authenticate` → `post-auth: key = req.user.id`.

#### Opção B — Verificar dentro do `keyGenerator`

Trocar `jwt.decode` por `jwt.verify` (mesmo `secret`/`issuer`/`audience` de
`auth.ts:69-72`) em `apiRequestKey`, caindo para IP quando a verificação
falhar.

- **Fecha:** V1 e V2 (o atacante sem o segredo não consegue mais escolher
  chave). Diff pequeno, confinado a `app.ts`.
- **Custo/risco:**
  - Verificação **duplicada** por requisição (uma no limiter, outra no
    `authenticate`). HMAC é barato, mas é acoplamento novo.
  - `getJwtRuntimeConfig()` **lança** quando `JWT_SECRET` está ausente ou
    curto (`runtimeEnv.ts:250-251`). Num `keyGenerator` isso viraria erro em
    **toda** requisição. Precisa de tratamento explícito — é a armadilha
    principal desta opção.
  - Todo o tráfego **não autenticado** passa a colapsar na chave por IP,
    dentro do orçamento de 300 — trazendo de volta o colateral de NAT que o
    autor quis evitar, justamente na fase mais exposta.
- **Condicional a `F3`** (§5).

#### Opção C — Chave composta `user:<id>@<ip>`

- **Reduz** V2 (o atacante não alcança o balde da vítima a partir de outro
  IP).
- **NÃO fecha V1**: o atacante continua rotacionando `id` do mesmo IP e
  criando baldes novos. **Rejeitada como correção isolada.** Só faz sentido
  como refinamento sobre um teto por IP que já exista.

#### Opção D — Abandonar o chaveamento por usuário (chave por IP apenas)

- **Fecha:** V1 e V2, **incondicionalmente** — não depende de `F3`, não
  depende de segredo nenhum. Menor diff das quatro; menor risco de
  implementação.
- **Custo:** exatamente o cenário contra o qual o autor desenhou — a fábrica
  atrás de um NAT compartilha 300/15 min. **Se esse número estiver errado, a
  correção derruba a operação.** E `TRUST_PROXY=0` (§4.5) pode agravá-lo.
- **Abre mão** da proteção contra credencial vazada rodando script sem limite,
  que era o objetivo declarado.

### 6.2 Correção do `loginAttemptKey` (ortogonal, aplicável a qualquer opção)

Fazer o código cumprir o que o comentário `app.ts:44-47` **já promete**: dois
contadores — um por `(ip, email)`, mantendo o isolamento por conta visada, e
**um por IP**, que é o controle anti-spraying que hoje não existe.

- Fecha o eixo V3 **independentemente** da opção escolhida para
  `apiRequestKey`.
- Risco de regressão baixo e bem delimitado (afeta `/api/auth/login`,
  `/forgot-password`, `/reset-password`), **desde que** o orçamento por IP seja
  dimensionado por decisão do dono, não por chute — mesma questão de D1
  abaixo.
- **Não pode ser adiada para outro caso**: é metade do finding `AUD-AUTHN-03`
  conforme redigido em `T-02:102-113`.

### 6.3 O que devolvo para decisão humana — não decido (Regra 6)

Cada item abaixo é regra de negócio ou fato operacional que **não está no
repositório** e que eu não tenho autoridade para inventar.

| ID | Decisão pendente | Por que não é minha |
|---|---|---|
| **D1** | **Qual o pico legítimo de requisições da fábrica atrás de um IP/NAT em 15 minutos?** | Nenhum artefato versionado tem esse número. Ele determina o orçamento do teto por IP. Errar para baixo derruba a operação; errar para alto torna o teto decorativo. É o parâmetro mais perigoso de toda a correção |
| **D2** | **A cota por usuário autenticado é requisito, ou um teto por IP basta nesta fase?** | Define Opção A (estrutural, mais segura, mais cara) vs. Opção D (simples, imediata, com colateral de NAT). É trade-off de negócio: disponibilidade da fábrica vs. contenção de credencial vazada |
| **D3** | **`TRUST_PROXY` entra no escopo desta correção?** | O compose instrui pôr proxy reverso em produção (`docker-compose.yml:61-67`) e o default é `0`. Sob qualquer opção com chave por IP, isso vira pré-requisito. Mas mexer em configuração de deploy é decisão de infraestrutura, com o dono |
| **D4** | **O 429 deve passar a ser observável (log com atribuição da chave)?** | Hoje é invisível (§4.4). Sem isso, ninguém detecta V2 em produção nem valida a correção em campo. É escopo adicional — o dono decide se entra agora |
| **D5** | **Aceita-se que a proteção fique condicional a `F3`?** (relevante só para A/B) | §5. `F3` é gate humano em aberto. Só o dono calibra esse risco residual |

**Minha recomendação técnica, explicitamente não vinculante:** a combinação
que fecha mais vetores com menor dependência de `F3` é **§6.2 (contador por
IP no login) + um teto por IP incondicional na fase pré-auth**, com a cota por
usuário (Opção A) entrando **se e quando** D1/D2 estiverem respondidos.
Recomendo **não** despachar a implementação com D1 em aberto: sem esse número,
qualquer teto por IP é arbitrário.

---

## 7. Critério de reteste objetivo

### 7.1 Duas restrições do repositório que quase inviabilizam o reteste ingênuo

O engenheiro precisa saber disto **antes** de escrever a primeira linha:

1. **`apiRequestKey` e `loginAttemptKey` não são exportadas** (`app.ts:48`,
   `app.ts:74` — funções de módulo, e `app.ts:238-239` exporta só o `app`).
   Nenhum teste consegue chamá-las hoje.
2. **Sob `NODE_ENV=test`, o `apiLimiter` tem orçamento de 100000**
   (`app.ts:113`), e `tests/setup.ts:5` fixa `NODE_ENV=test`. **Um teste
   end-to-end via supertest não consegue estourar o limiter** em número
   praticável de requisições.

Conclusão: **testabilidade é requisito da correção, não enfeite.** A função de
chave precisa virar unidade endereçável — extraída para módulo próprio (ex.:
um `rateLimitKeys` em `server/src/middlewares/`) e exportada, ou exportada de
`app.ts`. Sem isso, não existe reteste que reprove o estado anterior.

### 7.2 Testes que precisam ficar VERMELHOS no `AUDIT_COMMIT`

Este é o critério que mais falhou nos casos anteriores. Cada teste abaixo tem
que ser **executável contra o código antigo e falhar lá**. Se passar nos dois
estados, não protege nada e não conta.

| ID | Asserção | Por que REPROVA o código antigo |
|---|---|---|
| **R1** | Token **forjado** (assinado com segredo errado, ou não assinado) carregando `id: 42` **não** produz chave atribuível ao usuário 42 | `app.ts:79-82` devolve `user:42` hoje → vermelho |
| **R2** | N tokens forjados com `id` **distintos**, mesma origem, produzem **uma única** chave (ou no máximo 1 balde) | hoje produz N chaves distintas → vermelho. **É o teste que mede V1**, o vetor de diluição |
| **R3** | *(só se D2 mantiver cota por usuário)* Token **válido** (segredo/`issuer`/`audience` corretos) produz chave por usuário | guarda contra a **super-correção** "tudo por IP" quando o dono quis cota por usuário. Verde antes e depois — é guarda de intenção, **não** conta como prova de correção |
| **R4** | `loginAttemptKey`: 20 e-mails distintos do mesmo IP **não** geram 20 orçamentos independentes — existe contador agregado por IP | hoje gera 20 chaves e nenhum contador por IP (`app.ts:48-52`) → vermelho. Mede V3 |
| **R5** | Guarda de regressão: **nenhuma ocorrência de `jwt.decode` em código de produção de `server/`** | hoje há exatamente uma (`app.ts:79`) → vermelho. Segue o padrão de guarda já usado no projeto (`tests/unit/*guard*.test.ts`, inclusive os criados na branch `CASE-005`) |
| **R6** | *(se V2b entrar no escopo)* A cota de `/api/auth/refresh` de um usuário **não** é consumível por terceiro não autenticado | hoje é (`app.ts:144` + `skipFailedRequests:false`) → vermelho |

**Anti-critério, explícito.** Um teste que apenas afirma *"depois de muitas
requisições vem 429"* através do app completo **não é aceitável**: (a) passa
antes e depois; (b) sob `NODE_ENV=test` o orçamento é 100000; (c) o defeito
não é *se existe* contador, é **de quem** é o contador. Reteste que não
distingue titularidade da chave não testou este finding.

### 7.3 Restrições de segurança para quem implementar (Codex)

- **Nada de suíte de integração/API neste caso.** `test:integration`,
  `test:edge`, `test:api:strict` e `scripts/run-api-suite.cjs` sobem API e
  banco. Proibido por `APR-2026-016`. Os testes R1-R6 são **unitários puros**,
  sem banco, sem servidor.
- **Armadilha grave, verificada:** `tests/setup.ts:5` define **somente**
  `NODE_ENV`. `DB_NAME` não é definido e cai no default do schema —
  `runtimeEnv.ts:38`: `DB_NAME: z.string().min(1).default('erp_evok_audio')`
  — que é o **nome do banco de PRODUÇÃO**. Importar `server/app.ts` num teste
  arrasta `middlewares/auth` → `models/index` → `config/database`, que
  **constrói** um `Sequelize` (`database.ts:53`). A construção sozinha não
  abre conexão, mas qualquer caminho que emita uma query nesse teste apontaria
  para o nome do banco de produção. **Motivo adicional e forte para testar a
  função de chave isolada, sem importar `app.ts`.**
- A credencial `codex_dev` alcança apenas `erp_evok_audio_test`. Isso é
  contenção, não permissão: o caso **não requer banco nenhum**.

---

## 8. Colisão com trabalho concorrente

Verificado por `git diff --stat 694bca9..<branch> -- server/` em cada branch
aberta, e por `git worktree list`.

| Branch | Worktree | Toca `server/app.ts`? | Superfície |
|---|---|---|---|
| `sana/ERP-LEGACY-001/CASE-003` (`95aeff4`) | `ERP-Evok-sana-CASE-003` | **não** | `server/scripts/*`, `server/package.json` |
| `sana/ERP-LEGACY-001/CASE-004` (`2c10a80`) | `ERP-Evok-sana-CASE-004` | **não** | scripts, `employeeController.ts`, `itemController.ts`, testes de soft-delete |
| `sana/ERP-LEGACY-001/CASE-005` (`7b06404`) | `ERP-Evok-sana-CASE-005` | **não** | `.env.example`, `runtimeEnv.ts`, guardas de JWT |
| `sana/ERP-LEGACY-001/CASE-006` (`3a0d0c2`, em curso pelo Codex) | `ERP-Evok-sana-CASE-006` | **não** | scripts (`manualStockAdjustment` ainda não aparece no diff contra `694bca9`) |

**Nenhuma branch aberta toca `server/app.ts`. Colisão de arquivo: nenhuma.**
Não escrevi em nenhuma delas.

Dois avisos operacionais para quem implementar:

1. **Não toque em `server/package.json`.** `CASE-003`, `CASE-004` e `CASE-006`
   já o modificam, cada uma à sua maneira. Se `CASE-007` não precisar de
   dependência nova — e pelas opções de §6 **não precisa** —, mantê-lo
   intocado elimina um conflito de merge de três frentes.
2. **`server/src/config/runtimeEnv.ts` é território de `CASE-005`.** Se a
   opção escolhida exigir variável de ambiente nova (ex.: orçamento de teto
   por IP, ou `TRUST_PROXY` obrigatório em produção via D3), **haverá conflito
   com `CASE-005`** — que ainda está com `F1`/`F2`/`F3`/`F4` em aberto.
   Levantar isso **antes** de implementar, com o director.

Worktree de implementação `sana/ERP-LEGACY-001/CASE-007`: **não existe e não
foi criada por mim**, conforme o limite deste despacho.

---

## 9. Premissas — provado × assumido

Esta seção é o insumo do contraditório. O que está em "PROVADO" tem âncora
verificável; o que está em "ASSUMIDO" pode derrubar a conclusão que sustenta.

### 9.1 PROVADO (por leitura de arquivo versionado)

| ID | Afirmação | Âncora |
|---|---|---|
| **P1** | A chave do limiter vem de `jwt.decode`, sem verificação de assinatura/`iss`/`aud`/expiração | `server/app.ts:79,82` |
| **P2** | Uma requisição que termina em 401 **consome** a cota | `express-rate-limit@8.6.1`, `dist/index.cjs:823-824` (`skipFailedRequests: false`, `skipSuccessfulRequests: false`) |
| **P3** | Os `id` de usuário são inteiros sequenciais, portanto enumeráveis | `server/src/models/User.ts:50-55` (`INTEGER`, `primaryKey`, `autoIncrement`) |
| **P4** | O `id` da chave é o `id` real do usuário | `TokenService.ts:9` (`jwt.sign({ id: userId, passwordVersion }, ...)`) |
| **P5** | Os limiters correm **antes** de qualquer `authenticate` | `app.ts:143-148` (mount de app) vs. `routes/auth.ts:14` (router) |
| **P6** | `loginAttemptKey` produz **uma** chave composta, sem contador por IP — o comentário `app.ts:44-47` não descreve o código | `app.ts:48-52` |
| **P7** | Existe **exatamente um** `jwt.decode` e **exatamente um** `jwt.verify` em produção | `app.ts:79` / `auth.ts:69` |
| **P8** | O `decoded` do limiter nunca alimenta autorização | `auth.ts:69,77,114-128` |
| **P9** | O desenho com `decode` foi **deliberado e documentado** | `app.ts:65-73` + `git log -L 74,90:server/app.ts` → commit `2044dbf`, função nasce completa |
| **P10** | Nenhum teste do repositório exercita qualquer limiter | busca sem resultado em `server/tests` |
| **P11** | Sob `NODE_ENV=test` o orçamento do `apiLimiter` é 100000 | `app.ts:113` + `tests/setup.ts:5` |
| **P12** | `DB_NAME` default é o nome do banco de produção | `runtimeEnv.ts:38` |
| **P13** | A API é publicada em `0.0.0.0:5000` | `docker-compose.yml:67` |
| **P14** | `server/app.ts` está intocado desde `694bca9` em todas as branches abertas | `git diff --stat` por branch (§8) |
| **P15** | Nenhum ponto do client decodifica token | busca sem resultado em `client/src` |

### 9.2 ASSUMIDO (não provado — impacto declarado)

| ID | Premissa | Se estiver errada | Impacto |
|---|---|---|---|
| **A1** | Não há motivação operacional além da registrada em `app.ts:65-73` (nenhum incidente real de NAT) | Opção D custa mais do que estimo | **Médio** — muda o peso do trade-off de §6, não a causa-raiz |
| **A2** | `jwt.decode` devolve o objeto para qualquer payload base64 válido, sem exigir assinatura plausível | V1/V2 exigiriam token mais bem formado | **Baixo** — mesmo o caso mais estrito só exige um JWT sintaticamente válido; o `catch` de `app.ts:84` mostra que o autor já previu a falha de parse |
| **A3** | A instância real de produção corresponde ao `docker-compose.yml` versionado (uma instância, `MemoryStore`, `TRUST_PROXY=0`, bind `0.0.0.0`) | Alcançabilidade e fragmentação de contador mudam | **Médio para V2** — se já houver proxy reverso sem `TRUST_PROXY`, a chave por IP já está colapsada hoje. **Pergunta ao dono (D3)** |
| **A4** | `express-rate-limit` 8.6.1 é a versão efetivamente instalada em produção | os defaults de P2 poderiam diferir | **Baixo** — `package.json:38` fixa `^8.6.1` e o `dist` lido é 8.6.1 |
| **A5** | O `id` de um usuário-alvo é obtenível por um atacante da rede local (enumeração trivial de inteiro pequeno) | V2 exigiria etapa a mais | **Baixo** — P3 torna a enumeração barata mesmo sem nenhum vazamento |
| **A6** | Nenhuma outra rota fora de `app.ts` monta limiter próprio | haveria mais consumidores no blast radius | **Baixo** — busca por `rateLimit` em `server/src` não retornou nada além de `runtimeEnv.ts` (comentário) |

### 9.3 Não coberto por esta triagem (declarado, não silenciado)

- Não medi **custo real** de `jwt.verify` por requisição (Opção B). Não rodei
  nada.
- Não investiguei se o 429 permite **enumeração de usuários** por diferença
  observável.
- Não avaliei o `registerLimiter` (`app.ts:60-64`) além de constatar que não
  usa nenhuma das duas funções.
- Não sei qual o volume legítimo de tráfego da fábrica — é **D1**, e é a maior
  lacuna desta triagem.

---

## 10. Resumo para decisão

**Causa-raiz (provada):** desenho deliberado e documentado
(`app.ts:65-73`) que usa entrada **escolhida pelo atacante** como chave de
particionamento de um controle de segurança. Não é confusão entre `decode` e
`verify` — o autor nomeou a diferença. É omissão de modelo de ameaça: avaliou
o caso acidental e o eixo de autorização, nunca o caso adversarial.
**Causa sistêmica:** rate limiting decidido antes da autenticação, com dado
que só a autenticação valida. Atinge os **dois** `keyGenerator`, e é por isso
que os dois eixos são um caso só.

**Vetores confirmados estaticamente:** V1 (anulação do teto agregado de
`/api`), V2 (DoS dirigido a usuário nomeado, sem credencial, a partir da rede
local), V2b (o mesmo contra a cota de `refresh` — **amplia** a delimitação de
`T-02`), V3 (spraying sem teto efetivo, por composição — e o controle
compensatório alegado em `T18-F05` **não existe**).

**Blast radius:** 1 arquivo de produção (`server/app.ts`), 2 consumidores de
`apiRequestKey`, 2 de `loginAttemptKey`, superfície de impacto = todo
`/api/*`. Zero cobertura de teste hoje. Zero observabilidade de 429 hoje.

**Interação com `AUTHN-01`/`F3`:** **não agrava** — o ataque não precisa de
token válido. Mas **qualquer correção que volte a chavear por usuário fica
condicional a `F3`**; só chave por IP é incondicional.

**Risco de regressão:** o risco real **não é de código** (diff pequeno, sítio
único) — é **operacional**: qualquer opção que chaveie por IP faz a fábrica
atrás de um NAT compartilhar orçamento, e `TRUST_PROXY=0` pode colapsar tudo
num balde só. **Esse é o risco a gerenciar.**

**Colisões:** nenhuma em `server/app.ts`. Cuidado com `server/package.json`
(3 branches) e com `runtimeEnv.ts` (`CASE-005`, ainda aberta).

**Bloqueio para despacho:** **D1** (pico legítimo de tráfego por IP/NAT) e
**D2** (cota por usuário é requisito?) são regra de negócio e não estão no
repositório. Recomendo **não despachar a implementação com D1 em aberto** —
sem esse número, qualquer teto é arbitrário e a correção pode derrubar a
operação da fábrica.

**Estado deste caso:** triagem concluída. Nenhum `FINDING CLOSED`, nenhum
`RETEST_PASSED`, nenhum `REMEDIATION_COMPLETE` (Regras 3 e 4). Aguarda decisão
humana sobre D1-D5 e sobre o despacho ao `sanacore-remediation-engineer`.
