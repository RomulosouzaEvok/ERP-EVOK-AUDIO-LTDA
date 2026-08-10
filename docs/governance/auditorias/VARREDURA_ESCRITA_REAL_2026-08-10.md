# Varredura de escrita real — um `POST` de verdade por endpoint de criação

**Data:** 2026-08-10 · **Escopo:** 237 endpoints `POST` reais + varredura estática de schema
**Bancos:** `erp_evok_audio` (dev, dado real do dono — **somente leitura**) e `erp_evok_audio_test` (escrita, descartável)
**Origem:** item 3 do plano em [`CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`](CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md)
**Regra observada:** nenhuma migration aplicada; nenhum dado do dono alterado; nenhuma correção feita (inventário apenas)

---

## 0. Resumo executivo

A varredura substitui a amostragem das quatro rodadas anteriores. Resultado em uma frase:

> **O sistema não está "quase pronto com alguns bugs". Quatro models centrais —
> `Supplier`, `Purchase`, `LotControl`, `ProductionOrderReservation` — não
> conseguem sequer executar um `SELECT` contra o banco do dono hoje, e 146 das
> 195 tabelas nunca receberam uma linha.**

| Frente | O que foi feito | Achados |
|---|---|---|
| (a) Dinâmica | `POST` real contra 237 endpoints, PostgreSQL real | 8 verdes · **6 quebrados (500)** · 223 não cobertos |
| (b) Estática — variante 2 | Todo literal de `ENUM` × `pg_enum` | **46 call sites** com literal inválido (37 distintos) |
| (b) Estática — variante 3 | Todo nome de coluna × `information_schema` | **8 atributos de model sem coluna** + **1 gravação silenciosamente descartada** |
| Sinal indireto | Contagem real de linhas por tabela | **146 de 195 tabelas com 0 linhas** |

**Entregue junto:** dois testes-guarda permanentes que falham hoje —
`server/tests/integration/enum-literal-guard.test.ts` e
`server/tests/integration/column-name-drift-guard.test.ts`.

---

## 1. Achado P0 — quatro models estão ilegíveis no banco do dono

**Gravidade: `[CRITICO]`**

### Evidência

Probe somente-leitura contra `erp_evok_audio` (o banco do dono), usando os
models compilados do working tree:

```
BANCO: erp_evok_audio (SOMENTE LEITURA)
  FALHA Supplier.findOne()                  -> column "is_foreign" does not exist
  FALHA Purchase.findOne()                  -> column "origin" does not exist
  FALHA LotControl.findOne()                -> column "release_inspection_id" does not exist
  FALHA ProductionOrderReservation.findOne()-> column "sale_id" does not exist
  OK    Sale / Product / Client / Item / ProductionOrder / Asset / ServiceOrder / NonConformity
```

E duas tabelas inteiras não existem: `purchase_order_approvals`,
`import_process_approvals`.

### Causa raiz

Esta é a **variante 3 na sua forma barulhenta**. Quando um model declara um
atributo cuja coluna não existe, o Sequelize inclui a coluna no `SELECT` e o
Postgres rejeita **a consulta inteira**. O model não fica "parcialmente
quebrado" — ele fica **totalmente ilegível**: `findByPk`, `findAll`, `create`,
`update`, tudo vira `500`.

Os 8 atributos órfãos e a migration pendente que cria cada um:

| Model → coluna ausente | Migration pendente |
|---|---|
| `Supplier.is_foreign` → `suppliers.is_foreign` | `20260810-000029-purchase-approval-authority-g11` |
| `Purchase.origin` → `purchase_orders.origin` | `20260810-000029` |
| `PurchaseOrderApproval` → tabela `purchase_order_approvals` | `20260810-000029` |
| `ProductionOrderReservation.sale_id` | `20260810-000030-generalize-stock-reservations-for-sales-g9` |
| `ImportProcessApproval` → tabela `import_process_approvals` | `20260810-000031-comex-directorate-approval-gate` |
| `LotControl.release_inspection_id` / `.released_by` / `.released_at` | `20260810-000032-create-quality-inspections-g7` |

### Classificação honesta

**Isto é falha por migration pendente, não defeito de código.** Foi exatamente
o que a tarefa pediu para distinguir. Mas a consequência operacional é severa e
precisa ser dita sem eufemismo:

> Enquanto as migrations `000029`–`000032` não forem aplicadas, **Suprimentos
> (fornecedores + pedidos de compra), rastreabilidade de lote e reserva de
> estoque por OP estão 100% fora do ar** no banco do dono. Não é degradação: é
> `500` em toda leitura.

O working tree está **adiantado** em relação ao banco. As duas metades só voltam
a ser coerentes depois que o dono liberar as migrations.

### Correção recomendada (não aplicada)

Aplicar `000029`, `000030`, `000031`, `000032` e `000033` na ordem, e rodar
imediatamente depois os três guards de integração. **Nenhuma outra correção
deve ser tentada antes disso** — qualquer diagnóstico feito com o banco neste
estado é ruído.

---

## 2. Achado P0 — 28 (na verdade 37) ações nunca gravam log de auditoria

**Gravidade: `[CRITICO]`** · Variante 2 (literal de `ENUM`)

### Evidência

```
enum_audit_logs_action = create | update | delete | soft_delete | login | logout |
                         password_change | status_change | approve | reject |
                         price_change | salary_change | export | import | print   (15 valores)
```

O código chama `logAction` com **37 literais que não existem no tipo**, em
**46 call sites**. A auditoria anterior estimou 28; a varredura completa achou 37:

```
access_denied, acknowledge, activate, assign, award, cancel, close, confirm,
convert, convert_to_production_order, convert_to_requisition, deactivate,
decision, fulfill, inactivate, invite_suppliers, mrp_auto_convert_to_requisition,
obsolete, post, read, read_sensitive, receive, register_quote, register_tracking,
release, resolve, reverse, review, revise, revoke, settle, terminate,
update_shifts, update_status, update_steps, upsert, verify_identity
```

**Prova no dado real** — o que de fato existe em `audit_logs` no banco do dono:

```
login=111, create=85, status_change=42, update=27, approve=20
```

Cinco valores. Os outros dez válidos nunca apareceram, e nenhum dos 37 inválidos
jamais entrou.

### Por que é silencioso

`server/src/services/auditLogService.ts` é fire-and-forget por desenho: faz
retry, grava em `logs/audit-failures.log` e **nunca propaga o erro ao chamador**.
A API responde `200`. O usuário vê sucesso. A trilha de auditoria não existe.

`tsc` não pega porque `src/models/AuditLog.ts:20` declara `action: string`.

### Impacto na fábrica

Perda de trilha de auditoria em operações de alto valor probatório: aprovação de
RFQ (`award`), conversão MRP→requisição, liberação/obsolescência de engenharia,
baixa de operação de tesouraria (`settle`), acesso a dado sensível de licença
(`read_sensitive`), **e negativa de acesso (`access_denied`) — ou seja, tentativas
de acesso indevido não deixam rastro**. Este último é também um achado de
segurança, registrado aqui por ser encontrado no meio da varredura.

### Correção recomendada (não aplicada)

Decidir entre as duas saídas, **não misturar**:

- **(A) Ampliar o `ENUM`** com os 37 valores, via migration. Preserva a semântica
  rica de cada ação. Custo: o `ENUM` vira lista longa e cresce a cada módulo novo.
- **(B) Mapear as 37 para os 15 existentes** (ex.: `award`/`settle`/`convert` →
  `status_change`; `read`/`read_sensitive` → novo valor `read`). Mantém o tipo
  enxuto; perde granularidade.

Recomendação: **(A) para as ações de valor probatório** (`access_denied`,
`read_sensitive`, `award`, `settle`, `reverse`) e **(B) para o resto**. Em ambos
os casos, trocar `action: string` por um union type em `AuditLog.ts` para que o
`tsc` passe a cobrir esta classe daqui em diante.

---

## 3. Achado P1 — toda RNC fechada fica sem data de fechamento

**Gravidade: `[ALTO]`** · Variante 3 (silenciosa)

### Evidência

`server/src/modules/nonConformities/application/use-cases/UpdateNonConformityUseCase.ts:70`

```ts
updateData.closed_at = new Date();
```

As colunas reais de `non_conformities` são **`closed_date`** e `closed_by`.
Não existe `closed_at`.

O Sequelize **descarta a chave em silêncio** — o `UPDATE` sai sem ela, a API
responde `200`, e o campo nunca é preenchido.

### Impacto

ISO 9001 §8.7 e §10.2 exigem data de encerramento da não-conformidade. O ERP
declara a RNC fechada e não registra quando. Sem `closed_date` não há como medir
tempo de tratamento nem provar tempestividade em auditoria.

> Observação: hoje as 6 RNCs do banco estão todas `status='open'`, então nenhuma
> perda já ocorreu. O defeito só se materializa no primeiro fechamento — o que
> torna a correção urgente **antes** do Go-Live, não depois.

### Correção recomendada (não aplicada)

```ts
// UpdateNonConformityUseCase.ts:70
updateData.closed_date = new Date();
```

Conferir também se `closed_by` está sendo preenchido no mesmo ponto (deve vir do
JWT, nunca do body — mesmo padrão anti-spoofing da remediação 3.1).

---

## 4. Achado P1 — `assets` e `service_orders` são `500` no banco do dono

**Gravidade: `[ALTO]`** · Variante 1 (coluna `NOT NULL` que o código nunca preenche)

### Evidência

`POST /api/assets` e `POST /api/service-orders` retornaram `500`. Reprodução no
nível do model, dentro de transação revertida:

```
Asset.create({tag, name, ...})        -> null value in column "description" of relation "assets" violates not-null constraint
ServiceOrder.create({order_number,...}) -> null value in column "product_id" of relation "service_orders" violates not-null constraint
```

`CreateAssetUseCase` trata `description` como opcional (`description?: string`)
e o model declara `allowNull: true` — **mas o banco exige**. `service_orders` tem
**16 colunas `NOT NULL` sem default** contra apenas 5 declaradas obrigatórias no
model.

Confirmação de que nunca funcionou: `assets` e `service_orders` têm **0 linhas**.

### Classificação honesta

**Falha por migration pendente.** `20260810-000033-fix-nullable-columns-round-3`
(59 colunas em `assets`, `employees`, `maintenance_orders`, `service_orders`,
`departments`) corrige exatamente isto. O commit `92cf555`, que a documentação
dá como tendo fechado este caso, criou a migration mas ela **ainda não foi
aplicada**.

O guard existente `schema-model-drift-guard.test.ts` **já detecta** e está
**vermelho hoje** (2 de 2 testes falhando, 19 contradições de FK `SET NULL` sobre
coluna `NOT NULL`). A rede está armada e funcionando — falta aplicar a correção.

---

## 5. Achado P2 — `assets.asset_type` aceita qualquer string e vira `500`

**Gravidade: `[MEDIO]`**

`CreateAssetUseCase` declara `asset_type?: string` sem validação. A coluna é
`enum_assets_asset_type` (`machine|equipment|tool|furniture|vehicle|it|other|license`).
Qualquer valor fora da lista produz `500` em vez de `400`.

Não é "endpoint morto" — é contrato de erro errado. Vazamento de erro de
infraestrutura para o cliente onde deveria haver validação de entrada.

**Correção recomendada:** `body('asset_type').optional().isIn([...])` no validador
da rota, alinhado ao `ENUM`.

---

## 6. Frente (a) — tabela de endpoints

237 endpoints `POST` enumerados **do próprio Express em execução** (`app._router.stack`),
não por parsing — a lista é exata.

| Prefixo | Total | Verde | Quebrado (500) | Não coberto |
|---|---|---|---|---|
| `/access-profiles` | 1 | 0 | 0 | 1 |
| `/accounting` | 2 | 0 | 0 | 2 |
| `/assets` | 2 | 0 | **1** | 1 |
| `/auth` | 5 | 1 | 0 | 4 |
| `/budget` | 1 | 0 | 0 | 1 |
| `/categories` | 1 | 0 | 0 | 1 |
| `/clients` | 1 | 0 | 0 | 1 |
| `/comex/import-processes` | 5 | 0 | 0 | 5 |
| `/departments` | 1 | **1** | 0 | 0 |
| `/employees` | 1 | 0 | 0 | 1 |
| `/engineering` | 5 | 0 | 0 | 5 |
| `/facilities` | 32 | 0 | 0 | 32 |
| `/finance` | 6 | **1** | 0 | 5 |
| `/inventory` | 5 | **1** | **1** | 3 |
| `/inventory-counts` | 6 | 0 | 0 | 6 |
| `/items` | 3 | **1** | 0 | 2 |
| `/jur` | 33 | 0 | 0 | 33 |
| `/laboratory` | 1 | 0 | 0 | 1 |
| `/maintenance` | 1 | 0 | 0 | 1 |
| `/marketing` | 13 | 0 | 0 | 13 |
| `/mobile-inventory` | 2 | 0 | 0 | 2 |
| `/mrp` | 3 | 0 | 0 | 3 |
| `/production-orders` | 4 | 0 | 0 | 4 |
| `/production/downtimes` | 1 | 0 | 0 | 1 |
| `/production/routes` | 2 | 0 | 0 | 2 |
| `/products` | 3 | 0 | 0 | 3 |
| `/purchase-requisitions` | 2 | 0 | 0 | 2 |
| `/purchases` | 4 | 0 | **1** | 3 |
| `/quality/inspections` | 1 | 0 | 0 | 1 |
| `/quality/non-conformities` | 1 | **1** | 0 | 0 |
| `/rfqs` | 4 | 0 | 0 | 4 |
| `/rh` | 14 | 0 | 0 | 14 |
| `/sales` | 4 | 0 | 0 | 4 |
| `/service-orders` | 1 | 0 | **1** | 0 |
| `/sst` | 33 | 0 | **2** | 31 |
| `/suppliers` | 1 | 0 | 0 | 1 |
| `/ti` | 25 | 0 | 0 | 25 |
| `/treasury` | 2 | 0 | 0 | 2 |
| `/users` | 2 | **1** | 0 | 1 |
| `/webhooks` | 2 | 0 | 0 | 2 |
| `/work-centers` | 1 | **1** | 0 | 0 |
| **TOTAL** | **237** | **8** | **6** | **223** |

Distribuição de status: `201`×6, `200`×2, `400`×167, `404`×52, `422`×3,
`500`×6, `503`×1.

### Os 6 quebrados

| Endpoint | Causa exata (Postgres) | Classificação |
|---|---|---|
| `POST /api/assets/` | `null value in column "description"` | migration `000033` pendente |
| `POST /api/service-orders/` | `null value in column "product_id"` | migration `000033` pendente |
| `POST /api/purchases/:id/approve` | `column "origin" does not exist` | migration `000029` pendente |
| `POST /api/inventory/lots/:id/release` | `column "release_inspection_id" does not exist` | migration `000032` pendente |
| `POST /api/sst/accidents/:id/cat` | erro em `SstAcidente.findByPk` | **a investigar** (não reproduziu isolado) |
| `POST /api/sst/epi-deliveries/:id/confirm` | erro em `SstEntregaEpi.findByPk` | **a investigar** (não reproduziu isolado) |

> Os dois de SST não reproduziram quando o model foi consultado isoladamente
> (`findByPk` respondeu OK). A falha está no caminho do use case — provavelmente
> num `include` de associação. **Não foi investigado a fundo e permanece aberto.**

### Os 223 "não cobertos" — e por quê

Este é um **resultado válido, não um sucesso**, conforme pedido na tarefa.

- **167 × `400` + 3 × `422`** — o payload foi sintetizado a partir do **schema
  físico** (colunas `NOT NULL` da tabela adivinhada pelo prefixo da rota). O
  contrato real da API é outro: os validadores `express-validator` exigem nomes
  e formatos diferentes dos nomes de coluna. **A requisição foi barrada antes de
  chegar ao banco** — logo, nada se pode afirmar sobre o `INSERT` desses
  endpoints.
- **52 × `404`** — rotas com `:id` foram exercitadas com `id=1`, e o registro-pai
  não existe (consequência direta das 146 tabelas vazias). Sem dado-pai, o
  endpoint não é alcançável.
- **1 × `503`** — `POST /api/webhooks/focus-nfe`, provedor externo não configurado.

**Limitação honesta desta varredura:** ela prova o que quebra, não prova o que
funciona. Os 8 verdes são os únicos endpoints de criação com **escrita real
comprovada**. Para os 223, o veredito é *desconhecido* — e "desconhecido" não é
"ok". Fechar essa lacuna exige payloads derivados dos **validadores** (ou dos
testes de contrato), não do schema; está registrado como próximo passo em §9.

---

## 7. Sinal indireto: 146 de 195 tabelas com 0 linhas

Aplicando a regra prática do documento de causa raiz — *"tabela vazia num sistema
desenvolvido há meses é prova de que aquele caminho nunca executou com sucesso"*
— a contagem real (`COUNT(*)`, não a estimativa de `pg_stat_user_tables`) mostra
**146 tabelas zeradas**.

Módulos inteiros sem uma única linha:

| Módulo | Tabelas vazias |
|---|---|
| SST | 40 (`sst_*` — EPI, ASO, CIPA, PGR, acidentes, CAT, eSocial) |
| Jurídico | 20 (`jur_*` — contratos, LGPD, processos, PI) |
| RH | 18 (`hr_*` — admissão, férias, folha, treinamentos) |
| TI | 9 (`it_*` — chamados, licenças, acessos) |
| Facilities | 14 (`facility_*` — frota, limpeza, visitas) |
| Marketing | 6 (`marketing_*`) |
| Schema-fantasma PT-BR | 12 (`usuarios`, `fornecedores`, `lotes`, `ordens_producao`, …) — já marcadas `DEPRECATED` |
| Diversos | `assets`, `employees`, `service_orders`, `maintenance_orders`, `rfqs`, `production_routes`, `production_downtimes`, `cost_centers`, `treasury_*`, `budget_lines`, `sale_invoices`, `serial_numbers`, … |

Cruzando com a tabela de endpoints: `/sst` (33 endpoints), `/jur` (33), `/ti` (25),
`/rh` (14), `/facilities` (32) e `/marketing` (13) somam **150 endpoints de
criação — 63% do total — sem nenhuma escrita comprovada**.

Isso não significa que estejam quebrados. Significa que **nunca foram exercitados
contra o banco**, e a documentação os declara prontos com base em typecheck +
teste unitário com repositório dublê — exatamente o critério de aceite que o
documento de causa raiz identificou como inválido (§6, item 5).

---

## 8. Testes-guarda permanentes entregues

Ambos seguem o espírito de `schema-model-drift-guard.test.ts` (que cobre a
variante 1): rodam via `npm run test:integration` → `scripts/run-api-suite.cjs`,
que define `RUN_INTEGRATION=true` e roda `assert-jest-no-skips.cjs` — portanto
**não podem pular em silêncio**.

### `server/tests/integration/enum-literal-guard.test.ts` — variante 2

| Teste | Estado hoje |
|---|---|
| nenhum model declara valor de `ENUM` que o banco rejeita | ✅ passa |
| todo literal em `logAction`/`AuditLog.register` existe em `enum_audit_logs_action` | ❌ **falha — 46 offenders** |
| nenhum literal de `ENUM` está fora de todos os tipos do banco | ✅ passa |

O terceiro teste usa união por nome de coluna (determinístico) e uma allowlist de
**13 entradas revisadas e justificadas** (DTOs de fronteira: health check,
provedor de NF-e, validador de CPF/CNPJ, timeline de rastreabilidade, colunas
`VARCHAR` homônimas de `ENUM` de outra tabela). Uma entrada é explicitamente
temporária e diz qual migration a remove.

### `server/tests/integration/column-name-drift-guard.test.ts` — variante 3

| Teste | Estado hoje |
|---|---|
| todo atributo de model corresponde a coluna física existente | ❌ **falha — 8 atributos + 2 tabelas** |
| todo model responde a uma leitura real sem erro do Postgres | ❌ **falha — 6 models** |
| nenhum payload de escrita usa chave que não é atributo do model | ❌ **falha — 1: o `closed_at`** |

O terceiro é o que fecha a lacuna que nenhuma rede anterior via. Ele extrai as
chaves de primeiro nível de objetos que **de fato chegam** a
`.create()`/`.update()`/`bulkCreate()` e de variáveis de payload
(`*Data`/`*Payload`/`*Values`), com balanceamento de chaves e respeito a strings,
restrito a `application/use-cases` e `infrastructure/sequelize`.

Precisão medida: **1 offender, 0 falsos positivos** — e esse offender é
exatamente o defeito conhecido. Duas iterações foram necessárias para chegar
lá; a primeira acusou `supplier_item_code` em `AwardRfqUseCase.ts:333`, que se
revelou falso positivo (a Clean Architecture esconde o model atrás de
`itemSupplierRepository`, e o casamento por nome exato não o encontrava). O
casamento passou a aceitar também a forma camelCase usada como prefixo de
identificador.

O segundo teste (`findOne` em todos os models) é a prova de execução mais barata
e mais forte do repositório: cobre `defaultScope`, `include` e tipos customizados,
que a comparação de metadados não alcança.

---

## 9. Próximos passos, em ordem

1. **Aplicar as 5 migrations pendentes** (`000029`→`000033`) e rodar os três
   guards. Bloqueia todo o resto: com o banco neste estado, qualquer outro
   diagnóstico é ruído. *(Bloqueado por liberação do dono.)*
2. **Decidir o destino dos 37 literais de `action`** (§2) e tipar `AuditLog.action`
   como union type, para o `tsc` passar a cobrir a classe.
3. **Corrigir `closed_at` → `closed_date`** (§3) — uma linha, antes do primeiro
   fechamento de RNC.
4. **Investigar os 2 `500` de SST** (§6) — únicos quebrados ainda sem causa raiz.
5. **Segunda passada da varredura dinâmica com payloads derivados dos
   validadores**, para converter os 223 "não cobertos" em verde/quebrado. É o que
   transforma esta varredura em gate de Go-Live de fato.
6. **Validar `asset_type`** na entrada (§5).

---

## 10. Riscos residuais

- **A varredura dinâmica cobriu 8 de 237 endpoints com escrita comprovada (3,4%).**
  Os 6 quebrados são certos; os 223 não cobertos são **desconhecidos**. Este
  relatório não autoriza afirmar que qualquer um deles funciona.
- **O guard de nome de coluna é sintático.** Ele pega chave literal em objeto
  literal. Não pega chave montada dinamicamente (`obj[key] = v`, spread de DTO
  vindo do controller). A cobertura real dessa variante continua dependendo de
  escrita real.
- **O guard de `ENUM` amplo usa união por nome de coluna.** Um literal válido
  para a tabela X mas usado ao escrever na tabela Y **não é detectado**. O caso
  concreto de maior valor (`audit_logs.action`) tem teste dedicado; os demais
  dependem da frente dinâmica.
- **Os dois bancos continuam divergentes.** `erp_evok_audio_test` tem **66 colunas
  `NOT NULL` a mais** que `erp_evok_audio`, em 10 tabelas (`clients`, `sales`,
  `sale_items`, `accounts_receivable`, `purchase_orders`, `inventory_counts`,
  `inventory_count_items`, `inventory_movements`, `non_conformities`,
  `bill_of_material_items`) — resíduo da migration `000028`, aplicada em dev e
  não em teste. **Com as mesmas migrations, os dois bancos não são iguais.**
  Enquanto o baseline não for congelado (plano de 4 passos em
  `docs/database/DATABASE.md`), o servidor de produção sairá um terceiro banco,
  diferente dos dois. Esta divergência foi caracterizada coluna a coluna e usada
  para separar defeito real de artefato — nenhum achado deste relatório depende
  dela.
- **Módulos em edição concorrente** (`server/src/modules/production/` e
  `server/src/modules/quality/`) foram lidos mas **não editados**, conforme
  instrução. Achados que os tocam estão registrados, não corrigidos.

---

## 11. Segurança e integridade da execução

| Restrição | Como foi cumprida |
|---|---|
| Não alterar dado do dono | Toda escrita foi em `erp_evok_audio_test`. Conferência final: **195 tabelas de `erp_evok_audio` com contagem idêntica antes e depois**. |
| Sem `TRUNCATE`/`DROP`/`DELETE` sem `WHERE` | Apenas `DELETE ... WHERE ... LIKE '%SWEEP0810%'` e `WHERE email='sweep-admin@evok.local'`, em transação, no banco de teste. |
| Não aplicar migrations | O harness de varredura **não chama** `migration:up` (ao contrário de `run-api-suite.cjs`). `SequelizeMeta` inalterada: dev 151, teste 150. |
| Não deixar usuário fraco | `sweep-admin@evok.local` (banco de teste) **removido**; verificado `count = 0`. |
| Não adivinhar a senha do admin | JWT emitido diretamente com `JWT_SECRET`, como faz `run-api-suite.cjs`. O admin real nunca foi tocado. |
| Guard de banco de produção | O harness recusa rodar se `DB_NAME` não terminar em `_test`/`_ci`. |

Artefatos de trabalho em `server/tmp/sweep/` (diretório versionado como ignorado):
`dynamic-results-full.json`, `routes-post.json`, `findings.json`, `meta-dev.json`,
`meta-test.json`, `rowcounts.json`.

---

## Referências

- [`CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`](CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md) — causa raiz; esta varredura é o item 3 do plano
- `server/tests/integration/schema-model-drift-guard.test.ts` — guard da variante 1 (**vermelho hoje**)
- `server/tests/integration/enum-literal-guard.test.ts` — guard da variante 2 (**novo**)
- `server/tests/integration/column-name-drift-guard.test.ts` — guard da variante 3 (**novo**)
- `docs/database/DATABASE.md` — plano de 4 passos do baseline congelado
