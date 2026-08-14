# FINDING

FINDING_ID: FIND-ERP-006
AUDIT_ID: N/A — finding preliminar levantado durante discovery (passo 26), fora da sequência normal do passo 31, por autorização humana explícita (APR-2026-018)
PROJECT_ID: ERP-LEGACY-001
AUDIT_COMMIT: legacy-baseline-001 → c9359be399c45191fe90e8e9707803125a5ba91d
TITLE: LGPD — três obrigações legais sem materialização: o Encarregado (DPO) não tem cadastro e é substituído por `req.user.id`; o prazo de retenção é texto livre sem nenhum consumidor, expurgo ou anonimização; e o incidente de segurança não tem prazo de comunicação à ANPD
DOMAIN: compliance / business-rules
SUBDOMAIN: lgpd (art. 15/16 eliminação · art. 41 encarregado · art. 48 comunicação de incidente)
SEVERITY: HIGH
CONFIDENCE: CONFIRMED
STATUS: OPEN
AMBIENTE: DEV/HOMOLOGAÇÃO — `juridico` NÃO-PRODUÇÃO em `PRODUCTION_STATUS_MAP.md:160` ("Sem evidência de dado real carregado", criticidade BAIXA). A severidade HIGH **não** decorre de exposição atual de dado pessoal real.
DETECTED_BY: vericore-business-rule-auditor (BR-JUR-D12, BR-JUR-D13, passo 26)

## CORREÇÃO AO INSUMO DE DISCOVERY

**Erro de citação corrigido:** o fallback `req.user.id` **não está** em
`CreateDataSubjectRequestUseCase.ts:52` (essa linha é `dpo_user_id: input.dpoUserId`, passagem
pura). O fallback está no **controller**: `lgpdController.ts:118` →
`dpoUserId: req.body?.dpo_user_id ?? (req as any).user.id`. Recomenda-se corrigir também em
`BUSINESS_RULE_CANDIDATES_pessoas-governanca.md` §3 (BR-JUR-D13) — o agente auditor não pode
editar esse artefato (Regra 2).

## LACUNA 1 — Não existe cadastro do Encarregado; o campo que deveria nomeá-lo nomeia um operador qualquer

`jur_lgpd_data_subject_requests.dpo_user_id` é `INTEGER, allowNull: false`
(`models/JurLgpdDataSubjectRequest.ts:34,58`) e `jur_lgpd_incidents.dpo_user_id` idem
(`models/JurLgpdIncident.ts:30,49`). Não há, em `server/src` inteiro, nenhum cadastro, tabela,
configuração ou papel que registre **quem é o Encarregado da empresa**: grep por
`encarregado|Encarregado` devolve exatamente **2 ocorrências, ambas em comentários de cabeçalho**
(`CreateDataSubjectRequestUseCase.ts:6`, `CreateIncidentUseCase.ts:5`) — nenhuma linha executável.

Na ausência do cadastro, o valor é preenchido por fallback na apresentação:
- `lgpdController.ts:118` — `dpoUserId: req.body?.dpo_user_id ?? (req as any).user.id`
  (solicitação de titular: assume **quem registrou**);
- `lgpdController.ts:189` + `CreateIncidentUseCase.ts:51` — `?? null` seguido de
  `dpo_user_id: input.dpoUserId ?? input.createdBy` (incidente: assume **quem abriu**).
  **Agravante novo (não estava no insumo):** a mesma lacuna existe para incidentes, dobrando a
  superfície.

Como `POST /lgpd/data-subject-requests` e `POST /lgpd/incidents` exigem apenas `juridico:operate`
(`juridico.ts:163,171` — não estão na lista `approve` de :166,172,173), **qualquer operador do
jurídico que registre uma solicitação ou abra um incidente é gravado no banco como o Encarregado
responsável por ela**, sem verificação de designação. Não há sequer FK de `dpo_user_id` para
`users` declarada no model (apenas índice, :63 e :56).

A lacuna é **declarada no próprio código** (`CreateDataSubjectRequestUseCase.ts:6-11`): *"o
contrato de API não expõe cadastro formal de 'quem é o DPO' (pendência explícita §10.2 do
handoff) — nesta passada, se não informado explicitamente no payload, assume o usuário que
registra a solicitação (`req.user.id`), documentado como reconciliação de schema"*. O valor foi
escolhido para satisfazer um `NOT NULL`, não para representar a designação legal.

## LACUNA 2 — Retenção é texto livre com zero enforcement; nenhuma eliminação, programada ou sob demanda

A única materialização de "retenção" no backend é
`jur_lgpd_processing_activities.retention_period` — `STRING(150)`, `allowNull: true`
(`models/JurLgpdProcessingActivity.ts:27,48`). Grep exaustivo por
`retention|retenc|expurgo|purge|anonimiza|anonymiz|descarte` (case-insensitive) em todo
`server/src` devolve **5 ocorrências do campo**, todas de declaração, escrita ou repasse
(`LgpdTypes.ts:21`, `CreateProcessingActivityUseCase.ts:57`, `UpdateProcessingActivityUseCase.ts:39`,
e as duas do model). **Nenhum leitor. Nenhum consumidor. Nenhum cálculo.**

O campo é ainda **opcional na criação**: `CreateProcessingActivityUseCase.ts:36-41` exige
`purpose`, `legal_basis`, `data_categories`, `data_subject_categories` e `department_id` — e
**não** `retention_period`. É possível registrar uma atividade de tratamento de dado pessoal sem
declarar prazo de guarda nenhum.

**Agravante novo (não estava no insumo):** não existe expurgo programado porque **não existe
agendador algum** — grep por `node-cron|setInterval|new CronJob|schedule\(` em todo `server/src`
retorna **zero ocorrências**. A lacuna não é "um job faltando": é uma **camada inexistente**.

**Agravante novo (não estava no insumo):** a eliminação **sob demanda** também não ocorre. Os
tipos `deletion` e `anonymization` existem no enum (`JurLgpdDataSubjectRequest.ts:15,42`), mas
`ResolveDataSubjectRequestUseCase.ts:38-42` resolve **qualquer** um dos 8 tipos gravando
exclusivamente `status: 'answered'`, `resolution_notes` e `answered_at`. **Nenhum dado é apagado,
anonimizado ou exportado** — a "resolução" de um pedido de exclusão é um texto livre afirmando
que alguém a teria feito, sem prova no sistema.

Único parente implementado é a revisão anual do RoPA (`CreateProcessingActivityUseCase.ts:47-48,60`
— `next_review_due_at` = hoje + 1 ano), que trata da **revisão do registro**, não do **descarte do
dado**.

## LACUNA 3 — VERIFICADA E CONFIRMADA: nenhum prazo de comunicação à ANPD

A comparação interna ao próprio módulo é a evidência mais forte, porque o sistema **sabe** modelar
prazo legal e o fez para a solicitação de titular e **não** o fez para o incidente:

- **Solicitação de titular:** `due_date` é `DATEONLY, allowNull: false`
  (`JurLgpdDataSubjectRequest.ts:26,50`), **indexada** (:63), calculada em
  `CreateDataSubjectRequestUseCase.ts:40-41,50` (`received_at + 15 dias`) e **cobrada** em painel
  por `PendingCriticalDataSubjectRequestsUseCase.ts:20-28` (`dias_restantes`, `vencido: true`).
- **Incidente:** a interface completa de atributos (`models/JurLgpdIncident.ts:18-35`) e a
  definição do model (:37-51) **não contêm nenhum campo de prazo** — os únicos campos temporais
  são `occurred_at`, `detected_at`, `closed_at` e timestamps. O ciclo de vida
  (`CreateIncidentUseCase.ts:43-53` → `DecideIncidentUseCase.ts:59-63` → close) **nunca deriva um
  prazo de `detected_at`**. Não há consulta de "incidentes com comunicação vencida".

Existe controle **material** da decisão (BR-JUR-042, `DecideIncidentUseCase.ts:41-46`: as duas
justificativas obrigatórias mesmo para `not_communicate`) — mas nenhum controle **temporal**. O
sistema garante que a decisão seja fundamentada e não garante que ela seja tomada a tempo, nem
torna o atraso visível.

## EXPECTED_BEHAVIOR

1. A identidade do Encarregado é designada formalmente e registrada em artefato/tabela própria;
   `dpo_user_id` referencia essa designação. Na ausência, o sistema recusa ou sinaliza a lacuna —
   nunca a substitui silenciosamente por `req.user.id` (LGPD art. 41).
2. O prazo de retenção é dado estruturado, obrigatório, com data-limite derivável e ao menos um
   consumidor (sinalização/execução de descarte ou anonimização); e a resolução de
   `deletion`/`anonymization` produz efeito verificável sobre o dado (art. 15/16 e art. 18, VI).
3. O incidente tem prazo derivado de `detected_at`, gravado e cobrado pela mesma mecânica já
   existente e comprovadamente funcional para a solicitação de titular (art. 48).

## ACTUAL_BEHAVIOR

1. `dpo_user_id` recebe o id do operador que registrou (`lgpdController.ts:118`) ou abriu
   (`CreateIncidentUseCase.ts:51`), ambos acessíveis com `juridico:operate`.
2. `retention_period` é texto livre opcional, gravado e nunca lido; não há agendador; a resolução
   de pedido de exclusão grava apenas `status='answered'` + notas.
3. O incidente não possui campo de prazo algum; nenhum prazo é calculado e nenhuma consulta expõe
   atraso.

## EVIDENCE

FILE: `juridico/application/use-cases/lgpd/CreateDataSubjectRequestUseCase.ts` — 6-11 (lacuna do DPO declarada no código); 40-41, 50 (`due_date = received_at + 15 dias`, o prazo que EXISTE); 52 (`dpo_user_id: input.dpoUserId` — apenas repassa)
FILE: `juridico/presentation/controllers/lgpdController.ts` — **118** (fallback real: `?? (req as any).user.id`); 189 (incidente, `?? null`); 196-203
FILE: `juridico/application/use-cases/lgpd/CreateIncidentUseCase.ts` — 5-7 (lacuna declarada); 32-34 (obrigatórios: nenhum prazo); 43-53 (create sem prazo); 51 (`?? input.createdBy`)
FILE: `server/src/models/JurLgpdIncident.ts` — 18-35 (interface — **nenhum campo de prazo**); 37-51 (únicos temporais: `occurred_at`, `detected_at`, `closed_at`); 49 (`dpo_user_id` NOT NULL, sem FK); 56 (índices — nenhum de prazo)
FILE: `server/src/models/JurLgpdDataSubjectRequest.ts` — 26, 50 (`due_date DATEONLY NOT NULL` — o contraste que prova que o sistema sabe modelar prazo legal); 63 (índice); 34, 58; 15, 42 (enum com `deletion`/`anonymization`)
FILE: `server/src/models/JurLgpdProcessingActivity.ts` — 27, 48 (`retention_period STRING(150) allowNull`); 58 (índices — nenhum sobre retenção)
FILE: `juridico/application/use-cases/lgpd/CreateProcessingActivityUseCase.ts` — 36-41 (`retention_period` NÃO está entre os obrigatórios); 47-48, 60 (revisão anual É implementada); 57 (única escrita)
FILE: `juridico/application/use-cases/lgpd/UpdateProcessingActivityUseCase.ts` — 39 (repasse; sem validação de formato, sem cálculo)
FILE: `juridico/application/use-cases/lgpd/ResolveDataSubjectRequestUseCase.ts` — 25-42 (grava `status:'answered'` + notas; **nenhuma ramificação por `request_type`**, nenhuma eliminação/anonimização)
FILE: `juridico/application/use-cases/lgpd/DecideIncidentUseCase.ts` — 37-46 (BR-JUR-042, controle MATERIAL existente); 48-63 (nenhum campo/checagem de prazo)
FILE: `juridico/application/use-cases/lgpd/PendingCriticalDataSubjectRequestsUseCase.ts` — 20-28 (mecânica de cobrança existente para titular, inexistente para incidente)
FILE: `juridico/presentation/routes/juridico.ts` — 163, 171 (criação sem `approve`); 166, 172-173 (as 3 únicas rotas LGPD com `approve`, todas de recusa/encerramento)
FILE: `coretriad/states/ERP-LEGACY-001/PRODUCTION_STATUS_MAP.md` — 160

**GREPS DE AUSÊNCIA (escopo integral `server/src`):**
- `encarregado|Encarregado` → 2 ocorrências, **ambas comentário**. Nenhum cadastro existe.
- `retention|retenc|expurgo|purge|anonimiza|anonymiz|descarte` → 5 ocorrências do campo, todas
  escrita/declaração. **Zero leitores.**
- `node-cron|setInterval|new CronJob|schedule\(` → **zero ocorrências**. Não existe agendador.

RELATED_BUSINESS_RULE: BR-JUR-D12, BR-JUR-D13 (candidatos — **nenhum possui BR-ID versionado**);
BR-JUR-041/042 são as regras vizinhas que EXISTEM
RELATED_REQUIREMENT: RF-JUR-035/036 (RoPA), RF-JUR-037, RF-JUR-040, RF-JUR-041 (DPO — citado
como origem do campo, sem implementação correspondente)
RELATED_ACCEPTANCE_CRITERIA: N/A — não há AC formal de retenção, designação de Encarregado ou
prazo ANPD. **Esta ausência é parte do finding**: a lacuna é de requisito antes de ser de
implementação.
RELATED_TEST: nenhum para as três lacunas. `juridico-lgpd-alert-use-cases.test.ts` cobre o prazo
de 15 dias (:97-104, **injetando `dpoUserId: 1` e contornando o fallback do controller**) e
BR-JUR-041/042 (:113-225). Não cobre retenção (não é testável — não há comportamento), identidade
do DPO, nem prazo de incidente (não existe).

BUSINESS_IMPACT: Na promoção a produção com dado pessoal real, a empresa passa a operar três
obrigações da Lei 13.709/2018 apenas no papel: (i) não haverá como demonstrar à ANPD quem é o
Encarregado responsável por cada solicitação — o banco apontará operadores diferentes conforme
quem digitou, e o registro de responsabilidade será, na prática, falso; (ii) dado pessoal
permanecerá armazenado indefinidamente após o fim da finalidade, e um pedido de exclusão será
"atendido" com uma nota de texto sem que nenhum dado seja apagado — **situação pior que a
ausência do recurso, porque produz evidência documental de atendimento que o sistema não
sustenta**; (iii) um vazamento poderá permanecer sem comunicação por tempo indeterminado sem
alerta, enquanto solicitações de titular do mesmo módulo têm alerta funcionando — assimetria
difícil de justificar perante fiscalização. Exposição ao art. 52 (multa de até 2% do faturamento,
limitada a R$ 50 milhões por infração).
TECHNICAL_IMPACT: `retention_period` é dado morto — 150 caracteres livres opcionais, sem parser,
sem consumidor; qualquer implementação futura terá de lidar com histórico em formato arbitrário e
registros sem prazo. Não existe infraestrutura de agendamento (zero hits). `dpo_user_id` é
`NOT NULL` sem FK e populado por fallback de apresentação, tornando o dado semanticamente
inválido de forma irreversível para os registros já criados. A lacuna 3 é a de menor custo — a
mecânica já existe e está testada para o titular; falta replicá-la.
SECURITY_IMPACT: Retenção indefinida amplia a janela e o volume de dado pessoal exposto em
qualquer comprometimento futuro (violação de minimização, art. 6º III). A ausência de prazo de
comunicação retarda a resposta ao próprio evento de segurança. A atribuição automática de
`dpo_user_id` degrada a trilha de responsabilização.

REPRODUCTION (leitura estática determinística; nenhuma execução, nenhuma conexão de banco):
1. `POST /api/jur/lgpd/data-subject-requests` como qualquer `juridico:operate`, corpo
   `{ "type": "deletion", "requester_name": "Fulano" }` (sem `dpo_user_id`). Por
   `lgpdController.ts:118`, `dpoUserId` recebe `req.user.id`; o registro nasce com `dpo_user_id`
   = o operador. Nenhum erro, nenhum aviso.
2. `/verify-identity` e depois `/resolve` com `resolution_notes`. Por
   `ResolveDataSubjectRequestUseCase.ts:38-42`, vira `status='answered'` — e **nenhum dado
   pessoal é eliminado ou anonimizado**, apesar de `request_type='deletion'`.
3. `POST /api/jur/lgpd/processing-activities` com os 5 obrigatórios e **sem**
   `retention_period` → grava `null`. Um ano depois, `next_review_due_at` cobra a revisão do
   registro; nada nunca cobra o descarte do dado.
4. `POST /api/jur/lgpd/incidents` com `detected_at` → incidente `status='open'` sem prazo.
   Decorrido qualquer intervalo, nenhuma consulta o classifica como atrasado (contraste:
   `GET /lgpd/data-subject-requests/pending-critical`).

ROOT_CAUSE_HYPOTHESIS: O bloco LGPD foi implementado como **CRUD de conformidade documental** —
registrar que a empresa tem RoPA, recebeu solicitações e abriu incidentes — e não como **execução
de obrigação legal**. Os comentários confirmam a consciência da lacuna no momento da escrita
("reconciliação de schema"), indicando que `dpo_user_id` foi resolvido para satisfazer um
`NOT NULL` herdado da migration `20260807-000271`, com a decisão de negócio adiada para um "§10.2
do handoff" nunca fechado. Retenção e prazo ANPD seguem o mesmo padrão.

REFERENCE: LGPD art. 6º III, art. 15/16, art. 18 VI, art. 41, art. 48, art. 52;
`BUSINESS_RULE_CANDIDATES_pessoas-governanca.md` §3 e §7 (LACUNA-4, LACUNA-5);
`PRODUCTION_STATUS_MAP.md:160`; CLAUDE.md Regras 6, 7, 16, 20, 21; Master Spec §19.

RECOMMENDATION: A remediação depende de **decisão humana prévia** que nenhum agente pode suprir
(Regras 6 e 21): (a) quem é o Encarregado designado da Evok Áudio LTDA — ato formal da empresa,
não configuração de software; (b) qual é a política de retenção por categoria de dado; (c) qual
prazo interno a empresa adota para comunicação à ANPD, dado que a lei diz "prazo razoável" e não
fixa número — **fixar um número no código sem decisão registrada seria inventar regra de negócio
(Regra 6)**. Registradas essas três decisões, a implementação sugerida é: cadastro de Encarregado
com `dpo_user_id` referenciando-o (e recusa explícita sem designação, em vez do fallback
silencioso); `retention_period` estruturado, obrigatório, com data-limite derivada e rotina de
sinalização/descarte, mais efeito real na resolução de `deletion`/`anonymization`; e `due_date`
de incidente derivado de `detected_at` com cobrança pela mecânica de `pending-critical` já
existente.
SUGGESTED_REMEDIATION_OWNER: SanaCore (execução), condicionada a decisão prévia do dono sobre
(a), (b) e (c).

## RETEST_SPECIFICATION

**LACUNA 1 — Encarregado (DPO):**
(1a) Existe registro versionado de designação do Encarregado e cadastro no sistema que o
     materializa — comprovado por arquivo:linha.
(1b) `POST /lgpd/data-subject-requests` **sem** `dpo_user_id`, como `juridico:operate` que **não**
     é o Encarregado → registro com `dpo_user_id` = o Encarregado designado, **nunca**
     `req.user.id`. Grep confirma que `?? (req as any).user.id` não existe mais em :118.
(1c) Idem para incidentes → `dpo_user_id` ≠ `createdBy`; `CreateIncidentUseCase.ts:51` não usa
     mais `?? input.createdBy`.
(1d) Sem designação cadastrada → o sistema recusa ou sinaliza; em nenhuma hipótese grava operador
     arbitrário.
(1e) Teste cobrindo (1b),(1c),(1d) **na camada que contém a regra** (controller/rota, não apenas
     o use case com `dpoUserId` injetado) — hoje ausente.

**LACUNA 2 — Retenção e eliminação:**
(2a) Política de retenção existe em artefato versionado, com prazo por categoria e owner nominal.
(2b) `retention_period` estruturado e **obrigatório**: criação sem prazo → rejeitada.
(2c) Existe consumidor: atividade com prazo vencido produz efeito verificável (data-limite
     exposta, sinalização de descarte devido, ou expurgo/anonimização). Grep por
     `retention|retenc` deixa de retornar apenas escrita/declaração.
(2d) `/resolve` sobre `request_type='deletion'`/`anonymization` produz efeito verificável sobre o
     dado — não apenas `status='answered'` + notas.
(2e) Testes cobrindo (2b),(2c),(2d), falhando no AUDIT_COMMIT e passando na remediação.

**LACUNA 3 — Prazo ANPD:**
(3a) O prazo adotado está registrado em artefato versionado com owner (o número é decisão humana,
     não pode ser inventado — Regra 6).
(3b) `jur_lgpd_incidents` passa a ter campo de prazo, populado na criação a partir de
     `detected_at`.
(3c) Incidente com prazo vencido e sem `communication_decision` aparece em consulta de pendência
     crítica com marcação de vencido, análoga a `PendingCriticalDataSubjectRequestsUseCase.ts:20-28`.
(3d) Teste do cálculo do prazo e da sinalização de vencimento.

**TRANSVERSAL:**
(4a) As três regras passam a ter **BR-ID rastreável** com owner nominal.
(4b) Suíte verde, sem regressão nos controles que já funcionam (BR-JUR-041, BR-JUR-042, prazo de
     15 dias do titular, revisão anual do RoPA).
(4c) **A reclassificação de `juridico` para PRODUÇÃO em `PRODUCTION_STATUS_MAP.md` não deve
     ocorrer antes do fechamento deste finding** — a severidade HIGH está ancorada nessa
     transição.

## JUSTIFICATIVA DE SEVERIDADE (HIGH — verificada, com ressalva)

- **Exposição atual: baixa.** `juridico` é NÃO-PRODUÇÃO. Julgado **exclusivamente** por exposição
  corrente, este finding seria LOW/MEDIUM.
- **Risco na promoção: alto.** Duas lacunas exigem **ato formal da empresa** que hoje não existe
  em artefato nenhum, e a lacuna 2 exige uma camada de agendamento que **não existe no backend**.
  O prazo de remediação é estruturalmente longo — o que torna materialmente provável que a
  promoção ocorra com as lacunas abertas se não forem tratadas como bloqueio agora.
- **Agravante que sustenta HIGH sobre MEDIUM:** a lacuna 2 não apenas omite um controle, ela
  **produz evidência documental enganosa** — uma solicitação de exclusão registrada como
  `answered` sem que nenhum dado seja apagado. Perante fiscalização, um registro de atendimento
  que o sistema não sustenta é pior que a ausência do recurso. Mesma natureza do agravante de
  "falsa garantia" reconhecido em FIND-SIM-001-001 e FIND-ERP-002.
- **CONFIDENCE: CONFIRMED** — todas as afirmações são de **ausência**, estabelecidas por leitura
  integral e greps exaustivos de escopo declarado, reprodutíveis de forma determinística. A única
  afirmação de presença (o fallback) foi lida diretamente e teve sua localização **corrigida**.

DISCORDÂNCIA REGISTRADA: nenhuma quanto ao nível HIGH. Registra-se que a severidade é
**condicional à promoção a produção**, e que este finding não deve ser lido como exposição de
dado pessoal real em curso.

RESSALVA DE VERIFICAÇÃO: o mapeamento `legacy-baseline-001` → `c9359be...` **não foi verificado
contra o git** por este agente (sem Bash). Foi adotado por consistência com `FIND-ERP-002.md:6`.

NOTA DE STATUS: Nenhuma remediação aplicada. STATUS OPEN até passar pelo
`vericore-finding-validator` (obrigatório para HIGH) e, em seguida: decisão humana sobre as três
lacunas de política, remediação pela SanaCore, e reteste/fechamento exclusivo de VeriCore
(Regra 4).

---

*Produzido pelo agente `vericore-business-rule-auditor` em modo read-only reforçado; conteúdo
persistido pelo orquestrador, sem edição.*

---

## Validação (finding-validator)

**VEREDITO: CONFIRMED — severidade HIGH mantida.** As três lacunas seguem à SanaCore após 2
correções de texto (e condicionadas à decisão humana prévia sobre Encarregado, política de
retenção e prazo ANPD — Regra 6).

BUSCA POR CONTROLE COMPENSATÓRIO (rota, middleware, controller, CHECK/FK de banco, cliente):
- **Camada de banco — REFUTAÇÃO TENTADA E FALHA:** existe FK real que o finding não menciona.
  `migrations/20260807-000271-create-jur-lgpd.cjs:109-116,148-154` declara `references: users`,
  `onDelete: 'RESTRICT'` (baseline `00_baseline_frozen.sql:24736,:24760`). Ela garante que
  `dpo_user_id` aponte para um usuário existente — **não** que seja o Encarregado designado. Não
  refuta; exige nota de precisão.
- **CHECKs existentes** (identidade verificada, justificativa obrigatória, decisão de incidente) —
  materiais, nenhum temporal nem de eliminação. Não refutam.
- **Agendador — busca ampliada:** grep `node-cron|setInterval|CronJob|node-schedule|bull|cron.schedule`
  em `server/src` → **zero**, e o **manifesto (`server/package.json`) não tem nenhuma dependência
  de agendamento/fila**. A camada não existe nem como dependência instalada. **Confirmação mais
  forte que a do autor.**

AGRAVANTE MAIS FORTE — VERIFICADO: `ResolveDataSubjectRequestUseCase.ts` lido integralmente — não
há **nenhuma ramificação por `request_type`**; `deletion` e `anonymization` são resolvidos
exatamente como `confirmation`, gravando só `status:'answered'`. CONFIRMADO.

ASSIMETRIA DE PRAZO — VERIFICADA: `JurLgpdDataSubjectRequest.ts:26,50,63` tem `due_date` DATEONLY
NOT NULL indexado e cobrado; `JurLgpdIncident.ts:18-51` **não tem nenhum campo de prazo**. Real,
no mesmo módulo.

RESULTADO DA BUSCA: nenhum controle compensatório invalida qualquer das três lacunas. O único não
citado (FK) atenua parcialmente a lacuna 1 sem refutá-la.

CORREÇÕES EXIGIDAS (não alteram o veredito):
1. Acrescentar que **existe FK de `dpo_user_id` para `users` no banco** (só ausente na declaração
   do model). A frase atual induz leitura de ausência total de integridade referencial.
2. `TECHNICAL_IMPACT` diz "`dpo_user_id` é NOT NULL sem FK" — **corrigir**: é NOT NULL **com** FK
   no banco, sem FK no model.

JUSTIFICATIVA: as três lacunas são afirmações de ausência, estabelecidas por leitura integral e
greps de escopo declarado que o validador reproduziu e ampliou. Tentativa de refutação em cinco
camadas: nenhuma derruba. HIGH **não é inflação** por três razões independentes da promoção: (i)
a lacuna 2 produz evidência documental enganosa (`answered` para `deletion` sem apagar nada); (ii)
`dpo_user_id` já gravado é semanticamente irreversível; (iii) a lacuna 2 exige uma camada de
agendamento que não existe nem como dependência — prazo de remediação estruturalmente longo.

*Validação produzida pelo `vericore-finding-validator`; seção anexada pelo orquestrador.*
