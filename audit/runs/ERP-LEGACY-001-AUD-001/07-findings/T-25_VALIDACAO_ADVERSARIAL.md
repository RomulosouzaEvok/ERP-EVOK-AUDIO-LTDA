# T-25 — VALIDAÇÃO DE FINDINGS · ERP-LEGACY-001-AUD-001

> **Nota de persistência.** Produzido pelo `vericore-finding-validator` (T-25 validacao adversarial dos findings) e persistido
> **sem alteração de conteúdo** pelo orquestrador — o agente é read-only por
> desenho e não pode escrever em `audit/`. O juízo de auditoria é
> integralmente da trilha. Única transformação aplicada: promoção do
> cabeçalho a H1 e desescape de entidades HTML.

---

**AUDIT_COMMIT:** `c1311a6f76b512fef893f7e60d934179cae3409f` · Regime `APR-2026-016` (read-only, nenhuma conexão de banco, nenhuma execução) · Nenhum arquivo do objeto auditado ou de `07-findings/` foi alterado — este texto é o entregável integral.

---

## BLOCO DE ESCALONAMENTO IMEDIATO — CRITICAL CONFIRMADOS (para humano, antes de qualquer outra leitura)

Os 4 CRITICAL do universo conhecido foram submetidos a tentativa ativa de refutação. **Nenhum foi refutado. Os 4 são CONFIRMED.**

1. **`AUD-AUTHN-01`** (T-02) — chave de assinatura JWT com default público versionado (`docker-compose.yml:54` = `dev-only-change-me-please-change-me-123456789`), guarda `superRefine` desligada fora de `NODE_ENV=production` (`server/src/config/runtimeEnv.ts:73`). Tentei refutar com `docker-compose.prod.yml` (que exige `JWT_SECRET` sem default, `:?` obrigatório) — **refutação falha**: esse arquivo está expressamente marcado `STATUS: nao exercitado ainda` porque o servidor de produção ainda não foi adquirido (linhas 1-4); a instância que hoje hospeda dado real roda sob `docker-compose.yml`, o arquivo com o default inseguro. Token forjado com qualquer `id` recebe autorização administrativa legítima do banco, em todos os endpoints.

2. **`AUD-INTEG-03`** (T-06) — `POST /api/mobile-inventory/scan` e `/batch` chamam `InventoryService.adjust` com 6 dos 8 argumentos, omitindo `warehouseId`/`itemId` (`ScanItemUseCase.ts:67-74`, `BatchScanUseCase.ts:72-79`); violam a invariante que o próprio código declara obrigatória (`warehouseStockService.ts:9-17`) e furam a quarentena (valida contra `product.quantity` bruto, nunca lê `LotControl`). Busquei controle compensatório (job de reconciliação produto×depósito, restrição a depósito único) — **nenhum existe** no repositório. Corrupção de dado persistente, não transitória.

3. **`T08-F01`** (T-08) — toda NF-e de saída sai com IPI 0%/CST 53 fixo (`TaxCalculationService.ts:122-124`), e mesmo se calculado **não chegaria** ao provedor (`FocusNfeProvider.ts:76-97`/`ENotasProvider.ts:67-79` não têm campo IPI). Tentei refutar com o fato de que `INTEGRATION_INVENTORY.md:41-43` declara NF-e em **NÃO-PRODUÇÃO hoje** (depende de `clients`/`products` reais, ambos em 0) — **refutação falha como atenuante de severidade**: G3 veda atenuar por baixa probabilidade/ausência de volume corrente em integridade fiscal; o defeito é do `AUDIT_COMMIT`, não do volume operacional atual. Registro o fato como contexto de urgência (não é incêndio desta semana), não como redução de severidade.

4. **`T24-F01`** (T-24) — ausência de credencial do provedor de NF-e (`FOCUS_NFE_TOKEN`/`ENOTAS_*`) lança exceção síncrona no construtor **fora** do `try/catch` que protege `provider.issue(...)` (`IssueSaleNfeUseCase.ts:295-297`), depois de a reserva de numeração já ter sido commitada (`:187-189,253,266-276`). Venda fica presa em `nfe_status='processing'` para sempre; não há endpoint de reset. Busquei rota de correção manual via API — **nenhuma existe**; a única saída é intervenção direta no banco. Mesma ressalva de contexto operacional do item 3 (NÃO-PRODUÇÃO hoje) aplicada, mesma conclusão: não atenua.

**Nenhum destes 4 está sendo fechado, aprovado ou declarado `AUDIT_PASSED`/`FINDINGS_CONFIRMED` por mim. O veredito é recomendação de confirmação; a decisão formal e a remediação são de outras autoridades.**

---

## TABELA DE VEREDITO

| ID | Trilha | Veredito | Fundamento | Arquivo:linha |
|---|---|---|---|---|
| `AUD-AUTHN-01` | T-02 | **CONFIRMED** | Ver bloco acima; addendo do orquestrador (§10) apenas confirma que a mitigação é local, não versionada, e desconhecida na 2ª máquina do dono | `docker-compose.yml:54,43`; `runtimeEnv.ts:73` |
| `AUD-INTEG-01` | T-06 | **CONFIRMED** | Cadeia de 4 elos fechada: campos validados na borda, descartados na chamada posicional, `reference_id` sempre `null` — agrava `FIND-ERP-001` porque UNIQUE sobre `(reference_type,reference_id)` seria inócuo (`NULL` não colide) | `CreateInventoryMovementUseCase.ts:107-116`; `inventoryService.ts:356-368` |
| `AUD-INTEG-02` | T-06 | **CONFIRMED** | `adjust` grava `type:'adjustment'` hardcoded independente da direção real; contraste com `consume`/`receive`/transferência, que gravam o tipo certo | `inventoryService.ts:327-368` |
| `AUD-INTEG-03` | T-06 | **CONFIRMED** | Ver bloco acima | `ScanItemUseCase.ts:67-74`; `warehouseStockService.ts:9-17` |
| `AUD-INTEG-04` | T-06 | **CONFIRMED** | Interleaving demonstrado passo a passo: `submit` sem transação/lock/escrita condicional permite duplo ajuste de estoque via reaprovação | `SubmitInventoryCountUseCase.ts:29-46`; contraste com `ApproveInventoryCountUseCase.ts:107-115` |
| `T08-F01` | T-08 | **CONFIRMED** | Ver bloco acima; `item.ncm` recebido e nunca lido | `TaxCalculationService.ts:119-124` |
| `T08-F06` | T-08 | **CONFIRMED** | Zero ocorrências de `discount`/`desconto` em `server/src/modules/fiscal/`; base de ICMS/PIS/COFINS calculada sobre valor bruto | `IssueSaleNfeUseCase.ts:213-214,224` |
| `T24-F01` | T-24 | **CONFIRMED** | Ver bloco acima | `IssueSaleNfeUseCase.ts:106-118,187-189,253,266-276,295-297` |
| `T24-F02` | T-24 | **CONFIRMED** | Zero timeout/retry/circuit breaker (`AbortController`/`signal:` = 0 em `server/src`; nenhuma lib de retry no `package.json`); falha de rede mapeada para `'denied'`, indistinguível de rejeição fiscal real; reemissão manual gera 2ª NF-e real se a 1ª tiver sido processada do lado do provedor | `FocusNfeProvider.ts:100-129`; `IssueSaleNfeUseCase.ts:113-118,296-347` |
| `T16-F01` | T-16 | **CONFIRMED** | Cadeia de 7 elos, sem controle compensatório (nenhum `assertApproverIsNotRequester` equivalente ao de `ApproveImportProcessUseCase`/`ApprovePurchaseUseCase`); tentei localizar controle adicional em `AccessProfileExecutionServiceAdapter`/`ApproveAccessRequestUseCase` — nenhum existe | `CreateAccessRequestUseCase.ts:39`; `approverEligibilityService.ts:26-37`; `ApproveAccessRequestUseCase.ts:29-41`; `AssignAccessProfileUseCase.ts:50-81` |
| `T18-F01` | T-18 | **CONFIRMED** | Fechado ponta a ponta por T-18-A (item 3 da tabela de 21 call sites): `input.id` sobrescrito usado para localizar e atualizar; `logAction` cita o id literal da rota | `contractController.ts:211`; `TerminateContractUseCase.ts:43-47` |
| `T18A-F10` | T-18-A | **CONFIRMED** | Bypass de `authorizeSelfOrModule`: checagem de posse resolve só `req.params.id`; a mutação roda sobre `id` do corpo sem recheque — requerente fecha/avalia chamado de terceiro, sem `logAction` | `ticketController.ts:200`; `ConfirmTicketUseCase.ts:27,34`; gate em `ti.ts:49` |
| `AUD-SEC-T04-01` | T-04 | **CONFIRMED quanto ao fato; recomendo elevação MEDIUM→HIGH** | Ver arbitragem de divergência 2 abaixo | `purchases.ts:48`; `importProcessController.ts:56` |
| `FIND-ERP-007` item 3 (409×422) | T-12 × T-17 | **CONFIRMED como requisito ambíguo, não defeito de código** — disposição procedimental da APR-2026-020 B.3 **não integralmente verificada** | Ver confronto T-12×T-17×APR-2026-020 abaixo | `BLOCO_6_RH_API.md:542` × `:594`; `CreateTerminationProcessUseCase.ts:62-65` |
| `BR-JUR-003`/`RF-JUR-003` (T-14 × T-15) | T-14 × T-15 | **Ambos CONFIRMED em seus próprios termos; colisão de ID é achado de governança novo, não resolvido por mim** | Ver arbitragem de divergência 1 abaixo | `juridico/domain/constants.ts:23,26,38-47`; `ApproveContractUseCase.ts:62,68,81,87`; `CreateContractAddendumUseCase.ts:37,40` |

---

## ARBITRAGEM 1 — T-14 × T-15: colisão `BR-JUR-003` / `RF-JUR-003`

**Estado real do código, verificado por leitura própria dos dois arquivos citados:**
- `juridico/domain/constants.ts:23,26,38-47` implementa corretamente a regra de alçada de contrato (thresholds 50.000/300.000) — **este arquivo não contém a string `BR-JUR-003` em nenhum ponto**; seu cabeçalho e sua função se identificam como `RF-JUR-003`.
- `ApproveContractUseCase.ts:62,68,81,87` **emite `RF-JUR-003`** em runtime para a regra de alçada.
- `CreateContractAddendumUseCase.ts:37,40` **emite `BR-JUR-003`** em runtime, para uma regra **diferente** (aditivo exige `new_value`/`new_end_date`).

**Veredito de mérito técnico:** T-14 está certo sobre o fato que mediu — a regra de alçada existe e confere contra `constants.ts` — e T-15 está certo sobre o fato que mediu — o namespace `BR-JUR-003` já tem outro dono vivo em runtime, disjunto do que o `BR_CATALOG.md` anexou a esse ID. **Isto não é um empate de credibilidade — é a mesma classe de defeito que este validador existe para não deixar passar por diante sem nome:** a ficha `BR-JUR-003` do catálogo confirma corretamente a lógica de negócio da alçada, mas **sob um identificador que colide com outra regra viva e citada em produção**. T-14 não podia detectar isso porque seu método (varredura confinada ao próprio `BR_CATALOG.md`) não tinha como enxergar fora do arquivo; a afirmação do catálogo "nenhuma colisão encontrada" (`BR_CATALOG.md:400`) é verdadeira como asserção sobre o arquivo e **falsa como asserção sobre o namespace `BR-<ÁREA>-<NNN>`** — que é o que ela se propõe a significar.

**Consequência para o `BR_CATALOG.md` como artefato de governança:** a ficha de `BR-JUR-003` deve ser marcada com um flag de ambiguidade de ID (não revertida quanto ao mérito da regra de alçada, que continua confirmada), até que a fonte autoritativa decida o esquema canônico. **Isso toca `APR-2026-019`/`ESC-T15-03`/`ESC-T15-05` — a resolução do esquema canônico de numeração é decisão do dono, não minha.** Recomendo ao consolidador: (a) manter `BR-JUR-003` (ficha do catálogo) como `CONFIRMADA` quanto à regra de alçada, com anotação obrigatória do conflito de ID; (b) abrir um item de governança — não um finding de código — para o dono decidir se `RF-JUR-003` (código) deve ser recanonizado como o BR-ID real da alçada, liberando `BR-JUR-003` exclusivamente para a regra do aditivo, que é quem hoje o emite de fato. Nenhuma das duas trilhas cede; eu também não decido — apenas encaminho com o estado do código estabelecido sem ambiguidade.

---

## ARBITRAGEM 2 — T-16 × T-04: premissa mitigante de `AUD-SEC-T04-01`

**Cadeia de T16-F01, verificada por leitura própria, sem controle compensatório localizado:**
`department_id` livre no corpo (`accessRequestValidators.ts:21-22`) sobrepõe o departamento real do funcionário (`CreateAccessRequestUseCase.ts:39`) → `approverEligibilityService.ts:26-37` resolve o aprovador elegível a partir desse mesmo `department_id` manipulado → `ApproveAccessRequestUseCase.ts:29-41` não compara `requested_by` com `approverUserId` (sem segregação de funções) → `ExecuteAccessRequestUseCase`/`AccessProfileExecutionServiceAdapter.ts:54-56` chama o **mesmo** `AssignAccessProfileUseCase` que a rota administrativa protege (`users.ts:20`, `authorize('admin')`), e esse use case **não faz nenhuma verificação de autorização própria** (`AssignAccessProfileUseCase.ts:50-81`) — confia inteiramente na borda de TI (`ti:operate`).

**Contra-tentativa de refutação:** procurei um segundo gate equivalente ao `assertApproverIsNotRequester` (usado em `ApprovePurchaseUseCase.ts:86-92` e em `ApproveImportProcessUseCase.ts:82-88`, regra `D-K-COMEX`) em qualquer ponto da cadeia de TI. **Não existe.** T-18-A, ao rastrear `accessRequestController.ts:122` (checklist) por outro motivo, confirma que esse ponto específico não abre coluna de papel/aprovação adicional — mas não toca a cadeia de aprovação/execução em si, que é onde o defeito vive. Não há, portanto, controle compensatório.

**Arbitragem sobre a premissa de T-04:** a premissa (3) de T-04 — "CRUD de perfis é exclusivo de `admin`" — é verdadeira quanto a **criar/editar** perfis, mas **falsa quanto ao ato que efetivamente concede o perfil a um usuário** (a atribuição), que é o ato que produz o dano de negócio. Isso não invalida a premissa (2) de T-04 (nenhum `AccessProfile` de fábrica tem `diretor`) — o risco continua condicionado a um perfil `diretor` existir e a um `ti:operate` ser gestor de departamento, ou a `ti:approve`. Mas remove o apoio de "é preciso um ato de admin" que T-04 usou para justificar MEDIUM.

**Veredito:** **recomendo elevar `AUD-SEC-T04-01` de MEDIUM para HIGH.** Não recomendo CRITICAL: o vetor exige um ator já autenticado com uma permissão elevada específica e pré-existente (não é um anônimo, nem um default de fábrica, nem uma falha de Regra 24 — T-16 confirma isso explicitamente), e não há prova de que perfil `diretor:operate` exista hoje em operação (T-04 §8.2 já registrou essa mesma condicionalidade). A elevação é minha recomendação; a decisão final de severidade cabe ao diretor com T-04, T-09 e T-16 na mesa, como ambas as trilhas já pediram.

---

## CONFRONTO T-12 × T-17 × `APR-2026-020` Decisão B item 3 (`FIND-ERP-007`)

**Convergência técnica, não divergência.** T-12 e T-17 chegaram, por métodos disjuntos, à mesma conclusão sobre o item 3: `docs/business/BLOCO_6_RH_API.md` exige **422** na linha 542 para "`decision='rescindir'` mas já existe `TerminationProcess` aberto" e exige **409** na linha 594 para a **mesma condição de negócio** no endpoint irmão (`POST /termination-processes`); o código só implementa o caminho de 409 (`CreateTerminationProcessUseCase.ts:62-65` → `ConflictError` → `errors/index.ts:53-56`); nenhum teste arbitra. T-17 acrescenta que **não existe, em lugar nenhum do repositório, uma regra de contrato que discipline quando usar 409 vs 422** (73 `ConflictError` × 326 `BusinessRuleError`, sem norma escrita), e que a mesma classe de ambiguidade reincide em `AUD-T01-07`.

**Verifico e confirmo:** o item 3 é **requisito ambíguo do próprio documento de contrato**, não defeito de mapeamento do código contra um requisito único e correto. As quatro âncoras de cada trilha conferem no `AUDIT_COMMIT`.

**O que a `APR-2026-020` Decisão B item 3 exigia, e o que não encontrei evidência de ter ocorrido:** a decisão exigia que o retorno ao autor de origem (`vericore-business-rule-auditor`, autor do `FIND-ERP-007`) corresse **em paralelo** à determinação independente de T-12/T-17 — não que fosse substituído por ela. Busquei em todo `07-findings/` e nos artefatos de plano por evidência de que esse retorno de fato ocorreu (um relatório do `vericore-business-rule-auditor` respondendo à determinação de T-12/T-17, ou registro equivalente). **Não encontrei.** T-12 e T-17 são explícitos e coerentes entre si em **não** substituir esse retorno ("não substitui o retorno ao autor de origem, que corre em paralelo" — T-12 §3; T-12 e T-17 concordam que a disposição final do finding é ato de T-25) — mas nenhuma das duas o executou, porque não é seu mandato, e não localizei quem o executou.

**Veredito final sobre o item 3:**
1. **Mérito técnico: CONFIRMADO** — requisito ambíguo, não bug de implementação. As duas determinações independentes (T-12, T-17) são consistentes, bem ancoradas e não se contradizem.
2. **Cumprimento procedimental da `APR-2026-020` B.3: NÃO VERIFICADO.** A perna "determinação independente" foi cumprida, em dobro. A perna "retorno paralelo ao autor de origem" **não tem evidência de execução** nos artefatos disponíveis a este validador. **Escalono ao diretor:** confirmar se esse retorno ocorreu por canal não documentado em `07-findings/`; se não ocorreu, a Decisão B item 3 permanece parcialmente pendente, independentemente do mérito técnico já estabelecido.
3. **Eu não movo `FIND-ERP-007` de `NEEDS_MORE_EVIDENCE`** — isso segue sendo ato do `vericore-software-audit-director`/`vericore-audit-consolidator`, e a pendência do item 2 acima deve ser resolvida antes dessa decisão.

---

## HIGH elevado por esta análise

- **`AUD-SEC-T04-01`** (T-04, originalmente MEDIUM): recomendo **HIGH**, pela arbitragem 2 acima. Nenhum outro HIGH foi elevado a CRITICAL por mim — considerei a hipótese para a cadeia composta `T16-F01 + AUD-SEC-T04-01` (TI operador/gestor → autoconcessão de `diretor` → aprovação de alçada de diretoria em compras/importação), mas não elevo a CRITICAL: o vetor exige duas condições já-privilegiadas (permissão `ti` específica, mais um perfil `diretor` efetivamente existente em operação, que T-04 não confirma existir), diferente dos 4 CRITICAL do bloco acima, que não dependem de nenhuma pré-condição administrativa interna equivalente. Registro a hipótese para que o diretor decida com dado adicional (existência real de perfis `diretor:operate`).

---

## O que NÃO recebeu profundidade nesta passada (nominal, honesto)

Dada a priorização instruída (fiscal/financeiro, autorização/segregação, suporte a `CASE-001`/`CASE-002`) e o orçamento de 4 S, as seguintes trilhas **não foram lidas nesta rodada** e seus HIGH permanecem sem tentativa de refutação própria por T-25: **T-01, T-03, T-05, T-07 (além do que foi citado via T-08/T-17), T-09, T-10, T-11, T-13, T-19, T-20, T-21, T-22, T-23**. Isso inclui, por exemplo, os HIGH de T-09/T-10 sobre `FIND-ERP-005`/desconto comercial que T-04/T-08 apenas referenciam lateralmente. Recomendo uma segunda rodada de T-25 dedicada a esse conjunto antes de qualquer consolidação que dependa deles.

**Pedidos de evidência dinâmica que sustentariam ou aprofundariam vereditos acima, não executados por mim (regime read-only):** `DYN-T02-01` (JWT forjado), `DYN-06.1`/`DYN-06.2` (scan mobile fura quarentena, sem exigir banco no primeiro caso), `DYN-T08-04` (mock em produção), `DYN-T24-01` (credencial ausente corrompe estado), `DYN-T16-03`/`DYN-04.1` (cadeia TI→diretor→aprovação, pedida em sequência por ambas as trilhas), `DYN-T18A-01` (bypass de `authorizeSelfOrModule`), `DYN-12.4` (409×422 do item 3).

---

## Declaração de encerramento

Nenhum finding foi corrigido, refatorado ou alterado (Regra 2). Nenhuma escrita ocorreu em `src/`, `product/`, `tests/`, `requirements/`, `architecture/` ou em `audit/`. **Este relatório não declara `AUDIT_PASSED`, `FINDINGS_CONFIRMED`, `RETEST_PASSED` nem `FINDING CLOSED`** — essas declarações são exclusivas de VeriCore em ato formal posterior (Regras 3-4 do `CLAUDE.md`) e da decisão humana do dono. As recomendações de veredito acima (`CONFIRMED`/elevação de severidade) seguem para o `vericore-audit-consolidator`; apenas os `CONFIRMED` devem prosseguir à SanaCore (Regra 22).

**Arquivos-chave lidos nesta trilha (caminhos absolutos, além dos citados inline):**
`c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\{T-00_REANCHORING_REPORT,T-02_TIER1_IDENTIDADE_REPORT,T-04_TRANSVERSAL_AUTHZ,T-06_ESTOQUE_IDEMPOTENCIA,T-08_FISCAL,T-12_PESSOAS_COMPLIANCE,T-14_REGRAS_DE_NEGOCIO,T-15_REQUISITOS_UC_RASTREABILIDADE,T-15_ADENDO_FECHAMENTO_RES-T15-01,T-16_TIER3_BACKEND,T-17_CONTRATO_DE_API,T-18_APPSEC_SEGREDOS_DEPENDENCIAS,T-18A_MASS_ASSIGNMENT_FECHAMENTO,T-24_INTEGRACOES_RESILIENCIA}.md` · `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docker-compose.prod.yml` · `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\coretriad\projects\ERP-LEGACY-001\discovery\INTEGRATION_INVENTORY.md` · `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\02-plan\AUDIT_PLAN.md` (trechos) · `AUDIT_PLAN_EMENDA_02.md` (trechos).
