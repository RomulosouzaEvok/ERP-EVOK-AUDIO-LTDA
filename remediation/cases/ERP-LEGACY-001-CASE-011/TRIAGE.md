# TRIAGE — ERP-LEGACY-001-CASE-011

| Campo | Valor |
|---|---|
| `CASE_ID` | `ERP-LEGACY-001-CASE-011` |
| `FINDING_ID` | `FIND-ERP-008` |
| Titulo | SST/CAT — incoerencia tipo x gravidade, prazo sem feriados, fila interna S-2210 |
| Severidade | HIGH, CONFIDENCE CONFIRMED — herdado do finding, nao reavaliado aqui |
| Estado | `TRIAGED — BLOQUEADO POR DECISAO HUMANA` |
| Agente | Codex / sanacore-remediation-triage |
| Data | 2026-08-17 |

## 1. Cumprimento de seguranca

- Nenhuma conexao de banco foi aberta.
- Nenhum comando contra `erp_evok_audio` foi executado.
- Nenhum arquivo em `audit/`, `coretriad/`, `.claude/` ou `docs/` foi alterado.
- Leitura estatica feita sobre finding e codigo versionado.
- Nada foi implementado.
- Nenhum `FINDING CLOSED`, `RETEST_PASSED` ou `REMEDIATION_COMPLETE` declarado.

## 2. Evidencia lida

Finding lido integralmente:

- `docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-008.md`

Arquivos de codigo lidos para confirmar a causa-raiz:

- `server/src/modules/sst/application/use-cases/accident/EmitCatUseCase.ts`
- `server/src/modules/sst/domain/services/legalDeadlineService.ts`
- `server/src/modules/sst/application/use-cases/accident/ReopenCatUseCase.ts`
- `server/src/modules/sst/presentation/controllers/accidentController.ts`
- `server/src/modules/sst/presentation/routes/sst.ts`
- `server/tests/unit/sst-accident.test.ts`
- `client/src/api/sst.ts`
- `client/src/pages/sst/AccidentsTab.tsx`

## 3. Causa-raiz confirmada

O endpoint de emissao de CAT modela o mesmo fato em duas fontes independentes:

- `EmitCatUseCase.ts` deriva `tipo` de `body.tipo`.
- O prazo legal vem de `acidente.gravidade` via `calcularPrazoLimiteCat`.
- Nao ha comparacao entre `body.tipo` e `acidente.gravidade`.
- A UI chama `emitCat` com `{ tipo: 'inicial' }` fixo.
- A regra de unicidade bloqueia apenas segunda CAT `inicial`, deixando possivel sequencia `obito` + `inicial`.
- `legalDeadlineService.ts` considera apenas fim de semana e ignora feriados, apesar de RNF-SST-04 exigir feriados nacionais.
- O teste existente aprova o par incoerente `gravidade='obito'` + `body.tipo='inicial'`.

## 4. Por que este caso nao e LIMPO

O caso exige pelo menos duas decisoes reais antes de despacho de implementacao:

| ID | Decisao pendente | Por que bloqueia codigo |
|---|---|---|
| `D1` | Fonte autoritativa do tipo da CAT: o sistema deve derivar `tipo` de `acidente.gravidade`, ou rejeitar combinações incoerentes enviadas no body? | O contrato atual fala em CAT inicial, o ENUM admite `obito`, e a UI sempre envia `inicial`. A escolha altera contrato/API e comportamento da tela. |
| `D2` | Feriados nacionais: implementar calendario minimo agora, ou registrar decisao de manter simplificacao e alterar requisito em outro fluxo? | RNF-SST-04 exige feriados. Implementar calendario exige fonte/lista/estrategia de manutencao; nao cabe ao agente inventar calendario normativo. |
| `D3` | `emitente` textual: persistir em coluna/campo proprio ou remover do contrato/UI? | Hoje o cliente envia e a API documenta como gravado, mas o backend descarta. Persistir muda schema; remover muda contrato/UI. |
| `D4` | Owner de SST/RH para validar regra de prazo e feriados. | O proprio codigo pede verificacao com tecnico SST/RH; nao existe owner nominal versionado. |

## 5. Recomendacao tecnica

Recomendacao para decisao rapida, sem invadir o papel do dono:

- `D1`: derivar `tipo` exclusivamente de `acidente.gravidade`: `obito` quando `gravidade === 'obito'`; `inicial` nos demais casos. Ignorar/rejeitar `body.tipo` para emissao inicial, evitando dupla fonte de verdade.
- `D2`: implementar calendario configuravel de feriados nacionais com seed minimo/versionado ou mecanismo configuravel sem depender de servico externo; se nao houver fonte aprovada, tratar feriados como pendencia explicita e nao declarar RNF-SST-04 fechado.
- `D3`: remover `emitente` textual do contrato/UI ou renomear como observacao nao legal; a autoria legal do sistema deve ser `emitente_id` do JWT. Persistir texto so se a empresa quiser registrar o nome/cargo exibido no documento.
- `D4`: nomear owner SST/RH para validar feriados/prazo antes de reteste final.

## 6. Estrategia tecnica quando destravado

Depois das decisoes:

- Corrigir `EmitCatUseCase` para uma unica fonte de verdade de `tipo`.
- Corrigir unicidade para impedir segunda comunicacao inicial quando ja existir CAT `inicial` ou `obito`.
- Corrigir/expandir `sst-accident.test.ts`, especialmente o teste que hoje congela `obito + inicial`.
- Adicionar testes unitarios diretos para `calcularPrazoLimiteCat`.
- Corrigir UI/API para nao enviar `tipo: 'inicial'` fixo se a fonte for backend.
- Enderecar `emitente` conforme decisao.
- Documentar residual de eSocial: o sistema grava fila interna S-2210, nao transmite de fato.

## 7. Veredito da triagem

`CASE-011` nao e limpo.

Estado: `TRIAGED — BLOQUEADO POR DECISAO HUMANA`.

Pelo fluxo continuo definido pelo dono, a fila deve parar aqui ate D1-D4 serem respondidas. Nao preparar despacho de implementacao ainda e nao avancar para o proximo finding enquanto este bloqueio estiver aberto.

