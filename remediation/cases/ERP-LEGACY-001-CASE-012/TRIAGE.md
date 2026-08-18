# TRIAGE — `ERP-LEGACY-001-CASE-012` (`FIND-ERP-007`)

```
CASE_ID:        ERP-LEGACY-001-CASE-012
FINDING_ID:     FIND-ERP-007
PROJECT_ID:     ERP-LEGACY-001
TÍTULO CURTO:   Rescisão de contrato de experiência — motivo descartado, aviso
                prévio presumido `trabalhado`, status HTTP em disputa documental
SEVERIDADE:     MEDIUM (rebaixada de HIGH pelo `vericore-finding-validator`)
CONFIDENCE:     itens 1 e 2 = CONFIRMED; item 3 = NEEDS_MORE_EVIDENCE
AUDIT_COMMIT:   c9359be399c45191fe90e8e9707803125a5ba91d (tag `legacy-baseline-001`)
HEAD analisado: 752b6d8338a7db114f75acca3a2110397285f2a4
                (branch `audit/ERP-LEGACY-001-AUD-001/2026-08-16`)
AMBIENTE:       módulo `rh` = NÃO-PRODUÇÃO; `employees` = 0 registros medidos
FASE:           TRIAGEM (SanaCore) — nenhuma linha de `server/`, `client/`,
                `docs/`, `audit/`, `coretriad/` ou teste foi alterada
DESTINO:        `sanacore-remediation-engineer` — worktree/branch
                `sana/ERP-LEGACY-001/CASE-012` (Regra 11), **após** o gate humano de §6
REGRAS 3/4:     nada aqui declara `FINDING CLOSED`, `RETEST_PASSED` ou `RISK_ACCEPTED`
```

**Regra permanente de segurança de dado real (`APR-2026-016`) — cumprimento
declarado.** Nenhuma conexão de banco foi aberta, contra nenhum banco, por
nenhum motivo — nem para "contar linhas". Nenhuma suíte de teste, nenhum script
de diagnóstico e nenhuma migration foram executados. Toda a verificação é
estática, sobre arquivos versionados: código, migrations, dump congelado
(`00_baseline_frozen.sql`), testes e documentos.

**Regra 6 — declaração prévia.** Esta triagem **não decide** nenhuma das três
ambiguidades de negócio/jurídicas do finding. Elas estão formuladas como
perguntas em §6, sem resposta sugerida como se fosse regra. Onde há preferência
técnica, ela está marcada como *recomendação técnica condicionada à decisão*, e
nunca como regra de negócio.

---

## 0. Método e o que esta triagem acrescenta

Cada âncora arquivo+linha citada por `FIND-ERP-007` (corpo do autor **e** seção
de validação) foi **relida por mim no HEAD**, não herdada do documento. Onde
minha leitura diverge do artefato recebido, a divergência está registrada em §8
— **não corrigida no artefato alheio** (Regras 15 e 16: `audit/` e
`docs/coretriad/.../discovery/` não são meus para editar).

**Ausência de drift entre `AUDIT_COMMIT` e HEAD, no recorte deste caso —
verificada:**

```
$ git diff --name-only c9359be3..HEAD -- \
    server/src/modules/rh server/src/models/HrTerminationProcess.ts \
    server/migrations server/src/errors \
    server/tests/unit/rh-contract-use-cases.test.ts \
    server/tests/unit/rh-admission-termination-use-cases.test.ts \
    client/src/pages/hr client/src/api/hr.ts docs/business/BLOCO_6_RH_API.md
(vazio)
```

Todos os arquivos citados pelo finding são **idênticos** no `AUDIT_COMMIT` e no
HEAD. A remediação parte exatamente do objeto auditado; nenhum delta audit é
exigido por este caso. A confirmação formal dessa identidade continua sendo do
`vericore-audit-evidence-controller` — este parágrafo é insumo, não veredito.

---

## 1. Reconfirmação âncora por âncora (leitura direta no HEAD)

### 1.1 Item 1 — `termination_reason` aceito e descartado

| Alegação do finding | Âncora | Resultado da releitura |
|---|---|---|
| Contrato de API documenta o campo | `docs/business/BLOCO_6_RH_API.md:526` | **CONFERE.** Literal: `{ "decision": "rescindir", "termination_reason": "termino_experiencia" }` |
| Zod aceita, em schema `.strict()` | `employeeContractValidators.ts:27` / `:28` | **CONFERE.** `termination_reason: z.string().trim().max(1000).optional()`, dentro de `z.object({...}).strict()` com `.refine` só sobre `period_2_end_date` |
| Controller repassa via spread | `employeeContractController.ts:94` | **CONFERE.** `useCase.execute({ id: req.params.id, ...parsed, createdBy: (req as any).user.id })` |
| Use case declara o campo | `DecideEmployeeContractUseCase.ts:28` | **CONFERE.** `termination_reason?: string;` na interface local |
| `execute()` nunca lê o campo | `DecideEmployeeContractUseCase.ts:60-108` | **CONFERE.** Li o corpo integral: as únicas leituras de `input` são `input.decision` (:61, :70, :75), `input.id` (:64, :72, :82), `input.period_2_end_date` (:71-72) e `input.createdBy` (:90, :106). `input.termination_reason` **não aparece** |
| Ramo de rescisão monta objeto fixo | `:100-107` | **CONFERE**, literal, incluindo `notice_modality: 'trabalhado'` (:104) |
| Sem coluna de destino no model | `HrTerminationProcess.ts:16-47` | **CONFERE.** 21 atributos; nenhum de motivo de rescisão. `cancel_reason: DataTypes.TEXT` (:39) é o motivo do **cancelamento do processo** |
| Sem coluna de destino no banco | migration `20260808-000016`:40-92 | **CONFERE** — e reconfirmado por caminho independente no DDL congelado: `00_baseline_frozen.sql:6296-6319` (`CREATE TABLE public.hr_termination_processes`) tem 19 colunas + `payment_deadline` gerada + 1 CHECK, e **nenhuma** coluna de motivo além de `cancel_reason` (`:6311`) |
| Mitigação parcial por `audit_logs` | `employeeContractController.ts:95-98` | **CONFERE.** `logAction(req, { action: 'update', entityType: 'HrEmployeeContract', entityId: Number(req.params.id), newValues: parsed, ... })` — `parsed` inclui `termination_reason` quando enviado |
| Grep no módulo `rh` = 2 ocorrências | — | **CONFERE.** Varredura própria em todo o repositório: as duas do módulo `rh` (validador + interface) e, fora dele, **apenas o módulo `juridico`** (`jur_contracts.termination_reason`, `JurContract.ts:53,93`, migration `20260807-000260:147,174`, `TerminateContractUseCase.ts:32-45`) — módulo distinto, campo real, obrigatório por CHECK. Nenhuma leitura no RH |
| Agravante do validador: a tela coleta e descarta | `EmployeeContractsTab.tsx:290,309` | **CONFERE, e é mais forte do que o registrado.** `:290` estado `terminationReason`; `:355-363` renderiza `<textarea>` com `<Label>Motivo (opcional)</Label>`; `:309` envia `termination_reason: decision === 'rescindir' ? terminationReason \|\| undefined : undefined`; `:311-314` `onSuccess` fecha o diálogo e recarrega — **sucesso visual sem nenhuma persistência do texto**. O tipo do client também prevê o campo: `client/src/api/hr.ts:236` (`/** Usado quando decision === 'rescindir'. */`) |

### 1.2 Item 2 — `notice_modality = 'trabalhado'` hard-coded

| Alegação | Âncora | Resultado |
|---|---|---|
| Literal no use case | `DecideEmployeeContractUseCase.ts:104` | **CONFERE** |
| Enum de dois valores, `NOT NULL` | `CreateTerminationProcessUseCase.ts:22,58-60`; `HrTerminationProcess.ts:24`; migration `:54`; `00_baseline_frozen.sql:850-855,6301` | **CONFERE** nos quatro lugares |
| Documento traz o valor **oposto** no outro endpoint | `BLOCO_6_RH_API.md:577` | **CONFERE.** `"notice_modality": "indenizado"` no exemplo de `POST /termination-processes` §6.1 |
| §5.2 é **omisso** sobre a modalidade | `BLOCO_6_RH_API.md:519-551` | **CONFERE.** Li a seção integral: descreve o efeito de `rescindir` (":cria `TerminationProcess` com `termination_type='termino_experiencia'`", :532-534) e **não menciona `notice_modality`** — nem valor, nem regra, nem campo de entrada |
| Nenhum comentário cita requisito nessa linha | `:95-99` (cita RF-RH-022), `:76-80` (cita RNF-RH-04) | **CONFERE.** O comentário `:95-99` justifica *por que o contrato não é encerrado*; nada justifica a escolha da modalidade |
| Teste congela a presunção | `rh-contract-use-cases.test.ts:107-109` | **CONFERE, com a mecânica exata:** `expect(createTermination.execute).toHaveBeenCalledWith(expect.objectContaining({ employee_id: 501, termination_type: 'termino_experiencia', notice_modality: 'trabalhado', createdBy: 9 }))`, e a chamada sob teste é `execute({ id: 42, decision: 'rescindir', createdBy: 9 })` (:105) — **sem `termination_reason`** |
| Rebaixamento do validador: nenhum cálculo consome `notice_modality` | — | **CONFERE por varredura própria.** Consumidores da coluna no HEAD: escrita (`CreateTerminationProcessUseCase.ts:71`), tipo do client (`api/hr.ts:261,305`), **exibição** (`TerminationTab.tsx:183`), **formulário de criação** (`TerminationTab.tsx:301`), enum de validação (`terminationValidators.ts:22`, `rhEnums.ts:23`) e testes. Nenhuma aritmética. `payment_deadline` é `date GENERATED ALWAYS AS ((termination_date + 10)) STORED` (`00_baseline_frozen.sql:6317`) — depende **só** de `termination_date`, não da modalidade. `terminationRules.calculateNoticePeriodDays` é acionado por `hireDate` (`CreateTerminationProcessUseCase.ts:79-85`) e **também** ignora a modalidade |

**Fato novo desta triagem, que agrava o item 2 sem mudar sua severidade.** A
modalidade **é** coletada do usuário no outro caminho de entrada: `POST
/api/rh/termination-processes` a exige (`terminationValidators.ts:22`,
obrigatória, não-opcional) e a tela `TerminationTab.tsx:301` a envia a partir de
escolha do RH. Portanto o repositório **já contém** a decisão de que a
modalidade é escolha humana — em um caminho. O defeito é de **assimetria entre
dois caminhos que criam a mesma entidade**: um pergunta, o outro presume. Isso
reduz o espaço da dúvida (não é "o sistema nunca soube perguntar"), mas **não a
elimina**: nada versionado diz o que fazer quando o processo nasce a partir da
decisão de contrato, onde a tela não pergunta.

### 1.3 Item 3 — status HTTP (NEEDS_MORE_EVIDENCE)

| Alegação | Âncora | Resultado |
|---|---|---|
| `ConflictError` no conflito de processo aberto | `CreateTerminationProcessUseCase.ts:62-65` | **CONFERE** |
| `ConflictError` → 409 / `CONFLICT` | `errors/index.ts:53-57` | **CONFERE** |
| `BusinessRuleError` → 422 / `BUSINESS_RULE_VIOLATION` | `errors/index.ts:63-67` | **CONFERE** |
| §5.2 documenta 422 para o conflito | `BLOCO_6_RH_API.md:542` | **CONFERE**, literal: `422 \| BUSINESS_RULE_VIOLATION \| Contrato não está em ativo/prorrogado; decision='rescindir' mas já existe TerminationProcess aberto para o funcionário` |
| §6.1 documenta 409 para a mesma regra | `BLOCO_6_RH_API.md:594` | **CONFERE**, literal: `409 \| CONFLICT \| Já existe TerminationProcess aberto (...) para o mesmo employee_id` |
| Condição vizinha da mesma rota usa 422 | `DecideEmployeeContractUseCase.ts:66-68` | **CONFERE** (`BusinessRuleError`, `{ rule: 'RF-RH-016' }`) |
| Não há teste de nível de rota do status efetivo | — | **CONFERE.** Varredura própria: os únicos testes que tocam o 409 são de use case (`rh-admission-termination-use-cases.test.ts:219-227`), não de rota. O `describe('CreateTerminationProcessUseCase')` existe em `:184-237` com 4 testes — a refutação do validador está correta |

**Precisão que esta triagem acrescenta ao item 3 (§8, D-03).** A leitura "o
documento contradiz a si mesmo" é *quase* exata, mas imprecisa no ponto que
importa para remediar: `:542` e `:594` documentam **endpoints diferentes**
(`PATCH /employee-contracts/:id/decision` e `POST /termination-processes`) que
compartilham **o mesmo produtor de erro** (`CreateTerminationProcessUseCase:62-65`,
chamado pelos dois caminhos — §4.1). O código não pode honrar os dois textos ao
mesmo tempo **sem** diferenciar o erro por caminho de chamada. Ou seja: não é
"documento incoerente e código alinhado a metade dele"; é **um único ponto de
lançamento servindo duas especificações incompatíveis**. Isso muda a natureza da
correção (é decisão de contrato, não ajuste de constante) e é o motivo pelo qual
o item 3 permanece fora do plano executável (§5, §6).

---

## 2. Reprodução

### 2.1 Reprodução estática determinística (executada — leitura de código)

A cadeia é fechada, sem ramificação e sem injeção dinâmica; por isso a
reprodução estática é conclusiva. Reconstruída elo a elo no HEAD:

1. `rh.ts:87` → `router.patch('/employee-contracts/:id/decision', authorizeContractDecision, employeeContractController.decide)`.
2. `employeeContractController.ts:88` → `decideContractSchema.parse(req.body)`; `termination_reason` sobrevive ao `.strict()` porque **está** na allow-list (`employeeContractValidators.ts:27`).
3. `:94` → `execute({ id, ...parsed, createdBy })` — o valor **chega** ao use case.
4. `DecideEmployeeContractUseCase.ts:100-107` → chama `createTerminationProcessUseCase.execute({...})` com **7 chaves literais**, nenhuma delas `termination_reason`; `notice_modality: 'trabalhado'`.
5. `CreateTerminationProcessUseCase.ts:67-75` → `repository.create({ employee_id, termination_type, notice_date, notice_modality, termination_date, status: 'aberto', created_by })`.
6. `SequelizeTerminationProcessRepository.create` → `HrTerminationProcess.create(data)` — **pass-through genérico**, sem allow-list própria (relevante para o plano, §4.2).
7. `HrTerminationProcess` não tem atributo de motivo → o Sequelize não teria coluna para gravar mesmo se o valor chegasse; e o banco também não (`00_baseline_frozen.sql:6296-6319`).
8. `employeeContractController.ts:99` → `res.json({ success: true, data })` — **HTTP 200**, com o `TerminationProcess` criado no corpo. Nenhum erro, nenhum aviso.
9. O texto sobrevive **apenas** em `audit_logs.new_values` (`:95-98`), fire-and-forget.
10. Repetindo com processo já aberto: `:62-65` → `ConflictError` → **409**, contra os `422` de `:542`.

### 2.2 Reprodução dinâmica — LACUNA DECLARADA `L-C012-01`

**Não executada, por proibição normativa e por desnecessidade.**
- Proibição: `APR-2026-016` veda a este agente executar suíte, script de diagnóstico ou qualquer comando que abra conexão de banco. Nenhum foi executado.
- Desnecessidade: o defeito é **estrutural** (campo sem coluna; literal no código). Não há caminho de execução em que o valor seja persistido, porque não existe destino para ele.
- Consequência honesta da lacuna: **não medi** o corpo HTTP real nem o status real da rota. Em particular, o **item 3 continua sem prova de nível de rota** — que é exatamente o que a própria `RETEST_SPECIFICATION` do finding pede em `RT-007-D(a)`. Reprodução dinâmica, se desejada, é da VeriCore, contra `erp_evok_audio_test`, **nunca** contra `erp_evok_audio`.

### 2.3 Lacuna adicional `L-C012-02` — impossibilidade de reprodução de ponta a ponta

Mesmo com autorização, um teste ponta-a-ponta desta rota exigiria um
`employee` + `hr_employee_contract` reais. O módulo é **NÃO-PRODUÇÃO** e
`employees` tem **0 registros medidos** (`PRODUCTION_STATUS_MAP.md:95,135,162` —
reconfirmadas por leitura). Qualquer reprodução dinâmica implica **criar dado de
teste**, e portanto só cabe em `erp_evok_audio_test`. Registro para que ninguém
leia "não reproduzido dinamicamente" como "não confirmado".

---

## 3. Causa-raiz demonstrada

### 3.1 ROOT_CAUSE (item 1) — capacidade prometida em três camadas e inexistente na quarta

Não é "esqueceram de passar o campo". Se fosse, passar o campo resolveria — e
não resolve: **não há destino**. A causa-raiz é a **construção do contrato de
entrada de fora para dentro, sem fechamento contra o modelo de dados**, com
quatro camadas concordando entre si e a quinta ausente:

```
doc (:526)  →  tipo do client (api/hr.ts:236)  →  UI (textarea, :355-363)
            →  Zod allow-list (:27)  →  interface do use case (:28)
            ────────────────────────────────────────────────  ✔ prometem
            hr_termination_processes                            ✘ não comporta
```

A prova de que é **estrutural e não descuido de uma linha** é o `.strict()`:
o campo só trafega porque foi **deliberadamente incluído** na allow-list — um
`.strict()` sem essa entrada teria rejeitado o payload com 400 e o defeito
nunca teria existido em silêncio. Ou seja, houve ato positivo de aceitação em
três camadas e nenhum ato de persistência.

**Precedente no mesmo arquivo, que eleva isso de hipótese a padrão
documentado.** O cabeçalho da migration `20260808-000016` registra, por
escrito, que **a mesma classe de lacuna ocorreu antes nesta mesma tabela**:
`:23-28` (`trct_paid_at` faltava apesar de exigido pelo contrato) e `:30-36`
(`concluded_by`/`concluded_at` idem, com a frase *"mesmo padrao de lacuna ja
encontrado 5 vezes pelo AuditorIntegrador nesta migration (achados 1-5), nao
pego porque a tabela nao havia sido lida coluna-a-coluna contra a secao 6.2
especificamente"*). `termination_reason` é a **sexta** ocorrência do mesmo
padrão, na mesma tabela — e a única que ainda está aberta. A
`ROOT_CAUSE_HYPOTHESIS` do finding deixa de ser hipótese: está **confessada em
comentário versionado**.

**SYSTEMIC_FIX_REQUIRED (item 1).** O defeito local é uma coluna faltante; a
causa sistêmica é a **ausência de guarda que reprove "campo aceito por Zod e
nunca persistido"**. Verifiquei as guardas existentes em `server/tests/unit/`:
`audit-coverage-guard`, `docs-path-reference-guard`,
`export-assignment-guard`, `integrity-transaction-guards`,
`model-association-attribute-guard`, `no-orphan-pt-schema-tables`,
`organizational-structure-guard`,
`rh-deactivate-employee-termination-guard`. **Nenhuma** compara allow-list de
validador × atributos de model. `rh-validators.test.ts:78` chega perto — mas
compara **enums** de validador × migration, não a existência de destino. Sem
essa guarda, a sexta ocorrência não será a última. **Isso não é escopo deste
caso**; é observação para OpusCore (`OBS-C012-02`, §9).

### 3.2 ROOT_CAUSE (item 2) — coluna `NOT NULL` preenchida para satisfazer o banco

Cadeia demonstrada, não suposta:

1. `notice_modality` é `allowNull: false` no model (`:24`) e `NOT NULL` no banco (`00_baseline_frozen.sql:6301`), **sem `DEFAULT`** — confirmei no DDL congelado: a linha não tem cláusula `DEFAULT`, ao contrário de `checklist_assets_returned` (`:6309`) e `status` (`:6310`), que têm.
2. `CreateTerminationProcessUseCase:58-60` **rejeita** valor ausente/inválido com `ValidationError` (400).
3. O caminho `decision='rescindir'` **não tem de onde tirar o valor**: a UI não pergunta (`EmployeeContractsTab.tsx:336-371` — só `decision`, `period_2_end_date` e o motivo), o Zod não aceita o campo (`:24-32`, `.strict()`), e nenhum artefato define padrão.
4. Logo, para a chamada compilar e não estourar 400, **algum** valor tinha de ser escrito em `:104`. Foi escrito `'trabalhado'`, sem fonte.

Isso é **decisão de negócio tomada por necessidade técnica** — a definição
exata do que a Regra 6 proíbe. A busca por fonte autoritativa do finding foi
refeita por mim, com resultado igualmente negativo: as três ocorrências de
`notice_modality` em `docs/` (API `:577`, REQUISITOS `:143`, MODELO_DADOS
`:356`) descrevem o campo e **nenhuma** determina a modalidade no término de
experiência; a única com valor concreto traz `indenizado`, para outro endpoint.

**Agravante estrutural verificado por mim (não estava no finding):** não existe
**nenhum** ponto de correção posterior. Enumerei as 16 rotas de
`rh.ts:84-99` — as escritas em `hr_termination_processes` são
`POST /termination-processes` (criação), `request-aso`, `aso-confirmation`,
`trct`, `esocial-confirmation` e `conclude`; **nenhuma** aceita
`notice_modality`. E, ao contrário de `hr_employee_contracts`, esta tabela
**não** tem trigger de imutabilidade (busca própria por `hr_lock`/`hr_block` no
DDL congelado: as funções são `hr_lock_employee_contract` `:2730`,
`hr_lock_job_history` `:2762`, `hr_lock_vacation_accrual_period` e
`hr_block_delete_employee_benefit` — **nenhuma para
`hr_termination_processes`**). Conclusão de duas pontas: o valor presumido é
**incorrigível pela API** e, simultaneamente, **alterável por SQL direto sem
trava** — o pior par possível para prova documental trabalhista. Isso confirma
e reforça a observação do validador ("rota de correção AUSENTE") por caminho
independente, e acrescenta a metade que faltava.

### 3.3 ROOT_CAUSE (item 3) — um lançador, duas especificações

`CreateTerminationProcessUseCase:62-65` é o **único** ponto que lança o
conflito, e é alcançado por **dois** caminhos com **dois** contratos
publicados (§1.3). A causa-raiz é a **reutilização do use case sem
reconciliação dos contratos de erro dos dois endpoints** — não um erro de
mapeamento em `errors/index.ts`, que está internamente coerente
(`ConflictError`→409, `BusinessRuleError`→422, verificado). Qualquer correção
exige antes fixar **qual texto é autoritativo**, e isso não é derivável do
repositório (Regra 21).

---

## 4. Blast radius

### 4.1 Call sites (contagem própria, varredura em `*.ts`/`*.tsx`)

| Símbolo | Call sites de produção | Call sites de teste |
|---|---|---|
| `DecideEmployeeContractUseCase` | **1** — `employeeContractController.ts:89-93` (instanciação) + `:94` (`execute`) | 5 instanciações em `rh-contract-use-cases.test.ts:89,103,118,127,134` |
| `CreateTerminationProcessUseCase` | **2** — `employeeContractController.ts:91` (injetado no `Decide`) e `terminationController.ts:86` (`POST /termination-processes`, com `...parsed` + `hireDate` + `createdBy`) | 4 instanciações em `rh-admission-termination-use-cases.test.ts:194,210,221,231` |
| `HrTerminationProcess` (model) | repositório único: `SequelizeTerminationProcessRepository` (`findAndCount`, `findById`, `findOpenByEmployeeId`, `create`, `update`) | `rh-validators.test.ts`, `rh-admission-termination-use-cases.test.ts` |
| Consumidores de leitura do processo | `GET /termination-processes` e `GET /termination-processes/:id` → `findByPk` **sem `attributes`** → devolve **todas** as colunas | `TerminationTab.tsx:183` exibe `notice_modality` |

**Consequência operacional do último item, favorável ao plano:** como o `GET`
não restringe `attributes` e o repositório `create` é pass-through
(`HrTerminationProcess.create(data)`, sem allow-list), uma coluna nova
**aparece automaticamente** em `GET /termination-processes/:id` e é gravável
**sem tocar no repositório**. Isso contraria, para melhor, a previsão do
finding de que "a remediação exige migration + model + repositório + use case":
o **repositório não precisa mudar** (§8, D-01).

### 4.2 O que quebra se a correção for feita

| Dimensão | Avaliação |
|---|---|
| **Contrato HTTP** | Inalterado no item 1 (campo novo **na resposta**, aditivo; nenhum consumidor quebra por campo extra — `client/src/api/hr.ts:256-280` é interface TS, tolerante a campo não declarado em runtime). No item 3, **qualquer** correção muda status observável por cliente — motivo adicional para não fazê-la sem decisão. |
| **Regra de negócio** | Item 1: nenhuma alteração de fluxo (gates de ASO/checklist/`conclude` intocados). Item 2: **muda comportamento observável** se a modalidade passar a ser parametrizável ou a mudar de valor padrão. |
| **Schema** | Item 1 exige **migration nova** (única mudança de schema prevista). Item 2 **não** exige schema (o enum já tem os dois valores). Item 3 não exige. |
| **Migrations / baseline** | A última migration do repositório é `20260812-000047-hr-absences-open-unique.cjs`. Uma migration nova, com timestamp posterior, roda normalmente **tanto** em banco novo **quanto** em banco existente: `20260731-000001-baseline-schema.cjs` aplica o dump congelado e marca **as 160 do conjunto congelado** como aplicadas, deixando as posteriores rodarem de verdade (mecanismo lido no cabeçalho `:23-37` e `:46-53`). **`00_baseline_frozen.sql` NÃO deve ser editado** por este caso — é o dump congelado que resolveu o drift de 29 colunas; alterá-lo reabre aquele risco. Se o repositório tiver convenção de "refresh do dump", ela é de OpusCore e é gate separado. |
| **Aplicação da migration em produção** | Fora do alcance deste agente e deste caso (`APR-2026-016`): eu **não** apliquei nem verifiquei fila real. Registro que o módulo é NÃO-PRODUÇÃO e a tabela tem 0 uso real, o que torna a coluna nova aditiva e sem backfill — **mas a decisão e a execução do deploy de schema é humana**. |
| **Teste que quebra por desenho** | `rh-contract-use-cases.test.ts:107-109` **quebra necessariamente** se a modalidade deixar de ser `'trabalhado'` fixo (item 2). Se o item 2 ficar como está e só o item 1 for feito, `objectContaining` **não** quebra ao ganhar a chave nova — o teste passa sem provar nada, o que é exatamente o vício apontado em `RT-007-A(c)`; o teste novo tem de ser escrito com asserção que **falharia** na omissão. |
| **Guarda `export-assignment-guard`** | **Armadilha nomeada.** `DecideEmployeeContractUseCase.ts` usa `export =` (`:111`) e a interface de input é **deliberadamente local** (comentário `:19-23`). Se o engineer "melhorar" exportando a interface para tipar o campo novo, o teste `export-assignment-guard.test.ts` reprova **e**, pior, o efeito real é `ReferenceError` em runtime no boot (o incidente de 2026-08-09 descrito em `:1-31` daquele arquivo). Vale idem para `CreateTerminationProcessUseCase.ts:24-28,95`. |
| **Guarda `model-association-attribute-guard`** | Sem impacto: uma coluna nova com nome igual ao atributo não cria atributo-fantasma (a guarda checa dois atributos para a mesma coluna). |
| **Guarda de drift model × banco** | `tests/integration/schema-model-drift-guard.test.ts` compara nulabilidade model × banco e **só roda com `RUN_INTEGRATION`** (nota em `model-association-attribute-guard.test.ts:26-28`). Se a coluna nova entrar no model com nulabilidade diferente da migration, essa guarda reprova. **Ela exige banco** — logo é execução da VeriCore/engineer autorizado contra `erp_evok_audio_test`, **nunca** `erp_evok_audio`. Eu não a executei. |
| **`payment_deadline`** | Intocado em qualquer cenário: é `GENERATED ALWAYS AS ((termination_date + 10)) STORED` e não depende de nada que este caso altere (`RT-007-E` satisfeito por construção). |
| **Simetria com o outro endpoint** | Se `termination_reason` passar a existir na coluna, surge a pergunta derivada: `POST /termination-processes` (`createTerminationSchema:18-24`, `.strict()`, **sem** o campo) passa a aceitá-lo? Hoje **não** aceita. Deixar assimétrico cria a situação inversa (coluna existe, um caminho não pode preenchê-la). **Não decido** — está em §6, Q1c. |

### 4.3 FILES_AFFECTED — previsão da triagem (não instrução fechada)

Cenário "persistir o motivo" (item 1), o único parcialmente executável:

```
server/migrations/2026xxxx-0000xx-hr-termination-add-termination-reason.cjs   (NOVO)
server/src/models/HrTerminationProcess.ts                                    (+1 atributo)
server/src/modules/rh/application/use-cases/termination/
    CreateTerminationProcessUseCase.ts        (interface local + repasse ao create)
server/src/modules/rh/application/use-cases/contract/
    DecideEmployeeContractUseCase.ts          (repassar input.termination_reason em :100-107)
server/tests/unit/rh-contract-use-cases.test.ts                (teste novo; NÃO relaxar :107)
server/tests/unit/rh-admission-termination-use-cases.test.ts   (cobertura do repasse)
[condicional a Q1c]  server/src/modules/rh/presentation/validators/terminationValidators.ts
[condicional/OpusCore] client/src/api/hr.ts (tipo TerminationProcess), client/src/pages/hr/TerminationTab.tsx (exibição)
[OpusCore, não SanaCore] docs/business/BLOCO_6_RH_API.md §5.2/§6, BLOCO_6_RH_MODELO_DADOS.md
NÃO TOCAR: server/database/postgresql/00_baseline_frozen.sql
```

Itens 2 e 3 **não têm `FILES_AFFECTED` fechável** antes da decisão humana: o
conjunto muda conforme a resposta (ex.: "sempre trabalhado" ⇒ só comentário +
BR-ID; "parametrizável" ⇒ Zod + UI + use case + testes + doc).

---

## 5. Plano de correção — separado por dependência de decisão

### 5.1 O que é executável **sem** decisão do dono

**Nada dos três itens, isoladamente, é integralmente executável.** O que é
executável sem decisão de negócio é apenas o **preparatório verificável**:

| # | Ação | Por que não depende de decisão |
|---|---|---|
| P-1 | Criar worktree/branch `sana/ERP-LEGACY-001/CASE-012` (Regra 11) | Processo, não conteúdo |
| P-2 | Escrever um teste **red** que documenta o descarte: `execute({ decision: 'rescindir', termination_reason: 'X' })` e asserção de que `X` chega ao `CreateTerminationProcessUseCase` — hoje **falha** | Não afirma qual é a regra; apenas prova o comportamento atual contra o contrato **já publicado** em `:526`. Fica *skipado/pendente* até a decisão, ou entra junto com a correção |
| P-3 | Nenhuma alteração em `docs/`, `audit/`, `coretriad/` | Ownership (Regra 16) |

Deliberadamente **não** incluo "criar a coluna já, é aditivo e o módulo está
vazio": criar coluna cuja **natureza** (enum × texto livre) e **obrigatoriedade**
estão em disputa (Q1a/Q1b) produziria migration provavelmente errada — e
migration errada em tabela trabalhista é dívida pior que a atual.

### 5.2 O que depende de decisão humana (bloqueante)

| Item | Depende de | Efeito de decidir sem o dono |
|---|---|---|
| 1 | Q1a, Q1b, Q1c (§6) | Coluna com tipo/semântica inventados; contrato de API "corrigido" por SanaCore, que não é dono de `docs/` |
| 2 | Q2a, Q2b (§6) | **Violação direta da Regra 6**: seria trocar uma presunção sem fonte por outra presunção sem fonte |
| 3 | Q3a (§6) | Mudança de status HTTP observável por cliente, escolhendo entre dois documentos versionados sem autoridade para isso (Regras 20-21) |

### 5.3 Estágios propostos, condicionados

- **Estágio 0 (agora):** registro das perguntas de §6 e roteamento ao
  `coretriad-director` para o gate humano. Nada de código.
- **Estágio 1 (após Q1a-c):** migration + model + repasse no use case + testes
  de `RT-007-A`; ou, se a decisão for "não persistir", `RT-007-B` (remover o
  campo do Zod/interface **e** pedir a OpusCore a correção de `:526`, **mais**
  a remoção do `<textarea>` de `EmployeeContractsTab.tsx:355-363`, que hoje
  promete ao usuário algo que deixaria de existir).
- **Estágio 2 (após Q2a-b):** materializar a modalidade conforme decidido, com
  BR-ID citado no código e o teste `:107-109` **atualizado para citar a fonte**
  — nunca uma literal anônima.
- **Estágio 3 (após Q3a e após o item 3 sair de NEEDS_MORE_EVIDENCE):** alinhar
  status HTTP e documento. **Bloqueado duas vezes:** por decisão humana **e**
  pelo próprio estado de confiança do finding (Regra 22 — o encaminhamento do
  validator devolveu o item 3 ao autor).

Nenhum estágio altera `audit/`, `coretriad/governance/`, `coretriad/states/`,
`00_baseline_frozen.sql` ou `.claude/`.

---

## 6. Perguntas ao responsável humano (formuladas, **não** respondidas)

Regra 6 e Regra 21. Cada pergunta traz o que o repositório **já** diz, para a
decisão ser informada — sem que a triagem escolha.

**Q1a — O motivo da rescisão deve ser persistido no processo de demissão?**
O contrato `:526` e a UI (`:355-363`) prometem que sim; o schema não comporta.
Alternativas: (i) criar a coluna; (ii) declarar que o motivo vive só em
`audit_logs` e **remover** a promessa do contrato, do Zod e da tela.
*Nota factual, não recomendação:* o módulo `juridico` já resolveu o análogo com
coluna própria + CHECK (`jur_contracts.termination_reason`), o que é precedente
interno de forma — não de obrigação.

**Q1b — Se persistido: código de enum ou narrativa livre?**
O exemplo do contrato usa `"termino_experiencia"` (valor de enum de
`termination_type`); o Zod aceita qualquer string ≤1000; a tela oferece
`<textarea>` livre rotulado "Motivo (opcional)". As três camadas divergem entre
si. Consequência prática: enum ⇒ nova ENUM/CHECK e a UI muda para `select`;
texto livre ⇒ `TEXT` e a tela permanece.

**Q1c — Obrigatório e simétrico?**
O motivo deve ser **obrigatório** na rescisão por término de experiência (como
`jur_contracts` exige por CHECK) ou opcional (como a tela diz hoje)? E
`POST /api/rh/termination-processes` — o outro caminho de criação, hoje
`.strict()` sem o campo — passa a aceitá-lo, para não nascer coluna preenchível
por um caminho só?

**Q2a — Qual é a modalidade de aviso prévio no término de contrato de
experiência, e com que fundamento versionado?**
Nada no repositório determina. O único exemplo documentado do campo traz
`indenizado` (`:577`, outro endpoint); o código fixa `trabalhado`; o outro
caminho de criação **pergunta ao RH** (`TerminationTab.tsx:301`).

**Q2b — A modalidade deve ser escolha do RH também neste caminho, ou padrão de
sistema?**
Se escolha: entra em `decideContractSchema` e na tela de decisão. Se padrão:
exige BR-ID com owner nominal, e a assimetria com o outro endpoint passa a ser
**decisão registrada** em vez de acidente. Em ambos os casos, `BLOCO_6_RH_API.md`
§5.2 (hoje omisso) precisa passar a dizê-lo — e `docs/` é de OpusCore.

**Q3a — Para "já existe processo de demissão aberto", o status autoritativo é
409 ou 422?**
Dois documentos versionados discordam (`:542` = 422, `:594` = 409) e o código
lança um único erro para os dois endpoints. Sub-pergunta que a decisão deve
resolver explicitamente: **o mesmo conflito pode devolver status diferente
conforme o endpoint**, ou deve ser unificado?

**Q4 (processo, ao `coretriad-director`, não ao dono) — o item 3 entra neste
caso?**
O `vericore-finding-validator` o devolveu ao autor como
`NEEDS_MORE_EVIDENCE` e determinou "NÃO segue à SanaCore antes das correções".
Mantê-lo aqui como **fora do plano executável** é minha leitura da Regra 22;
reagrupá-lo em outro caso é decisão de orquestração.

**Onde as respostas devem morar** (Regras 17-18): `coretriad/governance/APPROVALS.md`
como APR-ID, e a regra resultante como **BR-ID com owner nominal** em artefato
versionado de negócio. Não escrevo em nenhum dos dois — não são meus (Regra 16).

---

## 7. Testes de regressão previstos

Alinhados à `RETEST_SPECIFICATION` do finding, com a mecânica de asserção
verificada nesta triagem.

| ID | Teste | Condicionado a | Observação técnica vinculante |
|---|---|---|---|
| TR-01 | `Decide...execute({ decision:'rescindir', termination_reason:'X' })` → `createTermination.execute` recebe `termination_reason:'X'` | Q1a=persistir | Usar `toHaveBeenCalledWith` **exato** ou `objectContaining` **contendo a chave**. `objectContaining` sem a chave (defeito atual de `:107`) **passaria mesmo com o campo descartado** |
| TR-02 | Rescisão **sem** `termination_reason` continua criando o processo | Q1c=opcional | Anti-regressão do caminho atual; se Q1c=obrigatório, o teste inverte para "400/422 quando ausente" |
| TR-03 | `CreateTerminationProcessUseCase` repassa o motivo ao `repository.create` | Q1a | O `create` do repositório é pass-through; a prova cabe no use case |
| TR-04 | Valor recuperável em `GET /termination-processes/:id` | Q1a | Automático pelo `findByPk` sem `attributes`; ainda assim exige prova (integração, banco de **teste**) |
| TR-05 | Envio do campo **não** é silenciosamente aceito | Q1a=não persistir (`RT-007-B`) | Alternativa mutuamente exclusiva a TR-01 |
| TR-06 | Modalidade conforme a decisão: se parametrizável, `indenizado` produz `indenizado` e ausência aplica o padrão documentado; se fixa, `:107-109` permanece **com citação do BR-ID** | Q2a/Q2b | Este é o único teste que **substitui** uma asserção existente — hoje ela congela regra sem fonte |
| TR-07 | Status HTTP efetivo da rota para "processo já aberto", em **ambos** os endpoints | Q3a **e** saída do item 3 do `NEEDS_MORE_EVIDENCE` | Teste de **nível de rota** — a lacuna real que sobreviveu à validação. Exige app/supertest |
| TR-08 | `payment_deadline` inalterado; fluxo de `conclude` (RF-RH-022) inalterado | sempre | `RT-007-E`; coluna gerada não depende de nada deste caso |
| TR-09 | Guardas estruturais verdes: `export-assignment-guard`, `model-association-attribute-guard`, `rh-validators` | sempre | `export-assignment-guard` é a armadilha real (§4.2) |
| TR-10 | Drift model × banco da coluna nova | Q1a=persistir | `tests/integration/schema-model-drift-guard.test.ts`, **só** com `RUN_INTEGRATION` e **só** contra `erp_evok_audio_test` |

**Todos** exigem execução de suíte — logo **nenhum** foi executado por mim
(`APR-2026-016`). São especificação para o engineer/VeriCore, não resultado.

---

## 8. Divergências registradas (Regra 7 — artefato vence despacho; Regras 15-16 — nada corrigido em artefato alheio)

| # | Divergência | Tratamento |
|---|---|---|
| D-01 | O finding afirma (§ITEM 1, e `ROOT_CAUSE_HYPOTHESIS`) que a remediação "exige migration + model + **repositório** + use case". `SequelizeTerminationProcessRepository.create` é `HrTerminationProcess.create(data)` — pass-through sem allow-list: **o repositório não precisa mudar**. | Registrado. Reduz o escopo previsto; nada corrigido no finding (VeriCore). |
| D-02 | O finding diz que o motivo "não aparece em `GET /termination-processes/:id`". Verdadeiro **hoje** (não há coluna), mas a razão declarada induz a crer que seria preciso mudar o `GET`: o `findByPk` **não** restringe `attributes`, então a coluna nova apareceria sozinha. | Registrado; simplifica `RT-007-A(b)`. |
| D-03 | A validação enquadra o item 3 como "documento contradizendo a si mesmo, código e suíte alinhados a `:594`". Preciso, mas incompleto: `:542` e `:594` descrevem **endpoints diferentes** servidos pelo **mesmo lançador** — o código não pode honrar ambos sem diferenciar por caminho. | Registrado (§1.3). Não altera o `NEEDS_MORE_EVIDENCE`; **agrava** a dependência de decisão. |
| D-04 | O finding trata `notice_modality` como "não decidida por ninguém". Verdadeiro no caminho da decisão de contrato; **falso** no caminho `POST /termination-processes`, onde o RH escolhe (`terminationValidators.ts:22`, `TerminationTab.tsx:301`). O defeito é de **assimetria**, o que é mais preciso e mais fácil de remediar. | Registrado (§1.2). Fato novo desta triagem. |
| D-05 | O finding não menciona que `hr_termination_processes` **não tem trigger de imutabilidade** (ao contrário de `hr_employee_contracts`). Isso corta para os dois lados (incorrigível pela API, alterável por SQL direto). | Registrado (§3.2). Relacionado a `FIND-ERP-002`; **não** endereçado aqui. |
| D-06 | O finding não menciona a armadilha `export =` / `export interface` dos dois use cases envolvidos, que é a única forma de a correção derrubar o **boot do servidor**. | Convertido em restrição vinculante de desenho (§4.2). |
| D-07 | Casos anteriores usam `TRIAGE.md` (CASE-001, CASE-009) e `TRIAGE_REPORT.md` (CASE-004). O despacho pediu `TRIAGE.md`. | Seguido o despacho. Registrado para padronização pelo director. |

---

## 9. Observações para outras organizações (roteamento, não correção)

- **`OBS-C012-01` (OpusCore, `docs/`)** — `BLOCO_6_RH_API.md` §5.2 é **omisso**
  sobre `notice_modality` no efeito de `rescindir`, e `:542` × `:594` divergem
  quanto ao status do mesmo conflito. Documento é de OpusCore; **nada alterado**.
- **`OBS-C012-02` (OpusCore, `server/tests/`)** — não existe guarda que reprove
  "campo na allow-list de um validador `.strict()` sem destino no model". É a
  rede que faltou nas **6** ocorrências do mesmo padrão nesta tabela
  (5 confessadas no cabeçalho da migration `20260808-000016` + esta). Guarda
  estrutural, sem banco, seria viável — mas é escopo de OpusCore, não deste caso.
- **`OBS-C012-03` (client)** — `EmployeeContractsTab.tsx:355-363` promete ao
  usuário um campo que não persiste. Qualquer resposta a Q1a exige mexer nessa
  tela (ou para passar a persistir, ou para remover a promessa). Marcado para
  que a decisão inclua o front, e não só o back.

---

## 10. O que este caso NÃO cobre (explícito)

1. **Item 3** — permanece fora do plano executável: `NEEDS_MORE_EVIDENCE` +
   decisão humana pendente (Q3a).
2. **Imutabilidade da trilha e da tabela** (`FIND-ERP-002`) — a ausência de
   trigger em `hr_termination_processes` é registrada, **não** remediada.
3. **`audit_logs` como fonte do motivo** — nada é feito para tornar o
   `audit_logs` consultável no fluxo de RH; ele continua trilha técnica
   fire-and-forget.
4. **Aplicação de migration em qualquer banco** — nenhuma foi criada, alterada
   ou aplicada; nenhuma conexão foi aberta. Deploy de schema é gate humano.
5. **`00_baseline_frozen.sql`** — intocado e a ser mantido intocado.
6. **Correção de `docs/business/**`** — ownership OpusCore (Regra 16).
7. **Qualquer BR-ID novo** — SanaCore não cria regra de negócio (Regra 6).
8. **`FINDING CLOSED`, `RETEST_PASSED`, `RISK_ACCEPTED`** — autoridade exclusiva
   da VeriCore / do dono (Regras 3, 4, 24). Nada disso é declarado aqui.

---

## 11. Autoavaliação do critério de conclusão da triagem

| Exigência | Estado |
|---|---|
| Cada âncora reconfirmada no HEAD | **Sim** — §1, 26 âncoras, todas conferidas; drift zero verificado por `git diff` |
| Reprodução | **Estática, conclusiva** (§2.1). Dinâmica **não** executada — lacunas `L-C012-01` e `L-C012-02` declaradas |
| Causa-raiz demonstrada, não hipótese | **Sim** — item 1: promessa em 4 camadas × ausência da 5ª, com o padrão **confessado por escrito** no cabeçalho da migration (5 precedentes na mesma tabela); item 2: cadeia `NOT NULL` sem `DEFAULT` → validação 400 → nenhuma fonte de valor → literal; item 3: lançador único servindo duas especificações |
| Blast radius mapeado | **Sim** — §4: 1 e 2 call sites de produção, 9 de teste, `FILES_AFFECTED`, quebra de teste prevista, 3 armadilhas nomeadas |
| Plano separando executável × dependente de decisão | **Sim** — §5, com a conclusão honesta de que quase nada é executável hoje |
| Testes de regressão previstos | **Sim** — §7, 10 itens, cada um com sua condicionante |
| Risco de regressão avaliado | **Sim** — §12 |
| `APR-2026-016` respeitada | **Sim** — nenhuma conexão de banco, nenhuma suíte, nenhum script |
| Escrita restrita a `remediation/cases/ERP-LEGACY-001-CASE-012/` | **Sim** |

---

## 12. REGRESSION_RISK

| Item | Risco | Fundamento |
|---|---|---|
| Item 1 (persistir o motivo) | **BAIXO-MÉDIO** | Baixo em comportamento: campo aditivo, gates intocados, repositório e `GET` não mudam, tabela com 0 uso real. O médio vem de **schema** (migration nova em tabela trabalhista, com a guarda de drift model×banco só ativa sob `RUN_INTEGRATION`) e da armadilha `export =` (§4.2), cujo modo de falha é **derrubar o boot do servidor**, não um teste vermelho. |
| Item 2 (modalidade) | **MÉDIO** | Muda comportamento observável e **exige** reescrever uma asserção existente. O risco maior não é técnico: é **normativo** — implementar antes da decisão substitui uma presunção sem fonte por outra, com aparência de correção. E o valor gravado é **incorrigível pela API** (§3.2), logo o erro fica registrado no processo. |
| Item 3 (status HTTP) | **BAIXO tecnicamente, ALTO em contrato** | Um `throw` a menos/a mais é trivial; mas muda status observável por cliente e, se unificado, altera **dois** endpoints documentados — um deles com o texto que hoje **bate** com o código (`:594`). Corrigir "para o lado errado" cria divergência nova onde hoje há coerência parcial. |
| Risco de **não** fazer nada | **BAIXO hoje, imediato e retroativo depois** | `employees` = 0, `rh` NÃO-PRODUÇÃO: exposição atual nula (reconfirmado em `PRODUCTION_STATUS_MAP.md:95,135,162`). A partir da primeira admissão real, cada rescisão nasce sem motivo no processo e com modalidade presumida, sem via de correção pela API. Este é o argumento para resolver **antes** do módulo entrar em produção — não é argumento para resolver **sem** a decisão. |

---

## VEREDITO

**CASO BLOQUEADO POR DECISÃO HUMANA.**

Causa-raiz dos itens 1 e 2 está **demonstrada** (não hipótese), blast radius
mapeado, plano e testes especificados, risco avaliado. Mesmo assim o caso
**não** está pronto para despacho de implementação:

1. **Item 1** depende de Q1a/Q1b/Q1c — a natureza, a obrigatoriedade e a
   simetria do campo não são determináveis por artefato: as camadas versionadas
   divergem entre si (enum no exemplo do contrato × string livre no Zod ×
   `<textarea>` "opcional" na tela).
2. **Item 2** depende de Q2a/Q2b — implementar qualquer modalidade sem decisão
   registrada é **inventar regra de negócio trabalhista** (Regra 6), o vício que
   é o próprio conteúdo do finding.
3. **Item 3** está duplamente bloqueado: `NEEDS_MORE_EVIDENCE` (Regra 22,
   encaminhamento do validator) **e** decisão humana pendente (Q3a).

Executável desde já, sem decisão: **apenas** o preparatório de §5.1 (branch e
teste *red* que documenta o descarte contra o contrato já publicado). Não há
recorte do finding que se feche sem gate humano.

**PRÓXIMO ELO:** `coretriad-director` — rotear Q1a-c, Q2a-b e Q3a ao
responsável humano, registrar as respostas como APR-ID em
`coretriad/governance/APPROVALS.md` e as regras resultantes como BR-ID com owner
nominal. Somente então este caso segue ao `sanacore-remediation-engineer` em
`sana/ERP-LEGACY-001/CASE-012`.

*Produzido por `sanacore-remediation-triage`. Nenhum arquivo fora de*
*`remediation/cases/ERP-LEGACY-001-CASE-012/` foi criado ou alterado. Nenhuma*
*conexão de banco foi aberta. Nada aqui declara `FINDING CLOSED`,*
*`RETEST_PASSED` ou `RISK_ACCEPTED`.*

---

## 13. ADENDO — build local `server/dist/` (corroboração NÃO normativa)

Registrado após o corpo principal, por completude e para não parecer omissão de
uma leitura que fiz.

**Status do artefato:** `server/dist/` é **ignorado pelo git**
(`.gitignore:10` → `server/dist/`) e tem **0 arquivos versionados**
(`git ls-files server/dist` → vazio). Portanto **não é fonte oficial de verdade**
(Regra 7) e **nada** nesta triagem se fundamenta nele. Nenhuma conclusão de §1-§12
muda.

**O que a leitura mostrou** (build local, não versionado):

| Arquivo compilado | Linha | Conteúdo |
|---|---|---|
| `server/dist/src/modules/rh/application/use-cases/contract/DecideEmployeeContractUseCase.js` | `:78` | `notice_modality: 'trabalhado'` |
| `server/dist/src/modules/rh/presentation/validators/employeeContractValidators.js` | `:27` | `termination_reason: zod_1.z.string().trim().max(1000).optional()` |
| mesmo arquivo compilado do use case | — | **nenhuma** leitura de `termination_reason` |

Ou seja, o build local reproduz os itens 1 e 2 **exatamente** como o fonte —
corroboração por artefato independente de que não há etapa de compilação,
decorator ou transform que injete o campo ou derive a modalidade.

**Duas consequências operacionais para o engineer** (não para o mérito):

1. **Não citar `dist/` como evidência** em `REMEDIATION_RESPONSE` — não é
   versionado e não é auditável pela VeriCore.
2. **Build obsoleto é risco de falso negativo na verificação.** Corrigir `src/`
   sem rebuild deixa `dist/` com o defeito. Isso tem precedente relevante neste
   repositório: a migration de baseline **gerava** schema a partir de
   `dist/src/models/*.js` até `e2a8d7e` (cabeçalho de
   `20260731-000001-baseline-schema.cjs:6-14`) — prática abandonada justamente
   por depender de "quando o bootstrap rodou". Hoje o baseline é DDL estático e
   **não** consome `dist/`, então **este caso não tem dependência de `dist/`**;
   ainda assim, qualquer verificação manual deve ser feita sobre `src/` ou sobre
   build refeito, nunca sobre o `dist/` encontrado no working tree.

Nenhum comando de build foi executado. Nenhum arquivo de `server/dist/` foi lido
para fundamentar decisão, alterado ou removido.
