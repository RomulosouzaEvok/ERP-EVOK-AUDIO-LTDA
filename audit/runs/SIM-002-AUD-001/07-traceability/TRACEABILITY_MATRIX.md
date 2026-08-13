# TRACEABILITY MATRIX — SIM-002-AUD-001

AUDIT_ID: SIM-002-AUD-001
AUDIT_COMMIT: `f2fcf1c78a6a1255738d05e66a6100fa9c47428a`
DATA: 2026-08-13
TRILHA RESPONSÁVEL: traceability (corroborada por business-rule, qa, database,
authorization, documentation-consistency)

Legenda de status:

- **PROVADO** — regra implementada e coberta por teste que efetivamente a prova.
- **DIVERGENTE** — implementação existe, mas contradiz a norma.
- **PARCIAL** — implementada em parte dos caminhos de execução.
- **FALSO-POSITIVO** — teste existe, passa, e não prova nada.
- **INEXISTENTE** — sem implementação e/ou sem teste.

---

## 1. Matriz BR × REQ × AC × Implementação × Teste

| BR | REQ | AC | Implementação (arquivo:linha) | Teste | Status | Finding |
|---|---|---|---|---|---|---|
| BR-SUP-001 — pagamento exige fornecedor aprovado (`BUSINESS_RULES.md:8-12`) | REQ-SIM2-003 | AC-SIM2-003 | `src/paymentService.js:19-21` (`status !== 'approved'` → erro), invocado em `:48` | TC-SIM2-003c (`tests/payments.test.js:62-82`, `assert.rejects(/não está aprovado/)`) | **PROVADO** | — |
| BR-SUP-002 — unicidade de CNPJ (`BUSINESS_RULES.md:14-17`) | REQ-SIM2-001 | AC-SIM2-001 | **Nenhuma.** `src/supplierService.js:12-39` não consulta duplicidade; `src/schema.sql:12` declara `cnpj TEXT NOT NULL` sem `UNIQUE` (o DDL inteiro, linhas 1-47, não contém a palavra `UNIQUE`) | **Nenhum.** `tests/suppliers.test.js` cobre formato (TC-SIM2-001b) mas não duplicidade | **INEXISTENTE** (impl + teste) | FIND-SIM-002-005 |
| BR-APR-001 — alçada de aprovação (`BUSINESS_RULES.md:19-29`; teto R$ 10.000,00 na tabela `:24-27`) | REQ-SIM2-002 | AC-SIM2-002 | `src/approvalService.js:3` (`ANALYST_APPROVAL_LIMIT = 50000`) e `:37-39` | TC-SIM2-002 (8000, `approval.test.js:15-33`) e TC-SIM2-002b (200000, `:35-58`) — ambos fora da faixa discriminante 10.001–50.000 | **DIVERGENTE** (5× a alçada normativa; teste cego à divergência) | FIND-SIM-002-001, FIND-SIM-002-013 |
| BR-PAY-001 — teto de crédito (`BUSINESS_RULES.md:31-34`) | REQ-SIM2-003 | AC-SIM2-003 | `src/paymentService.js:26-35` (`sumCommittedAmount`) + `:49` + decisão em `:51-53` — **implementação PROVADA por leitura** | TC-SIM2-003b (`tests/payments.test.js:43-60`) — `try/catch` sem asserção: **FALSO-POSITIVO** | impl PROVADA / teste **FALSO-POSITIVO**; ainda assim não-atômica | FIND-SIM-002-007, FIND-SIM-002-006 |
| BR-PAY-002 — idempotência de envio (`BUSINESS_RULES.md:36-41`) | REQ-SIM2-004 | AC-SIM2-004 (2ª sentença) | **Nenhuma.** `src/paymentService.js:72-105` só barra `cancelled` (`:78-80`); não testa `status === 'sent'`, não reaproveita `external_ref`, sobrescreve-o em `:97-102`; `src/gatewayClient.js:13-26` não aceita chave de idempotência | **Nenhum.** TC-SIM2-004 (`payments.test.js:84-111`) executa **um único** `sendPayment` e afirma `callsFor(id).length === 1` — não há segundo envio | **INEXISTENTE** (impl + teste) | FIND-SIM-002-003 |
| BR-SEC-001 — isolamento por empresa (`BUSINESS_RULES.md:43-47`) | REQ-SIM2-002/003/005/006 | AC-SIM2-005, AC-SIM2-006 | **3 de 4 caminhos de leitura filtram**: `supplierService.js:49-53`, `approvalService.js:24-28`, `paymentService.js:10-14`. **Falha isolada**: `paymentService.js:110-119` valida `user.companyId` em `:111-113` e o descarta no SQL de `:115-118`. Escrita sem sujeito: `supplierService.js:12-39` e `paymentService.js:124-138` | TC-SIM2-002d, TC-SIM2-006 cobrem os caminhos corretos; **nenhum** teste cruza empresa em `listPaymentsBySupplier` | **PARCIAL** (3 de 4 leituras; 2 escritas sem sujeito) | FIND-SIM-002-002, FIND-SIM-002-011, FIND-SIM-002-004 |

### 1.1 Rastreabilidade reversa AC → prova

| AC | Exigência textual | Provada? |
|---|---|---|
| AC-SIM2-001 (`REQUIREMENTS.md:14-17`) | "Dado um CNPJ já existente no sistema, então o cadastro é recusado" | **NÃO** — sem impl, sem teste (FIND-005) |
| AC-SIM2-002 (`:26-30`) | analyst dentro da alçada aprova; acima recusa | **NÃO** — faixa da alçada é a errada (FIND-001) |
| AC-SIM2-003 (`:40-44`) | soma que excede o limite → recusa; status `created` | Impl sim; prova de teste **NÃO** (FIND-007) |
| AC-SIM2-004 (`:53-57`) | "pagamento já enviado → envio anterior reaproveitado, nenhuma nova movimentação" | **NÃO** — sem impl, sem teste (FIND-003) |
| AC-SIM2-005 (`:66-69`) | "Dado um usuário de outra empresa, então a listagem é recusada" | **NÃO** — SQL sem `company_id` (FIND-002) |
| AC-SIM2-006 (`:78-81`) | consulta cruzada recusada | **SIM** — `supplierService.js:49-57` + TC-SIM2-006 (`suppliers.test.js:60-66`) |

## 2. Inventário de funções exportadas — "tem requisito?"

Fonte da coluna "Origem documental": `product/SIM-002/docs/API.md` e
`SOFTWARE_RELEASE_PACKAGE.md:18` (API_CONTRACTS).

| Função exportada | Arquivo:linha | REQ | AC | Documentada em `docs/API.md` | Consta em API_CONTRACTS do release | Tem requisito? |
|---|---|---|---|---|---|---|
| `createSupplier` | `src/supplierService.js:12-39` (export `:62`) | REQ-SIM2-001 | AC-SIM2-001 | Sim (`:26-35`) | Sim | **SIM** |
| `getSupplier` | `src/supplierService.js:44-60` (export `:62`) | REQ-SIM2-006 | AC-SIM2-006 | Sim (`:37-46`) | Sim | **SIM** |
| `approveSupplier` | `src/approvalService.js:13-53` (export `:55`) | REQ-SIM2-002 | AC-SIM2-002 | Sim (`:48-59`) | Sim | **SIM** |
| `createPayment` | `src/paymentService.js:40-67` (export `:140`) | REQ-SIM2-003 | AC-SIM2-003 | Sim (`:61-72`) — com 2 divergências | Sim | **SIM** (contrato divergente: FIND-008) |
| `sendPayment` | `src/paymentService.js:72-105` (export `:140`) | REQ-SIM2-004 | AC-SIM2-004 | Sim (`:74-86`) | Sim | **SIM** (2ª sentença do AC não realizada) |
| `listPaymentsBySupplier` | `src/paymentService.js:110-119` (export `:140`) | REQ-SIM2-005 | AC-SIM2-005 | Sim (`:88-96`) | Sim | **SIM** (isolamento não realizado) |
| **`cancelPayment`** | **`src/paymentService.js:124-138` (export `:140`)** | **nenhum** | **nenhum** | **NÃO** — ausente em todo o `docs/API.md` | **NÃO** — ausente em `SOFTWARE_RELEASE_PACKAGE.md:18` | **NÃO — SEM ORIGEM DOCUMENTAL** |
| `openDatabase` / `createCompany` | `src/db.js:15-39` / `:44-51` (export `:53`) | infraestrutura | — | Sim, uso em `docs/API.md:6-19` | Implícito (ARCHITECTURE `:16`) | Infra — aceitável |
| `createGatewayClient` (+ `submitPayment`, `callCount`, `callsFor`, `history`, `reset`) | `src/gatewayClient.js:9-44` (export `:46`) | REQ-SIM2-004 (integração) | — | Instanciação em `docs/API.md:11,14`; superfície de introspecção não documentada | Parcial | Parcial — stub de teste exposto como produção |

### 2.1 Destaque — `cancelPayment` sem origem documental

`cancelPayment` (`src/paymentService.js:124-138`) é a **única função de negócio
exportada sem qualquer origem normativa**:

- Não existe REQ que a demande (`REQUIREMENTS.md` cobre REQ-SIM2-001..006, nenhum menciona cancelamento).
- Não existe AC que a descreva.
- Não existe BR que defina sua semântica.
- Não aparece em `docs/API.md` (as 6 operações documentadas estão nas linhas 26, 37, 48, 61, 74, 88).
- Não aparece em `SOFTWARE_RELEASE_PACKAGE.md:18` (API_CONTRACTS).
- Não possui teste em `product/SIM-002/tests/`.

Entretanto o status `cancelled` que ela produz é citado no dicionário de dados
(`DATA_DICTIONARY.md:44`) e é consumido por `sumCommittedAmount`
(`src/paymentService.js:31`) e por `sendPayment` (`:78`) — ou seja, o
comportamento não documentado **já está acoplado às regras de crédito e envio**.
Classificado como UNDOCUMENTED BEHAVIOR em FIND-SIM-002-004.

## 3. Cobertura reversa código → norma (status persistidos)

| Status gravado no banco | Produzido por | Declarado em | Consumido por |
|---|---|---|---|
| `pending` (suppliers) | `supplierService.js:31` | `DATA_DICTIONARY.md:28`, `BUSINESS_RULES.md:11` | `approvalService.js:33`, `paymentService.js:19` |
| `approved` (suppliers) | `approvalService.js:44` | `DATA_DICTIONARY.md:28` | `paymentService.js:19` |
| `rejected` (suppliers) | **nenhum código** | `DATA_DICTIONARY.md:28`, `BUSINESS_RULES.md:11` | nenhum | 
| `created` (payments) | `paymentService.js:58`, `:132`; default `schema.sql:27` | `DATA_DICTIONARY.md:44`, AC-SIM2-003 | `sumCommittedAmount` (`:31`) |
| `sent` (payments) | `paymentService.js:98` | `DATA_DICTIONARY.md:44`, AC-SIM2-004 | `cancelPayment` (`:131`) |
| `cancelled` (payments) | `paymentService.js:134` | `DATA_DICTIONARY.md:44` | `paymentService.js:31`, `:78` |
| `pending` (payments) | **nenhum código** | **apenas** `docs/API.md:67` | nenhum |

Duas órfãs registradas: o status `rejected` de fornecedor (norma sem código) e o
status `pending` de pagamento (documento sem código, DDL, dicionário ou teste) —
ver FIND-SIM-002-008 e FIND-SIM-002-013.

## 4. Síntese

| Indicador | Valor |
|---|---|
| BRs declaradas | 6 |
| BRs plenamente provadas (impl + teste válido) | 1 (BR-SUP-001) |
| BRs sem implementação | 2 (BR-SUP-002, BR-PAY-002) |
| BRs com implementação divergente da norma | 1 (BR-APR-001) |
| BRs com implementação parcial | 1 (BR-SEC-001) |
| BRs cujo único teste é falso-positivo | 1 (BR-PAY-001) |
| ACs com prova executável válida | 1 de 6 (AC-SIM2-006) |
| Funções de negócio sem origem documental | 1 (`cancelPayment`) |
| Testes declarados PASS pelo release | 12/12 (`SOFTWARE_RELEASE_PACKAGE.md:31-34`) |
