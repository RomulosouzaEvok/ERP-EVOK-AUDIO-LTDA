# Despacho de correção — CORREÇÃO 01 — `ERP-LEGACY-001-CASE-002`

```
CASE_ID:      ERP-LEGACY-001-CASE-002
FINDING_ID:   FIND-ERP-005 (Falha 1 — gap de contiguidade nas faixas de alçada)
ESCOPO:       Correção pontual sobre implementação já existente (worktree
              sana/ERP-LEGACY-001/FIND-ERP-005, HEAD e564199) — NÃO é
              reimplementação, NÃO reabre Falhas 2/3/4
BASE:         commit e564199 (docs(sana): registra REMEDIATION_COMMIT 1046e16
              no CASE_STATUS), branch sana/ERP-LEGACY-001/FIND-ERP-005
DECISOES:     nenhuma decisão nova do dono é necessária — a lacuna é um bug
              de implementação sobre uma decisão já tomada (APR-2026-021
              Parte B decisão 3, "alçada = tabela configurável"), não uma
              pergunta de negócio nova
DESTINO:      sanacore-remediation-engineer / Codex
```

## 1. Contexto — por que é uma correção, não um novo caso

`FIND-ERP-005` já recebeu implementação completa das 4 falhas na worktree
`C:\Sistema EvokAudio\ERP-Evok-sana-FIND-ERP-005`, branch
`sana/ERP-LEGACY-001/FIND-ERP-005` (commits `cd6f45b`..`e564199`). A segunda
opinião da VeriCore (`coretriad/states/ERP-LEGACY-001/SECOND_OPINION_CASE-002_004_009.md`)
deu `APROVA_COM_RESSALVA` a F2/F3/F4, mas achou um **bypass real e completo**
em F1 — a mesma classe de falha que o caso existe para fechar, agora
escondida atrás de uma tabela em vez de uma constante. **Recomendação
registrada: tratar como bloqueante antes do reteste formal.**

Este despacho corrige **apenas** essa lacuna. Não toca F2, F3 ou F4 (já
aprovadas), não cria caso novo, não altera decisão já tomada em
`APR-2026-021`.

## 2. O problema, com evidência real do código (não do MD de evidência)

`server/src/modules/juridico/domain/approvalPolicy.ts:157-161`:

```ts
const matched = effective.find((rule) => {
  const min = toNumber(rule.min_value, 0);
  const max = rule.max_value === null || rule.max_value === undefined ? null : toNumber(rule.max_value, 0);
  return evaluated > min && (max === null || evaluated <= max);
}) ?? null;

return {
  requiredRoles: matched ? [...(matched.required_roles ?? [])] : [],
  requiredLevel: matched?.required_level ?? 'approve',
  ...
```

Quando **nenhuma** faixa cobre o valor avaliado (`matched === null`) —
porque um administrador cadastrou, por exemplo, `0–50000` e `300000–∞`,
deixando `50000–300000` sem dono — a função devolve `requiredRoles: []`.
`ActivateContractUseCase`/`ApproveContractUseCase` leem essa lista vazia
como "nenhuma aprovação exigida" e **ativam o contrato sem nenhuma
aprovação**. Um contrato de R$ 100.000 cai exatamente nessa lacuna.

O fail-closed hoje só cobre o caso "tabela vazia" (`effective.length === 0`,
linha 147-154) — não cobre "tabela não-vazia mas com buraco no meio", que é
o caso que este despacho corrige.

`server/src/modules/juridico/presentation/controllers/approvalThresholdController.ts`,
função `validatePayload` (linhas 47-93): valida cada faixa isoladamente
(min/max coerentes, papéis válidos, nível válido), mas **nunca valida o
conjunto** — não há checagem de contiguidade nem de sobreposição entre
faixas. É possível salvar um conjunto de faixas com lacuna hoje, pela API
oficial, sem erro.

Nenhum teste da suíte atual exercita política com lacuna (confirmado por
grep na segunda opinião).

## 3. Correção exigida — DUAS camadas, não uma só

**Camada 1 — fail-closed em tempo de avaliação (`approvalPolicy.ts`):**
Quando `matched === null` **e** existe pelo menos uma regra vigente
(`effective.length > 0`) — ou seja, existe política, mas nenhuma faixa
cobre o valor —, `resolveApprovalPolicy` deve **lançar** `BusinessRuleError`
(mesmo padrão de `rule: 'RF-JUR-003'`, novo `reason`, ex.
`APPROVAL_POLICY_GAP`), não devolver `requiredRoles: []`. Isso fecha o
bypass mesmo que uma lacuna escape da validação de escrita por qualquer
caminho (migration manual, seed, bug futuro na Camada 2).

**Camada 2 — validação de contiguidade em tempo de escrita
(`approvalThresholdController.ts`, `validatePayload`):**
Depois de validar cada faixa individualmente, validar o **conjunto**,
agrupado por `contract_type` (incluindo o grupo `'*'` separadamente — não
misturar com faixas específicas de tipo, seguindo a mesma precedência que
`selectEffectiveRules` já usa): ordenar por `min_value`, e rejeitar
(`ValidationError`) se:
- houver lacuna entre o `max_value` de uma faixa e o `min_value` da
  próxima (considerando que `min_value` é exclusivo e `max_value` é
  inclusivo — não deve sobrar nenhum valor real sem faixa, começando do
  menor `min_value` do conjunto até o "sem teto" final);
- houver sobreposição entre faixas do mesmo grupo.

A validação deve considerar apenas faixas com `active: true` no payload
recebido (uma faixa inativa não participa da cobertura). Documentar essa
escolha explicitamente no `REMEDIATION_EVIDENCE_PACKAGE.md`.

## 4. Prompt literal para colar no Codex

```text
Você está atuando como sanacore-remediation-engineer dentro da estrutura CoreTriad deste repositório.

Isto é uma CORREÇÃO 01 sobre uma implementação já existente e já aprovada com ressalva (FIND-ERP-005, Falhas 2/3/4 completas, Falha 1 com bypass a corrigir). NÃO é reimplementação do zero, NÃO reabre Falhas 2/3/4, NÃO precisa de decisão nova do dono.

Trabalhe exclusivamente na worktree/branch já existente:
  worktree: C:\Sistema EvokAudio\ERP-Evok-sana-FIND-ERP-005
  branch:   sana/ERP-LEGACY-001/FIND-ERP-005

Se a worktree não existir mais, recrie-a a partir do commit e564199 (não a partir de main, não do zero).

Regras absolutas:
- NÃO conecte em erp_evok_audio (produção), nem para contar linhas.
- Não execute operação destrutiva em banco real. Testes de integração HTTP somente contra erp_evok_audio_test.
- Não toque em audit/, coretriad/governance/, coretriad/states/, .claude/ ou docs/ fora do único arquivo de doc já autorizado no caso original (BLOCO_3_JUR_API.md, apenas se a mudança de contrato exigir).
- Não regrida nada já aprovado nas Falhas 2, 3 e 4 (nível approve na rota de aprovação, truthiness eliminada, reabertura de alçada em aditivo, segregação de identidade entre aprovadores).
- Não declare FINDING CLOSED nem RETEST_PASSED. Essa autoridade é exclusiva da VeriCore.
- Capture e registre no pacote de evidência o OUTPUT REAL dos comandos executados (typecheck, testes) — não apenas a alegação em texto. Isso foi uma ressalva explícita em outro caso deste mesmo fluxo (CASE-010) e não deve se repetir aqui.

Leitura obrigatória antes de editar:
1. Leia integralmente coretriad/states/ERP-LEGACY-001/SECOND_OPINION_CASE-002_004_009.md, seção "CASE-002 / FIND-ERP-005", especialmente o parágrafo sobre F1.
2. Leia server/src/modules/juridico/domain/approvalPolicy.ts por inteiro — especialmente selectEffectiveRules (linhas ~120-129) e resolveApprovalPolicy (linhas ~140-183).
3. Leia server/src/modules/juridico/presentation/controllers/approvalThresholdController.ts por inteiro — especialmente validatePayload (linhas ~47-93).
4. Leia os testes existentes de FIND-ERP-005 (buscar por "FIND-ERP-005" nos arquivos de teste do módulo juridico) para entender o padrão de teste já usado e não duplicar setup.

O problema (confirmado no código, não no pacote de evidência):
resolveApprovalPolicy, quando existe política configurada mas NENHUMA faixa cobre o valor avaliado (matched === null, mas effective.length > 0 — ou seja, existe uma lacuna real entre faixas), devolve requiredRoles: [] em vez de lançar erro. ActivateContractUseCase/ApproveContractUseCase interpretam isso como "nenhuma aprovação exigida" e ativam/aprovam sem nenhum controle. Um contrato caindo numa faixa vazia (ex.: faixas 0-50000 e 300000-∞ cadastradas, contrato de 100000) ativa sem aprovação nenhuma. validatePayload valida cada faixa isoladamente mas nunca o conjunto — não há checagem de contiguidade nem sobreposição entre faixas do mesmo contract_type (incluindo o grupo '*' separadamente).

Corrija as DUAS camadas, ambas obrigatórias (defesa em profundidade, uma não substitui a outra):

CAMADA 1 — fail-closed em tempo de avaliação (approvalPolicy.ts):
Em resolveApprovalPolicy, quando effective.length > 0 mas matched === null (existe política vigente, mas nenhuma faixa cobre o valor), lance BusinessRuleError com rule: 'RF-JUR-003' e um reason novo (ex. APPROVAL_POLICY_GAP), em vez de devolver requiredRoles: []. Mensagem deve deixar claro ao operador que existe uma lacuna de configuração no valor avaliado, não um erro genérico. Preserve o fail-closed já existente para effective.length === 0 (política totalmente ausente) como está — são dois motivos de falha distintos, podem ter reasons distintos.

CAMADA 2 — validação de contiguidade em tempo de escrita (approvalThresholdController.ts, validatePayload):
Depois das validações individuais já existentes (min/max, papéis, nível), adicione validação do CONJUNTO: agrupe as faixas recebidas por contract_type (grupo '*' separado dos grupos específicos, mesma precedência de selectEffectiveRules em approvalPolicy.ts), considere só as faixas com active !== false dentro de cada grupo, ordene por min_value, e rejeite com ValidationError se: (a) houver lacuna entre o max_value de uma faixa e o min_value da próxima dentro do mesmo grupo (lembrando min_value exclusivo / max_value inclusivo — nenhum valor real entre a menor faixa e o "sem teto" pode ficar descoberto); (b) houver sobreposição entre faixas do mesmo grupo. Mensagem de erro deve indicar qual grupo (contract_type) e qual intervalo ficou descoberto ou sobreposto.

Documente no REMEDIATION_EVIDENCE_PACKAGE.md (seção nova "Correção 01 — Falha 1, gap de contiguidade"):
- o problema, com arquivo:linha da causa-raiz;
- a correção nas duas camadas, com arquivo:linha de cada mudança;
- a decisão de considerar só faixas active !== false na validação de contiguidade — registrar explicitamente essa escolha;
- prova vermelha: teste que reproduz o cenário exato (faixas 0-50000 e 300000-∞, contrato de valor no meio) contra o código ANTES da correção, mostrando que ativava sem aprovação;
- prova verde: o mesmo teste após a correção, mostrando erro fail-closed na avaliação; e teste de validatePayload rejeitando o PUT que tentaria salvar essas duas faixas com lacuna;
- output REAL (não descrição) de: testes novos/atualizados do módulo juridico, typecheck/build do server.

Testes obrigatórios (integração HTTP e/ou unitário, o que for mais direto para cada camada):
- Camada 1: chamar resolveApprovalPolicy/resolveContractApprovalPolicy com um conjunto de regras com lacuna e um valor que cai nela → deve lançar BusinessRuleError com o novo reason, não devolver requiredRoles vazio.
- Camada 1: garantir que o fail-closed pré-existente (tabela vazia) continua funcionando e com reason distinto do novo.
- Camada 2: PUT /api/jur/settings/approval-thresholds com faixas 0-50000 e 300000-∞ (mesmo contract_type ou '*') → 400/ValidationError citando o intervalo descoberto.
- Camada 2: PUT com faixas sobrepostas (ex. 0-100000 e 50000-200000) → 400/ValidationError citando a sobreposição.
- Camada 2: garantir que um conjunto de faixas contíguo e válido (o comportamento hoje aprovado) continua sendo aceito sem erro — não regredir o caminho feliz.
- Não alterar nenhuma asserção dos testes já existentes de F2/F3/F4 — apenas adicionar.

Validação depois:
- Execute os testes novos e a suíte completa do módulo jurídico (unitários + integração), capture e registre o output real.
- Execute typecheck/build do server, capture e registre o output real.
- Se node_modules faltar, instale dentro da própria worktree; se não for possível, registre a lacuna no pacote de evidência (não omitir).

Ao terminar:
- Atualize REMEDIATION_EVIDENCE_PACKAGE.md e CASE_STATUS.md do caso, mantendo STATUS: REMEDIATION_COMPLETE apenas se as duas camadas estiverem de fato corrigidas e comprovadas com output real.
- Commit na branch sana/ERP-LEGACY-001/FIND-ERP-005, não em main.
- Nunca escreva FINDING CLOSED nem RETEST_PASSED.
- Pare aguardando revisão/segunda opinião/reteste da VeriCore.
```

## 5. Registro

Este despacho corrige a mesma implementação já existente para
`ERP-LEGACY-001-CASE-002` / `FIND-ERP-005`, sobre a mesma worktree/branch.
Não abre novo `REMEDIATION_CASE`, não redefine escopo, não altera a decisão
`APR-2026-021` Parte B já tomada pelo dono. A autoridade para declarar
`RETEST_PASSED`/`FINDING CLOSED` permanece exclusiva da VeriCore, e F2/F3/F4
continuam com o veredito `APROVA_COM_RESSALVA` já registrado — este
despacho não os reabre.
