# RETESTE INDEPENDENTE — `AUD-PROC-CUSTODIA-01`

```
RETEST_OF:      AUD-PROC-CUSTODIA-01  (HIGH, CONFIRMED por T-30)
AUDIT_ID:       ERP-LEGACY-001-AUD-001
PROJECT_ID:     ERP-LEGACY-001
CLASSE          RC-PROC-01 — critério de encerramento CE-08
AUDIT_COMMIT:   c1311a6f76b512fef893f7e60d934179cae3409f
HEAD (sessão):  694bca9  — ver §7, limite 3
EXECUTADO_POR:  vericore-audit-evidence-controller
DATA:           2026-08-16
MÉTODO:         READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT
FERRAMENTAS:    Read / Grep / Glob apenas. Nenhum Bash, nenhum comando de banco,
                nenhum script, nenhum teste executado.
```

## VEREDITO

| Eixo | Resultado |
|---|---|
| `RT-CUST-01` — controle de plataforma sobre Bash | **PASS** (leitura + execução de terceiro; limite em §2.1) |
| `RT-CUST-02` — credencial isolada sem visibilidade de produção | **PASS** |
| `RT-CUST-03` — conciliação `APPROVALS.md:787` | **SEM OBJETO** (T-30 §3; RC-PROC-01 §5) |
| `RT-CUST-04` — nenhuma nova ocorrência da classe | **PASS** na data |
| `RT-CUST-05` — taxonomia e carta do executor de infraestrutura | **PASS** (19/19 agentes com Bash) |
| **VEREDITO FINAL** | **`RETEST_PASSED` · `FINDING CLOSED`** |

**Fecha `AUD-PROC-CUSTODIA-01`. NÃO fecha `RC-PROC-01`** — a classe é cumulativa e seu
encerramento é do dono (Regra 18). Este documento **opina apenas sobre `CE-08`**, que é o
critério cuja definição literal é este reteste.

**O que o fechamento significa e o que não significa** — dito antes de qualquer outra coisa,
para que nenhum leitor futuro cite este documento fora de contexto:

> **Significa:** o vetor exato do incidente — `docker exec … psql -U evok_admin -d erp_evok_audio …`
> digitado por um agente ou pela sessão principal — **deixou de ser contido por disciplina e
> passou a ser contido por mecanismo**, verificável por leitura e demonstrado por execução.
> **Não significa** que o banco de produção esteja protegido contra um agente com Bash.
> Continua alcançável por indireção de script/`.env`, por `PGDATABASE`, por ofuscação de
> shell e por qualquer código que leia `DB_NAME`. §4 lista cada um, com dono.

---

## 1. O QUE FOI LIDO (fonte de tudo o que se afirma abaixo)

Leitura direta nesta sessão, sem reaproveitar número, linha ou caminho de contexto injetado:

- `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/AUD-PROC-CUSTODIA-01.md` (integral)
- `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/T-30_VALIDACAO_AUD-PROC-CUSTODIA-01.md` (integral)
- `coretriad/governance/RISK_CLASS-RC-PROC-01_CONTENCAO_POR_DISCIPLINA.md` (integral, incluindo §9)
- `.claude/hooks/org-isolation.js` (integral, 297 linhas) · `.claude/settings.json` (integral, 15 linhas)
- `docs/coretriad/planning/SEGREGATION_TEST_REPORT_2026-08-16.md` (integral)
- `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/G4_CREDENCIAL_ISOLADA_AUDITORIA.md` (integral)
- `docker-compose.yml` (integral) · `server/.env.example:15` · `docs/infra/DEPLOY_UBUNTU.md:29-53,117-163`
- `server/scripts/apply-pending-migrations.cjs` (1-90) e varredura de `server/scripts/`
- `remediation/cases/ERP-LEGACY-001-CASE-003/STATUS.md`
- `coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md:1085-1111` e `PROJECT_EVENT_LOG.md` (trechos de 2026-08-16)
- `.claude/agents/**` (inventário de `tools:` e de citação da regra permanente)

---

## 2. EXECUÇÃO DOS `RT-CUST-*`, UM A UM

### 2.1 `RT-CUST-01` — "Existe avaliação de comandos `Bash` que negue conexão a banco sem sufixo `_test`" → **PASS**

**Critério do finding (§10):** *"hoje `:134` aprova todo Bash"*. O reteste é: isso mudou?

**Verificado por leitura própria do arquivo em disco**, não por citação de terceiro:

| Elemento | Linha atual | O que faz |
|---|---|---|
| `PROD_DB_TOKEN_SOURCE = 'erp_evok_audio[A-Za-z0-9_]*'` | `:148` | captura o token **com o sufixo colado** |
| `SAFE_DB_SUFFIX = /(_test\|_ci)$/i` | `:149` | só o token que **termina** em `_test`/`_ci` é seguro |
| `SHELL_TOOLS = new Set(['bash','shell','run_command'])` | `:154` | escopo do bloqueio |
| `findProdDbRef()` — varredura recursiva ignorando `CONTENT_FIELDS` | `:159-184` | distingue **acesso** (`command`) de **conteúdo** (`content`, `new_string`, `prompt`, `description`) |
| Bloqueio efetivo | `:223-232` | `if (SHELL_TOOLS.has(String(tool).toLowerCase())) { … respond('block', …) }` |
| `if (!WRITE_TOOLS.has(tool)) return respond('approve', …)` | **`:234`** | o `approve` genérico que o finding apontou **continua existindo, mas agora é precedido** pelo bloqueio de `:223` |

**As três propriedades que eu precisava provar por leitura, e que provei:**

1. **A guarda é alcançada.** `String(tool).toLowerCase()` converte `Bash` → `bash`, que pertence a
   `SHELL_TOOLS`. O `return` de `:234` — a causa-raiz §6.2 do finding — deixou de ser a primeira
   avaliação a alcançar Bash.
2. **A guarda discrimina.** `erp_evok_audio_test` casa o token inteiro e passa por `SAFE_DB_SUFFIX`;
   `erp_evok_audio` não. Um regex ingênuo teria bloqueado a verificação dinâmica legítima da própria
   auditoria — não é o caso. E é **fail-closed por desenho**: `erp_evok_audio_prod`, `_bkp`, `_old`
   bloqueiam, porque a lista de sufixos seguros é allowlist, não denylist.
3. **A guarda não tem exceção por chamador.** `:223` é avaliado antes de qualquer discriminação entre
   sessão principal e subagente (`isSubagent` de `:208-212` só governa o selo de gabarito). A carta do
   agente não participa da decisão.

**Eficácia demonstrada por execução — de terceiro, com segregação respeitada.**
`docs/coretriad/planning/SEGREGATION_TEST_REPORT_2026-08-16.md` registra 8/8 PASS, com a mensagem
de bloqueio verbatim (`:71-73`) e, decisivamente, `TEST-HOOK-006`: **a sessão principal, sem contexto
de subagente e com todas as permissões, também é barrada**. Os controles negativos (`_test`, `_ci`,
`postgres` → `approve`) provam discriminação e não bloqueio indiscriminado. O relatório declara
(`:28-30`) que quem implementou (`opuscore-devops-engineer`) não validou o próprio trabalho —
requisito que `CE-02` importa de `TEST-SEAL-001/002` (`APR-2026-014`).

**Aceito o `PASS`, e registro dois limites que não anulam o veredito mas o qualificam:**

- **L1 — a prova de execução está ancorada em outra revisão do arquivo.** O relatório identifica o hook
  testado por `git hash-object 7eb8316d2936a40e86d37a54158ff15bf9050be1`. O `PROJECT_EVENT_LOG.md:1307-1309`
  e `RC-PROC-01 §2.2` citam a guarda em `:100-152`/`:188-200` com o `approve` em `:202`; **no arquivo que
  li, essas âncoras são `:148-184`/`:223-232` e `:234`** — o arquivo cresceu ~32 linhas desde aquele
  registro, pela adição de `DOCS_FINDING_ARTIFACT` (`:53`, vetor do incidente 1 / `CE-05`). Eu **não posso
  executar** `git hash-object` (§7). O que fiz em substituição: reli a lógica inteira na revisão em disco e
  confirmei que a alteração posterior é **confinada a `ORG_RULES`** — caminho de escrita — e que o bloqueio
  de banco de `:223-232` **permanece íntegro e permanece antes** do `approve` de `:234`. Regressão da guarda
  de banco pela mudança de `CE-05`: **descartada por leitura**, não por execução.
- **L2 — a guarda é sintática, e o próprio relatório de execução o declara** (`§6`): não cobre `psql` sem
  `-d`, `PGDATABASE` exportado antes, `bash deploy.sh`, `npm run <script>`, `$DB` resolvido em runtime, nem
  ofuscação. Isso não é descoberta minha nem omissão de ninguém — está escrito. É tratado em §4.

**Veredito `RT-CUST-01`: PASS.** O critério literal do finding era a existência de avaliação de Bash que
negue banco sem sufixo de teste. Ela existe, é alcançável, discrimina corretamente, vale para todos os
chamadores e teve eficácia demonstrada por execução independente sobre o vetor exato do incidente.

### 2.2 `RT-CUST-02` — "Existe role distinta para teste/auditoria, sem visibilidade de `erp_evok_audio`" → **PASS**

Verificado **por leitura de artefato**, como o próprio finding exige (`§10`: *"verificar por leitura de
artefato, nunca por conexão de banco"*). Não abri conexão alguma.

`G4_CREDENCIAL_ISOLADA_AUDITORIA.md`, evidência de chegada:

- `:106-121` — `CREATE ROLE evok_audit … NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION
  CONNECTION LIMIT 5`; `REVOKE CONNECT ON DATABASE erp_evok_audio FROM PUBLIC`;
  `GRANT CONNECT ON DATABASE erp_evok_audio_test TO evok_audit`; `GRANT pg_read_all_data`.
- `:170-180` — ACL medida **depois**: `erp_evok_audio` = `{=T/evok_admin, evok_admin=CTc/…, evok_app=c/…}`.
  O `c` de `PUBLIC` sumiu e **`evok_audit` não aparece em nenhuma posição** da ACL de produção.
- `:193-196` — `rolsuper=f, rolcreatedb=f, rolcreaterole=f, rolbypassrls=f, rolreplication=f`.
- `:217-229` — recusa provada **no handshake**: `FATAL: permission denied for database "erp_evok_audio" /
  User does not have CONNECT privilege`, `EXIT_CODE=2`, para `SELECT 1` **e** para `SELECT count(*)`.
  Não é checagem por comando: a conexão não se estabelece.
- `:240-256` — a mesma role funciona em `erp_evok_audio_test`; `:267-271` — escrita recusada
  (`permission denied for schema public`), confirmando leitura-apenas.

**Qualidade que registro por ser não óbvia:** o executor tratou `PUBLIC`, não só a role nova
(`:138-146`). A ACL de partida (`:77-83`) mostrava `=Tc/evok_admin` — **qualquer role com `LOGIN` já
conectava em produção por privilégio padrão do PostgreSQL**. Revogar só de `evok_audit` teria sido inócuo.
Isso é diferença entre remediar o sintoma e remediar a causa, e foi medido antes, não suposto.

**Limite declarado pelo próprio executor e que eu sustento** (`:344-361`): a barreira protege **quem usa
`evok_audit`**. `evok_admin` permanece superusuária sobre os dois bancos, e quem a usar não é impedido por
esta camada. Isso é exatamente por que `RT-CUST-01` e `RT-CUST-02` só fecham juntos: a credencial cobre o
erro de alvo de quem já optou pela credencial certa; o hook cobre quem não optou. Nenhuma das duas cobre
sozinha o incidente ocorrido.

**Veredito `RT-CUST-02`: PASS.**

### 2.3 `RT-CUST-03` — **SEM OBJETO**

`T-30 §3` provou por leitura de `server/scripts/run-api-suite.cjs:517-536` que o guard citado em
`APPROVALS.md:787` existe de fato (recusa por `NODE_ENV=production`, por `/prod/i` e por ausência de sufixo
`_test`/`_ci`), e `RC-PROC-01 §5` confirmou por releitura independente. A premissa do critério — divergência
governança × mecanismo — é `FALSE_POSITIVE`. **Não executo o critério e não o converto em PASS**: um critério
sem objeto não é um critério satisfeito, e registrar o contrário inflaria a cobertura deste reteste.

### 2.4 `RT-CUST-04` — "Nenhuma nova ocorrência da classe após a data do finding" → **PASS na data**

Varredura própria, com padrão que captura **alvo de conexão** e não menção ao nome
(`-d erp_evok_audio` seguido de fronteira de palavra — `_test`/`_ci` não casam, pois `_` é caractere de
palavra), sobre `audit/`, `coretriad/` e `remediation/`:

| Local | Ocorrências | Natureza |
|---|---|---|
| `G4_PRECONDICAO_BANCO_TESTE.md:15,23` | 2 | **o incidente original** — única conexão efetiva registrada |
| `AUD-PROC-CUSTODIA-01.md:93` · `T-30…:41,43,163,242,349` · `RC-PROC-01:95` | 7 | citação/transcrição do incidente |
| `G4_CREDENCIAL_ISOLADA_AUDITORIA.md:217,226` | 2 | **prova negativa** — `evok_audit` recusada no handshake; a conexão **não** se estabeleceu |
| `G4_CREDENCIAL_ISOLADA_AUDITORIA.md:320,333,347,368` | 4 | prosa normativa sobre o incidente e sobre a barreira |
| `remediation/` | **0** | — |

**Nenhuma ocorrência nova.** Conferido também que o catálogo de incidentes de processo não ganhou um 6º item:
`PROJECT_STATE.md` não contém "6º incidente" nem "sexta ocorrência", e `:1060` mantém a leitura de cinco itens
com o item 2 excluído da classe.

**O que este PASS vale, honestamente:** ele prova ausência **no registro versionado**. Como `CE-06` continua
aberto (não há retenção independente de log de conexão), ausência no registro **não é** ausência de fato para
os vetores que o hook não cobre. Para o vetor que o hook cobre, a asserção ficou mais forte que uma varredura:
a repetição literal do comando é agora recusada pela plataforma. Essa assimetria é o ganho real da remediação
e está declarada em §4.

### 2.5 `RT-CUST-05` — "Executor de infraestrutura pertence à taxonomia CoreTriad e sua carta cita a regra permanente" → **PASS**

Fiz mais do que o critério pede (que é conferir o executor da próxima trilha): inventariei **todos** os agentes.

**a) Agentes com `Bash`, e todos casam em `ORG_RULES`.** `Grep ^tools:.*Bash` em `.claude/agents/`
retorna **19 arquivos**: 15 `opuscore/*`, 3 `sanacore/*`, 1 `vericore/*`
(`vericore-audit-verification-runner`). Todos os prefixos casam com uma das quatro `ORG_RULES`
(`org-isolation.js:55-97`). **Nenhum agente com Bash está fora da taxonomia** — a causa-raiz §6.3 do
finding (agente `docker`, sem prefixo, caindo no `approve` residual de `:296`) foi eliminada na origem.

**b) Todos os 19 citam a regra permanente.** `Grep "dado real|APR-2026-016"` em `.claude/agents/` retorna
**34 arquivos / 102 ocorrências**. O conjunto dos 34 é exatamente `{19 com Bash} ∪ {15 depreciados}` —
isto é, **a interseção "tem Bash" × "não cita a regra" é vazia**. Amostrei o executor natural da próxima
trilha de infraestrutura, `opuscore-devops-engineer`, e sua carta cita a regra em `:42,44,54` e nomeia
`AUD-PROC-CUSTODIA-01` e `RC-PROC-01` em `:62`.

**c) O agente executor do incidente perdeu Bash.** `.claude/agents/_deprecated/docker.md:5` hoje declara
`tools: Read, Glob, Grep` — Bash, Edit e Write removidos; e `:84` passou a citar `APR-2026-016`.
**Os 15 arquivos de `_deprecated/` estão todos em `Read, Glob, Grep`** — verificado um a um pelo `Grep ^tools:`,
sem exceção. O `CE-04` do `RC-PROC-01 §9.4` registra o Bash dos depreciados como "decisão aberta do dono";
**em disco, nesta data, esse Bash não existe mais**. Registro a divergência para o director conciliar (§6.2);
para efeito deste reteste, o estado em disco é o que vale (Regra 7).

**Veredito `RT-CUST-05`: PASS**, com margem — o critério pedia um agente, e a propriedade se verifica em 19/19.

---

## 3. AVALIAÇÃO DOS RESÍDUOS ACEITOS — a parte difícil

A pergunta que me foi feita é a certa: *o finding é sobre ausência de controle técnico; agora existe controle
técnico com limites aceitos por escrito — isso basta?* Considerei as duas respostas antes de escolher.

### 3.1 O argumento de que NÃO basta (e até onde ele vai)

1. **Uma guarda sintática sobre string não é uma guarda sobre o risco.** O risco é "agente alcança dado real";
   o que foi barrado é "agente escreve `erp_evok_audio` na linha de comando". São conjuntos diferentes, e o
   segundo é subconjunto próprio do primeiro.
2. **A evasão por concatenação em variável foi demonstrada por execução** — não é hipótese. Um controle que
   cai diante de `-d erp_evok"_"audio` cobre distração, não capacidade.
3. **`evok_admin` continua superusuária sobre os dois bancos.** A frase de §5.2.4 do finding — *"a distância
   entre o que aconteceu e um desastre é uma palavra na linha de comando"* — continua verdadeira para quem
   usar `evok_admin` por um caminho que o hook não lê.
4. **`CE-06` aberto:** o cumprimento da regra, fora do vetor coberto, segue verificável só por autorreporte.
   Fechar um finding de custódia sem poder auditar a custódia é desconfortável, e deve ser dito.

### 3.2 O argumento de que basta — e por que ele vence

1. **O objeto do finding é nominado, não difuso.** O título, §1, §6.2 e §7 delimitam: um agente executou
   `docker exec … psql -U evok_admin -d erp_evok_audio -c "SELECT count(*) …"` e **nenhum controle técnico o
   impediu**. Esse enunciado é hoje **falso**: o mesmo comando, do mesmo agente ou da sessão principal, é
   recusado pela plataforma, com mensagem própria do mecanismo, provado por execução de quem não implementou.
   O que o finding afirmou como inexistente passou a existir.
2. **O critério de fechamento foi escrito antes de se saber a solução, e foi validado adversarialmente.**
   `RT-CUST-01/02/04/05` são o contrato de encerramento, redigidos pelo autor e submetidos ao
   `vericore-finding-validator`, que atacou o finding em cinco eixos. **Reescrever o contrato agora, depois de
   satisfeito, é mover a trave.** Isso teria dois efeitos ruins e nenhum bom: destruiria o valor de qualquer
   `RETEST_SPECIFICATION` do programa (se cumpri-la não fecha, para que escrevê-la?) e transferiria para a
   VeriCore uma decisão de escopo que é do dono.
3. **Resíduo aceito por escrito não é resíduo desconhecido — e não é meu para recusar.** `APR-2026-026`
   (`RC-PROC-01 §9.1`) aceita `CE-02` com fundamento declarado: a guarda cobre acidente, não evasão
   deliberada, porque os 5 incidentes catalogados são erro não intencional **com autorreporte**, nunca
   ocultação. A Regra 18 reserva o gate humano ao humano; a Regra 4 me dá `RETEST_PASSED`, não veto sobre
   aceitação de risco do dono. Manter o finding aberto contra uma aceitação explícita seria eu decidir, por
   inferência, o que o dono decidiu por escrito — precisamente o que a Regra 18 proíbe. **O que eu posso, e
   faço:** recusar chamar `CE-02` de satisfeito, e escrever em §4 que a proteção contra evasão deliberada
   **não existe**.
4. **A remediação foi além do finding, não aquém.** O finding pedia um controle; entregaram-se **duas camadas
   independentes** (plataforma + credencial), mais a eliminação da causa-raiz de despacho (§2.5), mais a
   correção da documentação que ensinava o comando (`DEPLOY_UBUNTU.md:29-53` hoje abre com aviso normativo
   citando `APR-2026-016` e `AUD-PROC-CUSTODIA-01`, antes dos comandos de `:117-163`), mais `CASE-003` com
   `RETEST_PASSED` independente. Nenhuma dessas camadas foi creditada como atenuante de severidade na época,
   corretamente (`T-30 §4.3`) — mas todas contam **agora**, que é o momento em que contar é legítimo.
5. **Os resíduos têm dono, ID e documento — não somem com o fechamento.** `CE-02` (aceito), `CE-03`, `CE-06`
   e `CE-09` continuam abertos ou aceitos em `RC-PROC-01`, que **permanece ABERTA** e cujo fechamento é do
   dono. A questão "isto está resolvido de verdade?" continua sendo feita, no lugar certo. Um finding pontual
   mantido aberto para representar um risco de classe **duplicaria o registro e degradaria os dois**.
6. **`evok_admin` superusuária não pertence a este finding.** É `AUD-DB-01`/`FIND-ERP-002`, achados próprios
   e abertos, expressamente tratados pelo finding como agravantes **por composição, nunca por promoção por
   analogia** (`§11`, precedente `APR-2026-018`). Segurar `CUSTODIA-01` por eles seria contá-los duas vezes.

### 3.3 A ponderação, sem eufemismo

O finding mediu **a taxa de falha da única barreira existente**, quando a única barreira era a obediência do
agente. Hoje há barreira de mecanismo no vetor medido, provada por execução, sem exceção por chamador, com
discriminação verificada e falha em modo fechado. A frase de `RC-PROC-01 §3.2` — *"um controle cuja taxa de
falha observada é maior que zero e cujo modo de falha é 'o agente não seguiu à risca' não é controle, é
convenção"* — **deixou de se aplicar ao vetor deste finding**, e continua se aplicando aos vetores da classe.
Essa é exatamente a fronteira entre `CE-08` e os demais `CE-*`, e é por isso que o desenho de `RC-PROC-01`
previu critérios separados: para que o pontual pudesse fechar sem que o transversal fechasse junto.

**Fecho o finding. Não fecho a classe, e não a declaro próxima de fechar.**

---

## 4. O QUE PERMANECE ABERTO, MESMO COM O FECHAMENTO

Registrado para que este `FINDING CLOSED` nunca seja citado como "o dado real está protegido".

| # | Resíduo | Estado | Onde vive |
|---|---|---|---|
| R1 | **Evasão deliberada por ofuscação de shell** (`-d erp_evok"_"audio`, variável concatenada, `$(…)`, base64) — o hook não avalia o comando após a expansão do shell; limitação estrutural, não bug | **RESÍDUO ACEITO por escrito** (`APR-2026-026`) — **não satisfeito** | `RC-PROC-01` `CE-02` §9.1 |
| R2 | **Indireção por script/ambiente** — o hook lê a string do comando; um comando que **não nomeia o banco** passa. Verificado por mim em `server/scripts/`: `apply-pending-migrations.cjs:35` (**sem guarda alguma, aplica DDL**, default `erp_evok_audio`, declarado no próprio cabeçalho `:17-25`), `seed-usuarios-departamentos.cjs:315` (cabeçalho `:49-57` declara ausência de guarda de sufixo), `criar-aprovador.cjs:178` (só guarda `NODE_ENV`), `comparar-bancos.cjs:46`; e `server/.env.example:15` prescreve `DB_NAME=erp_evok_audio` | **ABERTO** | `RC-PROC-01` `CE-03` ("vetor estrutural: `.env.example` sem banco de dev separado") |
| R3 | **`evok_admin` superusuária sobre os dois bancos**; `evok_app` mantém `CONNECT` em produção | **ABERTO** — finding próprio | `AUD-DB-01` / `FIND-ERP-002` |
| R4 | **Sem retenção independente de evidência** — fora do vetor coberto pelo hook, o cumprimento da regra segue verificável apenas por autorreporte; nenhuma varredura futura poderá provar recorrência ou ausência dela | **ABERTO** — decisão do dono pendente | `RC-PROC-01` `CE-06` §2.4 |
| R5 | **Vetores dos incidentes 3 e 4** (número citado de contexto injetado; Control Plane envelhecendo) — por natureza **não imponíveis por hook**; a reconciliação periódica ainda não tem gatilho definido | **PARCIAL** | `RC-PROC-01` `CE-07` |
| R6 | **A guarda não cobre outras stacks nem ferramentas fora do matcher.** `settings.json:5` enumera `Write\|Edit\|MultiEdit\|NotebookEdit\|Read\|Grep\|Glob\|Bash`: uma ferramenta de shell futura (MCP, `run_command` de outro provedor) **não dispara o hook**, ainda que `SHELL_TOOLS` a preveja. O token é o literal `erp_evok_audio` | **ABERTO — observação minha, não promovida a finding** | remeto ao director |
| R7 | **Falso positivo aceito por desenho:** `grep -r erp_evok_audio docs/` e `git commit -m` citando o nome passam a ser bloqueados, porque `command` é campo de acesso. Contorno legítimo: usar a ferramenta `Grep` | declarado e aceito | `SEGREGATION_TEST_REPORT_2026-08-16.md §6` |

**Sobre R2, um registro que devo fazer com todas as letras:** é o resíduo mais desconfortável deste
fechamento, porque é da **classe acidente** — a mesma que a aceitação de `CE-02` diz estar coberta — e porque
o script sem guarda **aplica DDL**, não `SELECT`. Não o promovo a finding novo nem o uso para reprovar o
reteste, por três razões verificadas: (i) está registrado em `CE-03` como aberto, não escondido; (ii) está
declarado no cabeçalho do próprio script (`apply-pending-migrations.cjs:17-25`, que cita `APR-2026-016` e
remete a `RC-PROC-01 CE-03`); (iii) `CASE-003 STATUS.md:28-32` deixou expressamente em aberto tanto a
varredura dos demais scripts quanto o vetor estrutural do `.env.example`. **A varredura que aquele pacote
declarou não ter feito está feita acima e é a contribuição de evidência deste reteste** — quatro scripts
nomeados, com linha. Cabe ao dono decidir escopo; não amplio por analogia (`APR-2026-018`).

---

## 5. DECLARAÇÃO DE VEREDITO (Regra 4)

**`AUD-PROC-CUSTODIA-01` — `RETEST_PASSED`.**
**`AUD-PROC-CUSTODIA-01` — `FINDING CLOSED`.**

Fundamento: os quatro critérios aplicáveis da `RETEST_SPECIFICATION` (§10 do finding) foram executados e
passaram; o quinto perdeu o objeto por refutação validada. O enunciado central do finding — *"nenhum controle
técnico impediu, e não existe controle técnico sobre este vetor"* — é factualmente falso na data, por leitura
do mecanismo e por execução independente sobre o vetor exato do incidente. Os resíduos remanescentes ou estão
**aceitos por escrito pelo dono**, ou têm **ID, dono e documento próprios abertos** (§4), e nenhum deles é o
objeto deste finding.

**Sobre `CE-08` do `RC-PROC-01`** — único `CE-*` sobre o qual tenho autoridade de opinar, porque sua definição
literal é este reteste: **considero-o SATISFEITO** por este documento. A conversão disso em estado da classe é
registro do `coretriad-director`; o encerramento da classe é do dono.

**O que este documento explicitamente NÃO declara:** não fecha `RC-PROC-01`; não fecha nem opina sobre
`CE-01`…`CE-07` ou `CE-09`; não declara `AUDIT_PASSED` nem `FINDINGS_CONFIRMED` para a run; não declara
`REMEDIATION COMPLETE` (autoridade da SanaCore); não altera a severidade `HIGH` nem o histórico do finding —
`AUD-PROC-CUSTODIA-01.md` e `T-30` permanecem **intocados** (Regra 15). Este reteste é **adição**.

---

## 6. PEDIDOS — o que eu não podia fazer e a quem cabe

### 6.1 Evidência dinâmica que especifico em vez de executar

Não abri conexão com banco algum e não executei comando algum (§7). Se o director quiser **elevar** a
confiança de `RT-CUST-01` de "íntegro por leitura na revisão atual + executado na revisão `7eb8316`" para
"executado na revisão atual", o pedido mínimo, para agente que **não** escreveu o hook e **sem tocar banco**:

1. `git hash-object .claude/hooks/org-isolation.js` — comparar com `7eb8316d2936a40e86d37a54158ff15bf9050be1`.
   Se divergir (é o que espero, pela adição de `DOCS_FINDING_ARTIFACT`), reexecutar os itens 2-3.
2. Reexecutar `TEST-HOOK-005`/`CONTROLE-005`/`TEST-HOOK-006`/`CONTROLE-006` com **comando inerte** (`echo`),
   exatamente como em `SEGREGATION_TEST_REPORT_2026-08-16.md §5.3` — a guarda é sintática, `echo` basta para
   disparar o matcher e nenhum banco é tocado.
3. Caso negativo adicional, hoje não coberto por nenhuma rodada: um comando de **indireção** (`echo` de
   `node server/scripts/apply-pending-migrations.cjs`, sem citar o banco) para registrar **por execução** que
   R2 passa — transformando o resíduo declarado em prosa numa evidência reproduzível para `CE-03`.

### 6.2 Duas divergências de registro que encontrei e não posso conciliar (Regra 16 — `coretriad/` não é meu namespace)

1. **Citação sem artefato localizável.** `RC-PROC-01 §9.4` afirma `CE-05` **SATISFEITO** com *"23/23 casos"*.
   Procurei o artefato de evidência por `Grep` de `23/23`, `23 casos`, `CE-05` e `DOCS_FINDING_ARTIFACT` em
   todo o repositório: `CE-05` só aparece em `RC-PROC-01` e no `PROJECT_EVENT_LOG`, e as ocorrências de
   `23/23` são de suítes de teste do ERP, não desta bateria. **Não existe, no repositório, relatório dessa
   rodada de 23 casos** — ao contrário dos 8 casos, que têm relatório com executor, decisão e mensagem
   verbatim. Como controlador de evidência, registro isto como **citação órfã**: um estado `SATISFEITO`
   apoiado em prova não retida. Não é objeto deste reteste (é `CE-05`) e **não altera meu veredito**, mas
   contradiz o próprio princípio que a classe fixou em `§5`: *"só é controle o que é versionado, reauditável
   e imposto por quem não é o restringido"*. **Pedido:** persistir o relatório dos 23 casos, ou rebaixar
   `CE-05` a `ARTEFATO PRESENTE / eficácia não retida`.
2. **`CE-04` desatualizado a favor da segurança.** `RC-PROC-01 §9.4` registra que *"o `Bash` dos 15 agentes de
   `_deprecated/` segue decisão aberta do dono"*. Em disco, nesta data, **os 15 já estão em
   `Read, Glob, Grep`** (§2.5c). O estado real é melhor que o registrado; conciliar cabe ao director.

---

## 7. DECLARAÇÃO DE MÉTODO E LIMITES

- **Regra 2 respeitada.** Nada foi corrigido, refatorado ou alterado. Não toquei `.claude/`, `server/`,
  `docs/`, `coretriad/`, `remediation/`, nem o finding, nem a validação `T-30`. **Escrita exclusivamente
  neste arquivo, dentro de `audit/`** — namespace deste agente.
- **Nenhum comando executado.** Sem Bash, sem banco, sem script, sem teste, sem `git`. Verificar por conexão
  seria repetir a classe de violação em apuração; verificar por execução de shell não me é possível — este
  agente opera com `Read`/`Grep`/`Glob`/`Write` apenas, e essa limitação está declarada aqui em vez de
  contornada. Onde precisei de evidência dinâmica, **especifiquei o pedido** (§6.1).
- **Limite 3 — âncora de commit.** O objeto deste reteste é **estado de mecanismo e conduta de processo**, não
  estado de código no `AUDIT_COMMIT` `c1311a6`. Os artefatos de controle (`.claude/hooks/org-isolation.js`,
  `.claude/agents/**`, `docs/`, `server/scripts/`) foram lidos na **working tree de 2026-08-16**; o HEAD
  registrado no início desta sessão é `694bca9`. **Não verifiquei se essas alterações estão commitadas** — não
  posso executar `git`. Se algum controle aqui aprovado existir apenas na working tree, o `RETEST_PASSED`
  vale para o estado lido e **precisa ser reconfirmado após o commit**. Isso é condição, não formalidade.
- **Limite 4 — dependência de execução de terceiro.** A eficácia de `RT-CUST-01` apoia-se em
  `SEGREGATION_TEST_REPORT_2026-08-16.md`, que não executei. Mitigações verificadas por mim: o relatório nomeia
  executores por organização, registra que quem implementou não validou, transcreve as mensagens de bloqueio
  verbatim, declara três desvios de protocolo e uma seção inteira do que **não** prova. É evidência de
  qualidade auditável — não é evidência minha, e está dito.
- **Limite 5 — exaustividade.** Minha varredura de `RT-CUST-04` cobre o **registro versionado**. Com `CE-06`
  aberto, "sem ocorrência no registro" ≠ "sem ocorrência", para os vetores que o hook não cobre (§4 R2, R4).
- **Nenhum segredo reproduzido.** Só nomes de role (`evok_admin`, `evok_app`, `evok_audit`), nomes de banco e
  nomes de variável. Nenhuma senha, string de conexão completa ou valor de `.env`. Não li o `.env` local: a
  afirmação sobre o default de produção apoia-se em `server/.env.example:15` e nos cabeçalhos dos scripts.
- **Nenhum finding novo criado.** As observações de §4 R6 e §6.2 são registradas e **explicitamente não
  promovidas** — criar finding não é atribuição deste agente.
- **Toda leitura foi feita diretamente na fonte nesta sessão.** Nenhum número, caminho ou linha foi
  reproduzido de contexto injetado sem releitura independente — inclusive as afirmações que me foram
  apresentadas como dadas sobre o hook, a credencial isolada e as cartas de agente, que reli integralmente
  antes de as sustentar. Onde o que li divergiu do que me foi apresentado, a divergência está registrada
  (§2.1 L1, §6.2).
