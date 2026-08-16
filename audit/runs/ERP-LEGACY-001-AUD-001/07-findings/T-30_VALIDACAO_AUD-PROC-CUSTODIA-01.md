# T-30 — VALIDAÇÃO ADVERSARIAL (Regra 22) — `AUD-PROC-CUSTODIA-01`

```
VALIDATION_OF:  AUD-PROC-CUSTODIA-01
AUDIT_ID:       ERP-LEGACY-001-AUD-001
PROJECT_ID:     ERP-LEGACY-001
AUDIT_COMMIT:   c1311a6f76b512fef893f7e60d934179cae3409f
VALIDATED_BY:   vericore-finding-validator
DATA:           2026-08-16
MÉTODO:         READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT
FERRAMENTAS:    Read / Grep / Glob apenas. Nenhum Bash, nenhum comando de banco,
                nenhum teste, nenhum script executado.
```

## VEREDITO

| Eixo | Veredito |
|---|---|
| **Finding como um todo** | **`CONFIRMED`** |
| **Severidade** | **`HIGH` — MANTIDA** (tentativas de elevação a CRITICAL e de rebaixamento a MEDIUM executadas e ambas falhadas, §4) |
| **Confiança quanto ao fato** | `CONFIRMED` — sustentada |
| **Confiança quanto à causa-raiz de mecanismo (§6.2, 1ª metade: hook não avalia Bash)** | `CONFIRMED` — sustentada por leitura própria |
| **Sub-alegação §6.2, 2ª metade (`APPROVALS.md:787` "não corresponde a nenhum mecanismo")** | **`FALSE_POSITIVE` — REFUTADA.** Existe o mecanismo; é de aplicação, não hook (§3) |
| **Consequência transversal da consolidação ("toda a fila dinâmica correu sem controle técnico")** | **PARCIALMENTE REFUTADA** — imprecisa como escrita; procede se reescrita como "sem controle independente da plataforma" (§6) |
| **Encaminhamento** | Segue para tratamento como finding de **processo**; **não** aciona SanaCore sobre o ERP (nada há a corrigir no produto) |

A refutação foi tentada em cinco eixos, com ataque explícito a cada um. **Dois eixos
cederam parcialmente** (§3 e §6) e estão registrados como correções materiais. **O fato,
a causa-raiz principal e a severidade sobreviveram integralmente.**

---

## 1. EIXO 1 — O FATO. Tentativa de refutação: FALHOU. Fato `CONFIRMED`.

**Hipótese de refutação testada:** o alvo do comando não era `erp_evok_audio`, ou o
comando foi transcrito com erro, ou existe leitura em que o `-d` apontasse para outro
banco.

**Leitura direta de `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/G4_PRECONDICAO_BANCO_TESTE.md:10-27`:**

- `:15` — descrição em prosa: `docker exec evok-postgres psql -U evok_admin -d erp_evok_audio -c "..."`.
- `:23` — transcrição verbatim, integral:
  `docker exec evok-postgres psql -U evok_admin -d erp_evok_audio -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"`
- `:24` — saída: `207`, qualificada pelo próprio executor como "não solicitada, não deveria ter sido obtida por mim".

O argumento `-d` recebe a string **exata** `erp_evok_audio`, sem sufixo, seguida de espaço
e `-c`. **Não há ambiguidade lexical possível:** o mesmo relatório usa
`-d erp_evok_audio_test` em quinze linhas distintas (`:113,120,127,154,192,205,211,217,227,244,250,265,268`)
e `-d postgres` em duas (`:142,148`), demonstrando que o executor sabia grafar o alvo
correto e o grafou corretamente em todo o resto da trilha. A ocorrência única sem sufixo
não é erro de transcrição do relatório: é o desvio.

**Alvo é produção real:** `coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md:80-84` classifica
como PRODUÇÃO REAL "o banco por trás de `docker-compose.yml`"; `docker-compose.yml:7`
define `POSTGRES_DB: erp_evok_audio`. Cadeia fechada por leitura própria.

**Norma violada, relida na fonte:** `PROJECT_STATE.md:103-106` — *"**Proibido, sem exceção**:
executar suíte de teste, rodar script de diagnóstico, ou qualquer comando que abra conexão
com o banco de dados real — **nem para 'só contar linhas'** ou 'só confirmar comportamento'.
Vale mesmo que o comando pareça inofensivo ou somente leitura no SQL."* O texto nomeia
literalmente o caso ocorrido. `APPROVALS.md:941-948` (`APR-2026-024`) confirmo verbatim:
*"A Decisão C autoriza recriar o banco de teste, e só isso… não autoriza DDL nem DML em
`erp_evok_audio` — banco **PRODUÇÃO REAL** por `APR-2026-016`, reafirmado intocável em
`APR-2026-021` Parte D"*.

**Veredito do eixo:** fato reprodutível documentalmente, tecnicamente demonstrável,
auto-reportado com comando verbatim. Nenhuma leitura alternativa sobrevive. `CONFIRMED`.

---

## 2. EIXO 2 — CAUSA-RAIZ DE MECANISMO (o hook). Tentativa de refutação: FALHOU. `CONFIRMED`.

Este é o eixo em que a refutação seria mais valiosa (um segundo mecanismo em outro lugar
derrubaria a severidade sem derrubar o fato). **Procurei o segundo mecanismo e ele não
existe no caminho que falhou.** Verificado por leitura própria, não por citação:

**a) `.claude/settings.json` — arquivo inteiro lido (15 linhas).**
- `:3` — existe **um único** array `PreToolUse`, com **uma única** entrada.
- `:5` — matcher: `"Write|Edit|MultiEdit|NotebookEdit|Read|Grep|Glob|Bash"`. **`Bash` está no matcher** — confirmado.
- `:9` — comando único: `node .claude/hooks/org-isolation.js`.
- **Não existe chave `permissions` no arquivo.** Não há `deny`, `allow` ou `ask`. Não há
  `PreToolUse` adicional, `PostToolUse`, `UserPromptSubmit` ou qualquer outro hook.
  O arquivo tem 15 linhas e não contém nada além do acima.

**b) Existe outro hook?** `Glob` de `.claude/**/*.{json,js,cjs,mjs,sh,ps1}` retorna
**exatamente dois arquivos**: `.claude/hooks/org-isolation.js` e `.claude/settings.json`.
Não há `settings.local.json`, não há segundo script de hook, não há hook em outra linguagem.

**c) `.claude/hooks/org-isolation.js` — arquivo inteiro lido (197 linhas).** Ordem real de
avaliação, a partir do `end` do stdin (`:107`):
1. `:109-114` — parse; falha ⇒ `block` (fail-closed). Correto, mas irrelevante aqui.
2. `:130-132` — **única avaliação que alcança `Bash`**: selo de artefato. Bloqueia
   qualquer ferramenta de subagente cujo `tool_input` case o regex `SEALED` de `:78`,
   que é `/coretriad\/locks|answer[-_]key/i`. **Nada relacionado a banco de dados,
   `psql`, `docker`, `erp_evok_audio` ou sufixo `_test`.**
3. `:134` — `if (!WRITE_TOOLS.has(tool)) return respond('approve', 'tool não é de escrita');`
   e `WRITE_TOOLS` em `:67` é `new Set(['Write','Edit','MultiEdit','NotebookEdit'])`.

   **Consequência verificada, não inferida:** para `tool === 'Bash'`, o fluxo termina em
   `:134` com `approve`. Todo o resto do arquivo (`:136-196` — canonicalização de caminho,
   `ORG_RULES`, `deniedPaths`, worktree) é **código inalcançável para Bash**.
4. `:196` — o `approve` residual para agente fora das `ORG_RULES` sequer é atingido por Bash;
   ele importa para o eixo §6.3 do finding (Write do agente `docker`), não para Bash.

**A alegação do finding é literalmente correta**, inclusive na única exceção que ele
próprio ressalva (o selo de `:78`/`:130-132`). Não encontrei nenhum segundo mecanismo
no caminho `Bash → psql → erp_evok_audio`. A Regra 23 do `CLAUDE.md` está, para esta
classe de risco, descumprida — e isso é fato de leitura, não opinião.

**Ambiente sem fronteira, reconferido:** `docker-compose.yml:2-4` (um serviço `postgres`,
container `evok-postgres`, `postgres:16-alpine`), `:7-8` (`POSTGRES_DB: erp_evok_audio`,
`POSTGRES_USER: evok_admin`), `:48-49` (a API usa `DB_NAME: erp_evok_audio`,
`DB_USER: evok_admin`). `DYN_VERIFICACAO_BATERIA_01.md:78-81` mede `rolsuper = true` para
`evok_admin` — a âncora citada pelo finding existe e diz o que ele afirma. Produção e
teste no mesmo container, sob a mesma role superusuária: a separação é o valor de `-d`.

**Veredito do eixo:** `CONFIRMED`. Refutação tentada em três frentes (segundo hook,
`permissions.deny`, avaliação anterior no próprio hook) e todas falharam.

---

## 3. EIXO 3 — A AFIRMAÇÃO DE GOVERNANÇA. **REFUTADA.** Sub-alegação = `FALSE_POSITIVE`.

Este é o eixo que cedeu, e é o resultado mais importante desta validação.

**O texto, relido na fonte.** `coretriad/governance/APPROVALS.md:787`, célula do gate G4:
*"A fila `DYN-01…DYN-08` fica autorizada **contra `erp_evok_audio_test`** … **O banco real
permanece proibido** — `APR-2026-016` intacto e o guard que recusa banco sem sufixo de
teste segue ativo."* Citação do finding: fiel.

**A leitura do autor NÃO é justa.** O finding conclui (§6.2) que a afirmação *"não
corresponde a nenhum mecanismo encontrado em `.claude/`"* — e daí salta para *"o 'guard'
existente é a carta de responsabilidades de cada agente e a instrução do prompt, não um
hook"*. A primeira metade é verdadeira e irrelevante (o texto de `:787` não promete um
hook). **A segunda metade é falsa.** O guard de aplicação existe, é versionado, é executável
e sua mensagem de erro é quase palavra por palavra a da aprovação:

**`server/scripts/run-api-suite.cjs:530-536`** — lido por mim:

```js
if (!/(_test|_ci)$/i.test(process.env.DB_NAME || '')) {
  throw new Error(
    `run-api-suite.cjs recusou rodar: DB_NAME="${process.env.DB_NAME}" nao parece ser um banco de teste `
    + '(esperado sufixo "_test" ou "_ci"). Esta suite sobrescreve dados de forma destrutiva — ...'
  );
}
```

E, imediatamente antes, **`:524-529`** recusa também por `NODE_ENV === 'production'` ou por
`/prod/i` em `DB_NAME`/`DB_HOST`. O comentário de `:517-523` declara a razão de existir:
*"esta suite escreve fixtures destrutivos … nao existe isolamento de banco por codigo, so
por configuracao"*.

**Portanto:** "o guard que recusa banco sem sufixo de teste segue ativo" é uma afirmação
**verdadeira** de `APPROVALS.md:787`, no escopo em que foi feita (a fila DYN executada pela
suíte). **Não há divergência governança × mecanismo (Regra 20) nesse ponto.** A sub-alegação
do finding é **`FALSE_POSITIVE` e deve ser retirada** — pelo autor ou pelo director, nunca
por mim (Regras 2 e 15: não edito finding de terceiro).

**Por que isso NÃO refuta o finding nem baixa a severidade.** O guard de `run-api-suite.cjs`
protege **um** caminho: a suíte de integração, invocada por `npm run test:integration`, que
lê `DB_NAME` do ambiente. Ele **não intercepta, e não tem como interceptar**, um
`docker exec … psql -U evok_admin -d erp_evok_audio -c "…"` digitado por um agente — que
não passa por Node, não lê `DB_NAME` e não invoca o script. **O vetor que falhou continua
sem controle algum.** O guard existente refuta a redação absoluta do finding
(*"não existe, hoje, nenhum controle técnico sobre conexões de banco no CoreTriad"*, §6.2),
que é **exagerada e deve ser corrigida por adição**, mas não toca o incidente.

**Efeito líquido:** o finding perde uma das três causas-raiz declaradas (a de governança).
Mantém as outras duas (§6.1 credencial/ambiente e §6.2 primeira metade, hook×Bash), que são
as que explicam o incidente. Severidade inalterada — ver §4.

---

## 4. EIXO 4 — SEVERIDADE. Atacada dos dois lados. **HIGH mantida.**

### 4.1 Tentativa de ELEVAR a CRITICAL — rejeitada

Argumento a favor: conexão de agente automatizado, com **superusuário**, ao banco de
produção real da empresa, sob proibição textual quádrupla, num ambiente onde
`audit_logs`/`sale_invoices` não têm imutabilidade (`AUD-DB-01`/`FIND-ERP-002`) —
o caminho até dano irreversível estava aberto.

Rejeitado, e o raciocínio do autor (§5.3) resiste ao meu ataque: **severidade mede o
ocorrido; potencial não realizado é impacto, não severidade.** Impacto de integridade:
nulo (`G4_...:17-19,25`). Disponibilidade: nulo. Confidencialidade: restrita a um inteiro
de catálogo (`207`) derivável das migrations versionadas — nenhum dado de negócio. A
Regra 24 do `CLAUDE.md` reserva CRITICAL a uma classe nomeada e distinta desta. Elevar
diluiria a moeda `CRITICAL` desta run, hoje com 4 achados de risco material ao negócio.
**Não é CRITICAL.**

### 4.2 Tentativa de REBAIXAR a MEDIUM — rejeitada, mas o argumento do autor precisa de ajuste

O autor sustenta HIGH em §5.4 com: *"se um `SELECT` passa, um `TRUNCATE` também passaria —
nada no caminho distingue os dois"*. **Testei essa proposição contra o que li, e ela é
verdadeira apenas condicionalmente:**

| Caminho de execução | `SELECT` × `TRUNCATE` são distinguidos? | Prova |
|---|---|---|
| `docker exec … psql -d <db> -c "<sql>"` a partir de Bash de agente — **o vetor do incidente** | **NÃO.** Nada avalia o verbo, o `-d`, nem o comando | `org-isolation.js:134` + ausência de `permissions` em `settings.json` + só 2 arquivos em `.claude/` |
| `npm run test:integration` / `run-api-suite.cjs` | **SIM** — recusa antes de qualquer escrita se `DB_NAME` não terminar em `_test`/`_ci` ou parecer produção | `run-api-suite.cjs:524-536` |

A proposição do autor é **falsa como generalização** e **verdadeira exatamente onde
importa** — no caminho que produziu o incidente. Corrigida a redação, a conclusão se
mantém: no vetor ad-hoc de Bash, a única barreira é a obediência do agente, e essa
barreira **falhou uma vez em execução documentada**. Um controle cuja taxa de falha
observada é maior que zero e cujo modo de falha é "o agente não seguiu à risca" não é
controle, é convenção — e a norma violada nomeava literalmente o caso ("nem para só
contar linhas", `PROJECT_STATE.md:105`), portanto não falhou por vagueza.

Rebaixar a MEDIUM converteria "a única barreira de proteção do dado real da empresa falhou,
no exemplo que ela própria antecipava" em nota operacional. **Não é MEDIUM.**

### 4.3 Tentativa de rebaixar por REMEDIAÇÃO POSTERIOR — rejeitada; a distinção foi respeitada

Verifiquei `07-findings/G4_CREDENCIAL_ISOLADA_AUDITORIA.md:214-235`: a role `evok_audit`
foi criada e a tentativa de conectar em `erp_evok_audio` retorna
`FATAL: permission denied for database "erp_evok_audio" / User does not have CONNECT privilege`,
com recusa **no handshake**, antes de qualquer parsing de SQL; e `:237-257` mostra a mesma
role funcional em `erp_evok_audio_test`. Isso reduz genuinamente a exposição **futura** por
essa credencial — **e não rebaixa em nada** um finding sobre fato consumado sob outra
credencial (`evok_admin`, que permanece superusuária e continua sem restrição de hook).

**O autor respeitou a distinção corretamente:** §6.4 e §9.1 apenas referenciam a remediação
em curso, sem creditá-la como mitigação de severidade, e §5.1 não lista a credencial nova
entre os atenuantes. Nenhuma antecipação de `RETEST_PASSED`. Conduta correta sob Regras 3 e 4.

### 4.4 Atenuante que o autor recusou — recusa validada

O auto-reporte **não** foi usado para baixar severidade (§5.1, §8). Concordo e sustento o
precedente: severidade mede o risco do ato, não a virtude do relato; premiar com rebaixamento
produziria silêncio, e reduzir severidade por confissão é o incentivo exatamente invertido.

**Veredito do eixo: `HIGH` — MANTIDA.** Com a ressalva de redação de §4.2, que é correção
de fundamentação, não de classificação.

---

## 5. EIXO 5 — RECORRÊNCIA. Varredura refeita por conta própria. Conclusão mantida, contagem desatualizada.

Não reaproveitei a varredura do autor. Executei a minha, com padrão diferente do dele —
`-d erp_evok_audio` seguido de delimitador (que captura o **alvo de conexão**, não a mera
menção ao nome) — sobre o repositório inteiro.

**Dentro de `audit/runs/ERP-LEGACY-001-AUD-001/`, ocorrências com alvo `erp_evok_audio`
sem sufixo:**

| Arquivo:linha | Natureza | É conexão estabelecida? |
|---|---|---|
| `G4_PRECONDICAO_BANCO_TESTE.md:15` e `:23` | O incidente | **SIM — única** |
| `AUD-PROC-CUSTODIA-01.md:93` | Transcrição do incidente dentro do próprio finding | Não (citação) |
| `G4_CREDENCIAL_ISOLADA_AUDITORIA.md:217` e `:226` | Tentativas com `evok_audit` para **provar a recusa** | **NÃO** — `FATAL … does not have CONNECT privilege`, EXIT_CODE=2 (`:218-219`, `:227-229`); a conexão não se estabelece |
| `G4_CREDENCIAL_ISOLADA_AUDITORIA.md:320` | Referência em prosa ao incidente | Não |

**Conclusão do autor — "único caso registrado de conexão efetiva com o banco de produção" —
MANTIDA por varredura independente.** A contagem literal de §4.1 ("2 ocorrências") está
**desatualizada por horas**, não errada na origem: o relatório de credencial isolada é
posterior e paralelo. Não é defeito de método.

**Observação registrada, explicitamente NÃO promovida a finding:** as tentativas de
`G4_CREDENCIAL_ISOLADA_AUDITORIA.md:217,226` endereçam nominalmente o banco real. Sob
leitura estrita de `PROJECT_STATE.md:104` ("qualquer comando que abra conexão"), **não há
violação** — nenhuma conexão foi aberta, a recusa ocorreu no handshake, e o propósito era
justamente demonstrar a barreira. Registro apenas que **prova negativa contra o nome do
banco real deveria ser nomeada na autorização**, para não depender de interpretação. Fica
como matéria de política para o director; não é finding e não crio um.

**Classe recorrente — conferida na fonte.** `PROJECT_STATE.md:888-935` cataloga quatro
incidentes de processo; li os quatro. O incidente 1 (`:894-900`) é um
`vericore-finding-validator` que, **sondando se tinha permissão de escrita**, sobrescreveu
um arquivo de finding e o restaurou; o 3 (`:909-919`) é qualificado no texto como
*"recorrente, não isolada"*; o 4 (`:926`) como *"Quarta ocorrência da mesma classe"*.
A leitura do autor — **ato isolado, classe não isolada, 5º incidente, 2º contido só por
disciplina do agente** — é fiel ao artefato. Sustentada.

O contraste de §4.1 também confere: `PROJECT_EVENT_LOG.md:996-997` diz literalmente
*"`erp_evok_audio` (real) nunca foi endereçado"* para a bateria dinâmica 01, e `:1029`
registra que aquele runner **recusou-se** a executar `DYN-T03-02`/`DYN-T03-05`.

**Limite de §4.3 validado sem reservas:** não existe retenção de log de conexão do Postgres
no repositório. "Caso isolado no registro" ≠ "caso isolado de fato". Confiança
`MEDIUM_CONFIDENCE` quanto à exaustividade: **correta e honestamente declarada** — não a
elevo.

---

## 6. CONSEQUÊNCIA TRANSVERSAL — **PARCIALMENTE REFUTADA**

A consolidação afirma (`T-26_CONSOLIDACAO_RODADA2.md:414-417`): *"**Toda a bateria dinâmica
01 e toda a fila DYN correram sob esta ausência de controle.** Isso não invalida os
resultados obtidos …, mas significa que a contenção dependeu inteiramente da disciplina dos
agentes."* Reproduzida em `24-coverage/AUDIT_COVERAGE_EXECUTED_RODADA2.md:277` (`RES-14`).

**Procede quanto à premissa técnica:** nenhum controle **da plataforma** avaliou qualquer
Bash da run — `org-isolation.js:134`, arquivo único de hook, `settings.json` sem
`permissions`. Isso é fato verificado por mim.

**Não procede na forma absoluta em que foi escrita**, por duas evidências que li:

1. **`DYN_VERIFICACAO_BATERIA_01.md:71`** — o runner declara: *"Antes de qualquer query
   confirmei: `SELECT current_database()` retornou `erp_evok_audio_test` em toda execução
   (script com guarda hard-coded que aborta se conectar em outro banco, e recusa qualquer
   SQL que contenha `insert|update|delete|drop|alter|truncate|grant|revoke`)"*. Isso é um
   controle técnico real, com allowlist de verbo e verificação de banco corrente — mais
   restritivo, aliás, que qualquer hook existente.
2. **`server/scripts/run-api-suite.cjs:524-536`** — o caminho **destrutivo** (a suíte que
   sobrescreve dados) tem guard versionado, executável e fail-closed.

**Contra-ataque a mim mesmo, que sustento:** o guard do item 1 é **auto-implementado pelo
próprio agente que ele restringe**, e o script **não está versionado no repositório** —
minha busca por `current_database()` fora dos relatórios não o encontra; ele existiu na
sessão e não é reauditável. Um controle escrito pelo restringido, não retido, não é
controle independente — é disciplina com melhor engenharia. Já o item 2 é versionado e
independente, mas cobre só o caminho da suíte.

**Formulação que sobrevive à refutação e que proponho ao director substituir a atual
(por adição, Regra 15 — não edito o artefato de terceiro):**

> A fila dinâmica desta run correu **sem controle técnico independente e imposto pela
> plataforma** sobre Bash. Correu **com** controles de aplicação de dois tipos: um
> versionado e reauditável no caminho da suíte destrutiva (`run-api-suite.cjs:524-536`) e
> um auto-imposto, não versionado e portanto não reauditável, no caminho da bateria 01
> (`DYN_VERIFICACAO_BATERIA_01.md:71`). A contenção dependeu de disciplina **e** de
> controles de aplicação; não dependeu, em nenhum momento, de mecanismo de plataforma.

**Efeito sobre a confiabilidade da evidência dinâmica: nenhum resultado é invalidado.**
Os resultados da bateria 01 são de catálogo, obtidos contra o banco efêmero
(`DYN_VERIFICACAO_BATERIA_01.md:69-71`), e a ressalva material que os afeta já está
registrada e é outra (contaminação do banco de teste por migration de branch SanaCore,
`:91-92`, que a recriação do G4 endereçou). O que a ausência de controle de plataforma
afeta é a **auditabilidade da regra**, não a validade das medições — que é exatamente o
que `RES-14` deveria dizer, e diz quase certo.

**Nenhum finding de produto desta run é derivado da consulta indevida.** Confirmei o
descarte do dado contaminado: `AUDIT_COVERAGE_EXECUTED_RODADA2.md:292` e
`T-26_CONSOLIDACAO_RODADA2.md:454` marcam a medição `M5` (`207` de produção) como
**INADMISSÍVEL**. O `207` do banco de teste é medição independente
(`G4_CREDENCIAL_ISOLADA_AUDITORIA.md:246-249`, contra `erp_evok_audio_test`) — coincidência
de valor, proveniência distinta. Cadeia de custódia da evidência de produto: **íntegra**.

---

## 7. OBSERVAÇÕES REGISTRADAS, EXPLICITAMENTE NÃO PROMOVIDAS A FINDING

Não crio findings (não é minha autoridade). Registro para o director:

1. **O comando executado está documentado no próprio repositório como procedimento.**
   `docs/infra/DEPLOY_UBUNTU.md:98` contém, versionado:
   `docker exec -it evok-postgres psql -U evok_admin -d erp_evok_audio -c "SELECT count(*) as tabelas FROM information_schema.tables WHERE table_schema='public';"`
   — a **mesma consulta, contra o mesmo banco**. Ocorrências equivalentes em
   `docs/database/03-MODELO_FISICO.md:53,65`, `docs/database/07-DISASTER_RECOVERY.md:193,197`,
   `docs/infra/BACKUP_RESTORE_G2_2026-07-31.md:94` e `server/scripts/limpar-dados-transacionais.cjs:70`.
   **Isto amplia a causa-raiz e não atenua o ato:** um agente com Bash, lendo a documentação
   legítima do repositório, encontra a linha proibida pronta para copiar, sem nenhum aviso
   adjacente sobre `APR-2026-016`. Matéria para o director; **não promovido**.
2. **`.claude/agents/_deprecated/docker.md` — conferido.** `:5` declara
   `tools: Read, Edit, Write, Bash, Glob, Grep`; `:2` o nome é `docker`, sem prefixo
   organizacional, portanto nenhuma `ORG_RULES` de `org-isolation.js:31-65` casa;
   `:24-34` trata de rede, volumes e `.env` e **não menciona** `APR-2026-016`,
   `erp_evok_audio_test` nem a regra permanente. §6.3 do finding confere integralmente.
3. **`RES-T26-06`** (`AUDIT_COVERAGE_EXECUTED_RODADA2.md:345`) — "a run tem um finding em
   violação da própria Regra 22" — **deixa de proceder com este documento**, que é a
   validação exigida.

---

## 8. O QUE O AUTOR DEVE CORRIGIR (por adição, e não por mim)

Registro o que a validação derrubou. **Não altero `AUD-PROC-CUSTODIA-01.md`** (Regras 2 e 15):

1. **§6.2, 2º parágrafo e §9 item 3** — a alegação de divergência de governança sobre
   `APPROVALS.md:787` é **`FALSE_POSITIVE`**: o guard existe em
   `server/scripts/run-api-suite.cjs:524-536`. Retirar ou reescrever como "o guard citado
   existe no caminho da suíte de testes e não cobre execução ad-hoc de `psql` via Bash".
2. **§6.2, frase "não existe, hoje, nenhum controle técnico sobre conexões de banco no
   CoreTriad"** — exagerada. Correta: "não existe controle técnico de plataforma sobre
   Bash; o controle existente é de aplicação e cobre apenas o caminho da suíte".
3. **§5.4, "nada no caminho distingue os dois"** — verdadeira só para o vetor ad-hoc de
   Bash. Qualificar (a conclusão HIGH não muda).
4. **§4.1, contagem "2 ocorrências"** — desatualizada; ver §5 deste documento. Nenhuma das
   novas é conexão estabelecida.

---

## 9. DECLARAÇÃO DE ENCERRAMENTO

**`AUD-PROC-CUSTODIA-01` é `CONFIRMED`, severidade `HIGH`, e cumpre a Regra 22 a partir
deste documento.** A refutação foi tentada em cinco eixos e documentada eixo a eixo; dois
cederam parcialmente e estão corrigidos acima; o fato, a causa-raiz determinante e a
severidade sobreviveram.

**Limites e vedações observados nesta validação:**

- **Regra 2** — nada foi corrigido, refatorado ou alterado. Não toquei em
  `org-isolation.js`, `settings.json`, `docker-compose.yml`, `run-api-suite.cjs`, no
  finding original, nem em qualquer artefato de terceiro. Escrita exclusivamente neste
  arquivo, em `audit/`.
- **Regra 4** — **não declaro** `AUDIT_PASSED`, `FINDINGS_CONFIRMED`, `RETEST_PASSED` nem
  `FINDING CLOSED`. O fechamento é do `vericore-software-audit-director` após reteste;
  `RETEST_SPECIFICATION` (§10 do finding) permanece **não executada**.
- **Nenhum comando executado** — sem Bash, sem banco, sem script, sem teste. Só
  `Read`/`Grep`/`Glob`. Verificar por conexão seria repetir a classe de violação em apuração.
- **Nenhum finding novo criado.** Os achados de §7 são observações **explicitamente não
  promovidas**.
- **Encaminhamento:** finding de **processo**. **Não aciona a SanaCore** — não há nada a
  corrigir no ERP. Destinatários: dono do CoreTriad (política e credencial) e
  `coretriad-director` (taxonomia de agentes, controle de Bash, e a conciliação de §8).
- **`AUDIT_COMMIT`** desta run é `c1311a6f76b512fef893f7e60d934179cae3409f`; o objeto
  validado é **conduta de processo**, não estado de código no commit — os arquivos de
  causa-raiz foram lidos na working tree de 2026-08-16, e essa é a âncora honesta.

**Toda leitura acima foi feita diretamente na fonte nesta sessão.** Nenhum número, caminho
ou linha foi reproduzido a partir de contexto injetado ou do texto do finding sem releitura
independente — inclusive as duas afirmações que me foram apresentadas como dadas sobre
`settings.json` e `org-isolation.js`, que reli integralmente antes de as sustentar.
