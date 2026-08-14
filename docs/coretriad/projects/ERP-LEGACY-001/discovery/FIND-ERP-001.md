# FINDING

FINDING_ID: FIND-ERP-001
PROJECT_ID: ERP-LEGACY-001
AUDIT_ID: N/A — finding preliminar levantado durante discovery (passos 21-24), fora da sequência normal do passo 31, por autorização humana explícita do dono do CoreTriad.
AUDIT_COMMIT: legacy-baseline-001 → c9359be399c45191fe90e8e9707803125a5ba91d
TITLE: Ausência de chave de idempotência em escritas críticas — proteção real existe para 6 das 8 rotas auditadas (lock pessimista + guarda de estado transacional), mas está genuinamente ausente em `POST /api/inventory/movements` e parcialmente ausente em pagamento parcial de contas a pagar/receber
DOMAIN: reliability / data-integrity
SUBDOMAIN: idempotency (retry / duplo submit / reenvio de mensagem)
SEVERITY: CRITICAL (justificada apenas pelo subconjunto vulnerável — ver veredito por operação abaixo; NÃO se aplica às 6 rotas classificadas como protegidas)
CONFIDENCE: CONFIRMED (por leitura direta de use-case + repositório + model, para cada uma das 8 rotas)
STATUS: OPEN
DETECTED_BY: vericore-idempotency-auditor

DESCRIPTION:
Nenhuma das 681 rotas do inventário (`API_INVENTORY.md`) usa header
`Idempotency-Key`, tabela de dedupe genérica ou middleware equivalente —
confirmado por `grep -i "Idempotency-Key|idempotency_key|IdempotencyKey"`
em todo `server/src`, sem nenhuma ocorrência. Isso por si só não prova
vulnerabilidade: idempotência pode ser garantida por mecanismo equivalente
(lock pessimista transacional + guarda de estado que rejeita reexecução).
Releitura de cada uma das 8 rotas apontadas no `API_INVENTORY.md` confirmou,
por operação, se esse mecanismo equivalente existe de fato ou se é ausente/
ilusório. O resultado se divide em dois grupos:

**GRUPO A — protegido por mecanismo real (transação + `SELECT ... FOR
UPDATE` + guarda de estado que rejeita reexecução):**
1. `PUT /api/finance/payable/:id/pay` e `PUT /api/finance/receivable/:id/pay`
   — protegido para pagamento **integral**; vulnerável para pagamento
   **parcial** repetido (ver ACTUAL_BEHAVIOR, item 1).
2. `POST /api/finance/cnab/remittances` — protegido (lock no singleton de
   configuração bancária serializa concorrência; `ConflictError` explícito
   bloqueia reenvio).
3. `POST /api/finance/cnab/returns` — protegido (lock por `nosso_numero`
   serializa concorrência; guarda `status === 'pending'` impede reaplicação,
   mesmo com concorrência real).
4. `POST /api/sales/:id/nfe` — protegido para o efeito financeiro/estoque
   principal (baixa dupla de estoque, emissão dupla de NF-e, recebível
   duplicado): guarda `nfe_status === 'processing'` + lock da venda +
   rastreamento de `invoiced_quantity` bloqueiam reexecução concorrente ou
   sequencial.
5. `POST /api/mrp/planned-orders/convert` e `.../convert-to-production` —
   protegido (lock pessimista nas ordens planejadas + transição de status
   para `EM_EXECUCAO` bloqueia reconversão); já existe teste de idempotência
   (`server/tests/integration/mrp-rerun-idempotency.test.ts`,
   `server/tests/unit/mrp-requisition-helper-idempotency.test.ts`).

**GRUPO B — vulnerável, confirmado por leitura:**
6. `POST /api/inventory/movements` — **sem nenhuma proteção**: sem lock
   sobre um recurso que impeça segunda inserção, sem verificação de estado
   terminal, sem constraint UNIQUE em `(reference_type, reference_id, type)`
   (o índice existente é não-único). Cada chamada gera um novo INSERT em
   `inventory_movements` incondicionalmente.
7. `POST /api/sales/:id/nfe/cancel` — o efeito financeiro/estoque interno
   está protegido (guarda de estado dentro da transação bloqueia devolução
   dupla de estoque/recebível), mas a checagem inicial de
   `nfe_status === 'authorized'` e a chamada ao provedor externo de
   cancelamento acontecem **fora de transação/lock**, antes da guarda real
   — ver ACTUAL_BEHAVIOR, item 4. Isso não duplica o efeito financeiro
   interno, mas expõe uma janela de chamada dupla ao provedor externo, cujo
   comportamento sob reenvio é fora do mandato deste agente (fronteira com
   `external-api-auditor`/`webhook-auditor`).

EXPECTED_BEHAVIOR:
Toda escrita crítica (financeira, de estoque ou de estado de documento
fiscal/planejamento) deve ser segura sob reenvio de rede, duplo clique ou
retry de cliente: reexecutar a mesma operação com os mesmos parâmetros não
deve produzir um segundo efeito financeiro/de estoque, seja por chave de
idempotência explícita, seja por um mecanismo transacional equivalente
(lock + guarda de estado terminal) comprovável por leitura de código.

ACTUAL_BEHAVIOR:

1. **Pagamento parcial retry-duplicado** (`PayPayableUseCase.ts:39-74`,
   `ReceivePaymentUseCase.ts:39-74`): o guard `if (account.status === 'paid')
   throw ValidationError` (linha 43 em ambos) só rejeita reexecução quando o
   título **já está totalmente pago**. Se o pagamento é **parcial**
   (`status` permanece `'partial'`), uma segunda chamada idêntica (mesmo
   `id`, mesmo `amount`) — por exemplo, um app de cliente que reenvia a
   requisição por timeout de rede depois que o servidor já processou e
   commitou — **não é rejeitada**: `account.amount_paid` acumula
   novamente (`newAmountPaidCents = alreadyPaidCents + paymentCents`, linha
   62), sobrestimando a baixa. O lock pessimista (`findPayableByIdForUpdate`,
   `SequelizeFinancialRepository.ts:81-86`, `lock: transaction.LOCK.UPDATE`)
   protege corretamente contra corrida **concorrente**, mas não contra
   reenvio **sequencial** de uma parcela já aplicada — não há nenhum token
   de operação (nonce/idempotency-key) que identifique "este pagamento
   específico já ocorreu".

2. **`POST /api/inventory/movements` sem nenhuma proteção**
   (`inventoryController.ts:113-137` → `CreateInventoryMovementUseCase.ts:71-126`):
   o use case abre uma transação (`t`, controller linha 114), resolve
   depósito/produto, e chama `InventoryService.adjust(...)` (linha 107) que
   sempre insere um novo `InventoryMovement`. Não há:
   - lock sobre um recurso de "operação já processada";
   - verificação de estado terminal;
   - constraint UNIQUE sobre `(reference_type, reference_id, type)` — o
     índice em `InventoryMovement.ts:65` (`{ fields: ['reference_type',
     'reference_id'] }`) é um índice de consulta, **não é `unique: true`**.
   Duplo clique no botão "Registrar movimentação" no client, ou reenvio de
   rede da mesma requisição `POST`, gera **dois `InventoryMovement`
   distintos** e dobra o efeito de estoque (entrada ou saída), sem qualquer
   barreira.

3. **CNAB — protegido, mas por mecanismo indireto que merece registro**
   (`GenerateRemittanceUseCase.ts:41-82`, `ProcessReturnFileUseCase.ts:39-140`):
   a proteção efetiva não vem de uma chave de idempotência desenhada para
   esse fim — vem de um lock de linha único (config bancária singleton, ou
   item de remessa por `nosso_numero`) que **incidentalmente** serializa
   requisições concorrentes, combinado com uma guarda de estado (`status`)
   que bloqueia reaplicação após o primeiro commit. É um mecanismo real e
   funcional (confirmado por leitura completa do fluxo), mas frágil: a
   checagem de duplicidade de ocorrência de retorno
   (`SequelizeCnabRepository.ts:111-120`, `findExistingOccurrence`) roda
   **fora de transação e sem lock** — só não é explorável porque a guarda
   de estado real (`remittanceItem.status === 'pending'`,
   `ProcessReturnFileUseCase.ts:85,108`) está corretamente dentro da
   seção travada. Se um refactor futuro remover essa guarda de estado
   confiando apenas em `findExistingOccurrence` como proteção contra
   duplicidade, a proteção deixa de ser real — isso é uma "proteção
   ilusória" latente, não ainda materializada, registrada como observação
   de risco dentro deste finding, não como vulnerabilidade confirmada
   separada. **Módulo `cnab` não está montado em `server/app.ts`
   atualmente** (confirmado por grep — nenhuma ocorrência de `cnab` no
   arquivo), consistente com `INTEGRATION_INVENTORY.md`; a proteção descrita
   acima já está pronta para quando o módulo for montado.

4. **`POST /api/sales/:id/nfe/cancel` — checagem inicial fora de lock**
   (`CancelSaleNfeUseCase.ts:92-102`): `findSaleById(saleId)` (sem
   transação/lock) e a chamada `provider.cancel(...)` (rede externa)
   acontecem **antes** de qualquer lock. Duas requisições de cancelamento
   simultâneas para a mesma venda podem ambas passar a checagem inicial
   `sale.nfe_status !== 'authorized'` (linha 94-96) e ambas chamar o
   provedor externo de cancelamento. O efeito financeiro/estoque **interno**
   permanece protegido, porque a re-leitura travada dentro da transação
   final (`locked.nfe_status`, linha 105-125) recalcula `wasAuthorized`
   sobre o estado já commitado pela primeira chamada — a segunda não
   reexecuta a devolução de estoque/recebível. Mas a **dupla chamada ao
   provedor externo** de cancelamento de NF-e é uma exposição real, cujo
   comportamento sob reenvio (idempotência do lado do provedor) é mandato
   de `external-api-auditor`, não deste agente — registro aqui apenas como
   ponto de atenção cruzada.

EVIDENCE:
FILE: server/src/modules/financial/application/use-cases/PayPayableUseCase.ts
LINES: 39-44 (guarda só bloqueia status `paid`/`canceled`), 53-68 (acumulação sem verificação de operação já aplicada)
FILE: server/src/modules/financial/application/use-cases/ReceivePaymentUseCase.ts
LINES: 39-44, 53-68 (idêntico ao acima, conta a receber)
FILE: server/src/modules/financial/infrastructure/sequelize/SequelizeFinancialRepository.ts
LINES: 48-53, 81-86 (`findReceivableByIdForUpdate`/`findPayableByIdForUpdate`, lock `transaction.LOCK.UPDATE` real — protege concorrência, não reenvio sequencial pós-commit)
FILE: server/src/modules/financial/presentation/routes/finance.ts
LINES: 30, 36 (rotas `PUT /receivable/:id/pay`, `PUT /payable/:id/pay`, sem middleware de idempotência)
FILE: server/src/modules/inventory/presentation/controllers/inventoryController.ts
LINES: 113-137 (`create`, sem verificação de duplicidade)
FILE: server/src/modules/inventory/application/use-cases/CreateInventoryMovementUseCase.ts
LINES: 71-126 (execute inteiro — nenhuma checagem de idempotência)
FILE: server/src/models/InventoryMovement.ts
LINES: 43-51 (campos `reference_id`/`reference_type`), 57-69 (índices — `{ fields: ['reference_type','reference_id'] }` NÃO é `unique: true`)
FILE: server/src/modules/inventory/presentation/routes/inventory.ts
LINES: 25 (`POST /movements`, sem proteção)
FILE: server/src/modules/financial/application/use-cases/GenerateRemittanceUseCase.ts
LINES: 46 (lock singleton `findBankingConfigForUpdate`), 75-82 (`ConflictError` bloqueia título já em remessa aberta)
FILE: server/src/modules/financial/application/use-cases/ProcessReturnFileUseCase.ts
LINES: 22-25 (comentário do autor original já reivindica idempotência), 53 (`findRemittanceItemByNossoNumeroForUpdate`, lock real), 70-79 (`findExistingOccurrence`, checagem SEM lock/transação — frágil mas não explorável hoje), 85, 108 (guarda `status === 'pending'`, proteção real efetiva)
FILE: server/src/modules/financial/infrastructure/sequelize/SequelizeCnabRepository.ts
LINES: 111-120 (`findExistingOccurrence` sem `transaction` no `findOne`)
FILE: server/src/models/CnabReturnOccurrence.ts
LINES: 46-50 (índices não-únicos sobre a chave de dedupe)
FILE: server/src/modules/financial/presentation/routes/cnab.ts
LINES: 25 (`POST /remittances`), 29 (`POST /returns`)
FILE: server/app.ts
(grep sem ocorrência de `cnab` — módulo não montado)
FILE: server/src/modules/fiscal/application/use-cases/IssueSaleNfeUseCase.ts
LINES: 105-121 (lock da venda + guarda `nfe_status === 'processing'` + guarda de status `confirmed`/`partially_invoiced`), 130-157 (rastreamento de `invoiced_quantity` impede refaturar saldo já faturado)
FILE: server/src/modules/fiscal/application/use-cases/CancelSaleNfeUseCase.ts
LINES: 92-102 (checagem inicial e chamada ao provedor SEM lock/transação), 104-135 (guarda real `wasAuthorized` dentro da transação final, protege o efeito interno)
FILE: server/src/modules/sales/presentation/routes/sales.ts
LINES: 54 (`POST /:id/nfe`), 56 (`POST /:id/nfe/cancel`)
FILE: server/src/modules/mrp/application/use-cases/ConvertPlannedOrdersToRequisitionUseCase.ts
LINES: 59-63 (lock `findPlannedOrdersByIdsForUpdate`), 71-78 (guarda de status `CONVERTIBLE_STATUSES`), 101 (transição para `EM_EXECUCAO`, bloqueia reconversão)
FILE: server/src/modules/mrp/application/use-cases/ConvertPlannedOrdersToProductionOrderUseCase.ts
LINES: 102-118 (lock + guarda de status idêntica), 216-217 (transição para `EM_EXECUCAO`)
FILE: server/src/modules/mrp/presentation/routes/mrp.ts
LINES: 16-17 (`POST /planned-orders/convert`, `.../convert-to-production`)
FILE: server/tests/integration/mrp-rerun-idempotency.test.ts
FILE: server/tests/unit/mrp-requisition-helper-idempotency.test.ts
(confirmam cobertura de teste de idempotência para MRP — único par de rotas do inventário original com teste dedicado)

RELATED_REQUIREMENT: —
RELATED_BUSINESS_RULE: —
RELATED_USE_CASE: PayPayableUseCase, ReceivePaymentUseCase, GenerateRemittanceUseCase, ProcessReturnFileUseCase, IssueSaleNfeUseCase, CancelSaleNfeUseCase, CreateInventoryMovementUseCase, ConvertPlannedOrdersToRequisitionUseCase, ConvertPlannedOrdersToProductionOrderUseCase
RELATED_TEST: `mrp-rerun-idempotency.test.ts`, `mrp-requisition-helper-idempotency.test.ts` (cobrem MRP); nenhum teste equivalente encontrado para pagamento parcial repetido, para `POST /api/inventory/movements`, ou para concorrência real em CNAB/NF-e (lacuna de prova dinâmica — ver nota abaixo)

BUSINESS_IMPACT:
- `POST /api/inventory/movements` sem proteção: qualquer retry de rede ou
  duplo clique em um lançamento manual de estoque (entrada, saída ou ajuste)
  dobra o efeito real de estoque, sem log de erro nem rejeição — o sistema
  aceita silenciosamente. Em uma saída manual isso pode levar o saldo do
  produto a ficar artificialmente baixo (ou, numa entrada, artificialmente
  alto), distorcendo disponibilidade para venda, MRP e produção.
- Pagamento parcial reenviado: dobra `amount_paid` de uma conta a pagar/
  receber sem que o título atinja `paid` naturalmente antes disso — risco de
  pagamento em duplicidade ao fornecedor (a pagar) ou de reconhecimento
  indevido de recebimento (a receber), até o valor da parcela reenviada.

TECHNICAL_IMPACT:
Nenhuma chave de idempotência de transporte existe em nenhuma rota do
sistema (0 ocorrências em todo `server/src`). A proteção real que existe
hoje (6 de 8 rotas do escopo) é um efeito colateral de locks pessimistas e
guardas de estado desenhados para outro propósito (evitar corrida
concorrente / modelar máquina de estado do domínio), não de um mecanismo
de idempotência desenhado deliberadamente — funciona, mas é frágil a
mudanças futuras que não preservem a mesma disciplina (ex.: CNAB, item 3
acima).

SECURITY_IMPACT:
Não é uma vulnerabilidade de autenticação/autorização — é uma vulnerabilidade
de confiabilidade financeira/operacional sob condições de rede adversas
(timeout, retry automático de biblioteca HTTP, duplo submit de usuário,
reenvio de mensagem/job). Não há vetor de exploração deliberada adicional
além do já coberto por outros auditores (webhook-auditor para transporte,
external-api-auditor para o provedor de NF-e).

REPRODUCTION:
1. **Estoque (confirmado por leitura, reprodução estática)**: chamar
   `POST /api/inventory/movements` duas vezes com corpo idêntico
   (`{ product_id, type: 'out', quantity: 10, reference_id: 123,
   reference_type: 'adjustment' }`) — nenhum código entre o controller
   (`inventoryController.ts:113`) e o INSERT final rejeita a segunda
   chamada; resultado esperado por leitura: dois `InventoryMovement`
   distintos, saldo do produto reduzido em 20, não 10.
2. **Pagamento parcial (confirmado por leitura, reprodução estática)**:
   `PUT /api/finance/payable/:id/pay` com `{ amount: 100 }` sobre um título
   de `amount: 1000` — primeira chamada: `amount_paid = 100`, `status =
   'partial'`. Reenvio idêntico da mesma chamada (retry de rede) — o guard
   de linha 43 (`if (account.status === 'paid')`) não dispara porque o
   status é `'partial'`, não `'paid'`; segunda chamada aplica de novo:
   `amount_paid = 200`.
3. **Prova dinâmica de corrida real (concorrência de fato)** para os itens
   do GRUPO A não foi executada — é lacuna de prova dinâmica, só
   demonstrável em execução real com duas conexões concorrentes, mandato do
   `vericore-audit-verification-runner`. A leitura de código confirma o
   mecanismo (lock + guarda de estado), mas não substitui teste de corrida
   real sob carga.

ROOT_CAUSE_HYPOTHESIS:
Para o GRUPO A, a proteção nasceu como efeito colateral de correções
pontuais documentadas na memória do projeto (ex.: "rodar o MRP de novo
duplicava requisição, corrigido recentemente" — confirmado pelo código e
pelos testes dedicados) e do desenho de máquina de estado do domínio
(`nfe_status`, `sale.status`, `planned_order.status`), não de uma política
de idempotência deliberada e uniforme. Para o GRUPO B
(`POST /api/inventory/movements`), a operação é tratada como um INSERT
simples de log de auditoria de estoque, sem que ninguém tenha, até hoje,
tratado reenvio de rede como cenário de primeira classe — consistente com
o padrão geral encontrado em `CURRENT_ARCHITECTURE.md` (ausência de
composition root/kernel deliberado; disciplina aplicada módulo a módulo,
não uniformemente).

REFERENCE: BR-PAY-002 (SIM-002) — precedente que validou esta classe de
defeito (integração externa sem idempotência) como achado real em um
produto simulado anterior. Citado apenas como precedente de padrão de
achado; a severidade e a evidência acima são 100% baseadas no código real
deste ERP, não no simulado.

RECOMMENDATION:
1. `POST /api/inventory/movements`: introduzir idempotency-key de cliente
   (header, persistido junto ao `InventoryMovement` com constraint UNIQUE)
   OU, no mínimo, uma constraint UNIQUE de negócio sobre
   `(reference_type, reference_id, type)` quando `reference_id` não for
   nulo, para que reenvio do mesmo evento de origem (venda/compra/produção)
   seja rejeitado no banco, não apenas confiado ao chamador.
2. `PayPayableUseCase`/`ReceivePaymentUseCase`: acrescentar identificador de
   operação de pagamento (idempotency-key do cliente, ou hash determinístico
   de `(id, payment_date, payment_method, amount)` armazenado numa tabela de
   pagamentos aplicados) para rejeitar reaplicação de uma parcela já
   processada, independente do título ainda não estar `'paid'`.
3. CNAB: formalizar a guarda que hoje é incidental — constraint UNIQUE real
   em `cnab_return_occurrences` sobre `(remittance_item_id, movement_code,
   occurrence_date, amount_paid)`, para que a proteção não dependa
   implicitamente de nenhum refactor futuro preservar a ordem lock→guarda.
4. `CancelSaleNfeUseCase`: mover a checagem `nfe_status === 'authorized'`
   para dentro de uma seção travada (mesmo padrão de `IssueSaleNfeUseCase`)
   antes de chamar o provedor externo, reduzindo a janela de chamada dupla
   ao provedor (fronteira com `external-api-auditor`, mas a mitigação
   interna é deste domínio).
5. (Remediação é da SanaCore — VeriCore não corrige.)

SUGGESTED_REMEDIATION_OWNER: SanaCore

RETEST_REQUIRED: true

RETEST_SPECIFICATION:
(a) `POST /api/inventory/movements` chamado duas vezes com corpo idêntico
    (incluindo `reference_id`/`reference_type`) → apenas um
    `InventoryMovement` persiste e o saldo do produto reflete uma única
    aplicação (após remediação com constraint UNIQUE ou idempotency-key).
(b) `PUT /api/finance/payable/:id/pay` (ou `receivable`) chamado duas vezes
    com o mesmo `amount` sobre um título que permanece `'partial'` após a
    primeira chamada → a segunda chamada é rejeitada ou identificada como
    duplicata; `amount_paid` reflete uma única aplicação.
(c) Teste de concorrência real (duas conexões simultâneas) sobre
    `PUT /payable/:id/pay`, `POST /remittances`, `POST /returns`,
    `POST /:id/nfe` e `POST /planned-orders/convert` — confirma sob carga
    real que a serialização por lock produz exatamente um efeito
    financeiro/de estoque, não dois (prova dinâmica, mandato do
    `vericore-audit-verification-runner`).
(d) `CancelSaleNfeUseCase`: duas chamadas concorrentes de cancelamento sobre
    a mesma venda → apenas uma chamada ao provedor externo (após
    remediação do item 4 da recomendação); efeito interno de estoque/
    recebível aplicado exatamente uma vez (já protegido hoje, deve
    permanecer).
(e) Suíte de testes de idempotência dedicada para cada operação do GRUPO B
    (hoje só existe para MRP) referenciando este finding.

---

Arquivos-chave lidos nesta auditoria:
`server/src/modules/financial/application/use-cases/PayPayableUseCase.ts`,
`server/src/modules/financial/application/use-cases/ReceivePaymentUseCase.ts`,
`server/src/modules/financial/infrastructure/sequelize/SequelizeFinancialRepository.ts`,
`server/src/modules/financial/presentation/routes/finance.ts`,
`server/src/modules/financial/presentation/controllers/financialController.ts`,
`server/src/modules/financial/application/use-cases/GenerateRemittanceUseCase.ts`,
`server/src/modules/financial/application/use-cases/ProcessReturnFileUseCase.ts`,
`server/src/modules/financial/infrastructure/sequelize/SequelizeCnabRepository.ts`,
`server/src/models/CnabReturnOccurrence.ts`,
`server/src/modules/financial/presentation/routes/cnab.ts`,
`server/app.ts`,
`server/src/modules/fiscal/application/use-cases/IssueSaleNfeUseCase.ts`,
`server/src/modules/fiscal/application/use-cases/CancelSaleNfeUseCase.ts`,
`server/src/modules/fiscal/presentation/controllers/fiscalController.ts`,
`server/src/modules/sales/presentation/routes/sales.ts`,
`server/src/modules/inventory/presentation/controllers/inventoryController.ts`,
`server/src/modules/inventory/application/use-cases/CreateInventoryMovementUseCase.ts`,
`server/src/models/InventoryMovement.ts`,
`server/src/modules/inventory/presentation/routes/inventory.ts`,
`server/src/modules/mrp/application/use-cases/ConvertPlannedOrdersToRequisitionUseCase.ts`,
`server/src/modules/mrp/application/use-cases/ConvertPlannedOrdersToProductionOrderUseCase.ts`,
`server/src/modules/mrp/presentation/routes/mrp.ts`,
`server/tests/integration/mrp-rerun-idempotency.test.ts`,
`server/tests/unit/mrp-requisition-helper-idempotency.test.ts`,
`docs/coretriad/projects/ERP-LEGACY-001/discovery/API_INVENTORY.md`,
`docs/coretriad/projects/ERP-LEGACY-001/discovery/CURRENT_ARCHITECTURE.md`.

---

*Produzido pelo agente `vericore-idempotency-auditor` em modo read-only
reforçado (Read/Grep/Glob apenas, sem Write disponível nesta sessão);
conteúdo persistido neste caminho pelo orquestrador a partir da resposta do
agente, sem edição de conteúdo.*

---

## Validação (finding-validator)

**Escopo desta validação:** apenas GRUPO B (`POST /api/inventory/movements`
e pagamento parcial repetido em `PayPayableUseCase`/`ReceivePaymentUseCase`),
com checagem cruzada de amostra do GRUPO A (`IssueSaleNfeUseCase`,
`ConvertPlannedOrdersToRequisitionUseCase`).

### BUSCA POR CONTROLE COMPENSATÓRIO

**`POST /api/inventory/movements`:**
- `inventoryController.ts:113-149` — abre transação (`t`), chama
  `CreateInventoryMovementUseCase.execute`, faz `await t.commit()` sem
  nenhuma checagem prévia de duplicidade.
- `CreateInventoryMovementUseCase.ts:71-123` — resolve produto/depósito,
  valida saldo para saída (`WarehouseStockService.removeFromWarehouse`),
  chama `InventoryService.adjust`. Nenhum ponto verifica se já existe um
  `InventoryMovement` com o mesmo `(reference_type, reference_id, type)` ou
  qualquer token de operação.
- `inventoryService.ts:327-381` (`adjust`) — usa `validateAndLock` (lock
  pessimista no **produto**, não numa "operação"), incrementa/decrementa
  `quantity`, e chama incondicionalmente `createMovement(...)`.
- `inventoryService.ts:162-190` (`createMovement`) —
  `InventoryMovement.create(...)` puro, sem `findOrCreate`, sem checagem
  `findOne` antes, sem catch de violação de constraint.
- `InventoryMovement.ts:57-69` — três índices declarados; o único candidato
  a dedupe (`{ fields: ['reference_type', 'reference_id'] }`, linha 65)
  **não tem `unique: true`** — confirmado por leitura literal do objeto de
  índice.
- Busca por migration de `inventory_movements` com `unique` sobre essas
  colunas: nenhum arquivo `*inventory_movement*` encontrado em
  `server/migrations` (glob vazio) — a tabela não tem migration própria
  neste diretório, e o índice não-único é a única definição existente no
  model.
- `server/app.ts` — nenhum middleware global de idempotência (`app.use`
  linhas 35-234 revisadas por completo): apenas `helmet`, `cors`,
  `requestContext`, rate limiters de auth, `express.json/urlencoded`, e o
  roteamento por módulo. Nenhum `Idempotency-Key` ou dedupe genérico em
  nenhum ponto do pipeline HTTP.
- O lock que existe (`validateAndLock` sobre o `Product`) serializa
  concorrência sobre o **saldo do produto**, mas não impede que duas
  transações sequenciais (uma após a outra, cada uma com commit próprio)
  insiram dois movimentos distintos — não é o mesmo tipo de proteção que
  existe em `IssueSaleNfeUseCase` (guarda de estado terminal sobre o
  *documento*, não sobre o saldo).

**Conclusão da busca:** nenhum controle compensatório encontrado para
`POST /api/inventory/movements`. A citação do finding
(`InventoryMovement.ts:65`, índice não-único) está correta, e a leitura
direta do caminho completo (`controller → use case → adjust →
createMovement`) confirma ausência total de dedupe em qualquer camada.

**Pagamento parcial repetido (`PayPayableUseCase`/`ReceivePaymentUseCase`):**
- Guard em ambos, linha 43: `if (account.status === 'paid') throw new
  ValidationError(...)`; linha 44: `if (account.status === 'canceled') ...`.
  Nenhuma outra condição de rejeição existe entre a linha 39 (abertura da
  transação) e a linha 73 (retorno).
- `SequelizeFinancialRepository.ts:81-86` (`findPayableByIdForUpdate`) e
  `:48-53` (`findReceivableByIdForUpdate`): `lock: transaction.LOCK.UPDATE`
  real — confirmado por leitura literal, não é lock "de mentira". Mas é lock
  de **linha do título**, válido durante a transação; não impede que uma
  segunda transação, iniciada depois que a primeira já committou, adquira o
  lock livremente e reaplique o pagamento, porque o estado lido
  (`status: 'partial'`) não rejeita.
- Não há tabela de "pagamentos aplicados", não há `payment_reference`/
  `idempotency_key` em `AccountPayable`/`AccountReceivable`, não há hash
  determinístico de `(id, payment_date, payment_method, amount)` persistido
  em lugar algum do fluxo.
- Rotas (`finance.ts:30,36`): sem middleware de idempotência — coerente com
  a ausência global já confirmada em `app.ts`.

**Conclusão da busca:** nenhum controle compensatório encontrado. O lock
pessimista é real, mas protege exatamente o cenário que o finding já
reconhece (concorrência real simultânea), não o cenário que o finding aponta
como vulnerável (reenvio sequencial pós-commit de uma parcela já aplicada
quando o título permanece `'partial'`).

### RESULTADO DA BUSCA

Nenhum controle compensatório (middleware, policy, guard, interceptor,
decorator, gateway, constraint de banco, hook, validação de outra camada)
foi encontrado para nenhuma das duas operações do GRUPO B. A busca cobriu: o
próprio use case, a camada de serviço (`inventoryService.ts`), o
model/índices, o repositório financeiro, o controller HTTP, e o pipeline
global de middlewares em `app.ts`. Não há nenhuma camada não citada pelo
finding original.

### VEREDITO — GRUPO B: **CONFIRMED** (CRITICAL, CONFIDENCE: CONFIRMED)

**JUSTIFICATIVA:**
1. **`POST /api/inventory/movements`** — reprodutível estaticamente com
   determinismo total: dado o código lido, duas chamadas idênticas produzem,
   sem exceção, dois `INSERT` distintos em `inventory_movements` e dobram o
   efeito de estoque. Não há branch de rejeição em nenhum ponto do caminho
   `controller → use case → adjust → createMovement`, e o único candidato a
   defesa (índice em `reference_type`/`reference_id`) está confirmadamente
   configurado como não-único. Severidade CRITICAL sustentada: efeito
   financeiro/operacional real (distorção de saldo de estoque) sem exigir
   concorrência de rede — basta duplo clique ou retry sequencial trivial.
2. **Pagamento parcial repetido** — igualmente reprodutível por leitura: o
   guard existente (linha 43-44 em ambos os use cases) é real, mas seu
   domínio de rejeição (`status === 'paid'`/`'canceled'`) não cobre o estado
   intermediário `'partial'`, que é exatamente o estado em que o defeito se
   manifesta. O lock pessimista citado é genuíno mas resolve um problema
   diferente (corrida concorrente) do que o finding aponta (reenvio
   sequencial pós-commit). CRITICAL sustentado pelo impacto financeiro
   direto (pagamento/recebimento em duplicidade de uma parcela).

Ambos os itens do GRUPO B seguem para remediação pela SanaCore como
CONFIRMED (Regra 22).

### Sobre a diferenciação GRUPO A / GRUPO B (avaliação de honestidade da classificação)

A diferenciação é **honesta e sustentada pela evidência**, não generosa. Nas
duas rotas do GRUPO A relidas integralmente pelo validador (independente da
citação do finding):

- **`IssueSaleNfeUseCase.ts:105-157`** — lock real da venda
  (`transaction.LOCK.UPDATE`, linha 107), guarda de estado que rejeita
  `nfe_status === 'processing'` (linha 116-118), validação de status do
  documento (`confirmed`/`partially_invoiced`, linha 113-115) e rastreamento
  de saldo por item via `invoiced_quantity` (linha 124, 139-153) que impede
  refaturar quantidade já faturada mesmo em chamadas sequenciais não
  concorrentes — mecanismo qualitativamente diferente e mais robusto do que
  o das rotas do GRUPO B, porque a guarda está sobre o **estado do
  documento**, não sobre o saldo de um recurso compartilhado.
- **`ConvertPlannedOrdersToRequisitionUseCase.ts:59-109`** — lock pessimista
  real nas ordens planejadas (`findPlannedOrdersByIdsForUpdate`, linha 63),
  guarda de status que rejeita ordens fora de `CONVERTIBLE_STATUSES` (linha
  71-78), e transição para `EM_EXECUCAO` (linha 101) que torna a operação
  irreversível para reconversão — inclusive com um comentário do próprio
  autor original (linha 90-93) reconhecendo a idempotência como propriedade
  deliberada do desenho.

**Opinião sobre a estrutura do finding:** o finding deve permanecer como
está — um único FINDING_ID cobrindo os 8 itens, com severidade CRITICAL
explicitamente restrita ao GRUPO B. Não é recomendado split em finding
separado por dois motivos: (a) o finding já pratica a diferenciação
corretamente no próprio corpo do documento, sem misturar severidade; (b)
manter os 8 itens juntos preserva o contexto de auditoria completo do
domínio "idempotência de escrita crítica", o que ajuda o reteste e a
rastreabilidade. O GRUPO A, no entanto, não deve ser tratado como "fechado"
silenciosamente — os pontos de fragilidade que o próprio finding já registra
dentro do GRUPO A (CNAB item 3: checagem `findExistingOccurrence` fora de
lock, hoje não explorável mas frágil a refactor futuro; NFe-cancel item 4:
janela de dupla chamada ao provedor externo) são observações de risco
latente legítimas e devem permanecer no documento como estão.

**Arquivos lidos nesta validação (evidência própria, independente da citação
do finding):** `CreateInventoryMovementUseCase.ts`, `InventoryMovement.ts`,
`server/src/services/inventoryService.ts` (funções `adjust` e
`createMovement`), `inventoryController.ts`, `PayPayableUseCase.ts`,
`ReceivePaymentUseCase.ts`, `SequelizeFinancialRepository.ts`,
`server/app.ts`, `IssueSaleNfeUseCase.ts`,
`ConvertPlannedOrdersToRequisitionUseCase.ts`.

*Validação produzida pelo agente `vericore-finding-validator` em modo
read-only; seção anexada pelo orquestrador porque o hook de segregação
bloqueia escrita do validador fora de `audit/`.*
