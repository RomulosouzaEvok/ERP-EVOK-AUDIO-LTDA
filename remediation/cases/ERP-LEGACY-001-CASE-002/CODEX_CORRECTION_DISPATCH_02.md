# Despacho de correção — CORREÇÃO 02 — `ERP-LEGACY-001-CASE-002`

```
CASE_ID:      ERP-LEGACY-001-CASE-002
FINDING_ID:   FIND-ERP-005 (Falha 1 — 2 problemas achados na segunda opinião da Correção 01)
ESCOPO:       Correção pontual sobre commit já existente (5107409) na worktree
              sana/ERP-LEGACY-001/FIND-ERP-005 — NÃO reabre Falhas 2/3/4
COMMIT_BASE:  5107409 (fix(juridico): FIND-ERP-005 correcao 01 - fecha gap de
              contiguidade na alcada)
DESTINO:      sanacore-remediation-engineer / Codex
```

## 1. Contexto

A Correção 01 (commit `5107409`) fechou o bypass principal da Falha 1 (faixas
de alçada com lacuna deixando contrato ativar sem aprovação), com duas
camadas: fail-closed na avaliação (`approvalPolicy.ts`) e validação de
contiguidade na escrita (`approvalThresholdController.ts`). A segunda opinião
da VeriCore deu `APROVA_COM_RESSALVA` e achou **2 problemas reais**, ambos
bloqueantes antes do reteste dinâmico formal. Este despacho corrige
**apenas** esses 2 pontos. Não reabra Falhas 2/3/4 (intocadas e aprovadas).

## 2. Problema 1 (BLOQUEANTE) — regressão: contrato com `value` nulo/zero deixou de ativar

`server/src/modules/juridico/domain/approvalPolicy.ts`, função
`resolveApprovalPolicy`: `min_value` é **exclusivo** (`evaluated > min`). O
seed de faixas (`server/migrations/20260814-000048-...cjs:95`) começa em
`min_value: 0`. `toNumber(null, 0)` devolve `0`. Logo, um contrato com
`value: null` (estado legítimo e existente — ex.: contrato ainda sem valor
definido) tem `evaluated = 0`, e `0 > 0` é falso — **nenhuma faixa casa**,
e o fail-closed novo da Correção 01 lança `APPROVAL_POLICY_GAP` para um
caso que **não é lacuna nenhuma**, é ausência legítima de valor.

`CreateContractUseCase.ts:66` grava `value: input.value ?? null` — contrato
sem valor é um estado normal do sistema. Antes da Correção 01, isso caía em
`requiredRoles: []` e ativava sem exigir aprovação (comportamento correto
pra contrato sem valor monetário definido). Agora, `ActivateContractUseCase`,
`ApproveContractUseCase`, `CreateContractAddendumUseCase` e até o **GET de
aprovações** (`ListContractApprovalsUseCase.ts:62`) estouram erro pra esse
caso. Nenhum teste (novo ou antigo) cobre `value: 0`/`value: null`.

**Correção exigida:** tratar `value` nulo/zero como "sem alçada exigida"
(equivalente a nenhuma faixa aplicável por ausência de valor monetário, não
por lacuna de configuração) — a forma mais simples e correta: se
`params.value` for `null`/`undefined` (não apenas `0`, que pode ser um valor
real avaliável), devolver `requiredRoles: []`/`requiredLevel` mínimo **antes**
de entrar na lógica de faixas, sem lançar `APPROVAL_POLICY_GAP`. Se
`value === 0` for um valor real de contrato (não ausência), avaliar se o
comportamento correto é o mesmo (nenhuma faixa deveria exigir aprovação pra
contrato de valor zero) ou se isso precisa de uma faixa `min_value: -1`/ajuste
equivalente — o engineer deve escolher a forma mais simples que não quebre a
semântica de "faixa exclusiva no piso" para os demais valores, e documentar a
escolha. Adicionar teste explícito: `value: null` e `value: 0` devem
continuar ativando/aprovando/consultando sem estourar `APPROVAL_POLICY_GAP`.

## 3. Problema 2 (BLOQUEANTE) — validação de contiguidade (Camada 2) incompleta

`server/src/modules/juridico/presentation/controllers/approvalThresholdController.ts`,
função de validação de contiguidade: hoje só compara **pares consecutivos**
dentro do grupo (`for index < ordered.length - 1`). Isso deixa passar:

- **Grupo sem teto aberto na faixa mais alta**: um conjunto `0-50000` +
  `50000-100000` (ambas `active: true`) é aceito pelo PUT hoje, mas **não
  cobre nenhum valor acima de 100.000** — exatamente a mesma classe de
  lacuna que a Correção 01 existe para fechar, só que na ponta de cima.
  Prova: o teste que o próprio commit da Correção 01 registrou como "conjunto
  contíguo válido"
  (`server/tests/unit/juridico-contract-authority-find-erp-005.test.ts:328-339`)
  usa exatamente essas duas faixas ativas (a terceira, `100000-∞`, está
  `active: false` e por isso ignorada) — ou seja, o teste hoje **documenta
  como válido um payload que tem lacuna**.
- **Grupo com uma única regra**: o loop de pares consecutivos não roda
  nenhuma vez, então nunca é verificado se essa regra única cobre do piso
  até o teto aberto.
- Efeito colateral (não é bypass, é fail-closed indevido): um
  `contract_type` específico com uma única faixa `0-50000` passa no PUT, mas
  fica sem cobertura acima de 50.000 (porque a existência de qualquer regra
  específica descarta o grupo `'*'` inteiro, `selectEffectiveRules`) —
  qualquer contrato desse tipo acima de 50.000 vai bloquear na Camada 1 por
  `APPROVAL_POLICY_GAP`, um bloqueio que a Camada 2 deveria ter pego antes.

**Correção exigida:** estender a validação de contiguidade em cada grupo
(`contract_type` específico e `'*'` separadamente) para exigir, além da
ausência de lacuna/sobreposição entre pares consecutivos:
1. A faixa de **menor `min_value`** do grupo deve cobrir o piso desejado
   (ex.: `min_value <= 0`, já que o piso conceitual é 0 — ajustar conforme a
   correção do Problema 1 para não conflitar com o tratamento de valor
   nulo/zero).
2. A faixa de **maior `max_value`** do grupo deve ter `max_value === null`
   (teto aberto) — sem isso, qualquer valor acima do maior teto configurado
   fica descoberto.
3. Isso deve valer mesmo para grupo com **uma única faixa** (não depender do
   loop de pares consecutivos rodar pelo menos uma vez).
Corrigir também o teste `:328-339` do arquivo citado, que hoje chama de
"válido" um payload com lacuna real — ou o payload de teste precisa ganhar
uma faixa `100000-∞` `active: true` (deixando de estar `active: false`), ou
o teste precisa ser reescrito para provar que esse payload específico é
**rejeitado**.

## 4. O que já está certo — não mexer

- A Camada 1 e a Camada 2 continuam corretas para lacunas **no meio** do
  intervalo (o cenário original do despacho da Correção 01) — não regredir
  isso.
- `min_value` exclusivo / `max_value` inclusivo continuam sendo a semântica
  correta pros demais casos — não trocar esse modelo, só tratar a borda do
  piso e do teto aberto.
- Faixas `active: false` continuarem ignoradas tanto na avaliação quanto na
  validação de contiguidade — correto, não mexer.
- Nenhuma asserção de Falha 2/3/4 foi alterada na Correção 01 — continuar
  assim.

## 5. Prompt literal para colar no Codex

```text
Você está atuando como sanacore-remediation-engineer dentro da estrutura CoreTriad deste repositório.

Isto é uma CORREÇÃO 02 sobre uma implementação já existente e parcialmente aprovada (FIND-ERP-005, Falha 1, Correção 01 no commit 5107409). NÃO é reimplementação, NÃO reabre Falhas 2/3/4, NÃO precisa de decisão nova do dono — os 2 problemas abaixo são bugs concretos achados na segunda opinião da VeriCore sobre o próprio código da Correção 01.

Trabalhe exclusivamente na worktree/branch já existente:
  worktree: C:\Sistema EvokAudio\ERP-Evok-sana-FIND-ERP-005
  branch:   sana/ERP-LEGACY-001/FIND-ERP-005

Regras absolutas:
- NÃO conecte em erp_evok_audio (produção), nem para contar linhas.
- Não execute operação destrutiva em banco real. Testes de integração HTTP somente contra erp_evok_audio_test.
- Não toque em audit/, coretriad/governance/, coretriad/states/, .claude/ ou docs/ fora do já autorizado no caso.
- Não regrida a Camada 1 nem a Camada 2 da Correção 01 para o cenário de lacuna NO MEIO do intervalo (o caso original) — só corrija as bordas (piso e teto) e o tratamento de value nulo/zero.
- Não declare FINDING CLOSED nem RETEST_PASSED.
- Capture e registre no pacote de evidência o OUTPUT REAL dos comandos executados (typecheck, testes) — não apenas a alegação em texto.

Leitura obrigatória antes de editar:
1. Leia server/src/modules/juridico/domain/approvalPolicy.ts por inteiro, função resolveApprovalPolicy e toNumber.
2. Leia server/src/modules/juridico/application/use-cases/CreateContractUseCase.ts (linha ~66, onde value: input.value ?? null é gravado).
3. Leia server/src/modules/juridico/presentation/controllers/approvalThresholdController.ts, a função de validação de contiguidade adicionada na Correção 01.
4. Leia server/tests/unit/juridico-contract-authority-find-erp-005.test.ts, especialmente as linhas ~279-339 (os testes da Correção 01).

PROBLEMA 1 (BLOQUEANTE) — regressão de value nulo/zero:
resolveApprovalPolicy trata min_value como exclusivo (evaluated > min). Como a primeira faixa começa em min_value: 0, um contrato com value: null (toNumber(null, 0) vira 0) faz 0 > 0 ser falso, então nenhuma faixa casa, e o fail-closed novo da Correção 01 lança APPROVAL_POLICY_GAP para um contrato que legitimamente não tem valor definido — isso é uma regressão, contrato sem valor deveria continuar ativando sem exigir alçada, como fazia antes da Correção 01.
Corrija tratando value nulo/undefined como "sem alçada exigida" (requiredRoles: [] com nível mínimo) ANTES de entrar na lógica de matching de faixas, sem lançar APPROVAL_POLICY_GAP. Avalie se value === 0 (valor real de contrato zero, não ausência) deve ter o mesmo tratamento ou precisa de ajuste na faixa mínima — escolha a forma mais simples que não quebre a semântica de piso exclusivo pros demais valores positivos, e documente a escolha no pacote de evidência. Adicione testes explícitos: value: null e value: 0 continuam ativando/aprovando/consultando sem estourar APPROVAL_POLICY_GAP.

PROBLEMA 2 (BLOQUEANTE) — validação de contiguidade não cobre as bordas:
A validação de contiguidade em approvalThresholdController.ts só compara pares consecutivos dentro de cada grupo (por contract_type, com '*' separado). Isso deixa passar um conjunto de faixas que não cobre acima do maior max_value configurado (nenhuma faixa com max_value: null), e não valida grupo com uma única faixa. Prova concreta: o teste em juridico-contract-authority-find-erp-005.test.ts:328-339, que a Correção 01 registrou como "conjunto contíguo válido", na verdade usa duas faixas ativas (0-50000 e 50000-100000) sem nenhuma cobrindo acima de 100000 — está documentando como válido um payload com lacuna real.
Corrija a validação para exigir, em cada grupo (contract_type específico e '*' separadamente): (a) a faixa de menor min_value cobre o piso desejado (coordenar com a correção do Problema 1 pra não conflitar); (b) a faixa de maior max_value tem max_value === null (teto aberto obrigatório); (c) essas duas checagens valem mesmo pra grupo com uma única faixa (não dependam do loop de pares consecutivos rodar). Corrija também o teste de :328-339 — ou adicione a faixa 100000-∞ como active: true nesse payload, ou reescreva o teste para provar que esse payload específico (sem teto aberto) é rejeitado pelo PUT.

Não regrida: a detecção de lacuna NO MEIO do intervalo (cenário original da Correção 01, ex. 0-50000 + 300000-∞ deixando 50000-300000 descoberto) precisa continuar funcionando exatamente como está.

Documente no REMEDIATION_EVIDENCE_PACKAGE.md (seção nova "Correção 02"):
- os 2 problemas, com arquivo:linha da causa;
- a correção de cada um, com arquivo:linha;
- a decisão tomada sobre value === 0 (mesmo tratamento de null, ou faixa ajustada) e por quê;
- prova vermelha: os cenários exatos (value: null, value: 0, conjunto sem teto aberto, grupo com faixa única) falhando/rejeitando incorretamente ANTES desta correção;
- prova verde: os mesmos cenários corrigidos DEPOIS;
- confirmação de que o cenário original da Correção 01 (lacuna no meio) continua funcionando — não regredido;
- output REAL de: testes novos/atualizados do módulo juridico, typecheck/build do server.

Validação depois:
- Execute os testes novos e a suíte completa do módulo jurídico (unitários + integração), capture e registre o output real.
- Execute typecheck/build do server, capture e registre o output real.

Ao terminar:
- Atualize REMEDIATION_EVIDENCE_PACKAGE.md e CASE_STATUS.md, mantendo STATUS: REMEDIATION_COMPLETE apenas se os 2 pontos estiverem de fato corrigidos e comprovados com output real, e sem regressão do cenário original.
- Commit na branch sana/ERP-LEGACY-001/FIND-ERP-005, não em main.
- Nunca escreva FINDING CLOSED nem RETEST_PASSED.
- Pare aguardando revisão/segunda opinião/reteste da VeriCore.
```

## 6. Registro

Corrige a mesma implementação (`FIND-ERP-005`/`CASE-002`), mesma
worktree/branch. Não abre novo caso, não redefine escopo, não altera
decisão `APR-2026-021`. Falhas 2/3/4 continuam com `APROVA_COM_RESSALVA` já
registrado, não reabertas por este despacho.
