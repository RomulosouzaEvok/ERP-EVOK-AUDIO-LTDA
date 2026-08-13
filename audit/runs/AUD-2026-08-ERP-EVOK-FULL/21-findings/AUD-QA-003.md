FINDING_ID: AUD-QA-003

TITLE: Hipótese de causa raiz do orquestrador ("fila serial por ordem alfabética") é REFUTADA na forma como foi enunciada; mecanismo real provável é diferente e não foi confirmado nesta sessão
DOMAIN: Qualidade / QA
SUBDOMAIN: Test infra / Jest sequencing

SEVERITY: MEDIUM
CONFIDENCE: CONFIRMED (refutação do mecanismo alfabético) / LOW_CONFIDENCE (mecanismo alternativo proposto)

DESCRIPTION:
A hipótese do orquestrador é: Jest roda arquivos em ordem alfabética dentro
de `--runInBand`, e como `traceability-and-audit-log-regression.test.ts`
viria antes de `rbac-directorate-access-denied.test.ts` e
`rbac-maintenance-service-orders-access-denied.test.ts` alfabeticamente, a
query lenta (a) teria "segurado a fila" e feito os testes seguintes
estourarem seus próprios timeouts de 5000ms.

Isso é FALSO em dois pontos, confirmados por leitura direta do código-fonte
do Jest instalado no projeto:

1. Jest não ordena arquivos alfabeticamente por padrão. O sequenciador
   padrão (`@jest/test-sequencer`, `server/node_modules/@jest/test-sequencer/build/index.js`,
   método `sort()`, linhas 178-222) ordena por: (a) testes que falharam na
   rodada anterior primeiro, depois (b) duração registrada em cache (maior
   duração primeiro), e só na ausência de cache de timing, (c) por TAMANHO
   DE ARQUIVO em bytes (maior primeiro) — nunca por nome de arquivo.
   `--runInBand` afeta apenas o número de workers (1), não o algoritmo de
   ordenação.
2. Mesmo se fosse alfabético, a ordem seria a OPOSTA da hipótese.
   "rbac-directorate-..." e "rbac-maintenance-..." começam com "r", que
   vem ANTES de "traceability-..." (começa com "t") na ordenação
   alfabética ASCII. Ou seja, mesmo sob a suposição (incorreta) de ordenação
   alfabética, os testes de RBAC rodariam ANTES do teste de rastreabilidade,
   não depois — o mecanismo proposto não poderia produzir o efeito
   observado nem na sua própria premissa.

Isso NÃO significa que os 3 timeouts sejam eventos independentes sem
relação nenhuma — apenas que a explicação mecanicista específica proposta
("fila FIFO alfabética") está errada. Um mecanismo alternativo mais plausível,
não confirmado nesta sessão por falta de ferramenta de execução/instrumentação,
é: quando um teste estoura o timeout de 5000ms do Jest, a promise em
andamento (a chamada HTTP ainda aguardando resposta do servidor real, que
por sua vez aguarda a query fan-out de ~12.6s no Postgres) NÃO é cancelada —
Jest apenas marca o teste como falho e segue para o próximo, mas o
Express/Sequelize do processo servidor (subprocesso `dist/index.js`, ver
`server/scripts/run-api-suite.cjs` linhas 554-558) continua executando a
query original em segundo plano, consumindo uma conexão do pool do
Sequelize do SERVIDOR e ciclos de CPU/IO do mesmo Postgres compartilhado
pelos testes seguintes (que abrem uma SEGUNDA conexão direta via
`require('../../src/models/index')`, linha 47/48 de ambos os arquivos
rbac-*). Sob essa hipótese, a proximidade TEMPORAL (não a ordem alfabética
de arquivo) entre o timeout do item lento e os timeouts de RBAC na mesma
"rodada" é coincidência de janela de execução, não de ordem de arquivo.

EXPECTED_BEHAVIOR:
Um achado que atribui causa raiz a um mecanismo específico do Jest deveria
ter essa alegação verificada contra o código-fonte real do sequenciador
antes de ser aceita, não apenas assumida por familiaridade genérica com
"Jest roda em ordem alfabética" (crença comum, mas incorreta para o
sequenciador padrão sem cache de timing).

ACTUAL_BEHAVIOR:
A hipótese foi proposta sem essa verificação; nesta auditoria a verificação
foi feita e o mecanismo específico é refutado.

EVIDENCE:
FILE: server/node_modules/@jest/test-sequencer/build/index.js
LINES: 178-222 (método sort(), comentário explícito nas linhas 183-191: "sorted based on... how long it took to run... if that information is not available they are sorted based on file size")
FILE: server/jest.config.cjs
LINES: 1-12 (nenhum testSequencer customizado — usa o padrão do Jest)
FILE: server/tests/integration/traceability-and-audit-log-regression.test.ts (nome de arquivo começa com "t")
FILE: server/tests/integration/rbac-directorate-access-denied.test.ts (nome de arquivo começa com "r")
FILE: server/tests/integration/rbac-maintenance-service-orders-access-denied.test.ts (nome de arquivo começa com "r")

RELATED_REQUIREMENT: N/A
RELATED_BUSINESS_RULE: N/A
RELATED_USE_CASE: N/A
RELATED_TEST: Os 3 arquivos citados acima

BUSINESS_IMPACT: Nenhum direto — é um achado sobre o processo de investigação, não sobre o produto.
TECHNICAL_IMPACT: Se a causa raiz errada for "corrigida" (ex.: renomear arquivos para forçar outra ordem alfabética), o sintoma real (contenção de recurso por query não-cancelada) permanece e pode reaparecer de forma imprevisível em qualquer combinação futura de arquivos, já que a ordem real depende de tamanho de arquivo/cache de timing, não de nome.
SECURITY_IMPACT: Nenhum.

REPRODUCTION:
Ler server/node_modules/@jest/test-sequencer/build/index.js linhas 178-222; comparar ordem alfabética "r" < "t".

REFERENCE: Documentação/código-fonte do pacote @jest/test-sequencer

RECOMMENDATION: (1) Não aceitar a causa raiz "fila alfabética" como fechada; (2) para confirmar ou refutar a hipótese alternativa (contenção de conexão/CPU por query não-cancelada vazando para os testes seguintes), instrumentar com log de duração de query no lado do servidor (`dist/index.js` sob teste) e correlacionar timestamps de início/fim da query fan-out (AUD-QA-002) com os timestamps de falha dos testes RBAC na mesma execução — isso exige ferramenta de shell/execução, que esta sessão de auditoria não teve. (3) Independentemente da causa exata, corrigir AUD-QA-002 (a query fan-out) tende a eliminar o sintoma por completo, então a investigação fina da causa dos timeouts RBAC pode ser adiada até a correção de AUD-QA-002 ser retestada.

SUGGESTED_OWNER: qa-engineer (instrumentação/confirmação) + backend-engineer (correção de AUD-QA-002 primeiro)

RETEST_REQUIRED: Yes
