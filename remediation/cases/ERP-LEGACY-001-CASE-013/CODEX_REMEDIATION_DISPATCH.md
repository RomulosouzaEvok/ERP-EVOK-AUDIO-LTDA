# Despacho de remediação — `ERP-LEGACY-001-CASE-013`

```
CASE_ID:      ERP-LEGACY-001-CASE-013
FINDING_ID:   FIND-ERP-009 (segregação de função "quem pede não aprova" —
              24 pontos originais + 11 pontos adicionais NP-1..NP-11
              encontrados na triagem, §2 do TRIAGE.md)
ESCOPO:       Implementação nova a partir da triagem completa. Worktree
              ainda NÃO existe — deve ser criada.
WORKTREE:     C:\Sistema EvokAudio\ERP-Evok-sana-FIND-ERP-009
BRANCH:       sana/ERP-LEGACY-001/CASE-013
BASE:         main, HEAD atual (o mesmo commit em que a triagem foi feita,
              752b6d8, ou mais recente se main avançou sem tocar os
              arquivos listados abaixo — conferir antes de começar)
DECISOES:     APR-2026-058 (P17, P18, P20, P21 decididas; P19 ABERTA/PENDENTE
              — não bloqueia o código, ver §2)
PRÉ-REQUISITO DE SEQUENCIAMENTO (Regra 11, TRIAGE §6.3):
              CASE-002 (FIND-ERP-005, Falha 1) precisa aterrissar em
              server/src/shared/domain/segregationOfDuties.ts ANTES deste
              caso. Conferir em CASE-002/CASE_STATUS.md se
              REMEDIATION_COMMIT já existe. Se não existir, este despacho
              NÃO deve ser iniciado — reportar bloqueio, não prosseguir.
DESTINO:      sanacore-remediation-engineer / Codex
```

## 1. Contexto — por que a implementação pode prosseguir agora

A triagem (`remediation/cases/ERP-LEGACY-001-CASE-013/TRIAGE.md`) chegou ao
veredito **BLOQUEADO POR DECISÃO HUMANA** porque o núcleo do caso — quais
dos 24+11 pontos exigem aprovador ≠ solicitante — era escolha de política de
controle interno (Regra 6), não algo que SanaCore pudesse decidir sozinho.
Essa decisão foi tomada pelo dono em `APR-2026-058`
(`coretriad/governance/APPROVALS.md:3471-3483`):

- **P17 = opção (d):** regra geral para **todo** ato de aprovação do sistema,
  com exceções nomeadas explicitamente. Isso resolve, na mesma decisão, os
  24 pontos originais da tabela do finding **e** os 11 pontos adicionais
  (NP-1..NP-11) que a triagem encontrou fora da lista original (§2 do
  TRIAGE.md) — não é preciso pedir decisão em separado para eles.
- **P18:** aplicar tudo de uma vez, agora, antes do Go-Live. A triagem já
  demonstrou (§5) que hoje **todos os módulos afetados estão sem dado
  real** (`PRODUCTION_STATUS_MAP.md`) — logo aplicar agora não trava
  nenhuma operação real, e o custo de aplicar cresce depois do Go-Live.
- **P20:** tolerância de ±2% em valor OU ±1 unidade (o que for maior) antes
  de exigir aprovação de nível superior na contagem de estoque.
- **P21:** a esteira de testes passa a bloquear entrega de módulo novo com
  ato de aprovação fora da lista de controle revisada.

**P19 está aberta e isso NÃO bloqueia o código.** A pergunta Q3 do TRIAGE.md
(§7) — quem será cadastrado como segundo aprovador em cada módulo — segue
sem resposta. Isso significa que, no ambiente atual (1 único usuário real,
`admin`, conforme `PRODUCTION_STATUS_MAP.md`), a regra aplicada em qualquer
ponto ficará **comprovadamente inoperante para esse usuário** até um segundo
aprovador ser cadastrado. Isso é **efeito operacional esperado e aceitável
antes do Go-Live** (nada em produção depende disso hoje) — não é motivo para
adiar a implementação do mecanismo. O engineer deve implementar a regra
normalmente, sem tentar contornar ou dispensar `admin`: o próprio código
auditado (`segregationOfDuties.ts:30-43`) já deixa isto explícito e é
comportamento a preservar (E-4 / R0 do TRIAGE.md).

## 2. Correções exigidas — quatro frentes, com causa-raiz por arquivo:linha

Este caso é amplo (24+11 pontos). O engineer deve tratar cada frente como um
**sub-commit dentro da mesma branch/caso** — ver recomendação de faseamento
no §5.

### (a) Regra geral "quem pediu não aprova" — 24 pontos originais + 11 novos

**Mecanismo já existe e é reutilizável sem alteração de assinatura:**
`server/src/shared/domain/segregationOfDuties.ts` — `isSelfApproval`
(`:112-119`), `assertApproverIsNotRequester` (`:134-149`),
`SEGREGATION_RULES` (`:75-84`, hoje só 4 entradas `D-K-*` de compras).
**Não recriar a função. Apenas adicionar entradas a `SEGREGATION_RULES` e
chamar `assertApproverIsNotRequester` em cada ponto, antes da primeira
escrita do `execute`.**

Aplicar a **todos** os pontos abaixo, exceto onde a própria triagem já
identificou necessidade de exceção nomeada (F3/F4 do TRIAGE.md §4 — ver
subitem "Exceções" abaixo).

**24 pontos originais (TRIAGE.md §1.2, tabela reconfirmada linha a linha):**

| # | Ponto | Arquivo:linha da causa-raiz | Campo do solicitante já existe? |
|---|---|---|---|
| 6 | Acesso TI — approve | `ApproveAccessRequestUseCase.ts:29-42` (`request.requested_by` nunca lido) | Sim, `requested_by` |
| 7 | Acesso TI — reject | `RejectAccessRequestUseCase.ts:28-40` | Sim |
| 8 | Contagem de inventário | `ApproveInventoryCountUseCase.ts:50-125`, comparação ausente; laço de ajuste `:77-100` (ver item (c) abaixo para tolerância) | Sim, `assigned_to`/`counted_by` |
| 9 | Postagem contábil | `PostEntryUseCase.ts` (92 linhas), `entry.created_by` nunca lido; grava `approved_by` em `:84-88` | Sim, `created_by` |
| 10 | Estorno contábil | `ReverseEntryUseCase.ts` (92 linhas); `:57-67` cria estorno já `posted`, sem passar por `PostEntryUseCase` — **cobrir os DOIS caminhos de escrita de `approved_by`** (F-A do TRIAGE.md §1.3) | Sim, `created_by`/`approved_by` do original |
| 11 | BOM | ver item **F2/B-2 abaixo** — tratamento especial, não é "chamada única" | Não (RC-2) |
| 12 | Transferência entre depósitos | `ApproveWarehouseTransferUseCase.ts:43-91`, `input.approverId` nunca comparado com `transfer.requested_by` | Sim |
| 13 | Liberação de lote | `ReleaseLotUseCase.ts:118-176` — comparar `releasedBy` com o inspetor da `latestInspection`, não com um "solicitante" genérico | Sim (via inspeção) |
| 14 | Bloqueio de lote | `inventory.ts:36` — **candidato a exceção nomeada**, ver "Exceções" | — |
| 15 | Release de desenho | `ReleaseDrawingUseCase.ts:27-46`, `drawing.created_by` nunca lido | Sim |
| 16 | Ativação de roteiro | `ActivateProductionRouteUseCase.ts:88`, sem comparação com `route.created_by` | Sim |
| 17 | Material de marketing | `ApproveMaterialUseCase.ts:27-42`, `approvedByUserId` nunca comparado com o criador | Sim |
| 18 | Orçamento de campanha | `BudgetDecisionUseCase.ts:41-70`, `decidedByUserId` sem comparação | Sim |
| 19 | Adjudicação de RFQ | `modules/rfq/application/use-cases/AwardRfqUseCase.ts` (nome real: `Rfq`, não `RFQ`) | verificar |
| 20 | Override de odômetro | `TripUseCases.ts:48-108` — `DepartTripUseCase`, `trip.requested_by` nunca lido no caminho do override | Sim, `requested_by` |
| 21 | MPS firmar/liberar | ver item **F2/B-3 abaixo** — tratamento especial | Não (RC-2) |
| 22 | Decisão de contrato de trabalho | `rh.ts:67,87` — **candidato a exceção nomeada** (ato unilateral do empregador), ver "Exceções" | — |
| 23-26 | LGPD/jurídico (decisão, revogação, rejeição, encerramento) | `juridico.ts:115,132,166,172-173` | verificar |
| 27 | Diretoria (planejamento/ata/risco) | `directorate.ts` (`POST /strategic-plannings`, `/meeting-minutes`, `/business-risks`) — **candidato a exceção nomeada** (criação é o ato), ver "Exceções" | — |
| 28 | Liberação de documento vencido | `facilities.ts:52`, consumido por `DepartTripUseCase:67` (`!insurance.released_by`) | verificar |

Ponto **#5 (contrato jurídico) está FORA deste caso** — pertence a
`ERP-LEGACY-001-CASE-002`/FIND-ERP-005 e já foi despachado lá. Não
reimplementar, não retestar aqui — apenas reutilizar a função
`assertApproverIsNotPriorApprover` que aquele caso cria no mesmo arquivo
`segregationOfDuties.ts`, se necessário para algum ponto multi-assinatura.

**11 pontos adicionais (TRIAGE.md §2, NP-1..NP-11):**

| ID | Ponto | Arquivo:linha da causa-raiz | Observação |
|---|---|---|---|
| NP-1 | Pagamento de conta a pagar | `finance.ts:36` → `financialController.ts:175-183` → `PayPayableUseCase`; `models/AccountPayable.ts:55` declara `approved_by` mas **nunca é escrito**; controller não passa `req.user.id` | Corrigir também a ausência de escrita de identidade (RC-2), não só a segregação |
| NP-2 | Recebimento de conta a receber | `finance.ts:30` | Mesma classe de NP-1 |
| NP-3 | Liquidação/cancelamento de operação financeira | `treasury.ts:48-49`; `models/TreasuryFinancialOperation.ts:42-64` **não tem nenhuma coluna de usuário** | Exige migration (ver "Migrations" abaixo) |
| NP-4 | Emissão/cancelamento de NF-e de venda | `sales.ts:54,56` | Verificar campo do solicitante antes de implementar |
| NP-5 | Conclusão de processo de rescisão | `rh.ts:99` | Verificar campo do solicitante |
| NP-6 | SST — 10 atos | `sst.ts:54,74,75,77,84,90,91,92,93,95` | Verificar campo do solicitante em cada um |
| NP-7 | Obsoletar desenho | `engineering.ts:44` | Gêmeo do ponto #15 — mesmo padrão |
| NP-8 | Inativar roteiro de produção | `productionRoutes.ts:38` | Gêmeo do ponto #16 |
| NP-9 | Designar gestor de diretoria | `directorate.ts:36` | Ato de nomeação — avaliar se é "criação é o ato" (exceção) ou não |
| NP-10 | Facilities — suspender condutor, indicar/pagar multa | `facilities.ts:60,80,82` | Verificar campo do solicitante |
| NP-11 | Criação/edição de perfil de acesso | `accessProfiles.ts:24-25` | **Toca `users`, que é PRODUÇÃO REAL parcial (APR-2026-016) — tratar com cautela, sem tocar dado real** |

**Exceções nomeadas (P17 permite, e a própria triagem já identificou
necessidade técnica ou organizacional):**

- **#14 bloqueio de lote** (`inventory.ts:36`) — ato restritivo, risco de
  autoaprovação é baixo (TRIAGE.md §4/F3). Registrar exceção explícita no
  `AUTHORIZATION_MATRIX` (item (d) abaixo), não implementar segregação.
- **#22 decisão de contrato de trabalho** (`rh.ts:67,87`) — ato unilateral
  do empregador (BR-RH-D01), segregação não é definível. Registrar exceção.
- **#27 atos de diretoria** (`directorate.ts`) — criação é o próprio ato
  aprovado, segregação não é definível. Registrar exceção.
- **#19 adjudicação de RFQ** — mitigado a jusante (o artefato gerado cai
  sob D-K). Se o engineer, ao implementar, achar que a mitigação a jusante
  não é suficiente, deve implementar a segregação normalmente (P17 já
  autorizou regra geral); só marcar como exceção se replicar exatamente o
  raciocínio do TRIAGE.md §4/F4.

Onde o engineer verificar, durante a implementação, que um ponto **não tem
campo de solicitante gravável hoje** (RC-2, ex. NP-1/NP-2/NP-3, BOM, MPS),
NÃO pular o ponto — implementar a gravação de identidade primeiro (é trilha
de auditoria, não decisão de política, TRIAGE.md §3/RC-2), depois a
segregação. Ver itens dedicados abaixo (BOM, MPS, NP-1/2/3).

**BOM (#11) — tratamento dedicado, blast radius alto (TRIAGE.md §4/F2):**
`ApproveBOMUseCase.ts:40` não recebe identidade e (`:55-66`) não escreve
`approved_by`/`approval_date` mesmo quando chamado (agravante F-B). Além
disso, `bomService.ts` grava a BOM já com `status:'active'`, contornando o
`defaultValue:'draft'` de `models/BillOfMaterial.ts:47`. Corrigir:
1. `ApproveBOMUseCase.execute` deve receber `approverUserId` e comparar com
   `bom.created_by` (segregação);
2. escrever `approved_by`/`approval_date` (fecha F-B, independente de P17);
3. `bomService.ts` deve criar a BOM como `draft`, não `active`;
4. criar rota `POST /api/boms/:id/approve` para o use case deixar de ser
   órfão.
**Blast radius não-local, confirmado pela triagem:**
`BillOfMaterial.findOne({ product_id, status:'active' })` é consumido pela
explosão de MRP, pela reserva na liberação de OP e pelo custeio na
conclusão (`ApproveBOMUseCase.ts:11-17`). Fazer a BOM nascer `draft`
significa que nenhuma BOM nova entra em vigor até ser aprovada. O engineer
deve, antes de mudar o valor default, fazer grep de todos os leitores de
`status:'active'` de BOM e confirmar que cada um segue funcionando com BOMs
`draft` existindo em paralelo (a BOM ativa anterior deve continuar sendo
selecionada até a nova ser aprovada — `activateExclusively` já existe para
isso).

**MPS (#21) — tratamento dedicado (TRIAGE.md §3/RC-2, §6.1/E-1a):**
`master_production_plans` não tem coluna `created_by` (grep confirmado: a
única ocorrência de `created_by` em `modules/masterProduction` é de outra
entidade, a Ordem de Produção gerada, `ReleaseMasterProductionPlanUseCase.ts:149`).
Migration adicionando `created_by INTEGER NULL` + escrita do JWT na criação
do plano. Módulo NÃO-PRODUÇÃO — confirmar `count(*) = 0` **apenas no banco
de teste `erp_evok_audio_test`**, nunca no banco real. Depois, aplicar
`assertApproverIsNotRequester` em `firm`/`release`
(`masterProductionPlans.ts:37-38`) comparando com o `created_by` agora
existente.

**NP-1/NP-2 (contas a pagar/receber) — tratamento dedicado:**
`models/AccountPayable.ts:55` já declara `approved_by` mas
`financialController.ts:175-183` nunca passa `req.user.id` ao use case, e
não existe `created_by`. Corrigir: (1) o controller deve passar
`req.user.id` como aprovador; (2) se não houver campo de solicitante da
conta a pagar, avaliar se a entidade que registrou o lançamento original
(ex. quem lançou a nota, quem criou a `AccountPayable`) pode servir de
"solicitante" para fins de segregação — se não houver campo equivalente,
registrar a limitação no pacote de evidência e aplicar ao menos a escrita
de `approved_by` (trilha de auditoria mínima), sem inventar campo novo sem
necessidade.

**NP-3 (tesouraria) — tratamento dedicado:**
`models/TreasuryFinancialOperation.ts:42-64` não tem nenhuma coluna de
usuário. Migration adicionando `created_by INTEGER NULL` (e, se aplicável,
`settled_by`) + escrita do JWT nos pontos de criação e de
`settle`/`cancel` (`treasury.ts:48-49`). Confirmar `count(*)` apenas em
banco de teste.

### (b) Aplicar tudo de uma vez, sem faseamento por módulo/onda

P18 decide que não há ondas (o TRIAGE.md §7/Q2 propunha ondas como opção,
mas o dono escolheu "tudo de uma vez, agora"). Isso significa: **todos os
pontos de (a) entram nesta mesma remediação**, não em casos ou dispatches
futuros por módulo. A recomendação de faseamento em sub-commits (§5) é
apenas para facilitar revisão incremental — não é faseamento de escopo.

### (c) Tolerância de contagem de inventário (±2% valor OU ±1 unidade, o maior)

**Causa-raiz:** `ApproveInventoryCountUseCase.ts:80` — o laço de ajuste
aplica a qualquer `variance !== 0`, sem faixa de tolerância e sem exigir
alçada superior para diferença grande.

**Correção exigida:**
1. Calcular, para cada linha de contagem, se a variância excede
   `max(2% do valor da linha, 1 unidade)`. Usar o maior dos dois critérios
   (P20 é explícito: "o que for maior").
2. Se a variância estiver **dentro** da tolerância: comportamento atual
   preservado (ajuste automático ao aprovar).
3. Se a variância **exceder** a tolerância: a aprovação da contagem deve
   exigir um nível de alçada superior ao nível `approve` comum hoje usado
   (verificar no código de autorização do módulo `inventory` qual nível
   mais alto já existe — não inventar nível novo sem necessidade; se não
   existir, registrar a lacuna e propor ao dono via pacote de evidência,
   não decidir sozinho).
4. Esta correção é **independente** da segregação de função do item (a) —
   as duas se aplicam ao mesmo `ApproveInventoryCountUseCase.ts`, mas são
   controles distintos. Implementar e testar separadamente, sem misturar
   as duas asserções no mesmo teste.

### (d) Guarda preventiva na esteira de testes (P21)

**Desenho já mapeado pela triagem (TRIAGE.md §6.1/E-2, E-3, §4/F5):**

1. **`AUTHORIZATION_MATRIX`** — artefato versionado (RESOURCE × ACTION ×
   rota × campo do solicitante × "tem segregação hoje? S/N/N-A" × "exige
   segregação? SIM/NÃO-exceção-nomeada"). Deve cobrir os 24 pontos
   originais + os 11 NP + qualquer outro ponto de aprovação que o
   engineer encontrar ao implementar. **Diferente da versão da triagem**
   (que deixou a coluna de política vazia porque aguardava decisão): agora
   a coluna deve ser **preenchida**, porque P17 já decidiu a regra geral —
   preencher "SIM" para todos os pontos, exceto os marcados como exceção
   nomeada acima, que recebem "NÃO — exceção: <motivo>".
   **Ownership (Regra 16):** o destino correto é `requirements/` ou
   `architecture/` (autoridade OpusCore) — mas SanaCore pode escrevê-lo
   **dentro da worktree de remediação**, nunca direto em `main` ou em
   `docs/` fora de worktree. Confirmar caminho exato com o padrão já usado
   no repositório para artefatos de matriz/organograma antes de criar
   arquivo novo.
2. **Guarda de reincidência** — teste (padrão já existente no repositório
   para guardas de organograma e docs-drift, TRIAGE.md §6.1/E-3) que varre
   `server/src/modules/*/presentation/routes` por verbos de aprovação
   (`approve|reject|release|firm|decision|award|authorize|close|validate|sign|activate|confirm|settle|pay`,
   mesmo padrão de busca usado pela triagem, TRIAGE.md §0) e **falha** se
   encontrar uma rota que não conste do `AUTHORIZATION_MATRIX`. Este guarda
   deve ser plugado na esteira de CI de forma que **bloqueie a entrega**
   (merge/build) de qualquer módulo novo com ato de aprovação fora da
   lista — cumprindo P21 literalmente.
3. Como P17/P21 já foram decididos (diferente da triagem, que só tinha a
   parte "não inventariado" executável), o guarda já pode reprovar também
   por "falta segregação onde a matriz diz SIM e o código não implementa"
   — não apenas por "não inventariado".

## 3. Testes exigidos por correção

Herdar o harness já mapeado (TRIAGE.md §8): testes de **integração HTTP**,
nunca unitários isolados — segregação por identidade é invisível a teste
que instancie o use case diretamente. Usar
`server/tests/helpers/testApi.ts` (`api()`, `authToken()`,
`hasIntegrationPrerequisites()`) e o **segundo token de administrador
distinto** (`ci-approver@evok.local`, já provisionado por
`scripts/run-api-suite.cjs`). Banco: **exclusivamente**
`erp_evok_audio_test`. Nunca o banco real.

Para cada ponto de (a): par mínimo (i) mesmo usuário como solicitante e
aprovador → rejeitado, estado inalterado; (ii) usuários distintos →
sucesso. Para os pontos onde a triagem já apontou o comparador correto
(ex. #13 vs. inspetor da última inspeção, não "solicitante" genérico),
seguir esse comparador, não um genérico. Para #9/#10 (contábil), cobrir
explicitamente os **dois** caminhos de escrita de `approved_by`
(postagem direta e estorno). Para BOM (#11): cobrir criação como `draft`,
rota de aprovação nova, rejeição de auto-aprovação, sucesso com
`approved_by`/`approval_date` preenchidos, e **confirmar que
`findOne({product_id, status:'active'})` não seleciona a BOM `draft`**
recém-criada (evitar regressão em explosão de MRP/reserva/custeio).

Para (b): nenhum teste dedicado — é confirmação de escopo, verificável
pela cobertura de (a) e (d) juntas.

Para (c): teste com variância dentro da tolerância (ajuste automático
preservado) e teste com variância acima da tolerância (exige alçada
superior, ou é rejeitado se alçada não existir — registrar qual dos dois
comportamentos foi implementado).

Para (d): teste que cria uma rota fictícia de aprovação fora da matriz e
confirma que o guarda falha; teste que confirma que todas as rotas reais
de aprovação hoje existentes constam da matriz (suíte deve estar verde no
momento da entrega).

**Não-regressão obrigatória (R0/E-4, TRIAGE.md §6.1/§8):**
`purchase-segregation-of-duties.test.ts` (381 linhas) deve permanecer
verde, incluindo os casos que provam que `admin` não é isento nos 4 pontos
de compras já existentes. Nenhuma alteração em `segregationOfDuties.ts`
pode afrouxar esses 4 pontos.

## 4. Prompt literal para colar no Codex

```text
Você está atuando como sanacore-remediation-engineer dentro da estrutura CoreTriad deste repositório.

Isto é uma REMEDIAÇÃO NOVA para ERP-LEGACY-001-CASE-013 / FIND-ERP-009 (segregação de função "quem pede não aprova"). A triagem completa está em remediation/cases/ERP-LEGACY-001-CASE-013/TRIAGE.md — leia-a por inteiro antes de editar qualquer coisa, especialmente §1 (pontos reconfirmados), §2 (11 pontos adicionais NP-1..NP-11), §3 (as três causas-raiz), §4 (blast radius por família), §6 (plano E/B) e §8 (testes exigidos).

O dono já decidiu o que faltava para desbloquear este caso, em coretriad/governance/APPROVALS.md, entrada APR-2026-058:
- P17 = opção (d): regra geral "quem pediu não aprova" para TODO ato de aprovação do sistema, com exceções nomeadas explicitamente. Isso cobre os 24 pontos originais do finding E os 11 pontos adicionais (NP-1..NP-11) que a triagem encontrou.
- P18: aplicar tudo de uma vez, agora, antes do Go-Live — nenhum módulo afetado tem dado real hoje.
- P19 (quem será o segundo aprovador em cada módulo): AINDA ABERTA/PENDENTE. Isso NÃO bloqueia sua implementação. Implemente a regra normalmente em todos os pontos decididos; o efeito prático é que, até o dono cadastrar um segundo aprovador real, o usuário admin (único usuário real hoje) ficará bloqueado de aprovar nos pontos onde a regra entrar — isso é esperado e aceitável antes do Go-Live. NÃO contorne isso, NÃO isente admin, NÃO implemente um "modo bootstrap" que não foi pedido.
- P20: tolerância de ±2% em valor OU ±1 unidade (o que for maior) antes de exigir aprovação de nível superior na contagem de estoque.
- P21: a esteira de testes deve bloquear entrega de módulo novo com ato de aprovação fora da lista de controle revisada.

Trabalhe em worktree NOVA, criada a partir de main:
  worktree: C:\Sistema EvokAudio\ERP-Evok-sana-FIND-ERP-009
  branch:   sana/ERP-LEGACY-001/CASE-013

ANTES de começar, confirme que o caso ERP-LEGACY-001-CASE-002 (FIND-ERP-005, Falha 1) já tem REMEDIATION_COMMIT registrado em seu CASE_STATUS.md. Se não tiver, PARE e reporte o bloqueio — não prossiga, porque este caso e aquele tocam o mesmo arquivo server/src/shared/domain/segregationOfDuties.ts e a colisão de merge é garantida se você prosseguir sem a base dele.

Regras absolutas:
- NÃO conecte em erp_evok_audio (produção), nem para contar linhas, nem "só para confirmar".
- NÃO execute suíte de teste, script de diagnóstico ou qualquer comando que abra conexão com banco de dados real, nem mesmo leitura. Testes de integração HTTP somente contra erp_evok_audio_test. Onde precisar confirmar count(*) de uma tabela (ex. master_production_plans, contas a pagar), confirme SOMENTE em erp_evok_audio_test.
- Não toque em audit/, coretriad/ (nenhum subdiretório), .claude/ ou docs/ fora do que estiver explicitamente autorizado neste despacho (o artefato AUTHORIZATION_MATRIX, se você decidir colocá-lo em requirements/ ou architecture/, deve ficar dentro desta worktree de remediação, nunca commitado direto em main fora dela).
- Não declare FINDING CLOSED nem RETEST_PASSED. Essa autoridade é exclusiva da VeriCore.
- Capture e registre no pacote de evidência o OUTPUT REAL dos comandos executados (testes, typecheck, build) — não apenas a alegação em texto. Isso foi ressalva explícita em outro caso deste mesmo fluxo (CASE-010) e não deve se repetir aqui.
- Não altere nenhuma asserção dos 4 pontos de compras já protegidos por segregationOfDuties.ts (D-K-REQUISICAO, D-K-PEDIDO, D-K-ALCADA, D-K-COMEX) nem em purchase-segregation-of-duties.test.ts — apenas adicione.

Dado o escopo amplo (24 pontos originais + 11 adicionais, mais duas migrations de schema e uma mudança de fluxo produtivo em BOM), FASEIE a implementação em SUB-COMMITS dentro desta mesma branch/caso (NÃO crie sub-casos novos, NÃO abra REMEDIATION_CASE separado). Ordem recomendada, cada sub-commit com sua própria prova vermelha/verde documentada no pacote de evidência:
1. Escrita de identidade onde falta (RC-2, trilha de auditoria pura): MPS (created_by), BOM (approverUserId + approved_by/approval_date), contas a pagar/receber (NP-1/NP-2), tesouraria (NP-3, com migration).
2. Segregação nos pontos "chamada única, campo já existe" (F1 do TRIAGE.md §4): acesso TI, contagem de inventário (segregação, sem a tolerância ainda), contábil (postagem e estorno, cobrindo os dois caminhos), transferência entre depósitos, liberação de lote, desenho, roteiro, marketing, override de odômetro, jurídico/LGPD, facilities, e os pontos NP correspondentes (NP-4 a NP-10) após confirmar o campo do solicitante de cada um.
3. BOM nascer draft + rota de aprovação nova (mudança de fluxo produtivo, blast radius alto — validar explicitamente que a explosão de MRP, reserva de OP e custeio continuam funcionando com BOM ativa anterior enquanto a nova está em draft).
4. MPS firm/release exigindo aprovação.
5. Tolerância de contagem de inventário (±2% valor OU ±1 unidade, o maior) — controle independente da segregação, no mesmo arquivo.
6. AUTHORIZATION_MATRIX preenchida (todos os pontos, coluna de política SIM/exceção nomeada) + guarda estrutural na esteira de testes que reprova rota de aprovação nova fora da matriz.
7. Exceções nomeadas (#14, #22, #27, e #19 se aplicável) registradas explicitamente na matriz com o motivo técnico/organizacional, sem implementar segregação nelas.

Cada sub-commit deve deixar a suíte relevante verde antes de seguir para o próximo. Não é obrigatório terminar todos os 7 nesta mesma sessão — se precisar parar no meio, documente exatamente onde parou no CASE_STATUS.md, com o que falta, para que a continuação (ou outro agente) retome sem re-trabalho.

Ao terminar (ou ao pausar entre sub-commits):
- Produza/atualize REMEDIATION_EVIDENCE_PACKAGE.md com: causa-raiz por arquivo:linha, correção aplicada por arquivo:linha, prova vermelha e verde de cada sub-commit, output real de testes/typecheck/build, e as exceções nomeadas com justificativa.
- Produza/atualize CASE_STATUS.md indicando exatamente quais dos 7 sub-commits foram concluídos e quais faltam.
- Commit em sana/ERP-LEGACY-001/CASE-013, nunca em main.
- Nunca escreva FINDING CLOSED nem RETEST_PASSED.
- Registre explicitamente que P19 permanece pendente e que, até resposta do dono, o usuário admin ficará bloqueado nos pontos onde a segregação foi aplicada — isso é esperado, não é bug.
- Pare aguardando revisão/segunda opinião/reteste da VeriCore.
```

## 5. Recomendação de faseamento

Dado o escopo (24+11 pontos, duas migrations, uma mudança de fluxo
produtivo em BOM), este despacho **recomenda explicitamente** que o Codex
implemente em sub-commits sequenciais dentro da mesma branch/caso — listados
no prompt acima — em vez de uma única entrega monolítica. Isso permite
revisão incremental (segunda opinião da VeriCore pode avaliar cada
sub-commit antes do conjunto inteiro) e reduz o risco de um erro em BOM (o
ponto de blast radius mais alto) contaminar a avaliação dos pontos mais
simples de F1. **Não deve gerar sub-casos novos** — é o mesmo
`REMEDIATION_CASE`, a mesma worktree, a mesma branch.

## 6. Registro

Este despacho autoriza implementação nova para `ERP-LEGACY-001-CASE-013` /
`FIND-ERP-009`, condicionada ao pré-requisito de sequenciamento com
CASE-002 (§0 do próprio TRIAGE.md, Regra 11). A autoridade para declarar
`RETEST_PASSED`/`FINDING CLOSED` permanece exclusiva da VeriCore — este
despacho não a antecipa e não presume o resultado do reteste.

**P19 (segundo aprovador por módulo) permanece pendente** e fica registrada
aqui como decisão aberta que **não bloqueia a implementação do mecanismo**,
apenas seu efeito prático para o único usuário real (`admin`) até o dono
indicar nomes/módulos. `RZ` (existir >1 usuário com `approve` em cada
módulo onde a regra entrar) continua sendo condição de aceite do reteste,
não detalhe de implantação — cabe à VeriCore avaliar isso no momento do
reteste, não a este despacho antecipar.

Registro herdado da triagem, reafirmado: SanaCore não declara
`RETEST_PASSED`, não declara `FINDING CLOSED` e não declara
`RISK_ACCEPTED`. `STATUS` de FIND-ERP-009 permanece `OPEN` até decisão da
VeriCore.
