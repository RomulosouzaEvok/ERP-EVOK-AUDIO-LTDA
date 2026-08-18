# Segunda Opinião — CASE-010 / FIND-ERP-006 — Correção 02

```
CASO:         ERP-LEGACY-001-CASE-010
FINDING:      FIND-ERP-006 (LGPD)
COMMIT_BASE:  f720058 (Correção 01)
COMMIT_ALVO:  8b5410a (Correção 02)
BRANCH:       sana/ERP-LEGACY-001/CASE-010
WORKTREE:     C:\Sistema EvokAudio\ERP-Evok-sana-CASE-010
EXECUTOR:     VeriCore (Claude Code, agente Explore/opus), 2026-08-17
MÉTODO:       leitura do diff real (git diff f720058 8b5410a) e do código,
              não do REMEDIATION_EVIDENCE_PACKAGE.md como fonte primária
VEREDITO:     APROVA_COM_RESSALVA
```

## Escopo revisado

Despacho `CODEX_CORRECTION_DISPATCH_02.md` exigia 2 correções pontuais sobre
`f720058`, sem regressão do que já estava aprovado.

## Ponto 1 — regressão no client (`retention_policy_id` obrigatório sem UI)

**CORRIGIDO — Opção A (mínima), legítima.**

- `client/src/api/juridico.ts:939` — `retention_policy_id` voltou a ser
  opcional em `CreateProcessingActivityInput`. `LgpdTab.tsx:491` continua sem
  passar o campo → build de tipos do client deixa de quebrar.
- Ressalva de "tela real de RoPA continua inoperante" está **escrita** no
  pacote de evidência (seção "Correção 02 → 1" e "4. Risco residual
  consolidado"), não omitida — cumpre a exigência do despacho.
- Confirmado no código que a tela de fato falha em produção:
  `CreateProcessingActivityUseCase.ts:50-52` exige `retentionPolicyId` e
  `lgpdController.ts:85` mapeia o campo — POST da aba RoPA retorna 400
  sempre, até existir UI.
- Opção B (endpoint de listagem) não foi feita — permitido pela Opção A, mas
  não existe `GET /api/jur/lgpd/retention-policies` (só o `POST` de
  `routes/juridico.ts:153`). Gap adicional a registrar em backlog, não é
  regressão nem descumprimento do despacho.

## Ponto 2 — prova vermelha não auditável

**CORRIGIDO e auditável.**

- `server/tests/unit/juridico-lgpd-correction-red-proof.test.ts` existe e
  está commitado em `8b5410a` (único commit em `git log --all` para esse
  caminho). A worktree fantasma `ERP-Evok-case010-red-proof` não existe
  (`git worktree list`), e a frase que a citava foi removida do MD.
- Suíte executada de forma independente pela VeriCore: **4/4 passam** contra
  o HEAD.
- As 4 premissas vermelhas foram verificadas contra o código real de
  `752b6d8` via `git show`, e todas conferem (fallback de DPO com 1 arg,
  `CreateRetentionPolicyUseCase` inexistente, guarda de release ausente do
  script `build`) — a prova vermelha seria de fato vermelha no ponto citado.
- Ressalva menor: o teste usa `require()`/estilo CJS sem tipagem, diferente
  do padrão dos demais testes do módulo.

## Nada regredido de `f720058`

Confirmado: fallback de DPO removido, validação de `dpo_user_id` de payload,
guarda de release ligada ao build, `POST /api/jur/lgpd/retention-policies`
— todos intactos. Diff não toca migrations/models/config de banco. Nenhuma
menção a `erp_evok_audio`. Nenhuma ocorrência de `FINDING CLOSED` ou
`RETEST_PASSED` no diff (autoridade preservada com a VeriCore).

## Divergências entre o pacote de evidência e a realidade (motivo da ressalva)

1. **Evidência de execução é só texto, não output capturado.** `tsc -b` do
   client, `npm run build`/`typecheck` (client e server), e os "37/37" de
   testes agregados citados no pacote **não têm log/saída commitada**. Só a
   suíte de red-proof (4/4) foi reproduzida de forma independente pela
   VeriCore.
2. `.tmp/red-proof-752b6d8/server`, citado como método de reexecução da
   prova vermelha, não existe em disco nem em commit — a técnica descrita é,
   por si, irreprodutível. A conclusão está correta (verificada via
   `git show` pela própria VeriCore), mas não pela evidência entregue.
3. A alegação de que a correção "quebrava o typecheck" é plausível e
   coerente com o código, mas nunca houve output de erro do `tsc` registrado
   em nenhuma das duas correções.
4. Alegação de "preload temporário e seguro" para contornar falha de
   `tsx`/`process.geteuid` no Windows durante o build do server não aparece
   em nenhum lugar do diff nem do repositório — ambiente ad hoc não
   documentado tecnicamente, build do server não reproduzível como descrito.
5. Redação da seção "prova vermelha" sugere continuidade da prova original
   da Correção 01 (que nunca existiu, ver despacho de Correção 02, ponto
   2.2) — a atual é uma reexecução nova, correta em resultado, mas a
   redação segue ambígua sobre isso.

## Recomendação

Condições materiais dos 2 pontos foram atendidas — pode avançar. Antes de
`RETEST_PASSED` formal, exigir:

1. Captura real (log/output, não texto) de `tsc -b` do client e da suíte
   completa do módulo, não apenas a alegação no MD.
2. Item de backlog aberto para a UI de seleção de política de retenção +
   `GET /api/jur/lgpd/retention-policies` — a aba real de RoPA está
   confirmadamente quebrada em produção (400 garantido) até isso existir.

Nenhuma declaração de `FINDING CLOSED`/`RETEST_PASSED` feita aqui — essa
autoridade permanece exclusiva da VeriCore, e ainda não foi exercida.
