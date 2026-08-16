# FINDING

```
FINDING_ID:   AUD-COM-DESCONTO-01
AUDIT_ID:     ERP-LEGACY-001-AUD-001
PROJECT_ID:   ERP-LEGACY-001
AUDIT_COMMIT: c1311a6f76b512fef893f7e60d934179cae3409f
```

**TITLE:** O cliente vê um valor na tela e recebe cobrança de outro — a venda é gravada
**líquida de desconto**, mas a NF-e e as parcelas do contas a receber nascem pelo
**valor bruto**. Três valores para o mesmo negócio, sem nenhum ponto do sistema que
os confronte.

**DOMAIN:** comercial / fiscal / financeiro
**SUBDOMAIN:** integridade de valor monetário entre fronteiras de módulo
**SEVERITY:** **CRITICAL** — **fixada por decisão humana do dono nesta sessão** (ver
cabeçalho normativo §1). Não reavaliada por este agente; a evidência abaixo a sustenta.
**CONFIDENCE:** `CONFIRMED` — cadeia inteira lida linha a linha nesta sessão, incluindo
duas provas negativas por grep exaustivo (§2.4).
**STATUS:** `PROPOSED`
**ENVIRONMENT:** **DEV/HOMOLOGAÇÃO** — sem risco ativo hoje (§3).
**GATILHO DE REAVALIAÇÃO NOMEADO:** **na promoção do módulo `sales` a produção real —
ou, antes dele, na primeira carga real de `clients` e `products` (acabados) no banco —
esta severidade passa a BLOQUEANTE de release.** O gatilho é atingido também se
`fiscal` for promovido isoladamente, porque a emissão de NF-e é o ato que materializa
a divergência de valor. Nenhum agente precisa redescobrir este critério: ele está
nomeado aqui.
**DETECTED_BY:** `T-10-02` (rodada de fieldwork, lado servidor) → confirmado e estendido
pelo lado cliente em `T-32_CLIENT_COMERCIAL_FINANCEIRO.md` §`T32-COM-F01` →
**promovido a finding formal** por `vericore-audit-evidence-controller` (esta análise,
releitura própria integral do código).

---

## CABEÇALHO NORMATIVO OBRIGATÓRIO

1. **Autorização humana explícita (Regra 18).** A promoção deste achado a finding formal
   **e a sua severidade CRITICAL** foram determinadas por decisão direta do dono do
   CoreTriad nesta sessão. Diferentemente de `AUD-DEP-JSYAML-01`, aqui **a decisão
   humana fixa a severidade** — este agente **não a reavalia para baixo**. Não há
   divergência técnica a registrar: a evidência lida sustenta CRITICAL sem ressalva de
   mérito, apenas com a ressalva de ambiente do item 3.
2. **Regra 22 — validação adversarial NÃO OCORREU.** Este finding **não passou** pelo
   `vericore-finding-validator`. Sendo CRITICAL, essa passagem é **obrigatória antes de
   qualquer encaminhamento à SanaCore**. Nada neste documento a declara feita.
3. **Condição de ambiente, determinada pelo dono e verificada por este agente.** O dono
   determinou que os quatro achados desta rodada sejam registrados com ambiente
   DEV/HOMOLOGAÇÃO. **Este agente verificou a premissa em disco** (§3) e ela **se
   confirma**: `sales`, `fiscal` e `financial` estão classificados **NÃO-PRODUÇÃO** em
   `coretriad/states/ERP-LEGACY-001/PRODUCTION_STATUS_MAP.md`. **Nenhuma contradição a
   registrar** por Regra 20 neste finding.
4. **Regra 2 — nada foi corrigido.** Nenhum arquivo de `server/`, `client/`,
   `product/`, `tests/`, `requirements/` ou `architecture/` foi criado ou alterado.
   Todos foram **apenas lidos**.
5. **Regras 4 e 14 — nenhum `FINDING CLOSED`, `RETEST_PASSED` ou `AUDIT_PASSED` é
   declarado.**
6. **Nenhum comando foi executado.** Nenhum teste, nenhum `npm`, nenhuma conexão de
   banco (`APR-2026-016` / `APR-2026-021` Parte D respeitadas integralmente).

---

## 1. VÍNCULO DE ID — o que a evidência sustenta, e a correção do dono conferida

O dono começou a citar `FIND-ERP-005` e **corrigiu-se para "F-41/BR-COM-010 já
registrado"**. Conforme instruído, **não presumi qual seria o correto** — procurei em
disco. Resultado, com âncoras:

| ID candidato | Existe em disco? | O que de fato cobre | Âncora |
|---|---|---|---|
| **`F-41`** | **SIM** | *"Desconto não chega à NF-e nem ao recebível"* — classificado **CRÍTICO** | `docs/coretriad/projects/ERP-LEGACY-001/discovery/REQUIREMENTS_BASELINE.md:220`; reafirmado em `:318` |
| **`BR-COM-010`** | **SIM** | *"Desconto não chega à NF-e nem ao recebível"*, estado `DISCOVERED`, OWNER `PENDENTE` | `docs/coretriad/projects/ERP-LEGACY-001/BR_CATALOG.md:259` |
| `BR-COM-009` | SIM | *"Não existe limite de desconto"* — **regra vizinha, não esta**: trata de **teto/alçada** do desconto, não do seu **trânsito** até a NF-e/AR. Corresponde a `F-40` | `BR_CATALOG.md:258`; `REQUIREMENTS_BASELINE.md:219` |
| `T-10-02` | SIM | Achado de trilha (fieldwork servidor) — **origem** deste finding, validado `CONFIRMED` na Rodada 3-A | `T-25_VALIDACAO_ADVERSARIAL_RODADA3_A.md`; placar em `PROJECT_EVENT_LOG.md:1140` |
| `FIND-ERP-005` | SIM | **Alçada de contrato jurídico** — CRITICAL, `APR-2026-018`. **Não tem relação com desconto de venda.** | `coretriad/governance/APPROVALS.md:434` |

**Determinação, sustentada pela evidência e não por deferência:** a **autocorreção do
dono está correta**. O par autoritativo é **`F-41` (requisito-fantasma) ↔ `BR-COM-010`
(regra de negócio)**. `F-41` **existe no repositório** — a hipótese de inexistência
levantada no encargo **não se confirma**, e registro isso explicitamente porque me foi
pedido dizê-lo em vez de inventar. A citação inicial a `FIND-ERP-005` era equívoco de
memória e **não** é registrada como vínculo.

Vínculo transversal adicional, já versionado, que amarra os três eixos:
`LEGACY_TRACEABILITY_MATRIX_comercial-financeiro.md:119` (`TR-3`) declara
**`= C-1/F-41`**, CRITICAL/CONFIRMED, com a observação de que o **TC é INEXISTENTE**.
`LEGACY_TRACEABILITY_MATRIX.md:95` repete a mesma amarração no nível de programa.

**Nenhum ID novo de BR, REQ ou aprovação foi criado por este finding.**

---

## 2. DESCRIPTION — a cadeia, reverificada linha a linha nesta sessão

Todas as âncoras abaixo foram **reabertas e lidas nesta sessão**. Nenhuma foi copiada do
encargo sem conferência; duas divergências de âncora encontradas estão marcadas com ▲.

### 2.1 O que a UI afirma ao usuário

`client/src/pages/sales/SalesPage.tsx` (▲ o encargo cita `SalesPage.tsx`; o caminho real
em disco é `client/src/pages/**sales**/SalesPage.tsx` — registro a precisão):

- `:416` — `{Number(current.discount) > 0 && <DetailField label="Desconto" value={formatCurrency(current.discount)} />}`
  → a tela **rotula explicitamente "Desconto"** e mostra o valor concedido.
- `:463-471` — bloco de totalização com duas linhas:
  `:465-466` *"Soma dos itens"* = `itemsTotal` (o **bruto**, somado dos itens da grade);
  `:469-470` *"Total da venda"* = `Number(current.total_amount)` (o **líquido** gravado).

A tela portanto **afirma ao usuário que o desconto foi aplicado**, e mostra o número
líquido como o total do negócio. Esta é a **dimensão nova** que o dono mandou registrar,
e ela é o núcleo da severidade: não se trata de o sistema omitir um desconto, mas de
**afirmá-lo como aplicado e depois cobrar outro valor**.

### 2.2 O que o servidor grava

`server/src/modules/sales/application/use-cases/CreateSaleUseCase.ts`:

```ts
:133   const totalPriceCents = qty * unitPriceCents;
:134   totalCents += totalPriceCents;              // acumula o BRUTO
...
:143   const discountCents = toCents(entity.discount);
:144-146  if (discountCents > totalCents) { throw new ValidationError('Desconto não pode ser maior que o valor total'); }
:148   const totalNetCents = totalCents - discountCents;
:149   const totalNet = fromCents(totalNetCents);
:151-160  await this.saleRepository.createSale({ ... total_amount: totalNet, discount: fromCents(discountCents), ... })
```

Fatos: `sales.total_amount` é gravado **líquido** (`:154`); `sales.discount` guarda o
valor concedido (`:155`); a **única** validação sobre o desconto é `discount <= total`
(`:144-146`) — sem teto, sem alçada, sem aprovação (isto é `BR-COM-009`/`F-40`, regra
vizinha, **não subsumida** aqui).

### 2.3 O que a NF-e fatura

`server/src/modules/fiscal/application/use-cases/IssueSaleNfeUseCase.ts`:

```ts
:202   let totalAmount = 0;
:211   const invoiceQty = qtyToInvoiceByItemId.get(item.id)!;
:212   const unitPrice  = parseFloat(item.unit_price);
:213   const invoiceTotal = Math.round(invoiceQty * unitPrice * 100) / 100;
:214   totalAmount += invoiceTotal;
```

`totalAmount` é recomposto **do zero**, por `quantidade × preço unitário`, **sem
consultar `sale.total_amount` e sem qualquer termo de desconto**. Esse número bruto é
então propagado a **dois** destinos, não a um:

| Destino | Âncora | Consequência |
|---|---|---|
| `sale_invoices.total_amount` | `IssueSaleNfeUseCase.ts:269` (`total_amount: totalAmount`) | o **documento fiscal** registra o bruto |
| `itemsForProvider` / payload do provedor de NF-e | `:231-240`, `:286-287` (`totalAmount` no objeto `reserved`) | a **nota emitida ao cliente** sai pelo bruto |

Além disso, a **base de cálculo tributária** é o mesmo bruto: `TaxCalculationService.calculateItem`
recebe `total_price: invoiceTotal` (`:224`) — o imposto é calculado sobre o valor
**antes** do desconto.

### 2.4 O que o contas a receber cobra

`IssueSaleNfeUseCase.ts:424-431` chama:

```ts
:424   await SaleReceivableService.createInvoiceReceivables({
:425     sale,
:426     invoiceTotal: reserved.totalAmount,     // ← o BRUTO
...
```

E em `server/src/services/saleReceivableService.ts`:

```ts
:200   const total = Number(invoiceTotal) || 0;
:215   const plan = buildInstallmentPlan(total, sale.installments || 1, issuedAt, maxInstallment + 1);
:217-223  for (const parcel of plan) { await gateway.createAccountReceivable({ ... amount: parcel.amount, ... }) }
```

O plano de parcelas — o **boleto que o cliente paga** — é construído sobre o bruto.

**As duas provas negativas que fecham o caso (grep exaustivo, executado nesta sessão):**

| Busca | Arquivo | Resultado |
|---|---|---|
| `discount|desconto`, case-insensitive | `server/src/modules/fiscal/application/use-cases/IssueSaleNfeUseCase.ts` | **0 ocorrências** |
| `discount`, case-insensitive | `server/src/services/saleReceivableService.ts` | **0 ocorrências** |

Os dois módulos que decidem **quanto o cliente é cobrado** não contêm sequer a *palavra*
desconto. Não é um cálculo errado — é **um conceito que não atravessa a fronteira do
módulo**.

### 2.5 Os três valores, lado a lado

Para uma venda de R$ 1.000,00 com R$ 200,00 de desconto (aritmética das linhas acima,
**não** execução):

| Artefato | Valor | Origem |
|---|---|---|
| Tela — *"Soma dos itens"* | 1.000,00 | `SalesPage.tsx:466` |
| Tela — *"Desconto"* | 200,00 | `SalesPage.tsx:416` |
| **Tela — *"Total da venda"*** | **800,00** | `SalesPage.tsx:470` ← `sales.total_amount` (`CreateSaleUseCase.ts:154`) |
| **NF-e emitida ao cliente** | **1.000,00** | `IssueSaleNfeUseCase.ts:213-214,269` |
| **Boleto / parcelas em `accounts_receivable`** | **1.000,00** | `saleReceivableService.ts:200,215` |
| Base de cálculo do ICMS/IPI | 1.000,00 | `IssueSaleNfeUseCase.ts:224` |

**Divergência silenciosa estrutural:** `sales.total_amount` ≠ `SUM(accounts_receivable.amount)`
≠ `sale_invoices.total_amount`, **sem nenhuma reconciliação, alerta, constraint ou teste
que a detecte**.

---

## 3. AMBIENTE — verificação própria da premissa do dono (Regra 20)

Fui instruído a **verificar eu mesmo** se os módulos envolvidos estão de fato
classificados como não-produção, e a **registrar contradição em vez de conciliar em
silêncio**. Leitura direta de `coretriad/states/ERP-LEGACY-001/PRODUCTION_STATUS_MAP.md`
(tabela por módulo, §`server/` — backend):

| Módulo tocado por este finding | Classificação em disco | Âncora |
|---|---|---|
| `sales` | **NÃO-PRODUÇÃO** — *"Depende de `clients` (0) e `products` (0)"*, confiança **ALTA** | `PRODUCTION_STATUS_MAP.md:143` |
| `fiscal` | **NÃO-PRODUÇÃO** — *"Sem `clients`/`products`/vendas reais para emitir NF-e"*, confiança **ALTA** | `:173` |
| `financial` (`finance`, `cnab`, `reconciliation`) | **NÃO-PRODUÇÃO** — *"Sem compras/vendas reais... para gerar títulos"*, confiança **ALTA** | `:154` |
| `client/` (app inteiro) | **NÃO-PRODUÇÃO (pré-Go-Live)** | `:180` |

Base de dados medida que sustenta a classificação (`PRODUCTION_STATUS_MAP.md:94,96`):
`clients` = **0 registros**; `products` (acabados) = **0 registros**. Sem cliente e sem
produto acabado, **nenhuma venda real pode existir hoje** — logo nenhuma NF-e real e
nenhum recebível real.

**CONCLUSÃO: a premissa do dono se confirma. NENHUMA CONTRADIÇÃO A REGISTRAR neste
finding.**

**Registro obrigatório de fronteira, para não haver leitura silenciosa:** `APR-2026-016`
(`coretriad/governance/APPROVALS.md:318-351`) classifica como **produção real** os
módulos `items`, `categories`, `departments`, `users` (**apenas a conta `admin`**),
`auth`, `auditLogs` e o banco por trás de `docker-compose.yml`. **Nenhum deles é objeto
deste finding.** A cadeia `sales → fiscal → financial` não toca nenhum desses módulos no
caminho descrito. Registro a fronteira porque `auditLogs` e a conta `admin` **são**
produção real e um leitor apressado poderia confundir o banco compartilhado com o
escopo do defeito.

**Por que a severidade permanece CRITICAL apesar do ambiente:** mesmo critério já
homologado pelo dono em `APR-2026-018` (`APPROVALS.md:440-445`): *"a severidade
atribuída se justifica pelo padrão que será promovido a produção... não por exposição
atual de dado real."* Aqui o argumento é ainda mais direto — o defeito é **estrutural e
determinístico**, não probabilístico: **toda** venda com desconto o produzirá, sem
exceção, no instante em que houver a primeira venda real.

---

## 4. IMPACTO

**BUSINESS_IMPACT (o eixo que o dono mandou registrar como dimensão nova):** **o cliente
vê um valor na tela e recebe cobrança de outro.** O vendedor negocia R$ 800, a tela
confirma R$ 800, e o cliente recebe nota fiscal e boleto de R$ 1.000. As consequências
não são hipotéticas nem técnicas: cobrança indevida ao consumidor/cliente PJ, disputa
comercial com o documento fiscal contra a empresa, e — se a nota for autorizada pela
SEFAZ — a correção exige **carta de correção ou cancelamento/nota de devolução**, não um
simples ajuste em banco. O desconto concedido some do registro fiscal enquanto
**permanece visível em `sales.discount`**, o que torna a divergência demonstrável contra
a própria empresa.

**FINANCIAL_IMPACT:** `SUM(accounts_receivable.amount)` fica **sistematicamente acima**
de `SUM(sales.total_amount)` na exata medida dos descontos concedidos. Todo relatório
que agregue recebíveis — inclusive a projeção de caixa e a posição de tesouraria —
herda o erro **para cima**, ou seja, na direção otimista. Converge com
`AUD-TES-SALDOMANUAL-01` (posição de caixa não derivada) para produzir uma visão
financeira errada por dois mecanismos independentes.

**TAX_IMPACT:** ICMS e IPI são calculados sobre o bruto (`IssueSaleNfeUseCase.ts:224`).
Se o desconto for **incondicional**, a base de cálculo do ICMS deveria dele ser
expurgada — o sistema **recolhe imposto a maior**. Registro como **fato de código com
consequência tributária provável**, e **não** como afirmação de ilegalidade fiscal:
a qualificação do desconto (incondicional × condicional) é matéria de decisão humana com
a contabilidade, **não de agente** (Regra 6). Converge com `T-08`/`BR-FIS-001`/`BR-FIS-003`
sem duplicá-los — aqueles tratam de **alíquota**, este trata de **base**.

**TECHNICAL_IMPACT:** o conceito "desconto" existe em exatamente **um** módulo (`sales`)
e não é conhecido por nenhum dos dois módulos a jusante que decidem valor cobrado.
Não há teste, constraint, invariante ou reconciliação que ligue os três números.

---

## 5. O QUE ESTE FINDING **NÃO** AFIRMA (anti-falso-positivo)

1. **Não afirma que existe cobrança indevida hoje.** `clients` = 0 e `products` = 0
   (`PRODUCTION_STATUS_MAP.md:94,96`) — nenhuma venda real existe. O dano é **futuro e
   certo**, não presente.
2. **Não subsome `BR-COM-009`/`F-40`** (desconto sem teto/alçada) nem `T32-COM-F02`
   (desconto sem campo em tela alguma, MEDIUM, `T-32_CLIENT_COMERCIAL_FINANCEIRO.md:52`).
   São defeitos **distintos** na mesma regra: aqui o desconto **existe e não transita**;
   ali ele **não tem limite** e **não tem campo de entrada na UI**. Não se duplica
   severidade sobre achado alheio (Regra 15).
3. **Não subsome `T32-COM-F03`** (tabela de preço por cliente órfã) nem `T27-RFQ-07`.
   Convergem em `C-18` (`T-26_CONSOLIDACAO_RODADA2.md:530`) como família *"o preço
   cobrado não tem nenhuma âncora de política no sistema"*, mas os eixos são disjuntos.
4. **Não afirma que a divergência foi observada em dado real.** Nenhum banco foi
   consultado. A tabela §2.5 é **aritmética das linhas lidas**, declarada como tal.
5. **Não decide o mérito de negócio** — se o desconto *deve* chegar à NF-e como desconto
   incondicional, como redução de preço unitário, ou como outra forma — isso é decisão
   humana (Regra 6). O que se reporta é a **divergência entre o que o sistema afirma ao
   usuário e o que ele cobra**.

---

## 6. RECOMMENDATION

**SUGGESTED_REMEDIATION_OWNER: SanaCore** (Regra 3), **após** validação adversarial
obrigatória (Regra 22 — item 2 do cabeçalho normativo).

Pontos que a remediação precisará decidir **com o dono**, não sozinha:

1. **Forma de aplicação do desconto na NF-e** — rateio proporcional sobre os itens
   (afeta base de cálculo item a item) × campo `vDesc` de desconto no total × redução do
   `unit_price`. As três têm efeitos tributários diferentes e a escolha **é decisão
   humana com a contabilidade**.
2. **Emissão parcial.** `IssueSaleNfeUseCase` já suporta faturamento parcial
   (`qtyToInvoiceByItemId`, `:211`; `invoiced_quantity`, `SalesPage.tsx:448`). O desconto
   de uma venda parcialmente faturada precisa de regra de rateio entre emissões —
   **nenhuma existe hoje**, e a ausência não é coberta por este finding: é dívida a
   decidir na remediação.
3. **Dado já gravado.** Se houver vendas com desconto no banco de desenvolvimento no
   momento da remediação, a migração/reconciliação é matéria de `APR-2026-016` (regime
   read-only reforçado) e **exige aprovação caso a caso**.
4. **Invariante permanente, não conserto pontual.** O valor da remediação está em criar
   o confronto que hoje não existe entre `sales.total_amount`,
   `SUM(accounts_receivable.amount)` e `sale_invoices.total_amount` — de preferência com
   teste que reprove a divergência, dado que `TR-3`
   (`LEGACY_TRACEABILITY_MATRIX_comercial-financeiro.md:119`) registra o **TC como
   inexistente**.

---

## 7. REPRODUCTION (estática, determinística — nenhum comando executado)

1. Abrir `client/src/pages/sales/SalesPage.tsx:416` → o rótulo "Desconto" é renderizado.
2. `:463-471` → "Soma dos itens" (bruto) e "Total da venda" (`current.total_amount`, líquido).
3. `server/src/modules/sales/application/use-cases/CreateSaleUseCase.ts:143-155` →
   `totalNetCents = totalCents - discountCents`; `total_amount: totalNet`.
4. `server/src/modules/fiscal/application/use-cases/IssueSaleNfeUseCase.ts:213-214` →
   `invoiceTotal = round(invoiceQty * unitPrice * 100)/100; totalAmount += invoiceTotal;`
5. Seguir `totalAmount` → `:269` (`sale_invoices.total_amount`) e → `:287` → `:426`
   (`invoiceTotal: reserved.totalAmount`).
6. `server/src/services/saleReceivableService.ts:200,215` → `buildInstallmentPlan(total, ...)`.
7. `grep -i 'discount|desconto'` em (4) e (6) → **zero ocorrências** nos dois.

**Reprodução dinâmica proposta (NÃO executada; requer autorização do director e o banco
`erp_evok_audio_test`, nunca o banco real — `APR-2026-016`):**

| ID sugerido | Cenário | Asserção |
|---|---|---|
| `DYN-COM-01` | `POST /api/sales` com 1 item de R$ 1.000 e `discount: 200`, depois emitir NF-e | `sales.total_amount` = 800; `sale_invoices.total_amount` = 1000; `SUM(accounts_receivable.amount)` = 1000 — **os três divergem** |
| `DYN-COM-02` | Mesmo cenário, emissão **parcial** (50% da quantidade) | mede como o desconto se comporta no rateio entre emissões — hoje, não se comporta |

---

## 8. RASTREABILIDADE

**RELATED_PROCESS:** venda → faturamento fiscal → contas a receber
**RELATED_BUSINESS_RULE:** **`BR-COM-010`** — *"Desconto não chega à NF-e nem ao
recebível"*, estado `DISCOVERED`, OWNER **PENDENTE**
(`docs/coretriad/projects/ERP-LEGACY-001/BR_CATALOG.md:259`). Vizinha, **não coberta
aqui**: `BR-COM-009` (`:258`).
**RELATED_REQUIREMENT:** **`F-41`** — requisito-fantasma CRÍTICO
(`REQUIREMENTS_BASELINE.md:220`, reafirmado em `:318`), estado
`INFERRED — NEEDS HUMAN VALIDATION` (`LEGACY_TRACEABILITY_MATRIX_comercial-financeiro.md:73`).
**Não existe RF/REQ canônico versionado** que descreva o comportamento correto —
lacuna de requisito registrada, não inventada.
**RELATED_USE_CASE:** UC-01 (criação de venda) e UC-06 (emissão de NF-e), ambos com a
ressalva de `LEGACY_TRACEABILITY_MATRIX_comercial-financeiro.md:41` — *"UC-01 não cobre
desconto"*.
**RELATED_ACCEPTANCE_CRITERIA:** **nenhum**. Não existe AC formal versionado.
**RELATED_TEST:** **nenhum que exercite o defeito.** `TR-3`
(`LEGACY_TRACEABILITY_MATRIX_comercial-financeiro.md:119`) declara **TC INEXISTENTE** —
*"nenhum teste com desconto+emissão"*. Existe em disco
`server/tests/characterization/comercial-financeiro--desconto-nao-chega-nfe-ar.test.ts`,
que é **teste de caracterização** (documenta o comportamento atual, **não** o reprova) —
registro sua existência para que ninguém o confunda com controle, e **não** o li
integralmente nem executei.

**RELATED_FINDINGS:**
- **Origem (servidor):** `T-10-02` — validado `CONFIRMED` na Rodada 3-A
  (`PROJECT_EVENT_LOG.md:1140`); esta é a **promoção formal**, não o fechamento.
- **Origem (cliente):** `T32-COM-F01`
  (`T-32_CLIENT_COMERCIAL_FINANCEIRO.md:18-33`) — acrescentou a dimensão de UI.
- **Convergente, não duplicado:** `T27-RFQ-07`, `T08-F06`, `BR-COM-009` — cluster `C-18`
  (`T-26_CONSOLIDACAO_RODADA2.md:530`).
- **Não relacionado, apesar da citação inicial:** `FIND-ERP-005` (alçada de contrato
  jurídico, `APPROVALS.md:434`).

**REFERENCE:** `BR_CATALOG.md:258-259`; `REQUIREMENTS_BASELINE.md:219-220,318`;
`LEGACY_TRACEABILITY_MATRIX.md:95`;
`LEGACY_TRACEABILITY_MATRIX_comercial-financeiro.md:41-42,73,119`;
`PRODUCTION_STATUS_MAP.md:94,96,143,154,173,180`; `APPROVALS.md:318-351,434,440-445`;
`CLAUDE.md` Regras 2, 4, 6, 14, 15, 18, 20, 22.

**ROOT_CAUSE_HYPOTHESIS:** O desconto foi modelado como **atributo de apresentação da
venda** (`sales.discount` + `total_amount` já líquido) e não como **componente do preço
que atravessa o documento fiscal**. Os módulos a jusante — construídos depois, com
fronteira limpa de Clean Architecture — recompõem o valor a partir dos **itens**
(`quantidade × preço unitário`), que é a única fonte que **não carrega** o desconto. A
fronteira arquitetural, correta em desenho, **tornou-se o ponto de perda do dado**. A
ausência de qualquer teste que atravesse as três camadas com desconto (`TR-3`) fez a
perda ficar invisível a todo o pipeline.

**RETEST_SPECIFICATION** (a ser executada **por VeriCore**, após remediação da SanaCore —
Regra 4; nada aqui declara reteste feito):

(a) **Invariante de valor.** Para toda venda com `discount > 0` totalmente faturada:
`sales.total_amount` == `SUM(sale_invoices.total_amount)` == `SUM(accounts_receivable.amount)`.
Os três **iguais**, em centavos, sem tolerância.
(b) **Invariante sob emissão parcial.** Faturando em duas emissões, a soma das duas
`sale_invoices.total_amount` == `sales.total_amount`, e o desconto rateado entre elas
segue a regra que a decisão humana do item 6.1 tiver fixado (**a regra precisa existir
em artefato versionado antes do reteste** — sem ela, este item é `NOT_TESTABLE`).
(c) **Documento fiscal.** O payload entregue ao provedor de NF-e reflete o desconto na
forma decidida (rateio × `vDesc` × preço unitário reduzido), e a base de cálculo
tributária corresponde a essa forma.
(d) **Teste que reprova, não que documenta.** Existe teste automatizado que **falha** se
a divergência reaparecer — fechando `TR-3`. Um teste de caracterização que apenas
registre o comportamento **não satisfaz** este item.
(e) **Não regressão.** As suítes de venda e fiscal passam integralmente, e o
`server-ci.yml` completo passa.
(f) **Rastreabilidade.** `BR-COM-010` deixa de estar `DISCOVERED`/OWNER `PENDENTE`, ou a
pendência de OWNER é explicitamente reafirmada por decisão humana (`APR-2026-021`
Parte E veda atribuição por agente).
(g) **Reteste do vínculo de tela.** `SalesPage.tsx` continua exibindo "Desconto" e
"Total da venda", e o valor exibido **é** o valor cobrado — verificação de ponta a ponta,
não só de banco.

---

## 9. DECLARAÇÃO DE MÉTODO E LIMITES

- **Método:** READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT. Nenhum passo de correção.
- **Nenhuma âncora foi copiada do encargo sem releitura.** Todas as linhas citadas foram
  abertas nesta sessão. Divergências de âncora encontradas estão marcadas com ▲ (§2.1 —
  caminho real do `SalesPage.tsx`).
- **Nenhum comando executado**, nenhuma conexão de banco, nenhum teste rodado.
- **Nenhum arquivo do objeto auditado criado ou alterado** (Regra 2).
- **Nenhum valor de segredo, credencial ou dado pessoal foi lido, citado ou reproduzido.**
- **Limite de escopo:** cobre o trânsito do **desconto** de `sales` → `fiscal` →
  `financial`. **Não** audita alíquotas (T-08), teto de desconto (`BR-COM-009`), tabela
  de preço por cliente (`T32-COM-F03`) nem o fluxo de emissão parcial em si.

**ARQUIVOS LIDOS NESTA ANÁLISE (caminhos absolutos):**

- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\client\src\pages\sales\SalesPage.tsx` (parcial: 408-477)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\sales\application\use-cases\CreateSaleUseCase.ts` (parcial: 108-167)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\fiscal\application\use-cases\IssueSaleNfeUseCase.ts` (parcial: 195-244, 260-299, 418-435 + grep integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\services\saleReceivableService.ts` (parcial: 185-224 + grep integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\T-32_CLIENT_COMERCIAL_FINANCEIRO.md`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\coretriad\states\ERP-LEGACY-001\PRODUCTION_STATUS_MAP.md`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\coretriad\governance\APPROVALS.md` (parcial, por consulta dirigida)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\coretriad\projects\ERP-LEGACY-001\BR_CATALOG.md` (parcial, por consulta)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\coretriad\projects\ERP-LEGACY-001\discovery\REQUIREMENTS_BASELINE.md` (parcial, por consulta)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\coretriad\projects\ERP-LEGACY-001\discovery\LEGACY_TRACEABILITY_MATRIX.md` (parcial, por consulta)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\coretriad\projects\ERP-LEGACY-001\discovery\LEGACY_TRACEABILITY_MATRIX_comercial-financeiro.md` (parcial, por consulta)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\AUD-DEP-JSYAML-01.md` (referência de estrutura)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\CLAUDE.md`

---

*Produzido e persistido por `vericore-audit-evidence-controller` — ponto único de
persistência de evidência em `audit/` (§23 do Master Spec). STATUS permanece `PROPOSED`.
A validação adversarial pelo `vericore-finding-validator` **não ocorreu** e é
**obrigatória** antes de qualquer remediação (Regra 22).*
