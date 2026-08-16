# REMEDIATION_EVIDENCE_PACKAGE (SanaCore → VeriCore)

Formato base: `coretriad/contracts/REMEDIATION_EVIDENCE_PACKAGE.md`.
Caso: `coretriad/handoffs/ERP-LEGACY-001/REMEDIATION_CASE-ERP-LEGACY-001-CASE-003.md`.

CASE_ID: `ERP-LEGACY-001-CASE-003`
FINDING_ID: **N/A.** Este caso não referencia nenhum `FIND-*` nem
`AUD-PROC-CUSTODIA-01`. Objeto: um vetor da classe de risco `RC-PROC-01`
(`coretriad/governance/RISK_CLASS-RC-PROC-01_CONTENCAO_POR_DISCIPLINA.md`).
Ver §0 abaixo — a distinção é deliberada, não uma omissão.
PROJECT_ID: `ERP-LEGACY-001`
AUTORIZAÇÃO: `APR-2026-025` (`coretriad/governance/APPROVALS.md:972-998`)
REMEDIATION_COMMIT: `d4c166e9c57f473df11b9f5244736c46316dc807`
BRANCH: `sana/ERP-LEGACY-001/CASE-003`
WORKTREE: `C:\Sistema EvokAudio\ERP-Evok-sana-CASE-003`
STATUS DESTE PACOTE: evidência de implementação — **não** é reteste, **não**
declara `RETEST_PASSED`/`FINDING CLOSED`/fechamento de `CE-*` (Regras 3/4).

---

## 0. Vínculo e não-vínculo (repetido do caso, para o reteste não presumir errado)

- **NÃO** fecha `AUD-PROC-CUSTODIA-01` (finding HIGH, CONFIRMED, incidente
  pontual de custódia com vetor próprio — `docker exec … psql`).
- **NÃO** declara nenhum critério `CE-01`…`CE-09` de `RC-PROC-01` cumprido.
  A classe de risco continua com o estado que tinha antes deste pacote; sua
  evolução é decisão do dono sobre evidência VeriCore, não deste documento.
- **VINCULA-SE** a `RC-PROC-01` como correção de **um vetor**: os dois
  scripts destrutivos citados pelo caso, e só eles.
- Não há finding a fechar. A `REMEDIATION_RESPONSE` (arquivo separado,
  `REMEDIATION_RESPONSE.md` neste mesmo diretório) documenta a resposta ao
  `REMEDIATION_CASE`, no lugar de resposta a um `FIND-*`, porque o caso não
  tem finding próprio (ver §4 do caso).

---

## 1. ROOT_CAUSE

**Causa-raiz (idêntica nos dois scripts, já demonstrada pelo próprio caso —
não redemonstrada aqui, apenas herdada):** os dois scripts destrutivos liam
`process.env.DB_NAME` cru e o entregavam à conexão `Sequelize` sem checar se
o valor correspondia a um banco descartável. A única barreira existente
(`NODE_ENV === 'production'`) não cobre o vetor real, porque
`server/.env.example` combina `NODE_ENV=development` com
`DB_NAME=erp_evok_audio` (o banco REAL) como configuração normal de dev
local — este projeto não tem banco de dev separado do real. Consequência:
uma estação de trabalho de desenvolvedor, ou um agente automatizado, com
`.env` padrão, apagava dado real de produção ao rodar `--confirmar`
(`limpar-dados-transacionais.cjs`) ou `--limpar`
(`seed-usuarios-departamentos.cjs`) sem que nenhuma guarda disparasse.

**Agravante próprio de `seed-usuarios-departamentos.cjs`:** o default
`process.env.DB_NAME || 'erp_evok_audio'` fazia o script apontar para o
banco real **por omissão** — sem `DB_NAME` no ambiente, ele conectava lá de
qualquer forma, o que era ainda menos coberto do que
`limpar-dados-transacionais.cjs` (que falhava sem `DB_NAME`, por não ter
default).

## 2. LOCAL_FIX

Réplica do padrão já existente e funcional em
`server/scripts/run-api-suite.cjs:530-536` (guarda de sufixo `_test`/`_ci`),
com uma função nova `assertBancoDescartavel(dbName)` em cada um dos dois
scripts:

```js
function assertBancoDescartavel(dbName) {
  if (!/(_test|_ci)$/i.test(dbName || '')) {
    console.error(`RECUSADO: DB_NAME="${dbName}" nao tem sufixo "_test" ou "_ci" ...`);
    process.exit(1);
  }
}
```

- **`limpar-dados-transacionais.cjs`** — a chamada
  `assertBancoDescartavel(process.env.DB_NAME)` foi inserida em `:229`,
  **depois** da checagem de `NODE_ENV` (`:224-226`) e **antes** de
  `new Sequelize(...)` (`:233`) — confirmado por leitura direta do arquivo no
  `REMEDIATION_COMMIT` (ver §5, verificação de ordem).
- **`seed-usuarios-departamentos.cjs`** — foi criada também uma função
  `resolveDbName()` (`:324`) que centraliza o default
  `process.env.DB_NAME || 'erp_evok_audio'`, hoje usado tanto pela guarda
  quanto pela conexão (`connect()`, `:360-361`). A guarda é chamada como
  `assertBancoDescartavel(resolveDbName())` em `:510`, **depois** da
  checagem de `NODE_ENV` (`:505-507`) e **antes** de `connect()`. Isto é o
  que fecha o agravante: a guarda avalia o **mesmo valor resolvido** que a
  conexão de fato usaria, incluindo o default para o banco real — não
  `process.env.DB_NAME` cru, que poderia estar `undefined` e escapar do
  regex por caminho diferente do de conexão.
- **Fail-closed sem escape, por decisão explícita e mais recente do dono**
  (§3 do caso, `I-2` prevalece sobre `I-1`): não há flag, variável de
  ambiente ou argumento de linha de comando que contorne a guarda. Isto foi
  verificado por leitura — nenhum dos dois arquivos ganhou qualquer
  identificador com semântica de bypass (`--forçar`, `--eu-sei-o-que-estou-fazendo`,
  `SKIP_*`, `FORCE_*` ou equivalente).
- **Notas de cabeçalho atualizadas** nos dois arquivos, substituindo o texto
  que descrevia o gap como residual não corrigido (que citava
  `run-api-suite.cjs:530-536` como padrão ausente) por texto que descreve a
  guarda implementada, cita `CASE-003`/`APR-2026-025` e mantém a referência a
  `CE-03` de `RC-PROC-01` como o residual que motivou a correção — sem
  declarar `CE-03` cumprido (essa declaração não é autoridade da SanaCore).

## 3. SYSTEMIC_FIX_REQUIRED

**Sim, registrado no próprio caso, fora de escopo desta remediação:**
`server/.env.example` continua trazendo `NODE_ENV=development` +
`DB_NAME=erp_evok_audio` (o banco real) como configuração padrão de dev
local — porque este projeto não tem banco de dev separado do real. A guarda
implementada aqui contém o vetor por disciplina de nomeação (`_test`/`_ci`),
não elimina a causa estrutural (ausência de banco de dev isolado). O caso
(`§7`) explicitamente exclui alterar `.env.example`/`docker-compose.yml` ou
criar banco de dev separado deste escopo — é decisão aberta do dono. Este
pacote não amplia essa exclusão.

## 4. BLAST_RADIUS

**Escopo cumprido exatamente como autorizado — nenhuma ampliação:**
- Dentro: os dois arquivos nomeados pelo caso, mais suas notas de cabeçalho.
- Fora, verificado por `git show --stat d4c166e`: nenhum outro arquivo foi
  tocado. Nenhum outro script de `server/scripts/` foi alterado.
- O caso instrui explicitamente a SanaCore a **listar, não corrigir**, outros
  scripts destrutivos com o mesmo gap, se encontrados. Não houve busca
  adicional por outros scripts nesta fase de empacotamento de evidência —
  isso seria trabalho de triagem/engenharia, não de empacotamento. Se a
  varredura não foi feita antes, é uma lacuna a registrar para o Control
  Plane, não algo que este pacote deveria produzir agora.

## 5. CORRECTION_STRATEGY e verificação de ordem (leitura própria, independente do relato do implementador)

Verificação direta do `REMEDIATION_COMMIT` feita para este pacote (não
herdada do relato do agente de implementação):

```
$ grep -n "assertBancoDescartavel\|new Sequelize\|DELETE FROM\|process.exit\|NODE_ENV ===" \
    server/scripts/limpar-dados-transacionais.cjs
161:function assertBancoDescartavel(dbName) {
169:    process.exit(1);
224:  if (process.env.NODE_ENV === 'production') {
226:    process.exit(1);
229:  assertBancoDescartavel(process.env.DB_NAME);
233:  const sequelize = new Sequelize(
296:      await sequelize.query(`DELETE FROM "${tabela}"`, { transaction });
299:      await sequelize.query(`DELETE FROM "${tabela}" WHERE ${onde}`, { transaction });
```

```
$ grep -n "assertBancoDescartavel\|new Sequelize\|DELETE FROM\|process.exit\|NODE_ENV ===\|resolveDbName" \
    server/scripts/seed-usuarios-departamentos.cjs
324:function resolveDbName() {
342:function assertBancoDescartavel(dbName) {
350:    process.exit(1);
360:  return new Sequelize(
361:    resolveDbName(),
386:      `DELETE FROM users WHERE email LIKE :pattern RETURNING id, email`,
392:      `DELETE FROM access_profile_permissions ...`,
400:      `DELETE FROM access_profiles WHERE nome IN (:perfis) RETURNING id, nome`,
448:        `DELETE FROM access_profile_permissions WHERE access_profile_id = :id`,
505:  if (process.env.NODE_ENV === 'production') {
507:    process.exit(1);
510:  assertBancoDescartavel(resolveDbName());
517:    console.log(`Banco: ${resolveDbName()} @ ${process.env.DB_HOST || 'localhost'}\n`);
```

**Conclusão da verificação por leitura estática:** em ambos os arquivos, a
chamada à guarda antecede a instanciação de `Sequelize` e todos os `DELETE`
localizados no arquivo. Não há caminho de código, no texto lido, que alcance
`new Sequelize(...)` ou qualquer `DELETE FROM` sem primeiro passar por
`assertBancoDescartavel`. Esta é uma verificação de **fluxo estático de um
único arquivo linear** (não há branch condicional que salte a chamada da
guarda em `main()` de nenhum dos dois scripts) — não é execução, não é prova
dinâmica, e não substitui o que a VeriCore fará em `RT-CASE003-04`.

## FILES_CHANGED

| Arquivo | Mudança |
|---|---|
| `server/scripts/limpar-dados-transacionais.cjs` | +25/-6 linhas — guarda `assertBancoDescartavel`, chamada antes do `Sequelize`, nota de cabeçalho atualizada |
| `server/scripts/seed-usuarios-departamentos.cjs` | +55/-15 linhas — `resolveDbName()`, guarda `assertBancoDescartavel`, chamada antes do `connect()`, `console.log` do banco também usa o valor resolvido, nota de cabeçalho atualizada |

(números de `git show --stat d4c166e`: `53 ++++++++++++++-----` /
`70 ++++++++++++++++++++++++++++++++----`.)

## TESTS_ADDED

**Nenhum teste automatizado foi adicionado ao repositório versionado.**
Nenhum arquivo de teste (`*.test.*`, `*.spec.*`) aparece no diff do
`REMEDIATION_COMMIT` nem em `git status` do worktree de remediação.

O que existe, segundo o relato do agente de implementação que precede este
pacote (`sanacore-remediation-engineer`), é uma verificação **não
persistida**: extração isolada do corpo da função `assertBancoDescartavel`
via `new Function` (explicitamente **não** via `require()` do módulo
inteiro, para não executar `main()` nem abrir conexão), exercitada contra 13
casos, incluindo o caso do agravante do seed (`DB_NAME` ausente resolvendo
para o default do banco real, e a guarda ainda recusando). O relato afirma
que os 13 casos passaram.

**Esta seção NÃO repassa essa prova como se fosse evidência própria deste
pacote.** Ver §6 (avaliação de suficiência) — é decisão explícita deste
empacotamento que essa prova é insumo, não achado independente.

## TESTS_CHANGED

N/A. Não existe suíte de teste versionada cobrindo estes dois scripts hoje
(nenhum `*.test.*` referencia `limpar-dados-transacionais` ou
`seed-usuarios-departamentos` — não verificado exaustivamente por este
pacote, mas nenhum apareceu nas buscas feitas).

## TEST_RESULTS

- **Testes automatizados executados por este agente de evidência: nenhum.**
  Regra 16 do `CLAUDE.md` (o hook também bloqueia): esta carta não executa
  suíte de teste, não roda script de diagnóstico, não abre conexão de banco
  — nem de teste, nem real (`APR-2026-016`, reforçado no cabeçalho desta
  carta).
- **Resultado relatado pelo implementador (não reproduzido por este
  pacote):** 13/13 casos passaram na verificação isolada da função.
- **Nenhuma execução ponta-a-ponta dos scripts ocorreu em nenhum momento
  desta remediação** — nem pelo implementador, nem por este empacotamento.
  Nenhuma conexão real de banco (de teste ou de produção) foi aberta.

## REGRESSION_ANALYSIS

- **Caminho legítimo (`DB_NAME` com sufixo `_test`/`_ci`):** por leitura do
  regex `/(_test|_ci)$/i`, qualquer `DB_NAME` terminado nesses sufixos
  (case-insensitive) casa e a guarda deixa o fluxo seguir sem alteração de
  comportamento anterior. Não identificado, por leitura, nenhum caminho de
  código que dependesse de `DB_NAME` **sem** esse sufixo para funcionar
  legitimamente — os dois scripts já eram documentados como destinados a
  banco de teste/CI.
- **Risco de regressão não avaliado por este pacote:** se existir hoje
  algum uso legítimo, fora do que os dois scripts documentam, que dependa de
  rodar contra um `DB_NAME` sem sufixo `_test`/`_ci` (por exemplo, alguma
  rotina de setup local que historicamente tenha apontado para o banco
  principal de propósito), o fail-closed sem escape (§3 do caso, decisão
  `I-2`) vai quebrá-lo, sem contorno por linha de comando. O próprio caso já
  registra essa consequência operacional como deliberada e aceita pelo dono
  (§3, "cria uma tarefa futura obrigatória"). Este pacote não descobriu
  nenhum uso legítimo desse tipo, mas também não fez varredura exaustiva de
  todo o repositório em busca de chamadores desses dois scripts (ex.:
  `package.json` scripts, CI, documentação de setup) — **recomenda-se que a
  VeriCore faça essa varredura** como parte do reteste, dado que é
  precisamente o tipo de regressão que uma verificação de função isolada,
  como a do implementador, não detecta.

## ARCHITECTURE_IMPACT

Nenhum. Mudança contida em dois scripts de manutenção `.cjs` fora da árvore
de execução da aplicação (`server/src`). Nenhuma rota, middleware, use case,
model ou migration foi tocada.

## DATABASE_IMPACT

Nenhum schema, migration ou dado foi alterado por esta remediação. O efeito
é puramente sobre **quando** os scripts se recusam a conectar — não sobre o
que fazem quando conectam.

## API_IMPACT

Nenhum. Os dois arquivos não expõem endpoint HTTP.

## SECURITY_CHECKS

- Guarda é fail-closed por construção: `dbName` ausente/`undefined` vira
  `''` no `|| ''`, que não casa o regex, e recusa — verificado por leitura
  da expressão em ambos os arquivos.
- Nenhum escape por flag, variável de ambiente ou argumento foi introduzido
  — verificado por leitura integral do diff (nenhum novo identificador com
  semântica de bypass).
- Guarda precede tanto a instanciação de `Sequelize` quanto todo `DELETE`
  localizado em cada arquivo (§5).
- **Não coberto por esta remediação, por estar fora do escopo autorizado:**
  qualquer outro script de `server/scripts/` com o mesmo gap. Nenhuma
  varredura adicional foi feita por este pacote de evidência para
  listá-los — não é seu papel produzir esse levantamento, mas se o
  `coretriad-director` ou a VeriCore quiserem fechar essa lacuna, ela precisa
  ser um passo explícito, não presumido coberto por este caso.

## DOCUMENTATION_UPDATED

- `server/scripts/limpar-dados-transacionais.cjs` — nota de cabeçalho
  (linhas iniciais do arquivo, dentro do bloco de comentário `/** ... */`)
  atualizada para descrever a guarda implementada, citando `CASE-003`,
  `sana/ERP-LEGACY-001/CASE-003` e `APR-2026-025`, e mantendo a referência a
  `RC-PROC-01` (`CE-03`) sem declarar o critério cumprido.
- `server/scripts/seed-usuarios-departamentos.cjs` — mesma atualização,
  incluindo a explicação de por que `resolveDbName()` existe (evitar que o
  default escape da checagem).
- Nenhum outro documento (`docs/`, `coretriad/`) foi alterado por esta
  remediação — nem deveria ter sido, pelo escopo do caso.

---

## 6. Avaliação da prova do implementador — suficiência para este pacote (obrigatório declarar, não apenas repassar)

**Avaliação deste agente de evidência: a prova relatada pelo implementador
é insumo relevante, mas NÃO é suficiente como evidência autônoma do
pacote, e recomenda-se que a VeriCore produza a própria prova, por
inteiro, no reteste.** Motivos:

1. **Não é reproduzível a partir do repositório.** Nenhum arquivo de teste
   foi commitado. A afirmação "13 casos, todos passaram" não tem artefato
   que este pacote — ou a VeriCore — possa reexecutar ou mesmo ler; existe
   apenas como relato textual recebido de um agente anterior na cadeia.
   Isso contraria diretamente o critério de conclusão desta carta:
   "pacote permite que a VeriCore reproduza o finding original e verifique
   a correção **sem depender de contexto verbal da SanaCore**". Um teste
   não persistido é, por definição, contexto verbal.
2. **A técnica (extração isolada via `new Function`) tem um ponto cego
   estrutural:** ela testa a função `assertBancoDescartavel` fora do
   arquivo, não o arquivo real. Ela não pode, por construção, detectar se a
   guarda **de fato** está posicionada antes da conexão no fluxo real de
   `main()` — esse fato só foi estabelecido aqui por leitura estática direta
   do arquivo completo (§5), feita por este agente de evidência, não pela
   prova do implementador.
3. **Quem escreveu a correção também escreveu a prova.** Precedente já
   registrado no próprio caso (§5 do `REMEDIATION_CASE`, citando
   `TEST-SEAL-001/002`, `APR-2026-014`): teste escrito pela SanaCore é
   evidência de implementação, nunca reteste. A ausência de persistência
   agrava esse limite — não há nem o registro do teste para a VeriCore
   auditar a metodologia.
4. **O que a prova relatada cobre bem, e por isso não deveria ser
   descartada:** os 13 casos, pela descrição recebida, parecem cobrir
   exatamente os vetores centrais do desenho (sufixo presente/ausente,
   maiúsculas/minúsculas, `DB_NAME` ausente, o agravante do default do
   seed). Se reproduzida e persistida, essa bateria é um bom ponto de
   partida para `RT-CASE003-01`/`02`/`03` da `RETEST_SPECIFICATION` do caso
   — mas a palavra operativa é "se reproduzida", não "conforme relatado".

**Recomendação registrada a este pacote:** a VeriCore deve, no mínimo,
reproduzir e persistir sua própria bateria equivalente à relatada (função
isolada, sem `require()` do módulo, sem conexão), **e** executar
`RT-CASE003-01` a `RT-CASE003-06` como especificado no `REMEDIATION_CASE`
(§9), que cobrem o que a prova isolada estruturalmente não alcança — em
particular `RT-CASE003-04` (guarda precede todo `DELETE`, nos dois modos
`--limpar`/`--confirmar`) e `RT-CASE003-05` (busca ativa por escape).

---

## RETEST_INSTRUCTIONS (ver também `REMEDIATION_CASE` §9, autoritativo)

A `RETEST_SPECIFICATION` completa está no `REMEDIATION_CASE`
(`coretriad/handoffs/ERP-LEGACY-001/REMEDIATION_CASE-ERP-LEGACY-001-CASE-003.md`,
§9, `RT-CASE003-01`…`06`) — proposta pelo Control Plane, não vinculante,
autoridade final de desenho é da VeriCore. Este pacote não a substitui, só
reforça dois pontos à luz de §6 acima:

1. Trate a "prova de 13 casos" do implementador como **hipótese a
   verificar**, não como fato estabelecido — nenhum artefato a sustenta.
2. Ao executar `RT-CASE003-01`/`02`, use exatamente `DB_NAME` que resolva ao
   valor real por default ausente (cobre o agravante do seed,
   `resolveDbName()`), e não apenas um `DB_NAME` explicitamente setado sem
   sufixo — os dois casos são fluxos de código diferentes dentro de
   `seed-usuarios-departamentos.cjs`.
3. Execução de scripts real, se necessário para reteste dinâmico, **somente**
   contra `erp_evok_audio_test`/banco com sufixo `_ci` — nunca o banco real
   (`APR-2026-016`, herdado, sem exceção também para a VeriCore).

## RESIDUAL_RISK

- Vetor estrutural (ausência de banco de dev separado do real,
  `server/.env.example`) permanece — fora de escopo deste caso (§3).
- Outros scripts de `server/scripts/` não nomeados pelo caso podem ter o
  mesmo gap; não foram listados por este pacote (não é seu papel produzir
  esse levantamento — ver §4).
- A ausência de teste persistido (§6) é, em si, um risco residual de
  rastreabilidade: se este caso for revisitado no futuro sem a VeriCore ter
  produzido e persistido prova própria, não haverá nenhum artefato
  reproduzível a consultar além deste pacote e do `REMEDIATION_CASE`.
- Consequência operacional já aceita pelo dono (§3 do caso): limpar o banco
  real antes do Go-Live vai exigir alteração de código no momento, sem
  caminho por flag/variável — fail-closed sem escape, deliberado.

---

## O QUE ESTE PACOTE NÃO FAZ

Não declara `RETEST_PASSED`, `FINDING CLOSED`, `REMEDIATION_ACCEPTED` nem
nenhum critério `CE-*` de `RC-PROC-01` cumprido. Não fecha
`AUD-PROC-CUSTODIA-01`. Não amplia o escopo do caso a outros scripts. Não
executou nenhum comando contra banco de dados, real ou de teste, em nenhum
momento deste empacotamento — apenas leitura de código-fonte e de artefatos
versionados (`git show`, `git diff`, `grep`), conforme permitido pela Regra
permanente de segurança de dado real (`APR-2026-016`).
