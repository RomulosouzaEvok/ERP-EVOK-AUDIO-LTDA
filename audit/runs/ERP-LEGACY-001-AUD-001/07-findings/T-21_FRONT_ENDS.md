# Confirmed: `Product` (the type returned by `GET /api/products`, list endpoint) declares `cost_price` on every row unconditionally — `client/src/api/products.ts:11`. This closes my evidence gathering. Now the final report.

> **Nota de persistência.** Produzido pelo `vericore-frontend-auditor` (T-21 front-ends client mobile tv) e persistido
> **sem alteração de conteúdo** pelo orquestrador — o agente é read-only por
> desenho e não pode escrever em `audit/`. O juízo de auditoria é
> integralmente da trilha. Única transformação aplicada: promoção do
> cabeçalho a H1 e desescape de entidades HTML.

---

## T-21 — FRONT-ENDS · RELATÓRIO DE TRILHA

```
AUDIT_ID:  ERP-LEGACY-001-AUD-001
TRILHA:    T-21 — FRONT-ENDS (client / mobile / tv)
TITULAR:   vericore-frontend-auditor
AUDIT_COMMIT: c1311a6f76b512fef893f7e60d934179cae3409f
```

**COBERTURA EFETIVA (honesta):**
- `client/src/pages/**`: 167 arquivos `.tsx` no inventário (5 deles são `*.test.tsx` — `LoginPage.test.tsx`, `LandingPage.test.tsx`, `InventoryCountsPage.test.tsx`, `ProductionRoutesPage.test.tsx`, `MasterProductionPlanPage.test.tsx` — contados no total de 167 do plano §4.4, não são telas; registro isso como nota metodológica, não corrijo o inventário).
- **41 páginas** (lista nominal abaixo) foram lidas — profundidade desigual, declarada por página no fechamento:
  - **Leitura profunda + cruzamento com backend** (código-fonte do endpoint e/ou validador lido lado a lado): `ProductsPage.tsx`, `SalesPage.tsx` (SaleDetailSheet/NF-e), `FiscalConfigPage.tsx`, `AccidentsTab.tsx` (CAT), `RequisitionsPage.tsx` (compras), `LgpdTab.tsx` (parcial), mais `httpClient.ts`, `AuthContext.tsx`, `ProtectedRoute.tsx`, `accessProfiles.ts` (infraestrutura transversal, não é "página" mas sustenta o veredito sobre todas).
  - **Leitura estrutural + grep dirigido** (imports, gates de role, presença de schema Zod, mas sem percorrer 100% do JSX): as demais 36 páginas da lista.
- **Duas varreduras foram feitas sobre `client/src` inteiro (não amostral)**: `localStorage` (3 arquivos) e `dangerouslySetInnerHTML` (1 arquivo, componente `chart.tsx`, não uma página). Essas duas conclusões valem para as 167 páginas, não só para a amostra de 41.
- **`mobile/` e `tv/`**: não explorei neste relatório — **lacuna registrada abaixo**, não declaração de conformidade.

**Lista nominal da amostra (41 páginas):**

*Tier 1 (identidade, cadastro, auditoria):*
1. `client/src/pages/products/ProductsPage.tsx` (items)
2. `client/src/pages/products/ItemMasterPage.tsx` (items)
3. `client/src/pages/products/ItemMasterDetailPage.tsx` (items)
4. `client/src/pages/users/UsersPage.tsx` (users)
5. `client/src/pages/users/AccessProfilesPage.tsx` (identidade/authz)
6. `client/src/pages/traceability/AuditLogsPage.tsx` (auditLogs)
7. `client/src/pages/LoginPage.tsx` (auth)
8. `client/src/pages/ForgotPasswordPage.tsx` (auth)
9. `client/src/pages/ResetPasswordPage.tsx` (auth)
10. `client/src/pages/ChangePasswordPage.tsx` (auth)
11. `client/src/pages/AccessDeniedPage.tsx` (controle de UI de authz)
12. `client/src/pages/hr/DepartmentsTab.tsx` (departments)

*Tier 2 (alto risco):*
13. `client/src/pages/sales/SalesPage.tsx` — item citado no mandato (NF-e)
14. `client/src/pages/sales/ClientsPage.tsx`
15. `client/src/pages/settings/FiscalConfigPage.tsx` (fiscal)
16. `client/src/pages/purchases/PurchasesPage.tsx`
17. `client/src/pages/purchases/RequisitionsPage.tsx`
18. `client/src/pages/purchases/SuppliersPage.tsx`
19. `client/src/pages/purchases/RfqPage.tsx`
20. `client/src/pages/purchases/ComexPage.tsx`
21. `client/src/pages/purchases/ImportApprovalGateCard.tsx`
22. `client/src/pages/logistics/ReceivingPage.tsx` (fluxo item↔produto↔recebimento, `3dee99f`)
23. `client/src/pages/logistics/ReceivingConferenceDialog.tsx`
24. `client/src/pages/logistics/InventoryPage.tsx`
25. `client/src/pages/products/InventoryCountsPage.tsx`
26. `client/src/pages/logistics/BalancesTab.tsx`
27. `client/src/pages/logistics/LotsTab.tsx`
28. `client/src/pages/logistics/TransfersTab.tsx`
29. `client/src/pages/traceability/TraceabilityPage.tsx`
30. `client/src/pages/production/ProductionOrdersPage.tsx`
31. `client/src/pages/production/MrpPage.tsx`
32. `client/src/pages/production/BomPage.tsx`
33. `client/src/pages/production/CompleteProductionOrderDialog.tsx`
34. `client/src/pages/production/CompleteOrderWithLotScanDialog.tsx`
35. `client/src/pages/financial/FinancialPage.tsx`
36. `client/src/pages/financial/ReconciliationTab.tsx`
37. `client/src/pages/treasury/TreasuryPage.tsx`
38. `client/src/pages/accounting/AccountingPage.tsx`
39. `client/src/pages/budget/BudgetPage.tsx`

*Tela citada por finding externo:*
40. `client/src/pages/sst/AccidentsTab.tsx` — CAT (`FIND-ERP-008`, T12-H03)
41. `client/src/pages/juridico/LgpdTab.tsx` — cruzamento com T12-H04 (leitura de dado pessoal sem trilha)

**Declaração negativa obrigatória:** **126 das 167 páginas do `client/` NÃO foram auditadas** nesta run. Motivo: fora da amostra de risco (tiers 1/2 já cobertos pelas 41 acima; as 126 restantes são majoritariamente Tier 3 — `hr/` (exceto Departments), `sst/` (exceto Accidents), `ti/`, `facilities/`, `marketing/`, `engineering/`, `laboratory/`, `quality/`, `maintenance/`, `patrimonio/`, `executive/`, `home/widgets/*`, `juridico/` (exceto Lgpd), `accounting/`/`budget`/`treasury` sub-abas além da principal, `reports/`) — não cobertas por profundidade, sem indício de finding externo que as puxe para a amostra. Estão como **NÃO COBERTO** na matriz, não como "sem achado".

---

### MATRIZ UI-CONTROLE × BACKEND-CONTROLE (achados e confirmações)

| # | Tela (arquivo:linha) | Controle na UI | Endpoint/contraparte backend | Veredito |
|---|---|---|---|---|
| 1 | `sst/AccidentsTab.tsx:391-399` (via `api/sst.ts:388-394`) | Botão único "Emitir CAT inicial", sem seletor de tipo, sem alerta para `gravidade:'obito'` | `POST /api/sst/accidents/:id/cat` → `EmitCatUseCase.ts:60` | **CONFIRMA `FIND-ERP-008`/`T12-H03` por leitura independente.** A UI não mitiga: é o único caminho de emissão (`sst.ts:391` envia `{tipo:'inicial'}` literal, hardcoded, sem campo de formulário) e não exibe nenhum aviso quando `accident.gravidade==='obito'`. Produz **exatamente** a combinação contraditória (tipo=inicial + prazo de óbito), sem chance de o operador perceber antes do envio — o registro nasce já errado e é imutável (trigger `trg_sst_lock_cat`, já citado por T-12). |
| 2 | `sales/SalesPage.tsx:369-377` (via `api/fiscal.ts:24-28`) | `GET /api/sales/:id/nfe` disparado só por clique manual em "Consultar status" (`checkStatusMutation`) | `GET /api/sales/:id/nfe` — efeito patrimonial per T-08/T-10/T-17 | **Mitigação parcial confirmada.** Não há `refetchInterval`, `refetchOnWindowFocus`, `retry` automático nem prefetch — busquei os três padrões no arquivo e não há ocorrência. A chamada só ocorre por ação explícita do usuário. **Isto não neutraliza o achado backend** (o efeito patrimonial do GET continua existindo no servidor), mas refuta a hipótese de agravamento por polling/retry client-side. Ver escalonamento 1. |
| 3 | `sales/SalesPage.tsx:504-543` | Botões de emitir/cancelar NF-e ocultos com `canApproveNfe = hasRole('admin') \|\| permissions?.vendas === 'approve'`, com texto explicativo quando ausente (comentário explícito no código: "evitando um 403 didaticamente inútil") | `authorizeModule('vendas','approve')` (citado no comentário da própria tela) | **Consistente.** Padrão de UI×backend correto e documentado no próprio código. |
| 4 | `purchases/RequisitionsPage.tsx:366-380` | Botão "Aprovar" só renderiza com `isAdmin = hasRole('admin')` | `PATCH /api/purchase-requisitions/:id/status` — comentário em `client/src/api/purchaseRequisitions.ts:107`: "aprovação é admin-only" | **Consistente**, confirmado por leitura cruzada UI↔comentário-de-API. Nota lateral: usa `role` global (`admin`), não o nível fino `AccessModuleKey='requisicoes', level='approve'` do sistema de perfis — ou seja, este endpoint específico não segue o modelo de autorização granular por módulo que o resto do sistema (accessProfiles) foi construído para suportar. Isto é uma observação de **inconsistência de modelo de autorização**, não uma brecha (a UI não permite mais do que o backend permite) — encaminho ao authorization-auditor (escalonamento 2), não julgo aqui. |
| 5 | `products/ProductsPage.tsx` + `api/products.ts:4-18` | Campo `cost_price` só aparece no formulário de **criação** de produto (gated por `canWrite = hasRole('admin','operator')`); a tabela de listagem (linhas 287-338) renderiza só `product.price` (venda), nunca `cost_price` | `GET /api/products` — tipo `Product` (`api/products.ts:11`) inclui `cost_price` em **toda linha** da resposta, sem variação condicional visível no cliente | **T21-F01 (candidato a finding) — dado sensível sobre-exposto na resposta de API.** A UI nunca *exibe* `cost_price` na lista, mas o contrato de tipos do cliente mostra que o endpoint devolve o campo incondicionalmente a qualquer chamador autenticado que possa listar produtos (potencialmente qualquer nível `operate` do módulo `produtos` — estoque, produção, chão de fábrica, não só compras/financeiro). Não tenho acesso ao código-fonte do backend desta trilha para confirmar se há filtragem por role no `ProductController`/`ListProductsUseCase` — **isto é uma lacuna que exige leitura do lado servidor, fora do meu escopo de mandato nesta amostra**; registro como candidato e encaminho. Severidade proposta: **MEDIUM** (exposição de custo de fornecedor a papéis operacionais sem necessidade de tela), confiança: **MÉDIA** (confirmei o contrato do cliente; não confirmei ausência/presença de filtro server-side). |
| 6 | `context/AuthContext.tsx:126-138`, `routes/ProtectedRoute.tsx` | `hasRole`/`hasModuleAccess` derivam de `user` (`GET /api/auth/me`) e `permissions` (`GET /api/auth/me/permissions`) — **nunca** de payload de token decodificado no cliente nem de campo enviado pelo próprio cliente | Comentário explícito em `ProtectedRoute.tsx:30-32`: "a autorização de verdade continua sendo sempre a da API... nunca confiar só nesta checagem client-side" | **Sem violação da Regra 24.** Confirmo por leitura própria: o "papel" que a UI usa para decidir o que mostrar é sempre asserção do servidor, nunca dado auto-declarado pelo cliente. Registro como confirmação positiva (ausência de achado), não como finding. |
| 7 | `settings/FiscalConfigPage.tsx:39-58` vs `server/src/modules/fiscal/presentation/validators/fiscalValidators.ts:30-49` | Schema Zod do cliente (`fiscalConfigSchema`) | `upsertCompanyFiscalConfigSchema` (`.strict()`) | **Sem divergência material encontrada** neste par específico (campos, tipos, tamanhos e enums batem; cliente não envia `nfe_next_number`, coerente com o `.strict()` do servidor e com o JSDoc do `fiscal.ts:104-107`). Esta é uma checagem pontual, não exaustiva dos "40+ arquivos" citados por `T18-F08` — cubro 1 de N pares. **Confirma, no caso amostrado, a conclusão de T18-F08** ("não existe contrato compartilhado, mas isso não significa divergência automática") — aqui os dois lados convergiram por autoria independente e cuidadosa. |
| 8 | `client/src/api/httpClient.ts:3-17` | Token JWT em `localStorage` (`evok_erp_token`) | — | **Confirmo por leitura própria `T18-F14`** (já emitido por T-18). Não abro novo finding — cross-referência apenas, conforme mandato. |
| 9 | `client/src/components/ui/chart.tsx:93-105` | `dangerouslySetInnerHTML` usado para injetar CSS de tema de gráfico | — | Varredura completa de `client/src` (não amostral) encontrou **1 único uso** em todo o cliente, em componente de biblioteca (shadcn), alimentado por `config.theme`/`config.color` — objetos estáticos definidos por quem monta o gráfico em cada página, não por resposta de API nem por input de usuário nas 41 páginas lidas. **Não identifiquei caminho de dado controlado por usuário chegando a este sink** nas páginas amostradas. Registro como observação de higiene (INFO), não finding — não posso provar ausência de um caminho em página fora da amostra sem lê-la. |
| 10 | `juridico/LgpdTab.tsx:332-336` | Lista de solicitações de titular renderiza `request.requester_name` na tela; `requester_document` (CPF) é usado só como campo de formulário de criação (não vi renderização em lista/detalhe dentro do que li) | `GET /api/jur/lgpd/data-subject-requests` sem `logAction` (per `T12-H04`, já emitido) | **Cross-referência a `T12-H04`, sem achado novo do meu lado**: a tela consome e mostra dado pessoal (nome do titular) de uma lista cujo `GET` o T-12 já provou não deixar rastro de leitura. Não verifiquei se o CPF completo aparece em algum modal de detalhe que não li — **lacuna declarada**, não afirmação de ausência. |

---

### FINDINGS PROPOSTOS

**`T21-F01` — `cost_price` presente incondicionalmente na resposta de `GET /api/products`, consumido pelo cliente, sem confirmação de filtro por papel**
- Severidade proposta: MEDIUM · Confiança: MÉDIA (client-side confirmado; server-side não lido nesta trilha)
- Âncora: `client/src/api/products.ts:4-18` (tipo `Product.cost_price: string`), `client/src/pages/products/ProductsPage.tsx:287-338` (lista não exibe o campo, mas o contrato de tipo indica que ele chega ao browser)
- Impacto: se o backend não filtrar por nível de módulo (`produtos`), qualquer usuário com acesso de leitura ao módulo produtos (potencialmente estoque, chão de fábrica, produção) recebe o custo de aquisição/fabricação no payload de rede, mesmo que a tela nunca o desenhe — dado comercialmente sensível trafegado além da necessidade da tela.
- Ação recomendada: encaminhar ao `vericore-fullstack-auditor` (co-titular desta trilha, mandato de fronteira contrato×consumo) ou a quem tiver mandato de leitura do `ListProductsUseCase`/`ProductController` no backend, para confirmar/refutar se há projeção de campos por role.

**Observação registrada, sem finding formal (por falta de mandato de veredito):** inconsistência de modelo de autorização em `RequisitionsPage.tsx:366` — usa `hasRole('admin')` (papel global) em vez do par módulo/nível (`requisicoes`/`approve`) que o resto do sistema (`accessProfiles`) foi desenhado para suportar. Não é uma brecha (não amplia acesso), mas é uma divergência de padrão que compete ao authorization-auditor avaliar se compromete a segregação de funções pretendida pelo UC-30/UC-34.

---

### ESCALONAMENTOS

1. **Para `vericore-fullstack-auditor` / quem tiver mandato sobre `server/src/modules/products`:** confirmar se `GET /api/products` filtra `cost_price` por nível de módulo. Sustenta `T21-F01`.
2. **Para `vericore-authorization-auditor`:** `RequisitionsPage.tsx:366` usa `role` global (`admin`) para gatilhar UI de aprovação de requisição de compra, em vez do par módulo/nível (`requisicoes`/`approve`) do sistema de perfis de acesso construído para o resto do app (`accessProfiles.ts`). Backend citado (comentário do cliente) confirma "admin-only" — não há discrepância de acesso, mas há divergência de modelo que pode ser sintoma de segregação de funções incompleta nesse endpoint específico. Não julgo — encaminho para mandato próprio.
3. **Para `vericore-software-audit-director`:** a mitigação encontrada no item 2 da matriz (GET NF-e disparado só por clique manual) é relevante para o dimensionamento de severidade de `T-08`/`T-10`/`T-17` sobre o efeito patrimonial do `GET /api/sales/:id/nfe` — reduz o vetor de "amplificação automática pela UI", mas não neutraliza o achado backend. Repasso o fato, não a decisão de severidade (mandato de quem já titula essas trilhas).
4. **Lacuna declarada — `mobile/` e `tv/`:** não explorados nesta run por restrição de tempo/orçamento (4S), mesmo como "varredura estrutural" prevista no plano. Não afirmo conformidade nem não-conformidade — registro como pendência aberta para eventual continuação da trilha ou nova rodada.
5. **Lacuna declarada — 126 páginas Tier 3 não amostradas** — ver declaração negativa acima. Se qualquer finding de outra trilha (W1-W2 remanescentes ou revisão) apontar para uma dessas telas, ela deve ser puxada para reamostragem, seguindo o mesmo critério usado para CAT e LGPD nesta run.
6. **`T21-F01`** não atinge CRITICAL/HIGH pelo meu julgamento de confiança parcial (server-side não lido) — não encaminho ao `finding-validator` compulsoriamente pela Regra 22, mas sinalizo que, se o escalonamento 1 confirmar ausência de filtro, a severidade deve ser reavaliada para HIGH (exposição sistemática de custo a papéis não financeiros).

---

### ARQUIVOS LIDOS

- `audit/runs/ERP-LEGACY-001-AUD-001/02-plan/AUDIT_PLAN.md` (linhas 480-549)
- `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/T-12_PESSOAS_COMPLIANCE.md` (T12-H03/H04)
- `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/T-18_APPSEC_SEGREDOS_DEPENDENCIAS.md` (T18-F08, T18-F14)
- `client/src/api/httpClient.ts`
- `client/src/api/fiscal.ts`
- `client/src/api/sst.ts`
- `client/src/api/accessProfiles.ts`
- `client/src/api/products.ts`
- `client/src/api/purchaseRequisitions.ts` (comentário, linha 107)
- `client/src/context/AuthContext.tsx`
- `client/src/routes/ProtectedRoute.tsx`
- `client/src/pages/sst/AccidentsTab.tsx` (leitura completa)
- `client/src/pages/sales/SalesPage.tsx` (parcial, foco em `SaleDetailSheet`)
- `client/src/pages/settings/FiscalConfigPage.tsx` (leitura completa)
- `client/src/pages/products/ProductsPage.tsx` (parcial)
- `client/src/pages/purchases/RequisitionsPage.tsx` (parcial)
- `client/src/pages/juridico/LgpdTab.tsx` (parcial)
- `client/src/components/ui/chart.tsx` (trecho `dangerouslySetInnerHTML`)
- `server/src/modules/fiscal/presentation/validators/fiscalValidators.ts` (leitura completa, cruzamento)
- Grep estrutural (imports/roles/`useAuth`) nas 36 páginas restantes da lista nominal, não reproduzido linha a linha neste relatório.

### DYN

Nenhuma evidência dinâmica coletada — `APR-2026-016` (read-only reforçado) e G4 aprovado sem execução por esta trilha. Nenhum `DYN-T21-nn` registrado; se o diretor exigir confirmação dinâmica de comportamento de rede (ex.: payload real de `GET /api/products`), encaminhar ao `vericore-audit-verification-runner`.
