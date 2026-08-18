# Despacho de correção — `ERP-LEGACY-001-PRODUCAO-BLOCO-K`

```
ESCOPO:       Correção pontual sobre commit já existente (feature nova,
              fora do escopo dos findings da auditoria ERP-LEGACY-001 —
              não é remediação de finding, é revisão de qualidade de
              feature nova entregue durante o mesmo período)
COMMIT_BASE:  efe2d96 ("feat: add production cost settings and bloco k
              preview"), agora preservado em branch própria
BRANCH:       opus/ERP-LEGACY-001/PRODUCAO-BLOCO-K
WORKTREE:     C:\Sistema EvokAudio\ERP-Evok-opus-PRODUCAO-BLOCO-K
DESTINO:      Codex (ou executor equivalente)
```

## 1. Contexto — por que este despacho existe

Este commit foi feito originalmente direto na ponta da branch de auditoria
`audit/ERP-LEGACY-001-AUD-001/2026-08-16` (violação de isolamento de
organização — implementação não deveria tocar a branch de auditoria, que
precisa permanecer imutável). A VeriCore:
1. Moveu o commit para a branch própria `opus/ERP-LEGACY-001/PRODUCAO-BLOCO-K`
   (preservando o trabalho, nada foi perdido).
2. Restaurou a branch de auditoria para o commit correto (`752b6d8`).
3. Revisou o conteúdo do commit e encontrou pontos corretos (manter) e
   pontos errados (corrigir). Este despacho cobre **apenas** os pontos
   errados. Não reabra nem reimplemente o que já está certo.

## 2. O que já está CERTO — não mexer

- `production_route_id` gravado em `ChangeProductionOrderStatusUseCase.ts`
  quando a OP é liberada com roteiro ativo: lógica condicional correta, sem
  regressão no fluxo sem roteiro.
- Migration `20260818-000048-add-production-order-route-id.cjs`: coluna
  nullable, FK `ON DELETE SET NULL`, índice, `down()` reversível presente.
  Correto.
- Montagem das rotas novas em `server/app.ts` e `fiscal.ts`: aditiva, sem
  colisão com rotas existentes.
- `K280` retornado vazio e explicitamente sinalizado (`k280: []`,
  `k280_count: 0`) — correto não fabricar dado, e sinalizar em vez de
  omitir silenciosamente.
- Build (`npx tsc --noEmit`) passa, imports resolvem.
- Teste `production-tracking-required-g4.test.ts`: a asserção nova
  adicionada (`production_route_id: 55`) é válida e não enfraquece nada
  existente — manter.
- `rbac-critical-routes.test.ts`: caso novo adicionado sem remover nenhuma
  asserção existente — manter.

## 3. O que está ERRADO — corrigir

### 3.1 (BLOQUEANTE) PUT de `production_cost_settings` no mesmo nível do GET

`server/src/modules/production/presentation/routes/productionCostSettings.ts:12-13`:
GET usa `authorizeModule('producao')` (default `'operate'`); PUT usa
`authorizeModule('producao', 'operate')` — **mesmo nível**. O comentário no
próprio arquivo (`:9`) afirma que "escrita exige `operate`" como se fosse
mais restritivo que a leitura, mas é o MESMO nível — a frase é enganosa e o
controle é insuficiente: qualquer usuário com `producao:operate` (nível
básico, operador de chão de fábrica) pode alterar
`overhead_rate_percent`/`default_labor_rate_per_hour`, que alimentam
`registerLaborAndOverheadCost` → custo de estoque → CMV/precificação.
Comparável: a config fiscal (`fiscal.ts`) exige `admin` para o equivalente.

**Correção exigida:** o PUT deve exigir `authorizeModule('producao',
'approve')` (nível gestor), mantendo o GET em `'operate'` (leitura pode
continuar mais aberta). Corrigir também o comentário `:9` para descrever o
nível real após a mudança. Atualizar
`server/tests/unit/production-cost-settings-route.test.ts` para de fato
provar a distinção: hoje o teste mocka `authorizeModule` com um default
`'operate'` que não detecta a falha atual — o teste precisa exercitar
GET com `operate` (200) e PUT com `operate` (403) e PUT com `approve`
(200), não apenas fiação de rota.

### 3.2 (BLOQUEANTE) "Bloco K" não implementa o layout oficial SPED — risco de uso fiscal indevido

`server/src/modules/fiscal/infrastructure/sequelize/SequelizeFiscalRepository.ts`,
método `findBlocoKPreview`, e `blocoKController.ts` (`flattenBlocoKRows`):

- **K200 não filtra pelo período recebido** (`startDate`/`endDate` do
  request nunca são usados na query) — retorna a quantidade **atual** de
  `products.quantity` no momento da chamada, não o saldo escriturado ao
  FIM do período pedido. Um preview de agosto gerado em dezembro devolve o
  estoque de dezembro. Isso é dado fiscal incorreto por construção.
- Faltam campos estruturais do registro oficial K200 (`IND_EST`,
  `COD_PART`, `COD_ITEM`, e equivalentes de K230/K235 como
  `DT_INI_OP`/`DT_FIN_OP`/`COD_DOC_OP`) — os campos atuais
  (`quantity_by_warehouse`, `lots_count`, `user_id`, `production_route_id`)
  não correspondem ao leiaute.
- K230 filtra só `po.status = 'completed'`, omitindo OPs abertas no fim do
  período, que o registro K230 oficial também precisa cobrir.
- Nenhuma query filtra por empresa/estabelecimento — necessário para
  qualquer registro fiscal multi-empresa.

**Correção exigida (mínima, para não gerar dado fiscal incorreto até que o
layout completo seja desenhado com validação tributária):**
1. K200 deve respeitar `startDate`/`endDate` recebidos, calculando saldo na
   data de corte, não o saldo atual da tabela — se essa mudança for cara
   demais para esta correção pontual, o **preview inteiro deve ser
   marcado explicitamente como não-oficial** (ex.: campo
   `is_reference_only: true` e mensagem clara na resposta e no CSV) até
   que o layout completo seja validado com contador/tributarista — não
   pode sair rotulado como "K200"/"K230"/"K235" sem essa ressalva visível
   em toda saída (JSON e CSV).
2. K230 deve incluir OPs abertas relevantes ao período, não só
   `completed`, ou documentar explicitamente essa limitação na mesma
   ressalva do item 1.
3. Adicionar a mesma ressalva de "não-oficial/apenas referência" na
   documentação (`docs/tributario/04-BLOCO_K.md`) de forma consistente —
   hoje o doc ficou internamente contraditório (lista "coluna amarrando OP
   à revisão de roteiro" como pendência mesmo após a própria edição).
4. Reescrever `bloco-k-preview-use-case.test.ts` e `bloco-k-route.test.ts`
   para deixar de ser tautológicos (hoje mockam tudo e testam o mock) —
   precisam exercitar `flattenBlocoKRows`, a query real (contra banco de
   teste `erp_evok_audio_test`) e o corte de período de fato.

### 3.3 (BLOQUEANTE) Corrupção de encoding em código e documentação — reverter

O commit alega "normalizei trechos de docs com encoding ruim", mas o efeito
real foi o oposto: UTF-8 válido foi convertido em mojibake, e um BOM
(`\ufeff`) foi inserido no início de pelo menos dois arquivos.

**Arquivos afetados, reverter para texto correto (UTF-8 sem BOM, acentos
corretos):**
- `docs/governance/RESIDUAIS_ABERTOS_2026-08-10.md` — remover o BOM da
  linha 1; corrigir sequências como `â€”`, `prÃ³xima`, `MÃ©todo`, `suÃ­te`
  de volta para `—`, `próxima`, `Método`, `suíte`.
- `server/src/modules/production/application/use-cases/ChangeProductionOrderStatusUseCase.ts`
  — remover o BOM da linha 1; corrigir os ~25 blocos de JSDoc com `â€”`,
  `â†’`, `Ã³`, `Ã‰` de volta para os caracteres corretos; remover as duas
  linhas em branco extras no fim do arquivo.
- Verificar `ProductionOrder.ts` e `docs/tributario/04-BLOCO_K.md`: nestes
  dois, o efeito foi o oposto (acentos corretos foram removidos, ex.
  "Produção"→"Producao"). Restaurar os acentos corretos também nestes
  arquivos.

**Importante:** isto é código de produção e documentação de governança —
tratar como prioridade alta, não cosmética. Verificar com um diff visual
(não confiar em "parece ok") que o texto final tem acentuação correta e
nenhum BOM.

### 3.4 (ALTA PRIORIDADE) Restaurar comentário apagado sobre bug histórico

Em `server/src/models/ProductionOrder.ts`, foi deletado um bloco de ~8
linhas de comentário que documentava a "bomba de schema corrigida em
2026-08-04" — explicando por que `allowNull: true` é explícito em colunas
opcionais, referenciando a migration `20260804-000012`. Também foi
encurtado o comentário de `department_id`, removendo a nota sobre
"nullable também no histórico legado, sem backfill possível, ver migration
20260806-000003".

**Correção exigida:** restaurar ambos os comentários ao texto original
(consultar `git show 752b6d8:server/src/models/ProductionOrder.ts` para o
texto exato antes da remoção). Isso é conhecimento institucional sobre um
bug de produção real — removê-lo cria risco de reintrodução do defeito por
alguém que não souber o motivo do `allowNull: true` explícito.

### 3.5 (MÉDIA) Bug de controle de fluxo em `handleZodError`

`server/src/modules/production/presentation/controllers/productionCostSettingsController.ts:26`
— `if (!parsed.success) handleZodError(parsed.error);` sem `return` (o
controller do Bloco K equivalente tem `return`). Funciona hoje só porque
`handleZodError` sempre lança exceção — mas é frágil e inconsistente com o
padrão usado no mesmo commit. Adicionar o `return` por consistência e
defesa contra futura mudança de `handleZodError` que não lance.

### 3.6 (BAIXA, documentação) Corrigir TODO.md

`docs/governance/TODO.md` marca dois residuais como concluídos
(`- [x]`, linhas ~6583 e ~6588) com linguagem mais forte ("fechando o
rastro histórico da revisão usada") do que a implementação sustenta —
`ChangeProductionOrderStatusUseCase.ts:181` não faz backfill de OPs
históricas com apontamento pré-existente e `production_route_id` nulo.
Ajustar a linguagem para refletir o estado real (aditivo daqui pra frente,
sem backfill histórico) ou registrar o backfill como pendência separada.

## 4. Prompt literal para colar no Codex

```text
Você está atuando como sanacore-remediation-engineer / opuscore-backend-engineer dentro da estrutura CoreTriad deste repositório.

Isto é uma CORREÇÃO sobre um commit já existente (efe2d96, feature de production_route_id + production_cost_settings API + Bloco K preview), agora isolado na branch/worktree própria abaixo. NÃO é reimplementação do zero — mantenha tudo que já está correto (production_route_id, a migration, a montagem de rotas, o K280 vazio sinalizado, o build passando, os dois testes de RBAC que só ganharam asserção nova).

Trabalhe exclusivamente na worktree/branch já existente:
  worktree: C:\Sistema EvokAudio\ERP-Evok-opus-PRODUCAO-BLOCO-K
  branch:   opus/ERP-LEGACY-001/PRODUCAO-BLOCO-K

Regras absolutas:
- NÃO conecte em erp_evok_audio (produção), nem para contar linhas.
- Não execute operação destrutiva em banco real. Testes de integração HTTP somente contra erp_evok_audio_test.
- Não toque em audit/, coretriad/governance/, coretriad/states/, .claude/.
- Capture e registre o OUTPUT REAL dos comandos executados (typecheck, testes), não apenas a alegação em texto.
- Não declare a feature como "pronta para produção" no que envolve o Bloco K sem a ressalva explícita de não-oficialidade descrita abaixo — é dado fiscal, e gerar registro incorreto tem risco regulatório real.

Leitura obrigatória antes de editar:
1. Leia server/src/modules/production/presentation/routes/productionCostSettings.ts e o middleware server/src/middlewares/auth.ts (para entender o default de authorizeModule).
2. Leia server/src/modules/fiscal/infrastructure/sequelize/SequelizeFiscalRepository.ts (findBlocoKPreview) e server/src/modules/fiscal/presentation/controllers/blocoKController.ts (flattenBlocoKRows).
3. Rode git show 752b6d8:server/src/models/ProductionOrder.ts para recuperar o texto original dos comentários removidos.
4. Leia docs/tributario/04-BLOCO_K.md e docs/governance/TODO.md nos trechos citados abaixo.

Corrija os 6 pontos a seguir, cada um documentado com o problema e a correção esperada:

PONTO 1 (BLOQUEANTE) — Nível de autorização do PUT de custeio:
productionCostSettings.ts hoje usa authorizeModule('producao', 'operate') tanto no GET quanto no PUT — são o mesmo nível, apesar do comentário dizer o contrário. Altere o PUT para exigir authorizeModule('producao', 'approve'). Corrija o comentário para refletir o nível real. Reescreva server/tests/unit/production-cost-settings-route.test.ts para provar a distinção de verdade: GET com nível 'operate' → 200; PUT com nível 'operate' → 403; PUT com nível 'approve' → 200. O teste atual mocka authorizeModule com um default que não detectaria essa falha — não repita esse padrão.

PONTO 2 (BLOQUEANTE) — Bloco K não é o layout oficial SPED, risco de uso fiscal indevido:
K200 não usa startDate/endDate recebidos na query — retorna estoque atual, não o saldo na data de corte pedida. Faltam campos estruturais oficiais (IND_EST, COD_PART, COD_ITEM, DT_INI_OP/DT_FIN_OP/COD_DOC_OP nos registros correspondentes). K230 só considera po.status='completed', omitindo OPs abertas relevantes ao período. Nenhuma query filtra por empresa/estabelecimento.
Correção mínima aceitável nesta rodada (não é para desenhar o layout completo agora, é para não entregar dado fiscal enganoso):
(a) K200 deve respeitar o período recebido calculando o saldo na data de corte — se isso for grande demais para esta correção pontual, adicione um campo is_reference_only: true na resposta E no CSV, com texto claro de que não é o arquivo oficial SPED, aplicado a K200/K230/K235 (K280 já está corretamente sinalizado como vazio, não precisa mudar).
(b) Ajuste K230 para incluir OPs abertas relevantes ao período, ou documente essa limitação explicitamente na mesma ressalva do item (a).
(c) Alinhe docs/tributario/04-BLOCO_K.md para não ficar contraditório com a implementação.
(d) Reescreva bloco-k-preview-use-case.test.ts e bloco-k-route.test.ts para parar de ser tautológicos — hoje mockam tudo e testam o próprio mock. Exercite flattenBlocoKRows de verdade e, se possível, a query real contra erp_evok_audio_test verificando o corte de período.

PONTO 3 (BLOQUEANTE) — Reverter corrupção de encoding:
docs/governance/RESIDUAIS_ABERTOS_2026-08-10.md e server/src/modules/production/application/use-cases/ChangeProductionOrderStatusUseCase.ts tiveram texto UTF-8 correto convertido em mojibake (ex.: "â€”" no lugar de "—", "prÃ³xima" no lugar de "próxima") e ganharam um BOM (\ufeff) na primeira linha. Reverta para o texto correto (UTF-8 sem BOM, acentuação correta) nesses dois arquivos. Além disso, ProductionOrder.ts e docs/tributario/04-BLOCO_K.md tiveram o efeito oposto (acentos corretos removidos, ex. "Produção"→"Producao") — restaure a acentuação correta nesses dois também. Confira com diff visual, não apenas "parece ok".

PONTO 4 (ALTA) — Restaurar comentário apagado sobre bug histórico:
server/src/models/ProductionOrder.ts perdeu um bloco de ~8 linhas de comentário sobre a "bomba de schema corrigida em 2026-08-04" (allowNull explícito, migration 20260804-000012) e teve o comentário de department_id encurtado (perdeu a nota sobre nullable no histórico legado, migration 20260806-000003). Restaure ambos os comentários ao texto original — use git show 752b6d8:server/src/models/ProductionOrder.ts como referência exata.

PONTO 5 (MÉDIA) — Bug de controle de fluxo:
server/src/modules/production/presentation/controllers/productionCostSettingsController.ts, linha ~26: if (!parsed.success) handleZodError(parsed.error); está sem return, diferente do padrão usado no controller do Bloco K. Adicione o return por consistência e defesa em profundidade.

PONTO 6 (BAIXA) — Corrigir linguagem do TODO.md:
docs/governance/TODO.md marca dois residuais como concluídos com linguagem que sugere backfill histórico completo, mas ChangeProductionOrderStatusUseCase.ts não faz backfill de OPs antigas com apontamento pré-existente e production_route_id nulo. Ajuste a linguagem para refletir que a gravação é daqui pra frente (aditiva), sem backfill retroativo, ou registre o backfill como pendência separada.

Validação depois:
- Execute os testes novos/atualizados e a suíte relevante do módulo production e fiscal, capture e registre o output real.
- Execute typecheck/build do server, capture e registre o output real.

Ao terminar:
- Commit na branch opus/ERP-LEGACY-001/PRODUCAO-BLOCO-K, não em main nem em audit/.
- Descreva no corpo do commit exatamente os 6 pontos corrigidos, com arquivo:linha de cada mudança.
- Pare aguardando revisão da VeriCore.
```

## 5. Registro

Este despacho corrige uma feature nova (não um finding da auditoria formal),
identificada e revisada pela VeriCore fora do fluxo padrão de remediação
porque foi encontrada sentada incorretamente na branch de auditoria. A
autoridade de revisão final continua sendo da VeriCore, mesmo fora do
programa formal de findings do ERP-LEGACY-001-AUD-001.
