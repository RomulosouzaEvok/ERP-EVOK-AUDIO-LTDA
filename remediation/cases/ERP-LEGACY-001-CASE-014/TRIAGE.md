# TRIAGE — `ERP-LEGACY-001-CASE-014` (`AUD-ALOG-01`, itens C, F, G)

```
CASE_ID:        ERP-LEGACY-001-CASE-014
FINDING_ID:     ERP-LEGACY-001-AUD-001 / AUD-ALOG-01  (CONFIRMED por T-37)
PROJECT_ID:     ERP-LEGACY-001
ESCOPO:         item C (itemController.ts:205, fornecedor de item)
                item F (categoryController.ts:66, categorias)
                item G (departmentController.ts:65, departamentos)
FASE:           TRIAGEM (SanaCore) — nenhuma linha de server/, teste, migration,
                doc de módulo ou artefato de audit/ foi alterada
AUDIT_COMMIT:   c1311a6f76b512fef893f7e60d934179cae3409f
HEAD analisado: 53a18b54af89e77ecb61663f5596434aa2856b9e (working tree limpa)
DESTINO:        sanacore-remediation-engineer, worktree/branch
                sana/ERP-LEGACY-001/CASE-014
REGRA 3/4:      nenhum FINDING CLOSED, nenhum RETEST_PASSED é declarado aqui
```

**Regra de dado real (`APR-2026-016`) — cumprimento declarado.** Nenhuma conexão
de banco foi aberta nesta triagem, nem para contar linhas. Toda verificação foi
estática, sobre arquivos versionados (`git diff` de leitura, `Read`/`Grep`).

**Autorização de escopo — registro de lacuna, não decisão minha.** `CASE-004`
teve entrada dedicada `APR-2026-033`. Não encontrei entrada equivalente
nomeando `CASE-014` ou os itens C/F/G especificamente. O que existe, e que
considero suficiente para a fase de TRIAGEM (não para a fase de execução, que
é do director/engineer decidir se quer uma entrada formal antes de começar):

- `APR-2026-031` D-13 item 2 (`APPROVALS.md:1556-1559`): decisão do dono de que
  C, F, G sobem a PRODUÇÃO REAL, porque `APR-2026-016` vence o rótulo da
  trilha (cadastros-base carregados com dado real).
- `T-39_FILA_REMEDIACAO_EXPOSICAO.md` §2.2 item 2 (`:120-123`): os três itens
  ocupam o estrato 2 (HIGH · produção real) e são declarados "itens-metadado
  do mesmo finding: remediação e reteste no lote de `AUD-ALOG-01`" — ou seja,
  já fazem parte do mandato de remediação de `AUD-ALOG-01` como um todo, do
  qual `CASE-004` (A, B) já é a primeira fatia executada.
- Este próprio despacho, que abre o caso nominalmente e lista C/F/G como
  escopo fechado, com D/E/H e o parcial de `sales` explicitamente fora.

Registro para o director: se a prática do programa exigir uma entrada
`APR-2026-0xx` dedicada (como `APR-2026-033` fez para `CASE-004`) antes de o
`engineer` começar a editar código, essa entrada ainda não existe e deveria
ser criada. Não a crio eu — `coretriad/governance/` não é meu diretório de
escrita.

---

## 0. Método

Cada âncora arquivo+linha citada por `AUD-ALOG-01` foi **relida por mim no
HEAD atual**, não herdada. `git diff --stat` entre `AUDIT_COMMIT` e `HEAD`
para os seis arquivos relevantes (3 controllers, 2 use cases, o teste de
guarda) está **vazio** — nenhum drift, a remediação parte exatamente do
objeto auditado.

---

## 1. Reprodução — os três call sites, confirmados linha a linha

### Item C — `itemController.ts:205` (fornecedor de item)

```
items.ts:26 → router.delete('/:id/suppliers/:linkId', authenticate,
              authorizeModule('produtos','operate'), itemController.removeSupplier)
→ itemController.ts:203-211 (removeSupplier, sem logAction)
→ DeactivateItemSupplierUseCase.ts:31-38: findById(linkId), valida que o
  vínculo pertence ao item; grava { active: false, preferred: false } e
  retorna o vínculo atualizado.
```

`DELETE /api/items/:id/suppliers/:linkId` — desativa (soft delete) o vínculo
N:N item×fornecedor (tabela `item_suppliers`). Responde 200 com o vínculo
atualizado, **zero linha em `audit_logs`**.

**Distinção do que já foi tratado em `CASE-004`/item B:** B trata
`itemController.ts:135-146` (`inactivate`, o **item** em si, PK UUID,
`OR-21`). C trata uma rota diferente (`removeSupplier`, `:203-211`), sobre
uma entidade diferente (`ItemSupplier`, **PK INTEGER autoincrement**, não o
`Item`). **C não herda `OR-21`** — ver §2 abaixo, é a primeira diferença
material da causa-raiz de C em relação a B.

### Item F — `categoryController.ts:66`

```
exports.remove = ... → DeactivateCategoryUseCase.ts:25-31:
categoriesRepository.update(id, { active: false }) direto, sem pré-leitura
do estado anterior, sem logAction.
```

`DELETE /api/categories/:id` — inativa categoria (`product_categories`,
PK INTEGER). 200, sem trilha.

### Item G — `departmentController.ts:65`

```
exports.remove = ... → DeactivateDepartmentUseCase.ts:25-31:
departmentsRepository.update(id, { active: false }) direto, sem pré-leitura,
sem logAction.
```

`DELETE /api/departments/:id` — inativa departamento (`departments`,
PK INTEGER). 200, sem trilha.

### Confirmação de que `logAction` não existe em nenhuma camada

Busca própria (`Grep`) por `logAction|entityDescription` nos três
controllers: **zero ocorrências** nos três. Os use cases correspondentes
(`DeactivateCategoryUseCase`, `DeactivateDepartmentUseCase`,
`DeactivateItemSupplierUseCase`) também não chamam `logAction` — não há
captura em nenhuma camada de `categories` e `departments`. Para `items`, a
afirmação do finding "não existe em nenhuma camada" já foi verificada de
forma independente por `CASE-004` (mesma varredura, resultado zero) e
permanece válida também para o call site C, que é outro handler do mesmo
módulo ainda mudo.

**Nenhuma captura implícita.** Reconfirmo o que `CASE-004` já estabeleceu:
`server/app.ts` não tem interceptor de mutação; não há middleware global de
auditoria; nenhuma trigger de DDL cobre `product_categories`, `departments`
ou `item_suppliers`. O caminho único de escrita continua sendo `logAction` →
`AuditLog.create`, chamado explicitamente pelo call site.

**Cobertura de teste existente: zero.** Busca em `server/tests` por
`DeactivateCategoryUseCase`, `DeactivateDepartmentUseCase`,
`DeactivateItemSupplierUseCase.execute` (fora do `create`/`update`) e
`removeSupplier`/`categoryController.remove`/`departmentController.remove`:
**nenhum teste unitário ou de integração exercita a desativação nestes três
call sites hoje.** `categories-use-cases.test.ts` e
`departments-use-cases.test.ts` cobrem apenas criação/busca/atualização;
`item-suppliers.test.ts` cobre apenas `Create`/`UpdateItemSupplierUseCase`.
Isso muda o perfil de risco de regressão em relação a `CASE-004`: lá havia
testes de use case que precisavam continuar verdes; aqui **não há teste
existente para quebrar** — só há teste **novo** para escrever.

**Reprodução dinâmica: não executada.** É desnecessária para a causa-raiz
(estrutural) e reservada a `DYN-T03-07` (VeriCore, `erp_evok_audio_test`).

---

## 2. Causa-raiz

### 2.1 ROOT_CAUSE (comum aos três)

**Idêntica em natureza à de `CASE-004`: não é "faltou uma linha", é "o
padrão nunca foi instalado".**

- `categories` e `departments`: módulos pequenos (5 endpoints cada, 3 de
  escrita: `POST`/`PUT`/`DELETE`), **zero `logAction` em qualquer camada**.
  Ambos estão em `DEBITO_CONHECIDO`
  (`audit-coverage-guard.test.ts:52,54`) — a guarda que existiria para pegar
  isso está desligada para os dois, por desenho da catraca (débito
  declarado em 2026-08-10).
- `items` (recorte C): módulo maior, **já parcialmente em remediação por
  `CASE-004`/item B** (`inactivate`, linha 135-146) — mas o call site de C
  (`removeSupplier`, linha 203-211) é um handler **diferente**, não tocado
  por `CASE-004`, e continua mudo independentemente do desfecho de B.
  `'items'` também está em `DEBITO_CONHECIDO` (`:56`).

### 2.2 Diferença material de C em relação a B — por que `OR-21` NÃO se aplica aqui

`OR-21` (`APR-2026-034` D1, Rota 2 já decidida para B) trata do PK `UUID` de
`Item` colidindo com `audit_logs.entity_id integer`. **C não sofre esse
problema**: a entidade auditada em C é o **vínculo** `ItemSupplier`
(`item_suppliers.id`), cuja PK é `DataTypes.INTEGER, autoIncrement`
(`ItemSupplier.ts:32`) — não o `Item.id` (UUID). `Number(existing.id)` produz
um inteiro válido; `AuditLog.register` grava `entity_id` normalmente, sem
`NaN`, sem `22P02`.

**Consequência prática:** C **não** carrega o contorno documentado (Rota 2)
nem a dependência de `AUD-DB-04`. `entityId` pode ser o `id` do vínculo,
recuperável pelo índice `entity_type+entity_id` normalmente — ao contrário
de B. Isso é uma verificação de código, não uma suposição herdada do
finding: o finding não distingue a PK dos dois call sites de `items`, e essa
distinção é o achado novo desta triagem.

Se quiser correlacionar a linha ao item de negócio (o insumo/fornecedor),
o vínculo tem `item_id` (UUID) e `supplier_id` (INTEGER) como colunas
próprias — ambos cabem em `oldValues`/`entityDescription` como **valor**,
sem precisar virar `entity_id`.

### 2.3 Padrão de referência (mesmo de `CASE-004`, reconfirmado)

`productController.ts:192-208` (controller lê `{ before }` do use case e
loga) e `DeactivateUserUseCase.ts:46-54` (use case recebe `req` e loga).
`action: 'soft_delete'` (verbo legado, sem dependência de migration —
`auditActions.ts:80-84`), `entityType`, `entityId`, `entityDescription`,
`oldValues`/`newValues`, `description`. Chamada fire-and-forget, não
`await`ada (`auditLogService.ts:122-214`).

**Nenhum dos três use cases (`DeactivateCategoryUseCase`,
`DeactivateDepartmentUseCase`, `DeactivateItemSupplierUseCase`) devolve o
estado anterior hoje** — todos fazem `update` direto e retornam
mensagem/registro atualizado, sem pré-leitura. Diferente de
`DeactivateItemUseCase` (item B), que já lia o item antes. Isso é um
detalhe de desenho que os três call sites de C/F/G compartilham entre si,
mas não com B.

### 2.4 Desenho recomendado (menor blast radius, simétrico a `CASE-004`)

Para os três, seguir exatamente o padrão de pré-leitura no controller (não
no use case), preservando assinatura e retorno do use case:

1. **C** (`itemController.ts`, `removeSupplier`): antes de instanciar o use
   case, `const before = await itemSupplierRepository.findById(Number(req.params.linkId))`
   (o repositório já é instanciado no controller — `:30`; `findById` já
   existe, usado pelo próprio use case). Após sucesso:
   ```
   logAction(req, {
     action: 'soft_delete',
     entityType: 'ItemSupplier',
     entityId: before.id,
     entityDescription: `item ${before.item_id} x fornecedor ${before.supplier_id}`,
     oldValues: { active: before.active, preferred: before.preferred },
     newValues: { active: false, preferred: false },
     description: `Vínculo item-fornecedor #${before.id} desativado`,
   });
   ```
   **Sem OR-21** (§2.2) — `entityId` é número válido, recuperável pelo
   índice padrão.

2. **F** (`categoryController.ts`, `remove`): `const before = await
   categoriesRepository.findById(req.params.id)` antes do `execute`. Após
   sucesso:
   ```
   logAction(req, {
     action: 'soft_delete',
     entityType: 'Category',
     entityId: before.id,
     entityDescription: before.name,
     oldValues: { active: before.active },
     newValues: { active: false },
     description: `Categoria ${before.name} inativada`,
   });
   ```

3. **G** (`departmentController.ts`, `remove`): `const before = await
   departmentsRepository.findById(req.params.id)` antes do `execute`. Após
   sucesso:
   ```
   logAction(req, {
     action: 'soft_delete',
     entityType: 'Department',
     entityId: before.id,
     entityDescription: `${before.sigla} — ${before.name}`,
     oldValues: { active: before.active },
     newValues: { active: false },
     description: `Departamento ${before.name} inativado`,
   });
   ```

**Restrição de privacidade:** nenhuma das três entidades carrega dado
pessoal (Category/Department/ItemSupplier são cadastro-base operacional —
nome, sigla, preço de referência, prazo de entrega — não CPF, salário,
endereço). Ainda assim, por disciplina de minimalismo (mesmo princípio de
`CASE-004` §2.3, mesmo sem o gatilho de `AUD-DB-08`/`BR-RH-020` aqui),
`oldValues`/`newValues` devem conter **apenas os campos de status**
(`active`/`preferred`), nunca `before.toJSON()` inteiro — evita vazar
`unit_price`/`moq`/`notes` (comercialmente sensíveis, ainda que não
"dado pessoal") em colunas `json` livres, sem necessidade para o critério
de reteste.

**Não-atomicidade declarada:** ler `before` e depois `update` não é atômico
— mesma característica já aceita em `CASE-004` e no padrão existente do
repositório (`productController`). Registrado para não ser surpresa no
reteste.

---

## 3. BLAST_RADIUS

| Dimensão | C (`ItemSupplier`) | F (`Category`) | G (`Department`) |
|---|---|---|---|
| Contrato HTTP | Inalterado — corpo, status, `{ success, data }` preservados. | Inalterado — `{ success, data: { message } }` preservado (`client` espera `{ message }`, `departments.ts:78` confere o mesmo formato para `Category`/`Department`). | Inalterado — mesmo formato. |
| Regra de negócio | Inalterada — validação de pertencimento do vínculo (`:33-35`) intocada. | Inalterada. | Inalterada. |
| Schema | Nenhuma mudança. `ItemSupplier.id` é INTEGER — **sem** colisão `AUD-DB-04` (diferente de B). | Nenhuma mudança. `Category.id` INTEGER. | Nenhuma mudança. `Department.id` INTEGER. |
| Vocabulário | `soft_delete` legado, sem dependência de migration (mesmo raciocínio de `CASE-004` §6.2 — nenhuma migration pendente toca `audit_logs`; ENUM completo em qualquer banco novo pelo baseline congelado). | idem | idem |
| Testes existentes | **Nenhum teste hoje exercita este call site** (busca própria, §1) — nada quebra por conteúdo, só a guarda de cobertura (abaixo). | idem | idem |
| Guarda de cobertura (`audit-coverage-guard.test.ts`) | Ao chamar `logAction` em `itemController.ts`, `temAuditoria('items')` passa a `true` — a lista `DEBITO_CONHECIDO` **precisa** remover `'items'`, senão o próprio teste da catraca (`:106-113`) reprova (entrada que audita mas continua na lista = "obsoleta"). **Isto vale mesmo que `CASE-004`/item B ainda não tenha sido mesclado** — a guarda é por módulo, não por call site: qualquer `logAction` em qualquer controller de `items` já satisfaz `temAuditoria`. | `temAuditoria('categories')` passa a `true` → remover `'categories'` de `DEBITO_CONHECIDO` é obrigatório. | `temAuditoria('departments')` passa a `true` → remover `'departments'` de `DEBITO_CONHECIDO` é obrigatório. |
| Cobertura colateral (leitura correta, não enganosa) | A guarda passa a marcar `items` como "auditado" mesmo que `create`/`update` de vínculo (`createSupplier`/`updateSupplier`) continuem mudos — granularidade de módulo, mesma cegueira já documentada em `CASE-004` §3.6. **Não é regressão desta correção**, é limite pré-existente da guarda; deve constar no `REMEDIATION_RESPONSE` para não ser lido como "módulo `items` totalmente auditado". | Mesmo raciocínio: `create`/`update` de categoria continuam mudos. | Mesmo raciocínio: `create`/`update` de departamento continuam mudos. |

**FILES_AFFECTED — previsão da triagem, não instrução fechada:**

```
server/src/modules/items/presentation/controllers/itemController.ts        (edição, função removeSupplier)
server/src/modules/categories/presentation/controllers/categoryController.ts (edição, função remove)
server/src/modules/departments/presentation/controllers/departmentController.ts (edição, função remove)
server/tests/unit/audit-coverage-guard.test.ts                             (remover 'categories' e 'departments';
                                                                             remover 'items' SE ainda estiver listado
                                                                             no momento do merge — ver §4 coordenação)
+ 3 testes de regressão novos (unit, mock de auditLogService.logAction, sem banco):
  logAction chamado, action='soft_delete', entityType correto, oldValues/newValues
  restritos aos campos de status, req repassado (autor)
```

**REGRESSION_RISK: BAIXO** para os três. Nenhuma mudança de schema, contrato
ou regra de negócio; nenhum teste existente depende do estado atual (mudo);
a única quebra prevista é a catraca da guarda de cobertura, que é
intencional. C tem risco estritamente menor que B (`CASE-004`) por não
carregar `OR-21`.

---

## 4. Coordenação com `CASE-004` (item B) — mesma superfície de arquivo

`CASE-004`/item B (`itemController.ts:135-146`, `inactivate`) e este caso/
item C (`itemController.ts:203-211`, `removeSupplier`) editam **o mesmo
arquivo**, em funções diferentes, e **os dois** precisam tocar a mesma
linha de `audit-coverage-guard.test.ts` (`DEBITO_CONHECIDO`, remover
`'items'`). Não há conflito de lógica (funções distintas), mas há risco de
conflito textual trivial na lista do teste e de **duplicação de remoção**
(quem mesclar por último encontra `'items'` já removido).

Recomendação para o `engineer`/`director`: mesclar um caso de cada vez, e
antes de editar a lista, conferir se `'items'` já foi removido pelo outro
caso — se já foi, não reintroduzir e não falhar por "já removido". Isto não
é uma decisão de negócio, é sequenciamento de merge; registrado aqui para
não ser descoberto como conflito de surpresa.

Não há dependência de **ordem de execução** entre C e o resto de B (nenhum
dos dois bloqueia o outro tecnicamente) — apenas de coordenação de merge no
mesmo arquivo de teste.

---

## 5. Critério de reteste

**Estático:** `logAction` presente nos três call sites, com
`action: 'soft_delete'` e par `oldValues`/`newValues`.

**Autoria:** o `req` precisa chegar a `AuditLog.register` (via `logAction`)
para que `user_id`/`user_ip`/`route`/`method` sejam extraídos
(`AuditLog.ts:149-163`). Chamar sem `req`, ou com `req` sintético sem
`user`, produz linha anônima — reprovação, mesmo critério de `CASE-004` §5.

**Dinâmico (`DYN-T03-07`, VeriCore, fila G4, `erp_evok_audio_test` apenas —
nunca produção):** exercitar os três endpoints
(`DELETE /api/items/:id/suppliers/:linkId`, `DELETE /api/categories/:id`,
`DELETE /api/departments/:id`) e verificar linha correspondente em
`audit_logs`, recuperável por `entity_type`+`entity_id` (os três — ao
contrário de B, nenhum precisa do recorte por `entity_description`, porque
nenhuma das três PKs é UUID).

**Emenda numérica do critério global (`T-37` §7.5):** este caso cobre **3**
dos 14 call sites do critério corrigido. `CASE-004` cobriu 2 (A, B). Após
este caso, restam **9** em aberto (D, E, H, o parcial de `sales`, e os
demais não nomeados por `AUD-ALOG-01`/`T-37` diretamente — verificar contra
a enumeração de 14 do consolidador antes de declarar contagem fechada,
como o próprio `T-37` recomenda). Nada aqui autoriza leitura de fechamento
parcial do finding.

---

## 6. O que este caso NÃO cobre (explícito)

1. **Itens D, E, H** — `supplierController.ts:121`, `clientController.ts:80`,
   `assetController.ts:81`. Classificados DEV/HOMOLOGAÇÃO (estrato 4),
   seguem a fila normal. **Não incluídos por decisão de escopo do
   despacho recebido, não por omissão.**
2. **O parcial de `sales`** — `saleController.ts:342-360` (verbo `delete`
   em vez de `soft_delete`, sem `oldValues`/`newValues`). Fora de escopo.
3. **`AUD-DB-04`** — permanece aberto; nem sequer é dependência de C (§2.2).
4. **`AUD-DB-03`, `AUD-DB-06` (`CORRELATION_ID`), `AUD-DB-07`, `AUD-DB-08`,
   `FIND-ERP-002`** (imutabilidade da trilha) — nenhum endereçado. Mesmo
   com C/F/G remediados, a trilha continua mutável e sem correlação.
5. **Cobertura completa de `categories`/`departments`/`items`** —
   `create`/`update` continuam mudos nos três módulos; a guarda de
   cobertura não vai sinalizar isso, por ser granularidade de módulo
   (§3, "cobertura colateral"). Registrado para constar no
   `REMEDIATION_RESPONSE`.
6. **Recomendação registrada, não executada — custo marginal de incluir
   D/E/H no mesmo lote.** Ao ler os três call sites deste caso, o padrão
   de correção é idêntico (pré-leitura + `logAction`, sem `OR-21`, sem
   dado pessoal em nenhum dos três: `Supplier`, `Client` e `Asset` também
   são cadastro-base sem CPF/salário — não verifiquei os models de
   `Supplier`/`Client`/`Asset` a fundo porque **estão fora do escopo
   autorizado** e verificá-los a fundo seria começar a triar um caso não
   pedido). O custo de incluir seria pequeno **se** o dono/director
   quiser ampliar; **não estou ampliando** — a fila determinou D/E/H como
   DEV/HOMOLOGAÇÃO e a prioridade desta fila é exposição real, não
   conveniência de lote. Registro isto explicitamente para que a decisão
   de ampliar, se vier, seja tomada por quem tem autoridade sobre a fila
   (director/dono), não por mim ampliando por conta própria.
7. **Fechamento de finding, `RETEST_PASSED`, ou qualquer juízo sobre
   suficiência da correção** — autoridade exclusiva da VeriCore.

---

## 7. Divergências registradas (Regra 7 — artefato vence)

| # | Divergência | Tratamento |
|---|---|---|
| D-01 | O despacho recebido descreve C como "fornecedor de item — ação diferente da já corrigida em CASE-004/B". Confirmado: são handlers distintos (`removeSupplier` vs `inactivate`) sobre entidades distintas (`ItemSupplier` vs `Item`), com PKs de tipos diferentes (INTEGER vs UUID). Nenhuma contradição — apenas a distinção de PK (§2.2) é achado novo desta triagem, não estava explicitado no finding original nem no despacho. |
| D-02 | Nenhuma entrada de `APPROVALS.md` nomeia `CASE-014` especificamente (diferente de `CASE-004`/`APR-2026-033`). Tratado como lacuna de registro a decidir pelo director (§ "Autorização de escopo" acima), não bloqueante para a fase de triagem. |
| D-03 | Nenhum teste existente cobre os três call sites — divergência favorável (menos risco de regressão do que `CASE-004`), registrada porque muda o perfil de risco esperado. |

---

## 8. Critério de conclusão da triagem — autoavaliação

| Exigência | Estado |
|---|---|
| Causa-raiz demonstrada (não hipótese) | Sim — cadeia rota→controller→use case→repositório lida integralmente nos três itens; ausência de `logAction`/captura implícita reproduzida por busca própria; diferença de PK entre C e B verificada no model, não presumida. |
| Blast radius mapeado | Sim — §3, com `FILES_AFFECTED`, quebra de teste prevista (guarda) e coordenação de merge com `CASE-004` (§4). |
| Plano com risco de regressão avaliado | Sim — BAIXO nos três, com fundamento (zero teste existente a preservar, zero mudança de schema/contrato). |
| Agrupamento de findings com mesma causa-raiz | Sim — C, F, G tratados como um único caso, mesma causa-raiz (omissão de instalação do padrão), mesma classificação de ambiente (D-13 item 2). |
| `APR-2026-016` respeitada | Sim — nenhuma conexão de banco, nenhum script de diagnóstico executado. |
| Nada escrito fora de `remediation/cases/ERP-LEGACY-001-CASE-014/` | Sim. |

**Pergunta pendente para o dono/director (não decidida aqui):** se deseja
uma entrada formal em `APPROVALS.md` abrindo `CASE-014` nominalmente (como
`APR-2026-033` fez para `CASE-004`) antes do `engineer` começar, ou se a
combinação de `APR-2026-031` D-13 item 2 + `T-39` §2.2 já é considerada
autorização suficiente para este lote específico da fila.

**PRÓXIMO ELO:** `sanacore-remediation-engineer`, worktree
`sana/ERP-LEGACY-001/CASE-014`.
