# T-33 — FECHAMENTO DOS 43 ENDPOINTS RASOS — BLOCO A

**Run:** `ERP-LEGACY-001-AUD-001` · **AUDIT_COMMIT:** `c1311a6f76b512fef893f7e60d934179cae3409f`
**Escopo:** `clients`, `employees`, `nonConformities`, `spreadsheetImport`, `quality`
**Método:** READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT. Somente leitura estática. Nenhum
teste executado, nenhum comando de banco.
**Status:** `PROPOSED`. Nenhum veredito (Regra 4). CRITICAL/HIGH → `vericore-finding-validator`
(Regra 22).

> **Nota de persistência.** Agente titular sem autoridade de escrita em `audit/`. Persistido pelo
> orquestrador **sem alteração**.

## 1. Inventário próprio (contagem por leitura das rotas)

| Módulo | Rota | Contados por mim | T-16 §5 | Divergência |
|---|---|---|---|---|
| `clients` | `clients.ts:19-23` | 5 | 5 | não |
| `employees` | `employees.ts:19-23` | 5 | 5 | não |
| `nonConformities` | `nonConformities.ts:17-21` | 5 | 5 | não |
| `spreadsheetImport` | `catalogImport.ts:27,28,29,31,40` | 5 | 5 | não |
| `quality` | `qualityInspections.ts:23,24,25` | 3 | 3 | não |
| **Total** | — | **23** | 23 | — |

**Divergência registrada (Regra 20):** o encargo estimou "~26 endpoints"; a contagem própria dá
**23**, coincidindo com T-16 §5. A estimativa do encargo é que estava alta em 3.

Enumeração E1…E23: `GET/GET:id/POST/PUT/DELETE` de `clients` (`:19-23`) e `employees` (`:19-23`);
`GET/GET:id/POST/PUT/DELETE` de non-conformities (`:17-21`); `GET /catalog-import/modelos` (`:27`),
`.../produtos.csv` (`:28`), `.../estrutura.csv` (`:29`), `POST /simulacao` (`:31-38`),
`POST /catalog-import` (`:40-47`); `GET /quality/inspections` (`:23`), `POST` (`:24`),
`GET /quality/lots/:lotId/release-eligibility` (`:25`).

## 2. Findings `PROPOSED`

### `T33-A-F01` — Regra "preço de venda > custo" com **três implementações divergentes** e **sem BR-ID**

**HIGH · CONFIRMED · D3 · §19 Master Spec**

1. `ProductEntity.ts:144` — `if (this.cost_price > 0 && this.price <= this.cost_price) throw` —
   `price` ausente vira `0` (`:100`), logo **recusa** custo>0 com preço ausente.
2. `UpdateProductUseCase.ts:43-47` — só valida quando **ambos** vêm no mesmo PUT. Enviar só
   `cost_price` acima do `price` gravado **passa**.
3. `validarPlanilhaCadastro.ts:323-330` — exige ambos `> 0`; planilha com `preco_venda` em branco e
   `custo_padrao = 100` **passa**.

Agravante estrutural: a importação **não passa por `ProductEntity`** —
`SequelizeCatalogImportRepository.ts:96` chama `Product.create(...)` direto e `:104`
`Product.update(...)` direto. Toda a validação de domínio é contornada; a planilha reimplementa um
subconjunto dela.

Nenhum `BR-*` identifica esta regra em nenhum dos três pontos. **Não se decide qual versão vale**
(Regras 20/21). **Impacto:** o mesmo produto é aceito ou recusado conforme a porta usada; a porta de
escrita em massa é a mais permissiva.

### `T33-A-F02` — `effectiveness_result` não tem **nenhum** caminho de escrita; UC-40 fica degenerado

**HIGH · CONFIRMED · D3/D5** — achado de discovery **nunca promovido** (`APR-2026-018` vedou
promoção por analogia); promovido aqui com evidência própria.

Coluna existe (`NonConformity.ts:76`, com `effectiveness_check:74` e `effectiveness_date:75`).
`UpdateNonConformityUseCase.ts:26-36` — `ALLOWED_FIELDS` **não contém** nenhum dos três.
`CreateNonConformityUseCase.ts:158-181` — não grava. `CloseNonConformityUseCase.ts:46-49` — grava só
`status`, `closed_by`, `closed_date`. Varredura de `server/src`: as únicas ocorrências fora do model
são **leituras** (`ListNonConformitiesUseCase.ts:62`, `handoffSignal.ts:76,196-210`).

**Consequência documentado × implementado:** `handoffSignal.ts:210` implementa a redação literal de
UC-40 — `status === 'closed' && effectiveness_result !== 'effective'` → **red**. Como o campo nunca
pode ser gravado, **toda RNC encerrada é permanentemente vermelha/"reincidente"** no semáforo. O
requisito está implementado em forma e vazio em substância.

### `T33-A-F03` — CPF de funcionário é **pesquisável** por qualquer autenticado

**HIGH · CONFIRMED · D1/D9 · LGPD arts. 5º/6º/46**

`employees.ts:19` expõe `GET /api/employees` com **apenas** `authenticate`. A segregação
(`employeeSensitiveFields.ts:36-51,66-70`) remove `cpf` **da resposta**, mas o filtro fica fora
dessa borda:

```
SequelizeEmployeesRepository.ts:20-23
where[Op.or] = [{ name: { [Op.like]: `%${s}%` } }, { cpf: { [Op.like]: `%${s}%` } }];
```

Qualquer autenticado sem perfil `rh` envia `?search=<dígitos>` e recebe, no `name` visível, a
confirmação de quais funcionários casam com aquele fragmento de CPF. Por ser `LIKE %...%`, o CPF é
**reconstruível dígito a dígito** por refinamento sucessivo. O dado protegido na saída é recuperável
pela entrada.

`BRIEF_RH_2026-08-06.md` BR-RH-020 está marcada **"✅ REMEDIADO em 2026-08-06"** — divergente neste
caminho. `employees-use-cases.test.ts` cobre a máscara da resposta (`:103,117,178`) e **não** cobre o
filtro.

### `T33-A-F04` — BR-RH-024 não implementada em `DELETE /api/employees/:id`

**HIGH · CONFIRMED · D3**

Documentado: BR-RH-024 — *"Desligamento desativa imediatamente o usuário do sistema vinculado
(`employees.user_id`)"*. Implementado: `DeactivateEmployeeUseCase.ts:73` grava **apenas**
`{ status:'inactive', dismissal_date: new Date() }`. Nenhuma escrita em `users`. O único ponto que
desativa o usuário é `UserAccountServiceAdapter.ts:13`, acionado pelo fluxo formal de rescisão.

O gate de `:63-71` só bloqueia o DELETE quando **existe** `HrTerminationProcess` aberto. Quando não
existe — cenário preservado como "comportamento anterior" (`:12-14`) — o desligamento conclui e **o
login do desligado permanece ativo**.

### `T33-A-F05` — Importação em massa registrada em audit log **sem `oldValues`**

**HIGH · CONFIRMED · D6**

`catalogImportController.ts:70-80` registra `action:'import'` com
`newValues: { resumo, arquivos }` — **contadores** e nomes de arquivo. Nenhum `oldValues`, nenhuma
lista de códigos tocados. A operação **atualiza** produtos e itens preexistentes
(`ImportCatalogSpreadsheetUseCase.ts:173,179`), podendo alterar `price`, `cost_price`, `ncm`, `cest`,
`unit`, `min_quantity`, `lead_time` e **`product_type`**. Depois do commit é **impossível
reconstruir** o que cada registro valia antes.

Agravantes: `logAction` só é chamado quando `relatorio.gravado === true` — planilha recusada (422)
não deixa rastro; a simulação (E19) não deixa rastro nenhum, embora leia o catálogo inteiro.

### Demais findings (MEDIUM/LOW)

| ID | Achado | Sev. | Âncora |
|---|---|---|---|
| `T33-A-F06` | `clients`, `employees`, `nonConformities` sem **nenhum** audit log de escrita (9 endpoints) | MEDIUM | ausência em `clientController`/`employeeController`/`nonConformityController`; `app.ts` sem middleware global |
| `T33-A-F07` | `DELETE` repetido reescreve dado de encerramento (idempotência destrutiva) | MEDIUM | `CloseNonConformityUseCase.ts:46-49`; `DeactivateEmployeeUseCase.ts:73` |
| `T33-A-F08` | RNC fecha sem máquina de estados; nenhuma transição validada | MEDIUM | `NonConformity.ts:77`; `UpdateNonConformityUseCase.ts:34` |
| `T33-A-F09` | `nonConformities` sem **nenhuma** validação de entrada | MEDIUM | `nonConformityController.ts:44,55`; único guard em `CreateNonConformityUseCase.ts:130` |
| `T33-A-F10` | Numeração por `Date.now()` sob UNIQUE → 500 em colisão | MEDIUM | `CreateNonConformityUseCase.ts:160`; `CreateQualityInspectionUseCase.ts:147` |
| `T33-A-F11` | Inspeção reprovada não é atômica com o bloqueio do lote: **material fica não contido** | MEDIUM | `CreateQualityInspectionUseCase.ts:176-196` |
| `T33-A-F12` | `POST /quality/inspections` sem idempotência: reenvio duplica RNC e **zera `quality_score`** do fornecedor | MEDIUM | fórmula em `CreateNonConformityUseCase.ts:274-286`; grava em `SequelizeNonConformitiesRepository.ts:75-80` |
| `T33-A-F13` | `PUT /clients/:id` aceita `cpf_cnpj`, responde 200 e **não grava** | MEDIUM | `clientValidators.ts:31` × `UpdateClientUseCase.ts:18-21,45-47` |
| `T33-A-F14` | `address` aceito, validado e nunca persistido | MEDIUM | `clientValidators.ts:11` × `Client.ts:39-69` (sem coluna) |
| `T33-A-F15` | Cliente inativado sem caminho de reativação pela API | MEDIUM | `UpdateClientUseCase.ts:19` × `clientValidators.ts:6-31` (`.strict()` sem `status`) |
| `T33-A-F16` | Importação troca `product_type` de produto com BOM ativa, só com aviso | MEDIUM | `validarPlanilhaCadastro.ts:372-378` × `bomService.ts:203-206` |
| `T33-A-F17` | `DELETE /clients/:id`: check-then-act sem transação nem lock | LOW | `DeactivateClientUseCase.ts:31-36` |
| `T33-A-F18` | `sanitizeSearch` aplicado duas vezes (escape duplo quebra busca por `%`) | LOW | `ListClientsUseCase.ts:41` + `SequelizeClientsRepository.ts:18`; `validators.ts:163-166` |
| `T33-A-F19` | Paginação sem teto em `clients`, `employees`, `nonConformities` | LOW | `clientController.ts:21-25`; `ListEmployeesUseCase.ts:55-57`; `ListNonConformitiesUseCase.ts:46-49` |
| `T33-A-F20` | `GET /non-conformities/:id` devolve `User` e `Supplier` inteiros | LOW | `SequelizeNonConformitiesRepository.ts:33-42` (sem `attributes`) × `:22-26` (com) |
| `T33-A-F21` | Importação sem limite de linhas: transação longa + N+1 | LOW | `spreadsheetUpload.ts:19,23`; `validarPlanilhaCadastro.ts:750` |
| `T33-A-F22` | Comentário normativo obsoleto em `SequelizeQualityRepository` | LOW | `:4-11` × `models/index.ts:48,663-681,1530` |
| `T33-A-F23` | `employees` mantém `authorize('admin')` legado, fora do retrofit `authorizeModule` | MEDIUM | `employees.ts:21-23` × `clients.ts:4-8`, `nonConformities.ts:10-14`, `qualityInspections.ts:11-18` |
| `T33-A-F24` | `employees` sem validação de entrada em criação e atualização | LOW | `employeeController.ts:76,87`; `CreateEmployeeUseCase.ts:79-84` |

**Nota sobre `F23`:** `hasFullEmployeeAccess` (`employeeSensitiveFields.ts:66-70`) concede **leitura**
do dado sensível a quem tem o módulo `rh`; a **escrita** continua restrita a `role==='admin'`. Um
gestor de RH legítimo lê salário e CPF e não consegue manter o cadastro — precisa de `admin` global.
**Exceção não documentada.**

## 3. Conformidades (mesmo peso)

| ID | Conformidade | Evidência |
|---|---|---|
| C01 | Importação valida **tudo** antes de qualquer escrita; um erro recusa a planilha inteira sem abrir transação | `ImportCatalogSpreadsheetUseCase.ts:105-136`; teste caso 5 |
| C02 | Escrita da importação exige `produtos` **e** `bom`, ambos `operate` | `catalogImport.ts:31-47`; teste caso 6 |
| C03 | Reimportação idempotente por código; estrutura idêntica vira `sem_alteracao` | `validarPlanilhaCadastro.ts:383,733-747` |
| C04 | Detecção de ciclo de BOM considera banco + planilha, desconsiderando arestas substituídas | `:456-509,675-688` |
| C05 | Passo 2 da importação é atômico entre si, com rollback | `ImportCatalogSpreadsheetUseCase.ts:167-186` |
| C06 | Sem mass assignment na importação: allowlists tipadas montadas coluna a coluna | `validarPlanilhaCadastro.ts:387-413` |
| C07 | Gate de liberação de lote em **função pura única**, consumida pelo POST e pelo GET | `quality/domain/constants.ts:127-155`; `GetLotReleaseEligibilityUseCase.ts:54` |
| C08 | Regra "inspeção posterior ao bloqueio" fecha a sequência; empate de instante fica do lado seguro | `constants.ts:167-181` |
| C09 | Identidade **sempre** do JWT, nunca do body | `qualityInspectionController.ts:27`; `nonConformityController.ts:44,55,69`; `catalogImportController.ts:63` |
| C10 | Encerramento de RNC centralizado num único ponto para PUT e DELETE | `nonConformities/domain/closure.ts:57-62` |
| C11 | RNC que não bloqueou lote nenhum grava aviso explícito em vez de falhar em silêncio (G10) | `CreateNonConformityUseCase.ts:226-259` |
| C12 | `clients` com Zod `.strict()` e allowlist — sem mass assignment | `clientValidators.ts:29,31` |
| C13 | `quality` limita paginação (1..100) e **ignora** ENUM inválido em vez de 500 | `ListQualityInspectionsUseCase.ts:43-52` |
| C14 | `hire_date` deliberadamente fora do `ALLOWED_FIELDS`, coerente com RF-RH-010 | `UpdateEmployeeUseCase.ts:34-37` |
| C15 | `DELETE /employees/:id` bloqueado com `HrTerminationProcess` aberto (`rule:'RF-RH-022'`) | `DeactivateEmployeeUseCase.ts:63-71` |
| C16 | Segregação de campo sensível nos **dois** caminhos de leitura | `ListEmployeesUseCase.ts:64-66`; `GetEmployeeByIdUseCase.ts:46` — *ressalva: só na saída; ver F03* |
| C17 | Inspeção exige critério de aceitação (≥3 chars) e justificativa de concessão (≥10) | `CreateQualityInspectionUseCase.ts:51,54,119-134` |
| C18 | `quality` registra audit log da criação | `qualityInspectionController.ts:29-36` |
| C19 | Repasse `stage`→`origin` conferido literal a literal contra o ENUM | `CreateQualityInspectionUseCase.ts:185-192` × `NonConformity.ts:56` |
| C20 | `SupplierReturnHandler` usa `lock: LOCK.UPDATE` e recusa estorno sem quantidade positiva | `:87,129-134` |
| C21 | Upload: 5 MB, 2 arquivos, extensão filtrada, `memoryStorage`, parse sem desserialização | `spreadsheetUpload.ts:19-46`; `parseDelimitedFile.ts:106-159` |

## 4. Cobertura declarada por célula

**25 células cobertas · 23/23 endpoints do Bloco A.** Mapeamento célula→módulo **inferido** da ordem
literal de `AUDIT_PLAN_EMENDA_02.md:199-201` — a inferência está declarada como tal; se o control
plane tiver mapeamento nominal divergente, prevalece o dele.

C-63…C-65 `clients` D1/D2/D6 · C-66…C-68 `employees` · C-73…C-75 `nonConformities` · C-76…C-78
`spreadsheetImport` · C-84…C-86 `quality` — todos **E**.
C-93…C-95, C-96…C-98, C-103…C-105, C-106…C-108, C-114…C-116 (D3/D4/D5) — todos **E**.
C-123, C-124, C-127, C-128, C-130 (D9) — **E estático**.

**Ressalvas declaradas (Regra 21):**

1. **D5 é E sobre o schema declarado nos models e migrations**, não sobre o catálogo do Postgres
   (comandos de banco proibidos). Onde se lê "sem CHECK", leia-se "sem CHECK declarado no model".
2. **D9 é E estático.** Nenhuma requisição emitida. F03 e F12 são deriváveis do código com alta
   confiança, mas **prova dinâmica não foi produzida**.
3. **D1/D2 reconfirmados por leitura própria**, não herdados de T-16 — batem com T-16 §5 e
   **acrescentam** F03 e F23, invisíveis a uma varredura de duas colunas.
4. **Cobertura de teste por regra crítica:** existem suítes para os cinco módulos, e **nenhuma
   cobre** F01, F02, F03, F04, F05, F11 nem F12.

## 5. Encaminhamento

- **HIGH → `vericore-finding-validator`** (Regra 22): F01, F02, F03, F04, F05.
- **`vericore-traceability-auditor`:** F01, F02, F04, F12, F23.
- **Lacuna de fonte autoritativa → director (Regra 21):** regra preço×custo (F01) e fórmula de
  rating de fornecedor (F12) não têm artefato versionado que as fixe.
- **Divergência de inventário:** 23 endpoints reais contra ~26 estimados no encargo.
