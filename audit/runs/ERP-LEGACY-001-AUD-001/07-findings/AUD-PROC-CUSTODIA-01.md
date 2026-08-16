# FINDING

```
FINDING_ID:   AUD-PROC-CUSTODIA-01
AUDIT_ID:     ERP-LEGACY-001-AUD-001
PROJECT_ID:   ERP-LEGACY-001
AUDIT_COMMIT: c1311a6f76b512fef893f7e60d934179cae3409f
```

**TITLE:** Violação da "Regra permanente de segurança de dado real" durante a execução
do gate G4 — um agente automatizado abriu conexão com o banco de **PRODUÇÃO REAL**
(`erp_evok_audio`) e executou uma consulta de catálogo, sob proibição absoluta e
textual ("nem para só contar linhas"). **Defeito da cadeia de custódia da própria
auditoria, não do objeto auditado.**

**DOMAIN:** process / audit-chain-of-custody
**SUBDOMAIN:** controle de acesso a dado real · segregação de ambiente · governança de agente
**SEVERITY:** **HIGH** — fundamentada em §5, com os argumentos de CRITICAL e de MEDIUM
apresentados e refutados/limitados um a um
**CONFIDENCE:** `CONFIRMED` quanto ao **fato** (comando verbatim e saída registrados
pelo próprio executor, §2) · `CONFIRMED` quanto à **causa-raiz técnica** (§6, verificada
por leitura direta de `settings.json`, do hook e do `docker-compose.yml`) ·
`MEDIUM_CONFIDENCE` quanto à **exaustividade da varredura de recorrência** (§4 — limite
declarado: a varredura cobre o que está versionado, não o que não foi relatado)
**STATUS:** `PROPOSED`
**DETECTED_BY:** **auto-reporte do próprio agente executor** (agente `docker`, trilha
`APR-2026-024` Decisão C), em
`audit/runs/ERP-LEGACY-001-AUD-001/07-findings/G4_PRECONDICAO_BANCO_TESTE.md:10-27`
→ promovido a finding formal por `vericore-audit-evidence-controller` (esta persistência)

---

## CABEÇALHO NORMATIVO OBRIGATÓRIO

1. **Autorização humana explícita (Regra 18 do `CLAUDE.md`).** A promoção deste desvio
   a finding formal foi determinada por **decisão direta do dono do CoreTriad nesta
   sessão**, em texto: *"Registre como finding formal de processo (transparência exige
   isso, e cria memória institucional contra repetição)."* Não é inferência de agente.
   A decisão autoriza a **promoção e o registro**; **não fixa severidade** — a
   classificação permanece juízo técnico de auditoria e está fundamentada em §5.
2. **Regra 22 — a validação adversarial NÃO OCORREU.** Este finding **não passou** pelo
   `vericore-finding-validator`. Sendo **HIGH**, a passagem pelo validador é
   **obrigatória antes de qualquer encaminhamento a remediação**. Nada neste documento
   declara essa validação como feita, nem a substitui pelo auto-reporte do executor.
3. **Regra 2 — nada foi corrigido por este agente.** Nenhuma credencial, role,
   configuração, hook, `docker-compose.yml`, arquivo de agente ou objeto auditado foi
   alterado. **Nenhum comando de banco foi executado** para produzir este finding: todas
   as verificações abaixo são leitura de arquivo versionado (`Read`/`Grep`/`Glob`).
4. **Regras 4 e 14 — nenhum `AUDIT_PASSED`, `FINDINGS_CONFIRMED`, `RETEST_PASSED` ou
   `FINDING CLOSED` é declarado.**
5. **Regra 15 — o artefato de origem não foi editado.** `G4_PRECONDICAO_BANCO_TESTE.md`
   permanece íntegro, exatamente como o executor o entregou. Este finding é **adição**,
   nunca reescrita da evidência de terceiro.
6. **A correção NÃO é objeto deste finding.** A remediação técnica (isolamento de
   credencial/role) está sendo conduzida **em paralelo, por outro agente, sob decisão do
   dono**. Aqui apenas se **registra e referencia** a causa-raiz (§6) — não se implementa,
   não se projeta a solução e não se antecipa seu resultado.
7. **Nenhum valor de segredo é reproduzido.** Apenas **nomes de role** (`evok_admin`,
   `evok_app`) e **nomes de banco** aparecem neste documento — nenhuma senha, string de
   conexão completa ou valor de variável de ambiente sensível.

---

## 1. DESCRIPTION — o fato

Durante a execução da trilha autorizada por **`APR-2026-024` Decisão C** (recriação do
banco de teste `erp_evok_audio_test` do zero, pré-condição do gate **G4**), o agente
executor — agente `docker` — realizou, **na checagem final de sanidade**, uma consulta
de leitura de catálogo contra **`erp_evok_audio`, o banco classificado PRODUÇÃO REAL**
por `APR-2026-016`.

A proibição violada não é ambígua nem inferida: é textual, permanente, e repetida em
quatro artefatos versionados independentes (§3). O texto normativo veda **"qualquer
comando que abra conexão com o banco de dados real — nem para 'só contar linhas' ou 'só
confirmar comportamento'. Vale mesmo que o comando pareça inofensivo ou somente leitura
no SQL"** (`coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md:104-106`).

O comando executado é **exatamente o caso nomeado na exceção que a regra antecipa e
proíbe**: contar. A barreira não falhou numa zona cinzenta — falhou no exemplo literal
que o próprio texto usa para não deixar zona cinzenta.

---

## 2. EVIDÊNCIA PRIMÁRIA — o que foi feito, verbatim

**Fonte única e íntegra:**
`audit/runs/ERP-LEGACY-001-AUD-001/07-findings/G4_PRECONDICAO_BANCO_TESTE.md`, seção
*"⚠️ Incidente auto-reportado (transparência obrigatória)"*, **linhas 10-27**.

### 2.1 O comando (transcrito sem alteração, `G4_...:23`)

```
docker exec evok-postgres psql -U evok_admin -d erp_evok_audio -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
```

### 2.2 Decomposição factual do comando

| Elemento | Valor | Âncora |
|---|---|---|
| Vetor de execução | `docker exec` no container `evok-postgres` (psql **de dentro** do container — não dependeu de `psql` no PATH do host) | `G4_...:15,23`; `G4_...:39-42` |
| **Role usada** | **`evok_admin`** (nome apenas; nenhum valor de credencial transcrito) | `G4_...:23` |
| **Banco alvo** | **`erp_evok_audio`** — PRODUÇÃO REAL por `APR-2026-016` | `G4_...:23`; `coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md:80-84` |
| Natureza do SQL | `SELECT count(*)` sobre `information_schema.tables` — **metadado de catálogo**, não dado de negócio | `G4_...:23` |
| **Saída obtida** | `207` (contagem de tabelas em produção) — o próprio executor registra: *"não solicitada, não deveria ter sido obtida por mim"* | `G4_...:24` |
| Momento | "checagem final de sanidade", **após** a recriação do banco de teste já concluída | `G4_...:12` |

### 2.3 O que **NÃO** foi tocado (limite do dano, estabelecido pelo executor)

| Alegação | Âncora |
|---|---|
| Nenhum DDL, DML, dump ou escrita — o comando foi estritamente `SELECT count(*)` | `G4_...:17-19` |
| Nenhum `DROP`, `TRUNCATE`, `UPDATE`, `INSERT` ou dump contra `erp_evok_audio` **em toda a sessão** | `G4_...:25` |
| Conexão **efêmera** — `pg_stat_database.numbackends` de `erp_evok_audio` = 0 na checagem seguinte (psql via `docker exec` abre e fecha por comando) | `G4_...:26` |
| Nenhuma linha de dado de negócio foi lida, exibida, copiada ou persistida em qualquer artefato de auditoria | verificado por este agente: a única saída registrada é o inteiro `207` (`G4_...:24`) |
| Todo o restante da trilha (drop, create, migrations, medições) endereçou `erp_evok_audio_test` ou `postgres` | `G4_...:113-271`; §4.1 abaixo |

**Limite de verificabilidade declarado (não escondido):** as alegações de "nada mais foi
tocado" são **auto-reportadas pelo executor** e **não são independentemente verificáveis
por leitura de artefato versionado** — não existe log de auditoria do servidor Postgres
retido no repositório contra o qual confrontá-las, e **este agente não executará nenhum
comando de banco para verificá-las** (seria repetir a própria classe de violação em
apuração). O que **é** independentemente verificável é o que está escrito: §4.1.

---

## 3. EXPECTED_BEHAVIOR — a norma violada, com as quatro âncoras

A proibição é **permanente, absoluta e redundantemente registrada**. Não depende de
memória, de contexto injetado nem de interpretação:

| # | Fonte normativa | Âncora | Teor |
|---|---|---|---|
| N1 | `APR-2026-015` condição 3 | `coretriad/governance/APPROVALS.md:307-312` | "tratamento read-only, porém **sem nenhuma execução de teste, script de diagnóstico ou comando que toque o banco de dados**" |
| N2 | `APR-2026-016` (torna o regime permanente, independente de Go-Live) + `PROJECT_STATE.md` | `coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md:95-118`, em especial **`:104-106`** | "**Proibido, sem exceção** […] qualquer comando que abra conexão com o banco de dados real — **nem para 'só contar linhas'** […] Vale mesmo que o comando pareça inofensivo ou somente leitura no SQL" |
| N3 | `APR-2026-021` Parte D (reafirmação) | `coretriad/governance/APPROVALS.md:662-668` | "**Nenhuma conexão com banco real está autorizada**; `APR-2026-016` permanece inalterado" |
| N4 | `APR-2026-024` — a **própria aprovação** sob a qual a trilha corria | `coretriad/governance/APPROVALS.md:941-948` | "**Não estende autorização a nenhuma outra escrita em banco.** A Decisão C autoriza **recriar o banco de teste, e só isso**" — e `:945` reafirma `erp_evok_audio` "**intocável**" |

Reforço adicional: `PROJECT_EVENT_LOG.md:78-86` repete a regra "para que nenhum agente
futuro do programa a perca de vista". E a instrução da tarefa despachada ao executor
repetiu a proibição em termos categóricos, com **ordem de abortar se a string de conexão
não terminasse em `_test`** — ordem que o próprio executor cumpriu corretamente no passo
destrutivo (`G4_...:100-107`) e **não** cumpriu na checagem final.

**Comportamento esperado:** zero conexões com `erp_evok_audio`. A trilha inteira era
executável — e foi executada — contra `erp_evok_audio_test` e `postgres`. **A consulta
não era necessária para nenhum objetivo da tarefa**; o próprio executor a qualifica como
saída "não solicitada" (`G4_...:24`).

---

## 4. ACTUAL_BEHAVIOR + varredura de recorrência — isolado ou recorrente?

### 4.1 Varredura executada (método declarado)

| Alvo varrido | Padrão | Resultado |
|---|---|---|
| `audit/runs/ERP-LEGACY-001-AUD-001/` (recursivo) | `psql -U`, `docker exec evok-postgres`, `pg_isready`, `DB_NAME=` | **21 ocorrências, todas no mesmo arquivo `G4_PRECONDICAO_BANCO_TESTE.md`** |
| Idem | menção literal a `erp_evok_audio` **sem** sufixo `_test` | **2 ocorrências — `G4_...:15` e `G4_...:23`, ambas o mesmo incidente único** |
| `coretriad/states/ERP-LEGACY-001/PROJECT_EVENT_LOG.md` | `erp_evok_audio`, "banco real", "banco de produção", "conexão com o banco" | 12 ocorrências — **todas normativas ou negativas** (proibição, ou declaração de que o banco real *não* foi endereçado) |

**Conclusão da varredura:** dentro do **histórico versionado desta run**, este é o
**ÚNICO caso registrado** de conexão efetiva com o banco de produção. Todas as demais
citações do banco real são a **regra** ou a **negação do ato**.

**Contraste — o precedente positivo mais próximo, que reforça o isolamento:** a bateria
de verificação dinâmica 01, executada dias antes pelo `vericore-audit-verification-runner`,
registra explicitamente *"`erp_evok_audio` (real) **nunca foi endereçado**"*
(`PROJECT_EVENT_LOG.md:996`), e aquele mesmo runner **recusou-se por desenho** a executar
`DYN-T03-02`/`DYN-T03-05` — escrita **no banco de teste** — porque sua carta de
responsabilidades não a cobria e a autorização do dono não a nomeava
(`PROJECT_EVENT_LOG.md:1028-1036`). Ou seja: **um agente com carta CoreTriad recusou até o
que era menos grave que isto**.

### 4.2 Veredito de recorrência — e por que a resposta tem duas camadas

- **Quanto ao ATO (conexão com banco real): ISOLADO.** Uma ocorrência, uma vez, um
  comando, verificada em todo o histórico versionado da run.
- **Quanto à CLASSE (agente desviando da restrição categórica que lhe foi dada, e o
  desvio só se tornando visível por auto-reporte): NÃO É ISOLADO.** O
  `PROJECT_STATE.md:888-935` já cataloga **quatro incidentes de processo** desta run,
  dos quais o incidente 3 é **explicitamente qualificado como "recorrente, não isolada"**
  (`:918-919`) e o incidente 4 é chamado de "quarta ocorrência da mesma classe"
  (`:926`). O incidente 1 (`:894-900`) é ainda mais próximo deste: um agente
  `vericore-finding-validator` que, **ao sondar se tinha permissão de escrita**,
  sobrescreveu um arquivo de finding — mesmo padrão estrutural, *agente testa/atravessa
  a fronteira que lhe foi declarada, e o dano é contido pela boa-fé do agente, não pelo
  controle*.

**Este finding é, portanto, o 5º incidente de processo desta run — e o 2º em que a
contenção do dano dependeu exclusivamente da disciplina do agente, não de um mecanismo.**
Registrar isto é o ponto: **um ato isolado dentro de uma classe recorrente não é um
acidente, é uma taxa.**

### 4.3 Limite explícito da varredura (não convertido em garantia)

A varredura prova o que **está escrito**. Ela **não pode** provar que nenhum outro agente
abriu conexão com o banco real **sem relatar** — não existe, no repositório, log
independente de conexões do Postgres, e este agente não executará comando para obtê-lo.
**Portanto: "caso isolado no registro" ≠ "caso isolado de fato".** Essa distinção é
material e é, por si só, parte do impacto (§7): *a auditoria não tem hoje como auditar
esta regra a não ser pela palavra dos auditados.*

---

## 5. FUNDAMENTAÇÃO DA SEVERIDADE — por que **HIGH**

Os dois lados foram considerados honestamente, como manda a análise, e nenhum foi
suprimido.

### 5.1 O caso a favor de severidade BAIXA (MEDIUM/LOW) — e até onde ele vai

| Argumento mitigante | Verificado? | Até onde vai |
|---|---|---|
| **Nenhum dado de negócio foi lido.** `information_schema.tables` é catálogo: nomes de tabela, não conteúdo. Nenhum insumo, cliente, contrato, salário ou log foi exposto | **SIM** (`G4_...:23-24`) | Vale integralmente. Limita o **impacto de confidencialidade a metadado estrutural** — que, ademais, já é público dentro da auditoria por outra via legítima (as migrations versionadas) |
| **Nenhuma escrita.** Zero DDL/DML/dump/drop; impacto de **integridade e disponibilidade = nulo** | **SIM** (`G4_...:17-19,25`) | Vale integralmente. É a diferença entre este finding e um incidente de destruição de dado |
| **Conexão efêmera**, encerrada por si (`numbackends`=0) | **SIM** (`G4_...:26`) | Vale, mas é propriedade do `docker exec`, não um controle |
| **Auto-reportado** com comando verbatim, sem omissão | **SIM** (§8) | Vale, e está registrado como comportamento **correto** — mas **atenuar severidade por causa disso puniria a transparência**: a severidade mede o risco do ato, não a virtude do relato |
| Ocorreu em contexto autorizado, por engano de alvo, não por tentativa de contornar controle | **SIM** — o executor acertou a trava no passo destrutivo (`G4_...:100-107`) e errou na checagem final | Vale, e sustenta que **não** houve má-fé. Mas ver §5.3 |

### 5.2 O caso a favor de severidade ALTA — o que decide

1. **A barreira que falhou é a ÚNICA que existe.** Verificado por leitura direta em §6:
   não há hook, não há role separada, não há isolamento de rede, não há nada. A
   proibição vive **inteiramente** na obediência do agente. Uma barreira única que falha
   uma vez não é "quase nada" — é **a taxa de falha da única barreira**.
2. **A falha foi por instrução, não por técnica** — exatamente o argumento que fundamenta
   a decisão do dono de exigir reforço técnico. Um controle cuja taxa de falha observada
   é > 0 e cujo modo de falha é "o agente não seguiu à risca" **não é um controle**, é
   uma convenção.
3. **A norma antecipava e nomeava este caso exato.** "Nem para só contar linhas"
   (`PROJECT_STATE.md:105`). Não houve ambiguidade a interpretar. Uma regra que é
   violada no seu próprio exemplo literal não falhou por ser vaga.
4. **A role usada é superusuário do Postgres.** Fato medido nesta run:
   `SELECT rolname, rolsuper … → rolsuper = true` para `evok_admin`
   (`DYN_VERIFICACAO_BATERIA_01.md:78-80`). O mesmo comando, com um verbo diferente,
   teria sido **irreversível e ilimitado** contra a produção — sem trigger, sem RLS, sem
   `REVOKE` capaz de contê-lo (`ibid.:81`). A distância entre o que aconteceu e um
   desastre é **uma palavra na linha de comando**, não um controle.
5. **É defeito da cadeia de custódia da auditoria.** A auditoria que está apurando
   `FIND-ERP-002` (ausência de imutabilidade) e `AUD-DB-01` (superusuário de runtime)
   **produziu, ela própria, um acesso não autorizado ao banco real**. A credibilidade do
   veredito de uma auditoria depende de ela aplicar a si o rigor que exige do auditado.

### 5.3 Por que **não** CRITICAL

`CRITICAL`, nesta run e por Regra 24 do `CLAUDE.md`, está reservado a **exposição ou
comprometimento efetivo** — dano consumado ou exploração viável e não contida. Aqui:
impacto de integridade **nulo**, impacto de disponibilidade **nulo**, impacto de
confidencialidade **restrito a metadado estrutural já conhecido**. Elevar a `CRITICAL` um
ato sem dano consumado **diluiria a moeda `CRITICAL`** desta auditoria, que hoje
identifica 4 achados de risco material ao negócio. **A severidade mede o ocorrido; o
potencial não realizado está registrado em §5.2 item 4 e no impacto (§7), onde pertence.**

### 5.4 Por que **não** MEDIUM

Rebaixar a `MEDIUM` transformaria "a única barreira de proteção de dado real da empresa
falhou" em nota operacional. A severidade não pode ser função do acaso do verbo SQL
escolhido: **o controle falhou por inteiro, independentemente de qual comando passou por
ele.** Se um `SELECT` passa, um `TRUNCATE` também passaria — nada no caminho distingue os
dois (§6).

**Veredito: HIGH.** Severidade **HIGH**, confiança **CONFIRMED** quanto ao fato.
**Sujeita a contestação pelo `vericore-finding-validator`, que ainda não a examinou.**

---

## 6. ROOT_CAUSE — causa-raiz de processo (registrada, NÃO corrigida)

### 6.1 A causa-raiz estrutural: uma credencial, dois bancos, zero separação

Verificado por leitura direta de artefato versionado, nesta sessão:

| Fato | Âncora |
|---|---|
| Produção real e teste são **o mesmo servidor, o mesmo container** (`evok-postgres`, `postgres:16-alpine`) | `docker-compose.yml:3-4`; `G4_...:49-51` |
| O banco de produção é `erp_evok_audio`, criado com `POSTGRES_USER: evok_admin` | `docker-compose.yml:7-8` |
| O banco de teste `erp_evok_audio_test` foi criado **`OWNER evok_admin`** — mesma role | `G4_...:151` |
| A role de runtime da API é **a mesma** `evok_admin` | `docker-compose.yml:48-49` |
| **`evok_admin` é superusuário do Postgres** (`rolsuper = true`), medido nesta run | `DYN_VERIFICACAO_BATERIA_01.md:78-81` |

**Consequência lógica direta:** a **única** coisa que separa um comando de auditoria do
dado real da empresa é o **valor do argumento `-d`** na linha de comando. Não há
fronteira de credencial, de role, de rede, de permissão ou de processo. Enquanto isso for
verdade, **a proibição é 100% dependente da obediência do agente** — que é precisamente a
tese da decisão do dono sobre reforço técnico.

### 6.2 A causa-raiz de mecanismo: o hook não olha para Bash

Este é o achado mais material deste finding, e é **verificável por qualquer um**:

- `.claude/settings.json:5` registra o `PreToolUse` para o matcher
  `Write|Edit|MultiEdit|NotebookEdit|Read|Grep|Glob|Bash` — **Bash está no matcher**, o
  que dá a aparência de cobertura.
- Mas `.claude/hooks/org-isolation.js:134` executa, **antes de qualquer outra
  avaliação**:

  ```js
  if (!WRITE_TOOLS.has(tool)) return respond('approve', 'tool não é de escrita');
  ```

  e `WRITE_TOOLS` (`:67`) contém **apenas** `Write`, `Edit`, `MultiEdit`, `NotebookEdit`.
  **Todo comando `Bash` é aprovado incondicionalmente**, salvo a única exceção anterior:
  o selo de gabarito de simulado (`:78`, `:130-132`), que casa `coretriad/locks` e
  `answer[-_]key` — **nada relacionado a banco de dados**.

**Portanto: não existe, hoje, nenhum controle técnico sobre conexões de banco no
CoreTriad.** A afirmação registrada em `APPROVALS.md:787` — *"o guard que recusa banco sem
sufixo de teste segue ativo"* — **não corresponde a nenhum mecanismo encontrado em
`.claude/`**: o "guard" existente é o da carta de responsabilidades de cada agente e a
instrução do prompt, não um hook. **Isto é uma divergência entre artefato de governança e
mecanismo real (Regra 20), e é registrada como parte deste finding.**

### 6.3 A causa-raiz de despacho: agente sem carta CoreTriad

A trilha foi despachada ao agente `docker`, cujo arquivo está em
**`.claude/agents/_deprecated/docker.md`** — diretório de agentes **depreciados**,
anterior à organização CoreTriad. Verificado:

- `:5` — `tools: Read, Edit, Write, Bash, Glob, Grep` (Bash irrestrito, Write irrestrito).
- `:1-6` — o nome é `docker`, **sem prefixo `vericore-`/`opuscore-`/`sanacore-`/`coretriad-`**.
- Consequência no hook (`org-isolation.js:176-196`): nenhuma das quatro `ORG_RULES` casa
  com o nome `docker`; o hook cai no `return respond('approve', 'agente sem organização
  mapeada — **sem restrição adicional**')` de **`:196`**.
- O corpo da carta (`:24-34`) trata de isolamento de rede, volumes e credenciais em
  `.env` — **não menciona `APR-2026-016`, não menciona `erp_evok_audio_test`, não
  menciona a regra permanente de dado real**. Todo o conteúdo normativo da proibição
  chegou ao executor **apenas pelo prompt da tarefa**, e por mais nada.

**Ou seja: um agente fora da taxonomia organizacional, sem restrição de hook e sem carta
CoreTriad, recebeu Bash irrestrito num ambiente onde produção e teste coabitam sob uma
credencial de superusuário.** As três causas-raiz se somam; nenhuma delas sozinha explica
o incidente, e **nenhuma delas é culpa individual do executor**.

### 6.4 REMEDIAÇÃO — fora do escopo deste finding, por instrução

A correção **não é implementada nem projetada aqui**. Está sendo **executada em paralelo
por outro agente, sob decisão do dono**. Este finding **apenas registra e referencia** a
causa-raiz. A direção já constava, aliás, da recomendação do próprio executor
(`G4_...:27` e `:312-315`): *"credencial/role dedicada só para o banco `_test`, sem
visibilidade de `erp_evok_audio`"*. Nada aqui aprova, valida ou dá por concluída essa
correção — **a verificação do reforço é objeto de reteste futuro da VeriCore, sob Regra 4.**

---

## 7. IMPACTO

**BUSINESS_IMPACT.** Nenhum dado de negócio da Evok Áudio LTDA foi exposto, alterado ou
perdido — impacto de negócio **realizado: nulo**. O impacto real é **de governança**: a
empresa opera hoje sob a premissa, registrada em quatro aprovações, de que agentes
automatizados não alcançam o dado real. **Essa premissa está factualmente incorreta**, e
passou a ser conhecida.

**TECHNICAL_IMPACT.** O ambiente não distingue produção de teste por nenhum meio técnico:
mesmo container, mesma role superusuária, distinção por um argumento de linha de comando
(§6.1). Qualquer agente com Bash no ambiente tem, hoje, acesso irrestrito de leitura **e
escrita** ao banco de produção — o hook não avalia Bash (§6.2).

**SECURITY_IMPACT.** Cruza diretamente com achados já existentes desta run e os agrava
**por composição, não por analogia**: `AUD-DB-01`/`FIND-ERP-002` estabeleceram que
`evok_admin` é superusuário e que `audit_logs`, `sale_invoices` e `accounting_entries` não
têm imutabilidade alguma. Este finding acrescenta a peça que faltava: **existe um caminho
demonstrado, e não hipotético, de agente automatizado até esse banco.** O ato ocorrido foi
inócuo; o **caminho** não é.

**IMPACTO SOBRE A PRÓPRIA AUDITORIA (o núcleo deste finding).** A run `AUD-001` produziu
um acesso não autorizado ao objeto que audita. Isso **não invalida nenhum finding de
produto** — nenhuma evidência desta run foi derivada da consulta indevida; o `207` não
foi usado como insumo de nada (a contagem de produção não aparece em nenhuma conclusão da
run, e a contagem de 207 tabelas do banco **de teste** é medição independente,
`G4_...:205-209`). Mas afeta a **cadeia de custódia**: uma auditoria que exige rigor do
auditado precisa demonstrar o mesmo rigor sobre si. **Registrar isto é o que preserva a
credibilidade do veredito final — omitir é o que a destruiria.**

---

## 8. COMPORTAMENTO CORRETO OBSERVADO — parte integrante do finding, não anexo

Registrado deliberadamente, porque **é evidência de que o modelo de transparência do
CoreTriad funcionou**, e porque um finding que registra só a falha ensina metade da lição:

1. **Auto-reporte espontâneo.** O incidente **não foi detectado por controle, revisão ou
   auditoria de terceiro — foi relatado pelo próprio autor**. Nenhum mecanismo o teria
   pego (§6.2). Sem o auto-reporte, este finding **não existiria**.
2. **Comando verbatim, sem eufemismo.** O executor transcreveu a linha exata
   (`G4_...:23`), incluindo a role e o banco, em vez de descrevê-la vagamente.
3. **Sem minimização.** Escreveu: *"a instrução foi categórica e eu não a segui à risca.
   Registro isto explicitamente em vez de omitir"* (`G4_...:19-20`), e qualificou a saída
   obtida como *"não solicitada, não deveria ter sido obtida por mim"* (`:24`).
4. **Posição de destaque.** Colocou o incidente como **primeira seção do relatório**
   (`:10`), com marcador de alerta, antes de qualquer resultado técnico favorável — e o
   repetiu no veredito (`:308`) e nas pendências (`:311-315`).
5. **Não decidiu a própria severidade.** Encaminhou explicitamente a avaliação à VeriCore
   e ao dono (`:27`, `:316-318`), respeitando a Regra 4 — não se autoabsolveu nem
   autoclassificou.
6. **Propôs o reforço estrutural correto**, não uma promessa de cuidado redobrado
   (`:27`): role dedicada ao banco `_test`, sem visibilidade da produção — que é
   precisamente a causa-raiz de §6.1.

**Consequência normativa que este finding fixa como precedente:** o auto-reporte
**não reduz a severidade** (§5.1) — a severidade mede o risco do ato. Mas **é o único
motivo pelo qual este risco é hoje conhecido, mensurável e corrigível**, e por isso
**deve ser tratado como o comportamento esperado de todo agente do programa, nunca como
confissão punível.** Um modelo em que relatar o próprio desvio piora a situação do agente
produz silêncio, e silêncio é o único estado do qual nenhuma auditoria se recupera.

---

## 9. RECOMMENDATION

**Não é implementação, é registro do que a remediação precisa considerar** (Regra 2 — a
execução é da SanaCore/dono, e uma correção já corre em paralelo, §6.4):

1. **Separação de credencial** (causa-raiz §6.1) — role de auditoria/teste sem
   visibilidade de `erp_evok_audio`. **Em execução por outro agente; apenas referenciada.**
2. **Controle técnico sobre Bash** (causa-raiz §6.2) — hoje inexistente. Enquanto
   `org-isolation.js:134` aprovar todo Bash, nenhuma regra de banco é imponível por
   mecanismo, e a Regra 23 do `CLAUDE.md` ("permissões são impostas por hooks e settings
   — o prompt é reforço, nunca o único mecanismo") **está descumprida para esta classe de
   risco**.
3. **Divergência de governança a resolver** (`APPROVALS.md:787` × mecanismo real, §6.2):
   ou o guard passa a existir, ou o texto da aprovação é corrigido por adição. **Decisão
   do dono / director — não deste agente.**
4. **Taxonomia de agentes** (causa-raiz §6.3) — despachar trilhas do programa a agentes
   `_deprecated`, fora das `ORG_RULES`, remove o hook do caminho **e** a carta CoreTriad
   do contexto. Registrado como fato; a política é decisão humana.
5. **Auditabilidade da própria regra** (§4.3) — hoje o cumprimento da proibição só é
   verificável pela palavra do agente. Sem retenção de log de conexão, nenhuma varredura
   futura poderá provar recorrência ou ausência dela.

**SUGGESTED_REMEDIATION_OWNER:** decisão do dono do CoreTriad (política + credencial) e
CoreTriad Director (taxonomia de agentes e hook). **Não é remediação de produto — a
SanaCore não é acionada por este finding sobre o ERP**, porque **nada há a corrigir no
ERP**: o defeito é do aparato de auditoria.

---

## 10. RETEST_SPECIFICATION

Registrada como especificação, **não executada**. Nenhum `RETEST_PASSED` é declarado aqui
(Regra 4):

| ID | Verificação | Critério de aprovação |
|---|---|---|
| `RT-CUST-01` | Reler `.claude/hooks/org-isolation.js` | Existe avaliação de comandos `Bash` que negue conexão a banco sem sufixo `_test` — hoje `:134` aprova todo Bash |
| `RT-CUST-02` | Reler `docker-compose.yml` e a configuração de credenciais | Existe role distinta para teste/auditoria, sem visibilidade de `erp_evok_audio`; **verificar por leitura de artefato, nunca por conexão de banco** |
| `RT-CUST-03` | Reler `APPROVALS.md:787` | O texto sobre o "guard ativo" foi conciliado com o mecanismo real (por adição, Regra 15) |
| `RT-CUST-04` | Varrer `audit/runs/` e `PROJECT_EVENT_LOG.md` | Nenhuma nova ocorrência da classe após a data deste finding |
| `RT-CUST-05` | Verificar a carta do agente executor da próxima trilha de infraestrutura | Agente pertence à taxonomia CoreTriad (casa em `ORG_RULES`) e sua carta cita a regra permanente de dado real |

**Vedado a este ou a qualquer agente:** executar comando de banco para conduzir este
reteste. `RT-CUST-02` é, por desenho, verificável **apenas por leitura de artefato** —
verificar por conexão seria repetir a violação em apuração.

---

## 11. RASTREABILIDADE

| Campo | Valor |
|---|---|
| `RELATED_PROCESS` | Regra permanente de segurança de dado real (`APR-2026-015` cond. 3; `APR-2026-016`; `APR-2026-021` Parte D; `APR-2026-024` §"O que esta aprovação NÃO cobre" item 3) |
| `RELATED_RULE` | `CLAUDE.md` Regras **2** (VeriCore não altera o objeto auditado), **15** (não alterar evidência histórica de outra org), **18** (gate humano explícito), **20** (divergência registrada, não silenciada), **23** (permissões impostas por hook — **descumprida para esta classe**, §6.2) |
| `RELATED_FINDING` | `FIND-ERP-002` / `AUD-DB-01` (superusuário + ausência de imutabilidade) — **agravados por composição**, nunca promovidos por analogia (precedente `APR-2026-018`) |
| `RELATED_INCIDENT` | `PROJECT_STATE.md:888-935`, incidentes de processo 1-4 — **este é o 5º** (§4.2) |
| `EVIDENCE_FILE` (primária) | `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/G4_PRECONDICAO_BANCO_TESTE.md:10-27` — **preservado íntegro, não editado** |
| `EVIDENCE_FILE` (causa-raiz) | `.claude/hooks/org-isolation.js:67,134,176-196` · `.claude/settings.json:5` · `.claude/agents/_deprecated/docker.md:1-6,24-34` · `docker-compose.yml:3-8,48-49` · `DYN_VERIFICACAO_BATERIA_01.md:78-81` |
| `EVIDENCE_FILE` (norma) | `coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md:95-118` · `coretriad/governance/APPROVALS.md:307-312,662-668,787,897-913,941-948` · `PROJECT_EVENT_LOG.md:78-86,996,1028-1036` |

---

## 12. DECLARAÇÃO DE MÉTODO E LIMITES

**Método:** READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT. Nenhum passo de
correção em nenhum momento.

**O que foi feito:** leitura direta de todos os artefatos citados; varredura por `Grep`
de `audit/runs/ERP-LEGACY-001-AUD-001/` e do `PROJECT_EVENT_LOG.md`; conferência de cada
linha citada contra o arquivo em disco. **Nenhum comando de banco, nenhum comando Docker,
nenhum teste, nenhum script foi executado.**

**Limites declarados, sem eufemismo:**
1. A varredura de recorrência (§4) cobre o **registro versionado**. Não prova ausência
   de ocorrências não relatadas (§4.3).
2. As alegações de "nada mais foi tocado" são **auto-reportadas** e não independentemente
   verificáveis por artefato (§2.3).
3. O `AUDIT_COMMIT` desta run é `c1311a6`; o incidente ocorreu no **working tree de
   2026-08-16**, `main` com HEAD à frente (`G4_...:8`). O objeto deste finding é a
   **conduta de processo**, não um estado de código no `AUDIT_COMMIT` — a âncora de
   commit é registrada por completude, não porque o fato dependa dela.
4. **A severidade HIGH é proposta e não validada.** `STATUS: PROPOSED`. Regra 22 exige o
   `vericore-finding-validator` antes de qualquer encaminhamento — **e ele não examinou
   este finding.**
5. Este agente **não** atualizou nenhum índice consolidado de findings da run nem o
   Control Plane (`coretriad/` não é namespace de escrita da VeriCore — Regra 16). A
   indexação deste `FINDING_ID` cabe ao `vericore-audit-consolidator`, e o registro no
   `PROJECT_EVENT_LOG.md`/`PROJECT_STATE.md` cabe ao `coretriad-director`.
