# T-33 — FECHAMENTO DOS ENDPOINTS RASOS · BLOCO B

**Run:** `ERP-LEGACY-001-AUD-001` · **AUDIT_COMMIT:** `c1311a6f76b512fef893f7e60d934179cae3409f`
**Escopo:** `maintenance`, `serviceOrders`, `intelligentAuditor`, `laboratory`, `dashboard`
**Execução dinâmica:** nenhuma. Todo veredito é estático sobre artefato versionado.

> **Nota de persistência.** Agente titular não escreve em `audit/`. Persistido pelo orquestrador
> **sem alteração**.

## 1. Inventário próprio

| Módulo | Endpoints | Rota | T-16 | Divergência |
|---|---|---|---|---|
| `maintenance` | 5 | `maintenance.ts:19-23` | 5 | — |
| `serviceOrders` | 5 | `serviceOrders.ts:19-23` | 5 | — |
| `intelligentAuditor` | 4 (todos GET) | `intelligentAuditor.ts:12-15` | 4 | — |
| `laboratory` | 3 | `laboratory.ts:24-26` | 3 | — |
| `dashboard` | 3 | `dashboard.ts:27-29` | 3 | — |
| **Total** | **20** | | | **A tarefa estimou "~17"; são 20.** Registro por Regra 20: a contagem de T-16 estava correta; a estimativa do briefing é que estava baixa. |

D1/D2 foram **reconfirmados por leitura própria**, não herdados de T-16.

## 2. Findings `PROPOSED`

### `T33-B-F01` — HIGH · Descrição do equipamento da OS é descartada em todos os caminhos possíveis

Divergência **tripla**, em quatro artefatos:

| Artefato | Nome do campo | Linha |
|---|---|---|
| Contrato de API | `equipment_description` | `docs/arquitetura/API.md:3986` |
| Use case (destructuring) | `equipment_desc` | `CreateServiceOrderUseCase.ts:14,37,48` |
| Model / coluna real | `equipment_description` | `ServiceOrder.ts:43`; baseline `:12634` |
| Cliente web | envia `equipment_desc` | `client/src/api/serviceOrders.ts:75`; `ServiceOrdersTab.tsx:103,196` |

Quem segue a documentação envia `equipment_description` e o use case **não lê** (`:37`); quem envia
`equipment_desc` é lido e repassado ao Sequelize com chave inexistente no model (`:48`), que a
**ignora em silêncio**. `UpdateServiceOrderUseCase.ts:11-24` também não a inclui na allowlist — o
dado **não é recuperável nem por edição posterior**.

Materialidade: `product_id` é opcional (`ServiceOrder.ts:42`). Uma OS de produto não cadastrado fica
**sem qualquer identificação do equipamento recebido do cliente**. É a mesma classe que o repositório
declara ter corrigido em `maintenance` em 2026-08-12
(`CreateMaintenanceOrderUseCase.ts:4-14`) — **não propagada ao módulo irmão**. O
`client/src/api/serviceOrders.ts:12-19` documenta o defeito: **é conhecido pela engenharia e não
está registrado como finding nem tem BR-ID** (Regra 7). Teste
`serviceOrders-use-cases.test.ts:14,27-31` usa `equipment_desc` e **nenhum caso assevera a
persistência do campo**.

### `T33-B-F02` — HIGH · BR §6.1 (filtragem de cards do Dashboard) é imposta apenas no cliente

Documentado (`BUSINESS_RULES.md:194-197`): *"Dashboard: … ao acessar, **o sistema filtra** os cards
exibidos pela interseção entre os cards existentes e os demais módulos concedidos ao perfil"*.

Implementado: `dashboardController.ts:16-23` **não lê `req.user`**; `GetDashboardSummaryUseCase` é
`UseCase<void, any>` (`:10,20`); `SequelizeDashboardRepository.getSummary():22-54` agrega
incondicionalmente e devolve `financial: { pending_receivable, pending_payable, projected_balance }`
(`:44-53`) e `sales.month_total`. A filtragem existe **só no cliente**
(`DashboardPage.tsx:25,32-38`).

Alcance: `BUSINESS_RULES.md:36` concede `dashboard` a **todos os 12 perfis**. Logo, contas a
receber, contas a pagar e saldo projetado da empresa são legíveis por Almoxarife, Recebimento,
Expedição, Analista de Laboratório, Operador de Produção e RH — perfis que **não têm `financeiro`**
(`:57`). É precisamente o risco pelo qual a EMENDA-02 elevou `dashboard` a exaustivo
(`AUDIT_PLAN_EMENDA_02.md:216-218`) — **o risco previsto se confirma**.

### `T33-B-F03` — HIGH · `serviceOrders` grava, altera e cancela sem nenhum registro de auditoria

`serviceOrderController.ts:1-8` não importa `auditLogService`; varredura do arquivo íntegro (71
linhas): **zero `logAction`**. Os três endpoints de escrita (`:41-49`, `:52-60`, `:63-71`) não deixam
rastro. Contraste no mesmo bloco e commit: `maintenanceController.ts:47,68,88` registra os três;
`laboratoryController.ts:31-38` registra a criação.

Materialidade: a OS carrega `labor_cost` e `total_amount` (`ServiceOrder.ts:47-48`, `NOT NULL
DEFAULT 0`, baseline `:12638-12639`) e `warranty_days` (`:12647`). **Alterar o valor cobrado de um
cliente e o prazo de garantia não gera nenhum registro de quem, quando, nem de qual valor para
qual.**

### Demais findings

| ID | Achado | Sev. |
|---|---|---|
| `F04` | Auditor Inteligente reporta como recebível incompleto **toda** venda confirmada — o `where` filtra só `status:'confirmed'`, sem `'$accounts_receivable.id$': null`, e `required:false` inclui quem tem recebível. O predicado correto está **três linhas abaixo**, em `withoutItems` (`:51-55`). `raw:true` + include 1-N tende a duplicar. `SequelizeIntelligentAuditorRepository.ts:45-56` | MEDIUM |
| `F05` | OM sem máquina de estados (`status` na allowlist, `UpdateMaintenanceOrderUseCase.ts:33`), cancelamento de qualquer estado inclusive `completed` (`CancelMaintenanceOrderUseCase.ts:32-44`, com efeito colateral em `Asset.status` via `:41`), e `total_cost` sem sinal/teto/alçada (`:31`). **`DELETE` exige `approve` (`maintenance.ts:23`), mas lançar R$ 500.000 de custo exige apenas `operate` (`:22`)** | MEDIUM |
| `F06` | `serviceOrders` sem transação em nenhuma escrita (`SequelizeServiceOrdersRepository.ts:44-52`), contra `maintenance` que usa transação + `pg_advisory_xact_lock`. **A mesma regra — "numeração única serializada" — tem duas implementações divergentes no mesmo sistema.** `labor_cost`/`total_amount` sem alçada; `warranty_days` sem BR (o 90 é só `DEFAULT` de coluna); cancelamento sobre `delivered` | MEDIUM |
| `F07` | `manutencao` e `garantia` **não existem** na matriz de perfis de `BUSINESS_RULES.md:22-28,34-61`, embora declarados em `accessModules.ts:227-228,336,341`. Quem define acesso é `seed-usuarios-departamentos.cjs:240-243`, e o comentário `:237-239` registra que `garantia` foi concedida à Manutenção porque *"o smoke de apresentação acusou 403 nessa tela"* — **decisão de permissão por sintoma de demonstração, contradizendo o owner declarado (`VEND`)**. Fonte autoritativa **indeterminada** → Regra 21 | MEDIUM |
| `F08` | Audit log de manutenção sem `oldValues` (`maintenanceController.ts:68-74`, `:88-93`), embora o use case tenha o registro anterior em mãos (`:84`, `:35`). Agravante: `newValues: req.body` grava o corpo bruto — campo enviado e **ignorado** pela allowlist aparece no log como se tivesse sido gravado | MEDIUM |
| `F09` | `department-demands` sem `LIMIT` em nenhuma das três queries (`SequelizeDashboardRepository.ts:169-195,215-228`) — lado servidor de `T29-TV-F02`. O app renderiza 3, mas **recebe a carteira inteira** de OPs, requisições e contagens abertas, a cada 60s, num aparelho de parede. Minimização é responsabilidade do produtor | MEDIUM |
| `F10` | Critérios do Auditor Inteligente sem BR-ID nem owner: "compra parada" = **30 dias** (`:63-64`), "estoque inconsistente" = `Product.quantity < 0` (`:15-19`), "sem movimentação" **sem janela**, "conta vencida" (`:74-81`). **Nenhuma BR cobre nenhum dos quatro.** Adicional: `auditStock` lê `Product.quantity` (coluna denormalizada), **não** o saldo por depósito que o sistema movimenta | MEDIUM |
| `F11` | 4 GETs de auditoria devolvem nomes de clientes com títulos vencidos, somatórios e compras com `total_amount`, **sem `logAction` e sem paginação** — `auditStock` carrega todos os produtos com saldo positivo, `raw` | LOW |
| `F12` | Paginação sem guarda de `NaN` nos dois módulos de ordem (`ListMaintenanceOrdersUseCase.ts:39-42`, `ListServiceOrdersUseCase.ts:39-42`); o padrão correto está em `laboratoryValidators.ts:55-56` | LOW |
| `F13` | Comentário normativo cita nível `view` inexistente — **3ª a 6ª ocorrência**. `BUSINESS_RULES.md:15-16` define `V` = "ver (leitura apenas)" e o usa em 60+ células, inclusive `dashboard \| V` para os 12 perfis. Como o código não distingue leitura de escrita, **um perfil documentado como somente-leitura tem, na prática, escrita** — em `laboratorio` contido por 2ª camada; em `manutencao`/`garantia`, **sem** | LOW |
| `F14` | RNC de reprovação nasce **fora** da transação do teste (`CreateAcousticTestUseCase.ts:147-172` × `:186-207`); o risco está declarado só em comentário (`:179-185`), sem BR-ID, sem finding e sem decisão registrada | LOW |
| `F15` | `PUT`/`DELETE` de OS respondem **404 sobre ordem existente** quando o corpo não traz campo da allowlist (`UpdateServiceOrderUseCase.ts:45-55`) — o 404 passa a significar "nada mudou". `maintenance` não incorre (`:84-87`) | LOW |
| `F16` | **INFO — não há IA em `intelligentAuditor`**: leitura integral dos 7 arquivos (314 LOC). Lê estoque, vendas, compras e financeiro; **não escreve em nada**; 4 GETs que devolvem JSON — não bloqueiam, não sinalizam, não notificam. **Nenhum cliente HTTP, chamada externa, modelo ou chave de API.** "Inteligente" é nome de produto, não arquitetura. **A premissa de escopo da run não é contrariada.** O risco real é o nome induzir confiança num controle que não é controle | INFO |

## 3. Conformidades (mesmo peso)

| # | Conformidade | Prova |
|---|---|---|
| C1 | Numeração de OM serializada por advisory lock + `UNIQUE`, na mesma transação do INSERT | `SequelizeMaintenanceRepository.ts:18,68-87`; baseline `:17491`; `maintenance-order-lifecycle.test.ts:91-120` |
| C2 | Sincronização `Asset.status` com `WHERE status='in_maintenance'` — não "ressuscita" ativo baixado | `:120-128`; testes `:237-270` |
| C3 | `laboratory` é o único do bloco com Zod `.strict()`, teto de paginação e de janela | `laboratoryValidators.ts:46,55-57,61-62` |
| C4 | `tester_id` sempre do JWT | `laboratoryController.ts:29`; teste `:113` |
| C5 | Reprovação **sempre** abre RNC; flag de opt-in aceita e ignorada (G8) | `CreateAcousticTestUseCase.ts:186-207`; testes `:198,222,242` |
| C6 | Consumo destrutivo debitado na **mesma** transação do teste (UC-42-E) | `:147-172`; teste `:265` |
| C7 | `getHandoffsSummary` e `getDepartmentDemands` com SQL **parametrizado** | `SequelizeDashboardRepository.ts:66-127,163-195` |
| C8 | Critérios de "em aberto" documentados no código com justificativa por status | `:139-159` |
| C9 | Regressão N+1 de `auditStock` corrigida **e** protegida por teste | `:26-32`; `intelligent-auditor-repository.test.ts:24-49` |
| C10 | `intelligentAuditor` sob `authorize('admin')` nos 4 endpoints | `intelligentAuditor.ts:12-15` |
| C11 | `DELETE` exige `approve` em `manutencao` e `garantia`, com regressão RBAC HTTP real | `maintenance.ts:23`; `serviceOrders.ts:23`; `rbac-maintenance-service-orders-access-denied.test.ts:67-125` |
| C12 | `maintenance` mapeia campo de API → coluna real via `Map`, com o defeito de 2026-08-12 corrigido e coberto | `UpdateMaintenanceOrderUseCase.ts:28-40`; teste `:139-165` |
| C13 | Nenhum `role`/`isAdmin` aceito de body/query/header nos 20 endpoints — **Regra 24 não violada** | varredura dos 5 controllers e 16 use cases |

## 4. Cobertura declarada

C-63…C-92 (parcela B) D1/D2/D6 — **E 20/20**; C-93…C-122 D3/D4/D5 — **E 20/20**; C-123…C-132 D9 —
**E 20/20**.

**Limites:** (1) nenhuma execução — F04 e F12 têm confiança de comportamento MÉDIA; (2) **D5
estático** sobre model + baseline, sem consulta ao banco vivo; (3) `maintenance_orders` é compartilhada
com chamados prediais de Facilities (prefixo `MO-FAC-`) — **os endpoints de Facilities não são deste
bloco**; (4) fonte autoritativa de F07 não determinada.

## 5. Encaminhamentos

- **`vericore-finding-validator`** (Regra 22): `F01`, `F02`, `F03`.
- **`vericore-traceability-auditor`**: `F07`, `F10`, `F14`, `F16` (fecha a evidência do gate G5).
- **`vericore-software-audit-director`**: decisão humana em `F07` (fonte autoritativa) e `F02`
  (qual lado — doc ou código — é o correto; Regra 20).
- **Candidatas a BR-ID novo, para o dono decidir:** prazo de garantia de OS; alçada de custo em OM e
  OS; máquina de estados de OM; limites do Auditor Inteligente.
