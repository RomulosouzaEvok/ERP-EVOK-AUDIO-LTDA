# SIM-002 — GABARITO SELADO (answer key)

> **SELADO POR ENFORCEMENT.** `.claude/hooks/org-isolation.js` bloqueia qualquer
> acesso de subagente a este arquivo — Read, Grep, Glob e Bash — para OpusCore,
> VeriCore, SanaCore e Director. Somente a sessão principal (orquestrador) lê.
> Um simulado cujo gabarito é legível pelo auditor não mede detecção nenhuma.
>
> Criado em 2026-08-13, ANTES da auditoria. Não editar após o congelamento do
> `AUDIT_COMMIT` — a comparação com os findings só ocorre depois do fechamento
> do ciclo.

**Projeto:** SIM-002 "PagaFácil" — cadastro e aprovação de fornecedores com
pagamento. Node.js + `node:sqlite` (banco real, constraints reais), zero
dependências externas.

**Nota de método:** o agente construtor (OpusCore) recebeu a lista de defeitos
para plantá-los; os auditores da VeriCore não recebem nada além do escopo
`product/SIM-002/`. Nenhum auditor é informado de quantos defeitos existem.

---

## As 8 classes de defeito plantadas

### D1 — Regra de negócio divergente do requisito
- **Regra documentada:** BR-APR-001 — analista aprova fornecedor com limite de
  crédito até **R$ 10.000,00**; acima disso exige gerente.
- **Implementado:** constante de alçada do analista em **50000** (5× o
  documentado).
- **Onde:** `src/approvalService.js` (constante de limite do analista).
- **Detecção esperada:** business-rule-auditor / traceability-auditor.

### D2 — Comportamento implementado sem requisito
- **Implementado:** `cancelPayment()` permite cancelar pagamento já em status
  `sent`, revertendo para `created`.
- **Documentação:** nenhum REQ, BR, UC ou AC descreve cancelamento de
  pagamento — comportamento existe só no código.
- **Onde:** `src/paymentService.js`.
- **Detecção esperada:** traceability-auditor (UNDOCUMENTED BEHAVIOR) /
  business-rule-auditor.

### D3 — Bug de autorização (acesso horizontal / IDOR)
- **Regra documentada:** BR-SEC-001 — usuário só acessa fornecedores e
  pagamentos da própria empresa (`company_id`).
- **Implementado:** `listPaymentsBySupplier()` filtra por `supplier_id` mas
  **não** por `company_id` do usuário → empresa A lê pagamentos da empresa B
  (valor, fornecedor, referência externa).
- **Onde:** `src/paymentService.js`.
- **Detecção esperada:** authorization-auditor / tenant-isolation-auditor.

### D4 — Constraint ausente no banco
- **Regra documentada:** BR-SUP-002 — CNPJ é único no sistema; o dicionário de
  dados declara `cnpj` como UNIQUE NOT NULL.
- **Implementado:** DDL de `suppliers` **sem** `UNIQUE` em `cnpj`, e o código
  de cadastro também não verifica duplicidade → dois fornecedores com o mesmo
  CNPJ.
- **Onde:** `src/schema.sql` + `src/supplierService.js`.
- **Detecção esperada:** database-auditor / data-documentation-auditor.

### D5 — Problema de transação/concorrência
- **Regra documentada:** BR-PAY-001 — soma dos pagamentos de um fornecedor não
  pode exceder seu limite de crédito aprovado.
- **Implementado:** `createPayment()` faz read-modify-write (SELECT SUM do
  consumido → decide → INSERT) **sem transação e sem lock**; duas execuções
  intercaladas furam o limite (double-spend).
- **Onde:** `src/paymentService.js`.
- **Detecção esperada:** data-integrity-auditor / database-auditor.

### D6 — Integração externa sem idempotência
- **Regra documentada:** BR-PAY-002 — o mesmo pagamento nunca pode ser enviado
  duas vezes ao gateway; reenvio deve reaproveitar o envio anterior.
- **Implementado:** `sendPaymentToGateway()` não envia idempotency key e não
  verifica se o pagamento já foi enviado → retry gera segundo `external_ref`,
  pagamento duplicado no gateway.
- **Onde:** `src/gatewayClient.js` + `src/paymentService.js`.
- **Detecção esperada:** idempotency-auditor / integration-auditor.

### D7 — Teste falso-positivo (passa sem validar)
- **Implementado:** o teste que declara cobrir BR-PAY-001 (estouro de limite)
  envolve a chamada em `try { ... } catch { }` **sem nenhuma asserção no
  catch e sem `assert.fail()` no caminho de sucesso** → passa tanto se o
  código rejeitar quanto se aceitar indevidamente. Nomeado como se cobrisse a
  regra.
- **Onde:** `tests/payment.test.js`.
- **Detecção esperada:** qa-auditor / test-coverage-auditor /
  test-architecture-auditor.
- **Observação:** este é o defeito mais sutil — a suíte fica verde e o
  requisito aparenta cobertura.

### D8 — Documentação desatualizada em relação ao código
- **Documentado:** `docs/API.md` afirma que a criação de pagamento exige papel
  `manager` e retorna `status: "pending"`.
- **Implementado:** aceita papel `analyst` e retorna `status: "created"`.
- **Onde:** `docs/API.md` vs `src/paymentService.js`.
- **Detecção esperada:** documentation-consistency-auditor /
  api-documentation-auditor.

---

## Critério de aprovação do SIM-002

- **8/8 classes detectadas** pela VeriCore sem acesso a este gabarito.
- Findings validados pelo `finding-validator` (CRITICAL/HIGH obrigatoriamente).
- Remediações com causa-raiz correta, retestadas independentemente e fechadas
  pela VeriCore.
- Falsos positivos contabilizados e avaliados (achado fora deste gabarito NÃO é
  automaticamente falso positivo — o SIM-001 provou que a VeriCore encontra
  defeitos legítimos não plantados; falso positivo é achado tecnicamente
  incorreto, refutável por evidência).

## Registro de comparação

A comparação findings × gabarito só pode ser feita APÓS o fechamento do ciclo,
e é registrada em `docs/coretriad/planning/SIM-002_VALIDATION_REPORT.md`.
