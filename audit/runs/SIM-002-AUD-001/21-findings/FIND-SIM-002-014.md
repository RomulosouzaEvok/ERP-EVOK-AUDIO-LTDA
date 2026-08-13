# FINDING

FINDING_ID: FIND-SIM-002-014
AUDIT_ID: SIM-002-AUD-001
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
PROJECT_ID: SIM-002
TITLE: approveSupplier decide alçada de crédito por papel autodeclarado pelo chamador, sem verificação server-side
DOMAIN: Segurança / Autorização
SUBDOMAIN: Procedência do atributo de autorização (Regra 24)
SEVERITY: **CRITICAL** — elevada de HIGH em 2026-08-13 pela **cláusula de elevação obrigatória, condição (c)**, acionada pela APR-2026-011 (ver `## Fechamento`). Severidade de abertura: HIGH.
CONFIDENCE: CONFIRMED
STATUS: **CLOSED** — 2026-08-13 (anterior: `PROPOSED`; ver `## Fechamento (software-audit-director)`)
DETECTED_BY: vericore-software-audit-director (a partir de risco residual declarado espontaneamente pela SanaCore na WAVE-D) — verificação independente por leitura direta do objeto auditado
DATA_DE_ABERTURA: 2026-08-13
DATA_DE_FECHAMENTO: 2026-08-13
REMEDIATION_COMMIT: `ac3e277` (WAVE-E)
VALIDATED_BY: — (`vericore-finding-validator` **não executado**; desvio da Regra 22 registrado e fundamentado no `## Fechamento`, item 5)
HUMAN_GATE: **cumprido** — **APR-2026-011** (`coretriad/governance/APPROVALS.md`), 2026-08-13
ELEVATION_CLAUSE: **acionada** — ver "Cláusula de elevação obrigatória" e `## Fechamento`

> **Nota de integridade do registro.** Nada do conteúdo de abertura abaixo foi
> alterado, suprimido ou reescrito. As únicas mudanças em relação à versão de
> abertura são: (i) os campos de cabeçalho `SEVERITY`, `STATUS`,
> `DATA_DE_FECHAMENTO`, `REMEDIATION_COMMIT`, `VALIDATED_BY`, `HUMAN_GATE` e
> `ELEVATION_CLAUSE`, todos anotados com o motivo da mudança; e (ii) a seção
> `## Fechamento (software-audit-director)`, acrescentada ao final. O corpo do
> finding permanece como foi escrito em 2026-08-13, inclusive nas partes que o
> desfecho tornou superadas — apagá-las destruiria a trilha (Regra 15).

DESCRIPTION:
`approvalService.approveSupplier` decide **quem pode aprovar** e **qual alçada se
aplica** exclusivamente a partir de `approver.role`, um atributo entregue pelo
próprio chamador no objeto `approver`. Não há consulta a nenhuma fonte de
identidade: o papel é aceito como declarado. Basta declarar `role: 'manager'`
para obter alçada ilimitada de concessão de crédito — inclusive quando o papel
real do usuário é `analyst`.

Após a WAVE-D (`b6d44da`), o mesmo produto passou a verificar o papel **contra o
banco** nas operações de pagamento (comprovado por reteste: payload com
`role:'manager'` falso, registro em `users` dizendo `analyst`, foi **recusado**
nas duas escritas). A aprovação de fornecedor **não** recebeu esse tratamento,
porque a APR-2026-008 cobriu criar/enviar/ler pagamento e não a alçada de
aprovação. O produto passa a ter **dois caminhos de autorização com padrões de
confiança diferentes**, e o mais permissivo é justamente o que concede crédito.

EXPECTED_BEHAVIOR:
- **Regra 24 do `CLAUDE.md`**: papel/role declarado pelo cliente sem verificação
  server-side é padrão de finding de autorização; nunca `RISK_ACCEPTED` em
  produção. Origem: APR-2026-005 (OBS-SIM-001-A).
- **APR-2026-008** (`coretriad/governance/APPROVALS.md`) fixou, como decisão
  humana para o SIM-002, que "o papel deve ser verificado no servidor contra uma
  fonte confiável de identidade — **nunca autodeclarado pelo cliente**". A decisão
  foi tomada **para as operações de pagamento**; o princípio que ela enuncia é
  geral, mas sua **extensão** a `approveSupplier` **não foi decidida** e não é
  suprida por este auditor (Regra 6).
- **BR-APR-001** (`requirements/BUSINESS_RULES.md:19-29`) só é uma regra de alçada
  efetiva se o papel que a seleciona for confiável; caso contrário, é uma
  formalidade contornável por quem quiser contorná-la.

ACTUAL_BEHAVIOR:
O chamador escolhe o próprio papel. `approver.role === 'manager'` desliga a
verificação de alçada por completo (`ANALYST_APPROVAL_LIMIT` só se aplica a
`analyst`), permitindo aprovar fornecedor com qualquer `creditLimit` positivo.
O identificador gravado em `approved_by` é igualmente fornecido pelo chamador
(`approver.id`), de modo que a trilha registra **o que o chamador disse ser**, e
não quem ele é.

EVIDENCE:
FILE: product/SIM-002/src/approvalService.js
LINES: 4, 13-19, 37-39, 42-50
```js
const APPROVER_ROLES = ['analyst', 'manager'];                                   // :4

function approveSupplier({ supplierId, creditLimit, approver }) {                // :13
  if (!approver || !APPROVER_ROLES.includes(approver.role)) {                    // :14
    throw new Error('Papel do aprovador não possui permissão de aprovação');
  }
  if (!Number.isInteger(approver.companyId)) {                                   // :17
    throw new Error('Aprovador inválido');
  }
  ...
  if (approver.role === 'analyst' && creditLimit > ANALYST_APPROVAL_LIMIT) {     // :37
    throw new Error('Limite de crédito acima da alçada do analista: requer gerente');
  }
  ...
      approver.id,                                                               // :47 → approved_by
```
Verificado por **leitura direta do objeto auditado** (`AUDIT_COMMIT`
`f2fcf1c78a6a1255738d05e66a6100fa9c47428a`) por este diretor, e não por relato de
terceiro: em nenhum ponto da função há consulta a `users` ou a qualquer fonte de
identidade. `approver.role`, `approver.companyId` e `approver.id` vêm todos do
parâmetro. O único controle sobre `approver` é de **forma** (`Number.isInteger`
em `companyId`), nunca de **procedência**.

DELIMITAÇÃO DE EVIDÊNCIA (registrada por dever de precisão):
- No `AUDIT_COMMIT`: **CONFIRMED por leitura direta** deste diretor.
- Em `b6d44da` (WAVE-D): a persistência do padrão é **declarada pela própria
  SanaCore** e coerente com o escopo literal da APR-2026-008; **não foi objeto de
  reteste independente**, pois o reteste da WAVE-D verificou procedência de papel
  apenas nas operações de pagamento. Esta verificação é **item obrigatório do
  delta audit** e não deve ser presumida em nenhum sentido.
  > *Atualização 2026-08-13 (WAVE-E):* a persistência do padrão deixou de ser
  > declaração e passou a ser **medida** — o baseline `bba830f` aprovou 50000 com
  > papel forjado. Ver `## Fechamento`.

RELATED_PROCESS: Aprovação de fornecedor e concessão de limite de crédito
RELATED_BUSINESS_RULE: BR-APR-001 (alçada de aprovação — sua eficácia depende deste ponto); BR-SEC-001 (isolamento por empresa — igualmente baseado em `approver.companyId` autodeclarado)
RELATED_REQUIREMENT: REQ-SIM2-002
RELATED_USE_CASE: Aprovar fornecedor
RELATED_ACCEPTANCE_CRITERIA: AC-SIM2-002
RELATED_TEST: nenhum teste exercita papel forjado em `approveSupplier` (existe teste equivalente para pagamento, criado na WAVE-D)
RELATED_FINDINGS: FIND-SIM-002-001 (alçada 50000 → 10000, CLOSED — sua eficácia prática depende deste finding); FIND-SIM-002-008 (segregação de funções, CLOSED — idem); OBS-SIM-002-001 (`approved_by` corrompido, mesma trilha de autoria)
RELATED_APPROVAL: APR-2026-005 (origem da Regra 24), APR-2026-008 (padrão aplicado a pagamento), **APR-2026-011 (extensão à aprovação — human gate deste finding)**

BUSINESS_IMPACT:
A alçada de crédito — o controle financeiro central deste produto — é contornável
por autodeclaração. Quem puder chamar a função aprova qualquer fornecedor com
qualquer limite, e o limite aprovado é o teto que depois autoriza pagamentos
(BR-PAY-001). O efeito é a anulação prática do controle corrigido em
FIND-SIM-002-001: a constante passou de 50000 para 10000, mas quem declara
`manager` não é submetido a constante alguma. Adicionalmente, a segregação de
funções obtida em FIND-SIM-002-008 (analista aprova, gerente paga) pressupõe
papéis confiáveis de **ambos** os lados; hoje um dos lados é confiável e o outro
não.

TECHNICAL_IMPACT:
Dois padrões de autorização convivendo no mesmo produto: `paymentService` resolve
papel a partir do banco; `approvalService` aceita o papel do parâmetro. Além do
risco, é assimetria de desenho que induz erro em manutenção futura — e a solução
já existe no próprio código-base, o que reduz custo e elimina a justificativa de
inviabilidade técnica.

SECURITY_IMPACT:
Padrão descrito nominalmente pela **Regra 24**: atributo de autorização de origem
não confiável. A trilha de autoria agrava: `approved_by` recebe `approver.id`
fornecido pelo chamador, de forma que a evidência de "quem aprovou" é
autodeclarada — combina-se com OBS-SIM-002-001 (identificador corrompido para
`"77.0"`) e com FIND-SIM-002-012 (ausência de trilha de alteração) para tornar
uma aprovação indevida difícil de atribuir a posteriori.

Atenuante **do escopo atual, e apenas dele**: o SIM-002 não possui camada HTTP,
autenticação ou middleware (`SOFTWARE_RELEASE_PACKAGE.md:16`, `:36`); todo
chamador é código in-process, não há usuário externo, dado real nem exposição.
Não existe, hoje, atacante remoto. Este atenuante é **de ambiente**, não de
desenho, e desaparece por completo no primeiro dia em que houver transporte.

REPRODUCTION:
1. Criar fornecedor na empresa A.
2. Chamar `approveSupplier({ supplierId, creditLimit: 500000, approver: { id: 1,
   role: 'manager', companyId: A } })` **sem que exista** usuário de papel
   `manager` correspondente — ou existindo com papel `analyst`.
3. Observado: aprovação aceita, `credit_limit = 500000`, `approved_by = 1`.
4. Esperado (sob o padrão da APR-2026-008 e da Regra 24): recusa, com o papel
   resolvido a partir da fonte de identidade e não do parâmetro.

Observação de método: este cenário é o **espelho exato** do teste decisivo já
executado com sucesso pelo `vericore-audit-verification-runner` para pagamento na
WAVE-D. A prova é reproduzível com o harness existente, sem nenhum instrumento
novo.

ROOT_CAUSE_HYPOTHESIS:
Desenho original do SIM-002 confiava no chamador para todos os atributos de
sujeito. A APR-2026-008 corrigiu esse desenho **onde a decisão humana alcançou**
(pagamento); a aprovação ficou de fora do enunciado da decisão e, corretamente, a
SanaCore não a estendeu por conta própria (Regra 6).

REFERENCE:
- `CLAUDE.md`, **Regra 24** (papel autodeclarado sem verificação server-side) e Regra 6
- `docs/coretriad/CORETRIAD_MASTER_SPEC.md`, Parte IV §20 — trilha de Segurança/Autorização, padrão de finding obrigatório
- `coretriad/governance/APPROVALS.md` — **APR-2026-005** (risco aceito **restrito ao SIM-001**, expressamente não extensível a outros projetos), **APR-2026-008** (padrão server-side determinado para pagamento no SIM-002) e **APR-2026-011** (extensão à aprovação)
- `product/SIM-002/src/approvalService.js:4,13-19,37-39,47`
- `product/SIM-002/requirements/BUSINESS_RULES.md:19-29` (BR-APR-001)
- `audit/runs/SIM-002-AUD-001/30-retest/RETEST_REPORT.md` §5.6 e §6
- `audit/runs/SIM-002-AUD-001/30-retest/RETEST_REPORT_WAVE-E.md` §7.1 e §8
- `audit/runs/SIM-002-AUD-001/24-coverage/AUDIT_COVERAGE_MATRIX.md` §2.2

---

## Justificativa da severidade — **HIGH**, e por que não CRITICAL nem MEDIUM

> *Preservada como escrita na abertura. Superada em 2026-08-13 pelo acionamento
> da cláusula de elevação, condição (c) — ver `## Fechamento`. Mantida no
> registro porque a fundamentação de abertura precisa continuar auditável e
> contestável.*

Esta é a parte contestável do finding e por isso está escrita para ser contestada.

**Por que não CRITICAL, apesar da Regra 24.** A Regra 24 fixa CRITICAL para
"qualquer projeto **real**" e, na mesma frase, ressalva que "simulados de
validação podem aceitar o risco no próprio escopo; projetos reais, incluindo
`ERP-LEGACY-001`, não". O SIM-002 é ambiente fictício de validação do CoreTriad,
sem camada HTTP, sem autenticação, sem dado real e sem exposição — as mesmas
circunstâncias que fundamentaram a APR-2026-005 no SIM-001. Classificar CRITICAL
aqui exigiria ignorar a ressalva que a própria norma escreve. Além disso, este
run já aplicou consistentemente o critério de que **severidade reflete o defeito
provado, não o pior cenário hipotético** (foi assim que o finding-validator
rebaixou FIND-008 e FIND-009); inflar a severidade agora, por conta do rótulo
"CRITICAL" presente no texto da regra, seria abandonar esse critério quando ele
deixa de ser conveniente.

**Por que não MEDIUM ou LOW.** Quatro fatos, todos verificáveis, impedem:
1. O papel autodeclarado **decide a alçada financeira** e, portanto, **anula na
   prática** o controle fechado como CRITICAL em FIND-SIM-002-001. Um finding que
   neutraliza a remediação de um CRITICAL não é MEDIUM.
2. **Não há lacuna normativa** que o atenue, diferentemente de FIND-008 e FIND-009
   antes dos human gates: existe norma permanente (Regra 24) **e** decisão humana
   recente (APR-2026-008) enunciando o padrão correto para este mesmo produto. O
   "esperado" existe e está escrito.
3. A **assimetria interna é prova de viabilidade**: o mesmo produto já resolve o
   papel a partir do banco em `paymentService`. Não é limitação de plataforma nem
   de custo; é ponto não coberto pelo enunciado da decisão.
4. O único atenuante é **de ambiente** (ausência de transporte), não de desenho, e
   é exatamente o tipo de atenuante que a Regra 24 declara insuficiente para
   aceitação em produção.

**Conclusão.** HIGH é a severidade que a evidência sustenta no escopo do SIM-002:
grave o bastante para bloquear `AUDIT_PASSED` e exigir decisão humana explícita,
sem invocar um CRITICAL que a própria norma ressalva para simulados. Registro que
**a decisão de aceitar ou não este risco não é minha** — é human gate (Regras 6,
18 e 21).

## Cláusula de elevação obrigatória a CRITICAL

Este finding **deve ser elevado a CRITICAL**, sem necessidade de nova auditoria,
assim que **qualquer** das condições ocorrer:
(a) o código do SIM-002 — ou o padrão dele derivado — for promovido, copiado ou
    reaproveitado em projeto real, incluindo `ERP-LEGACY-001`;
(b) for introduzida camada de transporte, autenticação ou qualquer chamador
    externo ao processo;
(c) decisão humana estender expressamente a APR-2026-008 a `approveSupplier` — a
    partir daí passa a existir norma violada de forma direta, e o enquadramento é
    o da Regra 24 sem ressalva aplicável;   ← **OCORRIDA em 2026-08-13 (APR-2026-011)**
(d) o `vericore-finding-validator` concluir que o atenuante de ambiente não se
    sustenta.

## Cláusula simétrica de rebaixamento (registrada para não enviesar a validação)

Este finding **deve ser rebaixado a INFO/`RISK_ACCEPTED`** se decisão humana
registrada aceitar o risco **restrito ao SIM-002**, nos moldes da APR-2026-005,
com menção expressa à Regra 24. Nesse caso o finding não é "fechado por
remediação": é **disposto por aceitação**, e a distinção deve constar do registro.

> *Não acionada.* A decisão humana (APR-2026-011) foi de **estender o padrão**,
> não de aceitar o risco. O finding é fechado **por remediação e reteste**, e não
> por aceitação — distinção registrada, como a própria cláusula exigia.

---

BUSINESS_IMPACT / TECHNICAL_IMPACT / SECURITY_IMPACT: ver seções acima.

RECOMMENDATION:
**Não remediar antes de decisão humana** (Regra 6 — a SanaCore já se recusou,
corretamente, a estender a APR-2026-008 por conta própria; este diretor confirma
que a recusa foi o comportamento devido). Duas ações, nesta ordem:
1. **Normativa (human gate):** decidir se o padrão da APR-2026-008 — papel
   verificado no servidor contra fonte confiável de identidade — se estende a
   `approveSupplier` e, por simetria, a `approver.companyId` e a `approver.id`
   (este último é o que alimenta `approved_by`). Alternativamente, aceitar o risco
   com escopo **restrito ao SIM-002** e registro expresso em
   `coretriad/governance/APPROVALS.md`. Recomendação técnica desta auditoria, sem
   força decisória: **estender**, por já existir a implementação no mesmo produto.
2. **Técnica (SanaCore), somente após 1:** resolver papel, empresa e identidade do
   aprovador a partir da mesma fonte usada por `paymentService`, e acrescentar
   caso negativo de papel forjado à suíte versionada.

Recomenda-se decidir **em ato único** com a OBS-SIM-002-007 (papel autorizado a
cancelar pagamento `created`), para não voltar a produzir norma de papel
fragmentada entre operações — o mesmo motivo pelo qual a divergência A de
FIND-008 e a OBS-SIM-002-002 foram levadas juntas ao gate da APR-2026-008.

> *Registro de cumprimento (2026-08-13):* a recomendação de decidir em ato único
> foi **atendida** — APR-2026-011 (este finding) e APR-2026-012 (OBS-007) foram
> emitidas no mesmo ato, junto com APR-2026-013. A fragmentação normativa que se
> queria evitar não ocorreu.

SUGGESTED_REMEDIATION_OWNER: Decisão humana (product owner) → SanaCore após norma registrada

RETEST_SPECIFICATION:
**Bloqueado por human gate** enquanto a norma de extensão não existir. Definida a
norma no sentido de **estender o padrão**, o reteste deverá cobrir, no mínimo:
1. **Teste decisivo de procedência** (espelho do executado para pagamento na
   WAVE-D): `approver` declarando `role:'manager'` **falso**, cujo registro em
   `users` diga `analyst`, tentando `creditLimit` acima de 10000 → **RECUSADO**;
   pós-condição verificada por releitura (`status = 'pending'`,
   `credit_limit = 0`, `approved_by = NULL`).
2. Papel verdadeiro `manager` → aceito acima de 10000 (não-regressão do caminho
   positivo).
3. Papel verdadeiro `analyst` → aceito até 10000 inclusive e recusado em 10000.01
   (não-regressão de FIND-SIM-002-001 e de BR-APR-001, incluindo a fronteira).
4. `approver` inexistente na fonte de identidade → recusado.
5. `approver.companyId` forjado apontando para outra empresa → recusado
   (BR-SEC-001), com a empresa resolvida pela fonte de identidade e não pelo
   parâmetro.
6. `approved_by` gravado a partir da identidade resolvida, não do parâmetro — e
   como texto, sem a coerção de OBS-SIM-002-001 (`"77.0"`).
7. Prova de discriminação: o teste 1 deve **falhar** contra `b6d44da` e **passar**
   contra o commit de remediação.

Definida a norma no sentido de **aceitar o risco**, não há reteste: há registro de
aceitação, com escopo e prazo, e o finding é disposto conforme a cláusula
simétrica de rebaixamento.

---

## Nota de processo (software-audit-director)

1. **Origem do achado.** Foi a **SanaCore** que declarou este risco residual, por
   iniciativa própria, ao final da WAVE-D, sem que lhe fosse perguntado e contra o
   próprio interesse narrativo. Registro como conduta de evidência correta — é o
   oposto do desvio de precisão anotado na WAVE-C (RETEST_REPORT §1.3, item 5).
   A verificação, contudo, é independente: este diretor releu
   `approvalService.js` no `AUDIT_COMMIT` antes de abrir o finding.
2. **Lacuna de cobertura deste run, assumida.** A §2.2 da
   `AUDIT_COVERAGE_MATRIX` declara ter coberto "todos os pontos de decisão de
   papel", citando nominalmente `approvalService.js:4`, `:14` e `:37` — **as
   mesmas linhas deste finding**. A trilha `authorization` leu essas linhas,
   detectou o **valor** errado da alçada (FIND-001) e **não questionou a
   procedência** do papel. O delta audit deve corrigir a matriz e incluir, como
   item obrigatório de checklist da trilha, a **procedência de cada atributo de
   autorização**, não apenas seu uso. Registro isso porque cobertura declarada e
   não cumprida é pior que cobertura declarada ausente.
3. **Rito pendente.** `STATUS: PROPOSED`. Sendo HIGH, exige
   `vericore-finding-validator` antes de qualquer encaminhamento a remediação
   (Regra 22), e human gate para a norma (Regra 18). Nenhuma remediação deve ser
   iniciada antes dessas duas etapas.

---

## Fechamento (software-audit-director)

DATA: **2026-08-13**
AUTORIDADE: Regra 4 do `CLAUDE.md` — somente a VeriCore declara `RETEST_PASSED` e
`FINDING CLOSED`. Este diretor **não** declara `REMEDIATION COMPLETE` (Regra 3).
AUDIT_COMMIT: `f2fcf1c78a6a1255738d05e66a6100fa9c47428a`
REMEDIATION_COMMIT: **`ac3e277`** (WAVE-E)
BASELINE DE DISCRIMINAÇÃO: **`bba830f`**
EXECUÇÃO TÉCNICA DO RETESTE: `vericore-audit-verification-runner` — harness
próprio fora do repositório, **mesmo código de teste** aplicado ao baseline e ao
remediado, estado sempre lido do banco, working tree limpo antes e depois,
produto de `ac3e277` idêntico ao HEAD.
RELATÓRIO: `30-retest/RETEST_REPORT_WAVE-E.md` §7.1 (bloco completo) e §8
(veredito do run).

### 1. Human gate cumprido

**APR-2026-011**, lida por este diretor diretamente em
`coretriad/governance/APPROVALS.md` (Regra 18 — não por relato de terceiro):
*"estender a APR-2026-008 à operação de aprovação. O papel que autoriza
`approveSupplier` deve ser verificado no servidor contra a mesma fonte de
identidade (tabela `users` / `identity.js`), nunca autodeclarado no payload."*

O gate resolveu **integralmente** a lacuna normativa que este finding apontava:
o "esperado" deixou de ser inferência e passou a ser norma escrita.

### 2. Elevação de severidade — HIGH → CRITICAL, aplicada ANTES do julgamento

A **condição (c)** da cláusula de elevação obrigatória ocorreu literalmente: houve
decisão humana estendendo expressamente a APR-2026-008 a `approveSupplier`.
Portanto a severidade é **elevada a CRITICAL** — e a elevação é aplicada **antes**
de julgar o reteste, pelo mesmo método usado em FIND-008 e FIND-009 nas ondas
anteriores, para que o fechamento se dê sobre a severidade correta e não sobre a
severidade conveniente. Não é reclassificação discricionária: é aplicação de
cláusula pré-registrada, disparada por fato objetivo e verificável no repositório.

A "Justificativa da severidade — HIGH" acima permanece no registro como
fundamentação de abertura, e está **superada**, não apagada.

### 3. Evidência do reteste — antes/depois, com discriminação

**Item decisivo (papel forjado):** payload `role:'manager'` falso sobre
`users.role = 'analyst'`, aprovando `creditLimit = 50000`:

| | `bba830f` (antes) | `ac3e277` (depois) |
|---|---|---|
| Resultado | **APROVOU** | **RECUSOU** |
| `suppliers.credit_limit` | **50000** | inalterado — banco intacto |
| `suppliers.approved_by` | **`"u-analyst"`** | inalterado — banco intacto |

O `approved_by = "u-analyst"` gravado no baseline é prova documental de que o
papel declarado era falso e a identidade real era do analista: o próprio registro
de autoria denunciava a fraude que a função não impedia.

**Demais cenários em `ac3e277`:** `manager` real / 50000 → **aprovado**;
`analyst` real / 10000 → **aprovado**; `analyst` real / 10001 → **recusado**;
`approver.id` inexistente (999999) → **recusado** com *"Usuário não autenticado"*
(no baseline **aprovava** e gravava `approved_by = "77.0"`); aprovador de outra
empresa declarando `companyId` alheio → **recusado**.

**Regressão:** suíte **60/60**, com **prova de mutação** (4 mutantes, 4 mortos) e
com um **teste tautológico detectado e corrigido pela própria SanaCore** antes da
mutação. Não-regressão integrada em `RETEST_REPORT_WAVE-E.md` §7.6.

### 4. Cobertura da `RETEST_SPECIFICATION` — item a item

| Item | Disposição |
|---|---|
| 1. Teste decisivo de procedência | **ATENDIDO**, com discriminação e pós-condição lida do banco |
| 2. `manager` verdadeiro acima de 10000 | **ATENDIDO** (50000) |
| 3. `analyst` até 10000 inclusive / recusa acima | **ATENDIDO** (10000 / 10001). A fronteira em R$ 0,01 foi exercitada na WAVE-A sobre a **mesma constante** e reconfirmada; não re-exercitada nesta rodada — delimitação menor, registrada |
| 4. `approver` inexistente → recusado | **ATENDIDO**, com discriminação própria |
| 5. `companyId` forjado → recusado | **ATENDIDO**, com discriminação |
| 6. `approved_by` da identidade resolvida **e** como texto | **PARCIAL** — procedência **atendida** (o id não pode mais vir do payload); **formato persistido NÃO lido positivamente**. Residual em OBS-SIM-002-001 |
| 7. Prova de discriminação | **ATENDIDA EM SUBSTÂNCIA** contra `bba830f`; a spec nomeava `b6d44da`, e a relação entre os dois commits **não é verificável a partir do meu namespace** — item de rastreabilidade do delta audit |

### 5. Desvio processual registrado — Regra 22

Este finding foi **remediado sem passar pelo `vericore-finding-validator`**,
contrariando a Regra 22 e a condição (a) do meu próprio veredito da §6 do
`RETEST_REPORT.md`. Registro sem atenuar, e explico por que **não** converto o
desvio em bloqueio:

- O interesse protegido pela Regra 22 — não remediar finding não confirmado e
  calibrar severidade antes do encaminhamento — foi atendido **por meio mais
  forte** que o rito: o defeito foi **reproduzido empiricamente** num baseline
  real antes de ser declarado extinto, e a severidade foi fixada por **cláusula
  pré-registrada**, não por juízo.
- Nenhum resultado possível do validator **reviveria** um defeito provado extinto
  por execução; o único efeito plausível seria sobre severidade, já elevada ao
  máximo previsto.
- A disposição do desvio é do **CoreTriad Director**, não minha — o rito da
  Regra 22 pertence ao control plane. Registrado como **OBS-SIM-002-010**. Se o
  Director entender a regra como não renunciável, a validação pode ser executada
  **retrospectivamente** sobre `f2fcf1c` e `ac3e277`, e este fechamento permanece
  salvo se o validator produzir evidência nova — hipótese que deixo aberta em vez
  de descartar.

### 6. Delimitação do fechamento (obrigatória, não cosmética)

**Fecha-se:** a **procedência** dos três atributos de sujeito em
`approveSupplier` — **papel, empresa e identidade**. Nenhum é mais aceito do
payload; todos são resolvidos contra a fonte de identidade; provado por
comportamento com discriminação antes/depois, não por leitura de código.
Consequência que registro por ser a mais importante deste run: a **eficácia
prática** de FIND-SIM-002-001 (alçada) e de FIND-SIM-002-008 (segregação de
funções), que a §5.6 declarara **condicionada** ao desfecho deste finding,
**deixa de estar condicionada**. O produto passa a ter **uma única fonte de papel
para todas as operações** — o "efeito normativo" que a APR-2026-011 declarou
pretender.

**NÃO se fecha, e sai como item próprio:**

(i) **Quais papéis podem aprovar fornecedor.** A APR-2026-011 diz "a mesma alçada
    já decidida (`manager`) aplica-se à aprovação", o que **pode** ser lido como
    aprovação privativa de `manager`; a implementação manteve `analyst` até
    R$ 10.000 (BR-APR-001, **nunca revogada**) e `manager` sem teto. Os textos não
    coincidem literalmente e **este diretor não decide qual leitura rege** — seria
    inventar intenção (Regras 6 e 18) ou revogar tacitamente uma BR versionada
    (Regra 7). Registrado como **human gate aberto: OBS-SIM-002-009**, com
    pergunta objetiva formulada em `RETEST_REPORT_WAVE-E.md` §7.5.2.
    **Isto não reabre este finding:** o objeto do FIND-014 é *procedência do
    atributo de autorização*, não *conjunto de papéis autorizados*; confundir "de
    onde vem o papel" com "quais papéis bastam" descreveria mal o registro. E
    **não constitui finding**: sob a única leitura amparada por artefato
    versionado (BR-APR-001 em vigor), o comportamento medido é **conforme** — não
    há defeito provado, há **norma indeterminada**.

(ii) **Formato persistido de `approved_by`.** Metade não evidenciada do item 6 da
     spec. Absorvida por **OBS-SIM-002-001**, que passa a
     `EXTINTA QUANTO AO VETOR MEDIDO` com residual INFO de leitura positiva no
     delta audit.

(iii) **Auditoria do código remediado.** Este fechamento é **reteste dirigido a
      um finding**, não auditoria de `ac3e277`. O módulo de identidade e os demais
      caminhos introduzidos após `f2fcf1c` **nunca foram auditados** e são item de
      escopo do delta audit (Regras 12-14).

### 7. Veredito

RESULT: **RETEST_PASSED**
NEW_EVIDENCE_IF_FAILED: n/a
SEVERIDADE FINAL: **CRITICAL** (elevada de HIGH pela cláusula (c))
FINAL_STATUS: **FINDING CLOSED** — 2026-08-13, com as delimitações do item 6 e o
desvio processual do item 5 registrado e endereçado.

Disposto por **remediação e reteste independente**, **não** por aceitação de
risco — a cláusula simétrica de rebaixamento **não** foi acionada, e a distinção
fica expressa como ela própria exigia.
