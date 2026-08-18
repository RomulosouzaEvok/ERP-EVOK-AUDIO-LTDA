# Despacho de correção — CORREÇÃO 03 — `ERP-LEGACY-001-CASE-010`

```
CASE_ID:      ERP-LEGACY-001-CASE-010
FINDING_ID:   FIND-ERP-006
ESCOPO:       Captura de evidência real (logs de comando), não correção de
              código — os 2 pontos de código da Correção 02 já foram
              aprovados sem ressalva de fundo
BRANCH:       sana/ERP-LEGACY-001/CASE-010
WORKTREE:     C:\Sistema EvokAudio\ERP-Evok-sana-CASE-010
DESTINO:      sanacore-remediation-engineer / Codex
```

## 1. Contexto

A segunda opinião da Correção 02 (commit `8b5410a`) deu `APROVA_COM_RESSALVA`
— os 2 pontos de código (regressão de `retention_policy_id` opcional, prova
vermelha auditável) foram confirmados corretos pela própria VeriCore, que
inclusive rodou a suíte de prova vermelha e confirmou 4/4. A única ressalva
real registrada foi: **todas as alegações de build/typecheck/teste completo
no pacote de evidência são só texto, sem log/output real capturado** — a
VeriCore só reproduziu a suíte de red-proof, não o restante.

Este despacho **não pede nenhuma mudança de código**. Pede só a captura e o
registro do output real dos comandos de validação, que faltou nas
correções anteriores.

## 2. O que fazer

Rodar, dentro da worktree, e colar o output REAL (não resumir, não
parafrasear) no `REMEDIATION_EVIDENCE_PACKAGE.md`, numa seção nova
"Evidência de validação real (Correção 03)":

1. `npx tsc -b` (ou o comando equivalente já configurado no
   `package.json` do client) — typecheck do CLIENT. Colar o output
   completo, inclusive se der erro.
2. Typecheck do SERVER (`npm run typecheck` ou equivalente).
3. Build do server (`npm run build` ou equivalente).
4. A suíte de testes unitários do módulo LGPD/jurídico relevante ao
   `FIND-ERP-006` (não precisa rodar a suíte inteira do projeto, só o
   escopo deste caso) — output completo com contagem de passed/failed.
5. Se possível sem tocar produção, tentar a suíte de integração relevante
   contra `erp_evok_audio_test`; se a infraestrutura não estiver
   disponível, reportar isso explicitamente (não maquiar como sucesso).

**Se algum desses comandos falhar de verdade** (não só "ambiente
indisponível", mas erro real de código), reportar o erro tal como
apareceu e não declarar `REMEDIATION_COMPLETE` até estar resolvido — mas
isso não é esperado, já que os pontos de código já foram revisados e
aprovados.

## 3. O que já está certo — não mexer

- `retention_policy_id` opcional no client (Opção A, com ressalva
  documentada) — correto, não mexer.
- Prova vermelha auditável (`juridico-lgpd-correction-red-proof.test.ts`)
  — correta, já reproduzida pela própria VeriCore (4/4).
- Fallback de DPO removido, guarda de release, endpoint de retention
  policy — todos intactos e corretos, não mexer.

## 4. Prompt literal para colar no Codex

```text
Você está atuando como sanacore-remediation-engineer dentro da estrutura CoreTriad deste repositório.

Isto NÃO é uma correção de código — é só captura de evidência real que faltou nas correções anteriores do CASE-010 (FIND-ERP-006). O código já foi revisado e aprovado pela VeriCore (com ressalva só sobre falta de output real capturado, não sobre bug). NÃO altere nenhum arquivo de código-fonte.

Trabalhe exclusivamente na worktree/branch já existente:
  worktree: C:\Sistema EvokAudio\ERP-Evok-sana-CASE-010
  branch:   sana/ERP-LEGACY-001/CASE-010

Regras absolutas:
- NÃO conecte em erp_evok_audio (produção).
- Testes de integração HTTP somente contra erp_evok_audio_test, se a infraestrutura estiver disponível; senão, reporte a indisponibilidade sem maquiar.
- Não toque em audit/, coretriad/governance/, coretriad/states/, .claude/.
- Não declare FINDING CLOSED nem RETEST_PASSED.

Rode, nesta ordem, e cole o OUTPUT REAL E COMPLETO de cada comando (não resuma, não parafraseie, cole literalmente o que o terminal mostrou, inclusive se der erro):

1. Typecheck do client (verifique o comando exato no package.json do client — provavelmente tsc -b ou npm run typecheck no diretório client/).
2. Typecheck do server (npm run typecheck ou equivalente, no diretório server/).
3. Build do server (npm run build ou equivalente).
4. Suíte de testes unitários do módulo LGPD/jurídico relevante ao FIND-ERP-006 (não precisa ser a suíte inteira do projeto).
5. Se a infraestrutura de banco de teste (erp_evok_audio_test) estiver disponível no seu ambiente, rode também a suíte de integração relevante. Se não estiver, registre isso explicitamente como limitação de ambiente, sem fingir que rodou.

Atualize remediation/cases/ERP-LEGACY-001-CASE-010/REMEDIATION_EVIDENCE_PACKAGE.md com uma seção nova "Evidência de validação real (Correção 03)", colando o output completo e real de cada comando acima.

Se algum comando falhar com erro REAL de código (não apenas ambiente indisponível), pare e reporte o erro exatamente como apareceu — não declare REMEDIATION_COMPLETE nesse caso. Isso não é esperado, mas é possível.

Ao terminar:
- Commit na branch sana/ERP-LEGACY-001/CASE-010, não em main.
- Nunca escreva FINDING CLOSED nem RETEST_PASSED.
- Pare aguardando revisão/reteste da VeriCore.
```

## 5. Registro

Este despacho não altera comportamento, apenas completa a evidência já
exigida. Não reabre nenhum ponto de código já aprovado. Autoridade de
`RETEST_PASSED`/`FINDING CLOSED` permanece exclusiva da VeriCore.
