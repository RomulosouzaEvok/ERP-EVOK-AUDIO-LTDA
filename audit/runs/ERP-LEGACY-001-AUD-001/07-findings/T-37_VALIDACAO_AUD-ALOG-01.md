# T-37 — VALIDAÇÃO DE `AUD-ALOG-01` (Regra 22)

| Campo | Valor |
|---|---|
| Run | `ERP-LEGACY-001-AUD-001` |
| `AUDIT_COMMIT` | `c1311a6f76b512fef893f7e60d934179cae3409f` |
| Finding validado | `ERP-LEGACY-001-AUD-001 / AUD-ALOG-01` (PROPOSED, origem `T-03_RETIFICACAO_01.md` §6) |
| Validador | VeriCore — `vericore-finding-validator` |
| Data | 2026-08-16 |
| Regime | Auditoria **estática**. **Nenhuma conexão com `erp_evok_audio` nem qualquer banco** — `APR-2026-016` íntegra. Nenhuma contagem de linhas de `audit_logs` foi feita nem tentada. |
| Artefatos alterados | **NENHUM** fora deste arquivo (Regra 15). `AUD-ALOG-01.md`, `T-03_RETIFICACAO_01.md`, `AUD-DB-09_RETIFICACAO_01.md`, `T-03_AUDIT_LOG_REPORT.md` íntegros. |
| Método | READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT. Cada call site foi lido por mim; nenhuma asserção dos autores foi aceita sem reexecução própria. |

> **Limitação declarada (LIM-T37-01).** Este validador não dispõe de ferramenta
> de shell; a verificação foi feita sobre a working tree em `HEAD 694bca9`
> (limpa). Os 5 commits posteriores ao fieldwork são, pelas mensagens,
> exclusivamente `docs(coretriad)`/`audit/` — nada indica toque em `server/`.
> A identidade byte a byte de `server/` entre `HEAD` e o `AUDIT_COMMIT
> c1311a6f` deve ser confirmada pelo `vericore-audit-evidence-controller`
> (um `git diff c1311a6f..HEAD -- server/` vazio fecha esta limitação).
> Nenhum veredito abaixo depende de linha que os retificadores não citem
> também — o risco desta limitação é baixo e está declarado, não escondido.

---

## 1. VEREDITO GERAL

```
FINDING:         ERP-LEGACY-001-AUD-001 / AUD-ALOG-01
STATUS ANTERIOR: PROPOSED
STATUS VALIDADO: CONFIRMED
CONFIANÇA:       CONFIRMED (estática; prova dinâmica pendente em DYN-T03-07)
CORREÇÕES:       universo é 14 casos de uso, não 13 (§4); placar corrigido
                 para 4 completos · 2 parciais · 8 mudos; critério de reteste
                 exige emenda (§7)
SOBREPOSIÇÃO:    decidida — AUD-ALOG-01 segue AUTÔNOMO (opção b), com
                 instrução anti-dupla-contagem ao consolidador (§6)
```

**Tentei derrubar o finding por 9 hipóteses refutadoras (§3). Todas
falharam.** Os 8 call sites ditos mudos são mudos em todas as camadas; o
parcial é parcial exatamente como descrito; a contraprova aguenta. As duas
correções que encontrei (§4, §7) **não enfraquecem o finding — uma delas o
amplia** (o universo real é maior do que o contado, e o 14º caso também é
não-conforme ao padrão `soft_delete` + old/new).

Nenhum `FINDING CLOSED`, nenhum `RETEST_PASSED` (Regra 4). Este artefato
habilita `AUD-ALOG-01` a seguir para a SanaCore.

---

## 2. VEREDITO POR ITEM — verificado call site a call site

| Item | Ponto | Verificação própria | Veredito |
|---|---|---|---|
| **A** | `server/src/modules/employees/presentation/controllers/employeeController.ts:94-103` — `DELETE /api/employees/:id` | `:97` instancia `DeactivateEmployeeUseCase`; o use case (`DeactivateEmployeeUseCase.ts:73`) grava `{ status: 'inactive', dismissal_date: new Date() }` e retorna `"Funcionário desligado com sucesso"`. **Zero `logAction`/`auditLogService`/`AuditLog` em qualquer camada do módulo `employees`** (varredura própria, código; único hit é README). O `terminationProcessChecker` (`:63-71`) apenas **bloqueia** quando há `HrTerminationProcess` aberto — quando não há, desativa sem criar registro algum. Rota restrita a `authorize('admin')` (`employees.ts:23`), que por `AUD-DB-07` nem loga a própria negativa. | **CONFIRMADO — mudo** |
| **B** | `server/src/modules/items/presentation/controllers/itemController.ts:135-146` — `PATCH /api/items/:id/inactivate` | `:137` instancia `DeactivateItemUseCase`; o use case verifica 5 vínculos e grava `{ status: 'INATIVO' }` (`DeactivateItemUseCase.ts:75`). Zero trilha em qualquer camada do módulo `items`. **Agravo de exposição não registrado pelos autores:** `items.ts:21` mapeia **também `DELETE /api/items/:id`** para o mesmíssimo handler mudo — o endpoint em produção real é alcançável por **duas rotas**. | **CONFIRMADO — mudo** (com agravo de exposição) |
| **C** | `itemController.ts:203-211` (`:205`) — `DELETE /api/items/:id/suppliers/:linkId` | `DeactivateItemSupplierUseCase`, mesmo módulo mudo. | **CONFIRMADO — mudo** |
| **D** | `supplierController.ts:119-127` (`:121`) | `DeactivateSupplierUseCase.ts:40` grava `{ status: 'inactive' }`. Zero trilha no módulo. **O `suppliers/README.md:146-148` declara a ausência como intencional** (*"Nenhum endpoint deste módulo chama `logAction` … comportamento preservado"*). | **CONFIRMADO — mudo** (omissão documentada como escolha) |
| **E** | `clientController.ts:77-86` (`:80`) | `DeactivateClientUseCase`; zero trilha no módulo; `clients/README.md:165-167` idem D — ausência **intencional e documentada**. | **CONFIRMADO — mudo** |
| **F** | `categoryController.ts:63-72` (`:66`) | `DeactivateCategoryUseCase`; zero trilha no módulo. | **CONFIRMADO — mudo** |
| **G** | `departmentController.ts:62-71` (`:65`) | `DeactivateDepartmentUseCase`; zero trilha no módulo. | **CONFIRMADO — mudo** |
| **H** | `assetController.ts:78-87` (`:81`) | `DeactivateAssetUseCase`; zero trilha no módulo. | **CONFIRMADO — mudo** |
| Parcial | `saleController.ts:342-360` — `DELETE /api/sales/customers/:id/prices/:priceId` | `logAction` em `:350`; `action: 'delete'` em `:351` — verbo de exclusão **física** para desativação **lógica** (`DeactivateCustomerPriceUseCase`, `active=false`); payload tem só `entityDescription`/`description` — **sem `oldValues`, sem `newValues`** (`:352-355`). `'delete'` é valor legado do ENUM (`auditActions.ts:83`), então a linha **persiste** — porém mente o verbo e não reconstitui estado. | **CONFIRMADO — parcial, exatamente como descrito** |

Divergência de linha encontrada: **nenhuma**. Todas as citações
arquivo+linha do finding conferem na working tree.

---

## 3. HIPÓTESES REFUTADORAS — todas tentadas, resultado individual

Obrigação de método: dois autores já procuraram; fui o terceiro par de olhos,
por caminhos próprios, não eco dos deles.

| # | Hipótese (o que invalidaria o finding) | Verificação própria | Resultado |
|---|---|---|---|
| R1 | **Middleware global de auditoria de mutação** | `server/app.ts` inteiro lido: cadeia é `helmet` → `cors` → `requestContext` → limiters → body parser → routers → `errorHandler` (`app.ts:35-37,129-148,234`). Nenhum interceptor de mutação. | **FALHOU** |
| R2 | **Log de acesso HTTP capturando o ator** | `requestContext.ts:27-38` loga `http_request` com `requestId`/`method`/`path`/`statusCode`/`durationMs` via Winston — **sem `user`**, sem body, sem old/new. Roda **antes** de `authenticate` e o handler de `finish` não lê `req.user`. Sabe-se que *alguém* chamou `DELETE /api/employees/5`; **não quem**. Não compensa autoria — que é exatamente o que falta. | **FALHOU** |
| R3 | **Hook de Sequelize (model/global)** | Varredura `addHook|afterUpdate|beforeUpdate|afterSave|afterBulkUpdate|hooks:` em `server/src`: **1 hit** — `User.ts:118-134`, `beforeSave` de **bcrypt de senha**. Nada de auditoria. | **FALHOU** |
| R4 | **Trigger no DDL** | `CREATE TRIGGER` em `server/database/postgresql/00_baseline_frozen.sql`: **13 triggers** (`:22156-22240`), todos de **bloqueio de imutabilidade** RH/JUR/SST (`hr_employee_benefits`, `hr_vacation_schedules`, `hr_employee_contracts`, `hr_employee_job_history`, `hr_vacation_accrual_periods`, `jur_*` ×4, `sst_*` ×4). **Nenhum** sobre `items`, `employees`, `suppliers`, `clients`, `product_categories`, `departments`, `assets`, `customer_price_lists`; **nenhum grava** trilha — todos bloqueiam. | **FALHOU** |
| R5 | **Trigger/instrumentação em migration pós-freeze** | Varredura `CREATE TRIGGER|audit_log|logAction` em `server/migrations/`: os mesmos 13 triggers de imutabilidade e migrations de vocabulário do ENUM. Nada novo nas 8 tabelas. | **FALHOU** |
| R6 | **Auditoria em outra camada do módulo** (a cegueira de camada de `AUD-DB-03` — `T-03_AUDIT_LOG_REPORT.md:54-57` — poderia inverter o resultado, como inverteu para `users`/`accessProfiles`) | Varredura própria de `logAction|auditLogService|AuditLog` **módulo a módulo, todas as camadas**: `items` 0 · `employees` 0 · `suppliers` 0 (código; README só documenta a ausência) · `clients` 0 (idem) · `categories` 0 · `departments` 0 · `assets` 0 · `sales` = **apenas `saleController.ts`** (import + 6 chamadas: `:117,161,210,281,320,350`). Reproduz o resultado dos dois retificadores por caminho independente. | **FALHOU** |
| R7 | **Middleware de rota específico** | `items.ts` e `employees.ts` lidos: apenas `authenticate` + `authorizeModule('produtos')`/`authorize('admin')`. `authorizeModule` audita só **negativa** (`AUD-DB-07`, `auth.ts:231-242`); `authorize(role)` não audita nem negativa. Sucesso não gera evento em nenhum dos dois. | **FALHOU** |
| R8 | **Registro secundário próprio** (tabela de histórico do domínio que compensasse a trilha) | Varredura `\.create\(|History|history` em todos os `Deactivate*.ts` de `server/src/modules`: **zero**. Leitura integral de `DeactivateItemUseCase`, `DeactivateEmployeeUseCase`, `DeactivateSupplierUseCase` (amostra dos demais por grep): todos terminam em um único `repository.update(...)`. Nenhum grava segundo registro. | **FALHOU** |
| R9 | **"Não reproduzível / especulativo"** (rejeitar por falta de demonstrabilidade) | O achado é **estruturalmente demonstrável sem execução**: o caminho único de escrita da trilha é `logAction` → `AuditLog.create` (confirmado em `T-03_AUDIT_LOG_REPORT.md:127-128,193-198`, e por R1-R8 não existe caminho implícito). Logo, ausência de call site ⇒ ausência de evento, por construção. A prova dinâmica (`DYN-T03-07`) confirma, não constitui. | **FALHOU** |

**Nenhum controle compensatório existe.** A frase do finding — *"onde não foi
escrito, não existe captura implícita"* — sobreviveu a nove tentativas de
refutação por três auditores independentes.

---

## 4. ARITMÉTICA DO PLACAR — **NÃO FECHA: o universo é 14, não 13**

Os dois retificadores enumeraram por `Deactivate*UseCase` (glob declarado em
`T-03_RETIFICACAO_01.md` §3, tabela de implementação: *"13 `Deactivate*UseCase`
… glob exaustivo"*). Reexecutei com padrão mais largo
(`{Deactivate,Inactivate}*.ts` + tentativas `Disable/Archive/Dismiss/Desativ/Inativ`,
zero hits extras) e o glob retorna **14 arquivos**: os 13 contados **mais
`server/src/modules/production/application/use-cases/InactivateProductionRouteUseCase.ts`**.

O 14º caso tem call site em `productionRouteController.ts:210-232`
(`PATCH /api/production/routes/:id/inactivate`) e **emite** `logAction`
(`:218-225`) — porém com `action: 'inactivate'`, que é **alias** persistido
como `status_change` (`auditActions.ts:219`), e **só `newValues`, sem
`oldValues`**. Ou seja: não é mudo, mas **não cumpre o padrão
`soft_delete` + par old/new** que o próprio finding define como conforme.

A ironia registrada: `AUD-DB-09_RETIFICACAO_01.md` §3.2 **lista**
`InactivateProductionRouteUseCase.ts:48-50` no inventário de desativação por
`status` — o dado estava no run, mas não entrou no placar de `AUD-ALOG-01`
porque o glob dos call sites usou só o prefixo `Deactivate`. Mesma classe de
erro de enumeração que `RES-T03-05` declara para `update` genérico.

**Placar corrigido (universo 14):**

| Classe | Antes | Depois | Casos |
|---|---|---|---|
| Logam completo | 4 | **4** | products (`productController.ts:197-205`), bom (`bomController.ts:211-219`), users (`DeactivateUserUseCase.ts:46-54`), accessProfiles (`DeactivateAccessProfileUseCase.ts:61-69`) |
| Logam incompleto | 1 | **2** | sales (`saleController.ts:350-356` — verbo `delete`, sem old/new) **+ production (`productionRouteController.ts:218-225` — alias `inactivate`→`status_change`, sem `oldValues`)** |
| Não logam nada | 8 | **8** | A-H do §2 — **intactos** |

**Efeito sobre o mérito: nenhum a favor do objeto auditado.** Os 8 mudos
permanecem 8; o denominador sobe e o novo caso também é não-conforme. A
correção **amplia** o finding. Não encontrei call site duplicado no placar
(a dupla rota `DELETE /api/items/:id` + `PATCH .../inactivate` converge no
mesmo call site `itemController.ts:135-146` e conta uma vez — correto).

Duas notas de precisão sobre os "4 completos", para o reteste não tropeçar:
`accessProfiles` emite `'deactivate'` (alias → `permission_change`,
`auditActions.ts:194`), **não** `soft_delete` — completo no par old/new,
conforme na intenção, mas divergente do literal do critério de reteste (§7).
E os 3 emissores `soft_delete` verificados gravam par old/new **completo,
confirmado linha a linha** — a contraprova do finding aguenta integralmente.

---

## 5. SEVERIDADE — fato técnico sustentado; nada a rebaixar

- **A (`CRITICAL`, PRODUÇÃO REAL)** e **B (`HIGH`, PRODUÇÃO REAL)**: fixados
  pelo dono em 2026-08-16 (Regra 18). **O fato técnico que sustenta a
  fixação está provado** (§2, §3). Não registro discordância: para A, o ato
  tem efeito trabalhista, é irreversível por `UPDATE`, está em uso hoje, e
  não existe nenhuma via de reconstituição (R1-R8) — o quadro fático suporta
  CRITICAL por mérito próprio, não só por determinação.
- **C-H (`HIGH`, DEV/HOMOLOGAÇÃO)**: seguem a classificação da trilha;
  evidência sustenta.
- **Parcial de sales e parcial novo de production**: seguem a fila normal;
  o de production deve herdar classificação pela mesma régua da trilha
  (proponho HIGH DEV/HOMOLOGAÇÃO por paridade com C-H — decisão do
  consolidador/director, não minha).

---

## 6. SOBREPOSIÇÃO COM `ERP-LEGACY-001-AUD-001 / AUD-DB-03` — DECISÃO (delegada a este validador pelos dois autores)

**DECISÃO: (b) — `AUD-ALOG-01` permanece FINDING AUTÔNOMO.**

Critérios, na ordem em que pesaram:

1. **Escopos não congruentes nos dois sentidos.** `AUD-ALOG-01` atinge
   `sales` (parcial em `saleController.ts:350`) e — com a correção do §4 —
   `production` (`productionRouteController.ts:218-225`): **nenhum dos dois
   está** entre os 13 módulos de `AUD-DB-03`
   (`T-03_AUDIT_LOG_REPORT.md:46-58`). Inversamente, `AUD-DB-03` cobre
   módulos **sem** caso de desativação (`webhooks`, `mobileInventory`,
   `nonConformities`, `serviceOrders`) e lista `users`/`accessProfiles` como
   débito de guarda quando eles **auditam** (cegueira de camada, `:54-57`).
   Emenda de caracterização exigiria ou mutilar `AUD-ALOG-01` (perder
   `sales`/`production`) ou inflar `AUD-DB-03` para fora do seu objeto.
2. **Objetos de prova distintos ⇒ critérios de reteste distintos.**
   `AUD-DB-03` mede **amplitude**: módulo com rota de escrita × presença de
   `logAction` em qualquer ação. `AUD-ALOG-01` mede **uma classe de evento**:
   ato equivalente-a-destruição apresentado ao usuário como `DELETE`, com
   critério verificável por call site (`soft_delete` + par old/new) e prova
   dinâmica própria (`DYN-T03-07`). Fundir os dois criaria um finding cujo
   fechamento é ambíguo: um `logAction` qualquer num controller fecharia a
   régua de `AUD-DB-03` para o módulo **sem** fechar a desativação muda — e o
   reteste de VeriCore não pode ter critério de fechamento ambíguo.
3. **A decisão humana de 2026-08-16 exige granularidade.** O dono fixou
   severidade, ambiente e **prioridade de fila por exposição real** para A e
   B — itens individuais. `AUD-DB-03` é HIGH uniforme DEV/HOMOLOGAÇÃO.
   Absorver A/B num finding de amplitude subordinaria a prioridade fixada ao
   ciclo de vida do finding maior, diluindo exatamente o que o dono
   determinou (Regra 18: gate humano não se dissolve por consolidação).
4. **Formas de remediação diferentes.** `AUD-ALOG-01` tem remediação
   enumerável (instalar o padrão em call sites nomeados, A e B primeiro);
   `AUD-DB-03` pede instrumentação de módulos inteiros, inclusive ações que
   não são desativação. Um caso SanaCore por finding fica limpo em (b) e
   promíscuo em (a).

**Instrução anti-dupla-contagem ao `vericore-audit-consolidator`** (para o
placar do run não contar o mesmo risco duas vezes):

- `AUD-ALOG-01` é o **dono exclusivo** da classe "desativação lógica sem
  trilha" nos 14 call sites do §4 — inclusive nos 7 módulos que também
  constam de `AUD-DB-03`.
- `AUD-DB-03` permanece dono da **amplitude** (todas as demais ações sem
  `logAction` naqueles 13 módulos) e deve receber, na consolidação, remissão
  cruzada: *"a classe desativação lógica destes módulos é tratada e retesta
  em `AUD-ALOG-01`"*.
- O fechamento futuro de um **não implica nem pressupõe** o do outro; o
  reteste de `AUD-DB-03` não deve reexecutar `DYN-T03-07`, e vice-versa.
- Em métricas de severidade do run, os 7 módulos sobrepostos contam **uma**
  vez em cada dimensão (amplitude em `AUD-DB-03`; classe de evento em
  `AUD-ALOG-01`), nunca duas na mesma.

---

## 7. EFEITO SOBRE A REMEDIAÇÃO E O RETESTE (insumo à SanaCore e ao reteste — nada executado aqui, Regra 2)

1. **Universo da remediação: 14 call sites, não 13.** Acrescentar
   `productionRouteController.ts:218-225` — adicionar `oldValues` (estado
   anterior do roteiro) e decidir conscientemente entre manter o alias
   `inactivate` (persistido `status_change` + marcador `[inactivate]`) ou
   migrar para `soft_delete`; hoje a linha existe mas não reconstitui estado.
2. **Colisão material com `AUD-DB-04` no item B (produção real):** a PK de
   `Item` é **UUID** (`Item.ts:50-52`) e `audit_logs.entity_id` é `integer`.
   Emitir `logAction` no `itemController` **sem resolver a representação**
   reproduz o modo de falha já documentado (`22P02` engolido ou contorno
   `entityId: undefined` + UUID em `entityDescription`, como
   `engineeringController.ts:258-265`) — o log nasceria irrecuperável pelo
   índice `entity_type+entity_id`. A remediação de B deve tratar `AUD-DB-04`
   como dependência ou adotar o contorno documentado **declaradamente**.
   `Employee` é PK `INTEGER` (`Employee.ts:53`) — A não tem essa colisão.
3. **Item A: `logAction` sem ator não fecha** — mantido o que o finding já
   exige (§7 do finding): o reteste de A e B verifica `USER` e origem.
4. **Reteste de B deve exercitar as duas rotas** — `PATCH
   /api/items/:id/inactivate` **e** `DELETE /api/items/:id` (`items.ts:20-21`)
   convergem no mesmo handler; basta um call site corrigido, mas a prova
   dinâmica deve cobrir ambas as entradas.
5. **Critério de reteste estático precisa de emenda numérica e literal:**
   onde se lê *"`logAction` presente nos 13 call sites, com
   `action: 'soft_delete'`"*, leia-se **14 call sites**, admitindo como
   conformes os emissores por alias canônico com par old/new completo
   (`accessProfiles` → `deactivate`/`permission_change`) **ou** exigindo
   normalização para `soft_delete` — a escolha é da SanaCore com o
   consolidador, mas o critério publicado hoje reprovaria um dos 4 conformes
   e não veria o 14º caso. `DYN-T03-07` passa a esperar **14** linhas.
6. **A nota de esforço do finding fica reforçada:** em D e E a ausência é
   **escolha documentada** (`suppliers/README.md:146-148`,
   `clients/README.md:165-167`) — a remediação deve também corrigir esses
   READMEs, senão a guarda de docs-drift acusará ou, pior, o texto voltará a
   legitimar a omissão.
7. **`RES-T03-05` permanece aberto e ganha um dado empírico:** a enumeração
   por prefixo de use case perdeu 1 caso em 14 (§4). A varredura futura de
   `update` genérico gravando `active:false`/`status:'inactive'` por rota de
   edição deve usar vocabulário de domínio, não prefixo de classe.

---

## 8. ESTADO FINAL

- `ERP-LEGACY-001-AUD-001 / AUD-ALOG-01`: **CONFIRMED** — habilitado para
  remediação na SanaCore com as correções do §4 e insumos do §7.
- Sobreposição com `ERP-LEGACY-001-AUD-001 / AUD-DB-03`: **resolvida — (b)
  autônomo**, critério no §6, instrução ao consolidador registrada.
- Severidades fixadas pelo dono (A CRITICAL / B HIGH, produção real,
  prioridade por exposição): **registradas e tecnicamente sustentadas**;
  nenhuma recomendação de rebaixamento.
- Pendências que **não** bloqueiam a remediação: LIM-T37-01 (identidade
  `HEAD`×`AUDIT_COMMIT` em `server/`, ao evidence-controller); classificação
  de severidade do parcial novo de `production` (consolidador/director);
  emenda do critério de reteste 13→14 (consolidador).
- **Nenhum `FINDING CLOSED`, nenhum `RETEST_PASSED`, nenhum finding novo
  criado** — o 14º caso é correção de contagem dentro de `AUD-ALOG-01`, não
  finding autônomo. Nenhum artefato de outrem alterado (Regra 15).
