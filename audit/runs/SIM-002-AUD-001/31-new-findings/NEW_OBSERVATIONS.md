# NOVAS OBSERVAÇÕES DA FASE DE RETESTE — SIM-002-AUD-001

AUDIT_ID: SIM-002-AUD-001
AUDIT_COMMIT (auditoria original): f2fcf1c78a6a1255738d05e66a6100fa9c47428a
DATA: 2026-08-13
EMITIDO_POR: vericore-software-audit-director
ORIGEM: fatos incidentais e ressalvas metodológicas medidos pelo
`vericore-audit-verification-runner` durante o reteste das ondas A, B e C.

## Estatuto destes registros

1. **Nenhuma observação aqui é um finding fechado.** Todas estão **ABERTAS**.
2. **Nenhuma é finding formal ainda.** Foram observadas em commits **posteriores**
   ao `AUDIT_COMMIT` (`f0aaa7a`, `9f7b056`, `9ce4754`). Pelas Regras 12-14, a
   auditoria não segue HEAD: promover qualquer uma a finding exige **delta audit**
   com `AUDIT_COMMIT` próprio, ou nova auditoria. Registrá-las como findings deste
   run seria misturar objetos auditados distintos.
3. **Nenhuma altera os vereditos de reteste** já emitidos no
   `30-retest/RETEST_REPORT.md`. Onde uma observação delimita um fechamento, a
   delimitação está escrita no bloco do finding correspondente.
4. As classificações de severidade abaixo são **preliminares** e não passaram pelo
   `vericore-finding-validator`. Nenhuma foi promovida a HIGH/CRITICAL; se alguma
   vier a sê-lo no delta audit, a Regra 22 se aplica.

---

## OBS-SIM-002-001 — `suppliers.approved_by` persiste `"77.0"` por coerção do driver

ORIGEM: WAVE-A (`f0aaa7a`), fato incidental medido durante o reteste de FIND-001.
CONFIANÇA: **CONFIRMED** (observado empiricamente, não deduzido).
SEVERIDADE PRELIMINAR: **LOW**, com gatilho de elevação a MEDIUM (abaixo).

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

ENCAMINHAMENTO: delta audit → trilhas `database` e `data-integrity`. Verificar
também se a mesma coerção já existia no `AUDIT_COMMIT` (provavelmente sim, e
neste caso trata-se de defeito **não detectado** pela auditoria original, o que
deve ser registrado como lacuna de cobertura da trilha `database`, cuja §2.4 da
`AUDIT_COVERAGE_MATRIX` declara que "nenhuma constraint foi testada por inserção
real").

---

## OBS-SIM-002-002 — papel não verificado em `getSupplier` / `listPaymentsBySupplier` contra o que `docs/API.md` declara

ORIGEM: WAVE-B (`9f7b056`), fato incidental medido durante o reteste de FIND-002.
CONFIANÇA: **CONFIRMED** quanto ao fato; **indeterminado quanto ao defeito**.
SEVERIDADE PRELIMINAR: **MEDIUM**, por analogia estrita com a severidade já
arbitrada pelo finding-validator para a divergência A de FIND-008.

FATO: `docs/API.md` exige papel `analyst|manager` em `listPaymentsBySupplier`,
mas usuário **sem `role`** ou com `role: "guest"` obtém a listagem — apenas
`companyId` é validado. Mesma classe de divergência em `getSupplier`.

DELIMITAÇÃO OBRIGATÓRIA: **o isolamento de tenant está íntegro** — verificado no
reteste de FIND-002, com `invariantViolations = 0`. Não há vazamento
cross-tenant. O que se observa é divergência **documento × código quanto a
papel**, dentro do tenant correto.

CLASSIFICAÇÃO: **candidato a novo finding, bloqueado em human gate** — e é o
ponto decisivo desta observação. Esta é **a mesma lacuna normativa** da
divergência A de FIND-SIM-002-008: nenhuma BR de `BUSINESS_RULES.md` define papel
para leitura de fornecedor ou de pagamentos, exatamente como nenhuma define papel
para registro de pagamento. Sem árbitro, **não é tecnicamente demonstrável** se o
código está permissivo demais ou se o documento é restritivo demais — e a
Regra 21 manda interromper a decisão, não escolher lado. A VeriCore não arbitra
(Regra 6).

ENCAMINHAMENTO: **levar ao MESMO human gate da divergência A de FIND-008**,
decidido em ato único, para não produzir norma de papel fragmentada e
contraditória entre operações. Se a decisão humana instituir papéis obrigatórios,
esta observação torna-se defeito de autorização confirmado e deve ser aberta como
finding com severidade reavaliada — pela mesma lógica da cláusula de reversão de
severidade registrada em FIND-008.

---

## OBS-SIM-002-003 — `sent_at` instável no caminho pós-cancelamento e dependência da dedup do gateway

ORIGEM: WAVE-C (`9ce4754`), ressalva material medida durante o reteste de
FIND-003. Referenciada no `30-retest/RETEST_REPORT.md` §1.3.
CONFIANÇA: **CONFIRMED** (medida: 1 → 4 invocações reais de `submitPayment` em
3 ciclos enviar→cancelar→enviar; `sent_at` alterado a cada reenvio).
SEVERIDADE PRELIMINAR: **MEDIUM**.

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
de serviço seria a VeriCore criar requisito de desenho inexistente (Regra 6). A
fundamentação completa está em `30-retest/RETEST_REPORT.md` §1.3.

POR QUE TAMPOUCO FOI ENCERRADA COMO ACEITÁVEL: a §3.3 da
`AUDIT_COVERAGE_MATRIX` declara que **o gateway real não é auditável** — o
`gatewayClient` do repositório é stub determinístico. A defesa passou a repousar
em um componente que esta auditoria classificou como não verificável. Se o
gateway de produção não deduplicar, não há segunda barreira: a defesa em
profundidade desapareceu, e o cenário original de FIND-003 (duplicação de
movimentação financeira) volta a ser alcançável por enviar→cancelar→enviar.

CLASSIFICAÇÃO: **observação residual aberta, dependente do human gate de
FIND-SIM-002-004**. Não é finding autônomo agora, e a razão é normativa, não de
conveniência: `cancelPayment` está sob decisão humana pendente — sua legitimidade,
sua autorização e a própria transição `sent → created` são o objeto de FIND-004.
**Não se pode especificar o comportamento idempotente correto de um caminho cuja
semântica normativa ainda não existe.** Fixar agora seria decidir por inferência
o que a Regra 18 reserva ao humano.

ENCAMINHAMENTO E CONDIÇÃO DE PROMOÇÃO: reavaliar imediatamente após a decisão de
FIND-004. Se `cancelPayment` for mantido, esta observação **deve** ser aberta
como finding e a remediação precisa demonstrar, no delta audit: (i) `sent_at`
estável ou semântica de reenvio pós-cancelamento explicitamente normatizada;
(ii) proteção no serviço, **independente** da dedup do gateway; (iii) evidência
do comportamento do gateway real, hoje inexistente. Se `cancelPayment` for
removido, a observação se extingue por perda de objeto — o que deve ser
registrado, e não presumido.

NOTA DE INTEGRIDADE DE EVIDÊNCIA (não é finding de produto): o pacote de
evidência da SanaCore descreve o curto-circuito do **serviço** como a proteção
contra reenvio. A medição independente mostra que, neste caminho, esse
curto-circuito não age. A narrativa do pacote é **mais forte que o comportamento
medido**. Registrado sem imputação de má-fé, dirigido à SanaCore e ao CoreTriad
Director, e sem efeito sobre os vereditos de reteste. É precisamente o desvio que
justifica a exigência de reteste independente da Regra 4.

---

## OBS-SIM-002-004 — o teste de TOCTOU não distingue "corrigido" de "não observável"

ORIGEM: WAVE-C (`9ce4754`), ressalva metodológica declarada pelo próprio runner
durante o reteste de FIND-006.
CONFIANÇA: n/a (não é alegação sobre o produto).
SEVERIDADE: **INFO — limitação metodológica de reteste**.

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
estrutural de demarcação transacional efetiva —, escrito pela auditoria
justamente por antecipar esta limitação. Ademais, a eliminação do ponto de
suspensão entre leitura e escrita é exatamente o mecanismo que o finding-validator
identificou como causa da corrida (o `await` diferindo a continuação para a fila
de microtarefas): removê-lo **remove** a corrida, não a oculta. A honestidade do
runner ao declarar a ressalva é registrada como boa prática de assurance.

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
varredura do mesmo antipadrão (`try/catch` sem asserção) na suíte inteira,
recomendada pelo finding original.

---

## Quadro de triagem

| ID | Origem | Classificação | Severidade prelim. | Estado | Encaminhamento |
|---|---|---|---|---|---|
| OBS-SIM-002-001 | WAVE-A `f0aaa7a` | candidato a novo finding | LOW (gatilho → MEDIUM) | **ABERTA** | delta audit — database / data-integrity |
| OBS-SIM-002-002 | WAVE-B `9f7b056` | candidato a novo finding, bloqueado | MEDIUM | **ABERTA** | human gate único com FIND-008-A |
| OBS-SIM-002-003 | WAVE-C `9ce4754` | observação residual dependente | MEDIUM | **ABERTA** | reavaliar após decisão de FIND-004 |
| OBS-SIM-002-004 | WAVE-C `9ce4754` | INFO / limitação metodológica | INFO | **ABERTA** | método do delta audit |
| OBS-SIM-002-005 | WAVE-A `f0aaa7a` | backlog de assurance | INFO | **ABERTA** | próxima rodada de assurance |

Nenhuma observação deste arquivo está fechada. Nenhuma foi validada pelo
`vericore-finding-validator`. Nenhuma autoriza, por si só, alteração de código —
a VeriCore não corrige (Regra 2).
