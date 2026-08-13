# AUDIT COVERAGE MATRIX

AUDIT_ID: SIM-002-AUD-001
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
PROJECT_ID: SIM-002
DATA: 2026-08-13
BASE: `coretriad/templates/AUDIT_COVERAGE_MATRIX.md`

> Não declarar auditoria completa sem cobertura demonstrável.

---

## 1. Cobertura por domínio (formato do template)

| Domínio | Inventariado | Auditado | Findings | Validado |
|---|---:|---:|---:|---:|
| Requisitos | 6 (REQ-SIM2-001..006) | 6 | 6 | 0 |
| Casos de uso | 6 (implícitos nos REQs) | 6 | 5 | 0 |
| Regras de negócio | 6 (BR-SUP-001/002, BR-APR-001, BR-PAY-001/002, BR-SEC-001) | 6 | 5 | 0 |
| Arquitetura | 1 (camada de serviços + handle de banco) | 1 | 2 | 0 |
| Controllers | 0 (não há camada HTTP) | 0 | 0 | 0 |
| APIs | 7 funções de negócio exportadas | 7 | 4 | 0 |
| Banco | 4 tabelas, 3 índices, 3 FKs | 4 | 4 | 0 |
| Segurança | 4 caminhos de leitura + 4 de escrita | 8 | 4 | 0 |
| Testes | 12 casos em 3 arquivos | 12 | 2 | 0 |
| Integrações | 1 (gateway stub) | 1 | 2 | 0 |
| Infra/CI-CD | 0 (N/A no escopo; sem deploy) | 0 | 0 | 0 |
| Documentação | 6 artefatos | 6 | 4 | 0 |

Coluna "Validado" = findings já processados pelo `vericore-finding-validator`.
Zero neste momento: todos os 13 findings estão em `STATUS: PROPOSED`; os 4
CRITICAL e os 5 HIGH seguem obrigatoriamente ao validator (Regra 22 do
`CLAUDE.md`).

## 2. Cobertura por trilha × escopo × evidência × lacunas

### 2.1 business-rule

| Item | Conteúdo |
|---|---|
| Escopo coberto | As 6 BRs de `requirements/BUSINESS_RULES.md` confrontadas com `src/supplierService.js`, `src/approvalService.js`, `src/paymentService.js`, `src/schema.sql` |
| Evidência produzida | FIND-001 (`approvalService.js:3`, `:37-39`), FIND-002, FIND-003, FIND-005, FIND-006, FIND-009 |
| Método | Leitura estática linha a linha; confronto norma × implementação |
| Lacunas declaradas | Nenhuma execução dinâmica: a divergência de alçada foi provada por leitura de constante, não por execução do serviço |

### 2.2 authorization

| Item | Conteúdo |
|---|---|
| Escopo coberto | Todos os pontos de decisão de papel (`paymentService.js:3`, `:41`; `approvalService.js:4`, `:14`, `:37`) e todos os 8 caminhos de acesso a dado (4 leituras, 4 escritas) |
| Evidência produzida | FIND-002 (`paymentService.js:110-119` vs. 3 caminhos corretos), FIND-004, FIND-011, FIND-008 (divergência A), FIND-001 |
| Método | Inventário exaustivo de consultas SQL e de assinaturas de função; verificação de presença/uso de `user` |
| Lacunas declaradas | Nenhuma exploração dinâmica do IDOR foi executada; a ausência de camada HTTP/middleware foi confirmada por leitura de `SOFTWARE_RELEASE_PACKAGE.md:16,36` e por inexistência de arquivo de transporte no inventário — não por varredura de runtime |

### 2.3 traceability

| Item | Conteúdo |
|---|---|
| Escopo coberto | Matriz BR × REQ × AC × implementação × teste completa; inventário reverso de todas as funções exportadas |
| Evidência produzida | `07-traceability/TRACEABILITY_MATRIX.md`; FIND-004 (`cancelPayment` sem origem documental), FIND-005, FIND-003 |
| Método | Rastreio bidirecional norma→código e código→norma |
| Lacunas declaradas | A busca por origem documental limitou-se aos artefatos versionados de `product/SIM-002/`; decisões tomadas fora do repositório (se existirem) não são auditáveis |

### 2.4 database

| Item | Conteúdo |
|---|---|
| Escopo coberto | `src/schema.sql:1-47` integral (4 tabelas, 3 índices, 3 FKs) e `src/db.js:1-53` |
| Evidência produzida | FIND-005 (ausência de `UNIQUE`), FIND-012 (CHECK/FK composta/`updated_at`/`created_by`), FIND-013 (Bloco D), FIND-006 (handle sem transação) |
| Método | Leitura do DDL; confronto com `requirements/DATA_DICTIONARY.md`; verificação exaustiva de palavras-chave (`UNIQUE`, `CHECK`, `BEGIN`) |
| Lacunas declaradas | Nenhuma constraint foi testada por inserção real; a rejeição/aceitação pelo banco foi inferida do DDL, não observada |

### 2.5 data-integrity

| Item | Conteúdo |
|---|---|
| Escopo coberto | Todas as sequências de leitura-decisão-escrita: `createPayment` (`:48-64`), `approveSupplier` (`:24-50`), `sendPayment` (`:73-102`) |
| Evidência produzida | FIND-006 (TOCTOU do teto), FIND-010 (check-then-act na aprovação), FIND-009 (escritas não atômicas), FIND-012 |
| Método | Análise de janelas de corrida e de demarcação transacional por leitura estática |
| Lacunas declaradas | **Nenhum cenário de concorrência foi materializado.** As corridas descritas em FIND-006 e FIND-010 são deduzidas da estrutura do código (ausência de transação, `await` entre leitura e escrita, `WHERE` sem CAS), não observadas em execução paralela |

### 2.6 idempotency

| Item | Conteúdo |
|---|---|
| Escopo coberto | `sendPayment` (`:72-105`), `cancelPayment` (`:124-138`), contrato de `gatewayClient.js:13-26` |
| Evidência produzida | FIND-003 (8/8 trilhas), FIND-004 (encadeamento enviar→cancelar→enviar), FIND-009 |
| Método | Análise de guardas de estado, de reaproveitamento de `external_ref` e da assinatura de integração |
| Lacunas declaradas | O segundo envio **não foi executado**; a duplicação é deduzida da ausência de guarda `status === 'sent'` e da sobrescrita incondicional de `external_ref` em `:97-102` |

### 2.7 qa

| Item | Conteúdo |
|---|---|
| Escopo coberto | Os 12 casos de teste dos 3 arquivos de `product/SIM-002/tests/` e o suporte `tests/support.js` |
| Evidência produzida | FIND-007 (TC-SIM2-003b falso-positivo, `tests/payments.test.js:43-60`), FIND-013 (fronteiras e negativos ausentes) |
| Método | Leitura de cada teste com avaliação de poder discriminatório (o teste falha se a regra for removida?) |
| Lacunas declaradas | **A suíte não foi executada por esta auditoria.** O resultado `12/12 PASS` é declaração da OpusCore (`SOFTWARE_RELEASE_PACKAGE.md:31-34`), aceita como afirmação do auditado e não como evidência independente. A prova de mutação sugerida em FIND-007 e FIND-013 não foi executada |

### 2.8 documentation-consistency

| Item | Conteúdo |
|---|---|
| Escopo coberto | `README.md`, `docs/API.md`, `SOFTWARE_RELEASE_PACKAGE.md`, os 3 artefatos de `requirements/`, confrontados com código e DDL |
| Evidência produzida | FIND-008 (papel e status em `docs/API.md:65,67`), FIND-005 (doc × DDL), FIND-013 (Blocos B e C), FIND-004 |
| Método | Confronto item a item entre contrato publicado, dicionário, DDL, código e testes |
| Lacunas declaradas | Divergências que exigem árbitro normativo (papel de `createPayment`) não podem ser resolvidas por esta trilha — dependem de decisão humana (Regra 18) |

## 3. Lacunas transversais declaradas honestamente

Registradas como limitação material da auditoria, e não como omissão:

1. **Nenhuma prova dinâmica foi executada.** As oito trilhas são integralmente
   estáticas: leitura do código, do DDL, dos testes e da documentação no
   `AUDIT_COMMIT`. Nenhum serviço foi instanciado, nenhuma consulta SQL foi
   executada, e a suíte de testes não foi rodada por esta auditoria. Toda
   evidência persistida é textual e verificável por arquivo+linha; nenhuma é
   observacional. Consequência: a confiança `CONFIRMED` dos findings apoia-se em
   leitura direta do código-fonte, não em reprodução — e por isso **todo finding
   traz `RETEST_SPECIFICATION` executável**, cuja execução caberá ao reteste.

2. **Os cenários de concorrência não foram materializados.** FIND-006 (corrida no
   teto de crédito) e FIND-010 (check-then-act na aprovação) descrevem janelas
   deduzidas da estrutura do código — ausência de `BEGIN`/`COMMIT`, `await` entre
   leitura e escrita, `WHERE` sem condição de estado. Não houve execução paralela
   nem instrumentação que capturasse a intercalação. Especificamente para
   FIND-010, registra-se que o driver `node:sqlite` é síncrono, o que restringe a
   exploração a múltiplas conexões/processos — fator que rebaixou a severidade
   para MEDIUM.

3. **O comportamento do gateway real não é auditável.** `src/gatewayClient.js` é
   um stub determinístico em memória que **sempre** devolve `accepted: true`
   (`:25`). Consequências: (a) o ramo de recusa de `sendPayment` é inalcançável
   sem duplo de teste, tornando FIND-009 indemonstrável dinamicamente no estado
   atual; (b) não é possível auditar se o gateway real oferece deduplicação
   própria que mitigaria FIND-003 — a auditoria avaliou apenas o contrato exposto
   pelo código, que não transporta chave de idempotência; (c) a limitação é
   reconhecida pela própria engenharia em `SOFTWARE_RELEASE_PACKAGE.md:36`.

4. **Consequência de escopo, não lacuna:** por inexistir camada HTTP, middleware
   ou autenticação no produto (`SOFTWARE_RELEASE_PACKAGE.md:16` e `:36`), não há
   controle compensatório externo capaz de mitigar FIND-002, FIND-004 ou
   FIND-011. Esse ponto foi verificado por inventário completo do diretório
   auditado.

5. **Domínios com inventário zero.** "Controllers" e "Infra/CI-CD" aparecem com
   0 inventariado porque o produto não os possui — ausência verificada no
   inventário do `SCOPE.md`, não trilha não executada.

## 4. Distribuição de findings por trilha detectora

| Finding | Sev. | Trilhas que detectaram | Nº |
|---|---|---|---:|
| FIND-SIM-002-001 | CRITICAL | business-rule, authorization, traceability, qa, documentation-consistency, data-integrity | 6 |
| FIND-SIM-002-002 | CRITICAL | authorization, business-rule, database, traceability, qa, documentation-consistency | 6 |
| FIND-SIM-002-003 | CRITICAL | **todas as 8** | 8 |
| FIND-SIM-002-004 | CRITICAL | traceability, documentation-consistency, authorization, data-integrity, idempotency, business-rule, database | 7 |
| FIND-SIM-002-005 | HIGH | business-rule, database, traceability, data-integrity, qa, documentation-consistency | 6 |
| FIND-SIM-002-006 | HIGH | data-integrity, database, business-rule, idempotency | 4 |
| FIND-SIM-002-007 | HIGH | qa, traceability, business-rule, data-integrity, documentation-consistency, database | 6 |
| FIND-SIM-002-008 | HIGH | documentation-consistency, traceability, authorization, business-rule, qa | 5 |
| FIND-SIM-002-009 | HIGH | data-integrity, idempotency, database, business-rule | 4 |
| FIND-SIM-002-010 | MEDIUM | data-integrity, database, business-rule | 3 |
| FIND-SIM-002-011 | MEDIUM | authorization, business-rule, traceability, documentation-consistency | 4 |
| FIND-SIM-002-012 | MEDIUM | database, data-integrity, traceability, documentation-consistency | 4 |
| FIND-SIM-002-013 | LOW | qa, documentation-consistency, database, traceability | 4 |

Nenhum finding foi detectado por trilha única. A convergência independente entre
trilhas read-only, somada à verificação arquivo+linha realizada por este
controlador contra o `AUDIT_COMMIT`, sustenta a confiança `CONFIRMED`.

## 5. Estado da cobertura

Cobertura de inventário: **100%** dos 16 artefatos de `product/SIM-002/`, sem
exclusões (ver `00-scope/SCOPE.md` §2).
Cobertura de prova dinâmica: **0%** — declarado na §3.1 acima.
Nenhuma citação órfã: as 13 evidências persistidas foram verificadas
arquivo+linha contra o `AUDIT_COMMIT` antes da gravação.
