# REQUIREMENTS_BASELINE.md — ERP-LEGACY-001, Passo 27 (Requisitos recuperados)

```
PROJECT_ID: ERP-LEGACY-001
AUDIT_COMMIT: c9359be399c45191fe90e8e9707803125a5ba91d (tag legacy-baseline-001)
TEMPLATE: audit/templates/REQUIREMENT_AND_NFR_TEMPLATE.md
MÉTODO: Read/Grep/Glob apenas — sem Bash, sem banco, sem execução.
INSUMOS: DOMAIN_MAP.md (25), MODULE_CATALOG.md + API_INVENTORY.md (23),
         os 6 BUSINESS_RULE_CANDIDATES_*.md (26), FIND-ERP-001/002/005/006/007/008/009.
REGRA 2: DOCUMENTO_DE_REQUISITOS.md e REQUISITOS_NAO_FUNCIONAIS.md foram tratados como
         CANDIDATOS DE ALTA CONFIANÇA A VALIDAR, nunca como fonte de verdade.
REGRA 6: nenhum requisito foi inventado. Comportamento real sem requisito é registrado como
         `INFERRED — NEEDS HUMAN VALIDATION`, com ID candidato marcado como INEXISTENTE.
```

## 0. Placar

| Veredito | Qtd | Significado |
|---|---|---|
| `CONFIRMED` | 21 | documentado E implementado, batendo, com teste |
| `CONFLICTING` | 24 | documento e código divergem (dois lados citados) |
| `INFERRED — NEEDS HUMAN VALIDATION` | 38 | comportamento real sem requisito que o cubra (**requisito fantasma**) |
| `OBSOLETE_CANDIDATE` | 6 | requisito/código documentado sem contraparte viva |
| **Requisitos catalogados** | **89** | |

Insumo bruto: **~52 regras `DISCOVERED` + ~10 `UNKNOWN`** dos 6 arquivos do passo 26.

**Achado estrutural do passo (produto central):** o ERP tem **681 endpoints em 48 módulos** e
**90 RFs** em `DOCUMENTO_DE_REQUISITOS.md`. Treze módulos não têm **nenhum** RF nesse documento,
entre eles `items` e `categories` — dois dos **seis módulos PRODUÇÃO REAL**. **O cadastro mestre
com 327 registros reais em produção não tem um único requisito funcional escrito.**

---

## 1. Como o documento existente foi tratado (Regra 2)

`DOCUMENTO_DE_REQUISITOS.md` declara (`:14-20`) que cada RF foi extraído de leitura real de
rotas, e registra (`:241-256`) que a auditoria de 2026-08-12 corrigiu 7 alegações falsas. **A
autocorreção é real e verificável — e continua incompleta.** Confronto dos 90 RFs encontrou mais
divergências, inclusive **dentro do próprio texto de correção**:

| # | Alegação do documento | Código no AUDIT_COMMIT | Veredito |
|---|---|---|---|
| 1 | RF-AUT-09 (`:45`): "14 módulos em débito congelado" e lista `maintenance` | `audit-coverage-guard.test.ts:49-63` tem **13** entradas, **sem `maintenance`** | **CONFLICTING** — a linha escrita *pela auditoria de 12/08* erra a contagem |
| 2 | RF-COM-05 (`:73`): "Desde 2026-08-12" | código diz **2026-08-11** (BR-SUP-005) | **CONFLICTING** (vigência) |
| 3 | RF-COM-02 (`:70`): segregação `[IMPLEMENTADO]` | `PLANO_ACAO...:136-142` e `TODO.md:5271-5274`: "não implementa segregação em nenhum ponto" | **CONFLICTING** (Regra 20) |
| 4 | RF-AUT-05/07 (`:41,43`): perfis por módulo, "403 consistente" `[IMPLEMENTADO]` | `module-authorization-map.test.ts:120-133` exclui **12 módulos**, entre eles `categories`, `departments`, `users` (PRODUÇÃO REAL) | **CONFLICTING** (§3.1) |
| 5 | RF-RH-02 (`:169`): "Departamentos com hierarquia e gestor" `[IMPLEMENTADO]` | `directorate_id` só escrito por `seeds.ts:175`; `manager_id` só no PUT, não validado | **CONFLICTING** (§3.2) |
| 6 | RF-QUA-02 (`:121`): ciclo de status da RNC `[IMPLEMENTADO]` | `UpdateNonConformityUseCase.ts:26-36` aceita qualquer valor; `effectiveness_result` sem escrita | **CONFLICTING** (§3.3) |
| 7 | RF-FIN-07 (`:144`): CNAB `[PENDENTE]` | `cnab.ts:22-31` tem **8 endpoints**; `finance.ts:59` monta só `/reconciliation`; nunca montado | **OBSOLETE_CANDIDATE** |

**Conclusão de método:** o documento é utilizável como índice, **não como baseline**. Taxa de
erro medida: 7 divergências novas após revisão de auditoria feita 1 dia antes do AUDIT_COMMIT.

---

## 2. Camada 1: os 6 módulos PRODUÇÃO REAL (cobertura alta)

### 2.1 `auth` e `users`

- **RF-AUT-01** Login/JWT/rate-limit 10/15min — CONFIRMED (com lacuna de teste do limiar — NFR-SEC-02).
- **RF-AUT-02** Renovação deslizante — CONFIRMED (doc × código × teste, auth-refresh.test.ts).
- **RF-AUT-03** Recuperação de senha — CONFIRMED no comportamento; **CONFLICTING no contrato de
  erro**: `API.md:274-275` publica 422; código lança 401 (`ResetPasswordUseCase.ts:51`), teste
  consagra 401 (BR-IAM-009).
- **RF-AUT-04** CRUD de usuários — **CONFLICTING**: (1) auto-inativação proibida no
  `DeactivateUserUseCase.ts:32-34` mas contornável por `PUT {"active":false}`
  (`UpdateUserUseCase.ts:39-49`, BR-IAM-014 — auto-lockout total com um único admin); (2) `role`
  validado só no POST, não no PUT nem no register (BR-IAM-015). **Zero testes** dos 4 use cases
  de escrita de usuário.
- **RF-AUT-05** Perfis por módulo — CONFIRMED para o mecanismo (access-profiles.test.ts).
- **RF-AUT-06** Menu por perfil — CONFIRMED (auth-me-permissions.test.ts).
- **RF-AUT-07** "403 consistente" — **CONFLICTING (HIGH/CONFIRMED)**: `module-authorization-map.test.ts:120-133`
  exclui **12 módulos** do retrofit, incluindo `categories`/`departments`/`users` (PRODUÇÃO REAL),
  que usam `authorize(role)` legado — nunca consultam o perfil de acesso. Um `operator` sem perfil
  nenhum cria e edita categorias. A exclusão é versionada; o que diverge é o REQUISITO, que a
  declara universal.
- **RF-AUT-08** Gestor × operador — **CONFLICTING (2 eixos)**: (1) matriz de negócio tem 4 níveis
  (`V`/`O`/`A`), código tem 2 — **acesso somente-leitura é inexprimível** (BR-IAM-021); (2)
  "segunda trava gestor" de NF-e documentada não existe, vive só em comentário (BR-COM-005).
- **RF-AUT-09** Auditoria de ações sensíveis — **CONFLICTING** (números do próprio requisito
  errados: 14×13 módulos, `maintenance` inexistente na guarda; e a guarda mede no controller
  enquanto `users`/`accessProfiles` auditam no use case — BR-IAM-025).

### 2.2 `items` — o buraco central

**`items` é PRODUÇÃO REAL, hot path do MRP, 12 endpoints, 327 registros reais — e não tem UM
ÚNICO RF em `DOCUMENTO_DE_REQUISITOS.md`.**

- **REQ-CAD-D01** ⚠ ID CANDIDATO (não existe) — Cadastro de item: `codigo` único (EXATO, sensível
  a caixa), `tipo` ∈ 5 valores, `status` ∈ 3. `CreateItemUseCase.ts:27-59`. INFERRED. Ponto
  aberto (BR-CAD-008): `ABC-100` e `abc-100` são itens distintos, e o crosswalk literal
  `products.code = items.codigo` quebra em silêncio com divergência de caixa.
- **REQ-CAD-D02** ⚠ — Item cria produto-gêmeo na mesma transação
  (`itemProductMirrorService.ts`). Regra que sustenta 3 fluxos existe só como comentário. INFERRED.
- **REQ-CAD-D03** ⚠ — Inativação de item barrada por 5 vínculos (`DeactivateItemUseCase.ts:59-145`).
  INFERRED. Contraste: categoria/departamento inativam **sem** verificação nenhuma.
- **REQ-CAD-D04** ⚠ — `POST /:id/estrutura` **sempre recusa** com 422 `G1-ESTRUTURA-DUPLA`
  (`CreateItemStructureUseCase.ts:79-92`). OBSOLETE_CANDIDATE (endpoint vivo sem caminho de sucesso).
- **REQ-CAD-D05** ⚠ — Catálogo item×fornecedor: fornecedor preferencial único
  (`CreateItemSupplierUseCase.ts:54-79`). Cobertura parcial de RF-COM-09. INFERRED.
- **REQ-IAM-D14** ⚠ — Escritas de `items` **não deixam rastro** (grep `logAction` no módulo → 0;
  8 handlers de escrita). CONFLICTING contra RNF:48 (NFR-AUDIT-01).

### 2.3 `categories` e `departments`

- **REQ-CAD-D06** ⚠ — Cadastro de categorias (5 rotas, ZERO RF). GET = qualquer autenticado lê
  tudo; nenhuma checagem de perfil. INFERRED.
- **REQ-CAD-D07** ⚠ — Inativação de categoria/departamento **sem** verificação de vínculo
  (`DeactivateCategoryUseCase.ts:26`, `DeactivateDepartmentUseCase.ts:26`). `departments.manager_id`
  é âncora de autorização de BR-TI-D17 — inativar não é bloqueado nem avisado. INFERRED (MEDIUM).
- **RF-RH-02** "Departamentos com hierarquia e gestor" — **CONFLICTING**: `directorate_id` só
  gravável por `seeds.ts:175` (imutável por API); `manager_id` só no PUT, não validado contra
  `employees`. Veredito correto: `[PARCIAL]`.

### 2.4 `auditLogs`

- **RF-REL-07** Log de auditoria por tela — CONFIRMED para leitura (imutabilidade só por ausência
  de rota de escrita; sem trigger de banco — FIND-ERP-002).
- **REQ-IAM-D11** ⚠ — Filtros sem `user_id` nem `success` (`ListAuditLogsUseCase.ts:42-52`). As
  duas perguntas típicas de auditoria exigem varredura manual. INFERRED.
- **REQ-IAM-D12** ⚠ — Retenção e expurgo: inexistentes. INFERRED (Regra 21).

Outros fantasmas de Camada 1: REQ-IAM-D09 (revogação de sessões, BR-IAM-012); REQ-IAM-D10 (POST
/register **sem auditar**, BR-IAM-026, CONFLICTING); REQ-IAM-D13 (admin bootstrap hardcoded;
limiar de senha 8 × 6, BR-IAM-002/033).

---

## 3. Camada 2 (cobertura média)

### 3.1 Compras / Suprimentos

- RF-COM-01 CONFIRMED · **RF-COM-02 CONFLICTING** (segregação: código sim × plano de ação + TODO
  não) · RF-COM-03 CONFIRMED com lacuna (pedido sem RFQ = zero cotações) · **RF-COM-04 CONFLICTING**
  (mín. 3 cotações documentado × `.min(1)`) · **RF-COM-05 CONFIRMED no valor / CONFLICTING na
  vigência** (teto R$ 500.000 bate; base de cálculo mercadoria+frete sem doc nem teste, BR-SUP-004)
  · RF-COM-06/07/08 CONFIRMED (provado contra Postgres real) · RF-COM-09 parcial · RF-COM-10
  INFERRED (`quality_score`) · RF-COM-11/12 CONFIRMED.
- **Fantasmas (INFERRED):** BR-SUP-004 (base da alçada), BR-SUP-006 (congelamento anti-burla),
  BR-SUP-010 (requisição sem alçada por valor — R$ 5M por qualquer `requisicoes:approve`),
  **BR-SUP-012 (critério de adjudicação de RFQ: inexistente)**, BR-SUP-013, BR-SUP-015,
  BR-SUP-016 (fail-open com NaN), BR-CAD-002 (UNKNOWN), BR-CAD-005 (backfill `is_foreign`).

### 3.2 Vendas e Fiscal

- RF-VEN-01..04,06..09 CONFIRMED · **RF-VEN-05 CONFLICTING** (segunda trava gestor inexistente;
  admin curto-circuita) · **BR-FIS-001 CONFLICTING CRÍTICO** (ICMS: 19 das 27 UFs divergem) ·
  **BR-FIS-003 CONFLICTING CRÍTICO** (IPI 10%/15% documentado × 0% implementado, para o cap. 8518
  que é o produto da empresa) · BR-FIS-004/005 CONFLICTING (DIFAL/ICMS-ST documentados sem
  implementação) · BR-FIS-008 CONFLICTING.
- **Nenhum RF cobre o desconto de venda.** BR-COM-010 (CRITICAL): venda de R$ 1.000 com R$ 200 de
  desconto grava 800, emite NF-e de 1.000, tributa sobre 1.000, cobra 1.000. Grep `discount` em
  fiscal/services → 0. Também sem requisito: limite de desconto (100% aceito, BR-COM-009); tabela
  de preço por cliente não vinculante (BR-COM-008).

### 3.3 Estoque, Qualidade e Produção

- RF-EST-01..06 CONFIRMED (com ressalva de FIND-ERP-001) · **RF-EST-07 CONFLICTING** (scan mobile
  fura depósito/quarentena/lote, BR-QE-011) · RF-EST-08 CONFIRMED como PENDENTE · RF-QUA-01/03
  CONFIRMED · **RF-QUA-02 CONFLICTING** (ciclo RNC sem grafo; fechar sem causa raiz;
  `effectiveness_result` inescrevível → toda RNC fechada fica vermelha) · RF-QUA-04/05 INFERRED
  (laboratory sem testes) · RF-PRD-01 CONFIRMED parcial (CRP documentado, implementação nenhuma —
  OBSOLETE_CANDIDATE BR-PP-025) · RF-PRD-02..09 CONFIRMED · RF-PRD-04 CONFIRMED com CONFLICTING
  interno (BR-PP-013: `estoque_seguranca` e `lote_minimo` leem o mesmo campo).
- **Fantasmas:** BR-PP-007 (sobreprodução sem teto por flag no body), BR-QE-007 (FEFO com duas
  definições de "vencido"), BR-QE-004 (duas listas de status bloqueáveis), BR-QE-006 (re-recebimento
  rebaixa lote bloqueado), BR-QE-008 (contagem sem tolerância/recontagem/anti-autoaprovação),
  BR-QE-003, BR-PP-003, BR-PP-011, BR-PP-015, BR-PP-016b.

### 3.4 Financeiro, Contábil, Controladoria, Tesouraria

**58 endpoints, 9 RFs, todos sobre AP/AR/fluxo de caixa/conciliação. Nenhum RF cobre
`accounting`, `budget` ou `treasury`.**

- **CONFIRMED exemplar:** RF-FIN-06 / BR-FIN-002 (conciliação: 1 centavo, ±7 dias, constante única
  com comentário proibindo duplicar — **melhor exemplo de conformidade valor-a-valor do repo**).
- **INFERRED:** BR-CTB-001 (estorno sem segregação/período/prazo/justificativa; estorno é ele
  próprio estornável); BR-CTR-001 (orçamento não restringe nada); BR-TES-001 (`settle`/`cancel`
  não movem um centavo).
- **OBSOLETE_CANDIDATE:** RF-FIN-07 CNAB (8 endpoints, nunca montado).

### 3.5 Módulos dos findings 005-009

`juridico` 75 + `ti` 47 + `sst` 75 + `rh` 57 = **254 endpoints sem cobertura em
`DOCUMENTO_DE_REQUISITOS.md`** (vivem nos `BLOCO_*_API.md`).

| REQ | Veredito | Referência |
|---|---|---|
| RF-JUR-003 | CONFLICTING | FIND-ERP-005 — não reaberto |
| RF-JUR-035/036/037/040/041 | CONFLICTING | FIND-ERP-006 — não reaberto |
| RF-RH-016/017/022 | CONFLICTING | FIND-ERP-007 — não reaberto |
| RF-SST-024/042 | CONFLICTING | FIND-ERP-008 — não reaberto |
| RF-TI-034 | **CONFIRMED** | BR-TI-D17 — único ponto do domínio Governança com autorização reverificada fora da borda HTTP |
| RF-TI-014 | CONFLICTING | rota exige `ti:operate`, use case aceita qualquer nível |
| Segregação em 20+ pontos | CONFLICTING | FIND-ERP-009 — não reaberto |

---

## 4. ⭐ LISTA CONSOLIDADA DE REQUISITOS FANTASMA (insumo prioritário do passo 29)

58 comportamentos em produção que ninguém especificou, todos `INFERRED — NEEDS HUMAN VALIDATION`,
cada um com arquivo:linha e BR candidato de origem. Extrato dos de maior risco:

| # | Comportamento sem requisito | Evidência | BR | Risco |
|---|---|---|---|---|
| F-01 | Cadastro de item (mestre PRODUÇÃO REAL) | `CreateItemUseCase.ts:27-59` | BR-CAD-008 | ALTO |
| F-02 | Espelho item→produto | `itemProductMirrorService.ts` | BR-CAD-009 | ALTO |
| F-09 | Auditoria fire-and-forget (operação conclui se log falhar 2×) | `auditLogService.ts:92-98` | BR-IAM-030 | ALTO |
| F-14 | Base da alçada = mercadoria + frete | `constants.ts:185-189` | BR-SUP-004 | ALTO |
| F-16 | Requisição sem alçada por valor | `ChangePurchaseRequisitionStatusUseCase.ts:62-117` | BR-SUP-010 | ALTO |
| F-17 | **Critério de adjudicação de RFQ: inexistente** | `AwardRfqUseCase.ts:108-139` | BR-SUP-012 | ALTO |
| F-19 | `admin` tratado como `diretor` | `purchaseController.ts:51-55` | BR-SUP-009 | ALTO |
| F-22 | **BOM nasce `active` — sem ato de aprovação** | `bomService.ts:314-322` | BR-CAD-014 | ALTO |
| F-27 | Sobreprodução ilimitada por flag no body | `ProductionOrderEntity.ts:187-209` | BR-PP-007 | ALTO |
| F-34 | Re-recebimento rebaixa lote bloqueado | `materialReceiptService.ts:165-180` | BR-QE-006 | ALTO |
| F-35 | Contagem: sem tolerância, sem recontagem, autoaprovação livre | `ApproveInventoryCountUseCase.ts:50-120` | BR-QE-008 | ALTO |
| F-39 | Tabela de preço por cliente não vinculante | `CreateSaleUseCase.ts:113-141` | BR-COM-008 | ALTO |
| F-40 | Desconto sem limite (100% aceito) | `CreateSaleUseCase.ts:143-146` | BR-COM-009 | ALTO |
| F-41 | **Desconto não chega à NF-e nem ao recebível** | `IssueSaleNfeUseCase.ts:202,213-226` | BR-COM-010 | **CRÍTICO** |
| F-42 | Ordem de Serviço sem máquina de estados nem faturamento | `UpdateServiceOrderUseCase.ts:11-24` | BR-COM-012 | ALTO |
| F-44 | **Provedor NF-e: fallback silencioso para mock** (nota falsa, efeito patrimonial real) | `NfeProviderFactory.ts:16-26` | BR-FIS-009 | ALTO |
| F-45 | Estorno contábil sem segregação/período/prazo | `ReverseEntryUseCase.ts:42-89` | BR-CTB-001 | ALTO |
| F-46 | Orçamento não restringe nada; DELETE físico | `DeleteBudgetLineUseCase.ts:27-33` | BR-CTR-001 | ALTO |
| F-48 | `settle`/`cancel` de tesouraria sem efeito de caixa | `SettleOperationUseCase.ts:30-44` | BR-TES-001 | ALTO |
| F-49 | `notice_modality='trabalhado'` presumido | `DecideEmployeeContractUseCase.ts:100-107` | BR-RH-D03 | ALTO |
| F-52 | Checklist de contrato aceita `'no'` como cumprido | `ActivateContractUseCase.ts:92-101` | BR-JUR-D10 | ALTO |
| F-58 | Dois níveis de proteção para 2 webhooks do mesmo módulo | `ProcessN8nWebhookUseCase.ts:47-64` | BR-WHK-D22 | ALTO |

*(Lista completa de 58 no arquivo de trabalho do agente; os 36 restantes são MÉDIO/BAIXO.)*

**Leitura executiva:** dos 58, **9 têm risco financeiro/compliance direto** e **4 são mecanismos
de autorização distintos convivendo**. A pergunta "quem pode aprovar o quê neste ERP" **não tem
resposta em nenhum artefato versionado** — só varrendo código.

---

## 5. NFRs — veredito por evidência de validação (não por "está escrito")

### Desempenho
- NFR-PERF-01 SLA p95/p99 — **sem meta** (NOT_VALIDATED, declarado). NFR-PERF-02 paginação "nos
  principais endpoints" — **enunciado não verificável**; `categories`/`departments` devolvem a
  coleção inteira (PARTIALLY). NFR-PERF-03 pool testado, efeito sob carga não. NFR-PERF-04
  transações amplamente testadas, 2 exceções auto-declaradas (RNC fora da transação).

### Segurança
- NFR-SEC-02..06 **os 5 rate-limits batem, prova ZERO** (BR-IAM-007) — NOT_VALIDATED. NFR-SEC-01
  TTL 7d sem teto validado. NFR-SEC-08/09 headers sem teste. NFR-SEC-10 "RBAC 100%" — guarda real
  mas exclui 12 módulos; **enunciado "100%" falso**. NFR-SEC-12 validação de entrada não verificada
  endpoint a endpoint (32 módulos). NFR-SEC-14/15 VALIDATED (boot). **NFR-SEC-17 npm audit —
  VALIDATED: o documento SUBESTIMA a própria evidência** (CI roda audit bloqueante em todo push,
  `server-ci.yml:75-77`, e o doc só cita "verificação 2026-08-04" pontual; Regra 19).

### Auditoria
- **NFR-AUDIT-01** `[IMPLEMENTADO]` sem ressalva × 13 módulos em débito (incl. `items` PRODUÇÃO
  REAL), guarda medindo no lugar errado, register sem auditar, fire-and-forget. NOT_VALIDATED,
  CONFLICTING, candidato HIGH.

### Demais
- NFR-AVAIL-01/02 `/health` — VALIDATED (gate de CI, `server-ci.yml:94-119`, mais forte que o
  doc). NFR-RECOV-01 DR **delegado a um AGENTE** (`RNF:66-71`) — não é artefato versionado
  (Regra 16), sem RPO/RTO. NFR-COMPAT-02 "Node 18+" mas CI usa 22.

### NFRs FANTASMA (controles reais ausentes do documento)
- **NFR-MAINT-D01** migration com `down()` que funciona (CI roda `down && up`, `server-ci.yml:86-92`).
- **NFR-SEC-D02** secret scan bloqueante (`server-ci.yml:55-57`).
- **NFR-MAINT-D03** suítes "strict" sem skips (`server-ci.yml:67-73`).
- **NFR-MAINT-D05 (AUSENTE)** — ❌ **não existe documento de estratégia de testes.** Glob por
  `docs/**/*{TESTE,ESTRATEGIA,QUALIDADE}*.md` → só docs de qualidade de PRODUTO acústico. **Causa
  raiz declarada das ~30 lacunas "regra crítica sem teste" deste passo.**

---

## 6. Auditoria de QUALIDADE dos enunciados (requisito ambíguo é finding)

- NFR-PERF-02 "nos principais endpoints" — não verificável. NFR-SEC-10 "100% das rotas" —
  quantificador falso. RF-AUT-09 — requisito com métrica embutida (35/98, 14 módulos) que já está
  errada. RF-QUA-02 — descreve ciclo que o código não impõe.
- **Transversal: nenhum dos 90 RFs tem OWNER, critério de aceite (AC-) ou aponta para um TC-.** A
  cadeia `BR → REQ → UC → AC → TC` que o §20 do Master Spec exige **não existe em nenhum requisito
  do repositório.** As decisões (D-A…D-L, G1…G18) vivem em prosa/comentário sem registro de
  aprovação (Regra 17). Escalar ao director.

---

## 7. Cobertura declarada

- **ALTA:** os 6 PRODUÇÃO REAL — 39 dos 681 endpoints, lidos linha a linha.
- **MÉDIA:** 17 módulos de compras/vendas/fiscal/financeiro/produção/qualidade + jur/rh/sst/ti —
  vereditos derivados do passo 26 + findings, com confronto próprio contra o documento. **Sem
  releitura independente de cada use case.**
- **RASA / não coberto:** `reports`, `dashboard`, `intelligentAuditor` (não amostrados);
  `facilities`, `marketing`, `directorate`, `treasury`, `budget`, `masterProduction`,
  `spreadsheetImport`, `webhooks` (só o achado único de cada); `assets`, `maintenance`,
  `serviceOrders`, `mobileInventory`, `traceability`, `workCenters`, `engineering`, `laboratory`,
  `employees`, `clients`, `suppliers`, `products`, `bom` (só o que o passo 26 provou). **Frontend
  inteiro** não auditado. **Banco** não consultado (PRODUÇÃO REAL).
- **`FIND-ERP-003` e `FIND-ERP-004` não existem** — glob retorna 7 findings (001, 002, 005-009).
  Lacuna registrada (resolvida em `APR-2026-018`: nunca foram atribuídos).
- **"Testado" significa** existe arquivo de teste cujo nome/escopo cobre a regra — não que passa
  nem que a asserção cobre o valor exato. Nada foi executado.

---

## 8. Candidatos a finding formal (para o `vericore-finding-validator`)

Nenhum coberto por FIND-ERP-001/002/005/006/007/008/009.

| # | Objeto | Severidade / Confiança |
|---|---|---|
| 1 | RF-AUT-09 / NFR-AUDIT-01 — auditoria `[IMPLEMENTADO]` com 13 módulos em débito (`items` incluso), guarda medindo errado, contagem do requisito errada | HIGH / CONFIRMED |
| 2 | RF-AUT-07/08 — "403 consistente" e "perfis por módulo" universais × 12 módulos fora, nível somente-leitura inexistente | HIGH / CONFIRMED |
| 3 | RF-QUA-02 — ciclo RNC sem grafo, `effectiveness_result` inescrevível travando o semáforo em vermelho | HIGH / CONFIRMED |
| 4 | RF-RH-02 — hierarquia sem caminho de escrita (só seed), `manager_id` não validado (âncora de RF-TI-034) | MEDIUM / CONFIRMED |
| 5 | RF-FIN-07 / `cnab` — 8 endpoints vivos nunca montados | MEDIUM / CONFIRMED |
| 6 | Ausência de catálogo de requisitos e BR-IDs — 254 endpoints fora do índice; 13 módulos com zero RF; nenhum RF com OWNER/AC/TC | HIGH / CONFIRMED |
| 7 | NFR-MAINT-D05 — sem documento de estratégia de testes | MEDIUM / CONFIRMED |
| 8 | F-41 (BR-COM-010) — desconto não chega à NF-e: três valores para o mesmo negócio | CRITICAL / CONFIRMED |

---

## 9. O que este documento NÃO afirma

- **Não decide** qual lado está certo em nenhuma das 24 divergências (Regra 20-21).
- **Não reescreve nem inventa requisito** (Regra 6). Os IDs `REQ-*-D<nn>` e `F-<nn>` são rótulos
  de trabalho deste passo, marcados como inexistentes no repositório.
- **Não reabre** os 7 findings nem reafirma seus vereditos.
- **Não declara finding formal com severidade** — §8 são candidatos para o validador.
- **Não executou nada.** Nenhum arquivo alterado (Regra 2).

---

*Produzido pelo agente `vericore-requirements-auditor` em modo read-only reforçado; conteúdo
persistido pelo orquestrador (hook bloqueia escrita VeriCore fora de `audit/`), sem edição. Este
é um resumo fiel do trabalho do agente; a lista completa dos 58 requisitos fantasma e o
detalhamento NFR item a item constam do transcript do agente.*
