# RETEST REPORT — SIM-002-AUD-001 — RODADA WAVE-E (continuação normativa)

AUDIT_ID: SIM-002-AUD-001
PROJECT_ID: SIM-002
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
REMEDIATION_COMMIT desta rodada: `ac3e277`
DATA: 2026-08-13
EMITIDO_POR: vericore-software-audit-director
EXECUÇÃO TÉCNICA: vericore-audit-verification-runner (harness próprio, fora do repositório)
BASE CONTRATUAL: `coretriad/contracts/RETEST_REPORT.md`

> **Estatuto deste arquivo.** Este documento é a **§7 e a §8 do
> `30-retest/RETEST_REPORT.md`** e forma com ele um único relatório. A partir
> desta data:
> - o **veredito vigente do run** é o da **§8 deste arquivo**;
> - a **§6 do `RETEST_REPORT.md`** passa a valer como **registro histórico**, e
>   não como decisão vigente — exatamente como a §3 daquele arquivo passou a ser
>   histórica quando a §6 a substituiu;
> - **nada do `RETEST_REPORT.md` foi apagado, reescrito ou alterado.**
>
> **Motivo declarado da separação em arquivo (transparência de método).** O
> conjunto de ferramentas disponível a este diretor nesta sessão permite apenas
> escrita integral de arquivo, não edição incremental. Reescrever 1.173 linhas de
> evidência histórica de auditoria para acrescentar uma seção introduziria risco
> de alteração silenciosa de registro pertencente a rodadas anteriores — o que a
> **Regra 15** proíbe e que seria pior do que a inconveniência de dois arquivos.
> Optou-se pela continuação vinculada. Recomenda-se ao responsável pelos
> relatórios concatenar os dois arquivos no arquivamento final, sem edição de
> conteúdo.

> Autoridade: somente a VeriCore declara `RETEST_PASSED` e `FINDING CLOSED`
> (Regra 4). A VeriCore não corrigiu, não refatorou e não tocou em `product/`,
> `src/`, `tests/` ou `requirements/` (Regra 2). Este diretor **não** declara
> `REMEDIATION COMPLETE` — autoridade da SanaCore (Regra 3).

---

# 7. RODADA WAVE-E — 2026-08-13

CASE_ID: WAVE-E
REMEDIATION_COMMIT: `ac3e277`
ESCOPO DA ONDA: FIND-SIM-002-014, OBS-SIM-002-007 e OBS-SIM-002-008 item (c).
HUMAN GATES QUE DESTRAVARAM A ONDA: **APR-2026-011**, **APR-2026-012** e
**APR-2026-013** (`coretriad/governance/APPROVALS.md`) — **lidos integralmente e
na íntegra do arquivo versionado** por este diretor antes de emitir qualquer
veredito (Regra 18: human gate não se supre por inferência nem por relato de
terceiro; aqui há decisão humana explícita e registrada, e foi verificada na
fonte).

## 7.0 Condições de independência e integridade do reteste

Verificadas e aceitas:

1. **Harness próprio, fora do repositório** — a suíte da OpusCore/SanaCore não
   foi usada como prova única.
2. **Comparação antes/depois com o MESMO código de teste** — o mesmo harness foi
   executado contra o baseline **`bba830f`** (estado não remediado) e contra o
   estado remediado. Há, portanto, **prova de discriminação** para os itens
   decisivos, e não mera afirmação de conformidade.
3. **Estado lido do banco**, não inferido da exceção lançada, em todos os
   cenários com pós-condição.
4. **Working tree limpo antes e depois** — sem contaminação do objeto medido.
5. **Produto de `ac3e277` idêntico ao HEAD** — a equivalência produto↔HEAD está
   demonstrada para o estado integrado desta onda.
6. **Suíte 60/60**, com **prova de mutação** (4 mutantes introduzidos, 4 mortos).

### Registro positivo de conduta de evidência (SanaCore)

A SanaCore **detectou e corrigiu, por iniciativa própria, um teste tautológico**
que importava a constante do próprio módulo sob teste — isto é, um teste que não
poderia falhar. Registro isso por três razões: (i) é o **mesmo antipadrão** que
esta auditoria vinha carregando como **OBS-SIM-002-005** desde a WAVE-A; (ii) é o
oposto do desvio de precisão registrado na WAVE-C (§1.3, item 5), e a segunda
ocorrência consecutiva de auto-declaração desfavorável pela SanaCore (a primeira
originou o próprio FIND-014); (iii) uma prova de mutação executada **sobre uma
suíte que continha um teste tautológico** só tem valor porque o tautológico foi
removido antes — a ordem importa, e foi respeitada.

Isto **não** dispõe da OBS-005, cujo objeto é especificamente TC-SIM2-003b, nem
substitui a varredura do antipadrão na suíte inteira — ao contrário: **confirma
que o antipadrão é vivo neste código-base** e reforça a necessidade da varredura.
Ver §7.5.

---

## 7.1 FIND-SIM-002-014 — alçada de aprovação por papel autodeclarado

FINDING_ID: FIND-SIM-002-014
CASE_ID: WAVE-E
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
REMEDIATION_COMMIT: `ac3e277`
BASELINE DE DISCRIMINAÇÃO: `bba830f`
HUMAN GATE: **APR-2026-011** — o papel que autoriza `approveSupplier` deve ser
verificado no servidor contra a **mesma fonte de identidade** (`users` /
`identity.js`), **nunca autodeclarado no payload**.

### 7.1.1 Acionamento da cláusula de elevação obrigatória — HIGH → CRITICAL

O finding registrou, na abertura, cláusula de elevação obrigatória a CRITICAL
disparada por, entre outras, a condição **(c)**: *"decisão humana estender
expressamente a APR-2026-008 a `approveSupplier` — a partir daí passa a existir
norma violada de forma direta, e o enquadramento é o da Regra 24 sem ressalva
aplicável"*.

A **APR-2026-011 é literalmente essa extensão** ("estender a APR-2026-008 à
operação de aprovação"). A condição (c) **ocorreu**. Portanto, **antes** de
julgar o reteste — e não depois —, a severidade do FIND-SIM-002-014 é
**elevada de HIGH para CRITICAL**, pelo mesmo método aplicado em §5.3 e §5.5:
o fechamento se dá sobre a severidade correta, não sobre a severidade
conveniente. A elevação é ato de aplicação de cláusula pré-registrada, não
reclassificação discricionária.

Consequência prática: este run passa a ter **5 findings CRITICAL**, e o
fechamento abaixo é o fechamento de um CRITICAL.

### 7.1.2 Evidência antes/depois

**Item decisivo — procedência do papel.** Payload declarando `role:'manager'`
falso, cujo registro em `users` diz `analyst`, aprovando `creditLimit = 50000`:

| | `bba830f` (antes) | `ac3e277` (depois) |
|---|---|---|
| Resultado | **APROVOU** | **RECUSOU** |
| `suppliers.credit_limit` | **50000** | inalterado (banco intacto) |
| `suppliers.approved_by` | **`"u-analyst"`** | inalterado (banco intacto) |

Este é o quadro probatório mais forte produzido em todo o run sobre este
finding: o **mesmo** código de teste, contra dois estados, com o defeito
**reproduzido** no baseline e **extinto** no remediado, e a pós-condição lida do
banco. Note-se ainda que o `approved_by` gravado no baseline (`"u-analyst"`) é a
prova documental de que o papel era falso e a identidade real era do analista —
o próprio registro de autoria denunciava a fraude que a função não impediu.

**Demais cenários medidos em `ac3e277`:**

| Cenário | Resultado | Norma verificada |
|---|---|---|
| `manager` real, 50000 | **aprovado** | não-regressão do caminho positivo |
| `analyst` real, 10000 | **aprovado** | BR-APR-001, fronteira inclusiva |
| `analyst` real, 10001 | **recusado** | BR-APR-001, acima da alçada |
| `approver.id` inexistente (999999) | **recusado** — *"Usuário não autenticado"* | Regra 24 / APR-2026-011 |
| aprovador de outra empresa declarando `companyId` alheio | **recusado** | BR-SEC-001 |

O cenário do `approver.id` inexistente tem **prova de discriminação própria**: em
`bba830f` a chamada **aprovava** e gravava `approved_by = "77.0"` — ou seja, o
mesmo vetor produzia, simultaneamente, aprovação por sujeito inexistente **e** a
corrupção de identificador registrada como OBS-SIM-002-001. Em `ac3e277` a
chamada é recusada. Disposição da OBS-001 em §7.4.

### 7.1.3 RETEST_SPEC_EXECUTED — item a item, contra a spec do próprio finding

1. **Teste decisivo de procedência** → **ATENDIDO**, com prova de discriminação
   e pós-condição lida do banco.
2. **`manager` verdadeiro aceito acima de 10000** → **ATENDIDO** (50000).
3. **`analyst` verdadeiro aceito até 10000 inclusive e recusado acima** →
   **ATENDIDO** (10000 aceito / 10001 recusado). *Delimitação menor:* esta rodada
   exercitou a fronteira em granularidade inteira; a fronteira em R$ 0,01
   (10000,01) foi exercitada na WAVE-A sobre **a mesma constante** e reconfirmada
   em §5.4. Não considero lacuna material, mas registro para não afirmar mais do
   que foi medido nesta rodada.
4. **`approver` inexistente na fonte de identidade → recusado** → **ATENDIDO**,
   com discriminação.
5. **`companyId` forjado apontando outra empresa → recusado, com a empresa
   resolvida pela fonte de identidade** → **ATENDIDO**, com discriminação.
6. **`approved_by` gravado a partir da identidade resolvida, e como texto, sem a
   coerção de OBS-001** → **ATENDIDO NA PRIMEIRA METADE, NÃO EVIDENCIADO NA
   SEGUNDA.** A procedência está provada: o identificador não pode mais vir do
   payload (cenário 999999 recusado). O **formato efetivamente persistido** após
   uma aprovação bem-sucedida **não foi lido positivamente** nesta rodada. Não
   presumo que esteja correto nem que esteja errado. Residual em §7.4.
7. **Prova de discriminação** → **ATENDIDA EM SUBSTÂNCIA**, com uma ressalva de
   rastreabilidade que registro por dever: a spec nomeava `b6d44da` como estado
   contra o qual o teste deveria falhar; o runner usou **`bba830f`**. O propósito
   da exigência está cumprido — o teste falhou contra um estado não remediado
   real, que exibiu o defeito exato. Mas a **equivalência/ancestralidade entre
   `bba830f` e `b6d44da` não é verificável a partir do meu namespace**, e não a
   presumo. Item de rastreabilidade do delta audit (§8, item 12 da lista).

REGRESSION_EXECUTED: suíte **60/60** (12/12 no `AUDIT_COMMIT` → 60/60), com
prova de mutação (4/4 mortos). Regressão integrada em §7.3.
SIDE_EFFECTS_CHECKED: sim — recusas sem persistência parcial; banco relido.
REQUIREMENT_RECHECKED: **APR-2026-011** (norma fonte); **Regra 24** do
`CLAUDE.md`; **BR-APR-001** (`requirements/BUSINESS_RULES.md:19-29`), cuja
eficácia prática dependia deste finding e que agora se apoia em papel
verificado; **BR-SEC-001**.
DOCUMENTATION_RECHECKED: **não executável a partir deste namespace** — a
inspeção documental de `ac3e277` exige delta audit. Registrado em OBS-006.

### 7.1.4 Delimitação do fechamento (obrigatória, não cosmética)

**O que se fecha:** a **procedência** dos três atributos de sujeito em
`approveSupplier` — papel, empresa e identidade. Nenhum deles é mais aceito do
payload; todos são resolvidos contra a fonte de identidade; e isso está provado
por comportamento, com discriminação antes/depois, não por leitura de código.
Com isso, extingue-se também o efeito que este finding produzia sobre outros dois
fechamentos: a **eficácia prática** de FIND-001 (alçada) e de FIND-008
(segregação de funções), que estava condicionada a este desfecho (§5.6), **deixa
de estar condicionada**. O produto passa a ter **uma única fonte de papel para
todas as operações** — que é exatamente o "efeito normativo" que a APR-2026-011
declarou pretender.

**O que NÃO se fecha e sai como item próprio:**
(i) **Quais papéis podem aprovar** — ambiguidade normativa disposta em §7.5.2,
    encaminhada como human gate aberto (**OBS-SIM-002-009**). Não reabre este
    finding: o objeto do FIND-014 é *procedência do atributo*, não *conjunto de
    papéis autorizados*, e o objeto está extinto e provado extinto.
(ii) **Formato persistido de `approved_by`** — metade não evidenciada do item 6
     da spec, absorvida por **OBS-SIM-002-001** (§7.4).

### 7.1.5 Desvio processual registrado — Regra 22 (finding-validator não executado)

Registro, por dever e sem atenuar: o FIND-SIM-002-014 foi **remediado sem ter
passado pelo `vericore-finding-validator`**, contrariando a **Regra 22**
("findings CRITICAL e HIGH passam pelo finding-validator **antes de seguirem para
remediação**") e contrariando a condição (a) do meu próprio veredito da §6, que
exigia a validação como etapa prévia.

Por que **não** converto isso em `RETEST_FAILED` nem em bloqueio do run, e a
fundamentação para que a decisão seja contestável:

1. O **interesse protegido** pela Regra 22 é duplo: (i) evitar que se gaste
   remediação sobre finding não confirmado; (ii) calibrar severidade antes do
   encaminhamento. Ambos foram atendidos **a fortiori** e por meio mais forte que
   o rito: (i) o defeito foi **reproduzido empiricamente** num baseline real
   antes de ser declarado extinto — confirmação superior à análise do validator;
   (ii) a severidade foi calibrada por **cláusula pré-registrada de elevação**
   (§7.1.1), acionada por fato objetivo e verificável, não por juízo.
2. Nenhum resultado possível do validator poderia **reviver um defeito provado
   extinto por execução**. O único efeito plausível seria alterar a severidade —
   e a severidade já foi elevada ao máximo previsto pela própria cláusula.
3. Não trato o desvio como irrelevante: ele é **registrado como não-conformidade
   de processo**, endereçada ao **CoreTriad Director**, cuja disposição não é
   minha (o rito da Regra 22 é do control plane). Registrada como
   **OBS-SIM-002-010**. Se o Director entender a Regra 22 como não renunciável,
   a validação pode ser executada **retrospectivamente** sobre `f2fcf1c` e
   `ac3e277` a custo baixo, e este fechamento permanece o mesmo salvo se o
   validator produzir evidência nova — hipótese que declaro aberta em vez de
   descartar.

RESULT: **RETEST_PASSED**
NEW_EVIDENCE_IF_FAILED: n/a
SEVERIDADE FINAL: **CRITICAL** (elevada de HIGH pela cláusula (c), §7.1.1)
FINAL_STATUS: **CLOSED** — com as delimitações de §7.1.4 e o desvio processual
de §7.1.5 registrado.

---

## 7.2 OBS-SIM-002-007 — papel autorizado a cancelar pagamento `created`

CASE_ID: WAVE-E
REMEDIATION_COMMIT: `ac3e277`
HUMAN GATE: **APR-2026-012** — **apenas `manager`** cancela pagamento em
`created`, com o papel verificado no servidor contra a fonte confiável de
identidade; **não estender a `analyst`**.

A observação estava `ABERTA — human gate` desde o fechamento de FIND-004 (§5.1),
com a lacuna exata: a APR-2026-007 definiu **quais estados** são canceláveis e
não definiu **quem cancela**. O gate ocorreu e fechou a lacuna com texto
inequívoco — não há ambiguidade a dispor aqui.

EVIDÊNCIA:

| Cenário | `bba830f` (antes) | `ac3e277` (depois) |
|---|---|---|
| `analyst` cancelando pagamento `created` | **CANCELOU** | **RECUSADO** |
| `manager` cancelando pagamento `created` | cancela | **cancela** (caminho positivo preservado) |

Prova de discriminação presente: o mesmo teste distingue os dois estados.
Não-regressão da norma anterior confirmada em §7.3: **cancelar `sent` continua
recusado** (APR-2026-007), isto é, a nova restrição de papel não foi obtida à
custa de afrouxar a restrição de estado.

Efeito material que registro porque melhora o risco do run: cancelar um pagamento
`created` **libera crédito comprometido** (`sumCommittedAmount`) — era exatamente
por isso que a operação sem alçada preocupava. A operação passa a exigir o mesmo
papel que a criação e o envio (APR-2026-008), de modo que **a liberação de
crédito deixa de ser exercível por quem não pode consumi-lo**.

**Residual que NÃO se fecha:** a **trilha de quem cancelou** continua ausente
enquanto **FIND-SIM-002-012** (sem `updated_at`, sem trilha de alteração)
estiver aberto. Esse finding tem decisão humana de **não-bloqueio** registrada
(APR-2026-010) e permanece rastreado como pendente. Registro a dependência para
que o fechamento desta observação não seja lido como "há trilha de
cancelamento" — não há.

ESTADO FINAL: **REMEDIADA — 2026-08-13**. Não vira finding. Não retorna à
SanaCore.

---

## 7.3 OBS-SIM-002-008 item (c) — política de retentativa para pagamento `failed`

CASE_ID: WAVE-E
REMEDIATION_COMMIT: `ac3e277`
HUMAN GATE: **APR-2026-013** — *"limite de 3 tentativas de reenvio ao gateway
para um pagamento em `failed`. Esgotado o limite, o pagamento permanece `failed`
definitivo e exige ação manual — sem retentativa automática ilimitada."*

EVIDÊNCIA MEDIDA em `ac3e277`, com gateway recusando:

1. O serviço permite **4 submissões** ao gateway: **1 envio original + 3
   reenvios**.
2. Na **5ª chamada**, bloqueia **sem tocar o gateway**, com mensagem de **ação
   manual**.
3. `payment_attempts` termina com **4 linhas `failed`** — a trilha é coerente com
   o número de submissões efetivas, e não com o número de chamadas.
4. **O limite persiste entre processos** (banco em arquivo) — isto é o que
   distingue um limite real de um contador em memória, e é a prova que impede a
   objeção "reinicia o processo e recomeça".
5. **O limite não é contornável trocando o gateway** por um que aceitaria — a
   5ª chamada não chega ao gateway. A defesa está **no serviço**, não no
   componente que a §3.3 da `AUDIT_COVERAGE_MATRIX` declara **não auditável**.
   Registro isso com ênfase porque é a segunda vez neste run que um controle
   migra do gateway para o serviço (a primeira foi §5.2), e é melhoria material
   de postura.
6. **Sucesso dentro do limite leva a `sent` normalmente** — o caminho positivo
   não foi sacrificado pela restrição.

DISPOSIÇÃO DA AMBIGUIDADE DE CONTAGEM: **CONFORME** — ver §7.5.1. Não abro human
gate para isto, e a fundamentação está lá.

REQUIREMENT_RECHECKED: APR-2026-013 (norma fonte); **BR-PAY-002** por
encadeamento — a nota de risco que a própria observação levantara ("sem limite de
retentativa, um `failed` reenviável indefinidamente reintroduz, por outro
caminho, a pressão sobre BR-PAY-002 que FIND-003 tratou") **deixa de se
sustentar**: o reenvio é finito, contado no banco e não contornável.

**Residuais que NÃO se fecham e vão ao delta audit** — registro-os porque o
mecanismo de contagem é **código novo, nunca auditado por ninguém**, apenas
retestado contra uma spec de observação:
(i) o contador é derivado de `payment_attempts`; **não foi exercitado seu
    escopo por tenant** (um pagamento de outra empresa pode influenciar a
    contagem?);
(ii) **não foi exercitada a segurança do contador sob concorrência** — dois
     reenvios simultâneos podem ambos ler "3 tentativas" e submeter? Este ponto
     é da mesma família de **FIND-SIM-002-010** (check-then-act sem CAS,
     `PROPOSED`, não bloqueante por APR-2026-010) e da §3.2 da matriz de
     cobertura;
(iii) comportamento se `payment_attempts` for expurgada/podada — o limite é
      reconstituível?

Nenhum desses três é alegação de defeito: são **superfícies não exercitadas** de
código não auditado, e é exatamente isso que o delta audit existe para cobrir.

ESTADO FINAL do item (c): **REMEDIADA — 2026-08-13**, com os residuais acima.
Os itens **(a) atomicidade** e **(b) migração do `CHECK` para bases
preexistentes** da OBS-008 **permanecem ABERTOS** — nada nesta onda os tocou.

---

## 7.4 Disposição da OBS-SIM-002-001 (`approved_by = "77.0"`)

A OBS-001 tinha um único vetor medido: `approver.id` **numérico vindo do
payload** gravado em coluna TEXT, produzindo `"77.0"`.

O reteste desta onda mediu, no baseline `bba830f`, exatamente esse vetor
(`approver.id = 999999` inexistente → **aprovava** gravando `approved_by =
"77.0"`) e mediu sua **recusa** em `ac3e277`. Como `approveSupplier` **não aceita
mais identificador do chamador**, o vetor que produzia a corrupção **deixou de
existir**.

DISPOSIÇÃO: **EXTINTA QUANTO AO VETOR MEDIDO — 2026-08-13**, com **residual
expresso**, e a distinção é material:

- **Extinto:** a corrupção por identificador autodeclarado. Provado por
  execução, não presumido.
- **Não verificado:** qual valor `approved_by` **efetivamente contém** após uma
  aprovação bem-sucedida em `ac3e277`. A evidência disponível sugere fortemente
  que os identificadores da fonte de identidade são textuais (o baseline gravou
  `"u-analyst"`, forma textual), o que tornaria a coerção numérica impossível —
  mas **isso é inferência, não medição**, e não a converto em fechamento.
- **Não verificado tampouco:** se a mesma coerção existe em **outros caminhos de
  escrita** em colunas TEXT do produto, questão que a observação já encaminhava à
  trilha `database` e que a §2.4 da matriz de cobertura declara descoberta
  ("nenhuma constraint foi testada por inserção real").

O residual é **INFO** e vai ao delta audit como leitura positiva de formato. A
observação **não** volta à SanaCore.

---

## 7.5 As duas ambiguidades normativas isoladas pelo runner — disposição

O `vericore-audit-verification-runner` isolou dois pontos em que o **texto da
decisão humana** e o **comportamento implementado** não coincidem literalmente, e
os entregou como **fatos, sem veredito** — conduta correta, porque interpretar
norma não é função do runner. A disposição é deste diretor, e a regra que sigo
está dita de antemão: **onde o texto decide, eu decido e fecho; onde o texto não
decide, eu digo que não decide e escalo** (Regras 6, 18 e 21). Não invento
intenção em nenhum dos dois casos.

### 7.5.1 Ambiguidade 1 — contagem do limite de reenvio — **CONFORME. FECHADA.**

**O fato.** A APR-2026-013 diz "limite de **3 tentativas de reenvio** ao gateway
para um pagamento em `failed`". O implementado são **3 reenvios além do envio
original = 4 submissões totais**. A SanaCore declarou a interpretação abertamente
e recusou-se a alterá-la sem novo gate.

**Decisão: o comportamento medido é conforme à decisão humana.** O texto
**decide**, e decide a favor do implementado. Dois ancoradouros textuais
independentes, ambos no enunciado aprovado:

1. **"reenvio" não é "envio".** O objeto contado pela norma é o *reenvio*. Um
   reenvio pressupõe, por definição do prefixo, um envio anterior que não é ele
   próprio um reenvio. Contar o envio original entre as "3 tentativas de
   reenvio" exigiria ler "reenvio" como sinônimo de "envio" — leitura que
   contraria a palavra escolhida pelo aprovador, e que este diretor não tem
   autoridade para impor ao texto.
2. **"para um pagamento em `failed`" é qualificador de estado, e ele fecha a
   questão.** Um pagamento só entra em `failed` **depois** que uma submissão foi
   recusada pelo gateway (APR-2026-009). Logo a submissão que **produziu** o
   estado `failed` é logicamente anterior ao universo que a norma delimita. A
   norma conta tentativas feitas **estando o pagamento em `failed`** — e essas
   são exatamente 3. O implementado é o **único** número compatível com a leitura
   conjunta das duas expressões.

**Por que não escalo mesmo assim.** Escalar aqui seria devolver ao humano uma
pergunta que o texto dele já respondeu, e isso tem custo real: banaliza o human
gate e transfere ao aprovador o ônus de reafirmar o que escreveu. A Regra 18
proíbe **suprir** decisão inexistente; não proíbe **ler** decisão existente —
ler é precisamente o que se espera de quem verifica conformidade contra norma.

**Delimitação honesta do que estou decidindo.** Decido que **o texto aprovado
comporta o comportamento medido**, não que "foi isso que o aprovador quis dizer"
— não tenho acesso à intenção e não a invoco. Se o aprovador quis dizer "3
submissões totais", a correção é de **uma linha** em `APPROVALS.md` e o delta de
comportamento é de **uma submissão a mais** ao gateway, sobre um pagamento já
recusado, sem risco de duplicação financeira (BR-PAY-002 reconfirmada, §7.3) e
sem retentativa ilimitada (o objeto real da preocupação da APR-2026-013 está
plenamente atendido em qualquer das leituras). O risco residual da minha decisão
é, portanto, **quantificado e baixo** — e é por isso que decidir aqui é
responsável, e não temerário.

**Ação de higiene normativa** (não é condição de fechamento): a norma deve ser
transcrita como **BR com ID** em `requirements/BUSINESS_RULES.md` com a contagem
explicitada em números ("1 envio + até 3 reenvios = no máximo 4 submissões"),
eliminando a ambiguidade para sempre. Absorvido por **OBS-SIM-002-006(b)**
(Regra 17).

### 7.5.2 Ambiguidade 2 — alçada na aprovação — **NÃO DECIDE. HUMAN GATE ABERTO.**

**O fato.** A APR-2026-011 diz: *"A mesma alçada já decidida (`manager`)
aplica-se à aprovação"* — texto que **pode** ser lido como aprovação **privativa
de `manager`**. A implementação manteve **`analyst` até R$ 10.000** (BR-APR-001)
e **`manager` sem teto**. Os textos não coincidem literalmente.

**Decisão: exige arbitragem humana adicional.** Registro como human gate aberto
(**OBS-SIM-002-009**). Fundamentação, e por que aqui é diferente do caso
anterior:

**Por que o texto não decide.** Há duas leituras, ambas sustentáveis, e **nenhuma
prevalece por evidência**:

- *Leitura restritiva (A):* "alçada já decidida (`manager`)" remete à
  APR-2026-008, que restringiu **escrita** a `manager`; aprovação seria escrita;
  logo aprovação é privativa de `manager` e o `analyst` não aprova nada.
- *Leitura de continuidade (B):* "alçada" é, no vocabulário constante deste run,
  o **teto de valor** de BR-APR-001 — o próprio FIND-001 chama-se "alçada do
  analista"; a APR-2026-008 nunca usou a palavra "alçada", usou "escrita restrita
  a `manager`". A frase diria então: a alçada já decidida — a de BR-APR-001, com
  `manager` sem teto — aplica-se à aprovação **agora que o papel é confiável**.

**Elementos que empurram para (B), e que registro sem tratá-los como
conclusivos:**
1. O **objeto declarado** da APR-2026-011 é **procedência**, não conjunto de
   papéis: contexto, decisão e "efeito normativo" falam de *fonte* de identidade
   e de "**uma única fonte de papel** para todas as operações" — *fonte*, não
   *rol*.
2. **BR-APR-001 é artefato versionado** (`requirements/BUSINESS_RULES.md:19-29`)
   e, pela **Regra 7**, fonte oficial de verdade. Ela **jamais foi revogada**:
   a APR-2026-011 não a menciona, não diz "revoga", não diz "privativa". Revogação
   tácita de regra expressa é construção que este diretor **não** pode fazer.
3. **Coerência do próprio run:** o FIND-001 foi fechado como CRITICAL justamente
   por implantar `analyst ≤ 10.000`. Sob a leitura (A), aquele fechamento
   estaria hoje errado — e a leitura (A) teria revogado, sem dizê-lo, o critério
   sobre o qual esta auditoria fechou um CRITICAL.

**Elementos que impedem que eu feche em (B):**
1. O parêntese "**(`manager`)`**" está lá, e é o elemento que a leitura (B)
   explica com menos naturalidade. Uma leitura que precisa explicar um termo
   escrito não é uma leitura que possa fundar fechamento.
2. Sob a leitura (A), o produto está hoje **permissivo** num ponto de controle
   financeiro — analista concedendo crédito até 10.000 sem gerente. Fechar em (B)
   e estar errado significa **aprovar uma auditoria sobre um defeito de
   autorização**. A assimetria de dano entre errar para um lado e errar para o
   outro é grande, e ela recomenda a pergunta, não o palpite.
3. **Regra 21** é literal: havendo contradição entre documento e código, "interrompa
   a decisão e determine a fonte autoritativa". Aqui a contradição é entre **dois
   documentos normativos** — uma BR versionada e uma aprovação humana posterior —
   e ambos são autoritativos. Uma decisão humana **pode** criar ou revogar BR;
   se a intenção foi (A), a decisão posterior prevalece e a BR precisa ser
   emendada. **Determinar qual delas rege não é escolha técnica: é saber o que o
   aprovador decidiu.** Isso é, por definição, human gate.

**Delimitação do efeito desta abertura — importante para não superdimensioná-la:**
- **Não reabre o FIND-SIM-002-014.** O objeto daquele finding é *procedência do
  atributo de autorização*, e a APR-2026-011 é inequívoca nessa parte, que foi
  cumprida e provada cumprida. Confundir "de onde vem o papel" com "quais papéis
  bastam" degradaria o registro.
- **Não constitui, por si, finding.** Sob a única leitura amparada por artefato
  versionado (BR-APR-001 em vigor), o comportamento medido **é conforme**. Não
  há defeito provado; há **norma indeterminada**. Abrir finding aqui seria
  inventar o "esperado" — Regra 6.
- **Tem, porém, efeito sobre o veredito do run**, e por isso entra nas condições
  da §8: se a resposta for (A), o produto passa a ter defeito de autorização em
  aberto, e um `AUDIT_PASSED` declarado antes da resposta teria sido declarado
  sobre premissa falsa. É gate barato — uma linha em `APPROVALS.md` — e de
  desfecho binário.

**Pergunta objetiva a submeter ao responsável humano** (formulada para ser
respondida com uma palavra, sem sugerir resposta):

> A APR-2026-011, ao dizer "a mesma alçada já decidida (`manager`) aplica-se à
> aprovação", significa **(A)** que somente `manager` pode aprovar fornecedor,
> revogando a faixa de `analyst` até R$ 10.000 de BR-APR-001 — ou **(B)** que
> BR-APR-001 permanece integralmente em vigor (`analyst` até R$ 10.000,
> `manager` sem teto), tendo a decisão versado apenas sobre a **procedência** do
> papel?
>
> Se **(A)**: BR-APR-001 deve ser emendada no mesmo ato, o comportamento atual
> passa a ser defeito de autorização e a SanaCore terá trabalho de remediação.
> Se **(B)**: basta o registro, e nada muda no produto.

---

## 7.6 Não-regressão da integração em `ac3e277`

| Controle | Origem | Resultado em `ac3e277` |
|---|---|---|
| Isolamento de tenant (leitura, escrita, aprovação) | WAVE-B / FIND-002, FIND-011 | **Reconfirmado** |
| Idempotência de `sendPayment` | WAVE-C / FIND-003 | **Reconfirmada** |
| CNPJ único **global** | WAVE-C / FIND-005 | **Reconfirmado** |
| Papel resolvido do banco em `createPayment` | WAVE-D / FIND-008 | **Reconfirmado** |
| Recusa de cancelar pagamento `sent` | WAVE-D / FIND-004 + APR-2026-007 | **Reconfirmada** |
| Alçada `analyst` = 10000 (fronteira inclusiva) | WAVE-A / FIND-001 | **Reconfirmada** (§7.1.2) |
| Suíte versionada | todas | **60/60**, com 4/4 mutantes mortos |
| Produto ↔ HEAD | — | **Idêntico**; working tree limpo antes e depois |

Nenhuma regressão detectada. **Delimitação probatória inalterada desde a §5.4:**
isto é **não-regressão dirigida a controles fechados**, **não** é auditoria do
commit integrado. A distinção sustenta a §8.

---

## 7.7 Quadro consolidado de vereditos após a WAVE-E

| Finding | Sev. final | Onda | REMEDIATION_COMMIT | Resultado | Status |
|---|---|---|---|---|---|
| FIND-SIM-002-001 | CRITICAL | A | `f0aaa7a` | RETEST_PASSED | **CLOSED** |
| FIND-SIM-002-002 | CRITICAL | B | `9f7b056` | RETEST_PASSED | **CLOSED** |
| FIND-SIM-002-003 | CRITICAL | C | `9ce4754` | RETEST_PASSED | **CLOSED** |
| FIND-SIM-002-004 | CRITICAL | D | `b6d44da` | RETEST_PASSED | **CLOSED** (delimitado) |
| FIND-SIM-002-005 | HIGH | C | `9ce4754` | RETEST_PASSED | **CLOSED** |
| FIND-SIM-002-006 | HIGH | C | `9ce4754` | RETEST_PASSED | **CLOSED** (delimitado) |
| FIND-SIM-002-007 | HIGH | A | `f0aaa7a` | RETEST_PASSED | **CLOSED** |
| FIND-SIM-002-008 | HIGH (re-elevado) | A + D | `f0aaa7a` + `b6d44da` | RETEST_PASSED | **CLOSED** |
| FIND-SIM-002-009 | HIGH (re-elevado) | D | `b6d44da` | RETEST_PASSED | **CLOSED** (delimitado) |
| FIND-SIM-002-010 | MEDIUM | — | — | não remediado | **PROPOSED** — não bloqueante (APR-2026-010) |
| FIND-SIM-002-011 | MEDIUM | B | `9f7b056` | RETEST_PASSED | **CLOSED** |
| FIND-SIM-002-012 | MEDIUM | — | — | não remediado | **PROPOSED** — não bloqueante (APR-2026-010) |
| FIND-SIM-002-013 | LOW | — | — | não remediado | **PROPOSED** — não bloqueante (APR-2026-010) |
| **FIND-SIM-002-014** | **CRITICAL** (elevado de HIGH, §7.1.1) | **E** | **`ac3e277`** | **RETEST_PASSED** | **CLOSED** (delimitado) |

**Fechados: 11 de 14** — 5 CRITICAL, 5 HIGH, 1 MEDIUM.
**Abertos: 3** — FIND-010 (MEDIUM), FIND-012 (MEDIUM), FIND-013 (LOW), **todos
com decisão humana de não-bloqueio registrada em APR-2026-010**.
**Nenhum finding CRITICAL ou HIGH aberto neste run.**

Este diretor **NÃO** declara `REMEDIATION COMPLETE` — autoridade da SanaCore
(Regra 3). Declara-se aqui, exclusivamente, `RETEST_PASSED` e `FINDING CLOSED`
(Regra 4).

---
---

# 8. VEREDITO VIGENTE DO RUN SIM-002-AUD-001 — 2026-08-13 (substitui a §6)

## DECISÃO: **AUDIT_PASSED = NÃO**

RUN_STATUS: `RETEST_COMPLETE — AUDIT_NOT_PASSED (delta audit é o único obstáculo
substantivo)`

Antes da fundamentação, o que mudou — porque um "NÃO" repetido sem essa
distinção seria informação de má qualidade, e desta vez a distinção é grande:

- **Fundamento 1 da §6 caiu por completo.** FIND-014 estava aberto, `PROPOSED`,
  sem gate e sem remediação. Hoje tem decisão humana (APR-2026-011), foi
  remediado, foi retestado com prova de discriminação sobre o item decisivo, e
  está **CLOSED** — depois de **elevado a CRITICAL** pela sua própria cláusula.
  **Não há mais nenhum CRITICAL nem HIGH aberto neste run.**
- **Fundamento 3 da §6 caiu.** A APR-2026-010 foi registrada em
  `coretriad/governance/APPROVALS.md` e eu a li nesta data. Era exatamente o que
  eu havia pedido: uma linha no arquivo versionado. FIND-010/012/013 são
  pendências rastreadas, não bloqueantes, por decisão humana registrada — e eu a
  acato sem reservas quanto ao mérito.
- **Fundamento 4 da §6 encolheu.** OBS-001, OBS-007 e OBS-008(c) foram dispostas
  nesta rodada (§7.2, §7.3, §7.4), somando-se a OBS-002 (remediada) e OBS-003
  (extinta). Restam OBS-004, 005, 006, 008(a), 008(b) e o residual de 001 —
  todas de natureza tal que **só um delta audit pode dispô-las**, o que as
  colapsa dentro do Fundamento 2.
- **Fundamento 2 da §6 permanece — e é agora o único obstáculo substantivo.**

### Fundamento único remanescente — o estado aprovável não é o estado auditado

O objeto desta auditoria é `f2fcf1c`. Nele existem **todos os 14 findings**.
Aprová-lo é impossível.

O estado que se poderia querer aprovar é `ac3e277`. Ele **nunca foi auditado por
ninguém**. O que existe sobre ele é: (i) reteste dirigido a três itens (§7.1-7.3);
(ii) não-regressão dirigida a controles já fechados (§7.6). Nenhum dos dois é
auditoria. As **Regras 12-14** são categóricas: a auditoria não segue HEAD, e
mudanças posteriores ao `AUDIT_COMMIT` exigem **delta audit**.

Registro que isto **não é formalismo**, e a prova disso é interna a este run, em
dois fatos concretos:

1. **A matriz de cobertura deste run foi empiricamente refutada.** A §2.2 da
   `AUDIT_COVERAGE_MATRIX` declarava cobrir "todos os pontos de decisão de
   papel", citando nominalmente `approvalService.js:4`, `:14` e `:37` — e deixou
   passar a **procedência** do papel nessas mesmas linhas, o que só apareceu na
   WAVE-D, por declaração espontânea da SanaCore, e virou o FIND-014, hoje
   CRITICAL. Um `AUDIT_PASSED` repousaria sobre uma demonstração de suficiência
   cuja precisão já foi desmentida por evidência. Não posso declarar cobertura
   com uma matriz que este mesmo relatório provou incompleta — e a proibição de
   dizer "auditamos tudo" sem matriz demonstrada é critério de conclusão do meu
   próprio papel.
2. **`ac3e277` contém código que ninguém auditou, e ele é justamente código de
   controle.** Resolução de identidade em `approvalService`, mecanismo de
   contagem de reenvio, autorização de cancelamento, ciclo de vida do estado
   `failed`. Foram exercitados **contra specs de finding** — isto é, contra a
   pergunta "o defeito antigo sumiu?" — e não contra a pergunta "este código novo
   tem defeitos?". Três superfícies concretas já estão nomeadas em §7.3 sem
   nenhuma medição: escopo por tenant do contador, segurança do contador sob
   concorrência (família de FIND-010) e reconstituição do limite se
   `payment_attempts` for podada. Aprovar agora seria afirmar sobre esse código
   uma garantia que ninguém produziu.

### O delta audit pode ser feito sobre `ac3e277`?

**Sim.** E declaro as condições, para que não haja dúvida:

- `ac3e277` é **commit identificado**, com **produto idêntico ao HEAD**
  verificado e **working tree limpo** antes e depois da medição — as três
  propriedades que faltaram às ondas B e C e que tornam um commit congelável como
  `AUDIT_COMMIT` (Regra 12).
- Basta **congelá-lo formalmente** como `AUDIT_COMMIT` do novo run
  (sugerido: `SIM-002-AUD-002`, delta) **antes** de qualquer nova escrita no
  repositório. Se houver commit posterior antes do congelamento, o delta audit
  passa a ser sobre o sucessor, e a diferença precisa entrar no escopo.
- O escopo do delta é o **diff `f2fcf1c..ac3e277`** mais as **superfícies de
  regressão dos 11 findings fechados**, e não uma reauditoria integral — o que
  torna o esforço proporcional.

### Condições objetivas e exaustivas para `AUDIT_PASSED`

Cumulativas. **Nada além destas será exigido depois.**

**(A) — SUBSTANTIVA. Delta audit concluído sobre `ac3e277` congelado como novo
`AUDIT_COMMIT`**, cobrindo, no mínimo e de forma demonstrada:

1. **Congelamento e escopo reproduzível:** `AUDIT_ID`, commit, exclusões e
   verificação de equivalência produto↔HEAD por hash de árvore.
2. **Nova `AUDIT_COVERAGE_MATRIX`** com a trilha `authorization` carregando, como
   **item obrigatório de checklist**, a **procedência de cada atributo de
   autorização** (papel, empresa, identidade do sujeito) em **cada** operação,
   enumeradas exaustivamente: `createSupplier`, `getSupplier`, `approveSupplier`,
   `createPayment`, `sendPayment`, `cancelPayment`, `listPaymentsBySupplier` e o
   caminho de reenvio. Este item existe porque a matriz anterior falhou
   exatamente aqui.
3. **Auditoria (não reteste) do código introduzido após `f2fcf1c`**, nominalmente:
   o módulo de identidade (`identity.js`) — seu próprio escopo por tenant, seus
   modos de falha, e a **ausência de fallback para o payload** em qualquer
   caminho; o **mecanismo de limite de reenvio** — fonte da contagem, escopo por
   tenant, segurança sob concorrência, comportamento com `payment_attempts`
   podada, e o caminho terminal de "ação manual"; a **autorização de
   `cancelPayment`**; o **ciclo de vida do estado `failed`**.
4. **OBS-SIM-002-006 (a)(b)(c):** convergência de
   `SOFTWARE_RELEASE_PACKAGE.md:28` / AUTHORIZATION_MATRIX; **transcrição como BR
   com ID** (Regra 17) das **seis** aprovações que hoje vivem só em
   `APPROVALS.md` — APR-2026-007, 008, 009, 011, 012 e 013, esta última com a
   contagem de reenvio explicitada em números (§7.5.1); presença, **na suíte
   versionada**, dos casos negativos (papel forjado em `approveSupplier`,
   `analyst` cancelando, 5ª submissão bloqueada).
5. **OBS-SIM-002-001 residual:** leitura **positiva** do valor persistido em
   `suppliers.approved_by` após aprovação bem-sucedida, e varredura de coerção
   numérica em colunas TEXT nos demais caminhos de escrita.
6. **OBS-SIM-002-003:** confirmação formal, no commit auditado, da
   **inalcançabilidade** do caminho enviar→cancelar→enviar. Extinção por perda de
   objeto é conclusão sobre estado de código e deve ser reverificada quando o
   código muda.
7. **OBS-SIM-002-004 e OBS-SIM-002-008(a):** prova de demarcação transacional por
   método que **não** dependa da observabilidade da janela — inspeção estrutural,
   teste multiprocesso sobre `.db` compartilhado, ou invariante imposta pelo
   banco. Serve simultaneamente ao objeto conceitual de FIND-010 e à §3.2 da
   matriz.
8. **OBS-SIM-002-008(b):** migração do `CHECK` de `payments.status` para bases
   preexistentes.
9. **OBS-SIM-002-005:** varredura do antipadrão "teste que não pode falhar"
   (`try/catch` sem asserção; asserção contra constante importada do próprio
   módulo) na **suíte versionada inteira** — os 60 casos. A WAVE-E demonstrou que
   o antipadrão é vivo neste código-base, o que eleva a prioridade desta varredura
   de "backlog" para item de escopo.
10. **Regressão dos 11 findings fechados** verificada **como evidência de
    auditoria** sobre o commit auditado, e não por remissão a este relatório.
11. **Verificação da lacuna §3.3** (gateway não auditável) à luz do fato de que
    dois controles migraram do gateway para o serviço (§5.2 e §7.3): reavaliar se
    a lacuna ainda tem o mesmo peso.
12. **Rastreabilidade da linha de commits:** estabelecer a relação entre
    `bba830f` (baseline usado na discriminação da WAVE-E) e `b6d44da` (baseline
    nomeado na spec de FIND-014), e entre `f0aaa7a`, `9f7b056`, `9ce4754`,
    `b6d44da` e `ac3e277`. É o único item de evidência desta rodada que ficou sem
    verificação de origem.

**(B) — FORMAL, BARATA E BINÁRIA. Resposta humana registrada em
`coretriad/governance/APPROVALS.md` à pergunta de §7.5.2** (leitura (A) ou (B) da
APR-2026-011 quanto a quais papéis aprovam fornecedor). Se **(B)**, nada muda no
produto e a condição se satisfaz com o registro. Se **(A)**, BR-APR-001 deve ser
emendada e haverá remediação e reteste antes do `AUDIT_PASSED`.

**(C) — FORMAL. Disposição, pelo CoreTriad Director, do desvio da Regra 22**
registrado em §7.1.5 (FIND-014 remediado sem `vericore-finding-validator`): ou
dispensa fundamentada, ou execução retrospectiva do validator sobre `f2fcf1c` e
`ac3e277`. O rito é do control plane; a disposição não é minha.

**O que NÃO é condição, e digo expressamente para que ninguém acrescente depois:**
a remediação de FIND-010, FIND-012 e FIND-013 (não bloqueiam, por APR-2026-010);
a passagem do `vericore-finding-validator` por esses três (é condição de
**arquivamento** do SIM-002, fixada pela própria APR-2026-010, não de
`AUDIT_PASSED`); e a auditoria do gateway real, que a matriz declara
estruturalmente não auditável neste ambiente.

## O que esta decisão **não** significa

- **Não é `RETEST_FAILED`.** Todos os retestes da WAVE-E passaram, com o quadro
  probatório mais forte de todo o run: mesmo código de teste contra dois estados,
  estado lido do banco, mutação provada, limite provado persistente entre
  processos e não contornável.
- **Não é reprovação da SanaCore.** Ao contrário: nesta onda ela remediou sob
  norma aprovada, declarou abertamente uma interpretação que lhe poderia ser
  cobrada, recusou-se a mudá-la sem gate (Regra 6, corretamente aplicada) e
  **encontrou e corrigiu um teste tautológico contra o próprio interesse
  narrativo**. É a segunda onda consecutiva de conduta de evidência exemplar.
- **Não é "o produto está inseguro".** O quadro de risco medido é
  substancialmente melhor que o de qualquer rodada anterior: zero CRITICAL e zero
  HIGH abertos, papel verificado no servidor em **todas** as operações de
  controle, e dois controles migrados do gateway não auditável para o serviço.
- **Não impede o fechamento do SIM-002 como ciclo de validação do CoreTriad**, se
  o CoreTriad Director e o responsável humano assim decidirem. "Ciclo fechado" e
  "objeto aprovado" continuam sendo proposições distintas — foi assim no SIM-001
  (APR-2026-006) e é assim aqui.
- **Não é um "NÃO" de mesma natureza que o anterior.** O veredito da §6 tinha
  quatro fundamentos, um deles um CRITICAL de fato no objeto auditado. Este tem
  **um**, de natureza processual-probatória e com caminho de resolução
  inteiramente definido, executável sobre um commit que já reúne as condições
  para ser congelado.

## Escalonamento a humano (Regra 21)

1. **Ambiguidade da APR-2026-011 quanto a quais papéis aprovam fornecedor**
   (§7.5.2 / OBS-SIM-002-009) — **prioridade**, pergunta fechada de uma palavra,
   com consequências declaradas para cada resposta. Não decido por inferência.
2. **Abertura do delta audit** sobre `ac3e277` congelado — decisão do CoreTriad
   Director com o responsável humano.
3. **Disposição do desvio da Regra 22** (§7.1.5 / OBS-SIM-002-010) — CoreTriad
   Director.
4. **Higiene normativa (Regra 17):** transcrever como BR com ID as seis
   aprovações que hoje só existem em `APPROVALS.md`. Não bloqueia o veredito;
   bloqueia a qualidade normativa do produto no médio prazo.

## Handoff

- **CoreTriad Director:** `AUDIT_PASSED = NÃO`, **obstáculo único = delta audit**;
  congelar `ac3e277` e abrir `SIM-002-AUD-002` (delta) com o escopo de (A);
  encaminhar (B) e (C).
- **SanaCore:** 11 findings fechados, 3 nesta onda; **nada a remediar** enquanto
  a resposta de (B) não existir; conduta de evidência registrada positivamente
  duas ondas seguidas.
- **vericore-finding-validator:** disposição retrospectiva de FIND-014 se o
  Director assim decidir (§7.1.5); FIND-010/012/013 pendentes para o
  **arquivamento** do SIM-002, por APR-2026-010.
- **Relatórios:** `30-retest/RETEST_REPORT.md` (§0-§6, histórico), este arquivo
  (§7-§8, vigente), `21-findings/FIND-SIM-002-014.md` e
  `31-new-findings/NEW_OBSERVATIONS.md` são as entradas oficiais do run.
