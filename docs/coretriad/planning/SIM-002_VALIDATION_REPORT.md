# SIM-002_VALIDATION_REPORT

**Projeto:** SIM-002 "PagaFácil" — cadastro e aprovação de fornecedores com
pagamento (Node.js + `node:sqlite`, banco real, zero dependências).
**Data:** 2026-08-13 · **AUDIT_COMMIT:** `f2fcf1c78a6a1255738d05e66a6100fa9c47428a`
**Auditoria:** SIM-002-AUD-001 · **Gabarito:** `coretriad/locks/SIM-002-answer-key.md`
(criado ANTES da auditoria, selado por enforcement).

---

## 1. O selo do gabarito — e por que ele importa

Um simulado cujo gabarito é legível pelo auditor não mede capacidade de detecção
nenhuma. Antes de construir o SIM-002, o hook foi estendido para bloquear
**qualquer acesso de subagente ao gabarito, por qualquer ferramenta**.

Isso não saiu de primeira, e o processo de endurecê-lo é parte do resultado:

| Rodada | O que aconteceu |
|---|---|
| v1 | Selo por nome de arquivo. `TEST-SEAL-001` (`vericore-qa-auditor`) bloqueou Read e Glob — e **reportou três brechas sem explorá-las**: um `Grep` com `path=coretriad/locks/` e padrão genérico não continha a substring `answer-key` e passaria; `cat coretriad/locks/*.md` idem; e qualquer gabarito futuro com outro nome ficaria desprotegido. |
| v2 | Selo passou a cobrir o **diretório**, com inspeção recursiva do `tool_input`. Os 6 vetores de bypass foram revalidados como bloqueados. `TEST-SEAL-002` (`audit-verification-runner`, que tem Bash) confirmou bloqueio em `cat` literal, `cat` com curinga, `ls -la` do diretório e `Grep` por conteúdo — sem vazar nem o nome do arquivo — com controle negativo passando (`ls product/` funcionou normalmente). |
| v3 | Falso positivo encontrado **em produção do próprio ciclo**: o `finding-validator` e o `sanacore-remediation-engineer` tiveram gravações negadas porque o **texto** dos seus documentos citava o caminho selado. Campos de conteúdo saíram da inspeção; campos de acesso continuam cobertos. |

**O selo se manteve durante todo o ciclo.** O `vericore-traceability-auditor`
registrou espontaneamente no seu relatório que não leu o gabarito "porque
destruiria a independência da trilha".

---

## 2. Detecção — 8 de 8 classes de defeito, sem aviso prévio

Nenhum dos 8 auditores foi informado de quais defeitos existiam, **nem de
quantos**. Cada trilha recebeu apenas o escopo `product/SIM-002/` e o mandato
da sua especialidade.

| # | Classe plantada (gabarito) | Detectada? | Finding | Nº de trilhas independentes |
|---|---|---|---|---|
| D1 | Regra de negócio divergente: alçada do analista em 50000 contra R$ 10.000 da BR-APR-001 | **Sim** | FIND-002-001 (CRITICAL) | 6 |
| D2 | Comportamento sem requisito: `cancelPayment` reverte `sent`→`created` | **Sim** | FIND-002-004 (CRITICAL) | 7 |
| D3 | Bug de autorização (IDOR): `listPaymentsBySupplier` sem filtro de tenant | **Sim** | FIND-002-002 (CRITICAL) | 6 |
| D4 | Constraint ausente: `suppliers.cnpj` sem UNIQUE, contra o dicionário | **Sim** | FIND-002-005 (HIGH) | 6 |
| D5 | Transação/concorrência: teto de crédito por read-modify-write sem transação | **Sim** | FIND-002-006 (HIGH) | 4 |
| D6 | Integração sem idempotência: `sendPayment` reenvia ao gateway | **Sim** | FIND-002-003 (CRITICAL) | **8 (todas)** |
| D7 | Teste falso-positivo: TC-SIM2-003b com `try/catch` sem asserção | **Sim** | FIND-002-007 (HIGH) | 6 |
| D8 | Documentação desatualizada: `docs/API.md` com papel e status errados | **Sim** | FIND-002-008 | 5 |

**8/8. Zero falsos negativos.**

O defeito mais sutil (D7, o teste que passa sem validar) foi pego por 6 trilhas
independentes, e o `qa-auditor` demonstrou-o por raciocínio de mutação teste a
teste: *"se o código fizesse X errado, este teste falharia? SIM/NÃO — por quê"*.
Concluiu que a suíte 12/12 verde passaria **integralmente** mesmo se
`sendPayment` disparasse 100 movimentações por pagamento, se o teto fosse
ignorado e se CNPJs duplicassem livremente.

### Achados legítimos NÃO plantados (capacidade acima do exigido)

Cinco findings adicionais, todos confirmados com evidência arquivo+linha:
`sendPayment` marcando `sent` mesmo com recusa do gateway; *lost update* na
aprovação por check-then-act sem CAS; `createSupplier` sem sujeito permitindo
cadastro em empresa alheia; schema sem `CHECK` de domínio, sem `updated_at` e
com `company_id` denormalizado sem FK composta; e um bloco de lacunas de
fronteira, mensagens de erro divergentes e índices ausentes.

**Falsos positivos: zero.** O `finding-validator` examinou os 9 CRITICAL/HIGH e
não descartou nenhum — mas também não homologou nenhum de graça (ver §3).

---

## 3. Validação adversarial — o validator contestou, não homologou

| Ação do validator | Resultado |
|---|---|
| Buscou controle compensatório em todas as camadas (middleware, DDL, guarda do chamador, dedup do gateway, cobertura de teste) | Encontrou **um só**, e ele derrubou uma severidade |
| FIND-008 (papel `manager` × `analyst`) | **HIGH → MEDIUM.** Nenhuma BR arbitra o papel; é contradição documental, não defeito de autorização provado. Gravou cláusula de re-elevação se a decisão humana disser `manager` |
| FIND-009 (`sent` com gateway recusando) | **HIGH → MEDIUM.** O ramo é inalcançável no AUDIT_COMMIT — o stub sempre aceita; manifestar o defeito exigiria modificar o objeto auditado |
| FIND-006 (corrida no teto de crédito) | **Manteve HIGH** com análise própria: `createPayment` é `async` com `await` entre leitura e escrita, logo a intercalação ocorre em processo único pela fila de microtarefas |
| Mesma alegação no FIND-009 | **Rebaixou**: os dois `db.run` são síncronos e adjacentes, sem ponto de intercalação |
| Bloqueou por human gate | FIND-004, divergência A do 008, e 009 — nenhum seguiu para remediação |

A distinção entre FIND-006 (corrida real) e FIND-009 (corrida alegada mas
impossível) é o tipo de discriminação que separa auditoria de checklist.

---

## 4. Remediação e reteste independente

Três ondas em worktrees git isolados, agrupadas por família de causa-raiz.

| Onda | Findings | Commit | Suíte |
|---|---|---|---|
| WAVE-A (regras e evidência de teste) | 001, 007, 008-B | `f0aaa7a` | 20/20 |
| WAVE-B (isolamento) | 002, 011 | `9f7b056` | 17/17 |
| WAVE-C (integridade e idempotência) | 003, 005, 006 | `9ce4754` | 22/22 |

Os retestes foram feitos com scripts próprios **fora do repositório**, relendo o
estado direto do banco em vez de confiar no retorno das funções. O reteste da
WAVE-B foi o padrão-ouro: extraiu o código original do `AUDIT_COMMIT` via
`git show` e rodou o **mesmo harness** nos dois lados — provando que o vazamento
existia (2 pagamentos da empresa A entregues à empresa B) e deixou de existir,
com as mensagens de erro agora indistinguíveis para "fornecedor alheio" e
"fornecedor inexistente" (sem oráculo de existência).

Duas ondas fizeram *mutation testing* dos próprios testes sem que isso fosse
pedido: a WAVE-B usou `git stash` só no `src/` e confirmou 4 falhas; a WAVE-C
verificou que 7 dos 10 testes novos falham contra o `AUDIT_COMMIT`.

### A ressalva do FIND-003 e o julgamento do diretor

O reteste da WAVE-C mediu algo que a SanaCore não havia relatado: no caminho
enviar→**cancelar**→enviar, o curto-circuito **do serviço** não age (o status
volta a `created`), e `submitPayment` é de fato invocado a cada reenvio — quem
impede a duplicação é apenas a dedup **dentro do gateway**. O resultado
observável cumpre a BR (1 movimentação, 1 tentativa), mas `sent_at` fica
instável e a defesa em profundidade desapareceu.

O `software-audit-director` decidiu **RETEST_PASSED com finding residual**, com
quatro razões registradas — entre elas que a BR-PAY-002 é escrita em termos de
resultado, e exigir que a proteção resida no serviço seria inventar requisito de
desenho. Registrou explicitamente que **o pacote de evidência da SanaCore
descreveu a proteção de forma mais forte que o comportamento medido**, sem
imputação de má-fé e sem efeito no veredito. Também registrou que o teste de
concorrência do FIND-006 não distingue "corrigido" de "não observável neste
modelo", por isso o fechamento repousa na verificação estrutural da transação,
não no teste dinâmico.

---

## 4-B. Segunda rodada — human gates destravados e integração (WAVE-D)

Em 2026-08-13 o responsável humano registrou as decisões que faltavam
(`APR-2026-007/008/009`), criando as regras de negócio ausentes que impediam a
remediação. A SanaCore executou a **WAVE-D**, que integrou as três ondas
anteriores e remediou os três findings destravados. REMEDIATION_COMMIT
`b6d44da`; suíte **49/49**.

### O merge escondia um defeito que teria enterrado duas correções

WAVE-B (isolamento de tenant) e WAVE-C (integridade transacional) conflitaram
nos mesmos serviços. A WAVE-B tornara `loadApprovedSupplier` assíncrona; a
WAVE-C passou a chamá-la **dentro** de `db.transaction()`, que rejeita bloco
assíncrono. Combinadas sem cuidado, a função devolveria uma Promise:
`supplier.status` viraria `undefined` — a checagem de fornecedor aprovado nunca
dispararia — e o `INSERT` gravaria `company_id` `undefined`. **As duas correções
se perderiam ao mesmo tempo, silenciosamente.** A SanaCore detectou na
resolução do conflito e tornou a função síncrona.

### As três remediações, retestadas com antes/depois

| Finding | O que mudou | Reteste independente |
|---|---|---|
| FIND-004 (`cancelPayment`) | Transição `sent→created` removida; só `created` cancela; operação ganhou sujeito e tenant | Cancelar `sent` → RECUSADO, status permanece `sent`. **Antes**: revertia para `created`, zerava `sent_at` e mantinha `external_ref` |
| FIND-008-A + OBS-002 (papéis) | Tabela `users` + módulo `identity.js`: papel e empresa resolvidos **do banco** pelo `user.id`, descartando o que o payload declara. Escrita = `manager`, leitura = `analyst`+`manager` | **Teste decisivo**: payload com `role:'manager'` falso, cujo registro em `users` diz `analyst` → RECUSADO nas duas escritas. `grep` confirma que `user.role`/`user.companyId` não são mais lidos do payload |
| FIND-009 (recusa do gateway) | Estado `failed` no domínio, com `CHECK` no DDL; gateway injetável para tornar a recusa exercitável | Gateway recusando → `status:"failed"`, sem `external_ref`/`sent_at`. **Antes**: ficava `sent` mesmo recusado |

Não-regressão da integração reconfirmada no código integrado: isolamento de
tenant (B), idempotência (C), CNPJ único global (C) e alçada `analyst`=10000 (A).
**Nenhum item do reteste falhou.**

### O diretor re-elevou severidades antes de fechar

Duas cláusulas de re-elevação deixadas pelo `finding-validator` foram acionadas
**antes** do julgamento, para que o fechamento recaísse sobre a severidade
correta e não sobre a conveniente: FIND-008 e FIND-009 voltaram de MEDIUM para
**HIGH** e só então foram fechados. FIND-008 fechou **integralmente** porque seu
único obstáculo declarado — ausência de árbitro normativo — cessou com a
APR-2026-008, e o código convergiu **para a norma**, não o contrário.

Uma observação foi **extinta por perda de objeto**: com a recusa de cancelar
pagamento `sent`, o caminho enviar→cancelar→enviar deixou de existir, e a defesa
da BR-PAY-002 deixou de repousar sobre a dedup do gateway não auditável — o
residual do FIND-003 desapareceu como consequência da correção do FIND-004.

### Um novo finding nasceu da própria remediação

A SanaCore declarou espontaneamente um risco residual que não podia corrigir:
**`approveSupplier` ainda decide alçada por `approver.role` autodeclarado.** A
APR-2026-008 cobriu criar/enviar/ler pagamento, mas não a alçada de *aprovação*,
e estender a decisão sozinha violaria a Regra 6. O diretor formalizou como
**FIND-SIM-002-014 (HIGH)** e verificou que é defeito **do objeto auditado**, não
de commit posterior.

A dosagem da severidade foi argumentada nos dois sentidos: não CRITICAL porque a
própria Regra 24 traz a ressalva para simulados e o SIM-002 não tem transporte,
autenticação nem dado real; não MEDIUM porque o papel forjado **anula na prática**
o controle fechado como CRITICAL no FIND-001, não há lacuna normativa atenuante
(existem Regra 24 *e* APR-2026-008 para este mesmo produto) e o `paymentService`
já provou a viabilidade da correção. Ficaram registradas cláusulas simétricas de
elevação e de rebaixamento, para não enviesar o `finding-validator`.

O diretor também assumiu uma **lacuna de cobertura do próprio run**: a coverage
matrix declarava ter coberto "todos os pontos de decisão de papel" citando
exatamente essas linhas — a trilha as leu, pegou o valor errado da alçada e não
questionou a **procedência** do papel.

---

## 5. Estado final e o que continua aberto

**10 findings CLOSED de 14** (001, 002, 003, 004, 005, 006, 007, 008, 009, 011)
· **nenhum CRITICAL aberto** · **4 abertos**: FIND-014 (HIGH, novo), FIND-010 e
FIND-012 (MEDIUM), FIND-013 (LOW).

O diretor **manteve a recusa de `AUDIT_PASSED`**, agora com dois fundamentos
independentes e cada um suficiente sozinho:

1. **Há finding HIGH aberto sobre o próprio objeto auditado** (FIND-014), não
   validado, não decidido e não remediado — e que **condiciona a eficácia
   prática de dois fechamentos deste mesmo run**: FIND-001 (alçada) e FIND-008
   (papéis) pressupõem papel confiável. A APR-2026-005 aceitou risco análogo
   **restrito ao SIM-001** e diz que não se estende; a APR-2026-008 mandou
   **implementar** no SIM-002, não aceitar. Estender por analogia é o que a
   Regra 6 proíbe.
2. **O estado aprovável não é o estado auditado.** As correções vivem em quatro
   commits posteriores ao `AUDIT_COMMIT`. Aprovar `f2fcf1c` seria aprovar o
   estado com os 13 findings; aprovar `b6d44da` seria aprovar um commit nunca
   auditado. Regras 12–14: exige **delta audit**.

O diretor registrou também o que a decisão **não** significa: não é reprovação
da SanaCore — os cinco retestes passaram, e foi a própria SanaCore quem declarou
o risco residual que virou o FIND-014, recusando-se a extrapolar decisão humana.
E não impede o fechamento do SIM-002 **como ciclo de validação**.

**Condições exaustivas para `AUDIT_PASSED`**, conforme registrado: (a) FIND-014
validado e remediado **ou** com risco aceito registrado; (b) registro formal de
010/012/013 em `APPROVALS.md` — **feito**, `APR-2026-010`; (c) delta audit sobre
`b6d44da` com nova matriz que exija **procedência** de atributos de autorização;
(d) disposição das observações abertas.

**Human gates abertos, para decisão sua** (o diretor recomenda ato único, para
não repetir a fragmentação normativa que a APR-2026-008 corrigiu):

| Item | Decisão necessária |
|---|---|
| **FIND-014** — alçada de `approveSupplier` | Estender a APR-2026-008 à aprovação (papel do banco também aqui), ou aceitar o risco restrito ao SIM-002 e registrar? |
| **OBS-007** — papel de `cancelPayment` | Quem pode cancelar um pagamento `created`? Hoje `analyst`+`manager`, não arbitrado |
| **OBS-008-c** — retentativa de `failed` | Existe limite de retentativa para pagamento recusado pelo gateway? |

---

## 6. Critério de aprovação do SIM-002

| Critério (skill `/coretriad-sim002`) | Resultado |
|---|---|
| **8/8 classes detectadas** | **ATENDIDO** — 8/8, por múltiplas trilhas independentes, sem acesso ao gabarito e sem saber quantas eram. Zero falsos negativos |
| **Findings validados** | **ATENDIDO** — validator adversarial buscou refutação em todas as camadas; 0 falsos positivos; 2 severidades rebaixadas com justificativa e depois re-elevadas antes do fechamento |
| **Remediações retestadas** | **ATENDIDO** — 5 retestes independentes com scripts fora do repositório; o código original foi extraído do `AUDIT_COMMIT` e rodado no mesmo harness para provar o antes/depois |
| **Remediações fechadas pela VeriCore** | **ATENDIDO** — **as 8 classes plantadas estão CLOSED** (10 de 14 findings, nenhum CRITICAL aberto) |

**Os quatro critérios da skill estão atendidos.** As 8 classes de defeito
plantadas foram detectadas, validadas, remediadas, retestadas de forma
independente e fechadas pela autoridade correta.

O que permanece aberto **não pertence à matriz de defeitos plantados**: é um
finding HIGH (FIND-014) que o próprio ciclo descobriu durante a remediação, mais
três pendências que você declarou não bloqueantes (`APR-2026-010`).

---

## 7. Conclusão e a declaração pendente

O CoreTriad demonstrou, sobre um produto realista com banco de dados real:
detectou 8/8 defeitos plantados sem qualquer aviso; encontrou 5 defeitos
legítimos que ninguém plantou; não produziu nenhum falso positivo; contestou as
próprias severidades em vez de homologá-las; remediou em isolamento e retestou
reproduzindo o bug original de forma independente; recusou-se a fechar o que
depende de decisão humana; e recusou-se a declarar `AUDIT_PASSED` com finding
CRITICAL aberto.

Além disso, o próprio ciclo encontrou e corrigiu **três defeitos no CoreTriad**
(as três rodadas de endurecimento do selo em §1) — dois deles reportados por um
agente auditor que tinha a oportunidade de explorá-los e não o fez.

**`CORETRIAD OPERATIONALLY VALIDATED` NÃO é declarado por este relatório.** A
declaração é decisão humana (Regra 18). Os dois lados, para sua decisão:

- **A favor:** os **quatro critérios da skill estão atendidos**; as 8 classes
  plantadas estão fechadas; nenhum CRITICAL aberto; o modelo demonstrou as
  quatro propriedades que a Parte VII exige — detectar sem aviso, refutar antes
  de confirmar, pegar remediação insuficiente, e impedir que quem corrige feche.
- **Contra:** o run `SIM-002-AUD-001` **não é `AUDIT_PASSED`**. Há um finding
  HIGH aberto (FIND-014) que condiciona a eficácia prática de dois fechamentos
  deste mesmo run, e o estado corrigido (`b6d44da`) nunca foi auditado —
  exigindo delta audit pelas Regras 12–14.

**A distinção que importa:** `AUDIT_PASSED` é veredito sobre **o produto
SIM-002**; `CORETRIAD OPERATIONALLY VALIDATED` é veredito sobre **a máquina que
o auditou**. Um produto simulado reprovado por um sistema que o auditou
corretamente é evidência *a favor* da máquina, não contra ela — foi o próprio
CoreTriad que recusou aprovar o que não podia.

Se você decidir declarar, o próximo passo é o **programa `ERP-LEGACY-001`**
(Parte VIII do Master Spec): onboarding formal do ERP existente, baseline
imutável com tag, snapshot técnico, arquitetura AS-IS, regras descobertas,
requisitos recuperados, testes de caracterização e só então a auditoria 360°.
A Regra 24 criada no ciclo anterior (papel autodeclarado = CRITICAL bloqueante)
já está valendo para essa auditoria.

**PARAR para decisão humana.**
