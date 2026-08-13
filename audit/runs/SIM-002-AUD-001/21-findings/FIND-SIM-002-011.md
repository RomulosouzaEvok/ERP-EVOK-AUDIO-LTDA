# FINDING

FINDING_ID: FIND-SIM-002-011
AUDIT_ID: SIM-002-AUD-001
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
PROJECT_ID: SIM-002
TITLE: createSupplier não recebe usuário — companyId é parâmetro livre do chamador, permitindo cadastro em empresa alheia
DOMAIN: Segurança
SUBDOMAIN: Isolamento multi-tenant na escrita
SEVERITY: MEDIUM
CONFIDENCE: CONFIRMED
STATUS: PROPOSED
DETECTED_BY: authorization, business-rule, traceability, documentation-consistency (4 de 8 trilhas)

DESCRIPTION:
`createSupplier` não recebe o objeto `user`. O `companyId` sob o qual o
fornecedor será criado é fornecido livremente pelo chamador e validado apenas
quanto à existência da empresa — nunca quanto à pertinência do chamador àquela
empresa. É a **única operação de escrita do módulo sem sujeito identificado**
além de `cancelPayment` (FIND-SIM-002-004).

EXPECTED_BEHAVIOR:
BR-SEC-001 (`requirements/BUSINESS_RULES.md:43-47`): "Dados de outras empresas não
podem ser lidos **nem alterados**". `docs/API.md:30` declara para esta operação:
"**Papel exigido:** qualquer usuário autenticado **da empresa**" — o que pressupõe
um sujeito autenticado cuja empresa seja verificada.

ACTUAL_BEHAVIOR:
Qualquer chamador cria fornecedores em qualquer empresa existente, bastando
informar o `companyId` desejado. Não há sujeito, papel nem verificação de
pertinência.

EVIDENCE:
FILE: product/SIM-002/src/supplierService.js
LINES: 12-39
```js
  function createSupplier({ cnpj, name, companyId }) {
    if (typeof cnpj !== 'string' || !CNPJ_PATTERN.test(cnpj)) {
      throw new Error('CNPJ inválido: informe 14 dígitos');
    }
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('Nome do fornecedor é obrigatório');
    }
    if (!Number.isInteger(companyId)) {
      throw new Error('companyId é obrigatório');
    }

    const company = db.get('SELECT id FROM companies WHERE id = ?', companyId);
    if (!company) {
      throw new Error('Empresa não encontrada');
    }

    const now = new Date().toISOString();
    const result = db.run(
      `INSERT INTO suppliers (company_id, cnpj, name, status, credit_limit, created_at)
       VALUES (?, ?, ?, 'pending', 0, ?)`,
      companyId,
      cnpj,
      name.trim(),
      now
    );

    return db.get('SELECT * FROM suppliers WHERE id = ?', Number(result.lastInsertRowid));
  }
```
Verificado: a assinatura em `:12` não contém `user`; a única checagem sobre
`companyId` é de tipo (`:19-21`) e de existência da empresa (`:23-26`); o valor
é gravado diretamente em `:32`.

CONTRASTE COM AS DEMAIS OPERAÇÕES (todas recebem sujeito):
- `getSupplier` — `src/supplierService.js:44` recebe `user` e o aplica em `:49-53`.
- `approveSupplier` — `src/approvalService.js:13` recebe `approver` e o aplica em `:24-28`.
- `createPayment` — `src/paymentService.js:40` recebe `user`, valida papel em `:41` e tenant em `:10-14`.
- `listPaymentsBySupplier` — `src/paymentService.js:110` recebe `user` (embora não o aplique — FIND-SIM-002-002).

CONTRADIÇÃO DOCUMENTAL:
FILE: product/SIM-002/docs/API.md
LINES: 30
```
- **Papel exigido:** qualquer usuário autenticado da empresa.
```
A operação exposta em `:26` (`createSupplier({ cnpj, name, companyId })`) não tem
como impor esse requisito, pois não conhece o usuário.

RELATED_PROCESS: Cadastro de fornecedor
RELATED_BUSINESS_RULE: BR-SEC-001
RELATED_REQUIREMENT: REQ-SIM2-001
RELATED_USE_CASE: Cadastrar fornecedor
RELATED_ACCEPTANCE_CRITERIA: AC-SIM2-001 ("quando **um usuário** cadastra o fornecedor", `REQUIREMENTS.md:14-15`)
RELATED_TEST: TC-SIM2-001 (`tests/suppliers.test.js:7-25`) — não há teste cross-tenant de escrita

BUSINESS_IMPACT:
Injeção de cadastros em empresas alheias: um fornecedor plantado na empresa
concorrente pode ser aprovado por um aprovador legítimo dela (que o vê como
cadastro próprio) e passar a receber pagamentos. Também polui a base cadastral e,
somado à ausência de unicidade de CNPJ (FIND-SIM-002-005), permite criar
múltiplos cadastros arbitrários.

TECHNICAL_IMPACT:
A escrita não deixa autoria: `suppliers` não possui coluna `created_by`
(`src/schema.sql:9-20`), diferentemente de `payments` que a possui (`:29`).
Impossível determinar quem originou o cadastro.

SECURITY_IMPACT:
Escrita cross-tenant sem autenticação nem autorização. Note-se que o produto não
possui camada HTTP/middleware (`SOFTWARE_RELEASE_PACKAGE.md:16` e `:36`), logo
não há controle compensatório fora do serviço.

REPRODUCTION:
1. Empresas A e B existentes.
2. Chamador atuando em nome de A executa
   `createSupplier({ cnpj: '11222333000181', name: 'Fantasma', companyId: B })`.
3. Observado: fornecedor criado com `company_id = B`, `status = 'pending'`.
4. Esperado por BR-SEC-001 e `docs/API.md:30`: recusa.

ROOT_CAUSE_HYPOTHESIS:
Operação desenhada antes da introdução do sujeito `user` nas demais e não
retroalinhada; `companyId` mantido como parâmetro de dado em vez de derivado do
contexto de autenticação.

REFERENCE:
- `product/SIM-002/requirements/BUSINESS_RULES.md:43-47` (BR-SEC-001)
- `product/SIM-002/requirements/REQUIREMENTS.md:7-18` (REQ-SIM2-001 / AC-SIM2-001)
- `product/SIM-002/docs/API.md:26-35`
- `product/SIM-002/SOFTWARE_RELEASE_PACKAGE.md:25` ("Cadastrar fornecedor: usuário da empresa — permitido")
- `product/SIM-002/SOFTWARE_RELEASE_PACKAGE.md:36` (KNOWN_LIMITATIONS: "sem autenticação — o objeto `user` é fornecido pelo chamador")

RECOMMENDATION:
Exigir `user` na assinatura e derivar `company_id` de `user.companyId`, ou
recusar quando `companyId !== user.companyId`. Considerar `created_by` em
`suppliers` para autoria (ver FIND-SIM-002-012). A VeriCore não implementa.

SUGGESTED_REMEDIATION_OWNER: SanaCore

RETEST_SPECIFICATION:
1. Cadastro cross-tenant: usuário da empresa A tentando criar fornecedor com
   `companyId = B` → **recusado**; `SELECT COUNT(*) FROM suppliers WHERE company_id = B`
   inalterado.
2. Caminho positivo: usuário da empresa A cria fornecedor na empresa A →
   `company_id === user.companyId` no registro persistido.
3. Chamada sem `user` → **recusada** (não pode existir escrita sem sujeito).
4. Não-regressão de TC-SIM2-001 e TC-SIM2-001b após a alteração de assinatura.
5. Consistência documental: `docs/API.md:26-35` reflete a assinatura com sujeito.
