# FINDING

FINDING_ID: FIND-SIM-002-012
AUDIT_ID: SIM-002-AUD-001
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
PROJECT_ID: SIM-002
TITLE: Schema sem defesa em profundidade — sem CHECK de domínio, sem FK composta de tenant, sem trilha de alteração
DOMAIN: Banco de dados
SUBDOMAIN: Integridade declarativa / auditabilidade
SEVERITY: MEDIUM
CONFIDENCE: CONFIRMED
STATUS: PROPOSED
DETECTED_BY: database, data-integrity, traceability, documentation-consistency (4 de 8 trilhas)

DESCRIPTION:
O DDL confia integralmente à aplicação invariantes que poderiam ser declaradas no
banco. Cinco lacunas verificadas: (a) nenhuma constraint `CHECK` de domínio nas
colunas de estado, apesar de o dicionário enumerar os valores válidos; (b) sem
`CHECK` de positividade em `amount` e de não-negatividade em `credit_limit`;
(c) `payments.company_id` denormalizado sem chave estrangeira composta que o
amarre a `suppliers.company_id`; (d) nenhuma tabela mutável possui `updated_at`;
(e) `suppliers` não possui `created_by`.

EXPECTED_BEHAVIOR:
Invariantes de domínio declaradas na documentação de dados devem ser impostas
também pelo banco (defesa em profundidade), e toda mutação de estado financeiro
deve deixar trilha temporal e de autoria auditável.

ACTUAL_BEHAVIOR:
Qualquer valor textual é aceito nas colunas de estado; valores negativos ou zero
são aceitos em `amount` e `credit_limit` no nível do banco; um pagamento pode
apontar para empresa diferente da do seu fornecedor sem violar constraint algum;
e não há como saber quando um registro foi alterado nem por quem foi criado (no
caso de `suppliers`).

EVIDENCE:

(a) Colunas de estado sem `CHECK`:
FILE: product/SIM-002/src/schema.sql
LINES: 14
```sql
  status       TEXT NOT NULL DEFAULT 'pending',
```
LINES: 27
```sql
  status       TEXT NOT NULL DEFAULT 'created',
```
LINES: 40
```sql
  result       TEXT NOT NULL,
```
Enquanto o dicionário enumera os domínios: `DATA_DICTIONARY.md:28`
("`pending`, `approved`, `rejected`"), `:44` ("`created`, `sent`, `cancelled`") e
`:59` ("`accepted` ou `failed`"). Nenhuma dessas enumerações é imposta pelo DDL.

(b) Sem `CHECK` de faixa de valor:
FILE: product/SIM-002/src/schema.sql
LINES: 26
```sql
  amount       REAL NOT NULL,
```
LINES: 15
```sql
  credit_limit REAL NOT NULL DEFAULT 0,
```
`DATA_DICTIONARY.md:43` declara "deve ser positivo" para `amount`; a validação
existe apenas na aplicação (`src/paymentService.js:44-46` e
`src/approvalService.js:20-22`).

(c) Tenant denormalizado sem amarração referencial:
FILE: product/SIM-002/src/schema.sql
LINES: 22-34
```sql
CREATE TABLE IF NOT EXISTS payments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id  INTEGER NOT NULL,
  company_id   INTEGER NOT NULL,
  ...
  FOREIGN KEY (supplier_id) REFERENCES suppliers (id),
  FOREIGN KEY (company_id) REFERENCES companies (id)
);
```
As duas FKs são independentes: nada impede `payments.company_id <> suppliers.company_id`
do `supplier_id` referenciado. Não existe FK composta
`(supplier_id, company_id) → suppliers(id, company_id)` — que exigiria também
unicidade correspondente na tabela `suppliers`.

(d) Ausência de `updated_at`: verificação exaustiva de `src/schema.sql:1-47` —
nenhuma das quatro tabelas (`companies`, `suppliers`, `payments`,
`payment_attempts`) possui coluna de última alteração. As mutáveis (`suppliers`,
alterada em `src/approvalService.js:42-50`; `payments`, alterada em
`src/paymentService.js:97-102`, `:132` e `:134`) sofrem `UPDATE` sem registro
temporal da alteração.

(e) Ausência de autoria em `suppliers`: `src/schema.sql:9-20` possui
`approved_by` (`:16`) mas não `created_by` — assimetria em relação a `payments`,
que possui `created_by NOT NULL` (`:29`).

CONSEQUÊNCIA FORENSE MATERIAL: a reversão de estado descrita em
FIND-SIM-002-004 (`sent → created` com `sent_at = NULL`, produzida por
`src/paymentService.js:132`) é **indetectável a posteriori**. Sem `updated_at`,
sem histórico de status e sem autoria da alteração, o registro revertido é
indistinguível de um pagamento que nunca foi enviado — restando apenas o
`external_ref` remanescente como indício acidental.

RELATED_PROCESS: Modelagem e persistência de dados
RELATED_BUSINESS_RULE: BR-SUP-001, BR-PAY-001, BR-SEC-001 (todas dependentes exclusivamente da aplicação)
RELATED_REQUIREMENT: REQ-SIM2-001..006 (transversal)
RELATED_USE_CASE: Transversal
RELATED_ACCEPTANCE_CRITERIA: Transversal
RELATED_TEST: **nenhum** — não há teste de constraint de banco na suíte

BUSINESS_IMPACT:
Qualquer falha ou contorno da camada de aplicação (inclusive scripts de carga,
correções manuais ou caminhos futuros) corrompe silenciosamente dados
financeiros. A ausência de trilha de alteração compromete a capacidade de
auditoria retrospectiva de pagamentos e aprovações.

TECHNICAL_IMPACT:
Todas as invariantes concentradas em uma única camada, sem rede de proteção. A
denormalização de `company_id` sem amarração cria possibilidade de divergência
entre a empresa do pagamento e a do fornecedor, corrompendo qualquer filtro de
tenant baseado em `payments.company_id`.

SECURITY_IMPACT:
Perda de não-repúdio: alterações de estado não são atribuíveis nem datáveis.
Reduz drasticamente a força probatória da base para investigação de incidente.

REPRODUCTION:
1. `INSERT INTO payments (..., status, ...) VALUES (..., 'qualquer_coisa', ...)` → aceito.
2. `INSERT INTO payments (..., amount, ...) VALUES (..., -100, ...)` → aceito.
3. Inserir pagamento com `supplier_id` da empresa A e `company_id` da empresa B → aceito.
4. Executar `cancelPayment` sobre um pagamento `sent` e comparar o registro com um
   pagamento nunca enviado → indistinguíveis exceto por `external_ref`.

ROOT_CAUSE_HYPOTHESIS:
DDL escrito como mero suporte de persistência, sem transpor as restrições já
especificadas no dicionário de dados; ausência de requisitos de auditabilidade
(NFRs declarados como N/A em `SOFTWARE_RELEASE_PACKAGE.md:12`).

REFERENCE:
- `product/SIM-002/src/schema.sql:1-47`
- `product/SIM-002/requirements/DATA_DICTIONARY.md:28`, `:43`, `:44`, `:59`
- `product/SIM-002/SOFTWARE_RELEASE_PACKAGE.md:19-20` (DATA_MODEL / MIGRATIONS)
- FIND-SIM-002-004 (reversão indetectável), FIND-SIM-002-005 (unicidade ausente)

RECOMMENDATION:
Adicionar `CHECK` de domínio nas colunas de estado e de faixa em `amount` e
`credit_limit`; avaliar FK composta para amarrar o tenant do pagamento ao do
fornecedor; introduzir `updated_at` nas tabelas mutáveis e `created_by` em
`suppliers`; considerar trilha de transições de status. Migração deve ser
precedida de verificação de dados preexistentes. A VeriCore não implementa.

SUGGESTED_REMEDIATION_OWNER: SanaCore

RETEST_SPECIFICATION:
Testes executados **diretamente contra o banco**, contornando os serviços:
1. `INSERT`/`UPDATE` com status fora do domínio enumerado → rejeitado pelo banco,
   nas três colunas (`suppliers.status`, `payments.status`, `payment_attempts.result`).
2. `INSERT` de pagamento com `amount <= 0` → rejeitado; `credit_limit < 0` → rejeitado.
3. `INSERT` de pagamento cujo `company_id` difere do `company_id` do
   `supplier_id` referenciado → rejeitado.
4. Toda alteração em `suppliers` e `payments` atualiza `updated_at`; `suppliers`
   registra `created_by` no cadastro.
5. Não-regressão: a suíte funcional existente permanece verde após a migração.
