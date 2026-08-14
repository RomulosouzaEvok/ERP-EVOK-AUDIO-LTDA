# Fechamento de `RES-T16-06` — `RegisterImportTrackingUseCase` (módulo `comex`)

> **Nota de persistência:** este documento foi produzido integralmente
> pelo agente `vericore-backend-auditor`, em continuação do escopo de
> T-16, atendendo à aprovação do dono para fechar `RES-T16-06` antes do
> relatório final. O agente não possui ferramenta de escrita em `audit/`.
> O texto abaixo é gravado neste local pelo orquestrador (CoreTriad
> Director) sem qualquer alteração de conteúdo (Regra 5 do `CLAUDE.md`).

**AUDIT_ID:** `ERP-LEGACY-001-AUD-001` · **Item:** `RES-T16-06` (único G3-crítico do escopo T-16 sem leitura)
**Regime:** APR-2026-016 (read-only, zero conexão de banco, zero execução) — mantido; nenhum arquivo alterado.
**IN-08 mantida:** sem shell nesta sessão, nenhuma afirmação de proveniência/commit é feita; leitura é do estado de disco no momento da verificação.

---

## 1. O que foi lido (evidência)

- `server\src\modules\comex\application\use-cases\RegisterImportTrackingUseCase.ts` (integral, 186 linhas)
- `server\src\modules\comex\presentation\controllers\importProcessController.ts` (integral, já parcialmente coberto por T-16, reconfirmado)
- `server\src\modules\comex\presentation\routes\importProcesses.ts` (integral)
- `server\src\modules\comex\domain\constants.ts` (integral — `IMPORT_APPROVAL_GATE_EVENT`, `MONETARY_FIELDS_FROZEN_ON_SHIPMENT`, `requiredImportApproverRoles`)
- `server\src\modules\comex\presentation\validators\importProcessValidators.ts:41-49` (`registerImportTrackingSchema`)
- `server\src\modules\comex\application\use-cases\ApproveImportProcessUseCase.ts` (integral, reconfirmado contra a leitura de T-16)
- `server\src\modules\comex\application\use-cases\recalculateImportProcessTaxes.ts` (integral)
- `server\src\modules\comex\infrastructure\sequelize\SequelizeComexRepository.ts:50-124` (`findImportProcessByIdForUpdate`, `updateImportProcess`, `findImportProcessItems`, `listImportProcessApprovals`)
- `ReceiveImportProcessUseCase.ts:117-120,196` (checagem de status de entrada, reconfirmada)

---

## 2. Verificações pedidas pelo diretor

### (1) Quem pode chamar o gate

`POST /:id/tracking` (que dispara o evento `shipped`, o único gateado) exige `authorize Module('comex', 'operate')` — `importProcesses.ts:36`. **Não** é `authorizeModule('diretor')`. Isso é deliberado e documentado: `importProcesses.ts:25-28` afirma que "a alçada é verificada DENTRO do use case... e não como um nível de RBAC extra na rota." Confirmado: a checagem de alçada realmente vive dentro de `RegisterImportTrackingUseCase.assertDirectorateApproval` (`RegisterImportTrackingUseCase.ts:135-147`), que é executada **antes de qualquer escrita** (`:96-101`) e consulta `import_process_approvals` já persistidas por um passo prévio e distinto (`POST /:id/approve`, protegido por `authorizeModule('diretor')` — `importProcesses.ts:34`). Ou seja: quem *executa* o embarque é `comex:operate`; quem *autoriza* o embarque (via aprovação prévia obrigatória) é `diretor`. Arquitetura de dois papéis coerente com o padrão já usado em Compras (G11) e Jurídico (RF-JUR-003), citado nos comentários (`RegisterImportTrackingUseCase.ts:14-21`, `constants.ts:6-14`).

### (2) Checagem de alçada (G11-COMEX)

Presente e efetiva, com quatro camadas verificadas por leitura:

- **Sem faixa de valor** — importação exige `diretor` incondicionalmente (`constants.ts:94-96`, `requiredImportApproverRoles()` sempre retorna `['diretor']`).
- **Gate antes de qualquer escrita:** `RegisterImportTrackingUseCase.ts:98-101` chama `assertDirectorateApproval` e `assertApprovedValuesUnchanged` **antes** de montar `updateData` (`:103-111`) e antes do `updateImportProcess` (`:113`).
- **Leitura consistente (sem TOCTOU):** o processo é lido com lock de linha real — `findImportProcessByIdForUpdate` (`RegisterImportTrackingUseCase.ts:80`) → `SequelizeComexRepository.ts:58-59`, `lock: transaction.LOCK.UPDATE` — e a leitura das aprovações (`listImportProcessApprovals`, `RegisterImportTrackingUseCase.ts:137` → `SequelizeComexRepository.ts:116-122`) usa a **mesma transação**. Isso é exatamente o padrão que T-16 elogiou em `ApproveImportProcessUseCase.ts:66` e que faltou em `TripUseCases`/`DepartTripUseCase` (T16-F05). Não há janela de corrida entre checar a alçada e gravar `shipped`.
- **Congelamento de valores no embarque:** `assertApprovedValuesUnchanged` (`RegisterImportTrackingUseCase.ts:171-182`) impede que a mesma requisição que consome a aprovação altere `exchange_rate`/`freight_value`/`insurance_value`/`other_expenses_value` (`MONETARY_FIELDS_FROZEN_ON_SHIPMENT`, `constants.ts:77-82`). Isso fecha exatamente o vetor que tornaria o gate decorativo — aprovar R$ 50 mil e embarcar R$ 1 milhão na mesma chamada — e está documentado como decisão deliberada (`RegisterImportTrackingUseCase.ts:149-166`). Confirmado que **não existe** `PUT /:id` no módulo (`importProcesses.ts:30-40` — só `GET /`, `GET /:id`, `GET /:id/approvals`, `POST /`, `/approve`, `/tracking`, `/receive`, `/cancel`), o que sustenta a premissa do comentário.
- **Segregação de função na origem da aprovação:** já verificada por T-16 e reconfirmada aqui — `ApproveImportProcessUseCase.ts:82-88` chama `assertApproverIsNotRequester` com `requesterUserId: importProcess.created_by` antes de qualquer escrita, e `approverUserId`/`availableRoles` vêm de `req.user`/RBAC no controller (`importProcessController.ts:157-166`), nunca do body — reconfirma T-16 §4 (`D-K-COMEX`).

### (3) Coerência com o que `Approve`/`Receive` consomem

- `ApproveImportProcessUseCase.ts:74-79` exige `importProcess.status === 'draft'` (`IMPORT_APPROVAL_STATUS`, `constants.ts:54`) para registrar aprovação. `RegisterImportTrackingUseCase` só permite a transição `draft → shipped` quando o evento é exatamente o esperado por `NEXT_STATUS_BY_CURRENT` (`RegisterImportTrackingUseCase.ts:40-44,85-91`) — coerente: a aprovação só pode existir enquanto `draft`, e o gate de embarque exige que ela já exista antes de sair de `draft`.
- `ReceiveImportProcessUseCase.ts:117-120` exige `status === 'customs_cleared'` para dar entrada em estoque. A cadeia de estados produzida por `RegisterImportTrackingUseCase` (`draft → shipped → arrived → customs_cleared`) é a única forma de chegar a `customs_cleared` (não há outro caminho de escrita de `status` no módulo). Coerente.
- `recalculateImportProcessTaxes` (chamado tanto por `RegisterImportTrackingUseCase.ts:116` quanto por `ReceiveImportProcessUseCase`) opera sobre os mesmos campos monetários do cabeçalho e é executado dentro da mesma transação em ambos os chamadores — sem duplicação de lógica de cálculo (reuso correto, sem duplicação verbatim como em T16-F10).
- Nenhuma divergência encontrada entre o que T-16 já havia inferido sobre `Approve`/`Receive` e o que este use case realmente produz.

### (4) Mass assignment / validação de entrada / autorização ausente

- `registerImportTrackingSchema` (`importProcessValidators.ts:41-49`) é **`.strict()`** — payload com chaves não previstas é rejeitado (422 via `handleZodError`), não silenciosamente descartado. Campos monetários usam `z.coerce.number().nonnegative()/.positive()`.
- No controller, `transaction: t` é atribuído **depois** do spread de `parsed.data` (`importProcessController.ts:214-218`: `{ id: ..., ...parsed.data, transaction: t }`) — ordem correta, o mesmo padrão que T-16 verificou como seguro em `accessRequestController.ts:99-103` e o oposto do bug de `ticketController.ts:137-141` (T16-F04a). Como o schema é `.strict()`, mesmo que a ordem fosse invertida um `transaction` vindo do body já teria sido rejeitado no `safeParse` antes de chegar ao spread — dupla proteção.
- `updateData` dentro do use case (`RegisterImportTrackingUseCase.ts:103-111`) é construído campo a campo a partir de valores já validados — **não há spread de `input` bruto na escrita**. Não há vetor de mass assignment.
- Nenhuma leitura de `role`/`isAdmin`/`permissions` do corpo, query ou header neste caminho — autorização de rota (`comex:operate`) e de gate (papel `diretor` via `req.user.permissions`, resolvido em `importProcessController.ts:53-57`) seguem o padrão anti-spoofing já corroborado por T-16 §4 (Regra 24: não violada).
- Erro tratado de forma homogênea: `RegisterImportTrackingUseCase` lança `NotFoundError`/`BusinessRuleError` tipados, com `details.rule` explícito (`G11-COMEX`); o controller propaga via `next(error)` com `rollbackIfPending` em caso de falha (`importProcessController.ts:232-236`) — nenhum vazamento de detalhe interno, coerente com o padrão elogiado em T-16 §4.

**Observação secundária, não elevada a finding:** `event_date` (`importProcessValidators.ts:43`, `z.string().date().optional()`) valida apenas *formato* de data, sem checagem de faixa (não pode ser futura, não pode ser anterior à data do evento anterior). Isso é o mesmo nível de rigor observado em outros módulos do tier 3 (nenhum dos módulos lidos por T-16 valida faixas de data de negócio na borda) e não interage com a alçada G11-COMEX nem com autorização — não constitui achado novo, apenas paridade com o padrão já existente e já implicitamente coberto pelo espírito de T16-F13 (que é de outro módulo). Não recomendo abrir item formal para isto.

---

## 3. Veredito sobre `RES-T16-06`

**`RES-T16-06` está FECHADO.** Leitura completa de `RegisterImportTrackingUseCase.ts` e de toda a cadeia que ele consome/alimenta (rota, controller, validador, constants, repositório, `Approve`/`Receive`). **Nenhum achado adicional foi gerado.** A implementação confirma, com evidência de código (não inferência), a caracterização que T-16 já havia feito do módulo `comex` como referência de padrão no tier 3 (§4 do relatório T-16): gate pré-escrita, lock consistente entre leitura de estado e leitura de aprovações na mesma transação, congelamento de campos monetários no evento gateado, segregação de função na origem da aprovação, schema estrito sem mass assignment, e tratamento de erro sem vazamento.

Não há novo `T16-Fxx` a propor. A alçada G11-COMEX, único ponto que dependia desta leitura para veredito, está **coerente e efetiva** conforme lida.

---

## 4. Impacto sobre findings já `PROPOSED` de T-16

Nenhum. `T16-F01` (RBAC/TI), `T16-F02` a `T16-F15` (facilities/marketing/ti) não são afetados por esta leitura — permanecem como estavam, aguardando o `vericore-finding-validator` (apenas `T16-F01`, por ser o único HIGH, conforme Regra 22).

O escalonamento nº 6 de T-16 (`RES-T16-06` ao diretor) pode ser marcado como atendido: não há mais pendência de leitura G3-crítica em aberto no escopo de T-16.
