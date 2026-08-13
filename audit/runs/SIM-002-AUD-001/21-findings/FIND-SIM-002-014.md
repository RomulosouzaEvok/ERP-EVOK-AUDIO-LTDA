# FINDING

FINDING_ID: FIND-SIM-002-014
AUDIT_ID: SIM-002-AUD-001
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
PROJECT_ID: SIM-002
TITLE: approveSupplier decide alçada de crédito por papel autodeclarado pelo chamador, sem verificação server-side
DOMAIN: Segurança / Autorização
SUBDOMAIN: Procedência do atributo de autorização (Regra 24)
SEVERITY: HIGH
CONFIDENCE: CONFIRMED
STATUS: PROPOSED
DETECTED_BY: vericore-software-audit-director (a partir de risco residual declarado espontaneamente pela SanaCore na WAVE-D) — verificação independente por leitura direta do objeto auditado
DATA_DE_ABERTURA: 2026-08-13
VALIDATED_BY: — (pendente `vericore-finding-validator`, Regra 22)
HUMAN_GATE: **exigido** — decisão sobre extensão da APR-2026-008 à alçada de aprovação, ou aceitação de risco registrada restrita ao SIM-002
ELEVATION_CLAUSE: **CRITICAL** — ver "Cláusula de elevação obrigatória"

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

RELATED_PROCESS: Aprovação de fornecedor e concessão de limite de crédito
RELATED_BUSINESS_RULE: BR-APR-001 (alçada de aprovação — sua eficácia depende deste ponto); BR-SEC-001 (isolamento por empresa — igualmente baseado em `approver.companyId` autodeclarado)
RELATED_REQUIREMENT: REQ-SIM2-002
RELATED_USE_CASE: Aprovar fornecedor
RELATED_ACCEPTANCE_CRITERIA: AC-SIM2-002
RELATED_TEST: nenhum teste exercita papel forjado em `approveSupplier` (existe teste equivalente para pagamento, criado na WAVE-D)
RELATED_FINDINGS: FIND-SIM-002-001 (alçada 50000 → 10000, CLOSED — sua eficácia prática depende deste finding); FIND-SIM-002-008 (segregação de funções, CLOSED — idem); OBS-SIM-002-001 (`approved_by` corrompido, mesma trilha de autoria)
RELATED_APPROVAL: APR-2026-005 (origem da Regra 24), APR-2026-008 (padrão aplicado a pagamento)

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
- `coretriad/governance/APPROVALS.md` — **APR-2026-005** (risco aceito **restrito ao SIM-001**, expressamente não extensível a outros projetos) e **APR-2026-008** (padrão server-side determinado para pagamento no SIM-002)
- `product/SIM-002/src/approvalService.js:4,13-19,37-39,47`
- `product/SIM-002/requirements/BUSINESS_RULES.md:19-29` (BR-APR-001)
- `audit/runs/SIM-002-AUD-001/30-retest/RETEST_REPORT.md` §5.6 e §6
- `audit/runs/SIM-002-AUD-001/24-coverage/AUDIT_COVERAGE_MATRIX.md` §2.2

---

## Justificativa da severidade — **HIGH**, e por que não CRITICAL nem MEDIUM

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
    o da Regra 24 sem ressalva aplicável;
(d) o `vericore-finding-validator` concluir que o atenuante de ambiente não se
    sustenta.

## Cláusula simétrica de rebaixamento (registrada para não enviesar a validação)

Este finding **deve ser rebaixado a INFO/`RISK_ACCEPTED`** se decisão humana
registrada aceitar o risco **restrito ao SIM-002**, nos moldes da APR-2026-005,
com menção expressa à Regra 24. Nesse caso o finding não é "fechado por
remediação": é **disposto por aceitação**, e a distinção deve constar do registro.

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
