# Despacho de correção — CORREÇÃO 01 — `ERP-LEGACY-001-CASE-006`

```
CASE_ID:      ERP-LEGACY-001-CASE-006
ESCOPO:       Correção de 3 problemas achados na segunda opinião aprofundada
              (AUD-INTEG-03, escrita fantasma de inventário)
BRANCH:       sana/ERP-LEGACY-001/CASE-006
WORKTREE:     C:\Sistema EvokAudio\ERP-Evok-sana-CASE-006
DESTINO:      sanacore-remediation-engineer / Codex
```

## 1. Contexto

A correção anterior (commits `51187d7`/`54d9783`/`88e6739`) fechou o
desenho principal (caminho único de escrita via
`manualStockAdjustmentService.ts`, locks `FOR UPDATE`). A segunda opinião
aprofundada da VeriCore confirmou o desenho correto, mas achou 3 problemas
reais: a prova de concorrência nunca rodou de verdade, um teste de
caracterização foi sobrescrito (não estendido), e a mesma classe de defeito
do finding original continua aberta em outro campo. Este despacho corrige
os 3. Não reabra o desenho principal já aprovado.

## 2. Problema 1 (BLOQUEANTE) — teste de concorrência nunca executou

`server/tests/integration/product-movement-concurrency.test.ts` foi
ajustado corretamente (removeu a dependência do próprio defeito no setup),
mas o `REMEDIATION_EVIDENCE_PACKAGE.md` registra `1 skipped` porque
`hasIntegrationPrerequisites()` falhou — **zero execução real** desse
teste até hoje. Nenhum teste que roda hoje exercita a propriedade central
do finding (duas saídas simultâneas do mesmo produto/depósito não devem
gerar saldo negativo/inconsistente).

**Correção exigida:** garantir que os pré-requisitos de integração
(banco `erp_evok_audio_test` acessível, variáveis de ambiente corretas)
estejam satisfeitos NESTA correção, e executar de fato
`product-movement-concurrency.test.ts`, registrando o output real (não a
alegação). Se a infraestrutura de teste continuar indisponível no ambiente
do engineer, isso deve ser reportado explicitamente como bloqueio de
ambiente no pacote de evidência — não pode ficar registrado como "ajustado"
sem nunca ter rodado.

## 3. Problema 2 (BLOQUEANTE) — teste de caracterização da baseline foi sobrescrito, não estendido

`server/tests/characterization/qualidade-estoque--scan-mobile-fura-quarentena.test.ts`
tinha 4 casos documentando o defeito AS-IS (comportamento antes da
correção). A correção atual **reduziu pra 3 casos**, todos documentando o
comportamento CORRIGIDO, e renomeou o `describe` de "Caracterização — ...
fura quarentena" para "CASE-006 - ... respeita deposito". A evidência da
baseline (o que o sistema fazia ANTES) foi apagada no mesmo commit que a
corrige — perdendo, entre outras, a asserção de drift
(`saldo retido > saldo físico`) e o cenário de planejamento.

**Correção exigida:** teste de caracterização documenta o passado, teste de
regressão documenta o presente — **os dois devem existir, em arquivos
separados** (ou describes claramente distintos no mesmo arquivo, mas sem
apagar nenhuma asserção da caracterização original). Restaure os 4 casos
originais de caracterização (consultar o histórico do arquivo antes da
correção atual pra recuperar o texto/asserções perdidas) num arquivo
próprio (ex.: mantendo o nome original), e mantenha o teste de regressão
novo (comportamento corrigido) separado.

## 4. Problema 3 (ALTA) — mesma classe de defeito ainda aberta em `estoque_reservado`

`server/src/modules/.../itemValidators.ts` aceita `estoque_reservado` livre
no cadastro de item, e `CreateItemUseCase.ts` grava
`input.estoque_reservado ?? 0` sem controle. `estoque_atual` foi corrigido
(zerado no cadastro), mas `estoque_reservado` não — saldo reservado
inventado no cadastro é saldo fantasma na direção negativa (disponível =
atual − reservado), a mesma classe de bug que o finding existe para fechar,
só que no campo vizinho.

**Correção exigida:** aplicar a mesma disciplina já usada pra
`estoque_atual` — zerar `estoque_reservado` no cadastro de item (não
aceitar valor livre vindo do payload), ou, se houver razão de negócio
legítima para aceitar um valor inicial, documentar essa exceção
explicitamente e adicionar validação equivalente à de `estoque_atual`. O
engineer deve escolher a opção mais simples e coerente com o padrão já
aplicado ao campo irmão, documentando a escolha.

## 5. O que já está certo — não mexer

- Caminho único de escrita via `manualStockAdjustmentService.ts` para os 3
  use cases (`RegisterProductMovement`, `ScanItem`, `BatchScan`) — correto,
  não regredir.
- Locks `FOR UPDATE` em `warehouseStockService.ts`/`inventoryService.ts` —
  corretos.
- Separação do lockfile `mobile` (commit `51187d7`) — correta, escopo
  limpo.
- Ressalva conhecida e não bloqueante (não corrigir aqui, só documentar se
  ainda não estiver): inversão de ordem de lock entre `in`/`out` no mesmo
  produto/depósito pode causar deadlock (`40P01`) — registrar como
  pendência separada se ainda não estiver, não tentar resolver dentro
  desta correção pontual.

## 6. Prompt literal para colar no Codex

```text
Você está atuando como sanacore-remediation-engineer dentro da estrutura CoreTriad deste repositório.

Isto é uma CORREÇÃO 01 sobre a remediação já existente do CASE-006 (escrita fantasma de inventário/AUD-INTEG-03). NÃO é reimplementação — o caminho único de escrita via manualStockAdjustmentService.ts e os locks FOR UPDATE já estão corretos e confirmados; não toque nisso.

Trabalhe exclusivamente na worktree/branch já existente:
  worktree: C:\Sistema EvokAudio\ERP-Evok-sana-CASE-006
  branch:   sana/ERP-LEGACY-001/CASE-006

Regras absolutas:
- NÃO conecte em erp_evok_audio (produção).
- Testes de integração HTTP somente contra erp_evok_audio_test.
- Não toque em audit/, coretriad/governance/, coretriad/states/, .claude/.
- Não declare FINDING CLOSED nem RETEST_PASSED.
- Capture e registre o OUTPUT REAL dos comandos executados (typecheck, testes), não apenas a alegação em texto.

Leitura obrigatória antes de editar:
1. Leia server/tests/integration/product-movement-concurrency.test.ts e entenda por que hasIntegrationPrerequisites() falhava.
2. Leia server/tests/characterization/qualidade-estoque--scan-mobile-fura-quarentena.test.ts no estado atual, e recupere via git log/git show o conteúdo ANTES da correção do CASE-006 (4 casos originais de caracterização).
3. Leia server/src/modules (localização real via grep) itemValidators.ts e CreateItemUseCase.ts, campo estoque_reservado.

PROBLEMA 1 (BLOQUEANTE) — teste de concorrência nunca rodou:
product-movement-concurrency.test.ts está correto no desenho, mas hasIntegrationPrerequisites() falha e o teste fica skipped — zero execução real da propriedade central do finding (duas saídas simultâneas do mesmo produto/depósito não geram saldo inconsistente). Garanta os pré-requisitos (banco erp_evok_audio_test acessível, env vars corretas) e EXECUTE esse teste de fato, registrando o output real. Se a infraestrutura continuar indisponível no seu ambiente, reporte isso explicitamente como bloqueio de ambiente no pacote de evidência — não deixe registrado como "ajustado" sem nunca ter rodado.

PROBLEMA 2 (BLOQUEANTE) — teste de caracterização da baseline foi sobrescrito:
qualidade-estoque--scan-mobile-fura-quarentena.test.ts tinha 4 casos documentando o comportamento ANTES da correção (incluindo asserção de drift saldo retido > saldo físico, e um cenário de planejamento) e foi reduzido pra 3 casos documentando o comportamento DEPOIS, com o describe renomeado. A evidência da baseline foi perdida. Restaure os 4 casos originais de caracterização (recupere via git log/git show do arquivo antes da correção do CASE-006) num arquivo próprio, separado do teste de regressão novo (comportamento corrigido) — os dois devem coexistir, nenhum documento anterior deve ser apagado.

PROBLEMA 3 (ALTA) — mesma classe de defeito aberta em estoque_reservado:
itemValidators.ts aceita estoque_reservado livre no cadastro e CreateItemUseCase.ts grava input.estoque_reservado ?? 0 sem controle, enquanto estoque_atual já foi corrigido (zerado no cadastro). Aplique a mesma disciplina a estoque_reservado — zere no cadastro de item (não aceite valor livre do payload), ou, se houver razão de negócio legítima para aceitar valor inicial, documente essa exceção e adicione validação equivalente à de estoque_atual. Escolha a opção mais simples e documente a decisão.

Documente no REMEDIATION_EVIDENCE_PACKAGE.md do caso (seção nova "Correção 01"):
- os 3 problemas, com arquivo:linha da causa;
- a correção de cada um, com arquivo:linha;
- output REAL da execução do teste de concorrência (Problema 1) — sucesso ou bloqueio de ambiente, sem maquiar;
- confirmação de que os 4 casos de caracterização original foram restaurados, com diff/referência de onde vieram;
- decisão tomada sobre estoque_reservado (zerar ou documentar exceção) e por quê;
- output REAL de: testes novos/atualizados, typecheck/build do server.

Validação depois:
- Execute os testes novos/atualizados e a suíte relevante, capture e registre o output real.
- Execute typecheck/build do server, capture e registre o output real.

Ao terminar:
- Atualize REMEDIATION_EVIDENCE_PACKAGE.md e o status do caso, mantendo REMEDIATION_COMPLETE apenas se os 3 pontos estiverem de fato corrigidos e comprovados com output real (ou o Problema 1 explicitamente reportado como bloqueio de ambiente, não escondido).
- Commit na branch sana/ERP-LEGACY-001/CASE-006, não em main.
- Nunca escreva FINDING CLOSED nem RETEST_PASSED.
- Pare aguardando revisão/segunda opinião/reteste da VeriCore.
```

## 7. Registro

Corrige a remediação existente do CASE-006, mesma worktree/branch. Não
reabre o desenho principal já aprovado (caminho único de escrita, locks).
Autoridade de `RETEST_PASSED`/`FINDING CLOSED` permanece exclusiva da
VeriCore.
