# REMEDIATION EVIDENCE PACKAGE — ERP-LEGACY-001-CASE-011

**Finding:** FIND-ERP-008 — SST/CAT
**Branch:** `sana/ERP-LEGACY-001/CASE-011`
**Worktree:** `C:\Sistema EvokAudio\ERP-Evok-sana-CASE-011`
**Commit de implementação:** `1caf9c3`
**Data:** 2026-08-18

## 1. Decisões aplicadas

A implementação segue APR-2026-056:

- **D1:** a gravidade registrada é a fonte autoritativa do tipo da CAT;
- **D2:** não foi criado calendário de feriados; a simplificação de sábado/domingo foi formalizada;
- **D3:** o texto livre `emitente` foi removido; a autoria permanece exclusivamente em `emitente_id`, obtido do usuário autenticado;
- **D4:** o owner SST/RH continua **PENDENTE**. Sua indicação é pré-requisito da validação humana final da regra de prazo/feriados, mas não da entrega do código.

## 2. D1 — tipo da CAT derivado da gravidade

### Causa-raiz e correção

- **Antes:** `EmitCatUseCase.ts:60` usava `body.tipo`; a UI enviava sempre `tipo: 'inicial'`.
- **Depois:** `EmitCatUseCase.ts:60-67` deriva `obito` somente quando `acidente.gravidade === 'obito'` e `inicial` nos demais casos.
- `EmitCatUseCase.ts:63-67` rejeita com `BusinessRuleError` qualquer `body.tipo` legado explicitamente incoerente. Foi escolhida **rejeição**, não sobrescrita silenciosa, porque o despacho determina não adivinhar a intenção do operador.
- `EmitCatUseCase.ts:55-58` considera `inicial` e `obito` como a primeira comunicação, preservando a unicidade antes das reaberturas.
- `client/src/api/sst.ts:374-392` inclui `obito` no tipo de resposta e não envia tipo no POST; `AccidentsTab.tsx:307,379,398` chama sem payload fixo e exibe corretamente CAT por óbito.

### Prova vermelha

Teste escrito antes da correção:

```text
FAIL tests/unit/sst-accident.test.ts
Expected: "obito"
Received: "inicial"

Received promise resolved instead of rejected

Test Suites: 1 failed, 1 total
Tests:       3 failed, 15 passed, 18 total
```

### Prova verde direcionada

```text
Test Suites: 1 passed, 1 total
Tests:       19 passed, 19 total
Snapshots:   0 total
Time:        0.242 s, estimated 1 s
Ran all test suites matching tests/unit/sst-accident.test.ts.
```

Os casos cobrem CAT fatal sem `tipo`, os dois sentidos de incoerência explícita, unicidade de CAT inicial/fatal e o fluxo vencido já existente.

## 3. D2 — simplificação do prazo

- **Antes:** `BLOCO_1_SST_REQUISITOS.md:160` e `BLOCO_1_SST_API.md:430-432` prometiam feriados nacionais, embora `legalDeadlineService.ts` considerasse somente fim de semana.
- **Depois:** RNF-SST-04 em `docs/business/BLOCO_1_SST_REQUISITOS.md:160` registra a simplificação aprovada em APR-2026-056; o escalonamento SST → gestor SST foi preservado.
- O contrato em `docs/business/BLOCO_1_SST_API.md:431-434` descreve sábado/domingo e não promete feriados.
- `sst-accident.test.ts:245-248` prova diretamente sexta-feira → segunda-feira.

Não foi implementado calendário de feriados. A busca no módulo não encontrou implementação do escalonamento de alerta previsto na parte preservada de RNF-SST-04; isso permanece lacuna residual fora de D2 e deve ser avaliado com o owner indicado em D4.

## 4. D3 — remoção do emitente textual

- **Antes:** `client/src/api/sst.ts:380,388-402` declarava/exigia `emitente`; `AccidentsTab.tsx:307,379` enviava `Técnico SST` e o exibia; `EmitCatInput` aceitava o texto; a documentação o prometia.
- **Depois:** `client/src/api/sst.ts:376-402` não contém o campo nem parâmetros textuais; `AccidentsTab.tsx:307,379` não envia nem exibe o texto; `EmitCatInput` em `EmitCatUseCase.ts:28-32` aceita apenas o `tipo` legado opcional para detectar incoerência.
- `client/src/api/sst.cat-contract.test.ts:15-42` prova as assinaturas de um parâmetro e os POSTs sem body.
- `sst-cat-authoritative-type.test.ts:53-63` envia `emitente` legado por HTTP e confirma que a resposta não contém o campo.

Nenhuma coluna, migration ou campo persistente novo foi criado. `emitente_id` permanece preenchido pelo ID do login em `EmitCatUseCase.ts:75`.

## 5. Defeito adjacente descoberto pela integração

A primeira prova HTTP retornou 500. O diagnóstico real no banco de teste foi:

```text
SequelizeDatabaseError: FOR UPDATE cannot be applied to the nullable side of an outer join
DB: FOR UPDATE cannot be applied to the nullable side of an outer join
```

`SequelizeAccidentRepository.findAccidentById` fazia `FOR UPDATE` sem alvo sobre uma consulta com `LEFT JOIN`. A correção em `SequelizeAccidentRepository.ts:43-45` restringe o lock a `SstAcidente`, preservando a transação e tornando a rota executável no PostgreSQL real.

## 6. Integração HTTP — somente banco de teste

A API temporária foi iniciada na porta 3124 com `DB_NAME=erp_evok_audio_test`. Não houve conexão com `erp_evok_audio`.

```text
CASE011_ISOLATED_HTTP_TEST_OK
Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   0 total
Time:        0.451 s, estimated 1 s
Ran all test suites matching tests/integration/sst-cat-authoritative-type.test.ts.
```

O teste cria funcionário/acidente sintéticos, envia POST com acidente fatal sem `tipo`, inclui `emitente` legado para provar ausência de efeito e verifica resposta 201 com `tipo: 'obito'` sem `emitente`.

## 7. Regressão ampliada

Todos os testes unitários SST:

```text
Test Suites: 10 passed, 10 total
Tests:       103 passed, 103 total
Snapshots:   0 total
Time:        8.731 s
```

Cliente completo:

```text
Test Files  16 passed (16)
Tests       88 passed (88)
Duration    26.11s
```

## 8. Typecheck, builds e dependências

Server:

```text
> erp-evok-audio-server@1.0.0 typecheck
> tsc -p tsconfig.json --noEmit

> erp-evok-audio-server@1.0.0 build
> tsc -p tsconfig.build.json

found 0 vulnerabilities
```

O cliente não possui script `typecheck` separado; seu build começa obrigatoriamente por `tsc -b`:

```text
> client@0.0.0 build
> tsc -b && vite build

vite v8.2.0 building client environment for production...
✓ 2310 modules transformed.
✓ built in 657ms
found 0 vulnerabilities
```

O aviso não bloqueante já existente de chunk superior a 500 kB permaneceu inalterado.

## 9. Limites e próximo gate

Somente os dois trechos documentais autorizados foram alterados. `audit/`, `coretriad/`, `.claude/` e demais documentos ficaram intocados. O caso deve aguardar owner SST/RH para D4, segunda opinião e reteste independente da VeriCore.
