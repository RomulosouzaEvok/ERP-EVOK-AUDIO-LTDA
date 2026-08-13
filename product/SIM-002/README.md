# SIM-002 — "PagaFácil"

Módulo de cadastro, aprovação e pagamento de fornecedores. Node.js CommonJS,
zero dependências externas, persistência em SQLite através do módulo nativo
`node:sqlite`.

## Escopo funcional

- Cadastro de fornecedores por empresa (multi-tenant).
- Aprovação de fornecedores com controle de alçada por papel.
- Registro de pagamentos limitado ao crédito aprovado do fornecedor.
- Envio de pagamentos a um gateway externo, com trilha de tentativas.
- Consulta de fornecedores e listagem de pagamentos.

## Estrutura

```
product/SIM-002/
├── requirements/
│   ├── BUSINESS_RULES.md      regras de negócio (BR-*)
│   ├── REQUIREMENTS.md        requisitos, AC e TC planejados (REQ-SIM2-*)
│   └── DATA_DICTIONARY.md     dicionário de dados
├── src/
│   ├── schema.sql             DDL das tabelas
│   ├── db.js                  abertura da base e helpers
│   ├── supplierService.js     cadastro e consulta de fornecedores
│   ├── approvalService.js     aprovação com alçada
│   ├── paymentService.js      pagamentos e envio ao gateway
│   └── gatewayClient.js       cliente do gateway externo
├── tests/                     suíte node:test
├── docs/API.md                contrato das operações
└── SOFTWARE_RELEASE_PACKAGE.md
```

## Requisitos

- Node.js >= 22.5 (módulo `node:sqlite`). Validado em v24.18.0.

## Como rodar os testes

A partir da raiz do repositório:

```
node --test "product/SIM-002/tests/**/*.test.js"
```

Cada teste abre uma base SQLite em memória isolada, de modo que a suíte pode ser
executada em qualquer ordem.

## Uso rápido

```js
const { openDatabase, createCompany } = require('./src/db');
const { createSupplierService } = require('./src/supplierService');

const db = openDatabase(':memory:');
const company = createCompany(db, 'ACME Indústria');
const suppliers = createSupplierService(db);

const supplier = suppliers.createSupplier({
  cnpj: '11222333000181',
  name: 'Metalúrgica Sul',
  companyId: company.id
});
```

Detalhes de cada operação em [`docs/API.md`](docs/API.md).
