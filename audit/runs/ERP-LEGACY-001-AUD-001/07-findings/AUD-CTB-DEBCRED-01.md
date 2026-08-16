# FINDING

```
FINDING_ID:   AUD-CTB-DEBCRED-01
AUDIT_ID:     ERP-LEGACY-001-AUD-001
PROJECT_ID:   ERP-LEGACY-001
AUDIT_COMMIT: c1311a6f76b512fef893f7e60d934179cae3409f
```

**TITLE:** `accounting_entry_items.debit`/`credit` são `numeric(15,2) DEFAULT 0 NOT NULL`
**sem CHECK de sinal e sem exclusividade mútua no banco**. A invariante existe **apenas
na camada de aplicação**. Se uma linha violadora entrar por qualquer caminho que não os
dois use cases (SQL direto, migration, seed, script, código futuro), **débito e crédito
passam a ter duas semânticas conforme quem lê**: o postador **ignora** valores `<= 0` e
declara o lançamento balanceado; o balancete **soma o valor cru** e produz saldo diferente.

**DOMAIN:** contabilidade / integridade de dados
**SUBDOMAIN:** invariante de partida dobrada sem enforcement no schema · leitores
divergentes sobre a mesma coluna
**SEVERITY:** **HIGH** — **fixada por decisão humana do dono nesta sessão**, com o
enquadramento: *"risco de corromper silenciosamente o balancete contábil"*. **Este agente
NÃO a reavalia para baixo.** ⚠ **Registro divergência técnica parcial em §3** — encontrei
um controle compensatório de aplicação que o encargo não mencionava e que **reduz
substancialmente a alcançabilidade** do defeito. **A severidade permanece HIGH conforme
determinado; a divergência fica registrada, não conciliada** (Regra 20).
**CONFIDENCE:** `CONFIRMED` quanto ao **fato de schema** (DDL lido literalmente; ausência
de CHECK provada por grep integral das constraints da tabela) · `MEDIUM` quanto à
**materialização do dano** — depende de um caminho de escrita fora dos dois use cases,
cuja existência **não** foi demonstrada no `AUDIT_COMMIT` (§3.4).
**STATUS:** `PROPOSED`
**ENVIRONMENT:** **DEV/HOMOLOGAÇÃO** — `accounting` classificado **NÃO-PRODUÇÃO**, sem
lançamentos de origem real (§5).
**GATILHO DE REAVALIAÇÃO NOMEADO:** **na promoção do módulo `accounting` a produção real
— operacionalmente, no primeiro lançamento contábil postado sobre operação real da
empresa, ou na primeira apuração de balancete usada para fim contábil/fiscal — esta
severidade passa a BLOQUEANTE de release.** Gatilho adicional, independente e anterior:
**qualquer script, migration ou rotina de importação que passe a escrever em
`accounting_entry_items` sem atravessar `CreateEntryUseCase`/`UpdateEntryUseCase`
dispara a reavaliação imediatamente**, porque é exatamente o controle compensatório de
§3 que estaria sendo contornado.
**DETECTED_BY:** `T-31_C137_SEMANTICA_COLUNA.md` §`AUD-DB-T31-02`
(`vericore-database-auditor`) → **promovido a finding formal** por
`vericore-audit-evidence-controller` (esta análise, releitura própria integral).

---

## CABEÇALHO NORMATIVO OBRIGATÓRIO

1. **Autorização humana explícita (Regra 18).** Promoção **e severidade HIGH**
   determinadas por decisão direta do dono nesta sessão. **Não reavaliada para baixo.**
2. **Regra 20 — DIVERGÊNCIA REGISTRADA, NÃO CONCILIADA.** O encargo descreve o defeito
   como *"sem exclusividade mútua"* e afirma que `PostEntryUseCase` *"ignora a linha
   negativa no confronto de saldo"*. **Ao reverificar, encontrei em disco um controle
   compensatório de aplicação — `validateEntryItemsShape.ts` — que impõe exclusividade
   mútua E não-negatividade nos dois caminhos de escrita conhecidos** (§3). Isso
   **contradiz parcialmente a premissa do encargo**. Conforme a Regra 20, **registro a
   divergência em vez de silenciá-la**, e **conforme a instrução do dono, mantenho a
   severidade HIGH sem alterá-la**. A adjudicação cabe ao `vericore-finding-validator` e
   ao director — não a mim.
3. **Regra 22 — validação adversarial NÃO OCORREU.** Sendo HIGH, é **obrigatória antes
   de qualquer remediação**. Este finding a requer **com particular urgência**, dado o
   item 2.
4. **Regra 2 — nada foi corrigido.** `server/` e `server/database/` **apenas lidos**.
5. **Regras 4 e 14 — nenhum `FINDING CLOSED`, `RETEST_PASSED` ou `AUDIT_PASSED`.**
6. **Nenhum comando de banco executado** (`APR-2026-016`, `APR-2026-021` Parte D). Leitura
   de schema é sobre o **baseline congelado versionado**.

---

## 1. O FATO DE SCHEMA — literal, e a prova de ausência

`server/database/postgresql/00_baseline_frozen.sql:3176-3186`:

```sql
CREATE TABLE public.accounting_entry_items (
    id integer NOT NULL,
    entry_id integer NOT NULL,
    account_id integer NOT NULL,
    cost_center_id integer,
    debit numeric(15,2) DEFAULT 0 NOT NULL,      -- :3181
    credit numeric(15,2) DEFAULT 0 NOT NULL,     -- :3182
    historical text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

As âncoras `:3181-3182` do encargo **conferem exatamente**.

**Prova de ausência de CHECK — por enumeração completa, não por amostragem.** Grep de
`accounting_entry_items` em todo o baseline retorna **todas** as constraints e índices da
tabela:

| Constraint / índice | Tipo | Âncora |
|---|---|---|
| `accounting_entry_items_pkey` | PRIMARY KEY (id) | `:16498-16499` |
| `accounting_entry_items_account_id_fkey` | FK → `accounting_chart_of_accounts` · `ON DELETE RESTRICT` | `:22287-22288` |
| `accounting_entry_items_cost_center_id_fkey` | FK → `cost_centers` · **`ON DELETE SET NULL`** | `:22295-22296` |
| `accounting_entry_items_entry_id_fkey` | FK → `accounting_entries` · `ON DELETE CASCADE` | `:22303-22304` |
| `idx_..._account_id`, `idx_..._cost_center_id`, `idx_..._entry_id` | índices btree | `:18684,18691,18698` |

**Nenhuma `CHECK` constraint existe sobre esta tabela.** Nem de sinal (`debit >= 0`), nem
de exclusividade mútua (`NOT (debit > 0 AND credit > 0)`), nem de obrigatoriedade
(`debit > 0 OR credit > 0`). **A prova é exaustiva sobre o baseline versionado.**

**Contraste que estabelece a régua interna, e não é retórico:** o **mesmo repositório**
usa CHECK constraint em problema análogo —
`chk_bank_statement_entries_single_match` (`00_baseline_frozen.sql:3760`), que impõe no
banco a exclusividade de vínculo de conciliação. **O time sabe impor invariante no
schema, e o fez no subsistema vizinho.** Em contabilidade, não fez.

**Nota herdada, não reverificada (Regra 20):** `T-31:110` registra que
`cost_center_id ON DELETE SET NULL` (`:22296`) *"desclassifica partidas históricas"* —
apagar um centro de custo silenciosamente desclassifica lançamentos passados. **Confirmei
a existência da cláusula em `:22295-22296`; não audito seu mérito aqui** — é achado da
trilha de origem, não coberto por este finding.

---

## 2. OS DOIS LEITORES DIVERGENTES — o núcleo do achado

### 2.1 Leitor A — `PostEntryUseCase`: filtra por `> 0`

`server/src/modules/accounting/application/use-cases/entry/PostEntryUseCase.ts:58-82`:

```ts
:58-61  let totalDebitCents = 0; let totalCreditCents = 0;
        let hasDebitLine = false; let hasCreditLine = false;
:63     for (const item of items) {
:64       const debit  = Number(item.debit)  || 0;
:65       const credit = Number(item.credit) || 0;
:66       if (debit  > 0) { hasDebitLine  = true; totalDebitCents  += toCents(debit);  }
:67       if (credit > 0) { hasCreditLine = true; totalCreditCents += toCents(credit); }
:68     }
:70-72  if (!hasDebitLine || !hasCreditLine) throw new BusinessRuleError(...);
:74-82  if (totalDebitCents !== totalCreditCents) throw new BusinessRuleError(... difference ...);
```

**`> 0` estritamente.** Uma linha com `debit = -500` **não entra na soma** — o gate de
balanceamento **não a vê**.

### 2.2 Leitor B — o balancete: soma o valor cru

`SequelizeAccountingRepository.ts:130-144` (SQL do balancete):

```sql
COALESCE(SUM(CASE WHEN ae.entry_date <  :firstDayOfMonth THEN aei.debit  ELSE 0 END), 0)::numeric AS previous_debit,   -- :135
COALESCE(SUM(CASE WHEN ae.entry_date <  :firstDayOfMonth THEN aei.credit ELSE 0 END), 0)::numeric AS previous_credit,  -- :136
COALESCE(SUM(CASE WHEN ae.entry_date >= :firstDayOfMonth AND ae.entry_date <= :lastDayOfMonth THEN aei.debit  ELSE 0 END), 0)::numeric AS debit_movement,   -- :137
COALESCE(SUM(CASE WHEN ae.entry_date >= :firstDayOfMonth AND ae.entry_date <= :lastDayOfMonth THEN aei.credit ELSE 0 END), 0)::numeric AS credit_movement   -- :138
...
WHERE coa.accept_entries = true     -- :142
```

`SUM(aei.debit)` — **sem filtro de sinal**. E `GetTrialBalanceUseCase.ts:52-58`:

```ts
:54   const debitMovementCents  = toCents(Number(row.debit_movement)  || 0);
:55   const creditMovementCents = toCents(Number(row.credit_movement) || 0);
:57   const previousBalanceCents = previousDebitCents - previousCreditCents;
:58   const currentBalanceCents  = previousBalanceCents + debitMovementCents - creditMovementCents;
```

▲ **Correção de âncora em relação ao encargo:** o encargo cita
`GetTrialBalanceUseCase.ts:58` como o ponto que *"lê a coluna crua"*. A leitura crua
acontece de fato no **SQL do repositório** (`SequelizeAccountingRepository.ts:135-138`);
`:58` é a **composição do saldo** a partir dela. Registro as duas âncoras em vez de
propagar a imprecisa.

### 2.3 A divergência, aritmeticamente

Lançamento hipotético com três linhas: `debit = 1000`, `credit = 1000`, `debit = -300`.

| Leitor | Resultado | Por quê |
|---|---|---|
| `PostEntryUseCase` | `totalDebit = 1000`, `totalCredit = 1000` → **fecha, lançamento é POSTADO** | `:66` só soma `> 0`; a linha `-300` é **invisível** |
| Balancete | `debit_movement = 1000 + (-300) = 700` contra `credit_movement = 1000` | `:137` soma o valor cru |

**Um lançamento aprovado como balanceado produz balancete desbalanceado em R$ 300.** É
esta a *"corrupção silenciosa"* do enquadramento do dono: o sistema **atesta** a
integridade que ele mesmo depois **desmente**, e nenhum dos dois pontos sabe do outro.

**Segundo eixo, independente do sinal — a exclusividade mútua.** Uma linha com `debit =
1000` **e** `credit = 1000` seria contada nas **duas** somas por `:66-67`, satisfazendo
`totalDebit === totalCredit` e `hasDebitLine && hasCreditLine` **sozinha** — passando pelo
gate de partida dobrada com **uma única linha**, sem contrapartida real. O balancete a
computaria nos dois lados, produzindo saldo líquido zero numa conta que recebeu movimento.

---

## 3. ⚠ DIVERGÊNCIA REGISTRADA — o controle compensatório que o encargo não mencionava

Esta seção existe porque **não registrá-la seria produzir um falso positivo parcial**, e o
mandato deste agente inclui recusar evidência não verificável e registrar contradição em
vez de conciliá-la.

### 3.1 O controle existe e é explícito

`server/src/modules/accounting/application/services/validateEntryItemsShape.ts` —
arquivo **integralmente lido**:

```ts
:26  function validateEntryItemsShape(items: EntryItemShape[]): void {
:27-29   if (!items || items.length === 0) throw new BusinessRuleError('Informe ao menos um item...');
:31    items.forEach((item, index) => {
:32      const debit  = Number(item.debit  ?? 0);
:33      const credit = Number(item.credit ?? 0);
:34      const hasDebit  = debit  > 0;
:35      const hasCredit = credit > 0;
:37-39    if (hasDebit && hasCredit) throw new BusinessRuleError(`Item ${index+1}: informe débito OU crédito, nunca os dois na mesma linha...`);
:40-42    if (!hasDebit && !hasCredit) throw new BusinessRuleError(`Item ${index+1}: informe um valor de débito ou de crédito maior que zero.`);
:43-45    if (debit < 0 || credit < 0) throw new BusinessRuleError(`Item ${index+1}: débito/crédito não podem ser negativos.`);
:46    });
```

O JSDoc do arquivo (`:5-10`) declara a intenção com precisão: *"Regra de partida dobrada
aplicada aqui (por linha, sempre — independente do status do lançamento): exatamente um de
`debit`/`credit` deve ser maior que zero, nunca os dois preenchidos, nunca nenhum."*

### 3.2 Ele é efetivamente invocado nos dois caminhos de escrita

Grep de `validateEntryItemsShape` em `server/` — **resultado completo**:

| Chamador | Âncora | Escreve itens em |
|---|---|---|
| `CreateEntryUseCase` | import `:26`; **chamada `:58`**, antes de qualquer escrita | `createEntryItem` `:86-93` |
| `UpdateEntryUseCase` | import `:21`; **chamada `:70`** | `:92-93` |

**Não há terceiro chamador, e não há caminho de criação de item que não passe por um
destes dois** — exceto o descrito em §3.3.

**Segunda barreira, na borda HTTP:** `accountingEntryValidators.ts:20-21` —
`debit: z.coerce.number().min(0).optional()` e idem para `credit`. **Negativo é rejeitado
já no parsing do payload**, antes de chegar ao use case, nos schemas `createEntrySchema`
(`:25-30`) e `updateEntrySchema` (`:32-37`), ambos `.strict()`.

### 3.3 O terceiro escritor — `ReverseEntryUseCase`, e por que **não** é brecha

`ReverseEntryUseCase.ts:69-79` cria itens **sem** chamar `validateEntryItemsShape`:

```ts
:69  for (const item of originalItems) {
:70    await this.accountingRepository.createEntryItem({
...
:74      // Inverte débito/crédito — a essência do estorno em partida dobrada.
:75      debit:  item.credit,
:76      credit: item.debit,
```

**Analisei e concluo que não é brecha: é preservação de invariante.** Os valores vêm de
`originalItems`, que **já** passaram por `validateEntryItemsShape` na criação. A troca
`debit ↔ credit` de um par que satisfaz "exatamente um > 0" produz outro par que satisfaz
"exatamente um > 0". A invariante é **fechada sob a operação de inversão**. **Registro
como conformidade, não como achado** — e registro que a verifiquei, porque um leitor que
apenas notasse a ausência da chamada concluiria erradamente por uma brecha.

### 3.4 O que resta verdadeiro, e é o finding real

| Afirmação do encargo | Veredito da reverificação |
|---|---|
| Sem CHECK de sinal no banco | **CONFIRMADA** — §1, prova exaustiva |
| Sem exclusividade mútua **no banco** | **CONFIRMADA** — §1 |
| Sem exclusividade mútua **em absoluto** | ⚠ **REFUTADA** — existe e é imposta na aplicação (`validateEntryItemsShape.ts:37-39`) nos dois caminhos de escrita |
| `PostEntryUseCase` ignora linha negativa | **CONFIRMADA como comportamento do código** (`:66-67`) — mas a linha negativa **não é alcançável** pelos caminhos conhecidos (`:43-45` + `.min(0)`) |
| Balancete lê a coluna crua | **CONFIRMADA** — `SequelizeAccountingRepository.ts:135-138` |
| Duas semânticas conforme quem lê | **CONFIRMADA como propriedade do código**, **condicional** à existência de linha violadora |

**O finding legítimo, reformulado com precisão:** a invariante de partida dobrada é
**real, correta e bem escrita — mas vive inteiramente na aplicação, e o banco não a
conhece.** Qualquer escrita que não atravesse `CreateEntryUseCase`/`UpdateEntryUseCase`
— SQL direto, migration, seed, script de carga, rotina de importação futura, correção
manual de DBA, ou um novo use case escrito por quem desconheça `validateEntryItemsShape`
— **produz a corrupção descrita em §2.3, e o sistema a aceitará como balanceada**. O
projeto **já tem 169 migrations `.cjs`** (`T-31:32`) e um histórico de scripts de carga e
backfill (`T-31`, `PRODUCTION_STATUS_MAP.md:128`), o que torna esse caminho **plausível,
não hipotético** — mas **não demonstrado no `AUDIT_COMMIT`**, e é por isso que a
confiança na materialização é `MEDIUM`, não `CONFIRMED`.

**Não adjudico a severidade.** Um validador poderia sustentar que a barreira dupla
(Zod `.min(0)` + `validateEntryItemsShape`) reduz o achado a "defesa em profundidade
ausente" e recomendar rebaixamento; outro poderia sustentar que a ausência de constraint
na tabela mais crítica do subsistema contábil, que **outro subsistema do mesmo projeto
implementa** (`:3760`), justifica HIGH por si. **A severidade determinada pelo dono é HIGH
e assim permanece.** A divergência está registrada para que a decisão seja tomada com o
fato completo à vista, e não com a metade que o encargo trazia.

---

## 4. CONFORMIDADE REGISTRADA JUNTO — por determinação do encargo, e ampliada

O encargo determinou registrar, para não virar falso positivo, que **o balanceamento de
partidas dobradas É validado** em `PostEntryUseCase.ts:64-80`, em centavos. **Confirmo por
leitura própria e amplio, porque encontrei mais conformidades do que a determinação
mencionava:**

| # | Conformidade | Prova |
|---|---|---|
| C-01 | **Balanceamento validado em centavos**, com mensagem que reporta a diferença exata | `PostEntryUseCase.ts:74-82`; conversão por `toCents` em `:66-67` — **evita erro de ponto flutuante**, que é a armadilha clássica desta validação |
| C-02 | **Mínimo de 2 itens** exigido antes de qualquer soma | `PostEntryUseCase.ts:54-56` |
| C-03 | **Exige ao menos uma linha de débito E uma de crédito** — não basta somar igual | `:60-61,70-72` |
| C-04 | **Só `draft` pode ser postado** — impede repostagem e alteração de lançamento firmado | `:49-51` |
| C-05 | **Lock de linha na leitura do lançamento** — `findEntryByIdForUpdate` dentro da transação | `:45` |
| C-06 | **Exclusividade mútua e não-negatividade impostas na aplicação**, nos dois caminhos de escrita | `validateEntryItemsShape.ts:37-45`; `CreateEntryUseCase.ts:58`; `UpdateEntryUseCase.ts:70` |
| C-07 | **Segunda barreira na borda HTTP** — `.min(0)` + `.strict()` | `accountingEntryValidators.ts:20-21,25-37` |
| C-08 | **Conta sintética e conta inativa recusam lançamento direto** | `CreateEntryUseCase.ts:65-70` |
| C-09 | **Balancete só considera `posted`**, com racional documentado sobre `draft` e `reversed` | `SequelizeAccountingRepository.ts:127-129,141` |
| C-10 | **Estorno preserva a invariante** por inversão | `ReverseEntryUseCase.ts:74-76` — §3.3 |
| C-11 | `accounting_entries.created_by NOT NULL` + FK `RESTRICT` + par `approved_by`/`approved_at` | `T-31` §"Conformidades provadas" item 5; `PostEntryUseCase.ts:84-88` |

**Onze conformidades verificadas.** O módulo `accounting` é, no cômputo da evidência, um
dos mais bem construídos do ERP no eixo de validação de aplicação. **Registro isso com o
mesmo peso do finding**, porque um relatório que descrevesse a contabilidade como frágil
seria factualmente errado — a fragilidade é **específica e localizada: está no schema,
não na aplicação.**

---

## 5. AMBIENTE — verificação própria da premissa do dono (Regra 20)

Leitura de `coretriad/states/ERP-LEGACY-001/PRODUCTION_STATUS_MAP.md`:

| Módulo | Classificação em disco | Âncora |
|---|---|---|
| `accounting` | **NÃO-PRODUÇÃO** — *"Sem lançamentos de origem real (compras/vendas em 0)"*, confiança **ALTA** | `:155` |
| `financial` | **NÃO-PRODUÇÃO**, confiança **ALTA** | `:154` |
| `treasury` | **NÃO-PRODUÇÃO**, confiança **ALTA** | `:157` |

Dados medidos (`:94,95`): `suppliers` = **0**, `clients` = **0** — sem origem, não há
lançamento contábil real.

**CONCLUSÃO: a premissa do dono se confirma. NENHUMA CONTRADIÇÃO A REGISTRAR.**

**Fronteira registrada por obrigação:** `APR-2026-016` classifica como produção real
`items`, `categories`, `departments`, `users` (**apenas `admin`**), `auth`, `auditLogs` e
o banco de `docker-compose.yml`. Nenhum é objeto deste finding. **A observação relevante:
`accounting_entry_items` reside no mesmo banco que hospeda os 327 itens reais**
(`:198`) — por isso qualquer verificação dinâmica exige `erp_evok_audio_test` e **nenhum
comando de banco foi executado aqui**.

---

## 6. IMPACTO

**BUSINESS_IMPACT (enquadramento do dono):** *"risco de corromper silenciosamente o
balancete contábil."* Balancete é insumo de demonstração financeira, de apuração fiscal e
de decisão de diretoria. Um desbalanceamento que **o próprio sistema já atestou como
inexistente** é o pior formato possível do erro: o controle que deveria detectá-lo é
justamente o que produziu o atestado. A detecção dependeria de alguém somar débitos e
créditos por fora do ERP.

**TECHNICAL_IMPACT:** invariante crítica sustentada **só** por disciplina de código de
aplicação. O banco aceita estados que a aplicação considera impossíveis. Toda leitura
futura da tabela — relatório novo, integração contábil, exportação para provedor externo,
consulta ad hoc — herda a suposição de que a invariante vale, **sem que nada a garanta**.

**AUDIT_IMPACT:** `accounting_entry_items` **não tem `created_by`** (§1, DDL
`:3176-3186`) — a autoria existe no cabeçalho `accounting_entries`, não na linha. Uma
linha inserida por caminho lateral não teria autoria própria rastreável.

**COMPLIANCE_IMPACT:** registro contábil é objeto de exigência legal de fidedignidade.
**Não faço juízo sobre enquadramento normativo específico** (ITG 2000, NBC, legislação
fiscal) — é matéria de decisão humana com a contabilidade (Regra 6). Registro que o risco
existe no eixo, e que o gatilho de reavaliação o endereça.

---

## 7. RECOMMENDATION

**SUGGESTED_REMEDIATION_OWNER: SanaCore** (Regra 3), **após** validação adversarial
obrigatória (Regra 22 — que este finding requer com particular urgência, dado §3).

1. **Item central: elevar a invariante da aplicação para o schema.** Migration
   acrescentando à `accounting_entry_items`:
   - `CHECK (debit >= 0 AND credit >= 0)`
   - `CHECK (NOT (debit > 0 AND credit > 0))` — exclusividade mútua
   - opcionalmente `CHECK (debit > 0 OR credit > 0)` — obrigatoriedade
   **Precedente interno do próprio projeto:** `chk_bank_statement_entries_single_match`
   (`00_baseline_frozen.sql:3760`) resolve problema análogo exatamente assim.
   **Nomenclatura sugerida, coerente com o padrão existente:**
   `chk_accounting_entry_items_debit_xor_credit`.
2. **Pré-condição obrigatória antes da migration.** Verificar se existem linhas
   violadoras no banco. **Se existirem, a migration falhará** — e a decisão sobre o que
   fazer com dado contábil histórico violador **é humana** (Regra 6), não de agente. Esta
   verificação **não pode** rodar contra `erp_evok_audio` sem aprovação caso a caso
   (`APR-2026-016`).
3. **Alinhar os dois leitores, independentemente do item 1.** Ou `PostEntryUseCase:66-67`
   passa a **rejeitar** valores `< 0` explicitamente em vez de silenciosamente ignorá-los
   (`if (debit < 0) throw`), ou o balancete passa a filtrar `> 0`. **Rejeitar é
   preferível: ignorar dado inválido é o mecanismo que produz a divergência.** Este item
   tem valor **mesmo que o item 1 seja adotado** — defesa em profundidade.
4. **`COMMENT ON COLUMN`** em `debit` e `credit` declarando a convenção de sinal e a
   exclusividade. Endereça `AUD-DB-T31-01`/`-03` nestas duas colunas; a Classe C de
   `T-31` §6 lista `debit`/`credit` entre as colunas cuja **unidade/convenção não é
   declarada**.
5. **Teste de invariante**, não de caso. Teste que **falha** se uma linha violadora for
   aceita por qualquer caminho — incluindo escrita direta pelo repositório, contornando o
   use case. É o teste que provaria a eficácia do item 1.

**Reprodução dinâmica proposta (NÃO executada; exige autorização do director e o banco
`erp_evok_audio_test` — jamais `erp_evok_audio`, `APR-2026-016`/`APR-2026-025`):**

| ID sugerido | Cenário | Asserção |
|---|---|---|
| `DYN-CTB-01` | `INSERT` direto em `accounting_entry_items` com `debit = -300` | **Aceito hoje** — prova que o banco não impede (§1). Após remediação: **rejeitado** |
| `DYN-CTB-02` | `INSERT` direto com `debit = 1000` E `credit = 1000` | **Aceito hoje** — prova ausência de exclusividade no schema |
| `DYN-CTB-03` | Após `DYN-CTB-01`, postar o lançamento e ler `GET /api/accounting/trial-balance` | **Postagem aprovada** e **balancete desbalanceado** — prova por execução a divergência de §2.3 |
| `DYN-CTB-04` | `POST /api/accounting/entries` com `debit: -300` via API | **Rejeitado** — prova o controle compensatório de §3, delimitando corretamente o alcance do finding |

**`DYN-CTB-04` é tão importante quanto `DYN-CTB-01`:** ele delimita o achado e impede que
a remediação seja dimensionada sobre uma premissa mais ampla que a evidência.

---

## 8. RASTREABILIDADE

**RELATED_PROCESS:** contabilidade — lançamento por partidas dobradas e apuração de
balancete
**RELATED_BUSINESS_RULE:** **nenhuma BR versionada** define a convenção de sinal ou a
exclusividade de `debit`/`credit`. A regra vive **apenas** no JSDoc de
`validateEntryItemsShape.ts:5-10` e no de `PostEntryUseCase.ts:9`. **Lacuna de regra
registrada, não inventada.** Vizinha, **não coberta aqui**: `BR-CTB-001`/`F-45`
(*"Estorno contábil sem segregação/período/prazo"*, `REQUIREMENTS_BASELINE.md:223`).
**RELATED_REQUIREMENT:** nenhum RF/NFR versionado.
`LEGACY_TRACEABILITY_MATRIX_comercial-financeiro.md:118` (`TR-2`) registra
*"accounting/budget/treasury: 100% UC-fantasma + zero RF"*; `:73` lista `F-45 (BR-CTB-001)`
como REQ FANTASMA, `INFERRED — NEEDS HUMAN VALIDATION`.
**RELATED_USE_CASE:** UC-19 (plano de contas) e UC-21 (balancete) — ambos registrados
como **sem teste real** em `LEGACY_TRACEABILITY_MATRIX_comercial-financeiro.md:71`
(*"UC-21 (balancete / `GetTrialBalanceUseCase`)"*), e `:75` registra UC-19/21 como **código
sem BR sequer levantada**. **A divergência de §2.3 vive exatamente no use case que a
matriz de rastreabilidade aponta como o menos coberto do cluster.**
**RELATED_ACCEPTANCE_CRITERIA:** nenhum.
**RELATED_TEST:** existe `accounting-use-cases.test.ts` (citado em
`LEGACY_TRACEABILITY_MATRIX_comercial-financeiro.md:75`). **Não o li nesta análise** —
declarado como lacuna em §9. **Nenhum teste conhecido exercita a divergência entre os dois
leitores**, e UC-21 é registrado como sem teste real.

**RELATED_FINDINGS:**
- **Origem:** `AUD-DB-T31-02` (`T-31_C137_SEMANTICA_COLUNA.md:154`) — esta é a **promoção
  formal**. `AUD-DB-T31-02` deve ser marcada como **PROMOVIDA a `AUD-CTB-DEBCRED-01`**.
- **Vizinho, promovido em paralelo:** `AUD-TES-SALDOMANUAL-01` (mesma rodada, mesma trilha
  de origem T-31). **Padrão comum às duas:** invariante financeira que existe na aplicação
  ou na expectativa, e não no schema. **Registro a convergência sem fundir.**
- **Convergente, não duplicado:** `AUD-DB-T31-01` (semântica colapsa nos subsistemas
  financeiros recentes — `accounting` mede **0 `COMMENT ON COLUMN`** em suas 3 tabelas,
  `T-31:85`), `AUD-DB-T31-03`, `AUD-DB-T31-06` (três precisões monetárias no mesmo
  trânsito). `accounting_entry_items` é instância nominal; **não se duplica severidade
  sobre trilha alheia** (Regra 15, precedente `C-20`/`C-21`).
- **Não coberto aqui, herdado de T-31:** `cost_center_id ON DELETE SET NULL` (`:22296`) e
  `accounting_entries.reversal_of_id ON DELETE SET NULL` (`:22280`).

**REFERENCE:** `00_baseline_frozen.sql:3176-3186,3760,16498-16499,18684,18691,18698,22287-22288,22295-22296,22303-22304`;
`T-31_C137_SEMANTICA_COLUNA.md:85,108-110,154,167-176`;
`PRODUCTION_STATUS_MAP.md:94,95,154,155,157,198`; `APPROVALS.md:318-351`;
`REQUIREMENTS_BASELINE.md:223`;
`LEGACY_TRACEABILITY_MATRIX_comercial-financeiro.md:71,73,75,118`;
`CLAUDE.md` Regras 2, 4, 6, 14, 15, 18, 20, 22.

**ROOT_CAUSE_HYPOTHESIS:** A invariante de partida dobrada foi implementada com cuidado
real — em duas camadas de aplicação (Zod e serviço de domínio compartilhado), com JSDoc
que a declara explicitamente. **O acerto da aplicação é o que dispensou o schema.** A
tabela foi gerada pelo padrão do projeto (`numeric(15,2) DEFAULT 0 NOT NULL`, sem CHECK) e
ninguém voltou para nela gravar a regra, porque a aplicação já a garantia — o que é
verdade **enquanto a aplicação for o único escritor**. A ausência de `COMMENT ON COLUMN`
em todo o subsistema contábil (`T-31:85` — **0, 0, 0** nas 3 tabelas) fez com que nem
sequer a **documentação** da convenção chegasse ao banco. O resultado é uma regra correta
que existe em três lugares no código e em **nenhum** no dado.

**RETEST_SPECIFICATION** (a ser executada **por VeriCore**, após remediação da SanaCore —
Regra 4; nada aqui declara reteste feito):

(a) **Enforcement no banco.** `INSERT` direto em `accounting_entry_items` com
`debit < 0` → **rejeitado pelo banco**. Idem `credit < 0`.
(b) **Exclusividade no banco.** `INSERT` direto com `debit > 0` **e** `credit > 0` →
**rejeitado pelo banco**. Este é o item que fecha o segundo eixo de §2.3.
(c) **Caminho legítimo preservado.** Lançamento válido (uma linha de débito, uma de
crédito, ambas `> 0`) continua sendo criado e postado normalmente — a correção
**discrimina**, não bloqueia indiscriminadamente.
(d) **Estorno preserva.** `ReverseEntryUseCase` continua funcionando após a constraint —
a inversão `debit ↔ credit` (`:74-76`) **não** pode violar a nova regra. **Item de
regressão obrigatório**, é o caminho de escrita que não passa por
`validateEntryItemsShape`.
(e) **Leitores alinhados.** Se o item 3 de §7 for adotado: `PostEntryUseCase` **rejeita**
explicitamente valor negativo em vez de ignorá-lo, com teste que o comprove.
(f) **Semântica.** Existe `COMMENT ON COLUMN` em `debit` e `credit` declarando a
convenção de sinal e a exclusividade — reduzindo em 2 o déficit de `AUD-DB-T31-01` e
retirando `debit`/`credit` da Classe C de `T-31` §6.
(g) **Teste de invariante.** Existe teste automatizado que **falha** se uma linha
violadora for aceita **por qualquer caminho**, inclusive escrita direta pelo repositório.
Um teste que apenas exercite a API **não satisfaz** este item — a API já rejeitava antes
da remediação (§3.2).
(h) **Estado do dado.** Existe registro de que a verificação do item 2 de §7 foi feita e
de seu resultado; se houver linha violadora, existe decisão humana registrada.
(i) **Não regressão.** Suíte de `accounting` e `server-ci.yml` completos passam.
(j) **Toda execução contra `erp_evok_audio_test`.** Nenhuma contra `erp_evok_audio`
(`APR-2026-016`, `APR-2026-021` Parte D, `APR-2026-025`).

---

## 9. DECLARAÇÃO DE MÉTODO E LIMITES

- **Método:** READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT. Nenhum passo de correção.
- **A divergência de §3 foi encontrada por releitura própria**, não recebida no encargo.
  **Registrá-la é obrigação (Regra 20), e mantê-la sem alterar a severidade fixada pelo
  dono é obrigação simultânea (Regra 18).** As duas foram cumpridas.
- **Correção de âncora declarada** (▲ §2.2): a leitura crua da coluna é
  `SequelizeAccountingRepository.ts:135-138`; `GetTrialBalanceUseCase.ts:58` é a
  composição do saldo.
- **Prova de ausência de CHECK feita por enumeração completa** das constraints da tabela
  no baseline, não por amostragem.
- **Nenhum comando executado**, **nenhuma conexão de banco**. Leitura de schema é do
  **baseline congelado versionado**, com a ressalva herdada de `T-31` (`RES-T31-01`) de
  que o baseline pode estar defasado. **Lacuna residual declarada: não varri
  `server/migrations/` (169 arquivos `.cjs`) em busca de migration posterior que tenha
  acrescentado CHECK a `accounting_entry_items`.** A ausência de CHECK é `CONFIRMED`
  **no baseline**; `MEDIUM` quanto ao estado do banco atual. **Este é o item que o
  validador deve fechar primeiro** — é barato e decide o mérito.
- **Fatos não reverificados, declarados como lacuna:** o conteúdo de
  `accounting-use-cases.test.ts`; o mérito dos achados de `ON DELETE SET NULL` herdados de
  `T-31:110`.
- **Nenhum arquivo do objeto auditado criado ou alterado** (Regra 2).
- **Nenhum dado pessoal, credencial ou segredo foi lido, citado ou reproduzido.**
- **Limite de escopo:** cobre **exclusivamente** as colunas `debit`/`credit` de
  `accounting_entry_items`. **Não** audita o plano de contas, o estorno (`BR-CTB-001`), o
  fechamento de período, nem fecha `AUD-DB-T31-01` ou `RES-T31-02`.

**ARQUIVOS LIDOS NESTA ANÁLISE (caminhos absolutos):**

- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\database\postgresql\00_baseline_frozen.sql` (parcial, por consulta dirigida: 3173-3190 + grep integral de `accounting_entry_items`)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\accounting\application\use-cases\entry\PostEntryUseCase.ts` (parcial: 40-95)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\accounting\application\use-cases\entry\CreateEntryUseCase.ts` (parcial: 52-96)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\accounting\application\use-cases\entry\ReverseEntryUseCase.ts` (parcial: 55-93)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\accounting\application\services\validateEntryItemsShape.ts` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\accounting\application\use-cases\report\GetTrialBalanceUseCase.ts` (parcial: 40-89)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\accounting\infrastructure\sequelize\SequelizeAccountingRepository.ts` (parcial: 124-156)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\accounting\presentation\validators\accountingEntryValidators.ts` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\T-31_C137_SEMANTICA_COLUNA.md` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\coretriad\states\ERP-LEGACY-001\PRODUCTION_STATUS_MAP.md`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\coretriad\governance\APPROVALS.md` (parcial, por consulta)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\coretriad\projects\ERP-LEGACY-001\discovery\REQUIREMENTS_BASELINE.md` (parcial, por consulta)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\AUD-DEP-JSYAML-01.md` (referência de estrutura)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\CLAUDE.md`

---

*Produzido e persistido por `vericore-audit-evidence-controller` — ponto único de
persistência de evidência em `audit/` (§23 do Master Spec). STATUS permanece `PROPOSED`.
Severidade **HIGH conforme fixada pelo dono**, com **divergência técnica registrada em §3
e não conciliada** (Regra 20). A validação adversarial pelo `vericore-finding-validator`
**não ocorreu** e é **obrigatória** antes de qualquer remediação (Regra 22).*
