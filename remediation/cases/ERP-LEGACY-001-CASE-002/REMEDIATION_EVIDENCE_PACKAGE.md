# REMEDIATION_EVIDENCE_PACKAGE  (SanaCore → VeriCore)

CASE_ID: ERP-LEGACY-001-CASE-002
FINDING_ID: FIND-ERP-005
PROJECT_ID: ERP-LEGACY-001
PRODUZIDO_POR: sanacore-remediation-evidence
DATA: 2026-08-14 (revisado na mesma data, após verificação do orquestrador — ver §0)
WORKTREE: `sana/ERP-LEGACY-001/FIND-ERP-005` (`C:/Sistema EvokAudio/ERP-Evok-sana-FIND-ERP-005`)
FINDING_FONTE: `docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-005.md` (não editado por este agente)
TRIAGE_FONTE: `remediation/cases/ERP-LEGACY-001-CASE-002/TRIAGE.md` (não editada por este agente)

---

## 0. Nota de revisão e armadilha metodológica (leia primeiro)

A **primeira versão** deste pacote declarou duas lacunas materiais. Após
verificação do `coretriad-director` e reverificação própria, o estado é:

| Lacuna declarada na v1 | Veredito | Onde ficou |
|---|---|---|
| `APR-2026-021` não registrada em `APPROVALS.md` | **ALARME FALSO — retratado** | §0.1 |
| Suíte de integração HTTP do caso não exercitava nada (14/14 falhas) | **REAL — corrigida nesta revisão** | §5.4 |

### 0.1 Retratação — `APR-2026-021` EXISTE, e o erro foi meu, com causa identificável

A v1 afirmou que `APR-2026-021` não estava registrada. **Errado.** A
afirmação foi produzida lendo `coretriad/governance/APPROVALS.md` **do
worktree**, cuja última entrada é `APR-2026-020` — porque a branch
`sana/ERP-LEGACY-001/FIND-ERP-005` foi cortada antes dessas aprovações
serem gravadas.

Verificado agora no repositório principal
(`C:/Sistema EvokAudio/ERP-Evok--Audio-LTDA`, leitura apenas):
`APR-2026-021` (`:573`), `APR-2026-022` (`:681`) e `APR-2026-023` (`:761`)
existem. `APR-2026-021` Parte B registra as decisões, e `APR-2026-022`
corrige o vínculo, deixando explícito que os itens **3, 4 e 5 pertencem ao
`CASE-002`/`FIND-ERP-005`** — exatamente as perguntas (a)/(b)/(c) da TRIAGE:

| Item | Decisão do dono | Ramo da TRIAGE | Implementado? |
|---|---|---|---|
| B.3 | Alçada = **tabela configurável**, não constante | A1 (§7.1) | Sim — §2 |
| B.4 | Aditivo que eleva valor **exige `approve`**; `operate` nunca basta | B1 (§7.2) | Sim — provado em §5.7 |
| B.5 | Segregação D-K **vale** para aprovação de contrato jurídico | C1 (§8.3) | Sim — §2 |

**Os três ramos implementados batem com o que o dono decidiu.** Não há
lacuna de governança neste caso.

> ### ARMADILHA METODOLÓGICA — registrar para não repetir
>
> **`coretriad/` dentro de um worktree SanaCore de vida longa está congelado
> no ponto do corte da branch e NÃO é fonte de verdade sobre aprovações,
> estados ou handoffs.** O control plane é escrito pelo CoreTriad Director no
> repositório principal e não acompanha a branch de remediação.
>
> Regra prática para qualquer agente SanaCore futuro: **toda consulta a
> `coretriad/governance/APPROVALS.md`, `coretriad/states/` e
> `coretriad/handoffs/` deve ser feita no repositório principal**, mesmo
> quando o trabalho é no worktree. Ausência de um `APR-...` no worktree é
> evidência de **defasagem da branch**, nunca de ausência da decisão.
>
> Isto reforça, não contradiz, a Regra 7: o artefato versionado é a fonte
> oficial — mas é preciso ler a *cópia certa* dele.

### 0.2 Divergência registrada por evidência (Regra 20), não por deferência

O orquestrador apontou que eu teria citado o caminho da suíte de integração
como `juridico-contract-authority-...` em vez de `jur-contract-authority-...`.
Verificado por `ls`: **existem os dois arquivos, com nomes diferentes**, e as
citações da v1 estavam corretas:

- `server/tests/unit/juridico-contract-authority-find-erp-005.test.ts` — 46 testes unitários
- `server/tests/integration/jur-contract-authority-find-erp-005.test.ts` — 20 testes de integração HTTP

Nenhuma correção de citação era necessária; registro aqui para que a
diferença de nomes (que é confusa de fato) não vire ruído no reteste.

---

## 1. ROOT_CAUSE

Confirmada, não hipótese:

> O controle de alçada do Jurídico foi implementado como **"registro de um
> ato de aprovação"**, não como **"invariante do contrato"**. O sistema
> perguntava *"existe uma linha em `jur_contract_approvals` com este
> papel?"* em vez de *"este valor está coberto por aprovações válidas, dadas
> por pessoas distintas com poder de aprovar, sob a política vigente?"*.

| Dimensão | Falha | Causa pontual |
|---|---|---|
| Parâmetro (qual o limiar?) | Falha 1 | `constants.ts:23,26` — dois literais, contrariando `BLOCO_3_JUR_API.md` §2.7 |
| Poder (quem pode aprovar?) | Falha 2 | `juridico.ts:71` sem `requiredLevel` → default `'operate'` + truthiness em `contractController.ts:52-53` |
| Vínculo (aprovou o quê?) | Falha 3 | `CreateContractAddendumUseCase.ts:61` não condicionava a `change_type` nem reabria alçada |
| Identidade (aprovou quem?) | Falha 4 | `ApproveContractUseCase.ts:85-88` dedup por PAPEL; `admin` recebia os dois papéis (`contractController.ts:50`) |

Agravante transversal: `ActivateContractUseCase` aceitava `approvalRepository`
opcional — gate pulado em silêncio (fail-open) quando a dependência faltava.

## 2. LOCAL_FIX (o que foi implementado)

| Commit | Conteúdo |
|---|---|
| `67b49fb` (preservação) | Código das 4 falhas: migration `jur_approval_thresholds`+histórico, models, `approvalPolicy.ts`, ajustes em `ActivateContractUseCase`/`ApproveContractUseCase`/`CreateContractAddendumUseCase`, endpoints `GET`/`PUT /settings/approval-thresholds`, extensão de `segregationOfDuties.ts` |
| `cd6f45b` | Ajuste de construtores em `juridico-contract-use-cases.test.ts` (31/31 verdes; nenhuma asserção alterada — §5.3) |
| `afde1d0` | Suítes de regressão novas (unit + integração HTTP); `contractController` ganha export `__test__` para os vetores adversariais de R2(e) |
| `8a2c5e3` | `purchase-segregation-of-duties.test.ts` atualizado para o 5º ponto de `SEGREGATION_RULES` (`D-K-JURIDICO`) |
| `33b8633` | Cliente: remove a terceira cópia dos limiares; UI usa `required_roles` de `GET /contracts/:id/approvals` |
| `54572b7` | `BLOCO_3_JUR_API.md` §2/§2.5/§2.7 descrevem o mecanismo real; contradição §214×§233 eliminada |
| `48c93cd` | v1 deste pacote de evidência |
| (commit desta revisão) | Correção do fixture de integração + contagem canônica de migrations + revisão deste pacote |

### Falha 1 — tabela configurável (APR-2026-021 B.3 / ramo A1)
`jur_approval_thresholds` + `jur_approval_threshold_history` (migration
`20260814-000048-jur-approval-thresholds-and-authority-find-erp-005.cjs`);
`approvalPolicy.ts` interpreta a política (comparação, precedência por
`contract_type`, vigência, **fail-closed** com política vazia ou repositório
ausente); seed preserva 50k/300k para `contract_type='*'`;
`jur_contracts.approval_policy_snapshot` registra a política vigente no
instante da ativação (R1d); endpoints `GET`/`PUT
/api/jur/settings/approval-thresholds`, o `PUT` exigindo `approve`.

### Falha 2 — nível `approve` + fail-closed
`requiredLevel: 'approve'` nos dois candidatos de `juridico.ts:71`;
comparação estrita `=== 'approve'` em `resolveAvailableApproverRoles`;
`approvalRepository` e `thresholdRepository` **obrigatórios** no construtor
de `ActivateContractUseCase` (fecha o fail-open, R5).
`authorizeAnyModule.ts` **não foi tocado** (instrução da TRIAGE §3.1 —
verificado por diff).

### Falha 3 — reabertura de alçada (APR-2026-021 B.4 / ramo B1)
`new_value` só é aplicado com `change_type === 'value'`; elevação de faixa
**invalida** aprovações incompatíveis (preserva histórico via
`invalidated_at`) e devolve o contrato a `in_approval`; **elevação de valor
exige nível `approve`** (`CreateContractAddendumUseCase.ts:131`); redução de
valor não exige. Ordenação fail-safe documentada no cabeçalho do use case,
no lugar de transação única (limitação declarada — a camada de repositório
não tem plumbing de transação).

### Falha 4 — segregação D-K estendida ao Jurídico (APR-2026-021 B.5 / ramo C1)
Nova regra `D-K-JURIDICO` em `shared/domain/segregationOfDuties.ts`
(`assertApproverIsNotPriorApprover`, reaproveitando `isSelfApproval`);
`admin` não isenta; R4(d) (criador não aprova) implementado.

## 3. SYSTEMIC_FIX_REQUIRED / BLAST_RADIUS

Herdado da TRIAGE §3, **não ampliado** por este caso:

- `purchases.ts:48` e `importProcesses.ts:34` replicam a mesma truthiness de
  papel da Falha 2 — **módulos de PRODUÇÃO**, fora de escopo deste caso.
  Encaminhamento registrado na TRIAGE §3.2 e reafirmado aqui para que
  ninguém assuma cobertura inexistente.
- `authorizeAnyModule.ts` intocado (5 rotas de leitura em 4 módulos dependem
  do default `'operate'`).

## 4. GOVERNANÇA — autorização humana das decisões

**Registrada e verificada** (§0.1): `APR-2026-021` Parte B itens 3/4/5,
reafirmados por `APR-2026-022`. Nenhuma decisão de negócio foi tomada por
agente: a TRIAGE formulou as 3 perguntas (§8), o dono respondeu, e os ramos
implementados (A1/B1/C1) correspondem item a item.

`APR-2026-021` Parte C fixa os limites que este pacote respeita: *"vedada
implementação parcial apresentada como finding resolvido"*; *"SanaCore NÃO
está autorizada a fechar finding, marcar `RETEST_PASSED`, usar banco real ou
transformar ausência de Docker/psql em evidência de sucesso"*.

## 5. TESTES EXECUTADOS E RESULTADOS (execução real desta sessão)

**Guarda de banco aplicada antes de cada execução dinâmica:**
`server/.env.test` → `DB_NAME=erp_evok_audio_test`; o runner
(`scripts/run-api-suite.cjs`) impõe o sufixo `_test`/`_ci`; o log do servidor
confirma `PostgreSQL conectado: localhost:5432/erp_evok_audio_test`.
**Nenhuma conexão foi aberta contra `erp_evok_audio`** (linha vermelha
`APR-2026-016`, reafirmada em `APR-2026-021` Parte D).

### 5.1 Unitários — alvo

```
npx jest --runInBand tests/unit/juridico-contract-authority-find-erp-005.test.ts \
  tests/unit/juridico-contract-use-cases.test.ts \
  tests/unit/purchase-segregation-of-duties.test.ts
```
**3 suítes, 95/95 PASSED.**

### 5.2 Unitários — suíte completa

`npx jest --runInBand tests/unit` → **1996/1998 PASSED**, 2 falhas
pré-existentes e não relacionadas (`onda3-shipping-cockpit-cashflow`;
`docs-path-reference-guard`, que acusa
`SIM-002_VALIDATION_REPORT.md:46 → docs/API.md`, citação quebrada
preexistente). Reexecutado ao final desta revisão: **mesmo resultado**.

### 5.3 Não-regressão em `juridico-contract-use-cases.test.ts:174-333` (R6c)

`git diff cd6f45b~1 cd6f45b` na faixa: apenas injeção de
`makeApprovalRepository()`/`makeThresholdRepository()` nos construtores.
**Nenhuma linha de `expect(...)` alterada.** O fixture de política reproduz
o seed das 3 faixas, preservando o comportamento observável. R6(c)
satisfeito.

### 5.4 Integração HTTP — a lacuna real da v1, agora CORRIGIDA

**Estado na v1:** a suíte do caso falhava **14/14** sem exercitar nada do
produto. O diagnóstico da v1 (defeito de *fixture*, não do produto) foi
confirmado pelo orquestrador e por releitura própria.

Três defeitos de fixture corrigidos nesta revisão, cada um verificado contra
o código **e** contra o contrato de API antes de tocar o teste:

| # | Fixture errado | Verdade (arquivo:linha) |
|---|---|---|
| 1 | `signatory_type` no `POST .../signatories` | `party_type` — `AddContractSignatoryUseCase.ts:26`, mapeado para a coluna `signatory_role` em `:33`; `BLOCO_3_JUR_API.md` §2.3 |
| 2 | `document_url`/`is_signed`/`version_number` no `POST .../documents` | `file_url` + `is_signed_version` — `AddContractDocumentUseCase.ts:26,39`; `version_number` é calculado pelo backend |
| 3 | `activate` com `.send({})` nas 3 ativações que devem dar **200** | `responsible_user_id` **não é persistido na criação, por desenho** (`CreateContractUseCase.ts:56-77` não o grava; `BLOCO_3_JUR_API.md` §2.1 diz isso explicitamente) e é exigido em `activate` (`ActivateContractUseCase.ts:128`, BR-JUR-001) |

Detalhe que importa ao reteste: as ativações que devem retornar **422 por
`RF-JUR-003`** (R2(d) e R1(b)) foram **deixadas como estavam**, com
`.send({})`, e passam pelo motivo certo — a alçada é verificada **antes** do
responsável (`ActivateContractUseCase.ts:106` vs `:128`), e ambas asseguram
`details.rule === 'RF-JUR-003'`.

**Nenhuma linha de código de produto foi alterada para fazer teste passar.**
As três correções são no arquivo de teste, e cada uma alinha o fixture ao
contrato de API já documentado.

**Resultado após a correção** (`npm run test:integration`, extraído de
`tmp/jest-integration.json`, não de leitura de tela):

```
tests/integration/jur-contract-authority-find-erp-005.test.ts
status: passed | total: 20 | passed: 20 | failed: 0 | skipped: 0
```

Os 20, nominalmente: R2(a), R2(b), R2(c), R2(d), `GET approvals` em
`operate`; R4(a), R4(b), R4(c), R4(d); R3(a), R3(b), `APR-2026-021 B.4`,
R3(c), R3(e); `GET settings`, `PUT` exige `approve`, `PUT` rejeita política
vazia, `PUT` rejeita papel inválido, R1(b), R1(c).

**Consequência para o reteste:** R1(b)(c), R2(a)-(d), R3(a)(b)(c)(e) e
R4(a)-(d) passam a ter **prova dinâmica HTTP real**, autenticada, contra
banco — exatamente o que o finding exigia e o que a suíte antiga não fazia.
A lacuna L-T1 da TRIAGE deixa de valer para este caso.

### 5.5 Suíte de integração completa — evolução e estado final

| Execução | Test Suites | Tests |
|---|---|---|
| v1 (antes das correções) | 5 failed / 60 | 24 failed / 267 |
| após correção do fixture | 4 failed / 60 | 9 failed / 267 |
| após correção da doc de migrations | **3 failed / 60** | **8 failed / 267 — 259 passed** |

| Suíte que ainda falha | Falhas | Natureza | Ação |
|---|---|---|---|
| `cross-database-drift-guard` | 1 | **Efeito direto desta remediação.** A migration `20260814-000048` está aplicada só em `erp_evok_audio_test`; o guard compara os dois bancos e acusa as tabelas/índices/constraints novos. | **Depende de decisão — §5.6.** Não corrigível por mim. |
| `bom-tipo-nao-produtivo` | 5 | **Não relacionada.** `git log 8b572c8..HEAD` confirma que nem o teste nem `modules/products`/`modules/inventory` foram tocados por esta branch. Falhas são timeout e `product_id: NaN` (dependência de seed/fixture). | Fora de escopo. |
| `traceability-and-audit-log-regression` | 2 | **Não relacionada.** Idem — arquivo não tocado; depende de `TEST_SUPPLIER_ID`/`TEST_PRODUCT_ID` e expira por timeout. | Fora de escopo. |

Ressalva honesta sobre as 7 falhas "não relacionadas": a prova definitiva de
que são pré-existentes seria rodá-las no `main`, o que **não fiz** porque
mexer no repositório principal está vedado nesta sessão. O verificável que
afirmo é: **esta branch não tocou nenhum desses arquivos nem o código de
produto que eles exercitam**, e o modo de falha (timeout/seed) é
independente do Jurídico.

### 5.6 `cross-database-drift-guard` — por que NÃO corrigi (depende de decisão)

Corrigir esse guard significa aplicar a migration `20260814-000048` no banco
**`erp_evok_audio`**, que a `APR-2026-016` classifica como **PRODUÇÃO REAL**
e que `APR-2026-021` Parte D reafirma como intocável pela SanaCore
(*"nenhuma conexão com banco real está autorizada"*). É escrita de DDL em
banco real — **decisão humana explícita**, não passo técnico da SanaCore.

O que o dono/`coretriad-director` precisa decidir: **quando** a migration
entra em `erp_evok_audio` — antes do merge da branch, junto com ele, ou só
no deploy. Enquanto não entrar, o guard falha corretamente e a documentação
canônica (§6) já declara a divergência de forma explícita.

### 5.7 Prova de que a decisão B.4 foi implementada (pedido explícito do orquestrador)

Provado por **código** e por **teste**, não por mensagem de commit.

**Código** — cadeia completa, server-side:
1. `contractController.ts:40-43` — `hasApprove(req)` lê
   `user.role === 'admin' || user.permissions?.juridico === 'approve'`. A
   origem é `req.user`, recarregado do banco a cada request por
   `middlewares/auth.ts`; **nunca vem do body** (Regra 24 respeitada).
2. `contractController.ts:240` — `requesterHasApprove: hasApprove(req)` é
   passado ao use case do aditivo.
3. `CreateContractAddendumUseCase.ts:126-137` —
   `const isValueIncrease = carriesNewValue && nextValue > previousValue;`
   seguido de
   `if (isValueIncrease && !input.requesterHasApprove) throw new BusinessRuleError(...)`
   com `rule: 'RF-JUR-008'`. Só a **elevação** é barrada; redução e aditivo
   de prazo seguem em `operate` — exatamente o texto da decisão
   (*"preparação pode ser feita por `operate`; a efetivação do aumento de
   valor exige `approve`"*).

**Teste** — dois níveis, ambos verdes nesta sessão:
- Unitário: `APR-2026-021 B.4: elevar valor sem nível approve é rejeitado` e
  `APR-2026-021 B.4: REDUZIR valor não exige approve` (entre os 95/95 de §5.1).
- Integração HTTP: `APR-2026-021 B.4: juridico:operate NÃO efetiva elevação
  de valor` — **PASSED**, entre os 20/20 de §5.4.

### 5.8 Typecheck

`npx tsc --noEmit` (server) e `npx tsc -b` (client): **ambos exit 0**,
reexecutados após todas as edições desta revisão.

### 5.9 Levantamento da TRIAGE §3.3 — perfis `diretor`/`financeiro:'operate'`

Consulta somente-leitura contra `erp_evok_audio_test` (guarda de sufixo
aplicada antes da query; script descartável, removido em seguida):

```sql
SELECT app.id, ap.nome, app.module, app.level
FROM access_profile_permissions app
JOIN access_profiles ap ON ap.id = app.access_profile_id
WHERE app.module IN ('diretor','financeiro') AND app.level = 'operate'
```

**Resultado: 0 perfis** no banco de teste. **Isto não responde pela
produção** — pendência real para o dono: rodar a mesma consulta em
`erp_evok_audio`, ou confirmar por outro meio quantos perfis reais
perderiam a capacidade de aprovar contrato. A contrapartida, se houver, é
organizacional (promover a `approve` quem de fato é aprovador), como já
aceito em D-K para Compras.

## 6. DOCUMENTAÇÃO ATUALIZADA

**`docs/business/BLOCO_3_JUR_API.md`** (commit `54572b7`, verificado por
leitura, não pela mensagem de commit):
- §2 (:210-258) — tabela lista `POST /contracts/:id/approve` (`approve`),
  `GET .../approvals`, `GET`/`PUT /settings/approval-thresholds`; nível do
  aditivo unificado (`operate` para preparar, `approve` para efetivar
  elevação). **A contradição :214 × :233 do finding não existe mais.**
- §2.3 (:325-331) — `party_type` documentado (é a fonte que provou o defeito
  de fixture §5.4).
- §2.5 (:365-396) — `new_value` só com `change_type='value'`; reabertura de
  alçada com `approval_reopened: true`; tabela de erros com `RF-JUR-008`.
- §2.7 (:409+) — mecanismo real (tabela + histórico + fail-closed + D-K +
  reabertura), mantendo `[VERIFICAR COM ASSESSOR JURÍDICO]`: os valores
  50k/300k seguem sem validação jurídica e a remediação não fingiu o
  contrário.

**Corrigido nesta revisão** (era a falha `docs-reality-drift-guard`):
`docs/project-memory/product/ERP_SSOT.md:79` e `docs/database/00-INDICE.md`
— medição canônica de **169 → 170 migrations**, com **209 tabelas** e **480
foreign keys** (contados em `erp_evok_audio_test`, não inventados),
descrição da 170ª migration, e declaração explícita de que ela vive na
branch e por isso os dois bancos divergem até a integração. O guard passa; a
redação usa a contra-afirmação convencionada (`✔ aplicada — conferido
contra SequelizeMeta em 2026-08-14`) para não disparar a regra de "migration
citada como pendente".

## 7. FILES_CHANGED

28 arquivos de produto/teste/doc, +2740/-156 (`git diff --stat 8b572c8
54572b7`); nesta revisão, mais 1 arquivo de teste de integração (fixture) e
2 documentos de medição canônica.

## 8. TESTS_ADDED / TESTS_CHANGED

- **Adicionados:** `server/tests/unit/juridico-contract-authority-find-erp-005.test.ts`
  (46 testes) e `server/tests/integration/jur-contract-authority-find-erp-005.test.ts`
  (20 testes — **todos passando**, §5.4).
- **Alterados (construtor/fixture, sem asserção):**
  `juridico-contract-use-cases.test.ts` (§5.3),
  `purchase-segregation-of-duties.test.ts` (5º ponto `D-K-JURIDICO`).

## 9. REGRESSION_ANALYSIS

- Unitários: **1996/1998** (2 pré-existentes, não relacionadas).
- Integração: **259/267**; a suíte do caso **20/20**; das 8 falhas restantes,
  **1 é efeito conhecido desta remediação e depende de decisão humana**
  (§5.6) e **7 não têm relação com o caso** (§5.5).
- Typecheck client+server limpo.
- Nenhuma asserção pré-existente foi alterada para "fazer passar" e nenhum
  código de produto foi alterado nesta revisão — verificado por diff.

## 10. ARCHITECTURE_IMPACT

Alçada deixa de ser função pura de constantes e passa a depender de
configuração injetada (repositório injetado no use case; o domínio não faz
I/O) — desenho da TRIAGE §7.1, confirmado por `APR-2026-021` B.3 (*"o código
pode conter apenas as estruturas técnicas de interpretação da política; os
valores de negócio ficam configuráveis"*).

## 11. DATABASE_IMPACT

Migration `20260814-000048`: 2 tabelas novas (`jur_approval_thresholds`,
`jur_approval_threshold_history`), coluna `approval_policy_snapshot` em
`jur_contracts`, colunas de valor aprovado e `invalidated_at` em
`jur_contract_approvals`, e substituição de
`uq_jur_contract_approvals_contract_role` por
`uq_jur_contract_approvals_role_active` +
`uq_jur_contract_approvals_user_active` — a unicidade que
**institucionalizava a Falha 4** deixa de existir. Medição pós-migration em
`erp_evok_audio_test`: 170 migrations, 209 tabelas, 480 FKs, 20 tabelas
`jur_*`. **Aplicada somente em `erp_evok_audio_test`**; aplicação em
`erp_evok_audio` é decisão humana (§5.6).

## 12. API_IMPACT

2 endpoints novos (`GET`/`PUT /api/jur/settings/approval-thresholds`);
`POST /contracts/:id/approve` passa a exigir nível `approve`;
`POST .../addendums` exige `approve` **apenas quando** eleva valor. Client
atualizado para não espelhar limiares (`33b8633`).

## 13. SECURITY_CHECKS

As 4 falhas têm correção verificada em três níveis: leitura de código (§2),
46 testes unitários determinísticos (§5.1) e **20 testes de integração HTTP
autenticados contra banco (§5.4)** — este último é o nível que o finding
exigia e que a suíte anterior não tinha, e é o que fecha a categoria de
lacuna que deixou o finding original passar despercebido. Regra 24: nenhum
papel/nível vem do cliente — `req.user.permissions` é recarregado do banco a
cada request; o `role` do body só desambigua e é validado contra
`availableRoles` (§5.7).

## 14. RESIDUAL_RISK

1. **Médio — decisão humana:** migration não aplicada em `erp_evok_audio`;
   `cross-database-drift-guard` falha até que o dono decida quando aplicar
   (§5.6).
2. **Médio — organizacional, não levantado em produção:** contagem de perfis
   `diretor`/`financeiro:'operate'` no banco real (§5.9). No banco de teste é
   0.
3. **Baixo:** valores de alçada (50k/300k) seguem sem validação de assessoria
   jurídica — marcação mantida por desenho, e agora alteráveis sem deploy.
4. **Baixo — limitação declarada:** o aditivo usa ordenação fail-safe em vez
   de transação única (a camada de repositório não tem plumbing de
   transação); o estado perigoso — contrato `active`, valor elevado, sem
   aprovação — não é alcançável por interrupção, mas a transação real fica
   como melhoria posterior.
5. **Fora de escopo, registrado, NÃO corrigido:** o mesmo padrão de
   truthiness da Falha 2 existe em `purchases.ts:48` e
   `importProcesses.ts:34` — **módulos de PRODUÇÃO**. Merece finding próprio
   (§3).
6. **Não relacionado a este caso, mas visível:** 7 falhas de integração e 2
   de unidade em outras suítes (§5.2, §5.5).

## 15. COMMIT_HASH / BRANCH

REMEDIATION_COMMIT: o commit desta revisão na branch
`sana/ERP-LEGACY-001/FIND-ERP-005` (hash registrado em `CASE_STATUS.md`
logo após o commit; o código de produto está integralmente em
`67b49fb`..`54572b7`).
Commits do caso: `67b49fb` → `cd6f45b` → `afde1d0` → `8a2c5e3` → `33b8633`
→ `54572b7` → `48c93cd` (pacote v1) → revisão atual.
Branch **não enviada** (`git push` não executado, conforme instrução).
Repositório principal **não tocado**.

## 16. RETEST_INSTRUCTIONS

**Não é declaração de PASS nem de `FINDING CLOSED` — autoridade exclusiva
VeriCore (Regra 4).**

1. Reproduzir o finding original contra o `AUDIT_COMMIT` (`c9359be...`, tag
   `legacy-baseline-001`) e depois contra o REMEDIATION_COMMIT — as 4 falhas
   devem existir no primeiro e não no segundo.
2. Executar R1-R6 de forma **independente**, com scripts próprios, contra
   `erp_evok_audio_test` (nunca `erp_evok_audio`). Não confiar apenas nas
   suítes da SanaCore (Parte V §30 do master spec) — mas elas existem e
   passam: 46 unitários + 20 de integração HTTP.
3. Conferir R6(c) por diff próprio em
   `juridico-contract-use-cases.test.ts:174-333`.
4. Verificar os itens que **dependem de ação/decisão humana** e que a
   SanaCore deliberadamente não executou: aplicação da migration em
   `erp_evok_audio` (§5.6) e contagem de perfis `operate` em produção (§5.9).
5. Avaliar se o encaminhamento de `purchases`/`comex` (§3) vira finding
   próprio — a interseção com FIND-ERP-009 (ponto #5) está registrada na
   TRIAGE §4 para não haver reteste duplicado nem fechamento por engano.
