# T-48 — Validação adversarial de `T41-EST-F01` e `T41-RH-F02`

| Campo | Valor |
|---|---|
| Run | `ERP-LEGACY-001-AUD-001` |
| Trilha | `T-48` (validação; objeto: `T-41_C137_SEMANTICA_COLUNA_LOTE3.md` §5) |
| `AUDIT_COMMIT` | `c1311a6f76b512fef893f7e60d934179cae3409f` |
| Organização | VeriCore — `vericore-finding-validator` |
| Natureza | **Estática**. Nenhuma conexão a `erp_evok_audio` (`APR-2026-016` íntegra). Nenhum `SELECT`, nenhuma contagem de linha. |
| Método | READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT |
| Regra aplicável | Regra 22 (`CRITICAL`/`HIGH` passam por validação antes da remediação) |
| Artefato de origem | **não alterado** (Regra 15). Este documento não corrige `T-41`; registra veredito e divergências. |

> **Nota de processo.** Estes dois findings deveriam ter sido despachados para validação logo após `T-41`; o despacho não ocorreu (falha de orquestração detectada pelo consolidador na rodada 5). Registrado aqui apenas para que a lacuna de rastreabilidade fique nominal, não para atribuir responsabilidade — isso é do `vericore-software-audit-director`.

> **Nota de leitura (armadilha deste run).** O renderizador de `Grep` deformou literais em trilhas anteriores. Todo achado deste documento que depende da **forma exata** de um literal foi confirmado por `Read` do arquivo, com faixa de linhas citada. Onde só houve `grep`, está declarado como tal.

---

## 1. Veredito resumido

| Finding | Veredito | Severidade que a evidência sustenta | Confiança |
|---|---|---|---|
| `T41-EST-F01` | **CONFIRMED (parcial)** — mecanismo central confirmado; **um dos três elos (§5, item 3 de `T-41`) é FALSO** | **HIGH** (recomendação — mantida) | Mecanismo: **ALTA**. Materialização: **MÉDIA** (depende de `DYN-T41-01`/`-02`) |
| `T41-RH-F02` | **CONFIRMED** — todos os elos verificados; **um elo do texto está impreciso** (Admissão) e a amplitude real é **maior** que a descrita | **HIGH** (recomendação — mantida; CRITICAL só com `DYN-T41-03`) | **ALTA** |

Nenhum dos dois é `FALSE_POSITIVE`. Nenhum é `DUPLICATE`. Nenhum fica em `NEEDS_MORE_EVIDENCE` quanto ao mecanismo.

**Nenhum `FINDING CLOSED` é declarado aqui** — não é autoridade deste agente.

---

## 2. `T41-EST-F01` — veredito `CONFIRMED (parcial)`

**ID de validação:** `T48-VAL-T41-EST-F01`

### 2.1 Hipóteses de refutação — todas as cinco, com resultado

#### H1 — "Existe guarda em outra camada (controller, Zod, middleware, hook de model)?" → **REFUTAÇÃO FALHOU. Não existe guarda em nenhuma camada.**

Verificado camada a camada, por leitura de arquivo:

| Camada | Artefato | O que há | Guarda de saldo? |
|---|---|---|---|
| Rota | `server/src/modules/inventory/presentation/routes/inventory.ts:44` | `router.put('/warehouses/:id', authenticate, authorizeModule('estoque','approve'), inventoryController.updateWarehouse)` | **Não** — só autenticação e autorização |
| Validador | `server/src/modules/inventory/presentation/validators/inventoryValidators.ts:57-61` | `updateWarehouseSchema` = `{ name?, description?, active: z.boolean().optional() }.strict()` | **Não** — `active` é booleano livre, sem `.refine`, sem `superRefine` |
| Controller | `server/src/modules/inventory/presentation/controllers/inventoryController.ts:570-593` | parse do `:id`, parse do body, chamada do use case, `logAction` | **Não** — só auditoria pós-fato |
| Use case | `server/src/modules/inventory/application/use-cases/UpdateWarehouseUseCase.ts:38-58` | único `throw` é `NotFoundError` (`:41`); `:53` grava `active` | **Não** |
| Model | `server/src/models/Warehouse.ts:42-72` | `sequelize.define` sem bloco `hooks`; `active` em `:63-67` sem `validate`, sem `comment` | **Não** — não há `beforeUpdate`/`beforeSave` |
| Banco | `server/database/postgresql/00_baseline_frozen.sql:14975-14983` (definição integral da tabela), `:18527-18539` (as **duas** únicas constraints: `warehouses_code_key` e `warehouses_pkey`) | nenhum `CHECK`, nenhum trigger sobre `warehouses` em todo o baseline | **Não** |

O `logAction` (`inventoryController.ts:582-590`) registra `oldValues.active` → `newValues.active`. Isso é **rastreabilidade**, não controle compensatório: detecta depois, não impede.

**Conclusão H1:** a afirmação de `T-41` §5 item 2 está correta e é agora verificada em **seis** camadas, não em uma.

#### H2 — "O saldo fica mesmo preso? Existe outro caminho de saída?" → **REFUTAÇÃO PARCIALMENTE BEM-SUCEDIDA. Existem DOIS caminhos de saída que `T-41` não viu. O item 3 do finding, como escrito, é FALSO.**

`T-41` §5 item 3 afirma: *"o estoque parado no depósito desativado **não pode ser transferido para fora** — o único mecanismo de saída também exige o depósito ativo"*, e a conclusão combinada afirma *"sem gerar `inventory_movements` […] e **sem caminho de reversão pelo módulo de estoque**"*.

A premissa oculta é que **todo** consumo de saldo passa por `getWarehouseByCode`. **Não passa.** As primitivas de saldo recebem `warehouseId` **numérico** e **não filtram `active`**:

- `server/src/services/warehouseStockService.ts:111-130` — `addToWarehouse(productId, warehouseId, quantity, transaction)`: nenhuma leitura de `Warehouse.active`.
- `server/src/services/warehouseStockService.ts:147-185` — `removeFromWarehouse(...)`: idem; o único `throw` é `BusinessRuleError` por saldo insuficiente (`:161-173`).

O filtro `active: true` existe **apenas** em `getWarehouseByCode` (`:84-95`). Quem não passa por ele, opera livremente sobre depósito inativo. Dois caminhos concretos:

**Caminho A — contagem de inventário cíclico (débito completo, com movimento contábil).**
1. `CreateInventoryCountUseCase.ts:90-117` aceita `warehouse_id` e **não verifica existência nem `active`** do depósito. A única validação é de forma: `InventoryCountEntity.ts:83-85` exige que `warehouse_id` não seja nulo/`NaN`; `inventoryValidators.ts:79` exige inteiro positivo. Note o contraste **no mesmo use case**: `assigned_to` **é** verificado como usuário existente **e ativo** (`CreateInventoryCountUseCase.ts:95-107`, achado de auditoria de 2026-08-06). A disciplina de "referência precisa estar ativa" existe no arquivo e **não foi aplicada ao depósito**.
2. `ApproveInventoryCountUseCase.ts:89-96` usa `count.warehouse_id` direto: `InventoryService.adjust(..., count.warehouse_id)` **e** `removeFromWarehouse(item.product_id, count.warehouse_id, quantity, t)`. Sem checagem de `active`.

Consequência: uma contagem cíclica declarando `contado = 0` no depósito inativo **zera o saldo preso, gera `inventory_movements` de ajuste e corrige `products.quantity`**. Ou seja: **existe** caminho de saída, **existe** movimento, e ele é o caminho de reversão que `T-41` afirmou não existir.

**Ressalva que impede este caminho de virar controle compensatório:** `GET /api/inventory/warehouses` lista **somente ativos** (`ListWarehousesUseCase.ts:24-26` → `listActiveWarehouses`; `client/src/api/warehouses.ts:22`). Logo o depósito inativo **não aparece na UI** para ser selecionado numa contagem. O caminho A é alcançável **por API**, não pela tela. É saída **existente**, mas **não é** guarda: não impede a desativação, não preserva a invariante, e depende de o operador saber o `warehouse_id` numérico de um depósito que a interface esconde.

**Caminho B — transferência pendente aprovada depois da desativação.**
`CreateWarehouseTransferUseCase.ts:63-64` resolve origem e destino por `getWarehouseByCode` (exige ativo) **no momento da solicitação** e grava os **ids** (`:68-69`). `ApproveWarehouseTransferUseCase.ts:59-61` executa `removeFromWarehouse(transfer.product_id, transfer.from_warehouse_id, ...)` e `addToWarehouse(..., transfer.to_warehouse_id, ...)` a partir dos **ids gravados**, **sem revalidar `active`**. Como a transferência nasce `pending` e só se efetiva na aprovação do gestor (`BUSINESS_RULES.md` §12 item 8), há janela temporal real entre os dois eventos.

**Conclusão H2:** o item 3 de `T41-EST-F01` está **factualmente errado** e deve ser corrigido pelo auditor de origem. Isso **reduz a gravidade da consequência** ("saldo preso para sempre" → "saldo fora da invariante, recuperável por um caminho não óbvio e não exposto na UI"), mas **não toca o defeito central**, que é a ausência de guarda na transição `true → false`.

#### H2-bis — achado colateral que **agrava**, não atenua (ver §4, `OBS-T48-01`)

O Caminho B é bidirecional. `addToWarehouse` também não checa `active`: uma transferência solicitada quando o **destino** estava ativo e aprovada depois de ele ser desativado **credita saldo num depósito inativo**. Isso viola `BUSINESS_RULES.md` §12 **item 4** (*"Se a soma antes ≠ soma depois de uma transferência, há um bug crítico de integridade"*, `docs/business/BUSINESS_RULES.md:360-364`) — a soma **sobre depósitos ativos** cai pelo valor transferido, com `products.quantity` inalterado. O mesmo dano da invariante ocorre **sem ninguém desativar depósito com saldo**: basta desativar um depósito **vazio** com uma transferência `pending` apontando para ele.

#### H3 — "A invariante existe mesmo como citada?" → **REFUTAÇÃO FALHOU. O texto confere — e há uma contradição interna na própria norma que agrava o quadro.**

Lido diretamente em `docs/business/BUSINESS_RULES.md:351-354`:

> **3. Invariante de soma (obrigatória, testável):**
> `saldo_total(produto) = Σ saldo(produto, depósito) para todo depósito ativo`

A citação de `Warehouse.ts:14-16` é fiel. `warehouseStockService.ts:9-11` repete a mesma invariante nos mesmos termos. **H3 não refuta.**

**Porém**, o item **2** da mesma seção (`:345-349`) diz o oposto: *"O 'saldo total' de um produto […] é sempre a **soma** dos saldos em **todos os depósitos**"* — **sem** o qualificador "ativos". `BUSINESS_RULES.md` §12 contém, portanto, **duas definições incompatíveis de saldo total, em itens consecutivos**. Registrado como `OBS-T48-02`; é matéria de requisito, e a fonte autoritativa tem de ser fixada **antes** da remediação, senão a SanaCore escolhe sozinha qual das duas implementar — o que a Regra 6 proíbe.

#### H4 — "`products.quantity` é mesmo a fonte do MRP?" → **REFUTAÇÃO FALHOU. Confirmado por consumidor real.**

`SequelizeItemRepository.listMrpInventoryPositions` (`server/src/modules/items/infrastructure/sequelize/SequelizeItemRepository.ts:58-103`) lê `Product` com `attributes: ['id','code','quantity','reserved_quantity','min_quantity','lead_time']` (`:73`) e usa `liveProduct?.quantity` como `physicalQuantity` (`:92`), descontando apenas retenção de quarentena (`:86-93`). **Nenhuma leitura de `product_warehouse_stock`.** A afirmação de `warehouseStockService.ts:4-6` é verdadeira: `products.quantity` é o hot path do MRP.

**Isto qualifica o dano com precisão maior que a de `T-41`:** desativar um depósito com saldo **não reduz** o número que o MRP enxerga, enquanto **remove** o material de todos os fluxos roteados por código (recebimento, consumo de OP, expedição, laboratório — `BUSINESS_RULES.md:377-386`, todos via `getWarehouseByCode`). Resultado: **o MRP planeja sobre material que o próprio ERP recusa a consumir**; o consumo de OP falha com `NotFoundError` no depósito, e o planejamento não repõe porque acha que o material existe. Consumidor real, dano operacional identificável.

#### H5 — "A operação é restrita a admin?" → **REFUTAÇÃO FALHOU (o que se pôde provar estaticamente).**

`authorizeModule('estoque','approve')` não é privativo de `admin`: o nível por módulo vem do perfil de acesso do usuário, resolvido do banco a cada request (`server/src/middlewares/auth.ts:43-51`, mapa `module → 'operate'|'approve'` a partir de `AccessProfile` + `AccessProfilePermission`; `admin` sequer passa pela checagem, `:49`). Ou seja, `approve` em `estoque` é **atribuível a qualquer perfil** — é exatamente o mesmo nível exigido para aprovar/rejeitar transferência (`inventory.ts:40-44`). Não é caminho excepcional.

**Limite declarado:** *quantos* perfis hoje têm `estoque=approve` é **fato de dado** (`access_profile_permissions`), e `APR-2026-016` proíbe consultá-lo. Não se afirma o número; afirma-se que **não há restrição estrutural a admin**, que é o que a hipótese perguntava. Resíduo `RES-T48-01`.

### 2.2 Classificação

**`CONFIRMED (parcial)`** — CONFIRMED quanto ao defeito (transição `active: true → false` sem guarda de saldo, em seis camadas, com invariante declarada e consumidor real); **refutado** quanto ao item 3 (inexistência de caminho de saída e de movimento).

Reprodutibilidade: demonstrável estaticamente por leitura de código, sem hipótese sobre dado. Passa o critério "reproduzível ou tecnicamente demonstrável".

**Severidade recomendada: HIGH** (mantida). Justificativa contra rebaixamento para MEDIUM, apesar da refutação parcial: a régua do próprio run (`T-41` §5 preâmbulo) exige caminho normal + consumidor real; ambos provados (H4, H5). A existência de um caminho de saída **não exposto na UI** e **não documentado como reversão** não converte o defeito em latente — o dano à invariante é imediato no `commit` do `PUT`.

Justificativa contra elevação a CRITICAL: não há perda irreversível nem bypass de controle de segurança, e a materialização é fato de dado ainda não medido (`DYN-T41-01`, `DYN-T41-02`, ambos bloqueados por `APR-2026-016`).

**Confiança:** mecanismo **ALTA**; materialização **MÉDIA**.

### 2.3 O que muda na remediação

1. **O critério de reteste de `T-41` §5 é insuficiente.** Ele exige guarda só em `UpdateWarehouseUseCase`. Uma remediação que faça apenas isso deixa **três** buracos abertos: `addToWarehouse`/`removeFromWarehouse` continuam aceitando depósito inativo, `ApproveWarehouseTransferUseCase` continua executando sobre ids obsoletos, e `CreateInventoryCountUseCase` continua criando contagem sobre depósito inexistente/inativo.
2. **Correção mínima coerente** (para a SanaCore instruir, não para este agente decidir): (a) guarda de saldo na transição `true → false`; (b) revalidação de `active` **no momento da efetivação** em `ApproveWarehouseTransferUseCase` (origem **e** destino); (c) decisão explícita e documentada sobre se `add/removeFromWarehouse` devem recusar depósito inativo — recusar fecha o Caminho A, que é hoje a única reversão existente, e portanto **exige** que se crie uma reversão explícita antes; (d) `comment` em `warehouses.active` na migration.
3. **Ordem obrigatória:** resolver `OBS-T48-02` (qual item de §12 é a norma) **antes** de (a)-(c). Sem isso não há critério para dizer o que a guarda deve proteger.
4. **Aviso de colisão** já registrado em `T-41` §11.4 (`T41-EST-F01` × `T35-DIN-F06`) permanece válido e é reforçado: adicionar filtro de `active` **não** é a correção; aqui o filtro sobra em um lugar e falta nos outros.

---

## 3. `T41-RH-F02` — veredito `CONFIRMED`

**ID de validação:** `T48-VAL-T41-RH-F02`

### 3.1 Hipóteses de refutação — todas as quatro, com resultado

#### H1 — "Existe sincronização (hook, trigger, use case que escreva nas duas, serviço de reconciliação)?" → **REFUTAÇÃO FALHOU. Não existe nenhuma. Verificado nos dois sentidos.**

- **SST → RH:** `CreateAsoUseCase.ts:72-95` abre transação, grava `sst_asos` (`:74-85`) e enfileira o evento eSocial `S-2220` (`:87-92`). **Não há qualquer escrita em `hr_employee_documents`.** Nenhum outro use case de `modules/sst/**` escreve nessa tabela (busca por `aptitude_result` em `server/src/**` retorna **cinco** ocorrências, todas em `models/`, `validators/rhEnums.ts`, `SequelizeEmployeeDocumentRepository.ts` e os dois use cases de `employeeDocument/` — nenhuma em `modules/sst/`).
- **RH → SST:** o único ponto onde RH toca SST é `SstAsoServiceAdapter.ts:16-24`, e o próprio arquivo declara o escopo (`:4-7`): *"Usado **apenas** por `RequestAsoUseCase` […] para exibir um status **informativo** no momento da solicitação — **nunca pelo gate real de conclusão** (que depende de `HrEmployeeDocument`, ver `hasValidAso`)"*. É leitura de exibição, não reconciliação.
- **Banco:** nenhum trigger e nenhuma FK entre as tabelas. `hr_employee_documents` tem exatamente **duas** FKs — `employee_id → employees` e `uploaded_by → users` (`00_baseline_frozen.sql:23796-23808`) — e uma única constraint de identidade (`:16943-16947`). Não há `sst_aso_id`.
- **Hook de model:** `HrEmployeeDocument.ts:15-35` e `SstAso.ts:39-63` não declaram bloco `hooks`.

**A cópia de RH é preenchida por digitação livre, independentemente da SST:** `CreateEmployeeDocumentUseCase.ts:46-65` recebe `fitness_result` do payload de `POST /api/rh/employee-documents`, valida **apenas** contra a lista local `FITNESS_RESULTS` (`:20`, `:53-55`) e grava em `aptitude_result` (`:62`). `origin` (`'rh'|'sst'`) é **declarado pelo chamador** (`:63`, default `'rh'`) e não é verificado contra nada. `UpdateEmployeeDocumentUseCase.ts:21` permite alterar o resultado depois.

#### H2 — "O gate lê mesmo só a cópia? Algum chamador consulta `sst_asos`?" → **REFUTAÇÃO FALHOU quanto ao gate; MAS o texto do finding está IMPRECISO quanto à Admissão.**

`asoGate.ts:20-28` (arquivo lido por inteiro, 31 linhas) chama exclusivamente `employeeDocumentRepository.findValidAso(...)`. A implementação — `SequelizeEmployeeDocumentRepository.ts:43-54` — consulta **apenas** `HrEmployeeDocument`, filtrando `aptitude_result IN ('apto','apto_com_restricao')` e validade. O cabeçalho do gate (`asoGate.ts:5-7`) declara o desenho: *"**Nunca chama o módulo SST em tempo real** — verifica apenas o snapshot já anexado em `HrEmployeeDocument` (RF-RH-028)"*.

Chamadores reais de `hasValidAso` (busca exaustiva em `server/src/**`): **dois**.
- `ConcludeTerminationProcessUseCase.ts:71-74` → `aso_demissional`.
- `ReturnFromAbsenceUseCase.ts:95-103` → `aso_retorno`, apenas quando `requiresReturnAso(...)` (afastamento > 30 dias, RF-RH-048).

**Correção ao finding:** `T-41` §5 afirma que o gate *"decide Admissão/Demissão e o retorno"*. **A Admissão não usa este gate.** `ConcludeAdmissionProcessUseCase.ts:111-127` usa `process.aso_result` — coluna de `hr_admission_processes` — e o próprio comentário (`:111-118`) explica o porquê (o `employee_id` ainda não existe). Isso **não** salva o finding: apenas transfere o problema para uma **terceira** cópia, também sem vínculo com `sst_asos` (ver `OBS-T48-03`).

#### H3 — "Os enums são mesmo distintos no banco? `T-43` §11 fala em quatro." → **REFUTAÇÃO FALHOU. Confirmado por leitura direta do baseline, não por grep.**

| Tipo | Linhas lidas | Terceiro valor |
|---|---|---|
| `public.enum_hr_employee_documents_aptitude_result` | `00_baseline_frozen.sql:765-769` | `'apto_com_restricao'` |
| `public.enum_sst_asos_resultado` | `00_baseline_frozen.sql:2300-2304` | `'apto_com_restricoes'` |

São tipos distintos, com o terceiro rótulo grafado diferente. `T-43` §11 está correto quanto à contagem: existem **quatro** tipos com o mesmo domínio semântico — os dois acima mais `enum_hr_admission_processes_aso_result` (`:669`) e `enum_hr_termination_processes_aso_result` (`:839`), ambos com `'apto_com_restricao'`. Portanto: **3 grafias de RH contra 1 grafia de SST**, exatamente como `T-43` §11 afirma.

Coerência na camada de aplicação, também por leitura: `SstAso.ts:44` e `CreateAsoUseCase.ts:28` usam `'apto_com_restricoes'`; `HrEmployeeDocument.ts:28`, `CreateEmployeeDocumentUseCase.ts:20`, `ConfirmTerminationAsoResultUseCase.ts:16`, `rhEnums.ts:43` (`asoResultEnum`) e `SequelizeEmployeeDocumentRepository.ts:49` usam `'apto_com_restricao'`. A divergência é consistente dentro de cada módulo e inconsistente entre eles — o pior arranjo possível, porque nenhum teste de módulo isolado a revela.

Agravante de contexto: `rhEnums.ts:1-14` existe **precisamente** porque este projeto já se queimou com literal de enum errado que *"passa pelo typecheck e por 1200+ testes"*. A fonte única foi criada **por módulo**, e é o limite exato onde a divergência sobrevive.

#### H4 — "A consequência é alcançável? Quem cria cada registro? É plausível que coexistam?" → **REFUTAÇÃO FALHOU. É alcançável, e por dois modos, não um.**

- Quem cria o `inapto` em SST: `POST` de ASO → `CreateAsoUseCase.ts:50-95`, com `resultado` do payload validado contra `RESULTADOS` (`:28`).
- Quem cria a cópia válida em RH: `POST /api/rh/employee-documents` → `CreateEmployeeDocumentUseCase.ts:46-65`, com `fitness_result` do payload e `valid_until` do payload. **Nenhum dos dois consulta o outro.** São módulos, telas e perfis distintos operando cada um no seu escopo — que é exatamente o teste de "caminho normal".
- **Modo 2, que `T-41` não viu e que dispensa a divergência:** `findValidAso` (`SequelizeEmployeeDocumentRepository.ts:50`) trata `valid_until: null` como **válido para sempre** (`[Op.or]: [{ valid_until: null }, { valid_until: { [Op.gte]: today } }]`), e `valid_until` é nullable (`HrEmployeeDocument.ts:27`; `00_baseline_frozen.sql:5914-5925`). Como o gate de retorno não amarra o documento ao afastamento específico, **um único `aso_retorno` sem data de validade satisfaz todo retorno futuro do mesmo funcionário, indefinidamente** — sem SST nenhuma. Ver `OBS-T48-04`.

**O que a refutação conseguiu, e é preciso dizer:** o dano do modo 1 exige um **fato de dado** (existir simultaneamente `sst_asos.resultado='inapto'` vigente e documento `aso_*` de RH válido). `DYN-T41-03` responderia isso, e está bloqueado por `APR-2026-016`. Logo a **materialização** permanece não medida — mas a **alcançabilidade** está provada por construção, o que é suficiente para `CONFIRMED` sob a régua deste run (o finding não afirma dano ocorrido; afirma ausência de vínculo e de igualdade de domínio, e as duas são fato estático).

### 3.2 Classificação

**`CONFIRMED`.** Os três elos declarados por `T-41` — duplicação sem reconciliação, domínios que não casam, consumidor real lendo a cópia — foram verificados individualmente por leitura de arquivo. A única correção necessária ao texto é a Admissão (H2), e ela **amplia** o problema.

A nuance registrada por `T-41` (o `COMMENT ON COLUMN` de `:5932` documenta a minimização de dado clínico como deliberada) foi verificada e **procede** — a remediação não pode destruir esse controle. Confirmado por leitura: `00_baseline_frozen.sql:5932`.

**Severidade recomendada: HIGH** (mantida). **Não** se recomenda CRITICAL agora: a elevação depende de `DYN-T41-03`, e nenhuma linha de banco foi (nem podia ser) consultada. Recomenda-se ao diretor que `DYN-T41-03` seja tratado como **pedido prioritário** — é o único item deste par de findings cuja resposta muda a classe de severidade, e envolve decisão de saúde ocupacional.

**Confiança: ALTA.**

### 3.3 O que muda na remediação

1. **O critério de reteste de `T-41` cobre duas tabelas; são quatro.** Uniformizar apenas `sst_asos` × `hr_employee_documents` deixa `hr_admission_processes.aso_result` e `hr_termination_processes.aso_result` com a grafia de RH e sem vínculo com a SST — e é `hr_admission_processes.aso_result` que **decide a admissão** (`ConcludeAdmissionProcessUseCase.ts:119`).
2. **A ordem importa e é contraintuitiva:** unificar a grafia dos enums **antes** de criar o vínculo (FK ou fonte única) produz o pior resultado intermediário — passa a parecer conciliável o que continua não sendo conciliado. Vínculo primeiro, domínio depois; ou os dois na mesma migration.
3. **`OBS-T48-04` (validade nula) deve entrar no mesmo lote de remediação**, porque toca a mesma função (`findValidAso`) e o mesmo gate. Corrigir o vínculo sem corrigir a validade deixa o gate de retorno igualmente permissivo.
4. **Preservar** a minimização de dado clínico do `:5932` — a remediação correta é vincular e igualar domínio, **não** copiar conteúdo clínico da SST para RH.

---

## 4. Achados colaterais — o que o autor não viu

Registrados como **observações**, não como findings novos: este agente **não cria findings** (valida os dos outros). Devolvidos ao auditor de origem (`vericore-database-auditor`, trilha `T-41`) e ao `vericore-software-audit-director` para decidir se viram finding próprio.

| ID | Observação | Evidência | Por que importa |
|---|---|---|---|
| `OBS-T48-01` | **Transferência aprovada não revalida `active` de origem nem de destino.** Uma transferência `pending` cujo **destino** foi desativado no intervalo credita saldo em depósito inativo — a soma sobre ativos cai sem contrapartida em `products.quantity`. Viola `BUSINESS_RULES.md` §12 **item 4** (`docs/business/BUSINESS_RULES.md:360-364`) sem que ninguém desative depósito **com** saldo. | `CreateWarehouseTransferUseCase.ts:63-69` (resolve por code na solicitação, grava ids) × `ApproveWarehouseTransferUseCase.ts:59-61` (executa por id, sem revalidar) | É a **mesma invariante** de `T41-EST-F01` quebrada por um segundo mecanismo. Se a remediação só tratar o `PUT`, este fica aberto. |
| `OBS-T48-02` | **`BUSINESS_RULES.md` §12 se contradiz.** Item 2 (`:345-349`) define saldo total como soma de **todos** os depósitos; item 3 (`:351-354`) define como soma dos depósitos **ativos**. Itens consecutivos, definições incompatíveis. | `docs/business/BUSINESS_RULES.md:345-354` | **Regra 20/Regra 6.** Sem fonte autoritativa fixada, a SanaCore escolheria a regra de negócio sozinha. Bloqueia a remediação de `T41-EST-F01`. Exige decisão humana. |
| `OBS-T48-03` | **A aptidão do ASO vive em QUATRO tabelas, não duas** — `sst_asos.resultado`, `hr_employee_documents.aptitude_result`, `hr_admission_processes.aso_result`, `hr_termination_processes.aso_result` — nenhuma com FK para `sst_asos`. Pior: `hr_termination_processes.aso_result` é **gravado** (`ConfirmTerminationAsoResultUseCase.ts:35`) e **não é lido pelo gate** da própria demissão, que usa `hasValidAso` sobre os documentos (`ConcludeTerminationProcessUseCase.ts:71`). Há uma cópia que ninguém consulta e uma que decide. | `00_baseline_frozen.sql:669-672`, `:765-769`, `:839-842`, `:2300-2304`; `ConcludeAdmissionProcessUseCase.ts:119`; `ConfirmTerminationAsoResultUseCase.ts:26-35` | Amplia `T41-RH-F02` de 2 para 4 tabelas e muda o desenho da correção. |
| `OBS-T48-04` | **`valid_until NULL` = validade infinita no gate de ASO**, e o gate não amarra o documento ao afastamento. Um `aso_retorno` sem validade satisfaz **todos** os retornos futuros do funcionário. Independe de qualquer divergência com a SST. | `SequelizeEmployeeDocumentRepository.ts:43-54` (`:50`); `HrEmployeeDocument.ts:27`; `ReturnFromAbsenceUseCase.ts:95-103` | Torna o gate de RF-RH-048 satisfazível uma única vez para sempre. Candidato a finding próprio. |
| `OBS-T48-05` | **`CreateAsoUseCase` grava o ASO FORA da transação** que criou. `:72` abre `t`; `:74-85` chama `createAso(...)` **sem** passar `t`; `:87-92` cria o evento eSocial **com** `t`. A implementação sequer aceita transação: `SequelizeAsoRepository.ts:70-72` — `createAso(data)` → `SstAso.create(data)` — embora a assinatura abstrata a preveja (`AsoRepository.ts:30`). Falha no `create` do evento → rollback do evento, ASO **permanece**: ASO sem `S-2220` enfileirado. | `CreateAsoUseCase.ts:72-99`; `SequelizeAsoRepository.ts:70-72`; `AsoRepository.ts:30` | Obrigação acessória (eSocial S-2220) perdida em silêncio. Fora do escopo de `C-137` (semântica de coluna), por isso não é finding desta trilha — mas é evidência forte e deve ser encaminhada. |

---

## 5. Resíduos desta validação

| ID | Resíduo |
|---|---|
| `RES-T48-01` | **Quantos perfis têm `estoque=approve`** é fato de dado em `access_profile_permissions`, não consultável sob `APR-2026-016`. H5 provou ausência de restrição estrutural a `admin`, não a distribuição real de perfis. |
| `RES-T48-02` | **Materialização de ambos os findings não medida.** `DYN-T41-01`, `-02` (`T41-EST-F01`) e `DYN-T41-03`, `-04` (`T41-RH-F02`) permanecem não executados. `DYN-T41-03` é o único que muda classe de severidade. |
| `RES-T48-03` | **Busca de consumidores considerada exaustiva apenas em `server/src/**`.** Scripts de manutenção, seeds e migrations de dados não foram varridos quanto a escrita direta em `product_warehouse_stock`/`hr_employee_documents`. Um script que reconcilie fora da aplicação não foi procurado. |
| `RES-T48-04` | **Camada cliente não auditada como controle.** Verificou-se que `GET /api/inventory/warehouses` lista só ativos (`ListWarehousesUseCase.ts:24-26`); não se auditou se a UI de edição de depósito adverte sobre saldo. Irrelevante para o veredito (UI não é controle de servidor), declarado por honestidade de escopo. |
| `RES-T48-05` | **Sequência do baseline não reconciliada com migrations** para `warehouses`/`hr_employee_documents`: usou-se o DDL congelado como verdade estrutural, sem reler cada migration de origem. Consistente com o método de `T-41`. |

---

## 6. Estado

- `T41-EST-F01` → **`CONFIRMED (parcial)`**, severidade recomendada **HIGH**, confiança mecanismo **ALTA** / materialização **MÉDIA**. Item 3 do finding **refutado** e devolvido ao auditor de origem para correção do texto (Regra 15 — **não corrigido aqui**).
- `T41-RH-F02` → **`CONFIRMED`**, severidade recomendada **HIGH**, confiança **ALTA**. Elo "Admissão" **impreciso** e devolvido; a imprecisão **amplia** o finding (`OBS-T48-03`).
- **Ambos podem seguir para remediação na SanaCore** (Regra 22 satisfeita), com a ressalva vinculante de que `T41-EST-F01` depende de `OBS-T48-02` (contradição em `BUSINESS_RULES.md` §12) ser decidida por humano **antes** — sob pena de a SanaCore ter de inventar a regra, o que a Regra 6 proíbe.
- **Severidade não foi alterada por este agente** — apenas **recomendada** (Regra 18).
- 5 observações colaterais registradas (`OBS-T48-01` a `-05`), nenhuma convertida em finding (não é autoridade deste agente).
- 5 resíduos abertos (`RES-T48-01` a `-05`).
- **Nenhum `FINDING CLOSED`. Nenhum `RETEST_PASSED`. Nenhum `AUDIT_PASSED`. Nenhum artefato existente alterado.**
- **Banco `erp_evok_audio`: não acessado.** `APR-2026-016` íntegra.

---

### Duas coisas que exigem ação do diretor

1. **`OBS-T48-02` bloqueia a remediação de `T41-EST-F01`.** `BUSINESS_RULES.md` §12 itens 2 e 3 definem "saldo total" de formas incompatíveis. Enquanto isso não for decidido por humano, não há como especificar o que a guarda de desativação deve proteger.
2. **`DYN-T41-03` continua sendo o pedido dinâmico de maior valor do lote** — e agora com a nota adicional de que `OBS-T48-04` torna o gate de retorno permissivo **mesmo sem** a divergência SST×RH. Se a decisão for autorizar consulta dinâmica escopada, os dois devem ser respondidos na mesma execução.
