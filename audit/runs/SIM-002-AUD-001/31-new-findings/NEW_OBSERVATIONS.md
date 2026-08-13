# NOVAS OBSERVAÇÕES DA FASE DE RETESTE — SIM-002-AUD-001

AUDIT_ID: SIM-002-AUD-001
AUDIT_COMMIT (auditoria original): f2fcf1c78a6a1255738d05e66a6100fa9c47428a
DATA: 2026-08-13 (atualizado após a WAVE-E, `ac3e277`, na mesma data)
EMITIDO_POR: vericore-software-audit-director
ORIGEM: fatos incidentais e ressalvas metodológicas medidos pelo
`vericore-audit-verification-runner` durante o reteste das ondas A, B, C, D e E.

## Estatuto destes registros

1. **Nenhuma observação aqui é um finding fechado.** Estados possíveis: `ABERTA`,
   `REMEDIADA`, `EXTINTA POR PERDA DE OBJETO`.
2. **Nenhuma é finding formal.** Foram observadas em commits **posteriores** ao
   `AUDIT_COMMIT` (`f0aaa7a`, `9f7b056`, `9ce4754`, `b6d44da`, `ac3e277`). Pelas
   Regras 12-14, a auditoria não segue HEAD: promover qualquer uma a finding exige
   **delta audit** com `AUDIT_COMMIT` próprio.
   **Exceção registrada:** o risco de papel autodeclarado em `approveSupplier` foi
   verificado por leitura direta **no próprio `AUDIT_COMMIT`** e, por isso, **não**
   ficou aqui — virou **FIND-SIM-002-014**. A distinção é deliberada: observação é
   para fato de commit posterior; defeito do objeto auditado é finding.
3. **Nenhuma altera os vereditos de reteste** já emitidos no
   `30-retest/RETEST_REPORT.md` e no `30-retest/RETEST_REPORT_WAVE-E.md`. Onde uma
   observação delimita um fechamento, a delimitação está escrita no bloco do
   finding correspondente.
4. As severidades abaixo são **preliminares** e não passaram pelo
   `vericore-finding-validator`. Nenhuma foi promovida a HIGH/CRITICAL; se alguma
   vier a sê-lo no delta audit, a Regra 22 se aplica.
5. **Nenhum texto de rodada anterior foi apagado.** As disposições da WAVE-E
   entram como blocos `### ATUALIZAÇÃO 2026-08-13 (WAVE-E)`, preservando a
   fundamentação original inclusive onde ela foi superada (Regra 15).

---

## OBS-SIM-002-001 — `suppliers.approved_by` persiste `"77.0"` por coerção do driver

ORIGEM: WAVE-A (`f0aaa7a`), fato incidental medido durante o reteste de FIND-001.
CONFIANÇA: **CONFIRMED** (observado empiricamente, não deduzido).
SEVERIDADE PRELIMINAR: **LOW**, com gatilho de elevação a MEDIUM (abaixo).
ESTADO: **EXTINTA QUANTO AO VETOR MEDIDO — 2026-08-13**, com residual INFO
(ver atualização).

FATO: quando `approver.id` é um número, a coluna `suppliers.approved_by` (TEXT)
recebe `"77.0"` em vez de `"77"` — coerção numérica do `node:sqlite` ao gravar em
coluna textual. `payments.created_by` **não** apresenta o problema porque a
gravação passa por `String()`. O defeito é, portanto, de **inconsistência entre
dois caminhos de escrita do mesmo produto**, e não uma limitação inevitável do
driver: um dos caminhos já demonstra a solução.

POR QUE IMPORTA: `approved_by` é a **única trilha de autoria da aprovação de
crédito**. O finding-validator de FIND-005 apoiou-se explicitamente nela ao
manter a severidade em HIGH em vez de CRITICAL, argumentando que a aprovação
múltipla é detectável porque "`approved_by` fica registrado em
`suppliers.approved_by`". Um identificador corrompido degrada exatamente esse
argumento: qualquer junção, filtro ou relatório por identidade do aprovador
falha silenciosamente (`"77.0" ≠ "77"`), sem erro e sem alarme.

CLASSIFICAÇÃO: **candidato a novo finding** (não backlog, não INFO). Justificativa:
é defeito de integridade de dado **medido**, com impacto em trilha de auditoria e
com norma de referência disponível (`DATA_DICTIONARY.md`, que tipa a coluna, e
BR-APR-001, cuja rastreabilidade depende dela). Não é INFO porque produz dado
persistido incorreto. Não é backlog porque tem impacto de auditabilidade
imediato.

GATILHO DE ELEVAÇÃO A MEDIUM: se `approved_by` for usado como chave de junção,
como critério de segregação de funções ou em qualquer relatório regulatório.
Verificar no delta audit.

NÃO IMPUTADO A: FIND-001 — o cumprimento de BR-APR-001 (valores de alçada) foi
integralmente demonstrado e não depende deste ponto.

ATUALIZAÇÃO 2026-08-13 (WAVE-D): esta observação passa a ter **vínculo direto com
FIND-SIM-002-014** — o valor gravado em `approved_by` vem de `approver.id`, que é
**autodeclarado pelo chamador**. Corromper o formato do identificador e aceitar o
identificador sem verificação são dois defeitos distintos que degradam a **mesma**
trilha de autoria. Devem ser remediados no mesmo trabalho, se houver decisão de
remediar (item 6 da `RETEST_SPECIFICATION` de FIND-014 já os une).

### ATUALIZAÇÃO 2026-08-13 (WAVE-E) — **EXTINTA QUANTO AO VETOR MEDIDO**, com residual

O reteste da WAVE-E mediu o **vetor exato** desta observação nos dois estados
(`RETEST_REPORT_WAVE-E.md` §7.1.2 e §7.4): `approver.id = 999999` inexistente, no
baseline `bba830f`, **aprovava** e gravava `approved_by = "77.0"`; em `ac3e277`,
a chamada é **recusada** com *"Usuário não autenticado"*.

Como `approveSupplier` **não aceita mais identificador vindo do chamador** (a
identidade é resolvida contra `users`), o vetor que produzia a corrupção **deixou
de existir**. Extinção **medida**, não presumida.

**Residual expresso, que impede o encerramento total** — e a distinção é
material:
- **Não verificado:** qual valor `approved_by` **efetivamente contém** após uma
  aprovação bem-sucedida em `ac3e277`. A evidência disponível sugere fortemente
  que os identificadores da fonte de identidade são textuais (o baseline gravou
  `"u-analyst"`), o que tornaria a coerção impossível — mas isso é **inferência,
  não medição**, e não a converto em fechamento.
- **Não verificado:** se a mesma coerção existe em **outros caminhos de escrita**
  em colunas TEXT, questão já encaminhada à trilha `database` e relacionada à
  §2.4 da `AUDIT_COVERAGE_MATRIX` ("nenhuma constraint foi testada por inserção
  real").

O residual é **INFO** e vai ao delta audit como **leitura positiva de formato**.
A observação **não** retorna à SanaCore.

---

## OBS-SIM-002-002 — papel não verificado em `getSupplier` / `listPaymentsBySupplier` contra o que `docs/API.md` declara

ORIGEM: WAVE-B (`9f7b056`), fato incidental medido durante o reteste de FIND-002.
CONFIANÇA: **CONFIRMED** quanto ao fato; **indeterminado quanto ao defeito** (à época).
SEVERIDADE PRELIMINAR: **MEDIUM**.
ESTADO: **REMEDIADA — 2026-08-13** (ver atualização).

FATO: `docs/API.md` exige papel `analyst|manager` em `listPaymentsBySupplier`,
mas usuário **sem `role`** ou com `role: "guest"` obtém a listagem — apenas
`companyId` é validado. Mesma classe de divergência em `getSupplier`.

DELIMITAÇÃO OBRIGATÓRIA: **o isolamento de tenant está íntegro** — verificado no
reteste de FIND-002, com `invariantViolations = 0`. Não há vazamento
cross-tenant. O que se observa é divergência **documento × código quanto a
papel**, dentro do tenant correto.

CLASSIFICAÇÃO (à época): **candidato a novo finding, bloqueado em human gate** —
mesma lacuna normativa da divergência A de FIND-SIM-002-008. Sem árbitro, não era
tecnicamente demonstrável se o código estava permissivo demais ou o documento
restritivo demais; a Regra 21 manda interromper a decisão, não escolher lado.

ENCAMINHAMENTO (à época): levar ao **MESMO human gate** da divergência A de
FIND-008, decidido em ato único.

### ATUALIZAÇÃO 2026-08-13 (WAVE-D) — **REMEDIADA**

O encaminhamento foi cumprido: a **APR-2026-008** decidiu leitura e escrita **em
ato único**, como esta observação exigia. Norma: leitura (`getSupplier`,
`listPaymentsBySupplier`) permitida a `analyst` e `manager`, com papel
**verificado no servidor**.

Evidência de reteste (`b6d44da`, RETEST_REPORT §5.3): leitura funciona para
`analyst` e `manager`; **usuário inexistente é recusado** com "Usuário não
autenticado"; e o papel é resolvido a partir do banco — comprovado pelo teste de
payload com `role:'manager'` falso. A divergência documento × código quanto a
papel deixou de existir nas duas operações.

ESTADO FINAL: **REMEDIADA**. Não vira finding. Não retorna à SanaCore. Sujeita
apenas à confirmação documental de OBS-SIM-002-006 no delta audit.

---

## OBS-SIM-002-003 — `sent_at` instável no caminho pós-cancelamento e dependência da dedup do gateway

ORIGEM: WAVE-C (`9ce4754`), ressalva material medida durante o reteste de
FIND-003. Referenciada no `30-retest/RETEST_REPORT.md` §1.3.
CONFIANÇA: **CONFIRMED** (medida: 1 → 4 invocações reais de `submitPayment` em
3 ciclos enviar→cancelar→enviar; `sent_at` alterado a cada reenvio).
SEVERIDADE PRELIMINAR: **MEDIUM**.
ESTADO: **EXTINTA POR PERDA DE OBJETO — 2026-08-13** (ver atualização).

FATO, em duas partes independentes:
(a) **`sent_at` não é estável** no caminho enviar→cancelar→enviar — muda a cada
    reenvio. É desvio observável de comportamento, com impacto em conciliação e
    cronologia da trilha.
(b) **A não-duplicação, nesse caminho, é do gateway, não do serviço.** O
    curto-circuito do serviço não age (o `status` volta a `created`, tornando
    falsa a condição `status === 'sent' && external_ref`); a defesa efetiva é a
    deduplicação por `idempotencyKey` **dentro** do gateway. Resultado final
    medido permanece correto: 1 movimentação, 1 attempt.

POR QUE NÃO REPROVOU O FIND-003: porque BR-PAY-002 é redigida em termos de
**resultado** ("sem produzir nova movimentação financeira"), e o resultado foi
cumprido em todos os caminhos exercitados. Exigir que a proteção resida na camada
de serviço seria a VeriCore criar requisito de desenho inexistente (Regra 6).

POR QUE TAMPOUCO FOI ENCERRADA COMO ACEITÁVEL: a §3.3 da
`AUDIT_COVERAGE_MATRIX` declara que **o gateway real não é auditável** — o
`gatewayClient` do repositório é stub determinístico. A defesa passou a repousar
em um componente que esta auditoria classificou como não verificável.

CLASSIFICAÇÃO (à época): observação residual **dependente do human gate de
FIND-SIM-002-004**, com condição expressa: *"Se `cancelPayment` for removido, a
observação se extingue por perda de objeto — o que deve ser registrado, e não
presumido."*

### ATUALIZAÇÃO 2026-08-13 (WAVE-D) — **EXTINTA POR PERDA DE OBJETO**

A condição prevista ocorreu, em variante equivalente. A **APR-2026-007** decidiu
que **não existe cancelamento após `sent`**, e o reteste mediu (RETEST_REPORT
§5.1): cancelar pagamento `sent` é **RECUSADO**, com o estado permanecendo `sent`.
Logo o caminho enviar→cancelar→enviar **deixou de existir**, e com ele os dois
fatos (a) e (b).

Registro expresso, como a própria observação exigia: a extinção é **registrada,
não presumida**, e apoia-se em evidência de execução sobre `b6d44da`.

Consequência material favorável ao run: a defesa de BR-PAY-002 **deixa de
repousar** na dedup do gateway não auditável no único caminho em que repousava —
no caminho enviar→enviar o curto-circuito do serviço já havia sido medido atuante
na WAVE-C. A lacuna §3.3 da matriz de cobertura **permanece viva** para o gateway
em geral e **não** é declarada resolvida; deixa apenas de ser controle único.

AÇÃO NO DELTA AUDIT: confirmar formalmente a inalcançabilidade do caminho no
commit auditado. Extinção por perda de objeto é conclusão sobre estado do código
e deve ser reverificada quando o código mudar.

### ATUALIZAÇÃO 2026-08-13 (WAVE-E) — extinção reconfirmada em `ac3e277`

A não-regressão da WAVE-E (`RETEST_REPORT_WAVE-E.md` §7.6) reconfirmou que
**cancelar pagamento `sent` continua recusado** no estado integrado. A extinção
por perda de objeto persiste. **A ação no delta audit permanece devida** — a
reconfirmação foi por reteste dirigido, não por auditoria do commit.

---

## OBS-SIM-002-004 — o teste de TOCTOU não distingue "corrigido" de "não observável"

ORIGEM: WAVE-C (`9ce4754`), ressalva metodológica declarada pelo próprio runner
durante o reteste de FIND-006.
CONFIANÇA: n/a (não é alegação sobre o produto).
SEVERIDADE: **INFO — limitação metodológica de reteste**.
ESTADO: **ABERTA**.

FATO: com a remoção do `await` que antecedia o bloco transacional síncrono de
`createPayment`, a janela de corrida deixou de ser **fisicamente alcançável neste
modelo de execução**. Consequência: o resultado "1 sucesso em 3 rodadas de
`Promise.all` e 1 sucesso em rajada de 10" é compatível tanto com "corrigido"
quanto com "não observável por este método". O teste dinâmico, sozinho, não
discrimina.

CLASSIFICAÇÃO: **INFO / registro de limitação — não é finding de produto**, e a
distinção é importante: não há alegação de defeito aqui. O que se registra é o
alcance probatório do reteste, para que ninguém no futuro cite "0 estouros
medidos" como prova de atomicidade.

POR QUE FIND-006 AINDA ASSIM FOI FECHADO: o veredito não repousa no teste
dinâmico, e sim no **item 4 da própria `RETEST_SPECIFICATION`** — verificação
estrutural de demarcação transacional efetiva. A eliminação do ponto de suspensão
entre leitura e escrita é exatamente o mecanismo que o finding-validator
identificou como causa da corrida: removê-lo **remove** a corrida, não a oculta.
A honestidade do runner ao declarar a ressalva é registrada como boa prática.

DELIMITAÇÃO PRESERVADA: o fechamento de FIND-006 cobre a corrida
**intraprocesso**. A corrida **entre processos/conexões** não foi exercitada por
nenhuma das partes, permanece na §3.2 da `AUDIT_COVERAGE_MATRIX` como lacuna viva
e é objeto conceitual de FIND-SIM-002-010 (MEDIUM, `PROPOSED`, aberto).

ENCAMINHAMENTO: o delta audit deve provar atomicidade por método que **não**
dependa de observabilidade da janela — inspeção de demarcação transacional,
teste multiprocesso sobre arquivo `.db` compartilhado, ou invariante imposta pelo
banco.

### ATUALIZAÇÃO 2026-08-13 (WAVE-E) — permanece ABERTA, com escopo ampliado

A WAVE-E demonstrou que o runner **sabe** produzir prova multiprocesso: o limite
de reenvio foi provado **persistente entre processos** com banco em arquivo
(`RETEST_REPORT_WAVE-E.md` §7.3). Isso remove a objeção de viabilidade que
poderia justificar adiar o método pedido aqui: a técnica existe e já foi
executada neste run.

Escopo ampliado para o delta audit: a mesma prova deve alcançar também o
**contador de reenvio** introduzido na WAVE-E, cuja segurança sob concorrência
não foi exercitada (ver OBS-SIM-002-008, atualização).

---

## OBS-SIM-002-005 — prova de mutação de TC-SIM2-003b não evidenciada

ORIGEM: WAVE-A (`f0aaa7a`), lacuna de evidência no reteste de FIND-007.
SEVERIDADE: **INFO — lacuna de evidência de assurance**.
ESTADO: **ABERTA**.

FATO: o item 5 da `RETEST_SPECIFICATION` de FIND-007 exigia prova de discriminação
por mutação (neutralizar a guarda de teto e exigir que o novo teste **falhe**).
Essa execução não consta da evidência do runner. Os itens 1 a 4 foram atendidos
com medição direta.

POR QUE NÃO BLOQUEOU O FECHAMENTO: o objeto de FIND-007 era "o teste passa nos
dois mundos possíveis" (zero asserções, `catch` vazio). Isso está refutado por
implicação lógica direta: um teste sem asserção não pode produzir a verificação
`COUNT(*) payments = 0` nem discriminar fronteira em R$ 0,01. A mutação
**elevaria** a confiança; não é condição necessária para demonstrar a extinção do
defeito.

CLASSIFICAÇÃO: **backlog de assurance** — não é finding de produto e não retorna à
SanaCore. Executar na próxima rodada de assurance ou no delta audit, junto com a
varredura do mesmo antipadrão (`try/catch` sem asserção) na suíte inteira.

### ATUALIZAÇÃO 2026-08-13 (WAVE-E) — prioridade ELEVADA de backlog para item de escopo

Dois fatos da WAVE-E mudam o peso desta observação, em direções opostas, e
registro os dois:

- **Favorável:** a onda executou **prova de mutação real** (4 mutantes, 4 mortos),
  demonstrando que a prática está instalada.
- **Desfavorável, e decisivo:** a SanaCore **encontrou na própria suíte um teste
  tautológico** — que importava a constante do módulo sob teste, logo não podia
  falhar. Isto é **exatamente o antipadrão** que esta observação carrega desde a
  WAVE-A, agora **confirmado como vivo neste código-base**, e não hipotético.

Consequência: a varredura do antipadrão deixa de ser "backlog de assurance" e
passa a **item obrigatório de escopo do delta audit**, sobre a **suíte versionada
inteira** (60 casos): `try/catch` sem asserção, asserção contra constante
importada do próprio módulo, e testes cujo oráculo deriva do objeto sob teste.
A observação **permanece ABERTA** — a mutação executada na WAVE-E cobriu o escopo
da WAVE-E, não TC-SIM2-003b.

---

## OBS-SIM-002-006 — convergência documental e formalização da BR de papéis (residual do fechamento de FIND-008)

ORIGEM: WAVE-D (`b6d44da`), residual carved out do fechamento integral de
FIND-SIM-002-008 (RETEST_REPORT §5.3).
CONFIANÇA quanto ao fato: **não verificado** — ver abaixo, é o ponto central.
SEVERIDADE PRELIMINAR: **LOW** (consistência documental; o defeito de autorização
está extinto e provado extinto).
ESTADO: **ABERTA**.

FATO EM TRÊS PARTES, todas de natureza documental/formal:
(a) **`SOFTWARE_RELEASE_PACKAGE.md:28`** declara, no `AUDIT_COMMIT`, "Criar
    pagamento: `analyst`, `manager` da empresa proprietária — permitido", o que
    contraria a norma aprovada pela APR-2026-008 (escrita restrita a `manager`).
    Se a WAVE-D não atualizou essa linha, a AUTHORIZATION_MATRIX do release
    contradiz o comportamento e a norma.
(b) **A norma vive apenas em `coretriad/governance/APPROVALS.md`**, não transcrita
    como BR com ID em `product/SIM-002/requirements/BUSINESS_RULES.md`. A
    **Regra 18 está satisfeita** (decisão humana explícita e registrada); a
    **Regra 17** (requisitos/regras com IDs padronizados) fica com pendência
    formal. Mesma pendência vale para APR-2026-007 (semântica de cancelamento) e
    APR-2026-009 (estado `failed`).
(c) **Caso negativo na suíte versionada** (papel não autorizado recusado) não foi
    evidenciado isoladamente — embora a suíte tenha ido de 20 para 49 casos e o
    runner tenha executado o negativo em harness próprio, o que é prova mais forte
    quanto ao comportamento, porém não quanto à cobertura versionada.

POR QUE NÃO VERIFICADO: a inspeção disponível a este diretor corresponde ao
`AUDIT_COMMIT`; `b6d44da` não é inspecionável sem delta audit, e a evidência do
reteste é comportamental. Registro a limitação em vez de afirmar qualquer das
hipóteses — é preferível uma lacuna declarada a uma conclusão sem lastro.

INSTRUÇÃO EXPRESSA PARA O DELTA AUDIT: verificar (a), (b) e (c). Se
`SOFTWARE_RELEASE_PACKAGE.md:28` estiver ainda divergente, **abrir finding
documental próprio** — **FIND-SIM-002-008 não se reabre**, pois seu objeto (o
defeito de autorização) está extinto por evidência.

### ATUALIZAÇÃO 2026-08-13 (WAVE-E) — escopo ampliado; permanece ABERTA e NÃO VERIFICÁVEL daqui

O item (b) cresce: são agora **seis** aprovações que constituem norma de produto e
vivem **apenas** em `coretriad/governance/APPROVALS.md`, sem transcrição como BR
com ID (Regra 17) — **APR-2026-007, 008, 009, 011, 012 e 013**. Registro o efeito
prático, que a WAVE-E tornou concreto e não teórico: **a ambiguidade normativa
disposta em OBS-SIM-002-009 existe precisamente porque a norma nunca foi
transcrita em texto de requisito com fronteiras explícitas.** A pendência da
Regra 17 deixou de ser formalidade e produziu, nesta onda, uma pergunta que
precisou voltar ao humano.

O item (c) cresce igualmente: além do caso negativo de papel em pagamento, a suíte
versionada deve conter os casos negativos da WAVE-E — **papel forjado em
`approveSupplier`**, **`analyst` cancelando pagamento `created`** e **5ª
submissão bloqueada**. O runner os executou em harness próprio (prova mais forte
quanto ao comportamento); a cobertura **versionada** segue não evidenciada.

O item (a) permanece **não verificado**: continuo sem poder inspecionar `ac3e277`
a partir deste namespace. Nada aqui foi presumido em nenhum sentido.

---

## OBS-SIM-002-007 — papel autorizado a cancelar pagamento `created` permanece sem árbitro

ORIGEM: WAVE-D (`b6d44da`), residual carved out do fechamento de FIND-SIM-002-004
(RETEST_REPORT §5.1).
CONFIANÇA: **CONFIRMED** quanto à lacuna normativa; **indeterminado quanto ao
defeito** — exatamente a mesma situação em que estava a OBS-SIM-002-002 antes da
APR-2026-008.
SEVERIDADE PRELIMINAR: **MEDIUM**.
ESTADO: **REMEDIADA — 2026-08-13** (ver atualização).

FATO: a **APR-2026-007** definiu **quais estados** são canceláveis (`created` sim,
`sent` não). **Não definiu quem cancela.** A `RETEST_SPECIFICATION` de FIND-004
exigia "recusa papel sem alçada", item que permanece sem oráculo. Este diretor
**não** o supre por analogia com a APR-2026-008 — aquela decisão trata de criar,
enviar e ler pagamento, não de cancelar (Regras 6 e 18).

IMPACTO DELIMITADO, medido em seu contexto: cancelar um pagamento `created`
**libera crédito comprometido** (`sumCommittedAmount`, `paymentService.js:31`) sem
alçada e — enquanto FIND-SIM-002-012 (ausência de `updated_at`/trilha) estiver
aberto — **sem trilha de quem cancelou**. **Não há duplicação financeira nesse
caminho**: a transição `sent → created` foi eliminada.

POR QUE NÃO IMPEDIU O FECHAMENTO DE FIND-004: o objeto daquele finding —
comportamento sem requisito, revertendo envio, sem sujeito, com duplicação
encadeada — está extinto e provado extinto. Manter um CRITICAL aberto para
carregar uma lacuna normativa distinta descreveria mal o risco.

ENCAMINHAMENTO: **human gate**, preferencialmente **em ato único com
FIND-SIM-002-014** — ambos são a mesma pergunta ("quem, verificado como, pode
executar esta operação") em operações diferentes, e decidi-los separadamente
reproduziria a fragmentação normativa que a APR-2026-008 corrigiu para pagamento.

### ATUALIZAÇÃO 2026-08-13 (WAVE-E) — **REMEDIADA**

O encaminhamento foi cumprido **exatamente como pedido**: a decisão veio em **ato
único** com a de FIND-014 (APR-2026-011) e a de OBS-008(c) (APR-2026-013). A
fragmentação normativa que se queria evitar não ocorreu.

Norma: **APR-2026-012** — **apenas `manager`** cancela pagamento em `created`,
com papel verificado no servidor contra a fonte confiável de identidade; **não
estender a `analyst`**. Texto inequívoco; não há ambiguidade a dispor.

Evidência (`RETEST_REPORT_WAVE-E.md` §7.2), com prova de discriminação:

| Cenário | `bba830f` (antes) | `ac3e277` (depois) |
|---|---|---|
| `analyst` cancela pagamento `created` | **CANCELOU** | **RECUSADO** |
| `manager` cancela pagamento `created` | cancela | **cancela** (caminho positivo preservado) |

Não-regressão da norma anterior confirmada: **cancelar `sent` continua recusado**
(APR-2026-007) — a nova restrição de papel não foi obtida afrouxando a restrição
de estado.

Efeito material: a liberação de crédito comprometido passa a exigir o **mesmo
papel** que a criação e o envio (APR-2026-008), de modo que **deixa de ser
exercível por quem não pode consumir o crédito**.

**Residual que NÃO se fecha:** a **trilha de quem cancelou** continua ausente
enquanto **FIND-SIM-002-012** estiver aberto — finding com decisão humana de
**não-bloqueio** registrada (APR-2026-010) e rastreado como pendente. Registro
para que esta remediação não seja lida como "há trilha de cancelamento": não há.

ESTADO FINAL: **REMEDIADA**. Não vira finding. Não retorna à SanaCore.

---

## OBS-SIM-002-008 — residuais do fechamento de FIND-009: atomicidade, migração do `CHECK` e retentativa de `failed`

ORIGEM: WAVE-D (`b6d44da`), residuais carved out do fechamento de
FIND-SIM-002-009 (RETEST_REPORT §5.5); itens (b) e (c) declarados espontaneamente
pela SanaCore.
SEVERIDADE PRELIMINAR: **LOW** para (a); **MEDIUM** para (b) e (c).
ESTADO: **(a) ABERTA · (b) ABERTA · (c) REMEDIADA — 2026-08-13**.

(a) **Atomicidade não evidenciada.** O item 3 da `RETEST_SPECIFICATION` de
    FIND-009 (simular falha entre `INSERT` em `payment_attempts` e `UPDATE` em
    `payments`, exigindo que nenhuma escrita persista) não consta da evidência do
    reteste. Não bloqueou o fechamento porque o `vericore-finding-validator` já
    havia **rebaixado esta subalegação a observação residual LOW**, demonstrando
    que `db.run` é síncrono e as chamadas consecutivas — janela desprezível em
    processo único. Converter agora em bloqueio uma subalegação refutada por
    evidência seria incoerente. Verificar no delta audit, junto com OBS-004
    (ambas são sobre demarcação transacional).

(b) **`CHECK` de `payments.status` não retroage a bases preexistentes.** O novo
    domínio (`created`/`sent`/`cancelled`/`failed`, conforme APR-2026-009) é
    imposto por constraint no schema, **sem script de migração**. Em base já
    povoada, criada antes da WAVE-D, a constraint não é aplicada e o domínio não é
    garantido. Classe de risco: divergência silenciosa entre ambiente novo e
    ambiente existente — o tipo de problema que só aparece em produção. MEDIUM.

(c) **Sem política de limite de retentativa para pagamento `failed`.** O estado
    `failed` criou uma pergunta que antes não existia: o que fazer com um pagamento
    recusado — reenviar quantas vezes, por quanto tempo, sob qual autorização. A
    APR-2026-009 normatizou **o estado**, não **o ciclo de vida do estado**. Isto
    **não é defeito do que foi remediado**; é **lacuna normativa nova**, e por isso
    é observação com encaminhamento a human gate, não finding. Nota de risco: sem
    limite de retentativa, um `failed` reenviável indefinidamente reintroduz, por
    outro caminho, a pressão sobre BR-PAY-002 que FIND-003 tratou.

ENCAMINHAMENTO: (a) delta audit — trilha `data-integrity`; (b) delta audit —
trilha `database`, com verificação explícita de migração; (c) **human gate**,
podendo compor o mesmo ato de FIND-014 e OBS-007.

### ATUALIZAÇÃO 2026-08-13 (WAVE-E) — item (c) **REMEDIADO**; (a) e (b) intocados

**Human gate cumprido:** **APR-2026-013** — *"limite de 3 tentativas de reenvio ao
gateway para um pagamento em `failed`. Esgotado o limite, o pagamento permanece
`failed` definitivo e exige ação manual — sem retentativa automática ilimitada."*
Emitida no **mesmo ato** que APR-2026-011 e 012, como o encaminhamento pedia.

**Evidência medida em `ac3e277`** (`RETEST_REPORT_WAVE-E.md` §7.3), com gateway
recusando: 4 submissões (1 envio + 3 reenvios); **5ª chamada bloqueada sem tocar o
gateway**, com mensagem de ação manual; `payment_attempts` com **4 linhas
`failed`**; **limite persistente entre processos** (banco em arquivo); **não
contornável trocando o gateway** por um que aceitaria; sucesso dentro do limite
leva a `sent` normalmente.

**Ambiguidade de contagem — DISPOSTA COMO CONFORME.** A APR-2026-013 fala em "3
tentativas de **reenvio**... para um pagamento em `failed`", e o implementado são
3 reenvios além do envio original. O texto **decide**, e decide a favor do
implementado, por dois ancoradouros independentes: (i) *reenvio* pressupõe, por
definição, um envio anterior que não é ele próprio um reenvio; (ii) "para um
pagamento **em `failed`**" delimita o universo às tentativas feitas **estando o
pagamento em `failed`** — e a submissão que produziu o `failed` é logicamente
anterior a esse universo. Fundamentação completa em `RETEST_REPORT_WAVE-E.md`
§7.5.1. **Não se abre human gate** para o que o texto já resolve.

**Efeito sobre a nota de risco original:** deixa de se sustentar. O reenvio é
finito, contado no banco e não contornável — a pressão sobre BR-PAY-002 por essa
via está eliminada. Registro ainda que este é o **segundo** controle que migra do
gateway não auditável (§3.3 da matriz) para o serviço, o primeiro tendo sido o de
§5.2.

**Residuais do item (c) que vão ao delta audit** — porque o mecanismo de contagem
é **código novo, jamais auditado por ninguém**, apenas retestado contra uma spec
de observação:
(i) **escopo por tenant do contador** — não exercitado;
(ii) **segurança do contador sob concorrência** — não exercitada; mesma família de
     **FIND-SIM-002-010** (check-then-act sem CAS) e da §3.2 da matriz;
(iii) **reconstituição do limite** se `payment_attempts` for expurgada/podada.
Nenhum dos três é alegação de defeito: são **superfícies não exercitadas**.

**Higiene normativa:** transcrever a APR-2026-013 como BR com ID, com a contagem
explicitada em números ("1 envio + até 3 reenvios = no máximo 4 submissões"),
eliminando a ambiguidade em definitivo. Absorvido por OBS-SIM-002-006(b).

**Itens (a) e (b): nada nesta onda os tocou. Permanecem ABERTOS**, com o mesmo
encaminhamento.

---

## OBS-SIM-002-009 — ambiguidade da APR-2026-011: quais papéis podem aprovar fornecedor

ORIGEM: WAVE-E (`ac3e277`), ambiguidade normativa isolada pelo
`vericore-audit-verification-runner` como **fato**, e disposta por este diretor em
`RETEST_REPORT_WAVE-E.md` §7.5.2.
CONFIANÇA: **CONFIRMED** quanto à indeterminação normativa; **NÃO HÁ ALEGAÇÃO DE
DEFEITO** — ver abaixo.
SEVERIDADE PRELIMINAR: **não classificável** enquanto a norma for indeterminada.
Classificar severidade de um comportamento sem "esperado" definido seria inventar
o esperado (Regra 6).
ESTADO: **ABERTA — HUMAN GATE**.

FATO: a **APR-2026-011** diz *"A mesma alçada já decidida (`manager`) aplica-se à
aprovação"*, o que **pode** ser lido como aprovação **privativa de `manager`**. A
implementação em `ac3e277` manteve **`analyst` até R$ 10.000** (BR-APR-001) e
**`manager` sem teto**, comportamento medido e confirmado no reteste. **Os textos
não coincidem literalmente.**

DUAS LEITURAS, ambas sustentáveis:
- **(A) restritiva:** "alçada já decidida (`manager`)" remete à APR-2026-008, que
  restringiu **escrita** a `manager`; aprovação seria escrita; logo aprovação é
  privativa de `manager` e `analyst` não aprova nada.
- **(B) de continuidade:** "alçada" é, no vocabulário constante deste run, o
  **teto de valor** de BR-APR-001 — o próprio FIND-001 chama-se "alçada do
  analista", e a APR-2026-008 nunca usou a palavra "alçada". A frase diria: a
  alçada já decidida aplica-se agora que o papel é confiável.

ELEMENTOS QUE EMPURRAM PARA (B), registrados sem serem tratados como conclusivos:
1. O **objeto declarado** da APR-2026-011 é **procedência**, não rol de papéis:
   contexto, decisão e "efeito normativo" falam de *fonte* de identidade e de
   "uma única **fonte** de papel para todas as operações".
2. **BR-APR-001 é artefato versionado** (Regra 7, fonte oficial de verdade) e
   **jamais foi revogada** — a APR-2026-011 não a menciona, não diz "revoga", não
   diz "privativa". Revogação tácita de regra expressa é construção que este
   diretor **não** pode fazer.
3. **Coerência do run:** FIND-001 foi fechado como CRITICAL justamente por
   implantar `analyst ≤ 10.000`. Sob (A), aquele fechamento estaria hoje errado.

ELEMENTOS QUE IMPEDEM O FECHAMENTO EM (B):
1. O parêntese "(`manager`)" está escrito, e é o termo que (B) explica com menos
   naturalidade. Leitura que precisa explicar um termo escrito não funda
   fechamento.
2. Sob (A), o produto está **permissivo** em ponto de controle financeiro.
   Fechar em (B) e estar errado significa **aprovar auditoria sobre defeito de
   autorização** — assimetria de dano que recomenda a pergunta, não o palpite.
3. **Regra 21**: contradição entre **dois documentos normativos** (BR versionada e
   aprovação humana posterior), ambos autoritativos. Uma decisão humana **pode**
   criar ou revogar BR; saber se foi isso que ocorreu não é questão técnica — é
   saber o que o aprovador decidiu. Por definição, human gate.

**POR QUE NÃO É FINDING:** sob a única leitura amparada por artefato versionado
(BR-APR-001 em vigor), o comportamento medido **é conforme**. Não há defeito
provado; há **norma indeterminada**. Abrir finding exigiria fixar o "esperado" —
Regra 6.

**POR QUE NÃO REABRE O FIND-SIM-002-014:** o objeto daquele finding é
*procedência do atributo de autorização*, cumprida e provada cumprida. Este item é
*conjunto de papéis autorizados* — pergunta distinta.

**EFEITO SOBRE O VEREDITO DO RUN:** entra como condição **(B)** do
`AUDIT_PASSED` (`RETEST_REPORT_WAVE-E.md` §8) — barata e binária, mas real: se a
resposta for (A), o produto passa a ter defeito de autorização em aberto, e um
`AUDIT_PASSED` declarado antes da resposta teria repousado sobre premissa falsa.

PERGUNTA OBJETIVA A SUBMETER (formulada para resposta de uma palavra, sem sugerir
resposta):

> A APR-2026-011, ao dizer "a mesma alçada já decidida (`manager`) aplica-se à
> aprovação", significa **(A)** que somente `manager` pode aprovar fornecedor,
> revogando a faixa de `analyst` até R$ 10.000 de BR-APR-001 — ou **(B)** que
> BR-APR-001 permanece integralmente em vigor (`analyst` até R$ 10.000, `manager`
> sem teto), tendo a decisão versado apenas sobre a **procedência** do papel?
>
> Se **(A)**: BR-APR-001 deve ser emendada no mesmo ato, o comportamento atual
> passa a ser defeito de autorização e haverá remediação e reteste.
> Se **(B)**: basta o registro, e nada muda no produto.

ENCAMINHAMENTO: **human gate — responsável humano**, com registro em
`coretriad/governance/APPROVALS.md`. Prevenção reiterada: transcrever a decisão
como **BR com ID** (Regra 17), porque esta ambiguidade existe precisamente por a
norma nunca ter sido transcrita em texto de requisito.

---

## OBS-SIM-002-010 — FIND-SIM-002-014 remediado sem passar pelo finding-validator (Regra 22)

ORIGEM: WAVE-E — não-conformidade **de processo**, não de produto.
CONFIANÇA: **CONFIRMED** (verificável no próprio finding: `VALIDATED_BY: —`).
SEVERIDADE: **não aplicável** — não é alegação sobre o objeto auditado.
ESTADO: **ABERTA — disposição do CoreTriad Director**.

FATO: o FIND-SIM-002-014 seguiu para remediação **sem** o
`vericore-finding-validator`, contrariando a **Regra 22** ("findings CRITICAL e
HIGH passam pelo finding-validator **antes de seguirem para remediação**") e a
condição (a) do veredito da §6 do `RETEST_REPORT.md`, que exigia a validação como
etapa prévia. O finding foi, ainda, **elevado a CRITICAL** no fechamento.

POR QUE NÃO BLOQUEOU O FECHAMENTO (fundamentação em
`RETEST_REPORT_WAVE-E.md` §7.1.5, resumida):
1. O interesse protegido pela Regra 22 foi atendido **por meio mais forte**: o
   defeito foi **reproduzido empiricamente** num baseline real antes de ser
   declarado extinto, e a severidade foi fixada por **cláusula pré-registrada**,
   não por juízo discricionário.
2. Nenhum resultado do validator **reviveria** defeito provado extinto por
   execução; o único efeito plausível seria sobre severidade, já elevada ao máximo
   previsto pela própria cláusula.

POR QUE MESMO ASSIM É REGISTRADO: rito descumprido e não registrado vira
precedente silencioso. O desvio existe, é verificável, e a sua disposição
**não é deste diretor** — o rito da Regra 22 pertence ao control plane.

ENCAMINHAMENTO: **CoreTriad Director** — ou dispensa fundamentada, ou execução
**retrospectiva** do `vericore-finding-validator` sobre `f2fcf1c` e `ac3e277`,
a custo baixo. Se o validator produzir evidência nova, o fechamento é reexaminado;
hipótese declarada aberta, e não descartada.

---

## Quadro de triagem

| ID | Origem | Classificação | Severidade prelim. | Estado | Encaminhamento |
|---|---|---|---|---|---|
| OBS-SIM-002-001 | WAVE-A `f0aaa7a` | integridade de dado / trilha de autoria | LOW → residual INFO | **EXTINTA QUANTO AO VETOR MEDIDO** (APR-2026-011 + `ac3e277`) | delta audit — leitura **positiva** do formato de `approved_by` + varredura de coerção em colunas TEXT |
| OBS-SIM-002-002 | WAVE-B `9f7b056` | divergência de papel em leitura | MEDIUM | **REMEDIADA** (APR-2026-008 + `b6d44da`) | apenas confirmação documental via OBS-006 |
| OBS-SIM-002-003 | WAVE-C `9ce4754` | observação residual dependente | MEDIUM | **EXTINTA POR PERDA DE OBJETO** (APR-2026-007 + `b6d44da`; reconfirmada em `ac3e277`) | confirmar inalcançabilidade no delta audit |
| OBS-SIM-002-004 | WAVE-C `9ce4754` | INFO / limitação metodológica | INFO | **ABERTA** | delta audit — prova multiprocesso, agora **também** para o contador de reenvio |
| OBS-SIM-002-005 | WAVE-A `f0aaa7a` | antipadrão de teste sem poder discriminatório | INFO | **ABERTA — prioridade elevada** | delta audit — varredura na suíte versionada inteira (60 casos) |
| OBS-SIM-002-006 | WAVE-D `b6d44da` | residual documental de FIND-008, ampliado | LOW | **ABERTA — não verificável deste namespace** | delta audit; **6** aprovações a transcrever como BR (Regra 17); casos negativos versionados |
| OBS-SIM-002-007 | WAVE-D `b6d44da` | residual normativo de FIND-004 | MEDIUM | **REMEDIADA** (APR-2026-012 + `ac3e277`) | residual: trilha de cancelamento depende de FIND-012 (não bloqueante, APR-2026-010) |
| OBS-SIM-002-008 (a) | WAVE-D `b6d44da` | atomicidade não evidenciada | LOW | **ABERTA** | delta audit — trilha `data-integrity`, junto com OBS-004 |
| OBS-SIM-002-008 (b) | WAVE-D `b6d44da` | `CHECK` sem migração para bases preexistentes | MEDIUM | **ABERTA** | delta audit — trilha `database` |
| OBS-SIM-002-008 (c) | WAVE-D `b6d44da` | política de retentativa de `failed` | MEDIUM | **REMEDIADA** (APR-2026-013 + `ac3e277`); ambiguidade de contagem disposta como **CONFORME** | delta audit — tenant, concorrência e poda do contador (código novo, nunca auditado) |
| **OBS-SIM-002-009** | WAVE-E `ac3e277` | **ambiguidade normativa — não é finding** | não classificável | **ABERTA — HUMAN GATE** | responsável humano; condição (B) do `AUDIT_PASSED` |
| **OBS-SIM-002-010** | WAVE-E | **não-conformidade de processo (Regra 22)** | n/a | **ABERTA** | CoreTriad Director; condição (C) do `AUDIT_PASSED` |

**Balanço após a WAVE-E:** 12 itens de observação registrados no run — **5
dispostos** (002 remediada, 003 extinta, 007 remediada, 008(c) remediada, 001
extinta quanto ao vetor) e **7 abertos**, dos quais **5 só o delta audit pode
dispor** (001-residual, 004, 005, 006, 008(a), 008(b)) e **2 são gates de decisão
alheia** (009 humano, 010 control plane).

Nenhuma observação foi validada pelo `vericore-finding-validator`. Nenhuma
autoriza, por si só, alteração de código — a VeriCore não corrige (Regra 2).
Todas as disposições desta rodada apoiam-se em **evidência de execução com
comparação antes/depois**, e nenhuma em presunção.

**Não pertence a este arquivo:** o papel autodeclarado em
`approvalService.approveSupplier`. Por ser defeito verificado **no próprio
`AUDIT_COMMIT`**, foi aberto como finding formal — **FIND-SIM-002-014**
(`21-findings/FIND-SIM-002-014.md`), elevado a **CRITICAL** pela cláusula (c) e
**CLOSED** em 2026-08-13 por remediação e reteste independente sobre `ac3e277`.
