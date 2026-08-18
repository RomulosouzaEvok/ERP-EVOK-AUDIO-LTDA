# Despacho de remediação — `ERP-LEGACY-001-CASE-011`

```
CASE_ID:      ERP-LEGACY-001-CASE-011
FINDING_ID:   FIND-ERP-008 (SST/CAT — incoerência tipo × gravidade, prazo
              sem feriados, fila interna S-2210)
ESCOPO:       Implementação nova sobre código já existente (nenhuma
              worktree criada ainda) — worktree e branch a criar agora
WORKTREE:     C:\Sistema EvokAudio\ERP-Evok-sana-CASE-011
BRANCH:       sana/ERP-LEGACY-001/CASE-011 (a partir de main)
DECISOES:     APR-2026-056 (D1, D2, D3 decididas pelo dono; D4 ABERTA/
              PENDENTE — não bloqueia este despacho, ver seção 2)
DESTINO:      sanacore-remediation-engineer / Codex
```

## 1. Contexto

`TRIAGE.md` deste caso classificou `CASE-011` como `BLOQUEADO POR DECISAO
HUMANA` em 2026-08-17, listando quatro decisões pendentes (D1-D4). O dono
respondeu D1, D2 e D3 em `coretriad/governance/APPROVALS.md`, registro
`APR-2026-056` (2026-08-18) — leia o registro completo lá antes de editar
qualquer arquivo. D4 (owner de SST/RH para validar a regra de prazo) segue
`PENDENTE`, sem nome indicado.

Este despacho libera a implementação porque D1-D3 cobrem tudo que a
triagem apontou como necessário **para o código**: fonte de verdade do
tipo da CAT (D1), tratamento do gap de feriados (D2 — documentar
simplificação, não implementar calendário), e o campo `emitente` textual
(D3 — remover, não persistir). D4 é uma exigência de **validação humana
antes do reteste final** (a mesma pessoa/função deveria revisar se o
prazo simplificado e a regra tipo×gravidade fazem sentido do ponto de
vista técnico de SST/RH) — não uma decisão de desenho de código. Não há
nada em D4 que o Codex precise decidir para escrever a correção; portanto
D4 aberta não bloqueia este despacho, só bloqueia a VeriCore declarar
`RETEST_PASSED` sem essa validação ter acontecido (registrar isso
explicitamente no pacote de evidência, não silenciar).

## 2. Correção 1 (D1) — fonte de verdade do tipo da CAT

**Causa-raiz:** `server/src/modules/sst/application/use-cases/accident/EmitCatUseCase.ts:60`

```ts
const tipo = body.tipo === 'obito' ? 'obito' : 'inicial';
```

O `tipo` da CAT é derivado de `body.tipo` (o que a tela envia), não da
`gravidade` do acidente já registrada (`acidente.gravidade`, calculada em
`calcularPrazoLimiteCat(acidente.data_hora, acidente.gravidade)` na linha
imediatamente seguinte, linha 61 — ou seja, o próprio use case já tem a
gravidade em mãos e a ignora ao decidir `tipo`). A tela (`client/src/pages/sst/AccidentsTab.tsx:307`)
sempre chama `sstApi.emitCat(accident!.id, 'Técnico SST')`, e
`client/src/api/sst.ts:388-393` sempre envia `{ tipo: 'inicial', emitente
}` fixo — então hoje, na prática, uma CAT de acidente com `gravidade ===
'obito'` sempre nasce com `tipo: 'inicial'`, porque a tela nunca envia
`'obito'`. A regra de unicidade em `EmitCatUseCase.ts:54-58` só bloqueia
uma segunda CAT `inicial`; não há checagem cruzada tipo×gravidade em
nenhum ponto do fluxo.

**Correção exigida (D1 — decidida):** o backend passa a ser a única fonte
de verdade: `tipo` deve ser derivado exclusivamente de
`acidente.gravidade` — `'obito'` quando `gravidade === 'obito'`, `'inicial'`
nos demais casos. Qualquer `body.tipo` enviado pela tela deve ser
ignorado para fins de decisão (não deve influenciar o valor gravado); se
o body enviar um `tipo` explicitamente incoerente com a gravidade (ex.:
`body.tipo === 'obito'` para um acidente `gravidade !== 'obito'`, ou
vice-versa), rejeitar com erro de regra de negócio em vez de
silenciosamente sobrescrever — não adivinhar a intenção do operador.
Ajustar `client/src/api/sst.ts` (`emitCat`, linhas 388-393) para não
enviar mais `tipo` fixo no payload (o backend decide), e ajustar/remover o
tipo `CatTipo`/campo `tipo` do request conforme o novo contrato. Ajustar
`docs/business/BLOCO_1_SST_API.md:423-426` (request de exemplo hoje mostra
`{"tipo": "inicial", "emitente": "Técnico SST"}`) para refletir o novo
contrato real.

## 3. Correção 2 (D2) — feriados nacionais: registrar simplificação, ajustar requisito

**Causa-raiz:** `server/src/modules/sst/domain/services/legalDeadlineService.ts:1-21`
já traz um comentário técnico descrevendo a simplificação (implementação
atual considera só sábado/domingo, sem feriados nacionais), mas o
requisito formal ainda promete o comportamento completo:

- `docs/business/BLOCO_1_SST_REQUISITOS.md:160` (RNF-SST-04): *"Cálculo do
  prazo legal da CAT (...) deve considerar calendário de dias úteis e
  feriados nacionais (mínimo); o alerta deve escalonar (...)"*.
- `docs/business/BLOCO_1_SST_API.md:430-432`: *"calcula `prazo_limite`:
  1º dia útil seguinte a `accident.data_hora` (calendário de dias úteis +
  feriados nacionais, RNF-SST-04)"*.

Nenhum dos dois documentos reflete a decisão do dono de manter a
simplificação por ora.

**Correção exigida (D2 — decidida, NÃO é para implementar calendário de
feriados agora):**
- Ajustar `RNF-SST-04` em `docs/business/BLOCO_1_SST_REQUISITOS.md:160`
  para descrever o comportamento real: cálculo considera apenas
  fins de semana; feriados nacionais ficam fora do escopo atual,
  registrados como simplificação decidida (referenciar `APR-2026-056`
  e o finding `FIND-ERP-008`). Não remover a parte do requisito sobre
  escalonamento de alerta (SST → gestor SST) — essa parte não foi tratada
  por D2 e não deve ser silenciosamente descartada; se não houver
  escalonamento implementado, registrar isso separadamente no pacote de
  evidência como lacuna residual, sem inventar solução.
- Ajustar `docs/business/BLOCO_1_SST_API.md:430-432` para não prometer
  mais "calendário de dias úteis + feriados nacionais" — descrever o
  cálculo real (fins de semana apenas) e referenciar a simplificação
  registrada em RNF-SST-04.
- Não tocar em `legalDeadlineService.ts` além de, se necessário, alinhar o
  comentário de topo (linhas 1-15) à redação final do requisito ajustado
  — o comportamento de código já está correto e documentado; o gap é
  apenas entre requisito/API e código.

## 4. Correção 3 (D3) — remover `emitente` textual da tela/API/documentação

**Causa-raiz:**
- `client/src/api/sst.ts:376-394`: interface `Cat` inclui `emitente:
  string` (linha 380); `emitCat(accidentId, emitente)` (linha 388) envia
  `emitente` no body (linha 391); `reopenCat(catId, emitente)` (linha 401)
  também envia `emitente` no body.
- `client/src/pages/sst/AccidentsTab.tsx:306-307`: `emitCatMutation`
  chama `sstApi.emitCat(accident!.id, 'Técnico SST')` — valor de
  `emitente` é uma string fixa hardcoded na tela, nunca um dado real
  digitado por ninguém; linha 379 exibe `emitido por {cat.emitente}` na
  UI, prometendo um dado que nunca é realmente gravado como tal.
- Backend: nem `EmitCatUseCase.ts` nem `ReopenCatUseCase.ts` persistem
  `body.emitente` em lugar algum — o único campo relacionado é
  `emitente_id` (linhas 68 e 48, respectivamente), preenchido com
  `emitenteId` vindo de `(req as any).user.id` no controller
  (`server/src/modules/sst/presentation/controllers/accidentController.ts:71,87`).
  O texto enviado pela tela é descartado silenciosamente pelo backend
  hoje.
- `docs/business/BLOCO_1_SST_API.md:423-428`: documenta `emitente` como
  parte do request e afirma "para fins de documento — não substitui
  `req.user.id`", dando a entender que o texto é de fato aproveitado em
  algum lugar, quando na prática é ignorado.

**Correção exigida (D3 — decidida, NÃO criar campo próprio):**
- Remover `emitente` da interface `Cat`, das assinaturas de `emitCat` e
  `reopenCat`, e do payload enviado em `client/src/api/sst.ts:376-404`.
- Remover a chamada com `'Técnico SST'` fixo e o texto `emitido por
  {cat.emitente}` em `client/src/pages/sst/AccidentsTab.tsx:306-307,379`
  — a autoria legal do sistema passa a ser exclusivamente `emitente_id`
  (já gravado hoje, via login/JWT); se a tela quiser mostrar quem emitiu,
  deve exibir o nome resolvido a partir de `emitente_id` (dado que o
  sistema já tem), não um texto solto.
- Remover `body.emitente` de `EmitCatInput`/`EmitCatUseCase.ts:31` (e do
  tipo equivalente em `ReopenCatUseCase.ts`, se existir) — o backend não
  deve mais aceitar nem ler esse campo.
- Ajustar `docs/business/BLOCO_1_SST_API.md:423-428` removendo a promessa
  de `emitente` textual do contrato — o request de exemplo não deve mais
  incluir `emitente`; documentar que a autoria é `emitente_id` (do login),
  ponto final.

## 5. Testes exigidos

**D1 (tipo derivado de gravidade, não do body):**
- `EmitCatUseCase`: acidente com `gravidade === 'obito'` → CAT criada com
  `tipo === 'obito'` mesmo que `body.tipo` não seja enviado ou seja
  `'inicial'`.
- `EmitCatUseCase`: acidente com `gravidade !== 'obito'` → CAT criada com
  `tipo === 'inicial'` mesmo que `body.tipo === 'obito'` seja enviado
  (deve ignorar/rejeitar, conforme desenho escolhido pelo engenheiro —
  documentar a escolha entre "ignorar silenciosamente o campo" vs
  "rejeitar body incoerente" no pacote de evidência).
- Teste de integração HTTP: `POST /api/sst/accidents/:id/cat` sem `tipo`
  no body, para acidente `obito` → 201 com `tipo: 'obito'` na resposta.
- Atualizar/substituir o teste hoje existente em
  `server/tests/unit/sst-accident.test.ts` que aprova o par incoerente
  `gravidade='obito'` + `body.tipo='inicial'` — esse teste, tal como está,
  formaliza o bug; deve passar a provar o comportamento corrigido.
- Regressão: unicidade de CAT `inicial` continua bloqueando segunda CAT do
  mesmo tipo (comportamento já existente, não deve regredir).

**D2 (requisito ajustado, não código novo):**
- Não é exigido teste automatizado novo de código para D2 (nenhum
  calendário foi implementado). Exigir apenas: diff de
  `BLOCO_1_SST_REQUISITOS.md` e `BLOCO_1_SST_API.md` mostrando a redação
  ajustada, registrada no pacote de evidência com referência a
  `APR-2026-056`.
- Se o teste unitário direto de `calcularPrazoLimiteCat` (pulo de fim de
  semana) ainda não existir de forma isolada (a triagem apontou que "o
  pulo de fim de semana — núcleo da regra — não é testado"), adicionar
  esse teste unitário agora, já que é comportamento real do código atual
  e não depende de D2: acidente numa sexta-feira → prazo cai na
  segunda-feira seguinte (pulando sábado e domingo).

**D3 (remoção de `emitente`):**
- Teste de tipos/build do client: `Cat`, `emitCat`, `reopenCat` não
  referenciam mais `emitente`; `AccidentsTab.tsx` compila sem o campo.
- Teste de integração HTTP: enviar `emitente` no body de
  `POST /api/sst/accidents/:id/cat` não deve mais ter efeito nenhum (o
  backend já ignorava; confirmar que a rejeição/ignorância do campo
  continua e que a resposta não inclui `emitente`).
- Confirmar visualmente (ou via snapshot/teste de render, se a suíte do
  client tiver esse padrão) que a tela não exibe mais "emitido por
  {texto}" — deve mostrar apenas o que o sistema realmente sabe (tipo,
  data, prazo, status) ou o nome resolvido de `emitente_id`, se essa
  melhoria for feita.

## 6. Prompt literal para colar no Codex

```text
Você está atuando como sanacore-remediation-engineer dentro da estrutura CoreTriad deste repositório.

Isto é uma remediação nova sobre FIND-ERP-008 (CASE-011), com decisões do dono já registradas em coretriad/governance/APPROVALS.md, registro APR-2026-056 (D1, D2, D3 decididas; D4 aberta, não bloqueia este trabalho). Leia esse registro por inteiro antes de editar qualquer coisa. Leia também remediation/cases/ERP-LEGACY-001-CASE-011/TRIAGE.md e remediation/cases/ERP-LEGACY-001-CASE-011/CODEX_REMEDIATION_DISPATCH.md (este arquivo) por inteiro antes de começar.

Crie a worktree e branch a partir de main (main NÃO deve ser tocado diretamente):
  worktree: C:\Sistema EvokAudio\ERP-Evok-sana-CASE-011
  branch:   sana/ERP-LEGACY-001/CASE-011

Regras absolutas:
- NÃO conecte em erp_evok_audio (produção), nem para contar linhas.
- Não execute operação destrutiva em banco real. Testes de integração HTTP somente contra erp_evok_audio_test.
- Não toque em audit/, coretriad/ (qualquer subpasta), .claude/, ou docs/ fora dos arquivos explicitamente autorizados abaixo: docs/business/BLOCO_1_SST_REQUISITOS.md e docs/business/BLOCO_1_SST_API.md — apenas os trechos referentes a RNF-SST-04 e ao endpoint POST /api/sst/accidents/:id/cat.
- Não declare FINDING CLOSED nem RETEST_PASSED. Essa autoridade é exclusiva da VeriCore.
- Registre explicitamente no pacote de evidência que D4 (owner de SST/RH para validar a regra de prazo/feriados) segue PENDENTE, e que a validação final deste caso depende dessa indicação — sem bloquear a entrega do código por isso.
- Capture e registre o OUTPUT REAL dos comandos executados (typecheck, testes, build) — não apenas a alegação em texto. Isso já foi ressalva explícita em outro caso deste fluxo (CASE-010) e não deve se repetir.

Leitura obrigatória antes de editar:
1. server/src/modules/sst/application/use-cases/accident/EmitCatUseCase.ts (por inteiro).
2. server/src/modules/sst/application/use-cases/accident/ReopenCatUseCase.ts (por inteiro).
3. server/src/modules/sst/domain/services/legalDeadlineService.ts (por inteiro).
4. server/src/modules/sst/presentation/controllers/accidentController.ts, funções emitCat e reopenCat.
5. client/src/api/sst.ts, seção "Acidente e CAT" (linhas ~292-404).
6. client/src/pages/sst/AccidentsTab.tsx, uso de emitCatMutation/reopenCat e exibição de cat.emitente.
7. server/tests/unit/sst-accident.test.ts (por inteiro) — entender o teste hoje existente que aprova o par incoerente gravidade='obito' + body.tipo='inicial'.
8. docs/business/BLOCO_1_SST_REQUISITOS.md, RNF-SST-04 (linha ~160).
9. docs/business/BLOCO_1_SST_API.md, seção POST /api/sst/accidents/:id/cat (linhas ~423-441).

Implemente as TRÊS correções, cada uma correspondente a uma decisão já tomada pelo dono (APR-2026-056):

CORREÇÃO D1 — fonte de verdade do tipo da CAT (EmitCatUseCase.ts):
Hoje `const tipo = body.tipo === 'obito' ? 'obito' : 'inicial';` deriva o tipo do que a tela envia. Mude para derivar `tipo` exclusivamente de `acidente.gravidade`: 'obito' quando `acidente.gravidade === 'obito'`, 'inicial' nos demais casos. Se o body enviar um `tipo` explicitamente incoerente com a gravidade calculada, rejeite com BusinessRuleError (mesmo padrão de erro já usado no arquivo) em vez de sobrescrever silenciosamente — documente essa escolha no pacote de evidência. Ajuste client/src/api/sst.ts (função emitCat) para não enviar mais `tipo` fixo no payload — o backend decide. Ajuste o tipo/interface correspondente no client. Ajuste o exemplo de request em docs/business/BLOCO_1_SST_API.md (linha ~424-426) para refletir que `tipo` não é mais enviado pelo cliente.

CORREÇÃO D2 — feriados nacionais, registrar simplificação (SEM implementar calendário):
NÃO implemente calendário de feriados. Apenas ajuste a redação de RNF-SST-04 em docs/business/BLOCO_1_SST_REQUISITOS.md (linha ~160) para descrever o comportamento real do código (calcularPrazoLimiteCat considera apenas sábado/domingo; feriados nacionais ficam fora do escopo atual por decisão registrada em APR-2026-056/CASE-011), preservando a parte do requisito sobre escalonamento de alerta (não decidida, não remova). Ajuste também docs/business/BLOCO_1_SST_API.md (linhas ~430-432) removendo a promessa de "feriados nacionais" no cálculo documentado. Adicione um teste unitário direto para calcularPrazoLimiteCat cobrindo o pulo de fim de semana (ex.: acidente numa sexta-feira → prazo cai na segunda-feira seguinte), já que esse é o núcleo real da regra e hoje não tem teste isolado.

CORREÇÃO D3 — remover `emitente` textual (tela, API, documentação):
Remova o campo `emitente` de: interface Cat e assinaturas de emitCat/reopenCat em client/src/api/sst.ts; da chamada em AccidentsTab.tsx (hoje `sstApi.emitCat(accident!.id, 'Técnico SST')` — vira `sstApi.emitCat(accident!.id)` ou equivalente sem o parâmetro) e do texto "emitido por {cat.emitente}" na mesma tela; de EmitCatInput/body no EmitCatUseCase.ts e do equivalente em ReopenCatUseCase.ts, se existir. NÃO crie campo/coluna nova para persistir esse texto. A autoria legal continua sendo exclusivamente emitente_id (já gravado via req.user.id) — se quiser mostrar autoria na tela, deve ser via nome resolvido de emitente_id, não um texto solto. Ajuste docs/business/BLOCO_1_SST_API.md (linhas ~423-428) removendo `emitente` do contrato documentado.

Testes obrigatórios (adicionar/atualizar, sem remover cobertura existente):
- D1: EmitCatUseCase com gravidade='obito' e body sem tipo (ou com tipo='inicial') → CAT sai com tipo='obito'. EmitCatUseCase com gravidade!='obito' e body.tipo='obito' → rejeitado ou ignorado conforme desenho escolhido, documentado. Teste HTTP: POST /api/sst/accidents/:id/cat sem tipo no body, acidente óbito → 201 com tipo 'obito'. Corrigir o teste hoje existente em sst-accident.test.ts que aprova o par incoerente gravidade='obito'+body.tipo='inicial' para provar o comportamento corrigido, não o bug. Não regredir a regra de unicidade de CAT inicial já existente.
- D2: teste unitário direto de calcularPrazoLimiteCat cobrindo pulo de fim de semana (sexta → segunda).
- D3: build/typecheck do client sem referência a `emitente` em Cat/emitCat/reopenCat; teste HTTP confirmando que enviar `emitente` no body não tem efeito nenhum na resposta.

Documente no REMEDIATION_EVIDENCE_PACKAGE.md do caso (crie o arquivo se não existir, em remediation/cases/ERP-LEGACY-001-CASE-011/):
- as três correções, cada uma com arquivo:linha ANTES e DEPOIS;
- a decisão tomada sobre "ignorar vs rejeitar" body.tipo incoerente (D1);
- o diff de RNF-SST-04 e do trecho da API doc ajustados (D2), com nota de que calendário de feriados segue não implementado por decisão do dono;
- a remoção completa de `emitente` do contrato (D3), confirmando que nenhum campo novo foi criado;
- registro explícito de que D4 (owner SST/RH) segue PENDENTE e é pré-requisito da validação final, não do código;
- output REAL (não descrição) de: testes novos/atualizados do módulo sst (server) e do client, typecheck/build de ambos.

Ao terminar:
- Crie/atualize CASE_STATUS.md do caso com STATUS: REMEDIATION_COMPLETE apenas se as três correções estiverem de fato implementadas e comprovadas com output real.
- Commit na branch sana/ERP-LEGACY-001/CASE-011, não em main.
- Nunca escreva FINDING CLOSED nem RETEST_PASSED.
- Pare aguardando revisão/segunda opinião/reteste da VeriCore.
```

## 7. Registro

Este despacho não declara `RETEST_PASSED` nem `FINDING CLOSED` — essa
autoridade é exclusiva da VeriCore. `D4` (owner de SST/RH para validar a
regra de prazo/feriados) permanece registrada como decisão aberta em
`APR-2026-056`; ela é pré-requisito da **validação final antes do
reteste**, não do trabalho de implementação autorizado por este despacho.
Nenhum arquivo em `audit/`, `coretriad/` ou `.claude/` foi alterado na
preparação deste despacho.
