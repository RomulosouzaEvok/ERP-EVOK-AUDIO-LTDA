# F-5 — LISTA NOMINAL IN-CATEGORIA × OUT-CATEGORIA (vedação do gate `G3`)

```
AUDIT_ID:      ERP-LEGACY-001-AUD-001
ARTEFATO:      F-5 — lista nominal IN × OUT por categoria vedada pelo G3
TITULAR:       vericore-api-auditor
AUTORIDADE:    APR-2026-043 D1 e D2 (2026-08-17) · APR-2026-021 Parte A (G3/G8)
               AUDIT_PLAN_EMENDA_02.md §1 (categorias, I-1…I-6) e §2 (REG-G3)
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f (declarado — ver L-01)
REGIME:        APR-2026-016 — 100% estático, zero conexão de banco, zero execução
ESTADO:        PUBLICADO — universo 683/683 classificado; 174/174 nominal por rota;
               509/509 por módulo com categoria declarada (ver §5 e L-02)
```

> **Nota de persistência.** Agente titular read-only por desenho (mesma condição declarada em `T-17`). Persistido pelo orquestrador **sem alteração**. O juízo é integralmente da trilha.

Nenhum arquivo do objeto auditado foi criado ou alterado (Regra 2). Nenhum `FINDING CLOSED`, nenhum `AUDIT_PASSED`, nenhuma conexão com o banco de produção.

---

## 0. Por que este artefato existe, em uma frase

O `REG-G3` passo 4 (`AUDIT_PLAN_EMENDA_02.md:97-99`) exige que a lista nominal das duas classes seja **fixada e anexada antes da análise**; ela nunca foi publicada e constava como `F-5` "não publicada" em **cinco** rodadas de cobertura (`AUDIT_COVERAGE_EXECUTED_RODADA4.md:258`). `APR-2026-043` **D2** a tornou pré-requisito explícito da divisão de `C-136`. Este documento a entrega.

---

## 1. Universo — aritmética refeita por conta própria

### 1.1 Contagem independente

Medida por Grep ancorado `^\s*router\.(get|post|put|patch|delete)\(` sobre `server/src/**`, `head_limit: 0`, somada arquivo a arquivo:

| Medida | Valor | Fonte |
|---|---|---|
| Arquivos de rota com pelo menos 1 registro | **54** | 53 sob `**/presentation/routes/` + `src/routes/health.ts` |
| Registros em `server/src/modules/**` | **681** | soma dos 53 arquivos |
| Registros em `src/routes/health.ts` | **2** | leitura integral do arquivo |
| **TOTAL — universo de F-5** | **683** | soma verificada |
| Handler inline `app.get('/api', …)` | **+1** | leitura direta, `app.ts:227-232` |
| `app.use('/uploads', authenticate, express.static('uploads'))` | superfície não enumerável | `app.ts:225` |

**O número 683 de `T-17` está CONFIRMADO por medição independente**, e a confirmação é de método diferente: `T-17` chegou a 683 por Grep `-o` de 677 + 4 leituras manuais de chamada multi-linha; eu cheguei por Grep ancorado no **início da linha** (`^\s*router\.`), que captura a chamada multi-linha pelo próprio verbo, sem depender de o path estar na mesma linha. **Dois caminhos, o mesmo 683.**

Amarração literal dos 4 multi-linha exigida pela disciplina desta run (confirmação por leitura de arquivo, nunca por saída de grep): li `marketing.ts:54-58` e confirmo `router.post(` em `:54` com o literal `'/leads/:id/handoff'` em `:55`. Os outros três (`juridico.ts:77`, `catalogImport.ts:31`, `catalogImport.ts:40`) **não foram reabertos** por mim — aceito o registro de `T-17` §1.1 como insumo, **declarado como insumo e não como verificação própria** (L-03).

### 1.2 Alcançabilidade — a aritmética de `T-17` §1.3, reconferida

```
683   registros de rota (universo de F-5, medido acima)
-  8   CNAB (financial/routes/cnab.ts) — definidos e NÃO montados
= 675   alcançáveis entre os registrados
+  1   GET /api (app.ts:227) — alcançável, ausente de todo inventário
= 676   endpoints HTTP efetivamente alcançáveis
```

**Fecha exatamente com os 676 de `T-17` §1.3.** Registro como **conformidade verificada**, não como repetição: `T-17` partiu de 681 e somou os 2 de `health`; eu parti de 683 (que já contém os 2). Bases distintas, resultado idêntico.

### 1.3 Fechamento por tier (verificação cruzada com o plano)

| Tier | Módulos | Endpoints | Conferência |
|---|---|---|---|
| Tier 1 (`AUDIT_COVERAGE_MATRIX.md` §3) | 6 | 39 | `items` 12 + `categories` 5 + `departments` 5 + `users` 7 + `auth` 8 + `auditLogs` 2 = **39** ✔ |
| Tier 2 (§4) | 20 | 381 | inclui `financial` 30 = `finance` 15 + `cnab` 8 + `reconciliation` 7 ✔; `inventory` 27 = 18 + 9 ✔; `production` 23 = 11 + 9 + 3 ✔ |
| Tier 3 profundo (§7.1) | 7 | 174 | 64+47+30+11+8+8+6 = **174** ✔ |
| Tier 3 elevado (§7.2) | 5 | 44 | 9+7+12+14+2 = **44** ✔ |
| Tier 3 raso (§7.3) | 10 | 43 | 5+5+5+5+5+5+4+3+3+3 = **43** ✔ |
| `health.ts` (fora dos tiers) | — | 2 | `/health/live`, `/health/ready` ✔ |
| **Total** | **48 + health** | **683** | 39+381+261+2 = **683** ✔ |

**Nenhuma divergência de contagem encontrada contra o plano, contra `T-16` ou contra `T-17`.** Registro como conformidade (§6.2). A única contagem errada do corpus continua sendo o **681** do `AUDIT_PLAN.md:475`, do `SYSTEM_MAP.md` e do `API_INVENTORY.md` do passo 23 — já escalado por `T-17` §7.1 e **aqui reconfirmado**, sem acomodação (Regra 20).

---

## 2. Critério de classificação — declarado ANTES de aplicado

### 2.1 As 12 categorias vedadas + as extensões de I-1

Fonte literal: `APPROVALS.md:584` (G3) e `AUDIT_PLAN_EMENDA_02.md:60-76`.

| Cód. | Categoria | **O que faz uma rota entrar** (critério operacional desta lista) |
|---|---|---|
| **C1** | autenticação | (a) a rota **emite, renova, revoga ou redefine credencial** (login, refresh, senha, token); **ou** (b) a rota é **alcançável sem autenticação de usuário** |
| **C2** | autorização | (a) o **objeto de negócio da rota** é concessão/revogação/aprovação de acesso; **ou** (b) o **gate da rota desvia do padrão do módulo** — ausente, `authorizeSelfOrModule`, `authorizeAnyModule`, módulo dono diferente, ou nível acima do padrão do módulo |
| **C3** | segregação de funções | a rota exige nível **`approve`**, ou decide/homologa ato preparado por outra rota (par preparar × efetivar) |
| **C4** | operações financeiras | escreve ou lê **valor monetário, título, pagamento, orçamento, custo ou preço** como conteúdo principal |
| **C5** | movimentação de estoque | cria, altera ou reverte **movimento/saldo de estoque** |
| **C6** | integridade de dados | escrita que **(i)** atinge agregado/módulo diferente do próprio, **(ii)** é em lote, ou **(iii)** grava número que alimenta cálculo posterior. **CRUD simples de entidade de referência não entra por C6** |
| **C7** | contratos / jurídico | o recurso **é** contrato, termo, licença ou documento com efeito legal — leitura incluída |
| **C8** | permissões administrativas | administra perfis, papéis, licenças de acesso, contas ou concessões |
| **C9** | operações destrutivas | `DELETE`, ou transição que **anula/invalida irreversivelmente** registro com efeito legal, financeiro, patrimonial ou de estoque. **Cancelamento de registro sem esses efeitos NÃO entra** |
| **C10** | segurança | revela segredo, recebe upload, expõe superfície sem autenticação, ou é controle de continuidade/backup |
| **C11** | multi-tenancy | a rota depende de escopo por proprietário/organização para não vazar entre titulares |
| **C12** | regras de negócio críticas | a rota é a porta de uma regra que **bloqueia ou libera um resultado de negócio** (habilitação, liberação, alçada, elegibilidade) |
| **I-1a** | dado pessoal / LGPD (extensão I-1) | o conteúdo principal do recurso é **dado identificador de pessoa natural** (CPF/RG/CNH/documento/contato/presença) |
| **I-1b** | obrigação legal com prazo (extensão I-1) | o recurso carrega **prazo, validade ou vencimento com consequência legal** |

### 2.2 As três fronteiras discutíveis, decididas em aberto

**Fronteira 1 — "autorização" (C2) engoliria o universo.** Se C2 significasse "rota protegida por middleware de autorização", **683 de 683** seriam IN e a triagem do `REG-G3` seria vazia — o que contraria o próprio texto do plano, que chama o tier 3 profundo de "heterogêneo" (`EMENDA_02:83`) e pressupõe partição não-trivial. **Decisão:** C2 = matéria da rota **ou desvio do gate padrão do módulo**. O desvio entra porque é exatamente onde a decisão de autorização deixa de ser uniforme e precisa ser verificada rota a rota. Mesma lógica em C1(b).

**Fronteira 2 — "integridade de dados" (C6) engoliria toda escrita.** Toda gravação toca dado. **Decisão:** C6 restrito a escrita cross-agregado, em lote, ou de número que alimenta cálculo. CRUD de entidade de referência fica OUT por C6 — e entra por outra categoria se houver.

**Fronteira 3 — leituras.** **Regra L, declarada:** endpoint somente-leitura é IN quando (a) o payload é predominantemente dado pessoal (I-1a), dinheiro/saldo (C4) ou documento contratual/legal (C7); **ou** (b) o gate desvia (C2); **ou** (c) lê estado de aprovação/alçada (C3). Fora disso, leitura é OUT.

**Regra de desempate — I-6, vinculante nesta run** (`AUDIT_PLAN_EMENDA_02.md:76`): *"Dúvida de enquadramento → in dubio pro cobertura"*. Cumpro-a, e **marco cada rota que só é IN por I-6 com `(I-6)`**, para que um terceiro possa medir o efeito da regra em vez de tomá-lo de mim. A contagem de §5 é publicada **nas duas leituras** — IN estrito e IN com I-6.

### 2.3 O que este artefato NÃO decide

Não decide se a autorização de uma rota está **correta** (é do `authorization-auditor`), nem se o controller está certo (é do `controller-auditor`), nem promove nenhuma rota a finding. **F-5 é classificação de escopo, não veredito de defeito.**

---

## 3. Lista nominal — os 174 endpoints do tier 3 profundo (recorte de `B3`/`B3-bis`)

Ordem = ordem de registro no arquivo (a ordem que o Express avalia). Paths com o prefixo de montagem real conferido em `app.ts:160, 166, 178, 195, 206, 207, 208`.

### 3.1 `facilities` — 64 endpoints · `app.use('/api/facilities')` (`app.ts:207`) · arquivo `facilities.ts`

| # | :linha | Método | Path | IN/OUT | Categoria |
|---|---|---|---|---|---|
| 1 | 45 | GET | /api/facilities/vehicles | OUT | — |
| 2 | 46 | GET | /api/facilities/vehicles/:assetId | OUT | — |
| 3 | 47 | POST | /api/facilities/vehicles | **IN** | C6 (escreve em `Asset`, agregado de outro módulo) |
| 4 | 48 | PUT | /api/facilities/vehicles/:assetId | **IN** | C6 |
| 5 | 49 | GET | /api/facilities/vehicles/:assetId/documents | **IN** | I-1b (I-6) |
| 6 | 50 | POST | /api/facilities/vehicles/:assetId/documents | **IN** | I-1b |
| 7 | 51 | POST | /api/facilities/vehicles/:assetId/documents/:docId/renew | **IN** | I-1b |
| 8 | 52 | POST | /api/facilities/vehicles/:assetId/documents/:docId/release | **IN** | C3 (`approve`), C12, I-1b |
| 9 | 55 | GET | /api/facilities/drivers | **IN** | I-1a (CNH) |
| 10 | 56 | GET | /api/facilities/drivers/:id | **IN** | I-1a |
| 11 | 57 | POST | /api/facilities/drivers | **IN** | I-1a |
| 12 | 58 | PUT | /api/facilities/drivers/:id | **IN** | I-1a |
| 13 | 59 | POST | /api/facilities/drivers/:id/authorize | **IN** | C12, I-1b |
| 14 | 60 | POST | /api/facilities/drivers/:id/suspend | **IN** | C3 (`approve`), C9 |
| 15 | 63 | GET | /api/facilities/trips | OUT | — |
| 16 | 64 | GET | /api/facilities/trips/:id | OUT | — |
| 17 | 65 | POST | /api/facilities/trips | **IN** | C12 (habilitação do condutor / documento do veículo) |
| 18 | 66 | POST | /api/facilities/trips/:id/depart | **IN** | C3 (aprovação de divergência de odômetro embutida), C12 |
| 19 | 67 | POST | /api/facilities/trips/:id/return | **IN** | C6 (odômetro alimenta consumo) |
| 20 | 68 | POST | /api/facilities/trips/:id/cancel | **IN** | C6 (I-6 — quebra da cadeia de odômetro) |
| 21 | 70 | GET | /api/facilities/fuel-records | **IN** | C4 (Regra L-a) |
| 22 | 71 | GET | /api/facilities/fuel-records/:id | **IN** | C4 |
| 23 | 72 | POST | /api/facilities/fuel-records | **IN** | C4 |
| 24 | 73 | PUT | /api/facilities/fuel-records/:id | **IN** | C4, C6 |
| 25 | 76 | GET | /api/facilities/fines | **IN** | C4, I-1b |
| 26 | 77 | GET | /api/facilities/fines/:id | **IN** | C4, I-1b |
| 27 | 78 | POST | /api/facilities/fines | **IN** | C4, I-1b |
| 28 | 79 | GET | /api/facilities/fines/:id/suggested-driver | **IN** | I-1a |
| 29 | 80 | POST | /api/facilities/fines/:id/indicate | **IN** | C3 (`approve`), I-1a, I-1b |
| 30 | 81 | POST | /api/facilities/fines/:id/appeal | **IN** | I-1b |
| 31 | 82 | POST | /api/facilities/fines/:id/pay | **IN** | C3 (`approve`), C4 |
| 32 | 83 | POST | /api/facilities/fines/:id/charge-driver | **IN** | C4, I-1a |
| 33 | 86 | GET | /api/facilities/maintenance-tickets | **IN** | C2 (`authorizeAnyModule`) |
| 34 | 87 | GET | /api/facilities/maintenance-tickets/:id | **IN** | C2 |
| 35 | 89 | POST | /api/facilities/maintenance-tickets | **IN** | C2 (**sem gate de módulo** — só `authenticate`) |
| 36 | 90 | POST | /api/facilities/maintenance-tickets/:id/triage | OUT | — |
| 37 | 91 | POST | /api/facilities/maintenance-tickets/:id/execute | **IN** | C4/C5 (I-6 — possível consumo/custo, não verificado no controller) |
| 38 | 92 | POST | /api/facilities/maintenance-tickets/:id/close | OUT | — |
| 39 | 93 | POST | /api/facilities/maintenance-tickets/:id/generate-preventive | **IN** | C6 (escrita em lote) |
| 40 | 96 | GET | /api/facilities/visitors | **IN** | I-1a |
| 41 | 97 | POST | /api/facilities/visitors | **IN** | I-1a |
| 42 | 99 | GET | /api/facilities/visits/onsite-overdue | **IN** | I-1a |
| 43 | 100 | GET | /api/facilities/visits | **IN** | I-1a |
| 44 | 101 | GET | /api/facilities/visits/:id | **IN** | I-1a |
| 45 | 102 | POST | /api/facilities/visits | **IN** | I-1a |
| 46 | 103 | POST | /api/facilities/visits/:id/checkout | **IN** | I-1a |
| 47 | 105 | GET | /api/facilities/correspondences | **IN** | I-1a (I-6) |
| 48 | 106 | POST | /api/facilities/correspondences | **IN** | I-1a (I-6) |
| 49 | 107 | POST | /api/facilities/correspondences/:id/deliver | **IN** | I-1a (I-6) |
| 50 | 110 | GET | /api/facilities/cleaning-schedules | OUT | — |
| 51 | 111 | GET | /api/facilities/cleaning-schedules/:id | OUT | — |
| 52 | 112 | GET | /api/facilities/cleaning-schedules/:id/adherence | OUT | — |
| 53 | 113 | POST | /api/facilities/cleaning-schedules | **IN** | C3 (`approve`) |
| 54 | 114 | PUT | /api/facilities/cleaning-schedules/:id | **IN** | C3 (`approve`) |
| 55 | 116 | GET | /api/facilities/cleaning-executions | OUT | — |
| 56 | 117 | POST | /api/facilities/cleaning-executions | OUT | — |
| 57 | 120 | GET | /api/facilities/resource-reservations | OUT | — |
| 58 | 121 | GET | /api/facilities/resource-reservations/:id | OUT | — |
| 59 | 122 | POST | /api/facilities/resource-reservations | OUT | — |
| 60 | 123 | POST | /api/facilities/resource-reservations/:id/cancel | OUT | — (C9 não se aplica: sem efeito legal/financeiro/patrimonial) |
| 61 | 126 | GET | /api/facilities/areas | OUT | — |
| 62 | 127 | GET | /api/facilities/areas/:id | OUT | — |
| 63 | 128 | POST | /api/facilities/areas | OUT | — |
| 64 | 129 | PUT | /api/facilities/areas/:id | OUT | — |

**`facilities`: IN 45 · OUT 19 · total 64.** IN estrito (sem I-6): 39.

### 3.2 `ti` — 47 endpoints · `app.use('/api/ti')` (`app.ts:206`) · arquivo `ti.ts`

| # | :linha | Método | Path | IN/OUT | Categoria |
|---|---|---|---|---|---|
| 1 | 33 | GET | /api/ti/ticket-categories | OUT | — |
| 2 | 34 | GET | /api/ti/ticket-categories/active | **IN** | C2 (**sem gate de módulo**) |
| 3 | 35 | POST | /api/ti/ticket-categories | OUT | — |
| 4 | 36 | PUT | /api/ti/ticket-categories/:id | OUT | — |
| 5 | 39 | POST | /api/ti/tickets | **IN** | C2 (**sem gate de módulo**) |
| 6 | 40 | GET | /api/ti/tickets/mine | **IN** | C2, C11 (auto-filtro por titular) |
| 7 | 41 | GET | /api/ti/tickets | OUT | — |
| 8 | 42 | GET | /api/ti/tickets/:id | **IN** | C2 (`authorizeSelfOrModule`) |
| 9 | 43 | POST | /api/ti/tickets/:id/assign | OUT | — |
| 10 | 44 | PUT | /api/ti/tickets/:id/priority | OUT | — |
| 11 | 45 | POST | /api/ti/tickets/:id/wait | OUT | — |
| 12 | 46 | POST | /api/ti/tickets/:id/resume | OUT | — |
| 13 | 47 | POST | /api/ti/tickets/:id/link-maintenance-order | **IN** | C6 (escreve vínculo cross-módulo) |
| 14 | 48 | POST | /api/ti/tickets/:id/resolve | OUT | — |
| 15 | 49 | POST | /api/ti/tickets/:id/confirm | **IN** | C2 (`authorizeSelfOrModule`) |
| 16 | 50 | POST | /api/ti/tickets/:id/reopen | **IN** | C2 |
| 17 | 51 | POST | /api/ti/tickets/:id/cancel | OUT | — |
| 18 | 52 | GET | /api/ti/tickets/:id/comments | **IN** | C2 |
| 19 | 53 | POST | /api/ti/tickets/:id/comments | **IN** | C2 |
| 20 | 56 | GET | /api/ti/responsibility-terms | **IN** | C7 (termo de responsabilidade) |
| 21 | 57 | GET | /api/ti/responsibility-terms/by-employee/:employeeId | **IN** | C7, I-1a |
| 22 | 58 | GET | /api/ti/responsibility-terms/pending-for-offboarding/:employeeId | **IN** | C7, I-1a |
| 23 | 59 | GET | /api/ti/responsibility-terms/:id | **IN** | C7 |
| 24 | 60 | POST | /api/ti/responsibility-terms | **IN** | C7, C6 (vincula ativo a pessoa) |
| 25 | 61 | POST | /api/ti/responsibility-terms/:id/return | **IN** | C7, C6 |
| 26 | 62 | POST | /api/ti/responsibility-terms/:id/lost | **IN** | C3 (`approve`), C9, C4 (baixa patrimonial) |
| 27 | 65 | GET | /api/ti/licenses/expiring | **IN** | C7, I-1b |
| 28 | 66 | GET | /api/ti/licenses | **IN** | C7 |
| 29 | 67 | GET | /api/ti/licenses/:assetId | **IN** | C7 |
| 30 | 68 | POST | /api/ti/licenses | **IN** | C7, C4 |
| 31 | 69 | PUT | /api/ti/licenses/:assetId | **IN** | C7, C4 |
| 32 | 70 | POST | /api/ti/licenses/:assetId/reveal-key | **IN** | **C10 (revela segredo)** |
| 33 | 71 | GET | /api/ti/licenses/:assetId/seats | **IN** | C7, C8 |
| 34 | 72 | POST | /api/ti/licenses/:assetId/seats | **IN** | C8 (concede uso), C7 |
| 35 | 73 | DELETE | /api/ti/licenses/:assetId/seats/:seatId | **IN** | **C9 (único DELETE dos 174)**, C8 |
| 36 | 74 | POST | /api/ti/licenses/:assetId/request-renewal | **IN** | C3 (`approve`), C4 |
| 37 | 77 | GET | /api/ti/access-requests | **IN** | C2, C8 |
| 38 | 78 | GET | /api/ti/access-requests/:id | **IN** | C2, C8 |
| 39 | 79 | POST | /api/ti/access-requests | **IN** | C2, C8 |
| 40 | 82 | POST | /api/ti/access-requests/:id/approve | **IN** | C2, C3, C8 (`authorizeSelfOrModule` + `approve`) |
| 41 | 83 | POST | /api/ti/access-requests/:id/reject | **IN** | C2, C3, C8 |
| 42 | 84 | POST | /api/ti/access-requests/:id/execute | **IN** | C2, C8 (efetiva a concessão) |
| 43 | 85 | POST | /api/ti/access-requests/:id/checklist | **IN** | C8 (I-6) |
| 44 | 86 | POST | /api/ti/access-requests/:id/cancel | **IN** | C8 (I-6) |
| 45 | 89 | GET | /api/ti/backup-logs/health | **IN** | C10 (continuidade) |
| 46 | 90 | GET | /api/ti/backup-logs | **IN** | C10 |
| 47 | 91 | POST | /api/ti/backup-logs | **IN** | C10 |

**`ti`: IN 37 · OUT 10 · total 47.** IN estrito: 35.
Enquadramento **confirmado contra o plano**: `EMENDA_02:171-173` já determinava que *"toda rota de concessão/revogação de acesso é IN-categoria por definição"* — as 8 rotas de `access-requests` e as 3 de `seats` cumprem-no.

### 3.3 `marketing` — 30 endpoints · `app.use('/api/marketing')` (`app.ts:208`)

| # | :linha | Método | Path | IN/OUT | Categoria |
|---|---|---|---|---|---|
| 1 | 40 | GET | /api/marketing/campaigns | OUT | — |
| 2 | 41 | GET | /api/marketing/campaigns/:id | OUT | — |
| 3 | 42 | POST | /api/marketing/campaigns | **IN** | C4 (I-6 — grava orçamento) |
| 4 | 43 | PUT | /api/marketing/campaigns/:id | **IN** | C4 (I-6) |
| 5 | 44 | POST | /api/marketing/campaigns/:id/budget-decision | **IN** | C3 (`approve`), C4 |
| 6 | 45 | POST | /api/marketing/campaigns/:id/recalculate-metrics | **IN** | C6 (recalcula e persiste número derivado) |
| 7 | 48 | GET | /api/marketing/leads | **IN** | I-1a |
| 8 | 49 | GET | /api/marketing/leads/:id | **IN** | I-1a |
| 9 | 50 | POST | /api/marketing/leads | **IN** | I-1a |
| 10 | 51 | POST | /api/marketing/leads/bulk | **IN** | I-1a, C6 (lote) |
| 11 | 52 | PUT | /api/marketing/leads/:id | **IN** | I-1a |
| 12 | 53 | POST | /api/marketing/leads/:id/status | OUT | — |
| 13 | 54 | POST | /api/marketing/leads/:id/handoff | **IN** | C2 (`authorizeAnyModule` marketing OR vendas) |
| 14 | 59 | POST | /api/marketing/leads/:id/convert | **IN** | C6 (cria Cliente — cross-módulo), I-1a |
| 15 | 62 | GET | /api/marketing/events | OUT | — |
| 16 | 63 | GET | /api/marketing/events/:id | OUT | — |
| 17 | 64 | POST | /api/marketing/events | OUT | — |
| 18 | 65 | PUT | /api/marketing/events/:id | OUT | — |
| 19 | 66 | POST | /api/marketing/events/:id/checklist | OUT | — |
| 20 | 67 | PUT | /api/marketing/events/:id/checklist/:itemId | OUT | — |
| 21 | 68 | POST | /api/marketing/events/:id/close | OUT | — |
| 22 | 69 | GET | /api/marketing/events/:id/leads | **IN** | I-1a |
| 23 | 72 | GET | /api/marketing/reports/funnel | OUT | — (agregado) |
| 24 | 73 | GET | /api/marketing/reports/events | OUT | — (agregado) |
| 25 | 76 | GET | /api/marketing/materials | OUT | — |
| 26 | 77 | GET | /api/marketing/materials/:id | OUT | — |
| 27 | 78 | POST | /api/marketing/materials | OUT | — |
| 28 | 79 | PUT | /api/marketing/materials/:id | OUT | — |
| 29 | 80 | POST | /api/marketing/materials/:id/file | **IN** | C10 (upload — `materialFileUpload.single('file')`) |
| 30 | 81 | PATCH | /api/marketing/materials/:id/approve | **IN** | C3 (`approve`) |

**`marketing`: IN 14 · OUT 16 · total 30.** IN estrito: 12.

### 3.4 `engineering` — 11 endpoints · `app.use('/api/engineering')` (`app.ts:195`)

> Nota de montagem verificada: `/api/engineering/bom` é montado **antes** (`app.ts:193`) e pertence a outro módulo (`bom`, 12 endpoints, tier 3 §7.2) — **não** faz parte destes 11.

| # | :linha | Método | Path | IN/OUT | Categoria |
|---|---|---|---|---|---|
| 1 | 34 | GET | /api/engineering/projects | OUT | — |
| 2 | 35 | GET | /api/engineering/projects/:id | OUT | — |
| 3 | 36 | POST | /api/engineering/projects | OUT | — |
| 4 | 37 | PUT | /api/engineering/projects/:id | OUT | — |
| 5 | 40 | GET | /api/engineering/drawings | OUT | — |
| 6 | 41 | POST | /api/engineering/drawings | OUT | — |
| 7 | 42 | PUT | /api/engineering/drawings/:id | **IN** | C6/C12 (I-6 — pode alterar desenho já liberado à produção) |
| 8 | 43 | POST | /api/engineering/drawings/:id/release | **IN** | C3 (`approve` + `authorize('admin')`), C12 |
| 9 | 44 | POST | /api/engineering/drawings/:id/obsolete | **IN** | C3, C9 (invalida desenho em uso) |
| 10 | 47 | GET | /api/engineering/items/:itemId/technical-spec | OUT | — |
| 11 | 48 | PUT | /api/engineering/items/:itemId/technical-spec | **IN** | C6 (I-6 — spec alimenta item/produto) |

**`engineering`: IN 4 · OUT 7 · total 11.** IN estrito: 2.

### 3.5 `comex` — 8 endpoints · `app.use('/api/comex/import-processes')` (`app.ts:160`)

`EMENDA_02:174-177` **já determinou** que os 8 são integralmente IN-categoria. Confirmo por leitura do arquivo e registro a categoria de cada um.

| # | :linha | Método | Path | IN/OUT | Categoria |
|---|---|---|---|---|---|
| 1 | 30 | GET | /api/comex/import-processes/ | **IN** | C4 (processo de importação — valor/tributo) |
| 2 | 31 | GET | /api/comex/import-processes/:id | **IN** | C4 |
| 3 | 33 | GET | /api/comex/import-processes/:id/approvals | **IN** | C2 (`authorizeAnyModule` comex OR diretor), C3 (leitura de alçada) |
| 4 | 34 | POST | /api/comex/import-processes/:id/approve | **IN** | C2 (**módulo dono `diretor`**), C3 — âncora do `CAND-AUTHZ-01` |
| 5 | 35 | POST | /api/comex/import-processes/ | **IN** | C4 |
| 6 | 36 | POST | /api/comex/import-processes/:id/tracking | **IN** | C12 (alçada verificada dentro do use case no evento `shipped`) |
| 7 | 37 | POST | /api/comex/import-processes/:id/receive | **IN** | C5 (recebimento → estoque), C4 |
| 8 | 38 | POST | /api/comex/import-processes/:id/cancel | **IN** | C9, C4 |

**`comex`: IN 8 · OUT 0 · total 8.**

### 3.6 `reports` — 8 endpoints · `app.use('/api/reports')` (`app.ts:166`)

`EMENDA_02:181-184` determina que a verificação de **não-escrita** dos 8 é *"item IN-categoria de integridade de dados"* e **exaustiva sobre os 8**. Logo os 8 são IN por norma do plano, além da categoria material de cada um.

| # | :linha | Método | Path | IN/OUT | Categoria |
|---|---|---|---|---|---|
| 1 | 24 | GET | /api/reports/sales | **IN** | C6 (não-escrita, por EMENDA_02), C4 |
| 2 | 25 | GET | /api/reports/inventory | **IN** | C6, C5 (saldo/valorização) |
| 3 | 26 | GET | /api/reports/customers | **IN** | C6, I-1a |
| 4 | 27 | GET | /api/reports/cash-flow | **IN** | C6, C4 |
| 5 | 28 | GET | /api/reports/production | **IN** | C6 |
| 6 | 29 | GET | /api/reports/oee | **IN** | C6 |
| 7 | 30 | GET | /api/reports/purchasing | **IN** | C6, C4 |
| 8 | 31 | GET | /api/reports/cost-variance | **IN** | C6, C4 |

**`reports`: IN 8 · OUT 0 · total 8.**

### 3.7 `workCenters` — 6 endpoints · `app.use('/api/work-centers')` (`app.ts:178`)

| # | :linha | Método | Path | IN/OUT | Categoria |
|---|---|---|---|---|---|
| 1 | 20 | GET | /api/work-centers/load | OUT | — |
| 2 | 21 | GET | /api/work-centers/ | OUT | — |
| 3 | 22 | GET | /api/work-centers/:id | OUT | — |
| 4 | 23 | POST | /api/work-centers/ | **IN** | C6/C4 (I-6 — capacidade e custo-hora alimentam cálculo) |
| 5 | 24 | PUT | /api/work-centers/:id | **IN** | C6/C4 (I-6) |
| 6 | 25 | PUT | /api/work-centers/:id/shifts | **IN** | C6 (`replaceShifts` — substituição em lote do conjunto de turnos) |

**`workCenters`: IN 3 · OUT 3 · total 6.** IN estrito: 1.
**Declaração de limite:** a atribuição de custo-hora ao centro de trabalho **não foi verificada no controller nem no model** nesta varredura — as linhas 4 e 5 são IN por I-6, não por evidência de coluna monetária (L-04).

### 3.8 Subtotal do tier 3 profundo

| Módulo | Total | **IN** | **OUT** | IN estrito (sem I-6) |
|---|---|---|---|---|
| `facilities` | 64 | 45 | 19 | 39 |
| `ti` | 47 | 37 | 10 | 35 |
| `marketing` | 30 | 14 | 16 | 12 |
| `engineering` | 11 | 4 | 7 | 2 |
| `comex` | 8 | 8 | 0 | 8 |
| `reports` | 8 | 8 | 0 | 8 |
| `workCenters` | 6 | 3 | 3 | 1 |
| **Total** | **174** | **119** | **55** | **105** |

Conferência: 119 + 55 = 174 ✔. IN estrito 105 + 14 rotas IN-só-por-I-6 = 119 ✔.

---

## 4. Os 509 endpoints restantes — classificação por módulo, com categoria declarada

O `EMENDA_02:72` (**I-2**) é norma vigente e explícita: *"Todo o tier 1 e todo o tier 2 são, por definição da própria classificação do escopo, 'alto impacto'. **No tier 3**, a qualificação é **por endpoint**, não por módulo"*. Ou seja: a qualificação por rota é autorizada **onde o plano a manda fazer** — no tier 3. Em tier 1 e tier 2 a unidade normativa é o módulo. Classifico nessa unidade, e registro em L-02 que um refinamento por rota dentro de tier 1/2 **não é autorizado por este artefato** e exigiria decisão nova.

### 4.1 Tier 1 — 39 endpoints · **todos IN**

| Módulo | End. | Arquivo | Categoria que o põe em IN |
|---|---|---|---|
| `auth` | 8 | `auth/…/auth.ts` | **C1** — emissão/renovação/reset de credencial |
| `users` | 7 | `users/…/users.ts` | **C8**, **I-1a** — contas e dado pessoal |
| `items` | 12 | `items/…/items.ts` | **C6** — dado mestre que alimenta estoque, custo e fiscal |
| `categories` | 5 | `categories/…/categories.ts` | **C6** — classificação usada por regra fiscal/estoque |
| `departments` | 5 | `departments/…/departments.ts` | **C6**, **C8** — base do escopo de alçada e do organograma |
| `auditLogs` | 2 | `auditLogs/…/auditLogs.ts` | **C6**, **C10** — trilha de auditoria |

### 4.2 Tier 2 — 381 endpoints · **todos IN**

| Módulo | End. | Categoria |
|---|---|---|
| `inventory` (`inventory.ts` 18 + `inventoryCounts.ts` 9) | 27 | **C5** |
| `mobileInventory` | 3 | **C5** |
| `traceability` | 3 | **C5**, C6 |
| `financial` (`finance.ts` 15 + `reconciliation.ts` 7 + `cnab.ts` 8) | 30 | **C4** |
| `treasury` | 11 | **C4** |
| `accounting` | 11 | **C4**, C6 |
| `budget` | 6 | **C4** |
| `fiscal` | 2 | **C4**, I-1b (obrigação acessória) |
| `accessProfiles` | 6 | **C2**, **C8** |
| `juridico` | 75 | **C7**, I-1a (LGPD) |
| `purchases` | 10 | **C4**, C3 |
| `purchaseRequisitions` | 5 | **C4**, C3 |
| `rfq` | 7 | **C4**, C3 |
| `suppliers` | 6 | **C3**, C4 |
| `sales` | 13 | **C4**, **C5** |
| `mrp` | 4 | **C5**, C12 |
| `production` (`productionOrders.ts` 11 + `productionRoutes.ts` 9 + `productionDowntimes.ts` 3) | 23 | **C5**, C12 |
| `masterProduction` | 7 | **C3**, C12 |
| `rh` | 57 | **C4** (folha/rescisão), **I-1a** |
| `sst` | 75 | **I-1b** (CAT/eSocial S-2210), **I-1a**, C12 |

**Ressalva de alcançabilidade:** os **8 endpoints de `cnab.ts`** contam como IN por categoria (`C4`), mas são **INALCANÇÁVEIS** — o router não é importado por arquivo algum (`T-17` §1.3, `AUD-SEC-T04-03`). Para efeito de `C-136`, a matriz de contrato **não se aplica em runtime** a esses 8; a célula correta é `N/A — rota não montada`, com a evidência da não-montagem, e **não** `NÃO AUDITADO`.

### 4.3 Tier 3 elevado (§7.2) — 44 endpoints · **todos IN**

| Módulo | End. | Categoria |
|---|---|---|
| `products` | 9 | **C6** (espelhamento item↔produto, `3dee99f`) |
| `assets` | 7 | **C4** (patrimônio/depreciação), C6 |
| `bom` | 12 | **C5**, C12 (explosão de materiais) |
| `directorate` | 14 | **C3**, **C8** (alçada/aprovação — `FIND-ERP-009`) |
| `webhooks` | 2 | **C1(b)** (sem authN de usuário), **C10** |

### 4.4 Tier 3 raso (§7.3) — 43 endpoints · **todos IN, por I-5**

`EMENDA_02:190-195` (**I-5**): nível `R` em D1 (authN/authZ), D2 (validação de entrada) ou D6 (audit log) **é** amostragem reduzida e é incompatível com G3. Os 43 já foram elevados a `E` por essa razão. Logo, **para as dimensões D1/D2/D6 os 43 são IN por norma**, independentemente da matéria.

| Módulo | End. | IN por I-5 (D1/D2/D6) | Categoria material adicional |
|---|---|---|---|
| `clients` | 5 | sim | **I-1a** (CPF/CNPJ de cliente) |
| `employees` | 5 | sim | **I-1a** |
| `spreadsheetImport` (`catalogImport.ts`) | 5 | sim | **C6** (importação em massa → `products` + `items` + BOM, `app.ts:198-201`) |
| `intelligentAuditor` | 4 | sim | **C10**, C6 (executa SQL determinístico de varredura) |
| `nonConformities` | 5 | sim | C12 (I-6) |
| `quality` | 3 | sim | C12 (elegibilidade de liberação de lote, `app.ts:188-189`) |
| `laboratory` | 3 | sim | C12 (I-6) |
| `maintenance` | 5 | sim | — (IN somente por I-5) |
| `serviceOrders` | 5 | sim | — (IN somente por I-5) |
| `dashboard` | 3 | sim | — (IN somente por I-5) |

### 4.5 `health` — 2 endpoints · **ambos IN**

| :linha | Método | Path | IN/OUT | Categoria |
|---|---|---|---|---|
| 9 | GET | /health/live | **IN** | **C1(b)** — alcançável sem autenticação (`app.ts:39`, montado **antes** de qualquer gate) |
| 20 | GET | /health/ready | **IN** | **C1(b)**, **C10** — abre `sequelize.authenticate()` e, no ramo de falha (`health.ts:37-44`), **devolve `error.message` cru ao chamador anônimo** |

Observação de contrato entregue junto (não é finding formal deste artefato): `health.ts:42` vaza `error.message` do driver a cliente **não autenticado** — é a **mesma classe** de `T17-F07` (`webhookController.ts:68`), em superfície ainda mais exposta. Encaminhado a T-18 e ao titular de `T17-F07` como **segunda ocorrência**.

### 4.6 Fora dos 683, registrado para não sumir

| Item | Onde | Situação |
|---|---|---|
| `GET /api` | `app.ts:227-232` | **IN por C1(b)** — sem `authenticate`; expõe versão. Ausente de todo inventário |
| `GET /uploads/*` | `app.ts:225` | `express.static` atrás de `authenticate`; superfície **não enumerável** — serve ASO, TRCT, contratos (`app.ts:220-224`). **NÃO CLASSIFICÁVEL rota a rota**; IN por I-1a como superfície |

---

## 5. Contagem honesta

### 5.1 Universo integral

| Faixa | Total | **IN** | **OUT** | **Não classificado** |
|---|---|---|---|---|
| Tier 3 profundo — **nominal por rota** | 174 | **119** | **55** | 0 |
| Tier 1 — por módulo | 39 | 39 | 0 | 0 |
| Tier 2 — por módulo | 381 | 381 | 0 | 0 |
| Tier 3 elevado — por módulo | 44 | 44 | 0 | 0 |
| Tier 3 raso — por módulo (I-5) | 43 | 43 | 0 | 0 |
| `health` — nominal | 2 | 2 | 0 | 0 |
| **TOTAL** | **683** | **628** | **55** | **0** |

628 + 55 = 683 ✔.

**Não classificados: ZERO.** Fora do universo, 1 handler inline (`GET /api`, classificado IN em §4.6) e 1 superfície estática não enumerável (`/uploads`, §4.6) — declarados, não omitidos.

### 5.2 O resultado desconfortável, dito sem maquiar

**91,9% do universo (628/683) é IN-categoria.** A divisão de `C-136` aprovada em `APR-2026-043` **D2** — "matriz completa só nas rotas de categoria vedada, exclusão nominal no resto" — reduz o alvo da matriz de 11 dimensões em **8,1%**, não em uma ordem de grandeza. **O complemento OUT tem 55 rotas, todas dentro do tier 3 profundo.**

Isto **não invalida D2**: a divisão continua correta, a exclusão nominal continua sendo o instrumento certo e as 55 rotas são nominalmente excluíveis a partir de hoje. Mas quem dimensionar `C-136` contando com uma redução material **vai errar o prazo**, e essa é uma informação que o diretor precisa ter antes de planejar, não depois. Registro-a como resultado, não como objeção.

**A única alavanca que reduziria de fato o alvo** é o refinamento por rota dentro de tier 1 e tier 2 (420 endpoints). Ele **não foi feito** e **não está autorizado** — I-2 fixa a unidade em módulo fora do tier 3. Custo estimado: 3 a 4 sessões de leitura de 26 arquivos de rota. Ganho não garantido: `financial`, `inventory`, `sales`, `rh`, `sst` e `juridico` (287 endpoints) muito provavelmente permanecem IN quase integralmente. **Decisão do diretor/dono, não minha** (L-02).

### 5.3 Sensibilidade a I-6, publicada

| Leitura | IN | OUT |
|---|---|---|
| Com I-6 (norma vigente, é a lista oficial) | 628 | 55 |
| IN estrito no tier 3 profundo, I-6 desligado | 614 | 69 |

**14 rotas** mudam de lado se I-6 for desligado, todas nominadas nas tabelas do §3 com a marca `(I-6)`: `facilities` 5/20/37/47/48/49, `ti` 43/44, `marketing` 3/4, `engineering` 7/11, `workCenters` 4/5. Publico as duas leituras porque o efeito de uma regra de desempate **não pode ficar dentro da cabeça do auditor**.

---

## 6. Divergências e conformidades

### 6.1 Divergências registradas (Regra 20 — registrar, não acomodar)

| # | Divergência | Fontes | Situação |
|---|---|---|---|
| **DIV-F5-01** | **681 × 683** | `AUDIT_PLAN.md:475`, `SYSTEM_MAP.md`, `API_INVENTORY.md` (passo 23) dizem 681; medição própria e `T-17` dizem 683 | **Reconfirmo `T-17`.** 681 é subcontagem por Grep de linha única (perde 4 chamadas multi-linha) e ignora `health.ts`. **Não acomodo.** Já escalado por `T-17` §7.1; permanece **aberto** |
| **DIV-F5-02** | **`ti.ts:7-8` diz "57 endpoints do contrato"; o arquivo tem 47** | leitura integral de `ti.ts` (medição própria: 47) × docblock do próprio arquivo | Discrepância **de 10** entre o contrato citado (`BLOCO_2_TI_API.md`) e a implementação. **Não adjudicada** — exigiria contar o documento endpoint a endpoint, o que **não fiz** (L-05). Encaminhado a `T-23` / `AUD-PROC-DOCDRIFT-01` |
| **DIV-F5-03** | **`facilities.ts:5-6` diz "os 60 endpoints do contrato"; o arquivo tem 64** | leitura integral de `facilities.ts` × docblock | Discrepância **de 4**, mesmo padrão de DIV-F5-02, em sentido oposto. **Não adjudicada** (L-05) |

`DIV-F5-02` e `DIV-F5-03` são reportadas **contra a minha própria conveniência**: nenhuma delas muda o total de 174, e eu poderia tê-las calado sem que a lista mudasse de forma alguma.

### 6.2 Conformidades e falsos positivos evitados

| # | Registro |
|---|---|
| **CONF-F5-01** | **683 confirmado por método independente** do usado por `T-17` (Grep ancorado no início da linha × Grep `-o` + leitura manual). Convergência de dois métodos distintos |
| **CONF-F5-02** | **676 alcançáveis confirmado partindo de base diferente** (683−8+1 × 681−8+2+1). Aritmética de `T-17` §1.3 **fecha** |
| **CONF-F5-03** | **A soma dos tiers fecha em 683 em todos os cortes**: 39 + 381 + 261 + 2, e 261 = 174 + 44 + 43. Nenhum módulo órfão, nenhum contado duas vezes. `financial` 30, `inventory` 27, `production` 23 conferidos por soma de arquivos |
| **CONF-F5-04** | **Falso positivo evitado — `/api/engineering/bom`.** Os 12 endpoints de `bom.ts` **não** foram somados aos 11 de `engineering`: são montados antes, em prefixo próprio (`app.ts:193-195`), e pertencem à faixa §7.2. Somá-los inflaria `engineering` para 23 e quebraria o 174 |
| **CONF-F5-05** | **Falso positivo evitado — `POST /api/facilities/maintenance-tickets` (`:89`) não é shadow endpoint.** A ausência de `authorizeModule` é **intencional e documentada** (`facilities.ts:15-18, 88`, RF-FAC-040). Classifiquei IN por C2 (o gate desvia e precisa ser verificado), **não** como defeito — a adjudicação é do `authorization-auditor` |
| **CONF-F5-06** | **Falso positivo evitado — C2 não foi aplicado a "toda rota com middleware de authZ".** A leitura ampla poria 683/683 em IN e esvaziaria a triagem do REG-G3; a decisão e o motivo estão em §2.2, Fronteira 1 |
| **CONF-F5-07** | **`comex` 8/8 IN e `reports` 8/8 IN** coincidem com o que `EMENDA_02:174-184` já havia determinado **antes** desta varredura — cheguei por leitura do arquivo e só depois confrontei o plano. Convergência, não deferência |

---

## 7. Lacunas declaradas deste artefato

| ID | Lacuna | Efeito | Custo para fechar |
|---|---|---|---|
| **L-01** | Sem shell nesta sessão: a árvore lida **não foi amarrada criptograficamente** ao `AUDIT_COMMIT`. Mesma limitação de `RES-T17-02` | Nenhuma afirmação de proveniência temporal é feita | 1 comando por agente com shell |
| **L-02** | **Refinamento por rota dentro de tier 1 e tier 2 (420 endpoints) NÃO foi feito** — I-2 fixa a unidade em módulo fora do tier 3 | O IN de 628 é o teto normativo, não necessariamente o material | 3-4 sessões + decisão que autorize a qualificação por rota em tier 1/2 |
| **L-03** | 3 das 4 rotas multi-linha (`juridico.ts:77`, `catalogImport.ts:31` e `:40`) **não foram reabertas** por mim; aceitas como insumo de `T-17` | Nenhum efeito sobre o total (o Grep ancorado as conta pelo verbo); efeito possível sobre o **literal do path** | 3 leituras |
| **L-04** | Classificação de `workCenters` POST/PUT (I-6) **não verificada no controller/model** quanto a custo-hora | 2 rotas podem ser OUT | 1 leitura de controller |
| **L-05** | `DIV-F5-02` e `DIV-F5-03` **não adjudicadas** — os documentos `BLOCO_2_TI_API.md` e `BLOCO_4_FAC_API.md` não foram contados endpoint a endpoint | Discrepância registrada, causa não determinada | 1 sessão, com `api-documentation-auditor` |
| **L-06** | `/uploads/*` (`app.ts:225`) é **superfície não enumerável estaticamente** | Cobertura de contrato dessa superfície é estruturalmente impossível por método estático | exige inventário do diretório `uploads/` — **não feito** (dado real, risco de N-01) |

---

## 8. Como `C-136` deve consumir esta lista (instrução operacional de D2)

1. **Matriz de 11 dimensões integral** nas **628 rotas IN** — com a ressalva de que os 8 de `cnab.ts` recebem `N/A — rota não montada`, não `NÃO AUDITADO`.
2. **Exclusão nominal com dimensão declarada** nas **55 rotas OUT**, todas nominadas no §3 deste documento — a exclusão deve citar `F-5 §3.x #n` e dizer **quais colunas** ficaram vazias, nunca frase genérica (exigência literal de `APR-2026-043` D2).
3. **A lista é fixa a partir desta publicação.** `REG-G3` passo 4 proíbe ajustá-la depois para caber no achado. Reclassificação de qualquer rota exige **adendo com motivo escrito**, não edição silenciosa.
4. Um terceiro pode **refutar rota a rota**: cada linha do §3 tem arquivo, linha, verbo, path e categoria. Essa refutabilidade é o produto — não o número.

---

## 9. Três pontos que o diretor precisa decidir a partir daqui

1. **A economia esperada de D2 não se materializou** (§5.2): 628 IN de 683. A divisão continua legítima, mas o dimensionamento de `C-136` precisa ser refeito com 628, não com "uma fração".
2. **L-02 é a única alavanca real** e depende de decisão: autorizar qualificação **por rota** dentro de tier 1/2 contraria I-2 como está escrito e seria nova decisão humana (Regra 18), não inferência minha.
3. **Duas divergências novas de doc × código** (`DIV-F5-02`, `DIV-F5-03`) e **uma segunda ocorrência de `T17-F07`** em `health.ts:42` (vazamento de `error.message` a cliente anônimo) saem daqui como handoff, não como finding fechado.
