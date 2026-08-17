# T-47 — Enumeração nominal das tabelas sem model Sequelize e passagem dos dois léxicos (`DYN-T43-10` + `DYN-T45-10`)

| Campo | Valor |
|---|---|
| Run | `ERP-LEGACY-001-AUD-001` |
| Trilha | `T-47` (continuação de `T-13` → `T-31` → `T-35` → `T-41` → `T-42` → `T-43` → `T-45`, célula `C-137`) |
| `AUDIT_COMMIT` | `c1311a6f76b512fef893f7e60d934179cae3409f` |
| Organização | VeriCore — `vericore-database-auditor` |
| Natureza | Auditoria **estática** sobre artefatos versionados |
| Mandato | `DYN-T45-10` + `DYN-T43-10` autorizados pelo dono como **um único trabalho**; critério de fronteira alterado por **`APR-2026-040`** |
| Banco acessado | **NENHUM** — `APR-2026-016` íntegra. Nenhuma conexão, nenhum `SELECT`, nenhuma contagem de linha. |
| Artefatos anteriores | `T-13`, `T-31`, `T-35`, `T-41`, `T-42`, `T-43`, `T-45`, `AUD-DB-09_RETIFICACAO_01` — **não alterados** (Regra 15) |

> **Nota de persistência.** Agente titular sem `Write` (idem `T-31:12-13`, `T-35:13`, `T-41:14`, `T-42:14`, `T-43:14`, `T-45:14`). Persistido pelo orquestrador **sem alteração**.

> **Nota de método desta trilha.** `Bash` está desabilitado nesta sessão. Toda a aritmética abaixo foi produzida por `Grep`/`Read` sobre os artefatos, e **cada contagem tem uma verificação independente declarada** (§1.4). Onde a contagem depende da forma exata de um literal, o literal foi lido no arquivo, não inferido de grep.

---

## 1. Tarefa 1 — a enumeração, e a aritmética que não fechou em 21

### 1.1 Construção dos conjuntos

**Conjunto A — todas as tabelas do schema no `AUDIT_COMMIT`.**

- **Baseline:** `server/database/postgresql/00_baseline_frozen.sql` contém **200** `CREATE TABLE public.*`. Verificado por duas contagens independentes: `^CREATE TABLE public\.` → 200; `CREATE TABLE` case-insensitive em qualquer posição → **também 200** (logo não há `CREATE TABLE IF NOT EXISTS`, tabela indentada, partição, nem variação de caixa que escape do primeiro padrão).
- **Migrations pós-freeze (`RES-T42-04`/`RES-T45-07`):** o `SequelizeMeta` congelado (`00_baseline_frozen_meta.sql:26-185`) termina em `20260810-000037-create-master-production-plan-g17.cjs`. Existem **9** migrations posteriores em `server/migrations/`: `-000038`, `-000039`, `-000040`, `-000041`, `-000043`, `-000044`, `-000045`, `-000046`, `-000047` (**não existe `-000042`**). Isso confirma numericamente o *"≥ 9 migrations atrasado"* de `RES-T42-04` — são **exatamente 9**.
- **`createTable` nessas 9 — 7 tabelas novas**, todas confirmadas por leitura (busca multilinha, porque três delas quebram a linha entre `createTable(` e o nome — foi assim que um grep de linha única as perdeu na primeira passagem, e registro o erro porque ele quase virou omissão):

| Migration | Linha | Tabela |
|---|---|---|
| `20260810-000039-sale-lot-shipments-quality-gate.cjs` | `:61` | `sale_lot_shipments` |
| `20260811-000043-create-directorates-hierarchy.cjs` | `:143-144` | `directorates` |
| `20260812-000045-create-hr-time-imports.cjs` | `:40`, `:80` | `hr_time_import_batches`, `hr_time_import_items` |
| `20260812-000046-create-directorate-governance.cjs` | `:52-53`, `:142-143`, `:196-197` | `strategic_plannings`, `meeting_minutes`, `business_risks` |

Nenhum `dropTable` e nenhum `CREATE TABLE` em SQL bruto nas 9 migrations pós-freeze (verificado: os `dropTable` existentes estão todos no `down`).

**|A| = 200 + 7 = 207.**

**Conjunto B — tabelas com model Sequelize.** `server/src/models/` tem **186 arquivos `.ts`**, dos quais **1 é `index.ts`** (único arquivo de nome minúsculo) e **185 são models**. `tableName:` ocorre **185 vezes em 185 arquivos distintos** — um por model, nenhum model sem `tableName`, nenhum arquivo com dois.

**|B| = 185.**

**B ⊆ A**, verificado nominalmente: 178 dos 185 `tableName` casam com `CREATE TABLE` do baseline, e os 7 restantes são exatamente as 7 tabelas pós-freeze da tabela acima. Não há model apontando para tabela inexistente.

**|A \ B| = 207 − 185 = 22.**

### 1.2 O número não fechou em 21. Fechou em **22** — e o motivo é aritmético, não interpretativo

`T35-META-F01` derivou 21 de *"186 models com `tableName` × 207 tabelas"* (`T-35:89`). **O 186 conta `index.ts`, que não é model.** É o mesmo off-by-one que `T41-META-F09` já havia detectado pelo outro lado da conta: a lista de `T-35:91-113` *"soma 133, não 134"*.

As duas observações são a mesma unidade, e agora se encaixam sem sobra:

| Grandeza | `T-35` | Correto | Fonte |
|---|---|---|---|
| Models com `tableName` | 186 | **185** | `Grep` `^\s*tableName:` → 185 ocorrências / 185 arquivos |
| Tabelas com model **não cobertas** em `T-35` | 134 | **133** | `T41-META-F09`; e 185 − 52 cobertas = 133 |
| Tabelas **sem model** | 21 | **22** | 207 − 185 |
| **Déficit total** | **155** | **155** | 207 − 52 — **inalterado** |

**O erro nunca esteve no total; esteve na partição.** A unidade que faltava em "com model" é exatamente a que sobra em "sem model". Isso é o que torna a correção verificável em vez de opinativa: as duas metades agora somam o mesmo 155 que `T-35` já publicava.

**Portanto: `RES-T35-02` fecha com o número 22, e `T35-META-F01` fica retificado de 21 para 22.** Não altero `T-35` nem `T-41` (Regra 15) — a leitura corrigida é esta.

### 1.3 A leitura alternativa, publicada para que o 22 não seja lido como escolha minha

Uma das 22 é **`SequelizeMeta`**, tabela de controle do próprio Sequelize (uma coluna, `name character varying(255) NOT NULL`, `:2999-3001`). Ela não é tabela de negócio e não deveria ter model — nunca terá.

- **Denominador 207 (herdado de `T-31`/`T-35`, e que eu reconstruí nesta trilha), incluindo `SequelizeMeta`: 22 tabelas sem model.** É a que uso, por consistência com todo o run.
- **Denominador 206 (só tabelas de negócio): 21 tabelas sem model.**

Ou seja: **o "21" de `T-35` pode ser reencontrado, mas por um caminho que `T-35` não percorreu** — excluindo `SequelizeMeta` do universo, e não contando `index.ts` como model. Publico as duas porque a escolha do denominador é do director, e porque seria desonesto deixar parecer que o "21" era simplesmente errado: ele era **certo por acaso, com dois erros que se cancelavam**.

**Efeito colateral verificado do meu lado:** eu **reconstruí o denominador 207** (200 + 7) em vez de herdá-lo. Isso resolve, para esta trilha, `RES-T45-08`/`RES-T43-07` na parte "denominador"; a parte `git diff c1311a6..HEAD` continua não reconfirmada.

### 1.4 Verificações independentes de cada número (para que a aritmética seja auditável sem refazê-la)

| Número | Verificação 1 | Verificação 2 |
|---|---|---|
| 200 tabelas no baseline | `^CREATE TABLE public\.` = 200 | `CREATE TABLE` (`-i`, qualquer posição) = 200 → nenhum caso escapa |
| 9 migrations pós-freeze | `SequelizeMeta` congelado termina em `-000037` | `Glob server/migrations/2026081*.cjs` → 19 arquivos, 10 até `-000037`, 9 depois |
| 7 tabelas novas pós-freeze | busca multilinha por `createTable`/`dropTable`/`renameTable` | as 7 constam de `B` (têm model), e nenhuma consta do baseline |
| 185 models | `tableName:` = 185 em 185 arquivos | 186 `.ts` − 1 `index.ts` = 185 |
| 22 = A \ B | 207 − 185 | 178 baseline-com-model + 22 baseline-sem-model = 200 ✔ |
| 128 = déficit de `C-137` | (185 − 79 cobertas) + 22 = 106 + 22 | `T-45` §9 já publicava 128 |

### 1.5 A lista nominal — **22 tabelas**

| # | Tabela | DDL (baseline) | Natureza | Superfície de aplicação |
|---|---|---|---|---|
| 1 | `SequelizeMeta` | `:2999-3001` | **Controle do ORM** | por definição, nenhuma |
| 2 | `auditoria_eventos` | `:3715-3725` | **Órfã PT declarada** (`COMMENT` `:3732`) | nenhuma; guardada por teste |
| 3 | `entradas_nf` | `:5018-5025` | **Órfã PT declarada** (`:5032`) | nenhuma; guardada por teste |
| 4 | `entradas_nf_items` | `:5046-5054` | **Órfã PT declarada** (`:5061`) | nenhuma; guardada por teste |
| 5 | `fornecedores` | `:5615-5624` | **Órfã PT declarada** (`:5631`) | nenhuma; guardada por teste |
| 6 | `hr_candidates` | `:5789-5799` | **Viva no schema, morta na aplicação** | **FK entrante de `hr_admission_processes` (`:23680`)**; zero código |
| 7 | `hr_job_vacancies` | `:6134-6144` | **Viva no schema, morta na aplicação** | **FK entrante (`:23744`)**; zero código |
| 8 | `hr_payroll_import_batches` | `:6171-6179` | **Viva no schema, morta na aplicação** | zero código; citada em 2 comentários |
| 9 | `hr_payroll_import_items` | `:6206-6218` | **Viva no schema, morta na aplicação** | **sanitizador dedicado sem call site** (§4.2) |
| 10 | `hr_performance_reviews` | `:6259-6269` | **Viva no schema, morta na aplicação** | zero código |
| 11 | `hr_time_sheet_summaries` | `:6353-6370` | **Viva no schema, morta na aplicação** | zero código; sucedida de fato por `hr_time_import_*` |
| 12 | `lotes` | `:9312-9321` | **Órfã PT declarada** (`:9328`) | nenhuma; guardada por teste |
| 13 | `migracao_bom_log` | `:10077-10086` | **Ferramenta de migração, VIVA por SQL bruto** | `02c_bom_to_item_estrutura.ts:119,153,246,273`; `02d_validation.sql:37,46` |
| 14 | `migracao_product_item_map` | `:10093-10102` | **Crosswalk de migração, VIVA por SQL bruto** | 12 arquivos de backfill (`02b`, `02c`, `04a`–`04i`) |
| 15 | `movimentos_estoque` | `:10109-10124` | **Órfã PT declarada** (`:10131`) | nenhuma; guardada por teste |
| 16 | `numeros_serie` | `:10300-10307` | **Órfã PT declarada** (`:10314`) | nenhuma; guardada por teste |
| 17 | `ordens_producao` | `:10321-10334` | **Órfã PT declarada** (`:10341`) | nenhuma; guardada por teste |
| 18 | `requisicao_compra_items` | `:11902-11910` | **Órfã PT declarada** (`:11917`) | nenhuma; guardada por teste |
| 19 | `requisicoes_compra` | `:11924-11935` | **Órfã PT declarada** (`:11942`) | nenhuma; guardada por teste |
| 20 | `sst_estornos_entrega_epi` | `:13285-13291` | **Viva no schema, morta na aplicação** | **já nomeada em `T-45` §6.2 e reportada como `T45-SST-F02`** |
| 21 | `usuarios` | `:14883-14892` | **Órfã PT declarada** (`:14899`) | nenhuma; guardada por teste |
| 22 | `webhooks_eventos` | `:15074-15083` | **Órfã PT declarada** (`:15090`) | nenhuma; guardada por teste |

**Fecha a previsão de `T-45`:** 1 já nomeada (`sst_estornos_entrega_epi`), **21 nomeadas aqui** — e não 20, pela aritmética de §1.2.

---

## 2. Tarefa 2 — os dois léxicos, aplicados coluna a coluna

### 2.1 Método e critérios — os já declarados, sem invenção

Li o `CREATE TABLE` **integral** das 22 tabelas (todas cabem em ≤ 18 colunas; nenhuma foi amostrada) e passei, sobre **cada nome de coluna**:

- **Léxico clínico (`DYN-T43-10`, ampliado pelo dono):** `cid`, `exame`, `laudo`, `atestado`, `aptid`, `lesao`, `medic`, `saude`, `aso`, `acidente`, `afast`.
- **Léxico biométrico (`DYN-T45-10`):** `biometri`, `foto`, `photo`, `facial`, `digital`, `assinat`, `signat`, `evidenc`.

Critérios de inclusão aplicados **sem alteração**:

- **Saúde — `T-43` §1.1:** entra a tabela com ao menos uma coluna que **revele ou torne derivável** informação sobre saúde, integridade física ou aptidão laboral de pessoa natural identificada; vínculo 1:1 com linha que a carrega **conta**; presença de pessoa em evento **não** conta.
- **Biometria — `T-45` §1.1:** entra a tabela com coluna que **armazene ou aponte para** característica física/comportamental usada para **identificar ou autenticar**; **fronteira A** (imagem de pessoa entra só com uso identificatório; imagem de objeto nunca entra); **fronteira B** (assinatura entra como discutível; **metadado do ato de assinar não entra**).
- **`APR-2026-040` — critério conservador do dono, aplicado literalmente:** *"na dúvida entre incluir e excluir, inclua e declare a dúvida"*, com a fundamentação de que o custo de proteger a mais é baixo e o erro deve cair pelo lado menos arriscado.

### 2.2 Resultado por tabela — **22/22**

| # | Tabela | Colunas (todas lidas) | Casa léxico clínico? | Casa léxico biométrico? | Critério aplicado / veredito |
|---|---|---|---|---|---|
| 1 | `SequelizeMeta` | `name` | **Não** | **Não** | Fora — tabela de controle do ORM |
| 2 | `auditoria_eventos` | `id`, `entidade`, `entidade_id`, `acao`, `usuario_id`, `antes`, `depois`, `correlation_id`, `criado_em` | **Não** | **Não** | Fora do núcleo. `antes`/`depois` `jsonb` = **contêiner genérico** → Tier 3 (§2.4) |
| 3 | `entradas_nf` | `id`, `fornecedor_id`, `numero_nf`, `chave_acesso`, `recebido_por`, `recebido_em` | **Não** | **Não** | Fora — documento fiscal |
| 4 | `entradas_nf_items` | `id`, `entrada_nf_id`, `item_id`, `lote_id`, `quantidade`, `custo_unitario` | **Não** | **Não** | Fora — quantitativo |
| 5 | `fornecedores` | `id`, `razao_social`, `cnpj`, `email`, `telefone`, `ativo`, `criado_em`, `atualizado_em` | **Não** | **Não** | Fora — PJ; `email`/`telefone` são dado pessoal comum, não categoria especial |
| 6 | `hr_candidates` | `id`, `job_vacancy_id`, `name`, `contact`, **`resume_file_path`**, `stage`, **`notes`**, `created_at`, `updated_at` | **Não** por nome | **Não** por nome | **ENTRA por precaução (`APR-2026-040`)** — ver §2.3. Fronteira A **não resolvida** |
| 7 | `hr_job_vacancies` | `id`, `job_position_id`, `department_id`, `status`, `opened_at`, `closed_at`, `created_by`, `created_at`, `updated_at` | **Não** | **Não** | Fora — vaga é cargo, não pessoa (mesma regra 3 de `T-41` §2.1) |
| 8 | `hr_payroll_import_batches` | `id`, `competencia`, `importado_em`, `importado_por`, `fonte`, `created_at`, `updated_at` | **Não** | **Não** | Fora — cabeçalho de lote |
| 9 | `hr_payroll_import_items` | `id`, `batch_id`, `employee_id`, `bruto`, `encargos`, `liquido`, `custo_total`, `department_id`, `cost_center_id`, `created_at`, `updated_at` | **Não** | **Não** | Fora da categoria especial. **É dado financeiro individual sensível** e já está declarado como tal em `COMMENT` (`:6225`, `:6232`) — categoria distinta, registrada em §4.2 |
| 10 | `hr_performance_reviews` | `id`, `employee_id`, `period`, `reviewer_id`, `score`, **`notes`**, `status`, `created_at`, `updated_at` | **Não** por nome | **Não** | Fora do núcleo; `notes` = **texto livre sobre pessoa** → Tier 3 |
| 11 | `hr_time_sheet_summaries` | `id`, `employee_id`, `competencia`, `horas_normais`, `he_50`, `he_100`, `adicional_noturno_horas`, `faltas_injustificadas`, `atrasos_min`, `saldo_banco_horas`, `data_limite_compensacao_banco`, `fonte`, `importado_em`, `importado_por`, `created_at`, `updated_at` | **Não** — `faltas_injustificadas` **não** casa `afast` e não classifica motivo | **Não** | Fora. Confirma, por outra via, o censo negativo de `T-45` §1.4 sobre jornada |
| 12 | `lotes` | `id`, `item_id`, `codigo_lote`, `quantidade`, `validade`, `origem`, `criado_em` | **Não** | **Não** | Fora — material |
| 13 | `migracao_bom_log` | `id`, `bill_of_material_id`, `bill_of_material_item_id`, `item_estrutura_id`, `status`, `mensagem_erro`, `processado_em`, `criado_em` | **Não** | **Não** | Fora — log técnico |
| 14 | `migracao_product_item_map` | `id`, `product_id`, `item_id`, `product_code`, `product_name`, `mapeado_em`, `status`, `observacoes` | **Não** | **Não** | Fora — crosswalk de produto |
| 15 | `movimentos_estoque` | `id`, `item_id`, `lote_id`, `tipo`, `quantidade`, `saldo_antes`, `saldo_depois`, `origem_tabela`, `origem_id`, `usuario_id`, `observacoes`, `criado_em` | **Não** | **Não** | Fora — estoque |
| 16 | `numeros_serie` | `id`, `item_id`, `lote_id`, `numero_serie`, `status`, `criado_em` | **Não** | **Não** | Fora — `numero_serie` é do item, não da pessoa |
| 17 | `ordens_producao` | `id`, `codigo`, `item_id`, `quantidade_planejada`, `quantidade_produzida`, `status`, `data_inicio`, `data_fim`, `criado_por`, `criado_em`, `atualizado_em` | **Não** | **Não** | Fora — produção |
| 18 | `requisicao_compra_items` | `id`, `requisicao_id`, `item_id`, `quantidade`, `data_necessidade`, `observacoes` | **Não** | **Não** | Fora — compras |
| 19 | `requisicoes_compra` | `id`, `codigo`, `solicitante_id`, `status`, `origem`, `observacoes`, `aprovado_por`, `aprovado_em`, `criado_em`, `atualizado_em` | **Não** | **Não** | Fora — compras |
| 20 | `sst_estornos_entrega_epi` | `id`, `entrega_epi_id`, **`motivo`**, `estornado_por`, `created_at` | **Não** por nome | **Não** por nome | **Já na categoria biometria por `T-45` §1.2 item 3** (canal de correção da linha que carrega a evidência). `motivo` = texto livre em contexto SST → Tier 3 |
| 21 | `usuarios` | `id`, `nome`, `email`, `senha_hash`, `papel`, `ativo`, `criado_em`, `atualizado_em` | **Não** | **Não** — `senha_hash` é **credencial**, não característica física | Fora. Confirma `T-45` §1.4: **nenhum fator biométrico de autenticação no schema** |
| 22 | `webhooks_eventos` | `id`, `provedor`, `evento`, `payload`, `status`, `resposta`, `criado_em`, `processado_em` | **Não** | **Não** | Fora do núcleo; `payload`/`resposta` `jsonb` = **contêiner genérico** → Tier 3 |

**Resultado do léxico, sem arredondamento: ZERO das 22 tabelas tem coluna cujo nome case com qualquer termo dos dois léxicos.**

Registro também os **quase-casamentos** que verifiquei e descartei por leitura, para que ninguém precise refazê-los: `data_necessidade` (não contém `cid`), `razao_social` (não contém `aso`), `numero_serie`/`saldo_banco_horas` (nada), `faltas_injustificadas` (não é `afast`, e não há coluna de motivo/CID em lugar nenhum das 22).

### 2.3 Aplicação do critério conservador de `APR-2026-040` — **1 tabela entra por precaução**

O dono decidiu que `employees.photo_url` **entra** mesmo sem uso identificatório provado, porque *"o custo de protegê-la como se fosse é baixo e evita erro pelo lado mais arriscado"*. Aplicando **esse mesmo critério**, e não um novo:

**`hr_candidates.resume_file_path` (`:5794`) — ENTRA, com a dúvida declarada.** É ponteiro para **artefato documental fornecido pela própria pessoa natural**. No uso brasileiro corrente, currículo de candidato traz **fotografia 3×4** e com frequência declaração de PCD/limitação — isto é, o mesmo par de categorias (imagem de pessoa + condição de saúde) que as duas categorias cobrem. Não consigo provar estaticamente o conteúdo do arquivo; é exatamente a situação de `employees.photo_url`, e o dono já fixou o lado para o qual errar.

**Consequências que eu declaro e não decido (Regra 6):**

- Se aceito, o censo da categoria **biometria** passa de 5 (`T-45` §1.2) para **6**, ou **7** contando `employees` por `APR-2026-040` — e a **6ª/7ª tabela não tem model**, portanto **não é contável** em `C-137` (§6).
- A tabela **não tem nenhuma superfície de aplicação** (§4.1): não há hoje caminho para gravar nem ler `resume_file_path`. O risco é **latente**, não corrente — e é por isso que a inclusão custa pouco, que é precisamente o argumento do dono.
- `hr_candidates` **não** consta de `SENSITIVE_EMPLOYEE_FIELDS` nem de `PAYROLL_IMPORT_ITEM_SENSITIVE_FIELDS` nem de `ABSENCE_SENSITIVE_FIELDS` — não está em **nenhum** dos mecanismos executáveis de classificação do projeto. → `RES-T47-01`.

### 2.4 Tier 3 — contêineres genéricos: nominados, **não incluídos**, e a razão é declarada

Seis colunas em cinco tabelas podem **conter** dado de categoria especial sem que o **nome** o revele. Incluí-las seria estender a categoria a *"qualquer coluna de texto livre ou `jsonb` do schema"*, o que dissolveria o critério em vez de aplicá-lo — e o próprio dono ancorou a decisão no **custo baixo** de proteger, que aqui não se sustenta porque não há o que proteger nominalmente.

| Coluna | Tabela | Por que é dúvida | Por que não entra |
|---|---|---|---|
| `antes`, `depois` (`jsonb`) | `auditoria_eventos` `:3721-3722` | snapshot arbitrário de qualquer entidade | tabela **órfã declarada**, sem gravador; e o equivalente vivo (`audit_logs`) é tratado em `T-03`/`AUD-ALOG-01` |
| `payload`, `resposta` (`jsonb`) | `webhooks_eventos` `:15078,:15080` | corpo de terceiro, conteúdo indeterminado | idem — órfã declarada, sem gravador |
| `notes` | `hr_candidates` `:5796`, `hr_performance_reviews` `:6265` | texto livre **sobre pessoa identificada**, em contexto RH | sem gravador; a tabela `hr_candidates` **já entra** por §2.3 |
| `motivo` | `sst_estornos_entrega_epi` `:13288` | texto livre em contexto SST | tabela **já está na categoria** por `T-45` §1.2 |

**Esta é a única condicionalidade do fechamento declarado em §3**, e ela é resolvível apenas por evidência dinâmica (§9, `DYN-T47-01`/`-02`) — que **não executei**.

---

## 3. Tarefa 3.3 — declaração de fechamento das duas categorias

**Declaro fechados os censos das duas categorias especiais sobre as 207 tabelas do schema**, nos termos exatos abaixo — e nem um termo além:

### 3.1 Categoria **dado de saúde** (`APR-2026-037` §4, art. 5º II)

- Censo de `T-43` §1.2: **11 tabelas**, todas com model.
- **As 22 sem model: nenhuma coluna casa o léxico clínico.** Nenhuma tabela nova entra.
- **`RES-T43-05` fecha.** A ressalva que impedia dizer *"a categoria está fechada em termos absolutos"* era exatamente esta enumeração; ela está feita, nominal, em §1.5.
- **Fechamento: a categoria dado de saúde tem 11 tabelas entre as 207** — não mais *"entre as tabelas nomeáveis"*.
- **Condicionalidade única:** os 6 contêineres de §2.4 não são decidíveis estaticamente. Se o dono exigir certeza sobre conteúdo, `DYN-T47-01` é o que a produz.

### 3.2 Categoria **dado biométrico** (`APR-2026-039` §3, art. 5º II)

- Censo de `T-45` §1.2: **5 tabelas**.
- **As 22 sem model: nenhuma coluna casa o léxico biométrico.** Nenhuma entra **pelo léxico**.
- **Uma entra pelo critério conservador de `APR-2026-040`:** `hr_candidates` (§2.3) — **6 tabelas**, ou **7** com `employees` pela decisão já tomada. **Eu não decido** (Regra 6): declaro a dúvida como o próprio critério manda.
- **`RES-T45-06` fecha na parte que era minha** (enumerar e passar o léxico). A parte que sobra — decidir sobre `hr_candidates` e sobre os contêineres — **não é do auditor**.
- **Fechamento: a categoria biometria tem 5 tabelas provadas por coluna + 1 por precaução declarada, entre as 207.**

### 3.3 O que ainda falta, nominalmente — e é curto

1. **Decisão do dono sobre `hr_candidates.resume_file_path`** (§2.3) — 6 ou 5 tabelas na categoria biometria. `RES-T47-01`.
2. **Decisão do dono sobre os 6 contêineres genéricos** (§2.4) — resolvível por `DYN-T47-01`/`-02`, não por leitura.
3. **`RES-T45-01` (`employees.photo_url`)** — resolvido por `APR-2026-040`: **entra**. Registro que isso torna a categoria biometria **≥ 6**, e que `employees` **é contável** (tem model), diferentemente de `hr_candidates`.

**Nada mais.** Não há terceira classe de tabela: as 207 são 185 com model (varridas por `T-35`/`T-41`/`T-42`/`T-43`/`T-45` no censo de coluna) + 22 sem model (varridas aqui, por DDL).

---

## 4. Tarefa 3.4 — Findings `PROPOSED`

Severidade e confiança **separadas**. Régua mantida em sete lotes: **HIGH exige que o defeito ocorra pelo caminho normal do sistema, com consumidor real, produzindo resultado errado.** Neste lote **nenhum** dos três passa desse teste, e o motivo está escrito em cada um. **Zero CRITICAL, zero HIGH → nada vai ao `vericore-finding-validator` nesta trilha** (Regra 22 não é acionada, e digo isso explicitamente para que o silêncio não seja lido como omissão).

**Não reemito `T45-SST-F02`** (`sst_estornos_entrega_epi`) — já está reportado. Recontá-lo aqui inflaria o run.

---

### `T47-RH-F01` — O módulo de recrutamento existe **inteiro no banco** (com FK, índices e enums) e **não existe na aplicação**: a API de admissão aceita `candidate_id`/`job_vacancy_id` que nenhum caminho do sistema é capaz de criar

**Severidade proposta: LOW · Confiança: ALTA quanto ao mecanismo (leitura direta de 5 artefatos); ALTA quanto à extensão**

`hr_job_vacancies` (`:6134-6144`) e `hr_candidates` (`:5789-5799`) foram criadas pela migration `20260808-000012-create-hr-job-vacancies-candidates.cjs:14,51` com integridade **completa**: PK (`:16986`, `:16922`), FK `hr_candidates.job_vacancy_id → hr_job_vacancies(id)` `ON DELETE RESTRICT` (`:23751-23752`), 3 FKs em `hr_job_vacancies` (`:23903`, `:23911`, `:23919`), 4 índices (`:19314`, `:19321`, `:19440`, `:19447`) e dois enums dedicados (`enum_hr_candidates_stage`, `enum_hr_job_vacancies_status`).

**Zero model, zero rota, zero use case, zero referência em `client/`.** Busca exaustiva por nome: os dois nomes ocorrem em **6 arquivos**, todos artefatos de banco (baseline + 5 migrations). Nenhuma ocorrência em `server/src` ou `client/`.

**O que torna isto verificável e não retórico** — a aplicação **pede** esses IDs:

```
admissionValidators.ts:24    candidate_id: z.coerce.number().int().positive().nullable().optional(),
admissionValidators.ts:25    job_vacancy_id: z.coerce.number().int().positive().nullable().optional(),
CreateAdmissionProcessUseCase.ts:57      candidate_id: input.candidate_id ?? null,
CreateAdmissionProcessUseCase.ts:58      job_vacancy_id: input.job_vacancy_id ?? null,
```

E o banco os cobra: `hr_admission_processes_candidate_id_fkey` (`:23680`) e `_job_vacancy_id_fkey` (`:23744`). Logo **qualquer** valor não-nulo enviado nesses campos é rejeitado pelo banco, porque não existe operação capaz de criar a linha referenciada.

**Por que LOW e não MEDIUM — o teste do consumidor, aplicado com honestidade.** Não há corrupção nem resposta enganosa: `errorHandler.ts:84-88` mapeia `Sequelize.ForeignKeyConstraintError` para **HTTP 400** com *"Registro referenciado não encontrado."* — mensagem correta, status correto. **É controle compensatório real e o registro aqui evita um falso positivo de severidade** (§5.2). O dano é de **capacidade não entregue** e de **superfície de API que promete o que não existe**, não de dado errado.

**Critério de reteste:** ou (a) models + CRUD de vaga/candidato, ou (b) remoção dos dois campos do validador e do use case **e** decisão registrada sobre o destino das duas tabelas. Qualquer das duas fecha; **manter as duas pontas como estão é o que não fecha.**

---

### `T47-RH-F02` — Um sanitizador de LGPD/segregação foi construído para uma tabela **sem model e sem leitor**, e nunca é chamado: `sanitizePayrollImportItem` tem **zero call sites** em produção

**Severidade proposta: LOW · Confiança: ALTA quanto ao mecanismo; ALTA quanto à extensão**

`hr_payroll_import_items` (`:6206-6218`) é a **única** tabela das 22 com classificação de sensibilidade declarada no banco — dois `COMMENT ON COLUMN` (`:6225`, `:6232`) citando `RF-RH-072`: *"dado financeiro individual de alta sensibilidade — exige modulo rh E nivel financeiro/admin"*. A aplicação implementou o controle correspondente:

```
rhSensitiveFields.ts:51   export const PAYROLL_IMPORT_ITEM_SENSITIVE_FIELDS: readonly string[] = ['bruto', 'liquido'];
rhSensitiveFields.ts:134  export function sanitizePayrollImportItem<T extends …>(
rhSensitiveFields.ts:138    return omitSensitiveFields(item, PAYROLL_IMPORT_ITEM_SENSITIVE_FIELDS, canViewPayrollIndividualValues(user));
```

**Busca exaustiva em `server/` (fora `node_modules`): `sanitizePayrollImportItem` ocorre em 3 linhas de `rhSensitiveFields.ts` (a própria definição) e em 4 linhas de `server/tests/unit/rh-sensitive-fields.test.ts`. Nenhum controller, nenhum use case, nenhuma rota.** O contraste é o que dá confiança ALTA: o irmão `sanitizeAbsence`, do **mesmo arquivo**, é chamado **5 vezes** em `absenceController.ts:55,65,84,101,116` — o padrão de fiação existe e funciona; é esta tabela que não tem quem a leia.

Somam-se, no mesmo cluster: `hr_payroll_import_batches` (`:6171-6179`) e `hr_time_sheet_summaries` (`:6353-6370`) — esta última com **UNIQUE `(employee_id, competencia)`** (`:22009`), a integridade mais forte de todas as 22, e **sem model**. E o sucessor de fato está declarado no código: `GetMonthlyAttendanceSummaryUseCase.ts:3-12` opera sobre `hr_time_import_items` e cita `hr_payroll_import_batches` como *"mesma decisão já tomada"* — **nenhum artefato registra a deprecação das antigas**.

**Por que LOW e não MEDIUM.** Nenhum dado vaza hoje: sem leitor, não há resposta HTTP que exponha `bruto`/`liquido`. É **controle órfão** e **classificação sem objeto alcançável** — risco que se materializa **no dia** em que alguém adicionar um leitor sem lembrar de fiar o sanitizador, que é exatamente o modo de falha que a existência do sanitizador pretendia evitar. Não inflo: é preparo para dano, não dano.

**Nota de escopo consolidada:** este é **dado financeiro individual**, categoria distinta de saúde e de biometria. Não o conto em nenhuma das duas.

**Critério de reteste:** decisão registrada — (a) fiar o sanitizador ao leitor quando ele existir, com teste de rota, ou (b) deprecar formalmente as três tabelas (`COMMENT ON TABLE` + entrada na guarda de §5.1) e remover o sanitizador órfão.

---

### `T47-META-F03` — Duas tabelas **vivas** de migração são escritas por SQL bruto, sem model, sem `COMMENT` e **fora da guarda** que protege suas 12 irmãs

**Severidade proposta: LOW · Confiança: ALTA quanto ao mecanismo; MÉDIA quanto ao impacto**

`migracao_product_item_map` (`:10093-10102`) e `migracao_bom_log` (`:10077-10086`) são as **únicas** das 22 que **têm uso corrente em `server/src`** — e todo ele em SQL bruto:

- `02b_product_to_item.ts:190,220` e `02c_bom_to_item_estrutura.ts:119,153,246,273` → `INSERT INTO …`
- `02c:88,142,200` e `04a`,`04b`,`04c`,`04e`,`04f`,`04g`,`04h`,`04i` (todos `:62`) → `SELECT item_id FROM migracao_product_item_map …`
- 10 arquivos `*_validation.sql` fazem `LEFT JOIN` sobre elas

Têm PK e 4 índices (`:20553`, `:20560`, `:20567`, `:20574`) — a integridade está lá. **O que não está:** model, `COMMENT ON TABLE`, e presença na lista de 12 órfãs de `no-orphan-pt-schema-tables.test.ts:40-53`. Elas são a **crosswalk `product → item`** de toda a unificação de schema: 12 scripts de backfill dependem dela para resolver identidade, e nenhum artefato versionado declara seu status (viva? descartável após a migração? retida por quanto tempo?).

**Por que LOW.** Nenhum defeito em execução: os scripts funcionam, os `JOIN` resolvem. O custo é de **governança** — uma tabela de que 12 scripts dependem, sem dono declarado, é candidata natural a ser removida por engano numa limpeza, e a guarda que existiria para impedir isso cobre as 12 irmãs e não estas duas. **Confiança MÉDIA quanto ao impacto** porque não li se algum script de produção corrente ainda executa esses backfills.

**Critério de reteste:** `COMMENT ON TABLE` declarando natureza e ciclo de vida das duas, **ou** inclusão em uma guarda versionada equivalente à de §5.1.

---

## 5. Tarefa 3.5 — Conformidades verificadas (3) e falsos positivos evitados (3)

### 5.1 CONFORMIDADE — a guarda das 12 órfãs é real, versionada e executável

`server/tests/unit/no-orphan-pt-schema-tables.test.ts` lista **exatamente 12** tabelas (`:40-53`) — e as 12 são, uma a uma, membros da minha lista de 22: `usuarios`, `fornecedores`, `lotes`, `numeros_serie`, `requisicoes_compra`, `requisicao_compra_items`, `entradas_nf`, `entradas_nf_items`, `ordens_producao`, `movimentos_estoque`, `webhooks_eventos`, `auditoria_eventos`. O teste falha se qualquer `.ts` de `server/src` passar a referenciá-las por **uso real** — `FROM|JOIN|INTO|UPDATE|TABLE`, `tableName:`, ou `bulkInsert|bulkDelete|describeTable|dropTable|createTable` (`:87-95`) — e **declara por escrito** que evita grep ingênuo por substring (`:26-29`), com um *sanity check* de não-sobreposição contra as 7 tabelas PT **vivas** (`:60-68`, `:118-121`).

**Isto é engenharia de controle acima da média do repositório**, e o registro é deliberado: **12 das 22 tabelas sem model não são um débito, são um débito já cercado.** Combinado com os `COMMENT ON TABLE` de deprecação no próprio banco (12 ocorrências, uma por tabela), há **duas camadas independentes** — uma no banco, uma no CI.

### 5.2 CONFORMIDADE — FK violation devolve 400, não 500

`errorHandler.ts:84-89` mapeia `Sequelize.ForeignKeyConstraintError` para **HTTP 400** com mensagem estável (`:25`). É o que rebaixa `T47-RH-F01` de MEDIUM para LOW.

### 5.3 CONFORMIDADE — integridade das tabelas sem model **não** é pior que a das com model

Contraprova que eu esperava perder e não perdi: as 22 não são "tabelas largadas sem constraint". Todas as 10 não-órfãs têm PK; `hr_candidates`, `hr_job_vacancies`, `hr_payroll_import_items`, `hr_performance_reviews`, `hr_time_sheet_summaries`, `sst_estornos_entrega_epi` têm FK com ação declarada; há **11 índices** sobre elas e **1 UNIQUE** (`:22009`); 4 têm `CHECK` (`ck_nf_items_quantidade` `:5053`, `ck_lotes_quantidade` `:9320`, `ck_movimentos_quantidade`/`ck_movimentos_saldo` `:10122-10123`, `ck_op_quantidades` `:10333`, `ck_req_items_quantidade` `:11909`). **A ausência é de model, não de integridade** — e essa distinção é exatamente o que `T35-META-F01` não podia afirmar sem a enumeração.

### 5.4 FALSO POSITIVO EVITADO — "schema-fantasma abandonado sem controle"

A leitura fácil das 12 órfãs seria um finding MEDIUM de dívida técnica exposta. **Procurei o controle compensatório antes de reportar** e o encontrei em duas camadas (§5.1). **Não emito finding.** Se eu tivesse reportado, teria sido derrubado pelo validator com o teste na mão.

### 5.5 FALSO POSITIVO EVITADO — "`migracao_*` são órfãs como as outras 12"

Elas **parecem** órfãs (nome PT, sem model, sem `COMMENT`) e eu as tratei assim na primeira passagem. A busca de consumidor mostrou o contrário: **12 arquivos de backfill dependem delas**. O finding correto (`T47-META-F03`) é **o oposto** do que a aparência sugeria — não são mortas, são vivas sem governança. Segunda vez neste run que a busca de consumidor inverte o sinal de um achado (cf. `T-43` §4.1, `T-45` §4.2).

### 5.6 FALSO POSITIVO EVITADO — "`hr_time_sheet_summaries` guarda jornada com biometria de ponto"

Era a candidata a priori mais forte das 22 para o léxico biométrico (tabela de ponto). **As 16 colunas foram lidas: nenhum NSR, nenhum tipo de marcação, nenhum identificador de coletor.** É agregado mensal. Isso **confirma por segunda via independente** o censo negativo de `T-45` §1.4 sobre catraca/REP — que lá foi provado pelo layout do AEJ (`aejParser.ts:19-26,45-56`) e aqui pelo DDL de uma tabela que `T-45` não podia ler.

---

## 6. Tarefa 3.6 — Estado de `C-137`: estas 22 tabelas **NÃO são contáveis**, e o número não sobe

**Digo isto explicitamente, como pedido, e sem margem para leitura conveniente:**

A regra de contagem de `C-137`, mantida sem afrouxamento em seis lotes (`T-35`, `T-41` §6.1, `T-42` §3, `T-43` §2, `T-45` §2/§2.1), exige **model lido coluna a coluna E pelo menos uma verificação externa**. **As 22 tabelas desta trilha não têm model. Logo nenhuma delas é contável. O delta de `T-47` em `C-137` é `+0`.**

- **`C-137` permanece `A(79/207)`.** Déficit **128/207**. **NÃO FECHADA.**
- **A partição do déficit agora fecha nominalmente**, o que antes não fechava: **128 = 106 + 22**, onde 106 = 185 models − 79 cobertas, e 22 = tabelas sem model (§1.5, todas nomeadas). Sob o denominador alternativo de 206: `A(79/206)`, déficit 127 = 106 + 21.
- **Já apliquei essa mesma regra contra mim em `T-45` §2.1**, quando deixei `sst_estornos_entrega_epi` fora da contagem no lote em que contá-la mais renderia. Mantenho aqui, com 22 tabelas em vez de 1 — que é onde a régua seria mais tentadora de afrouxar. **Se eu contasse as 22, `C-137` saltaria para `A(101/207)` sem que uma linha de semântica de coluna de aplicação tivesse sido verificada.** Isso seria inflação, e digo o número justamente para que se veja o tamanho da tentação recusada.
- **O que esta trilha entrega a `C-137` não é cobertura, é fechamento de escopo:** a partir daqui, o déficit de 128 é **integralmente nominal** — 106 tabelas nomeadas em `T-35`/`T-41` + 22 nomeadas aqui. Não há mais nenhuma tabela do schema sem nome numa lista de auditoria.

---

## 7. Tarefa 3.7 — órfãs, legado e junção pura (informação para o relatório final)

| Classe | Quantas | Quais | O que o director precisa saber |
|---|---|---|---|
| **Órfãs declaradas — schema-fantasma PT** | **12** | `usuarios`, `fornecedores`, `lotes`, `numeros_serie`, `requisicoes_compra`, `requisicao_compra_items`, `entradas_nf`, `entradas_nf_items`, `ordens_producao`, `movimentos_estoque`, `webhooks_eventos`, `auditoria_eventos` | Criadas pelo `01_schema.sql` baseline, nunca adotadas. `COMMENT ON TABLE` de deprecação no banco + guarda de CI (§5.1). **Dívida cercada**, não solta. Cada uma tem equivalente vivo em inglês, nomeado no próprio `COMMENT`. |
| **Legado vivo sem governança — ferramentas de migração** | **2** | `migracao_product_item_map`, `migracao_bom_log` | **Em uso corrente** por 12 scripts de backfill via SQL bruto. Sem `COMMENT`, sem model, **fora da guarda**. → `T47-META-F03`. |
| **Capacidade construída no banco e não entregue na aplicação** | **6** | `hr_job_vacancies`, `hr_candidates`, `hr_performance_reviews`, `hr_time_sheet_summaries`, `hr_payroll_import_batches`, `hr_payroll_import_items` | Todas de RH, todas de `20260808-000012/-000023/-000024/-000025`. Integridade completa, superfície de aplicação **zero**. → `T47-RH-F01`, `T47-RH-F02`. **É o achado de maior valor gerencial desta trilha:** seis tabelas de RH pagas em migration, índice e FK, sem uma linha de aplicação. |
| **Canal de correção declarado e não construído** | **1** | `sst_estornos_entrega_epi` | Já reportado — `T45-SST-F02` (MEDIUM). Não reemitido. |
| **Controle do ORM** | **1** | `SequelizeMeta` | Nunca terá model. Fonte da divergência de denominador (§1.3). |
| **Junção pura (N:N sem atributo próprio)** | **0** | — | **Nenhuma das 22 é tabela de junção pura.** Todas têm atributos próprios além das FKs. Verificado coluna a coluna; registro o resultado negativo porque a hipótese era plausível e teria sido um argumento fácil para minimizar o conjunto. |

---

## 8. Divergências registradas (Regra 20)

**8.1 — Contra `T35-META-F01`, e a favor da precisão: são 22, não 21.** Corrigido em §1.2 pela aritmética completa. O total do déficit (155) **não muda**; muda a partição. Fonte autoritativa: contagem de `tableName` (185) e de `CREATE TABLE` (200 + 7). **Não altero `T-35`** (Regra 15).

**8.2 — A favor de `T-35`, contra a leitura fácil: o "21" era defensável sob outro denominador.** Excluindo `SequelizeMeta`, 21 é o número certo (§1.3). Publico isto porque reportar erro em uma direção só é viés, e porque o director precisa escolher o denominador conscientemente.

**8.3 — Contra minha própria primeira passagem, registrada porque quase virou omissão.** Meu primeiro `Grep` de `createTable` exigia nome e abertura de parêntese **na mesma linha**, e por isso **perdeu 4 das 7 tabelas pós-freeze** (`directorates`, `strategic_plannings`, `meeting_minutes`, `business_risks`), que quebram a linha. Se eu tivesse parado ali, teria publicado `|A| = 203` e **19** tabelas sem model. Corrigido por busca multilinha e confirmado por leitura direta das duas migrations. **A lição é a mesma de `T-43` §6.3 e `T-45` §4.2, terceira ocorrência no run: a forma do grep produziu o erro, não o código.**

**8.4 — Contra a premissa de `T-43` §1.4, já retificada por `T-45` §6.2 e agora executada.** *"21 sem model: não censáveis"* era falso; são censáveis por DDL, e o censo está feito. **Registro que o resultado do censo foi negativo** — o que significa que a ressalva, embora metodologicamente correta, **não escondia nenhuma tabela de categoria especial**. Digo isso porque é o resultado menos favorável à importância da minha própria trilha, e ele é o resultado.

**8.5 — `APR-2026-040` × `T-45` §1.3.** A decisão do dono resolve `RES-T45-01` (`employees.photo_url` **entra**) e, aplicada por analogia como ele mandou, **arrasta `hr_candidates` para dentro** (§2.3). O efeito é que a categoria biometria passa de 5 para **7** tabelas (5 + `employees` + `hr_candidates`), das quais **6 são contáveis** e 1 não. **Eu não altero `APR-2026-037`/`-039`/`-040` nem as listas de exclusão** (Regra 15 / ownership de `coretriad/`) — é ato do director.

**8.6 — Contradição não resolvida entre artefato e código, herdada e agora com segundo caso.** `T-45` §6.5 registrou a migration que afirma um fluxo de estorno inexistente. Aqui: `GetMonthlyAttendanceSummaryUseCase.ts:11` invoca `hr_payroll_import_batches` como precedente de decisão de design **de uma tabela que nenhum código lê**. Mesma classe. Fonte autoritativa: ausência de model, de leitor e de rota, verificada por busca exaustiva de nome. **Não altero os arquivos** (Regra 2).

---

## 9. Pedidos de evidência dinâmica — registrados, **NÃO executados**

Nenhum executado. Nenhuma conexão a `erp_evok_audio` aberta. `APR-2026-016` íntegra.

| ID | Pergunta que só evidência dinâmica responde | Motivo |
|---|---|---|
| `DYN-T47-01` | As colunas de texto livre `hr_candidates.notes`, `hr_performance_reviews.notes`, `sst_estornos_entrega_epi.motivo` contêm termo do léxico clínico? | **É a única condicionalidade que sobra** no fechamento da categoria saúde (§3.1). **Zero linhas também responde** — se as tabelas estiverem vazias, a condicionalidade morre. |
| `DYN-T47-02` | `auditoria_eventos.antes/depois` e `webhooks_eventos.payload/resposta` têm alguma linha? Alguma chave casa os dois léxicos? | Idem para categoria biometria. As duas tabelas são declaradas *"0 linhas"* pelos `COMMENT`, mas **essa afirmação é de 2026-08-06 e eu não posso verificá-la estaticamente**. |
| `DYN-T47-03` | `hr_candidates`, `hr_job_vacancies`, `hr_performance_reviews`, `hr_time_sheet_summaries`, `hr_payroll_import_batches/items` têm linhas? | Se **sim**, foram populadas **fora da aplicação** e `T47-RH-F01`/`-F02` sobem de severidade: há dado pessoal de RH gravado por caminho não auditado. Se **não**, confirmam capacidade nunca usada. |
| `DYN-T47-04` | `migracao_product_item_map` e `migracao_bom_log` têm linhas, e há `product_id` de produto vivo sem `item_id` mapeado? | Mede se `T47-META-F03` é risco corrente (crosswalk em uso) ou histórico. |
| `DYN-T47-05` | Existe `hr_admission_processes` com `candidate_id` ou `job_vacancy_id` não-nulo? | Se **sim**, alguém inseriu candidato/vaga por SQL direto — o que muda `T47-RH-F01` de "capacidade ausente" para "operação fora da aplicação". |

---

## 10. Resíduos

| ID | Resíduo |
|---|---|
| `RES-T47-01` | **`hr_candidates` entra na categoria biometria por precaução (`APR-2026-040`), com a dúvida declarada.** Exige decisão humana (Regra 6). Ela **não é contável** em `C-137` e **não está em nenhum** dos 3 mecanismos executáveis de classificação do projeto. |
| `RES-T47-02` | **6 contêineres genéricos (texto livre e `jsonb`) não são decidíveis estaticamente** (§2.4). Única condicionalidade do fechamento de §3. Resolvíveis por `DYN-T47-01`/`-02`. |
| `RES-T47-03` | **Deprecação de `hr_payroll_import_*` e `hr_time_sheet_summaries` não está registrada em artefato nenhum**, embora `hr_time_import_*` seja o sucessor de fato. Decisão do dono, não do auditor. |
| `RES-T47-04` | **Não li os consumidores dos 12 scripts de backfill** — a confiança do impacto de `T47-META-F03` é MÉDIA por isso. |
| `RES-T47-05` | **Nível de isolamento das transações continua não verificado** (mantém `RES-T45-05`/`RES-T43-02`/`RES-T42-03`). Nenhuma das 22 tem caminho transacional de aplicação, então não foi agravado. |
| `RES-T47-06` | **`00_baseline_frozen.sql` ≥ 9 migrations atrasado — agora quantificado em exatamente 9** (`RES-T45-07`/`RES-T42-04`). **Afetou esta trilha**: as 7 tabelas pós-freeze só existem nas migrations, e foi preciso reconstruí-las. Regenerar o baseline elimina esta classe de trabalho manual. |
| `RES-T47-07` | **Denominador 207 reconstruído** (200 + 7) — resolve a parte "denominador" de `RES-T45-08`/`RES-T43-07`. **`git diff c1311a6..HEAD` continua não reconfirmado.** |
| `RES-T47-08` | **Reconciliação `COMMENT ON COLUMN` × `comment:` não se aplica às 22** (não há `comment:` sem model). Os únicos 2 `COMMENT` de classificação do conjunto (`:6225`, `:6232`) apontam para tabela sem model — registrado em `T47-RH-F02`. Mantém `RES-T45-09`. |
| `RES-T47-09` | **A contradição G3 × EMENDA-01 permanece** (`RES-T45-10`). Este fechamento **reduz** a tensão — não há mais tabela do schema fora de alguma lista nominal —, mas as 8 tabelas de dado pessoal não-sensível da §5.2 seguem excluídas. **Ponto do director.** |

---

## 11. Estado

- **Célula `C-137`:** `A(79/207)` → **`A(79/207)`**, delta **`+0`**. **NÃO FECHADA.** Déficit **128/207**, agora **integralmente nominal**: 106 com model (`T-35`/`T-41`) + 22 sem model (§1.5). As 22 **não são contáveis** pela regra de cobertura, e o número **não foi inflado** (§6).
- **Enumeração: 22 tabelas sem model, nominais** (§1.5). **`RES-T35-02` FECHA**; `T35-META-F01` **retificado de 21 para 22** por aritmética verificável (§1.2), com a leitura alternativa de 21 sob denominador 206 publicada (§1.3). O déficit total de 155 **não muda** — o erro estava na partição.
- **`RES-T42-04` quantificado:** o baseline está **exatamente 9 migrations** atrasado; as **7** tabelas criadas depois estão nomeadas e todas têm model.
- **Léxico clínico sobre as 22: ZERO casamentos. Léxico biométrico sobre as 22: ZERO casamentos.**
- **Categoria DADO DE SAÚDE: FECHADA entre as 207 — 11 tabelas.** `RES-T43-05` fecha (§3.1).
- **Categoria DADO BIOMÉTRICO: FECHADA entre as 207 — 5 provadas por coluna, +1 por precaução (`hr_candidates`, `APR-2026-040`), +1 já decidida pelo dono (`employees`) = até 7.** `RES-T45-06` fecha na parte do auditor (§3.2). O que falta é **decisão**, não leitura (§3.3).
- **Findings `PROPOSED`: 3** — **0 CRITICAL, 0 HIGH, 0 MEDIUM, 3 LOW** (`T47-RH-F01`, `T47-RH-F02`, `T47-META-F03`). **Nenhum aciona a Regra 22**; o teste do consumidor real foi aplicado aos três e **nenhum passou**, com o motivo escrito em cada um. Régua mantida: 2 HIGH em `T-41`, 0 em `T-42`, 1 em `T-43`, 1 em `T-45`, **0 aqui**. `T45-SST-F02` **não foi reemitido**.
- **Conformidades verificadas: 3** (guarda de CI das 12 órfãs; FK→400; integridade das sem-model equivalente à das com-model) **e 3 falsos positivos evitados** (§5.4 schema-fantasma "solto" — havia controle em duas camadas; §5.5 `migracao_*` "órfãs" — são vivas, o finding é o oposto; §5.6 ponto biométrico — hipótese forte morta por leitura, confirmando `T-45` §1.4 por via independente).
- **Classificação de dado sensível nas 22:** **2 colunas classificadas em `COMMENT`** (`hr_payroll_import_items.bruto`/`.liquido`) — e ambas em tabela **sem model e sem leitor**, com sanitizador **sem call site**. **0 colunas de categoria especial** identificadas por léxico; 1 tabela incluída por precaução, **0 protegidas** por qualquer sanitizador.
- **Divergências registradas: 6**, **duas contra mim** (§8.1 a contagem que eu herdei e corrigi; §8.3 o grep de linha única que perdeu 4 tabelas e quase virou omissão) e **uma a favor do artefato auditado** (§8.2 o "21" era defensável sob outro denominador).
- **Resíduos: 9. Pedidos dinâmicos: 5, nenhum executado.**
- **Banco de produção: não acessado.** `APR-2026-016` íntegra. **Nada gravado fora de `audit/`.**
- `T-13`, `T-31`, `T-35`, `T-41`, `T-42`, `T-43`, `T-45` e `AUD-DB-09_RETIFICACAO_01` **não foram alterados** (Regra 15). Nenhuma severidade de finding anterior alterada.
- **Nenhuma declaração de `AUDIT_PASSED`, `RETEST_PASSED` ou `FINDING CLOSED`.**

---

**O que exige decisão antes de qualquer próximo passo:**

1. **Denominador: 207 ou 206.** Determina se a resposta oficial é *"22 tabelas sem model"* ou *"21"*. As duas estão provadas; a escolha é do director, e ela propaga para todo o relatório final.
2. **`hr_candidates` (`RES-T47-01`)** — aplicando o critério do dono em `APR-2026-040`, ela entra; a categoria biometria vai a 7 tabelas, uma delas não contável. **Não decido** (Regra 6).
3. **Os 6 contêineres genéricos (`RES-T47-02`)** — única condicionalidade que sobra no fechamento das duas categorias. `DYN-T47-01`/`-02` fecham; leitura estática não fecha.
4. **Seis tabelas de RH construídas no banco e ausentes da aplicação** (`T47-RH-F01`, `T47-RH-F02`) — decisão de produto, não de auditoria: construir ou deprecar. Manter as duas pontas como estão é o único desfecho que não fecha.
