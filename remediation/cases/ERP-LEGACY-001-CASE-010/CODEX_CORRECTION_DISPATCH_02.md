# Despacho Codex — CORREÇÃO 02 — `ERP-LEGACY-001-CASE-010`

```
CASE_ID:      ERP-LEGACY-001-CASE-010
FINDING_ID:   FIND-ERP-006
ESCOPO:       Correcao de 2 problemas identificados na revisao da Correcao 01
              sobre o commit f720058 (branch sana/ERP-LEGACY-001/CASE-010)
BASE:         commit f720058 (fix(lgpd): address CASE-010 review blockers)
DECISOES:     D1-D5 ja respondidas pelo dono em 2026-08-17 (ver
              CODEX_REMEDIATION_DISPATCH.md); nenhuma decisao nova requerida
DESTINO:      sanacore-remediation-engineer / Codex
```

## 1. Contexto — por que este é um despacho de CORREÇÃO 02, não de novo caso

O CASE-010 recebeu uma primeira correção no commit `f720058`, na branch
`sana/ERP-LEGACY-001/CASE-010`, worktree
`C:\Sistema EvokAudio\ERP-Evok-sana-CASE-010`, respondendo aos 4 pontos
bloqueantes da segunda opinião da VeriCore sobre `44631a8`
(`CODEX_CORRECTION_DISPATCH_01.md`). Essa Correção 01 foi **APROVADA COM
RESSALVA** — mas com 2 problemas concretos que precisam ser corrigidos antes
do reteste formal. Este despacho **não reabre triagem, não cria novo caso e
não pede reimplementação do zero**: pede correção pontual sobre o que já
existe no commit `f720058`, preservando tudo que já foi aprovado (fallback
de DPO removido, validação de `dpo_user_id` de payload contra designação
ativa, guarda de release ligada ao build, endpoint de criação de política de
retenção).

## 2. Os 2 problemas (com evidência real do commit f720058)

### 2.1 Regressão real no client — `retention_policy_id` obrigatório sem UI

O commit `f720058` alterou `client/src/api/juridico.ts`:

```ts
export interface CreateProcessingActivityInput {
  ...
  retention_period?: string;
  retention_policy_id: number;   // <- tornado OBRIGATÓRIO
  ...
}
```

Porém o único chamador real do client,
`client/src/pages/juridico/LgpdTab.tsx` (linha 491,
`jurApi.createProcessingActivity({ ... })`), **não passa
`retention_policy_id`** e a tela não tem nenhum select/UI para escolher uma
política de retenção, nem usa `createRetentionPolicy` (que também foi
adicionada em `f720058` mas nunca é chamada por nenhuma tela). Isso:

- quebra `tsc -b` do client (a evidência de `f720058` só rodou
  `npm run typecheck`/`npm run build` do **server** — não há registro de
  typecheck do client no pacote de evidência);
- faria a tela real de RoPA responder `400`/erro de validação em produção,
  porque o objeto enviado nunca inclui o campo agora obrigatório.

Além disso, não existe endpoint de **listagem** de políticas de retenção
(`server/src/modules/juridico/presentation/routes/juridico.ts` só expõe
`POST /api/jur/lgpd/retention-policies`, criado na Correção 01; não há
`GET`), então mesmo que a tela quisesse montar um seletor, não haveria de
onde buscar as políticas ativas.

**Correção exigida — o engineer escolhe UM dos dois caminhos, o que for mais
barato dado o estado atual da tela, e registra a decisão no pacote de
evidência:**

- **Opção A (mínima):** tornar `retention_policy_id` opcional em
  `CreateProcessingActivityInput` (client) até a UI de seleção de política
  ser construída, registrando explicitamente essa lacuna (RoPA sem seletor de
  política ainda) no `REMEDIATION_EVIDENCE_PACKAGE.md` como risco residual —
  sem fingir que está resolvido. Isso NÃO reabre o ponto 2.3 da Correção 01
  no lado servidor: o backend continua exigindo `retentionPolicyId`
  (`CreateProcessingActivityUseCase`), então a tela real, sem UI, continuará
  falhando em produção — mas ao menos o build de tipos do client não quebra
  e o gap fica documentado, não escondido.
- **Opção B (completa):** adicionar de fato um seletor de política de
  retenção em `LgpdTab.tsx` que popule `retention_policy_id`, buscando as
  políticas ativas via novo endpoint
  `GET /api/jur/lgpd/retention-policies` (criar em
  `server/src/modules/juridico/presentation/routes/juridico.ts`, mesmo nível
  de autorização já usado no `POST` — `authorizeModule('juridico',
  'approve')` ou o nível de leitura equivalente já usado em outras listagens
  do módulo, o que for coerente com o padrão existente) e o
  handler/use-case de listagem correspondente.

Qualquer que seja a opção, ao final:

- `tsc -b` (ou equivalente) do **client** precisa ser executado e passar, e
  isso precisa constar no pacote de evidência (a lacuna de não ter rodado
  isso antes precisa ser corrigida, não repetida).
- Se Opção A: documentar claramente que a tela real de RoPA continua
  inoperante em produção até a UI ser feita — não declarar
  `REMEDIATION_COMPLETE` sem essa ressalva explícita.
- Se Opção B: RoPA volta a ser operável de ponta a ponta pela UI real, não
  só pelo endpoint.

### 2.2 Prova vermelha não auditável — worktree citada não existe

A seção "4. Prova vermelha segura contra `752b6d8`" do
`REMEDIATION_EVIDENCE_PACKAGE.md` (Correção 01) descreve uma suite
`juridico-lgpd-correction-red-proof.test.ts` executada em
"uma worktree temporária, destacada no commit `752b6d8`", em
`C:\Sistema EvokAudio\ERP-Evok-case010-red-proof\server\tests\unit\juridico-lgpd-correction-red-proof.test.ts`.
Essa worktree **não existe** (`git worktree list` não a lista) e o arquivo
não existe em nenhum commit de nenhuma branch (`git log --all` não o
encontra). A prova vermelha, como registrada, não é auditável por quem faz
checkout da branch oficial.

**Correção exigida:** a prova vermelha precisa estar DENTRO da
worktree/branch oficial do caso e ser auditável por qualquer pessoa que
faça checkout dela — não pode depender de uma worktree temporária
descartada. Duas alternativas, o engineer escolhe a que for factível:

- Se o conteúdo original do teste `juridico-lgpd-correction-red-proof.test.ts`
  for recuperável (ex.: estava em stash, em outro branch local, em histórico
  de shell), mova/recrie esse arquivo dentro de
  `server/tests/unit/` na própria worktree oficial
  (`C:\Sistema EvokAudio\ERP-Evok-sana-CASE-010`) e faça commit dele junto
  com o registro de quais asserts falhavam contra `752b6d8`.
- Se o conteúdo não for recuperável, **reexecute a prova vermelha do zero**:
  crie o teste (ou reaproveite/adapte o teste verde atual para os 3 pontos da
  Correção 01 — validação de DPO de payload, `CreateRetentionPolicyUseCase`,
  guarda de release ligada ao build) dentro da worktree oficial, execute-o
  contra uma cópia do código de produção no ponto `752b6d8` usando técnica
  seg ura sem tocar banco real (ex.: `git worktree add` temporário a partir
  de `752b6d8` só para rodar a suite de testes copiada, depois remover a
  worktree temporária; ou `git stash`/checkout local do código de produção
  mantendo os testes), documentando no
  `REMEDIATION_EVIDENCE_PACKAGE.md` que a prova original foi perdida e foi
  refeita, com data e método usado.

## 3. Prompt literal para colar no Codex

```text
Você está atuando como sanacore-remediation-engineer dentro da estrutura CoreTriad deste repositório.

Isto é uma CORREÇÃO 02 sobre uma implementação já existente (Correção 01), não uma reimplementação do zero.

O CASE-010 (FIND-ERP-006) recebeu a Correção 01 no commit f720058, na branch
sana/ERP-LEGACY-001/CASE-010, worktree C:\Sistema EvokAudio\ERP-Evok-sana-CASE-010.
Essa correção foi APROVADA COM RESSALVA na segunda opinião da VeriCore, com 2
problemas que precisam ser corrigidos antes do reteste formal. Corrija
exatamente esses 2 pontos, preservando todo o restante já aprovado (fallback
de DPO removido, validação de dpo_user_id de payload contra designação
ativa em CreateDataSubjectRequestUseCase/CreateIncidentUseCase, guarda de
release LGPD ligada ao build via server/scripts/check-lgpd-release-readiness.ts,
POST /api/jur/lgpd/retention-policies com CreateRetentionPolicyUseCase).

Trabalhe exclusivamente na worktree/branch já existente:
  worktree: C:\Sistema EvokAudio\ERP-Evok-sana-CASE-010
  branch:   sana/ERP-LEGACY-001/CASE-010

Se a worktree não existir mais, recrie-a a partir do commit f720058 (não a partir de main, não do zero).

Regras absolutas:
- NÃO conecte em erp_evok_audio (produção), nem para contar linhas.
- Não execute operação destrutiva em banco real.
- Use testes unitários/estáticos; se teste dinâmico for inevitável, usar somente banco com sufixo `_test`/`_ci`.
- Não toque em audit/, coretriad/governance/, coretriad/states/, .claude/ ou docs/.
- Não declare FINDING CLOSED nem RETEST_PASSED. Essa autoridade é exclusiva da VeriCore.
- Não invente orientação jurídica nem número real de retenção — D2 já fixou isso fora do CoreTriad.
- Não regrida nada que já estava correto no commit f720058 (validação de DPO de payload, endpoint de criação de política de retenção, guarda de release ligada ao build).

Leitura obrigatória antes de editar:
1. Leia integralmente remediation/cases/ERP-LEGACY-001-CASE-010/CODEX_CORRECTION_DISPATCH_01.md (despacho da Correção 01).
2. Leia integralmente remediation/cases/ERP-LEGACY-001-CASE-010/REMEDIATION_EVIDENCE_PACKAGE.md (o que foi entregue no commit f720058, incluindo a seção "Correcao 01").
3. Leia client/src/api/juridico.ts (interface CreateProcessingActivityInput e função createRetentionPolicy).
4. Leia client/src/pages/juridico/LgpdTab.tsx, em especial a chamada jurApi.createProcessingActivity por volta da linha 491 e a estrutura de formulário/UI já existente na aba de RoPA.
5. Leia server/src/modules/juridico/presentation/routes/juridico.ts e server/src/modules/juridico/presentation/controllers/lgpdController.ts (rota/handler POST /api/jur/lgpd/retention-policies já existente, para seguir o mesmo padrão se optar por criar a rota de listagem).
6. Verifique com `git worktree list` e `git log --all -- "**/juridico-lgpd-correction-red-proof.test.ts"` que a worktree/arquivo citados na seção "Correcao 01" do pacote de evidência (C:\Sistema EvokAudio\ERP-Evok-case010-red-proof) não existem.

Corrija os 2 pontos a seguir:

PONTO 1 — Regressão no client (retention_policy_id obrigatório sem UI):
- client/src/api/juridico.ts tornou retention_policy_id: number OBRIGATÓRIO
  em CreateProcessingActivityInput, mas LgpdTab.tsx (linha ~491) não passa
  esse campo e não tem select/UI para escolher política, nem chama
  createRetentionPolicy. Isso quebra o build de tipos do client e faria a
  tela real responder erro em produção.
- Escolha UMA das duas opções, o que for mais barato dado o estado atual da
  tela, e documente a escolha no REMEDIATION_EVIDENCE_PACKAGE.md:
  OPÇÃO A (mínima): torne retention_policy_id opcional em
  CreateProcessingActivityInput no client, registrando explicitamente no
  pacote de evidência que a tela real de RoPA continua sem seletor de
  política e portanto continua inoperante em produção até a UI ser feita —
  não é permitido declarar REMEDIATION_COMPLETE sem essa ressalva.
  OPÇÃO B (completa): adicione um seletor de política de retenção em
  LgpdTab.tsx, criando GET /api/jur/lgpd/retention-policies (rota + handler +
  use case/repositório de listagem, seguindo o padrão de autorização já
  usado no POST) e populando retention_policy_id a partir da seleção do
  usuário.
- Qualquer que seja a opção, execute o typecheck do client (tsc -b do
  client, ou o comando equivalente já configurado no projeto — verifique
  package.json do client) e registre o resultado no pacote de evidência.
  Isso não pode ficar de fora novamente.

PONTO 2 — Prova vermelha não auditável:
- A seção "4. Prova vermelha segura contra 752b6d8" do
  REMEDIATION_EVIDENCE_PACKAGE.md cita um teste em uma worktree
  (C:\Sistema EvokAudio\ERP-Evok-case010-red-proof) que não existe em disco
  nem em nenhum commit de nenhuma branch. Isso não é auditável.
- Se o conteúdo original do teste juridico-lgpd-correction-red-proof.test.ts
  for recuperável de alguma forma, mova-o para dentro de server/tests/unit/
  na própria worktree oficial (sana/ERP-LEGACY-001/CASE-010) e comite-o.
- Se não for recuperável, reexecute a prova vermelha do zero: crie/adapte um
  teste dentro da worktree oficial que exercite os 3 pontos corrigidos na
  Correção 01 (validação de dpo_user_id de payload contra designação ativa,
  existência de CreateRetentionPolicyUseCase, guarda de release ligada ao
  build), execute-o contra uma cópia do código de produção no commit 752b6d8
  usando técnica segura sem produção (ex.: worktree temporária a partir de
  752b6d8 só para rodar a suite copiada, removida depois; ou stash/checkout
  local mantendo os testes), e documente no REMEDIATION_EVIDENCE_PACKAGE.md
  que a prova original foi perdida e foi refeita, com data, método e quais
  asserts falharam antes da correção (nome do teste + motivo da falha).

Atualize (não crie um novo) remediation/cases/ERP-LEGACY-001-CASE-010/REMEDIATION_EVIDENCE_PACKAGE.md:
- Adicione uma seção "Correção 02" documentando, para cada um dos 2 pontos:
  o que estava errado, o que foi corrigido, arquivos alterados, testes
  adicionados/atualizados, e a decisão tomada (Opção A ou B no ponto 1;
  recuperação ou reexecução no ponto 2).
- Inclua a prova vermelha reauditável do ponto 2.
- Inclua prova verde: testes passando após a correção, typecheck do server
  E do client, build.
- Mantenha STATUS: REMEDIATION_COMPLETE apenas se os 2 pontos estiverem de
  fato corrigidos e comprovados (incluindo, se Opção A, a ressalva explícita
  de que a tela real de RoPA continua sem seletor); caso contrário registre
  o que ficou pendente e por quê.
- Nunca escreva FINDING CLOSED nem RETEST_PASSED.

Validação:
- Execute os testes novos/atualizados do módulo LGPD (server).
- Execute typecheck/build do server.
- Execute typecheck do client (obrigatório — a Correção 01 não fez isso e
  foi exatamente isso que causou o problema 1).
- Se node_modules faltar, instale dentro da própria worktree; se não for
  possível, registre a lacuna no pacote de evidência.

Ao terminar:
- Commit na branch sana/ERP-LEGACY-001/CASE-010, não em main.
- Pare aguardando revisão/segunda opinião/reteste.
```

## 4. Registro

Este despacho corrige o mesmo caso (`ERP-LEGACY-001-CASE-010`), sobre o mesmo
finding (`FIND-ERP-006`), sobre o mesmo commit base (`f720058`). Não abre
novo `REMEDIATION_CASE`, não redefine escopo, não altera decisões D1-D5 já
tomadas pelo dono. A autoridade para declarar `RETEST_PASSED`/`FINDING
CLOSED` permanece exclusiva da VeriCore.
