# FINDING

FINDING_ID: FIND-SIM-002-001
AUDIT_ID: SIM-002-AUD-001
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
PROJECT_ID: SIM-002
TITLE: Alçada do analista implementada em 50000, contra o teto de R$ 10.000,00 da BR-APR-001
DOMAIN: Regra de negócio
SUBDOMAIN: Aprovação / alçada financeira
SEVERITY: CRITICAL
CONFIDENCE: CONFIRMED
STATUS: CONFIRMED
DETECTED_BY: business-rule, authorization, traceability, qa, documentation-consistency, data-integrity (6 de 8 trilhas)
VALIDATED_BY: vericore-finding-validator
VALIDATION_DATE: 2026-08-13

DESCRIPTION:
A constante que rege a alçada do papel `analyst` está fixada em `50000`, enquanto
a regra de negócio normativa estabelece o teto de R$ 10.000,00 (inclusive) para
esse papel. A implementação concede ao analista 5× a alçada que o negócio lhe
atribui.

EXPECTED_BEHAVIOR:
Conforme BR-APR-001 (`product/SIM-002/requirements/BUSINESS_RULES.md:24-27`):
limite aprovado até R$ 10.000,00 (inclusive) → `analyst` ou `manager`; acima de
R$ 10.000,00 → exclusivamente `manager`. Aprovação por papel sem alçada
suficiente deve ser recusada (`:29`).

ACTUAL_BEHAVIOR:
`analyst` aprova qualquer limite até 50000 inclusive. A faixa 10.000,01–50.000,00
é aceita indevidamente. Somente acima de 50000 a recusa ocorre.

EVIDENCE:
FILE: product/SIM-002/src/approvalService.js
LINES: 3
```js
const ANALYST_APPROVAL_LIMIT = 50000;
```

FILE: product/SIM-002/src/approvalService.js
LINES: 37-39
```js
    if (approver.role === 'analyst' && creditLimit > ANALYST_APPROVAL_LIMIT) {
      throw new Error('Limite de crédito acima da alçada do analista: requer gerente');
    }
```

FILE: product/SIM-002/requirements/BUSINESS_RULES.md
LINES: 24-27
```
| Limite de crédito aprovado | Papel exigido |
|---|---|
| Até R$ 10.000,00 (inclusive) | `analyst` ou `manager` |
| Acima de R$ 10.000,00 | `manager` |
```

EVIDÊNCIA COMPLEMENTAR (cegueira da suíte): os dois testes de alçada usam 8000
(`product/SIM-002/tests/approval.test.js:22`) e 200000 (`:43`), ambos fora da
faixa discriminante 10.001–50.000; por isso a suíte passa com a regra errada.

RELATED_PROCESS: Aprovação de fornecedor com controle de alçada
RELATED_BUSINESS_RULE: BR-APR-001 (violada); BR-PAY-001 (impactada por encadeamento)
RELATED_REQUIREMENT: REQ-SIM2-002
RELATED_USE_CASE: Aprovar fornecedor
RELATED_ACCEPTANCE_CRITERIA: AC-SIM2-002
RELATED_TEST: TC-SIM2-002 (`tests/approval.test.js:15-33`), TC-SIM2-002b (`:35-58`) — ambos passam sem detectar a divergência

BUSINESS_IMPACT:
Quebra de segregação de alçada financeira. Um analista pode conceder crédito até
R$ 50.000,00 sem qualquer participação gerencial. Como o `credit_limit` aprovado
é exatamente o teto consumido por BR-PAY-001 (`src/paymentService.js:51`), o
excesso de alçada converte-se diretamente em capacidade de pagamento: o analista
aprova o fornecedor e, com o mesmo papel, registra os pagamentos
(`src/paymentService.js:3` admite `analyst`), fechando o ciclo sem segunda pessoa.
Exposição por fornecedor: R$ 40.000,00 acima do autorizado.

TECHNICAL_IMPACT:
Constante de política de negócio embutida em código, sem parametrização,
sem referência à BR na fonte e sem teste de fronteira que a ancore.

SECURITY_IMPACT:
Falha de controle de autorização por valor (privilege scope). Combinada com a
autorização de `createPayment` ao mesmo papel `analyst`, elimina a segregação de
funções entre quem concede crédito e quem o consome.

REPRODUCTION:
1. Cadastrar fornecedor `pending` na empresa A.
2. Chamar `approveSupplier({ supplierId, creditLimit: 49999, approver: { role: 'analyst', companyId: A } })`.
3. Observado: retorno com `status = 'approved'` e `credit_limit = 49999`.
4. Esperado por BR-APR-001: erro e fornecedor permanecendo `pending` com `credit_limit = 0`.

ROOT_CAUSE_HYPOTHESIS:
Valor de alçada transcrito incorretamente da regra para o código (10000 → 50000),
não detectado por ausência de teste na fronteira normativa.

REFERENCE:
- `product/SIM-002/requirements/BUSINESS_RULES.md:19-29` (BR-APR-001)
- `product/SIM-002/requirements/REQUIREMENTS.md:20-31` (REQ-SIM2-002 / AC-SIM2-002)
- `product/SIM-002/docs/API.md:52` ("`analyst` (dentro da sua alçada) ou `manager`" — não numera a alçada)
- `product/SIM-002/SOFTWARE_RELEASE_PACKAGE.md:26-27` (matriz de autorização, também sem valor numérico)

RECOMMENDATION:
Alinhar a constante ao valor normativo (10000) e tornar a comparação explícita
quanto à inclusividade do teto ("até R$ 10.000,00 inclusive"). Adicionar testes
de fronteira exata. A VeriCore não implementa a correção (Regra 2 do CLAUDE.md).

SUGGESTED_REMEDIATION_OWNER: SanaCore

RETEST_SPECIFICATION:
Reteste executável, obrigatório em todos os quatro cenários:
1. `analyst` + `creditLimit = 10000` → **ACEITA**; fornecedor `approved` com `credit_limit = 10000`.
2. `analyst` + `creditLimit = 10000.01` → **RECUSA**; e verificação pós-condição:
   o fornecedor permanece `status = 'pending'` e `credit_limit = 0` (releitura do banco,
   não apenas a exceção).
3. `analyst` + `creditLimit = 49999` → **RECUSA** (fronteira que hoje passa).
4. `manager` + `creditLimit = 25000` → **ACEITA**.
Critério de aprovação: os quatro cenários com asserção explícita; o cenário 3
deve falhar contra o código do `AUDIT_COMMIT` e passar após a remediação.

---

## Validação (finding-validator)

VEREDITO: **CONFIRMED** — severidade CRITICAL **mantida**.

### Releitura independente do código

Reli `product/SIM-002/src/approvalService.js` no `AUDIT_COMMIT` sem me apoiar na
descrição do finding. Os fatos materiais conferem: `ANALYST_APPROVAL_LIMIT = 50000`
(`:3`) e a única guarda de alçada é `creditLimit > ANALYST_APPROVAL_LIMIT` para o
papel `analyst` (`:37-39`). Nenhuma guarda análoga existe para `manager` (por
desenho da BR, correto).

### Onde procurei controle compensatório (e o que NÃO encontrei)

1. **Outra camada de validação de valor de alçada** — busca por
   `ANALYST_APPROVAL_LIMIT` em todo o repositório: aparece apenas em
   `src/approvalService.js` (definição, uso e export) e em artefatos de auditoria.
   Nenhum wrapper, decorator ou serviço adjacente reavalia a alçada.
2. **Guarda anterior no fluxo do chamador** — não existe transporte HTTP,
   middleware, gateway de API ou camada de autenticação
   (`SOFTWARE_RELEASE_PACKAGE.md:16` e `:36`). Os únicos chamadores de
   `approveSupplier` no repositório são os testes. Não há guarda a montante.
3. **Constraint no DDL** — `src/schema.sql:1-47` não contém `CHECK`, `TRIGGER`
   nem qualquer restrição sobre `credit_limit` além de `NOT NULL DEFAULT 0`
   (busca por `CHECK`/`UNIQUE`/`TRIGGER` em todo `product/SIM-002/`: única
   ocorrência é a palavra "UNIQUE" no `DATA_DICTIONARY.md:26`, texto, não DDL).
   O banco aceita qualquer `credit_limit`.
4. **Teto secundário no consumo do crédito** — `createPayment`
   (`src/paymentService.js:51`) compara contra `supplier.credit_limit`, ou seja,
   consome exatamente o valor indevidamente concedido. Não há teto absoluto
   independente que limitasse o dano.
5. **Norma que legitimasse 50000** — varri `BUSINESS_RULES.md` inteiro, `REQUIREMENTS.md`
   (REQ-SIM2-002/AC-SIM2-002), `docs/API.md:48-59` e a AUTHORIZATION_MATRIX
   (`SOFTWARE_RELEASE_PACKAGE.md:24-29`). Nenhum artefato versionado enuncia
   50.000 nem qualquer exceção à BR-APR-001. A BR-APR-001 é a **única** fonte
   normativa quantitativa e não tem concorrente — não há aqui a lacuna normativa
   que existe em FIND-SIM-002-008.

### Tentativa de refutação por severidade

Argumento de refutação testado: "a exposição é limitada a R$ 40.000 por fornecedor
e exige um insider com papel `analyst` legítimo, logo seria HIGH e não CRITICAL".
**Rejeitado**, por dois motivos verificados no código: (a) o dano não é limitado por
fornecedor — na ausência de unicidade de CNPJ (FIND-SIM-002-005, também confirmado)
o mesmo CNPJ pode ser recadastrado N vezes e aprovado N vezes pelo mesmo analista,
tornando a exposição não delimitada; (b) o ciclo completo concessão→consumo é
executável por um único papel, pois `PAYER_ROLES` (`src/paymentService.js:3`)
inclui `analyst` — não há segunda pessoa em nenhum ponto do fluxo. Quebra total de
segregação de funções sobre saída de caixa sustenta CRITICAL.

Ressalva registrada: o item (b) depende do papel de pagamento, que é objeto de
lacuna normativa em FIND-SIM-002-008 (divergência A). Ainda que a decisão humana
venha a restringir `createPayment` a `manager`, a violação de BR-APR-001 permanece
integralmente e o item (a) sozinho sustenta a severidade.

### Reprodutibilidade

Tecnicamente demonstrável por leitura direta e reproduzível pelo passo-a-passo do
finding, sem dependência de ambiente: `creditLimit = 49999` com `role: 'analyst'`
percorre `:37-39` sem lançar e alcança o `UPDATE` de `:42-50`. Aceito como prova.
