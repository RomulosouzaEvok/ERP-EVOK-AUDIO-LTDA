# T-28 — VALIDAÇÃO ADVERSARIAL (Regra 22) dos 5 HIGH de T-27 — bloco Jurídico + RH

```
AUDIT_ID:      ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f
TRILHA:        T-28 — validação adversarial de findings PROPOSED
PRODUZIDO POR: vericore-finding-validator
DATA:          2026-08-16
ENTRADA:       07-findings/T-27_DEF-01_JURIDICO_D3D4.md (F01, F07)
               07-findings/T-27_DEF-02A_RH_D3D4.md (H01, H02, H03)
MÉTODO:        READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT
NATUREZA:      estática, read-only. Zero conexão de banco, zero execução de teste,
               zero escrita no objeto auditado (Regra 2). NÃO declara AUDIT_PASSED,
               RETEST_PASSED nem FINDING CLOSED (Regra 4). Nenhum finding novo criado
               (Regra 22) — achados novos vão como observação não promovida.
BASE:          fato do orquestrador — `git diff --stat c1311a6..HEAD -- server/src
               client/src server/migrations server/database` vazio. Fato dele, não meu;
               li a árvore de trabalho sob essa cadeia de custódia declarada.
STATUS:        CONCLUÍDA — 5/5 com veredito individual
```

**Toda âncora `arquivo:linha` deste documento foi lida por mim nesta sessão.** Nenhum número
foi copiado dos relatórios de origem sem releitura direta do arquivo citado.

## 0. Resolução da colisão de ID (tratada antes de qualquer análise)

`T27-F01` existe em Jurídico e em SST com conteúdos diferentes. Adoto IDs qualificados por
trilha. **Mapeamento oficial deste bloco:**

| ID qualificado | ID antigo | Trilha de origem | Arquivo de origem |
|---|---|---|---|
| `T27-JUR-F01` | `T27-F01` | T-27 DEF-01 Jurídico | `07-findings/T-27_DEF-01_JURIDICO_D3D4.md` §3 |
| `T27-JUR-F07` | `T27-F07` | T-27 DEF-01 Jurídico | `07-findings/T-27_DEF-01_JURIDICO_D3D4.md` §3 |
| `T27-RH-H01` | `T27-H01` | T-27 DEF-02A RH | `07-findings/T-27_DEF-02A_RH_D3D4.md` §3 |
| `T27-RH-H02` | `T27-H02` | T-27 DEF-02A RH | `07-findings/T-27_DEF-02A_RH_D3D4.md` §3 |
| `T27-RH-H03` | `T27-H03` | T-27 DEF-02A RH | `07-findings/T-27_DEF-02A_RH_D3D4.md` §3 |

**Alerta ao `vericore-audit-consolidator` (não é finding, é higiene de inventário):** os
não-HIGH das mesmas trilhas herdam a mesma colisão (`T27-F02…F10` do Jurídico ×
`T27-M01…M07`/`T27-L01…L08` do RH × a série de SST) e há **duas séries `DIV-T27-01…04`
distintas**, uma em cada relatório, com conteúdos diferentes. A requalificação dos não-HIGH é
do consolidator; registro a colisão para que não seja descoberta tarde.

## 1. Refutação estrutural comum — verificada por mim, não herdada

Os cinco findings dependem, em conjunto, de três negativas. Testei as três diretamente antes
de olhar finding a finding, porque uma única refutação aqui derrubaria vários de uma vez.

### 1.1 Não existe trigger de imutabilidade nas tabelas envolvidas

Varredura própria de `server/database/postgresql/00_baseline_frozen.sql` por
`CREATE TRIGGER`: **13 triggers, nominalmente**, em `hr_employee_benefits` (`:22156`),
`hr_vacation_schedules` (`:22163`), `hr_employee_contracts` (`:22170`),
`hr_employee_job_history` (`:22177`), `hr_vacation_accrual_periods` (`:22184`),
`jur_contract_addendums` (`:22191`), `jur_legal_case_deadlines` (`:22198`),
`jur_legal_case_events` (`:22205`), `jur_legal_case_provisions` (`:22212`),
`sst_eventos_esocial` (`:22219`), `sst_acidentes` (`:22226`), `sst_cats` (`:22233`),
`sst_entregas_epi` (`:22240`).

**Nenhuma sobre** `hr_employee_documents`, `jur_lgpd_data_subject_requests`,
`jur_lgpd_incidents`, `jur_proxies`, `jur_intellectual_property`, `jur_legal_alerts`,
`jur_lgpd_processing_activities`.

Como instruído, **não concluí ausência pelo baseline** (`OBS-R3C-01`: freeze entre as
migrations `…-000032` e `…-000039`). Varredura própria de `server/migrations/2026081*`
(19 arquivos) por `TRIGGER|hr_employee_documents|jur_lgpd|jur_proxies|hr_vacation|
jur_legal_alerts`, case-insensitive: **uma única ocorrência**, e é um comentário que confirma
a negativa em vez de refutá-la —
`20260812-000046-create-directorate-governance.cjs:21` ("Nada na CAMADA DE BANCO impede um
`UPDATE` direto (não há trigger)"). Todas as migrations que criam trigger no repositório são
pré-freeze (série `2026080x`).

`hr_employee_documents` confirmada nua: `CREATE TABLE` em `00_baseline_frozen.sql:5914`,
PK em `:16946`, três índices (`:19370`, `:19377`, `:19384`), duas FKs (`:23799`, `:23807`).
**Zero CHECK, zero trigger.**

**Refutação por banco: FALHOU.** Vale para os cinco findings.

### 1.2 Os CHECKs do Jurídico são predicados de estado final, não de transição — confirmo

Reli os três e avaliei a fórmula, não o nome:

- `ck_jur_lgpd_dsr_in_progress_requires_verification` (`00_baseline_frozen.sql:8908`):
  `status <> ALL (ARRAY['in_progress','answered']) OR identity_verified = true`.
  Numa regressão `answered → in_progress` o `NEW.status` é `in_progress` e
  `identity_verified` já é `true` — **o predicado é satisfeito**. Não olha `OLD`.
- `ck_jur_lgpd_incidents_closed_requires_decision` (`:8982`): `status <> 'closed' OR (...)`.
  Em `closed → investigating` o antecedente é falso, **satisfeito vacuamente**.
- `ck_jur_proxies_revoked_requires_data` (`:9123`): `status <> 'revoked' OR (revoked_at IS
  NOT NULL AND revocation_communication IS NOT NULL)`. Revogar de novo satisfaz e
  **sobrescreve**.

Nenhum CHECK do Postgres pode ler `OLD` — só trigger pode, e não há (§1.1). **A distinção
afirmada por T-27 está correta; verificada por mim na fórmula.**

### 1.3 Não existe middleware, interceptor ou guarda transversal de estado

`server/src/middlewares/` tem exatamente 6 arquivos: `imageUpload.ts`, `auth.ts`,
`requestContext.ts`, `errorHandler.ts`, `authorizeSelfOrModule.ts`, `authorizeAnyModule.ts`.
Nenhum de máquina de estados, imutabilidade ou versionamento. O gate do Jurídico é
`router.use(authorizeModule('juridico','operate'))` em
`server/src/modules/juridico/presentation/routes/juridico.ts:83` — autorização, não estado.

**Refutação por camada transversal: FALHOU.**

## 2. Vereditos

### `T27-JUR-F01` — **CONFIRMED** · severidade **HIGH sustentada** · confiança CONFIRMED

**Refutação tentada e falha.** Li os onze pontos de escrita; nenhum lê o estado anterior para
decidir. Verificados por mim, um a um:

| Escrita | Âncora relida | Guarda de estado anterior? |
|---|---|---|
| `DecideIncidentUseCase.ts` | `:59-63` (`update` com `status:'investigating'`) | não — `findById` em `:48` só valida existência |
| `RejectDataSubjectRequestUseCase.ts` | `:31-34` | não — `findById` em `:28` só valida existência |
| `ResolveDataSubjectRequestUseCase.ts` | `:38-42` | só `identity_verified` (`:31`), não status |
| `VerifyIdentityUseCase.ts` | `:40-45` | não — só `input.identity_verified !== true` (`:33`) |
| `RevokeProxyUseCase.ts` | `:35-39` | não — só `communication_record` (`:28`) |
| `CloseIncidentUseCase.ts` | `:37` | precondição de **campo** (`:30`), não de status |
| `AcknowledgeAlertUseCase.ts` | `:28` | não |
| `UpdateIpAssetUseCase.ts` | `:49` (`status` na whitelist), `update` em `:52` | não |
| `ReviewProcessingActivityUseCase.ts` | citado `:31-34` — não reli | — |
| `ListProxiesUseCase.ts` / `GetProxyByIdUseCase.ts` | citados `:29`/`:28` — não reli | — |

Duas linhas da tabela não foram reabertas por mim porque não são load-bearing para o
veredito: os oito verificados já bastam, e os dois restantes são o eixo "escrita em GET", que
tem finding próprio de outra severidade. **Registro a limitação em vez de importar a âncora
alheia como se fosse minha.**

**Achado próprio que agrava e que T-27 não explorou — nível de privilégio da regressão.**
`POST .../reject` (`juridico.ts:166`), `POST /incidents/:id/decision` (`:172`) e
`POST /incidents/:id/close` (`:173`) exigem `authorizeModule('juridico','approve')`. Mas
`POST .../:id/verify-identity` (`:164`) **não tem override** e cai no gate base `operate`
(`:83`). Logo a regressão mais destrutiva do conjunto — `answered → in_progress`, que apaga o
estado de "respondida no prazo" de uma solicitação de titular — **é alcançável no menor nível
de privilégio do módulo**. Isso sustenta HIGH por si só.

**Correção factual que imponho ao texto do finding (rebaixa a retórica, não a severidade).**
T-27 escreve "sem trilha de reversão". **Não é exato.** `lgpdController.ts:134` emite
`logAction(req, { action: 'verify_identity', entityType: 'JurLgpdDataSubjectRequest',
entityId })`; `:147` e `:159` fazem o mesmo para `resolve` e `reject`, estes com
`newValues: req.body`. Existe trilha **do evento e do autor**; o que não existe é o **valor
anterior** (`oldValues`), que é precisamente o objeto de `T27-F10` (INFO). A remediação deve
ser dimensionada por "sem valores anteriores", não por "sem trilha".

**Severidade HIGH sustentada** — não por gravidade retórica, mas porque o registro
sobrescrevível é a evidência da própria empresa perante a ANPD (LGPD arts. 18/19 II), a
sobrescrita é alcançável em `operate`, e não há camada compensatória em nenhum dos três
lugares onde ela poderia estar (§1.1, §1.2, §1.3).

**Limite de confiança que herdo e mantenho:** CONFIRMED quanto à **ausência da verificação no
código** — prova de ausência, exaustiva sobre os arquivos que reli. Efeito em execução **não
observado**; `DYN-T27-01` permanece aberto e é o teste de reteste natural. A confiança
CONFIRMED aqui é sobre o estado do código, não sobre o comportamento observado do sistema —
distinção que a SanaCore deve carregar.

### `T27-JUR-F07` — **CONFIRMED** · severidade **HIGH sustentada, com base estreitada** · confiança CONFIRMED

**Prova negativa reproduzida por mim.** Grep próprio de
`alertRepository\.create|JurLegalAlert\.create|LegalAlertRepository` em **todo**
`server/src`. Pontos de **criação** de alerta: `CreateProxyUseCase.ts:66`,
`CreateIpAssetUseCase.ts:73` e `:82`, `ActivateContractUseCase.ts:112/124/137`. **Nenhum
LGPD.** `lgpdController.ts` sequer importa `SequelizeLegalAlertRepository` — os únicos
controllers que o instanciam são `proxyController.ts:20`, `ipAssetController.ts:25`,
`contractController.ts:34` e `alertController.ts:16`. **Não é bug de condição: é ausência de
cadeia de dependência.** Confirmo o diagnóstico de T-27.

**Contrato relido na fonte:** `docs/business/BLOCO_3_JUR_API.md:852-853` — "Resposta (`201`)
inclui `due_date` calculada (`received_at + 15 dias`, RF-JUR-037) **e alertas D-5/D-1 já
agendados**". `docs/business/BLOCO_3_JUR_REQUISITOS.md:110` (RF-JUR-038, P1) e `:113`
(RF-JUR-041, "recebe os alertas de solicitações de titular **e de incidentes**"). A promessa
documental existe nos três lugares citados.

**Refutação parcial que ENCONTREI e que o autor não tinha — controle detectivo real e
alcançável (metade DSR).** O painel `pending-critical` não é só código morto:
`SequelizeLgpdRequestRepository.ts:51-63` implementa a janela D-5 (`limitDate = hoje+5`,
`status NOT IN ('answered','rejected_justified')`), e ele **chega ao usuário** —
`client/src/api/juridico.ts:1000-1002` expõe `listPendingCriticalDataSubjectRequests()` e
`client/src/pages/juridico/LgpdTab.tsx:89` a consome. **T-27 declarou que `client/` não foi
auditado e não presumiu; eu verifiquei e o controle existe.**

**Por que a refutação não fecha o finding, ainda assim** — três razões, todas relidas:
1. **É opt-in, não default.** `LgpdTab.tsx:77` inicia `criticalOnly` em `false` e a query
   crítica tem `enabled: criticalOnly` (`:90`). O painel de vencimento **não é buscado** na
   abertura da tela: exige que o operador ligue o filtro. Um controle detectivo que depende
   de alguém lembrar de ligá-lo não substitui alerta agendado — cobre D-5 "sob demanda", que
   é o que RNF-JUR-05 admite *"se não houver rotina agendada"*, e nada mais.
2. **Não há nada equivalente para incidentes.** Além da ausência de código, há **ausência
   estrutural**: o enum `enum_jur_legal_alerts_origin_type`
   (`00_baseline_frozen.sql:1303-1309`) tem `contract`, `proxy`, `intellectual_property`,
   `lgpd_request`, `legal_case_deadline` — **`lgpd_incident` não existe**. O schema **previu**
   o alerta de solicitação (`lgpd_request`) e **nunca previu** o de incidente. E
   `jur_lgpd_incidents` (`:8965-8982`) não tem coluna de prazo. **O prazo do art. 48 da LGPD
   não é controlado por mecanismo nenhum, em nenhuma camada.**
3. **Não há agendador.** Varredura própria de `server/src` por
   `node-cron|setInterval|node-schedule|bull|scheduler`: nenhuma ocorrência relevante (só
   colisões de nome com `CleaningSchedule*` de `facilities`).

**Severidade HIGH sustentada, com a base explicitamente estreitada:** o que sustenta HIGH é a
**metade incidentes** — obrigação legal com prazo, zero controle preventivo, zero detectivo,
zero suporte de schema. A metade DSR tem controle detectivo real, porém opt-in.
**Declaro para a SanaCore:** se a remediação tratar apenas a metade DSR, o resíduo
**continua HIGH**; se tratasse apenas incidentes, o resíduo DSR cairia para MEDIUM.
Registro também que **não fundo** com `FIND-ERP-006`, pelo motivo dado em T-27 e que confirmo:
o 006 é sobre o desfecho de `resolve` e a ausência de agendador; este é sobre o alerta
**nunca criado como registro** e alcança incidentes, fora do 006. **Não é DUPLICATE.**

### `T27-RH-H01` — **CONFIRMED quanto ao mecanismo** · severidade **HIGH sustentada** · **ESCOPO CORRIGIDO (refutação parcial procedente)**

**Cadeia verificada integralmente por leitura própria:**
- `server/src/modules/rh/presentation/routes/rh.ts:105` —
  `router.put('/employee-documents/:id', authorizeModule('rh','operate'), rhFileUpload.single('file'), employeeDocumentController.update)`. **Nível `operate` confirmado.**
- `employeeDocumentValidators.ts:37-40` — `updateEmployeeDocumentSchema` aceita
  `valid_until` e `fitness_result` como **opcionais e nullable**, sob `.strict()`.
- `UpdateEmployeeDocumentUseCase.ts:19-21` — `if (input.valid_until !== undefined)
  updateData.valid_until = ...; if (input.fitness_result !== undefined)
  updateData.aptitude_result = input.fitness_result;`. **Nenhuma guarda**: não checa
  `doc_type`, não checa estado, não checa alçada.
- `SequelizeEmployeeDocumentRepository.ts:36-41` — `record.update(data)` sem `fields`.
- `SequelizeEmployeeDocumentRepository.ts:43-54` (`findValidAso`) — filtra
  `aptitude_result IN ('apto','apto_com_restricao')` (`:49`) e
  `valid_until IS NULL OR valid_until >= today` (`:50`). **São exatamente os dois campos que o
  `PUT` reescreve.** `asoGate.ts:20-28` é passagem fina sobre esse `findOne`.

**REFUTAÇÃO PARCIAL PROCEDENTE — o finding erra o raio de alcance.** T-27 afirma que o gate
atingido "é o gate de conclusão de admissão, de conclusão de demissão e do retorno de
afastamento > 30 dias". **A conclusão de admissão não passa por aqui.** Li
`ConcludeAdmissionProcessUseCase.ts:111-127`: o comentário `:111-118` declara explicitamente
que, como o `employee_id` ainda não existe na transação de admissão, o gate usa o snapshot do
**próprio `AdmissionProcess`** — e o código em `:119-127` testa `process.aso_result` e
`process.aso_valid_until`, **não** `hasValidAso`/`HrEmployeeDocument`. Grep próprio por
`hasValidAso` em `server/src` retorna **dois call sites reais**:
`ConcludeTerminationProcessUseCase.ts:71` (`aso_demissional`) e
`ReturnFromAbsenceUseCase.ts:96` (`aso_retorno`, sob `requiresReturnAso`, `:95`).

**Consequência da correção:** o raio é de **2 gates, não 3**. Retirem-se as afirmações sobre
conclusão de admissão do texto do finding antes de remediar.

**Severidade HIGH mesmo assim, e explico por que a correção não rebaixa.** O gate que
sobrevive intacto é o do **retorno de afastamento > 30 dias** (`ReturnFromAbsenceUseCase.ts:95-102`,
`RETURN_ASO_REQUIRED`, RF-RH-048/NR-7): um `PUT` de nível `operate` transformando `inapto` em
`apto` libera o retorno ao trabalho de quem foi laudado inapto. Não é risco documental — é
risco à integridade física do trabalhador, com responsabilidade da empresa. Some-se: sem
trigger (§1.1), sem CHECK (§1.1), sem middleware (§1.3), e **sem teste** — grep próprio por
`UpdateEmployeeDocument` em `server/tests`: zero. HIGH sustentada.

**Observação adjacente, NÃO promovida a finding (Regra: não crio finding novo).**
`findValidAso` também não filtra `origin` (`SequelizeEmployeeDocumentRepository.ts:45-53`) —
um documento de `origin='rh'` satisfaz o gate igual a um de `origin='sst'`. Combinado com
`T27-L07`/`T27-L06` (que já cobre o `valid_until IS NULL` na mesma função, `:50`), pertence à
mesma família e deve ser anexado à instrução de remediação de `T27-RH-H01`, não contado como
achado independente.

### `T27-RH-H02` — **CONFIRMED** · severidade **HIGH sustentada** · confiança CONFIRMED

**Verificado por leitura própria, linha a linha:**
- `RecalculateVacationAccrualPeriodUseCase.ts:35` —
  `const unexcusedAbsences = unexcusedAbsencesOverride ?? 0;` (precedido do
  `TODO(passada 2)` em `:33-34`).
- `:36` — `calculateEntitledDays(unexcusedAbsences)`; `:38` grava
  `{ unexcused_absences, entitled_days }`; `:39` devolve
  `data_gap_detected: unexcusedAbsencesOverride === undefined`.
- `vacationRules.ts:44-51` — a escala legal **está correta e completa** (Art. 130 I/II/III/IV
  e Art. 133 II → 30/24/18/12/0). **A regra não tem defeito; o insumo é que é constante.**
- Único caminho para valor não-zero: `vacationValidators.ts:38` —
  `unexcused_absences: z.coerce.number().int().min(0).max(366).optional()`, repassado em
  `vacationController.ts:82` como `unexcusedAbsencesOverride`. **Digitação humana, sem
  conferência contra dado nenhum.**

**Tentativa de refutação por "outro produtor do valor": FALHOU.** Grep próprio por
`unexcused_absences|entitled_days` em **todo** `server/src`, resultado completo: o model
(`HrVacationAccrualPeriod.ts:21-22`, defaults `0` e **`30`**), a abertura do período
(`OpenVacationAccrualPeriodUseCase.ts:49-50`, grava `0`/`30` fixos), o próprio
`Recalculate` (`:38`), o validador/controller acima, e **apenas consumidores**:
`CreateVacationScheduleUseCase.ts:74` (`totalDaysExisting + input.days > period.entitled_days`)
e `:111` (`validateAbonoLimit(..., period.entitled_days)`),
`ConfirmVacationTakenUseCase.ts:70` e `:79` (`periodFullyTaken`). **Não existe segundo
produtor.** Todo período nasce `entitled_days = 30` e só sai de 30 por digitação manual.

**Confirmo também a segunda metade da tese — a fonte de dados existe no `AUDIT_COMMIT`.** O
Grupo 10 está implementado (`rh.ts:153-157`), e a contagem por funcionário é computada em
`GetMonthlyAttendanceSummaryUseCase.ts:89-90` (`if (item.absence) entry.absences_from_import
+= 1; if (item.absence_justified) entry.absences_justified += 1;`), com o shape declarado em
`:33-34`. Os dois comentários de código que dizem o contrário
(`RecalculateVacationAccrualPeriodUseCase.ts:5-11` e `vacationValidators.ts:33`) descrevem
estado anterior ao commit auditado — **é doc-drift dentro do código**, e é o que torna o
finding acionável: não falta dado, falta ligação.

**Severidade HIGH sustentada.** Efeito direto e permanente sobre direito legal de terceiro
(Art. 130 CLT), com dois consumidores que decidem programação e encerramento de férias sobre
o número errado, sem teste (grep próprio por `Recalculate` em `server/tests`: nenhuma
ocorrência para este use case). Nenhuma camada compensatória (§1.1–§1.3).

**Ressalva de direção do erro, registrada para a SanaCore não ler a mais:** o erro é sempre
**a favor do empregado** (30 dias quando o direito poderia ser menor). Não há risco
trabalhista para o empregado; há risco de **custo indevido** e de **registro legal incorreto**.
Isso não rebaixa a severidade — a regra do Art. 130 está desligada e o `data_gap_detected:
true` é um sinal que ninguém consome — mas a remediação não deve ser priorizada como se fosse
risco ao trabalhador.

### `T27-RH-H03` — **CONFIRMED** · severidade **HIGH sustentada** · confiança CONFIRMED

**Provas negativas reproduzidas por mim, com contagem própria (não herdada):**
- Grep de `findAllOpen` em **todo** `server/`: **2 ocorrências** — declaração abstrata em
  `VacationAccrualPeriodRepository.ts:13` e implementação em
  `SequelizeVacationAccrualPeriodRepository.ts:45`. **Zero call sites.** Confirmado.
- Grep de `CONCESSIVE_ALERT_WINDOWS_MONTHS` em **todo** `server/`: **1 ocorrência** —
  a própria declaração, `vacationRules.ts:242`. **Zero consumidores.** Confirmado.
- Grep de `applyDobraIfNeeded`: chamadas reais em **exatamente dois** lugares —
  `ListVacationAccrualPeriodsUseCase.ts:21` e `GetVacationAccrualPeriodByIdUseCase.ts:21`
  (as demais ocorrências são o `import`, a definição em
  `vacationAccrualAutoExpire.ts:12`/`:18` e comentários em `vacationController.ts:11` e
  `ConfirmVacationTakenUseCase.ts:11`). **Ambas em rota `GET`.**
- Grep de `vencido_dobra` em **todo** `server/`: o único ponto que **grava** o status é
  `vacationAccrualAutoExpire.ts:14` (`repository.update(period.id, { status:
  'vencido_dobra' })`). Os demais são enum (baseline `:900`, migration
  `20260808-000018…:44`, `rhEnums.ts:55`, `HrVacationAccrualPeriod.ts:25`), tipo
  (`vacationRules.ts:26`), predicado (`:231`) e derivação de `alert_level`
  (`vacationController.ts:53`). **Produtor único, e é de leitura.**
- Alcance por página confirmado: `ListVacationAccrualPeriodsUseCase.ts:18-21` — `limit`
  default **20**, `findAndCount` com `offset`, e o `Promise.all` em `:21` percorre apenas
  `rows` **da página**. Período fora da página consultada não transiciona.

**Refutação mais promissora que testei — e por que falhou.** O baseline **tem** trigger em
`hr_vacation_accrual_periods` (`00_baseline_frozen.sql:22184`,
`trg_hr_lock_vacation_accrual_period BEFORE DELETE OR UPDATE`). Se ela travasse a linha,
mudaria o quadro. Li a função (`:2792-2811`): bloqueia `DELETE` sempre (`:2796-2798`) e, no
`UPDATE`, **apenas** `employee_id`, `period_start`, `period_end` e `concessive_end`
(`:2800-2806`). **`status` não está na lista** — a transição para `vencido_dobra` é permitida
e, simetricamente, **nada no banco a produz**. A trigger não compensa; confirma que o desenho
delegou o status à aplicação. Registro como refutação tentada e vencida, não como omissão.

**Severidade HIGH sustentada**, com **uma precisão jurídica que imponho ao texto do finding**:
a dobra do Art. 137 caput **é devida por força de lei** quando o período concessivo se esgota,
independentemente do valor da coluna `status`. Portanto o dano não é *causado* pelo defeito —
o defeito é a **falha do controle preventivo**: os alertas de 6/3/1 meses (RF-RH-034,
`BLOCO_6_RH_REQUISITOS.md:175` conforme citado pelo autor) existiriam justamente para que o
RH programasse as férias **antes** do vencimento, e eles não têm produtor nem destinatário
(o próprio autor mediu: nenhum alerta, nem RH nem CFO). A empresa perde a chance de evitar o
passivo e perde a visibilidade de que ele ocorreu. **É isso que é HIGH** — e a formulação
correta importa para a SanaCore não "corrigir" apenas a coluna e declarar resolvido: mudar o
`status` sem criar o produtor autônomo **não remedia nada**.

## 3. Quadro-resumo dos vereditos

| ID qualificado | Veredito | Severidade proposta | Severidade validada | Confiança | Refutação tentada |
|---|---|---|---|---|---|
| `T27-JUR-F01` | **CONFIRMED** | HIGH | **HIGH** (mantida) | CONFIRMED | banco (CHECK/trigger), middleware, gate de rota — todas falharam. Texto corrigido: existe trilha do evento, faltam `oldValues` |
| `T27-JUR-F07` | **CONFIRMED** | HIGH | **HIGH** (mantida, base estreitada para a metade *incidentes*) | CONFIRMED | controle detectivo `pending-critical` **existe e é alcançável no client** — refuta parcialmente a metade DSR, não a de incidentes |
| `T27-RH-H01` | **CONFIRMED** (escopo corrigido) | HIGH | **HIGH** (mantida) | CONFIRMED | trigger/CHECK/middleware falharam; **procede** a refutação de alcance: admissão **não** consome o gate — 2 consumidores, não 3 |
| `T27-RH-H02` | **CONFIRMED** | HIGH | **HIGH** (mantida) | CONFIRMED | busca por segundo produtor de `entitled_days`/`unexcused_absences` em todo `server/src` — falhou |
| `T27-RH-H03` | **CONFIRMED** | HIGH | **HIGH** (mantida) | CONFIRMED | trigger `trg_hr_lock_vacation_accrual_period` lida e descartada (não trava `status`); busca por produtor autônomo falhou |

**Nenhum FALSE_POSITIVE. Nenhum DUPLICATE. Nenhum NEEDS_MORE_EVIDENCE. Nenhum rebaixamento
de severidade.** Registro isto sem conforto: 5/5 confirmados é um resultado que, por si,
merece desconfiança. Foi por isso que ataquei primeiro as três refutações estruturais comuns
(§1) — se qualquer uma tivesse procedido, teria derrubado vários de uma vez. Duas refutações
**parciais** procederam e estão registradas com efeito prático (escopo de `T27-RH-H01`,
base de `T27-JUR-F07`); três correções de texto foram impostas contra os autores
(`T27-JUR-F01` trilha, `T27-RH-H02` direção do erro, `T27-RH-H03` causalidade do Art. 137).

## 4. Divergências novas (Regra 20) — registradas, não conciliadas

| ID | Divergência | Lados | Encaminhamento |
|---|---|---|---|
| `DIV-T28-01` | `T27-RH-H01` afirma que o gate de ASO atingido cobre **conclusão de admissão**; `ConcludeAdmissionProcessUseCase.ts:119-127` usa o snapshot `process.aso_result`/`aso_valid_until`, e `hasValidAso` tem só 2 call sites (`ConcludeTerminationProcessUseCase.ts:71`, `ReturnFromAbsenceUseCase.ts:96`) | validador × `vericore-business-rule-auditor` (T-27 DEF-02A) | **corrijo o escopo do finding** por evidência direta (Regra 20: evidência antes de votação). Devolvido ao autor como correção de texto, não como pedido de nova prova |
| `DIV-T28-02` | `T27-JUR-F07` trata "nenhum alerta e nenhum substituto"; o substituto `pending-critical` **existe e chega à UI** (`client/src/pages/juridico/LgpdTab.tsx:89`), embora opt-in (`:77`, `:90`) | validador × T-27 DEF-01 | registro. Não muda o veredito; **muda a instrução de remediação** (a metade DSR já tem detectivo parcial) |
| `DIV-T28-03` | Colisão de IDs entre as trilhas de T-27 (`T27-F01` JUR × SST; duas séries `DIV-T27-01…04` distintas) | inventário de findings | **escala ao director / `vericore-audit-consolidator`**: requalificar também os não-HIGH antes da consolidação |

## 5. Observações não promovidas a finding (Regra: não crio findings)

- `OBS-T28-01` — `findValidAso` (`SequelizeEmployeeDocumentRepository.ts:45-53`) não filtra
  `origin`. Família de `T27-L06`; anexar à remediação de `T27-RH-H01`.
- `OBS-T28-02` — `enum_jur_legal_alerts_origin_type`
  (`00_baseline_frozen.sql:1303-1309`) contém `lgpd_request` e **não** `lgpd_incident`: a
  metade "incidentes" de `T27-JUR-F07` exige **migration de enum**, não só código. Insumo de
  dimensionamento para a SanaCore.
- `OBS-T28-03` — o controle detectivo de LGPD é opt-in por desenho de UI
  (`LgpdTab.tsx:77` `useState(false)` + `:90` `enabled: criticalOnly`). Padrão a verificar em
  outros painéis "críticos" do client; fora do escopo desta validação.

## 6. Pedidos de evidência dinâmica que permanecem abertos

Nenhum é pré-requisito dos vereditos acima — os cinco são prova de **ausência de código**, que
a leitura estática demonstra. São o caminho natural de **reteste** (autoridade do
`vericore-software-audit-director`, não minha): `DYN-T27-01` (regressão de estado),
`DYN-T27-03` (zero linhas em `jur_legal_alerts` após criar DSR), `DYN-27.1`
(`inapto`→`apto` seguido de retorno de afastamento — **ajustar o roteiro: usar retorno de
afastamento ou conclusão de demissão, não conclusão de admissão**, por `DIV-T28-01`),
`DYN-27.2` (recalculate sem corpo), `DYN-27.3` (período com `concessive_end` no passado nunca
lido).

## 7. Declaração de encerramento

Os **5 findings HIGH** do bloco Jurídico + RH de T-27 têm veredito de validação registrado,
com tentativa de refutação documentada para cada um (Regra 22) e âncora `arquivo:linha` lida
diretamente por mim. **Os 5 seguem para remediação com status `CONFIRMED`**, com as correções
de escopo e de texto de §2 e §4 — que são **parte do finding validado** e devem acompanhá-lo
à SanaCore.

Não corrigi, não refatorei e não alterei nenhum arquivo do objeto auditado (Regra 2). Não
declarei `AUDIT_PASSED`, `RETEST_PASSED` nem `FINDING CLOSED` (Regra 4), não declarei
`REMEDIATION COMPLETE` e não criei finding novo. A atualização da matriz de cobertura é do
`vericore-audit-consolidator`; a declaração de estado é do director.

**Estado:** `CONCLUÍDA — 5 CONFIRMED, 0 REFUTED, 0 FALSE_POSITIVE, 0 DUPLICATE,
0 NEEDS_MORE_EVIDENCE, 2 REFUTAÇÕES PARCIAIS PROCEDENTES, 3 DIVERGÊNCIAS NOVAS,
3 OBSERVAÇÕES NÃO PROMOVIDAS`.
