# FINDING

FINDING_ID: FIND-SIM-002-005
AUDIT_ID: SIM-002-AUD-001
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
PROJECT_ID: SIM-002
TITLE: BR-SUP-002 (unicidade de CNPJ) sem implementação em nenhuma camada; DDL contradiz o dicionário de dados
DOMAIN: Regra de negócio / Banco de dados
SUBDOMAIN: Integridade de cadastro
SEVERITY: HIGH
CONFIDENCE: CONFIRMED
STATUS: CLOSED
DETECTED_BY: business-rule, database, traceability, data-integrity, qa, documentation-consistency (6 de 8 trilhas)
VALIDATED_BY: vericore-finding-validator
VALIDATION_DATE: 2026-08-13
REMEDIATION_COMMIT: 9ce4754
RETEST_RESULT: RETEST_PASSED
CLOSED_BY: vericore-software-audit-director
CLOSED_DATE: 2026-08-13

DESCRIPTION:
A regra de unicidade de CNPJ não está implementada nem na aplicação nem no banco.
O dicionário de dados declara a coluna como `UNIQUE`, mas o DDL efetivamente
aplicado não possui a constraint — divergência documento × DDL.

EXPECTED_BEHAVIOR:
BR-SUP-002 (`requirements/BUSINESS_RULES.md:14-17`): "Não podem coexistir dois
fornecedores com o mesmo CNPJ, **independentemente da empresa** que os cadastrou."
AC-SIM2-001 (`requirements/REQUIREMENTS.md:16-17`): "Dado um CNPJ já existente no
sistema, então o cadastro é recusado."

ACTUAL_BEHAVIOR:
Cadastros com CNPJ idêntico são aceitos sem restrição, na mesma empresa ou em
empresas distintas, gerando múltiplos `suppliers.id` para a mesma pessoa jurídica.

EVIDENCE:
FILE: product/SIM-002/src/schema.sql
LINES: 12
```sql
  cnpj         TEXT NOT NULL,
```
Verificação exaustiva: o DDL completo (`src/schema.sql:1-47`) **não contém a
palavra `UNIQUE`** em nenhuma linha — nem como constraint de coluna, nem de
tabela, nem via `CREATE UNIQUE INDEX` (os três índices criados em `:45-47` são
todos não únicos).

FILE: product/SIM-002/src/supplierService.js
LINES: 12-39
```js
  function createSupplier({ cnpj, name, companyId }) {
    if (typeof cnpj !== 'string' || !CNPJ_PATTERN.test(cnpj)) {
      throw new Error('CNPJ inválido: informe 14 dígitos');
    }
    ...
    const company = db.get('SELECT id FROM companies WHERE id = ?', companyId);
    if (!company) {
      throw new Error('Empresa não encontrada');
    }
    ...
    const result = db.run(
      `INSERT INTO suppliers (company_id, cnpj, name, status, credit_limit, created_at)
       VALUES (?, ?, ?, 'pending', 0, ?)`,
```
A única validação sobre `cnpj` é de formato (`:13-15`, regex `^\d{14}$` em `:3`).
Não há nenhuma consulta de duplicidade antes do `INSERT` de `:29-36`.

FILE: product/SIM-002/requirements/DATA_DICTIONARY.md
LINES: 26
```
| `cnpj` | TEXT | **UNIQUE**, NOT NULL | CNPJ do fornecedor; identificador único no sistema (BR-SUP-002). |
```
Divergência direta: o dicionário afirma UNIQUE; o DDL não a implementa.

AUSÊNCIA DE TESTE: `product/SIM-002/tests/suppliers.test.js` cobre criação
(TC-SIM2-001, `:7-25`) e formato inválido (TC-SIM2-001b, `:27-41`), mas nenhum
teste tenta cadastrar CNPJ duplicado — a segunda sentença de AC-SIM2-001 não tem
prova.

RELATED_PROCESS: Cadastro de fornecedor
RELATED_BUSINESS_RULE: BR-SUP-002 (violada); BR-PAY-001 (burlada por encadeamento)
RELATED_REQUIREMENT: REQ-SIM2-001
RELATED_USE_CASE: Cadastrar fornecedor
RELATED_ACCEPTANCE_CRITERIA: AC-SIM2-001 (2ª sentença não realizada)
RELATED_TEST: **nenhum**

BUSINESS_IMPACT:
Multiplicação do teto de crédito da mesma pessoa jurídica: cadastrando o mesmo
CNPJ N vezes e aprovando cada cadastro, o fornecedor real acumula N × limite,
burlando BR-PAY-001 — cujo cálculo é feito por `supplier_id`
(`src/paymentService.js:26-35`), nunca por CNPJ. Duplicidade cadastral também
corrompe conciliação, relatórios fiscais e visão consolidada de exposição por
fornecedor.

TECHNICAL_IMPACT:
Ausência de constraint no banco significa que qualquer caminho de escrita
(inclusive futuro, ou carga direta) pode introduzir duplicatas. Corrigir apenas
na aplicação deixaria o dado desprotegido. A divergência doc × DDL torna o
dicionário de dados não confiável como especificação.

SECURITY_IMPACT:
Contorno de limite financeiro por duplicação de identidade da contraparte;
enfraquece o controle de alçada (um analista pode aprovar N cadastros de
R$ 10.000,00 para o mesmo CNPJ).

REPRODUCTION:
1. `createSupplier({ cnpj: '11222333000181', name: 'X', companyId: A })` → id 1.
2. `createSupplier({ cnpj: '11222333000181', name: 'X', companyId: A })` → id 2 (aceito).
3. `createSupplier({ cnpj: '11222333000181', name: 'X', companyId: B })` → id 3 (aceito).
4. Esperado por AC-SIM2-001: passos 2 e 3 recusados.

ROOT_CAUSE_HYPOTHESIS:
Constraint especificada no dicionário de dados e não transposta para o DDL;
validação de duplicidade nunca escrita na aplicação; ausência de teste negativo
que revelasse a lacuna.

REFERENCE:
- `product/SIM-002/requirements/BUSINESS_RULES.md:14-17` (BR-SUP-002)
- `product/SIM-002/requirements/REQUIREMENTS.md:7-18` (REQ-SIM2-001 / AC-SIM2-001)
- `product/SIM-002/requirements/DATA_DICTIONARY.md:26`
- `product/SIM-002/docs/API.md:35` (declara "Referências: REQ-SIM2-001, BR-SUP-002" para uma operação que não a implementa)
- `product/SIM-002/SOFTWARE_RELEASE_PACKAGE.md:10` (lista BR-SUP-002 como coberta)

RECOMMENDATION:
Implementar a unicidade **no banco** (constraint/índice único global sobre `cnpj`,
conforme a semântica "independentemente da empresa") e, adicionalmente, validar
na aplicação para produzir mensagem de negócio adequada. Antes da migração,
verificar duplicatas preexistentes. A VeriCore não implementa a correção.

SUGGESTED_REMEDIATION_OWNER: SanaCore

RETEST_SPECIFICATION:
1. Mesmo CNPJ, **mesma** empresa → segundo cadastro **recusado**, com mensagem de
   negócio, e `SELECT COUNT(*) FROM suppliers WHERE cnpj = ?` igual a 1.
2. Mesmo CNPJ, **empresas diferentes** → também **recusado** (a regra é global;
   este cenário distingue implementação correta de uma unicidade composta
   `(company_id, cnpj)`, que seria insuficiente).
3. CNPJs distintos continuam aceitos (não-regressão de TC-SIM2-001).
4. **Prova de camada de dados**: o `INSERT` duplicado deve ser rejeitado pelo
   próprio banco (constraint), não apenas pela aplicação — verificar por
   inserção direta via handle de banco, contornando o serviço.

---

## Validação (finding-validator)

VEREDITO: **CONFIRMED** — severidade HIGH **mantida**.

### Releitura independente do código e do DDL

Li `src/schema.sql` integralmente (47 linhas) e `src/supplierService.js`
integralmente (65 linhas). Confirmo os dois fatos centrais:
- `suppliers.cnpj` é declarado apenas `TEXT NOT NULL` (`:12`); os três índices
  (`:45-47`) são `CREATE INDEX`, não `CREATE UNIQUE INDEX`; não há `PRAGMA`,
  trigger ou constraint de tabela.
- `createSupplier` (`:12-39`) valida formato (`:13-15`), nome (`:16-18`),
  `companyId` (`:19-21`) e existência da empresa (`:23-26`) — e insere. Não há
  `SELECT` de duplicidade em nenhum ponto.

### Onde procurei controle compensatório (e o que NÃO encontrei)

1. **Constraint no banco** — busca por `UNIQUE`, `CHECK`, `TRIGGER`, `BEGIN` em
   todo `product/SIM-002/`: a **única** ocorrência da palavra "UNIQUE" no projeto
   está no texto do `DATA_DICTIONARY.md:26`. Nenhuma no DDL. Refutação por
   camada de dados: impossível.
2. **Validação em outra camada/serviço** — `approvalService` e `paymentService`
   operam por `supplier_id` e nunca consultam `cnpj` (grep confirma: `cnpj`
   aparece apenas em `supplierService.js`, `schema.sql`, testes e documentação).
   Nenhum serviço adjacente deduplicaria a contraparte.
3. **Guarda no chamador** — sem transporte/middleware; `createSupplier` é
   exportado e chamado apenas pelos testes.
4. **Teste que cubra** — reli `tests/suppliers.test.js` inteiro: TC-SIM2-001 e
   TC-SIM2-001b; nenhum cadastro duplicado. A 2ª sentença de AC-SIM2-001 está
   sem prova, como alegado.

### Tentativa de refutação por severidade

Argumento testado para **rebaixar**: "duplicidade cadastral é higiene de dados,
não defeito financeiro — MEDIUM". **Rejeitado**: o teto de BR-PAY-001 é calculado
por `supplier_id` (`src/paymentService.js:26-35`), nunca por CNPJ; portanto cada
cadastro duplicado cria um teto adicional para a mesma pessoa jurídica. O contorno
do controle financeiro é direto e trivial.

Argumento testado para **elevar a CRITICAL**: o encadeamento com FIND-SIM-002-001
permite exposição não delimitada por analista. Considerei, mas **mantenho HIGH**:
a exploração exige N cadastros e N aprovações (ações visíveis, com `approved_by`
registrado em `suppliers.approved_by`, `schema.sql:16`), enquanto os CRITICAL
confirmados (-001 a -004) exigem ação única e/ou não deixam rastro algum. A
diferença de detectabilidade justifica manter a separação de severidade.

### Nota de escopo (não é duplicata)

A lacuna de DDL aqui apontada é específica de BR-SUP-002 e distinta do agregado
de defesa em profundidade de FIND-SIM-002-012 (CHECKs, FK composta, `updated_at`).
Também distinta do índice ausente sobre `suppliers.cnpj` (FIND-SIM-002-013,
Bloco D), que é consequência de performance da remediação deste finding. Sem
duplicidade; recomendo remediação coordenada.

---

## Fechamento (software-audit-director)

DATA: 2026-08-13
REMEDIATION_COMMIT ACEITO: `9ce4754` (WAVE-C)
RETEST_REPORT: `audit/runs/SIM-002-AUD-001/30-retest/RETEST_REPORT.md` §1.4
EXECUÇÃO DO RETESTE: `vericore-audit-verification-runner`, harness próprio fora
do repositório

RESULTADO DO RETESTE: **RETEST_PASSED**, com os quatro itens da
`RETEST_SPECIFICATION` atendidos:
1. Mesmo CNPJ, **mesma** empresa → recusado com erro de negócio legível.
2. Mesmo CNPJ, **empresas diferentes** → também recusado. Este é o item
   discriminante: comprova unicidade **global**, e não uma unicidade composta
   `(company_id, cnpj)`, que seria insuficiente para a semântica
   "independentemente da empresa" de BR-SUP-002.
3. CNPJs distintos seguem aceitos — não-regressão de TC-SIM2-001; suíte 22/22.
4. **Prova de camada de dados executada**: `INSERT` direto pelo handle de banco,
   **contornando o serviço**, falhou com
   `UNIQUE constraint failed: suppliers.cnpj`. A constraint está no banco, e não
   apenas na aplicação — exatamente o ponto que o finding apontava como
   indispensável e que a spec exigia provar.

DIVERGÊNCIA DOC × DDL: resolvida **no sentido correto** — o DDL passou a honrar
`DATA_DICTIONARY.md:26` (`UNIQUE`), em vez de o dicionário ser rebaixado ao DDL.
O autoíndice de unicidade presente no schema também endereça, incidentalmente, o
Bloco D de FIND-SIM-002-013 quanto a índice sobre `suppliers.cnpj`;
FIND-SIM-002-013 **permanece aberto** pelos demais blocos.

DECLARAÇÃO: **FINDING CLOSED**, nos termos da **Regra 4** do `CLAUDE.md`.
Fechamento fundado em reteste independente sobre commit identificado, incluindo
prova na camada de dados. Não constitui `REMEDIATION COMPLETE` (Regra 3) nem
auditoria do commit remediado como um todo (Regras 12-14).
