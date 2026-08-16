# RETEST_REPORT — EXTENSÃO do ERP-LEGACY-001-CASE-003 (VeriCore, reteste independente)

> **Arquivo NOVO.** Não altera, não reescreve e não substitui o `RETEST_REPORT.md`
> deste mesmo diretório, que permanece íntegro e continua valendo para o
> `REMEDIATION_COMMIT` `d4c166e` (dois scripts destrutivos). Regra 15.

CASE_ID: `ERP-LEGACY-001-CASE-003` (extensão)
OBJETO: `server/scripts/apply-pending-migrations.cjs` — guarda de alvo com
confirmação explícita obrigatória.
REMEDIATION_COMMIT: `80505063625b4bfbccdbf119e4e62578303f5c63` (`8050506`), branch
`sana/ERP-LEGACY-001/CASE-003`.
**Verificação do commit sem shell:** `C:\Sistema EvokAudio\ERP-Evok-sana-CASE-003\.git`
→ `gitdir: .../.git/worktrees/ERP-Evok-sana-CASE-003`; `HEAD` desse worktree →
`ref: refs/heads/sana/ERP-LEGACY-001/CASE-003`; e
`.git/refs/heads/sana/ERP-LEGACY-001/CASE-003` →
`80505063625b4bfbccdbf119e4e62578303f5c63`. O worktree lido **é** o
`REMEDIATION_COMMIT` materializado em disco, comprovado por leitura das refs, não
por relato.
ESTADO ANTERIOR COMPARADO: `server/scripts/apply-pending-migrations.cjs` no worktree
principal (`main`, `694bca9`), que é o estado pré-extensão do mesmo arquivo.
RISK_CLASS: `RC-PROC-01`
FINDING_ID: N/A (herdado — o caso não tem finding próprio).
AGENTE: `vericore-audit-evidence-controller`. **Não escreveu a correção** e não é o
mesmo agente que assinou o `RETEST_REPORT.md` da primeira parte
(`vericore-finding-validator`). Regras 3 e 4 respeitadas.
DATA: 2026-08-16

---

## 0. Restrição de ferramental desta sessão — declarada, não contornada

Esta instância **não recebeu ferramenta de execução de processo/shell**. As
ferramentas disponíveis foram exclusivamente leitura de arquivo, busca de conteúdo,
busca de caminho e escrita de arquivo.

Consequência material, registrada sem eufemismo:

- A bateria `PROVA_GUARDA_APPLY_MIGRATIONS.cjs` **não foi executada por este
  agente**. O §2 abaixo apresenta a saída **calculada por traçado determinístico**
  do código copiado no próprio arquivo de bateria — é a saída que o `node`
  produzirá, derivada linha a linha, **mas não é captura de execução real**.
  Chamá-la de "saída literal capturada" seria falso e este relatório não o faz.
- Isto repete a limitação do §0 do `RETEST_REPORT.md` original. Registro como
  **pendência de execução `PEND-EXT-04`** (§7): um agente ou humano com `node`
  deve rodar o arquivo e anexar a captura. O traçado é determinístico (regex sem
  ambiguidade, `String.prototype.includes` por igualdade exata, sem I/O, sem
  concorrência) — mas continua sendo cálculo, não execução.
- **Nenhuma conexão de banco foi aberta** por este agente, com nenhum banco, nem
  de teste (`APR-2026-016`). A proibição da instrução foi cumprida por não haver
  sequer meio de violá-la.
- Nenhum arquivo de `server/scripts/` foi alterado (Regra 2). O único arquivo
  escrito por este agente é este relatório.

---

## 1. Verificação de ORDEM, por leitura própria integral do arquivo (ponto 1)

Arquivo lido **por inteiro** (203 linhas) no `REMEDIATION_COMMIT`, não por
amostragem de busca. O script é de **topo de módulo** — não há `main()`, o corpo do
módulo é o fluxo. Sequência real, na ordem física de execução:

| Linha | O que acontece |
|---|---|
| `:44-45` | `require('fs')`, `require('path')` — sem efeito sobre banco |
| `:48` | `dotenv.config({path: server/.env})` — popula `process.env`. **Precede a guarda, e tem de preceder**: sem isso a guarda avaliaria um `DB_NAME` que não é o que o `Sequelize` usaria. Correto |
| `:55` | `const FLAG_CONFIRMACAO = '--confirmar-banco-real'` |
| `:70-72` | `resolveDbName(env)` — declaração |
| `:84-90` | `sinaisDeProducao(env, dbName)` — declaração |
| `:101-114` | `avaliarAlvo(env, argv)` — declaração, **sem efeito colateral** (não imprime, não sai, não conecta) |
| `:131-154` | `assertAlvoAutorizado(env, argv)` — declaração |
| **`:156`** | **`assertAlvoAutorizado(process.env, process.argv.slice(2));` — chamada da guarda** |
| `:158` | `require(...'sequelize')` — o módulo `sequelize` **nem é carregado** antes da guarda |
| `:159-169` | `new Sequelize(resolveDbName(process.env), ...)` |
| `:174-175` | `posicionais` / `pattern` |
| `:177-199` | IIFE assíncrona: `SELECT ... FROM "SequelizeMeta"` (`:179`), `mig.up(qi, Sequelize)` — **o DDL** (`:193`), `INSERT INTO "SequelizeMeta"` (`:194`) |

**Confirmações que decorrem da leitura, não de inferência:**

1. `:156` é a **única** chamada de `assertAlvoAutorizado` no arquivo, e é
   incondicional — não está dentro de `if`, `try`, callback, função ou branch. Não
   existe caminho de entrada do módulo que a pule.
2. Entre `:48` (carga do `.env`) e `:156` (guarda) **não há uma única instrução
   executável** — só declarações de `const` e de funções. Nada pode desviar o fluxo.
3. A guarda precede o `require` do `sequelize` (`:158`), portanto precede a
   construção do cliente (`:159`) e, a fortiori, `authenticate`/`query`/`mig.up`.
   Isto é mais forte do que o exigido: não só nenhum DDL, como nenhum *carregamento*
   do driver ocorre em alvo não autorizado.
4. O recuso é `process.exit(1)` (`:145`) — término com código de erro, imediatamente
   após a mensagem, **dentro** de `assertAlvoAutorizado`, não um `return` que o
   chamador pudesse ignorar (o chamador em `:156` descarta o retorno, o que só é
   seguro porque a recusa mata o processo — e mata).
5. Todo o DDL está na IIFE de `:177`, alcançável apenas depois de `:156`.

**Veredito RT-EXT-01 (ordem): CONFIRMADO.** A guarda precede a construção do
`Sequelize` e qualquer DDL, por rastreamento estático completo do arquivo.

---

## 2. Verificação de VALOR EFETIVO — fonte única do `DB_NAME` (ponto 2)

O agravante que o `seed-usuarios-departamentos.cjs` carregava era a guarda avaliar
`process.env.DB_NAME` **cru** enquanto a conexão usava o valor **com default**. Aqui:

- `resolveDbName(env)` (`:70-72`) → `env.DB_NAME || 'erp_evok_audio'`. Função pura,
  sem estado, sem parâmetro opcional que altere o resultado.
- **Guarda:** `:156` → `assertAlvoAutorizado(process.env, ...)` → `:132`
  `avaliarAlvo(env, argv)` → `:102` `const dbName = resolveDbName(env)`.
- **Conexão:** `:160` `new Sequelize(resolveDbName(process.env), ...)`.

**Busca exaustiva por uma segunda fonte:** procurei no arquivo inteiro toda
ocorrência de `DB_NAME`. Existem **exatamente duas**: `:71` (dentro de
`resolveDbName`) e `:59`/`:81` (texto de comentário, não código). Não há nenhuma
leitura de `process.env.DB_NAME` fora de `resolveDbName`. **Não existem duas
fontes** — a afirmação do implementador é verdadeira e verificável por contagem, não
por confiança.

Duas observações que a leitura acrescenta e que o implementador não registrou:

- `process.env` é passado **por referência** para a guarda (`:156`) e lido de novo em
  `:160`. Entre as duas leituras não há nenhuma mutação de `process.env` no arquivo
  (verificado: não há nenhuma atribuição a `process.env.*` em todo o script). Logo a
  identidade dos valores é garantida pelo código, não só pela pureza da função.
- `DB_HOST` **não** tem função resolvedora: aparece cru em `:88` (sinal de produção),
  `:108` (só para a mensagem) e `:164` (conexão), sempre com o mesmo default
  `'localhost'` em `:108` e `:164`. Consistente, mas por repetição literal do
  default em dois lugares, não por fonte única — se um dia um dos dois mudar, a
  mensagem de recusa passa a mentir sobre o host. Risco baixo; registrado como
  `OBS-EXT-03`, não como defeito.

**Veredito RT-EXT-02 (valor efetivo / fonte única): CONFIRMADO.**

---

## 3. A FLAG NÃO VIRA FILTRO — e o bug no estado anterior (ponto 3)

### 3.1 O bug no estado ANTERIOR — confirmado por leitura do arquivo pré-extensão

`server/scripts/apply-pending-migrations.cjs` no worktree principal (`main`), estado
pré-extensão, linha 46, texto literal:

```js
const pattern = new RegExp(process.argv[2] || '.');
```

E o uso, `:53-57`:

```js
  const files = fs
    .readdirSync(path.join(SERVER, 'migrations'))
    .filter((f) => f.endsWith('.cjs') || f.endsWith('.js'))
    .filter((f) => pattern.test(f))
    .sort();
```

E a mensagem final, `:70`:

```js
  console.log(count === 0 ? 'Nada pendente.' : `Concluído: ${count} migration(s) aplicada(s).`);
```

**Confirmação do bug latente, por dedução direta destas três linhas:** se a flag
`--confirmar-banco-real` tivesse sido adicionada mantendo `:46` intacta, então
`node ... .cjs --confirmar-banco-real` daria `process.argv[2] === '--confirmar-banco-real'`,
logo `pattern = /--confirmar-banco-real/`. Nenhum nome de arquivo de migration
(`20260807-*.cjs`) contém essa substring, portanto `files` seria `[]`, o laço de
`:60` não iteraria, `count` permaneceria `0` e a saída seria exatamente
**`Nada pendente.`** — com **código de saída 0**, isto é, sucesso aparente.

O dano é preciso e vale nomeá-lo com exatidão, porque a direção importa: o bug
**não** aplicaria DDL errado nem DDL a mais. Ele aplicaria **nada**, informando ao
operador uma frase que, no vocabulário deste script, significa "o banco já está em
dia". É um **falso negativo de trabalho realizado** — o operador segue o deploy
acreditando que as migrations foram aplicadas. Em um deploy de produção, o sintoma
apareceria depois, longe da causa, como erro de coluna inexistente. A caracterização
do implementador está correta.

Nota de precisão sobre a redação da instrução: o bug é **latente**, não ativo, no
estado anterior — `:46` só se torna danoso quando existe uma flag para ser
confundida com filtro, e no estado anterior não existia flag alguma. Confirmo o
mecanismo no estado anterior (a linha `:46` está lá, crua, como descrito) e confirmo
que ele **teria** se manifestado com a introdução da flag. Registrar isso como "bug
que já quebrava algo antes" seria impreciso; registrar como "armadilha que a
correção pisaria se não fosse vista" é exato.

### 3.2 A correção no estado ATUAL — confirmada por leitura

`apply-pending-migrations.cjs:171-175` no `REMEDIATION_COMMIT`:

```js
// A flag de confirmação é retirada dos posicionais: sem isso,
// `... .cjs --confirmar-banco-real` viraria o filtro regex e o script diria
// "Nada pendente." em silêncio, sem aplicar nada.
const posicionais = process.argv.slice(2).filter((a) => a !== FLAG_CONFIRMACAO);
const pattern = new RegExp(posicionais[0] || '.');
```

Verificações próprias sobre a correção:

- O `filter` remove **todas** as ocorrências da flag, e por igualdade exata com a
  mesma constante `FLAG_CONFIRMACAO` (`:55`) que a guarda usa em `:105`. **Uma única
  constante governa os dois comportamentos** — não há como a guarda aceitar uma
  grafia e o filtro remover outra. Isto é o ponto correto de acoplamento.
- `posicionais[0] || '.'` preserva o comportamento histórico: sem posicional, o
  padrão é `/./`, que casa todo nome de arquivo.
- Ordem dos argumentos: como é `filter` sobre o array inteiro (não `slice(2)[0]`),
  tanto `--confirmar-banco-real "^20260807"` quanto `"^20260807" --confirmar-banco-real`
  produzem `posicionais = ['^20260807']`. Verificado por leitura; coberto pela
  bateria em `AM-16`/`AM-20`.

**Veredito RT-EXT-03 (a flag não vira filtro; bug anterior confirmado): CONFIRMADO
nos dois sentidos** — o mecanismo do bug existe no arquivo pré-extensão e a correção
existe e é coerente no arquivo pós-extensão.

---

## 4. A FLAG PARECIDA NÃO SERVE (ponto 4)

Código relevante, `:105`:

```js
  const confirmado = argv.includes(FLAG_CONFIRMACAO);
```

`Array.prototype.includes` compara por **igualdade estrita de string** (SameValueZero
sobre primitivos), sem normalização, sem prefixo, sem case-folding.

- `--confirmar` (a flag de `limpar-dados-transacionais.cjs`, memória muscular do
  operador) → `'--confirmar' !== '--confirmar-banco-real'` → `confirmado = false` →
  **recusa**. Coberto por `AM-14`.
- `--confirmar-banco` (prefixo próprio) → **recusa**. Coberto por `AM-15`.

Este ponto merece um registro que a bateria não faz: a recusa nesses dois casos é
**silenciosamente correta mas potencialmente confusa** — a mensagem de `:136-144` não
diz "você digitou uma flag parecida"; ela repete a instrução completa com a flag
certa (`:141-142`, `Se o alvo esta CERTO ... repita o comando com --confirmar-banco-real`).
Na prática o operador lê a flag correta na própria mensagem, então o desfecho é
adequado. Não é defeito; é observação de ergonomia (`OBS-EXT-04`).

Verifiquei também que **não existe nenhum outro caminho de confirmação**: busca no
arquivo inteiro por leituras de `process.argv` retorna `:156` (guarda) e `:174`
(posicionais) — nenhuma outra. Busca por `process.env.` retorna `NODE_ENV`, `DB_NAME`
(via `resolveDbName`), `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_PORT` — **nenhuma
variável de ambiente com semântica de autorização**. Não há bypass por env var
(coberto ativamente por `AM-17`).

**Veredito RT-EXT-04 (flag parecida não serve): CONFIRMADO.**

---

## 5. A BATERIA DA SANACORE — conferência, saída calculada e crítica (ponto 5)

Arquivo: `remediation/cases/ERP-LEGACY-001-CASE-003/PROVA_GUARDA_APPLY_MIGRATIONS.cjs`
(existe **apenas** no worktree `sana/ERP-LEGACY-001/CASE-003`; não está no worktree
principal).

### 5.1 Fidelidade da cópia — conferida antes de aceitar qualquer resultado

A bateria **não** importa o script; **copia** o código. Uma cópia pode divergir do
original e produzir um verde falso. Confronto linha a linha, original × cópia:

| Elemento | Original (`apply-pending-migrations.cjs`) | Cópia (`PROVA_...cjs`) | Idêntico? |
|---|---|---|---|
| `FLAG_CONFIRMACAO` | `:55` | `:89` | Sim, literal |
| `resolveDbName` | `:70-72` | `:91-93` | Sim, literal |
| `sinaisDeProducao` | `:84-90` | `:95-101` | Sim, literal |
| `avaliarAlvo` | `:101-114` | `:103-116` | Sim, literal |
| `assertAlvoAutorizado` (árvore de decisão) | `:131-154` | `:118-131` | Sim quanto à **decisão**; o texto das mensagens foi encurtado (redução declarada no cabeçalho `:85-86` da bateria) |

A redução do texto das mensagens é aceitável e está declarada: as asserções que
inspecionam mensagem (`AM-03`, `AM-04`, `AM-05`) verificam apenas os marcadores
`RECUSADO` / `ATENCAO` / o eco do `DB_NAME`, que estão preservados. **Nenhuma
divergência de lógica entre original e cópia.**

### 5.2 Saída da bateria — CALCULADA por traçado, NÃO capturada (ver §0)

Traçado determinístico de cada caso contra o código de `:89-131` da bateria
(`descartavel = /(_test|_ci)$/i.test(dbName) && sinais.length === 0`;
`confirmado = argv.includes('--confirmar-banco-real')`; recusa sse
`!descartavel && !confirmado`):

| Caso | `dbName` resolvido | `sinais` | `descartavel` | `confirmado` | Decisão | Esperado | Bate |
|---|---|---|---|---|---|---|---|
| AM-01 | `erp_evok_audio_test` | `[]` | true | false | SEGUE | SEGUE | Sim |
| AM-02 | `erp_evok_audio_ci` | `[]` | true | false | SEGUE | SEGUE | Sim |
| AM-03 | `erp_evok_audio` | `[]` | false | false | RECUSA (msg com `RECUSADO` + `erp_evok_audio`) | RECUSA | Sim |
| AM-04 | `erp_evok_audio` | `[]` | false | true | SEGUE com `ATENCAO` | SEGUE | Sim |
| AM-05 | `erp_evok_audio` (default, env `{}`) | `[]` | false | false | RECUSA | RECUSA | Sim |
| AM-06 | `erp_evok_audio` (`DB_NAME=''`) | `[]` | false | false | RECUSA | RECUSA | Sim |
| AM-07 | `erp_evok_audio_testing` | `[]` | false | false | RECUSA | RECUSA | Sim |
| AM-08 | `erp_evok_audio_cix` | `[]` | false | false | RECUSA | RECUSA | Sim |
| AM-09 | `erp_evok_audio_test_extra` | `[]` | false | false | RECUSA | RECUSA | Sim |
| AM-10 | `erp_evok_audio_TEST` | `[]` | true (`/i`) | false | SEGUE | SEGUE | Sim |
| AM-11 | `erp_evok_audio_test` | `['NODE_ENV=production']` | false | false | RECUSA | RECUSA | Sim |
| AM-12 | `erp_evok_audio_test` | `[DB_HOST casa /prod/i]` | false | false | RECUSA | RECUSA | Sim |
| AM-13 | `erp_evok_audio_test` | `['NODE_ENV=production']` | false | true | SEGUE | SEGUE | Sim |
| AM-14 | `erp_evok_audio` | `[]` | false | false (`--confirmar`) | RECUSA | RECUSA | Sim |
| AM-15 | `erp_evok_audio` | `[]` | false | false (`--confirmar-banco`) | RECUSA | RECUSA | Sim |
| AM-16 | `erp_evok_audio` | `[]` | false | true (flag em 2ª posição) | SEGUE | SEGUE | Sim |
| AM-17 | `erp_evok_audio` | `[]` | false | false (env inventadas) | RECUSA | RECUSA | Sim |
| AM-18 | `erp_prod_test` | `[DB_NAME casa /prod/i]` | false | false | RECUSA | RECUSA | Sim |
| AM-19 | consistência: `avaliarAlvo({},[]).dbName` = `resolveDbName({})` = `erp_evok_audio` | — | — | — | sem divergência | sem divergência | Sim |
| AM-20 | filtro: `[]→'.'` e `['^20260807']→'^20260807'` | — | — | — | sem divergência | sem divergência | Sim |

Saída **calculada** (formato produzido por `:271-284` da bateria):

```
CASE-003 (extensao) — prova da guarda de apply-pending-migrations.cjs (SanaCore)

PASS  AM-01 sufixo _test, sem flag, deve SEGUIR (uso legitimo nao pode ganhar atrito)
PASS  AM-02 sufixo _ci, sem flag, deve SEGUIR
PASS  AM-03 banco REAL (erp_evok_audio) SEM a flag deve RECUSAR, e a mensagem deve ecoar o alvo lido
PASS  AM-04 banco REAL COM a flag --confirmar-banco-real deve SEGUIR (caminho legitimo de deploy)
PASS  AM-05 (AGRAVANTE) DB_NAME AUSENTE do ambiente — resolveDbName cai no default do banco REAL e a guarda avalia o valor RESOLVIDO — deve RECUSAR
PASS  AM-06 DB_NAME='' (vazio explicito) — mesmo default por falsiness — deve RECUSAR
PASS  AM-07 sufixo PARECIDO mas nao exato (_testing) deve RECUSAR
PASS  AM-08 sufixo PARECIDO mas nao exato (_cix) deve RECUSAR
PASS  AM-09 "_test" no MEIO, nao no fim (_test_extra) deve RECUSAR
PASS  AM-10 case-insensitividade: _TEST deve SEGUIR (regex tem /i, por paridade com run-api-suite.cjs:530)
PASS  AM-11 sufixo _test MAS NODE_ENV=production deve RECUSAR sem flag (as tres variaveis de run-api-suite.cjs:524-529 desqualificam o alvo como descartavel)
PASS  AM-12 sufixo _test MAS DB_HOST casa /prod/i deve RECUSAR sem flag
PASS  AM-13 sufixo _test com sinal de producao, COM a flag, deve SEGUIR (a flag cobre todo alvo nao descartavel)
PASS  AM-14 flag PARECIDA nao serve: "--confirmar" (a flag de limpar-dados-transacionais.cjs) NAO satisfaz esta guarda — comparacao e por igualdade exata
PASS  AM-15 flag PARECIDA nao serve: "--confirmar-banco" (prefixo) deve RECUSAR
PASS  AM-16 flag em SEGUNDA posicao, depois do filtro regex, deve SEGUIR (ordem dos argumentos nao importa: argv.includes)
PASS  AM-17 NAO existe bypass por variavel de ambiente: env inventada nao autoriza nada
PASS  AM-18 DB_NAME="erp_prod_test" — casa sufixo _test MAS casa /prod/i — deve RECUSAR sem flag
PASS  AM-19 consistencia: o valor avaliado pela guarda e o MESMO passado ao Sequelize (ambos chamam resolveDbName(process.env); apply-pending-migrations.cjs:156 e :160) — sem divergencia
PASS  AM-20 a flag NAO e consumida como filtro regex: apos remove-la, o posicional volta a ser o filtro (apply-pending-migrations.cjs:174-175) — sem isso o script diria "Nada pendente." em silencio

20/20 casos bateram com o esperado.

Todos os casos bateram com o comportamento esperado.
Nenhuma conexao de banco foi aberta por este arquivo (APR-2026-016).
```

Exit code calculado: `0` (`failures === 0` → `process.exitCode = 0`).

**Aviso de leitura obrigatório:** o bloco acima é **derivado**, não capturado.
Quem for anexar a captura real deve comparar caractere a caractere; qualquer
divergência invalida este parágrafo e não o restante do relatório (§1, §3, §4 e §6
independem da bateria — são leitura de código).

### 5.3 Crítica própria à bateria — dois casos são tautológicos

Conferir a bateria é parte do reteste, e ela tem uma fraqueza que precisa constar:

- **`AM-20` não testa o script.** Ele reimplementa o `filter` dentro do próprio
  arquivo de teste (`:257-259`) e verifica que a reimplementação funciona. Prova que
  a expressão escrita no teste funciona — **não** prova que `apply-pending-migrations.cjs:174`
  contém aquela expressão. A prova real do ponto 3 é a leitura do arquivo, feita em
  §3.2 deste relatório.
- **`AM-19` tem a mesma natureza**: chama `avaliarAlvo` e `resolveDbName` da *cópia*
  e compara — a consistência guarda×conexão é uma propriedade da posição das
  chamadas em `:102` e `:160` do arquivo real, provada por leitura em §2, não pela
  cópia.
- Em geral: por ser cópia e não importação, **toda** a bateria vale exatamente o que
  vale a conferência de fidelidade do §5.1. Sem o §5.1, ela é autorreferente. Com o
  §5.1, é válida. Registro como `OBS-EXT-05` — a técnica é a mesma do
  `RETEST_BATTERY_CASE003.cjs` da primeira parte e tem a mesma limitação, já
  declarada lá; não é regressão, é o teto do método.

### 5.4 Caso extra que o implementador não pensou (exigido pelo ponto 5)

Acrescento quatro casos. O primeiro é o materialmente relevante.

**`VC-EXT-01` — `DB_NAME` com `\r` residual (CRLF do Windows) em banco de teste
legítimo: `DB_NAME='erp_evok_audio_test\r'`.**

Traçado: `/(_test|_ci)$/i` tem âncora `$` de fim absoluto de string (sem flag `m`).
`'erp_evok_audio_test\r'` termina em `\r`, **não casa** → `descartavel = false` →
sem flag, **RECUSA um banco de teste legítimo**.

O `RETEST_REPORT.md` da primeira parte encontrou este mesmo input (`L11`/
`OBS-CASE003-03`) e o classificou, corretamente **para aquele desenho**, como
"falso-negativo de conveniência, direção sempre segura". **Neste desenho a conclusão
se inverte, e essa inversão é o achado.** Lá, recusar demais só custava atrito, e não
havia saída senão corrigir o `.env`. Aqui, a mensagem de recusa (`:141-142`) **ensina
a flag de contorno** ao operador, na mesma tela. O operador cujo banco de teste é
recusado por um `\r` invisível não vai depurar o `.env`: vai colar
`--confirmar-banco-real`, e vai funcionar. Feito isso uma vez, a flag deixa de ser
"o momento deliberado de confirmar produção" e passa a ser "o que se digita quando o
script reclama". **O custo do falso-negativo, num desenho com escape, não é atrito —
é erosão do significado do escape.** Qualquer causa de falso-negativo (`\r`, espaço
final, `DB_NAME` com aspas residuais do `.env`, banco de teste nomeado
`teste_erp` em vez de `erp_test`) tem esse efeito.

Isto **não reprova** a implementação: ela faz o que a especificação mandou, e a
alternativa (normalizar com `trim()` antes do regex) não foi pedida e não pode ser
introduzida por mim (Regra 2) nem por analogia pela SanaCore (Regra 6). Registro
como `OBS-EXT-01` com uma recomendação nominal ao dono em §7.

**`VC-EXT-02` — flag na forma `--flag=valor`: `--confirmar-banco-real=1`.**
`includes` é igualdade exata → `confirmado = false` → **RECUSA**. Direção segura.
Vale registrar porque `--flag=valor` é hábito de linha de comando muito difundido e
o implementador testou prefixo (`--confirmar-banco`) e flag alheia (`--confirmar`),
mas não a forma com `=`. Bônus verificado: como a recusa acontece em `:145` **antes**
de `:174`, o argumento malformado nunca chega a ser tratado como filtro regex — as
duas correções se protegem mutuamente na ordem certa.

**`VC-EXT-03` — flag em caixa diferente: `--CONFIRMAR-BANCO-REAL`.**
`includes` é case-sensitive → **RECUSA**. Assimetria deliberada e correta a registrar:
o sufixo do banco é comparado com `/i` (aceita `_TEST`), a flag é comparada
case-sensitive (rejeita `--CONFIRMAR...`). As duas assimetrias apontam para o lado
seguro, mas não estão documentadas em lugar nenhum. `OBS-EXT-02`.

**`VC-EXT-04` — a confirmação autoriza o ALVO, não o CONJUNTO de DDL.**
Com `--confirmar-banco-real` e nenhum posicional, `posicionais[0]` é `undefined` →
`pattern = /./` → **todas** as migrations pendentes são aplicadas ao banco real. O
operador confirma "sim, é o banco real" e recebe, com essa única confirmação, a
aplicação de um conjunto de DDL que ele não enumerou e que o script não lhe mostra
antes de aplicar (o `APLICANDO: <arquivo>` de `:192` é impresso **durante**, não
antes). Não há `--dry-run`. Isto **não** é regressão — era assim antes da extensão —
e não está no escopo autorizado. Mas é a consequência direta de existir escape: o
gesto de confirmar é uma vez, e o que ele libera é ilimitado. `OBS-EXT-06`.

---

## 6. LIMITES DECLARADOS PELO IMPLEMENTADOR — avaliação (ponto 6)

### 6.1 (a) `npm run migration:up` cru continua sem guarda — **CONFIRMADO, e é o limite mais importante**

Verificado por leitura, não por aceitação do relato:

- `server/package.json:12` → `"migration:up": "npm run build && node src/scripts/run-sequelize-cli.cjs db:migrate"`.
- `server/src/scripts/run-sequelize-cli.cjs` (29 linhas, lido por inteiro): faz
  `spawnSync` do `sequelize-cli` com `--env`, `--config` e `--migrations-path`.
  **Nenhuma leitura de `DB_NAME`, nenhuma checagem de `NODE_ENV`, nenhuma guarda de
  qualquer tipo.** Aplica DDL em qualquer banco que o
  `config/sequelize-cli.config.cjs` resolver.

Avaliação: **aceitável como limite deste caso, inaceitável como estado final.** É
aceitável agora porque (i) o dono não autorizou tocar esse caminho, (ii) `APR-2026-025`
e `APR-2026-026:1103` proíbem expressamente ampliação por analogia. Mas o efeito
prático precisa ser dito sem suavização: **a guarda protege o caminho recomendado e
deixa aberto o caminho proibido.** Os dois documentos operacionais dizem "nunca use
`migration:up` cru" (`docs/governance/ESTADO_SESSAO_2026-08-09.md:354`) — ou seja, o
caminho sem guarda é contido **exatamente pela disciplina do operador**, que é a
definição literal de `RC-PROC-01`. Este caso reduz a superfície de `RC-PROC-01`; não
a fecha, e um relatório de encerramento que sugerisse o contrário seria falso.
Registrado em §7 como `PEND-EXT-01`.

### 6.2 (b) Sufixo é heurística de nomenclatura, não isolamento — **CONFIRMADO, aceitável**

Verdadeiro por construção: `/(_test|_ci)$/i` sobre uma string. Um banco de produção
chamado `qualquer_test` passaria sem atrito e sem confirmação. Aceitável: é
exatamente o padrão que `run-api-suite.cjs:530-536` já usa e que o dono mandou
replicar, e a mitigação real (banco de dev separado do real) é decisão estrutural
aberta, fora deste caso desde a origem. Registro que a extensão aqui é **melhor** que
o padrão de referência em um ponto e **pior** em outro: melhor porque `sinaisDeProducao`
(`:84-90`) checa as três variáveis (`NODE_ENV`, `DB_NAME`, `DB_HOST`) — o que a
correção dos dois scripts de `d4c166e` não faz (ver `OBS-CASE003-01` do relatório
original); pior porque nada disso é absoluto, tudo cede à flag (`AM-13` prova que
cede: `_test` + `NODE_ENV=production` + flag → segue).

### 6.3 (c) O hook continua sem enxergar o vetor — **CONFIRMADO por leitura do hook**

`.claude/hooks/org-isolation.js:148-149`:

```js
const PROD_DB_TOKEN_SOURCE = 'erp_evok_audio[A-Za-z0-9_]*';
const SAFE_DB_SUFFIX = /(_test|_ci)$/i;
```

e `findProdDbRef` (`:159-184`) casa esse token **nas strings do `tool_input`**. O
comando `node server/scripts/apply-pending-migrations.cjs --confirmar-banco-real`
**não contém a substring `erp_evok_audio`** — o hook não tem o que casar e libera.
Confirmado: o hook não vê este vetor, nem antes nem depois da extensão.

Avaliação — e aqui está a consequência que o implementador declarou de forma neutra
demais: para o vetor **agente** (que é a origem de `RC-PROC-01` e de
`AUD-PROC-CUSTODIA-01`), a guarda in-script é agora a **única** barreira, e ela é
totalmente superável por um agente que leia a mensagem de recusa e reenvie o comando
com a flag — que é o comportamento natural de um agente diante de uma instrução
explícita na saída de erro. A guarda contém acidente; não contém agente diligente.
Isso é consistente com o que `APR-2026-026` já aceitou para `CE-02` ("cobre acidente
de configuração, não evasão deliberada"), mas aqui nem evasão é necessária: o
contorno é o caminho documentado. **Aceitável dentro do desenho aprovado**, desde que
conste assim em qualquer relatório de encerramento de `RC-PROC-01` — registrado como
`PEND-EXT-02`.

### 6.4 Os dois scripts não corrigidos — pendência de decisão, com uma correção factual

Ambos verificados por leitura própria no `REMEDIATION_COMMIT`. A conduta da SanaCore
foi **correta**: `REMEDIATION_CASE` §7 manda listar, não corrigir, e foi o que fez.

- **`comparar-bancos.cjs:45-47`** — confirmado exatamente como declarado:
  `const DEV = argA || process.env.DB_NAME || 'erp_evok_audio';` e
  `const TEST = argB || \`${...}_test\`;`. Verifiquei o cabeçalho `:38-43`, que
  afirma ser somente leitura. **Pendência de decisão, risco baixo** — mas registro
  que "somente leitura" é uma afirmação do cabeçalho que este reteste **não
  verificou exaustivamente** (não li as funções `readSchema`/`readIndexes`/
  `readConstraints`/`summary` linha a linha); verificar isso não estava no escopo
  desta extensão e não deve ser presumido cumprido.

- **`criar-aprovador.cjs` — a declaração do implementador está IMPRECISA, e a
  imprecisão é para o lado errado.** A instrução recebida diz "escreve usuário,
  guarda só de `NODE_ENV`". Busquei `NODE_ENV` e `production` no arquivo inteiro:
  **a única ocorrência de `NODE_ENV` é no comentário de cabeçalho `:18`, e ela
  descreve a guarda de OUTRO script** (`seed-usuarios-departamentos.cjs`). Não há
  nenhuma ocorrência de `production` no código. **O script não tem guarda de
  `NODE_ENV` nenhuma.** As únicas recusas são de validação de entrada
  (`:247-249` e-mail ausente, `:251-256` domínio `@teste.evokaudio` proibido,
  `:259-261` perfil desconhecido). E `connect()` (`:173-188`) tem
  `process.env.DB_NAME || 'erp_evok_audio'` em `:178`, com comentário `:174-176`
  declarando o default para o banco REAL como **deliberado**. O script escreve
  (`UPDATE`/`INSERT` em `access_profiles`, `access_profile_permissions` e `users`:
  `:212`, `:217`, `:225`, `:230`, `:293`, `:301`, `:311`).

  Ou seja: é um script que **grava usuário e permissão no banco real por padrão, sem
  guarda alguma de ambiente ou de alvo**. Mantenho a classificação de **pendência de
  decisão do dono** (não é falha da remediação — não foi nomeado, e corrigi-lo seria
  a ampliação por analogia que `APR-2026-025`/`APR-2026-026:1103` vedam), mas com a
  caracterização corrigida, que é mais grave que a declarada. `PEND-EXT-03`.

---

## 7. VEREDITO

### Por critério

| ID | Verificação | Resultado |
|---|---|---|
| `RT-EXT-01` | Guarda precede `new Sequelize` e todo DDL | **PASSOU** (§1, leitura integral) |
| `RT-EXT-02` | Guarda avalia `DB_NAME` resolvido; fonte única (`resolveDbName`) | **PASSOU** (§2, duas ocorrências de `DB_NAME` no arquivo, ambas na função) |
| `RT-EXT-03` | Flag não vira filtro; bug confirmado no estado anterior | **PASSOU** nos dois sentidos (§3) |
| `RT-EXT-04` | `--confirmar` e `--confirmar-banco` não satisfazem a guarda | **PASSOU** (§4, `includes` por igualdade exata) |
| `RT-EXT-05` | Bateria da SanaCore fiel ao original e coerente | **PASSOU** com ressalva de método (§5.1, §5.3); **execução real pendente** (§0) |
| `RT-EXT-06` | Caso extra da VeriCore | **4 casos acrescentados** (§5.4); nenhum deles quebra a guarda no sentido perigoso |
| `RT-EXT-07` | Notas de cabeçalho e runbooks consistentes com o código | **PASSOU quanto ao comportamento** (`:22-42` do script, `ESTADO_SESSAO_2026-08-07.md:101-105`, `ESTADO_SESSAO_2026-08-09.md:355-358` descrevem corretamente a guarda) — **REPROVADO quanto à citação de autorização**, ver `PEND-EXT-05` |

### Resultado

RESULT: **RETEST_PASSED** — restrito à **conformidade técnica da implementação** com
o desenho descrito na instrução de reteste (confirmação explícita obrigatória, escape
deliberado por flag única).

Não encontrei nenhum caminho, argumento, variável de ambiente, ordem de argumentos ou
valor de `DB_NAME` que faça o script aplicar DDL em alvo não descartável **sem** a
flag `--confirmar-banco-real`. A existência do escape foi tratada como desenho
aprovado, conforme instruído, e não como defeito.

**Este `RETEST_PASSED` NÃO é, e não deve ser citado como:** autorização de escopo,
fechamento de `CE-01`…`CE-09`, fechamento de `RC-PROC-01`, fechamento de
`AUD-PROC-CUSTODIA-01`, nem aceitação de risco residual. Nenhuma dessas coisas é
declarada aqui, e as duas primeiras não são autoridade da VeriCore.

### `PEND-EXT-05` — pendência BLOQUEANTE de rastreabilidade (não é defeito de código)

Verificação que não estava na lista pedida, mas que é obrigatória por Regra 7 e
Regra 18, e cujo resultado é desfavorável:

- O cabeçalho de `apply-pending-migrations.cjs:22-23` atribui esta extensão a
  **`APR-2026-026`**.
- `coretriad/governance/APPROVALS.md:1002-1104` — li `APR-2026-026` inteira. Ela
  trata de `CE-02` (evasão do hook) e de três achados dos verificadores
  (regex de conjugação, ambiguidade de `SYSTEM_MAP.md`, downgrade em CI).
  **Não menciona `apply-pending-migrations.cjs`, migrations, DDL nem
  `--confirmar-banco-real`.** E encerra, em `:1103`, com:
  *"**Não** autoriza ampliação por analogia a nenhum outro controle ou script."*
- `APR-2026-025` (`:972-998`), a aprovação que originou o caso, delimita:
  *"**Escopo:** exatamente os dois scripts nomeados + notas de cabeçalho. **Não**
  autoriza ampliação por analogia a outros scripts."*
- `REMEDIATION_CASE` §7 (FORA): *"Qualquer outro script de `server/scripts/` não
  nomeado pelo dono... Se a SanaCore encontrar outros scripts destrutivos com o mesmo
  gap, LISTE-OS neste caso como observação — não os corrija."*
- Não existe `APR-2026-027`, não existe `EMENDA-01` no `REMEDIATION_CASE` (§3 exige
  esse formato para retificação), e não há em `coretriad/` nenhuma ocorrência de
  `apply-pending` ou `confirmar-banco-real`.

Interpretação, com o cuidado que a Regra 20 exige: a instrução que recebi afirma que
o desenho desta extensão foi **decisão explícita do dono**, e não tenho motivo para
duvidar. Mas mensagem de agente não é registro de decisão humana (Regra 18) e não
substitui artefato versionado (Regra 7). O estado verificável hoje é: **a única
autorização registrada que o código cita é uma que diz o oposto do que ele fez.**

Isto **não** reprova a implementação (§1-§5 estão corretos) e **não** é corrigível
por mim (Regra 2 — não altero `server/`, e não sou autoridade de Control Plane).
Registro como **bloqueante para a promoção desta branch para fora de
`sana/ERP-LEGACY-001/CASE-003`**, com duas ações que não são minhas:

1. **CoreTriad Director / dono:** registrar a autorização desta extensão em
   `APPROVALS.md` (texto verbatim, `APR-2026-027` ou equivalente) e/ou como
   `EMENDA-01` ao `REMEDIATION_CASE`, na forma que o próprio §3 do caso exige.
2. **SanaCore:** depois disso, corrigir a citação em
   `apply-pending-migrations.cjs:23` para apontar à aprovação real. Enquanto não for
   corrigida, o cabeçalho contém uma afirmação falsa sobre governança — a mesma
   classe de defeito que `RT-CASE003-06` reprovaria em uma nota desatualizada.

### O que permanece aberto

| ID | Item | Natureza | Dono da decisão |
|---|---|---|---|
| `PEND-EXT-01` | `npm run migration:up` / `run-sequelize-cli.cjs` aplica DDL em qualquer banco, sem guarda alguma (verificado, §6.1). Contido só por instrução em runbook | Superfície de `RC-PROC-01` que continua aberta | Dono |
| `PEND-EXT-02` | O hook não enxerga este vetor (§6.3): a guarda in-script é a única barreira, e a própria mensagem de recusa ensina o contorno ao agente | Residual de desenho, coerente com `APR-2026-026`/`CE-02` | Dono |
| `PEND-EXT-03` | `criar-aprovador.cjs`: escreve `users`/`access_profiles`/`access_profile_permissions`, default para o banco REAL em `:178`, **sem nenhuma guarda de ambiente** (a declaração de "guarda só de `NODE_ENV`" é imprecisa — não há guarda de `NODE_ENV`, §6.4) | Pendência de decisão, **não** falha da remediação | Dono |
| `PEND-EXT-04` | Executar de fato `node remediation/cases/ERP-LEGACY-001-CASE-003/PROVA_GUARDA_APPLY_MIGRATIONS.cjs` e anexar a captura, confrontando com a saída calculada em §5.2 | Pendência de execução (§0) | Qualquer agente/humano com `node` |
| `PEND-EXT-05` | Autorização desta extensão não registrada em artefato versionado; o código cita `APR-2026-026`, que veda ampliação por analogia | **Bloqueante para promoção da branch** | Director / dono; depois SanaCore |
| `PEND-EXT-06` | `comparar-bancos.cjs:45-47` sem guarda; "somente leitura" é afirmação de cabeçalho **não verificada exaustivamente** por este reteste | Pendência de decisão, risco baixo | Dono |
| `OBS-EXT-01` | Falso-negativo do sufixo (`\r`/espaço/aspas em `DB_NAME`) **erode o significado do escape** neste desenho, ao contrário do que ocorria no desenho sem escape (§5.4). Mitigação óbvia (`trim()`) não foi autorizada e não pode ser introduzida por analogia | Observação de desenho | Dono |
| `OBS-EXT-02` … `OBS-EXT-06` | Assimetria de case (sufixo `/i` × flag exata); default de `DB_HOST` duplicado em `:108`/`:164`; ergonomia da mensagem de flag parecida; tautologia de `AM-19`/`AM-20`; a confirmação autoriza o alvo e não o conjunto de DDL, sem `--dry-run` | Observações, nenhuma bloqueante | — |

---

## Regras respeitadas nesta etapa

- **Regra 2:** nenhum arquivo de `server/scripts/` alterado. O único arquivo escrito
  por este agente é este relatório.
- **Regra 15:** `RETEST_REPORT.md` não foi lido-para-reescrever nem modificado. Este
  é arquivo novo, com ID próprio de critérios (`RT-EXT-*`), sem sobrepor os
  `RT-CASE003-*` originais.
- **Regra 4:** `RETEST_PASSED` declarado por agente VeriCore que não escreveu a
  correção.
- **Regra 7 / 18:** autorização não foi inferida de mensagem de agente; a divergência
  documental foi registrada (`PEND-EXT-05`) em vez de suposta resolvida.
- **`APR-2026-016`:** nenhuma conexão de banco aberta, real ou de teste.
- Nenhum `CE-*`, nenhum `RC-PROC-01`, nenhum `FINDING CLOSED` declarado.
- Nenhuma evidência desfavorável omitida: a impossibilidade de executar a bateria
  (§0), a tautologia de dois casos da bateria (§5.3), a imprecisão da declaração
  sobre `criar-aprovador.cjs` (§6.4) e a citação de autorização inválida (§7)
  constam, ainda que reduzam a força do próprio veredito.
