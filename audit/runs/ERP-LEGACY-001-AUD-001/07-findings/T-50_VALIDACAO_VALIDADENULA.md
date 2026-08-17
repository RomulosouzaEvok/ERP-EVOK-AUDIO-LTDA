# T-50 — Validação (Regra 22) de `AUD-RH-VALIDADENULA-01`

| Campo | Valor |
|---|---|
| Run | `ERP-LEGACY-001-AUD-001` |
| Trilha | `T-50` (validação adversarial; objeto: `AUD-RH-VALIDADENULA-01.md`, candidato `T49-RH-C01`) |
| `AUDIT_COMMIT` | `c1311a6f76b512fef893f7e60d934179cae3409f` |
| Organização | VeriCore — `vericore-finding-validator` |
| Autoridade | Regra 22 (CRITICAL/HIGH passam por refutação antes de remediação); `APR-2026-044` D1 (abertura), `APR-2026-045` D1 (severidade fixada em HIGH) |
| Natureza | **100% estática.** Nenhuma conexão a `erp_evok_audio` — `APR-2026-016` íntegra. Nenhum `SELECT`, nenhum DDL/DML. |
| Método | READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT |
| Escrita | Somente este arquivo, em `audit/`. **`AUD-RH-VALIDADENULA-01.md`, `T-48` e `T-49` não foram alterados** (Regra 15). |

> **Nota de método (armadilha deste run).** O renderizador de `Grep` deformou literais em três trilhas
> anteriores. **Todo** literal load-bearing citado abaixo foi confirmado por `Read` do arquivo, com
> faixa de linhas declarada em §2. `grep` foi usado apenas para **localizar** candidatos e para
> fechar censos de chamador (§3, H-T50-03).

---

## 1. Veredito

**`CONFIRMED` — nos dois vetores, com uma correção de causa e três ampliações.**

| Item | Resultado |
|---|---|
| **Estado** | **`CONFIRMED`** (integral; não parcial) |
| **Vetor 1** — `valid_until NULL` = vigente em `findValidAso` | **`CONFIRMED`**. Sete tentativas de refutação, **todas falharam**. |
| **Vetor 2** — guarda pulada em `ConcludeAdmissionProcessUseCase.ts:125` | **`CONFIRMED`**. Duas tentativas de refutação, **ambas falharam**. |
| **Confiança do mecanismo** | **`CONFIRMED`** (leitura direta de código em três camadas: Zod, use case, DDL) |
| **Confiança da materialização** | **BAIXA por impedimento declarado** — `DYN-T49-05`/`-06` não executados (`APR-2026-016`). Não é lacuna de rigor: é restrição de ambiente registrada. |
| **Severidade que a evidência sustenta** | **HIGH** — igual à fixada por `APR-2026-045` D1. Não altero (Regra 18); **recomendo manter**, com a ressalva de ambiente de `OBS-T50-03`. |
| **Duplicidade** | **Não é duplicata** de `T41-RH-F02`, `T43-RH-F04`, `T43-SST-F01` nem `T45-SST-F01` — prova em §5. |
| **Segue para remediação** | **Sim**, satisfeita a Regra 22 — **com as travas de §6**, que ampliam o critério de reteste em três pontos. |

**A frase que resume o que a refutação encontrou:** eu tentei derrubar a afirmação de que "basta
omitir um campo opcional" e encontrei o **contrário do que procurava** — no caminho de retorno de
afastamento, a UI do próprio ERP **não oferece o campo**. Não é omissão possível: é omissão
**garantida** (`OBS-T50-01`).

---

## 2. Confirmações literais desta trilha — o que eu li, não o que supus

| # | Artefato e faixa lida | Literal confirmado |
|---|---|---|
| V01 | `SequelizeEmployeeDocumentRepository.ts:1-57` (inteiro) | `:50` `[Op.or]: [{ valid_until: null }, { valid_until: { [Op.gte]: today } }]`. `:49` `aptitude_result: { [Op.in]: ['apto', 'apto_com_restricao'] }`. `:52` `order: [['createdAt', 'DESC']]`. **Nenhum filtro por `doc_type` de grupo, nenhuma cláusula que exclua `NULL`.** |
| V02 | `SequelizeEmployeeDocumentRepository.ts:15-19` | O filtro `expiring_in_days` monta `where.valid_until = { [Op.lte]: ..., [Op.gte]: ... }` — **documento com `valid_until NULL` nunca satisfaz esta cláusula**. |
| V03 | `CreateEmployeeDocumentUseCase.ts:1-69` (inteiro) | `:47-55` valida **apenas** presença de `employee_id`/`doc_type`/`file_path`, `doc_type` no enum e `fitness_result` no enum. `:61` `valid_until: input.valid_until ?? null`. **Nenhuma regra condicional a `aso_*` sobre validade.** |
| V04 | `employeeDocumentValidators.ts:1-58` (inteiro) | `:28` `valid_until: dateOnly.nullable().optional()`. `:32-35` `.refine((data) => !data.doc_type.startsWith('aso_') || Boolean(data.fitness_result), ...)` — **o refine condicional a `aso_*` existe e cobre `fitness_result`, não `valid_until`**. `:37-40` `updateEmployeeDocumentSchema` aceita `valid_until` **nulável**. |
| V05 | `employeeDocumentController.ts:1-117` (inteiro) | `:75` `createEmployeeDocumentSchema.parse(req.body)`; `:100` `updateEmployeeDocumentSchema.parse(...)`. Guardas adicionais: existência do funcionário (`:78-79`), extensão do arquivo (`:81`). **Nenhuma sobre `valid_until`.** |
| V06 | `UpdateEmployeeDocumentUseCase.ts:1-29` (inteiro) | `:19` `if (input.valid_until !== undefined) updateData.valid_until = input.valid_until;` — **`null` explícito é gravado**. O use case **não lê `doc_type`** do registro. |
| V07 | `HrEmployeeDocument.ts:1-37` (inteiro) | `:27` `valid_until: DataTypes.DATEONLY` — sem `allowNull: false`, sem `validate`, sem `defaultValue`. `:31-35` opções do model: `tableName`/`underscored`/`timestamps`. **Sem `hooks`.** |
| V08 | `20260808-000017-create-hr-employee-documents.cjs:1-75` (inteiro) | `:46` `valid_until: { type: Sequelize.DATEONLY, allowNull: true }`. `:60-62` três índices. `:64-66` `COMMENT ON COLUMN` **apenas** em `aptitude_result`. **Nenhum `CHECK`, nenhum `DEFAULT`, nenhum trigger.** |
| V09 | `00_baseline_frozen.sql:5914-5932` | `:5919` `valid_until date` (nullable, sem `DEFAULT`). Único `COMMENT` da tabela é o de `:5932` (minimização LGPD, em `aptitude_result`). |
| V10 | Censo de objetos de banco sobre `hr_employee_documents` no baseline (`grep` para localizar, **cada sítio conferido por `Read`**) | Existem: `CREATE TABLE` (`:5914`), `COMMENT` (`:5932`), sequence (`:5939`), `DEFAULT` de `id` (`:15503`), PK (`:16946-16947`), 3 índices (`:19370`, `:19377`, `:19384`) e a FK de entrada `hr_absences.document_id` (`:23655-23656`). **Nenhum `CREATE TRIGGER`, nenhum `CHECK`, nenhuma `RULE`.** |
| V11 | `asoGate.ts:1-31` (inteiro) | `:26` `const document = await employeeDocumentRepository.findValidAso(employeeId, docType, today);`; `:27` `return Boolean(document);`. **Porta única.** |
| V12 | `ReturnFromAbsenceUseCase.ts:81-118` | `:95-96` `requiresReturnAso(...)` → `hasValidAso(..., 'aso_retorno', input.actual_end_date)`; `:97-102` `RETURN_ASO_REQUIRED`. **Nenhuma outra verificação de ASO no use case**; o `absence.document_id` **não é consultado**. |
| V13 | `ConcludeTerminationProcessUseCase.ts:56-99` | `:71` `const hasAso = await hasValidAso(this.employeeDocumentRepository, process.employee_id, 'aso_demissional');` — **sem o 4º argumento**, logo `today` = data corrente (V11 `:24`). **Terceiro consumidor do vetor 1, não listado no finding.** |
| V14 | `ConcludeAdmissionProcessUseCase.ts:93-135` | `:119` gate de resultado (`aso_result !== 'apto' && !== 'apto_com_restricao'` → `BusinessRuleError`); `:125` `if (process.aso_valid_until && process.aso_valid_until < input.employee.hire_date) {`. **É a única guarda de vigência do use case** — o restante (`:96-109`, `:129-135`) trata status, campos obrigatórios, CPF, `contract_type` e prazo de experiência. |
| V15 | `ConfirmAdmissionAsoResultUseCase.ts:1-69` (inteiro) | `:51-52` valida **só** `aso_result` contra `VALID_RESULTS` (`:24`); `:63` `aso_valid_until: aso_valid_until ?? null`. **Nunca obrigatória, inclusive quando o resultado é `apto`.** |
| V16 | `admissionValidators.ts:39-42` | `confirmAsoResultSchema` — `:41` `aso_valid_until: dateOnly.nullable().optional()`. |
| V17 | `HrAdmissionProcess.ts:28-45` | `:37` `aso_valid_until: DataTypes.DATEONLY` — sem `allowNull: false`, sem `validate`. |
| V18 | `20260808-000015-create-hr-admission-processes.cjs:78-97` | `:87` `aso_valid_until: { type: Sequelize.DATEONLY, allowNull: true }`. |
| V19 | `client/src/pages/hr/AbsencesTab.tsx:473-492` | `:478-483` `hrApi.createEmployeeDocument({ employee_id: absence.employee_id, doc_type: 'aso_retorno', fitness_result: 'apto', file })` — **`valid_until` não é enviado, e `fitness_result` é literal `'apto'` fixo no código**. `:486` `await attemptReturn(actualEndDate);` na sequência. |
| V20 | `client/src/api/hr.ts:409-432` | `:412` `valid_until?: string \| null`; `:424` `if (input.valid_until) formData.append('valid_until', input.valid_until);` — **campo ausente do multipart quando vazio**. |
| V21 | `client/src/pages/hr/AdmissionTab.tsx:468-519` | `:472`/`:478` `validUntil` nasce e volta a `''`; `:484` `{ aso_result: asoResult, aso_valid_until: validUntil \|\| undefined }`; `:516` rótulo literal **"Válido até (opcional)"**. |
| V22 | `client/src/pages/hr/TerminationTab.tsx:400-460` | `:402` `setValidUntil('')`; `:416-422` cria `aso_demissional` com `valid_until: validUntil \|\| undefined`; `:455-458` campo de data **sem marcação de obrigatório**. |
| V23 | `CreateAbsenceUseCase.ts:85-128` | `:92-95` valida **apenas a existência** de `document_id`; `:124` `document_id: input.document_id ?? null`. **Nenhuma exigência de que seja ASO, nem de tipo, nem de validade.** |
| V24 | `docs/business/BLOCO_6_RH_REQUISITOS.md:163-166`, `:194` | RF-RH-027 (`:163`): `valid_until` **"(nullable — nem todo documento vence)"**. RF-RH-028 (`:164`): para `aso_*` armazena-se **"aptidão ... e validade"**. RF-RH-030 (`:166`): fluxos ficam bloqueados até existir documento **"com aptidão confirmada e dentro da validade"**. RF-RH-048 (`:194`): mesma trava para o retorno >30 dias. |
| V25 | `client/src/pages/facilities/VehiclesPanel.tsx:470-493` | `:492` `const hasExpiration = values.doc_type !== 'outro' \|\| Boolean(values.valid_until);` — **o mesmo projeto já implementa "validade condicionada ao tipo de documento"**, em outro módulo. |

---

## 3. Tentativas de refutação — **incluindo as que falharam contra mim**

> Regra desta trilha: cada hipótese é escrita para **derrubar** o finding. "Falhou" significa que a
> refutação não se sustentou e o finding sobreviveu.

### H-T50-01 — "A escrita não é livre: há validação em alguma camada que obriga `valid_until` para `aso_*`."

**Camadas varridas, todas por leitura:**

| Camada | Artefato | Existe controle sobre `valid_until`? |
|---|---|---|
| Cliente | `AbsencesTab.tsx:478-483` (V19), `AdmissionTab.tsx:516` (V21), `TerminationTab.tsx:416-422` (V22), `api/hr.ts:424` (V20) | **Não** — e no retorno o campo **nem é oferecido** |
| Rota/Zod | `employeeDocumentValidators.ts:28`, `:32-35`, `:37-40` (V04); `admissionValidators.ts:41` (V16) | **Não** — o `.refine` condicional a `aso_*` existe e cobre **apenas** `fitness_result` |
| Controller/middleware | `employeeDocumentController.ts:75-95`, `:98-116` (V05) | **Não** |
| Use case | `CreateEmployeeDocumentUseCase.ts:47-55` (V03); `UpdateEmployeeDocumentUseCase.ts:19` (V06); `ConfirmAdmissionAsoResultUseCase.ts:51-63` (V15) | **Não** |
| Model (Sequelize) | `HrEmployeeDocument.ts:27`, `:31-35` (V07); `HrAdmissionProcess.ts:37` (V17) | **Não** — sem `allowNull: false`, sem `validate`, **sem `hooks`** |
| Migration | `20260808-000017:46` (V08); `20260808-000015:87` (V18) | **Não** |
| Banco (DDL) | `00_baseline_frozen.sql:5919` (V09); censo de objetos V10 | **Não** — sem `CHECK`, sem `DEFAULT`, sem trigger |

**Resultado: REFUTAÇÃO FALHOU.** Sete camadas, nenhum controle compensatório.

**Agravante que a busca produziu, e que trabalha contra o objeto auditado:** o `.refine` de
`employeeDocumentValidators.ts:32-35` (V04) prova que **a forma exata da regra que falta já existe
neste mesmo arquivo, para o mesmo grupo `aso_*`** — foi escrita para `fitness_result` e não para
`valid_until`. E `VehiclesPanel.tsx:492` (V25) mostra o padrão "validade condicionada ao tipo"
implementado em outro módulo do mesmo produto. Não é limitação técnica nem decisão de desenho
declarada: é **omissão**.

### H-T50-02 — "`NULL` não chega ao banco: há `DEFAULT`, trigger, hook ou coerção."

Varredura: DDL do baseline (V09), censo de objetos da tabela (V10), migration de origem (V08),
model (V07). **Nada.** A coluna é `date` nullable pura; o único `COMMENT` da tabela é o de
minimização LGPD em `aptitude_result` (`:5932`). No lado da admissão, idem (V17, V18).

**Resultado: REFUTAÇÃO FALHOU.** `null` gravado em `:61` (V03) e em `:63` (V15) chega intacto.

### H-T50-03 — "`hasValidAso` não é a única porta: há verificação redundante no fluxo de retorno."

`ReturnFromAbsenceUseCase` lido inteiro (V12): as guardas do use case são `actual_end_date` presente
(`:82-83`), afastamento existente (`:86-87`), afastamento não encerrado (`:88-90`), data não anterior
ao início (`:91-93`) e o gate (`:95-102`). **Nenhuma delas toca validade de ASO.** `hasValidAso`
(V11 `:26`) delega **exclusivamente** a `findValidAso`, e o controller/rota não acrescentam nada.
Censo de consumidores de `hasValidAso`/`findValidAso` fechado sobre `server/src/**`: **três**
consumidores de produção (`ReturnFromAbsenceUseCase.ts:96`, `ConcludeTerminationProcessUseCase.ts:71`,
mais a definição em `asoGate.ts:26`), nenhum com verificação redundante.

**Resultado: REFUTAÇÃO FALHOU — e falhou para pior:** a varredura encontrou um **terceiro consumidor
não listado no finding** (`OBS-T50-02`).

### H-T50-04 — "O vetor 2 não é real: há outra guarda antes de `:125` que já barra o caso."

`ConcludeAdmissionProcessUseCase` lido inteiro (V14). A guarda de `:119` barra `aso_result` ausente
ou `inapto` — logo, para chegar a `:125` alguém precisa ter confirmado `apto`/`apto_com_restricao`.
**Mas essa é uma guarda de resultado, não de vigência**, e `:125` é a **única** de vigência no
arquivo. Confirmado ainda que `ConfirmAdmissionAsoResultUseCase` **não** obriga a data (V15 `:63`) e
que o Zod correspondente a declara nulável (V16 `:41`).

**Resultado: REFUTAÇÃO FALHOU.** Existe uma guarda anterior, ela **estreita** o caminho (é preciso
confirmar aptidão), mas não o fecha: a UI oferece o campo de data com o rótulo literal
**"Válido até (opcional)"** (V21 `:516`) e envia `undefined` quando vazio (`:484`).

**Precisão devolvida ao autor:** o finding afirma que a guarda "é pulada inteira". Correto quanto à
vigência — mas convém registrar que a conclusão **não** fica sem nenhum controle: o resultado de
aptidão continua sendo exigido em `:119`. A consequência exata é **"admissão concluída sobre exame
cuja vigência nunca foi verificada"**, não "sem verificação de ASO". A redação do finding já diz
isto em §2; registro para que a SanaCore não persiga o alvo errado.

### H-T50-05 — "O defeito é comportamento especificado: RF-RH-027 declara a coluna nullable de propósito."

Esta é a refutação mais forte disponível ao objeto auditado, e por isso a tratei com cuidado.
RF-RH-027 (V24 `:163`) declara literalmente `valid_until` **"(nullable — nem todo documento vence)"**.

**Por que ela falha:** a nulabilidade é declarada para a **coluna**, que serve a `rg`, `cpf`,
`contrato`, `certificado` — documentos que de fato não vencem. Para o subgrupo `aso_*` a mesma
norma diz o contrário: RF-RH-028 (`:164`) manda armazenar **"aptidão ... e validade"**, e RF-RH-030
(`:166`) condiciona o desbloqueio a documento **"com aptidão confirmada e dentro da validade"** —
RF-RH-048 (`:194`) repete a trava para o retorno. **Um documento sem validade não pode ser
demonstrado "dentro da validade".** Tratar `NULL` como satisfação da cláusula inverte a norma.

**Resultado: REFUTAÇÃO FALHOU**, mas produz uma **restrição vinculante à remediação**
(`OBS-T50-05`): a correção **não pode** ser `allowNull: false` na coluna — isso violaria RF-RH-027 e
quebraria os tipos que legitimamente não vencem. Tem de ser **condicional a `doc_type` do grupo
`aso_*`**, exatamente na forma do `.refine` que já existe em `:32-35` (V04).

### H-T50-06 — "É duplicata de `T41-RH-F02`; a independência afirmada no `T-49` §5 não procede."

Testei a independência **nos dois sentidos**, com os critérios na mão:

- **Executar `CR-T49-RH-01` a `-08` fecha este vetor?** Não. Aqueles itens tratam de **vínculo**
  (`sst_aso_id`) e de **domínio de rótulo** (`apto_com_restricao` × `apto_com_restricoes`) nas quatro
  tabelas. Um `aso_retorno` com FK correta para a SST, rótulo unificado e resultado perfeitamente
  concordante **continua satisfazendo** `:50` (V01) se `valid_until` for `NULL` — a cláusula
  `[Op.or]` não olha vínculo nem rótulo.
- **Corrigir a validade fecha `T41-RH-F02`?** Não. Nenhuma das alterações exigidas por §6 deste
  finding cria vínculo com `sst_asos` nem unifica ENUM.

**Resultado: REFUTAÇÃO FALHOU — o `T-49` §5 procede, e a independência é bidirecional.** Não há
duplicação de contabilidade. Ver §5 para a checagem contra os demais findings do run.

### H-T50-07 — "Os dois vetores são o mesmo defeito; o finding único infla o escopo de reteste."

Comparação factual:

| Aspecto | Vetor 1 | Vetor 2 |
|---|---|---|
| Tabela | `hr_employee_documents` | `hr_admission_processes` |
| Mecanismo | `NULL` **admitido por disjunção explícita** no `where` (V01 `:50`) | **Curto-circuito** de `&&` em guarda de use case (V14 `:125`) |
| Camada | Infraestrutura (repositório) | Aplicação (use case) |
| Escrita correlata | `CreateEmployeeDocumentUseCase.ts:61` + `UpdateEmployeeDocumentUseCase.ts:19` | `ConfirmAdmissionAsoResultUseCase.ts:63` |
| Consumidores | **Três** (retorno, demissão, e o próprio gate) | **Um** (conclusão da admissão) |
| Correção | Alterar cláusula de leitura + tornar a escrita condicionalmente obrigatória | Inverter a guarda (`!aso_valid_until` → recusa) + escrita obrigatória |

**Resultado: a refutação PROCEDE PARCIALMENTE, e é o único ponto em que o texto do finding pode ser
lido de forma imprecisa.** São a **mesma classe** (`NULL` tratado como afirmação positiva — matéria
de `C-137`), como diz `APR-2026-044` D1, mas são **duas instâncias com mecanismos, camadas e
correções distintas**. Corrigir uma não corrige a outra, e **nenhum teste cobre as duas**.

**O que isso muda, e o que não muda:** não contesto o agrupamento — foi decisão do dono, é
defensável pela causa raiz, e §6 do próprio finding já exige os dois caminhos e reprova quem corrigir
só um. **O fato que registro** é que, para efeito de execução e reteste, este finding contém **duas
condições independentes de fechamento**, não uma. A SanaCore deve tratá-las como duas tarefas
numeradas dentro do mesmo caso — mesmo padrão adotado para V1/V3/V4 em `T-49` §5.

### H-T50-08 — "O consumidor real do vetor 1 está em módulo que não opera; o impacto é hipotético."

`T-38` refinado por `APR-2026-031` D13 item 4 classifica `employees` em uso real **somente** no fluxo
de desligamento, e o finding registra isso em §7. **Mas o finding não lista o consumidor do
desligamento.** `ConcludeTerminationProcessUseCase.ts:71` (V13) chama `hasValidAso` com
`'aso_demissional'` — a **mesma** leitura defeituosa, no **único** recorte que o próprio
`REMEDIATION_BACKLOG.md:118-123` nomeia como candidato a produção real.

**Resultado: REFUTAÇÃO FALHOU, e no sentido oposto ao pretendido** — o consumidor no recorte de maior
exposição existe e estava fora do texto. Ver `OBS-T50-02` e `OBS-T50-03`.

### H-T50-09 — "A consequência declarada ('autoriza todo retorno futuro, indefinidamente') é exagerada."

Esta é a única hipótese em que encontrei erro **de atribuição** no finding — e ela não o enfraquece,
o **decompõe**.

O finding atribui à nulidade o efeito de "autorizar retornos de afastamentos que ainda nem
ocorreram". A leitura de V12 mostra que esse efeito tem **duas causas somadas**:

1. **Ausência de vínculo documento↔afastamento** — `ReturnFromAbsenceUseCase` não consulta
   `absence.document_id` nem exige que o ASO seja posterior ao início do afastamento (V12; V23
   confirma que `document_id` só tem validação de existência). **Esta causa produz reuso mesmo com
   validade preenchida**: um `aso_retorno` com `valid_until` daqui a 6 meses autoriza **todos** os
   retornos dentro dessa janela.
2. **`valid_until NULL` aceito como vigente** (V01 `:50`) — que remove o **limite temporal** desse
   reuso, tornando-o perpétuo.

**Resultado: REFUTAÇÃO PARCIALMENTE PROCEDENTE quanto à causa; o defeito permanece `CONFIRMED`.**
A consequência "indefinidamente" é correta e é atribuível à nulidade. A consequência "autoriza
retornos múltiplos" **não** é atribuível à nulidade e **sobrevive à correção deste finding**.

**Consequência prática, e é séria:** o item 4 do critério de reteste ("retorno com `aso_retorno` sem
validade → recusa") pode **passar** com a nulidade corrigida enquanto o reuso continua. Registrado
como `OBS-T50-04` — é candidato a finding autônomo, e **não o abro** (não é autoridade deste agente).

---

## 4. Severidade — o que a evidência sustenta

**Sustenta HIGH.** Coincide com `APR-2026-045` D1. **Não altero** (Regra 18); **recomendo manter**.

O teste decisivo do run — *o defeito ocorre pelo caminho normal, com consumidor real?* — é satisfeito
com folga maior do que o finding afirma:

- **Vetor 1, retorno:** não é preciso omitir nada. `AbsencesTab.tsx:478-483` (V19) **não envia**
  `valid_until`. Todo `aso_retorno` criado pelo diálogo de retorno do próprio ERP nasce com
  `valid_until NULL`. **Probabilidade de ocorrência pelo caminho normal: 1.**
- **Vetor 1, demissão:** `TerminationTab.tsx:402`/`:416-422` (V22) oferece o campo vazio e opcional;
  consumidor em `ConcludeTerminationProcessUseCase.ts:71` (V13), no recorte de produção real.
- **Vetor 2, admissão:** `AdmissionTab.tsx:516` (V21) rotula o campo literalmente **"(opcional)"**.

**Por que não recomendo elevar a CRITICAL, apesar disso.** Aplico a mesma régua de `T-44` e `T-48`:
(a) a materialização não foi medida — `DYN-T49-05`/`-06` não executados, `APR-2026-016` íntegra;
(b) o gate **não é anulado**, é **enfraquecido** — resultado de aptidão continua exigido nos três
consumidores (V01 `:49`, V14 `:119`); (c) elevar aqui quebraria a régua contra `T41-RH-F02` e
`T43-SST-F01`, que é exatamente o fundamento de coerência invocado em `APR-2026-045` D1.

**Cláusula de reavaliação, reforçada:** a de §7 do finding permanece, e acrescento o gatilho de
`OBS-T50-03` — se o director confirmar o recorte de desligamento como produção real (pendência
`P-T39-01` ampliada, `T5-03`), este finding acompanha `T41-RH-F02` na mudança de estrato, **pela
mesma evidência e no mesmo ato**. Não é decisão minha.

---

## 5. Checagem de duplicidade — feita, com resultado

| Finding | É o mesmo defeito? | Prova |
|---|---|---|
| `T41-RH-F02` | **Não.** Colunas distintas (`aptitude_result` × `valid_until`), normas distintas (RF-RH-028 × RF-RH-030/048), independência bidirecional | H-T50-06 |
| `T43-RH-F04` | **Não.** Trata de `hr_termination_processes.aso_result` como coluna **write-only** de dado de saúde; não toca vigência | `T-43` §3 (`:167`) |
| `T43-SST-F01` | **Não.** ASO gravado fora da transação do S-2220 — atomicidade, não semântica de `NULL` | `T-44` |
| `T45-SST-F01` | **Não.** Portão que verifica rótulo em vez de artefato, em EPI | `T-45` §3 |
| `AUD-RH-VTHORISTA-01`, `AUD-RH-COMISSAO-01`, `AUD-RH-CPFSEARCH-01` | **Não.** Benefícios, comissão e busca por CPF | — |

**Pertence ao cluster `G-28`** ("portão de conformidade satisfeito por rótulo, cópia ou conteúdo
vazio", `RELATORIO_TECNICO.md:464`) por afinidade de padrão — o que **não** o torna duplicata de
nenhum dos 6 já listados ali. Registro para o `vericore-audit-consolidator` decidir se `G-28` passa
de 6 para 7 itens; **não altero o relatório** (Regra 15).

---

## 6. O que muda na remediação — travas desta validação

O critério de §6 do finding é **necessário e correto**. É **insuficiente em três pontos**, todos
provados por leitura. As travas abaixo são vinculantes para o reteste, no mesmo espírito de `T-49`
§3.6 — quem retestar sem elas pode fechar o finding sem fechar o defeito.

**`CR-T50-01` — O consumidor da demissão entra no escopo** *(deriva de V13, `OBS-T50-02`)*
- **Verifica:** o critério item 4 exige teste "nos dois caminhos". São **três** consumidores de
  `findValidAso`: retorno (`ReturnFromAbsenceUseCase.ts:96`), **demissão**
  (`ConcludeTerminationProcessUseCase.ts:71`) e admissão (caminho próprio, V14).
- **Reprova se:** o teste cobrir retorno e admissão e deixar `aso_demissional` sem caso — é o
  consumidor no recorte que o backlog nomeia como candidato a produção real.
- **Nota:** a correção da leitura em `:50` (V01) atende os três de uma vez; o que falta é **prova**.

**`CR-T50-02` — A escrita tem DOIS pontos, não um** *(deriva de V06, `OBS-T50-06`)*
- **Verifica:** o critério item 2 nomeia apenas `CreateEmployeeDocumentUseCase`.
  `UpdateEmployeeDocumentUseCase.ts:19` (V06) grava `null` explícito e **`updateEmployeeDocumentSchema`
  o aceita** (V04 `:37-40`). `PUT /api/rh/employee-documents/:id` **converte um ASO datado em ASO
  eterno**, sem tocar no `POST`.
- **Reprova se:** a obrigatoriedade for implementada só na criação. Atenção de desenho: o use case
  de update **não lê `doc_type`** do registro — a regra condicional exige carregá-lo, e é aí que a
  remediação erra por omissão.
- **Simétrico no vetor 2:** `ConfirmAdmissionAsoResultUseCase.ts:63` (V15) é o ponto de escrita
  equivalente, e o critério não o nomeia. Corrigir `:125` sem corrigir `:63` deixa a admissão
  recusando na conclusão um dado que o sistema continua deixando gravar — falha tardia em vez de
  falha na origem.

**`CR-T50-03` — A obrigatoriedade é condicional a `doc_type`, nunca `NOT NULL` na coluna**
*(deriva de V24/H-T50-05, `OBS-T50-05`)*
- **Verifica:** a regra vale para o grupo `aso_*`. `rg`/`cpf`/`contrato` continuam podendo não
  vencer (RF-RH-027, V24 `:163`).
- **Reprova se:** a migration puser `allowNull: false` em `hr_employee_documents.valid_until`, ou um
  `CHECK` incondicional — quebraria a norma e travaria documentos legítimos. A forma correta já
  existe no repositório: `employeeDocumentValidators.ts:32-35` (V04) e, no cliente,
  `VehiclesPanel.tsx:492` (V25).
- **Camada:** Zod **não basta sozinho** (mesma armadilha `A4` de `T-49` §3.5) — a regra é de domínio;
  se houver `CHECK` no banco, tem de ser condicional a `doc_type IN (grupo aso_*)`, e a escolha
  precisa ser **declarada** (mesma disciplina de `CR-T49-EST-12`).

**Travas do critério original que **confirmo** e reforço:**
- **Corrigir só a leitura move o buraco** — confirmado: `:50` corrigido com escrita livre apenas
  transfere o defeito para o momento da consulta, e o passivo continua entrando.
- **O passivo (item 5)** é agravado por V02: documento com `valid_until NULL` **não aparece** no
  filtro `expiring_in_days` de `SequelizeEmployeeDocumentRepository.ts:15-19`, logo **é invisível ao
  alerta 60/30/7 de RF-RH-029**. Mesma classe da armadilha L16 de `T-49` (passivo invisível pela UI):
  a correção protege o futuro, e o passado não se manifesta em nenhuma tela. **Isto torna
  `DYN-T49-05`/`-06` a única via de dimensionamento** — não há substituto por interface.

---

## 7. Achados colaterais — o que o autor não viu

> Registrados como **observações**, não como findings novos: este agente **não cria findings**
> (Regra: valida os dos outros). Devolvidos ao autor de origem (`T-49` / `vericore-database-auditor`)
> e ao `vericore-software-audit-director`.

| ID | Observação | Evidência | Por que importa |
|---|---|---|---|
| **`OBS-T50-01`** | **A UI do retorno não omite o campo por escolha do usuário — ela não o oferece.** `AbsencesTab.tsx:478-483` cria o `aso_retorno` com `employee_id`, `doc_type`, `fitness_result` e `file`, **sem `valid_until`**. Todo ASO de retorno criado pelo fluxo do próprio ERP nasce eterno. | V19; V20 `:424` | Eleva a probabilidade de ocorrência de "provável" para **certa** no caminho de retorno. Fundamenta a HIGH com mais força do que o texto do finding. |
| **`OBS-T50-02`** | **Existe um terceiro consumidor do vetor 1, ausente do finding:** `ConcludeTerminationProcessUseCase.ts:71` (`aso_demissional`). O finding cita retorno e admissão. | V13; V11 | Reteste que cubra "os dois caminhos" **deixa o terceiro sem prova** — e é o do recorte de maior exposição. Origem de `CR-T50-01`. |
| **`OBS-T50-03`** | **`OBS-T50-02` reabre a questão de ambiente deste finding.** `REMEDIATION_BACKLOG.md:118-123` nomeia `T41-RH-F02` e `T43-RH-F04` como candidatos a produção real **exatamente por `asoGate.ts:26` e `ConcludeTerminationProcessUseCase.ts:71`** — que são a leitura defeituosa **deste** finding. | V13; `REMEDIATION_BACKLOG.md:118-123`; `T-38` + `APR-2026-031` D13 item 4 | Se o director confirmar o recorte, este finding muda de estrato junto com `T41-RH-F02`, pela mesma evidência. **Decisão do director — não classifico ambiente aqui** (Regra 6). |
| **`OBS-T50-04`** | **Defeito autônomo que sobrevive à correção deste finding: o gate de retorno não amarra o ASO ao afastamento.** `ReturnFromAbsenceUseCase` não usa `absence.document_id`, e a FK `hr_absences_document_id_fkey` existe no schema mas o gate a ignora; `CreateAbsenceUseCase.ts:92-95` só valida existência. Um `aso_retorno` **com data válida** autoriza **todos** os retornos dentro da janela. | V12; V23; `00_baseline_frozen.sql:23655-23656` | **Candidato a finding próprio.** Não o abro. Se não for aberto, o item 4 do critério pode passar verde com o reuso intacto. Nota útil à SanaCore: **o mecanismo de vínculo já existe no schema** — não exige coluna nova. |
| **`OBS-T50-05`** | **A norma proíbe a correção mais óbvia.** RF-RH-027 declara `valid_until` nullable **por desenho**; a obrigatoriedade tem de ser condicional a `aso_*`. | V24 `:163-166`; V04 `:32-35` | Evita que a remediação troque um HIGH por quebra de requisito. Origem de `CR-T50-03`. |
| **`OBS-T50-06`** | **Segundo ponto de escrita, não citado:** `PUT /api/rh/employee-documents/:id` grava `valid_until: null` explícito (`UpdateEmployeeDocumentUseCase.ts:19` + `updateEmployeeDocumentSchema`), **transformando ASO datado em ASO eterno**. | V06; V04 `:37-40` | Origem de `CR-T50-02`. Fechar só o `POST` deixa uma porta aberta com o mesmo efeito. |
| **`OBS-T50-07`** | **Possível defeito de classe distinta, no mesmo diálogo:** `AbsencesTab.tsx:481` grava `fitness_result: 'apto'` **literal, sem entrada do usuário**. Somado a `OBS-T50-01`, o gate de RF-RH-048 é satisfeito por **anexar um arquivo qualquer**: aptidão afirmada pelo cliente e validade infinita. | V19 `:478-483`; V01 `:49-50` | **Não é vetor deste finding** (é aptidão, não vigência) e **não o abro**. Encaminhado ao director: se procede, é o que efetivamente esvazia RF-RH-048, e pertence à mesma família de `G-28`. |
| **`OBS-T50-08`** | **Documento com `valid_until NULL` é invisível ao alerta de vencimento de RF-RH-029** — o filtro `expiring_in_days` exige `valid_until` entre hoje e o limite. | V02 `:15-19` | Torna o passivo indetectável por UI e reforça a necessidade de `DYN-T49-05`/`-06`. |

---

## 8. Resíduos desta validação

| ID | Resíduo |
|---|---|
| `RES-T50-01` | **Materialização não medida.** `DYN-T49-05` (linhas `aso_*` com `valid_until IS NULL`) e `DYN-T49-06` (`hr_admission_processes` concluídos com `aso_valid_until IS NULL`) permanecem **não executados** — `APR-2026-016`. A confiança do mecanismo é `CONFIRMED`; a da materialização, não avaliável. |
| `RES-T50-02` | **Censo de escrita fechado sobre `server/src/**` e `client/src/**`.** Scripts, seeds e migrations de dados não varridos quanto a `INSERT` direto em `hr_employee_documents`/`hr_admission_processes`. Herda `RES-T49-01`/`RES-T48-03`. |
| `RES-T50-03` | **`OBS-T50-07` não foi verificado como finding** — verifiquei o literal (V19), não a totalidade do fluxo de aptidão do diálogo de retorno. Não é objeto desta validação. |
| `RES-T50-04` | **Baseline usado como verdade estrutural.** As migrations de origem foram lidas (`-000015`, `-000017`), mas não se varreu o histórico completo em busca de `ALTER TABLE` posterior que tivesse criado `CHECK`/trigger. O censo V10 sobre o dump congelado é a base da afirmação "não há trigger". Herda `RES-T49-05`. |
| `RES-T50-05` | **Independência testada contra os critérios escritos, não contra plano de remediação real** — se o desenho escolhido unificar leitura de vigência num serviço de domínio, `CR-T50-01` a `-03` exigem leitura de conformidade, não reescrita. Herda `RES-T49-02`. |

---

## 9. Estado

- **`AUD-RH-VALIDADENULA-01` (candidato `T49-RH-C01`) — `CONFIRMED`.** Nove hipóteses de refutação
  executadas: **sete falharam integralmente**, **uma procede parcialmente sem derrubar o finding**
  (H-T50-07, os dois vetores são a mesma classe mas duas instâncias), **uma procede quanto à
  atribuição de causa** (H-T50-09) e **decompõe** a consequência sem enfraquecê-la.
- **Severidade sustentada pela evidência: HIGH** — coincide com `APR-2026-045` D1. **Não alterada por
  este agente** (Regra 18). Elevação a CRITICAL **não** recomendada, com fundamento em §4.
- **Confiança: mecanismo `CONFIRMED`; materialização não medida** (`RES-T50-01`).
- **Regra 22 satisfeita — o finding pode seguir à SanaCore**, no lote compartilhado de `T41-RH-F02`
  (`APR-2026-044` D1), **com as travas `CR-T50-01`, `CR-T50-02` e `CR-T50-03`** somadas ao critério
  de §6 do finding.
- **Não é duplicata** de nenhum finding do run (§5). Afinidade com o cluster `G-28` registrada para o
  consolidador decidir.
- **8 observações colaterais** (`OBS-T50-01` a `-08`), **nenhuma convertida em finding** — não é
  autoridade deste agente. Duas exigem decisão do director: `OBS-T50-04` e `OBS-T50-07`.
- **5 resíduos** abertos (`RES-T50-01` a `-05`).
- **Nenhum `FINDING CLOSED`. Nenhum `RETEST_PASSED`. Nenhum `AUDIT_PASSED`. Nenhuma severidade
  alterada. Nenhum artefato existente alterado** (Regra 15). **Nada escrito fora de `audit/`.**
- **Banco `erp_evok_audio`: não acessado.** `APR-2026-016` íntegra.

### O que exige ação do director

1. **`OBS-T50-04`** — reuso do ASO de retorno por ausência de vínculo documento↔afastamento.
   Sobrevive à correção deste finding e **não tem critério em lugar nenhum** se não for aberto.
2. **`OBS-T50-07`** — `fitness_result: 'apto'` literal no diálogo de retorno. Se procede, é o que
   esvazia RF-RH-048 de forma mais direta que a vigência.
3. **`OBS-T50-03`** — o consumidor de desligamento (`ConcludeTerminationProcessUseCase.ts:71`) é
   também deste finding. A decisão de ambiente pendente (`P-T39-01` ampliado, `T5-03`) deve tratá-lo
   junto com `T41-RH-F02`, não separadamente.
4. **`DYN-T49-05`/`-06`** continuam sendo a única via de dimensionamento do passivo — `OBS-T50-08`
   prova que nenhuma tela do sistema o revela.
