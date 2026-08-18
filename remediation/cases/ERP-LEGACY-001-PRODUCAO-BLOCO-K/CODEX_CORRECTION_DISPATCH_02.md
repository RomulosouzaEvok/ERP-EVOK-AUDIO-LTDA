# Despacho de correção — CORREÇÃO 02 — `ERP-LEGACY-001-PRODUCAO-BLOCO-K`

```
ESCOPO:       Correção pontual sobre commit já existente (365617d) —
              disclaimer do Bloco K insuficiente + resíduo de encoding
COMMIT_BASE:  365617d
BRANCH:       opus/ERP-LEGACY-001/PRODUCAO-BLOCO-K
WORKTREE:     C:\Sistema EvokAudio\ERP-Evok-opus-PRODUCAO-BLOCO-K
DESTINO:      Codex
```

## 1. Contexto

A Correção 01 (commit `365617d`) resolveu 5 dos 6 pontos identificados. A
segunda opinião da VeriCore deu `APROVA_COM_RESSALVA` e achou 2 problemas
residuais, ambos pequenos e pontuais. Este despacho corrige só esses 2.

## 2. Problema 1 — disclaimer do Bloco K é genérico demais

`server/src/modules/fiscal/infrastructure/sequelize/SequelizeFiscalRepository.ts:173-174`
tem hoje `disclaimer: 'Preview referencial; nao e o arquivo oficial do SPED.'`
— mas isso não avisa o problema real: **K200 reflete saldo ATUAL, não o
saldo do período pedido** (a query não usa `startDate`/`endDate`), e **K280
nunca é gerado** (sempre vazio). Um booleano/texto genérico não impede uso
indevido por quem não sabe ler o código-fonte.

**Correção exigida:** tornar o texto do `disclaimer` específico, citando os
dois problemas reais, por exemplo (ajustar redação, mas manter o conteúdo):
"Preview referencial, não é o arquivo oficial do SPED. K200 reflete o saldo
ATUAL do sistema, não o saldo na data de corte do período informado. K280
não é gerado nesta versão. Campos oficiais do leiaute (IND_EST, COD_PART,
COD_ITEM, DT_INI_OP/DT_FIN_OP, COD_DOC_OP) estão ausentes." Propagar o texto
atualizado em todos os pontos onde já é usado (`blocoKController.ts`, JSON e
CSV) — é só trocar o texto, a estrutura de propagação já existe e está
correta.

## 3. Problema 2 — resíduo de acentuação/encoding não revertido

Dois arquivos ficaram com acentuação **mista** (parte corrigida na Correção
01, parte ainda degradada por uma edição anterior à Correção 01 que não
constava no dispatch original):

**`server/src/models/ProductionOrder.ts`:**
- linha ~41: `'FK -> products.id'` deveria ser `'FK → products.id'`
- linha ~68: `'FK -> users.id'` deveria ser `'FK → users.id'`
- linha ~69: `'FK -> items.id'` deveria ser `'FK → items.id'`
- campo `order_number`: comentário `'Numero da OP'` deveria ser `'Nº da OP'`
- Resultado atual: o arquivo mistura `→` (correto, várias linhas) com `->`
  (incorreto) nos mesmos comentários de FK — inconsistência dentro do
  próprio arquivo.

**`docs/tributario/04-BLOCO_K.md`, seção 7 (linhas ~183-186):**
teve acentuação correta da baseline substituída por versão sem acento (ex.:
"Geração do arquivo oficial" virou sem o acento, "industrialização" virou
"industrializacao", um travessão `—` virou hífen simples). Restaurar a
acentuação correta dessa seção específica.

**Correção exigida:** corrigir os pontos acima para consistência (usar `→`
em todas as setas de FK em `ProductionOrder.ts`, restaurar `Nº`, e
reacentuar a seção 7 do doc). Conferir com diff visual, não confiar em
"parece ok" — comparar contra o texto da baseline anterior à introdução
desta feature (`git show efe2d96~1:server/src/models/ProductionOrder.ts` e
`git show efe2d96~1:docs/tributario/04-BLOCO_K.md` como referência do texto
correto original).

## 4. O que já está certo — não mexer

- `authorizeModule('producao','approve')` no PUT de custeio, com o teste
  real que não mocka a regra (usa `jest.requireActual`) — correto, não
  mexer.
- `return` antes de `handleZodError` — correto.
- BOM e mojibake já eliminados de `RESIDUAIS_ABERTOS_2026-08-10.md` e
  `ChangeProductionOrderStatusUseCase.ts` — correto, não mexer.
- Comentário da "bomba de schema" restaurado em `ProductionOrder.ts` —
  correto, não mexer (é um bloco diferente do problema de setas acima).
- `production_route_id`, migration, K280 sinalizado como vazio — intactos,
  não mexer.
- `docs/governance/TODO.md` continua **fora de escopo** — não tocar nesse
  arquivo neste despacho nem em nenhum outro (foi revertido após uma
  tentativa anterior corromper seu encoding; precisa de commit dedicado
  futuro, não faz parte desta correção).

## 5. Prompt literal para colar no Codex

```text
Você está atuando como sanacore-remediation-engineer / opuscore-backend-engineer dentro da estrutura CoreTriad deste repositório.

Isto é uma CORREÇÃO 02, pequena e pontual, sobre um commit já existente (365617d). NÃO toque em docs/governance/TODO.md sob nenhuma circunstância — esse arquivo foi revertido de propósito após uma tentativa anterior corromper seu encoding, e fica fora de escopo de todos os despachos deste caso.

Trabalhe exclusivamente na worktree/branch já existente:
  worktree: C:\Sistema EvokAudio\ERP-Evok-opus-PRODUCAO-BLOCO-K
  branch:   opus/ERP-LEGACY-001/PRODUCAO-BLOCO-K

Regras absolutas:
- NÃO conecte em erp_evok_audio (produção).
- Não toque em audit/, coretriad/governance/, coretriad/states/, .claude/, nem em docs/governance/TODO.md.
- Capture e registre o OUTPUT REAL dos comandos executados (typecheck, testes).

PROBLEMA 1 — disclaimer do Bloco K genérico demais:
Em server/src/modules/fiscal/infrastructure/sequelize/SequelizeFiscalRepository.ts (~linha 173-174), o campo disclaimer hoje diz só "Preview referencial; nao e o arquivo oficial do SPED." Troque o texto para citar especificamente: K200 reflete o saldo ATUAL do sistema, não o saldo na data de corte do período informado (startDate/endDate não são usados na query de K200); K280 não é gerado nesta versão; faltam campos oficiais do leiaute (IND_EST, COD_PART, COD_ITEM, DT_INI_OP/DT_FIN_OP, COD_DOC_OP). Mantenha a propagação já existente do campo disclaimer em server/src/modules/fiscal/presentation/controllers/blocoKController.ts (JSON e CSV, todas as seções K200/K230/K235/K280) — só troque o texto, não a estrutura.

PROBLEMA 2 — resíduo de acentuação/encoding:
Em server/src/models/ProductionOrder.ts: corrija 'FK -> products.id' (~linha 41), 'FK -> users.id' e 'FK -> items.id' (~linhas 68-69) para usar → em vez de ->, consistente com as demais setas do mesmo arquivo (linhas 7, 59, 60, 64 já usam →). Corrija o comentário de order_number de 'Numero da OP' para 'Nº da OP'.
Em docs/tributario/04-BLOCO_K.md, seção 7 (~linhas 183-186): restaure a acentuação correta que existia antes desta feature — use git show efe2d96~1:docs/tributario/04-BLOCO_K.md como referência do texto original correto (ex.: "Geração", "industrialização", travessão — em vez de hífen simples).
Confira com diff visual contra a baseline efe2d96~1 nos dois arquivos, não confie em "parece ok".

Validação depois:
- Execute os testes do módulo fiscal e production relevantes (unit), capture e registre o output real.
- Execute typecheck do server, capture e registre o output real.

Ao terminar:
- Commit na branch opus/ERP-LEGACY-001/PRODUCAO-BLOCO-K, não em main nem em audit/.
- Descreva no corpo do commit os 2 pontos corrigidos, com arquivo:linha.
- Pare aguardando revisão da VeriCore.
```

## 6. Registro

Correção pequena e pontual sobre o mesmo trabalho. Não reabre os pontos já
aprovados sem ressalva (RBAC, return, restauração de comentário histórico).
