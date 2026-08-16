# FINDING

```
FINDING_ID:   AUD-TES-SALDOMANUAL-01
AUDIT_ID:     ERP-LEGACY-001-AUD-001
PROJECT_ID:   ERP-LEGACY-001
AUDIT_COMMIT: c1311a6f76b512fef893f7e60d934179cae3409f
```

**TITLE:** `treasury_bank_accounts.current_balance` é **digitado à mão** e nunca
derivado: os **únicos dois escritores** são o cadastro e a edição da conta bancária.
**Nenhum** pagamento, recebimento, conciliação OFX, baixa CNAB ou lançamento contábil
escreve nesta coluna — e ela é lida como **posição de caixa** da empresa. **A ausência é
o achado.**

**DOMAIN:** financeiro / tesouraria
**SUBDOMAIN:** integridade de saldo · dado de decisão sem derivação nem reconciliação
**SEVERITY:** **HIGH** — **fixada por decisão humana do dono nesta sessão**, com o
enquadramento: *"risco de posição de caixa sistematicamente errada sem ninguém
perceber"*. Não reavaliada por este agente.
**CONFIDENCE:** `CONFIRMED` — a exaustividade dos escritores foi estabelecida por
**grep integral de `server/src`** (§2.3), não por amostragem. É prova de ausência
fechada sobre o corpus lido.
**STATUS:** `PROPOSED`
**ENVIRONMENT:** **DEV/HOMOLOGAÇÃO** — `treasury` e `financial` classificados
**NÃO-PRODUÇÃO**, com **0 fornecedores e 0 clientes** medidos (§4).
**GATILHO DE REAVALIAÇÃO NOMEADO:** **na promoção do módulo `treasury` a produção real —
operacionalmente, no primeiro cadastro de uma conta bancária real da Evok Áudio com saldo
verdadeiro, ou na primeira baixa real de título em `financial` — esta severidade passa a
BLOQUEANTE de release.** O gatilho **não** é o Go-Live formal (`APR-2026-016`: dado real
conta como produção independentemente do rótulo). Basta **uma** conta bancária real
cadastrada para que a posição de caixa exibida passe a ser consultada como verdade.
**DETECTED_BY:** `T-31_C137_SEMANTICA_COLUNA.md` §`AUD-DB-T31-07`
(`vericore-database-auditor`, auditoria estática de semântica de coluna) → **promovido a
finding formal** por `vericore-audit-evidence-controller` (esta análise, releitura
própria integral e reconstrução independente da prova de exaustividade).

---

## CABEÇALHO NORMATIVO OBRIGATÓRIO

1. **Autorização humana explícita (Regra 18).** Promoção a finding formal **e severidade
   HIGH** determinadas por decisão direta do dono nesta sessão, com enquadramento
   textual próprio. **Este agente não reavalia a severidade para baixo.** A evidência a
   sustenta sem ressalva de mérito.
2. **Regra 22 — validação adversarial NÃO OCORREU.** Sendo HIGH, a passagem pelo
   `vericore-finding-validator` é **obrigatória antes de qualquer remediação**. Nada
   aqui a declara feita.
3. **Regra 2 — nada foi corrigido.** `server/` e `server/database/` foram **apenas
   lidos**.
4. **Regras 4 e 14 — nenhum `FINDING CLOSED`, `RETEST_PASSED` ou `AUDIT_PASSED`.**
5. **Nenhum comando de banco executado** — `APR-2026-016` e `APR-2026-021` Parte D
   respeitadas integralmente. Toda a leitura de schema é sobre o **baseline congelado
   versionado**, nunca sobre um banco vivo.
6. **Correção de âncora em relação ao encargo (▲, §2.2).** O encargo cita
   `UpdateBankAccountUseCase.ts:18` como escritor. A linha `:18` é a **declaração de
   tipo** do campo; a **escrita efetiva** ocorre em `:51`. Registro a precisão em vez de
   propagar a âncora recebida — âncora imprecisa em finding formal é dívida de auditoria.

---

## 1. DESCRIPTION — o que a coluna é, e o que ela deveria ser

### 1.1 A coluna, no schema versionado

`server/database/postgresql/00_baseline_frozen.sql:14691-14703`:

```sql
CREATE TABLE public.treasury_bank_accounts (
    id integer NOT NULL,
    bank_name character varying(100) NOT NULL,
    agency character varying(20) NOT NULL,
    account_number character varying(20) NOT NULL,
    account_type public.enum_treasury_bank_accounts_account_type NOT NULL,
    current_balance numeric(15,2) DEFAULT 0 NOT NULL,     -- :14697
    manager_name character varying(100),
    manager_phone character varying(20),
    active boolean DEFAULT true NOT NULL,
    ...
);
```

Sem `COMMENT ON COLUMN`, sem CHECK, sem trigger. O nome — *"saldo atual"* — é a **única**
declaração de significado que existe, e ele promete algo que o sistema não entrega.

**Contraste que dá a régua, e não é retórico:** as tabelas de conciliação OFX do mesmo
domínio financeiro **têm** `COMMENT ON COLUMN` reais declarando a origem externa de cada
campo — inclusive `amount` → *"TRNAMT com sinal"* e `fitid` → *"usado para dedup na
reimportação"* (`T-31_C137_SEMANTICA_COLUNA.md:127-131`, âncoras `:3833,3840,3847,3854,3861,3768,3775,3789`).
**O mesmo time, no mesmo subsistema, sabe documentar origem de dado.** Em
`treasury_bank_accounts` isso não foi feito — e a coluna cuja origem mais importa é
justamente a que não a declara.

### 1.2 A promessa de derivação, feita pelo próprio código

`server/src/modules/treasury/application/use-cases/report/GetCashPositionUseCase.ts:1-9`,
JSDoc do arquivo:

> *"Posição de Caixa consolidada... Relatório **100% derivado (sem tabela própria)**: soma
> o saldo atual de todas as `treasury_bank_accounts` ativas... e cruza com o resumo de
> títulos em aberto de `accounts_payable`/`accounts_receivable`..."*

**A afirmação "100% derivado" é verdadeira quanto ao *relatório* e enganosa quanto ao
*dado*.** O relatório de fato não tem tabela própria — ele deriva de `current_balance`.
Mas `current_balance` **não é derivado de nada**: é entrada manual. A derivação para uma
camada acima de um número digitado não produz um número derivado.

---

## 2. A PROVA DE EXAUSTIVIDADE — quem escreve na coluna

### 2.1 Escritor 1 — criação da conta

`CreateBankAccountUseCase.ts:40-49`:

```ts
return this.treasuryRepository.createBankAccount({
  bank_name: input.bank_name,
  ...
  current_balance: input.current_balance ?? 0,      // :45
  ...
});
```

O valor vem **direto do payload do requisitante**, com default `0`.

### 2.2 Escritor 2 — edição da conta ▲

`UpdateBankAccountUseCase.ts`:

```ts
:12-22   type UpdateBankAccountInput = { id: number; ...; current_balance?: number; ... };   // :18 = TIPO
:36      async execute({ id, ...data }: UpdateBankAccountInput) {
:37-40     ...findBankAccountById / NotFoundError...
:42-49     ...checagem de conflito agência+número...
:51      return this.treasuryRepository.updateBankAccount(id, data);      // ← ESCRITA EFETIVA
```

**A escrita é `:51`, não `:18`** (▲ correção de âncora do cabeçalho normativo item 6).
Materialmente relevante: `data` é o **spread do input inteiro**, o que significa que
`current_balance` é gravado **sem nenhuma validação de domínio própria** — não há sequer
uma linha de código que o mencione neste use case. Entre `:36` e `:51` há duas
verificações (existência da conta e conflito de agência+número) e **nenhuma sobre o
saldo**.

### 2.3 A prova de que não há um terceiro — grep integral, não amostragem

`grep 'current_balance'` sobre **todo** `server/src`. Resultado completo, sem recorte:

| Arquivo:linha | Natureza |
|---|---|
| `modules/treasury/.../CreateBankAccountUseCase.ts:17` | declaração de tipo |
| `modules/treasury/.../CreateBankAccountUseCase.ts:45` | **ESCRITA** |
| `modules/treasury/.../UpdateBankAccountUseCase.ts:18` | declaração de tipo |
| `modules/treasury/presentation/validators/treasuryValidators.ts:22` | validação (create) |
| `modules/treasury/presentation/validators/treasuryValidators.ts:33` | validação (update) |
| `models/TreasuryBankAccount.ts:32` | tipagem do model |
| `models/TreasuryBankAccount.ts:49` | definição da coluna Sequelize |
| `models/TreasuryBankAccount.ts:8` | JSDoc |
| `modules/treasury/.../GetCashPositionUseCase.ts:32` | **LEITURA** |
| `modules/treasury/.../GetCashPositionUseCase.ts:51` | **LEITURA** |
| `modules/accounting/.../GetTrialBalanceUseCase.ts:73` | ⚠ **HOMÔNIMO — não é esta coluna** |
| `modules/accounting/.../GetTrialBalanceUseCase.ts:84` | ⚠ **HOMÔNIMO — não é esta coluna** |

**Registro a armadilha do homônimo, porque não registrá-la seria erro de auditoria:**
`GetTrialBalanceUseCase.ts:73,84` produz um campo *de saída* chamado `current_balance` no
balancete contábil, calculado em `:58` como
`previousBalanceCents + debitMovementCents - creditMovementCents`. **É saldo de conta
contábil, não saldo bancário; é campo de resposta JSON, não coluna de tabela.** Um grep
ingênuo contaria 12 ocorrências e concluiria que a contabilidade toca a coluna. **Não
toca.** Ironia registrada: **o balancete contábil deriva seu saldo corretamente; a
tesouraria não.**

**Universo de escritores, fechado: DOIS.** Ambos no CRUD da conta bancária. **Zero
escritores derivados.**

### 2.4 A validação que existe — e o que ela não faz

`treasuryValidators.ts`:

```ts
:17-26   export const createBankAccountSchema = z.object({ ..., current_balance: z.number().finite().optional(), ... }).strict();   // :22
:28-37   export const updateBankAccountSchema = z.object({ ..., current_balance: z.number().finite().optional(), ... }).strict();   // :33
```

`z.number().finite().optional()` — **apenas** exige que seja número finito. **Sem
`.nonnegative()`, sem teto, sem unidade, sem conferência contra nada.** Qualquer valor
finito é aceito: negativo, absurdo, ou simplesmente errado por digitação. O `.strict()`
dos schemas é uma conformidade real (bloqueia mass assignment) e **não** endereça este
problema.

### 2.5 A ausência — o que **nenhum** código faz

Da tabela §2.3 decorre, por exaustão sobre `server/src`:

| Evento que deveria mover caixa | Escreve em `current_balance`? |
|---|---|
| Baixa de conta a pagar (`PayPayableUseCase`) | **NÃO** |
| Baixa de conta a receber (`ReceivePaymentUseCase`) | **NÃO** |
| Conciliação de extrato OFX (`MatchEntryUseCase`) | **NÃO** |
| Retorno CNAB / baixa de título | **NÃO** |
| Lançamento contábil (`PostEntryUseCase`) | **NÃO** |
| Operação financeira de tesouraria (`SettleOperationUseCase`) | **NÃO** |
| Importação de extrato bancário | **NÃO** |

**Nada além do cadastro toca o saldo.** A coluna nasce no momento em que alguém digita um
número e permanece nesse valor até que alguém digite outro. **Não existe deriva — existe
congelamento.** A partir do primeiro movimento financeiro real, o número está errado, e
o erro só cresce.

---

## 3. COMO O NÚMERO ERRADO VIRA DECISÃO

`GetCashPositionUseCase.ts` — endpoint `GET /api/treasury/cash-position`:

```ts
:26   const accounts = await this.treasuryRepository.listActiveBankAccountsForCashPosition();
:31-35 for (const account of accounts) {
        const balance = Number(account.current_balance) || 0;                    // :32
        balanceByType[account.account_type] = (...) + balance;                   // :33
        totalBankBalance += balance;                                             // :34
      }
:37   const projectedBalance = totalBankBalance + openTitles.totalReceivable - openTitles.totalPayable;
:39-61 return { bank_accounts: { total_balance: totalBankBalance, accounts: [... current_balance ...] },   // :44, :51
               open_titles: {...}, projected_balance: projectedBalance };                                  // :60
```

O número digitado é (a) somado em `total_balance` (`:44`), (b) devolvido conta a conta
(`:51`), e (c) usado como **base do saldo projetado** (`:37,60`).

**O agravante estrutural — e é o que transforma o achado em algo pior que um campo
errado:** `projected_balance` **mistura, na mesma soma, um número digitado e dois números
derivados**. `openTitles.totalReceivable` e `totalPayable` vêm de agregação real de
`accounts_payable`/`accounts_receivable` (`:27`). O resultado carrega a **aparência de
número calculado** — vem de endpoint de relatório, tem componentes verificáveis, é
apresentado como projeção — enquanto sua maior parcela é entrada manual não auditada.
**É exatamente o mecanismo do enquadramento do dono: "sistematicamente errada sem ninguém
perceber."** A ausência de sinalização de proveniência é o que impede a percepção.

**Convergência já registrada por outra trilha, que confirma o padrão em segunda
instância:** `T32-COM-F11` (`T-32_CLIENT_COMERCIAL_FINANCEIRO.md:61`, LOW) documenta que
o **saldo inicial da projeção de caixa no front** também é digitado pelo usuário
(`DailyCashFlowProjectionTab.tsx:30-31`, default `'0'`), *"enquanto o saldo bancário real
vive em tesouraria"*. **Duas telas de caixa, dois números digitados, nenhum derivado —
e cada uma acha que a outra é a fonte confiável.** Convergente; **não duplicado**
(Regra 15): aquele é o front, este é o dado de origem.

---

## 4. AMBIENTE — verificação própria da premissa do dono (Regra 20)

Instruído a verificar eu mesmo, li `coretriad/states/ERP-LEGACY-001/PRODUCTION_STATUS_MAP.md`:

| Módulo | Classificação em disco | Âncora |
|---|---|---|
| `treasury` | **NÃO-PRODUÇÃO** — *"Sem fluxo financeiro real (contas a pagar/receber dependem de compras/vendas, ambas em 0)"*, confiança **ALTA** | `PRODUCTION_STATUS_MAP.md:157` |
| `financial` (`finance`, `cnab`, `reconciliation`) | **NÃO-PRODUÇÃO** — confiança **ALTA** | `:154` |
| `accounting` | **NÃO-PRODUÇÃO** — confiança **ALTA** | `:155` |

Dados medidos que a sustentam (`:94,95`): `suppliers` = **0**, `clients` = **0** — sem
fornecedor e sem cliente não há título, não há baixa, não há movimento de caixa real.

**CONCLUSÃO: a premissa do dono se confirma. NENHUMA CONTRADIÇÃO A REGISTRAR.**

**Fronteira registrada por obrigação:** `APR-2026-016` classifica como produção real
`items`, `categories`, `departments`, `users` (**apenas `admin`**), `auth`, `auditLogs` e
o banco de `docker-compose.yml`. **Nenhum é objeto deste finding.** A observação
materialmente relevante é a última: a tabela `treasury_bank_accounts` vive **no mesmo
banco** que hospeda os 327 itens reais (`PRODUCTION_STATUS_MAP.md:198`). Isso **não**
torna a tabela produção real — ela está vazia —, mas significa que **qualquer verificação
dinâmica deste finding roda contra um banco que contém dado real**, e portanto está
sujeita ao regime read-only reforçado. Por isso §6 exige `erp_evok_audio_test`, e por
isso **nenhum comando de banco foi executado aqui**.

---

## 5. IMPACTO

**BUSINESS_IMPACT (enquadramento do dono, sustentado pela evidência):** *"risco de posição
de caixa sistematicamente errada sem ninguém perceber."* Posição de caixa é o número que
decide se a empresa paga um fornecedor hoje, se antecipa recebível, se contrata capital
de giro. A partir do primeiro movimento financeiro real, `current_balance` estará errado
por construção — **e nada no sistema o sinalizará**. Não há alerta, não há divergência
visível, não há data de "saldo em". O erro é **silencioso por desenho**, e a única
detecção possível é alguém comparar manualmente com o extrato do banco.

**FINANCIAL_IMPACT:** o erro **não é aleatório: é acumulativo e monotônico** em relação ao
volume movimentado. Quanto mais a empresa operar, maior a distância entre o número exibido
e a realidade — e maior a confiança que o número terá acumulado por estar ali há mais
tempo. Composto com `AUD-COM-DESCONTO-01` (recebíveis inflados pelo bruto), a visão
financeira erra por **dois mecanismos independentes**, ambos na direção otimista.

**AUDIT_IMPACT:** a coluna é gravada por `PUT /api/treasury/bank-accounts/:id` sem
`created_by`/`updated_by` na tabela (`00_baseline_frozen.sql:14691-14703` — não há tais
colunas). **Não é possível determinar, pelo schema, quem alterou o saldo de caixa e
quando.** Converge, sem duplicar, com `AUD-DB-T31-07` do relatório de origem e com a
observação de `T-31` §5 de que `treasury_financial_operations` também não tem
`created_by`/`approved_by`.

**TECHNICAL_IMPACT:** um dado de decisão financeira sem derivação, sem reconciliação, sem
restrição de domínio (§2.4), sem trilha e sem semântica declarada no schema (§1.1). Os
cinco controles que tornariam o número confiável estão **todos** ausentes
simultaneamente.

---

## 6. RECOMMENDATION

**SUGGESTED_REMEDIATION_OWNER: SanaCore** (Regra 3), **após** validação adversarial
obrigatória (Regra 22).

**A decisão de fundo é de negócio e é do dono, não de agente** (Regra 6): *saldo bancário
deve ser derivado dos movimentos internos do ERP, ou importado do extrato do banco?* As
duas respostas são legítimas e levam a arquiteturas diferentes:

1. **Derivar de movimentos internos.** `current_balance` deixa de ser escrita e passa a
   ser calculado a partir dos eventos de caixa (baixas de AP/AR, operações de tesouraria).
   **Risco declarado:** o ERP passa a afirmar um saldo que o banco pode desmentir —
   toda divergência com o extrato vira incidente.
2. **Importar do extrato — a opção que a evidência favorece.** O ERP **já tem** o
   subsistema de conciliação OFX, com semântica de origem documentada
   (`T-31:127-131`) e constraint no banco (`chk_bank_statement_entries_single_match`,
   `:3760`). Fazer `current_balance` derivar do extrato importado **reusa infraestrutura
   existente e de boa qualidade**, e é a única opção em que o número do ERP concorda com
   o número do banco por construção.
3. **Manter manual, mas honesto.** Se o dono decidir que o campo continua sendo entrada
   manual (posição informada), então ele **precisa** de: `balance_as_of` (data de
   referência), `created_by`/`updated_by`, e rótulo na UI e na resposta da API que o
   identifique como **informado**, não apurado. **A opção 3 é aceitável; o que não é
   aceitável é a situação atual — manual sem dizer que é manual.**

**Independentemente da escolha, quatro itens se aplicam:**

- **Restrição de domínio.** `z.number().finite()` (`treasuryValidators.ts:22,33`) não
  basta. Decidir se saldo negativo é legítimo (é, em conta com limite) e, se for,
  documentá-lo — em vez de aceitá-lo por omissão.
- **Semântica no schema.** `COMMENT ON COLUMN` declarando origem, unidade e momento de
  referência — endereça `AUD-DB-T31-01`/`-03` na única coluna que este finding cobre.
- **Trilha.** Registrar em `auditLogs` toda alteração de `current_balance`, com valor
  anterior — a alteração do saldo de caixa é ato de alçada, não edição de cadastro.
- **Alçada.** Avaliar se editar saldo bancário deve exigir `tesouraria:approve` em vez de
  `operate`. **Recomendação, não requisito.**

**Reprodução dinâmica proposta (NÃO executada; exige autorização do director e o banco
`erp_evok_audio_test` — jamais `erp_evok_audio`, `APR-2026-016`):**

| ID sugerido | Cenário | Asserção |
|---|---|---|
| `DYN-TES-01` | Criar conta com `current_balance: 1000`; criar e **baixar** um título de R$ 300 em `accounts_payable`; reler `GET /api/treasury/cash-position` | `current_balance` continua **1000** — prova por execução que a baixa não move o saldo |
| `DYN-TES-02` | Importar extrato OFX com movimento; reler a posição | `current_balance` inalterado — prova que a conciliação não move o saldo |
| `DYN-TES-03` | `PUT` com `current_balance: -999999999` | Aceito (`z.number().finite()`) — prova a ausência de domínio de §2.4 |
| `DYN-TES-04` | Após `DYN-TES-03`, inspecionar `audit_logs` | Verifica se a alteração do saldo deixa rastro (§5, AUDIT_IMPACT) |

---

## 7. RASTREABILIDADE

**RELATED_PROCESS:** tesouraria — posição de caixa e gestão de contas bancárias
**RELATED_BUSINESS_RULE:** **nenhuma BR versionada define a origem de
`current_balance`.** `BR_CATALOG.md` não contém regra que a governe. **Lacuna de regra
registrada, não inventada** — e é a causa-raiz normativa. Vizinha, **não coberta aqui**:
`BR-TES-001`/`F-48` (*"`settle`/`cancel` de tesouraria sem efeito de caixa"*,
`REQUIREMENTS_BASELINE.md:225`) — **convergente e distinta**: aquela trata de operações
financeiras que não produzem efeito de caixa; esta, do campo de saldo que nenhum efeito
alcança. **A convergência entre as duas é forte e merece exame conjunto pelo validador,
sem fusão.**
**RELATED_REQUIREMENT:** nenhum RF/NFR versionado. `LEGACY_TRACEABILITY_MATRIX_comercial-financeiro.md:73`
registra `F-48 (BR-TES-001)` como **REQ FANTASMA**, `INFERRED — NEEDS HUMAN VALIDATION`;
`TR-2` (`:118`) registra *"accounting/budget/treasury: 100% UC-fantasma + zero RF"*.
**RELATED_USE_CASE:** UC-25 (tesouraria) — fantasma, sem especificação versionada.
**RELATED_ACCEPTANCE_CRITERIA:** nenhum.
**RELATED_TEST:** **nenhum teste exercita a derivação, porque não há derivação a
exercitar.** `LEGACY_TRACEABILITY_MATRIX_comercial-financeiro.md:71` registra UCs sem
teste real no cluster; a ausência aqui é estrutural, não de cobertura.

**RELATED_FINDINGS:**
- **Origem:** `AUD-DB-T31-07` (`T-31_C137_SEMANTICA_COLUNA.md:159,162-165`) — esta é a
  **promoção formal**, não o fechamento. `AUD-DB-T31-07` deve ser marcada como
  **PROMOVIDA a `AUD-TES-SALDOMANUAL-01`**.
- **Convergente, não duplicado:** `T32-COM-F11` (`T-32_CLIENT_COMERCIAL_FINANCEIRO.md:61`,
  LOW) — saldo inicial da projeção digitado no front. Mesmo padrão, camada distinta.
- **Convergente, não duplicado:** `AUD-DB-T31-01` (semântica colapsa nos subsistemas
  financeiros recentes, MEDIUM) e `AUD-DB-T31-08` (ausência de convenção de dado
  sensível) — `treasury_bank_accounts` é instância nominal de ambos; **não se duplica
  severidade sobre trilha alheia** (Regra 15, precedente `C-20`/`C-21`).
- **Convergente por efeito financeiro:** `AUD-COM-DESCONTO-01` (mesma rodada) — erram a
  visão financeira por mecanismos independentes, ambos na direção otimista.
- **Vizinho, promovido em paralelo:** `AUD-CTB-DEBCRED-01` (mesma rodada, mesma trilha de
  origem T-31).
- **Contraprova registrada (conformidade, para não virar falso positivo adiante):** a
  conciliação OFX **tem** constraint no banco (`chk_bank_statement_entries_single_match`,
  `00_baseline_frozen.sql:3760`) e semântica de origem documentada — `T-31` §5 e
  §"Conformidades provadas" item 4. **O subsistema vizinho faz certo o que este faz
  errado**, e é isso que torna a ausência aqui um achado e não uma limitação de maturidade
  geral do projeto.

**REFERENCE:** `T-31_C137_SEMANTICA_COLUNA.md:127-131,138,146,159,162-165,167-176`;
`00_baseline_frozen.sql:3760,14691-14703`; `PRODUCTION_STATUS_MAP.md:94,95,154,155,157,198`;
`APPROVALS.md:318-351`; `REQUIREMENTS_BASELINE.md:225`;
`LEGACY_TRACEABILITY_MATRIX_comercial-financeiro.md:71,73,118`;
`CLAUDE.md` Regras 2, 4, 6, 14, 15, 18, 20, 22.

**ROOT_CAUSE_HYPOTHESIS:** O módulo `treasury` foi construído como **CRUD de cadastro**
— conta bancária é uma entidade com atributos, e `current_balance` foi tratado como mais
um atributo, ao lado de `manager_phone`. A natureza distinta do campo — **saldo é
consequência de eventos, não propriedade de cadastro** — não foi modelada. O relatório de
posição de caixa foi construído **depois**, sobre a suposição de que o campo já era
confiável, e seu JSDoc registra essa suposição de boa-fé ao declarar-se *"100% derivado"*
(§1.2). A ausência de qualquer BR, RF ou UC versionado para tesouraria (`TR-2`) significa
que **nunca houve artefato que declarasse de onde o saldo deveria vir** — e o `COMMENT ON
COLUMN` que poderia tê-lo dito é exatamente o que `AUD-DB-T31-01` mede como zero neste
subsistema.

**RETEST_SPECIFICATION** (a ser executada **por VeriCore**, após remediação da SanaCore —
Regra 4; nada aqui declara reteste feito):

(a) **A decisão humana existe e está registrada.** Antes de qualquer verificação técnica:
existe decisão do dono, em `APPROVALS.md`, escolhendo entre as opções 1, 2 ou 3 de §6.
**Sem ela, o reteste é `NOT_TESTABLE`** — não há critério de correção sem regra de
negócio definida (Regra 6).
(b) **Se derivado (opção 1 ou 2):** para uma conta com saldo inicial conhecido, uma baixa
de conta a pagar e uma de conta a receber, `current_balance` reflete
`inicial - pago + recebido`, em centavos, sem tolerância. E `GET /api/treasury/cash-position`
devolve o valor derivado.
(c) **Se derivado do extrato (opção 2):** após importação OFX, `current_balance`
corresponde ao saldo do extrato, e existe campo de data de referência.
(d) **Se mantido manual (opção 3):** existe `balance_as_of` populado, existe autoria
registrada, e **a API e a UI identificam o valor como informado, não apurado**. Um
reteste que verifique só a coluna e não o rótulo **não satisfaz** este item.
(e) **Domínio.** Valores fora do domínio decidido são recusados por
`treasuryValidators.ts` com 4xx — e o teste inclui o caso negativo.
(f) **Trilha.** Alteração de `current_balance` aparece em `audit_logs` com valor anterior.
(g) **Semântica.** Existe `COMMENT ON COLUMN` em `treasury_bank_accounts.current_balance`
declarando origem, unidade e momento de referência — reduzindo em 1 o déficit de
`AUD-DB-T31-01`.
(h) **Não regressão.** Suítes de `treasury` e `financial` passam; `server-ci.yml` completo
passa.
(i) **Toda execução contra `erp_evok_audio_test`.** Nenhuma contra `erp_evok_audio`
(`APR-2026-016`, `APR-2026-021` Parte D, guarda de sufixo de `APR-2026-025`).

---

## 8. DECLARAÇÃO DE MÉTODO E LIMITES

- **Método:** READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT. Nenhum passo de correção.
- **A exaustividade de §2.3 foi reconstruída por mim**, por grep integral de `server/src`,
  e **não herdada** do relatório de origem. A tabela de 12 ocorrências é o resultado
  completo, sem recorte, incluindo os dois homônimos que descartei com justificativa.
- **Correção de âncora declarada** (▲ §2.2): a escrita de `UpdateBankAccountUseCase` é
  `:51`, não `:18`.
- **Nenhum comando executado**, **nenhuma conexão de banco** (`APR-2026-016`). A leitura
  de schema é do **baseline congelado versionado**, com a ressalva herdada de `T-31`
  (`RES-T31-01`) de que o baseline pode estar defasado em relação a migrations
  posteriores — **verifiquei especificamente que não há migration posterior alterando
  `current_balance`**, por grep integral de `current_balance` em `server/src`; **não
  varri `server/migrations/` para esta coluna**, e declaro isso como **lacuna
  residual**.
- **Nenhum arquivo do objeto auditado criado ou alterado** (Regra 2).
- **Nenhum dado pessoal, credencial, número de conta real ou segredo foi lido, citado ou
  reproduzido.** `manager_name`/`manager_phone` são citados como **nomes de coluna**,
  nunca como valores.
- **Limite de escopo:** cobre **exclusivamente** `treasury_bank_accounts.current_balance`.
  **Não** audita as demais colunas de tesouraria, nem o subsistema de operações
  financeiras (`treasury_financial_operations`), nem fecha `AUD-DB-T31-01` ou
  `RES-T31-02` (173/207 tabelas sem semântica), que permanecem abertos.

**ARQUIVOS LIDOS NESTA ANÁLISE (caminhos absolutos):**

- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\treasury\application\use-cases\bank-account\CreateBankAccountUseCase.ts` (parcial: 30-54)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\treasury\application\use-cases\bank-account\UpdateBankAccountUseCase.ts` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\treasury\application\use-cases\report\GetCashPositionUseCase.ts` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\treasury\presentation\validators\treasuryValidators.ts` (parcial: 10-49)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\database\postgresql\00_baseline_frozen.sql` (parcial, por consulta dirigida: 14688-14705 + grep)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\accounting\application\use-cases\report\GetTrialBalanceUseCase.ts` (parcial: 40-89 — para descartar o homônimo)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\T-31_C137_SEMANTICA_COLUNA.md` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\T-32_CLIENT_COMERCIAL_FINANCEIRO.md`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\coretriad\states\ERP-LEGACY-001\PRODUCTION_STATUS_MAP.md`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\coretriad\governance\APPROVALS.md` (parcial, por consulta)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\coretriad\projects\ERP-LEGACY-001\discovery\REQUIREMENTS_BASELINE.md` (parcial, por consulta)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\AUD-DEP-JSYAML-01.md` (referência de estrutura)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\CLAUDE.md`

---

*Produzido e persistido por `vericore-audit-evidence-controller` — ponto único de
persistência de evidência em `audit/` (§23 do Master Spec). STATUS permanece `PROPOSED`.
A validação adversarial pelo `vericore-finding-validator` **não ocorreu** e é
**obrigatória** antes de qualquer remediação (Regra 22).*
