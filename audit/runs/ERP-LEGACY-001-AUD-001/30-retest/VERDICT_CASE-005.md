# VEREDITO DE RETESTE — `ERP-LEGACY-001-CASE-005` / `AUD-AUTHN-01`

```
EMITIDO POR        vericore-software-audit-director (VeriCore)
DATA               2026-08-17
FINDING            AUD-AUTHN-01 — CRITICAL / HIGH_CONFIDENCE — produção real, estrato 1, posição 2
CASO               ERP-LEGACY-001-CASE-005
AUDIT_COMMIT       c1311a6f76b512fef893f7e60d934179cae3409f   (imutável, Regras 12-14)
REMEDIATION_HEAD   7b06404b0b4614ea40b9eb5cb0ad5cb4d76d58e2
BRANCH             sana/ERP-LEGACY-001/CASE-005
COMMITS            abef59b · 2a10049 · 7b06404
BASE NORMATIVA     APR-2026-047 D4 · APR-2026-049 · APR-2026-050 · APR-2026-051
```

```
VEREDITO 1 (reteste técnico) ......... RETEST_PASSED
                                        escopo declarado, sobre 7b06404, sem regressão
VEREDITO 2 (fechamento do finding) ... FINDING NOT CLOSED
                                        4 condições objetivas de fechamento abertas (§6)
```

**Nenhum `REMEDIATION COMPLETE` é declarado aqui — não é autoridade da VeriCore.**
**Nenhuma severidade é reavaliada aqui (Regra 6/18): `AUD-AUTHN-01` permanece CRITICAL.**

---

## 0. Base probatória e limite deste veredito

Este director **não reexecutou** medição alguma. O veredito repousa sobre:

1. **Medição da VeriCore**, coletada pelo `vericore-audit-verification-runner` e
   persistida em `audit/runs/ERP-LEGACY-001-AUD-001/30-retest/RETEST_CASE-005_FINAL.md`
   (lida integralmente, inclusive §10) e em
   `remediation/cases/ERP-LEGACY-001-CASE-005/RETEST_EVIDENCE.md` (coleta sobre `2a10049`).
2. **Leitura literal própria**, arquivo aberto, de tudo que é alcançável na
   worktree principal (branch de auditoria, irmã da branch `sana`):

| Arquivo lido por mim | O que confirmei literalmente |
|---|---|
| `.github/workflows/server-ci.yml` | **198 linhas**; `:34` cabeçalho `PARE — CONDICAO VINCULANTE CD-CI-01`; `:57` `governance-detective-controls:`; `:60` `continue-on-error: true`; `:112` e `:181` `JWT_SECRET: ci-test-secret-with-at-least-32-characters` (42 caracteres, sem prefixo de placeholder) |
| `docker-compose.yml:43,50,54,57,67` | estado do defeito intacto nesta árvore: `${NODE_ENV:-development}`, `${JWT_SECRET:-dev-only-…}`, `${ADMIN_SEED_PASSWORD:-dev-only-…}`, ao lado do `${DB_PASSWORD:?…}` correto em `:50` |
| `README.md:44-64` | `:49` = *"String longa e aleatória"*; `:50` documenta bloqueio de boot para `ADMIN_SEED_PASSWORD`; `:60-61` apresenta `DB_PASSWORD` como a variável do compose que **"não tem default"** |
| `server/scripts/scan-tracked-secrets.cjs:6-13,16,24` | 4 regexes (`BEGIN … PRIVATE KEY`, `AKIA…`, `ghp_…`, `xox[baprs]-…`); `allowedFragments` = `['.env.example','.env.docker.example','node_modules','dist','tmp','.git']`; teste `relativePath.includes(fragment)`; fonte `git ls-files` |
| `coretriad/governance/APPROVALS.md:2991-3231` | `APR-2026-049` D1-D5, `APR-2026-050` D1-D5, `APR-2026-051` D1-D4 |
| `audit/.../T-02_TIER1_IDENTIDADE_REPORT.md:74-92, 292-326` | enunciado do finding e o adendo §10 sobre `L-T02-01` |
| `remediation/…/CODEX_SECOND_OPINION.md:77-121` | a **§4-ERRATA**: a §4 do parecer Codex está ERRADA e não pode ser citada sem a errata |
| `remediation/…/TRIAGE.md` (integral) | `CR-1`..`CR-4`, `C5`/`C6`, `R1`/`R3`, critério de reteste §6, pendências §11 |

3. **Nada foi citado por síntese de terceiro.** As duas armadilhas apontadas no
   despacho foram tratadas: a §4 do Codex está formalmente superada por errata no
   próprio arquivo, e a trava `CD-CI-01` **existe e é literal**, mas no
   `server-ci.yml` **desta árvore** (`:34`,`:57`,`:60`) — o que confirma a
   correção de premissa registrada em `APR-2026-051` D4 e o achado §3 do reteste.

**Limite declarado:** não pude ler a cópia de `server-ci.yml`, do
`docker-compose.yml` nem dos testes **na branch `sana`**; o estado do
`REMEDIATION_HEAD` é conhecido por mim exclusivamente pela medição do runner. O
veredito é emitido sobre essa evidência, que é evidência da própria VeriCore,
coletada por agente que **não implementou** o patch `7b06404`.

**Independência:** `2a10049` foi produzido fora da faixa (incidente `RC-PROC-02`,
`APR-2026-050` D1); `7b06404` foi produzido pelo `sanacore-remediation-engineer`.
Em nenhum dos dois a medição foi feita por quem implementou — e o registro mais
relevante do incidente é que **foi a medição independente que expôs o artefato
fraco** (`env-examples-jwt-guard` com poder discriminante quase nulo em `2a10049`).

---

## 1. Ponto 1 — a remediação faz o que anuncia. **ACEITO**

Critério de reteste da triagem (§6): *"um teste que passa antes e depois não
protege nada"*. O critério é atendido, e com folga.

| Medida | Valor |
|---|---|
| Casos que reprovam o `AUDIT_COMMIT` | **25 de 43** (15 env-examples + 2 ci-workflow + 3 compose + 5 placeholder) |
| Casos que reprovam o HEAD | **0 de 43** |
| Asserção central (`env-examples-jwt-guard`) | discrimina **9** casos onde a versão de `2a10049` discriminava **1** |
| Corte por regime, nos três `.env*.example` | `undefined FAIL · development FAIL · test FAIL · production PASS` contra o `AUDIT_COMMIT` |
| Regressão | `1 failed / 1987 passed / 1988 total` — falha única já isolada (`docs/API.md` pré-existente + `client/node_modules/jsdom` artefato de ambiente). `tsc --noEmit` exit 0 |
| Vazamento sob falha | **nenhuma** das 25 falhas imprimiu conteúdo de arquivo |
| Escopo | `7b06404` toca 3 arquivos; diff vazio sobre `runtimeEnv.ts`, `docker-compose.yml`, os três `.env*.example` e os dois guards antigos |

A propriedade material do finding — *"o artefato versionado entrega uma chave de
assinatura utilizável e o boot a aceita"* — foi medida por **execução**, nos
quatro regimes de `NODE_ENV`, contra os dois códigos
(`RETEST_EVIDENCE.md` §1): antes, 3 dos 4 regimes subiam o boot com a chave
publicada; depois, os quatro reprovam.

**Cobertura de causa-raiz, como medida e como aceito:**

| CR | Estado | Juízo |
|---|---|---|
| CR-1 (fail-open por `NODE_ENV`) | **PARCIAL por desenho declarado** — só a guarda de `JWT_SECRET` saiu do ramo de produção; as outras oito seguem depois do early-return | **Aceito.** O restante é `T18-F02`, estrato 2, fora do lote por decisão registrada |
| CR-2 (literal versionado) | **FECHADA** no HEAD (permanece no histórico — remoção de histórico não era escopo) | Aceito |
| CR-3 (`:43` rebaixa o `ENV=production` da imagem) | **FECHADA na forma escolhida** (`${NODE_ENV:?…}`, sem deletar a linha) | Aceito. Premissa **A3** segue sem prova de execução — imaterial para o veredito, porque a correção não depende dela para valer |
| CR-4 (denylist de dois prefixos) | **NÃO FECHADA no repositório** | Ver §3 — **condição de fechamento**, não falha do patch |

**Nada disto é reduzido pelos pontos 2 a 5.** O patch é tecnicamente correto,
discriminante, sem regressão e dentro do escopo.

---

## 2. Ponto 2 — `C6` ausente. **NÃO BLOQUEIA `RETEST_PASSED`. Pendência aceita e declarada.**

Esta era a decisão central do despacho (`APR-2026-051` D3). Decido, com fundamento
explícito, e registro que o `sanacore-remediation-engineer` **discorda da
exclusão** — a discordância dele está correta no mérito documental e é acolhida
como pendência, não como reprovação do patch.

**Por que não bloqueia:**

1. **A função que `C6` tinha na triagem era conter o risco `R1`** — *"`${VAR:?}`
   quebra o `up` de todo clone novo e a reação previsível é reverter a
   correção"* (`TRIAGE` §5.1/C6 e §10/R1). Essa contenção **foi medida existindo
   por outro caminho**: `docker compose … config --quiet` retorna `EXIT=0` nos
   dois commits (o compose parseia), a instrução correta está em
   `.env.example:35-38` — o arquivo que o desenvolvedor **já está copiando** — e a
   mensagem do `:?` nomeia o comando de correção
   (*"gere com `openssl rand -hex 32`"*). Reverter o patch por atrito exigiria o
   operador ignorar o comentário que acabou de copiar **e** a mensagem de erro que
   diz o que fazer.
2. **A troca material é de *"sobe inseguro"* para *"não sobe"*.** No
   `AUDIT_COMMIT`, o caminho instruído pelo `README` subia, em `development`, com
   a chave publicada. Hoje falha cedo, com mensagem acionável. **A direção da
   mudança é a pretendida pelo finding.**
3. **A omissão pode ser autorizada por ausência de decisão minha.** A ownership de
   `docs/` na worktree `sana/` é **pendência aberta do director**
   (`TRIAGE` §11 item 2), reafirmada em `APR-2026-051` D3. Cobrar do engenheiro
   uma entrega cuja permissão de escrita nunca foi decidida seria imputar-lhe
   omissão da governança. **A responsabilidade é da coordenação, e é minha.**

**O que fica registrado como pendência real, e não é cosmético:** o patch **criou
drift documental**. Confirmado por leitura minha, não por síntese:

- `README.md:49` descreve `JWT_SECRET` como *"String longa e aleatória"* e **não
  menciona** que placeholder agora reprova o boot em **todos** os ambientes — e a
  linha `:50` prova que o `README` **tem convenção** para documentar bloqueio de
  boot (`ADMIN_SEED_PASSWORD`: *"o servidor não inicia sem ela"*). A variável cuja
  guarda é hoje a **mais forte** é justamente a que não usa a convenção.
- `README.md:60-61` apresenta `DB_PASSWORD` como a variável do compose que *"não
  tem default"*. Ficou **factualmente incompleta**: `NODE_ENV` e `JWT_SECRET`
  também passaram a `:?`.

**Classificação de forma (Regra 6, `APR-2026-050` D5):** isto **não** é finding de
`AUD-001` — não é defeito do objeto no `AUDIT_COMMIT`, é drift introduzido pela
remediação. Fica como **condição de fechamento F4** (§6), não como finding novo.
Transformá-lo em finding formal exigiria delta audit ou `AUD-002` — decisão do
dono, não tomada aqui.

---

## 3. Ponto 3 — `CR-4` não está fechado no repositório. **CONDIÇÃO DE FECHAMENTO. Confirmado por leitura própria.**

Reli o arquivo, não a citação. `.github/workflows/server-ci.yml` **desta árvore**
tem **198 linhas** e contém, literalmente:

```
:34   # !! PARE — CONDICAO VINCULANTE CD-CI-01 (APR-2026-026, item 3) !!
:57   governance-detective-controls:
:60     continue-on-error: true
:112  JWT_SECRET: ci-test-secret-with-at-least-32-characters
:181  -e JWT_SECRET=ci-test-secret-with-at-least-32-characters \
```

42 caracteres, sem prefixo de placeholder — valor que o `runtimeEnv` **aceita em
qualquer ambiente**, inclusive com a guarda nova. É a mesma classe descrita em
`CR-4` e o mesmo achado que `APR-2026-050` D3 despachou ao engenheiro *"com a
mesma correção aplicada aos `.env*.example`"*.

**Três consequências, e a terceira é operacional e imediata:**

1. **`CD-CI-01` é inaplicável à branch `sana`, não ao repositório.**
   `APR-2026-051` D4 corrigiu a premissa do despacho **para a branch** — e está
   certo. Mas o job existe, vivo, no irmão que compartilha a base `694bca9`.
   Confirmo: nada foi tocado nele, e nada deve ser.
2. **As duas branches editam o mesmo arquivo.** Resolução ingênua de merge perde a
   geração efêmera **ou** perde o `governance-detective-controls` com sua cláusula
   vinculante. Nenhum dos dois resultados é aceitável.
3. **Quando as branches coabitarem, o CI fica vermelho** — o guard novo, rodado
   contra o arquivo de 198 linhas, reprova 2 de 3. Isto foi **medido**, não
   suposto.

**Juízo:** não é falha da remediação — o engenheiro entregou a correção na cópia
que lhe cabia, e a divergência nasce de triagem e engenheiro terem lido
**arquivos diferentes sob o mesmo caminho** (`TRIAGE` R3 cita `:112,181`, que só
existem no arquivo de 198; a coleta anterior citou `:38,:107`, do arquivo de 139).
É **condição de integração**, e por isso vira **F1/F2** (§6), não `RETEST_FAILED`.

---

## 4. Ponto 4 — o guard de CI protege menos do que sua documentação afirma. **REGISTRADO. Restringe o que se pode alegar; não bloqueia.**

Sondagem adversarial de 10 probes, em sandbox fora do repositório:

| Probe | Cenário | Pega? | Efeito sobre o declarado |
|---|---|---|---|
| A | apagar o passo de geração | **SIM** | **limite declarado REFUTADO** — protege mais do que a SanaCore afirmou |
| **B** | **mover o passo para depois do smoke** | **NÃO** | **limite não declarado — o mais material** |
| C | workflow novo com literal ≥32 | SIM | cobertura além do `server-ci.yml` |
| **D** | workflow novo consumindo `$JWT_SECRET` sem passo de geração | **NÃO** | limite não declarado |
| E/F/G | block scalar · composite action · script versionado | NÃO | já declarados |
| **H** | literal com **espaço interno** | **NÃO** | limite não declarado — o regex para no primeiro espaço; o fragmento de 22 é descartado por comprimento e o literal de 40 passa |

**Leitura correta, e é a que o veredito fixa:** o guard **assere presença de três
strings no arquivo inteiro**, não a propriedade *"o passo de geração vem antes do
primeiro passo que sobe a aplicação"*. Movido o bloco para depois do smoke, a
suíte passa 3/3.

**Por que não bloqueia:** a propriedade que interessa a `AUD-AUTHN-01` — *nenhum
literal utilizável versionado* — **é** asserida, e é ela que reprova o
`AUDIT_COMMIT` (2/3). O que não é asserido é ordem e cobertura de workflows
futuros: isso é **força do controle anti-regressão**, não fechamento do defeito.

**O que fica proibido alegar, a partir daqui:** que o guard prova ordem de
execução, que cobre workflow novo que consome `$JWT_SECRET`, ou que é imune a
literal com espaço. Qualquer artefato do caso que afirme isso deve ser corrigido
pela SanaCore no seu próprio namespace — **não por mim** (Regra 2/15).

---

## 5. Ponto 5 — `scan:secrets` não é evidência para esta classe. **VERIFICADO. Nenhuma correção necessária em `audit/` ou `coretriad/`.**

Verifiquei o pedido literalmente, em duas frentes.

**(a) O scanner, lido no código** (`server/scripts/scan-tracked-secrets.cjs`):

- `:8-13` — **quatro** regexes: `BEGIN … PRIVATE KEY`, `AKIA…`, `ghp_…`,
  `xox[baprs]-…`. **Nenhum casa `JWT_SECRET: <literal>` em YAML ou `.env`.**
- `:7` + `:24` — `allowedFragments` inclui `'.env.example'`, `'.env.docker.example'`
  e `'.git'`, testados por `relativePath.includes(fragment)`. Consequências: os
  dois arquivos de exemplo são **isentos por completo**, e — achado que reforço
  aqui — **`'.git'` é substring de `.github/`, logo o `server-ci.yml` nunca é
  sequer lido pelo scanner**. Isto já constava de `T18-F07` (`T-18…:144-147`) e de
  `AUD-CICD-DEPGATE-01:198-199`, e **explica por que `CR-4` sobreviveu sem
  detecção**.
- `:16` — `git ls-files`: só o HEAD, sem histórico.

**Conclusão normativa: `scan:secrets` passar não é evidência de ausência desta
classe de defeito, nem antes nem depois do patch. É verde por construção.**

**(b) Onde ele é citado.** Varredura de todos os `.md` do repositório. Resultado:

| Artefato | Como aparece | Precisa correção? |
|---|---|---|
| `coretriad/governance/APPROVALS.md:3057-3065` (`APR-2026-049` D4) | declara explicitamente que o scanner **passa e não detecta** a chave; encaminha à VeriCore | **Não** — está correto |
| `audit/.../DYN_VERIFICACAO_BATERIA_01.md:104` (`DYN-T18-04`) | verde citado como **confirmação de `T18-F07`** (ponto cego) | **Não** |
| `audit/.../T-18_APPSEC…md:139-149` (`T18-F07`) e `AUD-CICD-DEPGATE-01:198-199,262` | documentam os pontos cegos | **Não** |

**Nenhum artefato sob `audit/` ou `coretriad/` apresenta `scan:secrets` como
controle detectivo de `AUD-AUTHN-01`.** A citação como *"verificação, sem
achados"* apontada pelo reteste está em artefato da **SanaCore**, na branch
`sana/` (`REMEDIATION_RESPONSE`), fora do meu alcance de leitura nesta árvore e
**fora da minha autoridade de escrita**. Fica como **exigência de correção
dirigida à SanaCore** (§10, item 2), não como edição minha.

**Resposta ao D4 de `APR-2026-049`** (*"ponto cego do scanner → VeriCore, trabalho
técnico de melhoria de ferramenta"*): a VeriCore qualifica o ponto cego como
**já coberto por `T18-F07` (MEDIUM), sem finding novo** — o run `AUD-001` está
encerrado sobre `AUDIT_COMMIT` imutável e `APR-2026-050` D5 já fixou que finding
novo exigiria delta audit. Recomendação técnica, sem autoridade de execução:
qualquer melhoria do scanner deve atacar `allowedFragments` por **prefixo de
caminho**, não por `includes` de substring — `'dist'` e `'.git'` como substring
são o defeito estrutural, não a lista de regexes.

---

## 6. `FINDING NOT CLOSED` — as quatro condições objetivas de fechamento

`FINDING CLOSED` exige que a propriedade valha **no repositório integrado**, não
apenas na branch de remediação. Enquanto isso não for demonstrado, o finding
permanece **aberto, em estado `RETEST_PASSED / AWAITING_INTEGRATION`**.

| # | Condição | Prova exigida | Responsável |
|---|---|---|---|
| **F1** | O estado de `7b06404` integrado à linha que serve `main`, com `server-ci.yml` resolvido preservando **simultaneamente** a geração efêmera **e** o job `governance-detective-controls` com `continue-on-error: true` intacto (`CD-CI-01`, `APR-2026-026` item 3) | leitura do arquivo integrado, com âncoras equivalentes a `:34`, `:57`, `:60`, mais o guard de CI 3/3 sobre **ele** | SanaCore integra · VeriCore verifica |
| **F2** | `CR-4` fechado no repositório: nenhuma ocorrência versionada de `JWT_SECRET` com literal ≥32 caracteres fora do padrão de placeholder — **incluindo `.github/`**, que o `scan:secrets` não cobre | medição sobre o commit integrado, `len=` e booleano, sem transportar valor | SanaCore · VeriCore mede |
| **F3** | **Rotação da chave JWT de produção** (`APR-2026-049` D3) executada **ou** risco residual aceito por decisão humana explícita e datada | registro em `APPROVALS.md` | **dono — gate humano, Regra 18. Não aprovo por inferência** |
| **F4** | Ownership de `docs/` decidida e, na sequência, `C6` entregue **ou** o drift de `README.md:49` e `:60-61` registrado como aceito com responsável nomeado | decisão registrada + diff ou registro de aceite | **director (eu) decide ownership · dono decide aceite** |

**F1, F2 e F4 não invalidam o `RETEST_PASSED`** — são condições de integração e de
governança, e nenhuma delas reabre o defeito medido no `REMEDIATION_HEAD`.
**F3 é a única que mantém exposição material viva**, e é gate humano sem prazo.

---

## 7. O que este veredito **NÃO** significa

1. **Não significa que o vetor de forja está fechado.** O patch impede a
   **reintrodução** e a **entrega** do valor. Ele **não invalida token já
   assinado**. Enquanto a rotação de `APR-2026-049` D3 não ocorrer, **quem já leu
   o repositório mantém capacidade de forja** sobre instância que ainda use a
   chave antiga. Isto está declarado no próprio D3 e é repetido aqui como
   consequência aceita pelo dono, não como omissão da remediação.
2. **Não fecha `T18-F02`.** Oito das nove guardas seguem depois do early-return —
   `PRODUCTION_TRACKING_REQUIRED`, `CORS_ORIGIN`, `DB_PASSWORD`,
   `ADMIN_SEED_PASSWORD`, `DB_SSL`, `DB_FORCE_SYNC`, `DB_AUTO_ALTER`,
   `DB_ALLOW_UNSAFE_ALTER`. Estrato 2, fora do lote por decisão registrada.
   Confirmado intocado pelo reteste. Era exatamente o risco `R6` da triagem.
3. **Não fecha `AUD-AUTHN-02`** (`docker-compose.yml:57`, `ADMIN_SEED_PASSWORD`
   ainda em `${VAR:-…}`, confirmado por leitura minha), **nem `AUD-AUTHN-03`**
   (`app.ts:74-90`, `jwt.decode` como chave de limiter, diff vazio), **nem
   `T22-F02`** (gate de `docker compose config` no CI, não implementado).
4. **Não atesta identidade inforjável**, e portanto **não altera** o veredito da
   Regra 24 em `T-02` §2 — que é literal e correto, e cuja própria ressalva
   (`T-02:66-72`) é este finding.
5. **Não é `REMEDIATION COMPLETE`** — autoridade da SanaCore, não minha.
6. **Não valida o guard de CI como prova de ordem de execução** (§4, probes B/D/H).
7. **Não valida `scan:secrets` como controle desta classe** (§5).

---

## 8. Divergência material que este veredito devolve ao humano (Regra 21)

Encontrei, por leitura literal de dois artefatos, uma contradição que **ninguém
tinha cruzado** e que muda a urgência de `F3`:

| Fonte | Afirmação literal |
|---|---|
| `T-02_TIER1_IDENTIDADE_REPORT.md:308-309` (2026-08-16, director) | *"`server/.env` desta máquina define `JWT_SECRET`: **SIM**"* · *"O valor definido **é** o placeholder: **NÃO** — o valor local difere do default inseguro"* |
| `APPROVALS.md:3003-3005` (`APR-2026-049` D1, 2026-08-17) | `ANTES: len=43  casaPlaceholder=true  forte=false` |

**As duas medições são literalmente verdadeiras e materialmente divergentes.** A
de `T-02` §10 testou **igualdade** contra o literal de `docker-compose.yml:54`
(45 caracteres) e concluiu "difere". A de `APR-2026-049` D1 testou **a família de
placeholder** (`ENV_PLACEHOLDER_PATTERN`, prefixo ancorado) e achou `true`.

**Fonte autoritativa determinada:** `APR-2026-049` D1 — teste de propriedade mais
forte, posterior, e a única que aferiu o que importa. **Consequência:** a premissa
**A1** da triagem (*"o `.env` da instância define um `JWT_SECRET` que não é o
placeholder"*) era **mais frágil do que registrado**: o valor da máquina medida
pertencia à família de placeholder até 2026-08-17. Não afirmo que fosse
adivinhável — o sufixo nunca foi lido, e não deve ser. Afirmo que a proteção local
declarada em `T-02` §10 era menor do que aquela leitura sugeria, e que
`T-02` §10 item 3 permanece integralmente válido: **a segunda máquina, réplicas,
backups restaurados e ambientes futuros seguem não verificados.**

Isto **não altera** a severidade nem o veredito (Regra 6/18). É insumo direto para
o dono calibrar `F3`.

---

## 9. Pendências nominalmente abertas ao fim deste veredito

**Do caso, condições de fechamento:** `F1` (integração `server-ci.yml` preservando
`CD-CI-01`) · `F2` (`CR-4` no repositório) · `F3` (rotação — gate humano) ·
`F4` (ownership de `docs/` + `C6` ou aceite do drift).

**Fora do caso, confirmados intocados e permanecendo abertos:** `T18-F02` ·
`AUD-AUTHN-02` · `AUD-AUTHN-03` · `T22-F02` · `T18-F07`.

**De aparato de verificação (`APR-2026-050` D4), prioridade do dono:**
`docs-path-reference-guard.test.ts` valida caminho dentro de
`client/node_modules` — **a suíte unitária do `server/` não é hermética ao
ambiente** e contamina o baseline de **todo reteste futuro**, não só deste caso.
Enquanto não corrigido, todo reteste precisa declarar o baseline da worktree em
que roda. Não é finding do objeto auditado; é defeito do instrumento da VeriCore,
e por isso é dívida **nossa**.

**Não medido, declarado:** `DYN-T02-01` (forja contra API de pé) · `docker compose
up` real · premissas `A1` (parcialmente respondida em §8) e `A3` · comportamento
do passo efêmero em runner real.

---

## 10. Registro formal e encaminhamentos

```
AUD-AUTHN-01   severidade CRITICAL          (inalterada — Regra 6/18)
               confiança  CONFIRMED         (reproduzido por execução no AUDIT_COMMIT)
               estado     RETEST_PASSED / AWAITING_INTEGRATION
               NÃO É      FINDING CLOSED    (condições F1-F4, §6)

Autoridade:    vericore-software-audit-director, Regra 4.
Escrita:       exclusivamente este arquivo, em audit/runs/.
               Nenhum artefato histórico alterado (Regra 15).
               Nada em remediation/, src/, server/, client/, tests/, coretriad/ (Regra 2).
```

1. **Ao dono (humano):** `F3` — rotação, com o insumo novo da §8. E decidir se `F4`
   é entrega ou aceite. E se `AUD-AUTHN-02` (`docker-compose.yml:57`, linha
   adjacente, edit idêntico) entra em caso próprio agora — recomendação técnica,
   sem autoridade de escopo.
2. **À SanaCore:** integrar `F1`/`F2` sem encostar em `CD-CI-01`; e corrigir, no
   seu próprio namespace, qualquer afirmação de `REMEDIATION_RESPONSE` que cite
   `scan:secrets` como verificação desta classe ou que atribua ao guard de CI a
   garantia de ordem de execução (§4, §5).
3. **Ao CoreTriad Director:** decisão de ownership de `docs/` na worktree `sana/`
   (`TRIAGE` §11 item 2), pendente desde a triagem, e priorização do defeito de
   aparato (`APR-2026-050` D4).
4. **À VeriCore (a mim):** reteste de integração sobre o commit que satisfizer
   `F1`/`F2`, e só então o `FINDING CLOSED`.
