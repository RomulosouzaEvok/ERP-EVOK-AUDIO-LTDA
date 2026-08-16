# RC-PROC-01 — CLASSE DE RISCO DE GOVERNANÇA

## "Restrição categórica contida por disciplina do agente, não por mecanismo"

| Campo | Valor |
|---|---|
| ID da classe | `RC-PROC-01` |
| Nome | Restrição categórica cuja contenção dependeu da disciplina do agente, não de controle técnico |
| Escopo | Programa `LEGACY_RECOVERY_AND_MODERNIZATION` / projeto `ERP-LEGACY-001`, run `ERP-LEGACY-001-AUD-001` — **e, por natureza, todo o modelo CoreTriad neste repositório** |
| Aberta em | 2026-08-16 |
| Autoridade de abertura | Decisão humana explícita do dono do CoreTriad (Regra 18) — texto verbatim em §0 |
| Registrada por | `coretriad-director` (registro de Control Plane; não é juízo de auditoria — Regra 5) |
| Status da classe | **ABERTA** |
| Autoridade de encerramento | Dono do CoreTriad, sobre evidência produzida e verificada pela **VeriCore** (Regra 4). O `coretriad-director` **não** fecha esta classe |
| Finding pontual correlato (não é este documento) | `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/AUD-PROC-CUSTODIA-01.md` — HIGH, validado por `T-30_VALIDACAO_AUD-PROC-CUSTODIA-01.md` |

---

## 0. AUTORIZAÇÃO HUMANA (Regra 18)

Este item de governança existe por determinação direta do dono do CoreTriad,
nesta sessão, em texto:

> *"Registre o padrão de recorrência (5º incidente, contido por disciplina e não
> por controle técnico) como item de governança formal, separado do finding
> pontual — para não se repetir uma 6ª vez."*

A autorização cobre **registro e estruturação de governança**. Não fixa
severidade de finding, não valida finding, não fecha nada e não substitui
nenhuma autoridade da VeriCore.

## 0.1 O que este documento NÃO é

- **Não é o finding.** O incidente pontual de custódia já está registrado e
  validado em `audit/` (linha da tabela acima). Aqui trata-se do **padrão
  transversal**, que é maior que qualquer um dos incidentes isolados.
- **Não é auditoria.** Nenhuma severidade é atribuída ou alterada; nenhum
  finding é criado, promovido, rebaixado ou fechado.
- **Não é remediação.** As correções em curso são registradas como **decisão e
  despacho**, com o estado verificado em disco no momento desta redação —
  jamais como resultado.

---

## 1. DEFINIÇÃO DA CLASSE

Pertence a `RC-PROC-01` todo incidente em que **as quatro** condições abaixo
são verdadeiras:

1. Existia uma **restrição categórica, textual e versionada** aplicável ao ato
   (norma de programa, aprovação numerada, ownership de diretório ou regra do
   `CLAUDE.md`).
2. O agente **atravessou** a restrição — por engano de alvo, por sondagem da
   fronteira, ou por afirmar como verificado algo que não releu.
3. **Nenhum mecanismo** (hook, `permissions`, credencial, isolamento de rede ou
   de processo) impediu, detectou ou reverteu o ato.
4. A contenção do dano — reversão, escalonamento ou visibilidade — resultou
   **exclusivamente do comportamento do próprio agente ou de outro agente que
   leu o artefato**, não de um controle.

**Tese da classe, na formulação do finding validado:** *um ato isolado dentro
de uma classe recorrente não é um acidente, é uma taxa.* A classe existe
justamente porque cada ocorrência, olhada sozinha, parece anedota; olhadas em
série, elas medem a **taxa de falha da única barreira existente**.

**Regra 23 do `CLAUDE.md` é o padrão normativo violado pela classe** —
*"permissões são impostas por hooks e settings do Claude Code; o prompt é
reforço, nunca o único mecanismo"*. A existência desta classe é a **evidência
empírica** de que a Regra 23 não estava satisfeita para as restrições
inventariadas em §2.

---

## 2. INVENTÁRIO VERIFICADO DE INCIDENTES

**Método:** leitura direta, nesta data, de
`coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md:888-935` (lista numerada),
`coretriad/states/ERP-LEGACY-001/PROJECT_EVENT_LOG.md` (entradas de 2026-08-13
a 2026-08-16), `AUD-PROC-CUSTODIA-01.md`, `T-30_VALIDACAO_AUD-PROC-CUSTODIA-01.md`,
`.claude/hooks/org-isolation.js`, `server/scripts/run-api-suite.cjs` e
`coretriad/governance/APPROVALS.md`. **Nenhum comando, teste ou conexão de
banco foi executado para produzir este registro.**

A coluna "controle técnico hoje" foi verificada **em disco nesta data**, não
presumida.

### 2.1 Itens da lista numerada do `PROJECT_STATE.md`

| # | Incidente | Data | Pertence a `RC-PROC-01`? |
|---|---|---|---|
| 1 | Sobrescrita acidental de `FIND-ERP-002.md` por `vericore-finding-validator` **ao sondar se tinha permissão de escrita**, seguida de restauração integral pelo próprio agente | 2026-08-13 | **SIM** |
| 2 | "O hook de segregação funcionou" — bloqueio correto de escrita VeriCore fora de `audit/`, obrigando persistência manual pelo director | 2026-08-13 | **NÃO** — é **sucesso de mecanismo**, o oposto da classe (ver §3.1) |
| 3 | Número de commit citado a partir de **contexto injetado desatualizado** (`FIND-ERP-009`, HEAD `65bd66d` × real `1979beb`) — classe já ocorrida no passo 23 e reincidente depois | 2026-08-13 | **SIM** |
| 4 | O próprio `PROJECT_STATE.md` divergiu materialmente da evidência versionada (re-ancoragem 1/7 × 7/7; passo 31 "fieldwork bloqueado" × encerrado); detectado por agente VeriCore lendo o Control Plane e **escalado**, não corrigido por quem achou | 2026-08-16 | **SIM** |
| 5 | Conexão de agente automatizado ao banco **PRODUÇÃO REAL** (`docker exec … psql -U evok_admin -d erp_evok_audio -c "SELECT count(*) …"`), sob proibição textual quádrupla, **auto-reportada** pelo executor | 2026-08-16 | **SIM** |

### 2.2 Análise item a item — o que deveria ter impedido, por que não impediu, e o que existe hoje

**Incidente 1 — sobrescrita de artefato de finding ao sondar fronteira de escrita.**

- *O que deveria ter impedido:* o hook de isolamento organizacional
  (`.claude/hooks/org-isolation.js`), que materializa a Regra 15 (não alterar
  evidência histórica de outra organização) e o ownership de diretórios do
  `CLAUDE.md`.
- *Por que não impediu:* verificado em `org-isolation.js:31-39` — a regra
  `vericore` tem `deniedPaths` limitados a
  `product|src|server|client|mobile|tests|database|infrastructure|requirements|architecture`.
  **`docs/` não está na lista**, e os sete findings preliminares vivem em
  `docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-00*.md`. A escrita
  foi tecnicamente permitida.
- *Contenção:* o próprio agente restaurou o conteúdo integralmente e relatou o
  ocorrido. **Nenhuma perda permaneceu — por conduta, não por controle.**
- *Controle técnico hoje:* **NÃO EXISTE.** Reli `ORG_RULES` nesta data: o vetor
  segue aberto exatamente como estava.

**Incidente 3 — número afirmado a partir de contexto injetado.**

- *O que deveria ter impedido:* Regras 8 e 10 do `CLAUDE.md` (memória/contexto
  é auxiliar, nunca fonte normativa; informação material exige verificação
  contra artefato versionado).
- *Por que não impediu:* são normas de conduta. **Não existe nem pode existir
  hook que distinga "número lido agora" de "número lembrado"** — a distinção não
  é observável na chamada de ferramenta.
- *Contenção:* correção por nota no próprio finding e, na ocorrência seguinte
  (`PROJECT_EVENT_LOG.md:326-330`), **recusa preventiva** do agente de escopo,
  que rejeitou o HEAD injetado e releu a fonte. A regra 5 do programa
  (`PROJECT_STATE.md:955-957`) nasceu daqui.
- *Controle técnico hoje:* **NÃO EXISTE** — e a classe é, por natureza,
  **não imponível por mecanismo**. A contenção é obrigatoriamente
  procedimental. Isto precisa ser dito com todas as letras: **parte de
  `RC-PROC-01` nunca será fechada por hook**; só por procedimento explícito e
  por aceitação registrada do resíduo.

**Incidente 4 — artefato de Control Plane envelhecido divergindo da evidência.**

- *O que deveria ter impedido:* a disciplina de registro do próprio
  `coretriad-director` (Regra 7 — artefato versionado é a fonte de verdade).
- *Por que não impediu:* nenhum mecanismo compara Control Plane com evidência
  de auditoria. **Artefato de governança envelhece silenciosamente.**
- *Contenção:* um agente VeriCore, lendo o Control Plane, detectou a divergência
  e a **escalou ao director em vez de corrigi-la** (Regra 16 respeitada —
  `AUDIT_COVERAGE_EXECUTED.md` §1.1). Conduta correta, e outra vez conduta.
- *Controle técnico hoje:* **NÃO EXISTE.** O hook impede a VeriCore de escrever
  em `coretriad/` (isso funciona), mas nada obriga o director a reconciliar.
  **Lição já registrada no próprio `PROJECT_STATE.md`:** envelhecer sem
  correção é, na prática, alimentar contexto injetado desatualizado para toda a
  organização — ou seja, o incidente 4 **fabrica** incidentes da classe do 3.

**Incidente 5 — conexão ao banco de produção real.**

- *O que deveria ter impedido:* proibição textual, permanente e **quádrupla** —
  `APR-2026-015` cond. 3; `APR-2026-016` (regime permanente);
  `APR-2026-021` Parte D; `APR-2026-024` (a própria aprovação sob a qual a
  trilha corria). A norma nomeia literalmente o caso ocorrido: *"nem para 'só
  contar linhas'"* (`PROJECT_STATE.md:104-106`).
- *Por que não impediu:* três causas somadas, todas verificadas por leitura —
  (a) produção e teste no mesmo container sob a **mesma role superusuária**, a
  separação sendo o valor do argumento `-d`; (b) o hook não avaliava `Bash`
  (`org-isolation.js`, `WRITE_TOOLS` + `approve` para toda ferramenta que não
  fosse de escrita); (c) a trilha foi despachada a um agente
  (`.claude/agents/_deprecated/docker.md`) **fora da taxonomia CoreTriad**, com
  Bash irrestrito e sem carta que citasse a regra permanente.
- *Contenção:* **auto-reporte espontâneo**, com o comando verbatim, em posição
  de destaque, sem minimização, e sem que o agente decidisse a própria
  severidade. Sem esse relato, o incidente **não existiria como registro**.
- *Controle técnico hoje:* **PASSOU A EXISTIR — verificado em disco nesta data.**
  `.claude/hooks/org-isolation.js:100-152` define
  `PROD_DB_TOKEN_SOURCE = 'erp_evok_audio[A-Za-z0-9_]*'` com
  `SAFE_DB_SUFFIX = /(_test|_ci)$/i`, e `:188-200` bloqueia ferramentas de shell
  (`bash`/`shell`/`run_command`) cujo `tool_input` referencie o banco sem
  sufixo seguro, **antes** do `approve` genérico de ferramentas não-escrita
  (`:202`), **para qualquer chamador** — subagente ou sessão principal.
  **Registro de estado, não veredito:** a eficácia deste controle é objeto de
  reteste da VeriCore (`RT-CUST-01` do finding), **não declarada aqui**.

### 2.3 Contagem e divergência registrada (Regra 20 — não conciliada)

O finding `AUD-PROC-CUSTODIA-01` §4.2 afirma ser **o 5º incidente de processo
da run** e **o 2º contido apenas por disciplina**; a validação independente
`T-30` §5 releu os quatro itens da lista e considerou a leitura **fiel ao
artefato**. **Confirmo a fidelidade ao artefato e registro, ainda assim, duas
divergências materiais — que não concilio:**

1. **"5º incidente" é ordinal de lista, não contagem de desvios.** O item 2 da
   lista numerada **não é um desvio**: é o registro de que o hook **funcionou**.
   Contando apenas atravessamentos de restrição, o incidente de custódia é o
   **4º desvio**, embora seja corretamente o **5º item** do catálogo. Ambas as
   afirmações são verdadeiras sob definições diferentes; nenhuma é erro.
2. **"2º contido apenas por disciplina" vale sob critério estrito; sob critério
   amplo são 4.** Sob o critério do finding — *ato de fronteira com potencial
   irreversível, contido pela conduta do próprio autor* — são **2** (incidentes
   1 e 5), e essa leitura se sustenta. Sob o critério literal desta classe
   (§1, condições 3 e 4 — **nenhum mecanismo impediu, detectou ou reverteu**),
   são **4 de 5** (incidentes 1, 3, 4 e 5): os incidentes 3 e 4 também não
   tiveram mecanismo algum, apenas conduta. A diferença está no **tipo de dano**
   (irreversível × informacional), não na natureza da contenção.

**Efeito prático da divergência, e por que ela importa:** sob o critério amplo,
a classe é **substancialmente maior** do que o finding pontual sugere, e as
correções em execução (§4) endereçam **apenas o incidente 5**. Registrar isso é
o objetivo deste documento; resolvê-lo é decisão do dono.

### 2.4 Limite de exaustividade — declarado, não convertido em garantia

O inventário cobre o que está **versionado e relatado**. Não existe, no
repositório, log independente de conexões do Postgres nem trilha de auditoria
das chamadas de ferramenta dos agentes. Portanto: **"não há outras ocorrências
no registro" ≠ "não há outras ocorrências"**. Este limite é, ele próprio, parte
da classe — ver critério de encerramento `CE-06`.

---

## 3. POR QUE A CONTENÇÃO FOI COMPORTAMENTAL

### 3.1 O que o inventário mostra quando lido em série

Em **quatro** dos cinco itens catalogados, nenhum mecanismo participou: o dano
foi contido porque um agente **restaurou**, **releu**, **escalou** ou
**confessou**. No único item em que houve mecanismo (item 2), ele funcionou
perfeitamente — e o fato de esse item ter sido catalogado junto com os desvios
mostra o quanto o programa vinha tratando "controle funcionou" e "agente se
comportou" como se fossem a mesma coisa. **Não são.** Um é reprodutível; o
outro é uma taxa de acerto.

### 3.2 O modo de falha é o mesmo nos quatro

Não houve má-fé em nenhum incidente, e nenhum foi causado por ambiguidade da
norma — no caso do banco, a norma **nomeava literalmente** o ato ocorrido. O
modo de falha é sempre *"o agente não seguiu à risca uma instrução que
compreendia"*. **Um controle cuja taxa de falha observada é maior que zero e
cujo modo de falha é esse não é um controle: é uma convenção.**

### 3.3 O agravante estrutural

No incidente 5, a distância entre o ocorrido e um dano irreversível era **uma
palavra na linha de comando** — mesma role superusuária, mesmo container,
mesmo caminho, sem nada avaliando o verbo SQL. A classe não mede a gravidade do
que aconteceu; mede **o que a mesma barreira teria deixado passar**.

### 3.4 A transparência é o ativo, e não pode ser penalizada

Precedente já fixado pelo finding e sustentado pela validação independente, e
que este item de governança **eleva a política permanente do programa**:

> O auto-reporte **não reduz a severidade** de um ato — severidade mede risco,
> não virtude. Mas é **o único motivo pelo qual esta classe é hoje conhecida,
> mensurável e corrigível**, e por isso deve ser tratado como o comportamento
> **esperado** de todo agente, nunca como confissão punível. Um modelo em que
> relatar o próprio desvio piora a situação do agente produz silêncio — e
> silêncio é o único estado do qual nenhuma auditoria se recupera.

### 3.5 Nota de aprendizado registrada com o mesmo peso

O programa também produziu **recusas corretas** de agentes diante de fronteiras
mal cobertas: o runner da bateria dinâmica 01 recusou-se a executar
`DYN-T03-02`/`DYN-T03-05` **no banco de teste** porque sua carta não cobria
escrita e a autorização não a nomeava; o agente de escopo rejeitou um HEAD
injetado e releu a fonte. Isso não anula a classe — **reforça a tese**: a
qualidade do resultado tem variado com a disciplina individual do agente
sorteado para a trilha, que é exatamente a variável que um controle técnico
existe para eliminar.

---

## 4. DECISÕES DO DONO — REGISTRADAS COMO DECISÃO E DESPACHO (2026-08-16)

**Regra 18.** As quatro determinações abaixo vieram da mesma mensagem do dono
que autorizou este registro. **O estado em disco foi verificado por leitura
direta nesta data e está declarado item a item. Nada aqui declara resultado,
conclusão, eficácia, `RETEST_PASSED` ou fechamento** — a verificação de
eficácia é autoridade da VeriCore (Regras 4 e 5).

| # | Decisão | Executor despachado | Estado verificado em disco nesta data |
|---|---|---|---|
| D-1 | Estender `.claude/hooks/org-isolation.js` para interceptar `Bash` contra o banco de produção | `opuscore-devops-engineer` | **ARTEFATO PRESENTE.** A guarda existe em `org-isolation.js:100-152` (token + sufixo seguro) e `:188-200` (bloqueio em ferramentas de shell, antes do `approve` de `:202`), com comentário citando `AUD-PROC-CUSTODIA-01` e a Regra 23. **Eficácia não verificada por este registro — nenhum teste foi executado** |
| D-2 | Corrigir `docs/infra/DEPLOY_UBUNTU.md` e `docs/database/03-MODELO_FISICO.md`, que **ensinam o comando proibido** | `documentador` | **NÃO CONSTATADO NESTA LEITURA.** `Grep` por `AUD-PROC-CUSTODIA` e `APR-2026-016` nos dois arquivos retornou **zero ocorrências** no momento desta redação. Registro do estado observado, sem juízo: o agente pode estar em execução concorrente |
| D-3 | Registrar o padrão de recorrência como item de governança formal, separado do finding pontual | `coretriad-director` | **ESTE DOCUMENTO** |
| D-4 | Validar posteriormente com os **casos sintéticos de segregação** usados no início do programa | não despachado nesta sessão | **PENDENTE.** Referência de precedente: `APR-2026-014` — `TEST-SEAL-001/002`, em que o selo de gabarito *"resistiu a Read, Grep, Glob, Bash e `ls`"*, com autoridade provada **por enforcement, não por honra** (`APPROVALS.md:116-127`) |

**Ressalva vinculante sobre D-2, registrada por ser material à causa-raiz:** a
validação independente `T-30` §7.1 registrou que o comando proibido está
versionado como **procedimento legítimo** em pelo menos seis arquivos —
`docs/infra/DEPLOY_UBUNTU.md:98`, `docs/database/03-MODELO_FISICO.md:53,65`,
`docs/database/07-DISASTER_RECOVERY.md:193,197`,
`docs/infra/BACKUP_RESTORE_G2_2026-07-31.md:94` e
`server/scripts/limpar-dados-transacionais.cjs:70`. **A decisão D-2 nomeia
dois.** Um agente com Bash, lendo a documentação legítima do próprio
repositório, encontra a linha proibida **pronta para copiar, sem aviso
adjacente**. O escopo dos demais arquivos é **decisão aberta do dono**;
o director não a amplia por analogia (precedente `APR-2026-018`).

---

## 5. CORREÇÃO DE REGISTRO ANTERIOR (Regra 20) — o guard **existe**

Durante esta sessão afirmou-se que a passagem de `coretriad/governance/APPROVALS.md:787`
— *"o guard que recusa banco sem sufixo de teste segue ativo"* — **não
corresponderia a mecanismo algum**. Essa afirmação foi **REFUTADA** pela
validação independente `T-30` §3, e a refutação é **confirmada por leitura
própria do `coretriad-director` nesta data**:

`server/scripts/run-api-suite.cjs` — verificado nas linhas **517-536**:

- `:517-523` — comentário declarando a razão de existir: *"esta suite escreve
  fixtures destrutivos … nao existe isolamento de banco por codigo, so por
  configuracao"*.
- `:524-529` — recusa por `NODE_ENV === 'production'` ou por `/prod/i` em
  `DB_NAME`/`DB_HOST`.
- `:530-536` — `if (!/(_test|_ci)$/i.test(process.env.DB_NAME || '')) { throw … }`,
  com mensagem de erro quase palavra por palavra a da aprovação.

**Consequências registradas, sem eufemismo:**

1. **A afirmação de `APPROVALS.md:787` é VERDADEIRA no escopo em que foi
   feita** — a fila `DYN` executada pela suíte. **Não há divergência
   governança × mecanismo nesse ponto**, e nenhuma correção de `APPROVALS.md` é
   devida por esse motivo. `RT-CUST-03` do finding, que pressupunha a
   divergência, **perde o objeto**.
2. **O que não existia era controle para o vetor `docker exec … psql`** — um
   comando ad-hoc que não passa por Node, não lê `DB_NAME` e não invoca o
   script. O guard não o intercepta e **não tem como** interceptá-lo.
3. **A versão errada não deve ser propagada.** Qualquer registro futuro que
   repita "o guard não existe" contradiz artefato versionado e é falso
   (Regra 7).
4. Registrado também que a formulação absoluta *"não existe, hoje, nenhum
   controle técnico sobre conexões de banco no CoreTriad"* é **exagerada**: o
   correto é **"não existia controle técnico de plataforma sobre `Bash`; os
   controles existentes eram de aplicação e cobriam apenas o caminho da suíte"**.
   A correção do texto do finding cabe ao seu autor ou à VeriCore — **não a este
   documento** (Regras 2 e 15).

**Distinção que a classe torna permanente:** *controle de aplicação, escrito
pelo próprio restringido e não retido no repositório, não é controle
independente — é disciplina com melhor engenharia.* Só é controle o que é
**versionado, reauditável e imposto por quem não é o restringido**.

---

## 6. CRITÉRIOS OBJETIVOS DE ENCERRAMENTO DA CLASSE

A classe `RC-PROC-01` **só pode ser declarada FECHADA pelo dono do CoreTriad**,
sobre evidência produzida e verificada pela VeriCore. Cada critério é
verificável por leitura ou por execução de caso sintético — nenhum é fechável
por declaração de agente, por memória ou por inferência (Regra 18). **Nenhum
critério pode ser verificado por conexão ao banco real** — verificar assim seria
repetir a violação em apuração.

| ID | Critério | Como se verifica | Estado nesta data |
|---|---|---|---|
| `CE-01` | Existe controle **de plataforma** que impeça qualquer agente de alcançar o banco de produção por ferramenta de shell | Leitura de `.claude/hooks/org-isolation.js` + `settings.json` | **ARTEFATO PRESENTE** (§4 D-1); eficácia **não verificada** |
| `CE-02` | O controle de `CE-01` foi **exercitado por caso sintético**, executado por agente que **não** o escreveu, cobrindo: comando bloqueado (banco real), comando permitido (`_test`/`_ci`), e tentativa de evasão (nome do banco em variável, heredoc, aspas, encadeamento) | Relatório VeriCore com comando e saída verbatim, nos moldes de `TEST-SEAL-001/002` (`APR-2026-014`) | **PENDENTE** (§4 D-4) |
| `CE-03` | A documentação versionada **não ensina** o comando proibido sem aviso normativo adjacente | `Grep` por alvo `erp_evok_audio` sem sufixo em `docs/` e `server/scripts/`: cada ocorrência remanescente é procedimento humano de operação **com aviso explícito** sobre `APR-2026-016`, ou foi removida | **PENDENTE**; escopo além dos 2 arquivos de D-2 é **decisão aberta do dono** |
| `CE-04` | Nenhuma trilha do programa é despachada a agente fora da taxonomia CoreTriad; a carta de todo agente com Bash cita a regra permanente de dado real | Leitura de `.claude/agents/**` e conferência do executor da próxima trilha de infraestrutura (`RT-CUST-05` do finding) | **PENDENTE** — `.claude/agents/_deprecated/docker.md` segue com `tools: Read, Edit, Write, Bash, Glob, Grep` e sem menção à regra |
| `CE-05` | O vetor do **incidente 1** tem controle ou aceitação registrada: escrita de agente VeriCore sobre artefato de finding em `docs/` está bloqueada por hook, **ou** o dono registra aceitação explícita do resíduo | Leitura de `ORG_RULES` em `org-isolation.js` | **ABERTO** — `docs/` não consta dos `deniedPaths` da regra `vericore` |
| `CE-06` | Auditabilidade da própria regra: existe retenção de evidência independente (log de conexão ou equivalente) **ou** aceitação registrada de que o cumprimento é verificável apenas por declaração do agente | Decisão humana registrada em `APPROVALS.md` | **ABERTO** (§2.4) |
| `CE-07` | Os incidentes 3 e 4 (classes **não imponíveis por hook**) têm procedimento explícito com ponto de verificação — releitura obrigatória de números na fonte e reconciliação periódica do Control Plane contra a evidência de auditoria — **e** o resíduo é aceito por escrito | Registro em `APPROVALS.md` + regra do programa em `PROJECT_STATE.md` | **PARCIAL** — a regra de releitura existe (`PROJECT_STATE.md:955-957`); a reconciliação periódica **não** tem gatilho definido |
| `CE-08` | `AUD-PROC-CUSTODIA-01` retestado e fechado **pela VeriCore** (`RETEST_PASSED` / `FINDING CLOSED`), executando `RT-CUST-01`, `02`, `04` e `05` — `RT-CUST-03` **perde o objeto** por §5 | Relatório de reteste em `audit/` | **PENDENTE** — Regra 4; **vedado a este documento declarar** |
| `CE-09` | **Zero novas ocorrências da classe** entre a data deste registro e o gate de release, com varredura declarada e datada | Varredura VeriCore de `audit/runs/` e `PROJECT_EVENT_LOG.md` (`RT-CUST-04`) | **EM OBSERVAÇÃO desde 2026-08-16** |

**Regra de encerramento:** `CE-01` a `CE-09` são **cumulativos**. Um critério
que não puder ser satisfeito só sai da lista por **aceitação de risco explícita
e registrada do dono** (Regra 18) — nunca por decurso de prazo, por analogia com
outro critério, nem por decisão de agente. **Enquanto qualquer critério estiver
aberto, a classe permanece ABERTA**, mesmo que nenhum incidente novo ocorra:
ausência de ocorrência não é evidência de controle.

---

## 7. RASTREABILIDADE

| Campo | Valor |
|---|---|
| Finding pontual | `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/AUD-PROC-CUSTODIA-01.md` (HIGH, `CONFIRMED`, `OPEN`) |
| Validação (Regra 22) | `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/T-30_VALIDACAO_AUD-PROC-CUSTODIA-01.md` |
| Evidência primária do incidente 5 | `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/G4_PRECONDICAO_BANCO_TESTE.md:10-27` |
| Remediação de credencial (referenciada, não validada aqui) | `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/G4_CREDENCIAL_ISOLADA_AUDITORIA.md` |
| Catálogo de incidentes | `coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md:888-935` |
| Norma violada (dado real) | `APR-2026-015` cond. 3 · `APR-2026-016` · `APR-2026-021` Parte D · `APR-2026-024` · `PROJECT_STATE.md:95-118` |
| Regras do `CLAUDE.md` | **23** (hook, não prompt — núcleo desta classe) · **15** (evidência histórica) · **16** (read ≠ write) · **18** (gate humano) · **20** (divergência registrada) · **7** (artefato vence) · **8** e **10** (memória/contexto não são fonte) |
| Precedente de validação por caso sintético | `APR-2026-014` — `TEST-SEAL-001/002` (`APPROVALS.md:116-127`) |
| Mecanismo de aplicação confirmado | `server/scripts/run-api-suite.cjs:517-536` |
| Controle de plataforma criado (artefato presente, eficácia não verificada) | `.claude/hooks/org-isolation.js:100-152,188-200` |

---

## 8. DECLARAÇÃO DE MÉTODO E LIMITES

- **Método:** leitura direta de artefato versionado (`Read`/`Grep`/`Glob`).
  **Nenhum comando, teste, script ou conexão de banco foi executado.** Nenhum
  número, linha ou caminho citado aqui veio de contexto injetado sem releitura
  da fonte (regra 5 do programa).
- **Namespace respeitado:** este agente escreveu **exclusivamente** em
  `coretriad/governance/`. Nada foi escrito ou alterado em `audit/`, `.claude/`,
  `docs/`, `server/` ou `client/`. Nenhum finding de terceiro foi editado
  (Regras 2, 15 e 16).
- **Nada foi declarado que este agente não tenha visto em disco.** Onde o estado
  não pôde ser constatado (D-2), isso está escrito como tal.
- **Nenhum veredito:** não se declara `AUDIT_PASSED`, `FINDINGS_CONFIRMED`,
  `RETEST_PASSED` nem `FINDING CLOSED`; nenhuma severidade é atribuída,
  alterada ou validada; nenhum finding é criado ou promovido (Regras 4, 5 e 22).
- **Nenhum commit foi feito por este registro.**

---

## 9. ADENDO — decisões do dono de 2026-08-16 sobre `CE-02` e `CE-07` (`APR-2026-026`)

Adição posterior ao registro original, por decisão humana explícita. **Nenhuma
linha das seções 1-8 foi alterada** (Regra 15) — este adendo atualiza o estado
dos critérios sem reescrever o histórico.

### 9.1 `CE-02` — RESÍDUO ACEITO, não satisfeito

Demonstrado por execução que a guarda de banco do hook **é evadível por
ofuscação de shell** (nome do banco montado em variáveis concatenadas), porque
o hook não avalia o comando após a expansão do shell — limitação estrutural,
não bug pontual.

**Decisão do dono:** aceito que a guarda cobre **acidente de configuração, não
evasão deliberada**. Fundamento registrado: o histórico de 5 incidentes mostra
padrão consistente de erro não intencional **com autorreporte**, nunca tentativa
de ocultar violação. Reforço contra evasão intencional fica como melhoria
futura, sem prioridade atual.

**Efeito sobre o estado de `CE-02`:** deixa de ser `PENDENTE` e passa a
**`RESÍDUO ACEITO`** — categoria distinta de `SATISFEITO`, e deve constar assim
em qualquer relatório de encerramento da classe. O critério **não** foi
cumprido; o risco foi aceito por escrito, que é a única via prevista pela regra
de encerramento da §6.

### 9.2 `CE-07` — permanece PARCIAL, com um item corrigido e dois aceitos

A validação independente dos dois verificadores detectivos, executada pelo
`vericore-sdet-auditor` (agente que **não** os escreveu, conforme precedente
`TEST-SEAL-001/002`), produziu três achados. Destino decidido pelo dono:

| # | Achado | Destino |
|---|---|---|
| 1 | `COMMIT_CONTEXT` não casava conjugações em português (`commitado`, `commitou`, …), deixando hashes citados nessas formas **sem verificação alguma** — falso negativo **real, já presente no corpus** | **CORRIGIDO EM 2026-08-16** |
| 2 | Três `SYSTEM_MAP.md` homônimos (70/74/165 linhas): citação `arquivo.md:N` é aceita se **qualquer** homônimo tiver N linhas | **RESÍDUO ACEITO** — efeito é citação incorretamente atribuída, não passagem de dado ruim |
| 3 | Downgrade `FALHA→AVISO` para artefato de branch de remediação funciona local, mas não em runner de CI | **RESÍDUO ACEITO, COM CONDIÇÃO VINCULANTE `CD-CI-01`** (§9.3) |

Item 1, executado: padrão passou de `\bcommits?\b` para
`\bcommit(s|ad[oa]s?|ou|aram|ando|ar)?\b`. Verificado por 16/16 casos (8
conjugações, 5 de não-regressão, 3 controles negativos), com o regex **extraído
do arquivo real**, não reimplementado no teste. Execução no repositório:
citações candidatas 515→**517**, commits distintos 57→**58**, **sem falso
positivo novo**.

**Registro de honestidade que acompanha o item 1:** a correção fecha o vetor de
*conjugação*, não o vetor do **incidente 3**. O commit daquele incidente
(`65bd66d`) **existe** — o erro foi citar commit real porém desatualizado, e
nenhum dos dois verificadores detecta isso, conforme confirmado por leitura
independente da lógica completa. `CE-07` continua **PARCIAL**.

### 9.3 CONDIÇÃO VINCULANTE `CD-CI-01`

> **Antes de qualquer decisão futura de promover o job
> `governance-detective-controls` de INFORMATIVO para BLOQUEANTE — isto é, de
> remover `continue-on-error: true` de `.github/workflows/server-ci.yml` — o
> problema das branches de remediação não baixadas pelo `actions/checkout`
> PRECISA ser resolvido primeiro.**
>
> `verify-control-plane.cjs` rebaixa `FALHA→AVISO` para artefato que só existe
> em `sana/*` consultando `git log --all`, o que depende de essas branches
> existirem como refs locais. O `actions/checkout` traz o histórico completo do
> ref sob checkout (garantido por `fetch-depth: 0`), mas **não** traz as demais
> branches remotas. Num runner limpo, esses artefatos viram
> `CAMINHO_INEXISTENTE` — falha, não aviso.
>
> Promover sem corrigir faz o CI reprovar por artefatos que **existem**; a
> divergência local-vs-runner vira ruído e o desfecho previsível é o gate ser
> desligado — o antipadrão que `AUD-CICD-DEPGATE-01` documenta.
>
> **Replicada em três lugares, deliberadamente:** `APPROVALS.md`
> (`APR-2026-026`), o comentário do próprio job em
> `.github/workflows/server-ci.yml`, e este documento.
> **Nenhum agente pode dispensá-la — só decisão humana explícita registrada.**

### 9.4 Estado dos nove critérios após este adendo

| Critério | Estado |
|---|---|
| `CE-01` | **SATISFEITO** — controle de plataforma existe e teve eficácia demonstrada por execução (8/8 casos, `SEGREGATION_TEST_REPORT_2026-08-16.md`) |
| `CE-02` | **RESÍDUO ACEITO** (§9.1) — não satisfeito; risco aceito por escrito |
| `CE-03` | **PARCIAL** — `docs/` e `server/scripts/` tratados; `CASE-003` corrigiu os dois scripts destrutivos com `RETEST_PASSED`. Resíduo: vetor estrutural (`.env.example` sem banco de dev separado) segue aberto |
| `CE-04` | **SATISFEITO quanto ao texto** — 34 agentes com `Bash` passaram a citar a regra. **Resíduo: é reforço de prompt, não controle**; o `Bash` dos 15 agentes de `_deprecated/` segue decisão aberta do dono |
| `CE-05` | **SATISFEITO para o vetor VeriCore** — hook bloqueia escrita sobre artefato de finding em `docs/` (23/23 casos). Resíduos declarados: `Bash` não passa por `ORG_RULES`; OpusCore/SanaCore/sessão principal seguem sem impedimento |
| `CE-06` | **ABERTO** — decisão do dono pendente |
| `CE-07` | **PARCIAL** (§9.2) — controles construídos e validados independentemente; itens 2 e 3 aceitos como resíduo; vetor dos incidentes 3 e 4 permanece sem cobertura |
| `CE-08` | **PENDENTE** — reteste de `AUD-PROC-CUSTODIA-01` pela VeriCore. **Nota: o `RETEST_PASSED` do `CASE-003` NÃO satisfaz este critério** — vetores distintos |
| `CE-09` | **EM OBSERVAÇÃO** |

**A classe `RC-PROC-01` permanece ABERTA.** Pela regra de encerramento da §6, os
critérios são cumulativos e resíduo aceito não é dispensa: enquanto `CE-06`,
`CE-08` e as partes abertas de `CE-03`, `CE-04` e `CE-07` não forem resolvidos
ou explicitamente aceitos, a classe não fecha.
