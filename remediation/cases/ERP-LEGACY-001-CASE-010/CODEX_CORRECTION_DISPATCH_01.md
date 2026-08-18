# Despacho Codex — CORREÇÃO — `ERP-LEGACY-001-CASE-010`

```
CASE_ID:      ERP-LEGACY-001-CASE-010
FINDING_ID:   FIND-ERP-006
ESCOPO:       Correcao dos 4 pontos bloqueantes da segunda opiniao da VeriCore
              sobre o commit 44631a8 (branch sana/ERP-LEGACY-001/CASE-010)
BASE:         commit 44631a8 (fix(lgpd): implement CASE-010 operational controls)
DECISOES:     D1-D5 ja respondidas pelo dono em 2026-08-17 (ver
              CODEX_REMEDIATION_DISPATCH.md); nenhuma decisao nova requerida
DESTINO:      sanacore-remediation-engineer / Codex
```

## 1. Contexto — por que este e um despacho de CORREÇÃO, não de novo caso

O CASE-010 foi implementado pelo Codex no commit `44631a8`, na branch
`sana/ERP-LEGACY-001/CASE-010`, worktree
`C:\Sistema EvokAudio\ERP-Evok-sana-CASE-010`. Na segunda opinião da VeriCore
(review registrado em `752b6d8`), a implementação foi **reprovada** por 4
motivos bloqueantes, listados abaixo com o trecho de código real observado.
Este despacho **não reabre triagem, não cria novo caso e não pede
reimplementação do zero**: pede correção pontual sobre o que já existe no
commit `44631a8`, preservando tudo que passou (D1-D4 na parte de DPO
fallback removido, retenção estruturada, tarefa manual, prazo de 72h) e
corrigindo apenas as 4 lacunas abaixo.

## 2. Os 4 pontos bloqueantes (com evidência real do commit 44631a8)

### 2.1 D5 decorativo — guarda de promoção não é exercitada por nada além do próprio teste

`server/src/modules/juridico/domain/lgpdOperationalControlGuard.ts` apenas
faz `fs.existsSync` da lista `REQUIRED_ARTIFACTS`, que inclui os próprios
arquivos que o commit `44631a8` acabou de criar/editar — ou seja, o guard é
tautológico: sempre vai encontrar os arquivos que o próprio commit escreveu.
Além disso, `LGPD_PROMOTION_BLOCKED`/`LGPD_PROMOTION_GUARD_STATUS` não são
lidos por nenhum script de build, release ou CI — só pelo teste
`server/tests/unit/juridico-lgpd-operational-control-guard.test.ts`, que o
próprio Codex escreveu. Isso não bloqueia promoção nenhuma na prática.

**Correção exigida:** ligar o guard a um mecanismo real de release-readiness,
exercitado por algo além do teste isolado do próprio guard. O engineer decide
o mecanismo, mas ele TEM que ser algo que rode como parte obrigatória de
build/release/pipeline — por exemplo (não exaustivo): um script de
release-readiness em `server/` que importe `LGPD_PROMOTION_BLOCKED` e saia
com código de erro se `true`, chamado a partir de `npm run` já existente no
pipeline (ex.: pré-requisito de `npm run build` ou de um `npm run
release:check` já referenciado em outro lugar do projeto); ou a inclusão do
teste do guard como suite obrigatória dentro de `test:unit:strict` (não
isolado). Não inventar novo requisito de negócio — apenas fazer o guard
morder algo real.

### 2.2 D1 fallback movido, não removido — controller aceita `dpo_user_id` do cliente sem validar

O uso case `CreateDataSubjectRequestUseCase.resolveDpoUserId` está correto
quando o payload não traz `dpo_user_id` (resolve para o DPO ativo via
`LgpdDpoDesignationRepository.findActive()`), mas quando o payload **traz**
`dpo_user_id`, o código apenas faz:

```ts
if (input.dpoUserId !== undefined && input.dpoUserId !== null) {
  return Number(input.dpoUserId);
}
```

— ou seja, aceita qualquer id enviado pelo cliente sem checar se aquele id
corresponde ao DPO ativo designado. O mesmo padrão existe em
`CreateIncidentUseCase` para `dpo_user_id`/`createdBy`. Isso é o mesmo
problema de fallback não confiável do finding original, apenas deslocado do
`req.user.id` para um campo de payload igualmente não verificado.

**Correção exigida:** em `CreateDataSubjectRequestUseCase.resolveDpoUserId` e
no equivalente em `CreateIncidentUseCase`, quando `dpo_user_id` vier no
payload, validar contra o DPO ativo atual
(`LgpdDpoDesignationRepository.findActive()`) e rejeitar com
`ValidationError` clara se o id enviado não corresponder ao
`activeDesignation.user_id`. Não remover o campo `dpo_user_id` do payload
nem do client (`client/src/api/juridico.ts` pode continuar com o campo
opcional) — a correção é o servidor nunca confiar nesse valor sem checagem
contra a designação ativa.

### 2.3 RoPA inoperante — não existe endpoint para criar `LgpdRetentionPolicy`

`CreateProcessingActivityUseCase.execute` agora exige `retentionPolicyId` e
falha com `NotFoundError` se
`this.retentionPolicyRepository.findActiveById(input.retentionPolicyId)` não
achar política ativa:

```ts
if (input.retentionPolicyId === undefined || input.retentionPolicyId === null) {
  throw new ValidationError('retentionPolicyId e obrigatorio para estruturar a retencao por categoria.');
}
...
const retentionPolicy = await this.retentionPolicyRepository.findActiveById(input.retentionPolicyId);
if (!retentionPolicy) {
  throw new NotFoundError(`Politica de retencao ${input.retentionPolicyId} nao encontrada ou inativa.`);
}
```

Porém `server/src/modules/juridico/domain/repositories/LgpdRetentionPolicyRepository.ts`
só define `findActiveById` — não existe nenhum use case de criação, nenhum
endpoint em `server/src/modules/juridico/presentation/routes/juridico.ts`
para `LgpdRetentionPolicy`, e o `lgpdController.ts` não tem
`createRetentionPolicy`/rota correspondente. Resultado: em qualquer ambiente
recém-migrado, sem seed manual direto no banco, é impossível criar uma
`LgpdRetentionPolicy` ativa — e portanto impossível criar qualquer atividade
de tratamento (RoPA fica inoperante).

**Correção exigida:**
- Criar `CreateRetentionPolicyUseCase` em
  `server/src/modules/juridico/application/use-cases/lgpd/`, seguindo o
  mesmo padrão dos outros use cases do módulo (`UseCase` base, injeção de
  repositório, validação de campos obrigatórios).
- Adicionar `create`/método equivalente ao
  `LgpdRetentionPolicyRepository`/`SequelizeLgpdRetentionPolicyRepository`
  necessário para persistir a política.
- Expor `POST /api/jur/lgpd/retention-policies` em
  `server/src/modules/juridico/presentation/routes/juridico.ts`, com nível
  de autorização `authorizeModule('juridico', 'approve')` — o mesmo padrão
  já usado nas outras rotas de configuração/decisão sensíveis do módulo
  (ex.: `router.post('/lgpd/incidents/:id/decision', authorizeModule('juridico', 'approve'), ...)`,
  `router.post('/lgpd/data-subject-requests/:id/reject', authorizeModule('juridico', 'approve'), ...)`).
- O use case deve criar a política apenas com os campos que o payload
  fornecer (categoria, valor/prazo, status/metadata), **sem preencher número
  jurídico real de retenção** — D2 já decidiu que números reais e orientação
  jurídica formal ficam fora do CoreTriad; não inventar valor default de
  retenção.
- Adicionar teste cobrindo: criação de política com payload válido; rejeição
  de payload sem campos obrigatórios; e um teste de integração leve
  (use case + repositório em memória/mock) confirmando que, após criar a
  política, `CreateProcessingActivityUseCase` consegue criar uma atividade
  de tratamento referenciando o `id` retornado — isto é, RoPA volta a ser
  operável de ponta a ponta sem intervenção manual no banco.

### 2.4 Prova vermelha ausente no pacote de evidência

O `REMEDIATION_EVIDENCE_PACKAGE.md` atual (seção "5. Evidencia de
validacao") só lista execuções que passaram (`typecheck`, `build`, jest dos
2 arquivos novos com "27/27"). Não há nenhum registro de execução dos testes
novos contra o commit anterior (`752b6d8`, base do CASE-010) para provar que
eles de fato reprovavam antes da correção — a "prova vermelha" pedida no
despacho original (`CODEX_REMEDIATION_DISPATCH.md`, seção "Prova vermelha",
linhas 110-112) não está documentada.

**Correção exigida:** reexecutar os testes novos/atualizados
(`server/tests/unit/juridico-lgpd-alert-use-cases.test.ts`,
`server/tests/unit/juridico-lgpd-operational-control-guard.test.ts`, e
qualquer teste novo criado para os pontos 2.1-2.3 deste despacho) contra o
código do commit `752b6d8` (ou técnica equivalente segura — ex.: `git stash`
do código de produção mantendo os testes, ou checkout temporário em
worktree separada, sem tocar em banco real) e registrar no pacote de
evidência **quais asserts falharam antes da correção**, com nome do teste e
mensagem/motivo da falha.

## 3. Prompt literal para colar no Codex

```text
Você está atuando como sanacore-remediation-engineer dentro da estrutura CoreTriad deste repositório.

Isto é uma CORREÇÃO sobre uma implementação já existente, não uma reimplementação do zero.

O CASE-010 (FIND-ERP-006) foi implementado no commit 44631a8, na branch
sana/ERP-LEGACY-001/CASE-010, worktree C:\Sistema EvokAudio\ERP-Evok-sana-CASE-010.
Esse commit foi REPROVADO na segunda opinião da VeriCore por 4 motivos
bloqueantes. Corrija exatamente esses 4 pontos, preservando o restante do
trabalho já feito (fallback de DPO removido para o caminho sem dpo_user_id
explícito, retenção estruturada, tarefa manual de deletion/anonymization,
prazo operacional de 72h em incidentes).

Trabalhe exclusivamente na worktree/branch já existente:
  worktree: C:\Sistema EvokAudio\ERP-Evok-sana-CASE-010
  branch:   sana/ERP-LEGACY-001/CASE-010

Se a worktree não existir mais, recrie-a a partir do commit 44631a8 (não a partir de main, não do zero).

Regras absolutas:
- NÃO conecte em erp_evok_audio (produção), nem para contar linhas.
- Não execute operação destrutiva em banco real.
- Use testes unitários/estáticos; se teste dinâmico for inevitável, usar somente banco com sufixo `_test`/`_ci`.
- Não toque em audit/, coretriad/governance/, coretriad/states/, .claude/ ou docs/.
- Não declare FINDING CLOSED nem RETEST_PASSED. Essa autoridade é exclusiva da VeriCore.
- Não invente orientação jurídica nem número real de retenção — D2 já fixou isso fora do CoreTriad.
- Não regrida nada que já estava correto no commit 44631a8 (fallback de DPO sem payload, retenção estruturada, tarefa manual, prazo de 72h).

Leitura obrigatória antes de editar:
1. Leia integralmente remediation/cases/ERP-LEGACY-001-CASE-010/CODEX_REMEDIATION_DISPATCH.md (despacho original).
2. Leia integralmente remediation/cases/ERP-LEGACY-001-CASE-010/REMEDIATION_EVIDENCE_PACKAGE.md (o que foi entregue, no commit 44631a8).
3. Leia server/src/modules/juridico/domain/lgpdOperationalControlGuard.ts.
4. Leia server/src/modules/juridico/application/use-cases/lgpd/CreateDataSubjectRequestUseCase.ts e CreateIncidentUseCase.ts (função de resolução de dpo_user_id em ambos).
5. Leia server/src/modules/juridico/application/use-cases/lgpd/CreateProcessingActivityUseCase.ts e server/src/modules/juridico/domain/repositories/LgpdRetentionPolicyRepository.ts.
6. Leia server/src/modules/juridico/presentation/routes/juridico.ts e server/src/modules/juridico/presentation/controllers/lgpdController.ts (padrão de rotas/handlers já existente, incluindo authorizeModule('juridico', 'approve') usado em /lgpd/incidents/:id/decision e /lgpd/data-subject-requests/:id/reject).
7. Leia client/src/api/juridico.ts.

Corrija os 4 pontos a seguir:

PONTO 1 — D5 decorativo (guarda de promoção não bloqueia nada real):
- LGPD_PROMOTION_BLOCKED / LGPD_PROMOTION_GUARD_STATUS hoje só são lidos pelo
  próprio teste do guard. Ligue-os a algo real: crie um mecanismo de
  release-readiness que falhe (exit code != 0, ou teste que rode dentro da
  suite obrigatória de release/CI, não isolado) quando LGPD_PROMOTION_BLOCKED
  for true. Você decide o mecanismo exato, mas ele precisa ser exercitado por
  algo além do teste unitário isolado do próprio guard — por exemplo um
  script de release-check em server/ chamado a partir de um npm script já
  existente, ou a promoção do teste do guard para dentro da suite
  obrigatória do pipeline (não apenas um arquivo de teste solto).
- Não editar docs/ nem coretriad/.

PONTO 2 — D1 fallback aceito sem validação (dpo_user_id do payload não é checado):
- Em CreateDataSubjectRequestUseCase.resolveDpoUserId e no equivalente em
  CreateIncidentUseCase: quando o payload trouxer dpo_user_id, valide contra
  o DPO ativo atual via LgpdDpoDesignationRepository.findActive() e rejeite
  com ValidationError clara se o id enviado não corresponder ao
  activeDesignation.user_id. Não remova o campo do payload nem do client
  (client/src/api/juridico.ts pode continuar com dpo_user_id opcional); o
  servidor é quem não pode mais confiar nele sem checagem.

PONTO 3 — RoPA inoperante (não existe endpoint para criar LgpdRetentionPolicy):
- Crie CreateRetentionPolicyUseCase em
  server/src/modules/juridico/application/use-cases/lgpd/, seguindo o padrão
  dos demais use cases do módulo.
- Adicione o método de criação necessário em
  LgpdRetentionPolicyRepository/SequelizeLgpdRetentionPolicyRepository.
- Exponha POST /api/jur/lgpd/retention-policies em
  server/src/modules/juridico/presentation/routes/juridico.ts com
  authorizeModule('juridico', 'approve') (mesmo nível já usado em
  /lgpd/incidents/:id/decision e /lgpd/data-subject-requests/:id/reject).
- Adicione o handler correspondente em lgpdController.ts.
- Crie a política apenas com os campos que o payload fornecer
  (categoria/prazo-valor/status/metadata) — NÃO preencha nenhum número
  jurídico real de retenção como default; se faltar campo obrigatório,
  rejeite.
- Teste: criação com payload válido; rejeição de payload incompleto; e um
  teste confirmando que, após criar a política, CreateProcessingActivityUseCase
  consegue criar uma atividade de tratamento referenciando o id retornado
  (RoPA volta a ser operável de ponta a ponta).

PONTO 4 — Prova vermelha ausente:
- Reexecute os testes novos/atualizados do CASE-010 (incluindo os criados
  para os pontos 1-3 acima) contra o código do commit 752b6d8 (ou técnica
  equivalente segura, sem produção — ex.: worktree/checkout temporário do
  código de produção mantendo os testes novos, sem tocar em banco real).
- Registre no REMEDIATION_EVIDENCE_PACKAGE.md quais asserts falharam antes
  da correção, com nome do teste e motivo da falha.

Atualize (não crie um novo) remediation/cases/ERP-LEGACY-001-CASE-010/REMEDIATION_EVIDENCE_PACKAGE.md:
- Adicione uma seção "Correção 01" documentando, para cada um dos 4 pontos:
  o que estava errado, o que foi corrigido, arquivos alterados, testes
  adicionados/atualizados.
- Inclua a prova vermelha do ponto 4.
- Inclua prova verde: testes passando após a correção, typecheck, build.
- Mantenha STATUS: REMEDIATION_COMPLETE apenas se os 4 pontos estiverem de
  fato corrigidos e comprovados; caso contrário registre o que ficou
  pendente e por quê.
- Nunca escreva FINDING CLOSED nem RETEST_PASSED.

Validação:
- Execute os testes novos/atualizados do módulo LGPD.
- Execute typecheck/build do server.
- Se node_modules faltar, instale dentro da própria worktree; se não for
  possível, registre a lacuna no pacote de evidência.

Ao terminar:
- Commit na branch sana/ERP-LEGACY-001/CASE-010, não em main.
- Pare aguardando revisão/segunda opinião/reteste.
```

## 4. Registro

Este despacho corrige o mesmo caso (`ERP-LEGACY-001-CASE-010`), sobre o mesmo
finding (`FIND-ERP-006`), sobre o mesmo commit base (`44631a8`). Não abre
novo `REMEDIATION_CASE`, não redefine escopo, não altera decisões D1-D5 já
tomadas pelo dono. A autoridade para declarar `RETEST_PASSED`/`FINDING
CLOSED` permanece exclusiva da VeriCore.
