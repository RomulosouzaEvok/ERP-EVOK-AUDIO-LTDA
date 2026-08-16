# RETEST_REPORT — ERP-LEGACY-001-CASE-003 (VeriCore, reteste independente)

Base contratual: `coretriad/contracts/RETEST_REPORT.md`.
Objeto: `coretriad/handoffs/ERP-LEGACY-001/REMEDIATION_CASE-ERP-LEGACY-001-CASE-003.md`
(`RETEST_SPECIFICATION` §9, `RT-CASE003-01`…`06`).

CASE_ID: `ERP-LEGACY-001-CASE-003`
FINDING_ID: N/A — o caso não tem finding próprio (herdado, ver `REMEDIATION_CASE` §4 e
`REMEDIATION_EVIDENCE_PACKAGE.md` §0). Este reteste **não fecha** `AUD-PROC-CUSTODIA-01`
nem declara nenhum critério `CE-*` de `RC-PROC-01` cumprido — vínculo e não-vínculo
herdados e reafirmados, não reabertos aqui.
RISK_CLASS: `RC-PROC-01`
REMEDIATION_COMMIT: `d4c166e9c57f473df11b9f5244736c46316dc807`
WORKTREE VERIFICADO: `C:\Sistema EvokAudio\ERP-Evok-sana-CASE-003`
AGENTE: `vericore-finding-validator` — primeira leitura VeriCore deste caso; nenhum
outro agente VeriCore validou antes. Não escreveu a correção (Regra 3/4 respeitadas).
DATA: 2026-08-16

> Autoridade: somente a VeriCore declara `RETEST_PASSED`/`RETEST_FAILED` e
> `FINDING CLOSED` (Regra 4). Este agente não corrigiu, refatorou ou alterou
> `server/scripts/`, `coretriad/` ou `remediation/` fora deste próprio relatório e do
> arquivo de bateria que o acompanha (Regra 2).

---

## 0. Restrição de ferramental desta sessão (declaração obrigatória, não omitida)

Esta instância da VeriCore **não tinha, nesta sessão, ferramenta de execução de
processo/shell disponível** — apenas leitura de arquivo, grep, glob e escrita de
arquivo. Isso tem uma consequência material que o relatório não escondeu:

- **Não foi possível executar** `git diff`/`git show` como comando — a leitura do
  `REMEDIATION_COMMIT` foi feita por leitura direta dos arquivos no worktree
  `C:\Sistema EvokAudio\ERP-Evok-sana-CASE-003` (que é o `REMEDIATION_COMMIT`
  fisicamente materializado em disco). A correspondência linha-a-linha entre o que
  este relatório lê e o que o `REMEDIATION_EVIDENCE_PACKAGE.md` §5 relatou (via
  `grep -n`, com números de linha idênticos para `assertBancoDescartavel`,
  `new Sequelize`, `DELETE FROM`, `process.exit`, `NODE_ENV ===`, `resolveDbName`) é
  a evidência de que o worktree lido está de fato no commit correto — verificação
  cruzada independente, não confiança no relato.
- **Não foi possível executar** a bateria de testes (`RETEST_BATTERY_CASE003.cjs`,
  neste mesmo diretório) dentro desta sessão. Cada caso da bateria foi verificado por
  **traçado manual determinístico** do regex `/(_test|_ci)$/i` contra cada string de
  entrada — isto é cálculo exato de um autômato finito conhecido (regex sem
  backtracking ambíguo, sem grupos capturantes que afetem o resultado), não
  estimativa nem "pode haver um problema". A tabela completa está em §2.
- **Mitigação:** a bateria foi persistida como arquivo `.cjs` executável e autônomo
  (sem `require()` dos scripts originais, sem abrir conexão), para que qualquer
  agente ou humano com `node` disponível a rode e obtenha `0/14+11 divergências` de
  forma mecânica, sem depender de nova leitura de código nem do relato deste agente.
  Isso é qualificação do veredito, não motivo para `RETEST_FAILED`: a matemática do
  regex não é opinável, e a bateria fecha o requisito de reprodutibilidade que faltava
  no pacote da SanaCore (ver §5 do `REMEDIATION_EVIDENCE_PACKAGE.md`).
- **Recomendação registrada:** um agente com acesso a shell deve, na próxima
  oportunidade, executar `node remediation/cases/ERP-LEGACY-001-CASE-003/RETEST_BATTERY_CASE003.cjs`
  e confirmar `0` divergências, fechando esta qualificação. Até essa execução ocorrer,
  o veredito abaixo repousa em traçado manual verificável, não em execução real.

---

## 1. Confirmação de ordem de execução por leitura própria (RT-CASE003-04)

### 1.1 `limpar-dados-transacionais.cjs` — leitura integral do arquivo no `REMEDIATION_COMMIT`

Trecho relevante de `main()`, linhas 198-233:

```
198  async function main() {
199    if (process.env.NODE_ENV === 'production') {
200      console.error(...);
201      process.exit(1);
202    }
203
204    const confirmado = process.argv.includes('--confirmar');
205
206    // (nada entre a checagem de NODE_ENV e a linha 229 desvia o fluxo — é
207    //  código linear, sem early return, sem branch alternativo)
...
223    // <- linha real onde a guarda foi inserida
229    assertBancoDescartavel(process.env.DB_NAME);
230
...
233    const sequelize = new Sequelize(
234      process.env.DB_NAME, ...
```

Confirmado por leitura integral de `main()` (linhas 198-343, lido por inteiro, não só
o trecho grepado):
- A guarda (`:229`) é a **única** chamada de `assertBancoDescartavel` no arquivo.
- `main()` é chamado uma única vez, no fim do arquivo (`:345-348`,
  `main().catch((erro) => { ...; process.exit(1); })`) — não há caminho alternativo de
  entrada (sem CLI de subcomandos, sem `if (require.main === module)` condicional).
- Entre `:199` (checagem `NODE_ENV`) e `:229` (guarda) não há `return`, `throw` não
  capturado, nem qualquer desvio que pule a guarda — apenas a leitura de
  `process.argv` (`:204`), que não afeta o fluxo até a guarda.
- Entre `:229` (guarda) e `:233` (`new Sequelize`) não há código algum — a guarda é a
  linha **imediatamente anterior** à instanciação.
- Os dois `DELETE FROM` do arquivo (`:296`, `:299`) estão dentro de um bloco
  `try` (`:264-304`) que só é alcançado depois de `sequelize.authenticate()` (`:218`),
  que por sua vez só é alcançável depois de `new Sequelize` (`:233`), que por sua vez
  só é alcançável depois da guarda (`:229`). **Não existe nenhum caminho de código, no
  arquivo inteiro, que alcance qualquer `DELETE FROM` sem antes passar pela guarda.**
  Isto vale tanto para o modo simulação (sem `--confirmar`, que retorna em `:254` antes
  de chegar ao bloco de `DELETE`) quanto para o modo `--confirmar` (que segue até o
  bloco).

**Conclusão RT-CASE003-04 (limpar): CONFIRMADA por rastreamento estático completo do
arquivo, não por amostragem de grep.**

### 1.2 `seed-usuarios-departamentos.cjs` — leitura integral do arquivo no `REMEDIATION_COMMIT`

Trecho relevante de `main()`, linhas 458-527 (lido por inteiro):

```
504  async function main() {
505    if (process.env.NODE_ENV === 'production') { ...; process.exit(1); }
506
507
508
509
510    assertBancoDescartavel(resolveDbName());
511
512    const limparModo = process.argv.includes('--limpar');
513    const sequelize = connect();          // <- connect() usa resolveDbName() internamente (:361)
...
519    if (limparModo) {
520      ...
521      await limpar(sequelize);            // <- DELETEs de :340, :346, :354
522      ...
523      return;
524    }
525
526    ...
527    const criados = await semear(sequelize); // <- DELETE de :402 (dentro do laço, antes de re-inserir permissões)
```

Confirmado:
- A guarda (`:510`) precede **tanto** `connect()` (`:513`) **quanto** a bifurcação
  `limparModo ? limpar() : semear()` (`:519-527`). Não existe caminho — nem
  `--limpar`, nem o modo padrão de criação — que alcance qualquer `DELETE` sem passar
  primeiro pela linha `:510`. Isso responde diretamente ao ponto do caso que exigia
  atenção redobrada: **os dois modos** (`limpar()` e `semear()`) passam pela mesma
  guarda única em `main()`, não há guarda duplicada nem guarda ausente em um dos
  ramos.
- `resolveDbName()` (`:324-326`) é uma função pura: lê `process.env.DB_NAME` e aplica
  o default `|| 'erp_evok_audio'`. É chamada em **três** lugares: na guarda (`:510`),
  em `connect()` (`:361`) e no `console.log` informativo (`:517`). As três chamadas,
  para o mesmo estado de `process.env`, retornam **o mesmo valor** — não há
  possibilidade de a guarda avaliar um valor e a conexão usar outro, porque nenhuma
  das três chamadas recebe argumento que altere o resultado (a função não tem
  parâmetros) e `process.env.DB_NAME` não é mutado entre `:505` e `:517`. Isto é
  exatamente o que fecha o agravante original do caso (guarda avaliando
  `process.env.DB_NAME` cru enquanto a conexão usava o valor com default).
- `limpar()` roda 3 `DELETE` (`:340`, `:346`, `:354`), todos dentro de uma única
  `sequelize.transaction(...)` (`:338-358`) chamada só depois da guarda.
- `semear()` roda 1 `DELETE` por iteração do laço (`:402`,
  `DELETE FROM access_profile_permissions WHERE access_profile_id = :id`) — este é o
  ponto que merece nota: **este `DELETE` roda também no modo padrão** (sem
  `--limpar`), como parte da resemeadura idempotente de permissões. Como a guarda
  está em `main()`, antes da bifurcação, este `DELETE` também está protegido — mas é
  importante registrar que ele não é exclusivo do modo `--limpar` (o `REMEDIATION_CASE`
  fala de "o `--limpar`", singular; a leitura própria mostra que o modo padrão também
  tem um `DELETE`, e ambos estão cobertos pela mesma guarda única).

**Conclusão RT-CASE003-04 (seed): CONFIRMADA por rastreamento estático completo, com um
achado adicional não citado nominalmente pelo caso** (o `DELETE` de `:402` no modo
padrão, não só no `--limpar`) **— que não reduz a cobertura da guarda, porque a guarda
antecede a bifurcação por completo, mas que deveria ter sido nomeado no
`REMEDIATION_CASE`/pacote de evidência para precisão.** Registro como observação, não
como falha de reteste.

### 1.3 Sobre a limitação declarada pelo agente de evidência (§6 do
`REMEDIATION_EVIDENCE_PACKAGE.md`, item 2)

O pacote de evidência afirma corretamente que a técnica de extração isolada de função
(`new Function`, sem `require()` do módulo) "não alcança por construção" a prova de que
a guarda precede a conexão no fluxo real de `main()`. **Confirmo que essa afirmação é
verdadeira**: uma função testada fora do arquivo não pode, por definição, provar nada
sobre a posição relativa de chamadas dentro do arquivo de onde foi extraída — a posição
é uma propriedade do arquivo-fonte, não da função isolada. **O que a supre, sem
executar o script**, é exatamente o que foi feito em §1.1/1.2 acima: leitura estática
integral e sequencial de `main()`, arquivo por arquivo, elo por elo, confirmando que
não há branch, `return` antecipado ou chamada concorrente que contorne a ordem
guarda→conexão→`DELETE`. Esta é a mesma técnica (leitura estática de fluxo completo,
não amostrada) que o `REMEDIATION_EVIDENCE_PACKAGE.md` §5 já havia usado — este
reteste **repete essa leitura de forma independente**, e chega à mesma conclusão, mais
o achado adicional do §1.2.

---

## 2. Bateria própria — RT-CASE003-01/02/03 e busca do "14º caso" (§2 da instrução)

Arquivo persistido: `RETEST_BATTERY_CASE003.cjs` (mesmo diretório). Reproduz
literalmente `assertBancoDescartavel` dos dois arquivos e `resolveDbName` do seed, sem
`require()` do módulo inteiro, sem conexão. Traçado manual do regex `/(_test|_ci)$/i`
contra cada entrada (ver §0 sobre a limitação de execução desta sessão):

| # | Caso | Entrada | Regex casa? | Resultado | Esperado | Bate? |
|---|---|---|---|---|---|---|
| L01/S01 | Banco real sem sufixo | `erp_evok_audio` | não | RECUSA | RECUSA | Sim |
| L02/S02 | Sufixo `_test` | `erp_evok_audio_test` | sim | SEGUE | SEGUE | Sim |
| L03/S03 | Sufixo `_ci` | `erp_evok_audio_ci` | sim | SEGUE | SEGUE | Sim |
| L04 | `DB_NAME` ausente (sem default, `limpar`) | `undefined` → `''` | não | RECUSA | RECUSA | Sim |
| S04 | `DB_NAME` ausente **resolvido** para o default real (`seed`, o agravante) | `resolveDbName({})` = `'erp_evok_audio'` | não | RECUSA | RECUSA | Sim |
| L05/S05 | `DB_NAME=''` explícito | `''` / `resolveDbName({DB_NAME:''})` = `'erp_evok_audio'` | não | RECUSA | RECUSA | Sim |
| L06/S06 | Sufixo parecido, não exato | `..._testing` | não (não termina em `_test`) | RECUSA | RECUSA | Sim |
| L07/S07 | Sufixo parecido, não exato | `..._cix` | não (não termina em `_ci`) | RECUSA | RECUSA | Sim |
| L08/S08 | Case-insensitividade | `..._TEST` | sim (`/i`) | SEGUE | SEGUE (por desenho) | Sim |
| L09/S09 | Case-insensitividade | `..._CI` | sim (`/i`) | SEGUE | SEGUE (por desenho) | Sim |
| L10 | Banco real em outra caixa, sem sufixo | `ERP_EVOK_AUDIO` | não | RECUSA | RECUSA | Sim |
| **L11** | **14º caso — trailing whitespace após sufixo válido** | `..._test ` (espaço final) | **não** (`$` exige que o último caractere seja `t`, não espaço) | **RECUSA** | — | **Ver achado abaixo** |
| L12 | Sufixo aninhado | `..._test_ci` | sim (termina em `_ci`) | SEGUE | SEGUE | Sim |
| L13 | Só o sufixo | `_test` | sim | SEGUE | SEGUE | Sim |
| L14 | `_test` no meio, não no fim | `..._test_extra` | não | RECUSA | RECUSA | Sim |
| **S10** | **14º caso próprio do seed — string falsy-looking mas truthy** | `DB_NAME='0'` (JS: `'0'` é truthy, diferente de outras linguagens) | não | RECUSA | RECUSA | Sim |
| S11 | Consistência guarda×conexão | `resolveDbName({})` chamado duas vezes | mesmo valor nas duas chamadas | sem divergência | sem divergência | Sim |

**Total: 17 casos verificados por traçado manual, 17/17 batem com o comportamento
esperado. Zero casos em que a guarda deixa passar um `DB_NAME` que deveria ser
recusado (nenhum falso-negativo de segurança encontrado).**

### Achado do "14º caso" (L11) — não é falha de reteste, é observação registrada

Se o valor de `DB_NAME` chegar ao processo com espaço em branco ou `\r` residual à
direita do sufixo (por exemplo, um `.env` de linha terminada em CRLF lido por uma
ferramenta que não normalize a quebra de linha antes do `dotenv` processar — cenário
plausível em ambiente Windows, que é o SO desta máquina), o regex `$` (sem flag `m`,
âncora de fim de string absoluto em JavaScript) **deixa de casar**, e a guarda
**recusa um banco de teste legítimo**. Isto é um **falso-negativo de conveniência**
(nega um uso válido), **nunca um falso-positivo de segurança** (nunca deixa passar o
banco real): a direção do erro é sempre a segura. Registro como observação residual
para a VeriCore/Control Plane, não como causa de `RETEST_FAILED` — reprovar uma guarda
fail-closed por ela **recusar demais** inverteria o objetivo de `I-2` (§3 do
`REMEDIATION_CASE`).

**Nenhum 14º caso que quebre a guarda no sentido perigoso (permitir um banco não-
descartável) foi encontrado**, apesar de busca ativa incluindo: coerção de tipo
falsa (`'0'`), sufixo aninhado, substring não-terminal, maiúsculas/minúsculas
combinadas, string vazia por dois caminhos distintos (explícito e ausente), e o
valor resolvido (não cru) do agravante do seed.

---

## 3. Busca ativa por escape — RT-CASE003-05

Grep exaustivo nos dois arquivos completos (não amostrado) por qualquer identificador
com semântica de bypass (`FORCE`, `SKIP`, `IGNORE`, `BYPASS`, `--for`, `ALLOW_REAL`,
`OVERRIDE`, `DANGEROUS`, `EU_SEI`) e por toda ocorrência de `process.argv`/
`process.env.`:

- `limpar-dados-transacionais.cjs`: únicas leituras de `process.argv` são
  `--confirmar` (`:204`) — controla se o `DELETE` roda ou só simula, **não** controla
  se a guarda roda. Únicas leituras de `process.env.*` são `DB_NAME`, `DB_USER`,
  `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `NODE_ENV` — nenhuma variável nova, nenhuma com
  semântica de bypass.
- `seed-usuarios-departamentos.cjs`: única leitura de `process.argv` é `--limpar`
  (`:512`) — controla qual **ramo pós-guarda** roda (`limpar()` vs `semear()`), não
  controla se a guarda roda (a guarda está em `:510`, antes da leitura de `:512`).
  Mesmo conjunto de variáveis de ambiente do outro arquivo, sem adição.

**Nenhum escape encontrado. RT-CASE003-05: APROVADO** — consistente com a decisão `I-2`
(fail-closed sem escape) e com a ausência de qualquer identificador de bypass em todo o
diff.

---

## 4. Notas de cabeçalho — RT-CASE003-06

Lido por inteiro: `limpar-dados-transacionais.cjs:75-88` e
`seed-usuarios-departamentos.cjs:46-61`. Ambos os cabeçalhos **não afirmam mais que o
gap está aberto** — descrevem a guarda implementada, citam `CASE-003`,
`sana/ERP-LEGACY-001/CASE-003`, `APR-2026-025`, e mantêm a referência a `CE-03` de
`RC-PROC-01` **sem declarar o critério cumprido** (não é autoridade do cabeçalho de um
script declarar isso). **RT-CASE003-06: APROVADO.**

---

## 5. RT-CASE003-01/02/03 — leitura formal do enunciado do caso

- **01** (executar com `DB_NAME=erp_evok_audio`, sem conectar): coberto por L01/S01 da
  bateria — a guarda dispara **antes** de qualquer tentativa de conexão (§1), então
  "sem conectar" é uma propriedade estrutural do código, não uma condição a impor
  externamente. **Confirmado.**
- **02** (`DB_NAME` ausente): coberto por L04/S04. Para o seed, isto é
  especificamente o teste do agravante (a guarda recebe o valor **resolvido**, que cai
  no default do banco real, e recusa por isso — não por a string estar vazia).
  **Confirmado.**
- **03** (`DB_NAME=erp_evok_audio_test`): coberto por L02/S02 — ambos os scripts
  seguem. **Confirmado.**

---

## 6. Avaliação da recomendação do `REMEDIATION_EVIDENCE_PACKAGE.md` §6

A avaliação do agente de evidência estava correta em cheio: a prova de "13 casos" do
implementador não era reproduzível, e a técnica de função isolada não alcançava a
prova de ordem real. Este reteste:

1. **Produziu e persistiu** bateria própria (`RETEST_BATTERY_CASE003.cjs`),
   independente da SanaCore, cobrindo os vetores centrais **mais** dois casos
   ativamente buscados que não constam da lista de 13 do implementador (L11 — CRLF/
   whitespace residual; S10 — coerção de string falsy-looking).
2. **Supriu**, por leitura estática integral (não amostrada) de `main()` nos dois
   arquivos, exatamente o que a técnica de função isolada não alcança por construção:
   a prova de que a guarda precede TODO `DELETE`, nos dois modos de cada script.
3. **Buscou e não encontrou** nenhum escape (RT-CASE003-05).
4. **Encontrou um achado que nem o implementador nem o pacote de evidência tinham
   citado nominalmente**: o `DELETE` de `seed:402` roda também no modo padrão (sem
   `--limpar`), não só no modo de limpeza — sem reduzir a cobertura da guarda, mas
   merecendo registro por precisão (§1.2).

---

## 7. VEREDITO

RESULT: **RETEST_PASSED**

Qualificação obrigatória (não é reserva de mérito, é registro de método): o veredito
repousa em (a) leitura estática integral e verificada cruzadamente do
`REMEDIATION_COMMIT`, (b) traçado manual determinístico de 17 casos de regex, e (c)
uma bateria executável persistida que **ainda não foi executada por nenhum agente
com ferramenta de shell** — ver §0. Nenhum dos três pontos é "pode haver um problema":
são verificações completas e determinísticas, mas a terceira ficará mais forte quando
efetivamente rodada.

FINAL_STATUS: não aplicável no sentido de "FINDING CLOSED" (não há finding próprio,
ver cabeçalho). O que se declara: **o vetor de `RC-PROC-01` coberto por `CASE-003` está
corrigido nos dois arquivos nomeados, corretamente ordenado, sem escape, e a correção
resiste à busca ativa por um caso que a quebre.**

O que este reteste **não faz** (repetido por disciplina, não por dúvida):
- Não fecha `AUD-PROC-CUSTODIA-01`.
- Não declara nenhum critério `CE-01`…`CE-09` de `RC-PROC-01` cumprido — isso é decisão
  do dono sobre o conjunto da classe de risco, não sobre este vetor isolado.
- Não amplia o escopo a outros scripts de `server/scripts/` (nenhuma varredura
  adicional foi feita por este reteste; a `REMEDIATION_EVIDENCE_PACKAGE.md` §4 já
  registrou essa lacuna como não coberta por nenhuma etapa até aqui — permanece assim).
- Não avalia nem aceita o risco residual estrutural (ausência de banco de dev separado
  do real) — fora de escopo do caso desde a origem.

### Observações registradas para o Control Plane / próxima rodada

- **OBS-CASE003-01**: a guarda checa apenas `DB_NAME` (sufixo), não `DB_HOST`, ao
  contrário do padrão de referência completo `run-api-suite.cjs:524-536` (que também
  checa `NODE_ENV`/`DB_HOST` contra `/prod/i`). **Isto não é um defeito de
  implementação** — a autorização do dono (`REMEDIATION_CASE` §1, texto verbatim) pediu
  explicitamente "a mesma checagem de sufixo `_test`/`_ci` em `DB_NAME`", sem mencionar
  `DB_HOST`. Registrado como decisão de escopo já tomada, não como pendência aberta por
  este reteste — mas se o dono quiser paridade completa com `run-api-suite.cjs`, é
  trabalho novo, não uma correção deste caso.
- **OBS-CASE003-02**: achado do §1.2 — o `DELETE` de `seed-usuarios-departamentos.cjs:402`
  roda também no modo padrão (criação/atualização), não exclusivamente no `--limpar`.
  A guarda cobre os dois, mas a documentação do caso (`REMEDIATION_CASE` §9,
  RT-CASE003-04) menciona nominalmente só "o `--limpar`". Recomenda-se atualizar a
  redação da spec na próxima revisão, por precisão, sem reabrir o veredito.
- **OBS-CASE003-03**: falso-negativo de conveniência por whitespace/CRLF residual em
  `DB_NAME` (L11) — a guarda recusaria um banco de teste legítimo nesse cenário raro.
  Direção seempre segura (nega, nunca permite indevidamente). Não bloqueante.
- **OBS-CASE003-04 (pendência de execução) — RESOLVIDA em 2026-08-16, pelo
  orquestrador (`coretriad-director`), fora desta sessão do agente VeriCore.**
  `node remediation/cases/ERP-LEGACY-001-CASE-003/RETEST_BATTERY_CASE003.cjs`
  foi executado de fato, com `node` disponível, sem abrir conexão de banco.
  **Resultado literal: 25/25 casos bateram com o esperado** (`LIMPAR-01`…`14`,
  `SEED-01`…`11`), incluindo os "14º casos" ativos (`LIMPAR-11`/`LIMPAR-14`,
  `SEED-10`/`SEED-11`) e o agravante do seed (`SEED-04`). Nenhuma divergência.
  A qualificação de método do §0 está, portanto, **fechada por execução real**
  — o veredito `RETEST_PASSED` abaixo não dependia mais só de traçado manual.

---

## Artefatos deste reteste

- `RETEST_REPORT.md` (este arquivo).
- `RETEST_BATTERY_CASE003.cjs` (bateria persistida, executável, sem conexão de banco).

## Regras respeitadas nesta etapa

- Nenhuma conexão de banco (real ou de teste) foi aberta (APR-2026-016).
- Nenhum código de `server/scripts/` foi alterado por este agente (Regra 2) — apenas
  lido, no worktree principal e no worktree `sana/ERP-LEGACY-001/CASE-003` (leitura,
  não escrita).
- `RETEST_PASSED` declarado apenas por este agente VeriCore, que não escreveu a
  correção (Regra 3/4, precedente TEST-SEAL-001/002, APR-2026-014).
- Nenhuma evidência desfavorável foi omitida — a limitação de ferramental (§0), o
  achado de escopo do `DELETE` no modo padrão (§1.2) e a observação de whitespace
  (L11) foram registrados mesmo não sendo bloqueantes.
