# T-01 — TIER 1 CADASTRO (`items`, `categories`, `departments`)

AUDIT_COMMIT `c1311a6f76b512fef893f7e60d934179cae3409f` (única referência de
leitura; `c9359be` não citado). Regime `APR-2026-016`: nenhum comando, nenhum
teste, nenhuma conexão de banco. 22/22 endpoints, sem amostragem.

> **Nota de persistência.** Produzido pelo `vericore-controller-auditor` (T-01) e
> persistido **sem alteração** pelo orquestrador — Write desabilitada para o
> agente. Nada foi escrito, alterado ou corrigido no objeto auditado (Regra 2).

## 1. Superfície recontada (não copiada do inventário)

12 + 5 + 5 = **22 endpoints**, confere com o plano. Rotas:
`server/src/modules/items/presentation/routes/items.ts:15-27`,
`categories/presentation/routes/categories.ts:12-16`,
`departments/presentation/routes/departments.ts:12-16`. Montagem única em
`server/app.ts:165,168,197`; os roteadores legados citados nos cabeçalhos
(`server/src/routes/*`) **não existem** no AUDIT_COMMIT. 33 arquivos do objeto
lidos integralmente.

Erro metodológico evitado: a suíte foi procurada em `server/tests/{unit,integration,...}`
— existem `categories-use-cases.test.ts`, `departments-use-cases.test.ts`,
`items-use-cases.test.ts`, 2 guardas e 1 regressão RBAC.

## 2. Controles compensatórios encontrados ANTES de classificar

AuthN em 22/22; identidade **server-side** (`middlewares/auth.ts:77-128`; JWT só
`{id, passwordVersion}`, `:17-22`); invalidação por `passwordVersion` (`:99-103`);
rate limit global (`app.ts:148`); `errorHandler` sem stack (`:42,136-139`);
whitelist em todos os caminhos de escrita; transações nos fluxos multi-tabela;
UNIQUE no banco (`00_baseline_frozen.sql:17283,19965`; `ItemSupplier.ts:48`);
catraca de auditoria (`audit-coverage-guard.test.ts:49-63`); guarda de authZ
(`module-authorization-map.test.ts:120-133`); débito registrado em
`docs/governance/RESIDUAIS_ABERTOS_2026-08-10.md:110-124`.

## 3. Findings — 0 CRITICAL, 2 HIGH (PROPOSED), 5 MEDIUM, 3 LOW, 1 INFO

**AUD-T01-01 — HIGH / HIGH_CONFIDENCE / PROPOSED** — `POST /api/items` grava
saldo de estoque sem movimento, sem log e com nível `operate`, e o valor vai para
o saldo operacional. `itemValidators.ts:14-17` aceita
`estoque_atual`/`estoque_reservado`; `CreateItemUseCase.ts:41-44` grava;
`itemProductMirrorService.ts:106` cria o produto gêmeo com
`quantity: item.estoque_atual ?? 0` — e `products.quantity` é o saldo lido pelo
MRP (`SequelizeItemRepository.ts:92`). O caminho de update foi deliberadamente
fechado (`itemValidators.ts:37-53` não aceita saldo;
`itemProductMirrorService.ts:36-38,162-169` ignora saldo), o que evidencia que a
invariante existe e só não é imposta na criação. Sem BR autorizando. Sem teste
cobrindo `CreateItemUseCase`.

**AUD-T01-02 — HIGH / CONFIRMED / PROPOSED** — 12/12 endpoints de escrita do tier
1 cadastro sem trilha de auditoria. Grep `logAction|auditLogService` em
`items|categories|departments`: zero. Busca de controle equivalente: sem hooks
nos models, sem middleware global (`app.ts:35-197`), repositórios com
`Model.create/update` diretos. **Não há compensação.** Registra-se apenas o 403
negado (`auth.ts:231-241`) — audita-se a recusa e não a escrita. Incidente medido
no próprio repositório: 327 itens criados, `audit_logs` com 2 linhas
(`audit-coverage-guard.test.ts:5-12`). **Dedup declarada: não é FIND-ERP-002** —
aquele é imutabilidade da tabela (UPDATE/DELETE), este é INSERT que nunca nasce.

**AUD-T01-03 — MEDIUM / CONFIRMED** — `categories`/`departments` fora da matriz
de Perfis de Acesso: escrita governada por `authorize(role)`
(`categories.ts:14-16`, `departments.ts:14-16`, `auth.ts:151-165`). Qualquer
`operator` cria/edita categorias que classificam os 327 itens reais,
independentemente do perfil. 4 dos 22 endpoints (os GETs) só exigem
`authenticate`. Exclusão declarada em `module-authorization-map.test.ts:23-27,120-133`
e comportamento congelado por `legacy-routes-rbac-regression.test.ts:45-56`.

**AUD-T01-04 — MEDIUM / HIGH_CONFIDENCE** — sem validação na borda em
`categories`/`departments`: (a) estouro de `varchar(10)`/`varchar(100)`
(`00_baseline_frozen.sql:4790-4792,10357`) vira `SequelizeDatabaseError` → **HTTP
500** (`errorHandler.ts:99-111`); (b) `sigla` é NOT NULL no banco e opcional no
use case (`CreateDepartmentUseCase.ts:35-39`), com o teste unitário mascarando por
mock (`departments-use-cases.test.ts:18-28`); (c) `manager_id` sem verificação de
existência (`UpdateDepartmentUseCase.ts:46`); (d) `active` sem tipo, permitindo
reativar registro inativado como edição comum. O padrão correto existe no mesmo
tier (`itemValidators.ts`).

**AUD-T01-05 — MEDIUM / MEDIUM_CONFIDENCE** — parâmetros de rota não validados em
7 dos 12 endpoints de `items`: `req.params.id` cru e `Number(req.params.linkId)`
→ `NaN` (`itemController.ts:88,138,155,171,189,206,220`), com `id` sendo `uuid`
(`Item.ts:49-53`) → cast inválido → 500 em erro de cliente. Confiança MEDIUM
porque o mapeamento do erro do driver é inferido do `errorHandler`, não observado.

**AUD-T01-06 — LOW / HIGH_CONFIDENCE** — dupla sanitização de busca:
`itemController.ts:40` e `SequelizeItemRepository.ts:17-23` chamam
`Validators.sanitizeSearch` (`utils/validators.ts:163-166`), e a segunda passagem
escapa a barra da primeira — busca por `%`/`_` retorna resultado errado, em
silêncio. Correlato para T-17/T-16: `Op.like` é sensível a caixa no Postgres.

**AUD-T01-07 — LOW / CONFIRMED** — 409×422: `DeactivateItemUseCase.ts:69-73`
lança `ConflictError` (409, `errors/index.ts:53-56`) enquanto o docblock do
próprio arquivo (`:39-40`) e o controller (`itemController.ts:132-133`) afirmam
422 `BUSINESS_RULE_VIOLATION`; a classe 422 existe e é usada pelo módulo irmão.
Mesma **classe** do FIND-ERP-007, **outro achado**.

**AUD-T01-08 — MEDIUM / HIGH_CONFIDENCE** — inativar item não inativa o produto
gêmeo: `DeactivateItemUseCase.ts:75` grava sem transação e sem espelhamento, ao
contrário de `UpdateItemUseCase.ts:54-63` + `itemProductMirrorService.ts:168`.
Item INATIVO permanece comprável/produzível/vendável via `product_id`. Dois
caminhos para o mesmo estado com resultados diferentes. **Handoff a T-05.**

**AUD-T01-09 — LOW / CONFIRMED** — API de `departments` não expõe
`directorate_id` nem `cost_center_id` (`UpdateDepartmentUseCase.ts:39-46`,
`CreateDepartmentUseCase.ts:34,39`), embora o seed oficial os preencha
(`config/seeds.ts:76-93,172-175`) e `cost_center_id` alimente conta a pagar
(`Department.ts:8-14`). Organograma (SSOT) só mantido por seed/SQL.
**Verificação colateral negativa:** `directorate_id` não está na tabela congelada
porque vem de migration pós-congelamento (`20260811-000043`, `20260812-000046`)
— **sem drift model×schema**.

**AUD-T01-10 — INFO / CONFIRMED** — `POST /api/items/:id/estrutura` sempre falha
por desenho (`CreateItemStructureUseCase.ts:79-92`), sem marcação de
descontinuação no contrato (`items.ts:18`). **Hipótese própria refutada e
registrada:** a suspeita de que `GET /:id/estrutura/explode` lia a árvore morta
`item_estruturas` é **FALSA** — o repositório foi reapontado para a projeção da
BOM ativa (`SequelizeItemEstruturaRepository.ts:1-6,40-58`).

**AUD-T01-11 — LOW / HIGH_CONFIDENCE** — unicidade de `items.codigo` sensível a
caixa (UNIQUE simples sem `lower()`/`citext`,
`00_baseline_frozen.sql:17283,19965`; comparação exata em
`SequelizeItemRepository.ts:41-43`): `ABC-001` e `abc-001` coexistem, cada um
gerando produto gêmeo pelo crosswalk textual. Resolve o ponto UNKNOWN de
BR-CAD-008 quanto ao **fato**; a **intenção** segue sem regra escrita.

## 4. Resultados negativos verificados (resultado é resultado)

- **Mass assignment: AUSENTE nos 12 endpoints de escrita.** Mesmo onde o
  controller repassa `req.body` inteiro (`departmentController.ts:44`,
  `categoryController.ts:56`), a whitelist existe por destructuring explícito ou
  schema `.strict()`. Nenhum `create(req.body)` chega ao repositório. Ressalva:
  em `categories`/`departments` a whitelist mora no use case, não na borda.
- **Regra 24 do `CLAUDE.md`: NÃO violada em 22/22.** Nenhum
  `role`/`isAdmin`/`perfil` vindo de body, query, header ou token. Determinação
  própria da VeriCore, **não** adotada da conclusão SanaCore.
- **Vazamento de stack/detalhe interno: ausente.** Ressalva para T-18: fora de
  `NODE_ENV=production`, mensagens de validação/unicidade incluem nomes de coluna
  (`errorHandler.ts:62-81`).
- **Regra de negócio no controller: ausente nos 22.** Disciplina de camada
  CONFORME (evidência para T-19).

## 5. Cobertura efetiva (matriz executada de T-01)

**E — 22/22** em: D1 (authN/authZ + Regra 24), D2 (contrato/validação), D4
(transacional/idempotência), D5 (correspondência model×tabela dos 4 models), D6
(audit log), D7 (existência de teste), D10 (camadas).

**Profundidade dirigida, não exaustiva — divergência declarada com o planejado
(que previa E em 10/10):** D3 (validei 3 BRs que tocam os módulos; as 164 são de
T-14), D8 (divergências internas apenas; varredura documental é T-23), D9
(injeção/escape/erro/segredos nos arquivos lidos; varredura transversal é T-18).
Declarar E nessas três seria a promessa vazia do SIM-002. **Nenhuma célula em
branco; nenhum endpoint sem verificação.**

Lacuna nominal de D7: sem teste para `CreateItemUseCase`, `DeactivateItemUseCase`,
os 4 endpoints de fornecedor e o histórico de compras; efetividade limitada por
mock em `departments-use-cases.test.ts:18-28`.

## 6. Pedidos DYN (G4 APROVADO — `erp_evok_audio_test`, nenhum toca `erp_evok_audio`)

- **DYN-T01-01** (AUD-T01-01/02): `POST /api/items` com `estoque_atual: 9999` por
  perfil `produtos:operate`; ler `products.quantity`, contar
  `inventory_movements` e `audit_logs`.
- **DYN-T01-02** (AUD-T01-03): `operator` sem perfil de acesso →
  `POST /api/categories` e `PUT /api/departments/:id`.
- **DYN-T01-03** (AUD-T01-04/05): `code` de 30 chars; POST sem `sigla`;
  `PATCH /api/items/nao-e-uuid`; `PUT /api/items/<uuid>/suppliers/abc`.
- **DYN-T01-04** (AUD-T01-11): criar `ABC-001` e `abc-001`.
- **DYN-T01-05** (AUD-T01-08): inativar item e ler `products.status` do gêmeo.

## 7. Divergências com os insumos de discovery

22 endpoints **CONFIRMADO**. BR-IAM-031 **CONFIRMADA como fato e AMPLIADA** a
`categories`/`departments`. BR-CAD-008 **ponto UNKNOWN resolvido quanto ao
fato**. BR-CAD-009 **CONFIRMADA**, com efeito colateral não catalogado
(AUD-T01-01). Cabeçalhos de `categories.ts:7-10` e `departments.ts:6-10` citam
roteadores legados **inexistentes** — documentação obsoleta (T-23). **3 lacunas
de BR entregues a T-14** (autorização de cadastro auxiliar; carga de saldo
inicial; propagação de inativação).

## 8. Handoffs

T-05: AUD-T01-01 (efeito no mirror) e AUD-T01-08. T-04: AUD-T01-03 + os 4 GETs
sem authZ. T-03: AUD-T01-02 + lista `DEBITO_CONHECIDO`. T-17: AUD-T01-07,
AUD-T01-10, `DELETE /api/items/:id` respondendo 200 com corpo. T-13: `Op.like`
sensível a caixa; confirmação de ausência de drift. T-18: mensagens de erro com
nome de coluna fora de produção. T-14: 3 lacunas de BR. T-25: os 2 HIGH em
`PROPOSED`.

## 9. Limitações

Evidência 100% estática; D3/D8/D9 dirigidas por titularidade de outras trilhas;
**nenhum dado real foi lido** (falo do código e do schema declarado, não do
estado dos dados); "0 CRITICAL" é afirmação sobre a superfície estática, não
sobre execução; nada corrigido, nada fechado, nenhum OWNER atribuído.

## 10. ESFORÇO MEDIDO × ESTIMADO (obrigação de G11 opção (c))

| Métrica | Valor |
|---|---|
| **Sessões consumidas** | **1 S** |
| **Estimativa do plano** | **4 S** |
| **Razão** | **0,25×** |
| Chamadas de ferramenta | 27 |
| Arquivos do objeto lidos integralmente | 33 |
| Endpoints auditados | 22/22 (100%) |
| Findings | 11 (0 CRITICAL, 2 HIGH, 5 MEDIUM, 3 LOW, 1 INFO) |
| Pedidos DYN | 5 |

**Leitura honesta, para o dono não extrapolar:** a estimativa foi conservadora
por ~4× **na parte estática de uma superfície pequena e enumerável**. A medida
**não** autoriza extrapolação linear: (1) T-09 audita 95 endpoints e T-12 audita
132 em D3+D4 exaustivos, e o custo cresce com a **densidade de regra de
negócio**, não com o número de arquivos — cadastro mestre é o caso mais favorável
do plano; (2) a medida **exclui** a validação da Regra 22 dos 2 HIGH (T-25); (3)
**exclui** a execução dos 5 DYN; (4) T-04 e T-03 são uma ordem de grandeza
maiores. **Recomendação técnica (não é decisão — Regra 6):** recalibrar 110→144
só com W1 completa, com 5 medidas de naturezas diferentes em vez de 1.
