# Auditoria — Módulos Contabilidade (CONT), Tesouraria (TES) e Controladoria (CTR)

**Data da auditoria:** 2026-08-07
**Commit auditado:** `aaf6ec5a54a863b8ac2faee4be97c7e7f897b3e8` ("feat: implementa modulos Contabilidade, Tesouraria e Controladoria")
**Auditor:** Lead Software Auditor & QA Specialist (agente `auditor-qa`)
**Método:** leitura de migrations, models, use cases, repositories, controllers, rotas, validators e testes; execução de `npx tsc --noEmit` e da suíte `jest` real dos 4 arquivos de teste novos/afetados (`accounting-use-cases.test.ts`, `treasury-use-cases.test.ts`, `budget-use-cases.test.ts`, `module-authorization-map.test.ts`). Nenhuma edição foi feita — auditoria somente leitura, conforme escopo.

---

## Veredito final

**APROVAR COM RESSALVAS.** O código entregue é honesto sobre suas próprias limitações (documentação em `docs/governance/TODO.md` e nos cabeçalhos das migrations lista exatamente o que ficou de fora), a partida dobrada contábil está corretamente implementada e testada na camada de aplicação, RBAC está completo nas 3 rotas, e os 87 testes unitários dos 4 módulos passam de fato (`87 passed, 87 total`, verificado nesta auditoria, não apenas citado no commit). Não há bloqueador P0. Há, no entanto, 1 achado P1 real de correção de dado financeiro (Controladoria herda uma semântica de "realizado" por `due_date`, não por data de pagamento efetivo, o que pode fazer o relatório orçado×realizado mentir sobre o período) e uma lacuna de integridade de negócio na Contabilidade (conta com `active=false` continua aceitando lançamento). Nenhum dos dois impede o uso do módulo, mas ambos devem ser corrigidos antes de a Contabilidade/Controladoria virarem fonte de verdade para decisão gerencial.

**Achados por severidade:** P0 = 0 · P1 = 2 · P2 = 4 · BAIXO/CLEAN (pontos fortes confirmados) = 6

---

## P1 — Achados de correção de dado / regra de negócio

### P1-1 — Controladoria: "realizado" usa `due_date` (vencimento), não data de pagamento efetivo — o relatório orçado×realizado pode atribuir gasto ao mês/ano errado

- **Localização:** `server/src/modules/financial/infrastructure/sequelize/SequelizeCostCenterRepository.ts:70-84` (`getCostCenterTotalsByPayable`), reaproveitado sem alteração por `server/src/modules/budget/application/use-cases/report/GetBudgetVsActualReportUseCase.ts:55` e `server/src/modules/budget/infrastructure/sequelize/SequelizeBudgetRepository.ts:63-101`.
- **Evidência técnica:**
  ```sql
  -- SequelizeCostCenterRepository.ts:70-84
  SELECT ap.cost_center_id, ..., COALESCE(SUM(ap.amount_paid), 0)::numeric AS realized_amount
    FROM accounts_payable ap
   WHERE ap.status != 'canceled'
     AND ap.due_date BETWEEN :from AND :to   -- filtro é por VENCIMENTO, não por pagamento
  ```
  A tabela `accounts_payable` não tem nenhuma coluna de data de pagamento efetivo (confirmado em `server/migrations/20260731-000013-add-partial-payment-tracking.cjs`: a migration que introduziu `amount_paid` para suportar pagamento parcial **não** adicionou `payment_date`/`paid_at`). `amount_paid` é só um acumulador de valor, sem histórico de quando cada baixa ocorreu.
- **Impacto no sistema e na fábrica:** o relatório `GET /api/budget/report?year=&month=` (Controladoria) compara "orçado no mês X" com "pago no período filtrado por vencimento no mês X" — não com "efetivamente desembolsado no mês X". Dois cenários de erro real:
  1. Uma conta com vencimento em julho mas paga em agosto entra no "realizado de julho" mesmo que o caixa só tenha saído em agosto (o relatório de julho mostra gasto que ainda não aconteceu).
  2. Uma conta com vencimento em julho, mas paga só em setembro após atraso, nunca aparece no "realizado" de agosto ou setembro — fica perpetuamente presa no mês de vencimento original, mesmo že a saída de caixa real foi em setembro.
  Como Controladoria existe justamente para acompanhar orçado×realizado por período, essa distorção é o tipo de erro que mina a credibilidade do relatório para tomada de decisão gerencial (ex.: "estouramos o orçamento de julho" pode ser falso positivo se o pagamento só saiu em agosto).
- **Correção recomendada:** duas opções, ambas fora do escopo de uma correção "local" (por isso reportada, não corrigida nesta auditoria):
  1. Adicionar `payment_date`/`paid_at` em `accounts_payable` (e por simetria em `accounts_receivable`) — populado no evento real de baixa/pagamento — e trocar o filtro de `getCostCenterTotalsByPayable` para usar essa data quando disponível (fallback para `due_date` em contas ainda não pagas, se o requisito for "caixa competência" híbrido).
  2. Documentar explicitamente na tela/relatório de Controladoria que "realizado" = "vencido no período com baixa acumulada até a data da consulta", não "pago no período" — evita interpretação incorreta enquanto o dado não existe.
  Dado que a mudança de schema afeta módulo Financeiro pré-existente (fora do escopo desta entrega CONT/TES/CTR), recomendo tratar como item de roadmap P1 em `docs/governance/TODO.md`, não como bug pontual do commit auditado.
- **Testes/validações sugeridas:** teste de integração real (Postgres) criando uma conta a pagar com vencimento em um mês e baixa parcial simulada em outro, verificando que o relatório atribui o valor ao mês correto após a correção.

### P1-2 — Plano de Contas: desativar uma conta (`active=false`) não impede novo lançamento contábil nela

- **Localização:** `server/src/modules/accounting/application/use-cases/entry/CreateEntryUseCase.ts:60-68` e `UpdateEntryUseCase.ts:72-80`.
- **Evidência técnica:** ambos os use cases verificam **apenas** `account.accept_entries`:
  ```ts
  // CreateEntryUseCase.ts:65-67 (idêntico em UpdateEntryUseCase.ts:77-79)
  if (!account.accept_entries) {
    throw new BusinessRuleError(...)
  }
  ```
  Nenhum dos dois verifica `account.active`. `grep` confirma que a flag `active` nunca é lida em `server/src/modules/accounting/application/use-cases/entry/*.ts`.
- **Impacto no sistema e na fábrica:** o Plano de Contas expõe `PUT /api/accounting/accounts/:id` com `active: false` como forma de "desativação lógica" (documentado no cabeçalho da migration `20260807-000230-create-accounting-module.cjs:49-51`: *"`accounting_chart_of_accounts` usa `active` (boolean) para desativação lógica"*). Na prática, desativar uma conta não tem nenhum efeito sobre a capacidade de lançar nela — um usuário pode continuar postando lançamentos contábeis em uma conta marcada como desativada, o que contradiz a intenção documentada e pode gerar lançamentos em contas que a Contabilidade já considerava encerradas (ex.: conta de empréstimo quitado, desativada por engano ainda em uso).
- **Correção recomendada:**
  ```ts
  // CreateEntryUseCase.ts e UpdateEntryUseCase.ts, dentro do loop de validação de items:
  if (!account.accept_entries) {
    throw new BusinessRuleError(`A conta "${account.code} - ${account.name}" é sintética (accept_entries=false) e não aceita lançamento direto.`);
  }
  if (!account.active) {
    throw new BusinessRuleError(`A conta "${account.code} - ${account.name}" está desativada e não aceita novo lançamento.`);
  }
  ```
- **Testes/validações sugeridas:** teste unitário `CreateEntryUseCase`/`UpdateEntryUseCase` com `account.active = false` e `accept_entries = true`, esperando `BusinessRuleError`.

---

## P2 — Achados de robustez / edge case

### P2-1 — Geração de `entry_number`/estorno por `COUNT` sob concorrência (risco de colisão, não de dado silenciosamente errado)

- **Localização:** `server/src/modules/accounting/application/use-cases/entry/CreateEntryUseCase.ts:70-71` e `ReverseEntryUseCase.ts:53-54`; `server/src/modules/accounting/infrastructure/sequelize/SequelizeAccountingRepository.ts:54-56` (`countEntries`).
- **Evidência:** `entry_number` é calculado como `LC-${count+1}` via `AccountingEntry.count()` dentro da mesma transação, sem `SELECT ... FOR UPDATE` nem sequência de banco dedicada.
- **Impacto:** sob duas criações/estornos simultâneos, ambos podem ler o mesmo `count` e tentar inserir o mesmo `entry_number`. Como a coluna tem `UNIQUE` (migration `20260807-000230`, linha 113) e o `errorHandler` trata `SequelizeUniqueConstraintError` com HTTP 409 amigável (`server/src/middlewares/errorHandler.ts:24,73-78`), o pior caso é uma falha visível ao usuário (retry manual), **não** uma duplicidade silenciosa de numeração contábil. O próprio código já documenta essa decisão como aceitável (comentário em `CreateEntryUseCase.ts:9-12`, mesmo padrão usado em RFQ). Rebaixado de P1 para P2 por esse motivo — mas registrado porque numeração de lançamento contábil tem peso de auditoria fiscal maior que RFQ.
- **Correção recomendada (se o volume de lançamentos concorrentes crescer):** usar uma sequência Postgres dedicada (`CREATE SEQUENCE accounting_entry_number_seq`) ou `SELECT ... FOR UPDATE` em uma linha de controle, eliminando a corrida de leitura-depois-escrita.
- **Testes sugeridos:** teste de integração com 2 chamadas simultâneas de `POST /api/accounting/entries` contra Postgres real, validando que ambas completam (uma pode falhar com 409 e re-tentar) e nunca duplicam `entry_number`.

### P2-2 — Tesouraria: saldo de conta bancária (`current_balance`) é 100% manual, sem qualquer vínculo com eventos reais de caixa

- **Localização:** `server/src/modules/treasury/application/use-cases/bank-account/CreateBankAccountUseCase.ts` e `UpdateBankAccountUseCase.ts`; `server/src/modules/treasury/presentation/validators/treasuryValidators.ts:22,33` (`current_balance: z.number().finite().optional()` — aceita qualquer valor, inclusive negativo, sem aviso).
- **Evidência:** nenhuma referência a `TreasuryBankAccount`/`treasury_bank_accounts` existe fora do próprio módulo `treasury` (`grep` em `server/src/modules/financial`, `server/src/modules/sales`, `server/src/modules/procurement` não retornou nenhum arquivo). A liquidação de contas a pagar/receber, a conciliação bancária OFX (`server/src/modules/financial/presentation/routes/reconciliation.ts`) e o faturamento não atualizam `current_balance` em nenhum ponto — é editado exclusivamente via `PUT /api/treasury/bank-accounts/:id`.
- **Impacto:** o relatório `GET /api/treasury/cash-position` (Posição de Caixa consolidada) soma esses saldos manuais e os cruza com títulos em aberto reais (`accounts_payable`/`accounts_receivable`) — ou seja, metade da equação (saldo bancário) é confiável apenas na medida em que um humano lembrou de atualizar manualmente, enquanto a outra metade (títulos) é derivada de dados transacionais reais. Isso é consistente com o que o commit e `docs/governance/TODO.md` **já documentam explicitamente** como decisão consciente ("saldo mantido manualmente pela Tesouraria"), então não é um bug oculto — mas é um risco operacional real: divergência de caixa não seria detectada pelo sistema, só por conferência manual externa.
- **Correção recomendada (não bloqueante, registrar em roadmap):** ao integrar com a conciliação bancária OFX existente (`bank_statement_entries`), oferecer atualização assistida (não automática) de `current_balance` a partir do último saldo do extrato importado, com timestamp de "última atualização por extrato" versus "última edição manual" — reduz o tempo de defasagem sem tirar o controle humano.
- **Risco residual:** aceito conscientemente pelo time, mas deve permanecer visível em `docs/governance/TODO.md` (já está) e não ser tratado como paridade completa com um caixa real até essa integração existir.

### P2-3 — `entry_date`/datas de Tesouraria e Contabilidade validadas apenas como string não vazia, não como data real

- **Localização:** `server/src/modules/accounting/presentation/validators/accountingEntryValidators.ts:26,33` (`entry_date: z.string().trim().min(1, ...)`, sem regex/formato).
- **Evidência:** ao contrário de `treasuryValidators.ts:52` (`dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, ...)`), o validador de Contabilidade não valida formato de `entry_date`. Uma string como `"07/08/2026"` ou `"não é uma data"` passa pelo Zod e só falha (com erro Postgres cru, não uma `ValidationError` 422 amigável) ao tentar o `INSERT` na coluna `DATEONLY`.
- **Impacto:** UX pior (erro 500 genérico em vez de 422 didático) em caso de payload malformado vindo de integração futura ou de um client que não seja a tela React atual (que já usa `<input type="date">` e não deixa o usuário digitar formato livre). Não é uma falha de integridade de dado (o banco rejeita a data inválida de qualquer forma), é uma falha de robustez de validação de borda.
- **Correção recomendada:**
  ```ts
  const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD.');
  // aplicar em entry_date de createEntrySchema/updateEntrySchema, mesmo padrão já usado em treasuryValidators.ts
  ```
- **Testes sugeridos:** teste unitário do validator com `entry_date: 'not-a-date'` esperando falha de parse Zod (422), não erro de banco.

### P2-4 — Controladoria: linha de orçamento anual "achatada" (`month IS NULL`) tem `DELETE` físico sem checar se já existe realizado associado

- **Localização:** `server/src/modules/budget/application/use-cases/budget-line/DeleteBudgetLineUseCase.ts` (não há checagem cruzada com `accounts_payable` antes de apagar).
- **Evidência:** a migration documenta conscientemente (`20260807-000250-create-budget-module.cjs:48-52`) que `budget_lines` é "artefato de planejamento" e por isso usa `DELETE` físico em vez de soft delete, o que é uma decisão de design aceitável — mas não há validação de que, ao apagar uma linha de orçamento de um período já fechado/decorrido, o histórico do relatório orçado×realizado para aquele período desaparece silenciosamente (o "orçado" da comparação para aquele mês/ano some, mas o "realizado" continua existindo, distorcendo `variance`/`variance_percent` de consultas históricas).
- **Impacto:** baixo/moderado — afeta apenas a reconstrução de relatórios históricos após exclusão de uma linha antiga; não corrompe dados transacionais reais (contas a pagar), só o comparativo. Como é planejamento (não lançamento fiscal), o risco é aceitável, mas vale um aviso na UI ("esta linha já tem período decorrido, apagar impede reconstruir o comparativo histórico").
- **Correção recomendada (não bloqueante):** ao apagar uma linha com `year`/`month` no passado, retornar um aviso (não bloqueio) no payload de resposta, ou logar em auditoria com destaque.

---

## BAIXO/CLEAN — Pontos fortes confirmados (não são achados, é evidência de conformidade)

1. **Partida dobrada corretamente isolada em `PostEntryUseCase`, não em `Create`/`Update`** — permite montar lançamento incrementalmente em `draft`, mas exige soma exata (calculada em centavos via `toCents`/`fromCents` para evitar erro de ponto flutuante) apenas ao "fechar" o lançamento. `server/src/modules/accounting/application/use-cases/entry/PostEntryUseCase.ts:58-82`. Confirmado por teste unitário real e passante.
2. **Imutabilidade de lançamento `posted`/`reversed` é real, não só documentada:** `UpdateEntryUseCase.ts:57-59` bloqueia edição fora de `draft`; `PostEntryUseCase`/`ReverseEntryUseCase` usam `findEntryByIdForUpdate` com `lock: transaction.LOCK.UPDATE` (`SequelizeAccountingRepository.ts:94-96`), prevenindo condição de corrida entre duas chamadas simultâneas de post/reverse no mesmo lançamento.
3. **Estorno é append-only de verdade:** `ReverseEntryUseCase.ts` nunca chama `deleteEntryItems`/`update` nos itens do lançamento original — cria um novo `AccountingEntry` (`entry_type: 'adjustment'`) com débito/crédito invertidos e `reversal_of_id` apontando para o original, e o original só tem seu `status` trocado para `reversed` (histórico preservado). FK `reversal_of_id` é `ON DELETE SET NULL`, não `CASCADE`, então apagar (hipoteticamente) o estorno não apaga o original.
4. **FKs corretas para o requisito de auditoria fiscal:** conta com lançamento não pode ser apagada (`accounting_entry_items.account_id` → `ON DELETE RESTRICT`, migration `20260807-000230`, linha 166-168); usuário autor de lançamento não pode ser apagado (`created_by`/`approved_by` → `ON DELETE RESTRICT`, linhas 128-137). Confirmado no schema, não apenas em código de aplicação.
5. **Seed do Plano de Contas é idempotente de verdade:** `ON CONFLICT (code) DO NOTHING` (migration `20260807-000231`, linha 82) mais índice único em `code` (migration `20260807-000230`, linha 193) — rodar a migration duas vezes não duplica nem falha. `down()` remove em ordem filha→pai, respeitando o `RESTRICT` do self-FK `parent_id`.
6. **RBAC 100% coberto e coerente nas 3 rotas novas**, com granularidade correta (nível `approve` só onde há transição de status sensível — `post`/`reverse` em Contabilidade, `settle`/`cancel` em Tesouraria; Controladoria sem `approve` por não ter transição sensível). Confirmado em `server/src/shared/domain/accessModules.ts`, nas 3 rotas (`accounting.ts`, `treasury.ts`, `budget.ts`) e no teste de guarda anti-regressão `server/tests/unit/module-authorization-map.test.ts`, que passou nesta auditoria.

---

## Verificação de afirmações do commit (não aceitas por padrão — testadas)

| Afirmação do commit/TODO.md | Verificado nesta auditoria | Resultado |
|---|---|---|
| "962/963 passando... 19 testes novos do módulo Contabilidade" | `npx jest tests/unit/accounting-use-cases.test.ts` isolado | ✅ 19 testes reais, todos passam |
| "0 erros" no `npm run typecheck --prefix server` | `npx tsc --noEmit -p .` a partir de `server/` | ✅ Confirmado, saída vazia (0 erros) |
| Migration "aplicada ao Postgres local... 30 linhas seedadas" | Leitura estática do SQL (não há banco disponível nesta sessão de auditoria para reexecutar contra Postgres real) | ⚠️ Não reexecutado contra banco — a lógica da migration é logicamente correta e idempotente por inspeção, mas a auditoria não confirmou a aplicação real em um Postgres ao vivo. Recomenda-se `npm run migration:status --prefix server` antes do próximo Go-Live gate. |
| RBAC "cobertura real" | Leitura de todas as rotas + execução de `module-authorization-map.test.ts` | ✅ Confirmado — todas as rotas de escrita/transição usam `authorizeModule`, sem rota órfã |
| Testes unitários de Tesouraria/Controladoria (242/265 linhas) | `npx jest tests/unit/treasury-use-cases.test.ts tests/unit/budget-use-cases.test.ts` | ✅ Passam, 87 testes no total entre os 4 arquivos (accounting+treasury+budget+module-authorization-map) |

---

## Nota de segurança (fora do escopo principal, sinalização pontual conforme instrução)

Nenhum achado de segurança crítico (secret hardcoded, SQL injection, CORS aberto) foi identificado nos arquivos revisados nesta auditoria — todas as queries agregadas (`getTrialBalanceRows`, `getCostCenterTotalsByPayable`, `getBudgetTotalsByCostCenter`) usam `replacements` parametrizados do Sequelize, nenhuma concatenação de string de usuário em SQL. Todas as rotas exigem `authenticate` antes de `authorizeModule`. Não foi conduzida uma varredura de segurança completa — para isso, usar o agente `auditor-seguranca` dedicado, conforme divisão de escopo.

---

## Próximos passos recomendados (ordem de prioridade)

1. **P1-2** (conta desativada ainda aceita lançamento) — correção pontual e local, baixo risco, pode ser feita em `CreateEntryUseCase.ts`/`UpdateEntryUseCase.ts` sem tocar schema. Recomendo tratar antes do próximo Go-Live gate.
2. **P1-1** (semântica "realizado" por vencimento vs. pagamento) — decisão de produto + mudança de schema (`payment_date` em `accounts_payable`/`accounts_receivable`); registrar em `docs/governance/TODO.md` como item de roadmap P1, não corrigir isoladamente sem alinhar com o dono do módulo Financeiro.
3. **P2-1/P2-3** — melhorias de robustez de baixo custo (validação de formato de data, sequência dedicada de numeração se o volume crescer).
4. **P2-2/P2-4** — já documentados como decisão consciente; manter visibilidade em `docs/governance/TODO.md` até a integração com conciliação bancária ser priorizada.
5. Executar teste de integração real (Postgres) do fluxo completo `create→post→reverse` de Contabilidade e `settle→cancel` de Tesouraria, hoje coberto apenas por unitário com mock de repositório (gap já reconhecido no próprio `docs/governance/TODO.md`).
