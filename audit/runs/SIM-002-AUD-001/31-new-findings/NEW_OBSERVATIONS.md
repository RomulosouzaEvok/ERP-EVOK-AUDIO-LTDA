# NOVAS OBSERVAÇÕES DA FASE DE RETESTE — SIM-002-AUD-001

AUDIT_ID: SIM-002-AUD-001
AUDIT_COMMIT (auditoria original): f2fcf1c78a6a1255738d05e66a6100fa9c47428a
DATA: 2026-08-13 (atualizado após a WAVE-D, `b6d44da`, na mesma data)
EMITIDO_POR: vericore-software-audit-director
ORIGEM: fatos incidentais e ressalvas metodológicas medidos pelo
`vericore-audit-verification-runner` durante o reteste das ondas A, B, C e D.

## Estatuto destes registros

1. **Nenhuma observação aqui é um finding fechado.** Estados possíveis: `ABERTA`,
   `REMEDIADA`, `EXTINTA POR PERDA DE OBJETO`.
2. **Nenhuma é finding formal.** Foram observadas em commits **posteriores** ao
   `AUDIT_COMMIT` (`f0aaa7a`, `9f7b056`, `9ce4754`, `b6d44da`). Pelas Regras
   12-14, a auditoria não segue HEAD: promover qualquer uma a finding exige
   **delta audit** com `AUDIT_COMMIT` próprio.
   **Exceção registrada:** o risco de papel autodeclarado em `approveSupplier` foi
   verificado por leitura direta **no próprio `AUDIT_COMMIT`** e, por isso, **não**
   ficou aqui — virou **FIND-SIM-002-014**. A distinção é deliberada: observação é
   para fato de commit posterior; defeito do objeto auditado é finding.
3. **Nenhuma altera os vereditos de reteste** já emitidos no
   `30-retest/RETEST_REPORT.md`. Onde uma observação delimita um fechamento, a
   delimitação está escrita no bloco do finding correspondente.
4. As severidades abaixo são **preliminares** e não passaram pelo
   `vericore-finding-validator`. Nenhuma foi promovida a HIGH/CRITICAL; se alguma
   vier a sê-lo no delta audit, a Regra 22 se aplica.

---

## OBS-SIM-002-001 — `suppliers.approved_by` persiste `"77.0"` por coerção do driver

ORIGEM: WAVE-A (`f0aaa7a`), fato incidental medido durante o reteste de FIND-001.
CONFIANÇA: **CONFIRMED** (observado empiricamente, não deduzido).
SEVERIDADE PRELIMINAR: **LOW**, com gatilho de elevação a MEDIUM (abaixo).
ESTADO: **ABERTA**.

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

ENCAMINHAMENTO: delta audit → trilhas `database` e `data-integrity`. Verificar
também se a mesma coerção já existia no `AUDIT_COMMIT` (provavelmente sim, e
neste caso trata-se de defeito **não detectado** pela auditoria original, o que
deve ser registrado como lacuna de cobertura da trilha `database`, cuja §2.4 da
`AUDIT_COVERAGE_MATRIX` declara que "nenhuma constraint foi testada por inserção
real").

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

---

## OBS-SIM-002-007 — papel autorizado a cancelar pagamento `created` permanece sem árbitro

ORIGEM: WAVE-D (`b6d44da`), residual carved out do fechamento de FIND-SIM-002-004
(RETEST_REPORT §5.1).
CONFIANÇA: **CONFIRMED** quanto à lacuna normativa; **indeterminado quanto ao
defeito** — exatamente a mesma situação em que estava a OBS-SIM-002-002 antes da
APR-2026-008.
SEVERIDADE PRELIMINAR: **MEDIUM**.
ESTADO: **ABERTA — human gate**.

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

---

## OBS-SIM-002-008 — residuais do fechamento de FIND-009: atomicidade, migração do `CHECK` e retentativa de `failed`

ORIGEM: WAVE-D (`b6d44da`), residuais carved out do fechamento de
FIND-SIM-002-009 (RETEST_REPORT §5.5); itens (b) e (c) declarados espontaneamente
pela SanaCore.
SEVERIDADE PRELIMINAR: **LOW** para (a); **MEDIUM** para (b) e (c).
ESTADO: **ABERTA**.

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

---

## Quadro de triagem

| ID | Origem | Classificação | Severidade prelim. | Estado | Encaminhamento |
|---|---|---|---|---|---|
| OBS-SIM-002-001 | WAVE-A `f0aaa7a` | candidato a novo finding | LOW (gatilho → MEDIUM) | **ABERTA** | delta audit — database / data-integrity; unir a FIND-014 se houver remediação |
| OBS-SIM-002-002 | WAVE-B `9f7b056` | divergência de papel em leitura | MEDIUM | **REMEDIADA** (APR-2026-008 + `b6d44da`) | apenas confirmação documental via OBS-006 |
| OBS-SIM-002-003 | WAVE-C `9ce4754` | observação residual dependente | MEDIUM | **EXTINTA POR PERDA DE OBJETO** (APR-2026-007 + `b6d44da`) | confirmar inalcançabilidade no delta audit |
| OBS-SIM-002-004 | WAVE-C `9ce4754` | INFO / limitação metodológica | INFO | **ABERTA** | método do delta audit |
| OBS-SIM-002-005 | WAVE-A `f0aaa7a` | backlog de assurance | INFO | **ABERTA** | próxima rodada de assurance |
| OBS-SIM-002-006 | WAVE-D `b6d44da` | residual documental de FIND-008 | LOW | **ABERTA** | delta audit; se divergente, finding documental **novo** |
| OBS-SIM-002-007 | WAVE-D `b6d44da` | residual normativo de FIND-004 | MEDIUM | **ABERTA** | **human gate**, em ato único com FIND-014 |
| OBS-SIM-002-008 | WAVE-D `b6d44da` | residuais de FIND-009 (3 itens) | LOW / MEDIUM / MEDIUM | **ABERTA** | delta audit (a, b) + **human gate** (c) |

Nenhuma observação foi validada pelo `vericore-finding-validator`. Nenhuma
autoriza, por si só, alteração de código — a VeriCore não corrige (Regra 2).
Duas foram dispostas nesta rodada (OBS-002 remediada, OBS-003 extinta), ambas com
registro do fundamento e da evidência, e nenhuma por presunção.

**Não pertence a este arquivo:** o papel autodeclarado em
`approvalService.approveSupplier`. Por ser defeito verificado **no próprio
`AUDIT_COMMIT`**, foi aberto como finding formal — **FIND-SIM-002-014**
(`21-findings/FIND-SIM-002-014.md`), HIGH, `PROPOSED`, com cláusula de elevação a
CRITICAL, aguardando `vericore-finding-validator` (Regra 22) e human gate
(Regra 18).
