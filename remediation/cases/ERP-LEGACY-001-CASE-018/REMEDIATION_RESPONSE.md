# REMEDIATION_RESPONSE (SanaCore)

Objeto respondido: `ERP-LEGACY-001-AUD-001` / finding `AUD-AUTHN-02`
("Senha do admin de bootstrap com default versionado").

Esta é uma **remediation-response**, vinculada ao finding sem editá-lo. O
finding original permanece intocado (é propriedade da VeriCore/`audit/`;
`coretriad/CLAUDE.md` ownership de diretórios). Nenhuma escrita foi feita
fora de `remediation/cases/`.

---

## O que foi determinado

Triagem `remediation/cases/ERP-LEGACY-001-CASE-018/TRIAGE.md`: o finding é
**PARCIALMENTE EXECUTÁVEL** —
(a) endurecimento de código/config/guardas/docs → despachado e agora
implementado;
(b) rotação da senha do admin existente em produção → bloqueada por
`APR-2026-016`, decisão do dono, sem resposta registrada até o momento
(`PENDING_DECISION.md`).

Despacho técnico completo:
`remediation/cases/ERP-LEGACY-001-CASE-018/CODEX_REMEDIATION_DISPATCH.md`
(itens E-1…E-7).

## O que a SanaCore fez

- Implementou a parte (a) em `sana/ERP-LEGACY-001/CASE-018`, HEAD `078ee8b`
  (+ uma correção de encoding, não commitada, deixada para revisão do
  usuário — ver `REMEDIATION_EVIDENCE_PACKAGE.md` §5), na worktree
  `C:\Sistema EvokAudio\ERP-Evok-sana-CASE-014`.
- Corrigiu os três defeitos distintos identificados pela triagem: D-1
  (default versionado no compose), D-2 (fallback hardcoded no seed), D-3
  (comprimento que só avisava).
- Moveu a validação para dentro de `seedDatabase()`, depois do guard de
  idempotência, independente de `NODE_ENV` — exatamente como fixado pela
  triagem, sem improviso técnico.
- Reescreveu (não apenas ajustou) os 2 casos de teste que assertavam o
  defeito como comportamento correto, e acrescentou 3 casos novos, incluindo
  a prova de não-regressão para instância com banco já populado.
- Criou guarda estática nova (`docker-compose-admin-seed-guard.test.ts`) em
  arquivo próprio, sem editar o guard do `CASE-005`.
- Corrigiu o drift de documentação em `README.md`,
  `REQUISITOS_NAO_FUNCIONAIS.md` e `DOCKER_POSTGRES_SETUP.md`.
- Não tocou nenhuma linha de `docker-compose.yml` pertencente a `CASE-005`
  ou `CASE-015`.
- Não abriu nenhuma conexão de banco, real ou de teste, em nenhum momento
  da implementação nem deste empacotamento (`APR-2026-016`).
- Este agente (`sanacore-remediation-evidence`) montou o
  `REMEDIATION_EVIDENCE_PACKAGE.md`, verificando por leitura estática
  independente (não reexecução) que o diff bate com o relato do
  implementador, e registrando explicitamente as lacunas conhecidas.

## O que a SanaCore NÃO fez e não fará

- Não declara `RETEST_PASSED`, `FINDING CLOSED` nem `RISK_ACCEPTED` (Regras
  3/4 do `CLAUDE.md`).
- Não responde nenhuma das 4 perguntas de `PENDING_DECISION.md` (rotação de
  senha admin em produção, confirmação de `.env` por máquina, verificação do
  segundo PC). Continuam pendentes de decisão do dono.
- Não rotacionou, tocou ou inspecionou nenhuma credencial de produção.
- Não editou o finding original nem o `TRIAGE.md`/`CODEX_REMEDIATION_DISPATCH.md`.
- Não reexecutou nenhuma suíte de teste neste empacotamento — os resultados
  reportados (`npm run typecheck` 0 erros; testes de seeds 15/15;
  `test:unit` 1956/1957 com 1 falha pré-existente não relacionada) são os
  do agente de implementação, verificados por leitura de diff, não por
  execução.
- Não escondeu a falha pré-existente de `docs-path-reference-guard.test.ts`
  nem a ausência de `.env` nesta worktree (que impede `docker compose
  config`).

## Estado devolvido ao Control Plane

`REMEDIATION_COMPLETE` / `READY_FOR_RETEST`. Ver
`remediation/cases/ERP-LEGACY-001-CASE-018/STATUS.md`.

Próximo passo: reteste independente da VeriCore (agente que não escreveu a
correção), executando as sondas estáticas e dinâmicas descritas em
`REMEDIATION_EVIDENCE_PACKAGE.md` (RETEST_INSTRUCTIONS) e em `TRIAGE.md`
§9, e decidindo, à luz de `PENDING_DECISION.md`, o efeito do estado
indeterminado da credencial de produção sobre o fechamento do finding.
