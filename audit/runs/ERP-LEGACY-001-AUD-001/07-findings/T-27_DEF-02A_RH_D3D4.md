# T-27 — DEF-02A · `rh` D3/D4 EXAUSTIVO (fechamento parcial do déficit DEF-02)

```
AUDIT_ID:      ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f
TRILHA:        T-27 (fieldwork complementar) — metade `rh` do DEF-02
TITULAR:       vericore-business-rule-auditor
ESCOPO:        endpoints de server/src/modules/rh/ FORA dos clusters-âncora de T-12
REGIME:        read-only. Zero conexão de banco, zero execução, zero escrita no objeto auditado (Regra 2)
ESTADO:        CONCLUÍDA COM COBERTURA DECLARADA — 30/30 no escopo próprio; resíduo nominal em §5
```

> **Nota de persistência.** O agente titular (`vericore-business-rule-auditor`) não tem
> autoridade de escrita em `audit/`. Este conteúdo foi persistido pelo orquestrador a partir
> do relatório textual do agente, **sem alteração de conteúdo** — mesmo padrão de ressalva de
> transparência já aplicado nos passos 23, 24 e na validação dos findings preliminares.

Base normativa lida: `CLAUDE.md`; `24-coverage/AUDIT_COVERAGE_EXECUTED.md` §3.1 (linha
`DEF-02`: prometido `E 132/132`, executado `A(~24/132)`, déficit **108 endpoints**, declarado
por `T-12` §5 → `RES-T12-01`); `07-findings/T-12_PESSOAS_COMPLIANCE.md` §5 (`RES-T12-01`,
texto integral). Fato de base do orquestrador (worktree idêntico ao `AUDIT_COMMIT`) aceito
como declarado, não reproduzido por mim.

## 1. Enumeração própria da superfície

Contagem por leitura integral de `server/src/modules/rh/presentation/routes/rh.ts` (159
linhas, lidas linha a linha):

| Grupo | Faixa de linhas | Endpoints | Coberto por T-12? |
|---|---|---|---|
| G2 Admissão | `rh.ts:73-81` | 9 | cluster-âncora |
| G3 Contrato de experiência | `rh.ts:84-87` | 4 | cluster-âncora |
| G4 Demissão | `rh.ts:90-99` | 9 | cluster-âncora |
| G5 Documentos do funcionário | `rh.ts:102-105` | **4** | **não** |
| G6 Férias | `rh.ts:110-119` | **8** | **não** |
| G7 Afastamentos | `rh.ts:125-129` | 5 | cluster-âncora |
| G8 Benefícios | `rh.ts:132-139` | **7** | **não** |
| G9 Treinamentos | `rh.ts:142-148` | **6** | **não** |
| G10 Frequência/Ponto | `rh.ts:153-157` | **5** | **não** |
| **Total** | | **57** | 27 em cluster / **30 no meu escopo** |

**Sem divergência de superfície:** os 57 declarados no plano conferem com a contagem própria.
Todos atrás de `router.use(authenticate)` (`rh.ts:58`) + `authorizeModule('rh',…)` por rota —
reconfirmo o D1 de T-12 por leitura própria, sem reauditar.

## 2. Matriz endpoint × D3 × D4 (30/30, exaustiva)

Legenda D4: **T** transação explícita · **G** guarda de estado · **L** lock de linha · **—**
nenhum mecanismo · **W** escrita em rota de leitura.

### G5 — Documentos do funcionário (4)

| # | Endpoint | D3 — regra, onde vive, doc × código | D4 |
|---|---|---|---|
| 1 | `GET /employee-documents` (`rh.ts:102`) | Filtro `expiring_in_days` → janela `[hoje, hoje+N]` (`SequelizeEmployeeDocumentRepository.ts:15-19`). Janelas 60/30/7 de RF-RH-029 existem só como literal ecoado em `meta.alert_windows_days` (`employeeDocumentController.ts:44,59`). Documentado: "alertas automáticos". Implementado: metadado. **DIVERGE** → `T27-L02` | leitura pura, idempotente |
| 2 | `GET /employee-documents/:id` (`:103`) | nenhuma regra; `GetEmployeeDocumentByIdUseCase` é passagem | leitura pura |
| 3 | `POST /employee-documents` (`:104`) | RF-RH-027/028. `.strict()` sem campo de texto livre bloqueia laudo clínico (`employeeDocumentValidators.ts:25-35`) — **CONFORME**, e `fitness_result` obrigatório para `aso_*` (`:32-34`). **Enum `doc_type` duplicado**: `rhEnums` (validator) e `CreateEmployeeDocumentUseCase.ts:15-20` — mesma regra em duas implementações | **—**. Upload (`employeeDocumentController.ts:81`) ocorre **antes** do insert (`:82`): falha do insert deixa arquivo órfão. Reenvio cria 2ª linha |
| 4 | `PUT /employee-documents/:id` (`:105`) | Reescreve `aptitude_result` e `valid_until` — exatamente os dois campos que o gate de ASO lê. Sem guarda de estado, sem restrição a `aso_*`, sem alçada | **—** → **`T27-H01`** |

### G6 — Férias (8)

| # | Endpoint | D3 | D4 |
|---|---|---|---|
| 5 | `GET /vacation-accrual-periods` (`:110`) | `alert_level='critical'` derivado de `status` (`vacationController.ts:50-54`) | **W** — `applyDobraIfNeeded` grava `status='vencido_dobra'` numa rota `GET` (`vacationAccrualAutoExpire.ts:14`), sem transação e **sem `logAction`**; aplicado só às linhas da página (`ListVacationAccrualPeriodsUseCase.ts:20-21`) → `T27-H03`, `T27-L01` |
| 6 | `GET /vacation-accrual-periods/:id` (`:111`) | idem | **W** (`GetVacationAccrualPeriodByIdUseCase.ts:21`) |
| 7 | `POST /…/:id/recalculate` (`:112`) | RF-RH-032 / Art. 130 CLT. A escala legal existe e é correta (`vacationRules.ts:44-51`), mas o **insumo é fixo em 0** (`RecalculateVacationAccrualPeriodUseCase.ts:35`) → **DIVERGE** → **`T27-H02`** | idempotente por construção (função pura), escrita única. Sem transação, mas sem necessidade |
| 8 | `GET /vacation-schedules/calendar` (`:115`) | Limite de equipe = constante global `0.3` (`constants.ts:25`) × documentado `Department.vacation_team_limit_percent` por departamento (`BLOCO_6_RH_API.md:756-761`, `:1445-1450`) → **DIVERGE** → `T27-M03` | leitura pura |
| 9 | `GET /vacation-schedules` (`:116`) | filtros; sem regra | leitura pura |
| 10 | `POST /vacation-schedules` (`:117`) | 6 regras em cadeia (`CreateVacationScheduleUseCase.ts:63-139`): §1º fracionamento **CONFORME** (`vacationRules.ts:106-119`); §3º DSR **CONFORME com gap legal declarado** (feriado não modelado, `vacationRules.ts:134-146`); Art. 135 aviso 30 dias **não bloqueante por decisão de requisito, divergência lei×RF declarada no próprio código** (`vacationRules.ts:169-180`) — conformidade exemplar de rastreabilidade; Art. 143 abono **CONFORME**, mas o prazo só é checado se `abono_requested_at` vier no payload (`:112`) → **omissão do campo desliga a regra**; `employee_agreement_confirmed` gravado sem regra (`:151`) → **DIVERGE** → `T27-M02`; limite de equipe → `T27-M03` | **—** → `T27-M04(b)` |
| 11 | `POST /vacation-schedules/:id/revise` (`:118`) | RF-RH-040 preservação de histórico **CONFORME** no desenho (novo registro + `superseded_by_id`) | **G** (`:72-77`) mas **3 escritas sem transação** (`:83`, `:85`, `:101`) → **`T27-M01`** |
| 12 | `POST /vacation-schedules/:id/confirm-taken` (`:119`) | Art. 137 caput: período só vira `gozado` com gozo integral (`ConfirmVacationTakenUseCase.ts:79`) — **CONFORME** | **T** (`:81-88`) + **G** (`:57`), mas leitura e aritmética **fora** da transação e **sem lock** (`:55`, `:61`, `:69`) → `T27-M05` |

### G8 — Benefícios (7)

| # | Endpoint | D3 | D4 |
|---|---|---|---|
| 13 | `GET /benefit-types` (`:132`) | — | leitura |
| 14 | `POST /benefit-types` (`:133`) | catálogo; sem unicidade de nome (baseline `:16911-16915` só PK) | **—** |
| 15 | `PUT /benefit-types/:id` (`:134`) | **`category` é editável** (`benefitValidators.ts:22`; `UpdateBenefitTypeUseCase.ts:28-29` faz spread cego) com adesões vivas; o teto de 6% só é avaliado na criação da adesão → **`T27-M06`** | **—** |
| 16 | `GET /employee-benefits` (`:137`) | — | leitura |
| 17 | `POST /employee-benefits` (`:138`) | RF-RH-052 — **6% documentado = `VT_DISCOUNT_LIMIT_PERCENT = 0.06`** (`benefitRules.ts:8,22-29`), salário lido do repositório e nunca do payload (`CreateEmployeeBenefitUseCase.ts:70`) → **CONFORMIDADE CONFIRMADA**, valor a valor. `dependents` restrito a saúde/odonto **CONFORME** | **—** → `T27-M04(a)` |
| 18 | `POST /employee-benefits/:id/cancel` (`:139`) | RF-RH-054 nunca apagar **CONFORME** (trigger `:22153`) | **G** (`CancelEmployeeBenefitUseCase.ts:32-33`). Sem `canceled_by` na linha — autor só no audit log |
| 19 | `GET /employee-benefits/monthly-report` (`:136`) | "vigente na competência" derivado sem coluna de competência — decisão registrada em **HANDOFF**, não no requisito (`GetMonthlyBenefitReportUseCase.ts:1-10`) | leitura pura |

### G9 — Treinamentos (6)

| # | Endpoint | D3 | D4 |
|---|---|---|---|
| 20 | `GET /training-courses` (`:142`) | — | leitura |
| 21 | `POST /training-courses` (`:143`) | RF-INT-RH-SST-01 — matriz SST sobrescreve validade; comparei o texto do requisito (`BLOCO_6_RH_API.md:974-982`, `:1019-1028`) com `CreateTrainingCourseUseCase.ts:49-57,70`: **coincidem caso a caso, inclusive o não-bloqueio** → **CONFORMIDADE CONFIRMADA**. Contra RF-RH-059 (`BLOCO_6_RH_REQUISITOS.md:215`, "RH não define esse valor de forma independente") → doc × doc → `T27-L03` | **—** |
| 22 | `PUT /training-courses/:id` (`:144`) | mesma regra; mas alterar `validity_months` **não recalcula** `valid_until` já gravado → `T27-M07` | **—** |
| 23 | `GET /employee-trainings/cannot-operate-report` (`:146`) | RF-RH-058 — relatório **implementado e correto** (`GetCannotOperateReportUseCase.ts:38-85`, `isTrainingExpired` em `trainingRules.ts:54-57`). Alertas D-60/D-30 do mesmo RF: **sem produtor** → `T27-L02` | leitura (N+1 por funcionário×curso) |
| 24 | `GET /employee-trainings` (`:147`) | — | leitura |
| 25 | `POST /employee-trainings` (`:148`) | RF-RH-057 `valid_until` calculado no servidor **CONFORME** (`CreateEmployeeTrainingUseCase.ts:55`). `completed_at` sem teto superior (`trainingValidators.ts:40`) → conclusão futura aceita, e o "quem não pode operar" deixa de acusar → `T27-L05`. Curso `active=false` não é barrado | **—** |

### G10 — Frequência/Ponto (5)

| # | Endpoint | D3 | D4 |
|---|---|---|---|
| 26 | `GET /attendance/monthly-summary` (`:153`) | Agrega itens de lotes **confirmados** + afastamentos. Dupla contagem por reimportação é **exceção documentada com dono** (`docs/rh/04-FREQUENCIA.md:8`, `:81-83`; migration `20260812-000045…:32-36`) → registro de conformidade com exceção declarada; sem controle compensatório → `T27-L04` | leitura pura |
| 27 | `GET /time-imports` (`:154`) | — | leitura |
| 28 | `GET /time-imports/:id` (`:155`) | — | leitura |
| 29 | `POST /time-imports` (`:156`) | Falha estrutural vira lote `rejected` auditável, não erro HTTP (`CreateTimeImportBatchUseCase.ts:67-77`) — decisão documentada e implementada | **T** explícita, com `rollbackIfPending` (`timeImportController.ts:65,86,108`). Sem chave de idempotência de arquivo (mesmo AEJ 2× = 2 lotes), mitigado pelo passo de confirmação |
| 30 | `POST /time-imports/:id/confirm` (`:157`) | Só de `validated`; recusa `rejected` e `confirmed` (`ConfirmTimeImportBatchUseCase.ts:39-50`) | **T + L + G** — `findBatchByIdForUpdate(id, transaction)` (`:36`). **Único endpoint do meu escopo com D4 pleno; é a referência interna que os demais deveriam seguir** |

## 3. Findings novos — todos `PROPOSED`

### `T27-H01` — HIGH · CONFIRMED — O gate de ASO é derrubável por `PUT` no próprio documento, em nível `operate`, sem imutabilidade no banco

`PUT /api/rh/employee-documents/:id` roda em `authorizeModule('rh','operate')` (`rh.ts:105`) e
grava `aptitude_result` e `valid_until` sem qualquer guarda
(`UpdateEmployeeDocumentUseCase.ts:17-25`; validador aceita ambos como opcionais,
`employeeDocumentValidators.ts:37-40`). Esses são **exatamente** os dois predicados do gate:
`findValidAso` filtra por `aptitude_result IN ('apto','apto_com_restricao')` e
`valid_until >= hoje` (`SequelizeEmployeeDocumentRepository.ts:43-53`), consumido por
`hasValidAso` (`asoGate.ts:20-28`), que por sua vez é o gate de conclusão de admissão, de
conclusão de demissão e do retorno de afastamento > 30 dias (RF-RH-048, NR-7).

Consequência: um ASO `inapto` vira `apto` com uma requisição de nível operacional, e o gate
que T-12 registrou como conformidade (§2, "gates de ASO … antes da escrita") passa a atestar
o oposto do laudo.

Prova de que a casa sabe fazer diferente, no mesmo escopo: `hr_employee_contracts` e
`hr_employee_job_history` têm trava de `UPDATE` **e** `DELETE` no banco
(`00_baseline_frozen.sql:22167-22177`); `hr_employee_benefits` e `hr_vacation_schedules` têm
trava de `DELETE` (`:22153-22163`). **`hr_employee_documents` não tem trigger nenhum** —
varredura própria do baseline por `trg_hr`/`hr_block_delete`/`hr_lock`: zero ocorrências para
essa tabela. Nenhum teste exercita a alteração de aptidão (varredura de `server/tests` por
`UpdateEmployeeDocument`: zero).

### `T27-H02` — HIGH · CONFIRMED — Art. 130 da CLT implementado com o insumo permanentemente zerado, e a fonte de dados que faltava **já existe** no `AUDIT_COMMIT`

RF-RH-032 (`BLOCO_6_RH_REQUISITOS.md:173`) determina `dias_direito` reduzido "usando
`faltas_injustificadas` do `TimeSheetSummary` importado (RF-RH-060)". O código faz
`const unexcusedAbsences = unexcusedAbsencesOverride ?? 0;`
(`RecalculateVacationAccrualPeriodUseCase.ts:35`) e devolve `data_gap_detected: true` sempre
que ninguém digita o número à mão. O único caminho para o valor correto é um humano informar
`unexcused_absences` no corpo (`vacationValidators.ts:37-39`, aceita 0..366 sem conferência
com dado nenhum).

O que muda em relação à ressalva original: **o Grupo 10 está implementado** — rotas em
`rh.ts:153-157`, tabelas criadas por
`server/migrations/20260812-000045-create-hr-time-imports.cjs`, e a contagem de faltas por
funcionário já é computada (`absences_from_import`, `absences_justified`,
`GetMonthlyAttendanceSummaryUseCase.ts:89-90`). O consumidor documentado da frequência para
férias (RF-RH-062 item b, `BLOCO_6_RH_REQUISITOS.md:227`) **não tem implementação**.

Duas âncoras documentais em código que afirmam o contrário do commit auditado:
`RecalculateVacationAccrualPeriodUseCase.ts:5-11` ("`HrTimeSheetSummary` … é P1 e não foi
implementado") e `vacationValidators.ts:33-35` ("só existe enquanto `HrTimeSheetSummary`
(Grupo 10, P1) não estiver implementado"). Ambas descrevem um estado anterior.

Efeito: todo período aquisitivo nasce e permanece com `entitled_days = 30`, independentemente
de faltas — a redução legal do Art. 130 II/III/IV e a perda do Art. 133 II
(`vacationRules.ts:47-50`) nunca são alcançadas pelo caminho automático. **Nenhum teste cobre
este use case** (varredura de `server/tests` por `Recalculate`: só
`marketing-campaign-use-cases.test.ts`). A função pura está testada
(`rh-vacation-rules.test.ts:14-34`) — a regra está provada em laboratório e desligada em
produção.

### `T27-H03` — HIGH · CONFIRMED — "Férias nunca vencem silenciosamente" é uma promessa cujo gatilho é alguém abrir a tela

RF-RH-034 (`BLOCO_6_RH_REQUISITOS.md:175`) exige três coisas: alertas escalonados em 6/3/1
mês, mudança **automática** para `vencido_dobra`, e alerta crítico ao RH **e ao CFO**. Estado
no `AUDIT_COMMIT`, por leitura e por prova negativa própria:

1. A transição de status ocorre **como efeito colateral de leitura** (`applyDobraIfNeeded`,
   `vacationAccrualAutoExpire.ts:12-16`), chamada apenas por
   `GetVacationAccrualPeriodByIdUseCase.ts:21` e `ListVacationAccrualPeriodsUseCase.ts:21`. Na
   listagem, só as linhas **da página corrente** (limite default 20, `:18-20`) são avaliadas.
   Período de funcionário que ninguém consultar não vence nunca.
2. O repositório declara o método feito para isso — `findAllOpen()`, documentado como "Todos
   os períodos não finais … para verificação ativa de dobra (RF-RH-034)"
   (`VacationAccrualPeriodRepository.ts:12-13`; implementado em
   `SequelizeVacationAccrualPeriodRepository.ts:45`). Varredura própria do repositório inteiro
   por `findAllOpen`: **2 ocorrências, ambas de declaração/implementação, zero call sites**.
3. `CONCESSIVE_ALERT_WINDOWS_MONTHS = [6,3,1]` (`vacationRules.ts:242`): **zero consumidores**.
4. Varredura de `server/src/modules/rh` (case-insensitive) por `notification|alerta|alert`: 15
   ocorrências, todas comentário, constante ou o campo `alert_level` do payload
   (`vacationController.ts:50-54`). **Não existe destinatário, nem RH, nem CFO.**

Combinado com a prova negativa exaustiva de T-12 (`T12-M02`: nenhum agendador em
`server/src`), o mecanismo documentado como automático não tem, em lugar nenhum, um produtor
autônomo. O efeito jurídico é o do Art. 137 caput — pagamento em dobro.

### `T27-M01` — MEDIUM · CONFIRMED — Revisão de programação de férias: três escritas, nenhuma transação, e o estado intermediário é irrecuperável por desenho

`ReviseVacationScheduleUseCase.execute` grava em três passos independentes: cancela a versão
anterior (`:83`), cria a nova via `CreateVacationScheduleUseCase` (`:85`), encadeia
`superseded_by_id` (`:101`). Não há `runInTransaction` — contraste com
`ConfirmVacationTakenUseCase.ts:81`, que o tem, no mesmo diretório.

Se o passo 2 falhar por qualquer das seis regras de negócio da criação (início na
sexta/sábado, abono acima de 1/3, limite de equipe sem justificativa, soma de dias), a
requisição retorna erro **com a fração anterior já cancelada**. A partir daí: a fração
cancelada não pode ser revisada de novo (`REVISABLE_SCHEDULE_STATUSES =
['planejado','confirmado']`, `:34`), não pode ser apagada (trigger
`trg_hr_block_delete_vacation_schedule`, baseline `:22160-22163`), e seus dias voltam ao saldo
do período sem qualquer registro do porquê — `listActiveByAccrualPeriod` exclui `cancelado`
(`SequelizeVacationScheduleRepository.ts:9,47-52`). O `logAction` da rota só roda no sucesso
(`vacationController.ts:135`), de modo que a perda não deixa rastro no audit log.

Teste existente cobre só o caminho feliz com repositório mockado
(`rh-vacation-use-cases.test.ts:256`), o que **congela o desenho não-transacional como
correto**.

### `T27-M02` — MEDIUM · CONFIRMED — "Qualquer fracionamento exige concordância do empregado" é gravado, nunca exigido

RF-RH-035 (`BLOCO_6_RH_REQUISITOS.md:176`): "qualquer fracionamento exige registro de
concordância do empregado (`employee_agreement_confirmed`)". Implementado como booleano
**opcional** no schema (`vacationValidators.ts:49`) e persistido com
`Boolean(input.employee_agreement_confirmed)` (`CreateVacationScheduleUseCase.ts:151`) — sem
nenhuma ramificação. Criar a 2ª e a 3ª fração com o campo ausente é aceito com `201`.

Varredura de `server/tests` por `employee_agreement_confirmed`: **zero**. É o mesmo padrão que
`FIND-ERP-007` documenta para o motivo de rescisão (campo aceito e sem efeito), com uma
diferença material que registro para não ser lido a mais: **aqui o campo tem coluna de destino
e é gravado** — o que falta é a regra, não a coluna. Não reaudito `FIND-ERP-007`; registro que
o padrão reaparece.

### `T27-M03` — MEDIUM · CONFIRMED — Limite de equipe em férias: valor sem fonte documental, escopo errado, e comentário de código que atribui à documentação uma autorização que ela não dá

Documentado duas vezes, de forma consistente: `BLOCO_6_RH_API.md:756-761` ("o parâmetro
configurado — `Department.vacation_team_limit_percent`, `[VERIFICAR COM RH DA EMPRESA]` valor
padrão") e `:1445-1450` ("modelado como coluna `Department.vacation_team_limit_percent` (nova,
nullable, **sem default hard-coded**) — confirmar com o `AdmDBA` se esse é o lugar certo **ou
se deve ser uma constante de código**").

Implementado como constante global única: `DEFAULT_VACATION_TEAM_LIMIT_PERCENT = 0.3`
(`constants.ts:25`), aplicada em `CreateVacationScheduleUseCase.ts:131` e
`GetVacationCalendarUseCase.ts:49,58`. Três divergências:

- **Valor:** `0.3` não aparece em nenhum artefato de requisito. O documento diz
  `[VERIFICAR COM RH DA EMPRESA]`; o código diz `0.3 // [VERIFICAR COM RH]`. **A regra tem
  valor e não tem dono** (Regras 6, 7, 17).
- **Escopo:** documentado por departamento; implementado global.
- **Autorização:** `constants.ts:20-23` afirma que "constante de código é a alternativa **já
  prevista** em `BLOCO_6_RH_API.md` §21 item 3". A §21 item 3, relida acima, apresenta a
  constante como **pergunta aberta a confirmar com o `AdmDBA`**, não como alternativa
  concedida. O código cita o documento como aval de uma decisão que o documento deixa em
  aberto.

Sem BR-ID em `BR_CATALOG.md` (a série `BR-RH-D01…D06`, `:286-291`, não cobre férias).

### `T27-M04` — MEDIUM · CONFIRMED — Três criações com `check-then-act` sem transação, sem lock e sem UNIQUE, em tabelas que proíbem `DELETE`

Padrão comum: ler para decidir, escrever depois, fora de qualquer transação.

- **(a) `POST /employee-benefits`** — `findActiveByEmployeeAndType` → `ConflictError` →
  `create` (`CreateEmployeeBenefitUseCase.ts:63-85`). O baseline tem só PK em
  `hr_employee_benefits` (`:16927-16931`) e três índices **não-únicos** (`:19325-19342`). Duplo
  clique/retry cria duas adesões ativas do mesmo par, e o
  `trg_hr_block_delete_employee_benefit` (`:22153-22156`) impede remover a sobra — o relatório
  mensal para folha e centro de custo (`GetMonthlyBenefitReportUseCase.ts:39-53`) passa a somar
  o custo duas vezes.
- **(b) `POST /vacation-schedules`** — `fraction_number = existingFractions.length + 1`
  (`CreateVacationScheduleUseCase.ts:141`) calculado fora de transação; não há
  `UNIQUE(accrual_period_id, fraction_number)`; o único guarda no banco é
  `CHECK (fraction_number >= 1 AND <= 3)` (`:6500`), que não impede duas frações nº 2 nem a
  soma de dias ultrapassar `entitled_days`. Linha também indelével (`:22160`).
- **(c) `POST /employee-trainings`** — nenhuma verificação de duplicidade, nem no código, nem
  no schema (`:16959-16963` só PK).

O contraste que descaracteriza "estilo da casa" está **no mesmo módulo**:
`ConfirmTimeImportBatchUseCase.ts:36` usa `findBatchByIdForUpdate(id, transaction)`.

### `T27-M05` — MEDIUM · CONFIRMED — Confirmação de gozo: transação existe, mas a decisão é tomada fora dela e sem lock

`ConfirmVacationTakenUseCase` lê fração (`:55`), lê período (`:61`), calcula `totalTaken` e
testa `EXCEEDS_ACCRUAL_DAYS` (`:69-75`) — tudo antes de abrir `runInTransaction` (`:81`).
Nenhuma das leituras usa lock. Duas confirmações concorrentes de frações distintas do mesmo
período leem o mesmo `days_taken` e cada uma grava `days_taken = valor_lido + n`: a segunda
sobrescreve a primeira, o período fica com dias gozados a menos e a passagem para `gozado`
(`:79,85`) não ocorre — o período permanece exposto à dobra do Art. 137 com as férias
efetivamente gozadas.

### `T27-M06` — MEDIUM · CONFIRMED — Categoria de benefício é editável com adesões vivas, e o teto de 6% só é avaliado uma vez

`PUT /benefit-types/:id` aceita `category` (`benefitValidators.ts:22`) e o use case aplica
spread cego do payload (`UpdateBenefitTypeUseCase.ts:28-29`), sem checar adesões existentes. O
teto de VT é avaliado **apenas na criação da adesão** e **apenas se a categoria já for `vt`**
(`CreateEmployeeBenefitUseCase.ts:68-74`). Logo: adesões criadas sob categoria `vr`/`outros`
com `discount_value` acima de 6% do salário passam a ser VT retroativamente, sem revalidação,
sem alerta e sem trilha — e o relatório enviado ao provedor de folha
(`GetMonthlyBenefitReportUseCase.ts:55-63`) carrega o `discount_value` como está.

### `T27-M07` — MEDIUM · CONFIRMED — Validade de treinamento normativo é congelada no momento da conclusão; mudança na matriz SST não alcança o que já foi emitido

`valid_until` é calculado uma vez, na criação (`CreateEmployeeTrainingUseCase.ts:55` →
`trainingRules.ts:17-27`). `PUT /training-courses/:id` reaplica a validade da matriz SST **ao
curso** (`UpdateTrainingCourseUseCase`, RF-INT-RH-SST-01), mas nada recalcula os
`hr_employee_trainings` já gravados — não há job (T-12 §T12-M02) nem endpoint de recálculo. Se
a SST reduzir a periodicidade de uma NR, o relatório "quem não pode operar"
(`GetCannotOperateReportUseCase.ts:71`) continua considerando válidos certificados que, pela
norma vigente, venceram. Sem BR-ID.

### LOW

| ID | Achado | Âncora |
|---|---|---|
| `T27-L01` | `GET` que escreve: as duas rotas de período aquisitivo alteram `status` sem transação e **sem `logAction`**, enquanto toda outra mudança de status do módulo é auditada | `vacationAccrualAutoExpire.ts:14` × `vacationController.ts:57-75` (sem `logAction`) × `:83-87` (com) |
| `T27-L02` | Janelas de alerta como literal decorativo: 60/30/7 devolvidas em `meta` e nada mais; D-60/D-30 de treinamento sem qualquer implementação | `employeeDocumentController.ts:44,59`; RF-RH-029 (`REQUISITOS:165`); RF-RH-058 (`:214`) |
| `T27-L03` | Mesma regra com dois enunciados em artefatos versionados: RF-RH-059 diz que o RH **não** define validade de NR de forma independente (`REQUISITOS:215`); RF-INT-RH-SST-01 permite exatamente isso, com `warning`, quando o `nr_code` não está na matriz (`API:1024-1028`). RF-RH-059 não foi emendado. Sem BR-ID em nenhuma das duas | `BLOCO_6_RH_REQUISITOS.md:215` × `BLOCO_6_RH_API.md:974-982,1019-1028` × `CreateTrainingCourseUseCase.ts:49-57,70` |
| `T27-L04` | Exceção documentada **com dono** (dupla contagem por reimportação, `04-FREQUENCIA.md:8,81-83`) porém **sem controle compensatório**: `ConfirmTimeImportBatchUseCase.ts:35-56` não verifica se já existe lote `confirmed` com competência sobreposta, e nenhum aviso é devolvido | `20260812-000045-create-hr-time-imports.cjs:32-36` |
| `T27-L05` | `completed_at` de treinamento sem teto superior (`dateOnly`, sem `.max`) e curso inativo não barrado: conclusão datada no futuro produz `valid_until` futuro e **remove** o funcionário do relatório "quem não pode operar" | `trainingValidators.ts:40` × `CreateEmployeeTrainingUseCase.ts:52-55` |
| `T27-L06` | `findValidAso` aceita `valid_until IS NULL` — ASO sem data de validade satisfaz o gate para sempre, contra RF-RH-028 ("aptidão **e validade**") | `SequelizeEmployeeDocumentRepository.ts:50` × `REQUISITOS:164` |
| `T27-L07` | Enum de `doc_type` implementado duas vezes (validator via `rhEnums` e lista literal no use case) — mesma regra, duas fontes, sem teste que force a igualdade | `employeeDocumentValidators.ts:27` × `CreateEmployeeDocumentUseCase.ts:15-19` |
| `T27-L08` | Cobertura de teste por regra crítica no meu escopo: **sem teste** para `RecalculateVacationAccrualPeriodUseCase` (RF-RH-032), para os 4 use cases de `employee-documents` (só o validator é testado, `rh-validators.test.ts:113-140`), para `CancelEmployeeBenefitUseCase`, `GetMonthlyBenefitReportUseCase`, `UpdateBenefitTypeUseCase` e `ListEmployeeBenefitsUseCase`. Nenhum teste de concorrência/idempotência em nenhum dos 30 endpoints | varredura própria de `server/tests` |

### Conformidades registradas (para o relatório não ser lido como uniformemente negativo)

- **RF-RH-052 — 6%**: documentado × implementado **coincidem no valor e na fonte do salário**
  (`benefitRules.ts:8` × `REQUISITOS:203`), com o salário lido do repositório e nunca do
  payload. É o exemplo mais limpo de conformidade de valor no meu escopo.
- **Art. 134 §1º, §3º, Art. 143 e Art. 137**: implementados em funções puras com citação legal
  verificada na fonte pelo próprio autor, incluindo a **correção documentada** de §2º → §3º
  (`vacationRules.ts:126-132`) e a **divergência lei × requisito declarada e não escondida** no
  aviso de 30 dias (`:169-180`). Todos com teste unitário determinístico
  (`rh-vacation-rules.test.ts`, `rh-vacation-use-cases.test.ts`).
- **RF-INT-RH-SST-01**: contrato e código coincidem caso a caso, com teste para os 4 ramos
  (`rh-block6-extension-use-cases.test.ts:346-378`).
- **`POST /time-imports/:id/confirm`** é o padrão D4 correto do módulo: transação +
  `FOR UPDATE` + guarda de estado.
- **RF-RH-028 / LGPD art. 5º II**: o `.strict()` sem campo de texto livre é um desenho
  deliberado e efetivo contra laudo clínico (`employeeDocumentValidators.ts:5-12`).

## 4. Divergências registradas (Regra 20 — não conciliadas)

| ID | Divergência | Medição própria |
|---|---|---|
| `DIV-T27-01` | T-12 §5 declara `rh` com "**5 validadores Zod**". Glob próprio de `rh/presentation/validators/`: **10 arquivos** — 9 módulos de schema (`admission`, `employeeContract`, `termination`, `employeeDocument`, `vacation`, `absence`, `benefit`, `timeImport`, `training`) + `rhEnums.ts`. A cobertura de borda de `rh` é maior do que T-12 registrou | não corrijo T-12; registro as duas contagens |
| `DIV-T27-02` | T-12 §5 declara D3 `A ~14/57` cobrindo "contrato, demissão, admissão, afastamento". A população nominal desses quatro clusters é **27** (`rh.ts:73-99`, `:125-129`). Restam **≈13 endpoints dentro dos clusters-âncora** sem atribuição de profundidade — nem T-12 os reivindica, nem eu os cobri | escalo ao director |
| `DIV-T27-03` | RF-RH-060 documenta a entidade `TimeSheetSummary` com campo `faltas_injustificadas`, grão mensal (`REQUISITOS:225`). O implementado é `hr_time_import_batches`/`hr_time_import_items` (AEJ), grão **diário**, com booleanos `absence`/`absence_justified` — entidade, grão e campo diferentes do requisito, sem emenda do RF | registro; a decisão de qual versão vale é humana |
| `DIV-T27-04` | O total de 57 endpoints do plano **confere** com a contagem própria — registro simétrico, para que a ausência de divergência também fique provada | |

## 5. Declaração de cobertura alcançada

**Alcançado: 30/30 endpoints (100% do escopo próprio) com veredito individual em D3 e D4, com
âncora arquivo:linha nos dois lados de cada comparação.** São os Grupos 5, 6, 8, 9 e 10 — a
totalidade dos endpoints de `rh` fora dos clusters-âncora de T-12. D3 foi feito por leitura
integral de todos os use cases, serviços de domínio (`vacationRules`, `benefitRules`,
`trainingRules`, `attendanceSummaryRules`, `vacationAccrualAutoExpire`, `asoGate`) e
validadores do escopo, confrontados linha a linha com `BLOCO_6_RH_REQUISITOS.md` e
`BLOCO_6_RH_API.md`. D4 foi feito por leitura de controller + use case + repositório + schema
declarado (baseline **e** a migration pós-freeze `20260812-000045`, conforme `OBS-R3C-01`).

**Efeito sobre `DEF-02`:** o déficit era de **108 endpoints** (`rh` + `sst`). Fecho **30**. O
saldo é de **78**, dos quais ≈65 em `sst` (trilha paralela) e **≈13 dentro dos clusters-âncora
de `rh`** (`DIV-T27-02`).

**Fora do escopo, declarado item a item:**

- Os 27 endpoints dos clusters contrato/demissão/admissão/afastamento — por instrução expressa
  do mandato. Li `asoGate.ts` e as travas de banco apenas na medida em que são **consumidores**
  do `PUT` do meu escopo (`T27-H01`); não reauditei nenhum dos 27.
- `server/src/modules/sst/` — não invadido, nenhum arquivo aberto.
- `client/` — não auditado nesta trilha; o front de férias/benefícios/treinamentos pode conter
  regra duplicada não medida aqui.
- D1, D2, D5, D6, D7, D9, D10 — só tocados quando load-bearing para D3/D4 (audit log ausente em
  `T27-L01`, ausência de UNIQUE em `T27-M04`, cobertura de teste em `T27-L08`).
- **Nenhuma evidência dinâmica.** Zero conexão de banco. Os achados de concorrência
  (`T27-M04`, `T27-M05`) são provas de **ausência de mecanismo** — a leitura estática as
  demonstra; o **efeito observado** não está demonstrado e permanece sob `CONFLITO-G3×G4`.

**Pedidos DYN sugeridos** (para a fila do `vericore-audit-verification-runner`, banco de teste,
dados sintéticos): `DYN-27.1` `PUT /employee-documents/:id` virando `inapto`→`apto` e em
seguida conclusão de admissão (fecha `T27-H01`); `DYN-27.2`
`POST /vacation-accrual-periods/:id/recalculate` sem corpo em período com faltas importadas
confirmadas, conferindo `entitled_days` (fecha `T27-H02`); `DYN-27.3` período com
`concessive_end` no passado, nunca lido, conferido direto na tabela (fecha `T27-H03`);
`DYN-27.4` duas chamadas concorrentes a `POST /employee-benefits` do mesmo par (fecha
`T27-M04a`); `DYN-27.5` revisão de férias cuja nova fração viola o §3º, conferindo o estado da
fração anterior (fecha `T27-M01`).

## 6. Encaminhamentos

- `T27-H01`, `T27-H02`, `T27-H03` → **`vericore-finding-validator`** antes de qualquer
  remediação (Regra 22). Nenhum é confirmado nem fechado por mim; não declaro `AUDIT_PASSED`,
  `RETEST_PASSED` nem `FINDING CLOSED` (Regra 4).
- A **T-14 / catálogo de BRs**: nove regras com valor legal ou de política implementadas **sem
  BR-ID** no meu escopo — escala do Art. 130, fracionamento §1º, vedação §3º, teto de abono e
  prazo do §1º do Art. 143, dobra do Art. 137, 6% de VT, limite de equipe 0.3, validade de NR
  pela matriz SST. Reforça `T12-M09` com população nova.
- A **`vericore-traceability-auditor`**: RF-RH-029, RF-RH-034 (parcial), RF-RH-035 (parcial),
  RF-RH-038 (sem qualquer implementação localizada), RF-RH-058 (alertas), RF-RH-060/062
  (entidade divergente e consumidor ausente).
- Ao **director**: `DIV-T27-01` a `DIV-T27-03`, e a decisão sobre qual versão vale em `T27-M03`
  e `T27-L03` — divergência doc × código e doc × doc não se resolve por auditoria
  (Regras 20-21).
- **Persistência:** o agente titular não gravou em `audit/`, `src/`, `product/`, `tests/`,
  `requirements/` nem `architecture/`. Este conteúdo foi persistido pelo orquestrador **sem
  alteração de conteúdo**.
