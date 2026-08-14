# T-10 — SUPRIMENTOS E VENDAS — RELATÓRIO DE TRILHA

**AUDIT_COMMIT lido:** `c1311a6f76b512fef893f7e60d934179cae3409f`. Nenhuma
citação a `c9359be`. Regime `APR-2026-016` respeitado: **nenhuma conexão de
banco, nenhuma execução**. Nenhum arquivo do objeto auditado foi tocado
(Regra 2).

> **Nota de persistência.** Produzido pelo `vericore-domain-logic-auditor`
> (T-10) e persistido **sem alteração** pelo orquestrador — o agente é
> read-only por desenho. O juízo de auditoria é integralmente da trilha.

---

## 1. Veredito de processo sobre `CAND-AUTHZ-01` em `purchases`

**Confirmo o fato por leitura própria** (`purchases.ts:48` —
`authorizeModule('diretor')` sem `requiredLevel`; `purchaseController.ts:51-55` —
truthiness) e **NÃO elevo para HIGH**. Mantenho **MEDIUM · confiança HIGH**, com
fundamentação de processo própria, não por deferência a T-04:

1. Registrar a alçada **não aprova o pedido**. São dois atos, dois gates, duas
   identidades: `POST /:id/approve` (`ApprovePurchaseUseCase.ts:70-131`) e
   `PUT /:id/status` (`ChangePurchaseStatusUseCase.ts:127-143`). D-K roda nos
   **dois** (`:86-92` e `:134-140`).
2. O grau `operate`/`approve` **não tem conteúdo de negócio neste módulo**:
   `requiredApproverRoles()` (`purchases/domain/constants.ts:162-176`) só devolve
   `['diretor']` — não existe alçada de segundo nível que um `diretor:approve`
   desbloquearia e um `diretor:operate` não. O que a truthiness desonra é a
   **intenção de menor privilégio do administrador**, não uma faixa de alçada
   existente. Esse é o resíduo ASVS V4.1.3/V4.1.5 que sustenta o MEDIUM.
3. Registro decorativo é recusado (`:106-111`), papel duplicado é recusado
   (`:121-124` + UNIQUE `uq_purchase_order_approvals_purchase_role`), aprovação
   retroativa é recusada (`:78-83`), e cada ato gera trilha
   (`purchaseController.ts:257-264`).

**Agravante próprio, que T-04 não registrou** (entregue a T-09, dona da
segregação cross-módulo — **não promovido aqui**):

> `purchaseController.ts:53` — `if (user?.role === 'admin') return ['diretor'];`
> Em módulo de **PRODUÇÃO**, **todo** `role === 'admin'` exerce alçada de
> diretoria **sem possuir o módulo `diretor`**. A dimensão *nível* é inerte
> (CAND-AUTHZ-01) **e** a dimensão *papel* é curto-circuitada. D-K continua
> barrando auto-aprovação, mas dois admins fecham a cadeia inteira de Compras sem
> nenhum diretor. Matéria de FIND-ERP-009 / T-09.

**Conclusão vinculante:** a "evidência de impacto de controle interno" que T-04
pediu **existe — mas não é do CAND-AUTHZ-01**. É de um defeito distinto, o
**T-10-01**. Fundir os dois inflaria a severidade do candidato por associação,
que é precisamente o que a EMENDA-01 §C.1 proíbe.

---

## 2. Findings

### T-10-01 — HIGH · CONFIRMED · `PROPOSED` (Regra 22)

**A aprovação de alçada G11 não se vincula ao conteúdo aprovado: o congelamento
dos campos de alçada está ancorado no estado errado.**

- `ApprovePurchaseUseCase.ts:78-83` — a alçada **só pode ser registrada com
  `status === 'pending'`**.
- `UpdatePurchaseUseCase.ts:79-87` — o congelamento de
  `APPROVAL_RELEVANT_FIELDS` (`supplier_id`, `freight_value`, `origin`, linha 20)
  **só vale quando `status === 'approved'`**.
- `PurchaseOrderApproval.ts:36-50` — a aprovação **não guarda snapshot** de
  valor, fornecedor ou origem.
- `ChangePurchaseStatusUseCase.ts:204-206` — na transição valida-se apenas
  *"existe linha com o papel exigido?"*, recalculando o exigido sobre os valores
  **atuais**.

**A janela é exatamente o intervalo em que a aprovação vive.** Sequência provada
estaticamente, toda por caminho público:

1. Comprador A cria PO nacional de R$ 600.000 (exige diretoria).
2. Diretor D registra a alçada (`POST /:id/approve`) — pedido segue `pending`.
3. Qualquer `compras:operate` faz `PUT /:id` com `freight_value: 10000000`
   (`purchaseValidators.ts:40` — `min(0)`, **sem teto**) e/ou `supplier_id` de
   outro fornecedor. Nenhuma guarda dispara; a aprovação de D **não é
   invalidada**.
4. Usuário B (≠ A) faz `PUT /:id/status {approved}`: D-K passa, G11 passa (papel
   `diretor` consta), pedido de R$ 10,6 milhões aprovado com a assinatura de um
   diretor que aprovou R$ 600.000.

O próprio código declara este risco e o fecha pela metade:
`UpdatePurchaseUseCase.ts:16-19` — *"Depois que o pedido já foi aprovado,
mudá-los seria aprovar um pedido e comprar outro"*. O risco não nasce em
`approved`; nasce no instante do ato aprovatório, que ocorre em `pending`.

**Sem teste.** `server/tests/unit/purchase-approval-authority.test.ts:426` cobre
*"pedido já aprovado não muda frete/fornecedor/origem"*; **nenhum** dos 33 casos
cobre "pedido pendente **com alçada já registrada**". Varredura de
`server/tests/` inteiro.

**Categorias G3 tocadas:** segregação de funções, autorização, operações
financeiras. **Compensatório existente:** apenas detecção *ex post*
(`purchaseController.ts:170-178`). **Regra/decisão violada:** D-C/G11
(`docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4) e D-K.
**Nota de honestidade:** MEDIUM é defensável por quem pesar mais a pré-condição.
Proponho HIGH porque o defeito **anula o efeito** do controle interno vivo em
módulo de PRODUÇÃO, com valor material ilimitado.

### T-10-02 — HIGH · CONFIRMED · `PROPOSED`

**BR-COM-010 (dimensão comercial): o desconto concedido no pedido não chega à
NF-e nem ao recebível — o cliente é cobrado pelo valor cheio.**

- `CreateSaleUseCase.ts:143-155` — `Sale.total_amount = itens − desconto`.
- `IssueSaleNfeUseCase.ts:202-214, 266-269` — `totalAmount` =
  Σ(`quantidade × unit_price`). **Zero ocorrências de `discount` no arquivo
  inteiro** (grep próprio). É esse `total_amount` que vai ao provedor e a
  `sale_invoices`.
- `saleReceivableService.ts:187-201` — parcelas geradas sobre `invoiceTotal`.

Venda de R$ 1.000 com R$ 200 de desconto → `Sale = 800`, NF-e = 1.000, AR =
1.000. Congelado em
`server/tests/characterization/comercial-financeiro--desconto-nao-chega-nfe-ar.test.ts:98`
— **e reconfirmado por leitura própria**, não copiado. Teste de caracterização
congela comportamento; **não é decisão de negócio nem aceite de risco**.
**Fronteira:** a perna fiscal é de **T-08**; a comercial é minha. Escalada
conjunta, não conciliada (Regra 20).

### T-10-03 — MEDIUM · CONFIRMED

**A invariante "fornecedor estrangeiro faz o pedido nascer `import`" é imposta em
1 de 3 caminhos de criação, e em 0 de 1 caminho de edição.**

Imposta em `CreatePurchaseUseCase.ts:70-84,113`. **Ausente** em
`ConvertRequisitionToPurchaseOrdersUseCase.ts:248-263` (sem `origin` ⇒ DEFAULT
`'national'` mesmo com `is_foreign = true`), `AwardRfqUseCase.ts:277-292`, e
`UpdatePurchaseUseCase` (troca `supplier_id` sem reexecutar
`checkPurchaseOriginAgainstSupplier`).

A alçada **não** é burlada (2ª linha em `ChangePurchaseStatusUseCase.ts:184-199`
resolve por `suppliers.is_foreign`). Falha a **integridade do dado persistido**:
o documento que vira compromisso financeiro grava origem falsa — o defeito que
`purchases/domain/constants.ts:50-62` declara corrigido em 2026-08-11. A correção
**não alcançou** os dois caminhos automáticos, que são os de maior volume.

### T-10-04 — MEDIUM · CONFIRMED

**`GET /api/sales/:id/nfe` — verbo de leitura, nível `view`, executa baixa de
estoque, cria conta a receber, transiciona a venda e não grava log.**

- `sales.ts:55` — `authorizeModule('vendas')` (**sem `operate`, sem `approve`**).
- `fiscalController.ts:66-72` — **nenhum `logAction`** (contraste: `issueSaleNfe`
  e `cancelSaleNfe` logam, linhas 46 e 89).
- `GetSaleNfeStatusUseCase.ts:156-199` — `commitInvoicedStock`,
  `createInvoiceReceivables`, `locked.status = resolveSaleStatus(...)`.

Emitir a NF-e exige `vendas:approve`; **completar** a mesma emissão — com todos
os efeitos patrimoniais e financeiros — exige apenas leitura. Duas categorias
vedadas por G3 sob o menor nível de permissão do módulo, sem rastro. Atenuante:
só finaliza emissão já iniciada e autorizada no provedor.

### T-10-05 — MEDIUM · CONFIRMED

**Inativação de fornecedor é decorativa.** `DeactivateSupplierUseCase.ts:35-40`
grava `status: 'inactive'`. **Nenhum consumidor lê esse status:**
`SequelizePurchaseRepository.ts:273-278` seleciona apenas
`['id','company_name','is_foreign']`; `CreatePurchaseUseCase.ts:65-68` só checa
existência; `InviteRfqSuppliersUseCase.ts:60-68` idem. Grep de `inactive` em
`purchases|rfq|purchaseRequisitions|suppliers`: **3 ocorrências, todas dentro de
`suppliers`**. Contraste que prova que o projeto sabe fazer:
`EditSaleItemsUseCase.ts:140-142` recusa **produto** inativo. Um bloqueio de
fornecedor (idoneidade, sanção, qualidade) não bloqueia nada.

### T-10-06 — MEDIUM · CONFIRMED

**Requisição convertida cujo pedido é cancelado entra em estado terminal morto.**
`ChangePurchaseStatusUseCase.ts:21-28` permite cancelar **sem devolver saldo**;
`syncRequisitionReceiptStatus.ts:89-90` ignora cancelados. Para a requisição em
`ordered`: reconversão bloqueada (`:101-106` exige `approved`), nova adjudicação
bloqueada (`AwardRfqUseCase.ts:217-224`), transição manual impossível
(`ChangePurchaseRequisitionStatusUseCase.ts:62-65` — `VALID_TRANSITIONS` não tem
chave `ordered`). A demanda aprovada desaparece sem ser atendida e sem poder ser
recomprada nem encerrada. **Ambiguidade de negócio registrada, não decidida**
(Regras 6/21): **a decisão é humana.**

### T-10-07 — LOW · CONFIRMED

**Comentário normativo de authZ contradiz o código, em rota de ato aprovatório.**
`purchaseRequisitions.ts:11-19` afirma que `PATCH /:id/status` "exige `approve`
na camada de rota" e mantém "checagem hard-coded `role !== 'admin'`"; a linha 27
declara **`operate`**, e `purchaseRequisitionController.ts:143-162` faz checagem
por **nível**. O controle efetivo está **correto**; a documentação inline induz
a erro quem for auditar ou remediar.

### T-10-08 — INFO

**Guarda dedicada de `nfe_status` no embarque é inalcançável pelo caminho
público — confirmado por leitura própria.** `CancelSaleNfeUseCase.ts:203,221-222`
regride `invoiced → confirmed|partially_invoiced`; nenhum desses admite `shipped`
(`ChangeSaleStatusUseCase.ts:12-30`). **Não é defeito** — é defesa em
profundidade contra dado carregado por fora. Registrado para não ser
"redescoberto" nem removido por remediação.

### T-10-09 — LOW

`ChangePurchaseRequisitionStatusUseCase.ts:83-116` opera **sem transação e sem
`FOR UPDATE`**. D-K continua íntegro sob concorrência; o risco é de leitura suja
em transição. Idempotência é de T-06 — handoff.

---

## 3. Conformidades registradas (com o mesmo peso)

1. **Idempotência de recebimento existe**: `ReceivePurchaseItemsUseCase.ts:100-112`
   + UNIQUE `(purchase_id, invoice_number)` → `ConflictError`. Confirma T-05 §4.
2. **Escalation-only de `is_foreign`** imposto na API
   (`UpdateSupplierUseCase.ts:53-64`).
3. **G13 correto**: passivo nasce no recebimento, no valor recebido, com
   `approved_by = null` explícito por segregação (`:307-357`).
4. **`invoiced`/`partially_invoiced` não são setáveis à mão**
   (`ChangeSaleStatusUseCase.ts:125-132`).
5. **Adjudicação exige `compras:approve`** (`rfqs.ts:20`).
6. **G12** fecha o caminho paralelo RFQ × conversão sob lock (`:211-241`).
7. Todos os `status` fechados por `z.enum` (`purchaseValidators.ts:48`,
   `saleValidators.ts:41`).

---

## 4. Cobertura — declaração honesta (G3 condição b)

| Módulo | Endpoints | D1 (authZ) | D3/D4 (regra/transação) |
|---|---|---|---|
| `purchases` | 10/10 | **E** | **E** |
| `purchaseRequisitions` | 5/5 | **E** | **E** |
| `sales` | 13/13 | **E** | **E** nas escritas; 3 endpoints de `fiscalController` — fronteira com T-08 |
| `suppliers` | 6/6 | **E** | **E** |
| `rfq` | 7/7 | **E** | **A — NÃO atinge o E prometido por C-10/C-11** |

**Lacuna declarada, não disfarçada:** li integralmente `AwardRfqUseCase` e
`InviteRfqSuppliersUseCase`; **não** li em profundidade `CreateRfqUseCase`,
`RegisterRfqQuoteUseCase`, `GetRfqComparisonUseCase` nem `rfqController`. Idem
para as 4 rotas de `customer prices` e os validadores de `suppliers`. **`rfq`
D3/D4 e as tabelas de preço por cliente exigem um segundo passe** — risco
residual **RES-T10-01**, a somar à seção G3-b do relatório final.

---

## 5. DYN (alvo exclusivo `erp_evok_audio_test`)

| ID | Sondagem | Prova |
|---|---|---|
| **DYN-04.1** (já na fila) | perfil `diretor:'operate'` → `POST /api/purchases/:id/approve` | contornabilidade de CAND-AUTHZ-01 |
| **DYN-T10-A** | PO 600k → alçada registrada → `PUT /:id` `freight_value` → `PUT /:id/status {approved}` | **T-10-01**; 200 ⇒ CONFIRMED dinâmico |
| **DYN-T10-B** | perfil `vendas` nível view → `GET /api/sales/:id/nfe` com emissão `processing` | **T-10-04** |
| **DYN-T10-C** | `DELETE /api/suppliers/:id` → `POST /api/purchases` para o mesmo fornecedor | **T-10-05** |

Todos os findings são **estáticos e independentes de DYN**. A trilha encerra em
**`READY_TO_CLOSE_BLOCKED_BY_G4`** quanto à contornabilidade efetiva — **não** em
"concluída com ressalva".

---

## 6. Handoffs

- **T-09** — `purchaseController.ts:53` (`admin ⇒ diretor` sem o módulo) em
  módulo de PRODUÇÃO: matéria de FIND-ERP-009, não promovida aqui.
- **T-08** — perna fiscal de T-10-02.
- **T-05** — `T-05-09` **reconfirmado**: `ReceivePurchaseItemsUseCase.ts:229-234`
  chama `FixedAssetReceiptService` sem permissão de `patrimonio`; a rota é
  `authorizeModule('recebimento','operate')`. Mesma classe de T-10-04.
- **T-07** — AR do desconto (T-10-02) e AP legada
  (`legacy_created_on_approval`).
- **T-14** — validar BR-COM-010 e as regras SUP/CAD implícitas em
  G11/G12/G13/G15/D-K.
- **T-06** — T-10-09 (transição sem lock).

---

## 7. Medição G11-c

**Estimado:** 5 S. **Real:** ≈ **0,6 S** — 1 sessão parcial, ~28 arquivos lidos.

**Leitura honesta:** o desvio **não é ganho de produtividade, é cobertura
incompleta**. As 5 S foram dimensionadas para D3/D4 exaustivo em 41 endpoints;
entreguei exaustivo nos **caminhos de escrita** (onde estão os 9 findings) e
**amostral em `rfq` e nas tabelas de preço**. Fechar a promessa E de C-10/C-11
exige ~1 S adicional. Declaro isso em vez de reportar a trilha como concluída no
nível prometido — foi essa a lição do SIM-002.

**Nada foi corrigido (Regra 2). T-10-01 e T-10-02 seguem como `PROPOSED` ao
`vericore-finding-validator` (Regra 22).**
