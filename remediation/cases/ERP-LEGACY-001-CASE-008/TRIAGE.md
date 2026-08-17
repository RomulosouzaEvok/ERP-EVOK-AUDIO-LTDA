# TRIAGE — ERP-LEGACY-001-CASE-008

| Campo | Valor |
|---|---|
| `CASE_ID` | `ERP-LEGACY-001-CASE-008` |
| `FINDING_ID` | `AUD-DB-02` (run `ERP-LEGACY-001-AUD-001`, trilha T-03) |
| Severidade | **HIGH** — fixada por decisão registrada, **não reavaliada aqui** (Regra 18) |
| `PROJECT_ID` | `ERP-LEGACY-001` (produção real) |
| Posição na fila | estrato 2 — HIGH · produção real (`T-39` §2.2 item 3; `REMEDIATION_BACKLOG.md` §3 item 3) |
| `AUDIT_COMMIT` | `c1311a6f76b512fef893f7e60d934179cae3409f` (imutável — Regra 12) |
| Fase | **TRIAGEM APENAS** |
| Agente | `sanacore-remediation-triage` |
| Árvore usada | worktree principal, `f532d76` (branch `audit/ERP-LEGACY-001-AUD-001/2026-08-16`) |
| Data | 2026-08-17 |

## Declaração de cumprimento (obrigatória)

- **Nenhuma conexão de banco foi aberta**, contra banco nenhum, em nenhum
  momento desta triagem. Nenhuma suíte de teste executada, nenhum script de
  diagnóstico, nenhuma query — nem para contar linhas. `APR-2026-016`, regra
  permanente de segurança de dado real.
- Toda a análise é **estática sobre arquivos versionados**. Os comandos usados
  foram exclusivamente `git` (`log`, `diff`, `grep`, `show`, `branch`,
  `worktree`, `merge-base`, `rev-list`), `ls`/`find` e leitura de arquivo.
- **Nenhum valor de segredo ou credencial foi copiado** para este documento —
  apenas nomes de variáveis (`AUDIT_ALERT_WEBHOOK_URL`, `LOG_FILE`, `DB_NAME`,
  `DB_USER`) e nomes de role (`evok_admin`, `evok_app`, usuário de container
  `evok`).
- **Nenhuma âncora foi confirmada por saída de `grep`.** `auditLogService.ts`,
  `AuditLog.ts`, `auditActions.ts`, `database.ts`, `index.ts`, `Dockerfile` e
  `audit-log-failure-alerting.test.ts` foram lidos integralmente com a
  ferramenta de leitura de arquivo. `grep` foi usado apenas para **contagem** e
  **localização**, nunca para citar literal.
- Nada foi implementado. **Nenhum worktree criado, nenhuma branch criada,
  nenhum arquivo de código escrito.** Este é o **único** arquivo produzido.
- Nenhum `FINDING CLOSED`, `RETEST_PASSED` ou `REMEDIATION_COMPLETE` é
  declarado aqui (Regras 3 e 4).

> **Nota de validade da árvore.** `git diff --name-only c1311a6f…HEAD -- server/src`
> retorna **vazio**: `server/src` é byte-idêntico entre o `AUDIT_COMMIT` e a
> árvore em que esta triagem foi feita. Toda leitura abaixo vale para os dois.

---

## 1. Reprodução estática do finding

### 1.1 `LogActionParams` não tem parâmetro de transação — **CONFIRMADO**

`server/src/services/auditLogService.ts:16-31`. A interface tem exatamente
nove campos: `action`, `entityType`, `entityId`, `entityDescription`,
`oldValues`, `newValues`, `description`, `success`, `errorMessage`. Não há
`transaction`, não há `options`, não há nada por onde uma `Transaction` do
Sequelize entre. A assinatura da função é
`logAction(req: Request, params: LogActionParams): Promise<void>` (`:122`) —
dois parâmetros, nenhum terceiro.

### 1.2 `AuditLog.create({...})` sem objeto de opções — **CONFIRMADO**

`server/src/models/AuditLog.ts:148-164`. A chamada é
`await AuditLog.create({ …14 campos… });` e **fecha no `}` do objeto de
atributos, seguido de `)`**. Não há segundo argumento. Em Sequelize é
exatamente o segundo argumento (`{ transaction }`) que vincula a escrita a uma
transação. Logo, nenhuma transação é propagável — confirmado por leitura, não
por síntese.

A assinatura declarada de `register` (`AuditLog.ts:52-65` e `:119-132`) também
não tem campo de transação: 11 campos, nenhum deles `transaction` ou
`options`.

### 1.3 Verificação que poderia ter derrubado o finding — e não derrubou

Se o projeto usasse **CLS** (`Sequelize.useCLS` / `cls-hooked`), transações se
propagariam **implicitamente** para qualquer query no mesmo contexto assíncrono,
e a frase "estruturalmente não-transacional" seria falsa mesmo sem parâmetro
explícito. Verifiquei: `server/src/config/database.ts` foi lido por inteiro
(67 linhas) — `new Sequelize(getConfig())` na linha 53, **sem `useCLS`, sem
namespace**, e `cls-hooked` não aparece em `server/package.json`. **A premissa
do finding sobrevive à verificação adversarial.** Registro isto porque é a
única coisa que poderia ter invalidado o caso inteiro.

### 1.4 Zero `await` nos call sites — **CONFIRMADO, com uma correção de método**

- `await logAction` em `server/src` = **0 ocorrências**.
- `.catch(` encadeado em `logAction(...)` = **0 ocorrências**.
- `void logAction(...)` = **0 ocorrências**.

**Correção de método a registrar (não muda a conclusão):** a varredura do
finding usou `await auditLogService\.logAction|await logAction`. O primeiro
ramo é **vazio por construção** — `auditLogService.logAction(` tem **0
ocorrências em qualquer forma** em `server/src`; todos os consumidores fazem
`const { logAction } = require('.../services/auditLogService');`
(desestruturação em CommonJS). A conclusão do finding se sustenta
integralmente pelo segundo ramo.

### 1.5 Correção de número: são **268** call sites, não 362

Aritmética, medida no `AUDIT_COMMIT`, com `git grep` sobre a árvore do commit
(não sobre a working tree):

| Medida | Valor |
|---|---|
| Linhas com `logAction(` em `server/src` | **270** |
| — menos a definição (`auditLogService.ts:122`) | −1 |
| — menos uma menção em prosa (`modules/auth/README.md`) | −1 |
| **Call sites reais** | **268** |
| Arquivos `.ts` que contêm call site | **84** |
| Ocorrências totais do token `logAction` em `server/src` | 404 (imports + comentários + call sites) |

Nenhuma variação de recorte que testei (repo inteiro, incluindo `server/tests`,
contando ocorrências em vez de linhas) chega a 362. **Não consegui reproduzir
362 por método nenhum.** Registro como divergência aberta contra o texto do
finding; **a direção do achado é idêntica** — a razão de call sites que
aguardam é **0/268**. Para dimensionar blast radius, use **268 / 84 arquivos**.

### 1.6 Persistência de último recurso — **CONFIRMADO**

`auditLogService.ts:33`:
`const FAILURE_LOG_PATH = path.join(process.cwd(), 'logs', 'audit-failures.log');`
No container, `WORKDIR /app` (`server/Dockerfile:20`) e
`CMD ["node", "dist/index.js"]` (`:38`) → `process.cwd()` = `/app` →
`/app/logs/audit-failures.log`.

### 1.7 Mitigações citadas pelo finding — **CONFIRMADAS**

- Retry único com 200 ms de espera: `auditLogService.ts:206-212`
  (`RETRY_DELAY_MS = 200` em `:34`).
- Degradação de vocabulário sem perda de evento: `:176-204`, apoiada em
  `AUDIT_ACTION_DB_FALLBACK` (`auditActions.ts:250-260`) e na detecção por
  `22P02` (`auditActions.ts:343-353`).

---

## 2. Causa-raiz

### 2.1 O que está **PROVADO** — o desenho é deliberado, e está escrito

Este é o ponto que muda tudo. Não é descuido. Quatro artefatos independentes,
todos no repositório, declaram a intenção:

1. **`auditLogService.ts:92-98`** (JSDoc de `logAction`) — *"Wrapper fino sobre
   `AuditLog.register` para reduzir repetição nos controllers. **Sempre
   fire-and-forget (não bloqueia a resposta HTTP principal): nunca propaga erro
   para o chamador.** Faz uma tentativa de retry antes de desistir; se ambas
   falharem, o evento é persistido em `logs/audit-failures.log` e, se
   configurado, um alerta é disparado via `AUDIT_ALERT_WEBHOOK_URL` — a falha
   nunca fica só no console."*

2. **`auditLogService.ts:114-116`** — a regra de uso, explícita, para
   transação: *"Quando a ação auditada ocorre dentro de uma transaction
   Sequelize, **chame esta função DEPOIS do `t.commit()`, nunca dentro da
   transaction**, para não segurar locks de banco desnecessariamente."*
   Ou seja: a ausência de propagação de transação **não é um esquecimento — é a
   política**, e ela está documentada no ponto exato onde o finding aponta o
   defeito.

3. **`AuditLog.ts:142-147`** — o comentário imediatamente acima do
   `create` diz que `register` **propositalmente não engole o erro**, porque
   quem decide o tratamento (retry, degradação, arquivo, alerta) é
   `logAction`. É uma divisão de responsabilidade desenhada, revisada e
   corrigida uma vez: o commit `51eea8f` registra *"Corrigido bug real que
   tornava esse hardening morto: `AuditLog.model#register` engolia a excecao
   internamente antes dela chegar no retry/alerta."*

4. **`auditActions.ts:8-16`** — o incidente de 2026-08-10 é descrito com a
   causa nomeada: *"Como `logAction` é fire-and-forget por desenho (nunca
   propaga erro ao chamador), o Postgres rejeitava o INSERT com `22P02` …, a
   API respondia 200 e a trilha de auditoria simplesmente não era gravada."*

**Conclusão provada:** o mecanismo implementa uma política de
**disponibilidade acima de durabilidade da trilha** — "falha de log não pode
derrubar operação de negócio" — e essa política é consciente, documentada e já
foi endurecida uma vez.

### 2.2 O que está **PROVADO** — a convenção "log depois do commit" é universal

Varri os **14 arquivos** que combinam `sequelize.transaction()` e `logAction`
e comparei a ordem das linhas em cada handler. **Em 100% dos handlers
transacionais, `logAction` aparece depois de `await t.commit()`** — sem uma
única exceção. Exemplos verificados linha a linha:
`saleController.ts` (`98 → 114 commit → 117 log`;
`145 → 158 → 161`; `189 → 208 → 210`), `purchaseController.ts` (5 handlers),
`rfqController.ts` (4), `productionRouteController.ts` (7),
`accountingEntryController.ts` (4), `comex/importProcessController.ts` (5),
`reconciliationController.ts` (4), `cnabController.ts`, `timeImportController.ts`,
`purchaseRequisitionController.ts`, `inventoryController.ts`,
`productController.ts`, `financialOperationController.ts`, `workCenterController.ts`.
Vários trazem o comentário literal *"Log de auditoria feito após o commit para
não segurar locks de banco."* (ex.: `saleController.ts:116` e `:160`).

**Consequência importante para a caracterização do defeito:** o modo de falha
"log fantasma" — linha de auditoria gravada para uma operação que depois sofreu
rollback — **não existe hoje**. A exposição é **unidirecional**: negócio
commitado, auditoria possivelmente perdida. Isso é bom para entender o risco e
**ruim para a opção de correção transacional**, porque essa opção exige
**inverter** uma convenção respeitada em 14 arquivos.

### 2.3 O que está **PROVADO** — o que falta não é intenção, é durabilidade e
### registro de decisão

A política é defensável. O que **não** existe:

- **Nenhum ADR.** `docs/project-memory/architecture/adrs/` contém apenas
  `0000-template.md`; `audit/templates/ADR_TEMPLATE.md` é template. A decisão
  arquitetural "trilha de auditoria é best-effort" **nunca foi elevada a
  registro de decisão nem a `RISK_ACCEPTED` aprovado pelo dono** — vive só em
  comentário de código. Isto é, em si, a lacuna de governança do caso
  (Regra 17).
- **Nenhum mecanismo de durabilidade fora do processo.** Todas as compensações
  (retry ×1, degradação de vocabulário, arquivo de falha, webhook) rodam
  **dentro do mesmo processo e no mesmo domínio de falha**. Se o processo
  morre, ou o container é recriado, ou o banco cai no instante da escrita, o
  evento some **sem deixar sequer o rastro de que sumiu**.
- **Nenhuma rede de segurança de processo.** `unhandledRejection` e
  `uncaughtException` = **0 ocorrências em toda a árvore TypeScript de
  `server/`** (verificado sobre `server/**/*.ts`, incluindo `index.ts` e
  `app.ts`, que ficam fora de `server/src`).

### `ROOT_CAUSE` (enunciado)

> Uma política deliberada de **disponibilidade acima de durabilidade** — a
> auditoria nunca bloqueia nem quebra a operação de negócio — foi implementada
> **sem nenhum mecanismo de durabilidade que sobreviva ao processo**, sem rede
> de segurança de processo, e **sem registro de decisão que a submetesse ao
> dono**. As compensações existentes reduzem a frequência da perda; nenhuma
> delas garante que a perda seja **detectável**. O `await` ausente nos 268 call
> sites é **consequência** dessa política, não a causa.

### 2.4 O que é **ASSUMIDO** (e o dono pode refutar)

| # | Premissa | Base | Como refutar |
|---|---|---|---|
| A1 | O dono ainda quer disponibilidade acima de durabilidade da trilha | Comentários de código de 2026-07/08; nenhuma aprovação registrada | Decisão do dono (é o item D1 do §9) |
| A2 | Nenhuma classe de evento auditado é **obrigação legal** de registro durável | Não verifiquei norma. O próprio código invoca LGPD art. 37 em `auditActions.ts:136-138` para `read` | Leitura jurídica — **não é minha** (Regra 6) |
| A3 | O caminho de rejeição não-tratada do §3.3 é **alcançável** em produção | O caminho existe por leitura; não enumerei os 268 payloads | Enumerar payloads, ou aceitar como defesa barata |
| A4 | Semântica de volume nomeado do Docker no §4.3 | Comportamento documentado do Docker; **não pude executar nada** para confirmar | Um `docker compose` de homologação, com autorização |

---

## 3. Os 268 call sites: o que **de fato** acontece (medido, não suposto)

### 3.1 A promessa flutua, sem `void`, sem `.catch`, sem `await`

Todos os 268 call sites têm a forma `logAction(req, { … });` como *expression
statement*. A `Promise<void>` retornada é descartada.

### 3.2 No caminho de falha **normal**, NÃO há rejeição não-tratada

Percorri todos os caminhos de `logAction` (`:122-214`) linha a linha:

- As **três** chamadas a `AuditLog.register` (`:178`, `:187`, `:209`) estão
  dentro de `try`.
- As funções chamadas fora de `try` — `resolveAuditAction` (`auditActions.ts:286-297`),
  `downgradeAuditAction` (`:306-309`), `markAuditActionInDescription`
  (`:321-324`), `isUnsupportedAuditActionError` (`:343-353`) — foram lidas por
  inteiro: são puras, operam sobre `Set`/`Record`/string e **não contêm um
  único `throw`**.
- `persistFailureAndAlert` (`:58-90`) protege `fs.mkdirSync`/`appendFileSync`
  (`:69-74`) e `fetch` (`:78-88`) com `try/catch` próprios.

**Portanto: banco fora do ar, ENUM rejeitando, disco cheio — nada disso derruba
o processo. A promessa resolve normalmente e o evento é perdido em silêncio**
(com `console.error` e, se der, uma linha no arquivo de falha). A hipótese
"derruba o processo em alguma versão do Node" **não se confirma para o modo de
falha dominante**. Isso é uma correção relevante à leitura ingênua do finding.

### 3.3 Existe **um** caminho de rejeição — e ele é fatal

`auditLogService.ts:67`:

```
console.error(JSON.stringify(entry));
```

Esta linha está **fora de qualquer `try`** dentro de `persistFailureAndAlert`.
`entry.event = params`, e `params.oldValues`/`params.newValues` recebem, em
dezenas de call sites, conteúdo derivado de `req.body` ou de leituras de model.
Se esse conteúdo não for serializável (referência circular, `BigInt`),
`JSON.stringify` lança **antes** do `try` das linhas 69-74. Como
`persistFailureAndAlert` é **aguardada** de dentro dos `catch` de `logAction`
(`:181`, `:201`, `:211`), o lançamento **sai de `logAction`** e a promessa
flutuante rejeita.

E aí:

- **Não há `process.on('unhandledRejection')` em lugar nenhum** de `server/`
  (0 ocorrências em `server/**/*.ts`; `server/index.ts:68-74` registra apenas
  `SIGTERM` e `SIGINT`).
- A imagem é `node:24-bookworm-slim` (`server/Dockerfile:6,18`). Desde o Node
  15, o modo padrão é `--unhandled-rejections=throw`: a rejeição vira exceção
  não capturada e **o processo termina**. Não há `uncaughtException` também.

**Resultado:** uma falha de gravação de auditoria cujo payload não seja
serializável **mata o container da API**. É estreito (A3 acima: alcançabilidade
não provada — corpos JSON do Express não produzem ciclos nem `BigInt`, e
instâncias do Sequelize definem `toJSON`), mas é o **oposto exato** da política
declarada "auditoria nunca derruba operação de negócio". A política está
violada pelo próprio código que a implementa.

### 3.4 A consequência **maior** do não-aguardar: não há dreno no shutdown

`server/index.ts:17-54`, lido por inteiro:

1. `SIGTERM` → `shutdown()`;
2. `server.close()` — espera as requisições **HTTP** em voo terminarem. Uma
   requisição "termina" quando a resposta é enviada; **a promessa destacada de
   `logAction` não é rastreada por ninguém** e não conta como trabalho em voo;
3. `await sequelize.close()` (`:44`) — fecha o pool **sob** os inserts de
   auditoria ainda pendentes;
4. `process.exit(0)` (`:47`), imediatamente.

**Cadeia provada:** todo `deploy`, `restart` ou `docker compose up --build` tem
uma janela em que operações de negócio **já commitadas** perdem sua linha de
auditoria — e perdem também o *fallback*, porque o processo sai antes de o
`appendFileSync` acontecer. **Perda sem rastro nenhum.** Um timeout de 15 s
(`:26-29`) existe, mas só para forçar saída, não para drenar.

### 3.5 Efeitos secundários mensuráveis do fire-and-forget

- **`fs.appendFileSync` (`:71`) é síncrono.** Sob indisponibilidade do banco,
  *cada* requisição auditada faz uma escrita bloqueante no *event loop*. Não
  derruba, mas multiplica a degradação exatamente quando o sistema já está mal.
- **O retry de 200 ms (`:206`) retém `req`** (e `oldValues`/`newValues`) em
  memória por evento pendente, sem teto e sem fila. Sob apagão de banco, a
  pressão de memória cresce com o tráfego.
- **O insert de auditoria disputa o mesmo pool** (`database.ts:29-34`, `max: 20`
  em produção) das queries de negócio, e **sem transação** — então ele nem
  reaproveita a conexão da operação que o originou.

---

## 4. O *fallback*: estado real

### 4.1 Ele grava? — **Sim, na composição de produção real. Provado por leitura.**

`server/Dockerfile:29-33`: cria grupo/usuário `evok`, faz
`mkdir -p /app/uploads`, `chown -R evok:evok /app`, e então `USER evok`.
`/app/logs` **não existe na imagem**. Em `docker-compose.yml` **não há volume
montado em `/app/logs`** — o único volume do serviço é
`app_uploads:/app/uploads` (bloco `volumes:` do serviço da API; a lista
`volumes:` de topo declara `postgres_data` e `app_uploads`). Portanto
`fs.mkdirSync('/app/logs', { recursive: true })` cria o diretório **dentro de
`/app`, que pertence a `evok`** → gravação bem-sucedida.

### 4.2 Ele persiste? — **Não ao recreate.** Confirma a âncora do finding.

Sem volume, `/app/logs/audit-failures.log` vive na **camada gravável do
container**. Sobrevive a `docker restart` (mesmo container); **morre em
`docker compose up --build`, recreate e troca de imagem** — isto é, morre
exatamente no evento (deploy) que também produz as perdas do §3.4. As duas
falhas se compõem: o deploy perde o evento **e** apaga o registro de que
perdeu.

### 4.3 A composição `prod` tem uma armadilha **pior** — observação nova

`docker-compose.prod.yml:115-120` monta `app_logs_prod:/app/logs`, e `:107`
define `LOG_FILE: ${LOG_FILE:-/app/logs/app.log}`. Mas a imagem **não cria
`/app/logs`**. Quando um volume nomeado é montado num caminho que não existe na
imagem, o Docker cria o ponto de montagem **como `root`**, e não há de onde
herdar dono. O processo roda como `evok` (não-root) → `appendFileSync`
retornaria `EACCES`, capturado em `:72-74`, degradando para `console.error`
apenas. Pelo mesmo motivo, o *transport* de arquivo do Winston
(`server/src/config/logger.ts:55-60`, ativado por `LOG_FILE`) também falharia.

**Marcado como ASSUMIDO (A4)**: é semântica documentada do Docker, mas
`APR-2026-016` me proíbe de executar qualquer coisa para confirmar.
`docker-compose.prod.yml` **não é** a composição de produção real
(`APR-2026-016` aponta `docker-compose.yml`) e este ponto **não faz parte de
`AUD-DB-02`** — registro como **observação para a VeriCore avaliar como
finding próprio**, não como escopo deste caso.

### 4.4 Alguém lê? — **Não. E o alerta não está ligado.**

- `AUDIT_ALERT_WEBHOOK_URL` é **vazio** em `server/.env.example:76` (o finding
  cita `.env.example:76`; o caminho exato é `server/.env.example:76` — anoto
  para o implementador não procurar no arquivo errado).
- Mais grave: **a variável não aparece no bloco `environment:` de
  `docker-compose.yml`**. Ela não é sequer repassada ao container na composição
  de produção real. Não é "vazia por padrão e configurável no `.env`" — é
  **não-conectada**.
- Não há rotação (o arquivo cresce sem limite), não há leitor, não há métrica,
  não há verificação de saúde. `*.log` está em `.gitignore:6`.

**Veredito sobre o *fallback*:** ele **grava** e **é write-only**. É um sumidouro
sem consumidor, apagado no deploy. Corresponde exatamente ao risco enunciado no
despacho — cria a crença de que existe rede de segurança onde não existe.

---

## 5. Blast radius

### `FILES_AFFECTED` por opção

| Escopo | Arquivos | Observação |
|---|---|---|
| Mecanismo (núcleo) | `server/src/services/auditLogService.ts`, `server/src/models/AuditLog.ts` | 2 arquivos, sem colisão (§8) |
| Rede de processo | `server/index.ts` | **território não declarado** — ver D7 |
| Infra do *fallback* | `docker-compose.yml`, `server/Dockerfile` | **infra de produção real** — ver D3 |
| Convenção transacional | 14 controllers com `sequelize.transaction()` | só se a opção transacional for escolhida |
| Todos os call sites | **84** arquivos, **268** call sites | só se a **assinatura** mudar de forma incompatível |
| Testes | `server/tests/unit/audit-log-*.test.ts` (3), `audit-coverage-guard.test.ts`, `tests/integration/traceability-and-audit-log-regression.test.ts` | e os 2 testes novos do CASE-004 (§7) |

### Existe caminho que corrija o mecanismo **sem** tocar os 268? — **Sim.**

Três fatos tornam isso possível, e o implementador deve conhecê-los:

1. **Todos os 268 têm a mesma forma de dois argumentos** `logAction(req, {…})`.
   Um **terceiro parâmetro opcional** (ou um campo opcional em
   `LogActionParams`) é **retrocompatível**: diff zero nos 268.
2. **Durabilidade é interna.** Fila, *outbox*, dreno, contador de falhas,
   detecção de perda — tudo isso cabe dentro de `logAction`/`register` e é
   invisível ao chamador.
3. **A rede de processo é um arquivo.** `unhandledRejection`/`uncaughtException`
   + rastreio das promessas pendentes + dreno no `shutdown` vivem em
   `server/index.ts` (+ um registro exportado pelo serviço).

O que **não** se consegue sem tocar call sites: **fazer a falha de auditoria
abortar a operação de negócio**. Isso exige `await` + tratamento de erro no call
site **e** mover a chamada para **antes** do `commit`, invertendo a convenção
documentada em 14 arquivos (§2.2).

### `REGRESSION_RISK` por opção

| Opção (§6) | Risco de regressão | Natureza do risco |
|---|---|---|
| C (endurecimento) | **Baixo** | Muda observabilidade e ciclo de vida, não semântica de negócio. Risco real: dreno no shutdown atrasando o encerramento (mitigável com teto dentro dos 15 s de `index.ts:26`) |
| B (fila durável) | **Médio** | Duplicidade de evento no dreno; crescimento do sumidouro; exige volume novo em produção |
| A (transacional/outbox) | **Alto** | Inverte a política. Falha de auditoria passa a derrubar venda/movimento/folha. **Depende de `AUD-DB-04` e da migration `20260810-000036`** (§7.3) |
| D (híbrida por classe) | **Médio-alto** | Todo o risco de A, restrito a uma lista — mas a lista é decisão de negócio |

---

## 6. O trade-off central — enunciado, **não decidido** (Regra 6)

### 6.1 As duas perdas, ditas com precisão

**Hoje (best-effort).** A operação de negócio sempre vence. O sistema pode
concluir uma venda, um movimento de estoque, uma alteração de permissão ou uma
importação de ponto **sem deixar registro de quem fez, quando e de onde** — e,
nas janelas do §3.4, **sem nem registrar que o registro se perdeu**. Precedente
medido no próprio projeto: 327 itens criados em produção real deixaram
`audit_logs` com **2 linhas** (`audit-coverage-guard.test.ts`, JSDoc `:5-18`).

**Transacional.** O registro e o fato de negócio vivem ou morrem juntos.
Consequência: **uma falha do `audit_logs` vira uma venda que não fecha, um
movimento de estoque que não grava, uma folha que não importa.** Troca-se
"perde-se o registro" por "perde-se o movimento".

### 6.2 Por que "só tornar transacional" quebraria produção **hoje**

Não é hipótese, é o estado atual do repositório: a migration
`20260810-000036-extend-audit-log-action-enum.cjs` **está pendente**
(`auditActions.ts:48-55`) e por isso 9 valores canônicos — `access_denied`,
`read`, `read_sensitive`, `permission_change`, `cancel`, `close`, `post`,
`reverse`, `settle` — são **rejeitados pelo Postgres com `22P02`** e hoje só
gravam graças à degradação de `:176-204`. Sob desenho transacional ingênuo,
**cada negativa de acesso, cada contabilização, cada liquidação abortaria a
própria operação** até a migration ser aplicada.

Some-se `AUD-DB-04` (MEDIUM, **aberto**): `audit_logs.entity_id` é `integer` e
as PKs de `Item`, `ItemCategoria`, `ItemEstrutura`, `MrpOrdemPlanejada` são
`UUID`; `Number('<uuid>')` = `NaN` → `22P02`. Sob desenho transacional, **um
insert de auditoria já sabidamente quebrado derrubaria a operação de negócio do
cadastro mestre industrial.** Isto transforma `AUD-DB-04`, hoje MEDIUM e aberto,
em **dependência bloqueante** de qualquer opção transacional.

### 6.3 Opções, com custo — apresentadas, não escolhidas

**Opção A — *Outbox* transacional.**
A linha de auditoria é gravada na **mesma transação** do fato de negócio, numa
tabela *outbox* tolerante (`action` como `text`, sem `ENUM`, sem FK, `entity_id`
como `text`), e um dreno assíncrono a materializa em `audit_logs`.
*Ganho:* atomicidade na direção certa — fato commitado ⇒ evento existe; rollback
⇒ nenhum evento fantasma.
*Custo:* parâmetro `transaction` novo (retrocompatível, mas os **14** arquivos
transacionais precisam passá-lo **e** mover a chamada para antes do commit,
invertendo a convenção do §2.2); tabela + migration novas; dreno novo com
supressão de duplicata; tempo de lock maior — exatamente o que
`auditLogService.ts:114-116` procurou evitar. *Depende de D6.*

**Opção B — Fila durável *write-ahead*.**
Persistir o evento num sumidouro append-only durável **antes** de responder, e
drenar para `audit_logs` depois.
*Ganho:* mantém disponibilidade em primeiro lugar; elimina a perda por queda do
banco e por deploy.
*Custo:* exige volume real em `docker-compose.yml` (D3), dreno, rotação,
supressão de duplicata. **Não** dá atomicidade: uma queda entre o `commit` e o
enfileiramento ainda perde.

**Opção C — Endurecimento sem mudança de semântica.**
(1) Rastrear as promessas pendentes e **drená-las no `shutdown`**, dentro do
teto de 15 s; (2) `unhandledRejection`/`uncaughtException` no processo, para que
uma falha de auditoria **nunca** possa matar a API (fecha o §3.3); (3) fechar o
`try` que falta em `persistFailureAndAlert:67`; (4) dar volume ao `/app/logs` e
criá-lo na imagem com dono `evok`, para o *fallback* de fato persistir;
(5) repassar `AUDIT_ALERT_WEBHOOK_URL` na composição e expor um **contador de
falhas de auditoria** consultável, para que a perda seja **detectável**.
*Ganho:* elimina as perdas sem rastro, torna a perda visível, custo mínimo.
*Custo:* **não** torna a trilha transacional. Continua sendo possível concluir
negócio sem registro — só que agora isso é **detectado**, não silencioso.
*Blast radius:* 2-4 arquivos, **nenhum controller**, **zero dos 268**.

**Opção D — Híbrida por classe de criticidade.**
Transacional/outbox só para uma lista declarada de ações (candidatos naturais:
`access_denied`, `permission_change`, `salary_change`, `post`, `reverse`,
`settle`, `soft_delete` de cadastro mestre), best-effort para o resto.
*Custo:* todo o custo de A restrito a uma lista — **e a lista é decisão de
negócio, não minha** (Regra 6).

### 6.4 O que eu **não** decido

Qual perda o negócio prefere; se alguma classe é obrigação legal; se a política
best-effort segue valendo. **Devolvo ao dono no §9.** O que eu afirmo
tecnicamente é apenas isto: **a opção C é ortogonal a todas as outras e não
compete com nenhuma** — qualquer que seja a decisão de negócio, drenar no
shutdown, não morrer por causa de um log e ter um *fallback* que persiste são
melhorias que a decisão do dono não pode tornar erradas.

---

## 7. Interação com `CASE-004` (`AUD-ALOG-01`), em RETESTE — resposta explícita

### 7.1 O que o CASE-004 instalou (lido na branch `sana/ERP-LEGACY-001/CASE-004`)

Chamadas `logAction(req, {…})` **fire-and-forget, depois do use case**, em
`itemController.inactivate` e em `employeeController`, mais dois testes novos.
O JSDoc do próprio CASE-004 declara: *"Nota de nao-atomicidade: a pre-leitura e
a escrita nao sao atomicas — o mesmo comportamento de todo o padrao de
auditoria ja existente no repositorio."*

### 7.2 Resposta

- **Opções B, C, D-parcial: INDIFERENTE.** As chamadas do CASE-004 são idênticas
  em forma aos outros 268; melhorias internas ao mecanismo as beneficiam sem
  tocá-las.
- **Opção A (assinatura/contrato mudam): RETRABALHO.** Os 2 call sites novos
  entram na conta dos que precisam migrar — e, mais importante, o **raciocínio
  escrito** do CASE-004 depende do contrato atual. O JSDoc de
  `itemController.ts` justifica a truncagem de `entityDescription` com a frase
  *"Como `logAction` nunca propaga erro ao chamador, o efeito seria exatamente o
  modo de falha que este caso combate: HTTP 200 ao usuário e NENHUMA linha na
  trilha."* Se `logAction` passar a propagar, **essa frase vira mentira
  versionada** e a documentação do CASE-004 precisa ser corrigida no mesmo lote.
- **Os testes do CASE-004 NÃO quebram, em nenhuma opção.**
  `items-soft-delete-audit-trail.test.ts:61` faz
  `jest.mock('../../src/services/auditLogService', …)` — o serviço inteiro é
  substituído e os testes afirmam `expect(mockLogAction).toHaveBeenCalledTimes(1)`
  e o conteúdo dos `params`. São **imunes** a qualquer mudança do mecanismo.
  (E são, literalmente, o anti-critério do §8.1 — ver lá.)

### 7.3 Dependência que **corre no sentido inverso** e precisa de decisão

`AUD-DB-04`/`OR-21` (`entityId: undefined` para entidade `UUID`, contorno
declarado, `APR-2026-034` D1) foi desenhado **contando com** o best-effort: o
contorno existe porque um `22P02` ali "só" perde a linha. **Sob opção A ou D,
esse mesmo `22P02` derrubaria a inativação do item.** Logo: **`AUD-DB-04`
(MEDIUM, aberto) e a migration `20260810-000036` (pendente) tornam-se
pré-requisitos de qualquer opção transacional.** Uma remediação MEDIUM
bloqueando uma HIGH é uma inversão de fila que **o director precisa decidir**,
não eu (D6).

### 7.4 Ordenação

Se a decisão for A ou D, recomendo tecnicamente que a mudança de contrato entre
**depois** de `CASE-004` fechar em reteste — não por conflito de merge (não há,
§8), mas porque mudar o contrato sob um caso em reteste invalida a base do
reteste (Regras 12-14). **Sequenciamento é do director** (D5).

---

## 8. Colisões — verificado por conta própria

**Confirmo a verificação do director: nenhuma branch ativa toca
`auditLogService.ts` nem `AuditLog.ts`.** Método e ressalvas:

- Varri **todas** as branches locais e remotas com
  `git diff --name-only main..<branch> -- <os 2 arquivos>`. Duas acusaram
  diferença; **nenhuma é colisão**:
  - `remediation/production-readiness` (e seu remoto): `git merge-base
    --is-ancestor` = **SIM**, `git rev-list --count main..` = **0**. Está
    **totalmente mesclada** em `main`; a diferença é `main` estar à frente.
  - `origin/backup-fase7-github`: 29 commits à frente, mas **último commit em
    2026-07-30** — branch de backup abandonada, anterior a todo o trabalho
    atual, não pertence a caso nenhum. **Não trabalhar nela.**
- **Nenhuma** das 6 worktrees `sana/` (CASE-003 a 007, FIND-ERP-005) tem
  alteração pendente nos dois arquivos: `git status --short` retornou vazio em
  todas.
- Territórios a **não** invadir, confirmados: `server/package.json`
  (CASE-003/004/006 já o alteram — o diff do CASE-004 o mostra),
  `server/src/config/runtimeEnv.ts` (CASE-005, aberto), `server/app.ts`
  (CASE-007, rate limiting).
- **Não declarados por nenhum caso, e necessários por algumas opções:**
  `server/index.ts` e `docker-compose.yml`. **Confirmar com o director antes de
  editar** (D7) — `docker-compose.yml` é infraestrutura de produção real.

---

## 9. Critério de reteste — e o **anti-critério**, declarado primeiro

### 9.1 ANTI-CRITÉRIO — o que **não** prova nada

1. **"`logAction` foi chamado".** Com `jest.mock` do serviço, esse teste passa
   **idêntico** no `AUDIT_COMMIT` e depois de qualquer correção. Exemplos reais
   já no repositório, para o implementador não repetir o padrão como se fosse
   prova deste caso: `items-soft-delete-audit-trail.test.ts` e
   `employees-soft-delete-audit-trail.test.ts` (CASE-004). São ótimos testes
   **para o CASE-004**; para o CASE-008 são vácuo.
2. **"o arquivo `logs/audit-failures.log` foi escrito".** Já é afirmado por
   `server/tests/unit/audit-log-failure-alerting.test.ts:79` e **já passa no
   `AUDIT_COMMIT`**. Não distingue estado nenhum.
3. **"o retry aconteceu 2×"**. Idem — `:78`, já verde hoje.
4. **Cobertura de módulos** (`audit-coverage-guard.test.ts`). Mede se o módulo
   *chama*; este caso é sobre o registro **sobreviver**.

> O defeito **não é** *se* a função é chamada. É se o registro **sobrevive** a
> falha, a shutdown e a concorrência.

### 9.2 Testes que precisam ficar **VERMELHOS** no `AUDIT_COMMIT`

| ID | Afirmação | Por que REPROVA hoje |
|---|---|---|
| **T1 — Dreno no encerramento** | Com `AuditLog.register` mockado para resolver com atraso, disparar a rotina de shutdown e afirmar que os eventos pendentes são gravados (ou registrados como perdidos) **antes** do encerramento | Hoje não existe registro algum de promessas pendentes; `index.ts:44-47` fecha o pool e chama `process.exit(0)` sem consultar nada |
| **T2 — Perda nunca é silenciosa** | Fazer `register` rejeitar duas vezes **e** o sumidouro de arquivo falhar; afirmar que a perda é exposta por um canal consultável (contador/estado de saúde), não só `console.error` | Hoje o único canal é `console.error` (`:67`, `:73`) e um webhook não-conectado |
| **T3 — Auditoria não mata o processo** | Payload de falha não-serializável; afirmar que `logAction` **resolve** e não gera rejeição não-tratada | Hoje `:67` está fora do `try` → a promessa rejeita → sem `unhandledRejection`, Node 24 encerra o processo. Teste determinístico e **sem banco** |
| **T4 — Transação é propagável (estrutural)** | Com uma `transaction` falsa passada a `logAction`, afirmar que ela chega como **segundo argumento** de `AuditLog.create` | Hoje `AuditLog.ts:148` chama `create` com **um único argumento**; o teste falha por construção. **Só aplicável se a decisão for A ou D** |
| **T5 — O *fallback* persiste (estático)** | Ler `docker-compose.yml` e `server/Dockerfile` e afirmar que o caminho do *fallback* tem volume declarado **e** que o diretório é criado na imagem com o usuário de runtime como dono | Hoje o único volume é `app_uploads`; `/app/logs` não existe na imagem. Estilo já praticado por `audit-coverage-guard.test.ts` (teste que lê arquivos-fonte) |
| **T6 — Alerta conectado (estático)** | Afirmar que `AUDIT_ALERT_WEBHOOK_URL` é repassada ao container na composição de produção | Hoje a variável **não consta** do bloco `environment:` de `docker-compose.yml` |

T1, T2 e T3 são exigíveis em **qualquer** opção. T4 só sob A/D. T5/T6 dependem
de D3/D4 (autorização para tocar infraestrutura).

### 9.3 Restrições de segurança **obrigatórias** para quem implementar (Codex)

> **Leia isto antes de escrever a primeira linha de teste.**

1. **`server/tests/setup.ts` define apenas `NODE_ENV`** (arquivo tem 5 linhas).
   `DB_NAME` cai no default de `server/src/config/runtimeEnv.ts:38`:
   `z.string().min(1).default('erp_evok_audio')` — **o mesmo nome do banco de
   produção** em `docker-compose.yml`. Armadilha herdada do CASE-007,
   **confirmada aqui**.
2. **`AuditLog` é model.** `server/src/models/AuditLog.ts:20` importa
   `../config/database`, que executa `new Sequelize(getConfig())` no
   carregamento do módulo (`database.ts:53`). A construção não abre socket —
   **mas qualquer query abre**, contra `erp_evok_audio`.
   `auditLogService.ts:14` faz `require('../models/AuditLog')`, então **importar
   o serviço arrasta o model**.
3. **Portanto: todo teste deste caso DEVE mockar o model.** O padrão correto já
   existe no repositório, em `server/tests/unit/audit-log-failure-alerting.test.ts:6-8`:
   `jest.mock('../../src/models/AuditLog', () => ({ register: jest.fn() }))`,
   com `jest.resetModules()` + `require` tardio do serviço (`:15`, `:49`).
   **Nunca deixe um `create()` real rodar.** `APR-2026-016`.
4. **Não tocar** `server/package.json` (CASE-003/004/006),
   `server/src/config/runtimeEnv.ts` (CASE-005), `server/app.ts` (CASE-007).
5. **Não escrever** em `audit/`, `coretriad/`, `.claude/`.
6. **Não declarar** `FINDING CLOSED`, `RETEST_PASSED` nem
   `REMEDIATION_COMPLETE` (Regras 3 e 4).

---

## 10. Campos formais da triagem

- **`ROOT_CAUSE`** — §2.3. Política deliberada de disponibilidade acima de
  durabilidade, implementada sem mecanismo de durabilidade que sobreviva ao
  processo, sem rede de segurança de processo e sem registro de decisão. O
  `await` ausente é consequência, não causa.
- **`LOCAL_FIX`** — fechar o `try` faltante em `auditLogService.ts:67` (§3.3).
  Corrige **um** modo de falha (o único que derruba o processo) e **não** fecha
  o finding.
- **`SYSTEMIC_FIX_REQUIRED`** — **Sim.** Nenhuma correção pontual resolve. O
  mínimo defensável é a **Opção C**; ir além (A/B/D) **exige decisão de
  negócio** (§9 abaixo). A opção C **não depende** dessa decisão e não a
  antecipa.
- **`BLAST_RADIUS`** — §5. Mecanismo: 2 arquivos. Rede de processo: +1.
  Infra: +2. Convenção transacional: +14 controllers. Assinatura incompatível:
  **268 call sites em 84 arquivos** — evitável (§5).
- **`FILES_AFFECTED`** — tabela do §5.
- **`REGRESSION_RISK`** — tabela do §5, por opção. Baixo em C; alto em A.

---

## 11. Divergências registradas contra o texto do finding (Regra 21)

Nenhuma altera a direção nem a severidade (Regra 18); todas afetam a execução.

1. **"362/362 call sites"** → não reproduzível por método nenhum. O número é
   **268** call sites em **84** arquivos `.ts` (§1.5). A razão de call sites
   aguardados permanece **0**.
2. **A varredura `await auditLogService\.logAction`** é vazia por construção:
   `auditLogService.logAction(` tem 0 ocorrências em qualquer forma (§1.4). A
   conclusão sobrevive pelo outro ramo.
3. **`.env.example:76`** → o caminho é **`server/.env.example:76`**. E o achado
   é mais forte do que o registrado: a variável **não é repassada** no
   `docker-compose.yml` (§4.4).
4. **"não-transacional"** é preciso, e eu o testei contra a hipótese que o
   derrubaria (CLS): **não há CLS** (§1.3).
5. **Acréscimo:** o *fallback* **grava** na composição de produção real (o
   `chown -R evok:evok /app` do Dockerfile garante), o que o finding não
   afirma; o defeito é **persistência e ausência de consumidor**, não
   permissão (§4.1-4.4).
6. **Acréscimo material:** a perda **sem rastro nenhum** na janela de
   shutdown/deploy (§3.4) não consta do finding e é, na minha leitura, o modo
   de falha mais provável em operação normal — mais provável que a queda do
   banco.
7. **Observação fora de escopo, para a VeriCore:** `docker-compose.prod.yml`
   monta `app_logs_prod:/app/logs` sobre um diretório que a imagem não cria e
   roda como não-root (§4.3). Candidato a finding próprio; **não remediado
   aqui**.

---

## 12. O que devolvo para decisão humana (Regra 6, Regra 18)

| # | Decisão | Por que não é minha |
|---|---|---|
| **D1** | Qual perda o negócio prefere: **perder o registro** (hoje) ou **perder a operação** (transacional)? Resposta pode ser **por classe de evento** | Regra de negócio. Nenhum artefato versionado a define |
| **D2** | Alguma classe de evento é **obrigação legal** de registro durável? O código invoca LGPD art. 37 para `read`/`read_sensitive` (`auditActions.ts:136-138`) e há contexto fiscal (Bloco K) no projeto | Leitura jurídica. Agente não infere norma |
| **D3** | Autorizar (ou não) alterar **`docker-compose.yml`** e **`server/Dockerfile`** para dar volume persistente e dono correto ao caminho do *fallback* | Infraestrutura de produção real |
| **D4** | Autorizar (ou não) conectar `AUDIT_ALERT_WEBHOOK_URL`, e para qual destino (**nenhum segredo entra no repositório**) | Decisão de operação + segredo |
| **D5** | Sequenciamento em relação ao **CASE-004** (em reteste): antes ou depois do fechamento? | Director |
| **D6** | Se D1 escolher A ou D: aceitar que **`AUD-DB-04` (MEDIUM, aberto)** e a migration **`20260810-000036` (pendente)** viram **bloqueantes** desta HIGH — e que aplicar migration em produção é ato do dono, não de agente | Inversão de fila + ato em produção |
| **D7** | **`server/index.ts`** e **`docker-compose.yml`** estão no escopo do CASE-008? Nenhum caso os declarou | Ownership de território |

**Recomendação técnica que não invade D1:** a **Opção C** é ortogonal a todas
as demais e não pode ser invalidada por nenhuma resposta a D1 — qualquer que
seja a política escolhida, drenar no encerramento, impedir que um log derrube a
API e ter um *fallback* que persista são melhorias válidas. Se o dono quiser
avançar sem esperar D1/D2, **C é o lote seguro**. Isto é recomendação de
sequenciamento técnico, **não** uma escolha de política — a política continua
inteira com o dono.

---

## 13. Critério de conclusão da triagem — autoavaliação

| Critério | Estado |
|---|---|
| Causa-raiz **demonstrada**, não hipótese | **Sim** — 4 artefatos versionados independentes provam a intenção deliberada (§2.1); a hipótese que a derrubaria (CLS) foi testada e refutada (§1.3) |
| Blast radius mapeado | **Sim** — §5, com números medidos e caminho que evita os 268 |
| Plano de correção com risco de regressão avaliado | **Sim** — 4 opções com custo e risco (§6.3, §5) |
| Trade-off de negócio devolvido, não decidido | **Sim** — §6, §12 |
| PROVADO × ASSUMIDO separados | **Sim** — §2.1/§2.4, §4.3, e marcação em cada afirmação de risco |
| Critério **e** anti-critério de reteste | **Sim** — §9.1 e §9.2 |
| Coordenação com CASE-004 respondida | **Sim** — §7, incluindo a dependência inversa via `AUD-DB-04` |
| Colisões verificadas por conta própria | **Sim** — §8 |
| Regra permanente de dado real cumprida | **Sim** — cabeçalho; nenhuma conexão aberta |

**Estado do caso:** `TRIAGED — AGUARDANDO DECISÃO HUMANA (D1-D7)`.
Nada implementado. Nenhum worktree, nenhuma branch, nenhum arquivo de código.
Despacho ao `sanacore-remediation-engineer` (Codex, `APR-2026-051`) fica
condicionado à decisão do dono sobre **D1** — sem ela, apenas a **Opção C** é
executável sem inventar regra de negócio.
