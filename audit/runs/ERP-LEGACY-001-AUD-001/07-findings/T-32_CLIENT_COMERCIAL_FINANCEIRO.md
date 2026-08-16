# T-32 — `client/`, trilha 5/6: Comercial, Executivo, Financeiro, Vendas, Relatórios

Run `ERP-LEGACY-001-AUD-001` · Célula `C-133` · AUDIT_COMMIT
`c1311a6f76b512fef893f7e60d934179cae3409f`
Evidência 100% estática. Nenhum comando, build, teste ou acesso a banco executado.

> **Nota de persistência.** Write bloqueado na sessão do agente. Persistido pelo orquestrador **sem
> alteração**.

## 1. Inventário próprio

**21 arquivos**, coincide com o escopo. Sem divergência (Regra 20). Observação de nomenclatura (não
material): 7 dos 21 não são páginas roteadas — são abas/compartilhados montados dentro das páginas.
13 lidos integralmente, 8 de forma dirigida.

## 2. Findings `PROPOSED`

### `T32-COM-F01` — HIGH · A UI declara um desconto que a NF-e e o recebível não aplicam

A tela apresenta "Soma dos itens" (bruto), "Desconto" e "Total da venda"; o total é
`sale.total_amount`, gravado **já líquido**. A cadeia fiscal recalcula por `quantidade × preço
unitário`, **sem termo de desconto**: a NF-e sai pelo bruto e o recebível nasce pelo bruto.

- `SalesPage.tsx:416` — exibe "Desconto"; `:463-471` — "Soma dos itens" × "Total da venda".
- `CreateSaleUseCase.ts:143-155` — `totalNetCents = totalCents - discountCents; … total_amount: totalNet`.
- `IssueSaleNfeUseCase.ts:213-214` — `invoiceTotal = round(invoiceQty * unitPrice * 100)/100; totalAmount += invoiceTotal;`
- `saleReceivableService.ts:200,215` — plano de parcelas sobre `invoiceTotal`.

**Impacto:** cliente recebe NF-e e boleto **acima do preço negociado exibido**; divergência
silenciosa entre `sales.total_amount` e `SUM(accounts_receivable.amount)`.
**Confirma e estende `T-10-02` pelo lado do cliente — a UI não apenas omite o desconto, ela o
afirma como aplicado.**
**Reteste:** venda com desconto → `sales.total_amount` == soma das parcelas == `sale_invoices.total_amount`.

### `T32-COM-F03` — HIGH · Tabela de preço por cliente: backend e frontend delegam a sugestão um ao outro

A UI afirma (`ClientsPage.tsx:197-203`): "O preço aqui cadastrado passa a ser sugerido
automaticamente ao adicionar aquele produto num pedido de venda daquele cliente". O backend afirma o
simétrico (`CreateCustomerPriceUseCase.ts:8-12`): "a sugestão de preço acontece na camada de
apresentação/frontend". `listCustomerPrices` é chamado em **um único lugar** de todo o cliente —
dentro do próprio diálogo de cadastro. `SalesPage.tsx` **não importa, não chama e não conhece** a
tabela de preços (`:177-201`, itens com inputs livres).

**Confirma `T27-RFQ-07` e acrescenta fato novo: os dois lados documentam a funcionalidade como
existente.** Contradição documento × código nos termos da Regra 21, com dois artefatos versionados
afirmando o que o código nega.

### Demais findings

| ID | Achado | Sev. |
|---|---|---|
| `T32-COM-F02` | Desconto, forma de pagamento e parcelamento **sem campo em tela alguma** — `grep discount` em `client/src` retorna só tipo e exibição. Conceder desconto só por chamada direta à API; `sale.installments` fica permanentemente em 1. Única barreira contra desconto abusivo é `discount <= total` (`CreateSaleUseCase.ts:144-146`) — **sem alçada, teto ou aprovação**. Cruza `T27-RFQ-08` | MEDIUM |
| `T32-COM-F04` | Definir preço de cliente não é ato de alçada em nenhum dos dois lados (`ClientsPage.tsx:162-168` × `sales.ts:40-42`), contra `sales.ts:54,56` (NF-e em `approve`). **Emitir a nota exige gestor; definir o preço que a nota vai carregar, não** | MEDIUM |
| `T32-COM-F05` | "Somente leitura no Financeiro" é regra que existe **só no cliente**. No servidor **não existe nível de leitura**: `AccessModuleLevel` é `'operate'\|'approve'` (`accessModules.ts:248`) e `finance.ts:25-53` usa o mesmo nível em GET e POST. **Quem lista as contas pode pagar as contas.** Pior: o eixo do gate do cliente (`role`) não é o do servidor (`permissions.financeiro`). Nota: o comentário cita "CLAUDE.md §4" como fonte, mas a Regra 4 trata de `RETEST_PASSED` — **citação normativa pendurada** | MEDIUM |
| `T32-COM-F06` | A Sala de Comando é guardada por `ModuleRoute module="diretor"`, módulo que **não protege nenhum dos 5 endpoints** dela. Dupla incoerência: quem tem `diretor` sem `relatorios.*` passa pelo guard e toma 403 (o sintoma V-2 que `App.tsx:108-110` declara corrigido — **a correção não corrige**); quem tem os `relatorios.*` sem `diretor` é barrado pela UI e obtém tudo chamando os 5 endpoints | MEDIUM |
| `T32-COM-F07` | Regra de ativação de campanha só no servidor: o usuário escolhe "Ativa" com orçamento `pending`, salva e só então recebe 422 — **o dado para antecipar está na mesma tela** (`BudgetApprovalBadge`, `CampaignsTab.tsx:122`), e o formulário não o consulta (`:289-297` × `UpdateCampaignUseCase.ts:56-58`) | MEDIUM |
| `T32-COM-F12` | Handoff Marketing→Vendas depende de endpoint que **só admin** pode chamar: botão para `marketing:operate` (`LeadsTab.tsx:167`), seletor alimentado por `usersApi.listUsers`, rota `authorize('admin')` (`users.ts:14`). A query não trata erro (`:524`, `users?.data ?? []`): select vazio, "Atribuir" permanentemente desabilitado, sem explicação. Como `in_sales_attendance` exige `sales_owner_user_id`, **o lead qualificado trava no funil e o SLA estoura sem caminho de tela** | MEDIUM |
| `T32-COM-F08` | Falha ao carregar permissões abre todas as abas de relatório (`ReportsPage.tsx:175-176`). Dados seguem protegidos (403) — fallback deliberado (`AuthContext.tsx:50-57`); registrado porque degradar **abrindo** só é aceitável enquanto o backend for a barreira real | LOW |
| `T32-COM-F09` | Leitura de projeção de caixa exige nível de escrita: `finance.ts:40-44` tem três leituras vizinhas com dois critérios | LOW |
| `T32-COM-F10` | "Conciliar" **quita a conta** (`MatchEntryUseCase.ts:79-84,118-123` grava `status:'paid'`, `amount_paid` cheio e `payment_date`) por um botão de 6px sem confirmação (`ReconciliationTab.tsx:256-272`) — assimétrico com o pagamento manual da mesma tela | LOW |
| `T32-COM-F11` | Saldo inicial da projeção de caixa é **digitado pelo usuário** (`DailyCashFlowProjectionTab.tsx:30-31`, default `'0'`), enquanto o saldo bancário real vive em `tesouraria`. O indicador de risco de caixa negativo é ancorado em número não auditável | LOW |
| `T32-COM-F13` | Captação **em lote** grava dado pessoal sem registro de consentimento — no unitário há a caixa (`LeadsTab.tsx:346-349`), no lote o payload é `{name,email,phone}` (`:390-400`). Adicional: `consent_channel` está nos dois schemas e **não é renderizado em campo algum** — o consentimento é gravado sem o canal que o comprova | LOW |
| `T32-COM-F14` | JWT em `localStorage` (`httpClient.ts:3-18,40-46`) — **provável duplicata** de T-18/T-21, registrado para não omitir a verificação, com pedido explícito de deduplicação | LOW |

## 3. Conformidades verificadas

| ID | Conformidade | Prova |
|---|---|---|
| C-01 | Diretoria: leitura `diretoria`, escrita `diretoria:approve` nas 4 abas | `DirectoratePage.tsx:18-27`; `OrgChartTab.tsx:26`; `StrategicPlanningTab.tsx:60`; `MeetingMinutesTab.tsx:43`; `BusinessRisksTab.tsx:69` × `directorate.ts:35-54` |
| C-02 | Marketing: `operate` escrita, `approve` orçamento e material | `CampaignsTab.tsx:32-33,148`; `MaterialsTab.tsx:26-27,142` × `marketing.ts:42-45,78-81` |
| C-03 | Imutabilidade de campanha concluída (RF-MKT-034) nos dois lados | `CampaignsTab.tsx:208-209,226-227` × `UpdateCampaignUseCase.ts:23,46-54` |
| C-04 | Pagamento acima do saldo barrado no servidor (UI é a camada permissiva — direção segura) | `PayPayableUseCase.ts:57-60`; `ReceivePaymentUseCase.ts:57-60` |
| C-05 | Auditor Inteligente restrito a `admin` nos dois lados | `IntelligentAuditorPage.tsx:83-93`; `App.tsx:628` × `authorize('admin')` |
| **C-06** | **Regra 24 — nenhuma violação.** `role`/`permissions` sempre do contexto autenticado, resolvidos no servidor a cada request a partir do banco; nenhuma tela envia `role`/`isAdmin`/`perfil`/nível | `AuthContext.tsx:126-138` × `middlewares/auth.ts:77-128` |
| C-07 | NF-e emitir/cancelar em `vendas:approve` nos dois lados, com mensagem explícita quando falta o nível | `SalesPage.tsx:311-316,504-543` × `sales.ts:54,56` |
| C-08 | Edição de itens travada após faturamento | `SalesPage.tsx:333-336` × `sales.ts:47-50` |
| C-09 | Conciliação: sinal, status e tolerância validados no servidor | `MatchEntryUseCase.ts:42-116` |
| C-10 | `risk_score` e status de planejamento nunca calculados no cliente | `BusinessRisksTab.tsx:51-60` × `directorate.ts:43,53-54` |
| C-11 | Honestidade de indicador: `null` vira "—", erro não vira fato de negócio | `CommandCenterPage.tsx:36-46,153-160,292-299` |

## 4. Resposta à pergunta central

**Não.** Três decisões visíveis na UI não têm contraparte real no backend:

1. **"Somente leitura no Financeiro"** (F05) — não existe nível de leitura no modelo de permissões.
2. **"A Sala de Comando é da diretoria"** (F06) — o módulo do guard não protege nenhum dos 5
   endpoints, nos dois sentidos.
3. **"O desconto foi aplicado" / "o preço negociado é sugerido"** (F01, F03) — a UI afirma efeitos
   comerciais que a cadeia fiscal e financeira não produz.

Em contrapartida, **nenhuma violação da Regra 24** (C-06), e o eixo módulo × nível está corretamente
espelhado em Diretoria, Marketing e emissão de NF-e.

**Sobre agregação:** **nenhum dado agregado expõe mais do que a permissão individual** —
`/dashboard` e `/reports` dependem de endpoints que impõem cada um o seu módulo. O que não existe é
qualquer autorização server-side **sobre a consolidação**.

## 5. Cobertura e lacunas

**21/21 arquivos (100%)** — 13 integralmente, 8 de forma dirigida (cabeçalho, JSDoc normativo,
gates, chamadas de API, formulários): suficiente para o mandato UI × backend, **insuficiente** para
afirmar ausência de achado na lógica de renderização desses 8. **8/8 rotas** cruzadas; **9 módulos**
do servidor verificados.

| L | Lacuna |
|---|---|
| L-1 | F12: 403 de `GET /api/users` e lista vazia não observados em execução |
| L-2 | F01: divergência numérica não medida com dado real |
| L-3 | F06: comportamento de usuário com `diretor` e sem `relatorios.*` |
| L-4 | Nenhuma verificação de estado de navegador |
| L-5 | Os 8 arquivos de leitura dirigida não tiveram renderização auditada linha a linha |

**Cruzamentos:** `authorization-auditor` (F04, F05, F06, F12); compliance/LGPD (F13); `T-10-02` (F01
é o lado-cliente, estendido); `T27-RFQ-07`/`T27-RFQ-08` (F03 e F04); `T-18`/`T-21` (F14, provável
duplicata).
