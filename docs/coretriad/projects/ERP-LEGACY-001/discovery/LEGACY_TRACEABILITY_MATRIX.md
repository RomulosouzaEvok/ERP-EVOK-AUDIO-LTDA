# LEGACY_TRACEABILITY_MATRIX.md — consolidação do passo 29 (ERP-LEGACY-001)

```
PROJECT_ID:  ERP-LEGACY-001
PASSO:       29 — Matriz de rastreabilidade do legado (consolidação dos 6 clusters)
NATUREZA:    Síntese/agregação, pelo coretriad-director (orquestrador), das 6 matrizes
             per-cluster produzidas por trilhas vericore-traceability-auditor read-only.
             NÃO introduz juízo de auditoria novo, severidade nova nem finding: apenas
             agrega, reconcilia e conta o que as 6 trilhas já registraram. Severidade,
             confiança e status permanecem autoridade VeriCore.
CADEIA:      BR → REQ → UC → CÓDIGO(arquivo:linha) → TC(teste)
HEAD real:   7b705f1 (verificado em .git/refs — não de contexto injetado)
```

## 0. As 6 matrizes-fonte (uma por cluster)

Cada cluster tem sua matriz detalhada, linha a linha, em `docs/coretriad/projects/ERP-LEGACY-001/discovery/`:

| Cluster | Arquivo | BR-linhas | Trilha |
|---|---|---|---|
| identidade-acesso | `LEGACY_TRACEABILITY_MATRIX_identidade-acesso.md` | 39 | vericore-traceability-auditor |
| cadastro-suprimentos | `LEGACY_TRACEABILITY_MATRIX_cadastro-suprimentos.md` | 33 (+4 rasos = 37) | idem |
| planejamento-producao | `LEGACY_TRACEABILITY_MATRIX_planejamento-producao.md` | 26 | idem |
| qualidade-estoque | `LEGACY_TRACEABILITY_MATRIX_qualidade-estoque.md` | 13 | idem |
| comercial-financeiro | `LEGACY_TRACEABILITY_MATRIX_comercial-financeiro.md` | 29 (+CNAB = 30) | idem |
| pessoas-governanca | `LEGACY_TRACEABILITY_MATRIX_pessoas-governanca.md` | 22 | idem |
| **Total** | | **≈167 linhas** | |

## 1. Veredito único do passo 29 — a matriz do legado nasce quebrada, e a quebra é na ORIGEM

**Cadeias BR→REQ→UC→CÓDIGO→TC completas e canônicas: 0 de ~167, em todos os 6 clusters.**

A quebra **não é na implementação** — o elo **CÓDIGO é o único íntegro em todo o ERP** (todo comportamento tem arquivo:linha). A quebra é a montante:

- **Elo BR-ID canônico: QUEBRADO em ~167/167.** Nenhuma regra de negócio do ERP tem BR-ID versionado com OWNER e vigência. O que existe são (a) rótulos de gap/decisão (`G1..G18`, `D-C/D-G/D-K/D-I`) gravados em `details.rule` — que identificam *correções*, não *regras* — e (b) os IDs provisórios do passo 26 (`BR-<CLUSTER>-NN`), que **não constam de nenhum artefato versionado**.
- **Elo REQ canônico (RF com AC e ponteiro para TC): QUEBRADO em ~167/167.** `REQUIREMENTS_BASELINE.md §6`: nenhum dos 90 RFs tem OWNER, critério de aceite (AC-) ou aponta um TC-. Módulos inteiros sem um único RF: `items` (PRODUÇÃO REAL, 327 registros), `accounting`, `budget`, `treasury`, `directorate`, `reports`, `webhooks`, `spreadsheetImport`, `intelligentAuditor`.
- **Elo UC:** contaminado por **colisão de ID** (UC-52/53/71 — ver §4) e por **módulos FANTASMA** inteiros (comportamento roteado sem UC no catálogo).

**Ressalva de reconciliação metodológica (Regra 20 — divergência entre as próprias trilhas, registrada, não silenciada):** a trilha `identidade-acesso` contou **"7 de 39 (18%)" cadeias completas**, usando o **BR-ID provisório do passo 26 como âncora**; as outras 5 trilhas contaram **0**, tratando a **ausência de BR-ID canônico versionado** como quebra obrigatória do elo de origem. As duas leituras são verdadeiras sob definições diferentes:
- **Definição estrita** (exige BR-ID canônico versionado): **0 cadeias completas em todos os 6 clusters**, inclusive identidade-acesso.
- **Definição frouxa** (aceita o BR-ID provisório do passo 26 como âncora): identidade-acesso tem 7 cadeias REQ→UC→CÓDIGO→TC íntegras (todas no núcleo de `accessProfiles`/`me-permissions`); os demais clusters continuam com pouquíssimas ou nenhuma.

Esta consolidação adota a **definição estrita** para o placar global (é a que o §20 do Master Spec exige), e preserva o número frouxo de identidade-acesso como nota.

## 2. Placar consolidado por cluster

"Elo íntegro" = elo PRESENTE na esmagadora maioria das linhas. "Cobertura de teste real" = UCs (ou BRs) cujo `describe/it` exercita o comportamento-alvo com asserção (não teste nominal), conforme cada trilha mediu.

| Cluster | BR-linhas | Cadeias completas (estrita) | Único elo íntegro | Cobertura de teste real | Elos mais fracos dominantes |
|---|---|---|---|---|---|
| identidade-acesso | 39 | 0 (7 sob def. frouxa) | CÓDIGO | 13/23 UC (57%) | REQ ghost, UC fantasma (9), TC ausente em `users` |
| cadastro-suprimentos | 37 | 0 | CÓDIGO (36/37) | 20/33 BR (61%) | RFQ sem UC, teste-fantasma (BR-CAD-009), alçada diretor sem teste |
| planejamento-producao | 26 | 0 | CÓDIGO (23/26) | ~17/22 UC (77%) | hub MRP fantasma, CRP sem código, BR-PP-013/016b TC quebrado |
| qualidade-estoque | 13 | 0 | CÓDIGO (13/13) | 13/20 UC (65%) | efeito de estoque sem UC, teste nominal (scan mobile) |
| comercial-financeiro | 30 | 0 | CÓDIGO (27/30) | ~22/26 UC (85%) | accounting/budget/treasury 100% fantasma, CNAB dead route |
| pessoas-governanca | 22 | 0 | CÓDIGO (22/22) | varia | colisão UC-52/53/71 (7 linhas), 5 módulos fantasma |

**Constante universal:** em todos os 6 clusters, o único elo íntegro é o CÓDIGO; a cadeia quebra sempre a montante (BR/REQ) e frequentemente no meio (UC).

## 3. Causas-raiz transversais (repetem-se nos 6 clusters — evidência convergente, não votação)

1. **Ausência de catálogo de BR-ID canônico com OWNER e vigência (raiz nº 1).** Nenhuma regra do ERP é referenciável por ID versionado. É a causa direta de os ~167 elos de origem nascerem quebrados. As 6 trilhas convergem nisto de forma independente.
2. **Ausência de cadeia REQ→AC→TC.** Nenhum dos 90 RFs tem AC ou ponteiro para teste; vários domínios (contábil, tesouraria, diretoria, relatórios) não têm RF algum. O esqueleto que o §19/§20 do Master Spec exige nunca foi instanciado.
3. **Sub-documentação e colisão por UC.** Comportamentos críticos sem UC (hub MRP, RFQ inteiro, scan mobile, contabilidade/tesouraria/orçamento, diretoria, webhooks) + reuso de UC-ID no catálogo (UC-52/53/71). O elo UC nasce fantasma ou ambíguo.
4. **Ausência de documento de estratégia de testes** (`NFR-MAINT-D05`, AUSENTE). Sem critério que force teste ao lado do requisito, o padrão é testar o caminho feliz e deixar descoberto o comportamento de risco (a divergência, a borda de autorização, o achado). Daí a concentração de TC quebrado/nominal justamente nas regras de "quem pode o quê".
5. **Testes provam use case, não a borda de autorização.** Repetido em identidade-acesso, cadastro-suprimentos e pessoas-governanca: a alçada mora no middleware/rota, e os testes exercitam o use case com o middleware mockado ou o ambiente autenticado como admin (curto-circuito ligado). As regras de alçada mais críticas do ERP são as menos provadas.

## 4. Registro de colisões de UC-ID (quebram a Regra 17 — para não sumirem)

O catálogo `docs/projeto/04-USE_CASES.md` **reusa três IDs de UC** para casos de uso distintos. Registrado aqui de forma consolidada para rastreabilidade futura:

| UC-ID | Uso A | Uso B | Clusters afetados |
|---|---|---|---|
| **UC-52** | Facilities (SUBSTITUÍDO, :2216) | UC-52-JUR Contratos jurídicos (:2387) | pessoas-governanca (5 linhas JUR) |
| **UC-53** | Marketing (:2313) | UC-53-JUR Contencioso (:2406) | pessoas-governanca (1 linha MKT) |
| **UC-71** | Roteiro de Produção no doc (:2612) | Afastamentos no código (`rh.ts:121`) | planejamento-producao **e** pessoas-governanca |

O próprio catálogo admite a dívida (`04-USE_CASES.md:2372-2380`). Total de linhas de matriz marcadas AMBÍGUO por essa causa: 7 (todas em pessoas-governanca) + a linha de roteiro em planejamento-producao.

## 5. Correção metodológica material (impacta o passo 30 — ler antes de escrever teste)

A trilha `planejamento-producao` **refutou uma premissa** que os passos 26/28 tinham propagado: `laboratory` e `engineering/ReleaseDrawing` foram marcados "sem teste automatizado" — **falso contra o commit auditado**. A causa é metodológica e vale para todo o ERP:

> **Os testes NÃO são co-locados nos módulos.** Toda a suíte vive em `server/tests/{unit,integration}`. Um Glob restrito a `server/src/modules/**/*.test.ts` retorna **vazio** e produz falsas "LACUNAS". As trilhas do passo 29 que confrontaram a suíte real em `server/tests/` mediram cobertura **maior** do que os passos 26/28 relataram (ex.: planejamento-producao ~17/22 UCs com teste real).

Consequência para o passo 30: o levantamento do que já existe de teste deve varrer `server/tests/`, nunca só a pasta do módulo, sob pena de escrever teste de caracterização redundante ou de declarar lacuna inexistente.

## 6. Candidatos a finding específicos de rastreabilidade (NÃO promovidos — seguem ao passo 31)

Consolidação dos candidatos que **emergiram da ótica de rastreabilidade** (além dos já mapeados nos passos 26/28 e dos findings FIND-ERP-001/002/005-009). Nenhum promovido; CRITICAL/HIGH exigem `vericore-finding-validator`. Cada um tem arquivo:linha nos dois lados na matriz do cluster de origem.

- **[HIGH] Cadeia BR→REQ→UC→AC→TC inexistente em todo o ERP** — ~167 regras sem BR-ID canônico; 90 RFs sem OWNER/AC/TC (todas as 6 trilhas; REQUIREMENTS §6/§8#6). Causa-raiz da própria quebra da matriz.
- **[HIGH] Domínios inteiros sem elo REQ/UC versionado** — accounting/budget/treasury (comercial-financeiro) e directorate/reports/intelligentAuditor/spreadsheetImport/webhooks (pessoas-governanca): código roteado e (em vários casos) bem testado, sem regra nem caso de uso a montante — comportamento com efeito financeiro/decisório não governado.
- **[CRITICAL/CONFIRMED — TC cego] Scan mobile fura quarentena/depósito/lote** (qualidade-estoque, BR-QE-011) — código viola `BUSINESS_RULES §12`; o teste é nominal (só valida entrada), o bypass não é exercitado. = L-1/F-5.
- **[CRITICAL/CONFIRMED — TC inexistente] Desconto não chega à NF-e/AR** (comercial-financeiro, BR-COM-010) — 3 valores para o mesmo negócio; nenhum teste com desconto+emissão existe (o teste de AR evita desconto de propósito). = C-1/F-41.
- **[CRITICAL/CONFIRMED — TC cego] Tributos divergentes** (comercial-financeiro, BR-FIS-001/003) — ICMS interno em 19/27 UFs e IPI 0%×10-15% no NCM 8518 (produto principal); teste cobre só SP, IPI mockado a 0. = C-2/C-3.
- **[HIGH/CONFIRMED — teste-fantasma] Crosswalk item→produto-gêmeo** (cadastro-suprimentos, BR-CAD-009) — invariante central; `CreateItemUseCase` referencia `item-product-mirror.test.ts` que **não existe** em disco; o único teste que o tocaria o mocka. Toda a cadeia RFQ/requisição/COMEX depende dele.
- **[HIGH/CONFIRMED] Alçada `diretor` por PRESENÇA do módulo, não `approve`** (cadastro-suprimentos BR-SUP-008 + pessoas-governanca BR-JUR-D07) — permissão declarada ≠ imposta; sem teste; a suíte de integração roda como admin (curto-circuito). Toca FIND-ERP-005.
- **[HIGH/CONFIRMED] Cobertura que induz falsa confiança** — `approverHasApprove`/`hasApprove()` (pessoas-governanca BR-JUR-D08): 11 testes passam o parâmetro e nunca asseveram efeito; regra que o código ignora aparece "coberta".
- **[HIGH/CONFIRMED] Regras de MRP em coluna única / explosões divergentes** (planejamento-producao BR-PP-013/016b) — lote mínimo e estoque de segurança leem a mesma coluna; MRP e OP explodem sobre tabelas diferentes (UUID×INT) sem teste que confronte.
- **[MEDIUM/CONFIRMED] CNAB dead route** (comercial-financeiro, OBS-COMFIN-01) — 8 endpoints inalcançáveis + docstring/`treasury.ts` afirmando "montado/funcional".
- **[MEDIUM/CONFIRMED] Colisão de UC-ID** (UC-52/53/71) — §4.
- **[MEDIUM/CONFIRMED] Insumos dos passos 26/28 sub-reportaram cobertura de teste** (§5) — Glob restrito à pasta do módulo; recomenda-se rerodar o levantamento de testes contra `server/tests/`.

## 7. O que esta consolidação NÃO afirma

- Não promove finding, não atribui severidade nova, não decide divergência (Regras 2, 20-21). As severidades/confianças citadas em §6 são as que as trilhas VeriCore registraram, apenas transcritas.
- Não reexecutou nada; nenhum teste/script/banco. As 6 trilhas foram read-only reforçado; produção real (`items`, `categories`, `departments`, `auth`, `users`, `auditLogs`) lida só por código-fonte e arquivo de teste.
- Não preencheu elo por inferência: onde as trilhas registraram QUEBRADO/AMBÍGUO/INEXISTENTE, a consolidação preserva o registro.
- A divergência de contagem de "cadeias completas" entre as trilhas (7 × 0) está reconciliada em §1, não silenciada.

## 8. Estado do passo 29 e próxima ação

- **Passo 29 CONCLUÍDO:** 6 matrizes per-cluster + esta consolidação, todas persistidas em `discovery/`.
- **Próximo: passo 30 — testes de caracterização.** Sob trava dura de `APR-2026-016`: banco **efêmero**, **nunca** o real; módulos de produção real sem execução que toque banco. O levantamento do que já existe DEVE varrer `server/tests/` (§5), não a pasta do módulo.
- **PARE incondicional ao fim do passo 30** (skill `coretriad-legacy-discovery`) — o passo 31 (auditoria 360°) e qualquer remediação de finding exigem novo gate humano explícito e registrado.
- **Duas decisões do dono ficam pendentes, não antecipadas pelo director:** (a) como resolver a ausência de BR-ID canônico e de OWNER (criar esquema de BR-ID, atribuir OWNER, ou aceitar a limitação de forma registrada) — é a causa-raiz nº 1 desta matriz; (b) o encaminhamento dos 7 findings formais + candidatos à SanaCore.
