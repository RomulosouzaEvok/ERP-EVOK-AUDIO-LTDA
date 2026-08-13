# SIM-002 "PagaFácil" — API de Serviços

API programática (CommonJS). Todos os serviços são instanciados por fábrica e
recebem o handle de banco retornado por `openDatabase()`.

```js
const { openDatabase } = require('./src/db');
const { createSupplierService } = require('./src/supplierService');
const { createApprovalService } = require('./src/approvalService');
const { createPaymentService } = require('./src/paymentService');
const { createGatewayClient } = require('./src/gatewayClient');

const db = openDatabase('pagafacil.db');
const gateway = createGatewayClient();

const suppliers = createSupplierService(db);
const approvals = createApprovalService(db);
const payments = createPaymentService({ db, gateway });
```

O objeto `user` / `approver` esperado pelas operações tem o formato
`{ id, role, companyId }`, com `role` em `analyst` ou `manager`.

---

## `suppliers.createSupplier({ cnpj, name, companyId })`

Cadastra um fornecedor.

- **Papel exigido:** qualquer usuário autenticado da empresa.
- **Entrada:** `cnpj` (14 dígitos), `name` (texto), `companyId` (inteiro).
- **Saída:** registro do fornecedor com `status: "pending"` e `credit_limit: 0`.
- **Erros:** `CNPJ inválido`, `Nome do fornecedor é obrigatório`,
  `Empresa não encontrada`.
- **Referências:** REQ-SIM2-001, BR-SUP-002.

## `suppliers.getSupplier({ supplierId, user })`

Consulta um fornecedor da empresa do usuário.

- **Papel exigido:** `analyst` ou `manager` da empresa proprietária.
- **Entrada:** `supplierId` (inteiro), `user`.
- **Saída:** `{ id, company_id, cnpj, name, status, credit_limit, approved_by, approved_at, created_at }`.
- **Erros:** `Fornecedor não encontrado` (inclusive quando o fornecedor pertence
  a outra empresa).
- **Referências:** REQ-SIM2-006, BR-SEC-001.

## `approvals.approveSupplier({ supplierId, creditLimit, approver })`

Aprova um fornecedor e concede limite de crédito.

- **Papel exigido:** `analyst` (dentro da sua alçada) ou `manager`.
- **Entrada:** `supplierId`, `creditLimit` (número positivo), `approver`.
- **Saída:** fornecedor com `status: "approved"`, `credit_limit`, `approved_by`
  e `approved_at`.
- **Erros:** `Papel do aprovador não possui permissão de aprovação`,
  `Limite de crédito deve ser um valor positivo`, `Fornecedor não encontrado`,
  `Fornecedor já está aprovado`, `Limite de crédito acima da alçada do analista`.
- **Referências:** REQ-SIM2-002, BR-APR-001, BR-SEC-001.

## `payments.createPayment({ supplierId, amount, user })` *(async)*

Registra um pagamento para um fornecedor aprovado.

- **Papel exigido:** `manager`.
- **Entrada:** `supplierId`, `amount` (número positivo), `user`.
- **Saída:** pagamento com `status: "pending"`, `external_ref: null`.
- **Erros:** `Usuário não possui permissão para registrar pagamentos`,
  `Valor do pagamento deve ser positivo`, `Fornecedor não encontrado`,
  `Fornecedor não está aprovado para receber pagamentos`,
  `Pagamento excede o limite de crédito do fornecedor`.
- **Referências:** REQ-SIM2-003, BR-SUP-001, BR-PAY-001, BR-SEC-001.

## `payments.sendPayment({ paymentId })` *(async)*

Envia o pagamento ao gateway externo.

- **Papel exigido:** operação de retaguarda (executada pelo processo de
  liquidação, sem interação de usuário).
- **Entrada:** `paymentId`.
- **Saída:** pagamento com `status: "sent"`, `external_ref` no formato
  `GW-NNNNNN` e `sent_at` preenchido. A chamada é registrada em
  `payment_attempts`.
- **Erros:** `Pagamento não encontrado`, `Pagamento cancelado não pode ser
  enviado`.
- **Referências:** REQ-SIM2-004, BR-PAY-002.

## `payments.listPaymentsBySupplier({ supplierId, user })`

Lista os pagamentos de um fornecedor, restritos à empresa do usuário.

- **Papel exigido:** `analyst` ou `manager` da empresa proprietária.
- **Entrada:** `supplierId`, `user`.
- **Saída:** array de pagamentos ordenado por `created_at`.
- **Erros:** `Usuário inválido`.
- **Referências:** REQ-SIM2-005, BR-SEC-001.
