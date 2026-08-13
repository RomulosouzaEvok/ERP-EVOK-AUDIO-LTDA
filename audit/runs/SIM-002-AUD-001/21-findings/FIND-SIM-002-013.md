# FINDING

FINDING_ID: FIND-SIM-002-013
AUDIT_ID: SIM-002-AUD-001
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
PROJECT_ID: SIM-002
TITLE: Lacunas de fronteira e testes negativos, mensagens de erro divergentes/não documentadas, status órfão e índices ausentes
DOMAIN: Qualidade / Documentação / Banco
SUBDOMAIN: Cobertura residual
SEVERITY: LOW
CONFIDENCE: CONFIRMED
STATUS: PROPOSED
DETECTED_BY: qa, documentation-consistency, database, traceability (4 de 8 trilhas)

DESCRIPTION:
Agregado de lacunas residuais de menor severidade individual, mas que em conjunto
explicam por que defeitos CRITICAL e HIGH atravessaram a suíte com `12/12 PASS`.
Quatro blocos: (A) cobertura de fronteira e testes negativos; (B) mensagens de
erro divergentes ou não documentadas; (C) status enumerado sem produtor; (D)
índices ausentes.

## Bloco A — cobertura de fronteira e testes negativos

EVIDENCE:
FILE: product/SIM-002/tests/approval.test.js
LINES: 22
```js
      creditLimit: 8000,
```
FILE: product/SIM-002/tests/approval.test.js
LINES: 43
```js
        creditLimit: 200000,
```
Os dois únicos valores de alçada testados são 8000 e 200000, **ambos fora da
faixa discriminante 10.001–50.000**. É exatamente por isso que a suíte passa com
a regra errada de FIND-SIM-002-001: nenhum valor testado distingue o teto
normativo (10000) do implementado (50000).

Testes negativos ausentes na suíte inteira (`tests/suppliers.test.js`,
`tests/approval.test.js`, `tests/payments.test.js`), verificado por inspeção
completa dos três arquivos:
- papel não autorizado em `createPayment` (nenhum teste com `role` fora de `['analyst','manager']`, cf. `src/paymentService.js:41`);
- papel não autorizado em `approveSupplier` (guarda em `src/approvalService.js:14-16` nunca exercitada);
- `amount <= 0` ou não numérico (guarda em `src/paymentService.js:44-46` nunca exercitada);
- CNPJ com 13 ou 15 dígitos — TC-SIM2-001b (`tests/suppliers.test.js:27-41`) usa `'123'` (`:32`), longe da fronteira do regex `^\d{14}$` (`src/supplierService.js:3`);
- CNPJ duplicado (ver FIND-SIM-002-005);
- reaprovação de fornecedor já aprovado (guarda em `src/approvalService.js:33-35` nunca exercitada; ver FIND-SIM-002-010);
- gateway recusando (`accepted: false`) — impossível com o stub atual (`src/gatewayClient.js:25`; ver FIND-SIM-002-009);
- reenvio de pagamento (ver FIND-SIM-002-003);
- listagem cross-tenant (ver FIND-SIM-002-002);
- `cancelPayment` — nenhum teste (ver FIND-SIM-002-004).

## Bloco B — mensagens de erro divergentes e não documentadas

Divergências literais entre `docs/API.md` e as mensagens lançadas:
| Documentada | Lançada pelo código |
|---|---|
| `CNPJ inválido` (`docs/API.md:33`) | `CNPJ inválido: informe 14 dígitos` (`src/supplierService.js:14`) |
| `Limite de crédito acima da alçada do analista` (`docs/API.md:58`) | `Limite de crédito acima da alçada do analista: requer gerente` (`src/approvalService.js:38`) |

Erros lançados e **não documentados** em `docs/API.md` (3):
1. `companyId é obrigatório` — `src/supplierService.js:20` (seção `createSupplier`, `docs/API.md:33-34`, não o lista).
2. `Usuário inválido` — `src/supplierService.js:46` (seção `getSupplier`, `docs/API.md:44-45`, lista apenas `Fornecedor não encontrado`).
3. `Aprovador inválido` — `src/approvalService.js:18` (seção `approveSupplier`, `docs/API.md:56-58`, não o lista).

(O erro `Pagamento não encontrado` de `cancelPayment`, `src/paymentService.js:128`,
não é contabilizado aqui: a operação inteira é objeto de FIND-SIM-002-004.)

## Bloco C — status enumerado sem produtor

O status `rejected` de fornecedor é declarado em
`product/SIM-002/requirements/BUSINESS_RULES.md:11` ("por exemplo `pending` ou
`rejected`") e em `product/SIM-002/requirements/DATA_DICTIONARY.md:28`
("`pending`, `approved`, `rejected`"), mas **nenhum caminho de código o produz**:
`src/supplierService.js:31` grava `'pending'`, `src/approvalService.js:44` grava
`'approved'`, e não há outra escrita em `suppliers.status` no módulo. Não existe
operação de reprovação de fornecedor.

(O caso simétrico — `payments.status = 'pending'` documentado apenas em
`docs/API.md:67` — é tratado em FIND-SIM-002-008.)

## Bloco D — índices ausentes

FILE: product/SIM-002/src/schema.sql
LINES: 45-47
```sql
CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers (company_id);
CREATE INDEX IF NOT EXISTS idx_payments_supplier ON payments (supplier_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_payment ON payment_attempts (payment_id);
```
Não há índice sobre `suppliers.cnpj` — coluna que, uma vez implementada a
unicidade de BR-SUP-002 (FIND-SIM-002-005), será obrigatoriamente consultada a
cada cadastro. Não há índice sobre `payments.company_id` — coluna que passará a
integrar o predicado de toda listagem após a correção de FIND-SIM-002-002.

RELATED_PROCESS: Transversal (qualidade, documentação, dados)
RELATED_BUSINESS_RULE: BR-APR-001, BR-SUP-001, BR-SUP-002 (indiretamente)
RELATED_REQUIREMENT: REQ-SIM2-001..006 (transversal)
RELATED_USE_CASE: Transversal
RELATED_ACCEPTANCE_CRITERIA: Transversal
RELATED_TEST: TC-SIM2-001b, TC-SIM2-002, TC-SIM2-002b (`tests/approval.test.js:15-58`, `tests/suppliers.test.js:27-41`)

BUSINESS_IMPACT:
A estratégia de teste concentra-se no caminho feliz e em valores distantes das
fronteiras normativas, o que permitiu que uma alçada 5× incorreta fosse declarada
aprovada. Documentação de erros incompleta dificulta a integração de consumidores.

TECHNICAL_IMPACT:
Ausência de índices em colunas que se tornarão de consulta obrigatória após as
remediações; enumeração de status sem produtor indica funcionalidade prevista e
não implementada (reprovação de fornecedor), ou documentação excedente.

SECURITY_IMPACT:
Indireto: a ausência de testes negativos de papel deixa as guardas de autorização
sem verificação de regressão.

REPRODUCTION:
1. Alterar `ANALYST_APPROVAL_LIMIT` para qualquer valor entre 10001 e 200000 e
   executar a suíte → permanece 12/12 PASS.
2. Buscar `'rejected'` em `product/SIM-002/src/` → nenhuma ocorrência.
3. Comparar as seções de erro de `docs/API.md` com os `throw new Error` de
   `product/SIM-002/src/` → 2 divergências literais e 3 erros ausentes.

ROOT_CAUSE_HYPOTHESIS:
Testes escritos para confirmar o comportamento implementado (confirmation bias)
em vez de para provar a regra normativa; documentação de erros redigida por
amostragem.

REFERENCE:
- `product/SIM-002/SOFTWARE_RELEASE_PACKAGE.md:30-34` (TEST_STRATEGY / TEST_RESULTS)
- `product/SIM-002/docs/API.md:33-34`, `:44-45`, `:56-58`
- `product/SIM-002/requirements/DATA_DICTIONARY.md:28`
- `product/SIM-002/src/schema.sql:45-47`

RECOMMENDATION:
Adicionar testes de fronteira exata para toda regra com valor numérico; adicionar
testes negativos de papel e de validação de entrada; reconciliar a lista de erros
de `docs/API.md` com o código; decidir (decisão humana) se a reprovação de
fornecedor deve existir ou se `rejected` deve sair da documentação; criar os
índices junto às remediações de FIND-SIM-002-002 e FIND-SIM-002-005.
A VeriCore não implementa.

SUGGESTED_REMEDIATION_OWNER: SanaCore (Bloco C depende de decisão humana quanto ao status `rejected`)

RETEST_SPECIFICATION:
1. Bloco A: existem testes de fronteira exata para BR-APR-001 (10000 / 10000.01)
   e BR-PAY-001 (limite exato / limite + 0,01); existem testes negativos de papel
   em `createPayment` e `approveSupplier`; de `amount <= 0`; de CNPJ com 13 e 15
   dígitos; de reaprovação; e de gateway recusando (com duplo de teste).
2. Prova de discriminação: alterar o valor da alçada no código deve fazer a suíte
   **falhar**.
3. Bloco B: cada `throw new Error` do módulo tem correspondência literal exata na
   seção pertinente de `docs/API.md` — verificação item a item.
4. Bloco C: ou existe operação que produz `rejected` com requisito registrado, ou
   o valor é removido de `BUSINESS_RULES.md:11` e `DATA_DICTIONARY.md:28`.
5. Bloco D: existem índices sobre `suppliers.cnpj` e `payments.company_id`.
