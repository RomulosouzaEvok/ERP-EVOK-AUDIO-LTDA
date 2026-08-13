# FINDING

FINDING_ID: FIND-SIM-002-010
AUDIT_ID: SIM-002-AUD-001
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
PROJECT_ID: SIM-002
TITLE: approveSupplier faz check-then-act sem compare-and-swap — aprovações concorrentes sobrescrevem a decisão anterior
DOMAIN: Integridade de dados
SUBDOMAIN: Concorrência / trilha de aprovação
SEVERITY: MEDIUM
CONFIDENCE: CONFIRMED
STATUS: PROPOSED
DETECTED_BY: data-integrity, database, business-rule (3 de 8 trilhas)

DESCRIPTION:
`approveSupplier` lê o fornecedor, valida que ele ainda não está aprovado e em
seguida executa um `UPDATE` cujo `WHERE` filtra apenas por `id`, sem repetir a
condição de estado. A guarda "já aprovado" é verificada no momento da leitura e
não é reimposta no momento da escrita.

EXPECTED_BEHAVIOR:
A transição `pending → approved` deve ocorrer no máximo uma vez por fornecedor.
A rejeição "Fornecedor já está aprovado" (`src/approvalService.js:33-35`)
evidencia que a unicidade da aprovação é intencional; ela precisa ser garantida
também sob concorrência, por transação ou por atualização condicional (CAS).

ACTUAL_BEHAVIOR:
Duas aprovações concorrentes do mesmo fornecedor podem ambas ler `status = 'pending'`,
ambas passar pela guarda e ambas executar o `UPDATE`. A última escrita vence,
sobrescrevendo `credit_limit`, `approved_by` e `approved_at` da primeira. A
primeira decisão desaparece sem qualquer registro.

EVIDENCE:
FILE: product/SIM-002/src/approvalService.js
LINES: 24-35
```js
    const supplier = db.get(
      'SELECT * FROM suppliers WHERE id = ? AND company_id = ?',
      supplierId,
      approver.companyId
    );

    if (!supplier) {
      throw new Error('Fornecedor não encontrado');
    }
    if (supplier.status === 'approved') {
      throw new Error('Fornecedor já está aprovado');
    }
```

FILE: product/SIM-002/src/approvalService.js
LINES: 42-50
```js
    db.run(
      `UPDATE suppliers
          SET status = 'approved', credit_limit = ?, approved_by = ?, approved_at = ?
        WHERE id = ?`,
      creditLimit,
      approver.id,
      now,
      supplierId
    );
```
Verificado: o `WHERE` de `:45` filtra apenas por `id` — não repete
`AND status <> 'approved'` nem `AND company_id = ?`; não há verificação de linhas
afetadas; não há transação envolvendo a leitura de `:24` e a escrita de `:42`
(o handle de `src/db.js:20-38` não expõe primitiva transacional).

Observação de escopo: como `approveSupplier` é síncrona (`:13`) e o driver
`node:sqlite` é síncrono, a janela não é explorável por intercalação de event
loop dentro de um único processo — mas é plenamente explorável por múltiplos
processos/conexões sobre o mesmo arquivo de banco, cenário previsto por
`src/db.js:15` (o parâmetro `location` aceita caminho de arquivo). Fator
considerado na severidade MEDIUM.

RELATED_PROCESS: Aprovação de fornecedor
RELATED_BUSINESS_RULE: BR-APR-001 (alçada); BR-SEC-001 (tenant não reimposto na escrita)
RELATED_REQUIREMENT: REQ-SIM2-002
RELATED_USE_CASE: Aprovar fornecedor
RELATED_ACCEPTANCE_CRITERIA: AC-SIM2-002
RELATED_TEST: TC-SIM2-002 (`tests/approval.test.js:15-33`) e TC-SIM2-002d (`:78-94`) — sequenciais; nenhum teste de reaprovação nem de concorrência

BUSINESS_IMPACT:
Destruição silenciosa de decisão de crédito: a aprovação de um gerente pode ser
sobrescrita pela de outro aprovador sem rastro. Como `credit_limit` é o teto
consumido por BR-PAY-001, o valor efetivo passa a depender de ordem de execução.
Encadeado com FIND-SIM-002-001, um analista poderia sobrescrever limite concedido
por gerente dentro da (excessiva) alçada implementada.

TECHNICAL_IMPACT:
Padrão check-then-act sem CAS; a ausência de reimposição de `company_id` no
`WHERE` também remove a defesa em profundidade de tenant na escrita. Não há como
distinguir, a posteriori, uma primeira de uma segunda aprovação: a tabela
`suppliers` guarda apenas o último `approved_by`/`approved_at`, sem histórico
(ver FIND-SIM-002-012, ausência de `updated_at` e de trilha).

SECURITY_IMPACT:
Corrupção da trilha de responsabilidade da aprovação: o registro de quem aprovou
o crédito vigente pode não corresponder à decisão efetivamente tomada em primeiro
lugar.

REPRODUCTION:
Requer duas conexões/processos sobre o mesmo arquivo de banco:
1. Fornecedor S em `pending`.
2. Processo 1 e processo 2 leem S (`status = 'pending'`) antes de qualquer escrita.
3. Processo 1 aprova com limite 10000 (`approved_by = 'gerson'`).
4. Processo 2 aprova com limite 3000 (`approved_by = 'ana'`).
5. Observado: S com `credit_limit = 3000`, `approved_by = 'ana'` — a decisão do
   passo 3 é irrecuperável.
6. Esperado: a segunda aprovação recusada com "Fornecedor já está aprovado".

ROOT_CAUSE_HYPOTHESIS:
Guarda de estado implementada apenas em memória, após leitura, sem reimposição na
cláusula `WHERE` do `UPDATE` nem transação.

REFERENCE:
- `product/SIM-002/requirements/BUSINESS_RULES.md:19-29` (BR-APR-001)
- `product/SIM-002/requirements/REQUIREMENTS.md:20-31` (REQ-SIM2-002 / AC-SIM2-002)
- `product/SIM-002/requirements/DATA_DICTIONARY.md:28-31` (`status`, `approved_by`, `approved_at`)
- `product/SIM-002/src/db.js:15-39` (handle sem transação)

RECOMMENDATION:
Tornar a atualização condicional (`WHERE id = ? AND company_id = ? AND status <> 'approved'`)
e verificar o número de linhas afetadas para decidir entre sucesso e rejeição;
alternativamente, envolver leitura e escrita em transação. A VeriCore não
implementa.

SUGGESTED_REMEDIATION_OWNER: SanaCore

RETEST_SPECIFICATION:
1. Reaprovação sequencial: aprovar S; aprovar S novamente → segunda chamada
   **rejeitada** com "Fornecedor já está aprovado"; `credit_limit`, `approved_by`
   e `approved_at` **inalterados** (asserção de pós-condição, não apenas da exceção).
2. Concorrência multi-conexão: duas aprovações simultâneas do mesmo fornecedor →
   **exatamente uma** bem-sucedida; o estado final corresponde à vencedora e a
   perdedora recebe rejeição.
3. Defesa de tenant na escrita: aprovador de outra empresa não altera o registro
   (não-regressão de TC-SIM2-002d) — verificado por releitura do banco.
4. Verificação estrutural: o `UPDATE` reimpõe a condição de estado, ou existe
   transação demarcada cobrindo leitura e escrita.
