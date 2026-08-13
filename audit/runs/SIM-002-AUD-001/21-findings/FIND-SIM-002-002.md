# FINDING

FINDING_ID: FIND-SIM-002-002
AUDIT_ID: SIM-002-AUD-001
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
PROJECT_ID: SIM-002
TITLE: listPaymentsBySupplier valida o tenant e o descarta na consulta — vazamento cross-tenant de pagamentos
DOMAIN: Segurança
SUBDOMAIN: Isolamento multi-tenant (IDOR)
SEVERITY: CRITICAL
CONFIDENCE: CONFIRMED
STATUS: CONFIRMED
DETECTED_BY: authorization, business-rule, database, traceability, qa, documentation-consistency (6 de 8 trilhas)
VALIDATED_BY: vericore-finding-validator
VALIDATION_DATE: 2026-08-13

DESCRIPTION:
`listPaymentsBySupplier` exige e valida `user.companyId`, mas a consulta SQL
subsequente filtra apenas por `supplier_id`, sem qualquer predicado de
`company_id`. O tenant é verificado sintaticamente e descartado semanticamente.

EXPECTED_BEHAVIOR:
BR-SEC-001 (`requirements/BUSINESS_RULES.md:43-47`): "Um usuário só pode acessar
fornecedores e pagamentos pertencentes à sua própria empresa (`company_id`)".
AC-SIM2-005 (`requirements/REQUIREMENTS.md:66-69`): "Dado um usuário de outra
empresa, então a listagem é recusada".

ACTUAL_BEHAVIOR:
Qualquer usuário com `companyId` inteiro — inclusive de outra empresa — recebe a
lista completa de pagamentos de qualquer `supplierId` informado, com valores,
datas, `created_by` e `external_ref`.

EVIDENCE:
FILE: product/SIM-002/src/paymentService.js
LINES: 110-119
```js
  function listPaymentsBySupplier({ supplierId, user }) {
    if (!user || !Number.isInteger(user.companyId)) {
      throw new Error('Usuário inválido');
    }

    return db.all(
      `SELECT * FROM payments WHERE supplier_id = ? ORDER BY created_at, id`,
      supplierId
    );
  }
```
`user.companyId` é validado em `:111` e nunca chega ao SQL de `:115-118`.

EVIDÊNCIA DE CONTRASTE — a omissão é isolada, não sistêmica. As outras três
leituras filtram corretamente:

FILE: product/SIM-002/src/supplierService.js
LINES: 49-53
```js
    const supplier = db.get(
      'SELECT * FROM suppliers WHERE id = ? AND company_id = ?',
      supplierId,
      user.companyId
    );
```

FILE: product/SIM-002/src/approvalService.js
LINES: 24-28
```js
    const supplier = db.get(
      'SELECT * FROM suppliers WHERE id = ? AND company_id = ?',
      supplierId,
      approver.companyId
    );
```

FILE: product/SIM-002/src/paymentService.js
LINES: 10-14
```js
    const supplier = db.get(
      'SELECT * FROM suppliers WHERE id = ? AND company_id = ?',
      supplierId,
      user.companyId
    );
```

AGRAVANTES VERIFICADOS:
- IDs sequenciais: `payments.id` e `suppliers.id` são `INTEGER PRIMARY KEY AUTOINCREMENT`
  (`src/schema.sql:23` e `:10`), tornando a enumeração de `supplierId` trivial.
- Ausência de controle compensatório: o produto não possui transporte HTTP,
  middleware nem camada de autenticação — confirmado em
  `SOFTWARE_RELEASE_PACKAGE.md:16` ("Sem transporte HTTP") e `:36`
  ("sem autenticação — o objeto `user` é fornecido pelo chamador"). Não há,
  portanto, filtro externo capaz de mitigar a falha.
- `payments.company_id` existe e está populado (`src/paymentService.js:57-60`),
  de modo que o dado necessário ao filtro está disponível — a omissão é do predicado.

RELATED_PROCESS: Consulta de pagamentos por fornecedor
RELATED_BUSINESS_RULE: BR-SEC-001
RELATED_REQUIREMENT: REQ-SIM2-005
RELATED_USE_CASE: Listar pagamentos por fornecedor
RELATED_ACCEPTANCE_CRITERIA: AC-SIM2-005
RELATED_TEST: TC-SIM2-005 (`tests/payments.test.js:113-132`) — usa um único tenant (`ctx.companies.acme`) e nunca cruza empresa; não detecta a falha

BUSINESS_IMPACT:
Vazamento de dados financeiros entre tenants: valores pagos, cronologia,
identificação do operador e referência do gateway de empresas concorrentes.
Violação direta do compromisso de isolamento declarado como requisito de
segurança do release (`SOFTWARE_RELEASE_PACKAGE.md:22`).

TECHNICAL_IMPACT:
Único ponto de leitura fora do padrão adotado nas outras três consultas;
inconsistência de implementação que sobrevive à revisão por parecer validado.

SECURITY_IMPACT:
IDOR (Insecure Direct Object Reference) explorável por enumeração sequencial,
sem autenticação exigida além de um `companyId` inteiro arbitrário. Confidencialidade
comprometida de forma sistemática e silenciosa (não gera erro nem trilha).

REPRODUCTION:
1. Criar empresas A e B; cadastrar e aprovar o fornecedor S na empresa A.
2. Registrar pagamentos para S com usuário da empresa A.
3. Chamar `listPaymentsBySupplier({ supplierId: S.id, user: { id: 'x', role: 'analyst', companyId: B } })`.
4. Observado: array completo dos pagamentos da empresa A.
5. Esperado por AC-SIM2-005: recusa.

ROOT_CAUSE_HYPOTHESIS:
Predicado `AND company_id = ?` omitido na consulta; a validação de entrada em
`:111-113` criou aparência de controle e inibiu a detecção em revisão.

REFERENCE:
- `product/SIM-002/requirements/BUSINESS_RULES.md:43-47` (BR-SEC-001)
- `product/SIM-002/requirements/REQUIREMENTS.md:60-70` (REQ-SIM2-005 / AC-SIM2-005)
- `product/SIM-002/docs/API.md:88-96` ("restritos à empresa do usuário")
- `product/SIM-002/requirements/DATA_DICTIONARY.md:42` (`payments.company_id` — "Empresa pagadora (BR-SEC-001)")

RECOMMENDATION:
Aplicar o predicado de tenant na consulta, no mesmo padrão das outras três
leituras, e cobrir com teste negativo cross-tenant. Avaliar defesa em
profundidade no banco (ver FIND-SIM-002-012). A VeriCore não implementa.

SUGGESTED_REMEDIATION_OWNER: SanaCore

RETEST_SPECIFICATION:
1. Cenário cross-tenant: usuário da empresa B lista pagamentos de fornecedor da
   empresa A → **recusa (exceção) ou coleção vazia; nunca dados**. Asserção
   explícita de que nenhum registro da empresa A é retornado.
2. Cenário positivo preservado: usuário da empresa A recebe seus pagamentos,
   ordenados por `created_at, id`.
3. Invariante universal: para toda listagem bem-sucedida, **todo** item retornado
   satisfaz `item.company_id === user.companyId`.
4. O teste 1 deve falhar contra o `AUDIT_COMMIT` e passar após a remediação.

---

## Validação (finding-validator)

VEREDITO: **CONFIRMED** — severidade CRITICAL **mantida**.

### Releitura independente do código

Reli `src/paymentService.js:110-119` diretamente. O fato é literal e não admite
interpretação: `user.companyId` é lido apenas no `if` de `:111` e o SQL de
`:115-118` recebe um único parâmetro, `supplierId`. Nenhum `WHERE company_id`,
nenhuma filtragem posterior do array antes do `return` (o `db.all` é retornado
diretamente).

### Onde procurei controle compensatório (e o que NÃO encontrei)

1. **Pré-escopo do `supplierId` pelo chamador** — hipótese de refutação mais forte:
   se todo caller obtivesse o fornecedor via `getSupplier` (que filtra por tenant,
   `src/supplierService.js:49-53`) antes de listar, o `supplierId` já viria
   validado. Busquei todos os chamadores de `listPaymentsBySupplier` no repositório:
   somente `tests/payments.test.js:124`. Não existe fluxo de aplicação que imponha
   esse pré-escopo, e a função é exportada publicamente (`:140`) como contrato
   (`docs/API.md:88-96`), portanto invocável diretamente. Refutação falha.
2. **Middleware / interceptor / política de transporte** — inexistentes: não há
   camada HTTP, servidor, router ou autenticação no módulo
   (`SOFTWARE_RELEASE_PACKAGE.md:16`, `:36`; estrutura do `README.md:17-33`
   confirma que `src/` contém apenas db, três serviços e o cliente de gateway).
3. **Política/constraint no banco** — SQLite via `node:sqlite` não possui RLS,
   views de segurança ou policies; `src/schema.sql:1-47` não define view alguma,
   apenas 4 tabelas e 3 índices. Não há defesa na camada de dados.
4. **Verificação em serviço adjacente** — `supplierService` e `approvalService`
   não participam do caminho de listagem; nada os encadeia.
5. **Teste que cubra** — TC-SIM2-005 (`tests/payments.test.js:113-132`) opera com
   um único tenant (`ctx.companies.acme`) tanto na criação quanto na listagem;
   confirmo que não há asserção cross-tenant em nenhum dos três arquivos de teste.

### Tentativa de refutação por severidade

Argumento testado: "o produto inteiro é declaradamente sem autenticação
(`SOFTWARE_RELEASE_PACKAGE.md:36`), logo o isolamento por tenant já é nominal e a
falha não acrescenta risco — seria MEDIUM". **Rejeitado**: BR-SEC-001 é declarada
como SECURITY_REQUIREMENT do release (`:22`) e é efetivamente implementada nas
outras três leituras do módulo. O modelo de confiança do produto é "o chamador
informa `user`, o serviço impõe o tenant" — e as demais operações o impõem. A
omissão aqui não é uma limitação assumida, é a quebra isolada de um controle que o
próprio produto exerce em toda parte. Vazamento sistemático, silencioso e sem
trilha de dados financeiros de terceiros: CRITICAL sustentada.

Observo, adicionalmente, que a severidade não depende de o `companyId` ser
forjável: mesmo um chamador legítimo da empresa B, com `companyId` verdadeiro,
recebe os pagamentos da empresa A.

### Reprodutibilidade

Reprodução do finding é executável e determinística; o defeito é ainda provável
estaticamente pela ausência do predicado. Aceito como prova.

### Nota de dependência

A defesa em profundidade sugerida (FK composta / amarração de tenant) é objeto de
FIND-SIM-002-012 e **não** substitui a correção do predicado — não trato este
finding como duplicado daquele: são camadas distintas.
